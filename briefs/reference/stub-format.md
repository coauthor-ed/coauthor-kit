# Scene stub format (Stage 2 writes it, Stage 3 builds from it)

One stub per scene to build, at `courses/<Bundle>/simulations/L0N/<SceneName>.stub.md`, next to where the scene will go. A Stage 3 agent reads this stub, the slide prose and nothing else of the lesson, so the stub carries every decision the scene needs. Be concrete: "a steel ball on a ramp, 1 kg, released from 2 m" beats "an energy scene". `tools/staged-generation/lesson-check.mjs` checks the form.

```
# <SceneName> - simulation stub
Save path: simulations/L0N/<SceneName>.js
Attached by: blk-l0n-s0m (<role>)[, blk-... (<role>)]
Beats: <N> (the attaching slide's real count: tools/sim-test/scene-info.mjs)
Base class: SimScene | DomSimulation | GeoScene | CanvasSimulation | WebGLSimulation (<one-line reason>)
Hero: <the ONE big object in the middle: what it is, what it looks like>
Dials: <id: what the learner changes (options, or range + step + default) -> what visibly changes>; or none: <what the learner does instead (tap, drag, Run)>
Run shows: <what moves when the learner acts, and how the run ends> | none
Profile: rich | lite | course   (optional line; default course; docs/visual-profiles.md)
Note card: <what the scene leaves out or exaggerates, one line> | none   (rich: usually none; the caveat goes in prose)
Must get right: <one item per line: (slide|derived) the fact, number, colour or order the drawing must match. Check: how a test would see it>
Not yet taught: <words and ideas the scene must not show (later lessons)> | none
Reuse: <an existing scene or helper in this bundle to import, and what for> | none
Copy-from: <id from tools/find-scene.mjs, optional: a verified scene of another bundle Stage 3 copies and adapts>
Narration: <only when the OUTLINE says `Narration: narrated`: ids the voice will name (each cell, margin, group, legend part); moves the teacher demonstrates (cue ids); per wait: closed (what end the scene detects) or exploration> (docs/narration.md 13)
Self-check: counts ok, arithmetic ok, no contradictions   (see Stage 2 step 4a; unresolved: `Open question: ...`)

## Per beat
- beat 0: <what is drawn / what the learner can do / what happens>
- beat 1: ...
Recipes: <optional, one line> b0 <recipe>; b1 <recipe> ...

## Verbatim slide markdown
### <block id>
```markdown
<the slide's .md, exactly, with its <!-- STEP --> markers>
```

Shared helper: <File>.js | none
```

Rules:

- An arcade practice slide (outline role `practice`): a much shorter stub. Header lines `Save path`, `Attached by: blk-l0N-aNN (arcade)`, `Beats: 1` (the slide's one line of prose), `Base class: Arcade<Sort|Route|Match|Order|Judge>Scene`, `Skin: <skin>`, `Deck: <what it drills, and which deck file/export>`, `Taught by: L02, L03 s04`, `Rounds: 12`, `Reuse: <deck or scene it extends, or none>`; then `## Play` (which items, which mix-ups and myths the deck must hold and why, the answer key or the evidence line for each, anything the boss round should feature) and the verbatim slide markdown; last line `Shared helper: <Chapter>Deck.js` (the deck file) or `none`. Archetype and skin choices: `docs/arcade-games.md`; never art or colour that gives the answer away.
- A game (`mini-game@1`, role `game`; under plain or college an exercise, `docs/mini-games.md` "Exercise, not game", no game words in its strings): `Beats: none (mini-game@1 mounts once)`, and replace `## Per beat` with `## Play`: the objective in one line, what the learner changes, what `checkObjective()` returns (`{ value, target }` or `{ ok }`), when it is solved, and why the win condition IS the concept's rule (tie level L2, docs/mini-games.md). `Base class: DomSimulation` via `withChallenge` unless the play needs continuous motion.
- `<role>` is the slide's job for this scene: `hook`, `predict-setup` (mounts beside the question, no beats), `predict-reveal` (mounts after the answer), `explain`, `example`, `game`.
- `Beats` and the `Per beat` bullets use the REAL count (`scene-info.mjs` prints it).
- `Run shows`, `Per beat` and `Must get right` must not contradict each other (what moves, in what order, what is visible at which beat). Re-read the three together before saving; a stub that contradicts itself costs the Stage 3 agent 4-15% of its run.
- One scene file on several slides: the scene learns only the beat COUNT, never which slide mounted it. So decide, and write it down (lesson-check fails the stub otherwise):
  - Under `## Per beat`, one `### <block id>` list per slide, each with that slide's number of `- beat N:` bullets.
  - Counts differ: `Beats: 4 (blk-a), 3 (blk-b)` and `Beat maps: 4 -> blk-a, 3 -> blk-b` (Stage 3 declares `static BEAT_MAPS = { 4: ..., 3: ... }`).
  - Counts equal: only if the slides progress beat for beat the same way, add `Same beats on all slides: yes`. Otherwise - or when some counts repeat and others differ - make one scene file per slide (thin variants, e.g. `PushStopWorkScene-save.js`, sharing a helper named on the `Shared helper:` line). Variants are the safer default.
- `Hero:` is an object or apparatus; a person is added with the kit figure (`drawFigure`) when the pose is the point (push, pull, lift, climb), never hand-drawn. A portrait of a real person is an image.
- Optional `Component: Timeline | FlowBoard | AllocBoard | SlotBoard | NumberLine | Chart | Geom | Chance | Venn | none` and `Data:` (the events, nodes, items or rows it needs, with sources). A named component means the scene is mostly its config.
- `Recipes:` (optional, one line after the beats): per beat, the motion the beat is about, in kit names from `briefs/reference/kit-parts.md`, e.g. `Recipes: b0 lagged fly-in (flyMany); b1 countUp ring counts; b3 transformTerms "6 + 4" -> "10 - 8"`. Write it for a beat whose idea is "this becomes that", "these fly in", "look here" or "a count grows"; omit it otherwise. Stage 3 builds those beats with the named recipe; check-scene warns (never fails) if the scene does not use a name listed.
- A beat where the learner must act (the slide says "try", "run", "turn") says what to do and that nothing happens until they do.
- The scene delivers its outline slide's `Shows:` line (`docs/pedagogy.md` "Earn every scene"). Under plain or college a stub whose only move is tap-to-open and whose `Run shows` is none is decoration: lesson-check WARNs.
- `Dials:` names how each control looks and its picked state (a column head is a button with a pressed state; a word is a chip), not just the gesture (`docs/numericals.md` 4).
- `Dials: none` is fine only with an answer to "what does the learner do here?" A scene where nothing can be touched and nothing runs is a slideshow: make it an image or `reveal.images` instead (docs/simulation-authoring.md, "The CONTROLS: [] smell"). In a DOM or SVG scene the dials are built into the scene, not the host strip (docs/dom-scene-kit.md "Controls live in the scene").
- A variant stub (a thin subclass such as `-return`, `-case2`, `-payload`) gets `Subclass contract: <hooks the helper exposes (e.g. _spreadTarget(stage), noteRows, BEAT_STEP_MAP) and what is forbidden (onBeatChange, re-assigning this._s)>`. The helper's own stub states its method list and any shared meaning (e.g. what a lit lamp means) once, so no scene reconciles it again.
- The same concept on several slides: independent scenes (each mount is fresh and memory-less), optionally sharing a helper module. Several stubs that share a helper name it on the same last line; Stage 3 builds the first one together with the helper.
- `## Verbatim slide markdown`: one `### <block id>` fenced copy per slide in THIS lesson that mounts the scene, byte-equal to the prose file. `lesson-check --fix-verbatim` writes and refreshes them; never hand-copy or script them.
- Geography stubs add, after `Reuse:`, the lines that apply: `Camera: <shot per beat; orbit yes/no>` (GeoScene), `Projection: <kind, extent, layers>` (maps), `Data: <SimGeo layers used>`, `Time axis: <what t spans, units, linear or log>`, `Static fallback: <image for devices with no WebGL> | none` (GeoScene).
- The last line is exactly `Shared helper: <File>.js` or `Shared helper: none` (next.mjs parses it).
- Labels only: a scene tags and names, it never explains. Nothing in the stub may ask it to show a sentence of prose.

## Choosing the base class

Decide from the content's shape, and write one reason on the `Base class:` line. Stage 3 picks its guide from this line.

Nothing operated and nothing moves (a plot, an area under a curve, a fixed labelled figure, even revealed per beat): no scene and no stub; put `graph` or `diagram` on the slide or question (docs/graphing-and-plotting.md).

| The scene is | Base class | Component |
|---|---|---|
| a labelled figure with one live value: angles, constructions, a dragged point, an area model | `SvgScene` | `Geom` |
| a number line, fractions, hops, spans | `SvgScene` | `NumberLine` |
| bars, a graph, a histogram, a pie, seats, a tally | `SvgScene` | `Chart` |
| dice, coins, cards, spinners, outcome grids, trees, long-run trials | `SvgScene` | `Chance` |
| Venn rings, regions, sort items into regions, shade a set expression | `SvgScene` | `Venn` |
| dates, eras, "place the event" | `DomSimulation` | `Timeline` |
| a cause chain, a cycle, a tree, "put in order", "what comes next" | `DomSimulation` | `FlowBoard` |
| a coalition to a majority, a budget split, fill to capacity | `DomSimulation` | `AllocBoard` |
| compare matrix, claim vs evidence | `DomSimulation` | `SlotBoard` |
| drag items onto targets (pairing, matching) | `DomSimulation` | none (`simPick`, not a board) |
| labelled panels, tables, cards, sorting | `DomSimulation` | none |
| apparatus that moves (a cart on a ramp, a pendulum), a drawn process, anything with a hero and physical motion | `SimScene` | none |
| a pan balance (weighing, an equation) | `SimScene` | none |
| the earth in 3D (cutaway, valleys) | `GeoScene` | none |
| a map or a cross-section | `SimScene` | none (a `Projection:` line) |
| a practice game of fast rounds | `Arcade*Scene` (Sort, Route, Match, Order or Judge) | none |
| a challenge game (`mini-game@1`) | `DomSimulation` with `withChallenge` | none |

If two rows fit, take the one whose Component names the learner's actual action. A person or an animal in the scene is added by Stage 3 with the kit figure; say so under `Hero:`, not in the base class.
