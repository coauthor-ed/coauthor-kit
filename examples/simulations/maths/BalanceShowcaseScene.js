/**
 * BalanceShowcaseScene - reference for kit/SimBalance.js. x + 3 = 7 on a pan
 * balance: take one weight from BOTH pans and it stays level; from one pan
 * only and it tips. Three fair moves leave x = 4.
 */
import { SimScene } from 'simulations/base/kit/SimScene.js';
import { drawBackdrop, drawDepth, drawFloor, drawSpotlight, pill } from 'simulations/base/kit/SimLook.js';
import { drawBalance, balanceTilt } from 'simulations/base/kit/SimBalance.js';
import { drawMathPill } from 'simulations/base/kit/SimText.js';

const X = 4;

export class BalanceShowcaseScene extends SimScene {
  static BEAT_STEP_MAP = [[{ idx: 0, dwellMs: null }]];
  static ARIA_LABEL = 'A pan balance shows x plus 3 on the left and 7 on the right. Taking one unit weight from both pans keeps it level; taking from one pan tips it. Three fair moves leave x equal to 4.';
  static CONTROLS = [
    { type: 'button', id: 'both', label: 'Take 1 from both' },
    { type: 'button', id: 'left', label: 'Take 1 from left' },
    { type: 'button', id: 'again', label: 'Start again' },
  ];

  constructor(container, config) { super(container, config); this.reset(); }
  reset() { this.l = 3; this.r = 7; this.tilt = 0; this.done = false; }
  enter() { this.reset(); }
  target() { return balanceTilt(X + this.l, this.r); }
  busy() { return Math.abs(this.tilt - this.target()) > 0.002; }
  isControlDisabled(id) { return (id === 'both' && (this.l === 0 || this.done)) || (id === 'left' && this.l === 0); }

  onControlChange(id) {
    if (!this._guard(id)) return;
    if (id === 'again') this.reset();
    if (id === 'both') { this.l -= 1; this.r -= 1; }
    if (id === 'left') { this.l -= 1; this.oops(340, 180); }
    if (this.l === 0 && this.r === X && !this.done) { this.done = true; this.after(0.4, () => this.celebrate(340, 150)); }
    this.requestUiUpdate?.();
  }

  update(d) { this.tilt += (this.target() - this.tilt) * Math.min(1, d * 6); }

  draw(ctx, c, t) {
    drawBackdrop(ctx, c, 'dots', { t });
    drawDepth(ctx, c, { t, seed: 9 });
    drawFloor(ctx, c, 452);
    drawSpotlight(ctx, c, 340, 250, 260);
    const level = Math.abs(this.target()) < 0.01;
    const unit = (n, tone) => Array.from({ length: n }, () => ({ kind: 'weight', text: '1', tone }));
    drawBalance(ctx, c, {
      x: 340, y: 196, w: 380, tilt: this.tilt, face: level ? (this.done ? 'happy' : 'smile') : 'oops', t,
      left: [{ kind: 'block', text: 'x', tone: c.s5 }, ...unit(this.l, c.s2)], right: unit(this.r, c.s2),
    });
    drawMathPill(ctx, c, this.done ? ['x = 4'] : [`x + ${this.l} = ${this.r}`], 340, 50, { bg: level ? c.good : c.bad, size: 24 });
    pill(ctx, c, level ? 'level: both sides equal' : 'tipped: not equal', 340, 480, { bg: level ? c.good : c.bad, size: 16 });
  }
}
