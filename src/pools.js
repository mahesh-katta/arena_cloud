/* Which bank topics feed each course topic's "Practise more" pool.
   Names are matched case-insensitively, with any leading "12. " dropped. */
const SICI = ["SI & CI"];
export const POOLS = {
  "simplification": ["Simplification"],
  "approximations": ["Approximation"],
  "percentages": ["Percentage"],
  "ratio-proportion": ["Ratio and proportion"],
  "averages": ["Average"],
  "ages": ["Ages"],
  "partnership": ["Partnership"],
  "profit-loss": ["Profit and loss"],
  "simple-interest": SICI,
  "compound-interest": SICI,
  "simple-compound-interest": SICI,
  "mixtures-alligations": ["Mixture and alligation"],
  "time-work": ["Time and work"],
  "pipes-cisterns": ["Pipes and cistern", "Pipes and cisterns"],
  "speed-time-distance": ["Time speed and distance", "Time, Speed and Distance"],
  "trains": ["Trains"],
  "boat-stream": ["Boats and stream", "Boats and streams"],
  "number-series": ["Number Series", "Missing number series", "Wrong number series"],
  "areas-volumes": ["Mensuration"],
  "quadratic-equations": ["Quadratic equation", "Quadratic equations"],
  "lcm-hcf": ["LCM and HCF"],
  "permutations-combinations": ["Permutation and combination"],
  "probability": ["Probability"],
  "linear-arrangement": ["Linear arrangement"],
  "parallel-rows-seating": ["Parallel row arrangement"],
  "box-puzzles": ["Box puzzle"],
  "floor-and-flat-puzzles": ["Floor puzzle", "Floor with flat puzzle"],
  "month-date-and-day-puzzles": ["Month puzzle", "Month with date puzzle", "Month with year puzzle", "Day puzzle", "Year puzzle"],
  "circular-and-square-seating": ["Circular arrangement", "Square arrangement"],
  "circular-seating": ["Circular arrangement"],
  "square-seating": ["Square arrangement", "Rectangular arrangement"],
  "triangular-arrangement": ["Triangular arrangement", "Pentagonal arrangement", "Hexagonal arrangement"],
  "designation-puzzles": ["Designation puzzle"],
  "direction-sense": ["Direction sense"],
  "blood-relations": ["Blood relation"],
  "reasoning-series-and-miscellaneous": ["Alphabet series", "Alphanumeric / mixed series", "Number series (reasoning)", "Miscellaneous (reasoning)"],
};

/* The split interest topics share the SI & CI sets; Guidely names its sets,
   so those are narrowed to the matching kind. */
export const SPLIT = {
  "simple-interest": /simple interest|months|doubles|^SI and CI- Based on (ratio|variable|total|percentage|difference|averages)/i,
  "compound-interest": /compound|half yearly|quarterly|1st, 2nd|Both/i,
};
