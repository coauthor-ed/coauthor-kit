/**
 * SvgCameraStageChemistryShowcaseScene - kit/SimCameraSvg.js and kit/SimStageSvg.js doing a chemistry job:
 * water as particles, liquid and gas.
 *   Beat 0: a beaker of water on the bench (contact shadows)
 *   Beat 1: the camera pushes into the water (cameraLive 'to', log zoom x9): particles packed close, jostling
 *           past each other (the near ones are live and settle to rest)
 *   Beat 2: heat it: one particle becomes the steam cloud over a hot plate (stageBridgeSvg, focus-hold)
 *   Beat 3: the camera pushes into the steam: the same particles, now far apart
 * Tap skips a running build; Replay runs it again. Portrait is its own layout.
 */
import { SvgScene, chip, liveChip, fill, shade, glossOf } from 'simulations/base/kit/SimSvg.js';
import { hash2 } from 'simulations/base/kit/SimAnim.js';
import { cameraG, cameraLive, cameraTransform, toScreen } from 'simulations/base/kit/SimCameraSvg.js';
import { stageBridgeSvg, contactShadowSvg, shadowDefs, shadowTone, BRIDGE_D } from 'simulations/base/kit/SimStageSvg.js';

const MAP = [0, 1, 2, 3].map((i) => [{ idx: i, dwellMs: null }]);
const START = 0.3;
const PUSH = 1.2;
const Z1 = 9;
const Z3 = 6;
const PR = 2.4;                                  // particle radius, world px
const JIGGLE = 2.6;                              // seconds the near particles jostle, then rest
const BR_AT = 0.35;
const CAP_AT = BR_AT + 2 * BRIDGE_D + 0.05;
const TITLES = ['A beaker of water', 'Zoom into the liquid', 'Heat it: it boils', 'Zoom into the steam'];
const CAPTIONS = ['What is water made of?', 'Liquid: close, sliding past', 'The liquid turns to a gas', 'Gas: the same particles, far apart'];
const WATER = 'var(--sim-water)';
const GLASS = 'var(--sim-glass)';
const STEAM = 'color-mix(in oklab, var(--sim-glass) 45%, var(--sim-bg-surface))';
const f1 = (v) => v.toFixed(1);
const f2 = (v) => v.toFixed(2);

// -- Layout ---------------------------------------------------------------------------

function geo(st) {
  const W = st.W, H = st.H, P = st.portrait;
  const top = H - (P ? 104 : 96);
  const bw = P ? 150 : 170, bh = P ? 180 : 196;
  const beaker = { x: W / 2 - bw / 2, y: top - bh, w: bw, h: bh };
  const wt = top - 10 - (bh - 14) * 0.62;
  const water = { x: beaker.x + 9, y: wt, w: bw - 18, h: top - 10 - wt };
  // Liquid particles: a jittered hex packing (spacing just over one diameter).
  const parts = [];
  const sp = PR * 2.3;
  for (let r = 0, y = water.y + PR + 1; y < water.y + water.h - PR; r++, y += sp * 0.87) {
    for (let x = water.x + PR + 1 + (r % 2 ? sp / 2 : 0); x < water.x + water.w - PR; x += sp) {
      const i = parts.length;
      parts.push({ x: x + (hash2(i, 1) - 0.5) * 0.8, y: y + (hash2(i, 2) - 0.5) * 0.8, i });
    }
  }
  const fc = [water.x + water.w * 0.5, water.y + water.h * 0.45];
  let focus = parts[0];
  for (const p of parts) if (Math.hypot(p.x - fc[0], p.y - fc[1]) < Math.hypot(focus.x - fc[0], focus.y - fc[1])) focus = p;
  // Beat 2-3 picture: a hot plate, a smaller beaker on it, the cloud above.
  const plate = { x: W / 2 - (P ? 100 : 120), y: top - 28, w: P ? 200 : 240, h: 28 };
  const s = 0.62, sb = { x: W / 2 - (bw * s) / 2, y: plate.y - bh * s, w: bw * s, h: bh * s };
  const cloud = { x: W / 2, y: P ? 92 : 86, r: P ? 52 : 58 };
  const gas = [];
  for (let i = 0; i < 16; i++) {
    const a = hash2(i, 31) * Math.PI * 2, q = Math.sqrt(0.08 + 0.8 * hash2(i, 32));
    gas.push({ x: cloud.x + Math.cos(a) * cloud.r * 1.25 * q, y: cloud.y + Math.sin(a) * cloud.r * 0.55 * q, a: hash2(i, 33) * Math.PI * 2 });
  }
  return { W, H, P, top, beaker, water, parts, focus, plate, sb, cloud, gas, capY: H - 34, centre: [W / 2, H / 2] };
}

// -- Markup -------------------------------------------------------------------------------

const cardBg = (g) => `<rect x="2" y="2" width="${g.W - 4}" height="${g.H - 14}" rx="24" ${fill('var(--sim-bg-surface)', 'stroke:var(--sim-stroke);stroke-width:2')}/>`;

function bench(g) {
  const wood = 'color-mix(in oklab, var(--sim-gold) 52%, var(--sim-bg-surface))', x0 = 18, w = g.W - 36;
  return `<rect x="${x0}" y="${g.top + 6}" width="${w}" height="30" rx="10" ${fill(shade(wood, 70))}/>`
    + `<rect x="${x0}" y="${g.top}" width="${w}" height="22" rx="10" ${fill(wood)}/>`
    + `<rect x="${x0 + 14}" y="${g.top + 3}" width="${w - 28}" height="4" rx="2" ${fill(glossOf(wood, 70))}/>`;
}

/** A water particle: a cushioned ball (shade under, gloss spot). */
const particle = (x, y, r = PR) => `<circle cx="${f2(x)}" cy="${f2(y + r * 0.18)}" r="${r}" ${fill(shade(WATER, 70))}/>`
  + `<circle cx="${f2(x)}" cy="${f2(y)}" r="${r}" ${fill(WATER)}/>`
  + `<circle cx="${f2(x - r * 0.32)}" cy="${f2(y - r * 0.34)}" r="${f2(r * 0.3)}" ${fill(glossOf(WATER, 40), 'opacity:0.8')}/>`;

/** The beaker at b; level 0..1; particles drawn into the water unless skip(p) says the live layer has them. */
function beakerSvg(g, b, o = {}) {
  const s = b.w / g.beaker.w, wt = b.y + b.h - 10 * s - (b.h - 14 * s) * (o.level ?? 0.62);
  const edge = `color-mix(in oklab, ${GLASS} 80%, var(--sim-label))`;
  let out = `<rect x="${f1(b.x)}" y="${f1(b.y)}" width="${f1(b.w)}" height="${f1(b.h)}" rx="${14 * s}" ${fill(`color-mix(in oklab, ${GLASS} 18%, transparent)`)}/>`
    + `<rect x="${f1(b.x + 9 * s)}" y="${f1(wt)}" width="${f1(b.w - 18 * s)}" height="${f1(b.y + b.h - 10 * s - wt)}" rx="${9 * s}" ${fill(`color-mix(in oklab, ${WATER} 30%, var(--sim-bg-surface))`)}/>`;
  if (o.parts) for (const p of g.parts) if (!o.skip || !o.skip(p)) out += particle(p.x, p.y);
  out += `<rect x="${f1(b.x + 9 * s)}" y="${f1(wt)}" width="${f1(b.w - 18 * s)}" height="${f1(5 * s)}" rx="${2.5 * s}" ${fill(glossOf(WATER, 50), 'opacity:0.8')}/>`;
  for (let i = 1; i <= 3; i++) {
    const ty = b.y + b.h - 10 * s - i * 0.22 * b.h;
    out += `<path d="M${f1(b.x + b.w - 6 * s)} ${f1(ty)}H${f1(b.x + b.w - 24 * s)}" ${fill('none', `stroke:${edge};stroke-width:${2.5 * s};stroke-linecap:round`)}/>`;
  }
  out += `<rect x="${f1(b.x)}" y="${f1(b.y)}" width="${f1(b.w)}" height="${f1(b.h)}" rx="${14 * s}" ${fill('none', `stroke:${edge};stroke-width:${4 * s}`)}/>`
    + `<rect x="${f1(b.x - 6 * s)}" y="${f1(b.y - 4 * s)}" width="${f1(b.w + 12 * s)}" height="${f1(10 * s)}" rx="${5 * s}" ${fill(edge)}/>`;
  return out;
}

function cloudPts(cx, cy, r, count = 96) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const th = -Math.PI + (i / count) * 2 * Math.PI, k = r * (1 + 0.14 * Math.abs(Math.cos(3 * th)) - 0.07);
    out.push([cx + Math.cos(th) * k * 1.5, cy + Math.sin(th) * k * 0.72]);
  }
  return out;
}
const ptsD = (P) => 'M' + P.map(([x, y]) => `${f1(x)} ${f1(y)}`).join('L') + 'Z';
const circlePts = (cx, cy, r, n = 96) => Array.from({ length: n }, (_, i) => { const a = -Math.PI + (i / n) * 2 * Math.PI; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; });

/** Beats 2-3: the hot plate, the boiling beaker and the steam cloud with its far-apart particles. */
function steamSvg(g) {
  const pl = g.plate, c = g.cloud, P = cloudPts(c.x, c.y, c.r);
  const body = 'color-mix(in oklab, var(--sim-stroke) 75%, var(--sim-label))';
  let s = bench(g) + contactShadowSvg(pl.x + pl.w / 2, g.top, pl.w)
    + `<rect x="${pl.x}" y="${pl.y + 5}" width="${pl.w}" height="${pl.h - 5}" rx="8" ${fill(shade(body, 60))}/>`
    + `<rect x="${pl.x}" y="${pl.y}" width="${pl.w}" height="${pl.h - 6}" rx="8" ${fill(body)}/>`
    + `<rect x="${pl.x + 18}" y="${pl.y + 6}" width="${pl.w - 36}" height="6" rx="3" ${fill('var(--sim-flame)')}/>`
    + beakerSvg(g, g.sb, { level: 0.42 });
  // Wisps rising into the cloud.
  for (const dx of [-26, 0, 26]) {
    let d = '';
    for (let i = 0; i <= 16; i++) {
      const u = i / 16, y = g.sb.y - 8 + (c.y + c.r * 0.6 - (g.sb.y - 8)) * u, x = c.x + dx * (1 + u * 0.4) + Math.sin(u * 4.7 + (dx > 0 ? 1 : 0)) * 5;
      d += (i ? 'L' : 'M') + f1(x) + ' ' + f1(y);
    }
    s += `<path d="${d}" ${fill('none', `stroke:${STEAM};stroke-width:4;stroke-linecap:round`)}/>`;
  }
  s += `<path d="${ptsD(P)}" transform="translate(0 6)" ${fill(shade(STEAM, 80))}/><path d="${ptsD(P)}" ${fill(STEAM)}/>`;
  // Gas particles with short speed streaks behind them.
  for (const q of g.gas) {
    const ex = -Math.cos(q.a) * 6, ey = -Math.sin(q.a) * 6;
    s += [0.5, 0.75].map((k, j) => `<path d="M${f2(q.x + ex * k)} ${f2(q.y + ey * k)}L${f2(q.x + ex * (k + 0.35))} ${f2(q.y + ey * (k + 0.35))}" ${fill('none', `stroke:color-mix(in oklab, ${WATER} ${50 - j * 20}%, transparent);stroke-width:${1.1 - j * 0.3};stroke-linecap:round`)}/>`).join('') + particle(q.x, q.y);
  }
  return s;
}

const liquidWorld = (g, skip) => bench(g) + contactShadowSvg(g.W / 2, g.top, g.beaker.w) + beakerSvg(g, g.beaker, { parts: true, skip });

// -- Scene ------------------------------------------------------------------------------

export class SvgCameraStageChemistryShowcaseScene extends SvgScene {
  static BEAT_STEP_MAP = MAP;
  static ARIA_LABEL = 'Water as particles: a beaker of water; a zoom into the liquid shows particles packed close and jostling; heating turns one particle into a cloud of steam over a hot plate; a zoom into the steam shows the same particles far apart.';
  static CONTROLS = [{ type: 'button', id: 'replay', label: 'Replay' }];

  stageHeight(st) { return st.portrait ? 460 : 430; }

  enter(step) { this.play([0.1, START + PUSH + JIGGLE, CAP_AT + 0.4, START + PUSH + 0.5][step]); }

  onControlChange(id) {
    if (id === 'replay') { this.clockReset(); this.enter(this.stepIndex); }
    this.requestUiUpdate?.();
  }

  pointerDown() { this.skip(); return false; }

  paint(st) {
    shadowTone(this.root);
    const w = st.W - 4, h = st.H - 14;
    const card = shadowDefs() + `<defs><clipPath id="chem-frame"><rect x="2" y="2" width="${w}" height="${h}" rx="24"/></clipPath></defs>`
      + `<rect x="2" y="9" width="${w}" height="${h}" rx="24" ${fill('color-mix(in oklab, var(--sim-stroke) 70%, var(--sim-bg-deep))')}/>`
      + `<rect x="2" y="2" width="${w}" height="${h}" rx="24" ${fill('var(--sim-bg-surface)', 'stroke:var(--sim-stroke);stroke-width:2')}/>`;
    return { svg: card, head: chip(TITLES[this.stepIndex], 0, 0, { tone: 'plain', size: 'big', static: true }) };
  }

  /** The particles near the focus are live (they jostle); the rest are painted into the world. */
  near(g) { return (p) => Math.hypot(p.x - g.focus.x, p.y - g.focus.y) < 34; }

  animate(st, t) {
    const live = this.live, g = geo(st), step = this.stepIndex;
    if (step === 2) return this.bridgeBeat(live, g, t);
    const base = { x: g.centre[0], y: g.centre[1], z: 1 };
    const target = step === 3 ? { x: g.cloud.x, y: g.cloud.y, z: Z3 } : { x: g.focus.x, y: g.focus.y, z: Z1 };
    const ev = step === 0 ? [] : [{ at: START, kind: 'to', ...target, dur: PUSH }];
    const { cam, moving } = cameraLive(live, base, ev, g.centre);
    const frame = live.shape('frame', 'svg');
    live.attrs(frame, { x: 2, y: 2, width: st.W - 4, height: st.H - 14, viewBox: `2 2 ${st.W - 4} ${st.H - 14}`, 'clip-path': 'url(#chem-frame)' });
    const near = this.near(g);
    const world = step === 3 ? steamSvg(g) : liquidWorld(g, near);
    cameraG(live, `world${step === 3 ? 'G' : 'L'}`, cam, { html: world, centre: g.centre, parent: frame });
    if (step <= 1) {
      // Jostle: each near particle wobbles round its place, the wobble dying away so the scene rests.
      const k = step === 1 && !live.skipping ? Math.max(0, 1 - (t - START) / (PUSH + JIGGLE)) : 0;
      const gp = cameraG(live, 'jostle', cam, { centre: g.centre, parent: frame });
      for (const p of g.parts) {
        if (!near(p)) continue;
        const ph = p.i * 1.7, dx = Math.sin(t * 7 + ph) * 0.6 * k, dy = Math.cos(t * 5.3 + ph * 1.3) * 0.6 * k;
        const e = live.shape(`p${p.i}`, 'g', { parent: gp, html: particle(0, 0) });
        live.attrs(e, { transform: `translate(${f2(p.x + dx)} ${f2(p.y + dy)})` });
      }
      if (k > 0) live.more();
    }
    liveChip(live, 'zoom', `zoom x${cam.z.toFixed(1)}`, st.W - 16, 28, { tone: 'accent', align: 'right', size: 'sm' });
    const settled = !moving && t > START + PUSH;
    if (step === 1 && settled) {
      const [fx, fy] = toScreen(cam, g.focus.x, g.focus.y, g.centre);
      liveChip(live, 'one', 'one particle', fx, fy - PR * cam.z - 24, { tone: 'plain', size: 'sm', cls: 'sv-pop' });
    }
    if (step === 0 || settled) liveChip(live, 'cap', CAPTIONS[step], g.W / 2, g.capY, { tone: 'accent', cls: 'sv-pop', size: g.P ? 'sm' : null });
  }

  /** Beat 2: one zoomed-in particle becomes the steam cloud. */
  bridgeBeat(live, g, t) {
    const key = `${g.W}x${g.H}`;
    if (this.brKey !== key) {
      const close = { x: g.focus.x, y: g.focus.y, z: Z1 };
      const zoomed = cardBg(g) + `<g transform="${cameraTransform(close, g.centre)}">${liquidWorld(g)}</g>`;
      const [fx, fy] = toScreen(close, g.focus.x, g.focus.y, g.centre);
      const c = g.cloud;
      const A = { P: circlePts(fx, fy, PR * Z1 + 2), col: WATER, svg: zoomed };
      const B = { P: cloudPts(c.x, c.y, c.r), col: STEAM, svg: cardBg(g) + steamSvg(g) };
      this.br = stageBridgeSvg(A, B, { w: g.W, h: g.H, paper: 'var(--sim-bg-surface)', box: { x: 2, y: 2, w: g.W - 4, h: g.H - 14, r: 24 } });
      this.brKey = key;
    }
    this.br.draw(live, 'br', t - BR_AT);
    if (t >= CAP_AT) liveChip(live, 'cap', CAPTIONS[2], g.W / 2, g.capY, { tone: 'accent', cls: 'sv-pop', size: g.P ? 'sm' : null });
  }
}
