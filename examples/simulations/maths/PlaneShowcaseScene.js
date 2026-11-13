/**
 * PlaneShowcaseScene - reference for kit/SimPlaneSvg.js (the school coordinate plane on an SvgScene).
 * One beat: graph paper with equal units, x from -5 to 5 and y from -5 to 8 (so B fits). The line
 * y = 2x + 1 draws itself outward from the middle of A(0, 1) and B(3, 7) (A is tagged "A": the intercept tag beside it reads (0, 1)) and extends both ways
 * (lineDrawOn), then rests as a static line with its equation tag (lineSvg). Also: y = -2x dashed, the
 * step triangle "1 across, 2 up" on y = 2x + 1, the y-intercept ring at (0, 1), and a point P that snaps
 * to the grid (drag it, or focus the picture and use the arrow keys), with guides to both axes.
 * Tap the picture while the line draws to skip to the end.
 */
import { SvgScene, chip, cardHtml } from 'simulations/base/kit/SimSvg.js';
import { planeFrame, planeSvg, pointSvg, lineSvg, lineDrawOn, stepTriangleSvg, interceptSvg, dragPoint, fmtCoord } from 'simulations/base/kit/SimPlaneSvg.js';

const MAP = [[{ idx: 0, dwellMs: null }]];
const DRAW = { dur: 1.4, delay: 0.3, from: 1.5 };

export class PlaneShowcaseScene extends SvgScene {
  static BEAT_STEP_MAP = MAP;
  static ARIA_LABEL = 'A coordinate plane on graph paper with equal units. The line y equals 2x plus 1 passes through A and B at 3, 7; the dashed line y equals minus 2x passes through the origin. A step triangle shows 1 across and 2 up. The line cuts the y-axis at 0, 1. Point P can be dragged or moved with the arrow keys; it snaps to the grid.';

  stageHeight(st) { return st.portrait ? 540 : 430; }

  dp = dragPoint(() => this.f ?? this.frame(this.sv), { x: -3, y: -2, snap: 1, onMove: () => this.repaint() });

  async setup() {
    await super.setup();
    this._unkeys = this.dp.bindKeys(this.sv.wrap, () => this.repaint(), { label: 'Point P on the grid. Arrow keys move it one square.' });
  }

  destroy() { this._unkeys?.(); super.destroy(); }

  enter() { this.drawn = false; this.play(DRAW.delay + DRAW.dur + 0.4); }

  frame(st) {
    const card = !st.portrait;
    const rect = card ? { x: 4, y: 4, w: st.W - 228, h: st.H - 8 } : { x: 2, y: 4, w: st.W - 4, h: st.H - 8 };
    return planeFrame(rect, [-5, 5], [-5, 8], { alignX: card ? 0.6 : 0.5 });
  }

  pointerDown(p) {
    if (this.isPlaying()) { this.skip(); return false; }
    return this.dp.down(p);
  }
  pointerMove(p) { return this.dp.move(p); }
  pointerUp(p) { this.dp.up(p); }

  paint(st) {
    const f = this.f = this.frame(st);
    const P = this.dp.pos();
    let svg = planeSvg(f);
    const nb = {};
    svg += lineSvg(f, -2, 0, { tone: 2, dash: true, label: 'y = -2x', labelAt: 'start', out: nb });
    const lineBox = {}, tri = {};
    const triSvg = stepTriangleSvg(f, 1, 2, 1, { out: tri });
    const ib = {};
    const ringSvg = interceptSvg(f, 1, { avoid: [{ a: 2, b: 1 }], out: ib });
    if (this.drawn) svg += lineSvg(f, 2, 1, { tone: 1, label: 'y = 2x + 1', out: lineBox, avoid: [tri.box, ...tri.boxes, ib.box] });
    svg += triSvg + ringSvg;
    const ab = {};
    svg += pointSvg(f, 0, 1, { tag: 'A', place: 'se', avoid: [{ a: 2, b: 1 }, ib.box].filter(Boolean), out: ab });
    svg += pointSvg(f, 3, 7, { name: 'B', avoid: [{ a: 2, b: 1 }, lineBox.box].filter(Boolean) });
    svg += pointSvg(f, P.x, P.y, { name: 'P', tone: 4, guides: true, drag: true, lit: this.dp.dragging, avoid: [{ a: 2, b: 1 }, { a: -2, b: 0 }, ab.box, ib.box, nb.box].filter(Boolean) });
    const over = st.portrait ? '' : cardHtml(st.W - 214, 24, 204, 'Point P', [
      { label: 'x', value: fmtCoord(P.x), tone: 4 },
      { label: 'y', value: fmtCoord(P.y), tone: 4 },
      { label: 'on y = 2x + 1?', value: P.y === 2 * P.x + 1 ? 'yes' : 'no', tone: 1 },
    ], { tone: 4 });
    const head = chip(st.portrait ? 'Equal units' : 'Graph paper: equal units', 0, 0, { tone: 'plain', size: 'big', static: true });
    return { svg, over, head };
  }

  animate(st, t) {
    if (this.drawn) return;
    const r = lineDrawOn(this.live, 'line', this.frame(st), 2, 1, t, { ...DRAW, tone: 1 });
    if (r.done || t >= DRAW.delay + DRAW.dur) { this.drawn = true; this.after(0, () => this.repaint()); }
  }
}
