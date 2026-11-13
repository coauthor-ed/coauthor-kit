# Stage 3 guide: chart (Component: Chart)

Axes, bars, line traces, histogram, pie, hemicycle seats, dots, tally. Read `svg.md` first.

## Start from
- `examples/simulations/maths/ChartShowcaseScene.js` (SvgScene): copy it. Canvas twin: `examples/simulations/ShapeKitCanvasShowcaseScene.js` (a SimScene).
- Counts per day on a date axis with a moving average: `examples/simulations/data/TimeHistogramTraceScene.js`. k of n as dots, two groups compared: `examples/simulations/data/DotPopulationScene.js` (spread the marked dots with a seeded Set).

## Rules
- The frame is a spec (`chartFrame`: plot rect, scales, nice ticks); `axesSvg`, `barsSvg`, `traceSvg` draw it. Never hand-draw axes.
- Any value printed on the chart comes from the data the chart draws, not a second copy.

## Time axis (dates on x)
- Dates on x: `timeAxis({ from, to, bin: 'day' | 'week' })` (SimChartSpec, re-exported by SimChart). Spread it into the frame: `chartFrame({ rect, x: { ...T, label: 'Week starting' }, y })`. Works with `axesSvg` and `axesCanvas`.
- Counts per day or week: `histogramSvg(f, T.bins(dates))`; empty bins stay in, as zero. A line over the bars: `traceSvg(f, rows.map((r) => ({ x: T.x(r.date), y: r.v })))` (mid-bin).
- Dates: 'YYYY-MM-DD' strings (or Date). Calendar days only, no clock, no time zone. Ticks read '3 Mar'; the year shows once it changes; long spans tick by month.
- Week bins start on Monday (`weekStart` 0..6 to change). Say what a bin is in the axis title ('Week starting', 'Date reported'). Sample data is labelled illustrative.

## Manual and API (from kit-api, copied in)
```text

SimChart - animated charts as SVG in the DOM (SimSvg stage). Bars grow in,
traces draw on, chips pop: all CSS, no frame loop. Lay out for the stage's
real width (portrait = its own layout); text is never scaled down. Static
charts with no interaction belong in the `graph` JSON field, not a scene.

  const f = chartFrame({ rect, x: { min, max, ticks, label, cats, fmt }, y: { min, max, ticks, label, fmt } });
  f.px(v) f.py(v) f.vx(px) f.vy(py) f.band(i) -> { x, w }
  const T = timeAxis({ from, to, bin: 'day' | 'week', weekStart, want })   dates on x: chartFrame({ x: { ...T, label } })
  T.bins(dates) -> histogramSvg bins (empty bins kept); T.x(date) -> a trace point's x; dayNumber(d), dayText(n, { year, month })
  axesSvg(f, { grid, panel })                     -> { svg, over }  panel, grid, tick labels, axis titles
  barsSvg(f, bars, { grow, labels, width, fmt })  -> { svg, over }  bars [{ x (cat index | value), v | vs: [..], tone, tones, text }]
  traceSvg(f, pts, { tone, target, targetText, end, draw, width }) -> { svg, over }  pts [{ x, y }]
  histogramSvg(f, bins, { tone, grow })            bins [{ x0, x1, n, tone }]
  pieSvg(rect, parts, { donut, labels })           parts [{ v, tone, text }]
  hemicycleSeats(n, rect) -> [{ x, y, r }]         seat centres, left to right
  hemicycleSvg(rect, { seats, groups, majority, label })   groups [{ n, tone }]
  dotsSvg(rect, { n, hi, tone, hiTone, cols })    a population, first `hi` (or a Set) highlighted
  tallySvg(x, y, n, { size, tone })               tally marks in fives
  barsHtml(rows, { max, unit, fmt }) -> html       plain DOM bars for a board (rows [{ label, v, tone }])
  CHART_CSS                                        overlay CSS (the hemicycle count)
Tones: series numbers 1..8 or 'accent' | 'good' | 'bad' | 'warning' | 'label'.
```
```text

# simulations/base/kit/SimChart.js
  chartFrame
  timeAxis
  dayNumber
  dayText
  axesSvg(f, o = {})  - Panel card, grid, tick labels, baseline and axis titles. @opts grid, panel
  barsSvg(f, bars, o = {})  - Bars from 0; grow: animate in (staggered). @opts grow, labels, width, fmt
  traceSvg(f, pts, o = {})  - A line through pts (draw: animate on), end dot, optional target line + chip. @opts tone, target, targetText, end, draw, width
  histogramSvg(f, bins, o = {})  - Contiguous bars for bins. @opts tone, grow
  pieSvg(rect, parts, o = {})  - Pie or donut from 12 o'clock; labels as chips outside. @opts donut, labels
  hemicycleSeats(n, rect)  - Seat centres of a parliament hemicycle in rect, left to right.
  hemicycleSvg(rect, o = {})  - Seats coloured by group, in order; majority tick and chip; the count as HTML. @opts seats, groups, majority, label
  dotsSvg(rect, o = {})  - A population of n dots; the first `hi` (or a Set of indices) highlighted. @opts n, hi, tone, hiTone, cols
  tallySvg(x, y, n, o = {})  - Tally marks in fives from (x, y). @opts size, tone
  CHART_CSS  - Overlay CSS (the hemicycle count). Add it to the scene CSS.
  barsHtml(rows, o = {})  - Plain DOM bars for a board: rows [{ label, v, tone 1..8 }]. @opts max, unit, fmt

# simulations/base/kit/SimChartSpec.js
  niceTicks(min, max, want = 5)  - SimChartSpec - the render-agnostic half of the chart frame: plot rect, scale maps (px, py, vx, vy, band) and tick lists. No DOM, no canvas.
  chartFrame(o = {})  - Plot area inside rect, leaving room for tick labels and titles. @opts rect, x, y
  dayNumber(d)  - A date as a day number: 'YYYY-MM-DD', a Date (its local calendar date) or a day number (returned as is).
  dayText(n, o = {})  - A day number as short, locale-free text: '3 Mar'; { year: true } '3 Mar 2024'; { month: true } 'Mar 2024'.
  timeAxis(o = {})  - An x axis of dates, binned by day or week. Spread it into chartFrame's x: const T = timeAxis({ from: '2024-03-01', to: '2024-04-15', bin:... [opts: from, to (dates as dayNumber takes), bin 'day' | 'week', weekStart (0 Sun .. 6 Sat, default 1 Mon), want (ticks, default 6)]
```

## Design note, `Kit use:` line
`Kit use: SvgScene use - <why>; SimChart use - <why>`.
