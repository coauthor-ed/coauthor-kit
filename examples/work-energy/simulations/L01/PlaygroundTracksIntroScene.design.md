# PlaygroundTracksIntroScene - design note

Status: done
Model: stealth/space-bunny-free[1m]
Writes helper: none
Base class: SimScene (canvas) - three track profiles have to be drawn as curves; a panel cannot draw a flattened spiral, and the geometry of each path is the whole point.
Layout: backdrop 'dots' over a soft depth wash, a grass line at y=386, one raised platform on two legs with three tracks descending from it, a child waiting at the top of each. Bottom band: one readout card per track. Left margin: the platform-height measure. Top band: the platform-height chip.
| beat | stage | shows | learner can | runs / events | enter() resets |
|---|---|---|---|---|---|
| 0 | the playground at the top of the platform | all three tracks at the default height, all three readouts visible, no child moving | change platform height, any track's roughness, any child's mass; the tracks and readouts redraw | none - a dial change redraws and returns to rest | nothing: no run and no stage-owned state |
| 1 | three questions, none answered | the same three tracks; no ranking, no ordering, no hint of an answer | the same three dials | none | same |
| 2 | there is no speed box | the same three tracks; no speed box exists for the sentence to be true | the same three dials | none | same |

All three beats draw the same picture on purpose. The stub says beat 1 is "unchanged" and beat 2 is "still nothing moves", and both require the scene to be inert: it must not illustrate, rank or hint at an answer, and it must simply have no speed box.

Model numbers:
- Platform height 1-4 m, default 3 m. The top of all three tracks rises together, and all three drop the same amount - the platform is the same height for all three, and so is the drop. 72 px per metre, grass line at y=386, so a 3 m deck sits at y=170.
- Path length is measured from the drawn polyline at the same 72 px per metre, so the number on screen is exactly the curve the learner can see. All three default to 3 m of drop; the coil and the wavy chute read 3.9 m, the straight chute 3 m.
- Roughness per track: smooth (0 bumps), a few bumps (4), many bumps (9). The bump count is drawn across that track as arcs and reported. The **red** chute defaults to *a few bumps* - the stub's beat 1 requires the roughest track to be drawn with bumps so the bump readout has something to show, and the previous all-smooth default showed `bumps 0` on all three.
- Mass per track: light 25 kg, medium 40 kg, heavy 60 kg, shown as a tag beside the child waiting at that top. Mass changes no geometry and no readout. The three **default to three different masses** (25 / 40 / 60) so the learner sees the dial do something and the slide's "two children of different masses" question has two visibly different children on the platform at beat 0.
- Exactly three readouts per track - **drop**, **path**, **bumps** - and one mass tag. Nothing else is reported.

Hard negative constraints, treated as a checklist:
- No speed, velocity, time, ranking or finishing order anywhere - not in a readout, chip, label or the `ARIA_LABEL`.
- None of the words energy, power, kinetic or potential.
- No "friction" carrying a value. The dial is "roughness" and it reports a **bump count**, never a force.
- No child ever moves and no race is ever started. `busy()` is false always; there is no run to end.

Celebrate: none. Nothing is completed and no answer is available on this slide; a burst would imply a result the chapter explicitly has not reached yet.
Comes to rest: `CONTINUOUS = false` and `busy()` is permanently false - every dial change redraws and the scene is immediately at rest again.
Plausible: a play structure with a raised platform and three ways down is the slide's own picture; a child at the top of each slide is waiting, not moving, exactly as the slide has it.

Traps deliberately designed against (from prior passes):
- The three path labels (`drop`, `path`, `bumps`) live in the bottom band, below the grass, and never in a track's own lane, so a redrawn track can never sweep through them.
- Path length is computed from the same point list that is drawn, so the number and the curve cannot disagree.
- The bump arcs are drawn as arc segments rather than filled round-rects, so a run of them cannot register as a containing panel for the mass tag.
- The bottom band clears the engine's note line (`H - 11`) by 30 px. The build had the cards at y=438 with the note text at y=502 running straight through them; the cards now start at y=400 and end at 484.

## Progress           <- one line per step, added by scene-pass.mjs
- rev n1: iris-in only on first beat (enter() sets fade to 1 on later stages); dials hidden until beat 2 (isControlHidden)

## Look log

round 1 (sheet + dark b0 + light b0, 6 shots): seen - the note line was drawn straight through all three readout cards at y=502; the tracks were 4 px hairlines, so nothing read as a slide and the hero zone was 69% plain backdrop; the children were faceless outline sticks with the mass tag printed over their heads; the platform floated with no legs; all three readouts showed `bumps 0` and all three children `25 kg`, so two of the three dials looked dead; no grass, no landing, nothing under the tracks ; changed - note line moved clear of the cards by raising the cards to y=400 and the grass to 386; tracks rebuilt as filled ribbons (cushion, body, highlight) with a landing pad on the grass; the coil gained a depth wobble and a far-half-first paint order so it reads as a coil rather than a squiggle; children rebuilt as filled figures with faces, a contact shadow and the tag 44 px clear to the right; platform given a slab, a cushion shade and two legs; red chute defaults to 4 bumps and the three masses to 25/40/60; depth wash added behind the set.

round 2 (sheet + dark b0 + light b0, 6 shots): seen - no overlaps, no off-canvas, no low-contrast, no empty centre in either theme; all three tracks read as slides, all three children are on the platform at the same height with different mass tags, the coil curls and the wavy chute has two crests ; changed - nothing. Report: 0 issue(s).

open: none.

## Checks explained

`check-scene courses/work-energy/simulations/L01/PlaygroundTracksIntroScene.js`: PASS - 0 fail(s), 0 warning(s) (ident-lint, sanity+draw, beat-check x3, freeze x24, resume x2, real-browser text report).

Fixed during the build: `lineWidth 6` was off the house scale (now 4); the mass tag on `c.raised` read 1.20:1 (now `c.accent`, the known pill trap); and the `drop` / `path` rows sat 14px apart, which reads as an overlap - the readout card is now 84px tall with the rows 18px apart.

**The forbidden vocabulary was checked, not assumed.** The stub forbids speed, velocity, time, ranking, finishing order, energy, power, kinetic, potential, and friction-as-a-value, and this is the one scene where a single stray word would break the slide. A grep for all of them across the file - including `ARIA_LABEL`, which is user-visible - comes back clean. The dial is "roughness" and it reports a **bump count**; nothing reports a force. One code comment did contain the word "speed" and was reworded so a later audit grep stays clean.

**The one warning the build left is gone.** The earlier pass argued a 60% empty hero zone as unavoidable, naming "sky above the platform". It was not unavoidable: the fix was not to fatten the tracks but to give the scene apparatus - legs, a landing pad on the grass, a depth wash, filled children. `shoot` now reports no empty-centre line at all.

Note: `busy()` is permanently false and `update()` is empty. Nothing can move, so the freeze gate confirms a scene that is at rest at all times, and the "no race is ever started" constraint is structural rather than a promise. The depth wash uses `this.clock`, which parks with the loop, so it is ambient only.

## Requests

- The tracks are drawn as smooth geometric curves rather than as real playground equipment, and the spiral is flattened to the page so its extra length is visible without being to scale. Its reported path length is the length of the curve as drawn, which is therefore shorter than a real 1.5-turn helix of that height would be. Stated on the note card as the stub requires.
- No shared drawing helper is written for this scene, `L05/SlideSpeedRevealScene.js` or `L09/PlaygroundTracksScene-closing.js`, exactly as the stub directs: the L01 stub says a shared helper cannot be built until the L05 scene exists. These three are independent files and may diverge completely.
