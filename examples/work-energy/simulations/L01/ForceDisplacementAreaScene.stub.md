# ForceDisplacementAreaScene - simulation stub
Save path: simulations/L01/ForceDisplacementAreaScene.js
Attached by: blk-l01-s08 (explain)
Beats: 3
Base class: DomSimulation (an SVG graph with a shaded region and two dials is exactly boxes-and-SVG; the kit draws it in DOM with CSS transitions and no frame loop)
Hero: An SVG graph with force on the vertical axis (0-50 N) and displacement on the horizontal (0-4 m), the shaded region under the force curve drawn in, and a live area figure in joules beside it.
Dials: force 0-50 N (sets the height of the flat line on the first beat); mode switch, steady <-> varying, which swaps the flat line for a trapezoid; displacement 0-4 m (sets the width of the shaded region).
Run shows: none. The shaded region and the area figure update on every change. On the varying profile the boundary rises linearly, runs flat, and falls linearly back to the axis.
Note card: the trapezoid drawn here is the scene own shape for teaching, not the source chapter exercise figure. Its numbers are this scene own and are not the source values - no question anywhere uses what this graph shows.
Must get right: the first beat shades a genuine rectangle and the figure is read as force times displacement; the steady and the varying cases are read the same way, so switching between them changes the shape and not the rule; both factors - the height of the line and the width along the horizontal - stay visible in the same picture at the same time.
Not yet taught: no machine, pulley or ramp, and in particular no statement that a machine cannot add work - this slide only points at the two factors. Also no energy, no power, no kinetic energy, no speed, no joule-per-second.
Reuse: none.

## Per beat
- beat 0: steady mode, shaded rectangle, the force slider live. The area figure sits next to the region so the two are read together.
- beat 1: the mode switch becomes live and the region can be swapped to the trapezoid. Both regions keep the same axes and the same area figure box.
- beat 2: both modes stay reachable. Nothing is hidden or disabled at the end - the learner can go back and forth between the two shapes.

## Verbatim slide markdown
### blk-l01-s08
```markdown
# Work as a Shaded Area

<!-- STEP -->
## Force up, distance across

Draw force on the vertical axis and distance on the horizontal axis. A steady push gives a flat line. Over some distance, that line and the axis enclose a rectangle.

Drag the force slider and watch the rectangle change. Its area is the work:

$$10\ \mathrm{N} \times 1\ \mathrm{m} = 10\ \mathrm{J}$$

<!-- STEP -->
## When the push is not steady

Real pushes change. You push a loaded trolley hard, then ease off, then push hard again. If you draw that force, the line goes up and down. The shaded area under it is still the work.

The rule is the same. Only the shape you have to measure is different.

<!-- STEP -->
## Why draw it this way?

Because both numbers can be seen in one picture: how high the line is (the force) and how far it stretches (the distance).

**The work is the area, and the area depends on both the height and the length. Keep both in view.**
```

Shared helper: none
