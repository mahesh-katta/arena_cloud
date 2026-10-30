import { Fragment, useEffect, useMemo, useState } from "react";
import Solver, { fmt } from "./Question.jsx";
import { courseIndex, courseTopic, courseQs, bankIndex, useData, useProgress } from "./store.js";
import { BackBtn, Solve, initials, Meter, Loading, Failed } from "./ui.jsx";
import { glyph } from "./TopicIcon.jsx";

/* Course: Reasoning or Quant → topic → units → lessons. Reasoning units are concepts and a lesson is one puzzle;
   Quant units are archetypes and a lesson is one recipe. No gates, no tests, no levels: every lesson is open. */
const SUBJ = { reasoning: "s-r", quant: "s-q" };
const href = (...a) => "#/course/" + a.map(encodeURIComponent).join("/");

/* Reasoning lessons are all titled "Puzzle n"; name them from their source set instead, e.g. "Beginner · Set 2 · Puzzle 1" */
/* "New" and 2026 sets are the ones to learn first; the rest are Beginner or Prelims (there are no Mains sets here) */
const levelOf = (test) => (!test ? "Practice" : /\bnew\s*$|2026/i.test(test) ? "Must Learn" : /begin/i.test(test) ? "Beginner" : "Prelims");
function setLabel(test) {
  if (!test) return null;
  const set = (test.match(/set\s*[-–]?\s*(\d+)/i) || [])[1];
  return levelOf(test) + (set ? " · Set " + set : "");
}
const LEVELS = ["Beginner", "Prelims", "Must Learn", "Practice"];
/* a unit's lessons grouped by exam level, each group keeping the unit's own lesson numbers; Quant recipes stay one group */
function groupLessons(lessons, byLevel) {
  if (!byLevel) return [{ lv: "", items: lessons.map((l, li) => ({ l, li })) }];
  const g = {};
  lessons.forEach((l, li) => { const lv = levelOf(l.test); (g[lv] = g[lv] || []).push({ l, li }); });
  return LEVELS.filter((lv) => g[lv]).map((lv) => ({ lv, items: g[lv] }));
}
/* one row per source set ("2026 · Set 1"), its puzzles as small numbered chips */
function setRows(g, names) {
  const rows = [];
  for (const { l, li } of g.items) {
    const m = names[li].match(/^(.*?)\s*·?\s*Puzzle (\d+)$/);
    const key = (m ? m[1].replace(new RegExp("^" + g.lv + "\\s*·?\\s*"), "") : names[li]) || g.lv;
    let r = rows.find((x) => x.key === key);
    if (!r) rows.push((r = { key, items: [] }));
    r.items.push({ l, li, k: m ? m[2] : li + 1 });
  }
  return rows;
}
function lessonNames(lessons) {
  const seen = {}, total = {};
  for (const l of lessons) { const k = setLabel(l.test); if (k) total[k] = (total[k] || 0) + 1; }
  return lessons.map((l) => {
    const k = setLabel(l.test);
    if (!k || !/^Puzzle \d+$/.test(l.title)) return l.title;
    seen[k] = (seen[k] || 0) + 1;
    return k + (total[k] > 1 ? " · Puzzle " + seen[k] : "");
  });
}

/* Quant recipe titles read "Given pattern -> Find X": show what you will find as the title and the setup as a line under it */
function recipe(title) {
  const i = title.indexOf("->");
  if (i < 0) return { main: title, sub: "" };
  const find = title.slice(i + 2).trim(), given = title.slice(0, i).replace(/^Template:\s*/i, "").trim();
  return { main: find.charAt(0).toUpperCase() + find.slice(1), sub: given };
}

/* the setup of a recipe as short chips: split at commas outside brackets, at most four */
function givens(sub) {
  if (!sub) return [];
  const out = []; let depth = 0, cur = "";
  for (const ch of sub) {
    if (ch === "(") depth++; if (ch === ")") depth = Math.max(0, depth - 1);
    if (ch === "," && !depth) { out.push(cur.trim()); cur = ""; } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out.map((x) => x.replace(/^(with|and)\s+/i, "")).filter(Boolean);
}

/* the last few lessons opened, newest first, for "Continue where you left off" */
const RECENT = "arena-course-recent";
const readRecent = () => { try { return JSON.parse(localStorage.getItem(RECENT)) || []; } catch { return []; } };
const clearRecent = () => { try { localStorage.removeItem(RECENT); } catch {} };
const saveRecent = (r) => { try { localStorage.setItem(RECENT, JSON.stringify([r, ...readRecent().filter((x) => x.lid !== r.lid)].slice(0, 6))); } catch {} };

/* how far a list of question ids is: answered, and answered right */
const stat = (answers, ids) => { let done = 0, ok = 0; for (const i of ids) { const a = answers[i]; if (a) { done++; if (a.ok) ok++; } } return { done, ok, n: ids.length }; };
const tone = (s) => (!s.done ? "" : s.done < s.n ? " prog" : s.ok / s.n >= 0.8 ? " good" : s.ok / s.n >= 0.5 ? " mid" : " low");

/* Score Cracker: the high-yield "other topics", in priority order (day = row). Each opens its Topic Practice page. */
const CRACKER = [
  ["quant--simplification", "Simplification"], ["quant--approximations", "Approximations"], ["quant--number-series", "Number Series [Quant]"],
  ["quant--quadratic-equations", "Quadratic Equations"], ["reasoning--inequality", "Inequality"], ["reasoning--syllogism", "Syllogism"],
  ["reasoning--coding-and-decoding", "Coding and Decoding"], ["reasoning--reasoning-miscellaneous", "Reasoning Miscellaneous"],
  ["reasoning--blood-relation", "Blood Relations"], ["reasoning--direction-sense", "Direction Sense"], ["reasoning--order-and-ranking", "Order and Ranking"],
  ["reasoning--alphanumeric-series", "Alphanumeric Series"], ["reasoning--alphabet-series", "Alphabet Series"],
  ["reasoning--number-series", "Number Series [Reasoning]"], ["quant--data-sufficiency", "Data Sufficiency [Quant]"],
];
/* Data Interpretation: the chart and table topics from the bank, opened in Topic Practice */
const DI = [
  ["quant--caselet", "Caselet"], ["quant--pie-chart", "Pie Chart"], ["quant--bar-graph", "Bar Graph"], ["quant--line-graph", "Line Graph"],
  ["quant--table-chart", "Table Chart"], ["quant--missing-table-chart", "Missing Table Chart"], ["quant--application-based-di", "Application Based DI"],
  ["quant--radar-graph", "Radar Graph"], ["quant--cumulative-di", "Cumulative DI"], ["quant--tree-based-di", "Tree Based DI"],
  ["quant--funnel-di", "Funnel DI"], ["quant--triangle-chart", "Triangle Chart"], ["quant--bubble-graph", "Bubble Graph"],
  ["quant--scatter-graph", "Scatter Graph"], ["quant--candle-stick", "Candlestick"],
];
const SUB_LINE = {
  reasoning: "Seating arrangements and puzzles, concept by concept. Each lesson is one puzzle with its questions.",
  quant: "Arithmetic topics, recipe by recipe. Each lesson is one recipe, starting with its model question.",
  cracker: "The quick-scoring topics, in the order to take them: one a day. Each opens its practice set.",
  di: "Charts, tables and caselets. Each topic opens its practice set.",
  english: "English is on its way.",
};
const CARD_INFO = { reasoning: "Concept by concept", quant: "Recipe by recipe", cracker: "One topic a day", di: "Charts and tables", english: "Grammar and reading" };
const ico = (d) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>;
export const CARD_ICON = {
  reasoning: ico(<><rect x="3.5" y="3.5" width="7" height="7" rx="1.6" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.6" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.6" /><circle cx="17" cy="17" r="3.5" /></>),
  quant: ico(<><path d="M5 8h6M8 5v6M13 8h6M5 17h6M13 14l6 6M19 14l-6 6" /></>),
  cracker: ico(<path d="M13 2.5 5 13.5h6l-1 8 8-11h-6z" />),
  di: ico(<><path d="M4 20V10M10 20V4M16 20v-7M21 20H3" /></>),
  all: ico(<><rect x="3.5" y="3.5" width="7" height="7" rx="1.6" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.6" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.6" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.6" /></>),
  english: ico(<><path d="M4 20 10 4l6 16M6.4 14h7.2M18 8v8M21 12h-6" /></>),
};
const href2 = (subj, t) => (t.practice ? "#/practice/" + t.id : href(subj, t.id));

export function CourseHome() {
  const [ix, err] = useData(courseIndex, []);
  const [bank] = useData(bankIndex, []);
  const [pick, setPick] = useState(() => { try { return localStorage.getItem("arena-course-subj") || ""; } catch { return ""; } });
  const [q, setQ] = useState("");
  const [tick, setTick] = useState(0);
  const [rop, setRop] = useState(false);
  if (err) return <Failed what="the course" err={err} />;
  if (!ix) return <Loading />;
  const counts = {};
  if (bank) for (const sec of bank.sections) for (const t of sec.topics) counts[t.id] = t.n;
  const cracker = { id: "cracker", name: "Score Cracker", topics: CRACKER.map(([id, name]) => ({ id, name, practice: true, questions: counts[id] })) };
  const subjects = [...ix.subjects, cracker, { id: "di", name: "Data Interpretation", topics: DI.map(([id, name]) => ({ id, name, practice: true, questions: counts[id] })) }, { id: "english", name: "English", soon: true, topics: [] }];
  const s = subjects.find((x) => x.id === pick) || subjects[0];
  const choose = (id) => { setPick(id); try { localStorage.setItem("arena-course-subj", id); } catch {} };
  /* only the latest lesson of this section, as one slim line that can be dismissed */
  const allRecent = readRecent();
  const secRecent = allRecent.filter((r) => r.subject === s.id);
  const last = secRecent[0];
  const isRecent = new Set(allRecent.map((r) => r.subject + ":" + r.tid));
  const goto = (r) => (r.practice ? "#/practice/" + r.tid : href(r.subject, r.tid, r.lid));
  /* the search looks in every subject; with text in it the panel lists matches from all of them */
  const ql = q.trim().toLowerCase();
  const hits = (x) => (ql ? x.topics.filter((t) => t.name.toLowerCase().includes(ql)) : x.topics);
  const found = ql ? subjects.map((x) => ({ x, ts: hits(x) })).filter((g) => g.ts.length) : [];
  const total = found.reduce((a, g) => a + g.ts.length, 0);
  const tabKey = (e) => {
    const i = subjects.findIndex((x) => x.id === s.id), n = subjects.length;
    const j = e.key === "ArrowRight" ? (i + 1) % n : e.key === "ArrowLeft" ? (i - 1 + n) % n : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : -1;
    if (j < 0) return;
    e.preventDefault(); choose(subjects[j].id);
    e.currentTarget.parentNode.children[j]?.focus();
  };
  /* long Reasoning titles lose their repeated tail ("Seating Arrangement", "-Based Puzzle") and keep it as a small kind tag */
  const shortName = (t) => { const m = t.name.match(/^(.*?)(?:[\s-]+Based)?\s+(Seating Arrangement|Puzzle)$/i); return m && !t.practice ? { main: m[1].trim(), kind: /seating/i.test(m[2]) ? "Seating" : "Puzzle" } : { main: t.name, kind: "" }; };
  const topicCard = (x, t, sn = shortName(t)) => (
    <a key={x.id + t.id} className={"card tcard c-" + x.id + (isRecent.has(x.id + ":" + t.id) ? " recent" : "")} href={href2(x.id, t)}
      onClick={() => { if (t.practice) saveRecent({ subject: x.id, tid: t.id, lid: t.id, practice: true, topic: t.name, unit: "Practice set", name: t.name }); }}>
      <div className="top">
        <span className="tile">{glyph(t.name)}</span>
        <div className="grow"><div className="name" title={t.name}>{sn.main}</div>
          <div className="sub">{t.practice ? (t.questions ? t.questions.toLocaleString() + " questions" : "Practice set") : t.units + (t.units === 1 ? " unit" : " units") + " · " + t.questions.toLocaleString() + " Qs"}</div></div>
      </div>
      {isRecent.has(x.id + ":" + t.id) && <span className="rtag">Recent</span>}
      <span className="tgo" aria-hidden="true">→</span>
    </a>
  );
  return (
    <div className="page course cfit">
      <div className="bp-top chead3">
        <div><h1>Modules</h1></div>
        <input className="search csearch" type="search" aria-label="Search all topics" placeholder="Search all topics" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="ccards" role="tablist" aria-label="Module sections">
        {subjects.map((x, n) => (
          <button key={x.id} id={"ctab-" + x.id} type="button" role="tab" aria-selected={!ql && x.id === s.id} aria-controls="cpanel" tabIndex={x.id === s.id ? 0 : -1}
            className={"ccard c-" + x.id + (!ql && x.id === s.id ? " on" : "") + (x.soon ? " soon" : "")} onClick={() => { setQ(""); choose(x.id); }} onKeyDown={tabKey}>
            <span className="cbot"><b>{x.name}</b><em>{CARD_INFO[x.id]}</em></span>
            <span className="ctop"><span className="cico">{CARD_ICON[x.id]}</span><span className="cpill">{x.soon ? "Soon" : (ql ? hits(x).length + (hits(x).length === 1 ? " match" : " matches") : x.topics.length + " topics")}</span></span>
          </button>
        ))}
      </div>
      <section className={"cpanel c-" + (ql ? "all" : s.id)} id="cpanel" role="tabpanel" aria-labelledby={"ctab-" + s.id}>
        <div className="phead"><h2>{ql ? "Search results" : s.name}</h2><span className="ppill">{ql ? total + " found" : s.soon ? "Coming soon" : s.topics.length + " topics"}</span>
          {!ql && !s.soon && (
            <div className="pact">
              {last ? <a className="pbtn main" href={goto(last)} title={last.topic + " · " + last.name}>Resume</a> : <span className="pbtn main off" title="Nothing opened yet in this section">Resume</span>}
              <div className="rwrap">
                <button type="button" className={"pbtn" + (rop ? " on" : "")} aria-expanded={rop} onClick={() => setRop(!rop)}>Recent{secRecent.length > 0 && <span className="rn">{secRecent.length}</span>}</button>
                {rop && (
                  <div className="rpop" role="menu">
                    {secRecent.length ? secRecent.map((r) => <a key={r.lid} role="menuitem" href={goto(r)}><b>{r.name}</b><small>{r.practice ? "Practice set" : r.topic + " · " + r.unit}</small></a>) : <p className="muted small">Nothing opened yet.</p>}
                    {secRecent.length > 0 && <button type="button" className="linkbtn" onClick={() => { clearRecent(); setRop(false); setTick(tick + 1); }}>Clear recent</button>}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="cbody">
        {ql ? (
          <>
            
            {!total && <div className="empty">No topic matches “{q.trim()}”. <button type="button" className="linkbtn" onClick={() => setQ("")}>Clear search</button></div>}
            {found.map(({ x, ts }) => (<div key={x.id} className="cgroup"><h2 className="cgh">{x.name}</h2><div className="cgrid">{ts.map((t) => topicCard(x, t))}</div></div>))}
          </>
        ) : s.soon ? (
          <div className="soonbox"><span className="soontag">Coming soon</span><h2>{s.name}</h2><p className="muted">{SUB_LINE[s.id]} Check back soon.</p></div>
        ) : (
          <>
            <div className="cgrid">{s.topics.map((t, n) => topicCard(s, t))}</div>
          </>
        )}
        </div>
      </section>
    </div>
  );
}

const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);
const lstate = (q) => (q.n > 0 && q.done === q.n ? "done" : q.done ? "prog" : "new");
const PILL = { done: "Completed", prog: "In progress", new: "Not started" };
const GO = { done: "Review", prog: "Continue", new: "Start" };
const STATUS = [["all", "All status"], ["new", "Not started"], ["prog", "In progress"], ["done", "Completed"]];

function Ring({ value, color }) {
  const r = 30, c = 2 * Math.PI * r;
  return (
    <svg className="ring" viewBox="0 0 76 76" role="img" aria-label={value + "% complete"}>
      <circle cx="38" cy="38" r={r} fill="none" stroke="var(--line)" strokeWidth="6.5" />
      <circle cx="38" cy="38" r={r} fill="none" stroke={color || "var(--subj-main, var(--brand))"} strokeWidth="6.5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} transform="rotate(-90 38 38)" />
      <text x="38" y="44" textAnchor="middle" fontSize="16" fontWeight="800" fill="var(--ink)">{value}%</text>
    </svg>
  );
}

export function CourseTopic({ subject, tid }) {
  const p = useProgress();
  const [d, err] = useData(() => courseTopic(subject, tid), [subject, tid]);
  const [sel, setSel] = useState(null);
  const [lvPick, setLvPick] = useState("");
  const [q, setQ] = useState("");
  const [st, setSt] = useState("all");
  if (err) return <Failed what="this topic" err={err} />;
  if (!d) return <Loading />;
  const byLevel = subject === "reasoning";
  const idsOf = (lessons) => lessons.flatMap((l) => l.ids);
  const all = d.units.flatMap((u) => idsOf(u.lessons));
  const tot = stat(p.answers, all);
  const nLessons = d.units.reduce((a, u) => a + u.lessons.length, 0);
  /* the first lesson not finished yet, in course order (unit, then level, then set) */
  const resume = (() => {
    for (const un of d.units) { const nm = lessonNames(un.lessons); for (const gp of groupLessons(un.lessons, byLevel)) for (const { l, li } of gp.items) if (stat(p.answers, l.ids).done < l.ids.length) return { l, name: nm[li], unit: un.name, lv: gp.lv }; }
    return null;
  })();
  const nextId = resume ? resume.l.id : null;
  const firstOpen = (() => { const i = d.units.findIndex((x) => { const s = stat(p.answers, idsOf(x.lessons)); return s.done < s.n; }); return i < 0 ? 0 : i; })();
  const ui = sel == null || !d.units[sel] ? firstOpen : sel;
  const u = d.units[ui];
  const names = lessonNames(u.lessons);
  const groups = groupLessons(u.lessons, byLevel);
  const lv = groups.some((x) => x.lv === lvPick) ? lvPick : (groups.find((x) => x.items.some((i) => i.l.id === nextId)) || groups[0]).lv;
  const us = stat(p.answers, idsOf(u.lessons));
  const subName = subject === "quant" ? "Quant" : "Reasoning";
  const pick = (n) => { setSel(n); setLvPick(""); setQ(""); setSt("all"); };
  /* filters: text in the title, status of the lesson */
  const ql = q.trim().toLowerCase();
  const keep = ({ l, li }) => (!ql || (names[li] + " " + (l.test || "") + " " + l.title).toLowerCase().includes(ql)) && (st === "all" || lstate(stat(p.answers, l.ids)) === st);
  const g = { lv, items: groups.find((x) => x.lv === lv).items.filter(keep) };
  const after = d.units[ui + 1] ? { label: d.units[ui + 1].name, sub: "Next unit", go: () => pick(ui + 1) } : null;
  const afterCard = after ? (
    <button type="button" className="aftercard" onClick={after.go}>
      <span>
        <small>{after.sub}</small>
        <b>{after.label}</b>
      </span>
      <i className="arrow" aria-hidden="true">→</i>
    </button>
  ) : (
    <a className="aftercard end" href="#/course">
      <span>
        <small>Last unit of {d.name}</small>
        <b>Back to all topics</b>
      </span>
      <i className="arrow" aria-hidden="true">→</i>
    </a>
  );
  const state = (s) => (!s.done ? "not started" : s.done < s.n ? s.done + " of " + s.n + " done" : s.ok + " of " + s.n + " right");
  const lvKey = (e) => {
    const i = groups.findIndex((x) => x.lv === lv), n = groups.length;
    const j = e.key === "ArrowRight" ? (i + 1) % n : e.key === "ArrowLeft" ? (i - 1 + n) % n : -1;
    if (j < 0) return;
    e.preventDefault(); setLvPick(groups[j].lv); e.currentTarget.parentNode.children[j]?.focus();
  };
  const heroSub = resume ? (byLevel ? resume.name.replace(/^(Must Learn|Beginner|Prelims|Practice)\s*/, "").replace(/^[\s·]+/, "") : recipe(resume.name).main) + " · " + resume.l.ids.length + " questions" : "";
  const sets = setRows(g, names);
  return (
    <div className={"page course tpage " + SUBJ[subject] + " c-" + subject}>
      <div className="bp-top chead3 thead2">
        <div className="tt">
          <div className="crumbs">
            <BackBtn />
            <a href="#/course">Modules</a>
            <span className="sep">/</span>
            <a href="#/course" onClick={() => { try { localStorage.setItem("arena-course-subj", subject); } catch {} }}>{subName}</a>
          </div>
          <h1>{d.name}</h1>
        </div>
        <div className="tprog">
          <div className="tpl"><b>{tot.done.toLocaleString()} of {tot.n.toLocaleString()} questions</b><small>{d.units.length} {d.units.length === 1 ? "unit" : "units"} · {nLessons} lessons{tot.done ? " · " + pct(tot.ok, tot.done) + "% accuracy" : ""}</small></div>
          <div className="pbar"><i style={{ width: pct(tot.done, tot.n) + "%" }} /></div>
          <b className="num">{pct(tot.done, tot.n)}%</b>
        </div>
      </div>
      <div className="tlay">
        <nav className="uside" aria-label={d.name + " units"}>
          <div className="uhead-bar">
            <span>Units</span>
            <span className="uhead-count">{d.units.length}</span>
          </div>
          <div className="ulist">
            {d.units.map((x, n) => {
              const s = stat(p.answers, idsOf(x.lessons));
              const isFull = s.n > 0 && s.done === s.n;
              return (
                <button key={x.name + n} type="button" className={"uitem" + (n === ui ? " on" : "") + (isFull ? " full" : "")} aria-current={n === ui ? "true" : undefined} onClick={() => pick(n)}>
                  <span className="unum">{isFull ? "✓" : n + 1}</span>
                  <span className="ctxt">
                    <b>{x.name}</b>
                    <span className="urow"><small>{s.done}/{s.n} questions</small><small className="num">{pct(s.done, s.n)}%</small></span>
                    <i className="ubar"><i style={{ width: pct(s.done, s.n) + "%" }} /></i>
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
        <div className="rcol">
          {resume && (
            <div className="ustart">
              <span className="uring" role="img" aria-label={pct(tot.done, tot.n) + "% complete"} style={{ "--p": pct(tot.done, tot.n) }}>
                <b>{pct(tot.done, tot.n)}<small>%</small></b>
              </span>
              <div className="ubody">
                <b>{resume.unit}</b>
                <small>
                  {resume.lv && <span className="uchip">{resume.lv}</span>}
                  <span>{heroSub}</span>
                  <span className="udot" aria-hidden="true" />
                  <span>{tot.done.toLocaleString()}/{tot.n.toLocaleString()} done</span>
                </small>
              </div>
              <a href={href(subject, tid, resume.l.id)}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10-6.5z" /></svg>
                {tot.done ? "Resume" : "Start"}
              </a>
            </div>
          )}
          <section className="upane" aria-labelledby="upane-h">
            <div className="uhead">
              <span className="unum big">{ui + 1}</span>
              <div className="grow">
                <h2 id="upane-h">{u.name}</h2>
                <small className="muted">{us.n.toLocaleString()} questions{byLevel && groups.length > 1 ? " across " + groups.length + " levels" : " in " + u.lessons.length + (u.lessons.length === 1 ? " lesson" : " lessons")}</small>
              </div>
              <div className="uprog">
                <small>{us.done}/{us.n} questions</small>
                <span className="pbar"><i style={{ width: pct(us.done, us.n) + "%" }} /></span>
                <small className="num">{pct(us.done, us.n)}%</small>
              </div>
            </div>
            <div className="toolrow">
              {groups.length > 1 ? (
                <div className="ltabs" role="tablist" aria-label="Exam level">
                  {groups.map((x) => (
                    <button key={x.lv} type="button" role="tab" aria-selected={x.lv === lv} tabIndex={x.lv === lv ? 0 : -1} className={"ltab" + (x.lv === lv ? " on" : "")} onClick={() => setLvPick(x.lv)} onKeyDown={lvKey}>
                      {x.lv} <small>({x.items.length})</small>
                    </button>
                  ))}
                </div>
              ) : <span className="grow" />}
              <div className="ttools">
                <label className="tsearch">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>
                  <input type="search" aria-label="Search lessons" placeholder={subject === "reasoning" ? "Search puzzles…" : "Search recipes…"} value={q} onChange={(e) => setQ(e.target.value)} />
                </label>
                <select className="tsel" aria-label="Filter by status" value={st} onChange={(e) => setSt(e.target.value)}>
                  {STATUS.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
                </select>
              </div>
            </div>
            <div className="uscroll">
              {!g.items.length && <div className="empty">Nothing matches. <button type="button" className="linkbtn" onClick={() => { setQ(""); setSt("all"); }}>Clear filters</button></div>}
              {subject === "reasoning" ? (
                <div className="sets">
                  {sets.map((r) => {
                    const s = stat(p.answers, r.items.flatMap((i) => i.l.ids));
                    const ss = lstate(s);
                    return (
                      <section key={r.key} className={"setbox s-" + ss + (r.items.some((i) => i.l.id === nextId) ? " cur" : "")} aria-label={r.key}>
                        <div className="sethead">
                          <span className="sq" aria-hidden="true" />
                          <b>{r.key}</b>
                          <small>{r.items.length} {r.items.length === 1 ? "puzzle" : "puzzles"} · {s.n} questions</small>
                          <span className="setp">
                            <small>{s.done}/{s.n} questions</small>
                            <span className="pbar"><i style={{ width: pct(s.done, s.n) + "%" }} /></span>
                            <small className="num">{pct(s.done, s.n)}%</small>
                          </span>
                        </div>
                        <div className="pzgrid">
                          {r.items.map(({ l, li, k }) => {
                            const qq = stat(p.answers, l.ids), ls = lstate(qq);
                            return (
                              <a key={l.id} className={"pz s-" + ls + (l.id === nextId ? " cur" : "")} href={href(subject, tid, l.id)} aria-label={names[li] + ", " + l.ids.length + " questions, " + state(qq)}>
                                <span className="pzn">{k}</span>
                                <span className="pzb">
                                  <span className="pzt">
                                    <b>Puzzle {k}</b>
                                    <em className={"pill s-" + ls}>{PILL[ls]}</em>
                                  </span>
                                  <small>{l.ids.length} questions</small>
                                  {ls === "prog" && (
                                    <span className="pzp">
                                      <span className="pbar"><i style={{ width: pct(qq.done, qq.n) + "%" }} /></span>
                                      <small>{qq.done}/{qq.n} completed</small>
                                    </span>
                                  )}
                                  {ls === "done" && <small className="pzok">{qq.ok}/{qq.n} right</small>}
                                </span>
                                <span className={"pzgo" + (ls === "prog" || l.id === nextId ? " pri" : "")}>
                                  {ls === "new" ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M8 5.5v13l10-6.5z" /></svg> : null}
                                  {GO[ls]}
                                  {ls === "new" ? "" : " →"}
                                </span>
                              </a>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}
                </div>
              ) : (
                <ol className="rgrid path2">
                  {g.items.map(({ l, li }) => {
                    const qq = stat(p.answers, l.ids); const r = recipe(names[li]); const ls = lstate(qq);
                    return (
                      <li key={l.id}>
                        <a className={"rcard" + tone(qq) + (l.id === nextId ? " nxt" : "")} href={href(subject, tid, l.id)} aria-label={r.main + (r.sub ? ". " + r.sub : "") + ". " + l.ids.length + " questions, " + state(qq)}>
                          <span className="rtop">
                            <span className="lno">{li + 1}</span>
                            <em className={"pill s-" + ls}>{PILL[ls]}</em>
                          </span>
                          <span className="rfind">
                            <small>Find</small>
                            <b>{r.main.replace(/^Find\s+/i, "").replace(/^./, (c) => c.toUpperCase())}</b>
                          </span>
                          {r.sub && (
                            <span className="rgiven">
                              <small>Given</small>
                              <span className="gch">
                                {givens(r.sub).slice(0, 3).map((x, n) => <i key={n}>{x}</i>)}
                                {givens(r.sub).length > 3 && <i className="more">+{givens(r.sub).length - 3}</i>}
                              </span>
                            </span>
                          )}
                          <span className="rfoot">
                            <span className="rbar"><i style={{ width: pct(qq.done, qq.n) + "%" }} /></span>
                            <small className="rqn">{qq.done ? qq.done + "/" + qq.n : l.ids.length + " Qs"}</small>
                            <em>{GO[ls]} →</em>
                          </span>
                        </a>
                      </li>
                    );
                  })}
                </ol>
              )}
              {afterCard}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export function CourseLesson({ subject, tid, lid }) {
  const p = useProgress();
  const [d, err] = useData(() => courseTopic(subject, tid), [subject, tid]);
  const lessons = useMemo(() => (d ? d.units.flatMap((u, ui) => { const names = lessonNames(u.lessons); return groupLessons(u.lessons, subject === "reasoning").flatMap((gp) => gp.items.map(({ l, li }) => ({ ...l, unit: u.name, ui, name: names[li] }))); }) : []), [d]);
  const at = lessons.findIndex((l) => l.id === lid);
  const lesson = lessons[at];
  useEffect(() => { if (d && lesson) saveRecent({ subject, tid, lid, topic: d.name, unit: lesson.unit, name: lesson.name }); }, [d, lid]);
  const [qs, qerr] = useData(() => (lesson ? courseQs(lesson.ids) : Promise.resolve([])), [lid, !!lesson]);
  const [i, setI] = useState(0);
  const [tools, setTools] = useState(false);
  const [end, setEnd] = useState(false);
  useEffect(() => { setI(0); setEnd(false); }, [lid]);
  if (err || qerr) return <Failed what="this lesson" err={err || qerr} />;
  if (!d || !qs) return <Loading />;
  if (!lesson) return <div className="page"><div className="empty">This lesson is not in the course. <a href={href(subject, tid)}>Back to {d.name}</a></div></div>;
  const next = lessons[at + 1];
  const s = stat(p.answers, lesson.ids);
  const back = href(subject, tid);
  const prev = lessons[at - 1];
  const unitLessons = lessons.filter((l) => l.ui === lesson.ui);
  const unitPos = unitLessons.findIndex((l) => l.id === lid);
  const rec = subject === "quant" ? recipe(lesson.name) : { main: lesson.name, sub: "" };
  return (
    <Solve cls={"s-q " + SUBJ[subject]} open={tools} setOpen={setTools}
      crumbs={<><a href="#/course">Modules</a><span>/</span><a href={back}>{d.name}</a><span>/</span><span>{lesson.unit}</span><span>/</span><b>Lesson {unitPos + 1} of {unitLessons.length}</b></>}
      rail={<div className="card">
        <div className="railhead"><span className="tile">{glyph(d.name)}</span><div><h3>{rec.main}</h3><div className="muted small">{lesson.unit}</div></div></div>
        {rec.sub && <p className="muted small rsub">{rec.sub}</p>}
        <div className="kv"><div><b>{s.ok}<small className="muted">/{s.done}</small></b><span>Right so far</span></div><div><b>{lesson.ids.length}</b><span>Questions</span></div></div>
        <div className="rnav">
          {prev ? <a className="btn sm" href={href(subject, tid, prev.id)}>← Previous lesson</a> : <span />}
          {next && <a className="btn sm" href={href(subject, tid, next.id)}>Next lesson →</a>}
        </div>
        {d.units.map((u, ui) => (
          <details key={ui} className="runit" open={ui === lesson.ui}>
            <summary>{ui + 1}. {u.name}</summary>
            <ol className="lessons">
              {lessons.filter((l) => l.ui === ui).map((l, n) => <li key={l.id}><a className={"lrow sm" + (l.id === lid ? " now" : "") + tone(stat(p.answers, l.ids))} aria-current={l.id === lid ? "page" : undefined} href={href(subject, tid, l.id)}><span className="lno">{n + 1}</span><span className="ltxt"><b>{subject === "quant" ? recipe(l.name).main : l.name}</b></span></a></li>)}
            </ol>
          </details>
        ))}
      </div>}>
      {end ? (
        <div className="card done">
          <div className="big">{s.ok} / {lesson.ids.length}</div>
          <div className="muted">{s.done < lesson.ids.length ? lesson.ids.length - s.done + " skipped · " : ""}Lesson finished</div>
          <div className="actions">
            {next && <a className="btn primary" href={href(subject, tid, next.id)}>Next lesson{next.ui !== lesson.ui ? ": " + next.unit : ""}</a>}
            <button className="btn" onClick={() => { setI(0); setEnd(false); }}>Go through it again</button>
            <a className="btn ghost" href={back}>All of {d.name}</a>
          </div>
        </div>
      ) : !qs.length ? <div className="empty">This lesson has no questions.</div> : (
        <>
        <div className="lhead"><h1>{rec.main}</h1>{rec.sub && <p className="muted small">{rec.sub}</p>}</div>
        <nav className="qdots" aria-label="Questions in this lesson" ref={(el) => { el?.querySelector(".cur")?.scrollIntoView({ block: "nearest", inline: "center" }); }}>
          {qs.map((q, n) => { const a = p.answers[lesson.ids[n]]; return <button key={n} type="button" className={"qd" + (n === i ? " cur" : "") + (a ? (a.ok ? " ok" : " bad") : "")} aria-current={n === i ? "step" : undefined} aria-label={"Question " + (n + 1) + (a ? (a.ok ? ", right" : ", wrong") : ", not answered")} onClick={() => setI(n)}>{n + 1}</button>; })}
        </nav>
        <Solver q={qs[i]} refInfo={qs[i]._ref} head={"Q " + (i + 1) + " / " + qs.length} chips={[[subject === "quant" ? lesson.unit : lesson.name, "ac"], lesson.test]}
          onPrev={i > 0 ? () => setI(i - 1) : null}
          onNext={() => (i + 1 >= qs.length ? setEnd(true) : setI(i + 1))} nextLabel={i + 1 >= qs.length ? "Finish lesson" : "Next question"} />
        </>
      )}
    </Solve>
  );
}
