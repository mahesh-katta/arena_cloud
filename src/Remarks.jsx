/* Remarks card for Mocks, Booster and Previous years: best score, averages, and every finished exam with its totals (no gauges) */
export default function Remarks({ best, avgAtt, avgAcc, exams, noun = "exams" }) {
  const tile = (v, l) => <div className="rm-tile"><b>{v}</b><span>{l}</span></div>;
  return (
    <aside className="bp-remarks" aria-label="Remarks">
      <header><h2>Remarks</h2></header>
      <div className="rm-tiles">
        {tile(best ?? 0, "Best score")}
        {tile(avgAtt ?? 0, "Avg attempted")}
        {tile((avgAcc ?? 0) + "%", "Avg accuracy")}
      </div>
      <div className="rm-list">
        <h3>Previous {noun}</h3>
        {exams.length === 0 && <p className="rm-empty">Finish an exam and its attempts, accuracy and final score show up here.</p>}
        {exams.map((e) => (
          <div className="rm-row" key={e.key}>
            <div className="rm-top"><b>{e.title}</b><em>{e.score}</em></div>
            <div className="rm-sub"><span>{e.att.toLocaleString()} attempted</span><span>{(e.acc ?? 0) + "%"} accuracy</span></div>
          </div>
        ))}
      </div>
    </aside>
  );
}
