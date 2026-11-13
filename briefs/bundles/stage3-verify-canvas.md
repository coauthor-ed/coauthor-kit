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

=== FILE: briefs/reference/scene-rules.md ===
# Scene rules learned the hard way (read once before writing code)

Each rule came from a real incident in an earlier course (93+ scenes, plus a full weak-model run). Rules marked [check] are enforced by `check-scene`; the rest are yours to keep.

## Beats, stages, mounts

- Beat counts come from `scene-info` (the engine's own split), never from memory. [check: beat-check]
- A scene on two slides with different beat counts: `static BEAT_MAPS = { 4: MAP_A, 3: MAP_B }` and `static BEAT_STEP_MAP = MAP_A`, each map built from that slide's own beat list in the stub (check-scene fails a count with no entry). The scene sees only the count, never the slide, so equal counts can share a map only when the stub says `Same beats on all slides: yes`; otherwise the slides get separate scene files. A wrong map fails silently: the scene runs and teaches the wrong beat.
- Every mount is fresh; beat j may be the first beat the scene ever sees (a resumed lesson). SimScene enters stage 0 in `setup()` and then jumps to the beat's stage with no time in between, so a run that `enter(0)` starts is still going when stage j begins.
- Credit a finished run to a token taken at launch, never to the current stage: `this.run = { stage: this.stage, dose }` ... `this.done[this.run.stage] = true`. Delayed actions use `this.after(seconds, fn)` (dropped on a stage change), never `setTimeout`. [check: resume probe]
- A scene never defines `onBeatChange` (SimScene owns it). On a helper subclass, beat-to-state goes through the helper's stage hook (`enter(stage)` or e.g. `_spreadTarget(stage)`), with one stage per beat in `BEAT_STEP_MAP`. [check: FAIL, WARN if all idx equal]
- `enter(stage)` resets what that stage owns. If an earlier stage's run should not survive into this one, stop it here.

## Coming to rest (CONTINUOUS = false is the default)

- SimScene: return true from `busy()` while anything that matters moves (a run, an easing, a scripted sequence). The loop parks 1.5 s after it goes false. A run longer than the 8 s a beat or control grants, with no `busy()`, freezes mid-run with no error (three scenes froze this way). [check: freeze probe]
- `busy()` must go false: a ball placed but not released is neither moving nor settled, so `!settled` kept one scene awake for ever. Use "is moving". [check: freeze "never parks"]
- Every run ends: a time limit, a settled threshold or an exited flag (a marble pinned on a slope, marbles bouncing between posts for ever, pieces drifting off-canvas). [check: freeze]
- CONTINUOUS = true only for motion that never ends, with a one-line reason comment on that line. [check]
- Reserved names: your fields and methods must not reuse base-class internals (`_running`, `_rafId`, `_tick`, `_loop`, `_k`, `stage`, `age`, `clock`, `after`, ...). Use names like `_going`, `_t`, `_spin()`. [check]

## Controls and input

- `CONTROLS` entries are `{ type, id, label, ... }`; `type` is `button | slider | range | select | number | toggle | checkbox | segmented`. `kind:` or any other word draws nothing (an empty control bar): check-scene FAILs it. `select`/`segmented` options are `{ value, label }` or plain strings; with `{ id, label }` every option silently becomes `value="undefined"` (also a FAIL). The scene receives `true` (button), true/false (toggle, checkbox) or a STRING (all the rest).
- A scene whose lesson depends on its CONTROLS sets `static CONTROLS_IN_SIGHT = true`. Without it the host may hide them in a closed tray to keep the scene big.
- A slider's `suffix` is its unit, such as `' g'` or `'%'`. No suffix shows the plain number.
- `isControlHidden(id)` for beat-specific controls (hidden on a setup beat so the learner predicts first), `isControlDisabled(id)` during a run, `getControlValue(id)` for selects and sliders (the host draws each control at this value; SimScene's default returns the last value the host sent, else the control's declared `value`, so override it when the scene starts somewhere else; the host sends sliders, selects, numbers and segmented as STRINGS, so `Number(v)` before arithmetic), `this.requestUiUpdate?.()` after anything that changes the bar. The host highlights the button whose id equals `this.mode` (an OFF/ON dial).
- Start `onControlChange(id, v)` with `if (!this._guard(id)) return;` (SimScene: false for a hidden or disabled control). `_guard`, `super.isControlDisabled` and `super.getControlValue` exist on SimScene only: DomSimulation and SvgScene have none of them, so write the check yourself. Your own `busy()` checks may also drop input during a run. `shoot` prints both cases, so a dropped control is never a mystery.
- A beat that says "try it" is learner-driven: nothing happens until they act, and a pulsing hint chip says what to do. Accept a tap on the thing itself as well as the control-bar button (phones).
- A scene with nothing to touch and nothing running is a slideshow; give the learner something real to do, and log any control you added that the stub did not name.

## Numbers, models, science

- Use the slide's numbers exactly; your own model numbers must be physically sensible and are listed in the design note.
- A comparison decided by noise came out backwards (fridge box beat warm box 8 to 4). Give both sides the same seed (`mulberry32(7)`), choose parameters with a margin, and try several seeds.
- Bookkeeping must add up (mass in = mass out; crossed + turned back = total); a "done" detector fires once (a run was marked done at t = 0).
- Tune for what the learner must see within seconds, then name the simplification in the note (one line at the bottom; see simulation-authoring.md, "Note").
- Draw what is true. If the slide says something false or impossible, leave that detail out and flag it in the log; never fix the slide yourself.
- Name nothing the lesson has not taught yet (the stub's `Not yet taught`).

## People

- Plain look (card item 8): a person or animal only as the subject of the mechanism (the kit draws it faceless), never as cast or decoration; a population as data is `dotsSvg` or a count. Never hand-draw a person: `drawFigure` (pose + `hands`/`feet` targets; `facing: 0` front view for standing, cheering, pointing) or `drawPersonGlyph` for crowds. Height >= 90 px with a face, grips within ~0.25 x height of the feet; check-scene WARNs a grip out of reach or a figure under 60 px. [check]
- Arrows and chips beside a figure, never across it; anchors are in `sk.anchors` (hand, head, foot, top).

## Boards, numbers, symbols

- DOM input goes through `simPick()` (drag, tap-tap, keys); never HTML5 drag events. [check: sim-lint html5-dnd]
- Numbers through SimText: Indian grouping for lakh/crore, `\u20b9`, BCE/CE years, stacked fractions (`fracHtml`, `drawMath`).
- No party symbols, State Emblem, national flag (unless the slide is about it), chakras, religious symbols or banknotes: invented neutral symbols and SimIcons.
- Data shapes (number lines, charts, geometry, chance) are SVG (`SvgScene`): lay out for `st.W`, so portrait is its own layout.

## Say and show together (maths first; any subject where it fits)
- The sentence on a beat and the part lit on that beat must match: light what the beat names, dim the rest (dim and line width, no glow), keep ticks and labels readable. Design note: one row per beat: sentence, part lit, part dimmed.
- Tap to light: chips written as the slide's terms or notation light what they name (`tapLight`, kit-parts.md). Any subject. Row in the same view as the figure at 390; the scene draws lit as dim and line width.
- One colour per idea, in text and figure. Put the scene's concept map in the block's `mathColors`; notation in `$...$`; at most 4 meaning colours; never colour alone. Check wrapping at 390.
- A free control comes with 2-4 named cases, and one must fail or break the claim. Name each by what it shows.
- Numbers: a live worked line as written in the book. A rounded value shows the approx sign, never `=`.
- State each result in symbols and plain words; `callout="result"` on payoff beats.
- Proof headings name the move (use the book's terms). Module plan: say if one step should be performed by the figure.

## Narrated courses (OUTLINE says `Narration: narrated`; docs/narration.md 5, 6, 8, 13)

- Extend `withNarrationCues` from `simulations/base/kit/SimNarration.js` when the stub lists cue ids: `static CUES`, `applyCue(id, ms)`, `cueBase()`, `cueReset(base)`; all cue state in `this._nc`. A cue is the teacher's hand: the same visible change a learner's move gives. A cue never calls `interactDone`.
- Tag every part the stub's `Narration:` line names with `data-narr="id"`: each table cell, margin and total separately (the voice says "a plus c" and both cells light), each group, each legend part. Never nest tags (a lit part inside its group is fine). Never tag empty placeholders. `data-narr-hide` on readouts and chips the voice never names.
- `this.interactDone(id)` only on an end-of-gesture event (click, `change`, pointer up) after a real change by the learner, with the result on screen. Every control the voice may ask for changes something visible.
- Colour is data (blue = case)? The lit glow would read as data: `narrOn(this, f)` in `narrationFocus(f)` + `narrKeepColourCss(ids, sel)` in the css.
- One encoding for the whole scene: a dot, fill or mark means the same thing in every view and step; the legend says it in words and stays visible; each button says its effect in one sentence.
- Header comment lines: `Cues:` (id: effect), `Completion:` (what sends interactDone, or "none: exploration waits use Done"), `Narration focus ids:`. Text mode (narration off) must not change by a pixel.

## Text and legibility

- Labels only: part names, readings, short state chips (about 6 words at most). Never a sentence from the slide.
- Chips in a row: `chipRow(...)` (measured widths), never hand-typed x offsets - fixed offsets overlapped five times in one run.
- Put chips beside or above what they label, never on the evidence ("none inside" once covered the flies it named).
- A live number redrawn every frame reads as overlapping text: hold the shown value and refresh it about once a second.
- Text on an `alpha()` fill has low contrast; use an opaque `mix()` colour. Pop a number by font size, not by scaling the context.
- Plain digits for formulas: `CO2`, `H2O` (the font has no subscript glyphs). Pluralise built labels (`1 rung`, `2 rungs`).

## Files

- Kit source, no searching needed: `simulations-kit/src/simulations/base/` has `SimulationBase.js` (`animateFor`), `DomSimulation.js` (`render`, `stepIndex`), `CanvasSimulation.js`, `SimUi.js`, `SimControls.js`, `SimMotion.js`, `SimDrawUtils.js`, `SimTheme.js`; `kit/` has `SimScene.js` (`after`, `onBeatChange`), `SimSvg.js` (`repaint`, `after`), `SimText.js`, `SimLook.js`, `SimLookDom.js`. `animateFor`, `after`, `stepIndex`, `repaint()` are methods, not exports: `kit-api --sig` will not find them.
- A scene file exports exactly one thing, its class; constants go in a helper. [check: WARN]
- Scenes extend `SimScene` (canvas) or `DomSimulation` directly; shared behaviour lives in helper functions and classes, not in an intermediate base class. A scene-applied mixin (`withChallenge`, `withBeats`) is allowed.
- No `crypto.*` (undefined over plain HTTP): `Math.random()` or `mulberry32`. [check]
- A backtick or `${` inside a template-literal CSS comment breaks the whole file in the browser; `ident-lint` parses it the way the browser does. [check]
- DOM: guard every `querySelector` (`?.`); give the scene a rest state so nothing animates on load.

=== FILE: docs/look-base.md ===
# Look base

Rules for every look. A look pack adds its style on top and never relaxes these.

## Look packs

A look pack is a folder `packs/look/<id>/`: `CARD.md` (the rules a scene must meet), `SPEC.md` (reference), `SHOWCASE.md` (approved shots). A course picks its look in its manifest, `"look": "<id>"`; absent means the `look` in `profile.json` (default `quill`; `plain` also exists), see `packs/look/README.md`. Engine side (built): `registry/looks.json` lists the looks, `site.json` sets the site default, the course manifest overrides it. Stage 3 bundles carry this file and the look card named by `profile.json` (default Quill).

## Rules

1. Text is 14 px or larger, in both themes.
2. Labels and readings have enough contrast in dark AND light. Check every beat in both themes; light hides contrast bugs.
3. Reduced motion shows every end state: no burst, no pop, nothing the learner must wait for.
4. Drawing is deterministic: the same beat and state give the same picture (seeded randomness only).
5. One idea per screen. Several panels at once: tabs or steps (SimFlowDom) in DOM, beats in canvas.
6. The picture shows what the beat says: the thing the paragraph names is visible, highlighted and labelled.
7. Every motion and count is physically possible (one lamp gives one flame).
8. The result reads at a glance: after a run, a big reading, a tick or a verdict chip. Verdict colour never alone.
9. Predict before reveal: the scene holds the answer back until the learner commits.
10. The learner acts on the hero itself where possible (drag the tile, tilt the flask), not on a remote slider.
11. DOM/SVG scenes keep their controls inside the scene; canvas/WebGL keep them outside.

=== FILE: packs/look/quill/CARD.md ===
# Quill look: the card

Briefs quote this card. Holds on top of `docs/look-base.md`. Reference: `SPEC.md`; anchors: `SHOWCASE.md`.

1. A small lit world, not a diagram on paper: setting, floor, one hero. A microscopic or abstract subject may float on a quiet depth field instead of a floor.
2. The hero is the subject, drawn well: at least 1/3 of the width, near the centre. Detail goes to the hero; the setting stays quiet.
3. Shapes are chunky and rounded: flat fill, one cushion shade, one highlight, one darker rim. No hairlines, no gradients on controls.
4. One key light, top-left. Glow only on what emits light or what the beat is about.
5. Dark theme is night, light theme is day: the same world under two lights. If the scene has its own time of day, that wins in both themes.
6. Fredoka for readings and titles, Nunito for the rest. Readings are big.
7. Panels have a rim. Chips and buttons are flat with a solid lip.
8. Character where it belongs: a person with hands on the work, or an animal, when the subject has them. Never force one into a microscopic or abstract scene, and never a face on the evidence.
9. Things arrive with a spring and then rest.
10. Celebrate the find only. A scene never fires confetti. When the learner finds the idea, the scene calls its kit `celebrate()`: the kit shows a small ring and twinkles on the found thing and announces the find; Quill reacts from outside the scene (nod, clap, point, twirl). Once per find. Run and misses never celebrate.

Maths is the exception: flat, graph paper, no texture, no glow.

=== FILE: briefs/stage3-verify.md ===
# Stage 3, pass 3 - Verify: probes, full check, look, log

You are the last pass on this scene. Earlier passes wrote the design note and the code (pass 1) and made the quick check pass (pass 2, only when needed). You prove the scene does what the stub's `Must get right` says, run the full check, look (unless told not to), and close.

Target: one scene (the invocation names it). `Look: later` in the invocation: no `shoot` of any kind (peeks included), never a look in this session: skip step 5, write `build/scratch/<Bundle>/<Scene>-look-steps.json` (step 6), close with `Status: look-pending`; a separate 3-look run does the viewing. Write-scope: `<Scene>.js`, `<Scene>.design.md`, the helper only if the note says `Writes helper:` and the invocation says so, the repo-root `build/` (scratch in `build/scratch/`, never under `courses/`). Never block/lesson/question JSON or prose, the stub, another scene, GENERATION-LOG.md (use the close command).

**Targets.** The invocation may name several scenes (`Targets:` and `Batch:`). Run this whole brief for ONE scene at a time, in the order given, and close it (its own close call with its own `--target`) before opening the next. Do not read a sibling's code or note, and do not carry findings from one scene to the next. A scene that fails or hits a cap is logged as that and the run continues with the next. Report one block per scene.

## Read, in this order (nothing else unless a step sends you)

A. `<Scene>.design.md` in full (`## Tests to run` is your to-do list; the tests file implements it; `## Decisions` are not yours to change, except a line that contradicts a stub `Must get right` line: that is a defect, fix the scene and record it under `## Deviations`), then the stub top block: `sed -n '1,/^## Verbatim/p' <stub>` (`Must get right:` is a field there, with `## Per beat`; the slide prose is not needed), then `<Scene>.js`.
Read each of these once: they stay in context, so do not re-Read the scene, note or stub after an Edit (Edit errors if it failed), and do not re-run a gate (check-scene, ident-lint) that printed PASS unless code changed since. View a contact sheet or shot only for a beat the report flagged.
B. The ONE guide for the stub's `Base class:` / `Component:` (named by `briefs/stage3/INDEX.md`): read its "Commands for this kind of scene" and its rules, skip the rest.
C. `briefs/reference/probe-cookbook.md` (good and bad probes).
D. `briefs/reference/scene-rules.md` in full (for fixes). Unless `Look: later`: `briefs/reference/look-rubric.md`. If probes pass on run 1 and the full check passes, skip `scene-rules.md` and re-reading the `.js` body.

## Tools

| Tool | What it answers |
|---|---|
| `node tools/sim-test/drive-dom.mjs <L0N/Scene> --bundle <b> --inputs` then `--steps=@file.json` | DOM/SVG scene: operate it in a real browser (usage: the cookbook) |
| `node tools/sim-test/run.mjs exec tools/sim-test/drive.mjs <L0N/Scene> --bundle <b> --steps=@file.json` | canvas scene, headless |
| `node tools/sim-test/check-scene.mjs <L0N/Scene> --bundle <b>` | every scene gate (1-3 min; `--no-browser --no-probes` for a quick pass) |
| `node tools/sim-test/shoot.mjs <L0N/Scene> --bundle <b>` | screenshots, contact sheet, real-font text report (steps `beat`, `ctrl`, `tap`, `drag`, `click`/`set`) |
| `node tools/sim-test/sim-layout.mjs <scene.js>` | a DOM/SVG scene's sizes (the HEIGHT to set) |
| `node tools/staged-generation/scene-pass.mjs --bundle <b> --target L0N/<Scene> start verify` / `look "<text>"` | opens your pass in the note / appends a Look log line |
| `node tools/staged-generation/log-stage3.mjs --bundle <b> --target L0N/<Scene> --model .. --what ..` | the close: log bullet + Status |

Never run `shoot --help` or `drive-dom --help` (usage is in the cookbook). Do not hunt for kit source: the paths are in `scene-rules.md` (Files). Think at most ~10 lines per fix; for geometry, event order or layout arithmetic write a 10-line `node -e` probe instead of reasoning (never hand-compute).

## Procedure

1. `scene-pass.mjs ... start verify` (it prints `tests file: ... (exists, N steps | absent)`). Never run any `git` command. It refuses a note whose Status is `done`: that is a different or closed scene, so check the target name in the invocation (a name with a suffix such as `-return` is its own scene), never `--force` it.
2. **Probes.** If `build/scratch/<Bundle>/<Scene>-tests.json` exists (written by build, never run), RUN it: that is the probe run (at most 3 runs in all). It was written without the scene running, so a FAIL may be a wrong probe (selector, expect form) or a wrong design note row: edit only a probe that is wrong (a false FAIL); fix the scene when the scene is wrong. If it does not exist (scene built before this rule, or a resumed bundle), write a minimal one per the cookbook's "Minimal probe template" (at most 5 steps per `## Tests to run` row, each row opens with its own `{"beat":N}`; no layout probes; never store a counter on `sc`). Test behaviour, not labels: change the figure and expect the reading to change; defaults, each dial's extremes and the slide's case, no sweeps. Each mismatch prints `FAIL`, `visible now:` and `closest:` (both drivers). A scene with a `BEAT_STEP_MAP` gets a stage-per-beat check FIRST: all idx equal across beats is the bug (check-scene WARNs it). A row naming a field the scene lacks is wrong: read `sc._s.<field>` only for what the screen cannot show, and prove "still drawn" with `d.count(...)`, not a model field.
3. **Fix** the file or the scene for ALL mismatches in one turn (independent edits side by side), re-run once; at most 3 runs in all. A test the scene cannot pass because the note's expectation is wrong: fix the test and add a line to `## Deviations`. A `Must get right` item that is truly violated: fix the scene. Add each item you cannot test in text to the note as `open: ...`. A stub object the contact sheet or text does not show (an invisible chair, five cards that read as one blob) goes in `open:` AND under `## Requests`; never accept it silently.
4. **Full check:** `check-scene` once when probes pass, and again only after a change to logic or layout. A WARN about what a learner sees or what breaks (overlap, contrast, empty centre, freeze, resume leak, clipped box, `motion:` dead beat, pop, mid-motion text) is fixed or explained in one line under `## Checks explained`; `note:` lines need nothing. Layout of a DOM/SVG scene: `sim-layout` names the HEIGHT. `HANG: ... Stuck in: <function>`: fix that function.
5. **Look** (only if you can view images; skip it when `Look: later`, or when `## Look log` already has 2 rounds):
   `node tools/sim-test/shoot.mjs L0N/<Scene> --bundle <Bundle>` shoots every beat in both themes with a text report and a contact sheet. Follow `look-rubric.md`: report first, the sheet second, single shots only where needed; view them in ONE turn of parallel reads (the sheet, at most 3 flagged shots). Add `--steps` for the run, mid-run, each dial position and the celebration (`--steps` REPLACE the default beats, so include `{"beat":N}` steps you still want; shoot rejects `until`, use `wait`). Fix everything you found in one batch, re-shoot once. Never re-read an image already viewed. **At most 2 shot-taking rounds** (shoot refuses a third; never use `--force` or `--peek` to get a third): round 2 only if round 1 still shows a rubric defect you could not fix or your fixes changed a layout. A clean round 1 ends the look and the scene closes `done` (never `look-pending` for a clean look: a clean scene gets no 3-look pass). A defect left after round 2: `Status: look-pending`, with `open:` and `## Requests`; never start a round 3 or build your own shooter. Log each round with `scene-pass.mjs ... look "round N (<images viewed>): seen - ...; changed - ...; left - ..."` (a verified append under `## Look log`; no Edit anchor needed).
6. **Close.** Re-run `check-scene` if you changed code after step 4. Then ONE Bash call (the `scene-pass.mjs ... look` line, if you logged a round, and this command joined with `&&`):
   `node tools/staged-generation/log-stage3.mjs --bundle <Bundle> --target L0N/<Scene> --model "<name>" --what "<one line>" [--controls ..] [--numbers ..] [--flags ..] [--status look-pending] [--no-log]`. `--controls`: only controls the stub did not name; omit it if none. `Look: later`: first write `build/scratch/<Bundle>/<Scene>-look-steps.json`: shoot steps (`beat`, `ctrl`, `tap`, `drag`, `wait`; DOM `set`, `click`) taken from your probes that reach the run, mid-run, each dial extreme and the celebration, a `name` on each state to shoot.
   Status becomes `done` when `## Look log` has a line, else `look-pending`; add `--status look-pending` for `Look: later`, and when a `left -` or `open:` item needs eyes (`done` means nothing unseen is left). `--what` is what the scene shows only. Limits: `--what` <=150, `--controls` <=50, `--numbers` <=110, `--flags` <=130 chars (the tool refuses longer). Always pass `--no-log` in a parallel run (the invocation says not to edit the log): it prints the exact section to put in your report. Never hand-edit Status or GENERATION-LOG.md.
7. **Report** (the invocation may narrow its shape): the check-scene PASS line; `LOG TEXT:` followed by the exact section when you used `--no-log`; `open:` items; flags for a human. Status `look-pending`: end with `NEXT: 3-look pass in a fresh session` (never look in this one).

## Harness facts

- `shoot`: a beat/ctrl/tap step with no `wait` waits until the canvas stops changing (max `--settle`, default 4000 ms) and prints `settled after Xms`, `ambient motion only` (fine) or `still moving ... busy() is true` (add a `wait`). Each run deletes this scene's old shots first. `ignored?` means a ctrl hit a hidden, disabled or unknown control. Confetti lasts about 1 s: `"wait": 300` catches it.
- check-scene runs the real-browser text report with real fonts; `--no-browser` is for quick loops only.
- A box (tofu) or blank where a special glyph should be in a shot (the rupee sign, a tick, an arrow, a superscript, any non-Latin letter or symbol) is the screenshot browser's missing font, not a scene bug: never swap the glyph for words or CSS drawings, never add a replacement chip, and do not hunt fonts or kit source. If the character comes from `fmtINR`/`fmtNum` or another kit formatter, the source holds a backslash-u escape and there is nothing to check; otherwise, only when a box is visible, check the source holds the real character (a plain `grep` of the file). Log it once under `open:` (never `left -`) as `glyph box: <char>, harness font`.
- A deliberate resume difference: `Resume-ignore: <regex>` on the note, the regex ALONE on its line (a reason after it makes the whole line the regex, which matches nothing); the reason goes under `## Checks explained`.
- Probes: a DOM or SVG scene is driven with `drive-dom.mjs` only (`drive.mjs` reaches no panel and counts against the same budget). A CONTROLS dial on any scene is `{"ctrl":["<id>","v"]}` (`drive-dom.mjs ... --inputs` prints each id). Never delete a `*-runs` or `.rounds` file. A probe still failing at the cap: put the first failing step in `--flags` and `open: probe FAIL <step>`; the look must shoot that state.
- A layout FAIL: read the sim-layout numbers, change one value, re-run. No CSS proofs in your thinking.

## Done means

- [ ] Every row of `## Tests to run` ran (or is an `open:` line); the tests file (build's, edited only where a probe was wrong) is in `build/scratch/`.
- [ ] Full check-scene PASSES; each real WARN fixed or explained in one line.
- [ ] Looked (at most 2 rounds), or honestly `look-pending`; `## Look log` written (empty for `Look: later`).
- [ ] Closed with `log-stage3.mjs`. Nothing outside the write-scope changed.

=== FILE: briefs/reference/probe-cookbook.md ===
# Probe cookbook - tests for `Must get right`, good and bad

Used by the build pass (writes the file, never runs it) and the verify pass (runs it). One steps file holds ALL the rows of the note's `## Tests to run`; run it once; fix every mismatch it prints in one turn; run it again once. Drivers: `drive-dom.mjs` (DOM and SVG scenes, real browser, text) and `run.mjs exec drive.mjs` (canvas scenes, headless). The examples below are the usage (do not run `--help`). Both drivers check `expect` the same way: a failing one prints `FAIL`, `visible now:` and `closest:` (canvas: the text drawn now) and the run exits 1 - fix the file or the scene from that, do not read tool source. Probes may read private counters (`sc._s.spread`); `d.count("line")` (DOM: visible elements by selector; canvas: draw calls of that kind) and `d.texts()` prove a thing is STILL drawn. Never test a drawn thing through a model field.

## Good: a steps file (DOM/SVG scene), one run, every row of the table

```
[{"beat":0},
 {"set":["#len","27"]}, {"set":["#grav","1500"]}, {"click":"button:has-text(\"Run\")"}, {"until":"idle"},
 {"expect":["#row-climb","/[1-9]/"]}, {"expect":["#row-gravel","/[1-9]/"]},
 {"set":["#len","10"]}, {"click":"button:has-text(\"Run\")"}, {"until":"idle"}, {"expect":"still moving"},
 {"set":["#len","45"]}, {"click":"button:has-text(\"Run\")"}, {"until":"idle"}, {"expect":"stopped short"},
 {"expect":"27 m","not":true}]
```
Row by row: both bills non-zero (item 1), too short stays moving (2), too long stops short (3), the answer is never printed (5). Selectors come from `--inputs`, never from memory.

## Bad -> good

| Bad | Why it fails | Good |
|---|---|---|
| `{"click":"text=Run"}` | matches every element containing Run (drive-dom WARNs, uses the first) | `button:has-text(\"Run\")` or an id |
| `{"expect":"Run"}` | tests a label that is always there; passes when the scene is broken | change the figure, expect the READING to change: set A, read; set B, read; the two differ |
| "all three lines are drawn" as `expect "line"` | checks a word, not a drawing | a probe over every line in every case the stub lists: `{"probe":"[...root.querySelectorAll('line')].every(l=>l.getTotalLength()>0)","expect":true}` |
| expect straight after Run | text at opacity 0 or display:none is not readable yet | `{"until":"idle"}` first, then expect the end state |
| one steps file per check, five files, each debugged alone | 16 turns of syntax fixing | ONE file for all rows; fix all mismatches from one run |
| `{"expect":"#f","pattern":"85.7"}` | wrong shape | `{"expect":["#f","/85\\.7 N/"]}` (regex in slashes, double backslash in JSON) |
| a sweep over a 10 x 10 grid of dial values | slow, proves nothing more | the defaults, each dial's extremes, and the one case the slide names |
| `set` on a selector copied from the stub | a missing control is skipped and reported, the test then proves nothing | `--inputs` first; read the `skipped:` lines of the run |
| reading a private field such as `sc._a1` to prove something is drawn | breaks on a rename, says nothing about what a learner sees | read the text the learner reads; `d.count(...)` for "still drawn"; a private counter only for what the screen cannot show |
| an expected number worked out by hand (sign of y, stroke or arc counts) | the commonest false FAIL: screen y runs DOWN, a path draws more strokes than you think | take the expected value from one run of the scene (`d.snap()`, `d.count(...)`), judge that it is right, then write it into the row; do not derive it |
| no row for the stage of each beat (a `BEAT_STEP_MAP` scene) | a map with every idx 0 passes every other row | one `stage per beat` row first: `{"probe":"sc.stage","expect":N}` (a `DomSimulation` has no `sc.stage`: use `sc.stepIndex`) after each `{"beat":N}`; all equal is the bug |

## Canvas scenes (drive.mjs)

Steps: `{"beat":N}`, `{"ctrl":["id","v"]}` (a slider value is a string, a button `true`), `{"tap":[x,y]}`, `{"drag":[[x0,y0],[x1,y1]]}` (pairs, never a flat list), `{"wait":ms}`, `{"until":"idle"}`, `{"expect":"text"}`, `{"probe":"<ONE expression>","expect":<json>}`. `name` is ignored (one file serves shoot too). x, y are design px; y grows DOWN.
- A probe is JS with `d` and `sc` in scope: an expression such as `(s => s.a + s.b)(d.snap())`, or statements ending in the value (`const s = d.snap(); s.a + s.b`). A probe reads; never store a counter on `sc` (`sc._n = ...`): compare with a literal.
- A control keeps its value into the next row: set it again at the start of a row that depends on it.
- `d.state()` = the scene's `testState()` (a plain object of key values: stage, picked, locked...); probe it first. `d.snap()` rounded model state, `d.texts()` text drawn now, `d.count("arc"|"text"|"rect"|"stroke")` draw calls in one fresh frame, `d.disabled(id)`, `d.hidden(id)`, `d.value(id)`, `d.busy()`.
- A whole-canvas `d.count` proves "still drawn" only inside one beat with nothing transient (confetti, a fading chip); else probe `d.snap()`.
- Output: `FIRST FAIL (step N)` on top, `FAIL: step N: ...`; cut at ~2000 chars, full text in `build/scratch/<Bundle>/<Scene>-drive.log`. 3 checking runs per scene (the 4th STOPs).

```
[{"beat":0},{"probe":"(s => s._y)(d.snap())","expect":3},
 {"ctrl":["height","10"]},{"ctrl":["drop",true]},{"until":"idle"},
 {"expect":"0.0 m"},{"probe":"d.count(\"arc\") > 0","expect":true}]
```

## Minimal probe template (build writes it, verify runs it)

`build/scratch/<Bundle>/<Scene>-tests.json`: the rows of `## Tests to run` as ONE flat JSON array (not nested arrays, not `{"rows":...}`): a row starts at each `{"beat":N}` step, at most 5 steps per row. A canvas (`SimScene`) scene ignores `{"beat":N}` for the beat it is already on, so a second row on the same beat re-sends nothing: change beat, or `set`/`click` to reset. A `DomSimulation` re-runs `onStep` on every `{"beat":N}`. Object-valued probes: `{"probe":"sc.checkObjective().ok","expect":true}`. `until` works in `drive`, not in `shoot --steps`. No probe over 120 chars. No layout/width/overlap probe (sim-layout and check-scene do those). Scene fields: only `sc.stage` / `sc.checkObjective`. Sup text reads as `x2` in textContent. Click an SVG hit region by its `[data-region]` element, a button by `button:has-text("Run")`. Selectors come from `--inputs`, so build guesses only ids it wrote itself.

```
[{"beat":0},{"probe":"sc.stage","expect":0},
 {"beat":2},{"set":["#len",1.2]},{"click":"button:has-text(\"Run\")"},{"until":"idle"},
 {"expect":["#f","/85\\.7 N/"]},
 {"beat":3},{"click":"[data-region=\"gate\"]"},{"expect":"x2"}]
```

| Check | Form |
|---|---|
| text anywhere in the scene | `{"expect":"Force on the block"}` |
| text inside one element, regex | `{"expect":["#f","/85\\.7 N/"]}` (regex only here and in a bare `"/re/"`) |
| value compare (`==`) | `{"probe":"sc.stage","expect":2}` |
| empty string | `{"probe":"...","expect":""}` |
| must not be readable | add `"not":true` |

## Items that need eyes

If a `Must get right` item cannot be tested in text (a face legible, a hill with depth), do not invent a probe: write it under `open:` in the note for the look step.

=== SECTION: briefs/stage3/canvas.md :: "Rules" "Commands for this kind" ===
## Rules
- Extend `SimScene`: fill `enter/update/draw/busy`, `pointerDown/Move/Up(p)` (design-space `p`), `noteRows` with `static NOTE_STAGE = 0` (the note becomes one muted line along the bottom on every beat; never the modal card, which dims the scene: `NOTE_STYLE = 'card'` only for a stage the learner does not touch).
- Skeleton facts: 680x520, `CONTINUOUS = false`, dt clamped, stage fade, `celebrate()`, `after()`.
- `onBeatChange` is owned by SimScene: do not define it. One stage per beat in `BEAT_STEP_MAP`, read in `enter(stage)`.
- Colours from `c.<key>` (`loadColors`) and `mix/alpha/lighten/darken` of them; never a hex, never a new `--sim-*` token.
- Labels only; chips via `chipRow`, beside the evidence, never on it.
- A DOM overlay is not needed: text goes through `wrapText/fitText/captionBar`, labels through `placeLabels`.

## Commands for this kind of scene
- Operate headless: `node tools/sim-test/run.mjs exec tools/sim-test/drive.mjs L0N/<Scene> --bundle <Bundle> --recipe smoke` (or `--steps`). It sets dials the way the host does.
- Check: `check-scene` runs the freeze and resume probes for a canvas scene.
- Look: `shoot` takes canvas coordinates for `tap` and `drag`.

=== BUNDLE INFO ===
bundle stage3-verify-canvas, sha256 8273a64fa992db82. GENERATED by tools/staged-generation/build-bundles.mjs from:
- START-HERE.md (11478 chars)
- briefs/reference/scene-rules.md (11569 chars)
- docs/look-base.md (1699 chars)
- packs/look/quill/CARD.md (1556 chars)
- briefs/stage3-verify.md (11786 chars)
- briefs/reference/probe-cookbook.md (7162 chars)
- briefs/stage3/canvas.md :: "Rules" "Commands for this kind" (1198 chars)
Do not edit: change the sources and rebuild. Everything above is the full text of those sources; do not open them again.
