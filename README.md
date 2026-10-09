# Arena Cloud

The course-style successor to `arena_dashboard` (kept as the backup).

## Run the course app

```
npm install          # once
node server.mjs      # then open http://localhost:8000 (phone: http://<this computer's IP>:8000)
npm run build        # only after changing src/; dist/ is committed
```

Progress is saved beside the repo in `../arena_cloud_progress.json`, so a pull never touches it.

Four tabs (a sidebar on a laptop, a bottom bar on a phone):

- **Course**: Quant / Reasoning, ordered by suggested (parent topics first), most asked, or easiest. Each topic has Lessons (one suggested, none locked), Quick revision and Papers. A lesson runs Learn, Example, Check, Practice (the lesson's disguise questions, with a running timer), Done; every step can be skipped or opened directly; "Mark as done" and "Skip lesson" move on. Topics show as a grid or a list. After an answer the shortcut working and, for Guidely, its own solution are both shown.
- **Practice**: pick a source (all, previous papers, clerk graded sets, Guidely, Sreedhar, or My mistakes), then a topic, then work question by question with a type filter. `src/pools.js` maps topics to bank sets.
- **Mocks**: coming soon.
- **Settings**: light / dark, reset one topic, reset all progress.

Read `docs/HANDOVER.md`, then `docs/PIPELINE.md`. The lesson format (`tools/guide/*.json`) is unchanged.

```
python3 -B tools/playbook_import.py     # rebuilds data/playbook/playbook.json; '!!' lines are errors
```

Keep this repository private: the Guidely and Sreedhar banks are third-party material.

## Quant: 23 topics

| # | Topic | Stage A (paper evidence) | Lessons |
|---|---|---|---|
| 1 | Ages | yes | 9 |
| 2 | Simple Interest | in Simple & Compound Interest | 7 |
| 3 | Compound Interest | in Simple & Compound Interest | 8 |
| - | Simple & Compound Interest (combined) | yes | 10 |
| 4 | Percentages | yes | 10 |
| 5 | Partnership | yes | 9 |
| 6 | Time & Work | yes | 12 |
| 7 | Time, Speed & Distance | yes | 8 |
| 8 | Trains | in Speed, Time & Distance | 9 |
| 9 | Profit & Loss | yes | 12 |
| 10 | Boats & Streams | yes | 10 |
| 11 | Mixtures & Alligations | yes | 11 |
| 12 | Ratio & Proportion | yes | 10 |
| 13 | Averages | yes | 9 |
| 14 | Pipes & Cisterns | in Time & Work | 8 |
| 15 | Areas & Volumes | yes | 10 |
| 16 | LCM & HCF | yes (no paper question found) | 8 |
| 17 | Approximations | in Simplification | 6 |
| 18 | Permutations & Combinations | yes | 9 |
| 19 | Probability | yes | 8 |
| 20 | Data Interpretation | not started (skipped for now) | - |
| 21 | Simplification | yes | 14 |
| 22 | Number Series | yes | 8 |
| 23 | Quadratic Equations | kept short | 4 |

Reasoning: 13 topics with guided lessons, each with a Stage A module in Part B of `data/playbook/source.md`:
Floor and Flat, Month/Date/Day, Box, Linear, Parallel Rows, Series and Miscellaneous, Circular Seating, Square Seating,
Triangular Arrangement (bank only: none found in papers), Designation Puzzles, Direction Sense and Blood Relations.
The combined Circular and Square Seating module (Module 2) is kept as revision notes.

Checks: `python3 -B tools/check_guides.py` (every practice question exists, has a working, and the working ends on the keyed option).

## Working rules

- `main` holds the accepted state. Each topic is built on its own branch and merged after review.
- Partly built topics are completed, not redone. Combined topics stay; split topics get their own lessons, extracted from the combined one plus new lessons for the gaps.
