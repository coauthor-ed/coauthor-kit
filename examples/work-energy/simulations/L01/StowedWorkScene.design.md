# StowedWorkScene - design note

Status: done
Model: stealth/space-bunny-alpha[1m] (build), opencode space-bunny-free (look)
Writes helper: none
Base class: DomSimulation - a shelf, a sack and two labelled panels with lit values is a still life with readouts; nothing to draw and nothing to animate.
Layout: one `sim-card`. Inside it, a two-column row: on the left an inline SVG of the sack standing on a shelf, on the right the same brick wall as the wall scene. Directly under each picture sits that picture's value panel. Below, the shelf-height dial and the tap target.
| beat | stage | shows | learner can | runs / events | enter() resets |
|---|---|---|---|---|---|
| 0 | the lifting is over | the sack on the shelf with its panel **already lit**, the wall beside it still standing at zero | change the shelf height; tap the sack panel to re-brighten it | none - a tap adds a class; nothing counts down, drains or empties | nothing: no run, and the lit state is the beat's own resting state |
| 1 | the closing question, unanswered | the same two panels, one lit and one at zero | the same | none | same |

The whole scene is the **pair of panels**, and it must not resolve anything further.

Model numbers:
- Sack 20 kg, so the force to raise it is 200 N (g = 10 N/kg).
- Shelf height 1-4 m, default 2 m -> the value on the sack's panel is `200 N x h`, i.e. **400 J** at the default. Raising the shelf is a new lift with a new value; the number is never stored, it is recomputed from the two dials' own product.
- The wall's panel is the constant **0 J** throughout, matching the wall scene. Nothing anywhere converts one value into another: there is no arithmetic in this scene that maps the sack's number onto the wall's, and the wall's value is a constant, not a result.

**The lit panel must stay lit.** Tapping it re-brightens the number and the bright state persists - there is no timer, no transition back to dim, no countdown and no drain. The value only changes when the shelf height changes, and then it holds just as steadily. This is the scene's entire claim, so nothing in the code may make the number move on its own.

**The panel carries a bare number and its unit and nothing else.** No label naming the quantity anywhere - not "work", not "energy", not "capacity to do work". The two cards are identified by their **objects** ("sack", "wall"), which says which is which and names no quantity; the number itself is naked, exactly as the stub requires, because naming it is the next lesson's job.

Not shown: the word energy, any name at all for the lit number, no machines, no power, no story about what the number is or what it can be spent on.

Celebrate: none. The scene is a still life and the beat's job is to sit there.
Comes to rest: no frame loop, no transition that resolves on its own. The only motion is a short CSS transition on the tap's brighten, which settles and stops. The scene is at rest on load, since the panel starts lit.
Plausible: a sack standing on a shelf with nobody touching it, and a brick wall beside it that has not moved - both are the slide's own picture.

## Progress           <- one line per step, added by scene-pass.mjs
- rev n9: dead 'Touch the panel' button replaced by 'Let an hour pass' - clock on the sack tag advances, value stays lit and unchanged

## Look log

`round 1 (contact sheet + dark b0 full size):` seen - the sack read as a **bottle**, not a bag: a rounded body with a narrow cap, against a slide that says "the bag is on the shelf"; no face anywhere, while the same sack in `BagLiftRigsScene` has one. The shelf was a **table whose legs shorten** as the height rises, which no real object can do. Nothing stood on a floor, so the sack, the posts and the wall all floated. No cushion shade on any shape, and the tap button was a full-width bar under the dial. Text report 0 issues, so every one of these is a picture problem, not a layout one. Changed - the sack is redrawn as a bag: plump at the base, drawn in at the shoulders, with a gathered neck and a tie, plus eyes, a smile and glints, in the same `--sim-series-3` green the rigs scene uses, so it is the same object across the lesson. The shelf is now a **shelf unit**: two fixed posts on the floor and a board set at different heights on them, with a cushion underside, a lit top lip and a contact shadow. A floor band with a lit lip runs across both pictures, so the two cards are two views of one room, and the wall now stands on it with its own shadow and a two-course cushion shade.

`round 2 (contact sheet + light h3 full size):` seen - round 1's fixes hold: the sack is unmistakably a bag with a face at every one of the four heights, the board visibly climbs fixed posts, both cards share a floor, and the wall's bottom courses read as depth. Nothing left that the sheet shows. Changed - none to the drawing.

`after round 2, from check-scene:` sim-lint FAILed 8 literal hex colours in the new cushion/ink rules, so every `#000`/`#14304a`/`#fff` became a token mix. `--sim-waste` is the one neutral that is dark in **both** themes (dark #78716c, light #57534e), so every cushion mix darkens in the light theme as well as the dark one, and the ink is `label 22% + waste` and the glint `bg-surface 82% + label`, which keeps the face dark-on-green and its glints light in both. Geometry, sizes and `HEIGHT`/`PORTRAIT_HEIGHT` are untouched by that swap; the only verification of it is `shoot --report-only`, 0 issues in both themes, because the 2-round shot budget was already spent and the sheet on disk is one token swap behind the file.

`open:` the still-life pair is deliberately quiet - no celebration, no motion - so the sheet reads calmer than the GOOD look-kit images by design, and the only thing a reviewer may want more of is the sack's knot, which is 23 px of picture and could be drawn larger or given a string. Both need a pass that can see the result; the look-round budget for this scene is spent.

## Checks explained

`check-scene L01/StowedWorkScene --bundle work-energy`: PASS - 0 fail(s), 0 warning(s) - after the look pass as well as after the build. The one FAIL the look pass caused and then fixed is written in the Look log (sim-lint's `hex-color` on the new cushion/ink rules). No warning is left, so nothing here is argued.

Fixed during the build: the portrait frame was declared 700 against a measured natural of 934 - the two columns stack on a phone, so it is far taller than the landscape frame. Now 952 (measured + padding); landscape stays 470 against a natural of 453.

**"It stays lit" was verified rather than assumed**, since that is the scene's entire claim and nothing in a static gate could see it:

- The value is **recomputed** from `SACK_F * h` on every paint and never stored, so it can only change when the shelf height does: 1 m -> 200 J, 2 m -> 400 J, 3 m -> 600 J, 4 m -> 800 J, with the wall constant at 0 J throughout.
- A grep for `setTimeout`, `setInterval`, `requestAnimationFrame`, `clearTimeout`, `_tick` and any countdown in the file comes back **empty**. There is no mechanism in this scene by which the number could fade, drain, empty or count down, and no timer to reverse the lit state.
- Tapping the panel fifty times leaves it lit; `_brighten()` only ever adds the lit class and there is no path back to dim.

**The panel is naked, as the stub requires.** No label anywhere names the quantity - not "work", not "energy", not "capacity to do work". The two cards are identified by their objects ("sack", "wall"), which says which is which and names no quantity. A grep for energy / capacity / power / machine across the file is clean, `ARIA_LABEL` included.

## Requests

- None. The look pass changed only `StowedWorkScene.js` and this note: no helper, no stub, no other scene, no prose.
