import { ArcadeJudgeScene } from 'simulations/base/kit/ArcadeJudgeScene.js';
import { MYTHS } from './WorkEnergyDeck.js';

// Myth or fact about work and energy, two-doors skin.
export class MythDoorsScene extends ArcadeJudgeScene {
  static ARIA_LABEL = 'The two doors: one statement about work and energy at a time; open the true door or the false door before the candle burns down.';
  static CONFIG = { ...MYTHS, title: 'The two doors', skin: 'doors', rounds: 10 };
}
