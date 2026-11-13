# CarryBoxScene - simulation stub
Save path: simulations/L01/CarryBoxScene.js
Attached by: blk-l01-s05 (explain)
Beats: 4
Base class: CanvasSimulation (a walking figure with two live vector arrows that both have to move as the angle dial turns needs an animated draw loop)
Hero: A schoolgirl in side view carrying a cardboard box at waist height, walking left to right, with a faint ghosted figure left behind at her starting position. Two arrows live on the box: the force she applies, and the displacement.
Dials: push angle 0-90 degrees, dragged, with hard detents at 0 and 90 and dead grey ticks in between; walk length 2-10 m -> how far she walks and how long the displacement arrow is.
Run shows: on every dial change she walks the corridor once at a steady, unremarkable pace, leaving the ghosted start figure behind, and stops at the far door. The run changes nothing about the work number except through the dials.
Note card: the corridor has no scale, no clock and no speed readout anywhere in the scene. Speed belongs to a later lesson, and a number here would give the answer away.
Must get right: at 90 degrees the shaded displacement-along-the-force strip has zero length and the work box reads 0 J - while the girl has visibly walked the whole corridor, which is the dead end the slide is built on; at 0 degrees the strip is the full displacement and the work is the largest value on the dial; the force arrow and the displacement arrow are always drawn as two separate, separately labelled arrows.
Not yet taught: no cos, no angle formula, and no work value at all for any angle strictly between 0 and 90 - the readout says so in words instead. Also no energy, no power, and no negative work: the 180 degree end of this dial is not built, because the sign is taught later on the goalkeeper scene.
Reuse: none.

## Per beat
- beat 0: the corridor, the girl, both arrows, the dial at 90. She is already mid-walk. Nothing is locked: the dial is draggable from the first beat.
- beat 1: the learner is expected to drag the dial. The displacement-along-the-force strip is visible from the start, so the link between the two arrows and the number is something they can watch happen rather than be told.
- beat 2: the 90 degree dead end is where this beat lands. She is at the far door, the strip is empty, the box says 0 J. The scene should hold this state rather than move on.
- beat 3: nothing new to operate. The dial still turns, but this beat is about the one angle the chapter will not compute.

## Verbatim slide markdown
### blk-l01-s05
```markdown
# The Long Walk With the Box

<!-- STEP -->
## A girl walks along the corridor

She carries a box at waist height with her arms held straight, so the box does not shake. She walks the whole length of the corridor and reaches the far door with the box still at the same height.

Her hands push **up** on the box. The box moves **forward**.

The push is upward and the movement is forward. They point in different directions.

<!-- STEP -->
## Turn the angle dial

The dial changes the direction of her push, from "the same way she walks" to "straight up, across her walk". Watch the work reading as you turn it.

- Push **along** the direction of motion - the work goes up.
- Push **across** the direction of motion - the work falls to **zero**.

<!-- STEP -->
## Zero work, even after a long walk

The box travelled the whole length of the corridor. Her arms were working hard. Still, the work her hands did on the box was zero.

Here is the rule to remember:

**Work is done only when the object moves in the direction of the force. If there is no movement in that direction, the work is zero, however hard you push and however far the object goes.**

<!-- STEP -->
## What this lesson leaves for later

What if the push is at a slant, neither along the motion nor straight across it? That needs a different formula. You will learn it in a higher class.

For now, the rule above is enough for every question in this lesson.
```

Shared helper: none
