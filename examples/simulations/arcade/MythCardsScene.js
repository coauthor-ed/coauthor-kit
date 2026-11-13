import { ArcadeJudgeScene } from 'simulations/base/kit/ArcadeJudgeScene.js';
import { MYTHS } from './WorkEnergyDeck.js';

// Myth or fact about work and energy, swipe-card skin.
export class MythCardsScene extends ArcadeJudgeScene {
  static ARIA_LABEL = 'Myth or fact: one statement about work and energy at a time; swipe right for true, left for false.';
  static CONFIG = { ...MYTHS, title: 'Myth or fact?', skin: 'cards', rounds: 10 };
}
