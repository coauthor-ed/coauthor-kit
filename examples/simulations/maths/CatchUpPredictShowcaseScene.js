/**
 * CatchUpPredictShowcaseScene - predict-then-observe on the grade-9 catch-up
 * visual (linear-polynomials L01): Car A starts 60 km ahead at 40 km/h, Car B
 * starts at 0 at 60 km/h. Before any line is drawn the learner commits to WHEN B
 * catches A; only then do the lines run and the answer (3 h, 180 km) appear.
 *
 *   predictGate (SimPredict)   the commit step, the verdict, the celebrate / oops
 *   chartFrame + traceCanvas   the graph, drawn only after the reveal
 *
 * Beats (1). A Guess select control is the keyboard path to the same gate.
 */
import { SimScene } from 'simulations/base/kit/SimScene.js';
import { drawBackdrop, pill, chipColumn } from 'simulations/base/kit/SimLook.js';
import { chartFrame } from 'simulations/base/kit/SimChartSpec.js';
import { axesCanvas, traceCanvas } from 'simulations/base/kit/SimChartCanvas.js';
import { predictGate } from 'simulations/base/kit/SimPredict.js';

const FR = chartFrame({
  rect: { x: 16, y: 70, w: 648, h: 340 },
  x: { min: 0, max: 5, ticks: [0, 1, 2, 3, 4, 5], label: 'Time (hours)' },
  y: { min: 0, max: 300, ticks: [0, 60, 120, 180, 240, 300], label: 'Distance (km)' },
});
const OPTIONS = [{ id: '2', text: 'after 2 hours' }, { id: '3', text: 'after 3 hours' }, { id: '4', text: 'after 4 hours' }, { id: '5', text: 'never' }];

export class CatchUpPredictShowcaseScene extends SimScene {
  static BEAT_STEP_MAP = [[{ idx: 0, dwellMs: null }]];
  static ARIA_LABEL =
    'A prediction first: Car A starts 60 kilometres ahead at 40 kilometres per hour and Car B starts at zero at 60 kilometres per hour. ' +
    'Choose when Car B catches Car A, or never. Then the distance-time lines are drawn and show the answer: after 3 hours, at 180 kilometres.';
  static CONTROLS = [{ type: 'select', id: 'guess', label: 'Your guess:', options: OPTIONS.map((o) => ({ value: o.id, label: o.text })) }];

  constructor(container, config) {
    super(container, config);
    this.t = 0;
    this.gate = predictGate(this, {
      prompt: 'Car A is 60 km ahead at 40 km/h. Car B starts at 0 at 60 km/h. When does B catch A?',
      options: OPTIONS, answer: '3', at: { x: 340, y: 470 }, revealAfter: 0.6,
    });
  }

  enter() { this.t = 0; this.gate.reset(); }
  isControlDisabled() { return this.gate.locked; }
  getControlValue(id) { return id === 'guess' ? this.gate.choice ?? OPTIONS[0].id : undefined; }
  onControlChange(id, v) { if (id === 'guess' && this._guard(id)) this.gate.choose(v); }
  pointerDown(p) { return this.gate.pointerDown(p); }
  busy() { return this.gate.busy || (this.gate.revealed && this.t < 3); }
  update(d) { if (this.gate.revealed) this.t = Math.min(3, this.t + d * 1.2); }

  draw(ctx, c) {
    drawBackdrop(ctx, c, 'dots');
    axesCanvas(ctx, c, FR, {});
    const t = this.t;
    if (this.gate.revealed) {
      chipColumn(ctx, c, [{ text: 'A: 40 km/h, starts at 60 km', bg: c.s1 }, { text: 'B: 60 km/h, starts at 0', bg: c.s6 }], FR.plot.x + 12, FR.plot.y + 8, { size: 14, gap: 6 });
      traceCanvas(ctx, c, FR, [{ x: 0, y: 60 }, { x: t, y: 60 + 40 * t }], { tone: 1, width: 5 });
      traceCanvas(ctx, c, FR, [{ x: 0, y: 0 }, { x: t, y: 60 * t }], { tone: 6, width: 5 });
      if (t >= 2.995) pill(ctx, c, 'Caught up: 3 h, 180 km', FR.px(3) + 100, FR.py(180) + 70, { bg: c.warning, size: 15 });
    } else {
      pill(ctx, c, this.gate.locked ? 'Drawing the lines...' : 'Decide first, then watch.', FR.plot.x + FR.plot.w / 2, FR.plot.y + FR.plot.h / 2, { bg: c.stroke, ink: c.label, size: 16 });
    }
    this.gate.draw(ctx, c);
  }
}
