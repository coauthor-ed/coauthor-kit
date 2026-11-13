/**
 * LookKitShowcaseScene - reference scene for the look kit (SimScene + SimLook, docs/simulation-authoring.md 4.6),
 * subject-neutral and the kit's GOOD calibration image: a tank with a face on a bench, a sprout, a tap, a target flag.
 * Beats: 0 Meet (chips name the parts), 1 Pour (a busy() run, verdict via after(), celebrate() + floatText()), 2 Note.
 * Layout by ZONES: chips top/bottom, cards left/right, the tank as hero (heroBox), dressing in leftover corners.
 */
import { SimScene } from 'simulations/base/kit/SimScene.js';
import {
  ZONES, heroBox, rr, ellipse, star, sparkle, mix, alpha, darken, lighten, mulberry32,
  pill, chipRow, popAt, leader, speechBubble, drawBackdrop, drawDepth, drawFloor, drawSunbeam,
  drawSpotlight, drawVignette, drawMotes, drawTwinkles, drawShadow, drawBench, drawReadout, drawBadge, drawFace,
} from 'simulations/base/kit/SimLook.js';

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }],
  [{ idx: 1, dwellMs: null }],
  [{ idx: 2, dwellMs: null }],
];
const S_MEET = 0, S_POUR = 1, S_NOTE = 2;

const AMOUNTS = { little: 0.25, right: 0.5, lot: 0.85 };
const AMOUNT_LABELS = { little: 'a little', right: 'just enough', lot: 'a lot' };
const TARGET = 0.5;
const FILL_RATE = 0.45;       // level per second
const WOBBLE_S = 0.7;         // squash after a pour lands
const FLOOR_Y = 446;

// Hero drawn in its own 220 x 320 units: tap on top, tank body below.
const HERO_W = 220, HERO_H = 320;
const TANK = { x: 20, y: 70, w: 180, h: 220 };
const SPOUT_X = 111;          // stream centre, hero units

export class LookKitShowcaseScene extends SimScene {
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static NOTE_STAGE = S_NOTE;
  static NOTE_STYLE = 'card';
  static NOTE_TITLE = 'NOTE';
  static ARIA_LABEL =
    'A glass tank with a friendly face stands on a bench in a sunny room, under a tap, with a flag marking a ' +
    'target line on its side. Pick an amount and pour: the water rises, and the tank cheers when the water stops ' +
    'at the line, looks worried when it goes past, and looks sad when it stops short.';

  static CONTROLS = [
    { type: 'select', id: 'amount', label: 'Amount:', options: Object.keys(AMOUNTS).map((k) => ({ value: k, label: AMOUNT_LABELS[k] })) },
    { type: 'button', id: 'pour', label: 'Pour' },
  ];

  constructor(container, config) {
    super(container, config);
    this.amount = 'little';
    this.level = 0;
    this.pour = null;        // { stage, amount, goal } token captured at launch
    this.landedAt = -1;
    this.verdict = null;
    this.log = [];
    this.drops = [];         // splash droplets
    this.ripples = [];
  }

  enter(stage) {
    this.level = stage === S_NOTE ? TARGET : 0;
    this.pour = null;
    this.landedAt = -1;
    this.verdict = null;
    this.drops = [];
    this.ripples = [];
    if (stage !== S_NOTE) this.log = [];
  }

  isControlHidden() { return this.stage !== S_POUR; }
  isControlDisabled() { return !!this.pour; }
  getControlValue(id) { return id === 'amount' ? this.amount : undefined; }

  onControlChange(id, value) {
    if (!this._guard(id)) return;
    if (id === 'amount' && AMOUNTS[value]) {
      this.amount = value;
    } else if (id === 'pour') {
      this.level = 0;
      this.verdict = null;
      this.landedAt = -1;
      this.pour = { stage: this.stage, amount: this.amount, goal: AMOUNTS[this.amount] };
    }
    this.requestUiUpdate?.();
  }

  busy() {
    return !!this.pour || this.drops.length > 0 || (this.landedAt >= 0 && this.clock - this.landedAt < WOBBLE_S);
  }

  update(d) {
    for (const p of this.drops) { p.vy += 900 * d; p.x += p.vx * d; p.y += p.vy * d; p.life += d; }
    this.drops = this.drops.filter((p) => p.life < 0.6);
    for (const r of this.ripples) r.life += d;
    this.ripples = this.ripples.filter((r) => r.life < 0.8);
    const run = this.pour;
    if (!run) return;
    this.level = Math.min(run.goal, this.level + FILL_RATE * d);
    this.splash(d);
    if (this.level < run.goal) return;
    // Credit the run to the token captured at launch, never to "now".
    this.pour = null;
    this.landedAt = this.clock;
    const miss = run.goal - TARGET;
    const v = Math.abs(miss) < 0.05 ? 'hit' : miss > 0 ? 'over' : 'under';
    this.log.push({ amount: run.amount, v });
    if (this.log.length > 4) this.log.shift();
    const hb = this.hero();
    const sx = hb.x + SPOUT_X * hb.s, sy = hb.y + (TANK.y + TANK.h * (1 - this.level)) * hb.s;
    const c = this.colors;
    if (v === 'hit') {
      this.celebrate(sx, sy - 10);
      this.floatText('+1 perfect!', sx, hb.y + 40, { bg: c.good, size: 18 });
    } else if (v === 'over') {
      this.oops(sx, sy);
    } else {
      this.shake(3);
    }
    this.after(0.45, () => { this.verdict = { v, at: this.age }; });
    this.requestUiUpdate?.();
  }

  // Droplets and ripples where the stream meets the water (design space).
  splash(d) {
    const hb = this.hero();
    const x = hb.x + SPOUT_X * hb.s;
    const y = hb.y + (TANK.y + TANK.h * (1 - this.level)) * hb.s;
    if (Math.random() < d * 40) {
      const dir = Math.random() < 0.5 ? -1 : 1;
      this.drops.push({ x: x + dir * 6, y, vx: dir * (40 + Math.random() * 110), vy: -140 - Math.random() * 160, life: 0, r: 2.5 + Math.random() * 3 });
    }
    if (Math.random() < d * 5) this.ripples.push({ x, y, life: 0 });
  }

  hero() { return heroBox(HERO_W, HERO_H, { pad: 4 }); }

  noteRows(c) {
    const dot = (col) => (g, x, y) => drawBadge(g, c, 'dot', x, y, 14, col);
    return [
      { icon: dot(c.water), text: 'a model tank, not a real one' },
      { icon: dot(c.s3), text: 'the target line is a choice', sub: 'any level could be the goal' },
      { icon: dot(c.s2), text: 'the pour speed is made up' },
    ];
  }

  mood() {
    if (this.pour) return 'think';
    const last = this.landedAt >= 0 ? this.log[this.log.length - 1] : null;
    if (!last) return 'smile';
    return { hit: 'happy', over: 'oops', under: 'sad' }[last.v];
  }

  // -- Drawing --------------------------------------------------------------------

  draw(ctx, c, t) {
    const hb = this.hero();
    this.drawRoom(ctx, c, t, hb);
    this.drawSprout(ctx, c, t);

    const benchY = hb.y + (TANK.y + TANK.h) * hb.s;
    drawBench(ctx, c, hb.x - 28, hb.x + hb.w + 28, benchY, { h: FLOOR_Y - benchY + 2 });
    this.drawHero(ctx, c, t, hb);
    this.drawSplash(ctx, c);
    drawVignette(ctx, c, 0.8);

    const intro = this.stage === S_MEET;
    const at = (k) => (intro ? 0.35 + k * 0.3 : -1);
    const icon = (fn) => (g, x, y, r) => { g.fillStyle = c.bgDeep; fn(g, x, y, r); };
    const boxes = chipRow(ctx, c, [
      { text: 'the tap', bg: c.s2, age: this.age, at: at(0), icon: icon((g, x, y, r) => { this.dropPath(g, x, y, r * 0.95); g.fill(); }) },
      { text: 'the tank', bg: c.s1, age: this.age, at: at(1), icon: icon((g, x, y, r) => { rr(g, x - r * 0.7, y - r * 0.75, r * 1.4, r * 1.5, r * 0.35); g.fill(); }) },
      { text: 'the target line', bg: c.s3, age: this.age, at: at(2), icon: icon((g, x, y, r) => { g.fillRect(x - r * 0.55, y - r * 0.85, r * 0.22, r * 1.7); g.beginPath(); g.moveTo(x - r * 0.4, y - r * 0.85); g.lineTo(x + r * 0.75, y - r * 0.45); g.lineTo(x - r * 0.4, y - r * 0.05); g.fill(); }) },
    ], ZONES.top.x + ZONES.top.w / 2, ZONES.top.y + 26, { align: 'center', gap: 12, size: 16 });

    // Leaders from the chips to the parts they name, once each chip is in.
    const la = (k) => Math.min(1, Math.max(0, (this.age - at(k) - 0.3) / 0.3));
    const tx = (u) => hb.x + u * hb.s, ty = (v) => hb.y + v * hb.s;
    const [tapBox, tankBox, lineBox] = boxes;
    leader(ctx, tapBox.x0 + tapBox.w / 2, tapBox.y0 + tapBox.h + 4, tx(78), ty(22), c.s2, la(0), t);
    leader(ctx, tankBox.x0 + tankBox.w / 2, tankBox.y0 + tankBox.h + 4, tx(TANK.x + 22), ty(TANK.y + 34), c.s1, la(1), t);
    const lineY = ty(TANK.y + TANK.h * (1 - TARGET));
    leader(ctx, lineBox.x0 + lineBox.w / 2, lineBox.y0 + lineBox.h + 4, tx(TANK.x + TANK.w + 14), lineY - 14, c.s3, la(2), t);

    if (this.stage === S_NOTE) return;
    drawReadout(ctx, c, ZONES.left.x, ZONES.left.y, ZONES.left.w, [
      { label: 'level', value: `${Math.round(this.level * 100)}%`, col: c.water, meter: this.level, target: TARGET },
      { label: 'target', value: `${Math.round(TARGET * 100)}%`, col: c.s3 },
    ], { title: 'tank', accent: c.s1 });
    if (this.log.length) {
      drawReadout(ctx, c, ZONES.right.x, ZONES.right.y, ZONES.right.w, this.log.map((e) => ({
        label: AMOUNT_LABELS[e.amount], value: { hit: 'yes', over: 'over', under: 'short' }[e.v],
        col: e.v === 'hit' ? c.good : c.bad, badge: e.v === 'hit' ? 'check' : 'cross',
      })), { title: 'pours', accent: c.s5 });
    }

    // The tank says its verdict; the bottom chip names it.
    const bx = ZONES.bottom.x + ZONES.bottom.w / 2, by = ZONES.bottom.y + 28;
    if (this.verdict) {
      const p = popAt(this.age, this.verdict.at);
      const say = { hit: 'just right!', over: 'too much!', under: 'more please!' }[this.verdict.v];
      const txt = { hit: 'right on the line', over: 'past the line', under: 'short of the line' }[this.verdict.v];
      const col = this.verdict.v === 'hit' ? c.good : c.bad;
      speechBubble(ctx, c, say, 568, 272, tx(TANK.x + TANK.w - 16), ty(TANK.y + 70),
        { scale: p?.scale ?? 1, alpha: p?.alpha ?? 1 });
      pill(ctx, c, txt, bx, by, { bg: col, size: 17, scale: p?.scale ?? 1, alpha: p?.alpha ?? 1, pop: p?.u,
        icon: (g, x, y, r) => drawBadge(g, c, this.verdict.v === 'hit' ? 'star' : 'cross', x, y, r * 0.95, lighten(col, 0.4)) });
    } else if (!this.pour) {
      const hint = intro ? 'meet the tank' : 'pick an amount, then Pour';
      pill(ctx, c, hint, bx, by, { bg: c.accent, size: 16, scale: 1 + 0.04 * Math.sin(t * 4) });
    }
  }

  drawRoom(ctx, c, t, hb) {
    drawBackdrop(ctx, c, 'dots', { t });
    drawDepth(ctx, c, { t, seed: 3, n: 6 });
    drawTwinkles(ctx, c, t, { x: 20, y: 70, w: 640, h: 200 }, { n: 8, seed: 9 });
    // Window in the free lower-left corner, sky and drifting clouds.
    const wx = 36, wy = 262, ww = 130, wh = 140;
    const sky = mix(c.bgDeep, c.s1, 0.3);
    const frame = darken(c.gold, 0.3);
    rr(ctx, wx - 8, wy - 8 + 5, ww + 16, wh + 16, [ww / 2 + 8, ww / 2 + 8, 12, 12]);
    ctx.fillStyle = darken(frame, 0.35);
    ctx.fill();
    rr(ctx, wx - 8, wy - 8, ww + 16, wh + 16, [ww / 2 + 8, ww / 2 + 8, 12, 12]);
    ctx.fillStyle = frame;
    ctx.fill();
    ctx.save();
    rr(ctx, wx, wy, ww, wh, [ww / 2, ww / 2, 6, 6]);
    ctx.clip();
    ctx.fillStyle = sky;
    ctx.fillRect(wx, wy, ww, wh);
    ctx.beginPath();
    ctx.arc(wx + 92, wy + 44, 18, 0, Math.PI * 2);
    ctx.fillStyle = c.warning;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(wx + 92, wy + 44, 26 + Math.sin(t * 2) * 2, 0, Math.PI * 2);
    ctx.fillStyle = alpha(c.warning, 0.25);
    ctx.fill();
    for (let i = 0; i < 3; i++) {
      const cx = wx + ((i * 70 + t * 9) % (ww + 80)) - 40, cy = wy + 50 + i * 26;
      const cloud = alpha(lighten(sky, 0.75), 0.9);
      for (const [dx, dy, r] of [[0, 0, 13], [14, -6, 16], [30, 0, 12]]) {
        ctx.beginPath();
        ctx.arc(cx + dx, cy + dy, r, 0, Math.PI * 2);
        ctx.fillStyle = cloud;
        ctx.fill();
      }
    }
    // Rolling hill at the bottom of the view.
    ctx.beginPath();
    ctx.moveTo(wx, wy + wh);
    ctx.quadraticCurveTo(wx + ww * 0.4, wy + wh - 44, wx + ww, wy + wh - 18);
    ctx.lineTo(wx + ww, wy + wh);
    ctx.closePath();
    ctx.fillStyle = mix(sky, c.s3, 0.6);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = frame;
    ctx.fillRect(wx + ww / 2 - 3, wy, 6, wh);
    ctx.fillRect(wx, wy + wh * 0.55, ww, 6);
    ctx.fillStyle = alpha(lighten(frame, 0.4), 0.6);
    ctx.fillRect(wx - 2, wy + wh + 2, ww + 4, 3);
    // Sunlight falls from the window across to the tank.
    drawSunbeam(ctx, c, wx + 10, wx + ww - 10, hb.x + 40, hb.x + hb.w + 30, wy, FLOOR_Y + 60, 1.1);
    drawMotes(ctx, c, t, { x: wx + 40, y: wy, w: hb.x + hb.w - wx - 60, h: FLOOR_Y - wy }, { n: 16 });
    drawFloor(ctx, c, FLOOR_Y);
    drawSpotlight(ctx, c, hb.cx, hb.cy + 30, 230, 1);
  }

  // A sprout in a pot, in the free lower-right corner, cheering the tank on.
  drawSprout(ctx, c, t) {
    const x = 590, base = FLOOR_Y + 2;
    const last = this.landedAt >= 0 ? this.log[this.log.length - 1] : null;
    const cheer = last?.v === 'hit' && this.clock - this.landedAt < 3;
    const hop = cheer ? Math.abs(Math.sin((this.clock - this.landedAt) * 9)) * 10 * Math.max(0, 1 - (this.clock - this.landedAt) / 3) : 0;
    const sway = Math.sin(t * 1.6) * 0.08;
    drawShadow(ctx, c, x, base, 46, 8);
    ctx.save();
    ctx.translate(x, base - hop);
    // Leaves.
    ctx.save();
    ctx.translate(0, -78);
    ctx.rotate(sway);
    const leaf = c.s3;
    ctx.strokeStyle = darken(leaf, 0.3);
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.quadraticCurveTo(4, -14, 0, -34);
    ctx.stroke();
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.translate(0, -26);
      ctx.rotate(s * (0.7 + Math.sin(t * 2.2 + s) * 0.08));
      ellipse(ctx, 0, -18 + 3, 12, 22);
      ctx.fillStyle = darken(leaf, 0.3);
      ctx.fill();
      ellipse(ctx, 0, -18, 12, 22);
      ctx.fillStyle = leaf;
      ctx.fill();
      ellipse(ctx, -3, -26, 3.5, 9, -0.2);
      ctx.fillStyle = alpha(lighten(leaf, 0.6), 0.7);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    // Pot with a face.
    const pot = c.s8;
    ctx.beginPath();
    ctx.moveTo(-42, -80 + 5); ctx.lineTo(42, -80 + 5); ctx.lineTo(32, 5); ctx.lineTo(-32, 5);
    ctx.closePath();
    ctx.fillStyle = darken(pot, 0.35);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-42, -80); ctx.lineTo(42, -80); ctx.lineTo(32, 0); ctx.lineTo(-32, 0);
    ctx.closePath();
    ctx.fillStyle = pot;
    ctx.fill();
    rr(ctx, -48, -92, 96, 20, 9);
    ctx.fillStyle = darken(pot, 0.12);
    ctx.fill();
    rr(ctx, -40, -89, 60, 5, 2.5);
    ctx.fillStyle = alpha(lighten(pot, 0.5), 0.7);
    ctx.fill();
    drawFace(ctx, 0, -42, 30, {
      col: pot, c, t: t + 1.3, look: { x: -1, y: -0.3 },
      mood: cheer ? 'happy' : last?.v === 'over' ? 'oops' : 'smile',
    });
    ctx.restore();
    if (cheer) sparkle(ctx, x + 40, base - 120 - hop, 9 * Math.abs(Math.sin(t * 5)), c.warning);
  }

  dropPath(g, x, y, r) {
    g.beginPath();
    g.moveTo(x, y - r);
    g.quadraticCurveTo(x + r * 0.9, y + r * 0.1, x, y + r * 0.85);
    g.quadraticCurveTo(x - r * 0.9, y + r * 0.1, x, y - r);
    g.closePath();
  }

  drawSplash(ctx, c) {
    for (const r of this.ripples) {
      const u = r.life / 0.8;
      ellipse(ctx, r.x, r.y, 10 + u * 50, 3 + u * 7);
      ctx.strokeStyle = alpha(lighten(c.water, 0.6), 1 - u);
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
    for (const p of this.drops) {
      this.dropPath(ctx, p.x, p.y, p.r * 1.6);
      ctx.fillStyle = alpha(lighten(c.water, 0.35), 1 - p.life / 0.6);
      ctx.fill();
    }
  }

  drawHero(ctx, c, t, hb) {
    const since = this.landedAt >= 0 ? this.clock - this.landedAt : WOBBLE_S;
    const sq = since < WOBBLE_S ? Math.sin((since / WOBBLE_S) * Math.PI * 3) * (1 - since / WOBBLE_S) * 0.07 : 0;
    const breathe = Math.sin(t * 2) * 0.01;
    const glassBody = mix(c.bgSurface, c.glass, 0.28);
    const rim = darken(c.glass, 0.2);
    const { x, y, w, h } = TANK;
    ctx.save();
    ctx.translate(hb.x, hb.y);
    ctx.scale(hb.s, hb.s);

    this.drawTap(ctx, c, t);

    // Squash and breathe about the tank's base.
    ctx.save();
    ctx.translate(HERO_W / 2, y + h);
    ctx.scale(1 + sq - breathe * 0.5, 1 - sq + breathe);
    ctx.translate(-HERO_W / 2, -(y + h));

    // Feet under the tank.
    for (const fx of [x + 38, x + w - 38]) {
      rr(ctx, fx - 20, y + h - 6, 40, 14, 7);
      ctx.fillStyle = darken(rim, 0.25);
      ctx.fill();
    }
    // Body: cushion, glass, water.
    rr(ctx, x, y + 7, w, h, 26);
    ctx.fillStyle = darken(glassBody, 0.4);
    ctx.fill();
    rr(ctx, x, y, w, h, 26);
    ctx.fillStyle = glassBody;
    ctx.fill();
    ctx.save();
    rr(ctx, x, y, w, h, 26);
    ctx.clip();
    // Back wall stripes read as depth through the glass.
    ctx.fillStyle = alpha(darken(glassBody, 0.2), 0.6);
    for (let i = 0; i < 4; i++) ctx.fillRect(x + 30 + i * 40, y, 14, h);
    const lh = h * this.level;
    const wy = y + h - lh;
    if (lh > 1) this.drawWater(ctx, c, t, wy);
    this.drawStream(ctx, c, t);
    // Pebbles on the floor of the tank.
    const rnd = mulberry32(21);
    const pebbleCols = [c.s5, c.s4, c.s2, c.s7];
    for (let i = 0; i < 11; i++) {
      const px = x + 12 + rnd() * (w - 24), pr = 6 + rnd() * 6;
      ellipse(ctx, px, y + h - 6, pr, pr * 0.7);
      ctx.fillStyle = mix(pebbleCols[i % 4], c.bgDeep, 0.25);
      ctx.fill();
      ellipse(ctx, px - pr * 0.3, y + h - 6 - pr * 0.3, pr * 0.3, pr * 0.18);
      ctx.fillStyle = alpha(lighten(pebbleCols[i % 4], 0.6), 0.6);
      ctx.fill();
    }
    ctx.restore();

    // Measuring ticks on the right wall.
    ctx.strokeStyle = alpha(rim, 0.9);
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 1; i < 10; i++) {
      const ly = y + h - (h * i) / 10;
      ctx.moveTo(x + w - 6, ly);
      ctx.lineTo(x + w - (i % 5 ? 16 : 26), ly);
    }
    ctx.stroke();

    // Glass front: highlights, glint, rim.
    rr(ctx, x + 14, y + 18, 13, h - 50, 6.5);
    ctx.fillStyle = alpha(lighten(c.glass, 0.7), 0.6);
    ctx.fill();
    rr(ctx, x + 32, y + 18, 6, 44, 3);
    ctx.fill();
    ellipse(ctx, x + 21, y + h - 20, 5, 5);
    ctx.fill();
    sparkle(ctx, x + w - 30, y + 26, 9 * (0.5 + 0.5 * Math.sin(t * 2.4)), alpha(lighten(c.glass, 0.85), 0.9));
    rr(ctx, x, y, w, h, 26);
    ctx.strokeStyle = rim;
    ctx.lineWidth = 4;
    ctx.stroke();
    rr(ctx, x - 6, y - 8, w + 12, 16, 8);
    ctx.fillStyle = darken(rim, 0.15);
    ctx.fill();
    rr(ctx, x + 4, y - 5, w - 30, 4, 2);
    ctx.fillStyle = alpha(lighten(rim, 0.6), 0.8);
    ctx.fill();

    this.drawTarget(ctx, c, t);

    // Face, on the glass or under the water, whichever it sits in.
    const fy = y + 58;
    const under = wy < fy - 10;
    drawFace(ctx, x + w / 2, fy, 70, {
      col: under ? c.water : glassBody, c, mood: this.mood(), t,
      look: this.pour ? { x: -0.1, y: -1 } : this.stage === S_MEET ? { x: Math.sin(t * 0.7) * 0.6, y: 0 } : undefined,
    });
    ctx.restore();
    ctx.restore();
  }

  drawWater(ctx, c, t, wy) {
    const { x, y, w, h } = TANK;
    const amp = this.pour ? 3.5 : 1.5;
    const surf = (i) => wy + Math.sin(t * 3 + i * 0.9) * amp;
    const band = (col, dy) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(x, surf(0) + dy);
      for (let i = 0; i <= 14; i++) ctx.lineTo(x + (w * i) / 14, surf(i) + dy);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x, y + h);
      ctx.closePath();
      ctx.fill();
    };
    band(lighten(c.water, 0.35), 0);          // lit surface skin
    band(c.water, 7);
    ctx.fillStyle = darken(c.water, 0.18);
    ctx.fillRect(x, y + h - 26, w, 26);
    // Caustic squiggles.
    ctx.strokeStyle = alpha(lighten(c.water, 0.55), 0.55);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const cy = wy + 22 + i * 26;
      if (cy > y + h - 30) break;
      const cx = x + 20 + ((i * 53 + t * 12) % (w - 50));
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.quadraticCurveTo(cx + 8, cy - 5, cx + 16, cy);
      ctx.quadraticCurveTo(cx + 24, cy + 5, cx + 32, cy);
      ctx.stroke();
    }
    // Bubbles rising from the pebbles.
    const rnd = mulberry32(7);
    for (let i = 0; i < 9; i++) {
      const bx = x + 20 + rnd() * (w - 40), sp = 30 + rnd() * 30, r = 3 + rnd() * 4, ph = rnd();
      const span = y + h - wy - 10;
      if (span < 20) break;
      const by = y + h - 10 - (((t * sp) / span + ph) % 1) * span;
      ctx.beginPath();
      ctx.arc(bx + Math.sin(t * 3 + i) * 3, by, r, 0, Math.PI * 2);
      ctx.strokeStyle = alpha(lighten(c.water, 0.7), 0.9);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(bx + Math.sin(t * 3 + i) * 3 - r * 0.35, by - r * 0.35, r * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = alpha(lighten(c.water, 0.9), 0.9);
      ctx.fill();
    }
    // A little fish once there is room to swim.
    if (this.level > 0.3) {
      const span = w - 70;
      const u = (Math.sin(t * 0.55) + 1) / 2;
      const dir = Math.cos(t * 0.55) >= 0 ? 1 : -1;
      const fx = x + 35 + u * span, fy = Math.max(wy + 30, y + h - 60) + Math.sin(t * 2) * 5;
      this.drawFish(ctx, c, fx, fy, dir, t);
    }
    // Stream into the water while pouring.
    if (this.pour) {
      const sx = SPOUT_X;
      ctx.fillStyle = alpha(lighten(c.water, 0.5), 0.8);
      ellipse(ctx, sx, wy + 2, 16 + Math.sin(t * 20) * 3, 4);
      ctx.fill();
    }
  }

  drawFish(ctx, c, x, y, dir, t) {
    const col = c.s8;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    const wag = Math.sin(t * 10) * 0.35;
    ctx.save();
    ctx.translate(-14, 0);
    ctx.rotate(wag);
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(-12, -9); ctx.quadraticCurveTo(-8, 0, -12, 9);
    ctx.closePath();
    ctx.fillStyle = darken(col, 0.15);
    ctx.fill();
    ctx.restore();
    ellipse(ctx, 0, 2, 17, 11);
    ctx.fillStyle = darken(col, 0.3);
    ctx.fill();
    ellipse(ctx, 0, 0, 17, 11);
    ctx.fillStyle = col;
    ctx.fill();
    ellipse(ctx, -2, -5, 8, 3);
    ctx.fillStyle = alpha(lighten(col, 0.6), 0.7);
    ctx.fill();
    ellipse(ctx, 8, -2, 4.5, 4.5);
    ctx.fillStyle = lighten(col, 0.95);
    ctx.fill();
    ellipse(ctx, 9, -1.5, 2.6, 2.6);
    ctx.fillStyle = darken(col, 0.8);
    ctx.fill();
    ellipse(ctx, 8.2, -2.6, 1, 1);
    ctx.fillStyle = lighten(col, 0.95);
    ctx.fill();
    ctx.restore();
  }

  drawTap(ctx, c, t) {
    const metal = mix(c.stroke, c.label, 0.25);
    const shade = darken(metal, 0.3);
    // Pipe in from the left with two bolts.
    rr(ctx, 0, 18, 120, 22, 11);
    ctx.fillStyle = shade;
    ctx.fill();
    rr(ctx, 0, 14, 120, 22, 11);
    ctx.fillStyle = metal;
    ctx.fill();
    rr(ctx, 10, 17, 96, 5, 2.5);
    ctx.fillStyle = alpha(lighten(metal, 0.6), 0.7);
    ctx.fill();
    for (const bx of [20, 56]) {
      ctx.beginPath();
      ctx.arc(bx, 25, 4, 0, Math.PI * 2);
      ctx.fillStyle = shade;
      ctx.fill();
    }
    // Spout.
    rr(ctx, SPOUT_X - 17, 22, 34, 42, 12);
    ctx.fillStyle = shade;
    ctx.fill();
    rr(ctx, SPOUT_X - 17, 18, 34, 42, 12);
    ctx.fillStyle = metal;
    ctx.fill();
    rr(ctx, SPOUT_X - 11, 22, 7, 30, 3.5);
    ctx.fillStyle = alpha(lighten(metal, 0.6), 0.7);
    ctx.fill();
    // Handle: a cross that spins while pouring.
    const spin = this.pour ? t * 8 : 0;
    ctx.save();
    ctx.translate(SPOUT_X, 6);
    rr(ctx, -4, 0, 8, 12, 3);
    ctx.fillStyle = shade;
    ctx.fill();
    ctx.scale(1, 0.4);
    for (let i = 0; i < 2; i++) {
      ctx.save();
      ctx.rotate(spin + (i * Math.PI) / 2);
      rr(ctx, -30, -5, 60, 10, 5);
      ctx.fillStyle = c.s6;
      ctx.fill();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fillStyle = lighten(c.s6, 0.25);
    ctx.fill();
    ctx.restore();
  }

  // Stream while pouring, a falling drip otherwise (drawn inside the glass).
  drawStream(ctx, c, t) {
    const wy = TANK.y + TANK.h * (1 - this.level);
    if (this.pour) {
      const top = 60;
      ctx.beginPath();
      ctx.moveTo(SPOUT_X - 8, top);
      for (let yy = top; yy <= wy; yy += 8) ctx.lineTo(SPOUT_X - 7 + Math.sin(t * 22 + yy * 0.15) * 1.6, yy);
      for (let yy = wy; yy >= top; yy -= 8) ctx.lineTo(SPOUT_X + 7 + Math.sin(t * 22 + yy * 0.15) * 1.6, yy);
      ctx.closePath();
      ctx.fillStyle = c.water;
      ctx.fill();
      rr(ctx, SPOUT_X - 3, top, 3, wy - top, 1.5);
      ctx.fillStyle = alpha(lighten(c.water, 0.6), 0.8);
      ctx.fill();
    } else {
      const u = (t * 0.6) % 1;
      this.dropPath(ctx, SPOUT_X, 70 + u * u * 70, 5 * Math.min(1, u * 4));
      ctx.fillStyle = alpha(c.water, 1 - u);
      ctx.fill();
    }
  }


  drawTarget(ctx, c, t) {
    const { x, y, w, h } = TANK;
    const ly = y + h * (1 - TARGET);
    const hit = this.log[this.log.length - 1]?.v === 'hit' && this.landedAt >= 0;
    ctx.save();
    ctx.setLineDash([10, 7]);
    ctx.lineDashOffset = -t * 10;
    ctx.strokeStyle = darken(c.s3, 0.35);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + 6, ly + 2);
    ctx.lineTo(x + w + 8, ly + 2);
    ctx.stroke();
    ctx.strokeStyle = c.s3;
    ctx.beginPath();
    ctx.moveTo(x + 6, ly);
    ctx.lineTo(x + w + 8, ly);
    ctx.stroke();
    ctx.restore();
    // Pole and a waving flag.
    const px = x + w + 10;
    rr(ctx, px - 2, ly - 44, 5, 48, 2.5);
    ctx.fillStyle = darken(c.s3, 0.35);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(px + 2, ly - 44);
    for (let i = 0; i <= 6; i++) ctx.lineTo(px + 2 + i * 5, ly - 44 + Math.sin(t * 5 - i * 0.8) * 2.5 * (i / 6));
    for (let i = 6; i >= 0; i--) ctx.lineTo(px + 2 + i * 5, ly - 24 + Math.sin(t * 5 - i * 0.8) * 2.5 * (i / 6) - (6 - i) * 0);
    ctx.closePath();
    ctx.fillStyle = hit ? c.warning : c.s3;
    ctx.fill();
    if (hit) {
      star(ctx, px + 17, ly - 34, 6.5, 5, 0.5);
      ctx.fillStyle = c.bgDeep;
      ctx.fill();
      sparkle(ctx, px + 42, ly - 50, 8 * Math.abs(Math.sin(t * 4)), c.warning);
    }
    ctx.beginPath();
    ctx.arc(px + 0.5, ly - 46, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = c.warning;
    ctx.fill();
  }
}
