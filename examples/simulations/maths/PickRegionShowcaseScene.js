/**
 * PickRegionShowcaseScene - simPick with a non-rectangular drop target and a
 * spring settle. Eight number chips go into a two-ring Venn diagram (A:
 * multiples of 2, B: multiples of 3): A only, both, B only, or neither.
 *
 * targetAt: the drop region is decided by circle maths on the pointer point
 * (client -> SVG viewBox via getScreenCTM), not by the slot rectangles, so a
 * chip let go anywhere inside the lens lands in "both". Outside the diagram it
 * returns undefined, so the usual [data-bin] hit-test still finds the tray.
 * settle: 'spring': a dropped chip glides to its slot; a chip let go off the
 * board springs home. The slots are still [data-bin] elements, so tap-then-tap
 * and the keyboard path (Tab, Enter, arrows) work unchanged.
 *
 * Beat-less (a board). When all eight are placed, each chip is marked right or wrong.
 */
import { DomSimulation } from 'simulations/base/DomSimulation.js';
import { esc } from 'simulations/base/SimUi.js';
import { simPick } from 'simulations/base/kit/SimPick.js';

// Venn geometry in viewBox units (420 x 320).
const VW = 420, VH = 320, R = 100;
const CA = { x: 150, y: 140 }, CB = { x: 250, y: 140 };
const P1 = '200 53.4', P2 = '200 226.6';     // the two ring crossings
const PATHS = {
  none: 'M16 0H404A16 16 0 0 1 420 16V304A16 16 0 0 1 404 320H16A16 16 0 0 1 0 304V16A16 16 0 0 1 16 0Z' +
    `M${P1}A${R} ${R} 0 1 0 ${P2}A${R} ${R} 0 1 0 ${P1}Z`,
  a: `M${P1}A${R} ${R} 0 1 0 ${P2}A${R} ${R} 0 0 1 ${P1}Z`,
  both: `M${P1}A${R} ${R} 0 0 1 ${P2}A${R} ${R} 0 0 1 ${P1}Z`,
  b: `M${P1}A${R} ${R} 0 1 1 ${P2}A${R} ${R} 0 0 0 ${P1}Z`,
};
// Chip slots, in percent of the viewBox (left, top, width, height).
const SLOTS = [
  ['a', 'A only: multiples of 2, not of 3', [13.1, 29.7, 20.2, 28.1]],
  ['both', 'Both A and B: multiples of 2 and of 3', [37.1, 31.3, 21, 25]],
  ['b', 'B only: multiples of 3, not of 2', [61.9, 29.7, 20.2, 28.1]],
  ['none', 'Neither A nor B', [2.4, 77.5, 95.2, 20.6]],
];
const NUMS = [2, 3, 4, 5, 6, 7, 9, 12];
const home = (n) => (n % 6 === 0 ? 'both' : n % 2 === 0 ? 'a' : n % 3 === 0 ? 'b' : 'none');

/** Which region holds viewBox point p: 'a' | 'both' | 'b' | 'none' | undefined (off the diagram). */
function regionOf(p) {
  const inA = (p.x - CA.x) ** 2 + (p.y - CA.y) ** 2 <= R * R;
  const inB = (p.x - CB.x) ** 2 + (p.y - CB.y) ** 2 <= R * R;
  if (inA && inB) return 'both';
  if (inA) return 'a';
  if (inB) return 'b';
  return p.x >= 0 && p.x <= VW && p.y >= 0 && p.y <= VH ? 'none' : undefined;
}

const CSS = `
.pr { position: absolute; inset: 0; box-sizing: border-box; padding: 18px 20px; font-family: var(--sim-font); color: var(--sim-label); display: flex; flex-direction: column; gap: 10px; }
.pr__title { font: 800 20px/1.2 var(--sim-font-display); margin: 0; }
.pr__sub { font: 700 15px/1.3 var(--sim-font); color: var(--sim-label-muted); margin: 0; }
.pr__tray { display: flex; flex-wrap: wrap; gap: 8px; min-height: 44px; padding: 4px; border-radius: 14px; align-content: center; }
.pr__chip { box-sizing: border-box; min-width: 38px; height: 38px; padding: 0 8px; display: inline-flex; align-items: center; justify-content: center; background: var(--sim-bg-surface); border: 2px solid var(--sim-stroke); border-radius: 12px; font: 800 17px/1 var(--sim-font); color: var(--sim-label); box-shadow: 0 3px 0 color-mix(in oklab, var(--sim-stroke) 60%, var(--sim-bg-deep)); }
.pr__chip[data-ok="1"] { border-color: var(--sim-good); }
.pr__chip[data-ok="0"] { border-color: var(--sim-bad); border-style: dashed; }
.pr__legend { display: flex; flex-wrap: wrap; gap: 4px 18px; font: 800 15px/1.3 var(--sim-font); }
.pr__key { display: inline-flex; align-items: center; gap: 6px; }
.pr__key i { width: 14px; height: 14px; border-radius: 50%; border: 3px solid var(--sim-series-1); box-sizing: border-box; }
.pr__key--b i { border-color: var(--sim-series-2); }
.pr__stage { flex: 1; min-height: 0; display: flex; justify-content: center; }
.pr__venn { position: relative; height: 100%; aspect-ratio: ${VW} / ${VH}; }
.sim-dom-root--portrait .pr__stage { flex: none; }
.sim-dom-root--portrait .pr__venn { width: 100%; height: auto; }
.pr__venn svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.pr__rg { transition: fill 0.15s ease; }
.pr__rg--none { fill: var(--sim-bg-surface); stroke: var(--sim-stroke); stroke-width: 2; }
.pr__rg--a { fill: color-mix(in oklab, var(--sim-series-1) 20%, var(--sim-bg-surface)); }
.pr__rg--b { fill: color-mix(in oklab, var(--sim-series-2) 20%, var(--sim-bg-surface)); }
.pr__rg--both { fill: color-mix(in oklab, color-mix(in oklab, var(--sim-series-1) 50%, var(--sim-series-2)) 30%, var(--sim-bg-surface)); }
.pr__rg--none[data-over] { fill: color-mix(in oklab, var(--sim-accent) 14%, var(--sim-bg-surface)); }
.pr__rg--a[data-over] { fill: color-mix(in oklab, var(--sim-series-1) 45%, var(--sim-bg-surface)); }
.pr__rg--b[data-over] { fill: color-mix(in oklab, var(--sim-series-2) 45%, var(--sim-bg-surface)); }
.pr__rg--both[data-over] { fill: color-mix(in oklab, color-mix(in oklab, var(--sim-series-1) 50%, var(--sim-series-2)) 55%, var(--sim-bg-surface)); }
.pr__ring { fill: none; stroke-width: 3; }
.pr__ring--a { stroke: var(--sim-series-1); }
.pr__ring--b { stroke: var(--sim-series-2); }
.pr__ltr { font: 800 22px var(--sim-font-display); }
.pr__ltr--a { fill: var(--sim-series-1-ink); }
.pr__ltr--b { fill: var(--sim-series-2-ink); }
.pr__slot { position: absolute; box-sizing: border-box; display: flex; flex-wrap: wrap; gap: 4px; align-content: center; justify-content: center; border-radius: 40%; }
.pr__slot .pr__chip { min-width: 32px; height: 32px; padding: 0 4px; font-size: 16px; box-shadow: none; }
.pr__msg { font: 800 15px/1.3 var(--sim-font); min-height: 20px; margin: 0; }
`;

export class PickRegionShowcaseScene extends DomSimulation {
  static WIDTH = 680;
  static HEIGHT = 520;
  static PORTRAIT_WIDTH = 380;
  static PORTRAIT_HEIGHT = 640;
  static ARIA_LABEL =
    'Eight number chips and a Venn diagram with two overlapping rings: A, multiples of 2, and B, multiples of 3. ' +
    'Drag each chip into A only, both rings, B only, or outside both; or tap a chip and then a region.';
  static CONTROLS = [];

  constructor(container, config) {
    super(container, config);
    this.where = {};   // chip id -> region id
  }

  async setup() {
    await super.setup();
    const rg = (id) => `<path class="pr__rg pr__rg--${id}" data-region="${id}" d="${PATHS[id]}"${id === 'none' ? ' fill-rule="evenodd"' : ''}/>`;
    this.render({
      css: CSS,
      html: `<div class="pr">
        <h2 class="pr__title">Where does each number belong?</h2>
        <p class="pr__sub">Drag a chip into the right part of the diagram, or tap the chip and then the part.</p>
        <div class="pr__tray" data-bin="tray" aria-label="Tray"></div>
        <div class="pr__legend"><span class="pr__key"><i></i>A: multiples of 2</span><span class="pr__key pr__key--b"><i></i>B: multiples of 3</span></div>
        <div class="pr__stage"><div class="pr__venn">
          <svg viewBox="0 0 ${VW} ${VH}" aria-hidden="true">
            ${rg('none')}${rg('a')}${rg('b')}${rg('both')}
            <circle class="pr__ring pr__ring--a" cx="${CA.x}" cy="${CA.y}" r="${R}"/>
            <circle class="pr__ring pr__ring--b" cx="${CB.x}" cy="${CB.y}" r="${R}"/>
            <text class="pr__ltr pr__ltr--a" x="58" y="56" text-anchor="middle">A</text>
            <text class="pr__ltr pr__ltr--b" x="362" y="56" text-anchor="middle">B</text>
          </svg>
          ${SLOTS.map(([id, lbl, [l, t, w, h]]) => `<div class="pr__slot" data-bin="${id}" aria-label="${esc(lbl)}" style="left:${l}%;top:${t}%;width:${w}%;height:${h}%"></div>`).join('')}
        </div></div>
        <p class="pr__msg" data-msg aria-live="polite"></p>
      </div>`,
    });
    this.svg = this.root.querySelector('svg');
    this.pick = simPick(this.root, {
      items: '[data-item]', targets: '[data-bin]', settle: 'spring',
      targetAt: (pt) => this.regionAt(pt),
      onOver: (id) => this.root.querySelectorAll('[data-region]').forEach((el) => el.toggleAttribute('data-over', el.dataset.region === id)),
      onDrop: (item, bin) => {
        if (bin === 'tray') delete this.where[item]; else this.where[item] = bin;
        this.paint();
      },
    });
    this.paint();
  }

  /** Client point -> viewBox point -> region (undefined off the diagram: the tray hit-test takes over). */
  regionAt(pt) {
    const m = this.svg?.getScreenCTM?.();
    if (!m) return undefined;
    const p = new DOMPoint(pt.clientX, pt.clientY).matrixTransform(m.inverse());
    return regionOf(p);
  }

  busy() { return !!this.pick?.settling; }

  destroy() { this.pick?.destroy?.(); super.destroy(); }

  paint() {
    const done = NUMS.every((n) => this.where['n' + n]);
    const chip = (n) => `<div class="pr__chip" data-item="n${n}" data-ok="${done ? (this.where['n' + n] === home(n) ? 1 : 0) : ''}">${n}</div>`;
    const tray = this.root.querySelector('[data-bin="tray"]');
    if (!tray) return;                           // headless fake DOM (no HTML parser)
    tray.innerHTML = NUMS.filter((n) => !this.where['n' + n]).map(chip).join('');
    for (const [id] of SLOTS) this.root.querySelector(`[data-bin="${id}"]`).innerHTML = NUMS.filter((n) => this.where['n' + n] === id).map(chip).join('');
    const wrong = NUMS.filter((n) => this.where['n' + n] && this.where['n' + n] !== home(n)).length;
    this.root.querySelector('[data-msg]').textContent = !done ? '' : wrong
      ? 'Not yet: ' + wrong + ' chip(s) sit in the wrong part. Drag them again.'
      : 'All placed: 6 and 12 are in both rings, because they are multiples of 2 and of 3.';
    this.pick.refresh();
  }
}
