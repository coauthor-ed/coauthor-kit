/** SimAnimShowcaseScene.js
 * SimAnimShowcaseScene - 4-beat showcase for SimAnim motion primitives:
 *   Beat 0: Eases compared across five full-width racing lanes
 *   Beat 1: Retargetable springTrack ball vs. monotonic settle readout
 *   Beat 2: Cue-sheet 4-bar chart with lagged bars, pop badge and celebrate
 *   Beat 3: Additive bulb bursts and reduced-motion indicator chip
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
  ZONES,
  W,
} from 'simulations/base/kit/SimLook.js';
import {
  ease,
  spring,
  springDuration,
  springTrack,
  settle,
  burst,
  pop,
  TIMING,
  lagged,
  laggedTotal,
  cues,
  reducedMotion,
  dur,
} from 'simulations/base/kit/SimAnim.js';

const LANE_DUR = 1.2;
const LANE_TOTAL = Math.max(LANE_DUR, springDuration('snappy'), springDuration('playful'));
const SETTLE_DUR = 0.45;
const BURST_RISE = 0.08;
const BURST_FALL = 0.4;
const BURST_LIFE = BURST_RISE + BURST_FALL;

const BARS = [
  { label: 'Class 9', value: 58, frac: 0.58, key: 's1' },
  { label: 'Class 10', value: 74, frac: 0.74, key: 's2' },
  { label: 'Class 11', value: 92, frac: 0.92, key: 's3' },
  { label: 'Class 12', value: 81, frac: 0.81, key: 's4' },
];
const TALLEST_IDX = 2;

export class SimAnimShowcaseScene extends SimScene {
  static BEAT_STEP_MAP = [
    [{ idx: 0, dwellMs: null }],
    [{ idx: 1, dwellMs: null }],
    [{ idx: 2, dwellMs: null }],
    [{ idx: 3, dwellMs: null }],
  ];

  static ARIA_LABEL = 'Four motion demos: easing lanes, retargetable spring versus settle readout, a cue-sheet bar chart, and additive bulb bursts.';

  static CONTROLS = [{ type: 'button', id: 'replay', label: 'Replay' }];

  constructor(container, config) {
    super(container, config);
    this.t0 = 0;
    this.ballTrack = springTrack(140, 'playful');
    this.readoutFrom = 140;
    this.readoutTo = 140;
    this.readoutT0 = 0;
    this.chartCues = buildChartCues();
    this.didCelebrate = false;
    this.cancelCelebrate = null;
    this.bulbBursts = [];
  }

  enter(stage) {
    this.t0 = 0;
    resetStage(this, stage);
  }

  onControlChange(id) {
    if (!this._guard(id)) return;
    if (id === 'replay') {
      this.t0 = this.age;
      resetStage(this, this.stage);
    }
    this.requestUiUpdate?.();
  }

  pointerDown(p) {
    const t = this.age - this.t0;
    if (this.stage === 0) {
      if (t < dur(LANE_TOTAL)) {
        this.t0 = this.age - LANE_TOTAL - 0.01;
      }
      return;
    }

    if (this.stage === 1) {
      const heroLeft = ZONES.left.x + 36;
      const heroRight = ZONES.hero.x + ZONES.hero.w - 36;
      const targetX = Math.max(heroLeft, Math.min(heroRight, p.x));
      this.readoutFrom = currentReadout(this, t);
      this.readoutTo = Math.round(targetX);
      this.readoutT0 = t;
      this.ballTrack.to(targetX, t);
      return;
    }

    if (this.stage === 2) {
      if (!this.chartCues.done(t)) {
        this.t0 = this.age - this.chartCues.end - 0.01;
        if (this.cancelCelebrate) {
          this.cancelCelebrate();
          this.cancelCelebrate = null;
        }
        fireChartCelebrate(this);
      }
      return;
    }

    if (this.stage === 3) {
      this.bulbBursts.push(t);
    }
  }

  update() {
    if (this.stage === 3) {
      const t = this.age - this.t0;
      this.bulbBursts = this.bulbBursts.filter((b0) => t - b0 < BURST_LIFE);
    }
  }

  busy() {
    const t = this.age - this.t0;
    if (this.stage === 0) {
      return t < dur(LANE_TOTAL);
    }
    if (this.stage === 1) {
      return !this.ballTrack.settled(t) || t < this.readoutT0 + dur(SETTLE_DUR);
    }
    if (this.stage === 2) {
      return !this.chartCues.done(t);
    }
    if (this.stage === 3) {
      if (reducedMotion()) return false;
      return this.bulbBursts.some((b0) => t - b0 >= 0 && t - b0 < BURST_LIFE);
    }
    return false;
  }

  draw(ctx, c) {
    drawBackdrop(ctx, c, 'dots');
    const t = this.age - this.t0;
    if (this.stage === 0) drawBeat0(this, ctx, c, t);
    else if (this.stage === 1) drawBeat1(this, ctx, c, t);
    else if (this.stage === 2) drawBeat2(this, ctx, c, t);
    else drawBeat3(this, ctx, c, t);
  }
}

// -- Module helpers -----------------------------------------------------------

function buildChartCues() {
  const barsDur = laggedTotal(BARS.length, { dur: TIMING.enter, lag: 0.1 });
  return cues()
    .at(0, 'axes', 0.4, ease.smooth)
    .then('bars', barsDur, ease.linear)
    .then('badge', TIMING.pop, ease.linear);
}

function tallestBarAnchor() {
  const chartX = ZONES.hero.x - 40;
  const chartW = ZONES.hero.w + 80;
  const baseY = ZONES.hero.y + ZONES.hero.h - 46;
  const maxH = ZONES.hero.h - 110;
  const slotW = chartW / BARS.length;
  const x = chartX + (TALLEST_IDX + 0.5) * slotW;
  const y = baseY - BARS[TALLEST_IDX].frac * maxH;
  return { x, y };
}

function fireChartCelebrate(scene) {
  if (scene.didCelebrate) return;
  scene.didCelebrate = true;
  const anchor = tallestBarAnchor();
  scene.celebrate(anchor.x, anchor.y, 28);
}

function resetStage(scene, stage) {
  if (scene.cancelCelebrate) {
    scene.cancelCelebrate();
    scene.cancelCelebrate = null;
  }
  scene.didCelebrate = false;
  // Every beat starts from the same state, whichever beat came before.
  scene.ballTrack = springTrack(140, 'playful');
  scene.readoutFrom = 140;
  scene.readoutTo = 140;
  scene.readoutT0 = 0;
  scene.bulbBursts = [];

  if (stage === 1) {
    scene.ballTrack.to(340, 0);
    scene.readoutTo = 340;
  } else if (stage === 2) {
    scene.chartCues = buildChartCues();
    const runStage = scene.stage;
    const runT0 = scene.t0;
    scene.cancelCelebrate = scene.after(dur(scene.chartCues.end), () => {
      if (scene.stage !== runStage || scene.t0 !== runT0) return;
      fireChartCelebrate(scene);
    });
  } else if (stage === 3) {
    scene.bulbBursts = [0];
  }
}

function currentReadout(scene, t) {
  const u = settle(t - scene.readoutT0, SETTLE_DUR);
  return Math.round(scene.readoutFrom + (scene.readoutTo - scene.readoutFrom) * u);
}

function drawBeat0(scene, ctx, c, t) {
  const fullHero = {
    x: ZONES.left.x,
    y: ZONES.hero.y,
    w: W - ZONES.left.x * 2,
    h: ZONES.hero.h,
  };
  pill(ctx, c, 'Eases compared (tap to skip)', W / 2, ZONES.top.y + 28, {
    bg: c.bgSurface,
    size: 16,
    display: true,
  });

  drawCard(ctx, c, fullHero.x, fullHero.y, fullHero.w, fullHero.h);

  const lanes = [
    { name: 'linear', col: c.s1, p: reducedMotion() ? 1 : ease.linear(t / LANE_DUR) },
    { name: 'smooth', col: c.s2, p: reducedMotion() ? 1 : ease.smooth(t / LANE_DUR) },
    { name: 'k75', col: c.s3, p: reducedMotion() ? 1 : ease.k75(t / LANE_DUR) },
    { name: 'spring snappy', col: c.s4, p: spring(t, 'snappy') },
    { name: 'spring playful', col: c.s5, p: spring(t, 'playful') },
  ];

  const trackX0 = fullHero.x + 190;
  const trackX1 = fullHero.x + fullHero.w - 54;
  const span = trackX1 - trackX0;
  const rowH = fullHero.h / lanes.length;

  for (let i = 0; i < lanes.length; i++) {
    const lane = lanes[i];
    const cy = fullHero.y + (i + 0.5) * rowH;

    pill(ctx, c, lane.name, fullHero.x + 92, cy, {
      bg: lane.col,
      size: 15,
    });

    ctx.fillStyle = darken(c.bgDeep, 0.15);
    rr(ctx, trackX0, cy - 5, span, 10, 5);
    ctx.fill();

    const rx = trackX0 + lane.p * span;
    drawShadow(ctx, c, rx, cy + 18, 26, 5);
    pill(ctx, c, 'Go', rx, cy, {
      bg: lane.col,
      size: 15,
      display: true,
    });
  }
}

function drawBeat1(scene, ctx, c, t) {
  pill(ctx, c, 'Tap hero zone to retarget ball; right card uses settle', W / 2, ZONES.top.y + 28, {
    bg: c.bgSurface,
    size: 16,
    display: true,
  });

  const stageBox = {
    x: ZONES.left.x,
    y: ZONES.hero.y,
    w: ZONES.hero.x + ZONES.hero.w - ZONES.left.x,
    h: ZONES.hero.h,
  };
  drawCard(ctx, c, stageBox.x, stageBox.y, stageBox.w, stageBox.h);

  const floorY = stageBox.y + stageBox.h - 70;
  ctx.fillStyle = c.stroke;
  rr(ctx, stageBox.x + 24, floorY + 28, stageBox.w - 48, 6, 3);
  ctx.fill();

  const targetX = scene.ballTrack.target;
  ctx.fillStyle = alpha(c.warning, 0.35);
  rr(ctx, targetX - 3, stageBox.y + 50, 6, floorY - stageBox.y - 22, 3);
  ctx.fill();
  pill(ctx, c, 'target ' + Math.round(targetX), targetX, stageBox.y + 38, {
    bg: c.warning,
    size: 15,
  });

  const bx = scene.ballTrack.at(t);
  const by = floorY;
  const r = 28;

  drawShadow(ctx, c, bx, by + r + 2, 32, 7);

  ctx.fillStyle = c.accent;
  ellipse(ctx, bx, by, r, r);
  ctx.fill();

  ctx.fillStyle = darken(c.accent, 0.25);
  ellipse(ctx, bx, by + 6, r * 0.86, r * 0.72);
  ctx.fill();

  ctx.fillStyle = c.accent;
  ellipse(ctx, bx, by - 2, r * 0.88, r * 0.82);
  ctx.fill();

  ctx.fillStyle = lighten(c.accent, 0.38);
  ellipse(ctx, bx - 9, by - 10, 8, 5);
  ctx.fill();

  const right = ZONES.right;
  drawCard(ctx, c, right.x, right.y, right.w, right.h);

  ctx.fillStyle = c.label;
  ctx.font = font(c, 700, 16, true);
  ctx.textAlign = 'center';
  ctx.fillText('Ball X (settle)', right.x + right.w / 2, right.y + 64);

  const settledX = currentReadout(scene, t);
  pill(ctx, c, String(settledX) + ' px', right.x + right.w / 2, right.y + 135, {
    bg: c.good,
    size: 18,
    display: true,
  });

  ctx.fillStyle = c.labelMuted;
  ctx.font = font(c, 600, 15, false);
  ctx.fillText('No overshoot', right.x + right.w / 2, right.y + 210);
  ctx.fillText('Spring: ' + Math.round(bx) + ' px', right.x + right.w / 2, right.y + 245);
}

function drawBeat2(scene, ctx, c, t) {
  pill(ctx, c, 'Cue sheet build: axes -> lagged bars -> pop badge', W / 2, ZONES.top.y + 28, {
    bg: c.bgSurface,
    size: 16,
    display: true,
  });

  const box = {
    x: ZONES.hero.x - 70,
    y: ZONES.hero.y,
    w: ZONES.hero.w + 140,
    h: ZONES.hero.h,
  };
  drawCard(ctx, c, box.x, box.y, box.w, box.h);

  const chartX = ZONES.hero.x - 40;
  const chartW = ZONES.hero.w + 80;
  const baseY = ZONES.hero.y + ZONES.hero.h - 46;
  const maxH = ZONES.hero.h - 110;

  const pAxes = scene.chartCues.p('axes', t);
  ctx.fillStyle = c.stroke;
  rr(ctx, chartX, baseY - maxH * pAxes, 5, maxH * pAxes, 2);
  ctx.fill();
  rr(ctx, chartX, baseY, chartW * pAxes, 5, 2);
  ctx.fill();

  const tBars = t - scene.chartCues.start('bars');
  const slotW = chartW / BARS.length;
  const barW = 48;

  for (let i = 0; i < BARS.length; i++) {
    const bar = BARS[i];
    const pBar = lagged(tBars, i, BARS.length, { dur: TIMING.enter, lag: 0.1, ease: ease.smooth });
    const cx = chartX + (i + 0.5) * slotW;
    const bh = bar.frac * maxH * pBar;
    const bx = cx - barW / 2;
    const by = baseY - bh;
    const col = c[bar.key];

    drawShadow(ctx, c, cx, baseY + 6, barW * 0.55, 5);

    if (bh > 2) {
      ctx.fillStyle = col;
      rr(ctx, bx, by, barW, bh, 8);
      ctx.fill();

      ctx.fillStyle = lighten(col, 0.28);
      rr(ctx, bx + 4, by + 3, barW - 8, Math.min(10, bh * 0.35), 4);
      ctx.fill();
    }

    ctx.fillStyle = c.label;
    ctx.font = font(c, 600, 15, false);
    ctx.textAlign = 'center';
    ctx.fillText(bar.label, cx, baseY + 26);
  }

  const badgeAge = reducedMotion() ? TIMING.pop : t - scene.chartCues.start('badge');
  const badgePop = pop(badgeAge);
  if (badgePop) {
    const anchor = tallestBarAnchor();
    pill(ctx, c, BARS[TALLEST_IDX].value + '%', anchor.x, anchor.y - 22, {
      bg: c.warning,
      size: 16,
      display: true,
      scale: badgePop.scale,
      alpha: badgePop.alpha,
    });
  }
}

function drawBeat3(scene, ctx, c, t) {
  pill(ctx, c, 'Tap anywhere to add a bulb burst', W / 2, ZONES.top.y + 28, {
    bg: c.bgSurface,
    size: 16,
    display: true,
  });

  const box = ZONES.hero;
  drawCard(ctx, c, box.x, box.y, box.w, box.h);

  let sumBursts = 0;
  for (let i = 0; i < scene.bulbBursts.length; i++) {
    sumBursts += burst(t - scene.bulbBursts[i], BURST_RISE, BURST_FALL);
  }
  const bulbScale = Math.min(1.6, 1 + sumBursts * 0.35);
  const ringRadius = 64 * bulbScale + sumBursts * 26;

  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2 - 14;
  const baseY = cy + 92;

  drawShadow(ctx, c, cx, baseY + 14, 46, 9);

  ctx.fillStyle = alpha(c.warning, Math.min(0.45, 0.12 + sumBursts * 0.22));
  ellipse(ctx, cx, cy, ringRadius, ringRadius);
  ctx.fill();

  ctx.strokeStyle = alpha(c.warning, Math.min(0.85, 0.25 + sumBursts * 0.35));
  ctx.lineWidth = 4;
  ellipse(ctx, cx, cy, ringRadius, ringRadius);
  ctx.stroke();

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(bulbScale, bulbScale);

  ctx.fillStyle = darken(c.stroke, 0.2);
  rr(ctx, -22, 46, 44, 28, 7);
  ctx.fill();

  ctx.fillStyle = c.stroke;
  rr(ctx, -18, 52, 36, 8, 4);
  ctx.fill();

  const bulbCol = mix(c.s2, c.warning, Math.min(1, sumBursts * 0.6));
  ctx.fillStyle = bulbCol;
  rr(ctx, -28, 16, 56, 36, 12);
  ctx.fill();
  ellipse(ctx, 0, -6, 50, 50);
  ctx.fill();

  ctx.fillStyle = darken(bulbCol, 0.2);
  ellipse(ctx, 0, 6, 42, 36);
  ctx.fill();

  ctx.fillStyle = bulbCol;
  ellipse(ctx, 0, -8, 44, 42);
  ctx.fill();

  ctx.fillStyle = lighten(bulbCol, 0.42);
  ellipse(ctx, -16, -22, 13, 8);
  ctx.fill();

  ctx.restore();

  const rmStatus = 'Reduced motion: ' + (reducedMotion() ? 'on' : 'off');
  pill(ctx, c, rmStatus, W / 2, ZONES.bottom.y + 24, {
    bg: c.bgSurface,
    size: 15,
  });
}
