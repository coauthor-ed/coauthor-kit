# BagWorkGameScene - design note

Status: done
Model: stealth/space-bunny-alpha[1m]
Writes helper: none
Base class: `withChallenge(DomSimulation)` - a target panel, three dials and a trolley-on-a-hook readout is a panel layout, and the goal panel comes from the challenge wrapper, so there is no drawing surface. Beat-less: the block is `mini-game@1` and mounts with no beats, so there is deliberately no `BEAT_STEP_MAP`.
Layout: one `sim-card` filling the frame. Top: the target in a large box. Middle: the gantry stage - a portal frame (two legs on base plates, knee-braced to the beam), a rope over a pulley at the beam centre, and the sack of flour hanging on the hook, its height set by the lift dial, graduated against the rail on the near leg. The free end of the rope is the **pull**: it hangs straight down at 0 deg and swings square across at 90 deg, and it is drawn at a length that scales with the force, so the angle and the force are both on the picture and not only in the equation. Below the stage: the signed work readout showing the multiplication, the three dials, the **Lift** button (the only in-panel control) and the verdict.
| beat | stage | shows | learner can | runs / events | enter() resets |
|---|---|---|---|---|---|
| - | (beat-less) the playable state | target pinned, sack on the hook at its default height, mass tag, pull hanging straight down, readout at 0 J, verdict area empty | set all three dials, press Lift, read the verdict, retry freely | Lift runs one lift: the sack travels the chosen signed height over 1.6 s via a CSS transition, then `startDwellTimer` fires the verdict and `evaluate()` scores it | every attempt starts from a full reset of the run, never the dials |

Model numbers:
- g = 10 N/kg, so F = m x 10 N exactly for every integer mass on the dial.
- Work = F x s x cos(angle), the component of the pull along the displacement. angle 0 = straight up (full work), 90 = square across (work is exactly 0).
- Target 600 J, tolerance 0.005 (3 J). Reachable several ways on purpose - 20 kg at 3.0 m, 12 kg at 5.0 m, 15 kg at 4.0 m, all at 0 deg - so the learner is not forced down one path.
- Dials: mass 1-20 kg step 1 (default 20); lift height -5.0 to 5.0 m step 0.5 (default 0.5); angle 0-90 deg step 15 (default 0). Opening state is 200 N x 0.5 m = 100 J, deliberately not the target.
- Height is signed: negative lifts the mass down and the work reads negative.

Celebrate: the sack cheers (a `bwg-cheer` pop, twice) and takes a green glow when the work lands on the target, `burst(stage)` fires a confetti burst over the gantry, and the verdict card names exactly which of the four outcomes happened - which is the point of the game, because the learner learns *which* mistake they made, not just that they were wrong.
Comes to rest: no frame loop at all. The trolley moves on a CSS transition and the verdict arrives on a real `startDwellTimer`, so there is nothing to park. Nothing animates on load, so the scene rests until Lift is pressed.
Plausible: a 20 kg load is plausible to lift and is the slide's own "a sack of flour"-scale object; a portal frame with a rope over a head pulley is how a real gantry holds a load, and a hoisted load hangs from the free end - so swinging that free end from straight down to square across is the honest picture of the cos, not a decorative arrow. Pulling at an angle genuinely reduces the useful component of the force, which is the physics the slide is pointing at.
Not shown: no energy, no power, no efficiency, no machine vocabulary. The panel never says where the joules came from or went - the target is a bare number, and the readout is a bare product.

Design constraints from the stub that shaped the code:
- **The readout is computed from the mass, height and angle the learner set, and from nothing else.** There is no stored answer, no snap-to-target and no dial that writes the target value into the panel - this is the L2 tie the stub requires ("no way to win this that does not go through F x s").
- **A 90 degree pull reads 0 by the same computation** and so can never reach a positive target; a negative height gives a negative product. Neither is special-cased in a verdict branch: both fall out of `F x s x cos`.
- **Retries are unlimited and unpenalised** - no timer, no move counter, no score penalty. `SCORING.maxAttempts` is left at its `Infinity` default.
- Dials are control-bar controls, so the scene queries only the Lift button and the readout, both optional-chained (the sim-test harness DOM has no HTML parser).

## Progress           <- one line per step, added by scene-pass.mjs
- rev n8: load waits at the 0 m datum while the height dial moves; a dashed marker shows the destination and Lift animates to it

## Look log

Shots: `build/shots/work-energy/L01/BagWorkGameScene-{open,dials,midrun,win,zero-miss}-{dark,light}.png`, contact sheet `BagWorkGameScene-sheet.png`, driven with `set` on the three dials and a real `click` on Lift.

- round 1 (5 steps x 2 themes): seen - the scene was a bare void with a 46 px chip on a 4 px line, not an apparatus: no backdrop, no frame, no character, the hero 8% of the width against a rubric floor of a third, the verdict clipped off-frame at 625 px inside a 620 px frame, and in the light theme the rail, the floor and the zero datum were all the same faint grey so the apparatus did not exist. changed - rebuilt the gantry as a portal frame on a dotted `sl-backdrop` stage (legs, base plates, knee braces, beam, head pulley, a graduated rail post on the near leg, a floor band and a contact shadow that tightens as the load nears); made the sack the hero at a quarter of the stage width, growing with the mass, with a face and a mass tag; added the pull as a real rope over the pulley that swings 0-90 deg and is drawn at a length that scales with the force; verdict became a badge card in a themed band; dials went to one line each with the value in a chip; `burst()` celebration; `HEIGHT` 620 -> 692, `PORTRAIT_HEIGHT` 742 -> 778 from `sim-layout`.
- round 2: seen - the text report carried 30 contrast failures at 1.1:1, all of them the dial value chips: `--sim-bg-surface` is `#181134` in the dark theme, not a light ink, so `bg-deep` on `bg-surface` was dark on dark and the chips read as empty pills. The sheet also showed the hero still too small and the middle of the stage empty. changed - dial chips onto the house `shape` fill with a `bg-deep` ink; the sack roughly doubled (76-132 px wide, 60-98 px tall) and the stage grew to 288 px so it is a quarter of the width; the single central mast became a portal frame; `HEIGHT` 716, `PORTRAIT_HEIGHT` 808. Text report then clean (0 issues).
- round 3 (confirming, `--reset-rounds`): seen - four defects the clean report could not see. The pull arrow pivoted *inside* the beam, so at 90 deg it swung behind it and vanished - the single state the scene most needs to show. Both knee braces leaned outboard and crossed their own leg. The mouth sat on the mass tag. The metre ticks floated with nothing behind them and the column above +5 m read as a void. changed - pull pivoted under the beam at z-index 5 and lengthened; braces flipped to lean inboard; mouth raised and tag lowered; a graduated rail post added behind the ticks.

Two rounds were spent, then a third confirming shoot. The third was not a polish round: round 2's report had named the contrast defect and round 2's sheet had shown the hero size, and without it the two rounds' fixes would have shipped unseen. `shoot` refused at the cap, so it was re-run with `--reset-rounds` - the tool's own documented continuation - and the counter was not reset a second time.

Fixed after the last shoot, by driving the scene rather than looking at it (`drive-dom`), and so not re-shot:

- **The verdict went stale.** Driving 12 kg / 5 m to a win and then moving the angle dial left "✓ On the target - 600 J" on screen while the equation had already changed to `cos(90°)`. `_paint()` now retires the verdict, so a verdict only ever describes the setup that produced it.
- The dials now lock for the duration of a lift, so a slider cannot be left disagreeing with the reading it was just used to set.

Carried over from the build stage, both re-verified after the rewrite by driving the real game: 12 kg at 5.0 m and 0 deg reads exactly 600 J and solves with `checkObjective()` = `{value: 600, target: 600}`; 90 deg reads exactly 0 J and never solves; -3 m reads -360 J with the negative verdict; 4.5 m reads 540 J and reports Undershot. The readout is still `F x s x cos` and nothing else, so the L2 tie is intact.

open:

- The right knee brace (`left: 78%`, added after the last shoot) is **not verified by eye** - the round budget was spent. It is a one-property correction to a rule whose broken state I had photographed, so the risk is low, but a 3-look run should confirm both braces sit on their own legs.
- The face is drawn in `--sim-bg-deep`, which is near-black on the light gold of the dark theme and near-white on the dark gold of the light theme, so the same two tokens read as a face in both. It has **not been seen** since the change: the last shoot still had literal `#ffffff` / `#171331` inks, and `check-scene` FAILed those as literal colours. The pairing is the same one `.bwg-lift` already uses, and the token is 11.9:1 on the dark-theme gold and 3.8:1 on the light-theme gold, but it is a judgement call that wants an eye.
- The stage is a drawing, not a scale: `PX_PER_M` is 12, so 10 m of travel is 120 px. The rail is graduated in metres and labelled at -5 / 0 / +5, and the rail post runs on past +5 to the beam, so the scale is named - but a 5 m lift and a 0.5 m lift are both honest pictures of themselves and neither is to scale with the other.

## Checks explained

`check-scene L01/BagWorkGameScene --bundle work-energy`: PASS - 0 fail(s), 1 warning(s).
`lesson-check work-energy L01`: PASS - 0 fail(s), 0 warning(s).

The one warning is `abs-position: 7 left/top px position(s)` and it is kept on purpose: the gantry is a drawing, and a pulley, a hook, a swinging rope and a graduated rail have no flex or grid arrangement that places them relative to a rail line. The rest of the card - target, readout, dials, button, verdict - is all flow layout.

Two facts that cost a round-trip each and are now settled for later scenes here:

- **`DomSimulation` has no control bar.** `getControlValue` and `_guard` live on the canvas `SimScene`; a DOM scene has neither, so `static CONTROLS = []` and the three dials are in-panel native `<input type="range">`, the same choice `ZeroWorkCasesScene` made. Calling `this.getControlValue(...)` in a DOM scene is an ident-lint `no-method` ERROR, not a silent no-op.
- **`_running` is a reserved field name** on the `withChallenge` chain ("collides with a base-class field"), so the run flag is `_lifting`.

Height is measured, not guessed, and re-measured after the look rebuild: `sim-layout` naturals are 701 landscape / 792 portrait, so `HEIGHT = 716` / `PORTRAIT_HEIGHT = 808`. The build-stage figures (603/724 -> 620/742) were for the old, much shorter card; a first guess that round of 470/640 clipped by 120px/71px.

**The L2 tie was verified by driving the game, because no headless gate presses Lift.** Running the real scene through `evaluate()`:

- 20 kg at 3.0 m, 12 kg at 5.0 m and 15 kg at 4.0 m all read exactly 600 J and solve - three distinct exact routes, so the learner is not funnelled down one path, and each one had to come out of `F x s` to land there.
- 20 kg at 3.0 m pulled at 90 deg reads exactly 0 and never solves, with the "Zero ... square across" verdict.
- 20 kg at -3.0 m reads -600 J and never solves, with the negative verdict.
- 800 J reports Overshot, 10 J reports Undershot - the four failure modes the stub names are four distinct messages.
- `checkObjective()` returns null while a lift is in flight, so an unfinished run cannot be scored.
- `scoring.maxAttempts` is `Infinity`: retries stay free and unpenalised, with no timer and no move limit anywhere in the scene.

One real bug found and fixed by that drive: `Math.cos(90 deg)` is 6.1e-17, so a square-across pull read 3.7e-14 and the readout showed a non-zero number, breaking "a square-across pull reads 0". The fix rounds the *product* to 6 decimals rather than special-casing the angle, so the win condition stays a single computation with no branch - which is what the stub's "reads 0 by the same computation" is asking for.

## Requests

- `evaluate()` in `ChallengeMode.js` computes `score = max(0, 1 - err)`, so a near miss still returns a fractional score even though `solved` requires `err <= tolerance`. The stub's "no partial credit for being close" is therefore enforced on the *solved* verdict (tight 0.005 tolerance, exact integer products) but the numeric `score` field is the engine's and cannot be changed from a scene. Not editing shared engine code - out of this stage's write-scope. Raised here for the operator.
- The stub's dial range is "lift height 0.5-5 m", but the same stub and the briefing both require a downward lift that reads negative. Height is therefore -5.0 to 5.0 m with 0 reachable, so the negative case exists. Deviation from the stated range, forced by the stub's own "must get right".
