import { SimScene } from 'simulations/base/kit/SimScene.js';
import { W, H, ZONES, alpha, mix, pill, blob, drawBackdrop, inOutSine } from 'simulations/base/kit/SimLook.js';
import { GEO_COLOR_MAP } from 'simulations/base/kit/GeoLook.js';
import { loadMap, layerCache, makeView, drawLand, reliefImage, drawIndia, streamlines, drawStreamlines } from 'simulations/base/kit/GeoMap.js';

/**
 * MonsoonFlowScene - SimScene + GeoMap showcase: a flow field on a map of India.
 * b0 June-September: the ITCZ moves north, moist south-west winds blow in from the
 * sea and rain falls on the Western Ghats and the north-east; b1 December-February:
 * the ITCZ is south of the equator, dry north-east winds blow out from the land;
 * b2 drag the month slider and watch the winds reverse. Winds are a simple schematic
 * field (direction right, speed not to scale). India's border: Survey of India layer.
 */
const S_SUMMER = 0, S_WINTER = 1, S_YEAR = 2;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TURN_S = 2.2;
const smooth = (a, b, x) => { const u = Math.max(0, Math.min(1, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
const itczLat = (s) => -8 + 32 * s;
const seasonOf = (month) => smooth(0.3, 0.7, 0.5 - 0.5 * Math.cos(2 * Math.PI * (month - 1) / 12));

// Wind (east, north) at lon/lat for season s (0 winter .. 1 summer).
function wind(lon, lat, s) {
  const z = itczLat(s);
  const north = smooth(z - 2, z + 2, lat);                       // 1 north of the ITCZ
  const somali = 1 + 0.6 * Math.exp(-(((lon - 55) / 6) ** 2));   // the strong jet off Somalia
  const southSummer = lat < -2 ? [-0.7, 0.55] : [0.85 * somali, 0.45];
  const southWinter = [-0.25, 0.25];
  const northSummer = [0.35, 0.12];
  const northWinter = [-0.75, -0.55];
  const S = southWinter.map((w, i) => w + (southSummer[i] - w) * s);
  const N = northWinter.map((w, i) => w + (northSummer[i] - w) * s);
  return S.map((w, i) => w + (N[i] - w) * north);
}

export class MonsoonFlowScene extends SimScene {
  static ARIA_LABEL = 'A map of India and the seas around it. In summer moist south-west winds blow in from the sea and bring rain; in winter dry north-east winds blow out from the land; a month slider reverses them.';
  static BEAT_STEP_MAP = [[{ idx: S_SUMMER }], [{ idx: S_WINTER }], [{ idx: S_YEAR }]];
  static COLOR_MAP = GEO_COLOR_MAP;
  static DEFAULT_TRANSITION_MS = 400;
  static CONTROLS = [{ type: 'slider', id: 'month', label: 'Month', min: 1, max: 12, value: 7 }];

  async setup() {
    this.map = await loadMap(['land', 'india', 'elevation']);
    this.season = 1;
    this.turn = null;
    this.cache = layerCache();
    await super.setup();
    this.view = await makeView(this._ctx, { kind: 'mercator', extent: [[58, -11], [99, 33]], box: { x: 16, y: 76, w: 648, h: 370 } });
    this.animateFor(500);
  }

  enter(stage) {
    const to = stage === S_SUMMER ? 1 : stage === S_WINTER ? 0 : seasonOf(Number(this.getControlValue('month')));
    this.turn = { from: this.season, to, t: 0 };
    if (stage === S_SUMMER) this.after(TURN_S, () => { const p = this.view?.at([76.3, 9.8]); if (p) { this.celebrate(p[0], p[1], 20); this.floatText('Monsoon reaches Kerala', p[0] + 20, p[1] - 30, { bg: this.colors.good }); } });
  }

  update(d) {
    const tw = this.turn;
    if (!tw) return;
    tw.t = Math.min(1, tw.t + d / TURN_S);
    this.season = tw.from + (tw.to - tw.from) * inOutSine(tw.t);
    if (tw.t >= 1) this.turn = null;
  }

  busy() { return !!this.turn; }

  isControlHidden(id) { return id === 'month' && this.stage !== S_YEAR; }
  onControlChange(id, val) {
    if (id !== 'month' || this.stage !== S_YEAR) return;
    this.turn = { from: this.season, to: seasonOf(Number(val)), t: 0.6 };
  }

  field(x, y) {
    const ll = this.view.proj.invert([x, y]);
    const [u, v] = wind(ll[0], ll[1], this.season);
    return [u, -v];
  }

  draw(ctx, c, t) {
    drawBackdrop(ctx, c, 'plain');
    const v = this.view, m = this.map;
    if (!v) return;
    const s = this.season;
    this.cache(ctx, [c], (o) => {
      o.save();
      o.beginPath();
      o.rect(v.box.x, v.box.y, v.box.w, v.box.h);
      o.clip();
      o.fillStyle = c.seaDeep;
      o.fillRect(v.box.x, v.box.y, v.box.w, v.box.h);
      drawLand(o, v, c, m.land, { relief: reliefImage(v, c, m, { step: 2 }) });
      drawIndia(o, v, c, m.india, { stroke: c.label, lineWidth: 2, credit: false });
      o.restore();
    });
    // ITCZ
    const a = v.at([48, itczLat(s)]), b = v.at([104, itczLat(s)]);
    ctx.save();
    ctx.setLineDash([12, 8]);
    ctx.strokeStyle = c.warning;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    ctx.restore();
    pill(ctx, c, 'ITCZ: winds meet', Math.max(a[0], v.box.x) + 10, a[1] - 16, { align: 'left', size: 14, bg: c.warning });
    // winds
    // Rebuild every 1/40 of a season while turning, and exactly once at rest (so the
    // lines at rest never depend on the path taken to get there).
    if (this.linesS === undefined || Math.abs(s - this.linesS) > 0.025 || (!this.turn && s !== this.linesS)) {
      this.lines = streamlines((x, y) => this.field(x, y), v.box, { step: 50, len: 12, h: 6 });
      this.linesS = s;
    }
    drawStreamlines(ctx, this.lines, mix(c.warning, c.accent, s), t, { width: 2.6 });
    if (s > 0.55) this.drawRain(ctx, c, (s - 0.55) / 0.45, t);
    this.drawChrome(ctx, c, s);
  }

  drawRain(ctx, c, k, t) {
    for (const [lon, lat, r] of [[74.2, 15.2, 30], [91.8, 25.6, 34]]) {
      const p = this.view.at([lon, lat]);
      ctx.save();
      ctx.globalAlpha = k;
      ctx.strokeStyle = c.seaShallow;
      ctx.lineWidth = 2;
      for (let i = 0; i < 7; i++) {
        const x = p[0] - r + i * r / 3, y = p[1] + 8 + ((t * 60 + i * 11) % 26);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 10); ctx.stroke();
      }
      // cartoon cloud: three puffs, a flat base, a light top
      const puffs = [[-0.45, 0.1, 0.5], [0, -0.2, 0.62], [0.45, 0.08, 0.48]];
      ctx.fillStyle = mix(c.label, c.bgSurface, 0.45);
      for (const [dx, dy, rr] of puffs) { blob(ctx, p[0] + dx * r, p[1] + dy * r + 3, rr * r, rr * r, 9, 0.06, 1); ctx.fill(); }
      ctx.fillStyle = mix(c.label, c.bgSurface, 0.2);
      for (const [dx, dy, rr] of puffs) { blob(ctx, p[0] + dx * r, p[1] + dy * r - 2, rr * r * 0.9, rr * r * 0.85, 9, 0.06, 1); ctx.fill(); }
      ctx.restore();
    }
    const g = this.view.at([74.2, 15.2]);
    if (k > 0.8) pill(ctx, c, 'Heavy rain', g[0] - 44, g[1] + 2, { align: 'right', size: 14, bg: c.accent });
  }

  drawChrome(ctx, c, s) {
    const st = this.stage;
    const when = st === S_SUMMER ? 'June to September' : st === S_WINTER ? 'December to February' : MONTHS[Number(this.getControlValue('month')) - 1];
    pill(ctx, c, when, ZONES.top.x + 4, ZONES.top.y + 26, { align: 'left', size: 18, bg: c.warning, display: true });
    const say = s > 0.5 ? 'Moist winds blow in from the sea' : 'Dry winds blow out from the land';
    pill(ctx, c, say, W - 20, ZONES.top.y + 26, { align: 'right', size: 16, bg: s > 0.5 ? c.accent : c.warning });
    pill(ctx, c, 'Winds: schematic. Boundary of India: Survey of India', W - 12, H - 20, { align: 'right', size: 13, bg: alpha(c.bgSurface, 0.85), ink: c.labelMuted });
  }
}
