/**
 * MotionKitShowcaseScene - reference for the motion kit: SimVehicles (bus, car,
 * truck, scooter, canoe, rocket, balloon on a thread), SimTrack (track, road,
 * pins, strobe, speedometer, the four motion arrows) and SimPlot's
 * slopeTriangle and areaUnder. Every number here is sample data.
 *
 * Beats (5): b0 vehicles on the road; b1 inside the bus (a standing passenger
 * leans), a rocket, a balloon on a thread, a canoe; b2 a track with O, + and -
 * and pins, a strobe of a car with growing gaps; b3 a speedometer at 54 km/h
 * and the four arrow kinds (a = 0 too); b4 a slope triangle and a split area;
 * b5 (W1) a building ledge with a metre scale, a scrolled road with no ticks and a
 * barrier, equal-time dots on a line, a small dial.
 */
import { SimScene } from 'simulations/base/kit/SimScene.js';
import { drawBackdrop, drawFloor, drawCard, alpha, rr } from 'simulations/base/kit/SimLook.js';
import { drawFigure, figureLook } from 'simulations/base/kit/SimFigure.js';
import { propRig, drawGround } from 'simulations/base/kit/SimProps.js';
import { drawLedge, drawBarrier, drawBus, drawBusStander, drawCar, drawTruck, drawScooter, drawCanoe, drawRocket, drawBalloonOnThread } from 'simulations/base/kit/SimVehicles.js';
import { trackSpec, drawTrack, drawStrobe, drawSpeedometer, drawMotionArrow, drawScale } from 'simulations/base/kit/SimTrack.js';
import { plotFrame, axesOn, plotLine, slopeTriangle, areaUnder } from 'simulations/base/kit/SimPlot.js';

const SQ = String.fromCharCode(178);
const DEG = 180 / Math.PI;

export class MotionKitShowcaseScene extends SimScene {
  static BEAT_STEP_MAP = [[{ idx: 0, dwellMs: null }], [{ idx: 1, dwellMs: null }], [{ idx: 2, dwellMs: null }], [{ idx: 3, dwellMs: null }], [{ idx: 4, dwellMs: null }], [{ idx: 5, dwellMs: null }]];
  static ARIA_LABEL = 'A sample sheet of motion props: a bus, a truck, a car and a scooter on a road; a cut-away bus with a standing passenger; a rocket, a balloon on a thread and a canoe; a running track with marked points; a strobe of a car; a speedometer; velocity, acceleration, force and displacement arrows; a distance-time graph with a slope triangle and a speed-time graph with the area under it; a building ledge beside a metre scale, a road with a barrier, equal-time dots and a small speed dial.';

  constructor(container, config) { super(container, config); this.cur = 0; }
  enter(stage) { this.cur = stage; }

  draw(ctx, c) {
    drawBackdrop(ctx, c, 'dots');
    [this.b0, this.b1, this.b2, this.b3, this.b4, this.b5][this.cur]?.call(this, ctx, c);
  }

  b0(ctx, c) {
    drawGround(ctx, c, propRig({ x0: 12, x1: 668, groundY: 236 }), { kind: 'solid' });
    drawBus(ctx, c, { x: 180, y: 236, length: 320 });
    drawTruck(ctx, c, { x: 512, y: 236, length: 290, kind: 'box' });
    drawFloor(ctx, c, 472, {});
    drawCar(ctx, c, { x: 170, y: 472, length: 250, roll: 1.2 });
    const sc = drawScooter(ctx, c, { x: 500, y: 472, length: 190 }), A = sc.anchors;
    drawFigure(ctx, c, { x: A.seat.x, y: sc.ground, height: A.riderHeight, build: 'teen', facing: 1, pose: 'sit', seat: A.seat,
      hands: [A.handlebar, A.handlebar], feet: [A.footrest, A.footrest] }, figureLook(c, { skin: 1, hairStyle: 'braid', hair: 1 }));
  }

  b1(ctx, c) {
    const lean = 0.22;
    const bus = drawBus(ctx, c, { x: 340, y: 286, length: 560, inside: true, lean, ground: true });
    drawBusStander(ctx, c, bus, figureLook(c, { skin: 0, hairStyle: 'sidepart' }));
    drawRocket(ctx, c, { x: 80, y: 384, length: 140, angle: -Math.PI / 2, thrust: 0.5, t: 0.3 });
    drawBalloonOnThread(ctx, c, { x0: 170, x1: 420, y: 352, at: 320, r: 36, air: 0.55, t: 0.4 });
    rr(ctx, 424, 462, 256, 58, 10); ctx.fillStyle = alpha(c.water, 0.5); ctx.fill();
    const base = { x: 552, y: 466, length: 230, stroke: 0.3 };
    const cn = drawCanoe(ctx, c, { ...base, part: 'back' }), K = cn.anchors;
    drawFigure(ctx, c, { x: K.seat.x, y: K.seat.y + 4, height: K.paddlerHeight, build: 'adult', facing: 1, pose: 'sit', seat: K.seat,
      hands: [K.paddle.lower, K.paddle.pivot] }, figureLook(c, { skin: 3, hairStyle: 'crop' }));
    drawCanoe(ctx, c, { ...base, part: 'front' });
  }

  b2(ctx, c) {
    const tr = trackSpec({ from: -20, to: 100, x0: 50, x1: 630, y: 180 });
    drawTrack(ctx, c, tr, { kind: 'track', signs: true, points: [{ m: 0, label: 'Start' }, { m: 40, label: 'Tree', tone: 3 }, { m: 46, label: 'Pole', tone: 5 }, { m: 100, label: 'Finish' }] });
    const rd = trackSpec({ from: 0, to: 70, x0: 60, x1: 620, y: 428 }), CAR = 80;
    drawTrack(ctx, c, rd, { kind: 'road', every: 10 });
    drawStrobe(ctx, c, rd, { at: [0, 4, 16, 36, 64], gaps: true, bracketY: 352, tone: 1,
      draw: (g, x, y) => drawCar(g, c, { x: x - CAR / 2, y, length: CAR }) });
  }

  b3(ctx, c) {
    drawSpeedometer(ctx, c, { x: 170, y: 190, r: 125, value: 54, digital: '54 km/h' });
    drawFloor(ctx, c, 440, {});
    drawMotionArrow(ctx, c, 'a', 90, 410, { magnitude: 0, label: 'a = 0' });
    const car = drawCar(ctx, c, { x: 410, y: 440, length: 210 });
    drawMotionArrow(ctx, c, 'v', 330, car.y0 - 34, { length: 160, label: 'v = 15 m/s' });
    drawMotionArrow(ctx, c, 'a', 330, car.y0 - 110, { length: 90, label: 'a = 2 m/s' + SQ });
    drawMotionArrow(ctx, c, 'F', car.front, 400, { length: 130, label: 'F = 600 N' });
    drawMotionArrow(ctx, c, 's', 305, 488, { length: 300, label: 's = 25 m', at: 0.5 });
  }

  b4(ctx, c) {
    const L = { x: 16, y: 16, w: 318, h: 488 }, R = { x: 346, y: 16, w: 318, h: 488 };
    drawCard(ctx, c, L.x, L.y, L.w, L.h); drawCard(ctx, c, R.x, R.y, R.w, R.h);
    const f = plotFrame({ x: L.x + 8, y: L.y + 8, w: L.w - 16, h: L.h - 16 }, { x: { min: 0, max: 10, label: 'Time (s)' }, y: { min: 0, max: 50, label: 'Distance (m)' } });
    axesOn(ctx, c, f, Infinity, { size: 22, titleSize: 22 });
    plotLine(ctx, c, [[f.px(0), f.py(0)], [f.px(10), f.py(50)]], Infinity, { col: c.s1 });
    slopeTriangle(ctx, c, f, [1, 5], [6, 30], { rise: '25 m', run: '5 s' });
    const g = plotFrame({ x: R.x + 8, y: R.y + 8, w: R.w - 16, h: R.h - 16 }, { x: { min: 0, max: 8, label: 'Time (s)' }, y: { min: 0, max: 20, label: 'Speed (m/s)' } });
    axesOn(ctx, c, g, Infinity, { size: 22, titleSize: 22 });
    const a = areaUnder(ctx, c, g, [[0, 6], [8, 18]], { split: true });
    plotLine(ctx, c, [[g.px(0), g.py(6)], [g.px(8), g.py(18)]], Infinity, { col: c.s3 });
    for (const [p, t] of [[a.rect.label, 'u t'], [a.tri.label, 'area 2']]) {
      ctx.save(); ctx.font = '800 26px ' + c.fontDisplay; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = c.label; ctx.fillText(t, p.x, p.y); ctx.restore();
    }
  }

  b5(ctx, c) {
    drawFloor(ctx, c, 480, {});
    drawLedge(ctx, c, { x: 170, y: 170, ground: 480, w: 160 });
    drawScale(ctx, c, { at: 206, p0: 480, p1: 170, from: 0, to: 20, every: 5, side: 1, arrow: true });
    const rd = trackSpec({ from: 0, to: 40, x0: 330, x1: 650, y: 140 });
    drawTrack(ctx, c, rd, { kind: 'road', ticks: false, scroll: 7 });
    drawCar(ctx, c, { x: rd.toPx(13), y: rd.y, length: 120, roll: 7 });
    drawBarrier(ctx, c, { x: rd.toPx(35), y: rd.y, w: 70, h: 62 });
    const ln = trackSpec({ from: 0, to: 40, x0: 340, x1: 640, y: 300 });
    drawTrack(ctx, c, ln, { kind: 'line', every: 10 });
    drawStrobe(ctx, c, ln, { at: [0, 2, 8, 18, 32], marks: 'dots', dt: 1 });
    drawSpeedometer(ctx, c, { x: 560, y: 420, r: 58, value: 54 });
  }
}
