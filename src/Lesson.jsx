import { useEffect, useState } from "react";
import Blocks, { Inline } from "./Blocks.jsx";
import Question, { Options } from "./Question.jsx";
import { fetchQuestions, markLesson, lessonsOf, useProgress, lessonKey, setLessonDone } from "./store.js";
import { go } from "./nav.js";
import { ICONS } from "./Icons.jsx";

const STEPS = ["Learn", "Example", "Check", "Practice", "Done"];

/* Every step can be opened directly: nothing in a lesson is locked. */
function Steps({ at, onJump }) {
  return (
    <div className="steps" role="tablist" aria-label="Lesson steps">
      {STEPS.map((s, i) => (
        <button key={s} role="tab" aria-selected={i === at} className={"step" + (i < at ? " past" : i === at ? " now" : "")} onClick={() => onJump(i)}>
          <span />{s}
        </button>
      ))}
    </div>
  );
}

function Bar({ children }) {
  return <div className="actions">{children}</div>;
}

const SkipBtn = ({ onClick, children = "Skip" }) => (
  <button className="btn ghost" onClick={onClick}>{ICONS.skip}{children}</button>
);

function Learn({ lesson, book, onNext }) {
  const needs = (lesson.needs || []).map((id) => book.basics.lessons.find((b) => b.id === id)).filter(Boolean);
  return (
    <>
      <p className="lead">{lesson.plain}</p>
      {needs.length > 0 && (
        <div className="needs">
          <span className="muted small">Builds on:</span>
          {needs.map((b) => <a key={b.id} className="chip" href={"#/lesson/basics/" + b.id}>{b.title}</a>)}
        </div>
      )}
      <Blocks blocks={lesson.teach} />
      <Bar>
        <button className="btn primary" onClick={onNext}>See it worked</button>
        <SkipBtn onClick={onNext}>Skip to the example</SkipBtn>
      </Bar>
    </>
  );
}

function Example({ ex, onNext }) {
  const [shown, setShown] = useState(1);
  const all = shown > ex.steps.length;
  return (
    <>
      <div className="exq glass-inner"><span className="eyebrow">Worked example</span><div><Inline x={ex.q} /></div></div>
      <ol className="exsteps">{ex.steps.slice(0, shown).map((s, i) => <li key={i}><Inline x={s} /></li>)}</ol>
      {all && <div className="answer">Answer: <Inline x={ex.answer} /></div>}
      <Bar>
        {!all && <button className="btn primary" onClick={() => setShown(shown + 1)}>{shown === ex.steps.length ? "Show the answer" : "Next step"}</button>}
        {!all && <button className="btn ghost" onClick={() => setShown(ex.steps.length + 1)}>Show all</button>}
        {all && <button className="btn primary" onClick={onNext}>Try one yourself</button>}
        {!all && <SkipBtn onClick={onNext} />}
      </Bar>
    </>
  );
}

function Checks({ checks, onNext }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(null);
  const c = checks[i];
  useEffect(() => { if (!c) onNext(); }, [c]);
  if (!c) return null;
  const right = c.answer.toLowerCase();
  const next = () => { if (i + 1 < checks.length) { setI(i + 1); setPicked(null); } else onNext(); };
  return (
    <>
      <div className="eyebrow">Quick check{checks.length > 1 ? " " + (i + 1) + " of " + checks.length : ""}</div>
      <div className="stem"><Inline x={c.q} /></div>
      <Options options={c.options} answer={c.answer} picked={picked} onPick={setPicked} bank="lesson" />
      {picked && (
        <div className={"explain " + (picked === right ? "ok" : "bad")}>
          <div className="verdict">{picked === right ? "Right" : "Not quite: it is " + right.toUpperCase()}</div>
          <div><Inline x={c.why} /></div>
        </div>
      )}
      <Bar>
        {picked && <button className="btn primary" onClick={next}>Continue</button>}
        {!picked && <SkipBtn onClick={next} />}
      </Bar>
    </>
  );
}

function Practice({ lesson, topic, onDone }) {
  const pr = lesson.practice;
  const [qs, setQs] = useState(null);
  const [i, setI] = useState(0);
  const p = useProgress();
  useEffect(() => {
    if (!pr) { onDone(); return; }
    fetchQuestions(pr.keys.map((k) => pr.bank + ":" + k)).then(setQs);
  }, [lesson.id]);
  if (!pr) return null;
  if (!qs) return <div className="muted">Loading the practice questions...</div>;
  if (!qs.length) return <Bar><span className="muted">No practice questions for this lesson.</span><button className="btn primary" onClick={onDone}>Finish</button></Bar>;
  const q = qs[i];
  const tagOf = (qq) => pr.tags?.[pr.keys.indexOf(qq.key)];
  const next = () => (i + 1 < qs.length ? setI(i + 1) : onDone());
  return (
    <>
      <div className="bars">{qs.map((x, j) => {
        const a = p.answers[x.bank + ":" + x.key];
        return <button key={j} aria-label={"Question " + (j + 1)} onClick={() => setI(j)} className={j === i ? "now" : a ? (a.ok ? "ok" : "bad") : ""} />;
      })}</div>
      <Question q={q} topic={topic} label={"Practice · " + (i + 1) + " of " + qs.length} tag={tagOf(q)}
        onNext={next} onSkip={next} onMore={() => go("#/practice/all/" + topic)}
        nextLabel={i + 1 < qs.length ? "Next question" : "Finish the lesson"} />
      <Bar><button className="btn link" onClick={onDone}>Skip the rest of the practice</button></Bar>
    </>
  );
}

function Done({ lesson, mod, nextL, onRedo }) {
  const p = useProgress();
  const keys = lesson.practice ? lesson.practice.keys.map((k) => lesson.practice.bank + ":" + k) : [];
  const right = keys.filter((k) => p.answers[k]?.ok).length;
  const missed = keys.filter((k) => p.answers[k] && !p.answers[k].ok).length;
  useEffect(() => { markLesson(mod.id, lesson.id, right, keys.length); }, []);
  return (
    <>
      <div className="donebox">
        <div className="big">Lesson done</div>
        {keys.length > 0 && <div>{right} of {keys.length} practice questions right{missed ? " · " + missed + " saved to My mistakes" : ""}</div>}
      </div>
      {lesson.shortcut && (
        <details className="fold glass-inner">
          <summary>Shortcut: {lesson.shortcut.title}</summary>
          <Blocks blocks={lesson.shortcut.text} />
        </details>
      )}
      <Bar>
        {nextL && <button className="btn primary" onClick={() => go("#/lesson/" + mod.id + "/" + nextL.id)}>Next: {nextL.title}</button>}
        {mod.id !== "basics" && <button className="btn soft" onClick={() => go("#/practice/all/" + mod.id)}>Practise more</button>}
        <button className="btn ghost" onClick={onRedo}>Do it again</button>
      </Bar>
    </>
  );
}

export default function Lesson({ book, topic, id }) {
  const mod = book.byId[topic];
  const ls = lessonsOf(mod);
  const lesson = ls.find((l) => l.id === id);
  const p = useProgress();
  const [step, setStep] = useState(0);
  const [run, setRun] = useState(0);
  useEffect(() => { setStep(0); }, [topic, id, run]);
  if (!lesson) return <div className="page">That lesson is not here. <a href="#/">Back to the course</a></div>;
  const n = ls.indexOf(lesson) + 1;
  const after = ls.slice(n);
  const nextL = after.find((l) => !p.lessons[lessonKey(mod.id, l.id)]?.done) || after[0];
  const isDone = !!p.lessons[lessonKey(mod.id, lesson.id)]?.done;
  const markDone = () => {
    setLessonDone(mod.id, lesson.id, true);
    if (nextL) go("#/lesson/" + mod.id + "/" + nextL.id);
  };
  const jump = (s) => { setStep(s); document.querySelector("main")?.scrollTo?.(0, 0); window.scrollTo(0, 0); };
  return (
    <article className="lesson glass" key={run}>
      <div className="lesson-top">
        <a className="back" href={"#/topic/" + mod.id}>← {mod.title}</a>
        <span className="muted small">Lesson {n} of {ls.length}</span>
        <span className="lesson-acts">
          {isDone
            ? <button className="pillbtn done" onClick={() => setLessonDone(mod.id, lesson.id, false)} title="Mark as not done">{ICONS.check} Done</button>
            : <button className="pillbtn" onClick={markDone}>{ICONS.check} Mark as done</button>}
          {nextL && <a className="pillbtn" href={"#/lesson/" + mod.id + "/" + nextL.id}>Skip lesson {ICONS.skip}</a>}
        </span>
      </div>
      <h2>{lesson.title}</h2>
      <Steps at={step} onJump={jump} />
      {step === 0 && <Learn lesson={lesson} book={book} onNext={() => jump(1)} />}
      {step === 1 && <Example ex={lesson.example} onNext={() => jump(2)} />}
      {step === 2 && <Checks checks={lesson.checks || []} onNext={() => jump(3)} />}
      {step === 3 && <Practice lesson={lesson} topic={topic} onDone={() => jump(4)} />}
      {step === 4 && <Done lesson={lesson} mod={mod} nextL={nextL} onRedo={() => setRun(run + 1)} />}
    </article>
  );
}
