/**
 * TableHighlightScene - plain-look anchor: a 2 x 2 table with margins (kit/SimTable.js). Illustrative
 * counts for 200 people: did they do a practice set (rows), did they pass (columns).
 * Teaches: compare rows by share, not by count; and the margins fix a missing cell.
 *   Beat 0: the table with its totals. The biggest count (66) is marked: it is not the biggest share.
 *   Beat 1: pick a row in the scene (or tap it): that row is emphasised and its pass share is read
 *           from the marked cell over the row total. 54 of 80 beats 66 of 120.
 *   Beat 2: one cell is hidden; the learner picks its value. The row total minus the other cell gives it.
 *           A right pick reveals the cell and calls celebrate(); a wrong one stays, dashed, with the rule.
 * Every share and total is computed from the cells, never typed. Controls live in the scene.
 * Annotations (kit/SimAnnotate.js) name the cell of each beat; the reading under the table counts up
 * to its value from the learner's pick, so a repaint never replays it.
 */
import { SvgScene, chip } from 'simulations/base/kit/SimSvg.js';
import { tableSpec, tableSvg, TABLE_CSS } from 'simulations/base/kit/SimTable.js';
import { flowChoiceHtml, bindFlow } from 'simulations/base/kit/SimFlowDom.js';
import { annotations } from 'simulations/base/kit/SimAnnotate.js';
import { reducedMotion } from 'simulations/base/kit/SimAnim.js';

const ROWS = ['Practised', 'Did not'];
const COLS = ['Passed', 'Not passed'];
const CELLS = [[54, 26], [66, 54]];
const HIDE = { r: 1, c: 1 };
const pct = (a, b) => `${Math.round((100 * a) / b)}%`;
const COUNT_S = 0.7;
const nowS = () => performance.now() / 1000;
const easeOut = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : 1 - Math.pow(1 - u, 3));

export class TableHighlightScene extends SvgScene {
  static BEAT_STEP_MAP = [[{ idx: 0, dwellMs: null }], [{ idx: 1, dwellMs: null }], [{ idx: 2, dwellMs: null }]];
  static ARIA_LABEL = 'A two by two table of illustrative counts for 200 people: practised or not, passed or not, with row and column totals. Rows are compared by the share who passed, not the count. Then one cell is hidden and found from the totals.';
  static CONTROLS = [];

  async setup() {
    this.notes = annotations({ max: 3 });
    await super.setup();
    bindFlow(this.root, { action: (name, v) => this.act(name, v) });
  }

  css() {
    return TABLE_CSS + `
.svs-head .sflow-choice { flex: none; }
.th-note { position: absolute; transform: translate(-100%, -50%); font: 600 var(--sim-text-sm)/1 var(--sim-font); color: var(--sim-label-muted); white-space: nowrap; }
.th-read { position: absolute; transform: translate(-50%, -50%); display: flex; align-items: baseline; gap: 10px; white-space: nowrap; color: var(--sim-label); }
.th-read small { font: 600 var(--sim-text-md)/1 var(--sim-font); color: var(--sim-label-muted); }
.th-read b { font: 700 38px/1 var(--sim-font); font-variant-numeric: tabular-nums; color: var(--sim-annot); }
`;
  }
  enter() { this.row = 0; this.guess = null; this.solved = false; this.fresh = new Set(); this.readAt = -1e9; this.readFrom = 0; this.notes.clear(); }
  stageHeight(st) { return st.portrait ? 420 : 400; }

  spec(st) {
    const w = Math.min(st.W - 24, 560);
    return tableSpec({ rect: { x: (st.W - w) / 2, y: 14, w, h: 250 }, rows: ROWS, cols: COLS, cells: CELLS,
      rowTitle: 'Practice set', colTitle: 'Result', totals: true });
  }

  act(name, v) {
    if (name === 'row' && this.stepIndex === 1 && Number(v) !== this.row) this.pickRow(Number(v));
    if (name === 'guess' && this.stepIndex === 2 && !this.solved) {
      const T = this.spec(this.sv);
      this.guess = Number(v);
      if (this.guess === T.value(HIDE.r, HIDE.c)) {
        this.solved = true;
        this.fresh = new Set([T.key(HIDE.r, HIDE.c)]);
        this.countUp(0);
        this.after(reducedMotion() ? 0.1 : COUNT_S + 0.1, () => this.celebrate(this.readEnd?.x, this.readEnd?.y));
      }
      this.repaint();
      this.fresh = new Set();
    }
  }

  pointerDown(p) {
    if (this.stepIndex !== 1) return false;
    const hit = this.spec(this.sv).cellAt(p);
    if (hit && hit.r >= 0 && hit.r < ROWS.length && hit.r !== this.row) this.pickRow(hit.r);
    return false;
  }

  share(r) { const T = this.spec(this.sv); return Math.round((100 * T.value(r, 0)) / T.value(r, T.nc)); }
  pickRow(r) { const from = this.share(this.row); this.row = r; this.countUp(from); this.repaint(); }
  countUp(from) { this.readFrom = from; this.readAt = nowS(); this.play(COUNT_S + 0.1); }

  // The reading's number counts from where it was to its value, timed from the learner's pick.
  animate() {
    const e = reducedMotion() ? 99 : nowS() - this.readAt;
    const el = this.sv.wrap.querySelector('[data-th-to]');
    if (el) el.textContent = Math.round(this.readFrom + (Number(el.dataset.thTo) - this.readFrom) * easeOut(e / COUNT_S)) + (el.dataset.thUnit ?? '');
    if (e < COUNT_S) this.live.more();
  }

  paint(st) {
    const T = this.spec(st), s = this.stepIndex;
    let out, head;
    if (s === 0) {
      out = tableSvg(T, { hi: [{ r: 1, c: 0, tone: 2 }] });
      head = chip(`${T.value(1, 0)} is the biggest count, from the bigger row`, 0, 0, { tone: 'plain', static: true });
    } else if (s === 1) {
      const r = this.row, a = T.value(r, 0), n = T.value(r, T.nc);
      out = tableSvg(T, { band: [{ row: r, tone: 1 }], hi: [{ r, c: 0, tone: 2 }, { r, c: T.nc, tone: 1, ring: true }], dim: true });
      head = flowChoiceHtml({ action: 'row', label: 'Row', value: r, options: ROWS.map((t, i) => ({ value: i, label: t })) })
        + chip(`${a} of ${n} passed = ${pct(a, n)}`, 0, 0, { tone: 'plain', static: true });
    } else {
      const k = T.key(HIDE.r, HIDE.c), right = T.value(HIDE.r, HIDE.c);
      const n = T.value(HIDE.r, T.nc), other = T.value(HIDE.r, 0);
      out = tableSvg(T, {
        hidden: this.solved ? [] : [HIDE], guess: this.guess != null && !this.solved ? { [k]: this.guess } : {}, fresh: this.fresh,
        hi: this.solved ? [{ ...HIDE, tone: 'good' }] : [{ r: HIDE.r, c: T.nc, tone: 1, ring: true }, { r: HIDE.r, c: 0, tone: 1, ring: true }],
      });
      const say = this.solved ? `${n} - ${other} = ${right}: the totals fix it` : this.guess != null ? `Not ${this.guess}: row total ${n} minus ${other}` : 'Which number is hidden?';
      head = (this.solved ? '' : flowChoiceHtml({ action: 'guess', label: 'Hidden cell', value: this.guess, options: [44, 54, 66].map((v) => ({ value: v, label: String(v) })) }))
        + chip(say, 0, 0, { tone: this.solved ? 'good' : 'plain', static: true });
    }
    // The beat's annotation and the reading under the table.
    const box = (r, c) => { const b = T.cell(r, c); return { x: b.x, y: b.y, w: b.w, h: b.h }; };
    const foot = T.rect.y + T.rect.h, yRead = foot + 40, xRead = st.W / 2;
    let read = '';
    if (s === 0) {
      const c = T.cell(1, 0);   // the leader leaves the cell by its corner, clear of the total under it
      this.notes.callout({ x: c.x + 8, y: c.y + c.h - 3 }, 'Biggest count', { key: 'big', side: 'below', at: { x: c.x - 24, y: foot + 22 }, sub: 'not the biggest share' });
    } else if (s === 1) {
      const r = this.row, a = T.value(r, 0), n = T.value(r, T.nc);
      this.notes.clear('tot0'); this.notes.clear('tot1');
      this.notes.ring(box(r, T.nc), { key: `tot${r}`, pad: 3 });
      read = `<span class="th-read" style="left:${xRead}px;top:${yRead}px"><small>${ROWS[r]}: ${a} of ${n} passed =</small><b><span data-th-to="${this.share(r)}" data-th-unit="%">${this.share(r)}%</span></b></span>`;
    } else if (this.solved) {
      const n = T.value(HIDE.r, T.nc), other = T.value(HIDE.r, 0), right = T.value(HIDE.r, HIDE.c);
      const t = T.cell(HIDE.r, T.nc);
      this.notes.callout({ x: t.x + t.w - 8, y: t.y + t.h - 3 }, 'Row total', { key: 'rt', side: 'below', at: { x: t.x + t.w - 40, y: foot + 22 }, sub: 'minus the other cell' });
      read = `<span class="th-read" style="left:${xRead}px;top:${yRead}px"><small>${n} - ${other} =</small><b><span data-th-to="${right}">${right}</span></b></span>`;
      this.readEnd = { x: xRead + 90, y: yRead };
    }
    out.svg = this.notes.under() + out.svg + this.notes.svg();
    out.over += this.notes.over() + read;
    out.over += `<span class="th-note" style="left:${(T.rect.x + T.rect.w).toFixed(1)}px;top:${(st.H - 12).toFixed(1)}px">Illustrative counts</span>`;
    return { ...out, head };
  }
}
