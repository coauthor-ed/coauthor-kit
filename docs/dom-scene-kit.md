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
