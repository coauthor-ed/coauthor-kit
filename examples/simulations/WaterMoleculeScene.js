import { WebGLSimulation } from 'simulations/base/WebGLSimulation.js';
import { readSimColors } from 'simulations/base/SimTheme.js';

const BOND_ANGLE = 104.5 * (Math.PI / 180);
const BOND_LENGTH = 1.15;
const O_NUCLEUS_R = 0.085;
const H_NUCLEUS_R = 0.05;

// Bonding-cloud density peak, as a fraction of the O->H span (<0.5 since
// oxygen is more electronegative - density skews toward it).
const BOND_POLARIZATION = 0.46;

const ORBIT_SPEED = 1.55;       // bonding figure-eight, rad/s along its own parameter
const LONE_ORBIT_SPEED = 1.05;  // lone pairs sweep slower - reads as "heavier", O-only business
const PRECESSION_SPEED = 0.33;  // tumble of the bonding orbit plane around the bond axis

const LONE_ORBIT_R = 0.47;      // lone-pair circle radius, centered ON the oxygen nucleus

const BOND_ORBIT_R = 0.25;        // wrap radius around each nucleus - EVERY electron
                                  // path now shares the lone pairs' standoff exactly
const BOND_PATH_PERIOD = 5.5;     // seconds per full figure-eight (arc-length constant speed)
const BRIDGE_ATTACH_DEG = 55;     // where the wrap arcs hand off to the crossing bridges

const TRAIL = {
  bond: { count: 26, spacing: 0.042 },
  lone: { count: 16, spacing: 0.055 },
};
const CLOUD_PULSE_SPEED = 0.5;
const INTRO_DURATION = 0.7;
const TAU = Math.PI * 2;

// Scratch vectors - _electronPositionAt runs ~200×/frame (electrons + trail
// samples + guide-path samples); allocating Vector3s there would churn GC.
let _scratchA, _scratchB, _scratchC;

/**
 * WaterMoleculeScene - reference implementation for WebGLSimulation.
 *
 * Visual technique stack (all THREE primitives, no model files, no
 * postprocessing vendor):
 *  - Electron cloud = particle nebula: 200-400 GPU point-sprites per
 *    orbital via a custom ShaderMaterial (per-particle size/distance
 *    attenuation/twinkle) sampling a density function, plus two additive
 *    haze billboards for volume. No transparent ellipsoid meshes - those
 *    always render as hard glassy bubbles.
 *  - Bonding electrons ride a figure-eight (Gerono lemniscate) wrapping
 *    both nuclei at a fixed clearance (BOND_ORBIT_R), partners half a cycle
 *    apart, on a faint guide-path so the orbit reads even in a still frame;
 *    trails are additive polylines with vertex-color fades.
 *  - Lone pairs circle the OXYGEN NUCLEUS ITSELF, plane ⊥ the lone-pair
 *    direction (109.5° off each O-H bond, VSEPR tetrahedral geometry), with
 *    static torus guide rings - visually separate from the shared pair.
 *  - Glow without bloom: opaque bead core + additive radial-gradient
 *    billboard sprites (canvas-generated texture) behind nuclei/electrons.
 *  - Labels: DOM overlays anchored in pixel space (fixed pixel offset from
 *    each atom's projected position, so proximity survives zoom/rotation),
 *    depth-scaled and depth-sorted. Atom labels are glossy "mini-orb"
 *    badges with atomic-number tags; concept labels are frosted-glass
 *    callout chips. Colors derive from sim theme tokens via CSS vars.
 */
export class WaterMoleculeScene extends WebGLSimulation {
  static WIDTH = 720;
  static HEIGHT = 512;
  static FOV = 38;
  static TRANSPARENT = true; // container CSS vignette shows through
  // Electrons orbit and the molecule auto-turns forever - no settled end
  // state, so this stays exempt from the come-to-rest budget.
  static CONTINUOUS = true;
  static ARIA_LABEL = 'A water molecule (H2O): small oxygen and hydrogen nuclei, shared bonding electrons orbiting both nuclei of each O-H bond, and two lone electron pairs circling the oxygen alone.';
  static CONTROLS = [
    { type: 'button', id: 'reset', label: 'Reset View' },
  ];

  async setup() {
    await super.setup();
    if (this.unsupported) return;

    const T = this.THREE;
    _scratchA = new T.Vector3();
    _scratchB = new T.Vector3();
    _scratchC = new T.Vector3();
    this._reloadColors();
    this._beatIndex = 0;
    this._elapsed = 0;
    this._loneFade = 0;
    this._disposables = [];
    this._pulseSeed = 0;

    this.camera.position.set(2.15, 1.45, 2.65);

    this.container.style.position = 'relative';
    this.container.style.background =
      `radial-gradient(circle at 50% 42%, var(--sim-bg-surface, #111827) 0%, var(--sim-bg-deep, #0a0f1e) 72%)`;

    // Three-point lighting, warmed key / cooled rim so silhouettes separate
    // from the vignette instead of melting into it.
    this.scene.add(new T.HemisphereLight(0xffffff, 0x23283e, 0.9));
    const key = new T.DirectionalLight(0xfff1de, 2.2);
    key.position.set(3, 4, 2.5);
    this.scene.add(key);
    const rim = new T.DirectionalLight(0xbcd0ff, 1.25);
    rim.position.set(-2.6, -1.2, -3);
    this.scene.add(rim);

    // One soft radial-disc texture shared by EVERY glow surface (point
    // sprites, haze billboards, nucleus halos) - generated once on a canvas.
    this._discTex = this._makeDiscTexture();

    // Label stylesheet - injected once so pseudo-elements (::before pulse
    // ring, ::after leader tails / pointer notches) and keyframes are
    // available; removed again in destroy().
    this._injectLabelStyles();

    this.molecule = new T.Group();
    this.scene.add(this.molecule);

    // ── Geometry of the molecule ─────────────────────────────────────────
    const halfAngle = BOND_ANGLE / 2;
    const oPos = new T.Vector3(0, 0, 0);
    const hPos = [
      new T.Vector3(Math.sin(halfAngle), 0, Math.cos(halfAngle)).multiplyScalar(BOND_LENGTH),
      new T.Vector3(-Math.sin(halfAngle), 0, Math.cos(halfAngle)).multiplyScalar(BOND_LENGTH),
    ];
    // Lone-pair directions: 109.5° off each O-H bond (sp3/VSEPR), pointing
    // away from the H-H side. dot(Hdir, loneDir) = cos(109.5°) = -1/3.
    const loneDirs = [
      new T.Vector3(0, 0.8387, -0.5446),
      new T.Vector3(0, -0.8387, -0.5446),
    ];

    // Shared-bond orbit table - built ONCE; guides and riders both read it.
    this._bondPath = this._buildBondPath();

    // ── Nuclei - tiny bright beads + billboard halo ("bloom" without bloom)
    const nucleusMat = (color) => {
      const m = new T.MeshPhysicalMaterial({ color, emissive: color, emissiveIntensity: 0.55, roughness: 0.28, metalness: 0.1, clearcoat: 0.7, clearcoatRoughness: 0.25 });
      this._track(m);
      return m;
    };
    this.oxygen = new T.Mesh(this._trackedGeo(new T.SphereGeometry(O_NUCLEUS_R, 24, 18)), nucleusMat(this.colors.oxygen));
    this.molecule.add(this.oxygen);
    this.hydrogens = hPos.map((pos) => {
      const h = new T.Mesh(this._trackedGeo(new T.SphereGeometry(H_NUCLEUS_R, 18, 14)), nucleusMat(this.colors.hydrogen));
      h.position.copy(pos);
      this.molecule.add(h);
      return h;
    });
    this.nucleusGlows = [
      { parent: this.oxygen, token: 'oxygen', scale: 0.42, opacity: 0.5 },
      ...this.hydrogens.map((h) => ({ parent: h, token: 'hydrogen', scale: 0.26, opacity: 0.45 })),
    ].map(({ parent, token, scale, opacity }) => {
      const s = this._makeGlowSprite(token, scale, opacity);
      s.userData.token = token; // refreshTheme() recolors via this
      parent.add(s);
      return s;
    });

    // ── Orbital clouds - particle nebulas, see _makeCloud() ──────────────
    this.bondClouds = hPos.map((pos) => {
      const dir = pos.clone().normalize();
      const center = oPos.clone().lerp(pos, BOND_POLARIZATION);
      return this._makeCloud(center, dir, BOND_LENGTH * 1.12, 0.26, 'bondingElectron', { kind: 'bond' });
    });
    this.loneClouds = loneDirs.map((dir) => {
      const center = dir.clone().multiplyScalar(0.36);
      return this._makeCloud(center, dir, 0.42, 0.24, 'loneElectron', { kind: 'lone', stretch: 1.25 });
    });

    // ── Guide paths - the orbit scaffolds that make motion legible ───────
    // Bonding: lemniscate line, rebuilt every frame with the SAME analytic
    // function the electrons use, so guide and riders can never drift apart.
    this.bondGuides = hPos.map((pos, i) => {
      const segs = 44;
      const geo = this._trackedGeo(new T.BufferGeometry());
      geo.setAttribute('position', new T.BufferAttribute(new Float32Array((segs + 1) * 3), 3));
      const mat = this._lineMat('bondingElectron', 0.14);
      const line = new T.Line(geo, mat);
      line.frustumCulled = false;
      line.renderOrder = 2;
      this.molecule.add(line);
      return { line, segs, ...this._bondFrame(oPos, pos, i) };
    });
    // Lone pairs: static torus rings centered ON the oxygen nucleus - the
    // whole ring visibly belongs to O and only O.
    this.loneGuides = loneDirs.map((dir) => {
      const mesh = new T.Mesh(
        this._trackedGeo(new T.TorusGeometry(LONE_ORBIT_R, 0.006, 8, 96)),
        this._basicMat('loneElectron', { transparent: true, opacity: 0.16, depthWrite: false, blending: T.AdditiveBlending }),
      );
      mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), dir);
      mesh.renderOrder = 2;
      this.molecule.add(mesh);
      return mesh;
    });

    // ── Electrons - bead core + billboard glow + additive polyline trail ──
    this._electrons = [];
    const addElectron = (kind, phase, path) => {
      const token = kind === 'bond' ? 'bondingElectron' : 'loneElectron';
      const color = this.colors[token];
      const group = new T.Group();

      const coreMat = new T.MeshBasicMaterial({ color, transparent: kind === 'lone', opacity: kind === 'bond' ? 1 : 0 });
      this._track(coreMat);
      const core = new T.Mesh(this._trackedGeo(new T.SphereGeometry(kind === 'bond' ? 0.036 : 0.03, 12, 10)), coreMat);
      group.add(core);

      const glow = this._makeGlowSprite(token, kind === 'bond' ? 0.2 : 0.16, kind === 'bond' ? 0.85 : 0);
      group.add(glow);
      group.renderOrder = 5;
      this.molecule.add(group);

      // Trail: one additive polyline, head bright -> tail black (black adds
      // nothing under AdditiveBlending, so the fade is free - no per-vertex
      // alpha support needed). Positions rewritten every frame from the
      // same pure path function used for the head.
      const { count, spacing } = TRAIL[kind];
      const geo = this._trackedGeo(new T.BufferGeometry());
      geo.setAttribute('position', new T.BufferAttribute(new Float32Array(count * 3), 3));
      geo.setAttribute('color', new T.BufferAttribute(new Float32Array(count * 3), 3));
      const trailMat = new T.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: kind === 'bond' ? 1 : 0, depthWrite: false, blending: T.AdditiveBlending });
      this._track(trailMat);
      const trailLine = new T.Line(geo, trailMat);
      trailLine.frustumCulled = false;
      trailLine.renderOrder = 4;
      this.molecule.add(trailLine);

      const entry = { kind, token, phase, group, core, glow, trailLine, count, spacing, ...path };
      this._electrons.push(entry);
      this._fillTrailColors(entry);
      return entry;
    };

    // Bonding pairs - figure-eight through O and H; each pair's two riders
    // sit half a lap apart, and bond 2's pair is shifted a further quarter
    // lap so the two bonds don't move in lockstep. orbitIndex also offsets
    // the orbit plane's precession.
    hPos.forEach((H, orbitIndex) => {
      const frame = this._bondFrame(oPos, H, orbitIndex);
      const phases = orbitIndex === 0 ? [0, 0.5] : [0.25, 0.75];
      for (const phase of phases) addElectron('bond', phase, frame);
    });

    // Lone pairs - plain circles CENTERED ON the oxygen nucleus, plane ⊥
    // the lone-pair direction. Nothing here ever approaches a hydrogen.
    loneDirs.forEach((dir, pairIndex) => {
      const u = this._perp(dir);
      const v = dir.clone().cross(u).normalize();
      const phase0 = pairIndex * (Math.PI / 2); // de-sync the two rings' crossings
      for (const phase of [phase0, phase0 + Math.PI]) {
        addElectron('lone', phase, { center: oPos.clone(), u, v, r: LONE_ORBIT_R });
      }
    });

    // ── Bond-angle arc - tube, not Line: linewidth is ignored on most
    // platforms, a TubeGeometry keeps a consistent stroke everywhere ──────
    const arcPts = [];
    const arcR = 0.85;
    for (let i = 0; i <= 24; i++) {
      const a = -halfAngle + 2 * halfAngle * (i / 24);
      arcPts.push(new T.Vector3(Math.sin(a) * arcR, 0, Math.cos(a) * arcR));
    }
    const arcCurve = new T.CatmullRomCurve3(arcPts);
    this.angleArc = new T.Mesh(
      this._trackedGeo(new T.TubeGeometry(arcCurve, 32, 0.0095, 8)),
      this._basicMat('bond', { transparent: true, opacity: 0, depthWrite: false }),
    );
    this.molecule.add(this.angleArc);
    this._arcTargetOpacity = 0;

    // ── Camera controls - locked while beats explain, free at the end ────
    const OrbitControls = await this.loadOrbitControls();
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0.05, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 6;
    this.controls.enabled = false;
    this.camera.lookAt(0, 0.05, 0);
    this.controls.update();

    // Point-sprite perspective-scale factor: world-size -> device pixels.
    const canvasH = this.renderer.domElement.height || 512;
    this._pointScale = canvasH / 2 / Math.tan(((this.constructor.FOV || 40) * Math.PI / 180) / 2);
    for (const cloud of [...this.bondClouds, ...this.loneClouds]) cloud.mat.uniforms.uScale.value = this._pointScale;

    // ── HTML overlay labels ───────────────────────────────────────────────
    // Atom badges FOLLOW their nucleus mesh at a fixed pixel offset (see
    // _updateLabelPositions), so they stay close at any zoom. Concept chips
    // anchor to a molecule-local point instead. `dy` is tuned so each
    // badge's leader tail / chip's notch lands ON the anchor.
    this._labels = {
      o: { el: this._makeAtomBadge('O', '8', 'oxygen', 34), revealed: true, follow: this.oxygen, dx: 0, dy: -27 },
      h1: { el: this._makeAtomBadge('H', '1', 'hydrogen', 27), revealed: true, follow: this.hydrogens[0], dx: 0, dy: -23 },
      h2: { el: this._makeAtomBadge('H', '1', 'hydrogen', 27), revealed: true, follow: this.hydrogens[1], dx: 0, dy: -23 },
      bond: { el: this._makeCallout('Shared pair', 'orbits both nuclei', 'bondingElectron'), revealed: true, anchor: oPos.clone().lerp(hPos[0], 0.55), dx: 0, dy: -34 },
      lone: { el: this._makeCallout('Lone pair', 'orbits oxygen only', 'loneElectron'), revealed: false, anchor: loneDirs[0].clone().multiplyScalar(0.6), dx: -56, dy: -40 },
      angle: { el: this._makeCallout('104.5°', null, 'bond', { stat: true }), revealed: false, anchor: new T.Vector3(0, 0, arcR + 0.04), dx: 0, dy: -26 },
    };
    for (const label of Object.values(this._labels)) this._applyLabelTheme(label);

    this.renderFrame();
    this.molecule.updateMatrixWorld();
    this._updateLabelPositions();
  }

  // ── Construction helpers ───────────────────────────────────────────────

  /** Track GPU resources for disposal in destroy(). */
  _track(res) { this._disposables.push(res); return res; }
  _trackedGeo(geo) { return this._track(geo); }

  /** Soft radial-gradient disc on a canvas - the universal glow sprite. */
  _makeDiscTexture(size = 128) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.3, 'rgba(255,255,255,0.5)');
    g.addColorStop(0.65, 'rgba(255,255,255,0.12)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new this.THREE.CanvasTexture(c);
    if ('SRGBColorSpace' in this.THREE) tex.colorSpace = this.THREE.SRGBColorSpace;
    return this._track(tex);
  }

  /** Additive billboard halo sharing the shared disc texture. */
  _makeGlowSprite(token, scale, opacity) {
    const T = this.THREE;
    const mat = new T.SpriteMaterial({ map: this._discTex, color: this.colors[token], transparent: true, opacity, depthWrite: false, blending: T.AdditiveBlending, rotation: (Math.random() - 0.5) * 0.8 });
    this._track(mat);
    const s = new T.Sprite(mat);
    s.scale.set(scale, scale, 1);
    s.renderOrder = 1;
    return s;
  }

  _lineMat(token, opacity) {
    const m = new this.THREE.LineBasicMaterial({ color: this.colors[token], transparent: true, opacity, depthWrite: false, blending: this.THREE.AdditiveBlending });
    return this._track(m);
  }

  _basicMat(token, params) {
    const m = new this.THREE.MeshBasicMaterial({ color: this.colors[token], ...params });
    return this._track(m);
  }

  /** Build the shared-bond orbit as an arc-length-uniform table, LOCAL to the
   *  bond frame (origin = bond midpoint, x = along the O->H axis, y ⊥ it):
   *  a 2π−2γ CCW arc around O, a Hermite bridge crossing the waist upward,
   *  a 2π−2γ CW arc around H, a Hermite bridge crossing back - a true
   *  figure-eight whose lobes stay exactly BOND_ORBIT_R from their nucleus
   *  and whose bridges leave/arrive TANGENT to those arcs, so there is no
   *  joint anywhere the eye can catch. Static in the local frame -> built
   *  once, at setup; precession merely rotates the frame at runtime. */
  _buildBondPath(count = 256) {
    const R = BOND_ORBIT_R;
    const h = BOND_LENGTH / 2;               // O at (−h, 0), H at (+h, 0)
    const g = BRIDGE_ATTACH_DEG * (Math.PI / 180);
    const cg = Math.cos(g), sg = Math.sin(g);

    // Dense polyline of the four segments, then arc-length resample.
    const pts = [];
    const wrapSteps = 160, bridgeSteps = 70;

    // O-wrap: CCW the long way round (through the far side, angle π).
    for (let k = 0; k <= wrapSteps; k++) {
      const th = g + (TAU - 2 * g) * (k / wrapSteps);
      pts.push([-h + R * Math.cos(th), R * Math.sin(th)]);
    }
    // Bridge 1: O lower attach -> H upper attach, crossing the waist. End
    // tangents are the wrap arcs' own tangents -> G¹ continuity for free.
    const P0 = [-h + R * cg, -R * sg], P1 = [h - R * cg, R * sg];
    const T0 = [sg, cg], T1 = [sg, cg];       // both equal the circle tangents here
    this._pushHermite(pts, P0, T0, P1, T1, bridgeSteps);
    // H-wrap: CW the long way round (through the far side, angle 0).
    for (let k = 0; k <= wrapSteps; k++) {
      const th = (Math.PI - g) - (TAU - 2 * g) * (k / wrapSteps);
      pts.push([h + R * Math.cos(th), R * Math.sin(th)]);
    }
    // Bridge 2: H lower attach -> O upper attach (mirror of bridge 1).
    const Q0 = [h - R * cg, -R * sg], Q1 = [-h + R * cg, R * sg];
    const S0 = [-sg, cg], S1 = [-sg, cg];
    this._pushHermite(pts, Q0, S0, Q1, S1, bridgeSteps);

    // Cumulative length -> resample to `count` points UNIFORM in arc length,
    // so constant parameter rate = constant visual speed everywhere (the
    // thing the warp destroyed).
    const cum = new Float64Array(pts.length);
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1];
      cum[i] = cum[i - 1] + Math.hypot(dx, dy);
    }
    const total = cum[cum.length - 1];
    const samples = new Float32Array(count * 2);
    let seg = 0;
    for (let i = 0; i < count; i++) {
      const target = (i / count) * total;
      while (seg < cum.length - 2 && cum[seg + 1] < target) seg++;
      const f = (target - cum[seg]) / Math.max(1e-9, cum[seg + 1] - cum[seg]);
      samples[i * 2] = pts[seg][0] + (pts[seg + 1][0] - pts[seg][0]) * f;
      samples[i * 2 + 1] = pts[seg][1] + (pts[seg + 1][1] - pts[seg][1]) * f;
    }
    return { samples, count };
  }

  /** Append a cubic Hermite segment (P0,T0)->(P1,T1) as `steps` points.
   *  Tangent magnitudes keyed to chord length - the tangents here are
   *  chord-aligned by symmetry, so this yields a gentle, kink-free S. */
  _pushHermite(pts, P0, T0, P1, T1, steps) {
    const chord = Math.hypot(P1[0] - P0[0], P1[1] - P0[1]);
    const m0x = T0[0] * chord, m0y = T0[1] * chord;
    const m1x = T1[0] * chord, m1y = T1[1] * chord;
    for (let k = 1; k <= steps; k++) {
      const s = k / steps, s2 = s * s, s3 = s2 * s;
      const h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s;
      const h01 = -2 * s3 + 3 * s2, h11 = s3 - s2;
      pts.push([
        h00 * P0[0] + h10 * m0x + h01 * P1[0] + h11 * m1x,
        h00 * P0[1] + h10 * m0y + h01 * P1[1] + h11 * m1y,
      ]);
    }
  }

  /** Orbit frame for one O-H bond: midpoint, bond axis d, rest-plane
   *  perpendicular u, and the shared arc-length path table. */
  _bondFrame(oPos, H, orbitIndex) {
    return {
      mid: oPos.clone().lerp(H, 0.5),
      d: H.clone().normalize(),
      u: this._perp(H.clone().normalize()),
      orbitIndex,
      path: this._bondPath,
    };
  }


  /**
   * One orbital's particle nebula: a THREE.Points cloud (custom shader -
   * per-particle size/twinkle, disc texture) sampled from a density
   * function (bond: polarized "sausage" spanning both nuclei; lone:
   * gaussian blob along the lone-pair direction), plus two additive haze
   * billboards for volume (no hard ellipsoid silhouette). Particles hold
   * STATIC local coords + a spin rate; each frame just spins (y,z) around
   * the orbital axis and breathes the radius - no allocation, no history.
   */
  _makeCloud(position, direction, along, cross, token, { kind, stretch = 1 }) {
    const T = this.THREE;
    const count = kind === 'bond' ? 330 : 230;
    const pivot = new T.Object3D();
    pivot.position.copy(position);
    pivot.quaternion.setFromUnitVectors(new T.Vector3(1, 0, 0), direction); // local +X = orbital axis
    pivot.userData.pulsePhase = Math.random() * TAU;
    this.molecule.add(pivot);

    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const seeds = new Float32Array(count);
    const spin = new Float32Array(count);   // azimuthal swirl rate, rad/s
    const baseY = new Float32Array(count);
    const baseZ = new Float32Array(count);
    const baseX = new Float32Array(count);
    const gauss = () => {
      // Box-Muller
      const th = Math.random() * TAU;
      const r = Math.sqrt(-2 * Math.log(Math.random() + 1e-9));
      return r * Math.cos(th);
    };

    for (let i = 0; i < count; i++) {
      let x, r;
      if (kind === 'bond') {
        // Rejection-sample the axis position: density = flat floor + gaussian
        // peaking at BOND_POLARIZATION - densest near O, present at H too
        // (it IS a shared bond), tapering past the nuclei.
        let t = 0;
        for (let tries = 0; tries < 24; tries++) {
          t = Math.random();
          const w = 0.22 + Math.exp(-Math.pow((t - BOND_POLARIZATION) / 0.28, 2));
          if (Math.random() < w) break;
        }
        // Fatter waist, slim tips - the envelope of a σ-bond density.
        const env = 0.35 + 0.65 * Math.pow(Math.sin(Math.PI * Math.min(0.96, Math.max(0.04, t))), 0.6);
        x = (t - 0.5) * along;
        r = cross * env * Math.sqrt(Math.random());
      } else {
        x = gauss() * along * 0.45 * stretch;
        r = Math.abs(gauss()) * cross * 0.62;
        if (r > cross * 1.1) r = cross * (0.6 + Math.random() * 0.5);
      }
      const ang = Math.random() * TAU;
      baseX[i] = x;
      baseY[i] = Math.cos(ang) * r;
      baseZ[i] = Math.sin(ang) * r;
      spin[i] = (Math.random() * 0.9 + 0.25) * (Math.random() < 0.5 ? -1 : 1);
      sizes[i] = (kind === 'bond' ? 0.05 : 0.045) + Math.random() * 0.06;
      seeds[i] = Math.random() * 100;
    }

    const geo = this._trackedGeo(new T.BufferGeometry());
    geo.setAttribute('position', new T.BufferAttribute(positions, 3));
    geo.setAttribute('aSize', new T.BufferAttribute(sizes, 1));
    geo.setAttribute('aSeed', new T.BufferAttribute(seeds, 1));

    const mat = new T.ShaderMaterial({
      uniforms: {
        uMap: { value: this._discTex },
        uColor: { value: new T.Color(this.colors[token]) },
        uTime: { value: 0 },
        uOpacity: { value: kind === 'bond' ? 1 : 0 },
        uScale: { value: 300 }, // real value set once the renderer reports its size
      },
      vertexShader: /* glsl */`
        attribute float aSize;
        attribute float aSeed;
        varying float vTwinkle;
        uniform float uTime;
        uniform float uScale;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vTwinkle = 0.7 + 0.3 * sin(uTime * (0.5 + fract(aSeed) * 1.3) + aSeed * 13.0);
          gl_PointSize = aSize * uScale / -mv.z; // world-size -> screen-size
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */`
        uniform sampler2D uMap;
        uniform vec3 uColor;
        uniform float uOpacity;
        varying float vTwinkle;
        void main() {
          float a = texture2D(uMap, gl_PointCoord).a * uOpacity * vTwinkle;
          gl_FragColor = vec4(uColor, a);
        }`,
      transparent: true,
      depthWrite: false,
      blending: T.AdditiveBlending,
    });
    this._track(mat);

    const points = new T.Points(geo, mat);
    points.frustumCulled = false; // positions mutate every frame
    points.renderOrder = 3;
    pivot.add(points);

    // Volumetric body: two soft billboard hazes (billboards can't show a
    // hard rim - the failure mode of mesh ellipsoids).
    const hazes = [
      { sx: along * 0.62, sy: cross * 2.3, op: 0.15 },
      { sx: along * 0.4, sy: cross * 1.55, op: 0.1 },
    ].map(({ sx, sy, op }) => {
      const sprite = this._makeGlowSprite(token, 1, kind === 'bond' ? op : 0);
      sprite.scale.set(sx, sy, 1);
      sprite.userData.base = op;
      pivot.add(sprite);
      return sprite;
    });

    return { pivot, points, mat, hazes, token, kind, count, baseX, baseY, baseZ, spin, seeds, geo };
  }

  // ── Label construction ─────────────────────────────────────────────────
  // Every label is a WRAPPER div (positioned in pixels each frame by
  // _updateLabelPositions; carries the 'on' visibility class) containing an
  // INNER visual element (.wms-badge / .wms-chip) whose reveal animation
  // lives purely in CSS - keeps per-frame transform writes from fighting
  // the CSS transitions.

  /** One-time <style> injection: pseudo-elements and keyframes can't be
   *  expressed as inline cssText, and this file gets copied as a pattern -
   *  a scoped, prefixed block beats a dozen inline hacks. */
  _injectLabelStyles() {
    if (document.getElementById('wms-label-styles')) return;
    const style = document.createElement('style');
    style.id = 'wms-label-styles';
    style.textContent = `
      .wms-lbl {
        position: absolute; left: 0; top: 0; pointer-events: none;
        will-change: transform; z-index: 10;
      }
      .wms-lbl > .wms-inner {
        transition: opacity 0.4s cubic-bezier(0.22, 1, 0.36, 1),
                    transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      .wms-lbl:not(.on) > .wms-inner { opacity: 0; transform: translateY(7px) scale(0.85); }

      /* ── Element badge: glossy mini-orb echoing the 3D nucleus material ── */
      .wms-badge {
        --c: #fff; --c-glow: rgba(255,255,255,0.5); --c-deep: #555; --sz: 32px;
        position: relative;
        display: flex; align-items: center; justify-content: center;
        width: var(--sz); height: var(--sz); border-radius: 50%;
        font-family: var(--font-family, system-ui, sans-serif);
        font-size: calc(var(--sz) * 0.44); font-weight: 800; letter-spacing: 0.5px;
        color: #fff; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.55);
        background:
          radial-gradient(circle at 32% 26%, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0) 40%),
          radial-gradient(circle at 50% 118%, var(--c-deep) 0%, var(--c) 58%);
        border: 1px solid rgba(255, 255, 255, 0.35);
        box-shadow:
          0 0 14px var(--c-glow),
          0 3px 10px rgba(0, 0, 0, 0.45),
          inset 0 -3px 6px rgba(0, 0, 0, 0.28),
          inset 0 2px 3px rgba(255, 255, 255, 0.25);
      }
      /* pulsing halo ring - staggered per badge via --pd */
      .wms-badge::before {
        content: ''; position: absolute; inset: -4px; border-radius: 50%;
        border: 1px solid var(--c-glow); opacity: 0;
        animation: wms-pulse 2.8s ease-out infinite;
        animation-delay: var(--pd, 0s);
      }
      @keyframes wms-pulse {
        0% { transform: scale(0.8); opacity: 0.55; }
        65% { opacity: 0; }
        100% { transform: scale(1.3); opacity: 0; }
      }
      /* leader tail - bridges the badge to the projected nucleus point */
      .wms-badge::after {
        content: ''; position: absolute; top: 100%; left: 50%;
        width: 1.5px; height: 11px; transform: translateX(-50%);
        background: linear-gradient(to bottom, var(--c-glow), transparent);
      }
      .wms-badge .wms-num {
        position: absolute; top: -5px; right: -7px;
        min-width: 13px; height: 13px; padding: 0 2px; border-radius: 7px;
        display: flex; align-items: center; justify-content: center;
        font-size: 8px; font-weight: 700; letter-spacing: 0;
        color: #e2e8f0; background: rgba(10, 15, 28, 0.92);
        border: 1px solid var(--c-glow);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
      }

      /* ── Callout chip: frosted glass + gradient border + pointer notch ── */
      .wms-chip {
        --c: #fff; --c-glow: rgba(255,255,255,0.5); --c-halo: rgba(255,255,255,0.18);
        --chip-bg: rgba(10, 15, 30, 0.62);
        position: relative;
        display: flex; flex-direction: column; align-items: center; gap: 8px;
        padding: 7px 13px 8px; border-radius: 10px;
        text-align: center; white-space: nowrap;
        font-family: var(--font-family, system-ui, sans-serif);
        background:
          linear-gradient(var(--chip-bg), var(--chip-bg)) padding-box,
          linear-gradient(135deg, var(--c-glow), rgba(255,255,255,0.07) 45%, var(--c-glow)) border-box;
        border: 1px solid transparent;
        backdrop-filter: blur(10px) saturate(150%);
        -webkit-backdrop-filter: blur(10px) saturate(150%);
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.45), 0 0 18px var(--c-halo);
      }
      /* notch pointing back at the anchor point below the chip */
      .wms-chip::after {
        content: ''; position: absolute; top: 100%; left: 50%;
        width: 8px; height: 8px; margin-top: -4.5px;
        transform: translateX(-50%) rotate(45deg);
        background: rgba(10, 15, 30, 0.85);
        border-right: 1px solid var(--c-glow);
        border-bottom: 1px solid var(--c-glow);
      }
      .wms-chip .t {
        display: flex; align-items: center; gap: 6px;
        font-size: 0.72rem; font-weight: 800; letter-spacing: 1.4px;
        text-transform: uppercase; color: #f1f5f9;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
      }
      .wms-chip .t .dot {
        width: 7px; height: 7px; border-radius: 50%; flex: none;
        background: var(--c); box-shadow: 0 0 8px var(--c-glow);
      }
      .wms-chip .s {
        font-size: 0.6rem; font-weight: 600; letter-spacing: 0.7px;
        text-transform: uppercase; color: rgba(226, 232, 240, 0.72);
      }
      /* stat variant (the bond-angle figure): one big accent-colored value */
      .wms-chip.stat { padding: 5px 14px 6px; }
      .wms-chip.stat .t {
        font-size: 0.95rem; letter-spacing: 1px;
        color: var(--c); text-shadow: 0 0 12px var(--c-glow);
        font-variant-numeric: tabular-nums;
      }

      @media (prefers-reduced-motion: reduce) {
        .wms-badge::before { animation: none; }
        .wms-lbl > .wms-inner { transition: none; }
      }
    `;
    document.head.appendChild(style);
    this._ownsLabelStyles = false; // shared by id - never removed per-instance
  }

  _makeLabelWrapper() {
    const wrap = document.createElement('div');
    wrap.className = 'wms-lbl';
    const inner = document.createElement('div');
    inner.className = 'wms-inner';
    wrap.appendChild(inner);
    this.container.appendChild(wrap);
    return { wrap, inner };
  }

  /** Glossy element orb: symbol + atomic-number tag + pulse ring + leader
   *  tail. All colors arrive later via _applyLabelTheme (theme-safe). */
  _makeAtomBadge(symbol, atomicNumber, token, sizePx) {
    const { wrap, inner } = this._makeLabelWrapper();
    inner.classList.add('wms-badge');
    inner.style.setProperty('--sz', `${sizePx}px`);
    // de-stagger the halo pulses so the three badges don't blink in unison
    inner.style.setProperty('--pd', `${(this._pulseSeed++ * 0.9).toFixed(2)}s`);

    const sym = document.createElement('span');
    sym.textContent = symbol;
    const num = document.createElement('span');
    num.className = 'wms-num';
    num.textContent = atomicNumber;
    inner.append(sym, num);

    wrap.userData = { kind: 'badge', token };
    return wrap;
  }

  /** Frosted-glass callout chip: legend dot + uppercase title (+ optional
   *  sub-caption), or the `stat` variant for a single big value. */
  _makeCallout(title, sub, token, { stat = false } = {}) {
    const { wrap, inner } = this._makeLabelWrapper();
    inner.classList.add('wms-chip');
    if (stat) inner.classList.add('stat');

    const t = document.createElement('div');
    t.className = 't';
    if (!stat) {
      const dot = document.createElement('span');
      dot.className = 'dot';
      t.appendChild(dot);
    }
    const tText = document.createElement('span');
    tText.textContent = title;
    t.appendChild(tText);
    inner.appendChild(t);

    if (sub) {
      const s = document.createElement('div');
      s.className = 's';
      s.textContent = sub;
      inner.appendChild(s);
    }

    wrap.userData = { kind: 'chip', token };
    return wrap;
  }

  /** Derive the full label palette from ONE theme token: base color, glow,
   *  halo and a darkened shade for the orb's lower gradient stop. Using a
   *  THREE.Color as the parser means any format readSimColors returns works. */
  _labelColorVars(token) {
    const c = new this.THREE.Color(this.colors[token]);
    const R = Math.round(c.r * 255), G = Math.round(c.g * 255), B = Math.round(c.b * 255);
    return {
      '--c': `rgb(${R},${G},${B})`,
      '--c-glow': `rgba(${R},${G},${B},0.55)`,
      '--c-halo': `rgba(${R},${G},${B},0.20)`,
      '--c-deep': `rgb(${Math.round(c.r * 130)},${Math.round(c.g * 130)},${Math.round(c.b * 130)})`,
    };
  }

  _applyLabelTheme(labelWrap) {
    const { token } = labelWrap.userData || {};
    if (!token || !this.colors?.[token]) return;
    const inner = labelWrap.firstChild;
    for (const [k, v] of Object.entries(this._labelColorVars(token))) inner.style.setProperty(k, v);
  }

  /** Any unit vector perpendicular to `dir`. */
  _perp(dir) {
    const T = this.THREE;
    const ref = Math.abs(dir.y) > 0.9 ? new T.Vector3(1, 0, 0) : new T.Vector3(0, 0, 1);
    return ref.clone().sub(dir.clone().multiplyScalar(dir.dot(ref))).normalize();
  }

  // ── Beats / controls contract (unchanged) ──────────────────────────────

  onBeatChange(beatIndex) {
    if (this.unsupported || !this._labels) return;
    this._beatIndex = Math.max(0, Math.min(beatIndex, 2));
    this._labels.lone.revealed = this._beatIndex >= 1;
    this._labels.angle.revealed = this._beatIndex >= 2;
    this._arcTargetOpacity = this._beatIndex >= 2 ? 0.85 : 0;
    if (this.controls) this.controls.enabled = this._beatIndex >= 2;
  }

  isControlHidden(id) {
    if (id === 'reset') return this._beatIndex < 2;
    return false;
  }

  onControlChange(id) {
    if (id === 'reset' && this.controls) {
      this.controls.reset();
      this.molecule.rotation.set(0, 0, 0);
    }
  }

  // ── Animation ──────────────────────────────────────────────────────────

  _tick(dt) {
    if (this.unsupported || !this.molecule) return;
    this._elapsed += dt;

    if (this._elapsed < INTRO_DURATION) {
      const p = Math.min(1, this._elapsed / INTRO_DURATION);
      this.molecule.scale.setScalar(1 - Math.pow(1 - p, 3)); // easeOutCubic
    } else if (this.molecule.scale.x !== 1) {
      this.molecule.scale.setScalar(1);
    }

    if (this._beatIndex < 2) {
      this.molecule.rotation.y += dt * 0.22; // gentle auto-turn while locked
    } else if (this.controls) {
      this.controls.update(); // required every frame with damping on
    }

    this.molecule.updateMatrixWorld(); // labels read matrixWorld/getWorldPosition below
    this._updateElectrons();
    this._updateClouds(dt);
    this._updateFades(dt);
    this._updateLabelPositions();
  }

  /** PURE function of (entry, time): bond riders do an arc-length-table
   *  lookup on the precomputed figure-eight (constant speed by
   *  construction), placed into the precessing bond frame. Lone riders are
   *  unchanged circles. Trail ghosts sample earlier times of this same
   *  function - hence the floor-mod, since ghost times go negative. */
  _electronPositionAt(e, time, out) {
    if (e.kind === 'bond') {
      const prec = time * PRECESSION_SPEED + e.orbitIndex * Math.PI;
      const u = time / BOND_PATH_PERIOD + e.phase;      // laps completed
      const f = (u - Math.floor(u)) * e.path.count;     // 0..count, wrap-safe
      const i = Math.floor(f) % e.path.count;
      const j = (i + 1) % e.path.count;
      const g = f - Math.floor(f);
      const x = e.path.samples[i * 2] + (e.path.samples[j * 2] - e.path.samples[i * 2]) * g;
      const y = e.path.samples[i * 2 + 1] + (e.path.samples[j * 2 + 1] - e.path.samples[i * 2 + 1]) * g;
      _scratchA.copy(e.d).multiplyScalar(x);
      _scratchB.copy(e.u).applyAxisAngle(e.d, prec).multiplyScalar(y);
      return out.copy(e.mid).add(_scratchA).add(_scratchB);
    }
    const t = time * LONE_ORBIT_SPEED + e.phase;
    return out.copy(e.center).addScaledVector(e.u, e.r * Math.cos(t)).addScaledVector(e.v, e.r * Math.sin(t));
  }

  _updateElectrons() {
    for (const e of this._electrons) {
      this._electronPositionAt(e, this._elapsed, _scratchC);
      e.group.position.copy(_scratchC);

      const attr = e.trailLine.geometry.getAttribute('position');
      for (let i = 0; i < e.count; i++) {
        this._electronPositionAt(e, this._elapsed - i * e.spacing, _scratchC);
        attr.setXYZ(i, _scratchC.x, _scratchC.y, _scratchC.z);
      }
      attr.needsUpdate = true;
    }

    // Guides: draw the SAME arc-length table the riders look up, rotated
    // into the current precession phase - identical by construction, no
    // per-frame curve math left to drift or kink.
    for (const g of this.bondGuides) {
      const attr = g.line.geometry.getAttribute('position');
      const prec = this._elapsed * PRECESSION_SPEED + g.orbitIndex * Math.PI;
      _scratchB.copy(g.u).applyAxisAngle(g.d, prec);
      for (let k = 0; k <= g.segs; k++) {
        const i = Math.min(g.path.count - 1, Math.round((k / g.segs) * (g.path.count - 1)));
        const x = g.path.samples[i * 2], y = g.path.samples[i * 2 + 1];
        attr.setXYZ(k,
          g.mid.x + g.d.x * x + _scratchB.x * y,
          g.mid.y + g.d.y * x + _scratchB.y * y,
          g.mid.z + g.d.z * x + _scratchB.z * y);
      }
      attr.needsUpdate = true;
    }

  }

  /** Per-frame cloud life: spin each particle azimuthally around its
   *  orbital axis (pure function of elapsed - no integrated state), breathe
   *  the radii, pulse the whole pivot, and advance the shader clock. */
  _updateClouds(dt) {
    for (const cloud of [...this.bondClouds, ...this.loneClouds]) {
      cloud.mat.uniforms.uTime.value = this._elapsed;
      const s = 1 + Math.sin(this._elapsed * CLOUD_PULSE_SPEED + cloud.pivot.userData.pulsePhase) * 0.03;
      cloud.pivot.scale.setScalar(s);

      const pos = cloud.geo.getAttribute('position');
      const { count, baseX, baseY, baseZ, spin, seeds } = cloud;
      for (let i = 0; i < count; i++) {
        const a = spin[i] * this._elapsed + seeds[i];
        const ca = Math.cos(a), sa = Math.sin(a);
        const breath = 1 + 0.15 * Math.sin(this._elapsed * 0.8 + seeds[i] * 7.0);
        pos.setXYZ(i, baseX[i], baseY[i] * ca * breath, baseZ[i] * sa * breath);
      }
      pos.needsUpdate = true;
    }
  }

  /** Frame-rate-independent exponential fade toward targets. Lone-pair
   *  elements (electrons, trails, rings, clouds) all hang off the one
   *  shared `_loneFade` scalar; bonding elements are visible from beat 0. */
  _updateFades(dt) {
    const k = Math.min(1, dt * 6);
    const loneTarget = this._labels?.lone.revealed ? 1 : 0;
    this._loneFade += (loneTarget - this._loneFade) * k;
    const f = this._loneFade;

    for (const e of this._electrons) {
      if (e.kind !== 'lone') continue;
      e.core.material.opacity = f * 0.95;
      e.glow.material.opacity = f * 0.85;
      e.trailLine.material.opacity = f;
    }
    for (const cloud of this.loneClouds) {
      cloud.mat.uniforms.uOpacity.value = f;
      for (const haze of cloud.hazes) haze.material.opacity = f * haze.userData.base;
    }
    for (const guide of this.loneGuides) guide.material.opacity = 0.16 * f;

    if (this.angleArc) {
      this.angleArc.material.opacity += (this._arcTargetOpacity - this.angleArc.material.opacity) * k;
    }
  }

  /** Refill a trail's vertex-color gradient after load or theme change:
   *  head at ~full color -> tail at black (invisible under additive). */
  _fillTrailColors(e) {
    const col = new this.THREE.Color(this.colors[e.token]);
    const attr = e.trailLine.geometry.getAttribute('color');
    for (let i = 0; i < e.count; i++) {
      const f = Math.pow(1 - i / (e.count - 1), 1.6) * 0.85;
      attr.setXYZ(i, col.r * f, col.g * f, col.b * f);
    }
    attr.needsUpdate = true;
  }

  // ── Label projection ───────────────────────────────────────────────────

  /** Projects each label's anchor to pixel space, then applies a FIXED
   *  pixel offset (dx/dy) - unlike anchoring at a world-space point, the
   *  badge stays the same few pixels from its nucleus at any zoom, and the
   *  leader tail/notch always lands on the anchor. Also applies depth-based
   *  scale and depth-sorted z-index. Visibility rides the 'on' class so CSS
   *  owns the inner element's reveal transition; the wrapper's transform
   *  stays JS-owned per frame. */
  _updateLabelPositions() {
    if (!this.renderer || !this._labels) return;
    const w = this.renderer.domElement.clientWidth || this.constructor.WIDTH;
    const h = this.renderer.domElement.clientHeight || this.constructor.HEIGHT;
    const cam = this.camera;
    const REF_DIST = 3.6; // ≈ initial camera distance - neutral scale point

    for (const label of Object.values(this._labels)) {
      const world = _scratchA;
      if (label.follow) {
        label.follow.getWorldPosition(world); // updates the parent chain itself
      } else {
        world.copy(label.anchor).applyMatrix4(this.molecule.matrixWorld);
      }
      const dist = Math.max(0.001, world.distanceTo(cam.position));
      world.project(cam);

      const visible = label.revealed && world.z <= 1;
      label.el.classList.toggle('on', visible);

      // Position even when hidden - a re-reveal starts from the right spot.
      const ds = Math.min(1.25, Math.max(0.72, REF_DIST / dist));
      const x = (world.x * 0.5 + 0.5) * w + label.dx * ds;
      const y = (-world.y * 0.5 + 0.5) * h + label.dy * ds;
      label.el.style.left = `${x}px`;
      label.el.style.top = `${y}px`;
      label.el.style.transform = `translate(-50%, -50%) scale(${ds.toFixed(3)})`;
      label.el.style.zIndex = String(Math.max(1, Math.round(500 - dist * 80)));
    }
  }

  // ── Theming ────────────────────────────────────────────────────────────

  _reloadColors() {
    this.colors = readSimColors(this.container, {
      oxygen: ['--sim-error', '#f87171'],
      hydrogen: ['--sim-ribosome', '#94a3b8'],
      bond: ['--sim-accent', '#818cf8'],
      bondingElectron: ['--sim-warning', '#fbbf24'],
      loneElectron: ['--sim-success', '#34d399'],
    });
  }

  refreshTheme() {
    if (!this.colors) return;
    if (this.oxygen) {
      this.oxygen.material.color.set(this.colors.oxygen);
      this.oxygen.material.emissive.set(this.colors.oxygen);
    }
    for (const hAtom of this.hydrogens || []) {
      hAtom.material.color.set(this.colors.hydrogen);
      hAtom.material.emissive.set(this.colors.hydrogen);
    }
    for (const glow of this.nucleusGlows || []) glow.material.color.set(this.colors[glow.userData.token]);

    for (const cloud of [...(this.bondClouds || []), ...(this.loneClouds || [])]) {
      cloud.mat.uniforms.uColor.value.set(this.colors[cloud.token]);
      for (const haze of cloud.hazes) haze.material.color.set(this.colors[cloud.token]);
    }
    for (const e of this._electrons || []) {
      const c = this.colors[e.token];
      e.core.material.color.set(c);
      e.glow.material.color.set(c);
      this._fillTrailColors(e);
    }
    for (const g of this.bondGuides || []) g.line.material.color.set(this.colors.bondingElectron);
    for (const ring of this.loneGuides || []) ring.material.color.set(this.colors.loneElectron);
    if (this.angleArc) this.angleArc.material.color.set(this.colors.bond);
    // Labels: recompute every CSS var (--c/--c-glow/--c-halo/--c-deep) from
    // the fresh tokens - badges AND chips repaint via the cascade.
    for (const label of Object.values(this._labels || {})) this._applyLabelTheme(label);
    super.refreshTheme();
  }

  destroy() {
    this.controls?.dispose();
    for (const { el } of Object.values(this._labels || {})) el.remove();
    // The <style> block is shared by id across instances - intentionally
    // NOT removed here (another mounted instance may be using it).
    for (const res of this._disposables || []) res.dispose?.();
    this._disposables = [];
    super.destroy();
  }
}
