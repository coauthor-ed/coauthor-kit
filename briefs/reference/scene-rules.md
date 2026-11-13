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
