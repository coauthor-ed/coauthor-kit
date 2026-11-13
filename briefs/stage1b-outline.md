# Stage 1b - Outline: write OUTLINE.md

Target: the whole chapter. Input: `courses/<Bundle>/FIGURES.md` (Stage 1a's words for every figure), the chapter text (`Source:`, or its text conversion `courses/<Bundle>/source/<stem>.txt`). Output: `courses/<Bundle>/OUTLINE.md`, backfilled `Used by:` lines in FIGURES.md, a section of GENERATION-LOG.md.

You never open the source's page images. Figures reach you only through FIGURES.md; that is the point of the split.

## Read

1. `docs/pedagogy.md` in full - the laws this outline is judged against.
2. `node tools/doc-section.mjs docs/generation-playbook.md "2. Draft"`.
3. `briefs/reference/engine-capabilities.md` in full - what blocks, scenes and games can do. Before you claim the engine cannot do something, grep the doc it points to; if still unsure, write "unverified" in the outline and do not invent a workaround rule for later stages.
4. `docs/mini-games.md` in full (one per lesson, tie level L2). A look card that makes games optional (`plain`): read it only if you plan one (the bundle omits it under `plain`: open the file from disk then).
5. `node tools/doc-section.mjs docs/numericals.md "3. Emphasis"` (the Text only devices).
6. `courses/<Bundle>/FIGURES.md` and `GENERATION-LOG.md`, then the chapter text.

## Write-scope

`OUTLINE.md`, the `- Used by:` lines of FIGURES.md (via the tool), `GENERATION-LOG.md`, `build/`. No lessons/, blocks/, questions/, modules/, simulations/, no stubs, no code.

If the operator names which lessons they want, outline only those and keep the chapter's lesson numbering (e.g. L02 alone; the Lesson list then holds only those lines). Say in the log which were left out.

## Treat Stage 1a as fallible

A `Flag (unverified - needs human check)` in FIGURES.md is not a fact. Design the slide so it is right under either reading (use the value the chapter text states) and list the flag in the log under `## Unverified Stage 1a flags carried forward`. `[derived]` lines are Stage 1a's own arithmetic: re-check before relying on them. A slide that needs a detail FIGURES.md lacks: do not guess, design around what it does say, and log it under `## Stage 1b gaps in FIGURES.md` (label, what is missing, which slide). A figure that simply has no numbers is not a gap.

## OUTLINE.md format (tools parse it - do not vary it)

```
# OUTLINE - <bundle> (<chapter>)
Profile: lite | rich - <one-line reason>
Look: <look id>
Narration: narrated | none
<conventions and the chapter arc, briefly>

## L01 - <lesson title>
Arc: <one or two lines: the opening question, the dead end, the closing question>
- **s01** - hook - `content-block@1` - **sim** `SceneName` (SimScene) - *see FIGURES.md: Fig. 7.2* - Shows: <what becomes visible that text cannot>; Without it: <what the learner would lose> - what the slide does
- **s02** - predict - `poe-predict@1`, deferVerdict - **neither** (reason) - the question and its options
- **s04** - explain - `content-block@1` - **neither** (Text only: takeaway; the idea is one sentence) - ...
- **s03** - explain - `content-block@1` - **image** *see FIGURES.md: Fig. 7.5* - ...

## Lesson list
- L01 - <lesson title> (<N> slides)
```

- Look: `bundle.json` `look`, else `profile.json` `look`, else `quill`. Follow that look's card (`packs/look/<id>/CARD.md`) for every sim / image / neither call; Stage 4 copies the id into the module.
- Narration: `narrated` only when COURSE-BRIEF or the invocation says the course will be narrated; else `none` (or leave the line out). Narrated: read `node tools/doc-section.mjs docs/narration.md "13. Narration-ready"` and `"8b. Never open"`: a course with a frame (a case, an investigation, a cast role) gets a prologue lesson `L00` (2-3 slides: who the learner is, who speaks, the case, what is real and what invented; no predict, no exercise: log that for outline-lint's two WARNs); each lesson opener and predict line notes its opening picture (`cover: <image subject>` or `scene from b1`).
- Profile (`docs/visual-profiles.md`): `rich` when the pictures are the lesson (experiments, organisms, machines, places, historic moments), else `lite`. Set the same value as `"visualProfile"` in `bundle.json`. A lite course may mark single showpiece scenes rich in their stubs.
- Role is `hook`, `predict`, `explain` or `example` (an ungraded reflection is `explain`); name the block type in backticks.
- Scene necessity (`docs/pedagogy.md` "Earn every scene"): every **sim** slide (not arcade) carries `Shows: ...; Without it: ...` on its line. Shows = what becomes visible that prose, a table or a worked calculation cannot (a relationship that moves, a distribution that builds, a structure compared, a mechanism over time); Without it = what the learner would lose. Name the learner's action and what changes. Both weak, or no action and nothing changing: the slide is `**neither** (Text only: pull quote | takeaway | table | worked steps; <reason>)`. outline-lint: missing lines are an ERROR under plain or college (WARN otherwise); a scene line with no action and no changing quantity WARNs (decoration). A number to compute is planned as worked steps (`docs/numericals.md` 2), in a panel scene when the learner enters or moves something.
- Every slide makes a call: `**sim** \`Scene\` (<base class>)`, `**image**` or `**neither** (<one-line reason>)`. A simulation on essentially every slide (AGENTS.md rule 11; the look and audience cards may relax this). A scene used on two slides is named on both and marked "(reuse, independent mounts)".
- SST: dates, eras, how long ago -> Timeline; cause, process, hierarchy -> FlowBoard (order or predict) or **photoDiagram** if nothing is operated; compare, sources -> SlotBoard recipes or `diagram-explore@1` on a real photo; seats, votes, budgets -> AllocBoard / SimChart only when the learner moves the numbers, else `figure` or a renderer; artefacts and real people -> a real licensed **image**. Maths: SimNumberLine, SimGeom (incl. area models), SimChance, SimChart (SVG or canvas renderers; see briefs/reference/kit-parts.md); a plotted curve or a geometry figure revealed per beat -> `graph`/`diagram` on the slide (no scene). Sorting into bins is arcade practice, not a lesson game.
- One drawn hero per scene: a real wall, a sack, a balance, a floor with tiles. Forms, racks and labelled panels are NOT the scene; use them only as a side panel beside the hero (the stub says `Layout: hero + side panel`).
- Geography: process in cross-section -> `SimScene` (strata block); map with data layers -> `SimScene` (GeoMap); a landscape where height, rotation or depth is the point -> `GeoScene` (3D; at most one per lesson, never two on one slide); what a landform or event looks like -> **image** (a real, sourced photo; `reveal.images`); table or climograph -> `DomSimulation` or `plot-function@1`. Each geography scene names the real Indian place it shows. No scene for a slide that only defines a landform.
- Any subject: a static flow, panels, a timeline, small multiples or a side-by-side comparison with nothing to operate -> the `figure` field (docs/figures.md), never `diagram` (geometry only). Call it **neither** and name it: `**neither** (\`figure\` field, layout \`steps\`, no scene: <what each item is>)`.
- A chart or figure the learner only reads (nothing to operate) is never a **sim**. No layout draws it: a renderer, library first (`add-renderer.mjs --list`; e.g. outbreak onsets over time -> `epi-curve@1`): `**neither** (\`figure.renderer: epi-curve@1\`: <what it shows>)`. None fits: `**neither** (\`figure.renderer: <new-name>@1\`, new renderer: <what it shows>)`. Read vs operate: docs/renderers.md, When.
- A person may be in a `**sim**` when the pose is the point (push, pull, lift, carry, throw, climb): scenes draw them with the kit figure. Portraits of real people are `**image**`.
- A figure reference is always `*see FIGURES.md: <label>*` with the label exactly as in the FIGURES.md heading (add `(p.N)` only when two entries share a label). A reference means the slide uses that figure; do not mention a figure you are not using.
- One mini-game per lesson (`mini-game@1`) in the challenge slot, or a line in the log saying why not (the look card may make it optional). Under plain or college it is an exercise (plain CARD 12, 16): titles and descriptions never say game, play, level, score or challenge.
- Arcade practice (optional, any number; none when the look card rules it out): where a chapter carries a lot to memorise or a common mix-up, add a slide that drills it (`briefs/reference/engine-capabilities.md`, `docs/arcade-games.md`). Number arcade slides `a01`, `a02`, ... per lesson (they sit anywhere and never shift the `s` numbers; blocks are `blk-l0N-a01`; they count in the lesson's `(N slides)`). Line: `- **a01** - practice - \`content-block@1\` - **sim** \`EnergyFormsSortScene\` (ArcadeSort/sky) - deck: <what it drills>, taught by L02, L03 s04 - <why here>`. Pick the archetype by what the learner must DO (sort into groups, run a key, match pairs, put in order, judge true or false), rotate archetype and skin across the chapter (outline-lint warns), place it only after everything in its deck is taught (`taught by`), and make the deck grow: a later game may reuse an earlier deck with more items. Students liked these as a break from reading and for memorising terms and clearing misconceptions; do not add one where nothing needs drilling. Before adding one pass the 6-point check in `docs/arcade-games.md` ("Does it fit?"): recall load, taught earlier, same picture, mechanic = idea (Route only for a real chain of yes/no questions, never for placing items in regions of a diagram), items that do not state their answer, not a 12-item quiz. A skill taught in this lesson is practised by its mini-game or a practice slide, not an arcade game. Zero arcade slides is a normal outcome.

## Pedagogy (docs/pedagogy.md is the judge)

Open on a question or puzzle, not a summary. Use real dead ends. Only new vocabulary gets the "this is called X" treatment. Ground every idea in something specific. The chapter is one arc: each lesson closes on the question the next opens with. Vary lesson shapes - do not open every lesson, or close every one, with the same beat pattern. No slide may depend on a later lesson (AGENTS.md rule 7): check the arc end to end once.

## Procedure

1. Read (above). Write the arc first (3-6 lines), then the lessons one at a time.
2. `node tools/staged-generation/outline-lint.mjs <Bundle>` until PASS with no WARN you cannot explain. Its per-lesson table (slides, predicts, games, sim/image/neither, opening role) is the only source for any count you state.
3. `node tools/staged-generation/outline-lint.mjs <Bundle> --backfill` fills every FIGURES.md `Used by:` line from your references (unused figures stay TBD).
4. Log under `## Stage 1b - Outline`: `Model:` line, then only what a reviewer needs that OUTLINE.md does not already say (deviations, open calls, flags carried forward, gaps). Do not repeat the design.

## Done means

- [ ] outline-lint PASSES; backfill ran; `node tools/staged-generation/figures-lint.mjs <Bundle>` PASSES.
- [ ] Every **sim** slide has `Shows:` and `Without it:`; weak ones are Text only with their device.
- [ ] Header has its `Look:` line. Every lesson has its arc line, one predict, one mini-game (or a logged reason; the look card's quota where it sets one), and a closing question the next lesson opens with.
- [ ] Log section written with `Model:`.

Report (START-HERE.md section 3) plus: lessons and slides (from outline-lint), Used by lines filled, gaps and unverified flags logged (or "none"), and anything a Stage 2 agent reading only one lesson's slice would find too terse.
