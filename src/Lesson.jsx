import { useEffect, useState } from "react";
import Blocks, { Inline } from "./Blocks.jsx";
import Question, { Options } from "./Question.jsx";
import { fetchQuestions, markLesson, lessonsOf, useProgress, lessonKey } from "./store.js";
import { go } from "./nav.js";

const STEPS = ["Learn", "Example", "Check", "Practice", "Done"];

function Steps({ at }) {
  return (
    <div className="steps" aria-label="Lesson steps">
      {STEPS.map((s, i) => <div key={s} className={"step" + (i < at ? " past" : i === at ? " now" : "")}><span />{s}</div>)}
    </div>
  );
}

function Learn({ lesson, book, onNext }) {
  const needs = (lesson.needs || []).map((id) => book.basics.lessons.find((b) => b.id === id)).filter(Boolean);
  return (
    <>
      <p className="lead">{lesson.plain}</p>
      {needs.length > 0 && (
        <div className="needs">
          <span className="muted small">Leans on:</span>
          {needs.map((b) => <a key={b.id} className="chip" href={"#/lesson/basics/" + b.id}>{b.title}</a>)}
        </div>
      )}
      <Blocks blocks={lesson.teach} />
      <div className="actions"><button className="btn primary" onClick={onNext}>See it worked</button></div>
    </>
  );
}

function Example({ ex, onNext }) {
  const [shown, setShown] = useState(1);
  const all = shown > ex.steps.length;
  return (
    <>
      <div className="exq"><Inline x={ex.q} /></div>
      <ol className="exsteps">{ex.steps.slice(0, shown).map((s, i) => <li key={i}><Inline x={s} /></li>)}</ol>
      {all && <div className="answer">Answer: <Inline x={ex.answer} /></div>}
      <div className="actions">
        {!all && <button className="btn primary" onClick={() => setShown(shown + 1)}>{shown === ex.steps.length ? "Show the answer" : "Next step"}</button>}
        {!all && <button className="btn ghost" onClick={() => setShown(ex.steps.length + 1)}>Show all</button>}
        {all && <button className="btn primary" onClick={onNext}>Try one</button>}
      </div>
    </>
  );
}

function Checks({ checks, onNext }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(null);
  const c = checks[i];
  if (!c) return null;
  const right = c.answer.toLowerCase();
  const next = () => { if (i + 1 < checks.length) { setI(i + 1); setPicked(null); } else onNext(); };
  return (
    <>
      <div className="eyebrow">Quick check {checks.length > 1 ? (i + 1) + " of " + checks.length : ""}</div>
      <div className="stem"><Inline x={c.q} /></div>
      <Options options={c.options} answer={c.answer} picked={picked} onPick={setPicked} bank="lesson" />
      {picked && (
        <div className={"explain " + (picked === right ? "ok" : "bad")}>
          <div className="verdict">{picked === right ? "Right" : "Not quite: it is " + right.toUpperCase()}</div>
          <div><Inline x={c.why} /></div>
        </div>
      )}
      <div className="actions">
        {picked && <button className="btn primary" onClick={next}>Continue</button>}
        {!picked && <button className="btn ghost" onClick={next}>Skip</button>}
      </div>
    </>
  );
}

function Practice({ lesson, topic, onDone }) {
  const pr = lesson.practice;
  const [qs, setQs] = useState(null);
  const [i, setI] = useState(0);
  const p = useProgress();
  useEffect(() => {
    if (!pr) return onDone();
    fetchQuestions(pr.keys.map((k) => pr.bank + ":" + k)).then(setQs);
  }, [lesson.id]);
  if (!pr) return null;
  if (!qs) return <div className="muted">Loading the practice questions...</div>;
  if (!qs.length) return <div className="actions"><span className="muted">No practice questions for this lesson.</span><button className="btn primary" onClick={onDone}>Finish</button></div>;
  const q = qs[i];
  const tagOf = (qq) => pr.tags?.[pr.keys.indexOf(qq.key)];
  const next = () => (i + 1 < qs.length ? setI(i + 1) : onDone());
  return (
    <>
      <div className="bars">{qs.map((x, j) => {
        const a = p.answers[x.bank + ":" + x.key];
        return <span key={j} className={j === i ? "now" : j < i ? (a ? (a.ok ? "ok" : "bad") : "skip") : ""} />;
      })}</div>
      <Question q={q} topic={topic} label={"Practice · question " + (i + 1) + " of " + qs.length} tag={tagOf(q)}
        onNext={next} onSkip={next} onMore={() => go("#/more/" + topic)}
        nextLabel={i + 1 < qs.length ? "Next question" : "Finish the lesson"} />
    </>
  );
}

function Done({ lesson, mod, onRedo }) {
  const p = useProgress();
  const keys = lesson.practice ? lesson.practice.keys.map((k) => lesson.practice.bank + ":" + k) : [];
  const right = keys.filter((k) => p.answers[k]?.ok).length;
  const missed = keys.filter((k) => p.answers[k] && !p.answers[k].ok).length;
  const ls = lessonsOf(mod);
  const nextL = ls.slice(ls.indexOf(lesson) + 1).find((l) => !p.lessons[lessonKey(mod.id, l.id)]?.done) || ls[ls.indexOf(lesson) + 1];
  useEffect(() => { markLesson(mod.id, lesson.id, right, keys.length); }, []);
  return (
    <>
      <div className="donebox">
        <div className="big">Lesson done</div>
        {keys.length > 0 && <div>{right} of {keys.length} practice questions right{missed ? " · " + missed + " went to Review" : ""}</div>}
      </div>
      {lesson.shortcut && (
        <details className="fold">
          <summary>Shortcut: {lesson.shortcut.title}</summary>
          <Blocks blocks={lesson.shortcut.text} />
        </details>
      )}
      <div className="actions">
        {nextL && mod.id !== "basics" && <button className="btn primary" onClick={() => go("#/lesson/" + mod.id + "/" + nextL.id)}>Next lesson: {nextL.title}</button>}
        <button className="btn soft" onClick={() => go(mod.id === "basics" ? "#/" : "#/more/" + mod.id)}>{mod.id === "basics" ? "Back to the course" : "Practise more"}</button>
        <button className="btn ghost" onClick={onRedo}>Do it again</button>
        {mod.id !== "basics" && <button className="btn ghost" onClick={() => go("#/topic/" + mod.id)}>All lessons</button>}
      </div>
    </>
  );
}

export default function Lesson({ book, topic, id }) {
  const mod = book.byId[topic];
  const lesson = lessonsOf(mod).find((l) => l.id === id);
  const [step, setStep] = useState(0);
  const [run, setRun] = useState(0);
  useEffect(() => { setStep(0); window.scrollTo(0, 0); }, [topic, id, run]);
  if (!lesson) return <div className="page">That lesson is not here. <a href="#/">Back to the course</a></div>;
  const n = lessonsOf(mod).indexOf(lesson) + 1;
  const next = () => { setStep((s) => s + 1); window.scrollTo(0, 0); };
  return (
    <article className="lesson" key={run}>
      <div className="crumbs"><a href={mod.id === "basics" ? "#/" : "#/topic/" + mod.id}>{mod.title}</a> · Lesson {n} of {lessonsOf(mod).length}</div>
      <h2>{lesson.title}</h2>
      <Steps at={step} />
      {step === 0 && <Learn lesson={lesson} book={book} onNext={next} />}
      {step === 1 && <Example ex={lesson.example} onNext={next} />}
      {step === 2 && <Checks checks={lesson.checks || []} onNext={next} />}
      {step === 3 && <Practice lesson={lesson} topic={topic} onDone={next} />}
      {step === 4 && <Done lesson={lesson} mod={mod} onRedo={() => setRun(run + 1)} />}
    </article>
  );
}
