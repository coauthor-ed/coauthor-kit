/**
 * SvgPlotChemistryShowcaseScene - kit/SimPlotSvg.js doing a chemistry job.
 *   Beat 0: the cooling curve of stearic acid: the axes build, the line draws on, a test tube beside it
 *           shows the head's temperature and freezes as the line crosses the flat part; the callout fires
 *           exactly when the head reaches the start of freezing (plotHit + calloutSvg)
 *   Beat 1: reaction rate: gas made in the first minute by marble chips in acid at four temperatures;
 *           bars grow from zero, lagged (barsOnSvg), one callout on the fastest
 * Tap skips a running build to its end; Replay runs it again. Portrait is its own layout.
 */
import { SvgScene, chip, liveChip, fill, shade, glossOf } from 'simulations/base/kit/SimSvg.js';
import { ease } from 'simulations/base/kit/SimAnim.js';
import {
  plotFrame, plotPanelSvg, axesOnSvg, plotLineSvg, barsOnSvg, calloutSvg, plotHit, toScreen,
  barEnd, AXES, PLOT, CALLOUT,
} from 'simulations/base/kit/SimPlotSvg.js';

const DEG = '\u00b0C';
const MAP = [0, 1].map((i) => [{ idx: i, dwellMs: null }]);
const TITLES = ['Stearic acid cools', 'Hotter acid, faster gas'];
const CAPS = [
  ['Flat part: the liquid freezes at a steady 69 ' + DEG, 'Flat: freezing at 69 ' + DEG],
  ['Bars start at zero, so rates compare fairly', 'Bars start at zero'],
];
const FREEZE = 69;
const tempAt = (m) => (m <= 4 ? FREEZE + 21 * (1 - m / 4) ** 1.7 : m <= 10 ? FREEZE : 25 + (FREEZE - 25) * Math.exp(-(m - 10) / 9));
const COOL = Array.from({ length: 65 }, (_, i) => [i / 4, tempAt(i / 4)]);
const FREEZE_I = 16;
const LINE = { dur: 2.6, delay: AXES.end + 0.1, ease: ease.linear, by: 'x', tone: 6 };
const RATE = [['20 ' + DEG, 12], ['30 ' + DEG, 21], ['40 ' + DEG, 38], ['50 ' + DEG, 70]];
const FAST_I = 3;
const BARS_AT = AXES.end + 0.1;
const f1 = (v) => v.toFixed(1);

export class SvgPlotChemistryShowcaseScene extends SvgScene {
  static BEAT_STEP_MAP = MAP;
  static ARIA_LABEL = 'A cooling curve for stearic acid draws itself while a test tube beside it cools and freezes; the curve stays flat at 69 degrees while it freezes. Then bars show the gas made in one minute at four temperatures: the hotter the acid, the faster the reaction.';
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
      g.f = plotFrame(rect, { x: { min: 0, max: 16, n: 8, ticks: P ? [0, 4, 8, 12, 16] : undefined, label: 'Time (min)' }, y: { min: 40, max: 90, label: 'Temperature (' + DEG + ')' } });
      g.pts = toScreen(g.f, COOL);
    } else {
      g.f = plotFrame(rect, { zero: true, x: { cats: RATE.map((r) => r[0]), label: 'Acid temperature' }, y: { min: 0, max: 80, n: 4, label: 'Gas in 1 min (mL)' } });
    }
    return g;
  }

  plan(step, g) {
    if (step === 0) {
      const hit = plotHit(g.pts, FREEZE_I, LINE);
      return { hit, cap: hit + 0.6, end: Math.max(LINE.delay + LINE.dur, hit + CALLOUT.done) + 0.1 };
    }
    const hit = BARS_AT + barEnd(FAST_I, RATE.length);
    return { hit, cap: hit + 0.3, end: Math.max(BARS_AT + PLOT.bars, hit + CALLOUT.done) + 0.1 };
  }

  paint(st) {
    const g = this.geo(st), title = TITLES[this.stepIndex];
    return { svg: plotPanelSvg(g.f), head: chip(title, 0, 0, { tone: 'plain', size: st.portrait && title.length > 18 ? null : 'big', static: true }) };
  }

  animate(st, t) {
    const live = this.live, g = this.geo(st), step = this.stepIndex, P = this.plan(step, g), f = g.f;
    axesOnSvg(live, 'axes', f, t);
    if (step === 0) {
      const r = plotLineSvg(live, 'line', g.pts, t, LINE);
      const mins = r.p > 0 ? f.vx(r.head[0]) : 0;
      tube(live, f.plot.x + f.plot.w - (g.P ? 46 : 74), f.plot.y + (g.P ? 44 : 36), tempAt(mins), Math.max(0, Math.min(1, (mins - 4) / 6)), Math.min(1, t / AXES.end));
      const [x, y] = g.pts[FREEZE_I];
      calloutSvg(live, 'call', t - P.hit, g.P ? { x, y, tx: x + 24, ty: y + 90, text: 'Freezing starts', tone: 6 } : { x, y, tx: x + 8, ty: y + 56, text: 'Freezing starts', align: 'left', tone: 6 });
    } else {
      const r = barsOnSvg(live, 'bars', f, RATE.map(([, v], i) => ({ x: i, v, tone: i === FAST_I ? 6 : 5 })), t - BARS_AT);
      const [x, y] = r.tops[FAST_I];
      calloutSvg(live, 'call', t - P.hit, { x, y, tx: x - 30, ty: y + (g.P ? 0 : 6), text: g.P ? 'Fastest' : 'Hottest: fastest', align: 'right', tone: 6 });
    }
    if (t >= P.cap) liveChip(live, 'cap', CAPS[step][g.P ? 1 : 0], g.W / 2, g.capY, { tone: 'plain', cls: 'sv-pop' });
  }
}

// A test tube of stearic acid at (x, y) (its top centre): the liquid turns to waxy solid by `frozen`
// (0..1) from the bottom up, a thermometer stands in it, and a chip reads the temperature.
function tube(live, x, y, temp, frozen, k) {
  const liq = 'color-mix(in oklab, var(--sim-series-6) 55%, var(--sim-bg-surface))';
  const sol = 'color-mix(in oklab, var(--sim-label-muted) 55%, var(--sim-bg-surface))';
  const glass = 'color-mix(in oklab, var(--sim-glass) 35%, var(--sim-bg-surface))';
  const h = 112, w = 40, lt = y + 30, lh = h - 30 - w / 2;
  const tubeD = `M${f1(x - w / 2)} ${y}V${f1(y + h - w / 2)}A${w / 2} ${w / 2} 0 0 0 ${f1(x + w / 2)} ${f1(y + h - w / 2)}V${y}`;
  let html = `<path d="${tubeD}Z" ${fill('var(--sim-bg-surface)')}/><path d="${tubeD}Z" ${fill(glass, 'opacity:0.6')}/>`
    + `<path d="${tubeD}Z" style="fill:${liq};clip-path:inset(${f1(lt - y)}px 0 0 0)"/>`;
  const fh = (lh + w / 2) * frozen;
  if (fh > 0.5) {
    html += `<path d="${tubeD}Z" style="fill:${sol};clip-path:inset(${f1(h - fh)}px 0 0 0)"/>`;
    for (let i = 0; i < 6; i++) {
      const cy = y + h - 10 - i * 12;
      if (cy < y + h - fh + 4) break;
      html += `<rect x="${f1(x - 9 + (i % 2) * 8)}" y="${f1(cy - 3)}" width="8" height="5" rx="1.5" transform="rotate(${i % 2 ? 30 : -25} ${f1(x - 5 + (i % 2) * 8)} ${f1(cy)})" ${fill(glossOf(sol, 40))}/>`;
    }
  }
  html += `<path d="${tubeD}" style="fill:none;stroke:var(--sim-label-muted);stroke-width:3;stroke-linejoin:round"/>`
    + `<rect x="${f1(x - w / 2 - 5)}" y="${y - 4}" width="${w + 10}" height="8" rx="4" ${fill('var(--sim-label-muted)')}/>`;
  // Thermometer: the red column tracks the temperature (40..90 C maps over its stem).
  const stemTop = y - 30, stemBot = y + h - 22, col = shade('var(--sim-bad)', 92);
  const level = stemBot - ((temp - 40) / 50) * (stemBot - stemTop - 10);
  html += `<rect x="${f1(x + 2)}" y="${stemTop}" width="9" height="${f1(stemBot - stemTop)}" rx="4.5" ${fill('var(--sim-bg-surface)', 'stroke:var(--sim-label-muted);stroke-width:2')}/>`
    + `<rect x="${f1(x + 4.5)}" y="${f1(level)}" width="4" height="${f1(stemBot - level)}" rx="2" ${fill(col)}/>`
    + `<circle cx="${f1(x + 6.5)}" cy="${stemBot + 2}" r="7" ${fill(col, 'stroke:var(--sim-bg-surface);stroke-width:2')}/>`;
  const e = live.shape('tube', 'g', { html });
  live.css(e, { opacity: k < 1 ? k.toFixed(3) : null });
  liveChip(live, 'temp', `${Math.round(temp)} ${DEG}`, x, y + h + 24, { tone: 6, size: 'sm', alpha: k });
}
