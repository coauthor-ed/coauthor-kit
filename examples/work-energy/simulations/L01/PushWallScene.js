import { SimScene } from 'simulations/base/kit/SimScene.js';
import {
  W, rr, drawBackdrop, drawFloor, drawReadout, drawMeter, drawFace, drawShadow,
  pill, chipRow, leader, font, alpha, darken, mix,
} from 'simulations/base/kit/SimLook.js';
import { drawFigure } from 'simulations/base/kit/SimFigure.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }], // the verdict
  [{ idx: 1, dwellMs: null }], // the tremble and the meter at full strength
  [{ idx: 2, dwellMs: null }], // two quantities side by side
];

const EFFORT_MAX = 100;
const EFFORT_START = 0; // rests on load; the learner starts the hold
const F_MAX = 500; // N, at full effort
const FATIGUE_SECONDS = 6; // full effort exhausts in this long, inside the 8s budget
const TICK_S = 0.5; // the two numbers refresh twice a second, not every frame

const FLOOR_Y = 386;
const WALL_X = 466;
const WALL_W = W - WALL_X - 16;
const WALL_TOP = 96;

const CARD = { x: 16, y: 62, w: 250, rowH: 34 };
const CARD_H = 12 + CARD.rowH * 3 + 10; // drawReadout's own height, no title tab
const ROW0_Y = CARD.y + 12 + 4 + CARD.rowH / 2; // 'Wall moved'
const ROW1_Y = ROW0_Y + CARD.rowH; // 'Work on the wall'

const METER = { x: 16, y: 452, w: 508, h: 20 };

// The boy, braced on the floor, palms flat on the wall face.
const HIP = { x: 316, y: 300 };
const RISE = 94; // hip to shoulder, unleaned
const HAND_Y = [246, 274]; // the two palms
const ARROW_Y = 312; // the push arrow, in the gap between him and the wall

// The two numbers the slide is about. They are constants, not a computation:
// no effort setting can move either one.
const WALL_MOVED_M = '0.000 m';
const WORK_J = 0;

// A limb as a flat rounded shape, so the scene keeps to the 2 / 3 / 4 line scale.
function limb(ctx, x0, y0, x1, y1, w, col) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  ctx.save();
  ctx.translate(x0, y0);
  ctx.rotate(Math.atan2(y1 - y0, x1 - x0));
  rr(ctx, 0, -w / 2, len + w * 0.3, w, w / 2);
  ctx.fillStyle = col;
  ctx.fill();
  ctx.restore();
}

function effort() {
  const v = Number(this.getControlValue('effort'));
  return Number.isFinite(v) ? Math.max(0, Math.min(EFFORT_MAX, v)) : EFFORT_START;
}

export class PushWallScene extends SimScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static ARIA_LABEL = 'A boy leaning with both palms on a brick wall; the wall never moves, the work stays at zero, and a separate fatigue meter fills.';
  static NOTE_STAGE = 0;
  static NOTE_TITLE = 'NOTE';
  static CONTROLS = [
    { id: 'effort', label: 'Effort', type: 'slider', min: 0, max: EFFORT_MAX, step: 5, value: EFFORT_START },
  ];

  noteRows() {
    return [
      { text: 'The wall is immovable', sub: 'It never flexes, even at full effort' },
      { text: 'Effort is shown as a percent', sub: 'It is a feel, not a measurement' },
      { text: 'Tiredness is real', sub: 'It is just not work on the wall' },
    ];
  }

  async setup() {
    await super.setup();
    this._fatigue = 0;
    this._held = 0;
    this._tickAcc = 0;
    this._heldShown = 0;
    this._pctShown = 0;
  }

  enter() {
    // The hold stops here; the dial value is the learner's and is kept.
    this._fatigue = 0;
    this._held = 0;
    this._tickAcc = 0;
    this._heldShown = 0;
    this._pctShown = 0;
    this.requestUiUpdate?.();
  }

  isControlDisabled() {
    // The dial stays live throughout - the learner can drop it to zero at any
    // moment to let him step back.
    return false;
  }

  onControlChange(id) {
    if (!this._guard(id)) return;
    this.animateFor(200);
  }

  update(d) {
    // Once the meter is full the hold is over, so nothing counts on: a parked
    // scene must not keep advancing any of its numbers.
    if (this._fatigue >= 100) return;
    const e = effort.call(this);
    if (e <= 0) return;
    this._fatigue = Math.min(100, this._fatigue + (e / 100) * (100 / FATIGUE_SECONDS) * d);
    this._held += d;
    // refresh the two numbers on a tick, so climbing ink cannot read as a
    // self-overlap between frames
    this._tickAcc += d;
    if (this._tickAcc >= TICK_S) {
      this._tickAcc -= TICK_S;
      this._heldShown = this._held;
      this._pctShown = Math.round(this._fatigue);
    }
  }

  busy() {
    // Holding, until the dial is dropped or the effort is spent.
    return effort.call(this) > 0 && this._fatigue < 100;
  }

  draw(ctx, c) {
    const e = effort.call(this);
    const holding = e > 0;
    const t = this.clock;

    drawBackdrop(ctx, c, 'dots');
    drawFloor(ctx, c, FLOOR_Y);
    this._wall(ctx, c);
    this._boy(ctx, c, e, t, holding);
    this._who(ctx, c, t);
    this._readings(ctx, c);
    this._fatigueMeter(ctx, c);
    this._rings(ctx, c, this.stage);
  }

  // Flat brick rectangles. Nothing here is ever animated, shifted or flexed.
  _wall(ctx, c) {
    const h = FLOOR_Y - WALL_TOP;
    const mortar = darken(c.s6, 0.42);
    ctx.save();
    // a coping course and a plinth, so the wall has a silhouette
    rr(ctx, WALL_X - 6, WALL_TOP - 13, WALL_W + 12, 15, 4);
    ctx.fillStyle = darken(c.s6, 0.16);
    ctx.fill();
    rr(ctx, WALL_X, WALL_TOP, WALL_W, h, 4);
    ctx.fillStyle = mix(c.s6, c.bgDeep, 0.08);
    ctx.fill();
    // brick courses
    ctx.strokeStyle = alpha(mortar, 0.8);
    ctx.lineWidth = 2;
    const bh = 30;
    for (let y = WALL_TOP + bh; y < FLOOR_Y; y += bh) {
      ctx.beginPath();
      ctx.moveTo(WALL_X, y);
      ctx.lineTo(WALL_X + WALL_W, y);
      ctx.stroke();
      const off = ((y - WALL_TOP) / bh) % 2 === 0 ? 0 : 34;
      for (let x = WALL_X + off; x < WALL_X + WALL_W; x += 68) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y - bh);
        ctx.stroke();
      }
    }
    ctx.strokeStyle = darken(c.s6, 0.28);
    ctx.lineWidth = 3;
    rr(ctx, WALL_X, WALL_TOP, WALL_W, h, 4);
    ctx.stroke();
    rr(ctx, WALL_X - 6, FLOOR_Y - 17, WALL_W + 12, 17, 3);
    ctx.fillStyle = darken(c.s6, 0.3);
    ctx.fill();
    ctx.restore();
  }

  // The boy: a filled figure with a face, both palms flat, weight into the wall.
  _boy(ctx, c, e, t, holding) {
    const k = e / 100;
    // a fine high-frequency tremble in the hands, only while he is holding
    const amp = holding ? 0.5 + k * 2.2 : 0;
    const f1 = Math.sin(t * 21) * amp;
    const f2 = Math.sin(t * 27 + 1.1) * amp;
    const px = WALL_X - 3;

    drawShadow(ctx, c, HIP.x + 6, FLOOR_Y + 2, 58, 9);
    // a kit figure in the push pose: braced feet, arms locked into the wall, and
    // leaning further in with the effort
    drawFigure(ctx, c,
      { x: px - 82, y: FLOOR_Y, height: 190, build: 'teen', facing: 1,
        pose: { name: 'push', lean: 4 + k * 14 },
        hands: [{ x: px, y: HAND_Y[0] + f1 }, { x: px, y: HAND_Y[1] + f2 }] },
      { skin: 1, hairStyle: 'short', top: c.s1, mood: holding ? 'effort' : 'smile', t });

    this._pushArrow(ctx, c, k);
  }

  // The force he is putting in - the only number on the panel that moves with
  // the dial. Its tip always meets the wall; its length is the reading.
  _pushArrow(ctx, c, k) {
    const col = c.s1;
    const casing = darken(col, 0.55);
    const tip = WALL_X - 2;
    const len = 26 + k * 82;
    const x0 = tip - len;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = col;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x0, ARROW_Y);
    ctx.lineTo(tip - 12, ARROW_Y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(tip + 3, ARROW_Y);
    ctx.lineTo(tip - 13, ARROW_Y - 11);
    ctx.lineTo(tip - 13, ARROW_Y + 11);
    ctx.closePath();
    ctx.fillStyle = casing;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(tip, ARROW_Y);
    ctx.lineTo(tip - 10, ARROW_Y - 7);
    ctx.lineTo(tip - 10, ARROW_Y + 7);
    ctx.closePath();
    ctx.fillStyle = col;
    ctx.fill();
    ctx.restore();
    // the label sits in the gap between him and the wall, never on either
    const lx = Math.max(HIP.x + 62, Math.min(tip - len / 2, WALL_X - 52));
    pill(ctx, c, `${Math.round(k * F_MAX)} N push`, lx, ARROW_Y + 34, { bg: c.accent, size: 14 });
  }

  // Who is who, named at the edges with a leader to each - the two things the
  // slide is comparing.
  _who(ctx, c, t) {
    const boxes = chipRow(ctx, c, [
      { text: 'you', bg: c.s1 },
      { text: 'the wall', bg: c.s6 },
    ], 340, 40, { align: 'center', size: 14 });
    for (const b of boxes) {
      const cx = b.x0 + b.w / 2;
      if (b.text === 'you') leader(ctx, cx, b.y0 + b.h, HIP.x + 60, 186, alpha(c.s1, 0.8), 1, t);
      else leader(ctx, cx, b.y0 + b.h, WALL_X + 34, WALL_TOP - 16, alpha(c.s6, 0.85), 1, t);
    }
  }

  // The three numbers, in their own card and never merged with the meter.
  _readings(ctx, c) {
    const heldText = this._heldShown >= 1 ? `${this._heldShown.toFixed(1)} s` : '0.0 s';
    drawReadout(ctx, c, CARD.x, CARD.y, CARD.w, [
      { label: 'Wall moved', value: WALL_MOVED_M, col: c.gold },
      { label: 'Work on the wall', value: `${WORK_J} J`, col: c.gold },
      { label: 'Holding for', value: heldText },
    ], { rowH: CARD.rowH });
  }

  // A separate object from the work box, and labelled in percent, never joules.
  _fatigueMeter(ctx, c) {
    const { x, y, w, h } = METER;
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = font(c, 700, 15);
    ctx.fillStyle = c.label;
    ctx.fillText('Effort spent', x, y - 14);
    ctx.font = font(c, 600, 14);
    ctx.fillStyle = c.labelMuted;
    ctx.textAlign = 'right';
    ctx.fillText('tiredness in you - not work on the wall', x + w, y - 14);
    ctx.restore();
    drawMeter(ctx, c, x, y, w, h, this._fatigue / 100, { col: c.s4, target: 1 });
    // the value beside the bar, in percent - its own object again
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = font(c, 800, 20, true);
    ctx.fillStyle = c.s4;
    ctx.fillText(`${this._pctShown}%`, x + w + 16, y + h / 2);
    ctx.restore();
  }

  // A plain ring on the quantity this beat's paragraph is about: beat 0 the
  // verdict (nothing moved), beat 1 the meter, beat 2 both side by side. No
  // prose - the ring says which box to look at, the slide says why.
  _rings(ctx, c, beat) {
    if (!(beat >= 0) || beat > 2) return;
    ctx.save();
    ctx.strokeStyle = alpha(c.gold, 0.8);
    ctx.lineWidth = 3;
    ctx.setLineDash([9, 7]);
    if (beat === 0) this._ring(ctx, CARD.x + 6, ROW0_Y - 17, CARD.w - 12, 34, 10);
    if (beat >= 1) this._ring(ctx, METER.x - 2, METER.y - 2, METER.w + 4, METER.h + 4, 12);
    if (beat >= 2) this._ring(ctx, CARD.x + 6, ROW1_Y - 17, CARD.w - 12, 34, 10);
    ctx.restore();
  }

  _ring(ctx, x, y, w, h, r) {
    rr(ctx, x, y, w, h, r);
    ctx.stroke();
  }
}
