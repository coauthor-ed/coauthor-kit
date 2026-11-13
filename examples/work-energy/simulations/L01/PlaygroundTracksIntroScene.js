import { SimScene } from 'simulations/base/kit/SimScene.js';
import { W, rr, drawBackdrop, drawDepth, drawFloor, drawCard, drawShadow, pill, font, alpha, darken, lighten } from 'simulations/base/kit/SimLook.js';
import { drawPlaygroundKid } from './PlaygroundKids.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }], // the playground at the top of the platform
  [{ idx: 1, dwellMs: null }], // three questions, none answered
  [{ idx: 2, dwellMs: null }], // the panel reports geometry only
];

const H_MIN = 1;
const H_MAX = 4;
const H_START = 3;
const PX_PER_M = 72;
const GRASS_Y = 386;
const DECK_X0 = 44;
const DECK_X1 = W - 44;
const HW = 8; // half width of a slide ribbon

const ROUGH = [
  { value: 'smooth', label: 'Smooth', bumps: 0 },
  { value: 'few', label: 'A few bumps', bumps: 4 },
  { value: 'many', label: 'Many bumps', bumps: 9 },
];
const MASS = [
  { value: 'light', label: 'Light', kg: 25 },
  { value: 'medium', label: 'Medium', kg: 40 },
  { value: 'heavy', label: 'Heavy', kg: 60 },
];

// The three lanes, left to right, in the order the source gives them.
// `rough` / `mass` are the defaults: the red chute starts with bumps so the
// bump readout has something to show, and the three children are not clones.
const TRACKS = [
  { id: 'a', kind: 'spiral', cx: 122, col: 's7', name: 'Blue', rough: 'smooth', mass: 'light' },
  { id: 'b', kind: 'straight', cx: 340, col: 's6', name: 'Red', rough: 'few', mass: 'medium' },
  { id: 'c', kind: 'wavy', cx: 558, col: 's5', name: 'Purple', rough: 'smooth', mass: 'heavy' },
];

function roughFor(id) {
  const v = this.getControlValue(`rough-${id}`);
  return ROUGH.find((r) => r.value === v) || ROUGH[0];
}

function massFor(id) {
  const v = this.getControlValue(`mass-${id}`);
  return MASS.find((m) => m.value === v) || MASS[0];
}

function heightM() {
  const v = Number(this.getControlValue('height'));
  return Number.isFinite(v) ? Math.max(H_MIN, Math.min(H_MAX, v)) : H_START;
}

// The drawn points for one track, plus a per-point "near" flag for the coil
// (which half of each turn is in front). Path length is measured off this same
// list, so the number on screen and the curve on screen cannot disagree.
function trackPoints(t, topY) {
  const span = GRASS_Y - topY;
  const pts = [];
  const near = [];
  if (t.kind === 'straight') {
    for (let i = 0; i <= 40; i++) {
      const u = i / 40;
      pts.push([t.cx, topY + u * span]);
      near.push(true);
    }
  } else if (t.kind === 'wavy') {
    // two crests on the way down
    for (let i = 0; i <= 80; i++) {
      const u = i / 80;
      pts.push([t.cx - 62 + u * 124, topY + u * span - Math.sin(u * Math.PI * 4) * 22]);
      near.push(true);
    }
  } else {
    // a helix flattened to the page: 1.5 turns, curling in on itself. The small
    // depth wobble is what makes the over-and-under read as a coil.
    const TURNS = 1.5;
    const DEPTH = 7;
    for (let i = 0; i <= 140; i++) {
      const u = i / 140;
      const th = u * TURNS * Math.PI * 2;
      const r = 40 - u * 18;
      pts.push([t.cx + r * Math.cos(th), topY + 7 + u * (span - 7) + DEPTH * Math.cos(th)]);
      near.push(Math.cos(th) > 0);
    }
  }
  return { pts, near };
}

function pathLength(pts) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) {
    L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  }
  return L / PX_PER_M;
}

function fmt(n) {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

// One flat band of constant half width around a polyline, as a filled polygon.
function ribbonPath(ctx, pts, i0, i1, hw) {
  const n = i1 - i0 + 1;
  const A = [];
  const B = [];
  for (let i = i0; i <= i1; i++) {
    const a = pts[Math.max(i0, i - 1)];
    const b = pts[Math.min(i1, i + 1)];
    let dx = b[0] - a[0];
    let dy = b[1] - a[1];
    const L = Math.hypot(dx, dy) || 1;
    dx /= L;
    dy /= L;
    A.push([pts[i][0] - dy * hw, pts[i][1] + dx * hw]);
    B.push([pts[i][0] + dy * hw, pts[i][1] - dx * hw]);
  }
  ctx.beginPath();
  ctx.moveTo(A[0][0], A[0][1]);
  for (let i = 1; i < n; i++) ctx.lineTo(A[i][0], A[i][1]);
  for (let i = n - 1; i >= 0; i--) ctx.lineTo(B[i][0], B[i][1]);
  ctx.closePath();
}

// Contiguous runs of one flag, so the coil's far half is laid down first and
// its near half paints over it.
function runs(near) {
  const out = [];
  let i = 0;
  while (i < near.length) {
    let j = i;
    while (j + 1 < near.length && near[j + 1] === near[i]) j++;
    out.push([i, j]);
    i = j + 1;
  }
  return out;
}

export class PlaygroundTracksIntroScene extends SimScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static ARIA_LABEL = 'A raised platform with three slides descending from it; each reports how far down, how far along its path, and how many bumps.';
  static NOTE_STAGE = 0;
  static NOTE_TITLE = 'NOTE';
  static CONTROLS = [
    { id: 'height', label: 'Platform height', type: 'slider', min: H_MIN, max: H_MAX, step: 0.5, value: H_START, suffix: ' m' },
    ...TRACKS.flatMap((t) => [
      { id: `rough-${t.id}`, label: `${t.name} path`, type: 'select', options: ROUGH, value: t.rough },
      { id: `mass-${t.id}`, label: `${t.name} child`, type: 'select', options: MASS, value: t.mass },
    ]),
  ];

  noteRows() {
    return [
      { text: 'Drawn as curves' },
      { text: 'The spiral is flattened' },
      { text: 'Geometry only' },
    ];
  }

  async setup() {
    await super.setup();
  }

  enter(stage) {
    // The iris-in belongs to the first beat only; later beats just swap the stage.
    if (this._entered) this._k.fade = 1;
    this._entered = true;
    this.requestUiUpdate?.();
  }

  // The dials only appear on the third beat, once the learner has seen what
  // the three slides are.
  isControlHidden() {
    return this.stage < 2;
  }

  onControlChange(id) {
    if (!this._guard(id)) return;
    // A dial change redraws; nothing runs and nothing ever moves.
    this.requestUiUpdate?.();
  }

  // Nothing ever moves, so the scene is at rest at all times.
  busy() {
    return false;
  }

  update() {}

  draw(ctx, c) {
    drawBackdrop(ctx, c, 'dots');
    drawDepth(ctx, c, { k: 0.75, t: this.clock, seed: 11 });
    const h = heightM.call(this);
    const topY = GRASS_Y - h * PX_PER_M;

    drawFloor(ctx, c, GRASS_Y);
    this._platform(ctx, c, topY, h);

    for (const t of TRACKS) {
      const { pts, near } = trackPoints(t, topY);
      this._track(ctx, c, t, pts, near);
      this._bumps(ctx, c, t, pts, roughFor.call(this, t.id).bumps);
      this._child(ctx, c, t, topY, massFor.call(this, t.id));
      this._readout(ctx, c, t, h, pathLength(pts), roughFor.call(this, t.id).bumps);
    }

    pill(ctx, c, `Platform ${fmt(h)} m - all three drop the same`, W / 2, 26, {
      align: 'center', bg: c.accent, size: 15,
    });
  }

  _platform(ctx, c, topY, h) {
    const w = DECK_X1 - DECK_X0;
    ctx.save();
    // legs first, so the deck sits on them
    ctx.fillStyle = darken(c.raised, 0.3);
    for (const lx of [232, 448]) {
      rr(ctx, lx, topY + 8, 12, GRASS_Y - topY - 8, 3);
      ctx.fill();
    }
    ctx.fillStyle = lighten(c.raised, 0.12);
    for (const lx of [232, 448]) {
      rr(ctx, lx + 1, topY + 8, 4, GRASS_Y - topY - 8, 2);
      ctx.fill();
    }
    // the deck slab
    rr(ctx, DECK_X0, topY - 4, w, 20, 4);
    ctx.fillStyle = c.raised;
    ctx.fill();
    rr(ctx, DECK_X0 + 4, topY - 4, w - 8, 5, 2);
    ctx.fillStyle = lighten(c.raised, 0.28);
    ctx.fill();
    rr(ctx, DECK_X0, topY + 10, w, 6, 3);
    ctx.fillStyle = darken(c.raised, 0.3);
    ctx.fill();
    ctx.restore();
    // the height measure, once, on the left
    const mx = 26;
    ctx.save();
    ctx.strokeStyle = alpha(c.labelMuted, 0.9);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(mx, topY);
    ctx.lineTo(mx, GRASS_Y);
    ctx.moveTo(mx - 6, topY);
    ctx.lineTo(mx + 6, topY);
    ctx.moveTo(mx - 6, GRASS_Y);
    ctx.lineTo(mx + 6, GRASS_Y);
    ctx.stroke();
    ctx.restore();
    pill(ctx, c, `${fmt(h)} m`, mx, (topY + GRASS_Y) / 2, { bg: c.accent, size: 13 });
  }

  _track(ctx, c, t, pts, near) {
    const col = c[t.col];
    const cushion = darken(col, 0.34);
    const groups = runs(near);
    // far half first, then the near half on top: the coil reads as a coil
    const order = t.kind === 'spiral' ? [...groups].sort((a, b) => (near[a[0]] ? 1 : -1)) : groups;
    ctx.save();
    for (const [i0, i1] of order) {
      ribbonPath(ctx, pts, i0, i1, HW + 3);
      ctx.fillStyle = cushion;
      ctx.fill();
      ribbonPath(ctx, pts, i0, i1, HW);
      ctx.fillStyle = col;
      ctx.fill();
      ribbonPath(ctx, pts, i0, i1, HW - 3);
      ctx.fillStyle = lighten(col, 0.3);
      ctx.fill();
    }
    ctx.restore();
    // the slide lands on the grass rather than stopping in mid air
    const e = pts[pts.length - 1];
    ctx.save();
    ctx.fillStyle = darken(col, 0.2);
    rr(ctx, e[0] - 20, e[1] - 4, 40, 8, 4);
    ctx.fill();
    ctx.restore();
  }

  // Bumps as arcs across the slide, not filled round-rects, so a run of them
  // cannot become a containing panel for the mass tag above them.
  _bumps(ctx, c, t, pts, n) {
    if (!n) return;
    ctx.save();
    ctx.strokeStyle = darken(c[t.col], 0.42);
    ctx.lineWidth = 3;
    for (let i = 0; i < n; i++) {
      const at = Math.floor(((i + 1) / (n + 1)) * (pts.length - 1));
      const [x, y] = pts[at];
      const [nx, ny] = pts[Math.min(pts.length - 1, at + 1)];
      const a = Math.atan2(ny - y, nx - x);
      ctx.beginPath();
      ctx.arc(x, y, HW + 2, a - 1.7, a + 1.7);
      ctx.stroke();
    }
    ctx.restore();
  }

  _child(ctx, c, t, topY, m) {
    const x = t.kind === 'spiral' ? t.cx + 40 : t.kind === 'wavy' ? t.cx - 62 : t.cx;
    const i = t.kind === 'spiral' ? 0 : t.kind === 'wavy' ? 2 : 1;
    drawPlaygroundKid(ctx, c, i, x, topY, 52, { t: this.clock });
    // the mass tag, clear of the child and of every track
    pill(ctx, c, `${m.kg} kg`, x + 46, topY - 30, { bg: c.accent, size: 13 });
  }

  // Exactly three readings per track, in the bottom band, never in a track lane.
  _readout(ctx, c, t, h, pathM, bumps) {
    const w = 180;
    const x = t.cx - w / 2;
    const y = 400;
    drawCard(ctx, c, x, y, w, 84, 1, { r: 10, accent: c[t.col] });
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = font(c, 800, 15, true);
    ctx.fillStyle = c[t.col];
    ctx.fillText(t.name, x + 12, y + 20);
    ctx.font = font(c, 600, 14);
    ctx.fillStyle = c.labelMuted;
    ctx.fillText(`drop ${fmt(h)} m`, x + 12, y + 40);
    ctx.fillText(`path ${fmt(pathM)} m`, x + 12, y + 58);
    ctx.fillText(`bumps ${bumps}`, x + 12, y + 74);
    ctx.restore();
  }
}
