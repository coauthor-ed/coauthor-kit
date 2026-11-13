# Authoring a Course-Exclusive Simulation

A canvas-based scene inside a lesson slide that **advances in sync with the slide's own text beats**. This doc covers the real mechanism, vendored from / copied verbatim out of the actual engine plus a real, shipped example.

**Write far more of these than feels natural** - aim for one on essentially every slide. The exception that needs justifying is a static image that genuinely communicates the concept better, not a slide with neither. Agents keep under-shipping simulations on the first pass - check per slide, don't wait to be told.

**A simulation labels; it does not explain.** On-canvas text is short tags only (part name, axis label) - never explanatory prose. That belongs in the slide's own prose (`markdown`/`markdownRef`, SKILL.md's default). This is the rule agents violate most under density pressure ("write more simulations" starts to read as "put more content in the simulation") - `examples/anti-patterns/README.md` is a real, dissected case of exactly that failure, paired with its fix.

**Reuse the theme - don't invent colors.** `sim-theme.css`'s palette is closed and fits on one screen - this is the whole list, nothing else exists to reach for:

| Role | Tokens |
|---|---|
| Backgrounds | `--sim-bg-deep`, `--sim-bg-surface`, `--sim-bg-cell`, `--sim-surface-raised` |
| Text | `--sim-label`, `--sim-label-muted`, `--sim-label-bg` |
| Structure | `--sim-stroke` |
| State | `--sim-accent`, `--sim-accent-hover`, `--sim-success`, `--sim-error`, `--sim-warning` |
| Map (`SimGeo.js` scenes) | `--sim-map-ocean`, `--sim-map-land`, `--sim-map-land-stroke`, `--sim-map-route`, `--sim-map-pin` |
| Earth (ground, rock, water, sky) | `--sim-strata-1` ... `-6` (top to bottom), `--sim-elev-low/-mid/-high/-peak`, `--sim-sea-shallow/-deep`, `--sim-ice`, `--sim-magma`, `--sim-sky-day/-dusk` (`GEO_COLOR_MAP` in `kit/GeoLook.js`) |
| Biology nouns | `--sim-membrane`(-glow), `--sim-cell-wall`, `--sim-cytoplasm`, `--sim-nucleus`(-glow/-stroke), `--sim-mito`, `--sim-chloro`, `--sim-er`, `--sim-golgi`, `--sim-lysosome`, `--sim-ribosome`, `--sim-vacuole`, `--sim-water`, `--sim-oxygen`, `--sim-co2`, `--sim-glucose`, `--sim-protein`, `--sim-atp`, `--sim-waste`, `--sim-salt`, `--sim-nutrient` |
| Categorical series ("N distinguishable colors for N parts") | `--sim-series-1` ... `--sim-series-8` |

`readSimColors()` (`SimTheme.js`) is how a `CanvasSimulation`/`WebGLSimulation`/`PhysicsSimulation` resolves these into `this.colors.*` (canvas can't resolve `var(...)` directly); a `DomSimulation` (#3.3) uses `var(--sim-...)` straight in its injected CSS, no `readSimColors()` needed. **A new `--sim-<scene>-*` token can't actually be registered here (no engine access)**: it just permanently renders its JS/CSS fallback value, identical in both themes - a hardcoded color in disguise. If nothing above fits, map onto `--sim-series-N` instead, or raise it as an engine-repo change (a generic role is missing, not a scene-named token). `tools/sim-test` flags a `COLOR_TOKEN_MAP` entry naming anything outside this list as an advisory.

**Every `ctx.fillStyle`/`strokeStyle` should read from `this.colors.*`, not a literal, at the point you draw** - `ctx.fillStyle = this.colors.label;`, never `ctx.fillStyle = '#e2e8f0';`. `tools/sim-test`'s `draw` check flags both a literal-heavy scene (advisory) and an outright invalid value (failure) - the latter is almost always a wrong-variable typo (`ctx.fillStyle = label` - the text being drawn - instead of `labelColor`), which canvas swallows silently: no crash, no console warning, just the wrong color.

**A block boundary always fully remounts - no state survives across blocks.** Two blocks pointing at the same `simulation.src` are two independent mounts; nothing is shared beyond `src`/`position`, and `onBeatChange` beats are scoped to the current block's own markdown only. If a concept must look cumulative across several slides, author one small scene per slide (sharing a drawing-helper module for common primitives is fine), never a single scene that assumes it remembers an earlier slide.

## For non-science subjects (economics, history, geography, civics)

A simulation is a visual aid - depict whatever the text describes so the student isn't holding it from prose alone. Not limited to physical/lab phenomena:

- A described historical structure/process (e.g. Indus Valley Civilization reservoirs, drainage channels, water flow) -> a normal `CanvasSimulation` scene depicting the schematic (#1-4 below) - same mechanism as any diagram scene, just historical rather than scientific.
- A world/continent/country map (migration routes, monsoon systems, plate boundaries, discovery-site timelines, trade routes) -> `SimScene` + `GeoMap` on `SimGeo` data layers, not hand-drawn polygons - see #3.1.
- Geography: process in cross-section (strata, plates, weathering) -> `SimScene` + `GeoMap.drawStrataBlock`; a landscape where height, rotation or depth is the point -> `GeoScene` (#3.2, at most one per lesson); "what does this landform look like" -> a real, sourced photo (`reveal.images`), not a scene.
- Trade-off/data curve (PPC, supply-demand): a static curve -> `graph` on the slide (`docs/graphing-and-plotting.md`); a point to drag along it -> `SvgScene` + `SimChart` (3.5).
- Dates, causes, hierarchies, comparisons, seats and budgets -> the kit components in 3.5, not a hand-built scene.
- Resource-allocation or systems-comparison -> a `CanvasSimulation`/`InteractiveSceneBase` scene with slider/button `CONTROLS`, drawing bars/icons instead of geometry.
- Pure definition/etymology/informational callout -> neither image nor simulation is fine; justify in `GENERATION-LOG.md` as usual.
- Category-sorting (needs vs. wants, product->segment) -> `match-categorize@1` question, not a simulation - `examples/example-question-match-categorize.json`.

## Static images per beat - the reveal.images/simulationStep hybrid

`content-block@1` can show a different image per beat: `reveal.images:
{"<step id>": {src, alt}}`, keyed by an *authored* step id - a bare
`<!-- STEP -->` has no id, so the swap silently never fires; use
`<!-- STEP id="..." -->`. A block can carry both `image` and `simulation`:
images show through `simulationStep` (0-indexed beat, sticky, same
convention as `mediaStep`), then the simulation takes over for the rest of
the slide - one-way only, no switching back.

Default to this over a simulation for figurative content (a scene, an
artifact, a person - "what did this look like"). Procedural canvas art
draws a floor plan convincingly, not a photo-real face or a textured pot.
Reaching for figure/hut/pot primitives to fake a *realistic* narrative scene
is the tell - put a real, license-recorded image in `reveal.images` instead.

Exception: a **flat-vector character** built from the primitive vocabulary
(circle, ellipse, stadium, rounded-rect, low-control-point blob) is in scope -
that is what Quill the mascot is, and `SimMascotDom` gives you him ready-made.
The line is representational realism, not "characters". One-line test: if it
needs more than about six primitives or a gradient to read, use an image. Don't generate that image yourself via text-to-image unless explicitly asked - write the prompt instead and save it as `media/L0N/<same-base-name>.prompt.txt`, ready for a later pass to render.

Worked example: `examples/blocks/blk-example-sim-history-map.json`
(simulation only) -> `blk-example-sim-history-images.json` (six images via
`reveal.images`, then `simulationStep` hands off to
`examples/simulations/HarappanCityPlanScene.js` for one interactive beat).
Contrast with `examples/anti-patterns/` - same lesson, before.

## The `CONTROLS: []` smell - a beat-driven reveal is not a simulation

A chart or figure the learner only reads (bars, curves, tables revealed per beat) is a `figure` layout or a course-local renderer, never a scene: `docs/renderers.md`, When.

Before writing a `DomSimulation` scene, name what the student actually
manipulates. If the honest answer is "nothing - it just shows more of the
diagram as the beats advance," that is not a simulation; it is a sequence of
pictures wearing a `.js` file, and `content-block@1` already does that
sequencing natively via `mediaStep`/`reveal.images` with zero custom code.
`static CONTROLS = []` on a scene that only ever reads `beatIndex` is the
tell - a real scene either takes a control input (`onControlChange`) or
advances a *live, running* process (`_tick`, a dwell timer, a drag/drop),
not just a `data-step` attribute flipped by the host. In a DOM or SVG scene
that control input should sit inside the scene (its own buttons, tabs, dials
or drag handles) with `CONTROLS = []`; see #3.3. A static plot or
labelled figure (axes, a curve, a shaded area, named points) is the `graph`
or `diagram` field on the slide or question, not a scene
(`docs/graphing-and-plotting.md`). Rule 11 ("a simulation
belongs on essentially every slide") is about the platform's actual
differentiator - real interactivity - not about maximizing `.js` file count;
don't let it push you into coding a static reveal.

This matters most for **relationship content built from several real
photos** (a food web, a "one broad name hides several species" comparison, a
historical event chain) - exactly the content most tempting to reach for a
scene for, because no single photo captures the whole relationship. Three
correct options, in order of preference:
1. If the relationship can be told as a *sequence* (one photo replacing the
   last as the beats advance), it's a plain `reveal.images` case - see above.
2. If several photos genuinely need to be visible **at once** with
   connecting labels/arrows between them (the case a sequence can't
   express), use `photoDiagram` (`docs/photo-diagrams.md`) - real photos in
   tinted rings, an engine-drawn SVG connector layer, live theme/dark-mode
   support and per-photo `alt` text, all from plain JSON, the same
   "author writes JSON, engine draws it" trade `docs/geometry-diagrams.md`'s
   `diagram` field already makes for synthetic figures. This is the field
   `photoDiagram` exists for - reach for it before either of the other two
   options below.
3. Composing one static image by hand (real photos, hand-placed labels/
   arrows, an ordinary image-editing pass e.g. Python/Pillow) is a fallback
   for a layout genuinely too bespoke for `photoDiagram`'s node/edge model
   - not the default. Never generate that composed image via text-to-image
   (see above) - crop/arrange the same real, license-recorded photos
   instead. A fixed neutral card background (not transparent) keeps it
   legible in both themes if you do end up here.

Only reach for an actual `DomSimulation` here if there is a real control to
attach (e.g. a `select` that re-sorts the same photos into different groups
live, the way `CriterionSelectorScene`-style scenes do) - the interactivity
is the entire justification for the extra code.

## 0. What's vendored here

`simulations-kit/src/simulations/base/` - engine base classes
(`InteractiveSceneBase.js` -> `SimulationBase.js` ->
`{CanvasSimulation.js, DomSimulation.js}`, plus
`SimDrawUtils`/`SimTheme`/`SimMotion`/`SimGeo`/`sim-theme.css`).
`examples/simulations/TriangleHalfParallelogramScene.js` and
`ShiftSubtractScene.js` are real, shipped, unmodified scenes
(`KGTriangleHalfParallelogramScene.js` is the same geometry with the full
art pass - read the small one for mechanism, that one for look, see #4.5;
`ShiftSubtractScene.canvas.js.reference` is the pre-port canvas original,
see #3.3). `simulations-kit/preview-harness.html` mounts a scene and drives
it with Prev/Next like a real lesson slide - open directly in a browser, no
build/server.

`SimGeo.js` additionally needs `simulations-kit/vendor/` (`d3.js`, `topojson-client.js`, `world-atlas/*.json`) - already present here; don't delete it.

`WebGLSimulation.js` (#3.2, rare) additionally needs `simulations-kit/vendor/three/` - already present. Any scene using `/vendor/...` needs `preview-harness.html` served over real HTTP (`cd simulations-kit && python3 -m http.server`), not double-clicked - see the harness's top comment. `simulations-kit/examples` is a symlink to `../examples` so SCENE_PATH never needs a `../` escape.

## 1. The mechanism: `onBeatChange(beatIndex, beatCount)`

A slide's text reveals one **beat** at a time (derived from markdown paragraph/heading structure, or explicit `<!-- STEP -->` sentinels). A `content-block@1` with a `simulation` attached calls one optional, feature-detected method every beat change:

```js
scene.onBeatChange(beatIndex, beatCount)   // 0-indexed
```

Called once on mount (synced to the current beat, so a resumed lesson doesn't replay), then on every subsequent change (click/keyboard/swipe/autoplay). Entirely optional - a scene that skips it behaves like a plain unsynced simulation. That's the entire engine-side contract; the rest of this doc is how a good implementation is structured, via the real example.

A question host (`poe-predict@1`, a question's `simulation`, `mini-game@1`) has no beats: it mounts the scene and calls `onBeatChange(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)` once, which lands on the last entry of `BEAT_STEP_MAP`. That is right for a reveal, wrong for a predict: the last stage shows the answer.

A scene used with `simulation.role: "setup"` reads `this.hostRole`, set before `setup()`: `'setup'` or `'explanation'` on a question mount, undefined on a lesson slide, a mini-game and in the kit harness (which mounts with count 0). Test both: `const blank = this.hostRole === 'setup' || !this.beatCount;`.

## 2. Reading `TriangleHalfParallelogramScene.js`

### 2.1 Two kinds of "step"

- **Beats** - the lesson's own text-reveal steps; the scene only ever receives an index/count, never the markdown.
- **Scene steps** (`STEPS` array, `stepIndex`) - the scene's own finer-grained state machine (`showTriangle -> flipJoin -> parallelogramFormed -> congruentHalves -> formula -> freeplay`). One beat's text often covers several scene-internal moments.

### 2.2 `BEAT_STEP_MAP` - mapping one to the other

```js
const BEAT_STEP_MAP = [
  [{ idx: STEP_SHOW, dwellMs: 900 }, { idx: STEP_FLIP, dwellMs: null }],  // beat 0
  [{ idx: STEP_PARALLELOGRAM, dwellMs: null }],                           // beat 1
  [{ idx: STEP_CONGRUENT, dwellMs: null }],                               // beat 2
  [{ idx: STEP_FORMULA, dwellMs: null }],                                 // beat 3
];
```

Each entry is a **chain** of scene steps for that beat. `dwellMs: 900` = show for 900ms then auto-advance to the next step in the chain with no input; `dwellMs: null` = stay until the beat itself changes (chain's terminal step).

`onBeatChange` looks up the chain and jumps to its first step; a per-frame `_tickBeatChain(dt)` (called from `_tick`) walks the rest via the dwell timers:

```js
onBeatChange(beatIndex) {
  this._lessonLinked = true;
  const clamped = Math.max(0, Math.min(beatIndex, BEAT_STEP_MAP.length - 1));
  const chain = BEAT_STEP_MAP[clamped];
  this._beatChain = chain;
  this._beatChainPos = 0;
  this._beatChainDwell = chain[0].dwellMs != null ? chain[0].dwellMs / 1000 : null;
  this._jumpToStep(chain[0].idx);
}
```

Each beat entry is a LIST of steps. The engine base classes also accept ONE step object for a beat (`[{ idx: 0 }, { idx: 1 }]` reads as `[[{ idx: 0 }], [{ idx: 1 }]]`), but write the list form. Anything else (a bare number, an empty list, an `idx` that is not a number) throws one message naming the scene and the beat.

**Clamp, don't throw**, if the markdown produces more beats than `BEAT_STEP_MAP` has entries - a scene must never crash the slide.

### 2.3 Locking manual controls while the lesson is driving

While lesson-driven, the scene's own Prev/Next/slider would otherwise let a student peek ahead. Gate with `_isBeatLocked()` / `isControlHidden(id)`:

```js
_isBeatLocked() {
  return this._lessonLinked && this.stepIndex < STEP_FORMULA;
}
isControlHidden(id) {
  const locked = this._isBeatLocked();
  if (id === 'prev') return locked || this.stepIndex === 0;
  if (id === 'next') return locked || isFreeplay;
  ...
}
```

Once the explanation finishes (`stepIndex >= STEP_FORMULA`), the scene hands off to free exploration - its own controls unlock and further interaction is student-driven. Copy this locked-while-explaining -> free-to-explore shape for most beat-synced scenes.

**Yes, a control can be beat-specific** (visible/enabled only on certain beats - e.g. a dropdown that only makes sense once a certain state is reached). Same `isControlHidden(id)`/`isControlDisabled(id)` hooks, any `CONTROLS` type - just branch on beat-derived state instead of a lock/unlock boolean. Track the beat yourself in `onBeatChange` (or reuse `stepIndex` if your `BEAT_STEP_MAP` already tracks it 1:1):

```js
onBeatChange(beatIndex) {
  this._beatIndex = beatIndex;
  // ...existing BEAT_STEP_MAP chain logic (#2.2)...
}
isControlHidden(id) {
  if (id === 'crop') return this._beatIndex < 2;   // dropdown only from beat 2 on
  return this._isBeatLocked();
}
```

There's no declarative "visible on beats [...]" field on a `CONTROLS` entry - it's this hook, always.

### 2.4 `static CONTROLS`, `static WIDTH`/`HEIGHT`

```js
static WIDTH = W;
static HEIGHT = H;

static CONTROLS = [
  { type: 'button', id: 'prev', label: '<- Back' },
  { type: 'button', id: 'next', label: 'Next ->' },
  { type: 'slider', id: 'apex', label: 'Apex position:', min: 40, max: 240, step: 10, value: 110 },
  { type: 'button', id: 'flip', label: 'Flip & Join ->' },
  { type: 'select', id: 'crop', label: 'Crop:', options: [
    { value: 'barley', label: 'Barley' },
    { value: 'wheat', label: 'Wheat' },
  ] },
];
```

No id/registration needed - attached by file path (`simulation.src`, #4), same as `image.src`.

**`select` options need `value`, not `id`.** The renderer reads `opt.value`/`opt.label` (or a plain string) - an option object shaped `{ id, label }` renders `value="undefined"` for every option, silently. `onControlChange(ctrl.id, value)` then receives that same `value` string on change.

**`static WIDTH`/`static HEIGHT` must match the `W`/`H` constants your drawing math uses.** `CanvasSimulation.setup()` sizes the actual canvas pixel buffer from these, defaulting to 600x400 if unset. Draw against a local `const W = 900; const H = 600;` without also declaring `static WIDTH = W; static HEIGHT = H;` and the canvas stays 600x400 while the scene draws for 900x600 - everything renders ~1.5x too large with right/bottom edges clipped, on every screen, unfixable by CSS since the bug is in the pixel buffer itself. Set both the moment you pick `W`/`H`, not as an afterthought.

`CONTROLS` render automatically. `type` is one of `button`, `slider` (or `range`), `select`, `number`, `toggle` (or `checkbox`: a tick box, value true/false) and `segmented` (a row of buttons, options like `select`). A `type` the host does not know draws nothing and leaves an empty control bar, so a `kind:` typo is easy to miss; check-scene FAILs it, and a `select`/`segmented` option without a `value`. Every interaction funnels to:

```js
onControlChange(id, value) { /* button: true; toggle/checkbox: true or false; slider, range, select, number, segmented: a STRING (Number(value) before arithmetic) */ }
```

`isControlDisabled(id)` grays out without hiding; `isControlHidden(id)` removes entirely (used for prev/next while locked).

## 3. Choosing a base class

**Pick by content shape, not by habit.** This is the decision agents get wrong most often - canvas has been the only option long enough that reaching for it out of habit, even for a diagram that's really just boxes and labels, is the default failure mode:

| Visual is... | Base class |
|---|---|
| boxes, arrows, labelled panels, tables, timelines, comparison layouts, flow diagrams, text-heavy callouts | `DomSimulation` (#3.3) |
| continuous motion, geometry, particles, physics-like animation | `CanvasSimulation` |
| real world/country maps | `SimScene` + `GeoMap` + `SimGeo` layers (#3.1) |
| geology/landform cross-section | `SimScene` + `GeoMap.drawStrataBlock` (#3.1) |
| earth/landscape where height, rotation or depth is the point | `GeoScene` (#3.2), at most one per lesson |
| other 3D (molecules, solids) | `WebGLSimulation` (#3.2) |
| both - a drawn scene needing crisp labels | `DomSimulation` with a `<canvas>` child (#3.3) |

Two independent reasons for the DOM row, not one: (1) the browser's own text layout beats hand-computed `ctx.fillText` coordinates for exactly this content shape - no overlap/overflow to fight; (2) a CSS-transition-driven `DomSimulation` scene has **no animation loop at all** - it never has to solve #3.4's come-to-rest problem, because there's no per-frame work to stop doing in the first place.

- **`InteractiveSceneBase`** (no rAF loop) - redraws only on demand (beat change, control interaction). Lightest weight; use when nothing needs to animate continuously.
- **`SimScene`** (`simulations/base/kit/SimScene.js`, #4.6) - the default for a new canvas scene: `CanvasSimulation` plus the house look, stages, `busy()`, `after()`.
- **`CanvasSimulation`** (what the example below extends) - anything animates smoothly without new input (eased rotation, dwell auto-advance, physics-like motion). `_tick(ctx, dt)` runs every frame; `_drawInitialFrame(ctx)` draws the paused pose. Dwell-chains (#2.2) and eased transitions (`cruise()` in `SimMotion.js`) both need a running loop - and get one for free: `static CONTINUOUS` is `false` by default (#3.4): the loop runs for the beat/control budget and then parks, so long runs and pointer handlers need an explicit `this.animateFor(ms)`.
- **`DomSimulation`** - #3.3. The right default for labelled/structural content per the table above.
- **Skip `OrganelleZoomSimulation`/`ParticleSimulation`/`PhysicsSimulation`** unless you specifically need drag-drop/particles/Matter.js physics - not prerequisites for beat-syncing, and not vendored here.
- **`GeoScene`** (`kit/GeoScene.js`) - the WebGL look kit: same stage/beat shape as `SimScene`, plus camera shots, HTML label chips, themed backdrop. **`WebGLSimulation`** - raw three.js base. Both #3.2.

DOM scenes are exempt from `tools/sim-test`'s canvas draw-call/legibility checks (see `tools/sim-test/README.md`) - not a gap, a consequence: those checks exist because canvas has no layout engine of its own, and headless Node has none either, so porting them is impossible without a real browser and unnecessary once one lays the text out.

### 3.1 Maps - `SimGeo` data + `GeoMap`, never hand-typed coordinates

Maps use real geometry and data, never coordinates typed into a scene (check-scene WARNs over 20 `[lon, lat]` pairs):
- `SimGeo.loadWorld('land')` - coastlines, no borders. `SimGeo.loadLayer(name)` - `india` (Survey of India boundary), `plates` (PB2002 boundaries by kind + plate labels with velocity vs Eurasia), `quakes`, `volcanoes`, `rivers`, `elevation` (1-degree grid, `.at(lon, lat)`). Sources and licences: `simulations-kit/vendor/geo/SOURCES.md`.
- `kit/GeoMap.js` draws them in a `SimScene`: `makeView` (fitted projection; `view.at([lon, lat])`), `drawGlobeBase/drawLand/reliefImage/drawGlobeShade`, `drawIndia`, `drawPlates`, `drawQuakes`, `drawVolcanoes`, `drawRivers`, `streamlines/drawStreamlines` (wind, currents; pure, resume-safe), `layerCache` (paint static layers once), `drawStrataBlock` (2.5D cutaway block with `deform(x, y)`). `node tools/sim-test/kit-api.mjs` lists signatures.
- `static COLOR_MAP = GEO_COLOR_MAP` gives `this.colors` the earth tokens.

**India's border (law).** A map of India that differs from Survey of India maps is an offence (Criminal Law (Amendment) Act 1990). So: India's border comes only from `loadLayer('india')` (`drawIndia`, or `globe({ india: true })`); never `loadWorld('countries')` (de facto borders: check-scene FAILs it); world views use `land` and overlay `india`; show the credit "Boundary of India: Survey of India" whenever the border is drawn (`drawIndia` does, unless `credit: false` and the scene shows it itself). Do not edit or re-simplify the file.

Examples: `examples/simulations/geo/PlateWorldScene.js` (globe + layers + drag), `MonsoonFlowScene.js` (India map + winds + slider), `PlateBlockScene.js` (cross-section).

### 3.2 3D scenes - `GeoScene` (earth) or `WebGLSimulation` (other)

Default to 2D: a labelled cross-section usually teaches as well for far less cost (~750KB three.js, a GPU frame per animation step). 3D only when rotation/depth is the teaching point: a cutaway Earth, a landscape a river shapes, molecular geometry, Class 9 solids. At most one 3D scene per lesson, never two on one slide (browsers cap WebGL contexts).

**`GeoScene`** (earth, landscapes) is the look kit for 3D: `build(T, c)` (re-run after a lost GPU context, so keep model state in `this.v`/fields, not meshes), `enter(stage)`, `update(d)`, `busy()`; `static SHOTS` + `this.shot(name)` camera moves; `this.label(id, text, anchor, o)` HTML chips (hidden behind the hero via `face`); `this.hud(slot, text)` (time chip, credits); `this.tweenTo(key, v, s)`; `this.mat(key)`/`this.tint()` theme-aware materials; `BACKDROP` 'space'/'sky' (right in both themes); `ORBIT`; `lowEnd`. Helpers in `kit/GeoTerrain.js`: `heightfield` (with strata `skirt` walls), `waterPlane`, `ribbon`, `cutawayBlock`, `globe` + `loadGlobeData` + `sphereGeo` (wedge cuts), `overlaySphere`, `arrow`, `glowSprite`, `fbm`. Process over time: the model is a pure function of `t` (`height(x, z, t)`), so scrubbing back works and every beat is resume-safe; beats `tweenTo('t', value, s)`, a slider sets it with `tweenTo('t', v, 0)`, and `hud('tl', ...)` shows it via `formatYears`/`timeAt` (`kit/GeoLook.js`, linear or log axis). Same pattern in a `SimScene`. Examples: `examples/simulations/geo/EarthCutawayScene.js`, `RiverValleyTimeScene.js`. Name vertical exaggeration on screen (`hud('br', ...)`).

**`WebGLSimulation`** (other 3D): `examples/simulations/WaterMoleculeScene.js` is the reference; treat its polish as the bar.

Same `onBeatChange`/`CONTROLS`/lifecycle contract as `CanvasSimulation` (#1-#2.4). What differs is the drawing surface:

- `async setup()`: `await super.setup()` gives `this.scene`/`this.camera`/`this.renderer` (three.js objects, not a 2D `ctx`) - add lights/geometry to `this.scene`.
- `_tick(dt)` - **no `ctx` param.** Mutate the scene graph; the base class calls `renderer.render()` after. Static scenes can skip `_tick`.
- Colors: `readSimColors()` still applies, into `MeshStandardMaterial.color`/`scene.background`/light color instead of `ctx.fillStyle`. Pick tokens by meaning (`WaterMoleculeScene` uses `--sim-warning`/`--sim-success` to distinguish electron types) and check a token's light-theme value before using it for something that must stay visually stable - `--sim-label` flips near-white/near-black by theme (wrong for "must always read as white"; use `--sim-ribosome` instead).
- **Glow without postprocessing**: opaque core + 1-2 additive-blended (`THREE.AdditiveBlending`, `depthWrite: false`), progressively bigger/fainter spheres around it (see `addElectron()`).
- **Grounding**: an object conceptually resting on something (a solid, a structure) needs a contact shadow (`THREE.ShadowMaterial` on an invisible plane) + faint `GridHelper`, or it reads as pasted-on. Free-floating objects (molecule, orbit, cell) should skip both - lean on lighting + `OrbitControls` parallax instead.
- **Labels**: no `ctx.fillText` - use an absolutely-positioned HTML `<div>` per label, reprojected via `vector.project(camera)` each frame; copy `WaterMoleculeScene.js`'s `_makeLabel()`/`_updateLabelPositions()` directly (anchors transform through the group's `matrixWorld`, not just the camera). Still label-only, never prose.
- **Guard every hook against `this.unsupported`**, not just `setup()`/`_tick()` - some browsers refuse a WebGL context; `this.scene`/`this.camera` exist but `this.renderer` doesn't, and the engine still calls `onBeatChange`/`onControlChange`. Guard anything built only on the WebGL path (`if (this.unsupported || !this._labels) return;`) - see `WaterMoleculeScene.onBeatChange()`.

**Testing:** Node has no GPU (sim-test's draw checks skip), but headless Chromium renders WebGL in software: check-scene runs `webgl-probe.mjs` (parks per beat, resume, resize/theme/context-restore repaint) and `shoot.mjs` (screenshots, HTML label report) for kind webgl. Slow: ~30 s per shoot, 1-3 min per probe. Real-device GPU checks are still the author's job.

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

### 3.5 Kit components for maths and humanities

Pick by shape; the scene is then mostly config. `node tools/sim-test/kit-api.mjs --maths` / `--humanities` lists them; each has a showcase in `examples/simulations/maths|humanities/`.

| Shape | Component | Surface |
|---|---|---|
| dates, eras, durations, "place the event" | `TimelineScene` (`SimTimeline.js`) | DOM board |
| cause chain, cycle, tree, pyramid, "put in order", "what comes next" | `FlowScene` (`FlowBoard.js`) | DOM board |
| coalition to a majority, budget split, fill to capacity | `AllocBoardScene` (+ `withChallenge` as a game) | DOM board |
| compare matrix, claim vs evidence | `SlotBoardScene` recipes | DOM board |
| number line, fractions, hops, zoom, 0-1 chance line | `SimNumberLine` (spec in `SimNumberLineSpec`; canvas: `SimNumberLineCanvas`) | SVG (`SvgScene`) or canvas |
| bars, running frequency, histogram, pie, hemicycle, dots, tally | `SimChart` (frame in `SimChartSpec`; canvas: `SimChartCanvas` for axes, bars, trace) | SVG or canvas |
| constructions, draggable points, angle readings, area models | `SimGeom` | SVG |
| dice, coins, cards, outcome grids, trees, spinner, bag | `SimChance` | SVG |
| pan balance (equations, weighing) | `SimBalance` | canvas (`SimScene`) |
| a person doing the work | `SimFigure` | canvas (`SimScene`) |

Pattern -> part table for canvas physics, labels and drag: `briefs/reference/kit-parts.md`.

Shared: `simPick` (drag, tap-tap, keys on any board), `SimText` (Indian grouping, `\u20b9`, BCE/CE, spans, fractions), `SimIcons` (neutral glyphs). SVG data shapes lay out for the stage width (`st.W`), so portrait is a real layout and text never shrinks; canvas scenes only scale. Components validate their config at setup and throw a plain message.

## 4. Attaching a simulation to a lesson block

```json
{
  "id": "blk-l04-s05",
  "type": "content-block@1",
  "markdownRef": "blocks/L04/blk-l04-s05.md",
  "simulation": { "src": "simulations/L04/TriangleHalfParallelogramScene.js", "position": "right" },
  "mediaStep": 0,
  "authoring": { "status": "ai-draft", "flags": [], "reviewedAt": null }
}
```
```
<!-- blocks/L04/blk-l04-s05.md -->
Take any triangle ABC... [the beats your BEAT_STEP_MAP maps onto]
```

- `simulation.src`: bundle-relative path, same convention as `image.src`/`blockRef`. A full `http(s)://` URL also works.
- `simulation.position`: `"right"|"left"|"above"|"below"`, default `"right"`. Use `"below"` only for a wide/short scene (number line, long horizontal strip) that would get squeezed in a side column.
- `mediaStep` (optional, 0-indexed): delays first appearance until that beat; omit/`0` shows from beat 0.
- On a `poe-predict@1` block or a question (`mcq-single@2` etc.) the scene shows only AFTER the learner answers, unless `simulation.role` is `"setup"`. A question's static picture (a plot, a labelled figure) is the `graph`/`diagram` field, not a setup scene. Use `"role": "setup"` when the prompt refers to the scene ("the diagram shows...", a snapshot to predict from): it mounts at once, beside the prompt, with no beats. A scene meant for the answer reveal keeps the default.
- On a phone (600 px wide or less) a scene whose design aspect (`PORTRAIT_WIDTH / PORTRAIT_HEIGHT`, else `WIDTH / HEIGHT`) is under 0.8 skips the theatre and takes the page's full width; the page scrolls, Viewing options and Full view stay. No flag needed; `fullWidth` is not the fix for this.
- **Beat count from the markdown must match `BEAT_STEP_MAP`.** Count beats by eye or add `<!-- STEP -->` sentinels for exact control. Mismatch stalls or clamps the scene against the text - not a crash, but check by eye in the harness.
- Put a `##` sub-header (voice-and-tone.md rule 2) *after* the `<!-- STEP -->` sentinel that opens its beat, not before - clearer, though no longer required (the engine folds a leading heading into the beat that follows either way).

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

## 4.7 Motion and explainer rules

`kit/SimAnim.js` holds the motion basics: eases, springs, cue sheets, the `TIMING` constants and `reducedMotion`. Use its numbers, not your own. Explainer moves and subject kits are built; use them, never hand-roll them:

| Module | For |
|---|---|
| `SimFocus` | dim the rest, indicate, outline sweep, brace, underline, legend chips |
| `SimDrawOn` | draw a path or handwriting on; ribbons |
| `SimCamera` | `{x, y, z, r}` camera: push, pull, glide, layers |
| `SimMorph` | shape morph, count-up, odometer, highlighter, term moves (SVG scenes: `SimMorphSvg`, pure parts in `SimMorphSpec`) |
| `SimPlot` | scales, nice ticks, timed data callouts |
| `SimIso` | isometric solids, flat-shaded faces, explode |
| `SimTour` | an idle tour of parts after a pause; readout and screen-reader writers |
| `SimStage` | a zoom bridge between two pictures (states of matter) |
| `SimRig` | two-bone IK: arms, levers, cranks |

`node tools/sim-test/kit-api.mjs simulations/base/kit/<Module>.js` lists the exports; `examples/simulations/<Module>ShowcaseScene.js` shows each one in use.

**Colour and focus**
- Reserve one focus colour; nothing else uses it.
- One concept = one `--sim-series-N` colour for the whole scene; write the map down before drawing (consistency is what the eye learns).
- At most 4 meaning colours, and at most 2 focus points at once.
- No grain or texture of your own: the house look is flat. The kit backdrop (drawBackdrop, drawFloor, .sl-backdrop) is the course's setting (a world), kit-owned; do not add more. Settings (static `SETTING` on a scene, else manifest `simSetting`, default `sky`; maths keeps graph paper): `sky` open sky, low horizon; `lab` lab wall on paper; `water` under water, light shafts; `field` sky to ground; `parchment` evening wash on parchment; `riso` risograph paper with halftone corners; `casefile` a desk, a manila folder and a ruled card (plain look, per course: `bundle.json` `simSetting`; under Quill too when a scene sets static `SETTING = 'casefile'`; the find is a stamp, `celebrate({ stamp })`); `none` flat surface. DOM/SVG worlds come from `kit/SimWorld.js`; a DOM scene whose root paints its own opaque background covers the world, so leave the root transparent.

**Show, do not label**
- Act the idea out rather than labelling it; labels live in a legend that drives focus.
- Earlier beats stay complete on screen; only the current beat animates.
- Subjects settle and stop; no idle breathing (the loop must park, 3.4).
- Build order: structure (axes, outline), then data, then one annotation per beat. Bar charts start at zero.
- Plan-then-do: a dashed ghost of the prediction, then the real outcome (Predict, then Observe). A Predict step never spoils the outcome.

**Timing**
- Motion after a tap lasts at most about 0.8 s, and a tap skips to the end state.
- Exits are faster than entries: about 0.18 s out vs 0.30-0.35 s in.

**Camera**
- Put a world point on a screen point; zoom in log space (equal steps feel equal).
- Pair every push with a pull or glide; never the same camera move three times in a row.
- Camera moves are smooth; content may step "on twos".

**Reduced motion and access**
- Reduced motion shows the end state of every beat; meaning must survive with no motion.
- Check it: `node tools/sim-test/shoot.mjs <scene> --reduced` (the kit already drops the iris, shake, flash and pop).
- Never write per-frame numbers to a live region or aria text (screen readers drown).

**Drawing**
- Lines never stop in mid-air: end on a face, a dot or a fade. Textures end by fading.
- Never `Math.random` in `draw`; use the seeded rng from `kit/shuffle.js` (resume must repaint the same frame).
- Draw a resting state with the same primitive the next beat uses (no pop at the handoff).

**Checks** (check-scene runs the first two)
- `motion-probe`: dead beat (over 4 s with nothing moving), pop (one frame jumps), repaint (`draw` at the same t differs: `Math.random` or a clock in `draw`, FAIL), resume in pixels, text overlap or clipping mid-motion. `--sheet` writes a slow-clock contact sheet: a row of stills per beat.
- `contrast-lint`: the palette pairs your `c.*` keys meet, both themes; a key no map defines draws nothing.
- `run.mjs exec tools/sim-test/line-ends.mjs <scene>`: lines that stop in mid-air. Noisy: read, do not gate.

**Banned defaults**
- Everything fading in; generic particle bursts; glow on chrome; the same camera move every beat; a crude character (worse than none).

## 5. Workflow

1. Design the scene's own step sequence first, independent of lesson text chunking (#2.1).
2. Write the scene (a canvas scene extends `SimScene`, #4.6; otherwise usually `CanvasSimulation`): `import { CanvasSimulation } from 'simulations/base/CanvasSimulation.js';` - same bare specifier the real engine's import map resolves. Set `static WIDTH`/`HEIGHT` in the same edit you pick `W`/`H` (#2.4), and follow #3.4's come-to-rest rules (`onBeatChange`, `animateFor(ms)` for long runs and pointer handlers).
3. Draft the block's markdown, then design `BEAT_STEP_MAP` against the beats it actually produces - in that order.
4. `node tools/sim-test/check-scene.mjs <scene> --bundle <bundle>` runs every gate below in one command (plus a static identifier lint, a freeze probe, a resume probe and a real-browser text report); `node tools/sim-test/shoot.mjs` shows it in both themes. `tools/sim-test/README.md` lists them. DOM scene: `node tools/sim-test/sim-lint.mjs <scene>` (static, instant) and `node tools/sim-test/sim-layout.mjs <scene>` (Chromium: clipping, real height per beat, small text) - `docs/dom-scene-kit.md` #5. Set `HEIGHT`/`PORTRAIT_HEIGHT` from its numbers, not by eye.
   Headless sanity/draw check first - `tools/sim-test/README.md` (cheap, no browser: crashes, invalid colors, and overlapping/overflowing/low-contrast text, before you spend a click-through on it).
5. Headless beat-count check - `tools/beat-check/README.md` (markdown beats vs. `BEAT_STEP_MAP.length`; a mismatch clamps silently, easy to miss by eye).
6. Preview with `simulations-kit/preview-harness.html` (edit `SCENE_PATH`/`BEAT_COUNT`) - click through and confirm visuals match each beat's text, and the lock/unlock handoff (#2.3) fires where expected.
7. Validate the block JSON (`node validators/validate.mjs`, `AGENTS.md` rule 6) - it checks structural fields, not beat-count alignment; that's step 5.
8. Place the file at `courses/<bundle>/simulations/L0N/YourSceneName.js`.

## 6. What the preview harness does and doesn't prove

Proves: mounts, `setup()` runs clean, `onBeatChange` drives the right visual per beat, `CONTROLS` render/respond, canvas sizing (zoomed/cropped here = #2.4's `WIDTH`/`HEIGHT` bug, fix before anything else - same bug looks identical in a real slide).

Doesn't prove: real-slide layout (side-by-side vs. below, sticky positioning), or theme correctness beyond `sim-theme.css`'s token fallbacks. (Beat count vs. the real engine's `splitSteps()` - `tools/beat-check` covers that one statically, step 5.) Re-check both once this content reaches the real engine.
