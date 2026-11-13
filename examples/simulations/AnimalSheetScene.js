/**
 * AnimalSheetScene - contact sheet for SimAnimal (look reference, not a lesson
 * scene). Beats: 0 every kind standing and walking at 90 px, 1 grazing and
 * lying at 90 px, 2 and 3 four kinds each at 200 px (stand, walk, graze, lie).
 */
import { SimScene } from 'simulations/base/kit/SimScene.js';
import { drawBackdrop, pill, rr, mix } from 'simulations/base/kit/SimLook.js';
import { drawAnimal, ANIMAL_KINDS } from 'simulations/base/kit/SimAnimal.js';

// A ground strip per cell (drawFloor fills to the bottom edge).
function strip(ctx, c, x0, x1, y) { rr(ctx, x0, y, x1 - x0, 6, 3); ctx.fillStyle = mix(c.bgDeep, c.s3, 0.35); ctx.fill(); }

const MAP = [[{ idx: 0, dwellMs: null }], [{ idx: 1, dwellMs: null }], [{ idx: 2, dwellMs: null }], [{ idx: 3, dwellMs: null }]];

export class AnimalSheetScene extends SimScene {
  static BEAT_STEP_MAP = MAP;
  static ARIA_LABEL = 'A contact sheet of cartoon animals - cow, goat, sheep, dog, cat, deer, tiger and elephant - standing, walking, grazing and lying.';

  draw(ctx, c, t) {
    drawBackdrop(ctx, c, 'dots');
    if (this.stage <= 1) {
      const poses = this.stage === 0 ? ['stand', 'walk'] : ['graze', 'lie'];
      ANIMAL_KINDS.forEach((kind, k) => {
        const col = k % 2, row = (k / 2) | 0;
        poses.forEach((pose, j) => {
          const x = 90 + col * 340 + j * 160, y = 108 + row * 118;
          if (j === 0) strip(ctx, c, col * 340 + 8, col * 340 + 332, y);
          drawAnimal(ctx, c, { x, y, length: 90, facing: 1, kind, pose, phase: 0.3 }, { t });
          if (j === 0) pill(ctx, c, kind, x - 52, y - 86, { size: 14, bg: c.labelMuted, align: 'left' });
        });
      });
      return;
    }
    const kinds = this.stage === 2 ? ['cow', 'tiger', 'elephant', 'deer'] : ['dog', 'cat', 'goat', 'sheep'];
    const poses = ['stand', 'walk', 'graze', 'lie'];
    kinds.forEach((kind, k) => {
      const x = 170 + (k % 2) * 340, y = 240 + ((k / 2) | 0) * 250;
      strip(ctx, c, (k % 2) * 340 + 8, (k % 2) * 340 + 332, y);
      drawAnimal(ctx, c, { x, y, length: 200, facing: k % 2 ? -1 : 1, kind, pose: poses[k], phase: 0.6 }, { t });
      pill(ctx, c, `${kind} ${poses[k]}`, x, y + 20, { size: 14, bg: c.labelMuted });
    });
  }
}
