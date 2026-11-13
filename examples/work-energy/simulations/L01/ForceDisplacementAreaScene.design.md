# ForceDisplacementAreaScene - design note

Status: done
Model: stealth/space-bunny-alpha[1m]
Writes helper: none
Base class: DomSimulation - an SVG graph with a shaded region and dials is exactly boxes-and-SVG, and it needs no frame loop.
Layout: one `sim-card`. Inside it, a row: the SVG graph on the left (force up, displacement across, shaded region under the curve) and a reading column on the right holding the area figure in joules. Below the graph, the three controls: the force slider, the displacement slider, and the steady/varying switch.
| beat | stage | shows | learner can | runs / events | enter() resets |
|---|---|---|---|---|---|
| 0 | a flat line and a rectangle | steady mode, shaded rectangle, area figure beside the region | move the force and displacement sliders; the region reshapes and the area figure re-computes on every change | none - an `input` event redraws the polygon and the figure immediately | nothing to reset: there is no run and no stage-owned state |
| 1 | the push is not steady | the mode switch is live; the region can be swapped to the varying profile | flip the switch and watch the shape change while the number stays the same | same | same |
| 2 | both modes stay reachable | both profiles, nothing hidden or disabled | go back and forth freely | same | same |

Model numbers (the slide's own):
- Force 0-50 N, default **10 N** - the slide's worked example, 10 N x 1 m = 10 J.
- Displacement 0-4 m, default **1 m**.
- The vertical axis is drawn to **75 N**, not 50: the varying profile peaks at 1.5F, so at the top of the force dial the peak is 75 N. A 50 N axis would put the peak outside the plot at every force above 33 N. One fixed axis serves both modes, so the two shapes are compared on the same scale.
- The horizontal axis is drawn 0-4 m and the shaded region is exactly `(d / 4)` of it, so the width on the page is the distance travelled and the trolley stands at its end.
- Steady profile: a flat line at F, shaded region a rectangle, area = F x d.
- Varying profile: rises linearly from 0 to 1.5F over the first third, flat at 1.5F over the middle third, falls linearly back to the axis over the last third. Its area is
  `0.5 * (d/3) * 1.5F + (d/3) * 1.5F + 0.5 * (d/3) * 1.5F = F * d` - the **same** number as the rectangle.
- So the dial means the same thing in both modes (it sets the steady force F), the peak of the varying profile is 1.5F, and **switching modes changes the shape and not the rule or the number**. That is the slide's "Nothing about the rule has changed" made checkable rather than asserted, and it is the reason the peak is drawn and labelled rather than hidden.
- Both factors are on one picture at once: the height of the line (the force) and the width along the horizontal (the displacement), with the area figure sitting beside the region.

Celebrate: none. Nothing is won or completed here - this is a noticing scene, and a burst would imply an achievement the slide does not describe. The feedback is the region reshaping and the figure changing under the learner's own hand.
Comes to rest: no frame loop. Every change is an `input` handler that redraws the polygon and the figure; the switch is a class toggle. Nothing animates on load, so the scene is at rest until touched.
Plausible: the axes are the slide's own; a 10 N push over 1 m is a light trolley shove, and the varying profile is the slide's own "you lean into a trolley, then ease off, then lean again".
Not shown: no machine, pulley or ramp, and in particular **no statement that a machine cannot add work** - this slide only points at the two factors. No energy, power, kinetic energy, speed or joule-per-second anywhere.

Dials: force 0-50 N, displacement 0-4 m, and a steady/varying switch. All three are in-panel (`DomSimulation` has no control bar). The two sliders are native range inputs; the switch is a pair of buttons.

## Look log

round 1 (all 6 shot sets, contact sheet, one full-size dark shot): seen - **the displacement dial did nothing to the picture.** `plotW` was computed and then thrown away: the profile was drawn across the full `x(0)..x(1)` span and the shaded region was always the same width, so the two factors were never both on the page and the stub's "Must get right" was not met. Also: the axis had no scale at all (gridlines but no numbers, no axis names), so the height and the width could not be read as newtons and metres; the force label sat outside the plot and ran off the left edge as `37.5 N peak`; and at any force above 33 N the 1.5F peak left the top of the plot, because the axis was scaled to `F_MAX` and the peak can exceed it. changed - the shaded width is now `(d / D_MAX)` of the plot, so the region is exactly as wide as the trolley travelled; the axis runs to `1.5 * F_MAX` (75 N) so no profile can leave the plot in either mode and both are read on one scale; added named, ticked axes (`force (N)` 0/25/50/75, `distance (m)` 0-4); moved the reading onto an opaque chip inside the plot with a dashed guide tying it to the line's height; added the product written out (`25 N × 4 m`) under the joules, since the slide's whole claim is that work is a product with both factors visible; added a gold trolley with a face standing at the end of the shaded width, which is the slide's own "you lean into a trolley, then ease off, then lean again" and makes the width a thing that travelled rather than a bare span.

round 2 (all 7 shot sets, contact sheet, one full-size dark shot): seen - the chip at max force still collided with the `force (N)` title (report: `overlap "force (N)" x "75 N N peak" at (86,32)`), and the trolley's eyes and mouth were drawn in `--sim-label`, the same token as its body, so the face was invisible in the dark theme and low-contrast in the light one. changed - the chip now flips below its line when there is no room above and is clamped inside the plot; the face moved to `--sim-bg-deep` on the gold body, so it reads in both themes. A confirming report-only pass over 10 dial states (max force, zero force, 0.5 m, both modes) reports 0 issues; no third round was taken.

open: none.

## Checks explained

`check-scene L01/ForceDisplacementAreaScene --bundle work-energy`: PASS - 0 fail(s), 0 warning(s).

Fixed during the build, all three caught by `sim-layout`: SVG tick labels at 13px were under the 14px floor (now 14); the `Displacement` label was 9px wider than its 92px grid column (`box-overflow`, column now 112px); and the first declared heights were guesses, replaced by the measured 399/627 natural + padding. The look round re-measured the portrait frame: the taller reading column pushes the portrait content to 674px, so `PORTRAIT_HEIGHT` is now 688.

**Verified by driving the dials, because no headless gate moves a slider.** The claim that the two modes agree was checked across the range rather than asserted, re-confirmed by `drive-dom` after the look fixes:

| force x displacement | steady | varying | agree |
|---|---|---|---|
| 10 N x 1 m | 10 J | 10 J | yes |
| 10 N x 4 m | 40 J | 40 J | yes |
| 50 N x 4 m | 200 J | 200 J | yes |
| 0 N x 2.5 m | 0 J | 0 J | yes |
| 25 N x 2.5 m | 62.5 J | 62.5 J | yes |
| 25 N x 4 m | 100 J | 100 J | yes |

The 1.5F peak with a flat middle third is what makes this exact rather than approximate, so the learner sees the same number under a visibly different shape - the slide's "Nothing about the rule has changed", made checkable. The opening state is the slide's own worked example, 10 N x 1 m = 10 J.

## Requests

- The trapezoid drawn here is this scene's own teaching shape, not the source chapter's exercise figure, and its numbers are the scene's own. No question in the course uses what this graph shows. Stated on the note card as the stub requires.
