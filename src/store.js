/* Data loading and progress. Progress is saved by the server beside the app
   folder; the browser keeps a copy so the app still works if the server cannot write.

   Progress document (version 3):
     user:     { name, active }                      who is practising and which profile is open
     profiles: { "<exam>--<stage>": { exam, examName, stage, created, mocks, glat } }
     answers, review, speed                         shared by every profile (topic practice, speed drills, mistakes)
   `mocks` (mock tests + booster days) and `glat` live inside each profile; the app reads and writes the
   open profile's copy through p.mocks / p.glat, so the rest of the code does not care. */
import { useEffect, useState } from "react";
import { examById, profileId } from "./exams.js";

const OWN = ["mocks", "glat"];
const EMPTY = () => ({ version: 3, user: null, profiles: {}, answers: {}, review: [], speed: {}, legacyMocks: {} });
let progress = EMPTY();
let ready = false;
const subs = new Set();
let saveTimer = null;

/* Older files have a flat `mocks`; keep them until the first profile exists, then hand them over. */
function normalize(p) {
  const n = { ...EMPTY(), ...p, version: 3 };
  if (n.mocks && Object.keys(n.mocks).length && !Object.keys(n.profiles || {}).length) n.legacyMocks = { ...n.legacyMocks, ...n.mocks };
  delete n.mocks; delete n.glat;
  n.profiles = n.profiles || {};
  for (const pr of Object.values(n.profiles)) { pr.mocks = pr.mocks || {}; pr.glat = pr.glat || {}; }
  if (n.user && !n.profiles[n.user.active]) n.user.active = Object.keys(n.profiles)[0] || null;
  return n;
}
/* What components see: the saved document plus the open profile's own progress as p.mocks / p.glat / p.profile. */
function view(p) {
  const pr = p.user && p.profiles[p.user.active];
  return { ...p, profile: pr || null, mocks: pr ? pr.mocks : {}, glat: pr ? pr.glat : {} };
}
let shown = view(progress);

try {
  const local = JSON.parse(localStorage.getItem("arena-dashboard-progress") || localStorage.getItem("arena-practise-progress") || "null");
  if (local) { progress = normalize({ ...progress, ...local }); shown = view(progress); }
} catch {}

export async function loadProgress() {
  try {
    const r = await fetch("/api/progress");
    if (r.ok) {
      const server = await r.json();
      /* a profile saved only in this browser (server could not write) is kept */
      progress = normalize({ ...progress, ...server, profiles: { ...progress.profiles, ...(server.profiles || {}) }, user: server.user || progress.user });
      shown = view(progress);
    }
  } catch {}
  ready = true; emit();
}
function emit() { for (const f of subs) f(shown); }
function save() {
  try { localStorage.setItem("arena-dashboard-progress", JSON.stringify(progress)); } catch {}
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fetch("/api/progress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(progress) }).catch(() => {});
  }, 400);
}
/* fn edits a copy that already carries the open profile's mocks / glat; they are written back afterwards. */
export function update(fn) {
  const copy = structuredClone(progress);
  const pr = copy.user && copy.profiles[copy.user.active];
  if (pr) for (const k of OWN) copy[k] = pr[k];
  const out = fn(copy) || copy;
  const pr2 = out.user && out.profiles[out.user.active];
  if (pr2) for (const k of OWN) if (out[k]) pr2[k] = out[k];
  for (const k of OWN) delete out[k];
  delete out.profile;
  progress = normalize(out); shown = view(progress);
  emit(); save();
}
export function useProgress() {
  const [p, set] = useState(shown);
  useEffect(() => { subs.add(set); set(shown); return () => subs.delete(set); }, []);
  return p;
}
export function useReady() {
  const [r, set] = useState(ready);
  useEffect(() => { if (ready) set(true); const f = () => ready && set(true); subs.add(f); return () => subs.delete(f); }, []);
  return r;
}

/* ---- profiles ---- */
export const hasProfile = (p) => !!(p.user && p.profile);
export function createProfile({ name, exam, stage, examDate }) {
  const e = examById(exam);
  const id = profileId(exam, stage || "");
  update((p) => {
    p.user = { name: (name || (p.user && p.user.name) || "").trim(), active: id };
    const first = !Object.keys(p.profiles).length;
    p.profiles[id] = p.profiles[id] || { exam, examName: e.name, stage: stage || "", created: Date.now(), examDate: examDate || "", mocks: first ? { ...p.legacyMocks } : {}, glat: {} };
    if (first) p.legacyMocks = {};
    if (examDate) p.profiles[id].examDate = examDate;
    p.mocks = p.profiles[id].mocks; p.glat = p.profiles[id].glat;
  });
  return id;
}
export const switchProfile = (id) => update((p) => { if (p.profiles[id]) p.user.active = id; });
export const setExamDate = (date) => update((p) => { const pr = p.user && p.profiles[p.user.active]; if (pr) pr.examDate = date || ""; });
export const setName = (name) => update((p) => { p.user = { ...(p.user || {}), name: name.trim() }; });

/* ref says where a question lives so My mistakes can load it again:
   {kind:"bank"|"speed", file} or {kind:"mock", group, mock}. */
export function recordAnswer(q, ok, secs, ref) {
  update((p) => {
    p.answers[q.id] = { ok, t: Math.round(secs || 0), at: Date.now(), f: ref && ref.file };
    p.review = p.review.filter((r) => r.id !== q.id);
    if (!ok) p.review.unshift({ id: q.id, topic: q.topic || q.section, at: Date.now(), ...ref });
  });
}
export const dropReview = (id) => update((p) => { p.review = p.review.filter((r) => r.id !== id); });
export const saveSpeed = (key, right, total, secs) =>
  update((p) => { p.speed[key] = { right, total, t: Math.round(secs), at: Date.now() }; });
export const saveMock = (id, result) => update((p) => { p.mocks[id] = result; });
export const saveGlat = (key, right, total, secs) =>
  update((p) => { p.glat[key] = { right, total, t: Math.round(secs), at: Date.now() }; });
/* Remembered places: last topic position + filters, saved mock runs, list filters. Theme and layout are kept. */
export function clearLocal(which = "all") {
  const KEEP = /^(arena-theme|ap-view)/;
  for (const st of [localStorage, sessionStorage]) {
    try {
      for (const k of Object.keys(st)) {
        if (k.startsWith("arena-course-")) { if (which === "all" || which === "practice") st.removeItem(k); continue; }   /* Course: last lessons and chosen section */
        if (KEEP.test(k) || !k.startsWith("ap-")) continue;
        const run = k.startsWith("ap-run-");
        if (which === "all" || (which === "mocks" && run) || (which === "practice" && !run)) st.removeItem(k);
      }
    } catch {}
  }
}
/* "Reset everything" clears the progress but keeps the name and the profile list. */
export const resetAll = () => { clearLocal("all"); return update((p) => {
  p.answers = {}; p.review = []; p.speed = {}; p.legacyMocks = {};
  for (const pr of Object.values(p.profiles)) { pr.mocks = {}; pr.glat = {}; }
  p.mocks = {}; p.glat = {};
}); };
export const resetPart = (part) => { clearLocal(part); return update((p) => {
  if (part === "mocks") { p.mocks = {}; p.glat = {}; }
  if (part === "speed") p.speed = {};
  if (part === "practice") { p.answers = {}; p.review = []; }
}); };

/* JSON files are split per topic / group; fetch each once. */
const cache = new Map();
export function getJSON(url) {
  if (!cache.has(url)) cache.set(url, fetch(url).then((r) => { if (!r.ok) throw new Error(url + ": " + r.status); return r.json(); }));
  return cache.get(url);
}
export const bankIndex = () => getJSON("/data/bank/index.json");
export const bankTopic = (id) => getJSON("/data/bank/" + id + ".json");
export const speedIndex = () => getJSON("/data/speed/index.json");
export const speedTopic = (id) => getJSON("/data/speed/" + id + ".json");
export const mockIndex = () => getJSON("/data/mocks/index.json");
export const glatData = () => getJSON("/data/booster/glat.json");
export const mockTest = (group, id) => getJSON("/api/test?group=" + encodeURIComponent(group) + "&id=" + encodeURIComponent(id));

export function useData(fn, deps) {
  const [d, set] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => { let live = true; set(null); fn().then((x) => live && set(x), (e) => live && setErr(String(e.message || e))); return () => { live = false; }; }, deps);
  return [d, err];
}

export function setTheme(t) { try { localStorage.setItem("arena-theme", t); } catch {} applyTheme(); }
export function getTheme() { try { return localStorage.getItem("arena-theme") || "auto"; } catch { return "auto"; } }
export function applyTheme() {
  const t = getTheme();
  if (t === "auto") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", t);
}

export const LEVELS = { easy: "Easy", easy_to_moderate: "Easy–Moderate", moderate: "Moderate", pattern: "Pattern" };
export const SOURCES = {
  arena_basics: "Arena · Beginner", arena_medium: "Arena · Medium", arena_glat: "Arena · GLAT",
  "Arena CCE Arithmetic Ability - I": "Arena CCE book",
};
export const srcName = (s) => SOURCES[s] || s;
export const go = (h) => { location.hash = h; };
export function shuffled(a, seed) {
  const r = [...a]; let s = seed || 1;
  for (let i = r.length - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; const j = Math.floor((s / 233280) * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
}

/* Where you are in each practice topic: filters, shuffle seed and question index. */
export function readPos() { try { return JSON.parse(localStorage.getItem("ap-pos") || "{}"); } catch { return {}; } }
export function writePos(topic, v) {
  try { const m = readPos(); m[topic] = v; localStorage.setItem("ap-pos", JSON.stringify(m)); } catch {}
}

/* a speed set you started but did not finish: where to pick it up again */
export function readSpos() { try { return JSON.parse(localStorage.getItem("ap-spos") || "{}"); } catch { return {}; } }
export function writeSpos(tid, v) { try { const m = readSpos(); m[tid] = v; localStorage.setItem("ap-spos", JSON.stringify(m)); } catch {} }
export function clearSpos(tid) { try { const m = readSpos(); delete m[tid]; localStorage.setItem("ap-spos", JSON.stringify(m)); } catch {} }

/* Course tab: the structure comes from data/course (ids and names only); a lesson's questions come from /api/course/q. */
export const courseIndex = () => getJSON("/data/course/index.json");
export const courseTopic = (subject, id) => getJSON("/data/course/" + subject + "/" + id + ".json");
export const courseQs = (ids) => getJSON("/api/course/q?ids=" + ids.join(","));


/* A setting that survives refreshes and other tabs/windows but resets when the app (server) restarts:
   it is saved with the server's boot id and dropped when that id has changed. */
let bootP;
const boot = () => (bootP ||= fetch("/api/boot").then((r) => r.json()).then((j) => j.boot).catch(() => null));
export function usePersisted(key, init) {
  const [v, setV] = useState(() => { try { const s = JSON.parse(localStorage.getItem(key)); return s && s.v !== undefined ? s.v : init; } catch { return init; } });
  useEffect(() => {
    boot().then((b) => { try { const s = JSON.parse(localStorage.getItem(key)); if (s && b && s.boot && s.boot !== b) { localStorage.removeItem(key); setV(init); } } catch {} });
  }, []);
  const set = (x) => { setV(x); boot().then((b) => { try { localStorage.setItem(key, JSON.stringify({ boot: b, v: x })); } catch {} }); };
  return [v, set];
}
