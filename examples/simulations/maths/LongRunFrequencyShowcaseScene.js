/**
 * LongRunFrequencyShowcaseScene - the kit version of the grade-9 probability
 * visual "the long run settles" (probability L02, LongRunFrequencyScene): draw from
 * a bag of 3 red and 2 blue (replaced each time) and plot the running fraction of
 * red. After 5 draws it is far from 0.6; after 150 it has settled near it.
 * The frequency EMERGES from seeded trials instead of being scripted:
 *   trialRun (SimChanceTrials)               the draws, the running series, counts
 *   chartFrame + axesCanvas + traceCanvas    the line, with the true 0.6 as the target
 *   trialStripCanvas                         the latest draws as red / blue dots
 *
 * Beats (4): 5 draws, 25 draws, 150 draws, the name for it (Law of Large Numbers).
 * Control: New run (a fresh seed; never crypto).
 */
import { SimScene } from 'simulations/base/kit/SimScene.js';
import { drawBackdrop, pill } from 'simulations/base/kit/SimLook.js';
import { chartFrame } from 'simulations/base/kit/SimChartSpec.js';
import { axesCanvas, traceCanvas } from 'simulations/base/kit/SimChartCanvas.js';
import { trialRun, trialStripCanvas } from 'simulations/base/kit/SimChanceTrials.js';

const TRUE_P = 0.6, MAX = 150, RATE = 26;
const TARGETS = [5, 25, MAX, MAX];
const FR = chartFrame({
  rect: { x: 16, y: 56, w: 648, h: 330 },
  x: { min: 0, max: MAX, ticks: [0, 30, 60, 90, 120, 150], label: 'Draws' },
  y: { min: 0, max: 1, ticks: [0, 0.25, 0.5, 0.75, 1], label: 'Fraction red' },
});
const newRun = (seed) => trialRun({ seed, n: MAX, draw: (rnd) => (rnd() < TRUE_P ? 'red' : 'blue') });

export class LongRunFrequencyShowcaseScene extends SimScene {
  static BEAT_STEP_MAP = TARGETS.map((_, i) => [{ idx: i, dwellMs: null }]);
  static ARIA_LABEL =
    'A running chart of the fraction of red draws from a bag of 3 red and 2 blue balls, replaced each time. After 5 draws it is far from 0.6; ' +
    'after 25 it still wobbles; after 150 draws it has settled near the true 0.6. A strip shows the latest draws. A button starts a new run.';
  static CONTROLS = [{ type: 'button', id: 'again', label: 'New run' }];

  constructor(container, config) {
    super(container, config);
    this.seed = 11; this.run = newRun(this.seed); this.shown = 0; this.goal = TARGETS[0];
  }

  enter(stage) { this.goal = TARGETS[stage] ?? MAX; if (stage === 0) this.shown = 0; }
  onControlChange(id) {
    if (!this._guard(id) || id !== 'again') return;
    this.seed = (this.seed * 7919 + 13) % 100003; this.run = newRun(this.seed); this.shown = 0;
    this.requestUiUpdate?.();
  }
  busy() { return this.shown < this.goal; }
  update(d) { this.shown = Math.min(this.goal, this.shown + RATE * d); }

  draw(ctx, c) {
    drawBackdrop(ctx, c, 'dots');
    const k = Math.floor(this.shown), red = this.run.count('red', k);
    axesCanvas(ctx, c, FR, {});
    traceCanvas(ctx, c, FR, this.run.series('red', k), { tone: 1, width: 4, target: TRUE_P, targetText: 'true: 0.6 (3 of 5 red)', end: k > 0 });
    trialStripCanvas(ctx, c, this.run, { upTo: k, rect: { x: 20, y: 404, w: 640, h: 36 }, last: 30, tones: { red: 6, blue: 1 } });
    pill(ctx, c, k + ' draws: ' + red + ' red = ' + (k ? (red / k).toFixed(2) : '-'), 340, 470, { bg: c.accent, size: 17 });
    if (this.stage === 3) pill(ctx, c, 'Law of Large Numbers: the fraction settles toward the true chance', 340, 22, { bg: c.warning, size: 15 });
  }
}
