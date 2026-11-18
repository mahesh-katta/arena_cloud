# Classification rulebook

**Status: APPROVED 18 Nov 2026: every rule as written; P5 = Option A.** Applied by `build_tools/practice/build.py` (each question records the rule that placed it in `how`). The manual part (D6 and R1) is done by review agents working from `data/practice_build/review/BRIEF.md`.

One rulebook for people and the machine alike: when a question could go to two topics, these rules decide. The
classifier, the picture model, the builders and anyone reviewing by hand all follow the same page. When a rule
changes, the old labels that break it are corrected and the classifier is retrained, so the labels it learns from
agree with the rules it is judged by.

Numbers are from the 12,065 questions now on the to-check list (`data/practice_build/round1_to_check.json`).
Every rule was tested against the labelled bank before Round 1 (`data/practice_build/before`). Code:
`build_tools/practice/pair_rules.py` (pair rules); `build_tools/practice/trials/` (DI picture model and the estimate).

---

## G. General rules

| # | Rule | Approve? |
|---|---|---|
| G1 | A passage or puzzle set is one unit. It gets one topic, decided on the passage and all its questions read together. | ☑ |
| G2 | A format wins over the maths inside it: DI (chart, table, caselet), Quantity Comparison and Data Sufficiency are the topic. The arithmetic inside is recorded as "also fits". | ☑ |
| G3 | **A mixed question** (two topics both fit, e.g. Percentages and Ratio, Trains and Time & Distance): the main topic is what the final question asks for. The other topic is recorded as "also fits", so it can show up there too later. | ☑ |
| G4 | The machine places a question on its own only when sure (score ≥ 0.95, or a rule below settles it). Everything else goes to review. | ☑ |
| G5 | Every question records **how** its topic was decided (classifier version, whole-set score, picture, pair rule, layout rule, or a person) and how sure it was, so any decision can be redone later. | ☑ |

G3 settles **1,934** unsure questions (Trending 1,484 · PYQ 258 · Booster 192).

## P. Look-alike pairs

Each rule reads the wording of the whole set. "Matches the labels" counts how many already-labelled sets in the bank
agree with the rule; the conflicting ones are old labels to correct once you approve the rule.

### P1. Linear vs Unknown Linear seating ☑
- **Rule:** the passage says how many persons there are ("Eight persons sit in a row…") → **Linear**. The number is not given ("A certain number of persons are sitting in a row…") → **Unknown Linear**.
- **Test:** matches 111 of 119 labelled sets; 2 conflict; 6 where the rule can't tell.
- **Settles:** 266 unsure questions.

### P2. Month vs Month-with-Date puzzle ☑
- **Rule:** persons are placed on fixed dates as well as months ("on two different dates, either 6th or 13th, of four months…") → **Month with Date**. Months only → **Month Based**.
- **Test:** matches 134 of 136; 2 conflict.
- **Settles:** 103.

### P3. Day vs Sequence puzzle ☑
- **Rule:** days of the week are named (Monday … Sunday) → **Day Based**. Things happen "one after another" with no days or months → **Sequence Based**.
- **Test:** matches 107 of 117; none conflict; 10 where the rule can't tell.
- **Settles:** 125.

### P4. Alphabet vs Alphanumeric series ☑
- **Rule:** the given series mixes letters with numbers or symbols (e.g. `F % P H + Y 7 #`) → **Alphanumeric**. Letters or letter-groups only (e.g. `LVE PSM AET`, or questions on alphabet positions) → **Alphabet**.
- **Test:** matches 82 of 89; 1 conflicts; 6 where the rule can't tell.
- **Settles:** 148.

### P5. Year vs Age vs Year-with-Age puzzle ☑ — Option A chosen
The labelled bank is mixed here. Only 58 of 89 sets agree with any single reading: 14 sets labelled "Age Based" give
birth years plus "ages calculated with respect to a year", and 7 labelled "Year with Age" have no ages at all
(only marriage or joining years). So you pick the meaning:

- **Option A (proposed): decide by what the persons are placed on.**
  - Placed on **ages** ("seven persons of different ages 17, 23, 28…") → **Age Based**.
  - Placed on **years** (born / joined / married in 1983, 1985…) → **Year Based**.
  - Placed on years **and** told to work out ages from a reference year ("ages are calculated with respect to 2024") → **Year with Age**.

  30 old labels would change (mostly "Age Based" → "Year with Age"). Settles **403** unsure questions.
- **Option B: merge the three into one topic, "Year / Age Puzzle"**, with Year, Age and Year-with-Age kept as its
  subtopics. No old labels need to be argued over; the subtopic follows Option A's wording.

**Pair rules settle 1,045 unsure questions in all** (P1–P5 with Option A): 765 keep the classifier's best guess and 280 change it.

## D. Data Interpretation

| # | Rule | Settles | Approve? |
|---|---|---|---|
| D1 | The words, or the text inside the picture, say "cumulative" → **Cumulative DI**; say "missing values / some data are missing" → **Missing Table Chart**. A picture can't show these two (the picture model gets only 5 of 100 right). | 250 | ☑ |
| D2 | The chart type comes from the **picture** when the picture model is sure (score ≥ 0.7): Bar, Line, Pie, Table, Radar. Tested on 766 known DI pictures: 97.4% right when sure. | 4,424 | ☑ |
| D3 | No picture, and the numbers are laid out in rows and columns in the text → **Table Chart**. | 202 | ☑ |
| D4 | No picture, and the data is a paragraph → **Caselet**. All 156 labelled DI sets without a picture are Caselets. | 1,340 | ☑ |
| D5 | The words name a chart ("the given pie chart shows…") but there is no picture → the picture is missing, so the set is **left out** of Practice as broken. | 5 | ☑ |
| D6 | The picture model is unsure → a person names the chart type by looking at it. Claude can do a first pass from sheets of small pictures; you confirm. | 884 left | ☑ |

## Review and checking

- **R1 Review queue** ☑. Whatever the rules above don't settle goes to a small review page in the app. It shows the question, the passage and the two best guesses; one click confirms. Order: **PYQ first**, then Trending (newest year, by exam), then Booster. Every answer is kept and added to the classifier's training examples.
- **R2 Spot-check** ☑. After each round, 100 randomly picked auto-placed questions are checked by a person. A topic that comes out below 95% gets its rule tightened before the next round.
- **R3 More pairs later** ☑. Smaller look-alike pairs seen in the queue (Linear vs Parallel, Circular vs Square, Order & Ranking vs Blood Relation, Table Based vs Sequence) get a rule here the same way once the queue shows they matter.

## What the rulebook does to the to-check list (estimate)

| | Questions |
|---|---|
| Unsure now | 12,065 |
| Settled by D1–D4 (DI words, picture, layout) | 6,216 |
| Settled by P1–P5 (pair rules, Option A) | 1,045 |
| Settled by G3 (mixed: main topic + also fits) | 1,934 |
| Left out as broken (D5) | 5 |
| **Left: DI pictures checked by eye (D6)** | **884** |
| **Left: review page (R1)** | **1,981** (PYQ 270 · Trending 1,395 · Booster 316) |

Estimate made with `build_tools/practice/trials/rulebook_estimate.py`.

## Amendments (18 Nov 2026, evening), each tested before it went in

- **G2 is now enforced on every arithmetic placement.** A passage that names a chart or table ("pie chart", "the table given below", "refer to the graph") goes through the DI rules, whatever arithmetic is inside. Only explicit chart or table words count; "study the following data" does not. On held-out questions it moved 11 misfiled DI sets, all correctly, with 0 wrong moves. In Practice it moved about 150 questions to DI.
- **G3 applies only between two ordinary topics.** When one of the two is a format (DI, Quantity Comparison, Data Sufficiency), G2 decides; what G2 can't settle waits for review. This took about 600 risky "mixed" placements back to the to-check list.
- **A DI set is decided on its passage alone** (the user's idea). On 904 held-out sets the passage alone got 80% of DI right, against 67% for passage + questions. When sure, it was right 95% of the time, against 72%. This applies only when the passage holds the data, not when it is just a "Study the following…" line. Other sets keep the question-by-question vote, lifted by the whole-set score only when the two agree.
- **A reviewed answer beats a machine guess.** Agents' sure answers stand even where the classifier later became sure of something else.
- **Tested and not adopted:** letting the picture model overrule the classifier's sure DI placements (on held-out questions it broke 10 and fixed 0). Apple's built-in image fingerprint for chart type: 97.1% right against 96.5% for the current shape model, a small gain, kept as a possible later step.
- **G6, the user's rule for single questions (adopted):** the **method counts 60% and what is asked 40%**. Score = 0.6 × the method's strength in the wording + 0.4 × (is this what the final question asks for) + 0.1 × the classifier's own score, to break ties. The top topic is the main one; the next is "also fits". Every single question is placed this way, so **no single question is left on the to-check list.** A reviewer's answer that only names "what is asked" gives way to the method. In Practice this placed 731 single questions (657 with an also-fits topic), and changed the main topic of sure classifier placements where a stronger method was present.
- **D1 wording widened:** "some data in the table are missing" (words between "data" and "missing") now also counts as Missing Table Chart.

## Amendments from the user's review of 48 sets (18 Nov 2026, night), each tested before it went in

The user reviewed 48 sets by hand: 27 kept, 14 changed, 7 unsure. Before these rules, the machine matched the user on 27 of 41 answered sets; after them, on 36 of 40 (one answer held for a check).

- **The user's own answers beat everything** (rules, agents, the classifier). An "unsure" answer changes nothing. Answers kept in `data/practice_build/review/user/round*.json`, applied last; ids in `user/held.json` wait for the user's word.
- **P6 Direction Sense / Order & Ranking / Blood Relation**, on sure and unsure sets alike. Each kind needs a clear signal of its own. Direction needs compass words (north, east, turn left), since walking or distance words alone are not enough. Blood Relation needs 3+ family words. Order & Ranking needs 3+ comparison words, "than" twice or more ("walks more distance than" is still a comparison). With one clear kind, that kind wins. With two, the set keeps its topic and gets the other under "Also fits". Bank: 189 of 203 agree, 0 conflicts. It moved 40+ sure "more than / less than" sets from Direction Sense to Order & Ranking. The classifier writes "Order and Ranking", so topic names are now compared ignoring case.
- **D2b two pictures (the user's rule):** the first picture counts 50%, and the other 50% goes to the chart type the sub-questions point to (their chart words, never their maths). So the first picture decides, unless the questions name the second picture's type. The second picture's type shows under "Also fits". It settles only when the first picture is read with confidence (0.7+), or both pictures agree.
- **D7 missing cells:** a Table Chart whose picture shows missing values (blank cells, "?", a dash, or algebra like x+y, 2a) is a Missing Table Chart. The picture is read offline with the Mac's own text reader (`build_tools/practice/missing_cells.py`), and blank cells are re-checked at twice the size. Bank: 45 of 48 missing tables found; of 76 Table Chart sets, 5 were flagged and 4 of those really were missing tables. It also corrects old bank labels.
- **D4 for sets filed under arithmetic:** a Quant set of 3+ questions built on a data paragraph with no picture is a Caselet, and the arithmetic topic shows under "Also fits". Bank: all 122 such sets are Caselet, and no arithmetic topic holds one.
- **G2 for single questions:** Quantity I / Quantity II wording is Quantity Comparison. 60/40 never moves such a question to the maths inside it; before this fix it had moved 41.
