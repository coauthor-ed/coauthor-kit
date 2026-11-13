# Look base

Rules for every look. A look pack adds its style on top and never relaxes these.

## Look packs

A look pack is a folder `packs/look/<id>/`: `CARD.md` (the rules a scene must meet), `SPEC.md` (reference), `SHOWCASE.md` (approved shots). A course picks its look in its manifest, `"look": "<id>"`; absent means the `look` in `profile.json` (default `quill`; `plain` also exists), see `packs/look/README.md`. Engine side (built): `registry/looks.json` lists the looks, `site.json` sets the site default, the course manifest overrides it. Stage 3 bundles carry this file and the look card named by `profile.json` (default Quill).

## Rules

1. Text is 14 px or larger, in both themes.
2. Labels and readings have enough contrast in dark AND light. Check every beat in both themes; light hides contrast bugs.
3. Reduced motion shows every end state: no burst, no pop, nothing the learner must wait for.
4. Drawing is deterministic: the same beat and state give the same picture (seeded randomness only).
5. One idea per screen. Several panels at once: tabs or steps (SimFlowDom) in DOM, beats in canvas.
6. The picture shows what the beat says: the thing the paragraph names is visible, highlighted and labelled.
7. Every motion and count is physically possible (one lamp gives one flame).
8. The result reads at a glance: after a run, a big reading, a tick or a verdict chip. Verdict colour never alone.
9. Predict before reveal: the scene holds the answer back until the learner commits.
10. The learner acts on the hero itself where possible (drag the tile, tilt the flask), not on a remote slider.
11. DOM/SVG scenes keep their controls inside the scene; canvas/WebGL keep them outside.
