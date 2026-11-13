<!-- EXAMPLE design note, a good shape to copy. Trimmed from a real note (work-energy L05 EscapeRampScene) and reordered to the current template. Pass 1 writes everything above "## Look log"; later passes only append to Progress, add rows to Tests to run results, and fill Look log / Checks explained. Read it for the SHAPE: decisions with reasons, one table row per beat, numbers with where they come from, tests a stranger can run. The set-dressing (backdrop 'dots', a dusk mountain, a burst) is Quill: take yours from your look card (plain: flat paper, no setting, a tick). -->
# EscapeRampScene - design note
Status: building
Model: <the invocation's Model:, else what you are>
Started: 2026-10-08T09:12:40Z
Base class: SimScene (canvas): a truck on a road and a ramp in one dimension, plus a four-row ledger that must stay readable while the truck moves. Geometry, not panels: the ledger is a side card, the evidence is the drawn slope.
Kit use: SimProps drawGround use; SimLook backdrop 'dots' use; no kit part draws a truck or a meter, so both are hand-drawn (looked at: canvas.md, kit-parts.md).

## Progress           <- one line per step, added by scene-pass.mjs
- read done
- design written
- code drafted
- build end: check-quick PASS

## Decisions           <- one line each, written when made; never reopen one
- Account counted in 100 shares, not joules: the only way the length can stay off the screen (shares never convert back to metres).
- Slope fixed at 30 deg and only drawn (arc at the foot, dashed rise marked "half the length"): the stub says the slope is shown, not computed.
- The ledger is its own card on the right, not chips on the road: four rows must be readable while the truck moves.
- Ramp length is a slider control; there is no drag on the bed (the stub's "drag" is met by the slider). Reading taken from the stub's Dials line.
- Verdict chip names the three outcomes in words and never the length that works.
- CONTINUOUS = false: nothing moves while idle except a hint pulse bounded by the beat's age.

## Layout
Backdrop 'dots' behind a dusk mountain. Hero = road + ramp in the left two thirds (road along the bottom, gravel bed a thin band up the 30 deg line, hillside wedge filled so the lower right is not empty). Right card = the account: four rows (arrived / climb / gravel / left) with a meter under each bill, then a full-width account bar; below it a "your dials" card. Chips: "no brakes" top-left, the beat's prompt top-centre, the run's outcome bottom-centre. No pixel coordinates here: the code has them and they go stale after a look round.

## Beats
| beat | shows | learner can -> effect | runs / events | enter() resets |
|---|---|---|---|---|
| 0 | truck on the road, ramp at the set length, four rows empty, angle and rise drawn | set length 10-60 m, set gravel 0-4000 N, Run | Run: 0.7 s along the road, then the climb; four entries post as it goes | nothing; a run in flight finishes and its ledger stays |
| 1 | as beat 0, plus a "climb" chip on the rise and a "gravel" chip on the bed, each on a leader | as beat 0 | as beat 0 | as beat 0 |
| 2 | as beat 0, plus "shortest" at 10 m and "longest" at 60 m marked on the road datum | as beat 0 | as beat 0 | as beat 0 |

## Numbers
Source tags: [slide] from the slide, [derived] worked out here.
- Mass 1200 kg, g = 10 N/kg [derived]. Climb bill 6000 J per metre of ramp (0.5 m of height per metre of ramp) [derived].
- Gravel dial 0-4000 N, step 250, default 1500 [stub]. Gravel bill = F joules per metre.
- Length dial 10-60 m, step 0.5, default 10.0 [stub]; the default is the short ramp beat 1 opens with.
- Account empties at L* = 202500 / (6000 + F): F = 0 -> 33.8 m, F = 1500 -> 27.0 m, F = 4000 -> 20.3 m [derived]. Never printed.
- A run: 0.7 s on the road, then constant deceleration (6000 + F) / 1200 m/s2, 2.2-3.7 s, ending when the account is empty; off the end of a short bed it coasts 0.6 s and fades.

## Deviations from the stub
- Stub: "a ramp-length drag". Built: a slider. The bed follows the slider; no drag on the bed.
- None other.

## Celebrate / rest / plausible / not shown
- Celebrate: a burst at the top of the bed on the run whose account empties within 0.26 m of the top. Never on the other two outcomes.
- Rest: busy() is true only while a run is in flight, while the bed eases to a new length, or during the coast.
- Plausible: a loaded truck decelerating up a 30 deg escape ramp and stopping on it; the bed is loose stone; the two bills are the two resistances the slide names.
- Not shown: joules, mass, g, speed, an adjustable angle, rolling back, a formula for L*, conservation by name.

## Tests to run         <- for the verify pass: one row per stub "Must get right" item; step = what to do, expect = what must be readable or true
| item | step | expect |
|---|---|---|
| two bills, one account | length 27, gravel 1500, Run, wait until idle | climb row and gravel row both non-zero |
| too short stays moving | length 10, gravel 1500, Run, until idle | verdict says still moving; left row non-zero |
| too long stops short | length 45, gravel 1500, Run, until idle | verdict says stopped short |
| exact length empties it | length 27, gravel 1500, Run, until idle | left row is 0 at the top; a celebration fired |
| length is never printed | after any run | visible text has no length in metres except the dial's own value |
| stage per beat | beat 0..N | each beat that must differ reads a different stage (idx not all equal) |
open: truck face legible at the smallest size; the coast past a short bed looks like flight (needs eyes).
Resume-ignore: none.

## Look log           <- one line per look pass; empty until the verify/look passes run

## Checks explained   <- one line per WARN left and why; empty is normal

## Requests
- Stub says "a ramp-length drag"; built a slider (see Deviations). A reviewer may want the drag.
