# Stage 3 guide: Venn and set diagrams (Component: Venn)

Rings in a universal box U, regions, items sorted into regions, a set expression shaded. SvgScene. Read `svg.md` first. A canvas scene (SimScene) uses `SimVennCanvas.js` instead: same spec and options (`examples/simulations/VennCanvasShowcaseScene.js`).

## Start from
- `examples/simulations/maths/VennShowcaseScene.js` (SvgScene + `vennSpec` + `vennSvg` + `regionSweepSvg`): copy it. Beats: items pop into two rings, an expression shades with a sweep, three rings with region names, tap a region to read it.
- Drag items into regions: `examples/simulations/maths/PickRegionShowcaseScene.js` (`simPick` with `targetAt: (pt) => V.regionOf(pt)`).
- Items that fly in and a spotlight on one region: `maths/SvgMotionShowcaseScene.js` (`flyChip`, `spotlight` takes a region path as it is).

## Rules
- Rebuild the spec for the stage size each paint (`vennSpec({ box, rings })` in stage px): portrait stacks two rings and keeps full-size chips. Never hard-code coordinates.
- Items are chips in `V.slots(mask, n)`: hex-packed, no overlap, wholly inside the region. Do not place chips by hand. Which region an item is in comes from `V.regionOf(p)` or a rule you compute (`maskOf`), never asserted.
- Shade with `vennSvg(V, { shade: expr })` and animate with `regionSweepSvg` (call it each `animate()` pass while it shows; at u = 1 paint the shade with `vennSvg`). Set expressions go through `V.exprMask("(A|B)'")`; never list masks by hand.
- Region tags: `tags: true` on wide stages, `tags: 'short'` on narrow ones (3 rings: `A, B`). Counts: `counts: { [mask]: n }`, `ringCounts`. A count shown must be tallied from the items (`V.tally`), not typed.
- Set symbols (union, intersection, minus, prime) need the body font: add `cls: 'vn-sym'` to a big chip showing them, and `VENN_CSS` to `css()`. Glyphs in source are `\u` escapes (`VENN_UNION` ...).
- 1-3 rings (4 with explicit centres). A subset ring wholly inside another is fine with explicit `cx, cy, r`.
- Fly an item in with `flyChip` / `flyMany` (SimFlySvg), not a hand tween; ring tones are series numbers (default 1, 4, 3, 5; plain 1, 2, 3): do not recolour regions.

## Venn API
```text
const V = vennSpec({ box: { x, y, w, h }, rings: [{ id: 'A', label }], overlap, axis, anchors })
V.regionOf(p) -> mask | null     V.tally(points) -> { mask: n }     V.region(mask) -> { name, short, expr, sym, path, anchor }
V.regions()     V.slots(mask, n, { r, gap }) -> [{ x, y }]     V.exprMask(expr) -> Set<mask>     V.regionPath(masks) -> d
vennSvg(V, { shade, shadeTone, tones, tags, counts, ringCounts, labels, boxLabel, focus, tint }) -> { svg, over }
regionSweepSvg(live, key, V, masks, u, { tone, angle, hatch })     VENN_CSS
```
Masks: bit i is ring i (A = 1, B = 2, C = 4); 0 = in U, in no ring. Full list: `node tools/sim-test/kit-api.mjs simulations/base/kit/SimVennSpec.js simulations/base/kit/SimVenn.js`.

## Design note, `Kit use:` line
`Kit use: SvgScene use - <why>; SimVenn use - vennSpec + vennSvg + slots ...`. Add `SimFlySvg use - flyMany` etc. for the motion you took from the `svg.md` table.
