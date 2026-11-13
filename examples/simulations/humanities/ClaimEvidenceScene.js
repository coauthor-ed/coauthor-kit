/**
 * ClaimEvidenceScene - SlotBoardScene recipe: a claim-evidence board. Card =
 * a claim with its source (facts); the slot says whether the source supports
 * it, contradicts it, or cannot say. Config only.
 */
import { SlotBoardScene } from 'simulations/base/kit/SlotBoardScene.js';

const VERDICT = [['supports', 'Supports it'], ['contradicts', 'Contradicts it'], ['cannot', 'Cannot say']];
const card = (id, name, tone, claim, facts, answer, why) => ({
  id, name, tone, claim, facts,
  rows: [{ id: 'v', label: 'This source...', slots: [{ id: 'v', ask: 'Verdict', answer, options: VERDICT, cite: [0], why }] }],
});

export class ClaimEvidenceScene extends SlotBoardScene {
  static ARIA_LABEL = 'Three claims about the Harappans, each with one source: does the source support the claim, contradict it, or say nothing?';
  static PORTRAIT_WIDTH = 380;
  static PORTRAIT_HEIGHT = 1300;
  static CONFIG = {
    ariaLabel: 'Three claims about the Harappans, each with one source: does the source support the claim, contradict it, or say nothing?',
    titles: ['What can this source say?'],
    sections: [{ id: 'claims', cards: [
      card('trade', 'Trade', 2, 'Harappans traded with Mesopotamia.', ['Harappan seals found in Mesopotamian cities'], 'supports',
        { contradicts: 'Harappan seals far away point to contact, not against it.', cannot: 'The seals travelled somehow: the source does speak to contact.' }),
      card('kings', 'Rulers', 5, 'Harappan kings lived in great palaces.', ['No palace or royal tomb found in any Harappan city'], 'cannot',
        { supports: 'No palace was found: that cannot support a palace.', contradicts: 'Not finding something is not proof it never existed. The source cannot settle it.' }),
      card('drains', 'Drains', 1, 'Harappan streets had no drains.', ['Covered brick drains run along streets at Mohenjo-daro'], 'contradicts',
        { supports: 'The drains are there in the record.', cannot: 'The source shows drains: it speaks directly against the claim.' }),
    ] }],
    text: { ready: 'Chosen a verdict for each claim? Check.', solvedHead: 'Good historian!', solved: 'You only claimed what each source can show.' },
  };
}
