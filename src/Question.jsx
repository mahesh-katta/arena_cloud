import { useEffect, useRef, useState } from "react";
import { recordAnswer, addNote, delNote, useProgress, NOTE_TYPES } from "./store.js";
import { secClass } from "./ui.jsx";
import { Maths } from "./mathfmt.jsx";

export const imgSrc = (p) => (/^https?:/.test(p) ? p : "/data/" + p);
export const fmt = (s) => (s >= 3600 ? Math.floor(s / 3600) + ":" + String(Math.floor((s % 3600) / 60)).padStart(2, "0") : Math.floor(s / 60)) + ":" + String(s % 60).padStart(2, "0");

/* Plain text with line breaks; "[Image n]" markers become the n-th image. */
/* Some stored passages are hard-wrapped mid-sentence ("...same as between B\nand the one who..."). Join a break when the
   line before is a long run of prose with no closing punctuation and the next line carries on in lowercase words. */
export function unwrap(text) {
  const L = String(text).split("\n");
  let out = L[0];
  for (let i = 1; i < L.length; i++) {
    const prev = L[i - 1].trimEnd();
    const next = L[i].trimStart();
    out += prev.length >= 18 && /[A-Za-z0-9,;]$/.test(prev) && /^[a-z]{2,}(\s|[,.;]|$)/.test(next) && !/^\[Image/.test(next) ? " " + next : "\n" + L[i];
  }
  return out;
}

/* Puzzle clues are one running paragraph in the book but stored a sentence per line. Only for passages and questions
   (flow): join two lines when both are long full sentences. Never touches the opening direction, labels such as
   "Statement 1:" / "Note:" / "Condition", list items, numbered or lettered lines, short lines, tables or image markers. */
const KEEP = /^(study|read|direction|note|statement|condition|given|answer|case|step|table|information|[ivx]+[.)]|\(?[a-eA-E1-9][.)]|[•\-*]|\[image)/i;
export function flow(text) {
  const L = String(text).split("\n");
  let out = L[0];
  for (let i = 1; i < L.length; i++) {
    const prev = L[i - 1].trim(), next = L[i].trim();
    const join = prev.length >= 50 && next.length >= 50 && /[.?!)]$/.test(prev) && /^[A-Z]/.test(next) && !KEEP.test(prev) && !KEEP.test(next) && !/[=@#$%&|]/.test(prev + next);
    out += join ? " " + next : "\n" + L[i];
  }
  return out;
}

export function Text({ text, images = [], className = "", join = false }) {
  if (!text) return null;
  const parts = (join ? flow(unwrap(text)) : unwrap(text)).split(/(\[Image \d+\])/g);
  return (
    <div className={"pre " + className}>
      {parts.map((s, i) => {
        const m = s.match(/^\[Image (\d+)\]$/);
        if (m && images[+m[1] - 1]) return <img key={i} className="chart" src={imgSrc(images[+m[1] - 1])} alt={"Image " + m[1]} loading="lazy" />;
        return s ? <span key={i}><Maths text={s} /></span> : null;
      })}
    </div>
  );
}

/* Directions stored in front of the question ("What value should come in place of (?)...")
   are shown as a quiet line above it, with any a)-e) answer legend. */
const DIR = /(following|given below|question mark|\(\?\)|directions?|study the|read the|answer the|each of the|in the given|in these questions|find (out )?the wrong|logically follows?|statements? and|relationship between|determine|choose the|select the)/i;
/* A few questions store the direction and the question on ONE line (no line break); split those by their exact boilerplate. */
const ONE_LINE = [
  /^(What (?:approximate )?(?:value|number)s? (?:will|should|can) (?:come|replace)[^?]*?\(\?\)[^?]*\?(?:\s*\([^)]*\))?)\s+(\S[\s\S]*)$/,
  /^(In this question,? two equations numbered I (?:&|and) II are given\.[^.]*\.)\s+(I\.[\s\S]*)$/,
];
export function splitDirection(text) {
  const t = String(text || "");
  if (!t.includes("\n")) {
    const lab = t.match(/^Directions?:\s+(\S[\s\S]*)$/);   /* "Direction: Select the word ..." the label is the whole direction */
    if (lab) return [null, lab[1]];
    for (const re of ONE_LINE) { const m = t.match(re); if (m) return [m[1], m[2].replace(/\s+(II\.)/, "\n$1")]; }
  }
  const lines = t.split("\n");
  const first = (lines[0] || "").trim();
  if (lines.length < 2 || first.length > 600 || !DIR.test(first) || !/[?:.,]\s*$/.test(first)) return [null, t];
  let k = 1;
  while (k < lines.length - 1 && /^\s*\(?[a-eA-E1-5]\)\s*\S/.test(lines[k]) && !/\?\s*$/.test(lines[k])) k++;
  const rest = lines.slice(k).join("\n").trim();
  return rest ? [lines.slice(0, k).join("\n"), rest] : [null, t];
}

export function Solution({ q }) {
  const imgs = q.explanation_image_paths || [];
  const used = new Set([...(q.explanation || "").matchAll(/\[Image (\d+)\]/g)].map((m) => +m[1] - 1));
  return (
    <div className="solution">
      <div className="lbl">Solution · answer {q.correct_option}</div>
      {!q.explanation && !imgs.length ? <div className="muted">No written solution is stored for this question.</div> : (
        <>
          <Text text={q.explanation} images={imgs} />
          {imgs.map((p, i) => (used.has(i) ? null : <img key={i} className="chart" src={imgSrc(p)} alt="" loading="lazy" />))}
        </>
      )}
    </div>
  );
}

export function Timer({ running, onTick, countdown, resetKey, cls = "" }) {
  const [s, setS] = useState(0);
  useEffect(() => setS(0), [resetKey]);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setS((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, [running, resetKey]);
  useEffect(() => { onTick && onTick(s); }, [s]);
  const v = countdown != null ? Math.max(0, countdown - s) : s;
  return <span className={"timer" + (countdown != null && v < 60 ? " low" : "") + (cls ? " " + cls : "")}>{fmt(v)}</span>;
}

/* The shared passage or chart for a set, the direction line, and the question. */
export const hasSet = (q) => !!(q.common_data || (q.common_data_image_paths || []).length);
export function SetInfo({ q }) {
  if (!hasSet(q)) return null;
  return (
    <details className="passage" open>
      <summary>Information for this set</summary>
      <Text text={q.common_data} join />
      {(q.common_data_image_paths || []).map((p) => <img key={p} className="chart" src={imgSrc(p)} alt="Chart for this set" />)}
    </details>
  );
}
export function QBody({ q }) {
  const [dir, body] = splitDirection(unwrap(q.question || ""));
  return (
    <>
      {dir && <div className="dirline pre">{dir}</div>}
      {(q.question_image_paths || []).map((p) => <img key={p} className="chart" src={imgSrc(p)} alt="Question image" />)}
      <Text className="qtext" text={body} join />
    </>
  );
}
export function Stem({ q }) { return <><SetInfo q={q} /><QBody q={q} /></>; }

/* Mocks on a wide screen: the passage on the left, the question on the right. */
export function SplitQ({ q, children }) {
  if (!hasSet(q)) return <div className="inner"><QBody q={q} />{children}</div>;
  return (
    <div className="qsplit">
      <div className="qsplit-l"><SetInfo q={q} /></div>
      <div className="qsplit-r"><QBody q={q} />{children}</div>
    </div>
  );
}

/* reveal: after answering, mark the key green and a wrong pick red. */
export function Options({ q, picked, onPick, reveal = true }) {
  const long = q.options.some((o) => (o.text || "").length > 44 || /\n/.test(o.text || ""));
  return (
    <div className={"opts" + (long ? " long" : "")}>
      {q.options.map((o) => {
        let c = "opt";
        if (reveal && picked) c += o.label === q.correct_option ? " right" : o.label === picked ? " wrong" : " dim";
        else if (picked === o.label) c += " sel";
        return (
          <button key={o.label} className={c} disabled={reveal && !!picked} onClick={(e) => { e.currentTarget.blur(); onPick(o.label); }}>
            <span className="key">{o.label}</span>
            <span className="pre"><Maths text={o.text} /></span>
          </button>
        );
      })}
    </div>
  );
}

/* Keyboard: A-E or 1-5 pick, Enter / right arrow next, left arrow previous, S skip, V solution. */
export function useKeys(map, deps) {
  useEffect(() => {
    const f = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
      if ((e.key === "Enter" || e.key === " ") && /BUTTON|A/.test(e.target.tagName)) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const fn = map[k] || (/^[a-e1-5]$/.test(k) && map.pick ? () => map.pick("ABCDE"[/\d/.test(k) ? +k - 1 : k.charCodeAt(0) - 97]) : null);
      if (fn) { e.preventDefault(); fn(); }
    };
    addEventListener("keydown", f);
    return () => removeEventListener("keydown", f);
  }, deps);
}

/* How long a question has been open decides the colour of the timer and of the line running round the card.
   Single question: green to 25 s, yellow to 45 s, red after. A question that comes with a passage or set:
   green to 3 min, yellow to 4 min, red after 4 min while the first question of the set is still unanswered;
   once it is answered the clock is the whole set's combined time, and red starts at 5 min. */
const setClock = {};
const setKey = (q) => (hasSet(q) ? (q.common_data || "").slice(0, 120) + "|" + (q.common_data_image_paths || []).join(",") : "");
const LIMITS = { single: [25, 45, 65], set: [180, 240, 300] };
export function phaseOf(secs, isSet, firstDone) {
  const [g, y, r] = isSet ? [180, firstDone ? 300 : 240, firstDone ? 360 : 300] : LIMITS.single;
  if (secs < g) return { ph: 0, frac: secs / g };
  if (secs < y) return { ph: 1, frac: (secs - g) / (y - g) };
  return { ph: 2, frac: Math.min(1, (secs - y) / Math.max(1, r - y)) };
}
const PH = ["g", "y", "r"];

/* The line that runs round the card: the lap in the current colour on top of the finished laps of the colours before it. */
function Trace({ ph, frac }) {
  const dash = (f) => ({ strokeDasharray: f * 100 + " 100" });
  return (
    <svg className={"qtrace p" + PH[ph]} aria-hidden="true">
      {ph > 0 && <rect className={"base " + PH[ph - 1]} pathLength="100" style={dash(1)} />}
      <rect className={"lap " + PH[ph]} pathLength="100" style={dash(frac)} />
    </svg>
  );
}

/* One question card: right or wrong after a pick, the solution on demand,
   and Previous / View solution / Skip-Next inside the card. */

/* Notes on a question: type (note, shortcut, trap, don't, recollect) + text. On a passage question a note can belong to the whole passage or to this question only. */
const hashOf = (t) => { let h = 5381; for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
const TNAME = Object.fromEntries(NOTE_TYPES);
function NotePad({ q, sk, label, onClose }) {
  const p = useProgress();
  const setK = sk ? "set:" + hashOf(sk) : "";
  const [type, setType] = useState("note");
  const [scope, setScope] = useState(sk ? "set" : "q");
  const [text, setText] = useState("");
  useEffect(() => { setText(""); setScope(sk ? "set" : "q"); }, [q.id]);
  const mine = (p.notes || {})[q.id] || [], shared = setK ? (p.notes || {})[setK] || [] : [];
  const save = () => { const t = text.trim(); if (!t) return; if (scope === "set") addNote(setK, { type, text: t, qid: q.id }); else addNote(q.id, { type, text: t }); setText(""); };
  const row = (k, n, tag) => (
    <li key={n.id} className={"nrow n-" + n.type}>
      <span className="ntype">{TNAME[n.type]}</span>{tag && <span className="ntag">{tag}</span>}
      <span className="ntext">{n.text}</span>
      <button type="button" className="ndel" aria-label="Delete note" onClick={() => delNote(k, n.id)}>×</button>
    </li>
  );
  return (
    <div className="notepad" role="group" aria-label="Notes">
      <div className="nhead"><b>Add a note</b>
        {sk && (
          <label className="nscope">Applies to
            <select value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value="set">Whole passage</option>
              <option value="q">This question{label ? " · " + label : ""}</option>
            </select>
          </label>
        )}
        <button type="button" className="btn ghost sm" onClick={onClose}>Close</button>
      </div>
      <div className="ntypes" role="radiogroup" aria-label="Kind of note">
        {NOTE_TYPES.map(([k, n]) => <button key={k} type="button" role="radio" aria-checked={type === k} className={"ntbtn n-" + k + (type === k ? " on" : "")} onClick={() => setType(k)}>{n}</button>)}
      </div>
      <textarea rows={3} value={text} placeholder={type === "shortcut" ? "The quicker way…" : type === "trap" ? "Where people slip…" : type === "dont" ? "What not to do…" : type === "recollect" ? "What to remember…" : "Your note…"} onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); save(); } }} />
      <div className="nfoot"><span className="muted small">{mine.length + shared.length ? mine.length + shared.length + " saved here" : "Saved on this device"}</span><span className="grow" /><button type="button" className="btn primary sm" disabled={!text.trim()} onClick={save}>Save note</button></div>
      {mine.length + shared.length > 0 && <ul className="nlist">{shared.map((n) => row(setK, n, "Passage"))}{mine.map((n) => row(q.id, n, sk ? "This question" : ""))}</ul>}
    </div>
  );
}
export default function Solver({ q, head, chips = [], refInfo, onNext, onPrev, onResult, nextLabel = "Next question" }) {
  const [picked, setPicked] = useState(null);
  const [sol, setSol] = useState(false);
  const secs = useRef(0);
  const [tags, setTags] = useState(false);
  const [notes, setNotes] = useState(false);
  const prog = useProgress();
  const [now, setNow] = useState(0);
  const sk = setKey(q);
  const base = useRef(0);
  const first = useRef(false);
  useEffect(() => { setPicked(null); setSol(false); secs.current = 0; setNow(0); base.current = sk ? (setClock[sk]?.t || 0) : 0; first.current = !!(sk && setClock[sk]?.done); }, [q.id]);
  const tick = (s) => { secs.current = s; setNow(s); if (sk) setClock[sk] = { ...(setClock[sk] || {}), t: base.current + s }; };
  const pick = (k) => {
    if (picked || !q.options.some((o) => o.label === k)) return;
    setPicked(k);
    if (sk) setClock[sk] = { ...(setClock[sk] || {}), done: true };
    const ok = k === q.correct_option;
    recordAnswer(q, ok, secs.current, refInfo);
    onResult && onResult(ok, secs.current);
  };
  useKeys({ pick, Enter: onNext, ArrowRight: onNext, ArrowLeft: onPrev, s: onNext, v: () => setSol((x) => !x), n: () => setNotes((x) => !x) }, [q.id, picked, onNext, onPrev]);
  const total = sk ? base.current + now : now;
  const { ph, frac } = phaseOf(total, !!sk, first.current);
  const shown = chips.filter(Boolean);
  const nCount = ((prog.notes || {})[q.id] || []).length + (sk ? ((prog.notes || {})["set:" + hashOf(sk)] || []).length : 0);
  return (
    <div className={"card qcard " + secClass(q.section) + " ph" + PH[ph]}>
      <Trace ph={ph} frac={frac} />
      <div className="qhead">
        {head && <span className="qno">{head}</span>}
        {shown.length > 0 && <button type="button" className={"qinfo" + (tags ? " on" : "")} aria-pressed={tags} aria-label="Show question details" title="Question details" onClick={() => setTags(!tags)}>i</button>}
        <span className="grow" />
        <Timer running={!picked} resetKey={q.id} onTick={tick} cls={"t-" + PH[ph]} />
      </div>
      {tags && shown.length > 0 && <div className="qtags">{shown.map((c) => { const [t, k] = Array.isArray(c) ? c : [c, ""]; return <span key={t} className={"chip " + k}>{t}</span>; })}</div>}
      <Stem q={q} />
      <Options q={q} picked={picked} onPick={pick} />
      {picked && (
        <div className={"verdict " + (picked === q.correct_option ? "ok" : "bad")}>
          {picked === q.correct_option ? "Correct" : "Incorrect · the answer is " + q.correct_option}
          <span className="grow" /><span className="mono small">{fmt(secs.current)}</span>
        </div>
      )}
      {sol && <Solution q={q} />}
      {notes && <NotePad q={q} sk={sk} label={head ? head.replace(/\s*\/.*$/, "") : ""} onClose={() => setNotes(false)} />}
      <div className="qactions">
        <button className="btn ghost" disabled={!onPrev} onClick={onPrev}>Previous</button>
        <button className={"btn" + (sol ? " on" : "")} onClick={() => setSol((x) => !x)}>{sol ? "Hide solution" : "View solution"} <kbd>V</kbd></button>
        <button className={"btn" + (notes ? " on" : "")} aria-expanded={notes} onClick={() => setNotes((x) => !x)}>Note{nCount ? <span className="ncount">{nCount}</span> : null} <kbd>N</kbd></button>
        <span className="grow" />
        <span className="kbdhelp"><kbd>A–E</kbd> answer <kbd>S</kbd> skip</span>
        <button className={"btn" + (picked ? " primary" : "")} onClick={onNext}>{picked ? nextLabel : "Skip & next"} <kbd>↵</kbd></button>
      </div>
    </div>
  );
}
