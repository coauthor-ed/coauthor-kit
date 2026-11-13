/**
 * KIT EXAMPLE - the "cosmic" art pass, on a scene this kit already has a plain
 * version of (`TriangleHalfParallelogramScene.js`, 566 lines).
 *
 * Copy the SMALL one to learn the beat/step mechanism. Copy from this one for
 * the look: starfield, constellation, shooting stars, confetti, camera push,
 * two-tone lit shapes, and an intro sequence driven by a time envelope rather
 * than by beats.
 *
 * Quill is deliberately NOT in here. He was a ~250-line canvas Path2D port of
 * the SVG rig, and the two supported ways to show him remove the reason to
 * draw him into a canvas at all: Tier 1 puts him in the mini-game plugin's own
 * chrome (works with any scene, canvas or DOM, unchanged), Tier 2 puts him
 * inside the scene via `SimMascotDom`, which needs a `DomSimulation`. Do not
 * convert a `CanvasSimulation` to hybrid just to host a mascot. See
 * `docs/mini-games.md`.
 *
 * Colours come from the closed palette only. The original draft of this file
 * used `--sim-tri-bg`, `--sim-tri-shape` and three more like them; none is
 * declared in `sim-theme.css`, so each resolved to nothing and painted its
 * fallback hex identically in light and dark. Do not copy that habit - see
 * `docs/simulation-authoring.md` section 4.5.
 */

import { CanvasSimulation } from 'simulations/base/CanvasSimulation.js';
import { SimDraw } from 'simulations/base/SimDrawUtils.js';
import { SimEase, clamp01, cruise, smooth } from 'simulations/base/SimMotion.js';
import { readSimColors } from 'simulations/base/SimTheme.js';

/**
 * TriangleHalfParallelogramScene - companion to blk-l04-s05, the proof that
 * Area of a triangle = ½ · base · height. Duplicates a triangle, rotates the
 * copy 180° about the midpoint M of side AC, lands it flush into a
 * parallelogram of the SAME base and height - the copy is NEVER removed once
 * shown (every step from flip onward draws copyAt(π)).
 *
 * v3 fixes vs v2:
 *   1. CRITICAL: squash-and-stretch deviation defaulted to 1 instead of 0,
 *      collapsing the copy under scale(2, 0) - this is why the duplicated
 *      triangle appeared missing/faint. Default now 0.
 *   2. Celebration clocks were advanced via an unset `_lastDt` (always 0).
 *      They now advance in _tick() on honest dt, and the landing watch runs
 *      there too instead of mutating state inside the draw pass.
 *   3. Congruence tick pair corrected: BC's true image under the reflection
 *      is B′-A (== segment cp.C->cp.B), not cp.A->cp.B.
 *   4. Shine-sweep clip used a wrongly-ordered vertex walk; now the proper
 *      parallelogram hull B-A-B′-C.
 *
 */

const W = 900;
const H = 600;

const BASE_PX = 280;
const HEIGHT_PX = 180;
const GROUND_Y = 430;
const TOP_Y = GROUND_Y - HEIGHT_PX;
const AX = 260;

const APEX_MIN = 40;
const APEX_MAX = 240;
const APEX_DEFAULT = 110;
const APEX_STEP = 10;

const BASE_UNITS = 6;
const HEIGHT_UNITS = 4;
const AREA_UNITS = 0.5 * BASE_UNITS * HEIGHT_UNITS;

const FLIP_DURATION = 2.2;
const HEIGHT_DROP_DURATION = 0.5;
const LAND_FX_DURATION = 0.65;
const LAND_SQUASH_DURATION = 0.32;
const INTRO_TIME = 5.3;

const FONT_ROUND = "'Nunito','Baloo 2','Varela Round',Inter,'Segoe UI',system-ui,sans-serif";
const font = (weight, px) => `${weight} ${px}px ${FONT_ROUND}`;

const COLOR_TOKEN_MAP = {
  bgDeep:  ['--sim-bg-deep',    '#151036'],
  panelBg: ['--sim-bg-surface', '#251d55'],
  label:   ['--sim-label',      '#f3f0ff'],
  shape:   ['--sim-series-1',   '#4ac8ff'],
  wedge:   ['--sim-series-2',   '#ffb84d'],
  height:  ['--sim-series-3',   '#5be49b'],
  accent:  ['--sim-series-4',   '#ff6fa5'],
};

const STEPS = [
  { type: 'showTriangle', caption: 'Here\'s a triangle ABC with base b and height h.' },
  { type: 'flipJoin', caption: 'Make a copy, flip it upside down about the midpoint of side AC, and slide it into place.' },
  { type: 'parallelogramFormed', caption: 'The two congruent triangles fit together to form a parallelogram with base b and height h.' },
  { type: 'congruentHalves', caption: 'Because the two triangles are congruent, they have equal area.' },
  { type: 'formula', caption: 'So the area of the triangle is exactly half the parallelogram\'s.' },
  { type: 'freeplay', caption: 'Drag to reshape the triangle, then flip and join to see the halving always holds.' },
];

const STEP_SHOW = 0;
const STEP_FLIP = 1;
const STEP_PARALLELOGRAM = 2;
const STEP_CONGRUENT = 3;
const STEP_FORMULA = 4;
const STEP_FREEPLAY = 5;

const BEAT_STEP_MAP = [
  [{ idx: STEP_SHOW, dwellMs: 900 }, { idx: STEP_FLIP, dwellMs: null }],
  [{ idx: STEP_PARALLELOGRAM, dwellMs: null }],
  [{ idx: STEP_CONGRUENT, dwellMs: null }],
  [{ idx: STEP_FORMULA, dwellMs: null }],
];

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STARS = (() => {
  const rnd = mulberry32(20260827);
  const stars = [];
  for (let i = 0; i < 84; i++) {
    stars.push({
      x: rnd() * W,
      y: rnd() * (GROUND_Y - 12),
      r: 0.8 + rnd() * 1.5,
      a: 0.10 + rnd() * 0.34,
      ph: rnd() * Math.PI * 2,
      sp: 0.5 + rnd() * 1.7,
      spd: rnd() < 0.3 ? 2 + rnd() * 4 : 0,
      sparkle: rnd() < 0.1,
    });
  }
  return stars;
})();

const CONSTELLATION = [[668, 152], [764, 82], [862, 140], [758, 190]];
const SHOOTERS = [
  { period: 9.5, start: 2.6, dur: 0.85, x0: 150, y0: 36, dx: 430, dy: 168 },
  { period: 14,  start: 8.0, dur: 0.75, x0: 820, y0: 20, dx: -320, dy: 140 },
];

const CONFETTI_N = 16;
const CONFETTI_ANG = Array.from({ length: CONFETTI_N }, (_, i) =>
  -Math.PI * (0.80 - (i / (CONFETTI_N - 1)) * 0.58));
const CONFETTI_SPD = Array.from({ length: CONFETTI_N }, (_, i) => 190 + ((i * 73) % 131));
const CONFETTI_JIT = Array.from({ length: CONFETTI_N }, (_, i) => (((i * 37) % 17) - 8) / 20);
const CONFETTI_COLORS_AT = (i, c) => [c.wedge, c.shape, c.height, c.label][i % 4];

// Densified ghost trail: trailing echoes fanned OUTWARD from pivot M so the
// smear reads as radial motion energy; alpha and weight decay together.
const GHOSTS = [
  { d: 0.18, a: 0.32, w: 3.5, k: 1.000 },
  { d: 0.36, a: 0.20, w: 3.0, k: 1.030 },
  { d: 0.56, a: 0.12, w: 2.6, k: 1.062 },
  { d: 0.78, a: 0.06, w: 2.2, k: 1.096 },
];
const COMET_DOTS = 7;
const SPEED_ANGLES = Array.from({ length: 10 }, (_, i) => (i / 10) * Math.PI * 2 + 0.31);

function verts(apex) {
  return {
    A: { x: AX, y: GROUND_Y },
    B: { x: AX + BASE_PX, y: GROUND_Y },
    C: { x: AX + apex, y: TOP_Y },
  };
}

function rotateAround(p, m, theta) {
  const dx = p.x - m.x, dy = p.y - m.y;
  const cos = Math.cos(theta), sin = Math.sin(theta);
  return { x: m.x + dx * cos - dy * sin, y: m.y + dx * sin + dy * cos };
}

function copyAt(apex, theta) {
  const { A, B, C } = verts(apex);
  const M = { x: (A.x + C.x) / 2, y: (A.y + C.y) / 2 };
  return { A: rotateAround(A, M, theta), B: rotateAround(B, M, theta), C: rotateAround(C, M, theta) };
}

function expandFrom(m, p, k) {
  return { x: m.x + (p.x - m.x) * k, y: m.y + (p.y - m.y) * k };
}

function fmt(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function rgba(col, a) {
  if (typeof col !== 'string') return col;
  let m = /^#([0-9a-f]{6})$/i.exec(col);
  if (m) return `rgba(${parseInt(m[1].slice(0, 2), 16)},${parseInt(m[1].slice(2, 4), 16)},${parseInt(m[1].slice(4, 6), 16)},${a})`;
  m = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(col);
  if (m) return `rgba(${parseInt(m[1] + m[1], 16)},${parseInt(m[2] + m[2], 16)},${parseInt(m[3] + m[3], 16)},${a})`;
  m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(col);
  if (m) return `rgba(${m[1]},${m[2]},${m[3]},${a})`;
  return col;
}

function outBack(t, s = 1.70158) {
  const u = clamp01(t);
  if (u <= 0) return 0;
  const c3 = s + 1;
  const x = u - 1;
  return 1 + c3 * x * x * x + s * x * x;
}

function smoothWin(a, b, t) {
  const u = (t - a) / (b - a);
  return u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u);
}

function rrPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  try { ctx.roundRect(x, y, w, h, r); }
  catch { ctx.rect(x, y, w, h); }
}

export class TriangleHalfParallelogramScene extends CanvasSimulation {
  static WIDTH = W;
  static HEIGHT = H;
  static ARIA_LABEL =
    'Triangle is half a parallelogram. A triangle with a labelled base and height is duplicated, ' +
    'the copy rotated a hundred and eighty degrees about the midpoint of one side, and slid into ' +
    'place to form a parallelogram of the same base and height, showing the triangle is exactly ' +
    'half its area, then hands off to free play where reshaping the triangle and replaying the flip ' +
    'keeps the halving true.';

  static CONTROLS = [
    { type: 'button', id: 'prev', label: '<- Back' },
    { type: 'button', id: 'next', label: 'Next ->' },
    {
      type: 'slider',
      id: 'apex',
      label: 'Apex position:',
      min: APEX_MIN,
      max: APEX_MAX,
      step: APEX_STEP,
      value: APEX_DEFAULT,
      suffix: '',
    },
    { type: 'button', id: 'flip', label: 'Flip & Join ->' },
  ];

  constructor(container, config) {
    super(container, config);
    this.allowResume = true;
    this.colors = null;

    this.stepIndex = 0;
    this._stepEnterTime = 0;

    this.apex = APEX_DEFAULT;
    this._freeplayFlipped = false;
    this._freeplayElapsed = 0;

    this._clock = 0;
    this._introAge = 0;
    this._landFx = null;
    this._landArm = true;
    this._squash = null;
    this._confetti = [];

    this._capKey = '';
    this._capBorn = -99;
    this._panKey = '';
    this._panBorn = -99;

    // Decorative cold open (incl. mascot performance) is skipped outright for
    // reduce-motion users; the scene opens on its settled teaching pose.
    try {
      if (typeof matchMedia === 'function' &&
          matchMedia('(prefers-reduced-motion: reduce)').matches) {
        //this._introAge = INTRO_TIME;
      }
    } catch { /* keep the show */ }

    this._lessonLinked = false;
    this._beatChain = null;
    this._beatChainPos = 0;
    this._beatChainDwell = null;

    this._liveRegion = null;
    this._touchStartX = null;
    this._touchStartY = null;
    this._onKeyDown = this._handleKeyDown.bind(this);
    this._onTouchStart = this._handleTouchStart.bind(this);
    this._onTouchEnd = this._handleTouchEnd.bind(this);
  }

  async setup() {
    await super.setup();
    this._canvas.setAttribute('role', 'img');
    this._canvas.setAttribute('aria-label', this.constructor.ARIA_LABEL);
    this._canvas.tabIndex = 0;
    this._canvas.addEventListener('keydown', this._onKeyDown);
    this._canvas.addEventListener('touchstart', this._onTouchStart, { passive: true });
    this._canvas.addEventListener('touchend', this._onTouchEnd, { passive: true });

    this._reloadColors();
    this._buildLiveRegion();
    this._drawInitialFrame(this._ctx);
    this._announce('Triangle is half a parallelogram. Here\'s a triangle ABC with base b and height h.');
  }

  destroy() {
    if (this._canvas) {
      this._canvas.removeEventListener('keydown', this._onKeyDown);
      this._canvas.removeEventListener('touchstart', this._onTouchStart);
      this._canvas.removeEventListener('touchend', this._onTouchEnd);
    }
    if (this._liveRegion) {
      this._liveRegion.remove();
      this._liveRegion = null;
    }
    super.destroy();
  }

  _reloadColors() {
    this.colors = readSimColors(this.container, COLOR_TOKEN_MAP);
  }

  // ── Navigation ───────────────────────────────────────────────────────────

  _isBeatLocked() {
    return this._lessonLinked && this.stepIndex < STEP_FORMULA;
  }

  _skipIntro() {
    //this._introAge = INTRO_TIME;
  }

  _handleKeyDown(e) {
    if (this._isBeatLocked()) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); this._goStep(this.stepIndex + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); this._goStep(this.stepIndex - 1); }
  }

  _handleTouchStart(e) {
    const t = e.changedTouches[0];
    this._touchStartX = t.clientX;
    this._touchStartY = t.clientY;
  }

  _handleTouchEnd(e) {
    if (this._touchStartX == null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - this._touchStartX;
    const dy = t.clientY - this._touchStartY;
    this._touchStartX = null;
    if (this._isBeatLocked()) return;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      this._goStep(this.stepIndex + (dx < 0 ? 1 : -1));
    }
  }

  _goStep(i) {
    this._skipIntro();
    const clamped = Math.max(0, Math.min(STEPS.length - 1, i));
    if (clamped === this.stepIndex) return;
    this.stepIndex = clamped;
    this._stepEnterTime = 0;
    if (STEPS[clamped].type === 'freeplay') {
      this._freeplayFlipped = false;
      this._freeplayElapsed = 0;
    }
    this._resetCelebration();
    this._announceStep();
    this.requestUiUpdate?.();
  }

  isControlHidden(id) {
    const step = STEPS[this.stepIndex];
    const locked = this._isBeatLocked();
    const isFreeplay = step.type === 'freeplay';
    if (id === 'prev') return locked || this.stepIndex === 0;
    if (id === 'next') return locked || isFreeplay;
    if (id === 'apex' || id === 'flip') return !isFreeplay;
    return false;
  }

  onBeatChange(beatIndex) {
    this._lessonLinked = true;
    const clamped = Math.max(0, Math.min(beatIndex, BEAT_STEP_MAP.length - 1));
    const chain = BEAT_STEP_MAP[clamped];
    this._beatChain = chain;
    this._beatChainPos = 0;
    this._beatChainDwell = chain[0].dwellMs != null ? chain[0].dwellMs / 1000 : null;
    this._jumpToStep(chain[0].idx);
  }

  _jumpToStep(i) {
    this._skipIntro();
    this.stepIndex = Math.max(0, Math.min(STEPS.length - 1, i));
    this._stepEnterTime = 0;
    this._resetCelebration();
    this._announceStep();
    this.requestUiUpdate?.();
  }

  onControlChange(id, value) {
    this._skipIntro();
    if (this._canvas) this._canvas.focus({ preventScroll: true });
    if (id === 'next') {
      this._goStep(this.stepIndex + 1);
    } else if (id === 'prev') {
      this._goStep(this.stepIndex - 1);
    } else if (id === 'apex') {
      this.apex = Math.round(Math.min(APEX_MAX, Math.max(APEX_MIN, Number(value))));
      this._freeplayFlipped = false;
      this._freeplayElapsed = 0;
      this._resetCelebration();
      this._announce('Triangle reshaped. Press Flip and Join to form the parallelogram.');
    } else if (id === 'flip') {
      this._freeplayFlipped = true;
      this._freeplayElapsed = 0;
      this._resetCelebration();
      this._announce('Flipping and joining.');
    }
  }

  _resetCelebration() {
    this._landFx = null;
    this._squash = null;
    this._confetti = [];
    this._landArm = true;
  }

  // ── A11y ─────────────────────────────────────────────────────────────────

  _buildLiveRegion() {
    this._liveRegion = document.createElement('div');
    this._liveRegion.setAttribute('role', 'status');
    this._liveRegion.setAttribute('aria-live', 'polite');
    this._liveRegion.style.cssText =
      'position:absolute;width:1px;height:1px;padding:0;margin:-1px;' +
      'overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;';
    this.container.appendChild(this._liveRegion);
  }

  _announce(text) {
    if (this._liveRegion) this._liveRegion.textContent = text;
  }

  _announceStep() {
    this._announce(STEPS[this.stepIndex].caption);
  }

  // ── Frame loop ───────────────────────────────────────────────────────────

  _tick(ctx, dt) {
    this._clock += dt;

    let effDt = dt;
    if (this._introAge < INTRO_TIME) {
      this._introAge += dt;
      effDt = 0;
    }
    this._stepEnterTime += effDt;
    if (this._freeplayFlipped) this._freeplayElapsed += effDt;
    this._tickBeatChain(effDt);

    // FIXED (v2 bug): celebration clocks advanced here on honest dt, and the
    // landing watch runs as state logic - never inside the draw pass.
    if (this._landFx != null) {
      this._landFx += dt;
      if (this._landFx > LAND_FX_DURATION) this._landFx = null;
    }
    if (this._squash != null) {
      this._squash += dt;
      if (this._squash > LAND_SQUASH_DURATION) this._squash = null;
    }

    const step = STEPS[this.stepIndex];
    const theta = this._currentTheta(step);
    const copyVisible = theta != null &&
      !(step.type === 'freeplay' && !this._freeplayFlipped);
    if (!copyVisible || theta < Math.PI - 0.01) {
      this._landArm = true;
    } else if (this._landArm && dt > 0) {
      this._landArm = false;
      this._landFx = 0;
      this._squash = 0;
      const c = this._parallelogramCenter(this._currentApex(step));
      this._spawnConfetti(c.cx, c.cy);
    }

    this._updateConfetti(dt);

    ctx.clearRect(0, 0, W, H);

    const zoom = 1 + 0.12 * (1 - SimEase.outCubic(clamp01(this._introAge / 1.5)));
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-W / 2, -H / 2);
    this._drawWorld(ctx, step);
    ctx.restore();

    this._drawChrome(ctx, step);
  }

  _tickBeatChain(dt) {
    if (!this._lessonLinked || this._beatChainDwell == null) return;
    this._beatChainDwell -= dt;
    if (this._beatChainDwell > 0) return;
    this._beatChainPos++;
    const next = this._beatChain?.[this._beatChainPos];
    if (!next) { this._beatChainDwell = null; return; }
    this._jumpToStep(next.idx);
    this._beatChainDwell = next.dwellMs != null ? next.dwellMs / 1000 : null;
  }

  _drawInitialFrame(ctx) {
    const t = this._introAge;
    this._introAge = INTRO_TIME;
    this._tick(ctx, 0);
    this._introAge = t;
  }

  _parallelogramCenter(apex) {
    const { B } = verts(apex);
    const cp = copyAt(apex, Math.PI);
    return { cx: (B.x + cp.B.x) / 2, cy: (B.y + cp.B.y) / 2 };
  }

  _reveal() {
    const t = this._introAge;
    return {
      t,
      done: t >= INTRO_TIME,
      stars: SimEase.outCubic(clamp01((t - 0.05) / 0.65)),
      plat: SimEase.outCubic(clamp01((t - 0.30) / 0.55)),
      tri: outBack(SimEase.outCubic(clamp01((t - 0.55) / 0.55))),
      dim: outBack(SimEase.outCubic(clamp01((t - 0.85) / 0.45))),
      flash: 1 - smoothWin(0.34, 0.55, t),
      title: t >= 1.12 ? outBack(clamp01((t - 1.12) / 0.5)) : 0,
      titleExit: smoothWin(INTRO_TIME - 0.22, INTRO_TIME - 0.02, t),
      bye: smoothWin(4.06, 4.26, t),
    };
  }

  _currentApex(step) {
    return step.type === 'freeplay' ? this.apex : APEX_DEFAULT;
  }

  _currentTheta(step) {
    if (step.type === 'showTriangle') return null;
    if (step.type === 'flipJoin') return Math.PI * cruise(clamp01(this._stepEnterTime / FLIP_DURATION));
    if (step.type === 'freeplay') {
      if (!this._freeplayFlipped) return 0;
      return Math.PI * cruise(clamp01(this._freeplayElapsed / FLIP_DURATION));
    }
    return Math.PI;
  }

  // ── Confetti ─────────────────────────────────────────────────────────────

  _updateConfetti(dt) {
    if (!this._confetti.length) return;
    for (const p of this._confetti) {
      p.life += dt;
      p.vy += 460 * dt;
      p.vx *= (1 - 0.55 * dt);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
    }
    this._confetti = this._confetti.filter((p) => p.life < 1.35 && p.y < H + 30);
  }

  _spawnConfetti(cx, cy) {
    this._confetti = Array.from({ length: CONFETTI_N }, (_, i) => ({
      x: cx, y: cy,
      vx: Math.cos(CONFETTI_ANG[i] + CONFETTI_JIT[i]) * CONFETTI_SPD[i],
      vy: Math.sin(CONFETTI_ANG[i] + CONFETTI_JIT[i]) * CONFETTI_SPD[i],
      rot: i * 0.7, vr: (((i * 53) % 11) - 5) * 1.6,
      w: 5 + (i % 3) * 1.6, h: 3.4 + (i % 2) * 1.4,
      dot: i % 5 === 0,
      col: CONFETTI_COLORS_AT(i, this.colors ?? {}),
      life: 0,
    }));
  }

  _drawConfetti(ctx) {
    if (!this._confetti.length) return;
    ctx.save();
    for (const p of this._confetti) {
      ctx.save();
      ctx.globalAlpha = 1 - smoothWin(0.85, 1.3, p.life);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.col;
      if (p.dot) {
        ctx.beginPath(); ctx.arc(0, 0, 2.6, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }
      ctx.restore();
    }
    ctx.restore();
  }

  // ── World layer ──────────────────────────────────────────────────────────

  _drawWorld(ctx, step) {
    const R = this._reveal();
    const isFreeplay = step.type === 'freeplay';
    const apex = this._currentApex(step);
    const theta = this._currentTheta(step);
    const { A, B, C } = verts(apex);
    const dashedCopy = isFreeplay && !this._freeplayFlipped;
    const copyVisible = theta != null && !(isFreeplay && !this._freeplayFlipped);

    this._drawBackdrop(ctx, R);

    // Emissive pool under the base.
    ctx.save();
    ctx.fillStyle = rgba(this.colors.shape, 0.06 + 0.025 * Math.sin(this._clock * 1.4));
    ctx.beginPath();
    ctx.ellipse(A.x + BASE_PX / 2, GROUND_Y + 6, BASE_PX * 0.62, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Original triangle - popped in via centroid, two-tone lit. THICKER stroke.
    const tCx = (A.x + B.x + C.x) / 3, tCy = (A.y + B.y + C.y) / 3;
    ctx.save();
    ctx.translate(tCx, tCy); ctx.scale(R.tri, R.tri); ctx.translate(-tCx, -tCy);
    ctx.globalAlpha = Math.min(1, R.tri * 1.6);
    this._fillStrokeTri(ctx, A, B, C, {
      fill: this.colors.shape,
      stroke: SimDraw.shade(this.colors.shape, -0.24),
      alpha: copyVisible ? 0.85 : 0.97,
    });
    ctx.restore();

    if (theta != null) {
      const copy = copyAt(apex, theta);
      if (!dashedCopy) {
        // Landing squash & stretch - FIX: sq is the DEVIATION (0 = undistorted),
        // so outside the brief celebration window the copy draws perfectly rigid.
        let sq = 0;
        if (this._squash != null) {
          const u = this._squash / LAND_SQUASH_DURATION;
          sq = 0.07 * Math.sin(Math.PI * u) * (1 - u);
        }
        const cCx = (copy.A.x + copy.B.x + copy.C.x) / 3;
        const cCy = (copy.A.y + copy.B.y + copy.C.y) / 3;
        ctx.save();
        ctx.translate(cCx, cCy);
        ctx.scale(1 + sq, 1 - sq);
        ctx.translate(-cCx, -cCy);
        this._fillStrokeTri(ctx, copy.A, copy.B, copy.C, {
          fill: this.colors.wedge,
          stroke: SimDraw.shade(this.colors.wedge, -0.24),
          alpha: 0.92,
        });
        ctx.restore();

        // Densified ghost trail (see GHOSTS note).
        if (step.type === 'flipJoin' || (isFreeplay && this._freeplayElapsed < FLIP_DURATION)) {
          this._drawGhostTrail(ctx, apex, theta);
        }
      } else {
        this._fillStrokeTri(ctx, copy.A, copy.B, copy.C, {
          fill: null,
          stroke: rgba(this.colors.wedge, 0.95),
          alpha: 1,
          dashed: true,
        });
      }

      if (step.type === 'flipJoin' && !dashedCopy) {
        this._drawPivotMark(ctx, apex);
        this._drawFlipTrail(ctx, apex, theta);
      }
    }

    // Seam glint as the halves lock (emphasises the shared edge AC).
    if ((step.type === 'parallelogramFormed' && this._stepEnterTime < 0.7) ||
        (step.type === 'flipJoin' && theta >= Math.PI - 0.01 && this._stepEnterTime > FLIP_DURATION - 0.35)) {
      const k = step.type === 'flipJoin'
        ? clamp01((this._stepEnterTime - (FLIP_DURATION - 0.35)) / 0.35)
        : clamp01(this._stepEnterTime / 0.7);
      const flash = 1 - k;
      ctx.save();
      ctx.strokeStyle = rgba('#ffffff', 0.55 * flash);
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(A.x, A.y); ctx.lineTo(C.x, C.y);
      ctx.stroke();
      ctx.restore();
    }

    // Shine sweep across the freshly-formed parallelogram (corrected hull).
    if (step.type === 'parallelogramFormed' && this._stepEnterTime < 0.95) {
      const cp = copyAt(apex, Math.PI);
      const sw = SimEase.inOutCubic(clamp01(this._stepEnterTime / 0.95));
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(B.x, B.y); ctx.lineTo(cp.C.x, cp.C.y); ctx.lineTo(cp.B.x, cp.B.y); ctx.lineTo(cp.A.x, cp.A.y);
      ctx.closePath();
      ctx.clip();
      const xs = [B.x, cp.C.x, cp.B.x, cp.A.x];
      const minX = Math.min(...xs) - 8, maxX = Math.max(...xs) + 8;
      ctx.fillStyle = rgba('#ffffff', 0.16 * (1 - sw * 0.4));
      ctx.fillRect(minX + (maxX - minX + 110) * sw - 110, TOP_Y - 8, 60, HEIGHT_PX + 16);
      ctx.restore();
    }

    if (step.type === 'congruentHalves' || (isFreeplay && !dashedCopy && theta >= Math.PI - 0.01)) {
      this._drawCongruenceMarks(ctx, apex);
    }

    const dropping = !isFreeplay && this.stepIndex === STEP_SHOW && R.done;
    const hp = dropping ? clamp01(this._stepEnterTime / HEIGHT_DROP_DURATION) : 1;
    const settle = dropping ? clamp01((this._stepEnterTime - HEIGHT_DROP_DURATION) / 0.3) : 1;
    if (hp > 0.001) this._drawHeightLine(ctx, apex, hp, outBack(settle));

    this._drawCornerLabels(ctx, apex, R.dim);
    this._drawDimensionLabel(ctx, apex, R.dim);

    if (this._landFx != null) this._drawLandFx(ctx, apex);
    this._drawConfetti(ctx);
  }

  /**
   * The ghost trail, upgraded for visibility:
   *   • 4 echoed outlines trail the rotation (Δ 0.18->0.78 rad), each stroked
   *     at full-weight amber and FANNED outward from pivot M (k up to 1.096),
   *     so the smear looks like radial motion energy rather than faint haze;
   *   • nearest echo carries a warm afterimage fill;
   *   • a 7-dot comet train follows B's arc, ending in a white-hot head;
   *   • a 3-layer velocity ribbon hugs the swept angle.
   */
  _drawGhostTrail(ctx, apex, theta) {
    const c = this.colors;
    const { B } = verts(apex);
    const M = { x: (verts(apex).A.x + verts(apex).C.x) / 2, y: (verts(apex).A.y + verts(apex).C.y) / 2 };

    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    for (let i = 0; i < GHOSTS.length; i++) {
      const g = GHOSTS[i];
      const th = theta - g.d;
      if (th <= 0.01) continue;
      const gp = copyAt(apex, th);
      ctx.globalAlpha = 1;

      if (i === 0) {
        // Warm afterimage silhouette just behind the leading edge.
        ctx.beginPath();
        ctx.moveTo(gp.A.x, gp.A.y); ctx.lineTo(gp.B.x, gp.B.y); ctx.lineTo(gp.C.x, gp.C.y);
        ctx.closePath();
        ctx.fillStyle = rgba(c.wedge, 0.10);
        ctx.fill();
      }

      // Outward-fanned echo outline.
      const e = {
        A: expandFrom(M, gp.A, g.k),
        B: expandFrom(M, gp.B, g.k),
        C: expandFrom(M, gp.C, g.k),
      };
      ctx.strokeStyle = rgba(c.wedge, g.a);
      ctx.lineWidth = g.w;
      ctx.beginPath();
      ctx.moveTo(e.A.x, e.A.y); ctx.lineTo(e.B.x, e.B.y); ctx.lineTo(e.C.x, e.C.y);
      ctx.closePath();
      ctx.stroke();
    }

    // Comet train along B's arc - heavier dots, white-hot lead.
    const r = Math.hypot(B.x - M.x, B.y - M.y);
    const a0 = Math.atan2(B.y - M.y, B.x - M.x);
    for (let k = COMET_DOTS; k >= 1; k--) {
      const ang = a0 + theta - k * 0.085;
      if (ang <= a0) continue;
      const fade = 1 - k / (COMET_DOTS + 1);
      ctx.fillStyle = rgba(c.wedge, 0.16 + 0.38 * fade);
      ctx.beginPath();
      ctx.arc(M.x + r * Math.cos(ang), M.y + r * Math.sin(ang), 2.2 + 1.6 * fade, 0, Math.PI * 2);
      ctx.fill();
    }
    if (theta > 0.08) {
      const hx = M.x + r * Math.cos(a0 + theta);
      const hy = M.y + r * Math.sin(a0 + theta);
      ctx.fillStyle = rgba('#ffffff', 0.9);
      ctx.beginPath(); ctx.arc(hx, hy, 4.2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = rgba('#ffffff', 0.35);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(hx, hy, 7.5, 0, Math.PI * 2); ctx.stroke();
    }

    // Velocity ribbon: three nested arcs, widest nearest the copy.
    if (theta > 0.12) {
      const from = a0 + Math.max(0, theta - 1.1);
      const tone = [[0.34, 5, 0], [0.20, 4, 5], [0.10, 3, 10]];
      for (const [al, lw, gap] of tone) {
        ctx.strokeStyle = rgba(c.wedge, al);
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.arc(M.x, M.y, r + 14 + gap, from, a0 + theta);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  _drawLandFx(ctx, apex) {
    const c = this.colors;
    const t = this._landFx / LAND_FX_DURATION;
    const cp = copyAt(apex, Math.PI);
    const cx = (verts(apex).B.x + cp.B.x) / 2;
    const cy = (verts(apex).B.y + cp.B.y) / 2;

    ctx.save();
    const rr = 30 + SimEase.outCubic(t) * 84;
    ctx.strokeStyle = rgba(c.wedge, 0.5 * (1 - t));
    ctx.lineWidth = 3 * (1 - t) + 1;
    ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.stroke();

    if (t < 0.72) {
      const sp = Math.sin(Math.PI * clamp01(t / 0.72));
      for (const entry of [verts(apex).A, verts(apex).C, { x: cx, y: cy }]) {
        this._drawSparkle(ctx, entry.x, entry.y, 6 + 5 * sp, rgba('#ffffff', 0.85 * sp));
      }
    }
    ctx.restore();
  }

  _drawSparkle(ctx, x, y, r, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.quadraticCurveTo(r * 0.18, -r * 0.18, r, 0);
    ctx.quadraticCurveTo(r * 0.18, r * 0.18, 0, r);
    ctx.quadraticCurveTo(-r * 0.18, r * 0.18, -r, 0);
    ctx.quadraticCurveTo(-r * 0.18, -r * 0.18, 0, -r);
    ctx.fill();
    ctx.restore();
  }

  _drawPivotMark(ctx, apex) {
    const c = this.colors;
    const { A, C } = verts(apex);
    const M = { x: (A.x + C.x) / 2, y: (A.y + C.y) / 2 };
    ctx.save();
    ctx.strokeStyle = rgba(c.label, 0.8);
    ctx.lineWidth = 2.5;
    ctx.setLineDash([4, 5]);
    ctx.lineDashOffset = -this._clock * 18;
    ctx.beginPath(); ctx.arc(M.x, M.y, 9, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = c.wedge;
    ctx.beginPath(); ctx.arc(M.x, M.y, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    this._chipLabel(ctx, 'M', M.x, M.y - 26, { color: c.wedge });
  }

  _drawFlipTrail(ctx, apex, theta) {
    const c = this.colors;
    const { A, B, C } = verts(apex);
    const M = { x: (A.x + C.x) / 2, y: (A.y + C.y) / 2 };
    const r = Math.hypot(B.x - M.x, B.y - M.y);
    const a0 = Math.atan2(B.y - M.y, B.x - M.x);
    if (theta <= 0.02) return;
    ctx.save();
    ctx.strokeStyle = rgba(c.wedge, 0.26);
    ctx.lineWidth = 2.5;
    ctx.setLineDash([3, 6]);
    ctx.beginPath();
    ctx.arc(M.x, M.y, r + 12, a0, a0 + theta);
    ctx.stroke();
    ctx.restore();
  }

  /** Flat vivid fill + world-aligned two-tone lighting; THICKER strokes (4.5). */
  _fillStrokeTri(ctx, p1, p2, p3, { fill, stroke, alpha = 1, dashed = false }) {
    ctx.save();
    if (dashed) {
      ctx.setLineDash([10, 8]);
      ctx.lineDashOffset = -this._clock * 14;
    }
    if (fill) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y);
      ctx.closePath();
      ctx.clip();
      ctx.globalAlpha = alpha;
      const xs = [p1.x, p2.x, p3.x], ys = [p1.y, p2.y, p3.y];
      const left = Math.min(...xs) - 2, top = Math.min(...ys) - 2;
      const wide = Math.max(...xs) - left + 4, tall = Math.max(...ys) - top + 4;
      ctx.fillStyle = fill;
      ctx.fillRect(left, top, wide, tall);
      const shaded = SimDraw.shade(fill, -0.14);
      if (shaded !== fill) {
        ctx.fillStyle = shaded;
        const sx = Math.max(p3.x, left);
        ctx.fillRect(sx, top, left + wide - sx, tall);
      }
      ctx.restore();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = dashed ? 3 : 4.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y);
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── Backdrop ─────────────────────────────────────────────────────────────

  _drawBackdrop(ctx, R) {
    const c = this.colors;
    const T = this._clock;

    ctx.fillStyle = c.bgDeep;
    ctx.fillRect(-140, -140, W + 280, H + 280);

    // Drifting nebula orbs.
    const orbs = [
      { x: -60, y: -80, r: 255, col: c.shape, f: 0.055, ax: 26, ay: 14, ph: 0.0, a: 0.07 },
      { x: W + 40, y: 128, r: 195, col: c.wedge, f: 0.042, ax: -22, ay: 18, ph: 2.1, a: 0.055 },
      { x: W * 0.55, y: -120, r: 170, col: c.accent, f: 0.061, ax: 18, ay: -16, ph: 4.0, a: 0.045 },
    ];
    for (const o of orbs) {
      const ox = o.x + Math.sin(T * o.f + o.ph) * o.ax;
      const oy = o.y + Math.cos(T * o.f * 1.31 + o.ph) * o.ay;
      ctx.fillStyle = rgba(o.col, o.a);
      ctx.beginPath(); ctx.arc(ox, oy, o.r, 0, Math.PI * 2); ctx.fill();
    }

    if (R.stars > 0.001) {
      for (const s of STARS) {
        const sx = s.spd ? (((s.x - T * s.spd) % W) + W) % W : s.x;
        const tw = s.a * (0.65 + 0.35 * Math.sin(T * s.sp + s.ph)) * R.stars;
        ctx.fillStyle = rgba(c.label, tw);
        if (s.sparkle) {
          this._drawSparkle(ctx, sx, s.y, s.r + 1.4, rgba(c.label, tw));
        } else {
          ctx.beginPath(); ctx.arc(sx, s.y, s.r, 0, Math.PI * 2); ctx.fill();
        }
      }

      // Triangle constellation.
      const breathe = 0.10 + 0.05 * Math.sin(T * 0.9);
      ctx.strokeStyle = rgba(c.shape, breathe);
      ctx.lineWidth = 1.4;
      ctx.setLineDash([2, 6]);
      ctx.lineDashOffset = -T * 6;
      ctx.beginPath();
      CONSTELLATION.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = rgba(c.shape, breathe + 0.28);
      for (const [x, y] of CONSTELLATION) {
        ctx.beginPath(); ctx.arc(x, y, 2.3, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Scheduled shooting stars.
    for (const sh of SHOOTERS) {
      const local = (T - sh.start) % sh.period;
      if (local < 0 || local > sh.dur) continue;
      const p = local / sh.dur;
      const hx = sh.x0 + sh.dx * p, hy = sh.y0 + sh.dy * p;
      const fade = Math.sin(Math.PI * p) * R.stars;
      ctx.strokeStyle = rgba(c.label, 0.75 * fade);
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hx - sh.dx * 0.16, hy - sh.dy * 0.16);
      ctx.lineTo(hx, hy);
      ctx.stroke();
      ctx.fillStyle = rgba('#ffffff', 0.9 * fade);
      ctx.beginPath(); ctx.arc(hx, hy, 2.2, 0, Math.PI * 2); ctx.fill();
    }

    // Platform wipe-up.
    const lift = (1 - R.plat) * (H - GROUND_Y + 60);
    ctx.save();
    ctx.beginPath();
    ctx.rect(-140, GROUND_Y + lift - 40, W + 280, H - GROUND_Y + 200);
    ctx.clip();
    ctx.fillStyle = rgba(c.label, 0.055);
    rrPath(ctx, 0, GROUND_Y, W, H - GROUND_Y + 40, 18);
    ctx.fill();
    ctx.fillStyle = rgba(c.label, 0.045);
    rrPath(ctx, 0, GROUND_Y, W, 10, 5);
    ctx.fill();
    ctx.strokeStyle = rgba(c.label, 0.18 * R.plat);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(24, GROUND_Y); ctx.lineTo(W - 24, GROUND_Y);
    ctx.stroke();
    ctx.restore();
  }

  // ── Annotations ──────────────────────────────────────────────────────────

  _drawHeightLine(ctx, apex, progress, settle) {
    const c = this.colors;
    const { C } = verts(apex);
    const foot = { x: C.x, y: GROUND_Y };
    ctx.save();
    ctx.setLineDash([8, 7]);
    ctx.lineCap = 'round';
    ctx.strokeStyle = c.height;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(C.x, C.y);
    ctx.lineTo(C.x, C.y + (foot.y - C.y) * progress);
    ctx.stroke();
    ctx.restore();

    if (progress < 0.98 || settle <= 0) return;

    ctx.save();
    ctx.strokeStyle = rgba(c.height, 0.85);
    ctx.lineWidth = 2.5;
    rrPath(ctx, foot.x - 11, foot.y - 11, 11, 11, 3);
    ctx.stroke();
    ctx.restore();

    const hy = (C.y + foot.y) / 2;
    ctx.save();
    ctx.translate(foot.x + 44, hy);
    const k = 0.4 + 0.6 * settle;
    ctx.scale(k, k);
    ctx.globalAlpha = settle;
    ctx.translate(-(foot.x + 44), -hy);
    this._chipLabel(ctx, `h = ${fmt(HEIGHT_UNITS)}`, foot.x + 44, hy, { color: c.height });
    ctx.restore();
  }

  _drawCornerLabels(ctx, apex, dimP) {
    if (dimP <= 0.01) return;
    const c = this.colors;
    const { A, B, C } = verts(apex);
    this._vertexBadge(ctx, A.x - 18, A.y + 2, 'A', c, dimP);
    this._vertexBadge(ctx, B.x + 18, B.y + 2, 'B', c, dimP);
    this._vertexBadge(ctx, C.x, C.y - 20, 'C', c, dimP);
  }

  _vertexBadge(ctx, x, y, letter, c, pop) {
    ctx.save();
    ctx.translate(x, y);
    const k = 0.4 + 0.6 * pop;
    ctx.scale(k, k);
    ctx.globalAlpha = Math.min(1, pop * 1.6);
    ctx.fillStyle = rgba(c.panelBg, 0.94);
    ctx.strokeStyle = rgba(c.label, 0.28);
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.font = font(800, 13);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = c.label;
    ctx.fillText(letter, 0, 1);
    ctx.restore();
  }

  _drawDimensionLabel(ctx, apex, dimP) {
    if (dimP <= 0.01) return;
    const c = this.colors;
    const { A, B } = verts(apex);
    const midX = (A.x + B.x) / 2;

    ctx.save();
    ctx.globalAlpha = dimP;
    ctx.strokeStyle = rgba(c.shape, 0.85);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(A.x, GROUND_Y + 14); ctx.lineTo(A.x, GROUND_Y + 20);
    ctx.moveTo(B.x, GROUND_Y + 14); ctx.lineTo(B.x, GROUND_Y + 20);
    ctx.moveTo(A.x, GROUND_Y + 17); ctx.lineTo(B.x, GROUND_Y + 17);
    ctx.stroke();
    ctx.restore();

    const cy = GROUND_Y + 36;
    ctx.save();
    ctx.translate(midX, cy);
    const k = 0.4 + 0.6 * dimP;
    ctx.scale(k, k);
    ctx.globalAlpha = Math.min(1, dimP * 1.6);
    ctx.translate(-midX, -cy);
    this._chipLabel(ctx, `b = ${fmt(BASE_UNITS)}`, midX, cy, { color: c.shape });
    ctx.restore();
  }

  /**
   * Congruence marks - FIXED pairing: BC's true image under the point
   * reflection is the segment from phys-A to phys-B′, i.e. cp.C->cp.B
   * (v2 mistakenly marked cp.A->cp.B, whose length is b, not |BC|).
   */
  _drawCongruenceMarks(ctx, apex) {
    const c = this.colors;
    const pop = outBack(clamp01(this._stepEnterTime / 0.4));
    if (pop <= 0.01) return;
    const { A, B, C } = verts(apex);
    const cp = copyAt(apex, Math.PI);
    this._drawTicks(ctx, B, C, c.label);
    this._drawTicks(ctx, cp.C, cp.B, c.label);

    ctx.save();
    ctx.globalAlpha = Math.min(1, pop * 1.4);
    for (const [mx, my] of [
      [(A.x + B.x + C.x) / 3, (A.y + B.y + C.y) / 3],
      [(cp.A.x + cp.B.x + cp.C.x) / 3, (cp.A.y + cp.B.y + cp.C.y) / 3],
    ]) {
      ctx.fillStyle = rgba(c.wedge, 0.16);
      ctx.beginPath(); ctx.arc(mx, my, 17, 0, Math.PI * 2); ctx.fill();
      ctx.font = font(800, 17);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = rgba(c.label, 0.9);
      ctx.fillText('≅', mx, my + 1);
    }
    ctx.restore();
  }

  _drawTicks(ctx, p1, p2, color) {
    const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
    const L = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
    const ux = (p2.x - p1.x) / L, uy = (p2.y - p1.y) / L;
    const nx = -uy, ny = ux;
    ctx.save();
    ctx.strokeStyle = rgba(color, 0.95);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (const o of [-5, 5]) {
      ctx.moveTo(mx + nx * 7 + ux * o, my + ny * 7 + uy * o);
      ctx.lineTo(mx - nx * 7 + ux * o, my - ny * 7 + uy * o);
    }
    ctx.stroke();
    ctx.restore();
  }

  _chipLabel(ctx, text, x, y, { color }) {
    const c = this.colors;
    ctx.save();
    ctx.font = font(800, 13);
    const padX = 10, padY = 6;
    const w = ctx.measureText(text).width + padX * 2;
    const h = 13 + padY * 2;
    const top = y - h;
    rrPath(ctx, x - w / 2, top, w, h, h / 2);
    ctx.fillStyle = rgba(c.panelBg, 0.92);
    ctx.fill();
    ctx.strokeStyle = rgba(color, 0.4);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x, top + h / 2 + 1);
    ctx.restore();
  }

  // ── Chrome layer ─────────────────────────────────────────────────────────

  _drawChrome(ctx, step) {
    const R = this._reveal();
    const isFreeplay = step.type === 'freeplay';

    this._drawIntroFlash(ctx, R);
    if (R.title > 0.001 && !R.done) this._drawIntroTitle(ctx, R);

    if (!R.done) return;

    let caption = step.caption;
    if (step.type === 'flipJoin') {
      const theta = this._currentTheta(step);
      caption = theta < Math.PI - 0.01
        ? 'Make a copy, flip it upside down about the midpoint of side AC...'
        : 'It fits flush - together the two triangles form a parallelogram.';
    } else if (isFreeplay) {
      const theta = this._currentTheta(step);
      const dashedCopy = !this._freeplayFlipped;
      caption = dashedCopy
        ? 'Drag the slider to reshape the triangle, then press Flip & Join.'
        : theta < Math.PI - 0.01
          ? 'Flipping and joining...'
          : 'Still exactly half the parallelogram, whatever the shape.';
    }
    this._drawCaption(ctx, caption);

    if (isFreeplay || this.stepIndex >= STEP_FORMULA) this._drawFormulaPanel(ctx, isFreeplay);
    if (isFreeplay) this._drawFreeplayHint(ctx);
  }

  _drawIntroFlash(ctx, R) {
    if (R.flash <= 0.001) return;
    ctx.save();
    ctx.strokeStyle = rgba(this.colors.label, 0.12 * R.flash);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    const reach = 90 + (1 - R.flash) * 90;
    ctx.beginPath();
    for (const a of SPEED_ANGLES) {
      ctx.moveTo(W / 2 + Math.cos(a) * (reach - 34), H * 0.38 + Math.sin(a) * (reach - 34));
      ctx.lineTo(W / 2 + Math.cos(a) * (reach + 26), H * 0.38 + Math.sin(a) * (reach + 26));
    }
    ctx.stroke();
    ctx.restore();
  }

  _drawIntroTitle(ctx, R) {
    const c = this.colors;
    const enter = R.title;
    const exit = 1 - R.titleExit;
    const alpha = Math.min(1, enter * 1.5) * exit;
    if (alpha <= 0.001) return;

    ctx.save();
    ctx.font = font(800, 25);
    const title = 'A triangle is half a parallelogram!';
    const kicker = 'G E O M E T R Y   ·   A R E A';
    const tw = Math.max(ctx.measureText(title).width, ctx.measureText(kicker).width);
    const bw = tw + 72, bh = 74;
    const bx = W / 2 - bw / 2;
    const rise = (1 - SimEase.outCubic(enter)) * 26 - R.titleExit * 18;
    const by = 89 + rise;

    ctx.globalAlpha = alpha;
    rrPath(ctx, bx, by + 5, bw, bh, 20);
    ctx.fillStyle = rgba(c.wedge, 0.28);
    ctx.fill();
    rrPath(ctx, bx, by, bw, bh, 20);
    ctx.fillStyle = rgba(c.panelBg, 0.97);
    ctx.fill();
    ctx.strokeStyle = rgba(c.wedge, 0.55);
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = rgba(c.wedge, 0.95);
    ctx.font = font(800, 11);
    ctx.fillText(kicker, W / 2, by + 24);
    ctx.fillStyle = c.label;
    ctx.font = font(800, 25);
    ctx.fillText(title, W / 2, by + 54);

    const ds = 9 * enter * exit;
    for (const side of [-1, 1]) {
      const dx = W / 2 + side * (bw / 2 + 34);
      const dy = by + bh / 2 + Math.sin(this._clock * 2 + side) * 3;
      ctx.save();
      ctx.translate(dx, dy);
      ctx.rotate(this._clock * 1.4 * side);
      ctx.fillStyle = rgba(c.wedge, 0.85);
      ctx.beginPath();
      ctx.moveTo(0, -ds); ctx.lineTo(ds * 0.62, 0); ctx.lineTo(0, ds); ctx.lineTo(-ds * 0.62, 0);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  _drawFormulaPanel(ctx, isFreeplay) {
    const c = this.colors;
    const key = `${isFreeplay}`;
    if (key !== this._panKey) { this._panKey = key; this._panBorn = this._clock; }
    const age = this._clock - this._panBorn;

    const x = W / 2 - 270, y = 494, w = 540, h = 74;
    const drop = (1 - SimEase.outCubic(Math.min(1, age / 0.5))) * 22;
    ctx.save();
    ctx.globalAlpha = Math.min(1, age / 0.3);

    const yy = y + drop;
    const depth = SimDraw.shade(c.height, -0.32);
    if (depth !== c.height) {
      rrPath(ctx, x, yy + 4, w, h, 18);
      ctx.fillStyle = depth;
      ctx.fill();
    }
    rrPath(ctx, x, yy, w, h, 18);
    ctx.fillStyle = rgba(c.panelBg, 0.97);
    ctx.fill();
    ctx.strokeStyle = c.height;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.save();
    rrPath(ctx, x, yy, w, h, 18);
    ctx.clip();
    const cyc = (this._clock % 4.5) / 4.5;
    const gx = x + (w + 130) * cyc - 130;
    ctx.fillStyle = rgba('#ffffff', 0.055);
    ctx.save();
    ctx.translate(gx, yy + h / 2);
    ctx.rotate(-0.35);
    ctx.fillRect(-22, -h, 44, h * 2.4);
    ctx.restore();
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.fillStyle = rgba(c.label, 0.6);
    ctx.font = font(700, 12);
    ctx.fillText(
      isFreeplay ? 'AREA STAYS ½bh NO MATTER THE TRIANGLE\'S SHAPE' : 'AREA OF TRIANGLE = ½ × BASE × HEIGHT',
      W / 2, yy + 25
    );
    ctx.fillStyle = c.height;
    ctx.font = font(800, 21);
    ctx.fillText(`½ × ${fmt(BASE_UNITS)} × ${fmt(HEIGHT_UNITS)} = ${fmt(AREA_UNITS)} sq. units`, W / 2, yy + 54);
    ctx.restore();
  }

  _drawCaption(ctx, caption) {
    if (caption !== this._capKey) { this._capKey = caption; this._capBorn = this._clock; }
    const age = this._clock - this._capBorn;
    const alpha = clamp01(age / 0.35);
    if (alpha <= 0.001) return;
    const rise = (1 - SimEase.outCubic(Math.min(1, age / 0.45))) * 12;

    const c = this.colors;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = font(700, 16.5);
    const maxW = 620, lh = 23;
    const lines = this._wrapLines(ctx, caption, maxW);
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    const bw = widest + 48, bh = lines.length * lh + 22;
    const bx = W / 2 - bw / 2, by = 22 + rise;

    rrPath(ctx, bx, by, bw, bh, 16);
    ctx.fillStyle = rgba(c.panelBg, 0.82);
    ctx.fill();
    ctx.strokeStyle = rgba(c.label, 0.14);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = c.label;
    ctx.textAlign = 'center';
    lines.forEach((line, i) => ctx.fillText(line, W / 2, by + 24 + i * lh));
    ctx.restore();
  }

  _drawFreeplayHint(ctx) {
    const c = this.colors;
    ctx.save();
    ctx.font = font(700, 12);
    const text = 'Drag the slider to reshape, then press "Flip & Join".';
    const w = ctx.measureText(text).width + 24;
    const fy = 566 + Math.sin(this._clock * 1.6) * 2.5;
    rrPath(ctx, W / 2 - w / 2, fy, w, 24, 12);
    ctx.fillStyle = rgba(c.panelBg, 0.72);
    ctx.fill();
    ctx.fillStyle = rgba(c.label, 0.7);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, W / 2, fy + 12);
    ctx.restore();
  }

  _wrapLines(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }
}
