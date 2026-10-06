# Arena Cloud

The course-style successor to `arena_dashboard` (kept as the backup). Lessons first; the app comes later.

Read `docs/HANDOVER.md`, then `docs/PIPELINE.md`. The lesson format (`tools/guide/*.json`) is unchanged.

```
python3 -B tools/playbook_import.py     # rebuilds data/playbook/playbook.json; '!!' lines are errors
```

Keep this repository private: the Guidely and Sreedhar banks are third-party material.

## Quant goal: 23 topics

| # | Topic | Status | Practice bank |
|---|---|---|---|
| 1 | Ages | built (5 workings missing) | clerk |
| 2 | Simple Interest | to split out | clerk |
| 3 | Compound Interest | to split out | clerk |
| — | Simple & Compound Interest | built; kept for mixed SI/CI lessons | clerk |
| 4 | Percentages | built | clerk |
| 5 | Partnership | built | clerk |
| 6 | Time & Work | built | clerk |
| 7 | Time, Speed & Distance | built | clerk |
| 8 | Trains | lessons only (5 workings missing, no Stage A) | clerk |
| 9 | Profit & Loss | built | clerk |
| 10 | Boats & Streams | built | clerk |
| 11 | Mixtures & Alligations | built | clerk |
| 12 | Ratio & Proportion | new | clerk, sreedhar, guidely |
| 13 | Averages | new | clerk, sreedhar |
| 14 | Pipes & Cisterns | new | clerk, sreedhar, guidely |
| 15 | Areas & Volumes | new | clerk (mensuration), sreedhar, guidely |
| 16 | LCM & HCF | new; ~9 bank questions, rest written and script-checked | sreedhar, guidely, own |
| 17 | Approximations | new | clerk, sreedhar |
| 18 | Permutations & Combinations | new | guidely (129, with solutions) |
| 19 | Probability | new | guidely (180, with solutions) |
| 20 | Data Interpretation | new | clerk, sreedhar, guidely |
| 21 | Simplification | built | clerk |
| 22 | Number Series | new | clerk |
| 23 | Quadratic Equations | new | clerk |

Reasoning: six puzzle topics built (see HANDOVER).

## Working rules

- `main` holds the accepted state. Each topic is built on its own branch and merged after review.
- Partly built topics are completed, not redone. Combined topics stay; split topics get their own lessons, extracted from the combined one plus new lessons for the gaps.
