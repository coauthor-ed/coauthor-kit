import { ArcadeSortScene } from 'simulations/base/kit/ArcadeSortScene.js';
import { ENERGY_FORMS } from './WorkEnergyDeck.js';

// Energy forms, catch-and-sort, falling-into-bins skin.
export class EnergyFormsSortScene extends ArcadeSortScene {
  static ARIA_LABEL = 'Energy catcher: situations fall one at a time; tap the form of energy each one mostly has - kinetic, potential, heat, sound or chemical.';
  static CONFIG = { ...ENERGY_FORMS, title: 'Energy catcher', skin: 'sky', rounds: 12 };
}
