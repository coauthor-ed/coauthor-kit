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

=== FILE: briefs/stage3/canvas.md ===
# Stage 3 guide: canvas scene (SimScene)

For `Base class: SimScene` (or `CanvasSimulation`): a 2D canvas scene with a hero, beats, dials and a celebration.

## Read
- `node tools/doc-section.mjs docs/simulation-authoring.md "3.4 Coming" "4.5 House" "4.6 The look kit"`

## Start from
- Copy `examples/simulations/SceneSkeleton.js` (a complete 3-beat scene: every hook, a slider, a button, a drag, the note, one celebration; its header says what each part is). Do not read `SimScene.js`.
- Look and parts: `examples/simulations/LookKitShowcaseScene.js` (grep it for a technique, do not read it whole), `examples/simulations/ShapeKitCanvasShowcaseScene.js` (number line and chart on canvas), `examples/simulations/maths/ArcAngleShowcaseScene.js` (geometry on canvas).

## Rules
- Extend `SimScene`: fill `enter/update/draw/busy`, `pointerDown/Move/Up(p)` (design-space `p`), `noteRows` with `static NOTE_STAGE = 0` (the note becomes one muted line along the bottom on every beat; never the modal card, which dims the scene: `NOTE_STYLE = 'card'` only for a stage the learner does not touch).
- Skeleton facts: 680x520, `CONTINUOUS = false`, dt clamped, stage fade, `celebrate()`, `after()`.
- `onBeatChange` is owned by SimScene: do not define it. One stage per beat in `BEAT_STEP_MAP`, read in `enter(stage)`.
- Colours from `c.<key>` (`loadColors`) and `mix/alpha/lighten/darken` of them; never a hex, never a new `--sim-*` token.
- Labels only; chips via `chipRow`, beside the evidence, never on it.
- A DOM overlay is not needed: text goes through `wrapText/fitText/captionBar`, labels through `placeLabels`.

## Motion recipes (canvas)
Before hand-rolling a tween, a spring, a stagger or a camera move, take the row. You own the clock (scene age); pass progress 0..1; `busy()` is true until the motion lands; `dur()` is 0 under `reducedMotion()`. Each module has a showcase in `examples/simulations/`.

| The beat needs | Call (module in simulations/base/kit/) | Example |
|---|---|---|
| timing curves, springs, stagger, a pop-in, a cue sheet | `ease`, `spring`, `springTrack`, `lagged`, `laggedP`, `pop`, `burst`, `keys`, `cues` (SimAnim) | SimAnimShowcaseScene |
| a shape becomes another, a number counts or rolls, an expression becomes another, a keyword pops | `morphPair` + `drawMorph`, `countUp`, `odometer`, `transformTerms`, `drawKeyword`, `highlighterSweep` (SimMorph; term lists from `setTerms` / `rosterTerms` / `builderTerms` in SimMorphSpec) | SimMorphShowcaseScene |
| show one part, dim the rest, pulse, flash THE answer, numbered badges | `focusTone`, `indicate`, `flashAt`, `outlineSweep`, `dimOutside`, `numberBadge`, `legendChips` (SimFocus) | SimFocusShowcaseScene |
| a line or ring draws itself, text is written on | `drawOn`, `writeOn`, `withReveal` (SimDrawOn) | SimDrawOnShowcaseScene |
| zoom or pan into a part, parallax layers | `withCamera`, `pushTo`, `cameraAt`, `layer` (SimCamera; SVG twin: `cameraG` (SimCameraSvg)) | SimCameraShowcaseScene |
| axes that build, a line that plots, bars that grow, a data callout | `plotFrame`, `axesOn`, `plotLine`, `barsOn`, `drawCallout` (SimPlot; SVG twin: `axesOnSvg`, `plotLineSvg` (SimPlotSvg)) | SimPlotShowcaseScene |
| isometric blocks, an exploded view | `camera`, `solidOf`, `drawSolid`, `explode` (SimIso; SVG twin: `isoSvg` (SimIsoSvg)) | SimIsoShowcaseScene |
| picture A becomes picture B (window grow bridge); a soft contact shadow | `stageBridge`, `contactShadow` (SimStage; SVG twin: `stageBridgeSvg` (SimStageSvg)) | SimStageShowcaseScene |
| limbs, two-bone reach, crank, lever | `ik2`, `limb`, `muscle`, `crankSlider`, `lever` (SimRig; SVG twin: `limbSvg`, `leverSvg` (SimRigSvg)) | SimRigShowcaseScene |
| the scene demonstrates itself when idle, one model drives picture and readout | `tour` (SimTour) | SimTourShowcaseScene |
| Chips of terms that light parts of the figure | `tapLightControl` in CONTROLS + `tapLight` (TapLight), `CONTROLS_IN_SIGHT = true` | TapLightCanvasShowcaseScene |
| Venn rings, regions, shading sweep | `vennSpec`, `vennCanvas`, `regionSweepCanvas` (SimVennCanvas) | VennCanvasShowcaseScene |

Name the recipe you used on the `Kit use:` line.

## Commands for this kind of scene
- Operate headless: `node tools/sim-test/run.mjs exec tools/sim-test/drive.mjs L0N/<Scene> --bundle <Bundle> --recipe smoke` (or `--steps`). It sets dials the way the host does.
- Check: `check-scene` runs the freeze and resume probes for a canvas scene.
- Look: `shoot` takes canvas coordinates for `tap` and `drag`.

## Kit API (from kit-api, copied in)
```text
# simulations/base/kit/SimScene.js
  class SimScene extends CanvasSimulation
    .static WIDTH = W
    .static HEIGHT = H
    .static DRAGGABLE = false
    .static CONTINUOUS = false
    .static HIDPI = true
    .static NOTE_STAGE = -1
    .static NOTE_STYLE = 'line'
    .static NOTE_TITLE = ''
    .static COLOR_MAP = COLOR_TOKEN_MAP
    .setup()
    .destroy()
    .get stage()
    .get age()
    .get clock()
    .onBeatChange(beatIndex, beatCount)
    .after(seconds, fn)
    .isControlHidden()
    .isControlDisabled()
    .getControlValue(id)
    .onControlChange()
    .celebrate(x, y, n = 32)
    .oops(x, y)
    .shake(px = 8)
    .flash(k = 1)
    .floatText(text, x, y, o = {})
    .enter()
    .update()
    .busy()
    .draw()
    .noteRows()
    .pointerDown()
    .pointerMove()
    .pointerUp()

# simulations/base/kit/SimLook.js
  W = 680
  H = 520
  ZONES = { top: { x: 16, y: 12, w: 648, h: 56 }, left: { x: 16, y: 80, w: 170, h: 360 }, hero: { x: 198, y: 80, w: 284, h: 360 }, right: { x: 494, y: 80, w: 170, h: 360 }, bottom: { x: 16, y: 452, w: 648, h: 56 }, heroWide: { x: 16, y: 80, w: 648, h: 360 }, }  - Named rects in the 680x520 design space. top/bottom are chip bands, left/right hold reading cards, hero holds the one big object (42% of ...
  heroBox(w, h, o = {})  - Centre a hero drawn in its own w x h units in ZONES.hero: returns { x, y, w, h, cx, cy, s }.
  SETTLE_MS = 1500  - A CONTINUOUS = false scene keeps its loop open while something that matters is still moving (a run, a scripted sequence, an easing ball),...
  keepAwake(scene, moving)
  COLOR_TOKEN_MAP = { bgDeep, bgSurface, raised, label, labelMuted, stroke, accent, good, bad, warning, shape, track, gold, glass, water, flame, waste, s1, s2, s3, s4, s5, s6, s7, s8, s1ink, s2ink, s3ink, s4ink, s5ink, s6ink, s7ink, s8ink, fontBody, fontDisplay }
  loadColors(container, map = COLOR_TOKEN_MAP)
  parseColor(col)
  mix(c1, c2, t)  - Linear mix of two resolved colours, t = 0 gives c1.
  alpha(col, k)
  lighten(col, t)
  darken(col, t)  - Toward black by t (0..1): the flat two-tone cushion shade.
  luma(col)
  contrast(a, b)  - WCAG contrast ratio of two resolved colours (1..21).
  inkOn(c, bg)
  hslOf(col)  - Hue (degrees), saturation and lightness (0..1) of a resolved colour.
  hsl(h, s, l, a = 1)
  font(c, weight, px, display = false)
  mulberry32(seed)  - Seeded random in [0, 1): the same seed draws the same scene every mount.
  clamp(v, lo, hi)
  clamp01(u)
  lerp(a, b, t)
  outBack(t)
  outElastic(t)  - Springy overshoot that settles: for a hero landing or a badge slam.
  inOutSine(t)
  rr(ctx, x, y, w, h, r)
  stadium(ctx, x, y, w, h)  - Full-stadium path from arcs (chip lifts and gloss: shapes, not containers).
  ellipse(ctx, x, y, rx, ry, rot = 0)
  blob(ctx, x, y, rx, ry, n, wob, phase)
  sparkle(ctx, x, y, r, col)  - Four-point twinkle, filled.
  star(ctx, x, y, r, n = 5, inner = 0.5, rot = -Math.PI / 2)  - Rounded n-point star path (fill it yourself).
  MIN_PX = 14  - Smallest type size any kit helper draws (px). Smaller requests are raised to this.
  chipSize(ctx, c, text, size = 15, display = false)  - Unscaled chip size for text at font size `size` (the box pill() draws).
  pill(ctx, c, text, x, y, o = {})
  popAt(age, at)
  chipRow(ctx, c, items, x, y, o = {})
  chipColumn(ctx, c, items, x, y, o = {})  - Chips stacked top to bottom, chained by measured height.
  leader(ctx, x1, y1, x2, y2, col, a = 1, t = 0, o = {})
  vectorArrow(ctx, c, x, y, o = {})
  wrapLines(ctx, text, maxW, o = {})
  wrapText(ctx, text, x, y, maxW, o = {})  - Draw wrapped text with the ctx's CURRENT font and fillStyle; (x, y) is the top-left of the block for every align.
  fitText(ctx, c, text, x, y, maxW, maxH, o = {})
  captionBar(ctx, c, text, x, y, o = {})
  placeLabels(items, o = {})  - Collision-free label placement.
  speechBubble(ctx, c, text, x, y, tx, ty, o = {})
  setFrame(w, h)
  frameOf(ctx)
  drawBackdrop(ctx, c, style = 'dots', o = {})  - Full-canvas backdrop from theme tokens: the deep base plus a faint pattern.
  drawDepth(ctx, c, o = {})
  drawFloor(ctx, c, y, o = {})
  drawSunbeam(ctx, c, x0, x1, bx0, bx1, yTop, yBot, k = 1)  - A sunbeam is literal light, so it earns a soft gradient (house style 4.5).
  drawSpotlight(ctx, c, x, y, r, k = 1)  - A pool of light on the hero (literal light: a lamp on the stage).
  drawVignette(ctx, c, k = 1)  - Light falling off toward the frame edges (literal light).
  drawMotes(ctx, c, t, rect, o = {})
  drawTwinkles(ctx, c, t, rect, o = {})  - Twinkling four-point sparkles scattered in a rect, in the series colours.
  drawShadow(ctx, c, x, y, rx, ry = rx * 0.22, k = 1)  - Flat contact shadow under anything standing (an ellipse, no blur).
  drawShelf(ctx, c, x0, x1, y, o = {})  - A thin shelf with a cushion shade and a highlight strip.
  drawBench(ctx, c, x0, x1, y, o = {})
  drawCard(ctx, c, x, y, w, h, a = 1, o = {})  - Panel card: 5px lift, flat surface fill, and an optional coloured header stripe.
  drawMeter(ctx, c, x, y, w, h, v, o = {})
  drawBadge(ctx, c, kind, x, y, r, col)  - A round state badge: 'check' | 'cross' | 'star' | 'dot', flat fill with a lift.
  drawReadout(ctx, c, x, y, w, rows, o = {})
  drawFace(ctx, x, y, r, o = {})
  drawNoteCard(ctx, c, o)  - A centred note card (what the model leaves out).
  drawNoteLine(ctx, c, o)
  class Burst  - Celebration effects on one list: shockwave rings and gravity-free twin...
    .get alive()
    .fire(x, y, colors, n = 24, spread = 1)
    .ring(x, y, col, r = 90, max = 0.55, lw = 6)
    .twinkle(x, y, colors, n = 8, r = 60)
    .update(dt)
    .draw(ctx)

# simulations/base/kit/SimDrag.js
  dragHandle(o)  - SimDrag - the grab-and-drag plumbing every draggable canvas scene re-writes: a generous hit radius, a grab offset (the handle does not ju...

# simulations/base/SimDrawUtils.js
  SimDraw = { MIN_PX, clamp, clamp01, lerp, mix, inkOn, rr, mulberry32, _spriteCache, shade, withAlpha, getSprite, drawGlow, drawPanel, drawLabel, drawArrow, drawMembrane, drawTrail, drawMolecule, drawPulse }
```

Also for canvas scenes: `simulations/base/kit/SimLookDom.js` (note line, burst: the find on a DOM overlay), `simulations/base/kit/SimIcons.js` (icons), `simulations/base/kit/SimText.js` (numbers, Indian grouping, maths in a caption), `simulations/base/kit/SimPredict.js` (predict gate). People: `people.md`. Apparatus: `props.md`. Canvas renderers of the maths shapes: `SimNumberLineCanvas.js`, `SimChartCanvas.js`, `SimGeomCanvas.js`, `SimTimelineCanvas.js`, `SimChanceTrials.js`: `node tools/sim-test/kit-api.mjs simulations/base/kit/<Module>.js`.

## Design note, `Kit use:` line
`Kit use: SimScene use - <why>; SimLook use - <why>` plus any part from `briefs/reference/kit-parts.md` you drew with. `none fits (looked at: kit-parts.md)` is a valid answer.

=== SECTION: docs/simulation-authoring.md :: "3.4 Coming" "4.5 House" "4.6 The look kit" ===
### 3.4 Coming to rest: `static CONTINUOUS = false` is the default; every scene must live by it

Rich profile (`docs/visual-profiles.md`): ambient `CONTINUOUS = true` is allowed without a reason.

**Policy: `static CONTINUOUS = false` is the default for every base class** (`CanvasSimulation`, `WebGLSimulation`, `DomSimulation`): the frame loop parks once nothing is animating (battery and CPU on low-end devices, HLD #18). Set `static CONTINUOUS = true` only when the motion IS the content and never ends - a pulse that runs forever once revealed, orbiting electrons, a jiggling particle crowd, a final beat that loops - and give the reason in a one-line comment (`examples/simulations/HarappanRegionMapScene.js`, `WaterMoleculeScene.js`). `ParticleSimulation` and `PhysicsSimulation` declare `true` themselves (never-settling motion). An older scene that assumed an always-running loop must declare `true` or follow the rules below (`node tools/sim-test/audit-continuous.mjs <dir>` classifies which).

**How a `false` scene stays alive.** The loop runs while an animation budget is unexpired and parks when it runs out. `onBeatChange` and `onControlChange` each grant `DEFAULT_TRANSITION_MS` (8 s) automatically - but only if the scene defines them. So:
- **Implement `onBeatChange(i, count)`** (called right after `setup()` and on every beat change) for beat-driven state; without it a `false` canvas scene draws one frame and parks for good. (`SimScene` owns it already: use `enter(stage)`.)
- **Call `this.animateFor(ms)` yourself for anything the hooks don't cover:** pointer/drag handlers (pointer events grant nothing), your own timers and dwell chains, and any run, easing or scripted sequence longer than 8 s (pass its real duration). A run that outlives the budget freezes mid-way with no error - the classic bug here.
- **Every run and motion must end** (a time limit, a settled threshold, an exited flag); a ball bouncing forever or pieces drifting off-canvas keep the budget alive or freeze at a random moment. Idle decoration (a bobbing hint chip) may freeze.
- If you gate a timer on `dt >= 0`, clamp it first: `const d = Math.max(0, Math.min(dt, 0.05))` - the first frame can pass a negative `dt`.
- **Never name your own fields or methods after the base classes' internals** - it breaks parking/starting silently, and it has bitten new scenes repeatedly. Reserved: `_running _rafId _lastTs _hasStarted _animateUntil _dwellTimerId _visibilityHandler _intersectionObserver _themeHandler _canvas _ctx _loop _onVisibilityChange animateFor start stop step pause resume startDwellTimer clearDwellTimer`; also `_tick` unless the scene extends `CanvasSimulation` directly. Use `_autoRun`, `_walkStarted`, `_spin()` and the like.

**A `DomSimulation` using CSS transitions (#3.3) usually has no rAF loop at all**; if it defines its own `_tick`, the same rules apply. `tools/sim-test` checks the contract (a state change must wake the loop; a `false` scene must park); a scene that parks too early is a visible bug with no error signal.

## 4.5 House style: flat vector, not rendered 3D

This is the `lite` profile. A `rich` course or scene relaxes 3.4, 4.5 and parts of 4.7: `docs/visual-profiles.md`.

The whole corpus should look like one hand drew it. Five rules.

**Flat fills by default.** One solid colour per shape. No `createRadialGradient` or `createLinearGradient` on a surface fill. These read as flat vector objects, not lit 3D forms.

**Two-tone shading is the only substitute for a gradient.** For a shadow side, take one darker version of the same hue with a hard edge, never a blend. Use `SimDraw.shade(color, amt)` so it works off the resolved token and stays right in both themes.

**Gradients, glow and `shadowBlur` are earned.** Reserve them for something that literally is light or energy: a glowing membrane, a spark, sunlight falling off. If you cannot name the physical light source, it is decoration - make it flat. `tools/sim-test/flatness.mjs` counts gradients and `shadowBlur` against draw calls and will tell you.

**Shape vocabulary is small on purpose.** Circle, ellipse, stadium, rounded rectangle, low-control-point blob. A figurative character built from these is in scope (that is what Quill is). Representational realism is not - see the note above `## 0`.

**Stay on the scales.**

| | Use |
| --- | --- |
| corner radius | 6-8 px small, 9-11 px medium, or a full stadium |
| line width | at most 4 distinct values in one scene |
| font | `var(--sim-font)`, `var(--sim-font-display)` for a display number - never a hardcoded stack |
| colour | a `--sim-*` token, never a hex at the draw call |

`flatness.mjs` flags all four (advisory, not a gate).

**Colour tokens, in preference order.** A generic role (`--sim-shape`, `--sim-label`, `--sim-track`, `--sim-membrane` ...); for N things told apart `--sim-series-1` through `--sim-series-8` explicitly. Never `--sim-<scene>-<thing>`: `sim-theme.css` is closed, an undeclared token paints its fallback hex in both themes. The engine rescues invented names by last word (`--sim-boat-fill` -> `--sim-shape`), but that is many-to-one (`--sim-red-box` and `--sim-blue-box` come out the same colour): do not rely on it.

## 4.6 The look kit: `SimScene` + `SimLook` for canvas scenes

A canvas scene extends `SimScene` unless it needs a base class's own features (`WebGLSimulation`, `SimGeo` maps). The kit gives the house look (4.5) and a safe skeleton, so a scene is mostly `enter/update/draw` plus its own drawing. Reference: `examples/simulations/LookKitShowcaseScene.js`; target look: `examples/media/look-kit/GOOD-*.png`.

```js
import { SimScene } from 'simulations/base/kit/SimScene.js';
import { ZONES, heroBox, pill, chipRow, popAt, leader, drawBackdrop, drawBench,
  drawReadout, drawFace } from 'simulations/base/kit/SimLook.js';

export class MyScene extends SimScene {
  static BEAT_STEP_MAP = [[{ idx: 0, dwellMs: null }], [{ idx: 1, dwellMs: null }]];
  static ARIA_LABEL = '...';
  enter(stage) { /* reset this stage's state */ }
  update(d) { /* advance by d s; end every run */ }
  busy() { return !!this.run; }        // loop parks 1.5 s after this goes false
  draw(ctx, c, t) { drawBackdrop(ctx, c, 'dots'); /* hero, cards, chips */ }
}
```

**Skeleton (`SimScene`).** 680x520 (`WIDTH/HEIGHT` preset), `CONTINUOUS = false`. Beats pick a stage from `BEAT_STEP_MAP` (clamped); a new stage calls `enter(stage)` and fades in. `dt` is clamped to [0, 0.05]. `this.colors` is loaded for you (`loadColors`); `this.stage/age/clock` are read-only. `celebrate(x, y)` fires confetti. `pointerDown/Move/Up(p)` get design-space `p = {x, y}` and already call `animateFor()`. `_guard(id)` at the top of `onControlChange` ignores hidden/disabled controls. `BEAT_MAPS = { [beatCount]: map }` serves one scene on slides with different beat counts (beat-check reads only `BEAT_STEP_MAP`). The canvas backing store is `devicePixelRatio` (max 2) x the design size (`static HIDPI = true`) with a base transform: draw in design px and never reset the transform. `shoot --dpr 2` shoots crisp.

**Portrait (SimScene).** A canvas keeps one frame (`WIDTH`/`HEIGHT`; no `PORTRAIT_*` for canvas, the host budgets the panel from `WIDTH`/`HEIGHT`). `this.portrait` is true on a portrait screen (the lesson host's viewport orientation, live: a rotation redraws the frame; `config.isPortrait` elsewhere); lay out inside the same frame for a narrow read (stack, transpose a table, bigger type) in `draw()`. Check it with `shoot --portrait` (passes `isPortrait`, host 380 wide). `this.config` is the host config (also `config.isPortrait`).

**`busy()`, not `animateFor`.** Return true while a run, easing or scripted sequence is moving; the base keeps the loop awake and refreshes the control bar when it ends (even a clock predicate like "0.8 s after the verdict").

**`this.after(seconds, fn)`** - a timer on the scene clock, dropped when the stage changes, so nothing from beat 2 lands in beat 3. Returns a cancel function. Never `setTimeout` in a canvas scene. Companion rule: credit a finished run to a token captured at launch (`this.run = { stage: this.stage, amount }`), never to the current stage when it ends.

**Note (what the model leaves out).** `static NOTE_STAGE = 0; noteRows(c)` returns `[{ text }]` (short: the joined text stays under ~70 characters): by default one muted line along the bottom edge (y 498-520), shown from that stage on and never covering the scene, so every beat stays touchable. The modal card (`static NOTE_STYLE = 'card'; NOTE_TITLE = 'NOTE'`; rows may add `icon`, `sub`) dims the whole scene on its one stage: use it only on a stage the learner does not touch, never on the first beat of an interactive scene. Keep bottom-band chips above y 496. The real wording is in the slide prose.

**Layout (`ZONES`).** `top`/`bottom` are chip bands, `left`/`right` hold reading cards (170 wide), `hero` (284x360, centre) holds ONE big object; `heroWide` when there are no side cards. `heroBox(w, h)` centres an object drawn in its own units and returns its scale `s`. Rule: backdrop, one hero at least a third of the width, readings in side cards, chips at the edges, never on the evidence. An empty middle band means the hero is too small.

**Chips.** `pill(ctx, c, text, x, y, { bg, size, align, scale, alpha })` draws one; for two or more `chipRow(ctx, c, items, x, y, { align, gap, wrapAt })` chains them by measured width (items `{ text, bg, age, at }` pop in via `popAt`) and returns the boxes, so a `leader(...)` can start from `box.x0 + box.w / 2`. `chipColumn` stacks vertically.

**Set.** Build the frame in layers: `drawBackdrop(ctx, c, 'dots'|'grid'|'plain', { t })` (the course's setting, night or day by theme: sky by default, or lab, water, field, parchment; on the riso paper 'grid' adds a faint grid and 'plain' lighter corners; on a world 'plain' tones the decoration down; pass t so a rich night sky twinkles), `drawFloor(ctx, c, y)` (its tone follows the setting: ground, sand, parchment; `drawDepth` is now a no-op), then light: `drawSunbeam`, `drawSpotlight` on the hero, `drawMotes` (dust in the light), `drawTwinkles`; `drawShadow` under anything standing; `drawBench`/`drawShelf` to stand things on; `drawVignette` last before chips. Gradients stay reserved for these literal-light helpers. Fill leftover corners with set dressing (a window, a plant with a face), never the middle band.

**Cards and readings.** `drawCard(ctx, c, x, y, w, h, a, { accent })`, `drawReadout(ctx, c, x, y, w, rows, { title, accent })` (rows may carry `meter`, `target`, `badge: 'check'|'cross'|'star'`), `drawMeter`, `drawBadge`. Chips take `icon(ctx, x, y, r)`; `speechBubble(ctx, c, text, x, y, tx, ty)` lets a character say a short verdict.

**Characters.** `drawFace(ctx, x, y, r, { col, c, mood, look, blush, t })` puts big eyes with iris and sparkles, brows and a mouth on any hero (moods `smile happy sad oops think squint`; sad cries, oops sweats, think shows dots). Give the hero a face, and a sidekick if a corner is free. Let things breathe, sway and look at the action while the loop is awake; squash on landing. Shapes: `rr stadium ellipse blob sparkle star`; colour maths `mix alpha lighten darken luma` on resolved tokens only. **Never `alpha(c.bgDeep, k)` as a scrim**: bgDeep is near-black in dark and near-white in light, so the scrim bleaches content in one theme. Pick by `luma(c.bgDeep) < 0.5`, and check both themes.

**People (`SimFigure.js`)** (full rules: `people.md`). Say where hands and feet go; the kit solves bones, bend sides and reach:
```js
const sk = drawFigure(ctx, c, { x, y: FLOOR, height: 1.7 * PX_PER_M, facing: 1, pose: 'stand',
  hands: [grip, grip2] }, { top: c.s1, skin: 2, hairStyle: 'curly', mood: 'effort', t },
  { between: () => drawCrate(ctx) });            // body, then the crate, then the near arm on top
```
Poses: `stand relax point wave cheer reach-up` (`facing: 0` = front view), `push pull carry`, cycles `{ name: 'walk'|'run'|'climb', phase: walkPhase(dist, height, kind) }`, `{ name: 'throw', u }`; overrides `lean crouch tilt toe`; `hip` pins sitting/cycling; `ground(x)` for stairs. `sk.warnings` and `sk.anchors` (hand, foot, head, top, bounds) are data. Moods add `effort`. Skin tones 0-3 are fixed in both themes; `skinFor(i)` varies a group. Hands: a world grip curls the hand round it (a `push` keeps an open palm), the near hand of `point` points, the rest are open mitts. Faces follow the Quill cute recipe (big eyes with a glint, blush, short brows, a small round smile). Every part carries the kit's rim (its own darker tone, about 2 px at 170 px): draw nothing of the person yourself.

**Juice (SimScene).** A find gets `this.celebrate(x, y)` (a small ring and twinkles at the thing found, then the find goes to the host, which reacts; `SimFind.js`; never on Run or a miss; no confetti in a scene) and usually `this.floatText('+1', x, y)`; a miss gets `this.oops(x, y)` (shake and red ring). `shake(px)` and `flash(k)` exist on their own. Stage changes iris in. All of these keep the loop awake until done, then it parks.

**Reserved names** (on top of 3.4's): `_k`, `_guard`, `colors`, `beatCount`, `hostRole`, `stage`, `age`, `clock`, `after`, `celebrate`, `oops`, `shake`, `flash`, `floatText`, and the hooks.

Check: `node tools/sim-test/run.mjs draw <scene> --beats=N`; the kit's own contract: `node tools/sim-test/run.mjs exec tools/sim-test/look-kit-check.mjs`.

### 4.6.1 Canvas glyphs: wait for the font

Marks like check, cross, star and arrows (U+2713, U+2717, U+2605, U+2192) come from a 2 KB symbols face that loads on first use. DOM scenes are fine (the browser repaints when it arrives). Canvas is not: `ctx.fillText` before the face is ready draws tofu boxes and never repaints. If a canvas scene draws any of these, await the face before the first draw:

```js
await document.fonts.load('700 16px Nunito', '\u2713');  // use the weight/size you draw with
```

Do this in the scene's async setup, not per frame. Prefer a DOM label when the glyph is not part of the drawing itself. Do not hand-draw ticks as a workaround.

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
bundle stage3-simulation-canvas, sha256 b82a8298ebfcda0a. GENERATED by tools/staged-generation/build-bundles.mjs from:
- START-HERE.md (11478 chars)
- briefs/reference/scene-rules.md (11569 chars)
- briefs/reference/gotchas.md (2858 chars)
- docs/look-base.md (1699 chars)
- packs/look/quill/CARD.md (1556 chars)
- briefs/stage3-simulation.md (21027 chars)
- briefs/stage3/INDEX.md (2874 chars)
- briefs/reference/kit-parts.md (19381 chars)
- briefs/showcase/EXAMPLE-stub.md (3245 chars)
- briefs/showcase/EXAMPLE-design-note.md (5876 chars)
- briefs/stage3/canvas.md (11387 chars)
- docs/simulation-authoring.md :: "3.4 Coming" "4.5 House" "4.6 The look kit" (14119 chars)
- briefs/reference/probe-cookbook.md (7162 chars)
- briefs/reference/look-rubric.md (5198 chars)
Do not edit: change the sources and rebuild. Everything above is the full text of those sources; do not open them again.
