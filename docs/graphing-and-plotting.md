# Plotting and Reading Function Graphs (and Plain Coordinate Points)

Three ways to put a coordinate-plane graph in front of a student: a graded question where they plot points on a function (section 1), a read-only graph of a function's curve (2.1), or a read-only graph of plain named points with no function at all (2.2) - a CBSE Coordinate Geometry question (quadrants, distance, reflections, midpoints, collinearity). All render via the real engine's `GraphPlotter` (SVG/D3) - no simulation scene, no custom canvas code, just JSON.

## 1. `plot-function@1` - the student plots the points

Use this whenever the exercise is literally "plot this line/curve" - not "look at this graph and answer a question about it" (that's the `graph` companion field, section 2).

```json
{
  "id": "q-plot-uniform-motion",
  "type": "plot-function@1",
  "stem": { "en": "A cyclist starts 1 m from a lamp post and rides away from it at a constant 2 m/s. Plot the cyclist's distance from the lamp post (in metres) for at least three different times between t = 0 s and t = 3 s." },
  "targetFunction": "2*x + 1",
  "xLabel": "Time (s)",
  "yLabel": "Distance from lamp post (m)",
  "xDomain": [0, 3],
  "yDomain": [0, 8],
  "minPoints": 3,
  "tolerance": 0.5,
  "explanation": { "en": "..." },
  "hints": [{ "en": "..." }],
  "authoring": { "status": "ai-draft", "flags": [], "reviewedAt": null }
}
```

See `examples/example-question-plot-function.json` for the full, real, validator-passing version of the file above (with `explanation`/`hints` filled in).

### Field-by-field

- **`targetFunction`** (required) - arithmetic expression in `x`, e.g. `"2*x + 1"`, `"x^2 - 4"`, `"sin(x)"`. Evaluated by the real app's sandboxed math engine. Standard operators/functions only, don't invent syntax.
- **`xDomain` / `yDomain`** (required) - `[min, max]` for the visible grid, with margin around expected points.
- **`xLabel` / `yLabel`** - write them, matching the stem's units (`"Time (s)"`, not `"x"`).
- **`minPoints`** (default `3`) - points required before "Evaluate" activates. 3 for a line, more for a curve.
- **`maxPoints`** (default = `minPoints`) - raise only if you want more points than the minimum needed to define the shape.
- **`tolerance`** (default `0.5`) - allowed y-value slack, scaled to `yDomain` (generous on `[0,8]`, tight on `[0,1000]`). Never `0` - floating-point snapping can fail a genuinely correct click.
- **`snapStep`** (default `1`) - grid rounding for placed/dragged points.
- **`connectPoints`** (default `false`) - dashed line through the student's own points as placed, before checking.

### What the student sees

Click to place a point, drag to adjust, x to remove. The real curve is hidden until Evaluate, then overlaid with each point colored green (within tolerance) or red.

### Don't

Write a `targetFunction` undefined across part of `xDomain` (e.g. `"1/x"` with `xDomain: [-1, 1]` crosses x=0) - a point placed there can never score correct.

## 2. The `graph` companion field - a read-only graph on any question

For "read this graph and answer" - a distance-time graph to interpret, "which equation matches the line shown," or a Coordinate Geometry question naming one or more points (quadrant, distance, reflection, midpoint, collinearity - section 2.2). Attaches to `mcq-single@2`/`numeric-value@1`/most other types like `image` does, shown immediately alongside the stem.

### 2.1 A function's curve

```json
{
  "id": "q-read-motion-graph",
  "type": "mcq-single@2",
  "stem": { "en": "The graph shows a runner's distance from the starting line over time. Which statement best describes their motion?" },
  "graph": {
    "functions": [{ "expression": "3*x", "label": "distance" }],
    "xLabel": "Time (s)",
    "yLabel": "Distance (m)",
    "xDomain": [0, 4],
    "yDomain": [0, 12]
  },
  "options": [ ... ],
  "correctOptionId": "a"
}
```

See `examples/example-question-graph-field.json` for the full version.

### 2.2 Plain coordinate points, no function at all

**Reach for this on any Coordinate Geometry question that names a point** - "In which quadrant does P(-8, -11) lie?", "find the distance between A(3,4) and its reflection A'," "find the midpoint of AB," "are A, B, C collinear?" Omit `functions` entirely; each point takes an optional `label` (e.g. `"A"`, `"P(3, 4)"`) drawn next to its dot - this is what makes a midpoint/collinearity/reflection question with several named points legible instead of a handful of unlabeled dots.

**Only plot points the stem already gives - never the point being asked for.** `graph` is never reveal-gated, so it's visible the whole time the student answers: showing the answer's coordinates turns "find A'" into "read the dot." An unknown-point question still gets a graph of the *given* point(s) only, with the question asking for something the picture doesn't hand over directly (a distance, an area, a proof).

```json
{
  "id": "q-reflection-distance",
  "type": "numeric-value@1",
  "stem": { "en": "Point A(3, 4) is reflected across the y-axis to produce point A' (shown in the graph). What is the distance between A and A', in units?" },
  "graph": {
    "points": [
      { "x": 3, "y": 4, "label": "A" },
      { "x": -3, "y": 4, "label": "A'" }
    ],
    "xDomain": [-6, 6],
    "yDomain": [-2, 8]
  },
  "expectedValue": 6,
  "unit": "units"
}
```

Both `A` and `A'` are safe to plot here - the graded answer is a distance, not a coordinate pair, and axes aren't drawn to a guaranteed equal x/y scale so nothing can be read off with a ruler.

See `examples/example-question-graph-labeled-points.json` for the full version. A single-point question (e.g. "which quadrant does M(-8, -11) lie in") still benefits - one labeled dot beats making the student place it mentally.

### Field-by-field

- **`functions`** (optional) - `{ expression, label? }[]`, drawn as smooth curves (same evaluation as `targetFunction`). Piecewise: `"min(50*x, 50, 200 - 50*x)"`, or give `points: [[0, 0], [1, 50], [3, 50], [4, 0]]` instead of `expression` (straight segments through the vertices, e.g. a v-t graph from a table).
  - `fill: true` shades between that curve and y = 0 (area = work, displacement); `fill: [2, 6]` shades only x = 2..6. `color`: `primary`, `success`, `error`, `muted`, or `series-1`..`series-6` for curves that are groups to tell apart (the look's categorical colours; under plain `series-1..5`).
- **`xLabel` / `yLabel`** - with units: `"Force (N)"`. **`xStep` / `yStep`** (optional) - tick spacing, e.g. `1` and `10`.
- **`points`** (optional) - `{ x, y, label? }[]`, discrete dots instead of/alongside a function. `label` (e.g. `"A"`, `"P(3, 4)"`) draws next to that one dot - distinct from the *series*-level `label` inside `functions[]`, which is a single legend entry for a whole curve. Omit `label` on a point that doesn't need naming (a single unnamed dot, or scatter-style data alongside a function).
- **`xDomain` / `yDomain`** (required) - same as section 1. At least one of `functions`/`points` required.

A question authors `graph` **or** `image` **or** `simulation` - never more than one; `graph` wins if two are set.

### 2.3 Area under a graph (work, displacement)

A force-displacement or speed-time graph with the area shaded is `graph`, not a scene. Do not print the area if the question asks for it. Full file: `examples/example-question-graph-area.json`.

```json
"graph": { "xLabel": "Displacement (m)", "yLabel": "Force (N)", "xDomain": [0, 4], "yDomain": [0, 60], "xStep": 1, "yStep": 10,
  "functions": [{ "points": [[0, 0], [1, 50], [3, 50], [4, 0]], "label": "force", "fill": true }],
  "a11yCaption": "Force rises from 0 N to 50 N over the first metre, holds to 3 m, falls to 0 N at 4 m; the area under it is shaded." }
```

## 3. On a slide: `graph` on `content-block@1`

The same `graph` object as a slide's medium (instead of `image`/`simulation`/`photoDiagram`), built up beat by beat: add `"revealAt": <beat>` to any `functions[]` or `points[]` item. Give `xDomain` and `yDomain` so the axes never move; `a11yCaption` is required; `position` like any medium. `fill`, `color` (incl. `series-1`..`series-6`), `points`-vertex functions and `xStep`/`yStep` work here too. Anything the learner drags or animates is a scene (`SimChart`), not this.

```json
"graph": { "a11yCaption": "y = x and y = 2x", "xDomain": [0, 5], "yDomain": [0, 10],
  "functions": [{ "expression": "x", "label": "y = x" }, { "expression": "2*x", "label": "y = 2x", "color": "success", "revealAt": 1 }] }
```

### 3.1 Narrated courses

Give each `functions[]` / `points[]` item an `id`: `[[show.<id>]]` keeps it hidden until that word (like a later `revealAt`), `[[focus.<id>]]` draws it bolder and fades the rest (`docs/narration.md` 8). Items with no `id` cannot be named aloud. Same for `diagram` items (show only).

## Validating

`node validators/validate.mjs <file>` checks structural fields only - it can't evaluate `targetFunction`/`graph.functions[].expression` (no math engine here), so a typo'd expression only surfaces on preview in the real app. Check by eye.
