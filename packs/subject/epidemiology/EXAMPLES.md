# Epidemiology: examples

Generic kit scenes and recipes that suit this subject. Look rules come from the look card; shoot with the course's look. No course-tested anchors yet (2026-11-03). Plain anchors (pending owner approval): `examples/simulations/data/`, listed in `packs/look/plain/SHOWCASE.md`.

| Need | Start from | Note |
|---|---|---|
| Epidemic curve | `examples/simulations/data/TimeHistogramTraceScene.js` (`timeAxis`, `histogramSvg`, `traceSvg`) | date bins: `briefs/stage3/chart.md`; bin width in the axis label |
| k of n affected, risk as dots | `examples/simulations/data/DotPopulationScene.js` (`dotsSvg`) | a population as data: dots, not figures |
| Repeated samples, chance variation | `examples/simulations/maths/LongRunFrequencyShowcaseScene.js` | sampling error before CIs |
| Predict before a reveal (OR vs RR, peak timing) | `examples/simulations/maths/CatchUpPredictShowcaseScene.js` | |
| Study design, causal chain, confounder path | `examples/simulations/data/ProcessFlowScene.js` (participant flow with counts); `examples/simulations/humanities/FlowLayoutsScene.js`, `ConsequenceShowcaseScene.js` | |
| 2x2 table, compare exposed vs unexposed | `examples/simulations/data/TableHighlightScene.js` (`briefs/stage3/table.md`); a table only to read is markdown | |
| Ratio on a scale, CI against 1 | `examples/simulations/maths/NumberLineShowcaseScene.js` | log scale only if the course uses one |

Question recipes: `docs/question-bank-generation.md` 3.4 (units, rates, tolerance, intervals) and 8.1 (table questions).

Illustrative 2x2 for a first draft (label it illustrative):

| | Ill | Not ill | Total |
|---|---|---|---|
| Exposed | 30 | 70 | 100 |
| Not exposed | 10 | 90 | 100 |
| Total | 40 | 160 | 200 |

Risk ratio 0.30 / 0.10 = 3.00; odds ratio (30 x 90) / (70 x 10) = 3.86.
