import { DomSimulation } from 'simulations/base/DomSimulation.js';
import { withChallenge } from 'simulations/base/ChallengeMode.js';
import { simTag } from 'simulations/base/SimUi.js';
import { SIM_LOOK_DOM_CSS, burst } from 'simulations/base/kit/SimLookDom.js';

const W = 560;
const H = 716; // sim-layout natural: 701 landscape with the verdict open

const G = 10; // N per kg, so every product is an exact integer
const TARGET_J = 600;
const TOLERANCE = 0.005; // +/- 3 J on 600
const RUN_MS = 1600;
const SPAN_M = 5; // the rail spans -5 m .. +5 m

// The gantry stage, in its own px. It is a drawing, not a scale: PX_PER_M says
// how tall a metre of lift is drawn, and the rail labels name the real numbers.
const STAGE_H = 288;
const FLOOR_Y = 20; // floor line, px up from the bottom of the stage
const PX_PER_M = 12;
const HOOK_H = 14;
const BEAM_H = 26;
const PULL_MIN = 34; // free-end rope length: force is drawn as rope length
const PULL_SPAN = 44;
const F_MAX = 20 * G; // the biggest force the mass dial can put on the hook

const MUL = '\u00d7'; // the multiplication the whole scene is about
const DEG = '\u00b0';
const GLYPH = { good: '\u2713', miss: '\u2717', neg: '\u2193', zero: '0' };

// The product, and nothing else. No stored answer, no snap to target.
function workOf(massKg, heightM, angleDeg) {
  const f = massKg * G;
  const w = f * heightM * Math.cos((angleDeg * Math.PI) / 180);
  // Math.cos(90 deg) is 6.1e-17, not 0, so a square-across pull would read
  // 3.7e-14 and fail the "reads zero" contract. Rounding the product (not the
  // angle) keeps the win condition a single computation with no special case.
  return Math.round(w * 1e6) / 1e6;
}

const DIALS = [
  { id: 'mass', label: 'Mass on the hook', min: 1, max: 20, step: 1, start: 20, unit: 'kg' },
  { id: 'height', label: 'Lift height', min: -5, max: 5, step: 0.5, start: 0.5, unit: 'm' },
  { id: 'angle', label: 'Pull angle', min: 0, max: 90, step: 15, start: 0, unit: 'deg' },
];

// The sack grows with the mass on it, so the learner sees the mass change
// before they read the number. It is the hero: a fifth of the stage wide.
function bagOf(massKg) {
  const t = (massKg - DIALS[0].min) / (DIALS[0].max - DIALS[0].min);
  return { w: Math.round(76 + t * 56), h: Math.round(60 + t * 38) };
}

const CSS = `
.bwg-target { display: flex; align-items: center; justify-content: space-between; gap: var(--sim-space-2); padding: var(--sim-space-2) var(--sim-space-3); border: 2px solid var(--sim-accent); border-radius: var(--sim-radius-md); background: var(--sim-bg-surface); box-shadow: 0 4px 0 color-mix(in oklab, var(--sim-accent) 40%, var(--sim-bg-deep)); }
.bwg-target-label { font-size: var(--sim-text-sm); font-weight: 700; color: var(--sim-label-muted); }
.bwg-target-val { font-size: var(--sim-text-2xl); font-weight: 800; font-variant-numeric: tabular-nums; letter-spacing: 0.02em; }

/* --- the gantry stage: a portal frame, a beam, and a rope over a pulley ---- */
.bwg-stage { position: relative; height: ${STAGE_H}px; margin-top: var(--sim-space-2); border: 2px solid var(--sim-stroke); border-radius: var(--sim-radius-md); overflow: hidden; }
.bwg-beam { position: absolute; top: 0; left: 10%; width: 80%; height: ${BEAM_H}px; z-index: 3; border-radius: 5px 5px 3px 3px; background: linear-gradient(180deg, color-mix(in oklab, var(--sim-shape) 82%, var(--sim-bg-surface)) 0 45%, color-mix(in oklab, var(--sim-shape) 74%, var(--sim-bg-deep)) 45% 100%); }
.bwg-leg { position: absolute; top: ${BEAM_H}px; bottom: ${FLOOR_Y}px; width: 24px; z-index: 2; border: 2px solid color-mix(in oklab, var(--sim-shape) 58%, var(--sim-bg-deep)); border-radius: 3px; background: linear-gradient(90deg, color-mix(in oklab, var(--sim-shape) 72%, var(--sim-bg-deep)) 0 24%, var(--sim-shape) 24% 76%, color-mix(in oklab, var(--sim-shape) 72%, var(--sim-bg-deep)) 76% 100%); }
.bwg-leg--l { left: 22%; } .bwg-leg--r { left: 78%; margin-left: -24px; }
.bwg-brace { position: absolute; top: ${BEAM_H}px; left: 22%; width: 13px; height: 62px; z-index: 2; transform-origin: top center; border: 2px solid color-mix(in oklab, var(--sim-shape) 58%, var(--sim-bg-deep)); border-radius: 3px; background: var(--sim-shape); }
.bwg-brace--l { margin-left: 6px; transform: rotate(-40deg); }
.bwg-brace--r { left: 78%; margin-left: -19px; transform: rotate(40deg); }
.bwg-pulley { position: absolute; top: 2px; left: 50%; width: 22px; height: 22px; margin-left: -11px; z-index: 4; border: 3px solid color-mix(in oklab, var(--sim-shape) 58%, var(--sim-bg-deep)); border-radius: 50%; background: var(--sim-shape); }
.bwg-pulley::after { content: ''; position: absolute; inset: 5px; border-radius: 50%; background: color-mix(in oklab, var(--sim-shape) 52%, var(--sim-bg-deep)); }
.bwg-foot { position: absolute; bottom: ${FLOOR_Y - 5}px; left: 22%; width: 54px; height: 11px; z-index: 3; margin-left: -15px; border: 2px solid color-mix(in oklab, var(--sim-shape) 58%, var(--sim-bg-deep)); border-radius: 3px; background: var(--sim-shape); }
.bwg-foot--r { left: 78%; margin-left: -39px; }
.bwg-floorband { position: absolute; inset: auto 0 0 0; height: ${FLOOR_Y}px; z-index: 1; background-color: color-mix(in oklab, var(--sim-stroke) 30%, var(--sim-bg-deep)); background-image: repeating-linear-gradient(90deg, color-mix(in oklab, var(--sim-bg-deep) 45%, transparent) 0 2px, transparent 2px 44px); border-top: 3px solid color-mix(in oklab, var(--sim-label-muted) 70%, var(--sim-bg-deep)); }
.bwg-shadow { position: absolute; left: 50%; bottom: ${FLOOR_Y - 2}px; width: 96px; height: 10px; z-index: 1; border-radius: 50%; background: color-mix(in oklab, var(--sim-bg-deep) 62%, transparent); transform: translateX(-50%); transition: transform 1600ms linear, opacity 1600ms linear; }
/* the rail is graduated up the near leg, where a real hoist's mast is */
.bwg-railpost { position: absolute; left: calc(22% - 15px); top: ${BEAM_H}px; bottom: ${FLOOR_Y}px; width: 5px; z-index: 1; border-radius: 3px; background: color-mix(in oklab, var(--sim-label-muted) 45%, transparent); }
.bwg-tick { position: absolute; left: calc(22% - 21px); width: 18px; height: 2px; background: color-mix(in oklab, var(--sim-label-muted) 75%, transparent); }
.bwg-tick--zero { left: calc(22% - 25px); width: 22px; height: 3px; background: var(--sim-accent); }
.bwg-ticklab { position: absolute; left: calc(22% - 78px); transform: translateY(-50%); font-size: var(--sim-text-sm); font-weight: 700; color: var(--sim-label-muted); white-space: nowrap; }
.bwg-rulelab { position: absolute; left: 10px; top: 2px; font-size: var(--sim-text-sm); font-weight: 700; color: var(--sim-label-muted); }

/* --- the load ------------------------------------------------------------ */
.bwg-load { position: absolute; left: 50%; bottom: 0; z-index: 3; display: flex; flex-direction: column; align-items: center; transform: translateX(-50%); transition: bottom 1600ms linear; }
.bwg-load--still { transition: none; }
.bwg-rope { position: absolute; bottom: 100%; left: 50%; width: 4px; height: 300px; z-index: -1; margin-left: -2px; background: var(--sim-label-muted); }
.bwg-hook { width: 22px; height: ${HOOK_H}px; border: 4px solid var(--sim-label-muted); border-top: none; border-radius: 0 0 11px 11px; }
.bwg-bag { position: relative; width: var(--bag-w, 110px); height: var(--bag-h, 88px); border-radius: 22px 22px 30px 30px; background: var(--sim-gold); border: 3px solid color-mix(in oklab, var(--sim-gold) 58%, var(--sim-bg-deep)); box-shadow: inset 0 -12px 0 color-mix(in oklab, var(--sim-gold) 74%, var(--sim-bg-deep)), 0 8px 20px color-mix(in oklab, var(--sim-bg-deep) 55%, transparent); transition: width 220ms ease, height 220ms ease; }
.bwg-knot { position: absolute; top: -12px; left: 50%; width: 26px; height: 14px; margin-left: -13px; border-radius: 6px 6px 3px 3px; background: color-mix(in oklab, var(--sim-gold) 74%, var(--sim-bg-deep)); }
/* The face uses the house ink-on-fill pairing and no literal colour: the ink
   is --sim-bg-deep, which is near-black on the light gold of the dark theme
   and near-white on the dark gold of the light theme, so the same two tokens
   read as a face in both. The glint is the bag's own gold. */
.bwg-eye { position: absolute; top: 26%; width: 19%; height: 25%; border-radius: 50%; background: var(--sim-bg-deep); }
.bwg-eye--l { left: 20%; } .bwg-eye--r { right: 20%; }
.bwg-pupil { position: absolute; left: 16%; top: 18%; width: 38%; height: 40%; border-radius: 50%; background: var(--sim-gold); }
.bwg-mouth { position: absolute; left: 40%; top: 46%; width: 20%; height: 12px; border-radius: 0 0 12px 12px; border-bottom: 4px solid var(--sim-bg-deep); }
.bwg-bag[data-mood="happy"] .bwg-mouth { height: 19px; }
.bwg-bag[data-mood="calm"] .bwg-mouth { border-bottom: none; border-top: 4px solid var(--sim-bg-deep); border-radius: 12px 12px 0 0; top: 49%; }
.bwg-bag[data-mood="flat"] .bwg-mouth { height: 4px; border: none; background: var(--sim-bg-deep); border-radius: 2px; top: 49%; }
.bwg-bag[data-mood="happy"] { animation: bwg-cheer 620ms cubic-bezier(0.34, 1.56, 0.64, 1) 2; box-shadow: inset 0 -12px 0 color-mix(in oklab, var(--sim-gold) 74%, var(--sim-bg-deep)), 0 0 26px 6px color-mix(in oklab, var(--sim-good) 55%, transparent); }
@keyframes bwg-cheer { 0%, 100% { transform: none; } 45% { transform: translateY(-7px) scale(1.05, 1.05); } }
.bwg-masstag { position: absolute; left: 50%; bottom: 7px; transform: translateX(-50%); padding: 3px 12px; border-radius: var(--sim-radius-pill); background: var(--sim-accent); color: var(--sim-bg-deep); font-size: var(--sim-text-sm); font-weight: 800; white-space: nowrap; }
.bwg-dest { position: absolute; left: 22%; right: 22%; height: 0; z-index: 2; border-top: 2px dashed var(--sim-accent); pointer-events: none; }
.bwg-hchip { position: absolute; right: calc(50% + 82px); top: 0; transform: translateY(-120%); padding: 3px 10px; border: 2px solid var(--sim-accent); border-radius: var(--sim-radius-pill); background: var(--sim-bg-surface); color: var(--sim-label); font-size: var(--sim-text-sm); font-weight: 800; white-space: nowrap; font-variant-numeric: tabular-nums; }

/* --- the pull: the free end, swinging from straight down to square across -- */
.bwg-pull { position: absolute; left: calc(50% + 13px); top: ${BEAM_H - 2}px; width: 0; height: 0; z-index: 5; }
.bwg-pull-rope { position: absolute; left: -3px; top: 0; width: 6px; height: 40px; border-radius: 3px; background: var(--sim-accent); box-shadow: 0 3px 0 color-mix(in oklab, var(--sim-accent) 55%, var(--sim-bg-deep)); }
.bwg-pull-head { position: absolute; left: -10px; top: 0; width: 0; height: 0; border-left: 10px solid transparent; border-right: 10px solid transparent; border-top: 15px solid var(--sim-accent); }
.bwg-pull-lab { position: absolute; left: 10px; top: 0; font-size: var(--sim-text-sm); font-weight: 800; color: var(--sim-accent); }

/* --- reading, dials, verdict --------------------------------------------- */
.bwg-out { display: flex; align-items: center; justify-content: space-between; gap: var(--sim-space-2); margin-top: var(--sim-space-2); padding: var(--sim-space-2) var(--sim-space-3); border: 2px solid var(--sim-stroke); border-radius: var(--sim-radius-md); background: var(--sim-bg-surface); }
.bwg-eq { font-size: var(--sim-text-sm); font-weight: 700; color: var(--sim-label); font-variant-numeric: tabular-nums; }
.bwg-j { font-size: var(--sim-text-xl); font-weight: 800; font-variant-numeric: tabular-nums; }
.bwg-j--pos { color: var(--sim-good); } .bwg-j--neg { color: var(--sim-bad); } .bwg-j--zero { color: var(--sim-label-muted); }
.bwg-dials { display: flex; flex-direction: column; gap: var(--sim-space-1); margin-top: var(--sim-space-2); }
.bwg-dial { display: grid; grid-template-columns: auto auto minmax(0, 1fr); gap: var(--sim-space-2); align-items: center; }
.bwg-dial label { font-size: var(--sim-text-sm); font-weight: 700; color: var(--sim-label-muted); }
.bwg-dial input[type="range"] { width: 100%; }
.bwg-dial-val { min-width: 64px; text-align: center; padding: 3px 10px; border: 2px solid color-mix(in oklab, var(--sim-shape) 55%, var(--sim-bg-deep)); border-radius: var(--sim-radius-pill); background: var(--sim-shape); color: var(--sim-bg-deep); font-size: var(--sim-text-sm); font-weight: 800; font-variant-numeric: tabular-nums; white-space: nowrap; }
.bwg-actions { display: flex; align-items: center; gap: var(--sim-space-2); margin-top: var(--sim-space-2); }
.bwg-lift { padding: 10px 22px; border: 2px solid var(--sim-accent); border-radius: var(--sim-radius-pill); background: var(--sim-accent); color: var(--sim-bg-deep); font-size: var(--sim-text-md); font-weight: 800; cursor: pointer; box-shadow: 0 4px 0 color-mix(in oklab, var(--sim-accent) 55%, var(--sim-bg-deep)); }
.bwg-lift[disabled] { opacity: 0.5; cursor: default; box-shadow: none; }
.bwg-verdict { display: flex; align-items: center; gap: var(--sim-space-2); margin: var(--sim-space-2) 0 0; padding: var(--sim-space-2); border-radius: var(--sim-radius-md); background: var(--sim-bg-surface); border: 2px solid var(--sim-stroke); }
.bwg-verdict[hidden] { display: none; }
.bwg-verdict[data-tone="good"] { border-color: var(--sim-good); }
.bwg-verdict[data-tone="miss"], .bwg-verdict[data-tone="neg"] { border-color: var(--sim-bad); }
.bwg-verdict[data-tone="zero"] { border-color: var(--sim-label-muted); }
.bwg-badge { flex: 0 0 auto; width: 34px; height: 34px; display: grid; place-items: center; border-radius: 50%; font-size: var(--sim-text-lg); font-weight: 800; color: var(--sim-bg-deep); }
.bwg-verdict[data-tone="good"] .bwg-badge { background: var(--sim-good); }
.bwg-verdict[data-tone="miss"] .bwg-badge { background: var(--sim-bad); }
.bwg-verdict[data-tone="neg"] .bwg-badge { background: var(--sim-bad); }
.bwg-verdict[data-tone="zero"] .bwg-badge { background: var(--sim-label-muted); }
.bwg-verdict[data-tone="good"] .bwg-verdict-title { color: var(--sim-good); }
.bwg-verdict[data-tone="miss"] .bwg-verdict-title, .bwg-verdict[data-tone="neg"] .bwg-verdict-title { color: var(--sim-bad); }
.bwg-verdict-title { font-size: var(--sim-text-md); font-weight: 800; line-height: 1.2; }
.bwg-verdict-sub { display: block; font-size: var(--sim-text-sm); font-weight: 600; color: var(--sim-label-muted); }
.sim-dom-root--portrait .bwg-dial { grid-template-columns: minmax(0, 1fr) auto; }
.sim-dom-root--portrait .bwg-dial input[type="range"] { grid-column: 1 / -1; }
`;

function dialHtml(d) {
  return `<div class="bwg-dial">
    <label class="bwg-dial-label" for="bwg-${d.id}">${d.label}</label>
    <span class="bwg-dial-val" data-val="${d.id}"></span>
    <input class="bwg-input bwg-input--${d.id}" type="range" min="${d.min}" max="${d.max}" step="${d.step}" value="${d.start}">
  </div>`;
}

// The rail: one tick a metre, the zero datum picked out, the ends named.
function railHtml() {
  let html = '<span class="bwg-rulelab">rail</span>';
  for (let m = -SPAN_M; m <= SPAN_M; m++) {
    const y = FLOOR_Y + (m + SPAN_M) * PX_PER_M;
    html += `<span class="bwg-tick${m === 0 ? ' bwg-tick--zero' : ''}" style="bottom: ${y}px"></span>`;
    if (m === -SPAN_M || m === 0 || m === SPAN_M) {
      html += `<span class="bwg-ticklab" style="bottom: ${y}px">${m > 0 ? '+' : ''}${m} m</span>`;
    }
  }
  return html;
}

export class BagWorkGameScene extends withChallenge(DomSimulation) {
  static WIDTH = W;
  static HEIGHT = H;
  static PORTRAIT_WIDTH = 380;
  static PORTRAIT_HEIGHT = 808; // sim-layout portrait natural: 792
  static ARIA_LABEL = 'A gantry with a load on a hook; set mass, lift height and pull angle, then press Lift to work the load against a target.';
  static OBJECTIVE = {
    prompt: { en: 'Hit the target work value exactly: set the mass, the lift height and the pull direction so the work reads the target number.' },
  };
  static SCORING = { tolerance: TOLERANCE };
  // No BEAT_STEP_MAP and no CONTROLS: a mini-game@1 block mounts this with no
  // beats, and DomSimulation has no control bar - the dials are in-panel.
  static CONTROLS = [];

  async setup() {
    await super.setup();
    this.render({
      css: SIM_LOOK_DOM_CSS + CSS,
      html: `<div class="sim-card">
        <div class="bwg-target">
          <span class="bwg-target-label">Target work</span>
          <span class="bwg-target-val">${TARGET_J} J</span>
        </div>
        <div class="bwg-stage sl-backdrop" data-stage role="img" aria-label="A gantry: a load hangs from a pulley on the beam and is raised up or lowered down a marked rail.">
          <div class="bwg-floorband"></div>
          <div class="bwg-leg bwg-leg--l"></div>
          <div class="bwg-leg bwg-leg--r"></div>
          <div class="bwg-brace bwg-brace--l"></div>
          <div class="bwg-brace bwg-brace--r"></div>
          <div class="bwg-beam"></div>
          <div class="bwg-pulley"></div>
          <div class="bwg-pull" data-pull>
            <span class="bwg-pull-rope" data-pull-rope></span>
            <span class="bwg-pull-head" data-pull-head></span>
          </div>
          <div class="bwg-shadow" data-shadow></div>
          <div class="bwg-foot"></div>
          <div class="bwg-foot bwg-foot--r"></div>
          <div class="bwg-railpost"></div>
          ${railHtml()}
          <div class="bwg-load bwg-load--still" data-load-group>
            <span class="bwg-rope"></span>
            <span class="bwg-hook"></span>
            <div class="bwg-bag" data-bag data-mood="calm">
              <span class="bwg-knot"></span>
              <span class="bwg-eye bwg-eye--l"><span class="bwg-pupil"></span></span>
              <span class="bwg-eye bwg-eye--r"><span class="bwg-pupil"></span></span>
              <span class="bwg-mouth"></span>
              <span class="bwg-masstag" data-load>20 kg</span>
            </div>
          </div>
          <div class="bwg-dest" data-dest><span class="bwg-hchip" data-hchip>+0.5 m</span></div>
        </div>
        <div class="bwg-out">
          <span class="bwg-eq" data-eq></span>
          <span class="bwg-j bwg-j--zero" data-j>0 J</span>
        </div>
        <div class="bwg-dials">${DIALS.map(dialHtml).join('')}</div>
        <div class="bwg-actions">
          <button class="bwg-lift" type="button" data-lift>Lift</button>
          ${simTag('retries are free')}
        </div>
        <p class="bwg-verdict" data-verdict hidden>
          <span class="bwg-badge" data-badge></span>
          <span class="bwg-verdict-title" data-vtitle></span>
        </p>
      </div>`,
    });

    const q = (s) => this.root?.querySelector(s);
    this._stage = q('[data-stage]');
    this._load = q('[data-load-group]');
    this._bag = q('[data-bag]');
    this._shadow = q('[data-shadow]');
    this._pull = q('[data-pull]');
    this._pullRope = q('[data-pull-rope]');
    this._pullHead = q('[data-pull-head]');
    this._hchip = q('[data-hchip]');
    this._dest = q('[data-dest]');
    this._eq = q('[data-eq]');
    this._j = q('[data-j]');
    this._verdict = q('[data-verdict]');
    this._badge = q('[data-badge]');
    this._vtitle = q('[data-vtitle]');
    this._liftBtn = q('[data-lift]');
    this._dials = {};
    this._vals = {};
    for (const d of DIALS) {
      this._dials[d.id] = q(`.bwg-input--${d.id}`);
      this._vals[d.id] = q(`[data-val="${d.id}"]`);
    }

    this._lifting = false;
    this._lastWork = 0;

    // The sim-test harness DOM has no HTML parser, so these are null there and
    // present in a browser. The scene simply rests when they are absent.
    for (const d of DIALS) {
      this._dials[d.id]?.addEventListener('input', () => this._paint());
    }
    this._liftBtn?.addEventListener('click', () => this._doLift());
    this._paint();
  }

  // --- the dials -----------------------------------------------------------
  _val(d) {
    const el = this._dials?.[d.id];
    const v = el ? Number(el.value) : d.start;
    return Number.isFinite(v) ? v : d.start;
  }

  _mass() { return this._val(DIALS[0]); }
  _height() { return this._val(DIALS[1]); }
  _angle() { return this._val(DIALS[2]); }

  _work() {
    return workOf(this._mass(), this._height(), this._angle());
  }

  _fmt(v) {
    const r = Math.round(v * 10) / 10;
    return Number.isInteger(r) ? String(r) : r.toFixed(1);
  }

  _signed(v) { return `${v > 0 ? '+' : ''}${this._fmt(v)} m`; }

  _paint() {
    if (this._lifting) return;
    const m = this._mass();
    const s = this._height();
    const a = this._angle();
    for (const d of DIALS) {
      const out = this._vals[d.id];
      if (out) out.textContent = `${this._fmt(this._val(d))} ${d.unit}`;
    }
    if (this._hchip) this._hchip.textContent = this._signed(s);
    // The load waits at the datum; the dashed marker shows where Lift will
    // take it, so the lift itself is still there to be watched.
    this._drawLoad(m, s, a, true, 0);
    this._j?.classList.add('bwg-j--zero');
    if (this._j) this._j.textContent = '0 J';
    if (this._bag) this._bag.dataset.mood = 'calm';
    // A verdict is about the setup that produced it. Moving a dial retires it,
    // or a solved run leaves a green tick sitting over a readout that has
    // already changed - the picture would be arguing with itself.
    if (this._verdict) this._verdict.hidden = true;
  }

  // The apparatus. Height is the signed lift in metres; the pull rope swings
  // from straight down (all of the force lifts) to square across (none of it
  // does), which is the cos the readout is multiplying by.
  _drawLoad(m, s, a, still, at = s) {
    const bag = bagOf(m);
    if (this._dest) this._dest.style.bottom = `${FLOOR_Y + (s + SPAN_M) * PX_PER_M}px`;
    if (this._load) {
      this._load.classList.toggle('bwg-load--still', still);
      this._load.style.bottom = `${FLOOR_Y + (at + SPAN_M) * PX_PER_M}px`;
      this._load.style.setProperty('--bag-w', `${bag.w}px`);
      this._load.style.setProperty('--bag-h', `${bag.h}px`);
    }
    if (this._shadow) {
      // A contact shadow on the floor: it spreads and darkens as the load nears.
      const near = (at + SPAN_M) / (2 * SPAN_M);
      this._shadow.style.opacity = `${0.35 + 0.5 * near}`;
      this._shadow.style.transform = `translateX(-50%) scaleX(${(0.55 + 0.45 * near).toFixed(3)})`;
    }
    if (this._pull) {
      const len = Math.round(PULL_MIN + (m * G / F_MAX) * PULL_SPAN);
      this._pull.style.transform = `rotate(${-a}deg)`;
      if (this._pullRope) this._pullRope.style.height = `${len}px`;
      if (this._pullHead) this._pullHead.style.top = `${len - 1}px`;
    }
    if (this._eq) this._eq.textContent = `${m * G} N ${MUL} ${this._fmt(s)} m ${MUL} cos(${this._fmt(a)}${DEG})`;
  }

  // --- one lift -------------------------------------------------------------
  _doLift() {
    if (this._lifting) return;
    this._lifting = true;
    if (this._verdict) this._verdict.hidden = true;
    if (this._liftBtn) this._liftBtn.disabled = true;
    // The dials lock for the lift, so a slider can never disagree with the
    // reading it was just used to set.
    for (const d of DIALS) if (this._dials[d.id]) this._dials[d.id].disabled = true;

    const m = this._mass();
    const s = this._height();
    const a = this._angle();
    const w = this._work();

    this._drawLoad(m, s, a, false);
    if (this._j) {
      this._j.textContent = `${this._fmt(w)} J`;
      this._j.className = w > 0.5 ? 'bwg-j bwg-j--pos' : (w < -0.5 ? 'bwg-j bwg-j--neg' : 'bwg-j bwg-j--zero');
    }
    this._lastWork = w;

    // A real timer, not a per-frame countdown: the verdict lands when the
    // trolley arrives, and the scene is at rest before and after it.
    this.startDwellTimer(RUN_MS, () => this._finish());
  }

  _finish() {
    this._lifting = false;
    if (this._liftBtn) this._liftBtn.disabled = false;
    for (const d of DIALS) if (this._dials[d.id]) this._dials[d.id].disabled = false;
    const res = this.evaluate();
    const v = this._verdictFor(res);
    this._showVerdict(v);
    if (this._load) this._load.classList.add('bwg-load--still');
    if (this._bag) this._bag.dataset.mood = v.mood;
    if (v.tone === 'good') burst(this._stage);
  }

  _verdictFor(res) {
    const w = this._lastWork;
    if (res.solved) return { tone: 'good', mood: 'happy', glyph: GLYPH.good, title: `On the target - ${this._fmt(w)} J.`, sub: `F ${MUL} s got you there.` };
    if (Math.abs(w) < 0.5) return { tone: 'zero', mood: 'flat', glyph: GLYPH.zero, title: 'Zero - pulled square across.', sub: 'Nothing acts along the lift.' };
    if (w < 0) return { tone: 'neg', mood: 'flat', glyph: GLYPH.neg, title: `Negative - ${this._fmt(w)} J.`, sub: 'The mass went down; no target takes a negative.' };
    if (w > TARGET_J) return { tone: 'miss', mood: 'calm', glyph: GLYPH.miss, title: `Overshot - ${this._fmt(w)} J.`, sub: `The target is ${TARGET_J} J.` };
    return { tone: 'miss', mood: 'calm', glyph: GLYPH.miss, title: `Undershot - ${this._fmt(w)} J.`, sub: `The target is ${TARGET_J} J.` };
  }

  _showVerdict({ tone, glyph, title, sub }) {
    if (!this._verdict) return;
    if (this._badge) this._badge.textContent = glyph;
    if (this._vtitle) this._vtitle.innerHTML = `${title}<span class="bwg-verdict-sub">${sub}</span>`;
    this._verdict.dataset.tone = tone;
    this._verdict.hidden = false;
  }

  // The tie: the win condition IS F x s, computed from the dials and nothing else.
  checkObjective() {
    if (this._lifting || this._lastWork === 0) return null;
    return { value: this._lastWork, target: TARGET_J };
  }

  destroy() {
    this.clearDwellTimer();
    this._stage = null;
    this._load = null;
    this._bag = null;
    this._shadow = null;
    this._pull = null;
    this._pullRope = null;
    this._pullHead = null;
    this._hchip = null;
    this._dest = null;
    this._eq = null;
    this._j = null;
    this._verdict = null;
    this._badge = null;
    this._vtitle = null;
    this._liftBtn = null;
    this._dials = null;
    this._vals = null;
    super.destroy();
  }
}
