/**
 * ConsequenceShowcaseScene - reference for FlowScene (kit/FlowBoard.js).
 * Beats: 0 the chain appears card by card, 1 predict the last card, 2 put the
 * shuffled cards back in order, then Check. The scene is only CONFIG.
 */
import { FlowScene } from 'simulations/base/kit/FlowBoard.js';

export class ConsequenceShowcaseScene extends FlowScene {
  static ARIA_LABEL = 'A cause and effect chain: the monsoon fails, crops fail, grain prices rise, families move to the towns. Predict the last step, then put the shuffled steps back in order.';
  static BEAT_STEP_MAP = [[{ idx: 0, dwellMs: null }], [{ idx: 1, dwellMs: null }], [{ idx: 2, dwellMs: null }]];
  static CONFIG = {
    title: 'When the monsoon fails',
    layout: 'chain',
    nodes: [
      { id: 'rain', label: 'Monsoon fails', sub: 'little rain', icon: 'rain', tone: 1 },
      { id: 'crops', label: 'Crops dry up', icon: 'field', tone: 3 },
      { id: 'price', label: 'Grain prices rise', icon: 'coin', tone: 2, revealAt: 0 },
      { id: 'move', label: 'Families move', sub: 'to find work', icon: 'route', tone: 4, revealAt: 2 },
    ],
    edges: [{ from: 'rain', to: 'crops', label: 'so' }, { from: 'crops', to: 'price', label: 'so' }, { from: 'price', to: 'move', label: 'so' }],
    modes: ['read', 'predict', 'order'],
    decoys: ['Prices fall', 'More rain'],
  };
}
