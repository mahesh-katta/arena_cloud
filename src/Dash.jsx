import { useEffect, useMemo, useRef, useState } from "react";
import { useProgress } from "./store.js";
import { ICONS } from "./Icons.jsx";

/* last 7 days of activity, from the time stamp on every answer */
const DAY = 86400000;
const WD = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const startOfDay = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };

export function useWeek() {
  const p = useProgress();
  return useMemo(() => {
    const today = startOfDay(Date.now());
    const days = Array.from({ length: 7 }, (_, i) => {
      const t = today - (6 - i) * DAY;
      return { t, label: WD[new Date(t).getDay()], n: 0, ok: 0 };
    });
    const seen = new Set();
    for (const a of Object.values(p.answers)) {
      if (!a.at) continue;
      const i = Math.floor((startOfDay(a.at) - days[0].t) / DAY);
      if (i >= 0 && i < 7) { days[i].n++; if (a.ok) days[i].ok++; }
      seen.add(startOfDay(a.at));
    }
    let streak = 0;
    for (let t = seen.has(today) ? today : today - DAY; seen.has(t); t -= DAY) streak++;
    return { days, total: days.reduce((a, d) => a + d.n, 0), streak };
  }, [p.answers]);
}

export function greeting(name) {
  const h = new Date().getHours();
  const w = h < 5 ? "Still up" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const n = (name || "").trim().split(/\s+/)[0];
  return w + (n ? ", " + n : "") + (w === "Still up" ? "?" : "!");
}

/* steps rising to a flag, ticks on the steps already climbed: "small steps every day add up" */
export function Illustration() {
  return (
    <svg className="illus" viewBox="0 0 220 180" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <g fill="currentColor" fillOpacity=".14">
        <rect x="20" y="132" width="40" height="52" rx="3" />
        <rect x="60" y="100" width="40" height="84" rx="3" />
        <rect x="100" y="68" width="40" height="116" rx="3" />
        <rect x="140" y="36" width="40" height="148" rx="3" />
      </g>
      <path d="M32 150l6 6 12-12M72 118l6 6 12-12M112 86l6 6 12-12" />
      <path d="M160 36V6" />
      <path d="M160 6h28l-7 8 7 8h-28z" fill="currentColor" />
      <path d="M40 120Q60 40 150 30" strokeWidth="2.5" strokeDasharray="1 9" opacity=".7" />
      <path d="M198 60v12M192 66h12M30 44v14M23 51h14M96 22v8M92 26h8" opacity=".8" />
    </svg>
  );
}

/* smooth line through the points: S-curves, so it never dips below the data */
function curve(pts) {
  if (!pts.length) return "";
  let d = "M" + pts[0][0] + " " + pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], mx = (x0 + x1) / 2;
    d += " C" + mx + " " + y0 + " " + mx + " " + y1 + " " + x1 + " " + y1;
  }
  return d;
}

export function WeekChart({ week }) {
  const [mode, setMode] = useState("n");
  const [sel, setSel] = useState(null);   /* a past day whose number you opened */
  const box = useRef(null);
  const [size, setSize] = useState([380, 260]);
  useEffect(() => {
    const el = box.current; if (!el) return;
    /* measure once right away too, so the chart never draws at the default size while waiting for the observer */
    const r0 = el.getBoundingClientRect(); if (r0.width > 0 && r0.height > 0) setSize([Math.round(r0.width), Math.round(r0.height)]);
    if (!window.ResizeObserver) return;
    /* accept any real size: a first reading taken while the page is still laying out can be small, and a later one may never come */
    const ro = new ResizeObserver(([e]) => { const r = e.contentRect; if (r.width > 0 && r.height > 0) setSize([Math.round(r.width), Math.round(r.height)]); });
    ro.observe(el); return () => ro.disconnect();
  }, []);
  const W = size[0], H = Math.max(size[1], 100), L = 26, R = 4, T = 38, B = 34;
  const vals = week.days.map((d) => (mode === "n" ? d.n : d.n ? Math.round((100 * d.ok) / d.n) : null));
  const top = mode === "n" ? Math.max(5, Math.ceil(Math.max(...vals) / 5) * 5) : 100;
  const ticks = mode === "n" ? [0, top / 5 * 1, top / 5 * 2, top / 5 * 3, top / 5 * 4, top].map(Math.round).filter((v, i, a) => a.indexOf(v) === i) : [0, 25, 50, 75, 100];
  const x = (i) => L + 16 + (i * (W - L - R - 24)) / 6;
  const y = (v) => T + (1 - v / top) * (H - T - B);
  const pts = vals.map((v, i) => (v == null ? null : [x(i), y(v)])).filter(Boolean);
  const empty = week.total === 0;
  return (
    <div className="card statcard">
      <h2>Your statistics</h2>
      <div className="stathead">
        <div className="tabs" role="radiogroup" aria-label="Chart">
          {[["n", "Questions"], ["a", "Accuracy"]].map(([k, t]) => (
            <button key={k} type="button" role="radio" aria-checked={mode === k} className={mode === k ? "on" : ""} onClick={() => setMode(k)}>{t}</button>
          ))}
        </div>
        <span className="pillnote">This week</span>
      </div>
      <div className="chartbox" ref={box}><svg className="wchart" width={W} height={H} viewBox={"0 0 " + W + " " + H} role="img" aria-label={"Your last 7 days: " + vals.map((v, i) => week.days[i].label + " " + (v == null ? "none" : v + (mode === "a" ? "%" : ""))).join(", ")}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="gl" />
            <text x={L - 4} y={y(v) + 5} textAnchor="end" className="ax">{v}</text>
          </g>
        ))}
        {week.days.map((d, i) => <text key={d.t} x={x(i)} y={H - 10} textAnchor="middle" className="ax">{d.label}</text>)}
        <path d={curve(pts)} className="ln" />
        {vals.map((v, i) => {
          if (v == null) return null;
          const big = i === vals.length - 1 || sel === i;   /* today is full size; past days stay small until clicked */
          const label = big || v > 0 || mode === "a";        /* past days with 0 questions keep just their dot, so bubbles don't crowd the day names */
          const pick = () => setSel(sel === i ? null : i);
          return (
            <g key={i} className="pt" role="button" tabIndex={0} aria-label={week.days[i].label + ": " + v + (mode === "a" ? "%" : "")} style={{ cursor: "pointer", outline: "none" }}
              onClick={pick} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } }}>
              <circle cx={x(i)} cy={y(v)} r="14" fill="transparent" />
              <circle cx={x(i)} cy={y(v)} r="4.5" className="dot" />
              {label && (
                <g style={{ transform: "translate(" + x(i) + "px, " + (y(v) - (big ? 30 : 22)) + "px) scale(" + (big ? 1 : 0.68) + ")", transition: "transform .16s ease" }}>
                  <rect x="-21" y="-14" width="42" height="28" rx="9" className="tip" />
                  <text y="5" textAnchor="middle" className="tipt">{v}{mode === "a" ? "%" : ""}</text>
                </g>
              )}
            </g>
          );
        })}
      </svg></div>
      {empty && <div className="muted small chartnote">Answer a few questions and your week shows up here.</div>}
    </div>
  );
}

/* One card that shows each slide for 4 seconds: greeting first, then the most recently practised topics. */
const SLIDE_MS = 4000;
export function Rotator({ slides, label = "Greeting and recent topics", compact, arrows }) {
  const [i, setI] = useState(0);
  const [prev, setPrev] = useState(null);          /* the slide that is sliding out */
  const [hold, setHold] = useState(false);
  const reduce = useMemo(() => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; } }, []);
  const n = slides.length, idx = i % n;
  const go = (k) => { if (k === idx) return; setPrev(reduce ? null : idx); setI(k); };
  useEffect(() => {
    if (n < 2 || hold || reduce) return;
    const t = setTimeout(() => go((idx + 1) % n), SLIDE_MS);
    return () => clearTimeout(t);
  }, [i, hold, reduce, n]);
  useEffect(() => {
    if (prev == null) return;
    const t = setTimeout(() => setPrev(null), 1100);
    return () => clearTimeout(t);
  }, [prev, i]);
  /* round arrows inside the card, just left of the slide's button; they stay put while the slides move */
  const nav = arrows && n > 1 && (
    <div className="rot-arrows">
      <button type="button" className="rarrow" aria-label="Previous card" onClick={() => go((idx - 1 + n) % n)}>{ICONS.arrowL}</button>
      <button type="button" className="rarrow" aria-label="Next card" onClick={() => go((idx + 1) % n)}>{ICONS.arrowR}</button>
    </div>
  );
  const card = (
    <div className={"card rot" + (nav ? " has-arrows" : "") + (compact ? " compact" : "")} onMouseEnter={() => setHold(true)} onMouseLeave={() => setHold(false)} onFocus={() => setHold(true)} onBlur={() => setHold(false)} aria-roledescription="carousel" aria-label={label}>
      <div className="rot-stage">
        {prev != null && prev % n !== idx && <div className="rot-slide out" key={"o" + prev + ":" + idx} aria-hidden="true">{slides[prev % n]}</div>}
        <div className="rot-slide in" key={"i" + idx}>{slides[idx]}</div>
      </div>
      {n > 1 && (<>
        {/* story-style segments: the current one fills over the slide time; each is clickable */}
        <div className="rot-segs">
          {slides.map((_, k) => <button key={k} type="button" className={k < idx ? "done" : k === idx ? "on" : ""} aria-label={"Show card " + (k + 1) + " of " + n} aria-current={k === idx} onClick={() => go(k)}>
            {k === idx && !reduce && <i key={idx + ":" + hold} style={{ animationDuration: SLIDE_MS + "ms", animationPlayState: hold ? "paused" : "running" }} />}
          </button>)}
        </div>
      </>)}
      {nav}
    </div>
  );
  return arrows ? <div className="rotrow">{card}</div> : card;
}
