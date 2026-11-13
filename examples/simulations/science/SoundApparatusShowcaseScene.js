/**
 * SoundApparatusShowcaseScene - reference for the sound apparatus in SimApparatus:
 * tuning forks (still, struck with the rubber pad), a stopwatch, a vacuum bell jar
 * with a ringing bell and a hand pump, a piston tube, and the chain microphone ->
 * signal wire -> speaker (cutaway and whole). Every number here is sample data.
 * No sound arcs or air dots here: those come from SimWave at the returned anchors.
 *
 * Beats (3): b0 forks + stopwatch at 0.10 s; b1 bell jar + piston tube (the piston
 * moves forward); b2 microphone -> signal -> speaker, cutaway on top, whole below.
 */
import { SimScene } from 'simulations/base/kit/SimScene.js';
import { drawBackdrop, drawFloor, font, clamp01, outBack, lerp } from 'simulations/base/kit/SimLook.js';
import { drawTuningFork, drawBellJar, drawPistonTube, drawSpeaker, drawMicrophone, drawSignalWire,
  drawStopwatch } from 'simulations/base/kit/SimApparatus.js';

const GROUND = 486;
const RUN = 3.2;   // seconds of motion after each beat starts, then the scene rests

function tag(ctx, c, text, x, y) {
  ctx.save();
  ctx.font = font(c, 600, 26, true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.strokeStyle = c.bgSurface; ctx.strokeText(text, x, y);
  ctx.fillStyle = c.labelMuted; ctx.fillText(text, x, y);
  ctx.restore();
}

export class SoundApparatusShowcaseScene extends SimScene {
  static BEAT_STEP_MAP = [[{ idx: 0, dwellMs: null }], [{ idx: 1, dwellMs: null }], [{ idx: 2, dwellMs: null }]];
  static ARIA_LABEL = 'A sample sheet of sound apparatus: two tuning forks, one struck beside a rubber pad, a stopwatch, a bell jar with a ringing bell and a vacuum pump, a tube with a piston, and a microphone wired to a loudspeaker.';

  constructor(container, config) {
    super(container, config);
    this.cur = 0;
  }

  enter(stage) { this.cur = stage; }
  busy() { return this.age < RUN; }

  draw(ctx, c) {
    drawBackdrop(ctx, c, 'dots');
    drawFloor(ctx, c, GROUND, {});
    const t = Math.min(this.age, RUN), b = this.cur;
    if (b === 0) {
      drawTuningFork(ctx, c, { x: 110, y: GROUND - 6, h: 300, shadowY: GROUND });
      tag(ctx, c, 'still', 110, GROUND + 18);
      const fade = clamp01(1 - t / RUN);
      drawTuningFork(ctx, c, { x: 280, y: GROUND - 6, h: 300, vib: 0.35 + 0.65 * fade, t, freq: 6, pad: true, shadowY: GROUND });
      tag(ctx, c, 'struck', 280, GROUND + 18);
      drawStopwatch(ctx, c, { x: 548, y: 200, r: 84, seconds: lerp(0, 0.1, clamp01(t / 1.2)), dialSeconds: 1, text: lerp(0, 0.1, clamp01(t / 1.2)).toFixed(2) + ' s' });
    } else if (b === 1) {
      const k = outBack(clamp01(this.age / 0.8));
      drawPistonTube(ctx, c, { x: 70, y: 82, len: 580, d: 74, pos: lerp(40, 120, k) });
      drawBellJar(ctx, c, { x: 220, y: GROUND, w: 220, h: 230, hammer: t * 4, pump: t * 0.8 });
    } else {
      const cone = Math.sin(Math.PI * 2 * 3 * t), dia = Math.sin(Math.PI * 2 * 3 * t - 0.6);
      const mic = drawMicrophone(ctx, c, { x: 120, y: 120, r: 40, len: 130, facing: -1, cutaway: true, diaphragm: dia });
      const sp = drawSpeaker(ctx, c, { x: 560, y: 150, r: 66, facing: 1, cutaway: true, cone });
      drawSignalWire(ctx, c, { a: mic.wireOut, b: sp.wireIn, sag: 70, t, cycles: 5, speed: 1.2, style: 'pulse' });
      const mic2 = drawMicrophone(ctx, c, { x: 110, y: 350, r: 30, len: 110, facing: -1, stand: true, standY: GROUND });
      const sp2 = drawSpeaker(ctx, c, { x: 560, y: 360, r: 46, facing: -1, cone });
      drawSignalWire(ctx, c, { a: mic2.wireOut, b: sp2.wireIn, sag: 40, t, strip: false });
      tag(ctx, c, 'cutaway', 340, 40);
    }
  }
}
