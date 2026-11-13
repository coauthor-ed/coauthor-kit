/**
 * IconSheetScene - every SimIcons glyph with its name (a picker, not a lesson
 * scene). One DOM grid, both themes; tones cycle through the series.
 */
import { DomSimulation } from 'simulations/base/DomSimulation.js';
import { iconSvg, ICON_NAMES } from 'simulations/base/kit/SimIcons.js';
import { SIM_LOOK_DOM_CSS } from 'simulations/base/kit/SimLookDom.js';

const CSS = `
.is-grid { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 6px; }
.is-cell { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 6px 2px; border-radius: var(--sim-radius-sm); background: var(--sim-bg-surface); }
.is-cell .sim-icon { width: 40px; height: 40px; }
.sim-dom-root--portrait .is-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.is-name { font-size: var(--sim-text-sm); font-weight: 700; color: var(--sim-label-muted); text-align: center; overflow-wrap: anywhere; }
`;

export class IconSheetScene extends DomSimulation {
  static WIDTH = 680;
  static HEIGHT = 520;
  static PORTRAIT_WIDTH = 380;
  static PORTRAIT_HEIGHT = 1200;
  static LAYOUT = 'fit';
  static ARIA_LABEL = 'Every icon in the kit icon set, with its name.';
  async setup() {
    await super.setup();
    this.render({ css: SIM_LOOK_DOM_CSS + CSS, rootClass: 'sl-backdrop', html: `<div class="is-grid">${ICON_NAMES.map((n, i) => `<div class="is-cell">${iconSvg(n, (i % 8) + 1)}<span class="is-name">${n}</span></div>`).join('')}</div>` });
  }
}
