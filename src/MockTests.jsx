import { useState } from "react";
import { mockIndex, useData, useProgress } from "./store.js";
import { fits, profileLabel } from "./exams.js";
import { Loading, Failed } from "./ui.jsx";
import { useScope } from "./Profile.jsx";
import { DayPlanner, Gauge } from "./Booster.jsx";

const round = (x) => Math.round(x * 100) / 100;
const MON = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
const MNAME = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n) => String(n).padStart(2, "0");
const dayLabel = (date) => +date.slice(8) + " " + MNAME[+date.slice(5, 7) - 1];

/* the memory-based papers carry their date and slot in the name ("Held on 20th August 2022 Slot 2"); older ones have only a day and a month.
   A paper with no usable year stays undated. */
function paperOf(t) {
  const slot = +((t.name.match(/Slot\s*-?\s*(\d+)/i) || [])[1]) || null;
  const held = t.name.match(/Held on\s*(\d+)\w*\s+([A-Za-z]+)(?:\s+(20\d\d))?/i);
  const year = t.year || (held && held[3]) || null;
  let date = t.date || null;
  const mo = held ? MON[held[2].slice(0, 3).toLowerCase()] : undefined;
  if (!date && year && held && mo !== undefined) date = year + "-" + pad(mo + 1) + "-" + pad(+held[1]);
  return { ...t, slot, date, year: date ? +date.slice(0, 4) : null, held: held ? +held[1] + " " + held[2].slice(0, 3) : null };
}
const hasRun = (id) => { try { return !!localStorage.getItem("ap-run-" + id); } catch { return false; } };

/* Mock Tests: the open profile's exam on top, then two tabs - the mock series (the same day planner as the Booster) and Previous years (a calendar by date and session). */
export function MocksHome() {
  const p = useProgress();
  const [ix, err] = useData(mockIndex, []);
  const [all, setAll] = useScope();
  const [tab, setTab] = useState(() => { try { return sessionStorage.getItem("ap-mocks-tab") || "mocks"; } catch { return "mocks"; } });
  if (err) return <Failed what="the mock tests" err={err} />;
  if (!ix) return <Loading />;
  const pick = (t) => { setTab(t); try { sessionStorage.setItem("ap-mocks-tab", t); } catch {} };
  /* only this profile's own series and papers, unless "Browse all exams" is on */
  const groupsOf = (kind) => ((ix.collections.find((c) => c.kind === kind) || { groups: [] }).groups)
    .map((g) => ({ ...g, tests: all ? g.tests : g.tests.filter((t) => fits(p.profile, t)) })).filter((g) => g.tests.length);
  const mockDays = new Set((groupsOf("sectional")[0] || { tests: [] }).tests.map((t) => t.day)).size;
  const papersN = (groupsOf("pyq")[0] || { tests: [] }).tests.length;
  const label = all ? "All exams" : profileLabel(p.profile) || "Mock tests";
  const tabs = (
    <div className="mtabs">
      <div className="bfl" role="tablist" aria-label="Mock tests">
        <button type="button" role="tab" aria-selected={tab === "mocks"} className={tab === "mocks" ? "on" : ""} onClick={() => pick("mocks")}>Mocks<em>{mockDays}</em></button>
        <button type="button" role="tab" aria-selected={tab === "years"} className={tab === "years" ? "on" : ""} onClick={() => pick("years")}>Previous years<em>{papersN}</em></button>
      </div>
      <button type="button" className="linkbtn" onClick={() => setAll(!all)}>{all ? "Back to " + profileLabel(p.profile) : "Browse all exams"}</button>
    </div>
  );
  const empty = (what) => (
    <div className="card pad empty">There are no {what} for {all ? "any exam" : profileLabel(p.profile)} yet.
      {!all && <div className="actions" style={{ justifyContent: "center", marginTop: 14 }}><button className="btn primary" onClick={() => setAll(true)}>Browse all exams</button></div>}
    </div>
  );
  return tab === "mocks"
    ? <DayPlanner key="mocks" mine={groupsOf("sectional")} title={label} kind="Mock tests" scopeWord="mock exams" right={tabs} together={(n, sum) => (n === 2 ? 45 : sum)} empty={<div className="bstage"><div className="bp-top"><div><h1>{label}</h1></div>{tabs}</div>{empty("mock tests")}</div>} />
    : <PreviousYears key="years" groups={groupsOf("pyq")} title={label} right={tabs} empty={<div className="bstage"><div className="bp-top"><div><h1>{label}</h1></div>{tabs}</div>{empty("previous-years papers")}</div>} />;
}

/* Previous years: the year as the heading and one block per paper (date and slot) inside it. Hover a block to preview its date's sessions, click to pin it,
   pick a session on the ticket and start. The arrows jump from year to year. Papers without a date wait in an "Undated" strip. */
function PreviousYears({ groups, title, right, empty }) {
  const p = useProgress();
  const [gi, setGi] = useState(0);
  const [sel, setSel] = useState(null);
  const [hov, setHov] = useState(null);
  const [yr, setYr] = useState(null);
  const [pickId, setPickId] = useState({});
  const [sure, setSure] = useState(false);
  const [openRec, setOpenRec] = useState(null);
  const [sureRec, setSureRec] = useState(null);
  const [, redraw] = useState(0);
  const g = groups[Math.min(gi, groups.length - 1)];
  if (!g) return <div className="page boosterpg">{empty}</div>;

  const papers = g.tests.map(paperOf).sort((a, b) => (a.slot || 0) - (b.slot || 0));
  const dated = papers.filter((x) => x.date), undated = papers.filter((x) => !x.date);
  const byDate = new Map();
  for (const x of dated) { if (!byDate.has(x.date)) byDate.set(x.date, []); byDate.get(x.date).push(x); }
  const years = [...new Set(dated.map((x) => x.year))].sort((a, b) => a - b);
  const datesOf = (y) => [...byDate.keys()].filter((d) => +d.slice(0, 4) === y).sort();
  const latest = dated.length ? [...byDate.keys()].sort().pop() : "undated";
  const base = sel || latest;
  const baseYear = base === "undated" ? years[years.length - 1] : +base.slice(0, 4);
  const year = years.includes(yr) ? yr : baseYear;
  const key = hov || base, pinned = key === base;
  const list = key === "undated" ? undated : byDate.get(key) || [];
  const done = (x) => !!p.mocks[x.id], live = (x) => !done(x) && hasRun(x.id);
  const stateOf = (arr) => (arr.every(done) ? "done" : arr.some((x) => done(x) || live(x)) ? "part" : "new");
  const chosen = list.find((x) => x.id === pickId[key]) || list.find((x) => !done(x)) || list[0];
  /* the ticket lists the sections inside the chosen paper (Reasoning, Quant, English...); a paper with fewer than the usual three keeps them frozen. The slot is picked on the calendar. */
  const rk = (name) => (/reason/i.test(name) ? 0 : /quant|numer|data analysis/i.test(name) ? 1 : /english/i.test(name) ? 2 : /general|aware|financ|econom|insurance/i.test(name) ? 3 : /comput/i.test(name) ? 4 : 5);
  const GN = ["Reasoning Ability", "Quantitative Aptitude", "English Language"];
  const secRows = chosen ? (() => { const base = (chosen.parts || []).map(([name, n]) => ({ name, n, k: rk(name) })), have = new Set(base.map((x) => x.k)), out = [...base]; if (base.length < 3) for (const k of [0, 1, 2]) if (!have.has(k)) out.push({ ghost: true, k }); return out.sort((a, b) => a.k - b.k); })() : [];
  const attempted = papers.filter(done);
  /* Recent = papers you have started or finished, the latest first */
  const runAt = (x) => { try { return (JSON.parse(localStorage.getItem("ap-run-" + x.id) || "null") || {}).at || 0; } catch { return 0; } };
  const actAt = (x) => Math.max((p.mocks[x.id] || {}).at || 0, live(x) ? runAt(x) : 0);
  const recent = papers.filter((x) => done(x) || live(x)).sort((a, b2) => actAt(b2) - actAt(a)).slice(0, 14);
  const dayName = (date) => new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" });
  const resetPaper = (x) => { try { localStorage.removeItem("ap-run-" + x.id); } catch {} setSureRec(null); setOpenRec(null); redraw((n) => n + 1); };
  const selectPaper = (x) => { const k = x.date || "undated"; setSel(k); setPickId({ ...pickId, [k]: x.id }); setHov(null); setSure(false); setOpenRec(null); };
  const pct = (x) => { const r = p.mocks[x.id]; return r && r.max ? (100 * r.score) / r.max : 0; };
  const avg = attempted.length ? Math.round(attempted.reduce((s, x) => s + pct(x), 0) / attempted.length) : null;
  const sumR = attempted.reduce((s, x) => s + (p.mocks[x.id].right || 0), 0), sumW = attempted.reduce((s, x) => s + (p.mocks[x.id].wrong || 0), 0);
  const accuracy = sumR + sumW ? Math.round((100 * sumR) / (sumR + sumW)) : null;
  const bestP = attempted.length ? Math.round(Math.max(...attempted.map(pct))) : null;
  const stage = (list[0] && list[0].stage) || (g.tests[0] && g.tests[0].stage) || "";
  const reset = () => { if (chosen) { try { localStorage.removeItem("ap-run-" + chosen.id); } catch {} } setSure(false); redraw((n) => n + 1); };

  const hovList = hov && hov !== "undated" ? byDate.get(hov) || [] : null;

  return (
    <div className="page boosterpg">
      <div className="bstage py">
        <div className="bp-top">
          <div><h1>{title}</h1><p>Previous years · {papers.length} papers{years.length ? " · " + years[0] + (years.length > 1 ? "–" + years[years.length - 1] : "") : ""}</p></div>
          {right}
        </div>

        <section className="bcal pycal" aria-label="Previous years calendar">
          <header aria-live="polite">
            {groups.length > 1 && (
              <label className="bc-series"><span className="sr-only">Exam</span>
                <select value={g.id} onChange={(e) => { setGi(groups.findIndex((c) => c.id === e.target.value)); setSel(null); setHov(null); setYr(null); }}>
                  {groups.map((c) => <option key={c.id} value={c.id}>{c.name.replace(/^pyq[- ]/i, "")}</option>)}
                </select>
              </label>
            )}
            {key === "undated"
              ? <><h2>Undated papers</h2><p>{undated.length} {undated.length === 1 ? "paper" : "papers"}</p></>
              : <><h2>{dayLabel(key)} {key.slice(0, 4)}</h2><p>{list.length} {list.length === 1 ? "paper" : "papers"}{list.some((x) => x.slot) ? " · " + list.map((x) => "Slot " + x.slot).join(", ") : ""}</p></>}
          </header>
          {years.length > 0 && (
            <div className="pyr" role="tablist" aria-label="Year">
              {years.map((y) => { const n = dated.filter((x) => x.year === y).length; return (
                <button key={y} type="button" role="tab" aria-selected={y === year} className={y === year ? "on" : ""} onClick={() => { setYr(y); setHov(null); }}><b>{y}</b><small>{n} {n === 1 ? "paper" : "papers"}</small></button>
              ); })}
            </div>
          )}
          <div className="pyd" onMouseLeave={() => setHov(null)}>
            {year && datesOf(year).map((date) => (
              <div key={date} className={"pyd-card" + (key === date ? " cur" : "")} onMouseEnter={() => setHov(date)} onClick={() => { setSel(date); setSure(false); }}>
                <span className="pyd-day"><b>{dayLabel(date)}</b><em>{dayName(date)}</em></span>
                <span className="pyd-slots">
                  {byDate.get(date).map((x) => (
                    <button key={x.id} type="button" className={"pyl-slot st-" + stateOf([x]) + (key === date && chosen && chosen.id === x.id ? " on" : "")}
                      aria-label={dayLabel(date) + " " + year + (x.slot ? ", slot " + x.slot : "") + (done(x) ? ", completed" : live(x) ? ", in progress" : "")}
                      title={(x.slot ? "Slot " + x.slot : "Paper") + (done(x) ? " · done" : live(x) ? " · in progress" : "")}
                      onFocus={() => setHov(date)} onBlur={() => setHov(null)}
                      onClick={(e) => { e.stopPropagation(); setSel(date); setPickId({ ...pickId, [date]: x.id }); setSure(false); }}>{done(x) ? "✓" : x.slot || "P"}</button>
                  ))}
                </span>
              </div>
            ))}
            {!years.length && !undated.length && <p className="bres-empty">No papers yet.</p>}
          </div>
          {undated.length > 0 && (
            <div className="py-undated">
              <h4>Undated</h4>
              <div className="py-chips">
                {undated.map((x) => (
                  <button key={x.id} type="button" className={"py-chip st-" + stateOf([x]) + (key === "undated" && chosen && chosen.id === x.id ? " on" : "")}
                    onClick={() => { setSel("undated"); setPickId({ ...pickId, undated: x.id }); setHov(null); setSure(false); }}>
                    {[x.stage, x.held, x.slot && "Slot " + x.slot].filter(Boolean).join(" · ") || x.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="pyl-key" aria-hidden="true"><span><i className="k-ok" />done</span><span><i className="k-live" />in progress</span><span><i className="k-slot" />not started</span></div>
        </section>

        <aside className="bp-left" aria-label="Sessions">
          {chosen ? (
            <div className={"tk" + (pinned ? "" : " peek")}>
              <div className="tk-stub">
                <div className="tk-meta"><small>{g.name.replace(/^pyq[- ]/i, "")}</small><span className="tk-tag">{[stage, chosen.slot && "Slot " + chosen.slot].filter(Boolean).join(" · ") || "Paper"}</span></div>
                <div className="tk-dayrow"><small>{key === "undated" ? "Papers" : "Held on"}</small><b>{key === "undated" ? "Undated" : dayLabel(key)}</b>{key !== "undated" && <span className="tk-yr">{key.slice(0, 4)}</span>}</div>
              </div>
              <div className="tk-perf" aria-hidden="true" />
              <div className="tkr-list" role="group" aria-label="Sections in this paper">
                {secRows.map((x, i) => x.ghost ? (
                  <div key={"g" + x.k} className="tkr frozen s-b" aria-disabled="true">
                    <span className="tkr-box" aria-hidden="true" />
                    <span className="tkr-txt"><b>{GN[x.k]}</b><small>not in this paper</small></span>
                  </div>
                ) : (
                  <div key={i} className="tkr on static s-b">
                    <span className="tkr-box" aria-hidden="true" />
                    <span className="tkr-txt"><b>{x.name}</b><small>{x.n} questions</small></span>
                    {i === 0 && p.mocks[chosen.id] ? <em className="ok">Scored {round(p.mocks[chosen.id].score)}/{p.mocks[chosen.id].max}</em> : i === 0 && live(chosen) ? <em>In progress</em> : null}
                  </div>
                ))}
              </div>
              <div className="tk-perf plain" aria-hidden="true" />
              <div className="tkr-foot">
                <div className="tkr-sum">
                  <span>{chosen.n} q · {chosen.time} min</span>
                  {live(chosen) && pinned && (sure ? <button type="button" className="linkbtn" onClick={reset}>Sure?</button> : <button type="button" className="linkbtn" onClick={() => setSure(true)}>Reset</button>)}
                </div>
                <div className="tkr-act">
                  {live(chosen) && pinned && <a className="btn sm" href={"#/mock/" + g.id + "/" + chosen.id}>Resume</a>}
                  <a className={"btn primary" + (pinned ? "" : " off")} href={pinned ? "#/mock/" + g.id + "/" + chosen.id : undefined} aria-disabled={!pinned}>{!pinned ? "Click the date" : done(chosen) ? "Retake " + (chosen.slot ? "Slot " + chosen.slot : "paper") : "Start " + (chosen.slot ? "Slot " + chosen.slot : "paper")}</a>
                </div>
              </div>
            </div>
          ) : <div className="tk"><p className="bres-empty" style={{ padding: 18 }}>No papers yet.</p></div>}
          <div className="bres">
            <div className="bres-head"><h3>Overall</h3></div>
            <div className="bres-body">
              <div className="bres-hero">
                <Gauge pct={accuracy} />
                <div className="bh-txt"><b>{attempted.length}/{papers.length}</b><span>papers done</span><small>accuracy across them</small></div>
              </div>
              <div className="bres-tiles">
                <div className="bt-tile"><b>{avg === null ? "–" : avg + "%"}</b><span>average score</span></div>
                <div className="bt-tile"><b>{bestP === null ? "–" : bestP + "%"}</b><span>best score</span></div>
                <div className="bt-tile"><b>{(sumR + sumW).toLocaleString()}</b><span>attempted</span></div>
              </div>
            </div>
          </div>
        </aside>

        <aside className="bp-recent" aria-label="Recent papers">
          <header><h2>Recent</h2></header>
          {recent.length ? (
            <div className="brl">
              {recent.map((x) => {
                const r = p.mocks[x.id], isLive = live(x), open = openRec === x.id;
                return (
                  <div key={x.id} className={"brw" + (open ? " open" : "")}>
                    <button type="button" className={"brh st-" + (r ? "done" : "part")} aria-expanded={open} onClick={() => { setOpenRec(open ? null : x.id); setSureRec(null); }}>
                      <span className="brh-top"><small>{g.name.replace(/^pyq[- ]/i, "")}</small><em>{r ? "Completed" : "In progress"}</em></span>
                      <span className="brh-day"><small>{x.slot ? "Slot " + x.slot : "Paper"}</small><b>{x.date ? dayLabel(x.date) : "Undated"}</b><i>{r ? round(r.score) + "/" + r.max : "answering"}</i></span>
                    </button>
                    {open && (
                      <div className="brx">
                        <div className="brx-row">
                          {isLive ? <a className="btn sm primary" href={"#/mock/" + g.id + "/" + x.id}>Resume</a> : <button type="button" className="btn sm primary" disabled title="No unfinished run of this paper">Resume</button>}
                          {sureRec === x.id
                            ? <button type="button" className="btn sm danger" onClick={() => resetPaper(x)}>Sure?</button>
                            : <button type="button" className="btn sm" disabled={!isLive} title={isLive ? "Forget the half-finished run" : "Nothing half-finished to reset"} onClick={() => setSureRec(x.id)}>Reset</button>}
                          <button type="button" className="btn sm" title="Show this paper's date and its other sessions" onClick={() => selectPaper(x)}>Open</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : <p>Papers you start show up here.</p>}
        </aside>
      </div>
    </div>
  );
}
