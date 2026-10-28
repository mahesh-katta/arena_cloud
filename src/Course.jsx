import { useEffect, useMemo, useState } from "react";
import Solver, { fmt } from "./Question.jsx";
import { courseIndex, courseTopic, courseQs, bankIndex, useData, useProgress } from "./store.js";
import { Solve, initials, Meter, Loading, Failed } from "./ui.jsx";
import { glyph } from "./TopicIcon.jsx";

/* Course: Reasoning or Quant → topic → units → lessons. Reasoning units are concepts and a lesson is one puzzle;
   Quant units are archetypes and a lesson is one recipe. No gates, no tests, no levels: every lesson is open. */
const SUBJ = { reasoning: "s-r", quant: "s-q" };
const href = (...a) => "#/course/" + a.map(encodeURIComponent).join("/");

/* Reasoning lessons are all titled "Puzzle n"; name them from their source set instead, e.g. "Beginner · Set 2 · Puzzle 1" */
function setLabel(test) {
  if (!test) return null;
  const lv = /beginner/i.test(test) ? "Beginner" : /mains/i.test(test) ? "Mains" : /prelim/i.test(test) ? "Prelims" : "Practice";
  const yr = (test.match(/\b(20\d\d)\b/) || [])[1];
  const set = (test.match(/set\s*[-–]?\s*(\d+)/i) || [])[1];
  return lv + (yr ? " " + yr : "") + (set ? " · Set " + set : "");
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
const CARD_ICON = {
  reasoning: ico(<><rect x="3.5" y="3.5" width="7" height="7" rx="1.6" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.6" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.6" /><circle cx="17" cy="17" r="3.5" /></>),
  quant: ico(<><path d="M5 8h6M8 5v6M13 8h6M5 17h6M13 14l6 6M19 14l-6 6" /></>),
  cracker: ico(<path d="M13 2.5 5 13.5h6l-1 8 8-11h-6z" />),
  di: ico(<><path d="M4 20V10M10 20V4M16 20v-7M21 20H3" /></>),
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
  const topicCard = (x, t) => (
    <a key={x.id + t.id} className={"card tcard c-" + x.id + (isRecent.has(x.id + ":" + t.id) ? " recent" : "")} href={href2(x.id, t)}
      onClick={() => { if (t.practice) saveRecent({ subject: x.id, tid: t.id, lid: t.id, practice: true, topic: t.name, unit: "Practice set", name: t.name }); }}>
      <div className="top">
        <span className="tile">{glyph(t.name)}</span>
        <div className="grow"><div className="name">{t.name}</div>
          <div className="sub">{t.practice ? (t.questions ? t.questions.toLocaleString() + " questions" : "Practice set") : t.units + (t.units === 1 ? " unit" : " units") + " · " + t.lessons + " lessons · " + t.questions.toLocaleString() + " questions"}</div></div>
      </div>
      {isRecent.has(x.id + ":" + t.id) && <span className="rtag">Recent</span>}
      <span className="tgo" aria-hidden="true">→</span>
    </a>
  );
  return (
    <div className="page course cfit">
      <div className="chead2">
        <h1>Course</h1>
        <input className="search csearch" type="search" aria-label="Search all topics" placeholder="Search all topics" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="ccards" role="tablist" aria-label="Course sections">
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

export function CourseTopic({ subject, tid }) {
  const p = useProgress();
  const [d, err] = useData(() => courseTopic(subject, tid), [subject, tid]);
  if (err) return <Failed what="this topic" err={err} />;
  if (!d) return <Loading />;
  const all = d.units.flatMap((u) => u.lessons.flatMap((l) => l.ids));
  const tot = stat(p.answers, all);
  /* the first lesson not finished yet, so the page can say where to carry on */
  const resume = (() => {
    for (const u of d.units) { const names = lessonNames(u.lessons); for (let i = 0; i < u.lessons.length; i++) { const l = u.lessons[i]; if (stat(p.answers, l.ids).done < l.ids.length) return { l, name: names[i] }; } }
    return null;
  })();
  return (
    <div className={"page course " + SUBJ[subject]}>
      <div className="crumbs"><a href="#/course">Course</a><span>/</span><a href="#/course">{subject === "quant" ? "Arithmetic" : "Seating & Puzzles"}</a><span>/</span><b>{d.name}</b></div>
      <div className="head">
        <div><h1>{d.name}</h1><div className="sub">{d.units.length} units · {d.units.reduce((a, u) => a + u.lessons.length, 0)} lessons · {all.length.toLocaleString()} questions</div></div>
        <div className="cprog"><Meter ok={tot.ok} bad={tot.done - tot.ok} total={tot.n} /><span className="stat-mini">{tot.done}/{tot.n} done</span>
          {resume && <a className="btn primary" href={href(subject, tid, resume.l.id)} title={resume.name}>{tot.done ? "Continue" : "Start"}: {resume.name}</a>}</div>
      </div>
      <div className="cunits">
        {d.units.map((u, ui) => {
          const us = stat(p.answers, u.lessons.flatMap((l) => l.ids));
          const names = lessonNames(u.lessons);
          return (
            <section key={u.name + ui} className="card concept cunit">
              <div className="chead"><span className="unum">{ui + 1}</span><h3 className="grow">{u.name}</h3><span className="stat-mini">{us.done}/{us.n}</span></div>
              <div className="lessons">
                {u.lessons.map((l, li) => {
                  const s = stat(p.answers, l.ids);
                  return (
                    <a key={l.id} className={"lrow" + tone(s)} href={href(subject, tid, l.id)} aria-label={names[li] + ", " + (s.done ? s.ok + " of " + s.n + " right" : l.ids.length + " questions, not started")}>
                      <span className="lno">{li + 1}</span>
                      <span className="ltxt"><b>{names[li]}</b>{l.test && names[li] === l.title && <small>{l.test}</small>}</span>
                      <span className="lmeta">{s.done ? s.ok + "/" + s.n + " right" : l.ids.length + " questions"}</span>
                    </a>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export function CourseLesson({ subject, tid, lid }) {
  const p = useProgress();
  const [d, err] = useData(() => courseTopic(subject, tid), [subject, tid]);
  const lessons = useMemo(() => (d ? d.units.flatMap((u, ui) => { const names = lessonNames(u.lessons); return u.lessons.map((l, li) => ({ ...l, unit: u.name, ui, name: names[li] })); }) : []), [d]);
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
  return (
    <Solve cls={"s-q " + SUBJ[subject]} open={tools} setOpen={setTools}
      crumbs={<><a href="#/course">Course</a><span>/</span><a href={back}>{d.name}</a><span>/</span><b>{lesson.unit}</b></>}
      rail={<div className="card">
        <div className="railhead"><span className="tile">{glyph(d.name)}</span><div><h3>{lesson.name}</h3><div className="muted small">{lesson.unit}</div></div></div>
        <div className="kv"><div><b>{s.ok}<small className="muted">/{s.done}</small></b><span>Right so far</span></div><div><b>{lesson.ids.length}</b><span>Questions</span></div></div>
        <div className="lessons" style={{ marginTop: 10 }}>
          {lessons.filter((l) => l.ui === lesson.ui).map((l, n) => <a key={l.id} className={"lrow sm" + (l.id === lid ? " now" : "") + tone(stat(p.answers, l.ids))} href={href(subject, tid, l.id)}><span className="lno">{n + 1}</span><span className="ltxt"><b>{l.name}</b></span></a>)}
        </div>
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
        <Solver q={qs[i]} refInfo={qs[i]._ref} head={"Q " + (i + 1) + " / " + qs.length} chips={[[subject === "quant" ? lesson.unit : lesson.name, "ac"], lesson.test]}
          onPrev={i > 0 ? () => setI(i - 1) : null}
          onNext={() => (i + 1 >= qs.length ? setEnd(true) : setI(i + 1))} nextLabel={i + 1 >= qs.length ? "Finish lesson" : "Next question"} />
      )}
    </Solve>
  );
}
