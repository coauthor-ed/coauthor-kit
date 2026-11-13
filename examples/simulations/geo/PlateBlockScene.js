import { SimScene } from 'simulations/base/kit/SimScene.js';
import { W, ZONES, alpha, lighten, chipRow, pill, drawBackdrop, drawShadow, inOutSine } from 'simulations/base/kit/SimLook.js';
import { GEO_COLOR_MAP } from 'simulations/base/kit/GeoLook.js';
import { drawStrataBlock } from 'simulations/base/kit/GeoMap.js';

/**
 * PlateBlockScene - SimScene + drawStrataBlock showcase: cross-sections are 2D.
 * b0 plates pull apart: magma rises and makes new crust; b1 plates push together:
 * the layers fold up into mountains (the Himalaya); b2 plates slide past: they
 * stick, then jerk (an earthquake). Each stage plays once on entry; Replay reruns it.
 */
const S_APART = 0, S_PUSH = 1, S_SLIDE = 2;
const RUN_S = 3;
const LAYERS = [
  { key: 'strata1', thick: 0.1 }, { key: 'strata2', thick: 0.14 }, { key: 'strata3', thick: 0.16 },
  { key: 'strata4', thick: 0.18 }, { key: 'strata5', thick: 0.2 }, { key: 'strata6', thick: 0.22 },
];
const TITLES = ['Pull apart', 'Push together', 'Slide past'];

export class PlateBlockScene extends SimScene {
  static ARIA_LABEL = 'A cutaway block of rock layers. Plates pull apart and magma rises; plates push together and the layers fold into mountains; plates slide past each other and jerk in an earthquake.';
  static BEAT_STEP_MAP = [[{ idx: S_APART }], [{ idx: S_PUSH }], [{ idx: S_SLIDE }]];
  static COLOR_MAP = GEO_COLOR_MAP;
  static DEFAULT_TRANSITION_MS = 400;   // busy() covers the run
  static CONTROLS = [{ type: 'button', id: 'replay', label: 'Replay' }];

  enter() { this.run = { stage: this.stage, t: 0, done: false }; }

  update(d) {
    const r = this.run;
    if (!r || r.done) return;
    r.t = Math.min(1, r.t + d / RUN_S);
    if (r.stage === S_SLIDE && r.t > 0.7 && !r.jerked) { r.jerked = true; this.shake(12); this.floatText('Earthquake!', W / 2, 150, { bg: this.colors.bad, size: 18 }); }
    if (r.t >= 1) {
      r.done = true;
      if (r.stage !== S_SLIDE) this.celebrate(W / 2, r.stage === S_PUSH ? 170 : 200, 26);
    }
  }

  busy() { return !!this.run && !this.run.done; }

  onControlChange(id) {
    if (id === 'replay' && !this.busy()) this.run = { stage: this.stage, t: 0, done: false };
  }
  isControlDisabled(id) { return id === 'replay' && this.busy(); }

  draw(ctx, c) {
    drawBackdrop(ctx, c, 'dots', { k: 0.5 });
    const s = this.stage, k = this.run ? inOutSine(this.run.t) : 1;
    chipRow(ctx, c, TITLES.map((t, i) => ({ text: t, bg: i === s ? c.warning : alpha(c.bgSurface, 0.9), ink: i === s ? c.bgDeep : c.labelMuted })), W / 2, ZONES.top.y + 22, { align: 'center', size: 16 });
    drawShadow(ctx, c, W / 2, 440, 290, 20);
    if (s === S_APART) this.drawApart(ctx, c, k);
    else if (s === S_PUSH) this.drawPush(ctx, c, k);
    else this.drawSlide(ctx, c, k);
  }

  arrow(ctx, c, x, y, dir) {
    ctx.save();
    ctx.fillStyle = c.warning;
    ctx.strokeStyle = alpha(c.bgDeep, 0.5);
    ctx.lineWidth = 2;
    ctx.beginPath();
    const L = 46 * dir;
    ctx.moveTo(x, y - 7); ctx.lineTo(x + L * 0.6, y - 7); ctx.lineTo(x + L * 0.6, y - 16); ctx.lineTo(x + L, y);
    ctx.lineTo(x + L * 0.6, y + 16); ctx.lineTo(x + L * 0.6, y + 7); ctx.lineTo(x, y + 7); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  drawApart(ctx, c, k) {
    const gap = 16 + 70 * k;
    const bw = 250, y = 170, h = 250;
    drawStrataBlock(ctx, c, { x: W / 2 - gap / 2 - bw, y, w: bw, h }, { layers: LAYERS });
    // magma column rising into the gap, drawn between the blocks
    const gx = W / 2 - gap / 2 + 4, gw = gap - 8, top = y + 42 + (1 - k) * 160;
    ctx.save();
    ctx.fillStyle = c.magma;
    ctx.beginPath();
    ctx.moveTo(gx, y + h + 20);
    ctx.lineTo(gx, top + 12);
    ctx.quadraticCurveTo(gx + gw / 2, top - 14, gx + gw, top + 12);
    ctx.lineTo(gx + gw, y + h + 20);
    ctx.fill();
    ctx.fillStyle = alpha(lighten(c.magma, 0.5), 0.6);
    ctx.fillRect(gx + gw * 0.3, top + 10, gw * 0.4, y + h - top);
    ctx.restore();
    drawStrataBlock(ctx, c, { x: W / 2 + gap / 2, y, w: bw, h }, { layers: LAYERS });
    this.arrow(ctx, c, W / 2 - gap / 2 - bw + 20, 140, -1);
    this.arrow(ctx, c, W / 2 + gap / 2 + bw - 20, 140, 1);
    if (this.run?.done) {
      pill(ctx, c, 'Magma rises: new crust', W / 2, 118, { size: 16, bg: c.magma, display: true });
      pill(ctx, c, 'Mid-ocean ridges, rift valleys', W / 2, 470, { size: 14, bg: alpha(c.bgSurface, 0.9), ink: c.label });
    }
  }

  drawPush(ctx, c, k) {
    const squeeze = 1 - 0.18 * k, lift = 0.55 * k;
    const box = { x: 70, y: 190, w: 540, h: 230 };
    const deform = (x, y) => {
      const xc = 0.5 + (x - 0.5) * squeeze;
      const fold = Math.exp(-(((x - 0.5) / 0.16) ** 2)) + 0.35 * Math.exp(-(((x - 0.33) / 0.08) ** 2)) + 0.3 * Math.exp(-(((x - 0.66) / 0.07) ** 2));
      return [xc, y - lift * fold * (1 - 0.55 * y)];
    };
    const map = drawStrataBlock(ctx, c, box, { layers: LAYERS, deform, n: 72 });
    this.arrow(ctx, c, 30, 330, 1);
    this.arrow(ctx, c, W - 30, 330, -1);
    pill(ctx, c, 'Indian plate', 150, 450, { size: 15, bg: c.s1 });
    pill(ctx, c, 'Eurasian plate', W - 150, 450, { size: 15, bg: c.s4 });
    if (this.run?.done) {
      const [px, py] = map(0.5, 0);
      pill(ctx, c, 'Layers fold up: the Himalaya', px, py - 34, { size: 16, bg: c.warning, display: true });
    }
  }

  drawSlide(ctx, c, k) {
    // Stick-slip: little motion until 70% of the run, then a sudden jump.
    const slip = k < 0.7 ? 0.08 * (k / 0.7) : 0.08 + 0.92 * inOutSine((k - 0.7) / 0.3);
    const off = 70 * slip;
    const bw = 270, h = 220;
    drawStrataBlock(ctx, c, { x: W / 2 - bw + off * 0.7, y: 190 - off * 0.4, w: bw, h }, { layers: LAYERS });
    drawStrataBlock(ctx, c, { x: W / 2 - off * 0.7, y: 190 + off * 0.4, w: bw, h }, { layers: LAYERS });
    if (this.run?.done) {
      pill(ctx, c, 'Stuck, then a sudden slip', W / 2, 128, { size: 16, bg: c.bad, display: true });
      pill(ctx, c, 'No crust made or lost', W / 2, 470, { size: 14, bg: alpha(c.bgSurface, 0.9), ink: c.label });
    }
  }
}
