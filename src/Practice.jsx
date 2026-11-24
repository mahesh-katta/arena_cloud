/* Topic Practice (docs/practice-plan.md).
 *   Topic list: five cards (from data/bank/index.json `cards`), search, the Source tree (PYQ / Trending / Booster /
 *   General), the default order or the user's own order per profile. Prelims / Mains follow the open profile.
 *   A topic: Status, Shuffle, Source, and the topic's own filters read from its data file. No topic names in here. */
import { useEffect, useMemo, useState } from "react";
import Solver, { fmt } from "./Question.jsx";
import { DEFAULT_FILTERS, pass, countBy, prune, sortVals, stageOk, srcOk, rowCount, sourceTree, toggleSource, sourceSummary, stepName, paperLabel, KINDS } from "./facets.js";
import { bankIndex, bankLite, fullNow, loadFull, bankPapers, useData, useProgress, shuffled, readPos, writePos, useSource, setTopicOrder } from "./store.js";
import { FacetBox, Switch, Dropdown, TreePicker, Solve, useView, ViewToggle, secClass, Ring, Meter, pct, Loading, Failed } from "./ui.jsx";
import { glyph } from "./TopicIcon.jsx";
import { CARD_ICON } from "./Course.jsx";

/* answers grouped by the topic file they came from */
function useTopicStats() {
  const p = useProgress();
  return useMemo(() => {
    const m = {};
    for (const a of Object.values(p.answers)) {
      if (!a.f) continue;
      const s = (m[a.f] ||= { done: 0, ok: 0, last: 0 });
      s.done++; if (a.ok) s.ok++; if (a.at > s.last) s.last = a.at;
    }
    return m;
  }, [p.answers]);
}
/* a question answered under any of its ids (one copy is kept of a repeat; `same` lists the other ids; `twins` are
   copies kept twice inside sets that only partly repeat, see build_tools/practice/twins.py) */
const otherIds = (q) => [...(q.same || []), ...(q.twins || [])];
export const answerOf = (p, q) => p.answers[q.id] || otherIds(q).map((i) => p.answers[i]).find(Boolean);
/* a copy whose twin was already answered: Practice doesn't show it again */
const twinDone = (p, q) => !p.answers[q.id] && (q.twins || []).some((i) => p.answers[i]);
/* one copy of each twin group: the first one left in the list (an answered copy, since unanswered ones whose twin
   is answered are taken out before this) */
const once = (a) => {
  const seen = new Set();
  return a.filter((q) => {
    if (!q.twins) return true;
    const g = [q.id, ...q.twins].sort()[0];
    if (seen.has(g)) return false;
    seen.add(g); return true;
  });
};

const useSession2 = (key, init) => {
  const [v, set] = useState(() => { try { return JSON.parse(sessionStorage.getItem(key)) ?? init; } catch { return init; } });
  useEffect(() => { try { sessionStorage.setItem(key, JSON.stringify(v)); } catch {} }, [v]);
  return [v, set];
};
/* card id -> the look it borrows from Modules (colour + icon) */
const CARD_CLS = { arithmetic: "quant", puzzles: "reasoning", cracker: "cracker", di: "di", english: "english" };
const CARD_LINE = { arithmetic: "Word problems", puzzles: "Seating and puzzles", cracker: "Quick scoring types", di: "Charts and tables", english: "Grammar and reading" };

export function PracticeHome() {
  const p = useProgress();
  const stats = useTopicStats();
  const [ix, err] = useData(bankIndex, []);
  const [pick, setPick] = useSession2("ap-card", "");
  const [src, setSrc] = useSource();
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState(false);
  const [drag, setDrag] = useState(null);
  const [view, setView] = useView("ap-view-practice", "list");
  const pos = useMemo(readPos, []);
  const stage = (p.profile && p.profile.stage) || "";
  const paths = (ix && ix.paths) || [];
  const rows = useMemo(() => (ix ? Object.fromEntries(ix.sections.flatMap((s) => s.topics.map((t) => [t.id, { ...t, sec: s.name }]))) : {}), [ix]);
  const tree = useMemo(() => sourceTree(paths), [ix]);
  const counts = useMemo(() => { const m = {}; for (const id in rows) m[id] = rowCount(rows[id], paths, stage, src); return m; }, [rows, stage, src]);
  /* questions under one Source node, all topics together (cached per stage) */
  const nodeCount = useMemo(() => { const c = new Map(); return (path) => { if (!c.has(path)) { let n = 0; for (const id in rows) n += rowCount(rows[id], paths, stage, [path]); c.set(path, n); } return c.get(path); }; }, [rows, stage]);
  if (err) return <Failed what="the question bank" err={err} />;
  if (!ix) return <Loading />;

  const cards = ix.cards || ix.sections.map((s) => ({ id: s.id, name: s.name, topics: s.topics.map((t) => t.id) }));
  const cur = cards.find((c) => c.id === pick) || cards[0];
  const prof = (p.user && p.user.active) || "_";
  const custom = (c) => p.order && p.order[prof] && p.order[prof][c.id];
  /* the user's order for this profile, with any topic it does not know yet added in the default order */
  const orderOf = (c) => { const s = custom(c); if (!s) return c.topics; const have = new Set(c.topics), a = s.filter((id) => have.has(id)); return [...a, ...c.topics.filter((id) => !a.includes(id))]; };
  const shown = (c) => orderOf(c).filter((id) => rows[id] && counts[id] > 0);
  const ql = q.trim().toLowerCase();
  const hit = (id) => { const t = rows[id]; return t.topic.toLowerCase().includes(ql) || Object.keys(t.subtopics || {}).some((x) => x && x.toLowerCase().includes(ql)); };
  const found = ql ? cards.map((c) => ({ c, ids: shown(c).filter(hit) })).filter((g) => g.ids.length) : [];
  const list = shown(cur), hidden = orderOf(cur).filter((id) => rows[id]).length - list.length;
  const kindsOf = (t) => KINDS.map(([k, name]) => [name, rowCount(t, paths, stage, [k])]).filter(([, n]) => n > 0);
  const answers = Object.values(p.answers), right = answers.filter((a) => a.ok).length;
  const weak = Object.values(rows).filter((t) => stats[t.id]?.done >= 5 && stats[t.id].ok / stats[t.id].done < 0.6)
    .sort((a, b) => stats[a.id].ok / stats[a.id].done - stats[b.id].ok / stats[b.id].done).slice(0, 4);
  const seenAt = (t) => Math.max(pos[t.id]?.at || 0, stats[t.id]?.last || 0);
  const recent = Object.values(rows).filter(seenAt).sort((a, b) => seenAt(b) - seenAt(a)).slice(0, 8);
  const card = (t, rank) => <TopicCard key={t.id} t={t} n={counts[t.id]} st={stats[t.id]} pos={pos[t.id]} rank={rank} kinds={kindsOf(t)} />;

  /* edit order: drag a row, or use its arrows; every move is saved for this profile */
  const all = orderOf(cur).filter((id) => rows[id]);
  const move = (from, to) => { if (to < 0 || to >= all.length || from === to) return; const a = [...all]; const [x] = a.splice(from, 1); a.splice(to, 0, x); setTopicOrder(prof, cur.id, a); };

  return (
    <div className="page pract cfit">
      <div className="bp-top chead3">
        <h1>Topic Practice</h1>
        <div className="hright">
          <div className="filterbar">
            <TreePicker label="Source" value={src} onChange={setSrc} tree={tree} count={nodeCount} nameOf={stepName} toggle={toggleSource} summary={sourceSummary(src)} />
            <ViewToggle view={view} setView={setView} />
          </div>
          <input className="search csearch" type="search" aria-label="Search topics" placeholder="Search topics or subtopics" value={q} onChange={(e) => setQ(e.target.value)} />
          {(src.length > 0 || q) && <div className="hact"><button type="button" className="btn ghost sm" onClick={() => { setQ(""); setSrc([]); }}>Clear filters</button></div>}
        </div>
      </div>
      {/* the five cards use the Modules card row as is (no Practice-only overrides) */}
      <div className="ccards" role="tablist" aria-label="Practice sections">
        {cards.map((c) => {
          const ids = shown(c), soon = !c.topics.length, cls = CARD_CLS[c.id] || "all";
          return (
            <button key={c.id} type="button" role="tab" aria-selected={!ql && c.id === cur.id} disabled={soon} aria-label={c.name + (soon ? ", coming soon" : ", " + ids.length + " topics")}
              className={"ccard c-" + cls + (!ql && c.id === cur.id ? " on" : "") + (soon ? " soon" : "")} onClick={() => { setQ(""); setEdit(false); setPick(c.id); }}>
              <span className="cbot"><b>{c.name}</b><em>{soon ? "Coming soon" : ids.reduce((a, id) => a + counts[id], 0).toLocaleString() + " questions"}</em></span>
              <span className="ctop"><span className="cico">{CARD_ICON[cls]}</span><span className="cpill">{soon ? "Soon" : ids.length + " topics"}</span></span>
            </button>
          );
        })}
      </div>

      <section className="shelf pwrap">
        <div className="pfix prow">
          <div className="plhead">
            <h2 className="plh">{ql ? "Search results" : cur.name}</h2>
            <div className="listtop">
              <span className="muted small resultcount" aria-live="polite">
                {ql ? found.reduce((a, g) => a + g.ids.length, 0) + " found" : list.length + " topics"}
                {stage && " · " + stage + " questions, and ones with no stage"} · {pct(right, answers.length)}% accuracy overall
              </span>
              <span className="grow" />
              {!ql && cur.topics.length > 0 && (edit
                ? <button type="button" className="btn primary sm" onClick={() => setEdit(false)}>Done</button>
                : <button type="button" className="btn ghost sm" onClick={() => setEdit(true)} title="Put the topics of this card in your own order">Edit order</button>)}
            </div>
          </div>
        </div>
        <div className="pgsplit">
          <div className="pscroll">
            {ql ? (
              <>
                {!found.length && <div className="empty">No topic matches “{q.trim()}”. <button type="button" className="linkbtn" onClick={() => setQ("")}>Clear search</button></div>}
                {found.map(({ c, ids }) => (
                  <div key={c.id} className="cgroup"><h2 className="cgh">{c.name}</h2><div className={view === "grid" ? "grid" : "list"}>{ids.map((id) => card(rows[id], 0))}</div></div>
                ))}
              </>
            ) : edit ? (
              <div className="ordbox">
                <div className="ordhead">
                  <div className="grow"><b>Your order for {cur.name}</b><p className="muted small">Drag a topic, or use its arrows. Saved for this profile; Reset all keeps it.</p></div>
                  <button type="button" className="btn ghost sm" disabled={!custom(cur)} onClick={() => setTopicOrder(prof, cur.id, null)}>Back to default</button>
                </div>
                <ol className="ordlist">
                  {all.map((id, i) => (
                    <li key={id} draggable className={"ordrow" + (drag && drag.over === i ? " over" : "") + (drag && drag.from === i ? " lift" : "")}
                      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; setDrag({ from: i, over: i }); }}
                      onDragOver={(e) => { e.preventDefault(); if (drag && drag.over !== i) setDrag({ ...drag, over: i }); }}
                      onDrop={(e) => { e.preventDefault(); if (drag) move(drag.from, i); setDrag(null); }}
                      onDragEnd={() => setDrag(null)}>
                      <span className="grip" aria-hidden="true">⠿</span><span className="ono">{i + 1}</span>
                      <span className="tile">{glyph(rows[id].topic)}</span><span className="grow oname">{rows[id].topic}</span>
                      <small className="muted">{counts[id].toLocaleString()}</small>
                      <button type="button" className="obtn" aria-label={"Move " + rows[id].topic + " up"} disabled={i === 0} onClick={() => move(i, i - 1)}>↑</button>
                      <button type="button" className="obtn" aria-label={"Move " + rows[id].topic + " down"} disabled={i === all.length - 1} onClick={() => move(i, i + 1)}>↓</button>
                    </li>
                  ))}
                </ol>
              </div>
            ) : (
              <>
                <div className={view === "grid" ? "grid" : "list"}>{list.map((id, i) => card(rows[id], i + 1))}</div>
                {!list.length && <div className="empty">No topic here has {stage ? stage + " " : ""}questions{src.length ? " for this Source" : ""}.{src.length > 0 && <> <button className="linkbtn" onClick={() => setSrc([])}>Show every source</button></>}</div>}
                {hidden > 0 && list.length > 0 && <p className="muted small hiddennote">{hidden} more {hidden === 1 ? "topic has" : "topics have"} no {stage ? stage + " " : ""}questions{src.length ? " for this Source" : ""}{stage && !src.length ? " (change the stage by switching profile in Settings)" : ""}.{src.length > 0 && <> <button className="linkbtn" onClick={() => setSrc([])}>Show every source</button></>}</p>}
              </>
            )}
          </div>
          <div className="pside">
            <aside className="precent" aria-label="Recently opened">
              <h2>Recently opened</h2>
              {recent.length === 0 && <p className="muted small">Topics you open will show up here.</p>}
              {recent.map((t) => (
                <div className="rrow" key={t.id}><span className="tile">{glyph(t.topic)}</span><span className="rname">{t.topic}</span><a className="btn primary sm" href={"#/practice/" + t.id}>Start</a></div>
              ))}
            </aside>
            {weak.length > 0 && (
              <aside className="precent pweak" aria-label="Weak areas">
                <h2>Weak areas <span className="muted small">below 60% accuracy</span></h2>
                {weak.map((t) => (
                  <div className="rrow" key={t.id}><span className="tile">{glyph(t.topic)}</span>
                    <span className="rname">{t.topic}<small className="muted wacc">{pct(stats[t.id].ok, stats[t.id].done)}% · {stats[t.id].done} done</small></span>
                    <a className="btn primary sm" href={"#/practice/" + t.id}>Practice</a></div>
                ))}
              </aside>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function TopicCard({ t, n, st, pos, rank, kinds }) {
  const done = st?.done || 0, ok = st?.ok || 0;
  return (
    <a className={"card tcard " + secClass(t.sec) + " c-" + (/quant/i.test(t.sec) ? "quant" : "reasoning")} href={"#/practice/" + t.id}>
      <div className="top">
        <span className="tile">{glyph(t.topic)}</span>
        <div className="grow">
          <div className="name">{rank > 0 && <span className="rank">{rank}</span>}{t.topic}</div>
          <div className="sub">{n.toLocaleString()} questions{n < t.n ? " of " + t.n.toLocaleString() : ""}</div>
        </div>
        {pos && pos.i > 0 && <span className="chip ac">Q {Math.min(pos.i + 1, pos.n || pos.i + 1)}</span>}
      </div>
      <div className="chips">{kinds.map(([k, c]) => <span key={k} className="chip">{k} {c.toLocaleString()}</span>)}</div>
      <div className="foot">
        <Meter ok={ok} bad={done - ok} total={t.n} />
        <span className="stat-mini">{done}/{t.n}</span>
        <Ring pct={done ? (100 * ok) / done : 0} />
      </div>
      <span className="btn primary sm go">Practice</span>
    </a>
  );
}

function Session({ s }) {
  return (
    <div className="kv">
      <div><b>{s.n}</b><span>Attempted</span></div>
      <div><b className="okc">{s.ok}</b><span>Correct</span></div>
      <div><b>{pct(s.ok, s.n)}%</b><span>Accuracy</span></div>
      <div><b>{s.n ? fmt(Math.round(s.t / s.n)) : "–"}</b><span>Avg per question</span></div>
    </div>
  );
}
export { Session };
export const useSession = () => {
  const [s, set] = useState({ n: 0, ok: 0, t: 0 });
  return [s, (ok, t) => set((x) => ({ n: x.n + 1, ok: x.ok + (ok ? 1 : 0), t: x.t + t }))];
};

/* One topic. Its filters, shuffle order and the current question are remembered per topic.
   A link may set filters by key (?sub=…, or Modules' "More like this": ?kind=…&nty=…&nfam=…). */
export function PracticeRun({ topic, query }) {
  const p = useProgress();
  const [d, err] = useData(() => bankLite(topic), [topic]);
  const [papers] = useData(bankPapers, []);
  const [ix] = useData(bankIndex, []);
  const [, setLoaded] = useState(0);         /* bumps when a question's chunk arrives */
  const [src, setSrc] = useSource();
  const stage = (p.profile && p.profile.stage) || "";
  const linked = [...query.keys()].length > 0;
  const [saved] = useState(() => (linked ? null : readPos()[topic]));
  const [f, setF] = useState(() => (linked
    ? { ...Object.fromEntries([...query.entries()].map(([k, v]) => [k, [v]])), prog: "", mix: false }
    : { ...(saved?.f || {}), prog: saved?.f?.prog || "", mix: !!saved?.f?.mix }));
  const [i, setI] = useState(() => (saved ? saved.i || 0 : 0));
  const [seed] = useState(() => saved?.seed || Date.now() % 100000);
  const [sess, addSess] = useSession();
  const [tools, setTools] = useState(false);
  const [rtab, setRtab] = useState("filters");
  const [fopen, setFopen] = useState(false);
  const [noteOff, setNoteOff] = useState(false);
  const defs = d && d.filters && d.filters.length ? d.filters : DEFAULT_FILTERS;
  /* the questions this topic offers now: the profile's stage and the chosen Source */
  const base = useMemo(() => (d && papers ? d.questions.filter((q) => stageOk(q.exam_stage, stage) && srcOk(q, src, papers)) : []), [d, papers, stage, src]);
  const counts = useMemo(() => {
    const c = { all: {} };
    for (const x of defs) { c[x.key] = countBy(base, f, defs, x.key); c.all[x.key] = countBy(base, {}, defs, x.key); }
    const inF = once(base.filter((q) => pass(q, f, defs) && !twinDone(p, q)));
    c.prog = { todo: inF.filter((q) => !answerOf(p, q)).length, done: inF.filter((q) => answerOf(p, q)).length };
    return c;
  }, [base, f, defs, p.answers]);
  const list = useMemo(() => {
    let a = once(base.filter((q) => pass(q, f, defs) && !twinDone(p, q)));
    if (f.prog === "todo") a = a.filter((q) => !answerOf(p, q));
    else if (f.prog === "done") a = a.filter((q) => answerOf(p, q));
    return f.mix ? shuffled(a, seed) : a;
  }, [base, f, seed]);
  useEffect(() => { if (d) writePos(topic, { f, i, seed, n: list.length, at: Date.now() }); }, [d, f, i, list.length]);
  /* the shown question's text, options and explanation come from its chunk; the next and previous ones are fetched ahead */
  const at0 = Math.min(i, list.length);
  useEffect(() => { if (!d) return; let live = true;
    loadFull(topic, d, list[at0]).then(() => live && setLoaded((n) => n + 1), () => {});
    for (const k of [at0 + 1, at0 - 1, at0 + 2]) if (list[k]) loadFull(topic, d, list[k]).catch(() => {});
    return () => { live = false; }; }, [d, list, at0]);

  if (err) return <Failed what="this topic" err={err} />;
  if (!d || !papers) return <Loading />;
  const setK = (k) => (v) => { setF((x) => prune(base, { ...x, [k]: v }, defs)); setI(0); };
  const active = defs.reduce((a, x) => a + (f[x.key] || []).length, 0) + (f.prog ? 1 : 0) + (f.mix ? 1 : 0) + src.length;
  const clear = () => { setF({ prog: "", mix: false }); setSrc([]); setI(0); };
  const at = Math.min(i, list.length);
  const q = list[at];
  const full = fullNow(topic, d, q);
  const prev = q && answerOf(p, q);
  const tree = sourceTree((ix && ix.paths) || []);
  /* Source counts inside this topic: its questions under each node, with the stage and the topic's filters kept */
  /* one pass: each question adds 1 to every step of every path it appeared under (once per question) */
  const nodeMap = new Map();
  for (const x of d.questions) {
    if (!stageOk(x.exam_stage, stage) || !pass(x, f, defs)) continue;
    const seen = new Set();
    for (const m of x.pp || []) { const s = (papers[m] || {}).path; if (!s) continue; const parts = s.split("/"); for (let k = 1; k <= parts.length; k++) seen.add(parts.slice(0, k).join("/")); }
    for (const k of seen) nodeMap.set(k, (nodeMap.get(k) || 0) + 1);
  }
  const nodeCount = (path) => nodeMap.get(path) || 0;
  const label = (k) => (defs.find((x) => x.key === k) || {}).label || k;
  const linkNote = linked && !noteOff ? "Opened with " + [...query.entries()].map(([k, v]) => label(k) + ": " + v).join(", ") + "." + (src.length ? " The Source you picked (" + sourceSummary(src) + ") also applies." : "") + " Clear the filters to see the whole topic." : "";
  const where = q && (q.pp || []).map((m) => papers[m]).filter(Boolean);
  const filterUI = defs.map((x) => {
    const all = counts.all[x.key] || {}, keys = Object.keys(all), chosen = f[x.key] || [];
    if (x.needs) {
      const parent = defs.find((y) => y.key === x.needs);
      if (!(f[x.needs] || []).length) {
        const parentShown = parent && (!parent.needs || (f[parent.needs] || []).length);
        return parentShown && keys.filter(Boolean).length > 1 ? <div className="facet" key={x.key}><div className="flabel">{x.label}</div><div className="muted small">Pick a {parent.label.toLowerCase()} to see these</div></div> : null;
      }
    }
    if (keys.length < 2 && !chosen.length && !x.always) return null;   /* `always`: shown even with one option (Level while all Unknown) */
    let opts = sortVals(keys, x, all).map((k) => [k, k === "" ? x.empty || "Not set" : k, (counts[x.key] || {})[k] || 0]);
    if (x.needs) opts = opts.filter((o) => o[0] && (o[2] > 0 || chosen.includes(o[0])));
    return <FacetBox key={x.key} label={x.label} value={chosen} onChange={setK(x.key)} opts={opts} always={x.always} />;
  });
  const crumbs = <><a href="#/practice">Topic-wise Practice</a><span>/</span>{d.section}<span>/</span><b>{d.topic}</b></>;
  const rail = (
    <>
      <div className="card">
        <div className="railhead"><span className="tile">{glyph(d.topic)}</span><div><h3>{d.topic}</h3><div className="muted small">{base.length.toLocaleString()} questions{base.length < d.questions.length ? " of " + d.questions.length.toLocaleString() : ""} · {d.section}{stage ? " · " + stage : ""}</div></div></div>
        <Session s={sess} />
      </div>
      <div className="railtabs" role="tablist" aria-label="Tools sections">
        {[["filters", "Filters"], list.length > 0 && ["qs", "Questions"]].filter(Boolean).map(([k, t]) => (
          <button key={k} type="button" role="tab" aria-selected={rtab === k} className={rtab === k ? "on" : ""} onClick={() => { setRtab(k); if (k === "filters") setFopen(true); }}>{t}</button>
        ))}
      </div>
      <div className={"card rtab" + (rtab === "filters" ? " on" : "")}>
        <div className="railhead"><button type="button" className="fold" aria-expanded={fopen} onClick={() => setFopen(!fopen)}><h3 className="grow">Filter questions</h3><span className="muted small">{active > 0 ? active + " on" : "All"}</span><i aria-hidden="true" /></button>{active > 0 && <button className="btn ghost sm" onClick={clear}>Clear {active}</button>}</div>
        <div className="filters" hidden={!fopen}>
          <div className="facet"><div className="flabel">Source</div><TreePicker label="Source" value={src} onChange={(v) => { setSrc(v); setI(0); }} tree={tree} count={nodeCount} nameOf={stepName} toggle={toggleSource} summary={sourceSummary(src)} /></div>
          {filterUI}
          <Dropdown label="Status" value={f.prog} onChange={(v) => { setF((x) => ({ ...x, prog: v })); setI(0); }} opts={[["", "All"], ["todo", "Not attempted", counts.prog.todo], ["done", "Attempted", counts.prog.done]]} />
          <Switch checked={!!f.mix} onChange={(v) => { setF((x) => ({ ...x, mix: v })); setI(0); }}>Shuffle order</Switch>
        </div>
      </div>
      {list.length > 0 && (
        <div className={"card rtab" + (rtab === "qs" ? " on" : "")}>
          <div className="railhead"><h3 className="grow">Jump to question</h3><span className="muted small">{list.filter((x) => answerOf(p, x)).length} done</span></div>
          <div className="navgrid">
            {list.map((x, j) => {
              const a = answerOf(p, x);
              return <button key={x.id} aria-label={"Question " + (j + 1) + (a ? (a.ok ? ", correct" : ", wrong") : "")} aria-current={j === at ? "true" : undefined}
                className={"pnum" + (a ? (a.ok ? " okn" : " badn") : "") + (j === at ? " now" : "")} onClick={() => { setI(j); setTools(false); }}>{j + 1}</button>;
            })}
          </div>
        </div>
      )}
    </>
  );
  return (
    <Solve cls={secClass(d.section)} crumbs={crumbs} rail={rail} open={tools} setOpen={setTools}>
      {linkNote && <div className="card pad muted small" role="status" style={{ marginBottom: 10 }}>{linkNote} <button type="button" className="linkbtn" onClick={() => setNoteOff(true)}>Dismiss</button></div>}
      {!list.length ? (
        <div className="empty">{base.length ? "No questions match these filters." : "This topic has no questions for the chosen Source" + (stage ? " at " + stage + " level" : "") + "."} <button className="linkbtn" onClick={clear}>Clear filters</button></div>
      ) : at >= list.length ? (
        <div className="card done">
          <div className="big">{sess.ok} / {sess.n}</div>
          <div className="muted">You reached the end of these {list.length} questions in {d.topic}.</div>
          <div className="actions">
            <button className="btn primary" onClick={() => setI(0)}>Start again</button>
            <a className="btn ghost" href="#/practice">Choose another topic</a>
          </div>
        </div>
      ) : !full ? (
        <Loading />
      ) : (
        <Solver q={full} refInfo={{ kind: "bank", file: topic }} head={"Q " + (at + 1) + " / " + list.length} onResult={addSess}
          chips={[q.subtopic && [q.subtopic, "ac"], q.pattern && [q.pattern, "ac"], q.also && "Also fits " + q.also, q.exam_stage && q.exam_stage + " level",
            where && where[0] && paperLabel(where[0]) + (where.length > 1 ? " · +" + (where.length - 1) + " more" : ""),
            prev && (prev.ok ? ["Solved earlier", "ok"] : ["Missed earlier", "bad"])]}
          onPrev={at > 0 ? () => setI(at - 1) : null}
          onNext={() => { let k = at + 1; while (k < list.length && twinDone(p, list[k])) k++; setI(k); }} />
      )}
    </Solve>
  );
}
