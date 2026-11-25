# How to add anything new

Runbooks for every change to the data. All of them go through `./arena`: a dry run first (nothing real changes), then
the same command with `--apply` (snapshot first, undo with `./arena undo`). The rules behind them are in `CLAUDE.md`
and `docs/data-layout.md`.

## Before any apply: read the dry run

| Line | What to check |
|---|---|
| `guard <owner>: … files changed · field pp N, field same N, questions added N …` | Only what you expected changed. For an import: paper links (`pp`), repeat links (`same`, `twins`), `ns_card_tier`, added questions. Nothing else on existing questions. |
| `app files that would change: N` | The files the app will see differently (same-content rewrites are counted apart). |
| `decisions that would change` | e.g. `paper_batches.json` when papers join, `mock_ids.json` when a full mock gets its id. |
| `raw zip: +N files` | The raw files added to `../arena_raw.zip`. |
| `would FAIL · guard STOPPED …` | Nothing was changed. Read the listed reasons; fix the cause. Never widen an owner to pass. |

## 1. New PYQ papers, sectional days or Booster drills (tests from the provider's API)

1. Download each test as JSON, exactly as the API sends it (the full test, `ensure_ascii=False`). How the ids, tokens and
   download calls work is in the maintainers' notes; never store or print the API key.
2. Name the files:
   - PYQ: any name; the test's own `name` field identifies it (`… Memory Based Mock Test (Held on 8th October 2023) Slot 1`).
   - Sectional / Booster: `<course> - Day <n> - <section>.json`, e.g. `IBPS RRB PO Prelims 2026 - Day 48 - Reasoning.json`.
3. Dry run: `./arena import pyq <files…> --date <download day>` (or `sectional` / `booster`).
   - A test already in the app is skipped. A new course or exam becomes a new group by itself.
   - Linked pictures are downloaded once (`../arena_runs/downloads`); one identical to a saved picture is reused.
   - Mock ids continue from the highest: `PYQ-nnn`, `SEC-nnnn`, `BST-nnnn`. Never renumber.
4. Read the dry run (table above), then the same command with `--apply`.
5. If it says `sets waiting for your topic: N`, see §4.

The reader is `build_tools/importers/api_tests.py`: the original builders' code, plus the later fixes (local pictures,
`[image unavailable]`, ordinals, notation, no provider names). `python3 -s build_tools/importers/api_tests.py prove <kind>`
rebuilds every existing test of that kind from the raw zip and must print `IDENTICAL` (64 known hand fixes are listed in
`api_tests_known.json`). Run it after any change to the reader.

## 2. New full mocks (captured papers + printed booklets)

1. The exam must exist in `build_tools/mockimport/groups.py`. A new exam: add one entry (`raw` folder
   `arena_raw/full_mocks/<exam slug>`, `id` `full-<exam slug>`, name, exam, stage, a new 3-letter id `prefix`).
   That is a code change: show it to the user first.
2. Files: `papers-batch-NN.json` (next free NN), `reports-submitted.json`, `booklet-<exam id>.pdf`.
3. Dry run: `./arena import full:<group id> <files…> --date <capture day>`. Booklets are checked against the captured
   answers (`decisions/mock_keys.json`); a paper keeps its id forever (`decisions/mock_ids.json`).
4. Read the dry run, then `--apply`; then §4 if sets wait.

## 3. PDF papers (not built yet)

Write a reader in `build_tools/importers/` that turns the PDF (and its pictures) into the app's paper format (see
`api_tests.py` for the fields), add it as a kind in `run_import.py`, prove it on papers whose answers are known, and
document it here. Until then, stop and tell the user.

## 4. Sets the classifier was unsure of

1. `./arena review` writes `../arena_runs/review/waiting.md` (each set's text, the classifier's guess, the topics it may
   take) and `answers.json` (one entry per set, `topic` pre-filled with the guess).
2. Edit `answers.json`: a Practice topic of the set's section, or `"unsure": true` (leave it waiting), or
   `"broken": true` (keep it out). Only the user decides these, or the assistant when the user asks (then say so).
3. `./arena review --save <answers.json>` (dry run), then with `--apply`. Answers go to `decisions/you.json` and beat
   every machine guess.

## 5. Re-run a tool (tags, filters, cards)

`./arena tools` lists them. `./arena run <tool>` then `--apply`. Each tool's owner limits what it may change
(`registry.json`). Tools that rebuilt things from scratch are retired (`registry.json` `retired`, with the reason).

## 6. Something new that is not a paper

| New thing | What to do |
|---|---|
| A tag (a label on questions) | a tag file `data/source/tags/<name>.json` + its fields under `tags` in `registry.json`; produced by a tool registered in `tools` with an owner allowed only those fields |
| A filter in Practice | the topic file's `filters` (written by the Practice build: `filters_for` in `build_tools/practice/build.py`, Number Series in `numberseries/cards.py`) |
| A Practice topic | add it to the Practice build's topics and cards, then a dry run of `practice` |
| Modules lessons | the lessons in `data/source` are the truth: add questions to existing lessons append-only; never regenerate them |
| State a tool must remember | a file in `data/source/decisions`, listed in `registry.json` `decisions` with its owner(s) |
| A new kind of raw input | into `../arena_raw.zip` with `rawzip.add()`, under `arena_raw/<kind>/<exam>/<date>/…` |

Every one: dry run, read it, `--apply`, update this file and `docs/data-layout.md` in the same change.

## 7. When something goes wrong

| Message | Meaning |
|---|---|
| `changes are waiting outside the chain` | Something edited the data by hand. `./arena check` shows what; ask the user before keeping or dropping it. |
| `guard STOPPED` | The change touched what its owner may not change. Nothing was kept. |
| `did not pass: putting everything back` | The apply failed; the snapshot was restored. `./arena history` shows it. |
| `question / option pictures could not be downloaded` | The import stopped before changing anything; retry later or ask the user. |
| a wrong apply that passed | `./arena undo` (the last 5 applies can be undone, newest first). |
