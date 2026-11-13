/**
 * WaveCastShowcaseScene - reference for the wave cast, SimWave.js: one computed
 * model (a source motion f(t) and a field s(d, t) = f(t - d / v)) drawn as rings
 * round a point source, a piston tube with C and R tags on the computed regions
 * over a density graph, a slinky and a rope, sound arcs leaving and arriving, and
 * a pulse out and back. Every number and word here is sample data.
 *
 * Beats (4): rings in every direction, then the one-direction strip; the piston
 * tube and its density graph; the slinky and the rope; sound arcs and a pulse
 * out and back. Each frame is computed from the beat's age only, so any beat is
 * right from a cold start.
 */
import { SimScene } from 'simulations/base/kit/SimScene.js';
import { drawBackdrop, pill, clamp01, inOutSine } from 'simulations/base/kit/SimLook.js';
import { swingAmp, sineSource, pistonSource, waveField, drawParticleStrip, drawDensityGraph, drawSlinky, drawRope,
  drawRings, drawSoundArcs, drawOutAndBack, drawPropagationArrow, drawVibrationArrow } from 'simulations/base/kit/SimWave.js';

const LAMBDA = '\u03bb';
// b0: rings, wavelength 60 px.
const RING = waveField({ source: sineSource({ amp: 7.5, freq: 1 }), v: 60, falloff: 220 });
// b1: piston tube, period 2 s, v 120 px/s, so wavelength 240 px; amp 0.08 x 240.
const A1 = swingAmp(240);   // about 20.6: R about 35 per cent sparser
const PISTON = pistonSource({ repeat: 2, from: -A1, strokes: [{ at: 0, to: A1, dur: 1 }, { at: 1, to: -A1, dur: 1 }] });
const STRIP = { x: 60, y: 74, w: 580, h: 92 };
const TUBE = waveField({ source: PISTON, v: 120, origin: STRIP.x });
const T_FILL = 30;   // the beat starts with the tube already full of waves
// b2: slinky and rope, wavelength 250 px.
const SLINKY = waveField({ source: sineSource({ amp: 16, freq: 0.6 }), v: 150, origin: 80 });
const ROPE = waveField({ source: sineSource({ amp: 34, freq: 0.6 }), v: 150, origin: 80 });
// b3: out and back.
const A = { x: 96, y: 390 }, B = { x: 556, y: 390 };

export class WaveCastShowcaseScene extends SimScene {
  static CONTINUOUS = true; // a wave never stops: the particles keep moving while the beat is on screen
  static BEAT_STEP_MAP = [[{ idx: 0, dwellMs: null }], [{ idx: 1, dwellMs: null }], [{ idx: 2, dwellMs: null }], [{ idx: 3, dwellMs: null }]];
  static ARIA_LABEL = 'A sample sheet of wave drawings: air particles round a point source in rings, a tube of air pushed by a piston with compressions and rarefactions marked over a density graph, a slinky and a rope carrying waves, sound arcs from a source to a receiver, and a pulse that travels to a wall and back.';

  constructor(container, config) {
    super(container, config);
    this.waveProbe = null;
  }

  draw(ctx, c) {
    drawBackdrop(ctx, c, 'dots');
    const t = this.age;
    if (this.stage === 0) this.rings(ctx, c, t);
    else if (this.stage === 1) this.tube(ctx, c, t + T_FILL);
    else if (this.stage === 2) this.slinkyRope(ctx, c, t + T_FILL);
    else this.arcs(ctx, c, t);
  }

  rings(ctx, c, t) {
    const tt = t + 6;
    drawRings(ctx, c, { cx: 180, cy: 280, R: 150, field: RING, t: tt, guides: true, mark: { x: 250, y: 300 } });
    const k = inOutSine(clamp01((t - 0.4) / 1.2));
    drawRings(ctx, c, { cx: 500, cy: 280, R: 150, field: RING, t: tt, strip: { angle: 0, width: 60, k } });
    pill(ctx, c, 'every direction', 180, 82, { bg: c.raised, size: 26, display: true });
    pill(ctx, c, 'one direction', 500, 82, { bg: c.raised, size: 26, display: true });
    drawPropagationArrow(ctx, c, { x: 430, y: 456, len: 170, label: 'travel', side: 'below' });
  }

  tube(ctx, c, t) {
    const s = drawParticleStrip(ctx, c, { ...STRIP, field: TUBE, t, piston: true, mark: 270, bracket: true, tags: true, densityShade: true, regionBands: true });
    const g = drawDensityGraph(ctx, c, { x: STRIP.x, y: 250, w: STRIP.w, h: 200, field: TUBE, t,
      axes: { y: 'density', x: 'distance' }, lambda: LAMBDA, ampLabel: 'A', troughLabel: 'trough', linear: true });
    this.waveProbe = { t, tagsC: s.regions.filter((r) => r.kind === 'C' && r.tagged).map((r) => +r.x.toFixed(2)),
      allC: s.regions.filter((r) => r.kind === 'C').map((r) => +r.x.toFixed(2)), crests: g.crests.map((p) => +p.x.toFixed(2)),
      marked: s.marked && { x: +s.marked.x.toFixed(2), mean: s.marked.mean, amp: s.marked.amp }, minGap: s.minGap && +s.minGap.toFixed(2) };
  }

  slinkyRope(ctx, c, t) {
    const sl = drawSlinky(ctx, c, { x1: 80, x2: 600, y: 150, field: SLINKY, t, ry: 30, mark: 18, tags: { C: 'close', R: 'spread' } });
    if (sl.marked) drawVibrationArrow(ctx, c, { x: sl.marked.mean, y: 206, len: 52, label: 'mark moves', side: 'below' });
    drawRope(ctx, c, { x1: 80, x2: 600, y: 370, field: ROPE, t, mark: 300 });
    drawPropagationArrow(ctx, c, { x: 200, y: 452, len: 280, label: 'wave travels', side: 'below' });
  }

  arcs(ctx, c, t) {
    drawSoundArcs(ctx, c, { x: 110, y: 160, dir: 0, spread: 1.0, n: 4, wavelength: 40, t });
    drawSoundArcs(ctx, c, { x: 570, y: 160, dir: Math.PI, spread: 1.0, n: 4, wavelength: 40, t, reverse: true, strength: 0.6 });
    for (const x of [110, 570]) { ctx.beginPath(); ctx.arc(x, 160, 9, 0, Math.PI * 2); ctx.fillStyle = c.labelMuted; ctx.fill(); }
    pill(ctx, c, 'source', 110, 222, { bg: c.raised, size: 26, display: true });
    pill(ctx, c, 'receiver', 570, 222, { bg: c.raised, size: 26, display: true });
    // A wall at B (a plain slab with a lit edge and a rim).
    ctx.fillStyle = c.stroke; ctx.fillRect(B.x + 14, 300, 30, 180);
    ctx.fillStyle = c.raised; ctx.fillRect(B.x + 14, 300, 7, 180);
    ctx.strokeStyle = c.bgDeep; ctx.lineWidth = 2; ctx.strokeRect(B.x + 14, 300, 30, 180);
    const st = drawOutAndBack(ctx, c, { a: A, b: B, v: 240, t: t % 4.6, label: 'turns back', labelDx: -40, labelDy: -122 });
    pill(ctx, c, 't = ' + st.elapsed.toFixed(1) + ' s', 326, 452, { bg: c.raised, size: 26, display: true });
  }
}
