/**
 * ClockDomShowcaseScene - a plain DomSimulation panel with the frame clock: withClock(DomSimulation) from
 * kit/SimClock.js (SimSvg.js re-exports it). The board is ordinary flex DOM; the moving numbers sit on the live layer
 * over it, placed with st.anchor(el) (a DOM element's point in design px).
 *   Beat 0: two tally sheets count up: 0 to 92 and 0 to 46 (countSvg)
 *   Beat 1: both tallies fly into the sum strip (flyChip), then "= 138" writes on (writeOnSvg)
 *   Beat 2: 138 is more than the 120 volunteers: the sum pulses (indicate), the 120 card is spotlit
 * Tap skips a running build; Replay runs it again.
 */
import { DomSimulation } from 'simulations/base/DomSimulation.js';
import { withClock } from 'simulations/base/kit/SimClock.js';
import { countSvg, MORPH_SVG_CSS } from 'simulations/base/kit/SimMorphSvg.js';
import { flyChip } from 'simulations/base/kit/SimFlySvg.js';
import { writeOnSvg } from 'simulations/base/kit/SimDrawOnSvg.js';
import { indicate, spotlight, focusK } from 'simulations/base/kit/SimFocusSvg.js';

const ENDS = [1.8, 2.2, 1.6];

const CSS = MORPH_SVG_CSS + `
.cd { display: flex; flex-direction: column; gap: var(--sim-space-3); padding: var(--sim-space-4); height: 100%; box-sizing: border-box; }
.cd-row { display: flex; gap: var(--sim-space-3); }
.cd-card { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 10px 12px 14px;
  border-radius: var(--sim-radius-md); background: var(--sim-bg-surface); border: 2.5px solid var(--c); box-shadow: 0 5px 0 color-mix(in oklab, var(--c) 55%, var(--sim-bg-deep)); }
.cd-card h3 { margin: 0; font: 800 var(--sim-text-md)/1.2 var(--sim-font); color: var(--sim-label); }
.cd-slot { height: 56px; width: 100%; }
.cd-strip { height: 76px; border-radius: var(--sim-radius-md); border: 2.5px dashed var(--sim-stroke); }
.cd-cap { margin: 0; text-align: center; font: 700 var(--sim-text-md)/1.3 var(--sim-font); color: var(--sim-label-muted); }
`;

const HTML = `<div class="cd">
  <div class="cd-row">
    <div class="cd-card" style="--c: var(--sim-series-1)"><h3>Sheet A: sport</h3><div class="cd-slot" data-slot="a"></div></div>
    <div class="cd-card" style="--c: var(--sim-series-2)"><h3>Sheet B: music</h3><div class="cd-slot" data-slot="b"></div></div>
    <div class="cd-card" style="--c: var(--sim-series-5)" data-card="u"><h3>Volunteers</h3><div class="cd-slot" data-slot="u"></div></div>
  </div>
  <div class="cd-strip" data-slot="sum"></div>
  <p class="cd-cap">Names on the sheets: tap to skip.</p>
</div>`;

export class ClockDomShowcaseScene extends withClock(DomSimulation) {
  static WIDTH = 620;
  static HEIGHT = 330;
  static BEAT_STEP_MAP = [0, 1, 2].map((i) => [{ idx: i, dwellMs: null }]);
  static ARIA_LABEL = 'Two tally sheets count 92 and 46 names; together that is 138, more than the 120 volunteers.';
  static CONTROLS = [{ type: 'button', id: 'replay', label: 'Replay' }];

  async setup() {
    await super.setup();
    this.render({ html: HTML, css: CSS });
    this.root.addEventListener('pointerdown', () => this.skip());
    this.onStep(0);
  }

  onStep(step) {
    this.clockReset();
    this.play(ENDS[step]);
  }

  onControlChange(id) {
    if (id === 'replay') this.onStep(this.stepIndex ?? 0);
  }

  animate(st, t) {
    const live = this.live, step = this.stepIndex ?? 0, q = (s) => this.root.querySelector(`[data-slot="${s}"]`);
    const a = st.anchor(q('a')), b = st.anchor(q('b')), u = st.anchor(q('u')), sum = st.anchor(q('sum'));
    const o = { size: 40, align: 'center', col: 'var(--sim-label)' };
    countSvg(live, 'u', 120, 120, 1, 1, u.x, u.y + 14, o);
    if (step === 0) {
      countSvg(live, 'a', 0, 92, t, 1.5, a.x, a.y + 14, { ...o, col: 'var(--sim-series-1-ink)' });
      countSvg(live, 'b', 0, 46, t, 1.5, b.x, b.y + 14, { ...o, col: 'var(--sim-series-2-ink)' });
      return;
    }
    // The two tallies fly into the strip (from their sheets in beat 1; at rest there in beat 2).
    const at = (p, dx) => ({ x: p.x + dx, y: p.y });
    const pulse = step === 2 ? indicate((t - 0.5) / 0.6, 0.25).s : 1;
    flyChip(live, 'fa', '92', step === 1 ? a : null, at(sum, -150), { tone: 1, size: 'big', delay: 0.2, arc: 40 });
    flyChip(live, 'fb', '46', step === 1 ? b : null, at(sum, -50), { tone: 2, size: 'big', delay: 0.35, arc: 40 });
    writeOnSvg(live, 'plus', '+', sum.x - 100, sum.y + 12, step === 1 ? t - 0.9 : 9, { size: 34, align: 'center', label: false });
    const eq = writeOnSvg(live, 'eq', '= 138', sum.x + 20, sum.y + 12, step === 1 ? t - 1.3 : 9, { size: 34, col: 'var(--sim-label)', label: '92 + 46 = 138' });
    if (step === 2) {
      const e = live.get('eq');
      if (e) live.css(e, { scale: pulse.toFixed(4), 'transform-origin': `${(eq.w / 2).toFixed(1)}px 60%` });
      const card = this.root.querySelector('[data-card="u"]'), tl = st.anchor(card, 0, 0), br = st.anchor(card, 1, 1);
      const x0 = tl.x - 4, y0 = tl.y - 4, x1 = br.x + 4, y1 = br.y + 8, r = 16;
      const d = `M${x0 + r} ${y0}H${x1 - r}A${r} ${r} 0 0 1 ${x1} ${y0 + r}V${y1 - r}A${r} ${r} 0 0 1 ${x1 - r} ${y1}H${x0 + r}A${r} ${r} 0 0 1 ${x0} ${y1 - r}V${y0 + r}A${r} ${r} 0 0 1 ${x0 + r} ${y0}Z`;
      spotlight(live, 'spot', d, focusK(t - 0.9, 0.4), { box: { x: 0, y: 0, w: st.W, h: st.H }, dim: 0.35 });
    }
  }
}
