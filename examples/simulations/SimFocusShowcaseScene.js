/** SimFocusShowcaseScene.js
 * SimFocusShowcaseScene - 4-beat showcase for SimFocus (show one part of a diagram):
 *   Beat 0: a plant builds in with numbered badges on the art and a numbered legend
 *   Beat 1: tap a number (or a part): it takes the one focus colour, the rest step down, indicate pulse
 *   Beat 2: stem + root as a team: lit window (dimOutside), outline sweep, brace, underlines
 *   Beat 3: "Which part makes food?" - right part: flash + sparkle + celebrate; wrong part: oops
 * Root branches and leaf veins end by fading (fadeAlong).
 */
import { SimScene } from 'simulations/base/kit/SimScene.js';
import {
  drawBackdrop,
  pill,
  rr,
  ellipse,
  mix,
  alpha,
  darken,
  lighten,
  inkOn,
  ZONES,
  W,
} from 'simulations/base/kit/SimLook.js';
import { pop, reducedMotion } from 'simulations/base/kit/SimAnim.js';
import {
  FOCUS_S,
  INDICATE_S,
  FLASH_S,
  SPARKLE_S,
  SWEEP_S,
  focusTone,
  toneMix,
  focusK,
  indicate,
  flashAt,
  sparkle,
  rectOutline,
  outlineSweep,
  brace,
  underline,
  dimOutside,
  fadeAlong,
  numberBadge,
  legendChips,
} from 'simulations/base/kit/SimFocus.js';

// -- The diagram (design units) -------------------------------------------------

const PARTS = [
  { id: 'flower', n: 1, name: 'Flower', job: 'Flower: makes seeds' },
  { id: 'leaf', n: 2, name: 'Leaf', job: 'Leaf: makes food from sunlight' },
  { id: 'stem', n: 3, name: 'Stem', job: 'Stem: holds the plant up' },
  { id: 'root', n: 4, name: 'Root', job: 'Root: takes in water' },
];
const CX = 300;
const GROUND_Y = 322;
const SOIL = { x: 170, y: GROUND_Y, w: 260, h: 108 };
const FLOWER = { x: CX, y: 128 };
const LEAVES = [
  { x: CX - 50, y: 252, rx: 50, ry: 19, rot: -0.38, base: [CX - 4, 268] },
  { x: CX + 50, y: 206, rx: 50, ry: 19, rot: 0.38, base: [CX + 4, 222] },
];
const STEM = [[CX, GROUND_Y + 2], [CX - 2, 262], [CX + 2, 204], [CX, 146]];
const TAPROOT = [[CX, GROUND_Y], [CX + 2, 352], [CX - 4, 384], [CX, 418]];
const BRANCHES = [
  [[CX - 1, 338], [CX - 26, 356], [CX - 52, 366], [CX - 78, 368]],
  [[CX + 1, 342], [CX + 28, 360], [CX + 54, 370], [CX + 80, 374]],
  [[CX - 2, 372], [CX - 22, 392], [CX - 46, 404]],
  [[CX - 1, 380], [CX + 22, 398], [CX + 48, 410]],
];
const HAIRS = [
  [[CX - 40, 362], [CX - 48, 352], [CX - 60, 346]],
  [[CX - 60, 367], [CX - 66, 380], [CX - 76, 388]],
  [[CX + 40, 365], [CX + 46, 354], [CX + 58, 348]],
  [[CX + 62, 371], [CX + 66, 386], [CX + 78, 394]],
  [[CX - 30, 398], [CX - 30, 412], [CX - 38, 422]],
  [[CX + 32, 404], [CX + 34, 418], [CX + 44, 424]],
];
// Leaf veins in leaf-local units (midrib along +x), each ending in a fade.
const VEINS = [
  [[-44, 0], [-10, 0], [20, 0], [44, 0]],
  [[-22, 0], [-12, -8], [-2, -13]],
  [[-22, 0], [-12, 8], [-2, 13]],
  [[2, 0], [12, -8], [22, -12]],
  [[2, 0], [12, 8], [22, 12]],
];
const CENTRES = { flower: [FLOWER.x, FLOWER.y], stem: [CX, 236], root: [CX, 372] };
const BADGES = {
  flower: { at: [CX + 66, 90], to: [CX + 30, 110] },
  leaf: { at: [CX - 104, 222], to: [CX - 76, 240] },
  stem: { at: [CX + 44, 288], to: [CX + 8, 284] },
  root: { at: [CX + 104, 352], to: [CX + 76, 372] },
};

const LEGEND_X = 508;
const LEGEND_Y = 140;
const BUILD_AT = { ground: 0, root: 0.12, stem: 0.24, leaf: 0.36, flower: 0.48 };
const BADGE_AT = 0.85;
const BUILD_END = BADGE_AT + 0.15 * 3 + 0.5;
const B1_FIRST = 0.3;
const B2 = { tone: 0.1, sweep: 0.35, brace: 0.6, label: 0.95, line: 1.15 };
const B2_END = B2.line + 0.2 * 2 + 0.45;
const ANSWER_S = Math.max(FLASH_S, SPARKLE_S + 0.24, FOCUS_S, INDICATE_S);

// -- Scene ----------------------------------------------------------------------

export class SimFocusShowcaseScene extends SimScene {
  static BEAT_STEP_MAP = [
    [{ idx: 0, dwellMs: null }],
    [{ idx: 1, dwellMs: null }],
    [{ idx: 2, dwellMs: null }],
    [{ idx: 3, dwellMs: null }],
  ];

  static ARIA_LABEL = 'A labelled plant with four numbered parts: flower, leaf, stem and root. Tap a number to focus a part, see stem and root grouped, then tap the part that makes food.';

  static CONTROLS = [{ type: 'button', id: 'replay', label: 'Replay' }];

  constructor(container, config) {
    super(container, config);
    this.bt = 0;
    this.focusId = null;
    this.focusAt = 0;
    this.toneFrom = null;
    this.toneTo = null;
    this.toneKey = null;
    this.toneC = null;
    this.base = null;
    this.down = null;
    this.chipBoxes = [];
    this.solved = false;
    this.answerAt = -1;
    this.answerPt = null;
    this.missAt = -1;
    this.missId = null;
  }

  enter() {
    resetBeat(this);
  }

  onControlChange(id) {
    if (!this._guard(id)) return;
    if (id === 'replay') resetBeat(this);
    this.requestUiUpdate?.();
  }

  update(d) {
    // The beat clock only runs while something is moving, so a parked scene holds still.
    if (this.busy()) this.bt += d;
  }

  busy() {
    const t = this.bt;
    if (this.stage === 0) return t < BUILD_END;
    if (this.stage === 1) return t < this.focusAt + Math.max(FOCUS_S, INDICATE_S);
    if (this.stage === 2) return t < B2_END;
    if (this.stage === 3) {
      if (this.solved) return t < this.answerAt + ANSWER_S;
      return this.missAt >= 0 && t < this.missAt + 0.5;
    }
    return false;
  }

  pointerDown(p) {
    const s = this.stage;
    if (s === 0) {
      if (this.bt < BUILD_END) this.bt = BUILD_END;
      return;
    }
    if (s === 2) {
      if (this.bt < B2_END) this.bt = B2_END;
      return;
    }
    const chip = chipAt(this.chipBoxes, p);
    const id = chip >= 0 ? PARTS[chip].id : partAt(p);
    if (s === 1) {
      if (id) setFocus(this, id);
      else if (this.bt < this.focusAt + INDICATE_S) this.focusAt = this.bt - INDICATE_S;
      return;
    }
    if (s === 3) {
      if (this.solved || !id) return;
      if (id === 'leaf') {
        this.solved = true;
        this.answerAt = this.bt;
        this.answerPt = chip >= 0 ? [LEAVES[0].x, LEAVES[0].y] : nearestLeaf(p);
        setFocus(this, 'leaf');
        this.celebrate(this.answerPt[0], this.answerPt[1], 28);
      } else {
        this.missAt = this.bt;
        this.missId = id;
        this.oops(p.x, p.y);
      }
    }
  }

  draw(ctx, c) {
    drawBackdrop(ctx, c, 'dots');
    syncTones(this, c);
    const s = this.stage;
    if (s === 0) drawBeat0(this, ctx, c);
    else if (s === 1) drawBeat1(this, ctx, c);
    else if (s === 2) drawBeat2(this, ctx, c);
    else drawBeat3(this, ctx, c);
  }
}

// -- State ----------------------------------------------------------------------

// Every beat starts from the same state, whichever beat came before.
function resetBeat(scene) {
  scene.bt = 0;
  scene.solved = false;
  scene.answerAt = -1;
  scene.answerPt = null;
  scene.missAt = -1;
  scene.missId = null;
  scene.focusId = null;
  scene.focusAt = 0;
  scene.toneKey = null;
  scene.toneC = null;
  if (scene.stage === 1) {
    scene.focusId = 'flower';
    scene.focusAt = B1_FIRST;
  } else if (scene.stage === 2) {
    scene.focusAt = B2.tone;
  }
}

function partsFor(c) {
  return [
    { id: 'flower', base: c.s4 },
    { id: 'leaf', base: c.s3 },
    { id: 'stem', base: mix(c.s3, c.s2, 0.45) },
    { id: 'root', base: mix(c.s2, c.label, 0.18) },
    { id: 'ground', base: mix(c.s8, c.stroke, 0.62), structure: true },
  ];
}

// Tone tables are built when the focus or the colours change, never per frame.
function syncTones(scene, c) {
  const key = scene.stage + ':' + scene.focusId;
  if (scene.toneC === c && scene.toneKey === key) return;
  const parts = partsFor(c);
  scene.base = focusTone(c, parts, null);
  scene.down = focusTone(c, parts, null, { lit: [] });
  let to = scene.base;
  if (scene.stage === 2) to = focusTone(c, parts, null, { lit: ['stem', 'root'] });
  else if (scene.focusId) to = focusTone(c, parts, scene.focusId);
  // A colour reload (theme switch) snaps; a focus change cross-fades from what is on screen.
  if (scene.toneC !== c || !scene.toneTo) scene.toneFrom = scene.base;
  scene.toneTo = to;
  scene.toneC = c;
  scene.toneKey = key;
}

function setFocus(scene, id) {
  if (id === scene.focusId && scene.bt - scene.focusAt < FOCUS_S) return;
  scene.toneFrom = currentTones(scene);
  scene.focusId = id;
  scene.focusAt = scene.bt;
  scene.toneKey = null;
}

function currentTones(scene) {
  if (!scene.toneTo) return scene.toneFrom;
  return toneMix(scene.toneFrom, scene.toneTo, focusK(scene.bt - scene.focusAt));
}

// -- Hit tests --------------------------------------------------------------------

function inLeaf(L, p) {
  const dx = p.x - L.x, dy = p.y - L.y;
  const ca = Math.cos(-L.rot), sa = Math.sin(-L.rot);
  const u = dx * ca - dy * sa, v = dx * sa + dy * ca;
  return (u * u) / ((L.rx + 8) * (L.rx + 8)) + (v * v) / ((L.ry + 8) * (L.ry + 8)) <= 1;
}

function partAt(p) {
  if (Math.hypot(p.x - FLOWER.x, p.y - FLOWER.y) <= 50) return 'flower';
  if (LEAVES.some((L) => inLeaf(L, p))) return 'leaf';
  if (p.x >= CX - 16 && p.x <= CX + 16 && p.y >= 150 && p.y <= GROUND_Y) return 'stem';
  if (p.x >= SOIL.x && p.x <= SOIL.x + SOIL.w && p.y >= GROUND_Y && p.y <= SOIL.y + SOIL.h) return 'root';
  if (Math.hypot(p.x - BADGES.leaf.at[0], p.y - BADGES.leaf.at[1]) <= 18) return 'leaf';
  for (const P of PARTS) {
    const b = BADGES[P.id].at;
    if (Math.hypot(p.x - b[0], p.y - b[1]) <= 18) return P.id;
  }
  return null;
}

function nearestLeaf(p) {
  const L = LEAVES.find((q) => inLeaf(q, p)) ?? LEAVES[0];
  return [L.x, L.y];
}

function chipAt(boxes, p) {
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    if (b && p.x >= b.x0 - 4 && p.x <= b.x0 + b.w + 4 && p.y >= b.y0 - 4 && p.y <= b.y0 + b.h + 4) return i;
  }
  return -1;
}

// -- Drawing: the plant ----------------------------------------------------------------

function withScale(ctx, cx, cy, s, fn) {
  if (s === 1) { fn(); return; }
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.translate(-cx, -cy);
  fn();
  ctx.restore();
}

function strokeLine(ctx, pts, col, w) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.strokeStyle = col;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function drawGround(ctx, c, T) {
  const g = T.ground;
  ctx.fillStyle = g.shade;
  rr(ctx, SOIL.x, SOIL.y + 6, SOIL.w, SOIL.h, 24);
  ctx.fill();
  ctx.fillStyle = g.fill;
  rr(ctx, SOIL.x, SOIL.y, SOIL.w, SOIL.h, 24);
  ctx.fill();
  ctx.fillStyle = alpha(g.shade, 0.6);
  for (const [x, y, r] of [[196, 344, 4], [404, 360, 5], [214, 410, 3], [388, 412, 4], [240, 340, 3]]) {
    ellipse(ctx, x, y, r, r * 0.7);
    ctx.fill();
  }
  ctx.strokeStyle = g.edge;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(SOIL.x + 14, GROUND_Y);
  ctx.lineTo(SOIL.x + SOIL.w - 14, GROUND_Y);
  ctx.stroke();
}

function drawRoot(ctx, c, T) {
  const r = T.root;
  fadeAlong(ctx, TAPROOT, { fade: [0, 22], col: r.shade, w: 11 });
  fadeAlong(ctx, TAPROOT, { fade: [0, 22], col: r.fill, w: 8 });
  for (const B of BRANCHES) fadeAlong(ctx, B, { fade: [0, 26], col: r.fill, w: 5 });
  for (const h of HAIRS) fadeAlong(ctx, h, { fade: [0, 14], col: r.fill, w: 2.5 });
}

function drawStem(ctx, c, T) {
  const st = T.stem;
  ctx.save();
  ctx.translate(2.5, 0);
  strokeLine(ctx, STEM, st.shade, 12);
  ctx.restore();
  strokeLine(ctx, STEM, st.fill, 11);
}

function drawLeaves(ctx, c, T, s = 1) {
  const lf = T.leaf;
  for (const L of LEAVES) {
    strokeLine(ctx, [L.base, [lerpPt(L.base, [L.x, L.y], 0.5)[0], L.base[1] - 6], [L.x, L.y]], lf.shade, 4);
    withScale(ctx, L.x, L.y, s, () => {
      ctx.save();
      ctx.translate(L.x, L.y);
      ctx.rotate(L.rot);
      ctx.fillStyle = lf.shade;
      ellipse(ctx, 0, 3, L.rx, L.ry);
      ctx.fill();
      ctx.fillStyle = lf.fill;
      ellipse(ctx, 0, 0, L.rx, L.ry);
      ctx.fill();
      ctx.fillStyle = lighten(lf.fill, 0.28);
      ellipse(ctx, -14, -8, 14, 3.5);
      ctx.fill();
      for (const v of VEINS) fadeAlong(ctx, v, { fade: [0, 10], col: lf.shade, w: 2 });
      ctx.restore();
    });
  }
}

function lerpPt(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

function drawFlower(ctx, c, T) {
  const f = T.flower;
  const { x, y } = FLOWER;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    const px = x + Math.cos(a) * 22, py = y + Math.sin(a) * 22;
    ctx.fillStyle = f.shade;
    ellipse(ctx, px, py + 3, 20, 13, a);
    ctx.fill();
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    const px = x + Math.cos(a) * 22, py = y + Math.sin(a) * 22;
    ctx.fillStyle = f.fill;
    ellipse(ctx, px, py, 20, 13, a);
    ctx.fill();
  }
  ctx.fillStyle = f.edge;
  ellipse(ctx, x, y + 2, 14, 14);
  ctx.fill();
  ctx.fillStyle = lighten(f.edge, 0.25);
  ellipse(ctx, x - 4, y - 3, 5, 3.5);
  ctx.fill();
}

/** Whole plant. sc: { [id]: { scale, alpha } | null (not yet) }, default all shown. */
function drawPlant(ctx, c, T, sc = {}) {
  const order = [['ground', drawGround], ['root', drawRoot], ['stem', drawStem], ['leaf', drawLeaves], ['flower', drawFlower]];
  for (const [id, fn] of order) {
    const v = sc[id];
    if (v === null) continue;
    const s = v?.scale ?? 1;
    const a = v?.alpha ?? 1;
    if (id === 'leaf') {
      ctx.save();
      ctx.globalAlpha *= a;
      fn(ctx, c, T, s);
      ctx.restore();
      continue;
    }
    const ctr = id === 'ground' ? [CX, GROUND_Y + 50] : CENTRES[id];
    ctx.save();
    ctx.globalAlpha *= a;
    withScale(ctx, ctr[0], ctr[1], s, () => fn(ctx, c, T));
    ctx.restore();
  }
}

function drawBadges(ctx, c, T, popFor = () => undefined) {
  for (const P of PARTS) {
    const b = BADGES[P.id];
    const pp = popFor(P);
    if (pp === null) continue;
    const a = pp?.alpha ?? 1;
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.strokeStyle = c.labelMuted;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(b.at[0], b.at[1]);
    ctx.lineTo(b.to[0], b.to[1]);
    ctx.stroke();
    ctx.fillStyle = c.labelMuted;
    ellipse(ctx, b.to[0], b.to[1], 3, 3);
    ctx.fill();
    ctx.restore();
    numberBadge(ctx, c, P.n, b.at[0], b.at[1], { bg: T[P.id].fill, ink: inkOn(c, T[P.id].fill), r: 14, scale: pp?.scale ?? 1, alpha: a });
  }
}

function drawSun(ctx, c) {
  const x = 92, y = 128;
  ctx.strokeStyle = alpha(c.warning, 0.7);
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.moveTo(x + Math.cos(a) * 36, y + Math.sin(a) * 36);
    ctx.lineTo(x + Math.cos(a) * 48, y + Math.sin(a) * 48);
  }
  ctx.stroke();
  ctx.fillStyle = darken(c.warning, 0.18);
  ellipse(ctx, x, y + 3, 26, 26);
  ctx.fill();
  ctx.fillStyle = c.warning;
  ellipse(ctx, x, y, 26, 26);
  ctx.fill();
  ctx.fillStyle = lighten(c.warning, 0.4);
  ellipse(ctx, x - 9, y - 9, 7, 4.5);
  ctx.fill();
}

function legend(scene, ctx, c, T, extra = () => ({})) {
  const items = PARTS.map((P, i) => ({ n: P.n, text: P.name, bg: T[P.id].fill, ...extra(P, i) }));
  const L = legendChips(ctx, c, items, LEGEND_X, LEGEND_Y, { gap: 14, size: 17 });
  scene.chipBoxes = L.boxes;
  return L;
}

function title(ctx, c, text) {
  pill(ctx, c, text, W / 2, ZONES.top.y + 28, { bg: c.bgSurface, size: 18, display: true });
}

function caption(ctx, c, text, bg) {
  pill(ctx, c, text, W / 2, ZONES.bottom.y + 26, { bg: bg ?? c.raised, size: 16 });
}

// -- Beats --------------------------------------------------------------------------

function drawBeat0(scene, ctx, c) {
  const t = scene.bt;
  title(ctx, c, 'Parts of a plant');
  drawSun(ctx, c);
  const sc = {};
  for (const id of Object.keys(BUILD_AT)) {
    const p = pop(t - BUILD_AT[id]);
    sc[id] = p ? { scale: p.scale, alpha: p.alpha } : null;
  }
  drawPlant(ctx, c, scene.base, sc);
  drawBadges(ctx, c, scene.base, (P) => pop(t - BADGE_AT - (P.n - 1) * 0.15));
  legend(scene, ctx, c, scene.base, (P) => ({ pop: pop(t - BADGE_AT - (P.n - 1) * 0.15 - 0.1) }));
  if (reducedMotion() || t >= BUILD_END - 0.3) caption(ctx, c, 'Each number names one part');
}

function drawBeat1(scene, ctx, c) {
  const t = scene.bt;
  title(ctx, c, 'Tap a number to find the part');
  drawSun(ctx, c);
  const T = currentTones(scene);
  const ind = indicate((t - scene.focusAt) / INDICATE_S, 0.2);
  const id = scene.focusId;
  const sc = id ? { [id]: { scale: ind.s, alpha: 1 } } : {};
  drawPlant(ctx, c, T, sc);
  drawBadges(ctx, c, T);
  const fi = PARTS.findIndex((P) => P.id === id);
  legend(scene, ctx, c, T, (P, i) => (i === fi ? { scale: 1 + (ind.s - 1) * 0.5 } : {}));
  if (fi >= 0) caption(ctx, c, PARTS[fi].job, c.raised);
}

function groupPath(g) {
  g.rect(CX - 10, 160, 20, GROUND_Y - 160);
  g.rect(SOIL.x - 4, GROUND_Y, SOIL.w + 8, SOIL.h + 10);
}

function drawBeat2(scene, ctx, c) {
  const t = scene.bt;
  title(ctx, c, 'Stem and root work as a team');
  // One lit pass for the group window, one dim pass for everything outside it.
  // Inside the window the plant uses the group table, so a leaf tip that crosses
  // the window edge has the same tone on both sides (no seam).
  const k = focusK(t - B2.tone);
  const T = currentTones(scene);
  const dimT = toneMix(scene.base, scene.down, k);
  dimOutside(ctx, groupPath, (g) => drawPlant(g, c, T), { drawDim: (g) => drawPlant(g, c, dimT) });
  drawBadges(ctx, c, T);

  // Circumscribe the pair once, then the brace and its label stay.
  const sweepP = reducedMotion() ? 1 : (t - B2.sweep) / SWEEP_S;
  outlineSweep(ctx, rectOutline(SOIL.x - 12, 128, SOIL.w + 24, GROUND_Y - 128 + SOIL.h + 18, 22), sweepP, { col: c.accent, lw: 4 });
  const braceX = SOIL.x - 22;
  brace(ctx, braceX, 146, SOIL.y + SOIL.h, { col: c.label, lw: 4, depth: 16, p: (t - B2.brace) / 0.45 });
  const lp = pop(t - B2.label);
  if (lp) pill(ctx, c, 'Carry water', braceX - 16, (146 + SOIL.y + SOIL.h) / 2, { align: 'right', bg: c.s7, size: 16, scale: lp.scale, alpha: lp.alpha });

  const L = legend(scene, ctx, c, T);
  [2, 3].forEach((i, j) => {
    const b = L.boxes[i];
    if (!b) return;
    underline(ctx, b.x0 + 8, b.x0 + b.w - 8, b.y0 + b.h + 7, { col: c.label, w: 3, p: (t - B2.line - j * 0.2) / 0.4 });
  });
  if (reducedMotion() || t >= B2_END - 0.3) caption(ctx, c, 'Root takes in water, stem carries it up');
}

function drawBeat3(scene, ctx, c) {
  const t = scene.bt;
  title(ctx, c, 'Which part makes food?');
  drawSun(ctx, c);
  const T = currentTones(scene);
  const missU = scene.missAt >= 0 ? (t - scene.missAt) / 0.5 : 1;
  drawPlant(ctx, c, T, scene.solved ? { leaf: { scale: indicate((t - scene.answerAt) / INDICATE_S).s, alpha: 1 } } : {});
  drawBadges(ctx, c, T);
  legend(scene, ctx, c, T);
  if (scene.solved) {
    const [x, y] = scene.answerPt;
    const u = t - scene.answerAt;
    flashAt(ctx, x, y, u / FLASH_S, c.warning);
    const spots = [[x - 58, y - 30, 12], [x + 54, y - 34, 14], [x + 40, y + 34, 10]];
    spots.forEach(([sx, sy, r], i) => sparkle(ctx, sx, sy, r, (u - 0.08 * (i + 1)) / SPARKLE_S, c.warning, 3));
    caption(ctx, c, 'Yes! Leaves make food from sunlight', c.good);
  } else if (missU < 1) {
    caption(ctx, c, 'Not that one. Try again!', c.bad);
  } else {
    caption(ctx, c, 'Tap the part (or its number)');
  }
}
