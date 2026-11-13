# Look rubric (Stage 3 look step and Stage 3-look)

The bar: the course's look card (the one in your bundle or named in the prompt; default the Quill look, `packs/look/quill/CARD.md`), on top of `docs/look-base.md`. Passing every check is required and is not enough: bare-but-correct scenes have been rejected twice with every check green. The note's `## Checks explained` is the builder's claim, not a verdict: judge the picture.

## Calibration images (open these before judging your own)

Plain look: skip this table; calibrate on the images `packs/look/plain/SHOWCASE.md` names (`examples/media/plain-look/`) and `briefs/showcase/ANTI-programmer-art-vs-good.png`.

Anchors, not perfect scenes (`packs/look/quill/SHOWCASE.md` says what not to copy). `Q` = `examples/media/quill-look/`.

| Image | Why |
|---|---|
| `Q/GOOD-Kudavolai-dark-b0.png`, `Q/GOOD-Kudavolai-light-b0.png` | closest to the card: one hero, a hand on it, the same world at dusk and in the morning |
| `Q/GOOD-BellJar-dark-b1.png` | a lab run: apparatus, a quiet bench, a person who reacts |
| `Q/GOOD-SaltLattice-dark-b4.png` | a microscopic subject on a depth field, no face on the evidence |
| `Q/GOOD-SlideRule-light-b1.png` | maths: chunky hero, big numbers, lipped chips |
| `examples/media/look-kit/GOOD-Timeline-light-b1-read.png`, `GOOD-Chart-dark-b2-hemicycle.png` | humanities and maths components: dates, eras and seats read at a glance (more `GOOD-*` there per component) |
| `briefs/showcase/GOOD-SeedRaceScene-vital-force-dark-b1-on.png` | a DOM comparison board done well |
| `briefs/showcase/MEH-CrowdScene-reacts-dark-b3-run.png` | correct but weak: particles on a void, no apparatus |
| `briefs/showcase/ANTI-programmer-art-vs-good.png` | left half: everything to avoid; right half: the fix |

## Order of looking (context is the budget)

1. Read the text report `shoot` printed (canvas: overlap, off-canvas, small, contrast, empty centre; DOM: overlap, off-frame, small, contrast). It points at the shots worth opening.
2. Open the contact sheet `<Scene>-sheet.png` (every beat, both themes, half size) and the flagged single full-size shots in ONE response (parallel reads); in a 3-look pass that is the only viewing.

## Questions, per beat and theme

Walk every look-base rule and card rule, then:

1. Is anything clipped, overlapping or off-canvas, in EITHER theme?
2. Empty middle band: move or scale the hero into the hero zone (canvas: `ZONES.hero`; SVG/DOM: the stage middle; shoot prints the ink centre), never add decoration (plain: no setting unless the course names `casefile`). Before adding any drawing, check the stub's `Note card:` and `Not yet taught:`.
3. Readings in side cards, a chip for every label, chips at the edges, never on the evidence. Would it sit beside your look's anchors (Quill: the GOOD images above; plain: `packs/look/plain/SHOWCASE.md`)?
4. Glyph boxes: A box (tofu) or blank where a special glyph should be in a shot (the rupee sign, a tick, an arrow, a superscript, any non-Latin letter or symbol) is the screenshot browser's missing font, not a scene bug: never swap the glyph for words or CSS drawings, never add a replacement chip, and do not hunt fonts or kit source. If the character comes from `fmtINR`/`fmtNum` or another kit formatter, the source holds a backslash-u escape and there is nothing to check; otherwise, only when a box is visible, check the source holds the real character (a plain `grep` of the file). Log it once under `open:` (never `left -`) as `glyph box: <char>, harness font`.
5. Loop: shoot reads it AT the shot, before the 1.5 s idle park, so `loop running` on a static scene is expected. Parking is tested by check-scene's freeze probe, not here.
6. Geography: right silhouette for the landform (V vs U valley, meander, delta, fold) - compare with a real photo; vertical exaggeration and time named in chips; the same strata order and elevation ramp as the module's other scenes; India's border from the Survey of India layer with its credit. 3D: backdrop right in the light theme, chips not clipped or overlapping at any beat's camera shot, hero not cropped in portrait.
7. Humanities and maths: dates and durations read at a glance; order or cause visible without prose; seat, vote and money totals add up on screen; geometry labels off the lines; fractions stacked when the lesson stacks them; DOM boards checked in portrait. Maths stays flat: graph paper, no glow (both looks; plain's other subjects: flat paper, the chart's own gridlines).

## Do not over-argue

`shoot` saying 0 issues means no MEASURED overlap. A graze you cannot measure goes under `open:`: do not zoom, crop or argue it. Judge a defect in at most 3 lines, then fix it or log it.

## What to write (the design note's `## Look log`)

One line per round or pass, appended with `scene-pass.mjs ... look "<line>"` (never hand-edited): `round N (<shots viewed>): seen - <problems>; changed - <edits>; left - <...>` (verify's own look, 2 rounds) or `pass N (<images viewed>): seen - ...; changed - ...; left - ...` (3-look, see briefs/stage3-look.md). Anything still wrong at the end goes under `open:` with why it was left. Status is set only by `log-stage3.mjs`.
