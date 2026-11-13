/**
 * CasefileClaimScene - casefile showcase (plain look, SETTING casefile: a manila folder, a ruled card).
 * A hunch becomes a testable claim: the learner files five index cards (population, exposure,
 * comparison, outcome, direction) onto the working-claim form. Illustrative case after Snow, 1854.
 *   Beat 0: the hunch "the pump caused it" and an empty form. Tap a card in the tray: it is filed into
 *           its field, the count of named parts counts up, a ring marks the next missing part (its question in the field), the
 *           exposure and outcome get underlined. Each filed card leaves in its tray slot the evidence that part
 *           calls for (a slip), so the tray ends as the list of records a test needs. Five of five: the TESTABLE stamp lands on the count.
 *   Beat 1: the form filed, read back as one sentence on the card.
 * Annotations: kit/SimAnnotate.js (at most 3). The count is timed from the tap, so a repaint never
 * replays it. Objects only: no faces, no people drawn.
 */
import { SvgScene, chip } from 'simulations/base/kit/SimSvg.js';
import { annotations } from 'simulations/base/kit/SimAnnotate.js';
import { bindFlow } from 'simulations/base/kit/SimFlowDom.js';
import { reducedMotion } from 'simulations/base/kit/SimAnim.js';
import { esc } from 'simulations/base/SimUi.js';

const PARTS = [
  { k: 'pop', label: 'Population', text: 'Soho residents, 1854', ask: 'who, where, when?', needs: 'Homes by street' },
  { k: 'exp', label: 'Exposure', text: 'Broad St pump water', ask: 'exposed to what?', needs: 'Each home\'s pump' },
  { k: 'cmp', label: 'Comparison', text: 'users of other pumps', ask: 'against whom?', needs: 'Other pumps\' homes' },
  { k: 'out', label: 'Outcome', text: 'death from cholera', ask: 'measured how?', needs: 'Register of deaths' },
  { k: 'dir', label: 'Direction', text: 'a higher death rate', ask: 'which way?', needs: 'Rate in each group' },
];
const TRAY = ['exp', 'out', 'pop', 'dir', 'cmp'];
const COUNT_S = 0.6;
const nowS = () => performance.now() / 1000;
const easeOut = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : 1 - Math.pow(1 - u, 3));
const part = (k) => PARTS.find((p) => p.k === k);

export class CasefileClaimScene extends SvgScene {
  static SETTING = 'casefile';
  static BEAT_STEP_MAP = [[{ idx: 0, dwellMs: null }], [{ idx: 1, dwellMs: null }]];
  static ARIA_LABEL = 'A working-claim form in a case folder. The hunch: the pump caused the outbreak. Five index cards are filed into the form: population, Soho residents in 1854; exposure, Broad Street pump water; comparison, users of other pumps; outcome, death from cholera; direction, a higher death rate. Each named part adds the evidence it calls for to the tray: homes by street, each home\'s pump, other pumps\' homes, the register of deaths, the rate in each group. Five of five parts named: the claim is testable.';
  static CONTROLS = [];
  static PORTRAIT_HEIGHT = 980;

  async setup() {
    this.notes = annotations({ max: 3 });
    await super.setup();
    bindFlow(this.root, { action: (name, v) => this.act(name, v) });
  }

  enter(step) {
    this.filed = step === 1 ? PARTS.map((p) => p.k) : [];
    this.lastAt = -1e9;
    this.from = this.filed.length;
    this.notes.clear();
  }

  stageHeight(st) { return st.portrait ? 880 : 460; }

  act(name, v) {
    if (name !== 'file' || this.stepIndex !== 0 || this.filed.includes(v) || !part(v)) return;
    this.from = this.filed.length;
    this.filed.push(v);
    this.lastAt = nowS();
    this.repaint();
    this.play(COUNT_S + 0.1);
    if (this.filed.length === PARTS.length) this.after(reducedMotion() ? 0.1 : COUNT_S + 0.15, () => this.celebrate(this.countAt?.x, this.countAt?.y, { stamp: 'TESTABLE' }));
  }

  // The count of named parts counts up from the tap.
  animate() {
    const e = reducedMotion() ? 99 : nowS() - this.lastAt;
    const el = this.sv.wrap.querySelector('[data-cf-to]');
    if (el) el.textContent = String(Math.round(this.from + (Number(el.dataset.cfTo) - this.from) * easeOut(e / COUNT_S)));
    if (e < COUNT_S) this.live.more();
  }

  // Text width in stage px (the underline sits under the words, not the whole field).
  textW(s, px) {
    this._mc ??= document.createElement('canvas').getContext('2d');
    const fam = getComputedStyle(this.root).getPropertyValue('--sim-font').trim() || 'sans-serif';
    this._mc.font = `600 ${px}px ${fam}`;
    return this._mc.measureText(s).width;
  }

  // Regions in stage px: the form (the hero index card) and the tray of cards.
  geom(st) {
    const P = st.portrait, m = 40;
    if (P) {
      const fw = st.W - 2 * m + 8;
      return { P, fx: m - 4, fy: 40, fw, fh: 480, tx: m - 4, ty: 556, tw: fw, cardH: 46, rows: 148, gap: 58 };
    }
    const fw = Math.round((st.W - 2 * m) * 0.62), tx = m + fw + 26;
    return { P, fx: m, fy: 58, fw, fh: 350, tx, ty: 70, tw: st.W - m - tx, cardH: 50, rows: 96, gap: 42 };
  }

  paint(st) {
    const g = this.geom(st), s = this.stepIndex, n = this.filed.length, done = n === PARTS.length;
    let over = '';
    const rowY = (i) => g.fy + g.rows + i * g.gap;
    // Portrait stacks each label over its field (full width); landscape sets them side by side.
    const labW = g.P ? 0 : 108, labDy = g.P ? -25 : 0, fieldX = g.fx + 18 + labW, fieldW = g.fx + g.fw - 18 - fieldX;
    // The form: the hunch, then one field per part.
    let rows = '';
    PARTS.forEach((p, i) => {
      const on = this.filed.includes(p.k), fresh = on && p.k === this.filed[n - 1] && s === 0;
      rows += `<span class="cf-lab" style="left:${g.fx + 18}px;top:${rowY(i) + labDy}px">${esc(p.label)}</span>`
        + `<span class="cf-field${on ? ' cf-field--on' : ''}${fresh ? ' cf-fresh' : ''}" style="left:${fieldX}px;top:${rowY(i)}px;width:${fieldW}px">${on ? esc(p.text) : `? <em>${esc(p.ask)}</em>`}</span>`;
    });
    over += `<div class="cf-form" style="left:${g.fx}px;top:${g.fy}px;width:${g.fw}px;height:${g.fh}px">`
      + `<span class="sl-kicker cf-k">Case 2.3 - working claim</span><span class="cf-hunch">Hunch: the pump caused the outbreak.</span></div>` + rows;
    // The count: the payoff reading at the foot of the form.
    const cy = g.fy + g.fh - 34;
    this.countAt = g.P ? { x: g.fx + g.fw - 76, y: cy - 46 } : { x: g.fx + g.fw - 66, y: cy };
    over += `<span class="cf-count" style="left:${g.fx + 18}px;top:${cy}px"><small>Parts named</small><b><span data-cf-to="${n}">${n}</span> / ${PARTS.length}</b></span>`;
    // The tray (beat 0) or the claim read back (beat 1).
    if (s === 0) {
      over += `<span class="cf-tray-h sl-kicker" style="left:${g.tx}px;top:${g.ty - 22}px">Evidence tray${n ? ` ${n} / ${PARTS.length}` : ''}</span>`;
      TRAY.forEach((k, i) => {
        const p = part(k), on = this.filed.includes(k);
        const x = g.tx, w = g.tw, y = g.ty + i * (g.cardH + (g.P ? 8 : 10));
        const tilt = [-1.2, 0.8, -0.5, 1.1, -0.9][i];
        over += on
          ? `<span class="cf-slip${k === this.filed[n - 1] ? ' cf-slip--fresh' : ''}" style="left:${x}px;top:${y}px;width:${w}px;height:${g.cardH}px"><i>For ${esc(p.label.toLowerCase())}</i>${esc(p.needs)}</span>`
          : `<button type="button" class="cf-card" data-sflow-action="file" data-sflow-value="${k}" style="left:${x}px;top:${y}px;width:${w}px;height:${g.cardH}px;--tilt:${tilt}deg"><i>${esc(p.label)}</i>${esc(p.text)}</button>`;
      });
    } else {
      const say = `Among ${part('pop').text}, those who drank ${part('exp').text} had ${part('dir').text} from cholera than ${part('cmp').text}.`;
      over += `<span class="cf-tray-h sl-kicker" style="left:${g.tx}px;top:${g.ty - 22}px">The claim, testable</span>`
        + `<span class="cf-say" style="left:${g.tx}px;top:${g.ty}px;width:${g.tw}px">${esc(say)}</span>`;
    }
    // Annotations: the exposure and outcome underlined once filed; a callout on the next missing part.
    for (const k of ['exp', 'out']) {
      const i = PARTS.findIndex((p) => p.k === k);
      if (this.filed.includes(k)) this.notes.underline({ x1: fieldX + 10, x2: fieldX + 10 + Math.min(fieldW - 20, this.textW(part(k).text, 15)), y: rowY(i) + 12 }, { key: `ul-${k}` });
    }
    for (const p of PARTS) this.notes.clear(`miss-${p.k}`);
    const next = PARTS.findIndex((p) => !this.filed.includes(p.k));
    if (s === 0 && next >= 0 && n > 0) {
      const y = rowY(next);
      this.notes.ring({ x: fieldX, y: y - 16, w: fieldW, h: 32 }, { key: `miss-${PARTS[next].k}`, pad: 3 });
    }
    // The hero card is SVG, so the ring on the missing field draws over it; its text is HTML above.
    const card = `<rect x="${g.fx}" y="${g.fy}" width="${g.fw}" height="${g.fh}" rx="3" class="cf-card-bg"/>`;
    const svg = card + this.notes.under() + this.notes.svg();
    over += this.notes.over();
    const lede = s === 0 ? (done ? 'Every part named: the claim can be tested' : 'File the five parts a test needs') : 'Read the claim as one sentence';
    const head = chip(lede, 0, 0, { tone: done || s === 1 ? 'good' : 'plain', static: true });
    over += `<span class="cf-note" style="left:${st.W - 30}px;top:${st.H - 22}px">After Snow, 1854; illustrative</span>`;
    return { svg, over, head };
  }

  css() {
    return `
.svs-head { gap: var(--sim-space-3); }
.cf-form { position: absolute; box-sizing: border-box; padding: 14px 18px; }
.cf-card-bg { fill: var(--sim-bg-surface); filter: drop-shadow(0 6px 8px color-mix(in srgb, var(--sim-set-desk) 26%, transparent)); }
.cf-hunch { display: block; margin-top: 8px; font: italic 500 var(--sim-text-md)/1.3 var(--sim-font); color: var(--sim-label-muted); text-decoration: line-through; text-decoration-color: var(--sim-annot); }
.cf-lab { position: absolute; transform: translateY(-50%); font: 700 14px/1 var(--sim-font-mono, monospace); letter-spacing: 0.06em; text-transform: uppercase; color: var(--sim-label-muted); }
.cf-field { position: absolute; box-sizing: border-box; transform: translateY(-50%); height: 32px; padding: 0 10px; display: flex; align-items: center;
  border: 1.5px dashed var(--sim-stroke); border-radius: 3px; font: 600 15px/1 var(--sim-font); color: var(--sim-label-muted); white-space: nowrap; overflow: hidden; }
.cf-field em { margin-left: 8px; font: italic 500 14px/1 var(--sim-font); }
.cf-field--on { border: 1px solid color-mix(in srgb, var(--sim-label) 18%, transparent); background: var(--sim-set-card); color: var(--sim-label); }
.cf-fresh { animation: cf-in 0.28s cubic-bezier(0.3, 0, 0.1, 1) backwards; }
@keyframes cf-in { from { opacity: 0; transform: translate(18px, -50%); } }
.cf-count { position: absolute; transform: translateY(-50%); display: flex; align-items: baseline; gap: 12px; color: var(--sim-label); white-space: nowrap; }
.cf-count small { font: 700 14px/1 var(--sim-font-mono, monospace); letter-spacing: 0.06em; text-transform: uppercase; color: var(--sim-label-muted); }
.cf-count b { font: 700 36px/1 var(--sim-font); font-variant-numeric: tabular-nums; color: var(--sim-annot); }
.cf-tray-h { position: absolute; }
.cf-card { position: absolute; box-sizing: border-box; margin: 0; pointer-events: auto; padding: 7px 12px; text-align: left; cursor: pointer; transform: rotate(var(--tilt, 0deg));
  border: 1px solid color-mix(in srgb, var(--sim-label) 16%, transparent); border-radius: 2px; background: var(--sim-bg-surface);
  font: 600 15px/1.2 var(--sim-font); color: var(--sim-label); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  box-shadow: 0 3px 8px color-mix(in srgb, var(--sim-set-desk) 22%, transparent); transition: transform 0.12s ease-out; }
.cf-card i { display: block; margin-bottom: 3px; font: 700 14px/1 var(--sim-font-mono, monospace); font-style: normal; letter-spacing: 0.06em; text-transform: uppercase; color: var(--sim-annot); }
.cf-card:hover { transform: rotate(0deg) translateY(-2px); }
.cf-card:focus-visible { outline: 2px solid var(--sim-annot); outline-offset: 2px; }
.cf-slip { position: absolute; box-sizing: border-box; padding: 7px 10px 7px 12px; border-radius: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  border: 1px solid color-mix(in srgb, var(--sim-annot) 30%, transparent); border-left: 3px solid var(--sim-annot); background: color-mix(in srgb, var(--sim-annot) 7%, var(--sim-bg-surface));
  box-shadow: 0 2px 5px color-mix(in srgb, var(--sim-set-desk) 18%, transparent);
  font: 600 15px/1.2 var(--sim-font); color: var(--sim-label); }
.cf-slip i { display: block; margin-bottom: 3px; font: 700 14px/1 var(--sim-font-mono, monospace); font-style: normal; letter-spacing: 0.04em; text-transform: uppercase; color: var(--sim-label-muted); }
.cf-slip--fresh { animation: cf-slip 0.32s cubic-bezier(0.2, 0, 0, 1) 0.12s backwards; }
@keyframes cf-slip { from { opacity: 0; transform: translateY(6px); } }
.cf-say { position: absolute; box-sizing: border-box; padding: 12px 14px; font: 500 var(--sim-text-md)/1.5 var(--sim-font-mono, monospace); color: var(--sim-label); white-space: normal;
  background: var(--sim-bg-surface); border-radius: 2px; box-shadow: 0 3px 8px color-mix(in srgb, var(--sim-set-desk) 22%, transparent); }
.cf-note { position: absolute; transform: translate(-100%, -100%); font: 600 var(--sim-text-sm)/1 var(--sim-font); color: var(--sim-label-muted); white-space: nowrap; }
@media (prefers-reduced-motion: reduce) { .cf-fresh, .cf-slip--fresh { animation: none; } .cf-card { transition: none; } }
`;
  }
}
