/* Turns the plain-text maths stored in the question bank into readable maths:
   x^2, (256)^(1/2), √(345 – 176), ∛2197, 2 (2/3), 3/4, 125 * 4  →  superscripts, radicals with a bar,
   stacked fractions, mixed numbers and ×. Anything it does not recognise stays exactly as written. */
import { Fragment, createContext, useContext } from "react";

const NUM = "\\d+(?:\\.\\d+)?";

/* "quant" while a quant question (or quant notes) is drawn: there a capital letter is a base too (N^(M), X^2) and a power
   may stand one space after its base ((1 + 10/100) ^3, 5 ^(– 1)). Never elsewhere: in reasoning ^ is a symbol (A^B, M^6). */
export const MathsMode = createContext("");

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

export function parse(s, depth = 0, quant = false) {
  const out = [];
  let buf = "", i = 0, key = 0;
  const flush = () => { if (buf) { out.push(buf); buf = ""; } };
  const push = (node) => { flush(); out.push(<Fragment key={key++}>{node}</Fragment>); };
  const sub = (t) => parse(t, depth + 1, quant);
  while (i < s.length) {
    const rest = s.slice(i), c = s[i], prev = i ? s[i - 1] : "";
    let m;
    /* $sqrtP$ and sqrt(…) */
    if ((m = rest.match(/^\$sqrt\{?([A-Za-z0-9.]+)\}?\$/))) { push(<Rad k="√">{m[1]}</Rad>); i += m[0].length; continue; }
    if ((m = rest.match(/^sqrt\(([^()]*)\)/))) { push(<Rad k="√">{sub(m[1])}</Rad>); i += m[0].length; continue; }
    /* √ ∛ ∜ : radicand is a (group), a number, or one letter */
    if (c === "√" || c === "∛" || c === "∜") {
      if (s[i + 1] === "(") {
        const e = closeAt(s, i + 1);
        if (e > 0) { push(<Rad k={c}>{sub(s.slice(i + 2, e))}</Rad>); i = e + 1; continue; }
      }
      if ((m = rest.slice(1).match(new RegExp("^(" + NUM + "|[A-Za-z])(?![A-Za-z])")))) { push(<Rad k={c}>{m[1]}</Rad>); i += 1 + m[0].length; continue; }
    }
    /* a raised part in front, not a power: ⁿCr written ^(x)C₂, a root's index written ^(2.9)√3374 */
    if (c === "^" && s[i + 1] === "(") {
      const e = closeAt(s, i + 1);
      if (e > 0 && (/[CP√∛]/.test(s[e + 1] || "") || (quant && s[e + 1] === " " && /[CP]/.test(s[e + 2] || "")))) { push(<sup className="mpow">{sub(s.slice(i + 2, e))}</sup>); i = e + 1; continue; }
    }
    /* powers: the base sits right before ^ (a number, a bracket, a small letter, ?), never the spaced "Q ^ R" symbols of
       reasoning questions; the power is a (group), a number, a small letter or ?. Quant only: see MathsMode */
    const spaced = quant && prev === " " && /[\dA-Za-z)\]}?]/.test(s[i - 2] || "") && s[i + 1] !== " ";
    if (c === "^" && (/[\d)a-z\]}?]/.test(prev) || (quant && /[A-Z]/.test(prev)) || spaced)) {
      let node = null, n = 0;
      if (s[i + 1] === "(") {
        const e = closeAt(s, i + 1);
        if (e > 0) { node = sub(s.slice(i + 2, e)); n = e + 1 - i; }
      }
      if (!node && (m = rest.slice(1).match(new RegExp("^(-?" + NUM + "|[a-z?])(?![A-Za-z0-9])")))) { node = m[1]; n = 1 + m[0].length; }
      /* quant: πr^2h (a number power, then the next letter) and (1 + R/100)^T (a capital power) */
      if (!node && quant && (m = rest.slice(1).match(new RegExp("^(" + NUM + ")(?=[a-z])|^([A-Z])(?![A-Za-z0-9])")))) { node = m[1] || m[2]; n = 1 + m[0].length; }
      if (node) { if (spaced) buf = buf.slice(0, -1); push(<sup className="mpow">{node}</sup>); i += n; continue; }
    }
    /* (a + b)/(c – d) , (a + b)/12 , 32/(x – 1)  →  stacked, outer brackets dropped */
    if (c === "(") {
      const e1 = closeAt(s, i);
      if (e1 > 0 && s[e1 + 1] === "/") {
        let m2 = null, end = -1, den = null;
        if (s[e1 + 2] === "(") { const e2 = closeAt(s, e1 + 2); if (e2 > 0) { den = s.slice(e1 + 3, e2); end = e2 + 1; } }
        else if ((m2 = s.slice(e1 + 2).match(new RegExp("^" + NUM + "(?![\\w/])")))) { den = m2[0]; end = e1 + 2 + m2[0].length; }
        if (den != null && /[+\-–−×÷a-zA-Z]/.test(s.slice(i + 1, e1) + den) && !/[a-z]{3,}/i.test(s.slice(i + 1, e1) + den)) { push(<Frac n={sub(s.slice(i + 1, e1))} d={sub(den)} />); i = end; continue; }
      }
    }
    if (/\d/.test(c) && !/[\w./]/.test(prev) && (m = rest.match(new RegExp("^(" + NUM + ")/\\("))) ) {
      const o = i + m[0].length - 1, e = closeAt(s, o);
      if (e > 0) { push(<Frac n={m[1]} d={sub(s.slice(o + 1, e))} />); i = e + 1; continue; }
    }
    /* mixed number: 16(1/2)  or  2 (2/3) */
    if (/\d/.test(c) && !/[A-Za-z\d.]/.test(prev) && (m = rest.match(/^(\d+) ?\((\d+)\/(\d+)\)/))) { push(<span className="mmix">{m[1]}<Frac n={m[2]} d={m[3]} /></span>); i += m[0].length; continue; }
    /* simple fraction 3/4, also 1200/2.5 (the bottom is never cut at its decimal point: 1200/2 with .5 after it) */
    if (/\d/.test(c) && !/[\w./]/.test(prev) && (m = rest.match(/^(\d{1,4})\/(\d{1,4}(?:\.\d+)?)(?![\w/]|\.\d)/))) { push(<Frac n={m[1]} d={m[2]} />); i += m[0].length; continue; }
    /* a * b between numbers or brackets is a multiplication */
    if (c === " " && s[i + 1] === "*" && s[i + 2] === " " && /[\d)]/.test(prev) && /[\d(√∛∜?$a-z]/.test(s[i + 3] || "")) { buf += " × "; i += 3; continue; }
    buf += c; i++;
  }
  flush();
  return out;
}

export const hasMath = (s) => /[\^√∛∜*]|\d\/\d|sqrt/.test(s);
export function Maths({ text }) {
  const quant = useContext(MathsMode) === "quant";
  const s = String(text ?? "");
  return hasMath(s) ? <>{parse(s, 0, quant)}</> : s;
}
