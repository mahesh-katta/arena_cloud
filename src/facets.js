/* ONE definition of how question filters work, used by every screen.
 *
 * Facts about the data (bank, 24,604 questions):
 *   level   = exam_stage: "Prelims" | "Mains" | "" (the Arena CCE book has none)
 *   source  = arena_medium | arena_basics | arena_glat | Arena CCE Arithmetic Ability - I
 *   DI      = the question belongs to a passage / chart / puzzle set (common_data_id); the book has none.
 *             "single" = every other question.
 *   subtopic= may be empty (shown as "General")
 *
 * Rule: choices inside one filter are OR, different filters are AND, nothing chosen = all.
 * Counts: the number next to an option is how many questions you would get if you ticked it
 * with all the OTHER filters kept. An option with 0 is disabled, so an empty result is impossible
 * by choice (it can only happen from a saved filter, which the topic page then relaxes).
 */
export const lvOf = (q) => q.exam_stage || "";
export const subOf = (q) => q.subtopic || "General";
export const NO_LEVEL = "";                    // key for "no level" (book questions)
export const levelName = (k) => (k === "" ? "No level (book)" : k);

/* di: "" = all questions · "only" = DI / puzzle-set questions · "single" = questions that stand alone (true = "only", from older saved filters) */
export const diMode = (f) => (f.di === true ? "only" : f.di || "");
export const EMPTY_F = { stage: [], src: [], sub: [], di: "", kind: [], shape: [], num: [] };
/* optional extra filters: only topics whose questions carry these fields show them (Number Series: series_type = Missing / Wrong, pattern = the module inside a subtopic) */
export const kindOf = (q) => q.series_type || "";
export const patOf = (q) => q.pattern || "";

/* A pattern name like "Add multiples of 12 (12, 24, 36 …)" is ONE shape ("Add multiples of a fixed number")
 * with a NUMBER (12) turned up or down. Those two were sitting in the same list, which is why Adding had 79
 * entries where most of them were the same idea. Here the name is split back into the shape and the number,
 * so the Pattern filter lists shapes and a second filter picks the number.
 * A pattern with no number of its own keeps its full name as the shape and has no number. */
const EXAMPLE = /\s*\([^()]*…[^()]*\)\s*$/;           // a trailing "(12, 24, 36 …)" is an illustration, not the number
const N = "(-?\\d+(?:[.,]\\d+)?)";
const SHAPES = [
  [`^(Add|Subtract) multiples of ${N}$`, (m) => [`${m[1]} multiples of a fixed number`, m[2]]],
  [`^(Add|Subtract) numbers rising by ${N}$`, (m) => [`${m[1]} a chain rising by a fixed step`, m[2]]],
  [`^(Add|Subtract) numbers falling by ${N}$`, (m) => [`${m[1]} a chain falling by a fixed step`, m[2]]],
  [`^(Add|Subtract) ${N} each time$`, (m) => [`${m[1]} the same number each time`, m[2]]],
  [`^(Add|Subtract) \\(n² ([+−]) ${N}\\)$`, (m) => [`${m[1]} (n² ± a fixed number)`, m[2] + m[3]]],
  [`^(Add|Subtract) \\(n³ ([+−]) ${N}\\)$`, (m) => [`${m[1]} (n³ ± a fixed number)`, m[2] + m[3]]],
  [`^(Add|Subtract) two numbers alternately \\(${N} and ${N}\\)$`, (m) => [`${m[1]} two numbers alternately`, `${m[2]} and ${m[3]}`]],
  [`^Multiply by ${N}$`, (m) => ["Multiply by a fixed number", m[1]]],
  [`^Divide by ${N}$`, (m) => ["Divide by a fixed number", m[1]]],
  [`^Multiply by ${N} and (add|subtract) ${N}$`, (m) => ["Multiply by a fixed number, then add or subtract a fixed number", `×${m[1]} ${m[2] === "add" ? "+" : "−"}${m[3]}`]],
  [`^(Multiply|Divide) by numbers rising by ${N}$`, (m) => [`${m[1]} by a chain rising by a fixed step`, m[2]]],
  [`^(Multiply|Divide) by numbers falling by ${N}$`, (m) => [`${m[1]} by a chain falling by a fixed step`, m[2]]],
].map(([re, f]) => [new RegExp(re), f]);

const split = new Map();                               // pattern name -> [shape, number]; only ~240 names exist
function partsOf(p) {
  let v = split.get(p);
  if (v) return v;
  const bare = p.replace(EXAMPLE, "");
  v = [p, ""];
  for (const [re, f] of SHAPES) { const m = bare.match(re); if (m) { v = f(m); break; } }
  split.set(p, v);
  return v;
}
export const shapeOf = (q) => (q.pattern ? partsOf(q.pattern)[0] : "");
export const numOf = (q) => (q.pattern ? partsOf(q.pattern)[1] : "");
/* the shapes that actually have a number to pick, among the questions passing the other filters */
export function numbersFor(qs, f) {
  const out = {};
  for (const q of qs) { if (!q.pattern || !pass(q, f, "num")) continue; const n = numOf(q); if (n) out[n] = (out[n] || 0) + 1; }
  return out;
}

const diOk = (q, f) => { const m = diMode(f); return !m || (m === "only" ? !!q.common_data_id : !q.common_data_id); };
const has = (arr, v) => !arr || !arr.length || arr.includes(v);
/* does question q pass filters f, ignoring the dimension `skip`? */
export function pass(q, f, skip) {
  return (skip === "stage" || has(f.stage, lvOf(q))) && (skip === "src" || has(f.src, q.source))
    && (skip === "sub" || has(f.sub, subOf(q))) && (skip === "di" || diOk(q, f))
    && (skip === "kind" || has(f.kind, kindOf(q))) && (skip === "shape" || has(f.shape, shapeOf(q)))
    && (skip === "num" || has(f.num, numOf(q)));
}
/* counts of every value of one dimension, among questions passing the other filters */
export function countBy(qs, f, dim) {
  const out = {};
  for (const q of qs) {
    if (!pass(q, f, dim)) continue;
    const k = dim === "stage" ? lvOf(q) : dim === "src" ? q.source : dim === "kind" ? kindOf(q) : dim === "shape" ? shapeOf(q) : dim === "num" ? numOf(q) : subOf(q);
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}
export const countDI = (qs, f) => qs.reduce((n, q) => n + (pass(q, f, "di") && q.common_data_id ? 1 : 0), 0);
export const countSingle = (qs, f) => qs.reduce((n, q) => n + (pass(q, f, "di") && !q.common_data_id ? 1 : 0), 0);

/* ---- the same rules, over the per-topic index rows (xs = all questions, xd = DI questions; keys "level|source") ---- */
/* mode "" = all (xs) · "only" = DI (xd) · "single" = all minus DI */
const rowsOf = (t, mode) => {
  const xs = t.xs || {}, xd = t.xd || {};
  const src = mode === "only" ? xd : xs;
  return Object.entries(src).map(([k, n]) => { const i = k.indexOf("|"); return { lv: k.slice(0, i), src: k.slice(i + 1), n: mode === "single" ? n - (xd[k] || 0) : n }; });
};
const passRow = (r, f, skip) => (skip === "stage" || has(f.stage, r.lv)) && (skip === "src" || has(f.src, r.src));
export function topicFits(t, f) { return rowsOf(t, diMode(f)).some((r) => r.n > 0 && passRow(r, f)); }
export function indexCounts(topics, f, dim) {
  const out = {};
  for (const t of topics) for (const r of rowsOf(t, diMode(f))) if (passRow(r, f, dim)) { const k = dim === "stage" ? r.lv : r.src; out[k] = (out[k] || 0) + r.n; }
  return out;
}
export function indexCountDI(topics, f) {
  let n = 0;
  for (const t of topics) for (const r of rowsOf(t, "only")) if (passRow(r, f)) n += r.n;
  return n;
}
export function indexCountSingle(topics, f) {
  let n = 0;
  for (const t of topics) for (const r of rowsOf(t, "single")) if (passRow(r, f)) n += r.n;
  return n;
}
