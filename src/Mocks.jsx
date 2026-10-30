import { useEffect, useMemo, useRef, useState } from "react";
import { SplitQ, Options, Solution, fmt, useKeys } from "./Question.jsx";
import { mockIndex, mockTest, useData, useProgress, saveMock, update } from "./store.js";
import { fits, profileLabel } from "./exams.js";
import { useScope } from "./Profile.jsx";
import { BackBtn, Facet, Checks, Switch, Dropdown, Chip, secClass, short, initials, Meter, pct, Loading, Failed, useView, ViewToggle } from "./ui.jsx";

const KINDS = [["pyq", "Previous years"], ["sectional", "Sectional Tests"], ["booster", "Score Boosters"]];
const NOTES = {
  pyq: "Full-length papers from earlier years of the IBPS, SBI, RRB and insurance exams, with the original pattern and cutoffs",
  sectional: "Day-wise sectional tests from the 2026 Prelims and Mains courses — one section at a time, timed",
  booster: "Prelims Score Booster and Mains Booster courses — short timed tests on the high-weightage topics",
};
const round = (x) => Math.round(x * 100) / 100;
const scoreChip = (r) => r && <span className={"chip " + (r.score / r.max >= 0.5 ? "ok" : "bad")}>Scored {round(r.score)}/{r.max}</span>;
const stageOf = (s) => (/mains/i.test(s || "") ? "Mains" : /prelim/i.test(s || "") ? "Prelims" : s || "");

/* "IBPS Clerk Mains Memory Based Mock Test (Held on 8th October 2023) Slot 1" → parts for an admit card */
function paper(t) {
  const held = (t.name.match(/Held on ([^)]*)\)/i) || [])[1];
  const slot = (t.name.match(/Slot\s*-?\s*(\d+)/i) || [])[1];
  const year = t.year || (held && (held.match(/20\d\d/) || [])[0]) || (t.name.match(/20\d\d/) || [])[0];
  let rest = t.name.replace(t.exam, "").replace(/\(Held on[^)]*\)/i, "").replace(/Memory Based (Mock Test|Paper)?/i, "").replace(/Slot\s*-?\s*\d+/i, "").replace(/\b(Prelims?|Mains)\b/i, "").replace(/20\d\d/, "").replace(/[\s\-–:]+/g, " ").trim();
  const when = held ? held.replace(/\b(\d+)(st|nd|rd|th)\b/i, "$1") : null;
  return { year, slot, when, extra: rest };
}

const done0 = (g, p) => g.tests.filter((t) => p.mocks[t.id]).length;

export function MockGroup({ gid, embedded }) {
  const p = useProgress();
  const [all] = useScope();
  const [ix] = useData(mockIndex, []);
  const [flt, setFlt] = useState([]);
  const [gq, setGq] = useState("");
  const [yrs, setYrs] = useState([]);
  const [prog, setProg] = useState("");
  const [dys, setDys] = useState([]);
  const [pick, setPick] = useState(null);
  /* the day dialog takes focus when it opens and gives it back to the day card when it closes */
  const closeBtn = useRef(null), opener = useRef(null);
  useEffect(() => {
    if (!pick) { opener.current?.focus(); return; }
    closeBtn.current?.focus();
    const f = (e) => e.key === "Escape" && setPick(null);
    addEventListener("keydown", f); return () => removeEventListener("keydown", f);
  }, [pick]);
  if (!ix) return <Loading />;
  const col = ix.collections.find((c) => c.groups.some((g) => g.id === gid));
  const g0 = col?.groups.find((x) => x.id === gid);
  const g = g0 && (col.kind === "booster" || all ? g0 : { ...g0, tests: g0.tests.filter((t) => fits(p.profile, t)) });
  if (!g || !g.tests.length) return <div className="page"><div className="empty">This test series is not available.</div></div>;
  const kindName = KINDS.find((k) => k[0] === col.kind)[1];
  const pyq = col.kind === "pyq";
  const facet = (t) => (pyq ? stageOf(t.stage) : t.section || "");
  const opts = {}; for (const t of g.tests) { const f = facet(t); if (f) opts[f] = (opts[f] || 0) + 1; }
  const yopts = {}; if (pyq) for (const t of g.tests) { const y = paper(t).year; if (y) yopts[y] = (yopts[y] || 0) + 1; }
  const dopts = {}; if (!pyq) for (const t of g.tests) { if (t.day) dopts[t.day] = (dopts[t.day] || 0) + 1; }
  const gl = gq.trim().toLowerCase();
  let tests = g.tests.filter((t) => (!flt.length || flt.includes(facet(t))) && (!yrs.length || yrs.includes(String(paper(t).year))) && (!dys.length || dys.includes(String(t.day))) && (!prog || (prog === "todo" ? !p.mocks[t.id] : !!p.mocks[t.id])) && (!gl || (t.name + " " + (t.section || "")).toLowerCase().includes(gl)));
  if (pyq) tests = [...tests].sort((a, b) => (+paper(b).year || 0) - (+paper(a).year || 0));
  const gActive = flt.length + yrs.length + dys.length + (prog ? 1 : 0) + (gq ? 1 : 0);
  const done = g.tests.filter((t) => p.mocks[t.id]).length;
  return (
    <div className={embedded ? "" : "page"}>
      {!embedded && <div className="crumbs"><BackBtn />{col.kind === "booster" ? <a href="#/booster">Booster</a> : <><a href="#/mocks">Mock Tests</a><span>/</span>{kindName}</>}<span>/</span><b>{g.name}</b></div>}
      {!embedded && <div className="head">
        <div><h1>{g.name}</h1><div className="sub">{g.tests.length} {pyq ? "memory-based papers" : "tests"} · {done} taken</div></div>
      </div>}
      <div className="toolbar oneline">
        <input className="search" aria-label="Search tests" placeholder="Search tests" value={gq} onChange={(e) => setGq(e.target.value)} />
        {Object.keys(opts).length > 1 && <Dropdown multi label={pyq ? "Exam stage" : "Section"} value={flt} onChange={setFlt} opts={Object.entries(opts).map(([k, n]) => [k, pyq ? k : short(k), n])} />}
        {pyq && Object.keys(yopts).length > 1 && <Dropdown multi label="Year" value={yrs} onChange={setYrs} opts={Object.entries(yopts).sort((a, b) => b[0] - a[0]).map(([k, n]) => [k, k, n])} />}
        {!pyq && Object.keys(dopts).length > 1 && <Dropdown multi label="Day" value={dys} onChange={setDys} opts={Object.entries(dopts).sort((a, b) => a[0] - b[0]).map(([k, n]) => [k, "Day " + k, n])} />}
        <Dropdown label="Progress" value={prog} onChange={setProg} opts={[["", "All"], ["todo", "Not taken", g.tests.length - done0(g, p)], ["done", "Taken", done0(g, p)]]} />
        {gActive > 0 && <button type="button" className="linkbtn" onClick={() => { setFlt([]); setYrs([]); setDys([]); setProg(""); setGq(""); }}>Clear</button>}
        <span className="grow" /><span className="muted small" aria-live="polite">{tests.length} of {g.tests.length} {pyq ? "papers" : "tests"}</span>
      </div>
      {pyq ? (
        <div className="grid wide">
          {tests.map((t) => {
            const x = paper(t), r = p.mocks[t.id];
            return (
              <a key={t.id} className={"card admit " + (stageOf(t.stage) === "Mains" ? "s-ga" : "s-b")} href={"#/mock/" + gid + "/" + t.id}>
                <div className="stub"><small>{t.exam}</small><b>{x.year || "PYQ"}</b><small>{stageOf(t.stage) || "Paper"}</small></div>
                <div className="body">
                  <div className="name">{[stageOf(t.stage), x.when || x.extra, x.slot && "Slot " + x.slot].filter(Boolean).join(" · ") || t.name}</div>
                  <div className="facts">
                    <span className="chip">{t.n} questions</span>
                    {t.time ? <span className="chip">{t.time} min</span> : null}
                    {t.marks ? <span className="chip">{t.marks} marks</span> : null}
                                      </div>
                  <div className="facts">{t.parts.map(([n, c]) => <span key={n} className={"chip " + secClass(n)}><i className="dot" />{short(n)} {c}</span>)}</div>
                  <div className="facts">{scoreChip(r) || <span className="muted small">Not attempted</span>}</div>
                </div>
              </a>
            );
          })}
        </div>
      ) : (
        <div className="grid wide">
          {Object.entries(tests.reduce((m, t) => ((m[t.day || 0] ||= []).push(t), m), {})).sort((x, y) => x[0] - y[0]).map(([day, ts0]) => {
            const ts = [...ts0].sort((x, y) => (/reason/i.test(y.section || "") ? 1 : 0) - (/reason/i.test(x.section || "") ? 1 : 0));
            const bothId = ts.map((t) => t.id).join("+"), bothR = ts.length > 1 ? p.mocks[bothId] : null;
            const nd = bothR ? ts.length : ts.filter((t) => p.mocks[t.id]).length;
            return (
              <button key={day} type="button" className="card admit daycard s-b" aria-haspopup="dialog" onClick={(e) => { opener.current = e.currentTarget; setPick({ day, ts, bothId, bothR }); }}>
                <div className="stub"><small>Day</small><b>{day}</b><small>{ts.length} {ts.length === 1 ? "section" : "sections"}</small></div>
                <div className="body">
                  <div className="name">{g.name.replace(/^IBPS RRB PO /, "")} · Day {day}</div>
                  <div className="facts">{ts.map((t) => <span key={t.id} className={"chip " + secClass(t.section || t.parts[0][0])}><i className="dot" />{short(t.section) || t.parts[0][0]} {t.n}</span>)}</div>
                  <div className="facts"><span className="chip">{ts.length > 1 ? "25 min each · 45 together" : (ts[0].time || 0) + " min"}</span>{nd ? <span className="chip ok">{nd}/{ts.length} taken</span> : <span className="muted small">Not attempted</span>}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
      {pick && (
        <div className="pickov" onClick={() => setPick(null)}>
          <div className="pickbox" role="dialog" aria-modal="true" aria-label={"Day " + pick.day} onClick={(e) => e.stopPropagation()}>
            <div className="pickhead"><div><small>{g.name.replace(/^IBPS RRB PO /, "")}</small><h3>Day {pick.day}</h3></div><button type="button" ref={closeBtn} className="btn ghost sm" onClick={() => setPick(null)}>Close</button></div>
            <div className="pickopts">
              {pick.ts.map((t) => {
                const r = p.mocks[t.id];
                return (
                  <a key={t.id} className={"pickopt " + secClass(t.section || t.parts[0][0])} href={"#/mock/" + gid + "/" + t.id}>
                    <i /><span className="grow"><b>{short(t.section) || t.parts[0][0]}</b><small>{t.n} questions · {t.time} min · {t.marks} marks</small></span>
                    <span className="pk-act">{r ? "Scored " + round(r.score) + "/" + r.max : "Start"}</span>
                  </a>
                );
              })}
              {pick.ts.length > 1 && (
                <a className="pickopt both" href={"#/mock/" + gid + "/" + pick.bothId}>
                  <i /><span className="grow"><b>Take both together</b><small>{pick.ts.map((t) => short(t.section) || t.parts[0][0]).join(" + ")} · {pick.ts.reduce((a, t) => a + t.n, 0)} questions · 45 min, one shared timer</small></span>
                  <span className="pk-act">{pick.bothR ? "Scored " + round(pick.bothR.score) + "/" + pick.bothR.max : "Start"}</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* the sectional tests of one day (two or three), taken together: one shared timer (boosters add the sections' times up) */
function mergeDay(ts) {
  const f = ts[0], lab = (x) => short(x.section) || (x.mock.section || "").split(" ")[0];
  const raw = ts.flatMap((x) => (x.mock.parts || x.mock.sections || []).map((s) => ({ ...s, time_min: null, _l: lab(x) })));
  const dup = (n) => raw.filter((s) => s.name === n).length > 1;
  const allParts = raw.map(({ _l, ...s }, i) => (dup(raw[i].name) && raw[i]._l ? { ...s, name: raw[i]._l + " · " + s.name } : s));
  const labs = ts.map(lab).join(" + "), day = f.mock.day || f.day || "";
  const total = f.kind !== "booster" && ts.length === 2 ? 45 : ts.reduce((a, x) => a + (x.mock.total_time_min || 0), 0);
  return { ...f, id: ts.map((x) => x.id).join("+"), name: (f.groupName || "") + " · Day " + day + " · " + (ts.length === 2 ? "both sections" : "all sections"), section: null,
    mock: { ...f.mock, parts: allParts, sections: undefined, sectional_timing: false, total_time_min: total, section: labs, name: (f.groupName || "") + " - Day " + day + " - " + labs, cutoff: null },
    questions: ts.flatMap((x) => x.questions) };
}

function shape(t) {
  const m = t.mock;
  const byId = new Map(t.questions.map((q) => [q.id, q]));
  const parts = (m.parts || m.sections || []).map((s) => ({
    name: s.name, time: s.time_min || null, mpq: s.marks_per_question ?? 1, neg: s.negative_marks ?? 0.25,
    cutoff: s.cutoff ?? null, qs: s.question_ids.map((id) => byId.get(id)).filter(Boolean),
  }));
  const all = parts.flatMap((p, pi) => p.qs.map((q) => ({ q, pi })));
  const sectional = m.sectional_timing === true || (t.kind !== "pyq" && parts.length > 1 && parts.every((p) => p.time));
  const total = (m.total_time_min || parts.reduce((s, p) => s + (p.time || 0), 0) || Math.ceil(all.length * 0.6)) * 60;
  return { m, parts, all, sectional, total };
}
function score(T, answers) {
  const parts = T.parts.map((p) => {
    let right = 0, wrong = 0;
    for (const q of p.qs) { const a = answers[q.id]; if (a) a === q.correct_option ? right++ : wrong++; }
    return { name: p.name, n: p.qs.length, right, wrong, skipped: p.qs.length - right - wrong, score: right * p.mpq - wrong * p.neg, max: p.qs.length * p.mpq, cutoff: p.cutoff };
  });
  const sum = (k) => parts.reduce((s, x) => s + x[k], 0);
  return { parts, right: sum("right"), wrong: sum("wrong"), skipped: sum("skipped"), score: round(sum("score")), max: sum("max") };
}

function Pattern({ T, r }) {
  return (
    <div className="card flush">
      <table className="pattern">
        <thead>{r
          ? <tr><th>Section</th><th>Correct</th><th>Wrong</th><th>Skipped</th><th>Score</th><th>Accuracy</th><th>Sectional cutoff</th></tr>
          : <tr><th>Section</th><th>Questions</th><th>Marks</th><th>Time</th><th>Marking</th><th>Sectional cutoff</th></tr>}</thead>
        <tbody>{T.parts.map((x, i) => {
          const s = r?.parts[i];
          return r ? (
            <tr key={i}><td><span className={"secname " + secClass(x.name)}><i />{x.name}</span></td><td className="okc">{s.right}</td><td className="badc">{s.wrong}</td><td>{s.skipped}</td>
              <td className="mono"><b>{round(s.score)}</b> / {s.max}</td><td>{pct(s.right, s.right + s.wrong)}%</td>
              <td>{s.cutoff == null ? "—" : <span className={"chip " + (s.score >= s.cutoff ? "ok" : "bad")}>{s.cutoff} · {s.score >= s.cutoff ? "Cleared" : "Missed"}</span>}</td></tr>
          ) : (
            <tr key={i}><td><span className={"secname " + secClass(x.name)}><i />{x.name}</span></td><td>{x.qs.length}</td><td>{x.qs.length * x.mpq}</td><td>{x.time ? x.time + " min" : "—"}</td>
              <td className="mono">+{x.mpq} / −{x.neg}</td><td>{x.cutoff ?? "—"}</td></tr>
          );
        })}</tbody>
      </table>
    </div>
  );
}

function Hero({ T, t, children }) {
  const m = T.m;
  const x = paper({ name: m.name, exam: m.exam || t.groupName, year: m.year });
  const stage = stageOf(m.exam_stage || m.stage);
  return (
    <div className={"card admit hero " + (t.kind === "pyq" ? (stage === "Mains" ? "s-ga" : "s-b") : secClass(m.section || T.parts[0]?.name))}>
      <div className="stub"><small>{m.exam || t.groupName}</small><b>{t.kind === "pyq" ? x.year || "PYQ" : m.day ? "Day " + m.day : "Test"}</b><small>{stage || (t.kind === "pyq" ? "Paper" : short(m.section))}</small></div>
      <div className="body">
        <h1>{m.name}</h1>
        <div className="facts">
          <span className="chip">{T.all.length} questions</span>
          <span className="chip">{T.parts.reduce((a, p) => a + p.qs.length * p.mpq, 0)} marks</span>
          <span className="chip">{Math.round(T.total / 60)} minutes</span>
          <span className="chip">{T.sectional ? "Sectional timing — each section locks when its time ends" : "Composite time — move freely between sections"}</span>
          {T.parts[0] && <span className="chip bad">−{T.parts[0].neg} per wrong answer</span>}
          {m.cutoff ? <span className="chip warn">Overall cutoff {m.cutoff}</span> : null}
          {m.exam_date && <span className="chip">Held {m.exam_date}</span>}
        </div>
        {children}
      </div>
    </div>
  );
}

export function MockTest({ gid, mid }) {
  const p = useProgress();
  const [t, err] = useData(() => (mid.includes("+") ? Promise.all(mid.split("+").map((i) => mockTest(gid, i))).then(mergeDay) : mockTest(gid, mid)), [gid, mid]);
  const T = useMemo(() => (t ? shape(t) : null), [t]);
  const [mode, setMode] = useState("intro");
  const [result, setResult] = useState(null);
  const saved = (() => { try { return JSON.parse(localStorage.getItem("ap-run-" + mid) || "null"); } catch { return null; } })();
  if (err) return <Failed what="the test" err={err} />;
  if (!T) return <Loading />;
  const last = p.mocks[mid];
  const fresh = () => { try { localStorage.removeItem("ap-run-" + mid); } catch {} setMode("run"); };

  if (mode === "run") return <Runner T={T} gid={gid} mid={mid} resume={saved} onSubmit={(r) => { setResult(r); setMode("result"); }} />;
  if (mode === "review") return <Review T={T} answers={(result || last).answers} onBack={() => setMode("result")} />;
  if (mode === "result") return <Result T={T} t={t} r={result || last} gid={gid} onReview={() => setMode("review")} onRetake={() => { setResult(null); fresh(); }} />;
  return (
    <div className="page">
      <div className="crumbs"><BackBtn /><a href={t.kind === "booster" ? "#/booster" : "#/mocks"}>{t.kind === "booster" ? "Booster" : "Mock Tests"}</a><span>/</span><a href={t.kind === "booster" ? "#/booster" : "#/mocks/" + gid}>{t.groupName}</a><span>/</span><b>Instructions</b></div>
      <Hero T={T} t={t}>
        <div className="actions">
          {saved ? <><button className="btn primary" onClick={() => setMode("run")}>Resume test · {Object.keys(saved.answers || {}).length} answered</button><button className="btn" onClick={fresh}>Start over</button></>
            : <button className="btn primary" onClick={() => setMode("run")}>Start test</button>}
          {last && <button className="btn ghost" onClick={() => setMode("result")}>Last attempt: {round(last.score)} / {last.max}</button>}
        </div>
      </Hero>
      <h2 className="sechead">Exam pattern</h2>
      <Pattern T={T} />
      <div className="card pad notes">
        <h3>Before you start</h3>
        <div className="noterow"><span><kbd>A–E</kbd> select an option</span><span><kbd>↵</kbd> save & next</span><span><kbd>M</kbd> mark for review & next</span><span><kbd>C</kbd> clear response</span><span><kbd>←</kbd> previous question</span></div>
        <p className="muted small">Your answers are saved as you go — you can close the tab and resume. Wrong answers go to Revise mistakes after you submit.</p>
      </div>
    </div>
  );
}

function Runner({ T, gid, mid, resume, onSubmit }) {
  const [answers, setAnswers] = useState(resume?.answers || {});
  const [marked, setMarked] = useState(resume?.marked || {});
  const [seen, setSeen] = useState(resume?.seen || {});
  const [cur, setCur] = useState(resume?.cur || 0);
  const [part, setPart] = useState(resume?.part || 0);
  const [el, setEl] = useState(resume?.el || 0);
  const [used, setUsed] = useState(resume?.used || 0);
  const [ask, setAsk] = useState(false);
  const done = useRef(false);
  const item = T.all[cur];
  const P = T.parts[item.pi];
  const limit = T.sectional ? (T.parts[part].time || 0) * 60 : T.total;
  const left = Math.max(0, limit - el);

  useEffect(() => { const id = setInterval(() => setEl((x) => x + 1), 1000); return () => clearInterval(id); }, []);
  useEffect(() => { setSeen((s) => (s[item.q.id] ? s : { ...s, [item.q.id]: 1 })); }, [cur]);
  useEffect(() => { try { localStorage.setItem("ap-run-" + mid, JSON.stringify({ answers, marked, seen, cur, part, el, used, at: Date.now() })); } catch {} }, [answers, marked, cur, part, el]);
  useEffect(() => { if (left <= 0 && !done.current) (T.sectional && part + 1 < T.parts.length ? nextPart() : submit()); }, [left]);

  function nextPart() {
    const np = part + 1;
    setUsed((u) => u + el); setEl(0); setPart(np);
    setCur(T.all.findIndex((x) => x.pi === np));
  }
  function submit() {
    if (done.current) return; done.current = true;
    const r = { ...score(T, answers), secs: used + el, at: Date.now(), answers };
    saveMock(mid, r);
    update((p) => {
      for (const { q } of T.all) {
        const a = answers[q.id];
        if (!a) continue;
        p.answers[q.id] = { ok: a === q.correct_option, t: 0, at: Date.now() };
        p.review = p.review.filter((x) => x.id !== q.id);
        if (a !== q.correct_option) p.review.unshift({ id: q.id, topic: q.topic || q.section, at: Date.now(), kind: "mock", group: gid, mock: mid });
      }
    });
    try { localStorage.removeItem("ap-run-" + mid); } catch {}
    onSubmit(r);
  }
  const canGo = (i) => i >= 0 && i < T.all.length && (!T.sectional || T.all[i].pi === part);
  const go = (i) => canGo(i) && setCur(i);
  const lastInPart = cur + 1 >= T.all.length || T.all[cur + 1].pi !== item.pi;
  const saveNext = () => { if (lastInPart && T.sectional && part + 1 < T.parts.length) nextPart(); else if (cur + 1 < T.all.length) go(cur + 1); else setAsk(true); };
  const markNext = () => { setMarked((m) => ({ ...m, [item.q.id]: !m[item.q.id] })); if (cur + 1 < T.all.length && canGo(cur + 1)) go(cur + 1); };
  const pick = (k) => setAnswers((a) => ({ ...a, [item.q.id]: k }));
  const clear = () => setAnswers((a) => { const b = { ...a }; delete b[item.q.id]; return b; });
  /* while the submit box is open, keys must not change answers behind it; Escape closes it */
  useKeys(ask ? { Escape: () => setAsk(false) } : { pick, Enter: saveNext, ArrowRight: saveNext, ArrowLeft: () => go(cur - 1), m: markNext, c: clear }, [cur, answers, marked, part, ask]);
  const status = (x) => [answers[x.q.id] ? "answered" : seen[x.q.id] ? "not answered" : "not visited", marked[x.q.id] && "marked for review"].filter(Boolean).join(", ");

  const inPart = T.all.map((x, i) => ({ ...x, i })).filter((x) => x.pi === item.pi);
  const n = (f) => inPart.filter(f).length;
  const jump = (f) => { const a = inPart.filter((x) => canGo(x.i)); const nx = a.find((x) => x.i > cur && f(x)) || a.find((x) => x.i !== cur && f(x)); if (nx) go(nx.i); };
  return (
    <div className={"mock " + secClass(P.name)}>
      <div className="mocktop">
        <div className="grow name">{T.m.name}</div>
        <span className={"timer" + (left < 60 ? " low" : "")} role="timer" aria-label={"Time left" + (T.sectional ? " in " + P.name : "") + ": " + fmt(left)}>{T.sectional ? P.name + " · " : ""}{fmt(left)}</span>
        <button className="btn primary sm" onClick={() => setAsk(true)}>Submit</button>
      </div>
      {T.parts.length > 1 && (
        <div className="secTabs">
          {T.parts.map((x, pi) => (
            <button key={pi} className={pi === item.pi ? "on" : ""} disabled={T.sectional && pi !== part}
              onClick={() => go(T.all.findIndex((y) => y.pi === pi))}>{x.name}</button>
          ))}
        </div>
      )}
      <div className="mockbody">
        <div className="mockq">
          <div className="qhead">
            <span className="qno">Question {cur + 1}</span>
            <span className="chip ok">+{P.mpq}</span><span className="chip bad">−{P.neg}</span><span className={"chip " + secClass(P.name)}>{P.name}</span>
            {marked[item.q.id] && <span className="chip warn">Marked for review</span>}
          </div>
          <SplitQ q={item.q}><Options q={item.q} picked={answers[item.q.id]} onPick={pick} reveal={false} /></SplitQ>
        </div>
        <aside className="palette">
          <div className="lbl">{P.name}</div>
          <div className="pgrid">
            {inPart.map((x) => (
              <button key={x.q.id} disabled={!canGo(x.i)} onClick={() => go(x.i)} aria-label={"Question " + (x.i + 1) + ", " + status(x)} aria-current={x.i === cur ? "step" : undefined}
                className={"pnum" + (answers[x.q.id] ? " ans" : seen[x.q.id] ? " seen" : "") + (marked[x.q.id] ? " mark" : "") + (x.i === cur ? " now" : "")}>{x.i + 1}</button>
            ))}
          </div>
          <div className="jumps">
            <button type="button" className="btn sm" onClick={() => jump((x) => !answers[x.q.id])}>Next unanswered</button>
            <button type="button" className="btn sm" onClick={() => jump((x) => marked[x.q.id])}>Next marked</button>
          </div>
          <div className="legend">
            <span><i className="ans" /> Answered {n((x) => answers[x.q.id])}</span>
            <span><i className="seen" /> Not answered {n((x) => seen[x.q.id] && !answers[x.q.id])}</span>
            <span><i className="mark" /> Marked {n((x) => marked[x.q.id])}</span>
            <span><i /> Not visited {n((x) => !seen[x.q.id])}</span>
          </div>
        </aside>
      </div>
      <div className="mockbar">
        <button className="btn" onClick={markNext}>{marked[item.q.id] ? "Unmark" : "Mark for review"} & next <kbd>M</kbd></button>
        <button className="btn ghost" onClick={clear} disabled={!answers[item.q.id]}>Clear <kbd>C</kbd></button>
        <span className="grow" />
        <button className="btn ghost" disabled={!canGo(cur - 1)} onClick={() => go(cur - 1)}>← Previous</button>
        <button className="btn primary" onClick={saveNext}>{lastInPart && T.sectional && part + 1 < T.parts.length ? "Next part" : cur + 1 < T.all.length ? "Save & next" : "Finish"} <kbd>↵</kbd></button>
      </div>
      {ask && (
        <div className="dialog" onClick={() => setAsk(false)}>
          <div className="box" role="alertdialog" aria-modal="true" aria-labelledby="submit-title" onClick={(e) => e.stopPropagation()}>
            <h2 id="submit-title">Submit the test?</h2>
            <p>{Object.keys(answers).length} of {T.all.length} answered · {Object.values(marked).filter(Boolean).length} marked for review{T.sectional && part + 1 < T.parts.length ? " · the remaining parts close too" : ""}.</p>
            <div className="actions"><button className="btn primary" onClick={submit}>Submit</button><button className="btn ghost" autoFocus onClick={() => setAsk(false)}>Keep going</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function Result({ T, t, r, gid, onReview, onRetake }) {
  const then = (() => { try { const v = JSON.parse(sessionStorage.getItem("ap-then") || "null"); return v && v.from === t.id ? v : null; } catch { return null; } })();
  const att = r.right + r.wrong;
  const cut = T.m.cutoff;
  return (
    <div className="page">
      <div className="crumbs"><BackBtn /><a href={t.kind === "booster" ? "#/booster" : "#/mocks"}>{t.kind === "booster" ? "Booster" : "Mock Tests"}</a><span>/</span><a href={t.kind === "booster" ? "#/booster" : "#/mocks/" + gid}>{t.groupName}</a><span>/</span><b>Scorecard</b></div>
      <Hero T={T} t={t}>
        <div className="actions">
          {then && <a className="btn primary" href={"#/mock/" + gid + "/" + then.to} onClick={() => { try { sessionStorage.removeItem("ap-then"); } catch {} }}>Next: {then.label} test →</a>}
          <button className={"btn" + (then ? "" : " primary")} onClick={onReview}>Review answers & solutions</button>
          <button className="btn" onClick={onRetake}>Reattempt</button>
          <a className="btn ghost" href="#/mistakes">Revise mistakes</a>
        </div>
      </Hero>
      <div className="statrow">
        <div className={"card glow " + (cut == null ? "s-b" : r.score >= cut ? "s-r" : "s-e")}><b>{round(r.score)}<small className="muted"> / {r.max}</small></b><span>{cut == null ? "Total score" : r.score >= cut ? "Cleared the cutoff of " + cut : "Below the cutoff of " + cut}</span></div>
        <div className="card"><b><span className="okc">{r.right}</span> <small className="muted">·</small> <span className="badc">{r.wrong}</span> <small className="muted">·</small> {r.skipped}</b><span>Correct · wrong · skipped</span></div>
        <div className="card"><b>{pct(r.right, att)}%</b><span>Accuracy on {att} attempted</span></div>
        <div className="card"><b>{round(r.wrong * (T.parts[0]?.neg ?? 0.25))}</b><span>Marks lost to negative marking</span></div>
        {r.secs != null && <div className="card"><b>{fmt(r.secs)}</b><span>Time used of {Math.round(T.total / 60)} min</span></div>}
      </div>
      <h2 className="sechead">Sectional analysis</h2>
      <Pattern T={T} r={r} />
    </div>
  );
}

function Review({ T, answers, onBack }) {
  const [show, setShow] = useState([]);
  const list = T.all.map((x, i) => ({ ...x, i, a: answers[x.q.id] })).filter((x) =>
    !show.length || show.includes(!x.a ? "skipped" : x.a === x.q.correct_option ? "right" : "wrong"));
  const [k, setK] = useState(0);
  const x = list[Math.min(k, list.length - 1)];
  useKeys({ ArrowRight: () => setK((v) => Math.min(v + 1, list.length - 1)), Enter: () => setK((v) => Math.min(v + 1, list.length - 1)), ArrowLeft: () => setK((v) => Math.max(0, v - 1)) }, [list.length]);
  return (
    <div className="mock">
      <div className="mocktop">
        <button className="btn ghost sm" onClick={onBack}>← Result</button>
        <div className="grow name">Review · {T.m.name}</div>
      </div>
      <div className="toolbar" style={{ padding: "6px 14px" }}><Dropdown multi label="Show" value={show} onChange={(v) => { setShow(v); setK(0); }} opts={[["wrong", "Wrong"], ["skipped", "Skipped"], ["right", "Correct"]]} />
        {show.length > 0 && <button type="button" className="linkbtn" onClick={() => { setShow([]); setK(0); }}>All answers</button>}
        <span className="grow" /><span className="muted small" aria-live="polite">{list.length} of {T.all.length}</span>
      </div>
      {!x ? <div className="page"><div className="empty">Nothing in this filter.</div></div> : (
        <>
          <div className="mockbody">
            <div className="mockq">
              <div className="qhead">
                <span className="qno">Q{x.i + 1}</span><span className={"chip " + secClass(T.parts[x.pi].name)}>{T.parts[x.pi].name}</span>
                <span className={"chip " + (!x.a ? "" : x.a === x.q.correct_option ? "ok" : "bad")}>{!x.a ? "Skipped" : x.a === x.q.correct_option ? "Correct" : "You chose " + x.a}</span>
              </div>
              <SplitQ q={x.q}>
                <Options q={x.q} picked={x.a || x.q.correct_option} onPick={() => {}} />
                <Solution q={x.q} />
              </SplitQ>
            </div>
            <aside className="palette">
              <div className="lbl">{list.length} questions</div>
              <div className="pgrid">
                {list.map((y, j) => (
                  <button key={y.q.id} className={"pnum " + (!y.a ? "" : y.a === y.q.correct_option ? "okn" : "badn") + (j === k ? " now" : "")} onClick={() => setK(j)}>{y.i + 1}</button>
                ))}
              </div>
            </aside>
          </div>
          <div className="mockbar">
            <span className="grow" />
            <button className="btn ghost" disabled={k === 0} onClick={() => setK(k - 1)}>← Previous</button>
            <button className="btn primary" disabled={k + 1 >= list.length} onClick={() => setK(k + 1)}>Next <kbd>↵</kbd></button>
          </div>
        </>
      )}
    </div>
  );
}
