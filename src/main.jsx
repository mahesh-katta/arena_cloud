import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import Home, { useCourse } from "./Home.jsx";
import Topic from "./Topic.jsx";
import Lesson from "./Lesson.jsx";
import More from "./More.jsx";
import Review from "./Review.jsx";
import { loadPlaybook, loadProgress, useProgress, doneCount, lessonsOf } from "./store.js";

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

function Side({ book, current }) {
  const p = useProgress();
  const all = useCourse(book);
  const part = book.byId[current]?.part || "quant";
  return (
    <aside className="side">
      <div className="eyebrow">{part === "reasoning" ? "Reasoning" : "Quant"} topics</div>
      {all.filter((t) => t.mod.part === part).map((t) => {
        const n = lessonsOf(t.mod).length;
        const d = doneCount(p, t.mod);
        return (
          <a key={t.id} href={"#/topic/" + t.id} className={"srow" + (t.id === current ? " on" : "")}>
            <span>{t.mod.title}</span><span className="muted">{n ? (d === n ? "Done" : d + "/" + n) : "notes"}</span>
          </a>
        );
      })}
    </aside>
  );
}

function App() {
  const [book, setBook] = useState(null);
  const [err, setErr] = useState(null);
  const { parts, query } = useRoute();
  const p = useProgress();
  useEffect(() => { loadPlaybook().then(setBook, (e) => setErr(String(e))); loadProgress(); }, []);

  const [view, a, b] = parts;
  const tab = view === "review" ? "review" : view === "mocks" ? "mocks" : "course";
  let body = null, current = null;
  if (err) body = <div className="page">Could not load the lessons: {err}</div>;
  else if (!book) body = <div className="page muted">Loading the course...</div>;
  else if (view === "topic") { current = a; body = <Topic book={book} topic={a} />; }
  else if (view === "lesson") { current = a; body = <Lesson book={book} topic={a} id={b} />; }
  else if (view === "more") { current = a; body = <More key={a + query} book={book} topic={a} query={query} />; }
  else if (view === "review") body = <Review book={book} />;
  else if (view === "mocks") body = <div className="page"><h2>Mocks</h2><p className="muted">Full mock tests come here later.</p></div>;
  else body = <Home book={book} />;

  return (
    <>
      <header className="top">
        <a className="brand" href="#/">Arena Course</a>
        <nav aria-label="Main">
          <a href="#/" className={tab === "course" ? "on" : ""}>Course</a>
          <a href="#/review" className={tab === "review" ? "on" : ""}>Review{p.review.length ? " · " + p.review.length : ""}</a>
          <a href="#/mocks" className={tab === "mocks" ? "on" : ""}>Mocks <span className="soon">soon</span></a>
        </nav>
      </header>
      <div className={"shell" + (current && current !== "basics" && book ? " withside" : "")}>
        {current && current !== "basics" && book && <Side book={book} current={current} />}
        <main>{body}</main>
      </div>
    </>
  );
}

createRoot(document.getElementById("root")).render(<App />);
