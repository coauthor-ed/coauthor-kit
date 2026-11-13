import { GeoScene } from 'simulations/base/kit/GeoScene.js';
import { heightfield, waterPlane, ribbon, fbm } from 'simulations/base/kit/GeoTerrain.js';
import { formatYears } from 'simulations/base/kit/GeoLook.js';

/**
 * RiverValleyTimeScene - GeoScene + GeoTerrain showcase: a river shapes its valley
 * over time. The land is a pure function of t (0..1 = 0..1 million years), so
 * scrubbing back works and every beat is the same however the learner got there.
 * b0 young river: a narrow V-shaped valley in the uplands (t = 0.12)
 * b1 time passes: the valley widens and the middle course meanders (t -> 0.6)
 * b2 the mouth: load dropped where the river meets the sea builds a delta (t -> 1)
 * Heights are exaggerated 2x (said on screen).
 */
const X0 = -6, X1 = 6, D = 8, EX = 2;          // river runs from x = X0 (upland) to the sea past x = 4.6
const noise = fbm(11);
const smooth = (a, b, x) => { const u = Math.max(0, Math.min(1, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
const meander = (x, t) => 1.15 * Math.pow(t, 1.2) * smooth(-3, -1, x) * (1 - smooth(3.4, 4.4, x));
const centre = (x, t) => meander(x, t) * Math.sin(1.35 * x + 0.4);
const deltaK = (t) => smooth(0.5, 1, t);
const LOBES = [-0.55, 0, 0.5];          // distributary directions (radians off the main course)

// The river cuts down toward a concave long profile that ends at sea level (base level),
// never below it; young valleys are V-shaped, old ones get a flat floodplain.
const bed = (x) => 1.1 * Math.pow(1 - smooth(-6.5, 4.4, x), 1.7) + 0.03;

function height(x, z, t) {
  const surface = 1.35 * Math.pow(1 - smooth(-6.5, 4.8, x), 0.8) - 0.35 * smooth(4.2, 6, x)
    + noise(x * 0.35, z * 0.35) * 0.18 + noise(x * 1.3 + 7, z * 1.3) * 0.05;
  const up = 1 - smooth(-2, 4.2, x);
  const width = 0.45 + (0.6 + 2.6 * (1 - up)) * t;
  const r = Math.abs(z - centre(x, t)) / width;
  let h = surface;
  if (r < 1 && x < 4.4) {
    const cut = Math.min(1, 0.45 + 0.9 * t);
    const floor = Math.max(bed(x), surface - (surface - bed(x)) * cut);
    const shape = r * (1 - t) + smooth(0.45, 1, r) * t;
    h = Math.min(surface, floor + (surface - floor) * shape);
  }
  const k = deltaK(t);
  if (k > 0 && x > 3.3) {
    for (const a of LOBES) {
      const along = (x - 4.2) * Math.cos(a) + z * Math.sin(a), across = -(x - 4.2) * Math.sin(a) + z * Math.cos(a);
      const lobe = Math.exp(-(((along - 0.9) / 1.1) ** 2) - (across / 0.55) ** 2);
      h = Math.max(h, 0.02 + 0.09 * k * lobe * (1 - 0.7 * Math.exp(-((across / 0.08) ** 2))) + (h - 0.02) * (1 - lobe * k));
    }
  }
  return h;
}

export class RiverValleyTimeScene extends GeoScene {
  static ARIA_LABEL = 'A 3D landscape with a river running from uplands to the sea. Over a million years the narrow V-shaped valley widens, the river meanders, and a delta builds out at the mouth.';
  static BEAT_STEP_MAP = [[{ idx: 0 }], [{ idx: 1 }], [{ idx: 2 }]];
  static BACKDROP = 'sky';
  static ORBIT = true;
  static ORBIT_LIMITS = { min: 4, max: 20 };
  static SHOTS = {
    upper: { pos: [-9.9, 4.5, 3.7], look: [-4.4, 1.2, 0] },
    middle: { pos: [3, 10.5, 10.5], look: [-0.5, 0.4, 0] },
    mouth: { pos: [9.5, 5.5, 6.5], look: [3.6, 0, 0] },
  };
  static CONTROLS = [
    { type: 'slider', id: 'time', label: 'Time', min: 0, max: 100, value: 12 },
    { type: 'button', id: 'reset', label: 'Reset view' },
  ];
  static STAGE_T = [0.12, 0.6, 1];

  async setup() {
    this.v = { t: 0.12 };
    this.shownT = -1;
    await super.setup();
  }

  build(T) {
    this.lights({ keyPos: [-4, 7, 5] });
    this.land = heightfield(this, { size: [X1 - X0, D], n: 110, height: (x, z) => EX * height(x, z, this.v.t), metres: 800, skirt: -1.6 });
    this.sea = waterPlane(this, { size: [X1 - X0, D], level: 0.02, key: 'seaShallow', opacity: 0.8 });
    this.river = ribbon(this, this.riverPoints(this.v.t), { width: (u) => 0.16 + 0.34 * u, key: 'seaShallow', lift: 0.07 });
    this.dist = LOBES.map((a) => ribbon(this, this.lobePoints(a), { width: 0.08, key: 'seaShallow' }));
    for (const r of this.dist) { r.material.transparent = true; r.visible = deltaK(this.v.t) > 0.35; }
    this.scene.add(this.land, this.sea, this.river, ...this.dist);
    this.shownT = this.v.t;
    this.anchors = { v: new T.Vector3(), mean: new T.Vector3(), delta: new T.Vector3(4.9, 0.4, 0), sea: new T.Vector3(5.6, 0.05, 2.9) };
    this.placeAnchors(this.v.t);
    this.label('v', 'V-shaped valley', this.anchors.v, { key: 'warning', side: 'up', sub: 'young river cuts down' });
    this.label('wide', 'Valley widens', this.anchors.v, { key: 'warning', side: 'up', sub: 'sides wear back' });
    this.label('mean', 'Meander', this.anchors.mean, { key: 's4', side: 'up' });
    this.label('delta', 'Delta', this.anchors.delta, { key: 'good', side: 'up', sub: 'river drops its load' });
    this.label('sea', 'Sea', this.anchors.sea, { key: 'accent', side: 'right' });
  }

  riverPoints(t) {
    const pts = [];
    for (let x = X0 + 0.2; x <= 4.4; x += 0.12) { const z = centre(x, t); pts.push([x, EX * height(x, z, t), z]); }
    return pts;
  }

  lobePoints(a) {
    return Array.from({ length: 12 }, (_, i) => {
      const s = 0.1 + i * 0.17, x = 4.2 + s * Math.cos(a), z = s * Math.sin(a);
      return [x, 0.05, z];
    });
  }

  enter(stage) {
    for (const id of ['v', 'wide', 'mean', 'delta', 'sea']) this.labelOn(id, false);
    const t = this.constructor.STAGE_T[stage] ?? 1;
    this.shot(['upper', 'middle', 'mouth'][stage] ?? 'middle');
    this.tweenTo('t', t, stage === 0 ? 0.8 : 4);
    this.hud('br', 'Heights drawn 2x taller than real');
    if (stage === 0) this.after(1.2, () => this.labelOn('v'));
    if (stage === 1) this.after(3.6, () => { this.labelOn('wide'); this.labelOn('mean'); });
    if (stage === 2) {
      this.labelOn('sea');
      this.after(3.8, () => { this.labelOn('delta'); this.celebrate(this.anchors.delta); });
    }
  }

  update() {
    const t = this.v.t;
    this.hud('tl', t < 0.005 ? 'Start' : `After ${formatYears(t * 1e6)}`);
    if (!this.land || Math.abs(t - this.shownT) < 0.002) return;
    this.shownT = t;
    this.land.userData.setHeight((x, z) => EX * height(x, z, t));
    this.river.userData.setPoints(this.riverPoints(t));
    const k = deltaK(t);
    for (const r of this.dist) { r.visible = k > 0.35; r.material.opacity = k; }
    this.placeAnchors(t);
  }

  placeAnchors(t) {
    const xv = this.stage <= 0 ? -5.4 : -2.2, xm = 1.25;
    this.anchors.v.set(xv, EX * height(xv, centre(xv, t), t) + 0.1, centre(xv, t));
    this.anchors.mean.set(xm, EX * height(xm, centre(xm, t), t) + 0.1, centre(xm, t));
  }

  isControlHidden(id) { return id === 'time' && this.stage === 0; }
  getControlValue(id) { return id === 'time' ? Math.round(this.v.t * 100) : super.getControlValue(id); }

  onControlChange(id, val) {
    if (id === 'reset') this.resetView();
    if (id === 'time') { this.tweenTo('t', Number(val) / 100, 0); this.animateFor(300); }
  }
}
