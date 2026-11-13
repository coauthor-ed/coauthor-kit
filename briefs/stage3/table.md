# Stage 3 guide: table (Component: Table)

A labelled grid of counts or values the learner acts on: a header row and column, optional margins (totals), cells marked, a row or column emphasised, a cell hidden for a predict beat. SvgScene. Read `svg.md` first.

## Table part or markdown table?
- Nothing to operate (a table to read): a markdown table in the slide text. Not a scene.
- The learner picks a row, taps a cell, fills a hidden cell, or the beat marks the cells a share is computed from: this part.
- A grid of words or claims (compare matrix, claim vs evidence): `boards.md` / `dom.md`, not this.

## Start from
- `examples/simulations/data/TableHighlightScene.js` (SvgScene + `tableSpec` + `tableSvg`): copy it. Beats: totals, pick a row to read its share, find a hidden cell from the margins.

## Rules
- Build the spec for the stage size on every paint (`tableSpec({ rect, rows, cols, cells, ... })` in stage px). Text is never scaled down; a narrow stage gets a narrower header column, not smaller type.
- Margins come from `totals: true | 'rows' | 'cols'`: summed by the spec. Never type a total, a share or a hidden cell's answer; read them with `T.value(r, c)`.
- Mark what the beat is about and nothing else: `hi` for the cells in the sum, `band` for the row or column being read, `dim: true` to fade the rest. Under plain the beat's cells take `--sim-annot` or series 1..5, the rest grey.
- Predict: `hidden` cells show '?'; put the learner's pick in `guess`; on a right pick drop it from `hidden`, pass the key in `fresh` (it pops) and call `celebrate()` once. A wrong pick stays, dashed, with the rule in the head chip.
- Taps: `pointerDown(p)` -> `T.cellAt(p)` -> `{ r, c, kind }`. Also give a keyboard path: a choice group in the head row (`flowChoiceHtml` + `bindFlow`, SimFlowDom), `CONTROLS = []`.
- Label sample data as illustrative (a note under the table or `caption`). Units and the denominator in the head chip ('54 of 80 passed = 68%').

## Table API
```text
const T = tableSpec({ rect, rows, cols, cells: [[..], ..], rowTitle, colTitle, totals, totalLabel, fmt, headW, rowH })
T.nr T.nc   T.value(r, c)   T.text(r, c)   T.cell(r, c) -> { x, y, w, h, cx, cy }   r -1 header row, c -1 header column
T.band({ row } | { col })   T.cellAt(p) -> { r, c, kind: cell | total | grand | rowHead | colHead | corner }   T.key(r, c) -> 'r,c'
Margins: c === T.nc is a row total, r === T.nr a column total.
tableSvg(T, { hi: [{ r, c, tone, ring }], band: [{ row | col, tone }], dim, hidden, guess: { key: text }, guessTone, fresh, caption, label }) -> { svg, over }
TABLE_CSS   add it to css()
```
Tones: series numbers 1..8 or a token name ('good', 'warning', ...). Lip, rims and corners follow the look. A hidden real table is written for screen readers. Full list: `node tools/sim-test/kit-api.mjs simulations/base/kit/SimTableSpec.js simulations/base/kit/SimTable.js`.

## Design note, `Kit use:` line
`Kit use: SvgScene use - <why>; SimTable use - tableSpec + tableSvg (hi, band, hidden) ...`.
