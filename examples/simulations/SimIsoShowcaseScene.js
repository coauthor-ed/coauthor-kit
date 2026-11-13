/** SimIsoShowcaseScene.js
 * SimIsoShowcaseScene - 3-beat showcase for SimIso, as a Class 10 "simple
 * electric motor" (Magnetic effects of electric current) block model:
 *   Beat 0: the motor builds itself block by block (fit, iso, extrude, three
 *           tones from one colour each); tap skips the build
 *   Beat 1: it pulls apart into labelled parts (explode, outermost first);
 *           tap puts it back / pulls it apart again (a tap mid-move reverses
 *           it without a jump)
 *   Beat 2: a parts list of flat three-tone tiles (flatFaces) while the motor
 *           snaps back together; tap skips
 * Every beat starts from the same state (enter() rebuilds everything).
 */
import { SimScene } from 'simulations/base/kit/SimScene.js';
import {
  drawBackdrop,
  drawCard,
  pill,
  leader,
  font,
  alpha,
  darken,
  clamp,
  ZONES,
  W,
} from 'simulations/base/kit/SimLook.js';
import { spring, springDuration, laggedP, ease, reducedMotion, dur } from 'simulations/base/kit/SimAnim.js';
import {
  fit,
  iso,
  isoDelta,
  depthOf,
  boxRing,
  solidOf,
  drawSolid,
  footprint,
  flatFaces,
  explode,
} from 'simulations/base/kit/SimIso.js';

// -- The model, in world units (z up). Each part: blocks [x, y, w, d, z, h, key?].
const BASE_Z = 1;
const PARTS = [
  { id: 'base', name: 'Stand', key: 's5', dir: [0, 0, 0],
    blocks: [[0, -0.6, 12, 8.8, 0, 1]],
    posts: [[5.6, 0.3, 0.8, 0.6, 1, 1.85], [5.6, 5.7, 0.8, 0.6, 1, 1.85]] },
  { id: 'north', name: 'Magnet N', key: 's6', dir: [-3.4, 0, 0], label: [-40, -40], letter: 'N', anchor: [0.12, 0.5],
    blocks: [[0.5, 1.4, 2, 4, 1, 4.4]] },
  { id: 'south', name: 'Magnet S', key: 's1', dir: [3.4, 0, 0], label: [58, -34], letter: 'S', anchor: [0.5, 0.1],
    blocks: [[9.5, 1.4, 2, 4, 1, 4.4]] },
  { id: 'coil', name: 'Coil', key: 's8', dir: [0, 0, 4], label: [0, -46], turns: true,
    blocks: [[3.6, 1.8, 0.6, 3.4, 2.95, 0.55], [7.8, 1.8, 0.6, 3.4, 2.95, 0.55],
      [4.2, 1.8, 3.6, 0.5, 2.95, 0.55], [4.2, 4.7, 3.6, 0.5, 2.95, 0.55]] },
  { id: 'axle', name: 'Axle', key: 'labelMuted', dir: [0, 0, 2], label: [-96, -6],
    blocks: [[5.78, -0.5, 0.44, 8.3, 2.85, 0.42], [5.4, 6.55, 1.2, 0.75, 2.6, 0.92, 'gold']] },
  { id: 'brush', name: 'Brushes', key: 's7', dir: [0, 2.6, 0], label: [-62, 44],
    blocks: [[4.25, 6.62, 1, 0.6, 1, 2.35], [6.75, 6.62, 1, 0.6, 1, 2.35]] },
];
// Outermost first: the coil lifts off, the magnets slide out, then brushes and axle.
const ORDER = [3, 1, 2, 5, 4];
const SLOT = { 1: 1, 2: 2, 3: 0, 4: 4, 5: 3 };              // part index -> explode slot
const SLOT_ORDER = ORDER.map((p) => SLOT[p]);                // [0, 1, 2, 3, 4]

// Build order for beat 0 (bottom up) and its timing.
const BUILD = [0, 1, 2, 5, 4, 3];
const DROP = 4;          // world units each block falls from
const BUILD_LAG = 0.28;
const BUILD_START = 0.25;
const BUILD_END = BUILD_START + BUILD_LAG * (BUILD.length - 1) + springDuration('snappy');
const EXPLODE_AT = 0.45;   // beat 1: a breath, then apart
const ASSEMBLE_AT = 0.9;   // beat 2: tiles first, then back together
const TILE_LAG = 0.12;

function corners(b, d = [0, 0, 0]) {
  const [x, y, w, dd, z, h] = b;
  const out = [];
  for (const cx of [x, x + w]) for (const cy of [y, y + dd]) for (const cz of [z, z + h]) out.push([cx + d[0], cy + d[1], cz + d[2]]);
  return out;
}

// apart: include the exploded positions (beats 1-2), so the camera never moves with the parts.
function allPoints(apart = true) {
  const pts = [];
  for (const p of PARTS) {
    for (const b of [...p.blocks, ...(p.posts || [])]) {
      pts.push(...corners(b));
      if (apart) pts.push(...corners(b, p.dir));
    }
  }
  return pts;
}

// Label anchor on a part's top: its centre, or p.anchor (fractions of its plan box).
function centreTop(p) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, z1 = -Infinity;
  for (const [x, y, w, d, z, h] of p.blocks) {
    x0 = Math.min(x0, x); x1 = Math.max(x1, x + w);
    y0 = Math.min(y0, y); y1 = Math.max(y1, y + d);
    z1 = Math.max(z1, z + h);
  }
  const [fx, fy] = p.anchor || [0.5, 0.5];
  return [x0 + (x1 - x0) * fx, y0 + (y1 - y0) * fy, z1];
}

export class SimIsoShowcaseScene extends SimScene {
  static BEAT_STEP_MAP = [
    [{ idx: 0, dwellMs: null }],
    [{ idx: 1, dwellMs: null }],
    [{ idx: 2, dwellMs: null }],
  ];

  static ARIA_LABEL = 'A block model of a simple electric motor: it builds itself, pulls apart into labelled parts (magnets, coil, axle, brushes, stand) and goes back together.';

  static CONTROLS = [{ type: 'button', id: 'replay', label: 'Replay' }];

  constructor(container, config) {
    super(container, config);
    this.t0 = 0;
    this.ex = explode(SLOT_ORDER);
    this.proj = fit(allPoints(), { zone: ZONES.heroWide, pad: 34, headroom: 8 });
    this.armed = false;
  }

  enter(stage) {
    this.t0 = 0;
    resetStage(this, stage);
  }

  onControlChange(id) {
    if (!this._guard(id)) return;
    if (id === 'replay') {
      this.t0 = this.age;
      resetStage(this, this.stage);
    }
    this.requestUiUpdate?.();
  }

  pointerDown() {
    const t = this.age - this.t0;
    if (this.stage === 0) {
      if (t < dur(BUILD_END)) this.t0 = this.age - BUILD_END - 0.01;
      return;
    }
    if (this.stage === 1) {
      // The explode IS this beat's interaction: a tap reverses it, even mid-move.
      this.ex.set(!this.ex.apart, t);
      return;
    }
    if (this.stage === 2) {
      if (t < ASSEMBLE_AT) {
        this.t0 = this.age - ASSEMBLE_AT - 0.01;
        this.ex.snap(false);
      } else if (!this.ex.settled()) {
        this.ex.snap(this.ex.apart);
      } else {
        this.ex.set(!this.ex.apart, t);
      }
    }
  }

  update(d) {
    const t = this.age - this.t0;
    if (this.stage === 1 && !this.armed && t >= EXPLODE_AT) {
      this.armed = true;
      this.ex.set(true, EXPLODE_AT);
    }
    if (this.stage === 2 && !this.armed && t >= ASSEMBLE_AT) {
      this.armed = true;
      this.ex.set(false, ASSEMBLE_AT);
    }
    this.ex.step(d, t);
  }

  busy() {
    const t = this.age - this.t0;
    if (this.stage === 0) return t < dur(BUILD_END);
    if (!this.armed) return true;
    if (this.stage === 2 && t < ASSEMBLE_AT + dur(TILE_LAG * 6 + 0.4)) return true;
    return !this.ex.settled();
  }

  draw(ctx, c) {
    drawBackdrop(ctx, c, 'dots');
    const t = this.age - this.t0;
    if (this.stage === 0) drawBuild(this, ctx, c, t);
    else if (this.stage === 1) drawApart(this, ctx, c, t);
    else drawParts(this, ctx, c, t);
  }
}

// -- Module helpers ----------------------------------------------------------------

function resetStage(scene, stage) {
  // Every beat starts from the same state, whichever beat came before.
  scene.armed = false;
  if (stage === 2) {
    scene.ex = explode(SLOT_ORDER, { apart: true });
    scene.proj = fit(allPoints(), { zone: { x: 214, y: 80, w: 450, h: 360 }, pad: 30, headroom: 6 });
  } else {
    scene.ex = explode(SLOT_ORDER);
    scene.proj = stage === 0
      ? fit(allPoints(false), { zone: ZONES.heroWide, pad: 40, headroom: 30 })
      : fit(allPoints(), { zone: ZONES.heroWide, pad: 30, headroom: 8 });
  }
  if (stage === 0) scene.armed = true;
}

// One cached tile path at the origin (placed with translate; never rebuilt per frame).
const TILE = { w: 40, h: 40 };
let tileCache = null;
function tilePath() {
  if (!tileCache) {
    const p = new Path2D(), r = 10, { w, h } = TILE;
    p.moveTo(r, 0);
    p.arcTo(w, 0, w, h, r);
    p.arcTo(w, h, 0, h, r);
    p.arcTo(0, h, 0, 0, r);
    p.arcTo(0, 0, w, 0, r);
    p.closePath();
    tileCache = p;
  }
  return tileCache;
}

function title(ctx, c, text) {
  pill(ctx, c, text, W / 2, ZONES.top.y + 26, { bg: c.bgSurface, size: 17, display: true });
}

function hint(ctx, c, text) {
  ctx.save();
  ctx.font = font(c, 700, 15);
  ctx.fillStyle = c.labelMuted;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, W / 2, ZONES.bottom.y + 26);
  ctx.restore();
}

function partOffset(scene, i) {
  if (i === 0) return [0, 0, 0];
  const s = scene.ex.share(SLOT[i]);
  const d = PARTS[i].dir;
  return [d[0] * s, d[1] * s, d[2] * s];
}

/**
 * Paint the motor. offsets[i]: world offset of part i; alphas[i]: its opacity.
 * The stand (slab + posts) goes first; then every other block back to front.
 */
function drawMotor(scene, ctx, c, offsets, alphas = []) {
  const P = scene.proj;
  const a0 = alphas[0] ?? 1;
  const base = PARTS[0];
  // Ground shadow under the stand: its footprint, nudged down, very soft.
  if (a0 > 0) {
    const [x, y, w, d] = base.blocks[0];
    const fp = footprint(boxRing(x, y, w, d), 0, P);
    ctx.save();
    ctx.translate(0, 10);
    ctx.globalAlpha *= a0;
    ctx.fillStyle = alpha(darken(c.bgDeep, 0.5), 0.28);
    polygon(ctx, fp);
    ctx.fill();
    ctx.restore();
    for (const b of base.blocks) drawBlock(ctx, c, P, b, base.key, offsets[0], a0);
  }
  // Soft shadows of lifted parts on the stand top.
  for (const i of [3, 4]) {
    const lift = offsets[i][2];
    if (lift <= 0.05 || (alphas[i] ?? 1) <= 0) continue;
    const k = clamp(lift / 4, 0, 1);
    ctx.save();
    ctx.fillStyle = alpha(darken(c.bgDeep, 0.4), 0.22 * (1 - 0.5 * k) * (alphas[i] ?? 1));
    for (const [x, y, w, d] of PARTS[i].blocks) {
      polygon(ctx, footprint(boxRing(x, y, w, d), BASE_Z, P));
      ctx.fill();
    }
    ctx.restore();
  }
  if (a0 > 0) for (const b of base.posts) drawBlock(ctx, c, P, b, base.key, offsets[0], a0);
  const list = [];
  for (let i = 1; i < PARTS.length; i++) {
    const a = alphas[i] ?? 1;
    if (a <= 0) continue;
    for (const b of PARTS[i].blocks) {
      const [x, y, w, d, z, h] = b;
      const o = offsets[i];
      list.push({ b, part: PARTS[i], key: b[6] || PARTS[i].key, o, a, depth: depthOf([x + w / 2 + o[0], y + d / 2 + o[1], z + h / 2 + o[2]], P) });
    }
  }
  list.sort((p, q) => p.depth - q.depth);
  for (const it of list) {
    drawBlock(ctx, c, P, it.b, it.key, it.o, it.a);
    if (it.part.letter) drawLetter(ctx, c, P, it.b, it.o, it.part.letter, c[it.part.key], it.a);
    if (it.part.turns && it.b[3] > it.b[2]) drawTurns(ctx, c, P, it.b, it.o, c[it.part.key], it.a);
  }
}

// A pole letter lying on a magnet's top face (text in the top plane's own axes).
function drawLetter(ctx, c, P, b, o, text, col, a) {
  const [x, y, w, d, z, h] = b;
  const [px, py] = iso([x + w / 2 + o[0], y + d / 2 + o[1], z + h + o[2]], P);
  const ex = isoDelta([1, 0, 0], P), ey = isoDelta([0, 1, 0], P);
  const s = 20;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.transform(ex[0] / s, ex[1] / s, ey[0] / s, ey[1] / s, px, py);
  ctx.rotate(-Math.PI / 2);
  ctx.font = font(c, 900, 30, true);
  ctx.fillStyle = darken(col, 0.42);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 2);
  ctx.restore();
}

// Wire turns across the top of a long coil side.
function drawTurns(ctx, c, P, b, o, col, a) {
  const [x, y, w, d, z, h] = b;
  const zt = z + h + o[2];
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.strokeStyle = darken(col, 0.3);
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let k = 1; k < 8; k++) {
    const yy = y + (d * k) / 8 + o[1];
    const [ax, ay] = iso([x + 0.08 + o[0], yy, zt], P);
    const [bx, by] = iso([x + w - 0.08 + o[0], yy, zt], P);
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
  }
  ctx.stroke();
  ctx.restore();
}

function drawBlock(ctx, c, P, b, key, offset, a = 1) {
  const [x, y, w, d, z, h] = b;
  const solid = solidOf(boxRing(x, y, w, d), z, h, P);
  drawSolid(ctx, solid, P, c[key], { offset, alpha: a });
}

function polygon(ctx, pts) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
}

function drawLabels(scene, ctx, c, t) {
  const P = scene.proj;
  for (let i = 1; i < PARTS.length; i++) {
    const p = PARTS[i];
    const s = scene.ex.share(SLOT[i]);
    const a = clamp((s - 0.55) / 0.35, 0, 1);
    if (a <= 0) continue;
    const top = centreTop(p);
    const o = partOffset(scene, i);
    const [ax, ay] = iso([top[0] + o[0], top[1] + o[1], top[2] + o[2]], P);
    // the explode spring overshoots: keep the chip on the canvas while it does
    const lx = clamp(ax + p.label[0], 64, W - 64), ly = ay + p.label[1];
    leader(ctx, lx, ly, ax, ay, c.label, 0.55 * a, 0);
    pill(ctx, c, p.name, lx, ly, { bg: c[p.key], size: 15, display: true, alpha: a, scale: 0.85 + 0.15 * a });
  }
}

function drawBuild(scene, ctx, c, t) {
  title(ctx, c, 'A simple electric motor');
  const offsets = [], alphas = [];
  for (let k = 0; k < BUILD.length; k++) {
    const i = BUILD[k];
    const u = t - BUILD_START - k * BUILD_LAG;
    const s = reducedMotion() ? 1 : spring(u, 'snappy');
    offsets[i] = [0, 0, (1 - s) * DROP];
    alphas[i] = reducedMotion() ? 1 : clamp(u / 0.12, 0, 1);
  }
  drawMotor(scene, ctx, c, offsets, alphas);
  hint(ctx, c, t < dur(BUILD_END) ? 'Tap to skip' : 'Six blocks. Each is one colour in three tones.');
}

function drawApart(scene, ctx, c, t) {
  title(ctx, c, 'Pull it apart');
  const offsets = PARTS.map((_, i) => partOffset(scene, i));
  drawMotor(scene, ctx, c, offsets);
  drawLabels(scene, ctx, c, t);
  hint(ctx, c, scene.ex.apart ? 'Tap to put it back together' : 'Tap to pull it apart');
}

function drawParts(scene, ctx, c, t) {
  title(ctx, c, 'Back together');
  const card = { x: ZONES.left.x, y: ZONES.left.y, w: 186, h: ZONES.left.h };
  drawCard(ctx, c, card.x, card.y, card.w, card.h, 1, { accent: c.accent });
  ctx.save();
  ctx.font = font(c, 800, 16, true);
  ctx.fillStyle = c.label;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('Parts', card.x + 18, card.y + 30);
  ctx.restore();
  const rows = [1, 2, 3, 4, 5, 0];
  const rowH = 50;
  for (let r = 0; r < rows.length; r++) {
    const p = PARTS[rows[r]];
    const u = reducedMotion() ? 1 : laggedP(clamp(t / (TILE_LAG * rows.length + 0.4), 0, 1), r, rows.length, 0.5);
    if (u <= 0) continue;
    const e = ease.smooth(u);
    const y = card.y + 64 + r * rowH;
    const x = card.x + 18 - (1 - e) * 16;
    ctx.save();
    ctx.globalAlpha *= e;
    ctx.translate(x, y);
    flatFaces(ctx, tilePath(), TILE, c[p.key]);
    ctx.translate(-x, -y);
    ctx.font = font(c, 700, 15);
    ctx.fillStyle = c.label;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.name, x + TILE.w + 12, y + TILE.h / 2 + 1);
    ctx.restore();
  }
  const offsets = PARTS.map((_, i) => partOffset(scene, i));
  drawMotor(scene, ctx, c, offsets);
  drawLabels(scene, ctx, c, t);
  hint(ctx, c, scene.ex.settled() && !scene.ex.apart ? 'Current in the coil + magnets = it turns' : 'Tap to skip');
}
