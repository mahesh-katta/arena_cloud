# How a topic is built, end to end

This file is for a new Claude session (cloud or local) that has only this repository. Everything needed is in the repo: the question banks in `data/`, the existing lessons in `tools/guide/`, and the build script. Read `HANDOVER.md` first for the map.

A topic is built in **two stages**. Stage A produces the reference notes (archetypes, drills, cheat sheet). Stage B turns them into the step-by-step lessons the learner actually studies. Stage B is the part the learner values most.

---

## Data sources

| Source | Where | Use |
|---|---|---|
| `clerk` bank | `data/clerk/questions.json`, `sets.json` | 1,150 Quant questions built for this learner, in graded and previous-paper sets per topic. Practice for Quant lessons. Has no solutions. |
| `sreedhar` bank | `data/sreedhar/` | 8,100 questions from model tests (Reasoning, Quant, English). Practice for Reasoning lessons. Mostly no solutions. |
| `guidely` bank | `data/guidely/` | 12,826 questions, topic-wise sets with sub-types (single variable, two variable, vacant). Has solutions for many. Largely unused so far for Reasoning. |
| Charts | `data/<bank>/charts/` | Images for DI questions. |
| Existing notes | `data/playbook/source.md` | The Notion master file as markdown: the Stage A output for the topics done so far. |
| Real papers | the web | Memory-based papers. The richest: `adda247.com/jobs/wp-content/uploads/...` and `careerpower.in/blog/wp-content/uploads/...` PDFs for IBPS Clerk, SBI Clerk, IBPS RRB Clerk prelims, 2024 to 2026. Testbook question pages carry exam tags. Shift analyses (pw.live, guidely, oliveboard, testbook) say what each shift contained. |

Question record: `{set, set_title, q_no, passage, stem, options{a..e}, answer, solution, dirs, source}`. A question's key is `set#q_no`. `sets.json` maps each set to `{section, topic, subtopic, title, ...}`.

Rule of evidence: **only real papers decide what "is asked"**. The banks are the coverage map and the practice pool. Own knowledge is allowed for the maths and logic, never for claims about the exam.

---

## Stage A: the reference module (the learner's original prompt)

This is the prompt that produced `source.md`. Use it unchanged for a new Quant topic, and with "Quantitative Aptitude" read as "Reasoning" for a Reasoning topic. In this repo the "master file" is `data/playbook/source.md`: append the new module there in the same heading structure so `tools/playbook_import.py` can parse it.

```
<role>
You are an elite Quantitative Aptitude faculty member and paper analyst for Indian bank clerk exams. Primary target: IBPS Clerk (Prelims first, then Mains). Secondary: SBI Clerk. Your style: extreme clarity, almost no algebra (avoid "x"), speed arithmetic through ratios, fractions, unitary method, LCM units and the deviation method.
</role>

<learner_level>
I am a beginner. Today I take about 60 seconds per question and 2 minutes on tricky ones. I know no coaching shortcuts.
- Teach each method from zero in plain English, with one worked example before the drill set.
- You choose the best method. Do not ask me for teacher notes.
- My targets: arithmetic 45 sec, data interpretation 35 sec, simplification 20 sec per question.
</learner_level>

<goal>
Build one Speed Mastery Module per topic that (a) reflects what these exams really ask, and (b) gives the fastest reliable method for every question variety.
</goal>

<evidence_priorities>
PRIORITY 1 - Previous year papers (PYQ). Memory-based papers of IBPS Clerk first, then SBI Clerk, RRB Clerk, IBPS PO Prelims. Only PYQs decide what "is asked".
PRIORITY 2 - My question bank (the data folder). It holds questions only, not methods. Treat it as the coverage map: nearly every variety that can appear is in it, and every variety must end up with a fastest method.
PRIORITY 3 - Method and speed sources (style standard): Inspector Chalisa (Mohit Goyal), Meritshine, Amar Sir / Maths Dikhta Hai, Magical Book on Quicker Maths (M. Tyra). Do not claim to have read or watched these. Apply the methods they are known for.
Your own knowledge is allowed for the maths, never for claims about what the exam asks.
</evidence_priorities>

<per_topic_protocol>
1. Collect all PYQs for the topic (files, then web). Open the pages; a search snippet is not a source.
2. Pull all matching bank questions. Group everything into archetypes (varieties) and count each.
3. For every archetype, find the fastest method that works on all its questions. Test each method and each answer by script on every matching question. A method that fails is fixed, split, or given a stated exception.
4. Label each archetype: Confirmed = in 2 or more PYQ papers; Seen once = in 1 PYQ paper; Bank only = in the bank, not found in PYQs; Unverified = from your knowledge alone.
5. State the sample at the top: papers opened, PYQs found, bank questions used. Target floor: 8 target-exam shifts plus 6-10 sister-exam questions. If below the floor, say so. Never give frequency percentages.
</per_topic_protocol>

<operational_rules>
1. NO UNNECESSARY ALGEBRA: use ratio proportion, LCM units, unitary method or effective rates. If "x" is unavoidable, say why and keep it to exactly 1 line.
2. EXAM REALISM: match the difficulty, sentence structure and vocabulary of real papers. Translate phrase traps into maths.
3. EXACT ALGORITHMS: state the mechanical steps for every scaling or conversion.
4. NON-LINEAR WARNINGS: e.g. parts x parts = parts squared.
5. TIME TARGET: every problem solvable in 35-45 seconds by the prescribed method.
6. TRAPS: every question names the pitfall. Elimination hacks use strict divisibility, unit digit or approximation only, apply only to whole-number options, and end with a back-check.
7. FALLBACK: every topic gets one universal method that still works when the exam invents a new variant.
</operational_rules>

<module_template>
# [Topic] - Speed Mastery Module
Sample line: papers opened, PYQs found, bank questions used.
## 1. Core Mental Model, Exact Mechanics & Conversion Grid
## 2. Archetypes   (Core = Confirmed and Seen once. Insurance = Bank only. For each: pattern clues, the shortcut engine, one worked example.)
## 3. Drill Set    (4-6 original questions: statement with options A-E, Conventional Method, 30-Second Exam Method, Option Elimination Hack, IBPS Trap Warning.)
## 4. Cheat Sheet & 30-Second Recall Matrix
## 5. Practice Ladder   (untimed, then 60 seconds, then 45 seconds; cite bank question IDs)
## 6. Verification Log  (what was tested, what failed and was fixed, what could not be opened, source links)
</module_template>

<output_and_honesty>
Keep chat replies short and in plain English. Say clearly what is verified and what is not. Never call a module fail-proof. Memory-based papers are reconstructions; say so where relevant.
</output_and_honesty>
```

Stage A can be skipped for a topic that should exist as lessons only. Give the guide file a `"new"` block instead (see `tools/guide/trains.json`).

---

## Stage B: the guided lessons (`tools/guide/<module-id>.json`)

The learner's feedback that shaped this stage: the Stage A notes were "too hectic" for a newcomer. He asked for a polite, clear, concise teacher; a straight road from easy to hard; one new twist at a time; prerequisites kept in one place; shortcuts tucked away and added only when worth it; and practice questions chosen cleverly as sub-variants of one idea, about five per lesson, so that he learns more with less effort. For puzzles he asked for lessons tailored to each puzzle type and backed by counting what papers really set, not generic advice ("find the anchor, connect, eliminate").

### B1. Quant topic

1. Dump the topic's `clerk` questions (two sets per topic: `clerk-NN-<topic>-a-graded` and `-b-pyq`). Solve every one yourself.
2. Group them into 9 to 14 lessons. Each lesson adds exactly one idea to the lesson before. Order easy to hard.
3. Per lesson write: `plain` (one line: what is new), `teach` (short paragraphs, a table where it helps), one worked `example`, one `check` question with a `why` that also explains the tempting wrong option, and `practice` with about five bank keys and a `tag` for each saying what that question hides.
4. Add a `shortcut` only where it clearly saves time, and say when not to use it.
5. Write a `work` entry for every practice question: three or four lines, the last containing the keyed option's text.
6. Compare with `source.md`: add any important shortcut the notes missed; leave the cheat-sheet style out of the lessons.

### B2. Reasoning puzzle topic ("reverse engineering")

1. **Papers.** Search the web for real memory-based puzzles of this type from clerk prelims (aim for 10 to 20 with full clue text). A sub-agent with a precise brief works well. Ask for: exam, date, shift, URL, every clue as worded, the questions and answers, and a strict separation of real papers from site-written practice.
2. **Bank.** Pull the same type from `sreedhar` (and `guidely`).
3. **Encode and solve.** Write each puzzle as exact conditions in a small Python DSL and brute-force it. Keep puzzles with exactly one arrangement. A paper puzzle whose solved answer matches the paper's own key was remembered correctly. Ambiguous wording is settled by trying both readings and seeing which gives one arrangement.
4. **Measure.** Sizes; which clue kinds appear and how often; whether any clue fixes a person outright; how many cases the best opening leaves; open cases in printed order against a good order. Let these numbers choose the method.
5. **Design the lessons** around what the numbers show. Use a real paper puzzle as each lesson's worked example. Practice is two or three bank sets per lesson; give the full build as the working of each set's first question and a one-line read-off for the others.
6. **Verify.** A script checks that every working's last line contains the keyed option. Sets whose key contradicts their own clues are dropped and listed.
7. **Report honestly**: what was counted, sample sizes, what was dropped and why, what was not studied.

What this found so far (each guide's `intro` has the table):
- Box: almost never a fixed box; join exact clues into a block and count how many places it fits.
- Month/date/day: nearly always a calendar clue to start from; "months after" is not "persons after".
- Parallel rows: always five a side at clerk level; "third to the left" leaves two cases; fix left and right by drawing the south-facing row on top.
- Floor and flat: "above" means any higher floor; sort people into west and east teams before thinking about floors.
- Linear row: the unknown-number form dominates; build a chain of steps, then total = seat of Y + seat of X - 1 from the balance clue.
- Series and miscellaneous: short routines; the pairs question is in nearly every paper.

### B3. Build and check

```
python3 -B tools/playbook_import.py        # rebuilds data/playbook/playbook.json; '!!' lines are errors
node server.mjs                            # then open http://localhost:8000/?playbook=1&m=<module-id>
```

Check in the browser that the lesson cards, checks, shortcut folds and practice lists render, then commit.

### Writing rules for all lesson text

Plain English, short sentences, British spelling as in the existing guides. No algebra letters in Quant unless unavoidable. No claims of frequency without a count behind them; give the count ("7 of the 8 real puzzles"), never a percentage. Say what was not verified. Memory-based papers are reconstructions; say so.

---

## Open requests from the learner

1. Split Simple Interest and Compound Interest into two topics (model: how `trains.json` was split from `speed-time-distance.json`).
2. Build topics not in the Notion file. In the `clerk` bank: Approximation, Number Series, Quadratic Equations, Data Interpretation, Ratio and Proportion, Average, Pipes and Cisterns, Mensuration, Miscellaneous. In the other banks: Syllogism, Inequality, Blood relation, Direction sense, Coding decoding, Order and ranking, Input output, Data sufficiency, Circular / Square / other seating, Designation, Sequence, Age and Year puzzles.
3. Rebuild the app cleanly as a new project that keeps the data formats above. The content and the data are what must be preserved; the current front-end code need not be.
4. Bring Guidely's sets into the Reasoning practice; rewrite the Quick revision notes for Reasoning topics to match the guided lessons.
