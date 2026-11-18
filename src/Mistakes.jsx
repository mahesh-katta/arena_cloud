/* My mistakes: wrong answers from anywhere (Practice, speed drills, mock tests), until they are answered right.
   It used to live inside Practice.jsx; it is its own page. */
import { useEffect, useMemo, useState } from "react";
import Solver from "./Question.jsx";
import { bankTopic, speedTopic, glatData, mockTest, useProgress, dropReview } from "./store.js";
import { Solve } from "./ui.jsx";
import { Session, useSession } from "./Practice.jsx";

/* Wrong answers from anywhere, until they are answered right. */
async function loadRef(r) {
  if (r.kind === "bank") return (await bankTopic(r.file)).questions.find((q) => q.id === r.id);
  if (r.kind === "speed") return (await speedTopic(r.file)).questions.find((q) => q.id === r.id);
  if (r.kind === "glat") return (await glatData()).questions.find((q) => q.id === r.id);
  if (r.kind === "mock") return (await mockTest(r.group, r.mock)).questions.find((q) => q.id === r.id);
  return null;
}
const FROM = { bank: "Topic practice", speed: "Speed drills", glat: "Booster · GLAT", mock: "Mock test" };
export function Mistakes() {
  const p = useProgress();
  const [list] = useState(() => p.review.slice());
  const [i, setI] = useState(0);
  const [q, setQ] = useState(null);
  const [sess, addSess] = useSession();
  const [tools, setTools] = useState(false);
  const r = list[i];
  useEffect(() => { setQ(null); if (r) loadRef(r).then((x) => (x ? setQ(x) : (dropReview(r.id), setI((n) => n + 1)))); }, [i]);
  const byTopic = useMemo(() => Object.entries(list.reduce((m, x) => ((m[x.topic] = (m[x.topic] || 0) + 1), m), {})).sort((a, b) => b[1] - a[1]), [list]);
  const rail = (
    <>
      <div className="card"><div className="railhead"><h3 className="grow">This round</h3><span className="chip bad">{p.review.length} left</span></div><Session s={sess} /></div>
      {byTopic.length > 0 && (
        <div className="card">
          <h3>Weak topics</h3>
          <div className="bars">{byTopic.slice(0, 8).map(([t, n]) => <div key={t} className="barrow"><span className="grow">{t}</span><b className="mono">{n}</b></div>)}</div>
        </div>
      )}
    </>
  );
  return (
    <Solve crumbs={<><a href="#/practice">Topic-wise Practice</a><span>/</span><b>Revise mistakes</b></>} rail={rail} open={tools} setOpen={setTools}>
      {!list.length ? <div className="empty">No mistakes to revise. Questions you get wrong in practice, speed drills and mock tests collect here until you answer them right.</div>
        : i >= list.length ? <div className="card done"><div className="big">{sess.ok} / {sess.n}</div><div className="muted">Round complete. Questions you got right again have left the list.</div></div>
        : !q ? <div className="card qcard muted">Loading question…</div>
        : <Solver q={q} refInfo={r} head={"Mistake " + (i + 1) + " / " + list.length} onResult={addSess}
            chips={[[q.topic, "ac"], q.subtopic, FROM[r.kind]]} onPrev={i > 0 ? () => setI(i - 1) : null} onNext={() => setI(i + 1)} />}
    </Solve>
  );
}
