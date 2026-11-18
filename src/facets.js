/* ONE definition of how Practice filters work (docs/practice-plan.md). No topic names live here: a topic's
 * own filters come from its data file, so a new topic needs no code change.
 *
 * Every question carries
 *   exam_stage  "Prelims" | "Mains" | empty. Empty = no stage known: shown under both.
 *   pp          the papers it appeared in: keys into data/bank/papers.json. Each paper has a path such as
 *               "trend/IBPS RRB PO/2026/S", "pyq/SBI PO/2023", "boost/Prelims Score Booster Bank PO/2026", "gen/Medium sets".
 * Every topic file carries `filters`, e.g. { key: "sub", label: "Subtopic", field: "subtopic", empty: "General" }
 *   needs  another filter's key that has to be picked first (Family needs a Type)
 *   order  the values in this order · sort: "count" (most first, "Other …" last) or "number"; default A–Z, empty last
 * The index (data/bank/index.json) has every path once in `paths`, and each topic row counts its questions in `pc`
 * by stage and by the set of paths they appeared under ("Prelims|3,17": 12), so counts are exact without the topic file.
 *
 * Rules: choices inside one filter are OR, different filters are AND, nothing chosen = all. The number beside an
 * option is how many questions you would get by ticking it, with the other filters kept; 0 = disabled.
 */

/* ---- Source: the four kinds and their sub-lists (exam → year → provider for Trending) ---- */
export const KINDS = [["pyq", "PYQ"], ["trend", "Trending"], ["boost", "Booster"], ["gen", "General"]];
const KIND_NAME = Object.fromEntries(KINDS);
const PROV = { G: "Mocks-G", S: "Mocks-S" };
/* the label of one step of a path: "trend" -> Trending, the last step of a Trending path -> Mocks-G / Mocks-S */
export function stepName(path) {
  const s = path.split("/"), last = s[s.length - 1];
  if (s.length === 1) return KIND_NAME[last] || last;
  if (s[0] === "trend" && s.length === 4) return PROV[last] || last;
  return last;
}
/* a paper's short label for a question chip: "Trending · IBPS RRB PO 2026 · Mocks-G" */
export function paperLabel(pap) {
  if (!pap) return "";
  const s = pap.path.split("/");
  return [KIND_NAME[s[0]], s[0] === "gen" ? s[1] : [pap.exam, pap.year].filter(Boolean).join(" "), s[0] === "trend" ? PROV[pap.prov] : ""].filter(Boolean).join(" · ");
}

export const underAny = (path, sel) => sel.some((s) => path === s || path.startsWith(s + "/"));
/* stage: the open profile's stage ("" = show everything); a question with no stage shows under both */
export const stageOk = (st, stage) => !stage || !st || st === stage;
export const srcOk = (q, sel, papers) => !sel.length || (q.pp || []).some((m) => papers[m] && underAny(papers[m].path, sel));

/* the Source tree from the index's path list: [{ path, depth, kids: [...] }] */
export function sourceTree(paths) {
  const root = { path: "", kids: [] }, at = new Map([["", root]]);
  for (const p of paths) {
    const s = p.split("/");
    for (let i = 1; i <= s.length; i++) {
      const k = s.slice(0, i).join("/");
      if (at.has(k)) continue;
      const n = { path: k, depth: i - 1, kids: [] };
      at.get(s.slice(0, i - 1).join("/")).kids.push(n); at.set(k, n);
    }
  }
  const rank = Object.fromEntries(KINDS.map(([k], i) => [k, i]));
  root.kids.sort((a, b) => (rank[a.path] ?? 9) - (rank[b.path] ?? 9));
  /* newest year first, everything else A–Z */
  const walk = (n) => { n.kids.sort((a, b) => (/^\d{4}$/.test(stepName(a.path)) && /^\d{4}$/.test(stepName(b.path)) ? stepName(b.path).localeCompare(stepName(a.path)) : stepName(a.path).localeCompare(stepName(b.path)))); n.kids.forEach(walk); };
  root.kids.forEach(walk);
  return root.kids;
}
/* ticking a node: on its own it is added (its children are then covered); a node covered by a ticked parent is
   taken out by replacing that parent with everything under it except this branch */
export function toggleSource(sel, path, tree) {
  if (sel.includes(path)) return sel.filter((s) => s !== path);
  const anc = sel.find((s) => path.startsWith(s + "/"));
  if (!anc) return [...sel.filter((s) => !s.startsWith(path + "/")), path];
  const find = (ns, p) => { for (const n of ns) { if (n.path === p) return n; const r = find(n.kids, p); if (r) return r; } return null; };
  const out = sel.filter((s) => s !== anc);
  let cur = find(tree, anc);
  while (cur && cur.path !== path) {
    const next = cur.kids.find((k) => path === k.path || path.startsWith(k.path + "/"));
    for (const k of cur.kids) if (k !== next) out.push(k.path);
    cur = next;
  }
  return out;
}
export const sourceSummary = (sel) => (!sel.length ? "All" : sel.length === 1 ? sel[0].split("/").map((_, i, s) => stepName(s.slice(0, i + 1).join("/"))).join(" · ") : sel.length + " chosen");

/* ---- the topic list: exact counts from an index row ---- */
export function rowCount(row, paths, stage, sel) {
  if (!row.pc) return row.n;                                   /* index built before the Source record existed */
  let n = 0;
  for (const k in row.pc) {
    const i = k.indexOf("|");
    if (!stageOk(k.slice(0, i), stage)) continue;
    if (sel.length) { const ps = k.slice(i + 1); if (!ps || !ps.split(",").some((j) => underAny(paths[+j], sel))) continue; }
    n += row.pc[k];
  }
  return n;
}

/* ---- a topic's own filters ---- */
export const DEFAULT_FILTERS = [{ key: "sub", label: "Subtopic", field: "subtopic", empty: "General" }];
export const valOf = (q, d) => { const v = q[d.field]; return v == null ? "" : String(v); };
export function pass(q, f, defs, skip) {
  for (const d of defs) {
    if (d.key === skip) continue;
    const s = f[d.key];
    if (s && s.length && !s.includes(valOf(q, d))) return false;
  }
  return true;
}
export function countBy(qs, f, defs, key) {
  const d = defs.find((x) => x.key === key), out = {};
  for (const q of qs) { if (!pass(q, f, defs, key)) continue; const k = valOf(q, d); out[k] = (out[k] || 0) + 1; }
  return out;
}
/* after a change: a filter whose `needs` is empty is cleared, and keeps only values that still occur under it */
export function prune(qs, f, defs) {
  const out = { ...f };
  for (const d of defs) {
    if (!d.needs || !(out[d.key] || []).length) continue;
    if (!(out[d.needs] || []).length) { out[d.key] = []; continue; }
    const p = defs.find((x) => x.key === d.needs);
    const ok = new Set(qs.filter((q) => out[d.needs].includes(valOf(q, p))).map((q) => valOf(q, d)));
    out[d.key] = out[d.key].filter((v) => ok.has(v));
  }
  return out;
}
/* option order for one filter: its own `order`, or by count / number, else A–Z with the empty value last */
export function sortVals(keys, d, all) {
  const other = (k) => /^Other /.test(k);
  if (d.order && d.order.length) { const r = (k) => { const i = d.order.indexOf(k); return i < 0 ? 1e6 : i; }; return [...keys].sort((x, y) => r(x) - r(y) || x.localeCompare(y)); }
  if (d.sort === "count") return [...keys].sort((x, y) => (x === "") - (y === "") || other(x) - other(y) || (all[y] || 0) - (all[x] || 0) || x.localeCompare(y));
  if (d.sort === "number") return [...keys].sort((x, y) => (parseFloat(x) || 0) - (parseFloat(y) || 0) || x.localeCompare(y));
  return [...keys].sort((x, y) => (x === "") - (y === "") || x.localeCompare(y));
}
