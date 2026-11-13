/**
 * FmaCartShowcaseScene - the kit version of the grade-9 "force, mass and
 * acceleration on a cart" visual (motion-and-forces L14, FMACartScene): a cart on
 * a table is pulled by a thread over a pulley from a hanging cup of coins. More
 * coins = more force = the same cart accelerates faster; a = F / m.
 *
 *   propRig + drawGround('table') + drawCart + drawPulley + drawBlock   the apparatus (SimProps)
 *   vectorArrow                       the pull, length = force x scale (equal forces, equal arrows)
 *   captionBar                        the lesson's one-line caption per beat
 *
 * Beats (4): 0 the apparatus (F = 10 N), 1 more coins (F = 16 N), 2 release (runs by itself),
 * 3 free play: Force and Mass sliders + Release. Real kinematics: x = 1/2 a t^2, the cup falls
 * as far as the cart goes (inextensible thread), both capped at the table edge / the floor.
 */
import { SimScene } from 'simulations/base/kit/SimScene.js';
import { drawBackdrop, captionBar, vectorArrow, pill } from 'simulations/base/kit/SimLook.js';
import { propRig, drawGround, drawCart, drawPulley, drawBlock } from 'simulations/base/kit/SimProps.js';

const GROUND = 330, PX = 612, PY = 299, PR = 22, CUP_X = PX + PR + 2, CUP = 52;
const START = 140, MAX_TRAVEL = 250, MAX_FALL = 60, ACCEL_PX = 30, RUN_SEC = 1.8;
const RIG = propRig({ x0: 0, x1: 580, groundY: GROUND, scale: 1 });
const CUP_RIG = propRig({ x0: CUP_X, x1: CUP_X + 1, groundY: 0, scale: 1 });
const CAPTIONS = [
  'A cart on a table is pulled by a thread over a pulley. A cup of coins supplies the force.',
  'Add more coins: the pull grows. A larger force pulls the same cart.',
  'Release it. With a bigger force the cart accelerates faster.',
  'Set the force and the mass, then press Release. Acceleration = force / mass.',
];

export class FmaCartShowcaseScene extends SimScene {
  static BEAT_STEP_MAP = CAPTIONS.map((_, i) => [{ idx: i, dwellMs: null }]);
  static ARIA_LABEL =
    'A cart on a table is pulled by a thread over a pulley at the table edge, from a hanging cup of coins. Its wheels turn as ' +
    'it accelerates and the cup falls as far as the cart travels. The pull is shown as an arrow whose length matches the force. ' +
    'In free play, sliders set the force and the cart mass, and Release shows acceleration equal to force divided by mass.';
  static CONTROLS = [
    { type: 'slider', id: 'force', label: 'Force (N):', min: 4, max: 20, step: 2, value: 10 },
    { type: 'slider', id: 'mass', label: 'Cart mass (kg):', min: 1, max: 10, step: 1, value: 2 },
    { type: 'button', id: 'release', label: 'Release' },
  ];

  constructor(container, config) {
    super(container, config);
    this.force = 10; this.mass = 2;
    this.run = null;       // { stage, t } token captured at launch
    this.x = 0;            // distance travelled, px
  }

  enter(stage) {
    this.run = null; this.x = 0;
    if (stage === 0) this.force = 10;
    if (stage === 1 || stage === 2) this.force = 16;
    if (stage < 3) this.mass = 2;
    if (stage === 2) this.after(0.6, () => this.launch());
  }
  launch() { this.x = 0; this.run = { stage: this.stage, t: 0 }; }

  isControlHidden() { return this.stage !== 3; }
  getControlValue(id) { return id === 'force' ? this.force : id === 'mass' ? this.mass : undefined; }
  onControlChange(id, v) {
    if (!this._guard(id)) return;
    if (id === 'force') { this.force = Math.round(Number(v)); if (!this.run) this.x = 0; }
    else if (id === 'mass') { this.mass = Math.round(Number(v)); if (!this.run) this.x = 0; }
    else if (id === 'release') this.launch();
    this.requestUiUpdate?.();
  }
  busy() { return !!this.run; }

  get accel() { return this.force / this.mass; }

  update(d) {
    const r = this.run;
    if (!r) return;
    r.t += d;
    this.x = Math.min(MAX_TRAVEL, 0.5 * this.accel * ACCEL_PX * r.t * r.t);
    if (r.t >= RUN_SEC || this.x >= MAX_TRAVEL) this.run = null;
  }

  draw(ctx, c) {
    drawBackdrop(ctx, c, 'dots');
    captionBar(ctx, c, CAPTIONS[this.stage] ?? CAPTIONS[0], 340, 12, { maxW: 640, size: 15 });
    drawGround(ctx, c, RIG, { kind: 'table' });
    const cart = drawCart(ctx, c, RIG, START + this.x, { w: 110 + this.mass * 8, h: 70, tone: 1, label: this.mass + ' kg', wheelAngle: this.x / 11 });
    // the thread: cart -> pulley top -> around the pulley -> down to the cup
    const fall = Math.min(MAX_FALL, this.x);
    const cupTop = PY + 40 + fall;   // cup top; the block is drawn from its bottom edge
    ctx.save();
    ctx.strokeStyle = c.labelMuted; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cart.right.x, cart.right.y); ctx.lineTo(PX, PY - PR);
    ctx.arc(PX, PY, PR, -Math.PI / 2, 0);
    ctx.lineTo(PX + PR, cupTop);
    ctx.stroke();
    ctx.restore();
    drawPulley(ctx, c, PX, PY, PR);
    drawBlock(ctx, c, CUP_RIG, 0, { w: CUP - 4, h: CUP, tone: 2, label: this.force + ' N', y: cupTop + CUP });
    // the pull: arrow length = force x scale, equal forces always equal arrows
    vectorArrow(ctx, c, cart.left.x + 6, cart.y0 - 34, { angle: 0, magnitude: this.force, scale: 9, col: c.s2, label: this.force + ' N' });
    // readout
    const a = this.accel;
    const txt = this.stage < 2 ? 'a = F / m' : 'a = ' + this.force + ' / ' + this.mass + ' = ' + (Math.round(a * 10) / 10) + ' m/s^2';
    pill(ctx, c, txt, 340, 480, { bg: c.good, size: 17 });
  }
}
