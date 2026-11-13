import { ArcadeSortScene } from 'simulations/base/kit/ArcadeSortScene.js';
import { WORK_SIGN } from './WorkEnergyDeck.js';

// Positive, zero or negative work? Catch-and-sort, conveyor-belt skin.
export class WorkSignBeltScene extends ArcadeSortScene {
  static ARIA_LABEL = 'Work or not? Situations ride a conveyor belt; tap the crate for positive, zero or negative work before the belt drops them.';
  static CONFIG = { ...WORK_SIGN, title: 'Work or not? Belt', skin: 'belt', rounds: 10, fall: 9 };
}
