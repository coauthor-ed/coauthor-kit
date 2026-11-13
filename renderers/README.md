# Renderer library

Approved, ready-made course-local figure renderers (docs/renderers.md). Reuse one before writing your own.

- List: `node tools/staged-generation/add-renderer.mjs --list`
- Add to a course: `node tools/staged-generation/add-renderer.mjs <Bundle> <name@major>` (copies the folder, adds the bundle.json binding)
- Then: `node tools/staged-generation/renderer-lint.mjs <Bundle>`, and regenerate the manifest (`tools/export-course.mjs`).

## Rule: copy, never edit

A course copy must match the library byte for byte; renderer-lint FAILs on any difference. To change behaviour, make a new name or a new major (`v2`) in the course; never edit a library copy inside a course.

## Index

| name | draws | use when | not when |
|---|---|---|---|
| epi-curve@1 | epidemic curve: cases by onset day or hour, one box per case; optional exposure line, incubation bracket, stacked groups, notes | outbreak onsets over time (point source vs person-to-person, peak, incubation); small to medium counts | rates, cumulative counts, two time axes; the learner operates something (scene); a timeline of periods (`timeline` layout) |

Each folder has card.md (full data format) and example.json.
