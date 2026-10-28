/* The Mocks / Booster / Previous years page: a fixed arrangement, same on every screen size (the CSS places the cards):
   wide = calendar | ticket | remarks, then Recent under them; narrower = calendar | ticket, remarks, Recent; phone = one column. */
export default function Stage({ className, top, cards }) {
  return (
    <div className={className + " stage"}>
      {top}
      <div className="stg">
        {cards.map((c) => <div key={c.id} className={"stg-card stg-" + c.id}>{c.node}</div>)}
      </div>
    </div>
  );
}
