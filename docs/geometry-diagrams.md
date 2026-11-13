# Geometry Figures: the `diagram` Companion Field

A labeled synthetic-geometry figure (a triangle, angle-chase, ray diagram,
circle) attached to any question via `diagram`, rendered by the real engine
(SVG, GeometryDiagram.js) from plain JSON - no image file, no external
drawing tool. This is what `docs/copyright-and-sourcing.md` means by
"generate a new, original SVG" for a figure: write the points, the engine
draws it. Works on `mcq-single@2`, `numeric-value@1`, and
`semantic-descriptive@1`/`@2` - attaches like `image`/`graph` does, shown
immediately next to the stem, never reveal-gated.

There is no constraint solving - you place every point's (x, y) yourself,
same as placing vertices in any drawing tool. Coordinates are plain numbers,
y increasing downward (like a page), arbitrary units. Leave `viewBox` unset
and the engine fits one to your points automatically with padding.

## Shape

```json
{
  "diagram": {
    "points": [
      { "id": "A", "x": 150, "y": 20 },
      { "id": "B", "x": 60, "y": 150 },
      { "id": "C", "x": 260, "y": 150, "label": "C" }
    ],
    "segments": [
      { "from": "A", "to": "B" },
      { "from": "B", "to": "C", "extend": "end" }
    ],
    "angles": [
      { "at": "B", "from": "A", "to": "C", "label": "70°" }
    ],
    "rightAngles": [ { "at": "B", "from": "A", "to": "C" } ],
    "parallelMarks": [ { "from": "A", "to": "B", "count": 1 } ],
    "circles": [ { "center": "A", "radius": 40 } ],
    "polygons": [ { "points": ["A", "B", "C"], "fill": "primary" } ],
    "a11yCaption": "Triangle ABC with a right angle at B."
  }
}
```

See `examples/example-question-semantic-descriptive-geometry.json` for a
full worked shape (the exterior-angle-of-a-triangle question, angle ABD =
110, angle CAE = 135, find angle ACB).

## Field-by-field

- **`points[]`** (required) - `id` is a local handle only, referenced by
  every other field below; never drawn itself. `label` (defaults to `id`)
  is the text drawn next to the point - the engine auto-places it outward
  from the figure's centroid, or set `labelOffset: [dx, dy]` yourself if a
  label collides with a line. Instead of `x`/`y`, a point can give
  `onCircle` (a `circles[].id`) + `angleDeg` to sit on that circle's
  circumference - no more hand-computing `cx + r*cos(theta)` for a chord/
  cyclic-quadrilateral/inscribed-angle figure. `angleDeg`: 0 = east/right,
  90 = south/down (increasing clockwise-on-screen, since y is down) - same
  convention `circles[].startDeg`/`endDeg` use below. The circle it
  references must itself use a plain (non-`onCircle`) center point - one
  level of indirection only.
- **`segments[]`** - a straight line between two points. `extend`:
  `"start"`/`"end"`/`"both"` draws it past that endpoint with an arrowhead
  (a ray or line, e.g. "CB produced to D"). `style: "dashed"` for a
  construction line. `ticks: 1-3` marks the segment as equal-length to any
  other segment with the same tick count (standard equal-sides notation).
  `label` (e.g. `"6 cm"`) draws text beside the segment's midpoint - override
  the default outward offset with `labelOffset: [dx, dy]` if it collides
  with something.
- **`polygons[]`** - `points: [id, id, ...]` draws a closed shape through
  those points (auto-closed back to the first) - the fill-capable
  convenience over declaring one `segments[]` entry per side (still fine to
  do both - e.g. a filled polygon plus a `segments[]` entry that adds tick
  marks to one side). `fill` (see below) shades it; omit for outline-only.
  `style: "dashed"` for a construction outline.
- **`angles[]`** - an arc at `at` between the rays toward `from` and `to`
  (which don't have to be segment endpoints - any named point works, so a
  ray diagram like "angle POQ" at a shared vertex O is just two point ids).
  Always draws the interior (<=180 degree) angle. Several `angles[]` at the
  same `at` auto-stack outward so they don't overlap - no radius math
  needed from you. `label` is optional (a bare arc with no label is fine
  for "mark the angle" without giving its value away). To mark two
  *different* angles as congruent without giving away the value - the
  angle counterpart of a `ticks` match on sides - give both the same label
  string (e.g. both `"x"`, or both `"*"`); there is no separate arc-count
  primitive, a matching label already does the job.
- **`rightAngles[]`** - the small square marker at a vertex, same
  `at`/`from`/`to` shape as `angles[]`.
- **`parallelMarks[]`** - the arrow-chevron marks on a segment that denote
  "parallel to any other segment with the same `count`."
- **`circles[]`** - `center` (a point id) + `radius` (a number in the same
  units as your coordinates), or `through` (a point id on the
  circumference) instead of `radius`. Give it an `id` if a `points[]` entry
  needs to sit `onCircle` it. `startDeg`/`endDeg` (same angle convention as
  `points[].onCircle` above) draw only that arc instead of the full
  circumference - for a compass-construction mark, or highlighting one arc
  of a circle-theorem figure; sweeps from `startDeg` to `endDeg` in the
  increasing-angle direction, so swap them for the other way around.
  `fill` (see below) shades it - the whole disk for a plain circle, or the
  pie-slice **sector** (center to arc) when `startDeg`/`endDeg` are also
  given. There's no chord-bounded **segment** shading (as opposed to a
  sector) - not needed for a CBSE 9/10 sector-area question.
- **`fill`** (on `circles[]`/`polygons[]`) - a semantic color key:
  `"primary"`, `"success"`, `"error"`, or `"muted"` - resolved against this
  app's own light/dark theme tokens (never a hex code - same convention the
  `graph` field's own `series[].color` uses), as a soft tint that shades a
  region without hiding the lines/labels drawn over it. Omit for an
  outline-only shape.
- **`a11yCaption`** - a one-sentence text description read by screen
  readers (the figure's `<title>`) - always write one, the SVG itself
  conveys nothing to a non-visual reader otherwise.
- **`viewBox`** - `[x, y, width, height]`, only if you need to override the
  automatic fit (e.g. to leave room for a label that hangs outside the
  points' own bounding box).
- **`position`** - `"right"` (default) / `"left"` / `"above"` / `"below"`,
  same convention as `image.position`.

## Typing angle/degree/triangle symbols in an answer

A student answering a geometry question in `semantic-descriptive@1`/`@2`
needs `angle`/`degree`/`triangle`/etc. symbols in their own free-text
answer, not just in your authored figure - these aren't on a normal
keyboard. The "Math tools" toggle's symbol row (next to Sub/Super) has a
Geometry row (angle, degree, triangle, congruent, similar, parallel,
perpendicular, circle) that inserts the plain character at the cursor.
Nothing to author - it is always available once math tools are toggled on;
set `"answerMode": "math"` on the question if you want it visible by
default instead of behind the toggle.

**Never pair this with `expectedMath` on the same rubric point.** See
`descriptive-questions-and-cbse-marks.md`'s "Never use `expectedMath` on a
geometry rubric point" - the symbolic-equivalence engine reads algebra, not
synthetic geometry, and misreads notation like `AB = AC` as a product of
two variables. Grade geometry proofs on the plain `accepted[]` tier, exactly
like the example question above does.

## On a slide: `diagram` on `content-block@1`

The same `diagram` object as a slide's medium, revealed beat by beat: `"revealAt": <beat>` on any `points`, `segments`, `polygons`, `angles`, `rightAngles`, `parallelMarks` or `circles` item (a construction step by step, a proof's marks one at a time). The frame is the whole figure's, so nothing moves; anything naming a hidden point stays hidden; `a11yCaption` is required. A point the learner drags is a scene (`SimGeom`).

## Not what this is for

No 3D - Surface Areas & Volumes' solids (cube, cylinder, cone, sphere) need
a pseudo-3D/isometric drawing with hidden-edge conventions, a different
renderer than this flat 2D one. No coordinate axes either - a basic
Coordinate Geometry figure (plot a point, show the axes) is the `graph`
companion field's job (`docs/graphing-and-plotting.md`), not `diagram`'s.
