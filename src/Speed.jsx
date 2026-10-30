import { useEffect, useMemo, useRef, useState } from "react";
import Solver, { fmt } from "./Question.jsx";
import { speedIndex, speedTopic, useData, useProgress, usePersisted, saveSpeed, readSpos, writeSpos, clearSpos, LEVELS } from "./store.js";
import { BackBtn, Dropdown, Solve, useView, ViewToggle, initials, Meter, Ring, pct, Loading, Failed } from "./ui.jsx";
import { glyph } from "./TopicIcon.jsx";

const ALL_SUB = "All concepts";
const groupsOf = (list) => { const g = []; list.forEach((q, i) => { const v = q.variant_id || q.id; if (g.length && g[g.length - 1].v === v) g[g.length - 1].n++; else g.push({ v, start: i, n: 1 }); }); return g; };
const key = (t, s, l, n) => [t, s, l, n].join("|");
const tone = (r) => (!r ? "" : r.right / r.total >= 0.8 ? " good" : r.right / r.total >= 0.5 ? " mid" : " low");
const runHref = (tid, sub, l, n) => "#/speed/" + tid + "/run?sub=" + encodeURIComponent(sub) + "&lvl=" + l + "&set=" + n;
const countSets = (lv) => Object.values(lv).reduce((a, x) => a + Object.keys(x).length, 0);

/* Two ways to practise: Beginner (key "repeat") = the book's own pattern questions, Perfection (key "variant") = fresh Easy → Moderate drill sets */
const MODES = {
  repeat: { name: "Beginner", title: "Practice · Beginner", levels: ["pattern"], blurb: "The questions that keep coming back from the books, one run per concept." },
  variant: { name: "Perfection", title: "Practice · Perfection", levels: ["easy", "easy_to_moderate", "moderate"], blurb: "Fresh variations on every concept, climbing Easy → Easy–Moderate → Moderate in short 10-question sets. Builds calculation speed and range." },
};
const lvlIn = (mode) => MODES[mode].levels;
const modeSets = (t, mode) => mode === "repeat"
  ? (Object.values(t.subtopics).some((lv) => lv.pattern) ? 1 : 0)
  : Object.values(t.subtopics).reduce((a, lv) => a + lvlIn(mode).reduce((b, l) => b + Object.keys(lv[l] || {}).length, 0), 0);
const unit = (mode, n) => (mode === "repeat" ? (n === 1 ? "concept" : "concepts") : n === 1 ? "set" : "sets");
const modeQs = (t, mode) => Object.values(t.subtopics).reduce((a, lv) => a + lvlIn(mode).reduce((b, l) => b + Object.values(lv[l] || {}).reduce((c, n) => c + n, 0), 0), 0);
const repeatVariants = (t) => Math.round(modeQs(t, "repeat") / 4);
const modeTotal = (ix, mode) => ix.topics.reduce((a, t) => a + modeSets(t, mode), 0);
const modeDone = (p, t, mode) => {
  const out = [];
  for (const [k, r] of Object.entries(p.speed)) {
    const [tid, sub, l, n] = k.split("|");
    if (tid !== t.id || !lvlIn(mode).includes(l)) continue;
    if (mode === "repeat" && !(sub === ALL_SUB && n === "all")) continue;
    out.push([k, r]);
  }
  return out;
};

/* progress bar: the fill is how much of the chapter is done, the colour is how well it went (green 80%+, amber 50-79%, red under 50%) */
const Pbar = ({ frac, band }) => <div className={"meter pbar" + (band ? " band-" + band : "")} title={Math.round(100 * frac) + "% done"}><i style={{ width: Math.min(100, Math.max(frac > 0 ? 3 : 0, 100 * frac)) + "%" }} /></div>;

/* where a chapter stands in one column: new / prog (started, not finished) / done, plus its accuracy and a colour band */
const ratio = (rs) => { const r = rs.reduce((a, [, x]) => a + x.right, 0), t = rs.reduce((a, [, x]) => a + x.total, 0); return t ? r / t : null; };
const bandOf = (a) => (a === null ? "" : a >= 0.8 ? "good" : a >= 0.5 ? "mid" : "low");
function stateOf(p, t, mode, live) {
  const mine = modeDone(p, t, mode).filter(([, x]) => x.total > 0), acc = ratio(mine);
  if (!mine.length) return { key: live ? "prog" : "new", acc, band: bandOf(acc) };
  const full = mode === "repeat" ? true : mine.length >= modeSets(t, mode);
  return { key: full && !live ? "done" : "prog", acc, band: bandOf(acc) };
}
/* ways to order a pane's chapters; add a row here and a case in sortBy to offer another */
const SORTS = [["default", "Default"], ["recent", "Recent"], ["questions", "Most questions"], ["name", "A to Z"], ["weak", "Needs work first"]];
const FILTERS = [["all", "All", "Every chapter"], ["prog", "In progress", "Started, not finished"], ["new", "Not started", "Nothing done yet"], ["weak", "Needs work", "Accuracy under 50%"]];
const passes = (f, st) => f === "all" || (f === "weak" ? st.acc !== null && st.acc < 0.5 : st.key === f);

export function SpeedHome() {
  const p = useProgress();
  const [ix, err] = useData(speedIndex, []);
  const [view, setView] = useView("ap-view-speed", "list");
  const [q, setQ] = useState("");
  const [flt, setFlt] = useState("all");
  const [sort, setSort] = usePersisted("ap-speed-sort", { repeat: "default", variant: "default" });
  if (err) return <Failed what="the speed drills" err={err} />;
  if (!ix) return <Loading />;
  const ql = q.trim().toLowerCase();
  const match = (t) => !ql || t.topic.toLowerCase().includes(ql) || Object.keys(t.subtopics).some((x) => x.toLowerCase().includes(ql));
  const allDone = Object.values(p.speed);
  const spos = readSpos();
  const stateFor = (t, mode) => stateOf(p, t, mode, !!(spos[t.id] && lvlIn(mode).includes(spos[t.id].lvl)));
  const count = (f) => Object.keys(MODES).reduce((a, mode) => a + ix.topics.filter((t) => modeSets(t, mode) > 0 && passes(f, stateFor(t, mode))).length, 0);
  return (
    <div className="page pract speedx cfit">
      <div className="bp-top chead3">
        <h1>Speed Drills</h1>
        <div className="filterbar hsearch">
          <input className="search csearch" aria-label="Search chapters" placeholder="Search chapters or concepts" value={q} onChange={(e) => setQ(e.target.value)} />
          <ViewToggle view={view} setView={setView} />
        </div>
      </div>
      <section className="shelf pwrap">
        <div className="pfix">
          <div className="listtop">
            <div className="fchips" role="tablist" aria-label="Filter chapters">
              {FILTERS.map(([k, lab, tip]) => <button key={k} type="button" role="tab" aria-selected={flt === k} title={tip} className={"lvchip" + (flt === k ? " on" : "")} onClick={() => setFlt(k)}>{lab}<em>{count(k)}</em></button>)}
            </div>
            <span className="muted small resultcount">{allDone.length}/{(modeTotal(ix, "repeat") + modeTotal(ix, "variant")).toLocaleString()} sets completed · {pct(allDone.reduce((a, r) => a + r.right, 0), allDone.reduce((a, r) => a + r.total, 0))}% accuracy</span>
          </div>
        </div>
        <div className="pgsplit halves">
          {Object.entries(MODES).map(([mode, M]) => {
        const topics = ix.topics.filter((t) => modeSets(t, mode) > 0);
        /* last practised (newest first), questions in the pane, name, or accuracy (lowest first, untried last) */
        const lastAt = (t) => Math.max(0, ...modeDone(p, t, mode).map(([, r]) => r.at || 0), spos[t.id] && lvlIn(mode).includes(spos[t.id].lvl) ? spos[t.id].at || 0 : 0);
        const sortBy = { default: null, recent: (a, b) => lastAt(b) - lastAt(a), questions: (a, b) => modeQs(b, mode) - modeQs(a, mode), name: (a, b) => a.topic.localeCompare(b.topic),
          weak: (a, b) => (stateFor(a, mode).acc ?? 2) - (stateFor(b, mode).acc ?? 2) }[sort[mode]];
        const shown = topics.filter(match).filter((t) => passes(flt, stateFor(t, mode))).sort(sortBy || (() => 0));
        const done = topics.flatMap((t) => modeDone(p, t, mode)).length;
            return (
              <div className={"pane " + (mode === "repeat" ? "sp-b" : "c-di")} key={mode}>
                <div className="panehead ph2">
                  <span className="pico" aria-hidden="true">{mode === "repeat"
                    ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 6.8C10.4 5.5 8.2 4.8 5.6 4.8a1.1 1.1 0 0 0-1.1 1.1v10.9a1.1 1.1 0 0 0 1.1 1.1c2.6 0 4.8.7 6.4 2zM12 6.8c1.6-1.3 3.8-2 6.4-2a1.1 1.1 0 0 1 1.1 1.1v10.9a1.1 1.1 0 0 1-1.1 1.1c-2.6 0-4.8.7-6.4 2z" /></svg>
                    : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2.5 5 13.5h6l-1 8 8-11h-6z" /></svg>}</span>
                  <div className="ph-l">
                    <h2>{M.name}</h2>
                    <span className="pdesc">{mode === "repeat" ? "Recurring book questions" : "Fresh sets, Easy to Moderate"}</span>
                    <span className="pmeta"><small>{mode === "repeat" ? done + "/" + topics.length + " chapters started" : done + "/" + modeTotal(ix, mode).toLocaleString() + " sets · " + shown.length + " chapters"}</small></span>
                  </div>
                  <Dropdown hover label="Sort" prefix="Sort" value={sort[mode]} onChange={(v) => setSort({ ...sort, [mode]: v })} opts={SORTS} />
                </div>
                <div className="pscroll">
                  <div className={(view === "grid" ? "grid" : "list") + " s-q"}>
                    {shown.map((t) => {
                      const mine = modeDone(p, t, mode), n = modeSets(t, mode);
                      const good = mine.filter(([, r]) => r.right / r.total >= 0.8).length;
                      const qs = modeQs(t, mode);
                      const rec = mode === "repeat" ? mine[0] && mine[0][1] : null;
                      const st = stateFor(t, mode);
                      const dotTip = st.key === "new" ? "Not started" : (st.acc === null ? "In progress" : Math.round(100 * st.acc) + "% accuracy" + (st.key === "prog" ? " · in progress" : ""));
                      const href = mode === "repeat" ? "#/speed/" + t.id + "/run?sub=" + encodeURIComponent(ALL_SUB) + "&lvl=pattern&set=all" : "#/speed/" + t.id + "?mode=" + mode;
                      return (
                        <a key={t.id} className={"card tcard " + (mode === "repeat" ? "sp-b" : "c-di")} href={href}>
                          <div className="top">
                            <span className="tile" title={dotTip}>{glyph(t.topic)}</span>
                            <div className="grow"><div className="name">{t.topic}</div><div className="sub">{mode === "repeat" ? (t.plain ? "" : repeatVariants(t) + " variants · ") + qs.toLocaleString() + " questions" : qs.toLocaleString() + " questions · " + n + " " + unit(mode, n)}</div></div>
                          </div>
                          <div className="foot">{mode === "repeat"
                            ? <><Pbar frac={qs ? (rec ? rec.total : 0) / qs : 0} band={st.band} /><span className="stat-mini">{rec ? rec.total : 0}/{qs}</span></>
                            : <><Pbar frac={n ? mine.filter(([, x]) => x.total > 0).length / n : 0} band={st.band} /><span className="stat-mini">{mine.length}/{n}</span></>}</div>
                          <span className={"btn primary sm go" + (st.key === "prog" ? " always" : "")}>{st.key === "prog" ? "Continue" : mode === "repeat" ? "Start" : "Practice"}</span>
                        </a>
                      );
                    })}
                    {!shown.length && <div className="empty">{q ? "No chapter matches “" + q + "”." : "No chapters in this filter yet."}</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export function SpeedTopic({ tid, query }) {
  const p = useProgress();
  const [ix] = useData(speedIndex, []);
  if (!ix) return <Loading />;
  const t = ix.topics.find((x) => x.id === tid);
  if (!t) return <div className="page"><div className="empty">This chapter is not in the drills.</div></div>;
  const qm = query && query.get("mode");
  const mode = MODES[qm] ? qm : modeSets(t, "variant") > 0 ? "variant" : "repeat";
  const levels = mode ? lvlIn(mode) : ix.levels;
  const subs = Object.entries(t.subtopics).filter(([, lv]) => levels.some((l) => lv[l]));
  return (
    <div className="page s-q speedx">
      <div className="crumbs"><BackBtn /><a href="#/speed">Speed Drills</a><span>/</span><b>{MODES[mode].title}</b><span>/</span><b>{t.topic}</b></div>
      <div className="head">
        <div><h1>{t.topic}</h1><div className="sub">{subs.length} {subs.length === 1 ? "concept" : "concepts"}. {mode === "repeat" ? "Each concept runs all of its book questions in one go." : "Each set has 10 questions."} Colour shows your last score.</div></div>
        <div className="legendrow"><span className="setbtn good">80%+</span><span className="setbtn mid">50–79%</span><span className="setbtn low">below 50%</span></div>
      </div>
      {mode === "variant" ? (
        <div className="list s-q vlist">
          {subs.map(([sub, lv]) => {
            const sets = levels.reduce((a, l) => a + Object.keys(lv[l] || {}).length, 0);
            const qs = levels.reduce((a, l) => a + Object.values(lv[l] || {}).reduce((c, n) => c + n, 0), 0);
            const mine = Object.entries(p.speed).filter(([k]) => k.startsWith(tid + "|" + sub + "|") && levels.includes(k.split("|")[2]));
            const good = mine.filter(([, r]) => r.right / r.total >= 0.8).length;
            const first = levels.find((l) => lv[l]);
            const n1 = Object.keys(lv[first]).sort((x, y) => x - y)[0];
            return (
              <a key={sub} className="card tcard" href={runHref(tid, sub, first, n1)}>
                <div className="top">
                  <span className="tile">{initials(sub)}</span>
                  <div className="grow"><div className="name">{sub}</div><div className="sub">{qs.toLocaleString()} questions · {sets} {sets === 1 ? "set" : "sets"}</div></div>
                </div>
                <div className="foot"><Meter ok={good} bad={mine.length - good} total={sets} /><span className="stat-mini">{mine.length}/{sets}</span></div>
                <span className="btn primary sm go">Practice</span>
              </a>
            );
          })}
        </div>
      ) : (
      <div className="concepts">
          {subs.map(([sub, lv]) => {
            const sets = levels.reduce((a, l) => a + Object.keys(lv[l] || {}).length, 0);
            const done = Object.keys(p.speed).filter((k) => k.startsWith(tid + "|" + sub + "|") && levels.includes(k.split("|")[2])).length;
            return (
              <div key={sub} className="card concept">
                <div className="chead"><h3 className="grow">{sub}</h3>{mode === "repeat" ? <span className="stat-mini">{Object.values(lv.pattern || {}).reduce((a, n) => a + n, 0)} questions</span> : <span className="stat-mini">{done}/{sets} sets</span>}</div>
                {mode === "repeat" ? (() => {
                  const r = p.speed[key(tid, sub, "pattern", "all")];
                  return <div className="lvrow"><a className={"setbtn runall" + tone(r)} href={runHref(tid, sub, "pattern", "all")}>{r ? r.right + "/" + r.total + " · Practice again" : "Start"}</a></div>;
                })() : levels.filter((l) => lv[l]).map((l) => (
                  <div key={l} className="lvrow">
                    <span className={"lvname lv-" + l}><i />{LEVELS[l]}</span>
                    <div className="sets">
                      {Object.keys(lv[l]).sort((a, b) => a - b).map((n) => {
                        const r = p.speed[key(tid, sub, l, n)];
                        return <a key={n} className={"setbtn" + tone(r)} title={r ? r.right + "/" + r.total + " in " + fmt(r.t) : lv[l][n] + " questions"} href={runHref(tid, sub, l, n)}>{r ? r.right + "/" + r.total : "Set " + n}</a>;
                      })}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function SpeedRun({ tid, query }) {
  const p = useProgress();
  const lvl = query.get("lvl"), setNo = query.get("set");
  const sub = query.get("sub") || (lvl === "pattern" ? ALL_SUB : null);
  const [d, err] = useData(() => speedTopic(tid), [tid]);
  const [ix] = useData(speedIndex, []);
  const saved = useMemo(() => { const v = readSpos()[tid]; return v && v.sub === sub && v.lvl === lvl && v.set === setNo ? v : null; }, []);
  const [i, setI] = useState(saved ? saved.i : 0);
  const res = useRef(saved ? { right: saved.right, total: saved.total, secs: saved.secs } : { right: 0, total: 0, secs: 0 });
  const [live, setLive] = useState({ ...res.current });
  /* remember where you are, so Home can offer Resume even when the set is not finished */
  const mark = (at, r) => writeSpos(tid, { sub, lvl, set: setNo, i: at, right: r.right, total: r.total, secs: r.secs, n: list.length, at: Date.now() });
  const [end, setEnd] = useState(null);
  const [tools, setTools] = useState(false);
  const isAll = setNo === "all";
  const list = useMemo(() => (d ? d.questions.filter((q) => (sub === ALL_SUB || q.subtopic === sub) && q.difficulty === lvl && (isAll || String(q.set_no) === setNo)).sort((a, b) => sub === ALL_SUB ? 0 : (a.set_no || 0) - (b.set_no || 0) || (a.q_no || 0) - (b.q_no || 0)) : []), [d, sub, lvl, setNo]);
  const [hit, setHit] = useState(() => new Set());
  const [lf, setLf] = useState("all");
  const groups = useMemo(() => groupsOf(list), [list]);
  if (err) return <Failed what="this drill" err={err} />;
  if (!d || !ix) return <Loading />;
  const lv = ix.topics.find((x) => x.id === tid)?.subtopics[sub] || {};
  const gi = groups.findIndex((g) => i >= g.start && i < g.start + g.n);
  const jump = (at) => { setI(at); mark(at, res.current); };
  const order = ix.levels.filter((l) => lf === "all" || l === lf || l === lvl).flatMap((l) => Object.keys(lv[l] || {}).sort((a, b) => a - b).map((n) => [l, n]));
  const next = isAll ? null : order[order.findIndex(([l, n]) => l === lvl && n === setNo) + 1];
  const backHref = "#/speed/" + tid + "?mode=" + (lvl === "pattern" ? "repeat" : "variant");
  const restart = () => { clearSpos(tid); setI(0); setEnd(null); res.current = { right: 0, total: 0, secs: 0 }; setLive(res.current); };
  const finish = () => { const r = res.current; clearSpos(tid); saveSpeed(key(tid, sub, lvl, setNo), r.right, r.total, r.secs); setEnd({ ...r }); };
  return (
    <Solve cls="s-q speedx" open={tools} setOpen={setTools}
      crumbs={<><a href="#/speed">Speed Drills</a><span>/</span><a href={backHref}>{d.topic}</a><span>/</span><b>{sub}</b></>}
      rail={<>
        <div className="card">
          <div className="railhead"><span className="tile">{glyph(d.topic)}</span><div><h3>{sub}</h3><div className="muted small">{isAll ? "All " + list.length + " questions" : LEVELS[lvl] + " · Set " + setNo + " of " + Object.keys(lv[lvl] || {}).length}</div></div></div>
          <div className="kv">
            <div><b>{live.right}<small className="muted">/{live.total}</small></b><span>Correct</span></div>
            <div><b>{live.total ? Math.round(live.secs / live.total) + "s" : "–"}</b><span>Per question</span></div>
          </div>
        </div>
        {isAll && groups.length > 1 && <div className="card jumpcard">
          <h3>Jump to variant <span className="muted small">{gi + 1} of {groups.length}</span></h3>
          <div className="jumpgrid">
            {groups.map((g, n) => {
              const all = Array.from({ length: g.n }, (_, k) => g.start + k);
              const state = all.every((x) => hit.has(x)) ? " done" : all.some((x) => hit.has(x)) ? " part" : "";
              return <button key={g.v} type="button" className={"jbtn" + state + (n === gi ? " now" : "")} aria-current={n === gi ? "true" : undefined} title={"Variant " + (n + 1) + " · " + g.n + " questions"} onClick={() => jump(g.start)}>{n + 1}</button>;
            })}
          </div>
        </div>}
        {!isAll && <div className="card">
          <h3>Jump to set</h3>
          <div className="lvfilter" role="tablist" aria-label="Filter by level">
            {["all", ...ix.levels.filter((l) => lv[l] && l !== "pattern")].map((l) => (
              <button key={l} type="button" role="tab" aria-selected={lf === l} className={"lvchip" + (lf === l ? " on" : "")} onClick={() => setLf(l)}>{l === "all" ? "All" : LEVELS[l]}</button>
            ))}
          </div>
          {ix.levels.filter((l) => lv[l] && l !== "pattern" && (lf === "all" || l === lf)).map((l) => (
            <div key={l} className="lvrow">
              <span className={"lvname lv-" + l}><i />{LEVELS[l]}</span>
              <div className="sets">
                {Object.keys(lv[l]).sort((a, b) => a - b).map((n) => (
                  <a key={n} href={runHref(tid, sub, l, n)} aria-current={l === lvl && n === setNo ? "true" : undefined} className={"setbtn sm" + tone(p.speed[key(tid, sub, l, n)]) + (l === lvl && n === setNo ? " now" : "")}>{n}</a>
                ))}
              </div>
            </div>
          ))}
        </div>}
      </>}>
        {end ? (
          <div className="card done">
            <div className="big">{end.right} / {end.total}</div>
            <div className="muted">{fmt(end.secs)} total · about {end.total ? Math.round(end.secs / end.total) : 0}s per question{list.length > end.total ? " · " + (list.length - end.total) + " skipped" : ""}</div>
            <div className="actions">
              {next && <a className="btn primary" href={runHref(tid, sub, next[0], next[1])}>Next: {LEVELS[next[0]]} set {next[1]}</a>}
              <button className="btn" onClick={restart}>{isAll ? "Practice again" : "Retry this set"}</button>
              <a className="btn ghost" href={backHref}>All {d.topic} {isAll ? "concepts" : "sets"}</a>
            </div>
          </div>
        ) : !list.length ? <div className="empty">This set has no questions.</div> : (
          <Solver q={list[i]} refInfo={{ kind: "speed", file: tid }} head={"Q " + (i + 1) + " / " + list.length}
            chips={[[LEVELS[lvl], "ac"], isAll && groups[gi] ? "Variant " + (gi + 1) + " · Q " + (i - groups[gi].start + 1) + "/" + groups[gi].n : isAll ? "All questions" : "Set " + setNo]}
            onResult={(ok, s) => { const r = res.current; r.total++; r.right += ok ? 1 : 0; r.secs += s; setLive({ ...r }); setHit((h) => new Set(h).add(i)); mark(Math.min(i + 1, list.length - 1), r); }}
            onPrev={i > 0 ? () => { setI(i - 1); mark(i - 1, res.current); } : null}
            onNext={() => { if (i + 1 >= list.length) finish(); else { setI(i + 1); mark(i + 1, res.current); } }} nextLabel={i + 1 >= list.length ? "See score" : "Next question"} />
        )}
    </Solve>
  );
}
