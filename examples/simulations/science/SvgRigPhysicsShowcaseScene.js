/**
 * SvgRigPhysicsShowcaseScene - kit/SimRigSvg.js doing a physics job: simple machines.
 *   Beat 0: a lever lifts a heavy stone with a small push: effort x effort arm = load x load arm
 *           (liveLever, beamPoint)
 *   Beat 1: a crank turns and drives a piston up and down, as in an engine; the gas above it glows as it is
 *           squeezed (liveCrank, crankAngleAt)
 * Each beat plays a short scripted move, then parks. A tap during the move skips to its end; after that,
 * drag to drive it (smoothed on the clock by trackPoint).
 */
import { SvgScene, chip, liveChip, cardHtml, fill, shade, glossOf, tone } from 'simulations/base/kit/SimSvg.js';
import { keys, ease, reducedMotion } from 'simulations/base/kit/SimAnim.js';
import { liveLever, liveCrank, beamPoint, trackPoint, crankAngleAt } from 'simulations/base/kit/SimRigSvg.js';

const TAU = Math.PI * 2;
const MAP = [0, 1].map((i) => [{ idx: i, dwellMs: null }]);
const TITLES = ['A lever: small push, big lift', 'A crank drives a piston'];
const HINTS = ['Drag the long end up or down', 'Drag round the wheel'];
const ENDS = [1.9, 3.6];
const MAXT = 0.3, EFF_N = 100, EFF_M = 2.1, LOAD_M = 0.9;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const f1 = (v) => v.toFixed(1);

export class SvgRigPhysicsShowcaseScene extends SvgScene {
  static BEAT_STEP_MAP = MAP;
  static ARIA_LABEL = 'Two simple machines: a long lever on a pivot lifts a heavy stone with a small push, because the push acts far from the pivot; and a crank turning a wheel drives a piston up and down in a cylinder, as in an engine.';
  static CONTROLS = [{ type: 'button', id: 'replay', label: 'Replay' }];

  stageHeight(st) { return st.portrait ? 600 : 430; }

  enter() { this.goal = null; this.play(ENDS[this.stepIndex]); }

  onControlChange(id) {
    if (id === 'replay') { this.clockReset(); this.enter(); }
    this.requestUiUpdate?.();
  }

  geo(st) {
    const P = st.portrait, W = st.W, H = st.H, s = P ? 0.62 : 1;
    const g = { P, W, H, s, floor: P ? 360 : H - 34 };
    g.card = P ? { x: 14, y: g.floor + 16, w: W - 28 } : { x: W - 200, y: 18, w: 184 };
    g.F = P ? { x: W / 2 + 34, y: 270 } : { x: 286, y: 300 };
    g.eff = 210 * s; g.load = 90 * s;
    g.C = P ? { x: W / 2, y: 252 } : { x: 230, y: 318 };
    return g;
  }

  script(t) {
    if (t >= ENDS[this.stepIndex] || reducedMotion()) return null;
    return this.stepIndex === 0
      ? { x: keys(t, [[0.3, MAXT], [1.9, -MAXT]], ease.k75), y: 0 }
      : { x: crankAngleAt(t - 0.2, 2, 3.4, 0), y: 0 };
  }

  parked() { return this.stepIndex === 0 ? { x: -MAXT, y: 0 } : { x: 2 * TAU, y: 0 }; }

  pointerDown(p) {
    if (this.skip()) return false;
    this.aim(p);
    return true;
  }

  pointerMove(p) { this.aim(p); return false; }

  aim(p) {
    const g = this.geo(this.sv);
    if (this.stepIndex === 0) {
      this.goal = { x: Math.asin(clamp((g.F.y - p.y) / g.eff, -Math.sin(MAXT), Math.sin(MAXT))), y: 0 };
    } else {
      const a = Math.atan2(p.y - g.C.y, p.x - g.C.x) + Math.PI / 2;
      const cur = (this.goal ?? this.parked()).x;
      this.goal = { x: a + Math.round((cur - a) / TAU) * TAU, y: 0 };
    }
    this.liveFrame();
  }

  paint(st) {
    const g = this.geo(st);
    return { svg: '', head: chip(TITLES[this.stepIndex], 0, 0, { tone: 'plain', size: st.portrait ? null : 'big', static: true }), floor: g.floor };
  }

  animate(st, t) {
    const live = this.live, g = this.geo(st), step = this.stepIndex;
    const sc = this.script(t);
    const v = trackPoint(live, 'goal', sc ?? this.goal ?? this.parked(), { snap: !!sc, preset: step === 1 ? 'smooth' : 'snappy' }).x;
    if (step === 0) this.lever(live, g, v);
    else this.engine(live, g, v);
    liveChip(live, 'hint', HINTS[step], g.P ? g.W / 2 : (g.W - 200) / 2, g.P ? g.H - 22 : 18, { tone: 'accent', size: 'sm' });
  }

  lever(live, g, ang) {
    const s = g.s, F = g.F;
    const L = liveLever(live, 'lev', F, ang, g.eff, g.load, { floor: g.floor, thick: 18 * s + 4 });
    // The stone rides on the load end, tilted with the plank, smiling once it is up.
    const size = 72 * s, p = beamPoint(F, ang, g.load - 14 * s, 9 * s + size * 0.38);
    const c = 'var(--sim-waste)', lifted = clamp((MAXT - ang) / (2 * MAXT), 0, 1);
    const face = lifted > 0.8 ? `<path d="M${-9 * s} ${4 * s}q${9 * s} ${9 * s} ${18 * s} 0" style="fill:none;stroke:var(--sim-label);stroke-width:3;stroke-linecap:round"/>`
      : `<path d="M${-8 * s} ${7 * s}h${16 * s}" style="fill:none;stroke:var(--sim-label);stroke-width:3;stroke-linecap:round"/>`;
    const st = live.shape('stone', 'g', { html: `<rect x="${f1(-size / 2)}" y="${f1(-size * 0.38 + 5)}" width="${f1(size)}" height="${f1(size * 0.76)}" rx="${f1(size * 0.28)}" ${fill(shade(c, 70))}/>`
      + `<rect x="${f1(-size / 2)}" y="${f1(-size * 0.38)}" width="${f1(size)}" height="${f1(size * 0.74)}" rx="${f1(size * 0.28)}" ${fill(c)}/>`
      + `<ellipse cx="${f1(-size * 0.2)}" cy="${f1(-size * 0.2)}" rx="${f1(size * 0.14)}" ry="${f1(size * 0.07)}" ${fill(glossOf(c, 55))}/>`
      + `<circle cx="${f1(-8 * s)}" cy="${f1(-6 * s)}" r="${f1(3.5 * s + 1)}" ${fill('var(--sim-label)')}/><circle cx="${f1(8 * s)}" cy="${f1(-6 * s)}" r="${f1(3.5 * s + 1)}" ${fill('var(--sim-label)')}/>` + face });
    live.attrs(st, { transform: `translate(${f1(p.x)} ${f1(p.y)}) rotate(${(ang * 180 / Math.PI).toFixed(2)})` });
    // The push: a fixed-size arrow on the long end (the effort stays small).
    const e = L.effort, len = 70 * s + 10, top = e.y - 16 - len;
    live.shape('push', 'g', { html: `<path d="M${f1(e.x)} ${f1(top)}V${f1(e.y - 26)}" style="fill:none;stroke:${tone(1)};stroke-width:7;stroke-linecap:round"/>`
      + `<path d="M${f1(e.x - 13)} ${f1(e.y - 30)}L${f1(e.x)} ${f1(e.y - 12)}L${f1(e.x + 13)} ${f1(e.y - 30)}Z" style="fill:${tone(1)};stroke:${tone(1)};stroke-width:3;stroke-linejoin:round"/>` });
    liveChip(live, 'pushc', `Push ${EFF_N} N`, e.x, top - 16, { tone: 1, size: 'sm' });
    // Arm-length brackets under the plank.
    const by = Math.min(g.floor + 2, F.y + 104 * s + 22);
    const br = (key, x0, x1, tn, text) => {
      live.shape(key, 'path', {}); live.attrs(live.get(key), { d: `M${f1(x0)} ${f1(by - 8)}V${f1(by)}H${f1(x1)}V${f1(by - 8)}` });
      live.css(live.get(key), { fill: 'none', stroke: tone(tn), 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
      liveChip(live, `${key}c`, text, (x0 + x1) / 2, by + 16, { tone: tn, size: 'sm' });
    };
    if (!g.P) {
      br('bE', F.x - g.eff * Math.cos(ang), F.x - 8, 1, `${EFF_M} m`);
      br('bL', F.x + 8, F.x + g.load * Math.cos(ang), 6, `${LOAD_M} m`);
    }
    const load = Math.round((EFF_N * EFF_M) / LOAD_M);
    this.card(live, g, 'Lever', [
      { label: 'Push', value: `${EFF_N} N`, tone: 1 },
      { label: 'Long arm', value: `${EFF_M} m`, tone: 1 },
      { label: 'Load', value: `${load} N`, tone: 6 },
      { label: 'Short arm', value: `${LOAD_M} m`, tone: 6 },
    ], '100 \u00d7 2.1 = 233 \u00d7 0.9');
  }

  engine(live, g, a) {
    const s = g.P ? 0.8 : 1, r = 50 * s, rod = 140 * s;
    const up = (1 + Math.cos(a)) / 2;
    const gas = `color-mix(in oklab, var(--sim-flame) ${Math.round(18 + 62 * up * up)}%, transparent)`;
    const k = liveCrank(live, 'crank', g.C, r, rod, a, -Math.PI / 2, { piston: { w: 86 * s, h: 42 * s }, headroom: 34 * s, gas });
    const h = (k.s - k.sMin) / (k.sMax - k.sMin);
    // A turn arrow round the wheel.
    const R = r * 1.45 + 18, a0 = 0.15 * Math.PI, a1 = 0.55 * Math.PI, C = g.C;
    const hx = C.x + Math.cos(a1) * R, hy = C.y + Math.sin(a1) * R;
    live.shape('turn', 'g', { html: `<path d="M${f1(C.x + Math.cos(a0) * R)} ${f1(C.y + Math.sin(a0) * R)}A${f1(R)} ${f1(R)} 0 0 1 ${f1(hx)} ${f1(hy)}" style="fill:none;stroke:${tone(2)};stroke-width:4;stroke-linecap:round;opacity:0.85"/>`
      + `<path d="M${f1(hx - 12)} ${f1(hy - 2)}L${f1(hx + 4)} ${f1(hy - 12)}L${f1(hx + 4)} ${f1(hy + 8)}Z" style="fill:${tone(2)};opacity:0.85"/>` });
    const side = g.P ? -1 : 1;
    liveChip(live, 'lp', 'Piston', C.x + side * (43 * s + 54), k.slider.y, { tone: 3, size: 'sm' });
    liveChip(live, 'lr', 'Rod', (k.pin.x + k.slider.x) / 2 - side * 54, (k.pin.y + k.slider.y) / 2, { tone: 1, size: 'sm' });
    liveChip(live, 'lc', 'Crank', C.x + side * (r * 1.45 + 44), C.y + 30, { tone: 2, size: 'sm' });
    const deg = Math.round(((a % TAU) + TAU) % TAU * 180 / Math.PI) % 360;
    this.card(live, g, 'Engine', [
      { label: 'Crank', value: `${deg}\u00b0`, tone: 2 },
      { label: 'Piston', value: h > 0.66 ? 'up' : h < 0.34 ? 'down' : 'middle', tone: 3 },
      { label: 'Gas', value: h > 0.66 ? 'squeezed' : 'roomy', tone: 'accent' },
    ], 'Round and round becomes up and down');
  }

  card(live, g, title, rows, note) {
    live.el('card', { tag: 'div', html: cardHtml(g.card.x, g.card.y, g.card.w, title, rows, { tone: 'accent' }) });
    liveChip(live, 'note', note, g.card.x + g.card.w / 2, g.card.y + 62 + rows.length * 30, { tone: 'plain', size: 'sm', cls: g.P || note.length < 26 ? '' : 'sv-chip--wrap' });
  }

  css() {
    return '.sv-chip--wrap { white-space: normal; width: 176px; text-align: center; }';
  }
}
