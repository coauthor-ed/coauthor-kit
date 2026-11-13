# PushWallScene - simulation stub
Save path: simulations/L01/PushWallScene.js
Attached by: blk-l01-s03 (explain)
Beats: 3
Base class: CanvasSimulation (a figure leaning on a wall with a fine tremble and a continuously filling meter needs a frame loop, and the wall must be a drawn surface the figure can push against)
Hero: A red brick wall in side view, and a boy leaning into it with both palms flat, arms locked, his shoulder and forearm carrying a fine high-frequency tremble. His face and posture are the picture of effort.
Dials: effort (0-100%) -> his lean angle, the amplitude and rate of the tremble, and how fast the fatigue meter fills; a read-only seconds-held counter -> climbs while he holds, and the only thing on the panel that ever counts upward.
Run shows: while he holds, the fatigue meter fills and the wall displacement readout stays pinned at 0.000 m with the work box at 0 J. Dropping the effort dial to zero lets him step back. Nothing about the wall changes at any point.
Note card: the wall is drawn as immovable geometry - it never flexes or creaks, even at full effort, because the scene is about the fact that it does not.
Must get right: the wall displacement readout reads exactly 0.000 m at every effort setting and the work box reads 0 J; the fatigue meter and the work readout are two visually separate objects with two separate labels, never the same box; the work number does not move when the effort number does. From the slide: "two different quantities" must be visible, not just asserted.
Not yet taught: the word energy - the chapter gives it its own lesson and this one does not. The fatigue meter is labelled in effort spent, never in joules. Also no speed, no time-of-day, no mention of what the tiredness "turns into".
Reuse: none.

## Per beat
- beat 0: the verdict beat: boy and wall drawn, effort dial at its default, wall readout 0.000 m and work box 0 J already visible. The learner can move the dial immediately; nothing is locked.
- beat 1: the tremble and the filling fatigue meter are at full strength. The two meters are the whole composition here - do not add a third.
- beat 2: both meters still on screen, unchanged, so the two quantities can be compared side by side at the end.

## Verbatim slide markdown
### blk-l01-s03
```markdown
# The Wall Has Not Moved

<!-- STEP -->
## The answer

**The wall did not move, so you did no work on the wall.**

Push as hard as you like. The wall moves 0.000 m.

In $W = F \times s$, any force multiplied by $s = 0$ gives zero. Turn the effort dial all the way up and watch the work stay at zero.

<!-- STEP -->
## So why are your arms tired?

Because being tired is real. It just is not work done on the wall.

To keep pushing, your muscles keep tightening and relaxing. That uses up energy inside your body. The wall gets nothing from it, and it stays where it was.

<!-- STEP -->
## Two different things

Keep these two apart:

- **Feeling tired** - what your body feels after the effort.
- **Work done on the wall** - the force multiplied by the distance the wall moved. The wall moved nowhere.

**You can be completely tired and still do zero work on the thing you pushed.**
```

Shared helper: none
