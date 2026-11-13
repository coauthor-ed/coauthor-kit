/**
 * SeatedCycleScene - reference for the seated poses and seat props: pose 'sit' (pelvis on the seat anchor, thighs
 * level, free hands on the lap), pose 'cycle' (feet on pedals, hands on bars), SimProps drawChair / drawSeatBench /
 * drawDesk / bicycleRig + drawBicycle, each sized from its sitter (figureMetrics) and returning the anchors.
 * Beats: 0 a seated row behind a desk (drawFigureRow, between: the desk) and a teacher; 1 chairs, a desk writer,
 * a too-high stool (leg-far is data); 2 Ride: wheels roll dist / r and the cranks follow, so nothing skids.
 */
import { SimScene } from 'simulations/base/kit/SimScene.js';
import { drawBackdrop, drawFloor, pill, rr, mix, darken } from 'simulations/base/kit/SimLook.js';
import { drawFigure, drawFigureRow, figureFor, groupLook } from 'simulations/base/kit/SimFigure.js';
import { drawChair, drawSeatBench, drawDesk, bicycleRig, drawBicycle } from 'simulations/base/kit/SimProps.js';

const MAP = [[{ idx: 0, dwellMs: null }], [{ idx: 1, dwellMs: null }], [{ idx: 2, dwellMs: null }]];
const RIDE = { x0: 150, x1: 420, y: 450, H: 210, speed: 150 };

export class SeatedCycleScene extends SimScene {
  static BEAT_STEP_MAP = MAP;
  static ARIA_LABEL = 'Seated cartoon people: a class of students at a desk with a teacher at the board, people on chairs and a stool, and a cyclist who rides along the ground.';
  static CONTROLS = [{ type: 'button', id: 'ride', label: 'Ride' }];

  constructor(container, config) {
    super(container, config);
    this.dist = 0;
    this.run = null;
  }

  enter() { this.dist = 0; this.run = null; }
  isControlHidden(id) { return id === 'ride' && this.stage !== 2; }
  isControlDisabled() { return !!this.run; }

  onControlChange(id) {
    if (!this._guard(id)) return;
    if (id === 'ride') { this.dist = 0; this.run = { stage: this.stage }; }
    this.requestUiUpdate?.();
  }

  busy() { return !!this.run; }

  update(d) {
    if (!this.run) return;
    this.dist += RIDE.speed * d;
    if (this.dist >= RIDE.x1 - RIDE.x0) { this.dist = RIDE.x1 - RIDE.x0; this.run = null; this.requestUiUpdate?.(); }
  }

  draw(ctx, c, t) {
    drawBackdrop(ctx, c, 'dots');
    if (this.stage === 0) this.drawClass(ctx, c, t);
    else if (this.stage === 1) this.drawSeats(ctx, c, t);
    else this.drawRide(ctx, c, t);
  }

  drawClass(ctx, c, t) {
    const y = 488, H = 150;
    drawFloor(ctx, c, y, { seams: false });
    // The board, top left; the teacher points at it.
    rr(ctx, 36, 40, 300, 150, 12); ctx.fillStyle = darken(c.s3, 0.62); ctx.fill();
    rr(ctx, 46, 50, 280, 130, 8); ctx.fillStyle = darken(c.s3, 0.5); ctx.fill();
    pill(ctx, c, '3 x 4 = 12', 186, 115, { size: 22, bg: darken(c.s3, 0.5) });
    drawFigure(ctx, c, figureFor(this, { role: 'teacher', pose: 'point', x: 400, y: 300, scale: 100, facing: -1, i: 5, look: { t } }));
    drawFloor(ctx, c, 300, { seams: false, col: mix(c.bgDeep, c.s5, 0.1) });
    let desk = null;
    drawFigureRow(ctx, c, {
      n: 5, x: 40, w: 600, y, height: H, build: 'teen', pose: 'sit', seat: y - 0.196 * H, gap: 118, t,
      behind: () => drawSeatBench(ctx, c, { x0: 40, x1: 640, y, forHeight: H, build: 'teen' }),
      hands: (p) => desk?.hands(p.x, 0) ?? null,
      between: () => { desk = drawDesk(ctx, c, { x0: 30, x1: 650, y, forHeight: H, build: 'teen', tone: 8 }); },
    });
  }

  drawSeats(ctx, c, t) {
    const y = 300, H = 170;
    drawFloor(ctx, c, y, { seams: false });
    const a = drawChair(ctx, c, { x: 90, y, forHeight: H, facing: 1 });
    drawFigure(ctx, c, { x: 90, y, height: H, facing: 1, pose: 'sit', seat: a.seat }, groupLook(c, 0, { t }));
    const b = drawChair(ctx, c, { x: 300, y, forHeight: H, view: 'front' });
    drawFigure(ctx, c, { x: 300, y, height: H, facing: 0, pose: 'sit', seat: b.seat }, groupLook(c, 1, { t }));
    const d = drawChair(ctx, c, { x: 590, y, forHeight: H, facing: -1 });
    drawFigure(ctx, c, { x: 590, y, height: H, facing: -1, pose: 'sit', seat: d.seat }, groupLook(c, 2, { mood: 'think', t }));
    // A writer at a side desk, and a too-high stool.
    const y2 = 500, H2 = 150;
    drawFloor(ctx, c, y2, { seams: false, col: mix(c.bgDeep, c.s5, 0.1) });
    const ch = drawChair(ctx, c, { x: 120, y: y2, forHeight: H2, facing: 1, tone: 5 });
    let desk = null;
    drawFigure(ctx, c, { x: 120, y: y2, height: H2, facing: 1, pose: 'sit', seat: ch.seat, hands: [{ x: 204, y: y2 - 0.338 * H2 - 2 }, { x: 196, y: y2 - 0.338 * H2 - 3 }] },
      groupLook(c, 3, { mood: 'think', t }), { between: () => { desk = drawDesk(ctx, c, { x0: 180, x1: 300, y: y2, forHeight: H2, view: 'side', tone: 8 }); } });
    void desk;
    const stool = { x: 470, y: y2 - 110 };
    rr(ctx, stool.x - 28, stool.y, 56, 9, 4); ctx.fillStyle = darken(c.gold, 0.28); ctx.fill();
    for (const s of [-1, 1]) { rr(ctx, stool.x + s * 18 - 3, stool.y + 6, 6, y2 - stool.y - 6, 3); ctx.fillStyle = darken(c.gold, 0.45); ctx.fill(); }
    const sk = drawFigure(ctx, c, figureFor(this, { role: 'child', pose: 'sit', x: 470, y: y2, scale: 100, facing: 1, i: 6, seat: stool, mood: 'happy', look: { t } }));
    pill(ctx, c, sk.warnings.length ? 'feet dangle' : 'feet down', 590, y2 - 70, { size: 14, bg: c.raised ?? c.bgSurface });
  }

  drawRide(ctx, c, t) {
    const { y, H } = RIDE;
    drawFloor(ctx, c, y, { seams: false });
    const bike = bicycleRig({ x: RIDE.x0 + this.dist, y, forHeight: H, facing: 1, dist: this.dist, tone: 1 });
    drawFigure(ctx, c, { ...bike.rider, pose: 'cycle' }, groupLook(c, 2, { mood: this.run ? 'happy' : 'smile', t }),
      { behind: () => drawBicycle(ctx, c, bike, { part: 'back' }), between: () => drawBicycle(ctx, c, bike, { part: 'front' }) });
    const front = bicycleRig({ x: 600, y, forHeight: H * 0.8, view: 'front', dist: 30, tone: 4 });
    drawFigure(ctx, c, { ...front.rider, pose: 'cycle' }, groupLook(c, 1, { t }),
      { behind: () => drawBicycle(ctx, c, front, { part: 'back' }), between: () => drawBicycle(ctx, c, front, { part: 'front' }) });
    pill(ctx, c, `${Math.round(this.dist)} px ridden`, 340, 60, { size: 16, bg: c.raised ?? c.bgSurface });
  }
}
