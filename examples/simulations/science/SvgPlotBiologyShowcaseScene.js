/**
 * SvgPlotBiologyShowcaseScene - kit/SimPlotSvg.js doing a biology job.
 *   Beat 0: yeast population growth in a flask of sugar solution: the axes build, the S-shaped curve
 *           draws on by time while the flask fills with cells (one dot per 10 cells); the callout fires
 *           exactly when the head reaches the level-off (plotHit + calloutSvg)
 *   Beat 1: bacteria doubling: cell counts every 20 minutes grow from zero as bars, lagged (barsOnSvg),
 *           one callout on the last bar
 * Tap skips a running build to its end; Replay runs it again. Portrait is its own layout.
 */
import { SvgScene, chip, liveChip, fill, shade, glossOf } from 'simulations/base/kit/SimSvg.js';
import { ease, hash2 } from 'simulations/base/kit/SimAnim.js';
import {
  plotFrame, plotPanelSvg, axesOnSvg, plotLineSvg, barsOnSvg, calloutSvg, plotHit, toScreen,
  barEnd, AXES, PLOT, CALLOUT,
} from 'simulations/base/kit/SimPlotSvg.js';

const MAP = [0, 1].map((i) => [{ idx: i, dwellMs: null }]);
const TITLES = ['Yeast in a flask', 'Bacteria double'];
const CAPS = [
  ['Slow start, fast growth, then food runs low', 'Slow, fast, then level'],
  ['Each bar is twice the one before', 'Each bar is twice the last'],
];
const K = 400, N0 = 8, R = 0.55;
const popAt = (h) => K / (1 + (K / N0 - 1) * Math.exp(-R * h));
const GROW = Array.from({ length: 33 }, (_, i) => [i / 2, popAt(i / 2)]);
const LEVEL_I = GROW.findIndex(([, n]) => n >= 0.95 * K);
const LINE = { dur: 2.8, delay: AXES.end + 0.1, ease: ease.linear, by: 'x', tone: 3 };
const DOUBLE = [1, 2, 4, 8, 16, 32];
const LAST_I = DOUBLE.length - 1;
const BARS_AT = AXES.end + 0.1;
const f1 = (v) => v.toFixed(1);

export class SvgPlotBiologyShowcaseScene extends SvgScene {
  static BEAT_STEP_MAP = MAP;
  static ARIA_LABEL = 'A population curve for yeast in a flask draws itself while the flask fills with cells: slow at first, then fast, then levelling off at about 400 cells per drop as the sugar runs low. Then bars show bacteria doubling every 20 minutes, from 1 to 32.';
  static CONTROLS = [{ type: 'button', id: 'replay', label: 'Replay' }];

  stageHeight(st) { return st.portrait ? 540 : 430; }

  enter(step) { this.play(this.plan(step, this.geo(this.sv)).end); }

  onControlChange(id) {
    if (id === 'replay') { this.clockReset(); this.enter(this.stepIndex); }
    this.requestUiUpdate?.();
  }

  pointerDown() { this.skip(); return false; }

  geo(st) {
    const P = st.portrait, W = st.W, H = st.H, step = this.stepIndex;
    const rect = { x: 6, y: 14, w: W - 12, h: H - 14 - (P ? 64 : 58) };
    const g = { P, W, H, capY: H - (P ? 30 : 26) };
    if (step === 0) {
      g.f = plotFrame(rect, { x: { min: 0, max: 16, n: 8, ticks: P ? [0, 4, 8, 12, 16] : undefined, label: 'Time (hours)' }, y: { min: 0, max: K, n: 4, label: 'Cells per drop' } });
      g.pts = toScreen(g.f, GROW);
    } else {
      g.f = plotFrame(rect, { zero: true, x: { cats: DOUBLE.map((_, i) => String(i * 20)), label: 'Time (min)' }, y: { min: 0, max: 32, n: 4, label: 'Bacteria' } });
    }
    return g;
  }

  plan(step, g) {
    if (step === 0) {
      const hit = plotHit(g.pts, LEVEL_I, LINE);
      return { hit, cap: hit + 0.4, end: Math.max(LINE.delay + LINE.dur, hit + CALLOUT.done) + 0.1 };
    }
    const hit = BARS_AT + barEnd(LAST_I, DOUBLE.length);
    return { hit, cap: hit + 0.3, end: Math.max(BARS_AT + PLOT.bars, hit + CALLOUT.done) + 0.1 };
  }

  paint(st) {
    const g = this.geo(st), title = TITLES[this.stepIndex];
    return { svg: plotPanelSvg(g.f), head: chip(title, 0, 0, { tone: 'plain', size: 'big', static: true }) };
  }

  animate(st, t) {
    const live = this.live, g = this.geo(st), step = this.stepIndex, P = this.plan(step, g), f = g.f;
    axesOnSvg(live, 'axes', f, t);
    if (step === 0) {
      const r = plotLineSvg(live, 'line', g.pts, t, { ...LINE, area: f.plot.y + f.plot.h, areaAlpha: 0.1 });
      const n = r.p > 0 ? f.vy(r.head[1]) : N0;
      flask(live, f.plot.x + (g.P ? 62 : 84), f.plot.y + (g.P ? 22 : 18), n, Math.min(1, t / AXES.end), g.P ? 0.85 : 1);
      const [x, y] = g.pts[LEVEL_I];
      calloutSvg(live, 'call', t - P.hit, { x, y, tx: x + (g.P ? 0 : 10), ty: y + (g.P ? 70 : 80), text: g.P ? 'Levels off' : 'Food runs low: it levels off', tone: 3 });
    } else {
      const r = barsOnSvg(live, 'bars', f, DOUBLE.map((v, i) => ({ x: i, v, tone: i === LAST_I ? 3 : 5 })), t - BARS_AT);
      const [x, y] = r.tops[LAST_I];
      calloutSvg(live, 'call', t - P.hit, { x, y, tx: x - 34, ty: y + 18, text: g.P ? '32 cells' : '32 cells after 100 min', align: 'right', tone: 3 });
    }
    if (t >= P.cap) liveChip(live, 'cap', CAPS[step][g.P ? 1 : 0], g.W / 2, g.capY, { tone: 'plain', cls: 'sv-pop' });
  }
}

// A conical flask whose top centre is (x, y), with one yeast cell per 10 (seeded spots, so the same
// count always shows the same picture) and a count chip under it. s scales the flask.
function flask(live, x, y, n, k, s) {
  const glass = 'color-mix(in oklab, var(--sim-glass) 30%, var(--sim-bg-surface))';
  const broth = 'color-mix(in oklab, var(--sim-series-8) 35%, var(--sim-bg-surface))';
  const cell = 'var(--sim-series-3)';
  const w = 98 * s, h = 112 * s, neck = 26 * s, nh = 30 * s;
  const d = `M${f1(x - neck / 2)} ${f1(y)}V${f1(y + nh)}L${f1(x - w / 2)} ${f1(y + h - 10)}Q${f1(x - w / 2 - 2)} ${f1(y + h)} ${f1(x - w / 2 + 10)} ${f1(y + h)}`
    + `H${f1(x + w / 2 - 10)}Q${f1(x + w / 2 + 2)} ${f1(y + h)} ${f1(x + w / 2)} ${f1(y + h - 10)}L${f1(x + neck / 2)} ${f1(y + nh)}V${f1(y)}Z`;
  const top = y + nh + (h - nh) * 0.32;
  let html = `<path d="${d}" ${fill('var(--sim-bg-surface)')}/><path d="${d}" ${fill(glass)}/>`
    + `<path d="${d}" style="fill:${broth};clip-path:inset(${f1(top - y)}px 0 0 0)"/>`;
  const dots = Math.round(n / 10);
  for (let i = 0; i < dots; i++) {
    const v = hash2(i, 3), u = hash2(i, 7);
    const yy = top + 8 + v * (y + h - top - 16);
    const half = (w / 2 - 10) * ((yy - y - nh) / (h - nh)) + neck / 2 - 6;
    const xx = x + (u * 2 - 1) * Math.max(4, half);
    html += `<circle cx="${f1(xx)}" cy="${f1(yy + 1.2)}" r="${f1(3.4 * s)}" ${fill(shade(cell, 65))}/><circle cx="${f1(xx)}" cy="${f1(yy)}" r="${f1(3.4 * s)}" ${fill(cell)}/>`;
    if (i % 3 === 0) html += `<circle cx="${f1(xx + 3 * s)}" cy="${f1(yy - 2.5 * s)}" r="${f1(1.8 * s)}" ${fill(cell)}/>`;
  }
  html += `<path d="${d}" style="fill:none;stroke:var(--sim-label-muted);stroke-width:3;stroke-linejoin:round"/>`
    + `<rect x="${f1(x - neck / 2 - 5)}" y="${f1(y - 4)}" width="${f1(neck + 10)}" height="8" rx="4" ${fill('var(--sim-label-muted)')}/>`
    + `<rect x="${f1(x - w * 0.3)}" y="${f1(top + 6)}" width="4" height="${f1((y + h - top) * 0.5)}" rx="2" ${fill(glossOf(glass, 30), 'opacity:0.7')}/>`;
  const e = live.shape('flask', 'g', { html });
  live.css(e, { opacity: k < 1 ? k.toFixed(3) : null });
  liveChip(live, 'count', `${Math.round(n)} cells`, x, y + h + 22, { tone: 3, size: 'sm', alpha: k });
}
