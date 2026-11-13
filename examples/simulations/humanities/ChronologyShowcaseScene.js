/**
 * ChronologyShowcaseScene - reference for TimelineScene (kit/SimTimeline.js).
 * Beats: 0 the phases, 1 the events and one duration, 2 place mode: drag each
 * event into its phase, then Check. The scene is only CONFIG.
 */
import { TimelineScene } from 'simulations/base/kit/SimTimeline.js';

export class ChronologyShowcaseScene extends TimelineScene {
  static ARIA_LABEL = 'A timeline of the Harappan civilisation from 7000 BCE to 1000 BCE: village farming, then early, mature and late Harappan phases, with key events; in the last step you place each event in its phase.';
  static BEAT_STEP_MAP = [[{ idx: 0, dwellMs: null }], [{ idx: 1, dwellMs: null }], [{ idx: 2, dwellMs: null }]];
  static CONFIG = {
    title: 'The Harappan story',
    from: -7500, to: -1000,
    eras: [
      { from: -7000, to: -3300, label: 'village farming', tone: 3 },
      { from: -3300, to: -2600, label: 'early', tone: 2 },
      { from: -2600, to: -1900, label: 'mature cities', tone: 1 },
      { from: -1900, to: -1300, label: 'late', tone: 5 },
    ],
    events: [
      { id: 'mehrgarh', at: -7000, label: 'Farming at Mehrgarh', sub: 'wheat, barley, cattle', tone: 3 },
      { id: 'towns', at: -3300, label: 'First walled towns', tone: 2, revealAt: 1 },
      { id: 'cities', at: -2600, label: 'Planned cities', sub: 'grid streets, drains', tone: 1 },
      { id: 'bath', at: -2500, label: 'Great Bath', sub: 'Mohenjo-daro', tone: 1, revealAt: 1 },
      { id: 'decline', at: -1900, label: 'Cities empty out', tone: 5, revealAt: 1 },
    ],
    spans: [{ from: -7000, to: -2600, revealAt: 1 }],
    modes: ['read', 'read', 'place'],
    slots: [
      { from: -7000, to: -3300, label: 'village farming' },
      { from: -3300, to: -2600, label: 'early' },
      { from: -2600, to: -1900, label: 'mature' },
      { from: -1900, to: -1300, label: 'late' },
    ],
    tolerance: 60,
  };
}
