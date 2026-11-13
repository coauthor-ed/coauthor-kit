/**
 * PropsShowcaseScene - reference for the apparatus kit: SimProps (one ground
 * line, one scale: cart, block, ramp, pulley, spring balance), vectorArrow
 * (equal forces draw equal arrows, value pill past the head) and dragHandle
 * (grab radius, offset, snap, commit). Drag the cart along the ground: the
 * push arrow follows it and the spring balance reads the force.
 *
 * Beats (1): drag the cart.
 */
import { SimScene } from 'simulations/base/kit/SimScene.js';
import { drawBackdrop, vectorArrow, pill } from 'simulations/base/kit/SimLook.js';
import { propRig, drawGround, drawCart, drawBlock, drawRamp, drawPulley, drawSpringBalance } from 'simulations/base/kit/SimProps.js';
import { dragHandle } from 'simulations/base/kit/SimDrag.js';

const RIG = propRig({ x0: 30, x1: 650, groundY: 420, scale: 60 });

export class PropsShowcaseScene extends SimScene {
  static BEAT_STEP_MAP = [[{ idx: 0, dwellMs: null }]];
  static ARIA_LABEL = 'A cart on the ground with force arrows, a ramp with a block, a pulley and a spring balance. Drag the cart.';

  constructor(container, config) {
    super(container, config);
    this.m = 3;
    this.grip = dragHandle({
      at: () => ({ x: RIG.x(this.m), y: RIG.groundY - 40 }),
      radius: 40,
      snap: (p) => ({ x: RIG.x(Math.round((p.x - RIG.x0) / RIG.scale * 2) / 2), y: p.y }),
      bounds: { x: RIG.x(1), y: 0, w: RIG.x(8) - RIG.x(1), h: 520 },
      onMove: (p) => { this.m = (p.x - RIG.x0) / RIG.scale; },
    });
  }

  busy() { return this.grip.dragging; }
  pointerDown(p) { return this.grip.down(p); }
  pointerMove(p) { return this.grip.move(p); }
  pointerUp(p) { this.grip.up(p); }

  draw(ctx, c) {
    drawBackdrop(ctx, c, 'dots');
    drawGround(ctx, c, RIG, { kind: 'solid' });
    const ramp = drawRamp(ctx, c, RIG, { from: 7.6, to: 10.1, rise: 110 });
    const s = ramp.surface(0.5);
    drawBlock(ctx, c, RIG, 8.9, { w: 44, h: 36, tone: 2, label: 'm', y: s.y - 8 });
    const cart = drawCart(ctx, c, RIG, this.m, { w: 150, h: 54, tone: 1, label: 'cart', wheelAngle: this.m * 2 });
    const push = 2 + (this.m - 1) * 0.5;
    vectorArrow(ctx, c, cart.left.x, cart.y0 - 30, { angle: 0, magnitude: push, scale: 24, col: c.s1, label: push.toFixed(1) + ' N', frame: { x: 0, y: 0, w: 680, h: 520 } });
    vectorArrow(ctx, c, cart.right.x, cart.y0 - 84, { angle: Math.PI, magnitude: 2, scale: 24, col: c.s2, label: '2.0 N' });
    drawPulley(ctx, c, RIG.x(6.2), 90, 22);
    const sb = drawSpringBalance(ctx, c, 90, 40, { reading: push, max: 6, tone: 'good' });
    pill(ctx, c, 'reads ' + push.toFixed(1) + ' N', 90, sb.y0 + sb.h + 26, { bg: c.good, size: 15 });
  }
}
