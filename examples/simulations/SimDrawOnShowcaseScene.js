/** SimDrawOnShowcaseScene.js
 * SimDrawOnShowcaseScene - 4-beat showcase for SimDrawOn (canvas draw-on of paths and text):
 *   Beat 0: Convex-lens ray diagram built in order - axis, lens, marks (structure), object and two
 *           rays drawing on with a pen dot (data), then one label
 *   Beat 1: A circuit loop drawn on as a ribbon wire; the bulb lights when the loop closes
 *   Beat 2: writeOn of an English heading and the Hindi word prakash (grapheme mode, clusters stay
 *           whole) plus a Hindi phrase in word mode
 *   Beat 3: revealPath + zigzag uncovering a finished diagram (a pencil that looks bent in water)
 * Tap skips a running build to its end; Replay re-runs the beat.
 */
import { SimScene } from 'simulations/base/kit/SimScene.js';
import {
  drawBackdrop,
  drawCard,
  drawShadow,
  pill,
  font,
  rr,
  ellipse,
  alpha,
  darken,
  lighten,
  ZONES,
  W,
} from 'simulations/base/kit/SimLook.js';
import { TIMING, cues, pop, dur, reducedMotion, ease } from 'simulations/base/kit/SimAnim.js';
import {
  drawOn,
  drawDuration,
  pointAt,
  cumOf,
  pathLen,
  graphemes,
  writeOn,
  withReveal,
  zigzag,
} from 'simulations/base/kit/SimDrawOn.js';

// -- Beat 0: ray diagram (design px) -----------------------------------------------
const AXIS_Y = 268;
const LENS_X = 340;
const FOCAL = 118;
const AXIS = [[40, AXIS_Y], [640, AXIS_Y]];
const OBJ_X = LENS_X - 2 * FOCAL;           // object at 2F
const IMG_X = LENS_X + 2 * FOCAL;           // real image at 2F'
const OBJ_H = 74;
const OBJECT = [[OBJ_X, AXIS_Y], [OBJ_X, AXIS_Y - OBJ_H]];
const IMAGE = [[IMG_X, AXIS_Y], [IMG_X, AXIS_Y + OBJ_H]];
const TIPO = OBJECT[1];
const TIPI = IMAGE[1];
const extend = (a, b, x) => [x, a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0])];
const RAY1 = [TIPO, [LENS_X, TIPO[1]], TIPI, extend([LENS_X, TIPO[1]], TIPI, 634)];
const RAY2 = [TIPO, [LENS_X, AXIS_Y], TIPI, extend([LENS_X, AXIS_Y], TIPI, 634)];
const RAY_W = 4;

const RAY_CUES = cues()
  .at(0, 'axis', drawDuration(AXIS, { dur: 0.5 }), ease.linear)
  .then('lens', 0.35, ease.outCubic)
  .then('marks', 0.25, ease.smooth)
  .after(0.1, 'object', 0.3, ease.linear)
  .after(0.1, 'ray1', 0.65, ease.linear)
  .after(0.05, 'ray2', 0.65, ease.linear)
  .then('image', 0.3, ease.linear)
  .after(0.05, 'label', TIMING.pop, ease.linear);

// -- Beat 1: circuit loop -------------------------------------------------------------
const LOOP = roundLoop(176, 150, 488, 392, 34);
const BULB = [332, 150];
const CELL = [176, 271];
const BULB_FRAC = fracNearest(LOOP, BULB);
const WIRE_W = 9;
const WIRE_DUR = 1.4;   // one closed loop; slower than tapCap on purpose, so the build reads
const LOOP_CUES = cues()
  .at(0, 'cell', TIMING.pop, ease.linear)
  .after(0, 'wire', WIRE_DUR, ease.linear)
  .then('glow', 0.45, ease.outCubic)
  .with('label', TIMING.pop, ease.linear);

// -- Beat 2: writing ---------------------------------------------------------------------
const HEAD = 'Refraction of light';
const PRAKASH = '\u092a\u094d\u0930\u0915\u093e\u0936';
const PHRASE = '\u092a\u094d\u0930\u0915\u093e\u0936 \u0915\u093e \u0905\u092a\u0935\u0930\u094d\u0924\u0928';
const CLUSTERS = graphemes(PRAKASH);
const WRITE_CUES = cues()
  .at(0, 'head', 0.8, ease.linear)
  .after(0.1, 'hindi', 0.8, ease.linear)
  .after(0.05, 'chips', 0.1 * (CLUSTERS.length - 1) + TIMING.pop, ease.linear)
  .after(0.05, 'phrase', 0.8, ease.linear);

// -- Beat 3: reveal ------------------------------------------------------------------------
const REV_BOX = { x: 196, y: 108, w: 290, h: 292 };
const REV_ROWS = 7;
const REV_RH = REV_BOX.h / REV_ROWS;
const REV_PATH = zigzag(REV_BOX.x - 20, REV_BOX.y - REV_RH * 0.5, REV_BOX.w + 40, REV_BOX.h + REV_RH, REV_ROWS + 1);
const REV_BAR = REV_RH * 1.5;
const REV_CUES = cues()
  .at(0, 'reveal', 1.6, ease.linear)
  .after(0.05, 'label', TIMING.pop, ease.linear);

const SHEETS = [RAY_CUES, LOOP_CUES, WRITE_CUES, REV_CUES];

export class SimDrawOnShowcaseScene extends SimScene {
  static BEAT_STEP_MAP = [
    [{ idx: 0, dwellMs: null }],
    [{ idx: 1, dwellMs: null }],
    [{ idx: 2, dwellMs: null }],
    [{ idx: 3, dwellMs: null }],
  ];

  static ARIA_LABEL = 'Draw-on demos: a convex lens ray diagram drawing itself, a circuit wire drawn round a loop, an English and a Hindi word being written, and a diagram revealed row by row.';

  static CONTROLS = [{ type: 'button', id: 'replay', label: 'Replay' }];

  constructor(container, config) {
    super(container, config);
    this.t0 = 0;
    this.lit = false;
    this.cancelLit = null;
  }

  enter(stage) {
    this.t0 = 0;
    resetBeat(this, stage);
  }

  onControlChange(id) {
    if (!this._guard(id)) return;
    if (id === 'replay') {
      this.t0 = this.age;
      resetBeat(this, this.stage);
    }
    this.requestUiUpdate?.();
  }

  pointerDown() {
    const sheet = SHEETS[this.stage];
    if (!sheet) return;
    const t = this.age - this.t0;
    if (!sheet.done(t)) {
      this.t0 = this.age - sheet.end - 0.01;
      if (this.stage === 1) lightBulb(this);
    }
  }

  busy() {
    const sheet = SHEETS[this.stage];
    return !!sheet && this.age - this.t0 < dur(sheet.end);
  }

  draw(ctx, c) {
    drawBackdrop(ctx, c, 'dots');
    const t = this.age - this.t0;
    if (this.stage === 0) drawRays(ctx, c, t);
    else if (this.stage === 1) drawLoop(this, ctx, c, t);
    else if (this.stage === 2) drawWriting(ctx, c, t);
    else drawReveal(ctx, c, t);
  }
}

// -- Helpers -------------------------------------------------------------------------------

function resetBeat(scene, stage) {
  // Every beat starts from the same state, whichever beat came before.
  if (scene.cancelLit) { scene.cancelLit(); scene.cancelLit = null; }
  scene.lit = false;
  if (stage === 1) {
    const runT0 = scene.t0;
    scene.cancelLit = scene.after(dur(LOOP_CUES.start('glow')), () => {
      if (scene.stage !== 1 || scene.t0 !== runT0) return;
      lightBulb(scene);
    });
  }
}

function lightBulb(scene) {
  if (scene.lit) return;
  scene.lit = true;
  scene.celebrate(BULB[0], BULB[1] - 10, 22);
}

function roundLoop(x0, y0, x1, y1, r) {
  // Clockwise on screen, starting at the middle of the left side (where the cell sits).
  const P = [[x0, (y0 + y1) / 2]];
  const arc = (cx, cy, a0) => {
    for (let k = 0; k <= 8; k++) {
      const a = a0 + (k / 8) * (Math.PI / 2);
      P.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  };
  arc(x0 + r, y0 + r, Math.PI);
  arc(x1 - r, y0 + r, -Math.PI / 2);
  arc(x1 - r, y1 - r, 0);
  arc(x0 + r, y1 - r, Math.PI / 2);
  P.push([x0, (y0 + y1) / 2]);
  return P;
}

function fracNearest(P, q) {
  let best = 0, bd = Infinity;
  for (let i = 0; i < P.length; i++) {
    const d = Math.hypot(P[i][0] - q[0], P[i][1] - q[1]);
    if (d < bd) { bd = d; best = i; }
  }
  return cumOf(P)[best] / pathLen(P);
}

function header(ctx, c, text) {
  pill(ctx, c, text, W / 2, ZONES.top.y + 28, { bg: c.bgSurface, size: 17, display: true });
}

function caption(ctx, c, text, p) {
  const pp = pop(p);
  if (!pp) return;
  pill(ctx, c, text, W / 2, ZONES.bottom.y + 26, { bg: c.raised, size: 15, scale: pp.scale, alpha: pp.alpha });
}

function arrowHead(ctx, tip, from, size, col) {
  const a = Math.atan2(tip[1] - from[1], tip[0] - from[0]);
  ctx.save();
  ctx.translate(tip[0], tip[1]);
  ctx.rotate(a);
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(2, 0);
  ctx.lineTo(-size, -size * 0.6);
  ctx.lineTo(-size, size * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function midChevron(ctx, a, b, col) {
  const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const back = [m[0] - (b[0] - a[0]) * 0.01, m[1] - (b[1] - a[1]) * 0.01];
  arrowHead(ctx, [m[0] + (b[0] - a[0]) * 0.03, m[1] + (b[1] - a[1]) * 0.03], back, 9, col);
}

// -- Beat 0 ----------------------------------------------------------------------------------

function drawRays(ctx, c, t) {
  header(ctx, c, 'A ray diagram draws itself');
  const box = ZONES.heroWide;
  drawCard(ctx, c, box.x, box.y, box.w, box.h);
  const q = (n) => RAY_CUES.p(n, t);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Structure: principal axis, lens, focal marks.
  ctx.strokeStyle = c.stroke;
  ctx.lineWidth = 3;
  drawOn(ctx, AXIS, q('axis') * 1, { dur: 1, ease: ease.linear });

  const pl = q('lens');
  if (pl > 0) {
    const ry = 128 * pl;
    ctx.fillStyle = alpha(c.glass, 0.28);
    ellipse(ctx, LENS_X, AXIS_Y, 15 * pl, ry);
    ctx.fill();
    ctx.strokeStyle = c.glass;
    ctx.lineWidth = 3;
    ellipse(ctx, LENS_X, AXIS_Y, 15 * pl, ry);
    ctx.stroke();
    ctx.fillStyle = alpha(lighten(c.glass, 0.5), 0.6);
    ellipse(ctx, LENS_X - 4, AXIS_Y - ry * 0.45, 3 * pl, ry * 0.28);
    ctx.fill();
  }

  const pm = q('marks');
  if (pm > 0) {
    ctx.save();
    ctx.globalAlpha *= pm;
    const marks = [[LENS_X - FOCAL, 'F'], [LENS_X + FOCAL, 'F'], [OBJ_X, '2F'], [IMG_X, '2F']];
    for (const [x, s] of marks) {
      ctx.fillStyle = c.labelMuted;
      ellipse(ctx, x, AXIS_Y, 5, 5);
      ctx.fill();
      ctx.font = font(c, 800, 15, true);
      ctx.textAlign = 'center';
      ctx.fillText(s, x + (s === '2F' ? -16 : 0), AXIS_Y + (s === '2F' ? -10 : 26));
    }
    ctx.restore();
  }

  // Data: the object, then two rays with a pen dot, then the image.
  ctx.strokeStyle = c.s1;
  ctx.lineWidth = 4;
  const ob = drawOn(ctx, OBJECT, q('object'), { dur: 1, ease: ease.linear });
  if (ob.p > 0) arrowHead(ctx, ob.tip, OBJECT[0], 13, c.s1);

  const rays = [['ray1', RAY1], ['ray2', RAY2]];
  for (const [name, P] of rays) {
    const p = q(name);
    if (p <= 0) continue;
    ctx.strokeStyle = c.s2;
    ctx.lineWidth = RAY_W;
    const r = drawOn(ctx, P, p, { dur: 1, ease: ease.linear, pen: lighten(c.s2, 0.55), penR: 7 });
    if (r.done) {
      midChevron(ctx, P[0], P[1], c.s2);
      midChevron(ctx, P[1], P[2], c.s2);
    }
  }

  ctx.strokeStyle = c.s4;
  ctx.lineWidth = 4;
  const im = drawOn(ctx, IMAGE, q('image'), { dur: 1, ease: ease.linear });
  if (im.p > 0) arrowHead(ctx, im.tip, IMAGE[0], 13, c.s4);

  // One label.
  const age = reducedMotion() ? TIMING.pop : t - RAY_CUES.start('label');
  const pp = pop(age);
  if (pp) {
    pill(ctx, c, 'Real image', IMG_X - 84, TIPI[1] + 26, { bg: c.s4, size: 16, display: true, scale: pp.scale, alpha: pp.alpha });
  }
  caption(ctx, c, 'Axis first, then the rays', age);
}

// -- Beat 1 ----------------------------------------------------------------------------------

function drawLoop(scene, ctx, c, t) {
  header(ctx, c, 'Close the loop');
  const box = ZONES.heroWide;
  drawCard(ctx, c, box.x, box.y, box.w, box.h);

  const pw = LOOP_CUES.p('wire', t);
  const wireLen = pathLen(LOOP);
  // Ribbon wire: a darker lip under the copper, both drawing on together.
  ctx.save();
  ctx.translate(0, 3);
  ctx.fillStyle = darken(c.s8, 0.35);
  drawOn(ctx, LOOP, pw, { dur: 1, ease: ease.linear, w: WIRE_W });
  ctx.restore();
  ctx.fillStyle = c.s8;
  const wire = drawOn(ctx, LOOP, pw, { dur: 1, ease: ease.linear, w: WIRE_W });
  if (pw > 0 && !wire.done) {
    ctx.fillStyle = lighten(c.s8, 0.5);
    ellipse(ctx, wire.tip[0], wire.tip[1], 7, 7);
    ctx.fill();
  }

  // Glow behind the bulb once the loop is closed.
  const g = LOOP_CUES.p('glow', t);
  if (g > 0) {
    for (let i = 3; i >= 1; i--) {
      ctx.fillStyle = alpha(c.warning, 0.13 * g);
      ellipse(ctx, BULB[0], BULB[1] - 8, 30 + i * 16 * g, 30 + i * 16 * g);
      ctx.fill();
    }
  }

  // Components: the cell from the start, the bulb when the wire reaches it.
  const cellPop = pop(reducedMotion() ? 1 : t);
  if (cellPop) drawCell(ctx, c, CELL[0], CELL[1], cellPop.scale);
  const bulbAge = reducedMotion() ? 1 : (pw - BULB_FRAC) * WIRE_DUR;
  const bulbPop = pw >= BULB_FRAC ? pop(bulbAge) : null;
  if (bulbPop) drawBulb(ctx, c, BULB[0], BULB[1], bulbPop.scale, g);

  if (cellPop) pill(ctx, c, 'Cell', CELL[0] - 82, CELL[1], { bg: c.s3, size: 15, alpha: cellPop.alpha });
  if (bulbPop) pill(ctx, c, 'Bulb', BULB[0] + 92, BULB[1] - 30, { bg: c.warning, size: 15, alpha: bulbPop.alpha });

  const la = reducedMotion() ? 1 : t - LOOP_CUES.start('label');
  const lp = pop(la);
  if (lp) {
    pill(ctx, c, 'Current flows: bulb on!', (176 + 488) / 2, 300, { bg: c.good, size: 17, display: true, scale: lp.scale, alpha: lp.alpha });
  }
  caption(ctx, c, 'A wire drawn as a ribbon', reducedMotion() ? 1 : t);
}

function drawCell(ctx, c, x, y, s) {
  if (s <= 0.02) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  drawShadow(ctx, c, 0, 48, 30, 6);
  ctx.fillStyle = darken(c.s3, 0.35);
  rr(ctx, -24, -38, 48, 84, 12);
  ctx.fill();
  ctx.fillStyle = c.s3;
  rr(ctx, -24, -42, 48, 82, 12);
  ctx.fill();
  ctx.fillStyle = darken(c.s3, 0.25);
  rr(ctx, -10, -52, 20, 12, 4);
  ctx.fill();
  ctx.fillStyle = lighten(c.s3, 0.35);
  rr(ctx, -16, -34, 9, 50, 4);
  ctx.fill();
  ctx.fillStyle = c.bgDeep;
  ctx.font = font(c, 800, 22, true);
  ctx.textAlign = 'center';
  ctx.fillText('+', 5, -12);
  ctx.fillText('-', 5, 28);
  ctx.restore();
}

function drawBulb(ctx, c, x, y, s, glow) {
  if (s <= 0.02) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const glassCol = glow > 0 ? lighten(c.warning, 0.15 * glow) : alpha(c.glass, 0.55);
  ctx.fillStyle = darken(c.stroke, 0.1);
  rr(ctx, -15, 4, 30, 22, 6);
  ctx.fill();
  ctx.fillStyle = c.stroke;
  rr(ctx, -15, 10, 30, 5, 2);
  ctx.fill();
  ctx.fillStyle = glassCol;
  ellipse(ctx, 0, -22, 30, 30);
  ctx.fill();
  ctx.strokeStyle = glow > 0 ? darken(c.warning, 0.3) : c.glass;
  ctx.lineWidth = 3;
  ellipse(ctx, 0, -22, 30, 30);
  ctx.stroke();
  ctx.strokeStyle = glow > 0 ? darken(c.flame, 0.1) : c.stroke;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-8, 4);
  ctx.lineTo(-8, -20);
  ctx.lineTo(-3, -28);
  ctx.lineTo(2, -20);
  ctx.lineTo(8, -28);
  ctx.lineTo(8, 4);
  ctx.stroke();
  ctx.fillStyle = alpha(lighten(c.glass, 0.6), 0.7);
  ellipse(ctx, -12, -34, 6, 9, -0.5);
  ctx.fill();
  ctx.restore();
}

// -- Beat 2 ----------------------------------------------------------------------------------

function drawWriting(ctx, c, t) {
  header(ctx, c, 'Words that write themselves');
  const box = ZONES.heroWide;
  drawCard(ctx, c, box.x, box.y, box.w, box.h);
  const cx = box.x + box.w / 2;
  ctx.textBaseline = 'alphabetic';

  const at = (n) => (reducedMotion() ? 10 : t - WRITE_CUES.start(n));
  writeOn(ctx, HEAD, cx, 152, 38, at('head'), { font: font(c, 700, 38, true), col: c.label, dur: 0.8 });
  writeOn(ctx, PRAKASH, cx, 250, 66, at('hindi'), { font: font(c, 700, 66, true), col: c.s2ink, dur: 0.8 });

  // The letters (grapheme clusters) as chips: none is broken apart.
  const chipT = at('chips');
  const n = CLUSTERS.length, gap = 74, x0 = cx - ((n - 1) * gap) / 2;
  for (let i = 0; i < n; i++) {
    const pp = pop(chipT - i * 0.1);
    if (!pp) continue;
    pill(ctx, c, CLUSTERS[i], x0 + i * gap, 314, { bg: c['s' + (i + 1)], size: 22, scale: pp.scale, alpha: pp.alpha });
  }

  writeOn(ctx, PHRASE, cx, 398, 30, at('phrase'), { font: font(c, 600, 30, false), col: c.labelMuted, mode: 'word', dur: 0.8 });
  caption(ctx, c, 'Each letter stays whole as it is written', reducedMotion() ? 1 : t - WRITE_CUES.start('chips'));
}

// -- Beat 3 ----------------------------------------------------------------------------------

function drawReveal(ctx, c, t) {
  header(ctx, c, 'A picture uncovered row by row');
  const box = ZONES.heroWide;
  drawCard(ctx, c, box.x, box.y, box.w, box.h);
  const p = REV_CUES.p('reveal', t);
  const len = pathLen(REV_PATH);
  const d = p >= 1 ? len : len * p;
  withReveal(ctx, REV_PATH, d, REV_BAR, () => drawBeaker(ctx, c));
  if (p > 0 && p < 1) {
    const tip = pointAt(REV_PATH, d);
    ctx.fillStyle = alpha(c.warning, 0.35);
    ellipse(ctx, tip[0], tip[1], 16, 16);
    ctx.fill();
    ctx.fillStyle = c.warning;
    ellipse(ctx, tip[0], tip[1], 8, 8);
    ctx.fill();
  }
  const age = reducedMotion() ? TIMING.pop : t - REV_CUES.start('label');
  const pp = pop(age);
  if (pp) {
    pill(ctx, c, 'Looks bent!', 556, 250, { bg: c.accent, size: 16, display: true, scale: pp.scale, alpha: pp.alpha });
  }
  caption(ctx, c, 'Light bends where water meets air', age);
}

function drawBeaker(ctx, c) {
  const bx = 236, by = 126, bw = 210, bh = 262, waterY = 236;
  drawShadow(ctx, c, bx + bw / 2, by + bh + 6, bw * 0.55, 9);
  // Water.
  ctx.fillStyle = alpha(c.water, 0.45);
  rr(ctx, bx + 6, waterY, bw - 12, bh - (waterY - by) - 6, 14);
  ctx.fill();
  ctx.fillStyle = alpha(lighten(c.water, 0.4), 0.7);
  rr(ctx, bx + 6, waterY - 3, bw - 12, 8, 4);
  ctx.fill();
  // Pencil: straight above the water, shifted below it.
  const pencil = (x0, y0, x1, y1) => {
    const L = Math.hypot(x1 - x0, y1 - y0);
    ctx.save();
    ctx.translate(x0, y0);
    ctx.rotate(Math.atan2(y1 - y0, x1 - x0));
    ctx.fillStyle = darken(c.s2, 0.3);
    ctx.fillRect(0, -6.5, L, 15);
    ctx.fillStyle = c.s2;
    ctx.fillRect(0, -6.5, L, 12);
    ctx.fillStyle = lighten(c.s2, 0.35);
    ctx.fillRect(0, -4, L, 3);
    ctx.restore();
  };
  const top = [bx + 30, by - 10];
  const hit = [bx + 104, waterY];
  pencil(top[0], top[1], hit[0], hit[1]);
  ctx.save();
  rr(ctx, bx + 6, waterY, bw - 12, bh - (waterY - by) - 6, 14);
  ctx.clip();
  pencil(hit[0] + 2, waterY, bx + 150, by + bh - 40);
  ctx.fillStyle = darken(c.s2, 0.45);
  ellipse(ctx, bx + 150, by + bh - 40, 7, 7);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = c.s6;
  ctx.save();
  ctx.translate(top[0], top[1]);
  ctx.rotate(Math.atan2(hit[1] - top[1], hit[0] - top[0]));
  rr(ctx, -10, -7, 16, 14, 4);
  ctx.fill();
  ctx.restore();
  // Glass.
  ctx.strokeStyle = c.glass;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(bx, by + bh - 16);
  ctx.quadraticCurveTo(bx, by + bh, bx + 16, by + bh);
  ctx.lineTo(bx + bw - 16, by + bh);
  ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw, by + bh - 16);
  ctx.lineTo(bx + bw, by);
  ctx.stroke();
  ctx.fillStyle = alpha(lighten(c.glass, 0.6), 0.5);
  rr(ctx, bx + 14, by + 20, 8, bh - 60, 4);
  ctx.fill();
  // Water line ticks.
  ctx.strokeStyle = alpha(c.glass, 0.7);
  ctx.lineWidth = 3;
  for (let i = 0; i < 4; i++) {
    const y = by + 50 + i * 50;
    ctx.beginPath(); ctx.moveTo(bx + bw - 26, y); ctx.lineTo(bx + bw - 8, y); ctx.stroke();
  }
}
