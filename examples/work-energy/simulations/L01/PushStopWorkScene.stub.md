# PushStopWorkScene - simulation stub
Save path: simulations/L01/PushStopWorkScene.js
Attached by: blk-l01-s09 (example), blk-l01-s10 (example)
Beats: 3 (blk-l01-s09), 2 (blk-l01-s10)
Beat maps: 3 -> blk-l01-s09, 2 -> blk-l01-s10
Base class: CanvasSimulation (two animated figures with live vector arrows whose directions and signs both have to change as the dials turn; this needs a frame loop, not a panel)
Hero: Two bays. Left: a boy pushing a wheelchair to the right, the two arrows parallel and both pointing right. Right: a goalkeeper diving with both gloved hands meeting a ball, the force arrow pointing one way and the displacement arrow the other.
Dials: signed displacement dial, running from forwards along the force (positive) through square across it (zero) to back along it (negative); force 0-500 N; hand travel 0-30 cm.
Run shows: a dial change replays the motion in both bays once - the chair rolls right, the hands are driven back - and the work readout settles with its sign only when the motion stops. The run is short and repeatable; the dials are locked while it plays and unlocked when it ends.
Note card: the wheelchair, the gloves and the ball are drawn as simple shapes. The two arrows and the sign beside them are the drawing; everything else is scenery.
Must get right: the sign is shown as a live consequence of the two arrow directions, never as a convention to be remembered; at the square-across stop the readout reads 0, not a small number; in both bays a force arrow and a displacement arrow are always drawn, and the mismatch in the right-hand bay is visible in the drawing and not only in the number.
Not yet taught: no energy, no kinetic energy, and no line about the work turning into heat or anything else - the sign is the entire point of this scene. Nothing about what a negative work done physically means beyond "the two were pointed opposite ways".
Reuse: none. Mounted twice in one lesson, memory-less each time: the s10 mount must open on the goalkeeper bay with its own default dials and must not assume anything about how the s09 mount was left.

## Per beat
### blk-l01-s09
- beat 0: both bays drawn and idle, the left one positive on its face. All three dials are live from the start.
- beat 1: the right-hand bay is the payload. The dial is expected to be dragged across its whole travel here, including through zero, and the sign on the readout has to flip as it passes.
- beat 2: both bays still on screen with their signs showing. Nothing is locked at the end.

### blk-l01-s10
- beat 0: the goalkeeper bay only, dials at their defaults, replay available. Because it is a fresh mount, the goalkeeper bay has to be the one already on screen - it cannot depend on the learner having been on the s09 mount first.
- beat 1: unchanged. The third-law point in this beat is made in the prose; the scene keeps both arrows visible and nothing else.

This scene is mounted twice in one lesson and the two mounts have different beat counts, so it needs `static BEAT_MAPS` keyed by the attaching slide's beat count - `{ 3: <the s09 map>, 2: <the s10 map> }`, not one map clamped to fit both. The scene learns only the beat COUNT, never which slide mounted it, so each map above has to stand on its own for a learner arriving at that slide cold.

## Verbatim slide markdown
### blk-l01-s09
```markdown
# The Sign of the Work

<!-- STEP -->
## Pushing the wheelchair forward

A boy pushes a wheelchair to the right. His hands are on the handles, and the handles move to the right.

The push and the movement point the same way. The work is **positive**.

<!-- STEP -->
## Stopping the ball

Now think of a goalkeeper. She stops the ball with both hands, and the ball is rushing towards her goal.

Her push points one way. The ball moves the other way.

She pushes **against the motion of the ball**. The work she does on the ball is **negative**. Nothing has gone wrong. The ball comes in moving and leaves without its motion.

<!-- STEP -->
## Work has no direction, only a sign

Force has a direction. Displacement has a direction. Work has no direction. It is just a number, and it can be positive, negative or zero.

- Push **along** the motion: **positive**
- No movement, or push **across** the motion: **zero**
- Push **against** the motion: **negative**

A negative sign does not mean anything is wrong. It only tells you that the push and the movement point opposite ways.
```

### blk-l01-s10
```markdown
# Working the Goalkeeper's Hands

<!-- STEP -->
## Set the dials and read the sign

The scene lets you change how hard she pushes and how far her hands are pushed back as the ball stops. Turn the dials and watch the sign of the work.

- Hands pushed **back** while pushing the ball - the displacement along her push is negative, so the work is negative.
- Hands moving **forward** along the push, as when she throws the ball back - the work is positive.

<!-- STEP -->
## Equal forces, but not equal work

The ball pushes her hands back with exactly the same force as she pushes the ball. The two forces are equal and opposite.

But the work is not equal and opposite, because the two objects move differently. The ball moves one way. Her hands move the other way. So the ball does **positive** work on her hands while she does **negative** work on the ball.

**Two equal forces on two objects can give works with opposite signs.**

Say it in full: whose work, on which object.
```

Shared helper: none
