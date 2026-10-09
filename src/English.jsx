import { useEffect, useMemo, useState } from "react";
import { Badge } from "./Course.jsx";
import { loadEnglish, useProgress, setKnown } from "./store.js";

const pref = (k, d) => { try { return localStorage.getItem(k) || d; } catch { return d; } };
const setPref = (k, v) => { try { localStorage.setItem(k, v); } catch {} };

function usePref(k, d) {
  const [v, set] = useState(pref(k, d));
  return [v, (x) => { set(x); setPref(k, x); }];
}

function Seg({ value, onChange, items }) {
  return (
    <div className="seg" role="tablist">
      {items.map(([k, n]) => (
        <button key={k} role="tab" aria-selected={value === k} className={value === k ? "on" : ""} onClick={() => onChange(k)}>{n}</button>
      ))}
    </div>
  );
}

function Known({ k }) {
  const p = useProgress();
  const on = !!p.known?.[k];
  return (
    <button className={"pillbtn" + (on ? " done" : "")} aria-pressed={on} onClick={() => setKnown(k, !on)}>
      {on ? "✓ Known" : "I know this"}
    </button>
  );
}

function Search({ value, onChange, placeholder }) {
  return (
    <label className="sel search">
      <span>Search</span>
      <input type="search" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Head({ id, title, rank, sub, data, known, total, practise }) {
  return (
    <>
      <a className="back" href="#/">← All topics</a>
      <div className="dhead glass">
        <Badge id={id} title={title} rank={rank} size={56} />
        <div className="grow">
          <h2>{title}</h2>
          <div className="muted small">{sub}</div>
          <div className="bar-line"><span style={{ width: (100 * known) / (total || 1) + "%" }} /></div>
          <div className="small strong" style={{ marginTop: 6 }}>{known} of {total} marked as known</div>
        </div>
        <a className="btn soft hide-sm" href={practise}>Practise questions</a>
      </div>
      {data && (
        <details className="fold glass">
          <summary>How this list was built</summary>
          {data.intro.map((x, i) => <p key={i}>{x}</p>)}
          {data.measured?.length > 1 && (
            <div className="tablewrap"><table>
              <thead><tr>{data.measured[0].map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
              <tbody>{data.measured.slice(1).map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
            </table></div>
          )}
        </details>
      )}
    </>
  );
}

/* ---------------- Grammar ---------------- */

export function Grammar() {
  const p = useProgress();
  const [d, setD] = useState(null);
  const [mode, setMode] = usePref("en-g-mode", "core");
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  useEffect(() => { loadEnglish("grammar").then(setD); }, []);
  const rules = useMemo(() => {
    if (!d) return [];
    const s = q.trim().toLowerCase();
    let r = d.rules.filter((x) => (mode === "all" || x.core) && (cat === "all" || x.cat === cat));
    if (s) r = r.filter((x) => [x.title, x.rule, x.wrong, x.right, x.tip].join(" ").toLowerCase().includes(s));
    if (mode === "core") r = [...r].sort((a, b) => b.bank + b.papers - (a.bank + a.papers) || a.n - b.n);
    return r;
  }, [d, mode, cat, q]);
  if (!d) return <div className="page muted">Loading the rules...</div>;
  const catName = Object.fromEntries(d.categories.map((c) => [c.id, c.name]));
  const nCore = d.rules.filter((x) => x.core).length;
  const known = d.rules.filter((x) => p.known?.["g:" + x.id]).length;
  return (
    <div className="page wide en">
      <Head id="grammar" title="Grammar" rank={0} data={d} known={known} total={d.rules.length} practise="#/practice/all/grammar"
        sub={d.rules.length + " rules in " + d.categories.length + " groups · " + nCore + " in the exam short list"} />
      <div className="toolbar">
        <Seg value={mode} onChange={setMode} items={[["core", "Exam short list (" + nCore + ")"], ["all", "All " + d.rules.length + " rules"]]} />
        <label className="sel">
          <span>Group</span>
          <select value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="all">All groups</option>
            {d.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <Search value={q} onChange={setQ} placeholder="a word, e.g. each" />
      </div>
      <div className="muted small">{rules.length} rules shown{mode === "core" ? ", most asked first" : ", in study order"}</div>
      <div className="rules">
        {rules.map((r) => (
          <article key={r.id} className="rule glass">
            <div className="rule-top">
              <span className="rnum">{r.n}</span>
              <div className="grow">
                <div className="rtitle">{r.title}</div>
                <div className="muted small">{catName[r.cat]}{r.bank + r.papers ? " · matched about " + (r.bank + r.papers) + " bank and paper questions" : ""}</div>
              </div>
              {r.core && <span className="tag sug">Most asked</span>}
              {r.src === "web" && <span className="tag ask2" title="From standard bank-exam rule lists; not found in our question banks">Standard list</span>}
            </div>
            <p>{r.rule}</p>
            <div className="pair">
              <div className="ex bad"><span>✗</span>{r.wrong}</div>
              <div className="ex ok"><span>✓</span>{r.right}</div>
            </div>
            {r.tip && <div className="tip">{r.tip}</div>}
            <div className="actions tight"><Known k={"g:" + r.id} /></div>
          </article>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Vocabulary ---------------- */

const TABS = [["words", "Words"], ["oneword", "One-word substitutes"], ["spelling", "Spelling traps"], ["confusables", "Confusables"]];
const keyOf = (tab, x) => "v:" + tab + ":" + (x.w || x.right || x.words.join("/"));
const textOf = (x) => [x.w, x.meaning, x.right, x.tip, x.diff, ...(x.syn || []), ...(x.ant || []), ...(x.wrong || []), ...(x.words || [])].join(" ").toLowerCase();

function WordCard({ x }) {
  return (
    <>
      <div className="wtop"><b className="word">{x.w}</b>{x.pos && <span className="muted small">{x.pos}</span>}</div>
      <div>{x.meaning}</div>
      {x.syn?.length > 0 && <div className="chips"><span className="lab">Same</span>{x.syn.map((s) => <span key={s} className="chip syn">{s}</span>)}</div>}
      {x.ant?.length > 0 && <div className="chips"><span className="lab">Opposite</span>{x.ant.map((s) => <span key={s} className="chip ant">{s}</span>)}</div>}
    </>
  );
}

function Card({ tab, x }) {
  return (
    <article className="wcard glass">
      {tab === "words" && <WordCard x={x} />}
      {tab === "oneword" && <><div className="muted">{x.meaning}</div><b className="word">{x.w}</b></>}
      {tab === "spelling" && (
        <>
          <div className="wtop"><b className="word ok-ink">✓ {x.right}</b></div>
          <div className="chips">{x.wrong.map((s) => <span key={s} className="chip ant strike">{s}</span>)}</div>
          {x.tip && <div className="tip">{x.tip}</div>}
        </>
      )}
      {tab === "confusables" && <><b className="word">{x.words.join(" / ")}</b><div>{x.diff}</div></>}
      <div className="wfoot">
        {x.core && <span className="tag sug">Short list</span>}
        {x.src === "web" && <span className="tag ask2" title="From standard bank-exam lists; not found in our question banks">Standard list</span>}
        {x.count > 0 && <span className="muted small">seen {x.count}×</span>}
        <span className="grow" />
        <Known k={keyOf(tab, x)} />
      </div>
    </article>
  );
}

const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

/* Flash cards: the front asks, a tap shows the back; "Knew it" marks the item known. */
function Flash({ tab, items, onClose }) {
  const [deck] = useState(() => shuffle(items.filter((x) => tab !== "confusables")));
  const [i, setI] = useState(0);
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState(null);
  const [score, setScore] = useState([0, 0]);
  const x = deck[i];
  const opts = useMemo(() => (x && tab === "spelling" ? shuffle([x.right, ...x.wrong.slice(0, 3)]) : []), [x]);
  if (!x) return (
    <div className="glass pad">
      <b>Deck finished.</b> You knew {score[0]} of {score[0] + score[1]}.
      <div className="actions"><button className="btn primary" onClick={onClose}>Back to the list</button></div>
    </div>
  );
  const next = (ok) => {
    if (ok) setKnown(keyOf(tab, x), true);
    setScore([score[0] + (ok ? 1 : 0), score[1] + (ok ? 0 : 1)]);
    setI(i + 1); setOpen(false); setPick(null);
  };
  return (
    <div className="flash glass">
      <div className="qhead"><span className="eyebrow">Card {i + 1} of {deck.length}</span><button className="btn link" onClick={onClose}>Stop</button></div>
      {tab === "words" && <div className="front"><b className="word big">{x.w}</b><div className="muted small">{x.pos}: what does it mean?</div></div>}
      {tab === "oneword" && <div className="front"><div>{x.meaning}</div><div className="muted small">One word for this?</div></div>}
      {tab === "spelling" && (
        <div className="front">
          <div className="muted small">Which spelling is right?</div>
          <div className="opts">{opts.map((o) => (
            <button key={o} disabled={!!pick} className={"opt" + (pick ? (o === x.right ? " right" : o === pick ? " wrong" : " dim") : "")} onClick={() => { setPick(o); setOpen(true); }}>{o}</button>
          ))}</div>
        </div>
      )}
      {!open && tab !== "spelling" && <div className="actions"><button className="btn primary" onClick={() => setOpen(true)}>Show</button></div>}
      {open && (
        <>
          <div className="back-side">{tab === "words" ? <WordCard x={x} /> : tab === "oneword" ? <b className="word big">{x.w}</b> : x.tip && <div className="tip">{x.tip}</div>}</div>
          <div className="actions">
            {tab === "spelling"
              ? <button className="btn primary" onClick={() => next(pick === x.right)}>Next</button>
              : <><button className="btn primary" onClick={() => next(true)}>Knew it</button><button className="btn ghost" onClick={() => next(false)}>Not yet</button></>}
          </div>
        </>
      )}
    </div>
  );
}

export function Vocabulary() {
  const p = useProgress();
  const [d, setD] = useState(null);
  const [tab, setTab] = usePref("en-v-tab", "words");
  const [mode, setMode] = usePref("en-v-mode", "core");
  const [q, setQ] = useState("");
  const [hideKnown, setHideKnown] = useState(false);
  const [flash, setFlash] = useState(false);
  useEffect(() => { loadEnglish("vocabulary").then(setD); }, []);
  const items = useMemo(() => {
    if (!d) return [];
    const s = q.trim().toLowerCase();
    return d[tab].filter((x) => (mode === "all" || x.core) && (!s || textOf(x).includes(s)) && (!hideKnown || !p.known?.[keyOf(tab, x)]));
  }, [d, tab, mode, q, hideKnown, flash]);
  if (!d) return <div className="page muted">Loading the words...</div>;
  const all = TABS.reduce((n, [k]) => n + d[k].length, 0);
  const known = TABS.reduce((n, [k]) => n + d[k].filter((x) => p.known?.[keyOf(k, x)]).length, 0);
  const nCore = d[tab].filter((x) => x.core).length;
  return (
    <div className="page wide en">
      <Head id="vocabulary" title="Vocabulary" rank={1} data={d} known={known} total={all} practise="#/practice/all/vocabulary"
        sub={d.words.length + " words (" + d.words.filter((x) => x.core).length + " short list) · " + d.oneword.length + " one-word substitutes · " + d.spelling.length + " spelling traps · " + d.confusables.length + " confusables"} />
      <div className="tabs" role="tablist">
        {TABS.map(([k, n]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => { setTab(k); setFlash(false); }}>{n} ({d[k].length})</button>)}
      </div>
      {flash ? <Flash tab={tab} items={items} onClose={() => setFlash(false)} /> : (
        <>
          <div className="toolbar">
            <Seg value={mode} onChange={setMode} items={[["core", "Short list (" + nCore + ")"], ["all", "Full list (" + d[tab].length + ")"]]} />
            <Search value={q} onChange={setQ} placeholder="a word or meaning" />
            <label className="check"><input type="checkbox" checked={hideKnown} onChange={(e) => setHideKnown(e.target.checked)} /> Hide known</label>
            {tab !== "confusables" && items.length > 0 && <button className="btn primary" onClick={() => setFlash(true)}>Test me ({items.length})</button>}
          </div>
          <div className="muted small">{items.length} shown</div>
          <div className="wgrid">{items.map((x) => <Card key={keyOf(tab, x)} tab={tab} x={x} />)}</div>
        </>
      )}
    </div>
  );
}
