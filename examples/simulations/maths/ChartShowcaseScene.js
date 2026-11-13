/**
 * ChartShowcaseScene - reference for kit/SimChart.js (SVG, DOM). Beats: 0
 * survey bars grow in, 1 the share of heads in coin tosses settles toward 1/2
 * (Toss 10), 2 a 543-seat house: add parties until the coalition passes 272,
 * 3 a production possibility curve with a draggable point. Portrait: the
 * reading cards move under the chart.
 */
import { SvgScene, chip, cardHtml, fill } from 'simulations/base/kit/SimSvg.js';
import { chartFrame, axesSvg, barsSvg, traceSvg, hemicycleSvg, tallySvg, CHART_CSS } from 'simulations/base/kit/SimChart.js';
import { join } from 'simulations/base/kit/SimNumberLine.js';
import { mulberry32 } from 'simulations/base/kit/SimLook.js';
import { fmtNum } from 'simulations/base/kit/SimText.js';

const MAP = [0, 1, 2, 3].map((i) => [{ idx: i, dwellMs: null }]);
const FRUIT = [['mango', 12], ['banana', 7], ['apple', 5], ['guava', 9], ['grapes', 4]];
const PARTIES = [{ n: 168, label: 'Party A', tone: 1 }, { n: 71, label: 'Party B', tone: 3 }, { n: 44, label: 'Party C', tone: 2 }, { n: 23, label: 'Party D', tone: 4 }];
const PPC = (x) => 100 * Math.sqrt(Math.max(0, 1 - (x / 100) ** 2));
const HALF = { 0: '0', 0.25: '1/4', 0.5: '1/2', 0.75: '3/4', 1: '1' };

export class ChartShowcaseScene extends SvgScene {
  static BEAT_STEP_MAP = MAP;
  static ARIA_LABEL = 'Charts: fruit survey bars, the share of heads in coin tosses settling toward one half, a 543-seat house where parties join a coalition to pass 272, and a production possibility curve with a point to drag.';
  static CONTROLS = [
    { type: 'button', id: 'toss', label: 'Toss 10' },
    { type: 'button', id: 'join', label: 'Add a party' },
    { type: 'button', id: 'again', label: 'Start again' },
  ];

  css() { return CHART_CSS; }
  enter() { this.tosses = []; this.joined = 0; this.px = 60; this.won = false; this.fresh = true; }
  isControlHidden(id) { return !({ toss: [1], join: [2], again: [1, 2] }[id] ?? []).includes(this.stepIndex); }
  isControlDisabled(id) { return (id === 'join' && this.joined >= PARTIES.length) || (id === 'toss' && this.tosses.length >= 200); }
  stageHeight(st) { return st.portrait ? [400, 560, 480, 560][this.stepIndex ?? 0] : 440; }

  onControlChange(id) {
    if (this.isControlHidden(id)) return;
    if (id === 'again') this.enter();
    if (id === 'toss') {
      const rnd = mulberry32(17 + this.tosses.length);
      for (let i = 0; i < 10; i++) this.tosses.push(rnd() < 0.5 ? 1 : 0);
    }
    if (id === 'join' && this.joined < PARTIES.length) {
      this.joined += 1;
      const seats = PARTIES.slice(0, this.joined).reduce((s, p) => s + p.n, 0);
      if (seats >= 272 && !this.won) { this.won = true; this.after(0.3, () => this.celebrate()); }
    }
    this.fresh = true;
    this.repaint();
    this.requestUiUpdate?.();
  }

  // Chart area and card area for this orientation.
  areas(st, cardW = 180) {
    return st.portrait
      ? { chart: { x: 0, y: 0, w: st.W, h: st.H - 170 }, card: { x: 0, y: st.H - 156, w: st.W } }
      : { chart: { x: 0, y: 0, w: st.W - cardW - 14, h: st.H }, card: { x: st.W - cardW, y: 0, w: cardW } };
  }

  paint(st) { const out = [this.survey, this.coins, this.house, this.ppc][this.stepIndex].call(this, st); this.fresh = false; return out; }

  survey(st) {
    const f = chartFrame({ rect: { x: 0, y: 0, w: st.W, h: st.H }, x: { cats: FRUIT.map((q) => q[0]), label: 'favourite fruit' }, y: { min: 0, max: 14, ticks: [0, 2, 4, 6, 8, 10, 12, 14], label: 'students' } });
    return { ...join(axesSvg(f), barsSvg(f, FRUIT.map((q, i) => ({ x: i, v: q[1], tone: [2, 3, 6, 1, 5][i] })), { grow: true })),
      head: chip('Class 9 survey: 37 students', 0, 0, { tone: 2, size: 'big', static: true }) };
  }

  coins(st) {
    const A = this.areas(st);
    const f = chartFrame({ rect: A.chart, x: { min: 0, max: 200, ticks: [0, 50, 100, 150, 200], label: 'tosses' }, y: { min: 0, max: 1, ticks: [0, 0.25, 0.5, 0.75, 1], label: 'share of heads', fmt: (v) => HALF[v] } });
    let h = 0;
    const pts = this.tosses.map((v, i) => { h += v; return { x: i + 1, y: h / (i + 1) }; });
    const out = join(axesSvg(f), traceSvg(f, pts, { tone: 1, target: 0.5, targetText: 'one half', draw: this.fresh }));
    const heads = this.tosses.reduce((s, v) => s + v, 0);
    out.over += cardHtml(A.card.x, A.card.y, A.card.w, 'coin', [
      { label: 'tosses', value: fmtNum(this.tosses.length) }, { label: 'heads', value: fmtNum(heads), tone: 1 },
      { label: 'share', value: this.tosses.length ? (heads / this.tosses.length).toFixed(2) : '-', tone: 'warning' },
    ], { tone: 1 });
    if (!st.portrait) out.svg += tallySvg(A.card.x + 8, 170, Math.min(heads, 30), { size: 26, tone: 1 }).svg;
    return { ...out, head: chip(this.tosses.length ? `${this.tosses.length} tosses` : 'press Toss 10', 0, 0, { tone: 1, size: 'big', static: true }) };
  }

  house(st) {
    const inSeats = PARTIES.slice(0, this.joined).reduce((s, p) => s + p.n, 0);
    const R = { x: 20, y: 20, w: st.W - 40, h: Math.min(st.H - 110, (st.W - 40) / 2 + 30) };
    const out = hemicycleSvg(R, { seats: 543, groups: [{ n: inSeats, tone: this.won ? 'good' : 1 }], majority: 272, label: 'seats in the house' });
    const y = R.y + R.h + 36;
    const w = st.portrait ? st.W / 2 : st.W / 4;
    PARTIES.forEach((p, i) => { out.over += chip(`${p.label} ${p.n}`, (i % (st.portrait ? 2 : 4) + 0.5) * w, y + (st.portrait ? Math.floor(i / 2) * 40 : 0), { tone: i < this.joined ? p.tone : 'plain' }); });
    return { ...out, head: chip(this.won ? `coalition: ${inSeats} - a majority!` : `coalition: ${inSeats} seats`, 0, 0, { tone: this.won ? 'good' : 1, size: 'big', static: true }) };
  }

  f3(st) { const A = this.areas(st); return chartFrame({ rect: A.chart, x: { min: 0, max: 100, ticks: [0, 25, 50, 75, 100], label: 'cloth (bales)' }, y: { min: 0, max: 110, ticks: [0, 25, 50, 75, 100], label: 'wheat (tonnes)' } }); }
  pointerDown(p) { const f = this.f3(this.sv); return Math.hypot(p.x - f.px(this.px), p.y - f.py(PPC(this.px))) < 44 ? true : false; }
  pointerMove(p) { const v = Math.max(0, Math.min(100, Math.round(this.f3(this.sv).vx(p.x) / 5) * 5)); if (v === this.px) return false; this.px = v; return true; }

  ppc(st) {
    const f = this.f3(st), A = this.areas(st), x = this.px, y = PPC(x);
    const pts = Array.from({ length: 41 }, (_, i) => ({ x: i * 2.5, y: PPC(i * 2.5) }));
    const out = join(axesSvg(f), traceSvg(f, pts, { tone: 3, width: 7, end: false }));
    const X = f.px(x), Y = f.py(y);
    out.svg += `<path d="M${X} ${Y}V${f.py(0)}M${X} ${Y}H${f.px(0)}" style="fill:none;stroke:var(--sim-label);stroke-width:2;stroke-dasharray:5 6;opacity:0.6"/>`
      + `<g class="sv-drag"><circle cx="${X}" cy="${Y}" r="20" class="sv-breathe" ${fill('var(--sim-series-2)', 'opacity:0.25')}/><circle cx="${X}" cy="${Y}" r="11" ${fill('var(--sim-series-2)', 'stroke:var(--sim-bg-surface);stroke-width:3')}/></g>`;
    out.over += cardHtml(A.card.x, A.card.y, A.card.w, 'choice', [
      { label: 'cloth', value: `${x} bales`, tone: 1 }, { label: 'wheat', value: `${Math.round(y)} t`, tone: 3 }, { label: 'give up', value: `${Math.round(100 - y)} t`, tone: 'bad' },
    ], { tone: 2 });
    return { ...out, head: chip('drag the point along the curve', 0, 0, { tone: 2, size: 'big', static: true }) };
  }
}
