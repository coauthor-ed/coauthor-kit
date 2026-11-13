<!-- EXAMPLE stub, a good shape to copy. Trimmed from a real scene (work-energy L05 EscapeRampScene): the numbers are real, the slide prose is omitted here (the real stub ends with a "## Verbatim slide markdown" section that lesson-check keeps equal to the prose file). Read it for the SHAPE: concrete Hero, numbers in Dials, Must get right items each with where it comes from and how a test sees it. -->
# EscapeRampScene - simulation stub
Save path: simulations/L05/EscapeRampScene.js
Attached by: blk-l05-s09 (example)
Beats: 3
Base class: CanvasSimulation (a truck climbing a ramp in one dimension with four energy entries posting as it goes: the motion is simple but the ledger is the content, and it must stay readable while the truck moves)
Hero: A truck at the bottom of a road on the left, a gravel ramp climbing to the right at a fixed 30 degree slope, and a four-row ledger card beside the scene: what it arrived with, what the climb costs, what the gravel takes, what is left.
Dials: ramp length, 10-60 m, step 0.5 m, default 10 m (a slider; the gravel bed stretches along the fixed slope). Gravel resistance, 0-4000 N, step 250 N, default 1500 N. No speed dial and no braking control: the truck cannot stop any other way. Run button.
Run shows: Run sends the truck from the road onto the ramp. The four entries post as it climbs; it stops partway up, arrives at the top still moving, or stops exactly at the top. The last entry reaching nothing exactly as the truck reaches the top is the answer; the scene must not announce it.
Note card: the angle is drawn and fixed; the height gained is half the ramp length, shown as a dashed rise, not computed on screen. Both bills are drawn as withdrawals from one account.
Must get right:
- (slide) TWO bills come out of ONE account, the climb and the gravel; the second is a second bill, not a bonus. Check: both bill rows are non-zero after a run at length 27, gravel 1500.
- (slide) Too short a ramp leaves the truck still moving at the top; longer than needed stops it short. Check: length 10 -> verdict says still moving; length 45 -> verdict says stopped short.
- (derived, 202500 / (6000 + F) m) Only the length that empties the account exactly at the top is a stopping ramp, and the scene never prints that length. Check: after a run the visible text contains no length in metres other than the dial's own value.
Not yet taught: no conservation by name, no answer in metres on screen. No power, no machines.
Reuse: none. Mounted once.
Self-check: counts ok (3 beats = 3 Per beat entries; 4 ledger rows; 2 bills); arithmetic ok (L* = 27.0 m at F = 1500 N); no field contradicts another.

## Per beat
- beat 0: the truck at the bottom of the road, four ledger rows empty, both dials live. The learner can set and re-set before running.
- beat 1: a deliberately short ramp run (the default 10 m). The truck leaves the top with speed left and the fourth row is still non-zero. Nothing is locked after the run.
- beat 2: the length worked up until the fourth row reaches nothing exactly as the truck reaches the top, and one step further so the truck stops short. Both ends of the dial are shown; the scene does not name the answer.

## Verbatim slide markdown
(omitted in this example)
