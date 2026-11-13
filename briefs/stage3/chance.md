# Stage 3 guide: chance (Component: Chance)

Dice, coins, cards, spinners, bags, outcome grids, trees, and repeated trials. Read `svg.md` first.

## Start from
- `examples/simulations/maths/ChanceShowcaseScene.js` (SvgScene): copy it.
- A long run so that frequency emerges (seeded, canvas strip): `examples/simulations/maths/LongRunFrequencyShowcaseScene.js` (a SimScene; `SimChanceTrials.js`). A predict-then-observe gate: `examples/simulations/maths/CatchUpPredictShowcaseScene.js` (a SimScene; `SimPredict.js`).

## Rules
- Randomness is seeded (`trialRun`, `mulberry32`); never `Math.random()` for a result the slide quotes; never crypto.
- A frequency printed on screen is computed from the trials drawn.

## Manual and API (from kit-api, copied in)
```text

SimChance - probability apparatus as SVG in the DOM (SimSvg stage). All
randomness is the scene's and seeded (mulberry32 in SimLook): same seed,
same draws on every mount. Never crypto.*. Each part returns { svg, over }.

  dieSvg(x, y, s, face, { tone, tilt })            a die centred at (x, y), side s
  coinSvg(x, y, r, 'H' | 'T')                        a coin (no real currency design)
  cardSvg(x, y, w, rank, suit, { back, hi })        a playing card (suit S H D C), drawn pips, no deck art;
                                                     the rank corner shows from w 50 (label a small grid instead)
  cardGrid(rect) -> { cell(rank, suit), ranks, suits }   13 x 4 layout
  outcomeGrid(rect, rows, cols) -> { cell(i, j), head(kind, n), each(fn) }
  outcomeGridSvg(g, { label(i, j), tone(i, j), heads: [rowHeads, colHeads] })   heads: text or (x, y, s) => svg
  spinnerSvg(x, y, r, sectors, angleDeg, { spin })   sectors [{ w, tone, text }]; spin: CSS-animate to angleDeg
  spinnerSector(sectors, angleDeg) -> index under the top pointer
  bagSvg(x, y, balls, { r, seed })                   a sack with balls [{ tone, n }] heaped in its mouth
  treeLayout(levels, { rect }) -> { nodes, edges, leaves }   levels [[{ text, p, pText }], ...] (repeat per parent)
  treeSvg(t, { path, probs, grow })                 path: branch indices to highlight
  lassoSvg(pts, { tone, pad, text })                 a loose loop round points (an event)
  CHANCE_CSS                                         spinner spin transition
Tones: series numbers 1..8 or 'good' | 'bad' | 'warning' | 'accent'.
```
```text
# simulations/base/kit/SimChance.js
  dieSvg(x, y, s, face, o = {})  - A die showing face 1..6. @opts tone, tilt
  coinSvg(x, y, r, side)  - A coin with an embossed H or T.
  cardSvg(x, y, w, rank, suit, o = {})  - A playing card w wide, 1.4 w tall, centred at (x, y). @opts back, hi
  cardGrid(rect)  - 13 ranks x 4 suits in rect.
  outcomeGrid(rect, rows, cols)  - rows x cols cells in rect, with a 40 px head row and column.
  outcomeGridSvg(g, o = {})  - Tiles popping in diagonally; tone(i, j) lights a cell (null = plain). @opts label, tone, heads
  spinnerSector(sectors, angleDeg)  - Index of the sector under the top pointer when the disc is turned by angleDeg (clockwise).
  spinnerSvg(x, y, r, sectors, angleDeg = 0, o = {})  - A spinner turned by angleDeg; spin: true animates from its last angle (CSS). @opts spin
  bagSvg(x, y, balls, o = {})  - A cloth sack, open at the top, balls heaped in its mouth. @opts r, seed
  treeLayout(levels, o = {})  - Tree layout, left to right; nodes carry path, text and product probability. @opts rect
  treeSvg(t, o = {})  - A tree: branches draw on level by level (grow), `path` highlights one route. @opts path, probs, grow
  lassoSvg(pts, o = {})  - A loose dashed loop round points. @opts tone, pad, text
  CHANCE_CSS  - The spinner's spin (a CSS transition on the disc's rotation). Add it to the scene CSS.

# simulations/base/kit/SimChanceTrials.js
  trialRun(o = {})
  trialStripCanvas(ctx, c, run, o = {})  - The latest draws as a strip of dots in rect { x, y, w, h }; tones maps outcome -> tone (series number or colour key).

# simulations/base/kit/SimPredict.js
  predictGate(scene, o = {})
```

## Design note, `Kit use:` line
`Kit use: SvgScene use - <why>; SimChance use - <why>`.
