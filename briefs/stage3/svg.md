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
