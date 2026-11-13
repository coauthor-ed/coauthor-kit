/**
 * SvgRigBiologyShowcaseScene - kit/SimRigSvg.js doing a biology job: the elbow as a two-bone chain (ik2)
 * worked by an antagonistic pair of muscles (liveMuscle). Muscles only pull: the one that shortens
 * bulges and moves the forearm, the other relaxes and is stretched.
 *   Beat 0: a curl: the biceps contracts, the triceps relaxes
 *   Beat 1: straighten: the triceps contracts, the biceps relaxes
 * Each beat plays a scripted move, then parks; a tap skips it. Then drag the hand (smoothed on the clock by
 * trackPoint): whichever way the elbow moves, the right muscle lights up.
 */
import { SvgScene, chip, liveChip, cardHtml, fill, shade, glossOf, tone } from 'simulations/base/kit/SimSvg.js';
import { keys, ease, reducedMotion } from 'simulations/base/kit/SimAnim.js';
import { ik2, liveLimb, liveMuscle, limbSvg, trackPoint } from 'simulations/base/kit/SimRigSvg.js';

const TAU = Math.PI * 2;
const MAP = [0, 1].map((i) => [{ idx: i, dwellMs: null }]);
const TITLES = ['Biceps pulls: the arm bends', 'Triceps pulls: the arm straightens'];
const ENDS = [1.8, 1.8];
const ARM = { sx: 236, sy: 214, l1: 108, l2: 100 };
const FLOOR = 422;
const SCRIPTS = [
  [[0.15, 1.25, 196], [1.8, -0.5, 106]],
  [[0.15, -0.5, 106], [1.8, 1.05, 194]],
];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const f1 = (v) => v.toFixed(1);
const SKIN = 'color-mix(in oklab, color-mix(in oklab, var(--sim-series-8) 50%, var(--sim-series-2)) 55%, white)';

export class SvgRigBiologyShowcaseScene extends SvgScene {
  static BEAT_STEP_MAP = MAP;
  static ARIA_LABEL = 'A person curls and straightens an arm. Inside the upper arm, the biceps shortens and bulges to bend the elbow while the triceps relaxes; to straighten it, the triceps shortens and the biceps relaxes. Drag the hand to move the arm.';
  static CONTROLS = [{ type: 'button', id: 'replay', label: 'Replay' }];

  stageHeight(st) { return st.portrait ? 600 : 430; }

  enter() {
    this.goal = null;
    this.active = this.stepIndex === 0 ? 'b' : 't';
    this.lastElbow = null;
    this.play(ENDS[this.stepIndex]);
  }

  onControlChange(id) {
    if (id === 'replay') { this.clockReset(); this.enter(); }
    this.requestUiUpdate?.();
  }

  geo(st) {
    const P = st.portrait, W = st.W, H = st.H;
    const s = P ? 0.9 : 1, ox = P ? -90 : 0, oy = P ? -20 : -60;
    const T = (x, y) => ({ x: ox + x * s, y: oy + y * s });
    return { P, W, H, s, T, floor: oy + FLOOR * s, card: P ? { x: 14, y: oy + FLOOR * s + 14, w: W - 28 } : { x: W - 206, y: 18, w: 190 } };
  }

  script(g, t) {
    if (t >= ENDS[this.stepIndex] || reducedMotion()) return null;
    return this.polar(g, t);
  }

  polar(g, t) {
    const fr = SCRIPTS[this.stepIndex];
    const a = keys(t, fr.map((k) => [k[0], k[1]]), ease.smooth), d = keys(t, fr.map((k) => [k[0], k[2]]), ease.smooth);
    return g.T(ARM.sx + Math.cos(a) * d, ARM.sy + Math.sin(a) * d);
  }

  pointerDown(p) {
    if (this.skip()) return false;
    this.aim(p);
    return true;
  }

  pointerMove(p) { this.aim(p); return false; }

  aim(p) {
    const g = this.geo(this.sv);
    this.goal = { x: clamp(p.x, 16, g.P ? g.W - 16 : g.W - 220), y: clamp(p.y, 40, g.floor - 10) };
    this.liveFrame();
  }

  paint(st) {
    const g = this.geo(st), T = g.T, s = g.s, dx = 40;
    const shirt = tone(5), legs = shade(tone(1), 75);
    const P = (x, y) => T(x + dx, y);
    const r = (x, y, w, h, rx, col) => { const a = P(x, y); return `<rect x="${f1(a.x)}" y="${f1(a.y)}" width="${f1(w * s)}" height="${f1(h * s)}" rx="${f1(rx * s)}" ${fill(col)}/>`; };
    const head = P(174, 130), hair = shade(tone(2), 45);
    let svg = `<ellipse cx="${f1(P(170, 0).x)}" cy="${f1(g.floor + 3)}" rx="${f1(70 * s)}" ry="${f1(10 * s)}" ${fill('var(--sim-bg-deep)', 'opacity:0.35')}/>`
      + limbSvg(P(156, 350), P(150, FLOOR - 10), 30 * s, 24 * s, legs)
      + limbSvg(P(186, 350), P(192, FLOOR - 10), 30 * s, 24 * s, shade(tone(1), 85))
      + r(130, FLOOR - 16, 34, 14, 7, shade('var(--sim-stroke)', 70)) + r(178, FLOOR - 16, 34, 14, 7, shade('var(--sim-stroke)', 70))
      + r(130, 196, 84, 168, 34, shade(shirt, 70)) + r(130, 190, 84, 168, 34, shirt)
      + r(160, 168, 26, 30, 8, SKIN)
      + `<circle cx="${f1(head.x)}" cy="${f1(head.y)}" r="${f1(46 * s)}" ${fill(SKIN)}/>`
      + `<path d="M${f1(head.x - 47 * s)} ${f1(head.y - 4 * s)}A${f1(47 * s)} ${f1(47 * s)} 0 0 1 ${f1(head.x + 47 * s)} ${f1(head.y - 4 * s)}Q${f1(head.x)} ${f1(head.y - 22 * s)} ${f1(head.x - 47 * s)} ${f1(head.y - 4 * s)}Z" ${fill(hair)}/>`
      + `<circle cx="${f1(head.x + 4 * s)}" cy="${f1(head.y + 6 * s)}" r="${f1(4.5 * s)}" ${fill('var(--sim-label)')}/><circle cx="${f1(head.x + 26 * s)}" cy="${f1(head.y + 6 * s)}" r="${f1(4.5 * s)}" ${fill('var(--sim-label)')}/>`
      + `<path d="M${f1(head.x + 6 * s)} ${f1(head.y + 22 * s)}Q${f1(head.x + 16 * s)} ${f1(head.y + 30 * s)} ${f1(head.x + 26 * s)} ${f1(head.y + 22 * s)}" style="fill:none;stroke:var(--sim-label);stroke-width:3;stroke-linecap:round"/>`;
    return { svg, head: chip(TITLES[this.stepIndex], 0, 0, { tone: 'plain', size: st.portrait ? null : 'big', static: true }), floor: g.floor };
  }

  animate(st, t) {
    const live = this.live, g = this.geo(st), s = g.s;
    const sc = this.script(g, t);
    const goal = sc ?? this.goal ?? this.polar(g, ENDS[this.stepIndex]);
    const pt = trackPoint(live, 'hand', goal, { snap: !!sc, preset: 'snappy' });
    const S = g.T(ARM.sx, ARM.sy);
    const k = ik2(S, pt, ARM.l1 * s, ARM.l2 * s, 1);
    const J = k.joint, E = k.end;
    const u1 = { x: Math.cos(k.a1), y: Math.sin(k.a1) }, u2 = { x: Math.cos(k.a2), y: Math.sin(k.a2) };
    // Front of the upper arm = the side the forearm folds toward.
    let nf = { x: -u1.y, y: u1.x };
    if (nf.x * u2.x + nf.y * u2.y < 0) nf = { x: -nf.x, y: -nf.y };
    let elbow = Math.abs(k.a2 - k.a1) % TAU;
    if (elbow > Math.PI) elbow = TAU - elbow;
    elbow = 180 - (elbow * 180) / Math.PI;
    // Which muscle pulls: the one the elbow's motion says (bending: biceps; straightening: triceps).
    if (this.lastElbow != null && Math.abs(elbow - this.lastElbow) > 0.15) this.active = elbow < this.lastElbow ? 'b' : 't';
    this.lastElbow = elbow;
    const kb = clamp((180 - elbow) / 120, 0, 1), kt = clamp((elbow - 50) / 120, 0, 1);
    const on = (m) => this.active === m;
    const relaxed = (c) => `color-mix(in oklab, ${c} 45%, ${SKIN})`;

    liveLimb(live, 'upper', S, J, 38 * s, 28 * s, SKIN, { edge: shade(SKIN, 80), lw: 2 });
    const add = (p, v, k1) => ({ x: p.x + v.x * k1, y: p.y + v.y * k1 });
    // Triceps: back of the upper arm, shoulder to the point of the elbow.
    const tOrg = add(add(S, u1, 12 * s), nf, -9 * s), tIns = add(add(J, u1, -4 * s), nf, -10 * s);
    liveMuscle(live, 'tri', tOrg, tIns, 13 * s, 7 * s, on('t') ? (1 + 5 * kt) * s : 0.5, on('t') ? tone(4) : relaxed(tone(4)), { edge: shade(tone(4), 60), lw: 2.5 });
    liveLimb(live, 'fore', J, E, 27 * s, 21 * s, SKIN, { edge: shade(SKIN, 80), lw: 2 });
    // Biceps: front of the upper arm, shoulder to just past the elbow on the forearm.
    const bOrg = add(add(S, u1, 14 * s), nf, 5 * s), bIns = add(J, u2, 22 * s);
    liveMuscle(live, 'bi', bOrg, bIns, 14 * s, 8 * s, on('b') ? (1 + 6 * kb) * s : 0.5, on('b') ? tone(6) : relaxed(tone(6)), { edge: shade(tone(6), 60), lw: 2.5 });
    live.shape('joints', 'g', { html: `<circle cx="${f1(J.x)}" cy="${f1(J.y)}" r="${f1(6 * s)}" ${fill(shade(SKIN, 80))}/>`
      + `<circle cx="${f1(E.x)}" cy="${f1(E.y)}" r="${f1(15 * s)}" ${fill(SKIN, `stroke:${shade(SKIN, 75)};stroke-width:2`)}/>`
      + `<circle cx="${f1(E.x - 4 * s)}" cy="${f1(E.y - 5 * s)}" r="${f1(4 * s)}" ${fill(glossOf(SKIN, 50))}/>` });

    // Labels off each muscle's own side, with leaders.
    const bm = { x: (bOrg.x + bIns.x) / 2, y: (bOrg.y + bIns.y) / 2 }, tm = { x: (tOrg.x + tIns.x) / 2, y: (tOrg.y + tIns.y) / 2 };
    const lab = (key, m, dir, text, tn, isOn) => {
      const L = add(m, dir, 70 * s + 10);
      const lx = clamp(L.x, 74, g.P ? g.W - 74 : g.W - 280), ly = clamp(L.y, 34, g.floor - 20);
      const ld = live.shape(`${key}L`, 'line');
      live.attrs(ld, { x1: f1(m.x), y1: f1(m.y), x2: f1(lx), y2: f1(ly) });
      live.css(ld, { stroke: tone(tn), 'stroke-width': 2.5, 'stroke-linecap': 'round', opacity: isOn ? null : '0.6' });
      liveChip(live, key, text, lx, ly, { tone: isOn ? tn : 'plain', size: 'sm' });
    };
    lab('lb', bm, nf, on('b') ? 'Biceps: pulls' : 'Biceps: relaxed', 6, on('b'));
    lab('lt', tm, { x: -nf.x, y: -nf.y }, on('t') ? 'Triceps: pulls' : 'Triceps: relaxed', 4, on('t'));

    live.el('card', { tag: 'div', html: cardHtml(g.card.x, g.card.y, g.card.w, 'Elbow', [
      { label: 'Angle', value: `${Math.round(elbow)}\u00b0`, tone: 1 },
      { label: 'Biceps', value: on('b') ? 'short' : 'long', tone: 6 },
      { label: 'Triceps', value: on('t') ? 'short' : 'long', tone: 4 },
    ], { tone: 'accent' }) });
    liveChip(live, 'note', 'Muscles only pull, so they work in pairs', g.card.x + g.card.w / 2, g.card.y + (g.P ? 140 : 150), { tone: 'plain', size: 'sm', cls: 'sv-chip--wrap' });
    liveChip(live, 'hint', 'Drag the hand', g.P ? g.W / 2 : (g.W - 206) / 2, g.P ? g.H - 22 : g.floor + 22, { tone: 'accent', size: 'sm' });
  }

  css() {
    return '.sv-chip--wrap { white-space: normal; width: 176px; text-align: center; }';
  }
}
