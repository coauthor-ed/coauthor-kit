# Stage N - Narration: one lesson's teacher script, cues and scene tags

Target: one lesson, `L0N`, of a course whose OUTLINE header says `Narration: narrated` (or the invocation says narrate it). Run it after the lesson's scenes are all `done` and Stage 3-slides passed: narration follows final prose and final scenes. Output: `courses/<Bundle>/narration/les-0N.script.json`, cue and focus code in this lesson's scenes, `narrationCover` entries on its blocks, `IMAGE-PROMPTS.md` lines, `narration/lexicon*.json` lines, a log section. No audio unless the invocation says `Audio: build`.

## Read

1. `docs/narration.md` in full. It is the judge; every rule below points into it. Then `examples/narration/README.md`: one predict with a cover and one cued scene, annotated line by line.
2. `lessons/les-0N.json` (slide order), then per slide its prose (`.md`) and block JSON. Run `node tools/sim-test/scene-info.mjs L0N --bundle <Bundle>`: the REAL beats of every scene slide and their first words.
3. Per scene: the header comment and the design note's Beats table only (what each beat shows, what the learner can do, `Completion:` if any). Open the code only to add cues and tags.
4. `glossary.json` term list, and the earlier lessons' scripts only to see which terms were already defined aloud (narration-lint `--all` lists them).

## Write-scope

`narration/les-0N.script.json`, `narration/lexicon.json` and `lexicon.<voice>.json` (add only), this lesson's scene `.js` files (cue code, `data-narr` tags, `narrationFocus`, `interactDone`, header comment; never a change to what a beat shows in text mode), this lesson's block JSON (`narrationCover` only), the lesson file (`narrationRef` only), `IMAGE-PROMPTS.md` (append), `build/`, the log via `tools/log.mjs`. Never prose `.md`, questions, stubs, other lessons, kit files. A prose problem the voice cannot work around (a term the slide never defines, a number with no derivation): one line in the report, and say it right in the `say`.

## Script format

```
{ "format": "coauthor-narration-script@1",
  "voices": [ { "id": "andrew", "label": "Andrew", "name": "en-US-AndrewMultilingualNeural", "rate": "-2%", "pitch": "-2Hz" },
              { "id": "neerja", "label": "Neerja", "name": "en-IN-NeerjaExpressiveNeural", "rate": "+0%", "pitch": "+0Hz" } ],
  "segments": [
    { "block": "blk-l02-s01", "step": "b1", "say": "Eight young women in Boston [[focus.cases]] had the same rare cancer ..." },
    { "block": "blk-l02-s02", "step": "b3", "say": "... Now try each value yourself.", "await": "interact", "hint": "Try each value of k.", "free": true },
    { "block": "q-l02-s03", "step": "prompt", "say": "... Which reading is fairest?" } ] }
```
`step`: a STEP id, `b<N>` (beat N from 1) or `prompt` (question, predict). Optional per segment: `await` (`interact`), `hint`, `free` | `closed`, `noScreenRef`. Voices: copy the course's choice (the COURSE-BRIEF says one or two); one voice = a `voice` object instead.

## Procedure

1. **Plan the lesson aloud** (in `build/scratch/<Bundle>/narr-L0N.md`, not in thinking): per slide and beat, one line: what is on screen at the first word, what the voice says (gist), what lights at which word, which move the teacher demonstrates, where the learner acts and which wait kind (`docs/narration.md` 6), first-spoken terms and their definitions, numbers to derive.
2. **Scenes first.** For each scene slide: extend `withNarrationCues` (kit `SimNarration.js`) if the voice demonstrates a move; add `static CUES` + `applyCue`/`cueBase`/`cueReset`; tag every part the voice names with `data-narr` (each cell, margin, total, group, legend part), `data-narr-hide` on parts never spoken; `interactDone` only from an end-of-gesture learner change; header lines `Cues:`, `Completion:`, `Narration focus ids:`. Text mode must look exactly as before. Then `node --check`, `node tools/sim-test/ident-lint.mjs <file>` and `node tools/sim-test/check-scene.mjs L0N/<Scene> --bundle <Bundle> --no-browser --no-probes`: 0 FAIL.
3. **Openers.** Each slide's first beat: scene on screen dimmed from the first word (`focus.` cues). A lesson opener, predict prompt or prologue the scene cannot show: a `narrationCover` (`docs/narration.md` 8b) on an image the course already has, else one new line in `IMAGE-PROMPTS.md` (`<file name> - used by L0N s0M b1 - <prompt>`) and no cover yet (log it).
4. **Write the script.** Teacher voice (2, 2a), headings never (3), every pointing word cued or waited (4), questions (7), tables and figures (8, 8a), numbers and symbols in words (9). One idea per beat; 20-60 s. Respell new names in `lexicon.json` now.
5. **Lint.** `node tools/narration-lint.mjs --bundle <Bundle> L0N` until PASS; fix every WARN or explain it in one line in the log; check each TERMS note (defined aloud, or defined earlier). Re-run step 2's checks on any scene you touched again.
6. **Lesson file.** `"narrationRef": "narration/les-0N.narration.json"` on the lesson; `node validators/validate.mjs lessons/les-0N.json`.
7. **Audio** only with `Audio: build` in the invocation: from the engine repo, `python3 tools/narration/build-narration.py <bundleDir> lessons/les-0N.json`, then `node tools/narration/check-narration.mjs <bundleDir> lessons/les-0N.json`: 0 problems. Otherwise end with the two lines the operator runs (in the report). The operator checks the audio prerequisites with `node tools/operator/doctor.mjs --narration [--install]`; agents never run tools/operator.
8. **Log** `node tools/log.mjs add --bundle <Bundle> --stage N --lesson L0N --model "<name>" "<text>"`: beats, waits (closed / exploration), covers used and images requested, terms defined aloud, opt-outs with reasons, prose problems found.

## Done means

- [ ] narration-lint PASS; every WARN fixed or logged.
- [ ] Every scene touched: check-scene 0 FAIL, text mode unchanged.
- [ ] Every wait is the right kind; every named part lights; no beat opens on words alone (or its image is requested).
- [ ] `narrationRef` set and the lesson validates. Log written.

Report (START-HERE.md section 3) plus: beats and minutes (words / 150), waits by kind, covers and image requests, terms defined aloud, and the operator's audio commands if not built.
