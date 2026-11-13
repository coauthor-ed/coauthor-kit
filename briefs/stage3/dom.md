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
