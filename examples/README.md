# About these examples

Real, already-published content (`"authoring.status": "human-approved"`), shown purely for field shapes. **Your own output always starts `"authoring": { "status": "ai-draft" }`** (`AGENTS.md` rule 5) - don't copy `human-approved`.

Block files' prose (`blk-example-s01/s02/s03/s03-explain/sim.json`, each a `markdownRef`/`promptRef` pointing at its sibling `.md` file - see SKILL.md's "Prose in a sibling .md file", the default) follows `docs/voice-and-tone.md` - match prose register, not just JSON shape. Question stems (`example-question-*.json`) are shape references only.

`example-question-numeric.json` and `blocks/blk-example-sim.json` are from a different (mathematics) course bundle than the rest (science) - shown only for `numeric-value@1`'s shape and the simulation-attachment shape.

`blocks/blk-example-sim.json` pairs with `../simulations/TriangleHalfParallelogramScene.js` - see `docs/simulation-authoring.md`. That pair is math, where "labels only" is nearly automatic. `../simulations/KGTriangleHalfParallelogramScene.js` is the same scene with the cosmic art pass applied - copy it for the look, not for the mechanism.

`simulations/WaterMoleculeScene.js` is a `WebGLSimulation` (3D) reference (docs/simulation-authoring.md §3.2) - no matching block JSON, pattern reference only, not a shape example like the rest of this directory.

`simulations/data/` - plain-look anchors named by shape, illustrative data (pattern references, no block JSON): `TimeHistogramTraceScene`, `DotPopulationScene`, `TableHighlightScene` (SimTable), `ProcessFlowScene` (FlowScene). Listed in `packs/look/plain/SHOWCASE.md`.

`simulations/geo/` - the geography kit showcases (pattern references, no block JSON): `EarthCutawayScene` and `RiverValleyTimeScene` (`GeoScene`, 3D), `PlateWorldScene` (globe + data layers), `MonsoonFlowScene` (India map + winds), `PlateBlockScene` (cross-section). docs/simulation-authoring.md 3.1-3.2.

The harder, non-science case is a pair of blocks (their `"authoring.status"` is honestly `"ai-draft"`, unlike the rest of this directory - not yet human-reviewed): `blocks/blk-example-sim-history-map.json` pairs with `../simulations/HarappanRegionMapScene.js` (simulation only); `blocks/blk-example-sim-history-images.json` shows six real images via `reveal.images`, then hands off to `../simulations/HarappanCityPlanScene.js` for one `simulationStep`-gated interactive beat - see docs/simulation-authoring.md's hybrid section. `anti-patterns/` holds that lesson's original, rejected all-simulation version - read it alongside the good pair, not instead of it.

`blocks/blk-example-s02.json` (`poe-predict@1`, `deferVerdict: true`) -> `blk-example-s03.json` (`content-block@1`, `poeRole: "explain"`) is a working deferred-POE-verdict pair - see SKILL.md's `deferVerdict` section. `blk-example-s03-explain.json` is an alternate recall block for the same predict block (`poe-explain@1` shape instead) - a standalone alternate, not wired into `example-lesson.json`'s own sequence.

`GENERATION-LOG.md` shows the shape of the running authoring log every bundle should keep (`AGENTS.md` rule 8) - terse, one-line-per-decision. `FIGURES.md` shows the shape of the per-figure notes a bundle should keep for every visually-inspected, load-bearing figure (also `AGENTS.md` rule 8) - description, not reproduction, of what's drawn, so a later pass never needs to reopen the source image. Both illustrative, neither matches the other example files here.

`example-question-plot-function.json`/`example-question-graph-field.json` are from yet another chapter - see `docs/graphing-and-plotting.md`. `example-question-graph-labeled-points.json` is the same `graph` field with no `functions` at all - just two named points (a y-axis reflection) - the shape a Coordinate Geometry chapter needs far more often than a function curve; easy to miss since both this doc's title and its first example are function-only.

`example-question-semantic-descriptive.json` shows `semantic-descriptive@1`'s shape (rubric + level3 + thresholds) - see `docs/descriptive-questions-and-cbse-marks.md`.

`example-question-semantic-descriptive-math.json` shows the same type used for a step-by-step maths proof (AM >= GM) - `"answerMode": "math"`, and `expectedMath` on two of the four rubric points (the ones that are a single equation the student states directly). The other two rubric points (expanding a square, concluding in words) deliberately have no `expectedMath` and rely on `accepted[]` like any other rubric point - `expectedMath` only checks structural/reordering equivalence, not algebraic expansion, so a step that requires actual simplification to verify is scored by wording match instead. See `docs/descriptive-questions-and-cbse-marks.md`'s "Math-heavy answers" section.

`example-question-semantic-descriptive-geometry.json` shows a geometry proof (exterior-angle-of-a-triangle) using the `diagram` companion field to draw the figure - no `expectedMath` anywhere, graded on the plain `accepted[]` tier per `docs/descriptive-questions-and-cbse-marks.md`'s "Never use expectedMath on a geometry rubric point". See `docs/geometry-diagrams.md` for the `diagram` field itself.

`example-question-match-categorize.json` shows `match-categorize@1`'s shape (`stem`, `categories`, `chips`), from a different (economics) course bundle than the rest.

`example-question-assertion-reason.json` shows `assertion-reason@1`'s shape (`assertion`, `reason`, `correctOptionId`, `optionFeedback`) - no `stem`/`options`, the CBSE option texts are fixed in the plugin.

`example-lesson.json`'s 4th `blocks[]` entry (`.../questions/L01/q-l01-s04.json`) is illustrative, not a real file - it shows that a question is wired into a lesson exactly like a block, a `blockRef` entry pointing into `questions/` instead of `blocks/`. A question file not in that array is never shown to a student - `validators/validate.mjs` checks for this. `example-question-mcq.json` shows the question file's own shape.

`example-bank.json` shows `question-bank@1`'s own shape (`docs/question-bank-generation.md`) - its `questions[].ref` entries are illustrative, same "not a real file" spirit as `example-lesson.json`'s question entry above. The real, standalone shape reference for a bank question is `example-question-bank-with-explanation-slide.json` - a `hard`-difficulty `numeric-value@1` question with a mandatory, real `explanationSlide` (never optional at that difficulty - SKILL.md). Its two `explanationSlide.blocks[]` entries are real files, `explanations/bank/exp-example-hard-01.json` (step 1, no simulation - a pure derivation step) and `exp-example-hard-02.json` (step 2, with a companion `simulation` - the visualizable step, per `docs/question-bank-generation.md`'s "needs one / genuinely doesn't" criteria). `exp-example-hard-02.json`'s `simulation.src` is illustrative only (no matching `.js` file in this directory, same as several `simulation.src` references elsewhere in this README) - the JSON wiring is the point being shown, not a working scene.

The four question types below are newer than the rest of this directory and honestly `"ai-draft"` (not yet human-reviewed) - these four are shape references only. Three (`semantic-descriptive@2`, `fill-blank@2`'s options, `error-correction@1`) are genuinely English-specific - `docs/question-bank-generation.md`'s English section and `docs/writing-skills-rubric.md` cover the authoring rules. `comprehension-set@1` is not - see its two examples below.

`example-question-semantic-descriptive-v2-writing.json` shows `semantic-descriptive@2`'s shape for a CBSE writing-skill task (a notice) - `wordLimit`, `formatChecks[]` (regex presence, scored with no model load), a `rubric[]` for whatever content the prompt itself enumerates, and `weights` combining all three into one score. See `docs/writing-skills-rubric.md`.

`example-question-comprehension-set.json` shows `comprehension-set@1`'s shape via an English reading-comprehension passage - one shared `passage`, several `items[]` each wrapping a full, ordinary child question (here an `mcq-single@2`, a `fill-blank@2`, and a `semantic-descriptive@1`). Each child is a real, independently-valid question object; `comprehension-set@1` only supplies the shared stimulus and the per-item `weight`.

`example-question-comprehension-set-case-study.json` shows the same `comprehension-set@1` type used for a non-English, case-based/source-based question (an SST civics source note on separation-of-powers thinkers, in the shape a real CBSE Social Science paper's Section E uses) - `docs/question-bank-generation.md`'s "Shared-stimulus / case-based questions" section covers this. Its `passage` is original synthesis, not a verbatim source quote - only an English literature extract gets that narrow exception (`docs/copyright-and-sourcing.md`).

`example-question-fill-blank-cloze-mcq.json` shows `fill-blank@2`'s only addition over `@1` - an `options[]` array on a blank, making it render as a fixed multiple-choice select instead of a free-text input (CBSE "choose the most appropriate option" cloze passages).

`example-question-error-correction.json` shows `error-correction@1`'s shape - `lines[]`, each with the line's `text`, its `incorrectWord`, and the `correction` (plus optional `acceptedCorrections[]` for more than one acceptable fix).

`example-question-math-workspace-step-chain.json` (coach mode: moves, hints, milestones, parabola visual) and `example-question-math-workspace-slots.json` (two slot parts, sequence + gauss visuals) show `math-workspace@1` shapes - see `docs/math-workspace.md`. Honestly `"ai-draft"`.

`narration/` is a tiny narrated bundle (2 slides from a college epidemiology course): a predict with a `narrationCover`, a scene with cues and `data-narr` tags, and its teacher script. Read `narration/README.md`; rules in `docs/narration.md`.
