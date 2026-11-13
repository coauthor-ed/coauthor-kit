/**
 * AreaTilesShowcaseScene - the kit version of the grade-9 tile puzzle (algebraic
 * identities L05, SairaPoolTilesScene): x^2 + 8x + 15 = (x + 3)(x + 5), as a
 * rectangle of tiles. The original draws the 15 unit tiles from a typed loop bound
 * while its caption and panel say other numbers; here the grid, the tile count and
 * the equation all come from ONE model, areaModel({ cols, rows }), so they cannot
 * disagree.
 *
 *   areaModel (SimGeomSpec)      cells, total, caption(), verify()
 *   areaGridCanvas (SimGeomCanvas) the tile grid, popped in cell by cell
 *   drawMathCaption (SimText)     the derived sentence, with a real superscript, wrapped
 *
 * Beats (2): 0 the rectangle built (a = 3, b = 5), 1 free play: A and B sliders (1-6).
 * x is drawn as 6 units so every tile is a readable size.
 */
import { SimScene } from 'simulations/base/kit/SimScene.js';
import { drawBackdrop, pill } from 'simulations/base/kit/SimLook.js';
import { drawMathCaption } from 'simulations/base/kit/SimText.js';
import { areaModel } from 'simulations/base/kit/SimGeomSpec.js';
import { areaGridCanvas } from 'simulations/base/kit/SimGeomCanvas.js';

const X = 6;

export class AreaTilesShowcaseScene extends SimScene {
  static BEAT_STEP_MAP = [[{ idx: 0, dwellMs: null }], [{ idx: 1, dwellMs: null }]];
  static ARIA_LABEL =
    'A rectangle made of algebra tiles with sides x plus a and x plus b: one x-squared tile, a columns of x tiles, b rows of x tiles and a times b unit tiles. ' +
    'The caption and the equation are worked out from the same numbers as the picture. In free play, two sliders change a and b.';
  static CONTROLS = [
    { type: 'slider', id: 'a', label: 'a:', min: 1, max: 6, step: 1, value: 3 },
    { type: 'slider', id: 'b', label: 'b:', min: 1, max: 6, step: 1, value: 5 },
  ];

  constructor(container, config) {
    super(container, config);
    this.a = 3; this.b = 5; this.grow = 0;
  }
  enter(stage) { if (stage === 0) { this.a = 3; this.b = 5; } this.grow = 0; }
  isControlHidden() { return this.stage !== 1; }
  getControlValue(id) { return id === 'a' ? this.a : id === 'b' ? this.b : undefined; }
  onControlChange(id, v) { if (!this._guard(id)) return; if (id === 'a') this.a = Math.round(Number(v)); if (id === 'b') this.b = Math.round(Number(v)); this.grow = 1; this.requestUiUpdate?.(); }
  busy() { return this.grow < 1; }
  update(d) { this.grow = Math.min(1, this.grow + d * 0.9); }

  draw(ctx, c) {
    drawBackdrop(ctx, c, 'dots');
    const { a, b } = this;
    const m = areaModel({ cols: [X, b], rows: [X, a], unit: 'tiles' });
    // the rectangle is X+b wide and X+a tall: fit it in the middle
    const s = Math.min(560 / m.width, 320 / m.height), w = m.width * s, h = m.height * s;
    const rect = { x: 340 - w / 2, y: 126, w, h };
    areaGridCanvas(ctx, c, rect, m, {
      grow: this.grow, tones: [[1, 2], [2, 3]],
      labels: [['x^2', b + 'x'], [a + 'x', String(a * b)]],
    });
    pill(ctx, c, 'x + ' + b, 340, rect.y - 22, { bg: c.s2, size: 15 });
    pill(ctx, c, 'x + ' + a, rect.x - 54, rect.y + h / 2, { bg: c.s2, size: 15 });
    const sq = ['sup', 'x', '2'];
    drawMathCaption(ctx, c, [sq, ' + ' + (a + b) + 'x + ' + a * b + ' = (x + ' + a + ')(x + ' + b + '). The corner holds ' + m.cells[3].area + ' unit tiles (' + a + ' x ' + b + ').'], 340, 12, { maxW: 640, size: 16 });
    pill(ctx, c, 'x is drawn as ' + X + ' units here', 340, 494, { bg: c.stroke, ink: c.label, size: 14 });
  }
}
