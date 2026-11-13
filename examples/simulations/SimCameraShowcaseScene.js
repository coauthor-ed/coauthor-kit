/** SimCameraShowcaseScene.js
 * SimCameraShowcaseScene - 4-beat showcase for the SimCamera 2D camera, as a
 * biology "cell -> organelle" journey:
 *   Beat 0: the whole cell (identity camera), neighbour cells on a far parallax layer
 *   Beat 1: pushTo onto a mitochondrion (anchor + log zoom); hair() lines stay crisp
 *   Beat 2: cameraAt glide across to the nucleus; a mid-depth layer slides slower
 *   Beat 3: cameraAt pull back out to the whole cell
 * Every beat: tap a part to name it (hit test with toWorld, so it works at any
 * zoom). A tap during a camera move skips to its end. Labels are drawn after
 * the camera restore, at screen size, placed with toScreen.
 */
import { SimScene } from 'simulations/base/kit/SimScene.js';
import {
  drawBackdrop,
  pill,
  leader,
  ellipse,
  blob,
  alpha,
  mix,
  darken,
  lighten,
  clamp,
  ZONES,
  W,
} from 'simulations/base/kit/SimLook.js';
import { ease, pop, hash2, TIMING, reducedMotion, dur } from 'simulations/base/kit/SimAnim.js';
import {
  withCamera,
  toScreen,
  toWorld,
  pushTo,
  layer,
  hair,
  cameraAt,
  cameraEnd,
} from 'simulations/base/kit/SimCamera.js';

const TAU = Math.PI * 2;
const START = 0.25;               // a breath after the stage iris before the camera moves
const Z_IN = 3.4;                 // close-up zoom (log-interpolated)
const BASE = { x: 340, y: 262, z: 1, r: 0 };

const CELL = { x: 340, y: 262, rx: 222, ry: 158 };

// Tappable parts, in world units. key = series colour; ink = its text-safe twin.
const PARTS = [
  { id: 'nucleus', name: 'Nucleus', fact: 'Nucleus: keeps the DNA, the cell\'s instructions', x: 282, y: 250, rx: 50, ry: 45, rot: 0, key: 's5' },
  { id: 'mito', name: 'Mitochondrion', fact: 'Mitochondrion: releases energy from food', x: 452, y: 322, rx: 36, ry: 15, rot: -0.35, key: 's8' },
  { id: 'mito', name: 'Mitochondrion', fact: 'Mitochondrion: releases energy from food', x: 205, y: 340, rx: 26, ry: 11, rot: 0.5, key: 's8' },
  { id: 'mito', name: 'Mitochondrion', fact: 'Mitochondrion: releases energy from food', x: 372, y: 148, rx: 23, ry: 10, rot: 0.15, key: 's8' },
  { id: 'vacuole', name: 'Vacuole', fact: 'Vacuole: stores water and food', x: 440, y: 205, rx: 28, ry: 24, rot: 0, key: 's1' },
  { id: 'golgi', name: 'Golgi body', fact: 'Golgi body: packs proteins and ships them out', x: 365, y: 330, rx: 28, ry: 18, rot: 0, key: 's2' },
];
const MITO = PARTS[1];
const NUCLEUS = PARTS[0];

// Beat 1 ends here; beat 2 glides from it; beat 3 pulls back from beat 2's end.
const CAM1 = pushTo(BASE, MITO.x, MITO.y, Z_IN, 1);
const GLIDE = [{ at: START, kind: 'glide', x: NUCLEUS.x, y: NUCLEUS.y }];
const CAM2 = { x: NUCLEUS.x, y: NUCLEUS.y, z: Z_IN, r: 0 };
const PULL = [{ at: START, kind: 'pull', x: BASE.x, y: BASE.y, z: BASE.z }];

const TITLES = ['Inside a cell', 'Zoom in on one part', 'Glide to the next part', 'Pull back out'];
const HINTS = [
  'Tap a part to name it',
  'Lines stay thin as we zoom',
  'Near things slide faster than far ones',
  'Tap any part, even zoomed out',
];

// Static scatter, computed once (hash2 is stateless).
const RIBOSOMES = [];
for (let i = 0; RIBOSOMES.length < 110 && i < 600; i++) {
  const a = hash2(i, 1) * TAU;
  const rr0 = Math.sqrt(hash2(i, 2)) * 0.9;
  RIBOSOMES.push([CELL.x + Math.cos(a) * CELL.rx * rr0, CELL.y + Math.sin(a) * CELL.ry * rr0, 1.2 + hash2(i, 3) * 0.9]);
}
const DEEP = [];
for (let i = 0; i < 46; i++) {
  DEEP.push([90 + hash2(i, 11) * 500, 80 + hash2(i, 12) * 360, 4 + hash2(i, 13) * 7]);
}
const NEIGHBOURS = [];
for (let i = 0; i < 9; i++) {
  const a = (i / 9) * TAU + 0.3;
  NEIGHBOURS.push([340 + Math.cos(a) * 420, 262 + Math.sin(a) * 330, 150 + hash2(i, 21) * 40, 110 + hash2(i, 22) * 30, hash2(i, 23) * 6]);
}
const CHROMATIN = [];
for (let i = 0; i < 6; i++) {
  const pts = [];
  for (let j = 0; j < 5; j++) {
    pts.push([NUCLEUS.x - 30 + hash2(i, 30 + j) * 60, NUCLEUS.y - 26 + hash2(i, 40 + j) * 52]);
  }
  CHROMATIN.push(pts);
}

export class SimCameraShowcaseScene extends SimScene {
  static BEAT_STEP_MAP = [
    [{ idx: 0, dwellMs: null }],
    [{ idx: 1, dwellMs: null }],
    [{ idx: 2, dwellMs: null }],
    [{ idx: 3, dwellMs: null }],
  ];

  static ARIA_LABEL = 'An animal cell seen through a camera: the whole cell, a zoom onto a mitochondrion, a glide to the nucleus, and a pull back out. Tap a part to name it.';

  static CONTROLS = [{ type: 'button', id: 'replay', label: 'Replay' }];

  constructor(container, config) {
    super(container, config);
    this.t0 = 0;
    this.sel = null;
  }

  enter() {
    // Every beat starts from the same state, whichever beat came before.
    this.t0 = 0;
    this.sel = null;
  }

  onControlChange(id) {
    if (!this._guard(id)) return;
    if (id === 'replay') {
      this.t0 = this.age;
      this.sel = null;
    }
    this.requestUiUpdate?.();
  }

  pointerDown(p) {
    const t = this.age - this.t0;
    const end = moveEnd(this.stage);
    if (t < end) {
      this.t0 = this.age - end - 0.01;   // tap skips the running move
      return;
    }
    const cam = camAt(this.stage, t);
    const [wx, wy] = toWorld(cam, p.x, p.y);
    const tol = 8 / cam.z;               // finger slack: 8 screen px at any zoom
    let hit = null;
    for (const part of PARTS) {
      if (inEllipse(wx, wy, part, tol)) hit = part;
    }
    if (!hit && inEllipse(wx, wy, { x: CELL.x, y: CELL.y, rx: CELL.rx, ry: CELL.ry, rot: 0 }, 0)) {
      hit = { id: 'cyto', name: 'Cytoplasm', fact: 'Cytoplasm: the jelly where the work happens', x: wx, y: wy, rx: 0, ry: 0, rot: 0, key: 's3' };
    }
    this.sel = hit ? { part: hit, at: t } : null;
  }

  busy() {
    const t = this.age - this.t0;
    if (t < moveEnd(this.stage)) return true;
    return !!(this.sel && !reducedMotion() && t - this.sel.at < 0.5);
  }

  draw(ctx, c) {
    const t = this.age - this.t0;
    const cam = camAt(this.stage, t);
    drawBackdrop(ctx, c, 'plain');

    // Far layer: neighbouring cells, depth 0.3.
    layer(ctx, cam, 0.3, () => drawNeighbours(ctx, c));

    // Subject plane: the cell body.
    withCamera(ctx, cam, () => drawCellBody(ctx, c));

    // Mid layer inside the cell (depth 0.6): soft deep specks, clipped to the membrane.
    ctx.save();
    withCamera(ctx, cam, () => membranePath(ctx, 0.97));
    ctx.clip();
    layer(ctx, cam, 0.6, () => drawDeep(ctx, c));
    ctx.restore();

    // Subject plane: organelles and the selection ring.
    withCamera(ctx, cam, () => {
      drawOrganelles(ctx, c);
      if (this.sel && this.sel.part.rx > 0) {
        const p = this.sel.part;
        hair(ctx, c.warning, 3.5);
        ellipse(ctx, p.x, p.y, p.rx + 5 / cam.z, p.ry + 5 / cam.z, p.rot);
        ctx.stroke();
      }
    });

    // Screen space from here on: chips and labels at their own size.
    drawLabels(this, ctx, c, cam, t);
  }
}

// -- Camera per beat ------------------------------------------------------------

function moveEnd(stage) {
  if (reducedMotion()) return 0;
  if (stage === 1) return START + dur(TIMING.push);
  if (stage === 2) return cameraEnd(GLIDE);
  if (stage === 3) return cameraEnd(PULL);
  return 0;
}

function camAt(stage, t) {
  if (stage === 1) {
    const e = ease.smooth(clamp((t - START) / TIMING.push, 0, 1));
    return pushTo(BASE, MITO.x, MITO.y, Z_IN, e);
  }
  if (stage === 2) return cameraAt(CAM1, GLIDE, t).cam;
  if (stage === 3) return cameraAt(CAM2, PULL, t).cam;
  return BASE;
}

function inEllipse(x, y, e, tol) {
  const dx = x - e.x;
  const dy = y - e.y;
  const cs = Math.cos(-e.rot);
  const sn = Math.sin(-e.rot);
  const u = dx * cs - dy * sn;
  const v = dx * sn + dy * cs;
  const a = e.rx + tol;
  const b = e.ry + tol;
  return (u * u) / (a * a) + (v * v) / (b * b) <= 1;
}

// -- World drawing (inside the camera) ---------------------------------------------

function membranePath(ctx, k = 1) {
  blob(ctx, CELL.x, CELL.y, CELL.rx * k, CELL.ry * k, 9, 0.045, 1.3);
}

function drawNeighbours(ctx, c) {
  const fill = alpha(mix(c.s3, c.bgDeep, 0.6), 0.5);
  for (const [x, y, rx, ry, ph] of NEIGHBOURS) {
    blob(ctx, x, y, rx, ry, 8, 0.06, ph);
    ctx.fillStyle = fill;
    ctx.fill();
    hair(ctx, alpha(c.s3, 0.35), 2);
    ctx.stroke();
    ctx.fillStyle = alpha(mix(c.s5, c.bgDeep, 0.6), 0.45);
    ellipse(ctx, x - rx * 0.2, y - ry * 0.1, rx * 0.22, ry * 0.24);
    ctx.fill();
  }
}

function drawCellBody(ctx, c) {
  // Soft ground shadow, then cytoplasm and a two-line membrane.
  ctx.fillStyle = alpha(darken(c.bgDeep, 0.3), 0.35);
  ellipse(ctx, CELL.x, CELL.y + CELL.ry + 10, CELL.rx * 0.8, 14);
  ctx.fill();
  membranePath(ctx, 1);
  ctx.fillStyle = darken(c.s3, 0.18);
  ctx.fill();
  membranePath(ctx, 0.975);
  ctx.fillStyle = mix(c.s3, c.bgSurface, 0.62);
  ctx.fill();
  hair(ctx, alpha(lighten(c.s3, 0.35), 0.7), 1.2);
  ctx.stroke();
}

function drawDeep(ctx, c) {
  ctx.fillStyle = alpha(mix(c.s3, c.bgSurface, 0.3), 0.5);
  for (const [x, y, r] of DEEP) {
    ellipse(ctx, x, y, r, r);
    ctx.fill();
  }
}

function drawOrganelles(ctx, c) {
  // Endoplasmic reticulum: arcs hugging the nucleus.
  for (let i = 0; i < 3; i++) {
    hair(ctx, alpha(darken(c.s4, 0.1), 0.85), 2.2);
    ctx.beginPath();
    ctx.ellipse(NUCLEUS.x, NUCLEUS.y, NUCLEUS.rx + 14 + i * 9, NUCLEUS.ry + 12 + i * 8, 0, -0.5 + i * 0.15, 1.6 - i * 0.1);
    ctx.stroke();
  }

  // Ribosomes.
  ctx.fillStyle = alpha(darken(c.s3, 0.4), 0.7);
  for (const [x, y, r] of RIBOSOMES) {
    ellipse(ctx, x, y, r, r);
    ctx.fill();
  }

  for (const p of PARTS) {
    if (p.id === 'nucleus') drawNucleus(ctx, c, p);
    else if (p.id === 'mito') drawMito(ctx, c, p);
    else if (p.id === 'vacuole') drawVacuole(ctx, c, p);
    else if (p.id === 'golgi') drawGolgi(ctx, c, p);
  }
}

function drawNucleus(ctx, c, p) {
  const col = c.s5;
  ellipse(ctx, p.x, p.y + 2, p.rx, p.ry);
  ctx.fillStyle = darken(col, 0.3);
  ctx.fill();
  ellipse(ctx, p.x, p.y, p.rx, p.ry);
  ctx.fillStyle = mix(col, c.bgSurface, 0.35);
  ctx.fill();
  hair(ctx, darken(col, 0.35), 2.2);
  ctx.stroke();
  ellipse(ctx, p.x, p.y, p.rx - 4, p.ry - 4);
  hair(ctx, alpha(darken(col, 0.3), 0.6), 1);
  ctx.stroke();
  // Pores on the envelope.
  ctx.fillStyle = mix(c.s3, c.bgSurface, 0.62);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU;
    ellipse(ctx, p.x + Math.cos(a) * (p.rx - 2), p.y + Math.sin(a) * (p.ry - 2), 1.8, 1.8);
    ctx.fill();
  }
  // Chromatin threads (hairlines).
  hair(ctx, alpha(mix(col, c.label, 0.5), 0.6), 1.1);
  for (const pts of CHROMATIN) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let j = 1; j < pts.length - 1; j++) {
      const mx = (pts[j][0] + pts[j + 1][0]) / 2;
      const my = (pts[j][1] + pts[j + 1][1]) / 2;
      ctx.quadraticCurveTo(pts[j][0], pts[j][1], mx, my);
    }
    ctx.stroke();
  }
  // Nucleolus with a highlight.
  ellipse(ctx, p.x + 10, p.y - 6, 13, 12);
  ctx.fillStyle = darken(col, 0.1);
  ctx.fill();
  hair(ctx, darken(col, 0.4), 1.4);
  ctx.stroke();
  ellipse(ctx, p.x + 6, p.y - 10, 4, 3);
  ctx.fillStyle = lighten(col, 0.4);
  ctx.fill();
}

function drawMito(ctx, c, p) {
  const col = c.s8;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  ellipse(ctx, 0, 1.5, p.rx, p.ry);
  ctx.fillStyle = darken(col, 0.3);
  ctx.fill();
  ellipse(ctx, 0, 0, p.rx, p.ry);
  ctx.fillStyle = col;
  ctx.fill();
  ellipse(ctx, 0, 0, p.rx - 3, p.ry - 3);
  ctx.fillStyle = lighten(col, 0.35);
  ctx.fill();
  // Cristae: the folded inner membrane as one zigzag hairline.
  const n = Math.round(p.rx / 4.5);
  hair(ctx, darken(col, 0.3), 1.4);
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const x = -p.rx + 6 + (i / n) * (2 * p.rx - 12);
    const y = (i % 2 ? 1 : -1) * (p.ry - 5);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ellipse(ctx, 0, 0, p.rx, p.ry);
  hair(ctx, darken(col, 0.4), 1.8);
  ctx.stroke();
  ctx.restore();
}

function drawVacuole(ctx, c, p) {
  const col = c.s1;
  ellipse(ctx, p.x, p.y, p.rx, p.ry);
  ctx.fillStyle = mix(col, c.bgSurface, 0.55);
  ctx.fill();
  hair(ctx, darken(col, 0.25), 1.8);
  ctx.stroke();
  ellipse(ctx, p.x - p.rx * 0.35, p.y - p.ry * 0.4, p.rx * 0.22, p.ry * 0.14);
  ctx.fillStyle = alpha(lighten(col, 0.6), 0.8);
  ctx.fill();
}

function drawGolgi(ctx, c, p) {
  const col = c.s2;
  for (let i = 0; i < 4; i++) {
    const y = p.y - p.ry + 6 + i * 9;
    const w = p.rx - Math.abs(i - 1.5) * 4;
    ctx.beginPath();
    ctx.moveTo(p.x - w, y + 3);
    ctx.quadraticCurveTo(p.x, y - 7, p.x + w, y + 3);
    hair(ctx, darken(col, 0.25), 5.5);
    ctx.stroke();
    hair(ctx, lighten(col, 0.2), 3);
    ctx.stroke();
  }
  // Two little vesicles leaving.
  ctx.fillStyle = col;
  ellipse(ctx, p.x + p.rx + 4, p.y - 6, 3.2, 3.2);
  ctx.fill();
  ellipse(ctx, p.x + p.rx + 10, p.y + 4, 2.4, 2.4);
  ctx.fill();
}

// -- Screen drawing (after restore) --------------------------------------------------

function drawLabels(scene, ctx, c, cam, t) {
  const stage = Math.max(0, scene.stage);
  pill(ctx, c, TITLES[stage] || TITLES[0], W / 2, ZONES.top.y + 26, { bg: c.bgSurface, size: 17, display: true });
  pill(ctx, c, 'zoom x' + cam.z.toFixed(1), ZONES.top.x + ZONES.top.w - 4, ZONES.top.y + 26, {
    bg: c.accent, size: 15, align: 'right',
  });

  const moving = t < moveEnd(stage);
  // The focus part of this beat gets its name once the camera settles.
  const focus = stage === 1 ? MITO : stage === 2 ? NUCLEUS : null;
  const sel = scene.sel && scene.sel.part;
  if (focus && !moving && (!sel || sel.id !== focus.id)) {
    partLabel(ctx, c, focus, cam, pop(t - moveEnd(stage)));
  }
  if (sel) partLabel(ctx, c, sel, cam, pop(t - scene.sel.at));

  const hint = sel ? sel.fact : moving ? 'Tap to skip' : HINTS[stage] || HINTS[0];
  pill(ctx, c, hint, W / 2, ZONES.bottom.y + 26, { bg: sel ? c[sel.key] : c.bgSurface, size: 16 });
}

function partLabel(ctx, c, part, cam, pp) {
  if (!pp) return;
  // Anchor on the part's top edge in SCREEN space, then keep the chip inside the hero band.
  const [sx, sy] = toScreen(cam, part.x, part.y);
  const topY = sy - Math.max(part.ry * cam.z, 6) - 10;
  const above = topY - 34 > ZONES.top.y + ZONES.top.h + 18;
  const ly = above ? topY - 30 : clamp(sy + Math.max(part.ry * cam.z, 6) + 40, 110, ZONES.bottom.y - 24);
  const lx = clamp(sx, 110, W - 110);
  leader(ctx, lx, ly + (above ? 14 : -14), sx, above ? topY + 8 : sy + Math.max(part.ry * cam.z, 6) + 2, c.label, pp.alpha, 0);   // t = 0: static dashes, so the scene parks
  pill(ctx, c, part.name, lx, ly, { bg: c[part.key], size: 17, display: true, scale: pp.scale, alpha: pp.alpha });
}
