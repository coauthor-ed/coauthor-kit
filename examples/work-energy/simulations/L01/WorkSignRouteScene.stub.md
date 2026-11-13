# WorkSignRouteScene - simulation stub
Save path: simulations/L01/WorkSignRouteScene.js
Attached by: blk-l01-a01 (arcade)
Beats: 1 (the slide's one line of prose)
Base class: ArcadeRouteScene
Skin: road
Deck: `WORK_SIGN` in `simulations/L01/WorkEnergyDeck.js` - the chapter's first deck, and the first export in that file. It drills one decision: the sign of the work done by a named force, reached by running a situation through the key *did it move -> is any of the force along the motion -> same way or against*, ending at Positive / Zero / Negative. Three groups, three leaves, one gate per leaf.
Taught by: L01 s03, s04, s05, s06, s09, s10
Rounds: 8 (one pass over the deck's eight items, so every situation is seen once; the engine's last 4 are the crowned boss round)
Reuse: none. This is the chapter's first arcade scene, so it builds the deck file with it; a later lesson's game adds a new export beside `WORK_SIGN` and never edits an item in it.

## Play
- **What the learner does:** tap PLAY, then walk a runner down a road of yes/no gates. Each situation arrives as one item; each gate is a door, and the doors must swap sides between items so the answer is never the one on the left. Wrong door = a why card ("not X; it is Y, because Z") and the same item stays in play until it is right, then comes back later in the run. No reading, no setup, nothing to learn outside the taps.
- **The key** (`key` on the deck, every group a leaf):
  - gate 1 `ask: "Did it move?"` - **no** -> `zero`; **yes** -> gate 2
  - gate 2 `ask: "Is any of the force along the motion?"` - **no** -> `zero`; **yes** -> gate 3
  - gate 3 `ask: "Same way as the motion?"` - **yes** -> `positive`; **no** -> `negative`
  - Both dead ends land on `zero`, and they are the two different reasons: nothing moved, or nothing of the force pointed along the way it moved. Say it that way in the group `why`, not "no work is done".
- **Groups:** `positive` "Positive work" (the force, or part of it, points along the motion), `zero` "Zero work" (no displacement, or the force is at right angles to it), `negative` "Negative work" (the force points against the motion). Tones: positive 3, zero 5, negative 6. Never colour or art that gives the answer away - no arrow drawn along the motion on a positive item, no green tick.
- **The eight items and the evidence line each must carry** (name / `is` / `why`; every `why` is the evidence, never a restated answer):
  1. `Your hands on a school bag you lift` - `positive` - "the bag moves up, the way your hands push" (s06's rigs, s11's target).
  2. `A cart you push along a level floor` - `positive` - "the cart moves the way you push, so the force and the motion agree" (s07's `W = F x s`, s12's lift line).
  3. `The ball's push on a goalkeeper's hands` - `positive` - "the hands are driven back, the way the ball pushes them: positive work on her" (s10's closing line, verbatim claim).
  4. `A goalkeeper's hands on the ball she stops` - `negative` - "her hands push back against the way the ball is moving" (s09, s10, and the outline's named situation).
  5. `A bag you lower back down to the floor` - `negative` - "the bag comes down while your hands still push up" (the sign rule of s09/s10 applied to the s06 rig going the other way).
  6. `A wall you push hard and never move`, `myth: true` - `zero` - "you tire, but the wall's displacement is 0, so W = F x 0" (s03's dead end; the outline's *tired-but-zero* myth).
  7. `A box carried across a floor: your upward push`, `myth: true` - `zero` - "your push is straight up and the motion is sideways: at right angles, so F x 0 along the force" (s05's dead end; the outline's *carried-far-but-zero* myth, the one the learner watched travel a long way for nothing).
  8. `A heavy bag you hold still in your hands` - `zero` - "the bag does not move, so there is no displacement for the force to work through" (s04's `s = 0` case, taught straight - **not** marked `myth`).
- **Mix-ups the deck must be able to catch,** because they are the two dead ends the outline names: "it moved, so the work must be positive" (catches item 7, and item 8 by a different route) and "it was hard, so the work must be positive" (catches item 6, and item 5). A why card for either has to name the factor that is zero, not appeal to tiredness or to distance.
- **Boss round:** the engine's last four items, worth double, built from the learner's own mix-ups plus the two `myth: true` items. Both myths must be reachable there, so the two dead ends are re-met under the clock after the rule has been used once - which is the point of putting this slide immediately before the challenge. The two myth items are the only doubles worth marking in the deck; a learner who has them right should not be asked to gamble on a `why` line.
- **Taught-by line, enforced:** nothing in the deck may name energy, power, efficiency, machines, momentum or a formula with an angle in it. Every item is a force and a displacement, named in words. The gate wording must stay in the lesson's own vocabulary - "along the motion", "same way", "against" - not "component", "dot product" or "cos".
- **Look:** `docs/arcade-games.md` for the CONFIG surface; the closest worked example is `examples/simulations/arcade/WorkSignRouteScene.js` with `examples/simulations/arcade/WorkEnergyDeck.js`. This is the course's version of that example, and its deck is the chapter file the later games share.

## Verbatim slide markdown
### blk-l01-a01
```markdown
# Sign of the Work

Check each case with three questions: did it move, is any of the force along the motion, and does the force point the same way as the motion or the opposite way? Then pick the answer.
```

Shared helper: WorkEnergyDeck.js
