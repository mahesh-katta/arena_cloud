import Stage from "./Stage.jsx";
import Remarks from "./Remarks.jsx";
import { useEffect, useRef, useState } from "react";
import { mockIndex, useData, useProgress, dropMocks } from "./store.js";
import { boosterFor, profileLabel } from "./exams.js";
import { secClass, short, Loading, Failed } from "./ui.jsx";
import { useScope } from "./Profile.jsx";

const round = (x) => Math.round(x * 100) / 100;
/* the sections a day can hold, in the order they are shown; rank() says which one a test is */
export const SECS = [["Reasoning", "s-r"], ["Quant", "s-q"], ["English", "s-e"], ["Gen. Awareness", "s-ga"], ["Computer", "s-cs"], ["Other", "s-b"]];
const rank = (t) => { const s = t.section || ""; return /reason/i.test(s) ? 0 : /quant/i.test(s) ? 1 : /english/i.test(s) ? 2 : /general|aware/i.test(s) ? 3 : /comput/i.test(s) ? 4 : 5; };
/* a course's tests grouped by day, each day's sections in Reasoning, Quant, English order */
const daysOf = (g) => Object.entries(g.tests.reduce((m, t) => ((m[t.day || 0] ||= []).push(t), m), {}))
  .sort((a, b) => a[0] - b[0]).map(([day, ts]) => ({ day: +day, ts: [...ts].sort((a, b) => rank(a) - rank(b)) }));
const FILTERS = [["all", "All"], ["done", "Completed"], ["prog", "In progress"], ["new", "Not started"]];
/* A sheet holds `cap` days, and each page is filled before the next one starts:
   spreading them evenly instead left half-empty sheets with days waiting on the
   next page. Only the last page is short. */
const pagesOf = (n, cap) => {
  const out = [];
  for (let i = 0; i < Math.max(n, 1); i += cap) out.push([i, Math.min(n, i + cap)]);
  return out;
};

/* a small accuracy ring */
export function Gauge({ pct }) {
  const v = pct === null || pct === undefined ? 0 : Math.max(0, Math.min(100, pct)), R = 25, C = 2 * Math.PI * R;
  return (
    <svg className="gauge" viewBox="0 0 64 64" width="68" height="68" role="img" aria-label={pct === null || pct === undefined ? "No accuracy yet" : pct + " percent accuracy"}>
      <circle cx="32" cy="32" r={R} fill="none" strokeWidth="6" className="g-track" />
      <circle cx="32" cy="32" r={R} fill="none" strokeWidth="6" strokeLinecap="round" className="g-arc" strokeDasharray={(C * v) / 100 + " " + C} transform="rotate(-90 32 32)" />
      <text x="32" y="36.5" textAnchor="middle" className="g-txt">{pct === null || pct === undefined ? "–" : pct + "%"}</text>
    </svg>
  );
}

/* Booster: the score-booster course for the open profile, shown with the day planner. */
export function BoosterHome() {
  const p = useProgress();
  const [ix, err] = useData(mockIndex, []);
  const [all, setAll] = useScope();
  if (err) return <Failed what="the booster" err={err} />;
  if (!ix) return <Loading />;
  const groups = (ix.collections.find((c) => c.kind === "booster") || { groups: [] }).groups;
  const mine = all ? groups : boosterFor(p.profile, groups);
  return (
    <DayPlanner mine={mine} title="Booster" scopeWord="booster exams"
      empty={<div className="card pad empty">There is no score booster course for {profileLabel(p.profile)} yet. Prelims boosters cover the PO and Clerk exams, and Mains has one bundle for every exam.
        <div className="actions" style={{ justifyContent: "center", marginTop: 14 }}><button className="btn primary" onClick={() => setAll(true)}>Browse all courses</button></div></div>} />
  );
}

/* The day planner: a calendar-style card of a course's days (50 to a page) and, beside it, the ticket for a day, the results and
   the recent days. Hover a day to preview its ticket, click it to pin it, then tick the sections to take and start.
   mine = the series (groups from index.json) to show; right = extra header content in place of the filter chips. */
export function DayPlanner({ mine, title, kind, scopeWord = "exams", right, empty, together, unitWord = "Day", ghosts = true }) {
  const p = useProgress();
  const [gi, setGi] = useState(0);
  const [pg, setPg] = useState(null);
  const [sel, setSel] = useState(null);
  const [hov, setHov] = useState(null);
  const [ticks, setTicks] = useState({});
  const [flt, setFlt] = useState("all");
  const [slide, setSlide] = useState(0);
  const [openRec, setOpenRec] = useState(null);
  const [sure, setSure] = useState(null);
  const [secOpen, setSecOpen] = useState(null);
  const [, redraw] = useState(0);
  const [hold, setHold] = useState(false);
  const [geo, setGeo] = useState({ cols: 7, cell: 44, cap: 42 });
  const areaRef = useRef(null);
  /* the results card turns by itself every few seconds; hovering or focusing it holds it still */
  useEffect(() => {
    if (hold || (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches)) return;
    const t = setInterval(() => setSlide((s) => (s + 1) % 3), 6000);
    return () => clearInterval(t);
  }, [hold]);
  /* each day is as big as a sidebar icon button; the calendar area says how many columns and rows of them fit, leaving one icon-height of space above the arrows */
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const calc = () => {
      const cell = (document.querySelector(".side .navitem") || {}).offsetWidth || 44, gap = 10, cs = getComputedStyle(el);
      const w = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const h = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - 8;
      const cols = 6, rows = 5;   /* a fixed 6 x 5 sheet: 30 days a slide, same layout even when fewer are left */
      setGeo((o) => (o.cols === cols && o.cell === cell && o.cap === cols * rows ? o : { cols, cell, cap: cols * rows }));
    };
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    return () => ro.disconnect();
  }, [mine.length > 0]);
  const g = mine[Math.min(gi, mine.length - 1)];
  const testById = new Map(mine.flatMap((c) => c.tests.map((t) => [t.id, t])));
  /* a run id is test ids joined with "+", or "<paper id>~<section numbers>" for some sections of one full paper */
  const testOf = (id) => testById.get(id.split("~")[0]);
  const labOf = (k) => k.split("+").map((id) => { const [b, s] = id.split("~"), t = testById.get(b); return !t ? "" : s ? s.split(".").map((i) => short((t.parts[+i] || [])[0] || "")).join(" + ") : short(t.section); }).join(" + ");
  /* exams started and left half-way are kept in this browser as "ap-run-<test id(s)>"; they make a day "in progress" */
  const partials = (() => {
    const out = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith("ap-run-")) continue;
        const key = k.slice(7), v = JSON.parse(localStorage.getItem(k) || "null");
        if (!v || p.mocks[key]) continue;
        const ts = key.split("+").map(testOf);
        if (ts.some((t) => !t)) continue;
        out.push({ key, at: v.at || 0, left: Object.keys(v.answers || {}).length, ts, gid: (mine.find((c) => c.tests.some((t) => t.id === ts[0].id)) || {}).id });
      }
    } catch {}
    return out;
  })();
  /* a test counts as taken on its own or as part of a "together" run (its id is the parts joined with +);
     a full paper's section taken alone counts as "<paper id>~<n>", and the paper is taken once every section is */
  const covered = new Set(Object.keys(p.mocks).flatMap((k) => k.split("+").flatMap((id) => { const [b, s] = id.split("~"); return s ? s.split(".").map((i) => b + "~" + i) : [b]; })));
  for (const t of testById.values()) if (!covered.has(t.id) && (t.parts || []).length > 1 && t.parts.every((_, k) => covered.has(t.id + "~" + k))) covered.add(t.id);
  const days = g ? daysOf(g) : [];
  /* what a day offers to tick: its tests, or - for a day that is one full paper - that paper's sections, so one of them can be taken alone */
  const unitsOf = (d) => (!ghosts && d.ts.length === 1 && (d.ts[0].parts || []).length > 1
    ? d.ts[0].parts.map(([name, n, time], k) => ({ id: d.ts[0].id + "~" + k, k, section: name, n, time, paper: d.ts[0] }))
    : d.ts);
  const taken = (u) => covered.has(u.id) || (!!u.paper && covered.has(u.paper.id));
  /* a day is counted by those units, so one section of a full paper makes it "in progress" (1 of 2) */
  const info = (d) => { const us = unitsOf(d), n = us.filter(taken).length; return { n, of: us.length, state: n === 0 ? "new" : n === us.length ? "done" : "part" }; };
  /* the saved results that belong to a day: any run whose ids include one of its tests */
  const keysOf = (d) => Object.keys(p.mocks).filter((k) => k.split("+").some((id) => d.ts.some((t) => t.id === id.split("~")[0])));
  const next = days.find((d) => info(d).state !== "done");
  const pages = pagesOf(days.length, geo.cap);
  const base = days.find((d) => d.day === sel) || next || days[0];
  const cur = Math.min(pg === null ? Math.max(0, pages.findIndex(([x, y]) => base && days.indexOf(base) >= x && days.indexOf(base) < y)) : pg, Math.max(0, pages.length - 1));
  const [a, z] = pages[cur] || [0, 0];
  /* the filter dims the days that do not match; "in progress" is a started day or the test you left half-way */
  const liveOf = (d) => partials.filter((x) => x.gid === g.id && x.ts[0].day === d.day).sort((x, y) => y.at - x.at);
  const isLive = (d) => liveOf(d).length > 0;
  const fits = (d, k) => k === "all" || (k === "prog" ? info(d).state === "part" || isLive(d) : info(d).state === k);
  const count = (k) => days.filter((d) => fits(d, k)).length;
  const go = (k) => setPg(Math.max(0, Math.min(pages.length - 1, k)));
  /* the days you opened lately (kept in this browser), then the days you have taken tests in, newest day first */
  /* Recent = only days where an exam has been started or finished, the latest first */
  const doneAt = new Map(Object.entries(p.mocks).flatMap(([k, r]) => (r ? k.split("+").map((id) => [id.split("~")[0], r.at || 0]) : [])));
  const lastAt = (d) => Math.max(0, ...d.ts.map((t) => doneAt.get(t.id) || 0), ...liveOf(d).map((x) => x.at));
  const recentDays = days.filter((d) => info(d).n || isLive(d)).sort((x, y) => lastAt(y) - lastAt(x) || y.day - x.day).slice(0, 14);
  /* every booster answer you have given, added up by section (an answer belongs to a test by its id prefix) */
  const secOf = new Map(mine.flatMap((c) => c.tests.map((t) => [t.id, rank(t)])));
  const present = SECS.map((_, k) => k).filter((k) => mine.some((c) => c.tests.some((t) => rank(t) === k)));
  const res = SECS.map(() => ({ att: 0, ok: 0 }));
  for (const [qid, a] of Object.entries(p.answers)) { const k = secOf.get(qid.slice(0, qid.lastIndexOf("-"))); if (k !== undefined) { res[k].att++; if (a && a.ok) res[k].ok++; } }
  const tot = res.reduce((x, r) => ({ att: x.att + r.att, ok: x.ok + r.ok }), { att: 0, ok: 0 });
  const accOf = (r) => (r.att ? Math.round((100 * r.ok) / r.att) : null);
  /* averages over every booster run you have finished, and the most recent one on its own */
  const runs = Object.entries(p.mocks).filter(([k, r]) => r && k.split("+").every((id) => testOf(id)));
  const accOfRun = (r) => (r.right + r.wrong ? (100 * r.right) / (r.right + r.wrong) : 0);
  const avgAcc = runs.length ? Math.round(runs.reduce((x, [, r]) => x + accOfRun(r), 0) / runs.length) : null;
  const bestAcc = runs.length ? Math.round(Math.max(...runs.map(([, r]) => accOfRun(r)))) : null;
  const avgAtt = runs.length ? Math.round(runs.reduce((x, [, r]) => x + r.right + r.wrong, 0) / runs.length) : null;
  const lastRun = runs.length ? [...runs].sort((x, y) => (y[1].at || 0) - (x[1].at || 0))[0] : null;
  const last = (() => {
    if (!lastRun) return null;
    const [k, r] = lastRun, ts = k.split("+").map(testOf);
    const bySec = SECS.map(() => ({ att: 0, ok: 0 }));
    for (const qid of Object.keys(r.answers || {})) { const t = testById.get(qid.slice(0, qid.lastIndexOf("-"))); if (!t) continue; const s = bySec[rank(t)], a = p.answers[qid]; s.att++; if (a && a.ok) s.ok++; }
    const att = r.right + r.wrong;
    return { title: unitWord + " " + ts[0].day + " · " + labOf(k), score: round(r.score), max: r.max, acc: att ? Math.round((100 * r.right) / att) : null, att, secs: r.secs, bySec, ts };
  })();
  const rmExams = [...runs].sort((x, y) => (y[1].at || 0) - (x[1].at || 0)).map(([k, r]) => { const ts = k.split("+").map(testOf), att = r.right + r.wrong; return { key: k, title: unitWord + " " + ts[0].day + " · " + labOf(k), score: round(r.score) + "/" + r.max, att, acc: att ? Math.round((100 * r.right) / att) : null }; });
  const bestRun = runs.length ? [...runs].sort((x, y) => (y[1].max ? y[1].score / y[1].max : 0) - (x[1].max ? x[1].score / x[1].max : 0))[0][1] : null;
  const mins = (s) => (s === null || s === undefined ? "–" : Math.round(s / 60) + " min");
  const choose = (d) => { setSel(d.day); setPg(null); };
  /* reset = start the day afresh: forget its half-finished run and clear its saved scores (answer history and My mistakes are kept) */
  const canReset = (d) => isLive(d) || keysOf(d).length > 0;
  const resetRun = (d) => {
    liveOf(d).forEach((x) => { try { localStorage.removeItem("ap-run-" + x.key); } catch {} });
    const ks = keysOf(d); if (ks.length) dropMocks(ks);
    setTicks((o) => { const n = { ...o }; delete n[g.id + "/" + d.day]; return n; });
    setSure(null); setOpenRec(null); redraw((n) => n + 1);
  };
  /* the ticket shows the day under the pointer (a preview) or else the pinned day, where the ticks can be changed */
  const tk = hov || base;
  const pinned = !!tk && !!base && tk.day === base.day;
  /* ticks are kept per series and day, so a choice made in one series never leaks into another */
  const tkey = (d) => g.id + "/" + d.day;
  const idsOf = (d) => { const us = unitsOf(d), open = us.filter((u) => !taken(u)); return ticks[tkey(d)] || (open.length ? open : us).map((u) => u.id); };
  /* the link for the ticked units: tests joined with +, the whole paper when every section is ticked, or "<paper>~<sections>" */
  const hrefOf = (d, picked) => {
    if (!picked.length) return null;
    const us = unitsOf(d), paper = us[0].paper;
    return "#/mock/" + g.id + "/" + (paper ? (picked.length === us.length ? paper.id : paper.id + "~" + picked.map((u) => u.k).join(".")) : picked.map((t) => t.id).join("+"));
  };
  const units = tk ? unitsOf(tk) : [];
  const onePaper = !!units[0]?.paper;
  const on = new Set(tk ? idsOf(tk) : []);
  const chosen = units.filter((u) => on.has(u.id));
  /* a day with fewer than the usual three sections (Reasoning, Quant, English) keeps the same ticket: the missing ones are shown frozen */
  const GHOST = ["Reasoning Ability", "Quantitative Aptitude", "English Language"];
  const rows = !tk ? []
    : onePaper
      ? [{ ...tk.ts[0], head: true }, ...units]
      : [...tk.ts, ...[0, 1, 2].filter((k) => ghosts && tk.ts.length < 3 && !tk.ts.some((t) => rank(t) === k)).map((k) => ({ ghost: true, k }))].sort((x, y) => (x.ghost ? x.k : rank(x)) - (y.ghost ? y.k : rank(y)));
  const sum = (k) => (k === "time" && together ? together(chosen.length, chosen.reduce((x, t) => x + (t.time || 0), 0)) : chosen.reduce((x, t) => x + (t[k] || 0), 0));
  const toggle = (id) => setTicks({ ...ticks, [tkey(tk)]: units.filter((u) => (u.id === id ? !on.has(id) : on.has(u.id))).map((u) => u.id) });
  const allOn = !!tk && chosen.length === units.length;
  const tickAll = () => setTicks({ ...ticks, [tkey(tk)]: allOn ? [] : units.map((u) => u.id) });
  const href = pinned ? hrefOf(tk, chosen) : null;
  const startLabel = !pinned ? "Click the " + unitWord.toLowerCase() : !chosen.length ? "Pick a section"
    : (onePaper ? allOn : tk.ts.length === 1) ? "Start the " + unitWord.toLowerCase()
    : chosen.length > 1 ? "Start " + chosen.length + " sections" : "Start " + short(chosen[0].section);
  /* arrow keys move between days like a calendar */
  const keyNav = (e) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -geo.cols, ArrowDown: geo.cols }[e.key];
    if (!step) return;
    const all = [...e.currentTarget.parentNode.children], to = all[all.indexOf(e.currentTarget) + step];
    if (to) { e.preventDefault(); to.focus(); }
  };
  if (!g) return <div className="page boosterpg">{empty}</div>;
  return (
    <div className="page boosterpg">
      <Stage className={"bstage" + (kind ? " mk" : "")}
        top={
        <div className="bp-top">
          <div><h1>{title}</h1><p>{kind ? kind + " · " : ""}{days.length} days · {Math.max(...days.map((d) => d.ts.length))} timed tests a day</p></div>
          {right || (
            <div className="bfl" role="tablist" aria-label="Show days">
              {FILTERS.map(([k, t]) => <button key={k} type="button" role="tab" aria-selected={flt === k} className={flt === k ? "on" : ""} onClick={() => setFlt(k)}>{t}<em>{count(k)}</em></button>)}
            </div>
          )}
        </div>
        }
        cards={[
          { id: "cal", label: "Calendar", node: (
        <section className="bcal" aria-label={"Booster days " + days[a]?.day + " to " + days[z - 1]?.day}>
          <header aria-live="polite">
            <div className="bc-hl">
            {mine.length > 1 && (
              <label className="bc-series"><span className="sr-only">Series</span>
                <select value={g.id} onChange={(e) => { setGi(mine.findIndex((c) => c.id === e.target.value)); setSel(null); setPg(null); setHov(null); }}>
                  {mine.map((c) => <option key={c.id} value={c.id}>{c.name.replace(/ (Course )?2026$/, "")}</option>)}
                </select>
              </label>
            )}
            {hov
              ? <><h2>{unitWord} {hov.day}</h2><p>{hov.ts.map((t) => short(t.section)).join(" · ")} · {hov.ts.reduce((x, t) => x + (t.time || 0), 0)} min{info(hov).state === "done" ? " · Done" : info(hov).n ? " · " + info(hov).n + " of " + info(hov).of + " taken" : ""}</p></>
              : <><h2>Choose a {unitWord.toLowerCase()}</h2><p>{unitWord}s {days[a]?.day} – {days[z - 1]?.day} of {days.length}</p></>}
            </div>
            <div className={"bc-arrows" + (pages.length > 1 ? "" : " off")} aria-hidden={pages.length > 1 ? undefined : "true"}>
              <button type="button" aria-label={"Previous " + unitWord.toLowerCase() + "s (" + (cur > 0 ? days[pages[cur - 1][0]].day + "–" + days[pages[cur - 1][1] - 1].day : "") + ")"} disabled={cur === 0} onClick={() => go(cur - 1)}>‹</button>
              <button type="button" aria-label={"Next " + unitWord.toLowerCase() + "s (" + (cur < pages.length - 1 ? days[pages[cur + 1][0]].day + "–" + days[pages[cur + 1][1] - 1].day : "") + ")"} disabled={cur >= pages.length - 1} onClick={() => go(cur + 1)}>›</button>
            </div>
          </header>
          <div className="bc-area" ref={areaRef}>
          <div className="bc-grid" key={cur} style={{ "--cols": geo.cols, "--cell": geo.cell + "px" }} onMouseLeave={() => setHov(null)}>
            {days.slice(a, z).map((d) => {
              const { n, state } = info(d);
              return (
                <button key={d.day} type="button" aria-pressed={sel === d.day} aria-label={unitWord + " " + d.day + (state === "done" ? ", completed" : state === "part" || isLive(d) ? ", in progress" : ", " + n + " of " + info(d).of + " taken")}
                  className={"bc-day st-" + state + (isLive(d) ? " live" : "") + (hov && hov.day === d.day ? " act" : "") + (fits(d, flt) ? "" : " dim")}
                  onMouseEnter={() => setHov(d)} onFocus={() => setHov(d)} onBlur={() => setHov(null)} onKeyDown={keyNav} onClick={() => choose(d)}>{state === "done" ? <span className="dn-ok" aria-hidden="true">✓</span> : state === "part" || isLive(d) ? <span className="dn-live" aria-hidden="true">⏳</span> : d.day}</button>
              );
            })}
            {Array.from({ length: Math.max(0, geo.cap - (z - a)) }, (_, i) => <span key={"f" + i} className="bc-frozen" aria-hidden="true" />)}
          </div>
          </div>
          <div className="pyl-key bc-key" aria-hidden="true"><span><i className="k-ok">✓</i>done</span><span><i className="k-hg">⏳</i>in progress</span><span><i className="k-day">7</i>not started</span></div>
        </section>
          ) },
          { id: "tkt", label: "Ticket", node: (
        <aside className="bp-left" aria-label={unitWord + " " + tk.day + " ticket"}>
          {(() => {
            const { state } = info(tk), liveRun = liveOf(tk)[0], live = !!liveRun;
            return (
              <div className={"tk" + (pinned ? "" : " peek")}>
                <div className="tk-stub">
                  <div className="tk-meta"><small>{g.name.replace(/ (Course )?2026$/, "")}</small><span className="tk-tag">{state === "done" ? "Completed" : state === "part" || live ? "In progress" : next === tk ? "Next up" : "Not started"}</span></div>
                  <div className="tk-dayrow"><small>{unitWord}</small><b>{tk.day}</b></div>
                </div>
                <div className="tk-perf" aria-hidden="true" />
                <div className="tkr-list" role="group" aria-label="Sections to take">
                  {rows.map((t) => {
                    /* the full paper's own row ticks or clears all of its sections at once */
                    if (t.head) return (
                      <label key={t.id} className={"tkr " + secClass(t.section) + (allOn ? " on" : "")}>
                        <input type="checkbox" checked={allOn} disabled={!pinned} onChange={tickAll} />
                        <span className="tkr-box" aria-hidden="true" />
                        <span className="tkr-txt"><b>{t.section}</b><small>{t.n} questions · {t.time} min · all sections</small></span>
                        <em className={covered.has(t.id) ? "ok" : ""}>{p.mocks[t.id] ? "Scored " + round(p.mocks[t.id].score) + "/" + p.mocks[t.id].max : covered.has(t.id) ? "Taken" : ""}</em>
                      </label>
                    );
                    if (t.ghost) return (
                      <div key={"g" + t.k} className={"tkr frozen " + SECS[t.k][1]} aria-disabled="true">
                        <span className="tkr-box" aria-hidden="true" />
                        <span className="tkr-txt"><b>{GHOST[t.k]}</b><small>not part of this day</small></span>
                      </div>
                    );
                    const r = p.mocks[t.id], done = taken(t);
                    return (
                      <label key={t.id} className={"tkr " + secClass(t.section) + (on.has(t.id) ? " on" : "")}>
                        <input type="checkbox" checked={on.has(t.id)} disabled={!pinned} onChange={() => toggle(t.id)} />
                        <span className="tkr-box" aria-hidden="true" />
                        <span className="tkr-txt"><b>{t.section}</b><small>{t.n} questions · {t.time} min</small></span>
                        <em className={done ? "ok" : ""}>{r ? "Scored " + round(r.score) + "/" + r.max : done ? "Taken" : ""}</em>
                      </label>
                    );
                  })}
                </div>
                <div className="tk-perf plain" aria-hidden="true" />
                <div className="tkr-foot">
                  <div className="tkr-sum">
                    <span>{units.length > 1 ? chosen.length + "/" + units.length + " sections · " : ""}{sum("n")} q · {sum("time")} min</span>
                    <span className="tkr-links">
                      {pinned && canReset(tk) && (sure === "tk" + tk.day
                        ? <button type="button" className="linkbtn warnlink" onClick={() => resetRun(tk)} onBlur={() => setSure(null)} autoFocus title="Clears the scores and any half-finished exam">Sure? Reset</button>
                        : <button type="button" className="linkbtn" onClick={() => setSure("tk" + tk.day)} title={"Clear this " + unitWord.toLowerCase() + "'s scores and any half-finished exam, so it starts fresh"}>Reset</button>)}
                      <button type="button" className="linkbtn" disabled={!pinned} onClick={tickAll}>{allOn ? "Clear" : "All"}</button>
                    </span>
                  </div>
                  <div className="tkr-act">
                    {live && pinned && <a className="btn sm" href={"#/mock/" + g.id + "/" + liveRun.key} title={"Resume " + labOf(liveRun.key)}>Resume</a>}
                    <a className={"btn primary" + (href ? "" : " off")} href={href || undefined} aria-disabled={!href}>{startLabel}</a>
                  </div>
                </div>
              </div>
            );
          })()}
        </aside>
          ) },
          { id: "rmk", label: "Remarks", node: <Remarks best={bestRun ? round(bestRun.score) + "/" + bestRun.max : null} avgAtt={avgAtt} avgAcc={avgAcc} exams={rmExams} noun={kind ? "exams" : "boosters"} /> },
          { id: "rec", label: "Recent", node: (
        <aside className="bp-recent" aria-label="Recent days">
          <header><h2>Recent</h2></header>
          {recentDays.length ? (
            <div className="brl">
              {recentDays.map((d) => {
                const { n, state } = info(d), live = liveOf(d)[0], open = openRec === d.day;
                const us = unitsOf(d), hIds = idsOf(d), hGo = hrefOf(d, us.filter((u) => hIds.includes(u.id)));
                return (
                  <div key={d.day} className={"brw" + (open ? " open" : "")}>
                    <button type="button" className={"brh st-" + state} aria-expanded={open} onClick={() => { setOpenRec(open ? null : d.day); setSure(null); setSecOpen(null); }}>
                      <span className="brh-top"><small>{g.name.replace(/ (Course )?2026$/, "")}</small><em>{state === "done" ? "Completed" : state === "part" || live ? "In progress" : "Not started"}</em></span>
                      <span className="brh-day"><small>{unitWord}</small><b>{d.day}</b><i>{n === 0 && live ? live.left + " answered" : n + " of " + info(d).of + " taken"}</i></span>
                    </button>
                    <div className="brw-hov">
                      {live && <a className="brw-b primary" href={"#/mock/" + g.id + "/" + live.key}>Resume</a>}
                      {hGo && <a className="brw-b" href={hGo}>{live ? "Restart" : "Start"}</a>}
                    </div>
                    {open && (() => {
                      const ids = idsOf(d), picked = us.filter((u) => ids.includes(u.id)), go = hrefOf(d, picked);
                      const flip = (id) => setTicks({ ...ticks, [tkey(d)]: us.filter((u) => (u.id === id ? !ids.includes(id) : ids.includes(u.id))).map((u) => u.id) });
                      return (
                        <div className="brx">
                          <div className="brx-row">
                            {live ? <a className="btn sm primary" href={"#/mock/" + g.id + "/" + live.key} title={"Resume " + labOf(live.key)}>Resume</a> : <button type="button" className="btn sm primary" disabled title="No unfinished exam on this day">Resume</button>}
                            {sure === d.day
                              ? <button type="button" className="btn sm danger" onClick={() => resetRun(d)}>Sure?</button>
                              : <button type="button" className="btn sm" disabled={!canReset(d)} title={canReset(d) ? "Clear this " + unitWord.toLowerCase() + "'s scores and any half-finished exam, so it starts fresh" : "Nothing taken on this " + unitWord.toLowerCase() + " yet"} onClick={() => setSure(d.day)}>Reset</button>}
                            <button type="button" className={"btn sm" + (secOpen === d.day ? " on" : "")} aria-expanded={secOpen === d.day} onClick={() => setSecOpen(secOpen === d.day ? null : d.day)}>Sections</button>
                          </div>
                          {secOpen === d.day && (
                            <div className="brx-secs">
                              {us.map((t) => { const r = p.mocks[t.id], done = taken(t); return (
                                <label key={t.id} className={"brx-sec " + secClass(t.section) + (ids.includes(t.id) ? " on" : "")}>
                                  <input type="checkbox" checked={ids.includes(t.id)} onChange={() => flip(t.id)} />
                                  <span className="tkr-box" aria-hidden="true" />
                                  <b>{short(t.section)}</b>
                                  <em className={done ? "ok" : ""}>{r ? round(r.score) + "/" + r.max : done ? "Taken" : t.n + " q"}</em>
                                </label>
                              ); })}
                              <a className={"btn sm primary" + (go ? "" : " off")} href={go || undefined} aria-disabled={!go}>{picked.length > 1 ? "Start " + picked.length + " sections" : picked.length ? "Start " + short(picked[0].section) : "Pick a section"}</a>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          ) : <p>Exams you start show up here.</p>}
        </aside>
          ) },
        ]} />
    </div>
  );
}
