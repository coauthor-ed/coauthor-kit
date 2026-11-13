/**
 * SvgRigShowcaseScene - reference for kit/SimRigSvg.js (two-bone IK, tapered limbs and mechanisms as SVG on
 * the SvgScene clock), the SVG twin of SimRigShowcaseScene, with the maths each rig hides:
 *   Beat 0: two sides fixed, one hinge: the arm is a triangle; the third side and the angle at the hinge
 *           follow the hand (ik2, liveLimb; the cosine rule)
 *   Beat 1: a lever balances when 3 x d = 6 x 2: the small weight slides out until the moments match
 *           (liveLever, beamPoint)
 *   Beat 2: a crank turns and the piston's height traces a wave on a SimChart frame (liveCrank, crankAngleAt,
 *           chartFrame + axesSvg)
 *   Beat 3: what the arm can reach: a ring between |a - b| and a + b; too far and it stretches out (ik2
 *           clamp); tap the elbow to flip it
 * Each beat plays a short scripted move, then parks. A tap during the move skips to its end; after that,
 * drag to drive the rig (the target is smoothed on the clock by trackPoint, SimRig's stepPoint spring).
 */
import { SvgScene, chip, liveChip, cardHtml, fill, shade, glossOf, tone } from 'simulations/base/kit/SimSvg.js';
import { keys, ease, reducedMotion } from 'simulations/base/kit/SimAnim.js';
import { ik2, liveLimb, liveLever, liveCrank, beamPoint, trackPoint, crankAngleAt, crankSlider } from 'simulations/base/kit/SimRigSvg.js';
import { chartFrame, axesSvg } from 'simulations/base/kit/SimChart.js';

const TAU = Math.PI * 2;
const MAP = [0, 1, 2, 3].map((i) => [{ idx: i, dwellMs: null }]);
const TITLES = ['Two sides and a hinge', 'Balance the lever', 'Round becomes a wave', 'What can it reach?'];
const HINTS = ['Drag the hand', 'Drag the small weight', 'Drag round the wheel', 'Drag the hand. Tap the elbow'];
const ENDS = [2.2, 3.4, 3.8, 3.2];
const A = 150, B = 120;           // bone lengths (design px at scale 1; 10 px = 1 unit)
const LOAD = 6, LOAD_AT = 2, EFF = 3, BAL = (LOAD * LOAD_AT) / EFF;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const f1 = (v) => v.toFixed(1);
const MUL = ' \u00d7 ';

export class SvgRigShowcaseScene extends SvgScene {
  static BEAT_STEP_MAP = MAP;
  static ARIA_LABEL = 'Four rigs and their maths: an arm as a triangle whose third side and hinge angle follow the hand; a lever that balances when 3 times the distance equals 6 times 2; a crank whose piston height traces a wave; and the ring of points a two-part arm can reach.';
  static CONTROLS = [{ type: 'button', id: 'replay', label: 'Replay' }];

  stageHeight(st) { return st.portrait ? 560 : 430; }

  enter() {
    this.goal = null;
    this.bend = 1;
    this.d = 1;
    this.cheered = false;
    this.play(ENDS[this.stepIndex]);
  }

  onControlChange(id) {
    if (id === 'replay') { this.clockReset(); this.enter(); }
    this.requestUiUpdate?.();
  }

  geo(st) {
    const P = st.portrait, W = st.W, H = st.H, s = P ? (this.stepIndex === 1 || this.stepIndex === 2 ? 0.72 : 0.8) : 1;
    const g = { P, W, H, s, floor: P ? 352 : H - 34 };
    g.card = P ? { x: 14, y: g.floor + 16, w: W - 28 } : { x: W - 200, y: 18, w: 184 };
    g.S = P ? { x: 78, y: 280 } : { x: 186, y: 306 };
    g.F = P ? { x: W / 2 + 18, y: 262 } : { x: 260, y: 300 };
    g.u = P ? 22 : 32;
    g.C = P ? { x: W / 2, y: 216 } : { x: 150, y: 318 };
    const rect = P ? { x: 8, y: 332, w: W - 16, h: H - 332 - 48 } : { x: 300, y: 70, w: W - 312, h: 300 };
    g.f = chartFrame({ rect, x: { min: 0, max: 360, ticks: [0, 90, 180, 270, 360], label: 'Crank angle (\u00b0)' }, y: { min: 0, max: 10, ticks: [0, 5, 10], label: 'Height (cm)' } });
    return g;
  }

  /** The scripted goal at clock t, or null once the script is over. */
  script(g, t) {
    const step = this.stepIndex, s = g.s;
    if (t >= ENDS[step] || reducedMotion()) return null;
    if (step === 0 || step === 3) {
      const fr = step === 0
        ? [[0.1, -0.25, 250], [1.1, -1.25, 150], [2.2, -0.7, 190]]
        : [[0.1, -0.7, 190], [1.2, -0.45, 230], [1.5, -0.45, 230], [2.6, -0.2, 330], [3.2, -0.2, 330]];
      const a = keys(t, fr.map((k) => [k[0], k[1]]), ease.smooth), d = keys(t, fr.map((k) => [k[0], k[2]]), ease.smooth);
      return { x: g.S.x + Math.cos(a) * d * s, y: g.S.y + Math.sin(a) * d * s };
    }
    if (step === 1) return { x: keys(t, [[0.3, 1], [1.0, 2], [1.7, 2], [2.4, 3], [2.7, 3], [3.4, BAL]], ease.smooth), y: 0 };
    return { x: crankAngleAt(t - 0.2, 1, 3.4, 0), y: 0 };
  }

  parked(g) {
    const step = this.stepIndex, s = g.s;
    if (step === 0) return { x: g.S.x + Math.cos(-0.7) * 190 * s, y: g.S.y + Math.sin(-0.7) * 190 * s };
    if (step === 3) return { x: g.S.x + Math.cos(-0.2) * 330 * s, y: g.S.y + Math.sin(-0.2) * 330 * s };
    if (step === 1) return { x: BAL, y: 0 };
    return { x: TAU, y: 0 };
  }

  pointerDown(p) {
    if (this.skip()) return false;
    const g = this.geo(this.sv), step = this.stepIndex;
    if (step === 3 && this.joint && Math.hypot(p.x - this.joint.x, p.y - this.joint.y) < 30) {
      this.bend = -this.bend;
      this.liveFrame();
      return false;
    }
    this.aim(g, p);
    return true;
  }

  pointerMove(p) {
    this.aim(this.geo(this.sv), p);
    return false;
  }

  aim(g, p) {
    const step = this.stepIndex;
    if (step === 0 || step === 3) this.goal = { x: clamp(p.x, 12, g.W - 12), y: clamp(p.y, 40, g.floor - 6) };
    else if (step === 1) this.goal = { x: clamp(Math.round((g.F.x - p.x) / g.u), 1, 6), y: 0 };
    else {
      const a = Math.atan2(p.y - g.C.y, p.x - g.C.x) + Math.PI / 2;
      const cur = (this.goal ?? this.parked(g)).x;
      this.goal = { x: a + Math.round((cur - a) / TAU) * TAU, y: 0 };
    }
    this.liveFrame();
  }

  paint(st) {
    const g = this.geo(st), step = this.stepIndex;
    let svg = '';
    if (step === 3) {
      const R = (A + B) * g.s, r = (A - B) * g.s, { x, y } = g.S;
      const ring = `M${f1(x - R)} ${y}a${R} ${R} 0 1 0 ${f1(2 * R)} 0a${R} ${R} 0 1 0 ${f1(-2 * R)} 0ZM${f1(x - r)} ${y}a${r} ${r} 0 1 0 ${f1(2 * r)} 0a${r} ${r} 0 1 0 ${f1(-2 * r)} 0Z`;
      svg += `<path d="${ring}" style="fill:color-mix(in oklab, var(--sim-accent) 14%, transparent);fill-rule:evenodd;stroke:var(--sim-accent);stroke-width:2.5;stroke-dasharray:7 8"/>`;
    }
    if (step === 2) svg += axesSvg(g.f).svg;
    const head = chip(TITLES[step], 0, 0, { tone: 'plain', size: 'big', static: true });
    return { svg, head, floor: step === 2 && !g.P ? g.H - 34 : step === 2 ? undefined : g.floor };
  }

  animate(st, t) {
    const live = this.live, g = this.geo(st), step = this.stepIndex;
    const sc = this.script(g, t);
    const goal = sc ?? this.goal ?? this.parked(g);
    const pt = trackPoint(live, 'goal', goal, { snap: !!sc, preset: step === 2 ? 'smooth' : 'snappy' });
    if (step === 0 || step === 3) this.arm(live, g, pt, step);
    else if (step === 1) this.lever(live, g, pt.x, t);
    else this.crank(live, g, pt.x);
    liveChip(live, 'hint', HINTS[step], g.W / 2, g.P ? g.H - 22 : g.floor + 18, { tone: 'accent', size: 'sm' });
  }

  arm(live, g, pt, step) {
    const s = g.s, S = g.S;
    const flip = trackPoint(live, 'bend', { x: this.bend, y: 0 }, { preset: 'snappy' }).x;
    const kp = ik2(S, pt, A * s, B * s, 1), km = ik2(S, pt, A * s, B * s, -1);
    const u = clamp((flip + 1) / 2, 0, 1);
    const J = { x: km.joint.x + (kp.joint.x - km.joint.x) * u, y: km.joint.y + (kp.joint.y - km.joint.y) * u };
    const E = kp.end;
    this.joint = J;
    // Pedestal.
    live.shape('base', 'g', { html: `<rect x="${f1(S.x - 42 * s)}" y="${f1(g.floor - 26 * s)}" width="${f1(84 * s)}" height="${f1(30 * s)}" rx="10" ${fill(shade('var(--sim-stroke)', 70))}/>`
      + `<rect x="${f1(S.x - 42 * s)}" y="${f1(g.floor - 30 * s)}" width="${f1(84 * s)}" height="${f1(26 * s)}" rx="10" ${fill('var(--sim-stroke)')}/>` });
    liveLimb(live, 'post', { x: S.x, y: g.floor - 26 * s }, S, 40 * s, 30 * s, shade(tone(7), 80));
    // The third side, dashed, under the arm.
    const side = live.shape('side', 'line');
    live.attrs(side, { x1: f1(S.x), y1: f1(S.y), x2: f1(E.x), y2: f1(E.y) });
    live.css(side, { stroke: 'var(--sim-accent)', 'stroke-width': 3.5, 'stroke-dasharray': '8 8', 'stroke-linecap': 'round' });
    liveLimb(live, 'upper', S, J, 30 * s, 22 * s, tone(7), { lip: 3 });
    liveLimb(live, 'fore', J, E, 22 * s, 15 * s, tone(2), { lip: 3 });
    // Angle at the hinge: an arc between the two bones.
    const a1 = Math.atan2(S.y - J.y, S.x - J.x), a2 = Math.atan2(E.y - J.y, E.x - J.x);
    let da = a2 - a1;
    while (da > Math.PI) da -= TAU;
    while (da < -Math.PI) da += TAU;
    const rr = 30 * s + 8, p0 = { x: J.x + Math.cos(a1) * rr, y: J.y + Math.sin(a1) * rr }, p1 = { x: J.x + Math.cos(a1 + da) * rr, y: J.y + Math.sin(a1 + da) * rr };
    const arc = live.shape('arc', 'path');
    live.attrs(arc, { d: `M${f1(J.x)} ${f1(J.y)}L${f1(p0.x)} ${f1(p0.y)}A${f1(rr)} ${f1(rr)} 0 0 ${da > 0 ? 1 : 0} ${f1(p1.x)} ${f1(p1.y)}Z` });
    live.css(arc, { fill: 'color-mix(in oklab, var(--sim-gold) 45%, transparent)', stroke: 'var(--sim-gold)', 'stroke-width': 2.5 });
    for (const [k, p, r] of [['jS', S, 13], ['jJ', J, 12], ['jE', E, 10]]) {
      live.shape(k, 'g', { html: `<circle cx="${f1(p.x)}" cy="${f1(p.y + 2)}" r="${f1(r * s + 2)}" ${fill(shade('var(--sim-stroke)', 60))}/><circle cx="${f1(p.x)}" cy="${f1(p.y)}" r="${f1(r * s + 2)}" ${fill(glossOf('var(--sim-stroke)', 70))}/><circle cx="${f1(p.x)}" cy="${f1(p.y)}" r="${f1((r * s + 2) * 0.35)}" ${fill('var(--sim-label)')}/>` });
    }
    const deg = Math.round(Math.abs(da) * 180 / Math.PI), c = Math.hypot(E.x - S.x, E.y - S.y) / s / 10;
    const mid = (p, q, o) => ({ x: (p.x + q.x) / 2 + o.x, y: (p.y + q.y) / 2 + o.y });
    const bis = a1 + da / 2;
    liveChip(live, 'deg', `${deg}\u00b0`, J.x - Math.cos(bis) * 30, J.y - Math.sin(bis) * 30, { tone: 'gold', size: 'sm' });
    if (step === 0) {
      // Side labels sit outside the triangle: each pushed from the centroid through its side's midpoint.
      const G = { x: (S.x + J.x + E.x) / 3, y: (S.y + J.y + E.y) / 3 };
      const out = (p, q, k) => { const m = mid(p, q, { x: 0, y: 0 }), L = Math.hypot(m.x - G.x, m.y - G.y) || 1; return { x: m.x + ((m.x - G.x) / L) * k, y: m.y + ((m.y - G.y) / L) * k }; };
      const la = out(S, J, 30), lb = out(J, E, 30), lc = out(S, E, 26);
      liveChip(live, 'la', 'a = 15', la.x, la.y, { tone: 7, size: 'sm' });
      liveChip(live, 'lb', 'b = 12', lb.x, lb.y, { tone: 2, size: 'sm' });
      liveChip(live, 'lc', `c = ${c.toFixed(1)}`, lc.x, lc.y, { tone: 'accent', size: 'sm' });
      this.card(live, g, 'Triangle', [
        { label: 'a, b', value: '15, 12' },
        { label: 'c', value: c.toFixed(1), tone: 'accent' },
        { label: 'Angle C', value: `${deg}\u00b0`, tone: 'gold' },
      ], 'c\u00b2 = a\u00b2 + b\u00b2 - 2ab cos C');
    } else {
      const reach = Math.hypot(pt.x - S.x, pt.y - S.y) / s;
      const ok = kp.reached;
      if (!ok) {
        live.shape('miss', 'g', { html: `<circle cx="${f1(pt.x)}" cy="${f1(pt.y)}" r="13" style="fill:none;stroke:var(--sim-bad);stroke-width:3"/><path d="M${f1(pt.x - 6)} ${f1(pt.y - 6)}l12 12m0 -12l-12 12" style="stroke:var(--sim-bad);stroke-width:3;stroke-linecap:round"/>` });
        liveChip(live, 'far', 'Too far!', clamp(pt.x, 50, g.W - 50), clamp(pt.y - 30, 30, g.floor - 20), { tone: 'bad', size: 'sm' });
      }
      this.card(live, g, 'Reach', [
        { label: 'Ring', value: `${A / 10 - B / 10} to ${A / 10 + B / 10}` },
        { label: 'Target', value: (reach / 10).toFixed(1), tone: ok ? 'good' : 'bad' },
        { label: 'Elbow', value: this.bend > 0 ? 'down' : 'up' },
      ], ok ? 'Inside the ring: it reaches' : 'Outside the ring: no way');
    }
  }

  lever(live, g, d, t) {
    const u = g.u, F = g.F;
    const target = clamp(0.045 * (LOAD * LOAD_AT - EFF * d), -0.2, 0.2);
    const ang = trackPoint(live, 'tilt', { x: target, y: 0 }, { preset: 'heavy' }).x;
    liveLever(live, 'lev', F, ang, 6.4 * u, 4.4 * u, { unit: u, floor: g.floor, thick: g.P ? 14 : 18 });
    const block = (key, sAt, size, kg, tn) => {
      const p = beamPoint(F, ang, sAt, (g.P ? 7 : 9) + size / 2);
      const c = tone(tn);
      const e = live.shape(key, 'g', { html: `<rect x="${-size / 2}" y="${-size / 2 + 4}" width="${size}" height="${size}" rx="${size * 0.2}" ${fill(shade(c, 66))}/>`
        + `<rect x="${-size / 2}" y="${-size / 2}" width="${size}" height="${size}" rx="${size * 0.2}" ${fill(c)}/>`
        + `<rect x="${-size / 2 + 5}" y="${-size / 2 + 4}" width="${size - 10}" height="4" rx="2" ${fill(glossOf(c, 45))}/>` });
      live.attrs(e, { transform: `translate(${f1(p.x)} ${f1(p.y)}) rotate(${(ang * 180 / Math.PI).toFixed(2)})` });
      liveChip(live, `${key}kg`, `${kg} kg`, p.x, p.y - size / 2 - 16, { tone: tn, size: 'sm' });
    };
    block('load', LOAD_AT * u, g.P ? 40 : 54, LOAD, 6);
    block('eff', -d * u, g.P ? 30 : 40, EFF, 1);
    const dr = Math.round(d * 10) / 10, left = EFF * dr, balanced = Math.abs(dr - BAL) < 0.05;
    const dt = Number.isInteger(dr) ? String(dr) : dr.toFixed(1);
    const eq = `${EFF}${MUL}${dt}  ${balanced ? '=' : left < LOAD * LOAD_AT ? '<' : '>'}  ${LOAD}${MUL}${LOAD_AT}`;
    liveChip(live, 'eq', eq, g.P ? g.W / 2 : (F.x + 20), g.P ? 70 : 62, { tone: balanced ? 'good' : 'plain', size: g.P ? 'sm' : undefined });
    this.card(live, g, 'Moments', [
      { label: `Left ${EFF}${MUL}${dt}`, value: String(+left.toFixed(1)), tone: 1 },
      { label: `Right ${LOAD}${MUL}${LOAD_AT}`, value: String(LOAD * LOAD_AT), tone: 6 },
    ], balanced ? 'Equal moments: it balances' : 'Turn effect = weight \u00d7 distance');
    if (balanced && Math.abs(ang) < 0.01 && t >= ENDS[1] && !this.cheered) { this.cheered = true; this.celebrate(); }
  }

  crank(live, g, a) {
    const s = g.s, r = 50 * s, rod = 140 * s;
    const k = liveCrank(live, 'crank', g.C, r, rod, a, -Math.PI / 2, { piston: { w: 80 * s, h: 38 * s }, headroom: 26 * s });
    const h = (k.s - k.sMin) / (k.sMax - k.sMin) * 10;
    // The wave: height against angle, drawn up to the current angle (the whole turn once one is done).
    const f = g.f, turn = ((a % TAU) + TAU) % TAU, upto = a >= TAU - 1e-6 ? TAU : Math.max(0, a);
    const pts = [];
    for (let q = 0; q <= upto + 1e-9; q += TAU / 90) {
      const kk = crankSlider(g.C, r, rod, q, -Math.PI / 2);
      pts.push(`${f1(f.px((q * 180) / Math.PI))} ${f1(f.py(((kk.s - kk.sMin) / (kk.sMax - kk.sMin)) * 10))}`);
    }
    const wave = live.shape('wave', 'path');
    live.attrs(wave, { d: pts.length > 1 ? 'M' + pts.join('L') : 'M0 0' });
    live.css(wave, { fill: 'none', stroke: tone(3), 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', visibility: pts.length > 1 ? null : 'hidden' });
    const dx = f.px((turn * 180) / Math.PI), dy = f.py(h);
    const dot = live.shape('dot', 'circle');
    live.attrs(dot, { cx: f1(dx), cy: f1(dy), r: 8 });
    live.css(dot, { fill: tone(3), stroke: 'var(--sim-bg-surface)', 'stroke-width': 3 });
    liveChip(live, 'h', `${h.toFixed(1)} cm`, clamp(dx, f.plot.x + 30, f.plot.x + f.plot.w - 30), dy - 24, { tone: 3, size: 'sm' });
  }

  card(live, g, title, rows, note) {
    const e = live.el('card', { tag: 'div', html: cardHtml(g.card.x, g.card.y, g.card.w, title, rows, { tone: 'accent' }) });
    live.css(e, { width: `${g.W}px` });
    if (note) liveChip(live, 'note', note, g.P ? g.W / 2 : g.card.x + g.card.w / 2, g.P ? g.card.y + 138 : g.card.y + 150, { tone: 'plain', size: 'sm', cls: g.P ? '' : 'sv-chip--wrap' });
  }

  css() {
    return '.sv-chip--wrap { white-space: normal; width: 170px; text-align: center; }';
  }
}
