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
const EMPTY = () => ({ version: 3, user: null, profiles: {}, answers: {}, review: [], speed: {}, notes: {}, legacyMocks: {} });
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
/* Notes: key is a question id, or "set:<hash>" for a whole passage; each note is { id, type, text, at, qid? } */
export const NOTE_TYPES = [["note", "Note"], ["shortcut", "Shortcut"], ["trap", "Trap"], ["dont", "Don't"], ["recollect", "Recollect"]];
export const addNote = (key, n) => update((p) => { p.notes = p.notes || {}; (p.notes[key] = p.notes[key] || []).push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), at: Date.now(), ...n }); });
export const delNote = (key, id) => update((p) => { const l = ((p.notes || {})[key] || []).filter((x) => x.id !== id); if (l.length) p.notes[key] = l; else if (p.notes) delete p.notes[key]; });
export const dropReview = (id) => update((p) => { p.review = p.review.filter((r) => r.id !== id); });
export const saveSpeed = (key, right, total, secs) =>
  update((p) => { p.speed[key] = { right, total, t: Math.round(secs), at: Date.now() }; });
export const saveMock = (id, result) => update((p) => { p.mocks[id] = result; });
/* forget some mock results by run id - a day's Reset in the planner, so it can be taken fresh */
export const dropMocks = (ids) => update((p) => { for (const id of ids) delete p.mocks[id]; });
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
/* Practice topic order the user set by dragging: p.order[<profile id>][<card id>] = [topic ids]. One per profile.
   Nothing resets it (Reset all keeps it); `list` null goes back to the default order. */
export const setTopicOrder = (prof, card, list) => update((p) => {
  p.order = { ...(p.order || {}) }; p.order[prof] = { ...(p.order[prof] || {}) };
  if (list) p.order[prof][card] = list; else delete p.order[prof][card];
});
/* "Reset everything" clears the progress but keeps the name, the profile list and the topic order. */
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
/* A Practice topic without the heavy fields (text, options, explanation, passage, pictures), from data/app/lite
   (build_tools/layout). Every filter, chip and count works from it; a question's heavy fields come from its chunk.
   Where there is no lite copy (the server reads the old folders) it is the full topic file. */
export const bankLite = (id) => getJSON("/data/lite/bank/" + id + ".json").catch(() => bankTopic(id));
const chunks = new Map();                         /* url -> the chunk once loaded, so a question already here shows at once */
const chunkOf = (tid, d, q) => {
  if (!d.chunk) return null;
  d._pos ||= new Map(d.questions.map((x, n) => [x.id, n]));
  const n = d._pos.get(q.id);
  return n === undefined ? null : ["/data/lite/bank/" + tid + "/" + Math.floor(n / d.chunk) + ".json", n % d.chunk];
};
/* the whole question now if its chunk is loaded (or the file was full already), else null */
export function fullNow(tid, d, q) {
  if (!q) return null;
  const c = chunkOf(tid, d, q);
  if (!c) return q;
  const a = chunks.get(c[0]);
  return a ? { ...q, ...a[c[1]] } : null;
}
/* load the chunk that holds q (no-op when it is already here) */
export function loadFull(tid, d, q) {
  const c = q && chunkOf(tid, d, q);
  if (!c || chunks.has(c[0])) return Promise.resolve();
  return getJSON(c[0]).then((a) => { chunks.set(c[0], a); });
}
/* paper key -> { kind, prov, exam, stage, year, series, path }: where each Practice question appeared (build_tools/practice) */
export const bankPapers = () => getJSON("/data/bank/papers.json").catch(() => ({}));
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
/* `source` names, still used outside Practice (Modules lesson chips). Practice shows where a question is from by its papers. */
export const SOURCES = {
  arena_basics: "Arena · Beginner", arena_medium: "Arena · Medium", arena_glat: "Arena · GLAT",
  arena_pyq_memory_based: "Previous year papers", arena_sectional_mocks: "Arena · Sectional mocks", arena_booster_mocks: "Arena · Booster mocks",
  arena_full_mocks: "2026 Practice",          /* the full mocks' number series in Modules' 2026 Practice tab */
  "Arena CCE Arithmetic Ability - I": "Arena CCE book",
};
/* The Source chosen on the Practice topic list; it carries into the topic you open (this browser tab only). */
export function useSource() {
  const [v, set] = useState(() => { try { return JSON.parse(sessionStorage.getItem("ap-src2") || "[]"); } catch { return []; } });
  const put = (x) => { set(x); try { sessionStorage.setItem("ap-src2", JSON.stringify(x)); } catch {} };
  return [v, put];
}
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
/* a lesson's questions; the server answers at most 200 ids per call, so a longer lesson (a Number Series card) is fetched in parts */
export const courseQs = (ids) => {
  const parts = [];
  for (let k = 0; k < ids.length; k += 200) parts.push(getJSON("/api/course/q?ids=" + ids.slice(k, k + 200).join(",")));
  return parts.length === 1 ? parts[0] : Promise.all(parts).then((a) => a.flat());
};

/* Shorthand notes (data/notes): index.json lists the topics that have a notes file, so a topic without notes is never fetched.
   Resolves to the topic's notes with its subject's common rules as .common, or null when there are none (or no notes folder). */
export const notesIndex = () => getJSON("/data/notes/index.json").catch(() => null);
export async function topicNotes(subject, id) {
  const ix = await notesIndex();
  const s = ix && ix.subjects.find((x) => x.id === subject);
  const t = s && s.topics.find((x) => x.id === id);
  if (!t) return null;
  const [notes, common] = await Promise.all([getJSON("/data/notes/" + t.file), s.common ? getJSON("/data/notes/" + s.common).catch(() => null) : null]);
  return { ...notes, common };
}


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
