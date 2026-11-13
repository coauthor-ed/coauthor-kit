/**
 * SvgRigChemistryShowcaseScene - kit/SimRigSvg.js doing a chemistry job: Boyle's law in a gas piston.
 * A crank (crankSlider) drives a piston into a sealed cylinder of gas; the particles share the space left,
 * and a gauge reads the pressure (p x V stays 40 at a fixed temperature).
 *   Beat 0: the crank turns half a turn: the gas is squeezed from 40 mL to 20 mL and the pressure doubles
 *           (liveCrank, crankAngleAt)
 *   Beat 1: turn it yourself; the point rides the p-V curve on a SimChart frame (chartFrame + axesSvg)
 * A tap during the move skips to its end; after that, drag round the wheel (smoothed by trackPoint).
 */
import { SvgScene, chip, liveChip, cardHtml, fill, shade } from 'simulations/base/kit/SimSvg.js';
import { reducedMotion, hash2 } from 'simulations/base/kit/SimAnim.js';
import { liveCrank, trackPoint, crankAngleAt, crankSlider } from 'simulations/base/kit/SimRigSvg.js';
import { chartFrame, axesSvg } from 'simulations/base/kit/SimChart.js';

const TAU = Math.PI * 2;
const MAP = [0, 1].map((i) => [{ idx: i, dwellMs: null }]);
const TITLES = ['Squeeze the gas', 'p \u00d7 V stays the same'];
const HINTS = ['Tap to skip', 'Drag round the wheel'];
const ENDS = [2.6, 0.2];
const N = 26, PV = 40;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const f1 = (v) => v.toFixed(1);

export class SvgRigChemistryShowcaseScene extends SvgScene {
  static BEAT_STEP_MAP = MAP;
  static ARIA_LABEL = 'A crank pushes a piston into a sealed cylinder of gas particles. Squeezed from 40 to 20 millilitres, the particles crowd together and the pressure gauge doubles from 1 to 2 atmospheres: pressure times volume stays 40.';
  static CONTROLS = [{ type: 'button', id: 'replay', label: 'Replay' }];

  stageHeight(st) { return st.portrait ? 640 : 430; }

  enter() { this.goal = null; this.play(ENDS[this.stepIndex]); }

  onControlChange(id) {
    if (id === 'replay') { this.clockReset(); this.enter(); }
    this.requestUiUpdate?.();
  }

  geo(st) {
    const P = st.portrait, W = st.W, H = st.H, s = P ? 0.8 : 1;
    const g = { P, W, H, s, r: 40 * s, rod: 120 * s, pw: 96 * s, ph: 36 * s };
    g.C = P ? { x: W / 2, y: 298 } : { x: 150, y: 342 };
    g.head = 2 * g.r;   // headroom = crank travel, so the gas goes from twice to once the stroke: 40 mL to 20 mL
    const rect = P ? { x: 8, y: 380, w: W - 16, h: H - 380 - 44 } : { x: 300, y: 92, w: W - 312, h: 290 };
    g.f = chartFrame({ rect, x: { min: 0, max: 45, ticks: [0, 10, 20, 30, 40], label: 'Volume (mL)' }, y: { min: 0, max: 2.5, ticks: [0, 1, 2], label: 'Pressure (atm)' } });
    return g;
  }

  // Crank angle 0 = piston at the bottom of its travel (gas roomiest); PI = at the top (squeezed).
  script(t) {
    if (this.stepIndex !== 0 || t >= ENDS[0] || reducedMotion()) return null;
    return { x: crankAngleAt(t - 0.3, 0.5, 2.2, 0), y: 0 };
  }

  parked() { return { x: Math.PI, y: 0 }; }

  pointerDown(p) {
    if (this.skip()) return false;
    this.aim(p);
    return true;
  }

  pointerMove(p) { this.aim(p); return false; }

  aim(p) {
    const g = this.geo(this.sv);
    const a = Math.atan2(p.y - g.C.y, p.x - g.C.x) - Math.PI / 2;
    const cur = (this.goal ?? this.parked()).x;
    this.goal = { x: a + Math.round((cur - a) / TAU) * TAU, y: 0 };
    this.liveFrame();
  }

  paint(st) {
    const g = this.geo(st);
    let svg = '';
    if (this.stepIndex === 1) {
      svg += axesSvg(g.f).svg;
      const pts = [];
      for (let v = 16; v <= 44; v += 1) pts.push(`${f1(g.f.px(v))} ${f1(g.f.py(PV / v))}`);
      svg += `<path d="M${pts.join('L')}" style="fill:none;stroke:var(--sim-accent);stroke-width:3;stroke-dasharray:7 7;opacity:0.7"/>`;
    }
    return { svg, head: chip(TITLES[this.stepIndex], 0, 0, { tone: 'plain', size: st.portrait ? null : 'big', static: true }), floor: g.P ? undefined : g.H - 30 };
  }

  animate(st, t) {
    const live = this.live, g = this.geo(st), step = this.stepIndex;
    const sc = this.script(t);
    const a = trackPoint(live, 'ang', sc ?? this.goal ?? this.parked(), { snap: !!sc, preset: 'smooth' }).x;
    // The crank: axis up, so the pin starts at the bottom (angle PI from the axis) when a = 0.
    const ang = a + Math.PI;
    const k0 = crankSlider(g.C, g.r, g.rod, ang, -Math.PI / 2);
    const top = k0.sMax + g.ph / 2 + g.head;
    const gasH = top - k0.s - g.ph / 2;                 // px of gas above the piston
    const V = 20 * gasH / g.head, p = PV / V;            // mL, atm
    const k = liveCrank(live, 'crank', g.C, g.r, g.rod, ang, -Math.PI / 2, { piston: { w: g.pw, h: g.ph }, headroom: g.head,
      gas: `color-mix(in oklab, var(--sim-series-5) ${Math.round(10 + 22 * (p - 1))}%, transparent)` });
    this.particles(live, g, top, k.s + g.ph / 2, a);
    this.gauge(live, g, g.C.x + g.pw / 2 + 52 * g.s, g.C.y - top + 24, p);
    if (step === 0) {
      live.el('card', { tag: 'div', html: cardHtml(g.P ? 14 : 330, g.P ? 400 : 40, g.P ? g.W - 28 : 220, 'Gas', [
        { label: 'Volume', value: `${Math.round(V)} mL`, tone: 5 },
        { label: 'Pressure', value: `${p.toFixed(1)} atm`, tone: 6 },
      ], { tone: 'accent' }) });
      liveChip(live, 'pv', `p \u00d7 V = ${p.toFixed(1)} \u00d7 ${Math.round(V)} = ${Math.round(p * V)}`, g.P ? g.W / 2 : 440, g.P ? g.H - 70 : 170, { tone: 'good' });
    } else {
      const f = g.f, x = f.px(V), y = f.py(p);
      const dot = live.shape('dot', 'circle');
      live.attrs(dot, { cx: f1(x), cy: f1(y), r: 9 });
      live.css(dot, { fill: 'var(--sim-accent)', stroke: 'var(--sim-bg-surface)', 'stroke-width': 3 });
      liveChip(live, 'pv', `${p.toFixed(1)} \u00d7 ${Math.round(V)} = ${Math.round(p * V)}`, clamp(x + 70, f.plot.x + 70, f.plot.x + f.plot.w - 70), y - 26, { tone: 'good', size: 'sm' });
    }
    liveChip(live, 'hint', HINTS[step], g.P ? g.W / 2 : 150, g.P ? g.H - 22 : g.H - 14, { tone: 'accent', size: 'sm' });
  }

  // Gas particles in the space between the cylinder head (top px above C) and the piston face (face px).
  particles(live, g, top, face, a) {
    const inner = g.pw - 14, x0 = g.C.x - inner / 2;
    let html = '';
    for (let i = 0; i < N; i++) {
      const u = hash2(i, 11), v = hash2(i, 29);
      const wob = Math.sin(a * 3 + i * 1.7) * 0.06;
      const x = x0 + 8 + clamp(u + wob, 0, 1) * (inner - 16);
      const h = top - face - 18;
      const y = g.C.y - face - 9 - clamp(v - wob, 0, 1) * h;
      const c = i % 3 ? 'var(--sim-oxygen)' : 'var(--sim-co2)';
      html += `<circle cx="${f1(x)}" cy="${f1(y + 1.5)}" r="${f1(6 * g.s)}" ${fill(shade(c, 60))}/><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(6 * g.s)}" ${fill(c)}/>`;
    }
    live.shape('gas', 'g', { html });
  }

  // A pressure gauge on a pipe from the cylinder head; the needle sweeps 0..3 atm over 240 degrees.
  gauge(live, g, x, y, p) {
    const R = 30 * g.s + 4, a = (-210 + (clamp(p, 0, 3) / 3) * 240) * Math.PI / 180;
    let ticks = '';
    for (let i = 0; i <= 3; i++) {
      const q = (-210 + i * 80) * Math.PI / 180;
      ticks += `<line x1="${f1(x + Math.cos(q) * (R - 4))}" y1="${f1(y + Math.sin(q) * (R - 4))}" x2="${f1(x + Math.cos(q) * (R - 10))}" y2="${f1(y + Math.sin(q) * (R - 10))}" style="stroke:var(--sim-label);stroke-width:2.5;stroke-linecap:round"/>`;
    }
    live.shape('gauge', 'g', { html: `<rect x="${f1(g.C.x + g.pw / 2)}" y="${f1(y - 4)}" width="${f1(x - R - g.C.x - g.pw / 2 + 2)}" height="8" ${fill('var(--sim-stroke)')}/>`
      + `<circle cx="${f1(x)}" cy="${f1(y + 4)}" r="${f1(R)}" ${fill(shade('var(--sim-stroke)', 70))}/><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(R)}" ${fill('var(--sim-bg-surface)', 'stroke:var(--sim-stroke);stroke-width:4')}/>`
      + ticks
      + `<line x1="${f1(x)}" y1="${f1(y)}" x2="${f1(x + Math.cos(a) * (R - 8))}" y2="${f1(y + Math.sin(a) * (R - 8))}" style="stroke:var(--sim-bad);stroke-width:4;stroke-linecap:round"/>`
      + `<circle cx="${f1(x)}" cy="${f1(y)}" r="5" ${fill('var(--sim-label)')}/>` });
    liveChip(live, 'atm', `${p.toFixed(1)} atm`, x, y + R + 18, { tone: 6, size: 'sm' });
  }
}
