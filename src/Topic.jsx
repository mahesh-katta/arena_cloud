import { useEffect, useState } from "react";
import Blocks from "./Blocks.jsx";
import { ASK, LEVEL, COURSE } from "./course.js";
import { useProgress, lessonsOf, lessonKey, fetchPool, doneCount } from "./store.js";

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
      {item.method && <details className="fold"><summary>Answer and method</summary>{(item.qs || []).filter((q) => q.answer).map((q, i) => <p key={i}><b>Answer: {q.answer}</b></p>)}<Blocks blocks={item.method} /></details>}
    </div>
  );
}

function Section({ s }) {
  return (
    <details className="fold sect" open={s.kind === "cheat"}>
      <summary>{s.title}</summary>
      <Blocks blocks={s.lead} />
      <Blocks blocks={s.blocks} />
      {s.kind === "drills" && s.items.map((it, i) => <Drill key={i} item={it} />)}
      {s.kind === "arch" && s.items?.map((it, i) => (
        <details key={i} className="fold"><summary>{it.code ? it.code + ". " : ""}{it.title}</summary><Blocks blocks={it.blocks} /></details>
      ))}
    </details>
  );
}

function Papers({ topic }) {
  const [pool, setPool] = useState(null);
  useEffect(() => { fetchPool(topic).then(setPool); }, [topic]);
  if (!pool) return <div className="muted">Loading...</div>;
  const pyq = pool.items.filter((x) => x.pyq);
  if (!pyq.length) return <p className="muted">No previous-paper set for this topic yet. Practise more has the bank questions.</p>;
  return (
    <>
      <p>{pyq.length} IBPS Clerk Prelims questions (memory-based) on this topic.</p>
      <a className="btn primary" href={"#/more/" + topic + "?src=clerk&type=" + encodeURIComponent("Previous papers") + "&pyq=1"}>Practise the paper questions</a>
    </>
  );
}

export default function Topic({ book, topic }) {
  const mod = book.byId[topic];
  const p = useProgress();
  const [tab, setTab] = useState("lessons");
  useEffect(() => setTab("lessons"), [topic]);
  if (!mod) return <div className="page">No such topic. <a href="#/">Back</a></div>;
  const ls = lessonsOf(mod);
  const c = COURSE.find((x) => x.id === topic);
  const suggested = ls.find((l) => !p.lessons[lessonKey(topic, l.id)]?.done);
  const sections = REVISION.map((k) => mod.sections.find((s) => s.kind === k)).filter(Boolean);
  const tabs = [["lessons", "Lessons"], ...(sections.length ? [["revision", "Quick revision"]] : []), ...(topic !== "basics" ? [["papers", "Papers"]] : [])];

  return (
    <div className="page topic">
      <div className="crumbs"><a href="#/">Course</a></div>
      <h2>{mod.title}</h2>
      {c && (
        <div className="trow left">
          <span className={"tag " + ASK[c.ask].c}>{ASK[c.ask].t}</span>
          <span className="muted small">{ls.length ? doneCount(p, mod) + " of " + ls.length + " lessons" : "Quick revision only"} · {LEVEL[c.level]}</span>
        </div>
      )}
      <div className="tabs" role="tablist">
        {tabs.map(([k, n]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{n}</button>)}
      </div>
      {tab === "lessons" && (
        <>
          {mod.guide?.intro && <details className="fold intro"><summary>About this topic</summary><Blocks blocks={mod.guide.intro} /></details>}
          {!ls.length && <p className="muted">No lessons yet. The Quick revision tab has the notes.</p>}
          <div className="llist">
            {ls.map((l, i) => {
              const d = p.lessons[lessonKey(topic, l.id)];
              const now = l === suggested;
              return (
                <a key={l.id} className={"lrow" + (now ? " now" : "") + (d?.done ? " done" : "")} href={"#/lesson/" + topic + "/" + l.id}>
                  <span className="num">{d?.done ? "✓" : i + 1}</span>
                  <span className="lbody">
                    <span className="ltitle">{l.title}</span>
                    <span className="muted small">{l.plain}</span>
                  </span>
                  {now && <span className="tag ask0">Suggested</span>}
                  {d?.done && d.total > 0 && <span className="muted small">{d.right}/{d.total}</span>}
                </a>
              );
            })}
          </div>
          {ls.length > 0 && mod.guide?.after && <Blocks blocks={mod.guide.after} />}
          {topic !== "basics" && <a className="btn soft" href={"#/more/" + topic}>Practise more on {mod.title}</a>}
        </>
      )}
      {tab === "revision" && sections.map((s, i) => <Section key={i} s={s} />)}
      {tab === "papers" && <Papers topic={topic} />}
    </div>
  );
}
