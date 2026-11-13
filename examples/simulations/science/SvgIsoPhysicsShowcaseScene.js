/**
 * SvgIsoPhysicsShowcaseScene - kit/SimIsoSvg.js for physics: density and floating. Four blocks of the
 * same size (1 litre each) but different mass meet a glass tank of water.
 *   Beat 0: the tank and the blocks drop in (dropIn); each block shows its mass. Tap skips.
 *   Beat 1: the blocks are let go one by one: cork, wood and ice bob and float with 24%, 60% and 92%
 *           under water; steel sinks. Every block is cut at the water line each frame (exact items), so
 *           the part under water is seen through the water and the part above it is not.
 *   Beat 2: one block, a density slider: under 1 kg per litre it floats that far under; over 1 it sinks.
 * Draw order (painter): glass back, blocks under water, water, blocks above water, glass front edges.
 */
import { SvgScene, chip, liveChip, fill, tone } from 'simulations/base/kit/SimSvg.js';
import { springStep, reducedMotion } from 'simulations/base/kit/SimAnim.js';
import { ISO_SVG_CSS, isoLive, boxRing, fit, iso, depthOf, dropIn, pathD } from 'simulations/base/kit/SimIsoSvg.js';

const MAP = [0, 1, 2].map((i) => [{ idx: i, dwellMs: null }]);
const TITLES = ['Same size, different mass', 'Let them go', 'Your block'];
const TANK = { x: 0, y: 0, w: 9.6, d: 3.4, h: 4.2 };
const WL = 2.8;          // water level
const B = 1.5;           // block side (1 litre)
const HOVER = TANK.h + 0.7;
const BLOCKS = [
  { name: 'cork', rho: 0.24, col: tone(8) },
  { name: 'wood', rho: 0.6, col: tone(2) },
  { name: 'ice', rho: 0.92, col: 'var(--sim-ice)' },
  { name: 'steel', rho: 7.9, col: 'var(--sim-label-muted)' },
];
const FLOAT = { period: 1.15, zeta: 0.32 };
const SINK = { period: 1.3, zeta: 0.9 };
const RELEASE = (i) => 0.35 + i * 0.45;
const f2 = (v) => (Math.round(v * 100) / 100).toString();

const restZ = (rho) => (rho < 1 ? WL - rho * B : 0);
const blockXY = (i, one) => (one ? [TANK.w / 2 - B / 2, TANK.d / 2 - B / 2] : [0.55 + i * 2.3, TANK.d / 2 - B / 2]);

export class SvgIsoPhysicsShowcaseScene extends SvgScene {
  static BEAT_STEP_MAP = MAP;
  static ARIA_LABEL = 'Four blocks the same size, cork, wood, ice and steel, go into a tank of water. Cork floats with a quarter under water, wood with 60 percent, ice with 92 percent, and steel sinks. Then a slider sets the density of one block.';
  static CONTROLS = [
    { type: 'slider', id: 'rho', label: 'Density (kg per litre):', min: 0.1, max: 1.6, step: 0.05, value: 0.7 },
    { type: 'button', id: 'replay', label: 'Replay' },
  ];

  css() { return ISO_SVG_CSS; }

  stageHeight(st) { return st.portrait ? 500 : 430; }

  isControlHidden(id) { return id === 'rho' && this.stepIndex !== 2; }

  getControlValue(id) { return id === 'rho' ? this.rho : undefined; }

  enter(step) {
    this.rho = 0.7;
    this.play(step === 0 ? 2.2 : step === 1 ? RELEASE(3) + 1.2 : 0.4);
  }

  onControlChange(id, v) {
    if (id === 'replay') { this.clockReset(); this.enter(this.stepIndex); }
    if (id === 'rho') { this.rho = Math.max(0.1, Math.min(1.6, Number(v) || 0.7)); this.liveFrame(); }
    this.requestUiUpdate?.();
  }

  pointerDown() { this.skip(); return false; }

  paint(st) {
    const w = st.W - 4, h = st.H - 14;
    const card = `<rect x="2" y="9" width="${w}" height="${h}" rx="24" ${fill('color-mix(in oklab, var(--sim-stroke) 70%, var(--sim-bg-deep))')}/>`
      + `<rect x="2" y="2" width="${w}" height="${h}" rx="24" ${fill('var(--sim-bg-surface)', 'stroke:var(--sim-stroke);stroke-width:2')}/>`;
    return { svg: card, head: chip(TITLES[this.stepIndex], 0, 0, { tone: 'plain', size: 'big', static: true }) };
  }

  proj(st) {
    const pts = [];
    for (const x of [0, TANK.w]) for (const y of [0, TANK.d]) for (const z of [0, HOVER + B]) pts.push([x, y, z]);
    const zone = st.portrait ? { x: 8, y: 150, w: st.W - 16, h: st.H - 220 } : { x: 30, y: 80, w: st.W - 60, h: st.H - 136 };
    // Azimuth 66: the long side of the tank faces the viewer.
    return fit(pts, { zone, pad: 10, azimuth: 66 });
  }

  /** Block i's bottom z this pass: a spring per block on the live clock. s.rest latches once the bob
   *  is near rest and slow, until the goal moves (a label keyed on distance alone flips at each bob). */
  zOf(live, i, rho, release) {
    const t = live.t ?? 0;
    const s = live.state(`blk|${i}`, () => ({ x: HOVER, v: 0, last: t, rest: false }));
    const dt = Math.max(0, Math.min(0.05, t - s.last));
    s.last = t;
    if (t < release) return s.x;
    const goal = restZ(rho);
    if (s.goal !== goal) { s.goal = goal; s.rest = false; }
    if (live.skipping || reducedMotion()) { s.x = goal; s.v = 0; s.rest = true; return goal; }
    const moving = springStep(s, goal, dt, rho < 1 ? FLOAT : SINK);
    if (moving) live.more();
    if (!moving || (Math.abs(s.x - goal) < 0.02 && Math.abs(s.v) < 0.08)) s.rest = true;
    return s.x;
  }

  animate(st, t) {
    const live = this.live, step = this.stepIndex, P = this.proj(st), portrait = st.portrait;
    const tankIn = step === 0 ? dropIn(t, 0, { start: 0.1 }) : { lift: 0, alpha: 1 };
    const tankOff = [0, 0, tankIn.lift * 2];
    const glass = { id: 'tank', ring: boxRing(TANK.x, TANK.y, TANK.w, TANK.d), z: 0, h: TANK.h, base: 'var(--sim-glass)',
      alpha: 0.22 * tankIn.alpha, offset: tankOff, rim: false, shadow: { k: 0.35 } };
    const water = { id: 'water', ring: boxRing(0.08, 0.08, TANK.w - 0.16, TANK.d - 0.16), z: 0, h: WL, base: 'var(--sim-water)',
      alpha: 0.5 * tankIn.alpha, offset: tankOff };

    // Blocks: [index, x, y, bottom z, alpha].
    const one = step === 2;
    const list = one ? [{ ...BLOCKS[0], name: 'block', col: tone(5), rho: this.rho }] : BLOCKS;
    const under = [], over = [], tops = [];
    list.forEach((b, i) => {
      const [x, y] = blockXY(i, one);
      let z = HOVER, a = 1, rest = false;
      if (step === 0) { const d = dropIn(t, i + 1, { start: 0.35, lag: 0.22 }); z = HOVER + d.lift * 2.5; a = d.alpha; }
      else { z = this.zOf(live, one ? 9 : i, b.rho, one ? 0 : RELEASE(i)); rest = live.state(`blk|${one ? 9 : i}`).rest; }
      const ring = boxRing(x, y, B, B), top = z + B;
      const look = { base: b.col, alpha: a, edge: `color-mix(in srgb, ${b.col} 50%, black)`, edgeW: 1.2, exact: true };
      if (z < WL) under.push({ ...look, id: `u${i}`, ring, z, h: Math.min(top, WL) - z, rim: top <= WL });
      if (top > WL) over.push({ ...look, id: `o${i}`, ring, z: Math.max(z, WL), h: top - Math.max(z, WL) });
      tops.push({ b, i, x, y, top, z, a, rest });
    });

    isoLive(live, 'glass', [glass], P);
    this.edges(live, 'back', P, tankOff, false, tankIn.alpha);
    isoLive(live, 'under', under, P);
    isoLive(live, 'water', [water], P);
    isoLive(live, 'over', over, P);
    this.edges(live, 'front', P, tankOff, true, tankIn.alpha);

    // Chips with leaders: mass first, then how far under.
    const order = [...tops].sort((p, q) => depthOf([p.x, p.y, 0], P) - depthOf([q.x, q.y, 0], P));
    for (const k of order) {
      const [ax, ay] = iso([k.x + B / 2, k.y + B / 2, k.top], P);
      const row = one ? 0 : k.i;
      const cy = Math.min(ay - 26, (portrait ? 96 : 62) + row * (portrait ? 30 : 28));
      // Beat 2 labels the slider value (as the caption does), so a drag never flips it to the bare name.
      const settled = step === 2 || (step === 1 && k.rest);
      const text = step === 0 ? `${k.b.name}: ${f2(k.b.rho)} kg`
        : k.b.rho >= 1 ? (settled ? `${k.b.name}: sinks` : k.b.name)
          : settled ? `${k.b.name}: ${Math.round(k.b.rho * 100)}% under` : k.b.name;
      const cx = Math.max(64, Math.min(st.W - 64, ax));
      const lead = live.shape(`lead${k.i}`, 'path');
      live.attrs(lead, { d: pathD([[cx, cy + 10], [ax, ay - 4]], false) });
      live.css(lead, { fill: 'none', stroke: 'var(--sim-label-muted)', 'stroke-width': 1.5, 'stroke-dasharray': '3 4', opacity: (0.8 * k.a).toFixed(2) });
      liveChip(live, `c${k.i}`, text, cx, cy, { tone: 'plain', size: 'sm', alpha: k.a });
    }

    const capY = st.H - (portrait ? 34 : 30);
    const cap = step === 0 ? 'Each block is 1 litre'
      : step === 1 ? (portrait ? 'Less dense than water: floats' : 'Water is 1 kg per litre: less dense floats')
        : this.rho < 1 ? `${f2(this.rho)} kg per litre: ${Math.round(this.rho * 100)}% under water` : `${f2(this.rho)} kg per litre: it sinks`;
    liveChip(live, 'cap', cap, st.W / 2, capY, { tone: step === 2 ? (this.rho < 1 ? 'good' : 'bad') : 'plain', size: portrait ? null : 'big' });
  }

  /** The glass edges: the two top edges at the back corner (back), or every other edge (front). */
  edges(live, key, P, off, front, a) {
    const { w, d, h } = TANK;
    const C = [[0, 0], [w, 0], [w, d], [0, d]];
    const at = (c, z) => iso([c[0] + off[0], c[1] + off[1], z + off[2]], P);
    let back = 0;
    C.forEach((c, i) => { if (depthOf([c[0], c[1], 0], P) < depthOf([C[back][0], C[back][1], 0], P)) back = i; });
    let dd = '';
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4, isBack = i === back || j === back;
      if (front !== isBack) dd += pathD([at(C[i], h), at(C[j], h)], false);
      if (front && !isBack) dd += pathD([at(C[i], 0), at(C[j], 0)], false);
      if (front && i !== back) dd += pathD([at(C[i], 0), at(C[i], h)], false);
    }
    const e = live.shape(`edge|${key}`, 'path');
    live.attrs(e, { d: dd });
    live.css(e, { fill: 'none', stroke: 'color-mix(in srgb, var(--sim-glass) 70%, var(--sim-label))', 'stroke-width': front ? 2.5 : 1.5,
      'stroke-linecap': 'round', opacity: (front ? 0.9 : 0.5) * a });
  }
}
