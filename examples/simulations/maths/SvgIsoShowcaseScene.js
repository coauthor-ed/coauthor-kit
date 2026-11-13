/**
 * SvgIsoShowcaseScene - reference for kit/SimIsoSvg.js (isometric blocks on the SvgScene live layer):
 * the volume of a cuboid, counted in unit cubes.
 *   Beat 0: a 4 x 3 x 3 cuboid builds itself row by row on a 4 x 3 floor grid (cuboid, dropIn, isoLive);
 *           the count climbs, then the edges get their lengths. Tap skips.
 *   Beat 1: it pulls apart into 3 layers of 12 (explodeLive, top layer first); tap (or the button)
 *           puts it back / pulls it apart again, even mid-move.
 *   Beat 2: turn it with the slider (fitTurning: no zoom while it turns); tap a face to light it up
 *           (pickFace + faceD) and read its area.
 * Every beat starts from its own rest state. Portrait is its own layout.
 */
import { SvgScene, chip, liveChip, fill, tone } from 'simulations/base/kit/SimSvg.js';
import {
  ISO_SVG_CSS, isoLive, explodeLive, cuboid, boxRing, fitTurning, iso, depthOf, pickFace, faceD,
  dropIn, dropEnd, pathD, footprint,
} from 'simulations/base/kit/SimIsoSvg.js';

const NX = 4, NY = 3, NZ = 3, GAP = 1.5;
const MAP = [0, 1, 2].map((i) => [{ idx: i, dwellMs: null }]);
const TITLES = ['Build a cuboid', 'Layer by layer', 'Turn it, tap a face'];
const LAYER_TONE = [1, 3, 5];
const DROP = { start: 0.3, lag: 0.2 };
const BUILD_END = dropEnd(NZ * NY, DROP) + 0.4;
const EXPLODE_AT = 0.4;
const BOX = { id: 'box', ring: boxRing(0, 0, NX, NY), z: 0, h: NZ };

function pointsOf(apart) {
  const top = apart ? NZ + GAP * (NZ - 1) : NZ;
  const pts = [];
  for (const x of [0, NX]) for (const y of [0, NY]) for (const z of [0, top]) pts.push([x, y, z]);
  return pts;
}

/** Area sentence of a cuboid face. */
function faceArea(face) {
  if (face === 'top') return [`Top: ${NX} x ${NY} = ${NX * NY} squares`, NX * NY];
  const along = face === 'side-0' || face === 'side-2' ? NX : NY;
  return [`Side: ${along} x ${NZ} = ${along * NZ} squares`, along * NZ];
}

export class SvgIsoShowcaseScene extends SvgScene {
  static BEAT_STEP_MAP = MAP;
  static ARIA_LABEL = 'A cuboid 4 cubes long, 3 wide and 3 tall builds itself from unit cubes: 36 cubes. It pulls apart into 3 layers of 12, then turns, and tapping a face shows its area.';
  static CONTROLS = [
    { type: 'button', id: 'apart', label: 'Apart / together' },
    { type: 'slider', id: 'turn', label: 'Turn:', min: 0, max: 360, step: 5, value: 45 },
    { type: 'button', id: 'replay', label: 'Replay' },
  ];

  css() { return ISO_SVG_CSS + '.svs { --iso-hi: var(--sim-gold); }'; }

  stageHeight(st) { return st.portrait ? 470 : 430; }

  isControlHidden(id) {
    if (id === 'apart') return this.stepIndex !== 1;
    if (id === 'turn') return this.stepIndex !== 2;
    return false;
  }

  getControlValue(id) { return id === 'turn' ? this.az : undefined; }

  enter(step) {
    this.az = 45;
    this.apart = false;
    this.face = 'top';
    this.play(step === 0 ? BUILD_END : step === 1 ? EXPLODE_AT + 1.4 : 0.6);
    // Beat 1 opens by itself once; after that only a tap (or the button) moves it.
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
      const hit = pickFace(this.cubes ?? [], this.P, p.x, p.y);
      if (hit) { this.face = hit.face; this.liveFrame(); }
    }
    this.requestUiUpdate?.();
    return false;
  }

  zone(st, step) {
    // Portrait beat 1 keeps a column on the right for the layer chips.
    if (st.portrait && step === 1) return { x: 4, y: 6, w: st.W - 112, h: st.H - 110 };
    return st.portrait ? { x: 8, y: 6, w: st.W - 16, h: st.H - 110 } : { x: 40, y: 6, w: st.W - 80, h: st.H - 84 };
  }

  paint(st) {
    const w = st.W - 4, h = st.H - 14;
    const card = `<rect x="2" y="9" width="${w}" height="${h}" rx="24" ${fill('color-mix(in oklab, var(--sim-stroke) 70%, var(--sim-bg-deep))')}/>`
      + `<rect x="2" y="2" width="${w}" height="${h}" rx="24" ${fill('var(--sim-bg-surface)', 'stroke:var(--sim-stroke);stroke-width:2')}/>`;
    return { svg: card, head: chip(TITLES[this.stepIndex], 0, 0, { tone: 'plain', size: 'big', static: true }) };
  }

  animate(st, t) {
    const live = this.live, step = this.stepIndex;
    const P = fitTurning(pointsOf(step === 1), { zone: this.zone(st, step), pad: st.portrait ? 22 : 24 })(step === 2 ? this.az : 45);
    this.P = P;
    const ex = step === 1 ? explodeLive(live, 'ex', [2, 1, 0], this.apart, { start: false }) : null;
    // Floor: a soft shadow and the 4 x 3 grid the first layer stands on.
    live.attrs(live.shape('shadow', 'path', { cls: 'iso-shadow' }), { d: pathD(footprint(BOX.ring, 0, P)), transform: 'translate(0 5)' });
    live.css(live.get('shadow'), { opacity: 0.3 });
    live.attrs(live.shape('grid', 'path'), { d: this.gridD(P) });
    live.css(live.get('grid'), { fill: 'color-mix(in oklab, var(--sim-bg-deep) 70%, var(--sim-series-1))', stroke: 'var(--sim-stroke)', 'stroke-width': 1.5 });

    let landed = 0;
    const cubes = cuboid(NX, NY, NZ).map((c) => {
      c.base = tone(LAYER_TONE[c.k]);
      c.edge = `color-mix(in srgb, ${c.base} 55%, black)`;
      c.edgeW = 1.2;
      if (step === 0) {
        const d = dropIn(t, c.k * NY + c.j, DROP);
        c.offset = [0, 0, d.lift * 3];
        c.alpha = d.alpha;
        if (d.alpha >= 1 && d.lift < 0.05) landed++;
      } else if (ex) c.offset = [0, 0, GAP * c.k * ex.share(c.k)];
      return c;
    });
    this.cubes = cubes;
    const hiD = step === 2 ? faceD(BOX, this.face, P) : null;
    isoLive(live, 'cubes', cubes, P, { hi: hiD ? { d: hiD, key: this.face } : null });

    const capY = st.H - (st.portrait ? 52 : 40);
    if (step === 0) {
      const done = t >= BUILD_END - 0.2;
      if (!done) liveChip(live, 'count', `${landed} cube${landed === 1 ? '' : 's'}`, st.W / 2, capY, { tone: 'plain', size: 'big' });
      if (done) this.dims(live, P, st);
      if (done) liveChip(live, 'cap', `${NX} x ${NY} x ${NZ} = ${NX * NY * NZ} cubes`, st.W / 2, capY, { tone: 'good', size: 'big', cls: 'sv-pop' });
    }
    if (step === 1) {
      for (let k = 0; k < NZ; k++) {
        const s = ex.share(k);
        const a = k === 0 ? Math.max(0, Math.min(1, (ex.share(1) - 0.5) / 0.4)) : Math.max(0, Math.min(1, (s - 0.5) / 0.4));
        if (a <= 0) continue;
        const [x, y] = iso([NX, 0, k + 0.5 + GAP * k * s], P);
        liveChip(live, `l${k}`, `${NX} x ${NY} = ${NX * NY}`, Math.min(st.W - 54, x + 56), y, { tone: LAYER_TONE[k], alpha: a, scale: 0.85 + 0.15 * a, size: 'sm' });
      }
      const open = ex.apart && ex.settled();
      liveChip(live, 'cap', open ? `${NZ} layers of ${NX * NY} = ${NX * NY * NZ}` : 'Tap to pull it apart', st.W / 2, capY, { tone: open ? 'good' : 'plain', size: open ? 'big' : null });
    }
    if (step === 2) {
      this.dims(live, P, st);
      liveChip(live, `cap|${this.face}`, faceArea(this.face)[0], st.W / 2, capY, { tone: 'gold', size: 'big', cls: 'sv-pop' });
    }
  }

  /** Floor grid of NX x NY unit squares, as one path. */
  gridD(P) {
    let d = pathD(footprint(BOX.ring, 0, P));
    for (let i = 1; i < NX; i++) d += pathD([iso([i, 0, 0], P), iso([i, NY, 0], P)], false);
    for (let j = 1; j < NY; j++) d += pathD([iso([0, j, 0], P), iso([NX, j, 0], P)], false);
    return d;
  }

  /** Edge-length chips at the front bottom corner: along x, along y, and up. */
  dims(live, P, st) {
    const corners = [[0, 0], [NX, 0], [NX, NY], [0, NY]];
    const front = corners.reduce((a, c) => (depthOf([c[0], c[1], 0], P) > depthOf([a[0], a[1], 0], P) ? c : a));
    const [cx, cy] = iso([NX / 2, NY / 2, NZ / 2], P);
    const out = (p, push) => {
      const dx = p[0] - cx, dy = p[1] - cy, l = Math.hypot(dx, dy) || 1;
      return [Math.max(40, Math.min(st.W - 40, p[0] + (dx / l) * push)), p[1] + (dy / l) * push];
    };
    const ox = front[0] === 0 ? NX : 0, oy = front[1] === 0 ? NY : 0;
    const ax = out(iso([NX / 2, front[1], 0], P), 26);
    const ay = out(iso([front[0], NY / 2, 0], P), 26);
    // Height on the silhouette edge farther out on screen (never across a face).
    const side = [[ox, front[1]], [front[0], oy]].map((c) => iso([c[0], c[1], NZ / 2], P));
    const az = out(Math.abs(side[0][0] - cx) > Math.abs(side[1][0] - cx) ? side[0] : side[1], 30);
    liveChip(live, 'dx', `${NX}`, ax[0], ax[1], { tone: 'plain', size: 'sm' });
    liveChip(live, 'dy', `${NY}`, ay[0], ay[1], { tone: 'plain', size: 'sm' });
    liveChip(live, 'dz', `${NZ}`, az[0], az[1], { tone: 'plain', size: 'sm' });
  }
}
