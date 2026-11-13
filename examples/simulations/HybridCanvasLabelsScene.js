import { DomSimulation } from 'simulations/base/DomSimulation.js';
import { SimDraw } from 'simulations/base/SimDrawUtils.js';

/**
 * DomSimulation + <canvas> hybrid recipe (simulation-authoring.md SS3.3): canvas draws geometry and shading,
 * DOM spans carry labels pinned over it via CSS. Small, not beat-synced; see ShiftSubtractScene.js for a full
 * scene. Absolute positioning is legit only for a label pinned to a canvas point (anti-patterns/README.md).
 * Canvas colours come from a --sim-* token and refreshTheme() redraws (canvas cannot resolve var(...)); shading
 * is two-tone SimDraw.shade(), never ctx.createLinearGradient. DOM motion is compositor-only and reduced-motion safe.
 */

const W = 500;
const H = 360;

export class HybridCanvasLabelsScene extends DomSimulation {
  static WIDTH = W;
  static HEIGHT = H;
  static ARIA_LABEL = 'A right triangle with its three sides labelled a, b and c.';

  async setup() {
    await super.setup();
    this.root.setAttribute('role', 'group'); // labels below are real text
    this.root.setAttribute('aria-label', this.constructor.ARIA_LABEL);

    this.injectStyle(`
      .sim-dom-root {
        background: radial-gradient(circle at 30% 22%, var(--sim-bg-surface), var(--sim-bg-deep) 70%);
        position: relative;
        overflow: hidden;
      }

      .hc-canvas {
        position: absolute; inset: 0;
        opacity: 0;
        transform: scale(0.92);
        animation: hc-canvas-in 0.6s cubic-bezier(0.22, 0.61, 0.36, 1) both;
      }
      @keyframes hc-canvas-in {
        from { opacity: 0; transform: scale(0.92); }
        to   { opacity: 1; transform: scale(1); }
      }

      .hc-label {
        position: absolute;
        transform: translate(-50%, -50%) scale(0.4);
        background: var(--sim-label-bg);
        color: var(--sim-accent);
        border: 1.5px solid color-mix(in oklab, var(--sim-accent) 55%, transparent);
        font: 800 15px Inter, system-ui;
        letter-spacing: 0.02em;
        padding: 3px 10px;
        border-radius: 8px;
        pointer-events: none;
        opacity: 0;
        animation: hc-label-in 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both;
      }
      @keyframes hc-label-in {
        0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.4);
               box-shadow: 0 0 0 0 color-mix(in oklab, var(--sim-accent) 0%, transparent); }
        55%  { opacity: 1; transform: translate(-50%, -50%) scale(1.15);
               box-shadow: 0 0 0 7px color-mix(in oklab, var(--sim-accent) 30%, transparent); }
        100% { opacity: 1; transform: translate(-50%, -50%) scale(1);
               box-shadow: 0 2px 10px color-mix(in oklab, var(--sim-accent) 25%, transparent); }
      }

      .sim-dom-root::after {
        content: '';
        position: absolute; inset: 0;
        background: linear-gradient(115deg,
          transparent 42%,
          color-mix(in oklab, var(--sim-accent) 55%, transparent) 50%,
          transparent 58%);
        mix-blend-mode: overlay;
        pointer-events: none;
        transform: translateX(-140%);
        animation: hc-shimmer 1.1s ease-in-out 1.35s both;
      }
      @keyframes hc-shimmer {
        from { transform: translateX(-140%); }
        to   { transform: translateX(140%); }
      }

      @media (prefers-reduced-motion: reduce) {
        .hc-canvas, .hc-label, .sim-dom-root::after { animation-duration: 0.01ms !important; animation-delay: 0s !important; }
      }
    `);

    const canvas = document.createElement('canvas');
    canvas.className = 'hc-canvas';
    canvas.width = W;
    canvas.height = H;
    this.root.appendChild(canvas);
    this._ctx = canvas.getContext('2d');
    this._drawTriangle();

    this._addLabel('a', this._legAX, this._legAY, 0.55);
    this._addLabel('b', this._legBX, this._legBY, 0.7);
    this._addLabel('c', this._hypX, this._hypY, 0.85);
  }

  refreshTheme() {
    if (this._ctx) this._drawTriangle();
  }

  _drawTriangle() {
    const ctx = this._ctx;
    const ax = 100, ay = 280;   // right-angle corner
    const bx = 380, by = 280;   // base corner
    const cx = 100, cy = 60;    // apex

    this._legAX = (ax + bx) / 2; this._legAY = ay + 22;      // base leg midpoint
    this._legBX = ax - 22;       this._legBY = (ay + cy) / 2; // vertical leg midpoint
    this._hypX = (bx + cx) / 2 + 18; this._hypY = (by + cy) / 2 - 10; // hypotenuse midpoint

    const accent = getComputedStyle(this.root).getPropertyValue('--sim-accent').trim() || '#818cf8';

    ctx.clearRect(0, 0, W, H);

    // Flat fill + a smaller flat-shaded corner triangle (SimDraw.shade, no gradient).
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.lineTo(cx, cy);
    ctx.closePath();
    ctx.fillStyle = SimDraw.withAlpha(accent, 0.14);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo((ax + bx) / 2, ay);
    ctx.lineTo(ax, (ay + cy) / 2);
    ctx.closePath();
    ctx.fillStyle = SimDraw.withAlpha(SimDraw.shade(accent, -0.25), 0.16);
    ctx.fill();

    // Re-trace the main triangle (current path is the corner shade above).
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.lineTo(cx, cy);
    ctx.closePath();
    ctx.save();
    ctx.shadowColor = SimDraw.withAlpha(accent, 0.6);
    ctx.shadowBlur = 16;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();

    // Right-angle marker at corner a.
    const m = 18;
    ctx.strokeStyle = SimDraw.withAlpha(accent, 0.8);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ax, ay - m);
    ctx.lineTo(ax + m, ay - m);
    ctx.lineTo(ax + m, ay);
    ctx.stroke();

    for (const [vx, vy] of [[ax, ay], [bx, by], [cx, cy]]) {
      SimDraw.drawGlow(ctx, vx, vy, 6, accent, 0.35);
      ctx.beginPath();
      ctx.arc(vx, vy, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = accent;
      ctx.fill();
    }
  }

  _addLabel(text, x, y, delay) {
    const el = document.createElement('span');
    el.className = 'hc-label';
    el.setAttribute('aria-hidden', 'true'); // covered by root's aria-label
    el.style.left = `${(x / W) * 100}%`;
    el.style.top = `${(y / H) * 100}%`;
    el.style.animationDelay = `${delay}s`;
    el.textContent = text;
    this.root.appendChild(el);
  }
}
