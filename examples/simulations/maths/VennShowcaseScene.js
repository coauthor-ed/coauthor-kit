/**
 * VennShowcaseScene - reference for kit/SimVenn.js (SVG, DOM) and kit/SimVennSpec.js, on the SvgScene clock.
 *   Beat 0: numbers 1 to 12 pop into two rings (V.slots packs them, no overlap); the ring chips carry counts
 *   Beat 1: pick a set expression; its regions shade with a sweep (V.exprMask + regionSweepSvg)
 *   Beat 2: three rings, every region tagged with its name (vennSvg tags: true)
 *   Beat 3: tap a region to read its name and its expression (V.regionOf + focus)
 * The spec is rebuilt for the stage size, so portrait stacks the two rings and keeps full-size chips.
 */
import { SvgScene, chip, liveChip, cardHtml, cushionCircle, stroke } from 'simulations/base/kit/SimSvg.js';
import { ease, pop } from 'simulations/base/kit/SimAnim.js';
import { vennSpec, vennSvg, regionSweepSvg, regionColor, VENN_CSS } from 'simulations/base/kit/SimVenn.js';

const MAP = [0, 1, 2, 3].map((i) => [{ idx: i, dwellMs: null }]);
const NUMS = Array.from({ length: 12 }, (_, i) => i + 1);
const maskOfN = (k) => (k % 2 === 0 ? 1 : 0) | (k % 3 === 0 ? 2 : 0);
const EXPRS = [
  { value: 'A-B', label: 'A \u2212 B' }, { value: 'A&B', label: 'A \u2229 B' }, { value: 'A|B', label: 'A \u222a B' },
  { value: "(A|B)'", label: '(A \u222a B)\u2032' }, { value: "B'", label: 'B\u2032' },
];
const B0 = { at: 0.25, lag: 0.12 };
const ENDS = [B0.at + NUMS.length * B0.lag + 0.5, 1.6];
const seg = (t, a, len) => Math.max(0, Math.min(1, (t - a) / len));

export class VennShowcaseScene extends SvgScene {
  static BEAT_STEP_MAP = MAP;
  static ARIA_LABEL = 'Venn diagrams: the numbers 1 to 12 sorted into the rings even and multiple of 3; a chosen set expression shaded on two rings; three rings with every region named; tap a region to read its name and expression.';
  static CONTROLS = [
    { type: 'select', id: 'expr', label: 'Shade:', value: 'A-B', options: EXPRS },
    { type: 'button', id: 'replay', label: 'Replay' },
  ];

  css() { return VENN_CSS; }
  stageHeight(st) { return st.portrait ? [560, 500, 540, 600][this.stepIndex ?? 0] : 430; }

  enter(step) {
    this.expr = this.expr ?? 'A-B';
    this.sel = 7;
    if (step <= 1) this.play(ENDS[step]);
  }

  isControlHidden(id) { return id === 'expr' ? this.stepIndex !== 1 : this.stepIndex > 1; }
  getControlValue(id) { return id === 'expr' ? this.expr : undefined; }
  onControlChange(id, v) {
    if (this.isControlHidden(id)) return;
    if (id === 'expr') this.expr = String(v);
    this.repaint();
    this.play(ENDS[this.stepIndex]);
    this.requestUiUpdate?.();
  }

  // The spec for this beat at this stage size (rebuilt only when either changes).
  spec(st) {
    const s = this.stepIndex, P = st.portrait, W = st.W, H = st.H;
    const key = `${s}|${W}|${H}`;
    if (this._vk === key) return this._v;
    let box, rings;
    if (s === 0) { box = { x: 6, y: 6, w: W - 12, h: H - 66 }; rings = [{ id: 'A', label: 'even' }, { id: 'B', label: 'multiple of 3' }]; }
    else if (s === 1) { box = { x: 6, y: 6, w: W - 12, h: H - 66 }; rings = [{ id: 'A' }, { id: 'B' }]; }
    else if (s === 2) { box = { x: 6, y: 6, w: W - 12, h: H - 16 }; rings = [{ id: 'A' }, { id: 'B' }, { id: 'C' }]; }
    else { box = P ? { x: 6, y: 6, w: W - 12, h: H - 180 } : { x: 6, y: 6, w: W - 222, h: H - 16 }; rings = [{ id: 'A' }, { id: 'B' }, { id: 'C' }]; }
    this._vk = key;
    this._v = vennSpec({ box, rings, overlap: s === 0 && !P ? 0.36 : undefined });
    if (s === 0) {
      const by = new Map();
      for (const k of NUMS) { const m = maskOfN(k); by.set(m, [...(by.get(m) ?? []), k]); }
      this._slots = new Map();
      for (const [m, ks] of by) { const sl = this._v.slots(m, ks.length, { r: 17, gap: 8 }); ks.forEach((k, i) => this._slots.set(k, { ...sl[i], r: sl.r })); }
    }
    return this._v;
  }

  pointerDown(p) {
    if (this.skip()) return false;
    if (this.stepIndex !== 3) return false;
    const m = this.spec(this.sv).regionOf(p);
    if (m != null && m !== this.sel) { this.sel = m; this.repaint(); }
    return false;
  }

  paint(st) {
    const V = this.spec(st), s = this.stepIndex, W = st.W, H = st.H;
    if (s === 0) {
      const out = vennSvg(V, { ringCounts: { A: 6, B: 4 } });
      return { ...out, head: chip('Sort 1 to 12', 0, 0, { tone: 'plain', size: 'big', static: true }) };
    }
    if (s === 1) {
      const ms = [...V.exprMask(this.expr)], lab = EXPRS.find((e) => e.value === this.expr)?.label ?? this.expr;
      const out = vennSvg(V, {});
      out.over += chip(ms.map((m) => V.region(m)?.name).filter(Boolean).join(' + ') || 'nothing', W / 2, H - 28, { tone: 'gold', size: 'big' });
      return { ...out, head: chip(lab, 0, 0, { tone: 'gold', size: 'big', static: true, cls: 'vn-sym' }) };
    }
    if (s === 2) {
      const out = vennSvg(V, { tags: st.portrait ? 'short' : true });
      return { ...out, head: chip('Eight regions', 0, 0, { tone: 'plain', size: 'big', static: true }) };
    }
    const out = vennSvg(V, { focus: this.sel });
    const r = V.region(this.sel);
    const c = st.portrait ? { x: 6, y: H - 160, w: W - 12 } : { x: W - 206, y: 40, w: 200 };
    out.over += cardHtml(c.x, c.y, c.w, 'this region', [
      { label: 'name', value: r?.name ?? '' }, { label: 'sets', value: r?.sym ?? '', tone: 'gold' }, { label: 'typed', value: r?.expr ?? '' },
    ], { tone: 'gold' });
    return { ...out, head: chip('Tap a region', 0, 0, { tone: 'plain', size: 'big', static: true }) };
  }

  animate(st, t) {
    const live = this.live, s = this.stepIndex, V = this.spec(st);
    if (s === 0) {
      NUMS.forEach((k, i) => {
        const sl = this._slots.get(k);
        if (!sl) return;
        const pp = pop(t - B0.at - i * B0.lag), sc = pp ? pp.scale : 0;
        const rc = regionColor(V, {}, maskOfN(k)) ?? 'var(--sim-stroke)';
        const g = live.shape(`n${k}`, 'g', { html: cushionCircle(0, 0, sl.r, 'var(--sim-surface-raised)', { lift: 3, gloss: false })
          + `<circle r="${sl.r - 1.5}" ${stroke(rc, 3)}/><text y="6" text-anchor="middle" style="fill:var(--sim-label);font-size:${Math.round(sl.r * 1.05)}px">${k}</text>` });
        live.attrs(g, { transform: `translate(${sl.x.toFixed(1)} ${sl.y.toFixed(1)}) scale(${Math.max(0.001, sc).toFixed(3)})` });
      });
      if (t >= ENDS[0] - 0.3) liveChip(live, 'sum', '6 + 4 = 10, yet only 8 are inside', st.W / 2, st.H - 28, { tone: 'accent', size: st.portrait ? null : 'big', cls: 'sv-pop' });
    } else if (s === 1) {
      regionSweepSvg(live, 'sw', V, this.expr, ease.smooth(seg(t, 0.15, 1.3)), { angle: st.portrait ? 90 : 0 });
    }
  }
}
