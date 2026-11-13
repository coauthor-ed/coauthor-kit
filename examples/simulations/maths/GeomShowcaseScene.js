/**
 * GeomShowcaseScene - reference for kit/SimGeom.js (SVG, DOM). Beats: 0
 * angles in the same segment: drag D round the circle, the angle at D never
 * changes and is half the angle at the centre; 1 drag a triangle's corner,
 * the angles always add to 180; 2 the area model of (a + b) squared.
 * Figures are built for the stage size (place), so portrait keeps full-size lines and labels.
 */
import { SvgScene, chip, cardHtml } from 'simulations/base/kit/SimSvg.js';
import { geomFigure, geomHandles, geomSvg, angleAt, areaGridSvg, GEOM_CSS } from 'simulations/base/kit/SimGeom.js';
import { join } from 'simulations/base/kit/SimNumberLine.js';
import { supHtml } from 'simulations/base/kit/SimText.js';

const MAP = [0, 1, 2].map((i) => [{ idx: i, dwellMs: null }]);
const deg = (v) => `${Math.round(v)}\u00b0`;

export class GeomShowcaseScene extends SvgScene {
  static BEAT_STEP_MAP = MAP;
  static ARIA_LABEL = 'Geometry: drag a point round a circle and the angle it makes on a fixed chord stays the same, half the angle at the centre; drag a triangle corner and its angles still add to 180 degrees; the area model of a plus b, squared.';

  css() { return GEOM_CSS; }
  enter() { this.dAng = 250; this.r = { x: 0.34, y: 0.1 }; }
  stageHeight(st) { return st.portrait ? [560, 540, 420][this.stepIndex ?? 0] : 440; }

  // Figure area and card area for this orientation.
  areas(st) {
    return st.portrait ? { fig: { x: 0, y: 0, w: st.W, h: st.H - 150 }, card: { x: 0, y: st.H - 140, w: st.W } }
      : { fig: { x: 0, y: 0, w: st.W - 196, h: st.H }, card: { x: st.W - 184, y: 10, w: 184 } };
  }

  circleFig(st) {
    const F = this.areas(st).fig, R = Math.min(F.w, F.h) / 2 - 44;
    const f = geomFigure({
      points: [{ id: 'O', x: 0, y: 0 }, { id: 'A', onCircle: 'c1', angleDeg: 150 }, { id: 'B', onCircle: 'c1', angleDeg: 30 }, { id: 'D', onCircle: 'c1', angleDeg: this.dAng }],
      circles: [{ id: 'c1', center: 'O', radius: R }], place: { x: F.x + F.w / 2, y: F.y + F.h / 2 + 10, s: 1 },
    });
    return { f, h: geomHandles(f, ['D'], { constrain: { D: 'c1' }, snapDeg: 2, min: 196, max: 344 }) };
  }
  triFig(st) {
    const F = this.areas(st).fig, pad = 40, W = F.w - 2 * pad, H = F.h - 2 * pad - 20;
    const f = geomFigure({ points: [{ id: 'P', x: 0, y: 1 }, { id: 'Q', x: 1, y: 1 }, { id: 'R', x: this.r.x, y: this.r.y }].map((p) => ({ ...p, x: F.x + pad + p.x * W, y: F.y + pad + 20 + p.y * H })) });
    return { f, h: geomHandles(f, ['R'], {}), F, W, H, pad };
  }

  pointerDown(p) {
    const g = this.stepIndex === 0 ? this.circleFig(this.sv) : this.stepIndex === 1 ? this.triFig(this.sv) : null;
    this.grab = g?.h.hit(p) ?? null;
    return !!this.grab;
  }
  pointerMove(p) {
    if (!this.grab) return false;
    if (this.stepIndex === 0) { const g = this.circleFig(this.sv); g.h.move('D', p); this.dAng = g.f.pt('D').angleDeg; }
    else { const g = this.triFig(this.sv); this.r = { x: Math.max(0.02, Math.min(0.98, (p.x - g.F.x - g.pad) / g.W)), y: Math.max(0, Math.min(0.8, (p.y - g.F.y - g.pad - 20) / g.H)) }; }
    return true;
  }
  pointerUp() { this.grab = null; }

  paint(st) { return [this.inscribed, this.triangle, this.area][this.stepIndex].call(this, st); }

  inscribed(st) {
    const { f } = this.circleFig(st), A = this.areas(st);
    const atD = angleAt(f, 'D', 'A', 'B'), atO = angleAt(f, 'O', 'A', 'B');
    const out = geomSvg(f, {
      circles: [{ id: 'c1' }], polygons: [{ points: ['A', 'D', 'B'], fill: 2 }],
      segments: [{ from: 'A', to: 'D' }, { from: 'B', to: 'D' }, { from: 'A', to: 'B', tone: 5 }, { from: 'O', to: 'A', style: 'dashed' }, { from: 'O', to: 'B', style: 'dashed' }],
      angles: [{ at: 'D', from: 'A', to: 'B', label: deg(atD), tone: 2 }, { at: 'O', from: 'A', to: 'B', label: deg(atO), tone: 1, radius: 36 }],
    });
    out.over += cardHtml(A.card.x, A.card.y, A.card.w, 'same chord AB', [
      { label: 'angle at D', value: deg(atD), tone: 2 }, { label: 'angle at O', value: deg(atO), tone: 1 }, { label: 'O is D x', value: (atO / atD).toFixed(1), tone: 'good' },
    ], { tone: 2 });
    return { ...out, head: chip('drag D round the circle', 0, 0, { tone: 2, size: 'big', static: true }) };
  }

  triangle(st) {
    const { f } = this.triFig(st), A = this.areas(st);
    const a = [angleAt(f, 'P', 'Q', 'R'), angleAt(f, 'Q', 'R', 'P'), angleAt(f, 'R', 'P', 'Q')];
    const out = geomSvg(f, {
      polygons: [{ points: ['P', 'Q', 'R'], fill: 5 }],
      segments: [{ from: 'P', to: 'Q' }, { from: 'Q', to: 'R' }, { from: 'R', to: 'P' }],
      angles: [{ at: 'P', from: 'Q', to: 'R', label: deg(a[0]), tone: 1 }, { at: 'Q', from: 'R', to: 'P', label: deg(a[1]), tone: 3 }, { at: 'R', from: 'P', to: 'Q', label: deg(a[2]), tone: 4 }],
    });
    out.over += cardHtml(A.card.x, A.card.y, A.card.w, 'angles', [
      { label: 'P + Q + R', value: `${deg(a[0])} + ${deg(a[1])} + ${deg(a[2])}` }, { label: 'sum', value: deg(a[0] + a[1] + a[2]), tone: 'good' },
    ], { tone: 5 });
    return { ...out, head: chip('drag R anywhere', 0, 0, { tone: 5, size: 'big', static: true }) };
  }

  area(st) {
    const side = Math.min(st.W - 90, st.H - 80), rect = { x: (st.W - side) / 2 + 20, y: 44, w: side, h: side };
    const out = areaGridSvg(rect, { cols: [3, 2], rows: [3, 2], labels: [[['sup', 'a', 2], 'ab'], ['ab', ['sup', 'b', 2]]], tones: [[1, 2], [2, 3]] });
    const lab = (t, x, y) => chip(t, x, y, { tone: 'plain', size: 'big' });
    out.over += lab('a', rect.x + rect.w * 0.3, rect.y - 24) + lab('b', rect.x + rect.w * 0.8, rect.y - 24) + lab('a', rect.x - 28, rect.y + rect.h * 0.3) + lab('b', rect.x - 28, rect.y + rect.h * 0.8);
    return { ...join(out), head: chip(`${supHtml('(a + b)', 2)} = ${supHtml('a', 2)} + 2ab + ${supHtml('b', 2)}`, 0, 0, { tone: 'warning', size: 'big', static: true, math: true }) };
  }
}
