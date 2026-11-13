# Stage 4 - Module file and whole-chapter validation

Target: the whole chapter; every lesson and scene is done. Output: `courses/<Bundle>/modules/<Bundle>.json`, validation clean, a log section.

With `Part: NN` (START-HERE.md section 0) the target is that part only: one module file per module the part's `OUTLINE.md` names in its lessons' `- Module:` lines (one module if it has none), written as `modules/mod-NN-MM.json` (MM = the module number in the lesson codes), each listing its lessons in order. Validate and lesson-check just that part's lessons (`L<NN>-*`). The part is done when any `modules/mod-NN-*.json` exists.

## Read

1. `node tools/doc-section.mjs docs/generation-playbook.md "6. Write the module" "7. Validate"`.
2. `examples/example-module.json` (shape). `OUTLINE.md`'s `## Lesson list` (order).

## Write-scope

`modules/<Bundle>.json`, GENERATION-LOG.md, `build/` (slide-shots writes there). Other files only to fix a validator error, and no content changes beyond that fix.

## Procedure

1. Write the module: `"type": "module"` (bare word, never `module@1`), `curriculumAlignment`, `pedagogicalProfile.themeTags`, the full ordered `lessons` list. Take the look from the OUTLINE header's `Look: <id>` (no Look line: `bundle.json` `look`, else `profile.json` `look`, else `quill`). Not `quill`: write it as `"look"`, and for `plain` also `"gamification": false`. `quill`: leave `"look"` out (the learner's own look then applies). Never set `"lessonMode"` for plain (it is classic only).
2. Validate everything: `node validators/validate.mjs courses/<Bundle>/lessons/*.json courses/<Bundle>/questions/*/*.json courses/<Bundle>/modules/*.json` and `node tools/staged-generation/lesson-check.mjs <Bundle> <L0N>` for each lesson. Fix every error.
3. `node tools/staged-generation/question-mix.mjs <Bundle>`: if the bundle's correct-option positions are skewed (a WARN), rebalance by reordering `options[]` (the `correctOptionId` follows the option, so no other edit; check no explanation names an option by position).
4. Read the lesson sequence once end to end (lesson titles and slide prose files in order) for a forward reference, or a slide with neither scene nor image that the log does not justify. The validator catches neither.
5. Whole slides (the end-to-end read in the real app): per lesson `node tools/operator/slide-shots.mjs --bundle <Bundle> --lesson les-0N --themes light | grep -E '^(FAIL|PASS)' | head -20` (text only; open no image). Keep its last `PASS|FAIL: ...` line and the grouped FAIL lines. A FAIL means that lesson's `briefs/stage3-slides.md` review is missing or its fixes are not in yet: do not fix it here; list it for the operator. `next.mjs` does not offer Stage 4 while a lesson's latest 3-slides log entry is a FAIL; it prints the fix step instead.
6. Log under `## Stage 4 - Module`: `Model:` line, what the end-to-end read found, and one `3-slides: L0N PASS|FAIL <n>/<m> shots; <top defects>` line per lesson.

Do not run the export (playbook step 8); the operator does that with `node tools/staged-generation/next.mjs --run-export <dir>`.

Report (START-HERE.md section 3) plus: validator results, anything the end-to-end read flagged, and the `3-slides:` lines.
