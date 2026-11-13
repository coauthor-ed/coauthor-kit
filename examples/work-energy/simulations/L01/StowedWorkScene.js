import { DomSimulation } from 'simulations/base/DomSimulation.js';

const W = 560;

const BEAT_STEP_MAP = [
  [{ idx: 0, dwellMs: null }], // the lifting is over
  [{ idx: 1, dwellMs: null }], // the closing question, unanswered
];

const SACK_KG = 20;
const SACK_F = SACK_KG * 10; // 200 N
const H_MIN = 1;
const H_MAX = 4;
const H_START = 2;
const WALL_J = 0; // the wall's value is a constant, never a result

// The room both pictures stand in. One floor, one picture height, so the two
// cards read as two views of the same place.
const FLOOR_Y = 146;
const WALL_TOP = 14;
const WALL_X = 20;
const WALL_W = 160;
// A shelf unit: two fixed posts on the floor, and a board set at different
// heights on them. Raising the board is something the real thing can do; a
// table whose legs shorten could not.
const POST_Y = 12;
const BOARD_H = 9;
const SHELF_LOW = 122; // 1 m
const SHELF_HIGH = 80; // 4 m
const SACK_W = 76;
const SACK_H = 52;

const CSS = `
.sw-cols { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: var(--sim-space-3); }
.sw-cell { display: flex; flex-direction: column; gap: var(--sim-space-2); }
.sw-tag { align-self: flex-start; }
.sw-svg { width: 100%; height: auto; display: block; }
.sw-floor { fill: color-mix(in oklab, var(--sim-stroke) 32%, var(--sim-bg-surface)); }
.sw-floor-lip { stroke: color-mix(in oklab, var(--sim-label) 24%, transparent); }
.sw-shadow { fill: color-mix(in oklab, var(--sim-label-muted) 38%, transparent); }
/* Cushion shades and ink: --sim-waste is the one neutral that stays dark in
   both themes, so every mix below darkens in the light theme too. */
.sw-board { fill: var(--sim-stroke); }
.sw-board-shade { fill: color-mix(in oklab, var(--sim-stroke) 66%, var(--sim-waste)); }
.sw-board-lip { fill: color-mix(in oklab, var(--sim-label) 28%, transparent); }
.sw-sack { fill: var(--sim-series-3, var(--sim-shape)); }
.sw-sack-line { fill: none; stroke: color-mix(in oklab, var(--sim-series-3, var(--sim-shape)) 45%, var(--sim-waste)); stroke-width: 2.5; }
.sw-sack-shade { fill: color-mix(in oklab, var(--sim-series-3, var(--sim-shape)) 68%, var(--sim-waste)); }
.sw-knot { fill: color-mix(in oklab, var(--sim-series-3, var(--sim-shape)) 45%, var(--sim-waste)); }
.sw-ink { fill: color-mix(in oklab, var(--sim-label) 22%, var(--sim-waste)); }
.sw-ink-line { fill: none; stroke: color-mix(in oklab, var(--sim-label) 22%, var(--sim-waste)); stroke-width: 2.6; stroke-linecap: round; }
.sw-glint { fill: color-mix(in oklab, var(--sim-bg-surface) 82%, var(--sim-label)); }
.sw-brick { fill: var(--sim-series-6, var(--sim-shape)); }
.sw-brick-shade { fill: color-mix(in oklab, var(--sim-series-6, var(--sim-shape)) 74%, var(--sim-waste)); }
.sw-brick-line { stroke: var(--sim-bg-surface); stroke-width: 2; opacity: 0.5; }
/* the value panel: a bare number and a unit, and nothing else */
.sw-panel { display: flex; align-items: center; justify-content: center; gap: 4px; padding: var(--sim-space-3) var(--sim-space-2); border: 2px solid var(--sim-stroke); border-radius: var(--sim-radius-md); background: var(--sim-bg-surface); transition: box-shadow 260ms ease; }
.sw-panel--lit { border-color: var(--sim-gold); box-shadow: 0 0 0 4px color-mix(in oklab, var(--sim-gold) 22%, transparent); }
.sw-val { font-size: var(--sim-text-2xl); font-weight: 800; font-variant-numeric: tabular-nums; color: var(--sim-label-muted); transition: color 260ms ease, text-shadow 260ms ease; }
.sw-unit { font-size: var(--sim-text-lg); font-weight: 700; color: var(--sim-label-muted); transition: color 260ms ease; }
.sw-panel--lit .sw-val { color: var(--sim-gold); text-shadow: 0 0 14px var(--sim-gold); }
.sw-panel--lit .sw-unit { color: var(--sim-gold); }
.sw-tap { display: block; margin: var(--sim-space-2) auto 0; max-width: 260px; padding: 9px 16px; border: 2px solid var(--sim-stroke); border-radius: var(--sim-radius-pill); background: var(--sim-bg-surface); color: var(--sim-label); font-size: var(--sim-text-md); font-weight: 600; cursor: pointer; }
.sw-dial { display: grid; grid-template-columns: 108px minmax(0, 1fr) 64px; gap: var(--sim-space-2); align-items: center; margin-top: var(--sim-space-3); }
.sw-dial label { font-size: var(--sim-text-sm); color: var(--sim-label-muted); }
.sw-dial input[type="range"] { width: 100%; }
.sw-dial-val { font-size: var(--sim-text-md); font-weight: 700; font-variant-numeric: tabular-nums; text-align: right; }
.sim-dom-root--portrait .sw-cols { grid-template-columns: minmax(0, 1fr); }
.sim-dom-root--portrait .sw-dial { grid-template-columns: minmax(0, 1fr); }
`;

// The one floor both pictures stand on.
function floor() {
  return `<rect class="sw-floor" x="0" y="${FLOOR_Y}" width="200" height="${160 - FLOOR_Y}"/>
    <line class="sw-floor-lip" x1="0" y1="${FLOOR_Y}" x2="200" y2="${FLOOR_Y}" stroke-width="2"/>`;
}

// Where the board sits for a given shelf height, in picture units.
function shelfY(hM) {
  const t = (hM - H_MIN) / (H_MAX - H_MIN);
  return SHELF_LOW - t * (SHELF_LOW - SHELF_HIGH);
}

// A sack, not a bottle: plump at the bottom, drawn in at the shoulders, with a
// gathered and tied neck above it. Same green and the same face as the sack in
// the lift rigs, so it is the same object across the lesson.
function sackSvg(hM) {
  const sy = shelfY(hM);
  const cx = 100;
  const top = sy - SACK_H;
  const bw = SACK_W / 2;
  const tw = 29;
  const b = 9;
  const body = `M ${cx - tw} ${top.toFixed(1)}
    C ${cx - tw - 6} ${(top + 16).toFixed(1)} ${cx - bw} ${(top + 28).toFixed(1)} ${cx - bw} ${(top + SACK_H - b).toFixed(1)}
    Q ${cx - bw} ${(top + SACK_H).toFixed(1)} ${cx - bw + b} ${(top + SACK_H).toFixed(1)}
    L ${cx + bw - b} ${(top + SACK_H).toFixed(1)}
    Q ${cx + bw} ${(top + SACK_H).toFixed(1)} ${cx + bw} ${(top + SACK_H - b).toFixed(1)}
    C ${cx + bw} ${(top + 28).toFixed(1)} ${cx + tw + 6} ${(top + 16).toFixed(1)} ${cx + tw} ${top.toFixed(1)}
    Q ${cx} ${(top - 5).toFixed(1)} ${cx - tw} ${top.toFixed(1)} Z`;
  return `<svg class="sw-svg" viewBox="0 0 200 160" role="img" aria-label="A sack standing still on a shelf">
    <defs><clipPath id="swSackClip"><path d="${body}"/></clipPath></defs>
    ${floor()}
    <rect class="sw-board" x="22" y="${POST_Y}" width="8" height="${FLOOR_Y - POST_Y}" rx="3"/>
    <rect class="sw-board" x="170" y="${POST_Y}" width="8" height="${FLOOR_Y - POST_Y}" rx="3"/>
    <rect class="sw-board" x="16" y="${sy.toFixed(1)}" width="168" height="${BOARD_H}" rx="3"/>
    <rect class="sw-board-shade" x="16" y="${(sy + BOARD_H - 3).toFixed(1)}" width="168" height="3" rx="1.5"/>
    <rect class="sw-board-lip" x="18" y="${(sy + 1).toFixed(1)}" width="164" height="2" rx="1"/>
    <ellipse class="sw-shadow" cx="${cx}" cy="${(sy + 2).toFixed(1)}" rx="30" ry="4.5"/>
    <path class="sw-sack" d="${body}"/>
    <g clip-path="url(#swSackClip)">
      <rect class="sw-sack-shade" x="0" y="${(top + 30).toFixed(1)}" width="200" height="${SACK_H}"/>
    </g>
    <path class="sw-sack-line" d="${body}"/>
    <path class="sw-knot" d="M ${cx - 12} ${(top - 1).toFixed(1)} L ${cx - 9} ${(top - 14).toFixed(1)} L ${cx + 9} ${(top - 14).toFixed(1)} L ${cx + 12} ${(top - 1).toFixed(1)} Z"/>
    <rect class="sw-knot" x="${cx - 13}" y="${(top - 9).toFixed(1)}" width="26" height="4" rx="2"/>
    <g class="sw-ink">
      <circle cx="${cx - 12}" cy="${(top + 19).toFixed(1)}" r="4.5"/>
      <circle cx="${cx + 12}" cy="${(top + 19).toFixed(1)}" r="4.5"/>
      <path class="sw-ink-line" d="M ${cx - 8} ${(top + 29).toFixed(1)} Q ${cx} ${(top + 35).toFixed(1)} ${cx + 8} ${(top + 29).toFixed(1)}"/>
      <circle class="sw-glint" cx="${cx - 13.6}" cy="${(top + 17.2).toFixed(1)}" r="1.6"/>
      <circle class="sw-glint" cx="${cx + 10.4}" cy="${(top + 17.2).toFixed(1)}" r="1.6"/>
    </g>
  </svg>`;
}

function wallSvg() {
  const h = FLOOR_Y - WALL_TOP;
  const bh = h / 5;
  const rows = [`<rect class="sw-brick" x="${WALL_X}" y="${WALL_TOP}" width="${WALL_W}" height="${h}" rx="5"/>`];
  rows.push(`<defs><clipPath id="swWallClip"><rect x="${WALL_X}" y="${WALL_TOP}" width="${WALL_W}" height="${h}" rx="5"/></clipPath></defs>`);
  rows.push(`<g clip-path="url(#swWallClip)"><rect class="sw-brick-shade" x="${WALL_X}" y="${(FLOOR_Y - 2 * bh).toFixed(1)}" width="${WALL_W}" height="${(2 * bh).toFixed(1)}"/></g>`);
  for (let i = 1; i < 5; i++) {
    const y = (WALL_TOP + i * bh).toFixed(1);
    rows.push(`<line class="sw-brick-line" x1="${WALL_X}" y1="${y}" x2="${WALL_X + WALL_W}" y2="${y}"/>`);
    const off = i % 2 === 0 ? 0 : 32;
    for (let x = WALL_X + off; x < WALL_X + WALL_W; x += 64) {
      rows.push(`<line class="sw-brick-line" x1="${x}" y1="${y}" x2="${x}" y2="${(WALL_TOP + (i + 1) * bh).toFixed(1)}"/>`);
    }
  }
  return `<svg class="sw-svg" viewBox="0 0 200 160" role="img" aria-label="A brick wall standing unmoved">
    ${floor()}
    <ellipse class="sw-shadow" cx="100" cy="${FLOOR_Y}" rx="84" ry="6"/>
    ${rows.join('')}
  </svg>`;
}

function fmt(n) {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

export class StowedWorkScene extends DomSimulation {
  static WIDTH = W;
  static HEIGHT = 470;
  static PORTRAIT_WIDTH = 380;
  static PORTRAIT_HEIGHT = 952; // sim-layout natural 934 (columns stack) + padding
  static BEAT_STEP_MAP = BEAT_STEP_MAP;
  static ARIA_LABEL = 'A sack standing on a shelf beside an unmoved brick wall; the sack shows a lit value in joules and the wall shows zero.';
  static CONTROLS = [];

  async setup() {
    await super.setup();
    this.render({
      css: CSS,
      html: `<div class="sim-card">
        <div class="sw-cols">
          <div class="sw-cell">
            <span class="sim-tag sw-tag" data-sack-tag>sack</span>
            <div data-sack></div>
            <div class="sw-panel sw-panel--lit" data-panel>
              <span class="sw-val" data-j>0</span><span class="sw-unit">J</span>
            </div>
          </div>
          <div class="sw-cell">
            <span class="sim-tag sw-tag">wall</span>
            <div data-wall></div>
            <div class="sw-panel">
              <span class="sw-val">${WALL_J}</span><span class="sw-unit">J</span>
            </div>
          </div>
        </div>
        <div class="sw-dial">
          <label for="sw-h">Shelf height</label>
          <input id="sw-h" class="sw-input sw-input--h" type="range" min="${H_MIN}" max="${H_MAX}" step="0.5" value="${H_START}">
          <span class="sw-dial-val" data-val>${H_START} m</span>
        </div>
        <button class="sw-tap" type="button" data-tap>Let an hour pass</button>
      </div>`,
    });

    this._sack = this.root?.querySelector('[data-sack]');
    this._wall = this.root?.querySelector('[data-wall]');
    this._panel = this.root?.querySelector('[data-panel]');
    this._j = this.root?.querySelector('[data-j]');
    this._dial = this.root?.querySelector('.sw-input--h');
    this._val = this.root?.querySelector('[data-val]');
    this._lit = true;
    this._hours = 0;
    this._tag = this.root?.querySelector('[data-sack-tag]');

    // The harness DOM has no HTML parser, so these are null there and present
    // in a browser; optional chaining keeps the scene at rest either way.
    this._dial?.addEventListener('input', () => this._paint());
    this.root?.querySelector('[data-tap]')?.addEventListener('click', () => this._wait());
    this._paint();
  }

  onStep() {
    // Beat 1 is the same picture: the panels sit there and resolve nothing.
    this._paint();
  }

  _h() {
    const v = this._dial ? Number(this._dial.value) : H_START;
    return Number.isFinite(v) ? v : H_START;
  }

  // The value is recomputed from the lift, never stored, and it only changes
  // when the shelf height does. Nothing in this scene moves it on a timer.
  _work() {
    return SACK_F * this._h();
  }

  // The button lets an hour go by: the clock on the sack's tag moves and the
  // number does not. That is the claim of the slide, so the button is a clock
  // skip, not a timer - nothing here ever runs on its own.
  _wait() {
    this._hours += 1;
    if (this._tag) this._tag.textContent = `sack - ${this._hours} h after the lift`;
    this._paint();
  }

  _paint() {
    const h = this._h();
    if (this._sack) this._sack.innerHTML = sackSvg(h);
    if (this._wall) this._wall.innerHTML = wallSvg();
    if (this._j) this._j.textContent = fmt(this._work());
    if (this._val) this._val.textContent = `${fmt(h)} m`;
    if (this._panel) {
      if (this._lit) this._panel.classList.add('sw-panel--lit');
    }
  }

  destroy() {
    this._sack = null;
    this._wall = null;
    this._panel = null;
    this._j = null;
    this._dial = null;
    this._val = null;
    this._tag = null;
    super.destroy();
  }
}
