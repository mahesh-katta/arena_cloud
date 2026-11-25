# Data layout

Agreed 24 Nov 2026. Steps 1–3 below are built and tested; the later steps are listed at the end.

## The idea

- **Each question is stored once.** Today 82,456 mock questions also sit in Practice as a second copy. In the new layout each id is stored once and every place that shows it points at it.
- **Labels live in tag files,** one file per kind of label.
- **Papers, lessons and drills are lists of ids** ("views").
- **Every builder runs through one chain** that checks it changed only what it owns.
- **One compile step** writes the only data the app reads, including light files for fast topic pages.

## Folders

| Folder | What it holds |
|---|---|
| `data/<store>` (`bank`, `mocks`, `speed`, `booster`, `course`) | The working copy. Builders write here and older tools read here. After every chain run it equals `data/app`. |
| `data/source/questions/<home>.json` | Every question once (178,689). Home = its Practice topic, or `mocks--<group>`, `speed--<topic>`, `booster--<file>` for a question found only there. |
| `data/source/tags/<name>.json` | `{id: {field: value}}`. One file per kind of label: `classifier`, `papers`, `repeats`, `method`, `level`, `subtopic`, `rule`, `series`, `syllogism`. |
| `data/source/views/<store>/<file>.json` | The rest of each app file, plus `_q`, its questions in order. An entry is an id, or `{id, set, drop}` when that copy differs from the stored question (a mock's own wording, for example). |
| `data/source/decisions/<name>.json` | Your decisions and the reviewers' answers: `you` (your answers, they win), `hand` (hand checks you asked for), `agents` (review agents), `allowed` (what each could choose), `broken` (reported broken), `method` (Arithmetic Method by hand). Builders read them; the app never does. Kept unchanged by every chain run. |
| `data/source/registry.json` | The tag files and the fields each owns, the decisions files, and the **owners**: what each builder may change. |
| `data/source/manifest.json` | Fingerprints of the last chain run, used to catch changes made outside the chain. |
| `data/app/` | Made by compile: the same files the app reads today, plus `lite/`. |
| `data/app/lite/bank/<topic>.json` | The topic without question text, options, explanation, passage or pictures. Every filter, chip and count works from it. |
| `data/app/lite/bank/<topic>/<n>.json` | Chunk n: the text of questions n×200 to n×200+199. |
| `data/app/lite/where.json` | For every Modules question, the file that serves it. Replaces `course/idmap.json` (see below). |

Pictures (`data/images`) and notes (`data/notes`) don't move.

## Commands

```bash
python3 -I build_tools/layout/layout.py run <owner> -- <builder command>
```

Runs a builder through the chain, for example `layout.py run practice -- python3 -I build_tools/practice/build.py --write`. Steps:

1. **Guard:** every change the builder made must be allowed for that owner. Otherwise it stops and puts the builder's files back.
2. **Import:** `data/<store>` → `data/source`.
3. **Compile:** `data/source` → `data/app`.
4. **Check:** `data/app` must equal what the builder wrote. Otherwise it puts the old `data/source` back.
5. **Export:** `data/app` → `data/<store>`.

- `layout.py absorb <owner>`: the same chain for a builder already run by hand.
- `layout.py all`: after editing `data/source` by hand (a new tag file, for example), compile and export.
- `layout.py check`: confirms `data/app` equals `data/<store>` and nothing changed outside the chain.

Each command refuses to start when something changed outside the chain, so nothing is silently overwritten.

## Owners (`registry.json`)

| Owner | May change |
|---|---|
| `practice` | Practice topic files: add and remove questions, the file header, and the labels `pp r1 how score also subtopic topic section exam_stage method calc_level twins same num shape skill ruled`. Also `bank/index.json` and `bank/papers.json`. |
| `twins` | `twins` on Practice questions |
| `numberseries`, `quadratic`, `syllogism`, `inequality` | Everything in their own topic file, its row in `bank/index.json` (Number Series also its Modules plan) |
| `mockimport` | `mocks/*`, `course/idmap.json` |
| `course` | `course/*` (Modules lessons) |
| `crosstab` | `bank/index.json` |
| `admin` | Anything: for a deliberate hand fix |

**Locked:** the text, options, answer, explanation, passage and pictures of an existing question. Only an owner given `content` may change them (the four topic builders in their own topic, and `mockimport` in mocks).

## Adding things

- **A new tag** (for example Difficulty): write `data/source/tags/difficulty.json` and add `"difficulty": ["difficulty"]` under `tags` in `registry.json`. Then run `layout.py all`. A tag file that isn't registered, names an unknown id, or sets a field it doesn't own stops the compile.
- **A new builder:** add an owner to `registry.json` with the files and fields it may change, then run it with `layout.py run <owner> -- …`.
- **A new paper:** the import script writes the paper's file in `data/mocks`, run as `layout.py run mockimport -- …`. Then `practice` runs, so the new questions get topics and labels.

## where.json instead of idmap

`where.json` is built from the files themselves, using one rule:

- A question that came into Practice from a mock paper (round 1, `r1`) is served from its first mock copy.
- Every other question is served from the first file that holds it: Practice, then speed, then mocks.

Measured against `course/idmap.json`: 29,123 of 29,123 lesson questions give the same answer. The server reads `where.json` whenever `data/app` is in use and falls back to `idmap.json` otherwise.

## The light Practice files

- A topic opens from its light file. The question on screen comes from its 200-question chunk, and the next and previous questions' chunks are fetched ahead, so "Next" never waits.
- Caselet goes from 8.5 MB to 1.3 MB, and all topics together from 186 MB to 49 MB. Number Series stays at 5.2 MB because of its old labels, which the card rebuild replaces.
- Without a lite folder (a server reading the old folders), the app uses the full topic file as before.

## How it was tested (24 Nov 2026)

The reference was the original server: the committed `server.mjs` and committed app, reading a backup of the data taken before the chain (`~/projects/arena/backups/2026-11-24-before-layout-chain`).

- **Files:** all 211 app files identical. Planted changes were caught.
- **Routes:** 5,943 routes, 0 differences, both on the new server reading `data/app` (Modules through `where.json`) and on the new code reading the old folders. That covers every data file, all 3,670 mock tests, all 2,057 Modules lesson fetches and the error cases.
- **Light files:** all 104,155 Practice questions in 103 topics, rebuilt from the light file plus chunks, are identical to the full files.
- **Pages:**
  - All 103 Practice topics, with the first 4 questions each: same text.
  - 6 topics with the filter panel open (counts included): same.
  - Jumps to far questions (Number Series Q4000, Simplification Q5999, Syllogism Q1500): same.
  - Home, Practice list, Modules topic and lesson pages, Mock Tests, Speed, Mistakes, Booster: same.
  - No console errors, and "Next" never showed a loading screen.
- **Guard:**
  - An answer changed by `practice` was refused and put back.
  - A Quant topic changed by `syllogism` was refused.
  - A hand edit followed by `all` was refused instead of overwritten.
  - An allowed subtopic change went through.
  - An unregistered tag file was refused; a registered one appeared on the question; removing it restored everything.
  - The real `twins.py --apply` ran through the chain.
  - After all of these, the data equals the backup.
- **Progress:** each test server used its own copy of the progress file, and the real file was untouched.

## Server settings

Both are optional. When they're unset, the server behaves exactly as before.

- `ARENA_APP_DATA=data/app` reads question data (`bank`, `mocks`, `speed`, `booster`, `course`, `lite`) from `data/app`.
- `ARENA_PROGRESS=<file>` uses another progress file (for testing).

The always-on app (PM2 `arena_station`, port 8001) runs with `ARENA_APP_DATA=data/app` since 24 Nov 2026. A builder's output reaches the app only through the chain (`run` or `absorb`). To go back to the old folders:

```bash
ARENA_APP_DATA= pm2 restart arena_station --update-env && pm2 save
```

## Number Series cards (25 Nov 2026)

`build_tools/numberseries/cards.py` gives every Number Series question its Series type, Branch, card and Tier, and writes the Modules lessons: units are the Groups, one lesson per card (never split), in Gold / Complete / Perfection tabs. Practice filters: Series type · Group · Branch · Tier. The Practice build runs its tagging too; the lessons come from:

```bash
python3 -I build_tools/layout/layout.py run numberseries -- python3 -I build_tools/numberseries/cards.py --write
```

The server checks each cached file's time and size, so a chain run is served without a restart.

## The solved rule (25 Nov 2026)

Outside mocks, Booster and Speed drills, a question counts as solved once it or any copy of it was answered, right or wrong. Compile writes `lite/repeats.json` (each question's other ids, from `same` and `twins`). Practice and Modules lessons show solved questions as done, "Next" skips them, a click still opens one, and a lesson opens on its first unsolved question.

## The raw store (25 Nov 2026)

Everything raw lives in one place: `../arena_raw.zip`, in folders by kind, exam and capture date, for example `arena_raw/full_mocks/ibps-rrb-po-prelims-2026/2026-11-20/papers/papers-batch-08.json` and `…/booklets/booklet-25301.pdf`. Builders read it through `build_tools/utils/rawzip.py`; new raw files are appended with `rawzip.add()`, which reads every member back and compares it byte for byte. `data/mock_import` (129 files) was merged on 25 Nov: 121 raw files into the zip, the importer's state into decisions, the paper-pattern analysis into `docs/full-mock-paper-patterns.*`. `data/images` stays as the app's working copy of pictures.

## Decisions (25 Nov 2026)

Your choices used to sit in `data/practice_build/review` and `audit` (69 files). They are now files in `data/source/decisions`, listed in `registry.json` under `decisions` with an owner; a file not listed there stops the chain. A builder run through the chain may change only the decisions it owns (`mockimport` owns `mock_ids`, `mock_keys`, `mock_topics`; the review files belong to `review`); any other change is refused and put back. Moving them was proved by running the Practice build and Method twice (old files vs new) with the same seed: 110 of 110 outputs identical.

Note: the Practice build is only repeatable with a fixed seed (`PYTHONHASHSEED=0`, run without `-I`, which ignores it). Without one, set order can move a few questions between runs.

## Later steps (not built yet)

1. Workbench folders move to `build/`.

Dropped (24 Nov 2026): filter profiles; folding `data/quant_maps` into the chain (builder input only); retiring `course/idmap.json` (kept as the fallback when the server runs without `data/app`).
