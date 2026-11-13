/**
 * CatchUpShowcaseScene - the kit version of the grade-9 "Catch-up Problem"
 * visual (linear-polynomials L01, TwoCarCatchupSimulation): Car A starts 60 km
 * ahead at 40 km/h, Car B starts at 0 at 60 km/h. A distance-time chart with
 * both lines sits over a track where the two cars move together; they meet at
 * (3 h, 180 km). Same numbers, same three moments; built from the canvas shape
 * kit instead of hand-drawn geometry:
 *   chartFrame + axesCanvas + traceCanvas   the graph
 *   numberLine + numberLineCanvas + markerCanvas   the track
 *   dragHandle                              grab the time knob on the graph
 *   leader + pill                           the catch-up label
 *
 * Beats (3): 0 start (t = 0), 1 one hour on, 2 the catch-up (t = 3).
 * The Time slider (all beats) and the knob on the time axis both move t.
 */
import { SimScene } from 'simulations/base/kit/SimScene.js';
import { drawBackdrop, pill, chipColumn, leader, rr, alpha } from 'simulations/base/kit/SimLook.js';
import { chartFrame } from 'simulations/base/kit/SimChartSpec.js';
import { axesCanvas, traceCanvas } from 'simulations/base/kit/SimChartCanvas.js';
import { numberLine } from 'simulations/base/kit/SimNumberLineSpec.js';
import { numberLineCanvas, markerCanvas } from 'simulations/base/kit/SimNumberLineCanvas.js';
import { dragHandle } from 'simulations/base/kit/SimDrag.js';

const A0 = 60, A_SPEED = 40, B_SPEED = 60, T_MAX = 5;
const distA = (t) => A0 + A_SPEED * t;
const distB = (t) => B_SPEED * t;
const BEAT_T = [0, 1, 3];

const FR = chartFrame({
  rect: { x: 16, y: 8, w: 648, h: 282 },
  x: { min: 0, max: T_MAX, ticks: [0, 1, 2, 3, 4, 5], label: 'Time (hours)' },
  y: { min: 0, max: 300, ticks: [0, 60, 120, 180, 240, 300], label: 'Distance (km)' },
});
const TRACK = numberLine({ rect: { x: 16, y: 296, w: 648, h: 224 }, min: 0, max: 300, step: 60, labels: 'int', at: 0.62, pad: 40 });

export class CatchUpShowcaseScene extends SimScene {
  static BEAT_STEP_MAP = BEAT_T.map((_, i) => [{ idx: i, dwellMs: null }]);
  static ARIA_LABEL =
    'A distance-time graph with two lines: Car A starts 60 kilometres ahead at 40 kilometres per hour, Car B starts at ' +
    'zero at 60 kilometres per hour. Below it, a track shows both cars. The lines cross at 3 hours and 180 kilometres, ' +
    'where Car B catches Car A. A slider and a knob on the graph set the time.';
  static CONTROLS = [{ type: 'slider', id: 'time', label: 'Time (t hours):', min: 0, max: T_MAX, step: 0.1, value: 0 }];

  constructor(container, config) {
    super(container, config);
    this.t = 0;
    this.target = 0;
    this.knob = dragHandle({
      at: () => ({ x: FR.px(this.t), y: FR.plot.y + FR.plot.h }),
      radius: 26,
      bounds: { x: FR.px(0), y: FR.plot.y + FR.plot.h, w: FR.px(T_MAX) - FR.px(0), h: 0 },
      snap: (p) => ({ x: FR.px(Math.round(FR.vx(p.x) * 10) / 10), y: p.y }),
      onMove: (p) => { this.t = this.target = FR.vx(p.x); this.requestUiUpdate?.(); },
    });
  }

  enter(stage) { this.target = BEAT_T[stage] ?? 0; }
  getControlValue(id) { return id === 'time' ? this.target : undefined; }
  onControlChange(id, v) { if (id === 'time') this.target = Math.max(0, Math.min(T_MAX, Number(v))); }
  busy() { return Math.abs(this.t - this.target) > 0.005 || this.knob.dragging; }
  pointerDown(p) { return this.knob.down(p); }
  pointerMove(p) { return this.knob.move(p); }
  pointerUp(p) { this.knob.up(p); }

  update(d) {
    const gap = this.target - this.t;
    this.t = Math.abs(gap) < 0.01 ? this.target : this.t + gap * Math.min(1, d * 4);
  }

  draw(ctx, c) {
    drawBackdrop(ctx, c, 'dots');
    const t = this.t;
    axesCanvas(ctx, c, FR, {});
    // legend, in the empty top-left of the plot
    chipColumn(ctx, c, [
      { text: 'A: 40 km/h, starts at 60 km', bg: c.s1 },
      { text: 'B: 60 km/h, starts at 0', bg: c.s6 },
    ], FR.plot.x + 12, FR.plot.y + 8, { size: 14, gap: 6 });
    traceCanvas(ctx, c, FR, [{ x: 0, y: distA(0) }, { x: t, y: distA(t) }], { tone: 1, width: 5 });
    traceCanvas(ctx, c, FR, [{ x: 0, y: distB(0) }, { x: t, y: distB(t) }], { tone: 6, width: 5 });
    if (t >= 2.995) {
      const mx = FR.px(3), my = FR.py(180);
      ctx.beginPath(); ctx.arc(mx, my, 9, 0, Math.PI * 2); ctx.fillStyle = c.label; ctx.fill();
      leader(ctx, mx + 70, my + 78, mx + 6, my + 5, c.warning, 1, 0, { frame: { x: 0, y: 0, w: 680, h: 520 } });
      pill(ctx, c, 'Catch-up: 3 h, 180 km', mx + 130, my + 84, { bg: c.warning, size: 15 });
    }
    // time knob on the axis
    const kx = FR.px(t), ky = FR.plot.y + FR.plot.h;
    ctx.strokeStyle = alpha(c.label, 0.5); ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(kx, FR.py(Math.max(distA(t), distB(t)))); ctx.lineTo(kx, ky); ctx.stroke(); ctx.setLineDash([]);
    rr(ctx, kx - 14, ky - 9, 28, 18, 9); ctx.fillStyle = c.accent; ctx.fill();
    // the track
    numberLineCanvas(ctx, c, TRACK, { labelSize: 15 });
    markerCanvas(ctx, c, TRACK, Math.min(300, distB(t)), { tone: 6, text: 'B', lift: 92 });
    markerCanvas(ctx, c, TRACK, Math.min(300, distA(t)), { tone: 1, text: 'A', lift: 40 });
    pill(ctx, c, 'km from the start', 580, 507, { bg: c.stroke, size: 14, ink: c.label });
  }
}
