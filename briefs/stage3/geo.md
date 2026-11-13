# Stage 3 guide: geography (3D scenes and maps)

For `Base class: GeoScene` (3D earth: cutaway, valleys), `WebGLSimulation` (other 3D), or a map (`SimScene` + `GeoMap`).

## Read
- 3D: `node tools/doc-section.mjs docs/simulation-authoring.md "3.2 3D"`. Maps: `node tools/doc-section.mjs docs/simulation-authoring.md "3.1 Maps"`.
- India's border and the legal rules: `docs/copyright-and-sourcing.md` (Maps).

## Start from
- 3D: `examples/simulations/geo/EarthCutawayScene.js`, `examples/simulations/geo/RiverValleyTimeScene.js`. Maps and sections on canvas: `examples/simulations/geo/PlateWorldScene.js`, `examples/simulations/geo/PlateBlockScene.js`, `examples/simulations/geo/MonsoonFlowScene.js`, `examples/simulations/geo/StrataExtrasShowcaseScene.js`.

## Rules
- 3D: the design note adds `Camera shots`, `Time axis`, `Low-end tier`. Beat 0 is legible at t = 0 (no dwell hides the first idea); both themes' backdrops checked; vertical exaggeration named on screen.
- Software GL is slow: one shoot ~30 s, check-scene 2-4 min; one look round is realistic, two is the cap.
- Maps: `static COLOR_MAP = GEO_COLOR_MAP`, layers from `SimGeo.loadLayer`, `layerCache` for static layers; India's border only via `drawIndia` / the `india` layer, with the credit on screen. [check: map lints]
- Stubs add `Camera:`, `Projection:`, `Data:`, `Time axis:`, `Static fallback:` lines (`briefs/reference/stub-format.md`).

## API (from kit-api, copied in)
```text
# simulations/base/kit/GeoScene.js
  class GeoScene extends WebGLSimulation
    .static WIDTH = 680
    .static HEIGHT = 520
    .static FOV = 40
    .static TRANSPARENT = true
    .static CONTINUOUS = false
    .static DEFAULT_TRANSITION_MS = 400
    .static BACKDROP = 'space'
    .static SHOTS = {}
    .static ORBIT = false
    .static ORBIT_LIMITS = { min: 2, max: 40 }
    .static COLOR_MAP = GEO_COLOR_MAP
    .static FALLBACK = null
    .get stage()
    .get age()
    .get clock()
    .get lowEnd()
    .setup()
    .destroy()
    .color(key)
    .mat(key, o = {}, kind = 'standard')
    .tint(obj, key, prop = 'color')
    .lights(o = {})
    .onBeatChange(beatIndex, beatCount)
    .after(seconds, fn)
    .tweenTo(key, value, seconds = 1)
    .shot(nameOrPose, seconds = 1.4)
    .resetView(seconds = 1)
    .label(id, text, anchor, o = {})
    .labelOn(id, on = true)
    .labelText(id, text, sub)
    .hud(slot, text)
    .celebrate(anchor)
    .isControlHidden()
    .isControlDisabled()
    .getControlValue(id)
    .onControlChange()
    .renderFrame()
    .build()
    .enter()
    .update()
    .busy()

# simulations/base/kit/GeoTerrain.js
  fbm(seed = 1)
  heightfield(s, o = {})  - o: { size: [w, d], n (segments, halved on lowEnd), height: (x, z) => y, metres, seaLevel (m), top (m), skirt (base y) }
  waterPlane(s, o = {})  - o: { size: [w, d], level, key ('seaShallow'), opacity }
  ribbon(s, pts, o = {})  - pts: [[x, y, z], ...] or Vector3s. o: { width, key ('seaShallow'), lift (above the points) }
  foldDeform(a, width = 3, x0 = 0)  - Fold: layers bend up (a > 0, anticline) or down around x0 over a given width.
  faultDeform(dy, x0 = 0, dip = 0.3)  - Fault: the block right of x0 (plane dipping by dip, 0 = vertical) drops by dy.
  cutawayBlock(s, o = {})  - o: { w, d, strata: [{ key, thick }] top to bottom, seg (x segments), deform }.
  lonLatToVec3(T, lon, lat, r = 1)
  loadGlobeData()  - Data for globe(): { land, elevation, india }. build() is sync, so await this in setup() before super.setup().
  sphereGeo(T, r, seg, cut)
  overlaySphere(s, o = {})  - o: { radius, tex, cut, draw(ctx, eq, c) where eq([lon, lat]) -> [x, y] on the texture, opacity }
  globe(s, o = {})  - o: { data (loadGlobeData()), radius, tex (width px, default 1024; 512 on lowEnd), india (outline), graticule, top (m), seg, cut }
  arrow(s, from, to, o = {})  - o: { key ('warning'), radius (shaft), head (length) }
  glowSprite(s, key, size = 1)  - Additive halo sprite tinted by a token (share one texture per page).

# simulations/base/kit/GeoMap.js
  CREDIT_INDIA = 'Boundary of India: Survey of India'
  PLATE_KEYS = { diverge: 'good', converge: 'bad', subduct: 'bad', transform: 'warning' }
  loadMap(names = ['land'])
  makeView(ctx, o = {})  - Fitted projection in o.box: o.kind, o.rotate, o.extent [[lon0, lat0], [lon1, lat1]], o.pad. view.at(ll) -> [x, y] | null.
  drawGlobeBase(ctx, v, c, o = {})
  drawGlobeShade(ctx, v, c)  - Rim light + night side: call after the layers, over the globe.
  drawLand(ctx, v, c, land, o = {})
  reliefImage(v, c, map, o = {})  - Elevation-shaded view box (land from the coastline, height from the 1-degree grid).
  drawIndia(ctx, v, c, india, o = {})  - India from the Survey of India layer (the only legal source of its border) + credit chip. o: { fill, stroke, lineWidth, credit }.
  drawPlates(ctx, v, c, plates, o = {})
  drawQuakes(ctx, v, c, quakes, o = {})
  drawVolcanoes(ctx, v, c, volcanoes, o = {})
  drawRivers(ctx, v, c, rivers, o = {})
  layerCache()  - const cache = layerCache(); ... cache(ctx, [stage, rot[0], rot[1], c], (o) => { drawLand(o, ...) }) Re-paints when any key part changes (...
  drawStrataBlock(ctx, c, box, o = {})  - A 2.5D cutaway block in box {x, y, w, h} (front face + top + right side).
  streamlines(field, box, o = {})  - Streamlines of field(x, y) -> [vx, vy] (px units, any scale) from a seed grid in box. Pure: same field, same lines (resume-safe);
  drawStreamlines(ctx, lines, color, t = 0, o = {})  - Marching-dash streamlines with an arrowhead each (t = scene clock; motion freezes when parked).

# simulations/base/kit/GeoLook.js
  GEO_COLOR_MAP = { ..., strata1, strata2, strata3, strata4, strata5, strata6, elevLow, elevMid, elevHigh, elevPeak, seaShallow, seaDeep, ice, magma, skyDay, skyDusk, mapLand, mapOcean }
  STRATA
  elevColor(c, m, o = {})  - Height in metres -> ramp colour. o: { seaLevel (m, default 0), top (m at full snow, default 5000) }.
  timeAt(t, axis)  - axis: { from, to (years ago, from > to), log (default true when from/to > 100) }.
  formatYears(y)

# simulations/base/SimGeo.js
  SimGeo = { d3, loadWorld, loadLayer, makeProjection, makePath, drawFeatures, makeGraticule, routeLine, project, hitTestSites, drawPin }

# simulations/base/WebGLSimulation.js
  class WebGLSimulation extends SimulationBase  - WebGLSimulation - Abstract base for three.js-driven 3D scenes. Adds renderer/scene/camera wiring on top of SimulationBase's rAF loop.
    .static CONTINUOUS = false
    .static WIDTH = 600
    .static HEIGHT = 400
    .static FOV = 50
    .static TRANSPARENT = false
    .static isSupported()
    .loadOrbitControls()
    .loadGLTFLoader()
    .setup()
    .step(dtMs)
    .renderFrame()
    .refreshTheme()
    .destroy()
```

## Design note, `Kit use:` line
`Kit use: GeoScene use - <why>; GeoTerrain use - ...` or `GeoMap use - ...`.
