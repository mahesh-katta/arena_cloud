/* Arena Dashboard: serves the app, the question data and keeps progress.
 *
 *     node server.mjs            http://localhost:8000
 *     node server.mjs 8080       a different port
 *
 * No dependencies. Progress is written beside the folder (../arena_dashboard_progress.json).
 *
 * Routes:
 *     /                               the app (dist/)
 *     /data/bank|speed|mocks/*.json   the split data files (read-only)
 *     /data/images/...                question and chart images
 *     GET  /api/test?group=G&id=M     one mock test with only its questions
 *     GET  /api/course/q?ids=a,b,c    those questions (from bank / speed / mocks), in that order, each with a `ref`
 *     GET  /api/boot                  an id that changes each time the server starts
 *     GET  /api/progress              the progress document
 *     POST /api/progress              replace it */
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync, readFileSync } from "node:fs";
import { readFile, writeFile, rename } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createGzip } from "node:zlib";
import path from "node:path";

const APP = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(APP, "dist");
const DATA = path.join(APP, "data");
const PROGRESS = path.join(path.dirname(APP), "arena_dashboard_progress.json");
/* changes on every start, so the app can tell a refresh (same id) from a restart (new id) */
const BOOT = Date.now().toString(36);
const PORT = +process.argv[2] || +process.env.PORT || 8000;
const SERVED = ["bank", "speed", "mocks", "booster", "images", "course"].map((d) => path.join(DATA, d) + path.sep);

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".webp": "image/webp", ".woff2": "font/woff2",
};

/* Mock group files are 1-11 MB; keep the last few parsed in memory. */
const groups = new Map();
function group(id) {
  if (groups.has(id)) { const g = groups.get(id); groups.delete(id); groups.set(id, g); return g; }
  const f = path.join(DATA, "mocks", path.basename(id) + ".json");
  if (!existsSync(f)) return null;
  const g = JSON.parse(readFileSync(f, "utf8"));
  g.byMock = new Map();
  for (const q of g.questions) {
    if (!g.byMock.has(q.mock_id)) g.byMock.set(q.mock_id, []);
    g.byMock.get(q.mock_id).push(q);
  }
  groups.set(id, g);
  while (groups.size > 4) groups.delete(groups.keys().next().value);
  return g;
}

/* Course lessons name question ids; data/course/idmap.json says which file holds each. Parsed files are kept (last 6). */
let idmap = null;
const filesById = new Map();
const KIND = { b: "bank", s: "speed", m: "mocks" };
function courseQuestions(ids) {
  idmap ||= JSON.parse(readFileSync(path.join(DATA, "course", "idmap.json"), "utf8"));
  const out = [];
  for (const id of ids) {
    const w = idmap[id];
    if (!w) continue;
    const key = w[0] + w[1];
    if (!filesById.has(key)) {
      const f = path.join(DATA, KIND[w[0]], path.basename(w[1]) + ".json");
      filesById.set(key, new Map(JSON.parse(readFileSync(f, "utf8")).questions.map((q) => [q.id, q])));
      while (filesById.size > 6) filesById.delete(filesById.keys().next().value);
    } else { const m = filesById.get(key); filesById.delete(key); filesById.set(key, m); }
    const q = filesById.get(key).get(id);
    if (q) out.push({ ...q, _ref: w[0] === "m" ? { kind: "mock", group: w[1], mock: w[2] } : { kind: KIND[w[0]] === "bank" ? "bank" : "speed", file: w[1] } });
  }
  return out;
}

async function readProgress() {
  try { return JSON.parse(await readFile(PROGRESS, "utf8")); }
  catch { return { version: 3, user: null, profiles: {}, answers: {}, review: [], speed: {}, legacyMocks: {} }; }
}
let chain = Promise.resolve();
const serial = (fn) => (chain = chain.then(fn, fn));

function send(res, code, body) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}

function file(req, res, p, cache) {
  if (!existsSync(p) || !statSync(p).isFile()) return send(res, 404, { error: "not found" });
  const type = TYPES[path.extname(p).toLowerCase()] || "application/octet-stream";
  const zip = /json|javascript|css|html/.test(type) && /gzip/.test(req.headers["accept-encoding"] || "");
  res.writeHead(200, { "Content-Type": type, "Cache-Control": cache || "no-cache", ...(zip ? { "Content-Encoding": "gzip" } : {}) });
  const s = createReadStream(p);
  zip ? s.pipe(createGzip()).pipe(res) : s.pipe(res);
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
    if (p === "/api/test") {
      const g = group(url.searchParams.get("group") || "");
      const id = url.searchParams.get("id");
      const mock = g?.mocks.find((m) => m.mock_id === id);
      if (!mock) return send(res, 404, { error: "no such test" });
      return send(res, 200, { group: g.id, kind: g.kind, groupName: g.name, mock, questions: g.byMock.get(id) || [] });
    }
    if (p === "/api/boot") return send(res, 200, { boot: BOOT });
    if (p === "/api/course/q") return send(res, 200, courseQuestions((url.searchParams.get("ids") || "").split(",").filter(Boolean).slice(0, 200)));
    if (p === "/api/progress" && req.method === "GET") return send(res, 200, await readProgress());
    if (p === "/api/progress" && req.method === "POST") {
      const doc = await body(req);
      await serial(async () => {
        await writeFile(PROGRESS + ".tmp", JSON.stringify({ version: 3, ...doc }));
        await rename(PROGRESS + ".tmp", PROGRESS);
      });
      return send(res, 200, { ok: true });
    }
    if (p.startsWith("/data/")) {
      const f = path.normalize(path.join(APP, p));
      if (!SERVED.some((d) => f.startsWith(d))) return send(res, 403, { error: "no" });
      return file(req, res, f, f.includes(path.sep + "images" + path.sep) ? "max-age=604800" : "no-cache");
    }
    const f = path.normalize(path.join(DIST, p === "/" ? "index.html" : p));
    if (!f.startsWith(DIST)) return send(res, 403, { error: "no" });
    return file(req, res, existsSync(f) ? f : path.join(DIST, "index.html"));
  } catch (e) {
    send(res, 500, { error: String(e.message || e) });
  }
}).listen(PORT, () => {
  console.log("Arena Dashboard: http://localhost:" + PORT);
  console.log("Progress file: " + PROGRESS);
});
