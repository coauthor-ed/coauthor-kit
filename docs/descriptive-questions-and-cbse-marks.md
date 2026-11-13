# Descriptive Questions and CBSE Mark Schemes

`semantic-descriptive@1` is the **primary question type for social-studies content** (history, civics, geography, economics) and for any CBSE chapter whose exam leans on 2/3/5-mark descriptive answers. Plan for it from the outline stage, not as a fallback.

## Sizing the rubric to the marks

CBSE marking schemes score an answer as a checklist of distinct points - one `rubric[]` entry per mark point. Grade-10/12 board model answers are a reliable proxy for how examiners structure the same question type at grade 9; use that knowledge to shape the rubric.

- **2 marks** -> 2 rubric points.
- **3 marks** -> 3 rubric points. Common CBSE shape: "state/explain any three ___".
- **5 marks** -> 4-5 rubric points (e.g. one intro/context point + 3-4 substantive ones). A question with explicit (a)/(b)/(c) sub-parts is usually better split into separate lower-mark questions.

`accepted[]` should include real CBSE model-answer phrasing (short keyword/phrase form) for matching - `label`/`level1`/`clue` stay in your own words (never copied verbatim - `docs/copyright-and-sourcing.md`).

## Quality bar

Every string here (`label`, `level2Template`, `level3` text, `accepted[]`) is what the student learns to write in the exam - formal CBSE model-answer prose, never casual. E.g. "This ensures political power does not concentrate in a few hands," not "This basically means power doesn't just pile up with a few people."

## `level3`

Should read as one coherent model answer once built, not a keyword dump - `rubricId: null` segments carry the connecting prose, one `rubricId` segment per rubric point, in model-answer order.

**Every `accepted[]` entry must read grammatically in the blank** - the modal accepts any of them, not just the first. Substitute each into `___`, read the whole sentence, reword until all fit (same part of speech across `accepted[]` makes this easy).

## `mode`: coach vs. full-answer

- Omitted / `"full-answer"` (default): free-text answer, graded, then scaffolded. Use for **end-of-lesson review and test/exam bank questions**.
- `"mode": "coach"`: skips straight to the guided fill-the-blanks build (`level3` required). Use for a **question embedded mid-lesson**, right after the concept is taught - the student co-builds the answer instead of composing it unprompted.

```json
{
  "id": "q-l02-s05",
  "type": "semantic-descriptive@1",
  "mode": "coach",
  "prompt": { "en": "..." },
  "rubric": [ /* same shape either way */ ],
  "level3": [ /* required in coach mode */ ]
}
```

Common pattern: author one rubric + `level3` for a concept, reference it from two question files differing only in `mode`/placement - a `"coach"` instance wired mid-lesson, a `"full-answer"` instance held for review/test bank. Don't duplicate every question this way - most of a chapter's embedded questions should be distinct concepts; review/test-bank questions can draw more broadly.

## Hard numerical/derivation answers: `explanationSlide`, not a longer `level3`

`level3`'s guided-build is for reconstructing a *prose* model answer - it isn't the place for a multi-step numerical derivation. When a question (this type or any other) needs that, add `explanationSlide` instead of stretching `explanation` into a wall of text: one or more ordinary blocks under `explanations/L0N/`, each with real `markdownRef` prose and, if it helps, a `simulation` - see `SKILL.md`'s "Question explanations backed by real slides" section. This is also the answer to where a worked derivation's *diagram* goes: attach it to the explanation slide, never to the question's own `simulation` field (a simulation only labels - `AGENTS.md` rule 11).

See `examples/example-question-semantic-descriptive.json` for a full worked shape.

## Math-heavy and step-by-step answers: `answerMode` and `expectedMath`

`semantic-descriptive@1` is also the type for a step-by-step maths/physics/chemistry proof or derivation, not just prose - one `rubric[]` point per step, same sizing rule as above (a 4-mark derivation gets 4 rubric points, one per step). The student writes their whole derivation as one free-text answer, one step per line - the scorer already splits on line breaks and scores each rubric point against whichever line(s) match best, so steps don't need to be in a fixed order or format.

For such a question, set `"answerMode": "math"` on the question. This turns on the subscript/superscript toolbar and equation composer for the student and enables symbolic-equivalence scoring below. Leave it unset (or `"text"`) for prose answers - everything else in this doc still applies unchanged.

Optionally add `expectedMath` (a LaTeX string) to a rubric point that is itself a single equation/inequality the student states directly (not a step that requires the reader to expand or simplify to verify). If the student's answer contains a `$...$` span that matches it up to reordering (commutative Add/Multiply), that point scores full credit regardless of exact wording or term order. **This checks reordering, not algebraic simplification** - `(x_1-x_2)^2` and `(x_2-x_1)^2` are NOT recognized as equivalent (that needs expansion), and `x_1^2 - 2x_1x_2 + x_2^2` is NOT recognized as equivalent to `(x_1-x_2)^2` either. Only add `expectedMath` to a step where the real risk is reordering/relabeling, not one that requires verifying an expansion - leave those to `accepted[]`/`level2Template` like any other rubric point (the scorer's embedding match already handles paraphrased-but-correct prose well).

Variable naming in `expectedMath`: use `v_1`, `x_2` (LaTeX subscript) for a subscripted variable. Do not use an un-subscripted multi-letter name like `KE` - the scorer reads adjacent letters as multiplication (`K * E`), not one symbol.

**Step-chain check (automatic, nothing to author).** An `expectedMath` match only proves the target equation appears somewhere in the answer, not that the derivation getting there is sound - each line of an inequality chain can be true on its own even when it does not actually follow from the line before it, so a dropped term partway through can still land on every checkpoint's correct target. The scorer also checks each consecutive pair of `$...$` spans for a recognized move (same quantity added/subtracted both sides, both sides scaled by the same factor, squaring/rooting both sides, or a zero-delta restatement/factoring). A checkpoint keeps its automatic full-credit match only if every span before it in the answer is unbroken this way; otherwise it falls back to the normal `accepted[]`/embedding scoring for that point and the student sees a caution pointing at the first broken or unparseable step. This is a fixed small set of recognized moves, not a full proof checker - a valid step outside that vocabulary can get flagged as unverified, and a rubric that branches into independent sub-derivations rather than one straight chain is not a good fit for it. It only ever withdraws the automatic shortcut, never scores lower than the normal tiers would.

Only `$...$` spans that are themselves a full relation (`=`, `<`, `<=`, `>`, `>=`) count as chain steps. A bare quantity named inline mid-sentence - e.g. "Adding $4x_1x_2$ to both sides" - is not a step and is skipped, not compared against its neighbors. A student is free to name intermediate quantities this way without it looking like a broken link.

**Never use `expectedMath` on a geometry rubric point.** The equivalence/step-chain checks above run on a real algebra engine that reads `AB`, `\angle ABC`, `\triangle ABC \cong \triangle PQR` as algebra, not synthetic-geometry notation - `AB = AC` parses as the product `A*B = A*C`, and `\angle`/`\triangle`/`\parallel`/`\perp` are not recognized commands at all. This can produce a false "could not be checked" caution on correctly written geometry notation, or (for a proportion step like `AB/PQ = BC/QR`) a false "broken step" on a genuinely correct proof, since every letter becomes its own free variable to the checker. Grade geometry proofs (angle-chasing, congruence, similarity, circle theorems) on the plain `accepted[]`/embedding tier only - either omit `answerMode` or set it to `"math"` purely for the equation-toolbar convenience, but do not add `expectedMath` to any rubric point whose target is a geometric relation rather than an algebraic one. For the figure a geometry question needs, and how a student types angle/degree/triangle symbols in their own answer, see `docs/geometry-diagrams.md`.

**Numeric-consistency check (automatic, nothing to author).** Any rubric point graded on the plain accepted[]/embedding tier - which for a geometry proof is every point, per the rule above - also requires the number named in the matched accepted[] phrase to appear in the student's matched text, including inside a `$...$` span. A sentence embedding alone cannot tell "...= 180 - 135 = 45" from a student's own "...= 180 - 135 = 35" apart (near-identical wording, different digit) and would otherwise score the wrong one as a full match. Write the correct number as a digit in accepted[] (not spelled out in words) - spelled-out numbers are not recognized.

**Notation/spacing variants are the scorer's job, not yours.** accepted[] does not need a spacing variant per expression ("x^2+y" vs "x^2 + y") or both a LaTeX and Unicode form for the same symbol ("\sqrt{2}" vs the Unicode root sign) - matching normalizes both before comparing. Just keep each accepted[] entry in the exact final form a correct answer would state it.

See `examples/example-question-semantic-descriptive-math.json` for a full worked shape (AM >= GM, 4 steps, two using `expectedMath` and two relying on `accepted[]` - read its README.md entry for which is which and why).

`answerMode`/`expectedMath` are additive - not shown in `examples/example-question-semantic-descriptive.json` since that example is prose-only, but allowed alongside the fields shown there.

## Verify the rubric itself, not just the prompt

Three real grading complaints, all from rubrics that looked reasonable on first read:

- A checkpoint asserted a fact specific to the given figure/numbers (which arc is reflex) that was backwards for this question's own diagram - recompute claims like "which arc/root/case applies" from the actual given diagram/numbers before writing accepted[], don't pattern-match a remembered theorem phrasing.
- A "prove that ___" prompt named no method, but the rubric only recognized one (coordinate geometry) - an equally valid alternate proof (synthetic) matched no checkpoint. Name the method in the prompt if you require one; otherwise accepted[] must recognize other standard methods' milestones too.
- A step usually *shown* by the working (terms silently dropped after a full expansion) rather than *stated* ("cancels to 0") had accepted[] built around only the verbal phrasing - add an entry for the computational form too when a step is normally demonstrated, not written out.

Before calling a rubric done, mentally grade the most likely correct *alternate* answer against it, not just the one you drafted the rubric from.
