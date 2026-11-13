# Probe cookbook - tests for `Must get right`, good and bad

Used by the build pass (writes the file, never runs it) and the verify pass (runs it). One steps file holds ALL the rows of the note's `## Tests to run`; run it once; fix every mismatch it prints in one turn; run it again once. Drivers: `drive-dom.mjs` (DOM and SVG scenes, real browser, text) and `run.mjs exec drive.mjs` (canvas scenes, headless). The examples below are the usage (do not run `--help`). Both drivers check `expect` the same way: a failing one prints `FAIL`, `visible now:` and `closest:` (canvas: the text drawn now) and the run exits 1 - fix the file or the scene from that, do not read tool source. Probes may read private counters (`sc._s.spread`); `d.count("line")` (DOM: visible elements by selector; canvas: draw calls of that kind) and `d.texts()` prove a thing is STILL drawn. Never test a drawn thing through a model field.

## Good: a steps file (DOM/SVG scene), one run, every row of the table

```
[{"beat":0},
 {"set":["#len","27"]}, {"set":["#grav","1500"]}, {"click":"button:has-text(\"Run\")"}, {"until":"idle"},
 {"expect":["#row-climb","/[1-9]/"]}, {"expect":["#row-gravel","/[1-9]/"]},
 {"set":["#len","10"]}, {"click":"button:has-text(\"Run\")"}, {"until":"idle"}, {"expect":"still moving"},
 {"set":["#len","45"]}, {"click":"button:has-text(\"Run\")"}, {"until":"idle"}, {"expect":"stopped short"},
 {"expect":"27 m","not":true}]
```
Row by row: both bills non-zero (item 1), too short stays moving (2), too long stops short (3), the answer is never printed (5). Selectors come from `--inputs`, never from memory.

## Bad -> good

| Bad | Why it fails | Good |
|---|---|---|
| `{"click":"text=Run"}` | matches every element containing Run (drive-dom WARNs, uses the first) | `button:has-text(\"Run\")` or an id |
| `{"expect":"Run"}` | tests a label that is always there; passes when the scene is broken | change the figure, expect the READING to change: set A, read; set B, read; the two differ |
| "all three lines are drawn" as `expect "line"` | checks a word, not a drawing | a probe over every line in every case the stub lists: `{"probe":"[...root.querySelectorAll('line')].every(l=>l.getTotalLength()>0)","expect":true}` |
| expect straight after Run | text at opacity 0 or display:none is not readable yet | `{"until":"idle"}` first, then expect the end state |
| one steps file per check, five files, each debugged alone | 16 turns of syntax fixing | ONE file for all rows; fix all mismatches from one run |
| `{"expect":"#f","pattern":"85.7"}` | wrong shape | `{"expect":["#f","/85\\.7 N/"]}` (regex in slashes, double backslash in JSON) |
| a sweep over a 10 x 10 grid of dial values | slow, proves nothing more | the defaults, each dial's extremes, and the one case the slide names |
| `set` on a selector copied from the stub | a missing control is skipped and reported, the test then proves nothing | `--inputs` first; read the `skipped:` lines of the run |
| reading a private field such as `sc._a1` to prove something is drawn | breaks on a rename, says nothing about what a learner sees | read the text the learner reads; `d.count(...)` for "still drawn"; a private counter only for what the screen cannot show |
| an expected number worked out by hand (sign of y, stroke or arc counts) | the commonest false FAIL: screen y runs DOWN, a path draws more strokes than you think | take the expected value from one run of the scene (`d.snap()`, `d.count(...)`), judge that it is right, then write it into the row; do not derive it |
| no row for the stage of each beat (a `BEAT_STEP_MAP` scene) | a map with every idx 0 passes every other row | one `stage per beat` row first: `{"probe":"sc.stage","expect":N}` (a `DomSimulation` has no `sc.stage`: use `sc.stepIndex`) after each `{"beat":N}`; all equal is the bug |

## Canvas scenes (drive.mjs)

Steps: `{"beat":N}`, `{"ctrl":["id","v"]}` (a slider value is a string, a button `true`), `{"tap":[x,y]}`, `{"drag":[[x0,y0],[x1,y1]]}` (pairs, never a flat list), `{"wait":ms}`, `{"until":"idle"}`, `{"expect":"text"}`, `{"probe":"<ONE expression>","expect":<json>}`. `name` is ignored (one file serves shoot too). x, y are design px; y grows DOWN.
- A probe is JS with `d` and `sc` in scope: an expression such as `(s => s.a + s.b)(d.snap())`, or statements ending in the value (`const s = d.snap(); s.a + s.b`). A probe reads; never store a counter on `sc` (`sc._n = ...`): compare with a literal.
- A control keeps its value into the next row: set it again at the start of a row that depends on it.
- `d.state()` = the scene's `testState()` (a plain object of key values: stage, picked, locked...); probe it first. `d.snap()` rounded model state, `d.texts()` text drawn now, `d.count("arc"|"text"|"rect"|"stroke")` draw calls in one fresh frame, `d.disabled(id)`, `d.hidden(id)`, `d.value(id)`, `d.busy()`.
- A whole-canvas `d.count` proves "still drawn" only inside one beat with nothing transient (confetti, a fading chip); else probe `d.snap()`.
- Output: `FIRST FAIL (step N)` on top, `FAIL: step N: ...`; cut at ~2000 chars, full text in `build/scratch/<Bundle>/<Scene>-drive.log`. 3 checking runs per scene (the 4th STOPs).

```
[{"beat":0},{"probe":"(s => s._y)(d.snap())","expect":3},
 {"ctrl":["height","10"]},{"ctrl":["drop",true]},{"until":"idle"},
 {"expect":"0.0 m"},{"probe":"d.count(\"arc\") > 0","expect":true}]
```

## Minimal probe template (build writes it, verify runs it)

`build/scratch/<Bundle>/<Scene>-tests.json`: the rows of `## Tests to run` as ONE flat JSON array (not nested arrays, not `{"rows":...}`): a row starts at each `{"beat":N}` step, at most 5 steps per row. A canvas (`SimScene`) scene ignores `{"beat":N}` for the beat it is already on, so a second row on the same beat re-sends nothing: change beat, or `set`/`click` to reset. A `DomSimulation` re-runs `onStep` on every `{"beat":N}`. Object-valued probes: `{"probe":"sc.checkObjective().ok","expect":true}`. `until` works in `drive`, not in `shoot --steps`. No probe over 120 chars. No layout/width/overlap probe (sim-layout and check-scene do those). Scene fields: only `sc.stage` / `sc.checkObjective`. Sup text reads as `x2` in textContent. Click an SVG hit region by its `[data-region]` element, a button by `button:has-text("Run")`. Selectors come from `--inputs`, so build guesses only ids it wrote itself.

```
[{"beat":0},{"probe":"sc.stage","expect":0},
 {"beat":2},{"set":["#len",1.2]},{"click":"button:has-text(\"Run\")"},{"until":"idle"},
 {"expect":["#f","/85\\.7 N/"]},
 {"beat":3},{"click":"[data-region=\"gate\"]"},{"expect":"x2"}]
```

| Check | Form |
|---|---|
| text anywhere in the scene | `{"expect":"Force on the block"}` |
| text inside one element, regex | `{"expect":["#f","/85\\.7 N/"]}` (regex only here and in a bare `"/re/"`) |
| value compare (`==`) | `{"probe":"sc.stage","expect":2}` |
| empty string | `{"probe":"...","expect":""}` |
| must not be readable | add `"not":true` |

## Items that need eyes

If a `Must get right` item cannot be tested in text (a face legible, a hill with depth), do not invent a probe: write it under `open:` in the note for the look step.
