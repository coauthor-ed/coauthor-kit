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

=== FILE: briefs/reference/gotchas.md ===
# Gotchas (curated from earlier runs; Stage 3 reads this file)

Each line cost a real run turns. `node tools/staged-generation/gotchas.mjs --scan-root <repos>` lists recurring lines from design notes for a human to add here.

- `withChallenge` has no rounds: the scene owns the deal and the advance; `checkObjective()` returns null until the last round, then `{ ok }` or `{ value, target }`. `solved` latches on the first success (docs/mini-games.md "Rounds").
- A helper subclass never re-assigns `this._s` or fields the helper sets: `Object.assign(this._s, {...})`. Beat-to-state on a subclass goes through the helper's stage hook.
- All `BEAT_STEP_MAP` idx equal with a stage hook present = the hook never fires (check-scene WARNs). Fix the map; it is half of any `onBeatChange` repair.
- Never node-import kit modules (bare specifiers fail): `node tools/sim-test/kit-api.mjs --sig <name>` prints a signature, its return keys and the import line.
- Loops: never `for(;;)` or `while(true)` without a counted bound. A silent hang is the most expensive failure: check tools now print `HANG: ... Stuck in: <function>` after 20 s; fix that function, do not read harness source.
- The check harness fakes `setTimeout`/`setInterval` (a fake clock). A scene's own timeout guard never fires there; drive time with `drive.mjs` (`d.step(sec)`), which also calls `scene.start()`.
- Do not write your own drive harness. A canvas scene: `drive.mjs <scene> --recipe smoke` or `--steps`. A DOM or SVG scene: `drive-dom.mjs --inputs`, then `--steps=@file.json`.
- `shoot` "empty centre" is advisory (it measures a fixed 198-482 px column; a full-width hero trips it). Never add decoration to silence it.
- A DOM scene reports freeze/resume probes as SKIPPED (no frame loop): expected; `drive-dom` is its harness.
- The design note size `note:` is advisory: leave it, never spend a turn trimming it.
- A box (tofu) or blank where a special glyph should be in a shot (the rupee sign, a tick, an arrow, a superscript, any non-Latin letter or symbol) is the screenshot browser's missing font, not a scene bug: never swap the glyph for words or CSS drawings, never add a replacement chip, and do not hunt fonts or kit source. If the character comes from `fmtINR`/`fmtNum` or another kit formatter, the source holds a backslash-u escape and there is nothing to check; otherwise, only when a box is visible, check the source holds the real character (a plain `grep` of the file). Log it once under `open:` (never `left -`) as `glyph box: <char>, harness font`.
- `Kit use:` in the note: one reason per part, no `;` inside a reason.
- Missing `glossary.json` or a slide that needs a wording change is not yours: put it under `## Requests`.
- `setup()` paints once before it returns: initialise every field `paint()`/`render()` reads BEFORE `await super.setup()` and in `enter()`.

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

=== FILE: briefs/stage3-simulation.md ===
# Stage 3 - One scene: design note, code, checks, look

Target: one stub, `simulations/L0N/<Scene>.stub.md`. The invocation may add `Helper: <File>.js (not written yet: you write it ...)` - then you write that helper too, for this and later scenes - or `(exists: import it, do not edit it)`. It may add `Look: later` (no `shoot` at all, `--peek` included: skip step 5 and the peeks in step 3; close with `Status: look-pending`; a separate 3-look run does all the viewing).

`Review: manual` in the invocation: step 4 writes the tests file `build/scratch/<Bundle>/<Scene>-tests.json` (the cookbook's shape) and never runs it; no step 5, no peeks; ident-lint and check-scene still run and pass; close with `log-stage3.mjs ... --status review-pending` (the operator runs the tests in the preview).

`Resume:` in the invocation: your note or scene exist from a run that died (START-HERE rule 8). `Skip: brief item E`: leave out step E. This one-run brief is used for `--one-pass` runs and arcade stubs; otherwise Stage 3 runs as the 3 passes of `stage3-build.md`, `stage3-sanity.md`, `stage3-verify.md`.

Several targets: the invocation may give `Targets:` (a comma-separated list of stubs of one lesson, owner scenes first) instead of `Target:`. Read the docs and the kit guide ONCE, then run the Procedure for each scene in the order given, one scene finished (design note `done` or `look-pending`, its own check-scene PASS) before the next starts. One design note per scene, written before that scene's code; a decision that holds for the lesson (palette, chip style, a shared function) goes in the first note and later notes cite it ("as <Scene>"). A scene that imports an earlier scene of the list reads that scene's file through `kit-api.mjs --bundle`, not its design note. Close each scene with its own `log-stage3.mjs` call. The 40-minute limit in step 0 and the 2 look rounds are per scene. Report: one PASS line per scene, then each scene's LOG TEXT. If a scene is stuck, set it `look-pending` with the reason under `## Requests`, say so, and carry on with the next.

Output: `simulations/L0N/<Scene>.design.md` (written BEFORE any code), `simulations/L0N/<Scene>.js`, the helper if you are its writer; the log bullet is written by `log-stage3.mjs` at the close (step 6), never by hand.

## Read, in this order (nothing else unless a step sends you)

A. The stub, then `node tools/sim-test/scene-info.mjs L0N/<Scene> --bundle <Bundle>`: the attaching slides, their REAL beat counts and every beat's first words. The slide prose is in the stub's `## Verbatim slide markdown`: do not open the slide files. A stub with `Beat maps:` means one `static BEAT_MAPS` entry per count, built from that slide's own `### <block id>` beat list (check-scene fails a missing count); `Same beats on all slides: yes` means one map serves every slide.
B. `briefs/reference/scene-rules.md` in full (rules learned from real incidents, with bad -> good code), then `briefs/reference/gotchas.md`.
C. `briefs/stage3/INDEX.md`, then the ONE guide it names for your stub's `Base class:` / `Component:` (plus an add-on only if the scene draws people or apparatus). The guide holds the docs to read, the kit API, the example to copy, and the right drive and check commands for that kind of scene. An arcade stub is a different, much smaller job: `briefs/stage3/arcade.md`, then skip the rest of this brief. A stub `Recipes:` line names the motion recipe for a beat: build that beat with it (your guide's `Motion recipes` table has the call and the example) and name it in `Kit use:`.
D. `briefs/reference/kit-parts.md` (one table: what you are about to draw -> the kit part that already does it; check-scene notes a hand-written copy). The helpers this bundle already has: `node tools/sim-test/kit-api.mjs --bundle <Bundle>` (reuse before drawing anything new). Open a helper's source only for the one function you will call.
E. Look at three images before you design: `examples/media/quill-look/GOOD-Kudavolai-dark-b0.png`, `examples/media/quill-look/GOOD-BellJar-dark-b1.png`, `briefs/showcase/ANTI-programmer-art-vs-good.png`. Plain look (your look card or the prompt says so): two plain images from `packs/look/plain/SHOWCASE.md` (`examples/media/plain-look/`, the anchor nearest your shape) replace the two Quill images. (Skip them if you cannot view images; this is not the Look step: `Look: later` does not skip them; it skips every `shoot` run: step 5 and the step 3 peeks.)

## Write-scope

`<Scene>.design.md`, `<Scene>.js`, the helper named in the invocation only when you are its writer, `build/`; GENERATION-LOG.md only through `log-stage3.mjs`, and never read it. Never: block/lesson/question JSON or prose, the stub, another scene, a helper marked "exists". Something there looks wrong? Put it in the design note under `## Requests` and in the report. Scratch files go in `build/scratch/`.

## Tools for this stage (run from the repo root; each prints its usage with no arguments)

| Tool | What it answers |
|---|---|
| `node tools/sim-test/scene-info.mjs <L0N/Scene> --bundle <b>` | what to build: attaching slides, REAL beat counts, beat texts |
| `node tools/sim-test/kit-api.mjs <simulations/base/kit/Module.js> \| --bundle <b>` | one line per export of one module (the guide already lists its modules), or this bundle's helpers |
| `node tools/sim-test/ident-lint.mjs <file>` | undefined names, bad imports, clashing members (seconds) |
| `node tools/sim-test/check-scene.mjs <L0N/Scene> --bundle <b>` | every scene gate in one run (1-3 min; `--no-browser --no-probes` for a quick pass) |
| `node tools/sim-test/shoot.mjs <L0N/Scene> --bundle <b>` | screenshots, contact sheet, real-font text report; `--peek` = dark draft; `--steps` (`shoot --help` lists them): `beat`, `ctrl`, `tap`, `drag`, and for a DOM scene `click`/`set` with a selector |
| `node tools/sim-test/run.mjs exec tools/sim-test/drive.mjs <L0N/Scene> --bundle <b> --recipe smoke` | operate a CANVAS scene headless (dials, taps, clock, state); your own steps are `--steps=@file`, never given together with `--recipe` |
| `node tools/sim-test/drive-dom.mjs <L0N/Scene> --bundle <b> --inputs` then `--steps=@file.json` | the same for a DOM or SVG scene, in a real browser, text only; steps in a JSON file, see the guide |
| `node tools/sim-test/sim-layout.mjs <scene.js>` | a DOM or SVG scene's sizes: the HEIGHT to set, the tallest state |
| `node tools/staged-generation/log-stage3.mjs --bundle <b> --target L0N/<Scene> --model .. --what ..` | the close: log bullet + design-note Status in one command |

## Procedure

0. **Two limits.** (a) The stub or the slides contradict each other ("not taught: arms" yet "arm values on the bar"; two mounts with different beat counts): take the reading closest to the slide's point, give it one line under `## Requests`, and move on: a paragraph of thought, not an hour. (b) Put `Started: <output of date -u +%FT%TZ>` in the note's header, after `Status:` and `Model:`: check-scene and shoot print the minutes since. At 40 without a passing full check, stop refining: build the simplest reading, set `Status: look-pending`, report.
0a. **Hygiene.** Batch independent tool calls in one turn (reads, greps, checks). There is no `execute` tool: use the shell tool. Do not write your own drive harness: the guide names the driver for your scene. A check that prints `HANG: ... Stuck in: <function>` names the loop: fix that function, do not read harness source. Read at most 2 other scenes. Never read a tool's source to learn how it behaves; `<tool> --help` prints its usage.
0b. **Think on paper, not in your head.** Do not count on your earlier reasoning being there at the next step; the note is your memory. (a) Write the note's first lines (Status, Base class, the readings you chose) within your first 10 minutes, then each design decision the moment you make it (`## Decisions`, one line each); never reopen one: read the note instead of re-deriving it (real runs re-worked the same design in 9 to 12 of their first 40 steps, one asking the same button-or-panel question nine times). (b) Any table of numbers (dial stops, balance points, counts, a triangle's angles): a 5-line `node -e`, never by hand. (c) Coordinates: a few anchors (ZONES, `heroBox`) and offsets in code; you settle geometry by LOOKING (`shoot --peek`, below), not by arithmetic in prose. A hedge ("Hmm", "Wait", "Actually") three times on one question means: take the simpler option, note it, move on.
1. **Design note first.** Write `<Scene>.design.md` before any code, from this template (terse; tables and fragments are fine):
   ```
   # <Scene> - design note
   Status: building
   Model: <the invocation's Model:, else what you are>
   Started: <date -u +%FT%TZ>
   Writes helper: <File>.js            <- only if the invocation says you write it
   Base class: SimScene | DomSimulation | SvgScene | ... (<why, from the content's shape>)
   Kit use: <Part> use|extend|differ - <reason>[; ...]  OR  none fits (looked at: <the guide and kit-parts.md>)   <- the parts your guide lists
   Layout: backdrop <kind>; hero <object> in ZONES.hero (~<w> px wide); left card <...>; right card <...>; chips <where>   (zones and what sits in them: no pixel coordinates, the code has those and they go stale after a look round)
   | beat | stage | shows | learner can | runs / events | enter() resets |
   Model numbers: <the numbers the scene shows, the slide's used exactly; at most ~8 lines, no derivations>
   Celebrate: <the moment the concept is found, not when Run is pressed>
   Comes to rest: busy() is true while <...> | CONTINUOUS = true because <motion that never ends>
   Must-get-right tests: <each `Must get right` item -> the step that fails if it is violated, or `open:` if it needs eyes>
   Plausible: <for each process shown: could the real thing do this? one line each>
   Not shown: <ideas the lesson has not taught yet; slide claims you leave out and why>
   ## Decisions           <- one line each, written when made, never reopened
   ## Look log            <- one line per look round; nothing else (a `Look: later` run leaves it empty)
   ## Checks explained     <- one line per WARN you left and why; empty is normal; never restate a passing check
   ## Requests
   ```
   Aim for about 6 KB: a reviewer reads the note and you re-read it as context, so essays cost both. Decisions and reasons, not a transcript. check-scene prints a `note:` line if it is over 12 KB; that is advisory, so leave it: never spend a turn trimming the note, re-running check-scene to see its size, or explaining it (`wc -c` if you want to know).
   If the scene needs a person: `briefs/stage3/people.md`. Design the object first, then add them.
2. **Skeleton.** Copy the example your guide names under "Start from" (a complete scene: every hook, a dial, a button, a drag, the note, one celebration) instead of reading a base class. Class, statics (`BEAT_STEP_MAP` with one entry per REAL beat, `ARIA_LABEL`, `CONTROLS`), `enter`, and a `draw`/`paint` that paints the backdrop and a stage label. Then `node tools/sim-test/ident-lint.mjs <file>` and `node tools/sim-test/check-scene.mjs L0N/<Scene> --bundle <Bundle> --no-browser --no-probes` until PASS.
3. **Beats one at a time.** Each beat's settled frame (no learner input) must show what that beat's text says; two beats with different texts never settle to the same frame (only if the prose deliberately talks over a still picture, add `Beat hold: b2.0-b2.1` to the design note; the 3-slides gate then passes those beats). Build beat k, run `ident-lint` (seconds) after every edit, and the quick check-scene every couple of beats. With `Look: later`: no `shoot`, not even `--peek`; trust `ident-lint`, check-scene and the step 4 tests. Otherwise, after a beat is drawn, SEE it (if you can view images): `node tools/sim-test/shoot.mjs L0N/<Scene> --bundle <Bundle> --peek` (dark theme, your draft, not a look round, at most 3 per scene; unchanged code reprints the last report; the official 2 rounds are untouched). Peek once the whole scene is drawn, or at a hard beat, not after every edit: make all the edits you know of first. A rough drawing you look at beats a layout you compute. Edit in place; do not rewrite the whole file. The helper (if yours) grows the same way: functions, not a base class.
4. **Tests for `Must get right`.** Before the full check, turn EVERY item under the stub's `Must get right` into one step in ONE `drive-dom` (or `drive.mjs`) step file (good and bad examples: `briefs/reference/probe-cookbook.md`; a failing `expect` prints what is visible, fix every mismatch in one turn): an `expect` or a `probe` that FAILS if the drawing breaks that item. Run it and fix the scene until it passes. Test the behaviour, not a label: a reading that must be measured is tested by changing the figure (drag a point, move a dial) and expecting the reading to change; "all three lines are drawn" is tested by a probe that checks each line has length in every case the stub lists. An item you cannot test without seeing it goes under `open:` for the look run. List each one in the design note's `Must-get-right tests:` line.
   **Full check:** iterate with `--no-browser`; run `node tools/sim-test/check-scene.mjs L0N/<Scene> --bundle <Bundle>` (1-3 min: probes and a real-browser text report) once when the scene is complete, and again only after a change to logic or layout. A WARN about what a learner sees or what breaks (overlap, contrast, empty centre, freeze, resume leak, a clipped box) is fixed, or explained in one line under `## Checks explained`; `note:` lines and style advisories need nothing. Then drive the controls once with the driver your guide names (a tap, a control mid-run, each mode or case the stub lists, and the end state; it sets dials the way the host does: sliders and selects arrive as strings). That finds what static gates cannot (a wrong root, a dropped tap). Test the defaults, the extremes of each dial and the one case the slide names; no sweeps over dial grids. A deliberate resume difference: `Resume-ignore: <regex>` on the design note, with the reason.
5. **Look** (only if you can view images and the invocation does not say `Look: later`; otherwise go to step 6 with `Status: look-pending`, and skip this step entirely: no `shoot` of any kind, nothing in `## Look log`).
   `node tools/sim-test/shoot.mjs L0N/<Scene> --bundle <Bundle>` shoots every beat in both themes and prints a text report and a contact sheet path. Then follow `briefs/reference/look-rubric.md`: report first, sheet second, single shots only where needed. Add `--steps` for the run, mid-run, each dial position and the celebration (a DOM scene has no canvas coordinates: use `{"click": "<selector>", "name": "..."}` / `{"set": [sel, v], ...}`; `drive-dom.mjs --inputs` lists the selectors; shoot says when a step changed nothing). Fix, re-shoot, log each round with `node tools/staged-generation/scene-pass.mjs --bundle <Bundle> --target L0N/<Scene> look "round N (<images viewed>): seen - ...; changed - ...; left - ..."` (appends under `## Look log`; images viewed = images you opened, a contact sheet is one read). `--steps` REPLACE the default beats (add `{"beat":N}` steps for states you still want) and `shoot` rejects `until` (use `wait`). `shoot` counts rounds (a shot-taking run on changed code) and refuses a third. **At most 2 rounds** after step 4 first passes: round 2 only if round 1's sheet or report still shows a defect from the rubric that you could not fix in round 1, or your fixes changed a layout. A clean round-1 sheet ends the look. This cap has no exceptions: a scene that still reads badly after round 2 (a hero that does not read, say) keeps `Status: look-pending`, with what is wrong under `open:` and `## Requests`, and a separate Stage 3-look run (fresh context, cheaper) or a human continues. Never start round 3 yourself. After round 2, change drawing code only for a defect the text report or check-scene states (a number, an overlap); anything you would need to SEE goes under `open:` for the 3-look run: an unseen layout edit is a guess, and do not build your own shooter.
6. **Close.** Re-run check-scene if you changed code after step 4. Then one command does the log bullet and the Status: `node tools/staged-generation/log-stage3.mjs --bundle <Bundle> --target L0N/<Scene> --model "<name>" --what "<one line>" [--controls ..] [--numbers ..] [--flags ..]`. Status becomes `done` when `## Look log` has a line, else `look-pending`. Add `--status look-pending` for `Look: later`, and whenever a `left -` or `open:` item needs eyes (`done` means nothing unseen is left). `--what` is what the scene shows only (no process, no flags). `--look` is for a 3-look pass only. In a parallel run (the invocation says not to edit the log) add `--no-log`: it sets the Status and prints the exact section to give in your report; the log file is not touched. Never hand-edit the Status line or the log. Run it as ONE Bash call joined with `&&` to any other close command, with short fields (`--what` <=150 chars, `--controls` <=50, `--numbers` <=110, `--flags` <=130; a longer one is refused). `Resume-ignore:` in the note: the regex alone on its line, the reason under `## Checks explained`. Put real flags (what you could not verify, a contradiction in the stub) in `--flags`, not only in the report. The bullet format:
   ```
   - <Scene> (<N> beats, <base class>, <date>): <what it shows in one line>. Model: <name>.     (aim under 600 characters; up to 1000 is accepted: the design note has the detail)
     Controls added beyond the stub: <...>. Model numbers: <...>. Flags: <slide/science conflicts, facts to check>.
   ```
7. Report (the invocation may narrow its shape: follow that exactly).

## Rules that matter most (scene-rules.md has the rest; [check] = check-scene enforces it)

- Come to rest: `busy()` true while anything that matters moves; every run ends. [check: freeze probe]
- Runs credit the stage that launched them (a token), delayed work uses `this.after()`. [check: resume probe]
- Labels only; the prose explains. Chips beside the evidence, never on it.
- Colours from tokens (`c.<key>` on canvas, `var(--sim-*)` in SVG/DOM); never a hex, never a new `--sim-*` token. [check: WARN]
- One hero at least a third of the width; no empty middle band. [check: browser "empty centre" is advisory; never fix it by adding decoration]
- Draw what is true; flag what is not; do not fix the slide.
- Scene-type rules (canvas, SVG, DOM, geo) are in your guide.
- Motion checklist (full rules: `docs/simulation-authoring.md` 4.7; use `kit/SimAnim.js` for eases, springs, cues):
  - One focus colour; write the concept -> `--sim-series-N` map in the note before drawing; at most 4 meaning colours, 2 focus points.
  - Act the idea out; earlier beats stay complete, only the current beat moves, subjects settle and stop.
  - Structure, then data, then one annotation per beat; Predict shows a dashed ghost and never the outcome.
  - After a tap: at most ~0.8 s, tap skips to the end; exits ~0.18 s, entries 0.30-0.35 s.
  - Reduced motion shows each beat's end state; no per-frame text to aria; no `Math.random` in `draw`.
  - Banned: all-fade-in, particle bursts, glow on chrome, one camera move every beat, a crude character, texture.

## Harness facts (so you never read tool source)

- The host: `setup()`, then `onBeatChange(i, count)`, then `start()`. SimScene enters stage 0 inside `setup()` and switches to beat i's stage with no time in between. Each beat change or control grants 8 s of animation budget; pointer events are covered by SimScene.
- `shoot`: a beat/ctrl/tap step with no `wait` waits until the canvas stops changing (max `--settle`, default 4000 ms) and prints `settled after Xms`, `ambient motion only` (idle decoration: fine) or `still moving ... busy() is true` (a run longer than the wait: add a `wait`). Each run deletes this scene's old shots first, so a shot you open is always from the last run. `ignored?` means a ctrl hit a hidden, disabled or unknown control; `busy:` means input arrived while `busy()` was true. Confetti lasts about 1 s: use `"wait": 300` to catch it.
- The loop parks 1.5 s after `busy()` goes false, and not before the 8 s budget runs out.
- check-scene runs the real-browser text report with real fonts; the headless draw check's legibility guesses are then dropped. `--no-browser` is for quick loops only.

## Done means

- [ ] Design note written first; `Status: done` or `look-pending`.
- [ ] check-scene PASSES (full, not `--no-browser`); each real WARN fixed or explained in one line.
- [ ] Looked (or honestly `look-pending`), at most 2 rounds, Look log written (empty for `Look: later`).
- [ ] Log bullets appended (or printed with `--no-log`). Nothing outside the write-scope changed.

Report (START-HERE.md section 3) plus: base class and beats, controls added, model numbers, flags, the check-scene PASS line, the contact sheet path, and what the look review left open.

=== FILE: briefs/stage3/arcade.md ===
# Stage 3 guide: arcade stub (Base class Arcade*Scene)

A different, much smaller job: config, not a scene.

## Read
- `docs/arcade-games.md` (the archetype, skin and deck shapes) and the stub's `## Play`.

## Fit test (before the deck)
Arcade text sits on small fixed cards. Check every item against these limits before you write; an item that does not fit means the archetype is wrong for it. Do not cut its meaning to squeeze it in.
- Judge: each statement at most 32 characters, one line, true or false on its own. A 2-line statement fails check-scene's overlap gate today. The evidence goes in `why` (the why card has room).
- Sort / Catch: each item name at most 14 characters (over about 14 it shrinks below 14 px; 16 is the hard limit). The evidence goes in `why`.
- Match, Order, Route: each label must stay readable on its card at the size the example shows; if you are tempted to shorten it until it loses a condition, change the archetype.
- A claim that needs a condition or a number to be true ("beats inflation if the rate is above it") does not fit Judge or Sort. Use `ArcadeMatchScene` (a short topic paired with its rule or condition) if it is recall, or leave the arcade out and use a true/false question that shows the whole claim. Say which in the design note.

## Steps
1. Design note: three lines only: `Status: building`, `Base class: Arcade<Kind>Scene`, archetype + skin + deck + rounds, `Writes helper: <Deck>.js` if you write the deck file.
2. Write or extend the deck file (data only, one file per chapter, shared by its games) and the thin scene: `extends Arcade<Kind>Scene`, `static ARIA_LABEL` naming the topic, `static CONFIG = { ...DECK, title, skin, rounds }`. If the invocation says the deck helper exists, keep it: add your deck as a NEW export (never edit or reorder an existing item or export). Every item gets a `why` that is evidence, not a restated answer; mark common mix-ups `myth: true`; nothing in art or colour may give an answer away; no item the lessons have not taught.
3. `node tools/sim-test/check-scene.mjs L0N/<Scene> --bundle <Bundle>` (a bad deck throws a plain message at setup), then `node tools/sim-test/run.mjs exec tools/sim-test/arcade-bot.mjs <scene.js>` (plays one mistake then right, checks the run ends, the boss round, the mix-up recap; `--passive` for the run-out-of-hearts case).
4. Look: `node tools/sim-test/shoot.mjs L0N/<Scene> --bundle <Bundle> --steps='[{"tap":[150,424],"wait":3500,"name":"play"}]'` (taps PLAY, waits out the countdown; Catch: `[196,336]`); add a wrong tap to see the why card; one round of fixes at most. The why card, boss round and celebration are shared ArcadeScene chrome, the same in every arcade scene: do not chase them or spend a pass on them. Shoot the menu and play, judge text fit and contrast, then close. Set `Status: done` (or `look-pending`), log one bullet, report. Skip the rest of the Stage 3 brief.

## Examples
`examples/simulations/arcade/` : deck `WorkEnergyDeck.js`; Sort `EnergyFormsSortScene.js`, `WorkSignBeltScene.js`; Order `EnergyStackScene.js`, `EnergyTrainScene.js`; Match `FormulaBubblesScene.js`, `FormulaRangeScene.js`; Route `LeverRailScene.js`, `WorkSignRouteScene.js`; Judge `MythCardsScene.js`, `MythDoorsScene.js`; Catch `EnergyFormsCatchScene.js` (ice), `WorkSignCatchScene.js` (orchard), both on the Sort decks.

## API (from kit-api, copied in)
```text
# simulations/base/kit/ArcadeScene.js
  class ArcadeScene extends SimScene
    .static BEAT_STEP_MAP = [[{ idx: 0, dwellMs: null }]]
    .static KIND = 'Arcade'
    .static HOW = ''
    .static DEFAULTS = {}
    .static CONFIG = null
    .setup()
    .checkConfig()
    .beginRun()
    .tickPlay()
    .drawPlay()
    .tapPlay()
    .onHit()
    .afterWhy()
    .releasePlay()
    .movePlay()
    .startRun()
    .endRun()
    .balanced(items, groupOf, n)
    .requeue(item)
    .right(x, y, item)
    .wrongTry(info)
    .slip(info)
    .itemDone()
    .bossItems()
    .isBoss(item)
    .update(d)
    .busy()
    .pointerDown(p)
    .pointerMove(p)
    .pointerUp(p)
    .hit(id, r, data)
    .draw(ctx, c, t)
    .tone(key)
    .fitText(ctx, c, text, maxW, maxSize, minSize, weight = 800, display = false, maxLines = 2)
    .drawToken(ctx, c, item, cx, cy, w, h, o = {})
  itemName(item)
  shuffle(a)
  cardBox(ctx, c, x, y, w, h, rim)  - A raised card with a coloured rim, for the why and end cards.
  crown(ctx, c, x, y, r)
  heart(ctx, x, y, r, col)
  HUD_H

# simulations/base/kit/ArcadeSortScene.js
  class ArcadeSortScene extends ArcadeScene
    .static KIND = 'Catch and sort'
    .static HOW = SKINS.sky.how
    .static ARIA_LABEL
    .static DEFAULTS
    .checkConfig(cfg)
    .get skin()
    .menuSample()
    .menuTint(c)
    .beginRun(run)
    .tickPlay(d, real)
    .afterWhy(w)
    .onHit(id, data)
    .whyHint(ctx, c, w)
    .drawPlay(ctx, c, t)
  SORT_SKINS

# simulations/base/kit/ArcadeOrderScene.js
  class ArcadeOrderScene extends ArcadeScene
    .static KIND = 'In order'
    .static HOW = HOW.stack
    .static ARIA_LABEL
    .static DEFAULTS = { fuse: 5, skin: 'stack' }
    .checkConfig(cfg)
    .menuSample()
    .menuTint(c)
    .bossPool()
    .beginRun(run)
    .tickPlay(d, real)
    .afterWhy(w)
    .onHit(id, pid)
    .drawPlay(ctx, c, t)
  ORDER_SKINS

# simulations/base/kit/ArcadeMatchScene.js
  class ArcadeMatchScene extends ArcadeScene
    .static KIND = 'Match it'
    .static HOW = HOW.bubbles
    .static ARIA_LABEL
    .static DEFAULTS
    .checkConfig(cfg)
    .menuSample()
    .bossPool()
    .beginRun(run)
    .tickPlay(d, real)
    .afterWhy(w)
    .onHit(id, sid)
    .drawPlay(ctx, c, t)
  MATCH_SKINS

# simulations/base/kit/ArcadeRouteScene.js
  class ArcadeRouteScene extends ArcadeScene
    .static KIND = 'Run the key'
    .static HOW = HOW.road
    .static ARIA_LABEL
    .static DEFAULTS
    .checkConfig(cfg)
    .menuSample()
    .menuTint(c)
    .beginRun(run)
    .tapPlay(p)
    .tickPlay(d, real)
    .afterWhy(w)
    .drawPlay(ctx, c, t)
  ROUTE_SKINS

# simulations/base/kit/ArcadeJudgeScene.js
  class ArcadeJudgeScene extends ArcadeScene
    .static KIND = 'True or false'
    .static HOW = HOW.cards
    .static ARIA_LABEL
    .static DEFAULTS
    .static DRAGGABLE = true
    .checkConfig(cfg)
    .menuSample()
    .menuTint(c)
    .bossPool()
    .beginRun(run)
    .tickPlay(d, real)
    .afterWhy(w)
    .onHit(id, data, p)
    .movePlay(p)
    .releasePlay()
    .drawPlay(ctx, c, t)
  JUDGE_SKINS

# simulations/base/kit/ArcadeCatchScene.js
  class ArcadeCatchScene extends ArcadeScene
    .static KIND = 'Spot it'
    .static HOW = SKINS.ice.how
    .static ARIA_LABEL
    .static DEFAULTS
    .static DRAGGABLE = true
    .static ATTRACT_S = 6.4
    .static COLOR_MAP
    .checkConfig(cfg)
    .get skin()
    .get targets()
    .bossPool()
    .beginRun(run)
    .tickPlay(d, real)
    .afterWhy(w)
    .movePlay(p)
    .tapPlay(p)
    .keyPlay(key, down)
    .drawWorld(ctx, c, t)
    .whyHint(ctx, c)
    .drawPlay(ctx, c, t)
    .endDecor(ctx, c, t)
    .drawMenu(ctx, c, t, u)
  CATCH_SKINS
```

=== FILE: docs/arcade-games.md ===
# Arcade games: fast practice of what a lesson taught

An arcade game is an optional slide where the learner drills what was just taught - recalling terms, sorting things into groups, running a key, putting steps in order, busting myths - against a gentle clock. It is a break from reading that builds memory and clears misconceptions. It is not the lesson's `mini-game@1` (docs/mini-games.md): that one embodies the concept (tie level L2, no timers). An arcade game practises; it may use a clock; it is never graded.

You write data, not a game. The engine is shared (`simulations/base/kit/Arcade*.js`, on the look kit): menu, scoring, hearts, pace, why cards, the boss round, the end card, every visual. A course scene is a few lines: pick an archetype, a skin and a deck.

Quill is in every game (under a look with a mascot): on the menu, on the field, beside the why card and on the end card. The games are an arcade cabinet: under the Quill look every game plays in Quill's own polar world (the Catch game's night sky, a dusk in the light theme, with the aurora, a moon, bergs, the sea and an ice shelf the set stands on), whatever the course's setting (lab, graph paper); the chrome follows the landing page (kicker, gradient title, coral PLAY), and in a lesson the block frames the canvas in the landing page's cabinet. A 3-2-1-GO countdown opens a run while Quill walks in; he jumps and spins on every 5th in a row, throws up his wings after a wrong try, is knocked flat on a slip (a heart breaking over him), wears a crown in the boss round and leans into the wind when the pace steps up; signs pop over the field (COMBO, SPEED UP, BONUS, BOSS ROUND), the score rolls up, and the end card gives a verdict with stars and a NEW BEST ribbon. None of it is yours to draw or configure; Quill's Catch keeps its own ice or orchard world. The Route games are seen from behind the runner, down the track to the horizon: a gate appears small and grows as it comes, and the question hangs on a board across the top from the moment it appears. In the polar world the Sort sky bins are igloos with a friend at each door, the Judge doors are igloos too, and the Match range targets are snowmen on ice pedestals; a scene with its own world keeps its old set.

```js
import { ArcadeSortScene } from 'simulations/base/kit/ArcadeSortScene.js';
import { ENERGY_FORMS } from './WorkEnergyDeck.js';

export class EnergyFormsSortScene extends ArcadeSortScene {
  static ARIA_LABEL = 'Energy catcher: situations fall one at a time; tap the form of energy each one mostly has.';
  static CONFIG = { ...ENERGY_FORMS, title: 'Energy catcher', skin: 'sky', rounds: 12 };
}
```

Worked examples on work and energy: `examples/simulations/arcade/` (one scene per archetype and skin, one shared deck file). Screenshots: `examples/media/arcade/GOOD-*.png`.

## Why it works (what the engine does for you)

- The tap IS the learning operation (sort, route, match, order, judge) - nothing to learn outside it.
- One target at a time; the next one waits in the corner.
- A wrong try pauses on a why card - "not X; it is Y, because Z" - and the SAME item stays in play until the learner gets it right. It comes back 3-5 items later (at most twice).
- The clock punishes letting something slip, never a wrong try: a wrong try costs the streak, a slip costs a heart.
- Pace starts slow, rises with a streak, eases after a slip; reduced motion caps it.
- Groups take turns (interleaved), bins swap places, doors swap sides: position is never the cue.
- The boss round (last 4 items, worth double, crowned) is the learner's own mix-ups plus items marked `myth: true`. A streak of 8 starts a short double-score bonus.
- The end card lists the learner's own mix-ups with the right answers.

## Does it fit? Check before you add one

An arcade game drills recall of things already taught. Add one only if ALL hold:

1. **Recall load.** Terms, symbols, groups of real things, sequences or myths that must be memorised. Not a skill being applied for the first time (reading a Venn region, solving a step): use the lesson's mini-game or a practice slide.
2. **Taught earlier.** Everything in the deck is taught at least one slide before, and for a new skill in an earlier lesson or after the mini-game. Never a replay of the slides just above it.
3. **Same picture.** Every word the game shows ("left ring", "region", "gate") is a word and a picture the learner already saw in the lesson. If the game needs a diagram the lesson drew, it must show that diagram; if it cannot, pick another archetype or no game.
4. **Mechanic = idea.** The tap must be the same act the concept asks for.
   - Sort: the groups are things you can put items in (bins, labelled sets).
   - Route: the concept IS a chain of yes/no questions (a key, a flowchart, a decision). Not for placing something in a region of a picture.
   - Match: pairs of recalled facts. Order: a real sequence. Judge: claims to call true or false.
   - Catch: one group held in mind, a stream of items to keep or let pass (examples vs non-examples, equivalent forms).
5. **Items do not state the answer.** A subtitle that lists the item's properties turns the game into reading. Show the item and let the learner decide, or use a bigger deck (20+ items, mixed) so memorising answers is not the game.
6. **Not a quiz.** If the deck is 12 items on one rule, it is memorised in one pass: add a mini-game or leave it out.
7. **Text fits the card.** Judge statements are at most 32 characters on one line; Sort and Catch item names at most 14 (16 is the hard limit); evidence goes in `why`. A claim that needs a condition or a number to be true does not fit Judge or Sort: pair a short topic with its rule in `ArcadeMatchScene` if it is recall, otherwise use a true/false question that shows the whole claim and leave the arcade out.

If any fails, leave the arcade out and say so in the outline. No arcade is better than a mismatched one.

## Pick the archetype by what the learner must do

| The learner must | Archetype | Skins | Deck shape |
|---|---|---|---|
| put each thing in one of 2-6 groups | `ArcadeSortScene` | `sky` (falls into bins), `belt` (conveyor into crates) | `groups`, `items` |
| answer a chain of yes/no questions to reach a group (a key, a flowchart) | `ArcadeRouteScene` | `road` (runner, door gates), `rail` (train, signals) | `groups`, `key`, `items` |
| recall what goes with what (term and meaning, symbol and unit, name and picture) | `ArcadeMatchScene` | `bubbles` (drift past), `range` (targets pop up) | `pairs` |
| put steps, events or sizes in order | `ArcadeOrderScene` | `stack` (a tower), `train` (carriages) | `sequences` |
| call statements true or false (myths) | `ArcadeJudgeScene` | `cards` (swipe), `doors` (open one) | `statements` |
| spot members of one target group as items fall (the target changes) | `ArcadeCatchScene` | `ice` (Quill catches fish), `orchard` (Quill catches mangoes in a basket) | `groups`, `items` (same as Sort), `targets?` |

## Deck shapes

Every item's `why` is the one line the why card shows after a mix-up: evidence, not a restated answer ("it is high up: its position stores energy", not "it is potential energy"). `myth: true` marks what students commonly get wrong.

```js
// Sort
{ groups: [{ id: 'kinetic', label: 'Kinetic', tone: 1, why: 'energy of motion' }],
  items: [{ name: 'A rolling ball', is: 'kinetic', why: 'it is moving', myth?: true, art?: 'media/L02/ball.jpg' }] }
// Route: every group is a leaf of the key; each item's path is found from its group
{ groups: [...], items: [...],
  key: { ask: 'Does the object move?', no: 'zero', yes: { ask: 'Same way as the force?', yes: 'positive', no: 'negative' } } }
// Match: distractors come from other pairs, same `group` first
{ pairs: [{ prompt: 'Power', answer: 'work / time', group: 'formula', why: 'how fast work is done' }] }
// Order: 3-6 pieces (the train fits 5)
{ sequences: [{ title: 'Energy units: smallest to largest', items: ['1 joule', '1 kilojoule', '1 megajoule'], why: '...' }] }
// Catch: the Sort deck as is. Each target needs 3+ members and 3+ non-members; an item in every target is refused.
// An item with is: [] is a trap that looks like a member (0.3 for 1/3).
{ groups: [...], items: [...], targets?: ['half', 'quarter'], perTarget?: 6, share?: 0.5 }
// Judge: keep a quarter to three quarters true, so "always false" never wins
{ statements: [{ text: 'Friction destroys energy.', truth: false, myth: true, why: 'it turns kinetic energy into heat' }] }
```

On a phone (canvas under 2/3 scale) the HUD, menu, why card and end card redraw with text at 13 px on screen, and `ArcadeMatchScene` draws bigger bubbles and targets. Other archetypes keep their in-play sizes; a subclass can read `phoneUi()` and `uiPx(n)`.

Common CONFIG: `title` (required), `skin`, `rounds`, `lives` (3), `relaxed: true` (no hearts), `how` (replace the one-line how-to), `boss: false`, and per archetype the starting speed (`fall`, `gate`, `drift`, `fuse`, `think`, in seconds; Catch: `fall`).

Keyboard (every archetype): Tab focuses the game, Enter or Space starts and replays, Escape pauses. Catch steers with Left/Right or A/D; Judge calls with Right/T and Left/F. `art` on an item: a bundle image path (`media/...`, shown in a circle), a course drawing as `{ svg: '<svg ...>' }` (fitted whole in the circle; `var(--sim-*)` colours follow the theme), a short glyph, `false` (no picture), or nothing (a friendly face). Microbes, plants and other things that must not get a face take `{ svg }` or `false`. Never art or colour that gives the answer away (a "KE" badge on a kinetic item). A bad CONFIG throws a plain message at setup, which `check-scene` shows.

## Placing one in a lesson

- Its own slide: `content-block@1` with one short line of prose (the game explains itself) and the scene below it:
  ```json
  { "id": "blk-l03-a01", "type": "content-block@1", "markdownRef": "blocks/L03/blk-l03-a01.md",
    "simulation": { "src": "simulations/L03/EnergyFormsSortScene.js", "position": "below" },
    "authoring": { "status": "ai-draft" } }
  ```
- Only after everything in its deck has been taught (a deck can grow lesson by lesson: a later game reuses the deck with more items).
- Optional, and as many as the chapter's recall load deserves; spread them out rather than bunching them at the end.
- Variety: rotate archetypes across a chapter, and when one archetype comes back, use its other skin. Never two arcade slides in a row with the same archetype and skin.
- Put decks in one file per chapter (`simulations/<first lesson>/<Chapter>Deck.js`, or `simulations/shared/`) and import it; each game is a thin scene file next to its slide. A later game adds a new export to the deck (never edits an existing item). Staged generation: the deck is the stubs' `Shared helper:`, written by the first arcade scene, and `check-scene` plus `tools/sim-test/arcade-bot.mjs <scene>` verify a game.

## Checks

`node tools/sim-test/check-scene.mjs <scene>` (the deck is validated at setup; lint, sanity, come-to-rest, the real-browser text report). Look at it: `node tools/sim-test/shoot.mjs <scene> --steps='[{"tap":[150,424],"wait":3500,"name":"play"}]'` taps PLAY and shows the game running after the 3-2-1-GO countdown (Catch: PLAY is at `[196,336]`, lower when a long title pushes it down: see the sheet); add taps on bins, doors or targets to see the why card.

=== FILE: briefs/reference/look-rubric.md ===
# Look rubric (Stage 3 look step and Stage 3-look)

The bar: the course's look card (the one in your bundle or named in the prompt; default the Quill look, `packs/look/quill/CARD.md`), on top of `docs/look-base.md`. Passing every check is required and is not enough: bare-but-correct scenes have been rejected twice with every check green. The note's `## Checks explained` is the builder's claim, not a verdict: judge the picture.

## Calibration images (open these before judging your own)

Plain look: skip this table; calibrate on the images `packs/look/plain/SHOWCASE.md` names (`examples/media/plain-look/`) and `briefs/showcase/ANTI-programmer-art-vs-good.png`.

Anchors, not perfect scenes (`packs/look/quill/SHOWCASE.md` says what not to copy). `Q` = `examples/media/quill-look/`.

| Image | Why |
|---|---|
| `Q/GOOD-Kudavolai-dark-b0.png`, `Q/GOOD-Kudavolai-light-b0.png` | closest to the card: one hero, a hand on it, the same world at dusk and in the morning |
| `Q/GOOD-BellJar-dark-b1.png` | a lab run: apparatus, a quiet bench, a person who reacts |
| `Q/GOOD-SaltLattice-dark-b4.png` | a microscopic subject on a depth field, no face on the evidence |
| `Q/GOOD-SlideRule-light-b1.png` | maths: chunky hero, big numbers, lipped chips |
| `examples/media/look-kit/GOOD-Timeline-light-b1-read.png`, `GOOD-Chart-dark-b2-hemicycle.png` | humanities and maths components: dates, eras and seats read at a glance (more `GOOD-*` there per component) |
| `briefs/showcase/GOOD-SeedRaceScene-vital-force-dark-b1-on.png` | a DOM comparison board done well |
| `briefs/showcase/MEH-CrowdScene-reacts-dark-b3-run.png` | correct but weak: particles on a void, no apparatus |
| `briefs/showcase/ANTI-programmer-art-vs-good.png` | left half: everything to avoid; right half: the fix |

## Order of looking (context is the budget)

1. Read the text report `shoot` printed (canvas: overlap, off-canvas, small, contrast, empty centre; DOM: overlap, off-frame, small, contrast). It points at the shots worth opening.
2. Open the contact sheet `<Scene>-sheet.png` (every beat, both themes, half size) and the flagged single full-size shots in ONE response (parallel reads); in a 3-look pass that is the only viewing.

## Questions, per beat and theme

Walk every look-base rule and card rule, then:

1. Is anything clipped, overlapping or off-canvas, in EITHER theme?
2. Empty middle band: move or scale the hero into the hero zone (canvas: `ZONES.hero`; SVG/DOM: the stage middle; shoot prints the ink centre), never add decoration (plain: no setting unless the course names `casefile`). Before adding any drawing, check the stub's `Note card:` and `Not yet taught:`.
3. Readings in side cards, a chip for every label, chips at the edges, never on the evidence. Would it sit beside your look's anchors (Quill: the GOOD images above; plain: `packs/look/plain/SHOWCASE.md`)?
4. Glyph boxes: A box (tofu) or blank where a special glyph should be in a shot (the rupee sign, a tick, an arrow, a superscript, any non-Latin letter or symbol) is the screenshot browser's missing font, not a scene bug: never swap the glyph for words or CSS drawings, never add a replacement chip, and do not hunt fonts or kit source. If the character comes from `fmtINR`/`fmtNum` or another kit formatter, the source holds a backslash-u escape and there is nothing to check; otherwise, only when a box is visible, check the source holds the real character (a plain `grep` of the file). Log it once under `open:` (never `left -`) as `glyph box: <char>, harness font`.
5. Loop: shoot reads it AT the shot, before the 1.5 s idle park, so `loop running` on a static scene is expected. Parking is tested by check-scene's freeze probe, not here.
6. Geography: right silhouette for the landform (V vs U valley, meander, delta, fold) - compare with a real photo; vertical exaggeration and time named in chips; the same strata order and elevation ramp as the module's other scenes; India's border from the Survey of India layer with its credit. 3D: backdrop right in the light theme, chips not clipped or overlapping at any beat's camera shot, hero not cropped in portrait.
7. Humanities and maths: dates and durations read at a glance; order or cause visible without prose; seat, vote and money totals add up on screen; geometry labels off the lines; fractions stacked when the lesson stacks them; DOM boards checked in portrait. Maths stays flat: graph paper, no glow (both looks; plain's other subjects: flat paper, the chart's own gridlines).

## Do not over-argue

`shoot` saying 0 issues means no MEASURED overlap. A graze you cannot measure goes under `open:`: do not zoom, crop or argue it. Judge a defect in at most 3 lines, then fix it or log it.

## What to write (the design note's `## Look log`)

One line per round or pass, appended with `scene-pass.mjs ... look "<line>"` (never hand-edited): `round N (<shots viewed>): seen - <problems>; changed - <edits>; left - <...>` (verify's own look, 2 rounds) or `pass N (<images viewed>): seen - ...; changed - ...; left - ...` (3-look, see briefs/stage3-look.md). Anything still wrong at the end goes under `open:` with why it was left. Status is set only by `log-stage3.mjs`.

=== BUNDLE INFO ===
bundle stage3-arcade, sha256 2576586fe229a48f. GENERATED by tools/staged-generation/build-bundles.mjs from:
- START-HERE.md (11478 chars)
- briefs/reference/scene-rules.md (11569 chars)
- briefs/reference/gotchas.md (2858 chars)
- docs/look-base.md (1699 chars)
- packs/look/quill/CARD.md (1556 chars)
- briefs/stage3-simulation.md (21027 chars)
- briefs/stage3/arcade.md (7070 chars)
- docs/arcade-games.md (11420 chars)
- briefs/reference/look-rubric.md (5198 chars)
Do not edit: change the sources and rebuild. Everything above is the full text of those sources; do not open them again.
