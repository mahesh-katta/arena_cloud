import { useEffect, useMemo, useState } from "react";
import { bankIndex, speedIndex, mockIndex, useData, useProgress, readPos, readSpos, setExamDate, LEVELS } from "./store.js";
import { boosterFor, fits } from "./exams.js";
import { Illustration, Rotator, WeekChart, greeting, useWeek } from "./Dash.jsx";
import { Ring, short, secClass, pct, Loading, Failed, useView } from "./ui.jsx";
import { ICONS } from "./Icons.jsx";

/* The home screen: greeting, a rotating "continue" strip, one row per area (Practice, Speed, Mock, Booster),
   two big numbers, the weekly chart and a "share a speed trick" card. It only reads progress; it never writes it. */

const STARTERS = ["simplification", "approximation", "number series"];
const round = (x) => Math.round(x * 100) / 100;
const countSets = (lv) => Object.values(lv).reduce((a, x) => a + Object.keys(x).length, 0);
const chapterSets = (t) => Object.values(t.subtopics).reduce((a, lv) => a + countSets(lv), 0);

/* A streak day needs all four: a mock, 100 practice questions, 10 speed-drill questions and a booster test. */
const GOAL = { mock: 1, practice: 100, speed: 10, booster: 1 };
const GOALS = [["mock", "Mock test", "mock"], ["practice", "Practice questions", "questions"], ["speed", "Speed drill questions", "questions"], ["booster", "Booster test", "test"]];
const DAYMS = 86400000;
/* one short exam tip a day for the greeting (shown on taller screens) */
const TIPS = ["In seating puzzles, place the fixed person first.", "Skip a DI set after 90 seconds; come back later.", "Simplification: approximate first, then pick the closest option.", "Read the last line of an RC question before the passage.", "Learn squares to 30 and cubes to 20 to save seconds."];
const sod = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
function dayLog(p, bankIds, boosterIds) {
  const log = {};
  const at = (t) => (log[sod(t)] ||= { mock: 0, practice: 0, speed: 0, booster: 0 });
  for (const a of Object.values(p.answers)) if (a.at && a.f && bankIds.has(a.f)) at(a.at).practice++;
  for (const r of Object.values(p.speed)) if (r.at) at(r.at).speed += r.total || 0;
  for (const [id, r] of Object.entries(p.mocks)) if (r.at) at(r.at)[boosterIds.has(id) ? "booster" : "mock"]++;
  for (const r of Object.values(p.glat)) if (r.at) at(r.at).booster++;
  return log;
}
const metAll = (d) => !!d && Object.keys(GOAL).every((k) => d[k] >= GOAL[k]);
function streakOf(log) {
  const today = sod(Date.now());
  let n = 0;
  for (let t = metAll(log[today]) ? today : today - DAYMS; metAll(log[t]); t -= DAYMS) n++;
  return n;
}
const parseDay = (s) => { const [y, m, d] = (s || "").split("-").map(Number); return y ? new Date(y, m - 1, d).getTime() : 0; };

/* an unfinished mock run saved in this browser (same rule as the Mock Tests page) */
export function findResume(groups, p) {
  let best = null;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith("ap-run-")) continue;
      const id = k.slice(7), v = JSON.parse(localStorage.getItem(k) || "null");
      if (!v || p.mocks[id] || (best && (v.at || 0) <= best.at)) continue;
      for (const g of groups) { const t = g.tests.find((x) => x.id === id); if (t) best = { at: v.at || 0, g, t, left: Object.keys(v.answers || {}).length }; }
    }
  } catch {}
  return best;
}

export function Home() {
  const p = useProgress();
  const week = useWeek();
  const [lay, setLay] = useView("ap-home-lay", "list");
  const [tileStyle, setTileStyle] = useView("ap-tiles-variant", "v1");
  const [bx, berr] = useData(bankIndex, []);
  const [sx, serr] = useData(speedIndex, []);
  const [mx, merr] = useData(mockIndex, []);
  const pos = useMemo(readPos, []);
  const stats = useMemo(() => {
    const m = {};
    for (const a of Object.values(p.answers)) {
      if (!a.f) continue;
      const s = (m[a.f] ||= { done: 0, ok: 0, last: 0 });
      s.done++; if (a.ok) s.ok++; if (a.at > s.last) s.last = a.at;
    }
    return m;
  }, [p.answers]);
  if (berr) return <Failed what="the question bank" err={berr} />;
  if (!bx || (!sx && !serr) || (!mx && !merr)) return <Loading />;

  /* ---- practice ---- */
  const all = bx.sections.flatMap((x) => x.topics.map((t) => ({ ...t, sec: x.name })));
  const ids = new Set(all.map((t) => t.id));
  const mine = Object.values(p.answers).filter((a) => a.f && ids.has(a.f));
  const doneQ = mine.length, okQ = mine.filter((a) => a.ok).length;
  const totalQ = all.reduce((a, t) => a + t.n, 0);
  const seen = (t) => Math.max(stats[t.id]?.last || 0, pos[t.id]?.at || 0);
  const recent = all.filter(seen).sort((a, b) => seen(b) - seen(a));
  const start = STARTERS.map((n) => all.find((t) => t.topic.toLowerCase().includes(n))).find(Boolean) || all[0];
  const practiceItem = (t, i) => {
    const st = stats[t.id], d = st?.done || 0, ps = pos[t.id];
    return {
      key: "p" + t.id, kind: "practice", cls: secClass(t.sec), tag: "Topic Practice",
      label: recent.length ? (i === 0 ? "Continue practising" : "Recently practised") : "Start here",
      title: t.topic,
      sub: (ps && ps.i > 0 ? "Question " + Math.min(ps.i + 1, ps.n || t.n) + " of " + (ps.n || t.n) + " · " : "") + short(t.sec),
      pct: t.n ? (100 * d) / t.n : 0,
      m1: [d + "/" + t.n.toLocaleString(), "done"], m2: [(d ? pct(st.ok, d) : 0) + "%", "accuracy"],
      href: "#/practice/" + t.id, cta: d || (ps && ps.i) ? "Continue" : "Start",
    };
  };
  const practiceList = (recent.length ? recent.slice(0, 2) : start ? [start] : []).map(practiceItem);

  /* ---- speed drills: latest two chapters you drilled, else the first chapter ---- */
  const spos = readSpos();
  const speedItem = (t, rec, i, prog) => {
    const mineS = Object.entries(p.speed).filter(([k]) => k.startsWith(t.id + "|"));
    const right = mineS.reduce((a, [, r]) => a + r.right, 0), tot = mineS.reduce((a, [, r]) => a + r.total, 0);
    const sets = chapterSets(t);
    return {
      key: "s" + t.id, kind: "speed", cls: "s-q", tag: "Speed Drills",
      label: prog ? "Unfinished speed drill" : rec ? (i === 0 ? "Last speed drill" : "Earlier speed drill") : "Start a speed drill",
      title: t.topic,
      sub: prog ? prog.sub + " · " + (LEVELS[prog.lvl] || prog.lvl) + " · " + (prog.set === "all" ? "All questions" : "Set " + prog.set) + " · Question " + (prog.i + 1) + " of " + prog.n : rec ? rec.sub + " · " + (LEVELS[rec.lvl] || rec.lvl) + " · " + (rec.n === "all" ? "All questions" : "Set " + rec.n) + " · " + rec.r.right + "/" + rec.r.total : Object.keys(t.subtopics).length + (Object.keys(t.subtopics).length === 1 ? " concept · " : " concepts · ") + t.n.toLocaleString() + " questions",
      pct: rec ? (100 * rec.r.right) / (rec.r.total || 1) : 0,
      m1: [mineS.length + "/" + sets, "sets"], m2: [(tot ? pct(right, tot) : 0) + "%", "accuracy"],
      href: prog ? "#/speed/" + t.id + "/run?sub=" + encodeURIComponent(prog.sub) + "&lvl=" + prog.lvl + "&set=" + prog.set : "#/speed/" + t.id, cta: prog || rec ? "Continue" : "Start",
    };
  };
  let speedList = [];
  if (sx) {
    const byT = Object.fromEntries(sx.topics.map((t) => [t.id, t]));
    const used = new Set();
    /* a set you started but did not finish counts as your latest drill if it is newer than the last finished one */
    const lastDone = Math.max(0, ...Object.values(p.speed).map((r) => r.at || 0));
    const live = Object.entries(spos).filter(([tid, v]) => byT[tid] && v && v.at > lastDone).sort((a, b) => b[1].at - a[1].at)[0];
    if (live) { used.add(live[0]); speedList.push(speedItem(byT[live[0]], null, 0, live[1])); }
    for (const [k, r] of Object.entries(p.speed).sort((a, b) => (b[1].at || 0) - (a[1].at || 0))) {
      const [tid, sub, lvl, n] = k.split("|");
      if (!byT[tid] || used.has(tid)) continue;
      used.add(tid);
      speedList.push(speedItem(byT[tid], { sub, lvl, n, r }, speedList.length));
      if (speedList.length === 2) break;
    }
    /* no history yet: open the first chapter that has the full Easy → Moderate ladder (a few chapters only have Pattern sets) */
    const full = (t) => Object.values(t.subtopics).some((lv) => lv.easy || lv.easy_to_moderate || lv.moderate);
    const first = sx.topics.find(full) || sx.topics[0];
    if (!speedList.length && first) speedList = [speedItem(first, null, 0)];
  }

  /* ---- mock tests: the latest result or unfinished run, else the first paper group ---- */
  const cols = mx ? mx.collections.filter((c) => c.kind !== "booster").map((c) => ({ ...c, groups: c.groups.map((g) => ({ ...g, tests: g.tests.filter((t) => fits(p.profile, t)) })).filter((g) => g.tests.length) })) : [];
  const groups = cols.flatMap((c) => c.groups);
  let last = null;
  for (const g of groups) for (const t of g.tests) { const r = p.mocks[t.id]; if (r && (!last || (r.at || 0) > last.at)) last = { at: r.at || 0, g, t, r }; }
  const resume = findResume(groups, p);
  const taken = (g) => g.tests.filter((t) => p.mocks[t.id]).length;
  let mockItem;
  if (resume && (!last || resume.at > last.at)) {
    const { g, t, left } = resume;
    mockItem = { key: "m" + t.id, kind: "mocks", cls: "s-b", tag: "Mock Tests", label: "Unfinished mock test", title: g.name, sub: "In progress · " + left + " answered · your answers are saved", pct: 0, m1: [taken(g) + "/" + g.tests.length, "taken"], m2: ["–", "last score"], href: "#/mock/" + g.id + "/" + t.id, cta: "Resume" };
  } else if (last) {
    const { g, t, r } = last, sc = r.max ? (100 * r.score) / r.max : 0;
    mockItem = { key: "m" + t.id, kind: "mocks", cls: "s-b", tag: "Mock Tests", label: "Last mock test", title: g.name, sub: t.name + " · Scored " + round(r.score) + "/" + r.max, pct: sc, m1: [taken(g) + "/" + g.tests.length, "taken"], m2: [Math.round(sc) + "%", "last score"], href: "#/mocks/" + g.id, cta: "Open" };
  } else if (groups[0]) {
    const g = groups[0];
    mockItem = { key: "m" + g.id, kind: "mocks", cls: "s-b", tag: "Mock Tests", label: "Start a mock test", title: g.name, sub: g.tests.length + " tests", pct: 0, m1: ["0/" + g.tests.length, "taken"], m2: ["–", "last score"], href: "#/mocks/" + g.id, cta: "Start" };
  } else {
    mockItem = { key: "m", kind: "mocks", cls: "s-b", tag: "Mock Tests", label: "Mock tests", title: "Mock Tests", sub: "Previous year papers and sectional tests", pct: 0, m1: ["–", "taken"], m2: ["–", "last score"], href: "#/mocks", cta: "Open" };
  }

  /* ---- booster: the next test of the course that fits your profile ---- */
  const bGroups = mx ? (mx.collections.find((c) => c.kind === "booster") || { groups: [] }).groups : [];
  const bg = boosterFor(p.profile, bGroups)[0];
  const bNext = bg && bg.tests.find((t) => !p.mocks[t.id]);
  const bTaken = bg ? taken(bg) : 0;
  const boosterItem = {
    key: "b", kind: "booster", cls: "s-b", tag: "Booster", label: "Score booster",
    title: bg ? bg.name : "Booster",
    sub: bNext ? "Day " + bNext.day + " · " + bNext.section + " · " + bNext.n + " questions" : bg ? "All tests taken" : "Score booster plans",
    pct: bg ? (100 * bTaken) / bg.tests.length : 0,
    m1: [bg ? bTaken + "/" + bg.tests.length : "–", "tests"], m2: [bNext ? "Day " + bNext.day : "–", "next"],
    href: bNext ? "#/mock/" + bg.id + "/" + bNext.id : "#/booster", cta: bTaken ? "Continue" : "Start",
  };
  /* a booster test you started but did not finish: Resume it */
  const bRun = findResume(bGroups, p);
  if (bRun) {
    Object.assign(boosterItem, { label: "Unfinished booster test", sub: "In progress · " + (bRun.t.day ? "Day " + bRun.t.day + " · " : "") + bRun.left + " answered · your answers are saved", href: "#/mock/" + bRun.g.id + "/" + bRun.t.id, cta: "Continue" });
  }

  const bIds = new Set(bGroups.flatMap((g) => g.tests.map((t) => t.id)));
  const log = dayLog(p, ids, bIds);
  const today = log[sod(Date.now())] || { mock: 0, practice: 0, speed: 0, booster: 0 };
  const streak = streakOf(log);
  const examT = parseDay(p.profile && p.profile.examDate);
  const examDays = examT ? Math.round((examT - sod(Date.now())) / DAYMS) : null;
  const examName = p.profile ? p.profile.examName : "your exam";

  /* one search over every area; each result says where it lives and opens that area's page (never a question or a test) */
  const subs = (o) => Object.keys(o || {}).filter(Boolean);
  const uniq = (a) => [...new Set(a.filter(Boolean))];
  const searchIndex = [
    ...all.map((t) => ({ name: t.topic, area: "Practice", tag: short(t.sec), terms: subs(t.subtopics), href: "#/practice/" + t.id })),
    ...(sx ? sx.topics.map((t) => ({ name: t.topic, area: "Speed Drills", tag: "", terms: subs(t.subtopics), href: "#/speed/" + t.id })) : []),
    ...groups.map((g) => ({ name: g.name, area: "Mock Tests", tag: g.tests.length + " tests", terms: uniq(g.tests.flatMap((t) => [t.name, t.exam, t.section])), href: "#/mocks/" + g.id })),
    ...bGroups.map((g) => ({ name: g.name, area: "Booster", tag: g.tests.length + " tests", terms: uniq(g.tests.flatMap((t) => [t.section, t.day ? "day " + t.day : ""])), href: "#/mocks/" + g.id })),
  ];

  const rows = [practiceList[0], speedList[0], mockItem, boosterItem].filter(Boolean);
  /* rotating strip: 2 practice topics, 1 mock, 2 speed drills */
  const strip = [...practiceList, mockItem, ...speedList].filter((x) => x.href !== "#/mocks");
  const slides = strip.map((it) => <Slide key={it.key} it={it} />);

  return (
    <div className="page home">
      <div className="dash">
        <div className="dash-main">
          <div className="card greet">
            <div className="greet-txt">
              <div className="g-date">{new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</div>
              <h1>{greeting(p.user && p.user.name)}</h1>
              <p>{examDays > 0 ? <><b>{examDays} {examDays === 1 ? "day" : "days"}</b> to {examName}. Small steps every day add up.</> : "It’s good to see you again."}</p>
              <div className="g-tip">Tip · {TIPS[Math.floor(Date.now() / DAYMS) % TIPS.length]}</div>
              <div className="gchips">
                {streak > 0 && <span className="chip">{streak}-day streak</span>}
                {p.review.length > 0 && <a className="chip" href="#/mistakes">Revise {p.review.length} mistake{p.review.length === 1 ? "" : "s"}</a>}
              </div>
            </div>
            <Illustration />
          </div>

          {slides.length > 0 && <Rotator slides={slides} compact arrows label="Recent activity" />}

          <section className="courses">
            <div className="shelfhead topsearch">
              <h2>Courses</h2>
              <HomeSearch index={searchIndex} />
              <LayoutBtn lay={lay} setLay={setLay} />
            </div>
            <div className={"crows" + (lay === "grid" ? " cards" : "")}>{rows.map((it) => <CourseRow key={it.key} it={it} />)}</div>
          </section>
        </div>

        <div className="dash-side">
          <div className={"tiles " + tileStyle}>
          <div className="bigstats">
            <StreakTile streak={streak} today={today} />
            <ExamTile days={examDays} name={examName} date={p.profile && p.profile.examDate} />
          </div>
          <div className="bigstats">
            <div className="card bigstat" title={"of " + totalQ.toLocaleString() + " questions"}>
              <b className={"bn" + (doneQ.toLocaleString().length > 3 ? " long" : "")}>{doneQ.toLocaleString()}</b><span>questions done</span>
              <Meter v={totalQ ? (100 * doneQ) / totalQ : 0} note={"of " + totalQ.toLocaleString()} />
            </div>
            <div className="card bigstat" data-band={!doneQ ? "none" : pct(okQ, doneQ) >= 80 ? "good" : pct(okQ, doneQ) >= 50 ? "mid" : "low"} title="Green from 80%, amber from 50%, red below">
              <b className="bn">{(doneQ ? pct(okQ, doneQ) : 0) + "%"}</b><span>accuracy</span>
              <Meter v={doneQ ? pct(okQ, doneQ) : 0} note={!doneQ ? "answer to start" : pct(okQ, doneQ) >= 80 ? "great work" : pct(okQ, doneQ) >= 50 ? "aim for 80%" : "revise mistakes"} />
            </div>
          </div>
          </div>
          <WeekChart week={week} />
          <TrickCard sections={bx.sections} />
        </div>
      </div>
    </div>
  );
}

function Modal({ label, onClose, children }) {
  useEffect(() => {
    const f = (e) => e.key === "Escape" && onClose();
    addEventListener("keydown", f);
    return () => removeEventListener("keydown", f);
  }, []);
  return (
    <div className="dialog" onClick={onClose}>
      <div className="card box trickform" role="dialog" aria-modal="true" aria-label={label} onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

/* thin progress bar with a short note under a home tile; `segs` draws it as that many blocks instead */
function Meter({ v, note, segs, on }) {
  return (
    <span className="tmeter" aria-hidden="true">
      {segs
        ? <i className="tsegs">{Array.from({ length: segs }, (_, k) => <u key={k} className={k < on ? "on" : ""} />)}</i>
        : <i className="tbar"><u style={{ width: Math.min(100, Math.max(0, v)) + "%" }} /></i>}
      <small>{note}</small>
    </span>
  );
}

/* streak: days in a row on which all four goals were met */
function StreakTile({ streak, today }) {
  const [open, setOpen] = useState(false);
  const met = Object.keys(GOAL).filter((k) => today[k] >= GOAL[k]).length;
  return (
    <>
      <button type="button" className="card bigstat tilebtn" onClick={() => setOpen(true)} aria-haspopup="dialog" title={"Today: " + met + " of 4 goals done"}>
        <b className="bn">{streak}</b><span>day streak</span>
        <Meter v={(100 * met) / 4} note={met + "/4 goals today"} segs={4} on={met} />
      </button>
      {open && (
        <Modal label="Daily streak goals" onClose={() => setOpen(false)}>
          <h2>Keep your streak going</h2>
          <p className="muted">A day counts toward your streak when you finish all four goals.</p>
          <ul className="goals">
            {GOALS.map(([k, name, unit]) => {
              const v = Math.min(today[k], GOAL[k]), ok = today[k] >= GOAL[k];
              return (
                <li key={k} className={ok ? "ok" : ""}>
                  <span className="gname">{name}<small>{v}/{GOAL[k]} {unit}</small></span>
                  <span className="gbar"><i style={{ width: (100 * v) / GOAL[k] + "%" }} /></span>
                </li>
              );
            })}
          </ul>
          <div className="actions" style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}><button type="button" className="btn primary" onClick={() => setOpen(false)}>Got it</button></div>
        </Modal>
      )}
    </>
  );
}

/* days to the exam; the date is asked at setup and can be changed here */
function ExamTile({ days, name, date }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(date || "");
  const todayStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const save = (d) => { setExamDate(d); setOpen(false); };
  let big, small;
  if (days === null) { big = "–"; small = "set exam date"; }
  else if (days < 0) { big = "–"; small = "exam date passed"; }
  else if (days === 0) { big = "0"; small = "exam day, all the best!"; }
  else { big = days; small = (days === 1 ? "day" : "days") + " to exam"; }
  return (
    <>
      <button type="button" className="card bigstat tilebtn" onClick={() => { setV(date || ""); setOpen(true); }} aria-haspopup="dialog" title={name}>
        <b className="bn">{big}</b><span>{small}</span>
        <Meter v={days > 0 ? Math.max(4, 100 - (100 * days) / 180) : 0} note={date ? new Date(date + "T00:00").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "tap to set date"} />
      </button>
      {open && (
        <Modal label="Exam date" onClose={() => setOpen(false)}>
          <form onSubmit={(e) => { e.preventDefault(); if (v) save(v); }}>
            <h2>When is your exam?</h2>
            <p className="muted">{name}. We count the days down on your home screen.</p>
            <input className="field" type="date" autoFocus aria-label="Exam date" min={todayStr} value={v} onChange={(e) => setV(e.target.value)} />
            <div className="actions" style={{ marginTop: 20, display: "flex", gap: 10, justifyContent: "flex-end" }}>
              {date && <button type="button" className="btn ghost" onClick={() => save("")}>Clear</button>}
              <button type="button" className="btn ghost" onClick={() => setOpen(false)}>Cancel</button>
              <button type="submit" className="btn primary" disabled={!v}>Save</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

function Slide({ it }) {
  return (
    <a className={"rot-topic " + it.cls} href={it.href}>
      <span className="tile lg">{ICONS[it.kind]}</span>
      <div className="grow">
        <div className="muted small">{it.label}</div>
        <div className="name">{it.title}</div>
        <div className="sub">{it.sub}</div>
      </div>
      <Ring pct={it.pct} />
      <span className="btn primary">{it.cta}</span>
    </a>
  );
}

/* first time: "Start" opens the section's own tab (not the first item in it); once there is progress the button says "Resume" and picks up where you left off */
const TABS = { practice: "#/practice", speed: "#/speed", mocks: "#/mocks", booster: "#/booster" };
function CourseRow({ it }) {
  const fresh = it.cta === "Start";
  const href = fresh ? TABS[it.kind] || it.href : it.href;
  const cta = it.cta === "Continue" ? "Resume" : it.cta;
  return (
    <a className={"card crow " + it.cls} href={href}>
      <span className="tile lg">{ICONS[it.kind]}</span>
      <div className="grow">
        <div className="name">{it.tag}</div>
        <div className="sub">{it.title}{it.sub ? " · " + it.sub : ""}</div>
      </div>
      <span className="cmeta" title="Progress">{ICONS.mCheck}<span><b>{it.m1[0]}</b> <i>{it.m1[1]}</i></span></span>
      <span className="cmeta" title={it.kind === "booster" ? "Next up" : "Accuracy or last score"}>{it.kind === "booster" ? ICONS.mFlag : ICONS.mTarget}<span><b>{it.m2[0]}</b> <i>{it.m2[1]}</i></span></span>
      <span className="btn primary">{cta}</span>
    </a>
  );
}

/* one button: shows the layout a click switches to (cards <-> list) */
function LayoutBtn({ lay, setLay }) {
  const toCards = lay !== "grid";
  return (
    <button type="button" className="laybtn" onClick={() => setLay(toCards ? "grid" : "list")} aria-label={toCards ? "Switch to card layout" : "Switch to list layout"} title={toCards ? "Card layout" : "List layout"}>
      {toCards
        ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><rect x="3.5" y="3.5" width="7" height="7" rx="1.8" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.8" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.8" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.8" /></svg>
        : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M4 6.5h16M4 12h16M4 17.5h16" /></svg>}
    </button>
  );
}

/* finds practice topics and sub-topics; a click (or Enter) opens the topic */
function HomeSearch({ index }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ql = q.trim().toLowerCase();
  const AREAS = ["Practice", "Speed Drills", "Mock Tests", "Booster"];
  /* up to 3 per area, name matches before sub-topic matches */
  const hits = ql ? AREAS.flatMap((area) => index
    .filter((e) => e.area === area)
    .map((e) => { const n = e.name.toLowerCase().includes(ql); const m = n ? null : e.terms.find((x) => x.toLowerCase().includes(ql)); return n || m ? { ...e, via: m, rank: n ? (e.name.toLowerCase().startsWith(ql) ? 0 : 1) : 2 } : null; })
    .filter(Boolean).sort((a, b) => a.rank - b.rank).slice(0, 3)) : [];
  const go = (e) => { setOpen(false); setQ(""); location.hash = e.href; };
  return (
    <div className="hsearch" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
      <input className="search wide" aria-label="Search everything" placeholder="Search practice, speed drills, mocks or booster" value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
        onKeyDown={(e) => { if (e.key === "Enter" && hits[0]) go(hits[0]); if (e.key === "Escape") { setOpen(false); setQ(""); } }} />
      {open && ql && (
        <div className="hsr" role="listbox" aria-label="Matching results" onMouseDown={(e) => e.preventDefault()}>
          {hits.length ? hits.map((e) => (
            <a key={e.area + e.href + e.name} role="option" href={e.href} onClick={() => go(e)}>
              <span className="grow"><span className="hsr-n">{e.name}</span>{e.via ? <span className="muted small hsr-v"> · {e.via}</span> : null}</span>
              <span className={"hsr-area a-" + AREAS.indexOf(e.area)}>{e.area}</span>
            </a>
          )) : <div className="muted small hsr-none">Nothing matches “{q}”</div>}
        </div>
      )}
    </div>
  );
}

/* Share a speed trick. For now the form only collects the text; nothing is stored or sent. */
function TrickCard({ sections }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="card trick" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <span className="trick-txt">
          <h3>Got a speed trick?</h3>
          <p>Solve a question faster than the book method? Share it with us.</p>
          <span className="btn primary">Share a trick</span>
        </span>
        <svg className="bulb" viewBox="0 0 160 150" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M80 18c-23 0-40 17-40 38 0 13 6 22 14 30 5 5 8 11 8 18h36c0-7 3-13 8-18 8-8 14-17 14-30 0-21-17-38-40-38z" fill="var(--card)" />
          <path d="M62 112h36M66 124h28M72 136h16" />
          <path d="M84 40L68 70h14l-6 22 20-30H82z" fill="currentColor" />
          <path d="M20 40l12 6M140 40l-12 6M14 76h12M134 76h12M80 4v8" />
        </svg>
      </button>
      {open && <TrickForm sections={sections} onClose={() => setOpen(false)} />}
    </>
  );
}

function TrickForm({ sections, onClose }) {
  const [question, setQuestion] = useState("");
  const [method, setMethod] = useState("");
  const [section, setSection] = useState("");
  const [topic, setTopic] = useState("");
  const [sent, setSent] = useState(false);
  useEffect(() => {
    const f = (e) => e.key === "Escape" && onClose();
    addEventListener("keydown", f);
    return () => removeEventListener("keydown", f);
  }, []);
  const topics = (section ? sections.filter((s) => s.name === section) : sections).flatMap((s) => s.topics).sort((a, b) => a.topic.localeCompare(b.topic));
  const ready = question.trim() && method.trim();
  return (
    <div className="dialog wide" onClick={onClose}>
      <div className="card box trickform" role="dialog" aria-modal="true" aria-label="Share a speed trick" onClick={(e) => e.stopPropagation()}>
        {sent ? (
          <>
            <h2>Thanks for the trick!</h2>
            <p>Saving shared tricks isn’t switched on yet, so nothing was stored this time. The form is ready for when it is.</p>
            <div className="actions"><button type="button" className="btn primary" onClick={onClose}>Close</button></div>
          </>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); if (ready) setSent(true); }}>
            <h2>Share a speed trick</h2>
            <label htmlFor="tr-q">Paste the question</label>
            <textarea id="tr-q" autoFocus value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Paste or type the question here" />
            <label htmlFor="tr-m">Your speed trick: explain how you solve it faster</label>
            <textarea id="tr-m" value={method} onChange={(e) => setMethod(e.target.value)} placeholder="Write the steps of your method and the solution" />
            <div className="trickrow">
              <div>
                <label htmlFor="tr-s">Section <span className="opt-note">(optional)</span></label>
                <select id="tr-s" value={section} onChange={(e) => { setSection(e.target.value); setTopic(""); }}>
                  <option value="">Not sure</option>
                  {sections.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="tr-t">Topic <span className="opt-note">(optional)</span></label>
                <select id="tr-t" value={topic} onChange={(e) => setTopic(e.target.value)}>
                  <option value="">Not sure</option>
                  {topics.map((t) => <option key={t.id} value={t.id}>{t.topic}</option>)}
                </select>
              </div>
            </div>
            <div className="actions" style={{ marginTop: 20, display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn primary" disabled={!ready}>Submit trick</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
