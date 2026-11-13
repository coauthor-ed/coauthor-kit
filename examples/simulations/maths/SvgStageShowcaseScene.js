/**
 * SvgStageShowcaseScene - reference for kit/SimStageSvg.js (stage bridges + contact shadows) on the SvgScene
 * clock: one set, A = the even numbers below 10, shown three ways.
 *   Beat 0: the set's ring drops onto the bench; its contact shadow grows as it lands (contactShadowLive lift)
 *   Beat 1: the ring becomes its member list, a roster card (stageBridgeSvg: shrink, morph, grow)
 *   Beat 2: the list becomes a rule tag (focus-hold: the tag opens where the card stood)
 *   Beat 3: the tag joins a row of all three views; arrows name how you get from one to the next
 * Every beat bridges from the same picture whichever beat came before. Tap skips a running build;
 * Replay runs it again. Portrait is its own layout (the row of beat 3 becomes a column).
 */
import { SvgScene, chip, liveChip, fill, shade, glossOf, tone, cushionCircle } from 'simulations/base/kit/SimSvg.js';
import { spring, springDuration, pop, lagged, laggedTotal } from 'simulations/base/kit/SimAnim.js';
import { circlePts } from 'simulations/base/kit/SimMorphSpec.js';
import {
  stageBridgeSvg, contactShadowSvg, contactShadowLive, shadowDefs, shadowTone, BRIDGE_D,
} from 'simulations/base/kit/SimStageSvg.js';

const MAP = [0, 1, 2, 3].map((i) => [{ idx: i, dwellMs: null }]);
const BR_AT = 0.35;
const CAP_AT = BR_AT + 2 * BRIDGE_D + 0.05;
const DROP = springDuration('playful');
const ARROWS = { dur: 0.35, lag: 0.14 };
const ENDS = [DROP + 0.4, CAP_AT + 0.5, CAP_AT + 0.5, CAP_AT + laggedTotal(2, ARROWS) + 0.5];
const TITLES = ['A set is a collection', 'List the members', 'Or give the rule', 'One set, three ways'];
const CAPTIONS = ['A holds 2, 4, 6 and 8', 'Roster form: list every member', 'Rule form: say what gets in', 'Same set, every time'];
const MEMBERS = [[2, 1], [4, 3], [6, 5], [8, 6]];   // value, series tone
const RING = 'var(--sim-accent)';
const CARD = tone(1);
const TAG = tone(5);
const f1 = (v) => v.toFixed(1);

// -- Outlines (stage px) ----------------------------------------------------------------

/** Superellipse box: star-shaped, so it resamples cleanly by angle. */
function boxPts(cx, cy, a, b, n = 6, count = 96) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const th = -Math.PI + (i / count) * 2 * Math.PI, cs = Math.cos(th), sn = Math.sin(th);
    out.push([cx + a * Math.sign(cs) * Math.pow(Math.abs(cs), 2 / n), cy + b * Math.sign(sn) * Math.pow(Math.abs(sn), 2 / n)]);
  }
  return out;
}

/** A luggage tag: a box whose left end comes to a blunt point. */
function tagPts(cx, cy, a, b, count = 96) {
  return boxPts(cx, cy, a, b, 6, count).map(([x, y]) => {
    const u = (cx - x) / a;   // 1 at the left end
    if (u <= 0.55) return [x, y];
    const k = (u - 0.55) / 0.45, squeeze = 1 - 0.62 * k;
    return [x - a * 0.12 * k, cy + (y - cy) * squeeze];
  });
}

// -- Layout -------------------------------------------------------------------------------

function geo(st) {
  const W = st.W, H = st.H, P = st.portrait;
  const top = H - (P ? 110 : 96);
  const ringR = Math.min(P ? 120 : 128, (W - 60) / 2);
  const card = { w: Math.min(W - 40, 470), h: P ? 170 : 160 };
  const tag = { w: Math.min(W - (P ? 64 : 36), 500), h: P ? 150 : 160 };
  return { W, H, P, top, cx: W / 2, ringR, card, tag, capY: H - 34 };
}

// -- Markup ---------------------------------------------------------------------------

function cardBg(g) {
  return `<rect x="2" y="2" width="${g.W - 4}" height="${g.H - 14}" rx="24" ${fill('var(--sim-bg-surface)', 'stroke:var(--sim-stroke);stroke-width:2')}/>`;
}

function bench(g, x0 = 18, x1 = g.W - 18, y = g.top) {
  const wood = 'color-mix(in oklab, var(--sim-gold) 52%, var(--sim-bg-surface))';
  return `<rect x="${x0}" y="${y + 6}" width="${x1 - x0}" height="30" rx="10" ${fill(shade(wood, 70))}/>`
    + `<rect x="${x0}" y="${y}" width="${x1 - x0}" height="22" rx="10" ${fill(wood)}/>`
    + `<rect x="${x0 + 14}" y="${y + 3}" width="${x1 - x0 - 28}" height="4" rx="2" ${fill(glossOf(wood, 70))}/>`;
}

function txt(x, y, s, size, col, extra = '') {
  return `<text x="${f1(x)}" y="${f1(y)}" style="fill:${col};font-size:${size}px;text-anchor:middle;dominant-baseline:central${extra ? ';' + extra : ''}">${s}</text>`;
}

/** The set ring standing on y = base: a thick cushioned hoop, members as balls, a name tab. */
function ringSvg(cx, base, R, o = {}) {
  const cy = base - R - 7, ball = o.ball ?? Math.max(16, R * 0.2), off = R * 0.36;
  let s = `<circle cx="${cx}" cy="${cy + 5}" r="${R}" ${fill('none', `stroke:${shade(RING)};stroke-width:14`)}/>`
    + `<circle cx="${cx}" cy="${cy}" r="${R}" ${fill(`color-mix(in oklab, ${RING} 12%, var(--sim-bg-surface))`, `stroke:${RING};stroke-width:14`)}/>`
    + `<path d="M${f1(cx - R * 0.62)} ${f1(cy - R * 0.62)}A${R} ${R} 0 0 1 ${f1(cx + R * 0.1)} ${f1(cy - R + 0.5)}" ${fill('none', `stroke:${glossOf(RING, 50)};stroke-width:4;stroke-linecap:round;opacity:0.8`)}/>`;
  MEMBERS.forEach(([v, n], i) => {
    const x = cx + (i % 2 ? off : -off), y = cy + (i < 2 ? -off : off) + 4;
    s += cushionCircle(x, y, ball, tone(n)) + txt(x, y + 1, v, Math.round(ball * 1.05), `var(--sim-ink-on-${n})`);
  });
  if (o.tab !== false) {
    const tw = 44, ty = cy - R - 26;
    s += `<rect x="${cx - tw / 2}" y="${ty + 4}" width="${tw}" height="34" rx="17" ${fill(shade(RING))}/>`
      + `<rect x="${cx - tw / 2}" y="${ty}" width="${tw}" height="34" rx="17" ${fill(RING)}/>` + txt(cx, ty + 17, 'A', 20, 'var(--sim-ink-on-accent)');
  }
  return s;
}

/** The roster card standing on y = base. */
function rosterSvg(cx, base, w, h, size, o = {}) {
  const x = cx - w / 2, y = base - h - 6;
  let s = `<rect x="${f1(x)}" y="${f1(y + 6)}" width="${f1(w)}" height="${f1(h)}" rx="22" ${fill(shade(CARD))}/>`
    + `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" rx="22" ${fill(`color-mix(in oklab, ${CARD} 16%, var(--sim-bg-surface))`, `stroke:${CARD};stroke-width:4`)}/>`
    + `<rect x="${f1(x + 18)}" y="${f1(y + 8)}" width="${f1(w - 36)}" height="5" rx="2.5" ${fill(glossOf(CARD, 60), 'opacity:0.7')}/>`;
  // A = { 2, 4, 6, 8 }: one text run (tspans), members in their tones, the braces in label ink.
  size = Math.min(size, (w - 44) / ((o.name === false ? 14 : 18) * 0.62));   // fits a wide font too
  const runs = MEMBERS.map(([v, n], i) => `<tspan style="fill:var(--sim-series-${n}-ink)">${i ? ' ' : ''}${v}</tspan>${i < 3 ? '<tspan style="fill:var(--sim-label-muted)">,</tspan>' : ''}`).join('');
  s += `<text x="${f1(cx)}" y="${f1(y + h / 2 + 2)}" style="fill:var(--sim-label);font-size:${size}px;text-anchor:middle;dominant-baseline:central;white-space:pre">${o.name === false ? '' : 'A = '}{ ${runs} }</text>`;
  return s;
}

/** The rule tag standing on y = base. */
function tagSvg(cx, base, w, h, size, lines) {
  const cy = base - h / 2 - 6, P = tagPts(cx, cy, w / 2, h / 2, 64);
  const d = (dy) => 'M' + P.map(([x, y]) => `${f1(x)} ${f1(y + dy)}`).join('L') + 'Z';
  const hx = cx - w / 2 + w * 0.09;
  let s = `<path d="${d(6)}" ${fill(shade(TAG))}/>`
    + `<path d="${d(0)}" ${fill(`color-mix(in oklab, ${TAG} 16%, var(--sim-bg-surface))`, `stroke:${TAG};stroke-width:4;stroke-linejoin:round`)}/>`
    + `<circle cx="${f1(hx)}" cy="${f1(cy)}" r="${f1(Math.max(6, h * 0.07))}" ${fill('var(--sim-bg-surface)', `stroke:${TAG};stroke-width:3`)}/>`;
  size = Math.min(size, (w * 0.8) / (Math.max(...lines.map((l) => l.replace(/&lt;/g, '<').length)) * 0.62));
  const x0 = cx + w * 0.06, lh = size * 1.25;
  lines.forEach((ln, i) => { s += txt(x0, cy + (i - (lines.length - 1) / 2) * lh, ln, size, i === 0 ? 'var(--sim-label)' : `var(--sim-series-5-ink)`); });
  return s;
}

const RULE = ['A = { x : x is even,', 'x &lt; 10 }'];
const RULE_SM = ['x is even,', 'x &lt; 10'];

// -- Pictures (each paints the whole card) -------------------------------------------------

function row(g) {
  if (!g.P) {
    const y = g.top;
    return { ring: [g.W * 0.16, y, 70], card: [g.W * 0.5, y, Math.min(190, g.W * 0.29), 84], tag: [g.W * 0.83, y, Math.min(190, g.W * 0.29), 96], floors: [y] };
  }
  const ys = [g.H * 0.3, g.H * 0.55, g.top], x = g.W * 0.4;
  return { ring: [x, ys[0], 48], card: [x, ys[1], Math.min(200, g.W - 120), 70], tag: [x + 6, ys[2], Math.min(214, g.W - 110), 80], floors: ys };
}

function pictures(g) {
  const base = (t) => cardBg(g) + bench(g) + (t ?? '');
  const ringCy = g.top - g.ringR - 7;
  const rw = g.card, tw = g.tag, R = row(g);
  const ring = { P: circlePts(g.cx, ringCy, g.ringR + 7, 96), col: RING, svg: base(contactShadowSvg(g.cx, g.top, g.ringR * 1.7) + ringSvg(g.cx, g.top, g.ringR)) };
  const card = {
    P: boxPts(g.cx, g.top - rw.h / 2 - 6, rw.w / 2, rw.h / 2), col: CARD,
    svg: base(contactShadowSvg(g.cx, g.top, rw.w) + rosterSvg(g.cx, g.top, rw.w, rw.h, g.P ? 30 : 44)),
  };
  const tag = {
    P: tagPts(g.cx, g.top - tw.h / 2 - 6, tw.w / 2, tw.h / 2), col: TAG,
    svg: base(contactShadowSvg(g.cx, g.top, tw.w) + tagSvg(g.cx, g.top, tw.w, tw.h, g.P ? 21 : 31, RULE)),
  };
  // Beat 3: the three views side by side (a column in portrait, one shelf each).
  let all = cardBg(g);
  if (g.P) for (const y of R.floors) all += bench(g, 24, g.W - 96, y);
  else all += bench(g);
  const [rx, ry, rr] = R.ring, [kx, ky, kw, kh] = R.card, [tx, ty, tww, th] = R.tag;
  all += contactShadowSvg(rx, ry, rr * 1.7) + ringSvg(rx, ry, rr, { ball: 15, tab: false })
    + contactShadowSvg(kx, ky, kw) + rosterSvg(kx, ky, kw, kh, 22, { name: false })
    + contactShadowSvg(tx, ty, tww) + tagSvg(tx, ty, tww, th, 17, RULE_SM);
  const row3 = { P: tagPts(tx, ty - th / 2 - 6, tww / 2, th / 2), col: TAG, svg: all };
  return [ring, card, tag, row3];
}

// -- Scene ------------------------------------------------------------------------------

export class SvgStageShowcaseScene extends SvgScene {
  static BEAT_STEP_MAP = MAP;
  static ARIA_LABEL = 'One set, A, the even numbers below 10, shown three ways: a ring holding 2, 4, 6 and 8 drops onto a bench; the ring turns into a card listing A = {2, 4, 6, 8}; the card turns into a tag with the rule x is even and x is less than 10; then all three stand side by side.';
  static CONTROLS = [{ type: 'button', id: 'replay', label: 'Replay' }];

  stageHeight(st) { return st.portrait ? 480 : 430; }

  enter(step) { this.play(ENDS[step]); }

  onControlChange(id) {
    if (id === 'replay') { this.clockReset(); this.enter(this.stepIndex); }
    this.requestUiUpdate?.();
  }

  pointerDown() { this.skip(); return false; }

  paint(st) {
    shadowTone(this.root);
    const w = st.W - 4, h = st.H - 14, title = TITLES[this.stepIndex];
    const lip = `<rect x="2" y="9" width="${w}" height="${h}" rx="24" ${fill('color-mix(in oklab, var(--sim-stroke) 70%, var(--sim-bg-deep))')}/>`;
    return { svg: shadowDefs() + lip + `<rect x="2" y="2" width="${w}" height="${h}" rx="24" ${fill('var(--sim-bg-surface)')}/>`, head: chip(title, 0, 0, { tone: 'plain', size: 'big', static: true }) };
  }

  /** The bridge into this beat, built once per beat and stage size. */
  bridge(g, step) {
    const key = `${step}|${g.W}x${g.H}`;
    if (this.brKey !== key) {
      const pics = pictures(g);
      this.br = stageBridgeSvg(pics[step - 1], pics[step], { w: g.W, h: g.H, paper: 'var(--sim-bg-surface)', box: { x: 2, y: 2, w: g.W - 4, h: g.H - 14, r: 24 } });
      this.brKey = key;
    }
    return this.br;
  }

  animate(st, t) {
    const live = this.live, g = geo(st), step = this.stepIndex;
    if (step === 0) {
      // The ring drops onto the bench: its shadow sharpens and darkens as it comes down.
      const p = spring(t - 0.15, 'playful'), lift = Math.max(0, Math.min(1, 1 - p));
      const pic = live.shape('drop', 'g');
      live.shape('drop|bg', 'g', { parent: pic, html: cardBg(g) + bench(g) });
      contactShadowLive(live, 'drop|sh', g.cx, g.top, g.ringR * 1.7, { lift, parent: pic });
      const ring = live.shape('drop|ring', 'g', { parent: pic, html: ringSvg(g.cx, g.top, g.ringR) });
      const sq = p > 1 ? 1 + (p - 1) * 0.5 : 1;
      live.attrs(ring, { transform: `translate(${f1(g.cx)} ${f1(g.top)}) scale(${(sq).toFixed(3)} ${(1 / sq).toFixed(3)}) translate(${f1(-g.cx)} ${f1(-g.top + (1 - p) * 220)})` });
      if (t > DROP * 0.55) liveChip(live, 'cap', CAPTIONS[0], g.cx, g.capY, { tone: 'accent', cls: 'sv-pop' });
      return;
    }
    this.bridge(g, step).draw(live, 'br', t - BR_AT);
    if (step === 3) this.arrows(live, g, t - CAP_AT);
    if (t >= CAP_AT) liveChip(live, 'cap', CAPTIONS[step], g.cx, g.capY, { tone: 'accent', cls: 'sv-pop' });
  }

  /** Beat 3: "list it" and "describe it" arrows grow between the views, their chips pop in. */
  arrows(live, g, t) {
    const R = row(g);
    const [rx, ry, rr] = R.ring, [kx, ky, kw, kh] = R.card, [tx, ty, tww, th] = R.tag;
    const list = g.P
      ? [{ a: [rx + rr + 14, ry - rr - 10], b: [kx + kw / 2 - 6, ky - kh - 16], label: 'list it', tone: 1, side: 1 },
        { a: [kx + kw / 2 + 8, ky - kh / 2], b: [tx + tww / 2 - 4, ty - th - 16], label: 'describe it', tone: 5, side: 1 }]
      : [{ a: [rx + rr * 0.8, ry - rr * 1.85], b: [kx - kw * 0.22, ky - kh - 16], label: 'list it', tone: 1, side: -1 },
        { a: [kx + kw * 0.22, ky - kh - 16], b: [tx - tww * 0.05, ty - th - 16], label: 'describe it', tone: 5, side: -1 }];
    list.forEach((a, i) => {
      const u = lagged(t, i, 2, ARROWS);
      if (u <= 0) return;
      const mx = (a.a[0] + a.b[0]) / 2 + (g.P ? 40 : 0), my = g.P ? (a.a[1] + a.b[1]) / 2 : Math.min(a.a[1], a.b[1]) - 96;
      const pt = (s) => {
        const q = 1 - s;
        return [q * q * a.a[0] + 2 * q * s * mx + s * s * a.b[0], q * q * a.a[1] + 2 * q * s * my + s * s * a.b[1]];
      };
      let d = '';
      for (let k = 0; k <= 20; k++) { const p = pt((k / 20) * u); d += (k ? 'L' : 'M') + f1(p[0]) + ' ' + f1(p[1]); }
      const col = tone(a.tone);
      const e = live.shape(`ar${i}`, 'path');
      live.attrs(e, { d });
      live.css(e, { fill: 'none', stroke: col, 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
      const p1 = pt(u), p0 = pt(Math.max(0, u - 0.06)), ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
      const hd = live.shape(`ah${i}`, 'path');
      live.attrs(hd, { d: 'M12 0L-6 -9L-6 9Z', transform: `translate(${f1(p1[0])} ${f1(p1[1])}) rotate(${(ang * 180 / Math.PI).toFixed(1)})` });
      live.css(hd, { fill: col, stroke: col, 'stroke-width': 2, 'stroke-linejoin': 'round' });
      const pp = pop(t - i * ARROWS.lag - 0.1);
      const top = pt(0.5);
      if (pp) liveChip(live, `al${i}`, a.label, g.P ? g.W - 14 : top[0], g.P ? top[1] - 20 : top[1] - 22, { tone: a.tone, size: 'sm', align: g.P ? 'right' : null, alpha: pp.alpha, scale: pp.scale });
    });
  }
}
