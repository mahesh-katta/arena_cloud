import { useEffect, useState } from "react";
import Blocks from "./Blocks.jsx";
import { COURSE, ASK, LEVEL, ORDERS, ordered } from "./course.js";
import { useProgress, doneCount, lessonsOf, lessonKey, fetchIndex } from "./store.js";

const pref = (k, d) => { try { return localStorage.getItem(k) || d; } catch { return d; } };
const setPref = (k, v) => { try { localStorage.setItem(k, v); } catch {} };

export function useCourse(book) {
  return COURSE.filter((t) => book.byId[t.id]).map((t) => ({ ...t, mod: book.byId[t.id] }));
}

const initials = (s) => {
  const w = s.replace(/&/g, " ").split(/[\s,]+/).filter((x) => /^[A-Z]/.test(x));
  return w.length > 1 ? w[0][0] + w[1][0] : s.slice(0, 2);
};

export function Badge({ title, rank, size = 44 }) {
  const h = (rank * 47 + 230) % 360;
  return (
    <span className="badge" style={{ width: size, height: size, background: `linear-gradient(135deg, hsl(${h} 85% 62%), hsl(${(h + 45) % 360} 85% 58%))` }}>
      {initials(title)}
    </span>
  );
}

export function Ring({ value, size = 44 }) {
  const r = (size - 6) / 2, c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="ring" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} className="ring-bg" />
      <circle cx={size / 2} cy={size / 2} r={r} className="ring-fg" strokeDasharray={c} strokeDashoffset={c * (1 - value)} />
    </svg>
  );
}

export function PartSwitch({ part, onChange }) {
  return (
    <div className="seg" role="tablist">
      {["quant", "reasoning"].map((x) => (
        <button key={x} role="tab" aria-selected={part === x} className={part === x ? "on" : ""} onClick={() => onChange(x)}>
          {x === "quant" ? "Quant" : "Reasoning"}
        </button>
      ))}
    </div>
  );
}

function useCourseControls() {
  const [part, setPart] = useState(pref("arena-part", "quant"));
  const [how, setHow] = useState(pref("arena-order", "suggested"));
  return {
    part, how,
    setPart: (x) => { setPart(x); setPref("arena-part", x); },
    setHow: (x) => { setHow(x); setPref("arena-order", x); },
  };
}

function OrderSelect({ how, setHow }) {
  return (
    <label className="sel">
      <span>Order</span>
      <select value={how} onChange={(e) => setHow(e.target.value)}>
        {ORDERS.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </label>
  );
}

/* The left column on a laptop: every topic of the current part. */
export function TopicRail({ book, current }) {
  const p = useProgress();
  const ctl = useCourseControls();
  const part = book.byId[current]?.part === "reasoning" ? "reasoning" : book.byId[current]?.part === "quant" ? "quant" : ctl.part;
  const list = ordered(useCourse(book).filter((t) => t.mod.part === part), ctl.how);
  return (
    <aside className="col rail-topics glass">
      <div className="col-head">
        <div className="eyebrow">{part === "quant" ? "Quant" : "Reasoning"} topics</div>
      </div>
      <div className="col-scroll">
        {list.map((t) => {
          const n = lessonsOf(t.mod).length, d = doneCount(p, t.mod);
          return (
            <a key={t.id} href={"#/topic/" + t.id} className={"trow-mini" + (t.id === current ? " on" : "")}>
              <Badge title={t.mod.title} rank={t.rank} size={30} />
              <span className="grow">{t.mod.title}</span>
              <span className="muted small">{n ? (d === n ? "Done" : d + "/" + n) : "Notes"}</span>
            </a>
          );
        })}
      </div>
    </aside>
  );
}

export function TopicCard({ t, p, book }) {
  const n = lessonsOf(t.mod).length, d = doneCount(p, t.mod);
  const parent = t.after && book.byId[t.after]?.title;
  return (
    <a className="tcard glass lift" href={"#/topic/" + t.id}>
      <div className="tcard-top">
        <Badge title={t.mod.title} rank={t.rank} />
        {n > 0 && <div className="ringwrap"><Ring value={n ? d / n : 0} /><span>{Math.round((100 * d) / (n || 1))}%</span></div>}
      </div>
      <div className="tname">{t.mod.title}</div>
      <div className="muted small">{n ? n + " lessons" : "Revision notes"} · {LEVEL[t.level]}{parent ? " · after " + parent : ""}</div>
      <div className="tcard-foot">
        <span className={"tag " + ASK[t.ask].c}>{ASK[t.ask].t}</span>
        <span className="small strong">{n ? (d === n ? "Completed" : d ? d + " of " + n + " done" : "Start") : "Open"}</span>
      </div>
    </a>
  );
}

export function CourseHome({ book }) {
  const p = useProgress();
  const ctl = useCourseControls();
  const all = useCourse(book);
  const list = ordered(all.filter((t) => t.mod.part === ctl.part), ctl.how);
  const totalL = all.reduce((s, t) => s + lessonsOf(t.mod).length, 0);
  const doneL = all.reduce((s, t) => s + doneCount(p, t.mod), 0);
  const answers = Object.values(p.answers);
  const right = answers.filter((a) => a.ok).length;
  const last = p.last && book.byId[p.last.topic];
  const resume = last && lessonsOf(last).find((l) => !p.lessons[lessonKey(last.id, l.id)]?.done);
  const firstTopic = list.find((t) => lessonsOf(t.mod).length);
  const startAt = resume ? { mod: last, l: resume } : firstTopic && { mod: firstTopic.mod, l: lessonsOf(firstTopic.mod).find((l) => !p.lessons[lessonKey(firstTopic.id, l.id)]?.done) || lessonsOf(firstTopic.mod)[0] };

  return (
    <div className="page wide">
      <section className="hero glass">
        <div className="hero-text">
          <div className="eyebrow">IBPS Clerk Prelims</div>
          <h1>Learn one pattern at a time.</h1>
          <p className="muted">Short lessons built from real papers. Every topic is open; the suggested order puts the parent topic first.</p>
          {startAt && (
            <a className="btn primary" href={"#/lesson/" + startAt.mod.id + "/" + startAt.l.id}>
              {resume ? "Continue" : "Start"}: {startAt.mod.title} · {startAt.l.title}
            </a>
          )}
        </div>
        <div className="stats">
          <div className="stat"><b>{doneL}<small>/{totalL}</small></b><span>Lessons done</span></div>
          <div className="stat"><b>{answers.length}</b><span>Questions answered</span></div>
          <div className="stat"><b>{answers.length ? Math.round((100 * right) / answers.length) + "%" : "–"}</b><span>Accuracy</span></div>
          <div className="stat"><b>{p.review.length}</b><span>Mistakes to redo</span></div>
        </div>
      </section>

      <div className="toolbar">
        <PartSwitch part={ctl.part} onChange={ctl.setPart} />
        <OrderSelect how={ctl.how} setHow={ctl.setHow} />
      </div>

      {ctl.part === "quant" && (
        <a className="basics glass lift" href="#/topic/basics">
          <Badge title="Basics" rank={11} size={36} />
          <span className="grow"><b>Basics</b><span className="muted small">{book.basics.lessons.length} small ideas every arithmetic topic leans on</span></span>
          <span className="small strong">{doneCount(p, book.byId.basics)}/{book.basics.lessons.length}</span>
        </a>
      )}
      <div className="grid">{list.map((t) => <TopicCard key={t.id} t={t} p={p} book={book} />)}</div>
    </div>
  );
}

/* ---------- One topic ---------- */

const REVISION = ["cheat", "drills", "ladder", "core", "arch"];

function Drill({ item }) {
  return (
    <div className="drill">
      <h4>{item.title}</h4>
      <Blocks blocks={item.body} />
      {(item.qs || []).map((q, i) => (
        <div key={i} className="dq">
          {q.stem && <p>{q.stem}</p>}
          <div className="small">{Object.entries(q.options || {}).map(([k, v]) => <span key={k} className="dopt">{k.toUpperCase()}. {v}</span>)}</div>
        </div>
      ))}
      {item.method && (
        <details className="fold inner"><summary>Answer and method</summary>
          {(item.qs || []).filter((q) => q.answer).map((q, i) => <p key={i}><b>Answer: {q.answer}</b></p>)}
          <Blocks blocks={item.method} />
        </details>
      )}
    </div>
  );
}

function Section({ s }) {
  return (
    <details className="fold glass" open={s.kind === "cheat"}>
      <summary>{s.title}</summary>
      <Blocks blocks={s.lead} />
      <Blocks blocks={s.blocks} />
      {s.kind === "drills" && s.items.map((it, i) => <Drill key={i} item={it} />)}
      {s.kind === "arch" && s.items?.map((it, i) => (
        <details key={i} className="fold inner"><summary>{it.code ? it.code + ". " : ""}{it.title}</summary><Blocks blocks={it.blocks} /></details>
      ))}
    </details>
  );
}

function Papers({ topic }) {
  const [ix, setIx] = useState(null);
  useEffect(() => { fetchIndex().then(setIx); }, []);
  if (!ix) return <div className="muted">Loading...</div>;
  const c = ix[topic] || {};
  return (
    <div className="glass pad">
      {c.papers
        ? <><p><b>{c.papers}</b> IBPS Clerk Prelims questions (memory-based) on this topic.</p><a className="btn primary" href={"#/practice/papers/" + topic}>Practise the paper questions</a></>
        : <p className="muted">No previous-paper questions for this topic yet.</p>}
      {c.all > 0 && <p className="small muted">All sources together: {c.all} questions. <a href={"#/practice/all/" + topic}>Practise them</a></p>}
    </div>
  );
}

export function LessonList({ book, topic, current, compact }) {
  const mod = book.byId[topic];
  const p = useProgress();
  const ls = lessonsOf(mod);
  const suggested = ls.find((l) => !p.lessons[lessonKey(topic, l.id)]?.done);
  return (
    <div className="llist">
      {ls.map((l, i) => {
        const d = p.lessons[lessonKey(topic, l.id)];
        const cls = "lrow" + (l.id === current ? " on" : "") + (l === suggested && !current ? " now" : "") + (d?.done ? " done" : "");
        return (
          <a key={l.id} className={cls} href={"#/lesson/" + topic + "/" + l.id}>
            <span className="num">{d?.done ? "✓" : i + 1}</span>
            <span className="lbody">
              <span className="ltitle">{l.title}</span>
              {!compact && <span className="muted small">{l.plain}</span>}
            </span>
            {!compact && l === suggested && <span className="tag sug">Suggested</span>}
            {!compact && d?.done && d.total > 0 && <span className="muted small">{d.right}/{d.total}</span>}
          </a>
        );
      })}
    </div>
  );
}

export function TopicDetail({ book, topic }) {
  const mod = book.byId[topic];
  const p = useProgress();
  const [tab, setTab] = useState("lessons");
  useEffect(() => setTab("lessons"), [topic]);
  if (!mod) return <div className="page">No such topic. <a href="#/">Back</a></div>;
  const ls = lessonsOf(mod);
  const c = COURSE.find((x) => x.id === topic);
  const sections = REVISION.map((k) => mod.sections.find((s) => s.kind === k)).filter(Boolean);
  const tabs = [["lessons", "Lessons"], ...(sections.length ? [["revision", "Quick revision"]] : []), ...(topic !== "basics" ? [["papers", "Papers"]] : [])];
  const d = doneCount(p, mod);

  return (
    <div className="detail">
      <a className="back" href="#/">← All topics</a>
      <div className="dhead glass">
        <Badge title={mod.title} rank={c ? c.rank : 11} size={56} />
        <div className="grow">
          <h2>{mod.title}</h2>
          <div className="meta">
            {c && <span className={"tag " + ASK[c.ask].c}>{ASK[c.ask].t}</span>}
            <span className="muted small">{ls.length ? d + " of " + ls.length + " lessons" : "Revision notes"}{c ? " · " + LEVEL[c.level] : ""}</span>
          </div>
          {ls.length > 0 && <div className="bar-line"><span style={{ width: (100 * d) / ls.length + "%" }} /></div>}
        </div>
        {topic !== "basics" && <a className="btn soft hide-sm" href={"#/practice/all/" + topic}>Practise</a>}
      </div>
      <div className="tabs" role="tablist">
        {tabs.map(([k, n]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{n}</button>)}
      </div>
      {tab === "lessons" && (
        <>
          {mod.guide?.intro && <details className="fold glass"><summary>About this topic</summary><Blocks blocks={mod.guide.intro} /></details>}
          {!ls.length && <p className="muted">No lessons yet. Quick revision has the notes.</p>}
          <LessonList book={book} topic={topic} />
          {topic !== "basics" && <a className="btn soft" href={"#/practice/all/" + topic}>Practise {mod.title} questions</a>}
        </>
      )}
      {tab === "revision" && sections.map((s, i) => <Section key={i} s={s} />)}
      {tab === "papers" && <Papers topic={topic} />}
    </div>
  );
}
