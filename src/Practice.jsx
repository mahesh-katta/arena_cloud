import { useEffect, useMemo, useRef, useState } from "react";
import Solver, { fmt } from "./Question.jsx";
import { EMPTY_F, pass, countBy, countDI, countSingle, lvOf, subOf, levelName, topicFits, indexCounts, indexCountDI, indexCountSingle } from "./facets.js";
import { resetAll, bankIndex, bankTopic, speedTopic, glatData, mockTest, useData, useProgress, srcName, shuffled, dropReview, readPos, writePos } from "./store.js";
import { RANK } from "./priority.js";
import { Toggle, Tabs, Checks, Facet, FacetBox, Switch, Dropdown, GroupMenu, Chip, Solve, short, useView, ViewToggle, secClass, initials, Ring, Meter, pct, Loading, Failed } from "./ui.jsx";
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

const RARE_SHARE = 0.15;
const SORTS = [
  ["pri", "Default", null, false, "Default: topics in the best order for your exam, most-asked first"],
  ["az", "A–Z", null, false, "Topic names in alphabetical order"],
  ["most", "Most questions", null, false, "Topics with the most questions first"],
  ["least", "Least practised", null, false, "Topics you have practised the least first"],
];
const LV_ORDER = ["Prelims", "Mains", ""];
const NOSHOW = { stage: [], src: [], di: "", prog: "" };
/* older saved filters used sets / todo as on-off flags */
const normShow = (h = {}) => ({ stage: [], src: h.src || [], di: h.di ?? (h.sets ? "only" : ""), prog: h.prog ?? (h.todo ? "todo" : "") });
const useSession2 = (key, init) => {
  const [v, set] = useState(() => { try { return JSON.parse(sessionStorage.getItem(key)) ?? init; } catch { return init; } });
  useEffect(() => { try { sessionStorage.setItem(key, JSON.stringify(v)); } catch {} }, [v]);
  return [v, set];
};

export function PracticeHome() {
  const p = useProgress();
  const stats = useTopicStats();
  const [ix, err] = useData(bankIndex, []);
  const [sec, setSec] = useSession2("ap-sec3", "all");   /* "all" or a section name */
  const [sort, setSort] = useSession2("ap-sort2", "pri");
  const [showRaw, setShow] = useSession2("ap-show2", NOSHOW);
  const show = normShow(showRaw);
  const [q, setQ] = useState("");
  const [advPick, setAdvPick] = useSession2("ap-adv", "");   /* "" = automatic, "1" open, "0" closed */
  const [sure, setSure] = useState(false);
  /* filters are dropdowns in one bar above the list */   /* always shown beside the list on wide screens; on narrow ones a Filters button shows / hides them */
  const [view, setView] = useView("ap-view-practice", "list");
  const pos = useMemo(readPos, []);
  if (err) return <Failed what="the question bank" err={err} />;
  if (!ix) return <Loading />;
  const all = ix.sections.flatMap((x) => x.topics.map((t) => ({ ...t, sec: x.name })));
  const one = ix.sections.find((x) => x.name === sec);                 // undefined = all sections
  const s = { name: one ? one.name : "All sections", topics: one ? all.filter((t) => t.sec === one.name) : all };
  const byId = Object.fromEntries(all.map((t) => [t.id, t]));
  const weak = all.filter((t) => stats[t.id]?.done >= 5 && stats[t.id].ok / stats[t.id].done < 0.6)
    .sort((a, b) => stats[a.id].ok / stats[a.id].done - stats[b.id].ok / stats[b.id].done).slice(0, 4);
  const answers = Object.values(p.answers);
  const right = answers.filter((a) => a.ok).length;
  const secTotal = s.topics.reduce((a, t) => a + t.n, 0);
  const secDone = s.topics.reduce((a, t) => a + (stats[t.id]?.done || 0), 0);

  /* level and source must both hold for the SAME questions: use the cross-tab (xs) when the index has it */
  const F = { stage: show.stage, src: show.src, di: show.di };
  const fits = (t) => topicFits(t, F);
  const ql = q.trim().toLowerCase();
  let topics = s.topics.filter((t) => (!ql || t.topic.toLowerCase().includes(ql) || Object.keys(t.subtopics || {}).some((x) => x && x.toLowerCase().includes(ql)))
    && fits(t)
    && (!show.prog || (show.prog === "todo" ? !stats[t.id] : !!stats[t.id])));
  const nShow = show.stage.length + show.src.length + (show.di ? 1 : 0) + (show.prog ? 1 : 0);
  /* option counts = questions you would get, with the other filters kept; 0 = disabled */
  const lvCount = indexCounts(s.topics, F, "stage"), srCount = indexCounts(s.topics, F, "src");
  const lvAll = indexCounts(s.topics, EMPTY_F, "stage"), srAll = indexCounts(s.topics, EMPTY_F, "src");
  const levelOpts = Object.keys(lvAll).sort((a, b) => LV_ORDER.indexOf(a) - LV_ORDER.indexOf(b)).map((k) => [k, levelName(k), lvCount[k] || 0]);
  const srcOpts = Object.keys(srAll).sort((a, b) => srAll[b] - srAll[a]).map((k) => [k, srcName(k), srCount[k] || 0]);
  const diCount = indexCountDI(s.topics, F), singleCount = indexCountSingle(s.topics, F);
  const clearAll = () => { setQ(""); setShow(NOSHOW); };
  if (sort === "pri") topics = [...topics].sort((a, b) => (RANK[a.id] || 999) - (RANK[b.id] || 999) || a.topic.localeCompare(b.topic));
  if (sort === "most") topics = [...topics].sort((a, b) => b.n - a.n);
  if (sort === "least") topics = [...topics].sort((a, b) => (stats[a.id]?.done || 0) / a.n - (stats[b.id]?.done || 0) / b.n);
  /* topics outside the priority list are "advanced types": collapsed under the list, opened by search or a Mains profile */
  /* with a Type chosen, a topic where that type is under 15% of its questions (Simplification has 3 set questions of 794) is "rare" there and goes to the same collapsed section */
  const rare = (t) => { if (!show.di) return false; const c = typeCounts(t, show.di, show.src); return c.all > 0 && (show.di === "only" ? c.di : c.single) / c.all < RARE_SHARE; };
  const core = topics.filter((t) => RANK[t.id] && !rare(t)), adv = topics.filter((t) => !RANK[t.id] || rare(t));
  const seenAt = (t) => Math.max(pos[t.id]?.at || 0, stats[t.id]?.last || 0);
  const recentTopics = all.filter(seenAt).sort((a, b) => seenAt(b) - seenAt(a)).slice(0, 8);
  const advOpen = advPick === "1" || (advPick === "" && (!!ql || (p.profile && p.profile.stage === "Mains")));

  return (
    <div className="page pract cfit">
      <div className="chead2">
        <h1>Topic Practice</h1>
        <input className="search csearch" type="search" aria-label="Search topics" placeholder="Search topics or subtopics" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="ccards pcards" role="tablist" aria-label="Sections">
        {[["all", "All topics", "all", all.length, all.reduce((a, t) => a + t.n, 0)], ...ix.sections.map((x) => [x.name, x.name.replace("Quantitative Aptitude", "Quant").replace("Reasoning Ability", "Reasoning"), /quant/i.test(x.name) ? "quant" : "reasoning", x.topics.length, x.topics.reduce((a, t) => a + t.n, 0)]), ["english", "English", "english", 0, 0]].map(([val, name, cls, nt, nq]) => (
          <button key={val} type="button" role="tab" aria-selected={sec === val} disabled={val === "english"}
            className={"ccard c-" + (cls === "all" ? "pall" : cls) + (sec === val ? " on" : "") + (val === "english" ? " soon" : "")} onClick={() => setSec(val)}>
            <span className="cbot"><b>{name}</b><em>{val === "english" ? "Coming soon" : nq.toLocaleString() + " questions"}</em></span>
            <span className="ctop"><span className="cico">{CARD_ICON[cls]}</span><span className="cpill">{val === "english" ? "Soon" : nt + " topics"}</span></span>
          </button>
        ))}
      </div>

      <section className="shelf pwrap">
        <div className="pfix">
        <div className="filterbar">
          {srcOpts.length > 1 && <Dropdown label="Source" multi value={show.src} onChange={(v) => setShow({ ...show, src: v })} opts={srcOpts} />}
          <GroupMenu label="Sort" hint={"Sort: " + (SORTS.find(([k]) => k === sort) || SORTS[0])[4]} active={!!show.di || !!show.prog} summary={(SORTS.find(([k]) => k === sort) || SORTS[0])[1] + (show.di || show.prog ? " +" + ((show.di ? 1 : 0) + (show.prog ? 1 : 0)) : "")} groups={[
            { title: "Sort by", value: sort, onChange: setSort, opts: SORTS },
            { title: "Type", value: show.di, onChange: (v) => setShow({ ...show, di: v }), opts: [["", "All questions"], ["only", "DI / puzzle sets", diCount, diCount === 0], ["single", "Single questions", singleCount, singleCount === 0]] },
            { title: "Status", value: show.prog, onChange: (v) => setShow({ ...show, prog: v }), opts: [["", "All"], ["todo", "Not attempted"], ["done", "Attempted"]] },
          ]} />
          <ViewToggle view={view} setView={setView} />
        </div>
        <div className="listtop"><span className="muted small resultcount" aria-live="polite">{topics.length} of {s.topics.length} · {pct(right, answers.length)}% accuracy overall</span><span className="grow" />
          {(nShow > 0 || q) && <button type="button" className="btn ghost sm" onClick={clearAll}>Clear filters</button>}
          {sure ? <span className="tgroup"><span className="muted small">Erase all progress and history?</span><button type="button" className="btn danger sm" onClick={() => { resetAll(); setTimeout(() => location.reload(), 900); }}>Yes, reset</button><button type="button" className="btn ghost sm" onClick={() => setSure(false)}>Cancel</button></span>
            : <button type="button" className="btn ghost sm" onClick={() => setSure(true)}>Reset all</button>}
        </div>
        </div>
        <div className="pgsplit">
        <div className="pscroll">
        {weak.length > 0 && (
          <section className="shelf">
            <h2>Weak areas <span className="muted small">below 60% accuracy</span></h2>
            <div className="grid">{weak.map((t) => <TopicCard key={t.id} t={t} sec={t.sec} st={stats[t.id]} pos={pos[t.id]} />)}</div>
          </section>
        )}
        <div className={view === "grid" ? "grid" : "list"}>
          {core.map((t) => <TopicCard key={t.id} t={t} sec={t.sec} st={stats[t.id]} pos={pos[t.id]} rank={sort === "pri" ? RANK[t.id] : 0} mode={show.di} srcs={show.src} />)}
          {!topics.length && <div className="empty">No topic matches these choices. <button className="linkbtn" onClick={clearAll}>Show all topics</button></div>}
        </div>
        {adv.length > 0 && (
          <div className="advbox">
            <button type="button" className="btn ghost advbtn" aria-expanded={advOpen} onClick={() => setAdvPick(advOpen ? "0" : "1")}>
              {advOpen ? "Hide" : "Show"} advanced types <span className="muted">({adv.length})</span>
            </button>
            {advOpen && (
              <>
                <p className="muted small">Rarer in Prelims, mostly for Mains, or topics with only a few questions of the chosen type. Nothing here is removed.</p>
                <div className={view === "grid" ? "grid" : "list"}>
                  {adv.map((t) => <TopicCard key={t.id} t={t} sec={t.sec} st={stats[t.id]} pos={pos[t.id]} rank={0} mode={show.di} srcs={show.src} />)}
                </div>
              </>
            )}
          </div>
        )}
        </div>
      <aside className="precent" aria-label="Recently opened">
        <h2>Recently opened</h2>
        {recentTopics.length === 0 && <p className="muted small">Topics you open will show up here.</p>}
        {recentTopics.map((t) => (
          <div className="rrow" key={t.id}>
            <span className="tile">{glyph(t.topic)}</span>
            <span className="rname">{t.topic}</span>
            <a className="btn primary sm" href={"#/practice/" + t.id}>Start</a>
          </div>
        ))}
      </aside>
        </div>
      </section>
    </div>
  );
}

function typeCounts(t, mode, srcs) {
  const ok = (k) => !srcs.length || srcs.includes(k.slice(k.indexOf("|") + 1));
  const sum = (o) => Object.entries(o || {}).reduce((a, [k, n]) => a + (ok(k) ? n : 0), 0);
  const all = sum(t.xs), di = sum(t.xd);
  return { all, di, single: all - di };
}

function TopicCard({ t, sec, st, pos, rank, mode = "", srcs = [] }) {
  const subs = Object.keys(t.subtopics).filter(Boolean);
  const pre = t.stages?.Prelims || 0, mains = t.stages?.Mains || 0;
  const done = st?.done || 0, ok = st?.ok || 0;
  return (
    <a className={"card tcard " + secClass(sec) + " c-" + (/quant/i.test(sec) ? "quant" : "reasoning")} href={"#/practice/" + t.id}>
      <div className="top">
        <span className="tile">{glyph(t.topic)}</span>
        <div className="grow">
          <div className="name">{rank > 0 && <span className="rank">{rank}</span>}{t.topic}</div>
          <div className="sub">{(() => {
            const c = typeCounts(t, mode, srcs);
            const sets = t.sets ? " · " + t.sets + (t.sets === 1 ? " set" : " sets") : "";
            if (mode === "only") return c.di.toLocaleString() + " questions" + sets;
            if (mode === "single") return c.single.toLocaleString() + " questions";
            return t.n.toLocaleString() + " questions" + sets;
          })()}</div>
        </div>
        {pos && pos.i > 0 && <span className="chip ac">Q {Math.min(pos.i + 1, pos.n || pos.i + 1)}</span>}
      </div>
      <div className="chips">
        {pre > 0 && <span className="chip ac">Prelims {pre}</span>}
        {mains > 0 && <span className="chip ac">Mains {mains}</span>}
        {Object.keys(t.sources || {}).map((k) => <span key={k} className="chip">{srcName(k)}</span>)}
      </div>
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
export const useSession = () => {
  const [s, set] = useState({ n: 0, ok: 0, t: 0 });
  return [s, (ok, t) => set((x) => ({ n: x.n + 1, ok: x.ok + (ok ? 1 : 0), t: x.t + t }))];
};

/* Book problem sets: the Arena CCE chapters come in runs of 4 questions of one type. */
function useBookSets(d) {
  return useMemo(() => {
    const m = new Map();
    for (const q of d?.questions || []) {
      if (!q.variant_id) continue;
      if (!m.has(q.variant_id)) m.set(q.variant_id, { id: q.variant_id, no: q.variant_no, label: q.variant, qs: [] });
      m.get(q.variant_id).qs.push(q);
    }
    return [...m.values()];
  }, [d]);
}

const EMPTY = { sub: [], src: [], stage: [], prog: "", mix: false, set: "", di: "" };
/* saved filters from older versions used todo / di as on-off flags */
const normF = (f = {}) => { const { todo, ...r } = f; return { ...r, stage: [], di: f.di === true ? "only" : f.di || "", prog: f.prog ?? (todo ? "todo" : "") }; };

/* Level / source chosen on the topic list carry into a topic you open for the first time */
function homeFilters() {
  try { const h = JSON.parse(sessionStorage.getItem("ap-show2") || "{}"); const n = normShow(h); return { stage: n.stage, src: n.src, prog: n.prog, di: n.di }; } catch { return {}; }
}

/* One topic. Filters, shuffle order and the current question are remembered per topic. */
export function PracticeRun({ topic, query }) {
  const p = useProgress();
  const [d, err] = useData(() => bankTopic(topic), [topic]);
  const [saved] = useState(() => (query.get("sub") ? null : readPos()[topic]));
  /* filters: what this topic had last time, but a Type / Status picked on the topic list wins (so the list and the topic agree) */
  const [f, setF] = useState(() => {
    if (query.get("sub")) return { ...EMPTY, sub: [query.get("sub")] };
    const home = homeFilters();
    const base = { ...EMPTY, ...home, ...(saved?.f ? normF(saved.f) : {}) };
    if (home.di) base.di = home.di;
    if (home.prog) base.prog = home.prog;
    return base;
  });
  /* start from the top when the list's Type or Status changed the filter this topic was left with */
  const [i, setI] = useState(() => { const h = homeFilters(); const sf = saved?.f ? normF(saved.f) : {}; return saved && !((h.di && h.di !== sf.di) || (h.prog && h.prog !== sf.prog)) ? saved.i || 0 : 0; });
  const [seed] = useState(() => saved?.seed || Date.now() % 100000);
  const [sess, addSess] = useSession();
  const [tools, setTools] = useState(false);
  const sets = useBookSets(d);
  const set = (k) => (v) => { setF((x) => ({ ...x, [k]: v })); setI(0); };
  const pickSet = (id) => { setF((x) => ({ ...x, set: id })); setI(0); setTools(false); };
  const [rtab, setRtab] = useState("filters");
  const [note, setNote] = useState("");
  const carried = useRef(!saved && !query.get("sub") && (f.stage.length > 0 || f.src.length > 0 || f.di));

  /* option counts with the other filters kept (see facets.js); totals = no filters */
  const counts = useMemo(() => {
    const qs = d?.questions || [];
    const inSet = qs.filter((q) => (!f.set || q.variant_id === f.set) && pass(q, f));
    return { sub: countBy(qs, f, "sub"), src: countBy(qs, f, "src"), stage: countBy(qs, f, "stage"), di: countDI(qs, f), single: countSingle(qs, f),
      prog: { todo: inSet.filter((q) => !p.answers[q.id]).length, done: inSet.filter((q) => p.answers[q.id]).length },
      all: { sub: countBy(qs, EMPTY_F, "sub"), src: countBy(qs, EMPTY_F, "src"), stage: countBy(qs, EMPTY_F, "stage"), di: countDI(qs, EMPTY_F) } };
  }, [d, f, p.answers]);
  const list = useMemo(() => {
    if (!d) return [];
    let a = d.questions.filter((q) => (!f.set || q.variant_id === f.set) && pass(q, f));
    if (f.prog === "todo") a = a.filter((q) => !p.answers[q.id]);
    else if (f.prog === "done") a = a.filter((q) => p.answers[q.id]);
    return f.mix ? shuffled(a, seed) : a;
  }, [d, f, seed]);
  useEffect(() => { if (d) writePos(topic, { f, i, seed, n: list.length, at: Date.now() }); }, [d, f, i, list.length]);

  /* Level / source picked on the topic list may not overlap inside this topic (book questions have no level): relax them instead of showing an empty page */
  useEffect(() => {
    if (!d || !carried.current) return;
    carried.current = false;
    const n = (st, sr, di) => d.questions.filter((q) => pass(q, { stage: st, src: sr, sub: [], di })).length;
    if (n(f.stage, f.src, f.di) > 0) return;
    const pick = [[f.stage, f.src, ""], [f.stage, [], f.di], [[], f.src, f.di], [f.stage, [], ""], [[], f.src, ""], [[], [], f.di]].find(([a, b, c]) => n(a, b, c) > 0) || [[], [], ""];
    const want = [f.stage.length && f.stage.map(levelName).join("/"), f.src.length && f.src.map(srcName).join("/"), f.di && (f.di === "single" ? "single questions" : "DI / puzzle set")].filter(Boolean).join(" + ");
    setNote("This topic has no questions matching " + want + ", so " + (pick[0].length || pick[1].length || pick[2] ? "only part of your list filters is applied" : "all questions are shown") + ".");
    setF((x) => ({ ...x, stage: pick[0], src: pick[1], di: pick[2] })); setI(0);
  }, [d]);

  if (err) return <Failed what="this topic" err={err} />;
  if (!d) return <Loading />;
  const active = f.sub.length + f.src.length + f.stage.length + (f.prog ? 1 : 0) + (f.di ? 1 : 0) + (f.mix ? 1 : 0) + (f.set ? 1 : 0);
  const at = Math.min(i, list.length);
  const q = list[at];
  const prev = q && p.answers[q.id];
  const cur = f.set && sets.find((x) => x.id === f.set);
  const nextSet = cur && sets[sets.indexOf(cur) + 1];
  /* every value that exists in the topic, with how many questions it would give now (0 = disabled) */
  const opts = (dim, name = (k) => k) => Object.keys(counts.all[dim]).sort((x, y) => dim === "stage" ? LV_ORDER.indexOf(x) - LV_ORDER.indexOf(y) : (x === "General") - (y === "General") || x.localeCompare(y)).map((k) => [k, name(k), counts[dim][k] || 0]);
  const crumbs = <><a href="#/practice">Topic-wise Practice</a><span>/</span>{d.section}<span>/</span><b>{d.topic}</b>{cur && <><span>/</span><b>Book set {cur.no}</b></>}</>;
  const rail = (
    <>
      <div className="card">
        <div className="railhead"><span className="tile">{glyph(d.topic)}</span><div><h3>{d.topic}</h3><div className="muted small">{d.questions.length.toLocaleString()} questions · {d.section}</div></div></div>
        <Session s={sess} />
      </div>
      <div className="railtabs" role="tablist" aria-label="Tools sections">
        {[["filters", "Filters"], sets.length > 0 && ["sets", "Sets"], list.length > 0 && ["qs", "Questions"]].filter(Boolean).map(([k, t]) => (
          <button key={k} type="button" role="tab" aria-selected={rtab === k} className={rtab === k ? "on" : ""} onClick={() => setRtab(k)}>{t}</button>
        ))}
      </div>
      <div className={"card rtab" + (rtab === "filters" ? " on" : "")}>
        <div className="railhead"><h3 className="grow">Filter questions</h3>{active > 0 && <button className="btn ghost sm" onClick={() => { setF(EMPTY); setI(0); }}>Clear {active}</button>}</div>
        <div className="filters">
          <FacetBox label="Source" value={f.src} onChange={set("src")} opts={opts("src", srcName)} />
          <FacetBox label="Subtopic" value={f.sub} onChange={set("sub")} opts={opts("sub")} />
          {counts.all.di > 0 && <Dropdown label="Type" value={f.di} onChange={set("di")} opts={[["", "All questions"], ["only", "DI / puzzle sets", counts.di], ["single", "Single questions", counts.single]]} />}
          <Dropdown label="Progress" value={f.prog} onChange={set("prog")} opts={[["", "All"], ["todo", "Unattempted", counts.prog.todo], ["done", "Attempted", counts.prog.done]]} />
          <Switch checked={f.mix} onChange={set("mix")}>Shuffle order</Switch>
        </div>
      </div>
      {sets.length > 0 && (
        <div className={"card rtab" + (rtab === "sets" ? " on" : "")}>
          <div className="railhead"><h3 className="grow">Arena CCE book sets</h3><span className="muted small">{sets.length} sets of 4{active > (f.set ? 1 : 0) ? " · filters apply inside a set" : ""}</span></div>
          <div className="booksets">
            {sets.map((x) => (
              <button key={x.id} className={"bookset" + (x.id === f.set ? " on" : "")} aria-pressed={x.id === f.set} onClick={() => pickSet(x.id === f.set ? "" : x.id)} title={x.label}>
                <span className="no">{x.no}</span><span className="grow lbl">{x.label}</span>
                <span className="dots" aria-hidden="true">{x.qs.map((y) => { const a = p.answers[y.id]; return <i key={y.id} className={a ? (a.ok ? "ok" : "bad") : ""} />; })}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {list.length > 0 && (
        <div className={"card rtab" + (rtab === "qs" ? " on" : "")}>
          <div className="railhead"><h3 className="grow">Jump to question</h3><span className="muted small">{list.filter((x) => p.answers[x.id]).length} done</span></div>
          <div className="navgrid">
            {list.map((x, j) => {
              const a = p.answers[x.id];
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
      {note && <div className="card pad muted small" role="status" style={{ marginBottom: 10 }}>{note} <button type="button" className="linkbtn" onClick={() => setNote("")}>Dismiss</button></div>}
      {cur && <div className="setbanner card"><span className="tile">{cur.no}</span><div className="grow"><b>Book set {cur.no} · {cur.qs.length} questions of one type</b><div className="muted small">{cur.label}</div></div><button className="btn ghost sm" onClick={() => pickSet("")}>All questions</button></div>}
      {!list.length ? <div className="empty">No questions match these filters. <button className="linkbtn" onClick={() => { setF(EMPTY); setI(0); }}>Clear filters</button></div>
        : at >= list.length ? (
          <div className="card done">
            <div className="big">{sess.ok} / {sess.n}</div>
            <div className="muted">{cur ? "Book set " + cur.no + " done." : "You reached the end of these " + list.length + " questions in " + d.topic + "."}</div>
            <div className="actions">
              {nextSet && <button className="btn primary" onClick={() => pickSet(nextSet.id)}>Next: book set {nextSet.no}</button>}
              <button className={"btn" + (nextSet ? "" : " primary")} onClick={() => setI(0)}>Start again</button>
              <a className="btn ghost" href="#/practice">Choose another topic</a>
            </div>
          </div>
        ) : (
          <Solver q={q} refInfo={{ kind: "bank", file: topic }} head={"Q " + (at + 1) + " / " + list.length} onResult={addSess}
            chips={[q.subtopic && [q.subtopic, "ac"], q.variant_no && !cur && ["Book set " + q.variant_no, "ac"], q.exam_stage && q.exam_stage + " level", srcName(q.source), prev && (prev.ok ? ["Solved earlier", "ok"] : ["Missed earlier", "bad"])]}
            onPrev={at > 0 ? () => setI(at - 1) : null} onNext={() => setI(at + 1)} nextLabel={cur && at + 1 >= list.length ? "Finish set" : "Next question"} />
        )}
    </Solve>
  );
}

/* Wrong answers from anywhere, until they are answered right. */
async function loadRef(r) {
  if (r.kind === "bank") return (await bankTopic(r.file)).questions.find((q) => q.id === r.id);
  if (r.kind === "speed") return (await speedTopic(r.file)).questions.find((q) => q.id === r.id);
  if (r.kind === "glat") return (await glatData()).questions.find((q) => q.id === r.id);
  if (r.kind === "mock") return (await mockTest(r.group, r.mock)).questions.find((q) => q.id === r.id);
  return null;
}
const FROM = { bank: "Topic practice", speed: "Speed drills", glat: "Booster · GLAT", mock: "Mock test" };
export function Mistakes() {
  const p = useProgress();
  const [list] = useState(() => p.review.slice());
  const [i, setI] = useState(0);
  const [q, setQ] = useState(null);
  const [sess, addSess] = useSession();
  const [tools, setTools] = useState(false);
  const r = list[i];
  useEffect(() => { setQ(null); if (r) loadRef(r).then((x) => (x ? setQ(x) : (dropReview(r.id), setI((n) => n + 1)))); }, [i]);
  const byTopic = useMemo(() => Object.entries(list.reduce((m, x) => ((m[x.topic] = (m[x.topic] || 0) + 1), m), {})).sort((a, b) => b[1] - a[1]), [list]);
  const rail = (
    <>
      <div className="card"><div className="railhead"><h3 className="grow">This round</h3><span className="chip bad">{p.review.length} left</span></div><Session s={sess} /></div>
      {byTopic.length > 0 && (
        <div className="card">
          <h3>Weak topics</h3>
          <div className="bars">{byTopic.slice(0, 8).map(([t, n]) => <div key={t} className="barrow"><span className="grow">{t}</span><b className="mono">{n}</b></div>)}</div>
        </div>
      )}
    </>
  );
  return (
    <Solve crumbs={<><a href="#/practice">Topic-wise Practice</a><span>/</span><b>Revise mistakes</b></>} rail={rail} open={tools} setOpen={setTools}>
      {!list.length ? <div className="empty">No mistakes to revise. Questions you get wrong in practice, speed drills and mock tests collect here until you answer them right.</div>
        : i >= list.length ? <div className="card done"><div className="big">{sess.ok} / {sess.n}</div><div className="muted">Round complete. Questions you got right again have left the list.</div></div>
        : !q ? <div className="card qcard muted">Loading question…</div>
        : <Solver q={q} refInfo={r} head={"Mistake " + (i + 1) + " / " + list.length} onResult={addSess}
            chips={[[q.topic, "ac"], q.subtopic, FROM[r.kind]]} onPrev={i > 0 ? () => setI(i - 1) : null} onNext={() => setI(i + 1)} />}
    </Solve>
  );
}
