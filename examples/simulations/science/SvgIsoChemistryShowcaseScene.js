/**
 * SvgIsoChemistryShowcaseScene - kit/SimIsoSvg.js for chemistry: the sodium chloride lattice. A grain
 * of salt is a cube because its ions stack in a cube: small Na+ and large Cl- take turns in every
 * direction (blocks stand for ions; sizes are to scale with each other, not to the real gaps).
 *   Beat 0: a 3 x 3 x 3 piece of the lattice builds layer by layer (dropIn); the ions are counted.
 *   Beat 1: it pulls apart into its 3 layers (explodeLive): each one is a checkerboard. Tap toggles.
 *   Beat 2: turn it (slider, fitTurning); tap an ion (pickFace): it and its 6 nearest neighbours stay,
 *           the rest fade. Every ion has 6 neighbours of the other kind.
 */
import { SvgScene, chip, liveChip, fill } from 'simulations/base/kit/SimSvg.js';
import { ease, reducedMotion } from 'simulations/base/kit/SimAnim.js';
import {
  ISO_SVG_CSS, isoLive, explodeLive, boxRing, fitTurning, iso, pickFace, dropIn, dropEnd, pathD, footprint,
} from 'simulations/base/kit/SimIsoSvg.js';

const N = 3, GAP = 1.4, SPREAD = 0.5;
const MAP = [0, 1, 2].map((i) => [{ idx: i, dwellMs: null }]);
const TITLES = ['A grain of salt', 'Layer by layer', 'Six neighbours'];
const NA = { name: 'Na+', s: 0.56, col: 'var(--sim-cation)' };
const CL = { name: 'Cl\u2212', s: 0.84, col: 'var(--sim-anion)' };
const DROP = { start: 0.3, lag: 0.3 };
const BUILD_END = dropEnd(N * N, DROP) + 0.3;
const EXPLODE_AT = 0.4;
const ionOf = (i, j, k) => ((i + j + k) % 2 === 0 ? CL : NA);

function pointsOf(apart, spread = 0) {
  const top = N + (apart ? GAP * (N - 1) : 0);
  const pts = [];
  const m = spread;
  for (const x of [-m, N + m]) for (const y of [-m, N + m]) for (const z of [-m, top + m]) pts.push([x, y, z]);
  return pts;
}

export class SvgIsoChemistryShowcaseScene extends SvgScene {
  static BEAT_STEP_MAP = MAP;
  static ARIA_LABEL = 'A 3 by 3 by 3 piece of a salt crystal built from sodium and chloride ions taking turns. It pulls apart into 3 checkerboard layers, then turns, and tapping an ion shows its 6 nearest neighbours, all of the other kind.';
  static CONTROLS = [
    { type: 'button', id: 'apart', label: 'Apart / together' },
    { type: 'slider', id: 'turn', label: 'Turn:', min: 0, max: 360, step: 5, value: 30 },
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
    this.az = 30;
    this.apart = false;
    this.sel = [1, 1, 1];
    this.play(step === 0 ? BUILD_END : step === 1 ? EXPLODE_AT + 1.4 : 0.6);
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
      // Pick among every ion (faded ones too), so any ion on the surface can be chosen.
      const hit = pickFace((this.ions ?? []).map((it) => ({ ...it, alpha: 1 })), this.P, p.x, p.y);
      if (hit) { this.sel = [hit.item.i, hit.item.j, hit.item.k]; this.liveFrame(); }
    }
    this.requestUiUpdate?.();
    return false;
  }

  zone(st, step) {
    if (st.portrait && step === 1) return { x: 4, y: 64, w: st.W - 124, h: st.H - 140 };
    return st.portrait ? { x: 8, y: 64, w: st.W - 16, h: st.H - 150 } : { x: 40, y: 58, w: st.W - 80, h: st.H - 116 };
  }

  paint(st) {
    const w = st.W - 4, h = st.H - 14;
    const card = `<rect x="2" y="9" width="${w}" height="${h}" rx="24" ${fill('color-mix(in oklab, var(--sim-stroke) 70%, var(--sim-bg-deep))')}/>`
      + `<rect x="2" y="2" width="${w}" height="${h}" rx="24" ${fill('var(--sim-bg-surface)', 'stroke:var(--sim-stroke);stroke-width:2')}/>`;
    // The key: one chip per ion, in its own colour.
    const key = chip(`${NA.name} sodium`, 22, 34, { tone: 'cation', size: 'sm', align: 'left', math: true })
      + chip(`${CL.name} chloride`, st.portrait ? 150 : 140, 34, { tone: 'anion', size: 'sm', align: 'left', math: true });
    return { svg: card, over: key, head: chip(TITLES[this.stepIndex], 0, 0, { tone: 'plain', size: 'big', static: true }) };
  }

  animate(st, t) {
    const live = this.live, step = this.stepIndex;
    const P = fitTurning(pointsOf(step === 1, step === 2 ? SPREAD : 0), { zone: this.zone(st, step), pad: 16 })(step === 2 ? this.az : 30);
    this.P = P;
    const ex = step === 1 ? explodeLive(live, 'ex', [2, 1, 0], this.apart, { start: false }) : null;
    live.attrs(live.shape('shadow', 'path', { cls: 'iso-shadow' }), { d: pathD(footprint(boxRing(0, 0, N, N), 0, P)), transform: 'translate(0 5)' });
    live.css(live.get('shadow'), { opacity: 0.28 });

    const near = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
    const sel = this.sel;
    // Beat 2 opens with the neighbours stepping out (the clock runs 0.6 s).
    const spread = SPREAD * (reducedMotion() ? 1 : ease.outCubic(Math.min(1, t / 0.5)));
    const ions = [];
    let na = 0, cl = 0;
    for (let k = 0; k < N; k++) {
      for (let j = 0; j < N; j++) {
        for (let i = 0; i < N; i++) {
          const ion = ionOf(i, j, k), s = ion.s, c = 0.5 - s / 2;
          const it = { id: `i${i}${j}${k}`, i, j, k, ring: boxRing(i + c, j + c, s, s), z: k + c, h: s, base: ion.col,
            edge: `color-mix(in srgb, ${ion.col} 50%, black)`, edgeW: 1.2, offset: [0, 0, 0] };
          if (step === 0) {
            const d = dropIn(t, k * N + j, DROP);
            it.offset = [0, 0, d.lift * 2.5];
            it.alpha = d.alpha;
            if (d.alpha >= 1 && d.lift < 0.05) { if (ion === NA) na++; else cl++; }
          } else if (ex) it.offset = [0, 0, GAP * k * ex.share(k)];
          if (step === 2) {
            // The chosen ion and its 6 neighbours: the neighbours step out a little, so the middle one shows.
            const dd = near([i, j, k], sel);
            it.alpha = dd <= 1 ? 1 : 0.12;
            if (dd === 1) it.offset = [(i - sel[0]) * spread, (j - sel[1]) * spread, (k - sel[2]) * spread];
          }
          ions.push(it);
        }
      }
    }
    this.ions = ions;
    let hi = null;
    if (step === 2) {
      const id = `i${sel[0]}${sel[1]}${sel[2]}`;
      hi = ['top', 'side-0', 'side-1', 'side-2', 'side-3'].map((face) => ({ id, face }));
    }
    isoLive(live, 'ions', ions, P, { hi });

    const capY = st.H - (st.portrait ? 40 : 34);
    if (step === 0) {
      const done = t >= BUILD_END - 0.2;
      liveChip(live, `cap${done ? 1 : 0}`, `${na} Na+ + ${cl} Cl\u2212`, st.W / 2, capY,
        { tone: done ? 'good' : 'plain', size: 'big', math: true, cls: done ? 'sv-pop' : '' });
    }
    if (step === 1) {
      for (let k = 0; k < N; k++) {
        const s = ex.share(k);
        const a = Math.max(0, Math.min(1, ((k === 0 ? ex.share(1) : s) - 0.5) / 0.4));
        if (a <= 0) continue;
        const [x, y] = iso([N, 0, k + 0.5 + GAP * k * s], P);
        const nCl = k % 2 === 0 ? 5 : 4;
        liveChip(live, `l${k}`, `${nCl} Cl\u2212 ${9 - nCl} Na+`, Math.min(st.W - 62, x + 64), y,
          { tone: 'plain', size: 'sm', alpha: a, scale: 0.85 + 0.15 * a, math: true });
      }
      const open = ex.apart && ex.settled();
      liveChip(live, 'cap', open ? (st.portrait ? 'Checkerboard layers' : 'Each layer is a checkerboard') : 'Tap to pull it apart', st.W / 2, capY, { tone: open ? 'good' : 'plain', size: open ? 'big' : null });
    }
    if (step === 2) {
      const me = ionOf(...sel), other = me === NA ? CL : NA;
      const n = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]
        .filter((d) => d.every((v, a) => sel[a] + v >= 0 && sel[a] + v < N)).length;
      const text = n === 6 ? `This ${me.name} touches 6 ${other.name}` : `${n} here: 6 inside the crystal`;
      liveChip(live, `cap|${sel.join('')}`, text, st.W / 2, capY, { tone: 'gold', size: st.portrait ? null : 'big', math: true, cls: 'sv-pop' });
    }
  }
}
