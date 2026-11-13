import { ArcadeMatchScene } from 'simulations/base/kit/ArcadeMatchScene.js';
import { FORMULAS } from './WorkEnergyDeck.js';

// Quantity -> formula or unit, bubbles skin.
export class FormulaBubblesScene extends ArcadeMatchScene {
  static ARIA_LABEL = 'Formula pop: a quantity waits at the bottom; pop the bubble with its formula or unit as the bubbles float past.';
  static CONFIG = { ...FORMULAS, title: 'Formula pop', ask: 'Pop the bubble that matches', skin: 'bubbles', rounds: 8 };
}
