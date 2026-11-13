/**
 * BudgetShowcaseScene - AllocBoardScene with money: split a village budget of
 * 10 lakh rupees across three needs, each with its own rule.
 */
import { AllocBoardScene } from 'simulations/base/kit/AllocBoardScene.js';

export class BudgetShowcaseScene extends AllocBoardScene {
  static ARIA_LABEL = 'Split a village budget: drag spending cards into school, health and roads so each need gets what its rule says, then check.';
  static BEAT_STEP_MAP = [[{ idx: 0, dwellMs: null }]];
  static CONFIG = {
    title: 'The village budget',
    goal: '\u20b910 lakh to spend',
    format: 'inr-words',
    items: [
      { id: 't', label: 'Teachers', value: 300000, tone: 1, icon: 'school' },
      { id: 'b', label: 'Books', value: 100000, tone: 1, icon: 'book' },
      { id: 'n', label: 'Nurse', value: 200000, tone: 3, icon: 'hospital' },
      { id: 'm', label: 'Medicines', value: 150000, tone: 3, icon: 'pot' },
      { id: 'r', label: 'New road', value: 250000, tone: 2, icon: 'road' },
    ],
    bins: [
      { id: 'school', label: 'School', rule: { atLeast: 300000 }, tone: 1 },
      { id: 'health', label: 'Health', rule: { atLeast: 300000 }, tone: 3 },
      { id: 'roads', label: 'Roads', rule: { atMost: 250000 }, tone: 2 },
    ],
  };
}
