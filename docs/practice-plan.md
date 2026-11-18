# Practice plan

Agreed on 18 Nov 2026 and built the same day (round 1, section 9). Check every Practice change against this page, and update it when a decision changes.

**What Practice is for:** it's the battleground. It holds every question from every source, past and future, each in its own topic, with filters to pick what you want. Practice never ranks or drops questions; that's the job of Modules, which is planned separately.

---

## 1. Topic list page

- **Five cards** replace the old section cards: Arithmetic, Seating & Puzzles, Score Cracker, DI and English.
- **A topic goes into the card for its kind**, whether or not Modules has lessons for it.
- **Search** by topic or subtopic stays.
- **No Sort filter and no Type (DI or single) filter.** The cards already split those.
- **Default order inside a card:** the 68 priority topics first, in priority order, then the other 35, A–Z.
- **Custom order:** the user drags topics into their own order, with a "Back to default" button.
  - The order is saved per profile (exam + stage) in the progress file.
  - It survives refreshes and "Reset all".
- **The Source filter (section 3) sits here**, before a topic is picked.

## 2. Which topics go in which card (103 topics)

**Arithmetic (18)**: Percentages, Ratio and Proportion, Averages, Profit and Loss, Simple and Compound Interest, Time and Work, Mixtures and Alligations, Problems on Ages, Partnership, Mensuration, Time and Distance, Boats and Streams, Trains, Pipes and Cisterns, Probability, Permutations and Combinations, Problems on Numbers, Application Sums.

**Seating & Puzzles (46)**
- Priority, in order: Month with Date Based, Box Based, Parallel Seating, Circular Seating, Floor With Flat Based, Linear Seating, Unknown Linear Seating, Floor Based, Designation Based, Sequence Based, Square Seating, Day Based, Month Based, Table Based, Group Based, Year With Age Based, Year Based, Age Based, Rectangular Seating, Triangular Seating, Unknown Circular Seating, Box with Stack Based, Month with Year Based, Word Based, One Mark Puzzle, Week Based.
- Then: Arrangement Based Seating, Card Based Diagram Seating, Coded Type Puzzle, Coded Type Seating, Concentric Circular, Concentric Rectangular, Concentric Square, Dice Based Diagram Seating, Hexagonal Seating, Lane Type, Lift Based, Matrix And String Based, Musical Chair Based Seating, Pentagonal Seating, Project Based, Puzzle/Seating With Three Variable, Staircase Based Puzzle Dice, Staircase Puzzle, Timing Based, Train Based.

**Score Cracker (24)**
- Priority, in order: Simplification, Approximations, Number Series [Quant], Quadratic Equations, Inequality, Syllogism, Coding and Decoding, Reasoning Miscellaneous, Blood Relation, Direction Sense, Order And Ranking, Alphanumeric Series, Alphabet Series, Number Series [Reasoning], Quantity Comparison, Data Sufficiency [Quant], Data Sufficiency [Reasoning].
- Then: Cause and Effect, Course of Action, Input-Output, Statement and Argument, Statement and Assumption, Statement and Conclusion, Statement and Inference.
- The critical-reasoning topics, Input-Output, Data Sufficiency [Reasoning] and Quantity Comparison sit in Score Cracker **in Practice only**. Modules' Score Cracker doesn't change.

**DI (15)**
- Priority, in order: Table Chart, Pie Chart, Bar Graph, Line Graph, Caselet, Missing Table Chart, Cumulative DI.
- Then: Application Based DI, Bubble Graph, Candle Stick, Funnel DI, Radar Graph, Scatter Graph, Tree Based DI, Triangle Chart.

**English**: no topics yet; it waits for now.

## 3. Source

Every question keeps a record of where it came from. Old data isn't reformatted; the record is added on top.

**The record holds:** kind, provider, exam, stage, year, series, every paper the question appeared in, and the date where one is known.

| Kind | What's in it | Sub-list |
|---|---|---|
| **PYQ** | Every previous-year paper. New ones join it. | exam → year *(to confirm)* |
| **Trending** | Sectional and full mocks for upcoming exams. It matters most and keeps growing, with hundreds of papers per exam. | exam → year → **Mocks-G** or **Mocks-S** |
| **Booster** | The booster courses (Prelims Score Booster, Mains Booster) | *(to confirm)* |
| **General** | Practice sets, speed drills, the book, everything else | none |

- **No provider name appears anywhere in the repo or the app.** The two mock providers show only as Mocks-G and Mocks-S.
- **Repeated questions:** Practice keeps one copy, which lists every paper it appeared in. It shows under every kind it belongs to (e.g. both PYQ and Trending), and answering it once counts everywhere.
- **Previous-year papers keep their original names.** A paper counts as PYQ by its name, not its date. 12 papers have only part of a date, and that's fine.

**Where the record comes from (checked 18 Nov 2026):**
- **Practice questions:** each one's `set_name` is the provider's original test name. That name matches the raw archive, which gives the provider's test id.
- **Mock-paper questions:** each keeps its paper id. The paper gives the exam, stage, day and held-on date.
- **Ordering:** the provider's test id follows publish order. Where the day number can be checked, a later day has a higher id 99.5% of the time, so the id can order Trending. It does not follow PYQ exam dates; they agree only 61% of the time.
- **Gaps:** 25 Practice questions have no paper (23 from the book, 2 with no set name). The 176 GLAT questions match their 6 raw sets by text.

## 4. Prelims and Mains

- **Prelims and Mains are kept apart everywhere in the app.** The stage comes from the profile picked at first start (name → exam → stage → exam date).
- **A question with no stage takes one from any clue it has:** exam name, file name or tag. Only with no clue does it show under both.
  - **Practice:** every question already has a stage.
  - **Single-stage mock courses** (LBO, Apprentice, Office Attendant, LIC HFL; 11,555 questions): use the raw per-question level tag. It agrees with the course name 97% of the time where both exist.
  - **Speed drills (29,419) and the book (2,917):** the speed drills' tag says Mains even on Easy sets, so it can't be trusted, and the book has no clue at all. Both show under both stages.

## 5. Inside a topic

- **Shared by every topic:** Status (All, Not attempted, Attempted), which moves here from the topic list, and Shuffle. The Source picked outside carries into the topic.
- **Each topic's own filters, Subtopic included, are listed in the topic's data file.** For each filter the file gives:
  - its name
  - the question field it reads
  - the order of its values
  - what it depends on (e.g. Family needs a Type first)
- **Practice and Modules draw whatever the file lists.** A new topic needs no change to app code.

## 6. Building it: two rounds

1. **Round 1: the classifier sorts every question into its topic.** For now, each topic simply gets its own questions. A passage or puzzle set is one unit (one question with 3 or 5 sub-questions), so it's tagged and kept as a whole. This brings in the roughly 62,000 Quant and Reasoning mock questions that have no topic today.
2. **Round 2: one topic at a time, build its filters** from that topic's run plus the user's feedback on which filters make sense.
   - The 4 rebuilt topics (Syllogism, Quadratic Equations, Number Series, Inequality) have effectively done this already. Their filters only need to move into their data files.

Every rebuild writes the topic file in one shape, with the same check report.

## 7. Open, or waiting

- **To settle once the classifier is actually run:** the cut-off for unsure tags and a "to check" list, and the topics the classifier doesn't cover yet.
- **To confirm:** the PYQ and Booster sub-lists.
- **English** waits.
- **Not a problem:** questions with no explanation or answer stay as they are, and topic size doesn't matter.
- **Clean-ups to do during the build:** remove the dead book-sets tab, update the stale notes at the top of `src/facets.js`, move the Mistakes page out of `src/Practice.jsx`, and take "Reset all" off the Practice page.

## 8. Rules for every change

1. **No topic names in page code.** Anything specific to one topic lives in data.
2. **No provider names anywhere in the repo or app.**
3. **Old data isn't reformatted.** New information is added on top.
4. **Practice never ranks or drops questions.**
5. **Commit after each piece of work.** `data/` and `build_tools/` still need putting under version control.

## 9. Round 1, as built (18 Nov 2026)

**Practice now holds 80,719 questions** (was 33,363): 47,356 mock-paper questions were sorted into their topics by
the classifier, and every question carries its source record.

- **Data** (`build_tools/practice/`, not in git):
  1. `label_one.sh` labels each mock file with the classifier.
  2. `label_sets.py` scores each passage or puzzle set as a whole.
  3. `build.py` builds the source record, merges repeats, adds the new questions and writes the filters, the index and `papers.json`.
  - Run `build.py` with no flags for a report only; `--cutoff 0.95 --write` writes.
  - It is safe to re-run, and it must be re-run after any topic builder rewrites its topic file.
  - The report is `data/practice_build/report.md`, and questions below the cut-off are in `round1_to_check.json`.
- **Cut-off 0.95:** 12,065 questions wait on the to-check list, 60% of them DI whose chart type is only in the image.
  They are next round's job, with the DI clean-up.
- **Repeats:** 7,948 mock questions were kept once, with every paper they appeared in (`pp`). Their own ids are kept in `same`, so an answer on either copy counts.
- **Prelims/Mains:** 4,365 questions from single-stage courses took their stage from the raw per-question tag.
- **Classifier (v10):** retrained with 49,517 confident mock labels; held-out topic accuracy went from 95.36% to 95.71%.
  Unsure questions at 0.95 went from 17,025 to 12,065. See `build_tools/classifier/HANDOVER.md`.
- **Card lists** live in `build_tools/practice/cards.json`. Edit that file, then re-run `build.py`.
- **App:**
  - `src/facets.js` holds all the filter logic, with no topic names in it.
  - `src/Practice.jsx` is the topic list and topic page.
  - `src/Mistakes.jsx` is now its own page.
  - `src/priority.js` is gone; the default order lives in `cards.json`.
### Round 1b: rulebook and review (18 Nov 2026)
- **Practice now holds 92,299 questions.**
  - The rulebook (`docs/classification-rulebook.md`, approved, P5 = Option A) placed 8,780 of the 12,065 unsure questions.
  - 8 review agents placed 2,800 more. They worked from `data/practice_build/review/BRIEF.md`, with a closed list of allowed topics per item.
- **175 old bank questions moved** to the topic their pair rule gives. The 30 of them that Modules lessons use have their idmap entry updated; Modules still finds all its questions.
- **472 questions stay on the to-check list:**
  - 448 the reviewers weren't sure of
  - 24 whose answer is one of the 4 topics with their own builder
- **13 broken questions are left out** (`round1_broken.json`): a chart named but no picture, a picture from another set, a cut-off question, or a spliced passage.
- Every question records how its topic was decided (`how`) and its score. Mixed questions also carry `also`, shown in the question details as "Also fits …".
- **Backups:** `~/projects/arena/backups/2026-11-18-before-practice` (bank, course, progress) and
  `data/practice_build/before` (the bank as it was before the first write).
