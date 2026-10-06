import { useState } from "react";
import { useProgress, resetAll, resetTopic, getTheme, setTheme, lessonsOf, doneCount } from "./store.js";
import { useCourse } from "./Course.jsx";

export function Settings({ book }) {
  const p = useProgress();
  const [theme, setT] = useState(getTheme());
  const [topic, setTopic] = useState("");
  const [confirm, setConfirm] = useState(null);
  const [done, setDone] = useState("");
  const topics = [{ id: "basics", mod: book.byId.basics }, ...useCourse(book)].filter((t) => lessonsOf(t.mod).length);
  const nLessons = Object.keys(p.lessons).length;
  const run = () => {
    if (confirm === "all") { resetAll(); setDone("All progress was reset."); }
    else { resetTopic(confirm); setDone(book.byId[confirm].title + " was reset."); }
    setConfirm(null);
  };

  return (
    <div className="page">
      <header className="pagehead"><h1>Settings</h1></header>

      <section className="glass pad setting">
        <h3>Appearance</h3>
        <div className="seg">
          {[["auto", "Match device"], ["light", "Light"], ["dark", "Dark"]].map(([k, n]) => (
            <button key={k} className={theme === k ? "on" : ""} onClick={() => { setT(k); setTheme(k); }}>{n}</button>
          ))}
        </div>
      </section>

      <section className="glass pad setting">
        <h3>Your progress</h3>
        <p className="muted">Lessons done: {nLessons} · Questions answered: {Object.keys(p.answers).length} · Mistakes waiting: {p.review.length}. Saved on this computer beside the app folder.</p>
        <div className="toolbar">
          <label className="sel">
            <span>Reset one topic</span>
            <select value={topic} onChange={(e) => setTopic(e.target.value)}>
              <option value="">Choose a topic</option>
              {topics.map((t) => <option key={t.id} value={t.id}>{t.mod.title} ({doneCount(p, t.mod)} done)</option>)}
            </select>
          </label>
          <button className="btn ghost" disabled={!topic} onClick={() => setConfirm(topic)}>Reset topic</button>
        </div>
        <div className="danger">
          <div>
            <b>Reset all progress</b>
            <div className="muted small">Clears every finished lesson, every answer and the mistakes list. This cannot be undone.</div>
          </div>
          <button className="btn danger-btn" onClick={() => setConfirm("all")}>Reset everything</button>
        </div>
        {confirm && (
          <div className="confirm" role="alertdialog" aria-label="Confirm reset">
            <b>{confirm === "all" ? "Reset all progress?" : "Reset " + book.byId[confirm].title + "?"}</b>
            <span className="muted small">{confirm === "all" ? "Everything goes back to zero." : "Its lessons are marked not done and its mistakes are cleared. Answers stay in your history."}</span>
            <div className="actions">
              <button className="btn danger-btn" onClick={run}>Yes, reset</button>
              <button className="btn ghost" onClick={() => setConfirm(null)}>Cancel</button>
            </div>
          </div>
        )}
        {done && <div className="toast" role="status">{done}</div>}
      </section>
    </div>
  );
}

export function Mocks() {
  return (
    <div className="page">
      <section className="hero glass soon">
        <div className="hero-text">
          <div className="eyebrow">Coming soon</div>
          <h1>Mocks</h1>
          <p className="muted">Full-length timed tests in the IBPS Clerk Prelims pattern, with a section-wise score and every mistake sent to My mistakes.</p>
          <a className="btn primary" href="#/practice">Practise by topic meanwhile</a>
        </div>
      </section>
    </div>
  );
}
