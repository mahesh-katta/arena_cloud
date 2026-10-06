import { useState } from "react";
import { COURSE, ASK, LEVEL, ORDERS, ordered } from "./course.js";
import { useProgress, doneCount, lessonsOf, lessonKey } from "./store.js";

const pref = (k, d) => { try { return localStorage.getItem(k) || d; } catch { return d; } };
const setPref = (k, v) => { try { localStorage.setItem(k, v); } catch {} };

export function useCourse(book) {
  return COURSE.filter((t) => book.byId[t.id]).map((t) => ({ ...t, mod: book.byId[t.id] }));
}

export function TopicCard({ t, book, p }) {
  const n = lessonsOf(t.mod).length;
  const d = doneCount(p, t.mod);
  const parent = t.after && book.byId[t.after]?.title;
  return (
    <a className="tcard" href={"#/topic/" + t.id}>
      <div className="trow">
        <div className="tname">{t.mod.title}</div>
        <span className={"tag " + ASK[t.ask].c}>{ASK[t.ask].t}</span>
      </div>
      <div className="muted small">
        {n ? n + " lessons" : "Quick revision only"} · {LEVEL[t.level]}{parent ? " · after " + parent : ""}
      </div>
      {n > 0 && <div className="meter"><span style={{ width: (100 * d) / n + "%" }} /></div>}
      {n > 0 && <div className="small">{d === n ? "Done" : d ? d + " of " + n + " done" : "Not started"}</div>}
    </a>
  );
}

export default function Home({ book }) {
  const p = useProgress();
  const [part, setPart] = useState(pref("arena-part", "quant"));
  const [how, setHow] = useState(pref("arena-order", "suggested"));
  const all = useCourse(book);
  const list = ordered(all.filter((t) => t.mod.part === part), how);
  const last = p.last && book.byId[p.last.topic];
  const lastLesson = last && lessonsOf(last).find((l) => l.id === p.last.lesson);
  const resume = last && (() => {
    const ls = lessonsOf(last);
    return ls.find((l) => !p.lessons[lessonKey(last.id, l.id)]?.done);
  })();

  return (
    <div className="page">
      {last && resume && (
        <a className="resume" href={"#/lesson/" + last.id + "/" + resume.id}>
          <div className="eyebrow">Carry on</div>
          <div className="tname">{last.title}: {resume.title}</div>
          {lastLesson && <div className="muted small">Last finished: {lastLesson.title}</div>}
        </a>
      )}
      <div className="bar">
        <div className="seg" role="tablist">
          {["quant", "reasoning"].map((x) => (
            <button key={x} role="tab" aria-selected={part === x} className={part === x ? "on" : ""} onClick={() => { setPart(x); setPref("arena-part", x); }}>
              {x === "quant" ? "Quant" : "Reasoning"}
            </button>
          ))}
        </div>
        <label className="sel">
          <span>Order</span>
          <select value={how} onChange={(e) => { setHow(e.target.value); setPref("arena-order", e.target.value); }}>
            {ORDERS.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </label>
      </div>
      {part === "quant" && (
        <a className="basics" href={"#/topic/basics"}>
          <b>Basics</b> <span className="muted small">· {book.basics.lessons.length} small ideas every arithmetic topic leans on</span>
        </a>
      )}
      <div className="grid">{list.map((t) => <TopicCard key={t.id} t={t} book={book} p={p} />)}</div>
    </div>
  );
}
