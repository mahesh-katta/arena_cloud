import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { PracticeHome, PracticeRun, Mistakes } from "./Practice.jsx";
import { Home } from "./Home.jsx";
import { SpeedHome, SpeedTopic, SpeedRun } from "./Speed.jsx";
import { MockGroup, MockTest } from "./Mocks.jsx";
import { MocksHome } from "./MockTests.jsx";
import { BoosterHome } from "./Booster.jsx";
import { Settings } from "./Settings.jsx";
import { CourseHome, CourseTopic, CourseLesson } from "./Course.jsx";
import { Setup } from "./Profile.jsx";
import { loadProgress, useProgress, useReady, hasProfile, applyTheme, switchProfile } from "./store.js";
import { examById, profileLabel } from "./exams.js";import { initials } from "./ui.jsx";
import { ICONS, Mark } from "./Icons.jsx";

applyTheme();

function useRoute() {
  const read = () => {
    const h = location.hash.replace(/^#\/?/, "");
    const [path, qs] = h.split("?");
    return { parts: path.split("/").filter(Boolean).map(decodeURIComponent), query: new URLSearchParams(qs || ""), raw: h };
  };
  const [r, set] = useState(read);
  useEffect(() => {
    const f = () => { set(read()); window.scrollTo(0, 0); };
    addEventListener("hashchange", f);
    return () => removeEventListener("hashchange", f);
  }, []);
  return r;
}

/* Home, four places to work, one for settings. Mistakes are reached from the Practice home. */
const TABS = [
  ["home", "Home", "#/home", "Home"],
  ["course", "Modules", "#/course", "Modules"],
  ["practice", "Topic Practice", "#/practice", "Practice"],
  ["speed", "Speed Drills", "#/speed", "Speed"],
  ["mocks", "Mock Tests", "#/mocks", "Mocks"],
  ["booster", "Booster", "#/booster", "Booster"],
  ["settings", "Settings", "#/settings", "Settings"],
];

function Nav({ tab }) {
  const p = useProgress();
  const pr = p.profile;
  const who = p.user ? p.user.name : "";
  return (
    <nav className="side" aria-label="Main">
      <a className="brand" href="#/home" aria-label="Arena home"><span className="logo"><Mark /></span></a>
      {TABS.map(([id, name, href, short]) => (
        <a key={id} href={href} data-label={name} title={name} className={"navitem" + (tab === id ? " on" : "")} aria-current={tab === id ? "page" : undefined}>
          {ICONS[id]}
          <span className="fl">{name}</span><span className="sl">{short}</span>
        </a>
      ))}
      {pr && <ProfileMenu p={p} who={who} pr={pr} />}
    </nav>
  );
}

/* the avatar opens a small menu to switch exam profile in place; Settings keeps name, theme and adding profiles */
function ProfileMenu({ p, who, pr }) {
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  useEffect(() => {
    if (!open) return;
    const off = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    addEventListener("pointerdown", off);
    addEventListener("keydown", esc);
    return () => { removeEventListener("pointerdown", off); removeEventListener("keydown", esc); };
  }, [open]);
  const list = Object.entries(p.profiles).sort((a, b) => b[1].created - a[1].created);
  return (
    <div className="me-wrap" ref={box}>
      <button type="button" className="me" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)} title={who + " · " + pr.examName + (pr.stage ? " " + pr.stage : "") + " (switch profile)"}>
        <span className="av">{initials(who, 1)}</span>
        <span className="mx">{(examById(pr.exam) ? pr.examName : pr.exam)}</span>
        {pr.stage && <span className="mx s">{pr.stage}</span>}
      </button>
      {open && (
        <div className="pmenu" role="menu" aria-label="Switch profile">
          <div className="pm-head"><b>{who}</b><small>Switch profile</small></div>
          {list.map(([id, x]) => {
            const on = p.user.active === id;
            return (
              <button key={id} type="button" role="menuitemradio" aria-checked={on} className={"pm-item" + (on ? " on" : "")}
                onClick={() => { if (!on) { switchProfile(id); location.hash = "#/home"; } setOpen(false); }}>
                <span className="pm-name">{profileLabel(x)}</span>
                <small>{Object.keys(x.mocks).length} tests taken</small>
                {on && <svg className="pm-tick" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>}
              </button>
            );
          })}
          <a className="pm-foot" href="#/settings" onClick={() => setOpen(false)}>Add or manage profiles</a>
        </div>
      )}
    </div>
  );
}

function App() {
  const { parts, query, raw } = useRoute();
  const ready = useReady();
  const p = useProgress();
  useEffect(() => { loadProgress(); }, []);
  const [view, a, b, c] = parts;
  if (!ready) return <div className="app"><main /></div>;
  if (!hasProfile(p)) return <Setup askName name={p.user ? p.user.name : ""} onDone={() => { location.hash = "#/home"; }} />;
  const tab = view === "mock" ? (a && a.startsWith("booster-") ? "booster" : "mocks") : TABS.some((t) => t[0] === view) ? view : !view ? "home" : "practice";
  let body;
  if (view === "practice" && a) body = <PracticeRun key={a} topic={a} query={query} />;
  else if (view === "mistakes") body = <Mistakes />;
  else if (view === "speed" && a && b === "run") body = <SpeedRun key={raw} tid={a} query={query} />;
  else if (view === "speed" && a) body = <SpeedTopic key={raw} tid={a} query={query} />;
  else if (view === "speed") body = <SpeedHome />;
  else if (view === "mocks" && a) body = <MockGroup gid={a} />;
  else if (view === "mocks") body = <MocksHome />;
  else if (view === "mock" && a && b) body = <MockTest key={b} gid={a} mid={b} />;
  else if (view === "booster") body = <BoosterHome />;
  else if (view === "course" && a && b && c) body = <CourseLesson key={raw} subject={a} tid={b} lid={c} />;
  else if (view === "course" && a && b) body = <CourseTopic key={raw} subject={a} tid={b} />;
  else if (view === "course") body = <CourseHome />;
  else if (view === "settings") body = <Settings />;
  else if (view === "practice") body = <PracticeHome />;
  else body = <Home />;
  return (
    <div className="app">
      <Nav tab={tab} />
      <main>{body}</main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
