/**
 * SvgPlotShowcaseScene - reference for kit/SimPlotSvg.js (staged plots on the SvgScene clock), the SVG
 * twin of SimPlotShowcaseScene. Structure first, then the data, then ONE callout timed to the data:
 *   Beat 0: distance-time axes build (axesOnSvg): axis bars, grid and numbers, then the titles
 *   Beat 1: the line draws on by x (plotLineSvg by 'x') while a toy car drives the same trip on a road;
 *           the callout fires exactly as the head reaches the stop (plotHit + calloutSvg)
 *   Beat 2: y = x squared drawn by length; data stops at 87, so the nice ticks round the axis up to 100
 *   Beat 3: 60 rolls of a die: bars grow from zero, lagged (barsOnSvg); one callout on the tallest
 * Tap skips a running build to its end; Replay runs it again. Portrait is its own layout.
 */
import { SvgScene, chip, liveChip, fill, shade, glossOf } from 'simulations/base/kit/SimSvg.js';
import { ease } from 'simulations/base/kit/SimAnim.js';
import {
  plotFrame, linScale, plotPanelSvg, axesOnSvg, plotLineSvg, barsOnSvg, calloutSvg, plotHit, toScreen,
  barEnd, AXES, PLOT, CALLOUT,
} from 'simulations/base/kit/SimPlotSvg.js';

const MAP = [0, 1, 2, 3].map((i) => [{ idx: i, dwellMs: null }]);
const TITLES = ['First the axes', 'The line tells the trip', 'y = x\u00b2', '60 rolls of a die'];
const CAPS = [
  ['Seconds across, metres up', 'Seconds across, metres up'],
  ['Flat line: gradient 0, the car is still', 'Flat line: gradient 0'],
  ['Data stops at 87, so the axis rounds up to 100', 'Axis rounds 87 up to 100'],
  ['Bars start at zero, so heights compare fairly', 'Bars start at zero'],
];
const TRIP = [[0, 0], [4, 20], [7, 20], [10, 35]];
const STOP_I = 1;
const TRIP_LINE = { dur: 2.4, delay: 0.25, ease: ease.linear, by: 'x' };
const SQ = Array.from({ length: 32 }, (_, i) => { const x = (i * 9.3) / 31; return [x, x * x]; });
const SQ_I = SQ.findIndex(([x]) => x >= 7);
const SQ_LINE = { dur: 1.7, delay: AXES.end + 0.1, ease: ease.smooth, tone: 6 };
const DICE = [9, 11, 8, 14, 10, 8];
const TALL_I = DICE.indexOf(Math.max(...DICE));
const BARS_AT = AXES.end + 0.1;
const f1 = (v) => v.toFixed(1);

export class SvgPlotShowcaseScene extends SvgScene {
  static BEAT_STEP_MAP = MAP;
  static ARIA_LABEL = 'Graph demos: distance-time axes build, then the line draws while a toy car drives and stops; the curve y equals x squared on round tick marks; and bar heights for 60 rolls of a die, with 4 marked as the most common.';
  static CONTROLS = [{ type: 'button', id: 'replay', label: 'Replay' }];

  stageHeight(st) { return st.portrait ? 540 : 430; }

  enter(step) { this.play(this.plan(step, this.geo(this.sv)).end); }

  onControlChange(id) {
    if (id === 'replay') { this.clockReset(); this.enter(this.stepIndex); }
    this.requestUiUpdate?.();
  }

  pointerDown() { this.skip(); return false; }

  /** Layout for the current stage size: the chart frame and its screen points. */
  geo(st) {
    const P = st.portrait, W = st.W, H = st.H, step = this.stepIndex;
    const top = step <= 1 ? (P ? 92 : 84) : 14;
    const rect = { x: 6, y: top, w: W - 12, h: H - top - (P ? 64 : 58) };
    const g = { P, W, H, rect, capY: H - (P ? 30 : 26) };
    if (step <= 1) {
      g.f = plotFrame(rect, { x: { min: 0, max: 10, label: 'Time (s)' }, y: { min: 0, max: 35, n: 4, label: 'Distance (m)' } });
      g.pts = toScreen(g.f, TRIP);
      g.road = linScale(0, 40, g.f.plot.x, g.f.plot.x + g.f.plot.w);
      g.roadY = P ? 50 : 46;
    } else if (step === 2) {
      g.f = plotFrame(rect, { x: { min: 0, max: 9.3, n: P ? 4 : 5, label: 'x' }, y: { min: 0, max: SQ[SQ.length - 1][1], label: 'y' } });
      g.pts = toScreen(g.f, SQ);
    } else {
      g.f = plotFrame(rect, { zero: true, x: { cats: ['1', '2', '3', '4', '5', '6'], label: 'Score on the die' }, y: { min: 0, max: 18, n: 4, label: 'Times rolled' } });
    }
    return g;
  }

  /** When the callout fires, when the caption shows and when all is still (clock seconds). */
  plan(step, g) {
    if (step === 0) return { hit: null, cap: AXES.end, end: AXES.end + 0.6 };
    if (step === 1) {
      const hit = plotHit(g.pts, STOP_I, TRIP_LINE);
      return { hit, cap: hit + 0.3, end: Math.max(TRIP_LINE.delay + TRIP_LINE.dur, hit + CALLOUT.done) + 0.1 };
    }
    if (step === 2) {
      const hit = plotHit(g.pts, SQ_I, SQ_LINE);
      return { hit, cap: AXES.end * 0.6, end: Math.max(SQ_LINE.delay + SQ_LINE.dur, hit + CALLOUT.done) + 0.1 };
    }
    const hit = BARS_AT + barEnd(TALL_I, DICE.length);
    return { hit, cap: hit + 0.3, end: Math.max(BARS_AT + PLOT.bars, hit + CALLOUT.done) + 0.1 };
  }

  paint(st) {
    const g = this.geo(st);
    const title = TITLES[this.stepIndex];
    return { svg: plotPanelSvg(g.f), head: chip(title, 0, 0, { tone: 'plain', size: st.portrait && title.length > 18 ? null : 'big', static: true }) };
  }

  animate(st, t) {
    const live = this.live, g = this.geo(st), step = this.stepIndex, P = this.plan(step, g);
    const f = g.f;
    axesOnSvg(live, 'axes', f, step === 1 ? 99 : t);
    if (step <= 1) {
      let metres = 0;
      if (step === 1) {
        const r = plotLineSvg(live, 'line', g.pts, t, TRIP_LINE);
        if (r.p > 0) metres = f.vy(r.head[1]);
        const [x, y] = g.pts[STOP_I];
        calloutSvg(live, 'call', t - P.hit, g.P ? { x, y, tx: x, ty: y - 70, text: 'Car stops here' } : { x, y, tx: x - 26, ty: y - 54, text: 'Car stops here', align: 'right' });
      }
      road(live, g, metres, step === 1 ? 1 : Math.min(1, t / AXES.end));
    } else if (step === 2) {
      plotLineSvg(live, 'line', g.pts, t, { ...SQ_LINE, area: f.plot.y + f.plot.h, areaAlpha: 0.12 });
      const [x, y] = g.pts[SQ_I];
      calloutSvg(live, 'call', t - P.hit, { x, y, tx: x - 24, ty: y - 44, text: '7 \u00d7 7 = 49', align: 'right', tone: 6 });
    } else {
      const r = barsOnSvg(live, 'bars', f, DICE.map((v, i) => ({ x: i, v, tone: i === TALL_I ? 1 : 5 })), t - BARS_AT);
      const [x, y] = r.tops[TALL_I];
      calloutSvg(live, 'call', t - P.hit, { x, y, tx: x + (g.P ? -18 : 30), ty: y - 34, text: g.P ? '4: 14 times' : '4 came up 14 times', align: g.P ? 'right' : 'left' });
    }
    if (t >= P.cap) liveChip(live, 'cap', CAPS[step][g.P ? 1 : 0], g.W / 2, g.capY, { tone: 'plain', cls: 'sv-pop' });
  }
}

// The road above the graph (0 to 40 m, under the plot width); the car sits where the line head says.
function road(live, g, metres, k) {
  const x0 = g.road(0), x1 = g.road(40), y = g.roadY;
  const trackCol = 'var(--sim-track)';
  let html = `<rect x="${f1(x0 - 18)}" y="${y - 9}" width="${f1(x1 - x0 + 36)}" height="24" rx="12" ${fill(shade(trackCol, 72))}/>`
    + `<rect x="${f1(x0 - 18)}" y="${y - 12}" width="${f1(x1 - x0 + 36)}" height="24" rx="12" ${fill(trackCol)}/>`
    + `<line x1="${f1(x0)}" y1="${y}" x2="${f1(x1)}" y2="${y}" style="stroke:var(--sim-label-muted);stroke-width:2;stroke-dasharray:10 10;opacity:0.6"/>`;
  for (let m = 0; m <= 40; m += 10) html += `<rect x="${f1(g.road(m) - 1)}" y="${y + 8}" width="2" height="6" ${fill('var(--sim-label-muted)')}/>`;
  const e = live.shape('road', 'g', { html });
  live.css(e, { opacity: k < 1 ? k.toFixed(3) : null });
  const ends = live.shape('roadEnds', 'g', { html: `<text x="${f1(x0 - 26)}" y="${y + 5}" text-anchor="end" style="fill:var(--sim-label-muted);font-size:14px">0 m</text><text x="${f1(x1)}" y="${y - 20}" text-anchor="middle" style="fill:var(--sim-label-muted);font-size:14px">40 m</text>` });
  live.css(ends, { opacity: k < 1 ? k.toFixed(3) : null });
  const car = live.shape('car', 'g', { html: carSvg((g.road(metres) - x0) / 6) });
  live.attrs(car, { transform: `translate(${f1(g.road(metres))} ${y - 2})` });
  live.css(car, { opacity: k < 1 ? k.toFixed(3) : null });
}

// A toy car at the origin, wheels turned by ang (they stop when the car stops).
function carSvg(ang) {
  const body = 'var(--sim-series-2)';
  let s = `<ellipse cx="0" cy="11" rx="26" ry="4" ${fill('var(--sim-bg-deep)', 'opacity:0.35')}/>`
    + `<rect x="-12" y="-24" width="24" height="14" rx="6" ${fill(glossOf(body, 75))}/>`
    + `<rect x="-7" y="-21" width="14" height="8" rx="3" ${fill('var(--sim-glass)', 'opacity:0.9')}/>`
    + `<rect x="-24" y="-13" width="48" height="17" rx="7" ${fill(shade(body, 70))}/>`
    + `<rect x="-24" y="-15" width="48" height="15" rx="7" ${fill(body)}/>`
    + `<rect x="-18" y="-12" width="12" height="4" rx="2" ${fill(glossOf(body, 45))}/>`;
  const c = Math.cos(ang) * 4, sn = Math.sin(ang) * 4;
  for (const wx of [-14, 14]) {
    s += `<circle cx="${wx}" cy="3" r="7" ${fill(shade(body, 35))}/>`
      + `<line x1="${f1(wx + c)}" y1="${f1(3 + sn)}" x2="${f1(wx - c)}" y2="${f1(3 - sn)}" style="stroke:var(--sim-bg-surface);stroke-width:2;stroke-linecap:round"/>`;
  }
  return s;
}
