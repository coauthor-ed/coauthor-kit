/**
 * ProcessFlowScene - plain-look anchor: a study or process flow with counts (kit/FlowBoard.js, tree
 * layout, read and predict modes). Illustrative survey: 500 invited, 340 replied, 160 did not; of the
 * replies 30 were incomplete. Teaches that a flow's counts must reconcile: each split adds back up to
 * the box above it, so a missing count follows from the others.
 *   Beat 0: the first split (invited -> replied | no reply). 340 + 160 = 500.
 *   Beat 1: the incomplete replies appear; the complete count is hidden. The learner picks it from
 *           counts that would not add up (FlowBoard predict mode, decoys).
 *   Beat 2: the whole flow, read. The main path is series 1, drop-outs grey (series 8), the count that
 *           goes on to analysis series 2. Labels carry the count first, then what it counts.
 * Data only (static CONFIG): FlowScene draws, lays out, and checks the pick.
 */
import { FlowScene } from 'simulations/base/kit/FlowBoard.js';

export class ProcessFlowScene extends FlowScene {
  static BEAT_STEP_MAP = [[{ idx: 0, dwellMs: null }], [{ idx: 1, dwellMs: null }], [{ idx: 2, dwellMs: null }]];
  static ARIA_LABEL = 'A survey flow with illustrative counts: 500 invited; 340 replied and 160 did not; of the replies, 30 were incomplete, which leaves 310 complete replies for analysis. Each split adds back up to the box above it.';
  static CONTROLS = [];
  static CONFIG = {
    title: 'Survey flow (illustrative counts): each split adds up',
    layout: 'tree',
    modes: ['read', 'predict', 'read'],
    nodes: [
      { id: 'inv', label: '500 invited', sub: 'survey sent', tone: 1 },
      { id: 'rep', label: '340 replied', sub: 'answered', tone: 1, parent: 'inv' },
      { id: 'none', label: '160 no reply', sub: 'left out', tone: 8, parent: 'inv' },
      { id: 'part', label: '30 incomplete', sub: 'left out', tone: 8, parent: 'rep', revealAt: 1 },
      { id: 'done', label: '310 complete', sub: 'to analysis', tone: 2, parent: 'rep', revealAt: 2 },
    ],
    decoys: ['340 complete', '280 complete'],
  };
}
