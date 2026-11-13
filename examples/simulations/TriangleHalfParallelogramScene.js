import { CanvasSimulation } from 'simulations/base/CanvasSimulation.js';
import { SimDraw } from 'simulations/base/SimDrawUtils.js';
import { readSimColors } from 'simulations/base/SimTheme.js';
import { clamp01, cruise } from 'simulations/base/SimMotion.js';

/**
 * TriangleHalfParallelogramScene - companion to blk-l04-s05, the proof that
 * Area of a triangle = 1/2 x base x height. Continues
 * ParallelogramToRectangleScene (blk-l04-s03): instead of cutting a
 * parallelogram apart, this duplicates a triangle, rotates the copy 180°
 * about the midpoint of side AC, and shows it fits flush against the
 * original to form a parallelogram with the *same* base and height. Uses
 * the closed sim-theme.css categorical series (--sim-series-N) for its two
 * distinguishable shapes.
 *
 * Geometry (verified before writing any drawing code): A(0,0) B(b,0)
 * C(apex,h) for a triangle with base b, height h and apex anywhere along
 * the top. Rotating {A,B,C} by 180 degrees about M = midpoint(A,C) sends
 * A -> C, C -> A, and B -> B' = A + C - B (point reflection through M).
 * The resulting quadrilateral B-A-B'-C is a parallelogram: vector A-B
 * equals vector B'-C exactly (both equal (-b, 0)), so BA is parallel to
 * CB' with the same length b, and the two are h apart vertically - base b,
 * height h, same as the original triangle. Because the copy is congruent
 * to the original (a rotation, not a resize), the triangle's own area is
 * exactly half of that parallelogram's b x h.
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

const FLIP_DURATION = 2.2; // seconds

const COLOR_TOKEN_MAP = {
  bgDeep:     ['--sim-bg-deep', '#0a0f1e'],
  panelBg:    ['--sim-bg-surface', '#111827'],
  label:      ['--sim-label', '#e2e8f0'],
  labelMuted: ['--sim-label-muted', '#94a3b8'],
  shape:      ['--sim-series-1', '#38bdf8'],
  wedge:      ['--sim-series-2', '#fbbf24'],
  height:     ['--sim-series-3', '#34d399'],
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

// Maps blk-l04-s05.json's derived markdown beats onto scene steps. Beat 0
// covers "here's a triangle" + "make a copy, flip it" in one sentence, so
// its chain shows the plain triangle briefly before auto-starting the
// flip; every other beat is a single self-contained step. Free-play has no
// beat - reached via the scene's own Next once the formula shows.
const BEAT_STEP_MAP = [
  [{ idx: STEP_SHOW, dwellMs: 900 }, { idx: STEP_FLIP, dwellMs: null }],
  [{ idx: STEP_PARALLELOGRAM, dwellMs: null }],
  [{ idx: STEP_CONGRUENT, dwellMs: null }],
  [{ idx: STEP_FORMULA, dwellMs: null }],
];

const HEIGHT_DROP_DURATION = 0.5; // seconds - the height line "drops" in on first reveal

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

// The rotating copy of triangle ABC, spun by `theta` (0..PI) about the
// midpoint of AC. At theta=0 it exactly overlaps the original; at theta=PI
// it has landed flush to form the parallelogram (see header comment).
function copyAt(apex, theta) {
  const { A, B, C } = verts(apex);
  const M = { x: (A.x + C.x) / 2, y: (A.y + C.y) / 2 };
  return { A: rotateAround(A, M, theta), B: rotateAround(B, M, theta), C: rotateAround(C, M, theta) };
}

function fmt(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
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
    { type: 'button', id: 'prev', label: '← Back' },
    { type: 'button', id: 'next', label: 'Next →' },
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
    { type: 'button', id: 'flip', label: 'Flip & Join →' },
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
    const clamped = Math.max(0, Math.min(STEPS.length - 1, i));
    if (clamped === this.stepIndex) return;
    this.stepIndex = clamped;
    this._stepEnterTime = 0;
    if (STEPS[clamped].type === 'freeplay') {
      this._freeplayFlipped = false;
      this._freeplayElapsed = 0;
    }
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
    this.stepIndex = Math.max(0, Math.min(STEPS.length - 1, i));
    this._stepEnterTime = 0;
    this._announceStep();
    this.requestUiUpdate?.();
  }

  onControlChange(id, value) {
    if (this._canvas) this._canvas.focus({ preventScroll: true });
    if (id === 'next') {
      this._goStep(this.stepIndex + 1);
    } else if (id === 'prev') {
      this._goStep(this.stepIndex - 1);
    } else if (id === 'apex') {
      this.apex = Math.round(Math.min(APEX_MAX, Math.max(APEX_MIN, Number(value))));
      this._freeplayFlipped = false;
      this._freeplayElapsed = 0;
      this._announce('Triangle reshaped. Press Flip and Join to form the parallelogram.');
    } else if (id === 'flip') {
      this._freeplayFlipped = true;
      this._freeplayElapsed = 0;
      this._announce('Flipping and joining.');
    }
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
    this._stepEnterTime += dt;
    if (this._freeplayFlipped) this._freeplayElapsed += dt;
    this._tickBeatChain(dt);

    const step = STEPS[this.stepIndex];
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = this.colors.bgDeep;
    ctx.fillRect(0, 0, W, H);

    this._drawScene(ctx, step);
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
    this._tick(ctx, 0);
  }

  // ── Main scene ───────────────────────────────────────────────────────────

  _currentApex(step) {
    return step.type === 'freeplay' ? this.apex : APEX_DEFAULT;
  }

  // theta === null means "don't draw the copy at all".
  _currentTheta(step) {
    if (step.type === 'showTriangle') return null;
    if (step.type === 'flipJoin') return Math.PI * cruise(clamp01(this._stepEnterTime / FLIP_DURATION));
    if (step.type === 'freeplay') {
      if (!this._freeplayFlipped) return 0; // dashed preview, not yet flipped
      return Math.PI * cruise(clamp01(this._freeplayElapsed / FLIP_DURATION));
    }
    return Math.PI; // parallelogramFormed / congruentHalves / formula: settled
  }

  _drawScene(ctx, step) {
    const isFreeplay = step.type === 'freeplay';
    const apex = this._currentApex(step);
    const theta = this._currentTheta(step);
    const { A, B, C } = verts(apex);
    const dashedCopy = isFreeplay && !this._freeplayFlipped;

    this._drawGround(ctx);
    this._fillStrokeTri(ctx, A, B, C, { fill: this.colors.shape, stroke: this.colors.shape, alpha: 0.42 });

    if (theta != null) {
      const copy = copyAt(apex, theta);
      this._fillStrokeTri(ctx, copy.A, copy.B, copy.C, {
        fill: dashedCopy ? null : this.colors.wedge,
        stroke: this.colors.wedge,
        alpha: 0.5,
        dashed: dashedCopy,
      });
    }

    if (step.type === 'congruentHalves' || (isFreeplay && !dashedCopy && theta >= Math.PI - 0.01)) {
      this._drawCongruenceMarks(ctx, apex);
    }

    const heightProgress = !isFreeplay && this.stepIndex === STEP_SHOW
      ? clamp01(this._stepEnterTime / HEIGHT_DROP_DURATION)
      : 1;
    this._drawHeightLine(ctx, apex, heightProgress);
    this._drawCornerLabels(ctx, apex);
    this._drawDimensionLabel(ctx);

    const showFormula = isFreeplay || this.stepIndex >= STEP_FORMULA;
    if (showFormula) this._drawFormulaPanel(ctx, isFreeplay);

    let caption = step.caption;
    if (step.type === 'flipJoin') {
      caption = theta < Math.PI - 0.01
        ? 'Make a copy, flip it upside down about the midpoint of side AC...'
        : 'It fits flush - together the two triangles form a parallelogram.';
    } else if (isFreeplay) {
      caption = dashedCopy
        ? 'Drag the slider to reshape the triangle, then press Flip & Join.'
        : theta < Math.PI - 0.01
          ? 'Flipping and joining...'
          : 'Still exactly half the parallelogram, whatever the shape.';
    }
    this._drawCaption(ctx, caption);
    if (isFreeplay) this._drawFreeplayHint(ctx);
  }

  _fillStrokeTri(ctx, p1, p2, p3, { fill, stroke, alpha = 1, dashed = false }) {
    ctx.save();
    if (dashed) ctx.setLineDash([6, 5]);
    if (fill) {
      ctx.fillStyle = SimDraw.withAlpha(fill, alpha);
    }
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y);
    ctx.closePath();
    if (fill) ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  _drawCongruenceMarks(ctx, apex) {
    const c = this.colors;
    const { A, B, C } = verts(apex);
    const copy = copyAt(apex, Math.PI);
    const cx1 = (A.x + B.x + C.x) / 3, cy1 = (A.y + B.y + C.y) / 3;
    const cx2 = (copy.A.x + copy.B.x + copy.C.x) / 3, cy2 = (copy.A.y + copy.B.y + copy.C.y) / 3;
    ctx.save();
    ctx.font = '700 16px Inter, system-ui';
    ctx.textAlign = 'center';
    ctx.fillStyle = SimDraw.withAlpha(c.label, 0.85);
    ctx.fillText('≅', cx1, cy1);
    ctx.fillText('≅', cx2, cy2);
    ctx.restore();
  }

  _drawGround(ctx) {
    const c = this.colors;
    ctx.save();
    ctx.strokeStyle = SimDraw.withAlpha(c.labelMuted, 0.5);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, GROUND_Y);
    ctx.lineTo(W - 40, GROUND_Y);
    ctx.stroke();
    ctx.restore();
  }

  // `progress` 0..1: the perpendicular "drops" from C down to its foot on
  // first reveal rather than appearing all at once.
  _drawHeightLine(ctx, apex, progress = 1) {
    const c = this.colors;
    const { C } = verts(apex);
    const foot = { x: C.x, y: GROUND_Y };
    const tip = { x: C.x + (foot.x - C.x) * progress, y: C.y + (foot.y - C.y) * progress };
    ctx.save();
    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = c.height;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(C.x, C.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();
    ctx.restore();

    if (progress < 0.98) return;

    ctx.save();
    ctx.strokeStyle = SimDraw.withAlpha(c.height, 0.85);
    ctx.lineWidth = 1.5;
    const s = 11;
    ctx.strokeRect(foot.x - s, foot.y - s, s, s);
    ctx.restore();

    SimDraw.drawLabel(ctx, `h = ${fmt(HEIGHT_UNITS)}`, foot.x + 40, (C.y + foot.y) / 2 + 8, {
      bg: c.panelBg, color: c.height,
    });
  }

  _drawCornerLabels(ctx, apex) {
    const c = this.colors;
    const { A, B, C } = verts(apex);
    ctx.save();
    ctx.font = '700 15px Inter, system-ui';
    ctx.fillStyle = c.label;
    ctx.textAlign = 'center';
    ctx.fillText('A', A.x - 14, A.y + 6);
    ctx.fillText('B', B.x + 14, B.y + 6);
    ctx.fillText('C', C.x, C.y - 14);
    ctx.restore();
  }

  _drawDimensionLabel(ctx) {
    const c = this.colors;
    const { A, B } = verts(0);
    const midX = (A.x + B.x) / 2;
    SimDraw.drawLabel(ctx, `b = ${fmt(BASE_UNITS)}`, midX, GROUND_Y + 34, { bg: c.panelBg, color: c.shape });

    ctx.save();
    ctx.strokeStyle = SimDraw.withAlpha(c.shape, 0.7);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(A.x, GROUND_Y + 14); ctx.lineTo(A.x, GROUND_Y + 20);
    ctx.moveTo(B.x, GROUND_Y + 14); ctx.lineTo(B.x, GROUND_Y + 20);
    ctx.moveTo(A.x, GROUND_Y + 17); ctx.lineTo(B.x, GROUND_Y + 17);
    ctx.stroke();
    ctx.restore();
  }

  _drawFormulaPanel(ctx, isFreeplay) {
    const c = this.colors;
    const x = W / 2 - 260, y = 500, w = 520, h = 66;
    ctx.save();
    SimDraw.drawPanel(ctx, x, y, w, h, { bg: c.panelBg, radius: 10, stroke: c.height, lineWidth: 1.5 });
    ctx.textAlign = 'center';
    ctx.fillStyle = c.labelMuted;
    ctx.font = '600 12px Inter, system-ui';
    ctx.fillText(
      isFreeplay ? 'AREA STAYS ½bh NO MATTER THE TRIANGLE\'S SHAPE' : 'AREA OF TRIANGLE = ½ × BASE × HEIGHT',
      W / 2, y + 22
    );
    ctx.fillStyle = c.height;
    ctx.font = '700 20px Inter, system-ui';
    ctx.fillText(`½ × ${fmt(BASE_UNITS)} × ${fmt(HEIGHT_UNITS)} = ${fmt(AREA_UNITS)} sq. units`, W / 2, y + 48);
    ctx.restore();
  }

  _drawCaption(ctx, caption) {
    const c = this.colors;
    ctx.save();
    ctx.globalAlpha = clamp01(this._stepEnterTime / 0.4);
    ctx.font = '600 15px Inter, system-ui';
    ctx.fillStyle = c.label;
    ctx.textAlign = 'center';
    this._wrapText(ctx, caption, W / 2 - 300, 40, 600, 20, 'center');
    ctx.restore();
  }

  _drawFreeplayHint(ctx) {
    const c = this.colors;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '600 12px Inter, system-ui';
    ctx.fillStyle = c.labelMuted;
    ctx.fillText('Drag the slider to reshape, then press "Flip & Join".', W / 2, 580);
    ctx.restore();
  }

  _wrapText(ctx, text, x, y, maxWidth, lineHeight, align = 'left') {
    const prevAlign = ctx.textAlign;
    ctx.textAlign = align;
    const words = text.split(' ');
    let line = '';
    let cy = y;
    const drawX = align === 'center' ? x + maxWidth / 2 : x;
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, drawX, cy);
        line = word;
        cy += lineHeight;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, drawX, cy);
    ctx.textAlign = prevAlign;
  }
}
