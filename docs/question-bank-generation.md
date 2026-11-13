# Playbook: Chapter Source -> Published Question Bank

Procedure for turning a textbook chapter into a `question-bank@1` file
(`courses/<bundle>/banks/bank-<bundle>.json`) - a pool of questions sourced
from the chapter itself, never paraphrased from an already-authored
lesson's own slides.

Separate track from `docs/generation-playbook.md` (lessons) - never touches
`OUTLINE.md`/`lessons/`/`blocks/`/`simulations/L0N/`. Staged-generation:
`docs/staged-generation.md`'s "Bank track" (`node tools/staged-generation/
next.mjs --bank`), 3 passes. Two invocation modes:
- **Standalone**: fresh session, chapter source only, or source + an
  existing `FIGURES.md` from a prior lesson run on the same bundle. No
  lessons required.
- **Combined**: same session also producing that chapter's lessons, any
  order.

## 1. Source

Reuse `courses/<bundle>/FIGURES.md`/`GENERATION-LOG.md` if a prior lesson
pass wrote them. Otherwise do `docs/generation-playbook.md` step 1's
rasterize-and-inspect pass and write `FIGURES.md` (required, even if empty).

## 2. Plan (`BANK-PLAN.md`)

Decide coverage **per topic**, not per chapter - count is whatever a
topic's own questions add up to, never divided evenly by chapter count.

- **Floor: >=6 questions/topic** (narrow sub-topics as low as 4, broad/
  foundational ones 10+ - applies per topic even in a multi-chapter bank).
- **Spread: >=3 question types per topic**, no single type over ~40% of
  the whole bank - use `assertion-reason@1`, `match-categorize@1`,
  `sequence-order@1`, `numeric-value@1`, `statement-judgment@1`,
  `plot-function@1`/`graph`, etc., not just mcq + one descriptive type.
  A CBSE case-based/source-based question (a Locke/Montesquieu-style
  source note, a geography extract, each with 1/1/2-mark sub-parts) is
  `comprehension-set@1`, not a plain type - see "8. Shared-stimulus /
  case-based questions" below, and don't count it toward this per-topic
  type-count average (it wraps other types, doesn't compete with them).
  English/language-arts banks use a different type pool entirely for
  everything else - see "9. English / language-arts banks" below before
  planning one of those.
- `olympiad` stays opt-in - only where a topic genuinely warrants it.

Plan via **one coverage matrix** (topic x type-count x difficulty-count),
built before the question list - not several tables re-slicing the same
numbers after the fact.

### 2.1 Stay inside the chapter

Every question tests only what the source chapter teaches - never adjacent
syllabus, outside-class knowledge, or a merely-true-and-on-topic fact. If
hitting a topic's floor tempts reaching outside the chapter, lower the count
instead - never backfill with out-of-syllabus material.

Before drafting a topic-run, re-check the source pages: the concept, not
just the `topicId` label, must actually be taught there.

End `BANK-PLAN.md` with a `## Question list` section, one line per planned
question, EXACT format (a script parses this - do not vary it):

```
- <id> - <type> - <topicId> - <difficulty>
```
e.g. `- q-bank-014 - mcq-single@2 - photosynthesis-inputs - medium`

Write one topic's questions as a **contiguous run** of lines (don't
interleave topics) - Stage B2 batches by topic-run, so this ordering is
what keeps one topic from being split across two passes.

This list is the single machine-parsed manifest every later stage works
from - it must match the matrix row-for-row. Don't add further narrative
tables restating the same totals; matrix (input) and list (output) are the
only two representations of the plan that should exist.

### 2.5 Olympiad sourcing (only if the plan calls for `olympiad`)

Before drafting, only if the invocation has `Web: on` (otherwise skip this
section and calibrate from the source), web search for real competition-caliber problems on this
topic (past RMO/INMO/NSEJS or the subject's own olympiad archives) to
calibrate rigor and problem shape. `docs/copyright-and-sourcing.md`'s rule
applies to web sources same as the textbook: never copy numbers/wording/
diagrams, only synthesize the reasoning pattern into an original problem.
Log it in `GENERATION-LOG.md`:

```
## Olympiad sourcing: <question id>
- Query: <search query used>
- Source(s) consulted: <name(s), not full copies>
- Pattern borrowed: <one line>
```

## 3. Write question files

One file per question, `courses/<bundle>/questions/bank/<id>.json` - flat,
never `questions/L0N/` (not tied to a lesson). Every other `AGENTS.md`/
`SKILL.md` rule applies unchanged; only source and folder differ.

### 3.1 Grade-appropriate language

`docs/voice-and-tone.md` scopes stems out; this fills the gap. Match the
chapter's own register in `stem`/`options`/`explanation`/`explanationSlide`
text - paraphrasing to avoid copying (`docs/copyright-and-sourcing.md`)
means restructuring the sentence, not raising its vocabulary. E.g. "human
activities," not "anthropogenic factors," for a class-9 chapter that never
uses the latter.

Reject any word the chapter itself never uses/defines, per the bank's own
`grade`.

Staged-generation batches this step (`docs/staged-generation.md`'s Stage
B2) - a batch per pass, not one run per question, never split mid-topic
(see the Plan step's contiguous-run ordering above).

`semantic-descriptive@1`: rubric-size per
`docs/descriptive-questions-and-cbse-marks.md`, `mode: "full-answer"` (that
doc already scopes it to review/bank use, not `mode: "coach"`). Author
`level3` too, same doc's rule - without it, review has no way to reveal the
model answer, only the pass/fail rubric checklist. This applies just as much
to a `semantic-descriptive@1` sub-item inside a `comprehension-set@1` (step
8) as to a standalone bank question - don't skip it there. (`structured-
descriptive@1` is deprecated - never author it, its keyword-pattern scorer
produces unreliable grading; `semantic-descriptive@1` is the only type for
this shape now.)

Three fields with no existing convention elsewhere in this repo:

- **`difficulty`**: `easy | medium | hard | olympiad`.
- **`topicId`**: match this bundle's existing topic-tagging granularity (or
  pick one topic-per-concept and stay consistent if no lessons exist yet) -
  this applies to a `comprehension-set@1` too (tag the whole set, once, by
  the concept its source is about). English/language-arts banks: see
  "9. English / language-arts banks" below instead - skill-based, not
  chapter-section-based.
- **`weight`**: mark value, on the bank entry (step 5), not the question
  file. `2`/`3`/`5` for `semantic-descriptive@1` at that CBSE mark level;
  default `1` for objective types.
- **`estimatedTimeSec`**: on the question file itself.

| Question shape | estimatedTimeSec |
|---|---|
| Objective/numeric | 60-90 |
| `comprehension-set@1` | ~60 per item, plus ~60 to read the passage |
| Table item (`numeric-value@1` or `mcq-single@2` in a table set) | 60-90 per item, plus ~45 to read the table |
| 2-mark descriptive | ~120 |
| 3-mark descriptive | ~180 |
| 5-mark descriptive | ~300 |

### 3.2 Never reference options by letter/position in `explanation`

`mcq-single@1`/`mcq-single@2` shuffles `options[]` for display by default;
scoring/explanation are keyed by `id` in authored order, and the UI shows
no A/B/C/D letter. Never write "option b", "the first choice", etc. in
`explanation`/`hints` - describe the option's own content instead. For a
callout specific to one wrong option, use that option's own `feedback`
field (id-keyed, shuffle-safe) instead of naming it in `explanation`.
(`assertion-reason@1` is exempt - options are fixed CBSE wording, never
shuffled.)

### 3.3 Wrap math notation in `$...$`, always

Any math in `stem`/`options`/`explanation`/`hints`/rubric text/`level3` -
anything rendered through the content pipeline - must be wrapped in
`$...$` (or `$$...$$` for a display equation). Unwrapped `AB^2`/`x^2 + 1`
renders as flat text with a literal caret, not typeset math - the renderer
has no way to know it's math otherwise. A live audit of one bank found 90
fields across 19 files written this way (real math, no `$`) purely because
nothing said the rule - don't reproduce it.

This applies even to a short fragment inside a sentence, e.g. "since
$a^2 + b^2 = c^2$" - not just a whole-line equation. `semantic-descriptive@1`
rubric text has its own additional scorer-facing rules (spacing/notation
normalization, numeric-consistency, `expectedMath`) - see
`docs/descriptive-questions-and-cbse-marks.md` - but the `$...$` wrapping
rule here applies to every question type, not just that one.

### 3.4 Quantitative content (any subject)

Holds for lesson questions and stimulus tables too. Checked against the
plugin code: `numeric-value@1` takes `expectedValue`, `tolerance` and
`unit`; nothing else is scored.

- **Units.** The stem names the unit the answer is in ("in mL/s", "in %").
  `unit` is shown after the input box, display only. The input is a browser
  number field: digits, sign, decimal point only. No commas, `%` or units
  typed: ask "as a percentage" with `unit: "%"` and `expectedValue: 12.5`,
  not `0.125`.
- **Rates and ratios.** State numerator, denominator, multiplier and
  period: "females per 1,000 males, Census 2011", "literates per 100
  people aged 7 and over", "mL of gas per second, first 60 s". The stem
  says "per 1,000"; `unit` repeats it.
- **Rounding.** The stem says the places or significant figures. Compute
  `expectedValue` once (`node -e`) from the stated inputs, not from rounded
  intermediates.
- **Tolerance.** Absolute and inclusive (`|answer - expected| <= tolerance`);
  absent = 0 = exact. There is no relative or significant-figure mode.
  Rounded answer: half a unit of the asked place (2 places: `0.005`); a
  full unit (`0.01`) when a fair route through rounded steps moves the last
  digit. A value read off a graph: half the smallest gridline. Never 0 for
  a computed non-integer.
- **Intervals and ranges.** Two ends, two items (lower, upper) in a
  `comprehension-set@1`, each with its own tolerance; meaning ("what does
  this range tell you") as `mcq-single@2`. Name the level (95%) and, if
  the source does, the method.
- **Real vs illustrative data.** Real numbers come from a cited source
  (agency or author, year, title, table, licence) recorded in `FIGURES.md`
  or the log; the stem names place, year and population. Invented numbers
  say "illustrative" in the stem or `passageTitle`, are plausible, and are
  never tied to a real place, survey or person.
- **Personal data.** Never real names, ID numbers, birth dates, addresses,
  or rows that single a person out (one person in a small group). Use
  aggregate counts, labels like "Student A" or "Sample 3", and merge or
  round very small cells. Applies to any record-level data: marks, survey
  answers, customer or patient rows.
- **Explanation.** Show each step with its unit, then the rounding.

Minimal `numeric-value@1` file (validator needs `stem`, `expectedValue`, `tolerance`; `unit` is a display string):

```json
{
  "id": "q-bank-021",
  "type": "numeric-value@1",
  "difficulty": "medium",
  "topicId": "literacy-rates",
  "stem": { "en": "In a district of 8,000 people aged 7 and over, 5,300 can read and write. Find the literacy rate as a percentage, correct to 1 decimal place." },
  "expectedValue": 66.3,
  "tolerance": 0.05,
  "unit": "%",
  "explanation": { "en": "5,300 / 8,000 x 100 = 66.25, which is 66.3 % to 1 decimal place." },
  "estimatedTimeSec": 75
}
```

## 4. Explanation slides

**Mandatory for every `hard`/`olympiad` question** - machine-enforced, a
question at either difficulty with no `explanationSlide` fails validation.
`explanation` alone is not enough. Real step-by-step worked solution, same
`explanationSlide` mechanism as SKILL.md, under `courses/<bundle>/
explanations/bank/` (parallel to `explanations/L0N/`). Optional for
`easy`/`medium`, same as any other question.

- **One slide-block per reasoning step**, not one dense paragraph - a
  3-step derivation is 3 `content-block@1` entries in
  `explanationSlide.blocks[]`.
- **Attach a `simulation` when a step is genuinely visualizable** - reuse
  `docs/simulation-authoring.md` section 3's base-class table.
  - Needs one: a geometric construction, a physical process reaching
    equilibrium, a reaction pathway, a graph built point by point, a
    circuit being traced.
  - Doesn't: a purely algebraic derivation, a definitional/classification
    question, a numeric substitution with nothing new to see.

## 5. Assemble the bank index

`courses/<bundle>/banks/bank-<bundle>.json`:

```json
{
  "id": "bank-<bundle>",
  "type": "question-bank@1",
  "subject": "<subject>",
  "grade": <grade>,
  "title": { "en": "<Chapter title> - Practice Question Bank" },
  "questions": [
    {
      "ref": "questions/bank/q-bank-014.json",
      "type": "mcq-single@2",
      "topicId": "photosynthesis-inputs",
      "difficulty": "medium",
      "weight": 1,
      "estimatedTimeSec": 75
    }
  ],
  "authoring": { "status": "ai-draft" }
}
```

**`chapterId`/`chapterIds` are optional - fine to leave out of an AI draft.**
Set one only if the real curriculum chapter id(s) are already confidently
known (e.g. from this bundle's own lesson-track `OUTLINE.md`) - `chapterId`
for one, `chapterIds` (array) for several, never both. Otherwise leave both
unset; a human reviewer associates the bank with real chapter id(s) later
via authoring-app. See `examples/example-bank-multi-chapter.json` for the
`chapterIds` shape.

See `examples/example-bank.json`, and `examples/example-question-bank-with-
explanation-slide.json` for a `hard` question's full `explanationSlide`
(with a companion simulation) wired end to end.

## 6. Validate

```
for f in courses/<bundle>/questions/bank/*.json courses/<bundle>/explanations/bank/*.json courses/<bundle>/banks/*.json; do
  node validators/validate.mjs "$f"
done
```
Fix every error. The validator can't catch a technically-valid but
unconsidered `weight`/`estimatedTimeSec`, or an `explanationSlide` that's
really one dense block - re-read the assembled bank once for both.

## 7. Export

```
node tools/export-course.mjs <bundle> <dest-dir>
```
Same tool as `docs/generation-playbook.md` step 8 - `banks/` is picked up
automatically alongside `modules/`/`lessons/`/`tests/`.

## 8. Shared-stimulus / case-based questions (any subject)

`comprehension-set@1` - one shared stimulus plus several sub-items, each an
ordinary question of any other registered type - is not English-only; CBSE
SST/Science papers use the same shape for case-based questions (a Locke/
Montesquieu source note, a geography extract), each with 1/1/2-mark
sub-parts. Whenever a chapter's real exam includes that shape, plan a
`comprehension-set@1` entry - don't flatten it into standalone questions
that each re-paste the same stimulus into their own `stem`/`prompt`.

- **Content**: the stimulus is original synthesis by default, same as any
  other `markdown`/`prompt` field (`docs/copyright-and-sourcing.md`) -
  this holds for every subject, SST/Science case-based sources included.
  The one narrow exception (a literature extract quoting the prescribed
  poem/story verbatim) is English-specific - see section 9 below.
- **`weight` on the bank entry**: one `comprehension-set@1` file holds
  several sub-marks internally (`items[].weight`, e.g. `1,1,1,1,1,1,2,2`
  for an 8-question, 10-mark set). The *bank entry*'s own `weight` (step 5)
  is still a single number - the aggregate (`10` for that example), not a
  per-item list. Don't split one stimulus into multiple bank entries to
  give each sub-question its own bank-level weight; that duplicates the
  shared stimulus text across files, which this type exists specifically
  to avoid.
- **`topicId`**: tag the whole set once, by the concept/chapter its
  stimulus is actually about - same granularity as any other question in
  that bank (see step 3's `topicId` bullet above).

### Planning: track these in their own list, never as a coverage-matrix cell

**Never slot `comprehension-set@1` into step 2's coverage matrix as one more
type column** - the matrix rewards standalone-question breadth per topic, so
a matrix-driven count converges on the non-zero minimum (one), even while
technically satisfying "every topic has >=6 questions, >=3 types." Observed
failure: a 15-topic English plan did exactly this and produced two reading
passages total for the whole bank's Reading-comprehension coverage.

Instead, plan `comprehension-set@1` entries in a **separate stimulus list**,
sized by how many distinct passages/extracts/sources this bank actually
needs to give real practice depth - not by the topic list's own size:

```
## Comprehension sets
- cs-001 - reading-pottery-craft - medium - 10 marks
  Passage: factual passage on traditional Indian pottery and terracotta craft
  Items: mcq-single@2 x3 (1 mark each), fill-blank@2 x2 (1 mark each),
         semantic-descriptive@1 x2 (2 marks each)
- cs-002 - the-road-not-taken - medium - 4 marks (literature extract)
  Items: mcq-single@2 x2 (1 mark each), semantic-descriptive@1 x2 (1 mark each)
```

The id here (`reading-pottery-craft`, `the-road-not-taken`) is the actual
`topicId`, not the section label (`reading-comprehension-factual`) - see
section 9's `topicId` subsection.

**Commit to each item's type and weight now, not just the item count/total
marks** - same reasoning as the matrix above: an uncommitted count converges
on one repeated type (usually `mcq-single@2`) when Stage B2 drafts the file,
defeating the point of a mixed-shape passage. Item content (exact quoted
lines, stem wording) is still Stage B2's job, working from the real source.

A section label this feeds into (`reading-comprehension-factual` for
reading, a per-work `topicId` for literature) still appears in the main
coverage matrix for whatever *standalone* questions about it exist - the
matrix and this list are complementary, not the same count. A
`comprehension-set@1` bank entry never appears as a row in the coverage
matrix's own type columns.

### 8.1 Table questions (any subject)

A data table with sub-questions: one `comprehension-set@1`.

- `passage`: one or two lines on what the table shows and where the numbers
  come from (source, or "illustrative"), then a markdown pipe table (it
  renders as a table). Units in the header cells. At most 6 columns, so it
  fits a phone. Cells to find are letters (`a`, `b`), not blanks.
- `items[]`: one `numeric-value@1` per letter or derived value ("Find a"),
  `weight` 1 each, tolerance per section 3.4; then `mcq-single@2` or
  `semantic-descriptive@1` for what the numbers mean.
- Fill a table from its margins: give row and column totals so each letter
  follows from the others; ask the letters in the order a solver finds
  them.
- Not `fill-blank@2` for a table: its template renders inline (no table)
  and it matches text exactly, with no tolerance. Use it only for a word or
  an exact integer in a sentence, listing accepted forms in `expected[]`
  (`"1000"`, `"1,000"`).
- A chart as the stimulus (bars, histogram, a series over time): a child
  item's `image` or `simulation`. A question's `graph` draws functions and
  points only. The set's `passage` has no media field.

Shapes:
- 2x2 count table with margins (two yes/no traits, e.g. a class survey:
  walks to school, lives within 2 km): find the missing cells, then a
  proportion in each row.
- Chemistry data table (time vs volume of gas collected): the rate over
  an interval in mL/s, and which interval is fastest.
- Census table (districts: population, literates, females, males):
  literates per 100, females per 1,000 males, and which district ranks
  where.

## 9. English / language-arts banks

Everything above (floor/spread rules, staged-generation's 3-stage split,
the `hard`/`olympiad` explanationSlide mandate, steps 5-8 unchanged) still
applies. Two things are genuinely different for English: the type pool,
and what `topicId` means.

### Type pool

Not the STEM list in step 2 above. Use these instead, picking types by
what the source question actually is (a real CBSE English paper mixes all
of these across its Reading/Writing/Grammar/Literature sections - don't
reach for one type across the whole bank):

- `mcq-single@2` - vocabulary (synonym/antonym/meaning-in-context), single-
  select literal/inferential comprehension questions.
- `sequence-order@1` - word/phrase reordering ("rearrange to form a
  meaningful sentence"). Its `items[]`/`correctOrder` shape is already
  generic token reordering, not chronology-specific - no new type needed
  for this shape.
- `fill-blank@2` - cloze passages, both free-text and "choose the most
  appropriate option" (`options[]` per blank).
- `error-correction@1` - the "passage has not been edited, one error per
  line" editing task.
- `comprehension-set@1` - reading-comprehension passages and extract-based
  literature questions are this shape (see section 8 above for the
  mechanics and its own separate "Comprehension sets" planning list, which
  a real generation run got wrong by treating it as a coverage-matrix
  column instead - don't repeat that). Minimums for a general-purpose
  English bank, not just "at least one":
  - **3-5 distinct reading passages** across `reading-comprehension-
    factual`/`-inferential`, each with 6-8 sub-items (mix of MCQ,
    vocabulary, short-answer) - a real CBSE Reading section alone runs 2-3
    passages at that density; one passage total for the whole bank is not
    real coverage of the skill.
  - **At least one literature extract per prescribed work** - CBSE's
    extract-based question is primarily how poems get tested, so a poem
    with zero `comprehension-set@1` coverage is missing its main
    assessment shape.
- `semantic-descriptive@1` - short/long answers with real, enumerable
  content (a reading-comprehension "how does X contribute to Y" 2-mark
  answer, a literature "why does the poet compare..." 4/6-mark answer).
  Rubric-size per `docs/descriptive-questions-and-cbse-marks.md`, same as
  any other subject.
- `semantic-descriptive@2` - writing-skill tasks. Read `docs/writing-
  skills-rubric.md` first - primary type for that shape, not `@1`.
  **Cover all five CBSE writing genres** (notice, formal letter, informal
  letter, dialogue, descriptive paragraph), each with its own `writing-*`
  `topicId` below - a real run covered only two genres and produced 4
  total `semantic-descriptive@2` questions for a 5-genre skill.

**Literature extracts may quote verbatim** - the narrow exception noted in
section 8's Content bullet and `docs/copyright-and-sourcing.md`; read that
doc's `comprehension-set@1` section before writing one.

### `topicId` - section label vs. the id you write on a question

Matrix row / section label != `topicId`. A shared label reused as `topicId`
on every question in a section is a real observed bug (`reading-
comprehension-factual` on every pottery-craft/elder-welfare/vocabulary item
alike, leaving nothing for a practice-test builder to filter on).

- **Writing**: `writing-notice`/`writing-formal-letter`/`writing-informal-
  letter`/`writing-dialogue`/`writing-descriptive-paragraph` are section
  labels only (matrix rows, mandatory-five-present check), not `topicId`s.
  `topicId` is the real scenario per item, per the bank header's writing
  focus (e.g. "formal letter to the editor (adult literacy)" ->
  `writing-formal-letter-adult-literacy`) - a genre's 2-3 practice prompts
  each need a distinct id, never one shared across different letters/
  notices/dialogues. The mandatory-five-genre check reads the section-label
  prefix, not a single exact-match id.
- **Grammar/Vocabulary**: `grammar-cloze-mcq`/`grammar-error-correction`/
  `grammar-sentence-reordering`/`vocabulary-synonym-antonym` are section
  labels only. `topicId` is the specific grammar point or vocab focus it
  drills, per the bank header's chapter breakdown (e.g. "Grammar: past
  perfect tense" -> `grammar-past-perfect-tense`) - one row spans several
  `topicId`s, expected. Don't apply the `>=6/topic` floor to these finer ids
  (2-4 each is fine); never invent an untraceable catch-all
  (`grammar-complex-syntax`) - fold into a header-named point or add the
  missing point to the header first (see Source step).
- **Reading comprehension**: same fix - `topicId` is the passage's own
  theme (`reading-pottery-craft`), never the shared `reading-comprehension-
  factual`/`-inferential` bucket (a comprehension-level label, not a
  content identity). Those two stay valid as section labels only.

Literature already does this right: a per-work `topicId`
(`the-road-not-taken`) is the actual id, distinct from any section label.

### Relative depth across sections - don't apply one flat floor everywhere

A science/SST bank's per-topic floor scales naturally with chapter count;
English has no such driver, so the same flat "~6/topic" floor distorts the
bank's real balance - a real CBSE class 9 English paper weights its four
sections roughly Reading 20/80, Writing 24/80, Grammar 10/80, Literature
26/80.

Size each section's total question count to track that weighting, not a
uniform per-topic count - Literature and Writing (all five genres) should
end up the bank's two largest sections, Grammar the smallest.
