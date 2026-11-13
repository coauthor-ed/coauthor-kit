# Narration showcase (copy this shape)

Two slides from analytical-epidemiology (owner-reviewed 2026-11), as a tiny bundle. Rules: `docs/narration.md`. Check it: `node tools/narration-lint.mjs --bundle examples/narration L01`. No audio here: the operator builds it.

## Slide 1: predict with an opening picture (`blocks/L01/blk-l01-s01.json`)
- `narrationCover.prompt`: the desk photo covers the stage while the prompt is spoken (narrated only). `frames` = the camera: `{}` = whole image, then a slow push-in (`ms` 1800) at beat time `t`. No `until`: on a predict it stays until the card shows. Why: the prompt would otherwise open on words over an empty stage (sec 8b).
- Script `prompt`: `[[show.options]]` before "On the screen are four claims": the card shows at that word, not at the end. The last sentence is the ask ("which of these claims could a study actually test?"), nothing after it; options are never read (sec 7).

## Slide 2: a scene the voice drives (`simulations/L01/CaseControlFrameScene.js`)
Scene lines to copy:
- `class ... extends withNarrationCues(SvgScene)` (kit `SimNarration.js`); `static CUES = ['cases', 'controls', 'chosen', 'frame', 'steps']`; `applyCue(id)` does what a learner's tap does; `cueBase()` / `cueReset(b)` snapshot and restore the learner's state, so scrub back is exact.
- `data-narr="cell-a"` etc. on every part the voice names: each cell, each row head, each column pair (`col-ac`), each margin (`mar-ac`), the letters, the groups. `data-narr-hide` on what is never spoken (the time arrow on beat 2).
- `this.interactDone('controls')` only in the click handler, after the learner changed the stepper; never from `applyCue`.
- Header: what each beat shows, `Narration focus ids:`, `Completion:`.

Script (`narration/les-01.script.json`), beat by beat:
- b1: `[[show.cases]]` the cases appear as named; `[[show.controls+pool]]` two parts at once because the sentence names both; `[[focus.cases+controls]]` closes on the comparison.
- b2: the teacher demonstrates (`[[controls]]` = 1 each, `[[chosen]]` = 4 each, the stepper moves in sync), then hands over: "Now set the number of controls yourself", `[[focus.all]]` so nothing the task needs is dimmed, `await: interact` + `hint`. Exploration (no `closed`): Done/Skip only, the learner has time to try 1-4.
- b3: the 2 x 2 is built in words and light together: each cell lit with its row head as named; "a plus c" = `[[focus.col-ac+mar-ac+cases]]` (both cells, the margin, and the people they count). Numbers and letters spoken in words.
- b4: the four steps appear one by one (`show.step1` ... `show.step4`); the ask "Tap any step, and see which people it is about" works because a tap lights those people (an ask that changed nothing was a defect).

Not shown here: a closed wait (`"closed": true`, the scene detects the end, e.g. all parts placed); a `figure` field (ids = item ids, `gate`, `after`, `aside`); a canvas scene (`narrationFocus({narrated, on, held})`).
