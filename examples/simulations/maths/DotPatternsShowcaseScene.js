/**
 * DotPatternsShowcaseScene - reference for kit/SimDots.js (SVG, DOM). Flat dots and tiles on graph paper.
 * Beats: 0 rows of dots (a staircase) and its upside-down copy, 1 the zigzag rectangle (two halves, one count),
 * 2 a square grown by L-shaped layers, 3 the Sierpinski triangle as tiles, stage 0 to 3.
 * The Next stage chip (in the figure) grows the pattern; the new cells arrive staggered and rest.
 */
import { SvgScene, chip } from 'simulations/base/kit/SimSvg.js';
import { flowChipHtml, bindFlow } from 'simulations/base/kit/SimFlowDom.js';
import { triangleRows, mirror, shift, rect, lLayer, zigzagSplit, sierpinski, patternSvg, zigzagSvg, fitCell, arriveSeconds, count } from 'simulations/base/kit/SimDots.js';

const MAP = [0, 1, 2, 3].map((i) => [{ idx: i, dwellMs: null }]);
const START = [4, 5, 3, 1], MAX = [7, 7, 6, 3];

export class DotPatternsShowcaseScene extends SvgScene {
  static WIDTH = 560;
  static PORTRAIT_WIDTH = 380;
  static PAPER = 'graph';
  static BEAT_STEP_MAP = MAP;
  static CONTROLS = [];
  static ARIA_LABEL = 'Dot and tile patterns: rows of dots and their upside-down copy, a rectangle split by a zigzag into two equal halves, a square grown by L-shaped layers, and the Sierpinski triangle.';

  async setup() {
    this.n = START[0];
    this.grew = false;
    await super.setup();
    bindFlow(this.root, { action: (a) => { if (a === 'grow') this.grow(); } });
  }

  enter(step) { this.n = START[step] ?? 1; this.grew = false; this.fresh = true; }

  stageHeight(st) { return st.portrait ? 440 : 360; }

  grow() {
    if (this.n >= MAX[this.stepIndex]) { this.n = START[this.stepIndex]; this.fresh = true; } else { this.n += 1; this.grew = true; this.fresh = false; }
    this.repaint();
  }

  paint(st) {
    const view = [this.rows, this.zigzag, this.layers, this.tri][this.stepIndex].call(this, st);
    const last = this.n >= MAX[this.stepIndex];
    view.head = chip(view.title, 0, 0, { tone: 1, size: 'big', static: true }) + flowChipHtml({ label: last ? 'Start again' : 'Next stage', action: 'grow', icon: last ? 'replay' : 'next' });
    this.grew = false;
    this.fresh = false;
    return view;
  }

  // Beat 0: stage n = rows 1..n; its half-turned copy sits beside it, ghosted until the last stage.
  rows(st) {
    const n = this.n, A = triangleRows(n), B = shift(mirror(triangleRows(n), 'rot'), n + 1, 0);
    const cell = fitCell([...A, ...B], st.W - 60, st.H - 110, { max: 46 });
    const w = (2 * n + 1) * cell, x = (st.W - w) / 2, y = 48;
    const a = patternSvg(A, { x, y, cell, tone: 1, label: `stage ${n}: ${count(A)} dots`, arrive: this.grew || this.fresh, arriveFrom: this.grew ? count(triangleRows(n - 1)) : 0 });
    const b = patternSvg(B, { x, y, cell, tone: 2, ghost: n < MAX[0], label: 'upside-down copy', labelTone: 2, labelAbove: true });
    return { svg: a.svg + b.svg, over: a.over + b.over, title: 'Rows of dots' };
  }

  // Beat 1: (n + 1) x n, the zigzag between the halves; each half holds 1 + 2 + ... + n.
  zigzag(st) {
    const n = this.n, Z = zigzagSplit(n);
    const cell = fitCell(Z, st.W - 80, st.H - 120, { max: 46 });
    const x = (st.W - (n + 1) * cell) / 2, y = 30;
    const p = patternSvg(Z, { x, y, cell, tones: { top: 3, bottom: 4 }, arrive: this.grew || this.fresh, label: `${n + 1} x ${n} = ${n * (n + 1)}`, labelTone: 'accent' });
    const z = zigzagSvg(n, { x, y, cell, draw: true });
    const half = `<text x="${x + (n + 1) * cell + 12}" y="${y + cell * 0.8}" style="fill:var(--sim-series-3-ink);font:800 20px var(--sim-font)">${count(Z, 'top')}</text>`
      + `<text x="${x - 12}" y="${y + n * cell - 8}" text-anchor="end" style="fill:var(--sim-series-4-ink);font:800 20px var(--sim-font)">${count(Z, 'bottom')}</text>`;
    return { svg: p.svg + z.svg + half, over: p.over, title: 'Two equal halves' };
  }

  // Beat 2: the (n-1) square rests; the new L-shaped layer lights.
  layers(st) {
    const n = this.n, S = rect(n - 1, n - 1, { part: 'square' }), L = lLayer(n);
    const cell = fitCell([...S, ...L], st.W - 80, st.H - 120, { max: 56 });
    const x = (st.W - n * cell) / 2, y = 30;
    const p = patternSvg([...S, ...L], { x, y, cell, shape: 'tile', tones: { square: 5, layer: 8 }, lit: ['layer'], dim: 0.45, arrive: this.grew || this.fresh, arriveFrom: this.fresh ? 0 : S.length, label: `${(n - 1) ** 2} + ${2 * n - 1} = ${n * n}`, labelTone: 8 });
    return { svg: p.svg, over: p.over, title: 'An L-shaped layer' };
  }

  // Beat 3: stage n of the Sierpinski triangle; the cut-out tiles stay as ghosts.
  tri(st) {
    const k = this.n, T = sierpinski(k, { holes: true });
    const cell = fitCell(T, st.W - 80, st.H - 120, { shape: 'tri', max: 300 });
    const side = cell * 2 ** k, x = (st.W - side) / 2, y = 30;
    const p = patternSvg(T, { x, y, cell, shape: 'tri', tone: 1, ghost: ['hole'], outline: true, arrive: this.grew || this.fresh, label: `stage ${k}: ${count(T, 'kept')} triangles` });
    return { svg: p.svg, over: p.over, title: 'Sierpinski triangle' };
  }

  testState() { return { stage: this.stepIndex, n: this.n, settle: arriveSeconds(42) }; }
}
