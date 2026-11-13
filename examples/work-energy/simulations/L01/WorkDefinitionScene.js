import { DomSimulation } from 'simulations/base/DomSimulation.js';
import { simTag } from 'simulations/base/SimUi.js';
import { loadColors, pill } from 'simulations/base/kit/SimLook.js';
import { drawWheelchairPush, CHAIR_FLOOR_Y } from './WheelchairPush.js';

const W = 560;

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }], // two numbers, multiplied
  [{ idx: 1, dwellMs: null }], // one joule, exactly
  [{ idx: 2, dwellMs: null }], // whose work, and on what
];

const F_MAX = 100; // N, step 1 so 1 N is on the first notch
const S_MAX = 20; // m, step 0.5 so 1 m is on the second
const F_START = 20;
// Beat 2's picture: the wheelchair from PushStopWorkScene, in a 480 x 210 box
// that shows design y 150..360 of the chair's own coordinates.
const CV_W = 480;
const CV_H = 210;
const CV_TOP = 150;
const CHAIR_X = 190;
const S_START = 5;

const CSS = `
.wd-title { display: flex; align-items: baseline; justify-content: space-between; gap: var(--sim-space-2); }
.wd-formula { font-size: var(--sim-text-xl); font-weight: 700; }
.wd-cap { font-size: var(--sim-text-sm); color: var(--sim-label-muted); margin-top: var(--sim-space-1); }
.wd-equation { display: flex; align-items: flex-end; gap: var(--sim-space-2); margin-top: var(--sim-space-3); }
.wd-dial { display: flex; flex-direction: column; gap: 4px; min-width: 0; flex: 1 1 0; }
.wd-dial span { font-size: var(--sim-text-sm); color: var(--sim-label-muted); }
.wd-dial input[type="range"] { width: 100%; margin: 0; accent-color: var(--sim-accent); }
.wd-dial .wd-eq { font-size: var(--sim-text-md); font-weight: 600; color: var(--sim-label); font-variant-numeric: tabular-nums; }
.wd-op { font-size: var(--sim-text-2xl); font-weight: 700; padding-bottom: 4px; }
.wd-box { display: flex; align-items: baseline; gap: 4px; min-width: 132px; justify-content: center; padding: var(--sim-space-2); border: 2px solid var(--sim-stroke); border-radius: var(--sim-radius-md); background: var(--sim-bg-surface); transition: border-color 240ms ease, color 240ms ease, text-shadow 240ms ease; }
.wd-box--focus { border-color: var(--sim-gold); }
.wd-box--focus .wd-j { color: var(--sim-gold); text-shadow: 0 0 14px var(--sim-gold); }
.wd-j { font-size: 32px; font-weight: 800; font-variant-numeric: tabular-nums; }
.wd-unit { font-size: var(--sim-text-lg); font-weight: 700; }
.wd-def { font-size: var(--sim-text-sm); color: var(--sim-label-muted); margin-top: var(--sim-space-2); }
.wd-tags { display: flex; flex-wrap: wrap; gap: var(--sim-space-2); margin-top: var(--sim-space-3); }
.wd-chair { margin-top: var(--sim-space-2); }
.wd-chair canvas { display: block; width: 100%; max-width: 300px; margin: 0 auto; aspect-ratio: ${CV_W} / ${CV_H}; }
.sim-dom-root--portrait .wd-equation { flex-direction: column; align-items: stretch; }
`;

export class WorkDefinitionScene extends DomSimulation {
  static WIDTH = W;
  static HEIGHT = 332; // sim-layout tallest landscape beat (the wheelchair) 320 + padding
  static PORTRAIT_WIDTH = 380;
  static PORTRAIT_HEIGHT = 560; // sim-layout tallest portrait beat (tags shown) 541 + padding
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static ARIA_LABEL = 'A force dial and a displacement dial either side of a live product; the result in joules.';
  static CONTROLS = [];

  async setup() {
    await super.setup();
    this.render({
      css: CSS,
      html: `<div class="sim-card">
        <div class="wd-title">
          <h2 class="sim-title wd-formula">W = F &times; s</h2>
          ${simTag('joule', { accent: true })}
        </div>
        <p class="wd-cap">The displacement here is always <b>along</b> the force.</p>
        <div class="wd-equation">
          <label class="wd-dial">
            <span>Force F</span>
            <input class="wd-input wd-input--f" type="range" min="0" max="${F_MAX}" step="1" value="${F_START}">
            <span class="wd-eq" data-f></span>
          </label>
          <span class="wd-op" aria-hidden="true">&times;</span>
          <label class="wd-dial">
            <span>Displacement s</span>
            <input class="wd-input wd-input--s" type="range" min="0" max="${S_MAX}" step="0.5" value="${S_START}">
            <span class="wd-eq" data-s></span>
          </label>
          <span class="wd-op" aria-hidden="true">=</span>
          <div class="wd-box" data-box>
            <span class="wd-j" data-j>0</span><span class="wd-unit">J</span>
          </div>
        </div>
        <p class="wd-def">One newton moving something one metre along itself.</p>
        <div class="wd-chair" data-chair hidden><canvas width="${CV_W}" height="${CV_H}" role="img" aria-label="A boy pushes a wheelchair to the right. His push points right; the floor's friction on the same wheelchair points left."></canvas></div>
        <div class="wd-tags" data-tags hidden>
          ${simTag('your push: along the motion, work +', { accent: true })}
          ${simTag('floor friction: against it, work -')}
        </div>
      </div>`,
    });

    this._dialF = this.root?.querySelector('.wd-input--f');
    this._dialS = this.root?.querySelector('.wd-input--s');
    this._f = this.root?.querySelector('[data-f]');
    this._s = this.root?.querySelector('[data-s]');
    this._j = this.root?.querySelector('[data-j]');
    this._box = this.root?.querySelector('[data-box]');
    this._tags = this.root?.querySelector('[data-tags]');
    this._chair = this.root?.querySelector('[data-chair]');
    this._cv = this._chair?.querySelector('canvas') ?? null;
    this._parts = ['.wd-cap', '.wd-equation', '.wd-def'].map((q) => this.root?.querySelector(q));

    // The harness DOM has no HTML parser, so these are null there and present
    // in a browser; the scene simply rests when they are absent.
    this._dialF?.addEventListener('input', () => this._paint());
    this._dialS?.addEventListener('input', () => this._paint());
    this._paint();
    this.onStep();
  }

  onStep() {
    // The last beat is a different picture: the dials give way to the
    // wheelchair with its two forces, and the two prompts sit under it.
    const last = this.stepIndex >= 2;
    if (this._tags) this._tags.hidden = !last;
    if (this._chair) this._chair.hidden = !last;
    for (const el of this._parts || []) if (el) el.hidden = last;
    this._paint();
    if (last) this._drawChair();
  }

  refreshTheme() {
    if (this.stepIndex >= 2) this._drawChair();
  }

  // One wheelchair, two arrows: the boy's push along the way it rolls, and the
  // floor's friction on the very same chair, back the other way.
  _drawChair() {
    const cv = this._cv;
    const ctx = cv?.getContext?.('2d');
    if (!ctx || !this.root) return;
    const c = loadColors(this.root);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = CV_W * dpr;
    cv.height = CV_H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, CV_W, CV_H);
    ctx.save();
    ctx.translate(0, -CV_TOP);
    ctx.strokeStyle = c.stroke;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(10, CHAIR_FLOOR_Y + 6);
    ctx.lineTo(CV_W - 10, CHAIR_FLOOR_Y + 6);
    ctx.stroke();
    drawWheelchairPush(ctx, c, CHAIR_X, 1, 0);
    this._arrow(ctx, c.s1, 100, 180, 190, 180);
    pill(ctx, c, 'push', 62, 180, { bg: c.s1, size: 14 });
    this._arrow(ctx, c.bad, CHAIR_X + 120, CHAIR_FLOOR_Y + 9, CHAIR_X - 10, CHAIR_FLOOR_Y + 9);
    pill(ctx, c, 'friction', CHAIR_X + 170, CHAIR_FLOOR_Y + 9, { bg: c.bad, size: 14 });
    this._arrow(ctx, c.labelMuted, CHAIR_X + 130, 250, CHAIR_X + 230, 250);
    pill(ctx, c, 'motion', CHAIR_X + 180, 230, { bg: c.labelMuted, size: 14 });
    ctx.restore();
  }

  _arrow(ctx, col, x0, y0, x1, y1) {
    const a = Math.atan2(y1 - y0, x1 - x0);
    ctx.save();
    ctx.strokeStyle = col;
    ctx.fillStyle = col;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1 - Math.cos(a) * 8, y1 - Math.sin(a) * 8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - Math.cos(a - 0.45) * 15, y1 - Math.sin(a - 0.45) * 15);
    ctx.lineTo(x1 - Math.cos(a + 0.45) * 15, y1 - Math.sin(a + 0.45) * 15);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  _fVal() {
    const v = this._dialF ? Number(this._dialF.value) : F_START;
    return Number.isFinite(v) ? v : F_START;
  }

  _sVal() {
    const v = this._dialS ? Number(this._dialS.value) : S_START;
    return Number.isFinite(v) ? v : S_START;
  }

  _paint() {
    const f = this._fVal();
    const s = this._sVal();
    if (this._f) this._f.textContent = `${f} N`;
    if (this._s) this._s.textContent = `${s} m`;
    if (this._j) this._j.textContent = String(f * s);
    if (this._box) this._box.classList.toggle('wd-box--focus', this.stepIndex >= 1);
  }

  destroy() {
    this._dialF = null;
    this._dialS = null;
    this._f = null;
    this._s = null;
    this._j = null;
    this._box = null;
    this._tags = null;
    this._chair = null;
    this._cv = null;
    this._parts = null;
    super.destroy();
  }
}
