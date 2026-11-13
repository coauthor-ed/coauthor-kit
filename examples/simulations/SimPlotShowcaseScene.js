/** SimPlotShowcaseScene.js
 * SimPlotShowcaseScene - 4-beat showcase for SimPlot (scales, nice ticks, a line that
 * draws itself, bars from zero, and one callout timed to the data):
 *   Beat 0: Distance-time axes build: axis lines, grid and numbers, then the titles
 *   Beat 1: The line draws on by time (a toy car drives the same distance on a road);
 *           the callout fires exactly as the head reaches the point where the car stops
 *   Beat 2: A cooling curve for a cup of tea: data 0 to 87 deg C, nice ticks 0 to 100
 *   Beat 3: Monsoon rainfall bars grow from zero, lagged; one callout on the tallest
 * Tap skips a running build to its end; Replay re-runs the beat.
 */
import { SimScene } from 'simulations/base/kit/SimScene.js';
import {
  drawBackdrop,
  drawCard,
  pill,
  font,
  rr,
  ellipse,
  alpha,
  darken,
  lighten,
  ZONES,
  W,
} from 'simulations/base/kit/SimLook.js';
import { pop, dur, reducedMotion, ease } from 'simulations/base/kit/SimAnim.js';
import {
  linScale,
  plotFrame,
  axesOn,
  plotLine,
  barsOn,
  drawCallout,
  eventTime,
  lineDur,
  barEnd,
  AXES,
  PLOT,
  CALLOUT,
} from 'simulations/base/kit/SimPlot.js';

const DEG = String.fromCharCode(176);
const shade = (col) => darken(col, 0.3);

// -- Beats 0 and 1: distance-time graph --------------------------------------------------
const DT_FRAME = plotFrame({ x: 28, y: 140, w: 624, h: 294 }, {
  x: { min: 0, max: 10, label: 'Time (s)' },
  y: { min: 0, max: 35, n: 4, label: 'Distance (m)' },
});
const DT_DATA = [[0, 0], [4, 20], [7, 20], [10, 35]];
const DT_PTS = DT_DATA.map(([s, m]) => [DT_FRAME.px(s), DT_FRAME.py(m)]);
const STOP_I = 1;                                    // (4 s, 20 m): the car stops here
const ROAD_Y = 116;
const ROAD = linScale(0, 40, DT_FRAME.plot.x, DT_FRAME.plot.x + DT_FRAME.plot.w);
const DT_LINE = { dur: 2.4, delay: 0.25, ease: ease.linear, by: 'x' };   // by time: the car keeps true speeds

// -- Beat 2: cooling curve ---------------------------------------------------------------------
const COOL_FRAME = plotFrame({ x: 28, y: 92, w: 624, h: 342 }, {
  x: { min: 0, max: 20, label: 'Time (min)' },
  y: { min: 0, max: 87, label: 'Temperature (' + DEG + 'C)' },
});
const ROOM = 25;
const coolT = (m) => ROOM + 62 * Math.exp(-m / 7);   // 87 deg C at the start
const COOL_PTS = Array.from({ length: 41 }, (_, i) => [COOL_FRAME.px(i / 2), COOL_FRAME.py(coolT(i / 2))]);
const COOL_I = 24;                                    // 12 min
const COOL_LINE = { dur: 1.7, delay: AXES.end + 0.1, ease: ease.smooth };

// -- Beat 3: rainfall bars -------------------------------------------------------------------------
const RAIN = [['Jun', 165], ['Jul', 290], ['Aug', 260], ['Sep', 180], ['Oct', 70]];
const BAR_FRAME = plotFrame({ x: 28, y: 92, w: 624, h: 342 }, {
  zero: true,
  x: { cats: RAIN.map((r) => r[0]), label: 'Month' },
  y: { min: 0, max: 340, n: 7, label: 'Rainfall (mm)' },
});
const BARS = RAIN.map(([, v], i) => ({ x: i, v }));
const TALL_I = RAIN.reduce((best, r, i) => (r[1] > RAIN[best][1] ? i : best), 0);
const BARS_AT = AXES.end + 0.1;

/** Per-beat timeline (seconds since the beat started): when the callout fires and when all is still. */
function plan(stage) {
  if (stage === 0) return { hit: null, end: AXES.end + 0.6, cap: AXES.end };
  if (stage === 1) {
    const hit = DT_LINE.delay + eventTime(DT_PTS, STOP_I, lineDur(DT_LINE), DT_LINE.ease, DT_LINE.by);
    return { hit, end: Math.max(DT_LINE.delay + DT_LINE.dur, hit + CALLOUT.done) + 0.1, cap: hit + 0.3 };
  }
  if (stage === 2) {
    const hit = COOL_LINE.delay + eventTime(COOL_PTS, COOL_I, lineDur(COOL_LINE), COOL_LINE.ease);
    return { hit, end: Math.max(COOL_LINE.delay + COOL_LINE.dur, hit + CALLOUT.done) + 0.1, cap: AXES.end * 0.6 };
  }
  const hit = BARS_AT + barEnd(TALL_I, BARS.length);
  return { hit, end: Math.max(BARS_AT + PLOT.bars, hit + CALLOUT.done) + 0.1, cap: hit + 0.3 };
}

export class SimPlotShowcaseScene extends SimScene {
  static BEAT_STEP_MAP = [
    [{ idx: 0, dwellMs: null }],
    [{ idx: 1, dwellMs: null }],
    [{ idx: 2, dwellMs: null }],
    [{ idx: 3, dwellMs: null }],
  ];

  static ARIA_LABEL = 'Chart demos: a distance-time graph whose axes build and whose line draws while a toy car drives and stops, a cooling curve for a cup of tea on round tick marks, and monsoon rainfall bars growing from zero with July marked as the wettest month.';

  static CONTROLS = [{ type: 'button', id: 'replay', label: 'Replay' }];

  constructor(container, config) {
    super(container, config);
    this.t0 = 0;
  }

  enter() {
    // Every beat starts from the same state, whichever beat came before.
    this.t0 = 0;
  }

  onControlChange(id) {
    if (!this._guard(id)) return;
    if (id === 'replay') this.t0 = this.age;
    this.requestUiUpdate?.();
  }

  pointerDown() {
    const end = plan(this.stage).end;
    if (this.age - this.t0 < end) this.t0 = this.age - end - 0.01;
  }

  busy() {
    return this.stage >= 0 && this.age - this.t0 < dur(plan(this.stage).end);
  }

  draw(ctx, c) {
    drawBackdrop(ctx, c, 'dots');
    const t = reducedMotion() ? 1e6 : this.age - this.t0;
    const box = ZONES.heroWide;
    drawCard(ctx, c, box.x, box.y, box.w, box.h);
    const P = plan(Math.max(0, this.stage));
    if (this.stage <= 0) drawDistance(ctx, c, t, P, false);
    else if (this.stage === 1) drawDistance(ctx, c, t, P, true);
    else if (this.stage === 2) drawCooling(ctx, c, t, P);
    else drawRain(ctx, c, t, P);
  }
}

// -- Shared bits ----------------------------------------------------------------------------------------

function header(ctx, c, text) {
  pill(ctx, c, text, W / 2, ZONES.top.y + 28, { bg: c.bgSurface, size: 17, display: true });
}

function caption(ctx, c, text, age) {
  const pp = pop(age);
  if (!pp) return;
  pill(ctx, c, text, W / 2, ZONES.bottom.y + 26, { bg: c.raised, size: 15, scale: pp.scale, alpha: pp.alpha });
}

// -- Beats 0 and 1 ----------------------------------------------------------------------------------------

function drawDistance(ctx, c, t, P, withLine) {
  header(ctx, c, withLine ? 'The line tells the trip' : 'First the axes, then the data');
  const f = DT_FRAME;
  axesOn(ctx, c, f, withLine ? 1e6 : t);

  let metres = 0;
  if (withLine) {
    const r = plotLine(ctx, c, DT_PTS, t, { ...DT_LINE, col: c.s1, shade });
    if (r.p > 0) metres = f.vy(r.head[1]);
    const [x, y] = DT_PTS[STOP_I];
    drawCallout(ctx, c, t - P.hit, { x, y, tx: x - 34, ty: y - 58, text: 'Car stops here', align: 'right', shade });
  }
  drawRoad(ctx, c, metres, withLine ? 1 : Math.min(1, t / AXES.end));
  caption(ctx, c, withLine ? 'Flat line: time passes, distance stays the same' : 'Axes give the ruler: seconds across, metres up', t - P.cap);
}

function drawRoad(ctx, c, metres, k) {
  const x0 = ROAD(0), x1 = ROAD(40);
  ctx.save();
  ctx.globalAlpha *= k;
  ctx.fillStyle = darken(c.track, 0.25);
  rr(ctx, x0 - 18, ROAD_Y - 9, x1 - x0 + 36, 24, 12);
  ctx.fill();
  ctx.fillStyle = c.track;
  rr(ctx, x0 - 18, ROAD_Y - 12, x1 - x0 + 36, 24, 12);
  ctx.fill();
  ctx.strokeStyle = alpha(c.labelMuted, 0.6);
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(x0, ROAD_Y);
  ctx.lineTo(x1, ROAD_Y);
  ctx.stroke();
  ctx.setLineDash([]);
  // Metre marks every 10 m, matching the graph's distance ticks.
  ctx.font = font(c, 800, 14);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let m = 0; m <= 40; m += 10) {
    const x = ROAD(m);
    ctx.fillStyle = c.labelMuted;
    ctx.fillRect(x - 1, ROAD_Y + 8, 2, 6);
  }
  ctx.fillStyle = c.labelMuted;
  ctx.textAlign = 'right';
  ctx.fillText('0 m', x0 - 24, ROAD_Y);
  ctx.textAlign = 'center';
  ctx.fillText('40 m', x1, ROAD_Y - 26);
  ctx.restore();
  drawCar(ctx, c, ROAD(metres), ROAD_Y - 2, metres, k);
}

function drawCar(ctx, c, x, y, metres, k) {
  if (k <= 0) return;
  const body = c.s2;
  ctx.save();
  ctx.globalAlpha *= k;
  ctx.translate(x, y);
  // shadow
  ctx.fillStyle = alpha(c.bgDeep, 0.35);
  ellipse(ctx, 0, 10, 26, 4);
  ctx.fill();
  // cabin, body with lip, window
  ctx.fillStyle = lighten(body, 0.15);
  rr(ctx, -12, -24, 24, 14, 6);
  ctx.fill();
  ctx.fillStyle = alpha(c.glass, 0.9);
  rr(ctx, -7, -21, 14, 8, 3);
  ctx.fill();
  ctx.fillStyle = darken(body, 0.3);
  rr(ctx, -24, -13, 48, 17, 7);
  ctx.fill();
  ctx.fillStyle = body;
  rr(ctx, -24, -15, 48, 15, 7);
  ctx.fill();
  ctx.fillStyle = lighten(body, 0.45);
  rr(ctx, -18, -12, 12, 4, 2);
  ctx.fill();
  // wheels turn with the distance travelled, so they stop when the car stops
  const ang = (ROAD(metres) - ROAD(0)) / 6;
  for (const wx of [-14, 14]) {
    ctx.fillStyle = darken(body, 0.65);
    ellipse(ctx, wx, 3, 7, 7);
    ctx.fill();
    ctx.strokeStyle = c.bgSurface;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(wx + Math.cos(ang) * 4, 3 + Math.sin(ang) * 4);
    ctx.lineTo(wx - Math.cos(ang) * 4, 3 - Math.sin(ang) * 4);
    ctx.stroke();
  }
  ctx.restore();
}

// -- Beat 2 ------------------------------------------------------------------------------------------------

function drawCooling(ctx, c, t, P) {
  header(ctx, c, 'A cup of tea cools down');
  const f = COOL_FRAME;
  axesOn(ctx, c, f, t);
  const r = plotLine(ctx, c, COOL_PTS, t, { ...COOL_LINE, col: c.s6, shade, area: f.plot.y + f.plot.h, areaAlpha: 0.12 });
  const temp = r.p > 0 ? f.vy(r.head[1]) : coolT(0);
  drawCup(ctx, c, f.plot.x + f.plot.w - 84, f.plot.y + 74, temp);
  const [x, y] = COOL_PTS[COOL_I];
  drawCallout(ctx, c, t - P.hit, { x, y, tx: x - 40, ty: y - 62, text: 'Cooling slows down', shade });
  caption(ctx, c, 'Data stops at 87, so the axis rounds up to 100', t - P.cap);
}

function drawCup(ctx, c, x, y, temp) {
  const heat = Math.max(0, Math.min(1, (temp - ROOM) / 62));
  ctx.save();
  ctx.translate(x, y);
  // steam: fewer, fainter wisps as it cools
  ctx.strokeStyle = c.labelMuted;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const a = heat * (1 - i * 0.22);
    if (a <= 0.03) continue;
    const sx = -14 + i * 14, h = 16 + 18 * heat;
    ctx.globalAlpha = a * 0.8;
    ctx.beginPath();
    ctx.moveTo(sx, -24);
    ctx.bezierCurveTo(sx - 7, -24 - h * 0.35, sx + 7, -24 - h * 0.65, sx, -24 - h);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // handle, mug with lip, tea
  ctx.strokeStyle = darken(c.s4, 0.25);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(26, -2, 11, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();
  ctx.fillStyle = darken(c.s4, 0.3);
  rr(ctx, -28, -18, 56, 46, 12);
  ctx.fill();
  ctx.fillStyle = c.s4;
  rr(ctx, -28, -22, 56, 46, 12);
  ctx.fill();
  ctx.fillStyle = darken(c.s8, 0.25);
  ellipse(ctx, 0, -20, 24, 5);
  ctx.fill();
  ctx.fillStyle = lighten(c.s4, 0.45);
  rr(ctx, -21, -12, 6, 24, 3);
  ctx.fill();
  ctx.restore();
  pill(ctx, c, Math.round(temp) + ' ' + DEG + 'C', x, y + 46, { bg: c.s6, size: 15 });
}

// -- Beat 3 ------------------------------------------------------------------------------------------------

function drawRain(ctx, c, t, P) {
  header(ctx, c, 'Monsoon rain, month by month');
  const f = BAR_FRAME;
  axesOn(ctx, c, f, t);
  const r = barsOn(ctx, c, f, BARS, t - BARS_AT, { col: c.s1, shade });
  drawCloud(ctx, c, f.plot.x + f.plot.w - 70, f.plot.y + 34, Math.min(1, Math.max(0, t / AXES.end)));
  const [x, y] = r.tops[TALL_I];
  drawCallout(ctx, c, t - P.hit, { x, y, tx: x + 30, ty: y - 40, text: 'Wettest: July', align: 'left', shade });
  caption(ctx, c, 'Bars start at zero, so heights compare fairly', t - P.cap);
}

function drawCloud(ctx, c, x, y, k) {
  if (k <= 0) return;
  ctx.save();
  ctx.globalAlpha *= k;
  ctx.fillStyle = c.s1;
  for (const [dx, dy] of [[-16, 26], [2, 34], [20, 24]]) {
    ctx.beginPath();
    ctx.moveTo(x + dx, y + dy - 7);
    ctx.quadraticCurveTo(x + dx + 5, y + dy + 1, x + dx, y + dy + 4);
    ctx.quadraticCurveTo(x + dx - 5, y + dy + 1, x + dx, y + dy - 7);
    ctx.fill();
  }
  ctx.fillStyle = darken(c.glass, 0.15);
  for (const [dx, dy, r] of [[-20, 6, 13], [0, -2, 18], [20, 6, 13]]) { ellipse(ctx, x + dx, y + dy + 3, r, r); ctx.fill(); }
  ctx.fillStyle = lighten(c.glass, 0.35);
  for (const [dx, dy, r] of [[-20, 6, 13], [0, -2, 18], [20, 6, 13]]) { ellipse(ctx, x + dx, y + dy, r, r); ctx.fill(); }
  rr(ctx, x - 32, y + 4, 64, 14, 7);
  ctx.fill();
  ctx.restore();
}
