import { SimScene } from 'simulations/base/kit/SimScene.js';
import {
  ZONES, W, rr, drawBackdrop, drawFloor, drawCard, drawReadout,
  drawShelf, drawFace, drawShadow, chipRow, font, alpha, darken,
} from 'simulations/base/kit/SimLook.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }], // one sack, one metre
  [{ idx: 1, dwellMs: null }], // the same job, three ways harder
  [{ idx: 2, dwellMs: null }], // the bar the work has to clear
];

// One sack of flour, 20 kg, g = 10 N/kg -> 200 N exactly.
const SACK_F = 200;
const SACK_H = 26;
const SACK_W = 30;
const MAX_J = 600; // full fuel-bar scale: the bar the three harder rigs must clear
const PAUSE = 0.5; // setting a sack down before going back for the next one

// The four fixed set-ups. A leg is one lift: how high it goes, how many sacks it
// carries, what it banks, and which floor slot it empties. Geometry never moves
// with a dial - that is the whole point of the comparison.
const BAYS = [
  { id: 'a', note: '1 sack 1 m', height: 1, loose: 1, legs: [{ m: 1, j: 200, n: 1, slot: 0 }] },
  {
    id: 'b',
    note: '3 one by one',
    height: 1,
    loose: 3,
    legs: [
      { m: 1, j: 200, n: 1, slot: 0 },
      { m: 1, j: 200, n: 1, slot: 1 },
      { m: 1, j: 200, n: 1, slot: 2 },
    ],
  },
  { id: 'c', note: '3 tied together', height: 1, loose: 3, legs: [{ m: 1, j: 600, n: 3 }] },
  { id: 'd', note: '1 sack 3 m', height: 3, loose: 1, legs: [{ m: 3, j: 600, n: 1, slot: 0 }] },
];
const WORK = {};
for (const b of BAYS) WORK[b.id] = b.legs.reduce((s, l) => s + l.j, 0);
// The force of one lift, not the total: (b) pushes the same 200 N three times.
const PUSH = {};
for (const b of BAYS) PUSH[b.id] = SACK_F * Math.max(...b.legs.map((l) => l.n));

const RATES = [
  { id: 'slow', label: 'Slow', secPerM: 3.0 },
  { id: 'steady', label: 'Steady', secPerM: 1.8 },
  { id: 'brisk', label: 'Brisk', secPerM: 0.9 },
];

const FLOOR_Y = 352;
const BAY_W = 152;
const BAY_GAP = 12;
const BAY_TOP = 96;

export class BagLiftRigsScene extends SimScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static ARIA_LABEL = 'Four lifting rigs side by side; run any one and watch its work readout and work bar fill together.';
  static NOTE_STAGE = 0;
  static NOTE_TITLE = 'NOTE';
  static CONTROLS = [
    {
      id: 'bay',
      label: 'Rig',
      // segmented, not select: a select never fires onchange for the option it
      // already shows, so rig (a) could not be run until another had been.
      type: 'segmented',
      options: BAYS.map((b) => ({ value: b.id, label: `(${b.id}) ${b.note}` })),
      value: 'a',
    },
    {
      id: 'rate',
      label: 'Lift rate',
      type: 'select',
      options: RATES.map((r) => ({ value: r.id, label: r.label })),
      value: 'steady',
    },
  ];

  noteRows(c) {
    return [
      { text: 'Sacks are identical', sub: 'Only how many, and how high' },
      { text: 'Slow, steady lifts', sub: 'The lifting force equals the weight' },
      { text: 'Same scale for all four', sub: 'One wall, one metre grid' },
    ];
  }

  async setup() {
    await super.setup();
    this._bay = 'a';
    this._resetRun();
  }

  enter(stage) {
    // The iris-in belongs to the first beat only; later beats just swap the stage.
    if (this._entered) this._k.fade = 1;
    this._entered = true;
    this._resetRun();
  }

  _resetRun() {
    this._run = null;
    this._landed = {};
    for (const b of BAYS) this._landed[b.id] = null;
    this.requestUiUpdate?.();
  }

  _bayDef(id) {
    return BAYS.find((b) => b.id === id) || BAYS[0];
  }

  _rate() {
    const v = this.getControlValue('rate');
    return RATES.find((r) => r.id === v) || RATES[1];
  }

  onControlChange(id) {
    if (!this._guard(id)) return;
    if (id === 'rate') {
      // Changing the rate mid-run restarts nothing; it only re-times a fresh run.
      this.requestUiUpdate?.();
      return;
    }
    if (id === 'bay') {
      const v = this.getControlValue('bay');
      this._bay = BAYS.some((b) => b.id === v) ? v : 'a';
      this._start();
    }
  }

  _start() {
    const bay = this._bayDef(this._bay);
    const rate = this._rate();
    // (b) is three separate lifts: up, set it down, up, set it down, up. Every
    // other rig is one lift, of whatever height it needs.
    const segs = [];
    bay.legs.forEach((leg, i) => {
      if (i > 0) segs.push({ kind: 'rest', dur: PAUSE });
      segs.push({ kind: 'move', dur: rate.secPerM * leg.m, leg });
    });
    const dur = segs.reduce((s, x) => s + x.dur, 0);
    this._run = { stage: this.stage, id: bay.id, t: 0, dur, segs };
    this.animateFor(dur * 1000 + 1200);
  }

  // Where the run is at time t: work banked, lifts finished, load in the air.
  _at(r) {
    let rem = Math.min(r.t, r.dur);
    let j = 0;
    let done = 0;
    let m = 0;
    let leg = null;
    for (const s of r.segs) {
      if (rem >= s.dur) {
        rem -= s.dur;
        if (s.kind === 'move') {
          done += 1;
          j += s.leg.j;
        }
        continue;
      }
      if (s.kind === 'move') {
        leg = s.leg;
        const u = rem / s.dur;
        m = s.leg.m * u;
        j += s.leg.j * u;
      }
      break;
    }
    return { j: Math.round(j), done, m, leg };
  }

  update(d) {
    const r = this._run;
    if (!r) return;
    r.t += d;
    // Gate on elapsed time, never on an eased value reaching 1.
    if (r.t >= r.dur) {
      r.t = r.dur;
      const bay = this._bayDef(r.id);
      this._landed[r.id] = { j: WORK[r.id], legs: bay.legs.length };
      this._run = null;
      this.requestUiUpdate?.();
      const box = this._bayBox(r.id);
      this.celebrate(box.cx, box.yAt(bay.height) - 16, 16);
      // Straight above the readout, where the learner is already looking, and
      // clear of the bay note above it (the report caught the old spot).
      this.floatText(`${WORK[r.id]} J`, box.cx, FLOOR_Y - 10);
    }
  }

  busy() {
    return !!this._run;
  }

  // Geometry for one bay: four across the full width, no side cards.
  _bayBox(id) {
    const i = BAYS.findIndex((b) => b.id === id);
    const total = BAYS.length * BAY_W + (BAYS.length - 1) * BAY_GAP;
    const x = (W - total) / 2 + i * (BAY_W + BAY_GAP);
    const pxPerM = (FLOOR_Y - BAY_TOP - 60) / 3;
    return {
      x,
      y: BAY_TOP,
      w: BAY_W,
      h: FLOOR_Y - BAY_TOP,
      cx: x + BAY_W / 2,
      yAt: (m) => FLOOR_Y - m * pxPerM,
      sackYAt: (m) => FLOOR_Y - m * pxPerM - SACK_H,
    };
  }

  // The x of one floor slot, so a sack keeps the same place all the way up.
  _slotX(box, n, i) {
    const spread = n * (SACK_W + 3) - 3;
    return box.cx - spread / 2 + i * (SACK_W + 3);
  }

  draw(ctx, c) {
    drawBackdrop(ctx, c, 'dots');
    drawFloor(ctx, c, FLOOR_Y);

    for (const b of BAYS) this._drawBay(ctx, c, b);

    // The 1 m line runs across all four bays, so it is drawn last: the same
    // shelf height in every rig is the claim this scene is making.
    const line = this._bayBox('a');
    ctx.save();
    ctx.setLineDash([6, 5]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = alpha(c.label, 0.38);
    ctx.beginPath();
    ctx.moveTo(ZONES.heroWide.x, line.yAt(1));
    ctx.lineTo(ZONES.heroWide.x + ZONES.heroWide.w, line.yAt(1));
    ctx.stroke();
    ctx.restore();

    // The height scale, named once, on the right of the tallest bay.
    const d3 = this._bayBox('d');
    ctx.save();
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.font = font(c, 700, 14);
    ctx.fillStyle = c.labelMuted;
    ctx.fillText('1 m', d3.x + d3.w - 10, d3.yAt(1) - 12);
    ctx.fillText('3 m', d3.x + d3.w - 10, d3.yAt(3) - 12);
    ctx.restore();

    this._chips(ctx, c);
  }

  _chips(ctx, c) {
    const sel = this._bayDef(this._bay);
    chipRow(ctx, c, [
      { text: `Rig (${sel.id})  ${sel.note}`, bg: c.accent },
      { text: 'work = force x distance', bg: c.s1 },
    ], W / 2, ZONES.top.y + 24, { align: 'center', gap: 12, size: 15 });
    if (this.stage >= 1) {
      chipRow(ctx, c, [{ text: 'same job, same work', bg: c.good }],
        W / 2, ZONES.bottom.y + 28, { align: 'center', size: 16 });
    }
  }

  _drawBay(ctx, c, bay) {
    const box = this._bayBox(bay.id);
    const active = !!(this._run && this._run.id === bay.id);
    const st = active ? this._at(this._run) : { j: 0, done: 0, m: 0, leg: null };
    const done = this._landed[bay.id];
    const j = active ? st.j : done ? done.j : 0;
    const nUp = active ? st.done : done ? done.legs : 0;
    const fly = active ? st.leg : null;
    const shelfY = box.yAt(bay.height);

    // The bay plate: a frame, not a card, so it never becomes a container for
    // the travelling sacks' text.
    drawCard(ctx, c, box.x, box.y, box.w, box.h, 1, { r: 10, accent: bay.id === this._bay ? c.accent : null });

    // the rig: two posts, and the one shelf it lifts to
    ctx.save();
    ctx.fillStyle = alpha(c.stroke, 0.85);
    rr(ctx, box.x + 4, box.y + 2, 6, FLOOR_Y - box.y - 2, 3);
    ctx.fill();
    rr(ctx, box.x + box.w - 10, box.y + 2, 6, FLOOR_Y - box.y - 2, 3);
    ctx.fill();
    // the 3 m mark on the shared wall, faint, in every bay
    ctx.strokeStyle = alpha(c.label, 0.16);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(box.x + 14, box.yAt(3));
    ctx.lineTo(box.x + box.w - 14, box.yAt(3));
    ctx.stroke();
    ctx.restore();
    drawShelf(ctx, c, box.x + 16, box.x + box.w - 16, shelfY);

    // rig letter and set-up, top-left; the force this rig needs, top-right
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = font(c, 800, 20, true);
    ctx.fillStyle = active ? c.accent : c.label;
    ctx.fillText(bay.id.toUpperCase(), box.x + 14, box.y + 16);
    ctx.font = font(c, 600, 13);
    ctx.fillStyle = c.labelMuted;
    ctx.fillText(bay.note, box.x + 14, box.y + 44);
    ctx.restore();
    chipRow(ctx, c, [{ text: `${PUSH[bay.id]} N`, bg: c.s1 }],
      box.x + box.w - 12, box.y + 16, { align: 'right', size: 14 });

    // the load: still waiting on the floor, in the air, or already on the shelf
    const used = new Set();
    for (let k = 0; k < nUp; k++) {
      const leg = bay.legs[k];
      const y = box.sackYAt(leg.m);
      for (const s of this._slots(leg)) {
        const sx = this._slotX(box, bay.loose, s);
        used.add(s);
        drawShadow(ctx, c, sx + SACK_W / 2, y + SACK_H + 1, SACK_W * 0.55, 4, 0.6);
        this._sack(ctx, c, sx, y, SACK_W, SACK_H, false);
      }
      this._tie(ctx, c, box, leg, y, SACK_H);
    }
    if (fly) {
      const y = box.sackYAt(st.m);
      for (const s of this._slots(fly)) {
        const sx = this._slotX(box, bay.loose, s);
        used.add(s);
        this._sack(ctx, c, sx, y, SACK_W * 0.96, SACK_H * 0.96, false, true);
      }
      this._tie(ctx, c, box, fly, y, SACK_H * 0.96);
    }
    for (let s = 0; s < bay.loose; s++) {
      if (used.has(s)) continue;
      this._sack(ctx, c, this._slotX(box, bay.loose, s), FLOOR_Y - SACK_H, SACK_W, SACK_H, true);
    }

    // the force arrow, in the margin beside the load, never in the flight lane
    const loadY = fly ? box.sackYAt(st.m) : nUp > 0 ? box.sackYAt(bay.height) : FLOOR_Y - SACK_H;
    const ax = box.x + 16;
    const aLen = 26 * (PUSH[bay.id] / SACK_F);
    ctx.save();
    ctx.strokeStyle = c.s1;
    ctx.fillStyle = c.s1;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(ax, loadY + SACK_H);
    ctx.lineTo(ax, loadY + SACK_H - aLen);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ax, loadY + SACK_H - aLen - 9);
    ctx.lineTo(ax - 6, loadY + SACK_H - aLen + 2);
    ctx.lineTo(ax + 6, loadY + SACK_H - aLen + 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // readout + fuel bar, below the floor line, in world coords (no transform)
    drawReadout(ctx, c, box.x + 8, FLOOR_Y + 16, box.w - 16, [
      { label: 'Work', value: `${j} J`, col: j ? c.good : c.labelMuted },
      { label: 'Work bar', value: `${Math.round((j / MAX_J) * 100)}%`, meter: j / MAX_J, col: c.s1 },
    ], { title: null, rowH: 24, accent: bay.id === this._bay ? c.accent : c.stroke });
  }

  // Which floor slots one lift empties: its own single slot, or all three when
  // it is the tied bundle.
  _slots(leg) {
    return leg.n > 1 ? [0, 1, 2] : [leg.slot];
  }

  // The rope that makes three sacks one bundle, drawn once across all three.
  _tie(ctx, c, box, leg, y, h) {
    if (leg.n < 2) return;
    const x0 = this._slotX(box, leg.n, 0) - 3;
    const x1 = this._slotX(box, leg.n, leg.n - 1) + SACK_W + 3;
    ctx.save();
    ctx.fillStyle = darken(c.s3, 0.45);
    ctx.fillRect(x0, y + h * 0.75, x1 - x0, 5);
    ctx.beginPath();
    ctx.arc((x0 + x1) / 2, y + h * 0.75 + 2.5, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _sack(ctx, c, x, y, w, h, ghost, flying) {
    ctx.save();
    if (ghost) {
      // still waiting its turn on the floor: an outline, never a second sack
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = alpha(c.label, 0.55);
      ctx.lineWidth = 2;
      rr(ctx, x, y, w, h, 5);
      ctx.stroke();
      ctx.restore();
      return;
    }
    ctx.fillStyle = c.s3;
    rr(ctx, x, y, w, h, 5);
    ctx.fill();
    ctx.strokeStyle = darken(c.s3, 0.25);
    ctx.lineWidth = 2;
    rr(ctx, x, y, w, h, 5);
    ctx.stroke();
    // the neck of the sack, so it is a sack and not a plain box
    ctx.fillStyle = darken(c.s3, 0.35);
    rr(ctx, x + w * 0.36, y - 3, w * 0.28, 5, 2);
    ctx.fill();
    ctx.restore();
    drawFace(ctx, x + w / 2, y + h * 0.4, w * 0.26, {
      c,
      col: c.s3,
      mood: flying ? 'happy' : 'smile',
      t: this.clock,
      look: { x: 0, y: flying ? -0.3 : 0.1 },
    });
  }
}
