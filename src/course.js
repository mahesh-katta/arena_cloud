/* The course: topic order, how often the papers ask it, how hard it starts,
   and the topic to finish first. Lessons come from the playbook. */
export const ASK = [
  { t: "Asked a lot", c: "ask0" },
  { t: "Sometimes", c: "ask1" },
  { t: "Rarely", c: "ask2" },
];
export const LEVEL = ["", "Easy start", "Medium", "Harder"];

const ROWS = [
  ["grammar", 0, 1],
  ["vocabulary", 0, 1],
  ["simplification", 0, 1],
  ["approximations", 1, 1, "simplification"],
  ["percentages", 0, 1],
  ["ratio-proportion", 0, 1],
  ["averages", 0, 1],
  ["ages", 0, 2],
  ["partnership", 0, 2],
  ["profit-loss", 0, 2],
  ["simple-interest", 0, 1],
  ["compound-interest", 0, 2, "simple-interest"],
  ["simple-compound-interest", 0, 3, "compound-interest"],
  ["mixtures-alligations", 0, 2],
  ["time-work", 0, 2],
  ["pipes-cisterns", 1, 2, "time-work"],
  ["speed-time-distance", 0, 2],
  ["trains", 0, 2, "speed-time-distance"],
  ["boat-stream", 0, 2, "speed-time-distance"],
  ["number-series", 0, 2],
  ["areas-volumes", 0, 1],
  ["quadratic-equations", 2, 1],
  ["lcm-hcf", 2, 1],
  ["permutations-combinations", 2, 3],
  ["probability", 2, 3, "permutations-combinations"],
  ["linear-arrangement", 0, 1],
  ["parallel-rows-seating", 0, 2, "linear-arrangement"],
  ["circular-seating", 0, 2, "linear-arrangement"],
  ["square-seating", 1, 2, "circular-seating"],
  ["triangular-arrangement", 2, 3, "circular-seating"],
  ["designation-puzzles", 1, 2, "linear-arrangement"],
  ["blood-relations", 0, 1],
  ["direction-sense", 1, 1],
  ["box-puzzles", 0, 2],
  ["floor-and-flat-puzzles", 0, 2],
  ["month-date-and-day-puzzles", 0, 2],
  ["reasoning-series-and-miscellaneous", 0, 1],
];

export const COURSE = ROWS.map(([id, ask, level, after], i) => ({ id, ask, level, after, rank: i }));

export const ORDERS = [
  { id: "suggested", name: "Suggested (parent topics first)" },
  { id: "asked", name: "Most asked in papers" },
  { id: "easy", name: "Easiest first" },
];

export function ordered(list, how) {
  const a = [...list];
  if (how === "asked") a.sort((x, y) => x.ask - y.ask || x.rank - y.rank);
  if (how === "easy") a.sort((x, y) => x.level - y.level || x.rank - y.rank);
  return a;
}
