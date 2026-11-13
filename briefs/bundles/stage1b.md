=== FILE: START-HERE.md ===
# START HERE - one staged-generation run

You were given one line like:

    Read START-HERE.md and follow it. Stage: 3. Bundle: work-energy. Target: simulations/L02/RampScene.stub.md.

A target named `...-return.stub.md` (or `-case2`, `-payload`) is a normal scene, a second mount of a helper: not the shorter name. It may also carry `Part:` (multi-part bundles, below), `Source:` (the chapter file), `Helper:` (Stage 3), `Targets:` (Stage 3: several scenes of one lesson in one run, see the brief), `Only:` (a Stage 2 top-up: just the named slides of an existing lesson), `Look:` (Stage 3: `later` = no `shoot` at all (peeks included), close with `Status: look-pending`; the default is `Look: later` when the model cannot view images or is not Claude: it never self-certifies a look) and `Pass:` (Stage 3 only: `build`, `sanity` or `verify`, see the table), `Resume:` (your target's files exist from an earlier run that died: continue it), `Skip:` (a brief item you leave out), `Notes:` (operator directions: rule 11) and `Review: manual` (Stage 3: no tests run, no shoot, no look; your brief says how to close). The bundle is `courses/<Bundle>/`. Do exactly one stage for that target (or each of the listed `Targets:`), report, and stop.

## 0. Multi-part bundles

A big course (several books or volumes) is one bundle split into parts: `courses/<Bundle>/parts/<NN>/` holds that part's own `OUTLINE.md` and `FIGURES.md`. Its lessons are coded `L<NN>-<module>-<lesson>` (e.g. `L03-07-01`; files `les-03-07-01.json`, `blocks/L03-07-01/`, `simulations/L03-07-01/`) and its modules are `modules/mod-<NN>-*.json`. Blocks, questions, lessons, simulations (including `simulations/shared/`) and GENERATION-LOG.md stay bundle-wide, so scenes and helpers are shared across parts. Rule: wherever a brief says `courses/<Bundle>/OUTLINE.md` or `FIGURES.md`, read and write `courses/<Bundle>/parts/<NN>/OUTLINE.md` / `FIGURES.md` instead, where `<NN>` is the `Part:` field or the first segment of the lesson code. `lesson-check` finds the right outline from the lesson code by itself; `outline-lint` and `figures-lint` take `--part <NN>`. A bundle with no `parts/` folder is a plain one-chapter bundle and none of this applies.

## 1. Open your brief

| Stage | Brief | Job |
|---|---|---|
| 1a | `briefs/stage1a-source-scan.md` | read the chapter source, write FIGURES.md |
| 1b | `briefs/stage1b-outline.md` | design the lessons, write OUTLINE.md |
| 2 | `briefs/stage2-lesson.md` | one lesson: blocks, questions, lesson file, scene stubs |
| 3 | `Pass: build` -> `briefs/stage3-build.md`; `Pass: sanity` -> `briefs/stage3-sanity.md`; `Pass: verify` -> `briefs/stage3-verify.md`; no `Pass:` -> `briefs/stage3-simulation.md` | one scene in up to 3 short passes (build; sanity only if build's quick check failed; verify), or in one run |
| 3-look | `briefs/stage3-look.md` | review one built scene in screenshots (needs image viewing); a pass that fixes nothing closes `done`, at most 3 |
| 3-slides | `briefs/stage3-slides.md` | once per lesson, after all its scenes are `done`: judge every WHOLE slide in the real app (desktop + phone, light + dark) |
| N | `briefs/stageN-narration.md` | narrated courses only, after 3-slides: one lesson's teacher script, scene cues and focus tags, opening pictures (`Audio: build` to voice it) |
| 4 | `briefs/stage4-module.md` | module file, validate the whole chapter, record each lesson's 3-slides result |
| R | `briefs/stageR-critique.md` | critique one lesson: files review notes only (`Check: facts / pedagogy / answers`) |
| 5 | `briefs/stage5-showcase.md` | after approval: Discover card text and screenshot targets (`showcase.json`, `intro.md`) |
| B1 / B2 / B3 | `briefs/bank1-plan.md`, `bank2-questions.md`, `bank3-assemble.md` | question bank track |

**Bundled invocation:** if your invocation names a file under `briefs/bundles/`, that one file already holds this START-HERE, your brief (the section `=== FILE: briefs/<brief>.md ===`) and every kit doc the brief tells you to read: use it, and skip each "read X" for a file listed in its `=== BUNDLE INFO ===` footer (read course files, run tools, view images as the brief says).

Read your brief in full now. It names everything else you read, and when. Read nothing else unless a step sends you there. Stages 1-2 only: if `courses/<Bundle>/COURSE-BRIEF.md` exists, read it too (course-specific story, cast and style that add to the brief). Stage 3 takes these from the stub.

## 2. Rules for every stage

1. Never run any `git` command (not even `git status`, `git log` or `git diff`): the operator commits, and whether a file is committed is not your concern. Do not wonder whether files already on disk are "suspicious" or "stale": see rule 9.
2. Write only inside your brief's write-scope. Anything else you think needs changing goes in the report.
3. The context window is the budget. Spend it on the target, not on reading:
   - Read a doc by section: `node tools/doc-section.mjs <doc> "<heading>"` (`--list` shows headings and sizes). Read a whole doc only when your brief says "in full".
   - Never read a tool's source to learn how it behaves. Tools print their defaults and what they ignored; `<tool> --help` prints its full usage (every step, flag and default) and section 4 below lists the tools. Stage 3 and 3-look: never run `--help`; the brief and `probe-cookbook.md` list the steps. A mistyped flag or step is refused with the fix, never ignored.
   - Run every command from the repo root; never `cd`. `build/` is the repo-root `build/` (scratch in `build/scratch/`), never under `courses/`. Keep what is worth keeping under the bundle: extracted text and crops in `courses/<Bundle>/source/`, one-off helper scripts in `courses/<Bundle>/_work/`; `build/` is disposable.
   - Do not re-read a file you just wrote. Change files with small edits; rewrite a whole file only when most of it changes.
   - Open an image only at the step that says so, and start with the contact sheet.
   - Put decisions in the files your brief names (log, design note), not in long private reasoning: a file can be re-read and reviewed, reasoning cannot.
   - Bound every command's output: pipe anything that may be long through `| head -40` (or use `--no-text`). One 25K-character result is re-sent on every later turn.
   - Make all the edits you know of in ONE turn (independent tool calls side by side), not one edit per turn: every turn re-sends the whole conversation.
4. Every stage ends with its own check passing (your brief names it). FAIL must be fixed. A WARN about what a learner sees or what breaks is fixed or explained in one line in the log or design note; `note:` lines are advisory and need nothing.
5. `GENERATION-LOG.md` is a write-only trail for a human reviewer, written only through `node tools/log.mjs add --bundle <Bundle> --stage <S> --lesson <L> --model "<name>" "<text>"` (never edit or read the file); it is never your state or your source of precedents. Stages 1a, 1b, 2, 4 and the bank stages add their own section at the end, opening with `Model: <name>` (what you are), terse: decisions, flags, deviations. Stage 3 never touches it directly: `log-stage3.mjs` writes it (or prints LOG TEXT for the operator). Nobody reads it to learn what earlier lessons or scenes did, or whether a target is done: the files, the design note's `Status:` and `## Progress` say that. Stage 1b is the one exception: it reads the Stage 1a section for the figures flagged unclear.
6. Numbers you state (counts of slides, figures, scenes) come from a command's output, never from memory.
7. Say what you could not do or verify. Do not stop before the report is written. Do not start the next stage.
8. **Your target's files already exist** (`Resume:` in the invocation, or you find a design note or scene file of your target): they are your own earlier work, from a run that died. Do not guess whether they are right, committed or "suspicious". Read the design note and its `## Progress` lines, run the stage's check, and redo only what is not marked done. A stale note (no `## Progress`, or no Layout, Beats, Numbers or Tests to run) with code present: run `ident-lint` and the check, add Progress for what exists, APPEND the missing sections; do not rewrite, do not explore kit source.
9. **Hedging costs the budget.** If you change your mind three times on one question, take the simpler option, write it in the design note under `## Decisions` (or `## Requests` if the stub or slide is at fault) and move on. A stub that contradicts itself or its slide: take the reading closest to the slide's point, one line under `## Requests`.

10. **No web.** Never call a web search or page-fetch tool unless the invocation has `Web: on` (or the operator allows it in an interactive run: `briefs/reference/interactive.md` rule 9); an unverifiable fact is flagged in the log, not searched. Never run anything in `tools/operator/` (one exception: Stages 3-slides and 4 run `tools/operator/slide-shots.mjs`).
11. **Directions.** `Notes: n4,n7`: before designing, print them: `node tools/directions.mjs --bundle <Bundle> n4,n7`. A direction beats the stub, outline or design note; note each conflict in one line (`## Requests`, or the log). Honored: add `--notes n4,n7` to your closing `log.mjs add`, `log-stage3.mjs` or `scene-pass.mjs end` call.

## 3. Report (your last message)

- Model, stage, bundle, target.
- Files written or changed.
- Check results: paste the final PASS/FAIL line of each check.
- Decisions a reviewer should look at, and flags for a human.
- What you could not do or verify.

## 4. Tools (run from the repo root; run one with no arguments for its usage)

These serve every stage. Each brief lists the tools only its stage uses (Stage 3 and 3-look: the scene tools and the kit guides under `briefs/stage3/`).

| Tool | What it answers |
|---|---|
| `node tools/doc-section.mjs <doc> "<heading>"` | one section of a doc |
| `tools/rasterize-pdf.sh <pdf> [dpi]`, `tools/crop-page.sh <pdf> <page> <x%> <y%> <w%> <h%>` | page images; a region enlarged |
| `node tools/staged-generation/figures-lint.mjs <bundle> [--part NN] [--stage 1a]` | FIGURES.md format and counts |
| `node tools/staged-generation/add-renderer.mjs <bundle> <name@major>` / `--list` | add a ready-made renderer from the kit library (renderers/) and bind it |
| `node tools/staged-generation/renderer-lint.mjs <bundle>` | course-local renderers: bindings, folder, rules, validate() |
| `node tools/staged-generation/outline-lint.mjs <bundle> [--part NN] [--backfill]` | OUTLINE.md format, per-lesson counts; fills FIGURES.md Used by |
| `node tools/staged-generation/lesson-check.mjs <bundle> <L0N> [--fix-verbatim]` | one lesson: validate, stubs, scene paths, verbatim copies |
| `node tools/staged-generation/question-mix.mjs <bundle>` | question types and where the correct mcq options sit |
| `node tools/sim-test/scene-info.mjs <L0N/Scene> --bundle <b>` | what to build: attaching slides, REAL beat counts, beat texts |
| `node tools/narration-lint.mjs --bundle <b> <L0N> [--all]` | a narration script before audio: every beat scripted, no talking past the screen, cue ids exist, waits well formed |
| `node validators/validate.mjs <file...>` | JSON structure |
| `node tools/find-source.mjs "<term>" [--bundle B]` | does the source say it? (offline fact check; bounded output) |
| `node tools/find-scene.mjs "<what it shows>"` | a verified scene of another bundle to reuse (Stage 2/3 only) |

=== FILE: briefs/stage1b-outline.md ===
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

=== FILE: docs/pedagogy.md ===
# Pedagogy

`docs/voice-and-tone.md` governs the sentence; this governs how a lesson is *built*. Both apply to every lesson.

## Open with inquiry, not summary

Never "In this lesson we will learn about X." Open with a question, a puzzle, or something that looks obvious and turns out wrong - the same instinct `poe-predict@1` exists for, applies to a plain hook slide too.

## Use real dead ends

Show a plausible-but-wrong approach failing on a specific case (a concrete number, shape, scenario, counterexample) - not just "this doesn't work."

## Only define what's actually new

Give the "this is called X" treatment once, only to genuinely new vocabulary - not as a reminder on every later slide.

## Make hard words easy to start on

Latin and Greek names are the main reason a chapter feels hard. Treat them as a design problem, not a memory test - `docs/glossary.md`.

- Most names are short descriptions in an old language. Show the pieces first ("platy = flat, helminth = worm"), let the learner guess the body, then reveal the name.
- Plain name first, scientific name second, then fade the plain name.
- At most 3 new names in a beat; a beat that needs more is two beats.
- Every hard word is one tap from a card (glossary.json).
- Come back to names in later lessons with a recall round, not a re-read.
- Say out loud once that the names are hard and nobody is born knowing them.

## Vary your phrasing

Don't reuse the same sentence template slide after slide ("Now let's check..." / "Now let's verify..." back to back reads like mail-merge).

## Ground every idea in something specific

A number, example, or real situation - never an abstract claim standing alone (same instinct as voice-and-tone's concrete-before-abstract rule, applied at the lesson level).

## A throughline, only if it earns its place

Use one running thread/object across a chapter only if it genuinely fits. A forced throughline is worse than none - it's fine to decide a chapter doesn't have one.

## Speculate first, in any lesson that explains a mechanism

Default opening for a mechanism lesson: pose the problem, make the reader commit to an answer, then teach. A `poe-predict@1` with `deferVerdict: true` is the mechanism - the wager is recorded and the verdict is withheld until the lesson has earned it.

A prediction is only worth asking if a reader could plausibly pick the wrong option. "Which of these is the cell membrane" is a quiz. "Wrap the molecules in a boundary - what is the catch?" is a prediction, and the whole lesson is the answer.

Put it before the first content block. One per lesson; more and the commitment stops meaning anything.

## A chapter is one arc, not N independent lessons

Each lesson should close on the problem the next one opens with. If lesson 3 could be read before lesson 2 without loss, the chapter is a list rather than an arc.

The reliable shape: a solution creates the next problem. A boundary holds the molecules together and cuts them off from supplies; selectivity fixes that and leaves the cell soft; a wall fixes that and lets pressure build. Every step is motivated by the previous step's cost, so nothing has to be memorised in isolation.

This is what makes the last lesson able to ask "what did all of these have in common" and get a real answer.

## Questions test understanding, not vocabulary recall

Every wrong `mcq-single@2` option should reflect a specific real misconception, not just be false - "C is what you get if you use the slant side instead of the perpendicular height," not "C is wrong."

## Cover the whole chapter; decide the shape yourself

No fixed lesson count or slides-per-topic ratio - pace from what the material needs (see `docs/generation-playbook.md` step 2).

## Reflection boxes ("Let's Explore" etc.)

Ungraded - a `content-block@1`, never a `semantic-descriptive@1` (no rubric for an open opinion). Don't just restate the textbook's question: add 2-3 short considerations spanning different viewpoints so the student has something to reason with, not a blank prompt. That's real value over the textbook, not filler.

## Explain beliefs, don't just report them

Naming a belief without saying why people would have believed it is trivia, not history. Ground it in the believers' actual situation - an environmental pressure, an unexplained uncertainty, an observation later generalised, a political problem it solves (who gives orders, why a decision is trusted). Treat it as a reasonable response, not an ignorant guess.

## Give history's relevance away

State the ancient-to-modern continuity explicitly somewhere in the chapter (one synthesis slide near the close usually suffices) - don't leave the student to infer why any of it matters. Name the specific mechanism carried forward (a record-keeping system, a standard, a form of legitimate authority), not a vague "shaped the modern world."

## Earn every scene

A scene goes on a slide only if it makes something visible that prose, a table or a worked calculation cannot: a relationship that moves, a distribution that builds, a structure compared side by side, a mechanism over time. Test each planned scene with two lines on its outline slide (Stage 1b):

- `Shows:` what becomes visible that text cannot ("the row 'risk' moves as controls per case change while the column rates stay put").
- `Without it:` what the learner would lose ("they would take 33/88 as a risk").

Both weak: the slide is Text only, with one emphasis device: pull quote, takeaway, table or worked steps (`docs/numericals.md`). Decoration fails the test: a card with a "?", a board that pins a number the prose already states, a picture with nothing to do and nothing that changes. Signal: no learner action AND no changing quantity. Under `quill` (school) AGENTS.md rule 11 still wants a scene on most slides: the test decides what the scene shows, not whether to drop it. Under `plain` or a college audience a Text only slide is a normal outcome.

## Dry, text-heavy subjects: which visuals first

Epidemiology, statistics, law and economics read as dry, and students dislike them; visuals matter more there, not less. Spend the effort where the idea is hard, not on every slide. Reach for these first, in this order:

1. Editorial panels (`docs/numericals.md`, SimPanel): a live reading with its formula, a rule table with selectable columns, bar comparison, a step-by-step calculation panel, an annotated sentence, a histogram that builds.
2. A population as dots that sorts, splits or fills (`dotsSvg`), a flow or timeline (the `figure` field, FlowBoard).
3. Bespoke illustration only when the picture is the mechanism.

Never: decorative boards, props or desk dressing that hold no idea.

## Clarity beats brevity

First-time learners need the full explanation: what, why this way, what it means. Explanatory depth is a strength; do not trade it for concision. Split a long explanation over beats instead of cutting it; the sentence limits in `docs/voice-and-tone.md` still hold.

=== SECTION: docs/generation-playbook.md :: "2. Draft" ===
## 2. Draft a lesson outline

For each distinct topic/concept, sketch a beat-by-beat outline (a working markdown file, not published content): hook/question, prediction, explanation, worked example. One lesson per topic is the usual granularity; split further if a topic is too big for one file.

**Scope from the source chapter's own section headings/table of contents**, not an external taxonomy - cover everything the chapter actually contains. Where a slide depends on a figure you logged in `FIGURES.md`, point at it by label so a later pass can find it without re-reading the source.

Decide simulation vs. static image **now**, per slide, not ad hoc while writing block files (step 3). Default to a simulation; fall back to an image only when a specific picture genuinely conveys the concept better. A slide with neither is the exception to justify. Every scene passes the necessity test (`docs/pedagogy.md` "Earn every scene"): a `Shows:` and a `Without it:` line on its slide; both weak means Text only with one emphasis device (`docs/numericals.md`). Under `plain` or a college audience Text only is normal and the default for a slide whose idea is a sentence or a number.

Check the whole outline end to end for forward-references - a slide that only makes sense once a *later* lesson's idea has been introduced (`AGENTS.md` hard rule 7) - while it's still a few bullet points, not after 40 files exist.

=== FILE: briefs/reference/engine-capabilities.md ===
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

=== FILE: docs/mini-games.md ===
# Mini-games

A mini-game is an existing scene plus a goal. Do not build a games engine.

Two kinds of game, do not mix them up. The `mini-game@1` here embodies the concept (tie rule below, one per lesson, no timers, retries free). An **arcade game** (`docs/arcade-games.md`) drills what a lesson already taught - terms, groups, keys, sequences, myths - against a gentle clock; it is optional, any number per chapter, sits on a plain `content-block@1` slide, and is never graded. The tie rule and "no timers" apply to `mini-game@1` only.

## The tie rule

Classify a design before building it. The concept must be IN the mechanic, not
printed on it.

| Tie | Definition | Verdict |
| --- | --- | --- |
| L0 Decoration | concept is a label on a game object | reject |
| L1 Recognition | must identify or classify instances | warm-up only |
| L2 Embodiment | the win condition IS the concept's rule | target |
| L3 Strategy | must exploit the concept's structure to optimise | best |

L0 example to avoid: catch the fish labelled 1/2, dodge the 1/4. A student wins
by matching glyphs without knowing what a half is.
L2 example: stack 1/8 + 1/4 + 1/2 notes to total exactly one bar. You cannot win
without adding fractions.
L3 example: flex a fixed-side quadrilateral to its largest area. The maximum is
the cyclic case - the student discovers Brahmagupta by playing.

**If a design cannot clear L2, ship it as a question, not a game.**

## Placement

One game per lesson, in the Challenge slot, after the mechanism is taught and
before the closing cliffhanger. Never the first block. Never inside a test.

**No timers.** A countdown converts understanding into reflex, which is the L0
failure again. Retries are unlimited and unpenalised.

## Exercise, not game (plain look, college audience)

Under look `plain` or audience `college` a `mini-game@1` is an exercise. Same block type, same tie rule (the check IS the concept's rule), different framing:

- One instruction with a stated goal: "Find the disease frequencies at which the odds ratio stays within 10 per cent of the risk ratio."
- A live model the learner adjusts (a slider, a table, entries), its readings visible while they move.
- An explicit check (the host's Check button, or `SELF_CHECKING` with a visible tick) and feedback that gives the worked explanation, not only right or wrong.
- No game chrome: no game, play, level, score, badge, XP or challenge wording in learner-visible text, titles, `objective`, ARIA labels or the briefing slide (say exercise, task, practice); no rounds counter, timer, stars, boxed arcade card or "what the game shows" table.
- Fits the slide frame at 1280x800 and 390x844 with no page scroll.
- The briefing slide before it says what to do and what to look for, as prose (a takeaway line), not a rules table about "the game".

`prose-lint` flags the words (WARN; fix or explain in one line). The engine frames it: under a look with gamification off (plain) the block shows a quiet small-caps "Exercise" label over one rule (no badge, no boxed card), verdict "Correct.", and sizes the scene to the slide frame (viewport less about 380 px of chrome; 330 px on a phone). Quill keeps "Challenge".

Build the exercise on SimPanel (`docs/dom-scene-kit.md`): `promptHtml` instruction line, `sliderHtml` with the live table and readings, an explicit Check (`buttonsHtml` primary) with the worked explanation in the feedback; `static SELF_CHECKING = true` and call `this.requestCheck()` on a correct check so the host shows no second button (under an exercise look the host verdict line is then for screen readers only; the scene's own feedback is what shows). Keep the portrait frame short (about 360 x 640 design px) so it fits 390 x 844 with no scroll.

## Authoring

Content block:

```json
{
  "type": "mini-game@1",
  "src": "simulations/L06/FloppyQuadScene.js",
  "objective": { "en": "Flex the shape to its largest possible area." },
  "xp": 15
}
```

`src` resolves bundle-relative, same as `image.src`.

## Scene side

Extend `withChallenge()` and implement one method:

```js
import { withChallenge } from 'simulations/base/ChallengeMode.js';

export class FloppyQuadScene extends withChallenge(CanvasSimulation) {
  static OBJECTIVE = { prompt: { en: 'Flex it to the largest area.' } };
  static SCORING   = { tolerance: 0.02 };

  // Return { value, target } for numeric closeness, { ok: bool } for pass/fail,
  // or null for "nothing to judge yet".
  checkObjective() { return { value: this.area, target: this.maxArea() }; }
}
```

`evaluate()` is provided: it scores, counts attempts and returns
`{ solved, score, best, attempts, feedback }`. Never award XP from a scene or a
plugin - the engine's GamificationService does it, once per game.

## Phone layout: GameFrame

A plain-DOM game uses `simulations/base/kit/GameFrame.js`. At 390 wide `mini-game@1` gives a scene 320 px, so the phone design is 320 wide at scale 1: a 48 px button is 48 CSS px. Landscape is a 1100 x 405 frame; portrait grows with the content and the page scrolls.

```js
import { GameBoard, mountGame, finishGame } from 'simulations/base/kit/GameFrame.js';

export class SpotGame extends GameBoard {
  static OBJECTIVE = { prompt: { en: 'Make the colour spots.' } };
  async setup() {
    await super.setup();
    mountGame(this, { css: CSS, html: '<div class="gm my"><div class="gm-head"><p class="kicker">Challenge</p><h2>...</h2><p class="sub">...</p></div>...</div>' });
  }
  checkObjective() { /* null, { ok: false, hint }, or { ok: true } */ }
}
```

- `mountGame` adds Quill and Check, and refits the frame when the content grows. Set no height by hand.
- `check`: a label; `{ label, in: '.sel' }` to put the button in your own element; `false` for no button. With `false`, call `finishGame(this)` after the last round. Never hide `.gm-check` with CSS.
- `SortBoard` is tap a card, tap a bin, from data: `static KEY, HEAD, CARDS, BINS, LINE, CSS`.
- Classes: `.gm`, `.gm-head`, `.kicker`, `.sub`, `.tap`, `.btn`, `.num`. `onTap(el, fn)` adds Enter and Space. `formula('H2O')` adds the subscripts.
- Colours are tokens; radius, rim and lip come from the look. Under `plain` there is no Quill.
- Gates: `tools/game-targets.mjs` at 390 (targets 44 px, text 13 px) and a real-app check at 1280 and 390. sim-layout mounts a GameBoard at 1100 and 320.

## Rounds, solved, and when the game ends

`withChallenge` has no rounds. The scene owns them. Facts (ChallengeMode.js, plugins/blocks/mini-game):

- The host's "Check my answer" calls `evaluate()`; `evaluate()` calls your `checkObjective()`. `null` = "not ready" (no attempt counted).
- `solved` latches: the FIRST `{ ok: true }` (or a value within `tolerance`) sets `this.solved = true` and the host pays XP once
  (`minigame:solved`). A later `ok: false` does not undo it. So return `ok: true` only when the WHOLE game is won, never per round.
  check-scene WARNs "round latch" when checkObjective reads the round index with no all-rounds-cleared guard: return null until every round is won.
- Per-round verdicts ("round 2 of 5: right") are the scene's own UI. The host sees only the final result.
- A scene that already shows per-answer feedback can call `this.requestCheck?.()` the moment the last round is cleared; the host then runs the
  same pipeline as the button (no extra click).
- Round state lives in the scene: `this._round`, `this._won = []`. Do not use reserved names (`_running`, `_hasStarted`, `_rafId` ...).
- `resetChallenge()` clears `solved` only; also reset your own round state there.

Canonical 40-line canvas game (rounds, final-only verdict):

```js
import { SimScene } from 'simulations/base/kit/SimScene.js';
import { withChallenge } from 'simulations/base/ChallengeMode.js';
import { W, mulberry32 } from 'simulations/base/kit/SimLook.js';

const ROUNDS = 3;
export class ExampleGameScene extends withChallenge(SimScene) {
  static BEAT_STEP_MAP = [[{ idx: 0 }]];
  static ARIA_LABEL = 'Three-round game: pick the right value each round';
  static CONTROLS = [{ id: 'next', type: 'button', label: 'Next round' }];
  static OBJECTIVE = { prompt: { en: 'Clear all three rounds.' } };
  async setup() { await super.setup(); this._reset(); }
  _reset() { this._round = 0; this._won = []; this._answer = this._deal(0); this._picked = null; this._msg = ''; }
  _deal(i) { return Math.round(mulberry32(1000 + i)() * 8) + 1; }       // seeded: same game every mount
  enter() { this._reset(); }
  onControlChange(id) { if (id === 'next' && this._won[this._round] != null) this._nextRound(); }
  pointerDown(p) {                                                        // pick a value
    if (this._won[this._round] != null) return;
    this._picked = Math.max(1, Math.min(9, Math.round((p.x / W) * 9)));
    this._won[this._round] = this._picked === this._answer;
    this._msg = this._won[this._round] ? 'Right' : 'Not this time';
    if (this._round === ROUNDS - 1) this.requestCheck?.();                // last round done: host runs evaluate()
  }
  _nextRound() { this._round++; this._answer = this._deal(this._round); this._picked = null; this._msg = ''; }
  checkObjective() {
    if (this._won.length < ROUNDS) return null;                           // not ready: rounds left
    return { ok: this._won.every(Boolean), hint: 'Some rounds were missed. Try again.' };
  }
  resetChallenge() { super.resetChallenge(); this._reset(); }
  drawFrameInner(ctx, C) { /* draw round counter, the picker, this._msg (text >= 14px, tokens from this.colors) */ }
}
```

Operate it headless with no harness of your own:
`node tools/sim-test/run.mjs exec tools/sim-test/drive.mjs <scene> --bundle <b> --recipe smoke`, then
`--steps='[{"tap":[300,200]},{"probe":"sc.evaluate()"}]'` to read the verdict (`d.sc` is the scene; `drive` calls `start()` and fakes timers).

## Where the mascot goes

| Tier | Quill lives in | Use when | Cost |
| --- | --- | --- | --- |
| T1 (default) | the `mini-game@1` chrome | he reacts to outcomes only | any scene, unchanged |
| T2 | the scene, via `SimMascotDom` | he must stand in the geometry | scene must be a `DomSimulation` |

Prefer T1. It works with a canvas scene as-is; T2 exists for when position
carries meaning.

=== FILE: briefs/reference/kit-parts.md ===
# Kit parts: pattern -> part

Look here before drawing or hand-coding any of these. Each part has a showcase; your guide under `briefs/stage3/` lists the exports of the modules for your kind of scene (`node tools/sim-test/kit-api.mjs <module>` for any other).
Nothing here fits? `none fits (looked at: kit-parts.md)` is a valid answer in the design note.
Check-scene prints a `note` when a scene defines one of these itself.

| You are about to write | Use instead | Module (simulations/base/kit/) | Showcase (examples/simulations/) |
|---|---|---|---|
| word-wrap, fit text in a box, caption strip | wrapText, fitText, captionBar | SimLook.js | LookKitShowcaseScene.js |
| labels that must not overlap, leader lines | placeLabels, leader (clamps to frame) | SimLook.js | LookKitShowcaseScene.js |
| chip text under 14px | pills raise to MIN_PX (14) by themselves | SimLook.js | - |
| clamp, lerp, mix, inkOn, rr, mulberry32 | import them | SimLook.js | - |
| force / velocity / field arrow with a value | vectorArrow | SimLook.js | PropsShowcaseScene.js |
| drag a point, grab radius, snapping | dragHandle (you draw the handle) | SimDrag.js | PropsShowcaseScene.js |
| cart, block, ramp, pulley, spring balance, ground | propRig + drawCart/drawBlock/drawRamp/drawPulley/drawSpringBalance/drawGround | SimProps.js | PropsShowcaseScene.js |
| energy bars (K, U, heat and sound), total line, tween | drawEnergyBars + barsAt / energyBarsTrack | SimEnergy.js | science/EnergyCastShowcaseScene.js |
| work done pill ("W = 20 J") | drawWorkCounter | SimEnergy.js | science/EnergyCastShowcaseScene.js |
| coil spring (rest, squashed, stretched), wall mount, push-back arrows | drawSpring | SimApparatus.js | science/EnergyCastShowcaseScene.js |
| pendulum, swing arc, level line, marked points | drawPendulum | SimApparatus.js | science/EnergyCastShowcaseScene.js |
| seesaw plank, seats, beam balance pans and coins | drawLeverPlank (geometry from SimRig lever) | SimApparatus.js | science/EnergyCastShowcaseScene.js |
| sack or school bag with hand grips | drawSack | SimApparatus.js | science/EnergyCastShowcaseScene.js |
| stairs, rail, height bracket, ground(x) for feet | drawStairs | SimApparatus.js | science/EnergyCastShowcaseScene.js |
| bar magnet N/S, + / - charge, plain ball or stone | drawMagnet, drawCharge, drawBall | SimApparatus.js | science/EnergyCastShowcaseScene.js |
| number line, ticks, fractions, hops, spans | numberLine (spec) + numberLineCanvas, markerCanvas, hopCanvas, spanCanvas | SimNumberLineSpec.js, SimNumberLineCanvas.js | ShapeKitCanvasShowcaseScene.js |
| bar chart, line trace, axes, second y axis | chartFrame (spec) + axesCanvas, barsCanvas, traceCanvas | SimChartSpec.js, SimChartCanvas.js | ShapeKitCanvasShowcaseScene.js |
| the same on an SVG / DOM stage | numberLineSvg, markerSvg, axesSvg, barsSvg, traceSvg (same specs) | SimNumberLine.js, SimChart.js | maths/NumberLineShowcaseScene.js, maths/ChartShowcaseScene.js |
| rock layers, fault, cave, grain | drawStrataBlock (endLines, grain, voids, fault) | GeoMap.js | geo/StrataExtrasShowcaseScene.js |
| sort items into bins with live counts | simPick with track: true | SimPick.js | - |
| ask the learner to commit a guess before the reveal | predictGate (chips, verdict, celebrate / oops, keyboard path via a select) | SimPredict.js | maths/CatchUpPredictShowcaseScene.js |
| angle arcs with a live value, right-angle marks, constructions, drag a point on a circle | geomFigure + geomHandles (spec) + geomCanvas (canvas) or geomSvg (SvgScene) | SimGeomSpec.js, SimGeomCanvas.js (canvas); SimGeom.js (SVG) | maths/ArcAngleShowcaseScene.js (canvas); maths/GeomShowcaseScene.js (SVG) |
| area model / algebra tiles with a caption that must match the picture | areaModel (cells, total, caption() derived) + areaGridCanvas | SimGeomSpec.js, SimGeomCanvas.js | maths/AreaTilesShowcaseScene.js |
| dot or tile patterns on graph paper: rows of dots (staircase), W x H grid, L-shaped layer, bar, stack, upside-down copy, zigzag-split rectangle, Sierpinski triangle stages; lit / dim / ghost cells, staggered arrival | triangleRows, rect, lLayer, bar, stack, mirror, shift, zigzagSplit, sierpinski (cell lists) + patternSvg, zigzagSvg, fitCell (SvgScene) | SimDots.js | maths/DotPatternsShowcaseScene.js |
| maths in a wrapped caption (fractions, powers inside a sentence) | drawMathCaption, drawMathWrapped, wrapMath | SimText.js | maths/AreaTilesShowcaseScene.js |
| repeated random trials, running frequency, a strip of draws | trialRun (seeded) + traceCanvas + trialStripCanvas | SimChanceTrials.js | maths/LongRunFrequencyShowcaseScene.js |
| a timeline strip: eras, dated ticks, event tags, brackets, a now marker | timelineAxis + timelineCanvas | SimTimelineCanvas.js | humanities/HarappanTimelineShowcaseScene.js |
| a plain icon (sun, globe, lamp, eye, cloud, mountain, plane, leaf, seed, flower, cup, glass, ticket, printer, flame, speaker, tyre, crate, test-tube, mushroom, fish, frog, bird, snail, insect ...) | drawIcon / iconSvg | SimIcons.js | humanities/IconSheetScene.js |
| dates on a line (DOM board) | TimelineScene | SimTimeline.js | humanities/ChronologyShowcaseScene.js |
| cause chain, order, cycle | FlowScene | FlowBoard.js | humanities/FlowLayoutsScene.js |
| a count that ticks up or rolls (odometer) | countUp / odometer (canvas); countSvg / odometerSvg (SVG, DOM) | SimMorph.js; SimMorphSvg.js | SimMorphShowcaseScene.js; maths/SvgMorphShowcaseScene.js |
| one expression becomes the next ("6 + 4" to "10") | transformTerms / transformTermsSvg; term lists from setTerms, rosterTerms, builderTerms | SimMorph.js, SimMorphSvg.js, SimMorphSpec.js | SimMorphShowcaseScene.js; maths/SvgMorphShowcaseScene.js |
| a shape becomes another shape; a keyword pops; a marker swipe | morphPair + drawMorph, drawKeyword, highlighterSweep; morphPath, keywordSvg, highlighterSvg | SimMorph.js, SimMorphSvg.js | SimMorphShowcaseScene.js; maths/SvgMorphShowcaseScene.js |
| items fly into bins or rings, staggered | flyMany / flyChip / flyTo on the live layer (or lagged on canvas) | SimFlySvg.js; SimAnim.js | maths/SvgMotionShowcaseScene.js; SimAnimShowcaseScene.js |
| spotlight one part, dim the rest, pulse, flash THE answer | spotlight, focusStyle, indicateSvg, flashSvg (SVG); focusTone, indicate, dimOutside, flashAt (canvas) | SimFocusSvg.js; SimFocus.js | maths/SvgMotionShowcaseScene.js; SimFocusShowcaseScene.js |
| a line or ring draws itself, text is written on | drawOnPath, drawOnCircle, writeOnSvg (SVG); drawOn, writeOn (canvas) | SimDrawOnSvg.js; SimDrawOn.js | maths/SvgMotionShowcaseScene.js; SimDrawOnShowcaseScene.js |
| the frame clock on a DOM scene | extends withClock(DomSimulation): play, skip, busy, animate | SimClock.js (also SimSvg.js) | ClockDomShowcaseScene.js |
| a table of counts with totals, marked cells, a row's share, a hidden cell to find | tableSpec + tableSvg (hi, band, dim, hidden, guess); a table only to read is markdown | SimTableSpec.js, SimTable.js | data/TableHighlightScene.js |
| a panel of numbers: big reading with its formula, ruled table with a column or row to pick, labelled slider with ticks, bar-compare rows, histogram with a marker, take-away line, numeric entry with Check | readoutHtml + setReadout, ruleTableHtml, sliderHtml, barsHtml (rule) + setBar, columnsHtml + setColumns, takeawayHtml, entryHtml, buttonsHtml, bindPanel | SimPanel.js | - (course: analytical-epidemiology L03) |
| a worked calculation: numbered rows (label, big serif formula, gloss), stacked fraction, value that counts up, "Show worked arithmetic" | calcStepsHtml, formulaHtml ({ n, d } / { v, key }), overHtml, countValue, revealHtml | SimPanel.js | - (course: analytical-epidemiology L03 OddsRatioBuildScene) |
| emphasis: pull quote, highlighted phrase, a correction (struck word + replacement) | pullQuoteHtml, emHtml, editHtml | SimPanel.js | - (course: L03 SlipSpotterScene) |
| something the learner acts on: chip with a select ring and picked state, the prompt line, a sentence of word chips | chipsHtml, promptHtml, sentenceHtml; ruleTableHtml pick heads | SimPanel.js | - (course: L03 OddsRatioBuildScene, SlipSpotterScene) |
| which pattern to use (worked steps, emphasis, affordance rules) | see `docs/numericals.md` 2-4 | SimPanel.js | - |
| Venn rings, regions, shading, sort items into regions | vennSpec + vennSvg + slots + exprMask + regionSweepSvg (SVG); vennCanvas (canvas) | SimVenn.js, SimVennSpec.js; SimVennCanvas.js | maths/VennShowcaseScene.js; VennCanvasShowcaseScene.js |
| chips written as terms or notation that light parts of the figure (tap to lock, keyboard, phone) | tapLight (DOM, SVG, in the scene); tapLightControl (canvas, host CONTROLS) | TapLight.js | science/TapLightSvgShowcaseScene.js, science/TapLightCanvasShowcaseScene.js, maths/TapLightDomShowcaseScene.js |
| drag into a region that is not a rectangle; items glide home | simPick targetAt, onOver, settle: 'spring', settling | SimPick.js | maths/PickRegionShowcaseScene.js |
| zoom or pan into a part, parallax | withCamera, pushTo, cameraAt, layer (canvas); cameraG, cameraLive, cameraTransform, pointWorld (SVG, DOM) | SimCamera.js; SimCameraSvg.js | SimCameraShowcaseScene.js; maths/SvgCameraShowcaseScene.js |
| name the thing to look at on the figure: a callout with a leader, an underline, a highlighter sweep, a ring (at most 3; the newest is the beat) | annotations({ max }): callout(target, text, { sub, side, at, key }), underline({ x1, x2, y }), highlight(box), ring(target), clear(key); SVG under()/svg()/over(), canvas draw(ctx, c, { layer }); annotateDom(host) for DOM | SimAnnotate.js | data/PeopleToCellsScene.js; data/TableHighlightScene.js |
| axes that build, a line that plots, bars that grow, a callout | axesOn, plotLine, barsOn, drawCallout (canvas); axesOnSvg, plotLineSvg, barsOnSvg, calloutSvg, plotHit (SVG, DOM) | SimPlot.js; SimPlotSvg.js | SimPlotShowcaseScene.js; maths/SvgPlotShowcaseScene.js |
| coordinate plane on graph paper (equal units, x / y / O, arrows), points with tags, y = ax + b, step triangle, y-intercept, drag a point on the grid | planeFrame, planeSvg, pointSvg, lineSvg, lineThroughSvg, lineDrawOn, stepTriangleSvg, interceptSvg, dragPoint, planeHit (SvgScene) | SimPlaneSvg.js | maths/PlaneShowcaseScene.js |
| isometric blocks, exploded view | solidOf, drawSolid, explode (canvas); isoSvg, isoLive, explodeLive, pickFace (SVG, DOM) | SimIso.js; SimIsoSvg.js, SimIsoSpec.js | SimIsoShowcaseScene.js; maths/SvgIsoShowcaseScene.js |
| picture A becomes picture B; a soft contact shadow | stageBridge, contactShadow (canvas); stageBridgeSvg, contactShadowSvg, shadowTone (SVG, DOM) | SimStage.js; SimStageSvg.js, SimStageSpec.js | SimStageShowcaseScene.js; maths/SvgStageShowcaseScene.js |
| limbs, two-bone reach, crank, lever | ik2, limb, muscle, crankSlider, lever (canvas); limbSvg, muscleSvg, leverSvg, crankSvg, trackPoint (SVG, DOM) | SimRig.js; SimRigSvg.js | SimRigShowcaseScene.js; maths/SvgRigShowcaseScene.js |
| the scene demonstrates itself when idle | tour (also on a withClock SVG / DOM scene: it never draws) | SimTour.js | SimTourShowcaseScene.js |
| a mini-game board in plain DOM that must work on a phone: tap card, tap bin; Check under the board; Quill in the corner (the look's companion; none under plain) | GameBoard + mountGame, or SortBoard (data only); onTap, formula, finishGame | GameFrame.js | - |
| pan balance | SimBalance | SimBalance.js | maths/BalanceShowcaseScene.js |
| lab glass (beaker, jar, tube, cylinder, flask, round flask, bottle, tumbler, funnel, separating funnel 'pear', dropper; flip for mouth-down) and the liquid in it; straight tubing (condenser, side arm) | glassBox, drawGlass, drawGlassLiquid, drawGlassBand, drawGlassFront, wallsAt, drawGlassPipe, drawGlassPipeFront (canvas) | SimGlass.js | mixtures L01-L09 |
| an atom, nucleus, proton, neutron, electron, shell, ion, shared pair, ball-and-stick molecule (H2, Cl2, O2, N2, HCl, H2O, CO2, sugar); a depth field for a microscopic hero. One material; no faces | drawAtom, atomLayout, drawNucleus, nucleusLayout, drawNucleon, drawElectron, drawSeat, drawShell, shellPoints, drawIon, drawCharge, drawBond, drawSharedPair, drawMolecule, MOLECULES, atomTone, drawBall, drawFocus, drawDepthField (canvas) | SimAtom.js | science/AtomShowcaseScene.js |
| kit paper + course setting behind a legacy CanvasSimulation (replaces its bgDeep fill) | drawKitBackdrop(ctx, this, W, H) | SimLegacy.js | atomic-foundations (50 scenes) |
| the active look's numbers (radius, rim, lip, pop time); never hard-code a look | lookOf() (canvas, SVG markup); --look-* (DOM CSS) | lookProfile.js, looks/quill.js | - |
| a person doing the work | drawFigure | SimFigure.js | FigureShowcaseScene.js |
| a person by role (student, teacher, voter, doctor, farmer, police ...) | figureFor(this, { role, pose, scale }) -> spec; throws on a typo, never a stick person | SimFigure.js | FigureGroupsScene.js |
| a row of people, a class, a queue, rows behind rows | drawFigureRow (wraps, shrinks, glyphs below 44 px; between: a desk) | SimFigure.js | FigureGroupsScene.js, SeatedCycleScene.js |
| a crowd, voters, an audience | drawCrowd (seeded, no face hidden) / crowdLayout (pure) | SimFigure.js | FigureGroupsScene.js |
| ring the counted people, k of n; plain (a population as data): k of n as dots | highlightFigures (rings + count chip); plain: dotsSvg (seeded Set for the marked dots) | SimFigure.js; SimChart.js | FigureGroupsScene.js; data/DotPopulationScene.js |
| a seated person, a chair, a bench, a desk | pose 'sit' + drawChair / drawSeatBench / drawDesk (seat and hand anchors) | SimFigure.js, SimProps.js | SeatedCycleScene.js, humanities/PartyChamberRebuildScene.js |
| a cyclist, a bicycle | pose 'cycle' + bicycleRig / drawBicycle (wheels roll with distance) | SimFigure.js, SimProps.js | SeatedCycleScene.js |
| a cow, goat, sheep, dog, cat, deer, tiger, elephant | drawAnimal({ kind, pose: stand / walk / graze / lie, phase: animalPhase(dist) }) | SimAnimal.js | AnimalSheetScene.js, AnimalFieldScene.js |
| a fish, frog, bird, snail, insect | drawIcon / iconSvg | SimIcons.js | humanities/IconSheetScene.js |
| a field of crop strips (wheat, barley told apart by shape, sugarcane, millet, pulse, rice, idle), soil by kind, a reading tag on a strip, tap a strip, crops growing in; a well with the water line under the ground | farmSpec + farmSvg / drawFarm, farmHit, farmGrow, farmGrowOne (one strip growing, animate: i); tagPlace 'end' / 'outside' (tags clear of the crops) + farmBox; wellSvg / drawWell; tagSvg / drawTag (tone: crop name); cropTone | SimFarm.js | humanities/FarmStripsShowcaseScene.js |
| drawn civic and economy things at scene size, no faces, no money art: polling booth, ballot box, voting machine, parliament, court, office, school, tree, village square, book, open book, newspaper, phone, mike; shop, market stall, tailoring workshop, factory, sewing line (machine-heavy), tailor table (labour-heavy), bank, truck, report with a bar chart, planning office, library, shoe, school shirt; light one part (dim) | drawCivic (canvas), civicSvg (SvgScene), civicHtml (DOM), civicSize, CIVIC_KINDS, CIVIC_PARTS, dayStage, speech | SimCivic.js | humanities/CivicKindsShowcaseScene.js |

Rules of thumb:
- A canvas scene can use the Canvas renderers; an SVG or DOM scene uses the Svg ones. The geometry (numberLine, chartFrame) is the same.
- Animate a canvas part by passing progress 0..1 (grow, draw, reveal); the scene owns the clock.
- Not covered yet (write it in the scene, keep it small): probability trees, function machines, place-value boards.

Waves (SimWave.js, canvas; one model s(d, t) = f(t - d / v) behind every part):

| You are about to write | Use instead | Module (simulations/base/kit/) | Showcase (examples/simulations/) |
|---|---|---|---|
| a vibrating source, piston strokes, one pulse | sineSource, pistonSource, pulseSource, sumSources | SimWave.js | science/WaveCastShowcaseScene.js |
| where the compressions / rarefactions are now, density | waveField (s, rho, rhoLin, regions) | SimWave.js | science/WaveCastShowcaseScene.js |
| air particles in a tube, piston, C/R tags, red particle + range | drawParticleStrip | SimWave.js | science/WaveCastShowcaseScene.js |
| R as readable as C (paper band), region brackets, open tube end, room full of air, slinky fixed end, signal pulses in a wire | swingAmp, drawParticleStrip densityShade/regionBands/clip/fadeEnd, drawRings mask/mark, drawSlinky fixedEnd/markBracket, drawSignalWire style pulse | SimWave.js, SimApparatus.js | science/WaveCastShowcaseScene.js, science/SoundApparatusShowcaseScene.js |
| density-distance graph on green graph paper, lambda, amplitude | drawDensityGraph | SimWave.js | science/WaveCastShowcaseScene.js |
| slinky with a marked turn; rope or string with a marked point | drawSlinky, drawRope | SimWave.js | science/WaveCastShowcaseScene.js |
| rings of particles round a point source, one-direction strip | drawRings | SimWave.js | science/WaveCastShowcaseScene.js |
| sound leaving a source / arriving at a receiver (arcs) | drawSoundArcs (the one style) | SimWave.js | science/WaveCastShowcaseScene.js |
| echo pulse to a wall and back, travel time | outAndBack, drawOutAndBack | SimWave.js | science/WaveCastShowcaseScene.js |
| direction of propagation / particle vibration arrows | drawPropagationArrow, drawVibrationArrow | SimWave.js | science/WaveCastShowcaseScene.js |
| tuning fork (stem, two prongs, swing + ghost), rubber pad | drawTuningFork | SimApparatus.js | science/SoundApparatusShowcaseScene.js |
| vacuum bell jar with electric bell, wires, hand pump | drawBellJar | SimApparatus.js | science/SoundApparatusShowcaseScene.js |
| long tube with a piston at the left end (rod, T handle) | drawPistonTube | SimApparatus.js | science/SoundApparatusShowcaseScene.js |
| loudspeaker (whole or cutaway), microphone (whole or cutaway, desk stand) | drawSpeaker, drawMicrophone | SimApparatus.js | science/SoundApparatusShowcaseScene.js |
| cable with an electrical signal trace beside it | drawSignalWire | SimApparatus.js | science/SoundApparatusShowcaseScene.js |
| stopwatch with a hand and a readout | drawStopwatch | SimApparatus.js | science/SoundApparatusShowcaseScene.js |
| side-view bus (outside, or cut-away inside with seats, strap bar, standing anchor), car, truck (box/open), scooter with rider anchors | drawBus, drawCar, drawTruck, drawScooter | SimVehicles.js | science/MotionKitShowcaseScene.js |
| canoe with paddle and paddler anchors, rocket with plume or retro jets, balloon rocket on a thread | drawCanoe, drawRocket, drawBalloonOnThread | SimVehicles.js | science/MotionKitShowcaseScene.js |
| straight running track, road, number line or pool lane in metres, O, +/- sides, pins with tags | trackSpec, drawTrack | SimTrack.js | science/MotionKitShowcaseScene.js |
| strobe (ghost copies at equal time steps) with gap brackets; speedometer dial | drawStrobe, drawSpeedometer | SimTrack.js | science/MotionKitShowcaseScene.js |
| velocity, acceleration, force, displacement arrows (fixed tones, a = 0 dot) | drawMotionArrow, ARROW_KINDS | SimTrack.js | science/MotionKitShowcaseScene.js |
| slope triangle A-C-B on a graph; area under a v-t line (split rectangle + triangle) | slopeTriangle, areaUnder | SimPlot.js | science/MotionKitShowcaseScene.js |

=== SECTION: docs/numericals.md :: "3. Emphasis" ===
## 3. Emphasis

- The slide's key sentence is never buried in a paragraph. Pick one device:
  - pull quote: a `>` line, the sentence alone;
  - takeaway: in prose a bold sentence alone in its paragraph; in a scene `takeawayHtml(lead, rest)` (bold lead between two rules);
  - in a scene: `pullQuoteHtml(html, { label, cite })` (serif, signature rule at the left); `emHtml(text)` marks the one phrase inside it (bold on a highlighter band); a correction is `editHtml(del, ins)` (original struck, replacement in the signature colour), then the whole corrected sentence as the pull quote;
  - table: the key numbers as a markdown table (or `ruleTableHtml` when cells are picked or filled);
  - worked steps: section 2.
- One device per beat, one pull quote per slide. Bold marks a term at its definition and the one takeaway; never scattered bold.
- A Text only slide (no scene, `docs/pedagogy.md` "Earn every scene") names its device in the outline: `**neither** (Text only: pull quote; <reason>)`.

=== BUNDLE INFO ===
bundle stage1b, sha256 c9a030315c2bfbcf. GENERATED by tools/staged-generation/build-bundles.mjs from:
- START-HERE.md (11478 chars)
- briefs/stage1b-outline.md (11712 chars)
- docs/pedagogy.md (7002 chars)
- docs/generation-playbook.md :: "2. Draft" (1415 chars)
- briefs/reference/engine-capabilities.md (6293 chars)
- docs/mini-games.md (10204 chars)
- briefs/reference/kit-parts.md (19381 chars)
- docs/numericals.md :: "3. Emphasis" (997 chars)
Do not edit: change the sources and rebuild. Everything above is the full text of those sources; do not open them again.
