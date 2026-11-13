# Stage 2 - One lesson: blocks, questions, lesson file, scene stubs

Target: one lesson, `L0N`. Output: `courses/<Bundle>/blocks/L0N/`, `questions/L0N/`, `lessons/les-0N.json`, one stub per scene under `simulations/L0N/`, a log section.

If the invocation has `Only: arcade slide(s) aNN` the lesson already exists: this is a top-up. Do only step 0 for those slides and step 5 (add the block(s), the prose line, the stub(s) and the lesson-file entries in the order the outline gives - after the `s` slide it names), plus a `## Stage 2 - L0N (arcade top-up)` log section. Read only what those steps need (this brief's step 0, `docs/arcade-games.md`, `briefs/reference/stub-format.md`, your outline slice); touch no other block, question or stub. If the lesson file is `human-approved`, set its `authoring.status` back to `ai-draft` when you add a slide. Never change the `authoring` block of an existing file.

## Read

1. `AGENTS.md` (skip if your harness already loaded it) and `.agents/skills/content-authoring/SKILL.md`, both in full (schema, types, layout, numbering).
2. `docs/voice-and-tone.md` and `docs/pedagogy.md` in full.
3. `node tools/doc-section.mjs docs/generation-playbook.md "3. Write the block" "4. Write the question" "5. Write the lesson"`.
4. `node tools/doc-section.mjs docs/simulation-authoring.md "Static images per beat" "smell" "4. Attaching"` and `briefs/reference/stub-format.md`.
5. Your slice of the outline: `node tools/doc-section.mjs courses/<Bundle>/OUTLINE.md "<L0N> -"` (multi-part bundle: `courses/<Bundle>/parts/<NN>/OUTLINE.md`, `<NN>` = first segment of the lesson code) plus the outline's opening conventions (`--list`, then the sections above the first lesson). Ignore other lessons.
6. Only the FIGURES.md entries your slides reference: `node tools/doc-section.mjs courses/<Bundle>/FIGURES.md "<label>"`. Open a page image only when an entry lacks a detail you need; then add that detail to FIGURES.md and log it.
7. `docs/numericals.md` in full (worked calculations, emphasis, affordance; required under plain or college).
8. A chapter with hard names or terms: `docs/glossary.md` (AGENTS.md rule 15). Descriptive questions: `docs/descriptive-questions-and-cbse-marks.md`.

## Write-scope

This lesson's blocks, questions, explanations, lesson file, `simulations/L0N/*.stub.md`, `media/L0N/`, GENERATION-LOG.md, FIGURES.md (adding a missing detail only), `glossary.json` (adding this lesson's terms only; create it if absent, `docs/glossary.md`), `build/`. No scene code, no other lesson, no module file.

## Procedure

0. An arcade slide (`practice`, id `aNN` in the outline; block `blk-l0N-aNN`, placed in the lesson after the `s` slide the outline puts it after): a `content-block@1` whose prose is ONE short line (the game explains itself), `simulation: { src, position: "below" }`, one stub in the arcade format (stub-format.md). Its deck is a data file; the first arcade slide of the chapter names it `simulations/<lesson>/<Chapter>Deck.js` as the stub's `Shared helper:`, later games reuse it.
1. Blocks, in slide order, as OUTLINE.md says (roles, predict/verdict pairs, the one mini-game). The game slide is a `mini-game@1` block - top-level `src`, optional `objective`/`xp`, no prose (SKILL.md) - never a content-block holding a game scene; its setup text goes on the slide before. Prose in sibling `.md` files (`markdownRef`/`promptRef`). Every block `"authoring": { "status": "ai-draft" }`. A deferred predict hands its verdict to the very next block (SKILL.md).
2. Questions, then the lesson file last (so no question is left unreferenced). A lesson mount does not shuffle options, so vary where the correct `mcq-single@2` option sits (1st to 4th, roughly evenly; never mostly 1st or 2nd) and make the wrong options equally plausible and similar in length; `node tools/staged-generation/question-mix.mjs <Bundle>` shows the spread.
3. Every block that shows a scene gets its real `"simulation": { "src": "simulations/L0N/<Scene>.js", "position": ... }` now (a `mini-game@1` block: `"src"`), even though the scene is not written yet.
3a. A slide whose outline line names a `figure` field: write it per docs/figures.md (layout, caption, 2-6 items, `step` per item matching the beats, at most 3 notes). Never draw a flow or panels with `diagram`; lesson-check warns. A `figure.renderer` slide follows docs/renderers.md; run `renderer-lint`. Check the library first (`add-renderer.mjs --list`); add a fit with `add-renderer.mjs`, write a new renderer only when none fits.
4. One stub per scene (briefs/reference/stub-format.md). Write the slide prose FIRST, then the stub with its header lines (Save path, Attached by, Base class) and Beats left to fill; then run `node tools/sim-test/scene-info.mjs L0N --bundle <Bundle>` (it lists scenes by stub, so the stub must exist) for the real beat counts, and complete the stub's Beats and Per beat from them. For a count before any stub exists, count the STEP markers in the slide's markdown. Decide the base class (and `Component:`) from the content with the table in `briefs/reference/stub-format.md` ("Choosing the base class"), not by habit. A scene reused from an earlier lesson needs no new stub. A scene on two or more slides: follow stub-format.md's multi-slide rule (per-slide Per beat lists, `Beat maps:` or `Same beats on all slides: yes`, or variant files) - lesson-check fails it otherwise. Reusing a scene an EARLIER lesson owns: the moment your block points at it, that owner's stub must declare your mount; lesson-check runs the gate on it and names the fix. You may amend that one stub for this (never its design or prose). If the counts cannot be told apart, or the two mounts play by different rules, add a variant file in YOUR lesson's folder (`<Scene>-<context>`) instead and leave the owner alone. Do not change a slide's prose to make beat counts differ; that is a workaround - use variants. For a generic mechanism (particles, a number line, a lever, a graph of a standard law; not a story- or cast-bound scene) run `node tools/find-scene.mjs "<what it shows>"` once: if a hit fits, add the header line `Copy-from: <id>` (`Reuse:` keeps its meaning: something in THIS bundle); no fit: no line.
4a. **Stub self-check**, for each stub, before step 5 (stubs that contradict their slide cost the Stage 3 agent long deliberation, and it then builds one reading silently). Good shape: `briefs/showcase/EXAMPLE-stub.md`. Check, and fix the stub:
   - Counts: every number of things the stub names ("five names", "three chips", "four rows") equals the count in the stub's verbatim slide text and in `Per beat`. Count them; do not trust memory.
   - Arithmetic: every ratio or reading the stub says will appear ("four times as large", "exactly 27 m") is recomputed from the stub's own inputs (a 3-line `node -e`).
   - No contradiction inside the stub: search Hero, Dials and Per beat for a control that is both "draggable" and "fixed", something both shown and "not yet taught", a beat count that differs between fields.
   - Dials carry numbers (range, step, default); each `Must get right` item says where it comes from (`slide` or `derived`) and how a test would see it (`Check: ...`).
   - Necessity: the stub's Hero, Dials and Run shows deliver the outline line's `Shows:`. A plain or college stub whose only move is tap-to-open and whose `Run shows:` is none is decoration (lesson-check WARNs): give the learner a move that changes a quantity, or make the slide Text only and log it.
   - Affordance: the `Dials:` line names how each control looks (button with a pressed state, slider with its value, chip in the sentence) and the prompt that says the move (`docs/numericals.md` 4).
   - Last, one line before `## Per beat`: `Self-check: counts ok, arithmetic ok, no contradictions` (or what you fixed). Something you cannot settle: `Open question: ...` in the stub, so the Stage 3 agent sees it first.
5. `node tools/staged-generation/lesson-check.mjs <Bundle> L0N` until PASS. The stub's `## Verbatim slide markdown` copies must equal the prose files: do not write a generator script for them, run the check with `--fix-verbatim` after any prose edit (it re-copies them). Slide count: the outline's plan, plus one briefing block per game (a `mini-game@1` block carries no prose), plus any slide you log a reason for.
6. Log under `## Stage 2 - L0N`: `Model:` line, deviations from OUTLINE.md and why, any slide with neither scene nor image and why, details added to FIGURES.md.

## Writing the prose

- The slide prose carries the explanation; the scene only labels. Name the wrong idea before the right one where the outline sets up a dead end.
- Cast: if the manifest has `cast`, every spoken line of a cast member gets `<!-- SAY id [mood] -->` above its paragraph, bubble text without quote marks or `says X` tags, and narration BEFORE a SAY inside a STEP beat (a beat opened by SAY is all one bubble). Written words, learner lines and test text stay narration. Full rules: `docs/voice-and-tone.md` (Character speech).
- Beats: one idea per beat; `<!-- STEP -->` markers give exact control. A beat where the learner acts says what to do.
- Reader: for a non-school audience, its card (packs/audience/<id>/CARD.md) sets the reader and limits, not this line. School audience: Indian class 9-12 students, English often a second language. Plain common words, no idiom or figure of speech, no teasing ("leave that for later"), Indian everyday examples. Connect sentences with because/so/but; never 3+ very short sentences in a row. Full rules: `docs/voice-and-tone.md` (Reader, Staccato). Run `node tools/prose-lint.mjs --bundle <Bundle> --lesson L0N` and fix its warnings.
- Clarity beats brevity: give the full explanation a first-time learner needs; split long explanations over beats, never cut them (`docs/pedagogy.md`).
- Emphasis: each slide's key sentence gets one device (pull quote, takeaway, table, worked steps; `docs/numericals.md` 3), never buried in a paragraph. A `Text only` outline slide uses the device its line names. A number is worked in rows with its formula and gloss (`docs/numericals.md` 2).
- Under plain or college: no game, play, level, score, badge or challenge wording in prose, titles, `objective` or the game briefing slide (say exercise, task, practice; `docs/mini-games.md` "Exercise, not game"). prose-lint flags them.
- Never copy textbook sentences; the source's numbers belong in questions, not prose (AGENTS.md rule 4; `bundle.json` `sourceOwned`: see `docs/copyright-and-sourcing.md`).
- Narrated course (OUTLINE `Narration: narrated`): define each new term in the prose where it is first used, with this slide's numbers (the glossary alone is not enough); show where every number on screen comes from; every button label says its effect; check each invented name for a misleading everyday meaning (a plastics plant "reactor" was heard as nuclear). Each stub gets its `Narration:` line (stub-format.md). `docs/narration.md` 2a, 13.
- Nothing from a later lesson (rule 7): re-read your slides in order once before finishing.

## Done means

- [ ] lesson-check PASSES (validate, stubs, scene paths).
- [ ] Every scene slide has `simulation.src` and a stub with REAL beats; every stub's last line is `Shared helper: ...`.
- [ ] Log section written with `Model:`.

Report (START-HERE.md section 3) plus: slides, questions and stubs written (from lesson-check), deviations from the outline, and judgment calls the outline left to you.
