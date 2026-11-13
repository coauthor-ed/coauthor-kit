# BagLiftRigsScene - simulation stub
Save path: simulations/L01/BagLiftRigsScene.js
Attached by: blk-l01-s06 (example)
Beats: 3
Base class: CanvasSimulation (four lifting rigs side by side, with sacks that have to actually travel while the arrows and the fuel bar move with them)
Hero: Four bays in a row. (a) one sack raised 1 m; (b) three sacks raised 1 m one after another; (c) three sacks tied in a bundle raised 1 m in one lift; (d) one sack raised 3 m on a taller frame. Ghosted sacks stay on the floor under every bay, and a dashed 1 m line runs across all four with a 3 m line over bay (d).
Dials: bay selector (a / b / c / d) -> which rig runs; lift rate (slow / steady / brisk) -> how fast the chosen bay animates. No dial changes the geometry: the four set-ups are fixed, because the point is that the geometry is not the variable.
Run shows: the chosen bay lifts slowly at constant speed to its line; the work readout and the fuel bar fill together and stop dead when the sacks stop. The other three bays hold still. (b), (c) and (d) all land on the same multiple of (a).
Note card: the sacks are identical rectangles, so the only visible difference between them is how many there are and how high they go. The force arrows are scaled to the mass, so the bundle in (c) carries a visibly three-times arrow.
Must get right: heights are 1 m in (a), (b) and (c) and 3 m in (d), with the dashed lines actually drawn at those heights; (a) is the reference and reads W; (b), (c) and (d) each read exactly three times that; the fuel bar is fuel, not force, and it drains in step with the work readout.
Not yet taught: no energy, no power, no rate of doing work per second, and no machine, pulley or ramp vocabulary - this is a person and a sack. The bag must not be described as holding or storing anything.
Reuse: none.

## Per beat
- beat 0: all four bays drawn, idle. The learner can run any bay from the start. The readout and fuel bar start at zero on every bay.
- beat 1: the three variants of the same job are all visible at once. Nothing animates on its own - the learner is choosing which rig to run.
- beat 2: the three runs that came out the same are the payload of this beat. Nothing new to operate.

## Verbatim slide markdown
### blk-l01-s06
```markdown
# Four Ways to Do the Same Job

<!-- STEP -->
## One sack, one metre

A sack of flour lies on the floor. You want to lift it slowly onto a shelf one metre above. You push up with a force just a little more than its weight, and the sack rises one metre in the direction of your push.

That is $W = F \times s$ with a real distance.

<!-- STEP -->
## Now make the job bigger in three ways

All the sacks end up on the same shelf. Only the way you lift them changes.

- **Three sacks, one at a time.** The same lift, repeated three times.
- **Three sacks tied together.** One lift, with three times the force.
- **One sack, lifted three times as high.** The same force over three times the distance.

<!-- STEP -->
## The work bar

Switch the four rigs on one at a time. Watch the number and the work bar rise together.

**Rigs B, C and D all give the same work: three times the work of rig A. Three times the force, or three times the distance, makes three times the work.**

Three sacks lifted one by one, three sacks tied together, and one sack lifted three times as high all need the same work. This will be very useful in the coming lessons.
```

Shared helper: none
