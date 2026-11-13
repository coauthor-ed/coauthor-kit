/**
 * SvgCameraStagePhysicsShowcaseScene - kit/SimCameraSvg.js and kit/SimStageSvg.js doing a physics job:
 * why stroking an iron nail with a magnet makes it a magnet (magnetic domains).
 *   Beat 0: an iron nail and a bar magnet on the bench (contact shadows)
 *   Beat 1: the camera pushes into the nail (cameraLive 'to', log zoom x8): domains, arrows every which way
 *   Beat 2: the magnet sweeps past overhead; the domains turn one by one until they all point the same way
 *   Beat 3: the lined-up domain becomes the whole nail (stageBridgeSvg): now a magnet, it holds paper clips
 * The world is painted once (cameraG html); the domain arrows are live, so they can turn. Tap skips a running
 * build; Replay runs it again. Portrait is its own layout.
 */
import { SvgScene, chip, liveChip, fill, shade, glossOf, tone } from 'simulations/base/kit/SimSvg.js';
import { hash2, lagged, laggedTotal } from 'simulations/base/kit/SimAnim.js';
import { cameraG, cameraLive, cameraTransform, toScreen } from 'simulations/base/kit/SimCameraSvg.js';
import { stageBridgeSvg, contactShadowSvg, shadowDefs, shadowTone, BRIDGE_D } from 'simulations/base/kit/SimStageSvg.js';

const MAP = [0, 1, 2, 3].map((i) => [{ idx: i, dwellMs: null }]);
const START = 0.3;
const PUSH = 1.2;
const Z = 8;
const HEX = 6;                                   // domain radius, world px
const TURN = { dur: 0.45, lag: 0.012 };
const SWEEP = [0.2, 1.6];
const BR_AT = 0.35;
const CAP_AT = BR_AT + 2 * BRIDGE_D + 0.05;
const TITLES = ['An iron nail and a magnet', 'Zoom into the iron', 'Stroke it with the magnet', 'The nail is now a magnet'];
const CAPTIONS = ['Is the nail a magnet? Not yet.', 'Domains: tiny magnets, all mixed up', 'They swing round to line up', 'Lined-up domains: it picks up clips'];
const N_COL = 'var(--sim-bad)';
const S_COL = tone(1);
const IRON = 'color-mix(in oklab, var(--sim-label-muted) 55%, var(--sim-bg-surface))';
const f1 = (v) => v.toFixed(1);
const f2 = (v) => v.toFixed(2);

// -- Layout ---------------------------------------------------------------------------

function geo(st) {
  const W = st.W, H = st.H, P = st.portrait;
  const top = H - (P ? 112 : 104);
  const magW = P ? 92 : 150, magH = P ? 44 : 60;
  const nh = P ? 48 : 60;
  const nail = { x: 34, y: top - nh, w: W - 34 - magW - (P ? 56 : 90), h: nh };
  const mag = { x: W - 30 - magW, y: top - magH, w: magW, h: magH };
  // Domains: a hex grid filling the nail's shank (the head is solid).
  const doms = [];
  const dx = HEX * Math.sqrt(3), dy = HEX * 1.5;
  for (let r = 0, y = nail.y + 4; y < nail.y + nail.h + HEX; r++, y += dy) {
    for (let x = nail.x + 14 + (r % 2 ? dx / 2 : 0); x < nail.x + nail.w - 8; x += dx) {
      doms.push({ x, y, a: hash2(doms.length, 7) * Math.PI * 2 });
    }
  }
  const cx = nail.x + nail.w * 0.55, cy = nail.y + nail.h / 2;
  let focus = doms[0];
  for (const d of doms) if (Math.hypot(d.x - cx, d.y - cy) < Math.hypot(focus.x - cx, focus.y - cy)) focus = d;
  return { W, H, P, top, nail, mag, doms, focus, capY: H - 34, centre: [W / 2, H / 2] };
}

// -- Markup -------------------------------------------------------------------------------

const cardBg = (g) => `<rect x="2" y="2" width="${g.W - 4}" height="${g.H - 14}" rx="24" ${fill('var(--sim-bg-surface)', 'stroke:var(--sim-stroke);stroke-width:2')}/>`;

function bench(g) {
  const wood = 'color-mix(in oklab, var(--sim-gold) 52%, var(--sim-bg-surface))', x0 = 18, w = g.W - 36;
  return `<rect x="${x0}" y="${g.top + 6}" width="${w}" height="30" rx="10" ${fill(shade(wood, 70))}/>`
    + `<rect x="${x0}" y="${g.top}" width="${w}" height="22" rx="10" ${fill(wood)}/>`
    + `<rect x="${x0 + 14}" y="${g.top + 3}" width="${w - 28}" height="4" rx="2" ${fill(glossOf(wood, 70))}/>`;
}

const txt = (x, y, s, size, col) => `<text x="${f1(x)}" y="${f1(y)}" style="fill:${col};font-size:${size}px;text-anchor:middle;dominant-baseline:central">${s}</text>`;

function hexD(x, y, r) {
  let d = '';
  for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + (k * Math.PI) / 3; d += (k ? 'L' : 'M') + f2(x + r * Math.cos(a)) + ' ' + f2(y + r * Math.sin(a)); }
  return d + 'Z';
}
function hexPts(x, y, r, n = 96) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const th = -Math.PI + (i / n) * 2 * Math.PI, sector = Math.PI / 3;
    const rel = ((th - Math.PI / 6) % sector + sector) % sector - sector / 2;
    const k = (r * Math.cos(Math.PI / 6)) / Math.cos(rel);
    out.push([x + k * Math.cos(th), y + k * Math.sin(th)]);
  }
  return out;
}
function boxPts(cx, cy, a, b, n = 8, count = 96) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const th = -Math.PI + (i / count) * 2 * Math.PI, cs = Math.cos(th), sn = Math.sin(th);
    out.push([cx + a * Math.sign(cs) * Math.pow(Math.abs(cs), 2 / n), cy + b * Math.sign(sn) * Math.pow(Math.abs(sn), 2 / n)]);
  }
  return out;
}

/** The nail: a head on the left, a shank to a point; domains (and their arrows, if given) inside it. */
function nailSvg(g, o = {}) {
  const n = g.nail, y0 = n.y, y1 = n.y + n.h, tip = n.x + n.w + 26;
  const body = `M${n.x} ${y0 + 6}L${n.x + 10} ${y0 + 6}L${n.x + 10} ${y0}L${n.x + n.w} ${y0}L${tip} ${(y0 + y1) / 2}L${n.x + n.w} ${y1}L${n.x + 10} ${y1}L${n.x + 10} ${y1 - 6}L${n.x} ${y1 - 6}Z`;
  let s = `<defs><clipPath id="phy-nail"><path d="${body}"/></clipPath></defs>`
    + `<path d="${body}" transform="translate(0 5)" ${fill(shade(IRON, 70))}/>`
    + `<path d="${body}" ${fill(IRON)}/>`;
  // Domains: faint cells with hairline walls (the clip keeps them in the nail).
  s += '<g clip-path="url(#phy-nail)">';
  g.doms.forEach((d, i) => { s += `<path d="${hexD(d.x, d.y, HEX)}" ${fill(`color-mix(in oklab, ${tone(1 + (i % 3) * 2)} ${o.aligned ? 10 : 16}%, ${IRON})`, `stroke:color-mix(in oklab, var(--sim-label) 35%, ${IRON});stroke-width:0.35`)}/>`; });
  if (o.arrows) g.doms.forEach((d) => { s += arrowSvg(d.x, d.y, o.arrows === 'aligned' ? 0 : d.a); });
  s += '</g>';
  s += `<rect x="${n.x + 16}" y="${y0 + 4}" width="${n.w - 30}" height="4" rx="2" ${fill(glossOf(IRON, 60), 'opacity:0.75')}/>`;
  if (o.poles) {
    s += txt(n.x + 26, (y0 + y1) / 2, 'S', 26, S_COL) + txt(n.x + n.w - 10, (y0 + y1) / 2, 'N', 26, N_COL);
  }
  return s;
}

const ARROW = 'M-3.4 0H2.6M3.6 0L1.4 -1.6M3.6 0L1.4 1.6';
const arrowSvg = (x, y, a) => `<path d="${ARROW}" transform="translate(${f2(x)} ${f2(y)}) rotate(${f1((a * 180) / Math.PI)})" ${fill('none', `stroke:${N_COL};stroke-width:1;stroke-linecap:round`)}/>`;

function magnetSvg(x, y, w, h) {
  const half = w / 2;
  return `<rect x="${x}" y="${y + 5}" width="${w}" height="${h}" rx="10" ${fill(shade(S_COL))}/>`
    + `<rect x="${x}" y="${y}" width="${half}" height="${h}" rx="10" ${fill(S_COL)}/><rect x="${x + half - 10}" y="${y}" width="20" height="${h}" ${fill(S_COL)}/>`
    + `<rect x="${x + half}" y="${y}" width="${half}" height="${h}" rx="10" ${fill(N_COL)}/><rect x="${x + half}" y="${y}" width="10" height="${h}" ${fill(N_COL)}/>`
    + `<rect x="${x + 10}" y="${y + 6}" width="${w - 20}" height="5" rx="2.5" ${fill('color-mix(in oklab, white 40%, transparent)')}/>`
    + txt(x + half / 2, y + h / 2 + 2, 'S', h * 0.5, 'var(--sim-ink-on-1)') + txt(x + half * 1.5, y + h / 2 + 2, 'N', h * 0.5, 'var(--sim-ink-on-bad)');
}

function clipSvg(x, y, s = 1) {
  const d = `M${x} ${y}v${22 * s}a${5 * s} ${5 * s} 0 0 0 ${10 * s} 0v${-18 * s}a${3.5 * s} ${3.5 * s} 0 0 0 ${-7 * s} 0v${14 * s}`;
  return `<path d="${d}" ${fill('none', 'stroke:color-mix(in oklab, var(--sim-label-muted) 80%, var(--sim-label));stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round')}/>`;
}

function benchWorld(g) {
  const n = g.nail, m = g.mag;
  return bench(g) + contactShadowSvg(n.x + n.w / 2, g.top, n.w + 20) + nailSvg(g)
    + contactShadowSvg(m.x + m.w / 2, g.top, m.w) + magnetSvg(m.x, m.y, m.w, m.h);
}

/** Beat 3's bench: the magnet is put away; the nail holds three clips at its N end. */
function magnetisedSvg(g) {
  const n = g.nail, tipX = n.x + n.w + 14;
  return cardBg(g) + bench(g) + contactShadowSvg(n.x + n.w / 2, g.top, n.w + 20)
    + nailSvg(g, { aligned: true, poles: true })
    + clipSvg(tipX - 6, n.y + n.h - 8) + clipSvg(tipX + 6, n.y + n.h - 2, 0.9) + clipSvg(tipX - 18, n.y + n.h - 4, 0.8);
}

// -- Scene ------------------------------------------------------------------------------

export class SvgCameraStagePhysicsShowcaseScene extends SvgScene {
  static BEAT_STEP_MAP = MAP;
  static ARIA_LABEL = 'Magnetising an iron nail: a nail and a bar magnet on a bench; a zoom into the iron shows tiny domains pointing every which way; as the magnet sweeps past they turn to point the same way; the nail is then a magnet holding paper clips.';
  static CONTROLS = [{ type: 'button', id: 'replay', label: 'Replay' }];

  stageHeight(st) { return st.portrait ? 380 : 360; }

  enter(step) {
    const g = this.sv ? geo(this.sv) : null;
    const ends = [0.1, START + PUSH + 0.6, SWEEP[0] + (g ? laggedTotal(g.doms.length, TURN) : 2) + 0.4, CAP_AT + 0.4];
    this.play(ends[step]);
  }

  onControlChange(id) {
    if (id === 'replay') { this.clockReset(); this.enter(this.stepIndex); }
    this.requestUiUpdate?.();
  }

  pointerDown() { this.skip(); return false; }

  paint(st) {
    shadowTone(this.root);
    const w = st.W - 4, h = st.H - 14;
    const card = shadowDefs() + `<defs><clipPath id="phy-frame"><rect x="2" y="2" width="${w}" height="${h}" rx="24"/></clipPath></defs>`
      + `<rect x="2" y="9" width="${w}" height="${h}" rx="24" ${fill('color-mix(in oklab, var(--sim-stroke) 70%, var(--sim-bg-deep))')}/>`
      + `<rect x="2" y="2" width="${w}" height="${h}" rx="24" ${fill('var(--sim-bg-surface)', 'stroke:var(--sim-stroke);stroke-width:2')}/>`;
    return { svg: card, head: chip(TITLES[this.stepIndex], 0, 0, { tone: 'plain', size: 'big', static: true }) };
  }

  animate(st, t) {
    const live = this.live, g = geo(st), step = this.stepIndex;
    const base = { x: g.centre[0], y: g.centre[1], z: 1 };
    const close = { x: g.focus.x, y: g.focus.y, z: Z };
    if (step === 3) return this.bridgeBeat(live, g, close, t);
    const ev = step === 1 ? [{ at: START, kind: 'to', ...close, dur: PUSH }] : [];
    const { cam, moving } = cameraLive(live, step === 2 ? close : base, ev, g.centre);
    const frame = live.shape('frame', 'svg');
    live.attrs(frame, { x: 2, y: 2, width: st.W - 4, height: st.H - 14, viewBox: `2 2 ${st.W - 4} ${st.H - 14}`, 'clip-path': 'url(#phy-frame)' });
    cameraG(live, 'world', cam, { html: benchWorld(g), centre: g.centre, parent: frame });
    // The domain arrows: live, so beat 2 can turn them (lagged across the nail, shortest way round).
    if (step >= 1) {
      const arr = cameraG(live, 'arrows', cam, { centre: g.centre, parent: frame, html: '<g clip-path="url(#phy-nail)"></g>' });
      const host = arr.firstChild;
      g.doms.forEach((d, i) => {
        let a = d.a;
        if (step === 2) {
          const u = lagged(t - SWEEP[0], i, g.doms.length, TURN);
          const to = a > Math.PI ? Math.PI * 2 : 0;
          a += (to - a) * u;
        }
        const e = live.shape(`ar${i}`, 'path', { parent: host });
        live.attrs(e, { d: ARROW, transform: `translate(${f2(d.x)} ${f2(d.y)}) rotate(${f1((a * 180) / Math.PI)})` });
        live.css(e, { fill: 'none', stroke: N_COL, 'stroke-width': 1, 'stroke-linecap': 'round' });
      });
      const [fx, fy] = toScreen(cam, g.focus.x, g.focus.y, g.centre);
      if (!moving && step === 1 && t > START + PUSH) liveChip(live, 'dom', 'one domain', fx, fy - HEX * cam.z - 22, { tone: 'plain', size: 'sm', cls: 'sv-pop' });
    }
    if (step === 2) this.sweep(live, g, t, frame);
    liveChip(live, 'zoom', `zoom x${cam.z.toFixed(1)}`, st.W - 16, 28, { tone: 'accent', align: 'right', size: 'sm' });
    if (step !== 1 || t > START + PUSH) liveChip(live, 'cap', CAPTIONS[step], g.W / 2, g.capY, { tone: 'accent', cls: 'sv-pop', size: g.P ? 'sm' : null });
  }

  /** Beat 2: a screen-size magnet sweeps across the top, N leading. */
  sweep(live, g, t, frame) {
    const u = Math.max(0, Math.min(1, (t - SWEEP[0]) / (SWEEP[1] - SWEEP[0])));
    if (u <= 0 || u >= 1) return;
    const w = g.P ? 96 : 130, h = g.P ? 36 : 44, x = -w + (g.W + w) * u;
    const e = live.shape('sweep', 'g', { html: magnetSvg(0, 0, w, h), parent: frame });   // inside the card's viewport
    live.attrs(e, { transform: `translate(${f1(x)} 50)` });
    live.more();
  }

  /** Beat 3: the zoomed, lined-up picture becomes the whole nail. */
  bridgeBeat(live, g, close, t) {
    const key = `${g.W}x${g.H}`;
    if (this.brKey !== key) {
      const zoomed = cardBg(g) + `<g transform="${cameraTransform(close, g.centre)}">${benchWorld(g)}<g clip-path="url(#phy-nail)">${g.doms.map((d) => arrowSvg(d.x, d.y, 0)).join('')}</g></g>`;
      const [fx, fy] = toScreen(close, g.focus.x, g.focus.y, g.centre);
      const n = g.nail;
      const A = { P: hexPts(fx, fy, HEX * Z), col: IRON, svg: zoomed };
      const B = { P: boxPts(n.x + n.w / 2 + 6, n.y + n.h / 2, n.w / 2 + 14, n.h / 2), col: IRON, svg: magnetisedSvg(g) };
      this.br = stageBridgeSvg(A, B, { w: g.W, h: g.H, paper: 'var(--sim-bg-surface)', box: { x: 2, y: 2, w: g.W - 4, h: g.H - 14, r: 24 } });
      this.brKey = key;
    }
    this.br.draw(live, 'br', t - BR_AT);
    if (t >= CAP_AT) liveChip(live, 'cap', CAPTIONS[3], g.W / 2, g.capY, { tone: 'accent', cls: 'sv-pop', size: g.P ? 'sm' : null });
  }
}
