/**
 * StrataExtrasShowcaseScene - reference for GeoMap.drawStrataBlock extras:
 * endLines, grain, voids and a shear fault. Pick a block; each shows what the
 * option adds over the plain cutaway.
 */
import { SimScene } from 'simulations/base/kit/SimScene.js';
import { drawBackdrop, pill } from 'simulations/base/kit/SimLook.js';
import { drawStrataBlock } from 'simulations/base/kit/GeoMap.js';

const LAYERS = [{ key: 's3', thick: 0.3 }, { key: 's2', thick: 0.3 }, { key: 's5', thick: 0.4 }];
const BLOCKS = {
  plain: {},
  extras: { endLines: true, grain: 160, voids: [{ layer: 2, x: 0.45, y: 0.5, rx: 20, ry: 11 }] },
  fault: { endLines: true, grain: 120, fault: { x: 0.55, slip: 0.1 } },
};

export class StrataExtrasShowcaseScene extends SimScene {
  static BEAT_STEP_MAP = [[{ idx: 0, dwellMs: null }]];
  static ARIA_LABEL = 'Three cutaway blocks of rock layers: plain, with edge lines, grain and a cave, and sheared along a fault.';

  draw(ctx, c) {
    drawBackdrop(ctx, c, 'dots');
    Object.entries(BLOCKS).forEach(([name, o], i) => {
      const x = 24 + i * 218;
      drawStrataBlock(ctx, c, { x, y: 150, w: 200, h: 230 }, { layers: LAYERS, ...o });
      pill(ctx, c, name, x + 100, 420, { bg: c.accent, size: 15 });
    });
  }
}
