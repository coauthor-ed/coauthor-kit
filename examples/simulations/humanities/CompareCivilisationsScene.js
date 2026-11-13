/**
 * CompareCivilisationsScene - SlotBoardScene recipe: a compare matrix to fill
 * in. Card = a civilisation, row = a feature, slot = a chip. Includes an
 * honest "not known" (no clear evidence of Harappan kings). Config only.
 */
import { SlotBoardScene } from 'simulations/base/kit/SlotBoardScene.js';

const pick = (id, answer, options, why) => ({ id, ask: 'Pick', answer, options, why });
const RIVERS = [['indus', 'Indus'], ['nile', 'Nile'], ['tigris', 'Tigris and Euphrates']];
const WRITING = [['seals', 'Short script on seals'], ['hiero', 'Hieroglyphs'], ['cunei', 'Cuneiform']];
const RULERS = [['pharaoh', 'Pharaohs'], ['kings', 'City kings'], ['unknown', 'Not known']];
const civ = (id, name, tone, river, writing, rulers, why = {}) => ({
  id, name, tone,
  rows: [
    { id: 'river', label: 'River', inline: true, slots: [pick('river', river, RIVERS, why.river)] },
    { id: 'writing', label: 'Writing', inline: true, slots: [pick('writing', writing, WRITING, why.writing)] },
    { id: 'rulers', label: 'Rulers', inline: true, slots: [pick('rulers', rulers, RULERS, why.rulers)] },
  ],
});

export class CompareCivilisationsScene extends SlotBoardScene {
  static ARIA_LABEL = "Compare three river civilisations: pick each one's river, writing and rulers.";
  static PORTRAIT_WIDTH = 380;
  static PORTRAIT_HEIGHT = 1400;
  static CONFIG = {
    ariaLabel: 'Compare three river civilisations: pick each one\'s river, writing and rulers',
    titles: ['Three river civilisations'],
    sections: [{ id: 'civs', cards: [
      civ('harappa', 'Harappan', 3, 'indus', 'seals', 'unknown', { rulers: { pharaoh: 'Pharaohs ruled Egypt.', kings: 'No palace, royal tomb or ruler\'s image has been found: we do not know who ruled.' } }),
      civ('egypt', 'Egyptian', 2, 'nile', 'hiero', 'pharaoh'),
      civ('meso', 'Mesopotamian', 1, 'tigris', 'cunei', 'kings'),
    ] }],
    text: { ready: 'Filled every row? Check the table.', solvedHead: 'The table is right!', solved: 'Three rivers, three kinds of writing, and one honest "not known".' },
  };
}
