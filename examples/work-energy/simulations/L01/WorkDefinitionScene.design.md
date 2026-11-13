# WorkDefinitionScene - design note

Status: done
Model: stealth/space-bunny-alpha[1m]
Writes helper: none
Base class: DomSimulation - two dials either side of a live product on one card is boxes and numbers; nothing to draw and nothing to animate.
Layout: one `sim-card`. Title row with the formula. A caption under it saying the displacement is always along the force. Then a single row: the force dial, a multiplication sign, the displacement dial, an equals sign, and the joule figure in a larger box. Under the box, the words that define the unit. Under that, the two question tags, which arrive on the last beat.
| beat | stage | shows | learner can | runs / events | enter() resets |
|---|---|---|---|---|---|
| 0 | two numbers, multiplied | the two dials and the live product | drive either dial and watch the third number follow | none - an `input` event recomputes the product immediately | nothing: no run and no stage-owned state beyond which tags are showing |
| 1 | the joule box is the focus | the same card, the joule box emphasised, nothing disabled | reach 1 N and 1 m, so the unit is demonstrable rather than asserted | none | same |
| 2 | the two questions | the two prompt tags appear under the product | everything above them still works exactly as before | none | same |

Model numbers (the slide's own):
- Force 0-100 N, step 1. Displacement 0-20 m, step 0.5, ranged so the displacement is **always along the force** - there is no angle control on this card at all, because the angled case belongs to a different scene.
- `W = F × s`, in whole joules. Default 20 N at 5.0 m = 100 J.
- **1 N at 1.0 m reads exactly 1 J**, and both are reachable on the first notch of their own dial: the force step is 1 N and the displacement step is 0.5 m, so the unit is a thing the learner can dial up rather than a claim on the card.
- The result carries the unit in words and symbol: joule, `J`.
- The card defines the unit in words on its face: one newton moving something one metre along itself.
- On the last beat two tags appear under the product - **which force**, and **on which object** - and nothing above them changes.

Celebrate: none. Nothing is completed or won; this is a definition being assembled, not a task.
Comes to rest: no frame loop. The only motion is the number changing under the learner's own hand, and there is no timer anywhere. The scene is at rest on load.
Plausible: the arithmetic is the definition with real units (N × m = J); the 0-20 m range is a trolley-or-wheelchair-or-sack push, which is the kind of job the lesson has been using.

Not shown: no energy, no power, no sign and no negative readings - the two dials cannot produce a negative, because there is no direction control here. **No second object to compare against**: the last beat's tags ask "which force" and "on which object" as questions only, and the scene does not go on to build the floor-friction comparison the slide's prose makes. That comparison would be a second object and a second number, and the stub explicitly excludes it. The source chapter's two-cube schematic is also deliberately not reproduced - this card is an original construction, and its numbers are its own.

## Progress           <- one line per step, added by scene-pass.mjs
- rev n4: beat 2 swaps the dials for the wheelchair picture (push vs friction arrows) drawn by shared WheelchairPush.js; HEIGHT 332

## Look log

Rounds: 2 of 2. Model: opencode space-bunny-free. Sheet: `build/shots/work-energy/L01/WorkDefinitionScene-sheet.png`.

- round 1 (sheet b0/b1/b2/b2-2 both themes; full-size dark b1 and light b2): seen - both range inputs were unstyled browser chrome (white unfilled track, chrome-blue thumb) against a purple/cream theme; beat 1's "the joule box is the focus" was a 2px border change alone, so the emphasis the paragraph asks for was not visible; the F and s readouts sat on the 14px muted floor; the result was 26px in a 560px frame. changed - none; states shot first.
- round 2 (`--steps`: b0 default, b1 at 1 N x 1 m, b2 with the tags, b2 at 100 N x 20 m; both themes): seen - all four defects gone. `accent-color: var(--sim-accent)` puts the sliders in the theme (the in-bundle idiom, L03/L04/L05/L07); the focused J box now carries a gold figure and a 14px glow, `StowedWorkScene`'s `--lit` idiom, so `1 J` reads at a glance; readouts are 16px in `--sim-label`; ops at 2xl, the result at 32px in a 132px box. Arithmetic photographed: 1 N x 1 m = `1 J` on beat 1, 100 N x 20 m = `2000 J`. Report 0 issues, no page errors, sheet clean in both themes. changed - the five CSS rules. `HEIGHT` 324 / `PORTRAIT_HEIGHT` 560 left alone: after the growth check-scene reports neither clipping nor slack.
- open: the card is boxes-and-numbers by the stub's own base-class reasoning - no face, no apparatus - so it sits below the look-kit showcases in warmth; closing that is a redesign, not a fix, and the brief's round cap is spent. Portrait is verified by sim-layout only, never shot.

## Checks explained

`check-scene L01/WorkDefinitionScene --bundle work-energy`: PASS - 0 fail(s), 0 warning(s). No warning left, so nothing here is argued.

Fixed during the build: the portrait frame was declared 470 and clipped by 13px on beat 0 and 61px on beat 2 (the beat with the tags). Heights are now the sim-layout measurements plus padding - 324 landscape against a natural 305, and 560 portrait. The first `HEIGHT` edit silently did not apply and the slack warning caught it.

**The unit is demonstrable, not asserted.** The stub requires 1 N at 1 m to be reachable so the learner can dial up exactly one joule. Verified by driving: the force step is 1 N and the displacement step is 0.5 m, so **1 N x 1.0 m reads exactly 1 J**. The default reads 100 J, the maximum on the dials is 100 N x 20.0 m = 2000 J - which supports the slide's "every ordinary job you met in this lesson is worth thousands of them" - and 0 x 0 reads 0 J.

**No negative reading is reachable.** Swept every dial step against every other: both dials are floored at 0 and there is no direction control on this card, so no setting can produce a negative. A grep for energy / power / negative / sign-of / friction across the file is clean, `ARIA_LABEL` included.

The last beat's two tags are questions only - "which force?" and "on which object?". The scene does not go on to build the floor-friction comparison the slide's prose makes, because that would be a second object and a second number, which the stub explicitly excludes.

## Requests

- The stub says "the equals sign sits between the two dials". Read here as the equation being written across the row - `F × s = W` - with the multiplication and the equals both drawn, rather than the product being implied by putting two boxes side by side. A literal `F = s` would be a false equation. Recorded as an interpretation.
