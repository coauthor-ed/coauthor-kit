# ZeroWorkCasesScene - simulation stub
Save path: simulations/L01/ZeroWorkCasesScene.js
Attached by: blk-l01-s04 (explain)
Beats: 2
Base class: DomSimulation (three labelled rows of dials and live readouts on one card - boxes and numbers, with no motion to draw and no frame loop wanted)
Hero: A single card holding three rows. Each row is a caption, a value dial, and a live readout showing the arithmetic and the answer.
Dials: force 0-200 N (row 1); displacement 0-5 m (row 2); row 3 carries no live dial at all - both of its controls are greyed out and locked.
Run shows: none. Moving either live dial recomputes that row readout immediately. The third row stays locked through the first beat and unlocks only on the second.
Note card: the third row is deliberately incomplete: its caption is withheld until the last beat, so the scene can never name the third case before the slide does.
Must get right: either live dial at zero forces the readout to 0 J whatever the other dial is set to - the learner can find this out, not just read it; each readout shows the multiplication as well as the number; the two live rows are captioned as the two zero-factor cases only.
Not yet taught: the third case is named on beat 2 as a matter of direction and nothing more - no angle formula, no cos, no non-zero number for any intermediate angle. Also no energy, no power, no sign, no negative readings.
Reuse: none.

## Per beat
- beat 0: rows 1 and 2 live, row 3 present but locked and unlabelled. The product being a product is the point: the learner should be able to drive either dial to zero and watch the readout go.
- beat 1: row 3 unlocks and its caption appears. It is a lock, not a working dial - it must not start computing anything, because this lesson has not reached that case yet.

## Verbatim slide markdown
### blk-l01-s04
```markdown
# Three Ways to Get Zero Work

<!-- STEP -->
## Two easy ways

$W = F \times s$ is a product of two numbers. If either number is zero, the product is zero. So there are two easy ways to get zero work:

- The **force** is zero. There is no push at all.
- The **displacement** is zero. The object does not move.

Set either dial to zero and the work reads zero, whatever the other dial says.

<!-- STEP -->
## The third way is the tricky one

There is a third way to get zero work. Here, neither number is zero. Both are big.

What matters is not only how big the force and the displacement are. It is also **which way each one points**.

We will see this on the next slide.
```

Shared helper: none
