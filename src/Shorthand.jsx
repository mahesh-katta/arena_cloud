/* Shorthand: the hand-written cheat sheet of each Modules topic (data/notes). It shows in the topic page's Shorthand tab
   (Seating & Puzzles, Arithmetic) and on its own page for the Score Cracker topics.
   A notes file is plain keyed sections and each section's shape decides how it is drawn (a line, a list, named tricks,
   question tricks, a clue table, a worked puzzle, a worked question), so a section added to the data shows up by itself. */
import { Fragment, useRef, useState } from "react";
import { Maths, MathsMode } from "./mathfmt.jsx";
import { bankIndex, topicNotes, useData } from "./store.js";
import { BackBtn, Loading, Failed } from "./ui.jsx";

/* The notes are typed in ASCII: "=>", "<->", ">=", "+-", "sqrt3", "pi", and "x" for times. Show the symbols. A lone x stays
   a letter unless a number or a bracket sits on one side of it, or capitals on both ("18 x 5", "(a + 1) x n", "P x R x T", "x1.21"). */
const fix = (s) => String(s ?? "")
  .replace(/<=>/g, "⇔").replace(/<->/g, "↔").replace(/>=/g, "≥").replace(/<=/g, "≤").replace(/!=/g, "≠").replace(/=>/g, "⇒").replace(/->/g, "→").replace(/\+-/g, "±")
  .replace(/(?<=[\d)%])\s+x\s+(?=[\w(√])|(?<=[A-Za-z])\s+x\s+(?=[\d(√])|(?<=[A-Z])\s+x\s+(?=[A-Z])/g, " × ")
  .replace(/(?<![\w.])x(?=\d+(?:\.\d+)?(?:\/\d+)?(?![\w/]))/g, "×")
  .replace(/\bsqrt(?=\d)/g, "√").replace(/\bpi\b/g, "π").replace(/\btheta\b/g, "θ");

/* one piece of notes text: symbols, then the app's maths (powers, roots, fractions); capital-letter powers (T^2) as well */
export function Tx({ s }) {
  const parts = fix(s).split(/([A-Z]\^(?:\d+|[a-z]))/);
  return <>{parts.map((p, i) => (i % 2 ? <Fragment key={i}>{p[0]}<sup className="mpow">{p.slice(2)}</sup></Fragment> : <Maths key={i} text={p} />))}</>;
}

const LABEL = {
  draw: "Draw it first", remember: "Remember", steps: "Solve in this order", cases: "Making cases", questions: "Answer the questions fast",
  approach: "How to attack any puzzle", marks: "Shorthand marks", clueOrder: "Which clue to use when", wording: "Read the wording right",
  twoVariable: "Two lists: people and items", vacant: "One place empty", time: "Time",
  keyIdea: "Key idea", mustKnow: "Must know", eliteTricks: "Named tricks", shortcuts: "Shortcuts", shorthand: "Write clues like this",
  shorthandDemo: "One puzzle in shorthand", hardDemos: "Hard puzzles, worked", templates: "Seat layouts", example: "Worked example",
  fastMethod: "Fast method", startWith: "Start with", killers: "What kills a case", traps: "Traps", questionTricks: "Question tricks",
  optionKillers: "Strike options fast", spotIt: "Spot the unit", timePlan: "Time plan", differenceTable: "Difference table",
  notation: "Shorthand symbols", clueTypes: "Clue types", branchRule: "When to branch", flipRule: "Flip rule", compoundRule: "Compound clues",
  extraRules: "More rules", rangeRules: "Range rules", twoVariableGrid: "Two-variable grid", attemptOrder: "Attempt order",
  answerShortcuts: "Answer shortcuts", slotMath: "Slot maths", mirrorRule: "Mirror rule", facingRules: "Facing rules", vacantRules: "Vacant seats",
  ratioMethod: "Ratio method", tables: "Quick tables", optionTactics: "Option tactics", fractionTable: "Fractions as percents",
  squares: "Squares", cubes: "Cubes", growthFactors: "Growth factors", piTip: "π and triplets", wordingTraps: "Wording traps",
  why: "Why", symbols: "Symbols", demo: "Demo", idea: "Idea", increase: "Increase", decrease: "Decrease", rules: "Rules", rule: "Rule",
  worksFor: "Works for", variants: "Variants", circleByRadius: "Circle by radius", kmphToMps: "km/h to m/s", quickMultiply: "Quick multiply",
  routine: "The six steps", checks: "The three checks", verdict: "Read the verdict", numbering: "Give every word 100 or 50",
  opposites: "The opposite of a sentence", family: "Family or stranger", babyUsed: "When the baby is in another statement",
  flip: "What else each sentence gives you", wording: "Read the wording right", shortcut: "One test, not two",
  chain: "Three or four statements",
  summary: "Summary",
  gates: "The gates", walk: "Walk the road", roadSign: "What the road gives", roads: "One statement, four roads", eitherOr: "Either-or",
  codeWords: "Words in coded questions", bankRules: "Rules this bank follows",
};
/* shorter names for the jump chips */
const CHIP = {
  draw: "Draw", remember: "Remember", steps: "Order", cases: "Cases", traps: "Traps", questions: "Questions",
  eliteTricks: "Tricks", mustKnow: "Must know", shorthand: "Write it", shorthandDemo: "Demo", hardDemos: "Hard demos", fastMethod: "Method",
  startWith: "Start", killers: "Killers", questionTricks: "Questions", optionKillers: "Options", spotIt: "Spot it", timePlan: "Time",
  templates: "Layouts", example: "Example", differenceTable: "Differences",
  routine: "Six steps", checks: "Checks", verdict: "Verdict", numbering: "100 / 50", flip: "Flip it", chain: "Chaining",
  gates: "Gates", walk: "Walk", roadSign: "Road sign", roads: "Example", eitherOr: "Either-or", codeWords: "Codes", bankRules: "Bank rules",
};
const label = (k) => LABEL[k] || (/^[a-z]+[A-Z]/.test(k) ? k.replace(/[A-Z]/g, (c) => " " + c.toLowerCase()).replace(/^./, (c) => c.toUpperCase()) : k);

/* which sections come first in each kind of file; anything else in the file follows in its own order */
const ORDER = {
  reasoning: ["draw", "remember", "shorthand", "steps", "startWith", "cases", "traps", "questions"],
  quant: ["eliteTricks", "mustKnow", "optionKillers", "traps", "spotIt"],
  cracker: ["gates", "walk", "roadSign", "roads", "eitherOr", "codeWords", "bankRules",
    "routine", "remember", "shorthand", "numbering", "flip", "checks", "chain", "steps", "mustKnow", "eliteTricks",
    "questions", "questionTricks", "optionKillers", "traps", "time", "timePlan"],
};
const SKIP = new Set(["id", "subject", "name", "readFrom", "alsoFor", "units", "common", "keyIdea", "types"]);
const keysOf = (n, order = []) => [...order.filter((k) => n[k] != null), ...Object.keys(n).filter((k) => !SKIP.has(k) && !order.includes(k) && n[k] != null)];
const STEPS = new Set(["fastMethod", "method", "steps", "approach", "routine", "walk"]);
const isObj = (v) => v != null && typeof v === "object" && !Array.isArray(v);
const has = (o, ...k) => isObj(o) && k.every((x) => x in o);
const count = (v) => (Array.isArray(v) ? v.length : 0);

function Body({ k, v }) {
  if (v == null || v === "") return null;
  if (typeof v !== "object") return <p className="sh-p"><Tx s={v} /></p>;
  if (Array.isArray(v)) {
    if (!v.length) return null;
    const x = v[0];
    if (typeof x === "string") {
      if (v.length > 3 && v.every((s) => s.length <= 22)) return <div className="sh-chips">{v.map((s, i) => <span key={i}><Tx s={s} /></span>)}</div>;
      const L = STEPS.has(k) ? "ol" : "ul";
      return <L className={STEPS.has(k) ? "sh-steps" : "sh-list"}>{v.map((s, i) => <li key={i}><Tx s={s} /></li>)}</L>;
    }
    if (has(x, "name", "rule")) return (
      <div className="sh-tricks">
        {v.map((t, i) => <div key={i} className="sh-trick"><b><Tx s={t.name} /></b><p><Tx s={t.rule} /></p>{t.eg && <p className="sh-eg"><Tx s={t.eg} /></p>}</div>)}
      </div>
    );
    if (has(x, "asks", "trick")) return <dl className="sh-qa">{v.map((t, i) => <div key={i}><dt><Tx s={t.asks} /></dt><dd><Tx s={t.trick} /></dd></div>)}</dl>;
    if (has(x, "clue", "write")) return (
      <div className="sh-tabw">
        <table className="sh-tab">
          <thead><tr><th>Clue</th><th>Write</th><th>{"means" in x ? "Means" : "Note"}</th></tr></thead>
          <tbody>{v.map((t, i) => <tr key={i}><td><Tx s={t.clue} /></td><td><code className="sh-code"><Tx s={t.write} /></code></td><td><Tx s={t.means ?? t.note ?? ""} /></td></tr>)}</tbody>
        </table>
      </div>
    );
    if (has(x, "sym", "means")) return <div className="sh-syms">{v.map((t, i) => <div key={i}><code className="sh-code">{t.sym}</code><span><Tx s={t.means} /></span></div>)}</div>;
    if (has(x, "puzzle")) return <div className="sh-demos">{v.map((d, i) => <Demo key={i} d={d} />)}</div>;
    if (has(x, "name", "method")) return <div className="sh-demos">{v.map((t, i) => <details key={i} className="sh-type"><summary><span className="sh-tag">{t.id}</span><b><Tx s={t.name} /></b></summary><TypeSheet t={t} /></details>)}</div>;
    return <ul className="sh-list">{v.map((t, i) => <li key={i}>{typeof t === "string" ? <Tx s={t} /> : <Body k={k} v={t} />}</li>)}</ul>;
  }
  if (has(v, "puzzle")) return <Demo d={v} />;
  if (has(v, "q", "solve") || has(v, "statements", "conclusions")) return <Example eg={v} />;
  /* a plain table: column heads, then rows of cells, then an optional line under it */
  if (has(v, "cols", "rows")) return (
    <div className="sh-tabw">
      <table className="sh-tab sh-grid">
        <thead><tr>{v.cols.map((c, i) => <th key={i}><Tx s={c} /></th>)}</tr></thead>
        <tbody>{v.rows.map((r, i) => <tr key={i}>{r.map((c, j) => (j ? <td key={j}><Tx s={c} /></td> : <th key={j} scope="row"><Tx s={c} /></th>))}</tr>)}</tbody>
      </table>
      {Array.isArray(v.note)
        ? <ul className="sh-list sh-note">{v.note.map((x, i) => <li key={i}><Tx s={x} /></li>)}</ul>
        : v.note && <p className="sh-p sh-note"><Tx s={v.note} /></p>}
    </div>
  );
  /* how to draw the frame, then a small monospace sketch of it (kept as typed: no symbol or maths formatting) */
  if (has(v, "sketch")) return (
    <div className="sh-draw">
      {v.how && <Body k="how" v={v.how} />}
      <pre className="sh-pre">{v.sketch}</pre>
    </div>
  );
  return (
    <div className="sh-kv">
      {Object.entries(v).map(([kk, vv]) => (typeof vv === "string"
        ? <div key={kk} className="sh-kvr"><b>{label(kk)}</b><span><Tx s={vv} /></span></div>
        : <div key={kk} className="sh-kvs"><h4>{label(kk)}</h4><Body k={kk} v={vv} /></div>))}
    </div>
  );
}

/* a puzzle written in shorthand: which set, its clues in the notation, then how it falls out */
function Demo({ d }) {
  return (
    <div className="sh-demo">
      <div className="sh-dh">{d.type && <span className="sh-tag">{d.type}</span>}<b><Tx s={d.puzzle} /></b></div>
      {d.clues && <code className="sh-code sh-clues"><Tx s={d.clues} /></code>}
      {(d.then || d.solve) && <p><Tx s={d.then || d.solve} /></p>}
    </div>
  );
}

const ROMAN = ["I", "II", "III", "IV", "V"];
/* A worked example. `statements` + `conclusions` lay it out the way the question itself is printed,
   one line each, with the solve underneath as numbered steps. The older {q, solve} shape still works. */
function Example({ eg }) {
  if (eg.q) return (
    <div className="sh-ex">
      <p><span className="sh-tag">Question</span><Tx s={eg.q} /></p>
      <p className="sh-solve"><span className="sh-tag">Fast solve</span><Tx s={eg.solve} /></p>
    </div>
  );
  const lines = (xs, mark) => xs.map((x, i) => (
    <Fragment key={i}><br />{mark ? <b>{ROMAN[i]}. </b> : null}<Tx s={x} /></Fragment>
  ));
  return (
    <div className="sh-ex">
      <p><span className="sh-tag">{eg.statements.length > 1 ? "Statements" : "Statement"}</span>{lines(eg.statements)}</p>
      <p><span className="sh-tag">{eg.conclusions.length > 1 ? "Conclusions" : "Conclusion"}</span>{lines(eg.conclusions, true)}</p>
      <p className="sh-solve"><span className="sh-tag">Fast solve</span>{lines(eg.steps || [])}
        {eg.answer && <><br /><br /><b><Tx s={eg.answer} /></b></>}</p>
    </div>
  );
}

function Sec({ id, title, n, cls, children }) {
  return (
    <section className={"sh-sec" + (cls ? " " + cls : "")} data-sh={id}>
      <h3 className="sh-h">{title}{n > 0 && <small>{n}</small>}</h3>
      {children}
    </section>
  );
}

/* a whole notes file: jump chips, the key idea, an optional lead section (this unit), the sections, the subject-wide rules folded */
function Sheet({ n, order, lead, commonSub }) {
  const box = useRef(null);
  const keys = keysOf(n, order);
  const ck = n.common ? keysOf(n.common) : [];
  const chips = [...(lead ? [["unit", "This unit"]] : []), ...keys.map((k) => [k, CHIP[k] || label(k)]), ...(ck.length ? [["common", "All topics"]] : [])];
  /* scroll only the pane the sheet sits in (scrollIntoView would also move the page), leaving room for the sticky chips */
  const jump = (id) => {
    const root = box.current, el = root && root.querySelector('[data-sh="' + id + '"]');
    if (!el) return;
    if (el.tagName === "DETAILS") el.open = true;
    let sc = root.parentElement;
    while (sc && !(/auto|scroll/.test(getComputedStyle(sc).overflowY) && sc.scrollHeight > sc.clientHeight)) sc = sc.parentElement;
    const bar = root.querySelector(".sh-jump"), off = (bar ? bar.offsetHeight : 0) + 6;
    if (sc) sc.scrollTo({ top: el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - off, behavior: "smooth" });
    else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - off, behavior: "smooth" });
  };
  return (
    <MathsMode.Provider value={n.subject === "quant" || /^quant/.test(n.id || "") ? "quant" : ""}><div className="shand" ref={box}>
      {chips.length > 2 && <nav className="sh-jump" aria-label="Jump to a section">{chips.map(([id, t]) => <button key={id} type="button" onClick={() => jump(id)}>{t}</button>)}</nav>}
      {n.keyIdea && <div className="sh-key"><span className="sh-kick">Key idea</span><p><Tx s={n.keyIdea} /></p></div>}
      {lead}
      {keys.map((k) => <Sec key={k} id={k} title={label(k)} n={count(n[k])}><Body k={k} v={n[k]} /></Sec>)}
      {ck.length > 0 && (
        <details className="sh-common" data-sh="common">
          <summary><span><b>{n.common.name}</b>{commonSub && <small>{commonSub}</small>}</span></summary>
          {n.common.keyIdea && <div className="sh-key sm"><p><Tx s={n.common.keyIdea} /></p></div>}
          {ck.map((k) => <Sec key={k} id={"c-" + k} title={label(k)} n={count(n.common[k])}><Body k={k} v={n.common[k]} /></Sec>)}
        </details>
      )}
      {n.readFrom && <p className="sh-foot">Built from: {n.readFrom}</p>}
    </div></MathsMode.Provider>
  );
}

const COMMON_SUB = {
  reasoning: "How to attack any puzzle, shorthand marks, cases, two lists and empty places",
  quant: "Ratio method, tables and option tactics shared by every Arithmetic topic",
};

/* the Shorthand tab of a Course topic page: this unit first (focus and tips, or spot cue, method and one trick per recipe),
   then the topic's tricks and traps, then the rules shared by every topic of the subject */
export function UnitShorthand({ subject, n, unit, lessons }) {
  const un = (n.units || {})[unit] || {};
  const spot = (n.spotIt || {})[unit];
  const tricks = un.lessons || {};
  const lead = (un.focus || un.method || spot || (un.tips && un.tips.length) || un.lessons) ? (
    <section className="sh-sec sh-unit" data-sh="unit">
      <h3 className="sh-h"><span className="sh-kick">This unit</span>{unit}</h3>
      {un.focus && <p className="sh-focus"><Tx s={un.focus} /></p>}
      {spot && <p className="sh-line"><span className="sh-tag">Spot it</span><span><Tx s={spot} /></span></p>}
      {un.method && <p className="sh-line"><span className="sh-tag">Method</span><span><Tx s={un.method} /></span></p>}
      {un.tips && un.tips.length > 0 && <Body k="tips" v={un.tips} />}
      {un.lessons && (
        <ol className="sh-recipes" aria-label={"One trick per recipe in " + unit}>
          {lessons.map((l) => (
            <li key={l.id}>
              <a href={l.href}>
                <span className="lno">{l.no}</span>
                <span className="sh-rb">
                  <b>{l.title}</b>
                  {l.sub && <small title={l.sub}>{l.sub}</small>}
                  {tricks[l.id] && tricks[l.id].trick && <span className="sh-tr"><Tx s={tricks[l.id].trick} /></span>}
                </span>
                <i aria-hidden="true">→</i>
              </a>
            </li>
          ))}
        </ol>
      )}
    </section>
  ) : null;
  return <Sheet n={n} order={ORDER[subject]} lead={lead} commonSub={COMMON_SUB[subject]} />;
}

/* one Score Cracker question type: how to spot it, the method, an example and its traps */
function TypeSheet({ t }) {
  const rest = Object.keys(t).filter((k) => !["id", "name", "level", "spot", "method", "eg", "traps"].includes(k) && t[k] != null);
  return (
    <div className="shand">
      {t.spot && <div className="sh-key"><span className="sh-kick">Spot it</span><p><Tx s={t.spot} /></p></div>}
      {t.method && t.method.length > 0 && <Sec id="method" title="Method" n={count(t.method)}><Body k="method" v={t.method} /></Sec>}
      {/* a type's own tables (the opposites, who is family, how to read the verdict) belong with the method, before the example */}
      {rest.map((k) => <Sec key={k} id={k} title={label(k)} n={count(t[k])}><Body k={k} v={t[k]} /></Sec>)}
      {t.eg && <Sec id="eg" title="Example"><Example eg={t.eg} /></Sec>}
      {t.traps && t.traps.length > 0 && <Sec id="traps" title="Traps" n={t.traps.length}><Body k="traps" v={t.traps} /></Sec>}
    </div>
  );
}

const toCracker = () => { try { localStorage.setItem("arena-course-subj", "cracker"); } catch {} };

/* #/course/cracker/<topic>: a Score Cracker topic's shorthand, laid out like a Course topic page.
   Overview and the question types on the left, the chosen one on the right, Practice at the top. */
export function CrackerNotes({ tid }) {
  const [n, err] = useData(() => topicNotes("cracker", tid).then((x) => x || false), [tid]);
  const [bank] = useData(bankIndex, []);
  const [sel, setSel] = useState(-1);
  const box = useRef(null);
  if (err) return <Failed what="these notes" err={err} />;
  if (n === null) return <Loading />;
  const practice = "#/practice/" + encodeURIComponent(tid);
  if (!n) return <div className="page"><div className="empty">No shorthand for this topic yet. <a href={practice}>Practise it</a></div></div>;
  const types = n.types || [];
  const t = types[sel];
  let qn = 0;
  if (bank) for (const s of bank.sections) for (const x of s.topics) if (x.id === tid) qn = x.n;
  const pick = (i) => { setSel(i); if (box.current) box.current.scrollTop = 0; };
  const next = sel + 1 < types.length ? sel + 1 : -1;
  return (
    <div className="page course tpage c-cracker shpage">
      <div className="bp-top chead3 thead2">
        <div className="tt">
          <div className="crumbs">
            <BackBtn />
            <a href="#/course" onClick={toCracker}>Modules</a>
            <span className="sep">/</span>
            <a href="#/course" onClick={toCracker}>Score Cracker</a>
          </div>
          <h1>{n.name}</h1>
        </div>
        <div className="sh-act">
          <div className="tpl"><b>Shorthand</b><small>{types.length} question types{qn ? " · " + qn.toLocaleString() + " questions to practise" : ""}</small></div>
          <a className="sh-go" href={practice}>Practice <span aria-hidden="true">→</span></a>
        </div>
      </div>
      <div className="tlay">
        <nav className="uside" aria-label={n.name + " shorthand"}>
          <div className="uhead-bar"><span>Shorthand</span><span className="uhead-count">{types.length + 1}</span></div>
          <div className="ulist">
            <button type="button" className={"uitem" + (sel < 0 ? " on" : "")} aria-current={sel < 0 ? "true" : undefined} onClick={() => pick(-1)}>
              <span className="unum">★</span>
              <span className="ctxt"><b>Overview</b><span className="urow"><small>Rules for every question</small></span></span>
            </button>
            {types.map((x, i) => (
              <button key={x.id || i} type="button" className={"uitem" + (i === sel ? " on" : "")} aria-current={i === sel ? "true" : undefined} onClick={() => pick(i)}>
                <span className="unum">{i + 1}</span>
                <span className="ctxt"><b title={x.name}>{x.name}</b><span className="urow"><small>{x.level || x.id}</small></span></span>
              </button>
            ))}
          </div>
        </nav>
        <div className="rcol">
          <section className="upane" aria-labelledby="upane-h">
            <div className="uhead">
              <span className="unum big">{t ? sel + 1 : "★"}</span>
              <div className="grow">
                <h2 id="upane-h">{t ? t.name : "Overview"}</h2>
                <small className="muted">{t ? "Question type " + (sel + 1) + " of " + types.length + (t.level ? " · " + t.level : "") : "What holds for every " + n.name + " question"}</small>
              </div>
            </div>
            <div className="uscroll" ref={box}>
              {t ? <TypeSheet t={t} /> : <Sheet n={n} order={ORDER.cracker} />}
              {next >= 0 ? (
                <button type="button" className="aftercard" onClick={() => pick(next)}>
                  <span><small>{sel < 0 ? "First question type" : "Next question type"}</small><b>{types[next].name}</b></span>
                  <i className="arrow" aria-hidden="true">→</i>
                </button>
              ) : (
                <a className="aftercard end" href={practice}>
                  <span><small>{types.length ? "Last question type" : "Done reading"}</small><b>Practise {n.name}</b></span>
                  <i className="arrow" aria-hidden="true">→</i>
                </a>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
