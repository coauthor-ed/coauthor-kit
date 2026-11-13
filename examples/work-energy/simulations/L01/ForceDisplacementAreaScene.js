import { DomSimulation } from 'simulations/base/DomSimulation.js';
import { simTag } from 'simulations/base/SimUi.js';

const W = 560;

const F_MAX = 50; // N - the force dial's top
const F_START = 10; // N - the slide's own example
const D_MAX = 4; // m
const D_START = 1; // m

// The varying profile peaks at 1.5F, so the axis runs to 1.5 x F_MAX: at 50 N
// the steady line sits two thirds up and the 75 N peak lands exactly on the
// top gridline, with no profile ever leaving the plot. Both modes share it, so
// the two shapes are read against one scale.
const F_AXIS = 1.5 * F_MAX;

// The varying profile peaks at 1.5F and runs flat over the middle third, which
// makes its area exactly F x d - same number as the rectangle, different shape.
const PEAK = 1.5;

const VW = 340; // svg viewBox width
const VH = 236; // svg viewBox height
const PAD_L = 44; // room for the force tick numbers
const PAD_R = 12;
const PAD_T = 26; // room for the two axis titles
const PAD_B = 34; // room for the distance tick numbers

const PLOT_R = VW - PAD_R;
const PLOT_B = VH - PAD_B;

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }], // a flat line and a rectangle
  [{ idx: 1, dwellMs: null }], // the push is not steady
  [{ idx: 2, dwellMs: null }], // both modes stay reachable
];

const CSS = `
.fda-graph { display: grid; grid-template-columns: minmax(0, 1fr) 178px; gap: var(--sim-space-3); align-items: start; }
.fda-svg { width: 100%; height: auto; display: block; }
.fda-plot { fill: var(--sim-bg-cell); stroke: var(--sim-stroke); stroke-width: 1.5; }
.fda-axis { stroke: var(--sim-stroke); stroke-width: 2; stroke-linecap: round; }
.fda-tick { stroke: var(--sim-stroke); stroke-width: 1; opacity: 0.45; }
.fda-fill { fill: var(--sim-accent); opacity: 0.3; }
.fda-line { fill: none; stroke: var(--sim-accent); stroke-width: 3; stroke-linejoin: round; stroke-linecap: round; }
.fda-guide { stroke: var(--sim-accent); stroke-width: 1.5; stroke-dasharray: 5 4; opacity: 0.8; }
.fda-end { stroke: var(--sim-accent); stroke-width: 3; stroke-linecap: round; }
.fda-txt { fill: var(--sim-label-muted); font-size: 14px; font-variant-numeric: tabular-nums; }
.fda-txt--hi { fill: var(--sim-label); font-size: 14px; font-weight: 700; }
.fda-txt--title { fill: var(--sim-label); font-size: 14px; font-weight: 700; }
.fda-chip { fill: var(--sim-bg-surface); stroke: var(--sim-accent); stroke-width: 1.5; }
.fda-ink { fill: var(--sim-gold); }
.fda-face { fill: var(--sim-bg-deep); }
.fda-ink-line { fill: none; stroke: var(--sim-bg-deep); stroke-width: 2.2; stroke-linecap: round; }
.fda-shadow { fill: var(--sim-stroke); opacity: 0.4; }
.fda-read { display: flex; flex-direction: column; gap: var(--sim-space-1); padding: var(--sim-space-2); border: 2px solid var(--sim-stroke); border-radius: var(--sim-radius-md); }
.fda-read-label { font-size: var(--sim-text-sm); color: var(--sim-label-muted); }
.fda-read-val { font-size: var(--sim-text-2xl); font-weight: 800; font-variant-numeric: tabular-nums; }
.fda-read-factors { font-size: var(--sim-text-md); font-weight: 700; font-variant-numeric: tabular-nums; }
.fda-read-fact { font-size: var(--sim-text-sm); color: var(--sim-label); }
.fda-controls { display: flex; flex-direction: column; gap: var(--sim-space-2); margin-top: var(--sim-space-3); }
.fda-slider { display: grid; grid-template-columns: 112px minmax(0, 1fr) 68px; gap: var(--sim-space-2); align-items: center; }
.fda-slider label { font-size: var(--sim-text-sm); color: var(--sim-label-muted); }
.fda-slider input[type="range"] { width: 100%; }
.fda-val { font-size: var(--sim-text-md); font-weight: 700; font-variant-numeric: tabular-nums; text-align: right; }
.fda-modes { display: flex; gap: var(--sim-space-2); align-items: center; }
.fda-mode { padding: 8px 14px; border: 2px solid var(--sim-stroke); border-radius: var(--sim-radius-pill); background: var(--sim-bg-surface); color: var(--sim-label); font-size: var(--sim-text-md); font-weight: 600; cursor: pointer; }
.fda-mode--on { border-color: var(--sim-accent); background: var(--sim-accent); color: var(--sim-bg-deep); }
.sim-dom-root--portrait .fda-graph { grid-template-columns: minmax(0, 1fr); }
.sim-dom-root--portrait .fda-slider { grid-template-columns: minmax(0, 1fr); }
`;

const x = (frac) => PAD_L + frac * (PLOT_R - PAD_L);
const y = (f) => PLOT_B - (f / F_AXIS) * (PLOT_B - PAD_T);

// The force profile as [fraction of the shaded width, force] pairs. The width
// is the displacement, so the region is exactly as wide as the object travelled.
function profile(varying, f) {
  if (!varying) return [[0, f], [1, f]];
  return [[0, 0], [1 / 3, f * PEAK], [2 / 3, f * PEAK], [1, 0]];
}

function areaJ(varying, f, d) {
  // Exact: the trapezoid's pieces, so the two modes really do agree.
  if (!varying) return f * d;
  const third = d / 3;
  return 0.5 * third * (f * PEAK) + third * (f * PEAK) + 0.5 * third * (f * PEAK);
}

function round(n) {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

// The trolley the slide talks about ("you lean into a trolley, then ease off,
// then lean again"): it stands on the distance axis at the end of the shaded
// width, so the width on the page is a thing that travelled. A face gives the
// scene one character, and the push arrow behind it points the way it went.
function trolley(cx, ground) {
  const s = `
  <ellipse class="fda-shadow" cx="${(cx).toFixed(1)}" cy="${(ground - 1).toFixed(1)}" rx="24" ry="4"/>
  <g>
    <path class="fda-ink-line" d="M ${(cx - 30).toFixed(1)} ${(ground - 20).toFixed(1)} h 15 m -5 -6 l 6 6 l -6 6"/>
    <rect class="fda-ink" x="${(cx - 21).toFixed(1)}" y="${(ground - 27).toFixed(1)}" width="42" height="20" rx="6"/>
    <rect class="fda-ink" x="${(cx - 15).toFixed(1)}" y="${(ground - 35).toFixed(1)}" width="30" height="10" rx="4"/>
    <circle class="fda-ink" cx="${(cx - 11).toFixed(1)}" cy="${(ground - 4).toFixed(1)}" r="6"/>
    <circle class="fda-ink" cx="${(cx + 11).toFixed(1)}" cy="${(ground - 4).toFixed(1)}" r="6"/>
    <circle class="fda-face" cx="${(cx - 8).toFixed(1)}" cy="${(ground - 19).toFixed(1)}" r="3.4"/>
    <circle class="fda-face" cx="${(cx + 8).toFixed(1)}" cy="${(ground - 19).toFixed(1)}" r="3.4"/>
    <path class="fda-ink-line" d="M ${(cx - 6).toFixed(1)} ${(ground - 12).toFixed(1)} q 6 5 12 0"/>
  </g>`;
  return s;
}

function svg(f, d, varying) {
  const w = Math.max(0, (d / D_MAX) * (PLOT_R - PAD_L)); // the shaded width
  const pts = profile(varying, f);
  const poly = pts.map(([fr, fv]) => `${(x(0) + fr * w).toFixed(1)},${y(fv).toFixed(1)}`).join(' ');
  const area = `${x(0)},${PLOT_B} ${poly} ${(x(0) + w).toFixed(1)},${PLOT_B}`;
  const peakF = varying ? f * PEAK : f;
  const peakY = y(peakF);
  const endX = x(0) + w;

  // The reading of the line's height, on an opaque chip inside the plot: the
  // dashed guide ties the chip to the height, so the number and the line are
  // read as one thing. It sits below the line when there is no room above it,
  // and is clamped inside the plot so it never reaches the axis titles.
  const chipText = varying ? `${round(peakF)} N peak` : `${f} N`;
  const chipW = chipText.length * 8.6 + 18;
  const chipX = PAD_L + 8;
  const above = peakY - 30;
  const chipY = above >= PAD_T + 6 ? above : Math.min(peakY + 8, PLOT_B - 26);

  const yTicks = [0, 25, 50, 75];
  const dTicks = [0, 1, 2, 3, 4];

  return `<svg class="fda-svg" viewBox="0 0 ${VW} ${VH}" role="img" aria-label="Force against displacement. The height of the line is the force, the width along the bottom is the distance, and the area under the line is the work in joules.">
    <text class="fda-txt--title" x="4" y="14">force (N)</text>
    <text class="fda-txt--title" x="${VW - 4}" y="14" text-anchor="end">distance (m)</text>
    <rect class="fda-plot" x="${PAD_L}" y="${PAD_T}" width="${PLOT_R - PAD_L}" height="${PLOT_B - PAD_T}" rx="6"/>
    ${yTicks.map((v) => `<line class="fda-tick" x1="${PAD_L}" y1="${y(v).toFixed(1)}" x2="${PLOT_R}" y2="${y(v).toFixed(1)}"/>`).join('')}
    ${dTicks.map((v) => `<line class="fda-tick" x1="${x(v / D_MAX).toFixed(1)}" y1="${PLOT_B}" x2="${x(v / D_MAX).toFixed(1)}" y2="${PLOT_B + 6}"/>`).join('')}
    <polygon class="fda-fill" points="${area}"/>
    <line class="fda-guide" x1="${PAD_L}" y1="${peakY.toFixed(1)}" x2="${PLOT_R}" y2="${peakY.toFixed(1)}"/>
    <polyline class="fda-line" points="${poly}"/>
    <line class="fda-end" x1="${endX.toFixed(1)}" y1="${PLOT_B - 7}" x2="${endX.toFixed(1)}" y2="${PLOT_B}"/>
    ${trolley(Math.max(endX, PAD_L + 30), PLOT_B)}
    <rect class="fda-chip" x="${chipX.toFixed(1)}" y="${chipY.toFixed(1)}" width="${chipW.toFixed(1)}" height="24" rx="8"/>
    <text class="fda-txt--hi" x="${(chipX + 9).toFixed(1)}" y="${(chipY + 17).toFixed(1)}">${chipText}</text>
    ${yTicks.map((v) => `<text class="fda-txt" x="${PAD_L - 8}" y="${(y(v) + 5).toFixed(1)}" text-anchor="end">${v}</text>`).join('')}
    ${dTicks.map((v) => `<text class="fda-txt" x="${x(v / D_MAX).toFixed(1)}" y="${PLOT_B + 20}" text-anchor="middle">${v}</text>`).join('')}
  </svg>`;
}

export class ForceDisplacementAreaScene extends DomSimulation {
  static WIDTH = W;
  static HEIGHT = 420; // sim-layout tallest beat 399 + padding
  static PORTRAIT_WIDTH = 380;
  static PORTRAIT_HEIGHT = 688; // sim-layout portrait beat 674 + padding
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static ARIA_LABEL = 'A force against displacement graph with the area under the line shaded, and the area in joules beside it.';
  static CONTROLS = [];

  async setup() {
    await super.setup();
    this.render({
      css: CSS,
      html: `<div class="sim-card">
        <div class="fda-graph">
          <div data-graph></div>
          <div class="fda-read">
            <span class="fda-read-label">Work = the shaded area</span>
            <span class="fda-read-val" data-area>0 J</span>
            <span class="fda-read-factors" data-factors></span>
            <span class="fda-read-fact" data-facts></span>
          </div>
        </div>
        <div class="fda-controls">
          <div class="fda-slider">
            <label for="fda-f">Force</label>
            <input id="fda-f" class="fda-input fda-input--f" type="range" min="0" max="${F_MAX}" step="1" value="${F_START}">
            <span class="fda-val" data-val-f>${F_START} N</span>
          </div>
          <div class="fda-slider">
            <label for="fda-d">Displacement</label>
            <input id="fda-d" class="fda-input fda-input--d" type="range" min="0" max="${D_MAX}" step="0.5" value="${D_START}">
            <span class="fda-val" data-val-d>${D_START} m</span>
          </div>
          <div class="fda-modes">
            <span class="fda-read-label">Push</span>
            <button class="fda-mode fda-mode--on" type="button" data-mode="steady">Steady</button>
            <button class="fda-mode" type="button" data-mode="varying">Varying</button>
            ${simTag('same rule both ways')}
          </div>
        </div>
      </div>`,
    });

    this._graph = this.root?.querySelector('[data-graph]');
    this._area = this.root?.querySelector('[data-area]');
    this._factors = this.root?.querySelector('[data-factors]');
    this._facts = this.root?.querySelector('[data-facts]');
    this._dialF = this.root?.querySelector('.fda-input--f');
    this._dialD = this.root?.querySelector('.fda-input--d');
    this._varying = false;

    // The harness DOM has no HTML parser, so these are null there and present in
    // a browser; optional chaining keeps the scene at rest either way.
    this._dialF?.addEventListener('input', () => this._paint());
    this._dialD?.addEventListener('input', () => this._paint());
    for (const m of ['steady', 'varying']) {
      this.root?.querySelector(`[data-mode="${m}"]`)?.addEventListener('click', () => this._setMode(m === 'varying'));
    }
    this._paint();
  }

  onStep() {
    // Nothing is hidden or disabled on any beat - both modes stay reachable.
    this._paint();
  }

  _setMode(varying) {
    this._varying = varying;
    for (const m of ['steady', 'varying']) {
      const b = this.root?.querySelector(`[data-mode="${m}"]`);
      if (b) b.className = m === (varying ? 'varying' : 'steady') ? 'fda-mode fda-mode--on' : 'fda-mode';
    }
    this._paint();
  }

  _f() {
    const v = this._dialF ? Number(this._dialF.value) : F_START;
    return Number.isFinite(v) ? v : F_START;
  }

  _d() {
    const v = this._dialD ? Number(this._dialD.value) : D_START;
    return Number.isFinite(v) ? v : D_START;
  }

  _paint() {
    const f = this._f();
    const d = this._d();
    const j = areaJ(this._varying, f, d);
    if (this._graph) this._graph.innerHTML = svg(f, d, this._varying);
    if (this._area) this._area.textContent = `${round(j)} J`;
    // Both factors of the product, written out, so the product is a product.
    if (this._factors) this._factors.textContent = `${f} N \u00D7 ${d} m`;
    const vf = this.root?.querySelector('[data-val-f]');
    const vd = this.root?.querySelector('[data-val-d]');
    if (vf) vf.textContent = `${f} N`;
    if (vd) vd.textContent = `${d} m`;
    if (this._facts) {
      this._facts.textContent = this._varying
        ? `Peak ${round(f * PEAK)} N, but the average is ${f} N.`
        : 'A rectangle: height \u00D7 width.';
    }
  }

  destroy() {
    this._graph = null;
    this._area = null;
    this._factors = null;
    this._facts = null;
    this._dialF = null;
    this._dialD = null;
    super.destroy();
  }
}
