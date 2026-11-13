# What the engine can do (for outline design)

A card for Stage 1b, and for anyone choosing block types, media and games. Each line names the doc that holds the detail; grep that doc before you claim the engine cannot do something.

## Slides (lesson blocks)

| Type | Does | Detail |
|---|---|---|
| `content-block@1` | prose in beats (`<!-- STEP -->` or paragraphs) plus ONE of: `simulation`, `image`, `photoDiagram`, `figure`, `graph`, `diagram`; `poeRole: "observe"/"explain"` makes it catch a deferred verdict | SKILL.md "Valid content types" |
| `poe-predict@1` | a question with options; `deferVerdict: true` hands the verdict to the VERY NEXT block, which must be a `content-block@1` with `poeRole`, `poe-observe-sim@1` or `poe-explain@1`. Takes a `simulation` too: by default it mounts after the learner answers; `"role": "setup"` mounts it at once beside the prompt, with no beats | SKILL.md deferVerdict; simulation-authoring.md section 4 |
| `poe-observe-sim@1` | a slide that IS a scene (top-level `src`), catches a deferred verdict | SKILL.md |
| `poe-explain@1` | explanation card with beat disclosure, catches a deferred verdict | SKILL.md |
| `mini-game@1` | the lesson's challenge-slot game: top-level `src` = a challenge scene (`withChallenge`), optional `objective`/`xp`; mounts once, no beats, no prose (setup text goes on the slide before); win condition = the concept's rule (tie level L2); no timers | docs/mini-games.md |
| `diagram-explore@1` | hotspot diagram manifest | SKILL.md |
| arcade game (optional, any number) | a `content-block@1` with one line of prose and an `Arcade*Scene` (sort / route / match / order / judge, two skins each) fed by a data deck: fast practice of what was already taught, a gentle clock, never graded. Not the concept game above | docs/arcade-games.md |

- One medium per block (`image`, `simulation`, `photoDiagram`, `figure`, `graph` or `diagram`), never two.
- A static figure with nothing to operate (flow of steps, panels, timeline, small multiples, comparison): the `figure` field; the engine lays it out, reveals it per beat (`step`), adds notes: docs/figures.md. `diagram` is geometry only. A kind no layout draws, nothing to operate: course-local renderer (`figure.renderer`), docs/renderers.md (When: read -> renderer, operated -> scene); check the ready-made library first (`add-renderer.mjs --list`, `add-renderer.mjs <Bundle> <name@major>`).
- A graph or geometry figure built up beat by beat: `graph`/`diagram` on the slide with `revealAt` per item (no scene): docs/graphing-and-plotting.md, docs/geometry-diagrams.md.
- A block can swap images per beat and hand over to a scene mid-slide (`reveal.images`, `simulationStep`): simulation-authoring.md "Static images per beat".
- Several real photos with labelled links between them (food web, comparison): `photoDiagram`, not a scene: docs/photo-diagrams.md.
- Graphs and coordinate work: `plot-function@1` or the `graph` field (piecewise lines, shaded area under a curve): docs/graphing-and-plotting.md. A labelled geometry figure on a question: the `diagram` field: docs/geometry-diagrams.md.
- `mediaStep` / `simulationStep` delay a medium to a given beat.
- Arcade practice suits a chapter heavy on terms, groups, keys, sequences or myths; place one only after everything in its deck is taught, rotate archetype and skin, keep them optional. Check fit first (`docs/arcade-games.md`, "Does it fit?"): Route is for real decision chains, not diagram regions; no arcade for a skill taught in the same lesson.

## Scenes (simulations)

- A scene follows the slide's beats: `onBeatChange(beat, count)`; the slide's beat count comes from its prose. It may have controls (buttons, selects, sliders) and pointer interaction.
- Every mount is fresh and memory-less: a scene on two slides is two independent mounts; beat j must render correctly when the lesson resumes straight onto it.
- A scene labels, it never explains: short tags and chips; the why is in the prose.
- Base class by content shape: moving apparatus, physics, particles, drawn objects -> canvas (`SimScene` look kit); one drawn hero per scene (a real wall, a sack, a balance, a floor with tiles) -> `SimScene`; labelled panels and forms only as a side readout next to the hero, never the scene itself; `DomSimulation` for tables, sorting, ledgers; timelines, cause chains, allocation games -> kit boards (`TimelineScene`, `FlowScene`, `AllocBoardScene`); number lines, charts, geometry, chance -> `SvgScene` + the SVG data kit; real maps -> `SimScene` + `GeoMap` on `SimGeo` layers (plates, quakes, volcanoes, rivers, elevation, India); geology cross-sections -> `SimScene` + `drawStrataBlock`; height, rotation or depth is the point -> `GeoScene` (earth, 3D, at most one per lesson) or `WebGLSimulation` (molecules, solids). simulation-authoring.md section 3.
- India's border only from the Survey of India layer, with its credit; never world-atlas `countries` (law: simulation-authoring.md 3.1).
- Photos of real places or events are real and licence-recorded (docs/copyright-and-sourcing.md); never a generated "photo" of a real event.
- A beat-driven reveal with nothing to operate is not a scene (the "CONTROLS: [] smell"): simulation-authoring.md.
- Not available in this kit: `ParticleSimulation`, `PhysicsSimulation`, `CellViewSimulation`, `OrganelleZoomSimulation`.

## Questions

`mcq-single@2`, `numeric-value@1`, `fill-blank@1/@2`, `match-categorize@1`, `sequence-order@1`, `drag-match@1`, `statement-judgment@1`, `assertion-reason@1`, `equation-input@1`, `diagram-hotspot@1`, `diagram-label@1`, `plot-function@1`, `semantic-descriptive@1/@2`, `comprehension-set@1`, `error-correction@1`, `fuzzy-descriptive@1`. Most take `image`, `simulation`, `graph` or `diagram` (one of them). A question's worked explanation can be a real slide (`explanationSlide`). SKILL.md "Valid content types".

## Words and media rules that shape an outline

- Prose goes in sibling `.md` files; never a markdown image link inside prose (AGENTS.md rule 2).
- No slide depends on a later lesson (rule 7). Never copy textbook text; the source's numbers are for question design (rule 4).
- A simulation on essentially every slide; an image only for what is genuinely a picture; justify every "neither" in the log (rule 11).
