import { useState } from "react";
import { Tabs } from "./ui.jsx";
import { Setup } from "./Profile.jsx";
import { profileLabel } from "./exams.js";
import { useProgress, resetAll, resetPart, getTheme, setTheme, switchProfile, setName } from "./store.js";

export function Settings() {
  const p = useProgress();
  const [theme, setT] = useState(getTheme());
  const [confirm, setConfirm] = useState(null);
  const [done, setDone] = useState("");
  const [adding, setAdding] = useState(false);
  const [nm, setNm] = useState(null);
  const NAMES = { all: "all progress, history and last practised", practice: "topic practice answers and the mistakes list", speed: "Speed maths drill scores", mocks: "mock test and booster results of this profile" };
  const run = () => { confirm === "all" ? resetAll() : resetPart(confirm); setDone("Reset " + NAMES[confirm] + (confirm === "all" ? ", including last practised, course history, saved positions and filters." : ".")); if (confirm === "all") setTimeout(() => location.reload(), 900); setConfirm(null); };
  const profiles = Object.entries(p.profiles).sort((a, b) => b[1].created - a[1].created);
  const name = nm ?? (p.user ? p.user.name : "");
  return (
    <div className="page narrow">
      <div className="head"><div><h1>Settings</h1></div></div>
      <div className="card pad section">
        <h3>Profile</h3>
        <form className="namerow" onSubmit={(e) => { e.preventDefault(); if (name.trim()) { setName(name); setNm(null); setDone("Name saved."); } }}>
          <input className="field" aria-label="Your name" value={name} onChange={(e) => setNm(e.target.value)} maxLength={40} />
          <button className="btn" disabled={!name.trim() || name.trim() === (p.user && p.user.name)}>Save name</button>
        </form>
        <p className="muted small" style={{ margin: "14px 0 8px" }}>Each exam and stage has its own mock-test and booster progress. Topic practice, speed drills and mistakes are shared.</p>
        <div className="proflist">
          {profiles.map(([id, pr]) => {
            const on = p.user && p.user.active === id;
            return (
              <div key={id} className={"card profrow" + (on ? " on" : "")}>
                <span className="grow"><b>{profileLabel(pr)}</b><small className="muted">{Object.keys(pr.mocks).length} tests taken</small></span>
                {on ? <span className="chip ok">Open now</span> : <button className="btn" onClick={() => { switchProfile(id); location.hash = "#/home"; }}>Switch</button>}
              </div>
            );
          })}
        </div>
        <div className="actions"><button className="btn primary" onClick={() => setAdding(true)}>Add a profile</button></div>
      </div>
      <div className="card pad section">
        <h3>Appearance</h3>
        <Tabs label="Theme" value={theme} onChange={(k) => { setT(k); setTheme(k); }} items={[["auto", "System"], ["light", "Light"], ["dark", "Dark"]]} />
      </div>
      <div className="card pad section">
        <h3>Progress</h3>
        <div className="statrow">
          <div className="card"><b>{Object.keys(p.answers).length}</b><span>Questions answered</span></div>
          <div className="card"><b>{p.review.length}</b><span>Mistakes to revise</span></div>
          <div className="card"><b>{Object.keys(p.speed).length}</b><span>Speed drill sets done</span></div>
          <div className="card"><b>{Object.keys(p.mocks).length}</b><span>Mock and booster tests taken</span></div>
        </div>
        <p className="muted small" style={{ marginBottom: 12 }}>Saved on this computer beside the app folder (arena_dashboard_progress.json).</p>
        <div className="actions">
          {[["practice", "Reset topic practice"], ["speed", "Reset speed drills"], ["mocks", "Reset this profile’s tests"]].map(([k, n]) => <button key={k} className="btn" onClick={() => setConfirm(k)}>{n}</button>)}
          <span className="grow" />
          <button className="btn danger" onClick={() => setConfirm("all")}>Reset everything</button>
        </div>
        {done && <div className="toast">{done}</div>}
      </div>
      <div className="card pad section">
        <h3>Keyboard</h3>
        <div className="noterow">
          <span><span className="kbd">A–E</span> / <span className="kbd">1–5</span> answer</span>
          <span><span className="kbd">↵</span> next</span><span><span className="kbd">←</span> previous</span>
          <span><span className="kbd">S</span> skip</span><span><span className="kbd">V</span> solution</span>
          <span><span className="kbd">M</span> mark (mocks)</span><span><span className="kbd">C</span> clear (mocks)</span>
        </div>
      </div>
      {adding && (
        <div className="dialog wide" onClick={() => setAdding(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <Setup askName={false} onCancel={() => setAdding(false)} onDone={() => { setAdding(false); location.hash = "#/home"; }} />
          </div>
        </div>
      )}
      {confirm && (
        <div className="dialog" onClick={() => setConfirm(null)}>
          <div className="box" onClick={(e) => e.stopPropagation()}>
            <h2>Reset {NAMES[confirm]}?</h2>
            <p>This cannot be undone.</p>
            <div className="actions"><button className="btn primary" onClick={run}>Reset</button><button className="btn ghost" onClick={() => setConfirm(null)}>Cancel</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

export function CourseSoon() {
  return (
    <div className="page narrow">
      <div className="head"><div><h1>Course</h1><div className="sub">Study plan and topic playbook — coming later</div></div></div>
      <div className="card pad empty">A guided course and playbook will live here. The data is ready for it: every question carries its section, topic and subtopic.
        <div className="actions" style={{ justifyContent: "center", marginTop: 14 }}><a className="btn primary" href="#/practice">Go to topic-wise practice</a></div></div>
    </div>
  );
}
