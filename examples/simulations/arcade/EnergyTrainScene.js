import { ArcadeOrderScene } from 'simulations/base/kit/ArcadeOrderScene.js';
import { ORDERS } from './WorkEnergyDeck.js';

// Energy sequences in order, train skin.
export class EnergyTrainScene extends ArcadeOrderScene {
  static ARIA_LABEL = 'Energy express: the steps of an energy sequence float around; tap them in order to couple the train before the fuse burns out.';
  static CONFIG = { ...ORDERS, title: 'Energy express', skin: 'train', rounds: 4 };
}
