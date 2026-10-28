import { useState } from "react";
import { EXAMS, examById } from "./exams.js";
import { createProfile } from "./store.js";
import { initials } from "./ui.jsx";
import { Mark } from "./Icons.jsx";

/* Name → exam → stage. First run asks all three; "Add a profile" in Settings skips the name. */
export function Setup({ askName, name: given = "", onDone, onCancel }) {
  const [step, setStep] = useState(askName ? "name" : "exam");
  const [name, setName] = useState(given);
  const [q, setQ] = useState("");
  const [exam, setExam] = useState(null);
  const [pick, setPick] = useState(null);
  const [date, setDate] = useState("");
  const todayStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const finish = (e, stage) => { setPick({ e, stage }); setStep("date"); };
  const create = (examDate) => { const id = createProfile({ name, exam: pick.e.id, stage: pick.stage, examDate }); onDone && onDone(id); };
  const pickExam = (e) => (e.stages.length ? (setExam(e), setStep("stage")) : finish(e, ""));
  const ql = q.trim().toLowerCase();
  const list = EXAMS.filter((e) => !ql || e.name.toLowerCase().includes(ql));
  const steps = askName ? ["name", "exam", "stage", "date"] : ["exam", "stage", "date"];
  return (
    <div className={askName ? "setup full" : "setup"}>
      <div className="setupcard card">
        {askName && <div className="setuplogo"><span className="logo"><Mark /></span></div>}
        <ol className="stepdots" aria-label="Setup steps">
          {steps.map((s, i) => <li key={s} className={s === step ? "on" : steps.indexOf(step) > i ? "done" : ""}><i />{{ name: "Name", exam: "Exam", stage: "Stage", date: "Date" }[s]}</li>)}
        </ol>

        {step === "name" && (
          <form onSubmit={(ev) => { ev.preventDefault(); if (name.trim()) setStep("exam"); }}>
            <h1>Welcome to Arena</h1>
            <p className="muted">What should we call you?</p>
            <input className="field" autoFocus aria-label="Your name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
            <div className="actions"><button className="btn primary" disabled={!name.trim()}>Continue</button></div>
          </form>
        )}

        {step === "exam" && (
          <div>
            <h1>{askName ? "Which exam are you preparing for?" : "Add a profile"}</h1>
            <p className="muted">{askName ? "Mock tests and the booster plan will follow this exam. Each exam and stage keeps its own progress." : "Pick another exam or stage. Its mock and booster progress starts fresh; practice, speed drills and mistakes stay shared."}</p>
            <input className="search" aria-label="Search exams" placeholder="Search exams" value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="examgrid">
              {list.map((e) => (
                <button key={e.id} type="button" className="card examcard" onClick={() => pickExam(e)}>
                  <span className="tile">{initials(e.name)}</span>
                  <span className="grow"><b>{e.name}</b><small className="muted">{e.stages.length ? e.stages.join(" · ") : "Single stage"}</small></span>
                </button>
              ))}
              {!list.length && <div className="empty">No exam matches “{q}”.</div>}
            </div>
            <div className="actions">
              {askName && <button className="btn ghost" onClick={() => setStep("name")}>Back</button>}
              {onCancel && <button className="btn ghost" onClick={onCancel}>Cancel</button>}
            </div>
          </div>
        )}

        {step === "stage" && exam && (
          <div>
            <h1>{exam.name}: Prelims or Mains?</h1>
            <p className="muted">You can add the other stage later from Settings. It will keep its own progress.</p>
            <div className="stagepick">
              {examById(exam.id).stages.map((s) => (
                <button key={s} type="button" className="card stagecard" onClick={() => finish(exam, s)}><b>{s}</b><small className="muted">{exam.name}</small></button>
              ))}
            </div>
            <div className="actions"><button className="btn ghost" onClick={() => setStep("exam")}>Back</button></div>
          </div>
        )}

        {step === "date" && pick && (
          <form onSubmit={(ev) => { ev.preventDefault(); if (date) create(date); }}>
            <h1>When is your exam?</h1>
            <p className="muted">{pick.e.name}{pick.stage ? " · " + pick.stage : ""}. We will count the days down on your home screen. You can change it any time.</p>
            <input className="field" type="date" autoFocus aria-label="Exam date" min={todayStr} value={date} onChange={(e) => setDate(e.target.value)} />
            <div className="actions">
              <button type="button" className="btn ghost" onClick={() => setStep(pick.stage ? "stage" : "exam")}>Back</button>
              <button type="button" className="btn ghost" onClick={() => create("")}>Skip for now</button>
              <button className="btn primary" disabled={!date}>Start</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* "Browse all exams / courses" switch, shared by Mocks and Booster for this browser session. */
export function useScope() {
  const [all, set] = useState(() => { try { return sessionStorage.getItem("ap-allexams") === "1"; } catch { return false; } });
  const toggle = (v) => { try { sessionStorage.setItem("ap-allexams", v ? "1" : ""); } catch {} set(v); };
  return [all, toggle];
}
