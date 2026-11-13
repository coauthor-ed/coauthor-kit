---
name: content-authoring
description: Use when writing or editing any lesson, block, question, module, or question-bank JSON file in this content repo. Provides the JSON conventions, the current valid content-type list, directory layout, and the self-check step - condensed from the source engine repo's own authoring guide so this repo needs no other context to author correct content.
---

# Content Authoring - CoAuthor Content Repo

## Core conventions (checked by the validator)

1. Flat over nested - arrays of small flat objects, not deep trees.
2. Enums over free text for any closed-set field (`difficulty`: `easy|medium|hard|olympiad`, `bloomLevel`).
3. One concept per file - one question = one JSON file; one lesson references its blocks via `blockRef` paths, never inline.
4. Self-describing `"type"` on every content unit - leaf block/question types are versioned (`"name@version"`, e.g. `content-block@1`); structural container types (`lesson`, `module`, `exam`, `course`) are not (`"type": "module"`, never `"module@1"`).
5. Every learner-facing string is `{ "en": "..." }`.
6. Default to a sibling `.md` file for `markdown`/`prompt` text (`markdownRef`/`promptRef`), not inline - see "Prose in a sibling .md file" below. Write the `.md` file first, then the JSON that points at it.

Before writing that `.md` file (or an inline `markdown`/`prompt` field), read `docs/voice-and-tone.md` (not validator-checked) - `examples/blocks/*.json` model it.

## Directory layout for a course bundle

```
courses/<bundle-name>/
  modules/<module-id>.json       # composes an ordered list of lessons for one chapter
  lessons/les-NN.json            # one lesson = one JSON file, blocks referenced by path
  blocks/L0N/blk-lNN-sMM.json    # one file per lesson slide/beat
  blocks/L0N/blk-lNN-sMM.md      # sibling prose file for that block - the default home for markdown/prompt
                                  #   text (markdownRef/promptRef), see "Prose in a sibling .md file" below
  questions/L0N/q-lNN-sMM.json   # question files, same per-lesson folder convention - q- prefix, not blk-
  explanations/L0N/exp-*.json    # optional worked-solution blocks for a question's explanationSlide - never
                                  #   part of the lesson's own flow, see "Question explanations" below
  tests/                         # test/exam definitions (if any)
  banks/bank-<bundle>.json       # question-bank@1 index - see "Question banks" below and
                                  #   docs/question-bank-generation.md; one bank per bundle
  questions/bank/q-bank-*.json   # bank question files - flat, not lesson-scoped (never questions/L0N/)
  explanations/bank/exp-*.json   # bank question worked-solution blocks, parallel to explanations/L0N/
  media/L0N/                     # images referenced by blocks/questions in that lesson
  simulations/L0N/               # course-exclusive simulation JS, per-lesson - see docs/simulation-authoring.md
  OUTLINE.md                     # staged-generation working outline - see docs/staged-generation.md
  BANK-PLAN.md                   # question-bank staged-generation working plan - see docs/staged-generation.md
  FIGURES.md                     # notes on inspected source figures - not published content, see AGENTS.md rule 8
  GENERATION-LOG.md              # your running authoring log - not published content, see AGENTS.md rule 8
  manifest.json                  # generated last, lists this bundle's modules/lessons/tests/banks
```

Numbers are always zero-padded to 2 digits: `L01`/`s01`/`les-01`, combined `L02S03` - never `L1`/`s1`/`L2S3`. Prevents `s10` sorting before `s2`.

## Valid content types (do not invent others)

**Structural** (unversioned, bare word): `lesson`, `module`, `exam`, `course`. This kit only has you author `lesson` and `module` (`exam`/`course` are assembled later). Get the string wrong (`"module@1"`) and the file is invisible to both the validator and the app - neither does fuzzy matching.

`module.json` needs `id`, `moduleId` (usually = `id`), `type: "module"`, `curriculumAlignment`, `pedagogicalProfile.themeTags` - see `examples/example-module.json`.

**Blocks** (`registry/blocks.json` in the engine repo): `text-block@1`, `content-block@1`, `poe-predict@1`, `poe-observe-sim@1`, `poe-explain@1`, `diagram-explore@1`, `mini-game@1`

- `content-block@1`: `{ id, type, markdownRef: "blocks/L0N/blk-lNN-sMM.md" }` - default form; the older inline `{ markdown: { en: "..." } }` still works but isn't what to reach for (mutually exclusive with `markdownRef` - see "Prose in a sibling .md file" below). Optional `simulation: { src, position }` attaches a beat-synced scene (`src` bundle-relative, same convention as `image.src`; `position`: `"right"|"left"|"above"|"below"`, default `"right"`); optional `mediaStep`/`simulationStep` (0-indexed beat) delays first appearance. See `docs/simulation-authoring.md`. Optional `photoDiagram` (mutually exclusive with `image`/`simulation`) attaches a static real-photo relationship diagram instead - see `docs/photo-diagrams.md`. Optional `graph` or `diagram` (also one medium per block) attaches a static graph or geometry figure revealed beat by beat (`revealAt` per item) - see `docs/graphing-and-plotting.md` section 3, `docs/geometry-diagrams.md`.
- `poe-predict@1`: `{ id, type, promptRef: "blocks/L0N/blk-lNN-sMM.md", options: [{id, text}], correctOptionId }` - default form; inline `prompt: "..."` is a plain string here, not `{en:...}` (the string-vs-`{en}` split is a mount-time detail, not an authoring one - its ref is still a `.md` file either way). Optional `deferVerdict: true` - see below before using.
- `poe-explain@1`: `{ id, type, promptRef: "..." }` (or inline `prompt: { en: "..." }`) - explanation card with progressive beat disclosure. Auto-recalls a preceding `deferVerdict: true` predict block.
- `poe-observe-sim@1`: requires top-level `src` (a real simulation scene file). `promptRef`/`prompt` optional. Also implements the `deferVerdict` recall.
- `diagram-explore@1`: requires `diagramRef` pointing at a hotspot-diagram manifest.
- `mini-game@1`: `{ id, type, src: "simulations/L0N/<Game>.js", objective?: { en }, xp? }` - the lesson's challenge-slot game (`docs/mini-games.md`). Top-level `src` (not `simulation`), a challenge scene (`withChallenge(...)`); it mounts once with no beats and shows no prose, so the setup text goes on the slide before it. Never a `content-block@1` holding a game scene: that loses the objective, the verdict, Quill and the XP.

### Predict -> Observe -> Explain: the `deferVerdict` handoff

`poe-predict@1` normally reveals "Correct!"/"Incorrect." instantly. `"deferVerdict": true` suppresses that and hands the reveal to **the very next block** in the lesson's `blocks` array - only three shapes implement catching it: `content-block@1` with `"poeRole": "observe"|"explain"`, `poe-observe-sim@1`, or `poe-explain@1`. Any other block immediately after silently drops the verdict - no error anywhere, the student just never sees it confirmed.

- Deferred reveal: the next block must be one of the three shapes above. See `examples/blocks/blk-example-s02.json` -> `blk-example-s03.json` for a working pair.
- Free-standing step that isn't the recall point: don't set `deferVerdict` at all - let it reveal inline.
- The recap normally renders at the top of the recall block. On a `content-block@1` with `poeRole` set, use `poeRecapStep` (0-indexed int, same convention as `mediaStep`) to place it at a specific beat instead - e.g. after a setup beat rather than before it. Not available on `poe-explain@1`/`poe-observe-sim@1`, which always show it immediately.

`validators/validate.mjs` catches a mismatched pairing when you validate the lesson file (it resolves `blockRef`s), but know the rule directly rather than relying on that.

**Questions** (`registry/questions.json`): `mcq-single@2`, `numeric-value@1`, `fuzzy-descriptive@1`, `drag-match@1`, `equation-input@1`, `diagram-hotspot@1`, `diagram-label@1`, `sequence-order@1`, `match-categorize@1`, `fill-blank@1`, `fill-blank@2`, `statement-judgment@1`, `semantic-descriptive@1`, `semantic-descriptive@2`, `plot-function@1`, `assertion-reason@1`, `comprehension-set@1`, `error-correction@1`, `math-workspace@1` (maths answers: steps, forms, sets, slots - see `docs/math-workspace.md`) (`molecule-drag-match@1` is a legacy alias for `drag-match@1` - never author it, it's kept only so old content keeps loading; `structured-descriptive@1` is **deprecated - never author it**, its negation-aware keyword-pattern scorer produces unreliable grading in practice, `validators/validate.mjs` hard-fails any file still using it - convert to `semantic-descriptive@1` instead, see `docs/descriptive-questions-and-cbse-marks.md`)

See `examples/example-question-mcq.json` / `example-question-numeric.json` for the two most common shapes, and `examples/example-question-match-categorize.json` for `match-categorize@1` (`stem`, `categories`, `chips`) - classification exercises. For any other type, match existing engine-repo content - ask rather than guess at an unfamiliar one's fields.

The CBSE formats below (assertion-reason, the 2/3/5-mark and writing-skill uses of semantic-descriptive, cloze, error-correction) are school-board shapes; a non-school audience card may set them aside (`packs/audience/`).

`assertion-reason@1`: CBSE Assertion/Reason format - `{ assertion: {en}, reason: {en}, correctOptionId }`, letters `a`-`d` (`optionSet: "standard5"` adds `e`). Never author `stem`/`options`; the CBSE option texts are fixed in the plugin. Optional `optionFeedback: {b,c,d}` gives per-wrong-letter feedback instead of a generic "Incorrect." - `explanation` is separate, always shown regardless of correctness. See `examples/example-question-assertion-reason.json`.

`semantic-descriptive@1` is the **primary type for social-studies chapters** and CBSE 2/3/5-mark descriptive answers generally - rubric-graded free response, tiered nudge -> clue -> guided-build scaffold, optional `mode: "coach"` for a mid-lesson (vs. review/test) instance. Read `docs/descriptive-questions-and-cbse-marks.md` first. See `examples/example-question-semantic-descriptive.json` for the shape. For a maths/physics/chemistry equation, derivation, or step-by-step proof answer, set `"answerMode": "math"` and see that doc's "Math-heavy and step-by-step answers" section (`examples/example-question-semantic-descriptive-math.json` for the shape) - do not use `equation-input@1` for a mostly-prose proof, it is for answers that are a single equation only.

`semantic-descriptive@2` is the **primary type for CBSE writing-skill tasks** (notice/letter/dialogue/paragraph) - a strict superset of `@1` adding `wordLimit` (live counter + scored compliance band) and `formatChecks[]` (regex presence rules - heading/salutation/date/signature - scored with no model load). `rubric` still works exactly like `@1` for whatever content the prompt itself enumerates, and may be an empty array for a pure format/word-limit question. Read `docs/writing-skills-rubric.md` first - it is not a fallback of `@1`, it is the type for this content shape. See `examples/example-question-semantic-descriptive-v2-writing.json`.

`comprehension-set@1` is a **shared-stimulus, multi-part question** - one passage/source/extract plus several dependent sub-items (each an ordinary question of any other registered type: `mcq-single@2`, `fill-blank@2`, `semantic-descriptive@1`/`@2`, ...), rendered as one unit and scored as a weighted composite. Not English-only - use it for CBSE reading-comprehension passages, extract-based literature questions, **and any subject's case-based/source-based questions** (an SST source note quoting Locke/Montesquieu, a geography extract, a data table with sub-questions - see `docs/question-bank-generation.md`'s "Shared-stimulus / case-based questions" section). Never author 6-8 near-duplicate standalone questions that each re-paste the same stimulus into their own `stem`/`prompt`. When planning a bank (`docs/question-bank-generation.md`), this type gets its own separate "Comprehension sets" list sized by how many distinct passages/extracts/sources the bank needs - never squeeze it into the per-topic coverage matrix as a same-shape type column, which under-covers whatever skill it represents (see that doc's section 8 for why). See `examples/example-question-comprehension-set.json` (English) and `examples/example-question-comprehension-set-case-study.json` (SST). The stimulus is original synthesis by default, same as everywhere else in this kit - only an English literature extract may quote the prescribed text verbatim in `passage`, a narrow, scoped exception, see `docs/copyright-and-sourcing.md`.

`fill-blank@2` adds an optional `options[]` per blank (renders as a fixed multiple-choice select instead of a free-text input) - use for a CBSE cloze passage ("choose the most appropriate option"), never `fill-blank@1`, for that shape. Matching/scoring is otherwise identical to `@1`. See `examples/example-question-fill-blank-cloze-mcq.json`.

`error-correction@1` is the CBSE "the passage has not been edited, one error per line" editing task - `lines[]`, each `{ text, incorrectWord, correction }`; the student identifies the wrong word and supplies its fix, scored per line (half credit each for identification vs. correction). See `examples/example-question-error-correction.json`.

Graphing/coordinate-plane exercises: use `plot-function@1` or the read-only `graph` companion field, not a simulation - see `docs/graphing-and-plotting.md` and `examples/example-question-plot-function.json`/`example-question-graph-field.json`. Includes a plain Coordinate Geometry question with no function at all (quadrant/reflection/midpoint/distance/collinearity) via `graph.points[].label` - see `examples/example-question-graph-labeled-points.json`. A piecewise line or a shaded area under a curve (work, displacement) is `graph` too (`functions[].points`, `fill`) - `examples/example-question-graph-area.json`.

A geometry question with a labeled synthetic figure (a triangle, angle-chase, circle/sector, quadrilateral) uses the `diagram` companion field, not a simulation or static image - the engine draws an original SVG from plain `points`/`segments`/`circles`/`angles` JSON. See `docs/geometry-diagrams.md` and `examples/example-question-semantic-descriptive-geometry.json`. Supported on `mcq-single@2`, `numeric-value@1`, `semantic-descriptive@1`/`@2`, `statement-judgment@1`, and most other question types - mutually exclusive with `image`/`simulation`/`graph`.

## Question banks (`question-bank@1`)

Not a question type - an **index** of questions sourced from the chapter
directly, never from an authored lesson. Full procedure:
`docs/question-bank-generation.md`. Validated by `validateBankLocal()` in
`validators/validate.mjs`, not a plugin schema.

```json
{
  "id": "bank-<bundle>",
  "type": "question-bank@1",
  "subject": "biology",
  "grade": 9,
  "chapterId": "cells",
  "title": { "en": "Cells - Practice Question Bank" },
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

`grade` is optional: a school bank uses the class number, a non-school bank omits it or uses a short level (`"UG"`).

`questions[].ref` points at an ordinary question file under `questions/
bank/` (never `questions/L0N/` - a bank question isn't tied to any one
lesson). `weight` is the question's mark value (lives on the bank entry,
not the question file); `estimatedTimeSec` and `difficulty` live on the
question file itself and are just denormalized here. See `examples/
example-bank.json`.

**A `hard`/`olympiad` question requires a real `explanationSlide` - a short
`explanation` one-liner alone fails validation at those two difficulties.**
See "Question explanations backed by real slides" below for the mechanism;
`docs/question-bank-generation.md` states the step-by-step/simulation
criteria in full.

## Prose in a sibling `.md` file (default - do this, not inline)

Write `markdown`/`prompt` text into a sibling `.md` file and point the JSON at it with `markdownRef`/`promptRef` - **this is the default way to author prose in this kit**, not an optional alternative. Bundle-relative, same convention as `image.src`/`simulation.src` (anchored at the bundle root, not the referencing file - so `blocks/L01/blk-l01-s01.md`, never `./blk-l01-s01.md`). Same basename as the JSON, `.md` extension, same folder, is the convention.

```json
{
  "id": "blk-l02-s03",
  "type": "content-block@1",
  "markdownRef": "blocks/L02/blk-l02-s03.md",
  "authoring": { "status": "ai-draft", "flags": [], "reviewedAt": null }
}
```
```
<!-- blocks/L02/blk-l02-s03.md -->
A right triangle's two legs form the sides of two smaller squares...
```

Notes for later authors and agents go in the `.md` as an HTML comment on its own lines, e.g. `<!-- AUTHOR NOTE: why this slide exists, what to keep -->`. It renders to nothing and is never a beat. Keep it short, no `$` maths inside, and never start it with `STEP`, `CUE:` or `KEY:` (engine markers). Put it at the end of the file.

The JSON counterpart is a `"_comment"` key: a plain string (not `{en}`, it is never shown), ignored by the engine and the validator. Put one right after `"type"` (what the item shows, when to copy it) and, on a multi-part item such as `math-workspace@1`, one per part right after `"shape"` (which fields matter and why). One or two sentences, ASCII only, never the answer in words a reviewer might mistake for the key. Every item in `courses/math-workspace-showcase/` is commented this way.

Inline `markdown: { "en": "..." }` / `prompt: { "en": "..." }` (or, on `poe-predict@1`, a bare `prompt: "..."` string) still works untouched and stays valid - existing content is not migrated - but it isn't what to reach for when writing something new. Save it for a genuinely trivial one-liner that isn't worth a separate file. Inline and ref are mutually exclusive on one block: never author both `"markdown": { "en": "..." }` and `"markdownRef": "..."` on the same file - pick one; inline wins at runtime if you accidentally leave both, but the validator FAILs it either way.

## Attaching a static image

Use the `image` field - never a markdown image link (`![alt](url)`) inside a `markdown`/`prompt`/`stem` string (or its `.md` file). The engine does render markdown, but doesn't resolve a bundle-relative path written inside it - that syntax just shows as literal text and the image never appears.

`image: { src, alt, caption?, credit?, license?, position? }` (`credit`+`license` render in the caption for CC BY attribution; NC/ND licences are refused) - `src` bundle-relative under `media/L0N/`, same convention as `simulation.src`; `position`: `"right"|"left"|"above"|"below"`, default `"right"`. Supported on `content-block@1`, `poe-predict@1`, and most question types (`mcq-single@2`, `numeric-value@1`, ...), mutually exclusive with `simulation`/`graph`/`diagram`/`photoDiagram`.

For several real photos that need to be visible *at once* with labelled connections between them (a food web, a species comparison) - not a single photo, and not a sequence `reveal.images` could show one-at-a-time - use `photoDiagram` on `content-block@1` instead: real photos in tinted rings plus an engine-drawn connector layer, from plain JSON, no custom scene. See `docs/photo-diagrams.md`.

```json
{
  "id": "blk-l02-s03",
  "type": "content-block@1",
  "markdownRef": "blocks/L02/blk-l02-s03.md",
  "image": {
    "src": "media/L02/right-triangle-squares.svg",
    "alt": "A right triangle with a square built on each of its three sides",
    "position": "right"
  },
  "authoring": { "status": "ai-draft", "flags": [], "reviewedAt": null }
}
```
```
<!-- blocks/L02/blk-l02-s03.md -->
A right triangle's two legs form the sides of two smaller squares...
```
Not `![diagram](media/L02/right-triangle-squares.svg)` written into that `.md` file (or into an inline `"markdown": { "en": "...\n\n![diagram](...)..." }`) - that's markdown link syntax; the engine renders it, but doesn't resolve the bundle-relative path inside it, so the image never appears.

## Question explanations backed by real slides

`explanation` stays the short, always-shown one-line takeaway. For a hard question that needs a real worked solution, add `explanationSlide` instead of stuffing prose into a simulation (`AGENTS.md` rule 11). **Mandatory, not optional, on any question with `difficulty: "hard"` or `"olympiad"`** - the validator hard-FAILs a `hard`/`olympiad` question with no `explanationSlide` set. For `easy`/`medium` it stays optional, same as before.

```json
"explanation": { "en": "Work done is force times displacement in the force's own direction." },
"explanationSlide": {
  "presentation": "inline",
  "blocks": [
    { "blockRef": "explanations/L02/exp-q-l02-s01.json" }
  ]
}
```

The referenced files are ordinary `content-block@1` blocks under `explanations/L0N/` (not `blocks/L0N/` - that's what keeps them out of the lesson's own flow and progress count; nothing scans directories at runtime, so a file not referenced from a question's `explanationSlide` is simply unreachable). They get `markdownRef`/`image`/`simulation` for free, same as any other block - this is the point: the explanation gets prose *and* a visual aid, without the simulation itself ever having to explain anything. `presentation`: `"inline"` (default) shows them behind a disclosure in the feedback area; `"slide"` opens a full overlay - use it for a multi-block worked solution. Validate the question file the normal way; a dangling `explanationSlide.blocks[].blockRef` is a hard FAIL, and a referenced-only-from-a-question block is never reported as orphaned.

**Never reference an `mcq-single@2` option by letter/position in `explanation`/`hints`** ("option b", "the first choice") - `options[]` shuffles for display and the UI shows no letter. Describe the option's content instead, or use its own `feedback` field (id-keyed, shuffle-safe). See `docs/question-bank-generation.md` section 3.2. (`assertion-reason@1` is exempt - never shuffled.)

## Self-check, every time

```
node validators/validate.mjs courses/<bundle>/lessons/les-01.json
node validators/validate.mjs courses/<bundle>/questions/L01/q-l01-s01.json
node validators/validate.mjs courses/<bundle>/modules/<module-id>.json
node validators/validate.mjs courses/<bundle>/questions/bank/q-bank-01.json
node validators/validate.mjs courses/<bundle>/banks/bank-<bundle>.json
```

Always include the lesson file itself - only lesson-level validation resolves `blockRef`s, which is what catches the `deferVerdict` handoff and **orphaned questions** (a file in `questions/L0N/` not wired into the lesson's `blocks` array is never shown to a student, no error at the file level).

Don't skip the module file - it's the only check for a missing `moduleId` or empty `lessons` array, and neither looks broken to a human skimming the JSON.

Fix every reported `FAIL`. See `validators/validate.mjs`'s header comment for exactly what it does and doesn't check.

## Simulations that advance with the slide's beats

Default to one per slide - the platform's actual differentiator, not a bonus (`AGENTS.md` rule 10). Static image only when a real photo/diagram genuinely fits better - a world/country map is `SimGeo.js` (below), not a static image or hand-drawn polygons. Social-studies subjects: see `docs/simulation-authoring.md`'s "For non-science subjects" section.

Keep the scene nearly wordless - labels/callouts only, never explanatory prose (`AGENTS.md` rule 11); the *why* goes in the slide's `markdown`.

A scene attached from several different blocks gets a fresh, memory-less mount each time - never design one assuming it remembers an earlier slide (`docs/simulation-authoring.md`'s cross-mount rule).

A block can also show a different image per beat (`reveal.images`) and hand off to a live simulation partway through (`simulationStep`) - see docs/simulation-authoring.md's hybrid section before building a simulation for what's actually a sequence of pictures. If a scene would ship with `CONTROLS: []` and no live process - just a `data-step` attribute flipped on beat change - stop: that's `reveal.images` territory, not a simulation, even when several real photos need to be visible at once with connecting labels (that's `photoDiagram` - docs/photo-diagrams.md - not a hand-coded DOM layout) - see simulation-authoring.md's "The `CONTROLS: []` smell" section.

A canvas scene extends `SimScene` from the look kit (`simulations/base/kit/SimScene.js` + `SimLook.js`: chips via `chipRow`, `ZONES` layout, faces, confetti, `busy()`, `after()`) - `docs/simulation-authoring.md` #4.6, reference `examples/simulations/LookKitShowcaseScene.js`.

A `DomSimulation` is written with the DOM scene kit (`docs/dom-scene-kit.md`): `this.render({ html, css })`, `sim-*` component classes, `--sim-text-*`/`--sim-space-*` tokens, shared boards under `simulations/base/kit/`. Run `tools/sim-test/check-scene.mjs` on it before finishing (every gate, sim-lint and sim-layout included; `AGENTS.md` rule 14).

See `docs/simulation-authoring.md` for the full guide, `examples/simulations/TriangleHalfParallelogramScene.js` for a working example, and `simulations-kit/preview-harness.html` to preview a scene standalone (open directly in a browser). Short version: `content-block@1`'s `data.simulation.src` attaches a scene; the scene's optional `onBeatChange(beatIndex, beatCount)` is called on every text-beat change so its visuals can track the lesson's argument. Read the full guide before attempting this - beat-to-scene-step mapping, dwell-based auto-advance, and control-locking are easy to get wrong by guessing.

**Mini-games**: one per lesson in the Challenge slot. Must clear tie level L2 - the win condition IS the concept's rule, not a label on a game object. No timers; retries free. A new game defaults to `DomSimulation` (Quill's SVG rig drops in via `SimMascotDom`, and `var(--sim-*)` needs no token map). See `docs/mini-games.md`.

**Pick the base class by content shape** (`docs/simulation-authoring.md` #3's full table) - this is the decision agents get wrong most often, reaching for canvas out of habit even for content that's really just boxes and labels:

| Visual is... | Base class |
|---|---|
| boxes, arrows, labelled panels, tables, timelines, comparison layouts | `DomSimulation` |
| continuous motion, geometry, particles, physics-like animation | `CanvasSimulation` |
| real world/country maps | `SimScene` + `GeoMap` + `SimGeo` layers (India's border: Survey of India layer only) |
| geology cross-section | `SimScene` + `GeoMap.drawStrataBlock` |
| earth/landscape where height, rotation or depth is the point | `GeoScene` (at most one per lesson) |
| other 3D (molecules, solids) | `WebGLSimulation` |

`DomSimulation` scenes build real DOM/CSS inside `this.root` - `var(--sim-...)` tokens directly in injected CSS (no `readSimColors()`), and usually no `_tick`/frame loop at all (CSS transitions do the animating, keyed off a `data-step` attribute). They're exempt from `tools/sim-test`'s canvas-only draw-call/legibility checks - visual verification is `preview-harness.html` in a real browser. `examples/simulations/ShiftSubtractScene.js` is the worked example to copy; `examples/anti-patterns/` has the failure mode to avoid (absolutely-positioned pixel coordinates reimplementing canvas in DOM).

**Scenes come to rest by default (`static CONTINUOUS = false` on every base class)** to conserve battery and CPU: the loop parks once nothing animates. Declare `static CONTINUOUS = true` only for motion that never ends, with a one-line reason. A default scene must implement `onBeatChange`, call `this.animateFor(ms)` for pointer handlers, timers and any run longer than 8 s, end every run, and avoid the base classes' reserved field names (`_running`, `_rafId`, `_hasStarted`, ...) - all in `docs/simulation-authoring.md` #3.4. A `DomSimulation` with CSS transitions has no loop at all, most of the time.

Base classes: `simulations-kit/src/simulations/base/` - `InteractiveSceneBase`, `SimulationBase`, `{CanvasSimulation, DomSimulation}` (the beat-sync lineage) plus `SimDrawUtils`/`SimTheme`/`SimMotion`/`SimGeo` (real map projections + Natural-Earth land/country geometry - see `docs/simulation-authoring.md` #3.1, never hand-roll polygon coordinates). `CellViewSimulation`/`OrganelleZoomSimulation`/`ParticleSimulation`/`PhysicsSimulation` are NOT vendored here - hand off to the real engine repo if genuinely needed.

**Every `CanvasSimulation` subclass MUST set `static WIDTH`/`static HEIGHT` to match the `W`/`H` constants its drawing code uses.** Default is 600x400; drawing against larger constants without declaring these renders ~1.5x too large with content clipped - on every screen, not a CSS issue. Check for this in the preview harness before moving on (see `docs/simulation-authoring.md` #2.4).

## When you need something this kit doesn't cover

Stop and say so explicitly rather than approximating a new content type - that requires a new plugin in the engine repo. Writing a new simulation *scene* is different - that's fully supported here.
