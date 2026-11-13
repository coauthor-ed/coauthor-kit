/**
 * PeopleToCellsScene - plain-look anchor (epidemiology "people before cells"): 40 people as dots sort
 * into a 2 x 2 table in front of the learner, then the cells get their letters, then the risk in each
 * row and the risk ratio land large. Illustrative numbers: 16 used the pump (6 fell ill), 24 used other
 * water (3 fell ill).
 *   Beat 0: the town, ill and well mixed. The learner sorts by exposure: the dots slide into two rows.
 *   Beat 1: the learner sorts by outcome: each row splits into ill and well; the letters a, b, c, d and
 *           their counts appear, a callout names cell a.
 *   Beat 2: the learner computes the risks: each row's risk counts up beside it (a of a + b, c of c + d),
 *           then the risk ratio counts up to 3.0 at the foot, cell a highlighted; the find.
 * Every count, risk and ratio is computed from the people drawn. Annotations: kit/SimAnnotate.js. Dots
 * move on the live layer (kit/SimClock.js), timed from the learner's tap, so a repaint never replays them.
 */
import { SvgScene, chip } from 'simulations/base/kit/SimSvg.js';
import { annotations } from 'simulations/base/kit/SimAnnotate.js';
import { mulberry32 } from 'simulations/base/kit/SimLook.js';
import { flowChipHtml, bindFlow } from 'simulations/base/kit/SimFlowDom.js';
import { reducedMotion } from 'simulations/base/kit/SimAnim.js';

const EXP = { n: 16, ill: 6 }, UNEXP = { n: 24, ill: 3 };
const MOVE_S = 0.8, STAGGER = 0.014;
const nowS = () => performance.now() / 1000;
const easeIO = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const easeOut = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : 1 - Math.pow(1 - u, 3));

// The town: exposure and outcome per person, in a seeded order (the same picture every time).
const PEOPLE = (() => {
  const out = [];
  for (let i = 0; i < EXP.n; i++) out.push({ exp: true, ill: i < EXP.ill });
  for (let i = 0; i < UNEXP.n; i++) out.push({ exp: false, ill: i < UNEXP.ill });
  const rnd = mulberry32(11);
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out.map((p, i) => ({ ...p, i }));
})();
const A = PEOPLE.filter((p) => p.exp && p.ill).length, B = PEOPLE.filter((p) => p.exp && !p.ill).length;
const C = PEOPLE.filter((p) => !p.exp && p.ill).length, D = PEOPLE.filter((p) => !p.exp && !p.ill).length;
const R1 = A / (A + B), R0 = C / (C + D), RR = R1 / R0;
const pct = (r) => Math.round(r * 100);

export class PeopleToCellsScene extends SvgScene {
  static BEAT_STEP_MAP = [[{ idx: 0, dwellMs: null }], [{ idx: 1, dwellMs: null }], [{ idx: 2, dwellMs: null }]];
  static ARIA_LABEL = 'Forty people as dots. Sorted by exposure, 16 used the pump and 24 used other water. Sorted by outcome, the rows split into a 2 by 2 table: a = 6 exposed and ill, b = 10, c = 3, d = 21. Risk 6 of 16 is 38 per cent against 3 of 24, 13 per cent: a risk ratio of 3.0. Illustrative numbers.';
  static CONTROLS = [];
  static PORTRAIT_HEIGHT = 820;

  async setup() {
    this.notes = annotations({ max: 3 });
    await super.setup();
    bindFlow(this.root, { action: (name) => this.act(name) });
  }

  enter(step) {
    this.lay = ['cloud', 'rows', 'cells'][step];
    this.from = this.lay;
    this.movedAt = -1e9;
    this.computedAt = step === 2 ? null : null;
    this.notes.clear();
  }

  stageHeight(st) { return st.portrait ? 600 : 430; }

  act(name) {
    if (name === 'exposure' && this.lay === 'cloud') this.move('rows');
    else if (name === 'outcome' && this.lay === 'rows') this.move('cells');
    else if (name === 'risk' && this.lay === 'cells' && this.computedAt == null) {
      this.computedAt = nowS();
      this.after(reducedMotion() ? 0 : 1.7, () => { this.repaint(); this.celebrate(this.rrAt?.x, this.rrAt?.y, { stamp: 'RISK x3' }); });
      this.repaint();
      this.play(2.2);
    }
  }

  move(to) {
    this.from = this.lay;
    this.lay = to;
    this.movedAt = nowS();
    this.repaint();
    this.play(MOVE_S + STAGGER * PEOPLE.length + 0.1);
    this.after(reducedMotion() ? 0 : MOVE_S + 0.35, () => this.repaint());   // the letters and the callout, once the people land
  }

  settled() { return reducedMotion() || nowS() - this.movedAt > MOVE_S + 0.3; }

  // Regions in stage px: row labels left, the 2 x 2 card in the middle, risk readings right (portrait: under).
  geom(st) {
    const P = st.portrait;
    const lab = P ? 78 : 130, read = P ? 0 : 150;
    const x0 = lab, x1 = st.W - read - 8, top = 34, bottom = P ? st.H - 210 : st.H - 92;
    return { P, lab, x0, x1, xm: (x0 + x1) / 2, top, bottom, ym: (top + bottom) / 2 };
  }

  // Where person p stands in a layout.
  spot(g, p, lay) {
    const step = g.P ? 21 : 23;
    const grid = (list, x0, x1, y0, y1, cols) => {
      const k = list.indexOf(p), rows = Math.ceil(list.length / cols);
      const w = cols * step, h = rows * step;
      return { x: (x0 + x1) / 2 - w / 2 + (k % cols) * step + step / 2, y: (y0 + y1) / 2 - h / 2 + Math.floor(k / cols) * step + step / 2 };
    };
    if (lay === 'cloud') {
      const cols = g.P ? 6 : 10, rnd = mulberry32(100 + p.i);
      const cw = (g.x1 - g.x0 + (g.P ? 40 : 60)) / cols, ch = (g.bottom - g.top) / Math.ceil(PEOPLE.length / cols);
      const c = p.i % cols, r = Math.floor(p.i / cols);
      return { x: g.x0 - (g.P ? 20 : 30) + (c + 0.5) * cw + (rnd() - 0.5) * cw * 0.5, y: g.top + (r + 0.5) * ch + (rnd() - 0.5) * ch * 0.45 };
    }
    const row = PEOPLE.filter((q) => q.exp === p.exp);
    const [y0, y1] = p.exp ? [g.top, g.ym] : [g.ym, g.bottom];
    if (lay === 'rows') return grid(row, g.x0, g.x1, y0, y1, g.P ? 12 : 13);
    const cell = row.filter((q) => q.ill === p.ill);
    const [x0, x1] = p.ill ? [g.x0, g.xm] : [g.xm, g.x1];
    return grid(cell, x0, x1, y0 + 8, y1, g.P ? 5 : 6);
  }

  animate(st) {
    const g = this.geom(st), e = reducedMotion() ? 99 : nowS() - this.movedAt;
    let moving = false;
    for (const p of PEOPLE) {
      const u = easeIO((e - p.i * STAGGER) / MOVE_S);
      if (u < 1) moving = true;
      const a = this.spot(g, p, this.from), b = this.spot(g, p, this.lay);
      const dot = this.live.shape(`p${p.i}`, 'circle', { cls: p.ill ? 'pc-dot pc-ill' : 'pc-dot' });
      this.live.attrs(dot, { cx: (a.x + (b.x - a.x) * u).toFixed(1), cy: (a.y + (b.y - a.y) * u).toFixed(1), r: g.P ? 7 : 7.5 });
    }
    // Readings that count up to their value from the learner's tap.
    const c = this.computedAt == null ? 99 : reducedMotion() ? 99 : nowS() - this.computedAt;
    for (const el of this.sv.wrap.querySelectorAll('[data-pc-to]')) {
      const at = Number(el.dataset.pcAt), to = Number(el.dataset.pcTo), from = Number(el.dataset.pcFrom ?? 0), dp = Number(el.dataset.pcDp ?? 0);
      const v = from + (to - from) * easeOut((c - at) / 0.75);
      el.textContent = v.toFixed(dp);
      if (c - at < 0.75) moving = true;
    }
    if (moving) this.live.more();
  }

  paint(st) {
    const g = this.geom(st), s = this.stepIndex, lay = this.lay, P = g.P, settled = this.settled();
    const rowsOn = lay !== 'cloud', cellsOn = lay === 'cells';
    let svg = '', over = '';
    // The hero card: the 2 x 2 frame, one soft shadow under it.
    const pad = 10;
    const card = `<rect x="${g.x0 - pad}" y="${g.top - pad}" width="${g.x1 - g.x0 + 2 * pad}" height="${g.bottom - g.top + 2 * pad}" rx="8" class="pc-card"/>`;
    if (rowsOn) svg += `<rect x="${g.x0}" y="${g.ym - 0.5}" width="${g.x1 - g.x0}" height="1" class="pc-rule"/>`;
    if (cellsOn) svg += `<rect x="${g.xm - 0.5}" y="${g.top}" width="1" height="${g.bottom - g.top}" class="pc-rule"/>`;
    // Row labels and column heads.
    const rowLab = (y, name, n) => `<span class="pc-lab" style="left:${g.lab - 14}px;top:${y}px"><b>${name}</b><i>${n} people</i></span>`;
    if (rowsOn) {
      over += rowLab((g.top + g.ym) / 2, 'Used the pump', A + B) + rowLab((g.ym + g.bottom) / 2, 'Other water', C + D);
    } else {
      over += `<span class="pc-lab" style="left:${g.lab - 14}px;top:${(g.top + g.bottom) / 2}px"><b>The town</b><i>${PEOPLE.length} people</i></span>`;
    }
    if (cellsOn) {
      over += `<span class="pc-col" style="left:${(g.x0 + g.xm) / 2}px;top:${g.top - 20}px">Fell ill</span><span class="pc-col" style="left:${(g.xm + g.x1) / 2}px;top:${g.top - 20}px">Stayed well</span>`;
    }
    // The letters, once the people have landed in their cells.
    if (cellsOn && settled) {
      const L = [['a', A, g.x0, g.top], ['b', B, g.xm, g.top], ['c', C, g.x0, g.ym], ['d', D, g.xm, g.ym]];
      for (const [k, n, x, y] of L) over += `<span class="pc-let" style="left:${x + 8}px;top:${y + 6}px"><i>${k}</i> = ${n}</span>`;
    }
    // Risk readings: beside each row (under the card in portrait), counting up from the tap.
    const done = this.computedAt != null;
    if (done) {
      const r = (y, a, n, r1, at) => {
        const x = P ? (y < g.ym ? st.W * 0.27 : st.W * 0.73) : g.x1 + 22;
        const yy = P ? g.bottom + 46 : y;
        return `<span class="pc-risk${P ? ' pc-risk--c' : ''}" style="left:${x}px;top:${yy}px"><small>risk ${a} of ${n}</small><b><span data-pc-to="${pct(r1)}" data-pc-at="${at}">${pct(r1)}</span>%</b></span>`;
      };
      over += r((g.top + g.ym) / 2, A, A + B, R1, 0) + r((g.ym + g.bottom) / 2, C, C + D, R0, 0.25);
      const yRR = P ? g.bottom + 130 : st.H - 34;
      this.rrAt = { x: st.W / 2 + (P ? 120 : 150), y: yRR };
      over += `<span class="pc-rr" style="left:${st.W / 2}px;top:${yRR}px"><small>Risk ratio ${pct(R1)}% / ${pct(R0)}% =</small> <b data-pc-to="${RR.toFixed(1)}" data-pc-from="1" data-pc-dp="1" data-pc-at="0.75">${RR.toFixed(1)}</b></span>`;
    }
    // Annotations: what to look at on this beat (at most 3; the newest is the beat).
    const mid = (x0, x1) => (x0 + x1) / 2;
    if (lay === 'cloud') {
      const p = PEOPLE.find((q) => q.ill), at = this.spot(g, p, 'cloud');
      this.notes.callout({ x: at.x, y: at.y, r: 9 }, 'A filled dot fell ill', { key: 'ill', side: 'above', gap: Math.max(16, at.y - g.top + 6), sub: `${A + C} of ${PEOPLE.length}` });
    } else if (lay === 'rows' && settled && s < 2) {
      this.notes.clear('ill');
      const yr = (g.top + g.ym) / 2, xr = (g.x0 + g.x1) / 2 + (P ? 12 * 21 : 13 * 23) / 2;
      if (P) this.notes.callout({ x: (g.x0 + g.x1) / 2, y: g.top + 8 }, 'Exposed', { key: 'exp', side: 'above', gap: 30, sub: `${A + B} used the pump` });
      else this.notes.callout({ x: xr, y: yr - 12, w: 1, h: 24 }, 'Exposed', { key: 'exp', side: 'right', gap: 30, sub: `${A + B} used the pump` });
    }
    if (cellsOn && settled) {
      this.notes.clear('ill'); this.notes.clear('exp');
      const ya = (g.top + 8 + g.ym) / 2 - 6;
      if (!done) this.notes.callout({ x: (g.x0 + g.xm) / 2 - 70, y: ya - 10, w: 140, h: 20 }, 'a: exposed and ill', { key: 'a', side: 'below', gap: 10, sub: `${A} of ${A + B}` });
      else {
        this.notes.clear('a');
        if (!P) this.notes.highlight({ x: g.x0 + 2, y: g.top + 2, w: g.xm - g.x0 - 4, h: g.ym - g.top - 4 }, { key: 'hl-a' });
      }
    }
    svg = card + this.notes.under() + svg + this.notes.svg();   // the highlighter on the card, under the rules
    over += this.notes.over();
    const lede = ['40 people: who used the pump, who fell ill?', 'Split each row by who fell ill', 'Compare the risk in the two rows'][s];
    const btn = lay === 'cloud' ? flowChipHtml({ label: 'Sort by exposure', action: 'exposure' })
      : lay === 'rows' ? flowChipHtml({ label: 'Sort by outcome', action: 'outcome' })
        : !done ? flowChipHtml({ label: 'Compute the risks', action: 'risk' }) : '';
    const head = `<span class="sl-kicker pc-kick">Fig. 2.1</span>` + chip(lede, 0, 0, { tone: 'plain', static: true }) + btn;
    over += `<span class="pc-note" style="left:${st.W - 4}px;top:${st.H - 4}px">Illustrative numbers</span>`;
    return { svg, over, head };
  }

  css() {
    return `
.svs-head { gap: var(--sim-space-3); }
.pc-kick { flex: none; }
.pc-card { fill: var(--sim-bg-surface); stroke: color-mix(in srgb, var(--sim-label) 12%, transparent); stroke-width: 1;
  filter: drop-shadow(0 3px 8px color-mix(in srgb, var(--sim-label) 16%, transparent)); }
.pc-rule { fill: var(--sim-stroke); opacity: 0.55; }
.pc-dot { fill: var(--sim-series-8); opacity: 0.6; }
.pc-dot.pc-ill { fill: var(--sim-series-3); opacity: 1; }
.pc-lab { position: absolute; transform: translate(-100%, -50%); text-align: right; font: 700 var(--sim-text-md)/1.15 var(--sim-font); color: var(--sim-label); }
.pc-lab b { display: block; font-weight: 700; }
.pc-lab i { display: block; font-style: normal; font-weight: 500; font-size: var(--sim-text-sm); color: var(--sim-label-muted); }
.pc-col { position: absolute; transform: translate(-50%, -50%); font: 700 14px/1 var(--sim-font); letter-spacing: 0.06em; text-transform: uppercase; color: var(--sim-label-muted); white-space: nowrap; }
.pc-let { position: absolute; font: 600 var(--sim-text-md)/1 var(--sim-font); color: var(--sim-label); white-space: nowrap; animation: sa-fade 0.24s ease-out both; }
.pc-let i { font: italic 700 22px/1 Georgia, 'Times New Roman', serif; color: var(--sim-annot); }
.pc-risk { position: absolute; transform: translate(0, -50%); display: flex; flex-direction: column; font-family: var(--sim-font); color: var(--sim-label); white-space: nowrap; }
.pc-risk--c { transform: translate(-50%, -50%); align-items: center; }
.pc-risk small { font: 600 14px/1.1 var(--sim-font); color: var(--sim-label-muted); }
.pc-risk b { font: 700 34px/1.05 var(--sim-font); font-variant-numeric: tabular-nums; }
.pc-rr { position: absolute; transform: translate(-50%, -50%); white-space: nowrap; display: flex; align-items: baseline; gap: 10px; color: var(--sim-label); }
.pc-rr small { font: 600 var(--sim-text-md)/1 var(--sim-font); color: var(--sim-label-muted); }
.pc-rr b { font: 700 40px/1 var(--sim-font); font-variant-numeric: tabular-nums; color: var(--sim-annot); }
.pc-note { position: absolute; transform: translate(-100%, -100%); font: 600 var(--sim-text-sm)/1 var(--sim-font); color: var(--sim-label-muted); white-space: nowrap; }
@media (prefers-reduced-motion: reduce) { .pc-let { animation: none; } }
`;
  }
}
