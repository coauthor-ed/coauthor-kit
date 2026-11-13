/**
 * ChanceShowcaseScene - reference for kit/SimChance.js (SVG, DOM). Beats: 0
 * the 36 outcomes of two dice (pick a sum, its cells light), 1 a tree for two
 * coins, 2 a seeded spinner beside a bag with the same odds, 3 a 52-card deck
 * with the hearts marked.
 */
import { SvgScene, chip, cardHtml } from 'simulations/base/kit/SimSvg.js';
import { dieSvg, coinSvg, outcomeGrid, outcomeGridSvg, treeLayout, treeSvg, spinnerSvg, spinnerSector, bagSvg, cardGrid, cardSvg, CHANCE_CSS } from 'simulations/base/kit/SimChance.js';
import { tallySvg } from 'simulations/base/kit/SimChart.js';
import { join } from 'simulations/base/kit/SimNumberLine.js';
import { mulberry32 } from 'simulations/base/kit/SimLook.js';
import { fracHtml } from 'simulations/base/kit/SimText.js';

const MAP = [0, 1, 2, 3].map((i) => [{ idx: i, dwellMs: null }]);
const SECTORS = [{ w: 3, text: '3', tone: 1 }, { w: 2, text: '2', tone: 4 }, { w: 1, text: '1', tone: 3 }];
const SPIN_S = 2.4;

export class ChanceShowcaseScene extends SvgScene {
  static BEAT_STEP_MAP = MAP;
  static ARIA_LABEL = 'Chance: a 6 by 6 grid of two-dice outcomes with the cells for a chosen sum lit, a probability tree for two coins, a spinner with unequal sectors beside a bag of balls with the same odds, and a deck of 52 cards with the hearts marked.';
  static CONTROLS = [
    { type: 'select', id: 'sum', label: 'Sum:', value: '7', options: ['2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'] },
    { type: 'button', id: 'spin', label: 'Spin' },
  ];

  css() { return CHANCE_CSS; }
  enter() { this.sum = this.sum ?? 7; this.angle = 0; this.spinning = false; this.results = [0, 0, 0]; }
  isControlHidden(id) { return (id === 'sum' && this.stepIndex !== 0) || (id === 'spin' && this.stepIndex !== 2); }
  isControlDisabled(id) { return id === 'spin' && this.spinning; }
  getControlValue(id) { return id === 'sum' ? String(this.sum) : undefined; }
  stageHeight(st) { return st.portrait ? [470, 420, 600, 360][this.stepIndex ?? 0] : 424; }

  onControlChange(id, v) {
    if (this.isControlHidden(id)) return;
    if (id === 'sum') { this.sum = Math.max(2, Math.min(12, Number(v) || 7)); this.repaint(); }
    if (id === 'spin' && !this.spinning) {
      const n = this.results.reduce((s, x) => s + x, 0);
      const to = this.angle + 360 * 4 + Math.floor(mulberry32(40 + n)() * 360);   // seeded: the same spins every mount
      this.spinning = true;
      this.repaint();
      requestAnimationFrame(() => { const d = this.root.querySelector('.ch-disc'); if (d) d.style.transform = `rotate(${to}deg)`; });
      this.after(SPIN_S, () => {
        this.angle = to % 360;
        this.spinning = false;
        this.results[spinnerSector(SECTORS, this.angle)] += 1;
        this.repaint();
        this.requestUiUpdate?.();
      });
    }
    this.requestUiUpdate?.();
  }

  paint(st) { return [this.dice, this.coins, this.spinner, this.cards][this.stepIndex].call(this, st); }

  dice(st) {
    const side = Math.min(st.portrait ? st.W : st.W - 200, st.H);
    const g = outcomeGrid({ x: 0, y: 0, w: side, h: side }, 6, 6);
    const die = (f) => (x, y, s) => dieSvg(x, y, s * 0.9, f).svg;
    const out = outcomeGridSvg(g, { label: (i, j) => i + j + 2, tone: (i, j) => (i + j + 2 === this.sum ? 2 : null), heads: [[1, 2, 3, 4, 5, 6].map(die), [1, 2, 3, 4, 5, 6].map(die)] });
    const n = [...Array(36).keys()].filter((q) => Math.floor(q / 6) + (q % 6) + 2 === this.sum).length;
    if (!st.portrait) out.over += cardHtml(st.W - 184, 10, 184, 'two dice', [{ label: 'sum', value: String(this.sum), tone: 2 }, { label: 'ways', value: String(n), tone: 2 }, { label: 'outcomes', value: '36' }], { tone: 2 });
    return { ...out, head: chip(`P(sum ${this.sum}) = ${fracHtml(n, 36)}`, 0, 0, { tone: 2, size: 'big', static: true, math: true }) };
  }

  coins(st) {
    const t = treeLayout([[{ text: 'H', p: 0.5, pText: '1/2' }, { text: 'T', p: 0.5, pText: '1/2' }], [{ text: 'H', p: 0.5, pText: '1/2' }, { text: 'T', p: 0.5, pText: '1/2' }]], { rect: { x: 0, y: 10, w: st.W - (st.portrait ? 120 : 190), h: st.H - 20 } });
    const out = treeSvg(t, { path: [0, 1], grow: true });
    for (const leaf of t.leaves) {
      const s = leaf.path.map((i) => 'HT'[i]).join('');
      out.svg += coinSvg(leaf.x + 44, leaf.y, 15, s[0]).svg + coinSvg(leaf.x + 80, leaf.y, 15, s[1]).svg;
      out.over += chip('1/4', leaf.x + 130, leaf.y, { tone: s === 'HT' ? 2 : 'plain', size: 'sm' });
    }
    return { ...out, head: chip('heads, then tails: 1/2 x 1/2', 0, 0, { tone: 2, size: 'big', static: true }) };
  }

  spinner(st) {
    const r = st.portrait ? 130 : 150, sx = st.portrait ? st.W / 2 : r + 30, sy = r + 30;
    const bx = st.portrait ? st.W / 2 : st.W - 110, by = st.portrait ? sy + r + 150 : 300;
    const out = join(spinnerSvg(sx, sy, r, SECTORS, this.angle, { spin: true }), bagSvg(bx, by, [{ tone: 1, n: 3 }, { tone: 4, n: 2 }, { tone: 3, n: 1 }], { r: 72 }));
    out.over += chip('same odds: 3 : 2 : 1', bx, by - 120, { tone: 'plain', size: 'sm' });
    if (!st.portrait) this.results.forEach((n, i) => { out.svg += tallySvg(sx + r + 50, 70 + i * 44, n, { size: 28, tone: [1, 4, 3][i] }).svg; });
    const total = this.results.reduce((s, x) => s + x, 0);
    return { ...out, head: chip(this.spinning ? 'spinning...' : total ? `${total} spins: ${this.results.join(' / ')}` : 'press Spin', 0, 0, { tone: 1, size: 'big', static: true }) };
  }

  cards(st) {
    const g = cardGrid({ x: 0, y: 30, w: st.W, h: st.H - 40 });
    let svg = '', over = '';
    g.ranks.forEach((r) => { const c = g.cell(r, 'S'); over += chip(r, c.x + c.w / 2, 12, { tone: 'plain', size: 'sm' }); });
    g.suits.forEach((s, si) => g.ranks.forEach((r, ri) => {
      const c = g.cell(r, s);
      svg += `<g class="sv-pop" style="--d:${((ri + si) * 0.025).toFixed(3)}s">${cardSvg(c.x + c.w / 2, c.y + c.h / 2, Math.min(c.w * 0.84, c.h / 1.5), r, s, { hi: s === 'H' ? 4 : null }).svg}</g>`;
    }));
    return { svg, over, head: chip(`hearts: ${fracHtml(13, 52)} = ${fracHtml(1, 4)}`, 0, 0, { tone: 4, size: 'big', static: true, math: true }) };
  }
}
