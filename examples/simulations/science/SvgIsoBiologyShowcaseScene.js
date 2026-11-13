/**
 * SvgIsoBiologyShowcaseScene - kit/SimIsoSvg.js for biology: a block cut from a leaf, cell by cell.
 *   Beat 0: the block builds from the bottom up: lower epidermis, spongy cells with air spaces between
 *           them, tall palisade cells, upper epidermis (dropIn, row by row). Tap skips.
 *   Beat 1: it pulls apart into its four layers (explodeLive, top first), each one named. Tap toggles.
 *   Beat 2: turn it (slider, fitTurning); tap a layer (pickFace): it is outlined, the others fade, and
 *           its job is shown.
 * About 130 blocks on the live layer: a moving frame rewrites only transforms (faces are cached).
 */
import { SvgScene, chip, liveChip, fill } from 'simulations/base/kit/SimSvg.js';
import {
  ISO_SVG_CSS, isoLive, explodeLive, boxRing, fitTurning, iso, pickFace, faceD, dropIn, dropEnd, pathD, footprint,
} from 'simulations/base/kit/SimIsoSvg.js';

const W = 6, D = 3, GAP = 1.1;
const MAP = [0, 1, 2].map((i) => [{ idx: i, dwellMs: null }]);
const TITLES = ['Inside a leaf', 'Four layers', 'What each layer does'];
const SKIN = 'color-mix(in srgb, var(--sim-cell-wall) 38%, white)';
const LAYERS = [
  { name: 'Lower epidermis', z: 0, h: 0.4, col: SKIN, job: 'Lower epidermis: pores for gas' },
  { name: 'Spongy layer', z: 0.45, h: 1.1, col: 'var(--sim-cell-wall)', job: 'Spongy: air spaces for gas' },
  { name: 'Palisade layer', z: 1.6, h: 1.4, col: 'var(--sim-chloro)', job: 'Palisade: most photosynthesis' },
  { name: 'Upper epidermis', z: 3.05, h: 0.35, col: SKIN, job: 'Upper epidermis: lets light in' },
];
const TOP = 3.4;
const DROP = { start: 0.3, lag: 0.16 };
const BUILD_END = dropEnd(LAYERS.length * D, DROP) + 0.3;
const EXPLODE_AT = 0.4;
const hash = (a, b, c) => { const s = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453; return s - Math.floor(s); };

/** Every cell of the block, once: [{ id, layer, row, ring, z, h }]. */
function cells() {
  const out = [];
  const add = (layer, row, x, y, w, d, z, h) => out.push({ id: `c${out.length}`, layer, row, ring: boxRing(x, y, w, d), z, h });
  for (const L of [0, 3]) {
    for (let j = 0; j < D; j++) for (let i = 0; i < W; i++) add(L, j, i + 0.03, j + 0.03, 0.94, 0.94, LAYERS[L].z, LAYERS[L].h);
  }
  // Spongy: two loose tiers of rounded-off cells, some left out (the air spaces).
  for (let tier = 0; tier < 2; tier++) {
    for (let j = 0; j < D; j++) {
      for (let i = 0; i < W; i++) {
        if (hash(i, j, tier) < 0.28) continue;
        const s = 0.62 + 0.14 * hash(j, i, tier + 5);
        const x = i + (1 - s) * hash(i + 3, j, tier), y = j + (1 - s) * hash(i, j + 7, tier);
        add(1, j, x, y, s, s, LAYERS[1].z + tier * 0.56, 0.5);
      }
    }
  }
  // Palisade: tall columns, packed tight.
  for (let j = 0; j < D * 2; j++) for (let i = 0; i < W * 2; i++) add(2, j >> 1, i * 0.5 + 0.03, j * 0.5 + 0.03, 0.44, 0.44, LAYERS[2].z, LAYERS[2].h);
  return out;
}
const CELLS = cells();

function pointsOf(apart) {
  const top = TOP + (apart ? GAP * 3 : 0);
  const pts = [];
  for (const x of [0, W]) for (const y of [0, D]) for (const z of [0, top]) pts.push([x, y, z]);
  return pts;
}

export class SvgIsoBiologyShowcaseScene extends SvgScene {
  static BEAT_STEP_MAP = MAP;
  static ARIA_LABEL = 'A block cut from a leaf builds itself cell by cell: lower epidermis, spongy cells with air spaces, tall palisade cells and the upper epidermis. It pulls apart into the four layers, then turns, and tapping a layer shows its job.';
  static CONTROLS = [
    { type: 'button', id: 'apart', label: 'Apart / together' },
    { type: 'slider', id: 'turn', label: 'Turn:', min: 0, max: 360, step: 5, value: 35 },
    { type: 'button', id: 'replay', label: 'Replay' },
  ];

  css() { return ISO_SVG_CSS + '.svs { --iso-hi: var(--sim-gold); }'; }

  stageHeight(st) { return st.portrait ? 480 : 430; }

  isControlHidden(id) {
    if (id === 'apart') return this.stepIndex !== 1;
    if (id === 'turn') return this.stepIndex !== 2;
    return false;
  }

  getControlValue(id) { return id === 'turn' ? this.az : undefined; }

  enter(step) {
    this.az = 35;
    this.apart = false;
    this.layer = 2;
    this.play(step === 0 ? BUILD_END : step === 1 ? EXPLODE_AT + 1.5 : 0.5);
    if (step === 1) this.after(EXPLODE_AT, () => { this.apart = true; this.liveFrame(); this.requestUiUpdate?.(); });
  }

  onControlChange(id, v) {
    if (id === 'replay') { this.clockReset(); this.enter(this.stepIndex); }
    if (id === 'apart') { this.apart = !this.apart; this.liveFrame(); }
    if (id === 'turn') { this.az = Number(v) || 0; this.liveFrame(); }
    this.requestUiUpdate?.();
  }

  pointerDown(p) {
    if (this.skip()) return false;
    if (this.stepIndex === 1) { this.apart = !this.apart; this.liveFrame(); }
    if (this.stepIndex === 2) {
      const hit = pickFace((this.items ?? []).map((it) => ({ ...it, alpha: 1 })), this.P, p.x, p.y);
      if (hit) { this.layer = hit.item.layer; this.liveFrame(); }
    }
    this.requestUiUpdate?.();
    return false;
  }

  zone(st, step) {
    if (step === 1) return st.portrait ? { x: 4, y: 8, w: st.W - 132, h: st.H - 84 } : { x: 20, y: 8, w: st.W - 210, h: st.H - 74 };
    return st.portrait ? { x: 8, y: 8, w: st.W - 16, h: st.H - 96 } : { x: 40, y: 8, w: st.W - 80, h: st.H - 80 };
  }

  paint(st) {
    const w = st.W - 4, h = st.H - 14;
    const card = `<rect x="2" y="9" width="${w}" height="${h}" rx="24" ${fill('color-mix(in oklab, var(--sim-stroke) 70%, var(--sim-bg-deep))')}/>`
      + `<rect x="2" y="2" width="${w}" height="${h}" rx="24" ${fill('var(--sim-bg-surface)', 'stroke:var(--sim-stroke);stroke-width:2')}/>`;
    return { svg: card, head: chip(TITLES[this.stepIndex], 0, 0, { tone: 'plain', size: 'big', static: true }) };
  }

  animate(st, t) {
    const live = this.live, step = this.stepIndex;
    const P = fitTurning(pointsOf(step === 1), { zone: this.zone(st, step), pad: 14 })(step === 2 ? this.az : 35);
    this.P = P;
    const ex = step === 1 ? explodeLive(live, 'ex', [3, 2, 1, 0], this.apart, { start: false }) : null;
    live.attrs(live.shape('shadow', 'path', { cls: 'iso-shadow' }), { d: pathD(footprint(boxRing(0, 0, W, D), 0, P)), transform: 'translate(0 5)' });
    live.css(live.get('shadow'), { opacity: 0.28 });

    const items = CELLS.map((c) => {
      const L = LAYERS[c.layer];
      const it = { ...c, base: L.col, edge: `color-mix(in srgb, ${L.col} 45%, black)`, edgeW: 1, offset: [0, 0, 0] };
      if (step === 0) {
        const d = dropIn(t, c.layer * D + c.row, DROP);
        it.offset = [0, 0, d.lift * 2.2];
        it.alpha = d.alpha;
      } else if (ex) it.offset = [0, 0, GAP * c.layer * ex.share(c.layer)];
      if (step === 2 && c.layer !== this.layer) it.alpha = 0.22;
      return it;
    });
    this.items = items;
    const L = LAYERS[this.layer];
    isoLive(live, 'cells', items, P, { hi: step === 2 ? this.slabHi({ id: 'slab', ring: boxRing(0, 0, W, D), z: L.z, h: L.h }, P) : null });

    const capY = st.H - (st.portrait ? 36 : 32);
    if (step === 0) {
      const done = t >= BUILD_END - 0.2;
      liveChip(live, `cap${done ? 1 : 0}`, done ? (st.portrait ? `${CELLS.length} cells` : `${CELLS.length} cells in a block this small`) : 'Cell by cell', st.W / 2, capY,
        { tone: done ? 'good' : 'plain', size: 'big', cls: done ? 'sv-pop' : '' });
    }
    if (step === 1) {
      for (let k = 0; k < LAYERS.length; k++) {
        const s = ex.share(k);
        const a = Math.max(0, Math.min(1, ((k === 0 ? ex.share(1) : s) - 0.5) / 0.4));
        if (a <= 0) continue;
        const L = LAYERS[k];
        const [x, y] = iso([W, 0, L.z + L.h / 2 + GAP * k * s], P);
        liveChip(live, `l${k}`, L.name, x + 14, y, { tone: 'plain', size: 'sm', align: 'left', alpha: a, scale: 0.85 + 0.15 * a });
      }
      const open = ex.apart && ex.settled();
      liveChip(live, 'cap', open ? 'Skin, food factory, air, skin' : 'Tap to pull it apart', st.W / 2, capY, { tone: open ? 'good' : 'plain', size: open && !st.portrait ? 'big' : null });
    }
    if (step === 2) {
      liveChip(live, `cap|${this.layer}`, LAYERS[this.layer].job, st.W / 2, capY, { tone: 'gold', size: st.portrait ? null : 'big', cls: 'sv-pop' });
    }
  }

  /** Outline of the chosen layer as one slab (its visible faces). */
  slabHi(slab, P) {
    const out = [];
    for (const face of ['top', 'side-0', 'side-1', 'side-2', 'side-3']) {
      const d = faceD(slab, face, P);
      if (d) out.push({ d, key: `${this.layer}|${face}` });
    }
    return out;
  }
}
