# Look packs

One folder per look: `packs/look/<id>/`. Look-free rules: `docs/look-base.md`.

- `CARD.md`: the requirement. Briefs and bundles carry it; never cut it.
- `SPEC.md`: reference (world, shape, colour, light, type, motion, celebration).
- `SHOWCASE.md`: approved anchor shots. A lean model tier may skip them.

Packs: `quill` (default) and `plain` (editorial explainer, data-journalism feature; classic only, gamification off; theme only, all kit machinery at full power). Each pack is whole: no pack inherits from another. A new look: copy a pack to `<id>/` and rewrite CARD, SPEC, SHOWCASE; engine side it also needs a `registry/looks.json` entry, a token css and a reactor. Pick the look with repo-root `profile.json`, or per course with `bundle.json` `"look"` (`packs/audience/README.md`). The look also sets the game quotas: `quill` as `docs/mini-games.md` and `docs/arcade-games.md`; `plain` per its card (mini-game optional, no arcade).

LookProfile: the numbers the kit draws with live in `simulations/base/kit/looks/<id>.js` (a second look exports only the keys it changes; the rest come from `quill.js`). The course picks it with manifest `"look"`: it reaches the scene as `--sim-look`, canvas and SVG read `lookOf()`, DOM CSS reads `--look-*` on the host. Scenes change nothing. Preview: `shoot --look <id>` or harness `?look=<id>`.

Keys that change a whole scene, not one number (all listed with defaults in `kit/looks/quill.js`):

| Key | Quill | Effect |
|---|---|---|
| `backdrop` | `'world'` | `'world'`: the course's setting. `'riso'`: risograph paper with halftone corners. `'flat'`: surface token, hairline floor, no corners. Maths stays graph paper |
| `grain` | `true` | paper fibre and mottle; applies to riso, lab and parchment |
| `settings` | `true` | false: `simSetting` is ignored, riso paper instead (lab stays when true). `'course'`: only a setting the course names from the look's list (plain: `casefile`), else flat |
| `furniture` | `'wood'` | `'flat'`: drawBench, drawShelf are plain slabs |
| `faces` | `true` | false: drawFace draws nothing; SimFigure and drawPersonGlyph heads are faceless; SimAnimal keeps a dot eye |
| `corner` | `null` | px cap on every drawn corner, scene-drawn too. Discs and upright capsules stay round |
| `flattenScenes` | `false` | true: a scene's own CSS and SVG obey the look at load (radii, overshoot curves, solid lips). A rule with `--motion: model`, or `@keyframes <name>-model`, keeps its curves. The file is not touched |
| `shake` | `1` | multiplier on screen shake |
| `overshoot`, `elastic`, `popS`, `findPop`, `popSparkles` | | decorative pops only. A model's own overshoot: `outBack(t, s)`, `outElastic(t, true)` |
| `uiSpringDamp` | `0` | damps `uiSpring()` flourishes only; a model's SimAnim springs, physics, camera, morph, stage, rig and draw-on are never touched |
| `reveal` | `'iris'` | `'fade'`: a canvas scene's first frame |

A look's colours are its token css, never the profile. Under `shoot --look <id>` the kit has no token css, so shapes follow the look and colours stay default.

Engine: registry `simProfile` may point anywhere (LookManager publishes it as `--look-profile-<id>`). No such property, as in a course repo: the kit reads `kit/looks/<id>.js`.
