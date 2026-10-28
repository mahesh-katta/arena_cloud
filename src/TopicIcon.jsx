import { initials } from "./ui.jsx";

/* Plain pictograms for the topics: thin single-colour outlines of the real thing (a train, a die, a flask),
   no fills or colour. Names with no picture fall back to their letters. */
const P = { width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
const svg = (...c) => <svg {...P}>{c}</svg>;
const seat = (x, y, w = 4, h = 4) => <rect key={x + "," + y} x={x} y={y} width={w} height={h} rx="1" />;
const dot = (x, y, r = 0.7) => <circle key={x + "," + y} cx={x} cy={y} r={r} fill="currentColor" stroke="none" />;
const cal = (...c) => svg(<rect x="4" y="5" width="16" height="15" rx="2" />, <path d="M4 10h16M8 3v4M16 3v4" />, ...c);
const GRID = [[8, 13.5], [12, 13.5], [16, 13.5], [8, 17], [12, 17], [16, 17]];
const road = svg(<path d="M8 21L10 3M16 21l-2-18M12 5v3M12 11v3M12 17v3" />);
const clock = svg(<circle cx="12" cy="12" r="9" />, <path d="M12 7v5l3 2" />);
const doc = svg(<path d="M6 3h9l4 4v14H6z" />, <path d="M14 3v5h5M9 12h7M9 16h7" />);
const table = svg(<rect x="3.5" y="4.5" width="17" height="15" rx="1.5" />, <path d="M3.5 9.5h17M3.5 14.5h17M9.500 4.500v15" />);
const circTable = svg(<circle cx="12" cy="12" r="3.5" />, <circle cx="12" cy="4.500" r="1.600" />, <circle cx="19.500" cy="12" r="1.600" />, <circle cx="12" cy="19.500" r="1.600" />, <circle cx="4.500" cy="12" r="1.600" />);
const people = svg(<circle cx="8" cy="8" r="3" />, <path d="M2.500 20c0-3.300 2.500-5.500 5.500-5.500s5.500 2.200 5.500 5.500" />, <circle cx="16.500" cy="9" r="2.500" />, <path d="M15 14.800c3-.4 6.500 1.200 6.500 5" />);
const chart = svg(<path d="M4 4v16h16" />, <path d="M8 16v-4M12 16V8M16 16v-6" />);
const poly = (sides, r = 6.500, cy = 12) => Array.from({ length: sides }, (_, i) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / sides; return [12 + r * Math.cos(a), cy + r * Math.sin(a)]; });
const shape = (n, r) => svg(<path d={poly(n, r).map(([x, y], i) => (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1)).join("") + "Z"} />, ...poly(n, r).map(([x, y]) => <circle key={x} cx={x} cy={y} r="1.500" fill="var(--tilebg, #fff)" />));

const ICON = [
  /* quant */
  [/average/, svg(<path d="M12 4v15M8 20h8M5 7h14" />, <circle cx="12" cy="4" r="1" />, <path d="M5 7l-3 7h6zM19 7l-3 7h6z" />, <path d="M2 14c0 2 6 2 6 0M16 14c0 2 6 2 6 0" />)],
  [/boat|stream/, svg(<path d="M3 14h18l-2.500 5h-13zM12 14V4l5 8" />, <path d="M3 21.500c1.500 0 1.500-.8 3-.8" />)],
  [/mensuration/, svg(<path d="M12 3l8 4.500v9L12 21l-8-4.500v-9zM4 7.500l8 4.500 8-4.500M12 12v9" />)],
  [/mixture|alligation/, svg(<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.800 3h10.400a2 2 0 0 0 1.800-3l-5-9V3M7.500 15h9" />)],
  [/partnership|group/, people],
  [/percent/, svg(<path d="M19 5L5 19" />, <circle cx="7" cy="7" r="2.500" />, <circle cx="17" cy="17" r="2.500" />)],
  [/pipe|cistern/, svg(<path d="M3 5h10a2 2 0 0 1 2 2v2M15 11v1.500" />, <rect x="5" y="13" width="14" height="8" rx="1.500" />, <path d="M5 17h14" />)],
  [/probab/, svg(<rect x="4" y="4" width="16" height="16" rx="3" />, dot(9, 9), dot(15, 9), dot(12, 12), dot(9, 15), dot(15, 15))],
  [/\bages?\b/, svg(<path d="M4 20h16M5 20v-6h14v6M5 16.500c2 1.500 3.500-1.500 7 0s5 1.500 7 0M12 14v-4M12 10c-1-1-1-2 0-3 1 1 1 2 0 3" />)],
  [/numbers\b|basic math/, svg(<path d="M9 4L7 20M17 4l-2 16M4 9h16M3.500 15h16" />)],
  [/profit|loss/, svg(<path d="M3 17l5-5 4 3 8-9M15 6h5v5" />)],
  /* three-quarter pie with the quarter cut away */
  [/ratio|proportion/, svg(<path d="M11.500 5a8 8 0 1 1-8 8h8z" />, <path d="M9.500 3.500a8 8 0 0 0-8 8h8z" />)],
  [/interest/, svg(<rect x="2" y="6" width="20" height="11" rx="1.500" />, <circle cx="12" cy="11.500" r="2.500" />, dot(5.500, 11.500), dot(18.500, 11.500), <path d="M4 20.500h16" />)],
  [/time and distance|distance/, road],
  [/time and work|timing/, clock],
  [/\btrains?\b/, svg(<rect x="5" y="3" width="14" height="15" rx="3" />, <rect x="7.500" y="6" width="9" height="5" rx="1" />, dot(9, 14.500, 1), dot(15, 14.500, 1), <path d="M8.500 18L6.500 21.500M15.500 18l2 3.500M3 21.500h18" />)],
  [/lcm|hcf/, svg(<path d="M5 12h14" />, dot(12, 6.500, 1.200), dot(12, 17.500, 1.200))],
  [/quadratic/, svg(<path d="M4 4c2 14 6 16 8 16s6-2 8-16M12 3v18" strokeWidth="1.200" />)],
  [/simplification|approximation/, svg(<rect x="5" y="3" width="14" height="18" rx="2" />, <path d="M8 7h8v3H8zM8 14h1M12 14h1M16 14h0M8 17.500h1M12 17.500h1M16 17.500h0" />)],
  [/permutation/, svg(<path d="M4 8h14l-3-3M20 16H6l3 3" />)],
  [/quantity comparison|inequality/, svg(<path d="M7 5l10 5-10 5M7 19h10" />)],
  /* data interpretation */
  [/funnel/, svg(<path d="M3 5h18l-7 8v6l-4 2v-8z" />)],
  [/bar graph|\bdi\b/, chart],
  [/line graph/, svg(<path d="M4 4v16h16" />, <path d="M7 15l4-4 3 2 5-6" />)],
  [/pie/, svg(<circle cx="12" cy="12" r="9" />, <path d="M12 3v9l7 4.500" />)],
  [/scatter/, svg(<path d="M4 4v16h16" />, dot(8, 15, 1), dot(11, 11, 1), dot(14, 14, 1), dot(17, 8, 1), dot(9, 8, 1))],
  [/radar/, svg(<path d="M12 3l8.500 6.200-3.200 10H6.700l-3.200-10z" />, <path d="M12 8l4 3-1.500 5h-5L8 11z" />)],
  [/bubble/, svg(<circle cx="9" cy="14" r="5" />, <circle cx="17" cy="8" r="3" />, <circle cx="18" cy="17" r="1.500" />)],
  [/candle/, svg(<path d="M7 4v16M12 7v12M17 3v14" />, <rect x="5.500" y="8" width="3" height="7" fill="var(--tilebg, #fff)" />, <rect x="10.500" y="10" width="3" height="6" fill="var(--tilebg, #fff)" />, <rect x="15.500" y="6" width="3" height="7" fill="var(--tilebg, #fff)" />)],
  [/triangle chart/, svg(<path d="M12 4l9 16H3z" />, <path d="M7.500 12h9" />)],
  [/tree/, svg(<rect x="9" y="3" width="6" height="4" rx="1" />, <rect x="3" y="17" width="6" height="4" rx="1" />, <rect x="15" y="17" width="6" height="4" rx="1" />, <path d="M12 7v4M6 17v-6h12v6" />)],
  [/table/, table],
  [/data sufficiency|caselet/, doc],
  /* reasoning: calendars */
  [/month.*date/, cal(...GRID.map(([x, y], i) => dot(x, y, i === 4 ? 1.300 : 0.600)))],
  [/month.*year|year.*month/, cal(<path d="M8 14h8M8 17.500h5" />)],
  [/year/, cal(<path d="M8 14h8M8 17.500h8" />)],
  [/month/, cal(...GRID.map(([x, y]) => dot(x, y, 0.600)))],
  [/week/, cal(<path d="M8 14h8M8 17.500h8" strokeDasharray="1 2" />)],
  [/\bday\b/, cal(dot(12, 15, 1.300))],
  /* puzzles */
  [/box/, svg(seat(4, 12.500, 7, 7), seat(13, 12.500, 7, 7), seat(8.500, 4, 7, 7))],
  [/flat/, svg(<rect x="6" y="3" width="12" height="18" rx="1" />, <path d="M10 7h1M13 7h1M10 11h1M13 11h1M10 15h1M13 15h1" />)],
  [/floor/, svg(<rect x="6" y="3" width="12" height="18" rx="1" />, <path d="M6 9h12M6 15h12" />)],
  [/lift/, svg(<rect x="5" y="3" width="14" height="18" rx="1.500" />, <path d="M9 11l3-3 3 3M9 14l3 3 3-3" />)],
  [/staircase/, svg(<path d="M3 20h5v-4h5v-4h5V8h3" />)],
  [/designation|blood/, svg(seat(9, 3, 6, 5), seat(3, 16, 6, 5), seat(15, 16, 6, 5), <path d="M12 8v4M6 16v-4h12v4" />)],
  [/sequence|series/, svg(<path d="M9 6h11M9 12h11M9 18h11" />, dot(4.500, 6), dot(4.500, 12), dot(4.500, 18))],
  [/project/, svg(<path d="M4 6l2 2 3-3M4 14l2 2 3-3M12 7h8M12 15h8" />)],
  [/word|alphabet|alphanumeric/, svg(<path d="M3 18L7.500 6 12 18M4.800 14h5.400M14 11c0-1 1-2 2.500-2s2.500 1 2.500 2.500V18M19 14.500c-1.500 0-4.500 0-4.500 2 0 1 1 1.500 2 1.500 1.800 0 2.500-1.500 2.500-3.500" strokeWidth="1.300" />)],
  [/matrix|one mark|lane|coded|coding/, table],
  /* seating arrangements */
  [/concentric/, svg(<circle cx="12" cy="12" r="8.500" />, <circle cx="12" cy="12" r="4.500" />)],
  [/hexagon/, shape(6, 7.500)],
  [/pentagon/, shape(5, 7.500)],
  [/triangular/, shape(3, 8)],
  [/circular/, circTable],
  [/square/, svg(seat(8, 8, 8, 8), seat(10.500, 3, 3, 2.500), seat(10.500, 18.500, 3, 2.500), seat(3, 10.500, 2.500, 3), seat(18.500, 10.500, 2.500, 3))],
  [/rectang/, svg(seat(6, 9, 12, 6), seat(7, 4, 3.500, 2.500), seat(13.500, 4, 3.500, 2.500), seat(7, 17.500, 3.500, 2.500), seat(13.500, 17.500, 3.500, 2.500))],
  [/parallel/, svg(seat(4, 5), seat(10, 5), seat(16, 5), seat(4, 15), seat(10, 15), seat(16, 15), <path d="M3 12h18" strokeDasharray="1 3" />)],
  [/unknown linear/, svg(seat(3, 9, 5, 6), <rect x="9.500" y="9" width="5" height="6" rx="1" strokeDasharray="2 2" />, seat(16, 9, 5, 6))],
  [/linear/, svg(seat(3, 9, 5, 6), seat(9.500, 9, 5, 6), seat(16, 9, 5, 6), <path d="M3 18.500h18" />)],
  [/seating|arrangement/, circTable],
  /* reasoning: logic and verbal */
  [/syllogism/, svg(<circle cx="9" cy="12" r="6" />, <circle cx="15" cy="12" r="6" />)],
  [/statement/, doc],
  [/cause|course of action/, svg(<path d="M4 12h12M12 7l5 5-5 5" />)],
  [/input.?output/, svg(<path d="M3 12h9M8 8l4 4-4 4M18 5v14" />)],
  [/direction/, svg(<circle cx="12" cy="12" r="9" />, <path d="M15.500 8.500l-2 5-5 2 2-5z" />)],
  [/order and ranking/, svg(<path d="M4 20V12h5v8M9.500 20V6h5v14M15 20v-5h5v5" />)],
];
export function topicIcon(name = "") {
  const n = String(name).toLowerCase();
  const hit = ICON.find(([re]) => re.test(n));
  return hit ? hit[1] : null;
}
export const glyph = (name, n) => topicIcon(name) || initials(name, n);
