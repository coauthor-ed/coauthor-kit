# Plain look: showcase

Anchors for judging a scene against `CARD.md`. A lean model tier may skip this file.

## Quality bar: the epidemiology prototype (owner, 2026-11-05)

The owner's hand-built prototype of the analytical-epidemiology case-control lesson (odds, not risk) is the bar for plain numbers slides. Its four patterns (`docs/numericals.md`):

- Step-by-step calc panel: numbered rows, each a label, a big serif formula with its numbers (`Odds of smoking = 33 / 2 = 16.5`) and one gloss line; a "Show worked arithmetic" reveal; an entry with a check.
- Stacked-fraction formula: `OR = (14 x 51) / (9 x 6)` as numerator over denominator, the value landing large.
- Selected-column table: column heads are buttons; the picked column tints, its numerator and denominator light, the rate reads beside it.
- Annotated sentence: a sentence with its key word as a chip; a tap opens the annotation, underline from SimAnnotate.

It turned the course's "game" into an exercise: a goal, a live model, a check, worked feedback, no game chrome. Match its read and restraint; keep our longer explanatory prose.

## Plain anchors (pending owner approval, 2026-11-03)

Built for plain, named by shape, illustrative data, controls in the scene. Images (plain look, both themes, `--force`): `examples/media/plain-look/GOOD-<name>-<theme>-<beat>.png`. Shoot: `node tools/sim-test/shoot.mjs examples/simulations/data/<Scene>.js --look plain`. Not approved yet: copy the read and the structure; judge colour in the real app.

| Shape | Scene (`examples/simulations/data/`) | Image (`GOOD-`, `*` = dark, light) | Teaches | Kit |
|---|---|---|---|---|
| time histogram with a trace | `TimeHistogramTraceScene.js` | `TimeHistogramTrace-*-b1` | a 7-day average removes the weekly dip; binning by week keeps the total | timeAxis, histogramSvg, traceSvg |
| k of n dot population | `DotPopulationScene.js` | `DotPopulation-*-b1` | the same count is a different rate in a different group | dotsSvg (seeded Set) |
| table with highlighted cells | `TableHighlightScene.js` | `TableHighlight-*-b1` | compare rows by share, not count; margins fix a hidden cell; the share counts up on a pick | tableSpec, tableSvg, SimAnnotate |
| people sorted into a 2x2 | `PeopleToCellsScene.js` | `PeopleToCells-*-b2` | 40 dots sort by exposure, then outcome; letters a-d; risks and RR count up | dotsSvg-style live dots, SimAnnotate |
| study or process flow | `ProcessFlowScene.js` | `ProcessFlow-*-b1` | each split adds back up to the box above; predict a missing count | FlowScene tree, predict mode |

Casefile setting (per course, `simSetting: casefile`): `CasefileClaimScene.js`, image `GOOD-CasefileClaim-*-b0`. Index cards filed into a claim form, a ring on the missing part, the count to 5/5, a TESTABLE stamp. Each filed card leaves the evidence its part calls for in its tray slot, so the tray ends as the records a test needs. Images show the end state. Objects only.

`LookKitShowcaseScene` has a window, a tap and a plant: not an anchor.

Other data-shape showcases (kit parts, so the plain profile reaches all of their shapes): They are kit parts, so the plain profile reaches all of their shapes. Shoot them with `--look plain` and judge colour in the real app.

| Pattern | Start from (`examples/simulations/`) | Watch for |
|---|---|---|
| bars, histogram, time histogram, pie | `maths/ChartShowcaseScene.js` (SVG); canvas twin `ShapeKitCanvasShowcaseScene.js` | hemicycle and seats are for civics, not here |
| a curve that plots, axes that build, a callout | `maths/SvgPlotShowcaseScene.js`; canvas `SimPlotShowcaseScene.js` | |
| a population of dots, k of n highlighted | `data/DotPopulationScene.js` (`dotsSvg`) | a population as data is dots; figures only when people move as the mechanism |
| repeated trials, running frequency | `maths/LongRunFrequencyShowcaseScene.js` | |
| predict before reveal | `maths/CatchUpPredictShowcaseScene.js` (`SimPredict.js`) | |
| study-design flow, cause chain | `humanities/FlowLayoutsScene.js`, `humanities/ConsequenceShowcaseScene.js` | |
| a table of counts with totals, cells to mark or fill | `data/TableHighlightScene.js` (`SimTable.js`) | a table only to read is markdown |
| compare matrix, claim vs evidence, 2x2-like grids | `humanities/ClaimEvidenceScene.js`, `humanities/CompareCivilisationsScene.js` | |
| a number line, a ratio scale | `maths/NumberLineShowcaseScene.js` | |
| terms that light parts of a figure | `maths/TapLightDomShowcaseScene.js` | |

Shape references shot in plain (same folder, pending owner approval):

| Image | Shows | Do not copy |
|---|---|---|
| `GOOD-Chart-dark-b0`, `-light-b0` (`maths/ChartShowcaseScene.js`) | bars on a titled frame, value chips | - |
| `GOOD-LongRunFrequency-dark-b0`, `-light-b0` (`maths/LongRunFrequencyShowcaseScene.js`) | a running frequency against the true value | - |

Quill shots under `examples/media/look-kit/` (Timeline, FlowBoard, Chance) show the read only: their gloss, lips and props are Quill.

Not anchors: anything under `examples/simulations/arcade/`, `FigureShowcaseScene.js`, `FigureGroupsScene.js`, `AnimalFieldScene.js`, the Quill SHOWCASE scenes.
