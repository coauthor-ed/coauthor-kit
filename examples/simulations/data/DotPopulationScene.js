/**
 * DotPopulationScene - plain-look anchor: a population as dots, k of n marked (kit/SimChart.js dotsSvg).
 * Teaches that a share needs its denominator: the same count is a different rate in a different group.
 *   Beat 0: one group of 100, 12 marked: 12 of 100 is 12 per cent.
 *   Beat 1: a second group of 40 with the same 12 marked: 12 of 40 is 30 per cent. Same count, other rate.
 *   Beat 2: the learner sets the second group's size in the scene (20, 40, 80, 160); the count stays 12
 *           and the rate is recomputed from the dots drawn.
 * Marked dots are spread by a seeded shuffle, so a group reads as a population, not a filled row.
 * Illustrative numbers. Controls live in the scene. Portrait stacks the two groups.
 */
import { SvgScene, chip } from 'simulations/base/kit/SimSvg.js';
import { dotsSvg } from 'simulations/base/kit/SimChart.js';
import { mulberry32 } from 'simulations/base/kit/SimLook.js';
import { flowChoiceHtml, bindFlow } from 'simulations/base/kit/SimFlowDom.js';

const K = 12;
const SIZES = [20, 40, 80, 160];
const pct = (k, n) => `${Math.round((100 * k) / n)}%`;

// k indices out of n, spread by a seeded shuffle (the same picture every time).
function marked(n, k, seed) {
  const rnd = mulberry32(seed), idx = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  return new Set(idx.slice(0, k));
}

export class DotPopulationScene extends SvgScene {
  static BEAT_STEP_MAP = [[{ idx: 0, dwellMs: null }], [{ idx: 1, dwellMs: null }], [{ idx: 2, dwellMs: null }]];
  static ARIA_LABEL = 'Dots for a group of 100 people with 12 marked, 12 per cent. A second group of 40 with the same 12 marked is 30 per cent. Then the second group size can be changed while the count stays 12. Illustrative numbers.';
  static CONTROLS = [];
  static PORTRAIT_HEIGHT = 790; // beat 2 with the size choice in the head

  async setup() {
    await super.setup();
    bindFlow(this.root, { action: (name, v) => { if (name === 'size' && this.stepIndex === 2 && Number(v) !== this.nB) { this.nB = Number(v); this.repaint(); } } });
  }

  enter() { this.nB = 40; }
  stageHeight(st) { return st.portrait ? (this.stepIndex === 0 ? 420 : 660) : 400; }

  // One group: a caption above, the dots, the reading under them.
  group(r, n, seed, name) {
    const cap = 34, foot = 40;
    const area = { x: r.x, y: r.y + cap, w: r.w, h: r.h - cap - foot };
    const cols = Math.max(5, Math.round(Math.sqrt((n * area.w) / area.h)));
    const rows = Math.ceil(n / cols), cell = Math.min(area.w / cols, area.h / rows, 30);
    const box = { x: area.x + (area.w - cols * cell) / 2, y: area.y + (area.h - rows * cell) / 2, w: cols * cell, h: rows * cell };
    const out = dotsSvg(box, { n, cols, hi: marked(n, K, seed), hiTone: 2 });
    out.over += chip(`${name}: ${n} people`, r.x + r.w / 2, r.y + 14, { tone: 'plain', size: 'sm' });
    out.over += `<span class="dp-read" style="left:${(r.x + r.w / 2).toFixed(1)}px;top:${(r.y + r.h - 16).toFixed(1)}px"><b>${K}</b> of ${n} = <b>${pct(K, n)}</b></span>`;
    return out;
  }

  paint(st) {
    const P = st.portrait, two = this.stepIndex > 0, H = st.H - 24;
    let svg = '', over = '';
    const add = (o) => { svg += o.svg; over += o.over; };
    if (!two) add(this.group({ x: 0, y: 0, w: st.W, h: H }, 100, 3, 'Group A'));
    else {
      const gap = 24;
      const A = P ? { x: 0, y: 0, w: st.W, h: (H - gap) / 2 } : { x: 0, y: 0, w: (st.W - gap) / 2, h: H };
      const B = P ? { x: 0, y: A.h + gap, w: st.W, h: A.h } : { x: A.w + gap, y: 0, w: A.w, h: H };
      add(this.group(A, 100, 3, 'Group A'));
      add(this.group(B, this.nB, 5, 'Group B'));
      svg += P ? `<rect x="16" y="${(A.h + gap / 2 - 0.5).toFixed(1)}" width="${st.W - 32}" height="1" style="fill:var(--sim-stroke);opacity:0.6"/>`
        : `<rect x="${(A.w + gap / 2 - 0.5).toFixed(1)}" y="12" width="1" height="${H - 24}" style="fill:var(--sim-stroke);opacity:0.6"/>`;
    }
    const lede = ['A share is a count over the group it came from', `Same count, ${K}; the group size changes the rate`, 'Set group B: the count stays 12'][this.stepIndex];
    const head = (this.stepIndex === 2 ? flowChoiceHtml({ action: 'size', label: 'Group B size', value: this.nB, options: SIZES.map((v) => ({ value: v, label: String(v) })) }) : '')
      + chip(lede, 0, 0, { tone: 'plain', static: true });
    over += `<span class="dp-note" style="left:${st.W - 4}px;top:${st.H - 4}px">Illustrative numbers</span>`;
    return { svg, over, head };
  }

  css() {
    return `
.dp-read { position: absolute; transform: translate(-50%, -50%); white-space: nowrap; font: var(--look-text-weight, 800) var(--sim-text-lg)/1 var(--sim-font); color: var(--sim-label); font-variant-numeric: tabular-nums; }
.dp-read b { color: var(--sim-series-2-ink, var(--sim-series-2)); }
.dp-note { position: absolute; transform: translate(-100%, -100%); font: 600 var(--sim-text-sm)/1 var(--sim-font); color: var(--sim-label-muted); white-space: nowrap; }
.svs-head .sflow-choice { flex: none; }
`;
  }
}
