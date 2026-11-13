# Visual profiles: lite and rich

Two rule sets for scenes. `lite` is the house style of `simulation-authoring.md` (flat, cheap, parks fast). `rich` trades low-end comfort for visual appeal: lit, textured, alive. Pick one per course at Stage 1b; a scene may override.

## Where it is set (first hit wins)

1. Scene: `static VISUAL_PROFILE = 'rich'` (or `'lite'`).
2. Stub: `Profile: rich | lite | course` line.
3. Course: `"visualProfile": "rich"` in `bundle.json`; OUTLINE.md says it once under the title (`Profile: rich - <why>`).
4. Default: `lite`.

`scene-info` and `check-scene` print the resolved profile. Use rich for courses (or showpiece scenes) where the picture IS the lesson: experiments, organisms, machines, places, historic moments. Keep lite for boards, sorters, number work.

## Same in both profiles

- Closed palette: `--sim-*` tokens only. Rich gets its depth from light and material over those tokens, not new colours.
- 14 px text floor; text contrast 4.5:1, graphics 3:1; both themes.
- Reduced motion shows each beat's end state.
- `draw` is a pure function of state and `t`: no `Math.random` in draw (resume must repaint the same frame).
- Vendored code only; no CDN; sanitise text; India border rule; nothing applied mid-lesson.
- Busy while a run moves; the base still stops the loop off-screen.

## What rich relaxes

| Lite rule | Rich |
|---|---|
| Flat fills, two-tone shade, gradients only for literal light (4.5) | Gradients, soft shadows, rim light, glow allowed on any form |
| Small shape vocabulary; no representational realism (4.5) | Illustrated, representational subjects |
| No grain or texture of its own (4.7); the kit backdrop is the course's setting (a world: sky, water, field, parchment, lab), riso paper with grain + halftone corners on request | Textures on any form, drawn once to a cached tile |
| `CONTINUOUS = false`, no idle motion (3.4, 4.7) | `CONTINUOUS = true` for ambient life; no reason comment needed |
| No `ctx.filter`, about 60 animated glyphs (PLAN rule 6) | Filters and particle fields allowed; cache what does not move |
| At most one GeoScene per lesson (3.2) | WebGL/three.js wherever depth sells the idea |
| Tap motion at most 0.8 s (4.7) | Longer cinematic beats, still skippable by a tap |
| DOM first for labelled content (3) | Canvas or WebGL when the drawing is the point |
| Note card on canvas | Optional; the scale caveat goes in slide prose |
| 2 look rounds (`shoot`) | 4 look rounds |

Rich gives no weak-device fallback: the scene runs as written everywhere. Keep it smooth on a mid phone anyway (cache static layers, DPR cap 2).

## Rich craft: what to do with the freedom

- **One world, not a slide.** The backdrop is the subject's place (lab bench, riverbank, temple court, night sky), with a floor, a far layer and haze. Never the generic dots + drifting blobs.
- **One light.** Pick a key-light direction per scene (default top-left) and obey it: body gradient light to dark across each solid (`lighten`/`darken` of ONE token), a rim highlight on the lit edge, a contact shadow where it meets the floor.
- **Materials read.** Glass: thin tinted fill, bright streak, darker edge. Metal: banded linear gradient plus a sharp specular line. Liquid: meniscus, a lighter surface band. Skin, leaf, cloth, stone: cached texture tile at low alpha.
- **Depth.** Two or three layers; far layers lower contrast and nearer the backdrop colour; a slow parallax on camera moves.
- **Fewer labels.** At most 4 per beat. Thin leader line to plain text; pills only for state or a verdict. Labels never sit on the evidence.
- **Life.** Something small always alive (motes, shimmer, breathing, drifting particles), subordinate to the hero; it never competes with the beat's change.
- **One moment.** Each scene has a payoff beat built like a film shot: camera push, the change, a hold. Plan it in the stub.
- **Hero size.** The hero fills at least 40% of the frame on the payoff beat.

## Review (rich)

- `shoot --dpr 2`, both themes; `motion-probe --sheet` for the payoff beat.
- Compare side by side with the reference board (`coauthor/docs/simulation-recipes/`, rich pilot scenes): would a student screenshot this? If not, name the gap (light, material, depth, composition, motion) and fix that one.
