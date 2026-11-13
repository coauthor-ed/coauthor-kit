# PushWallScene - design note

Status: done
Model: stealth/space-bunny-alpha[1m]
Writes helper: none
Base class: SimScene (canvas) - a figure leaning on a wall with a fine tremble and a continuously filling meter needs a frame loop, and the wall is a drawn surface he pushes against.
Layout: backdrop 'dots', a floor, a red brick wall in side view on the right with a coping course and a plinth, the boy leaning into it from the left with both palms flat. A readings card top-left carries the three numbers, clear of his head (the card's right edge is at 266, his head starts at 300). Two chips at the top name the two things the slide compares - "you" and "the wall" - each with a leader to it. The fatigue meter runs along the bottom band with its percent value beside the bar, not inside it, and is labelled separately from the work box.
| beat | stage | shows | learner can | runs / events | enter() resets |
|---|---|---|---|---|---|
| 0 | the verdict | boy and wall, effort at its default, wall moved `0.000 m` and work `0 J` already on screen | move the effort dial immediately; nothing is locked | while effort is above zero he holds: the tremble runs, the fatigue meter fills, the held counter climbs | the hold stops and his state clears; the dial value is the learner's and is kept |
| 1 | the tremble and the meter at full strength | the same two meters, which are the whole composition | the same one dial | same | same |
| 2 | both quantities side by side | unchanged, so the two can be compared at the end | the same one dial | same | same |

The central contract, held exactly:
- **Wall displacement is `0.000 m` at every effort setting, and the work box is `0 J`.** Both are literal constants in the drawing, not the result of a nearly-zero computation, so no force can ever move them.
- **The force readout does change with the dial** - 0-500 N across 0-100% effort - and the work number beside it does not. That contrast *is* the slide: W = F x s with an s of zero comes out zero for any force at all. The push arrow grows from 26 px to 108 px with the same 0-500 N, always with its tip on the wall.
- **The fatigue meter and the work box are two separate objects with two separate labels and are never the same box.** The meter is labelled "effort spent" in percent. It is never labelled in joules, and the work box is never a meter.
- Nothing about the wall changes at any point: no flex, no creak, no shift. The scene is about the fact that it does not.

**What each beat points at.** The three beats share one picture - the dial is the learner's and the scene never seizes it - so each beat rings the one quantity its paragraph is about, in dashed gold, and nothing else: beat 0 the `Wall moved 0.000 m` row, beat 1 the fatigue meter, beat 2 both (the two quantities side by side). The ring is a highlight, not prose; the slide says why.

Dials: effort 0-100%, step 5, **default 0**. A read-only held counter that climbs while he holds, and is the only thing on the panel that ever counts upward.

**Ending the hold, so the scene can come to rest.** Two independent end conditions, because a hold that can only be ended by the learner is a hold that can run for ever:

1. **The default effort is 0**, so the scene rests the moment it mounts. The learner starts the hold by turning the dial - which is also what beat 0 asks for ("the learner can move the dial immediately").
2. **The fatigue meter fills and caps.** At `effort/100 * (100/6)` percent per second, full effort exhausts in **6.1 s**, inside the 8 s animation budget, and `busy()` goes false when the meter reaches 100%. Dropping the dial to zero releases the hold immediately, which is the stub's "lets him step back".

Verified by driving: 100% effort ends in 6.1 s, 60% in 10.0 s, 25% in 24.1 s, all with `busy()` false and the meter capped at 100% - so the loop parks in every case and nothing creeps past its own scale. The first build had a 12 s full-effort hold from a default of 60, and the idle gate correctly reported **the loop never parks**; both numbers are now inside the budget.

Celebrate: none, deliberately. Nothing is won. The scene is a refusal to move a number, and a burst would be the wrong punctuation for it.
Comes to rest: `CONTINUOUS = false`. `busy()` is true only while he is actually holding - effort above zero and fatigue below full. Drop the dial to zero, or reach full fatigue, and the loop parks 1.5 s later. The tremble is part of the hold and stops with it.
Plausible: a boy with both palms flat on a brick wall, arms locked, leaning his weight into it; a fine high-frequency tremble in the shoulder and forearm is what sustained effort looks like; a brick wall as immovable geometry is the slide's own premise.

Not shown: **the word energy** anywhere - the chapter gives it its own lesson. No speed, no time-of-day, and nothing about what the tiredness turns into. The meter is effort spent, not joules and not energy.

Traps deliberately designed against (from prior passes):
- The two readouts and the fatigue label are static text; the only moving ink is the held counter and the meter percent, and both refresh on a 0.5 s tick rather than every frame, so a climbing number cannot read as a self-overlap.
- The wall is drawn from flat rectangles with no animated geometry at all, so nothing can be paired against a stale wall box.
- The fatigue meter is a filled path, and its label sits beside it rather than on it.

## Look log

- round 1 (dark/light b0-b2 sheet, one full-size dark b1): seen - the readings card covered the boy's head, so the hero had no face at all; he was four thin violet strokes on a bare backdrop, under a third of the width, with no contact shadow and no character; the `0%` readout sat in the note-line band; the force pill overlapped his legs. changed - moved the card to a 250 px column clear of the head and rebuilt the boy as a filled figure (shirt, shaded back, braced legs, shoes, skin head with hair, `drawFace` squint while he holds, contact shadow) at 246 px tall; put the chips "you" / "the wall" with leaders in the empty top band; moved the percent beside a 508 px bar in the bottom band; moved the push arrow into the gap between him and the wall at y=272, where nothing else is; gave the wall a coping course and a plinth; per-beat gold rings.
- round 2 (8-shot sheet: rest, holding at 500 N, compare at 67%, released; both themes): text report 0 issues in both themes. seen - the dashed meter ring cut through the "Effort spent" label and the muted clarifier; the legs were `lighten(bgSurface, 0.5)`, i.e. near-white on the light theme's floor; the `0 N push` pill's right edge reached the wall face. changed - the meter ring is now a 2 px outset around the bar only; trousers and shoes are `darken(s1, ...)` so they hold contrast on the floor in both themes; the pill's clamp is `WALL_X - 52`. open - the figure could be a third larger and his head sits a little low on the shoulders; unverifiable in this round, since the 2-round look budget was spent on the sheet above (no third shoot run is allowed), so it is left rather than changed blind.

## Checks explained

`check-scene L01/PushWallScene --bundle work-energy`: PASS - 0 fail(s), 0 warning(s) (ident-lint, sanity+draw, beat-check, freeze 6 runs, resume 2 beats, real-browser text report), re-run after the last edit of the look stage. No warning left, so nothing here is argued. The only advisory is the note's own size (9.6 KB against a 6 KB guideline): the extra is the beat table, the contract list and the two-round look log, all of which the stage rules ask for, so it stays.

Fixed during the look stage:
- **The freeze gate failed on all three beats at full effort** - "parked 8.0s FROZE _held: 8.02 -> 40.01". The loop parked correctly 1.5 s after the meter capped, but the harness keeps pumping `update()` after the park, so the held counter crept on for another 32 s. Fixed at the source: `update()` returns as soon as `_fatigue` reaches 100, because the hold is over then - so a parked scene advances nothing at all.
- **`onBeatChange()` is owned by `SimScene`**, so the beat is read from `this.stage` in `draw()` rather than tracked in a field.

Fixed during the build:

- **The loop never parked.** The idle gate reported draw calls still growing well past the 8 s budget. Cause: the default effort was 60, so on mount he held for 20 s - longer than the budget - and `busy()` was correct to stay awake, but the gate cannot tell a genuine hold from a leak. Fixed by resting at zero effort by default and capping the meter at 100% in 6.1 s of full effort, so every hold has a real end.
- **`0.000 m` overflowed its card** because the text was left-aligned while being drawn at the card's right edge. Now right-aligned before the draw. (Superseded in the look stage: the card is now a `drawReadout`, which right-aligns values by construction.)

**The slide's central claim is structural, not computed.** `WALL_MOVED_M` and `WORK_J` are string/number constants used directly in the drawing. There is no multiplication anywhere in this scene that could produce a work number, so no effort setting can move the work readout even in principle - which is a stronger guarantee than a computation that happens to evaluate to zero. The force readout beside it *does* move, 0-500 N across the dial, and that contrast is the whole slide: W = F x s with an s of zero comes out zero for any force at all.

The fatigue meter and the work box are separate objects with separate labels; the meter reads percent and never joules, and the work box is never a meter. `busy()` is false at zero effort and false once the meter is full.

## Requests

- One look round would settle the figure's size: see the `open:` line in the Look log. Nothing else is needed - the checks are green and the text report is clean in both themes.
