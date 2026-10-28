/* Practice order for the topic list: the 68 topics below come first, in this order (best return for RRB PO Prelims first).
   Every other topic in the bank is an "advanced type" and sits under "Show advanced types".
   Rank 1 is the first line. Move a line to change the order; nothing else needs editing.
   Hint: a 5-question Prelims seating puzzle or DI set takes about 3 to 4 minutes.
   Mixed Graph DI has no topic in the bank yet, so it is not listed. */
export const PRIORITY = [
  // fast marks: calculation and quick reasoning
  "quant--simplification", "quant--approximations", "quant--number-series", "quant--quadratic-equations",
  "reasoning--inequality", "reasoning--syllogism", "reasoning--coding-and-decoding", "reasoning--reasoning-miscellaneous",
  "reasoning--blood-relation", "reasoning--direction-sense", "reasoning--order-and-ranking",
  "reasoning--alphanumeric-series", "reasoning--alphabet-series", "reasoning--number-series",
  // DI tools
  "quant--percentages", "quant--ratio-and-proportion", "quant--averages",
  // puzzles and DI
  "quant--table-chart", "reasoning--month-with-date-based-puzzle", "reasoning--box-based-puzzle",
  "reasoning--parallel-seating-arrangement", "reasoning--circular-seating-arrangement", "reasoning--floor-with-flat-based-puzzle",
  "reasoning--linear-seating-arrangement", "reasoning--unknown-linear-seating-arrangement", "reasoning--floor-based-puzzle",
  "reasoning--designation-based-puzzle", "quant--pie-chart", "quant--bar-graph", "reasoning--sequence-based-puzzle",
  "quant--line-graph", "reasoning--square-seating-arrangement",
  // arithmetic
  "quant--profit-and-loss", "quant--simple-and-compound-interest", "quant--time-and-work", "quant--mixtures-and-alligations",
  "quant--problems-on-ages", "quant--partnership", "quant--mensuration", "quant--time-and-distance", "quant--boats-and-streams",
  "quant--trains", "quant--pipes-and-cisterns", "quant--probability", "quant--permutations-and-combinations", "quant--caselet",
  // occasional
  "reasoning--day-based-puzzle", "reasoning--month-based-puzzle", "reasoning--table-based-puzzle", "reasoning--group-based-puzzle",
  "reasoning--year-with-age-based-puzzle", "reasoning--year-based-puzzle", "reasoning--age-based-puzzle",
  "reasoning--rectangular-seating-arrangement", "reasoning--triangular-seating-arrangement",
  "quant--missing-table-chart", "quant--cumulative-di", "quant--quantity-comparison", "quant--problems-on-numbers", "quant--application-sums",
  // rare in Prelims
  "quant--data-sufficiency", "reasoning--data-sufficiency", "reasoning--unknown-circular-seating-arrangement",
  "reasoning--box-with-stack-based-puzzle", "reasoning--month-with-year-based-puzzle", "reasoning--word-based-puzzle",
  "reasoning--one-mark-puzzle", "reasoning--week-based-puzzle",
];
export const RANK = Object.fromEntries(PRIORITY.map((id, i) => [id, i + 1]));
