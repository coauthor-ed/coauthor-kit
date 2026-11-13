import { CanvasSimulation } from 'simulations/base/CanvasSimulation.js';
import { SimDraw } from 'simulations/base/SimDrawUtils.js';
import { SimGeo } from 'simulations/base/SimGeo.js';
import { readSimColors } from 'simulations/base/SimTheme.js';
import { clamp01, cruise, smooth, lerp } from 'simulations/base/SimMotion.js';

/**
 * HarappanRegionMapScene - companion to blk-example-sim-history-map.json,
 * the FIRST (and only) beat-bearing block of this two-slide example. A
 * globe spins/zooms into a near-empty regional map, then a pulsing ring
 * makes "1.5 million square kilometres" a size on screen, not just a
 * number in the text.
 *
 * Deliberately narrow: no named sites, no zoom targets, no vignettes -
 * everything after this slide is real illustrated photos (`reveal.images`
 * on the next block), so this scene's only job is what a static image
 * can't do: a sense of scale/emptiness grown out of an actual globe. See
 * HarappanCityPlanScene.js for this example's other surviving scene, and
 * examples/media/L02/README.md for where the illustrations came from.
 */

const W = 800;
const H = 500;

const COLOR_TOKEN_MAP = {
  bgDeep:      ['--sim-bg-deep', '#0a0f1e'],
  label:       ['--sim-label', '#e2e8f0'],
  labelBg:     ['--sim-label-bg', '#1e293bcc'],
  warning:     ['--sim-warning', '#fbbf24'],
  mapOcean:    ['--sim-map-ocean', '#081426'],
  mapLand:     ['--sim-map-land', '#1e293b'],
  mapLandLine: ['--sim-map-land-stroke', '#334155'],
  mapPin:      ['--sim-map-pin', '#ef4444'],
  mapWater:    ['--sim-water', '#38bdf8'],
};

const REGION_BOUNDS = {
  type: 'Polygon',
  coordinates: [[[65, 19], [65, 34], [81, 34], [81, 19], [65, 19]]],
};

// India's border comes only from SimGeo.loadLayer('india') (Survey of India);
// world-atlas 'countries' draws de facto borders and is illegal for India.

const INDUS_RIVER = {
  type: 'Feature',
  properties: { name: 'Indus' },
  geometry: { type: 'LineString', coordinates: [
    [72.3, 33.9], [71.5, 31.4], [70.3, 29.4], [69.3, 28.0], [68.6, 25.9], [67.6, 24.3],
  ] },
};
const SARASVATI_RIVER = {
  type: 'Feature',
  properties: { name: 'Sarasvatī (dry)' },
  geometry: { type: 'LineString', coordinates: [
    [77.35, 30.3], [76.0, 29.9], [74.5, 29.5], [72.5, 28.8], [71.0, 27.8], [70.2, 25.0],
  ] },
};

function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A sparse, deterministic scatter of unnamed settlements - sells "this
// land isn't really empty, just under-explored yet" without claiming a
// precise dataset. Fixed count: this scene never grows it (nothing here
// names a site or a phase - that's the next block's job).
function buildScatter() {
  const rand = mulberry32(20260823);
  const points = [];
  for (let i = 0; i < 10; i++) points.push({ lon: 67 + rand() * 12, lat: 21 + rand() * 10 });
  return points;
}
const SCATTER = buildScatter();

function buildStars() {
  const rand = mulberry32(4200226);
  const stars = [];
  for (let i = 0; i < 70; i++) stars.push({ x: rand() * W, y: rand() * H, r: 0.4 + rand() * 1.1, a: 0.25 + rand() * 0.5 });
  return stars;
}
const STARS = buildStars();

const GLOBE_START_ROTATE = [-40, -8, 0];
const GLOBE_END_ROTATE = [-72, -23, 0];
const GLOBE_START_SCALE = 130;
const GLOBE_END_SCALE = 620;
const GLOBE_DURATION = 3.4;

const STEP_GLOBE = 'globe';
const STEP_SPARSE = 'sparse';

export class HarappanRegionMapScene extends CanvasSimulation {
  static WIDTH = W;
  static HEIGHT = H;
  // _drawRegionHighlight()'s pulse runs forever once revealed (beat 1+) -
  // genuinely perpetual, so this stays exempt from the come-to-rest budget.
  static CONTINUOUS = true;
  static ARIA_LABEL =
    'A globe spins and zooms into a map of the ancient Sarasvatī and Indus river valleys around ' +
    '7000 BCE, showing only a handful of scattered settlements. A pulsing ring then highlights the ' +
    'roughly 1.5 million square kilometre extent this civilisation would eventually reach.';

  static CONTROLS = [];

  constructor(container, config) {
    super(container, config);
    this.allowResume = true;
    this.colors = null;

    this._step = STEP_GLOBE;
    this._stepEnterTime = 0;
    this._sceneClock = 0;
    this._globeDwell = GLOBE_DURATION;
    this._highlightOn = false;
    this._highlightRevealedAt = null;

    this._land = null;
    this._india = null;
    this._projection = null;
    this._path = null;
    this._graticule = null;
    this._globeProjection = null;
    this._globePath = null;
    this._regionCenter = null;
    this._regionRadius = 160;

    this._liveRegion = null;
  }

  async setup() {
    await super.setup();
    this._canvas.setAttribute('role', 'img');
    this._canvas.setAttribute('aria-label', this.constructor.ARIA_LABEL);
    this._reloadColors();
    this._buildLiveRegion();

    this._land = await SimGeo.loadWorld('land');
    this._india = await SimGeo.loadLayer('india');
    this._projection = await SimGeo.makeProjection('mercator', REGION_BOUNDS, [W, H]);
    this._path = await SimGeo.makePath(this._ctx, this._projection);
    this._graticule = await SimGeo.makeGraticule([5, 5]);

    this._globeProjection = await SimGeo.makeProjection('orthographic', this._land, [W, H], {
      rotate: GLOBE_START_ROTATE, clipAngle: 90,
    });
    this._globePath = await SimGeo.makePath(this._ctx, this._globeProjection);

    const pts = SCATTER.map(pt => SimGeo.project(this._projection, [pt.lon, pt.lat])).filter(Boolean);
    if (pts.length) {
      this._regionCenter = [
        pts.reduce((s, p) => s + p[0], 0) / pts.length,
        pts.reduce((s, p) => s + p[1], 0) / pts.length,
      ];
    }

    this._drawInitialFrame(this._ctx);
    this._announce('An empty-looking map. Around 7000 BCE, this land holds only scattered villages.');
  }

  destroy() {
    if (this._liveRegion) { this._liveRegion.remove(); this._liveRegion = null; }
    super.destroy();
  }

  _reloadColors() {
    this.colors = readSimColors(this.container, COLOR_TOKEN_MAP);
  }

  _buildLiveRegion() {
    this._liveRegion = document.createElement('div');
    this._liveRegion.setAttribute('role', 'status');
    this._liveRegion.setAttribute('aria-live', 'polite');
    this._liveRegion.style.cssText =
      'position:absolute;width:1px;height:1px;padding:0;margin:-1px;' +
      'overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;';
    this.container.appendChild(this._liveRegion);
  }

  _announce(text) { if (this._liveRegion) this._liveRegion.textContent = text; }

  // 3 beats matching this block's markdown split: beat 0 plays the globe
  // intro, beat 1 reveals the scale ring where the text names the number,
  // beat 2 leaves it in place for the takeaway line.
  onBeatChange(beatIndex) {
    const clamped = Math.max(0, Math.min(beatIndex, 2));
    const wasOn = this._highlightOn;
    this._highlightOn = clamped >= 1;
    if (this._highlightOn && !wasOn) this._highlightRevealedAt = this._sceneClock;

    if (clamped === 0) {
      this._step = STEP_GLOBE;
      this._globeDwell = GLOBE_DURATION;
    } else {
      this._step = STEP_SPARSE;
      this._globeDwell = null;
    }
    this._stepEnterTime = 0;
    this._announce(clamped === 0
      ? 'Around 7000 BCE, this land holds only scattered villages.'
      : 'A civilisation that would one day cover 1.5 million square kilometres.');
  }

  _tick(ctx, dt) {
    this._stepEnterTime += dt;
    this._sceneClock += dt;
    if (this._step === STEP_GLOBE && this._globeDwell != null) {
      this._globeDwell -= dt;
      if (this._globeDwell <= 0) { this._step = STEP_SPARSE; this._stepEnterTime = 0; this._globeDwell = null; }
    }

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = this.colors.bgDeep;
    ctx.fillRect(0, 0, W, H);

    if (this._step === STEP_GLOBE) {
      this._drawGlobeIntro(ctx);
    } else {
      this._drawMap(ctx);
      if (this._highlightOn) this._drawRegionHighlight(ctx);
    }
  }

  _drawInitialFrame(ctx) { this._tick(ctx, 0); }

  // Orthographic globe, rotate/scale animated live on the same projection
  // object every frame (d3 projections are mutable - no rebuild needed).
  // Starts wide/distant, ends centred on South Asia, then crossfades into
  // the flat regional map underneath - one continuous "fly-in," not a cut.
  _drawGlobeIntro(ctx) {
    const c = this.colors;
    const progress = clamp01(this._stepEnterTime / GLOBE_DURATION);
    const eased = cruise(progress);

    for (const s of STARS) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = SimDraw.withAlpha(c.label, s.a);
      ctx.fill();
    }

    const rotate = [
      lerp(GLOBE_START_ROTATE[0], GLOBE_END_ROTATE[0], eased),
      lerp(GLOBE_START_ROTATE[1], GLOBE_END_ROTATE[1], eased),
      0,
    ];
    const scale = lerp(GLOBE_START_SCALE, GLOBE_END_SCALE, eased);
    this._globeProjection.rotate(rotate).scale(scale).translate([W / 2, H / 2]);

    const globeAlpha = 1 - smooth(0.82, 1, progress);
    ctx.save();
    ctx.globalAlpha = globeAlpha;

    ctx.beginPath();
    ctx.arc(W / 2, H / 2, scale, 0, Math.PI * 2);
    ctx.fillStyle = c.mapOcean;
    ctx.fill();
    ctx.strokeStyle = SimDraw.withAlpha(c.label, 0.3);
    ctx.lineWidth = 1;
    ctx.stroke();

    if (this._graticule) {
      SimGeo.drawFeatures(ctx, this._globePath, this._graticule, { stroke: SimDraw.withAlpha(c.mapLandLine, 0.5), lineWidth: 0.6 });
    }
    SimGeo.drawFeatures(ctx, this._globePath, this._land, { fill: c.mapLand, stroke: c.mapLandLine, lineWidth: 1 });
    SimDraw.drawGlow(ctx, W / 2, H / 2, scale * 1.08, c.warning, 0.12 * globeAlpha);
    ctx.restore();

    if (globeAlpha < 1) {
      ctx.save();
      ctx.globalAlpha = 1 - globeAlpha;
      this._drawMap(ctx);
      ctx.restore();
    }
  }

  // The flat regional map: ocean, land, India from the Survey of India layer
  // (the only legal source of its border), the Indus (solid) and Sarasvatī (dashed, the
  // dry paleochannel the block's own text names), and a sparse settlement
  // scatter. No named sites, no zoom - that's the next block's job.
  _drawMap(ctx) {
    const c = this.colors;
    ctx.fillStyle = c.mapOcean;
    ctx.fillRect(0, 0, W, H);

    if (this._graticule) {
      SimGeo.drawFeatures(ctx, this._path, this._graticule, { stroke: SimDraw.withAlpha(c.mapLandLine, 0.35), lineWidth: 0.6 });
    }

    SimGeo.drawFeatures(ctx, this._path, this._land, { fill: SimDraw.shade(c.mapLand, -0.2), stroke: c.mapLandLine, lineWidth: 1 });
    if (this._india) {
      SimGeo.drawFeatures(ctx, this._path, this._india, { fill: SimDraw.shade(c.mapLand, 0.22), stroke: SimDraw.withAlpha(c.label, 0.35), lineWidth: 1 });
    }

    this._drawRivers(ctx);

    for (const pt of SCATTER) {
      const p = SimGeo.project(this._projection, [pt.lon, pt.lat]);
      if (!p) continue;
      ctx.beginPath();
      ctx.arc(p[0], p[1], 1.6, 0, Math.PI * 2);
      ctx.fillStyle = SimDraw.withAlpha(c.mapPin, 0.45);
      ctx.fill();
    }

    SimDraw.drawLabel(ctx, '~7000 BCE', 74, 40, { bg: c.labelBg, color: c.label });
    SimDraw.drawLabel(ctx, 'Boundary of India: Survey of India', W - 150, H - 18, { bg: c.labelBg, color: c.label });
  }


  _drawRivers(ctx) {
    const c = this.colors;
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    SimGeo.drawFeatures(ctx, this._path, INDUS_RIVER, { stroke: SimDraw.withAlpha(c.mapWater, 0.85), lineWidth: 2.6 });
    ctx.setLineDash([5, 4]);
    SimGeo.drawFeatures(ctx, this._path, SARASVATI_RIVER, { stroke: SimDraw.withAlpha(c.mapWater, 0.55), lineWidth: 2 });
    ctx.restore();

    const indusSrc = SimGeo.project(this._projection, INDUS_RIVER.geometry.coordinates[0]);
    const sarasvatiSrc = SimGeo.project(this._projection, SARASVATI_RIVER.geometry.coordinates[0]);
    if (indusSrc) SimDraw.drawLabel(ctx, 'Indus', indusSrc[0] + 10, indusSrc[1] + 14, { bg: c.labelBg, color: c.mapWater, offsetY: -14 });
    if (sarasvatiSrc) SimDraw.drawLabel(ctx, 'Sarasvatī (dry)', sarasvatiSrc[0], sarasvatiSrc[1] - 6, { bg: c.labelBg, color: c.mapWater, offsetY: -6 });
  }

  // A large, slowly pulsing ring making "1.5 million square kilometres" a
  // size on screen, not just a number in the text. Fades in once revealed
  // (`_highlightRevealedAt`), independent of the beat-reset scene clock so
  // its own timing doesn't jump when a later beat re-enters the same step.
  _drawRegionHighlight(ctx) {
    if (!this._regionCenter) return;
    const c = this.colors;
    const [x, y] = this._regionCenter;
    const revealT = smooth(0, 0.6, this._sceneClock - (this._highlightRevealedAt ?? 0));
    if (revealT <= 0) return;

    const pulse = 0.5 + 0.5 * Math.sin(this._sceneClock * 1.6);
    const r = this._regionRadius * (0.97 + pulse * 0.03);

    ctx.save();
    ctx.globalAlpha = revealT;
    SimDraw.drawGlow(ctx, x, y, r * 0.9, c.warning, 0.03 + pulse * 0.02);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.strokeStyle = SimDraw.withAlpha(c.warning, 0.35 + pulse * 0.2);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = revealT;
    SimDraw.drawLabel(ctx, '~1.5M km²', x, Math.max(24, y - r) - 4, { bg: c.labelBg, color: c.label });
    ctx.restore();
  }
}
