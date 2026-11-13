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

=== FILE: briefs/stage2-lesson.md ===
# Stage 2 - One lesson: blocks, questions, lesson file, scene stubs

Target: one lesson, `L0N`. Output: `courses/<Bundle>/blocks/L0N/`, `questions/L0N/`, `lessons/les-0N.json`, one stub per scene under `simulations/L0N/`, a log section.

If the invocation has `Only: arcade slide(s) aNN` the lesson already exists: this is a top-up. Do only step 0 for those slides and step 5 (add the block(s), the prose line, the stub(s) and the lesson-file entries in the order the outline gives - after the `s` slide it names), plus a `## Stage 2 - L0N (arcade top-up)` log section. Read only what those steps need (this brief's step 0, `docs/arcade-games.md`, `briefs/reference/stub-format.md`, your outline slice); touch no other block, question or stub. If the lesson file is `human-approved`, set its `authoring.status` back to `ai-draft` when you add a slide. Never change the `authoring` block of an existing file.

## Read

1. `AGENTS.md` (skip if your harness already loaded it) and `.agents/skills/content-authoring/SKILL.md`, both in full (schema, types, layout, numbering).
2. `docs/voice-and-tone.md` and `docs/pedagogy.md` in full.
3. `node tools/doc-section.mjs docs/generation-playbook.md "3. Write the block" "4. Write the question" "5. Write the lesson"`.
4. `node tools/doc-section.mjs docs/simulation-authoring.md "Static images per beat" "smell" "4. Attaching"` and `briefs/reference/stub-format.md`.
5. Your slice of the outline: `node tools/doc-section.mjs courses/<Bundle>/OUTLINE.md "<L0N> -"` (multi-part bundle: `courses/<Bundle>/parts/<NN>/OUTLINE.md`, `<NN>` = first segment of the lesson code) plus the outline's opening conventions (`--list`, then the sections above the first lesson). Ignore other lessons.
6. Only the FIGURES.md entries your slides reference: `node tools/doc-section.mjs courses/<Bundle>/FIGURES.md "<label>"`. Open a page image only when an entry lacks a detail you need; then add that detail to FIGURES.md and log it.
7. `docs/numericals.md` in full (worked calculations, emphasis, affordance; required under plain or college).
8. A chapter with hard names or terms: `docs/glossary.md` (AGENTS.md rule 15). Descriptive questions: `docs/descriptive-questions-and-cbse-marks.md`.

## Write-scope

This lesson's blocks, questions, explanations, lesson file, `simulations/L0N/*.stub.md`, `media/L0N/`, GENERATION-LOG.md, FIGURES.md (adding a missing detail only), `glossary.json` (adding this lesson's terms only; create it if absent, `docs/glossary.md`), `build/`. No scene code, no other lesson, no module file.

## Procedure

0. An arcade slide (`practice`, id `aNN` in the outline; block `blk-l0N-aNN`, placed in the lesson after the `s` slide the outline puts it after): a `content-block@1` whose prose is ONE short line (the game explains itself), `simulation: { src, position: "below" }`, one stub in the arcade format (stub-format.md). Its deck is a data file; the first arcade slide of the chapter names it `simulations/<lesson>/<Chapter>Deck.js` as the stub's `Shared helper:`, later games reuse it.
1. Blocks, in slide order, as OUTLINE.md says (roles, predict/verdict pairs, the one mini-game). The game slide is a `mini-game@1` block - top-level `src`, optional `objective`/`xp`, no prose (SKILL.md) - never a content-block holding a game scene; its setup text goes on the slide before. Prose in sibling `.md` files (`markdownRef`/`promptRef`). Every block `"authoring": { "status": "ai-draft" }`. A deferred predict hands its verdict to the very next block (SKILL.md).
2. Questions, then the lesson file last (so no question is left unreferenced). A lesson mount does not shuffle options, so vary where the correct `mcq-single@2` option sits (1st to 4th, roughly evenly; never mostly 1st or 2nd) and make the wrong options equally plausible and similar in length; `node tools/staged-generation/question-mix.mjs <Bundle>` shows the spread.
3. Every block that shows a scene gets its real `"simulation": { "src": "simulations/L0N/<Scene>.js", "position": ... }` now (a `mini-game@1` block: `"src"`), even though the scene is not written yet.
3a. A slide whose outline line names a `figure` field: write it per docs/figures.md (layout, caption, 2-6 items, `step` per item matching the beats, at most 3 notes). Never draw a flow or panels with `diagram`; lesson-check warns. A `figure.renderer` slide follows docs/renderers.md; run `renderer-lint`. Check the library first (`add-renderer.mjs --list`); add a fit with `add-renderer.mjs`, write a new renderer only when none fits.
4. One stub per scene (briefs/reference/stub-format.md). Write the slide prose FIRST, then the stub with its header lines (Save path, Attached by, Base class) and Beats left to fill; then run `node tools/sim-test/scene-info.mjs L0N --bundle <Bundle>` (it lists scenes by stub, so the stub must exist) for the real beat counts, and complete the stub's Beats and Per beat from them. For a count before any stub exists, count the STEP markers in the slide's markdown. Decide the base class (and `Component:`) from the content with the table in `briefs/reference/stub-format.md` ("Choosing the base class"), not by habit. A scene reused from an earlier lesson needs no new stub. A scene on two or more slides: follow stub-format.md's multi-slide rule (per-slide Per beat lists, `Beat maps:` or `Same beats on all slides: yes`, or variant files) - lesson-check fails it otherwise. Reusing a scene an EARLIER lesson owns: the moment your block points at it, that owner's stub must declare your mount; lesson-check runs the gate on it and names the fix. You may amend that one stub for this (never its design or prose). If the counts cannot be told apart, or the two mounts play by different rules, add a variant file in YOUR lesson's folder (`<Scene>-<context>`) instead and leave the owner alone. Do not change a slide's prose to make beat counts differ; that is a workaround - use variants. For a generic mechanism (particles, a number line, a lever, a graph of a standard law; not a story- or cast-bound scene) run `node tools/find-scene.mjs "<what it shows>"` once: if a hit fits, add the header line `Copy-from: <id>` (`Reuse:` keeps its meaning: something in THIS bundle); no fit: no line.
4a. **Stub self-check**, for each stub, before step 5 (stubs that contradict their slide cost the Stage 3 agent long deliberation, and it then builds one reading silently). Good shape: `briefs/showcase/EXAMPLE-stub.md`. Check, and fix the stub:
   - Counts: every number of things the stub names ("five names", "three chips", "four rows") equals the count in the stub's verbatim slide text and in `Per beat`. Count them; do not trust memory.
   - Arithmetic: every ratio or reading the stub says will appear ("four times as large", "exactly 27 m") is recomputed from the stub's own inputs (a 3-line `node -e`).
   - No contradiction inside the stub: search Hero, Dials and Per beat for a control that is both "draggable" and "fixed", something both shown and "not yet taught", a beat count that differs between fields.
   - Dials carry numbers (range, step, default); each `Must get right` item says where it comes from (`slide` or `derived`) and how a test would see it (`Check: ...`).
   - Necessity: the stub's Hero, Dials and Run shows deliver the outline line's `Shows:`. A plain or college stub whose only move is tap-to-open and whose `Run shows:` is none is decoration (lesson-check WARNs): give the learner a move that changes a quantity, or make the slide Text only and log it.
   - Affordance: the `Dials:` line names how each control looks (button with a pressed state, slider with its value, chip in the sentence) and the prompt that says the move (`docs/numericals.md` 4).
   - Last, one line before `## Per beat`: `Self-check: counts ok, arithmetic ok, no contradictions` (or what you fixed). Something you cannot settle: `Open question: ...` in the stub, so the Stage 3 agent sees it first.
5. `node tools/staged-generation/lesson-check.mjs <Bundle> L0N` until PASS. The stub's `## Verbatim slide markdown` copies must equal the prose files: do not write a generator script for them, run the check with `--fix-verbatim` after any prose edit (it re-copies them). Slide count: the outline's plan, plus one briefing block per game (a `mini-game@1` block carries no prose), plus any slide you log a reason for.
6. Log under `## Stage 2 - L0N`: `Model:` line, deviations from OUTLINE.md and why, any slide with neither scene nor image and why, details added to FIGURES.md.

## Writing the prose

- The slide prose carries the explanation; the scene only labels. Name the wrong idea before the right one where the outline sets up a dead end.
- Cast: if the manifest has `cast`, every spoken line of a cast member gets `<!-- SAY id [mood] -->` above its paragraph, bubble text without quote marks or `says X` tags, and narration BEFORE a SAY inside a STEP beat (a beat opened by SAY is all one bubble). Written words, learner lines and test text stay narration. Full rules: `docs/voice-and-tone.md` (Character speech).
- Beats: one idea per beat; `<!-- STEP -->` markers give exact control. A beat where the learner acts says what to do.
- Reader: for a non-school audience, its card (packs/audience/<id>/CARD.md) sets the reader and limits, not this line. School audience: Indian class 9-12 students, English often a second language. Plain common words, no idiom or figure of speech, no teasing ("leave that for later"), Indian everyday examples. Connect sentences with because/so/but; never 3+ very short sentences in a row. Full rules: `docs/voice-and-tone.md` (Reader, Staccato). Run `node tools/prose-lint.mjs --bundle <Bundle> --lesson L0N` and fix its warnings.
- Clarity beats brevity: give the full explanation a first-time learner needs; split long explanations over beats, never cut them (`docs/pedagogy.md`).
- Emphasis: each slide's key sentence gets one device (pull quote, takeaway, table, worked steps; `docs/numericals.md` 3), never buried in a paragraph. A `Text only` outline slide uses the device its line names. A number is worked in rows with its formula and gloss (`docs/numericals.md` 2).
- Under plain or college: no game, play, level, score, badge or challenge wording in prose, titles, `objective` or the game briefing slide (say exercise, task, practice; `docs/mini-games.md` "Exercise, not game"). prose-lint flags them.
- Never copy textbook sentences; the source's numbers belong in questions, not prose (AGENTS.md rule 4; `bundle.json` `sourceOwned`: see `docs/copyright-and-sourcing.md`).
- Narrated course (OUTLINE `Narration: narrated`): define each new term in the prose where it is first used, with this slide's numbers (the glossary alone is not enough); show where every number on screen comes from; every button label says its effect; check each invented name for a misleading everyday meaning (a plastics plant "reactor" was heard as nuclear). Each stub gets its `Narration:` line (stub-format.md). `docs/narration.md` 2a, 13.
- Nothing from a later lesson (rule 7): re-read your slides in order once before finishing.

## Done means

- [ ] lesson-check PASSES (validate, stubs, scene paths).
- [ ] Every scene slide has `simulation.src` and a stub with REAL beats; every stub's last line is `Shared helper: ...`.
- [ ] Log section written with `Model:`.

Report (START-HERE.md section 3) plus: slides, questions and stubs written (from lesson-check), deviations from the outline, and judgment calls the outline left to you.

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

=== SECTION: docs/generation-playbook.md :: "3. Write the block" "4. Write the question" "5. Write the lesson" ===
## 3. Write the block files

One file per beat, under `blocks/L0N/blk-lNN-sMM.json` (zero-padded 2-digit slide number - `s01`, not `s1`; see SKILL.md's numbering rule). `content-block@1` for prose, `poe-predict@1`/`poe-explain@1` for a predict/explain pair. Write the beat's prose into the sibling `blk-lNN-sMM.md` file and point the JSON at it with `markdownRef`/`promptRef` - this is the default (SKILL.md's "Prose in a sibling .md file" section), not an occasional shortcut; the JSON itself should carry no more than a trivial one-liner inline, if that. See SKILL.md for field shapes, `examples/blocks/` for worked examples, `docs/voice-and-tone.md` for prose voice. Every block gets `"authoring": { "status": "ai-draft" }`.

If a predict step defers its verdict to a later block, read SKILL.md's `deferVerdict` handoff section first.

Optional, plain look only: `"fold": { "after": N }` on a `content-block@1` steps the first N beats and puts the rest behind one closed "Read more" (its first heading is the label). Fold only secondary beats (asides, source notes, encouragement), never one the next question or slide needs.

## 4. Write the question files

One file per question, under `questions/L0N/q-lNN-sMM.json` (same zero-padding rule as blocks). Numbers, units, rates, tolerance and data tables: `docs/question-bank-generation.md` sections 3.4 and 8.1 (they hold for lesson questions too). Favor types you have a worked example for (`mcq-single@2`, `numeric-value@1`) unless the content calls for another. Do this *before* the lesson file - see step 5.

## 5. Write the lesson file

`lessons/les-NN.json`, referencing every block **and every question** via `blockRef`, in student-facing order - a question is wired in exactly like a block, pointing into `questions/` instead of `blocks/`. See `examples/example-lesson.json`'s 4th `blocks[]` entry.

Do this last, after blocks and questions exist - writing the lesson first and questions "for later" is how a question ends up authored, valid, and never referenced (a silent failure with no per-file error). The lesson-level validator run (step 7) checks for this, but the step order prevents it outright.

=== SECTION: docs/simulation-authoring.md :: "Static images per beat" "smell" "4. Attaching" ===
## Static images per beat - the reveal.images/simulationStep hybrid

`content-block@1` can show a different image per beat: `reveal.images:
{"<step id>": {src, alt}}`, keyed by an *authored* step id - a bare
`<!-- STEP -->` has no id, so the swap silently never fires; use
`<!-- STEP id="..." -->`. A block can carry both `image` and `simulation`:
images show through `simulationStep` (0-indexed beat, sticky, same
convention as `mediaStep`), then the simulation takes over for the rest of
the slide - one-way only, no switching back.

Default to this over a simulation for figurative content (a scene, an
artifact, a person - "what did this look like"). Procedural canvas art
draws a floor plan convincingly, not a photo-real face or a textured pot.
Reaching for figure/hut/pot primitives to fake a *realistic* narrative scene
is the tell - put a real, license-recorded image in `reveal.images` instead.

Exception: a **flat-vector character** built from the primitive vocabulary
(circle, ellipse, stadium, rounded-rect, low-control-point blob) is in scope -
that is what Quill the mascot is, and `SimMascotDom` gives you him ready-made.
The line is representational realism, not "characters". One-line test: if it
needs more than about six primitives or a gradient to read, use an image. Don't generate that image yourself via text-to-image unless explicitly asked - write the prompt instead and save it as `media/L0N/<same-base-name>.prompt.txt`, ready for a later pass to render.

Worked example: `examples/blocks/blk-example-sim-history-map.json`
(simulation only) -> `blk-example-sim-history-images.json` (six images via
`reveal.images`, then `simulationStep` hands off to
`examples/simulations/HarappanCityPlanScene.js` for one interactive beat).
Contrast with `examples/anti-patterns/` - same lesson, before.

## The `CONTROLS: []` smell - a beat-driven reveal is not a simulation

A chart or figure the learner only reads (bars, curves, tables revealed per beat) is a `figure` layout or a course-local renderer, never a scene: `docs/renderers.md`, When.

Before writing a `DomSimulation` scene, name what the student actually
manipulates. If the honest answer is "nothing - it just shows more of the
diagram as the beats advance," that is not a simulation; it is a sequence of
pictures wearing a `.js` file, and `content-block@1` already does that
sequencing natively via `mediaStep`/`reveal.images` with zero custom code.
`static CONTROLS = []` on a scene that only ever reads `beatIndex` is the
tell - a real scene either takes a control input (`onControlChange`) or
advances a *live, running* process (`_tick`, a dwell timer, a drag/drop),
not just a `data-step` attribute flipped by the host. In a DOM or SVG scene
that control input should sit inside the scene (its own buttons, tabs, dials
or drag handles) with `CONTROLS = []`; see #3.3. A static plot or
labelled figure (axes, a curve, a shaded area, named points) is the `graph`
or `diagram` field on the slide or question, not a scene
(`docs/graphing-and-plotting.md`). Rule 11 ("a simulation
belongs on essentially every slide") is about the platform's actual
differentiator - real interactivity - not about maximizing `.js` file count;
don't let it push you into coding a static reveal.

This matters most for **relationship content built from several real
photos** (a food web, a "one broad name hides several species" comparison, a
historical event chain) - exactly the content most tempting to reach for a
scene for, because no single photo captures the whole relationship. Three
correct options, in order of preference:
1. If the relationship can be told as a *sequence* (one photo replacing the
   last as the beats advance), it's a plain `reveal.images` case - see above.
2. If several photos genuinely need to be visible **at once** with
   connecting labels/arrows between them (the case a sequence can't
   express), use `photoDiagram` (`docs/photo-diagrams.md`) - real photos in
   tinted rings, an engine-drawn SVG connector layer, live theme/dark-mode
   support and per-photo `alt` text, all from plain JSON, the same
   "author writes JSON, engine draws it" trade `docs/geometry-diagrams.md`'s
   `diagram` field already makes for synthetic figures. This is the field
   `photoDiagram` exists for - reach for it before either of the other two
   options below.
3. Composing one static image by hand (real photos, hand-placed labels/
   arrows, an ordinary image-editing pass e.g. Python/Pillow) is a fallback
   for a layout genuinely too bespoke for `photoDiagram`'s node/edge model
   - not the default. Never generate that composed image via text-to-image
   (see above) - crop/arrange the same real, license-recorded photos
   instead. A fixed neutral card background (not transparent) keeps it
   legible in both themes if you do end up here.

Only reach for an actual `DomSimulation` here if there is a real control to
attach (e.g. a `select` that re-sorts the same photos into different groups
live, the way `CriterionSelectorScene`-style scenes do) - the interactivity
is the entire justification for the extra code.

## 4. Attaching a simulation to a lesson block

```json
{
  "id": "blk-l04-s05",
  "type": "content-block@1",
  "markdownRef": "blocks/L04/blk-l04-s05.md",
  "simulation": { "src": "simulations/L04/TriangleHalfParallelogramScene.js", "position": "right" },
  "mediaStep": 0,
  "authoring": { "status": "ai-draft", "flags": [], "reviewedAt": null }
}
```
```
<!-- blocks/L04/blk-l04-s05.md -->
Take any triangle ABC... [the beats your BEAT_STEP_MAP maps onto]
```

- `simulation.src`: bundle-relative path, same convention as `image.src`/`blockRef`. A full `http(s)://` URL also works.
- `simulation.position`: `"right"|"left"|"above"|"below"`, default `"right"`. Use `"below"` only for a wide/short scene (number line, long horizontal strip) that would get squeezed in a side column.
- `mediaStep` (optional, 0-indexed): delays first appearance until that beat; omit/`0` shows from beat 0.
- On a `poe-predict@1` block or a question (`mcq-single@2` etc.) the scene shows only AFTER the learner answers, unless `simulation.role` is `"setup"`. A question's static picture (a plot, a labelled figure) is the `graph`/`diagram` field, not a setup scene. Use `"role": "setup"` when the prompt refers to the scene ("the diagram shows...", a snapshot to predict from): it mounts at once, beside the prompt, with no beats. A scene meant for the answer reveal keeps the default.
- On a phone (600 px wide or less) a scene whose design aspect (`PORTRAIT_WIDTH / PORTRAIT_HEIGHT`, else `WIDTH / HEIGHT`) is under 0.8 skips the theatre and takes the page's full width; the page scrolls, Viewing options and Full view stay. No flag needed; `fullWidth` is not the fix for this.
- **Beat count from the markdown must match `BEAT_STEP_MAP`.** Count beats by eye or add `<!-- STEP -->` sentinels for exact control. Mismatch stalls or clamps the scene against the text - not a crash, but check by eye in the harness.
- Put a `##` sub-header (voice-and-tone.md rule 2) *after* the `<!-- STEP -->` sentinel that opens its beat, not before - clearer, though no longer required (the engine folds a leading heading into the beat that follows either way).

=== FILE: docs/figures.md ===
# Figures: the `figure` field

A static figure on a `content-block@1` slide that the engine lays out: a flow of steps, panels, a timeline, small multiples or a side-by-side comparison. You write the content; the engine places it, wraps the text, reveals it per beat and draws it in the course's look (plain, the casefile setting, Quill; light and dark). No coordinates.

Pick it for any non-geometry static figure. The `diagram` field is geometry only (points, segments, angles: docs/geometry-diagrams.md); `graph` is a plotted function (docs/graphing-and-plotting.md). A flow chart drawn with `diagram` is a lint WARN (outline-lint, lesson-check). If the learner should operate something, it is a scene, not a figure.

A kind no layout here can draw, with nothing to operate (read -> renderer, operated -> scene): a course-local renderer, docs/renderers.md (try these layouts first; check the ready-made library first: `add-renderer.mjs --list`).

## Shape

```json
"figure": {
  "layout": "steps",
  "caption": "The 1961 file at each stage. The hypothesis is where an analytical study takes over.",
  "items": [
    { "id": "size", "title": "Size of the problem", "text": "Count cases by time, place and person.", "entry": "Many more malformed births than before" },
    { "id": "clues", "title": "Clues", "text": "Look at where and when the cases fall.", "entry": "A new sleeping drug, on sale since 1958", "step": 2 },
    { "id": "hyp", "title": "Hypothesis", "text": "Put size and clue together as a claim.", "entry": "Thalidomide might be the cause", "step": 3 }
  ],
  "entryLabel": "In 1961",
  "after": { "title": "Analytical study", "text": "Tests the claim", "step": 3 },
  "notes": [ { "on": "hyp", "label": "Hand-off", "text": "Descriptive work ends here.", "step": 3 } ]
}
```

One medium per block: never with `image`, `simulation`, `photoDiagram`, `graph` or `diagram`.

## Common keys

- `layout` (required): `steps`, `panels`, `timeline`, `multiples`, `compare`.
- `caption` (required, at most 160 chars): what to see, one sentence. Plain numbers it (`Fig. 1.4`); do not write the number.
- `items` (required): 2 to 6 (panels 2 to 4, compare 2 to 3). `id` unique, short; `title` at most 40 chars; `text` at most 120.
- `step` (optional, on any item, `gate`, `after`, `aside`, `verdict`, note): the 1-based beat it appears at; default 1. Before that it shows as a dashed outline of the same size, so the figure never jumps. Keep steps within the slide's beat count.
- `notes` (optional): `{ on, label, text, step }`. `on` names an item id (steps: also `gate` or `after`). Label at most 24 chars, text at most 90. At most 3 show at once (the newest); a note sits above the figure with a leader line, or inside its card when the card is not in the first row. The target gets the signature-colour border. Use a note for the one thing to look at on this beat.
- `focus` (optional): what each beat is about. The focused part gets the signature edge (plain: tint and highlighter on its case line); the other shown parts dim to muted ink. Default with no `focus`: the parts that arrive on this beat, when older parts are already shown; else this beat's note targets; a figure shown all at once has none. Override per beat: `"focus": [ { "step": 2, "on": ["clues"] }, { "step": 4, "on": [] } ]` (`on` names item ids, steps also `gate` / `after`; `[]` = none). `"focus": false` turns it off. Narration can move it mid-beat with a cue: narration.md sec 8.
- `position` (optional): `right` (default), `left`, `above`, `below`, `flow`. A phone stacks it.
- `a11yCaption` (optional): what a screen reader hears; generated from the content when absent.
- `tab` (optional, casefile setting only): the folder tab text, at most 40 chars; default the lesson kicker.
- Strings: plain strings or `{ "en": "..." }`.

## Layouts

- `steps`: a flow, left to right; a column when narrow. Item `{ id, title, text?, entry? }`. `entryLabel` heads every `entry` (the running case's value at that stage). `gate { after: <item id>, title, items[1-5] }`: a checklist between two stages. `after { title, text? }`: a dashed "Next" stage for what comes after.
- `panels`: 2 to 4 cards side by side. Item `{ id, title, text, case? }`; `caseLabel` heads every `case` (how it applies to the running case).
- `timeline`: spans on one axis. `axis { from, to, every }` (at most 12 intervals). Item `{ id, title, text?, from, to }` or `{ ..., from, open: true }` when only a start is known (fades to the right); `tone` 1-5 picks the series colour.
- `multiples`: the same small picture repeated. `glyph: "cohort"` (people join at one event, followed forward). Item `{ id, title, event, text }`, `event` at most 16 chars. `aside { label, tags[1-8] }`: a tag row under the figure. Narration can show or focus it as `aside` (`[[focus.aside]]`); text-mode `focus` never picks it.
- `compare`: two or three things drawn the same way. `glyph: "target"`: 14 shots. Item `{ id, title, text, spread, offset: [x, y], tone? }`: `spread` 0-1 of the radius, `offset` -1..1 from the centre. `verdict { text }`: the one-line conclusion under it.

## Rules

- Write content, not layout. No sizes, colours or positions.
- Short words in titles: a title wider than its card stacks the whole flow into a column.
- Text never shrinks below 13 px; long text makes a taller card, so keep it short.
- The prose beats and the figure steps tell the same story: beat N reveals what step N adds, and the focus lights what beat N talks about. When a beat talks about an older part (a recap), set `focus` for that step.
- Plain, in a side column: steps and panels draw as a ruled ledger, one row per item with a serif numeral; keep `title` short, put the detail in `text`, the case in `entry` / `case`.
- Example: `examples/blocks/blk-example-figure.json`. All six layouts in the app: the engine's `tests/fixtures/courses/figure-showcase/`.

=== FILE: docs/numericals.md ===
# Numericals, emphasis and affordance

Who reads: Stage 1b (plans the device), Stage 2 (prose and stubs), Stage 3 (builds the panel). Any look; under `plain` or a college audience these are required (plain CARD 13-17). Kit names are `simulations/base/kit/SimPanel.js` unless another module is named (`docs/dom-scene-kit.md`, SimPanel).

## 1. Clarity beats brevity

A first-time learner needs the whole explanation: what the number is, why it is computed this way, what it means. Do not cut an explanation to look concise; split a long one over beats. The sentence and paragraph limits (`docs/voice-and-tone.md`, the audience card) still hold; depth is not padding.

## 2. A worked calculation

- Numbered rows. Each row: a step label ("Odds of smoking among cases"), the formula with its numbers in a large serif line (`Odds of smoking = 33 / 2 = 16.5`), one gloss line under it in plain words ("33 cases smoked for every 2 who did not").
- Order in a row: letters, then numbers, then the value. Every value carries its unit or says "no unit"; a rate names its denominator.
- Multiply or divide: a stacked fraction, never an inline slash for the key formula: `OR = (14 x 51) / (9 x 6)` drawn as numerator over denominator, then `= 714 / 54 = 13.2`.
- Show worked arithmetic: the products and part quotients sit behind one reveal ("Show worked arithmetic"), so the row reads clean and the check is one tap away.
- Learner computes first where the step is the idea: numeric entry with a Check, a stated tolerance, feedback that names the step that went wrong and shows the worked line. Then the value lands large (count-up).
- One calculation per slide. A second calculation is the next slide or a question.

Kit:

| Pattern | Kit part |
|---|---|
| numbered rows: label left, big serif formula, gloss line; state done / now (tinted, signature edge) / todo (faint plan) / hidden; `fresh` rises in once | `calcStepsHtml([{ label, parts, gloss, state, fresh }], { size })` (or `stepsHtml(rows, { display: true })`) |
| the formula: groups joined by `=`, wraps only at `=` on a phone | `formulaHtml(['Odds of smoking', '33 / 2', { v: '16.5', key: 'o1' }])` |
| stacked fraction for multiply or divide | `{ n: '33 x 27', d: '55 x 2' }` inside `formulaHtml` parts, or `overHtml(n, d)` (write the times sign as `\u00d7`) |
| the value lands large (count-up) | `{ v, key }` part + `countValue(root, key, to, { from: 0, fmt, dur })` |
| one big reading with a stacked fraction and a live formula | `readoutHtml({ label, value, unit, frac: { n, d }, formula })`, `setReadout` (counts up) |
| show worked arithmetic | `revealHtml({ key, html, open })` (caret chip; `bindPanel` `toggle(key, open)` keeps it open across a re-render) |
| numeric entry with a check | `entryHtml({ fields, action, cta, state, feedback })` |
| compact rows (a side note, not the slide's calculation) | `stepsHtml([{ label, formulaHtml, gloss, state }])` |
| no scene on the slide | markdown: a numbered list, one step per item, the formula in `$...$` with `\frac{}{}`; the value in bold (engine markdown + math) |

## 3. Emphasis

- The slide's key sentence is never buried in a paragraph. Pick one device:
  - pull quote: a `>` line, the sentence alone;
  - takeaway: in prose a bold sentence alone in its paragraph; in a scene `takeawayHtml(lead, rest)` (bold lead between two rules);
  - in a scene: `pullQuoteHtml(html, { label, cite })` (serif, signature rule at the left); `emHtml(text)` marks the one phrase inside it (bold on a highlighter band); a correction is `editHtml(del, ins)` (original struck, replacement in the signature colour), then the whole corrected sentence as the pull quote;
  - table: the key numbers as a markdown table (or `ruleTableHtml` when cells are picked or filled);
  - worked steps: section 2.
- One device per beat, one pull quote per slide. Bold marks a term at its definition and the one takeaway; never scattered bold.
- A Text only slide (no scene, `docs/pedagogy.md` "Earn every scene") names its device in the outline: `**neither** (Text only: pull quote; <reason>)`.

## 4. Affordance

The prose says what to do; the object shows that it can be done.

- Anything the learner acts on looks actionable: a button-like control (rim or fill, focus ring, hover), never plain text that happens to be clickable. A tappable word in a sentence is a chip, not a bare word.
- A visible state: picked vs not picked is obvious (tint, rule, `aria-pressed`); a disabled control looks disabled.
- A prompt says the move before the first action ("Tap a column head to read its rate"), in the slide prose or a kicker in the scene, and the scene waits.
- After the move, the result is next to the control that made it.
- Stubs: the `Dials:` line names the control and its look ("column heads are buttons with a pressed state"), not only the gesture.

Kit:
- `promptHtml(text, { done })` - the line that says the move, above the control ("Select the Cases column"); `done` mutes it with a tick.
- `chipsHtml([{ label, action, value, pressed }])` - the shared actionable chip (`.spn-act`): rim, paper fill, a small select ring, hover tint, focus ring; picked = signature tint + rim, ring filled, `aria-pressed`.
- `ruleTableHtml({ pick: 'col' | 'row', sel })` - heads are buttons; under plain they are the same chips; the picked line tints with a signature edge.
- `sentenceHtml({ words: [{ w, fix }], picked, showFix })` - a sentence of word chips; the picked word with a `fix` is struck and the fix follows it.
- `buttonsHtml`, `sliderHtml` (live value large), `entryHtml`, `flowChoiceHtml` (SimFlowDom).

## 5. Checks

- `outline-lint`: a scene slide without `Shows:` / `Without it:` (ERROR under plain or college); a scene line with no action and no changing quantity (WARN).
- `lesson-check`: a plain or college stub with only tap-to-open and `Run shows: none` (WARN, decoration).
- `prose-lint`: game words in learner-visible text under plain or college (`docs/mini-games.md` "Exercise, not game").

=== FILE: briefs/reference/stub-format.md ===
# Scene stub format (Stage 2 writes it, Stage 3 builds from it)

One stub per scene to build, at `courses/<Bundle>/simulations/L0N/<SceneName>.stub.md`, next to where the scene will go. A Stage 3 agent reads this stub, the slide prose and nothing else of the lesson, so the stub carries every decision the scene needs. Be concrete: "a steel ball on a ramp, 1 kg, released from 2 m" beats "an energy scene". `tools/staged-generation/lesson-check.mjs` checks the form.

```
# <SceneName> - simulation stub
Save path: simulations/L0N/<SceneName>.js
Attached by: blk-l0n-s0m (<role>)[, blk-... (<role>)]
Beats: <N> (the attaching slide's real count: tools/sim-test/scene-info.mjs)
Base class: SimScene | DomSimulation | GeoScene | CanvasSimulation | WebGLSimulation (<one-line reason>)
Hero: <the ONE big object in the middle: what it is, what it looks like>
Dials: <id: what the learner changes (options, or range + step + default) -> what visibly changes>; or none: <what the learner does instead (tap, drag, Run)>
Run shows: <what moves when the learner acts, and how the run ends> | none
Profile: rich | lite | course   (optional line; default course; docs/visual-profiles.md)
Note card: <what the scene leaves out or exaggerates, one line> | none   (rich: usually none; the caveat goes in prose)
Must get right: <one item per line: (slide|derived) the fact, number, colour or order the drawing must match. Check: how a test would see it>
Not yet taught: <words and ideas the scene must not show (later lessons)> | none
Reuse: <an existing scene or helper in this bundle to import, and what for> | none
Copy-from: <id from tools/find-scene.mjs, optional: a verified scene of another bundle Stage 3 copies and adapts>
Narration: <only when the OUTLINE says `Narration: narrated`: ids the voice will name (each cell, margin, group, legend part); moves the teacher demonstrates (cue ids); per wait: closed (what end the scene detects) or exploration> (docs/narration.md 13)
Self-check: counts ok, arithmetic ok, no contradictions   (see Stage 2 step 4a; unresolved: `Open question: ...`)

## Per beat
- beat 0: <what is drawn / what the learner can do / what happens>
- beat 1: ...
Recipes: <optional, one line> b0 <recipe>; b1 <recipe> ...

## Verbatim slide markdown
### <block id>
```markdown
<the slide's .md, exactly, with its <!-- STEP --> markers>
```

Shared helper: <File>.js | none
```

Rules:

- An arcade practice slide (outline role `practice`): a much shorter stub. Header lines `Save path`, `Attached by: blk-l0N-aNN (arcade)`, `Beats: 1` (the slide's one line of prose), `Base class: Arcade<Sort|Route|Match|Order|Judge>Scene`, `Skin: <skin>`, `Deck: <what it drills, and which deck file/export>`, `Taught by: L02, L03 s04`, `Rounds: 12`, `Reuse: <deck or scene it extends, or none>`; then `## Play` (which items, which mix-ups and myths the deck must hold and why, the answer key or the evidence line for each, anything the boss round should feature) and the verbatim slide markdown; last line `Shared helper: <Chapter>Deck.js` (the deck file) or `none`. Archetype and skin choices: `docs/arcade-games.md`; never art or colour that gives the answer away.
- A game (`mini-game@1`, role `game`; under plain or college an exercise, `docs/mini-games.md` "Exercise, not game", no game words in its strings): `Beats: none (mini-game@1 mounts once)`, and replace `## Per beat` with `## Play`: the objective in one line, what the learner changes, what `checkObjective()` returns (`{ value, target }` or `{ ok }`), when it is solved, and why the win condition IS the concept's rule (tie level L2, docs/mini-games.md). `Base class: DomSimulation` via `withChallenge` unless the play needs continuous motion.
- `<role>` is the slide's job for this scene: `hook`, `predict-setup` (mounts beside the question, no beats), `predict-reveal` (mounts after the answer), `explain`, `example`, `game`.
- `Beats` and the `Per beat` bullets use the REAL count (`scene-info.mjs` prints it).
- `Run shows`, `Per beat` and `Must get right` must not contradict each other (what moves, in what order, what is visible at which beat). Re-read the three together before saving; a stub that contradicts itself costs the Stage 3 agent 4-15% of its run.
- One scene file on several slides: the scene learns only the beat COUNT, never which slide mounted it. So decide, and write it down (lesson-check fails the stub otherwise):
  - Under `## Per beat`, one `### <block id>` list per slide, each with that slide's number of `- beat N:` bullets.
  - Counts differ: `Beats: 4 (blk-a), 3 (blk-b)` and `Beat maps: 4 -> blk-a, 3 -> blk-b` (Stage 3 declares `static BEAT_MAPS = { 4: ..., 3: ... }`).
  - Counts equal: only if the slides progress beat for beat the same way, add `Same beats on all slides: yes`. Otherwise - or when some counts repeat and others differ - make one scene file per slide (thin variants, e.g. `PushStopWorkScene-save.js`, sharing a helper named on the `Shared helper:` line). Variants are the safer default.
- `Hero:` is an object or apparatus; a person is added with the kit figure (`drawFigure`) when the pose is the point (push, pull, lift, climb), never hand-drawn. A portrait of a real person is an image.
- Optional `Component: Timeline | FlowBoard | AllocBoard | SlotBoard | NumberLine | Chart | Geom | Chance | Venn | none` and `Data:` (the events, nodes, items or rows it needs, with sources). A named component means the scene is mostly its config.
- `Recipes:` (optional, one line after the beats): per beat, the motion the beat is about, in kit names from `briefs/reference/kit-parts.md`, e.g. `Recipes: b0 lagged fly-in (flyMany); b1 countUp ring counts; b3 transformTerms "6 + 4" -> "10 - 8"`. Write it for a beat whose idea is "this becomes that", "these fly in", "look here" or "a count grows"; omit it otherwise. Stage 3 builds those beats with the named recipe; check-scene warns (never fails) if the scene does not use a name listed.
- A beat where the learner must act (the slide says "try", "run", "turn") says what to do and that nothing happens until they do.
- The scene delivers its outline slide's `Shows:` line (`docs/pedagogy.md` "Earn every scene"). Under plain or college a stub whose only move is tap-to-open and whose `Run shows` is none is decoration: lesson-check WARNs.
- `Dials:` names how each control looks and its picked state (a column head is a button with a pressed state; a word is a chip), not just the gesture (`docs/numericals.md` 4).
- `Dials: none` is fine only with an answer to "what does the learner do here?" A scene where nothing can be touched and nothing runs is a slideshow: make it an image or `reveal.images` instead (docs/simulation-authoring.md, "The CONTROLS: [] smell"). In a DOM or SVG scene the dials are built into the scene, not the host strip (docs/dom-scene-kit.md "Controls live in the scene").
- A variant stub (a thin subclass such as `-return`, `-case2`, `-payload`) gets `Subclass contract: <hooks the helper exposes (e.g. _spreadTarget(stage), noteRows, BEAT_STEP_MAP) and what is forbidden (onBeatChange, re-assigning this._s)>`. The helper's own stub states its method list and any shared meaning (e.g. what a lit lamp means) once, so no scene reconciles it again.
- The same concept on several slides: independent scenes (each mount is fresh and memory-less), optionally sharing a helper module. Several stubs that share a helper name it on the same last line; Stage 3 builds the first one together with the helper.
- `## Verbatim slide markdown`: one `### <block id>` fenced copy per slide in THIS lesson that mounts the scene, byte-equal to the prose file. `lesson-check --fix-verbatim` writes and refreshes them; never hand-copy or script them.
- Geography stubs add, after `Reuse:`, the lines that apply: `Camera: <shot per beat; orbit yes/no>` (GeoScene), `Projection: <kind, extent, layers>` (maps), `Data: <SimGeo layers used>`, `Time axis: <what t spans, units, linear or log>`, `Static fallback: <image for devices with no WebGL> | none` (GeoScene).
- The last line is exactly `Shared helper: <File>.js` or `Shared helper: none` (next.mjs parses it).
- Labels only: a scene tags and names, it never explains. Nothing in the stub may ask it to show a sentence of prose.

## Choosing the base class

Decide from the content's shape, and write one reason on the `Base class:` line. Stage 3 picks its guide from this line.

Nothing operated and nothing moves (a plot, an area under a curve, a fixed labelled figure, even revealed per beat): no scene and no stub; put `graph` or `diagram` on the slide or question (docs/graphing-and-plotting.md).

| The scene is | Base class | Component |
|---|---|---|
| a labelled figure with one live value: angles, constructions, a dragged point, an area model | `SvgScene` | `Geom` |
| a number line, fractions, hops, spans | `SvgScene` | `NumberLine` |
| bars, a graph, a histogram, a pie, seats, a tally | `SvgScene` | `Chart` |
| dice, coins, cards, spinners, outcome grids, trees, long-run trials | `SvgScene` | `Chance` |
| Venn rings, regions, sort items into regions, shade a set expression | `SvgScene` | `Venn` |
| dates, eras, "place the event" | `DomSimulation` | `Timeline` |
| a cause chain, a cycle, a tree, "put in order", "what comes next" | `DomSimulation` | `FlowBoard` |
| a coalition to a majority, a budget split, fill to capacity | `DomSimulation` | `AllocBoard` |
| compare matrix, claim vs evidence | `DomSimulation` | `SlotBoard` |
| drag items onto targets (pairing, matching) | `DomSimulation` | none (`simPick`, not a board) |
| labelled panels, tables, cards, sorting | `DomSimulation` | none |
| apparatus that moves (a cart on a ramp, a pendulum), a drawn process, anything with a hero and physical motion | `SimScene` | none |
| a pan balance (weighing, an equation) | `SimScene` | none |
| the earth in 3D (cutaway, valleys) | `GeoScene` | none |
| a map or a cross-section | `SimScene` | none (a `Projection:` line) |
| a practice game of fast rounds | `Arcade*Scene` (Sort, Route, Match, Order or Judge) | none |
| a challenge game (`mini-game@1`) | `DomSimulation` with `withChallenge` | none |

If two rows fit, take the one whose Component names the learner's actual action. A person or an animal in the scene is added by Stage 3 with the kit figure; say so under `Hero:`, not in the base class.

=== FILE: briefs/showcase/EXAMPLE-stub.md ===
<!-- EXAMPLE stub, a good shape to copy. Trimmed from a real scene (work-energy L05 EscapeRampScene): the numbers are real, the slide prose is omitted here (the real stub ends with a "## Verbatim slide markdown" section that lesson-check keeps equal to the prose file). Read it for the SHAPE: concrete Hero, numbers in Dials, Must get right items each with where it comes from and how a test sees it. -->
# EscapeRampScene - simulation stub
Save path: simulations/L05/EscapeRampScene.js
Attached by: blk-l05-s09 (example)
Beats: 3
Base class: CanvasSimulation (a truck climbing a ramp in one dimension with four energy entries posting as it goes: the motion is simple but the ledger is the content, and it must stay readable while the truck moves)
Hero: A truck at the bottom of a road on the left, a gravel ramp climbing to the right at a fixed 30 degree slope, and a four-row ledger card beside the scene: what it arrived with, what the climb costs, what the gravel takes, what is left.
Dials: ramp length, 10-60 m, step 0.5 m, default 10 m (a slider; the gravel bed stretches along the fixed slope). Gravel resistance, 0-4000 N, step 250 N, default 1500 N. No speed dial and no braking control: the truck cannot stop any other way. Run button.
Run shows: Run sends the truck from the road onto the ramp. The four entries post as it climbs; it stops partway up, arrives at the top still moving, or stops exactly at the top. The last entry reaching nothing exactly as the truck reaches the top is the answer; the scene must not announce it.
Note card: the angle is drawn and fixed; the height gained is half the ramp length, shown as a dashed rise, not computed on screen. Both bills are drawn as withdrawals from one account.
Must get right:
- (slide) TWO bills come out of ONE account, the climb and the gravel; the second is a second bill, not a bonus. Check: both bill rows are non-zero after a run at length 27, gravel 1500.
- (slide) Too short a ramp leaves the truck still moving at the top; longer than needed stops it short. Check: length 10 -> verdict says still moving; length 45 -> verdict says stopped short.
- (derived, 202500 / (6000 + F) m) Only the length that empties the account exactly at the top is a stopping ramp, and the scene never prints that length. Check: after a run the visible text contains no length in metres other than the dial's own value.
Not yet taught: no conservation by name, no answer in metres on screen. No power, no machines.
Reuse: none. Mounted once.
Self-check: counts ok (3 beats = 3 Per beat entries; 4 ledger rows; 2 bills); arithmetic ok (L* = 27.0 m at F = 1500 N); no field contradicts another.

## Per beat
- beat 0: the truck at the bottom of the road, four ledger rows empty, both dials live. The learner can set and re-set before running.
- beat 1: a deliberately short ramp run (the default 10 m). The truck leaves the top with speed left and the fourth row is still non-zero. Nothing is locked after the run.
- beat 2: the length worked up until the fourth row reaches nothing exactly as the truck reaches the top, and one step further so the truck stops short. Both ends of the dial are shown; the scene does not name the answer.

## Verbatim slide markdown
(omitted in this example)

=== BUNDLE INFO ===
bundle stage2, sha256 5ac55b15a5a5c936. GENERATED by tools/staged-generation/build-bundles.mjs from:
- START-HERE.md (11478 chars)
- briefs/stage2-lesson.md (11488 chars)
- AGENTS.md (15629 chars)
- .agents/skills/content-authoring/SKILL.md (29460 chars)
- docs/voice-and-tone.md (10244 chars)
- docs/pedagogy.md (7002 chars)
- docs/generation-playbook.md :: "3. Write the block" "4. Write the question" "5. Write the lesson" (2166 chars)
- docs/simulation-authoring.md :: "Static images per beat" "smell" "4. Attaching" (7242 chars)
- docs/figures.md (5889 chars)
- docs/numericals.md (5995 chars)
- briefs/reference/stub-format.md (10356 chars)
- briefs/showcase/EXAMPLE-stub.md (3245 chars)
Do not edit: change the sources and rebuild. Everything above is the full text of those sources; do not open them again.
