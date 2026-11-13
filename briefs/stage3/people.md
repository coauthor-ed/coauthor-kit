# Stage 3 guide add-on: people and animals

When the scene needs a person doing the work, a class, a crowd, a seated person, a cyclist, or an animal. Design the object first; add the person after.

## Start from
- `examples/simulations/FigureShowcaseScene.js` (a person with a pose), `examples/simulations/FigureGroupsScene.js` (by role, rows, crowds, ringing k of n), `examples/simulations/SeatedCycleScene.js` (seated, cyclist), `examples/simulations/FigurePosesScene.js`.
- Animals: `examples/simulations/AnimalSheetScene.js`, `examples/simulations/AnimalFieldScene.js` (cow, goat, sheep, dog, cat, deer, tiger, elephant: stand, walk, graze, lie).

## Rules
- Give the pose and where the hands and feet go (`hands`, `feet`, `ground`), never bones or joint maths; the held object goes in `between`. A hand with a world grip curls round it (a `push` presses with an open palm); the near hand of `point` points; the rest are open. The face (the cute recipe: big eyes with a glint, blush, a small smile), the rim, the shading and the shoes are the kit's: never draw a person's parts yourself.
- By role: `figureFor(this, { role, pose, scale })` (throws on a typo, never a stick person). The 12 roles: student, teacher, adult, elder, child, worker, shopkeeper, doctor, nurse, voter, farmer, police; a "parent" is an `adult`. Rows and queues: `drawFigureRow`. Crowds, voters: `drawCrowd` / `drawPersonGlyph`. Count k of n: `highlightFigures`.
- Return shape: `figureMetrics(H, build) -> {deskTop, seatSit, seatDrop, reach, ...}` (all px; one `node -e`, never by hand). A student sitter is `build: 'teen'`.
- A numeric `coat` is a theme series slot (1..8), not a grey or brown: pass a colour for a natural coat, or omit it for the kind's default.
- A portrait of a real person is an image, not a figure.
- Use supplied character art as it is (fill under its line art only).

## API (from kit-api, copied in)
```text
# simulations/base/kit/SimFigure.js
  ik2(ax, ay, tx, ty, l1, l2, side, o = {})  - Two-bone IK with a fixed hinge side: the joint sits on the (-uy, ux) side of the root->end line for side = +1.
  figureMetrics(height = 170, build = 'adult')  - Body sizes in px for a figure of this height and build, for props that must fit it: seatSit (ground to a seat surface with thighs level),...
  solveFigure(spec)  - Pure pose solve (see the header): same spec, same joints; nothing is cached or timed.
  skinFor(i)  - Varied tones for person i in a group (medium tones first).
  figureLook(c, o = {})  - Resolved colours for a figure. o: { skin 0..3 | colour, hair 0..2 | colour (black, brown, grey), hairStyle 'short'|'long'|'bun'|'curly'|'...
  paintFigure(ctx, c, sk, look = {}, o = {})  - Paint a solved figure; layer 'back' | 'mid' | 'front' | 'all' (see the header for the order).
  drawFigure(ctx, c, spec, look, o = {})  - Solve and paint in the safe order: back, behind(ctx, sk), mid, between(ctx, sk), front. Returns sk (anchors for ropes, chips, crates).
  walkPhase(dist, height, kind = 'walk')  - Cycle phase 0..1 from distance travelled, so planted feet do not slide.
  drawPersonGlyph(ctx, c, x, y, h, o = {})  - A bust icon for crowds, voters and counts: head and shoulders in ONE scene colour, no skin tone. (x, y) = base centre;
  POSE_NAMES = [...Object.keys(P), 'throw']
  ROLE_NAMES = Object.keys(ROLES)
  groupLook(c, i = 0, o = {})  - Look for person i of a group: skin from skinFor(i), hair style and colour and a top from the series tokens all derived from i (same every...
  figureFor(scene, o = {})  - A role and a pose in, a sized spec out (pass it straight to drawFigure; its look rides along as spec.look).
  drawFigureRow(ctx, c, o = {})  - A row of people on one ground line, wrapping into rows behind (each back row 0.3 h higher, nudged half a step so faces show between).
  crowdLayout(o = {})  - Pure layout for drawCrowd: a seeded scatter in rect, back people smaller (depth), no face covered by more than maxCover of its area by an...
  drawCrowdItems(ctx, c, items, o = {})  - Paint the people of a crowdLayout() result (back to front). drawCrowd = layout (cached) + this. Returns items.
  drawCrowd(ctx, c, o = {})
  pickSpread(n, k)  - k evenly spread indices out of n (deterministic).
  highlightFigures(ctx, c, items, pick, o = {})  - Ring the counted people (votes, a survey, a sample) and show a count chip. items: drawFigureRow(...).figures or drawCrowd(...) boxes;

# simulations/base/kit/SimAnimal.js
  ANIMAL_KINDS = Object.keys(KINDS)
  ANIMAL_POSES = ['stand', 'walk', 'graze', 'lie']
  animalStride(spec)  - Ground covered per walk cycle (px).
  animalPhase(dist, spec)  - Walk phase 0..1 from distance travelled, so planted feet do not slide.
  solveAnimal(spec)  - Pure solve (see the header): same spec, same joints.
  animalLook(c, kind, o = {})  - Resolved colours for an animal. o: { coat, mark, mood, t }
  paintAnimal(ctx, c, sk, look = {})  - Paint a solved animal (far legs, tail, body, head, near legs, face).
  drawAnimal(ctx, c, spec, look = {})  - Solve and paint; returns sk (anchors for labels, ropes, counts).
```
