/**
 * SvgCameraStageBiologyShowcaseScene - kit/SimCameraSvg.js and kit/SimStageSvg.js doing a biology job:
 * levels of organisation, organ -> tissue -> cell -> organelle.
 *   Beat 0: a seedling in a pot on the bench; its leaf is an organ (contact shadow)
 *   Beat 1: the camera pushes into the leaf (cameraLive 'to', log zoom x8): a tissue, rows of cells
 *   Beat 2: one cell becomes a whole stage (stageBridgeSvg): wall, vacuole, nucleus, chloroplasts
 *   Beat 3: the camera pushes onto one chloroplast inside that cell; tap a part to name it (pointWorld)
 * The world is painted once (cameraG html). Tap skips a running build; Replay runs it again.
 * Portrait is its own layout.
 */
import { SvgScene, chip, liveChip, fill, shade, glossOf, tone } from 'simulations/base/kit/SimSvg.js';
import { hash2 } from 'simulations/base/kit/SimAnim.js';
import { cameraG, cameraLive, cameraTransform, toScreen, pointWorld, hairStyle } from 'simulations/base/kit/SimCameraSvg.js';
import { stageBridgeSvg, contactShadowSvg, shadowDefs, shadowTone, BRIDGE_D } from 'simulations/base/kit/SimStageSvg.js';

const MAP = [0, 1, 2, 3].map((i) => [{ idx: i, dwellMs: null }]);
const START = 0.3;
const PUSH = 1.2;
const Z1 = 8;
const Z3 = 3.2;
const CW = 9, CH = 6;                            // a leaf cell, world px
const BR_AT = 0.35;
const CAP_AT = BR_AT + 2 * BRIDGE_D + 0.05;
const TITLES = ['A leaf is an organ', 'Zoom in: a tissue', 'One cell, up close', 'Zoom in: an organelle'];
const CAPTIONS = ['Organs are made of tissues', 'A tissue: many cells together', 'Each cell has parts of its own', 'Chloroplasts make food from light'];
const LEAF = 'var(--sim-good)';
const CHLORO = 'color-mix(in oklab, var(--sim-good) 75%, var(--sim-label))';
const WALL = 'color-mix(in oklab, var(--sim-good) 55%, var(--sim-gold))';
const NUC = tone(5);
const VAC = 'color-mix(in oklab, var(--sim-glass) 35%, var(--sim-bg-surface))';
const POT = 'color-mix(in oklab, var(--sim-flame) 60%, var(--sim-gold))';
const PARTS = {
  wall: { name: 'Cell wall', fact: 'Cell wall: a stiff box that holds the cell\'s shape', tone: 'warning' },
  vacuole: { name: 'Vacuole', fact: 'Vacuole: a big bag of watery sap', tone: 1 },
  nucleus: { name: 'Nucleus', fact: 'Nucleus: keeps the instructions (DNA)', tone: 5 },
  chloro: { name: 'Chloroplast', fact: 'Chloroplast: makes food from light', tone: 'good' },
  cyto: { name: 'Cytoplasm', fact: 'Cytoplasm: the jelly where the work happens', tone: 3 },
};
const f1 = (v) => v.toFixed(1);
const f2 = (v) => v.toFixed(2);

// -- Layout ---------------------------------------------------------------------------

function geo(st) {
  const W = st.W, H = st.H, P = st.portrait;
  const top = H - (P ? 104 : 96);
  const a = Math.min(P ? (W - 70) / 2 : 190, W / 2 - 40), b = a * 0.42;
  const pot = { x: W / 2 - a + 8, w: P ? 64 : 76, h: P ? 58 : 66 };
  const leaf = { x0: W / 2 - a + 30, x1: W / 2 + a + 10, y: top - pot.h - (P ? 90 : 100), b };
  // Tissue: rows of brick cells inside the blade.
  const cells = [];
  for (let r = 0, y = leaf.y - b; y < leaf.y + b; r++, y += CH + 1) {
    for (let x = leaf.x0 + (r % 2 ? -CW / 2 : 0); x < leaf.x1; x += CW + 1) cells.push({ x, y, i: cells.length });
  }
  const fx = leaf.x0 + (leaf.x1 - leaf.x0) * 0.56, fy = leaf.y - b * 0.35;
  let focus = cells[0];
  for (const c of cells) if (Math.hypot(c.x + CW / 2 - fx, c.y + CH / 2 - fy) < Math.hypot(focus.x + CW / 2 - fx, focus.y + CH / 2 - fy)) focus = c;
  // The big cell of beats 2-3.
  const cw = Math.min(W - 70, 470), ch = Math.min(H - (P ? 150 : 140), P ? 300 : 250);
  const cell = { x: W / 2 - cw / 2, y: (P ? 60 : 50) + (H - 150 - ch) / 2, w: cw, h: ch };
  const chl = [];
  for (let i = 0; i < 9; i++) {
    const side = i % 3, t = (i + 0.5) / 9;
    const x = side === 0 ? cell.x + 34 + t * (cw - 68) : side === 1 ? cell.x + cw - 30 : cell.x + 30;
    const y = side === 0 ? cell.y + 30 + (i % 2) * (ch - 60) : cell.y + 44 + t * (ch - 88);
    chl.push({ x, y, rx: 20, ry: 10, rot: side === 0 ? 0 : 90 + (hash2(i, 4) - 0.5) * 30 });
  }
  const nuc = { x: cell.x + cw * 0.72, y: cell.y + ch * 0.52, r: Math.min(ch * 0.17, 34) };
  const vac = { x: cell.x + cw * 0.36, y: cell.y + ch * 0.5, rx: cw * 0.22, ry: ch * 0.3 };
  return { W, H, P, top, pot, leaf, cells, focus, cell, chl, nuc, vac, capY: H - 34, centre: [W / 2, H / 2] };
}

// -- Markup -------------------------------------------------------------------------------

const cardBg = (g) => `<rect x="2" y="2" width="${g.W - 4}" height="${g.H - 14}" rx="24" ${fill('var(--sim-bg-surface)', 'stroke:var(--sim-stroke);stroke-width:2')}/>`;

function bench(g) {
  const wood = 'color-mix(in oklab, var(--sim-gold) 52%, var(--sim-bg-surface))', x0 = 18, w = g.W - 36;
  return `<rect x="${x0}" y="${g.top + 6}" width="${w}" height="30" rx="10" ${fill(shade(wood, 70))}/>`
    + `<rect x="${x0}" y="${g.top}" width="${w}" height="22" rx="10" ${fill(wood)}/>`
    + `<rect x="${x0 + 14}" y="${g.top + 3}" width="${w - 28}" height="4" rx="2" ${fill(glossOf(wood, 70))}/>`;
}

function leafD(g, dy = 0) {
  const L = g.leaf, n = 40;
  let up = '', dn = '';
  for (let i = 0; i <= n; i++) {
    const u = i / n, x = L.x0 + (L.x1 - L.x0) * u, w = L.b * Math.pow(Math.sin(Math.PI * u), 0.75) * (1 - 0.25 * u);
    up += (i ? 'L' : 'M') + f1(x) + ' ' + f1(L.y - w + dy);
    dn = 'L' + f1(x) + ' ' + f1(L.y + w * 0.9 + dy) + dn;
  }
  return up + dn + 'Z';
}

/** Seedling: pot, stem, the leaf with its tissue painted in (texture at x1, cells at x8). */
function plantSvg(g) {
  const L = g.leaf, p = g.pot, px = p.x, py = g.top - p.h;
  let s = contactShadowSvg(px + p.w / 2, g.top, p.w + 6);
  s += `<path d="M${f1(px + p.w / 2)} ${f1(py + 4)}C${f1(px + p.w / 2)} ${f1(L.y + 40)} ${f1(L.x0 - 20)} ${f1(L.y + 10)} ${f1(L.x0 + 4)} ${f1(L.y)}" ${fill('none', `stroke:${shade(LEAF, 80)};stroke-width:7;stroke-linecap:round`)}/>`;
  s += `<path d="${leafD(g, 6)}" ${fill(shade(LEAF, 70))}/><path d="${leafD(g)}" ${fill(`color-mix(in oklab, ${LEAF} 70%, var(--sim-bg-surface))`)}/>`;
  s += `<defs><clipPath id="bio-leaf"><path d="${leafD(g)}"/></clipPath></defs><g clip-path="url(#bio-leaf)">`;
  for (const c of g.cells) {
    s += `<rect x="${f1(c.x + 0.4)}" y="${f1(c.y + 0.4)}" width="${CW - 0.8}" height="${CH - 0.8}" rx="1.6" ${fill(`color-mix(in oklab, ${LEAF} 38%, var(--sim-bg-surface))`, `stroke:${shade(LEAF, 75)};stroke-width:0.45`)}/>`
      + `<ellipse cx="${f1(c.x + 2.6)}" cy="${f1(c.y + 2 + hash2(c.i, 1) * 2)}" rx="1.1" ry="0.7" ${fill(CHLORO)}/>`
      + `<ellipse cx="${f1(c.x + 6.2)}" cy="${f1(c.y + 2 + hash2(c.i, 2) * 2)}" rx="1.1" ry="0.7" ${fill(CHLORO)}/>`;
  }
  s += '</g>';
  // Midrib and veins over the tissue.
  const mid = `M${f1(L.x0 + 4)} ${f1(L.y)}Q${f1((L.x0 + L.x1) / 2)} ${f1(L.y - 6)} ${f1(L.x1 - 4)} ${f1(L.y - 2)}`;
  s += `<path d="${mid}" ${fill('none', `stroke:${glossOf(LEAF, 45)};stroke-width:2.6;stroke-linecap:round`)}/>`;
  for (let i = 1; i <= 5; i++) {
    const x = L.x0 + (L.x1 - L.x0) * (i / 6.4), w = L.b * 0.7 * Math.sin((Math.PI * i) / 6.4);
    s += `<path d="M${f1(x)} ${f1(L.y - 3)}l${f1(w * 0.8)} ${f1(-w)}M${f1(x)} ${f1(L.y - 2)}l${f1(w * 0.8)} ${f1(w * 0.9)}" ${fill('none', `stroke:${glossOf(LEAF, 45)};stroke-width:1.4;stroke-linecap:round;opacity:0.8`)}/>`;
  }
  // The pot (drawn last: the stem goes in behind its rim).
  s += `<path d="M${px} ${py}h${p.w}l-7 ${p.h}h${-p.w + 14}Z" transform="translate(0 4)" ${fill(shade(POT, 65))}/>`
    + `<path d="M${px} ${py}h${p.w}l-7 ${p.h}h${-p.w + 14}Z" ${fill(POT)}/>`
    + `<rect x="${px - 5}" y="${py - 4}" width="${p.w + 10}" height="14" rx="5" ${fill(shade(POT, 85))}/>`
    + `<rect x="${px + 4}" y="${py + 14}" width="5" height="${p.h - 22}" rx="2.5" ${fill(glossOf(POT, 55), 'opacity:0.7')}/>`;
  return s;
}

const chloroSvg = (c) => `<g transform="translate(${f1(c.x)} ${f1(c.y)}) rotate(${f1(c.rot)})">`
  + `<ellipse cx="0" cy="2" rx="${c.rx}" ry="${c.ry}" ${fill(shade(CHLORO, 70))}/><ellipse cx="0" cy="0" rx="${c.rx}" ry="${c.ry}" ${fill(CHLORO)}/>`
  + [-10, -3.5, 3, 9.5].map((dx) => `<rect x="${dx - 2.4}" y="-4.5" width="4.8" height="9" rx="1.6" ${fill(glossOf(CHLORO, 55))}/>`).join('')
  + `<ellipse cx="0" cy="0" rx="${c.rx}" ry="${c.ry}" ${hairStyle(shade(CHLORO, 60), 1.4)}/></g>`;

/** The big plant cell: a wall with a lip, membrane, vacuole, nucleus and chloroplasts round the edge. */
function cellSvg(g) {
  const c = g.cell, v = g.vac, n = g.nuc;
  let s = `<rect x="${c.x}" y="${c.y + 7}" width="${c.w}" height="${c.h}" rx="26" ${fill(shade(WALL, 65))}/>`
    + `<rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" rx="26" ${fill(WALL)}/>`
    + `<rect x="${c.x + 9}" y="${c.y + 9}" width="${c.w - 18}" height="${c.h - 18}" rx="19" ${fill(`color-mix(in oklab, ${LEAF} 16%, var(--sim-bg-surface))`, `stroke:${shade(WALL, 80)};stroke-width:2`)}/>`
    + `<rect x="${c.x + 26}" y="${c.y + 3}" width="${c.w - 52}" height="3" rx="1.5" ${fill(glossOf(WALL, 50), 'opacity:0.8')}/>`;
  s += `<ellipse cx="${f1(v.x)}" cy="${f1(v.y)}" rx="${f1(v.rx)}" ry="${f1(v.ry)}" ${fill(VAC, `stroke:color-mix(in oklab, var(--sim-glass) 70%, var(--sim-label));stroke-width:2`)}/>`
    + `<ellipse cx="${f1(v.x - v.rx * 0.4)}" cy="${f1(v.y - v.ry * 0.5)}" rx="${f1(v.rx * 0.22)}" ry="${f1(v.ry * 0.12)}" ${fill('color-mix(in oklab, white 55%, transparent)')}/>`;
  s += `<circle cx="${f1(n.x)}" cy="${f1(n.y + 3)}" r="${f1(n.r)}" ${fill(shade(NUC, 65))}/><circle cx="${f1(n.x)}" cy="${f1(n.y)}" r="${f1(n.r)}" ${fill(`color-mix(in oklab, ${NUC} 70%, var(--sim-bg-surface))`, `stroke:${shade(NUC, 70)};stroke-width:2`)}/>`
    + `<circle cx="${f1(n.x + n.r * 0.25)}" cy="${f1(n.y - n.r * 0.2)}" r="${f1(n.r * 0.36)}" ${fill(shade(NUC, 85))}/>`;
  for (const k of g.chl) s += chloroSvg(k);
  return s;
}

const cellPts = (x, y, w, h, n = 96) => {
  const out = [];
  for (let i = 0; i < n; i++) {
    const th = -Math.PI + (i / n) * 2 * Math.PI, cs = Math.cos(th), sn = Math.sin(th);
    out.push([x + w / 2 + (w / 2) * Math.sign(cs) * Math.pow(Math.abs(cs), 0.25), y + h / 2 + (h / 2) * Math.sign(sn) * Math.pow(Math.abs(sn), 0.25)]);
  }
  return out;
};

const benchWorld = (g) => bench(g) + plantSvg(g);

// -- Scene ------------------------------------------------------------------------------

export class SvgCameraStageBiologyShowcaseScene extends SvgScene {
  static BEAT_STEP_MAP = MAP;
  static ARIA_LABEL = 'Levels of organisation in a plant: a seedling with one leaf, an organ; a zoom into the leaf shows a tissue of many cells; one cell grows to fill the stage, showing its wall, vacuole, nucleus and chloroplasts; a zoom onto one chloroplast. Tap a part to name it.';
  static CONTROLS = [{ type: 'button', id: 'replay', label: 'Replay' }];

  stageHeight(st) { return st.portrait ? 460 : 400; }

  enter(step) {
    this.sel = null;
    this.play([0.1, START + PUSH + 0.4, CAP_AT + 0.4, START + PUSH + 0.4][step]);
  }

  onControlChange(id) {
    if (id === 'replay') { this.clockReset(); this.enter(this.stepIndex); }
    this.requestUiUpdate?.();
  }

  /** Beat 3: name the part under the finger (hit test in world units, any zoom). */
  pointerDown(p) {
    if (this.skip() || this.stepIndex !== 3 || !this.cam || !this.sv) return false;
    const g = geo(this.sv), w = pointWorld(this.cam, p, g.centre), c = g.cell;
    const inEll = (x, y, e, rot = 0) => {
      const cs = Math.cos((-rot * Math.PI) / 180), sn = Math.sin((-rot * Math.PI) / 180), dx = x - e.x, dy = y - e.y;
      const u = dx * cs - dy * sn, v = dx * sn + dy * cs;
      return (u * u) / ((e.rx ?? e.r) ** 2) + (v * v) / ((e.ry ?? e.r) ** 2) <= 1;
    };
    let id = null;
    if (w.x >= c.x && w.x <= c.x + c.w && w.y >= c.y && w.y <= c.y + c.h) {
      id = w.x < c.x + 10 || w.x > c.x + c.w - 10 || w.y < c.y + 10 || w.y > c.y + c.h - 10 ? 'wall' : 'cyto';
      if (g.chl.some((k) => inEll(w.x, w.y, { x: k.x, y: k.y, rx: k.rx + 3, ry: k.ry + 3 }, k.rot))) id = 'chloro';
      else if (inEll(w.x, w.y, g.nuc)) id = 'nucleus';
      else if (inEll(w.x, w.y, g.vac)) id = 'vacuole';
    }
    this.sel = id ? { id, x: w.x, y: w.y } : null;
    this.liveFrame();
    return false;
  }

  paint(st) {
    shadowTone(this.root);
    const w = st.W - 4, h = st.H - 14;
    const card = shadowDefs() + `<defs><clipPath id="bio-frame"><rect x="2" y="2" width="${w}" height="${h}" rx="24"/></clipPath></defs>`
      + `<rect x="2" y="9" width="${w}" height="${h}" rx="24" ${fill('color-mix(in oklab, var(--sim-stroke) 70%, var(--sim-bg-deep))')}/>`
      + `<rect x="2" y="2" width="${w}" height="${h}" rx="24" ${fill('var(--sim-bg-surface)', 'stroke:var(--sim-stroke);stroke-width:2')}/>`;
    return { svg: card, head: chip(TITLES[this.stepIndex], 0, 0, { tone: 'plain', size: 'big', static: true }) };
  }

  animate(st, t) {
    const live = this.live, g = geo(st), step = this.stepIndex;
    if (step === 2) return this.bridgeBeat(live, g, t);
    const base = { x: g.centre[0], y: g.centre[1], z: 1 };
    const k = g.chl[0];
    const target = step === 3 ? { x: k.x, y: k.y + 26, z: Z3 } : { x: g.focus.x + CW / 2, y: g.focus.y + CH / 2, z: Z1 };
    const ev = step === 0 ? [] : [{ at: START, kind: 'to', ...target, dur: PUSH }];
    const { cam, moving } = cameraLive(live, base, ev, g.centre);
    this.cam = cam;
    const frame = live.shape('frame', 'svg');
    live.attrs(frame, { x: 2, y: 2, width: st.W - 4, height: st.H - 14, viewBox: `2 2 ${st.W - 4} ${st.H - 14}`, 'clip-path': 'url(#bio-frame)' });
    cameraG(live, step === 3 ? 'cell' : 'plant', cam, { html: step === 3 ? cellSvg(g) : benchWorld(g), centre: g.centre, parent: frame });
    liveChip(live, 'zoom', `zoom x${cam.z.toFixed(1)}`, st.W - 16, 28, { tone: 'accent', align: 'right', size: 'sm' });
    const settled = !moving && t > START + PUSH;
    if (step === 0) {
      const [lx, ly] = toScreen(cam, g.leaf.x1 - 40, g.leaf.y - g.leaf.b, g.centre);
      liveChip(live, 'organ', 'organ: leaf', Math.min(lx - 30, g.W - 150), ly - 14, { tone: 'good', cls: 'sv-pop' });
    }
    if (step === 1 && settled) {
      const [fx, fy] = toScreen(cam, g.focus.x + CW / 2, g.focus.y, g.centre);
      liveChip(live, 'one', 'one cell', fx, fy - 22, { tone: 'plain', size: 'sm', cls: 'sv-pop' });
    }
    if (step === 3 && settled) {
      const sel = this.sel ?? { id: 'chloro', x: k.x, y: k.y - k.ry };
      const pc = PARTS[sel.id];
      const [sx, sy] = toScreen(cam, sel.x, sel.y, g.centre);
      liveChip(live, `tag|${sel.id}|${f1(sel.x)}`, pc.name, Math.max(80, Math.min(g.W - 80, sx)), Math.max(70, sy - 30), { tone: pc.tone, cls: 'sv-pop' });
    }
    if (step === 0 || settled) {
      const cap = step === 3 && this.sel ? PARTS[this.sel.id].fact : CAPTIONS[step];
      liveChip(live, 'cap', cap, g.W / 2, g.capY, { tone: 'accent', cls: 'sv-pop', size: g.P ? 'sm' : null });
    }
  }

  /** Beat 2: one cell of the zoomed tissue becomes the whole stage. */
  bridgeBeat(live, g, t) {
    const key = `${g.W}x${g.H}`;
    if (this.brKey !== key) {
      const close = { x: g.focus.x + CW / 2, y: g.focus.y + CH / 2, z: Z1 };
      const zoomed = cardBg(g) + `<g transform="${cameraTransform(close, g.centre)}">${benchWorld(g)}</g>`;
      const [x0, y0] = toScreen(close, g.focus.x + 0.4, g.focus.y + 0.4, g.centre);
      const A = { P: cellPts(x0, y0, (CW - 0.8) * Z1, (CH - 0.8) * Z1), col: `color-mix(in oklab, ${LEAF} 38%, var(--sim-bg-surface))`, svg: zoomed };
      const c = g.cell;
      const B = { P: cellPts(c.x, c.y, c.w, c.h), col: WALL, svg: cardBg(g) + cellSvg(g) };
      this.br = stageBridgeSvg(A, B, { w: g.W, h: g.H, paper: 'var(--sim-bg-surface)', box: { x: 2, y: 2, w: g.W - 4, h: g.H - 14, r: 24 } });
      this.brKey = key;
    }
    this.br.draw(live, 'br', t - BR_AT);
    if (t >= CAP_AT) liveChip(live, 'cap', CAPTIONS[2], g.W / 2, g.capY, { tone: 'accent', cls: 'sv-pop', size: g.P ? 'sm' : null });
  }
}
