import { ArcadeMatchScene } from 'simulations/base/kit/ArcadeMatchScene.js';
import { FORMULAS } from './WorkEnergyDeck.js';

// Quantity -> formula or unit, fair-ground range skin.
export class FormulaRangeScene extends ArcadeMatchScene {
  static ARIA_LABEL = 'Formula range: a quantity waits at the counter; hit the target showing its formula or unit before it drops.';
  static CONFIG = { ...FORMULAS, title: 'Formula range', ask: 'Hit the target that matches', skin: 'range', rounds: 8 };
}
