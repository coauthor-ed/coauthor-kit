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
