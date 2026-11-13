# Photo Relationship Diagrams: the `photoDiagram` Companion Field

A labeled diagram built from real, license-recorded photos - a food web, a
"one broad name hides several species" comparison, a historical event chain
- attached to `content-block@1` via `photoDiagram`, rendered by the real
engine (real DOM + an SVG connector layer, `PhotoDiagram.js`) from plain
JSON. The photo-node counterpart of `docs/geometry-diagrams.md`'s `diagram`
field, for content a plain `reveal.images` sequence can't express because
several photos need to be visible **at once** with labelled connections
between them.

Read `docs/simulation-authoring.md`'s "The `CONTROLS: []` smell" section
first - this field exists precisely for the case that section describes:
real photos, a real relationship, but nothing a student manipulates. If
there IS something to manipulate, that's a `DomSimulation` scene instead,
not this.

There is no auto-layout, same as `diagram`: you place every node's (x, y)
yourself. Leave `viewBox` unset and the engine fits one to your nodes'
bounding box automatically.

## Shape

```json
{
  "photoDiagram": {
    "nodes": [
      { "id": "sun", "x": 300, "y": 0, "kind": "label", "label": "Sunlight", "icon": "sun" },
      { "id": "plant", "x": 120, "y": 180, "kind": "photo",
        "src": "media/L01/flowering-plant.jpg", "alt": "A red hibiscus flower",
        "label": "Flowering plant", "tone": 3 },
      { "id": "pollinator", "x": 480, "y": 180, "kind": "photo",
        "src": "media/L01/pollinator.jpg", "alt": "A bee visiting a flower",
        "label": "Pollinator", "tone": 2 }
    ],
    "edges": [
      { "from": "sun", "to": "plant", "style": "arrow" },
      { "from": "plant", "to": "pollinator", "label": "food", "style": "arrow", "tone": 1 },
      { "from": "pollinator", "to": "plant", "label": "pollen", "style": "arrow", "tone": 1 }
    ],
    "a11yCaption": "Sunlight reaches a flowering plant, which exchanges food and pollen with a pollinator."
  },
  "position": "right"
}
```

Both go directly on the `content-block@1` block, next to (never together
with) `image`/`simulation` - `photoDiagram` is mutually exclusive with both;
the validator FAILs a block carrying more than one.

See `examples/blocks/blk-example-photo-diagram.json` for a full worked
shape.

## Field-by-field

- **`nodes[]`** (required, non-empty) - `id` is a local handle referenced by
  `edges[].from/to`, never drawn itself.
  - `kind: "photo"` - a real photo in a tinted ring/card. `src` (required,
    bundle-relative under `media/L0N/`, same convention as `image.src`),
    `alt` (required - a photo node with no `alt` is a validator FAIL, not a
    warning: this is the one accessibility win a hand-composited flat image
    could never give you, don't throw it away). `shape`: `"circle"`
    (default) or `"square"` (a softly rounded square - use for a photo whose
    subject a circular crop would cut awkwardly). `size`: the node's
    diameter/side, in the same arbitrary units as `x`/`y` (default `90`) -
    bigger for a photo where fine detail matters (a species comparison),
    smaller for a supporting node in a larger web.
  - `kind: "label"` - a small pill, no photo (e.g. "Sunlight", "Leaf
    litter", "Soil" - a concept that doesn't need or have a photo of its
    own). `label` (required). `icon`: one of `sun`, `leaf`, `soil`,
    `question`, `fruit`, `nest` - the fixed built-in icon set (mirrors
    `sim-theme.css`'s closed-palette reasoning: a small, curated set beats
    letting every author invent one-off glyphs). Need one that isn't listed?
    Flag it in `GENERATION-LOG.md` rather than approximating with the wrong
    icon - the set grows by a real engine change, same as `--sim-series-N`.
  - `tone` (1-6, either kind) - picks one of `theme.css`'s closed
    `--content-series-1..6` categorical tokens. Give visually/conceptually
    *different* nodes different tones - that's the whole reason a tone
    system exists (four species in a comparison ARE different; four steps
    in one process usually aren't - leave those untoned, or all the same
    tone, rather than assigning colors with no meaning behind them).
  - `revealAt` (either kind, 0-indexed beat, default `0`) - progressive
    reveal: the node only draws once the block's `_step` reaches this beat,
    and stays drawn from then on (cumulative/sticky, like `mediaStep` -
    deliberately NOT `reveal.images`'s per-step-id swap, which reverts on
    any step with no matching id; see `docs/simulation-authoring.md`'s
    'CONTROLS: []' section for why that distinction matters here). The
    auto-fit `viewBox` is recomputed from only the currently-revealed nodes
    at each beat, so an early beat with fewer nodes gets a tighter crop -
    **this is how a multi-part relationship stays legible**: don't lay out
    every node across the full diagram's eventual extent and rely on `size`
    alone to make an early beat's few photos readable, split the content
    across beats with `revealAt` instead and let each beat's crop do the
    work. Give a whole beat's worth of nodes the same `revealAt`, matching
    that beat's `<!-- STEP -->` position (0-indexed, same counting as
    `mediaStep`).
- **`edges[]`** - a connector between two node ids. `label` draws text at
  the midpoint (offset to whichever side the line's direction implies). Two
  edges between the *same* pair of nodes in opposite directions (e.g. "food"
  one way, "pollen" the other) is `doubleArrow` with one combined label
  (`"food ⇄ pollen"`), not two separate `arrow` edges - there's no
  parallel-edge router here, so two overlapping edges just draw on top of
  each other with both labels crowding the same midpoint. `style`:
  `"arrow"` (default, arrowhead at `to`),
  `"doubleArrow"` (both ends), `"line"` (neither - a plain connector with no
  directional claim, e.g. a family-tree "branches into" line). `tone`
  (1-6) colors the line/arrowhead/label instead of the default muted
  `--text-muted`. `revealAt` works the same as on a node, with one
  addition: an edge never draws before BOTH its endpoints are visible,
  even if its own `revealAt` (or the unset default `0`) would otherwise
  allow it sooner - you only need to set it explicitly to delay a
  relationship *further past* both nodes already being on screen (show two
  photos one beat, draw the arrow between them the next).
- **`a11yCaption`** (required, unlike `diagram`'s optional one) - a
  one-sentence description of the diagram's *relationships*. Each photo
  node already carries its own `alt` (individually screen-reader-navigable -
  the container is `role="group"`, not `role="img"`, specifically so those
  aren't flattened away), but nothing else states how the pieces connect;
  this is the one place that does.
- **`viewBox`** - `[x, y, w, h]`, only if you need to override the
  automatic fit (e.g. to leave room for a node whose label hangs outside
  its own bounding box).
- **`position`** (on the block, not inside `photoDiagram`) - `"right"`
  (default) / `"left"` / `"above"` / `"below"`, same convention as
  `image.position`. No `"background"`/`"flow"` tier (those are `image`-
  specific chrome this field doesn't need).

## Not what this is for

No interactivity of any kind - a `photoDiagram` renders once and sits still.
The moment there's something to manipulate (re-sort these by a rule, drag
this here), it's a `DomSimulation` scene, not this - see
`docs/simulation-authoring.md`. No auto-layout - if you're placing more than
maybe 8-10 nodes and fighting overlap, the content probably wants splitting
across two simpler diagrams (or two blocks) rather than one crowded one.
