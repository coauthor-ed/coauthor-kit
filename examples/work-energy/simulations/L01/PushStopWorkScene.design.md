# PushStopWorkScene - design note

Status: done
Model: stealth/space-bunny-alpha[1m]
Writes helper: none
Base class: SimScene (canvas) - two animated figures whose vector arrows change direction and sign together need a frame loop.
Layout: backdrop 'dots', two bays side by side across the full width. Left bay: a boy pushing a wheelchair, the two arrows parallel. Right bay: a goalkeeper meeting a ball, the force arrow one way and the displacement arrow the other. Each bay has its own work readout with its sign beside it. Top band: the sign chip.

**Two beat maps, and why they share an opening stage.** The scene is mounted by two slides with different counts, so `static BEAT_MAPS = { 3: MAP_S09, 2: MAP_S10 }` with `BEAT_STEP_MAP = MAP_S09`. The legibility checker groups the frame drawn in `setup()` together with beat 0's frames, so if the two maps opened on *different* stages it would report false overlaps. Both maps therefore open at **stage 0**; the only thing that differs between the s09 and s10 mounts is the **default dial values**, which are applied in `setup()` from `this.beatCount`. That satisfies the stub's "the s10 mount must open on the goalkeeper bay with its own default dials" without giving the two maps different opening stages.

| beat | stage | shows | learner can | runs / events | enter() resets |
|---|---|---|---|---|---|
| s09 0 | the chair, positive on its face | both bays idle, left bay's arrows parallel, all three dials live | turn any dial; a change replays the motion once in both bays | one short replay, then the readout resolves with its sign | run cleared, arrows back to rest, readout cleared |
| s09 1 | the right-hand bay is the payload | both bays, the sign chip live | drag the signed dial across its whole travel, through zero; the sign flips as it passes | same | same |
| s09 2 | work is a number | both bays with their signs showing, nothing locked | any dial | same | same |
| s10 0 | the goalkeeper, opening on the negative case | same drawing, goalkeeper defaults | any dial; replay always available | same | same |
| s10 1 | two forces, two signs | both arrows stay visible; nothing else added | any dial | same | same |

Dials (three, all live from beat 0):
- **Signed displacement** -30..+30, step 5. It sets where the displacement points *relative to the force*: +30 = straight along the force, 0 = square across it, -30 = straight back against it. The world angle is `90 + 3d` degrees (the force lane sits at 180), so the arrow sweeps continuously and passes through square-across exactly at 0. `work = F x travel x cos(90 - 3d)` is the cosine of the angle *between the two drawn arrows*, so the number and the picture are the same statement.
- **Force** 0-500 N, step 25.
- **Hand travel** 0-30 cm, step 5 - how far the hands actually travel in the replay. It sets the drawn length of the displacement arrow and the extent of the animation, and does not enter the number a second time.

Model numbers:
- `work = F x (travel/100 m) x cos(90 - 3d)`, rounded to 6 decimals so the square-across stop is **exactly** 0 and not `6.1e-17`.
- One default set serves both mounts, because `static CONTROLS` cannot vary by beat count: displacement -30, force 200 N, hand travel 20 cm. The **chair** reads **+40 J** at that setting because its factor is hard-wired to 1 - its two arrows are parallel by construction, since a chair can only roll the way it is pushed - which is exactly what the stub's beat 0 asks for ("the left one positive on its face"). The **keeper** reads **-40 J** at it, so the s10 mount opens on her negative case with its own defaults and no memory of the s09 mount. Both verified by driving each mount.
- The sign is never a convention: it is a live consequence of the two arrow directions, and the arrows are drawn before the number is read.

Celebrate: the moment the motion stops and the readout resolves with its sign - that is the thing the learner came for. One small burst at the resolving readout, credited to the stage that launched the run.
Comes to rest: `CONTINUOUS = false`. `busy()` is true for the length of one replay only, and the run always ends on a time limit, so the scene parks 1.5 s later. Dials are locked while a replay plays and released on the busy->idle edge, with `requestUiUpdate()` fired there (the gates stub that method, so this is driven and checked separately below).
Plausible: a boy pushing a wheelchair and a goalkeeper meeting a ball with both hands are the slide's own two pictures; the gloves and the chair are drawn as simple shapes and are scenery, not the point.

Traps deliberately designed against (from prior passes):
- Both beat maps open on stage 0 (above) so the `setup()` frame and beat 0 agree.
- The replay is gated on elapsed time (`_runT >= RUN_SEC`), never on an eased value reaching 1.
- The two arrows are drawn at **different scales and different heights** in each bay, so neither can be paired against the other's stale box while the pair rotates together.
- The sign chip and both readouts sit below their bays; nothing is drawn under `ctx.translate()`.

## Progress           <- one line per step, added by scene-pass.mjs
- rev n4: wheelchair drawing extracted unchanged to WheelchairPush.js (shared with WorkDefinitionScene)

## Look log

`round 1 (3-beat sheet, both themes, full-size b0 dark and light)`: seen - the `d 20 cm` chip failed contrast at 2.8:1 on the light backdrop in every beat; the chair was drawn from a `raised`-into-`label` mix that came out murky navy on the dark backdrop and washed grey on the light one, so the apparatus the whole left bay is about nearly disappeared in dark; the note line ended on a dangling "Left out" because `drawNoteLine` joins only the `text` fields and drops every `sub` ; changed - both vector chips now take a light tint of their own arrow's hue with a dark ink of the same hue (the amber chip goes 2.8:1 -> 7.3:1 light, 9.6:1 dark); the chair frame is `c.glass`; the three note lines stand on their own.

`round 2 (5-step run: open, keeper, zero, celebrate, end - both themes)`: seen - all three fixes hold; the square-across stop is unmistakable in the drawing (the keeper's displacement arrow stands straight up, square to her leftward force, readout `0 J` / "square across", top chip "zero work") and the resolve burst lands on the goalkeeper's readout ; changed - the round-1 note line was 764px wide on a 680px canvas and ran off both edges, shortened to fit (this was the one text-report-stated defect left after the round, fixed under the round-2 allowance) ; the text report is clean, 0 issues.

`open:` none outstanding. Not looked at by eye: the 2-beat s10 mount's *drawing* (it opens on the keeper alone, centred - verified by driving, not shot, because the round budget was spent on the 3-beat sheet and its step run).

## Checks explained

`check-scene L01/PushStopWorkScene --bundle work-energy`: PASS - 0 fail(s), 1 warning(s), across **both** beat maps (sanity+draw x2, freeze x3 and x2 runs, resume x2 and x1 beats).

Fixed during the build: a `NaN` could reach the readout when `getControlValue` returned nothing; the readout's number and its descriptor sat on one line and collided; the `d` tag in gold read 2.8:1 on the light backdrop and is now a `pill()` chip; the two bays sat far enough apart to leave a gap dead centre, so they were moved to 236 / 444.

**Two real bugs the static gates could not see, found by driving the scene:**

1. **The two mounts must not share a default.** `static CONTROLS` is shared by both mounts and the host seeds the control bar from it, so the s10 mount was opening on the s09 default instead of the goalkeeper's negative case. An intermediate attempt treated the mount's own default as authoritative until the learner turned a dial (a `_touched` flag) - it worked, but it was a second source of truth for the same three numbers. The shipped fix is one line: the single default is displacement **-30**, the keeper's negative case. The chair does not need a per-mount default at all, because its factor is hard-wired to 1 and it is positive whatever the dial says. Verified by driving each mount: s09 opens with the chair at **+40 J**, s10 with the keeper alone at **-40 J**, and after any dial turn the host value is the one that counts.
2. **The s10 mount drew both bays.** The stub requires it to open on the goalkeeper bay only, since it is a fresh mount that cannot rely on the learner having seen s09. Now `_bays()` returns the keeper alone, centred, when `beatCount === 2` - chrome gated on the beat count, with both beat maps still sharing opening stage 0, which is what keeps the legibility checker from false-firing on the grouped setup/beat-0 frame.

**The sign, driven across the whole travel:** +30 -> +40.00, +15 -> +28.28, +5 -> +10.35, **0 -> exactly 0.00**, -5 -> -10.35, -15 -> -28.28, -30 -> -40.00. The sign flips as the dial passes through square-across, and the zero is exact (the `Math.cos` residue is rounded out, the fourth time that has mattered in this bundle).

**The control lock/release latch**, which every headless gate stubs out: dials report `isControlDisabled` true during the replay, `busy()` false after 32 steps, `isControlDisabled` false again, and `requestUiUpdate` fires exactly once on the busy->idle edge - so the bar actually re-enables rather than staying dead until the learner touches something else. The run always terminates.

**One warning left, argued rather than fixed:** `empty centre, 51-56% of the hero zone`. Moving the bays together took it from 56-61% to 51-56% and no further. The remaining space is above the two figures, where the force and displacement arrows live at y 184 and 228 - that band is the scene's whole content, and the figures stand on a floor at 330. Enlarging the figures would push the arrows into the top chip band. Left visible and explained.

## Requests

- The stub's three dials do not say how the signed displacement and the hand travel divide the work between them. Read here as: the signed dial sets the *direction* (and therefore the sign) and the hand travel sets the *magnitude*. Recorded because it is an interpretation, not a quote.
- The stub's s10 mount "must open on the goalkeeper bay with its own default dials". `static CONTROLS` cannot vary by beat count and the host seeds the bar from it, so there is one default for both mounts, chosen to be the goalkeeper's negative case (-30). That satisfies the line without a second source of truth for the dial values; a reviewer who wants a genuinely distinct s09 opening would need a per-mount default in `setup()` gated on `_touched`, which is the version this scene tried and dropped.
