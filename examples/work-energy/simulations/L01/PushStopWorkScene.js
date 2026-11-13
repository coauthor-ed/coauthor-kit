import { SimScene } from 'simulations/base/kit/SimScene.js';
import {
  W, drawBackdrop, drawFloor, drawCard, drawShadow, pill, font, alpha,
  darken, lighten, mix,
} from 'simulations/base/kit/SimLook.js';
import { drawFigure } from 'simulations/base/kit/SimFigure.js';
import { drawWheelchairPush } from './WheelchairPush.js';

const RUN_SEC = 1.6;

// s09 opens on the chair; s10 opens on the goalkeeper alone. Both open on
// stage 0, so the frame drawn in setup() and beat 0 agree.
const MAP_S09 = [[{ idx: 0, dwellMs: null }], [{ idx: 1, dwellMs: null }], [{ idx: 2, dwellMs: null }]];
const MAP_S10 = [[{ idx: 0, dwellMs: null }], [{ idx: 1, dwellMs: null }]];

const F_MAX = 500;
const F_START = 200;
const TRAVEL_MAX = 30;
const TRAVEL_START = 20;
const D_MAX = 30;

const FLOOR_Y = 336;
const READ_Y = 356;
const F_ROW = 118; // the force lane, clear above every head in both bays
const D_ROW = 186; // the displacement lane, 68 lower so the pair never crosses

// Two bays, two different pictures. The chair can only roll the way it is
// pushed, so its two arrows stay parallel and its work stays positive; the
// signed dial is the goalkeeper's hands, which is where the three cases live.
const BAYS = [
  { id: 'chair', cx: 196, kind: 'chair', vx: 222, push: 0 },
  { id: 'keeper', cx: 486, kind: 'keeper', vx: 474, push: 180 },
];

// Where her hands go relative to her own push: +30 straight along it, 0 square
// across it, -30 straight back against it. World angle in degrees.
function handsAngle(d) {
  return 90 + 3 * d;
}

function alongFrac(d) {
  // cos(90 deg) is 6.1e-17, not 0, so the square-across stop would read a tiny
  // number instead of a clean 0. Round the fraction, not the angle.
  return Math.round(Math.cos(((90 - d * 3) * Math.PI) / 180) * 1e6) / 1e6;
}

function fmt(n) {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

function signOf(w) {
  return w > 0.05 ? 1 : (w < -0.05 ? -1 : 0);
}

export class PushStopWorkScene extends SimScene {
  static BEAT_MAPS = { 3: MAP_S09, 2: MAP_S10 };
  static BEAT_STEP_MAP = MAP_S09;
  static ARIA_LABEL = 'Two bays on a floor: a boy pushing a wheelchair with the push and the motion pointing the same way, and a goalkeeper whose gloved hands are driven back against her push; each bay shows a force arrow, a displacement arrow and the signed work.';
  static NOTE_STAGE = 0;
  static NOTE_TITLE = 'NOTE';
  static CONTROLS = [
    { id: 'disp', label: 'Signed displacement', type: 'slider', min: -D_MAX, max: D_MAX, step: 5, value: -D_MAX, suffix: ' cm' },
    { id: 'force', label: 'Force', type: 'slider', min: 0, max: F_MAX, step: 25, value: F_START, suffix: ' N' },
    { id: 'travel', label: 'Hand travel', type: 'slider', min: 0, max: TRAVEL_MAX, step: 5, value: TRAVEL_START, suffix: ' cm' },
  ];

  // The note is drawn as a line, which joins the `text` fields and drops every
  // `sub` - so each line has to stand on its own or the last one dangles.
  noteRows() {
    return [
      { text: 'Simple figures', sub: 'No crowd and no real pitch' },
      { text: 'Sign follows the arrows', sub: 'Same way is positive, opposite is negative' },
      { text: 'Only one push counts', sub: 'Everything else is ignored' },
    ];
  }

  async setup() {
    await super.setup();
    this._runT = null;
  }

  enter(stage) {
    this._runT = null;
    this.requestUiUpdate?.();
  }

  isControlDisabled(id) {
    // Dials lock while a replay plays and release on the busy->idle edge.
    return this._runT !== null;
  }

  onControlChange(id) {
    if (!this._guard(id)) return;
    // A dial change replays the motion once in both bays: the chair rolls on,
    // her hands travel the way the dial points.
    this._runT = 0;
    this.animateFor(RUN_SEC * 1000 + 400);
  }

  update(d) {
    if (this._runT === null) return;
    this._runT += d;
    // Gate on elapsed time, never on an eased value reaching 1.
    if (this._runT >= RUN_SEC) {
      this._runT = null;
      this.requestUiUpdate?.();
      this.celebrate(BAYS[1].cx, READ_Y + 26, 18);
    }
  }

  busy() {
    return this._runT !== null;
  }

  _dials() {
    const num = (id, dflt) => {
      const v = Number(this.getControlValue(id));
      return Number.isFinite(v) ? v : dflt;
    };
    return { d: num('disp', -D_MAX), f: num('force', F_START), t: num('travel', TRAVEL_START) };
  }

  // The chair's own arrows stay parallel; only her hands follow the dial.
  _bayAngle(r, bay) {
    return bay.kind === 'chair' ? 0 : handsAngle(r.d);
  }

  _bayWork(r, bay) {
    const frac = bay.kind === 'chair' ? 1 : alongFrac(r.d);
    return r.f * (r.t / 100) * frac;
  }

  draw(ctx, c) {
    drawBackdrop(ctx, c, 'dots');
    drawFloor(ctx, c, FLOOR_Y);
    this._divider(ctx, c);

    const r = this._dials();
    const running = this._runT !== null;
    const m = this._motion();

    for (const bay of this._bays()) {
      const ang = this._bayAngle(r, bay);
      const tLen = 28 + (r.t / TRAVEL_MAX) * 38;
      this._bay(ctx, c, bay, r, ang, tLen, m);
      this._bayChips(ctx, c, bay, r, ang, tLen);
      this._readout(ctx, c, bay, r, running);
    }
    this._topChips(ctx, c, r, running);
  }

  // The s10 mount opens on the goalkeeper bay alone; the s09 mount shows both.
  // Same opening stage in both beat maps - only this chrome differs.
  _bays() {
    if (this.beatCount === 2) return [{ ...BAYS[1], cx: W / 2 }];
    return BAYS;
  }

  // 0 while resting, 0..1 while the replay plays.
  _motion() {
    if (this._runT === null) return 0;
    return Math.min(1, this._runT / RUN_SEC);
  }

  // A soft rule between the two cases: the empty middle band is the one the
  // empty-centre measure keeps reading, and a divider says "two bays" on it.
  _divider(ctx, c) {
    if (this.beatCount === 2) return;
    ctx.save();
    ctx.strokeStyle = alpha(c.label, 0.16);
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 9]);
    ctx.beginPath();
    ctx.moveTo(W / 2, 96);
    ctx.lineTo(W / 2, FLOOR_Y);
    ctx.stroke();
    ctx.restore();
  }

  _bay(ctx, c, bay, r, ang, tLen, m) {
    const rad = (ang * Math.PI) / 180;
    const dx = Math.cos(rad) * tLen * m;
    const dy = -Math.sin(rad) * tLen * m;
    if (bay.kind === 'chair') this._chair(ctx, c, bay.vx + dx, m);
    else this._keeper(ctx, c, bay.vx, dx, dy, r);

    // the force, always along the push; the displacement, always turning with
    // the dial - two lanes, two scales, so the pair never hides behind itself
    const fLen = 40 + (r.f / F_MAX) * 54;
    this._arrow(ctx, c, bay.vx + 34, F_ROW, bay.push, fLen, c.s1);
    this._arrow(ctx, c, bay.vx, D_ROW, ang, tLen, c.s2);
  }

  _arrow(ctx, c, x, y, deg, len, col) {
    const a = (deg * Math.PI) / 180;
    const ux = Math.cos(a);
    const uy = -Math.sin(a);
    const x1 = x + ux * len;
    const y1 = y + uy * len;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = mix(c.bgSurface, c.bgDeep, 0.4);
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.strokeStyle = col;
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x1 + ux * 14, y1 + uy * 14);
    ctx.lineTo(x1 - uy * 8, y1 + ux * 8);
    ctx.lineTo(x1 + uy * 8, y1 - ux * 8);
    ctx.closePath();
    ctx.fill();
    // the point the two vectors belong to
    ctx.beginPath();
    ctx.arc(x, y, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = c.bgSurface;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = col;
    ctx.stroke();
    ctx.restore();
  }

  _bayChips(ctx, c, bay, r, ang, tLen) {
    const a = (ang * Math.PI) / 180;
    const tipX = bay.vx + Math.cos(a) * tLen;
    const tipY = D_ROW - Math.sin(a) * tLen;
    // a chip above the tip, or below it when the arrow already points up
    const off = Math.sin(a) > 0.2 ? 30 : -24;
    // A chip is the page colour as its ink, so the fill has to be a light tint
    // of the arrow's own hue with a dark ink of the same hue - the raw series
    // fill carried the amber chip at 2.8:1 on the light backdrop.
    pill(ctx, c, `F ${r.f} N`, bay.vx + 34, F_ROW - 26, { bg: lighten(c.s1, 0.3), ink: darken(c.s1, 0.78), size: 14 });
    pill(ctx, c, `d ${r.t} cm`, tipX, tipY + off, { bg: lighten(c.s2, 0.3), ink: darken(c.s2, 0.78), size: 14 });
  }

  // Left: the boy behind the chair, hands on the grips, both wheels on the floor.
  _chair(ctx, c, x, m) {
    drawWheelchairPush(ctx, c, x, m, this.clock);
  }

  // Right: her diving to the left, both gloves on the ball, legs trailing.
  _keeper(ctx, c, vx, dx, dy, r) {
    const kit = c.s6;
    const ball = lighten(c.gold, 0.52);
    const mood = signOf(this._bayWork(r, BAYS[1])) < 0 ? 'oops' : 'smile';
    const bx = vx - 30 + dx;
    const by = 240 + dy;

    drawShadow(ctx, c, bx + 74, FLOOR_Y + 2, 40, 8);

    // The ball goes in `between`, so her hands land over it. Plain, with no face
    // of its own now that she has one.
    const paintBall = (g) => {
      g.save();
      g.fillStyle = darken(ball, 0.3);
      g.beginPath();
      g.arc(bx, by + 3, 17, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = ball;
      g.beginPath();
      g.arc(bx, by, 17, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = alpha(darken(ball, 0.34), 0.9);
      g.lineWidth = 2.5;
      g.beginPath();
      g.arc(bx - 6, by - 3, 8, 0.4, 2.6);
      g.stroke();
      g.beginPath();
      g.arc(bx + 8, by + 2, 7, 3.3, 5.6);
      g.stroke();
      g.restore();
    };

    // The goalkeeper: a kit figure leaning into the ball, both hands on it. She
    // is driven back with the ball, so her feet follow it.
    drawFigure(ctx, c,
      { x: bx + 74, y: FLOOR_Y, height: 150, build: 'adult', facing: -1, pose: 'push',
        hands: [{ x: bx + 12, y: by + 8 }, { x: bx + 14, y: by - 6 }] },
      { skin: 2, hairStyle: 'bun', top: kit, mood: mood === 'oops' ? 'oops' : 'effort', t: this.clock },
      { between: paintBall });
  }

  _limb(ctx, pts, w, col) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = darken(col, 0.3);
    ctx.lineWidth = w + 4;
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      if (i) ctx.lineTo(pts[i][0], pts[i][1]);
      else ctx.moveTo(pts[i][0], pts[i][1]);
    }
    ctx.stroke();
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.stroke();
    ctx.restore();
  }

  _head(ctx, c, x, y, r, mood, hair, tint) {
    const skin = lighten(c.gold, 0.22);
    const ink = darken(skin, 0.55);
    ctx.save();
    // hair behind the head
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.arc(x, y, r + 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    // cap of hair over the top
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.arc(x, y, r, Math.PI * 1.02, Math.PI * 2.02, false);
    ctx.closePath();
    ctx.fill();
    // eyes and a mouth that matches what the numbers say
    ctx.fillStyle = ink;
    if (mood === 'oops') {
      ctx.beginPath();
      ctx.arc(x - 4, y - 1, 3.1, 0, Math.PI * 2);
      ctx.arc(x + 5, y - 1, 3.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(x + 1, y + 9, 3.6, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(x - 4, y - 2, 2.5, 0, Math.PI * 2);
      ctx.arc(x + 5, y - 2, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(x + 1, y + 3, 4, 0.3, Math.PI - 0.3);
      ctx.stroke();
    }
    ctx.fillStyle = alpha(tint, 0.3);
    ctx.beginPath();
    ctx.ellipse(x - 8, y + 4, 3.6, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // The number and its sign, resolved only once the motion has stopped.
  _readout(ctx, c, bay, r, running) {
    const w = 210;
    const x = bay.cx - w / 2;
    const j = this._bayWork(r, bay);
    const s = signOf(j);
    const col = s > 0 ? c.good : (s < 0 ? c.bad : c.labelMuted);
    const name = bay.kind === 'chair' ? 'wheelchair' : 'goalkeeper';
    const where = bay.kind === 'chair'
      ? 'along its own motion'
      : (s > 0 ? 'along her force' : (s < 0 ? 'against her force' : 'square across'));

    drawCard(ctx, c, x, READ_Y, w, 88, 1, { r: 12, accent: running ? c.accent : col });

    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = font(c, 800, 14, true);
    ctx.fillStyle = c.label;
    ctx.fillText(name, x + 14, READ_Y + 22);
    ctx.font = font(c, 800, 26, true);
    ctx.fillStyle = running ? c.labelMuted : col;
    ctx.fillText(running ? 'moving' : `${s > 0 ? '+' : ''}${fmt(j)} J`, x + 14, READ_Y + 52);
    if (!running) {
      ctx.font = font(c, 600, 14);
      ctx.fillStyle = c.labelMuted;
      ctx.fillText(where, x + 14, READ_Y + 76);
    }
    ctx.restore();
  }

  // One chip per bay at the top edge: the sign, live from the two arrows, and
  // never a convention.
  _topChips(ctx, c, r, running) {
    pill(ctx, c, 'positive work', BAYS[0].cx, 34, { align: 'center', bg: c.good, size: 15 });
    const s = signOf(this._bayWork(r, BAYS[1]));
    const word = running ? 'sign pending'
      : (s > 0 ? 'positive work' : (s < 0 ? 'negative work' : 'zero work'));
    const bg = running ? c.accent : (s > 0 ? c.good : (s < 0 ? c.bad : c.warning));
    pill(ctx, c, word, BAYS[1].cx, 34, { align: 'center', bg, size: 15 });
  }
}
