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

=== FILE: briefs/stage3-build.md ===
# Stage 3, pass 1 - Build: design note, code, ONE quick check

You are pass 1 of up to 3 fresh agents on this scene: build (you), sanity (only if your quick check fails), verify (tests, check, look, log). You do not test behaviour, run probes, shoot, view scene images or write the log: later passes do. You stop after ONE quick check and hand over through the design note.

Target: one stub, `simulations/L0N/<Scene>.stub.md`. The invocation may add `Helper: <File>.js (not written yet: you write it ...)` or `(exists: import it, do not edit it)`, `Resume:` (your target's files exist: START-HERE rule 8; may name a stale note, see Resume), `Skip: brief item E` (leave out step E of the reading list) and `Targets:` (several stubs of one lesson, owner scenes first: read the docs and guide ONCE, then run the Procedure per scene in order: the owner scene (and its helper) fully handed over first; a decision that holds for the lesson goes in the first note and later notes cite it "as <Scene>"; a scene importing an earlier one reads it via `kit-api.mjs --bundle`; the owner scene writes the shared helper FIRST and small, then runs `ident-lint` on it and a smoke import before scenes 2 and up (smoke import = `node tools/sim-test/drive-dom.mjs <Scene.js> --steps='[{"beat":0}]'`, or `check-scene ... --no-browser --no-probes`): one early check, so a root cause is hit once; draft code in files, not thinking; compute numbers once with a `node -e`; write the first skeleton within 2 turns of the last read).

Output: `simulations/L0N/<Scene>.design.md` (written BEFORE any code), `simulations/L0N/<Scene>.js`, the helper if you are its writer. Write-scope: those, `build/`, scratch and `<Scene>-tests.json` in the repo-root `build/scratch/` (never under `courses/`). Never: block/lesson/question JSON or prose, the stub, another scene, a helper marked "exists", GENERATION-LOG.md. Something looks wrong? One line under `## Requests`.

## Read, in this order (nothing else unless a step sends you)

A. The stub (its `## Verbatim slide markdown` holds the slide prose: do not open the slide files), then `node tools/sim-test/scene-info.mjs L0N/<Scene> --bundle <Bundle>`: the attaching slides, their REAL beat counts, every beat's first words. A stub with `Beat maps:` means one `static BEAT_MAPS` entry per count (check-scene fails a missing one); `Same beats on all slides: yes`: one map serves every slide.
B. `briefs/reference/scene-rules.md` in full, then `briefs/reference/gotchas.md`.
C. `briefs/stage3/INDEX.md`, then the ONE guide it names for your stub's `Base class:` / `Component:` (plus people.md or props.md only if the scene draws people or apparatus). The guide holds the docs to read, the kit API, the example to copy. An arcade stub is a smaller job: `briefs/stage3/arcade.md`, then skip the note template below and build as it says. A stub `Recipes:` line names the motion recipe for a beat: build that beat with it (your guide's `Motion recipes` table has the call and the example) and name it in `Kit use:`.
D. `briefs/reference/kit-parts.md` (what you are about to draw -> the kit part that already does it), then `node tools/sim-test/kit-api.mjs --bundle <Bundle>` (this bundle's helpers: reuse before drawing anything new). Open a helper's source only for the one function you call. One kit function: `kit-api.mjs --sig <name>` (signature, returned keys, import line).
E. A good stub and note, and three images (skip the images if you cannot view them or `Skip: brief item E`): `briefs/showcase/EXAMPLE-stub.md`, `briefs/showcase/EXAMPLE-design-note.md`; `examples/media/quill-look/GOOD-Kudavolai-dark-b0.png`, `examples/media/quill-look/GOOD-BellJar-dark-b1.png`, `briefs/showcase/ANTI-programmer-art-vs-good.png`. View the three images in ONE turn. Plain look (your look card or the prompt says so): two plain images from `packs/look/plain/SHOWCASE.md` (`examples/media/plain-look/`, the anchor nearest your shape) replace the two Quill images.

## Tools (from the repo root; usage with no arguments; never read tool source)

| Tool | What it answers |
|---|---|
| `node tools/sim-test/kit-api.mjs <simulations/base/kit/Module.js> \| --bundle <b> \| --sig <name>` | one line per export of a module, this bundle's helpers, or one export with its return keys |
| `node tools/sim-test/ident-lint.mjs <file>` | undefined names, bad imports, clashing members (seconds) |
| `node tools/sim-test/check-scene.mjs <L0N/Scene> --bundle <b> --no-browser --no-probes` | the quick check: every static gate (seconds) |
| `node tools/staged-generation/scene-pass.mjs --bundle <b> --target L0N/<Scene> progress "<text>"` / `end build --check PASS\|FAIL ["<first failing line>"]` | the hand-over lines in the note |

## Procedure

0. **Limits and Resume.** A stub or slide contradiction: START-HERE rule 9. Put `Started: <date -u +%FT%TZ output>` in the note's header, after `Status:` and `Model:` (the template below; tools find it on any line). At 30 minutes without a drafted scene, build the simplest reading and hand over. No code, full strings or deck text in your thinking: decide in at most 10 lines, then Write the file. Decisions go to the note's `## Decisions`, one line each; never re-derive. A sibling scene built in this run is no precedent: do not read its file. **Resume** with a stale note (no `## Progress`, or no Layout, Beats, Numbers or Tests to run): run `ident-lint` and the quick check on the code that exists (no .js yet: write it from the note), add Progress lines for what exists, APPEND the missing sections (old headings: `Model numbers` = Numbers, a beats table without a heading = Beats), then write the tests file and run `end build`; on a resume ONLY (a fresh build never runs `start build`) first run `scene-pass.mjs --bundle <b> --target L0N/<Scene> start build`: it re-stamps `Started:`, sets Status building so the run counts as in flight, and gives the check runs a fresh budget; do not stamp `Started:` by hand on a resume. Do not rewrite the note or code, do not audit kit source.
1. **Design note first, and make it a handover.** Pass 2 and 3 are fresh agents who start from this note, the stub and your code. Write `<Scene>.design.md` before any code, in the shape of `briefs/showcase/EXAMPLE-design-note.md` (about 6 KB; terse):
   ```
   # <Scene> - design note
   Status: building
   Model: <what you are>
   Started: <date -u +%FT%TZ>
   Writes helper: <File>.js            <- only if the invocation says you write it
   Base class: <class> (<why, from the content's shape>)
   Kit use: <Part> use|extend|differ - <reason>[; ...]  OR  none fits (looked at: <guide>, kit-parts.md)
   ## Progress             <- lines are added by scene-pass.mjs, never by hand
   ## Decisions            <- one line each, with the reason; written the moment you decide; never reopened
   ## Layout               <- zones and what sits in them; no pixel coordinates
   ## Beats                <- | beat | shows (the exact visible state) | learner can -> effect | runs / events | enter() resets |
   ## Numbers              <- the numbers the scene shows, each tagged [slide] [stub] or [derived]; work tables out with a 5-line node -e, never by hand
   ## Deviations from the stub   <- every place you built something other than the stub says, and every contradiction with the reading you took
   ## Celebrate / rest / plausible / not shown
   ## Tests to run         <- a HEADING plus a table (not bullets; `end build` refuses a note without it): one row per stub `Must get right` item: | item | step | expect |  (words, not JSON; the steps go in the tests file, step 4). A scene with a `BEAT_STEP_MAP` also gets a `stage per beat` row: | stage per beat | beat 0..N | each beat that must differ reads a different stage (idx not all equal) |. `open:` lines for what needs eyes; `Resume-ignore:` with a reason if a resume difference is deliberate
   ## Look log             <- empty
   ## Checks explained     <- empty
   ## Requests
   ```
   Then `scene-pass.mjs ... progress "design written"`.
2. **Skeleton.** Copy the example your guide names under "Start from" (a complete scene with every hook). Class, statics (`BEAT_STEP_MAP` with one entry per REAL beat, `ARIA_LABEL`, `CONTROLS`), `enter`, a `draw`/`paint` that paints the backdrop and a stage label. Run `ident-lint` on it. If the stub has `Copy-from: <id>`: run `node tools/find-scene.mjs --use <id> --to L0N` first and adapt that copy instead of starting from an example; adapt it to this stub, do not keep its story or art.
3. **Beats.** Each beat's settled frame (no learner input) must show what that beat's text says; two beats with different texts never settle to the same frame. Build the beats one at a time, in place (edit, do not rewrite the file). `ident-lint` after a group of edits, not after every line. No `shoot`, not even `--peek`: the verify pass looks. Coordinates: a few anchors (ZONES, `heroBox`) and offsets; you do not settle geometry by arithmetic. Then `scene-pass.mjs ... progress "code drafted"`.
4. **One quick check, then hand over. Do not iterate.** Run `ident-lint` once and `check-scene ... --no-browser --no-probes` once. Then exactly one of:
   - both clean: `scene-pass.mjs ... end build --check PASS`
   - anything FAIL: do NOT fix it, the sanity pass does. Write its whole to-do first: `scene-pass.mjs ... progress "diagnosis: <EVERY edit sanity must make, incl. the BEAT_STEP_MAP or stage-hook half of a repair>"`, then `end build --check FAIL "<the first failing line>"`. Sanity is a fresh agent that applies exactly that list.
   A WARN is not a FAIL. TESTS FILE, before `end build`: write `build/scratch/<Bundle>/<Scene>-tests.json` (verify RUNS it): the note's `## Tests to run` rows as drive steps, at most 5 steps per row; ONE flat JSON array (never nested arrays or `{"rows":...}`; a beat-less game, stub `Beats: none`, has no `{"beat":N}` rows: write its steps as one flat list and ignore the rows WARN), a row starts at each `{"beat":N}` (DOM scene, two rows: `[{"beat":0},{"probe":"sc.stage","expect":0},{"beat":2},{"click":"button:has-text(\"Run\")"},{"probe":"sc.checkObjective().ok","expect":true}]`; a canvas scene has no `click`/`set` (drive.mjs rejects them): its second row is `{"beat":2},{"ctrl":["run",true]},{"until":"idle"},{"probe":"sc.checkObjective().ok","expect":true}` or a `{"tap":[x,y]}` step; a boolean expect is `"expect":true`); shape and probe forms: `briefs/reference/probe-cookbook.md` ("Minimal probe template"); an action Must-get-right (drag, tap) needs a click or drag step, not only a `sc.testState()` read; no probe over 120 chars, no layout/width/overlap probe (sim-layout and check-scene do those), scene fields read only `sc.stage` (SimScene) or `sc.stepIndex` (DomSimulation, SvgScene: use it wherever an example says `sc.stage`) / `sc.checkObjective` / `sc.testState()` (override `testState()` to return the plain object of key values the Tests rows need: stage, picked, locked; canvas probes read it as `d.state()`); a probe never stores a counter on `sc`. `expect` is `==`; a regex only as `{"expect":["sel","/re/"]}`; sup text reads as `x2` in textContent; click an SVG hit region by its `[data-region]` element, a button by `button:has-text("..")`. Example (canvas: `ctrl` for `set`/`click`): `[{"beat":0},{"probe":"sc.stage","expect":0},{"beat":2},{"set":["#len",1.2]},{"click":"button:has-text(\"Run\")"},{"until":"idle"},{"expect":["#f","/85\\.7 N/"]}]`. STRICT: never run it (drive-dom or otherwise); verify does. Then `progress "tests file written (not run)"`. With several targets: after the owner scene, write the other scenes' notes and code, then run `ident-lint` and `check-scene` for ALL of them side by side in ONE turn and record each result with its own `scene-pass.mjs` call (a shared root cause is then found once).
4a. **`Review: manual`** (in the invocation): put `Review: manual` on the note's line after `Started:`. Step 4 as written: the tests file is written, never run. A PASS `end build` then sets `Status: review-pending` (no verify, shoot or look: the operator runs the tests); close with the `log-stage3.mjs ... --status review-pending` line it prints. A FAIL goes to sanity as usual.
5. **Report** (one line per scene, nothing else): `BUILD <Scene>: check-quick PASS|FAIL; requests: N; tests file: written (not run); note simulations/L0N/<Scene>.design.md` (N = lines under the note's `## Requests`, 0 if none).

## Rules that matter most

- Colours from tokens (`c.<key>` on canvas, `var(--sim-*)` in SVG/DOM); never a hex, never a new `--sim-*` token.
- Draw what is true; flag what is not.

## Host facts (so you never read source)

The host calls `setup()`, then `onBeatChange(i, count)`, then `start()`. SimScene enters stage 0 inside `setup()` and switches to beat i's stage (from `BEAT_STEP_MAP`) with no time in between; your per-beat change is `enter(stage)`. Each beat change or control grants 8 s of animation budget; SimScene covers pointer events. The loop parks 1.5 s after `busy()` goes false, and not before the 8 s budget runs out.

## Done means

- [ ] Design note written first, in the template, with Decisions, Beats, Numbers, Deviations and Tests to run filled.
- [ ] Scene drafted; ONE quick check run, recorded with `scene-pass.mjs ... end build`; `build/scratch/<Bundle>/<Scene>-tests.json` written, NOT run.
- [ ] No shoot, no probe run, no log. Nothing outside the write-scope changed.

=== FILE: briefs/stage3/INDEX.md ===
# Stage 3 index - pick your guide

Read the one guide for your stub's `Base class:` (and `Component:`), plus an add-on only if the scene draws that thing. Each guide holds the docs to read, the kit API (from kit-api, copied in), the example to copy and the right check commands for that kind of scene. Nothing else about the kit is needed: no searching.

| The stub says | Read |
|---|---|
| `Base class: SimScene` or `CanvasSimulation` (canvas drawing: apparatus, labelled figures, graphs on canvas) | `briefs/stage3/canvas.md` |
| `Base class: SvgScene` (data shapes on an SVG stage) | `briefs/stage3/svg.md`, then the one `Component:` guide below. No `Component:` line? Pick by what the hero is: figure, angles, circle, constructions -> Geom; a line of numbers -> NumberLine; bars or a graph -> Chart; dice, coins, trials -> Chance; rings, sets, sort into regions -> Venn; a grid of counts with totals -> Table |
| `Component: Geom` (constructions, angles, drag a point, area model) | `briefs/stage3/geom.md` |
| `Component: NumberLine` | `briefs/stage3/numberline.md` |
| `Component: Chart` | `briefs/stage3/chart.md` |
| `Component: Chance` (dice, coins, cards, spinners, trees, long-run trials) | `briefs/stage3/chance.md` |
| `Component: Venn` (the hero is a Venn or set diagram: rings, regions, sort items into regions, shade a set expression) | `briefs/stage3/venn.md` |
| `Component: Table` (a grid of counts with totals: mark cells, read a row's share, fill a hidden cell) | `briefs/stage3/table.md` |
| `Base class: DomSimulation` (labelled panels, tables, sorting, cards) | `briefs/stage3/dom.md` |
| `Component: Timeline`, `FlowBoard`, `AllocBoard`, `SlotBoard` (history, civics, cause chains, allocation, compare) | `briefs/stage3/boards.md` |
| a game: role `game` / `mini-game@1`, `MonsterScene`, `KeyBuilderScene`, `NameDecoderScene` | `briefs/stage3/game.md` |
| `Base class: Arcade*Scene` | `briefs/stage3/arcade.md` (a much smaller job) |
| `Base class: GeoScene` or `WebGLSimulation` (3D), or a map (`GeoMap`, `SimGeo`) | `briefs/stage3/geo.md` |

Add-ons (read in addition, only when the scene needs it):

| The scene draws | Read |
|---|---|
| people, a crowd, a class, a seated person, a cyclist, an animal | `briefs/stage3/people.md` |
| a cart, block, ramp, pulley, spring balance, chair, desk, bicycle, a pan balance | `briefs/stage3/props.md` |

Need motion (a count, a fly-in, a spotlight, a draw-on, a morph)? Each guide has a `Motion recipes` table: take the row before hand-rolling a tween.

Not sure whether the kit already has a part for something you are about to draw? `briefs/reference/kit-parts.md` is the one table: pattern -> part -> showcase. A scene that hand-draws a part from that table gets a note from `check-scene`.

If no guide fits (a new base class, an odd stub): take the closest one and put one line under `## Requests`.

=== FILE: briefs/reference/kit-parts.md ===
# Kit parts: pattern -> part

Look here before drawing or hand-coding any of these. Each part has a showcase; your guide under `briefs/stage3/` lists the exports of the modules for your kind of scene (`node tools/sim-test/kit-api.mjs <module>` for any other).
Nothing here fits? `none fits (looked at: kit-parts.md)` is a valid answer in the design note.
Check-scene prints a `note` when a scene defines one of these itself.

| You are about to write | Use instead | Module (simulations/base/kit/) | Showcase (examples/simulations/) |
|---|---|---|---|
| word-wrap, fit text in a box, caption strip | wrapText, fitText, captionBar | SimLook.js | LookKitShowcaseScene.js |
| labels that must not overlap, leader lines | placeLabels, leader (clamps to frame) | SimLook.js | LookKitShowcaseScene.js |
| chip text under 14px | pills raise to MIN_PX (14) by themselves | SimLook.js | - |
| clamp, lerp, mix, inkOn, rr, mulberry32 | import them | SimLook.js | - |
| force / velocity / field arrow with a value | vectorArrow | SimLook.js | PropsShowcaseScene.js |
| drag a point, grab radius, snapping | dragHandle (you draw the handle) | SimDrag.js | PropsShowcaseScene.js |
| cart, block, ramp, pulley, spring balance, ground | propRig + drawCart/drawBlock/drawRamp/drawPulley/drawSpringBalance/drawGround | SimProps.js | PropsShowcaseScene.js |
| energy bars (K, U, heat and sound), total line, tween | drawEnergyBars + barsAt / energyBarsTrack | SimEnergy.js | science/EnergyCastShowcaseScene.js |
| work done pill ("W = 20 J") | drawWorkCounter | SimEnergy.js | science/EnergyCastShowcaseScene.js |
| coil spring (rest, squashed, stretched), wall mount, push-back arrows | drawSpring | SimApparatus.js | science/EnergyCastShowcaseScene.js |
| pendulum, swing arc, level line, marked points | drawPendulum | SimApparatus.js | science/EnergyCastShowcaseScene.js |
| seesaw plank, seats, beam balance pans and coins | drawLeverPlank (geometry from SimRig lever) | SimApparatus.js | science/EnergyCastShowcaseScene.js |
| sack or school bag with hand grips | drawSack | SimApparatus.js | science/EnergyCastShowcaseScene.js |
| stairs, rail, height bracket, ground(x) for feet | drawStairs | SimApparatus.js | science/EnergyCastShowcaseScene.js |
| bar magnet N/S, + / - charge, plain ball or stone | drawMagnet, drawCharge, drawBall | SimApparatus.js | science/EnergyCastShowcaseScene.js |
| number line, ticks, fractions, hops, spans | numberLine (spec) + numberLineCanvas, markerCanvas, hopCanvas, spanCanvas | SimNumberLineSpec.js, SimNumberLineCanvas.js | ShapeKitCanvasShowcaseScene.js |
| bar chart, line trace, axes, second y axis | chartFrame (spec) + axesCanvas, barsCanvas, traceCanvas | SimChartSpec.js, SimChartCanvas.js | ShapeKitCanvasShowcaseScene.js |
| the same on an SVG / DOM stage | numberLineSvg, markerSvg, axesSvg, barsSvg, traceSvg (same specs) | SimNumberLine.js, SimChart.js | maths/NumberLineShowcaseScene.js, maths/ChartShowcaseScene.js |
| rock layers, fault, cave, grain | drawStrataBlock (endLines, grain, voids, fault) | GeoMap.js | geo/StrataExtrasShowcaseScene.js |
| sort items into bins with live counts | simPick with track: true | SimPick.js | - |
| ask the learner to commit a guess before the reveal | predictGate (chips, verdict, celebrate / oops, keyboard path via a select) | SimPredict.js | maths/CatchUpPredictShowcaseScene.js |
| angle arcs with a live value, right-angle marks, constructions, drag a point on a circle | geomFigure + geomHandles (spec) + geomCanvas (canvas) or geomSvg (SvgScene) | SimGeomSpec.js, SimGeomCanvas.js (canvas); SimGeom.js (SVG) | maths/ArcAngleShowcaseScene.js (canvas); maths/GeomShowcaseScene.js (SVG) |
| area model / algebra tiles with a caption that must match the picture | areaModel (cells, total, caption() derived) + areaGridCanvas | SimGeomSpec.js, SimGeomCanvas.js | maths/AreaTilesShowcaseScene.js |
| dot or tile patterns on graph paper: rows of dots (staircase), W x H grid, L-shaped layer, bar, stack, upside-down copy, zigzag-split rectangle, Sierpinski triangle stages; lit / dim / ghost cells, staggered arrival | triangleRows, rect, lLayer, bar, stack, mirror, shift, zigzagSplit, sierpinski (cell lists) + patternSvg, zigzagSvg, fitCell (SvgScene) | SimDots.js | maths/DotPatternsShowcaseScene.js |
| maths in a wrapped caption (fractions, powers inside a sentence) | drawMathCaption, drawMathWrapped, wrapMath | SimText.js | maths/AreaTilesShowcaseScene.js |
| repeated random trials, running frequency, a strip of draws | trialRun (seeded) + traceCanvas + trialStripCanvas | SimChanceTrials.js | maths/LongRunFrequencyShowcaseScene.js |
| a timeline strip: eras, dated ticks, event tags, brackets, a now marker | timelineAxis + timelineCanvas | SimTimelineCanvas.js | humanities/HarappanTimelineShowcaseScene.js |
| a plain icon (sun, globe, lamp, eye, cloud, mountain, plane, leaf, seed, flower, cup, glass, ticket, printer, flame, speaker, tyre, crate, test-tube, mushroom, fish, frog, bird, snail, insect ...) | drawIcon / iconSvg | SimIcons.js | humanities/IconSheetScene.js |
| dates on a line (DOM board) | TimelineScene | SimTimeline.js | humanities/ChronologyShowcaseScene.js |
| cause chain, order, cycle | FlowScene | FlowBoard.js | humanities/FlowLayoutsScene.js |
| a count that ticks up or rolls (odometer) | countUp / odometer (canvas); countSvg / odometerSvg (SVG, DOM) | SimMorph.js; SimMorphSvg.js | SimMorphShowcaseScene.js; maths/SvgMorphShowcaseScene.js |
| one expression becomes the next ("6 + 4" to "10") | transformTerms / transformTermsSvg; term lists from setTerms, rosterTerms, builderTerms | SimMorph.js, SimMorphSvg.js, SimMorphSpec.js | SimMorphShowcaseScene.js; maths/SvgMorphShowcaseScene.js |
| a shape becomes another shape; a keyword pops; a marker swipe | morphPair + drawMorph, drawKeyword, highlighterSweep; morphPath, keywordSvg, highlighterSvg | SimMorph.js, SimMorphSvg.js | SimMorphShowcaseScene.js; maths/SvgMorphShowcaseScene.js |
| items fly into bins or rings, staggered | flyMany / flyChip / flyTo on the live layer (or lagged on canvas) | SimFlySvg.js; SimAnim.js | maths/SvgMotionShowcaseScene.js; SimAnimShowcaseScene.js |
| spotlight one part, dim the rest, pulse, flash THE answer | spotlight, focusStyle, indicateSvg, flashSvg (SVG); focusTone, indicate, dimOutside, flashAt (canvas) | SimFocusSvg.js; SimFocus.js | maths/SvgMotionShowcaseScene.js; SimFocusShowcaseScene.js |
| a line or ring draws itself, text is written on | drawOnPath, drawOnCircle, writeOnSvg (SVG); drawOn, writeOn (canvas) | SimDrawOnSvg.js; SimDrawOn.js | maths/SvgMotionShowcaseScene.js; SimDrawOnShowcaseScene.js |
| the frame clock on a DOM scene | extends withClock(DomSimulation): play, skip, busy, animate | SimClock.js (also SimSvg.js) | ClockDomShowcaseScene.js |
| a table of counts with totals, marked cells, a row's share, a hidden cell to find | tableSpec + tableSvg (hi, band, dim, hidden, guess); a table only to read is markdown | SimTableSpec.js, SimTable.js | data/TableHighlightScene.js |
| a panel of numbers: big reading with its formula, ruled table with a column or row to pick, labelled slider with ticks, bar-compare rows, histogram with a marker, take-away line, numeric entry with Check | readoutHtml + setReadout, ruleTableHtml, sliderHtml, barsHtml (rule) + setBar, columnsHtml + setColumns, takeawayHtml, entryHtml, buttonsHtml, bindPanel | SimPanel.js | - (course: analytical-epidemiology L03) |
| a worked calculation: numbered rows (label, big serif formula, gloss), stacked fraction, value that counts up, "Show worked arithmetic" | calcStepsHtml, formulaHtml ({ n, d } / { v, key }), overHtml, countValue, revealHtml | SimPanel.js | - (course: analytical-epidemiology L03 OddsRatioBuildScene) |
| emphasis: pull quote, highlighted phrase, a correction (struck word + replacement) | pullQuoteHtml, emHtml, editHtml | SimPanel.js | - (course: L03 SlipSpotterScene) |
| something the learner acts on: chip with a select ring and picked state, the prompt line, a sentence of word chips | chipsHtml, promptHtml, sentenceHtml; ruleTableHtml pick heads | SimPanel.js | - (course: L03 OddsRatioBuildScene, SlipSpotterScene) |
| which pattern to use (worked steps, emphasis, affordance rules) | see `docs/numericals.md` 2-4 | SimPanel.js | - |
| Venn rings, regions, shading, sort items into regions | vennSpec + vennSvg + slots + exprMask + regionSweepSvg (SVG); vennCanvas (canvas) | SimVenn.js, SimVennSpec.js; SimVennCanvas.js | maths/VennShowcaseScene.js; VennCanvasShowcaseScene.js |
| chips written as terms or notation that light parts of the figure (tap to lock, keyboard, phone) | tapLight (DOM, SVG, in the scene); tapLightControl (canvas, host CONTROLS) | TapLight.js | science/TapLightSvgShowcaseScene.js, science/TapLightCanvasShowcaseScene.js, maths/TapLightDomShowcaseScene.js |
| drag into a region that is not a rectangle; items glide home | simPick targetAt, onOver, settle: 'spring', settling | SimPick.js | maths/PickRegionShowcaseScene.js |
| zoom or pan into a part, parallax | withCamera, pushTo, cameraAt, layer (canvas); cameraG, cameraLive, cameraTransform, pointWorld (SVG, DOM) | SimCamera.js; SimCameraSvg.js | SimCameraShowcaseScene.js; maths/SvgCameraShowcaseScene.js |
| name the thing to look at on the figure: a callout with a leader, an underline, a highlighter sweep, a ring (at most 3; the newest is the beat) | annotations({ max }): callout(target, text, { sub, side, at, key }), underline({ x1, x2, y }), highlight(box), ring(target), clear(key); SVG under()/svg()/over(), canvas draw(ctx, c, { layer }); annotateDom(host) for DOM | SimAnnotate.js | data/PeopleToCellsScene.js; data/TableHighlightScene.js |
| axes that build, a line that plots, bars that grow, a callout | axesOn, plotLine, barsOn, drawCallout (canvas); axesOnSvg, plotLineSvg, barsOnSvg, calloutSvg, plotHit (SVG, DOM) | SimPlot.js; SimPlotSvg.js | SimPlotShowcaseScene.js; maths/SvgPlotShowcaseScene.js |
| coordinate plane on graph paper (equal units, x / y / O, arrows), points with tags, y = ax + b, step triangle, y-intercept, drag a point on the grid | planeFrame, planeSvg, pointSvg, lineSvg, lineThroughSvg, lineDrawOn, stepTriangleSvg, interceptSvg, dragPoint, planeHit (SvgScene) | SimPlaneSvg.js | maths/PlaneShowcaseScene.js |
| isometric blocks, exploded view | solidOf, drawSolid, explode (canvas); isoSvg, isoLive, explodeLive, pickFace (SVG, DOM) | SimIso.js; SimIsoSvg.js, SimIsoSpec.js | SimIsoShowcaseScene.js; maths/SvgIsoShowcaseScene.js |
| picture A becomes picture B; a soft contact shadow | stageBridge, contactShadow (canvas); stageBridgeSvg, contactShadowSvg, shadowTone (SVG, DOM) | SimStage.js; SimStageSvg.js, SimStageSpec.js | SimStageShowcaseScene.js; maths/SvgStageShowcaseScene.js |
| limbs, two-bone reach, crank, lever | ik2, limb, muscle, crankSlider, lever (canvas); limbSvg, muscleSvg, leverSvg, crankSvg, trackPoint (SVG, DOM) | SimRig.js; SimRigSvg.js | SimRigShowcaseScene.js; maths/SvgRigShowcaseScene.js |
| the scene demonstrates itself when idle | tour (also on a withClock SVG / DOM scene: it never draws) | SimTour.js | SimTourShowcaseScene.js |
| a mini-game board in plain DOM that must work on a phone: tap card, tap bin; Check under the board; Quill in the corner (the look's companion; none under plain) | GameBoard + mountGame, or SortBoard (data only); onTap, formula, finishGame | GameFrame.js | - |
| pan balance | SimBalance | SimBalance.js | maths/BalanceShowcaseScene.js |
| lab glass (beaker, jar, tube, cylinder, flask, round flask, bottle, tumbler, funnel, separating funnel 'pear', dropper; flip for mouth-down) and the liquid in it; straight tubing (condenser, side arm) | glassBox, drawGlass, drawGlassLiquid, drawGlassBand, drawGlassFront, wallsAt, drawGlassPipe, drawGlassPipeFront (canvas) | SimGlass.js | mixtures L01-L09 |
| an atom, nucleus, proton, neutron, electron, shell, ion, shared pair, ball-and-stick molecule (H2, Cl2, O2, N2, HCl, H2O, CO2, sugar); a depth field for a microscopic hero. One material; no faces | drawAtom, atomLayout, drawNucleus, nucleusLayout, drawNucleon, drawElectron, drawSeat, drawShell, shellPoints, drawIon, drawCharge, drawBond, drawSharedPair, drawMolecule, MOLECULES, atomTone, drawBall, drawFocus, drawDepthField (canvas) | SimAtom.js | science/AtomShowcaseScene.js |
| kit paper + course setting behind a legacy CanvasSimulation (replaces its bgDeep fill) | drawKitBackdrop(ctx, this, W, H) | SimLegacy.js | atomic-foundations (50 scenes) |
| the active look's numbers (radius, rim, lip, pop time); never hard-code a look | lookOf() (canvas, SVG markup); --look-* (DOM CSS) | lookProfile.js, looks/quill.js | - |
| a person doing the work | drawFigure | SimFigure.js | FigureShowcaseScene.js |
| a person by role (student, teacher, voter, doctor, farmer, police ...) | figureFor(this, { role, pose, scale }) -> spec; throws on a typo, never a stick person | SimFigure.js | FigureGroupsScene.js |
| a row of people, a class, a queue, rows behind rows | drawFigureRow (wraps, shrinks, glyphs below 44 px; between: a desk) | SimFigure.js | FigureGroupsScene.js, SeatedCycleScene.js |
| a crowd, voters, an audience | drawCrowd (seeded, no face hidden) / crowdLayout (pure) | SimFigure.js | FigureGroupsScene.js |
| ring the counted people, k of n; plain (a population as data): k of n as dots | highlightFigures (rings + count chip); plain: dotsSvg (seeded Set for the marked dots) | SimFigure.js; SimChart.js | FigureGroupsScene.js; data/DotPopulationScene.js |
| a seated person, a chair, a bench, a desk | pose 'sit' + drawChair / drawSeatBench / drawDesk (seat and hand anchors) | SimFigure.js, SimProps.js | SeatedCycleScene.js, humanities/PartyChamberRebuildScene.js |
| a cyclist, a bicycle | pose 'cycle' + bicycleRig / drawBicycle (wheels roll with distance) | SimFigure.js, SimProps.js | SeatedCycleScene.js |
| a cow, goat, sheep, dog, cat, deer, tiger, elephant | drawAnimal({ kind, pose: stand / walk / graze / lie, phase: animalPhase(dist) }) | SimAnimal.js | AnimalSheetScene.js, AnimalFieldScene.js |
| a fish, frog, bird, snail, insect | drawIcon / iconSvg | SimIcons.js | humanities/IconSheetScene.js |
| a field of crop strips (wheat, barley told apart by shape, sugarcane, millet, pulse, rice, idle), soil by kind, a reading tag on a strip, tap a strip, crops growing in; a well with the water line under the ground | farmSpec + farmSvg / drawFarm, farmHit, farmGrow, farmGrowOne (one strip growing, animate: i); tagPlace 'end' / 'outside' (tags clear of the crops) + farmBox; wellSvg / drawWell; tagSvg / drawTag (tone: crop name); cropTone | SimFarm.js | humanities/FarmStripsShowcaseScene.js |
| drawn civic and economy things at scene size, no faces, no money art: polling booth, ballot box, voting machine, parliament, court, office, school, tree, village square, book, open book, newspaper, phone, mike; shop, market stall, tailoring workshop, factory, sewing line (machine-heavy), tailor table (labour-heavy), bank, truck, report with a bar chart, planning office, library, shoe, school shirt; light one part (dim) | drawCivic (canvas), civicSvg (SvgScene), civicHtml (DOM), civicSize, CIVIC_KINDS, CIVIC_PARTS, dayStage, speech | SimCivic.js | humanities/CivicKindsShowcaseScene.js |

Rules of thumb:
- A canvas scene can use the Canvas renderers; an SVG or DOM scene uses the Svg ones. The geometry (numberLine, chartFrame) is the same.
- Animate a canvas part by passing progress 0..1 (grow, draw, reveal); the scene owns the clock.
- Not covered yet (write it in the scene, keep it small): probability trees, function machines, place-value boards.

Waves (SimWave.js, canvas; one model s(d, t) = f(t - d / v) behind every part):

| You are about to write | Use instead | Module (simulations/base/kit/) | Showcase (examples/simulations/) |
|---|---|---|---|
| a vibrating source, piston strokes, one pulse | sineSource, pistonSource, pulseSource, sumSources | SimWave.js | science/WaveCastShowcaseScene.js |
| where the compressions / rarefactions are now, density | waveField (s, rho, rhoLin, regions) | SimWave.js | science/WaveCastShowcaseScene.js |
| air particles in a tube, piston, C/R tags, red particle + range | drawParticleStrip | SimWave.js | science/WaveCastShowcaseScene.js |
| R as readable as C (paper band), region brackets, open tube end, room full of air, slinky fixed end, signal pulses in a wire | swingAmp, drawParticleStrip densityShade/regionBands/clip/fadeEnd, drawRings mask/mark, drawSlinky fixedEnd/markBracket, drawSignalWire style pulse | SimWave.js, SimApparatus.js | science/WaveCastShowcaseScene.js, science/SoundApparatusShowcaseScene.js |
| density-distance graph on green graph paper, lambda, amplitude | drawDensityGraph | SimWave.js | science/WaveCastShowcaseScene.js |
| slinky with a marked turn; rope or string with a marked point | drawSlinky, drawRope | SimWave.js | science/WaveCastShowcaseScene.js |
| rings of particles round a point source, one-direction strip | drawRings | SimWave.js | science/WaveCastShowcaseScene.js |
| sound leaving a source / arriving at a receiver (arcs) | drawSoundArcs (the one style) | SimWave.js | science/WaveCastShowcaseScene.js |
| echo pulse to a wall and back, travel time | outAndBack, drawOutAndBack | SimWave.js | science/WaveCastShowcaseScene.js |
| direction of propagation / particle vibration arrows | drawPropagationArrow, drawVibrationArrow | SimWave.js | science/WaveCastShowcaseScene.js |
| tuning fork (stem, two prongs, swing + ghost), rubber pad | drawTuningFork | SimApparatus.js | science/SoundApparatusShowcaseScene.js |
| vacuum bell jar with electric bell, wires, hand pump | drawBellJar | SimApparatus.js | science/SoundApparatusShowcaseScene.js |
| long tube with a piston at the left end (rod, T handle) | drawPistonTube | SimApparatus.js | science/SoundApparatusShowcaseScene.js |
| loudspeaker (whole or cutaway), microphone (whole or cutaway, desk stand) | drawSpeaker, drawMicrophone | SimApparatus.js | science/SoundApparatusShowcaseScene.js |
| cable with an electrical signal trace beside it | drawSignalWire | SimApparatus.js | science/SoundApparatusShowcaseScene.js |
| stopwatch with a hand and a readout | drawStopwatch | SimApparatus.js | science/SoundApparatusShowcaseScene.js |
| side-view bus (outside, or cut-away inside with seats, strap bar, standing anchor), car, truck (box/open), scooter with rider anchors | drawBus, drawCar, drawTruck, drawScooter | SimVehicles.js | science/MotionKitShowcaseScene.js |
| canoe with paddle and paddler anchors, rocket with plume or retro jets, balloon rocket on a thread | drawCanoe, drawRocket, drawBalloonOnThread | SimVehicles.js | science/MotionKitShowcaseScene.js |
| straight running track, road, number line or pool lane in metres, O, +/- sides, pins with tags | trackSpec, drawTrack | SimTrack.js | science/MotionKitShowcaseScene.js |
| strobe (ghost copies at equal time steps) with gap brackets; speedometer dial | drawStrobe, drawSpeedometer | SimTrack.js | science/MotionKitShowcaseScene.js |
| velocity, acceleration, force, displacement arrows (fixed tones, a = 0 dot) | drawMotionArrow, ARROW_KINDS | SimTrack.js | science/MotionKitShowcaseScene.js |
| slope triangle A-C-B on a graph; area under a v-t line (split rectangle + triangle) | slopeTriangle, areaUnder | SimPlot.js | science/MotionKitShowcaseScene.js |

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

=== FILE: briefs/showcase/EXAMPLE-design-note.md ===
<!-- EXAMPLE design note, a good shape to copy. Trimmed from a real note (work-energy L05 EscapeRampScene) and reordered to the current template. Pass 1 writes everything above "## Look log"; later passes only append to Progress, add rows to Tests to run results, and fill Look log / Checks explained. Read it for the SHAPE: decisions with reasons, one table row per beat, numbers with where they come from, tests a stranger can run. The set-dressing (backdrop 'dots', a dusk mountain, a burst) is Quill: take yours from your look card (plain: flat paper, no setting, a tick). -->
# EscapeRampScene - design note
Status: building
Model: <the invocation's Model:, else what you are>
Started: 2026-10-08T09:12:40Z
Base class: SimScene (canvas): a truck on a road and a ramp in one dimension, plus a four-row ledger that must stay readable while the truck moves. Geometry, not panels: the ledger is a side card, the evidence is the drawn slope.
Kit use: SimProps drawGround use; SimLook backdrop 'dots' use; no kit part draws a truck or a meter, so both are hand-drawn (looked at: canvas.md, kit-parts.md).

## Progress           <- one line per step, added by scene-pass.mjs
- read done
- design written
- code drafted
- build end: check-quick PASS

## Decisions           <- one line each, written when made; never reopen one
- Account counted in 100 shares, not joules: the only way the length can stay off the screen (shares never convert back to metres).
- Slope fixed at 30 deg and only drawn (arc at the foot, dashed rise marked "half the length"): the stub says the slope is shown, not computed.
- The ledger is its own card on the right, not chips on the road: four rows must be readable while the truck moves.
- Ramp length is a slider control; there is no drag on the bed (the stub's "drag" is met by the slider). Reading taken from the stub's Dials line.
- Verdict chip names the three outcomes in words and never the length that works.
- CONTINUOUS = false: nothing moves while idle except a hint pulse bounded by the beat's age.

## Layout
Backdrop 'dots' behind a dusk mountain. Hero = road + ramp in the left two thirds (road along the bottom, gravel bed a thin band up the 30 deg line, hillside wedge filled so the lower right is not empty). Right card = the account: four rows (arrived / climb / gravel / left) with a meter under each bill, then a full-width account bar; below it a "your dials" card. Chips: "no brakes" top-left, the beat's prompt top-centre, the run's outcome bottom-centre. No pixel coordinates here: the code has them and they go stale after a look round.

## Beats
| beat | shows | learner can -> effect | runs / events | enter() resets |
|---|---|---|---|---|
| 0 | truck on the road, ramp at the set length, four rows empty, angle and rise drawn | set length 10-60 m, set gravel 0-4000 N, Run | Run: 0.7 s along the road, then the climb; four entries post as it goes | nothing; a run in flight finishes and its ledger stays |
| 1 | as beat 0, plus a "climb" chip on the rise and a "gravel" chip on the bed, each on a leader | as beat 0 | as beat 0 | as beat 0 |
| 2 | as beat 0, plus "shortest" at 10 m and "longest" at 60 m marked on the road datum | as beat 0 | as beat 0 | as beat 0 |

## Numbers
Source tags: [slide] from the slide, [derived] worked out here.
- Mass 1200 kg, g = 10 N/kg [derived]. Climb bill 6000 J per metre of ramp (0.5 m of height per metre of ramp) [derived].
- Gravel dial 0-4000 N, step 250, default 1500 [stub]. Gravel bill = F joules per metre.
- Length dial 10-60 m, step 0.5, default 10.0 [stub]; the default is the short ramp beat 1 opens with.
- Account empties at L* = 202500 / (6000 + F): F = 0 -> 33.8 m, F = 1500 -> 27.0 m, F = 4000 -> 20.3 m [derived]. Never printed.
- A run: 0.7 s on the road, then constant deceleration (6000 + F) / 1200 m/s2, 2.2-3.7 s, ending when the account is empty; off the end of a short bed it coasts 0.6 s and fades.

## Deviations from the stub
- Stub: "a ramp-length drag". Built: a slider. The bed follows the slider; no drag on the bed.
- None other.

## Celebrate / rest / plausible / not shown
- Celebrate: a burst at the top of the bed on the run whose account empties within 0.26 m of the top. Never on the other two outcomes.
- Rest: busy() is true only while a run is in flight, while the bed eases to a new length, or during the coast.
- Plausible: a loaded truck decelerating up a 30 deg escape ramp and stopping on it; the bed is loose stone; the two bills are the two resistances the slide names.
- Not shown: joules, mass, g, speed, an adjustable angle, rolling back, a formula for L*, conservation by name.

## Tests to run         <- for the verify pass: one row per stub "Must get right" item; step = what to do, expect = what must be readable or true
| item | step | expect |
|---|---|---|
| two bills, one account | length 27, gravel 1500, Run, wait until idle | climb row and gravel row both non-zero |
| too short stays moving | length 10, gravel 1500, Run, until idle | verdict says still moving; left row non-zero |
| too long stops short | length 45, gravel 1500, Run, until idle | verdict says stopped short |
| exact length empties it | length 27, gravel 1500, Run, until idle | left row is 0 at the top; a celebration fired |
| length is never printed | after any run | visible text has no length in metres except the dial's own value |
| stage per beat | beat 0..N | each beat that must differ reads a different stage (idx not all equal) |
open: truck face legible at the smallest size; the coast past a short bed looks like flight (needs eyes).
Resume-ignore: none.

## Look log           <- one line per look pass; empty until the verify/look passes run

## Checks explained   <- one line per WARN left and why; empty is normal

## Requests
- Stub says "a ramp-length drag"; built a slider (see Deviations). A reviewer may want the drag.

=== FILE: briefs/stage3/svg.md ===
# Stage 3 guide: SVG data scene (SvgScene)

For `Base class: SvgScene`: one SVG stage sized to the host width for number lines, charts, geometry and chance. Chips and cards are HTML on an overlay. Then read the guide for the stub's `Component:` (`geom.md`, `numberline.md`, `chart.md`, `chance.md`, `venn.md`, `table.md`). A bundle holds `geom.md` whole and the Rules of `chart.md` and `table.md`: for any other Component, or a chart or table API (time axis too), open its guide from `briefs/stage3/`.

## Read
- `node tools/doc-section.mjs docs/dom-scene-kit.md "5. Checks" "6. Do not"`
- Shape -> component: `briefs/stage3/INDEX.md`; shape -> part: `briefs/reference/kit-parts.md` (both in your bundle).

## Start from
- The showcase for your component (named in its guide), under `examples/simulations/maths/`; a data scene (chart, time histogram, k of n dots, table, flow), or any look other than Quill: the anchors in `examples/simulations/data/` (`packs/look/plain/SHOWCASE.md`). Copy its shape: `paint(st) -> { svg, over, head }`, `stageHeight(st)`, `enter(step)`, pointer hooks, `css()`.
- Not `examples/simulations/SceneSkeleton.js`: that is a canvas scene.

## Rules
- Plain look: a control looks actionable (button or chip with a picked state, a prompt for the move), a number is worked with its formula (`docs/numericals.md` 2 and 4).
- Lay out for `st.W` (portrait is its own layout; text never shrinks). Never hard-code the stage width.
- `<text>` renders only inside the `<svg>` string, never in the overlay HTML; overlay HTML takes chips and cards (`chip`, `cardHtml`).
- A note is one muted line at the foot (`noteLineHtml` from `SimLookDom.js`); a celebration is `this.celebrate()` (or `burst(element)`) once at the find; the look draws it (Quill a ring and pop, plain a small tick, a stamp under the casefile setting: `celebrate({ stamp: 'WORD' })`).
- Colours are tokens (`tone(n)`, `var(--sim-series-n)`, `fill()/stroke()` helpers: SVG attributes cannot take `var()`, `style=` can).
- Size: `sim-layout` names the HEIGHT to set. Keep every beat under about 680x520 design px; shrink the figure before raising HEIGHT.
- Drag: `pointerDown/Move/Up` get stage coordinates; the geometry guide shows `geomHandles`.
- Controls live in the scene, not the host strip (`CONTROLS = []`): drag handles and tappable shapes in the SVG (shapes take `tabindex`, `role`, `aria-label` for keys), buttons, chips and readouts in `over` / `head` HTML. No `foreignObject`.

## SvgScene hooks (kit/SimSvg.js)
- `paint(st) -> { svg, over, head, floor }`: the whole picture for the current state; `st.W`, `st.H`, `st.portrait`. `head` = title-row HTML, `over` = HTML overlay, `floor` = the y of the floor band in design px (a number; leave it out for no floor band).
- `pointerDown(p)` (return false: no drag), `pointerMove(p)` (return true: repaint), `pointerUp(p)`; `p` = stage coords.
- `stageHeight(st) -> px` (default 430 landscape, 520 portrait); `enter(step)` on every step change; `css()` extra CSS.
- Setup order: `super.setup()` runs `enter(0)` then `paint()` ONCE before it returns, so set every field `paint` reads BEFORE `await super.setup()`.
- `this.stepIndex` = the BEAT_STEP_MAP idx now; `this.repaint()`, `this.after(sec, fn)` (dropped on a step change), `this.celebrate()`.
- `onBeatChange` is SvgScene's own (it sets stepIndex, calls `enter`, repaints): do not define it. A scene on two slides with different beat counts declares `static BEAT_MAPS` (see scene-rules.md); SvgScene reads it by beat count, so no override is needed.
- sim-layout names a clipped element by class and by its text (`.text` is an SVG `<text>`); check-scene's browser report adds its position. Run it again only after editing the scene: an unchanged scene returns its last result without a run.

## Motion recipes (SvgScene clock + live layer)
Before hand-rolling a tween, a spring, a stagger or a fade, take the row. `this.play(sec)` runs the clock (no idle loop); draw the moving parts in `animate(st, t)` on `this.live`; `this.skip()` lands a running play; `busy()` is true while it runs. Showcases: `examples/simulations/maths/`.

| The beat needs | Call (module in simulations/base/kit/) | Example |
|---|---|---|
| a number counts up, or rolls like an odometer | `countSvg`, `odometerSvg` (SimMorphSvg) | SvgMorphShowcaseScene |
| "this expression becomes that one" | `transformTermsSvg` (SimMorphSvg) with `setTerms` / `rosterTerms` / `builderTerms` (SimMorphSpec) | SvgMorphShowcaseScene |
| a shape becomes another shape | `morphPath` (SimMorphSvg) + `rectPts` / `circlePts` (SimMorphSpec) | SvgMorphShowcaseScene |
| a keyword pops in, a marker swipes a word | `keywordSvg`, `highlighterSvg` (SimMorphSvg) | SvgMorphShowcaseScene |
| items or chips fly to a target, staggered | `flyChip`, `flyMany`, `flyTo`, `flying` (SimFlySvg) | SvgMotionShowcaseScene |
| spotlight one part, dim the rest, pulse it, flash THE answer | `spotlight`, `focusStyle`, `indicateSvg`, `flashSvg`, `sweepSvg` (SimFocusSvg) | SvgMotionShowcaseScene |
| a line or ring draws itself, text is written on | `drawOnPath`, `drawOnCircle`, `writeOnSvg` (SimDrawOnSvg) | SvgMotionShowcaseScene |
| Chips of terms or notation that light parts of the figure | `tapLight`, row mounted in `this.root`, under the stage (TapLight) | TapLightSvgShowcaseScene |
| Venn rings, regions, sorting into regions, shading sweep | `vennSpec`, `vennSvg`, `regionSweepSvg` (SimVenn): open `briefs/stage3/venn.md` | VennShowcaseScene |
| a table of counts with totals, marked cells, a hidden cell | `tableSpec`, `tableSvg` (SimTable): open `briefs/stage3/table.md` | data/TableHighlightScene |
| isometric blocks, an exploded view, a pickable face | `isoSvg`, `isoLive`, `explodeLive`, `pickFace`, `cuboid`, `ISO_SVG_CSS` (SimIsoSvg; geometry in SimIsoSpec) | maths/SvgIsoShowcaseScene, science/SvgIsoPhysicsShowcaseScene |
| zoom or pan into a part, parallax | `cameraG`, `cameraLive`, `cameraTransform`, `pointWorld`, `hairStyle` (SimCameraSvg; maths in SimCamera) | maths/SvgCameraShowcaseScene, science/SvgCameraStageBiologyShowcaseScene |
| picture A becomes picture B; a soft contact shadow | `stageBridgeSvg` (then `br.draw(live, key, t)`), `contactShadowSvg`, `contactShadowLive`, `shadowDefs`, `shadowTone` (SimStageSvg; phases in SimStageSpec) | maths/SvgStageShowcaseScene, science/SvgCameraStageChemistryShowcaseScene |
| axes that build, a line that plots, bars that grow, a data callout | `axesOnSvg`, `plotLineSvg`, `barsOnSvg`, `calloutSvg`, `plotHit`, `plotPanelSvg` (SimPlotSvg; static charts stay in SimChart) | maths/SvgPlotShowcaseScene, science/SvgPlotPhysicsShowcaseScene |
| limbs, a muscle, a dragged IK target, a lever, a crank and piston | `limbSvg`, `muscleSvg`, `liveLimb`, `liveMuscle`, `trackPoint`, `leverSvg` / `liveLever`, `crankSvg` / `liveCrank` (SimRigSvg; ik2 etc. re-exported) | maths/SvgRigShowcaseScene, science/SvgRigBiologyShowcaseScene |
| timing curves, springs, stagger, pop | `ease`, `spring`, `lagged`, `laggedP`, `pop`, `burst`, `keys`, `dur` (SimAnim) | SimAnimShowcaseScene (canvas) |

SimAnim and SimTour never draw: use them directly on the withClock clock, no SVG twin.
SimStage gotchas: call `shadowTone(this.root)` in `paint()` so shadows get the light or dark opacity; the pictures passed to `stageBridgeSvg` are cloned, so they must not contain `id` attributes.

Under `reducedMotion()` every recipe shows its end state; `dur()` gives 0. Name the recipe you used on the `Kit use:` line.

## Commands for this kind of scene
- Operate: `node tools/sim-test/drive-dom.mjs L0N/<Scene> --bundle <Bundle> --inputs` lists the dials; then `--steps=@file.json` (write the steps to a file; nested quotes break inline JSON). Example file: `[{"beat":0},{"ctrl":["shape","obtuse"]},{"until":"idle"},{"expect":"O is outside"},{"click":"button:has-text(\"Run\")"},{"set":["#speed","2"]}]`. One key per step; `{"ctrl":[id,value]}` sets a dial by its control id, `{"set":[selector,value]}` an input by selector. A pointer drag has no step: dispatch pointer events in a `probe`.
- A drag has no step type: dispatch pointer events in a `probe` (the scene is `sc`). This one drags a vertex to a point on the circle; `FROM` and `TO` are stage px `{x, y}` that your scene can compute (here the vertex from its own figure, the target from the circle). Tested on a real SvgScene:
  `{"probe": "(() => { const w = sc.sv.wrap, r = w.querySelector('.sv-main').getBoundingClientRect(); const px = (p) => ({ x: r.left + p.x / sc.sv.W * r.width, y: r.top + p.y / sc.sv.H * r.height }); const ev = (t, p) => w.dispatchEvent(new PointerEvent(t, { clientX: px(p).x, clientY: px(p).y, bubbles: true, pointerId: 1 })); const FROM = {x: 0, y: 0}, TO = {x: 0, y: 0}; ev('pointerdown', FROM); ev('pointermove', TO); ev('pointerup', TO); return 'dragged'; })()"}`
  Replace `FROM` and `TO` with your scene's own stage positions (for a vertex on a circle, `TO = { x: c.x + c.r * Math.cos(a), y: c.y + c.r * Math.sin(a) }` with `a` in radians). Then `{"expect": "<what the reading must now say>"}`. A test that only checks the reading for each dial value passes a reading the scene merely asserts; the drag is what proves it is measured.
- Do not use `drive.mjs` for this scene (a DOM scene has no frame loop; check-scene reports freeze/resume as SKIPPED: expected).
- Layout: `node tools/sim-test/sim-layout.mjs courses/<Bundle>/simulations/L0N/<Scene>.js`.
- Look: `shoot` with `{"set": [selector, value]}` / `{"click": selector}` steps.

## SvgScene manual and API (from kit-api, copied in)
```text

SimSvg - the SVG-in-DOM surface for data shapes (number lines, charts,
geometry, chance). An SVG whose viewBox is its host's width in design px, so
text is never scaled down and portrait gets its own layout (the scene reads
stage.W and lays out for it). Chips and maths are HTML on an overlay (real
text, readable by screen readers); shapes and tick numbers are SVG.

  const st = svgStage(hostEl, { height: 400, portraitHeight: 520 });
  st.W, st.H, st.portrait               the current design size
  st.render(svgMarkup, overlayHtml, backMarkup)   replace the drawing (back: a clipped decoration layer)
  st.point(evt) -> { x, y }             a pointer event in stage coords (for drags)
  st.onResize(fn)                       fn() when the width or orientation changes (re-lay out, re-render)
  st.destroy()
  chip(text | html, x, y, { tone, align, cls, math, size }) -> overlay HTML   a pill chip centred on (x, y)
  cardHtml(x, y, w, title, rows, { tone }) -> overlay HTML   a reading card (rows [{ label, value, tone }])
  SIM_SVG_CSS                           the shared look: chips, cushions, draw/grow/pop animations
  SvgScene                              DomSimulation base with one stage (see its doc)
  backdropSvg(st, { seed, floorY })     soft depth blobs and a floor band
Markup helpers: tone(n) -> 'var(--sim-series-n)', fill(col), stroke(col, w), shade(col),
glossOf(col), cushionRect, cushionCircle (style= fills: attributes cannot take var()). Colours are CSS
tokens only; call applyToneInks (SimLookDom) on the host for chip inks (svgStage does).
```
```text
# simulations/base/kit/SimSvg.js
  mountEl(parent, cls, tag = 'div')  - Append a <tag class=cls> to parent (skeletons built with createElement work in every host, even one with no HTML parser).
  tone(n)
  inkVar(n)
  SIM_SVG_CSS
  chip(text, x, y, o = {})  - A pill chip on the overlay, centred on (x, y) in stage px (static: in the flow, e.g. the title row).
  svgStage(host, o = {})  - Mount an SVG stage in host (see the header). @opts height, portraitHeight, label
  cardHtml(x, y, w, title, rows, o = {})  - A reading card on the overlay at (x, y), w wide: a title chip, then label / value rows.
  fill(col, extra = '')  - style="fill:..." (SVG fill attributes cannot take var() or color-mix; style can).
  stroke(col, w, extra = '')
  shade(col, k = 62)
  glossOf(col, k = 45)
  cushionRect(x, y, w, h, r, col, o = {})  - Cushioned rounded rect: a darker lift under a fill, and a gloss strip. @opts lift, gloss, cls
  cushionCircle(x, y, r, col, o = {})  - Cushioned circle. @opts lift, gloss
  backdropSvg(st, o = {})  - The floor band behind a stage: a paper tint, a soft contact shade, faint seams, a lit lip. SvgScene paints it. @opts floorY
  class SvgScene extends DomSimulation
    .static WIDTH = 680
    .static HEIGHT = 520
    .static PORTRAIT_WIDTH = 380
    .static PORTRAIT_HEIGHT = 720
    .static LAYOUT = 'fit'
    .refreshTheme()
    .setup()
    .stageHeight(st)
    .onBeatChange(beat)
    .repaint()
    .after(seconds, fn)
    .celebrate()
    .destroy()

# simulations/base/kit/SimText.js
  tx(v)  - A learner-facing string: plain, or the content's { en: ... } form.
  fmtNum(n, o = {})  - Grouped digits: Indian (2,2,3 from the right) or international (3s). dp: decimals kept.
  fmtIndianWords(n, o = {})  - Words the way Indian textbooks and news say big numbers: crore, lakh, thousand.
  fmtINR(n, o = {})  - Rupees: '\u20b930,000', or with words: '\u20b94.5 lakh'.
  fmtYear(y, o = {})  - A year: negative = BCE. ce: 'auto' adds CE below 1000, true always, false never.
  fmtSpan(a, b)  - Years from a to b (years as signed numbers; there is no year 0).
  fracHtml(n, d)
  supHtml(b, e)
  subHtml(b, s)
  overbarHtml(pre, rep)
  rootHtml(x)
  measureMath(ctx, c, parts, o = {})  - Size of a math run (see drawMath).
  drawMath(ctx, c, parts, x, y, o = {})  - Inline maths on canvas, baseline at y. align: 'left' | 'center' | 'right' on x. [opts: size, weight, col, align, display]
  drawMathPill(ctx, c, parts, x, y, o = {})  - A chip holding maths (a fraction reads as a fraction), centred on (x, y), in the pill() look: lift, flat fill, readable ink.
  wrapMath(ctx, c, parts, maxW, o = {})  - Break a run of parts into lines no wider than maxW. Words break at spaces; array parts (frac, sup, ...) never split.
  drawMathWrapped(ctx, c, parts, x, y, maxW, o = {})  - Wrapped maths drawn from the top of the block at y. Returns { lines, w, h }.
  drawMathCaption(ctx, c, parts, x, y, o = {})  - A caption strip holding wrapped maths, centred on x, top edge at y. o: size, maxW, padX, padY, bg, ink, edge, maxLines.

# simulations/base/SimUi.js
  SIM_UI_CSS  - SimUi - the shared component layer for DomSimulation scenes. DomSimulation injects SIM_UI_CSS once per scene, BEFORE the scene's own CSS,...
  simTag(text, { accent = false } = {})  - Markup helpers for the recurring pieces. Each returns an HTML string that uses the sim-* classes above, with text escaped.
  simTags(list, opts)
  simField(label, value)  - A labelled row; value === null renders the dashed "?" unknown state.
  simArrow(down = false)
  simRecord(steps, current, label = 'Record')  - Progress strip; `steps` are labels, `current` the index marked aria-current.
  esc(value)  - Escape text for an innerHTML template. Scene data is trusted, but a stray ampersand or angle bracket in a label still breaks the markup.
  CSS classes in SIM_UI_CSS (39): .sim-dom-root .sim-dom-root--portrait .sim-ui .sim-stack .sim-stack--tight .sim-row .sim-grid-2 .sim-grid-3 .sim-card .sim-card--accent .sim-card--dashed .sim-card--muted .sim-title .sim-tag .sim-tag--accent .sim-field .sim-field--missing .sim-q .sim-arrow .sim-arrow--down .sim-meta .sim-record .sim-icon .sim-frame .sim-scroll .sim-frac .sim-sup .sim-sub .sim-overbar .sim-root .sim-bars .sim-pick-item .sim-pick-target .sim-pick--picked .sim-pick--dragging .sim-pick--armed .sim-pick--over .sim-pick--no .sim-pick-live
  CSS custom properties it declares (18): --sim-space-1 --sim-space-2 --sim-space-3 --sim-space-4 --sim-space-5 --sim-radius-sm --sim-radius-md --sim-radius-lg --sim-radius-pill --sim-text-sm --sim-text-md --sim-text-lg --sim-text-xl --sim-text-2xl --sim-border-width --sim-border --sim-lift --sim-card-pad

# simulations/base/kit/SimLookDom.js
  SIM_LOOK_DOM_CSS
  noteLineHtml(rows)  - The default note (what the model leaves out): one muted line in the document flow, never covering the scene. rows: [{ text }];
  noteCardHtml(rows, title = '')  - The note-card overlay (what the model leaves out). rows: [{ icon?: svg markup written by the scene author, text, sub? }];
  burst(host, n = 28, at = null)  - One find inside `host`: small ring and pop at `at` (element or { x, y } viewport px), a [data-sim-found] element, or host's centre; then the cue to the look. Only at a find, never on Run. See SimFind.js
  applyToneInks(el)  - Text on a coloured fill must flip ink by tone AND theme (amber wants dark ink in the light theme, violet light ink).

# simulations/base/kit/SimPick.js
  simPick(root, o = {})  - SimPick - pick-and-place for DOM boards: pointer drag, tap-then-tap, and keyboard (Tab to an item, Enter/Space picks, arrows move between... [opts: items, targets, onDrop, canDrop, onPick, onCancel, announce, itemId, targetId, track, countText]

# simulations/base/kit/fitToContent.js
  fitToContent(scene)  - Measure-not-guess, per beat: sizes a DomSimulation's design rectangle to the content that is visible right now, so a short beat is not pa...
```

## Design note, `Kit use:` line
`Kit use: SvgScene use - <why>; <Component module> use - <why>`.

=== FILE: briefs/stage3/geom.md ===
# Stage 3 guide: geometry (Component: Geom)

SVG geometry: points, circles, segments, angle arcs, right-angle squares, a dragged point constrained to a circle or a segment, an area model. Read `svg.md` first.

## Start from
- `examples/simulations/maths/GeomShowcaseScene.js` (SvgScene + `geomFigure` + `geomSvg` + `geomHandles`): copy it.
- Area model / algebra tiles: `areaGridSvg` (SVG) in the same module; the canvas twin `maths/AreaTilesShowcaseScene.js` is a canvas scene, not for an SvgScene.

## Rules
- Build the figure in stage px with `place`; points are `{ id, x, y, label }` or `{ id, onCircle, angleDeg }`. Degrees: 0 = east, clockwise on screen.
- A perpendicular bisector, a diameter or any extended line is a `segments` entry with `extend: 'both'`; right-angle squares are `rightAngles: [{ at, from, to }]`. Do not hand-draw them.
- Pass `points: [ids]` to `geomSvg` to choose which points draw dots and letters (midpoints and helper ends stay invisible); do not also draw the letters yourself.
- The reading a chip shows must be measured from the drawn figure (`angleAt`, `dist`), never asserted.
- Where a point is when a figure is built from angles: derive the true case (acute, right, obtuse) with a 5-line `node -e`, not by hand.

## Geometry manual and API (from kit-api, copied in)
```text

SimGeom - geometry figures as SVG in the DOM (SimSvg stage), in the
vocabulary of the engine's GeometryDiagram (`diagram` JSON), so authors
learn one language. Adds what a static figure cannot: drag a point
(constrained to a circle or a segment), live angle/length readings, area
models. Build the figure in stage px (`place` maps figure units onto the
stage), so lines and labels keep their size in portrait.

  const fig = geomFigure({ points: [{ id, x, y, label } | { id, onCircle, angleDeg }], circles: [{ id, center, radius | through }],
                           place: { x, y, s } });     // stage = place + s * figure units
  fig.pt('A') -> { x, y }    fig.circle('c1') -> { x, y, r }    fig.set('D', { x, y })
  geomSvg(fig, { segments, polygons, angles, rightAngles, parallelMarks, circles, points, labels }) -> { svg, over }
    segments: [{ from, to, extend: 'none'|'start'|'end'|'both', style: 'dashed', ticks: 0..3, label, tone }]
    polygons: [{ points: [ids], fill: 'primary'|'success'|'error'|'muted' | tone }]
    angles:   [{ at, from, to, label, tone, radius }]   arcs stack outward at a shared vertex
    rightAngles: [{ at, from, to }], parallelMarks: [{ from, to, count }]
    circles:  [{ id | center, radius | through, startDeg, endDeg, fill, style, tone }]
  const h = geomHandles(fig, ['D'], { constrain: { D: 'c1' | ['A', 'B'] }, snapDeg, min, max });
  h.hit(p) -> id | null   h.move(id, p)          (from SvgScene pointerDown / pointerMove)
  angleAt(fig, at, from, to) -> degrees (0..180)    dist(fig, a, b) -> px
  areaGridSvg(rect, { cols: [a, b], rows: [a, b], labels: [[...], [...]], tones }) -> { svg, over }   area model
  GEOM_CSS                                          overlay CSS (area-model labels)
Degrees: 0 = east, clockwise on screen (y down), as in GeometryDiagram.
Point labels sit outward from the figure's centre, never on a line.
```
```text
# simulations/base/kit/SimGeom.js
  geomFigure
  angleAt
  dist
  geomHandles
  areaModel
  geomSvg(fig, o = {})  - The figure as SVG + overlay chips (see the header). @opts segments, polygons, angles, rightAngles, parallelMarks, circles, points, labels
  areaGridSvg(rect, o = {})  - Area model: rect split by cols/rows lengths; labels[r][c] = text or ['sup', 'a', 2] etc. @opts cols, rows, labels, tones
  GEOM_CSS  - Overlay CSS (area-model labels). Add it to the scene CSS.

# simulations/base/kit/SimGeomSpec.js
  geomFigure(o = {})  - Build a figure; points may be an array or a map id -> [x, y] | { onCircle, angleDeg }. @opts points, circles, place
  angleAt(fig, at, from, to)  - Interior angle at `at` between rays to `from` and `to`, in degrees.
  dist(fig, a, b)
  geomHandles(fig, ids, o = {})  - Drag handles. constrain: { id: circleId | [a, b] }; snapDeg, min/max limit a circle angle. @opts constrain, snapDeg, min, max, r
  areaModel(o = {})  - Area model as DATA: a rectangle split by column and row lengths.
```

## Design note, `Kit use:` line
`Kit use: SvgScene use - <why>; SimGeom use - geomFigure + geomSvg + geomHandles ...`. Do not list canvas parts (`SimGeomCanvas`, `SimScene`) for an SVG scene.

=== SECTION: briefs/stage3/chart.md :: "Rules" ===
## Rules
- The frame is a spec (`chartFrame`: plot rect, scales, nice ticks); `axesSvg`, `barsSvg`, `traceSvg` draw it. Never hand-draw axes.
- Any value printed on the chart comes from the data the chart draws, not a second copy.

=== SECTION: briefs/stage3/table.md :: "Rules" ===
## Rules
- Build the spec for the stage size on every paint (`tableSpec({ rect, rows, cols, cells, ... })` in stage px). Text is never scaled down; a narrow stage gets a narrower header column, not smaller type.
- Margins come from `totals: true | 'rows' | 'cols'`: summed by the spec. Never type a total, a share or a hidden cell's answer; read them with `T.value(r, c)`.
- Mark what the beat is about and nothing else: `hi` for the cells in the sum, `band` for the row or column being read, `dim: true` to fade the rest. Under plain the beat's cells take `--sim-annot` or series 1..5, the rest grey.
- Predict: `hidden` cells show '?'; put the learner's pick in `guess`; on a right pick drop it from `hidden`, pass the key in `fresh` (it pops) and call `celebrate()` once. A wrong pick stays, dashed, with the rule in the head chip.
- Taps: `pointerDown(p)` -> `T.cellAt(p)` -> `{ r, c, kind }`. Also give a keyboard path: a choice group in the head row (`flowChoiceHtml` + `bindFlow`, SimFlowDom), `CONTROLS = []`.
- Label sample data as illustrative (a note under the table or `caption`). Units and the denominator in the head chip ('54 of 80 passed = 68%').

=== SECTION: docs/dom-scene-kit.md :: "5. Checks" "6. Do not" ===
## 5. Checks (run both before you call a scene done)

```
node tools/sim-test/sim-lint.mjs   courses/<bundle>/simulations
node tools/sim-test/sim-layout.mjs courses/<bundle>/simulations
```

`sim-lint` (static, instant): syntax, hex colours, style-before-innerHTML, `1fr` without `minmax(0, 1fr)`, font under 14px, `left`/`top` px, unknown `--sim-*` tokens, missing `ARIA_LABEL`, HTML5 drag events (`html5-dnd`), a multi-column board with no portrait design (`no-portrait`). Silence one kind with `// sim-lint-ignore <kind>: reason`.

`sim-layout` (Chromium via Playwright): per beat, landscape and portrait: style mounted, nothing clipped (including the 3px shadow), content pushing past its column, tallest beat vs declared `HEIGHT`, smallest text. A `clipped ... by Npx` error means raise that `HEIGHT`/`PORTRAIT_HEIGHT` by about N (content inside an `overflow-y:auto` region may run past the frame; only sideways is checked there). `--json out.json` keeps the per-beat numbers. A scene with buttons/selects (a board, a challenge) must be sized for its tallest state, not its first: `--interact N` clicks N random controls after each beat and keeps the tallest (default 30 for KeyBuilder/SlotBoard scenes).

Both exit non-zero on errors; warnings fail only with `--strict`.

## 6. Do not

- Break what `sim-lint` lists in section 5 (`left`/`top` px are fine only for a label pinned over a `<canvas>`; for drag use `simPick`).
- Copy-paste another scene's card/tag CSS: use the classes.
- Guess `HEIGHT`: run `sim-layout` and use its numbers (or set `static FIT = true`). Hand-write the beat clamp: declare `BEAT_STEP_MAP` and use `onStep`.
- Fix a tall board's clipping by raising `HEIGHT` past its idle height for the side-panel budget: the host sizes the side panel from the declared aspect, so a taller `HEIGHT` means a narrower panel and smaller text. Set `static MIN_SCALE` instead (side panel only when it can be that large, else full width below the text; SlotBoardScene uses 1.25). Or keep a fixed frame and let the growing part scroll inside it (KeyBuilderScene, SlotBoardScene), so the worst case never sets the height. `static FILL_HEIGHT = true` (opt-in) lets that frame grow past `HEIGHT` in a side panel when the viewport is taller: `HEIGHT` is then only the minimum, width and scale are unchanged, and hosts that give no height budget keep the plain frame. The scene must lay itself out for any height >= `HEIGHT`.
- Let a scene that adds cards per beat grow to its last beat: fold, do not grow. Give the cards a beat introduces the full size and fold earlier ones to one line (thumbnail, name, one detail); fold everything on a closing beat that needs room for something new. Keep every beat under the side-panel budget (about 690x577 px at 1280x720, so ~680x520 design), measure height per beat (`FIT` or `sim-layout`), and set `MIN_SCALE` near 1 so the scene sits beside the text. Fold context (earlier beats); scroll the learner's own work (a growing key, see KeyBuilderScene).

=== SECTION: briefs/reference/probe-cookbook.md :: "Minimal probe template" ===
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

=== BUNDLE INFO ===
bundle stage3-build-svg, sha256 5aeb2e2f3c2b2917. GENERATED by tools/staged-generation/build-bundles.mjs from:
- START-HERE.md (11478 chars)
- briefs/reference/scene-rules.md (11569 chars)
- briefs/reference/gotchas.md (2858 chars)
- docs/look-base.md (1699 chars)
- packs/look/quill/CARD.md (1556 chars)
- briefs/stage3-build.md (13423 chars)
- briefs/stage3/INDEX.md (2874 chars)
- briefs/reference/kit-parts.md (19381 chars)
- briefs/showcase/EXAMPLE-stub.md (3245 chars)
- briefs/showcase/EXAMPLE-design-note.md (5876 chars)
- briefs/stage3/svg.md (17202 chars)
- briefs/stage3/geom.md (4435 chars)
- briefs/stage3/chart.md :: "Rules" (231 chars)
- briefs/stage3/table.md :: "Rules" (1163 chars)
- docs/dom-scene-kit.md :: "5. Checks" "6. Do not" (3000 chars)
- briefs/reference/probe-cookbook.md :: "Minimal probe template" (1572 chars)
Do not edit: change the sources and rebuild. Everything above is the full text of those sources; do not open them again.
