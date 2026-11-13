=== FILE: START-HERE.md ===
# START HERE - one staged-generation run

You were given one line like:

    Read START-HERE.md and follow it. Stage: 3. Bundle: work-energy. Target: simulations/L02/RampScene.stub.md.

A target named `...-return.stub.md` (or `-case2`, `-payload`) is a normal scene, a second mount of a helper: not the shorter name. It may also carry `Part:` (multi-part bundles, below), `Source:` (the chapter file), `Helper:` (Stage 3), `Targets:` (Stage 3: several scenes of one lesson in one run, see the brief), `Only:` (a Stage 2 top-up: just the named slides of an existing lesson), `Look:` (Stage 3: `later` = no `shoot` at all (peeks included), close with `Status: look-pending`; the default is `Look: later` when the model cannot view images or is not Claude: it never self-certifies a look) and `Pass:` (Stage 3 only: `build`, `sanity` or `verify`, see the table), `Resume:` (your target's files exist from an earlier run that died: continue it), `Skip:` (a brief item you leave out), `Notes:` (operator directions: rule 11) and `Review: manual` (Stage 3: no tests run, no shoot, no look; your brief says how to close). The bundle is `courses/<Bundle>/`. Do exactly one stage for that target (or each of the listed `Targets:`), report, and stop.

## 0. Multi-part bundles

A big course (several books or volumes) is one bundle split into parts: `courses/<Bundle>/parts/<NN>/` holds that part's own `OUTLINE.md` and `FIGURES.md`. Its lessons are coded `L<NN>-<module>-<lesson>` (e.g. `L03-07-01`; files `les-03-07-01.json`, `blocks/L03-07-01/`, `simulations/L03-07-01/`) and its modules are `modules/mod-<NN>-*.json`. Blocks, questions, lessons, simulations (including `simulations/shared/`) and GENERATION-LOG.md stay bundle-wide, so scenes and helpers are shared across parts. Rule: wherever a brief says `courses/<Bundle>/OUTLINE.md` or `FIGURES.md`, read and write `courses/<Bundle>/parts/<NN>/OUTLINE.md` / `FIGURES.md` instead, where `<NN>` is the `Part:` field or the first segment of the lesson code. `lesson-check` finds the right outline from the lesson code by itself; `outline-lint` and `figures-lint` take `--part <NN>`. A bundle with no `parts/` folder is a plain one-chapter bundle and none of this applies.

## 1. Open your brief

| Stage | Brief | Job |
|---|---|---|
| 1a | `briefs/stage1a-source-scan.md` | read the chapter source, write FIGURES.md |
| 1b | `briefs/stage1b-outline.md` | design the lessons, write OUTLINE.md |
| 2 | `briefs/stage2-lesson.md` | one lesson: blocks, questions, lesson file, scene stubs |
| 3 | `Pass: build` -> `briefs/stage3-build.md`; `Pass: sanity` -> `briefs/stage3-sanity.md`; `Pass: verify` -> `briefs/stage3-verify.md`; no `Pass:` -> `briefs/stage3-simulation.md` | one scene in up to 3 short passes (build; sanity only if build's quick check failed; verify), or in one run |
| 3-look | `briefs/stage3-look.md` | review one built scene in screenshots (needs image viewing); a pass that fixes nothing closes `done`, at most 3 |
| 3-slides | `briefs/stage3-slides.md` | once per lesson, after all its scenes are `done`: judge every WHOLE slide in the real app (desktop + phone, light + dark) |
| N | `briefs/stageN-narration.md` | narrated courses only, after 3-slides: one lesson's teacher script, scene cues and focus tags, opening pictures (`Audio: build` to voice it) |
| 4 | `briefs/stage4-module.md` | module file, validate the whole chapter, record each lesson's 3-slides result |
| R | `briefs/stageR-critique.md` | critique one lesson: files review notes only (`Check: facts / pedagogy / answers`) |
| 5 | `briefs/stage5-showcase.md` | after approval: Discover card text and screenshot targets (`showcase.json`, `intro.md`) |
| B1 / B2 / B3 | `briefs/bank1-plan.md`, `bank2-questions.md`, `bank3-assemble.md` | question bank track |

**Bundled invocation:** if your invocation names a file under `briefs/bundles/`, that one file already holds this START-HERE, your brief (the section `=== FILE: briefs/<brief>.md ===`) and every kit doc the brief tells you to read: use it, and skip each "read X" for a file listed in its `=== BUNDLE INFO ===` footer (read course files, run tools, view images as the brief says).

Read your brief in full now. It names everything else you read, and when. Read nothing else unless a step sends you there. Stages 1-2 only: if `courses/<Bundle>/COURSE-BRIEF.md` exists, read it too (course-specific story, cast and style that add to the brief). Stage 3 takes these from the stub.

## 2. Rules for every stage

1. Never run any `git` command (not even `git status`, `git log` or `git diff`): the operator commits, and whether a file is committed is not your concern. Do not wonder whether files already on disk are "suspicious" or "stale": see rule 9.
2. Write only inside your brief's write-scope. Anything else you think needs changing goes in the report.
3. The context window is the budget. Spend it on the target, not on reading:
   - Read a doc by section: `node tools/doc-section.mjs <doc> "<heading>"` (`--list` shows headings and sizes). Read a whole doc only when your brief says "in full".
   - Never read a tool's source to learn how it behaves. Tools print their defaults and what they ignored; `<tool> --help` prints its full usage (every step, flag and default) and section 4 below lists the tools. Stage 3 and 3-look: never run `--help`; the brief and `probe-cookbook.md` list the steps. A mistyped flag or step is refused with the fix, never ignored.
   - Run every command from the repo root; never `cd`. `build/` is the repo-root `build/` (scratch in `build/scratch/`), never under `courses/`. Keep what is worth keeping under the bundle: extracted text and crops in `courses/<Bundle>/source/`, one-off helper scripts in `courses/<Bundle>/_work/`; `build/` is disposable.
   - Do not re-read a file you just wrote. Change files with small edits; rewrite a whole file only when most of it changes.
   - Open an image only at the step that says so, and start with the contact sheet.
   - Put decisions in the files your brief names (log, design note), not in long private reasoning: a file can be re-read and reviewed, reasoning cannot.
   - Bound every command's output: pipe anything that may be long through `| head -40` (or use `--no-text`). One 25K-character result is re-sent on every later turn.
   - Make all the edits you know of in ONE turn (independent tool calls side by side), not one edit per turn: every turn re-sends the whole conversation.
4. Every stage ends with its own check passing (your brief names it). FAIL must be fixed. A WARN about what a learner sees or what breaks is fixed or explained in one line in the log or design note; `note:` lines are advisory and need nothing.
5. `GENERATION-LOG.md` is a write-only trail for a human reviewer, written only through `node tools/log.mjs add --bundle <Bundle> --stage <S> --lesson <L> --model "<name>" "<text>"` (never edit or read the file); it is never your state or your source of precedents. Stages 1a, 1b, 2, 4 and the bank stages add their own section at the end, opening with `Model: <name>` (what you are), terse: decisions, flags, deviations. Stage 3 never touches it directly: `log-stage3.mjs` writes it (or prints LOG TEXT for the operator). Nobody reads it to learn what earlier lessons or scenes did, or whether a target is done: the files, the design note's `Status:` and `## Progress` say that. Stage 1b is the one exception: it reads the Stage 1a section for the figures flagged unclear.
6. Numbers you state (counts of slides, figures, scenes) come from a command's output, never from memory.
7. Say what you could not do or verify. Do not stop before the report is written. Do not start the next stage.
8. **Your target's files already exist** (`Resume:` in the invocation, or you find a design note or scene file of your target): they are your own earlier work, from a run that died. Do not guess whether they are right, committed or "suspicious". Read the design note and its `## Progress` lines, run the stage's check, and redo only what is not marked done. A stale note (no `## Progress`, or no Layout, Beats, Numbers or Tests to run) with code present: run `ident-lint` and the check, add Progress for what exists, APPEND the missing sections; do not rewrite, do not explore kit source.
9. **Hedging costs the budget.** If you change your mind three times on one question, take the simpler option, write it in the design note under `## Decisions` (or `## Requests` if the stub or slide is at fault) and move on. A stub that contradicts itself or its slide: take the reading closest to the slide's point, one line under `## Requests`.

10. **No web.** Never call a web search or page-fetch tool unless the invocation has `Web: on` (or the operator allows it in an interactive run: `briefs/reference/interactive.md` rule 9); an unverifiable fact is flagged in the log, not searched. Never run anything in `tools/operator/` (one exception: Stages 3-slides and 4 run `tools/operator/slide-shots.mjs`).
11. **Directions.** `Notes: n4,n7`: before designing, print them: `node tools/directions.mjs --bundle <Bundle> n4,n7`. A direction beats the stub, outline or design note; note each conflict in one line (`## Requests`, or the log). Honored: add `--notes n4,n7` to your closing `log.mjs add`, `log-stage3.mjs` or `scene-pass.mjs end` call.

## 3. Report (your last message)

- Model, stage, bundle, target.
- Files written or changed.
- Check results: paste the final PASS/FAIL line of each check.
- Decisions a reviewer should look at, and flags for a human.
- What you could not do or verify.

## 4. Tools (run from the repo root; run one with no arguments for its usage)

These serve every stage. Each brief lists the tools only its stage uses (Stage 3 and 3-look: the scene tools and the kit guides under `briefs/stage3/`).

| Tool | What it answers |
|---|---|
| `node tools/doc-section.mjs <doc> "<heading>"` | one section of a doc |
| `tools/rasterize-pdf.sh <pdf> [dpi]`, `tools/crop-page.sh <pdf> <page> <x%> <y%> <w%> <h%>` | page images; a region enlarged |
| `node tools/staged-generation/figures-lint.mjs <bundle> [--part NN] [--stage 1a]` | FIGURES.md format and counts |
| `node tools/staged-generation/add-renderer.mjs <bundle> <name@major>` / `--list` | add a ready-made renderer from the kit library (renderers/) and bind it |
| `node tools/staged-generation/renderer-lint.mjs <bundle>` | course-local renderers: bindings, folder, rules, validate() |
| `node tools/staged-generation/outline-lint.mjs <bundle> [--part NN] [--backfill]` | OUTLINE.md format, per-lesson counts; fills FIGURES.md Used by |
| `node tools/staged-generation/lesson-check.mjs <bundle> <L0N> [--fix-verbatim]` | one lesson: validate, stubs, scene paths, verbatim copies |
| `node tools/staged-generation/question-mix.mjs <bundle>` | question types and where the correct mcq options sit |
| `node tools/sim-test/scene-info.mjs <L0N/Scene> --bundle <b>` | what to build: attaching slides, REAL beat counts, beat texts |
| `node tools/narration-lint.mjs --bundle <b> <L0N> [--all]` | a narration script before audio: every beat scripted, no talking past the screen, cue ids exist, waits well formed |
| `node validators/validate.mjs <file...>` | JSON structure |
| `node tools/find-source.mjs "<term>" [--bundle B]` | does the source say it? (offline fact check; bounded output) |
| `node tools/find-scene.mjs "<what it shows>"` | a verified scene of another bundle to reuse (Stage 2/3 only) |

=== FILE: briefs/bank2-questions.md ===
# Stage B2 - Write one batch of bank questions

Target: the question ids in the invocation's `Target:` (one batch from BANK-PLAN.md's `## Question list`; never a topic split across batches). Output: `courses/<Bundle>/questions/bank/<id>.json` for each, plus `explanations/bank/*.json` for every `hard`/`olympiad` one.

## Read

1. `AGENTS.md`, `docs/question-bank-generation.md`, `docs/voice-and-tone.md`, `docs/pedagogy.md`, `.agents/skills/content-authoring/SKILL.md` and `docs/copyright-and-sourcing.md`, in full. School audience: also `docs/descriptive-questions-and-cbse-marks.md` in full. Other audiences: only its rubric-mechanics sections (the bundle carries them; the audience card item on descriptive questions replaces its CBSE mark bands).
2. Not `docs/simulation-authoring.md` (SKILL.md's "Question explanations backed by real slides" covers explanation slides), unless one worked solution truly needs a new scene.
3. BANK-PLAN.md's header and scope; for a `comprehension-set@1` in your batch, its `## Comprehension sets` entry (the committed sub-item types and weights are binding).
4. Only the FIGURES.md entries your topics use: `node tools/doc-section.mjs courses/<Bundle>/FIGURES.md "<label>"`.

## Write-scope

The files for the listed ids, their explanation slides, GENERATION-LOG.md (olympiad searches), `build/`. No other planned question, no bank index, nothing on the lesson track.

## Procedure

1. Each question sourced from the chapter (FIGURES.md, the source text), never from a lesson's slides. `difficulty` as planned, a `topicId` at the bundle's granularity, `estimatedTimeSec` from the doc's table.
2. Every `hard`/`olympiad` question gets a step-by-step `explanationSlide` under `explanations/bank/` (`explanation` alone fails validation). Every `olympiad` question: calibrate from the source and kit docs; web search only if the invocation has `Web: on` (never to copy), logged in GENERATION-LOG.md.
3. Write all the listed ids in this run; a fresh context is not a reason to stop early.
4. Validate: `node validators/validate.mjs courses/<Bundle>/questions/bank/*.json courses/<Bundle>/explanations/bank/*.json`. Fix every error.

Report (START-HERE.md section 3) plus: which listed ids were written (name any left and why), and for each olympiad question what was searched and how yours differs.

=== FILE: AGENTS.md ===
# Agent Instructions - CoAuthor Content Repo

Content-only repo: JSON lesson/question data (plus, occasionally, a course-exclusive simulation scene) for the CoAuthor e-learning platform. No application code here - the rendering engine lives elsewhere and isn't needed for this work. Work only inside this directory tree.

## What this repo is for

Author lesson slides and question banks for CBSE classes 9-12 as JSON, following the conventions below. A separate app renders whatever you commit here - match its data contract exactly. A repo whose `profile.json` sets an `audience` other than `school` follows `packs/audience/<id>/CARD.md`, which overrides this file.

## Before you write anything

Staged run (your task begins `Read START-HERE.md and follow it` or `Read briefs/bundles/<name>.md`): skip this list. START-HERE.md and your brief name what to read, by section; the Hard rules below still apply.

1. Read `.agents/skills/content-authoring/SKILL.md` - schema, valid types, directory layout, numbering rule.
2. Read `docs/generation-playbook.md` - the chapter -> content procedure.
   - Simulation on essentially every slide (rule 10 below); static image only when a real photo/map genuinely fits better.
   - Graphing/coordinate-plane exercises use `plot-function@1` or `graph`, not a simulation - `docs/graphing-and-plotting.md`, including a plain Coordinate Geometry question with no function at all (quadrant/reflection/midpoint/distance/collinearity) via `graph.points[].label` (section 2.2).
   - A geometry question with a labeled synthetic figure (a triangle, angle-chase, circle/sector, quadrilateral) attaches the `diagram` companion field, not a simulation or static image - `docs/geometry-diagrams.md`; applies to a question bank too (rule 8).
   - A static non-geometry figure (flow, panels, timeline, comparison) is the `figure` field - `docs/figures.md`; a kind no layout draws, with nothing to operate, is a course-local renderer - `docs/renderers.md` (When: read -> renderer, operated -> scene); check the ready-made library first (`add-renderer.mjs --list`).
   - PDF sources: rasterize to catch figures lost in text conversion - playbook step 1. Write what you see to `FIGURES.md`, not just that you looked - rule 8 below. Staged generation splits this into its own pass (Stage 1a) specifically so it can run on a different, vision-capable model from the one that designs the outline (Stage 1b) - `docs/staged-generation.md`.
3. Match `examples/` shapes exactly - don't invent top-level fields.
4. Read `docs/voice-and-tone.md` before writing any `markdown`/`prompt` field.
5. Read `docs/pedagogy.md` before drafting a lesson outline.
6. Social-studies chapter, or any 2/3/5-mark descriptive question: read `docs/descriptive-questions-and-cbse-marks.md` first - `semantic-descriptive@1` is primary there, not a fallback.
7. Given a line like `Read START-HERE.md and follow it. Stage: ...`: that file and the brief it routes you to replace this list - follow them. Working across several separate agent runs instead of one continuous session (to keep context small, or to route different passes to different models): `docs/staged-generation.md` splits this playbook into source-scan / outline / lesson / simulation / module passes with hard stop points; `tools/staged-generation/next.mjs` detects which pass is next and prints its one-line invocation.
8. Generating a **question bank**: read `docs/question-bank-generation.md`, not the playbook above - sourced from the chapter directly, never a lesson. Every other rule below still applies; only source and `questions/bank/`/`banks/`/`explanations/bank/` differ. Staged-generation: `node tools/staged-generation/next.mjs --bank` - independent of, and interleavable with, the lesson track above.

## Hard rules

0. Never use web search or page-fetch tools unless the invocation has `Web: on`. Everything you need is in the source and this kit; a fact you cannot verify from the source goes in the log as a flag. Never run anything in `tools/operator/`.
1. Leaf block/question types are versioned (`content-block@1`, `mcq-single@2`); structural types (`lesson`, `module`, `exam`, `course`) are the bare word - `"type": "module"`, never `"module@1"`. `validators/validate.mjs` and the app key off an exact string match; a wrong suffix makes the file invisible, not an error. Only use types listed in SKILL.md.
2. Every learner-facing string is `{ "en": "..." }` (except `poe-predict@1.prompt`, a bare string - see SKILL.md; a `"_comment"` note for agents is a plain string too, never shown). Never embed an image via markdown (`![alt](url)`) inside one - the engine renders markdown, but doesn't resolve a bundle-relative path inside it, so the image silently never appears. Attach it through the block/question's own `image` field instead (see SKILL.md).
   - **Default: write prose in a sibling `.md` file, not inline.** `content-block@1.markdown`, `poe-predict@1.prompt`, `poe-explain@1.prompt`, and `poe-observe-sim@1.prompt` all take a `markdownRef`/`promptRef` alternative - a path to a sibling `.md` file next to the block's own JSON, same basename (see SKILL.md's "Prose in a sibling .md file" section). Write that file first, then point the JSON at it. Reach for inline `markdown`/`prompt` only for a genuinely trivial one-liner not worth a separate file - inline still works and stays valid, it just isn't the thing to reach for by default. This is also what keeps a JSON edit from breaking on a stray newline, quote, or LaTeX backslash inside an embedded markdown string.
3. One concept per file: one question = one JSON file; a lesson references its blocks via `blockRef`, never inline.
4. Never copy textbook text verbatim - synthesize (see `docs/copyright-and-sourcing.md`; a source marked `"sourceOwned": true` in `bundle.json` is the author's own and may be closely paraphrased, as that doc says). Diagrams must be original or CC-licensed.
5. Everything starts as `"authoring": { "status": "ai-draft" }`. Never write `"human-approved"` - only a human reviewer sets that.
6. Validate every file you write, including the lesson file itself, with `node validators/validate.mjs <file>`. Lesson-level validation is the only thing that resolves `blockRef`s (catches the `deferVerdict` handoff and orphaned questions); module-level is the only thing that checks `moduleId`/`lessons`. Fix every error.
7. Never write a slide that depends on a concept from a later lesson. The validator can't catch this - re-read your own sequence deliberately.
8. Keep two running working files under `courses/<bundle>/` as you go - not `build/`, which is ephemeral tool output; these persist for the bundle's whole lifetime. Neither has a `blockRef`, neither is subject to the `ai-draft`/`human-approved` rule. **They are not interchangeable - a note in one does not satisfy the other, even when both mention the same figure.**

   **`GENERATION-LOG.md`** (see `examples/GENERATION-LOG.md`) is your decision trail: source pages actually inspected vs. text-converted, slides that skipped a simulation and why, a figure you flagged as unclear. It's for a human reviewer or a later agent trying to reconstruct *why* you did something. Write-only for a generation run: add your own section, never read or grep it to decide what to do (the files and design notes are the state; Stage 3 writes it only through `log-stage3.mjs`).

   **`FIGURES.md`** (see `examples/FIGURES.md`) is REQUIRED every time you visually inspect the source - write it even if it ends up saying "no load-bearing figures in this chapter," don't just skip the file because nothing seemed to warrant an entry. For every figure/diagram/table you judge load-bearing (a slide's content depends on it), write what you saw - not just that you looked, and not just that it was a problem - one section per figure:
   ```
   ## <source's own figure label, e.g. "Fig 3.1"> (p.<page>) - <short description>
   - Used by: L0N s0M[, L0P s0Q, ...]
   - Inspected: rasterized + viewed directly | caption/text only
   - Description: concrete layout/geometry/labeled parts/data shown - enough that a
     later pass never needs to view the image itself. Your own words, not the
     caption copied verbatim.
   - Numbers/values (if a worked example): the source's own figures, for question
     design only - never for lesson prose (rule 4 above).
   ```
   If you flag a figure as unclear/uninterpretable in `GENERATION-LOG.md`, it still gets a `FIGURES.md` entry (the entry can just say what's unclear) - the log records the decision, `FIGURES.md` is the durable record a later stage/pass reads from instead of reopening the image. If no text-extraction tool is available (no `pdftotext`, no PDF-reading library) and you're reading pages purely by viewing rasterized images, `FIGURES.md`'s scope broadens: capture load-bearing facts/numbers/definitions from those pages too, not just diagrams - anything a later pass would otherwise need to re-view the image for, text or figure alike.

   `FIGURES.md` records what a figure shows, not your own working: don't restate the chapter's body-text derivations, solve exercises, fill blank table cells, or add formulas the source doesn't print - anything you computed or inferred yourself is tagged `[derived]`. A claimed textbook error is written as `- Flag (unverified - needs human check): ...` and only after re-viewing the region enlarged; later stages must not treat it as fact.

Under staged generation (`docs/staged-generation.md`), `FIGURES.md` is written in Stage 1a, before any slide exists to name in `Used by:` - write `TBD` there instead of guessing, and leave backfilling that line to Stage 1b once slides are assigned. Also: when Stage 1a and Stage 1b run as genuinely separate passes (possibly different models), each stage's own heading in `GENERATION-LOG.md` opens with a `Model: <name>` line - a bundle worked this way has two models' output to tell apart later, and nothing else records which pass was whose.
9. Every numeric segment in a filename/id is zero-padded to 2 digits: `L01`, `s01`, `les-01`, `L02S03` - never `L1`, `s1`, `les-1`, `L2S3`. Prevents sort/lookup breakage past 9.
10. One mini-game per lesson (the course's look card may relax this; `plain` does), in the Challenge slot - `docs/mini-games.md`. It must clear tie level L2 (the win condition IS the concept's rule); below that, ship a question instead. No timers. A new game defaults to `DomSimulation`.
11. A simulation belongs on essentially every slide - the platform's core differentiator, not optional (a look or audience card may relax this; `plain` does). Agents keep under-delivering here; don't. A chart or figure the learner only reads is NOT a simulation and never counts here: `figure` field or a renderer (`docs/renderers.md`, When). Static image only for content that's genuinely a picture (photo, map, original/CC diagram) - this now explicitly includes a *relationship between several real photos* with no real control to operate (a food web, a "one name hides several species" comparison): use `photoDiagram` (`docs/photo-diagrams.md`) - real photos, an engine-drawn connector layer, no custom scene - don't code a beat-driven reveal in DOM. See `docs/simulation-authoring.md`'s "The `CONTROLS: []` smell" section before writing a scene with no `CONTROLS`/`onControlChange`/live process. Justify any slide with neither in `GENERATION-LOG.md`. Social-studies subjects: see `docs/simulation-authoring.md`'s "For non-science subjects" section - a simulation is a visual aid, not only a physical-mechanism animation. Geography: a real sourced photo answers "what does this landform look like"; spend scenes on processes. India's border only ever from the Survey of India layer (`docs/simulation-authoring.md` #3.1; it is the law). A block can also swap images per beat and hand off to a simulation later (`reveal.images`/`simulationStep`) - see `docs/simulation-authoring.md` before defaulting to one simulation per slide. Pick the base class by content shape (`docs/simulation-authoring.md` #3's table) - `DomSimulation` for labelled panels/timelines/comparison layouts, not `CanvasSimulation` out of habit. A canvas scene extends `SimScene` (`simulations/base/kit/SimScene.js`, with `SimLook.js` for chips/cards/backdrop/faces) unless a base class's own features are needed - `docs/simulation-authoring.md` #4.6; use `busy()` and `this.after()` for runs and timers, `chipRow` for any row of chips, `ZONES` for layout. **Scenes come to rest by default: `static CONTINUOUS = false` is the base-class default** (the frame loop parks once nothing animates, conserving battery and CPU); declare `true` only for motion that genuinely never ends, with a one-line reason. A default scene implements `onBeatChange`, calls `this.animateFor(ms)` for pointer handlers, timers and any run over 8 s, ends every run, and avoids the base classes' reserved field names - `docs/simulation-authoring.md` #3.4.
12. A simulation only labels (axis/part tags, short callouts) - never explains. Explanatory prose goes in the slide's `markdown`, not the scene. When a *question* needs a real worked explanation, that's `explanationSlide` (SKILL.md), not the simulation - author an explanation block with its own `markdownRef` and (optionally) `simulation`, referenced from the question, never part of the lesson's own flow.
13. `difficulty` is `easy|medium|hard|olympiad`. A `hard`/`olympiad` question **requires** a real step-by-step `explanationSlide` - `explanation` alone fails validation (`docs/question-bank-generation.md` #4). With `Web: on` in the invocation, `olympiad` questions may use web search to calibrate against real competition problems - never to copy from (rule 4 applies to web sources too); without it, calibrate from the source and `docs/`.
14. A `DomSimulation` scene is built from the DOM scene kit, not from scratch - `docs/dom-scene-kit.md`: `this.render({ html, css })`, `static BEAT_STEP_MAP` + `onStep()` (no hand-written beat clamp), `static FIT = true` for content-sized frames, `sim-card`/`sim-tag`/`sim-field`/... classes, `--sim-text-*`/`--sim-space-*` tokens (14px text floor). Before calling a scene done run `node tools/sim-test/check-scene.mjs <scene> --bundle <bundle>` (every gate in one command, sim-lint and sim-layout included for DOM scenes) and fix every FAIL; set `HEIGHT`/`PORTRAIT_HEIGHT` from the layout numbers. Never call `injectStyle` and then overwrite `this.root.innerHTML` by hand without `render` - and never copy another scene's card/tag CSS.

15. A chapter with hard names or technical terms ships `glossary.json` (tap-to-gloss), pairs the first use of each name with its plain name, and practises names with `NameDecoderScene` - `docs/glossary.md`. Run `node tools/glossary-lint.mjs courses/<bundle>` before calling it done.

16. Games over the field guide (`field-guide.json`, `simulations/base/kit/*Scene.js`) follow `docs/games.md`: one data file, thin subclasses, evidence decides and lures never do. Run `node tools/field-guide-lint.mjs courses/<bundle>` after any edit to the guide or a game scene.

17. A narrated course (OUTLINE header `Narration: narrated`) follows `docs/narration.md` from Stage 1b on (sec 13: prologue, narration-ready stubs and scenes), and gets one Stage N run per lesson (`briefs/stageN-narration.md`). Run `node tools/narration-lint.mjs --bundle <bundle> <L0N>` before any audio.

## What you don't have here

No engine source, no live preview - the validator checks structure only. Question-type plugin schema checks are best-effort; full validation happens in the real engine repo's CI.

=== FILE: docs/question-bank-generation.md ===
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

=== FILE: docs/voice-and-tone.md ===
# Voice and Tone

Two real courses from this kit read very differently despite identical schema - one terse and textbook-dry, one warm and easy to follow. That's a prose choice, not a schema one. Applies to every `markdown`/`prompt` field.

**Not asking for less precision** - every rule below is about packaging (sentence length, structure, concreteness), never about cutting a defined term or a precise claim to make a beat shorter.

## Reader

Indian students, classes 9-12 (ages 14-17). English is often their second or third language: they know school words, not literary ones. They read slowly and exactly, and many read on a phone. Write so a tired reader at the end of the school day follows each sentence on the first pass.

- **Plain words.** Pick the common word ("pushed back", not "driven back"; "answer", not "verdict"; "who does the work", not "which agency"). Keep the syllabus term exactly where tests use it (displacement, work done, joule).
- **No idiom, no figure of speech that needs decoding.** "Two free tickets", "catches people out", "refuse to budge", "run it through the gates", "parked", "square across" make a second-language reader translate before they learn. Use the literal version: "two easy ways", "is easy to get wrong", "stays at zero", "check", "waits", "straight across".
- **A comparison is allowed when it is a concrete everyday thing with a stated link** (a LEGO box, a queue at the canteen). Say what it stands for. Never a joke or aside the reader must get to follow the point.
- **Do not tease.** "Leave that one for the next slide" and "Nobody can tell you what happens next" hold back for effect. Say plainly what comes: "We will see this on the next slide."
- **Define before use.** A new word gets one plain-language meaning the first time it appears; a word the reader already knows is not defined again.
- **Home ground.** Take examples from what an Indian student has seen: cricket, an auto-rickshaw, a train, a kirana shop, a school corridor, the monsoon, rupees. Avoid things that need foreign background (snow days, baseball, dollars). Indian names for characters. British spelling (metre, colour, forward).
- **Warm, never babyish.** Address a capable teenager. No sarcasm, no in-jokes, no exclamation-mark cheer.

## Terse (avoid)

> Every lane consists of two identical straight sections and two curved bends. While the straight stretches are equal in length for all athletes, the curved sections widen outward. Because outer bends form wider curves around the central field, an outer runner forced to start level with an inner runner would run far more than 400 m before reaching the finish line.

Three ideas fused into one paragraph via subordinate clauses - no beat to breathe between them.

## Warm (aim for)

> Imagine shaking a box full of LEGO bricks. The pieces may collide thousands of times, but they won't assemble themselves into a castle.
>
> **Having the right ingredients isn't enough. They must also be organized in the right way.**

A concrete analogy carries the reader in; each sentence lands one idea; the payoff is its own bolded, standalone line.

## Staccato (also avoid)

> The wall did not move. Work is zero. Force times zero is zero. Your arms are tired. That is different.

Five fragments of thought, no links. The reader must work out how they connect, and the rhythm reads like a list of slogans. The fix is not a longer paragraph, it is **connected sentences**:

> The wall did not move, so the work done on it is zero: any force multiplied by a displacement of zero gives zero. Your arms still get tired, because your muscles use up energy, but none of that energy goes into the wall.

Two sentences, each carrying a reason ("so", "because"). Short is fine; a string of shorts is not.

## Plain wording, before and after

Real rewrites from the work-energy course (first draft, then the fixed version).

| Draft | Fixed |
|---|---|
| Run each one through the gates | Check each case with three questions |
| Two free tickets / The third ticket is not free | Two easy ways / The third way is the tricky one |
| Nobody standing up there can tell you what happens next | You have probably guessed already. |
| Hands driven back along the push | Hands pushed back while pushing the ball |
| Pull square across the lift | Pull straight across the lift |
| The verdict | The answer |
| Say whose work, and on what | Always say who does the work, and on what |
| Leave that one for the next slide. | We will see this on the next slide. |
| Tiredness - measured in how badly you want to stop. | (cut: a joke the reader must decode) |

## Rules

1. **One main idea per paragraph, two to four sentences, mixed in length (aim 8-20 words).** Give each claim its reason in the same sentence ("so", "because", "but", "which means"). Never run three or more very short sentences (under 7 words) in a row, and no fragments. A sentence that needs two links and a side clause is too long: split it, then join the pieces back to their neighbours with a linking word. One very short sentence is fine as the bold takeaway or as a single deliberate beat.
2. **A short `##` sub-header per beat** with its own idea (`## A Team That Falls Apart`) - skip it on a one-line beat. If the block uses `<!-- STEP -->` sentinels (simulation-linked blocks, see `docs/simulation-authoring.md`), the heading goes **after** the sentinel that opens its beat, never before - a heading before the sentinel becomes an empty beat of its own.
3. **Bold the one takeaway sentence**, standing alone, not mid-paragraph. Bold for the takeaway only - bolding everything bolds nothing.
4. **Bullet lists past two items**, even in narrative prose.
5. **Concrete analogy before the general principle** (a LEGO box, not just the formal statement) - the analogy earns the precise statement, doesn't replace it.
6. **A recurring device (character, running example) is optional** - use it only if the subject genuinely supports a throughline; forced is worse than none.
7. **`poe-predict@1` prompts**: one or two plain scene-setting sentences, then an explicit `**Predict:**` label:
   ```
   ## Plasmolysis in Plant Cells

   Scientists place a peel of **Rhoeo leaf epidermis** into a **20% sugar solution**. They know the cells will lose water by osmosis.

   **Predict:** What will happen to the overall shape of the plant cell?
   ```
   not dense setup immediately followed by a bare question.

   Works the same for a decision, not just an observation:
   ```
   ## A Farmer's Trade-off

   A farmer has one plot of land, and can grow **barley**, **wheat**, or some mix of both. Growing more barley leaves less land, water, and labour for wheat.

   **Predict:** If the farmer decides to grow more barley next season, what has to happen to the wheat harvest?
   ```

8. **Markdown tables render fine** (GFM, via `marked`) - use one for real tabular data, not as a substitute for rule 4's bullet lists.

## Register

The rules above shape the sentence. These shape the stance the prose takes towards the reader.

1. **Name the wrong idea first, out loud.** Most students arrive holding one. Prose that only states the correct account leaves them to notice the clash themselves, and most will not. "You would think a wider boundary holds more together. It does not." beats an unopposed correct statement.
2. **A wrong answer is welcome in the prose, not just in the feedback.** Say that a guess was reasonable and say exactly where it breaks. A beat that admits "people believed this for two hundred years" costs one sentence and buys the reader permission to have been wrong.
3. **End a beat on a hook, not a definition, and state the hook plainly.** A beat that closes on the term it just introduced is finished; one that closes on the problem the term creates pulls the reader into the next beat. Definitions belong mid-beat.
4. **Second person, present tense, for anything the reader does.** "You measured a coin, a plate, a Ferris wheel" - not "one measures" and not "students will measure".
5. **No throat-clearing.** "In this lesson we will learn", "It is important to note that", "As we have seen" - cut all of it. `docs/pedagogy.md` bans the first one outright; the rest are the same habit.
6. **Never explain by intention.** Not "the cell needed a way to keep its molecules together". Nothing in evolution wants anything. Say what survived and why: "boundaries turned up, and the lineages that had them left more descendants." People may have intentions; molecules, cells and species may not. `tools/bundle-invariants.mjs` checks for this.

## Character speech (courses with a cast)

If the manifest has `"cast"` (story/cast.json), mark every line a cast member says aloud with `<!-- SAY id [mood] -->` on its own line directly above the paragraph. Never leave it as quoted prose.

1. Mood = a pose name in that character's `poses` in cast.json. None, or an unknown one, shows `default`. Use one only when it fits (puzzled: think; pleased: proud).
2. Inside the bubble: only the spoken words. No quote marks, no tag (`says Kabir`, `she whispers`). Rejoin split sentences. Manner or action goes in a narration paragraph BEFORE the bubble.
3. Story mode: a SAY that opens a beat takes the whole beat into that bubble. Write the narration first (a short lead-in), or keep the beat to the speech alone. Never add a paragraph that would add a beat to a block with STEP ids.
4. Stays narration: written words and labels (notebook lines, card or rule names, scare quotes), reported speech, speech by someone not in the cast, the learner's own lines (no sprite), device callouts (`> **The Lens says:**`).
5. Plain-text fields (question stems, option text and feedback, objectives) cannot carry a speaker. Keep them as narration.
6. `node tools/prose-lint.mjs --bundle X` warns on quoted speech with no SAY and on a SAY that opens a beat followed by narration. Some warnings are notebook lines or labels: judge each.

`examples/blocks/*.json` follow this doc - match their prose register too, not just their JSON shape. Question stems are out of scope here.

## Audio narration

A narrated lesson gets a separate teacher script, not this prose read aloud. Rules and pilot mistakes: `docs/narration.md`.

=== FILE: docs/pedagogy.md ===
# Pedagogy

`docs/voice-and-tone.md` governs the sentence; this governs how a lesson is *built*. Both apply to every lesson.

## Open with inquiry, not summary

Never "In this lesson we will learn about X." Open with a question, a puzzle, or something that looks obvious and turns out wrong - the same instinct `poe-predict@1` exists for, applies to a plain hook slide too.

## Use real dead ends

Show a plausible-but-wrong approach failing on a specific case (a concrete number, shape, scenario, counterexample) - not just "this doesn't work."

## Only define what's actually new

Give the "this is called X" treatment once, only to genuinely new vocabulary - not as a reminder on every later slide.

## Make hard words easy to start on

Latin and Greek names are the main reason a chapter feels hard. Treat them as a design problem, not a memory test - `docs/glossary.md`.

- Most names are short descriptions in an old language. Show the pieces first ("platy = flat, helminth = worm"), let the learner guess the body, then reveal the name.
- Plain name first, scientific name second, then fade the plain name.
- At most 3 new names in a beat; a beat that needs more is two beats.
- Every hard word is one tap from a card (glossary.json).
- Come back to names in later lessons with a recall round, not a re-read.
- Say out loud once that the names are hard and nobody is born knowing them.

## Vary your phrasing

Don't reuse the same sentence template slide after slide ("Now let's check..." / "Now let's verify..." back to back reads like mail-merge).

## Ground every idea in something specific

A number, example, or real situation - never an abstract claim standing alone (same instinct as voice-and-tone's concrete-before-abstract rule, applied at the lesson level).

## A throughline, only if it earns its place

Use one running thread/object across a chapter only if it genuinely fits. A forced throughline is worse than none - it's fine to decide a chapter doesn't have one.

## Speculate first, in any lesson that explains a mechanism

Default opening for a mechanism lesson: pose the problem, make the reader commit to an answer, then teach. A `poe-predict@1` with `deferVerdict: true` is the mechanism - the wager is recorded and the verdict is withheld until the lesson has earned it.

A prediction is only worth asking if a reader could plausibly pick the wrong option. "Which of these is the cell membrane" is a quiz. "Wrap the molecules in a boundary - what is the catch?" is a prediction, and the whole lesson is the answer.

Put it before the first content block. One per lesson; more and the commitment stops meaning anything.

## A chapter is one arc, not N independent lessons

Each lesson should close on the problem the next one opens with. If lesson 3 could be read before lesson 2 without loss, the chapter is a list rather than an arc.

The reliable shape: a solution creates the next problem. A boundary holds the molecules together and cuts them off from supplies; selectivity fixes that and leaves the cell soft; a wall fixes that and lets pressure build. Every step is motivated by the previous step's cost, so nothing has to be memorised in isolation.

This is what makes the last lesson able to ask "what did all of these have in common" and get a real answer.

## Questions test understanding, not vocabulary recall

Every wrong `mcq-single@2` option should reflect a specific real misconception, not just be false - "C is what you get if you use the slant side instead of the perpendicular height," not "C is wrong."

## Cover the whole chapter; decide the shape yourself

No fixed lesson count or slides-per-topic ratio - pace from what the material needs (see `docs/generation-playbook.md` step 2).

## Reflection boxes ("Let's Explore" etc.)

Ungraded - a `content-block@1`, never a `semantic-descriptive@1` (no rubric for an open opinion). Don't just restate the textbook's question: add 2-3 short considerations spanning different viewpoints so the student has something to reason with, not a blank prompt. That's real value over the textbook, not filler.

## Explain beliefs, don't just report them

Naming a belief without saying why people would have believed it is trivia, not history. Ground it in the believers' actual situation - an environmental pressure, an unexplained uncertainty, an observation later generalised, a political problem it solves (who gives orders, why a decision is trusted). Treat it as a reasonable response, not an ignorant guess.

## Give history's relevance away

State the ancient-to-modern continuity explicitly somewhere in the chapter (one synthesis slide near the close usually suffices) - don't leave the student to infer why any of it matters. Name the specific mechanism carried forward (a record-keeping system, a standard, a form of legitimate authority), not a vague "shaped the modern world."

## Earn every scene

A scene goes on a slide only if it makes something visible that prose, a table or a worked calculation cannot: a relationship that moves, a distribution that builds, a structure compared side by side, a mechanism over time. Test each planned scene with two lines on its outline slide (Stage 1b):

- `Shows:` what becomes visible that text cannot ("the row 'risk' moves as controls per case change while the column rates stay put").
- `Without it:` what the learner would lose ("they would take 33/88 as a risk").

Both weak: the slide is Text only, with one emphasis device: pull quote, takeaway, table or worked steps (`docs/numericals.md`). Decoration fails the test: a card with a "?", a board that pins a number the prose already states, a picture with nothing to do and nothing that changes. Signal: no learner action AND no changing quantity. Under `quill` (school) AGENTS.md rule 11 still wants a scene on most slides: the test decides what the scene shows, not whether to drop it. Under `plain` or a college audience a Text only slide is a normal outcome.

## Dry, text-heavy subjects: which visuals first

Epidemiology, statistics, law and economics read as dry, and students dislike them; visuals matter more there, not less. Spend the effort where the idea is hard, not on every slide. Reach for these first, in this order:

1. Editorial panels (`docs/numericals.md`, SimPanel): a live reading with its formula, a rule table with selectable columns, bar comparison, a step-by-step calculation panel, an annotated sentence, a histogram that builds.
2. A population as dots that sorts, splits or fills (`dotsSvg`), a flow or timeline (the `figure` field, FlowBoard).
3. Bespoke illustration only when the picture is the mechanism.

Never: decorative boards, props or desk dressing that hold no idea.

## Clarity beats brevity

First-time learners need the full explanation: what, why this way, what it means. Explanatory depth is a strength; do not trade it for concision. Split a long explanation over beats instead of cutting it; the sentence limits in `docs/voice-and-tone.md` still hold.

=== FILE: .agents/skills/content-authoring/SKILL.md ===
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

=== FILE: docs/descriptive-questions-and-cbse-marks.md ===
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

=== FILE: docs/copyright-and-sourcing.md ===
# Copyright & Originality - Content Authoring

Applies to every file you write.

## Text

Chapter source (`.txt`/`.pdf`) is reference material only - what concept to teach, what examples/numbers to use, never text to reproduce. Every `markdown`/`prompt`/`stem`/`explanation` field is your own synthesis, in your own structure. Sentence-by-sentence paraphrasing is not synthesis - restructure around the pedagogical shape (POE, worked example) rather than the textbook's paragraph order.

**Author's own material** (`bundle.json` `"sourceOwned": true`, set by the operator when the source is the course author's own slides or notes): close paraphrase is allowed, and the author's terms, definitions, examples and wording may be kept. Still restructure for the slide shape (POE, beats). Anything inside it the author did not create (a published figure, a dataset, a quoted paper) is third-party: cite it (author, year, title, table or figure, licence) in `FIGURES.md` or the log, and redraw figures as below. Without the flag, treat every source as third-party.

## `comprehension-set@1` passages - still original synthesis, one narrow exception

Not English-only - CBSE SST/Science case-based questions (a Locke/
Montesquieu source note, a geography extract) use the same shared-stimulus
shape. Write your own original passage/source note, same as any other
field in this doc - never lift a real article, textbook paragraph, or other
publication into `passage`, even paraphrased.

**Exception: English literature extracts** may quote the actual prescribed
poem/story verbatim in `passage`/`extract` (a stanza's imagery, a line's
device has no paraphrase that asks the same question) - the one place in
this kit a verbatim quote is expected. Doesn't extend to an SST/Science
source dressed up "extract-like"; that still needs original synthesis.

- Quote only the minimum needed (a 3-4 line stanza / one-paragraph excerpt),
  never a whole poem/story.
- Never self-mark `"human-approved"` (rule 5) - flag length uncertainty via
  an `authoring.flags` entry for human review.
- Everything else (the `items[]` sub-questions, `explanation`) is still your
  own synthesis.

## Diagrams and images

Never extract/redistribute a textbook's own illustrations. Generate a new, original SVG/description, or source an openly-licensed equivalent (e.g. CC-BY Wikimedia Commons) and record its source/license.

This also applies to `FIGURES.md` (`AGENTS.md` rule 8): its entries are your own description of a figure's layout/content, in your own words, for later stages to work from - never a cropped image, a copied caption, or another reproduction of the source page.

Real places and events (geography, disasters): a real, licence-recorded photo (source URL, author, licence in `media/*.source.md` or the log); never a generated "photo" of a real event. Generated illustrations only for concepts.

Maps: India's border only from the Survey of India layer (`simulations-kit/vendor/geo/SOURCES.md`); an image of a map of India must match Survey of India maps too - do not use a third-party map image unless its source says so.

## Verification pipeline this content will still pass through

Every file starts `"authoring.status": "ai-draft"` (`AGENTS.md` rule 5) and goes through the real engine repo's pipeline before reaching a student: schema/reference validation, mechanical sanity checks (formula ranges, answer-key consistency), and an independent model check. Careful content here reduces what that pipeline flags - it doesn't replace it.

=== BUNDLE INFO ===
bundle bank2, sha256 117f2faef4673e39. GENERATED by tools/staged-generation/build-bundles.mjs from:
- START-HERE.md (11478 chars)
- briefs/bank2-questions.md (2332 chars)
- AGENTS.md (15629 chars)
- docs/question-bank-generation.md (25292 chars)
- docs/voice-and-tone.md (10244 chars)
- docs/pedagogy.md (7002 chars)
- .agents/skills/content-authoring/SKILL.md (29460 chars)
- docs/descriptive-questions-and-cbse-marks.md (11135 chars)
- docs/copyright-and-sourcing.md (3532 chars)
Do not edit: change the sources and rebuild. Everything above is the full text of those sources; do not open them again.
