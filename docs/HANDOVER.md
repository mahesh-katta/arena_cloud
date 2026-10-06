# Handover (KT) — Arena Dashboard + Playbook

**To build or change a topic, read `PIPELINE.md` next.** It holds the full two-stage process, the original prompt, and the data sources.

Written 6 Oct 2026, at the end of a long build session. Read this first in any new session.

## 1. What exists

| Piece | Where | What it is |
|---|---|---|
| App | `arena_dashboard/` (this repo) | React 19 + esbuild front end, `server.mjs` (Node, no dependencies). `dist/` is committed. Run `node server.mjs`, open `?playbook=1`. |
| Question banks | `data/<bank>/questions.json`, `sets.json` in this repo | `clerk` (1,150 Quant, own-built), `guidely` (12,826), `sreedhar` (8,100). A question's key is `set#q_no`. |
| Charts | `data/guidely/charts`, `data/sreedhar/charts` | Images used by DI questions. Needed. |
| Optional bulk | `../data/guidely/pdfs` (192 MB), `../data/sreedhar/source` (40 MB), `../data.zip`, three PDFs in `../data/` | Raw sources, on the Mac only, not in the repo. Only two optional features use them: the full mock tests (`sreedhar/source`) and the PDF links (`guidely/pdfs`). The server falls back to `../data/` for these; without them those features are simply empty. |
| Progress | `../*_progress.json`, `*_course.json`, `sreedhar_mocks.json` | The user's own progress. Outside the repo on purpose. |
| Playbook source | `data/playbook/source.md` | The Notion page "Bank Clerk Master File" as markdown. It was produced by the user's "Speed Mastery Module" prompt (role: elite Quant faculty, PYQ first, bank second, archetypes with labels Confirmed / Seen once / Bank only). |
| Playbook build | `tools/playbook_import.py` | Parses `source.md`, links question IDs to the banks, merges `tools/guide/*.json`, writes `data/playbook/playbook.json`. |
| Guided lessons | `tools/guide/*.json` | The beginner-friendly lessons written in this session. This is the valuable content. |

## 2. How the Playbook is put together

1. `source.md` gives each topic its **Quick revision** tab: core idea, archetypes, drills, cheat sheet, practice ladder, verification log.
2. A topic that has `tools/guide/<module-id>.json` also gets **Learn, step by step**: a path of short lessons.
3. `basics.json` holds ideas every topic leans on (ratio, LCM, percent, average ...).
4. After editing any guide: `python3 -B tools/playbook_import.py` (prints `guide <id>: N lessons, N questions on the path, N workings`; lines starting `!!` are errors such as a key that is not in the bank).

### Guide JSON shape

```
{ "module": "<id from source.md, or a new id with a 'new' block>",
  "new": {"title","part","after","sample":[...],"revision":[...]},   // only for a topic not in source.md (see trains.json)
  "intro": [md lines], "needs": [basics ids], "after": [md lines],
  "lessons": [ { "id","code","title","plain","needs":[], "teach":[md lines; '|a|b|' rows make a table],
      "example": {"q","steps":[plain strings, no tables],"answer"},
      "check": {"q","options":{a,b,c,d},"answer":"B","why"}, "more":[{tag,q,options,answer,why}],
      "shortcut": {"title","text":[md]},
      "practice": {"bank":"clerk|sreedhar|guidely","keys":["set#q"],"tags":["what this one hides"]} } ],
  "work": { "<bank>": { "set#q": ["line", "line", "last line contains the keyed option text"] } } }
```

Limits to know: one bank per lesson; a key may appear in two lessons (the later file wins for "Open the lesson"); example steps are plain text.

## 3. What has been built (guided)

Quant (practice from the `clerk` bank): ages, simple-compound-interest, percentages, partnership, time-work, speed-time-distance (8 lessons), **trains** (split out, lessons-only topic), profit-loss, boat-stream, mixtures-alligations, simplification.

Reasoning (practice from `sreedhar`): box-puzzles, month-date-and-day-puzzles, parallel-rows-seating, floor-and-flat-puzzles, reasoning-series-and-miscellaneous, linear-arrangement.

Not guided yet: circular-and-square-seating; and every "insurance" variant (two-variable, vacant, mixed facing, three flats, year/age puzzles).

## 4. The method used for every lesson set (keep this standard)

Voice: a polite, clear, concise teacher writing for a beginner. One new idea per lesson. A real paper puzzle as the worked example where possible. About five practice questions per lesson, each a different "disguise" of the same idea, with a tag saying what it hides.

For reasoning puzzles ("reverse engineering"):
1. Find real memory-based papers on the web (adda247 / careerpower PDFs are the richest) and collect full puzzle texts for the clerk exams.
2. Pull the same puzzle type from the banks.
3. Write each puzzle as exact conditions and brute-force it by script. Keep only puzzles with exactly one arrangement. This also settles wording questions (for example "three boxes above" = step of 3; "above" in a flat puzzle = any higher floor).
4. Measure: sizes, which clues appear, what the best opening clue leaves, how many open cases a method reaches.
5. Teach the method the numbers point to, and say honestly what was and was not verified.
6. Every practice working must end on the keyed option; a script checks this. Sets whose key contradicts the clues are dropped and listed.

Findings worth keeping are in each guide's `intro` table.

## 5. Known gaps and debts

- Guidely's reasoning sets were not studied; reasoning practice is Sreedhar only.
- Quick revision tabs for the reasoning topics still show the older notes (for example "find a fixed clue first"), which the guided lessons improve on.
- Requested but not done: split **Simple Interest** and **Compound Interest** into two topics (do it the way `trains.json` was split from `speed-time-distance.json`); add topics that are not in the Notion file (Averages was skipped there; Ratio, Number Series, Quadratic, DI, Approximation, Mensuration, Pipes exist in the `clerk` bank; Syllogism, Inequality, Blood relation, Direction, Coding, Circular/Square seating exist in the other banks).
- The app code grew by accretion (Playbook.jsx is large). A rebuild is planned; the content and data formats above are what must be preserved.

## 6. For a rebuild: the minimum that must survive

- `tools/guide/*.json` and `tools/playbook_import.py`
- `data/playbook/source.md` (and `playbook.json`, which can be regenerated)
- `data/<bank>/questions.json` + `sets.json` for clerk, guidely, sreedhar
- `data/<bank>/charts/`
- The user's progress files, if progress should carry over

Not needed by the app: `data/guidely/pdfs`, `data/sreedhar/source`, `data.zip`, the three PDFs.

## 7. Working on the Mac from a cloud session

The sandbox cannot reach GitHub over SSH; the user runs `git push`. Bank data lives only on the Mac, so analysis of the banks runs there (or a small extract is staged, used, and deleted).

## 8. One copy of the data

`data/` inside this repo is the only copy the app and the importer use, on every machine. After rebuilding the playbook, commit `data/playbook/`. The old folder beside the repo (`../data/`) now only supplies the optional bulk raw sources. Progress files (`<bank>_progress.json`, `<bank>_notes.json`) are written beside the repo, never inside it. Keep this repository private: the Guidely and Sreedhar banks are third-party material.
