/**
 * ShapeKitCanvasShowcaseScene - reference for the CANVAS renderers of the shape kits: a draggable number line
 * (SimNumberLineSpec + SimNumberLineCanvas) over a chart with bars, a trace and a right axis (SimChartSpec +
 * SimChartCanvas). The spec is the one the SVG renderers draw, so moving between SvgScene and SimScene changes
 * imports, not geometry. One beat: drag the pin; the bars and trace follow.
 */
import { SimScene } from 'simulations/base/kit/SimScene.js';
import { drawBackdrop } from 'simulations/base/kit/SimLook.js';
import { numberLine } from 'simulations/base/kit/SimNumberLineSpec.js';
import { numberLineCanvas, markerCanvas, spanCanvas, hitMarker } from 'simulations/base/kit/SimNumberLineCanvas.js';
import { chartFrame } from 'simulations/base/kit/SimChartSpec.js';
import { axesCanvas, barsCanvas, traceCanvas } from 'simulations/base/kit/SimChartCanvas.js';

const NL = numberLine({ rect: { x: 20, y: 6, w: 640, h: 200 }, min: 0, max: 2, step: 1, minor: 4, labels: 'frac', at: 0.5 });
const FR = chartFrame({
  rect: { x: 20, y: 220, w: 640, h: 285 },
  x: { cats: ['a quarter', 'a half', 'three quarters', 'a whole'], label: 'part of one' },
  y: { min: 0, max: 100, label: 'percent' },
  rightPad: 62,
});

export class ShapeKitCanvasShowcaseScene extends SimScene {
  static BEAT_STEP_MAP = [[{ idx: 0, dwellMs: null }]];
  static ARIA_LABEL = 'A number line from 0 to 2 in quarters with a draggable pin, above a bar chart of percent that follows the pin.';

  constructor(container, config) {
    super(container, config);
    this.v = 0.75;
    this.drag = false;
    this.hit = null;
  }

  busy() { return this.drag; }

  pointerDown(p) { if (this.hit && hitMarker(this.hit, p.x, p.y, 8)) { this.drag = true; return true; } return false; }
  pointerMove(p) { if (!this.drag) return false; this.v = NL.snap(p.x); return true; }
  pointerUp() { this.drag = false; }

  draw(ctx, c) {
    drawBackdrop(ctx, c, 'dots');
    numberLineCanvas(ctx, c, NL);
    if (this.v > 0) spanCanvas(ctx, c, NL, 0, this.v, { tone: 2, text: Math.round(this.v * 100) + '%', drop: 66 });
    this.hit = markerCanvas(ctx, c, NL, this.v, { tone: 'accent', grab: true, lift: 46 });
    axesCanvas(ctx, c, FR, { right: { min: 0, max: 1, label: 'fraction', fmt: (v) => v.toFixed(1) } });
    const pct = Math.min(100, this.v * 50);
    barsCanvas(ctx, c, FR, [25, 50, 75, 100].map((v, i) => ({ x: i, v, tone: v <= pct + 0.01 ? 3 : 8 })));
    traceCanvas(ctx, c, FR, [{ x: 0, y: 25 }, { x: 1, y: 50 }, { x: 2, y: 75 }, { x: 3, y: pct }], { tone: 1, end: false, width: 4 });
  }
}
