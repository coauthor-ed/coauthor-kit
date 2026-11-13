/**
 * TapLightSvgShowcaseScene - kit/TapLight.js in an SVG scene: the parts of a distillation apparatus.
 *   Beat 0: chips bulb, side arm, condenser, receiver light the parts they name; the rest dims
 *   Beat 1: another chip list, this time written as notation (subscripts), following the water
 *   Beat 2: the scene presets condenser and locks the row: the beat is about that part
 * The part only says which targets are lit. This file decides what lit means: dim the others, thicken the line.
 * Portrait is its own stage; the row sits under the figure, inside the scene.
 */
import { SvgScene, chip, fill, stroke, shade } from 'simulations/base/kit/SimSvg.js';
import { subHtml } from 'simulations/base/kit/SimText.js';
import { tapLight } from 'simulations/base/kit/TapLight.js';

const MAP = [0, 1, 2].map((idx) => [{ idx, dwellMs: null }]);
const GLASS = 'var(--sim-glass)';
const WATER = 'var(--sim-water)';
const DESIGN_W = 640, DESIGN_H = 340;

const PARTS = [
  { id: 'bulb', label: 'bulb', targets: ['flask', 'liquid'], tone: 1 },
  { id: 'arm', label: 'side arm', targets: ['arm', 'vapour'], tone: 2 },
  { id: 'condenser', label: 'condenser', targets: ['jacket', 'tube', 'coolant'], tone: 3 },
  { id: 'receiver', label: 'receiver', targets: ['beaker', 'drops'], tone: 4 },
];
const WATER_CHIPS = [
  { id: 'liquid', html: `${subHtml('H', 2)}O (l)`, label: 'H2O (l)', say: 'liquid water', targets: ['liquid', 'drops'], tone: 1 },
  { id: 'gas', html: `${subHtml('H', 2)}O (g)`, label: 'H2O (g)', say: 'water vapour', targets: ['vapour', 'tube'], tone: 2 },
  { id: 'salt', html: 'Na<sup class="sim-sup">+</sup> stays', label: 'Na+ stays', say: 'sodium ions stay behind', targets: ['liquid', 'flask'], tone: 5 },
];
const NOTE = ['', 'Follow the water', 'The vapour turns back to liquid here'];
const SPOTS = { bulb: [150, 300], arm: [300, 66], condenser: [380, 262], receiver: [560, 320], liquid: [150, 300], gas: [300, 66], salt: [150, 300] };

export class TapLightSvgShowcaseScene extends SvgScene {
  static BEAT_STEP_MAP = MAP;
  static ARIA_LABEL = 'A distillation apparatus: a round flask over a burner, a side arm, a sloping condenser with a cooling jacket, and a receiver beaker. Chips under the figure light one part and dim the rest.';
  static CONTROLS = [];

  tl = tapLight({ label: 'Parts of the apparatus', chips: PARTS, onChange: () => this.repaint() });

  async setup() {
    await super.setup();
    this.tl.mount(this.root, this);
  }

  destroy() { this.tl.destroy(); super.destroy(); }

  enter(step) {
    if (step === 0) this.tl.set({ chips: PARTS, lit: null, disabled: false });
    else if (step === 1) this.tl.set({ chips: WATER_CHIPS, lit: null, disabled: false });
    else this.tl.set({ chips: PARTS, lit: 'condenser', disabled: true });
  }

  stageHeight(st) { return Math.round((st.W / DESIGN_W) * DESIGN_H) + 34; }

  /** One part: dimmed when something else is lit, a heavier line when it is lit itself. */
  _part(id, body) {
    const lit = this.tl.has(id);
    return `<g data-part="${id}" data-lit="${lit ? 'on' : this.tl.off(id) ? 'off' : 'rest'}" style="opacity:${this.tl.off(id) ? 0.2 : 1};--w:${lit ? 2 : 1}">${body}</g>`;
  }

  paint(st) {
    const k = st.W / DESIGN_W, line = (w) => `calc(${w}px * var(--w))`;
    const wall = (d, extra = '') => `<path d="${d}" ${stroke(GLASS, line(5), extra)}/>`;
    const flask = wall('M126 92 V128 A78 78 0 1 0 174 128 V92');
    const liquid = `<path d="M84 214 A72 72 0 0 0 216 214 Q150 202 84 214 Z" ${fill(`color-mix(in oklab, ${WATER} 62%, var(--sim-bg-surface))`)}/>`;
    const arm = wall('M174 104 H262 L296 118');
    const vapour = `<path d="M150 190 V100 H256 L330 132" ${stroke('var(--sim-label-muted)', line(3), 'stroke-dasharray:3 12')}/>`;
    const jacket = `<g transform="rotate(16 400 158)"><rect x="296" y="130" width="208" height="56" rx="20" ${fill(`color-mix(in oklab, ${WATER} 22%, var(--sim-bg-surface))`, `stroke:${GLASS};stroke-width:${line(5)}`)}/></g>`;
    const tube = wall('M284 112 L520 180 L530 214');
    const coolant = `<path d="M488 214 v22 M334 112 v-26" ${stroke(WATER, line(7))}/>`;
    const beaker = wall('M494 240 V314 Q494 326 506 326 H590 Q602 326 602 314 V240');
    const drops = `<path d="M499 312 Q548 304 597 312 V314 Q597 321 590 321 H506 Q499 321 499 314 Z" ${fill(`color-mix(in oklab, ${WATER} 62%, var(--sim-bg-surface))`)}/>`
      + `<circle cx="530" cy="240" r="5" ${fill(WATER)}/><circle cx="530" cy="272" r="5" ${fill(WATER)}/>`;
    const burner = `<rect x="118" y="304" width="64" height="24" rx="8" ${fill('var(--sim-track)', `stroke:${shade('var(--sim-track)', 70)};stroke-width:2`)}/>`;
    const picture = this._part('liquid', liquid) + this._part('flask', flask) + this._part('arm', arm) + this._part('vapour', vapour) + this._part('jacket', jacket)
      + this._part('coolant', coolant) + this._part('tube', tube) + this._part('beaker', beaker) + this._part('drops', drops)
      + `<g style="opacity:${this.tl.any() ? 0.2 : 1}">${burner}</g>`;
    const svg = `<g transform="translate(0 6) scale(${k.toFixed(4)})">${picture}</g>`;
    const on = this.tl.chip();
    const at = on && SPOTS[on.id];
    const over = at ? chip(on.label, Math.max(60, Math.min(st.W - 60, at[0] * k)), at[1] * k, { tone: on.tone ?? 'accent' }) : '';
    return { svg, over, head: NOTE[this.stepIndex] ? chip(NOTE[this.stepIndex], 0, 0, { tone: 'plain', static: true }) : '' };
  }
}
