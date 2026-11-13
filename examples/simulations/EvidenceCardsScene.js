import { DomSimulation } from 'simulations/base/DomSimulation.js';
import { withBeats } from 'simulations/base/DomBeats.js';
import { esc, simTags, simField, simRecord } from 'simulations/base/SimUi.js';
import { characterSvg, CHARACTER_CSS } from 'simulations/base/kit/KeyCharacters.js';

/**
 * EvidenceCardsScene - the worked example of a DOM scene on the shared layer (docs/dom-scene-kit.md).
 * Two evidence cards (stacked in portrait); beat 0 the cards, 1 the unknown fields light up, 2 the record strip.
 * All card/tag/field/record CSS, spacing, [hidden] reset, reduced motion and the role="group" + aria-label
 * come from SimUi: only the beat-driven reveal is styled here. One this.render({ html, css }) call, no
 * hex, sizes via var(--sim-text-*) / var(--sim-space-*), beats via static BEAT_STEP_MAP and onStep() (withBeats), no timers.
 */
const W = 560;
const H = 398;

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }], // the cards
  [{ idx: 1, dwellMs: null }], // unknown fields light up
  [{ idx: 2, dwellMs: null }], // record strip
];

const CARDS = [
  { name: 'Yeast', art: 'yeast', tone: 3, tags: ['One cell', 'Nucleus'], fields: [['Wall', null], ['Nutrition', null]] },
  { name: 'Pond protist', art: 'pond', tone: 5, tags: ['One cell', 'Nucleus'], fields: [['Wall', null], ['Moves', 'Yes']] },
];

function card(c) {
  return `<article class="sim-card" aria-label="${esc(c.name)} evidence">
    ${characterSvg(c.art, c.tone, 64)}
    <h2 class="sim-title">${esc(c.name)}</h2>
    ${simTags(c.tags)}
    <div class="sim-stack sim-stack--tight">${c.fields.map(([label, value]) => simField(label, value)).join('')}</div>
  </article>`;
}

const CSS = CHARACTER_CSS + `
.esc-cards .sim-card { align-items: center; text-align: center; }
.esc-cards .sim-stack { width: 100%; }
.esc-cards .ek-av { width: 64px; height: 64px; }
.sim-field--missing .sim-q { visibility: hidden; }
.sim-ui[data-step="1"] .sim-field--missing,
.sim-ui[data-step="2"] .sim-field--missing { border-color: var(--sim-accent); }
.sim-ui[data-step="1"] .sim-q,
.sim-ui[data-step="2"] .sim-q { visibility: visible; }
`;

export class EvidenceCardsScene extends withBeats(DomSimulation) {
  static WIDTH = W;
  static HEIGHT = H;
  static PORTRAIT_WIDTH = 380;
  static PORTRAIT_HEIGHT = 722;
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static ARIA_LABEL = 'Two one-celled organisms with their evidence cards; some fields are unknown.';
  static CONTROLS = [];

  async setup() {
    await super.setup();
    this.render({
      css: CSS,
      html: `<div class="sim-grid-2 esc-cards">${CARDS.map(card).join('')}</div>
        <p class="sim-meta">Schematic pictures - not to scale</p>
        ${simRecord(['Observe', 'Group', 'Reason', 'Unknown'], 3)}`,
    });
    this._record = this.root.querySelector('.sim-record');
    this.onStep(this.stepIndex);
  }

  // withBeats clamps the beat, sets this.stepIndex and root.dataset.step, then calls this.onStep(step, beat, count).
  onStep(step) {
    if (this._record) this._record.hidden = step < 2;
  }

  destroy() {
    this._record = null;
    super.destroy();
  }
}
