/* Turns the plain-text maths stored in the question bank into readable maths:
   x^2, (256)^(1/2), √(345 – 176), ∛2197, 2 (2/3), 3/4, 125 * 4  →  superscripts, radicals with a bar,
   stacked fractions, mixed numbers and ×. Anything it does not recognise stays exactly as written. */
import { Fragment } from "react";

const NUM = "\\d+(?:\\.\\d+)?";

/* index of the ")" that closes the "(" at s[open], or -1 */
function closeAt(s, open) {
  let d = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === "(") d++;
    else if (s[i] === ")" && --d === 0) return i;
  }
  return -1;
}

const Frac = ({ n, d }) => <span className="mfrac"><span className="mn">{n}</span><span className="md">{d}</span></span>;
const Rad = ({ k, children }) => <span className="mrad">{k !== "√" && <sup className="mroot">{k === "∛" ? 3 : 4}</sup>}<span className="msign">√</span><span className="mbar">{children}</span></span>;

export function parse(s, depth = 0) {
  const out = [];
  let buf = "", i = 0, key = 0;
  const flush = () => { if (buf) { out.push(buf); buf = ""; } };
  const push = (node) => { flush(); out.push(<Fragment key={key++}>{node}</Fragment>); };
  while (i < s.length) {
    const rest = s.slice(i), c = s[i], prev = i ? s[i - 1] : "";
    let m;
    /* $sqrtP$ and sqrt(…) */
    if ((m = rest.match(/^\$sqrt\{?([A-Za-z0-9.]+)\}?\$/))) { push(<Rad k="√">{m[1]}</Rad>); i += m[0].length; continue; }
    if ((m = rest.match(/^sqrt\(([^()]*)\)/))) { push(<Rad k="√">{parse(m[1], depth + 1)}</Rad>); i += m[0].length; continue; }
    /* √ ∛ ∜ : radicand is a (group), a number, or one letter */
    if (c === "√" || c === "∛" || c === "∜") {
      if (s[i + 1] === "(") {
        const e = closeAt(s, i + 1);
        if (e > 0) { push(<Rad k={c}>{parse(s.slice(i + 2, e), depth + 1)}</Rad>); i = e + 1; continue; }
      }
      if ((m = rest.slice(1).match(new RegExp("^(" + NUM + "|[A-Za-z])(?![A-Za-z])")))) { push(<Rad k={c}>{m[1]}</Rad>); i += 1 + m[0].length; continue; }
    }
    /* powers: base directly before ^, never the spaced "Q ^ R" symbols of reasoning questions */
    if (c === "^" && /[\d)a-z\]]/.test(prev)) {
      if (s[i + 1] === "(") {
        const e = closeAt(s, i + 1);
        if (e > 0) { push(<sup className="mpow">{parse(s.slice(i + 2, e), depth + 1)}</sup>); i = e + 1; continue; }
      }
      if ((m = rest.slice(1).match(new RegExp("^(-?" + NUM + "|[a-z])(?![A-Za-z0-9])")))) { push(<sup className="mpow">{m[1]}</sup>); i += 1 + m[0].length; continue; }
    }
    /* (a + b)/(c – d) , (a + b)/12 , 32/(x – 1)  →  stacked, outer brackets dropped */
    if (c === "(") {
      const e1 = closeAt(s, i);
      if (e1 > 0 && s[e1 + 1] === "/") {
        let m2 = null, end = -1, den = null;
        if (s[e1 + 2] === "(") { const e2 = closeAt(s, e1 + 2); if (e2 > 0) { den = s.slice(e1 + 3, e2); end = e2 + 1; } }
        else if ((m2 = s.slice(e1 + 2).match(new RegExp("^" + NUM + "(?![\\w/])")))) { den = m2[0]; end = e1 + 2 + m2[0].length; }
        if (den != null && /[+\-–−×÷a-zA-Z]/.test(s.slice(i + 1, e1) + den) && !/[a-z]{3,}/i.test(s.slice(i + 1, e1) + den)) { push(<Frac n={parse(s.slice(i + 1, e1), depth + 1)} d={parse(den, depth + 1)} />); i = end; continue; }
      }
    }
    if (/\d/.test(c) && !/[\w./]/.test(prev) && (m = rest.match(new RegExp("^(" + NUM + ")/\\("))) ) {
      const o = i + m[0].length - 1, e = closeAt(s, o);
      if (e > 0) { push(<Frac n={m[1]} d={parse(s.slice(o + 1, e), depth + 1)} />); i = e + 1; continue; }
    }
    /* mixed number: 16(1/2)  or  2 (2/3) */
    if (/\d/.test(c) && !/[A-Za-z\d.]/.test(prev) && (m = rest.match(/^(\d+) ?\((\d+)\/(\d+)\)/))) { push(<span className="mmix">{m[1]}<Frac n={m[2]} d={m[3]} /></span>); i += m[0].length; continue; }
    /* simple fraction 3/4 */
    if (/\d/.test(c) && !/[\w./]/.test(prev) && (m = rest.match(/^(\d{1,4})\/(\d{1,4})(?![\w/])/))) { push(<Frac n={m[1]} d={m[2]} />); i += m[0].length; continue; }
    /* a * b between numbers or brackets is a multiplication */
    if (c === " " && s[i + 1] === "*" && s[i + 2] === " " && /[\d)]/.test(prev) && /[\d(√∛∜?$a-z]/.test(s[i + 3] || "")) { buf += " × "; i += 3; continue; }
    buf += c; i++;
  }
  flush();
  return out;
}

export const hasMath = (s) => /[\^√∛∜*]|\d\/\d|sqrt/.test(s);
export function Maths({ text }) {
  const s = String(text ?? "");
  return hasMath(s) ? <>{parse(s)}</> : s;
}
