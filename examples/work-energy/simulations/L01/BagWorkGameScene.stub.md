# BagWorkGameScene - simulation stub
Save path: simulations/L01/BagWorkGameScene.js
Attached by: blk-l01-s12 (game)
Beats: 0 - this scene mounts from a mini-game@1 block, which carries no prose and no `<!-- STEP -->` markers. It is a beat-less mount and must open cold in its playable state, with the target, all three dials and the Lift control already live.
Base class: DomSimulation, extended via withChallenge() (a target panel, three dials and a trolley-on-a-hook readout is a panel layout, and the goal panel comes from the challenge wrapper rather than from a drawing surface)
Hero: A gantry with a trolley on a hook at a settable height and a mass tag on it, a target work value in a large box at the top of the panel, and a signed work readout below the hook.
Dials: mass 1-20 kg; lift height 0.5-5 m; pull direction, an angle control from straight up (0) to square across (90).
Run shows: pressing Lift runs one lift: the trolley travels the chosen height at constant speed, the work readout resolves with its sign as it moves, and the run ends with a verdict against the target. Overshooting fails, undershooting fails, and a square-across pull reads 0 and always fails. Retries are free and there is no timer.
Note card: one lift at a time. The scene scores F x s and nothing else, and it must not add a timer, a move limit or a penalty for trying again.
Must get right: the score is the product itself, hit exactly within a small tolerance - no partial credit for being close, and no way to reach the target without reading the force and the height correctly; a 90 degree pull reads 0 and can never reach a positive target; a downward lift reads negative and the target rejects it; retries are unlimited and unpenalised.
Not yet taught: no energy, no power, no efficiency and no machines. The target is a bare number in joules; the panel must not name where the joules came from or where they went.
Reuse: none. Build it challenge-shaped over the wrapper `docs/mini-games.md` describes: `withChallenge(DomSimulation)`, a static OBJECTIVE matching the block's `objective` text, and a `checkObjective()` that returns the signed product against the target.

## Per beat
- beat 0: beat-less. The single state is the playable state: trolley on the hook at its default height, target pinned in the box above, all three dials live, work readout at zero. It never advances by itself, and the learner may set up and re-set up as many times as they like before pressing Lift.

## Play
- **Objective** (also the block's `objective` and the scene's `static OBJECTIVE`): hit the target work value exactly - set the mass on the hook, the height you lift it through and the direction you pull from, so the work reads the target number.
- **Moves:** set the mass dial, the lift-height dial and the pull-direction angle, then press **Lift**. One lift runs, the readout resolves with its sign, and the run ends in a verdict against the target. Every attempt starts from a full reset. No timer, no move limit, no penalty, unlimited free attempts.
- **checkObjective():** compare the signed work the run produced against the target and return it as a closeness pair - `{ value: this.workReading, target: this.targetJoules }` - so `evaluate()` does the scoring. Land it exactly and it is a win; overshoot, undershoot, a zero reading or a negative reading each report which of those happened.
- **Why this is tie level L2:** the readout is computed from the mass the learner set, the height they set and the angle they set, and from no other source, so the target cannot be reached without `F x s` being done correctly. A square-across pull reads 0 by the same computation, and a downward lift reads negative, so neither can be pressed onto a positive target. There is no dial, readout or shortcut that reaches the number without the product - the slide's line "there is no way to win this that does not go through F x s" is a hard constraint on how the readout is computed, not a description of it. Not L3: there is nothing to optimise beyond hitting the target exactly.

## Verbatim slide markdown
### (none - this scene mounts from a mini-game@1 block, which carries no prose, so there is no slide markdown to copy; the briefing that introduces it is `blocks/L01/blk-l01-s11.md`, on the slide immediately before)

Shared helper: none
