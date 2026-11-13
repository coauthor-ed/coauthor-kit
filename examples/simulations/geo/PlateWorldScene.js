import { SimScene } from 'simulations/base/kit/SimScene.js';
import { W, H, ZONES, alpha, chipRow, pill, drawBackdrop, drawTwinkles, inOutSine } from 'simulations/base/kit/SimLook.js';
import { GEO_COLOR_MAP } from 'simulations/base/kit/GeoLook.js';
import { loadMap, layerCache, makeView, drawGlobeBase, drawGlobeShade, drawLand, reliefImage, drawPlates, drawQuakes, drawVolcanoes, drawIndia, PLATE_KEYS } from 'simulations/base/kit/GeoMap.js';

/**
 * PlateWorldScene - SimScene + GeoMap showcase: a map with data layers, no WebGL.
 * b0 plates and their boundaries (PB2002); b1 earthquakes M6+ 2000-2024 (USGS) line
 * the boundaries; b2 turn to the Pacific: volcanoes (NOAA) ring it; b3 back to India:
 * the Indian plate's motion (PB2002 poles) and where it meets Eurasia.
 * Drag the globe to turn it. Every point and line is loaded data.
 */
const S_PLATES = 0, S_QUAKES = 1, S_VOLC = 2, S_INDIA = 3;
const AIM = { [S_PLATES]: [-78, -8], [S_QUAKES]: [-100, -5], [S_VOLC]: [-190, -5], [S_INDIA]: [-80, -18] };
const NAMES = ['IN', 'EU', 'AF', 'AU', 'PA', 'NA', 'SA', 'AN', 'AR', 'PS'];
const TURN_S = 1.6;

export class PlateWorldScene extends SimScene {
  static ARIA_LABEL = 'A globe of the tectonic plates. Earthquakes and volcanoes appear along the plate boundaries, circling the Pacific, and the Indian plate moves north-east into Eurasia.';
  static BEAT_STEP_MAP = [[{ idx: S_PLATES }], [{ idx: S_QUAKES }], [{ idx: S_VOLC }], [{ idx: S_INDIA }]];
  static COLOR_MAP = GEO_COLOR_MAP;
  static DRAGGABLE = true;
  static DEFAULT_TRANSITION_MS = 400;   // busy() covers every motion

  async setup() {
    this.map = await loadMap(['land', 'plates', 'quakes', 'volcanoes', 'india', 'elevation']);
    this.rot = AIM[S_PLATES].slice();
    this.turn = null;
    this.cache = layerCache();
    await super.setup();
    this.view = await makeView(this._ctx, { kind: 'orthographic', rotate: this.rot, box: { x: 150, y: 76, w: 380, h: 380 } });
    this.animateFor(500);
  }

  enter(stage) {
    this.turn = { from: this.rot.slice(), to: AIM[stage], t: 0 };
    this.reliefFor = null;
    if (stage === S_INDIA) this.after(TURN_S + 0.2, () => { const p = this.view?.at([86, 27]); if (p) this.celebrate(p[0], p[1], 24); });
  }

  update(d) {
    const tw = this.turn;
    if (tw) {
      tw.t = Math.min(1, tw.t + d / TURN_S);
      const e = inOutSine(tw.t);
      let dl = tw.to[0] - tw.from[0];
      dl = ((dl + 540) % 360) - 180;
      this.rot = [tw.from[0] + dl * e, tw.from[1] + (tw.to[1] - tw.from[1]) * e];
      if (tw.t >= 1) this.turn = null;
    }
    this.view?.setRotate(this.rot);
  }

  busy() { return !!this.turn || !!this.drag || (this.stage === S_INDIA && this.age < TURN_S + 0.8); }

  pointerDown(p) { this.drag = { x: p.x, y: p.y, rot: this.rot.slice() }; this.turn = null; this.reliefFor = null; }
  pointerMove(p) {
    if (!this.drag) return false;
    this.rot = [this.drag.rot[0] + (p.x - this.drag.x) * 0.45, Math.max(-60, Math.min(60, this.drag.rot[1] - (p.y - this.drag.y) * 0.3))];
    return false;
  }
  pointerUp() { this.drag = null; }

  draw(ctx, c, t) {
    drawBackdrop(ctx, c, 'dots', { k: 0.6 });
    drawTwinkles(ctx, c, t, { x: 0, y: 0, w: W, h: H }, { n: 14 });
    const v = this.view, m = this.map;
    if (!v) return;
    const s = this.stage;
    // Relief is slow to build: only while the globe is still; flat land while it turns.
    if (!this.turn && !this.drag && this.reliefFor !== c) {
      this.relief = reliefImage(v, c, m, { step: 2 });
      this.reliefFor = c;
    }
    const moving = !!(this.turn || this.drag);
    this.cache(ctx, [s, this.rot[0], this.rot[1], c, moving ? null : this.relief], (o) => {
      drawGlobeBase(o, v, c);
      drawLand(o, v, c, m.land, { relief: moving ? null : this.relief });
      drawPlates(o, v, c, m.plates, { alpha: s === S_PLATES || s === S_INDIA ? 1 : 0.75 });
      if (s >= S_QUAKES) drawQuakes(o, v, c, m.quakes, { alpha: s === S_QUAKES ? 0.6 : 0.3 });
      if (s >= S_VOLC) drawVolcanoes(o, v, c, m.volcanoes, { recentOnly: s !== S_VOLC });
      if (s === S_INDIA) drawIndia(o, v, c, m.india, { fill: alpha(c.warning, 0.28), stroke: c.warning, credit: false });
      drawGlobeShade(o, v, c);
    });
    if (s === S_INDIA && !this.turn) this.drawDrift(ctx, c);
    this.drawNames(ctx, c);
    this.drawChrome(ctx, c, s);
  }

  drawNames(ctx, c) {
    const v = this.view, { x, y, r } = v.centre();
    for (const f of this.map.plates.features) {
      const p = f.properties;
      if (p.kind !== 'plate' || !NAMES.includes(p.code)) continue;
      const q = v.at(f.geometry.coordinates);
      if (!q || Math.hypot(q[0] - x, q[1] - y) > r * 0.8) continue;
      pill(ctx, c, p.name, q[0], q[1], { size: 14, bg: alpha(c.bgSurface, 0.82), ink: c.label });
    }
  }

  drawDrift(ctx, c) {
    const f = this.map.plates.features.find((q) => q.properties.code === 'IN');
    const [ve, vn] = f.properties.vEU;
    const a = this.view.at([78, 17]), b = this.view.at([78 + ve * 0.28, 17 + vn * 0.28]);
    if (!a || !b) return;
    const u = Math.max(0.05, Math.min(1, (this.age - TURN_S) / 0.6));
    const tx = a[0] + (b[0] - a[0]) * u, ty = a[1] + (b[1] - a[1]) * u, ang = Math.atan2(ty - a[1], tx - a[0]);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = c.warning;
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(tx, ty); ctx.stroke();
    ctx.fillStyle = c.warning;
    ctx.beginPath();
    ctx.moveTo(tx + Math.cos(ang) * 14, ty + Math.sin(ang) * 14);
    ctx.lineTo(tx + Math.cos(ang + 2.4) * 14, ty + Math.sin(ang + 2.4) * 14);
    ctx.lineTo(tx + Math.cos(ang - 2.4) * 14, ty + Math.sin(ang - 2.4) * 14);
    ctx.fill();
    ctx.restore();
    const h = this.view.at([84, 30]);
    if (h && u >= 1) pill(ctx, c, 'Himalaya rise here', h[0] + 70, h[1] - 42, { size: 15, bg: c.bad, display: true });
  }

  drawChrome(ctx, c, s) {
    const top = ZONES.top;
    const legend = s === S_PLATES || s === S_INDIA
      ? [{ text: 'Spreading', bg: c[PLATE_KEYS.diverge] }, { text: 'Colliding', bg: c[PLATE_KEYS.converge] }, { text: 'Sliding past', bg: c[PLATE_KEYS.transform] }]
      : s === S_QUAKES
        ? [{ text: 'Earthquakes M6+, 2000-2024', bg: c.warning }, { text: 'Deep (over 70 km)', bg: c.s5 }]
        : [{ text: 'Volcanoes', bg: c.magma }, { text: 'Ring of Fire', bg: c.bad }];
    chipRow(ctx, c, legend, W / 2, top.y + 22, { align: 'center', size: 15 });
    const credit = s === S_INDIA ? 'Plates: Bird (2003). Boundary of India: Survey of India' : s === S_PLATES ? 'Plates: Bird (2003)' : s === S_QUAKES ? 'Data: USGS' : 'Data: NOAA NCEI';
    pill(ctx, c, credit, W - 12, H - 20, { align: 'right', size: 13, bg: alpha(c.bgSurface, 0.85), ink: c.labelMuted });
    if (s === S_PLATES) pill(ctx, c, 'Drag to turn the globe', 12, H - 20, { align: 'left', size: 13, bg: alpha(c.bgSurface, 0.85), ink: c.label });
  }
}
