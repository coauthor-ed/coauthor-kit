import { ArcadeRouteScene } from 'simulations/base/kit/ArcadeRouteScene.js';
import { WORK_SIGN } from './WorkEnergyDeck.js';

// Positive, zero or negative work, reached by running the yes/no key. Road skin.
export class WorkSignRouteScene extends ArcadeRouteScene {
  static ARIA_LABEL = 'Key run: each situation runs through yes/no gates - does it move, does the force point along the motion - to positive, zero or negative work.';
  static CONFIG = { ...WORK_SIGN, title: 'Key run: is work done?', skin: 'road', rounds: 7 };
}
