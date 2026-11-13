/**
 * CivicKindsShowcaseScene - reference for kit/SimCivic.js (SVG, DOM). Every kind in a labelled grid, civic kinds
 * first, then the economy kinds (shop, stall, workshop, factory, sewingLine, tailor, bank, truck, report,
 * planOffice, library, shoe, uniform). Tap a kind to dim all its parts but the first (the dim hook a TapLight uses).
 * Drawn in 560 design units and scaled to the stage width; 4 columns in landscape, 3 in portrait, so names stay
 * 21 design px in portrait (14 px at 390).
 */
import { SvgScene, chip } from 'simulations/base/kit/SimSvg.js';
import { civicSvg, civicSize, CIVIC_KINDS, CIVIC_PARTS } from 'simulations/base/kit/SimCivic.js';

const DW = 560;
const NAME = (k) => k.replace(/([A-Z])/g, ' $1').toLowerCase().replace('book open', 'open book');

export class CivicKindsShowcaseScene extends SvgScene {
  static WIDTH = 560;
  static HEIGHT = 856;
  static PORTRAIT_WIDTH = 380;
  static PORTRAIT_HEIGHT = 924;
  static BEAT_STEP_MAP = [[{ idx: 0, dwellMs: null }]];
  static CONTROLS = [];
  static ARIA_LABEL = 'Every drawn civic and economy thing in the kit, each with its name: polling booth, ballot box, voting machine, parliament, court, office, school, tree, village square, books, newspaper, phone, microphone, shop, market stall, tailoring workshop, factory, sewing line, tailor table, bank, truck, report, planning office, library, shoe and school shirt.';

  async setup() { this.lit = null; await super.setup(); }

  enter() { this.lit = null; }

  k(st) { return st.W / DW; }

  grid(st) {
    const cols = st.portrait ? 3 : 4, cw = DW / cols, rh = st.portrait ? 150 : 118;
    return { cols, cw, rh, artH: rh - 44, rows: Math.ceil(CIVIC_KINDS.length / cols) };
  }

  stageHeight(st) { const g = this.grid(st); return Math.round((g.rows * g.rh + 8) * this.k(st)); }

  pointerDown(p) {
    const st = this.sv, k = this.k(st), g = this.grid(st);
    const c = Math.floor(p.x / k / g.cw), r = Math.floor((p.y / k - 4) / g.rh), i = r * g.cols + c;
    if (c < 0 || c >= g.cols || i < 0 || i >= CIVIC_KINDS.length) return false;
    this.lit = this.lit === i ? null : i;
    this.repaint();
    return false;
  }

  paint(st) {
    const k = this.k(st), g = this.grid(st);
    let pic = '';
    CIVIC_KINDS.forEach((kind, i) => {
      const c = i % g.cols, r = Math.floor(i / g.cols), cx = c * g.cw + g.cw / 2, top = 4 + r * g.rh;
      const s = civicSize(kind), fit = Math.min((g.cw - 14) / s.w, g.artH / s.h);
      const keep = CIVIC_PARTS[kind][0];
      pic += civicSvg(kind, cx, top + g.artH + 2, { w: s.w * fit, dim: this.lit === i ? (p) => p !== keep : null });
      pic += `<text x="${cx.toFixed(1)}" y="${(top + g.artH + 26).toFixed(1)}" text-anchor="middle" style="fill:var(--sim-label);font-size:${st.portrait ? 21 : 19}px">${NAME(kind)}</text>`;
    });
    return { svg: `<g transform="scale(${k.toFixed(4)})">${pic}</g>`, head: chip('Tap a thing to light one part', 0, 0, { tone: 'plain', static: true }) };
  }
}
