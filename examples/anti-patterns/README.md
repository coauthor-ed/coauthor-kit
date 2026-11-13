# Anti-pattern: an illustrated slide deck wearing a simulation's clothes

`HarappanUrbanGrowthScene.bad.js.example` + `blk-l04-s01.bad.json` is a real
agent-generated pair, kept as the negative half of a before/after case study.
The good half is now two blocks: `../blocks/blk-example-sim-history-map.json`
+ `../simulations/HarappanRegionMapScene.js` (simulation only), then
`../blocks/blk-example-sim-history-images.json` - six real images via
`reveal.images`, handing off to `../simulations/HarappanCityPlanScene.js`
for one interactive beat. Same lesson, same facts. Read both pairs side by
side, not just this file.

## What's wrong with the bad pair, specifically

**The content is split backwards.** Every beat's `markdown` stays vague
("cities didn't appear overnight") while every concrete fact - dates,
quantities, the 1:2:4 ratio, the Great Bath's dimensions - got pushed into
the scene's on-canvas card. That's `AGENTS.md` rule 11 inverted: the
simulation explains, at length, in full sentences, in a hand-rolled
`_wrapText`-driven "pedagogical card"; the slide labels. It should be the
other way round. This isn't a per-scene style slip - the good pair moves
every one of those facts back into `markdown`, and the scene never draws a
sentence, only a name or a number.

**It's four unrelated dioramas, not one simulation.** `STAGES[0..3]` are four
independently-coded full-canvas illustrations swapped wholesale via a
`stageSelect` dropdown - a hand-rolled slideshow living inside a simulation.
Most of these beats are genuinely discrete pictures, not one evolving
visual - the good pair uses `reveal.images` to swap a real image in per beat
natively, and keeps a simulation only for the one beat that's actually
interactive (see `docs/simulation-authoring.md`'s hybrid section).

**Interactivity is decorative.** "Stack Brick Course" and "Simulate Drain
Flow" are cosmetic triggers with no consequence. The good pair's one
surviving simulation beat has exactly one control - a drain-flow toggle -
because nothing else earned its place once the explaining moved to real
images.

**A map claim, drawn as a mood shot instead of a map.** Stage 1's "1,500
sites across 1.5M km²" is exactly the case `docs/simulation-authoring.md`
§3.1 names for `SimGeo.js` - the bad scene draws a decorative desert/river
gradient instead. The good scene uses `SimGeo.loadWorld()` + real projected
site pins.

**Invented, dead color tokens.** `COLOR_TOKEN_MAP` declares `--sim-brick`,
`--sim-citadel`, `--sim-drain`, `--sim-terracotta`, `--sim-river`,
`--sim-bath` - none exist in `sim-theme.css`, so every one always renders its
JS fallback hex, identical in light and dark. Worse: `this.colors` is never
even read anywhere in the file (every color is a raw inline hex literal) -
the theming plumbing is entirely dead. The good scene uses only real,
existing tokens (`--sim-bg-deep`, `--sim-label`, `--sim-accent`,
`--sim-success`, `--sim-warning`, `--sim-map-*`).

**Gradients instead of flat shading.** `SimDrawUtils.js`'s own comment marks
`shade()` as "the one allowed substitute for a structural gradient... two-tone
flat shading instead of `createLinearGradient`" - the bad scene uses
`createLinearGradient` throughout for skies, water, ground. The good scene
uses `SimDraw.shade()`.

**A call to an API that doesn't exist.** `this.setControlLabel?.('actionBtn', ...)`
- `setControlLabel` isn't defined anywhere in the real engine or this kit's
base classes, and `actionBtn` isn't even one of the scene's own `CONTROLS`
ids (`brickBtn`/`drainBtn` are). The optional-chain silently no-ops; four
label variants never reach the UI. Not a typo to fix - a sign the control
surface needs to be exactly what `static CONTROLS` declares, nothing implied.

**A broken control.** `stageSelect`'s `options` use `{ id, label }` instead of
`{ value, label }` - `simulationHost.js` reads `opt.value`, so every option
renders `value="undefined"` and the dropdown never actually changes anything.
See `SKILL.md`'s simulations section for the correct shape.

**A silent content bug.** `_wrapText` never returns a value, but the
pedagogical card chains its return (`curY = this._wrapText(...)`) to
position the next section. After the first of three sections, `curY` becomes
`NaN` and every later `fillText` silently no-ops - two of three bullet
sections never render, on every stage. Caught by inspection, not by any
tool; `tools/sim-test`'s `draw` check only catches an *invalid* fillStyle
this way, not a broken layout chain.

## Using this pair

Don't copy `HarappanUrbanGrowthScene.bad.js.example` for anything. If you
recognize your own draft heading this direction - a scene accumulating
sentences, or a slide's `markdown` staying suspiciously short next to a
"complete-looking" simulation - that's the tell. Move the facts into
`markdown`, cut the scene back to names and numbers, and check whether the
thing you're building is genuinely one evolving visual, or secretly several
discrete pictures that `reveal.images` should be carrying instead.

## Anti-pattern: reimplementing canvas coordinates in DOM

`AbsolutePositionedScene.bad.js.example` is the failure mode a `DomSimulation`
scene (docs/simulation-authoring.md §3.3) actually falls into: writing DOM
the same way canvas gets written, `position: absolute` + hand-picked
`left`/`top` pixel values standing in for `ctx.fillText(x, y)`. The fix,
side by side, is `../simulations/ShiftSubtractScene.js` - read the two
together, not just this one. Same content shape (labelled equation cards),
same author intent, opposite technique.

**Text still overflows - nothing here ever measured it.** Every `.box` sets
no `width`/`max-width`/`white-space: normal` at all; a label longer than the
one string this file happens to author (a translation, a bigger number)
runs straight past the box's edge with `white-space: nowrap`, silently - the
exact overflow bug canvas's own hand-computed text positions produce,
just moved into CSS. `ShiftSubtractScene.js`'s `.eq-card` sizes itself around
its actual content (`min-width` only, no fixed width) - there's nothing to
overflow because nothing was ever given a size independent of its content.

**Alignment still drifts, and by hand.** `shift`'s `left: 380px` is a
comment away from admitting it: "picked to sit just to the right of `top`
at THIS one label's width." Change either label and the two boxes overlap
or gap - there's no relationship between them for the browser to maintain,
because there's no layout, just two numbers that happened to work once.
`ShiftSubtractScene.js` never computes an x-coordinate anywhere - its cards
stack in `.eq-stack` (`display: flex; flex-direction: column; align-items:
center;`), so alignment is a browser invariant, not an author's arithmetic.

**Nothing reflows.** Resize the host, or the text inside these boxes for any
reason, and every position is still whatever was authored - `top`/`left`
are start-once absolute coordinates, exactly as fixed as a canvas draw call
at a given `x, y`. `ShiftSubtractScene.js`'s cards, digit spans, and the
magnifier's shared grid all resize with their content and their container
by construction.

**The one legitimate use of `position: absolute` in a DOM scene** is an
overlay pinned relative to its own container - a label over a `<canvas>`
child in the hybrid recipe (docs/simulation-authoring.md §3.3), or
`ShiftSubtractScene.js`'s own `.mag-guides` (absolute only to sit *on top of*
its parent grid, `inset`-based, not an authored `left`/`top` pixel pair).
The rule: if a DOM scene contains a per-element `left`/`top` pixel value
outside that one case, it should have been flex or grid.
