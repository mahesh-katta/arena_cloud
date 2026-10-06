import { useEffect, useRef, useState } from "react";
import Rich from "./Rich.jsx";
import { recordAnswer } from "./store.js";

const LETTERS = ["a", "b", "c", "d", "e", "f"];

export function Timer({ running, onTick }) {
  const [s, setS] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setS((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  useEffect(() => { onTick && onTick(s); }, [s]);
  return (
    <div className="timer" aria-label="Time on this question">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2" /><path d="M9 2h6" /></svg>
      {Math.floor(s / 60)}:{String(s % 60).padStart(2, "0")}
    </div>
  );
}

export function Options({ options, answer, picked, onPick, bank }) {
  const keys = LETTERS.filter((k) => options && options[k] != null);
  const right = String(answer || "").toLowerCase();
  return (
    <div className="opts">
      {keys.map((k) => {
        let c = "opt";
        if (picked) {
          if (k === right) c += " right";
          else if (k === picked) c += " wrong";
          else c += " dim";
        }
        return (
          <button key={k} className={c} disabled={!!picked} onClick={() => onPick(k)}>
            <span className="letter">{k.toUpperCase()}</span>
            <span><Rich text={options[k]} bank={bank} /></span>
          </button>
        );
      })}
    </div>
  );
}

export function Working({ q }) {
  const lines = (q.work || q.solution || "").split("\n").filter((l) => l.trim());
  if (!lines.length) return <div className="muted">No working is stored for this one.</div>;
  return (
    <div className="worklines">
      {lines.map((l, i) => {
        const hides = l.startsWith("What this one hides:");
        return <div key={i} className={hides ? "muted" : ""}><Rich text={l} bank={q.bank} /></div>;
      })}
    </div>
  );
}

/* One bank question with a running timer. After an answer: the keyed option,
   the working, and Skip / Next question / Practise more. */
export default function Question({ q, label, tag, topic, onNext, onSkip, onMore, nextLabel = "Next question" }) {
  const [picked, setPicked] = useState(null);
  const secs = useRef(0);
  const right = String(q.answer || "").toLowerCase();
  useEffect(() => { setPicked(null); secs.current = 0; }, [q.bank, q.key]);

  const pick = (k) => {
    setPicked(k);
    recordAnswer(q, topic, k === right, secs.current);
  };

  return (
    <div className="qcard">
      <div className="qhead">
        <div className="eyebrow">{label}</div>
        <Timer key={q.bank + q.key} running={!picked} onTick={(s) => (secs.current = s)} />
      </div>
      {q.source && <div className="src">{q.source}</div>}
      {q.passage && (
        <details className="passage" open>
          <summary>Read the information</summary>
          {q.dirs && <p className="pre">{q.dirs}</p>}
          <div className="pre"><Rich text={q.passage} bank={q.bank} /></div>
        </details>
      )}
      {q.img?.map((src) => <img key={src} className="chart" src={"/data/" + q.bank + "/" + src} alt="Chart for this question" />)}
      {!q.passage && q.dirs && q.dirs !== "Choose the correct option." && <div className="muted small">{q.dirs}</div>}
      <div className="stem pre"><Rich text={q.stem} bank={q.bank} /></div>
      <Options options={q.options} answer={q.answer} picked={picked} onPick={pick} bank={q.bank} />
      {picked && (
        <div className={"explain " + (picked === right ? "ok" : "bad")}>
          <div className="verdict">{picked === right ? "Right" : "Not this one: the answer is " + right.toUpperCase()}</div>
          {tag && !(q.work || "").startsWith("What this one hides") && <div className="muted">The disguise: {tag}</div>}
          <Working q={q} />
        </div>
      )}
      <div className="actions">
        {!picked && <button className="btn ghost" onClick={onSkip}>Skip</button>}
        {picked && <button className="btn primary" onClick={onNext}>{nextLabel}</button>}
        {onMore && <button className="btn soft" onClick={onMore}>Practise more</button>}
      </div>
    </div>
  );
}
