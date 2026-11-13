/**
 * EnergyCastShowcaseScene - reference for the energy cast: SimEnergy (energy bars
 * with a total line and an anchor leader, a work counter) and SimApparatus (a
 * wall-mounted spring, a pendulum with a level line and marked points, a lever
 * plank with seats, a sack and a school bag, stairs with a rail and a height
 * bracket, bar magnets, charges, a ball; on beat 3 a crate and a carton, stairs
 * stacked on the carton with no contact shadow, a dashed displacement arrow and a
 * gulel drawn back with a stone). Every number here is sample data.
 *
 * Beats (3): the spring at rest, squashed, then released (the ball rolls off);
 * the pendulum at its three marks; the plank tips one way, levels, tips the other.
 * Beat 3 swaps the stairs, sack, bag and counter corner for the crate, gulel and arrow.
 */
import { SimScene } from 'simulations/base/kit/SimScene.js';
import { drawBackdrop, drawFloor, clamp01, lerp, outBack } from 'simulations/base/kit/SimLook.js';
import { drawEnergyBars, barsAt, drawWorkCounter } from 'simulations/base/kit/SimEnergy.js';
import { drawSpring, drawPendulum, drawLeverPlank, drawSack, drawStairs, drawMagnet, drawCharge, drawBall,
  displacementArrow, drawCrate, drawGulel } from 'simulations/base/kit/SimApparatus.js';

const GROUND = 492;
const SPRING = [
  { len: 150, ball: 0, bars: { K: 0, U: 0, heat: 0 }, work: 'W = 0 J' },
  { len: 86, ball: 0, bars: { K: 0, U: 12, heat: 0 }, work: 'W = 12 J' },
  { len: 150, ball: 120, bars: { K: 11, U: 0, heat: 1 }, work: 'W = 12 J' },
];
const SWING = [0.55, 0, -0.55];
const PEND = [{ K: 0, U: 10 }, { K: 10, U: 0 }, { K: 0, U: 10 }];
const TILT = [-0.13, 0, 0.13];

export class EnergyCastShowcaseScene extends SimScene {
  static BEAT_STEP_MAP = [[{ idx: 0, dwellMs: null }], [{ idx: 1, dwellMs: null }], [{ idx: 2, dwellMs: null }]];
  static ARIA_LABEL = 'A sample sheet of physics props: a spring against a wall with a ball and energy bars, a swinging pendulum with energy bars, stairs with a height mark, a sack and a school bag, two bar magnets, two charges and a seesaw plank with lettered seats.';

  constructor(container, config) {
    super(container, config);
    this.prev = 0;
    this.cur = 0;
  }

  // Each beat tweens in from the beat before it (fixed, so a direct jump and a slow walk agree).
  enter(stage) { this.prev = Math.max(0, stage - 1); this.cur = stage; }
  busy() { return this.age < 0.9; }

  draw(ctx, c) {
    drawBackdrop(ctx, c, 'dots');
    drawFloor(ctx, c, GROUND, {});
    const a = this.prev, b = this.cur, u = clamp01(this.age / 0.6), k = a === b ? 1 : outBack(u);

    // Spring against the wall, a ball at its free end, bars above.
    const sp = { len: lerp(SPRING[a].len, SPRING[b].len, k), ball: lerp(SPRING[a].ball, SPRING[b].ball, k) };
    const spring = drawSpring(ctx, c, { x: 46, y: 250, len: sp.len, rest: 150, wall: true, floorLen: 290, pushBack: true });
    const ball = drawBall(ctx, c, { x: spring.free.x + 18 + sp.ball, y: 250, r: 17 });
    drawEnergyBars(ctx, c, { x: 20, y: 8, h: 70, max: 12, total: b ? 12 : null, units: 'J', showValues: true,
      values: barsAt(SPRING[a].bars, SPRING[b].bars, a === b ? 1 : u), anchor: { x: ball.x, y: ball.y - ball.r } });

    // Pendulum at P, Q, R with two bars.
    const pend = drawPendulum(ctx, c, { x: 400, y: 34, len: 150, angle: lerp(SWING[a], SWING[b], k), arc: 0.55, level: true,
      points: [{ angle: 0.55, label: 'P' }, { angle: 0, label: 'Q' }, { angle: -0.55, label: 'R' }] });
    drawEnergyBars(ctx, c, { x: 520, y: 8, h: 70, max: 10, total: 10, bars: [{ id: 'K', label: 'K', tone: 1 }, { id: 'U', label: 'U', tone: 3 }],
      values: barsAt(PEND[a], PEND[b], a === b ? 1 : u), anchor: { x: pend.bob.x, y: pend.bob.y } });

    if (b < 2) {
      // Stairs, a sack and a bag, the work counter.
      drawStairs(ctx, c, { x: 20, y: GROUND, n: 5, rise: 26, run: 34, rail: true, bracket: { label: '3 m' } });
      drawSack(ctx, c, { x: 312, y: GROUND });
      drawSack(ctx, c, { x: 382, y: GROUND, kind: 'bag', w: 58, h: 70 });
      drawWorkCounter(ctx, c, { x: 262, y: 304, text: SPRING[b].work });
    } else {
      // A short flight, then a second flight stacked on a carton (no contact shadow), a
      // wooden crate lifted 1 m (dashed displacement arrow), a gulel drawn back.
      drawStairs(ctx, c, { x: 20, y: GROUND, n: 3, rise: 26, run: 34 });
      drawCrate(ctx, c, { x: 183, y: GROUND, w: 86, h: 78, kind: 'carton' });
      drawStairs(ctx, c, { x: 140, y: GROUND - 78, n: 2, rise: 26, run: 34, shadow: false });
      const lift = 60 * (a === b ? 1 : k);
      drawCrate(ctx, c, { x: 262, y: GROUND - lift, w: 58, h: 50, held: lift > 2 });
      if (lift > 2) drawCrate(ctx, c, { x: 262, y: GROUND, w: 58, h: 50, alpha: 0.18 });
      displacementArrow(ctx, c, 302, GROUND - 4, 302, GROUND - 6 - lift, { label: '1 m' });
      const pull = a === b ? 1 : clamp01(u);
      drawGulel(ctx, c, { x: 402, y: 488, h: 104, pull: { x: 396 - 16 * pull, y: 406 + 42 * pull }, stone: true });
    }

    // Magnets and charges.
    drawMagnet(ctx, c, { x: 410, y: 290, w: 104, h: 38 });
    drawMagnet(ctx, c, { x: 560, y: 290, w: 104, h: 38 });
    drawCharge(ctx, c, { x: 430, y: 350, r: 20, sign: '+' });
    drawCharge(ctx, c, { x: 540, y: 350, r: 20, sign: '-' });

    // A seesaw plank with lettered seats.
    drawLeverPlank(ctx, c, { x: 548, y: 452, angle: lerp(TILT[a], TILT[b], k), left: 118, right: 118, groundY: GROUND,
      seats: [{ at: -104, label: 'A' }, { at: -52, label: 'B' }, { at: 52, label: 'D' }, { at: 104, label: 'E' }] });
  }
}
