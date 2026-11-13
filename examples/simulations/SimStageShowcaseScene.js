/** SimStageShowcaseScene.js
 * SimStageShowcaseScene - 4-beat showcase for SimStage (stage bridges + contact shadows), states of water:
 *   Beat 0: an ice cube drops onto the bench; its contact shadow grows as it lands (lift)
 *   Beat 1: the ice cube becomes the water in a beaker (stageBridge: shrink, morph, grow)
 *   Beat 2: the water becomes a steam cloud over a hot plate (stageBridge, focus-hold)
 *   Beat 3: the cloud joins a row of all three; heat and cool arrows pop in
 * Every beat bridges from the same picture whichever beat came before.
 * Tap skips a running build to its end; Replay runs it again.
 */
import { SimScene } from 'simulations/base/kit/SimScene.js';
import {
  drawBackdrop,
  pill,
  rr,
  ellipse,
  alpha,
  mix,
  darken,
  lighten,
  inkOn,
  ZONES,
  W,
} from 'simulations/base/kit/SimLook.js';
import { spring, springDuration, pop, lagged, laggedTotal, dur } from 'simulations/base/kit/SimAnim.js';
import { stageBridge, contactShadow, BRIDGE_D } from 'simulations/base/kit/SimStage.js';

const TOP = 352;               // bench top (objects stand on this line)
const BR_AT = 0.45;            // bridge starts once the stage iris has opened
const BR_LEN = 2 * BRIDGE_D;   // whole bridge
const CAP_AT = BR_AT + BR_LEN + 0.05;
const DROP = springDuration('playful');
const ARROW_N = 4;
const ARROWS_END = CAP_AT + laggedTotal(ARROW_N, { dur: 0.35, lag: 0.12 });
const ENDS = [DROP + 0.5, CAP_AT + 0.5, CAP_AT + 0.5, ARROWS_END + 0.1];

const TITLES = ['Ice is a solid', 'Melt it: water is a liquid', 'Boil it: steam is a gas', 'One substance, three states'];
const CAPTIONS = [
  'Ice keeps its own shape.',
  'Water takes the shape of its jar.',
  'Steam spreads out to fill the space.',
  'Heat melts and boils. Cooling turns it back.',
];

// -- Outlines for the bridges (design px, built once) ---------------------------------

/** A rounded box as a superellipse: star-shaped, so it resamples cleanly by angle. */
function boxPts(cx, cy, a, b, n = 5, count = 96) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const th = -Math.PI + (i / count) * 2 * Math.PI;
    const cs = Math.cos(th), sn = Math.sin(th);
    out.push([cx + a * Math.sign(cs) * Math.pow(Math.abs(cs), 2 / n), cy + b * Math.sign(sn) * Math.pow(Math.abs(sn), 2 / n)]);
  }
  return out;
}

/** A puffy cloud: radius wobbles in 6 bumps, flattened. */
function cloudPts(cx, cy, r, count = 96) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const th = -Math.PI + (i / count) * 2 * Math.PI;
    const k = r * (1 + 0.1 * Math.abs(Math.cos(3 * th)) * 1.4 - 0.07);
    out.push([cx + Math.cos(th) * k * 1.5, cy + Math.sin(th) * k * 0.72]);
  }
  return out;
}

// Beat geometry.
const ICE = { x: 340, w: 150, h: 134 };
const BEAKER = { x: 340, w: 168, h: 208, level: 0.6 };
const PLATE = { x: 340, w: 230, h: 30 };
const CLOUD = { x: 340, y: 112, r: 60 };
const STEAM_S = 0.66;          // beaker scale on the hot plate
const ROW = { ice: 122, iceS: 0.7, beaker: 340, beakerS: 0.62, cloud: 556, cloudY: 262, cloudS: 0.62 };

const waterTop = (b, base, s) => base - 10 * s - (b.h - 14) * s * b.level;
const ICE_P = boxPts(ICE.x, TOP - ICE.h / 2, ICE.w / 2, ICE.h / 2);
const W1_TOP = waterTop(BEAKER, TOP, 1);
const WATER1_P = boxPts(BEAKER.x, (W1_TOP + TOP - 10) / 2, BEAKER.w / 2 - 9, (TOP - 10 - W1_TOP) / 2, 7);
const CLOUD2_P = cloudPts(CLOUD.x, CLOUD.y, CLOUD.r);
const CLOUD3_P = cloudPts(ROW.cloud, ROW.cloudY, CLOUD.r * ROW.cloudS);

export class SimStageShowcaseScene extends SimScene {
  static BEAT_STEP_MAP = [
    [{ idx: 0, dwellMs: null }],
    [{ idx: 1, dwellMs: null }],
    [{ idx: 2, dwellMs: null }],
    [{ idx: 3, dwellMs: null }],
  ];

  static ARIA_LABEL = 'States of water in four steps: an ice cube on a bench, the ice becoming water in a beaker, the water boiling into a steam cloud, and all three side by side with heat and cool arrows.';

  static CONTROLS = [{ type: 'button', id: 'replay', label: 'Replay' }];

  constructor(container, config) {
    super(container, config);
    this.t0 = 0;
    this.bridge = null;
    this.bridgeKey = null;
    this.bridgeC = null;
  }

  enter() {
    this.t0 = 0;
    this.bridge = null;
    this.bridgeKey = null;
  }

  onControlChange(id) {
    if (!this._guard(id)) return;
    if (id === 'replay') this.t0 = this.age;
    this.requestUiUpdate?.();
  }

  pointerDown() {
    const t = this.age - this.t0;
    const end = ENDS[this.stage] ?? 0;
    if (t < end) this.t0 = this.age - end - 0.01;
  }

  busy() {
    const t = this.age - this.t0;
    return t < dur(ENDS[this.stage] ?? 0);
  }

  draw(ctx, c) {
    const t = this.age - this.t0;
    const s = this.stage;
    if (s <= 0) {
      drawBeat0(ctx, c, t);
      caption(ctx, c, 0, t - DROP * 0.6);
      return;
    }
    const br = bridgeFor(this, c, s);
    br.draw(ctx, c, t - BR_AT);
    if (s === 3) drawArrows(ctx, c, t - CAP_AT);
    caption(ctx, c, s, t - CAP_AT);
  }
}

// -- Bridges -----------------------------------------------------------------------

function bridgeFor(scene, c, s) {
  const key = s;
  if (scene.bridge && scene.bridgeKey === key && scene.bridgeC === c) return scene.bridge;
  const pics = [
    { P: ICE_P, col: c.glass, draw: (ctx) => pic0(ctx, c, 1) },
    { P: WATER1_P, col: c.water, draw: (ctx) => pic1(ctx, c) },
    { P: CLOUD2_P, col: cloudCol(c), draw: (ctx) => pic2(ctx, c) },
    { P: CLOUD3_P, col: cloudCol(c), draw: (ctx) => pic3(ctx, c) },
  ];
  scene.bridge = stageBridge(pics[s - 1], pics[s]);
  scene.bridgeKey = key;
  scene.bridgeC = c;
  return scene.bridge;
}

// -- Pictures (each paints the whole stage) ----------------------------------------

function base(ctx, c, title) {
  drawBackdrop(ctx, c, 'dots');
  pill(ctx, c, title, W / 2, ZONES.top.y + 28, { bg: c.bgSurface, size: 17, display: true });
  drawBench(ctx, c);
}

function drawBeat0(ctx, c, t) {
  const p = spring(t, 'playful');
  pic0(ctx, c, p);
}

/** Ice on the bench; p = drop progress (0 high in the air, 1 landed; may overshoot). */
function pic0(ctx, c, p) {
  base(ctx, c, TITLES[0]);
  const lift = Math.max(0, Math.min(1, 1 - p));
  contactShadow(ctx, ICE.x, TOP, ICE.w, c, { lift });
  const squash = p > 1 ? 1 + (p - 1) * 0.6 : 1;
  drawIce(ctx, c, ICE.x, TOP - (1 - p) * 190, 1, squash);
}

function pic1(ctx, c) {
  base(ctx, c, TITLES[1]);
  contactShadow(ctx, BEAKER.x, TOP, BEAKER.w, c);
  drawBeaker(ctx, c, BEAKER.x, TOP, 1, { face: true });
}

function pic2(ctx, c) {
  base(ctx, c, TITLES[2]);
  contactShadow(ctx, PLATE.x, TOP, PLATE.w, c);
  drawPlate(ctx, c, PLATE.x, TOP, 1);
  const bTop = TOP - PLATE.h;
  drawBeaker(ctx, c, BEAKER.x, bTop, STEAM_S, { level: 0.42, bubbles: true });
  drawWisps(ctx, c, CLOUD.x, bTop - STEAM_S * BEAKER.h - 8, CLOUD.y + CLOUD.r * 0.7);
  drawCloud(ctx, c, CLOUD2_P, CLOUD.x, CLOUD.y, 1);
}

function pic3(ctx, c) {
  base(ctx, c, TITLES[3]);
  contactShadow(ctx, ROW.ice, TOP, ICE.w * ROW.iceS, c);
  drawIce(ctx, c, ROW.ice, TOP, ROW.iceS, 1);
  contactShadow(ctx, ROW.beaker, TOP, BEAKER.w * ROW.beakerS, c);
  drawBeaker(ctx, c, ROW.beaker, TOP, ROW.beakerS, { face: true });
  // The cloud floats: its shadow on the bench is lifted (small and faint).
  contactShadow(ctx, ROW.cloud, TOP, CLOUD.r * 2.6 * ROW.cloudS, c, { lift: 0.7 });
  drawCloud(ctx, c, CLOUD3_P, ROW.cloud, ROW.cloudY, ROW.cloudS);
}

// -- Props -------------------------------------------------------------------------

function drawBench(ctx, c) {
  const x0 = ZONES.heroWide.x + 24;
  const w = ZONES.heroWide.w - 48;
  const wood = mix(darken(c.gold, 0.2), c.bgSurface, 0.25);
  rr(ctx, x0, TOP + 6, w, 30, 10);
  ctx.fillStyle = darken(wood, 0.32);
  ctx.fill();
  rr(ctx, x0, TOP, w, 22, 10);
  ctx.fillStyle = wood;
  ctx.fill();
  ctx.fillStyle = lighten(wood, 0.22);
  ctx.fillRect(x0 + 14, TOP + 3, w - 28, 4);
}

function face(ctx, c, x, y, s, col, mood = 'smile') {
  const ink = darken(col, 0.72);
  ctx.fillStyle = ink;
  for (const dx of [-13, 13]) {
    ellipse(ctx, x + dx * s, y, 4.6 * s, 5.6 * s);
    ctx.fill();
  }
  ctx.fillStyle = lighten(col, 0.85);
  for (const dx of [-13, 13]) {
    ellipse(ctx, x + (dx + 1.6) * s, y - 1.8 * s, 1.6 * s, 1.6 * s);
    ctx.fill();
  }
  ctx.strokeStyle = ink;
  ctx.lineWidth = 2.5 * s;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (mood === 'o') ctx.arc(x, y + 12 * s, 3.2 * s, 0, Math.PI * 2);
  else ctx.arc(x, y + 6 * s, 7 * s, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.stroke();
  ctx.fillStyle = alpha(c.s4, 0.35);
  for (const dx of [-24, 24]) {
    ellipse(ctx, x + dx * s, y + 8 * s, 5 * s, 3 * s);
    ctx.fill();
  }
}

function drawIce(ctx, c, x, yBase, s, squash) {
  const w = ICE.w * s * squash, h = (ICE.h * s) / squash;
  const col = c.glass;
  const x0 = x - w / 2, y0 = yBase - h;
  rr(ctx, x0, y0 + 7 * s, w, h - 7 * s, 18 * s);
  ctx.fillStyle = darken(col, 0.22);
  ctx.fill();
  rr(ctx, x0, y0, w, h - 8 * s, 18 * s);
  ctx.fillStyle = col;
  ctx.fill();
  rr(ctx, x0 + 10 * s, y0 + 8 * s, w - 20 * s, 14 * s, 7 * s);
  ctx.fillStyle = lighten(col, 0.45);
  ctx.fill();
  ctx.strokeStyle = lighten(col, 0.6);
  ctx.lineWidth = 3 * s;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0 + w - 20 * s, y0 + 34 * s);
  ctx.lineTo(x0 + w - 20 * s, y0 + 52 * s);
  ctx.stroke();
  face(ctx, c, x, y0 + h * 0.52, s, col);
}

function drawBeaker(ctx, c, x, yBase, s, o = {}) {
  const w = BEAKER.w * s, h = BEAKER.h * s;
  const x0 = x - w / 2, y0 = yBase - h;
  const glassEdge = darken(c.glass, 0.18);
  // Glass body.
  rr(ctx, x0, y0, w, h, 14 * s);
  ctx.fillStyle = alpha(c.glass, 0.22);
  ctx.fill();
  // Water.
  const level = o.level ?? BEAKER.level;
  const wt = waterTop({ ...BEAKER, level }, yBase, s);
  rr(ctx, x0 + 9 * s, wt, w - 18 * s, yBase - 10 * s - wt, 9 * s);
  ctx.fillStyle = c.water;
  ctx.fill();
  ctx.fillStyle = lighten(c.water, 0.35);
  rr(ctx, x0 + 9 * s, wt, w - 18 * s, 7 * s, 3.5 * s);
  ctx.fill();
  if (o.bubbles) {
    ctx.strokeStyle = lighten(c.water, 0.6);
    ctx.lineWidth = 2.5 * s;
    for (const [dx, dy, r] of [[-26, 18, 5], [8, 30, 4], [30, 12, 6], [-6, 8, 3.5]]) {
      ctx.beginPath();
      ctx.arc(x + dx * s, wt + dy * s, r * s, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  if (o.face) face(ctx, c, x, wt + (yBase - wt) * 0.42, s, c.water);
  // Ticks and rim.
  ctx.strokeStyle = alpha(glassEdge, 0.9);
  ctx.lineWidth = 2.5 * s;
  ctx.beginPath();
  for (let i = 1; i <= 3; i++) {
    const ty = yBase - 10 * s - i * 0.22 * h;
    ctx.moveTo(x0 + w - 6 * s, ty);
    ctx.lineTo(x0 + w - 24 * s, ty);
  }
  ctx.stroke();
  rr(ctx, x0, y0, w, h, 14 * s);
  ctx.lineWidth = 4 * s;
  ctx.strokeStyle = glassEdge;
  ctx.stroke();
  rr(ctx, x0 - 6 * s, y0 - 4 * s, w + 12 * s, 10 * s, 5 * s);
  ctx.fillStyle = glassEdge;
  ctx.fill();
}

function drawPlate(ctx, c, x, yBase, s) {
  const w = PLATE.w * s, h = PLATE.h * s;
  const body = mix(c.stroke, c.label, 0.25);
  rr(ctx, x - w / 2, yBase - h + 5, w, h - 5, 8);
  ctx.fillStyle = darken(body, 0.35);
  ctx.fill();
  rr(ctx, x - w / 2, yBase - h, w, h - 6, 8);
  ctx.fillStyle = body;
  ctx.fill();
  rr(ctx, x - w / 2 + 18, yBase - h + 6, w - 36, 6, 3);
  ctx.fillStyle = c.flame;
  ctx.fill();
}

function cloudCol(c) {
  return mix(c.glass, c.bgSurface, 0.45);
}

function drawCloud(ctx, c, P, x, y, s) {
  const col = cloudCol(c);
  ctx.save();
  ctx.translate(0, 6 * s);
  outlinePath(ctx, P);
  ctx.fillStyle = darken(col, 0.2);
  ctx.fill();
  ctx.restore();
  outlinePath(ctx, P);
  ctx.fillStyle = col;
  ctx.fill();
  face(ctx, c, x, y - 4 * s, s, col, 'o');
}

function outlinePath(ctx, P) {
  ctx.beginPath();
  P.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
  ctx.closePath();
}

function drawWisps(ctx, c, x, y0, y1) {
  ctx.strokeStyle = alpha(cloudCol(c), 0.9);
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  for (const dx of [-30, 0, 30]) {
    ctx.beginPath();
    const n = 24;
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const yy = y0 + (y1 - y0) * u;
      const xx = x + dx * (1 + u * 0.4) + Math.sin(u * Math.PI * 1.5 + (dx > 0 ? 1 : 0)) * 5;
      if (i) ctx.lineTo(xx, yy);
      else ctx.moveTo(xx, yy);
    }
    ctx.stroke();
  }
}

// -- Beat 3 arrows -----------------------------------------------------------------

function drawArrows(ctx, c, t) {
  const iceR = ROW.ice + ICE.w * ROW.iceS / 2 + 12;
  const bL = ROW.beaker - BEAKER.w * ROW.beakerS / 2 - 14;
  const bR = ROW.beaker + BEAKER.w * ROW.beakerS / 2 + 14;
  const cL = ROW.cloud - CLOUD.r * ROW.cloudS * 1.6 - 10;
  const list = [
    { x0: iceR, x1: bL, y: 272, label: 'melts', col: c.flame, dir: 1 },
    { x0: bR, x1: cL, y: 252, label: 'boils', col: c.flame, dir: 1 },
    { x0: bR, x1: cL, y: 300, label: 'condenses', col: c.accent, dir: -1 },
    { x0: iceR, x1: bL, y: 314, label: 'freezes', col: c.accent, dir: -1 },
  ];
  list.forEach((a, i) => {
    const u = lagged(t, i, ARROW_N, { dur: 0.35, lag: 0.12 });
    if (u <= 0) return;
    const pp = pop(t - i * 0.12);
    const from = a.dir > 0 ? a.x0 : a.x1;
    const to = from + (a.dir > 0 ? 1 : -1) * (a.x1 - a.x0) * u;
    ctx.strokeStyle = a.col;
    ctx.fillStyle = a.col;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(from, a.y);
    ctx.lineTo(to, a.y);
    ctx.stroke();
    const d = a.dir > 0 ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(to + d * 8, a.y);
    ctx.lineTo(to - d * 6, a.y - 8);
    ctx.lineTo(to - d * 6, a.y + 8);
    ctx.closePath();
    ctx.fill();
    if (pp) {
      const above = a.dir > 0;
      pill(ctx, c, a.label, (a.x0 + a.x1) / 2, a.y + (above ? -18 : 18), {
        bg: a.col, size: 12, scale: pp.scale, alpha: pp.alpha, ink: inkOn(c, a.col),
      });
    }
  });
}

// -- Caption -----------------------------------------------------------------------

function caption(ctx, c, s, age) {
  const pp = pop(age);
  if (!pp) return;
  pill(ctx, c, CAPTIONS[s], W / 2, ZONES.bottom.y + 26, {
    bg: c.accent, size: 16, scale: pp.scale, alpha: pp.alpha,
  });
}
