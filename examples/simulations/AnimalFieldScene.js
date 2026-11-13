/**
 * AnimalFieldScene - reference for SimAnimal in a scene: a field with three
 * kinds on one ground line. Walk sends the dog across; its phase comes from the
 * distance (animalPhase), so planted paws never slide.
 *
 * Beats (1): press Walk.
 */
import { SimScene } from 'simulations/base/kit/SimScene.js';
import { drawBackdrop, drawFloor, pill, mix } from 'simulations/base/kit/SimLook.js';
import { drawAnimal, animalPhase } from 'simulations/base/kit/SimAnimal.js';
import { drawIcon } from 'simulations/base/kit/SimIcons.js';

const GROUND = 455;
const DOG = { x0: 90, x1: 590, length: 150, speed: 130 };

export class AnimalFieldScene extends SimScene {
  static BEAT_STEP_MAP = [[{ idx: 0, dwellMs: null }]];
  static ARIA_LABEL = 'A field with a cow grazing, a goat standing and a dog that walks across when you press Walk.';
  static CONTROLS = [{ type: 'button', id: 'walk', label: 'Walk' }];

  constructor(container, config) {
    super(container, config);
    this.dist = 0;
    this.run = null;
  }

  enter() { this.dist = 0; this.run = null; }
  isControlDisabled() { return !!this.run; }
  onControlChange(id) {
    if (!this._guard(id)) return;
    if (id === 'walk') { this.dist = 0; this.run = { stage: this.stage }; }
    this.requestUiUpdate?.();
  }
  busy() { return !!this.run; }
  update(d) {
    if (!this.run) return;
    this.dist += DOG.speed * d;
    if (this.dist >= DOG.x1 - DOG.x0) { this.dist = DOG.x1 - DOG.x0; this.run = null; this.requestUiUpdate?.(); }
  }

  draw(ctx, c, t) {
    drawBackdrop(ctx, c, 'dots');
    drawIcon(ctx, c, 'sun', 600, 80, 34, { tone: c.s2 });
    drawFloor(ctx, c, 300, { seams: false, col: mix(c.bgDeep, c.s3, 0.22) });
    drawIcon(ctx, c, 'tree', 90, 262, 52, { tone: c.s3 });
    drawIcon(ctx, c, 'tree', 560, 270, 40, { tone: c.s3 });
    drawAnimal(ctx, c, { x: 230, y: 340, length: 230, facing: 1, kind: 'cow', pose: 'graze' }, { t });
    drawAnimal(ctx, c, { x: 500, y: 350, length: 150, facing: -1, kind: 'goat', pose: 'stand' }, { t });
    const spec = { x: DOG.x0 + this.dist, y: GROUND, length: DOG.length, facing: 1, kind: 'dog', pose: this.run ? 'walk' : 'stand' };
    spec.phase = animalPhase(this.dist, spec);
    const dog = drawAnimal(ctx, c, spec, { t, mood: this.run ? 'happy' : 'smile' });
    pill(ctx, c, 'dog', dog.anchors.head.x, dog.anchors.bounds.y0 - 18, { size: 14, bg: c.raised ?? c.bgSurface });
  }
}
