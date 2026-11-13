# Stage 3 guide add-on: apparatus (props and balance)

When a canvas scene draws a cart, block, ramp, pulley, spring balance, ground, chair, desk, bench, bicycle, or a pan balance.

## Start from
- `examples/simulations/PropsShowcaseScene.js` (apparatus on one ground line: `propRig` + `drawCart/drawBlock/drawRamp/drawPulley/drawSpringBalance/drawGround`), `examples/simulations/science/FmaCartShowcaseScene.js` (force, mass, acceleration on a cart), `examples/simulations/maths/BalanceShowcaseScene.js` (pan balance: weighing, equations).

## Rules
- Do not hand-draw these parts: check-scene notes a hand-written copy.
- Force and velocity arrows with a value: `vectorArrow` (`SimLook.js`).
- Drag a handle: `dragHandle` (`SimDrag.js`); you draw the handle.
- Return shapes: `drawDesk -> {top, box, hands(x, facing)}`, `drawChair -> {seat, box, back}`. Any other: `node tools/sim-test/kit-api.mjs --sig <name>`.
- Read `canvas.md` for the scene itself.

## API (from kit-api, copied in)
```text
# simulations/base/kit/SimProps.js
  propRig(o = {})
  drawGround(ctx, c, rig, o = {})
  drawCart(ctx, c, rig, m, o = {})
  drawBlock(ctx, c, rig, m, o = {})
  drawRamp(ctx, c, rig, o = {})  - A wedge from ground level at `from` up to height `rise` px at `to` (units along the ground).
  drawPulley(ctx, c, x, y, r = 22)
  drawSpringBalance(ctx, c, x, y, o = {})  - Hung from (x, y) downwards: coil, case with a scale, a needle. reading/max drive stretch and needle together.
  drawChair(ctx, c, o = {})  - A chair sized for its sitter: side view (back on the side the sitter's back is) or front view (facing 0 / view 'front').
  drawSeatBench(ctx, c, o = {})  - A plain bench for a row of sitters: seat(x) gives each one's seat anchor.
  drawDesk(ctx, c, o = {})  - A desk at seated elbow height. Front view: a top and a modesty panel that hides the sitters' legs (draw it in drawFigureRow's `between`, ...
  bicycleRig(o = {})  - Pure bicycle geometry fitted to its rider. x: midway between the axles, y: the ground, dist: px travelled (wheels roll dist / r: no skid;
  drawBicycle(ctx, c, rigOrOpts = {}, o = {})  - Draw a bicycle (a rig from bicycleRig, or its options). part: 'back' (all of a side view;

# simulations/base/kit/SimBalance.js
  balanceTilt(left, right, o = {})  - Tilt for two totals: grows with the difference, saturates at max (default 0.3 rad). @opts max, scale
  drawBalance(ctx, c, o = {})  - A balance with its pivot at (x, y). @opts w, tilt, left, right, tone, face, t, standH
```
