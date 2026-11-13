/**
 * FigurePosesScene - contact sheet for SimFigure (look reference, not a lesson
 * scene). Beats: 0 front-view poses + side action poses, 1 builds, sizes, hair
 * and moods, 2 cycles (walk, run) and the throw keyframes.
 */
import { SimScene } from 'simulations/base/kit/SimScene.js';
import { drawBackdrop, drawFloor, pill } from 'simulations/base/kit/SimLook.js';
import { drawFigure, drawPersonGlyph, skinFor } from 'simulations/base/kit/SimFigure.js';

const MAP = [[{ idx: 0, dwellMs: null }], [{ idx: 1, dwellMs: null }], [{ idx: 2, dwellMs: null }]];
const HAIR = ['short', 'long', 'curly', 'bun', 'short'];

export class FigurePosesScene extends SimScene {
  static BEAT_STEP_MAP = MAP;
  static ARIA_LABEL = 'A contact sheet of cartoon people in different poses, builds and skin tones.';

  draw(ctx, c, t) {
    drawBackdrop(ctx, c, 'dots');
    const tops = [c.s1, c.s3, c.s4, c.s5, c.s2, c.s7, c.s8, c.s6];
    if (this.stage === 0) {
      drawFloor(ctx, c, 250, { seams: false });
      ['stand', 'relax', 'point', 'wave', 'cheer'].forEach((p, i) => this.fig(ctx, c, 72 + i * 134, 240, 175, p, i, tops[i], 'adult', 0, p, t));
      drawFloor(ctx, c, 492, { seams: false });
      ['push', 'pull', 'carry', 'reach-up'].forEach((p, i) => this.fig(ctx, c, 90 + i * 168, 482, 175, p, i + 1, tops[i + 4], 'adult', p === 'reach-up' ? 0 : 1, p, t));
    } else if (this.stage === 1) {
      drawFloor(ctx, c, 300, { seams: false });
      [['adult', 210], ['teen', 185], ['kid', 135], ['adult', 110], ['adult', 90], ['kid', 70]].forEach(([b, h], i) => {
        this.fig(ctx, c, 62 + i * 108, 290, h, 'stand', i, tops[i], b, i % 3 === 1 ? 1 : 0, b, t);
      });
      drawFloor(ctx, c, 492, { seams: false });
      [24, 34, 48, 64].forEach((h, i) => drawPersonGlyph(ctx, c, 40 + i * 62, 482, h, { col: [c.s1, c.s3, c.s5, c.s4][i] }));
      ['smile', 'happy', 'think', 'oops', 'effort'].forEach((m, i) => drawFigure(ctx, c,
        { x: 318 + i * 78, y: 482, height: 150, pose: 'stand', facing: i % 2 ? 1 : 0 },
        { skin: i % 4, hairStyle: HAIR[i], hair: i === 4 ? 1 : 0, top: tops[i + 3], mood: m, t }));
    } else {
      drawFloor(ctx, c, 250, { seams: false });
      ['walk', 'run'].forEach((k, j) => [0, 0.25, 0.5, 0.75].forEach((ph, i) => {
        this.fig(ctx, c, 46 + (j * 4 + i) * 84, 240, 150, { name: k, phase: ph }, i, tops[j * 4 + i], 'adult', 1, `${k} ${ph}`, t);
      }));
      drawFloor(ctx, c, 492, { seams: false });
      [0, 0.4, 0.62, 1].forEach((u, i) => this.fig(ctx, c, 90 + i * 165, 482, 175, { name: 'throw', u }, i, tops[i], 'adult', 1, `throw ${u}`, t));
    }
  }

  fig(ctx, c, x, y, h, pose, i, top, build, facing, label, t) {
    drawFigure(ctx, c, { x, y, height: h, pose, build, facing },
      { skin: skinFor(i), top, hairStyle: HAIR[i % 5], mood: typeof pose === 'string' && /push|pull/.test(pose) ? 'effort' : 'smile', t });
    pill(ctx, c, label, x, y - h - 20, { size: 13, bg: c.labelMuted });
  }
}
