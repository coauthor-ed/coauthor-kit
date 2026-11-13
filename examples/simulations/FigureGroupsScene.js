/**
 * FigureGroupsScene - reference for people by role and in groups (SimFigure):
 * figureFor (a role and a pose in, a sized spec out), drawFigureRow (wraps into
 * rows behind, shrinks to fit, glyphs below 44 px), drawCrowd (seeded scatter,
 * back first) and highlightFigures (rings + a count chip). Every look is
 * derived from the person's index, so a group is varied and the same every frame.
 *
 * Beats (4): 0 the twelve roles, 1 rows of 3, 12 and 40 with counted people,
 * 2 a crowd with a sample ringed, 3 a labelled queue.
 */
import { SimScene } from 'simulations/base/kit/SimScene.js';
import { drawBackdrop, drawFloor, pill, rr, mix } from 'simulations/base/kit/SimLook.js';
import { figureFor, drawFigure, drawFigureRow, drawCrowd, highlightFigures, ROLE_NAMES } from 'simulations/base/kit/SimFigure.js';

const MAP = [[{ idx: 0, dwellMs: null }], [{ idx: 1, dwellMs: null }], [{ idx: 2, dwellMs: null }], [{ idx: 3, dwellMs: null }]];
const POSES = ['stand', 'point', 'relax', 'wave', 'stand', 'carry', 'relax', 'stand', 'wave', 'stand', 'relax', 'stand'];

// A soft panel behind a group, so three groups read as three.
function panel(ctx, c, x, y, w, h) { rr(ctx, x, y, w, h, 14); ctx.fillStyle = mix(c.bgDeep, c.bgSurface, 0.7); ctx.fill(); }

export class FigureGroupsScene extends SimScene {
  static BEAT_STEP_MAP = MAP;
  static ARIA_LABEL = 'Cartoon people: twelve everyday roles, rows of three, twelve and forty people with some of them ringed and counted, a crowd with a sample ringed, and a labelled queue.';

  draw(ctx, c, t) {
    drawBackdrop(ctx, c, 'dots');
    if (this.stage === 0) {
      [0, 1].forEach((r) => {
        const y = 222 + r * 246;
        drawFloor(ctx, c, y, { seams: false });
        ROLE_NAMES.slice(r * 6, r * 6 + 6).forEach((role, k) => {
          const i = r * 6 + k, x = 62 + k * 111;
          drawFigure(ctx, c, figureFor(this, { role, pose: POSES[i], i, x, y, scale: 78, facing: k % 2 ? 1 : 0, look: { t } }));
          pill(ctx, c, role, x, y + 20, { size: 14, bg: c.raised ?? c.bgSurface });
        });
      });
    } else if (this.stage === 1) {
      panel(ctx, c, 12, 12, 196, 246);
      panel(ctx, c, 220, 12, 448, 246);
      panel(ctx, c, 12, 270, 656, 238);
      const a = drawFigureRow(ctx, c, { n: 3, x: 20, w: 180, y: 240, top: 70, height: 150, t });
      highlightFigures(ctx, c, a, 1, { tone: c.s2 });
      const b = drawFigureRow(ctx, c, { n: 12, x: 230, w: 428, y: 240, top: 70, height: 150, t });
      highlightFigures(ctx, c, b, 5, { tone: c.s2 });
      const d = drawFigureRow(ctx, c, { n: 40, x: 20, w: 640, y: 496, top: 322, height: 120, t });
      highlightFigures(ctx, c, d, 13, { tone: c.s2, chip: { x: 340, y: 296 } });
    } else if (this.stage === 2) {
      drawFloor(ctx, c, 150, { seams: false });
      const crowd = drawCrowd(ctx, c, { rect: { x: 24, y: 70, w: 632, h: 420 }, n: 30, seed: 3, height: 130, t });
      highlightFigures(ctx, c, crowd, 9, { tone: c.s2, chip: { x: 340, y: 34 }, text: 'a sample of 9 of 30' });
    } else {
      drawFloor(ctx, c, 400, { seams: false });
      drawFigureRow(ctx, c, { n: 6, x: 30, w: 620, y: 390, height: 190, facing: 1, pose: 'stand', labels: ['first', 'second', 'third', 'fourth', 'fifth', 'last'], t });
    }
  }
}
