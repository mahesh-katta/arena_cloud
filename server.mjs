/* Arena Course: serves the app, the lessons and the question banks, and keeps progress.
 *
 *     node server.mjs            http://localhost:8000
 *     node server.mjs 8080       a different port
 *
 * No dependencies. Progress is written beside the repo (../arena_cloud_progress.json),
 * so a `git pull` never touches it.
 *
 * Routes:
 *     /                          the app (dist/)
 *     /data/...                  playbook.json and chart images
 *     GET  /api/q?keys=bank:key,...   questions with their workings
 *     GET  /api/pool?topic=id    the topic's questions in every bank, with a type each
 *     GET  /api/progress         the progress document
 *     POST /api/progress         replace it ({lessons, answers, review})
 */
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync, readFileSync } from "node:fs";
import { readFile, writeFile, rename } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { POOLS, SPLIT } from "./src/pools.js";

const APP = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(APP, "dist");
const DATA = path.join(APP, "data");
const PROGRESS = path.join(path.dirname(APP), "arena_cloud_progress.json");
const PORT = +process.argv[2] || +process.env.PORT || 8000;
const BANKS = ["clerk", "guidely", "sreedhar"];
const BANK_NAME = { clerk: "Clerk papers and graded sets", guidely: "Guidely", sreedhar: "Sreedhar mocks" };

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".map": "application/json",
};

console.log("Loading the question banks...");
const playbook = JSON.parse(readFileSync(path.join(DATA, "playbook", "playbook.json"), "utf8"));
const bank = {};
for (const b of BANKS) {
  const qs = JSON.parse(readFileSync(path.join(DATA, b, "questions.json"), "utf8"));
  const sets = JSON.parse(readFileSync(path.join(DATA, b, "sets.json"), "utf8"));
  const byKey = new Map(qs.map((q) => [q.set + "#" + q.q_no, q]));
  bank[b] = { qs, sets, byKey };
}
const modules = Object.fromEntries(playbook.modules.map((m) => [m.id, m]));

const norm = (s) => String(s || "").toLowerCase().replace(/^\d+\.\s*/, "").trim();

function slim(b, key) {
  const q = bank[b]?.byKey.get(key);
  if (!q) return null;
  return {
    bank: b, key, stem: q.stem, passage: q.passage || "", dirs: q.dirs || "",
    options: q.options, answer: q.answer, img: q.img || [],
    work: playbook.work?.[b]?.[key] || "", solution: q.solution || "",
    source: q.source?.label || bank[b].sets[q.set]?.title || q.set_title || "",
  };
}

/* Every question in the banks whose set belongs to the topic, plus any the
   playbook tagged to it from another set. The type is the
   archetype the playbook tagged it with; untagged ones fall back to the set's
   own subtopic, so Guidely sets still split into their named kinds. */
const poolCache = new Map();
function pool(topic) {
  if (poolCache.has(topic)) return poolCache.get(topic);
  const want = (POOLS[topic] || []).map(norm);
  const split = SPLIT[topic];
  const out = [];
  for (const b of BANKS) {
    const tagged = playbook.byKey?.[b] || {};
    for (const q of bank[b].qs) {
      const set = bank[b].sets[q.set] || {};
      const key = q.set + "#" + q.q_no;
      const tag = tagged[key];
      const mine = tag && tag[0] === topic;
      if (!mine && !want.includes(norm(set.topic))) continue;
      if (!mine && split && !split.test(set.subtopic || "") && b === "guidely") continue;
      let type = "";
      if (tag && modules[tag[0]]?.codes?.[tag[1]]) type = modules[tag[0]].codes[tag[1]].name;
      else if (b === "guidely" && set.subtopic && norm(set.subtopic) !== norm(set.topic))
        type = set.subtopic.replace(/^.*?\s-\s*/, "").replace(/^.*?based on\s*/i, "").replace(/^\w/, (c) => c.toUpperCase());
      else if (b === "clerk") type = /pyq/.test(q.set) ? "Previous papers" : "Graded practice";
      out.push({ bank: b, key, type: type || "Other", pyq: b === "clerk" && /pyq/.test(q.set) });
    }
  }
  const res = { topic, banks: BANKS.map((b) => ({ id: b, name: BANK_NAME[b], n: out.filter((x) => x.bank === b).length })), items: out };
  poolCache.set(topic, res);
  return res;
}

async function readProgress() {
  try { return JSON.parse(await readFile(PROGRESS, "utf8")); }
  catch { return { version: 1, lessons: {}, answers: {}, review: [] }; }
}
let chain = Promise.resolve();
const serial = (fn) => (chain = chain.then(fn, fn));

function send(res, code, body, type = "application/json; charset=utf-8") {
  res.writeHead(code, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}

function file(res, p) {
  if (!existsSync(p) || !statSync(p).isFile()) return send(res, 404, { error: "not found" });
  res.writeHead(200, { "Content-Type": TYPES[path.extname(p).toLowerCase()] || "application/octet-stream" });
  createReadStream(p).pipe(res);
}

const body = (req) => new Promise((ok, bad) => {
  let s = "";
  req.on("data", (c) => (s += c));
  req.on("end", () => { try { ok(JSON.parse(s || "{}")); } catch (e) { bad(e); } });
});

createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const p = decodeURIComponent(url.pathname);
  try {
    if (p === "/api/q") {
      const keys = (url.searchParams.get("keys") || "").split(",").filter(Boolean);
      return send(res, 200, keys.map((k) => { const i = k.indexOf(":"); return slim(k.slice(0, i), k.slice(i + 1)); }));
    }
    if (p === "/api/pool") return send(res, 200, pool(url.searchParams.get("topic") || ""));
    if (p === "/api/progress" && req.method === "GET") return send(res, 200, await readProgress());
    if (p === "/api/progress" && req.method === "POST") {
      const doc = await body(req);
      await serial(async () => {
        await writeFile(PROGRESS + ".tmp", JSON.stringify({ version: 1, ...doc }));
        await rename(PROGRESS + ".tmp", PROGRESS);
      });
      return send(res, 200, { ok: true });
    }
    if (p.startsWith("/data/")) {
      const f = path.normalize(path.join(APP, p));
      if (!f.startsWith(DATA + path.sep)) return send(res, 403, { error: "no" });
      return file(res, f);
    }
    const f = path.normalize(path.join(DIST, p === "/" ? "index.html" : p));
    if (!f.startsWith(DIST)) return send(res, 403, { error: "no" });
    return file(res, existsSync(f) ? f : path.join(DIST, "index.html"));
  } catch (e) {
    send(res, 500, { error: String(e.message || e) });
  }
}).listen(PORT, () => {
  console.log("Arena Course: http://localhost:" + PORT);
  console.log("Progress file: " + PROGRESS);
});
