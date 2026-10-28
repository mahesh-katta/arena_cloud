import { useEffect, useRef, useState } from "react";

/* One choice from a few (theme, sort): a labelled radio group. */
export function Tabs({ value, onChange, items, label }) {
  return (
    <div className="tabs" role="radiogroup" aria-label={label} onKeyDown={arrowKeys(items, value, onChange)}>
      {items.map(([k, text, n]) => (
        <button key={k} type="button" role="radio" aria-checked={value === k} tabIndex={value === k || (!items.some((x) => x[0] === value) && k === items[0][0]) ? 0 : -1}
          className={value === k ? "on" : ""} onClick={() => onChange(k)}>
          {text}{n != null && <span className="n">{typeof n === "number" ? n.toLocaleString() : n}</span>}
        </button>
      ))}
    </div>
  );
}
function arrowKeys(items, value, onChange) {
  return (e) => {
    const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!d) return;
    e.preventDefault(); e.stopPropagation();
    const i = Math.max(0, items.findIndex((x) => x[0] === value));
    const k = items[(i + d + items.length) % items.length][0];
    onChange(k);
    requestAnimationFrame(() => e.currentTarget?.querySelector('[aria-checked="true"]')?.focus());
  };
}

export function useView(key = "ap-view", dflt = "grid") {
  const [v, set] = useState(() => { try { return localStorage.getItem(key) || dflt; } catch { return "grid"; } });
  const setV = (x) => { set(x); try { localStorage.setItem(key, x); } catch {} };
  return [v, setV];
}
export const ViewToggle = ({ view, setView }) => {
  const toCards = view !== "grid";
  return (
    <button type="button" className="laybtn" onClick={() => setView(toCards ? "grid" : "list")} aria-label={toCards ? "Switch to card layout" : "Switch to list layout"} title={toCards ? "Card layout" : "List layout"}>
      {toCards
        ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><rect x="3.5" y="3.5" width="7" height="7" rx="1.8" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.8" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.8" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.8" /></svg>
        : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M4 6.5h16M4 12h16M4 17.5h16" /></svg>}
    </button>
  );
};

/* Two values in ONE button: it shows the current choice and a click flips to the other.
   optional: the button cycles All -> first -> second -> All. */
export function Toggle({ value, onChange, items, optional, label }) {
  const keys = items.map((x) => x[0]);
  const idx = keys.indexOf(value);
  const cur = items[idx];
  const order = optional ? ["", ...keys] : keys;
  const next = order[(order.indexOf(idx < 0 ? "" : value) + 1) % order.length];
  const nextItem = items.find((x) => x[0] === next);
  const text = cur ? cur[1] : "All";
  const n = cur ? cur[2] : null;
  return (
    <button type="button" className={"toggle1" + (cur ? " on" : "")} aria-label={label + ": " + text + ". Press to switch to " + (nextItem ? nextItem[1] : "all")}
      title={"Switch to " + (nextItem ? nextItem[1] : "all")} onClick={() => onChange(next)}>
      {cur ? <b>{text}</b> : <span className="tl idle">{label}</span>}{cur && n != null && <em>{typeof n === "number" ? n.toLocaleString() : n}</em>}
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M2 5h10l-3-3M14 11H4l3 3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
  );
}
/* Compact dropdown. multi: tick several, none = All. single: pick one. */
/* hover: opens when the pointer is over it and closes when it leaves (a click still toggles it, for touch) */
export function Dropdown({ label, value, onChange, opts, multi, prefix, hover }) {
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  useEffect(() => {
    if (!open) return;
    const away = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    const esc = (e) => e.key === "Escape" && setOpen(false);
    addEventListener("mousedown", away); addEventListener("keydown", esc);
    return () => { removeEventListener("mousedown", away); removeEventListener("keydown", esc); };
  }, [open]);
  const sel = multi ? value : [value];
  const hasVal = multi ? value.length > 0 : !!value;
  const text = multi ? (value.length === 0 ? "All" : value.length === 1 ? (opts.find((o) => o[0] === value[0])?.[1] || value[0]) : value.length + " selected") : (opts.find((o) => o[0] === value)?.[1] || "");
  const pick = (k) => { if (multi) onChange(value.includes(k) ? value.filter((x) => x !== k) : [...value, k]); else { onChange(k); setOpen(false); } };
  return (
    <div className={"dd" + (hover ? " hov" : "")} ref={box} onMouseEnter={hover ? () => setOpen(true) : undefined} onMouseLeave={hover ? () => setOpen(false) : undefined}>
      <button type="button" className={"ddbtn" + (multi && value.length ? " on" : "")} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="ddt">{hasVal ? <>{prefix && <span className="tl">{prefix}</span>}<b>{text}</b></> : <span className="tl idle">{label}</span>}</span>
        <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M3 6l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open && (
        <div className="ddmenu" role="listbox" aria-label={label} aria-multiselectable={multi || undefined}>
          {opts.map(([k, t, n, off]) => (
            <button key={k} type="button" role="option" aria-selected={sel.includes(k)} aria-disabled={(off || n === 0) && !sel.includes(k)} disabled={(off || n === 0) && !sel.includes(k)} className={"ddopt" + (sel.includes(k) ? " on" : "")} onClick={() => pick(k)}>
              <i className={multi ? "box" : "dotr"} aria-hidden="true" /><span className="grow">{t}</span>{n != null && <em>{typeof n === "number" ? n.toLocaleString() : n}</em>}
            </button>
          ))}
          {multi && value.length > 0 && <button type="button" className="ddclear" onClick={() => onChange([])}>Show all</button>}
        </div>
      )}
    </div>
  );
}
/* One dropdown with several small single-choice groups (Sort, Type, Status). groups: [{ title, value, onChange, opts: [[key, text, count, disabled]] }] */
export function GroupMenu({ label, groups, summary, active, hint }) {
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  useEffect(() => {
    if (!open) return;
    const away = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    const esc = (e) => e.key === "Escape" && setOpen(false);
    addEventListener("mousedown", away); addEventListener("keydown", esc);
    return () => { removeEventListener("mousedown", away); removeEventListener("keydown", esc); };
  }, [open]);
  return (
    <div className="dd ddgroups" ref={box}>
      <button type="button" className={"ddbtn" + (active ? " on" : "")} aria-haspopup="true" aria-expanded={open} title={hint} onClick={() => setOpen(!open)}>
        <span className="ddt"><span className="tl">{label}</span><b>{summary}</b></span>
        <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M3 6l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open && (
        <div className="ddmenu" role="menu" aria-label={label}>
          {groups.map((g) => (
            <div key={g.title} className="ddgroup" role="group" aria-label={g.title}>
              <div className="ddgtitle">{g.title}</div>
              {g.opts.map(([k, t, n, off, tip]) => (
                <button key={k} type="button" title={tip} role="menuitemradio" aria-checked={g.value === k} disabled={(off || n === 0) && g.value !== k} className={"ddopt" + (g.value === k ? " on" : "")} onClick={() => g.onChange(k)}>
                  <i className="dotr" aria-hidden="true" /><span className="grow">{t}</span>{n != null && <em>{typeof n === "number" ? n.toLocaleString() : n}</em>}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
/* On/off pill button */
export const Chip = ({ on, onChange, children, disabled }) => <button type="button" className={"chipbtn" + (on ? " on" : "")} aria-pressed={on} disabled={disabled} onClick={() => onChange(!on)}>{children}</button>;

export function Switch({ checked, onChange, children, disabled }) {
  return <label className={"switch" + (disabled ? " off" : "")}><input type="checkbox" role="switch" aria-checked={checked} checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} /><i />{children}</label>;
}
/* Three or more values: checkboxes, several at once; none ticked means all. */
export function Checks({ value, onChange, opts, inline, label, radio }) {
  const flip = (k) => onChange(value.includes(k) ? value.filter((x) => x !== k) : [...value, k]);
  return (
    <div className={"checks" + (inline ? " inline" : "")} role="group" aria-label={label}>
      {opts.map(([k, text, n]) => (
        <label key={k} className={"ck" + (value.includes(k) ? " on" : "") + (n === 0 && !value.includes(k) ? " off" : "")}>
          <input type={radio ? "radio" : "checkbox"} name={radio ? label : undefined} checked={value.includes(k)} disabled={n === 0 && !value.includes(k)} onChange={() => (radio ? onChange([k]) : flip(k))} />
          <span className="grow">{text}</span>{n != null && <em>{n.toLocaleString()}</em>}
        </label>
      ))}
    </div>
  );
}
/* A labelled group of checkboxes for the side panel (always checkboxes, so every option keeps its own count). */
export function FacetBox({ label, value, onChange, opts, radio }) {
  if (opts.length < 2) return null;
  return <div className="facet"><div className="flabel">{label}{!radio && value.length > 0 && <button type="button" className="linkbtn" onClick={() => onChange([])}>All</button>}</div><Checks label={label} value={value} onChange={onChange} opts={opts} radio={radio} /></div>;
}
/* Picks the right control from the number of values. value is an array (empty = all). */
export function Facet({ label, value, onChange, opts, inline }) {
  if (opts.length < 2) return null;
  const body = opts.length === 2
    ? <Toggle optional label={label} value={value[0] || ""} onChange={(k) => onChange(k ? [k] : [])} items={opts} />
    : <Checks label={label} value={value} onChange={onChange} opts={opts} inline={inline} />;
  if (!label || inline || opts.length === 2) return body;
  return <div className="facet"><div className="flabel">{label}{value.length > 0 && <button type="button" className="linkbtn" onClick={() => onChange([])}>All</button>}</div>{body}</div>;
}

export function secClass(name = "") {
  if (/reason/i.test(name)) return "s-r";
  if (/quant|numerical|data|arith|maths?/i.test(name)) return "s-q";
  if (/english/i.test(name)) return "s-e";
  if (/aware|financ|banking|general|economy|insurance/i.test(name)) return "s-ga";
  if (/computer/i.test(name)) return "s-cs";
  return "s-b";
}
export const SEC_SHORT = { "Quantitative Aptitude": "Quant", "Reasoning Ability": "Reasoning", "English Language": "English", "General Awareness": "General Awareness", "Computer Knowledge": "Computer" };
export const short = (s) => SEC_SHORT[s] || s;

export function initials(s = "", n = 2) {
  const w = String(s).replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter((x) => x && !/^(and|of|the|on|in|based|&)$/i.test(x));
  return (w.length === 1 ? w[0].slice(0, n) : w.slice(0, n).map((x) => x[0]).join("")).toUpperCase();
}

export function Ring({ pct, label }) {
  const p = Math.max(0, Math.min(100, Math.round(pct || 0)));
  return <span className="ring" style={{ "--p": p }} title={p + "%"}>{label ?? p + "%"}</span>;
}
export function Meter({ ok = 0, bad = 0, total = 1 }) {
  const w = (x) => (total ? (100 * x) / total : 0) + "%";
  return <div className="meter"><i className="ok" style={{ width: w(ok) }} /><i className="bad" style={{ width: w(bad) }} /></div>;
}
export const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);
export const Loading = () => <div className="page muted">Loading…</div>;
export const Failed = ({ what, err }) => <div className="page"><div className="empty">Could not load {what}: {err}</div></div>;

/* Solve pages: question on the left, tools rail on the right.
   On narrow screens the rail becomes a bottom sheet opened by the Tools button. */
export function Solve({ cls = "", crumbs, rail, children, open, setOpen }) {
  const side = useRef(null), btn = useRef(null);
  const sheet = () => matchMedia("(max-width: 1200px)").matches;
  useEffect(() => {
    if (!open) return;
    const opener = btn.current;
    if (sheet()) side.current?.focus();
    const f = (e) => {
      if (e.key === "Escape") return setOpen(false);
      if (e.key !== "Tab" || !sheet() || !side.current) return;
      const els = [...side.current.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),[tabindex="0"]')].filter((x) => x.offsetParent);
      if (!els.length) return;
      const a = els[0], z = els[els.length - 1];
      if (!side.current.contains(document.activeElement)) { e.preventDefault(); a.focus(); }
      else if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    };
    addEventListener("keydown", f);
    return () => { removeEventListener("keydown", f); if (sheet()) opener?.focus(); };
  }, [open]);
  return (
    <div className={"solve " + cls + (open ? " tools-open" : "")}>
      <div className="crumbs"><span className="grow crumbline">{crumbs}</span>
        <button type="button" ref={btn} className="btn sm toolsbtn" aria-haspopup="dialog" aria-expanded={!!open} aria-controls="tools" onClick={() => setOpen(!open)}>Tools</button>
      </div>
      <div className="main">{children}</div>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <aside className="rail" id="tools" aria-label="Practice tools" ref={side} tabIndex={-1} {...(open ? { role: "dialog", "aria-modal": true } : {})}>
        <div className="sheethead"><b className="grow">Tools</b><button type="button" className="btn ghost sm" onClick={() => setOpen(false)}>Close</button></div>
        {rail}
      </aside>
    </div>
  );
}
