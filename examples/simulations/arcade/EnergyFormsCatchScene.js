import { ArcadeCatchScene } from 'simulations/base/kit/ArcadeCatchScene.js';
import { ENERGY_FORMS } from './WorkEnergyDeck.js';

// Energy forms, spot-it, ice skin: the Sort deck as is. Only the groups with
// 3+ items are targets (heat and sound have 2 each, so they stay non-examples).
export class EnergyFormsCatchScene extends ArcadeCatchScene {
  static ARIA_LABEL = 'Energy spotter: a sign names one form of energy; steer Quill under each falling situation that mostly has it, and let the others fall.';
  static CONFIG = { ...ENERGY_FORMS, title: 'Energy spotter', skin: 'ice', targets: ['kinetic', 'potential', 'chemical'], rounds: 12, perTarget: 4 };
}
