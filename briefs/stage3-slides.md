# Stage 3-slides - One whole-slide review of one lesson

Target: one lesson, `L0N` (lesson file `courses/<Bundle>/lessons/les-0N.json`). Run it once, after EVERY scene of that lesson is `done` (Status in each `simulations/L0N/*.design.md`), never per scene. A fresh agent; ONE pass: one shoot, one view, one edit batch. Do not loop.

Why: a look pass judges the scene alone. The learner sees the WHOLE slide: scene + prose + header + footer. Scenes shown at 0.8 of design size, controls cut on phones and a Check button below the fold all passed scene-only looks.

**Vision.** View the images yourself. If you cannot, stop and report `SLIDES: no vision` (change nothing).

## Read

1. `lessons/les-0N.json` (slide order; block N in the tool = the Nth entry, from 0). Per FAIL, only that slide's block JSON, prose or scene note, when you file the fix.
2. This brief's checklist (below). No kit source, no stubs, no other lesson.

## Write-scope

The repo-root `build/` (shots land in `build/slide-shots/`). `## Requests` of a scene's `<Scene>.design.md` (append only). In a scene `.js`: ONLY a trivial layout constant (`HEIGHT`, `PORTRAIT_HEIGHT`, `WIDTH`, `fullWidth` in the block, a gap or font-size constant), then `node tools/sim-test/check-scene.mjs L0N/<Scene> --bundle <Bundle>` (PASS needed, else undo the edit and file a Request). GENERATION-LOG.md only through `node tools/log.mjs add`. Never prose, blocks, questions, stubs, kit files or other lessons: those fixes go in the report.

## Checklist (one verdict per slide; the tool measures 1-5b)

| # | Check | FAIL when |
|---|---|---|
| 1 | Stage scale | desktop 1280x800: a DOM/SVG scene renders at < 0.95 of its design width, unless the block sets `simulation.fullWidth` |
| 2 | Page scroll | desktop: the scene or the Check button is cut by the fold; phone: the scene starts below 75% of the first screen |
| 3 | Clipped controls | a control is off the viewport side or cut by the scene box (phone: below the fold is WARN, judge it) |
| 4 | Text size | rendered text under 12 px (page or scene) |
| 5 | Title twice | phone: the same heading shown twice on one screen |
| 5b | Repeated beat frame | two beats of one slide settle to an identical scene frame while their texts differ (tool-measured). A `Beat hold: b2.0-b2.1` line in the scene's design note passes them as HOLD: use it only when the prose deliberately talks over a still picture |
| 6 | Empty space | a gap wider than a third of the column, or a scene floating in empty card |
| 7 | Colours | a hue not in the look (maroon, muddy brown, neon), or light-theme colours in dark |
| 8 | The point | the one thing the slide teaches is not visible at its beat |
| 9 | Narrated (only if the course has a script) | at a cue, something on screen is lit that the voice is not speaking, or a part it names stays dim; a beat opens on words alone (`docs/narration.md` 8a, 8b) |

Owner of a fix: `scene` (the scene file or its HEIGHT), `prose` (slide markdown too long, pushing the scene down), `block` (position, fullWidth), `kit` (app chrome, header, footer: the same defect on every slide).

## Procedure

1. **Shoot once.** `node tools/operator/slide-shots.mjs --bundle <Bundle> --lesson les-0N` (defaults: `--vp 1280x800,390x844 --themes light,dark`; it exports the lesson with the engine checkout, or takes `--export-dir <dir>` of a ready export). It prints one table row per slide x beat x viewport x theme (scale, overflow, Check position, smallest text, clipped controls), then grouped `FAIL`/`WARN` lines and a contact sheet path. A defect repeated on every slide is ONE kit defect.
2. **View once.** One response, all reads in parallel: at most 8 images. Pick per slide the worst shot (a FAIL row first; else desktop light, then phone dark). Checks 6-8 come from the images; 1-5 from the text.
3. **Judge.** Write the table (below) before touching any file. A tool FAIL you think is wrong: say why in one line; the number stands unless the image shows otherwise.
4. **Edit once.** Trivial layout constants only (write-scope), each followed by check-scene. Every other `scene` FAIL: one line under that scene's `## Requests`: `- slides <date>: b<block>.<beat> <vp>: <defect>; want <fix>`. No second shoot.
5. **Log.** `node tools/log.mjs add --bundle <Bundle> --stage 3-slides --lesson L0N --model "<name>" "<PASS|FAIL>: <n> of <m> slides fail; <defect - owner> list"`.

## Report

`SLIDES L0N: PASS|FAIL`, then the table, one row per slide:

| slide | verdict | defect (vp, theme) | owner | file |
|---|---|---|---|---|

Then: edits made (file, constant, check-scene PASS line), Requests filed, kit defects for the operator, the slide-shots summary line.
