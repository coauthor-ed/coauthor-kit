/**
 * TimeHistogramTraceScene - plain-look anchor: a histogram of counts per day on a date axis with a
 * moving-average trace over it (kit/SimChart.js timeAxis + histogramSvg + traceSvg). Illustrative data:
 * daily counts over six weeks with a weekly dip at weekends.
 *   Beat 0: the daily bars grow in. The read: day-to-day counts jump about.
 *   Beat 1: a moving average draws over the bars; the learner picks the window (1, 3 or 7 days) in the
 *           scene. A 7-day window holds one of every weekday, so the weekend dip drops out and the
 *           trend shows. The peak of the average is read from the same numbers the trace draws.
 *   Beat 2: the same counts binned by week. The total is the same; the shape is the trend.
 * Controls live in the scene (a radio group in the title row). Portrait: its own height, same layout.
 */
import { SvgScene, chip } from 'simulations/base/kit/SimSvg.js';
import { chartFrame, timeAxis, axesSvg, histogramSvg, traceSvg, dayText, dayNumber } from 'simulations/base/kit/SimChart.js';
import { join } from 'simulations/base/kit/SimNumberLine.js';
import { mulberry32 } from 'simulations/base/kit/SimLook.js';
import { fmtNum } from 'simulations/base/kit/SimText.js';
import { flowChoiceHtml, bindFlow } from 'simulations/base/kit/SimFlowDom.js';

const FROM = '2025-02-03', DAYS = 42;   // a Monday; six whole weeks
const D0 = dayNumber(FROM);
const isoOf = (n) => new Date(n * 86400000).toISOString().slice(0, 10);

// Counts per day: a rise and fall over the six weeks, fewer at weekends, a little noise. Seeded.
const COUNTS = (() => {
  const rnd = mulberry32(11);
  return Array.from({ length: DAYS }, (_, i) => {
    const wd = (i % 7);                       // 0 Mon .. 6 Sun
    const trend = 14 + 46 * Math.exp(-(((i - 21) / 10) ** 2));
    const week = wd === 5 ? 0.7 : wd === 6 ? 0.45 : 1;
    return Math.max(0, Math.round(trend * week + (rnd() - 0.5) * 8));
  });
})();
const DATES = COUNTS.flatMap((n, i) => Array.from({ length: n }, () => isoOf(D0 + i)));
const TOTAL = COUNTS.reduce((s, v) => s + v, 0);

// Centred moving average over w days (only where the whole window fits).
function average(w) {
  const h = (w - 1) / 2, out = [];
  for (let i = h; i < DAYS - h; i++) {
    let s = 0;
    for (let k = i - h; k <= i + h; k++) s += COUNTS[k];
    out.push({ i, v: s / w });
  }
  return out;
}

export class TimeHistogramTraceScene extends SvgScene {
  static BEAT_STEP_MAP = [[{ idx: 0, dwellMs: null }], [{ idx: 1, dwellMs: null }], [{ idx: 2, dwellMs: null }]];
  static ARIA_LABEL = 'Counts per day for six weeks as bars on a date axis, illustrative data. A moving average drawn over the bars: with a 7-day window the weekend dips drop out and the rise and fall shows. Then the same counts binned by week.';
  static CONTROLS = [];

  async setup() {
    await super.setup();
    bindFlow(this.root, { action: (name, v) => { if (name === 'win') this.pick(Number(v)); } });
  }

  enter() { this.win = 7; this.fresh = true; }
  stageHeight(st) { return st.portrait ? 440 : 400; }

  pick(w) {
    if (this.stepIndex !== 1 || w === this.win) return;
    this.win = w;
    this.fresh = true;
    this.repaint();
  }

  frame(st, bin) {
    const T = timeAxis({ from: FROM, to: isoOf(D0 + DAYS - 1), bin, want: st.portrait ? 3 : 6 });
    const max = bin === 'week' ? 400 : 70;   // headroom for the count chips over the week bars
    const f = chartFrame({ rect: { x: 0, y: 0, w: st.W, h: st.H - 26 },
      x: { ...T, label: bin === 'week' ? 'Week starting' : 'Date' },
      y: { min: 0, max, ticks: bin === 'week' ? [0, 100, 200, 300, 400] : [0, 20, 40, 60], label: bin === 'week' ? 'count per week' : 'count per day' } });
    return { T, f };
  }

  paint(st) {
    const out = [this.daily, this.smooth, this.weekly][this.stepIndex].call(this, st);
    out.over += `<span class="ths-note" style="left:${st.W - 4}px;top:${st.H - 8}px">Illustrative data</span>`;
    this.fresh = false;
    return out;
  }

  daily(st) {
    const { T, f } = this.frame(st, 'day');
    const out = join(axesSvg(f), histogramSvg(f, T.bins(DATES), { tone: 1, grow: this.fresh }));
    const hi = Math.max(...COUNTS), lo = Math.min(...COUNTS);
    return { ...out, head: chip(`Each day: from ${lo} to ${hi}`, 0, 0, { tone: 'plain', static: true }) };
  }

  smooth(st) {
    const { T, f } = this.frame(st, 'day');
    const avg = average(this.win);
    const top = avg.reduce((b, p) => (p.v > b.v ? p : b), avg[0]);
    const bars = T.bins(DATES).map((b) => ({ ...b, tone: 8 }));
    const out = join(axesSvg(f), histogramSvg(f, bars), traceSvg(f, avg.map((p) => ({ x: T.x(isoOf(D0 + p.i)), y: p.v })), { tone: 1, width: 5, end: false, draw: this.fresh }));
    const x = f.px(T.x(isoOf(D0 + top.i))), y = f.py(top.v);
    out.svg += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" style="fill:var(--sim-series-2);stroke:var(--sim-bg-surface);stroke-width:3"/>`;
    out.over += chip(`peak ${fmtNum(top.v, { dp: 1 })} on ${dayText(D0 + top.i)}`, Math.min(st.W - 90, x + 8), y - 24, { tone: 2, size: 'sm' });
    const read = this.win === 7 ? 'one of every weekday: the dip is gone' : this.win === 3 ? 'weekends still pull it down' : 'no smoothing: the raw days';
    const head = flowChoiceHtml({ action: 'win', label: 'Average over', value: this.win, options: [1, 3, 7].map((v) => ({ value: v, label: `${v}-day` })) })
      + chip(read, 0, 0, { tone: 'plain', static: true });
    return { ...out, head };
  }

  weekly(st) {
    const { T, f } = this.frame(st, 'week');
    const bins = T.bins(DATES);
    const out = join(axesSvg(f), histogramSvg(f, bins, { tone: 1 }));
    for (const b of bins) out.over += chip(fmtNum(b.n), f.px((b.x0 + b.x1) / 2), f.py(b.n) - 18, { tone: 'plain', size: 'sm' });
    const sum = bins.reduce((s, b) => s + b.n, 0);
    return { ...out, head: chip(`By week: ${fmtNum(sum)} in all, the same ${fmtNum(TOTAL)} as by day`, 0, 0, { tone: 'plain', static: true }) };
  }

  css() {
    return `
.ths-note { position: absolute; transform: translate(-100%, -50%); font: 600 var(--sim-text-sm)/1 var(--sim-font); color: var(--sim-label-muted); white-space: nowrap; }
.svs-head .sflow-choice { flex: none; }
`;
  }
}
