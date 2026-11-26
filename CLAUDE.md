# Arena: rules for any agent working here

A private bank-exam practice app (React in `src/`, a dependency-free `server.mjs`) and its question data
(`data/`, never in git). These rules are firm. If a task seems to need breaking one, stop and ask the user.

## The one rule: change data only through `./arena`

- Never edit `data/bank`, `data/mocks`, `data/speed`, `data/booster`, `data/course`, `data/app` or `data/source` by hand,
  and never run a builder script directly. Use `./arena` (code in `build_tools/arena.py`):
  - `./arena tools` · `./arena status` · `./arena check [--deep]` · `./arena history`
  - `./arena run <tool>`: a **dry run** on a sandbox copy. Read what it reports, then `./arena run <tool> --apply`.
  - `./arena import <kind> <files…> [--date YYYY-MM-DD] [--apply]`: new papers (see `docs/how-to-import.md`).
  - `./arena review` / `./arena review --save <answers.json> [--apply]`: sets the classifier was unsure of.
  - `./arena undo`: puts back the state from before the last applied run (snapshots: `../arena_runs/snapshots`, last 5).
- Every apply takes a snapshot, runs the chain (guard → import → compile → check → export) and puts everything back by
  itself on any failure. A "guard STOPPED" means the change touched something its owner may not change: read why, fix
  the cause, never widen an owner's rights to make it pass.

## Where things live

| What | Where |
|---|---|
| Questions once, tags, paper/lesson views | `data/source/questions`, `tags`, `views` (the truth) |
| Your decisions and import state | `data/source/decisions/*.json`, each with an owner in `data/source/registry.json` |
| Tools, owners and what each may change | `data/source/registry.json` (`tools`, `owners`, `decisions`, `retired`) |
| What the app reads | `data/app` (compiled; `ARENA_APP_DATA=data/app`), `data/images`, `data/notes` |
| Everything raw (papers, booklets, original pictures) | `../arena_raw.zip` only, by kind/exam/date; add with `build_tools/utils/rawzip.py` `add()` |
| Live tools (the code `./arena` runs) | `build_tools/` top level: `arena.py`, `layout`, `importers`, `mockimport`, `practice`, `numberseries`, `classifier`, `utils` |
| Research tools (pattern maps, solvers, audits, old experiments; not used by the app or `./arena`) | `build_tools/research/` |
| Builder working files (labels, caches, reports, research outputs, reference maps) | `build/` (`practice`, `classifier`, `research`, `reference`); never read by the app |
| How it all fits | `docs/data-layout.md` · runbooks: `docs/how-to-import.md` |

## Never

- Recompute what is stored: classifier labels, Method/Level, mock ids, the paper join order (`decisions/paper_batches.json`)
  and every decision are state. New questions get new values; existing ones keep theirs.
- Rebuild anything from scratch: imports only add. An existing question gains paper links and repeat links
  (`pp`, `same`, `twins`, `ns_card_tier`); its topic changes only through the user's decisions (`./arena review`).
- Leave raw files loose in the project, or put provider names in what the app shows (no branding).
- Put anything but app data in `data/`: it holds only `app`, `source`, `bank`, `mocks`, `speed`, `booster`, `course`,
  `images`, `notes`. Working files go to `build/`, research code to `build_tools/research/`.
- Answer questions in the live app (port 8001) or touch `../arena_dashboard_progress.json`: preview clicks write the user's
  real progress. Test on a test server with `ARENA_PROGRESS=<copy>` (see `.claude/launch.json`).
- Run Python builders with `python3 -I`: it ignores `PYTHONHASHSEED`, and the builds are only repeatable with a fixed seed.
  `./arena` sets `PYTHONHASHSEED=0` and runs `python3 -s`.
- Commit or push unless the user asks. Note: `build_tools/`, `build/` and `data/` are gitignored.

## Adding something new

Follow `docs/how-to-import.md`. In short: a new paper source gets a reader in `build_tools/importers/` with a `prove`
that rebuilds today's papers identically; a new full-mock exam gets an entry in `build_tools/mockimport/groups.py`;
a new tool gets an entry in `registry.json` `tools` with an owner whose rules are as narrow as possible; a new kind of
state gets a file in `data/source/decisions` listed in `registry.json` `decisions` with its owner. Every change is a
dry run first, then `--apply`, and the docs are updated in the same change.

The user prefers short, plain, structured answers: confirm in their words, yes/no first, a table where it helps.
