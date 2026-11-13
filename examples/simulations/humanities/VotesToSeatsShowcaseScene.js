/**
 * VotesToSeatsShowcaseScene - the kit version of the grade-9 elections visual
 * "FPTP and disproportion" (sst/elections L02, FptpDisproportionSim): three
 * parties split the votes; under first-past-the-post the one with the most votes
 * takes the seat, so in a 25-seat model the winner's seat share can be far above
 * its vote share. Two bar charts on the SAME 0-100 scale, votes on the left and
 * seats on the right, so the mismatch is the picture.
 *
 *   chartFrame + axesCanvas + barsCanvas   both charts (canvas shape kit)
 *   captionBar                             the verdict, sized to its text
 *   wrapText helpers via captionBar        no clipped words
 *
 * Beats (3): 0 the votes (40 / 35 / 25), 1 the seats, 2 free play (sliders).
 * Controls (beat 2): Party A vote %, Party B vote %. Party C is the rest (min 5).
 */
import { SimScene } from 'simulations/base/kit/SimScene.js';
import { drawBackdrop, captionBar } from 'simulations/base/kit/SimLook.js';
import { chartFrame } from 'simulations/base/kit/SimChartSpec.js';
import { axesCanvas, barsCanvas } from 'simulations/base/kit/SimChartCanvas.js';

const NAMES = ['Party A', 'Party B', 'Party C'];
const SEATS = 25;
const mk = (x) => chartFrame({
  rect: { x, y: 96, w: 322, h: 410 },
  x: { cats: NAMES },
  y: { min: 0, max: 100, ticks: [0, 25, 50, 75, 100], label: x < 300 ? 'Share of votes (%)' : 'Seats (%), of 25 seats', fmt: (v) => String(v) },
});
const FV = mk(12), FS = mk(346);

export class VotesToSeatsShowcaseScene extends SimScene {
  static BEAT_STEP_MAP = [[{ idx: 0, dwellMs: null }], [{ idx: 1, dwellMs: null }], [{ idx: 2, dwellMs: null }]];
  static ARIA_LABEL =
    'Two bar charts on the same scale. The left shows each of three parties share of the votes; the right shows its share of ' +
    'seats in a 25-seat assembly under first-past-the-post. The party with the most votes wins every seat, so its seat share ' +
    'is far above its vote share. In free play, two sliders change the vote shares.';
  static CONTROLS = [
    { type: 'slider', id: 'vote_a', label: 'Party A vote %:', min: 20, max: 60, step: 1, value: 40 },
    { type: 'slider', id: 'vote_b', label: 'Party B vote %:', min: 15, max: 50, step: 1, value: 35 },
  ];

  constructor(container, config) {
    super(container, config);
    this.a = 40; this.b = 35;
    this.grow = 0;
  }

  enter(stage) {
    if (stage < 2) { this.a = 40; this.b = 35; }
    this.grow = 0;
  }
  isControlHidden() { return this.stage !== 2; }
  getControlValue(id) { return id === 'vote_a' ? this.a : id === 'vote_b' ? this.b : undefined; }
  onControlChange(id, v) {
    if (!this._guard(id)) return;
    if (id === 'vote_a') this.a = Math.round(Number(v));
    if (id === 'vote_b') this.b = Math.round(Number(v));
    this.requestUiUpdate?.();
  }
  busy() { return this.grow < 1; }
  update(d) { this.grow = Math.min(1, this.grow + d * 1.6); }

  shares() {
    const votes = [this.a, this.b, Math.max(5, 100 - this.a - this.b)];
    const win = votes.indexOf(Math.max(...votes));
    const seats = votes.map((_, i) => (i === win ? 100 : 0));
    return { votes, seats, win };
  }

  draw(ctx, c) {
    drawBackdrop(ctx, c, 'dots');
    const { votes, seats, win } = this.shares();
    const tone = (i) => [1, 2, 3][i];
    axesCanvas(ctx, c, FV, {});
    barsCanvas(ctx, c, FV, votes.map((v, i) => ({ x: i, v, tone: tone(i), text: v + '%' })), { grow: this.grow });
    if (this.stage >= 1) {
      axesCanvas(ctx, c, FS, {});
      barsCanvas(ctx, c, FS, seats.map((v, i) => ({ x: i, v, tone: tone(i), text: String(Math.round(v * SEATS / 100)) })), { grow: this.grow });
    }
    const msg = this.stage === 0
      ? 'Three parties split the votes. Who leads?'
      : NAMES[win] + ' leads with ' + votes[win] + '% of the votes, and takes ' + seats[win] + '% of the seats. ' + (100 - votes[win]) + '% of voters backed someone else.';
    captionBar(ctx, c, msg, 340, 12, { maxW: 640, size: 15, maxLines: 3 });
  }
}
