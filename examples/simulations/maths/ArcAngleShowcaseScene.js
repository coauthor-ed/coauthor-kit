/**
 * ArcAngleShowcaseScene - the kit version of the grade-9 circle-theorem visual
 * (circles L06, ArcCentralAngleScene): the angle an arc makes at the centre is
 * double the angle it makes anywhere on the rest of the circle. A and B are fixed
 * on the circle; drag D round the far side and both readings follow.
 *
 *   geomFigure + geomHandles (SimGeomSpec)   points, the circle, the constrained drag
 *   geomCanvas (SimGeomCanvas)               circle, segments, angle arcs with LIVE values ('auto')
 *
 * Beats (3): 0 the arc AB and the angle at the centre C, 1 add D and the angle at D,
 * 2 free play: drag D; the relation chip stays true for every D.
 */
import { SimScene } from 'simulations/base/kit/SimScene.js';
import { drawBackdrop, pill } from 'simulations/base/kit/SimLook.js';
import { geomFigure, geomHandles, angleAt } from 'simulations/base/kit/SimGeomSpec.js';
import { geomCanvas } from 'simulations/base/kit/SimGeomCanvas.js';

const R = 170;
const make = () => geomFigure({
  points: [
    { id: 'C', x: 340, y: 250, label: 'C' },
    { id: 'A', onCircle: 'k', angleDeg: 205, label: 'A' },
    { id: 'B', onCircle: 'k', angleDeg: 335, label: 'B' },
    { id: 'D', onCircle: 'k', angleDeg: 90, label: 'D' },
  ],
  circles: [{ id: 'k', center: 'C', radius: R }],
});

export class ArcAngleShowcaseScene extends SimScene {
  static BEAT_STEP_MAP = [[{ idx: 0, dwellMs: null }], [{ idx: 1, dwellMs: null }], [{ idx: 2, dwellMs: null }]];
  static DRAGGABLE = true;
  static ARIA_LABEL =
    'A circle with centre C and two fixed points A and B on it. The angle the arc AB makes at the centre is shown, then the angle it makes ' +
    'at a point D on the far side of the circle. The centre angle is always double the angle at D. In free play, drag D round the circle.';

  constructor(container, config) {
    super(container, config);
    this.fig = make();
    this.h = geomHandles(this.fig, ['D'], { constrain: { D: 'k' }, snapDeg: 1, min: 30, max: 150 });
    this.hold = null;
  }

  enter() { this.fig = make(); this.h = geomHandles(this.fig, ['D'], { constrain: { D: 'k' }, snapDeg: 1, min: 30, max: 150 }); this.hold = null; }
  busy() { return !!this.hold; }
  pointerDown(p) { if (this.stage < 2) return false; const id = this.h.hit(p); if (!id) return false; this.hold = id; return true; }
  pointerMove(p) { if (!this.hold) return false; this.h.move(this.hold, p); return true; }
  pointerUp() { this.hold = null; }

  draw(ctx, c) {
    drawBackdrop(ctx, c, 'dots');
    const f = this.fig, st = this.stage;
    const centre = Math.round(angleAt(f, 'C', 'A', 'B')), inscribed = Math.round(angleAt(f, 'D', 'A', 'B'));
    const ids = st === 0 ? ['C', 'A', 'B'] : ['C', 'A', 'B', 'D'];
    if (st >= 1) f.pt('D').handle = st === 2;
    geomCanvas(ctx, c, f, {
      circles: [{ id: 'k', tone: 'muted' }],
      segments: [
        { from: 'C', to: 'A', tone: 'warning' }, { from: 'C', to: 'B', tone: 'warning' },
        ...(st >= 1 ? [{ from: 'D', to: 'A', tone: 'primary' }, { from: 'D', to: 'B', tone: 'primary' }] : []),
      ],
      angles: [
        { at: 'C', from: 'A', to: 'B', label: 'auto', tone: 'warning', radius: 52 },
        ...(st >= 1 ? [{ at: 'D', from: 'A', to: 'B', label: 'auto', tone: 'primary', radius: 44 }] : []),
      ],
      points: ids,
    });
    const msg = st === 0 ? 'The arc AB makes ' + centre + ' deg at the centre.'
      : centre + ' = 2 x ' + inscribed + (st === 2 ? '   (drag D)' : '');
    pill(ctx, c, msg, 340, 488, { bg: st === 0 ? c.warning : c.good, size: 17 });
  }
}
