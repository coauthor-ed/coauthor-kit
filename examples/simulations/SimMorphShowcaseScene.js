/** SimMorphShowcaseScene.js
 * SimMorphShowcaseScene - 4-beat showcase for SimMorph (morphs, term morphs, counters, keyword pops):
 *   Beat 0: a square becomes a circle of the same area and back (byAngle + drawMorph)
 *   Beat 1: solving 2x + 3 = 11 in two steps; matched terms glide and keep their colours (transformTerms)
 *   Beat 2: a bus drives 3 hours at 60 km/h: countUp distance, odometer hours, keywordPop + highlighter
 *   Beat 3: balancing H2 + O2 -> H2O; coefficients appear, molecules keep their series colours
 * Tap skips a running build to its end; Replay runs it again.
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
  mix,
  darken,
  lighten,
  inkOn,
  ZONES,
  W,
} from 'simulations/base/kit/SimLook.js';
import { ease, pop, reducedMotion, dur } from 'simulations/base/kit/SimAnim.js';
import {
  morphPair,
  rectPts,
  circlePts,
  drawMorph,
  countUp,
  tabular,
  odometer,
  keywordPop,
  drawKeyword,
  highlighterSweep,
  transformTerms,
  KEYWORD_SETTLE,
} from 'simulations/base/kit/SimMorph.js';

// -- Beat 0: square -> circle (same area) -------------------------------------------

const SHAPE_C = [340, 252];
const SIDE = 152;                          // 4 cm at 38 px per cm
const RADIUS = SIDE / Math.sqrt(Math.PI);  // same area: 2.26 cm
const [SQUARE, CIRCLE] = morphPair(rectPts(SHAPE_C[0], SHAPE_C[1], SIDE, SIDE, 64), circlePts(SHAPE_C[0], SHAPE_C[1], RADIUS, 64), 96);
const B0 = { there: 0.5, morph: 1.2, back: 2.6 };
const END0 = B0.back + B0.morph;

// -- Beat 1: equation steps -----------------------------------------------------------

const B1 = { s1: 0.7, s2: 2.5, len: 1.1 };
const END1 = B1.s2 + B1.len;

// -- Beat 2: distance --------------------------------------------------------------------

const DRIVE = 3;
const KW = { lead: 3.05, tIn: 3.25, tHit: 3.75 };
const END2 = KW.tHit + KEYWORD_SETTLE;
const ROAD = { x0: 104, x1: 560, y: 236 };

// -- Beat 3: balancing ----------------------------------------------------------------------

const B3 = { at: 0.8, len: 1.2 };
const END3 = B3.at + B3.len + 0.3;

const ENDS = [END0, END1, END2, END3];

export class SimMorphShowcaseScene extends SimScene {
  static BEAT_STEP_MAP = [
    [{ idx: 0, dwellMs: null }],
    [{ idx: 1, dwellMs: null }],
    [{ idx: 2, dwellMs: null }],
    [{ idx: 3, dwellMs: null }],
  ];

  static ARIA_LABEL = 'Four morph demos: a square turning into a circle with the same area, solving 2x + 3 = 11 step by step, a bus counting distance for 3 hours, and balancing hydrogen plus oxygen to make water.';

  static CONTROLS = [{ type: 'button', id: 'replay', label: 'Replay' }];

  constructor(container, config) {
    super(container, config);
    this.t0 = 0;
    this.cheered = false;
    this.cancelCheer = null;
  }

  enter() {
    this.t0 = 0;
    startRun(this);
  }

  onControlChange(id) {
    if (!this._guard(id)) return;
    if (id === 'replay') {
      this.t0 = this.age;
      startRun(this);
    }
    this.requestUiUpdate?.();
  }

  pointerDown() {
    const end = ENDS[this.stage] ?? 0;
    if (this.age - this.t0 < end) {
      this.t0 = this.age - end - 0.01;
      cheer(this);
    }
  }

  busy() {
    return this.age - this.t0 < dur(ENDS[this.stage] ?? 0);
  }

  draw(ctx, c) {
    drawBackdrop(ctx, c, 'dots');
    const t = reducedMotion() ? 99 : this.age - this.t0;
    if (this.stage === 0) drawShapes(ctx, c, t);
    else if (this.stage === 1) drawEquation(ctx, c, t);
    else if (this.stage === 2) drawDistance(ctx, c, t);
    else drawBalance(ctx, c, t);
  }
}

// -- Runs ----------------------------------------------------------------------------------

function startRun(scene) {
  if (scene.cancelCheer) { scene.cancelCheer(); scene.cancelCheer = null; }
  scene.cheered = false;
  const stage = scene.stage, t0 = scene.t0;
  if (stage !== 1 && stage !== 3) return;
  scene.cancelCheer = scene.after(dur(ENDS[stage]), () => {
    if (scene.stage !== stage || scene.t0 !== t0) return;
    cheer(scene);
  });
}

function cheer(scene) {
  if (scene.cheered) return;
  if (scene.stage === 1) { scene.cheered = true; scene.celebrate(W / 2, 262, 26); }
  else if (scene.stage === 3) { scene.cheered = true; scene.celebrate(W / 2, 318, 26); }
}

// -- Shared bits -----------------------------------------------------------------------------

function title(ctx, c, text) {
  pill(ctx, c, text, W / 2, ZONES.top.y + 28, { bg: c.bgSurface, size: 17, display: true });
}

function card(ctx, c) {
  const z = ZONES.heroWide;
  drawCard(ctx, c, z.x, z.y, z.w, z.h);
}

function seg(t, a, len) {
  return Math.max(0, Math.min(1, (t - a) / len));
}

// A flat ball with a lip and a highlight, optional letter.
function ball(ctx, c, x, y, r, col, letter) {
  ctx.fillStyle = darken(col, 0.3);
  ellipse(ctx, x, y + r * 0.14, r, r);
  ctx.fill();
  ctx.fillStyle = col;
  ellipse(ctx, x, y, r, r);
  ctx.fill();
  ctx.fillStyle = alpha(lighten(col, 0.55), 0.8);
  ellipse(ctx, x - r * 0.38, y - r * 0.4, r * 0.28, r * 0.17, -0.5);
  ctx.fill();
  if (letter) {
    ctx.fillStyle = inkOn(c, col);
    ctx.font = font(c, 800, Math.round(r * 0.95), true);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, x, y + 1);
  }
}

// -- Beat 0 -------------------------------------------------------------------------------------

function drawShapes(ctx, c, t) {
  title(ctx, c, 'Same area, new shape');
  card(ctx, c);
  const there = ease.smooth(seg(t, B0.there, B0.morph));
  const back = ease.smooth(seg(t, B0.back, B0.morph));
  const p = there * (1 - back);
  const [cx, cy] = SHAPE_C;

  drawShadow(ctx, c, cx, cy + SIDE / 2 + 26, 96 - 10 * p, 10);
  // The lip and the face are both drawMorph, at rest too: the first morph frame never jumps.
  ctx.save();
  ctx.translate(0, 7);
  drawMorph(ctx, SQUARE, CIRCLE, p, { fill: darken(c.s1, 0.32) });
  ctx.restore();
  drawMorph(ctx, SQUARE, CIRCLE, p, { fill: c.s1 });
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(0.72, 0.72);
  ctx.translate(-cx - 10, -cy - 12);
  drawMorph(ctx, SQUARE, CIRCLE, p, { fill: alpha(lighten(c.s1, 0.5), 0.22) });
  ctx.restore();

  // Measures: a side bracket for the square, a radius for the circle.
  const ink = inkOn(c, c.s1);
  if (p < 0.5) {
    const a = 1 - p * 2;
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.strokeStyle = c.label;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    const by = cy + SIDE / 2 + 20;
    ctx.beginPath();
    ctx.moveTo(cx - SIDE / 2, by - 8); ctx.lineTo(cx - SIDE / 2, by); ctx.lineTo(cx + SIDE / 2, by); ctx.lineTo(cx + SIDE / 2, by - 8);
    ctx.stroke();
    ctx.restore();
    pill(ctx, c, 'side 4 cm', cx, cy + SIDE / 2 + 46, { bg: c.s2, size: 16, alpha: a });
  } else {
    const a = p * 2 - 1;
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + RADIUS - 4, cy); ctx.stroke();
    ctx.fillStyle = ink;
    ellipse(ctx, cx, cy, 6, 6);
    ctx.fill();
    ctx.restore();
    pill(ctx, c, 'radius 2.26 cm', cx, cy + SIDE / 2 + 46, { bg: c.s2, size: 16, alpha: a });
  }

  // Name chips and the area that never changes.
  pill(ctx, c, 'Square', 150, cy, { bg: c.s1, size: 18, display: true, alpha: 1 - p * 0.65, scale: 1 - p * 0.1 });
  pill(ctx, c, 'Circle', 530, cy, { bg: c.s1, size: 18, display: true, alpha: 0.35 + p * 0.65, scale: 0.9 + p * 0.1 });
  pill(ctx, c, 'Area = 16 square cm', W / 2, 418, { bg: c.good, size: 18, display: true });
}

// -- Beat 1 --------------------------------------------------------------------------------------

function eqSteps(c) {
  const k = { p: '2', id: 'k', col: c.s2ink };
  const x = { p: 'x', id: 'x', col: c.s1ink };
  const eq = { p: ' = ', id: 'eq', col: c.label };
  return [
    [k, x, { p: ' + ', id: 'plus', col: c.label }, { p: '3', id: 'three', col: c.s6ink }, eq, { p: '11', id: 'rhs', col: c.s3ink }],
    [k, x, eq, { p: '8', id: 'rhs', col: c.s3ink }],
    [x, eq, { p: '4', id: 'rhs', col: c.s3ink }],
  ];
}

function drawEquation(ctx, c, t) {
  title(ctx, c, 'Solve for x');
  card(ctx, c);
  const E = eqSteps(c);
  const u1 = seg(t, B1.s1, B1.len), u2 = seg(t, B1.s2, B1.len);
  const y = 272;
  const o = { size: 56, align: 'center' };
  if (u2 > 0) transformTerms(ctx, c, E[1], E[2], W / 2, y, u2, o);
  else transformTerms(ctx, c, E[0], E[1], W / 2, y, u1, o);

  // The move for each step, popped in when the step starts; the line before it stays above, faded.
  const step = t >= B1.s2 ? 2 : t >= B1.s1 ? 1 : 0;
  if (step > 0) {
    const prev = E[step - 1];
    transformTerms(ctx, c, prev, prev, W / 2, 208, 1, { size: 26, align: 'center', alpha: 0.5 * seg(t, step === 1 ? B1.s1 : B1.s2, 0.3) });
  }
  const labels = ['Get x on its own', 'Take 3 from both sides', 'Halve both sides'];
  const cols = [c.bgDeep, c.s6, c.s2];
  const starts = [0, B1.s1, B1.s2];
  const pp = pop(t - starts[step]) ?? { scale: 0, alpha: 0 };
  pill(ctx, c, labels[step], W / 2, 140, { bg: step ? cols[step] : c.raised, size: 18, display: true, scale: pp.scale, alpha: pp.alpha });

  // Progress dots: one per line reached.
  const done = t >= END1;
  for (let i = 0; i < 3; i++) {
    const on = i <= step;
    const dx = W / 2 + (i - 1) * 34;
    ctx.fillStyle = on ? (done ? c.good : c.accent) : c.track;
    ellipse(ctx, dx, 352, 9, 9);
    ctx.fill();
  }
  if (done) {
    const sp = pop(t - END1) ?? { scale: 0, alpha: 0 };
    pill(ctx, c, 'Check: 2 x 4 + 3 = 11', W / 2, 400, { bg: c.good, size: 17, display: true, scale: sp.scale, alpha: sp.alpha });
  }
}

// -- Beat 2 ----------------------------------------------------------------------------------------

function drawBus(ctx, c, x, y) {
  drawShadow(ctx, c, x, y + 30, 58, 7);
  ctx.fillStyle = darken(c.s2, 0.3);
  rr(ctx, x - 58, y - 30, 116, 56, 14);
  ctx.fill();
  ctx.fillStyle = c.s2;
  rr(ctx, x - 58, y - 36, 116, 56, 14);
  ctx.fill();
  ctx.fillStyle = c.glass;
  for (let i = 0; i < 3; i++) { rr(ctx, x - 48 + i * 28, y - 28, 22, 18, 5); ctx.fill(); }
  rr(ctx, x + 36, y - 28, 16, 26, 5);
  ctx.fill();
  ctx.fillStyle = lighten(c.s2, 0.45);
  rr(ctx, x - 52, y - 2, 104, 5, 2.5);
  ctx.fill();
  ball(ctx, c, x - 32, y + 22, 12, darken(c.stroke, 0.35));
  ball(ctx, c, x + 32, y + 22, 12, darken(c.stroke, 0.35));
  ctx.fillStyle = c.labelMuted;
  ellipse(ctx, x - 32, y + 22, 4, 4); ctx.fill();
  ellipse(ctx, x + 32, y + 22, 4, 4); ctx.fill();
}

// Static text widths, measured once per font (not per frame).
const RULE_W = new Map();
function ruleWidths(ctx) {
  let m = RULE_W.get(ctx.font);
  if (!m) { m = { w: ctx.measureText('60 x 3 = 180 km of ').width, k: ctx.measureText('distance').width }; RULE_W.set(ctx.font, m); }
  return m;
}

function drawDistance(ctx, c, t) {
  title(ctx, c, '60 km every hour, for 3 hours');
  card(ctx, c);
  const km = countUp(0, 180, t, DRIVE, ease.linear);

  // Road with hour posts.
  ctx.fillStyle = c.track;
  rr(ctx, ROAD.x0 - 20, ROAD.y + 34, ROAD.x1 - ROAD.x0 + 40, 16, 8);
  ctx.fill();
  for (let h = 0; h <= 3; h++) {
    const px = ROAD.x0 + (ROAD.x1 - ROAD.x0) * h / 3;
    const reached = km >= h * 60 - 0.01;
    ctx.fillStyle = reached ? c.accent : c.stroke;
    rr(ctx, px - 3, ROAD.y + 52, 6, 22, 3);
    ctx.fill();
    ctx.fillStyle = reached ? c.label : c.labelMuted;
    ctx.font = font(c, 700, 15, false);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(h * 60 + ' km', px, ROAD.y + 94);
  }
  drawBus(ctx, c, ROAD.x0 + (ROAD.x1 - ROAD.x0) * km / 180, ROAD.y);

  // Readouts: hours roll like an odometer, distance counts in fixed-width digits.
  const readY = 154;
  ctx.font = font(c, 800, 30, true);
  ctx.fillStyle = c.label;
  const hour = Math.min(3, Math.floor(t + 0.5 + 1e-9));
  const rollP = t >= DRIVE ? 1 : (t + 0.5) - Math.floor(t + 0.5);
  pill(ctx, c, 'time', 118, readY - 10, { bg: c.s5, size: 15 });
  ctx.fillStyle = c.label;
  ctx.font = font(c, 800, 30, true);
  if (hour >= 1 && rollP < 1) odometer(ctx, String(hour - 1), String(hour), 196, readY, ease.smooth(rollP * 2), { size: 30 });
  else tabular(ctx, String(hour), 196, readY, { align: 'right' });
  ctx.font = font(c, 700, 18, false);
  ctx.fillStyle = c.labelMuted;
  ctx.textAlign = 'left';
  ctx.fillText('h', 202, readY);

  pill(ctx, c, 'distance', 470, readY - 10, { bg: c.s3, size: 15 });
  ctx.fillStyle = c.label;
  ctx.font = font(c, 800, 30, true);
  tabular(ctx, String(Math.round(km)), 582, readY, { align: 'right' });
  ctx.font = font(c, 700, 18, false);
  ctx.fillStyle = c.labelMuted;
  ctx.textAlign = 'left';
  ctx.fillText('km', 588, readY);

  // The rule, with the key word popped and marked.
  if (t >= KW.lead) {
    const lead = Math.min(1, (t - KW.lead) / 0.25);
    const size = 30, y = 408;
    ctx.font = font(c, 800, size, true);
    const m = ruleWidths(ctx);
    const x0 = W / 2 - (m.w + m.k * 1.2) / 2;
    const kx = x0 + m.w;
    const kp = keywordPop(t, KW.tIn, KW.tHit);
    const hp = Math.max(0, Math.min(1, (t - KW.tHit) / 0.3));
    highlighterSweep(ctx, c, kx - 4, kx + m.k + 4, y - size * 0.32, size * 1.05, hp, { scale: kp.scale });
    ctx.save();
    ctx.globalAlpha *= lead;
    ctx.fillStyle = c.label;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('60 x 3 = 180 km of ', x0, y);
    ctx.restore();
    ctx.fillStyle = mix(c.s3ink, inkOn(c, c.gold), hp);
    drawKeyword(ctx, 'distance', kx, y, size, kp);
  }
}

// -- Beat 3 ----------------------------------------------------------------------------------------

function chemSteps(c) {
  const h2 = { p: ['sub', 'H', '2'], id: 'h2', col: c.s1ink };
  const o2 = { p: ['sub', 'O', '2'], id: 'o2', col: c.s6ink };
  const wH = { p: ['sub', 'H', '2'], id: 'w', col: c.s1ink };
  const wO = { p: 'O', id: 'w', col: c.s6ink };
  const plus = { p: ' + ', id: 'plus', col: c.label };
  const arrow = { p: ' \u2192 ', id: 'arrow', col: c.label };
  return [
    [h2, plus, o2, arrow, wH, wO],
    [{ p: '2', id: 'k1', col: c.gold }, h2, plus, o2, arrow, { p: '2', id: 'k2', col: c.gold }, wH, wO],
  ];
}

function h2Mol(ctx, c, x, y, s) {
  if (s <= 0.02) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ball(ctx, c, -13, 0, 15, c.s1, 'H');
  ball(ctx, c, 13, 0, 15, c.s1, 'H');
  ctx.restore();
}
function o2Mol(ctx, c, x, y, s) {
  if (s <= 0.02) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ball(ctx, c, -14, 0, 20, c.s6, 'O');
  ball(ctx, c, 14, 0, 20, c.s6, 'O');
  ctx.restore();
}
function waterMol(ctx, c, x, y, s) {
  if (s <= 0.02) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ball(ctx, c, 0, -4, 19, c.s6, 'O');
  ball(ctx, c, -25, 11, 14, c.s1, 'H');
  ball(ctx, c, 25, 11, 14, c.s1, 'H');
  ctx.restore();
}

function tally(ctx, c, label, left, right, x, y) {
  const ok = left === right;
  pill(ctx, c, label + ': ' + left + ' and ' + right, x, y, { bg: ok ? c.good : c.bad, size: 16, display: true });
}

function drawBalance(ctx, c, t) {
  title(ctx, c, 'Balance the atoms');
  card(ctx, c);
  const u = seg(t, B3.at, B3.len);
  const grow = (d) => { const pp = pop(t - B3.at - d); return pp ? pp.scale : 0; };
  const g1 = grow(0.15), g2 = grow(0.45);

  // Molecules: reactants left, product right.
  const my = 186;
  h2Mol(ctx, c, 180, my - (g1 > 0 ? 30 * Math.min(1, g1) : 0), 1);
  h2Mol(ctx, c, 180, my + 30, g1);
  o2Mol(ctx, c, 300, my, 1);
  ctx.fillStyle = c.labelMuted;
  ctx.font = font(c, 800, 30, true);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('+', 240, my);
  ctx.fillText('\u2192', 390, my);
  waterMol(ctx, c, 500, my - (g2 > 0 ? 30 * Math.min(1, g2) : 0), 1);
  waterMol(ctx, c, 500, my + 34, g2);

  // The equation: '2's fade in, H2, O2 and H2O glide and keep their colours.
  const E = chemSteps(c);
  transformTerms(ctx, c, E[0], E[1], W / 2, 318, u, { size: 46, align: 'center' });

  // Atom counts, left and right of the arrow.
  const after = t >= B3.at + B3.len;
  tally(ctx, c, 'H', after ? 4 : 2, after ? 4 : 2, W / 2 - 110, 374);
  tally(ctx, c, 'O', 2, after ? 2 : 1, W / 2 + 110, 374);
  if (t >= END3) {
    const sp = pop(t - END3) ?? { scale: 0, alpha: 0 };
    pill(ctx, c, 'Balanced!', W / 2, 414, { bg: c.gold, size: 17, display: true, scale: sp.scale, alpha: sp.alpha });
  }
}
