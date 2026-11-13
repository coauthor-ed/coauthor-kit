import { ArcadeCatchScene } from 'simulations/base/kit/ArcadeCatchScene.js';
import { WORK_SIGN } from './WorkEnergyDeck.js';

// Positive, zero or negative work? Spot-it, orchard skin: the Sort deck as is.
export class WorkSignCatchScene extends ArcadeCatchScene {
  static ARIA_LABEL = 'Work spotter: a sign names positive, zero or negative work; move Quill under each falling situation of that kind, and let the others fall.';
  static CONFIG = { ...WORK_SIGN, title: 'Work spotter', skin: 'orchard', rounds: 12, perTarget: 4, fall: 8 };
}
