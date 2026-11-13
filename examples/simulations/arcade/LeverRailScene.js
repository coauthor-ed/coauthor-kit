import { ArcadeRouteScene } from 'simulations/base/kit/ArcadeRouteScene.js';
import { LEVERS } from './WorkEnergyDeck.js';

// Which class of lever? The key as a railway: each signal asks one question. Rail skin.
export class LeverRailScene extends ArcadeRouteScene {
  static ARIA_LABEL = 'Lever line: each tool rides a railway of yes/no signals about where the fulcrum, load and effort sit, to its class of lever.';
  static CONFIG = { ...LEVERS, title: 'Lever line', skin: 'rail', rounds: 7 };
}
