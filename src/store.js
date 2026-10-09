/* Loading the playbook and the banks, and keeping progress.
   Progress is saved by the server beside the repo; the browser keeps a copy
   so the app still works if the server cannot write. */
import { useEffect, useState } from "react";

let progress = { version: 1, lessons: {}, answers: {}, review: [], last: null };
const subs = new Set();
let saveTimer = null;

try {
  const local = JSON.parse(localStorage.getItem("arena-progress") || "null");
  if (local) progress = { ...progress, ...local };
} catch {}

export async function loadProgress() {
  try {
    const r = await fetch("/api/progress");
    if (r.ok) {
      const d = await r.json();
      progress = { ...progress, ...d };
      emit();
    }
  } catch {}
}

function emit() {
  for (const f of subs) f(progress);
}

function save() {
  try { localStorage.setItem("arena-progress", JSON.stringify(progress)); } catch {}
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fetch("/api/progress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(progress) }).catch(() => {});
  }, 400);
}

export function update(fn) {
  const copy = structuredClone(progress);
  progress = fn(copy) || copy;
  emit();
  save();
}

export function useProgress() {
  const [p, set] = useState(progress);
  useEffect(() => { subs.add(set); return () => subs.delete(set); }, []);
  return p;
}

export const lessonKey = (topic, id) => topic + "/" + id;

export function markLesson(topic, id, right, total) {
  update((p) => {
    p.lessons[lessonKey(topic, id)] = { done: true, right, total, at: Date.now() };
    p.last = { topic, lesson: id };
  });
}

export function recordAnswer(q, topic, ok, secs) {
  const k = q.bank + ":" + q.key;
  update((p) => {
    p.answers[k] = { ok, t: Math.round(secs), at: Date.now() };
    p.review = p.review.filter((r) => r.k !== k);
    if (!ok) p.review.unshift({ k, topic, at: Date.now() });
  });
}

export function dropReview(k) {
  update((p) => { p.review = p.review.filter((r) => r.k !== k); });
}

let book = null;
export async function loadPlaybook() {
  if (book) return book;
  const r = await fetch("/data/playbook/playbook.json");
  book = await r.json();
  book.byId = Object.fromEntries(book.modules.map((m) => [m.id, m]));
  book.byId.basics = { id: "basics", part: "basics", title: book.basics.title, sections: [], guide: { intro: book.basics.intro, lessons: book.basics.lessons } };
  for (const [id, title] of [["grammar", "Grammar"], ["vocabulary", "Vocabulary"]])
    book.byId[id] = { id, part: "english", title, english: true, sections: [], guide: { lessons: [] } };
  return book;
}

const qCache = new Map();
export async function fetchQuestions(refs) {
  const need = refs.filter((r) => !qCache.has(r));
  for (let i = 0; i < need.length; i += 40) {
    const part = need.slice(i, i + 40);
    const r = await fetch("/api/q?keys=" + encodeURIComponent(part.join(",")));
    const d = await r.json();
    part.forEach((ref, j) => qCache.set(ref, d[j]));
  }
  return refs.map((r) => qCache.get(r)).filter(Boolean);
}

const poolCache = new Map();
export async function fetchPool(topic) {
  if (!poolCache.has(topic)) poolCache.set(topic, fetch("/api/pool?topic=" + encodeURIComponent(topic)).then((r) => r.json()));
  return poolCache.get(topic);
}

export const lessonsOf = (m) => m?.guide?.lessons || [];
export const doneCount = (p, m) => lessonsOf(m).filter((l) => p.lessons[lessonKey(m.id, l.id)]?.done).length;

let indexP = null;
export const fetchIndex = () => (indexP ||= fetch("/api/index").then((r) => r.json()));

export const SOURCES = [
  { id: "all", name: "All sources", note: "Every bank together" },
  { id: "papers", name: "Previous papers", note: "IBPS Clerk Prelims, memory-based" },
  { id: "clerk", name: "Clerk graded sets", note: "Built and checked for this course" },
  { id: "guidely", name: "Guidely", note: "Topic-wise sets from the Guidely PDFs" },
  { id: "sreedhar", name: "Sreedhar", note: "Questions from 81 full mock tests" },
];
export const inSource = (src) => (x) =>
  src === "all" || (src === "papers" ? x.pyq : src === "clerk" ? x.bank === "clerk" && !x.pyq : x.bank === src);

export function resetAll() {
  update(() => ({ version: 1, lessons: {}, answers: {}, review: [], last: null, known: {} }));
}

export function resetTopic(topic) {
  update((p) => {
    for (const k of Object.keys(p.lessons)) if (k.startsWith(topic + "/")) delete p.lessons[k];
    p.review = p.review.filter((r) => r.topic !== topic);
    if (p.last?.topic === topic) p.last = null;
    return p;
  });
}

export function setTheme(t) {
  try { localStorage.setItem("arena-theme", t); } catch {}
  applyTheme();
}
export function getTheme() {
  try { return localStorage.getItem("arena-theme") || "auto"; } catch { return "auto"; }
}
export function applyTheme() {
  const t = getTheme();
  if (t === "auto") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", t);
}

/* "Mark as done" from the lesson header, without doing the practice. */
export function setLessonDone(topic, id, done) {
  update((p) => {
    const k = lessonKey(topic, id);
    if (done) {
      p.lessons[k] = { ...(p.lessons[k] || {}), done: true, at: Date.now(), marked: true };
      p.last = { topic, lesson: id };
    } else delete p.lessons[k];
  });
}

/* English: rule and word lists (data/english/*.json), loaded on demand. */
const enCache = {};
export const loadEnglish = (id) => (enCache[id] ||= fetch("/data/english/" + id + ".json").then((r) => r.json()));

/* "I know this" marks for English rules and words: known["g:<rule id>"], known["v:<word>"]. */
export function setKnown(k, on) {
  update((p) => {
    p.known = p.known || {};
    if (on) p.known[k] = Date.now(); else delete p.known[k];
  });
}

export function clearKnown() {
  update((p) => { p.known = {}; });
}
