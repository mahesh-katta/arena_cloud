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
  progress = fn(structuredClone(progress)) || progress;
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
