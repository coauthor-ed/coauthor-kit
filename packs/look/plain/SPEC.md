# Plain look: spec

Reference for the plain look: an editorial explainer, the register of a good data-journalism feature. Built for university and adult readers and data-heavy subjects. The rules a scene must meet are in `CARD.md` (on top of `docs/look-base.md`); this file explains them. Anchors: `SHOWCASE.md`.

Status: 2026-11-04 rewrite. The 2026-11-03 version ("university-press textbook") read as bland on a real course: every accent collapsed to navy, text slides left half the screen empty, scenes were grey outlines on flat paper. The id stays `plain` so profiles, registry and courses keep working.

2026-11-05: type and page from the epidemiology prototype. Antic Didone (display serif) + Instrument Sans (text), warm paper, one ink, the signature colour (default blue) plus a lime highlighter, rules not cards, light by default.

Type rules (2026-11-05): the serif only at about 24 px and up (slide head, step numeral, pull quote, big readings). Everything smaller is the sans: beat headings (600), table cells, labels, kickers, badges. Tabular figures in tables and readings. Body line height 1.6, measure about 66ch. No monospace anywhere in the look.

Built: `registry/looks.json` entry `plain` (classic only, gamification off), token css `src/looks/plain/look.css`, reactor (a small tick, nothing else), brand. LookProfile: `simulations/base/kit/looks/plain.js`. A scene never sets them.

## 1. Course setup

- Module JSON: `"look": "plain"`, `"gamification": false`.
- `bundle.json` `"accent"`: the signature colour, one of `blue` (default), `crimson`, `teal`, `indigo`, `ochre`, `green`. Blue: deep `#0d45b0` for text, tint `#dcedff`. It reaches the app as `data-accent` and the scenes as `--sim-annot` / `--sim-annot-tint`.
- `bundle.json` `"simSetting"`: under plain only `"casefile"` (sec 8) or nothing. Any other setting is ignored and the scene sits on the paper.
- Preview: `shoot --look plain` or harness `?look=plain` (add `&setting=casefile`, `&accent=teal`).

## 2. The page

What the app draws around the slides (engine, no author action):

- Lesson head (sticky, on every width): the step number as a large serif numeral in the signature colour, a small caps eyebrow (`LESSON 3 . SHORT TITLE`), the slide title in the display serif, an optional deck line (block field `deck`), `Step n of m` at the right. A phone keeps all of it, smaller.
- Footer: a slim segmented progress bar (done = highlighter, current = signature), then Previous and Next. The primary button is the highlighter with an ink rule.
- Text-only slides are a reading page: one centred column (about 68 characters), the first paragraph of a lesson's first slide with a drop cap, `>` lines as pull quotes (serif, large, signature-colour rule). Never a half-empty screen.
- A slide with a figure: reading left, figure right (below on a phone), caption under it. The figure sits on the paper under one ink rule: no card, no shadow, no side rules. The figure number (`Fig. 1.4`, lesson.slide) is drawn by the app when the block has a caption.
- Tables (markdown and SimPanel `ruleTableHtml`, one recipe): full width, 1 px grid in the warm rule colour, tinted head row (small, bold, wraps), first column left, the rest right, all in the sans with tabular figures (no serif in cells), 12-14 px padding, a `Total` row bold on the tint, cell tags as small muted superscripts, caption bold above, note muted below. Picked column or row: signature tint with a signature edge (top and bottom), other cells muted. A big number is a reading, never a cell.
- Beats: each forward beat (beat 0 too) fades in with a 6 px rise over about 220 ms once its text has rendered; the previous beat dims smoothly (still 4.5:1 or better). A step back plays nothing: the beat was read already. Reduced motion: a plain fade.
- Predict and question blocks: no box. One ink rule over the block, a small caps label, options as ruled rows (picked row: signature tint and edge).
- Theme: light by default (`registry/looks.json` `"theme": "light"`, used until the learner picks one). Dark is warm near-black paper, warm ink, the signature colour lightened, the highlighter kept; not slate grey.
- Scene parts, not local CSS (docs/dom-scene-kit.md, SimPanel): pass / fail marks are `tickHtml` (SVG, never unicode glyphs), dense choice rows `chipsHtml({ size: 'sm' })`, a phone table `ruleTableHtml({ stack: 'portrait' })`, a time line `datedAxisHtml`, a sort `fileCardHtml` + `binChipsHtml`, a ratio chart `barsHtml({ base: 1, log: true })`. No scene text under 12 px.
- One big reading in a scene: class `.sim-numeral` (token `--sim-font-numeral`, the serif under plain).

## 3. Writing for the look

- Titles state the takeaway (CARD 1). The outline's slide line names it.
- One key sentence per slide is a candidate pull quote; one key number is a candidate big reading.
- Captions say what to see ("Two of five parts are named. Add the rest."), not what the figure is ("The hypothesis builder.").
- The senior's note and similar asides are a `>` line starting with the speaker ("Senior's note: ..."); the app sets them as a margin note.

## 4. Composition of a scene

- Layers: paper, the hero figure, annotations on it, a reading card, controls at the edges.
- The hero is centred and at least half the width.
- Annotations (`SimAnnotate`): `callout(target, text)` a tinted box with a leader line to the target; `underline(range)`; `highlight(range)` a highlighter sweep; `ring(target)`. All in `--sim-annot`. At most 3 on screen; the newest one is the beat.
- Empty space is fine; never fill it with icons.

## 5. Shape and material

| Key | Plain | Effect |
|---|---|---|
| `radius`, `pill`, `corner` | 0.6, 7, 10 | small soft corners, capped at 10 px |
| `rim` | 0.7 | fine rims |
| `lip`, `gloss` | 0, 0 | no lips, no highlights |
| `cardShadow` | 0 | rules, not cards: no shadow |
| `furniture`, `faces` | `'flat'`, false | benches are slabs; drawFace draws nothing |
| `figRim`, `figShade`, `fabric` | 0.4, false, false | people and animals (SimFigure, drawPersonGlyph, SimAnimal): fine rims, flat fills, plain cloth; an animal keeps a dot eye |
| `flattenScenes` | true | a scene's own CSS and SVG obey the look at load |
| `settings` | `'course'` | only a course's own `simSetting` from the plain list (`casefile`); never a subject default |

## 6. Colour

| Role | Tokens |
|---|---|
| Paper | `--sim-bg-deep`, `--sim-bg-surface`, `--sim-panel` |
| Lead, the hero's main mark | `--sim-accent` (navy) |
| What the beat is about, annotations | `--sim-annot`, tint `--sim-annot-tint` (the course signature colour; blue unless `accent` says otherwise) |
| A second warm mark | `--sim-gold` (brass) |
| Groups | `--sim-series-1..5` (blue, ochre, plum, teal, rust), text in `-ink`; `--sim-series-8` grey for the rest |
| Verdict | `--sim-good` / `--sim-bad`, always with a tick or cross |
| Ink | `--sim-label`, `--sim-label-muted` |

Series 1-5 are distinct in lightness as well as hue; still label them. In the app chrome the accents are no longer collapsed: teal, violet, coral and amber keep muted, print-like values of their own.

## 7. Motion

Plain keeps every motion facility of the kit; it changes only decorative flourishes.

- Kept at full power: SimAnim tweens and timelines, draw-on (SimDrawOn), morphs (SimMorph), camera moves and zoom to a detail (SimCamera), staged sequences (SimStage), rigs (SimRig), iso scenes, physics (PhysicsSimulation, Matter.js), particles, continuous processes, WebGL and geo. A complex mechanism should use them.
- Physical motion is real: a spring oscillates, a ball bounces, a fluid flows. The look never damps the physics of a model.
- Explaining motion: bars grow, lines draw on, a leader line draws to its target (240 ms), a highlighter sweeps (300 ms), the camera moves to what the beat is about.
- Changed by the look (theme, not machinery): chip and card arrivals are a fade with a small rise (no overshoot pop), no sparkles, no screen shake, no idle wobble or bobbing, first frame `reveal: 'fade'`.
- Ambient decoration (drifting clouds, twinkles) is off; a process that is the subject may run continuously.

## 8. The casefile setting (optional, per course)

For a course that frames itself as an investigation (epidemiology, forensics, audit, history from sources). `bundle.json` `"simSetting": "casefile"`.

- Under plain the setting is drawn quiet (LookProfile `casefile: 'quiet'`, 2026-11-05): the page paper, one hairline folder rule and an outlined tab for the scene title. No desk, no manila fill, no card shadow, no lamp. Why: the desk and folder were a second, darker frame inside a page that is now rules on paper; they fought the editorial page and the dark theme. Geometry (`casefileRects`) is unchanged, so scenes lay out the same. Quill keeps the full desk (`casefile: 'desk'`).
- Labels, kickers and stamps in the sans (plain sets `fontMono` to the sans: no typewriter).
- The find is a stamp (the kit draws it at the find: a rotated outlined word, default `CONFIRMED`; a scene may pass its own word to `celebrate({ stamp })`).
- Objects only: paper, folders, index cards, stamps, highlighter, clips. Never faces, hands or people.
- Surfaces on it (`--sim-bg-surface`, `--sim-panel`, canvas cards) become `--sim-set-paper` (the page paper under plain, both themes).
- Any look paints it when a scene sets static `SETTING = 'casefile'` (Quill included).
- App chrome stays editorial; the setting is the scenes only.

## 9. Known leftovers (do not use in a new plain scene)

Decorative painted art (`SimFigure` or `SimAnimal` as cast or decoration, cartoon icons; as the subject of a mechanism they are fine, drawn faceless), arcade games, emoji or exclamation copy, a mascot or sidekick face, hardcoded radii, lips or inline `style=` colours.

## 10. Self-check before calling a scene done

1. Could a reader say what the figure shows in 3 seconds?
2. Is the thing to look at annotated on the figure?
3. Is the hero data or mechanism, from kit parts, near the centre?
4. Every number with unit and denominator, computed from what is drawn?
5. Both themes readable; no colour-only meaning?
6. No mascot, cast, faces, emoji, games or gloss? Any person or animal is the subject, not decoration?
7. Would it sit in a good data-journalism feature? Bland is a failure too.

## 11. Appeal

Plain courses are often in subjects learners call dry; the look must not add to it. On top of the audience card's Appeal item (`packs/audience/college/CARD.md`):

- Every scene has a moment that changes in front of the learner, from the learner's action: a split, a sort, a fill, a slide.
- The payoff is a large reading (the ratio, the count) that animates to its value when the learner earns it.
- Depth without decoration: rules and tints, not shadows; layers (paper, rule, annotation) read as layers.
- Colour does work: the signature colour on the beat, series colours on groups, never all grey with one navy line.
- A scene that is correct, quiet and boring fails. Compare with the anchors; if it would not sit in a good data-journalism feature, rework it.
