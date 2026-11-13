/** SimTourShowcaseScene.js
 * SimTourShowcaseScene - 3-beat showcase for SimTour (idle tour + one model):
 *   A playground see-saw. ONE model object { left, right } gives the picture
 *   (tilt, where the right child sits), the turning-effect chips (kg x m) and
 *   the words a screen reader hears (shown in the bottom bar too).
 *   Beat 0: two 30 kg children - balance at the same distance
 *   Beat 1: a 45 kg child - balance closer to the middle
 *   Beat 2: a 24 kg child against 40 kg - balance far out
 * With no input the idle tour slides the right child to three spots (too far,
 * too near, balanced) after 1.4 s, then parks. Any touch hands over at once:
 * drag the right child along the plank. The tour comes back once after 3.6 s
 * of quiet, never under reduced motion.
 */
import { SimScene } from 'simulations/base/kit/SimScene.js';
import {
  drawBackdrop,
  clamp,
  drawShadow,
  drawFace,
  pill,
  captionBar,
  font,
  rr,
  ellipse,
  alpha,
  mix,
  darken,
  lighten,
  inkOn,
  popAt,
  W,
} from 'simulations/base/kit/SimLook.js';
import { springStep, reducedMotion } from 'simulations/base/kit/SimAnim.js';
import { tour, describer } from 'simulations/base/kit/SimTour.js';

// -- Layout (design px) --------------------------------------------------------------

const PX = W / 2;            // pivot x
const PY = 322;              // pivot y (plank centre)
const GROUND = 410;
const HALF = 280;            // plank half length
const PER_HALF_M = 50;       // px per 0.5 m
const MAX_TILT = 0.17;       // rad
const ENTER_S = 0.7;         // entrance (children pop in); a tap skips it

// Distances are kept in half metres (1..5 -> 0.5 m .. 2.5 m) so moments stay exact.
const BEATS = [
  { left: { kg: 30, h: 3 }, right: { kg: 30 }, start: 1, steps: [5, 2, 3] },
  { left: { kg: 30, h: 3 }, right: { kg: 45 }, start: 5, steps: [1, 4, 2] },
  { left: { kg: 40, h: 3 }, right: { kg: 24 }, start: 1, steps: [3, 4, 5] },
];

const metres = (h) => (h / 2).toFixed(1) + ' m';
const moment = (side) => side.kg * side.h / 2;

/** The one model -> every output. Same instant, same numbers. */
function truth(m) {
  const L = moment(m.left), R = moment(m.right);
  const verdict = L === R ? 'Balanced' : L > R ? 'Left side goes down' : 'Right side goes down';
  return {
    L, R, verdict,
    sign: L === R ? '=' : L > R ? '>' : '<',
    tilt: MAX_TILT * Math.tanh((R - L) / 22),
    leftChip: m.left.kg + ' kg x ' + metres(m.left.h) + ' = ' + L,
    rightChip: m.right.kg + ' kg x ' + metres(m.right.h) + ' = ' + R,
    words: verdict + '. Right child, ' + m.right.kg + ' kg, at ' + metres(m.right.h) + '.',
  };
}

export class SimTourShowcaseScene extends SimScene {
  static BEAT_STEP_MAP = [
    [{ idx: 0, dwellMs: null }],
    [{ idx: 1, dwellMs: null }],
    [{ idx: 2, dwellMs: null }],
  ];

  static ARIA_LABEL = 'A see-saw with two children. Slide the right child along the plank to balance it. Turning effect is mass times distance.';

  static CONTROLS = [{ type: 'button', id: 'replay', label: 'Replay' }];

  constructor(container, config) {
    super(container, config);
    this.t0 = 0;
    this.model = { left: { kg: 30, h: 3 }, right: { kg: 30, h: 1 } };
    this.view = truth(this.model);
    this.slide = { x: 1, v: 0 };   // right child's spot, in half metres (eased)
    this.tip = { x: 0, v: 0 };     // plank tilt (eased)
    this.dragging = false;
    this.handed = false;           // the learner has taken over
    this.cheerAt = -1;
    this.walk = tour([]);
    this.sr = describer(container);
  }

  destroy() {
    this.sr.destroy();
    super.destroy();
  }

  enter(stage) {
    this.t0 = 0;
    resetBeat(this, stage, 0);
  }

  onControlChange(id) {
    if (!this._guard(id)) return;
    if (id === 'replay') {
      this.t0 = this.age;
      resetBeat(this, this.stage, this.age);
    }
    this.requestUiUpdate?.();
  }

  pointerDown(p) {
    const t = this.age - this.t0;
    if (t < ENTER_S) this.t0 = this.age - ENTER_S;   // skip the entrance to its end state
    this.walk.touch(this.age);
    this.handed = true;
    const local = toPlank(p, this.tip.x);
    if (local > -10 && Math.abs(p.y - PY) < 150) {
      this.dragging = true;
      moveTo(this, local);
    }
  }

  pointerMove(p) {
    if (!this.dragging) return false;
    this.walk.touch(this.age);
    moveTo(this, toPlank(p, this.tip.x));
    return false;
  }

  pointerUp() {
    this.dragging = false;
    this.walk.touch(this.age);
  }

  update(d) {
    const s = this.walk.poll(this.age);
    if (s) setSpot(this, s.step);
    springStep(this.slide, this.model.right.h, d, 'snappy');
    springStep(this.tip, this.view.tilt, d, 'playful');
    // Cheer once the picture has actually come to rest balanced.
    if (this.view.L === this.view.R && this.cheerAt < 0 && Math.abs(this.tip.v) < 0.01
      && Math.abs(this.slide.x - this.model.right.h) < 0.02 && this.age - this.t0 > ENTER_S) {
      this.cheerAt = this.age;
      if (this.handed) this.celebrate(PX + this.model.right.h * PER_HALF_M, PY - 60, 22);
      else this.floatText('Balanced!', PX, PY - 150, { bg: this.colors.good, size: 18 });
    }
  }

  busy() {
    const t = this.age - this.t0;
    return t < ENTER_S || this.walk.busy(this.age) || this.dragging
      || this.slide.v !== 0 || this.tip.v !== 0
      || this.slide.x !== this.model.right.h || this.tip.x !== this.view.tilt;
  }

  draw(ctx, c) {
    drawBackdrop(ctx, c, 'dots', { k: 0.8 });
    const t = this.age - this.t0;
    drawPark(ctx, c);
    drawSeeSaw(this, ctx, c, t);
    drawChips(this, ctx, c, t);
    drawMode(this, ctx, c);
    captionBar(ctx, c, 'Screen reader: ' + this.view.words, W / 2, 482, { maxW: 640, size: 15, maxLines: 2 });
  }
}

// -- Model plumbing -------------------------------------------------------------------

function resetBeat(scene, stage, now) {
  const b = BEATS[Math.max(0, Math.min(BEATS.length - 1, stage))];
  scene.model = { left: { ...b.left }, right: { kg: b.right.kg, h: b.start } };
  scene.view = truth(scene.model);
  scene.slide = { x: b.start, v: 0 };
  scene.tip = { x: scene.view.tilt, v: 0 };
  scene.dragging = false;
  scene.handed = false;
  scene.cheerAt = -1;
  scene.walk = tour(b.steps, { resumes: 1 }).reset(now);
  scene.sr.describe(scene.view.words);
}

/** The only writer of the model: picture, chips and words all follow from here. */
function setSpot(scene, h) {
  const hh = Math.max(1, Math.min(5, Math.round(h)));
  if (hh === scene.model.right.h) return;
  scene.model.right.h = hh;
  scene.view = truth(scene.model);
  scene.cheerAt = -1;
  scene.sr.describe(scene.view.words);          // a state change: one write, never per frame
  scene.requestUiUpdate?.();
}

function moveTo(scene, localX) {
  setSpot(scene, localX / PER_HALF_M);
}

/** Design point -> distance along the plank from the pivot (right side positive). */
function toPlank(p, tilt) {
  return (p.x - PX) * Math.cos(tilt) + (p.y - PY) * Math.sin(tilt);
}

// -- Drawing -------------------------------------------------------------------------

function drawPark(ctx, c) {
  const grass = mix(c.bgDeep, c.good, 0.3);
  ctx.fillStyle = grass;
  ctx.fillRect(0, GROUND, W, 520 - GROUND);
  ctx.fillStyle = lighten(grass, 0.14);
  ctx.fillRect(0, GROUND, W, 5);
  // Two soft bushes and a sun dot: set dressing, kept low-contrast.
  ctx.fillStyle = alpha(mix(c.bgDeep, c.good, 0.5), 0.8);
  for (const [x, r] of [[60, 38], [100, 26], [610, 34], [646, 24]]) {
    ctx.beginPath(); ctx.arc(x, GROUND + 2, r, Math.PI, 0); ctx.fill();
  }
}

function drawSeeSaw(scene, ctx, c, t) {
  const tilt = scene.tip.x;
  const wood = mix(c.s2, c.bgSurface, 0.15);
  // Pivot stand.
  drawShadow(ctx, c, PX, GROUND + 4, 120, 12);
  const base = darken(c.s5, 0.05);
  ctx.beginPath();
  ctx.moveTo(PX - 46, GROUND + 2); ctx.lineTo(PX, PY + 6); ctx.lineTo(PX + 46, GROUND + 2); ctx.closePath();
  ctx.fillStyle = darken(base, 0.3); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(PX - 40, GROUND - 2); ctx.lineTo(PX, PY + 6); ctx.lineTo(PX + 40, GROUND - 2); ctx.closePath();
  ctx.fillStyle = base; ctx.fill();

  ctx.save();
  ctx.translate(PX, PY);
  ctx.rotate(tilt);
  // Plank with a lip.
  rr(ctx, -HALF, -2, HALF * 2, 18, 9); ctx.fillStyle = darken(wood, 0.35); ctx.fill();
  rr(ctx, -HALF, -8, HALF * 2, 16, 8); ctx.fillStyle = wood; ctx.fill();
  rr(ctx, -HALF + 10, -6, HALF * 2 - 20, 4, 2); ctx.fillStyle = alpha(lighten(wood, 0.6), 0.55); ctx.fill();
  // Spots every 0.5 m; the metre marks get a label.
  for (let i = -5; i <= 5; i++) {
    if (!i) continue;
    const x = i * PER_HALF_M;
    ctx.beginPath(); ctx.arc(x, 0, i % 2 ? 3 : 4.5, 0, Math.PI * 2);
    ctx.fillStyle = darken(wood, 0.45); ctx.fill();
    if (i % 2 === 0) {
      ctx.font = font(c, 700, 14);
      ctx.fillStyle = c.labelMuted; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(Math.abs(i / 2) + ' m', x, 22);
    }
  }
  // Children.
  const pL = popAt(t, 0.05), pR = popAt(t, 0.2);
  const skipped = reducedMotion() || t >= ENTER_S;
  const sL = skipped ? 1 : pL ? pL.scale : 0, sR = skipped ? 1 : pR ? pR.scale : 0;
  const v = scene.view;
  const moodL = v.L === v.R ? 'happy' : v.L > v.R ? 'oops' : 'smile';
  const moodR = v.L === v.R ? 'happy' : v.R > v.L ? 'oops' : 'smile';
  drawKid(ctx, c, -scene.model.left.h * PER_HALF_M, scene.model.left.kg, c.s1, sL, moodL, 1, scene.clock);
  drawKid(ctx, c, scene.slide.x * PER_HALF_M, scene.model.right.kg, c.s3, sR, moodR, -1, scene.clock);
  // Tour finger: a soft touch ring on the child the demo is moving.
  if (scene.walk.running(scene.age) && !reducedMotion()) {
    const k = scene.walk.at(scene.age).k;
    const x = scene.slide.x * PER_HALF_M, r = 18 + 10 * Math.sin(Math.min(1, k * 3) * Math.PI);
    ctx.beginPath(); ctx.arc(x, 34, r, 0, Math.PI * 2);
    ctx.strokeStyle = alpha(c.accent, 0.75); ctx.lineWidth = 4; ctx.stroke();
    ctx.beginPath(); ctx.arc(x, 34, 7, 0, Math.PI * 2);
    ctx.fillStyle = c.accent; ctx.fill();
  }
  ctx.restore();
  // Pivot cap.
  ctx.beginPath(); ctx.arc(PX, PY, 11, 0, Math.PI * 2); ctx.fillStyle = darken(base, 0.2); ctx.fill();
  ctx.beginPath(); ctx.arc(PX - 3, PY - 3, 3.5, 0, Math.PI * 2); ctx.fillStyle = alpha(lighten(base, 0.6), 0.7); ctx.fill();
}

/** A blob child sitting on the plank at x (plank frame); size grows with mass. */
function drawKid(ctx, c, x, kg, tone, s, mood, face, t) {
  if (s <= 0.02) return;
  const r = (22 + kg * 0.6) * s;
  const y = -8 - r * 0.92;
  ctx.save();
  // Feet dangling over the plank edge.
  ctx.fillStyle = darken(tone, 0.3);
  ellipse(ctx, x - r * 0.38, -2, r * 0.22, r * 0.14); ctx.fill();
  ellipse(ctx, x + r * 0.38, -2, r * 0.22, r * 0.14); ctx.fill();
  // Body with a lip.
  ellipse(ctx, x, y + 4, r, r * 0.95); ctx.fillStyle = darken(tone, 0.35); ctx.fill();
  ellipse(ctx, x, y, r, r * 0.95); ctx.fillStyle = tone; ctx.fill();
  ellipse(ctx, x - r * 0.35, y - r * 0.5, r * 0.32, r * 0.14, -0.4);
  ctx.fillStyle = alpha(lighten(tone, 0.7), 0.5); ctx.fill();
  // A tuft of hair.
  ctx.beginPath();
  ctx.moveTo(x - r * 0.2, y - r * 0.9);
  ctx.quadraticCurveTo(x, y - r * 1.35, x + r * 0.25, y - r * 0.92);
  ctx.strokeStyle = darken(tone, 0.4); ctx.lineWidth = 4 * s; ctx.lineCap = 'round'; ctx.stroke();
  drawFace(ctx, x, y - r * 0.05, r * 0.85, { col: tone, c, mood, t, look: { x: face * 0.6, y: 0 } });
  // Hands on the see-saw handle (the side nearer the middle).
  const hx = x + face * r * 1.12, gy = y + r * 0.1;
  ctx.strokeStyle = darken(c.s5, 0.15); ctx.lineWidth = 7 * s; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(hx, -6); ctx.lineTo(hx, gy); ctx.moveTo(hx - 8 * s, gy); ctx.lineTo(hx + 8 * s, gy); ctx.stroke();
  ctx.strokeStyle = darken(tone, 0.2); ctx.lineWidth = 8 * s;
  ctx.beginPath(); ctx.moveTo(x + face * r * 0.8, y + r * 0.25); ctx.quadraticCurveTo(x + face * r * 1.05, y + r * 0.3, hx, gy); ctx.stroke();
  ctx.beginPath(); ctx.arc(hx, gy, 6.5 * s, 0, Math.PI * 2); ctx.fillStyle = tone; ctx.fill();
  // Mass tag above the head.
  if (s > 0.6) pill(ctx, c, kg + ' kg', x, y - r * 1.35 - 20, { bg: darken(tone, 0.25), size: 15, scale: Math.min(1, s) });
  ctx.restore();
}

function drawChips(scene, ctx, c, t) {
  const v = scene.view;
  const a = reducedMotion() ? 1 : Math.min(1, t / 0.3);
  pill(ctx, c, v.leftChip, 24, 40, { bg: c.s1, size: 16, align: 'left', alpha: a });
  pill(ctx, c, v.rightChip, W - 24, 40, { bg: c.s3, size: 16, align: 'right', alpha: a });
  const bal = v.L === v.R;
  const col = bal ? c.good : c.warning;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.beginPath(); ctx.arc(W / 2, 43, 21, 0, Math.PI * 2); ctx.fillStyle = darken(col, 0.38); ctx.fill();
  ctx.beginPath(); ctx.arc(W / 2, 40, 21, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill();
  ctx.font = font(c, 800, 24, true); ctx.fillStyle = inkOn(c, col);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(v.sign, W / 2, 41);
  ctx.restore();
  pill(ctx, c, v.verdict, W / 2, 94, { bg: bal ? c.good : c.bgSurface, ink: bal ? undefined : c.label, size: 16, alpha: a });
}

function drawMode(scene, ctx, c) {
  const ph = scene.walk.at(scene.age).phase;
  const demo = ph === 'run' && !scene.handed;
  const text = demo ? 'Demo: tap to try' : scene.handed ? 'Your turn: drag the right child' : 'Drag the right child';
  // The "Balanced!" chip rises through this one: step aside for its 1.1 s life (SimScene FLOAT_S).
  const since = !scene.handed && scene.cheerAt >= 0 ? scene.age - scene.cheerAt : 9;
  const a = clamp(Math.abs(since - 0.55) / 0.55 * 4 - 3, 0, 1);
  if (a <= 0) return;
  pill(ctx, c, text, W / 2, 140, { bg: demo ? mix(c.accent, c.bgSurface, 0.15) : c.bgSurface, ink: demo ? undefined : c.labelMuted, size: 14, alpha: a });
}
