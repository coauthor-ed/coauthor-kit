# BagLiftRigsScene - design note

Status: done
Model: stealth/space-bunny-alpha[1m] (built) / opencode space-bunny-free (Stage 3-look)
Writes helper: none
Base class: SimScene (canvas) - four rigs side by side, one shared metre wall, sacks that actually travel and stay on the shelf when they land; the comparison is spatial, so it is drawn rather than tabulated.
Layout: backdrop 'dots' + a floor line; the hero band holds four bays in a row across the full width (`heroWide` - there are no side cards, the four bays ARE the content). Each bay is a numbered plate: two posts, the gold shelf it lifts to, the metre marks of the shared wall, the sacks (with faces), a vertical force arrow in the left margin, and its own work readout with a fuel bar beneath. A top chip row names the selected rig and the rule; the bottom band carries the shared verdict chip from beat 1.
| beat | stage | shows | learner can | runs / events | enter() resets |
|---|---|---|---|---|---|
| 0 | one sack, one metre | all four bays drawn idle, every readout and fuel bar at 0 J / empty | pick a bay and a rate, run it; see (a) alone give a baseline W | the chosen bay's lift runs; work readout and fuel bar fill together and stop dead | clears `done`, restores every bay's sacks to the floor, zero readouts |
| 1 | the same job, three ways harder | same four bays, now labelled with what changes (3 one by one / 3 tied / 3 m); nothing animates | run any bay; compare the three against (a) | learner-triggered only, same run shape | same |
| 2 | the bar the fuel has to clear | all four bays, the "same job, same work" chip on; completed bays keep their finished readout | re-run any bay; the three all land on the same value | same | same |

Model numbers (the slide's own):
- One sack of flour: m = 20 kg, weight F = 200 N (g = 10 N/kg, so the arithmetic is exact integers).
- (a) 1 sack, 1 m: W = 200 N x 1 m = 200 J - the reference.
- (b) 3 sacks one at a time, 1 m each: three legs, 200 J each, 600 J total, with a 0.5 s set-down between legs. The force of one lift is 200 N, not 600 N - that is the slide's "the same lift, done three times over".
- (c) 3 sacks tied together, 1 m, one lift: F = 600 N x 1 m = 600 J - same total, different route.
- (d) 1 sack, 3 m: 200 N x 3 m = 600 J - same total, same force.
- So (b) = (c) = (d) = 3x (a), exactly, which is the slide's claim. The force chip on each bay is the force of ONE lift (`PUSH`), so (a), (b) and (d) all read 200 N and only (c) reads 600 N - the one number that differs across the row is the one the slide says differs.
- Rates: slow 3.0 s, steady 1.8 s, brisk 0.9 s per metre - the rate changes the *time*, never the work. Readouts are built from `WORK`, never from elapsed time, so the rate cannot leak into the answer.
- Fuel bar is fuel: it drains in step with the work readout (same 0..600 J scale), and a run always completes, so it always reaches exactly the same fraction - the visual is "the bar you had to clear", not force.

Celebrate: the moment a bay's load lands on its shelf and the readout holds - the learner has found that this route costs exactly what the slide says. One confetti burst at the landed load plus a float of the final joule value, credited to the stage that launched the run, sitting straight above that bay's readout.
Comes to rest: `CONTINUOUS = false`. `busy()` is true while a run is travelling or resting between legs; the loop parks 1.5 s later. Idle bays never move, so a scene with no run is fully at rest - the 8 s control budget is not relied on for a run (bay (b) at Slow is 10 s), but `busy()` is what holds it.
Plausible: a person lifting a 20 kg sack slowly needs a little more than its weight (stated as "just beats its weight" - the model uses exactly 200 N, the idealised limit, named on the note card); a 60 kg bundle is lifted by one person only in the idealised sense and the note card says so. No person is drawn: all four bays share one 1:1 metre wall inside 256 px of plate, where a 1.7 m figure would be 110 px tall - taller than the 1 m lift itself - so a correctly scaled person cannot be drawn in a bay at all, and a reach drawn to fit would be a lie. The character is on the sacks instead, and the person's part is carried by the force arrow and the note card.
Not shown: no energy, no power, no "work per second" - the lift rate deliberately changes nothing but the time, and there is no rate readout at all, so the learner cannot read power off the scene. No machine, pulley, ramp or lever vocabulary: no frame that helps, no hoist, just a person, a sack and a shelf. The sack is never described as holding or storing anything.

Traps deliberately designed against (from prior passes and from the look rounds):
- Every run-completion gate keys off elapsed run time (`this._t >= this._dur`), never `progress >= 1` - `cruise(1)` can return 0.999... and the landing reveal would then never fire.
- **A landed load stays on its shelf.** Before the look round, `_landed` stored only the joules, so the draw fell back to height 0 and every finished run dropped its sacks back to the floor while the readout still said 600 J - the opposite of "the sacks all end up on the same shelf". The landed record now carries the leg count, and the draw puts those loads on the shelf.
- **(b) is three separate legs, not three sacks drawn on top of each other.** The three rectangles were drawn at the same x, so (b) was pixel-identical to (a) and the slide's central claim had no picture. Legs now run one at a time, each into its own floor slot, with a set-down pause, and the work climbs 200 -> 400 -> 600.
- The force shown is the force of one lift, not the total load: a 600 N arrow on (b) would have taught that three separate lifts need three times the push.
- Ghosted (not yet lifted) sacks are dashed outlines of the slots they still occupy, so a slot is never drawn as two sacks and the three waiting in (b) read as three.
- Sacks shrink ~4% while in flight and return to full size at rest, so a travelling sack's boxes are strictly smaller than its own resting instances and never get paired against a stale containing panel.
- Labels stay out of the vertical flight lanes: the force arrow is a vertical glyph in the left margin, and each bay's readout is below the floor line.
- The 1 m line is drawn after all four bays, so it really does run across them; drawing it first let four opaque plates bury it.

## Progress           <- one line per step, added by scene-pass.mjs
- rev n2/n3: Rig control is now segmented so rig (a) can be run first; iris-in only on first beat

## Look log

round 1 (5 shots + full-size dark/light idle, b-landed; light-theme too): seen - (a) and (b) were pixel-identical, one green rectangle each, and every finished run dropped its load back to the floor while the readout held 600 J; the "lifted" label sat on top of the force label and the arrow; the cross-bay dashed 1 m line was invisible (drawn under four opaque plates) and the 3 m line doubled the shelf; four tall near-empty plates, no rig structure, no faces; the top chip gave the answer away before the run ("600 J when lifted"); the no-wait frame catches the note card's pop-in, which is why it reported "99% plain backdrop" and a 1.0:1 chip - both artefacts of the first frame, not of the settled scene. changed - landed loads now persist on the shelf; (b) is three timed legs with set-down pauses; the draw is rebuilt around a shared metre wall (two posts, the gold shelf, metre marks, "1 m"/"3 m" named once at (d)'s right edge), ghost outlines for the waiting sacks, a vertical per-lift force arrow in the left margin with the value in a chip, faces on the sacks, the "lifted" text removed, the cross-line drawn last, the top chip now names the rule instead of the answer.
round 2 (8 shots + contact sheet; the report found one issue): seen - the three-lift sequence reads correctly (113 J / 278 J mid-pause / 450 J across the legs, 600 J at the end), (c)'s arrow is visibly three times the others, (d) climbs through the 1 m line to its 3 m shelf, the bays have structure and the plates are no longer voids. changed - the only report-stated defect: the "600 J" float sat on the bay note (overlap reported in both themes), so it now floats just above that bay's readout, where the learner is already looking. Plus the two `lineWidth` style notes check-scene raised. open: see below.

open:
- The "3 m" axis label at (d)'s right edge sits on the same line as (d)'s own note "1 sack 3 m" (about 23 px apart, not overlapping - the report does not flag it). It is redundant with the note; the fix is to drop the two axis labels, or move them below their lines, in a pass that can look at the result.
- The band between the shelf and the roof of a plate is still mostly air. A 0.5 m measuring wall (faint lines every half metre, stronger at 1 m and 3 m) would fill it and make the 3x height difference countable, and the ghost outlines could go from `alpha(c.label, 0.55)` to a faint `c.s3` fill so the waiting sacks read at a glance. Both are drawing-only, but the 2-round look budget was spent, so they need a pass that can see the result.
- Re-running the same rig needs a change of the Rig select first (a select only fires on change). A "lift it again" button, hidden until a bay has landed, would fix it; that is a new control, so it is a request rather than something to slip into a look pass.

## Checks explained

`check-scene L01/BagLiftRigsScene --bundle work-energy`: PASS - 0 fail(s), 0 warning(s) (ident-lint, sanity+draw, beat-check, freeze x9 runs, resume x2 beats, real-browser text report; the only remaining lines are two advisory `note:`s about the design note's size).
`shoot` round 2: 1 report issue (the float/note overlap, fixed above), no page errors.

Fixed during the build, each caught by a gate rather than by eye:

- **Colour token names are `s1`..`s8`, not `series1`..`.** `c.series3` silently resolved to `undefined` and both sanity and draw failed with "fillStyle was set to undefined".
- **The headless legibility guess was wrong about the caption, in both directions.** It first reported the rig letter and the bay note overlapping (real: 18px apart with a 20px display face), then after I widened the gap reported the letter "overflows its container". The real-browser report showed neither - the genuine problems were elsewhere. Widen from the real report, not the headless guess.
- **The note card is 452px wide** (`drawNoteCard`, `cw = 452`); the original three-sentence `sub` lines ran to x=748, off the 680px canvas. Rows are now labels only.
- **`c.raised` as a pill background is 1.1-1.2:1** against the pill's own dark ink; `c.accent` reads correctly in both themes.

Behaviour verified by an exec drive, because no headless gate presses a control (the known control-bar blind spot): running each bay to rest gives a=200 J and b=c=d=600 J, i.e. the slide's exact claim that the three harder routes cost three times the reference; `busy()` returns false after every run and `requestUiUpdate` fires, so the control bar re-enables; and the same bay at slow/steady/brisk takes 61/36/18 steps while the work stays 200 J, confirming the rate changes only the time and that nothing in the scene lets the learner read power off it. (Re-check after the look edits: the round-2 shots show 113/278/450/600 J across (b)'s three legs and 144/424 J climbing in (d), so the per-leg bookkeeping adds up and the freeze/resume probes still pass.)

## Requests

- The control bar is the only input; the geometry is fixed by design, so there is no geometry dial to log as a deviation.
- A "lift it again" button (see `open:`) - a one-line control addition for whoever next touches this scene.
