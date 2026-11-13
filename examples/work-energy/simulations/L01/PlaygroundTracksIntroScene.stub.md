# PlaygroundTracksIntroScene - simulation stub
Save path: simulations/L01/PlaygroundTracksIntroScene.js
Attached by: blk-l01-s01 (hook)
Beats: 3
Base class: CanvasSimulation (three continuous track profiles have to be drawn as curves; a CSS panel cannot draw a spiral, and the geometry of each path is the whole point)
Hero: A side-on play structure: one raised platform with three tracks descending from it - left, a blue helical slide curling about one and a half turns; centre, a red straight chute; right, a purple undulating chute with two crests. A small child figure waits at the top of each.
Dials: platform height (1-4 m) -> the top of all three tracks rises together; roughness per track (smooth / a few bumps / many bumps) -> the bump count drawn on that track and in its readout; mass per track (light / medium / heavy) -> a mass tag on the child waiting at that top. Readouts are geometry only: height dropped, path length, number of bumps.
Run shows: nothing runs. Moving a dial redraws the tracks and the readouts; no child ever moves and no race is ever started.
Note card: the tracks are drawn as smooth geometric curves rather than as real playground equipment, and the spiral is flattened to the page so its extra length is visible without being to scale.
Must get right: three tracks in the shapes and order the source describes - blue spiral left, red straight centre, purple wavy right with two crests; all three tops at the same height; exactly three readouts per track (height dropped, path length, bumps) and a mass tag. From the slide: the wording "no speed box and no clock" is a hard constraint, not a description.
Not yet taught: any speed, velocity, time, ranking or finishing order, anywhere in the scene - not in a readout, not in a chip, not in a tooltip. Also none of the words energy, power, kinetic, potential, or friction as a force with a value.
Reuse: none. The chapter-closing return to this picture on L09 blk-l09-s11 is a SEPARATE file, `PlaygroundTracksScene-closing.js` - see that stub for why the two mounts could not share one. Build them together; they may share a drawing helper, named on the Shared helper line of each. L05 gets a separate file, SlideSpeedRevealScene.js, which must not be this file with a switch flipped: the two must be able to differ completely, and a mount never assumes it remembers an earlier one. Do not write a shared drawing helper for them - if Stage 3 ends up wanting one, it cannot be built until the L05 scene exists.

## Per beat
- beat 0: the whole structure drawn at its default height, all three readouts visible, no child moving. The learner has three dials to find; nothing on screen changes until they touch one.
- beat 1: unchanged. This beat only states the three questions; the scene must not illustrate, rank or hint at an answer. The roughest track is still drawn with bumps so the bump readout has something to show.
- beat 2: still nothing moves. This beat tells the learner there is no speed box; the scene must simply have no speed box for that sentence to be true of it.

## Verbatim slide markdown
### blk-l01-s01
```markdown
# Three Slides, Three Questions

<!-- STEP -->
## The playground at the top of the platform

Three children stand at the top of the same platform. Three slides lead down to the ground.

- A blue slide that loops round and round.
- A red slide that goes straight down.
- A purple slide with two humps on the way.

The platform is the same height for all three. So the drop is the same too.

<!-- STEP -->
## Three questions to keep in mind

You have probably guessed already. Let us write the guesses down as questions.

- How fast is a child going at the **bottom of the blue slide**?
- Will a heavy child and a light child reach the bottom of the **same** slide at the **same** speed?
- Which of the three slides gives the **highest** speed at the bottom?

**We will not answer them yet.** First we need a new idea, and by the end of this chapter you will be able to answer all three.

<!-- STEP -->
## What you can change, and what you cannot see

You can change the height of the platform, how rough each slide is, and how heavy each child is. The panel shows the height, the length of the slide, and the number of humps.

**It does not show the speed, and there is no timer.**

If it did, you would just read off the answer.
```

Shared helper: none
