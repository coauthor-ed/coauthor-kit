/**
 * SvgPlotPhysicsShowcaseScene - kit/SimPlotSvg.js doing a physics job: a velocity-time graph drawn in
 * step with a trolley's real motion (speed up, steady, brake).
 *   Beat 0: the axes build, then the v-t line draws by x (time flows evenly) while the trolley runs the
 *           same trip on a track above; the callout fires exactly when the head reaches "brakes on"
 *   Beat 1: the same line redraws with the area under it filling in; the trolley runs again, and the
 *           callout at the end says the area is the distance travelled (90 m)
 * The trolley's position is the integral of the plotted v, so the picture and the graph agree.
 * Tap skips a running build to its end; Replay runs it again. Portrait is its own layout.
 */
import { SvgScene, chip, liveChip, fill, shade, glossOf } from 'simulations/base/kit/SimSvg.js';
import { ease } from 'simulations/base/kit/SimAnim.js';
import {
  plotFrame, linScale, plotPanelSvg, axesOnSvg, plotLineSvg, calloutSvg, plotHit, toScreen, AXES, CALLOUT,
} from 'simulations/base/kit/SimPlotSvg.js';

const MAP = [0, 1].map((i) => [{ idx: i, dwellMs: null }]);
const TITLES = ['Velocity-time graph', 'Area under the line'];
const CAPS = [
  ['Sloping up: speeding up. Flat: steady speed', 'Up: faster. Flat: steady'],
  ['Area under a v-t line = distance travelled', 'Area = distance'],
];
const VT = [[0, 0], [4, 12], [8, 12], [11, 0]];
const BRAKE_I = 2;
const TOTAL = 90;
const LINE = [
  { dur: 2.6, delay: AXES.end + 0.1, ease: ease.linear, by: 'x', tone: 3 },
  { dur: 2.6, delay: 0.3, ease: ease.linear, by: 'x', tone: 3 },
];
const f1 = (v) => v.toFixed(1);

/** Distance (m) after t s: the area under VT so far (piecewise linear v). */
function distAt(t) {
  let s = 0;
  for (let i = 1; i < VT.length; i++) {
    const [t0, v0] = VT[i - 1], [t1, v1] = VT[i];
    if (t <= t0) break;
    const u = Math.min(t, t1), vu = v0 + ((v1 - v0) * (u - t0)) / (t1 - t0);
    s += ((v0 + vu) / 2) * (u - t0);
  }
  return s;
}

export class SvgPlotPhysicsShowcaseScene extends SvgScene {
  static BEAT_STEP_MAP = MAP;
  static ARIA_LABEL = 'A velocity-time graph draws itself while a trolley speeds up, runs at a steady 12 metres per second, then brakes to a stop. Then the area under the line fills in: it equals the 90 metres travelled.';
  static CONTROLS = [{ type: 'button', id: 'replay', label: 'Replay' }];

  stageHeight(st) { return st.portrait ? 540 : 430; }

  enter(step) { this.play(this.plan(step, this.geo(this.sv)).end); }

  onControlChange(id) {
    if (id === 'replay') { this.clockReset(); this.enter(this.stepIndex); }
    this.requestUiUpdate?.();
  }

  pointerDown() { this.skip(); return false; }

  geo(st) {
    const P = st.portrait, W = st.W, H = st.H;
    const rect = { x: 6, y: P ? 96 : 86, w: W - 12, h: H - (P ? 96 : 86) - (P ? 64 : 58) };
    const f = plotFrame(rect, { x: { min: 0, max: 11, n: 6, label: 'Time (s)' }, y: { min: 0, max: 12, n: 3, label: 'Velocity (m/s)' } });
    return { P, W, H, f, pts: toScreen(f, VT), track: linScale(0, TOTAL, f.plot.x + 10, f.plot.x + f.plot.w - 40), trackY: P ? 52 : 46, capY: H - (P ? 30 : 26) };
  }

  plan(step, g) {
    const L = LINE[step];
    const hit = plotHit(g.pts, step === 0 ? BRAKE_I : VT.length - 1, L);
    return { hit, cap: step === 0 ? hit + 0.4 : L.delay + 0.3, end: Math.max(L.delay + L.dur, hit + CALLOUT.done) + 0.1 };
  }

  paint(st) {
    const g = this.geo(st), title = TITLES[this.stepIndex];
    return { svg: plotPanelSvg(g.f), head: chip(title, 0, 0, { tone: 'plain', size: 'big', static: true }) };
  }

  animate(st, t) {
    const live = this.live, g = this.geo(st), step = this.stepIndex, P = this.plan(step, g), f = g.f;
    axesOnSvg(live, 'axes', f, step === 1 ? 99 : t);
    const r = plotLineSvg(live, 'line', g.pts, t, step === 1 ? { ...LINE[1], area: f.plot.y + f.plot.h, areaAlpha: 0.22 } : LINE[0]);
    const secs = r.p > 0 ? f.vx(r.head[0]) : 0;
    track(live, g, distAt(secs), step === 1 ? 1 : Math.min(1, t / AXES.end), f.vy(r.head[1]) * (r.p > 0 ? 1 : 0));
    if (step === 0) {
      const [x, y] = g.pts[BRAKE_I];
      calloutSvg(live, 'call', t - P.hit, { x, y, tx: x + (g.P ? -12 : 18), ty: y - 40, text: 'Brakes on', align: g.P ? 'right' : 'left' });
    } else {
      const [x, y] = g.pts[VT.length - 1];
      calloutSvg(live, 'call', t - P.hit, { x, y, tx: x - (g.P ? 8 : 30), ty: f.py(13.6), text: g.P ? 'Area = 90 m' : 'Area = 90 m = distance', align: 'right', tone: 3 });
    }
    if (t >= P.cap) liveChip(live, 'cap', CAPS[step][g.P ? 1 : 0], g.W / 2, g.capY, { tone: 'plain', cls: 'sv-pop' });
  }
}

// The track above the graph (0 to 90 m) with the trolley at distance s; its speed chip rides along.
function track(live, g, s, k, v) {
  const x0 = g.track(0), x1 = g.track(TOTAL), y = g.trackY, col = 'var(--sim-track)';
  let html = `<rect x="${f1(x0 - 20)}" y="${y + 6}" width="${f1(x1 - x0 + 40)}" height="12" rx="6" ${fill(shade(col, 72))}/>`
    + `<rect x="${f1(x0 - 20)}" y="${y + 3}" width="${f1(x1 - x0 + 40)}" height="12" rx="6" ${fill(col)}/>`;
  for (let m = 0; m <= TOTAL; m += 15) html += `<rect x="${f1(g.track(m) - 1)}" y="${y + 17}" width="2" height="6" ${fill('var(--sim-label-muted)')}/>`;
  html += `<text x="${f1(x0 - 26)}" y="${y + 14}" text-anchor="end" style="fill:var(--sim-label-muted);font-size:14px">0 m</text>`;
  const e = live.shape('track', 'g', { html });
  live.css(e, { opacity: k < 1 ? k.toFixed(3) : null });
  const tr = live.shape('trolley', 'g', { html: trolleySvg((g.track(s) - x0) / 7) });
  live.attrs(tr, { transform: `translate(${f1(g.track(s))} ${y})` });
  live.css(tr, { opacity: k < 1 ? k.toFixed(3) : null });
  const sx = Math.max(g.track(s), x0 + 40);
  liveChip(live, 'speed', `${Math.round(v)} m/s`, Math.min(sx, g.W - 50), y - 36, { tone: 3, size: 'sm', alpha: k });
}

// A lab trolley at the origin (wheels at y = 0), wheels turned by ang.
function trolleySvg(ang) {
  const body = 'var(--sim-series-3)';
  let s = `<ellipse cx="0" cy="9" rx="28" ry="4" ${fill('var(--sim-bg-deep)', 'opacity:0.35')}/>`
    + `<rect x="-26" y="-18" width="52" height="18" rx="5" ${fill(shade(body, 70))}/>`
    + `<rect x="-26" y="-21" width="52" height="17" rx="5" ${fill(body)}/>`
    + `<rect x="-20" y="-18" width="16" height="4" rx="2" ${fill(glossOf(body, 45))}/>`;
  const c = Math.cos(ang) * 4.5, sn = Math.sin(ang) * 4.5;
  for (const wx of [-15, 15]) {
    s += `<circle cx="${wx}" cy="0" r="7.5" ${fill(shade(body, 35))}/>`
      + `<line x1="${f1(wx + c)}" y1="${f1(sn)}" x2="${f1(wx - c)}" y2="${f1(-sn)}" style="stroke:var(--sim-bg-surface);stroke-width:2;stroke-linecap:round"/>`;
  }
  return s;
}
