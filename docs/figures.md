# Figures: the `figure` field

A static figure on a `content-block@1` slide that the engine lays out: a flow of steps, panels, a timeline, small multiples or a side-by-side comparison. You write the content; the engine places it, wraps the text, reveals it per beat and draws it in the course's look (plain, the casefile setting, Quill; light and dark). No coordinates.

Pick it for any non-geometry static figure. The `diagram` field is geometry only (points, segments, angles: docs/geometry-diagrams.md); `graph` is a plotted function (docs/graphing-and-plotting.md). A flow chart drawn with `diagram` is a lint WARN (outline-lint, lesson-check). If the learner should operate something, it is a scene, not a figure.

A kind no layout here can draw, with nothing to operate (read -> renderer, operated -> scene): a course-local renderer, docs/renderers.md (try these layouts first; check the ready-made library first: `add-renderer.mjs --list`).

## Shape

```json
"figure": {
  "layout": "steps",
  "caption": "The 1961 file at each stage. The hypothesis is where an analytical study takes over.",
  "items": [
    { "id": "size", "title": "Size of the problem", "text": "Count cases by time, place and person.", "entry": "Many more malformed births than before" },
    { "id": "clues", "title": "Clues", "text": "Look at where and when the cases fall.", "entry": "A new sleeping drug, on sale since 1958", "step": 2 },
    { "id": "hyp", "title": "Hypothesis", "text": "Put size and clue together as a claim.", "entry": "Thalidomide might be the cause", "step": 3 }
  ],
  "entryLabel": "In 1961",
  "after": { "title": "Analytical study", "text": "Tests the claim", "step": 3 },
  "notes": [ { "on": "hyp", "label": "Hand-off", "text": "Descriptive work ends here.", "step": 3 } ]
}
```

One medium per block: never with `image`, `simulation`, `photoDiagram`, `graph` or `diagram`.

## Common keys

- `layout` (required): `steps`, `panels`, `timeline`, `multiples`, `compare`.
- `caption` (required, at most 160 chars): what to see, one sentence. Plain numbers it (`Fig. 1.4`); do not write the number.
- `items` (required): 2 to 6 (panels 2 to 4, compare 2 to 3). `id` unique, short; `title` at most 40 chars; `text` at most 120.
- `step` (optional, on any item, `gate`, `after`, `aside`, `verdict`, note): the 1-based beat it appears at; default 1. Before that it shows as a dashed outline of the same size, so the figure never jumps. Keep steps within the slide's beat count.
- `notes` (optional): `{ on, label, text, step }`. `on` names an item id (steps: also `gate` or `after`). Label at most 24 chars, text at most 90. At most 3 show at once (the newest); a note sits above the figure with a leader line, or inside its card when the card is not in the first row. The target gets the signature-colour border. Use a note for the one thing to look at on this beat.
- `focus` (optional): what each beat is about. The focused part gets the signature edge (plain: tint and highlighter on its case line); the other shown parts dim to muted ink. Default with no `focus`: the parts that arrive on this beat, when older parts are already shown; else this beat's note targets; a figure shown all at once has none. Override per beat: `"focus": [ { "step": 2, "on": ["clues"] }, { "step": 4, "on": [] } ]` (`on` names item ids, steps also `gate` / `after`; `[]` = none). `"focus": false` turns it off. Narration can move it mid-beat with a cue: narration.md sec 8.
- `position` (optional): `right` (default), `left`, `above`, `below`, `flow`. A phone stacks it.
- `a11yCaption` (optional): what a screen reader hears; generated from the content when absent.
- `tab` (optional, casefile setting only): the folder tab text, at most 40 chars; default the lesson kicker.
- Strings: plain strings or `{ "en": "..." }`.

## Layouts

- `steps`: a flow, left to right; a column when narrow. Item `{ id, title, text?, entry? }`. `entryLabel` heads every `entry` (the running case's value at that stage). `gate { after: <item id>, title, items[1-5] }`: a checklist between two stages. `after { title, text? }`: a dashed "Next" stage for what comes after.
- `panels`: 2 to 4 cards side by side. Item `{ id, title, text, case? }`; `caseLabel` heads every `case` (how it applies to the running case).
- `timeline`: spans on one axis. `axis { from, to, every }` (at most 12 intervals). Item `{ id, title, text?, from, to }` or `{ ..., from, open: true }` when only a start is known (fades to the right); `tone` 1-5 picks the series colour.
- `multiples`: the same small picture repeated. `glyph: "cohort"` (people join at one event, followed forward). Item `{ id, title, event, text }`, `event` at most 16 chars. `aside { label, tags[1-8] }`: a tag row under the figure. Narration can show or focus it as `aside` (`[[focus.aside]]`); text-mode `focus` never picks it.
- `compare`: two or three things drawn the same way. `glyph: "target"`: 14 shots. Item `{ id, title, text, spread, offset: [x, y], tone? }`: `spread` 0-1 of the radius, `offset` -1..1 from the centre. `verdict { text }`: the one-line conclusion under it.

## Rules

- Write content, not layout. No sizes, colours or positions.
- Short words in titles: a title wider than its card stacks the whole flow into a column.
- Text never shrinks below 13 px; long text makes a taller card, so keep it short.
- The prose beats and the figure steps tell the same story: beat N reveals what step N adds, and the focus lights what beat N talks about. When a beat talks about an older part (a recap), set `focus` for that step.
- Plain, in a side column: steps and panels draw as a ruled ledger, one row per item with a serif numeral; keep `title` short, put the detail in `text`, the case in `entry` / `case`.
- Example: `examples/blocks/blk-example-figure.json`. All six layouts in the app: the engine's `tests/fixtures/courses/figure-showcase/`.
