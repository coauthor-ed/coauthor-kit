/**
 * MajorityShowcaseScene - reference for AllocBoardScene: drag parties into
 * the coalition until it passes 272 of 543 seats, then Check. Party names are
 * invented and neutral (never a real party, symbol or colour pairing).
 */
import { AllocBoardScene } from 'simulations/base/kit/AllocBoardScene.js';

export class MajorityShowcaseScene extends AllocBoardScene {
  static ARIA_LABEL = 'Form a government: drag parties with their seat counts into the coalition until it has at least 272 of the 543 seats, then check.';
  static BEAT_STEP_MAP = [[{ idx: 0, dwellMs: null }]];
  static CONFIG = {
    title: 'Form a government',
    goal: '272 of 543 seats',
    unit: 'seats',
    total: 543,
    show: 'hemicycle',
    items: [
      { id: 'a', label: 'Party A', value: 168, tone: 1, icon: 'crowd' },
      { id: 'b', label: 'Party B', value: 71, tone: 3, icon: 'crowd' },
      { id: 'c', label: 'Party C', value: 44, tone: 2, icon: 'crowd' },
      { id: 'd', label: 'Party D', value: 23, tone: 4, icon: 'crowd' },
      { id: 'e', label: 'Party E', value: 12, tone: 5, icon: 'crowd' },
    ],
    bins: [{ id: 'coalition', label: 'Coalition', rule: { atLeast: 272 }, tone: 1 }],
  };
}
