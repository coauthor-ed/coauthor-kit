import { DomSimulation } from 'simulations/base/DomSimulation.js';
import { esc, simTag } from 'simulations/base/SimUi.js';
import { SIM_LOOK_DOM_CSS, noteCardHtml, burst } from 'simulations/base/kit/SimLookDom.js';

const W = 560;
const H = 560; // sim-layout measured: tallest beat 536px + bottom padding (the spent
                  // state is the height of the idle one - the verdict chip rides the tag row)

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }], // the two live tickets
  [{ idx: 1, dwellMs: null }], // the third ticket is named
];

const F_MAX = 200; // N
const F_STEP = 10;
const S_MAX = 5; // m
const S_STEP = 0.5;
const F_START = 120; // N
const S_START = 3.0; // m

// Row 3 is the slide's own picture: both factors large, neither zero.
const LOCKED_F = 120;
const LOCKED_S = 3.0;

const ROWS = [
  { id: 'f', dial: 'f', name: 'Zero force', tag: 'ticket 1', other: 's' },
  { id: 's', dial: 's', name: 'Zero displacement', tag: 'ticket 2', other: 'f' },
];

const NOTE_ROWS = [
  { text: 'a zero dial holds a factor at zero', sub: 'not a push of no size' },
  { text: 'the third case is not on this board', sub: 'direction, not size - next slide' },
];

const CSS = SIM_LOOK_DOM_CSS + `
.zw-head { display: flex; align-items: baseline; justify-content: space-between; gap: var(--sim-space-2); }
.zw-formula { font-size: var(--sim-text-xl); font-weight: 700; }
.zw-rows { display: flex; flex-direction: column; gap: var(--sim-space-2); margin-top: var(--sim-space-3); }
.zw-row { position: relative; display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1fr); gap: var(--sim-space-3); align-items: center; padding: var(--sim-space-2) var(--sim-space-2) var(--sim-space-2) 30px; border: 2px solid var(--sim-stroke); border-radius: var(--sim-radius-md); background: var(--sim-bg-surface); transition: border-color 200ms ease, background-color 200ms ease; }
.zw-row::before { content: ''; position: absolute; left: 10px; top: 50%; width: 13px; height: 13px; margin-top: -6.5px; border-radius: 50%; background: var(--sim-bg-deep); box-shadow: inset 0 0 0 2px var(--sim-stroke); }
.zw-row--locked { grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.05fr); border-style: dashed; }
.zw-row--spent { border-color: var(--sim-good); background: color-mix(in oklab, var(--sim-good) 9%, var(--sim-bg-surface)); }
.zw-cap { display: flex; flex-direction: column; gap: var(--sim-space-1); min-width: 0; }
.zw-tags { display: flex; flex-wrap: wrap; align-items: center; gap: var(--sim-space-1); }
.zw-verdict { display: none; align-items: center; padding: 2px 8px; border: var(--sim-border); border-color: var(--sim-good); border-radius: var(--sim-radius-pill); background: var(--sim-bg-deep); color: var(--sim-good); font-size: var(--sim-text-sm); font-weight: 700; }
.zw-verdict::after { content: attr(data-verdict); }
.zw-row--spent .zw-verdict { display: inline-flex; }
.zw-chip { display: inline-flex; align-items: center; padding: 2px 8px; border: var(--sim-border); border-color: var(--sim-label-muted); border-radius: var(--sim-radius-pill); background: var(--sim-bg-deep); color: var(--sim-label-muted); font-size: var(--sim-text-sm); font-weight: 700; }
.zw-rule { display: none; align-items: center; max-width: 100%; padding: 2px 8px; border: var(--sim-border); border-color: var(--sim-accent); border-radius: var(--sim-radius-pill); background: var(--sim-bg-deep); color: var(--sim-accent); font-size: var(--sim-text-sm); font-weight: 700; text-align: center; white-space: normal; }
.zw-rule::after { content: attr(data-rule); }
[data-step="1"] .zw-rule { display: inline-flex; }
.zw-name { font-size: var(--sim-text-md); font-weight: 600; }
.zw-line { font-size: var(--sim-text-sm); color: var(--sim-label-muted); }
.zw-dial { display: flex; flex-direction: column; gap: var(--sim-space-1); min-width: 0; }
.zw-dhead { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 0 var(--sim-space-2); }
.zw-val { font-size: var(--sim-text-sm); font-weight: 700; color: var(--sim-label-muted); font-variant-numeric: tabular-nums; }
.zw-dial input[type="range"] { width: 100%; }
.zw-dial input[type="range"][disabled] { opacity: 0.4; }
.zw-out { display: flex; flex-direction: column; align-items: flex-end; gap: var(--sim-space-1); min-width: 0; }
.zw-eq { font-size: var(--sim-text-sm); color: var(--sim-label); font-variant-numeric: tabular-nums; white-space: nowrap; }
.zw-eq b { display: inline-block; padding: 1px 7px; border: var(--sim-border); border-color: var(--sim-accent); border-radius: var(--sim-radius-sm); background: color-mix(in oklab, var(--sim-accent) 16%, var(--sim-bg-surface)); color: var(--sim-accent); }
.zw-j { font-size: var(--sim-text-xl); font-weight: 700; font-variant-numeric: tabular-nums; }
.zw-j--zero { color: var(--sim-good); }
.zw-unknown { font-size: var(--sim-text-xl); font-weight: 700; color: var(--sim-label-muted); }
.zw-note { display: block; }
.zw-note .sl-note { position: static; display: block; padding: 0; background: none; animation: none; }
.zw-note .sl-note__card { width: 100%; margin-top: 0; padding: var(--sim-space-3); border-width: 2px; box-shadow: 0 3px 0 color-mix(in oklab, var(--sim-accent) 38%, var(--sim-bg-deep)); animation: none; }
.zw-note .sl-note__badge { font-size: var(--sim-text-sm); padding: 1px 8px; }
.zw-note .sl-note__row { grid-template-columns: minmax(0, 1fr); animation: none; }
.zw-note .sl-note__icon { display: none; }
.zw-note .sl-note__text { font-size: var(--sim-text-sm); line-height: 1.25; }
.sim-dom-root--portrait .zw-row,
.sim-dom-root--portrait .zw-row--locked { grid-template-columns: minmax(0, 1fr); }
`;

function fmt(n) {
  return n.toFixed(1).replace(/\.0$/, '');
}

// Each row writes both factors with their own unit, so "3 m x 120 N" can never
// print as "3 x 120 m", and boxes the factor that row's ticket is about.
function eqHtml(id, own, other) {
  const f = id === 'f' ? `${fmt(own)} N` : `${fmt(own)} m`;
  const s = id === 'f' ? `${fmt(other)} m` : `${fmt(other)} N`;
  return id === 'f' ? `<b>${f}</b> &times; ${s}` : `${s} &times; <b>${f}</b>`;
}

function rowHtml(r) {
  return `<div class="zw-row" data-row="${r.id}">
    <div class="zw-cap">
      <span class="zw-tags">${simTag(r.tag, { accent: true })}<span class="zw-verdict" data-verdict="spent"></span></span>
      <span class="zw-name">${esc(r.name)}</span>
    </div>
    <div class="zw-dial">
      <span class="zw-line">${r.dial === 'f' ? 'Force' : 'Displacement'}</span>
      <input class="zw-input zw-input--${r.dial}" type="range" min="0" max="${r.dial === 'f' ? F_MAX : S_MAX}" step="${r.dial === 'f' ? F_STEP : S_STEP}" value="${r.dial === 'f' ? F_START : S_START}">
    </div>
    <div class="zw-out">
      <span class="zw-eq"></span>
      <span class="zw-j"></span>
    </div>
  </div>`;
}

function lockedRowHtml() {
  return `<div class="zw-row zw-row--locked" data-row="z">
    <div class="zw-cap">
      <span class="zw-tags"><span class="sim-tag" data-z-tag>ticket 3 ?</span><span class="zw-chip">locked</span></span>
      <span class="zw-name" data-z-name hidden>Neither factor is zero</span>
      <span class="zw-line" data-z-hint>Both are perfectly large.</span>
    </div>
    <div class="zw-dial">
      <span class="zw-dhead"><span class="zw-line">Force</span><span class="zw-val">${LOCKED_F} N</span></span>
      <input type="range" min="0" max="${F_MAX}" step="${F_STEP}" value="${LOCKED_F}" disabled>
    </div>
    <div class="zw-dial">
      <span class="zw-dhead"><span class="zw-line">Displacement</span><span class="zw-val">${fmt(LOCKED_S)} m</span></span>
      <input type="range" min="0" max="${S_MAX}" step="${S_STEP}" value="${LOCKED_S}" disabled>
    </div>
    <div class="zw-out">
      <span class="zw-rule" data-rule="Direction, not size"></span>
      <span class="zw-unknown">? J</span>
    </div>
  </div>`;
}

export class ZeroWorkCasesScene extends DomSimulation {
  static WIDTH = W;
  static HEIGHT = H;
  static PORTRAIT_WIDTH = 380;
  static PORTRAIT_HEIGHT = 920; // sim-layout measured: tallest beat 901px + bottom padding
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static ARIA_LABEL = 'Three rows showing W = force times displacement; two live dials and a third row locked until the last beat.';
  static CONTROLS = [];

  async setup() {
    await super.setup();
    this.render({
      css: CSS,
      html: `<div class="sim-card sl-backdrop">
        <div class="zw-head">
          <h2 class="sim-title zw-formula">W = F &times; s</h2>
          ${simTag('a product has two factors')}
        </div>
        <div class="zw-rows">
          ${ROWS.map(rowHtml).join('')}
          ${lockedRowHtml()}
        </div>
        <div class="zw-note">${noteCardHtml(NOTE_ROWS, 'NOTE')}</div>
      </div>`,
    });

    // The sim-test harness DOM has no HTML parser, so a markup string never
    // becomes a node tree and these are null there. In a browser they resolve.
    // Every one is optional-chained: absent, the scene simply rests.
    this._dialF = this.root?.querySelector('.zw-input--f');
    this._dialS = this.root?.querySelector('.zw-input--s');
    this._zTag = this.root?.querySelector('[data-z-tag]');
    this._zHint = this.root?.querySelector('[data-z-hint]');
    this._zName = this.root?.querySelector('[data-z-name]');
    this._spent = { f: false, s: false };

    this._dialF?.addEventListener('input', () => this._recompute());
    this._dialS?.addEventListener('input', () => this._recompute());
    this._recompute();
    this.onStep();
  }

  onStep() {
    // Beat 1 names the third ticket; before that the scene may not name it.
    const named = this.stepIndex >= 1;
    if (this._zName) this._zName.hidden = !named;
    if (this._zHint) this._zHint.hidden = named;
    if (this._zTag) this._zTag.textContent = named ? 'ticket 3' : 'ticket 3 ?';
    this._recompute();
  }

  _recompute() {
    if (!this._dialF || !this._dialS) return;
    const f = Number(this._dialF.value);
    const s = Number(this._dialS.value);
    const j = f * s;

    for (const [id, own, other] of [['f', f, s], ['s', s, f]]) {
      const row = this.root?.querySelector(`[data-row="${id}"]`);
      if (!row) continue;
      const eq = row.querySelector('.zw-eq');
      const out = row.querySelector('.zw-j');
      if (eq) eq.innerHTML = eqHtml(id, own, other);
      if (out) {
        out.textContent = `${j} J`;
        out.className = j === 0 ? 'zw-j zw-j--zero' : 'zw-j';
      }

      // The concept: a live row landing on 0 J from non-zero. The verdict chip
      // rides the tag row, so the spent state is the height of the idle one.
      if (j === 0 && !this._spent[id]) {
        this._spent[id] = true;
        row.classList.add('zw-row--spent');
        burst(row);
      } else if (j !== 0 && this._spent[id]) {
        this._spent[id] = false;
        row.classList.remove('zw-row--spent');
      }
    }
  }

  destroy() {
    this._dialF = null;
    this._dialS = null;
    this._zTag = null;
    this._zHint = null;
    this._zName = null;
    super.destroy();
  }
}
