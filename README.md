# Arena

A private practice app for bank exams (IBPS, SBI, RRB, LIC, RBI …): topic-wise Practice, Modules (lessons), Mock
Tests, Speed drills, Booster and a mistakes list. Single user, runs on this Mac.

## The four things to know

| Thing | Where | In one line |
|---|---|---|
| The app | `src/` (React), `server.mjs` (no dependencies), `dist/` (built) | `npm run build` after changing `src/`; the always-on copy runs under PM2 on port 8001 |
| The data | `data/` | the truth is `data/source`; the app reads `data/app`; nothing here is edited by hand |
| The one tool | `./arena` | every data change: `./arena run <tool>` (dry run) then `--apply`; new papers: `./arena import`; `./arena undo` |
| Raw inputs | `../arena_raw.zip` | every paper, booklet and original picture ever received |

## Where to start

- **An agent (or a new person):** read `../CLAUDE.md` (housekeeping: where things go, no provider names, what to write)
  and `CLAUDE.md` (data rules). They are short and they are the rules.
- **Adding papers or anything new:** `docs/how-to-import.md` (step by step, for every case).
- **How the data is organised and why:** `docs/data-layout.md`.
- **Your progress** lives in `../arena_dashboard_progress.json` and belongs to the app alone.

## Repositories

- This repo: the app (code and docs). It never holds question data.
- `arena_data` (private): `data/source`, `data/notes`, `data/images` and `build_tools`, saved with `./arena save`. On a new
  machine, `./arena rebuild` makes `data/app` from `data/source`. The question material is third-party: keep it private.
