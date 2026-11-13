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

=== FILE: briefs/bank1-plan.md ===
# Stage B1 - Question bank plan: write BANK-PLAN.md

Target: one bank for the bundle. Source: the invocation's `Source:` (one or more chapters). Output: `courses/<Bundle>/BANK-PLAN.md` (plus FIGURES.md and GENERATION-LOG.md if no earlier pass wrote them). The bank track is independent of the lesson track: never read or write lessons/, blocks/ or simulations/.

## Read

1. `AGENTS.md` (skip if your harness already loaded it), then `docs/question-bank-generation.md` in full.
2. English / language-arts: that doc's section 9 IN FULL before planning; it replaces the type pool and changes what topicId means.
3. `courses/<Bundle>/FIGURES.md` if it exists: reuse it, do not re-inspect the source. If it does not exist, do the doc's Source step yourself (rasterize, view figure pages one at a time, write FIGURES.md in the format of `briefs/stage1a-source-scan.md`).

## Write-scope

`BANK-PLAN.md`, `FIGURES.md` and `GENERATION-LOG.md` (only when you did the source inspection), `build/`. No question JSON, no explanations, no bank index, no questions/bank/, explanations/bank/ or banks/ directories yet.

## Procedure (the doc's Plan step only)

1. List every source chapter feeding the bank; the floor/spread rules apply per topic across all of them.
2. One coverage matrix (topic x type counts x difficulty counts) before any question line: floor >= 6 per topic, spread >= 3 types per topic, no type over ~40% of the bank, `olympiad` only where a topic warrants it. `comprehension-set@1` is not in the matrix (step 3).
3. Any `comprehension-set@1`: a separate `## Comprehension sets` list sized by distinct passages/extracts/sources that give real depth (section 8), each with its sub-items' type and weight committed now (e.g. `mcq-single@2 x3 (1 mark each), semantic-descriptive@1 x2 (2 marks each)`). English: section 9's minimums. Each entry still gets its own Question list line.
4. `## Question list`, one line per planned question, exactly `- <id> - <type> - <topicId> - <difficulty>` (e.g. `- q-bank-014 - mcq-single@2 - photosynthesis-inputs - medium`). One topic's questions contiguous (Stage B2 batches by topic run). Matches the matrix row for row; no extra tables restating its totals.
5. Log under `## Stage B1 - Bank plan` with a `Model:` line.

Report (START-HERE.md section 3) plus: per-topic counts (flag any topic just at the floor), the type distribution (flag any type over ~40%), olympiad questions and why, the Comprehension sets list (flag "one per topic" sizing or a single repeated sub-item type), and anything too terse for a B2 agent working from one line. English banks: all five `writing-*` genres present, and the Reading/Writing/Grammar/Literature counts against section 9.

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
18. `guides/` is for human readers (also shown in the live app); agents do not read it.

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

=== BUNDLE INFO ===
bundle bank1, sha256 e53190885b4e517a. GENERATED by tools/staged-generation/build-bundles.mjs from:
- START-HERE.md (11478 chars)
- briefs/bank1-plan.md (2709 chars)
- AGENTS.md (15717 chars)
- docs/question-bank-generation.md (25292 chars)
Do not edit: change the sources and rebuild. Everything above is the full text of those sources; do not open them again.
