import { useEffect, useState } from "react";
import Question from "./Question.jsx";
import { useProgress, fetchQuestions, dropReview } from "./store.js";

/* Every question answered wrong, newest first. Answer it right and it leaves. */
export default function Review({ book }) {
  const p = useProgress();
  const [list] = useState(() => p.review.slice());
  const [i, setI] = useState(0);
  const [q, setQ] = useState(null);
  useEffect(() => {
    setQ(null);
    if (list[i]) fetchQuestions([list[i].k]).then(([x]) => setQ(x));
  }, [i]);
  if (!list.length) return <div className="page"><h2>Review</h2><p className="muted">Nothing to review. Questions you get wrong in lessons and practice land here.</p></div>;
  const it = list[i];
  const mod = it && book.byId[it.topic];
  return (
    <div className="page">
      <h2>Review</h2>
      <div className="muted small">{p.review.length} questions waiting{mod ? " · this one is from " + mod.title : ""}</div>
      {!it && <p>That was the last one. <a href="#/review" onClick={() => location.reload()}>Start again</a></p>}
      {it && !q && <div className="muted">Loading...</div>}
      {it && q && (
        <Question q={q} topic={it.topic} label={"Review · " + (i + 1) + " of " + list.length}
          onNext={() => setI(i + 1)} onSkip={() => setI(i + 1)}
          onMore={mod ? () => (location.hash = "#/more/" + it.topic) : null} />
      )}
      {it && <div className="actions"><button className="btn ghost" onClick={() => { dropReview(it.k); setI(i + 1); }}>Remove from Review</button></div>}
    </div>
  );
}
