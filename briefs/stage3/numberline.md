# Stage 3 guide: number line (Component: NumberLine)

Integers, decimals, fractions, hops, spans, a zoom lens, a 0-1 chance line. Read `svg.md` first.

## Start from
- `examples/simulations/maths/NumberLineShowcaseScene.js` (SvgScene): copy it. The same spec drawn on canvas: `examples/simulations/ShapeKitCanvasShowcaseScene.js` (a SimScene).

## Rules
- The line is a spec (`numberLine`) plus a renderer (`numberLineSvg`, `markerSvg`, `hopSvg`, `spanSvg`); do not hand-draw axes or ticks.
- Fraction labels come from the kit (`fracHtml`); money and Indian grouping from `SimText.js`.

## Manual and API (from kit-api, copied in)
```text

SimNumberLine - number lines as SVG in the DOM (SimSvg stage): integers,
decimals, fractions, hops, spans, a zoom lens, the 0-1 chance line. Lay out
for the stage's real width (st.W): portrait gets a narrower line, labels thin
out by themselves, and text never shrinks.

  const nl = numberLine({ rect, min, max, step, minor, labels, den, snap, at });
  nl.x(v) nl.v(px) nl.snap(px)          positions in stage px, snapping for drags
  numberLineSvg(nl, { tone, arrows })  -> { svg, over }  track, ticks, labels (fractions stacked, HTML)
  markerSvg(nl, v, { text, math, tone, grab, below, lift, pop }) -> { svg, over, hit }   a pin with a chip
  hopSvg(nl, a, b, { tone, text, lift, draw }) -> { svg, over }                            an arc with an arrowhead
  hopPath(nl, a, b, { lift }) -> 'M...'   the arc, for a token riding it (CSS offset-path)
  spanSvg(nl, a, b, { text, tone, drop }) -> { svg, over }                                 a bracket with a chip
  lensSvg(nl, a, b, sub, { tone }) -> { svg, over }                                        magnify a..b onto line `sub`
  probTrack({ rect }) -> nl with zone words (impossible .. certain)
  fracLabel(v, den) -> ['frac', n, d] | string
  join(...parts) -> { svg, over }      concatenate parts
  NUMBER_LINE_CSS                      overlay label CSS (add to the scene CSS)
Tones: series numbers 1..8 or 'accent' | 'good' | 'bad' | 'warning'.
```
```text
# simulations/base/kit/SimNumberLine.js
  numberLine
  probTrack
  fracLabel
  join(...parts)
  numberLineSvg(nl, o = {})  - Track, arrowheads, ticks and labels. @opts tone, arrows, labelSize
  markerSvg(nl, v, o = {})  - A pin at v with a chip (text, or math HTML with math: true). @opts text, math, tone, grab, below, lift, pop
  hopPath(nl, a, b, o = {})  - The arc from a to b (for drawing and for a token's offset-path). @opts lift, below
  hopSvg(nl, a, b, o = {})  - A hop arc with an arrowhead and a chip at the top; draw: animate it on. @opts tone, text, lift, below, draw
  spanSvg(nl, a, b, o = {})  - A bracket under the labels from a to b, with a chip. @opts text, tone, drop
  lensSvg(nl, a, b, sub, o = {})  - Magnifier: a window round a..b on nl and a funnel to the child line `sub`. @opts tone
  NUMBER_LINE_CSS  - Overlay label CSS (fraction labels). Add it to the scene CSS.

# simulations/base/kit/SimNumberLineSpec.js
  fracLabel(v, den)  - A value as a fraction part (whole numbers stay plain).
  numberLine(o = {})  - Layout in rect (stage px); the line sits at `at` (0.55) of rect.h. [opts: rect, min, max, step, minor, labels, den, snap, pad, dp, at, minorLabels]
  probTrack(o = {})  - The 0-1 chance line with zone words. @opts rect
```

## Design note, `Kit use:` line
`Kit use: SvgScene use - <why>; SimNumberLine use - <why>`.
