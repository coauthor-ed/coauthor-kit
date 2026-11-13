/**
 * HarappanTimelineShowcaseScene - the kit version of the grade-9 history visual
 * "The Suspiciously Tidy City" (early-humans L07, HarappanPhaseTimelineScene): five
 * phases on a proportional axis from 7000 to 1000 BCE; the planned cities (Mature
 * Harappan) are only about 700 years of a much longer run-up. Canvas, so the
 * strip can animate and live inside a SimScene; the DOM board is SimTimeline.
 *
 *   timelineAxis + timelineCanvas (SimTimelineCanvas)   bands, ticks, event tags in lanes, brackets
 *   (bracket labels are DERIVED from the years by fmtSpan inside timelineCanvas)
 *
 * Beats (5): 0 the grid city, ghosted; 1 Neolithic + Chalcolithic light up; 2 Early Harappan;
 * 3 Mature + Late; 4 the brackets: the run-up against the urban phase.
 * Finding while building it: the original's header and caption call 7000-2600 BCE "3,000-year";
 * derived from its own dates it is 4,400 years. This scene prints the derived number.
 */
import { SimScene } from 'simulations/base/kit/SimScene.js';
import { drawBackdrop } from 'simulations/base/kit/SimLook.js';
import { timelineAxis, timelineCanvas } from 'simulations/base/kit/SimTimelineCanvas.js';

const PHASES = [
  { from: -7000, to: -4500, label: 'Neolithic', tone: 5, tags: [[-6200, 'First farming villages']] },
  { from: -4500, to: -3300, label: 'Chalcolithic', tone: 8, tags: [[-3900, 'Copper and stone tools']] },
  { from: -3300, to: -2600, label: 'Early Harappan', tone: 2, tags: [[-3000, 'Walls, beads, graffiti']] },
  { from: -2600, to: -1900, label: 'Mature Harappan', tone: 3, tags: [[-2250, 'Standard city grids']] },
  { from: -1900, to: -1300, label: 'Late Harappan', tone: 6, tags: [[-1600, 'Cities fade, regions diverge']] },
];
const LIT_AT = [[3], [0, 1], [0, 1, 2], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4]];   // phases lit on each beat (beat 0: only the grid city, ghosted below)
const TL = timelineAxis({ rect: { x: 12, y: 40, w: 656, h: 440 }, from: -7000, to: -1000, ticks: [-7000, -6000, -5000, -4000, -3000, -2000, -1000], at: 0.62 });

export class HarappanTimelineShowcaseScene extends SimScene {
  static BEAT_STEP_MAP = LIT_AT.map((_, i) => [{ idx: i, dwellMs: null }]);
  static ARIA_LABEL =
    'A timeline from 7000 to 1000 BCE with five phases drawn to scale: Neolithic, Chalcolithic, Early Harappan, Mature Harappan and Late Harappan. ' +
    'Phases light up beat by beat with a tag each. At the end two brackets compare the long run-up before the cities with the 700 years of the planned cities.';

  constructor(container, config) {
    super(container, config);
    this.lit = PHASES.map(() => 0);
  }
  enter() { /* lit values ease in update() */ }
  busy() { return PHASES.some((_, i) => Math.abs(this.lit[i] - (LIT_AT[this.stage]?.includes(i) ? 1 : 0)) > 0.01); }
  update(d) {
    PHASES.forEach((_, i) => {
      const goal = LIT_AT[this.stage]?.includes(i) ? 1 : 0;
      this.lit[i] += (goal - this.lit[i]) * Math.min(1, d * 6);
    });
  }

  draw(ctx, c) {
    drawBackdrop(ctx, c, 'dots');
    const st = this.stage;
    timelineCanvas(ctx, c, TL, {
      eras: PHASES.map((p, i) => ({ from: p.from, to: p.to, label: p.label, tone: p.tone, a: this.lit[i] * 0.9 + (st === 0 && i === 3 ? 0.1 : 0) })),
      events: PHASES.flatMap((p, i) => p.tags.map(([at, label]) => ({ at, label, tone: p.tone, a: this.lit[i] }))),
      spans: st === 4 ? [
        { from: -7000, to: -2600, tone: 'accent' },
        { from: -2600, to: -1900, tone: 3 },
      ] : [],
    });
    if (st === 0) {
      // the question the lesson opens with: what came before the grid?
      ctx.save(); ctx.fillStyle = c.label; ctx.font = '800 40px ' + c.fontDisplay; ctx.textAlign = 'center';
      ctx.fillText('?', TL.x(-4800), TL.y - 60);
      ctx.restore();
    }
  }
}
