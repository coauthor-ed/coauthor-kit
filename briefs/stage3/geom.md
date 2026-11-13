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
