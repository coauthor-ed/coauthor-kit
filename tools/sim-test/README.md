# Headless simulation tests

## Conventions every tool here follows
- **Naming a scene:** `L08/RulerLeverScene`, a bare `RulerLeverScene` (if unique), a path to the `.js` or `.stub.md`, or a lesson folder `L08`; the same in every tool (scene-info, check-scene, shoot, drive, drive-dom, ident-lint, kit-api, sim-lint, sim-layout). With one bundle under `courses/` you can leave `--bundle` out. A miss prints the closest scene names and what is accepted.
- **Flags:** `--flag value` or `--flag=value`; `--help` (or `-h`) prints the usage; an unknown or mistyped flag stops the run (exit 2) and names the closest valid one; a missing `--bundle` value or unknown bundle says so.
- **`--look <id>`** (shoot, check-scene, motion-probe, drive-dom, sim-layout, webgl-probe): draw with that look; default the bundle's (bundle.json, else profile.json, else quill).
- **`--steps`** (shoot, drive, drive-dom): bad JSON, a non-array, a missing `@file`, or a step that repeats a key (`{"ctrl":[..],"ctrl":[..]}` keeps only the last) is refused with the fix; a step key the tool does not know is reported, not ignored.
- **DOM scenes vs canvas scenes:** sim-lint and sim-layout say so when given the other kind; check-scene picks the right gates itself. A DOM scene gets a real-font text report too (overlap, text under 14 px, contrast, text outside the frame; only text a learner can see counts), and `sim-layout` pokes dials (min, max, middle) and buttons on every beat to size the frame for the tallest state (`--interact N`, default 10).

## The one-command tools (start here)

| Command | Answers |
|---|---|
| `node tools/sim-test/scene-info.mjs <L0N[/Scene]> --bundle <b>` | what to build: stub, design-note status, attaching slides, REAL beat counts and beat texts |
| `node tools/sim-test/kit-api.mjs [file ...] [--bundle <b>] [--grep x] [--geo]` | one line per export (default: the look kit; `--geo` adds GeoScene/GeoTerrain/GeoMap/GeoLook); read this, not the source |
| `node tools/sim-test/ident-lint.mjs <file \| dir>` | parse errors, undefined names (with the module that exports them), const reassignment, bad imports, duplicate or clashing class members, `this.x()` with no x. Static, seconds |
| `node tools/sim-test/check-scene.mjs <scene \| L0N> --bundle <b> [--no-browser] [--no-probes] [--verbose]` | every gate: ident-lint, reserved names, CONTINUOUS rules, sanity + draw at each real beat count, beat-check, `CONTROLS` shape (a `type` the host cannot draw, a select option without `value`, a duplicate id: FAIL), freeze probe, resume probe, real-browser text report (canvas, WebGL), motion-probe (canvas), webgl-probe (WebGL), or sim-lint + sim-layout (DOM); map lints (India border, hand-typed coordinates). Terse; FAIL/WARN, plus advisory `note` lines (design-note size, style scales, headless legibility guesses) that are never counted and need no answer; `SKIPPED:` names what did not run |
| `node tools/sim-test/shoot.mjs <scene> --bundle <b> [--steps=JSON\|@file] [--report-only]` | screenshots per beat in both themes, a contact sheet, and a real-font text report (overlap, off-canvas, small, contrast, empty centre); prints settle waits and ignored/busy input; deletes the scene's old shots AND its old contact sheet each run; `--steps` may `set [sel, v]` / `click sel` a DOM scene's own panel inputs and needs a `name` on each step to shoot (none named: every step is shot; a run that shoots nothing says NO SHOTS TAKEN); passes the course's glossary.json / field-guide.json to the harness itself, so glossary-driven scenes need no custom shooter; counts look rounds (a shot-taking run on changed scene code; max 2, a third exits 3; `--reset-rounds`, `--max-rounds N`) |
| `node tools/sim-test/motion-probe.mjs <scene> --bundle <b> [--beats N] [--theme dark\|light\|both] [--sheet] [--cap s] [--verbose]` | the motion between settled frames (canvas only; real Chromium, fake clock, a beat sampled every 32 ms until it settles, ~10 s for 4 beats): dead beat (over 4 s with no change and more to come, or busy() all through: WARN), pop (one step changes over 4% of the frame and 6x both neighbours; the beat-change step and SimScene flash/shake exempt: WARN), repaint (`_tick(ctx, 0)` twice differs: Math.random in draw, FAIL), resume in pixels (settled frame walked forward / in reverse / mounted on it: WARN), mid-motion text (overlap, cut by the edge, 0.2 s or more and gone by the end: WARN). `--sheet`: a slow-clock contact sheet per theme, a row per beat, into `build/shots/<bundle>/<folder>/<Scene>-motion-<theme>.png`. check-scene runs it (not with `--no-probes` / `--no-browser`) |
| `node tools/sim-test/run.mjs exec tools/sim-test/drive.mjs <scene> --bundle <b> --steps=JSON` | operate a scene headless (no browser): `beat`, `ctrl [id, v]` (strings for sliders/selects, like the host), `tap`, `drag`, `wait`, `until idle`, `probe "js"`; prints busy and drawn text per step; `drag` takes `[[x0,y0],[x1,y1],...]` pairs (a flat list is refused); a probe is ONE expression. Same output and cap as drive-dom: `FAIL: step N:` lines, a `FIRST FAIL (step N)` line on top, output over ~2000 chars cut (full text in `build/scratch/<Scene>-drive.log`), 3 checking runs per scene (the 4th prints STOP and exits 1; a beat-only smoke run is not counted). The clock is fake and covers `setTimeout`/`setInterval` too (`d.step(6)` runs 6 s of timers instantly; `d.timers()` = still waiting), so no `await sleep(...)`. As a library: `import { drive, check, summary } from './drive.mjs'` (header has the API) |
| `node tools/sim-test/drive-dom.mjs <scene> --bundle <b> --steps=JSON \| --inputs` | operate a DomSimulation scene in a real browser (the headless fake DOM has no HTML parser, so `drive.mjs` cannot reach a scene's own panel inputs): `beat`, `set [sel, v]` (range/number/select/checkbox, real input+change events), `click sel`, `ctrl [id, v]`, `wait`, `until idle` (busy() false and no setTimeout pending), `read`, `expect [sel, /re/]`, `probe "js"` (+ `expect`; `d.count(sel)`, `d.texts()`; the expect logic is shared with `drive.mjs`, tested by `test-expect.mjs`); a disabled or missing control is reported, as a learner could not use it. Controlled page clock by default (waits run instantly; `--real-time` to disable). Prints visible text per step; no screenshots, so it never counts as a look round. Cap: 3 checking runs per scene (the 4th prints STOP and exits 1); `sim-layout` has the same cap; output over ~2000 chars is cut, full text in `build/scratch/<Scene>-drive.log`. `--inputs` lists the operable controls with selectors |
| `node tools/sim-test/run.mjs exec tools/sim-test/freeze.mjs <scene> [beats]` | model still moving when the loop parked? |
| `node tools/sim-test/webgl-probe.mjs <scene> [beats] [--quick]` | WebGL in headless Chromium (software GL, slow): parks per beat, resume (direct vs walked), repaint after resize / theme flip / GPU context restore |
| `node tools/sim-test/run.mjs exec tools/sim-test/arcade-bot.mjs <scene> [...] [--passive]` | plays an arcade game headlessly: one deliberate mistake then all right (run ends, won, mix-up recorded, boss round, replay resets), or `--passive` (runs out of hearts, never hangs) |
| `node tools/sim-test/run.mjs exec tools/sim-test/resume-probe.mjs <scene> [beats]` | does beat j depend on how long earlier beats were watched (a leak)? `RESUME_IGNORE=<regex>` skips fields |
| `node tools/sim-test/contrast-lint.mjs [--palette] \| <scene> [--bundle <b>]` | static, WARN only: every `c.*` colour against bgDeep/bgSurface/raised in BOTH themes (text roles 4.5:1, graphic roles 3:1; `track` exempt); no argument = whole closed palette, with a scene = only the keys it uses; exit 1 on a `c.key` no map defines. `import { contrastLint }` returns `{warn, fail}` |
| `node tools/sim-test/run.mjs exec tools/sim-test/line-ends.mjs <scene> [beats]` | opt-in, WARN only: open stroked lines in the settled frame of each beat whose end touches no stroke, fill edge, dot or label (authoring 4.7, "lines never stop in mid-air"). Skips gradient, dashed and under-45% strokes; repeated marks collapse to one line. Noisy on texture and organic curves: read, do not gate |

Kit contracts: `node tools/sim-test/run.mjs exec tools/sim-test/look-kit-check.mjs` (SimScene, chips, SimFigure) and `.../data-kit-check.mjs` (SimText formats, component validation, number line, chance, geometry). `shoot --dpr 2` shoots at 2x for close inspection. check-scene also reports people drawn with `drawFigure`: WARN under 60 px or a grip out of reach, FAIL a figure off the frame.

Shots go to `build/shots/<bundle>/<folder>/`. `ident-lint` and `kit-api` use the vendored acorn parser (`vendor/acorn/`, MIT). The rest of this file documents the underlying headless walk.


Cheap, no-browser checks for a scene under `simulations/base/*` - construct, `setup()`, walk a few beats, teardown - before reaching for the real `simulations-kit/preview-harness.html` browser check (`docs/simulation-authoring.md` #5).

```bash
node tools/sim-test/run.mjs sanity  <scene.js> [--export=Name] [--beats=N]   # (a) does it crash?
node tools/sim-test/run.mjs draw    <scene.js> [--export=Name] [--beats=N]   # (b) is it actually drawing?
```

- `sanity`: constructs the scene, runs `setup()`, calls `onBeatChange`/`step()` across `--beats` beats (default 3), tears down twice (idempotency). Draw calls are no-ops - fast, crashes/lifecycle bugs only.
- `draw`: same walk, but the canvas ctx records every call. Fails if zero draw calls were recorded (a scene that silently stopped drawing), and prints a call-count histogram (`{"fillRect":26,"arc":19,...}`) - eyeball it for the shape you expect (e.g. one `arc` per item on screen).
- `--export=Name` if the scene file doesn't export exactly one class; otherwise the sole/default export is used.
- A `WebGLSimulation`/`GeoScene` scene (#3.2) prints `skip: scene.unsupported === true` here (no GPU in Node): only lifecycle is checked. Headless Chromium does render WebGL (software), so `shoot` and `webgl-probe` cover it; check-scene runs both.
- A green run does not prove a drag or tap moved state: a hit test that misses is a silent no-op. After a `drag`, read state back with `probe "sc.<field>"` and compare to before. (`drag` takes `[[x, y], ...]` pairs or `{x, y}` objects; before 2026-10-04 it passed raw pairs to the pointer hooks, so older "driven" results may be hollow.)
- A `DomSimulation` scene (#3.1 in `docs/simulation-authoring.md`) always prints `skip: DOM scene - ...` instead of a draw histogram - see "DOM scenes" below.

Both modes also (near-free, so always on):
- **Validate every `fillStyle`/`strokeStyle` assignment is a real color** - catches the wrong-variable typo (`ctx.fillStyle = label` instead of `labelColor`) that canvas otherwise swallows silently.
- **Flag any hardcoded fillStyle/strokeStyle literal (hex/rgb)** - it breaks one of the two themes; source colours from `this.colors` (`docs/simulation-authoring.md`). check-scene reports it as a WARN; it doesn't fail the raw run.
- **Advisory**: flag a `COLOR_TOKEN_MAP`/`TOKEN_MAP` entry naming a `--sim-*` token that isn't declared in `sim-theme.css`'s closed palette - it always renders its JS fallback hex, identical in both themes (a hardcoded color in disguise). Doesn't fail the run; the closed list is read straight out of the vendored `sim-theme.css`, so it can't drift from what's actually declared.
- **Come-to-rest check**: after `start()`, a state change (`onBeatChange`, or `animateFor()` for a scene with none) must make the draw-call count grow within a few pumped frames (**wake**), and - unless the scene declares `static CONTINUOUS = true` - the count must stop growing once the scene has had time to settle (**idle**). This exercises the scene's *real* rAF-driven loop (a controllable fake clock, not wall-clock time - see `harness.mjs`'s `pumpFrame()`), not the direct `step()` calls used elsewhere in the walk, so it actually tests whether `SimulationBase`'s animation budget parks the loop rather than always passing regardless. Skips for a `DomSimulation` scene with no `_tick` (nothing to count) and for `scene.unsupported`.

`draw` additionally GUESSES at legibility (printed as `guess:` lines, never a FAIL or an exit code: the real-font browser report in `shoot`/`check-scene` is the check), using approximate bounding boxes (Node has no real font metrics, so text width is estimated) grouped per beat:
- **Overlap** - two *different* labels whose boxes intersect. (Same text at two positions is treated as one label sampled mid-animation, not a collision.)
- **Overflow** - a label's anchor point sits inside a drawn panel/card, but its box extends past it.
- **Contrast** - a label's color against the panel/card it's anchored inside, WCAG ratio < 4.5:1.

Boxes follow the canvas transform (`translate`/`scale`/`rotate`/`setTransform`, with `save`/`restore` carrying transform and draw state), so a scene drawing in local units is checked where it really lands. Collapsed boxes (a pop-in at scale ~0) and faint washes (fill opacity under 30%) are not treated as containers.

These are heuristics, not pixel-perfect - good enough to catch the obvious mistakes that need manual review, not a guarantee.

## DOM scenes

A `DomSimulation` scene (`src/simulations/base/DomSimulation.js`) is detected automatically - no canvas ever gets created, but real DOM does land in the container - and both modes skip the draw-call/legibility checks above outright, deliberately: those exist *because* canvas has no layout engine of its own, and Node has none either (there's no headless-gl/jsdom here - see `harness.mjs`'s "mock exactly what the base classes need" `FakeElement`, not a real layout engine). Porting them is impossible without a real browser, and unnecessary once one lays the text out - which is the entire argument for `DomSimulation` in the first place.

What DOM mode checks instead, in both `sanity` and `draw`: `setup()` mounted something into the container (shared with canvas scenes), `onBeatChange` (if the scene defines one) actually changed the tree across the walked beats, and teardown leaves the container empty.

**Visual verification for a DOM scene is `simulations-kit/preview-harness.html` in a real browser** - that's the deal being struck here, and it's deliberate: this headless walk is for catching crashes/lifecycle bugs cheaply, not for judging whether the layout actually looks right.

Every run's full output is logged to `build/scratch/logs/<timestamp>__<mode>-<scene-name>.log` (printed at the end) - check there before re-running if you already tested this scene this session.

## DOM scene checks: `sim-lint` and `sim-layout`

Two checks written for `DomSimulation` scenes (`docs/dom-scene-kit.md`). Both take a scene file or a directory and exit non-zero on any ERROR.

```bash
node tools/sim-test/sim-lint.mjs   courses/<bundle>/simulations [--strict] [--quiet]
node tools/sim-test/sim-layout.mjs courses/<bundle>/simulations [--json out.json] [--strict] [--orient both|landscape|portrait]
```

- `sim-lint` (static, no browser): syntax (`node --check`, catches a stray backtick in a template literal), hex/rgb colours, `injectStyle` before `root.innerHTML`, `1fr` grid tracks without `minmax(0, 1fr)`, font under 14px, `left`/`top` px, undeclared `--sim-*` tokens, missing `ARIA_LABEL`. Silence one kind with a `// sim-lint-ignore <kind>: reason` comment.
- `sim-layout` (needs Playwright + Chromium; serves the repo and `simulations-kit/preview-harness.html` itself): walks every beat in landscape (host 620px) and portrait (host 380px) and reports: no scene CSS mounted, an element or its 3px shadow leaving the frame (`clipped ... by Npx`: raise `HEIGHT` by about N), content wider than the frame, content taller than the declared height, more than 24px of empty band below the tallest beat, text under 14px. Beat count comes from `BEAT_STEP_MAP` (or `--beats N`). `--interact N` clicks N random buttons/selects after each beat and keeps the tallest state (default 30 for KeyBuilder/SlotBoard scenes): an interactive scene must be sized for its worst state.
- A `GameBoard` or `SortBoard` is mounted once, at the host's real widths: 1100 and 320.
- `phone-dock` (WARN): a tall board on a lesson block comes out under 200 px wide at 390. Set `simulation.fullWidth` on the block, or make the portrait layout one wide panel per beat.
- `--kit <dir>` / `--root <dir>` override where the harness and the served root are found.

## Predict mounts

A `poe-predict` block mounts a scene with `onBeatChange(MAX_SAFE_INTEGER, MAX_SAFE_INTEGER)`. check-scene runs the operability probe with `--predict` for such a scene: `PREDICT-LEAK` (WARN) means the mount draws what the last beat draws, so the prompt shows the answer. Canvas only; a DOM scene is not checked.

## Writing a deeper, scene-specific test

For assertions the generic walk can't know (a specific beat locks the right controls, a specific rule draws N items) write a small script importing the harness directly, then run it via `exec`:

```js
// paths below are relative to wherever you save this test file
import { installFakeHost, createDrawCtx, getLastCtx, makeContainer, check, summary } from '.../tools/sim-test/harness.mjs';
installFakeHost(createDrawCtx);
const { MyScene } = await import('.../courses/<bundle>/simulations/L02/MyScene.js');
const scene = new MyScene(makeContainer());
await scene.setup();
scene.onControlChange('copies', '19');
check(getLastCtx()._calls.filter(c => c.method === 'arc').length === 19, 'draws 19 items for copies=19');
process.exit(summary());
```

```bash
node tools/sim-test/run.mjs exec path/to/your-test.mjs
```

Runs and logs the same way as `sanity`/`draw`.
