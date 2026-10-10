import { useEffect, useMemo, useState } from "react";
import Question from "./Question.jsx";
import { Badge, PartSwitch, useCourse, useView, ViewToggle } from "./Course.jsx";
import { fetchIndex, fetchPool, fetchQuestions, useProgress, dropReview, SOURCES, inSource } from "./store.js";
import { go } from "./nav.js";

const SRC_STYLE = {
  all: ["#6366F1", "#A855F7"], papers: ["#F97316", "#EC4899"], clerk: ["#0EA5E9", "#6366F1"],
  guidely: ["#10B981", "#0EA5E9"], sreedhar: ["#8B5CF6", "#EC4899"], mistakes: ["#EF4444", "#F59E0B"],
};
const grad = (id) => `linear-gradient(135deg, ${SRC_STYLE[id][0]}, ${SRC_STYLE[id][1]})`;
const srcName = (id) => (id === "mistakes" ? "My mistakes" : SOURCES.find((s) => s.id === id)?.name || id);

/* Step 1: pick where the questions come from. */
export function PracticeHome({ book }) {
  const p = useProgress();
  const [ix, setIx] = useState(null);
  useEffect(() => { fetchIndex().then(setIx); }, []);
  const total = (src) => (ix ? Object.values(ix).reduce((s, c) => s + (c[src] || 0), 0) : null);
  return (
    <div className="page wide">
      <header className="pagehead">
        <h1>Practice</h1>
        <p className="muted">Pick a source, then a topic, and work through it one question at a time.</p>
      </header>
      <div className="srcgrid">
        {SOURCES.map((s) => (
          <a key={s.id} className="srccard glass lift" href={"#/practice/" + s.id}>
            <span className="srcdot" style={{ background: grad(s.id) }} />
            <span className="srcname">{s.name}</span>
            <span className="muted small">{s.note}</span>
            <span className="srcnum">{total(s.id) == null ? "…" : total(s.id).toLocaleString()} questions</span>
          </a>
        ))}
        <a className="srccard glass lift" href="#/practice/mistakes">
          <span className="srcdot" style={{ background: grad("mistakes") }} />
          <span className="srcname">My mistakes</span>
          <span className="muted small">Questions you got wrong, until you get them right</span>
          <span className="srcnum">{p.review.length} waiting</span>
        </a>
      </div>
    </div>
  );
}

/* Step 2: pick a topic within the source. */
export function PracticePick({ book, src }) {
  const [ix, setIx] = useState(null);
  const [part, setPart] = useState("quant");
  const [view, setView] = useView();
  useEffect(() => { fetchIndex().then(setIx); }, []);
  const topics = useCourse(book).filter((t) => t.mod.part === part);
  return (
    <div className="page wide">
      <a className="back" href="#/practice">← All sources</a>
      <header className="pagehead row">
        <span className="srcdot big" style={{ background: grad(src) }} />
        <div>
          <h1>{srcName(src)}</h1>
          <p className="muted">{SOURCES.find((s) => s.id === src)?.note}</p>
        </div>
      </header>
      <div className="toolbar"><PartSwitch part={part} onChange={setPart} /><ViewToggle view={view} setView={setView} /></div>
      {!ix ? <div className="muted">Counting questions...</div> : (
        <div className={view === "grid" ? "grid" : "tlist"}>
          {topics.map((t) => {
            const n = ix[t.id]?.[src] || 0;
            return n ? (
              <a key={t.id} className="pcard glass lift" href={"#/practice/" + src + "/" + t.id}>
                <Badge id={t.id} title={t.mod.title} rank={t.rank} size={40} />
                <span className="grow"><span className="tname">{t.mod.title}</span><span className="muted small">{n} questions</span></span>
              </a>
            ) : (
              <div key={t.id} className="pcard glass off" aria-disabled="true">
                <Badge id={t.id} title={t.mod.title} rank={t.rank} size={40} />
                <span className="grow"><span className="tname">{t.mod.title}</span><span className="muted small">None in this source</span></span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* Step 3: one question at a time, with a type filter. Unanswered come first. */
export function PracticeRun({ book, src, topic, query }) {
  const mod = book.byId[topic];
  const p = useProgress();
  const [pool, setPool] = useState(null);
  const [type, setType] = useState(query.get("type") || "all");
  const [i, setI] = useState(0);
  const [q, setQ] = useState(null);

  useEffect(() => { setPool(null); fetchPool(topic).then(setPool); }, [topic]);
  const inSrc = useMemo(() => (pool ? pool.items.filter(inSource(src)) : []), [pool, src]);
  const types = useMemo(() => {
    const c = new Map();
    for (const x of inSrc) c.set(x.type, (c.get(x.type) || 0) + 1);
    return [...c.entries()].sort((a, b) => b[1] - a[1]);
  }, [inSrc]);
  const list = useMemo(() => {
    const l = inSrc.filter((x) => type === "all" || x.type === type);
    const seen = (x) => !!p.answers[x.bank + ":" + x.key];
    return [...l.filter((x) => !seen(x)), ...l.filter(seen)];
  }, [inSrc, type]);

  useEffect(() => { setI(0); }, [type, src]);
  useEffect(() => {
    const it = list[i];
    setQ(null);
    if (it) fetchQuestions([it.bank + ":" + it.key]).then(([x]) => setQ(x));
  }, [list, i]);

  if (!mod) return <div className="page">No such topic.</div>;
  const answered = list.filter((x) => p.answers[x.bank + ":" + x.key]);
  const right = answered.filter((x) => p.answers[x.bank + ":" + x.key].ok).length;
  const next = () => setI((i + 1) % list.length);

  return (
    <div className="page run">
      <a className="back" href={"#/practice/" + src}>← {srcName(src)}</a>
      <header className="runhead glass">
        <Badge id={mod.id} title={mod.title} rank={useCourse(book).find((t) => t.id === topic)?.rank || 0} size={44} />
        <div className="grow">
          <h2>{mod.title}</h2>
          <div className="muted small">{list.length} questions · {answered.length} answered · {right} right</div>
        </div>
        <a className="btn ghost hide-sm" href={"#/topic/" + topic}>Lessons</a>
      </header>
      <div className="toolbar filters">
        <label className="sel">
          <span>Source</span>
          <select value={src} onChange={(e) => go("#/practice/" + e.target.value + "/" + topic)}>
            {SOURCES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label className="sel">
          <span>Type</span>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="all">All types ({inSrc.length})</option>
            {types.map(([t, n]) => <option key={t} value={t}>{t} ({n})</option>)}
          </select>
        </label>
      </div>
      {!pool && <div className="muted">Loading the question banks...</div>}
      {pool && !list.length && <div className="glass pad muted">No questions for this choice. Try another source or type.</div>}
      {pool && list.length > 0 && !q && <div className="muted">Loading...</div>}
      {q && (
        <Question q={q} topic={topic} label={"Question " + (i + 1) + " of " + list.length + (list[i]?.type && list[i].type !== "Other" ? " · " + list[i].type : "")}
          onNext={next} onSkip={next} onMore={null} />
      )}
      {list.length > 1 && (
        <div className="actions">
          <button className="btn ghost" disabled={i === 0} onClick={() => setI(i - 1)}>Previous</button>
        </div>
      )}
    </div>
  );
}

export function Mistakes({ book }) {
  const p = useProgress();
  const [list] = useState(() => p.review.slice());
  const [i, setI] = useState(0);
  const [q, setQ] = useState(null);
  useEffect(() => {
    setQ(null);
    if (list[i]) fetchQuestions([list[i].k]).then(([x]) => setQ(x));
  }, [i]);
  const it = list[i];
  const mod = it && book.byId[it.topic];
  return (
    <div className="page run">
      <a className="back" href="#/practice">← All sources</a>
      <header className="pagehead">
        <h1>My mistakes</h1>
        <p className="muted">{p.review.length} waiting. Answer one right and it leaves this list.</p>
      </header>
      {!list.length && <div className="glass pad muted">Nothing here yet. Questions you get wrong in lessons and practice land here.</div>}
      {list.length > 0 && !it && <div className="glass pad">That was the last one. <a href="#/practice">Back to Practice</a></div>}
      {it && !q && <div className="muted">Loading...</div>}
      {it && q && (
        <>
          {mod && <div className="muted small">From {mod.title}</div>}
          <Question q={q} topic={it.topic} label={"Mistake " + (i + 1) + " of " + list.length}
            onNext={() => setI(i + 1)} onSkip={() => setI(i + 1)} onMore={mod ? () => go("#/practice/all/" + it.topic) : null} />
          <div className="actions"><button className="btn link" onClick={() => { dropReview(it.k); setI(i + 1); }}>Remove from the list</button></div>
        </>
      )}
    </div>
  );
}
