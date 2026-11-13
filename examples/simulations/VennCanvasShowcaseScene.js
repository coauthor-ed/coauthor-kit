/**
 * VennCanvasShowcaseScene - reference for kit/SimVennCanvas.js (canvas, SimScene), the twin of
 * maths/VennShowcaseScene.js (SVG).
 *   vennSpec (SimVennSpec)       the box, rings, regions, anchors, hit-test, set expressions
 *   vennCanvas (SimVennCanvas)   rings, tints, shading, ring pills with counts, region tags and counts
 *   regionSweepCanvas            the shading wipe, driven by the stage age
 * Beats (3): 0 two rings with region counts; 1 the regions of A union B shade with a sweep;
 * 2 three rings with every region named: tap a region to outline it.
 */
import { SimScene } from 'simulations/base/kit/SimScene.js';
import { drawBackdrop, pill, W, H } from 'simulations/base/kit/SimLook.js';
import { reducedMotion, ease } from 'simulations/base/kit/SimAnim.js';
import { vennSpec } from 'simulations/base/kit/SimVennSpec.js';
import { vennCanvas, regionSweepCanvas } from 'simulations/base/kit/SimVennCanvas.js';

const BOX = { x: 30, y: 24, w: W - 60, h: H - 96 };
const TWO = vennSpec({ box: BOX, rings: [{ id: 'A', label: 'cricket' }, { id: 'B', label: 'quiz' }] });
const THREE = vennSpec({ box: BOX, rings: [{ id: 'A' }, { id: 'B' }, { id: 'C' }] });
const SWEEP = { at: 0.3, len: 1.3 };

export class VennCanvasShowcaseScene extends SimScene {
  static BEAT_STEP_MAP = [[{ idx: 0, dwellMs: null }], [{ idx: 1, dwellMs: null }], [{ idx: 2, dwellMs: null }]];
  static ARIA_LABEL = 'Venn diagrams on canvas: two rings, cricket and quiz, with the count in each region; the union of A and B shading with a sweep; three rings with every region named, tap a region to outline it.';

  enter() { this.sel = null; }
  sweepU() { return reducedMotion() ? 1 : ease.smooth(Math.max(0, Math.min(1, (this.age - SWEEP.at) / SWEEP.len))); }
  busy() { return this.stage === 1 && this.sweepU() < 1; }

  pointerDown(p) {
    if (this.stage !== 2) return false;
    const m = THREE.regionOf(p);
    this.sel = m == null || m === this.sel ? null : m;
    return false;
  }

  draw(ctx, c) {
    drawBackdrop(ctx, c, 'dots');
    const foot = (t, bg) => pill(ctx, c, t, W / 2, H - 38, { bg, size: 18 });
    if (this.stage === 0) {
      vennCanvas(ctx, c, TWO, { counts: { 0: 0, 1: 5, 2: 4, 3: 1 }, ringCounts: { A: 6, B: 5 } });
      foot('6 + 5 = 11, but the class has 10', c.accent);
    } else if (this.stage === 1) {
      const u = this.sweepU();
      vennCanvas(ctx, c, TWO, { tags: true, shade: u >= 1 ? 'A|B' : [] });
      if (u < 1) regionSweepCanvas(ctx, c, TWO, 'A|B', u);
      foot('A \u222a B: only A + both + only B', c.gold);
    } else {
      vennCanvas(ctx, c, THREE, { tags: 'short', focus: this.sel });
      const r = this.sel != null ? THREE.region(this.sel) : null;
      foot(r ? `${r.name}:  ${r.sym}` : 'Tap a region', r ? c.gold : c.stroke);
    }
  }
}
