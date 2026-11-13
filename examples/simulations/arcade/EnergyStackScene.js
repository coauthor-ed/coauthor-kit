import { ArcadeOrderScene } from 'simulations/base/kit/ArcadeOrderScene.js';
import { ORDERS } from './WorkEnergyDeck.js';

// Energy sequences in order, tower skin.
export class EnergyStackScene extends ArcadeOrderScene {
  static ARIA_LABEL = 'Energy tower: the steps of an energy sequence float around; tap them first to last to build the tower before the fuse burns out.';
  static CONFIG = { ...ORDERS, title: 'Energy tower', skin: 'stack', rounds: 4 };
}
