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

=== FILE: docs/look-base.md ===
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

=== FILE: packs/look/quill/CARD.md ===
# Quill look: the card

Briefs quote this card. Holds on top of `docs/look-base.md`. Reference: `SPEC.md`; anchors: `SHOWCASE.md`.

1. A small lit world, not a diagram on paper: setting, floor, one hero. A microscopic or abstract subject may float on a quiet depth field instead of a floor.
2. The hero is the subject, drawn well: at least 1/3 of the width, near the centre. Detail goes to the hero; the setting stays quiet.
3. Shapes are chunky and rounded: flat fill, one cushion shade, one highlight, one darker rim. No hairlines, no gradients on controls.
4. One key light, top-left. Glow only on what emits light or what the beat is about.
5. Dark theme is night, light theme is day: the same world under two lights. If the scene has its own time of day, that wins in both themes.
6. Fredoka for readings and titles, Nunito for the rest. Readings are big.
7. Panels have a rim. Chips and buttons are flat with a solid lip.
8. Character where it belongs: a person with hands on the work, or an animal, when the subject has them. Never force one into a microscopic or abstract scene, and never a face on the evidence.
9. Things arrive with a spring and then rest.
10. Celebrate the find only. A scene never fires confetti. When the learner finds the idea, the scene calls its kit `celebrate()`: the kit shows a small ring and twinkles on the found thing and announces the find; Quill reacts from outside the scene (nod, clap, point, twirl). Once per find. Run and misses never celebrate.

Maths is the exception: flat, graph paper, no texture, no glow.

=== FILE: briefs/reference/look-rubric.md ===
# Look rubric (Stage 3 look step and Stage 3-look)

The bar: the course's look card (the one in your bundle or named in the prompt; default the Quill look, `packs/look/quill/CARD.md`), on top of `docs/look-base.md`. Passing every check is required and is not enough: bare-but-correct scenes have been rejected twice with every check green. The note's `## Checks explained` is the builder's claim, not a verdict: judge the picture.

## Calibration images (open these before judging your own)

Plain look: skip this table; calibrate on the images `packs/look/plain/SHOWCASE.md` names (`examples/media/plain-look/`) and `briefs/showcase/ANTI-programmer-art-vs-good.png`.

Anchors, not perfect scenes (`packs/look/quill/SHOWCASE.md` says what not to copy). `Q` = `examples/media/quill-look/`.

| Image | Why |
|---|---|
| `Q/GOOD-Kudavolai-dark-b0.png`, `Q/GOOD-Kudavolai-light-b0.png` | closest to the card: one hero, a hand on it, the same world at dusk and in the morning |
| `Q/GOOD-BellJar-dark-b1.png` | a lab run: apparatus, a quiet bench, a person who reacts |
| `Q/GOOD-SaltLattice-dark-b4.png` | a microscopic subject on a depth field, no face on the evidence |
| `Q/GOOD-SlideRule-light-b1.png` | maths: chunky hero, big numbers, lipped chips |
| `examples/media/look-kit/GOOD-Timeline-light-b1-read.png`, `GOOD-Chart-dark-b2-hemicycle.png` | humanities and maths components: dates, eras and seats read at a glance (more `GOOD-*` there per component) |
| `briefs/showcase/GOOD-SeedRaceScene-vital-force-dark-b1-on.png` | a DOM comparison board done well |
| `briefs/showcase/MEH-CrowdScene-reacts-dark-b3-run.png` | correct but weak: particles on a void, no apparatus |
| `briefs/showcase/ANTI-programmer-art-vs-good.png` | left half: everything to avoid; right half: the fix |

## Order of looking (context is the budget)

1. Read the text report `shoot` printed (canvas: overlap, off-canvas, small, contrast, empty centre; DOM: overlap, off-frame, small, contrast). It points at the shots worth opening.
2. Open the contact sheet `<Scene>-sheet.png` (every beat, both themes, half size) and the flagged single full-size shots in ONE response (parallel reads); in a 3-look pass that is the only viewing.

## Questions, per beat and theme

Walk every look-base rule and card rule, then:

1. Is anything clipped, overlapping or off-canvas, in EITHER theme?
2. Empty middle band: move or scale the hero into the hero zone (canvas: `ZONES.hero`; SVG/DOM: the stage middle; shoot prints the ink centre), never add decoration (plain: no setting unless the course names `casefile`). Before adding any drawing, check the stub's `Note card:` and `Not yet taught:`.
3. Readings in side cards, a chip for every label, chips at the edges, never on the evidence. Would it sit beside your look's anchors (Quill: the GOOD images above; plain: `packs/look/plain/SHOWCASE.md`)?
4. Glyph boxes: A box (tofu) or blank where a special glyph should be in a shot (the rupee sign, a tick, an arrow, a superscript, any non-Latin letter or symbol) is the screenshot browser's missing font, not a scene bug: never swap the glyph for words or CSS drawings, never add a replacement chip, and do not hunt fonts or kit source. If the character comes from `fmtINR`/`fmtNum` or another kit formatter, the source holds a backslash-u escape and there is nothing to check; otherwise, only when a box is visible, check the source holds the real character (a plain `grep` of the file). Log it once under `open:` (never `left -`) as `glyph box: <char>, harness font`.
5. Loop: shoot reads it AT the shot, before the 1.5 s idle park, so `loop running` on a static scene is expected. Parking is tested by check-scene's freeze probe, not here.
6. Geography: right silhouette for the landform (V vs U valley, meander, delta, fold) - compare with a real photo; vertical exaggeration and time named in chips; the same strata order and elevation ramp as the module's other scenes; India's border from the Survey of India layer with its credit. 3D: backdrop right in the light theme, chips not clipped or overlapping at any beat's camera shot, hero not cropped in portrait.
7. Humanities and maths: dates and durations read at a glance; order or cause visible without prose; seat, vote and money totals add up on screen; geometry labels off the lines; fractions stacked when the lesson stacks them; DOM boards checked in portrait. Maths stays flat: graph paper, no glow (both looks; plain's other subjects: flat paper, the chart's own gridlines).

## Do not over-argue

`shoot` saying 0 issues means no MEASURED overlap. A graze you cannot measure goes under `open:`: do not zoom, crop or argue it. Judge a defect in at most 3 lines, then fix it or log it.

## What to write (the design note's `## Look log`)

One line per round or pass, appended with `scene-pass.mjs ... look "<line>"` (never hand-edited): `round N (<shots viewed>): seen - <problems>; changed - <edits>; left - <...>` (verify's own look, 2 rounds) or `pass N (<images viewed>): seen - ...; changed - ...; left - ...` (3-look, see briefs/stage3-look.md). Anything still wrong at the end goes under `open:` with why it was left. Status is set only by `log-stage3.mjs`.

=== FILE: briefs/stage3-look.md ===
# Stage 3-look - One look PASS on one built scene

`Look: later` (START-HERE or the invocation) is for build and verify passes only. A look pass always shoots.

Target: `simulations/L0N/<Scene>.js` (the invocation's paths are relative to `courses/<Bundle>/`; the repo-root form is `courses/<Bundle>/simulations/L0N/<Scene>.js`; never ls or glob a shared directory), whose design note says `Status: look-pending` (built and checked, never viewed). You are ONE PASS of at most 3, each a fresh agent: at most ONE shoot, ONE view and ONE edit batch. Do not loop. The next pass verifies your edit with its own shoot.

**Cap.** A pass that fixes no named defect is the LAST pass: no defects, `changed - none`, or only `open:` items (under 3 px, zoom-only) closes `done`, never `look-pending`. Pass 2 is followed by pass 3 only when pass 2 fixed a named defect; pass 3 always closes `done`. log-stage3 `--look` enforces this (prints `CAP:` and sets `done`) and next.mjs never offers such a scene again. Whole-slide fit (scale in the real slide, page scroll, phone clipping) is not yours: `briefs/stage3-slides.md` judges it per lesson.

**Targets.** The invocation may name several scenes (`Targets:` and `Batch:`). Run this whole brief for ONE scene at a time, in the order given, and close it (its own close call with its own `--target`) before opening the next. Do not read a sibling's code or note, and do not carry findings from one scene to the next. A scene that fails or hits a cap is logged as that and the run continues with the next. Report one block per scene.

**Vision.** View the images yourself, in this session. If you cannot view images, stop now and report `LOOK: no vision` (change nothing). A subagent only if your harness gives you one that can see and you cannot: route it to a vision-capable model and give it the stub top block (Note card, Must get right, Per beat), `look-rubric.md`, at most 5 image paths (no crops) and this reply template: `MUST: <beat/theme: defect>`, `FIX: <edit>`, `NICE: <optional>`. No tool picks the model.

## Your pass number

Count the `pass N` lines in the note's `## Look log`; you are count + 1. Pass 1 starts your own round budget. Verify and build call their shoots "round N"; only a look run writes "pass N" (a "round N" line is not a pass, so do not count it).

## Read

1. `<Scene>.design.md` (what the scene shows per beat; the last `left -` line is what the previous pass found). Then the stub top block: `sed -n '1,/^## Verbatim/p' <stub>` (`Must get right:`, `Note card:` and `Not yet taught:` are fields there, then `## Per beat`). Note card and Not yet taught list what the scene leaves out: check them before adding any drawing. Then `node tools/sim-test/scene-info.mjs L0N/<Scene> --bundle <Bundle>` (slide text per beat).
2. `briefs/reference/look-rubric.md`: the text only. Open no image yet.
3. The scene `.js` and the guides (`briefs/reference/scene-rules.md`, the base-class guide from `briefs/stage3/INDEX.md`) only when step 5 needs them.

## Write-scope

`<Scene>.js`, `<Scene>.design.md`, the repo-root `build/` (scratch in `build/scratch/`, never under `courses/`). Not GENERATION-LOG.md (your report carries the text), the helper, the stub, the prose or other scenes (requests go in the note's `## Requests`).

## Procedure

1. **Shoot once.** `node tools/sim-test/shoot.mjs L0N/<Scene> --bundle <Bundle> --max-rounds 3` (pass 1 adds `--reset-rounds`). First `ls build/scratch/<Bundle>/ | grep <Scene>` (this scene only; never ls or glob a shared directory), then add `--steps=@build/scratch/<Bundle>/<Scene>-look-steps.json` if verify wrote it (use it as it is: never overwrite it, write your own under another name), else write your own for every state the note names (run, mid-run, dial extremes, celebration), all in this ONE run (a render deletes the scene's earlier shots). A step with no `wait` settles first, so a mid-run shot is a `wait` on the SAME step that starts the motion. A stub state that is missing from a shot is a defect: log it with its beat. Read no kit source in a look pass. Step keys (never run `--help`): canvas `{"beat":N}`, `{"ctrl":["id","v"]}`, `{"tap":[x,y]}`, `{"drag":[[x0,y0],[x1,y1]]}`, `{"wait":ms}`; a CONTROLS dial on any scene (canvas, DOM, SVG) `{"ctrl":["<id>","v"]}`; DOM `{"set":["<selector>",v]}`, `{"click":"<selector>"}` (`drive-dom.mjs ... --inputs` lists selectors); `"name":"<label>"` on a step shoots it (no `name`, no shot); confetti lasts about 1 s: `"wait": 150`. Landscape by default; `--portrait` shoots portrait INSTEAD of landscape: use it only when the last `left -` says portrait only, and then say landscape was not seen. No `--peek`.
2. **Read the text report** (overlap, small, contrast, off-frame, empty centre, loop). It names the beats and themes that need a closer look. `loop running` is read at the shot, before the 1.5 s idle park: fine on a static scene.
3. **View once.** ONE response with all the image reads in parallel: the contact sheet, the single shots the report flagged (at most 3), and in pass 1 one calibration image from the rubric table closest to this scene. At most 5 images in this pass, none after this step; "images viewed" in your log line is the number of images you opened (a contact sheet is one). No pixel scripts, crops or PNG decoding.
4. **Judge** with the rubric questions as a list: one line per beat x theme, at most ~10 lines of thought per fix. Write every defect down before touching code. A gap under 3 px, or a defect seen only by zooming: `open:`, not a fix. Something a closer look would settle but you did not open: `left -`. A `## Decisions` line that contradicts a stub `Must get right` line is a defect: fix the scene, record it under `## Deviations`. A line under `## Checks explained` is a claim, not a verdict: the shot wins, and a clipped or hidden reading is a defect even if an earlier pass explained it.
5. **Edit once.** All the fixes in one batch (small edits, no rewrite), then one `node tools/sim-test/ident-lint.mjs <file>`, then `node tools/sim-test/check-scene.mjs L0N/<Scene> --bundle <Bundle>` (PASS needed). A lint or check failure: fix just that. No defects: make no edit. After the edit you may run `shoot.mjs ... --report-only` once (text only, no images, no round used) and fix what it reports. No second shoot, no more images, no peek.
6. **Close**, ONE Bash call joining both commands with `&&` on one line, `<scene-pass look command> && <log-stage3 command>` (never hand-edit Status). The output prints the Status and the LOG TEXT: do not re-read the note afterwards.
   - `node tools/staged-generation/scene-pass.mjs --bundle <Bundle> --target L0N/<Scene> look "pass N (<images viewed>): seen - <defects>; changed - <edits>; left - <still wrong, or none>"`
   - `node tools/staged-generation/log-stage3.mjs --bundle <Bundle> --target L0N/<Scene> --model "<name>" --what "look: <what changed over the passes>; open: <...>" --status done|look-pending --look --no-log` (prints LOG TEXT).
   - `done`: no defects, `changed - none`, nothing left, only `open:` items (under 3 px, zoom-only), or you are pass 3; leftovers under `open:` (and `## Requests` if not yours to fix). An edit you made this pass is unseen until the next shoot: after any drawing or layout edit close `look-pending` (the operator may run another pass or accept it). `--report-only` measures text overlap only, never clipping or colour. log-stage3 prints a WARN if you close `done` with a `left -` item; it does not refuse, so say it in `--flags`.
   - `look-pending`: only after an edit that fixed a named defect (the next pass checks it), and only in pass 1 or 2. Never for a clean pass.

Report (START-HERE.md section 3), terse: `PASS N`, defects seen and fixed, what is left, the check-scene PASS line, then `LOG TEXT:` and the section log-stage3 printed (`done`), or `LOG TEXT: none` and last line `NEXT: pass N+1 in a fresh session` (`look-pending`).

=== BUNDLE INFO ===
bundle stage3-look, sha256 3ba30cf39fb98abb. GENERATED by tools/staged-generation/build-bundles.mjs from:
- START-HERE.md (11478 chars)
- docs/look-base.md (1699 chars)
- packs/look/quill/CARD.md (1556 chars)
- briefs/reference/look-rubric.md (5198 chars)
- briefs/stage3-look.md (7932 chars)
Do not edit: change the sources and rebuild. Everything above is the full text of those sources; do not open them again.
