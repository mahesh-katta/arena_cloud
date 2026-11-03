import { useState } from "react";
import { useProgress, addNote, delNote, NOTE_TYPES } from "./store.js";

/* Quick Maths: the tables, squares, cubes and fractions worth knowing by heart, and the notes the user has kept. */
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
/* a fraction as a percent: whole when it ends, else a mixed number such as 33 1/3% */
function pctExact(n, d) {
  const v = (n * 100) / d;
  if (Number.isInteger(v)) return v + "%";
  const whole = Math.floor(v), rem = (n * 100) % d, g = gcd(rem, d), a = rem / g, b = d / g;
  return whole + " " + a + "/" + b + "%";
}

const VIEWS = [["tables", "Tables"], ["squares", "Squares"], ["cubes", "Cubes"], ["fractions", "Fractions"], ["notes", "My notes"]];

function Tables() {
  const [n, setN] = useState(13);
  return (
    <div className="cq-body">
      <div className="cq-pick" role="tablist" aria-label="Table of">{range(2, 20).map((k) => <button key={k} type="button" role="tab" aria-selected={k === n} className={k === n ? "on" : ""} onClick={() => setN(k)}>{k}</button>)}</div>
      <div className="cq-cards">
        <section className="cq-card big"><h3>Table of {n}</h3><ol className="cq-rows">{range(1, 15).map((i) => <li key={i}><span>{n} × {i}</span><b>{n * i}</b></li>)}</ol></section>
        <section className="cq-card wide"><h3>All tables, 2 to 20</h3>
          <div className="cq-all">{range(2, 20).map((k) => (
            <div key={k} className={"cq-mini" + (k === n ? " on" : "")} onClick={() => setN(k)}><b>{k}</b><span>{range(1, 15).map((i) => k * i).join(" · ")}</span></div>
          ))}</div>
        </section>
      </div>
    </div>
  );
}

const Grid = ({ title, nums, f, sym }) => (
  <section className="cq-card wide"><h3>{title}</h3>
    <div className="cq-grid">{nums.map((i) => <div key={i} className="cq-cell"><small>{i}{sym}</small><b>{f(i).toLocaleString("en-IN")}</b></div>)}</div>
  </section>
);

function Fractions() {
  const [d, setD] = useState(7);
  const ds = range(2, 25);
  const nums = range(1, d - 1);
  return (
    <div className="cq-body">
      <section className="cq-card wide"><h3>One over n</h3>
        <div className="cq-grid f">{range(2, 30).map((n) => <div key={n} className="cq-cell"><small>1/{n}</small><b>{pctExact(1, n)}</b><i>{(1 / n).toFixed(4).replace(/0+$/, "")}</i></div>)}</div>
      </section>
      <section className="cq-card wide"><h3>Every fraction over</h3>
        <div className="cq-pick" role="tablist" aria-label="Denominator">{ds.map((k) => <button key={k} type="button" role="tab" aria-selected={k === d} className={k === d ? "on" : ""} onClick={() => setD(k)}>{k}</button>)}</div>
        <div className="cq-grid f">{nums.map((k) => <div key={k} className={"cq-cell" + (gcd(k, d) > 1 ? " dim" : "")}><small>{k}/{d}</small><b>{pctExact(k, d)}</b><i>{(k / d).toFixed(4).replace(/0+$/, "")}</i></div>)}</div>
        <p className="muted small">Faded ones reduce to a smaller fraction.</p>
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

export function Calc() {
  const [v, setV] = useState(() => { try { return localStorage.getItem("arena-calc-view") || "tables"; } catch { return "tables"; } });
  const pick = (x) => { setV(x); try { localStorage.setItem("arena-calc-view", x); } catch {} };
  return (
    <div className="page calcpage">
      <div className="bp-top chead3"><div><h1>Quick Maths</h1><p className="muted small">Know these cold and the calculation part of the paper gets faster.</p></div></div>
      <div className="cq-tabs" role="tablist" aria-label="Quick maths">{VIEWS.map(([k, n]) => <button key={k} type="button" role="tab" aria-selected={v === k} className={v === k ? "on" : ""} onClick={() => pick(k)}>{n}</button>)}</div>
      {v === "tables" && <Tables />}
      {v === "squares" && <div className="cq-body"><Grid title="Squares, 1 to 100" nums={range(1, 100)} f={(i) => i * i} sym="²" /></div>}
      {v === "cubes" && <div className="cq-body"><Grid title="Cubes, 1 to 30" nums={range(1, 30)} f={(i) => i ** 3} sym="³" /></div>}
      {v === "fractions" && <Fractions />}
      {v === "notes" && <Notes />}
    </div>
  );
}
