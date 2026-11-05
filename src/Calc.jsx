import { useState, useEffect, useRef } from "react";
import { useProgress, addNote, delNote, NOTE_TYPES } from "./store.js";

/* Quick Maths: timed drills for the numbers worth knowing by heart, a calm one-card-at-a-time reference to learn them,
   and the notes the user has kept. */
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const shuffle = (l) => { const a = [...l]; for (let i = a.length - 1; i > 0; i--) { const j = rnd(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const clock = (ms) => { const s = Math.round(ms / 1000); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
/* a fraction as a percent: whole when it ends, else a mixed number such as 33 1/3% */
function pctExact(n, d) {
  const v = (n * 100) / d;
  if (Number.isInteger(v)) return v + "%";
  const whole = Math.floor(v), rem = (n * 100) % d, g = gcd(rem, d), a = rem / g, b = d / g;
  return whole + " " + a + "/" + b + "%";
}
/* what the learner typed: 91, 37.5, 33.3 or 33 1/3 */
function parse(s) {
  s = s.trim().replace(/[%,]/g, "");
  let m = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (m) return +m[1] + +m[2] / +m[3];
  m = s.match(/^(\d+)\/(\d+)$/);
  if (m) return +m[1] / +m[2];
  return /^\d*\.?\d+$/.test(s) ? parseFloat(s) : NaN;
}

const ROUND = 20;
/* Each drill set: its ranges (label, low, high) and every question it can ask. */
const SETS = [
  { id: "tables", name: "Tables", demo: "13 × 7", g: ["#2563EB", "#06B6D4"], levels: [["2 – 10", 2, 10], ["11 – 20", 11, 20], ["2 – 20", 2, 20]],
    pool: (lo, hi) => range(lo, hi).flatMap((a) => range(2, 12).map((b) => ({ k: a + "x" + b, q: a + " × " + b, v: a * b }))) },
  { id: "squares", name: "Squares", demo: "17²", g: ["#7C3AED", "#4F46E5"], levels: [["1 – 25", 1, 25], ["26 – 50", 26, 50], ["1 – 50", 1, 50]],
    pool: (lo, hi) => range(lo, hi).map((n) => ({ k: "s" + n, q: n + "²", v: n * n })) },
  { id: "cubes", name: "Cubes", demo: "9³", g: ["#F97316", "#E11D48"], levels: [["1 – 10", 1, 10], ["11 – 20", 11, 20], ["1 – 20", 1, 20]],
    pool: (lo, hi) => range(lo, hi).map((n) => ({ k: "c" + n, q: n + "³", v: n ** 3 })) },
  { id: "roots", name: "Roots", demo: "√169", g: ["#059669", "#14B8A6"], levels: [["1 – 25", 1, 25], ["26 – 50", 26, 50], ["1 – 50", 1, 50]],
    pool: (lo, hi) => range(lo, hi).map((n) => ({ k: "r" + n, q: "√" + n * n, v: n })) },
  { id: "fractions", name: "Fractions", demo: "3/8", g: ["#DB2777", "#7C3AED"], hint: "Answer as a percent: 37.5, or 33 1/3, then press Enter.", levels: [["Up to 1/10", 2, 10], ["Up to 1/20", 2, 20]],
    pool: (lo, hi) => range(lo, hi).flatMap((d) => range(1, d - 1).filter((n) => gcd(n, d) === 1).map((n) => ({ k: n + "/" + d, q: n + "/" + d, v: (n * 100) / d, show: pctExact(n, d), unit: "%", tol: 0.06 }))) },
];
const hue = (id) => { const g = (SETS.find((x) => x.id === id) || SETS[0]).g; return { "--g1": g[0], "--g2": g[1] }; };
const DRILL_KEY = "arena-calc-drill";
const bestKey = (set, lvl) => "arena-calc-best:" + set + ":" + lvl;

function Run({ qs, set, label, onDone, onExit }) {
  const [i, setI] = useState(0);
  const [val, setVal] = useState("");
  const [state, setState] = useState("ask"); // ask, right, wrong (wrong = answer shown after a peek)
  const [shake, setShake] = useState(false);
  const [res, setRes] = useState([]);
  const [now, setNow] = useState(0);
  const t0 = useRef(performance.now());
  const tq = useRef(performance.now());
  const slipped = useRef(false); // a wrong try on this question
  const wait = useRef(0);
  const shaker = useRef(0);
  const inp = useRef(null);
  const q = qs[i];
  const streak = (() => { let n = 0; for (let k = res.length - 1; k >= 0 && res[k].kind === "right"; k--) n++; return n; })();

  useEffect(() => { const id = setInterval(() => setNow(performance.now() - t0.current), 250); return () => { clearInterval(id); clearTimeout(wait.current); clearTimeout(shaker.current); }; }, []);
  useEffect(() => { inp.current?.focus(); }, [i, state]);

  const next = (r) => {
    clearTimeout(wait.current);
    if (i + 1 >= qs.length) { onDone({ res: r, ms: performance.now() - t0.current }); return; }
    setI(i + 1); setVal(""); setState("ask"); slipped.current = false; tq.current = performance.now();
  };
  const record = (kind) => { const r = [...res, { q, ms: performance.now() - tq.current, kind }]; setRes(r); return r; };
  const peek = () => { if (state === "ask") { record("peek"); setState("wrong"); } };
  const miss = () => {
    slipped.current = true; setVal(""); setShake(true);
    clearTimeout(shaker.current); shaker.current = setTimeout(() => setShake(false), 380);
  };
  /* checks itself: the moment the typed value is the answer it moves on; a whole-number answer that has as many digits
     as the answer and is still wrong shakes and clears. Fractions have no fixed length, so those wait for Enter. */
  const check = (t, force) => {
    const g = parse(t);
    if (!Number.isNaN(g) && Math.abs(g - q.v) <= (q.tol || 0)) {
      const r = record(slipped.current ? "wrong" : "right"); setState("right");
      wait.current = setTimeout(() => next(r), 320);
    } else if (force || (!q.unit && t.length >= String(q.v).length)) miss();
  };
  const change = (e) => {
    if (state !== "ask") return;
    const t = q.unit ? e.target.value : e.target.value.replace(/\D/g, "");
    setVal(t);
    if (t) check(t.trim(), false);
  };
  const enter = () => {
    if (state !== "ask") { next(res); return; }
    const t = val.trim();
    if (!t) peek(); else check(t, true);
  };

  return (
    <div className="dr" style={hue(set.id)}>
      <div className="dr-bar" role="progressbar" aria-valuemin={0} aria-valuemax={qs.length} aria-valuenow={i}><i style={{ width: (i / qs.length) * 100 + "%" }} /></div>
      <div className="dr-meta"><span className="dr-pill">{set.name} · {label}</span><span>{i + 1} / {qs.length}</span><span className="grow" />{streak > 1 && <span className="dr-streak">{streak} in a row</span>}<span>{clock(now)}</span><button type="button" className="btn ghost sm" onClick={onExit}>Quit</button></div>
      <div className={"dr-card " + state + (shake ? " bad" : "")}>
        <div className="dr-q">{q.q}</div>
        <div className={"dr-ans" + (shake ? " shake" : "")}><span className="dr-eq">=</span>
          <input ref={inp} value={val} readOnly={state !== "ask"} inputMode={q.unit ? "text" : "numeric"} autoComplete="off" spellCheck={false} aria-label={"Answer for " + q.q} placeholder="?"
            onChange={change} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); enter(); } }} />
          {q.unit && <span className="dr-eq">{q.unit}</span>}
        </div>
        <div className="dr-fb" aria-live="polite">
          {state === "right" && <span className="ok">Correct</span>}
          {state === "wrong" && <span className="no">Answer: <b>{q.show || q.v}</b></span>}
          {state === "ask" && shake && <span className="no">Not quite, try again</span>}
          {state === "ask" && !shake && q.unit && <span className="muted">e.g. 37.5 or 33 1/3, then Enter</span>}
        </div>
      </div>
      <div className="dr-actions">
        {state === "wrong" ? <button type="button" className="btn primary" onClick={() => next(res)}>Next <kbd>Enter</kbd></button>
          : <button type="button" className="btn" disabled={state !== "ask"} onClick={peek}>Peek at answer</button>}
      </div>
      <p className="dr-help">It checks as you type. A wrong answer shakes and clears so you can try again. Enter on an empty box peeks, and a peek counts as a miss.</p>
    </div>
  );
}

function Summary({ r, set, onAgain, onMisses, onBack }) {
  const total = r.res.length, ok = r.ok, misses = r.res.filter((x) => x.kind !== "right");
  const slow = r.res.filter((x) => x.kind === "right").sort((a, b) => b.ms - a.ms).slice(0, 4);
  return (
    <div className="dr dr-sum" style={hue(set.id)}>
      <div className="dr-score"><b>{ok}</b><span>/ {total}</span></div>
      <p className="dr-line">{Math.round((ok / total) * 100)}% right · {clock(r.ms)} total · {(r.ms / total / 1000).toFixed(1)}s each</p>
      {r.practice ? null : r.better && r.prev ? <p className="dr-badge">New best</p> : r.prev ? <p className="muted small">Best so far: {r.prev.ok}/{r.prev.n} in {clock(r.prev.ms)}</p> : <p className="dr-badge">First score saved</p>}
      {misses.length > 0 && <div className="dr-list"><h4>Missed</h4><div>{misses.map((x, k) => <span key={k} className="dr-chip bad">{x.q.q} = <b>{x.q.show || x.q.v}</b></span>)}</div></div>}
      {slow.length > 0 && <div className="dr-list"><h4>Slowest right answers</h4><div>{slow.map((x, k) => <span key={k} className="dr-chip">{x.q.q} <i>{(x.ms / 1000).toFixed(1)}s</i></span>)}</div></div>}
      <div className="dr-actions">
        {misses.length > 0 && <button type="button" className="btn primary" onClick={onMisses}>Drill the {misses.length} missed</button>}
        <button type="button" className={"btn" + (misses.length ? "" : " primary")} onClick={onAgain}>Go again</button>
        <button type="button" className="btn ghost" onClick={onBack}>Change set</button>
      </div>
    </div>
  );
}

function Drill() {
  const [pick, setPick] = useState(() => { const s = store.get(DRILL_KEY, {}); const set = SETS.find((x) => x.id === s.set) || SETS[0]; return { set: set.id, lvl: set.levels[s.lvl] ? s.lvl : 0 }; });
  const [round, setRound] = useState(null); // { id, qs, practice }
  const [result, setResult] = useState(null);
  const set = SETS.find((x) => x.id === pick.set), [, lo, hi] = set.levels[pick.lvl];
  const poolSize = set.pool(lo, hi).length;
  const best = store.get(bestKey(pick.set, pick.lvl), null);

  const start = (qs, practice) => { setResult(null); setRound({ id: Date.now(), qs, practice }); };
  const begin = () => { store.set(DRILL_KEY, pick); start(shuffle(set.pool(lo, hi)).slice(0, ROUND), false); };
  const finish = (r) => {
    const ok = r.res.filter((x) => x.kind === "right").length;
    const out = { ...r, ok, practice: round.practice };
    if (!round.practice) {
      const prev = store.get(bestKey(pick.set, pick.lvl), null);
      out.prev = prev; out.better = !prev || ok > prev.ok || (ok === prev.ok && r.ms < prev.ms);
      if (out.better) store.set(bestKey(pick.set, pick.lvl), { ok, ms: r.ms, n: r.res.length });
    }
    setRound(null); setResult(out);
  };

  if (round) return <Run key={round.id} qs={round.qs} set={set} label={set.levels[pick.lvl][0]} onDone={finish} onExit={() => setRound(null)} />;
  if (result) return <Summary r={result} set={set} onAgain={begin} onBack={() => setResult(null)} onMisses={() => start(shuffle(result.res.filter((x) => x.kind !== "right").map((x) => x.q)), true)} />;
  return (
    <div className="dr" style={hue(set.id)}>
      <div className="dr-tiles" role="radiogroup" aria-label="What to drill">
        {SETS.map((s) => <button key={s.id} type="button" role="radio" aria-checked={s.id === pick.set} style={hue(s.id)} className={"dr-tile" + (s.id === pick.set ? " on" : "")} onClick={() => setPick({ set: s.id, lvl: 0 })}><b>{s.demo}</b><span>{s.name}</span></button>)}
      </div>
      <div className="dr-panel"><h4 className="dr-lab">Range</h4>
      <div className="cq-pick" role="radiogroup" aria-label="Range">{set.levels.map(([n], k) => <button key={n} type="button" role="radio" aria-checked={k === pick.lvl} className={"wide" + (k === pick.lvl ? " on" : "")} onClick={() => setPick({ ...pick, lvl: k })}>{n}</button>)}</div>
      <div className="dr-go">
        <button type="button" className="btn primary dr-start" autoFocus onClick={begin}>Start · {Math.min(ROUND, poolSize)} questions</button>
        <span className="dr-best">{best ? <>Best <b>{best.ok}/{best.n}</b> in {clock(best.ms)}</> : "No score yet for this range"}</span>
      </div>
      <p className="dr-help">{set.hint || "Type the answer. It checks itself, so there is nothing to press."} Misses come back in a re-drill at the end.</p></div>
    </div>
  );
}

/* Learn: one table, one ten, one denominator at a time. Cover the answers and tap each one to peek. */
function Cell({ q, a, sub, cover, row, dim }) {
  const [open, setOpen] = useState(false);
  const hidden = cover && !open, Tag = cover ? "button" : "div";
  return (
    <Tag type={cover ? "button" : undefined} className={(row ? "ln-row" : "ln-cell") + (hidden ? " hid" : "") + (dim ? " dim" : "")} onClick={cover ? () => setOpen((o) => !o) : undefined}>
      {row ? <><span>{q}</span><b>{hidden ? "?" : a}</b></> : <><small>{q}</small><b>{hidden ? "?" : a}</b>{sub && <i>{hidden ? "\u00a0" : sub}</i>}</>}
    </Tag>
  );
}

const LEARN = [["tables", "Tables"], ["squares", "Squares"], ["cubes", "Cubes"], ["fractions", "Fractions"]];
const dec = (k, d) => (k / d).toFixed(4).replace(/0+$/, "");
function Learn() {
  const [set, setSet] = useState(() => { const v = store.get("arena-calc-learn", "tables"); return LEARN.some(([k]) => k === v) ? v : "tables"; });
  const [sub, setSub] = useState({ tables: 12, squares: 1, cubes: 0, fractions: 7 });
  const [cover, setCover] = useState(false);
  const go = (k) => { setSet(k); store.set("arena-calc-learn", k); };
  const at = (v) => setSub((s) => ({ ...s, [set]: v }));
  const tens = (n) => range(0, n - 1).map((k) => [k, k * 10 + 1 + "–" + (k * 10 + 10)]);
  let chips, title, body, tip, note;
  if (set === "tables") {
    const n = sub.tables;
    chips = range(2, 20).map((k) => [k, k]); title = "Table of " + n;
    body = <div className="ln-rows">{range(1, 15).map((i) => <Cell key={i} row q={n + " × " + i} a={n * i} cover={cover} />)}</div>;
    note = "× 1 to 15";
    tip = "Build from what you know: 13 × 7 = 10 × 7 + 3 × 7 = 70 + 21.";
  } else if (set === "squares") {
    const t = sub.squares;
    chips = tens(10); title = "Squares " + (t * 10 + 1) + "–" + (t * 10 + 10);
    body = <div className="ln-grid">{range(t * 10 + 1, t * 10 + 10).map((i) => <Cell key={i} q={i + "²"} a={i * i} cover={cover} />)}</div>;
    note = "Ten at a time";
    tip = "Ends in 5? Take n(n+1) and put 25 after it: 35² = 3 × 4 = 12, then 25 → 1225.";
  } else if (set === "cubes") {
    const t = sub.cubes;
    chips = tens(3); title = "Cubes " + (t * 10 + 1) + "–" + (t * 10 + 10);
    body = <div className="ln-grid">{range(t * 10 + 1, t * 10 + 10).map((i) => <Cell key={i} q={i + "³"} a={i ** 3} cover={cover} />)}</div>;
    note = "Ten at a time";
    tip = "Last digits swap in pairs: 2 ↔ 8 and 3 ↔ 7. The others stay the same (4³ ends in 4, 9³ ends in 9).";
  } else {
    const d = sub.fractions;
    chips = [[0, "1/n"], ...range(2, 20).map((k) => [k, "/" + k])]; title = d === 0 ? "One over n" : "Fractions over " + d;
    body = <div className="ln-grid f">{(d === 0 ? range(2, 20).map((n) => [1, n]) : range(1, d - 1).map((k) => [k, d])).map(([k, n]) => <Cell key={k + "/" + n} q={k + "/" + n} a={pctExact(k, n)} sub={dec(k, n)} cover={cover} dim={gcd(k, n) > 1} />)}</div>;
    note = d === 0 ? "1/2 to 1/20" : "As a percent and a decimal";
    tip = d === 0 ? "Learn this row first; every other fraction is a multiple of one of these." : "Faded ones reduce to a smaller fraction, so you already know them.";
  }
  return (
    <div className="ln" style={hue(set)}>
      <div className="ln-top">
        <div className="cq-tabs" role="tablist" aria-label="Learn">{LEARN.map(([k, n]) => <button key={k} type="button" role="tab" aria-selected={k === set} className={k === set ? "on" : ""} onClick={() => go(k)}>{n}</button>)}</div>
        <label className="ln-cover"><input type="checkbox" checked={cover} onChange={(e) => setCover(e.target.checked)} /> Cover answers, tap to peek</label>
      </div>
      <div className="cq-pick" role="tablist" aria-label="Pick">{chips.map(([v, n]) => <button key={v} type="button" role="tab" aria-selected={v === sub[set]} className={(String(n).length > 3 ? "wide " : "") + (v === sub[set] ? "on" : "")} onClick={() => at(v)}>{n}</button>)}</div>
      <section className="ln-card" key={set + sub[set] + cover}>
        <div className="ln-head"><h3>{title}</h3><span>{note}</span></div>
        {body}
        <p className="ln-tip">{tip}</p>
      </section>
    </div>
  );
}

function Notes() {
  const p = useProgress();
  const [type, setType] = useState("all");
  const [nt, setNt] = useState("shortcut");
  const [text, setText] = useState("");
  const all = Object.entries(p.notes || {}).flatMap(([k, l]) => l.map((n) => ({ ...n, k, from: k === "calc" ? "Quick maths" : k.startsWith("set:") ? "A passage" : "A question" }))).sort((a, b) => b.at - a.at);
  const shown = all.filter((n) => type === "all" || n.type === type);
  const names = Object.fromEntries(NOTE_TYPES);
  const save = () => { const t = text.trim(); if (!t) return; addNote("calc", { type: nt, text: t }); setText(""); };
  return (
    <div className="cq-body">
      <section className="cq-card wide notepad-lite"><h3>Add a quick-maths note</h3>
        <div className="ntypes" role="radiogroup" aria-label="Kind of note">{NOTE_TYPES.map(([k, n]) => <button key={k} type="button" role="radio" aria-checked={nt === k} className={"ntbtn n-" + k + (nt === k ? " on" : "")} onClick={() => setNt(k)}>{n}</button>)}</div>
        <textarea rows={2} value={text} placeholder="e.g. Any number ending in 5, squared: n(n+1) then 25" onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); save(); } }} />
        <div className="nfoot"><span className="grow" /><button type="button" className="btn primary sm" disabled={!text.trim()} onClick={save}>Save note</button></div>
      </section>
      <section className="cq-card wide"><h3>All my notes <small className="muted">({all.length})</small></h3>
        <div className="ntypes"><button type="button" className={"ntbtn" + (type === "all" ? " on" : "")} onClick={() => setType("all")}>All</button>{NOTE_TYPES.map(([k, n]) => <button key={k} type="button" className={"ntbtn n-" + k + (type === k ? " on" : "")} onClick={() => setType(k)}>{n}</button>)}</div>
        {!shown.length ? <p className="muted">{all.length ? "No notes of this kind." : "Nothing yet. Use the Note button on any question, or add one above."}</p> : (
          <ul className="nlist cq-notes">{shown.map((n) => (
            <li key={n.id} className={"nrow n-" + n.type}><span className="ntype">{names[n.type]}</span><span className="ntag">{n.from}</span><span className="ntext">{n.text}</span><button type="button" className="ndel" aria-label="Delete note" onClick={() => delNote(n.k, n.id)}>×</button></li>
          ))}</ul>
        )}
      </section>
    </div>
  );
}

const MODES = [["drill", "Drill"], ["learn", "Learn"], ["notes", "My notes"]];

export function Calc() {
  const [v, setV] = useState(() => { const s = store.get("arena-calc-mode", "drill"); return MODES.some(([k]) => k === s) ? s : "drill"; });
  const pick = (x) => { setV(x); store.set("arena-calc-mode", x); };
  return (
    <div className="page calcpage">
      <div className="bp-top chead3"><div><h1>Quick Maths</h1><p className="muted small">Drill until the answer shows up before you think.</p></div></div>
      <div className="cq-tabs" role="tablist" aria-label="Quick maths">{MODES.map(([k, n]) => <button key={k} type="button" role="tab" aria-selected={v === k} className={v === k ? "on" : ""} onClick={() => pick(k)}>{n}</button>)}</div>
      {v === "drill" && <Drill />}
      {v === "learn" && <Learn />}
      {v === "notes" && <Notes />}
    </div>
  );
}
