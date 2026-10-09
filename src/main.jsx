import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { CourseHome, TopicRail, TopicDetail, LessonList } from "./Course.jsx";
import Lesson from "./Lesson.jsx";
import { PracticeHome, PracticePick, PracticeRun, Mistakes } from "./Practice.jsx";
import { Settings, Mocks } from "./Settings.jsx";
import { Grammar, Vocabulary } from "./English.jsx";
import { loadPlaybook, loadProgress, useProgress, applyTheme } from "./store.js";
import { ICONS } from "./Icons.jsx";

applyTheme();

function useRoute() {
  const read = () => {
    const h = location.hash.replace(/^#\/?/, "");
    const [path, qs] = h.split("?");
    return { parts: path.split("/").filter(Boolean).map(decodeURIComponent), query: new URLSearchParams(qs || "") };
  };
  const [r, set] = useState(read);
  useEffect(() => {
    const f = () => { set(read()); window.scrollTo(0, 0); };
    addEventListener("hashchange", f);
    return () => removeEventListener("hashchange", f);
  }, []);
  return r;
}

const TABS = [
  ["course", "Course", "#/"],
  ["practice", "Practice", "#/practice"],
  ["mocks", "Mocks", "#/mocks"],
  ["settings", "Settings", "#/settings"],
];

function Nav({ tab }) {
  const p = useProgress();
  return (
    <nav className="nav glass" aria-label="Main">
      <a className="brand" href="#/"><span className="logo">A</span><span className="brand-text">Arena</span></a>
      {TABS.map(([id, name, href]) => (
        <a key={id} href={href} className={"navitem" + (tab === id ? " on" : "")} aria-current={tab === id ? "page" : undefined}>
          {ICONS[id]}
          <span>{name}</span>
          {id === "mocks" && <em className="pill">Soon</em>}
          {id === "practice" && p.review.length > 0 && <em className="count">{p.review.length}</em>}
        </a>
      ))}
    </nav>
  );
}

function App() {
  const [book, setBook] = useState(null);
  const [err, setErr] = useState(null);
  const { parts, query } = useRoute();
  useEffect(() => { loadPlaybook().then(setBook, (e) => setErr(String(e))); loadProgress(); }, []);

  const [view, a, b] = parts;
  if (view === "more" && a) { location.replace("#/practice/all/" + a); return null; }
  if (view === "review") { location.replace("#/practice/mistakes"); return null; }
  const tab = view === "practice" ? "practice" : view === "mocks" ? "mocks" : view === "settings" ? "settings" : "course";

  let body;
  if (err) body = <div className="page">Could not load the lessons: {err}</div>;
  else if (!book) body = <div className="page muted">Loading the course...</div>;
  else if (view === "english" || ((view === "topic") && book.byId[a]?.english)) body = (
    <div className="cols two">
      <TopicRail book={book} current={a} />
      {a === "grammar" ? <Grammar /> : <Vocabulary />}
    </div>
  );
  else if (view === "topic") body = (
    <div className="cols two">
      {a !== "basics" && <TopicRail book={book} current={a} />}
      <TopicDetail book={book} topic={a} />
    </div>
  );
  else if (view === "lesson") body = (
    <div className={"cols" + (a === "basics" ? " two" : " three")}>
      {a !== "basics" && <TopicRail book={book} current={a} />}
      <aside className="col rail-lessons glass">
        <div className="col-head"><a className="eyebrow" href={"#/topic/" + a}>{book.byId[a]?.title}</a></div>
        <div className="col-scroll"><LessonList book={book} topic={a} current={b} compact /></div>
      </aside>
      <Lesson book={book} topic={a} id={b} />
    </div>
  );
  else if (view === "practice" && a === "mistakes") body = <Mistakes book={book} />;
  else if (view === "practice" && a && b) body = <PracticeRun key={a + b} book={book} src={a} topic={b} query={query} />;
  else if (view === "practice" && a) body = <PracticePick book={book} src={a} />;
  else if (view === "practice") body = <PracticeHome book={book} />;
  else if (view === "mocks") body = <Mocks />;
  else if (view === "settings") body = <Settings book={book} />;
  else body = <CourseHome book={book} />;

  return (
    <div className="app">
      <div className="bg" aria-hidden="true"><i /><i /><i /></div>
      <Nav tab={tab} />
      <main>{body}</main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
