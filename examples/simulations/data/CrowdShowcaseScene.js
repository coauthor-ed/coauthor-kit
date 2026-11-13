/**
 * CrowdShowcaseScene - every SimCrowd layout and move, on one crowd of 120 people (and a big one of 600 dots).
 * Next / Previous between adjacent beats flies the dots from the last layout; a cold landing (deep link)
 * draws the layout at rest. Numbers are illustrative.
 *   0 scatter: the town          1 grid: one block, ill first      2 groups: exposed | not exposed
 *   3 cells: a 2 x 2 with a b c d 4 strips: bands, x = time of event 5 swarm: by age, an axis
 *   6 tones: series colours, ghosts (not known), marks (ring, tick, cross)
 *   7 lit / dim: one cell lit       8 a big town: 1 dot = 5 people  9 the big town sorted (600 dots in flight)
 */
import { SvgScene } from 'simulations/base/kit/SimSvg.js';
import {
  SIM_CROWD_CSS, crowdLive, gridLayout, scatterLayout, groupsLayout, cellsLayout, stripsLayout, swarmLayout,
  perDot, bracketSvg, rulesSvg, axisParts, legendHtml, countOf,
} from 'simulations/base/kit/SimCrowd.js';

function rnd(seed) {
  let a = seed;
  return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
}
// 120 people: 48 exposed (18 ill), 72 not exposed (9 ill); a group 0..3, an age, a time of event.
const PEOPLE = (() => {
  const r = rnd(5), out = [];
  for (let i = 0; i < 120; i++) {
    const exposed = i < 48, ill = exposed ? i < 18 : i < 57;
    out.push({ id: `p${i}`, exposed, ill, group: Math.floor(r() * 4), age: Math.round(8 + 70 * (r() + r() + r()) / 3), t: r() });
  }
  return out;
})();
// 3000 people at 1 dot = 5 (600 dots), 90 dots ill, 250 exposed.
const BIG = Array.from({ length: 600 }, (_, i) => ({ id: `q${i}`, ill: (i * 7) % 600 < 90, exposed: (i * 11) % 600 < 250 }));
const illFirst = (a, b) => (b.ill - a.ill) || (b.exposed - a.exposed);
const KIND = ['scatter', 'grid', 'groups', 'cells', 'strips', 'swarm', 'tones', 'lit', 'big', 'bigsort'];
const TITLE = [
  'The town: 120 people', 'One block, ill first', 'Split by exposure', 'Then by outcome: four cells',
  'Bands: when each person fell ill', 'Sorted by age', 'Other uses: series colours, not known, picked',
  'One cell lit, the rest dimmed', '3,000 people, 1 dot = 5 people', 'The big town sorted, 600 dots',
];

export class CrowdShowcaseScene extends SvgScene {
  static BEAT_STEP_MAP = KIND.map((_, i) => [{ idx: i, dwellMs: null }]);
  static ARIA_LABEL = 'A crowd of dots, one dot per person, shown as a town, a block, two groups, a 2 by 2 table, bands over time, a swarm by age, and a big town of 600 dots sorted.';
  static CONTROLS = [];

  enter(step) {
    const last = this._last;
    this.cameFrom = last != null && Math.abs(last - step) === 1 ? last : null;
    this._last = step;
  }

  stageHeight(st) { return st.portrait ? 560 : 440; }

  // The layout of a step: a pure function of (step, stage size).
  layoutOf(k, st) {
    const W = st.W, H = st.H, P = st.portrait, M = 16;
    const kind = KIND[k];
    if (kind === 'scatter') return scatterLayout(PEOPLE, { x: M, y: M, w: W - 2 * M, h: H - 2 * M }, { seed: 4 });
    if (kind === 'grid') return gridLayout(PEOPLE, { x: M, y: 56, w: W - 2 * M, h: H - 56 - M }, { sort: illFirst, label: 'Everyone' });
    if (kind === 'groups') {
      return groupsLayout(PEOPLE, { x: M, y: 44, w: W - 2 * M, h: H - 44 - 30 }, {
        groups: [{ key: true, label: 'Exposed' }, { key: false, label: 'Not exposed' }], groupOf: (p) => p.exposed,
        dir: P ? 'col' : 'row', gutter: P ? 64 : 40, align: 'top', sort: illFirst,
      });
    }
    if (kind === 'cells') {
      const left = P ? 96 : 132;
      return cellsLayout(PEOPLE, { x: left, y: 40, w: W - left - M, h: H - 40 - M }, { padTop: 34, gutter: 20 });
    }
    if (kind === 'strips') {
      const left = P ? 84 : 104;
      return stripsLayout(PEOPLE, { x: left, y: M, w: W - left - M, h: H - 2 * M - 30 }, { bands: ['Week 1', 'Week 2', 'Week 3', 'Week 4'], band: (p) => p.group, x: (p) => p.t });
    }
    if (kind === 'swarm') return swarmLayout(PEOPLE, { x: M + 10, y: 24, w: W - 2 * M - 20, h: H - 24 - 64 }, { value: (p) => p.age, min: 0, max: 80 });
    if (kind === 'tones') {
      return cellsLayout(PEOPLE, { x: M, y: 8, w: W - 2 * M, h: H - 8 - M }, {
        table: P ? [2, 2] : [1, 4], row: (p) => (P ? p.group >> 1 : 0), col: (p) => (P ? p.group & 1 : p.group),
        names: ['Group 1', 'Group 2', 'Group 3', 'Group 4'], padTop: 34, gutter: 18, align: 'top',
      });
    }
    if (kind === 'lit') return cellsLayout(PEOPLE, { x: P ? 96 : 132, y: 40, w: W - (P ? 96 : 132) - M, h: H - 40 - M }, { padTop: 34, gutter: 20 });
    const rect = { x: M, y: 44, w: W - 2 * M, h: H - 44 - M };
    if (kind === 'big') return scatterLayout(BIG, { x: M, y: M, w: W - 2 * M, h: H - 2 * M }, { seed: 9 });
    return groupsLayout(BIG, rect, { groups: [{ key: true, label: 'Ill' }, { key: false, label: 'Well' }], groupOf: (p) => p.ill, dir: P ? 'col' : 'row', gutter: 36, align: 'bottom', sort: illFirst, sameCols: true });
  }

  peopleOf(k) {
    const kind = KIND[k];
    if (kind === 'big' || kind === 'bigsort') return BIG;
    if (kind === 'tones') return PEOPLE.map((p, i) => ({ ...p, tone: p.group + 1, exposed: true, ghost: i % 13 === 5, mark: i === 3 ? 'ring' : i === 9 ? 'tick' : i === 14 ? 'cross' : null }));
    if (kind === 'lit') return PEOPLE.map((p) => ({ ...p, lit: p.exposed && p.ill, dim: !(p.exposed && p.ill) }));
    return PEOPLE;
  }

  paint(st) {
    const k = this.stepIndex, kind = KIND[k], lay = this.layoutOf(k, st), P = st.portrait;
    this.lay = lay;
    this.from = this.cameFrom != null ? this.layoutOf(this.cameFrom, st) : null;
    let svg = '', over = '';
    if (kind === 'groups' || kind === 'bigsort') for (const b of lay.boxes) svg += bracketSvg(b, { side: kind === 'bigsort' ? 'below' : 'below' });
    if (kind === 'cells' || kind === 'lit' || kind === 'strips' || kind === 'tones') svg += rulesSvg(lay);
    if (kind === 'cells' || kind === 'lit') {
      const a = lay.boxes.map((b) => b.area);
      const head = (x, y, t, cls = '') => `<span class="csh-head-lab${cls}" style="left:${x}px;top:${y}px">${t}</span>`;
      over += head(a[0].x + a[0].w / 2, 20, 'Ill') + head(a[1].x + a[1].w / 2, 20, 'Well');
      over += head(a[0].x - 14, a[0].y + a[0].h / 2, P ? 'Exp.' : 'Exposed', ' csh-row') + head(a[2].x - 14, a[2].y + a[2].h / 2, P ? 'Not exp.' : 'Not exposed', ' csh-row');
    }
    if (kind === 'strips') for (const b of lay.boxes) over += `<span class="csh-head-lab csh-row" style="left:${b.area.x - 12}px;top:${b.area.y + b.area.h / 2}px">${b.label}</span>`;
    if (kind === 'strips') {
      const y = lay.boxes.at(-1).area.y + lay.boxes.at(-1).area.h + 8, x0 = lay.boxes[0].area.x, x1 = x0 + lay.boxes[0].area.w;
      svg += `<line class="scw-axis" x1="${x0}" y1="${y}" x2="${x1}" y2="${y}"/>`;
      over += `<span class="scw-tk" style="left:${x0 + 24}px;top:${y + 6}px">Monday</span><span class="scw-tk" style="left:${x1 - 24}px;top:${y + 6}px">Sunday</span>`;
    }
    if (kind === 'swarm') {
      const ax = axisParts(lay, { ticks: [0, 20, 40, 60, 80], label: 'age, years' });
      svg += ax.svg; over += ax.over;
    }
    if (kind === 'big' || kind === 'bigsort') {
      const k5 = perDot(3000, st.W - 32, st.H - 60);
      over += `<span class="csh-note" style="left:${st.W - 16}px;top:${st.H - 4}px">1 dot = ${Math.max(5, k5)} people</span>`;
    }
    const legend = kind === 'tones' ? legendHtml({ items: [{ label: 'not known', ghost: true }, { label: 'picked', filled: true }] })
      : kind === 'big' || kind === 'bigsort' ? legendHtml({ show: ['ill', 'well'] }) : legendHtml();
    const n = countOf(this.peopleOf(k), (p) => p.ill);
    const head = `<div class="csh-top"><b class="csh-title">${TITLE[k]}</b><span class="csh-sub">${n} ill</span></div>${legend}`;
    return { svg, over, head };
  }

  animate() {
    const k = this.stepIndex, kind = KIND[k], t0 = performance.now();
    const labels = kind === 'grid' ? { place: 'above' } : kind === 'groups' ? { place: 'above' } : kind === 'cells' || kind === 'lit' ? { place: 'above', letter: true }
      : kind === 'tones' ? { place: 'above' } : kind === 'bigsort' ? { place: 'above', big: true } : null;
    const res = crowdLive(this.live, 'crowd', this.peopleOf(k), this.lay, { from: this.from, labels, order: kind === 'bigsort' ? 'group' : 'row' });
    // Frame times while dots fly (window.__scene.perf()).
    if (res.moving) {
      const now = performance.now(), pf = this._pf ?? (this._pf = { frames: 0, gaps: [], work: [], last: 0, n: res.total });
      if (pf.last) pf.gaps.push(now - pf.last);
      pf.last = now; pf.frames++; pf.n = res.total; pf.work.push(performance.now() - t0);
    } else if (this._pf) this._pf.last = 0;
  }

  perf() {
    const pf = this._pf;
    if (!pf || !pf.gaps.length) return 'no frames';
    const s = [...pf.gaps].sort((a, b) => a - b), w = [...pf.work].sort((a, b) => a - b);
    const q = (a, f) => a[Math.min(a.length - 1, Math.floor(a.length * f))].toFixed(1);
    return `dots ${pf.n} frames ${pf.frames} gap median ${q(s, 0.5)} ms p95 ${q(s, 0.95)} ms; animate() median ${q(w, 0.5)} ms p95 ${q(w, 0.95)} ms`;
  }

  css() {
    return SIM_CROWD_CSS + `
.svs-head { flex-direction: column; align-items: flex-start; gap: 6px; }
.csh-top { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
.csh-title { font: 700 var(--sim-text-lg)/1.2 var(--sim-font); color: var(--sim-label); }
.csh-sub { font: 600 var(--sim-text-md)/1.2 var(--sim-font); color: var(--sim-annot); }
.csh-head-lab { position: absolute; transform: translate(-50%, -50%); white-space: nowrap; font: 700 var(--sim-text-md)/1.1 var(--sim-font); color: var(--sim-label); }
.csh-row { transform: translate(-100%, -50%); text-align: right; }
.csh-note { position: absolute; transform: translate(-100%, -100%); white-space: nowrap; font: 600 var(--sim-text-sm)/1 var(--sim-font); color: var(--sim-label-muted); }
`;
  }
}
