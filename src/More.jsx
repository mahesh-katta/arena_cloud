import { useEffect, useMemo, useState } from "react";
import Question from "./Question.jsx";
import { fetchPool, fetchQuestions, useProgress } from "./store.js";
import { go } from "./nav.js";

/* Practise more: the topic's questions from every bank, filtered by source and
   by type. Unanswered questions come first. */
export default function More({ book, topic, query }) {
  const mod = book.byId[topic];
  const p = useProgress();
  const [pool, setPool] = useState(null);
  const [src, setSrc] = useState(query.get("src") || "all");
  const [type, setType] = useState(query.get("type") || "all");
  const pyqOnly = query.get("pyq") === "1";
  const [i, setI] = useState(0);
  const [q, setQ] = useState(null);
  const [seed] = useState(() => Math.random());

  useEffect(() => { setPool(null); fetchPool(topic).then(setPool); }, [topic]);

  const inSrc = useMemo(() => (pool ? pool.items.filter((x) => (src === "all" || x.bank === src) && (!pyqOnly || x.pyq)) : []), [pool, src, pyqOnly]);
  const types = useMemo(() => {
    const c = new Map();
    for (const x of inSrc) c.set(x.type, (c.get(x.type) || 0) + 1);
    return [...c.entries()].sort((a, b) => b[1] - a[1]);
  }, [inSrc]);
  const list = useMemo(() => {
    const l = inSrc.filter((x) => type === "all" || x.type === type);
    const fresh = l.filter((x) => !p.answers[x.bank + ":" + x.key]);
    const seen = l.filter((x) => p.answers[x.bank + ":" + x.key]);
    return [...fresh, ...seen];
  }, [inSrc, type, pool, seed]);

  useEffect(() => { setI(0); }, [src, type]);
  useEffect(() => {
    const it = list[i];
    setQ(null);
    if (it) fetchQuestions([it.bank + ":" + it.key]).then(([x]) => setQ(x));
  }, [list, i]);

  if (!mod) return <div className="page">No such topic.</div>;
  const done = list.filter((x) => p.answers[x.bank + ":" + x.key]).length;

  return (
    <div className="page more">
      <div className="crumbs"><a href={"#/topic/" + topic}>{mod.title}</a></div>
      <h2>Practise more{pyqOnly ? ": paper questions" : ""}</h2>
      {!pool ? <div className="muted">Loading the question banks...</div> : (
        <>
          <div className="bar">
            <label className="sel">
              <span>Source</span>
              <select value={src} onChange={(e) => { setSrc(e.target.value); setType("all"); }}>
                <option value="all">All sources ({pool.items.filter((x) => !pyqOnly || x.pyq).length})</option>
                {pool.banks.filter((b) => b.n).map((b) => <option key={b.id} value={b.id}>{b.name} ({b.n})</option>)}
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
          <div className="muted small">{list.length} questions · {done} answered before</div>
          {!list.length && <p className="muted">Nothing here for this filter.</p>}
          {list.length > 0 && !q && <div className="muted">Loading...</div>}
          {q && (
            <Question q={q} topic={topic} label={"Question " + (i + 1) + " of " + list.length + (list[i]?.type ? " · " + list[i].type : "")}
              onNext={() => setI((i + 1) % list.length)} onSkip={() => setI((i + 1) % list.length)}
              onMore={null} />
          )}
          <div className="actions"><button className="btn ghost" onClick={() => go("#/topic/" + topic)}>Back to the lessons</button></div>
        </>
      )}
    </div>
  );
}
