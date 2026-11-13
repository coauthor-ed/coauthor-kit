/**
 * ChargeSorterShowcaseScene - the kit version of the grade-9 "three states of the
 * bulb" sort (atomic-foundations L10, FreeChargeSorterGame): nine samples, three
 * bins: bulb lights (free ions), bulb dark (ions locked), no ions at all. Built on
 * simPick in sort mode (track: true): drag a card, or tap it and tap a bin; the
 * picker remembers where everything is and keeps each bin's live count
 * ([data-count]) up to date by itself. A bin holds three, so a fourth card is
 * refused with a shake and no count moves. Placed cards can be moved again.
 *
 * Beat-less (a board). When all nine are placed, each bin is marked right or wrong.
 */
import { DomSimulation } from 'simulations/base/DomSimulation.js';
import { esc } from 'simulations/base/SimUi.js';
import { simPick } from 'simulations/base/kit/SimPick.js';

const CAP = 3;
const SAMPLES = [
  ['salt-water', 'Salt water', 'lit'], ['molten-salt', 'Molten NaCl', 'lit'], ['dilute-hcl', 'Dilute HCl', 'lit'],
  ['dry-salt', 'Dry salt crystal', 'dark'], ['sugar-water', 'Sugar water', 'dark'], ['pure-water', 'Pure water', 'dark'],
  ['sugar-solid', 'Solid sugar', 'never'], ['naphthalene', 'Naphthalene', 'never'], ['camphor', 'Camphor', 'never'],
].map(([id, name, bin]) => ({ id, name, bin }));
const BINS = [['lit', 'Bulb lights'], ['dark', 'Bulb dark: charges locked'], ['never', 'No ions at all']];

const CSS = `
.cs { position: absolute; inset: 0; box-sizing: border-box; padding: 18px 20px; font-family: var(--sim-font); color: var(--sim-label); display: flex; flex-direction: column; gap: 12px; }
.cs__title { font: 800 20px/1.2 var(--sim-font-display); margin: 0; }
.cs__sub { font: 700 15px/1.3 var(--sim-font); color: var(--sim-label-muted); margin: 0; }
.cs__tray { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; min-height: 148px; align-content: start; }
.cs__card { background: var(--sim-bg-surface); border: 2px solid var(--sim-stroke); border-radius: 14px; padding: 12px 8px; text-align: center; font: 800 15px/1.2 var(--sim-font); box-shadow: 0 4px 0 color-mix(in oklab, var(--sim-stroke) 60%, var(--sim-bg-deep)); }
.cs__bins { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; flex: 1; }
.cs__bin { background: var(--sim-bg-surface); border: 2px dashed var(--sim-stroke); border-radius: 14px; padding: 10px; display: flex; flex-direction: column; gap: 6px; }
.cs__bin[data-ok="1"] { border: 2px solid var(--sim-good); }
.cs__bin[data-ok="0"] { border: 2px solid var(--sim-bad); }
.cs__lbl { font: 800 15px/1.2 var(--sim-font); }
.cs__n { font: 800 15px/1 var(--sim-font); color: var(--sim-accent); }
.cs__chips { display: flex; flex-direction: column; gap: 6px; }
.cs__chips .cs__card { padding: 8px 6px; font-size: 15px; box-shadow: none; }
.sim-dom-root--portrait .cs__tray { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.sim-dom-root--portrait .cs__bins { grid-template-columns: minmax(0, 1fr); }
.cs__msg { font: 800 15px/1.3 var(--sim-font); min-height: 20px; }
`;

export class ChargeSorterShowcaseScene extends DomSimulation {
  static WIDTH = 680;
  static HEIGHT = 520;
  static PORTRAIT_WIDTH = 380;
  static PORTRAIT_HEIGHT = 980;
  static ARIA_LABEL =
    'Nine sample cards and three bins: bulb lights, bulb dark with charges locked, and no ions at all. Drag a card into a bin, ' +
    'or tap a card and then a bin. Each bin holds three; a full bin refuses another card. Counts update as you place cards.';
  static CONTROLS = [];

  constructor(container, config) {
    super(container, config);
    this.where = {};   // sample id -> bin id (mirror of the picker's placed map, for painting)
  }

  async setup() {
    await super.setup();
    this.render({
      css: CSS,
      html: `<div class="cs">
        <h2 class="cs__title">Sort by whether the charges can move</h2>
        <p class="cs__sub">Drag a card into a bin, or tap the card and then the bin. Each bin holds three.</p>
        <div class="cs__tray" data-tray></div>
        <div class="cs__bins">${BINS.map(([id, lbl]) => `<div class="cs__bin" data-bin="${id}" data-ok="">
          <div class="cs__lbl">${esc(lbl)}</div><div class="cs__n"><span data-count="${id}">0</span> of ${CAP}</div>
          <div class="cs__chips" data-chips="${id}"></div></div>`).join('')}</div>
        <div class="cs__msg" data-msg aria-live="polite"></div>
      </div>`,
    });
    this.pick = simPick(this.root, {
      items: '[data-item]', targets: '[data-bin]', track: true,
      canDrop: (item, bin) => this.pick.placed.get(item) === bin || this.pick.count(bin) < CAP,
      onDrop: (item, bin) => { this.where[item] = bin; this.paint(); },
    });
    this.paint();
  }

  destroy() { this.pick?.destroy?.(); super.destroy(); }

  paint() {
    const card = (s) => `<div class="cs__card" data-item="${s.id}">${esc(s.name)}</div>`;
    this.root.querySelector('[data-tray]').innerHTML = SAMPLES.filter((s) => !this.where[s.id]).map(card).join('');
    for (const [id] of BINS) this.root.querySelector(`[data-chips="${id}"]`).innerHTML = SAMPLES.filter((s) => this.where[s.id] === id).map(card).join('');
    const done = SAMPLES.every((s) => this.where[s.id]);
    for (const [id] of BINS) {
      const ok = SAMPLES.filter((s) => this.where[s.id] === id).every((s) => s.bin === id);
      this.root.querySelector(`[data-bin="${id}"]`).dataset.ok = done ? (ok ? '1' : '0') : '';
    }
    const msg = this.root.querySelector('[data-msg]');
    const wrong = SAMPLES.filter((s) => this.where[s.id] && this.where[s.id] !== s.bin).length;
    msg.textContent = done ? (wrong ? 'Not yet: ' + wrong + ' sample(s) are in the wrong bin. Move them.' : 'All sorted: free ions light the bulb; sugar never makes ions.') : '';
    this.pick.refresh();
  }
}
