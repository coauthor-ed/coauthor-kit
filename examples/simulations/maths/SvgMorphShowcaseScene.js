/**
 * SvgMorphShowcaseScene - reference for kit/SimMorphSvg.js on the SvgScene frame clock (play, animate,
 * this.live). The four beats of SimMorphShowcaseScene, in SVG and real text:
 *   Beat 0: a square becomes a circle of the same area and back (morphPath)
 *   Beat 1: solving 2x + 3 = 11 in two steps; matched terms glide and keep their colours (transformTermsSvg)
 *   Beat 2: a bus drives 3 hours at 60 km/h: countSvg distance, odometerSvg hours, keywordSvg + highlighterSvg
 *   Beat 3: balancing H2 + O2 -> H2O; coefficients appear, molecules keep their series colours
 * Tap skips a running build to its end; Replay runs it again. Portrait is its own layout.
 */
import { SvgScene, chip, liveChip, fill, shade, glossOf, tone, cushionRect, cushionCircle } from 'simulations/base/kit/SimSvg.js';
import { ease, dur, pop } from 'simulations/base/kit/SimAnim.js';
import { morphPair, rectPts, circlePts, keywordPop, KEYWORD_SETTLE } from 'simulations/base/kit/SimMorphSpec.js';
import {
  MORPH_SVG_CSS, morphPath, transformTermsSvg, termsSvg, tabularSvg, countSvg, odometerSvg, keywordSvg, highlighterSvg,
} from 'simulations/base/kit/SimMorphSvg.js';

const MAP = [0, 1, 2, 3].map((i) => [{ idx: i, dwellMs: null }]);

const SIDE = 152;                          // 4 cm at 38 px per cm
const RADIUS = SIDE / Math.sqrt(Math.PI);  // same area: 2.26 cm
const B0 = { there: 0.5, morph: 1.2, back: 2.6 };
const B1 = { s1: 0.7, s2: 2.5, len: 1.1 };
const DRIVE = 3;
const KW = { lead: 3.05, tIn: 3.25, tHit: 3.75 };
const B3 = { at: 0.8, len: 1.2 };
const ENDS = [B0.back + B0.morph, B1.s2 + B1.len, KW.tHit + KEYWORD_SETTLE, B3.at + B3.len + 0.3];
const TITLES = ['Same area, new shape', 'Solve for x', '60 km every hour, for 3 hours', 'Balance the atoms'];

const LABEL = 'var(--sim-label)';
const MUTED = 'var(--sim-label-muted)';
const ink = (n) => `var(--sim-series-${n}-ink)`;
const seg = (t, a, len) => Math.max(0, Math.min(1, (t - a) / len));
const grow = (age) => { const pp = pop(age); return pp ? pp.scale : 0; };

const CSS = MORPH_SVG_CSS + `
.mm-ball { font: 800 16px var(--sim-font-display, var(--sim-font)); text-anchor: middle; dominant-baseline: central; }
.mm-op { font: 800 30px var(--sim-font-display, var(--sim-font)); text-anchor: middle; dominant-baseline: central; fill: var(--sim-label-muted); }
`;

// -- Markup ---------------------------------------------------------------------------

function cardSvg(st) {
  const w = st.W - 4, h = st.H - 14;
  return `<rect x="2" y="9" width="${w}" height="${h}" rx="24" ${fill('color-mix(in oklab, var(--sim-stroke) 70%, var(--sim-bg-deep))')}/>`
    + `<rect x="2" y="2" width="${w}" height="${h}" rx="24" ${fill('var(--sim-bg-surface)', 'stroke:var(--sim-stroke);stroke-width:2')}/>`;
}

function ball(x, y, r, n, letter) {
  return cushionCircle(x, y, r, tone(n))
    + (letter ? `<text class="mm-ball" x="${x}" y="${y + 1}" style="fill:var(--sim-ink-on-${n});font-size:${Math.max(16, Math.round(r * 0.95))}px">${letter}</text>` : '');
}

const H2 = ball(-13, 0, 15, 1, 'H') + ball(13, 0, 15, 1, 'H');
const O2 = ball(-14, 0, 20, 6, 'O') + ball(14, 0, 20, 6, 'O');
const WATER = ball(0, -4, 19, 6, 'O') + ball(-25, 11, 14, 1, 'H') + ball(25, 11, 14, 1, 'H');

// A flat bus centred on (0, 0): body with a lip, glass, a gloss stripe, cushioned wheels.
const WHEEL = 'color-mix(in oklab, var(--sim-stroke) 45%, var(--sim-label))';
const BUS = `<ellipse cx="0" cy="34" rx="62" ry="7" ${fill('color-mix(in oklab, var(--sim-label) 16%, transparent)')}/>`
  + cushionRect(-58, -36, 116, 56, 14, tone(2), { lift: 6, gloss: false })
  + [0, 1, 2].map((i) => `<rect x="${-48 + i * 28}" y="-28" width="22" height="18" rx="5" ${fill('var(--sim-glass)')}/>`).join('')
  + `<rect x="36" y="-28" width="16" height="26" rx="5" ${fill('var(--sim-glass)')}/>`
  + `<rect x="-52" y="-2" width="104" height="5" rx="2.5" ${fill(glossOf(tone(2), 55))}/>`
  + cushionCircle(-32, 22, 12, WHEEL, { gloss: false }) + cushionCircle(32, 22, 12, WHEEL, { gloss: false })
  + `<circle cx="-32" cy="22" r="4" ${fill(MUTED)}/><circle cx="32" cy="22" r="4" ${fill(MUTED)}/>`;

// -- Term lists -------------------------------------------------------------------------

const EQ = (() => {
  const k = { p: '2', id: 'k', col: ink(2) };
  const x = { p: 'x', id: 'x', col: ink(1) };
  const eq = { p: ' = ', id: 'eq', col: LABEL };
  return [
    [k, x, { p: ' + ', id: 'plus', col: LABEL }, { p: '3', id: 'three', col: ink(6) }, eq, { p: '11', id: 'rhs', col: ink(3) }],
    [k, x, eq, { p: '8', id: 'rhs', col: ink(3) }],
    [x, eq, { p: '4', id: 'rhs', col: ink(3) }],
  ];
})();

const COEF = 'color-mix(in oklab, var(--sim-gold) 72%, var(--sim-label))';
const CHEM = (() => {
  const h2 = { p: ['sub', 'H', '2'], id: 'h2', col: ink(1) };
  const o2 = { p: ['sub', 'O', '2'], id: 'o2', col: ink(6) };
  const wH = { p: ['sub', 'H', '2'], id: 'w', col: ink(1) };
  const wO = { p: 'O', id: 'w', col: ink(6) };
  const plus = { p: ' + ', id: 'plus', col: LABEL };
  const arrow = { p: ' \u2192 ', id: 'arrow', col: LABEL };
  return [
    [h2, plus, o2, arrow, wH, wO],
    [{ p: '2', id: 'k1', col: COEF }, h2, plus, o2, arrow, { p: '2', id: 'k2', col: COEF }, wH, wO],
  ];
})();

export class SvgMorphShowcaseScene extends SvgScene {
  static BEAT_STEP_MAP = MAP;
  static ARIA_LABEL = 'Four morph demos: a square turning into a circle with the same area, solving 2x + 3 = 11 step by step, a bus counting distance for 3 hours, and balancing hydrogen plus oxygen to make water.';
  static CONTROLS = [{ type: 'button', id: 'replay', label: 'Replay' }];

  css() { return CSS; }
  stageHeight(st) { return st.portrait ? [470, 470, 470, 460][this.stepIndex ?? 0] : 420; }

  enter() { this.run(); }

  run() {
    this.cheered = false;
    this.cancelCheer?.();
    const step = this.stepIndex;
    this.play(ENDS[step]);
    this.cancelCheer = step === 1 || step === 3 ? this.after(dur(ENDS[step]), () => this.cheer()) : null;
  }

  cheer() {
    if (this.cheered || (this.stepIndex !== 1 && this.stepIndex !== 3)) return;
    this.cheered = true;
    this.celebrate();
  }

  onControlChange(id) {
    if (id === 'replay') this.run();
    this.requestUiUpdate?.();
  }

  pointerDown() {
    if (this.skip()) this.cheer();
    return false;
  }

  paint(st) {
    const title = TITLES[this.stepIndex];
    const head = chip(title, 0, 0, { tone: 'plain', size: st.portrait && title.length > 22 ? null : 'big', static: true });
    let over = '';
    if (this.stepIndex === 0) over = chip('Area = 16 square cm', st.W / 2, st.H - 52, { tone: 'good', size: 'big' });
    return { svg: cardSvg(st), over, head };
  }

  animate(st, t) {
    [this.shapes, this.equation, this.distance, this.balance][this.stepIndex].call(this, st, t, this.live);
  }

  // -- Beat 0 ----------------------------------------------------------------------------

  outlines(cx, cy) {
    const key = `${cx},${cy}`;
    if (this._outKey !== key) {
      this._outKey = key;
      this._out = morphPair(rectPts(cx, cy, SIDE, SIDE, 64), circlePts(cx, cy, RADIUS, 64), 96);
    }
    return this._out;
  }

  shapes(st, t, live) {
    const cx = st.W / 2, cy = st.portrait ? 236 : 178;
    const [SQ, CI] = this.outlines(cx, cy);
    const p = ease.smooth(seg(t, B0.there, B0.morph)) * (1 - ease.smooth(seg(t, B0.back, B0.morph)));
    live.attrs(live.shape('shadow', 'ellipse'), { cx, cy: cy + SIDE / 2 + 22, rx: (92 - 10 * p).toFixed(2), ry: 9 });
    live.css(live.get('shadow'), { fill: 'color-mix(in oklab, var(--sim-label) 14%, transparent)' });
    // Lip, face and gloss are all morphPath, at rest too: the first morph frame never jumps.
    morphPath(live, 'lip', SQ, CI, p, { fill: shade(tone(1), 66), dy: 7 });
    morphPath(live, 'face', SQ, CI, p, { fill: tone(1) });
    morphPath(live, 'gloss', SQ, CI, p, { fill: glossOf(tone(1), 50), opacity: 0.3, transform: `translate(${cx} ${cy}) scale(0.72) translate(${-cx - 10} ${-cy - 12})` });

    const my = cy + SIDE / 2 + 50;
    if (p < 0.5) {
      const a = 1 - p * 2, by = cy + SIDE / 2 + 18, x0 = cx - SIDE / 2, x1 = cx + SIDE / 2;
      const br = live.shape('bracket', 'path');
      live.attrs(br, { d: `M${x0} ${by - 8}V${by}H${x1}V${by - 8}` });
      live.css(br, { fill: 'none', stroke: LABEL, 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: a.toFixed(3) });
      liveChip(live, 'measure', 'side 4 cm', cx, my, { tone: 2, alpha: a });
    } else {
      const a = p * 2 - 1;
      const g = live.shape('radius', 'g', { html: `<path d="M${cx} ${cy}H${(cx + RADIUS - 5).toFixed(1)}" style="fill:none;stroke:var(--sim-ink-on-1);stroke-width:4;stroke-linecap:round"/><circle cx="${cx}" cy="${cy}" r="6" ${fill('var(--sim-ink-on-1)')}/>` });
      live.css(g, { opacity: a.toFixed(3) });
      liveChip(live, 'measure', 'radius 2.26 cm', cx, my, { tone: 2, alpha: a });
    }
    // Name chips: beside the shape in landscape, above it in portrait.
    const nx = st.portrait ? 82 : 190, ny = st.portrait ? 56 : cy;
    liveChip(live, 'sq', 'Square', cx - nx, ny, { tone: 1, size: 'big', alpha: 1 - p * 0.65, scale: 1 - p * 0.1 });
    liveChip(live, 'ci', 'Circle', cx + nx, ny, { tone: 1, size: 'big', alpha: 0.35 + p * 0.65, scale: 0.9 + p * 0.1 });
  }

  // -- Beat 1 ----------------------------------------------------------------------------

  equation(st, t, live) {
    const P = st.portrait, W2 = st.W / 2;
    const y = { label: P ? 70 : 64, prev: P ? 168 : 146, main: P ? 252 : 226, dots: P ? 324 : 292, check: P ? 392 : 350 };
    const u1 = seg(t, B1.s1, B1.len), u2 = seg(t, B1.s2, B1.len);
    const o = { size: P ? 50 : 60, label: 'The equation' };
    if (u2 > 0) transformTermsSvg(live, 'eq', EQ[1], EQ[2], W2, y.main, u2, { ...o, label: u2 >= 1 ? 'x = 4' : '2x = 8' });
    else transformTermsSvg(live, 'eq', EQ[0], EQ[1], W2, y.main, u1, { ...o, label: u1 >= 1 ? '2x = 8' : '2x + 3 = 11' });

    // The move for each step pops in when the step starts; the line before it stays above, faded.
    const step = t >= B1.s2 ? 2 : t >= B1.s1 ? 1 : 0;
    if (step > 0) termsSvg(live, 'prev', EQ[step - 1], W2, y.prev, { size: P ? 24 : 28, alpha: 0.55 * seg(t, step === 1 ? B1.s1 : B1.s2, 0.3), label: false });
    const labels = ['Get x on its own', 'Take 3 from both sides', 'Halve both sides'];
    liveChip(live, `lab${step}`, labels[step], W2, y.label, { tone: ['plain', 6, 2][step], size: 'big', cls: 'sv-pop' });

    // Progress dots: one per line reached; green once solved.
    const done = t >= ENDS[1];
    for (let i = 0; i < 3; i++) {
      const col = i <= step ? (done ? 'var(--sim-good)' : 'var(--sim-accent)') : 'var(--sim-track)';
      live.shape(`dot${i}`, 'g', { html: cushionCircle(W2 + (i - 1) * 36, y.dots, 10, col, { lift: 3 }) });
    }
    if (done) liveChip(live, 'check', 'Check: 2 \u00d7 4 + 3 = 11', W2, y.check, { tone: 'good', size: 'big', cls: 'sv-pop' });
  }

  // -- Beat 2 ----------------------------------------------------------------------------

  distance(st, t, live) {
    const P = st.portrait, W = st.W;
    const road = P ? { x0: 56, x1: W - 56, y: 172 } : { x0: 96, x1: W - 96, y: 170 };
    // Readouts: hours roll like an odometer, distance counts in fixed-width digits.
    const r1 = P ? { cx: W / 2 - 64, nx: W / 2 + 56, y: 58 } : { cx: 74, nx: 172, y: 72 };
    const r2 = P ? { cx: W / 2 - 64, nx: W / 2 + 56, y: 108 } : { cx: W - 196, nx: W - 78, y: 72 };
    const km = countSvg(live, 'km', 0, 180, t, DRIVE, r2.nx, r2.y, { ease: ease.linear, align: 'right', size: 32 });
    liveChip(live, 'tTime', 'time', r1.cx, r1.y - 11, { tone: 5 });
    const hour = Math.min(3, Math.floor(t + 0.5 + 1e-9));
    const rollP = t >= DRIVE ? 1 : (t + 0.5) - Math.floor(t + 0.5);
    const rolling = hour >= 1 && rollP < 1;
    odometerSvg(live, 'hours', String(rolling ? hour - 1 : hour), String(hour), r1.nx, r1.y, rolling ? ease.smooth(rollP * 2) : 1, { size: 32 });
    tabularSvg(live, 'uh', 'h', r1.nx + 6, r1.y, { size: 18, weight: 700, col: MUTED });
    liveChip(live, 'tDist', 'distance', r2.cx, r2.y - 11, { tone: 3 });
    tabularSvg(live, 'ukm', 'km', r2.nx + 6, r2.y, { size: 18, weight: 700, col: MUTED });

    // Road with hour posts; the bus rides the count.
    live.shape('road', 'g', { html: cushionRect(road.x0 - 22, road.y + 34, road.x1 - road.x0 + 44, 16, 8, 'var(--sim-track)', { lift: 3, gloss: false }) });
    for (let h = 0; h <= 3; h++) {
      const x = road.x0 + (road.x1 - road.x0) * h / 3;
      const reached = km >= h * 60 - 0.01;
      live.shape(`post${h}`, 'g', { html: cushionRect(x - 3.5, road.y + 54, 7, 22, 3.5, reached ? 'var(--sim-accent)' : 'var(--sim-stroke)', { lift: 2, gloss: false }) });
      tabularSvg(live, `pl${h}`, `${h * 60} km`, x, road.y + 96, { size: 15, weight: 700, align: 'center', col: reached ? LABEL : MUTED });
    }
    const bus = live.shape('bus', 'g', { html: BUS });
    live.attrs(bus, { transform: `translate(${(road.x0 + (road.x1 - road.x0) * km / 180).toFixed(2)} ${road.y})${P ? ' scale(0.8)' : ''}` });

    // The rule, with the key word popped and marked.
    if (t < KW.lead) return;
    const lead = Math.min(1, (t - KW.lead) / 0.25);
    const size = P ? 28 : 30, y = P ? 394 : 352;
    const kp = keywordPop(t, KW.tIn, KW.tHit);
    const hp = Math.max(0, Math.min(1, (t - KW.tHit) / 0.3));
    const kw = live.measure('distance', { size }).w;
    let kx, ky = y;
    if (P) {
      termsSvg(live, 'rule', ['60 \u00d7 3 = 180 km'], W / 2, y - 48, { size, alpha: lead, label: '60 times 3 = 180 km of distance' });
      const ofW = live.measure('of ', { size }).w, x0 = W / 2 - (ofW + kw * 1.2) / 2;
      termsSvg(live, 'of', ['of '], x0, y, { size, align: 'left', alpha: lead, label: false });
      kx = x0 + ofW;
    } else {
      const lw = live.measure('60 \u00d7 3 = 180 km of ', { size }).w, x0 = W / 2 - (lw + kw * 1.2) / 2;
      termsSvg(live, 'rule', ['60 \u00d7 3 = 180 km of '], x0, y, { size, align: 'left', alpha: lead, label: '60 times 3 = 180 km of distance' });
      kx = x0 + lw;
    }
    highlighterSvg(live, 'hl', kx - 4, kx + kw + 4, ky - size * 0.32, size * 1.05, hp, { scale: kp.scale });
    keywordSvg(live, 'kw', 'distance', kx, ky, kp, { size, col: `color-mix(in oklab, var(--sim-ink-on-gold) ${(hp * 100).toFixed(1)}%, ${ink(3)})` });
  }

  // -- Beat 3 ----------------------------------------------------------------------------

  balance(st, t, live) {
    const P = st.portrait, W2 = st.W / 2;
    const y = { mol: P ? 112 : 112, eq: P ? 262 : 250, tally: P ? 330 : 312, ok: P ? 392 : 366 };
    const u = seg(t, B3.at, B3.len);
    const g1 = grow(t - B3.at - 0.15), g2 = grow(t - B3.at - 0.45);
    // Portrait packs the row tighter and shrinks it a little.
    const X = P ? { h2: -134, plus: -91, o2: -44, arrow: 33, w: 114 } : { h2: -160, plus: -100, o2: -40, arrow: 50, w: 160 };

    // Molecules: reactants left, product right; the second H2 and H2O pop in.
    const mols = live.shape('mols', 'g');
    live.attrs(mols, { transform: `translate(${W2} ${y.mol})${P ? ' scale(0.92)' : ''}` });
    live.shape('ops', 'g', { parent: mols, html: `<text class="mm-op" x="${X.plus}" y="0">+</text><text class="mm-op" x="${X.arrow}" y="0">\u2192</text>` });
    const mol = (key, html, x, yy, s) => {
      const e = live.shape(key, 'g', { parent: mols, html });
      live.attrs(e, { transform: `translate(${x} ${yy.toFixed(2)}) scale(${Math.max(0.001, s).toFixed(3)})` });
    };
    mol('h2a', H2, X.h2, -30 * Math.min(1, g1), 1);
    mol('h2b', H2, X.h2, 30, g1);
    mol('o2', O2, X.o2, 0, 1);
    mol('wa', WATER, X.w, -30 * Math.min(1, g2), 1);
    mol('wb', WATER, X.w, 34, g2);

    // The equation: the 2s fade in; H2, O2 and H2O glide and keep their colours.
    transformTermsSvg(live, 'chem', CHEM[0], CHEM[1], W2, y.eq, u, { size: P ? 38 : 48, label: u >= 1 ? '2 H 2 + O 2 gives 2 H 2 O' : 'H 2 + O 2 gives H 2 O' });

    // Atom counts, left and right of the arrow.
    const after = t >= B3.at + B3.len;
    const tal = (key, label, l, r, x) => liveChip(live, key, `${label}: ${l} and ${r}`, x, y.tally, { tone: l === r ? 'good' : 'bad', size: P ? null : 'big' });
    tal('tH', 'H', after ? 4 : 2, after ? 4 : 2, W2 - (P ? 78 : 110));
    tal('tO', 'O', 2, after ? 2 : 1, W2 + (P ? 78 : 110));
    if (t >= ENDS[3]) liveChip(live, 'ok', 'Balanced!', W2, y.ok, { tone: 'gold', size: 'big', cls: 'sv-pop' });
  }
}
