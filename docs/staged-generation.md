# Staged Generation - Splitting a Chapter Across Fresh-Context Runs

`docs/generation-playbook.md`'s 8 steps as one continuous agent session can run its context very large by the time simulations get written. This doc splits it into 5 passes (Stages 1a, 1b, 2-4 below), each meant to run as a **separate agent invocation with no memory of the others** - state passes only through files on disk. Trial-run against a full grade-9 civics chapter; the cross-mount rule in `docs/simulation-authoring.md` and the shared-helper note in Stage 3 below both came out of real failures/near-misses in that trial, not theory. `docs/question-bank-generation.md`'s bank track (Stages B1-B3, see below) is split the same way.

Stage 1 (playbook steps 1-2) is itself split in two, for a different reason
than the rest of the split: not context size, but **model capability**. A
model that reads diagrams/photos/graphs well (a vision-capable model) is
often weak at module-level pedagogy - mystery framing, causal chaining,
law-driven slide roles (`docs/pedagogy.md`) - and a model that's strong at
the latter can have weak or no image-inspection ability, or spends it
inefficiently interleaved with outline reasoning. Stage 1a and Stage 1b are
built so each can be routed to whichever model actually suits it, with
`FIGURES.md` as the file that crosses between them - Stage 1b is written to
never need to re-open the source image; everything it needs from a figure has
to already be in `FIGURES.md`.

**How a run starts.** `tools/staged-generation/next.mjs` scans the bundle on disk and prints one line to paste into a fresh session: `Read START-HERE.md and follow it. Stage: 2. Bundle: <b>. Target: L03.` `START-HERE.md` holds the rules for every stage (never commit, write-scope, context budget, checks, report) and routes to the stage's brief, `briefs/<stage>.md`: what to read and when, the write-scope, the procedure, the check that must pass, the hard stop and the report. Edit the briefs, not this doc, to change what agents do. `next.mjs` never spawns an agent; `tools/staged-generation/auto-run.mjs` is the opt-in exception (Claude Code `-p`), and `--units`/`orchestrate.mjs` hand the same invocations to a live session's subagents (`--only` phases, `--auto` full-auto, `--status`, `--park`, `release-scenes.mjs`, first line `ORCH-STATUS: ...`; `auto-run.mjs` is stale) - see `tools/staged-generation/README.md`.

**Context budget.** Every stage is sized for a 200K-token window, not a 1M one. A full weak-model scene run (`docs/sprints/wip/staged-generation-briefs-and-scene-pass-port.md` Part F in the engine repo) reached ~250K tokens of text plus 61 screenshots for 3 scenes; 43% was the model's own reasoning (one block designed all three scenes at once), 13% an 80 KB brief, 11% whole-file rewrites, 8% kit source read to learn an API. Hence: short briefs with reference files opened at a named step; docs read by section (`tools/doc-section.mjs`); APIs from `tools/sim-test/kit-api.mjs`; design written to a file before code; one scene per run; a text report and a contact sheet before any single screenshot; tools that print their own defaults so nobody reads tool source; a cap on polish rounds.

## Stage 1a - Source scan (playbook step 1)

One run per chapter. Input: the chapter source only (PDF, rasterized where
needed). Output: `courses/<bundle>/FIGURES.md` + start of
`GENERATION-LOG.md` under a `## Stage 1a - Source scan` heading (recording
which model ran it - see below). No slide list, no lesson boundaries, no
pedagogy decisions of any kind - this pass only records what the source page
shows, so a model chosen for image-reading strength rather than open-ended
design still does it reliably.

**`FIGURES.md`** is the fix for a real failure mode: without it, a later
pass (Stage 1b, or Stage 2) has nothing but a log line saying a page was
looked at, not what was found there - so it reopens the rasterized image
itself, once per lesson, to get a number or a diagram's layout it needs for
content it's writing. `FIGURES.md` is a durable, per-figure note (format in
`AGENTS.md` rule 8, worked example in `examples/FIGURES.md`) written once,
during the only pass that has eyes on the source image, so every later
stage/pass works from the note instead of re-deriving it. It lives under
`courses/<bundle>/` next to `OUTLINE.md`/`GENERATION-LOG.md`, not `build/` -
like those two, it's a working file (not published content, no `blockRef`)
that still needs to persist for the bundle's whole lifetime, not ephemeral
tool output. Stage 1a leaves each entry's `Used by:` line as `TBD` - it runs
before any slide exists to reference it; Stage 1b backfills that line.

Because Stage 1b can't check Stage 1a's reading against the image, Stage 1a's
prompt limits what `FIGURES.md` may contain: describe what the figure shows
(including the order of labelled points along a curve), don't restate body-text
derivations, don't solve exercises or fill blank table cells, tag anything it
computed itself `[derived]`, and raise a "textbook error" only as a
`Flag (unverified - needs human check)` line after re-viewing the region
enlarged. A human should check those flags before Stage 1b's output is relied on
- a wrong one (a misread layout) otherwise ends up as mandatory scene content.

**Stop after FIGURES.md + GENERATION-LOG.md.** Do not draft an outline or
write any lesson/block/question/module JSON or any simulation code.

## Stage 1b - Outline (playbook step 2)

One run per chapter, after Stage 1a. Input: the chapter's own text (may open
the source directly for prose/wording/worked examples) plus Stage 1a's
`FIGURES.md` - **never the raw source image**; a slide that seems to need a
figure `FIGURES.md` doesn't cover is logged as a gap (`## Stage 1b gaps in
FIGURES.md` in `GENERATION-LOG.md`) for a follow-up Stage 1a run, not worked
around by guessing at the image. Output: `courses/<bundle>/OUTLINE.md`, plus
a `## Stage 1b - Outline` heading appended to `GENERATION-LOG.md` (again
recording which model ran it). Per slide: POE role, and an explicit
simulation/image/neither call (with reason if neither) - decide now, not
later, per `docs/pedagogy.md`'s laws. Also backfills each used figure's
`Used by:` line in `FIGURES.md`.

Because Stage 1a and Stage 1b can run on two different models, **each stage's
`GENERATION-LOG.md` heading must start with a `Model: <name>` line** - this is
what lets a reviewer (human or agent) work out afterward which model produced
which file, and judge each pass on the thing it was actually responsible for
(figure fidelity for 1a, pedagogy for 1b) rather than conflating the two.

Stage 1b reads `briefs/reference/engine-capabilities.md` (what blocks, scenes
and games can do, with the doc to grep before claiming a limitation) and
`docs/mini-games.md`, treats unverified Stage 1a flags as unverified (design the
slide to be right either way; list them in the log under `## Unverified Stage 1a
flags carried forward`), and takes every count from
`tools/staged-generation/outline-lint.mjs`, which also checks the OUTLINE.md
format and backfills FIGURES.md's `Used by:` lines (`--backfill`). Stage 1a's
check is `tools/staged-generation/figures-lint.mjs --stage 1a`. The agent writes its own `Model:` line.

A chapter with no load-bearing figures still gets a (near-empty) Stage 1a
pass before Stage 1b - `next.mjs`'s state detection is what a bundle with no
`FIGURES.md` yet means, not something to skip by hand.

**Stop after OUTLINE.md is written and GENERATION-LOG.md is updated.** Do not
write any lesson/block/question/module JSON or any simulation code.

## Stage 2 - Lesson (playbook steps 3-5, one lesson at a time)

One run per lesson, given only that lesson's OUTLINE.md slice. Output: that lesson's blocks, questions, `lessons/les-NN.json`, plus a **stub** (not code) for each new simulation. Skip the module file (step 6) - that composes the whole chapter, do it only once every lesson exists.

Stub file: `simulations/L0N/<SceneName>.stub.md`, next to where the real scene will go, in the format of `briefs/reference/stub-format.md`: save path, attaching block ids and roles, the REAL beat count (`tools/sim-test/scene-info.mjs` - stub counts written from memory were wrong in 516 of 728 stubs in one course), base class, hero, dials, what a run shows, note card, facts to get right, words not yet taught, reuse, a per-beat plan and the verbatim slide markdown; last line `Shared helper: <file>.js | none`. The Stage 3 agent reads the stub and the slide prose and nothing else of the lesson, so the stub carries every decision. Check: `tools/staged-generation/lesson-check.mjs <bundle> L0N` (validation, stub form, beats, scene paths).

Still set each block's real `"simulation": { "src", "position" }` field per `docs/simulation-authoring.md` section 4 - the stub is a side note for the next agent, not a replacement.

**Stop after lesson/block/question files + stubs, all validated.** Do not write any `.js` scene code, do not touch other lessons, do not write the module file.

## Stage 3 - Simulation (one scene per run, parallelizable)

One run per scene. The run writes `simulations/L0N/<Scene>.design.md` FIRST (beat table, layout, model numbers, how it comes to rest, a plausibility line per process shown, `Status: building`), then the scene, beat by beat, checking as it goes (`tools/sim-test/ident-lint.mjs`, then `tools/sim-test/check-scene.mjs`: every gate in one command - lint, reserved names, come-to-rest, sanity/draw at the real beat counts, beat-check, freeze probe, resume probe, real-browser text report). A run that can view images then looks (`tools/sim-test/shoot.mjs`: text report, contact sheet, then single shots) for at most 3 rounds and sets `Status: done`; one that cannot sets `Status: look-pending`, and `next.mjs` offers a separate `3-look` run for a vision-capable model. The design note is the state `next.mjs` reads: `building` is not offered again (delete the note to release a crashed run, or after checking that no agent is live pass `--force-rebuild` / `--force-scene <lesson/scene substring>` to `next.mjs` or `orchestrate.mjs` to re-offer building scenes once; the new run rewrites the note).

Stubs sharing a `Shared helper:` line: the first one's run also writes the helper (and says `Writes helper:` on its note); the others are offered once that run is no longer building, told to import the helper and not edit it - so exactly one run ever writes a shared file, and the rest run in parallel.

**Stop after that scene passes check-scene and its note says `done` or `look-pending`.** Do not touch any other scene, block or stub.

**Look cap.** Stage 3 polish once re-checked one scene dozens of times with nothing found. Rules: a look pass (verify's look or a 3-look pass) that finds no defect, changes nothing, or only logs `open:` items (under 3 px, zoom-only) closes `done`; a scene gets at most 2 look passes unless pass 2 fixed a named defect, and pass 3 always closes. Enforced by tool for 3-look passes: `log-stage3.mjs --look` turns a `look-pending` close into `done` (prints `CAP:`) when the last `pass N` line says `changed - none` or 3 passes ran, and `next.mjs` counts such a `look-pending` note as done (one stderr `look cap:` line), both via `tools/staged-generation/lib/lookCap.mjs`. Brief only: whether a pass truly found no defect (the agent writes `changed - none`), and verify closing `done` after a clean round 1.

## Stage 3-slides - Whole-slide review (one run per lesson)

A look pass judges one scene alone; nobody judged the slide the learner sees (scene + prose + header + footer), so scenes shipped at 0.77-0.89 of design size, with controls cut on phones. After EVERY scene of a lesson is `done`, one fresh vision-capable run follows `briefs/stage3-slides.md`: `tools/operator/slide-shots.mjs --bundle <b> --lesson les-0N` exports the lesson standalone (engine checkout found like `preview.mjs`, or `--export-dir`), shoots every slide x beat at 1280x800 and 390x844 in light and dark, measures stage scale, page scroll, clipped controls, Check button position, smallest rendered text and duplicated titles, and prints grouped FAIL lines plus a contact sheet. The reviewer views at most 8 images, writes a per-slide PASS/FAIL table with the owner of each fix (scene, prose, block, kit), edits only trivial layout constants in scene files, files the rest under the scene note's `## Requests`, and logs `## Stage 3-slides - L0N`. `next.mjs` does not schedule it (brief only): the operator runs it per lesson by hand (`Stage: 3-slides. Bundle: <b>. Target: L0N.`).

Two format requirements exist so `next.mjs` can parse state reliably: Stage 1b's `OUTLINE.md` ends with `## Lesson list`, one line per lesson, exactly `- L0N - <title> (<N> slides)`; every Stage 2 stub ends with `Shared helper: <filename>.js` or `Shared helper: none`.

## Stage 4 - Module & export (playbook steps 6-8)

One run per chapter, after every lesson and stub is done. Output: `courses/<bundle>/modules/<bundle>.json` (playbook step 6), then validate everything (step 7) - `node validators/validate.mjs` over every lesson/question/module file, fixing every error, plus one manual end-to-end re-read for a forward-reference or an unjustified missing-simulation slide (the validator can't catch either), plus a text-only `slide-shots.mjs` run per lesson whose PASS/FAIL line goes in the log as `3-slides:` (a FAIL is listed for the operator, not fixed in Stage 4).

**Stop after validation is clean.** The export step (playbook step 8, `node tools/export-course.mjs <bundle> <dest>`) doesn't need an agent - run it directly, or via `next.mjs --run-export <dest>`, which validates and exports in one call.

## Multi-part bundles (a course of several books)

One chapter fits a 200K window; a whole course does not (hundreds of lessons). Split the bundle into PARTS, one per book or volume: `courses/<bundle>/parts/<NN>/` (NN = two digits) holds that part's `OUTLINE.md` and `FIGURES.md` (and optionally `source/`). Lessons are coded `L<NN>-<module>-<lesson>`, e.g. `L03-07-01`; every name derived from the code follows (`les-03-07-01.json`, `blocks/L03-07-01/blk-l03-07-01-s01.json`, `simulations/L03-07-01/`). Modules are `modules/mod-<NN>-*.json`. Everything else stays bundle-wide - blocks, questions, lessons, `media/`, `simulations/` including `simulations/shared/` and cross-lesson helpers - so scenes and drawing kits are shared across parts exactly as across lessons, with no engine change. A bundle with no `parts/` folder behaves exactly as before.

- `next.mjs` walks the parts in order and offers the first part that is not done (a part is done when any `modules/mod-<NN>-*.json` exists); `--part <NN>` pins one. Stage 1a/1b/4 prompts carry `Part: NN`; Stage 2/3 prompts name a lesson or scene whose code already says the part. `orchestrate.mjs`, `auto-run.mjs`, `audit.mjs` follow the same rule.
- `outline-lint.mjs` and `figures-lint.mjs` take `--part <NN>` (without it, every part in turn). `lesson-check.mjs` takes the long code and reads the part's outline itself.
- A lesson in `parts/<NN>/OUTLINE.md` must be coded `L<NN>-...`. "taught by" and arcade rules compare lesson codes in course order.
- Mount counts: a scene reused on slides with different beat counts still needs variant files or BEAT_MAPS, part or not.

## Bank track (independent of the lesson stages above)

`docs/question-bank-generation.md`'s 7 steps, split into 3 stages. Genuinely
**independent** of Stages 1a-4, not sequenced after them - only reads/writes
`BANK-PLAN.md`, `questions/bank/*.json`, `explanations/bank/*.json`,
`banks/*.json`, never `OUTLINE.md`/`lessons/*.json`/`simulations/L0N/`. Run
via `node tools/staged-generation/next.mjs --bank` (every other flag works
the same); omitting `--bank` leaves the lesson track unaffected. This is
what lets a bank run standalone (no lessons needed, chapter source or
source + an existing `FIGURES.md`) or interleaved with lesson-track passes
in the same session, in any order.

**Stage B1 - Plan** (steps 1-2.5). One run per bank, covering every source
chapter it draws from - per-topic coverage rules and the coverage matrix are
in `docs/question-bank-generation.md`'s Plan step, not restated here.
Output: `BANK-PLAN.md` (matrix, then a `## Question list` section, one line
per planned question, exactly `- <id> - <type> - <topicId> - <difficulty>`,
same hard-format spirit as `OUTLINE.md`'s `## Lesson list`, matching the
matrix row-for-row) - plus `FIGURES.md`/`GENERATION-LOG.md` if no prior
lesson run to reuse. **Stop after `BANK-PLAN.md`.** Do not write question
JSON or the bank index.

**Stage B2 - Questions** (steps 3-4, a batch per pass - why not one question
or the whole plan at once is in `docs/question-bank-generation.md`'s Write-
question-files step). Output: `questions/bank/<id>.json` for each question in
the next batch, plus a mandatory, machine-enforced `explanations/bank/
*.json` `explanationSlide` for any `hard`/`olympiad` question in it (web
search first for `olympiad`, logged in `GENERATION-LOG.md`). `next.mjs`
computes the batch from consecutive same-`topicId` runs up to
`--bank-batch-size` (default 15), never splitting a topic across batches.
**Stop once the batch's questions all have their file, validated.** Do not
touch the bank index or any question outside this batch.

**Stage B3 - Assemble** (steps 5-6). One run per bank, after every planned
question has its file. Output: `banks/bank-<bundle>.json` - `chapterId`/
`chapterIds` only if confidently known, otherwise left unset for a human
reviewer via authoring-app (`docs/question-bank-generation.md`'s Assemble
step) - then validate everything. **Stop after validation is clean.**
Export (step 7) needs no agent - same `tools/export-course.mjs`/
`next.mjs --run-export` as the lesson track; `banks/` is picked up
automatically.

## Getting each stage's invocation

Run `node tools/staged-generation/next.mjs` (add `--bank` for the Bank track, `--list` for every run that can start now) and paste the line it prints into a fresh session (Claude Code, Antigravity, opencode, or similar). By hand, the same line works: `Read START-HERE.md and follow it. Stage: <1a|1b|2|3|3-look|3-slides|4|B1|B2|B3>. Bundle: <id>. Target: <L0N | simulations/L0N/<Scene>.stub.md | ...>.` Each brief states what to read, what to produce, what not to touch and the check that must pass; a run without a hard stop reliably drifts into the next stage. Stage 1a and 1b are separate runs precisely so they can go to two different models.
