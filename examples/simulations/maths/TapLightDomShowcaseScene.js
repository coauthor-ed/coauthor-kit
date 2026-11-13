/**
 * TapLightDomShowcaseScene - kit/TapLight.js in a plain DomSimulation that rewrites its whole root on every repaint, the
 * hardest case for lock and keyboard focus: the chip row is mounted again after each write.
 *   Beat 0: chips opposite side, adjacent side, hypotenuse, sin theta light the sides of a right triangle
 * A scene that can keep its host out of the rewrite should do that; this one proves the other case holds.
 */
import { DomSimulation } from 'simulations/base/DomSimulation.js';
import { tapLight } from 'simulations/base/kit/TapLight.js';

const THETA = '\u03b8';
const CHIPS = [
  { id: 'opp', label: 'opposite side', targets: ['opp'], tone: 1 },
  { id: 'adj', label: 'adjacent side', targets: ['adj'], tone: 2 },
  { id: 'hyp', label: 'hypotenuse', targets: ['hyp'], tone: 3 },
  { id: 'sin', label: `sin ${THETA} = opp / hyp`, say: 'sine of theta equals opposite over hypotenuse', targets: ['opp', 'hyp', 'angle'], tone: 5 },
];
const SIDE = { opp: ['M300 40 V200', 1], adj: ['M60 200 H300', 2], hyp: ['M60 200 L300 40', 3] };

export class TapLightDomShowcaseScene extends DomSimulation {
  static WIDTH = 560; static HEIGHT = 520;
  static PORTRAIT_WIDTH = 380; static PORTRAIT_HEIGHT = 480;
  static FIT = true;
  static BEAT_STEP_MAP = [[{ idx: 0, dwellMs: null }]];
  static ARIA_LABEL = 'A right triangle with an angle theta. Chips under the figure light one side, or the two sides in sine theta, and dim the rest.';
  static CONTROLS = [];

  tl = tapLight({ label: 'Sides of the triangle', chips: CHIPS, onChange: () => this.repaint() });

  async setup() {
    await super.setup();
    this.render({ css: '.sim-tl-fig { display: block; width: 100%; height: auto; }' });
    this.repaint();
  }

  destroy() { this.tl.destroy(); super.destroy(); }

  repaint() {
    if (!this.root) return;
    const { tl } = this;
    const side = (id) => {
      const [d, n] = SIDE[id], w = tl.has(id) ? 11 : 6;
      return `<path data-part="${id}" d="${d}" style="fill:none;stroke:var(--sim-series-${n});stroke-width:${w};stroke-linecap:round;opacity:${tl.off(id) ? 0.2 : 1}"/>`;
    };
    const arc = `<path data-part="angle" d="M112 200 A52 52 0 0 0 103 171" style="fill:none;stroke:var(--sim-series-5);stroke-width:${tl.has('angle') ? 8 : 5};stroke-linecap:round;opacity:${tl.off('angle') ? 0.2 : 1}"/>`;
    const sym = `<text x="126" y="188" style="fill:var(--sim-label);font:800 24px var(--sim-font)">${THETA}</text>`;
    this.root.innerHTML = `<svg class="sim-tl-fig" viewBox="30 16 300 208" role="img" aria-label="Right triangle">${side('adj')}${side('opp')}${side('hyp')}${arc}${sym}</svg>`;
    this.tl.mount(this.root, this);   // measures the frame with the row back in it: render({ html }) would measure without it
  }
}
