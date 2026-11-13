import { SimScene } from 'simulations/base/kit/SimScene.js';
import {
  W, rr, drawBackdrop, drawFloor, drawCard, pill, font, alpha, darken, lighten, mix, drawShadow,
} from 'simulations/base/kit/SimLook.js';
import { drawFigure, walkPhase } from 'simulations/base/kit/SimFigure.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }], // she is already walking
  [{ idx: 1, dwellMs: null }], // drag the angle round
  [{ idx: 2, dwellMs: null }], // the dead end
  [{ idx: 3, dwellMs: null }], // the one angle left alone
];

const BOX_M = 12; // kg
const F = BOX_M * 10; // 120 N, the weight she pushes up against
const WALK_MIN = 2;
const WALK_MAX = 10;
const WALK_START = 6;
const ANGLE_MAX = 90;
const STEP = 15; // the dead grey ticks between the two detents

const FLOOR_Y = 372;
const WALL_TOP = 92;
const X0 = 244; // start doorway
const X1 = 556; // far doorway
const BOX_TOP = 236; // waist height
const BOX_W = 78;
const BOX_H = 52;
const HEAD_Y = 200;
const HEAD_R = 19;
const FIG_H = 185; // feet to top of head
const F_LEN = 72; // the force arrow, drawn from the box's near top corner
const D_Y = FLOOR_Y + 44; // the displacement lane, below the walk
const WALK_SEC = 3.4; // one steady, unremarkable walk

function angleDeg() {
  const v = Number(this.getControlValue('angle'));
  return Number.isFinite(v) ? Math.max(0, Math.min(ANGLE_MAX, v)) : ANGLE_MAX;
}

function chipX(x) {
  return Math.max(58, Math.min(W - 58, x));
}

export class CarryBoxScene extends SimScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static ARIA_LABEL = 'A girl walks a school corridor carrying a box; a force arrow turns from along her walk to square across it, and the part of the walk that acts along the push shrinks to nothing, with the work reading zero.';
  static NOTE_STAGE = 0;
  static NOTE_TITLE = 'NOTE';
  static CONTROLS = [
    { id: 'angle', label: 'Push angle', type: 'slider', min: 0, max: ANGLE_MAX, step: STEP, value: ANGLE_MAX, suffix: '\u00b0' },
    { id: 'walk', label: 'Walk length', type: 'slider', min: WALK_MIN, max: WALK_MAX, step: 1, value: WALK_START, suffix: ' m' },
  ];

  noteRows(c) {
    return [
      { text: 'Her hands push up', sub: 'The box moves sideways' },
      { text: 'Only the push counts', sub: 'Her walking pace does not matter' },
    ];
  }

  async setup() {
    await super.setup();
    this._walkT = 0;
    this._arrived = false;
    this._popped = false;
    this._angle = ANGLE_MAX;
    this._walkM = WALK_START;
  }

  enter(stage) {
    this._walkT = 0;
    this._arrived = false;
    this._popped = false;
    this._angle = angleDeg.call(this);
    this._walkM = Number(this.getControlValue('walk')) || WALK_START;
    this.animateFor(WALK_SEC * 1000 + 400);
  }

  onControlChange(id) {
    if (!this._guard(id)) return;
    // Every dial change walks the corridor once.
    this._angle = angleDeg.call(this);
    this._walkM = Number(this.getControlValue('walk')) || WALK_START;
    this._walkT = 0;
    this._arrived = false;
    this._popped = false;
    this.animateFor(WALK_SEC * 1000 + 400);
  }

  update(d) {
    if (this._arrived) return;
    this._walkT += d;
    // Gate on elapsed time, never on an eased value reaching 1.
    if (this._walkT >= WALK_SEC) {
      this._walkT = WALK_SEC;
      this._arrived = true;
    }
    // The walk completing is the beat's event, and the small burst is the
    // celebration: one short spark at the door, never a party.
    if (this._arrived && !this._popped) {
      this._popped = true;
      this.celebrate(X1, BOX_TOP - 10, 16);
    }
  }

  busy() {
    return !this._arrived;
  }

  // How far along the corridor she is, 0..1.
  _u() {
    return Math.min(1, this._walkT / WALK_SEC);
  }

  // How much of the displacement acts along the force: full at 0, zero at 90.
  // Math.cos(90 deg) is 6.1e-17, not 0, so the square-across case would carry a
  // residue instead of reading zero. Rounding the fraction (not the angle) keeps
  // it one computation with no special case.
  _alongFrac() {
    return Math.round(Math.cos((this._angle * Math.PI) / 180) * 1e6) / 1e6;
  }

  // The lesson computes work only at the two detents.
  _workAt() {
    return F * this._walkM * this._alongFrac();
  }

  draw(ctx, c) {
    drawBackdrop(ctx, c, 'dots');
    drawFloor(ctx, c, FLOOR_Y);
    this._corridor(ctx, c);

    const u = this._u();
    const gx = X0 + (X1 - X0) * u;
    const along = this._alongFrac();

    this._ghost(ctx, c);
    this._displacement(ctx, c, along);
    this._figure(ctx, c, gx, { step: this._arrived ? 0 : Math.sin(u * Math.PI * 8) });
    this._force(ctx, c, gx);
    this._angleMark(ctx, c);
    this._workCard(ctx, c);
    this._boxCard(ctx, c);
    this._chips(ctx, c);
  }

  // The corridor is the apparatus here: she walks its whole length, so the set
  // is a real wall with two doorways in it, not a bare dotted void.
  _corridor(ctx, c) {
    const wall = darken(mix(c.raised, c.gold, 0.12), 0.24);
    const deep = darken(wall, 0.4);
    ctx.save();
    // wall face
    ctx.fillStyle = wall;
    ctx.fillRect(0, WALL_TOP, W, FLOOR_Y - WALL_TOP);
    // ceiling band with a lit lip under it
    ctx.fillStyle = darken(wall, 0.5);
    ctx.fillRect(0, WALL_TOP, W, 18);
    ctx.fillStyle = alpha(c.label, 0.18);
    ctx.fillRect(0, WALL_TOP + 18, W, 2);
    // dado rail and skirting
    ctx.fillStyle = alpha(deep, 0.9);
    ctx.fillRect(0, 252, W, 5);
    ctx.fillStyle = darken(wall, 0.5);
    ctx.fillRect(0, FLOOR_Y - 12, W, 12);
    ctx.restore();

    this._windows(ctx, c);
    this._door(ctx, c, X0, false);
    this._door(ctx, c, X1, this._arrived);
  }

  // Three high windows, dark-paned: a corridor is not a bare wall, and a dark
  // pane keeps the force arrow legible where it sweeps past them.
  _windows(ctx, c) {
    const y = 126;
    const h = 70;
    const w = 56;
    ctx.save();
    for (let i = 0; i < 3; i++) {
      const x = 348 + i * 68;
      ctx.fillStyle = c.raised;
      rr(ctx, x - 5, y - 5, w + 10, h + 10, 4);
      ctx.fill();
      ctx.fillStyle = darken(c.bgSurface, 0.3);
      rr(ctx, x, y, w, h, 3);
      ctx.fill();
      ctx.fillStyle = c.raised;
      ctx.fillRect(x + w / 2 - 3, y, 6, h);
      ctx.fillStyle = lighten(c.raised, 0.1);
      rr(ctx, x - 9, y + h + 5, w + 18, 7, 3);
      ctx.fill();
    }
    ctx.restore();
  }

  _door(ctx, c, x, lit) {
    const w = 68;
    const top = FLOOR_Y - 168;
    ctx.save();
    ctx.fillStyle = darken(mix(c.raised, c.gold, 0.12), 0.5);
    rr(ctx, x - w / 2 - 8, top - 9, w + 16, FLOOR_Y - top + 9, 6);
    ctx.fill();
    ctx.fillStyle = lit ? mix(c.raised, c.gold, 0.5) : darken(c.bgSurface, 0.35);
    rr(ctx, x - w / 2, top, w, FLOOR_Y - top, 4);
    ctx.fill();
    ctx.fillStyle = alpha(c.gold, lit ? 0.32 : 0.12);
    ctx.fillRect(x - w / 2 + 5, FLOOR_Y - 15, w - 10, 15);
    // pool of light on the floor in front of the doorway
    ctx.fillStyle = alpha(c.gold, lit ? 0.3 : 0.1);
    ctx.beginPath();
    ctx.moveTo(x - w / 2, FLOOR_Y);
    ctx.lineTo(x + w / 2, FLOOR_Y);
    ctx.lineTo(x + w / 2 + 42, FLOOR_Y + 34);
    ctx.lineTo(x - w / 2 - 42, FLOOR_Y + 34);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = alpha(c.label, 0.5);
    rr(ctx, x + w / 2 - 15, top + 78, 6, 6, 3);
    ctx.fill();
    ctx.restore();
  }

  // Where she started, left behind at 0.3 alpha: a flat, faceless copy, never a
  // panel that could swallow a moving label.
  _ghost(ctx, c) {
    ctx.save();
    ctx.globalAlpha *= 0.3;
    this._body(ctx, c, X0, { step: 0, plain: true });
    ctx.restore();
  }

  _figure(ctx, c, gx, o) {
    drawShadow(ctx, c, gx + 4, FLOOR_Y + 2, 30, 8);
    this._body(ctx, c, gx, o);
  }

  // One body, drawn twice: solid for her, and again at 0.3 alpha (the caller
  // sets it) for the start she left behind. A kit figure on the walk cycle, with
  // the box carried in her hands: the box goes in `between`, so her hands land
  // over it, and the phase comes from the distance walked so no foot slides.
  _body(ctx, c, x, o) {
    const walking = !o.plain && !this._arrived && x > X0 + 1;
    const phase = walking ? walkPhase(x - X0, FIG_H, 'walk') : 0;
    const paintBox = (g) => {
      g.save();
      g.fillStyle = c.gold;
      rr(g, x - BOX_W / 2 + 10, BOX_TOP, BOX_W, BOX_H, 5);
      g.fill();
      g.fillStyle = darken(c.gold, 0.12);
      g.fillRect(x - BOX_W / 2 + 10, BOX_TOP + BOX_H - 12, BOX_W, 12);
      g.strokeStyle = darken(c.gold, 0.45);
      g.lineWidth = 2.5;
      g.beginPath();
      g.moveTo(x + 10, BOX_TOP);
      g.lineTo(x + 10, BOX_TOP + BOX_H - 12);
      g.stroke();
      rr(g, x - BOX_W / 2 + 10, BOX_TOP, BOX_W, BOX_H, 5);
      g.stroke();
      g.restore();
    };
    drawFigure(ctx, c,
      { x, y: FLOOR_Y, height: FIG_H, build: 'teen', facing: 1, pose: { name: 'walk', phase },
        hands: [{ x: x + 40, y: BOX_TOP + BOX_H - 4 }, { x: x + 24, y: BOX_TOP + BOX_H - 4 }] },
      { skin: 1, hairStyle: 'bun', top: c.s5, mood: 'smile', t: this.clock },
      { between: paintBox });
  }

  // The displacement: a full arrow for the whole walk, and the part of it that
  // acts along the push drawn in the force's own colour, full at 0 deg and gone
  // at 90 deg.
  _displacement(ctx, c, along) {
    const len = (X1 - X0) * (this._walkM / WALK_MAX);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = c.s2;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(X0, D_Y);
    ctx.lineTo(X0 + len, D_Y);
    ctx.stroke();
    ctx.fillStyle = c.s2;
    ctx.beginPath();
    ctx.moveTo(X0 + len + 15, D_Y);
    ctx.lineTo(X0 + len, D_Y - 9);
    ctx.lineTo(X0 + len, D_Y + 9);
    ctx.closePath();
    ctx.fill();
    const act = len * along;
    if (act > 1) {
      ctx.strokeStyle = c.s1;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(X0, D_Y);
      ctx.lineTo(X0 + act, D_Y);
      ctx.stroke();
      if (act > 46) {
        ctx.fillStyle = c.s1;
        ctx.beginPath();
        ctx.moveTo(X0 + act + 9, D_Y);
        ctx.lineTo(X0 + act - 1, D_Y - 8);
        ctx.lineTo(X0 + act - 1, D_Y + 8);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
    pill(ctx, c, `d = ${this._walkM} m`, chipX(X0 + len), D_Y + 24, { bg: c.accent, size: 14 });
    if (act > 30) {
      pill(ctx, c, 'acts along the push', chipX(X0 + act / 2), D_Y + 52, { bg: c.s1, size: 14 });
    }
  }

  // The force: a separate arrow, separately labelled, on the box. 0 deg lies
  // along the direction of travel, 90 deg is square across it.
  _force(ctx, c, gx) {
    const rad = (this._angle * Math.PI) / 180;
    const tx = gx - 40;
    const ty = BOX_TOP;
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(-rad);
    ctx.strokeStyle = c.s1;
    ctx.fillStyle = c.s1;
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(F_LEN, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(F_LEN + 17, 0);
    ctx.lineTo(F_LEN - 2, -11);
    ctx.lineTo(F_LEN - 2, 11);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // label at the tip, in world coordinates, never inside a transform
    const hx = tx + Math.cos(rad) * (F_LEN + 30);
    const hy = ty - Math.sin(rad) * (F_LEN + 30);
    pill(ctx, c, `F = ${F} N`, chipX(hx), Math.max(30, hy), { bg: c.s1, size: 14 });
  }

  // The angle itself, marked at the tail of the displacement: between the way
  // she is walking and the way she pushes.
  _angleMark(ctx, c) {
    const rad = (this._angle * Math.PI) / 180;
    const R = 34;
    ctx.save();
    ctx.strokeStyle = alpha(c.s1, 0.6);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    if (this._angle > 6) {
      ctx.beginPath();
      ctx.arc(X0, D_Y, R, -rad, 0);
      ctx.stroke();
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(X0, D_Y);
      ctx.lineTo(X0 + Math.cos(rad) * (R + 12), D_Y - Math.sin(rad) * (R + 12));
      ctx.stroke();
    }
    ctx.restore();
  }

  // The work box: a number only at the two detents, words in between.
  _workCard(ctx, c) {
    const a = Math.round(this._angle);
    const detent = a === 0 || a === ANGLE_MAX;
    const bx = 16;
    const by = 84;
    const bw = 176;
    const bh = 102;
    drawCard(ctx, c, bx, by, bw, bh, 1, { r: 12, accent: detent ? c.accent : undefined });

    const j = this._workAt();
    let big;
    let size = 24;
    let col;
    let sub;
    if (a === ANGLE_MAX) {
      big = '0 J';
      col = c.warning;
      sub = 'none of it';
    } else if (a === 0) {
      big = `${Math.round(j)} J`;
      col = c.good;
      sub = 'all of it';
    } else {
      big = 'not computed';
      size = 18;
      col = c.labelMuted;
      sub = 'needs a formula';
    }

    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = font(c, 700, 14);
    ctx.fillStyle = c.labelMuted;
    ctx.fillText('Work done', bx + 14, by + 22);
    ctx.font = font(c, 800, size, true);
    ctx.fillStyle = col;
    ctx.fillText(big, bx + 14, by + 54);
    ctx.font = font(c, 600, 14);
    ctx.fillStyle = c.labelMuted;
    ctx.fillText(sub, bx + 14, by + 80);
    ctx.restore();
  }

  // The box's own numbers, so the F chip is not the only place 120 N appears.
  _boxCard(ctx, c) {
    const bx = 16;
    const by = 202;
    const bw = 176;
    const bh = 96;
    drawCard(ctx, c, bx, by, bw, bh, 1, { r: 12 });
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = font(c, 700, 14);
    ctx.fillStyle = c.labelMuted;
    ctx.fillText('The box', bx + 14, by + 22);
    ctx.font = font(c, 800, 20, true);
    ctx.fillStyle = c.label;
    ctx.fillText(`${BOX_M} kg`, bx + 14, by + 50);
    ctx.font = font(c, 600, 14);
    ctx.fillStyle = c.labelMuted;
    ctx.fillText(`weight ${F} N`, bx + 14, by + 76);
    ctx.restore();
  }

  _chips(ctx, c) {
    const a = Math.round(this._angle);
    const atDetent = a === 0 || a === ANGLE_MAX;
    // c.raised puts the pill's own ink at 1.2:1 for the long non-detent chip;
    // gold is the fill that carries dark ink in both themes.
    pill(ctx, c, atDetent ? `push ${a} deg` : `push ${a} deg - this lesson will not compute this angle`,
      W / 2, 24, { align: 'center', bg: atDetent ? c.accent : c.gold, size: 14 });
    // beat 1 is the learner's beat: say once, quietly, what to touch
    if (this.stage === 1) {
      pill(ctx, c, 'turn the push dial', W / 2, 54 + Math.sin(this.clock * 3) * 1.5,
        { align: 'center', bg: c.gold, size: 14 });
    }
    // she stands in the doorway, so the arrival marker is on the floor at its
    // feet - the one place the walk cannot cover
    if (this._arrived) {
      pill(ctx, c, 'arrived', X1, 390, { bg: c.good, size: 14 });
    }
  }
}
