/* One drawn icon per topic, chosen for what the topic is about. */
const F = { fill: "currentColor", stroke: "none" };

export const TOPIC_ICON = {
  basics: <><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z" /></>,
  simplification: <><path d="M7 3.5v6M4 6.5h6M14 6.5h6M4.5 14.5l5 5M9.5 14.5l-5 5M14 17h6" /><circle cx="17" cy="14" r="1" {...F} /><circle cx="17" cy="20" r="1" {...F} /></>,
  approximations: <path d="M4 9.5c2.2-2 4.2-2 7 0s5 2 9 0M4 15.5c2.2-2 4.2-2 7 0s5 2 9 0" />,
  percentages: <><path d="M19 5L5 19" /><circle cx="7" cy="7" r="2.6" /><circle cx="17" cy="17" r="2.6" /></>,
  "ratio-proportion": <><path d="M12 4v16M8 20h8M5 7h14" /><path d="M2 13l3-6 3 6M16 13l3-6 3 6" /><path d="M2 13a3 3 0 0 0 6 0zM16 13a3 3 0 0 0 6 0z" /></>,
  averages: <><path d="M4 20h16M6.5 20v-6M10.5 20V8M14.5 20v-9M18.5 20v-5" /><path d="M3 12.5h18" strokeDasharray="2.2 2.2" /></>,
  ages: <><path d="M4 21h16M5 21v-6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6" /><path d="M5 17c2.3 1.5 4.6 1.5 7 0s4.7-1.5 7 0M12 13V9" /><path d="M12 3.5c1 1.1 1 2.4 0 3.2-1-.8-1-2.1 0-3.2z" /></>,
  partnership: <><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0" /><circle cx="17" cy="9" r="2.5" /><path d="M16 14.3A5 5 0 0 1 21 19" /></>,
  "profit-loss": <><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></>,
  "simple-interest": <><ellipse cx="12" cy="6" rx="7" ry="2.5" /><path d="M5 6v4c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6M5 10v4c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-4M5 14v4c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-4" /></>,
  "compound-interest": <><path d="M4 4v16h16" /><path d="M6.5 17.5c5 0 8.5-3 11.5-11" /><path d="M14.5 6.5H18V10" /></>,
  "simple-compound-interest": <><path d="M3 10l9-6 9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20.5h18" /></>,
  "mixtures-alligations": <><path d="M8 3h8M9.5 3v14.5a2.5 2.5 0 0 0 5 0V3M9.5 11h5" /><circle cx="12" cy="15" r="1" {...F} /><circle cx="11" cy="13" r=".7" {...F} /></>,
  "time-work": <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z" />,
  "pipes-cisterns": <><path d="M3 8h9a4 4 0 0 1 4 4v2M8 8V5M6 5h4M3 5v6" /><path d="M17.6 19.2a1.6 1.6 0 1 1-3.2 0c0-1.1 1.6-2.8 1.6-2.8s1.6 1.7 1.6 2.8z" /></>,
  "speed-time-distance": <><path d="M3.5 17a8.5 8.5 0 1 1 17 0" /><path d="M12 17l4.5-5.5M6.5 11.5l1.2 1M12 8.5V10M17.5 11.5l-1.2 1" /><circle cx="12" cy="17" r="1.3" {...F} /></>,
  trains: <><rect x="6" y="3" width="12" height="13" rx="3" /><path d="M6 10h12M10 6h4M8.5 21l2-5M15.5 21l-2-5" /><circle cx="9" cy="13" r="1" {...F} /><circle cx="15" cy="13" r="1" {...F} /></>,
  "boat-stream": <><path d="M12 3v11M12 4.5l6 8.5h-6M4 14h16l-2.5 3.5h-11z" /><path d="M2.5 20.5c1.6 1 3.2 1 4.8 0s3.2-1 4.8 0 3.2 1 4.8 0 3.2-1 4.8 0" /></>,
  "number-series": <><circle cx="4.5" cy="17" r="1.6" /><circle cx="10" cy="15.2" r="2.3" /><circle cx="17" cy="12.5" r="3.4" /><path d="M3 6.5h14M14 3.5l3 3-3 3" /></>,
  "areas-volumes": <><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" /><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" /></>,
  "quadratic-equations": <><path d="M3 17.5h18M12 3v18" /><path d="M5.5 5c2.2 10.5 10.8 10.5 13 0" /></>,
  "lcm-hcf": <><circle cx="9" cy="12" r="6" /><circle cx="15" cy="12" r="6" /></>,
  "permutations-combinations": <><path d="M3 7h3c4.5 0 6.5 10 11 10h3M3 17h3c4.5 0 6.5-10 11-10h3" /><path d="M18 4l3 3-3 3M18 14l3 3-3 3" /></>,
  probability: <><rect x="4" y="4" width="16" height="16" rx="3.5" /><circle cx="8.5" cy="8.5" r="1.3" {...F} /><circle cx="15.5" cy="8.5" r="1.3" {...F} /><circle cx="12" cy="12" r="1.3" {...F} /><circle cx="8.5" cy="15.5" r="1.3" {...F} /><circle cx="15.5" cy="15.5" r="1.3" {...F} /></>,
  "linear-arrangement": <><path d="M2 17.5h20" /><circle cx="4.5" cy="11" r="2" /><circle cx="9.5" cy="11" r="2" /><circle cx="14.5" cy="11" r="2" /><circle cx="19.5" cy="11" r="2" /></>,
  "parallel-rows-seating": <><circle cx="5" cy="6" r="2" /><circle cx="12" cy="6" r="2" /><circle cx="19" cy="6" r="2" /><circle cx="5" cy="18" r="2" /><circle cx="12" cy="18" r="2" /><circle cx="19" cy="18" r="2" /><path d="M3 12h18" strokeDasharray="2 2" /></>,
  "circular-and-square-seating": <><circle cx="12" cy="12" r="4.5" /><circle cx="20.3" cy="12" r="1.6" {...F} /><circle cx="16.2" cy="19.2" r="1.6" {...F} /><circle cx="7.8" cy="19.2" r="1.6" {...F} /><circle cx="3.7" cy="12" r="1.6" {...F} /><circle cx="7.8" cy="4.8" r="1.6" {...F} /><circle cx="16.2" cy="4.8" r="1.6" {...F} /></>,
  "circular-seating": <><circle cx="12" cy="12" r="5" /><circle cx="12" cy="3.5" r="1.5" {...F} /><circle cx="20.5" cy="12" r="1.5" {...F} /><circle cx="12" cy="20.5" r="1.5" {...F} /><circle cx="3.5" cy="12" r="1.5" {...F} /><circle cx="18" cy="6" r="1.5" {...F} /><circle cx="6" cy="18" r="1.5" {...F} /></>,
  "square-seating": <><rect x="6" y="6" width="12" height="12" rx="1.5" /><circle cx="3.5" cy="3.5" r="1.5" {...F} /><circle cx="20.5" cy="3.5" r="1.5" {...F} /><circle cx="3.5" cy="20.5" r="1.5" {...F} /><circle cx="20.5" cy="20.5" r="1.5" {...F} /><circle cx="12" cy="2.8" r="1.5" {...F} /><circle cx="12" cy="21.2" r="1.5" {...F} /><circle cx="2.8" cy="12" r="1.5" {...F} /><circle cx="21.2" cy="12" r="1.5" {...F} /></>,
  "triangular-arrangement": <><path d="M12 5l7 12H5z" /><circle cx="12" cy="2.5" r="1.5" {...F} /><circle cx="21.5" cy="19" r="1.5" {...F} /><circle cx="2.5" cy="19" r="1.5" {...F} /><circle cx="17" cy="9.5" r="1.3" {...F} /><circle cx="7" cy="9.5" r="1.3" {...F} /><circle cx="12" cy="20.5" r="1.3" {...F} /></>,
  "designation-puzzles": <><rect x="9" y="2.5" width="6" height="4.5" rx="1" /><rect x="3" y="16.5" width="6" height="4.5" rx="1" /><rect x="15" y="16.5" width="6" height="4.5" rx="1" /><path d="M12 7v4.5M6 16.5v-3h12v3" /></>,
  "direction-sense": <><circle cx="12" cy="12" r="9" /><path d="M14.8 9.2l-1.6 4-4 1.6 1.6-4z" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2" /></>,
  "blood-relations": <><circle cx="12" cy="4.5" r="2.2" /><circle cx="5.5" cy="18.5" r="2.2" /><circle cx="18.5" cy="18.5" r="2.2" /><path d="M12 6.7V11M5.5 16.3V13.5h13v2.8M12 11v2.5" /></>,
  "box-puzzles": <><rect x="7" y="3" width="10" height="6" rx="1" /><rect x="4" y="9" width="16" height="6" rx="1" /><rect x="6" y="15" width="12" height="6" rx="1" /></>,
  "floor-and-flat-puzzles": <><rect x="5" y="3" width="14" height="18" rx="1.5" /><path d="M5 9h14M5 15h14M12 3v18" /></>,
  "month-date-and-day-puzzles": <><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" /><rect x="7" y="13" width="3" height="3" rx=".5" {...F} /></>,
  "reasoning-series-and-miscellaneous": <><path d="M3 19l4-12 4 12M4.5 15h5M14 12h7M18 9l3 3-3 3" /></>,
};

export function TopicIcon({ id, size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {TOPIC_ICON[id] || TOPIC_ICON.basics}
    </svg>
  );
}
