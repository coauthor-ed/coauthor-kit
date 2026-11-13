import { GeoScene } from 'simulations/base/kit/GeoScene.js';
import { globe, loadGlobeData, sphereGeo, overlaySphere, lonLatToVec3, arrow, glowSprite } from 'simulations/base/kit/GeoTerrain.js';
import { PLATE_KEYS } from 'simulations/base/kit/GeoMap.js';
import { SimGeo } from 'simulations/base/SimGeo.js';

/**
 * EarthCutawayScene - GeoScene showcase (3D where rotation and depth are the point).
 * b0 the whole Earth, India facing us; b1 a wedge slides out: crust, mantle, outer
 * and inner core; b2 mantle rock circulates (hot rises, cool sinks); b3 plate
 * boundaries (PB2002) appear and the Indian plate's arrow grows (Euler-pole data).
 * Radii are true to scale except the crust (drawn 6x thicker, said on screen).
 */
const R = 2;
const RAD = { inner: 0.19, outer: 0.55, lowerMantle: 0.78, crust: 0.97 };
const GAP0 = 140 * Math.PI / 180, GAP = Math.PI / 2;   // wedge removed: longitudes 40W..50E
const dir = (phiDeg, elevDeg, d) => {
  const p = phiDeg * Math.PI / 180, e = elevDeg * Math.PI / 180;
  return [-Math.cos(p) * Math.cos(e) * d, Math.sin(e) * d, Math.sin(p) * Math.cos(e) * d];
};
const add = (a, b) => a.map((v, i) => v + b[i]);
const FACE1 = dir(140, 0, 1.45);   // middle of the mantle on the first cut face

export class EarthCutawayScene extends GeoScene {
  static ARIA_LABEL = 'A 3D Earth. A wedge opens to show the crust, mantle, outer core and inner core; mantle rock circulates; plate boundaries and the Indian plate moving north-east appear.';
  static BEAT_STEP_MAP = [[{ idx: 0 }], [{ idx: 1 }], [{ idx: 2 }], [{ idx: 3 }]];
  static ORBIT = true;
  static ORBIT_LIMITS = { min: 4.5, max: 14 };
  static SHOTS = {
    earth: { pos: dir(260, 20, 7.2) },
    cut: { pos: dir(185, 26, 7.6) },
    mantle: { pos: add(FACE1, dir(222, 14, 5.2)), look: FACE1 },
    plates: { pos: dir(262, 22, 6.6) },
  };
  static CONTROLS = [{ type: 'button', id: 'reset', label: 'Reset view' }];

  async setup() {
    [this.geoData, this.plateData] = await Promise.all([loadGlobeData(), SimGeo.loadLayer('plates')]);
    this.v = { open: 0, flow: 0, plates: 0, arrow: 0 };
    await super.setup();
  }

  build(T) {
    this.lights();
    const whole = globe(this, { data: this.geoData, radius: R, india: true, graticule: true });
    const cut = new T.Mesh(sphereGeo(T, R, this.lowEnd ? 48 : 96, [GAP0 + GAP, Math.PI * 2 - GAP]), whole.material);
    const wedgeMat = whole.material.clone();
    wedgeMat.transparent = true;
    const wedge = new T.Mesh(sphereGeo(T, R, 48, [GAP0, GAP]), wedgeMat);
    const faces = new T.Group();
    for (const phi of [GAP0, GAP0 + GAP]) faces.add(this.face(T, phi));
    const plates = overlaySphere(this, {
      radius: R * 1.004, opacity: 0,
      draw: (ctx, eq, c, tw) => this.paintPlates(ctx, eq, c, tw),
    });
    this.scene.add(whole, cut, wedge, faces, plates);
    this.m = { whole, cut, wedge, faces, plates, loops: this.loops(T), arrow: this.indiaArrow(T) };
    this.scene.add(this.m.loops, this.m.arrow);

    const india = lonLatToVec3(T, 79, 22, R);
    this.label('india', 'India', india, { key: 'warning', face: india.clone().normalize() });
    const fd = (r, deg) => this.facePoint(T, GAP0 + GAP, r, deg);
    this.label('crust', 'Crust', fd(0.985, 62), { key: 's1', side: 'right' });
    this.label('mantle', 'Mantle', fd(0.8, 30), { key: 's4', side: 'right', sub: 'solid rock that flows slowly' });
    this.label('outer', 'Outer core', fd(0.45, -10), { key: 'warning', side: 'right', sub: 'liquid iron' });
    this.label('inner', 'Inner core', fd(0.08, -60), { key: 'good', side: 'down', sub: 'solid iron' });
    this.label('rise', 'Hot rock rises', this.loopPoint(T, 35, 3 * Math.PI / 2), { key: 'bad', side: 'left' });
    this.label('sink', 'Cool rock sinks', this.loopPoint(T, 35, Math.PI / 2), { key: 's1', side: 'up' });
    this.label('plate', 'Indian plate', this.arrowTip, { key: 'warning', side: 'right', sub: 'moving north-east', face: india.clone().normalize() });
  }

  // One cut face: half-annuli of the layers, in the plane at longitude angle phi.
  face(T, phi) {
    const g = new T.Group();
    const seg = this.lowEnd ? 32 : 64;
    const ring = (r0, r1, key, glow) => {
      const m = this.mat(key, { side: T.DoubleSide, emissive: glow ? 'magma' : undefined, emissiveIntensity: glow ?? 0 });
      g.add(new T.Mesh(new T.RingGeometry(r0 * R, r1 * R, seg, 1, -Math.PI / 2, Math.PI), m));
    };
    ring(RAD.crust, 1, 'strata5');
    ring(RAD.lowerMantle, RAD.crust, 'strata3', 0.15);
    ring(RAD.outer, RAD.lowerMantle, 'strata3', 0.45);
    ring(RAD.inner, RAD.outer, 'magma', 0.6);
    const core = new T.Mesh(new T.CircleGeometry(RAD.inner * R, seg, -Math.PI / 2, Math.PI), this.mat('warning', { side: T.DoubleSide, emissive: 'warning', emissiveIntensity: 0.7 }));
    g.add(core);
    g.rotation.y = Math.PI + phi;
    return g;
  }

  facePoint(T, phi, r, deg) {
    const a = deg * Math.PI / 180;
    const p = new T.Vector3(r * R * Math.cos(a), r * R * Math.sin(a), 0.02);
    return p.applyAxisAngle(new T.Vector3(0, 1, 0), Math.PI + phi);
  }

  // Convection loop on the first face: centre angle deg, parameter t.
  loopPoint(T, deg, t) {
    const rc = 0.76, a = 0.12, b = 0.36;
    const th = deg * Math.PI / 180 + b * Math.sin(t);
    return this.facePoint(T, GAP0, rc + a * Math.cos(t), th * 180 / Math.PI);
  }

  loops(T) {
    const g = new T.Group();
    this.blobs = [];
    for (const deg of [35, -35]) {
      const pts = Array.from({ length: 48 }, (_, i) => this.loopPoint(T, deg, i / 48 * Math.PI * 2));
      const tube = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts, true), 96, 0.03, 6, true), this.mat('warning', { transparent: true, opacity: 0.8, emissive: 'warning', emissiveIntensity: 0.5 }));
      g.add(tube);
      for (let k = 0; k < 4; k++) {
        const s = glowSprite(this, k % 2 ? 'magma' : 'warning', 0.34);
        g.add(s);
        this.blobs.push({ s, deg, k });
      }
    }
    return g;
  }

  indiaArrow(T) {
    const f = this.plateData.features.find((q) => q.properties.code === 'IN');
    const [ve, vn] = f?.properties.vEU ?? [16, 43];
    const lon = 78, lat = 16;
    const from = lonLatToVec3(T, lon, lat, R * 1.03);
    const up = from.clone().normalize();
    const east = new T.Vector3(0, 1, 0).cross(up).normalize();
    const north = up.clone().cross(east).normalize();
    const d = east.multiplyScalar(ve).add(north.multiplyScalar(vn)).normalize().multiplyScalar(0.9);
    const to = from.clone().add(d);
    this.arrowTip = to.clone();
    const g = new T.Group();
    g.add(arrow(this, new T.Vector3(), d, { key: 'warning', radius: 0.05 }));
    g.position.copy(from);
    return g;
  }

  paintPlates(ctx, eq, c, tw) {
    const lw = tw / 700;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const f of this.plateData.features) {
      const k = f.properties.kind;
      if (!PLATE_KEYS[k] || f.geometry.type !== 'MultiLineString') continue;
      ctx.strokeStyle = c[PLATE_KEYS[k]];
      ctx.lineWidth = lw * (k === 'subduct' ? 2.4 : 1.8);
      ctx.beginPath();
      for (const line of f.geometry.coordinates) {
        line.forEach((p, i) => {
          const [x, y] = eq(p);
          if (i && Math.abs(p[0] - line[i - 1][0]) > 180) ctx.moveTo(x, y); else if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        });
      }
      ctx.stroke();
    }
  }

  enter(stage) {
    const layers = ['crust', 'mantle', 'outer', 'inner'];
    for (const id of ['india', 'rise', 'sink', 'plate', ...layers]) this.labelOn(id, false);
    this.tweenTo('flow', 0, 0);   // the circulation replays from the start on every visit
    this.hud('bl', null);
    this.hud('br', null);
    if (stage === 0) {
      this.shot('earth');
      this.tweenTo('open', 0, 0.6);
      this.tweenTo('plates', 0, 0.4);
      this.tweenTo('arrow', 0, 0.4);
      this.labelOn('india');
      this.hud('br', 'Boundary of India: Survey of India');
    } else if (stage === 1) {
      this.shot('cut');
      this.tweenTo('open', 1, 1.6);
      this.tweenTo('plates', 0, 0.4);
      this.tweenTo('arrow', 0, 0.4);
      this.hud('bl', 'Crust drawn 6x thicker than real');
      layers.forEach((id, i) => this.after(1.3 + i * 0.25, () => this.labelOn(id)));
    } else if (stage === 2) {
      this.shot('mantle');
      this.tweenTo('open', 1, 0.8);
      this.tweenTo('plates', 0, 0.4);
      this.tweenTo('arrow', 0, 0.4);
      this.v.flow = 0;
      this.tweenTo('flow', 1, 6);
      this.labelOn('mantle');
      this.after(1.2, () => { this.labelOn('rise'); this.labelOn('sink'); });
    } else {
      this.shot('plates');
      this.tweenTo('open', 0, 1.2);
      this.tweenTo('plates', 1, 1.2);
      this.tweenTo('arrow', 1, 1.4);
      this.labelOn('india');
      this.hud('br', 'Borders: Survey of India. Plates: Bird (2003)');
      this.after(1.5, () => { this.labelOn('plate'); this.celebrate(this.arrowTip); });
    }
  }

  update() {
    const m = this.m;
    if (!m) return;
    const T = this.THREE;
    const { open, flow, plates, arrow: grow } = this.v;
    m.whole.visible = open <= 0.001;
    m.cut.visible = m.faces.visible = !m.whole.visible;
    m.wedge.visible = open > 0.001 && open < 0.999;
    const gapDir = new T.Vector3(...dir((GAP0 + GAP / 2) * 180 / Math.PI, 0, 1));
    m.wedge.position.copy(gapDir.multiplyScalar(open * 2.6));
    m.wedge.material.opacity = 1 - open;
    m.plates.material.opacity = plates;
    m.plates.visible = plates > 0.01 && open < 0.01;
    m.arrow.visible = grow > 0.01;
    m.arrow.scale.setScalar(Math.max(0.001, grow));
    m.loops.visible = this.stage === 2 && open > 0.9;
    for (const b of this.blobs) b.s.position.copy(this.loopPoint(T, b.deg, (flow + b.k / 4) * Math.PI * 2));
  }

  onControlChange(id) {
    if (id === 'reset') this.resetView();
  }
}
