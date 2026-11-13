import { CanvasSimulation } from 'simulations/base/CanvasSimulation.js';
import { SimDraw } from 'simulations/base/SimDrawUtils.js';
import { readSimColors } from 'simulations/base/SimTheme.js';

/**
 * HarappanCityPlanScene - companion to blk-example-sim-history-explore.json
 * (its LAST beat, via `simulationStep`).
 *
 * Deliberately small: the preceding beats already explain the Citadel and
 * Lower Town via real illustrations (`reveal.images`), so this scene's only
 * job is the "try it yourself" payoff - render the labeled plan and let a
 * student toggle the one thing a static image can't show: water moving
 * through the covered drains.
 *
 * Used to also carry a globe intro, regional map, and illustrated
 * vignettes, replaced by real images (examples/media/L02/README.md). The
 * regional map survives separately as HarappanRegionMapScene.js, paired
 * with this block's first beat instead - required, not stylistic:
 * `content-block@1`'s `image`+`simulation` fields only hand off one-way
 * (image -> simulation from `simulationStep` on), so one block can't be
 * simulation -> images -> simulation again.
 */

const W = 800;
const H = 500;

const COLOR_TOKEN_MAP = {
  bgDeep:      ['--sim-bg-deep', '#0a0f1e'],
  label:       ['--sim-label', '#e2e8f0'],
  labelBg:     ['--sim-label-bg', '#1e293bcc'],
  accent:      ['--sim-accent', '#818cf8'],
  success:     ['--sim-success', '#34d399'],
  warning:     ['--sim-warning', '#fbbf24'],
  mapLand:     ['--sim-map-land', '#1e293b'],
  mapLandLine: ['--sim-map-land-stroke', '#334155'],
  mapPin:      ['--sim-map-pin', '#ef4444'],
};

export class HarappanCityPlanScene extends CanvasSimulation {
  static WIDTH = W;
  static HEIGHT = H;
  static ARIA_LABEL =
    'A labeled plan of Mohenjo-daro: a raised western Citadel holding the Great Bath and a ' +
    'ventilated Granary, and a gridded eastern Lower Town of houses, each with its own courtyard, ' +
    'connected to covered drains with inspection sumps and shared public wells. A button starts ' +
    'and stops an animation of water flowing through the drains.';

  static CONTROLS = [
    { type: 'button', id: 'drainFlow', label: '💧 Toggle Drain Flow' },
  ];

  constructor(container, config) {
    super(container, config);
    this.allowResume = true;
    this.colors = null;
    this._drainFlowing = false;
    this._drainElapsed = 0;
    this._liveRegion = null;
  }

  async setup() {
    await super.setup();
    this._canvas.setAttribute('role', 'img');
    this._canvas.setAttribute('aria-label', this.constructor.ARIA_LABEL);
    this._reloadColors();
    this._buildLiveRegion();
    this._drawInitialFrame(this._ctx);
  }

  destroy() {
    if (this._liveRegion) { this._liveRegion.remove(); this._liveRegion = null; }
    super.destroy();
  }

  _reloadColors() {
    this.colors = readSimColors(this.container, COLOR_TOKEN_MAP);
  }

  _buildLiveRegion() {
    this._liveRegion = document.createElement('div');
    this._liveRegion.setAttribute('role', 'status');
    this._liveRegion.setAttribute('aria-live', 'polite');
    this._liveRegion.style.cssText =
      'position:absolute;width:1px;height:1px;padding:0;margin:-1px;' +
      'overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;';
    this.container.appendChild(this._liveRegion);
  }

  onControlChange(id) {
    if (id === 'drainFlow') {
      this._drainFlowing = !this._drainFlowing;
      this._drainElapsed = 0;
      if (this._liveRegion) this._liveRegion.textContent = this._drainFlowing ? 'Drain flow started.' : 'Drain flow stopped.';
    }
  }

  _tick(ctx, dt) {
    if (this._drainFlowing) this._drainElapsed += dt;
    ctx.clearRect(0, 0, W, H);
    this._drawCityPlan(ctx);
  }

  _drawInitialFrame(ctx) { this._tick(ctx, 0); }

  // The plan: a raised Citadel (west) and a gridded Lower Town (east).
  // Shapes and labels only - every dimension/material fact this stands for
  // is stated in the preceding beats' own markdown and illustrations.
  _drawCityPlan(ctx) {
    const c = this.colors;
    ctx.fillStyle = c.bgDeep;
    ctx.fillRect(0, 0, W, H);

    // Citadel platform - an outer wall plus an inset, lighter top face reads
    // as "raised" without an isometric drawing: two flat shades, one step.
    const cx = 60, cy = 90, cw = 300, ch = 320;
    const inset = 10;
    ctx.fillStyle = SimDraw.shade(c.mapLand, -0.08);
    ctx.fillRect(cx, cy, cw, ch);
    ctx.strokeStyle = c.mapLandLine;
    ctx.lineWidth = 2;
    ctx.strokeRect(cx, cy, cw, ch);
    ctx.fillStyle = SimDraw.shade(c.mapLand, 0.22);
    ctx.fillRect(cx + inset, cy + inset, cw - inset * 2, ch - inset * 2);
    ctx.strokeStyle = SimDraw.withAlpha(c.label, 0.25);
    ctx.lineWidth = 1;
    ctx.strokeRect(cx + inset, cy + inset, cw - inset * 2, ch - inset * 2);
    SimDraw.drawLabel(ctx, 'Citadel', cx + cw / 2, cy + 26, { bg: c.labelBg, color: c.warning });

    // Great Bath - a surrounding walkway, a sunken two-tone basin, and short
    // tick marks at both ends standing in for its descending stairs.
    const bathX = cx + cw / 2, bathY = cy + 128, bw = 116, bh = 64;
    ctx.fillStyle = SimDraw.shade(c.mapLand, 0.08);
    ctx.fillRect(bathX - bw / 2 - 10, bathY - bh / 2 - 10, bw + 20, bh + 20);
    ctx.strokeStyle = c.mapLandLine;
    ctx.lineWidth = 1;
    ctx.strokeRect(bathX - bw / 2 - 10, bathY - bh / 2 - 10, bw + 20, bh + 20);

    ctx.fillStyle = SimDraw.shade(c.accent, -0.15);
    ctx.fillRect(bathX - bw / 2, bathY - bh / 2, bw, bh);
    ctx.fillStyle = SimDraw.shade(c.accent, 0.2);
    ctx.fillRect(bathX - bw / 2, bathY - bh / 2, bw, 10);
    ctx.strokeStyle = SimDraw.shade(c.accent, -0.4);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bathX - bw / 2, bathY - bh / 2, bw, bh);

    ctx.strokeStyle = SimDraw.withAlpha(c.label, 0.7);
    ctx.lineWidth = 1.5;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      for (let s = 0; s < 3; s++) {
        const stepY = bathY + side * (bh / 2 - 4 - s * 6);
        ctx.moveTo(bathX - 12, stepY);
        ctx.lineTo(bathX + 12, stepY);
      }
      ctx.stroke();
    }
    SimDraw.drawLabel(ctx, 'Great Bath', bathX, bathY - bh / 2 - 14, { bg: c.labelBg, color: c.label });

    // Granary - a base block plus a row of raised sleeper blocks along the
    // top, the shape the ventilated-storage description in the text points to.
    const granX = cx + 30, granY = cy + ch - 66, granW = cw - 60, granH = 34;
    ctx.fillStyle = SimDraw.shade(c.success, -0.1);
    ctx.fillRect(granX, granY, granW, granH);
    ctx.strokeStyle = SimDraw.shade(c.success, -0.4);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(granX, granY, granW, granH);
    const sleepers = 6, sleeperGap = 6;
    const sleeperW = (granW - sleeperGap * (sleepers + 1)) / sleepers;
    ctx.fillStyle = SimDraw.shade(c.success, 0.25);
    for (let i = 0; i < sleepers; i++) {
      const sx = granX + sleeperGap + i * (sleeperW + sleeperGap);
      ctx.fillRect(sx, granY - 8, sleeperW, 8);
      ctx.strokeRect(sx, granY - 8, sleeperW, 8);
    }
    SimDraw.drawLabel(ctx, 'Granary', granX + granW / 2, granY - 14, { bg: c.labelBg, color: c.label });

    // Lower Town grid
    const lx = cx + cw + 40, ly = cy, lw = W - lx - 30, lh = ch;
    ctx.fillStyle = SimDraw.shade(c.mapLand, -0.1);
    ctx.fillRect(lx, ly, lw, lh);
    ctx.strokeStyle = c.mapLandLine;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(lx, ly, lw, lh);
    SimDraw.drawLabel(ctx, 'Lower Town', lx + lw / 2, ly + 22, { bg: c.labelBg, color: c.label });

    const cols = 3, rows = 3, gap = 10;
    const blockW = (lw - gap * (cols + 1)) / cols, blockH = (lh - 40 - gap * (rows + 1)) / rows;
    const wells = [];
    for (let r = 0; r < rows; r++) {
      for (let col = 0; col < cols; col++) {
        const hx = lx + gap + col * (blockW + gap);
        const hy = ly + 34 + gap + r * (blockH + gap);
        ctx.fillStyle = SimDraw.shade(c.mapLand, 0.18);
        ctx.fillRect(hx, hy, blockW, blockH);
        ctx.strokeStyle = c.mapLandLine;
        ctx.lineWidth = 1;
        ctx.strokeRect(hx, hy, blockW, blockH);

        // Each house's own open courtyard, the same detail every real
        // Harappan house plan shows - a shape, not a new sentence.
        const cw2 = blockW * 0.4, ch2 = blockH * 0.4;
        ctx.fillStyle = SimDraw.shade(c.mapLand, -0.12);
        ctx.fillRect(hx + (blockW - cw2) / 2, hy + (blockH - ch2) / 2, cw2, ch2);

        if ((r === 0 && col === 1) || (r === 2 && col === 1)) {
          wells.push({ x: hx + blockW / 2, y: hy + 6 });
        }
      }
    }

    // Public wells shared between neighbouring houses.
    for (const w of wells) {
      ctx.beginPath();
      ctx.arc(w.x, w.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = c.mapPin;
      ctx.fill();
      ctx.strokeStyle = c.label;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Covered drains - one E-W trunk fed by short N-S branches from each
    // house row, with inspection sumps at the junctions; particles flow
    // when toggled on.
    const drainY = ly + lh - 6;
    const flowColor = this._drainFlowing ? c.accent : c.mapLandLine;
    ctx.strokeStyle = flowColor;
    ctx.lineWidth = this._drainFlowing ? 4 : 2.5;
    ctx.beginPath();
    ctx.moveTo(lx, drainY);
    ctx.lineTo(lx + lw, drainY);
    ctx.stroke();

    const junctions = [lx + blockW / 2 + gap, lx + lw / 2, lx + lw - blockW / 2 - gap];
    ctx.strokeStyle = c.mapLandLine;
    ctx.lineWidth = 2;
    for (const jx of junctions) {
      ctx.beginPath();
      ctx.moveTo(jx, ly + 34);
      ctx.lineTo(jx, drainY);
      ctx.stroke();
      ctx.fillStyle = c.warning;
      ctx.fillRect(jx - 4, drainY - 4, 8, 8);
      ctx.strokeStyle = SimDraw.shade(c.warning, -0.4);
      ctx.lineWidth = 1;
      ctx.strokeRect(jx - 4, drainY - 4, 8, 8);
      ctx.strokeStyle = c.mapLandLine;
      ctx.lineWidth = 2;
    }
    SimDraw.drawLabel(ctx, 'Covered Drain', lx + lw / 2, drainY + 20, { bg: c.labelBg, color: c.label, offsetY: -20 });

    if (this._drainFlowing) {
      for (let i = 0; i < 10; i++) {
        const t = ((this._drainElapsed * 90 + i * 24) % lw);
        ctx.beginPath();
        ctx.arc(lx + t, drainY, 3, 0, Math.PI * 2);
        ctx.fillStyle = c.accent;
        ctx.fill();
      }
    }
  }
}
