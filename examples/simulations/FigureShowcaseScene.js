/**
 * FigureShowcaseScene - reference scene for SimFigure (the shared person): the scene only says where hands and feet
 * go; the kit solves the body. Beats: 0 Lift (hands grip a crate, autoReach crouches then straightens),
 * 1 Pull (rope over a pulley, bucket rises one stroke at a time), 2 Climb (ground(x) is the stair profile,
 * the walk phase comes from distance via walkPhase, so feet never slide). Held objects go in `between`.
 */
import { SimScene } from 'simulations/base/kit/SimScene.js';
import {
  ZONES, rr, ellipse, mix, darken, lighten, inOutSine, pill, chipRow, leader,
  drawBackdrop, drawDepth, drawFloor, drawSpotlight, drawVignette, drawMotes, drawShadow, drawShelf, drawReadout, drawFace,
} from 'simulations/base/kit/SimLook.js';
import { drawFigure, walkPhase } from 'simulations/base/kit/SimFigure.js';

const BEAT_STEP_MAP = [[{ idx: 0, dwellMs: null }], [{ idx: 1, dwellMs: null }], [{ idx: 2, dwellMs: null }]];
const S_LIFT = 0, S_PULL = 1, S_CLIMB = 2;
const FLOOR = 440;

const LIFT = { x: 250, H: 232, crateX: 292, crateW: 128, crateH: 96, rise: 66, secs: 1.6 };
const PULL = { x: 404, H: 184, wheel: { x: 470, y: 100, r: 30 }, pulls: 3, stroke: 1.0, regrip: 0.45 };
const STAIRS = { x0: 316, w: 54, rise: 32, n: 5 };
const CLIMB = { x0: 150, x1: 606, H: 168, speed: 120 };

const ground = (x) => FLOOR - STAIRS.rise * Math.max(0, Math.min(STAIRS.n, Math.floor((x - STAIRS.x0) / STAIRS.w) + 1));

export class FigureShowcaseScene extends SimScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static ARIA_LABEL =
    'A cartoon person does three jobs: squats to lift a crate with a face, pulls a rope over a pulley to raise a ' +
    'bucket, and climbs a staircase, cheering at the top.';
  static CONTROLS = [
    { type: 'button', id: 'lift', label: 'Lift' },
    { type: 'button', id: 'pull', label: 'Pull' },
    { type: 'button', id: 'climb', label: 'Climb' },
  ];

  constructor(container, config) {
    super(container, config);
    this.run = null;       // { stage, kind, t } token captured at launch
    this.u = 0;            // lift progress 0..1
    this.pulls = 0;        // finished pull strokes
    this.dist = 0;         // climb distance
    this.doneAt = -1;
  }

  enter() {
    this.run = null;
    this.u = 0;
    this.pulls = 0;
    this.dist = 0;
    this.doneAt = -1;
  }

  isControlHidden(id) { return id !== ['lift', 'pull', 'climb'][this.stage]; }
  isControlDisabled() { return !!this.run; }

  onControlChange(id) {
    if (!this._guard(id)) return;
    if (id === 'lift') { this.u = 0; this.doneAt = -1; this.run = { stage: this.stage, kind: 'lift', t: 0 }; }
    if (id === 'pull') {
      if (this.pulls >= PULL.pulls) { this.pulls = 0; this.doneAt = -1; }
      this.run = { stage: this.stage, kind: 'pull', t: 0 };
    }
    if (id === 'climb') { this.dist = 0; this.doneAt = -1; this.run = { stage: this.stage, kind: 'climb', t: 0 }; }
    this.requestUiUpdate?.();
  }

  busy() { return !!this.run || (this.doneAt >= 0 && this.clock - this.doneAt < 0.8); }

  update(d) {
    const run = this.run;
    if (!run) return;
    run.t += d;
    const c = this.colors;
    if (run.kind === 'lift') {
      this.u = Math.min(1, run.t / LIFT.secs);
      if (this.u >= 1) {
        this.run = null;
        this.doneAt = this.clock;
        const top = FLOOR - LIFT.crateH - LIFT.rise;
        this.celebrate(LIFT.crateX + LIFT.crateW / 2, top);
        this.floatText('lifted!', LIFT.crateX + LIFT.crateW / 2, top - 16, { bg: c.good, size: 18 });
      }
    } else if (run.kind === 'pull') {
      if (run.t >= PULL.stroke + PULL.regrip) {
        this.run = null;
        this.pulls += 1;
        this.doneAt = this.clock;
        const b = this.bucket();
        if (this.pulls >= PULL.pulls) {
          this.celebrate(b.x, b.y);
          this.floatText('to the top!', b.x + 96, b.y + 10, { bg: c.good, size: 18 });
        } else this.floatText(`pull ${this.pulls}`, b.x + 70, b.y, { bg: c.s2 });
      }
    } else {
      this.dist = Math.min(CLIMB.x1 - CLIMB.x0, this.dist + CLIMB.speed * d);
      if (this.dist >= CLIMB.x1 - CLIMB.x0) {
        this.run = null;
        this.doneAt = this.clock;
        this.after(0.15, () => this.celebrate(CLIMB.x1, ground(CLIMB.x1) - CLIMB.H));
      }
    }
  }

  // Rope drawn down this stroke (px): finished pulls plus the eased live stroke.
  pulled() {
    const len = this.strokeLen();
    const r = this.run;
    const live = r?.kind === 'pull' ? inOutSine(Math.min(1, r.t / PULL.stroke)) : 0;
    return (this.pulls + live) * len;
  }
  strokeLen() { return PULL.H * 0.4; }
  bucket() {
    const w = PULL.wheel;
    return { x: w.x + w.r, y: FLOOR - 40 - this.pulled() };
  }

  draw(ctx, c, t) {
    drawBackdrop(ctx, c, 'dots', { t });
    drawDepth(ctx, c, { t, seed: 3 + this.stage });
    drawFloor(ctx, c, FLOOR);
    if (this.stage === S_LIFT) this.drawLift(ctx, c, t);
    else if (this.stage === S_PULL) this.drawPull(ctx, c, t);
    else this.drawClimb(ctx, c, t);
    drawVignette(ctx, c, 0.8);
  }

  // -- Beat 0: lift ---------------------------------------------------------------

  drawLift(ctx, c, t) {
    const lift = LIFT.rise * inOutSine(this.u);
    const x0 = LIFT.crateX, w = LIFT.crateW, h = LIFT.crateH;
    const top = FLOOR - h - lift;
    drawSpotlight(ctx, c, x0 + 20, FLOOR - 120, 240);
    drawMotes(ctx, c, t, { x: 180, y: 90, w: 320, h: 330 });
    drawShadow(ctx, c, x0 + w / 2, FLOOR, w * 0.55 * (1 - 0.3 * (lift / LIFT.rise)), 9);
    const moving = !!this.run;
    const done = this.u >= 1;
    const sk = drawFigure(ctx, c,
      { x: LIFT.x, y: FLOOR, height: LIFT.H, facing: 1, pose: 'stand', hands: [{ x: x0 + 12, y: top + 40 }, { x: x0 + 22, y: top + 30 }] },
      { top: c.s1, skin: 2, hairStyle: 'curly', mood: moving ? 'effort' : done ? 'happy' : 'smile', t },
      { between: () => this.crate(ctx, c, x0, top, w, h, moving ? 'oops' : done ? 'happy' : 'smile', t) });
    const rows = [
      { label: 'height', value: `${(lift / 100).toFixed(1)} m`, col: c.s1, meter: lift / LIFT.rise },
      { label: 'crouch', value: `${Math.round(sk.crouch * 100)}%`, col: c.s2 },
    ];
    drawReadout(ctx, c, ZONES.right.x, ZONES.right.y, ZONES.right.w, rows, { title: 'lift', accent: c.s1 });
    const boxes = chipRow(ctx, c, [{ text: 'grip', bg: c.s2 }, { text: 'the crate', bg: c.s3 }], 190, 40, { align: 'center' });
    leader(ctx, boxes[0].x0 + boxes[0].w / 2, boxes[0].y0 + boxes[0].h, sk.anchors.hand[0].x, sk.anchors.hand[0].y, c.s2, 1, t);
    leader(ctx, boxes[1].x0 + boxes[1].w / 2, boxes[1].y0 + boxes[1].h, x0 + w * 0.7, top + 10, c.s3, 1, t);
    if (done) pill(ctx, c, 'legs did the work', 340, 478, { bg: c.good, size: 16 });
  }

  crate(ctx, c, x, y, w, h, mood, t) {
    const wood = darken(c.gold, 0.22);
    rr(ctx, x, y + 5, w, h, 10);
    ctx.fillStyle = darken(wood, 0.4);
    ctx.fill();
    rr(ctx, x, y, w, h, 10);
    ctx.fillStyle = wood;
    ctx.fill();
    ctx.save();
    rr(ctx, x, y, w, h, 10);
    ctx.clip();
    ctx.fillStyle = darken(wood, 0.12);
    for (let i = 1; i < 4; i++) ctx.fillRect(x, y + (h * i) / 4 - 1.5, w, 3);
    ctx.fillStyle = lighten(wood, 0.25);
    ctx.fillRect(x + 8, y + 4, w - 16, 3);
    ctx.restore();
    // Corner battens.
    ctx.fillStyle = darken(wood, 0.28);
    for (const bx of [x + 4, x + w - 18]) { rr(ctx, bx, y + 4, 14, h - 8, 5); ctx.fill(); }
    drawFace(ctx, x + w * 0.56, y + h * 0.52, h * 0.34, { col: wood, c, mood, t });
  }

  // -- Beat 1: pull ---------------------------------------------------------------

  drawPull(ctx, c, t) {
    const W = PULL.wheel, H = PULL.H;
    const ropeX = W.x - W.r;
    const pulled = this.pulled();
    const r = this.run;
    // Hands: down the rope during a stroke, then slide back up to re-grip.
    const s = this.strokeLen();
    let k = 0;
    if (r?.kind === 'pull') k = r.t < PULL.stroke ? inOutSine(r.t / PULL.stroke) : 1 - inOutSine((r.t - PULL.stroke) / PULL.regrip);
    const yHigh = FLOOR - 0.98 * H;
    const near = { x: ropeX, y: yHigh + 0.14 * H + k * s }, far = { x: ropeX, y: yHigh + 0.05 * H + k * s };
    drawSpotlight(ctx, c, 440, 260, 250);
    // Beam and pulley.
    drawShelf(ctx, c, 360, 660, 44, { col: c.s5 });
    ctx.fillStyle = mix(c.stroke, c.label, 0.2);
    rr(ctx, W.x - 5, 58, 10, W.y - 58, 4);
    ctx.fill();
    const b = this.bucket();
    const rope = mix(c.gold, c.label, 0.25);
    ctx.strokeStyle = rope;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(W.x + W.r, W.y);
    ctx.lineTo(W.x + W.r, b.y - 44);
    ctx.stroke();
    this.bucketAt(ctx, c, b.x, b.y, this.pulls >= PULL.pulls ? 'happy' : 'smile', t);
    const sk = drawFigure(ctx, c,
      { x: PULL.x, y: FLOOR, height: H, facing: 1, pose: 'stand', hands: [near, far] },
      { top: c.s4, skin: 0, hairStyle: 'long', hair: 1, mood: r ? 'effort' : 'smile', t },
      {
        between: () => {
          // Rope from the wheel down through both hands to a coil on the floor.
          ctx.strokeStyle = rope;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(ropeX, W.y);
          ctx.lineTo(ropeX, FLOOR - 16);
          ctx.quadraticCurveTo(ropeX + 4, FLOOR - 2, ropeX + 26, FLOOR - 6);
          ctx.stroke();
          const coil = Math.min(28, 10 + pulled / 12);
          ellipse(ctx, ropeX + 34, FLOOR - 5, coil, 6);
          ctx.lineWidth = 3;
          ctx.stroke();
        },
      });
    this.wheel(ctx, c, W, pulled);
    const rows = [
      { label: 'pulls', value: `${this.pulls} / ${PULL.pulls}`, col: c.s4 },
      { label: 'bucket up', value: `${(pulled / 100).toFixed(1)} m`, col: c.s2, meter: pulled / (s * PULL.pulls) },
    ];
    drawReadout(ctx, c, ZONES.left.x, ZONES.left.y + 40, ZONES.left.w, rows, { title: 'pulley', accent: c.s4 });
    const boxes = chipRow(ctx, c, [{ text: 'pull down', bg: c.s4 }, { text: 'load goes up', bg: c.s2 }], 400, 20, { align: 'center' });
    leader(ctx, boxes[0].x0 + 20, boxes[0].y0 + boxes[0].h, sk.anchors.hand[1].x - 4, sk.anchors.hand[1].y, c.s4, 1, t);
    leader(ctx, boxes[1].x0 + boxes[1].w - 20, boxes[1].y0 + boxes[1].h, b.x + 26, b.y - 10, c.s2, 1, t);
  }

  wheel(ctx, c, W, turned) {
    const col = mix(c.s7, c.bgDeep, 0.1);
    ctx.beginPath();
    ctx.arc(W.x, W.y + 3, W.r, 0, Math.PI * 2);
    ctx.fillStyle = darken(col, 0.4);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(W.x, W.y, W.r, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(W.x, W.y, W.r - 7, 0, Math.PI * 2);
    ctx.fillStyle = darken(col, 0.18);
    ctx.fill();
    const a = turned / W.r;
    ctx.strokeStyle = lighten(col, 0.3);
    ctx.lineWidth = 4;
    for (let i = 0; i < 3; i++) {
      const q = a + (i * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.moveTo(W.x, W.y);
      ctx.lineTo(W.x + Math.cos(q) * (W.r - 8), W.y + Math.sin(q) * (W.r - 8));
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(W.x, W.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = lighten(col, 0.5);
    ctx.fill();
  }

  bucketAt(ctx, c, x, y, mood, t) {
    const col = c.s2;
    const w = 58, h = 50;
    // Handle, then a tapered pail with a rim.
    ctx.strokeStyle = darken(col, 0.35);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y - h / 2 + 6, w / 2 - 2, Math.PI, 0);
    ctx.stroke();
    const pail = (dy) => {
      ctx.beginPath();
      ctx.moveTo(x - w / 2, y - h / 2 + dy);
      ctx.lineTo(x + w / 2, y - h / 2 + dy);
      ctx.lineTo(x + w / 2 - 7, y + h / 2 + dy);
      ctx.quadraticCurveTo(x, y + h / 2 + 6 + dy, x - w / 2 + 7, y + h / 2 + dy);
      ctx.closePath();
    };
    pail(4); ctx.fillStyle = darken(col, 0.38); ctx.fill();
    pail(0); ctx.fillStyle = col; ctx.fill();
    rr(ctx, x - w / 2 - 3, y - h / 2 - 3, w + 6, 9, 4.5);
    ctx.fillStyle = lighten(col, 0.2);
    ctx.fill();
    drawFace(ctx, x, y + 6, 18, { col, c, mood, t });
  }

  // -- Beat 2: climb --------------------------------------------------------------

  drawClimb(ctx, c, t) {
    const wood = darken(c.gold, 0.25);
    drawSpotlight(ctx, c, 480, 300, 260);
    // Stairs: one block per step, cushion under, a lit nose on each tread.
    for (let i = 0; i < STAIRS.n; i++) {
      const x = STAIRS.x0 + i * STAIRS.w, y = FLOOR - (i + 1) * STAIRS.rise;
      const w = 680 - x;
      ctx.fillStyle = mix(wood, c.bgDeep, 0.25 + 0.05 * i);
      ctx.fillRect(x, y, w, STAIRS.rise + 1);
      ctx.fillStyle = lighten(wood, 0.18);
      rr(ctx, x - 4, y - 3, w + 8, 8, 4);
      ctx.fill();
      ctx.fillStyle = darken(wood, 0.35);
      ctx.fillRect(x, y + 5, w, 3);
    }
    const walked = this.dist;
    const x = CLIMB.x0 + walked;
    const atTop = walked >= CLIMB.x1 - CLIMB.x0;
    const H = CLIMB.H;
    const pose = atTop ? 'cheer' : { name: 'climb', phase: walkPhase(walked, H, 'climb') };
    const sk = drawFigure(ctx, c,
      { x, y: ground(x), height: H, facing: atTop ? 0 : 1, pose, ground },
      { top: c.s3, skin: 3, hairStyle: 'bun', mood: atTop ? 'happy' : 'smile', t });
    const steps = Math.max(0, Math.min(STAIRS.n, Math.floor((x - STAIRS.x0) / STAIRS.w) + 1));
    const rows = [
      { label: 'steps', value: `${steps} / ${STAIRS.n}`, col: c.s3, meter: steps / STAIRS.n },
      { label: 'height', value: `${((FLOOR - ground(x)) / 100).toFixed(1)} m`, col: c.s1 },
    ];
    drawReadout(ctx, c, ZONES.left.x, ZONES.left.y, ZONES.left.w, rows, { title: 'stairs', accent: c.s3 });
    if (atTop) {
      const hd = sk.anchors.top;
      pill(ctx, c, `+${((FLOOR - ground(x)) / 100).toFixed(1)} m`, hd.x - 70, hd.y - 30, { bg: c.good, size: 18, display: true });
    } else {
      const boxes = chipRow(ctx, c, [{ text: 'feet follow the steps', bg: c.s3 }], 480, 40, { align: 'center' });
      leader(ctx, boxes[0].x0 + boxes[0].w / 2, boxes[0].y0 + boxes[0].h, sk.anchors.foot[0].x, sk.anchors.foot[0].y - 4, c.s3, 1, t);
    }
  }
}
