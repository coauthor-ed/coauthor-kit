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

=== FILE: briefs/stage3/dom.md ===
# Stage 3 guide: DOM scene (DomSimulation)

For `Base class: DomSimulation`: labelled panels, tables, cards, sorting, structure. Not for number lines, charts, geometry or chance (those are `svg.md`), and not for boards the kit already has (`boards.md`).

## Read
- `docs/dom-scene-kit.md` in full.
- `node tools/doc-section.mjs docs/simulation-authoring.md "3.3 DOM"`

## Start from
- `examples/simulations/EvidenceCardsScene.js` (the worked example), `examples/simulations/ShiftSubtractScene.js`, `examples/simulations/HybridCanvasLabelsScene.js` (canvas hero with DOM labels), `examples/simulations/science/ChargeSorterShowcaseScene.js` (sorting with `SimPick`).

## Rules
- Numbers panels (plain): worked rows, stacked fractions, entry with a check, controls that look actionable: `docs/numericals.md` 2 and 4 (SimPanel names, built vs planned).
- Use `render({ html, css })` and the `sim-*` classes and tokens from `SimUi.js`.
- Beats and note: `extends withBeats(DomSimulation)` (`simulations/base/DomBeats.js`; `EvidenceCardsScene.js`). Keep `static BEAT_STEP_MAP` / `BEAT_MAPS` (by beat count) as literals; write `onStep(step, beat, count)` only; the note is `static NOTES = [one line per step]`, not a hand `_syncNote`. A beat chain keeps its own `onBeatChange`. Celebrate with `burst(element)`.
- Controls live in the scene (kit doc, section 1), even if the stub lists controls.
- Never put `SIM_UI_CSS` in the css you pass to `render()`: DomSimulation injects it (adding it makes sim-layout report a false `unstyled`).
- sim-layout names a clipped element by class and by its text (`.text` is an SVG `<text>`); check-scene's browser report adds its position. Run sim-layout again only after editing the scene: an unchanged scene returns its last result without a run.
- Sizes come from `sim-layout`; colours from the kit doc's token table and tint recipe, never scanned from other scenes; `FIT`/`LAYOUT` per the doc.
- Imports: `import { DomSimulation } from 'simulations/base/DomSimulation.js'`, `'simulations/base/ChallengeMode.js'` (`withChallenge`); the kit is at `simulations-kit/src/simulations/base/` (list a module with `kit-api.mjs`).
- `withChallenge(DomSimulation)`: the scene owns the rounds and the deal; `checkObjective()` returns null until the last round, then `{ ok }` or `{ value, target }`; `solved` latches on the first success (docs/mini-games.md "Rounds").
- The quick check has no HTML parser (kit doc, section 1). Drive real markup with `drive-dom`.

## Motion recipes (DomSimulation)
A DOM scene gets the frame clock and the live layer with `class X extends withClock(DomSimulation)` (`withClock` from `simulations/base/kit/SimClock.js`, also re-exported by SimSvg.js; `examples/simulations/ClockDomShowcaseScene.js`). Then `this.play(sec)`, `animate(st, t)`, `this.skip()` and `busy()` work as in an SvgScene. Pick `SvgScene` instead when the hero is a shape stage (it has the clock built in).

| The beat needs | Call (module in simulations/base/kit/) | Example |
|---|---|---|
| a number counts up, an expression becomes another | `countSvg`, `odometerSvg`, `transformTermsSvg` (SimMorphSvg) | maths/SvgMorphShowcaseScene |
| chips fly into bins or rings, staggered | `flyChip`, `flyMany`, `flyTo` (SimFlySvg) | ClockDomShowcaseScene |
| spotlight one panel, dim the rest, flash THE answer | `spotlight`, `flashSvg`, `indicateSvg` (SimFocusSvg) | ClockDomShowcaseScene |
| text written on, a stroke draws itself | `writeOnSvg`, `drawOnPath` (SimDrawOnSvg) | ClockDomShowcaseScene |
| drag items into bins; a bin that is a region, not a rectangle | `simPick` options `targetAt(pt)`, `onOver(id)` | maths/PickRegionShowcaseScene |
| dropped items glide to their place (or home) instead of snapping | `simPick` `settle: 'spring'`; OR `pick.settling` into `busy()` | maths/PickRegionShowcaseScene |
| isometric blocks, an exploded view | `isoSvg`, `isoLive`, `explodeLive` (SimIsoSvg) | maths/SvgIsoShowcaseScene |
| zoom or pan into a part (SVG world g or HTML world box) | `cameraG`, `cameraEl`, `cameraLive` (SimCameraSvg) | maths/SvgCameraShowcaseScene |
| picture A becomes picture B; a soft contact shadow | `stageBridgeSvg`, `contactShadowSvg` (SimStageSvg; call `shadowTone(this.root)` in paint, no `id` in bridge pictures) | maths/SvgStageShowcaseScene |
| axes that build, a line that plots, bars that grow, a callout | `axesOnSvg`, `plotLineSvg`, `barsOnSvg`, `calloutSvg` (SimPlotSvg) | maths/SvgPlotShowcaseScene |
| limbs, a muscle, a lever, a crank and piston | `limbSvg`, `muscleSvg`, `leverSvg`, `crankSvg` (SimRigSvg) | maths/SvgRigShowcaseScene |
| timing curves, springs, stagger | `lagged`, `spring`, `pop`, `dur` (SimAnim) | SimAnimShowcaseScene |

Under `reducedMotion()` every recipe shows its end state. Name the recipe you used on the `Kit use:` line.

## Commands for this kind of scene
- Operate: `node tools/sim-test/drive-dom.mjs L0N/<Scene> --bundle <Bundle> --inputs`, then `--steps=@file.json` (steps in a file). Example: `[{"beat":0},{"ctrl":["shape","obtuse"]},{"until":"idle"},{"expect":"O is outside"},{"click":"button:has-text(\"Run\")"},{"set":["#speed","2"]}]`. One key per step; `{"ctrl":[id,value]}` sets a dial by its control id, `{"set":[selector,value]}` an input by selector.. `drive.mjs` cannot reach a DOM scene's panel.
- Test each item under the stub's `Must get right` (brief step 4) with `expect` / `probe` steps; a reading that must be measured is tested by changing an input and expecting the text to change.
- Layout: `node tools/sim-test/sim-layout.mjs courses/<Bundle>/simulations/L0N/<Scene>.js`.
- Look: `shoot` with `{"set": [selector, value]}` / `{"click": selector}` steps (a DOM scene has no canvas coordinates).

## API (from kit-api, copied in)
```text
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

# simulations/base/DomSimulation.js
  class DomSimulation extends SimulationBase  - DomSimulation - abstract base for DOM/CSS/SVG-rendered simulations.
    .static WIDTH = 900
    .static HEIGHT = 600
    .static PORTRAIT_WIDTH = null
    .static PORTRAIT_HEIGHT = null
    .static PORTRAIT_BREAKPOINT_PX = 600
    .static MIN_SCALE = null
    .static FRAMELESS = false
    .static BEAT_STEP_MAP = null
    .static FIT = false
    .static LAYOUT = null
    .static FILL_HEIGHT = false
    .static FILL_MAX = 1.5
    .refit()
    .relayout()
    .fillFrame()
    .setup()
    .injectStyle(cssText)
    .render({ html, css = '', rootClass = '', ui = true } = {})
    .start()
    .resume()
    .step(dtMs)
    .refreshTheme()
    .destroy()

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

# simulations/base/kit/SimIcons.js (canvas helpers here and in SimText: kit-api)
  ICON_NAMES = Object.keys(ICONS)
  iconSvg(name, tone = 1)  - SVG markup for an icon; tone: 1..8 (series) or a CSS colour. Decorative (aria-hidden).
```

## Design note, `Kit use:` line
`Kit use: DomSimulation use - <why>; SimUi use - <why>; ...` and any board or part from `briefs/reference/kit-parts.md`.

=== FILE: docs/dom-scene-kit.md ===
# DOM scene kit

The shared layer for every `DomSimulation` scene: tokens, component classes, one mount call, and two checks. Use it instead of writing your own card, tag, title, arrow or root CSS. Worked example: `simulations-kit/examples/simulations/EvidenceCardsScene.js`.

## 1. Minimal scene

```js
import { DomSimulation } from 'simulations/base/DomSimulation.js';
import { esc } from 'simulations/base/SimUi.js';

export class MyScene extends DomSimulation {
  static WIDTH = 560;  static HEIGHT = 400;
  static PORTRAIT_WIDTH = 380;  static PORTRAIT_HEIGHT = 700;
  static ARIA_LABEL = 'What the scene shows, in one sentence.';
  static CONTROLS = [];

  async setup() {
    await super.setup();
    this.render({ css: CSS, html: `<div class="sim-grid-2">...</div>` });
  }
}
```

`render({ html, css, rootClass, ui })` does, in the right order: injects the CSS, adds `sim-ui` (padding, background, font, column gap, `[hidden]` reset, reduced motion) and `rootClass` to the root, sets `role="group"` + `aria-label` from `ARIA_LABEL`, then writes `html`. Omit `html` to set the root up and fill it yourself. `ui: false` keeps your own root CSS (use when migrating an old scene).

> Headless check (`tools/sim-test/harness.mjs`): there is no HTML parser. `render({ html })` and
> `innerHTML = ...` mount as ONE opaque child, so `querySelector` cannot see inside it. If the
> scene queries into what it rendered, or `onBeatChange` must visibly mutate the tree under
> `check-scene`, build with `createElement`/`appendChild`. The fake supports `style.setProperty`,
> and `querySelector` matches tag, `.class`, `[attr]` and `#id` only (no descendant/combinators).

`injectStyle(css)` also puts the `<style>` outside `this.root` (a later `innerHTML` cannot delete it); same text twice is a no-op.

### Beats and height (declarative)

- `static BEAT_STEP_MAP = [[{ idx: 0, dwellMs: null }], ...]` (one entry per lesson beat). With no `onBeatChange` of your own, the base class clamps the beat, sets `this.stepIndex` and `root.dataset.step` (for `[data-step="N"]` CSS), then calls your optional `onStep(step, beat)`. Define `onBeatChange` yourself only when you need more.
- `class X extends withBeats(DomSimulation)` (`simulations/base/DomBeats.js`) adds `static BEAT_MAPS = { <count>: MAP }` (picked by the host's beat count), `onStep(step, beat, count)` and `static NOTES = [line per step]` (one `.css-note` line). State is `this._wb`. Not SvgScene.
- `static FIT = true` sizes the frame to the content that is showing, per beat and per orientation, after `render()`, every beat and every resize; `HEIGHT`/`PORTRAIT_HEIGHT` are then only the initial hint. Call `this.refit()` yourself if content changes on its own. Use it for read-only scenes whose beats differ a lot in height; a board that grows under the learner's hands should keep a worst-case static height (see `--interact` below).
- `static LAYOUT = 'fit'` is the same as `FIT`; `LAYOUT = 'frame'` is a fixed `WIDTH`x`HEIGHT` frame in landscape (root gets `.sim-frame`; put the part that grows in a `.sim-scroll` child) and the measured height in portrait, so the worst case never sets `HEIGHT`. Call `this.relayout()` after content changes. The kit boards use it.

### Controls live in the scene

A DOM scene's buttons, tabs, dials and chips are DOM elements, so put them inside the picture, next to what they change, and keep `static CONTROLS = []`. The host's control strip under the scene is for canvas and WebGL scenes, which have no elements inside the drawing. A strip separates the action from its effect and makes the scene read dense.

- Cases to compare, stages of one case, Back / Next: the `SimFlowDom` frame (section 4). One idea per screen, not every panel at once.
- A value the learner sets: a dial or slider in the row it changes (`valueDialHtml`, SimPicDom), not a strip slider.
- Choices: chips or buttons in the stage card (`flowChipHtml`, `data-sflow-action`).
- Wire it all with one delegated listener (`bindFlow`), keyboard included. Read the state in the scene, not in `onControlChange`.
- Before removing controls from an old scene, check its lesson block JSON for a `controls` entry.

`sim-lint` warns `host-controls` on a DOM scene with a non-empty `CONTROLS`.

## 2. Tokens (on `.sim-dom-root`, design-space px)

| Group | Tokens |
|---|---|
| space | `--sim-space-1..5` = 4 8 12 16 24 |
| radius | `--sim-radius-sm/md/lg/pill` = 8 12 16 999 |
| type | `--sim-text-sm/md/lg/xl/2xl` = 14 16 18 22 26 (portrait: lg 19, xl 23) |
| border | `--sim-border` (2px solid stroke), `--sim-lift` (3px), `--sim-card-pad` (12px) |
| colour | `--sim-label` (ink), `--sim-label-muted`, `--sim-bg-surface` (card), `--sim-bg-cell` (well), `--sim-bg-deep`, `--sim-surface-raised`, `--sim-accent`, `--sim-good`, `--sim-error`, `--sim-warning`, `--sim-stroke`, `--sim-track`, `--sim-series-1..8` |

14px is the floor: never write a `font-size` under 14px. Colours are the row above and nothing else: SimTheme's ROLE_ALIASES silently maps a wrong guess by its last hyphen segment, so a wrong name gives no browser error. Use only listed names; `kit-api.mjs --tokens` lists everything declared. None are added here.

Tint (a pairable colour): `background: color-mix(in oklab, var(--sim-series-N) 14%, var(--sim-bg-surface));` and keep the ink `var(--sim-label)`.

## 3. Component classes

| Class | Use |
|---|---|
| `sim-ui` | scene root (added by `render`) |
| `sim-stack` (`--tight`), `sim-row` | column / wrapping row with token gaps |
| `sim-grid-2`, `sim-grid-3` | `minmax(0, 1fr)` columns; one column in portrait |
| `sim-card` (`--accent`, `--dashed`, `--muted`) | bordered card with the 3px lift shadow |
| `sim-title` | card / scene heading |
| `sim-tag` (`--accent`) | pill label (add a scene rule for a squarer look) |
| `sim-field` (`--missing`), `sim-field__label`, `sim-field__value`, `sim-q` | labelled row; `--missing` is the dashed unknown state, `sim-q` the "?" badge |
| `sim-arrow` (`--down`) | arrow glyph between parts |
| `sim-meta` | small centred note (e.g. "schematic, not to scale") |
| `sim-record`, `sim-record__step` | progress strip; `aria-current="step"` marks the current one |
| `sim-icon` | inline svg sizing |

Markup helpers from `simulations/base/SimUi.js`: `esc(text)`, `simTag(text)`, `simTags(list)`, `simField(label, value)` (value `null` = dashed unknown with "?"), `simArrow(down)`, `simRecord(steps, currentIndex)`. They only emit the classes above.

Scene CSS is injected after this layer, so a one-class rule of yours wins at equal weight. Keep scene CSS to what is specific to the scene (beat reveals, one-off geometry).

## 4. Shared boards and drawings

Import from `simulations/base/kit/`:
- `KeyBuilderScene` - grow-a-key challenge (config in, board out). Landscape is a fixed 620x520 frame (taller when the viewport has room, see `FILL_HEIGHT`): header and footer pinned, the key scrolls, evidence cards open until the first action then fold to name chips. Subclasses set only `CONFIG` (and `PORTRAIT_*`), never `HEIGHT`.
- `SlotBoardScene` - fill-the-slots cards / chains / repairs. Same frame as KeyBuilderScene: header and footer (Check + verdict) pinned, the cards scroll.
- `TreeCards` - `treeCards(spec)` + `TREE_CARDS_CSS`, the tree throughline. Labels auto-fit their column in landscape: a long single word shrinks just enough to stay on one line (floor 75% of its size), short labels keep their size; `sim-layout` reports the shrunk ones as `small-text` warnings.
- `NameDecoderScene` - name practice fed by the course glossary (`decode` before a name is taught, `recall` later). A subclass sets only `CONFIG` (ids of glossary terms); needs `config.glossaryTerm` from the host, and `sim-layout` passes the bundle's glossary.json - `docs/glossary.md`.
- `GameScene` - a thin `CONFIG`/`init()`/`view()`/`act()` mini-game base, saved medals/cards through `config.collection`; ships one real game, `MonsterScene` (misconception buster). A course centrally about classify-by-evidence content can build a richer game family on top of it in its own bundle (not shared kit code, since it needs a whole data model of its own) - see `docs/games.md`.
- `KeyCharacters` - `characterSvg(art, tone, size)` with ~36 organism glyphs (`ART_KEYS`); ask for an existing glyph before drawing an svg.
- `fitToContent` - grow the frame to the measured content when a hand-set height is short.
- `TimelineScene` (`kit/SimTimeline.js`) - a timeline from `CONFIG` (eras, events with `revealAt`, spans); `modes` per step: `read`, `place` (drag events into era bins, Check), `order`. Portrait turns vertical. `examples/simulations/humanities/ChronologyShowcaseScene.js`.
- `FlowScene` (`kit/FlowBoard.js`) - chain, cycle, tree, pyramid, layers of cards with measured arrows; `read`, `predict` (pick the next card), `order`. `ConsequenceShowcaseScene.js`, `FlowLayoutsScene.js`.
- `AllocBoardScene` - items with values dragged into bins with rules (`atLeast`, `atMost`, `exactly`, `between`), live meters, optional hemicycle; `checkObjective()` for `withChallenge`. `MajorityShowcaseScene.js`, `BudgetShowcaseScene.js`.
- SlotBoard recipes for history: a compare matrix (`CompareCivilisationsScene.js`) and a claim-evidence board (`ClaimEvidenceScene.js`): config only.
- `SvgScene` (`kit/SimSvg.js`) - one SVG stage sized to the host width (portrait is its own layout, text never shrinks); `paint(st) -> { svg, over, head }`; chips and cards are HTML (`chip`, `cardHtml`). With `SimNumberLine`, `SimChart`, `SimGeom`, `SimChance`: `examples/simulations/maths/`. Motion: `this.play(seconds)` runs a frame clock (`this.clock`, stops at the end; `skip()`, `busy()`), and `animate(st, t)` moves keyed elements on `this.live` (`liveLayer`: kept across repaints, swept each pass; `liveChip`). `SimMorphSvg` (morphPath, transformTermsSvg, countSvg, odometerSvg, keywordSvg, highlighterSvg) runs on it: `SvgMorphShowcaseScene.js`.
- Live-layer motion (`kit/SimClock.js`, `SimFlySvg`, `SimFocusSvg`, `SimDrawOnSvg`) - `withClock(DomSimulation)` gives any DOM board the same clock and `this.live` (`st.anchor(el)` places tokens on cards: `examples/simulations/ClockDomShowcaseScene.js`); `flyTo`/`flyMany`/`flyChip` spring keyed tokens A to B (retargetable, staggered); `spotlight(live, key, d, k)` dims outside a path (a Venn region), plus `focusStyle`, `indicateSvg`, `flashSvg`, `sweepSvg`; `drawOnPath`/`drawOnCircle`/`writeOnSvg` draw on by the clock (no replay on repaint): `maths/SvgMotionShowcaseScene.js`.
- `SimNarration` (`kit/SimNarration.js`) - narrated courses (docs/narration.md 5, 8): `withNarrationCues(Base)` (static CUES, applyCue/cueBase/cueReset, SEEKABLE scrub-safe, `interactDone(id)`), tag helpers `na`/`tagFirst`/`tagTop`/`tagEach`/`tagEl`/`tagLive`, `narrOn` + `narrKeepColourCss` (lit glow on data-coloured dots). Attributes only: narration off = no pixel change.
- `SimCrowd` (`kit/SimCrowd.js`) - people as dots (1 dot = 1 person, or k: `perDot`): pure layouts keyed by person id (`gridLayout`, `scatterLayout` a town, `groupsLayout`, `cellsLayout` 2x2 with a b c d, `stripsLayout` bands over time, `swarmLayout` beeswarm) and `crowdLive(live, key, people, lay, { from, labels, order })` flies every dot there on springs (staggered, retargetable, seek-safe: rest = f(layout, people)); dot grammar ill = `--sim-annot`, well = `--sim-label-muted`, exposed filled, unexposed hollow ring, plus `tone`, `lit`/`dim`, `ghost`, `mark`; labels whose count rises as dots land, `bracketSvg`, `rulesSvg`, `axisParts`, `legendHtml`, `crowdSvg` (static). Add `SIM_CROWD_CSS`. 600 dots in flight hold about 45 fps at 4x CPU throttle: `data/CrowdShowcaseScene.js`.
- `SimPlotSvg` - SimPlot's staged chart beats on the live layer and clock (SimChart stays the static/CSS charts): `axesOnSvg`, `plotLineSvg` (by length or by x), `barsOnSvg`, `calloutSvg` fired at `plotHit(pts, i, o)`; frames from `plotFrame`/`chartFrame`: `maths/SvgPlotShowcaseScene.js`, `science/SvgPlot{Physics,Chemistry,Biology}ShowcaseScene.js`.
- `SimRigSvg` - SimRig as SVG: `limbD`/`muscleD` (the canvas outline), `liveLimb`/`liveMuscle`, `liveLever` + `beamPoint`, `liveCrank` (crank-slider with cylinder), `trackPoint` (a dragged IK target smoothed on the clock); maths re-exported: `maths/SvgRigShowcaseScene.js`, `science/SvgRig{Physics,Chemistry,Biology}ShowcaseScene.js`.
- Isometric blocks (`kit/SimIsoSvg.js`, pure half `SimIsoSpec.js` shared with canvas `SimIso.js`) - `isoLive(live, key, items, P, { hi })` paints solids in depth order with the canvas tone ladder (`ladderCss`), rim, edges, contact shadows; faces carry `data-face`/`data-solid`, `pickFace` hit-tests a tap, `faceD` outlines a face; `explodeLive`, `dropIn`, `cuboid`, `fitTurning` (turn without zoom): `maths/SvgIsoShowcaseScene.js`, `science/SvgIso{Physics,Chemistry,Biology}ShowcaseScene.js`.
- Camera (`kit/SimCameraSvg.js`, maths re-exported from canvas `SimCamera.js`) - `cameraG(live, key, cam, { html, depth })` paints a world once and moves only its transform; `cameraLive(live, base, events)` plays `cameraAt` on the clock; `pointWorld` for hit tests, `toScreen` for chips, `hairStyle` (non-scaling strokes), `cameraCss` for HTML: `maths/SvgCameraShowcaseScene.js`.
- Stage bridge (`kit/SimStageSvg.js`, pure half `SimStageSpec.js` shared with canvas `SimStage.js`) - `stageBridgeSvg(A, B, { w, h, box })` then `br.draw(live, key, t)`: clipPath window, outline morph, colour cross-fade under the veil, focus-hold; `contactShadowSvg` / `contactShadowLive` + `shadowDefs()` + `shadowTone(root)`: `maths/SvgStageShowcaseScene.js`, `science/SvgCameraStage{Physics,Chemistry,Biology}ShowcaseScene.js`.
- `SimVenn` (`kit/SimVennSpec.js` + `SimVenn.js` SVG + `SimVennCanvas.js`) - U box and 1-3 rings: exact region paths, `regionOf`, anchors, `slots` packing, `exprMask("(A|B)'")`, `vennSvg` shading/tags/counts, `regionSweepSvg` on the live layer: `maths/VennShowcaseScene.js`, `VennCanvasShowcaseScene.js`.
- `tapLight` (`kit/TapLight.js`) - tap to light, any subject: a row of chips (`{ id, label | html, say, targets, tone }`) inside the scene, under the figure. The part says which plain-string targets are lit; the scene draws that (dim and line width, no glow). `tl = tapLight({ label, chips, onChange: () => this.repaint() })` as a class field, `this.tl.mount(this.root, this)` after `super.setup()`, then `tl.off(t)`, `tl.has(t)`, `tl.lit()`, `tl.chip()` in any paint; `tl.set({ chips, lit, disabled })` in `enter(step)`; `tl.reset()`; `tl.destroy()`. Tap locks, again releases, another moves; keyboard focus and a real mouse preview; arrows, Escape, `aria-pressed`; 44 screen px under any scale; a swipe on the row is not a page turn. Keep the host out of what the scene rewrites (never `over` or `head`). A scene that rewrites it anyway writes `innerHTML` and calls `mount` again. Budget 2 rows of chips under the stage at 390. Canvas: `tapLightControl({ id, label, chips })` in `static CONTROLS` plus `static CONTROLS_IN_SIGHT = true`; `tl.controlValue()` in `getControlValue`, `tl.fromControl(v)` in `onControlChange`: same lit targets, no preview, plain-text labels. `science/TapLightSvgShowcaseScene.js`, `science/TapLightCanvasShowcaseScene.js`, `maths/TapLightDomShowcaseScene.js`.
- `simPick(root, { items, targets, onDrop })` (`kit/SimPick.js`) - drag, tap-tap and keyboard for any board. Opt-in: `targetAt: (pt) => id` for a non-rectangular target (a Venn region), `settle: 'spring'` to glide instead of snap (example: maths/PickRegionShowcaseScene.js).
- `SimText` - `fmtNum` (Indian grouping), `fmtIndianWords`, `fmtINR`, `fmtYear` (BCE/CE), `fmtSpan`, `fracHtml`, `supHtml`, `rootHtml`, `overbarHtml`.
- `SimFlowDom` (`kit/SimFlowDom.js`) - the in-scene flow frame: `flowTabsHtml` (cases; `disabled` locks a later tab), `flowStepsHtml` (numbered stages), `flowStageHtml` (one roomy card: kicker, title, body, callout; `panel` makes it the tabpanel), `flowActionsHtml` (Back / Next), `flowChipHtml`, `flowSplitHtml`, `flowInsetHtml`, `flowCompareHtml` (recap rows that reopen a tab), `flowLiveHtml`, `flowDeckHtml` (tab panels stacked in one cell: the frame keeps the tallest, never jumps) + `showFlowPanel(root, key, dir)`, `flowFootHtml({ formula, text })` (the one rule every tab shares); `flowChoiceHtml({ action, options, value, label })` (an in-scene value picker, a radio group: a tap calls the `action` handler with the value; `setFlowChoice(root, action, value)`); `bindFlow(root, { tab, step, action })` one delegated click + arrow-key listener; `playStage(el, dir)`. The selected tab, Next, the current step and the callout edge wear the app's primary colour (the lesson's own Next button, per theme and per classic / story mode). Portrait wraps 4+ tabs 2x2. CSS rides in `SIM_LOOK_DOM_CSS`.
- `SimPanel` (`kit/SimPanel.js`) - editorial panel parts for a DOM scene of numbers (tables, rates, ratios); look-neutral API, rules and serif numerals under plain. Add `SIM_PANEL_CSS` to `render({ css })`, `rootClass: 'spn-page'` paints the page paper under the panel (pair with `static SETTING = 'none'`). Layout: `.spn` (a column of parts), `.spn-split` (two columns, stacked in portrait), `.spn-kicker`, `.spn-label`, `.spn-note`, `.spn-cap`. Parts, each an HTML string:
  - `readoutHtml({ key, label, value, unit, formula, frac: { n, d }, note, tone, tint, size: 'sm' })` - one big `.sim-numeral` reading over its live formula; `setReadout(root, key, { value, from, fmt, formulaHtml, noteHtml, dur })` counts it up (`countUp(el, from, to, { fmt, dur })`, reduced motion jumps).
  - `ruleTableHtml({ caption, corner, cols, rows, total, pick: 'col' | 'row', sel, band, hi, note, label, action })` - a ruled table; a cell is a value or `{ v, tag, html }`; `pick` makes the heads buttons (`data-sflow-action`, default `pick`, `aria-pressed`); `sel` (index or list) tints the picked line, `band` a fixed one, `hi` cells. Scrolls sideways in its own wrapper.
  - `sliderHtml({ action, label, min, max, step, value, valueText, ticks, aria, disabled })` - labelled slider, live value in serif, tick labels under the track; `bindPanel` fires `input(action, value)`. Patch the DOM on input (`setText(root, action + '-val', t)`, `setReadout`, `setBar`), never re-render mid-drag.
  - `barsHtml(rows, { rule: true, max })` (SimChart) - bar-compare rows; a row's `tone` may be a token name (`'annot'`, `'label-muted'`), `key` + `setBar(root, key, frac, text)` moves one.
  - `columnsHtml({ key, bins, max, marker: { at, label }, ticks, axis, tone, label })` + `setColumns(root, key, bins, max, fresh)` - a column chart (histogram) with a dashed marker.
  - `factRowsHtml([{ key, label, value | valueHtml, state: 'moves' | 'fixed' }])` - label | value rows.
  - `takeawayHtml(lead, rest)` - the one take-away line between rules.
  - `stepsHtml([{ label, formulaHtml, gloss, state: 'done' | 'now' | 'todo' }])` - compact numbered steps.
  - `calcStepsHtml([{ label, parts | formulaHtml, gloss, state: 'done' | 'now' | 'todo' | 'hidden', fresh }], { size })` - the worked calculation (numericals.md 2): label left, big serif formula, gloss under it; `now` tinted with a signature edge; one row per learner move. `formulaHtml(parts, { size })` joins groups with `=` and wraps only there; a part is text, `{ n, d }` (stacked fraction, `overHtml`), `{ v, key }` (the value; `countValue(root, key, to, { from, fmt, dur })`) or `{ html }`. `revealHtml({ key, label, html, open })` is the "Show worked arithmetic" chip (`bindPanel` `toggle(key, open)`).
  - `pullQuoteHtml(html, { label, cite, size })`, `emHtml(text)`, `editHtml(del, ins)` - emphasis: the pull quote, the highlighted phrase, a correction.
  - `promptHtml(text, { done })`, `chipsHtml([{ label, action, value, pressed }])`, `sentenceHtml({ words: [{ w, fix }], picked, showFix, end })` - affordance: the prompt line, the actionable chip (`.spn-act`: rim, select ring, picked tint), a sentence of word chips (picked word with `fix`: struck, fix after it). Under plain `ruleTableHtml` pick heads are the same chips.
  - `entryHtml({ fields: [{ name, label, value, state, locked, aria }], action, cta, state, feedback })` - numeric entry with a Check; Enter checks.
  - `buttonsHtml([{ label, action, value, primary, quiet, disabled }])` - in-scene buttons.
  - `bindPanel(root, { action(name, value), input(name, value) })` - one delegated listener (clicks through `bindFlow`, focus kept across re-renders).
  - `tickHtml(ok, { label })` - inline SVG tick (true), cross (false), dash (null); 1em, `--sim-good` / `--sim-bad`, accessible name (`label: ''` hides it). Never the unicode marks: they render as boxes in some fonts. `checkListHtml([{ label, ok, note }], { cols, label })` - checks with marks; a failed line is bold too (state not by colour alone); one column in portrait.
  - `datedAxisHtml({ key, from, to, ticks, fmt, lanes: [{ label, at, spans: [{ from, to, kind: 'band' | 'bracket' | 'point', open, tone }] }], markers: [{ at, label }], scrub: { action, value, step, label, text, aria } })` - lanes of spans over a dated base line, ticks under it. `to: null` or `open` fades an open-ended band. Dates: pass `dayNumber(d)` and a `fmt`. `scrub` is a handle on the base line (native range: drag, arrows, Home/End, Page keys); `bindPanel` fires `input(action, value)` and moves its marker; pill reads "label value" unless `text`. `setAxisScrub(root, key, v, { text, aria })` patches it. Screen readers get a summary built from the lanes (or `label`).
  - Sort: `binChipsHtml([{ id, label, n }], { active, action: 'bin', size })` (destination chips, count muted), `fileCardHtml({ id, title, fields: [text | { text, muted, strong, short }], bin, aria }, { action: 'card', bins: [ids] })` (a record card button: unplaced dashed rim, placed solid rim + the bin's short name + its tint; bin `tone` 'annot' | 'label' | 'muted'; field `short` is the portrait wording, `''` drops it), `cardGridHtml(cards, { cols, portraitCols, label })`. Click a bin then a card; keys 1..n on a focused card place it: `bindPanel` `place(id, bin)`, else `action(binAction, bin)` + `action(cardAction, id)`. Example: L05 BuildCohortGame.
  - `chipsHtml(list, { size: 'sm' })` - narrow chips for dense rows (32px, 28px portrait); a chip's `n` shows "(n)" muted. Text floor: chips, buttons, cards, checks and axis labels never under 12px; table tags (sup) >= 12px.
  - `ruleTableHtml({ stack: 'portrait' | true })` - stacked rows: each row a block (its head, then "column ... value" lines); not with `pick: 'col'`.
  - `columnsHtml({ values: false })` hides the counts over the columns; a bin `{ hidden: true }` is a dashed "?" column, left out of the default max; `setColumns` with `hidden: false` reveals it.
  - `barsHtml(rows, { base: 1, min, max, log, ticks, tickFmt, baseLabel, ends: ['lower', 'higher'], rule })` (SimChart) - bars from a baseline both ways (odds or risk ratios: `log: true`); scale row under them (base tick bold, `baseLabel` under it, `ends` at the two ends); portrait puts each label over its bar. `setBaseBar(root, key, v, text)` moves one.
  Examples of the newer parts: L05 CohortTimelineScene (dated axis), L05 BuildCohortGame (sort), L04 RigTheStudyGame (narrow chips).
  Example: the analytical-epidemiology L03 scenes (ExposureRate, ControlRatio, ChanceOrReal, OddsRatioBuild, SlipSpotter, RareDiseaseGame).
- `SimPicDom` (`kit/SimPicDom.js`) - picture components: `mountParliament(host, { key })` (half-circle chamber; `set({ need })` draws the majority line, `onSwept(cb)`), `materialTileHtml(kind)` + `setTileAlbedo` (8 surfaces, reflected sun ray), `thermoHtml` + `setThermo` (value or range), `numHtml`, `scaleStripHtml` + `setScaleStrip`, `specimenCardHtml`, `valueDialHtml` (an in-row dial), `pairHtml(a, b, mid, { dials })`, `picTableHtml` (a table with a picture column; `portrait: 'compact'`), `readoutHtml` (number + caption), `thermoReadHtml` (thermometer + number), `cardRowHtml` (equal cards; fold to lines in portrait), `dialRowsHtml` (tile | name, number, dial | temperature rows).
- `SimPicVotes` (`kit/SimPicVotes.js`) - vote pictures: `shareBarHtml`, `shareCardsHtml`, `cellGridHtml`, `transferHtml`, `meterRowsHtml`, `tokenPoolHtml`, `shareShiftHtml`, `badgeHtml`; inks need `applyToneInks(root)`.
- `SimIcons` - `iconSvg(name, tone)` / `drawIcon`: ~45 neutral glyphs (`IconSheetScene.js` shows them); no emblems, flags, party or religious symbols.

### Look-kit extras (`SimLookDom.js`)

`simulations/base/kit/SimLookDom.js`, the DOM side of the canvas look kit (`docs/simulation-authoring.md` #4.6): `SIM_LOOK_DOM_CSS` (add to `render({ css })`), `.sl-backdrop` (dots; `--grid`, `--plain`), `noteLineHtml(rows)` (the default note: one muted line in the flow at the foot of the scene, text escaped; do not override `.sl-note` to get this), `noteCardHtml(rows, title)` (the modal card overlay, only for a beat the learner does not touch) and `burst(host, n, at)` (the find: pass the found element as `at` or mark it `[data-sim-found]`; a static host is made `position: relative`), `applyToneInks(el)` (sets `--sim-ink-on-1..8`/`-accent`/`-good`/...: readable text on each fill in the current theme). Cards, tags and fields stay `sim-*` classes from this kit.

Setting (the world behind the scene): static `SETTING` on the scene, else manifest `simSetting`, default `sky`; maths keeps graph paper. Names: `sky` open sky; `lab` lab wall; `water` under water; `field` sky to ground; `parchment` evening wash; `riso` risograph paper; `casefile` desk, manila folder, ruled card (plain look, per course only; any look paints it when a scene sets static `SETTING = 'casefile'`; surfaces become `--sim-set-paper`); `none` flat. A look with `settings: 'course'` (plain) paints only a setting the course names from its list, else flat. Kicker: `<span class="sl-kicker">FIG. 2.1</span>` (mono under casefile). Annotations on the figure: `kit/SimAnnotate.js` (callout, underline, highlight, ring; at most 3). `kit/SimWorld.js` (`SIM_WORLD_CSS`) paints it for DOM/SVG; DomSimulation sets `data-sim-setting` and a `.sl-world` layer. Leave the scene root transparent: an opaque root background covers the world.

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

=== SECTION: docs/simulation-authoring.md :: "3.3 DOM" ===
### 3.3 DOM scenes - `DomSimulation` (the default for labelled/structural content, and for any new mini-game)

**A new mini-game defaults to `DomSimulation`.** Quill (an SVG rig) drops in via `SimMascotDom` unported; CSS transitions keyed off `data-step` need no rAF loop.

**Build it from the DOM scene kit - `docs/dom-scene-kit.md`.** Template: `examples/simulations/EvidenceCardsScene.js`; `ShiftSubtractScene.js` is the reference for animated math columns (`data-step` state, hand-built spans; the canvas original sits beside it as `ShiftSubtractScene.canvas.js.reference`). Anti-pattern: `examples/anti-patterns/AbsolutePositionedScene.bad.js.example`.

Same `onBeatChange`/`CONTROLS`/lifecycle contract as `CanvasSimulation` (#1-#2.4); most DOM scenes need no per-frame code:

- **Controls go inside the scene, not in the host strip:** `docs/dom-scene-kit.md` "Controls live in the scene". SvgScene is DOM too: drag handles and tappable shapes go in the figure, buttons and readouts in its HTML `over` / `head`.
- `async setup()`: `await super.setup()` builds `this.root` (`<div class="sim-dom-root">`, `WIDTH x HEIGHT` design px, auto-scaled to the host width); build real DOM inside it.
- **Colours: `var(--sim-label)` etc. directly in the CSS.** Styles must be injected (`this.render({ css })` or `injectStyle(cssText)`): the host lives inside the plugin's Shadow DOM.
- **No `_tick` for most scenes.** Drive state with a `data-step` attribute on `this.root` (set from `onBeatChange`) plus CSS transitions keyed off `[data-step="N"]`. Defining `_tick(dt)` opts the scene into the rAF loop: only for genuine per-frame JS.
- **Dwell chains** (#2.2 `dwellMs`): `this.startDwellTimer(ms, onFire)` (from `SimulationBase`), not a countdown in `_tick`.
- **Per-element `left`/`top` px means it should have been flex or grid.** Absolute positioning is legitimate only for a label pinned over a `<canvas>` child (hybrid: a `<canvas>` appended into `this.root` beneath absolutely-positioned DOM labels, as #3.2 does for `WebGLSimulation`).
- **`static FRAMELESS = true`** drops the card chrome content-block.js wraps the sim in. Set it only together with painting full `--sim-bg-surface`-style fills yourself; default `false`.
- **Size `WIDTH`/`HEIGHT` to what the beats need.** The aspect ratio sets render scale in a side/above/below column: a canvas sized for the tallest beat (or for two panels when one shows most of the time) shrinks every beat. Measure per beat (`root.style.height = 'auto'`, read `scrollHeight`) or use `sim-layout`.
- **Set `PORTRAIT_WIDTH`/`PORTRAIT_HEIGHT` for more than one column, or text under ~14px at design scale** (also inside `mini-game@1`). Both default `null`: a landscape design is scaled down uniformly, so a 2-column grid becomes 2 illegible columns, the commonest mobile complaint. Pick a ~380px portrait width, set both statics, then override with a `.sim-dom-root--portrait <selector>` rule that collapses grids/multi-column flex to one column and bumps font sizes. `this.root` gets that class automatically; the swap is live on every resize, nothing to opt into.
- **A position computed from a pixel constant breaks when `PORTRAIT_WIDTH` differs from `WIDTH`** (`left: ${pad + frac * (W - pad*2)}px` with a fixed `W`). Use `%`, or when items sit too close to survive shrinking (dates a few px apart at 900px overlap at 380px), give portrait its own representation (a vertical list of rows) keyed off the same `data-*` id so one `_render()` updates both.

**Animated math: hand-built DOM/CSS, not `MathRenderer`/MathLive.** MathLive's `<math-span>`/`<math-div>` render lazily (an `IntersectionObserver`) and can be a 0x0 box until then, a poor fit for `transform` animation. Use `MathRenderer` only for static author-supplied LaTeX (a header, a fixed label); for anything that moves use `ShiftSubtractScene`'s `defineCols()`/`colCenter()`/`shiftRow()` spans.

=== SECTION: docs/numericals.md :: "2. A worked" "4. Affordance" ===
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
bundle stage3-simulation-dom, sha256 64ba285a65c0a45a. GENERATED by tools/staged-generation/build-bundles.mjs from:
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
- briefs/stage3/dom.md (10468 chars)
- docs/dom-scene-kit.md (29166 chars)
- docs/simulation-authoring.md :: "3.3 DOM" (3902 chars)
- docs/numericals.md :: "2. A worked" "4. Affordance" (3932 chars)
- briefs/reference/probe-cookbook.md (7162 chars)
- briefs/reference/look-rubric.md (5198 chars)
Do not edit: change the sources and rebuild. Everything above is the full text of those sources; do not open them again.
