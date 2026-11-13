# CarryBoxScene - design note

Status: done
Model: stealth/space-bunny-alpha[1m] (build) / opencode space-bunny-free (look)
Writes helper: none
Base class: SimScene (canvas) - a walking figure with two live vector arrows that both move as the angle dial turns, so the draw has to be animated.
Layout: a school corridor seen from the side - back wall with a ceiling band, dado rail and skirting, three high dark-paned windows, a doorway at each end with a pool of light on the floor. She walks in front of the wall, start doorway at x 244 to far doorway at 556. Below the walk lane, on the floor: the displacement arrow, and the part of it that acts along the push drawn over it in the force's own colour. On the box: the force arrow. Left column: the work card, and under it the box's own numbers. Top band: the dial chip, and on beat 1 the hint chip.

| beat | stage | shows | learner can | runs / events | enter() resets |
|---|---|---|---|---|---|
| 0 | she is already walking | corridor, girl mid-walk, both arrows, ghosted start figure, dial at 90 | drag the dial or the walk length; either restarts the walk | one steady walk, start to far door, leaving the ghost behind | restarts the walk at stage 0, dial values kept |
| 1 | drag the angle round | same, the coloured part of the displacement is visible from the first frame | same; the length of the coloured part is the thing to watch | same | same |
| 2 | the dead end | dial at 90, no coloured part, work box 0 J, girl at the far door, held | turn the dial; the number reappears only at 0 | same | same |
| 3 | the one angle left alone | intermediate angles available; the chip and the work box say in words that the lesson will not compute it | same | same | same |

Model numbers (the slide's own):
- Box 12 kg, weight F = 120 N (g = 10 N/kg). Her hands push up on the underside of the box, so the force is the weight, and both hands are drawn on that underside.
- Walk length 2-10 m, default 6 m. The displacement arrow is that many metres, drawn to scale across the floor lane.
- The push dial is 0-90 deg in 15 deg steps. **0 = along the direction of travel, 90 = square across it (straight up).** Hard detents at 0 and 90, dead grey ticks between.
- The coloured part of the displacement arrow is the projection of the displacement on the force: full displacement at 0 deg, exactly zero at 90 deg, part way between. Same colour as the force arrow, so the two are visibly the same thing.
- Work, and only where the lesson allows it: at 0 deg W = 120 N x d; at 90 deg W = 0 J. For 15/30/45/60/75 deg the work box carries **words, not a number**. No cosine is displayed anywhere.
- Opening state: dial at 90 (the slide's own dead end), so the walk begins as zero work over the whole corridor.

Celebrate: the girl reaching the far door. `celebrate(X1, BOX_TOP - 10, 16)` once per walk, the far doorway lights, and a green `arrived` pill lands on the floor at her feet - she stands *in* the doorway, so nothing drawn at head height survives the arrival. The 0 J card is the real payload; the burst is deliberately small, because this slide's point is anticlimax.
Comes to rest: `CONTINUOUS = false`. `busy()` is true only while the girl is walking; the loop parks 1.5 s after she stops.
Plausible: a 12 kg cardboard box at waist height is what a schoolgirl carries; her arms are locked straight and her upper body does not bob, which is the slide's own assumption and is drawn; the corridor has no scale, clock or speed readout, so nothing here measures pace.

Traps deliberately designed against:
- The arrival is gated on elapsed walk time (`_walkT >= WALK_SEC`), never on an eased value reaching 1, and the celebration is fired once behind `_popped`.
- The angle is measured once and every consumer reads the same fraction: the arrow, the coloured length and the work number cannot disagree.
- `Math.cos(90 deg)` is 6.1e-17, so `_alongFrac()` rounds the *fraction* to 6 decimals rather than special-casing the angle - the dead end is exactly zero, not 4.4e-14. (Third time this residue has cost a scene in this bundle.)
- All text is drawn at world coordinates after `ctx.restore()`; only the force arrow's shape is drawn under a transform.
- The ghost is a single flat tone at 0.3 alpha, drawn by the same body function, so it can never become a stale containing panel for a moving label.

## Look log

- round 1 (8 beats x 2 themes, all four beats, both themes at settle): seen - the force arrow was drawn the wrong way round: at "push 90 deg" it pointed along the walk and at 0 deg it pointed straight up, so the picture contradicted its own labels and the slide's dead end; `F = 120 N` ran off the right edge (621-695 on a 680 canvas); "arrived" was drawn on her legs; the doors were two unlabelled outlined rectangles and the middle band was 67% plain backdrop; she was a grey stick figure with no face. changed - rebuilt the set as a corridor (wall, ceiling band, dado, skirting, three dark windows, two doorways with floor light pools), rebuilt her with flat fills, a cushion shade, hair, a face and hands on the box's underside, fixed the force arrow to 0 = along the walk / 90 = straight up, drew the displacement-along-the-force as a force-coloured prefix on the displacement arrow instead of a floating grey bar, added the angle arc at the arrow's tail, moved the arrival marker and clamped the F chip. Re-shoot: 0 issues, 0 empty centre.
- round 2 (8 states: four beats plus the dial at 0, 45, 45-with-10 m, and back to 90, both themes): seen - the ghost had no head (a crate on legs); the single window read as a second cardboard box; the non-detent top chip failed contrast at 1.2:1 dark / 1.1:1 light on `c.raised`; at 45 and 10 m the strip, the 6 m -> 10 m arrow and "not computed" all behaved correctly. changed - the ghost became a one-tone faceless silhouette, the window became three high dark panes, the non-detent chip fill moved to gold, the far doorway's light pool was strengthened and an `arrived` pill added at her feet.
- open: the lit far doorway is still hidden behind the girl at arrival (she stops exactly in it) - the floor pool and the pill carry the arrival instead; a stop short of the door would need a pass that can see it. A dressed corridor (skirting shadow, a notice board) would fill the wall above the dado. Both are drawing-only and were left after the look budget.

## Checks explained

`check-scene L01/CarryBoxScene --bundle work-energy`: PASS - 0 fail(s), 0 warning(s) (ident-lint, sanity+draw, beat-check x1, freeze x12 runs, resume x3 beats, browser text report).

Verified by driving the dial through every detent in one shoot run (a0 / a45 / a45 at 10 m / a90, both themes):

| angle | walk | along | work | coloured length |
|---|---|---|---|---|
| 0 | 6 m | 1.000 | 720 J | the whole arrow |
| 45 | 6 m | 0.707 | not computed | about two thirds |
| 45 | 10 m | 0.707 | not computed | two thirds of the longer arrow |
| 90 | 10 m | 0.000 | 0 J | none |

So the strip is full displacement at 0 deg, empty at 90 deg and part way between; the work box carries a number **only** at the two detents and words everywhere else, and no cosine appears. Every shot reports `busy() false` and `arrived` at rest, so the freeze gate's rest state is real.

Advisory left alone: 5 distinct `lineWidth` values (9, 2.5, 2.2, 6, 10) against the house scale 2 / 2.5-3 / 4 - the 9 and 10 are the limb and arrow-body widths, which have to read as filled shape rather than as line, and 2.2/2.5 are the face and the box outline.

## Requests

- None.
