# Course-local figure renderers

EXPERIMENTAL contract `figure-host@0`; it may change before `@1`.

A renderer is a small JS module inside the bundle that draws one kind of STATIC figure the built-in `figure` layouts cannot. Slides name it in `figure.renderer`; the engine hosts it and reveals it per beat.

## When

A renderer is READ: parts appear per beat, the learner at most taps to look closer. A scene is OPERATED: the learner changes something and the picture responds.

| The learner... | Use |
|---|---|
| reads it; parts appear per beat; at most taps a part to look closer | `figure` layout (docs/figures.md), else a library renderer, else a new renderer |
| changes something and it responds (slider, drag, run, play, predict then check) | a scene (docs/simulation-authoring.md) |
| needs a plotted function or a geometry figure | `graph` / `diagram` (docs/graphing-and-plotting.md, docs/geometry-diagrams.md) |

1. Try the built-in `figure` layouts first. If one fits, stop.
2. Then the library: `node tools/staged-generation/add-renderer.mjs --list` (renderers/README.md). If one fits: `node tools/staged-generation/add-renderer.mjs <Bundle> <name@major>` (copies and binds; the copy stays byte-identical).
3. Else write a new renderer, even for one slide: cheaper and safer than a scene.

- A chart or figure with nothing to operate is not a simulation and does not count toward the sim-per-slide rule. Never build one as a scene (`CONTROLS: []` smell).
- Motion over time the learner starts or scrubs (play, run, a timer): scene.
- Votes, budgets, data tables: renderer or layout when only read; scene (AllocBoard, SimChart) only when the learner moves the numbers.
- Outline call for a renderer slide: `**neither**` (`figure.renderer: <name@major>`).

## Folder

```
courses/<Bundle>/renderers/<name>/v1/
  index.js      the module
  schema.json   JSON Schema for `data`
  card.md       when to use it, when not, data shape, minimal example
  example.json  one valid figure object (renderer form)
```

`index.js` may import `./x.js` files in the same folder, and `lit`. Nothing else.

## Module

```js
export const api = 'figure-host@0';
export function validate(data) { return []; }      // pure, no DOM; returns error strings
export function describe(data, beat) { return ''; } // plain text for screen readers
export function aspect(data) { return 1.6; }        // optional width/height hint
export const inspect = true;                        // optional: tap or key to look closer
export function mount(root, data, env) {            // root: empty open ShadowRoot; may be async
  return { setStep(beat, animate) {}, setOptions(env) {}, destroy() {} };
}
```

`env` (complete every call): `beat` (1-based), `look` (`quill`|`plain`), `setting` (`''`|`casefile`), `colorScheme`, `width` (px), `reducedMotion`, `tab`. `data` is a clone; you may mutate it. Caption is drawn by the engine, outside the renderer.

## Rules

- Imports: `lit` and `./` files only. No `customElements.define`.
- No network, storage, `eval`, `Function`, `document.write`; nothing outside `root`.
- Colours only `var(--fig-*)`: `--fig-ink`, `--fig-muted`, `--fig-card`, `--fig-rule`, `--fig-edge`, `--fig-ground`, `--fig-grey`, `--fig-ghost`, `--fig-s1`..`--fig-s5`, `--fig-sig`, `--fig-sig-tint`, `--fig-lead`, `--fig-lead-tint`, `--fig-arrow`, `--fig-ring`, `--fig-shadow`, `--fig-desk`, `--fig-tab`, `--fig-tab-ink`, `--fig-font-mono`, `--fig-case-*`. No hex/rgb/hsl.
- Look closer (optional): `export const inspect = true`, then a tap or key may show detail (a bar's count, one group highlighted). Never changes data, beat or anything the lesson keeps; every inspectable part reachable by keyboard (tabindex + Enter/Space); the figure reads complete without it. Lint WARNs on listeners without `inspect`, and on `inspect` without a keyboard path.
- Text 13 px or more. Unrevealed parts keep their space (no layout jumps). Honour `reducedMotion`. Canvas handles its own `devicePixelRatio`.

## Bind

`bundle.json`; the manifest generators copy it into `manifest.json`:

```json
"renderers": { "epi-curve@1": { "url": "renderers/epi-curve/v1/index.js" } }
```

Name pattern: `name@major`, optional `publisher/` prefix. Bundle-relative url. An absolute url is a lint WARN.

## Slide

```json
"figure": {
  "renderer": "epi-curve@1",
  "caption": "Cases by day of onset. The peak comes four days after the meal.",
  "data": { "...": "per schema.json" },
  "position": "right"
}
```

`caption` (160 chars max) is required. Do not mix with `layout`/`items`. Same one-medium-per-block rule as other figures.

## Beats

Convention: a 1-based `step` on each item in `data` (default 1), same as the built-in form. `env.beat` is the current beat; show items with `step <= beat`.

## Narration

In a narrated course a renderer may implement `narrationFocus({ narrated, on, held })`: `on` = the ids the voice names now (item ids in `data`), `held` = ids kept lit from earlier cues. Light those, dim the rest; restore all when `narrated` is false. No method = the slide is never dimmed. `docs/narration.md` 8.

## Check

`node tools/staged-generation/renderer-lint.mjs <Bundle>` or `--dir <path to a bundle folder>` (also in `tools/check-all.mjs` when `bundle.json` has `renderers`). It checks bindings, the four files, the rules above, and runs `validate()` on `example.json` and on every slide's `data`.
