/**
 * SvgCameraShowcaseScene - reference for kit/SimCameraSvg.js (the 2D camera on an SvgScene): place value,
 * zooming into one whole square.
 *   Beat 0: one whole, cut into tenths (columns) and hundredths (squares); a far layer of specks behind it
 *   Beat 1: the camera moves onto one hundredth (cameraLive 'to': log zoom x7, the square lands mid-stage)
 *   Beat 2: it pushes on into that hundredth: ten thousandths appear; grid lines stay hairlines (hairStyle)
 *   Beat 3: it pulls all the way back out (x42 in 1.5 s; log zoom passes every scale at the same pace)
 * The world is painted once (cameraG html); per frame only the transform moves. Tap a piece to name it
 * (pointWorld hit test, so it works at any zoom); a tap during a move skips to its end. Chips are at screen
 * size, placed with toScreen. Portrait is its own layout (the camera just fits a narrower stage).
 */
import { SvgScene, chip, liveChip, fill, tone } from 'simulations/base/kit/SimSvg.js';
import { hash2 } from 'simulations/base/kit/SimAnim.js';
import {
  cameraG, cameraLive, cameraEnd, layerCam, stageCentre, pointWorld, toScreen, hairStyle,
} from 'simulations/base/kit/SimCameraSvg.js';

const MAP = [0, 1, 2, 3].map((i) => [{ idx: i, dwellMs: null }]);
const S = 300;                                   // the whole: world units
const SQ = { x: 90, y: 180 };                    // the hundredth we visit (column 4, row 7)
const STRIP = 7;                                 // the thousandth we land on
const START = 0.3;
const TITLES = ['One whole', 'Zoom to one hundredth', 'Zoom again: thousandths', 'Back out to the whole'];
const HINTS = ['Tap a piece to name it', '100 of these make the whole', '10 thousandths make a hundredth', 'Tap any piece, even zoomed out'];
const PIECES = {
  tenth: { name: '1 tenth', fact: '1 tenth = 0.1 (10 in the whole)', tone: 1 },
  hundredth: { name: '1 hundredth', fact: '1 hundredth = 0.01 (100 in the whole)', tone: 5 },
  thousandth: { name: '1 thousandth', fact: '1 thousandth = 0.001 (1000 in the whole)', tone: 3 },
};
const f1 = (v) => v.toFixed(1);

// The far layer: soft specks around the whole (world units, laid out once).
const SPECKS = Array.from({ length: 34 }, (_, i) => [hash2(i, 1), hash2(i, 2), 6 + hash2(i, 3) * 16, 1 + (i % 4)]);

function worldSvg() {
  const sq = (n) => `color-mix(in oklab, ${tone(n)} 30%, var(--sim-bg-surface))`;
  let s = `<rect x="-3" y="6" width="${S + 6}" height="${S}" rx="6" ${fill('color-mix(in oklab, var(--sim-stroke) 70%, var(--sim-bg-deep))')}/>`
    + `<rect x="0" y="0" width="${S}" height="${S}" ${fill('color-mix(in oklab, var(--sim-accent) 10%, var(--sim-bg-surface))')}/>`;
  // Tenth columns alternate a faint tint; the visited column is tinted more.
  for (let i = 0; i < 10; i++) {
    const tint = i === SQ.x / 30 ? `color-mix(in oklab, ${tone(1)} 22%, var(--sim-bg-surface))` : i % 2 ? 'color-mix(in oklab, var(--sim-accent) 4%, var(--sim-bg-surface))' : null;
    if (tint) s += `<rect x="${i * 30}" y="0" width="30" height="${S}" ${fill(tint)}/>`;
  }
  // The visited hundredth and its thousandth strips (one strip stands out).
  s += `<rect x="${SQ.x}" y="${SQ.y}" width="30" height="30" ${fill(sq(5))}/>`;
  s += `<rect x="${SQ.x + STRIP * 3}" y="${SQ.y}" width="3" height="30" ${fill(sq(3))}/>`;
  let thin = '', strips = '';
  for (let k = 1; k < 10; k++) thin += `M${k * 30} 0V${S}M0 ${k * 30}H${S}`;
  for (let k = 1; k < 10; k++) strips += `M${SQ.x + k * 3} ${SQ.y}V${SQ.y + 30}`;
  let tenths = '';
  for (let k = 1; k < 10; k++) tenths += `M${k * 30} 0V${S}`;
  s += `<path d="${thin}" ${hairStyle('color-mix(in oklab, var(--sim-label-muted) 55%, transparent)', 1)}/>`
    + `<path d="${tenths}" ${hairStyle('color-mix(in oklab, var(--sim-label-muted) 90%, transparent)', 1.6)}/>`
    + `<path d="${strips}" ${hairStyle(`color-mix(in oklab, ${tone(5)} 80%, var(--sim-label))`, 1)}/>`
    + `<rect x="${SQ.x}" y="${SQ.y}" width="30" height="30" ${hairStyle(tone(5), 2.4)}/>`
    + `<rect x="0" y="0" width="${S}" height="${S}" ${hairStyle('var(--sim-label)', 3)}/>`;
  return s;
}
const WORLD = worldSvg();
/** The far layer for a stage: specks laid out so the layer camera at rest spreads them over the card. */
const farSvg = (st, base, centre) => {
  const L = layerCam(base, 0.3, centre);
  return SPECKS.map(([u, v, r, n]) => [L.x + ((u - 0.5) * (st.W - 60 - 2 * r)) / L.z, L.y + ((v - 0.5) * (st.H - 90 - 2 * r)) / L.z, r, n]).map(([x, y, r, n]) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" ${fill(`color-mix(in oklab, ${tone(n)} 20%, var(--sim-bg-surface))`)}/>`).join('');
};

export class SvgCameraShowcaseScene extends SvgScene {
  static BEAT_STEP_MAP = MAP;
  static ARIA_LABEL = 'Place value through a camera: a whole square cut into tenths and hundredths, a zoom onto one hundredth, a deeper zoom showing ten thousandths inside it, and a pull back out to the whole. Tap a piece to name it.';
  static CONTROLS = [{ type: 'button', id: 'replay', label: 'Replay' }];

  stageHeight(st) { return st.portrait ? 470 : 430; }

  enter(step) {
    this.sel = null;
    this.play(this.moves(step) ? cameraEnd(this.moves(step).ev) + 0.1 : 0.1);
  }

  onControlChange(id) {
    if (id === 'replay') { this.clockReset(); this.enter(this.stepIndex); }
    this.requestUiUpdate?.();
  }

  /** The base camera (the whole fits the card) and the zooms built on it, for this stage size. */
  cams(st) {
    const z0 = Math.min((st.W - 70) / S, (st.H - 120) / S);
    const base = { x: S / 2, y: S / 2, z: z0, r: 0 };
    const z1 = z0 * 7, z2 = z1 * 6;
    return { base, c1: { x: SQ.x + 15, y: SQ.y + 15, z: z1, r: 0 }, c2: { x: SQ.x + STRIP * 3 + 1.5, y: SQ.y + 15, z: z2, r: 0 } };
  }

  moves(step) {
    if (!this.sv) return null;
    const c = this.cams(this.sv);
    if (step === 1) return { from: c.base, ev: [{ at: START, kind: 'to', ...c.c1, dur: 1.1 }] };
    if (step === 2) return { from: c.c1, ev: [{ at: START, kind: 'to', ...c.c2, dur: 1.0 }] };
    if (step === 3) return { from: c.c2, ev: [{ at: START, kind: 'pull', x: c.base.x, y: c.base.y, z: c.base.z, dur: 1.5 }] };
    return { from: c.base, ev: [] };
  }

  pointerDown(p) {
    if (this.skip()) return false;
    const cam = this.cam;
    if (!cam || !this.sv) return false;
    const w = pointWorld(cam, p, this.centre(this.sv));
    if (w.x < 0 || w.y < 0 || w.x > S || w.y > S) { this.sel = null; this.liveFrame(); return false; }
    // Name the smallest piece that is big enough on screen to tap.
    const inSq = w.x >= SQ.x && w.x < SQ.x + 30 && w.y >= SQ.y && w.y < SQ.y + 30;
    let kind = 'tenth', box;
    if (inSq && cam.z * 3 >= 16) { kind = 'thousandth'; const k = Math.floor((w.x - SQ.x) / 3); box = { x: SQ.x + k * 3, y: SQ.y, w: 3, h: 30 }; }
    else if (cam.z * 30 >= 40) { kind = 'hundredth'; box = { x: Math.floor(w.x / 30) * 30, y: Math.floor(w.y / 30) * 30, w: 30, h: 30 }; }
    else box = { x: Math.floor(w.x / 30) * 30, y: 0, w: 30, h: S };
    this.sel = { kind, box };
    this.liveFrame();
    return false;
  }

  centre(st) { const c = stageCentre(st); return [c[0], c[1] + 6]; }

  paint(st) {
    const w = st.W - 4, h = st.H - 14;
    const card = `<defs><clipPath id="cz-frame"><rect x="2" y="2" width="${w}" height="${h}" rx="24"/></clipPath></defs>`
      + `<rect x="2" y="9" width="${w}" height="${h}" rx="24" ${fill('color-mix(in oklab, var(--sim-stroke) 70%, var(--sim-bg-deep))')}/>`
      + `<rect x="2" y="2" width="${w}" height="${h}" rx="24" ${fill('var(--sim-bg-surface)', 'stroke:var(--sim-stroke);stroke-width:2')}/>`;
    return { svg: card, head: chip(TITLES[this.stepIndex], 0, 0, { tone: 'plain', size: 'big', static: true }) };
  }

  animate(st, t) {
    const live = this.live, step = this.stepIndex, centre = this.centre(st), mv = this.moves(step);
    const { cam, moving, end } = cameraLive(live, mv.from, mv.ev, centre);
    this.cam = cam;
    // Far layer (depth 0.3) and the world, clipped to the card; then the selection, all under the camera.
    const frame = live.shape('frame', 'svg');
    live.attrs(frame, { x: 2, y: 2, width: st.W - 4, height: st.H - 14, viewBox: `2 2 ${st.W - 4} ${st.H - 14}`, 'clip-path': 'url(#cz-frame)' });
    cameraG(live, 'far', cam, { html: farSvg(st, this.cams(st).base, centre), depth: 0.3, centre, parent: frame });
    cameraG(live, 'world', cam, { html: WORLD, centre, parent: frame });
    if (this.sel) {
      const b = this.sel.box;
      cameraG(live, 'sel', cam, { centre, parent: frame, html: `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" ${hairStyle('var(--sim-warning)', 4)}/>` });
    }

    // Screen space: chips at their own size, placed with toScreen.
    liveChip(live, 'zoom', `zoom x${(cam.z / this.cams(st).base.z).toFixed(1)}`, st.W - 16, 28, { tone: 'accent', align: 'right', size: 'sm' });
    const settled = !moving && t >= end;
    const focus = settled && !this.sel ? (step === 1 ? { kind: 'hundredth', box: { x: SQ.x, y: SQ.y, w: 30, h: 30 } } : step === 2 ? { kind: 'thousandth', box: { x: SQ.x + STRIP * 3, y: SQ.y, w: 3, h: 30 } } : null) : this.sel;
    if (focus) this.tagPiece(live, st, cam, centre, focus);
    const hint = this.sel ? PIECES[this.sel.kind].fact : moving || (t < end && mv.ev.length) ? 'Tap to skip' : HINTS[step];
    liveChip(live, 'hint', hint, st.W / 2, st.H - 36, { tone: this.sel ? PIECES[this.sel.kind].tone : 'plain' });
  }

  /** A name chip above a piece (or below it when the top is off the card). */
  tagPiece(live, st, cam, centre, sel) {
    const b = sel.box, pc = PIECES[sel.kind];
    const [sx, top] = toScreen(cam, b.x + b.w / 2, b.y, centre);
    const [, bot] = toScreen(cam, b.x + b.w / 2, b.y + b.h, centre);
    const y = top - 24 > 60 ? top - 24 : bot + 24 < st.H - 70 ? bot + 24 : st.H / 2;
    const x = Math.max(90, Math.min(st.W - 90, sx));
    liveChip(live, `tag|${sel.kind}|${b.x}|${b.y}`, pc.name, x, y, { tone: pc.tone, cls: 'sv-pop' });
  }
}
