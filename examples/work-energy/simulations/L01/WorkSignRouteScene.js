import { ArcadeRouteScene } from 'simulations/base/kit/ArcadeRouteScene.js';
import { WORK_SIGN } from './WorkEnergyDeck.js';

// Positive, zero or negative work, reached by running each situation through
// the yes/no key. Road skin. First arcade scene in the chapter, so it is the
// one that built WorkEnergyDeck.js beside it.
export class WorkSignRouteScene extends ArcadeRouteScene {
  static ARIA_LABEL = 'Key run: each situation is routed through yes/no gates - did it move, is any of the force along the motion, same way or against - to positive, zero or negative work.';
  static CONFIG = { ...WORK_SIGN, title: 'Is the work positive?', skin: 'road', rounds: 8 };
}
