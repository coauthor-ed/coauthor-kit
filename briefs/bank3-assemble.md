# Stage B3 - Assemble and validate the bank

Target: the bank; every planned question has its file. Output: `courses/<Bundle>/banks/bank-<Bundle>.json`, validation clean.

## Read

1. `node tools/doc-section.mjs docs/question-bank-generation.md "Assemble"` (and the mark-value table it points to).
2. `examples/example-bank.json`, `examples/example-bank-multi-chapter.json` (shapes).

## Write-scope

`banks/bank-<Bundle>.json`, GENERATION-LOG.md, `build/`. Question files only to fix a validator error. Nothing on the lesson track.

## Procedure

1. `type: "question-bank@1"`; one `questions[]` entry per planned question with `{ ref, type, topicId, difficulty, weight, estimatedTimeSec }` copied from that question's file. `weight` from the mark-value table (it lives only on the bank entry); for `comprehension-set@1`, the SUM of that file's `items[].weight`.
2. `chapterId`/`chapterIds` only if confidently known (e.g. from the lesson track's OUTLINE.md); otherwise leave them out for a human.
3. Validate: `node validators/validate.mjs courses/<Bundle>/questions/bank/*.json courses/<Bundle>/explanations/bank/*.json courses/<Bundle>/banks/*.json`. Fix every error.
4. Read the bank once end to end for a `hard`/`olympiad` question without its explanationSlide, or a weight/time that looks copy-pasted. Log under `## Stage B3 - Bank assemble` with a `Model:` line.

Do not export; the operator does.

Report (START-HERE.md section 3) plus: validator results, final count and difficulty mix, and anything the end-to-end read flagged.
