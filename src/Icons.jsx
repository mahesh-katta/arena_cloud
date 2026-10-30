import { useId } from "react";
const P = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
/* solid twins of the six main icons: the active rail item is drawn solid, the others as outlines.
   --cut is the colour of the little cut-outs (black on the rail). */
const S = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "currentColor", stroke: "none", "aria-hidden": true };
const CUT = "var(--cut, #FFFFFF)";


/* Practice icon: spiral notebook + quill. The notebook is masked around the feather so its border stops a small, even gap from it. */
const QUILL = "M21 1.997c-15 0-17 14-18 20h1.998q.999-5 5.002-5.5c4-.5 7-4 8-7l-1.5-1l1-1c1-1 2.004-2.5 3.5-5.5";
const QT = "translate(9.6 .2) scale(.66)";
/* bigger feather with a visible spine, used on the solid (open page) icon; it may poke out past the notebook */
const QUILL_BIG = "M6.94 14.033a30 30 0 0 0-.606 1.783c.96-.697 2.101-1.14 3.418-1.304c2.513-.314 4.746-1.973 5.876-4.058l-1.456-1.455l1.413-1.415l1-1.002c.43-.429.915-1.224 1.428-2.367c-5.593.867-9.018 4.291-11.074 9.818M17 8.997l1 1c-1 3-4 6-8 6.5q-4.003.5-5.002 5.5H3c1-6 3-20 18-20q-1.5 4.496-2.997 5.997z";
const QTB = "translate(5.6 .2) scale(.86)";
function PracticeIcon({ solid }) {
  const id = "pq" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", "aria-hidden": true };
  return solid ? (
    <svg {...common} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <defs><mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24"><rect width="24" height="24" fill="#FFFFFF" /><path d={QUILL} transform={QT} fill="#000000" stroke="#000000" strokeWidth="4.2" strokeLinejoin="round" /></mask></defs>
      <g mask={"url(#" + id + ")"}><path d="M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="currentColor" fillOpacity=".45" /><path d="M2 6h4M2 10h4M2 14h4M2 18h4" /></g>
      <path d={QUILL} transform={QT} fill="currentColor" stroke="none" />
    </svg>
  ) : (
    <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <defs><mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24"><rect width="24" height="24" fill="#FFFFFF" /><path d={QUILL} transform={QT} fill="#000000" stroke="#000000" strokeWidth="4.2" strokeLinejoin="round" /></mask></defs>
      <g mask={"url(#" + id + ")"}><path d="M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" /><path d="M2 6h4M2 10h4M2 14h4M2 18h4" /></g>
      <path d={QUILL} transform={QT} fill="currentColor" stroke="none" />
    </svg>
  );
}


/* Speed icon: a sporty car, a speedometer behind it and speed lines. The speedometer and lines stop a small gap from the car (mask). */
function SpeedIcon({ solid }) {
  return (
    <svg width="22" height="22" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={solid ? 4 : 3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M41 13.1A17 17 0 1 0 29.5 40.9" />
      <path d="M36 17.2A10.5 10.5 0 1 0 22.75 33.1" />
      <path d="M27 25L38.5 14.5" />
      <circle cx="27" cy="25" r={solid ? 3 : 2.4} fill={solid ? "currentColor" : "none"} />
      <path d="M6 12h8M3 17h9M5 22h5M3 27h7M6 32h6M9 37h6" strokeWidth={solid ? 3 : 2.4} />
    </svg>
  );
}

function MockIcon({ solid }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={solid ? 1.9 : 1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1.5" y="2" width="21" height="16" rx="2" fill={solid ? "currentColor" : "none"} fillOpacity={solid ? ".4" : undefined} />
      <path d="M8 22h8M12 18v4" />
      <path d="M5.5 6.5h8M5.5 10h13M5.5 13.5h10" />
    </svg>
  );
}

function BoosterIcon({ solid }) {
  const cut = "var(--cut, #FFFFFF)";
  return (
    <svg width="22" height="22" viewBox="-5.53 -1.1 22.92 22.92" fill="none" stroke="currentColor" strokeWidth={solid ? 1.81 : 1.43} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {[-24, -12].map((r) => (
        <g key={r} transform={"rotate(" + r + " 6 20)"}><rect x="4" y="2" width="11" height="18" rx="2" fill={cut} /></g>
      ))}
      <rect x="4" y="2" width="11" height="18" rx="2" fill={cut} />
      {solid && <rect x="4" y="2" width="11" height="18" rx="2" fill="currentColor" fillOpacity=".4" stroke="none" />}
    </svg>
  );
}

/* Home and Course are drawn on the same 24px grid and 1.8 stroke as the other line icons; their solid twins tint the body like Mock and Booster do */
const HomeIcon = ({ solid }) => (
  <svg {...P} strokeWidth={solid ? 2 : 1.8}>
    <path d="M3.5 10.2a2 2 0 0 1 .7-1.5l6.5-5.6a2 2 0 0 1 2.6 0l6.5 5.6a2 2 0 0 1 .7 1.5v8.8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" fill={solid ? "currentColor" : "none"} fillOpacity={solid ? ".4" : undefined} />
    <path d="M9.5 21v-6a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v6" />
  </svg>
);

const CourseIcon = ({ solid }) => (
  <svg {...P} strokeWidth={solid ? 2 : 1.8}>
    <path d="M12 6.8C10.4 5.5 8.2 4.8 5.6 4.8a1.1 1.1 0 0 0-1.1 1.1v10.9a1.1 1.1 0 0 0 1.1 1.1c2.6 0 4.8.7 6.4 2z" fill={solid ? "currentColor" : "none"} fillOpacity={solid ? ".4" : undefined} />
    <path d="M12 6.8c1.6-1.3 3.8-2 6.4-2a1.1 1.1 0 0 1 1.1 1.1v10.9a1.1 1.1 0 0 1-1.1 1.1c-2.6 0-4.8.7-6.4 2z" fill={solid ? "currentColor" : "none"} fillOpacity={solid ? ".4" : undefined} />
  </svg>
);

export const ICONS = {
  home: <HomeIcon />,
  practice: <PracticeIcon />,
  speed: <SpeedIcon />,
  mocks: <MockIcon />,
  booster: <BoosterIcon />,
  settings: <svg {...P}><path d="M10.05 4.97 L10.45 2.73 L13.55 2.73 L13.95 4.97 L15.59 5.65 L17.46 4.35 L19.65 6.54 L18.35 8.41 L19.03 10.05 L21.27 10.45 L21.27 13.55 L19.03 13.95 L18.35 15.59 L19.65 17.46 L17.46 19.65 L15.59 18.35 L13.95 19.03 L13.55 21.27 L10.45 21.27 L10.05 19.03 L8.41 18.35 L6.54 19.65 L4.35 17.46 L5.65 15.59 L4.97 13.95 L2.73 13.55 L2.73 10.45 L4.97 10.05 L5.65 8.41 L4.35 6.54 L6.54 4.35 L8.41 5.65Z" /><circle cx="12" cy="12" r="3" /></svg>,
  course: <CourseIcon />,
  mistakes: <svg {...P}><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /><path d="M12 8v4l3 2" /></svg>,
  back: <svg {...P}><path d="M15 18l-6-6 6-6" /></svg>,
  clock: <svg {...P} width="16" height="16"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2M9 2h6" /></svg>,
  check: <svg {...P} width="16" height="16" strokeWidth="2.6"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>,
  skip: <svg {...P} width="18" height="18"><path d="M5 5l9 7-9 7zM18 5v14" /></svg>,
  arrowL: <svg {...P} width="20" height="20" strokeWidth="1.9"><path d="M19 12H5M11 5.5L4.5 12l6.5 6.5" /></svg>,
  arrowR: <svg {...P} width="20" height="20" strokeWidth="1.9"><path d="M5 12h14M13 5.5l6.5 6.5-6.5 6.5" /></svg>,
  /* small solid icons for the figures on the home rows */
  mCheck: <svg {...S} width="17" height="17"><circle cx="12" cy="12" r="10" /><path d="M7.6 12.4l3 3 5.8-6.2" fill="none" stroke="var(--tilebg, #FFFFFF)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  mTarget: <svg {...S} width="17" height="17"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="5.6" fill="none" stroke="var(--tilebg, #FFFFFF)" strokeWidth="2" /><circle cx="12" cy="12" r="1.9" fill="var(--tilebg, #FFFFFF)" /></svg>,
  mFlag: <svg {...S} width="17" height="17"><path d="M6 2.8a1 1 0 0 1 1 1v.5c1.6-.9 3.2-.9 5 0s3.4.9 5.6-.1a.8.8 0 0 1 1.1.7v8.6a.8.8 0 0 1-.5.7c-2.5 1.2-4.5 1.2-6.4.2-1.7-.9-3-.9-4.8 0V21a1 1 0 0 1-2 0V3.8a1 1 0 0 1 1-1z" /></svg>,
};

export const SOLID = {
  home: <HomeIcon solid />,
  practice: <PracticeIcon solid />,
  speed: <SpeedIcon solid />,
  mocks: <MockIcon solid />,
  booster: <BoosterIcon solid />,
  course: <CourseIcon solid />,
  settings: <svg {...S} fillRule="evenodd"><path d="M10.05 4.97 L10.45 2.73 L13.55 2.73 L13.95 4.97 L15.59 5.65 L17.46 4.35 L19.65 6.54 L18.35 8.41 L19.03 10.05 L21.27 10.45 L21.27 13.55 L19.03 13.95 L18.35 15.59 L19.65 17.46 L17.46 19.65 L15.59 18.35 L13.95 19.03 L13.55 21.27 L10.45 21.27 L10.05 19.03 L8.41 18.35 L6.54 19.65 L4.35 17.46 L5.65 15.59 L4.97 13.95 L2.73 13.55 L2.73 10.45 L4.97 10.05 L5.65 8.41 L4.35 6.54 L6.54 4.35 L8.41 5.65Z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" /><circle cx="12" cy="12" r="3" fill={CUT} /></svg>,
};

/* App mark: a traced retriever. Swap RETRIEVER for HUSKY (both live in marks.js) to change the dog. */
import { RETRIEVER } from "./retriever.js";
/* RETRIEVER is the bottom-right dog from the logo sheet; its outline is thickened a little (stroke 11) so it stays bold at rail size. BADGE and HUSKY are also in marks.js. */
export const Mark = ({ art = RETRIEVER, sw = 0 }) => (
  <svg viewBox={art.vb} fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d={art.d} stroke="currentColor" strokeWidth={sw} strokeLinejoin="round" /></svg>
);
