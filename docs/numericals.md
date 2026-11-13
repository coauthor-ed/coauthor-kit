# Numericals, emphasis and affordance

Who reads: Stage 1b (plans the device), Stage 2 (prose and stubs), Stage 3 (builds the panel). Any look; under `plain` or a college audience these are required (plain CARD 13-17). Kit names are `simulations/base/kit/SimPanel.js` unless another module is named (`docs/dom-scene-kit.md`, SimPanel).

## 1. Clarity beats brevity

A first-time learner needs the whole explanation: what the number is, why it is computed this way, what it means. Do not cut an explanation to look concise; split a long one over beats. The sentence and paragraph limits (`docs/voice-and-tone.md`, the audience card) still hold; depth is not padding.

## 2. A worked calculation

- Numbered rows. Each row: a step label ("Odds of smoking among cases"), the formula with its numbers in a large serif line (`Odds of smoking = 33 / 2 = 16.5`), one gloss line under it in plain words ("33 cases smoked for every 2 who did not").
- Order in a row: letters, then numbers, then the value. Every value carries its unit or says "no unit"; a rate names its denominator.
- Multiply or divide: a stacked fraction, never an inline slash for the key formula: `OR = (14 x 51) / (9 x 6)` drawn as numerator over denominator, then `= 714 / 54 = 13.2`.
- Show worked arithmetic: the products and part quotients sit behind one reveal ("Show worked arithmetic"), so the row reads clean and the check is one tap away.
- Learner computes first where the step is the idea: numeric entry with a Check, a stated tolerance, feedback that names the step that went wrong and shows the worked line. Then the value lands large (count-up).
- One calculation per slide. A second calculation is the next slide or a question.

Kit:

| Pattern | Kit part |
|---|---|
| numbered rows: label left, big serif formula, gloss line; state done / now (tinted, signature edge) / todo (faint plan) / hidden; `fresh` rises in once | `calcStepsHtml([{ label, parts, gloss, state, fresh }], { size })` (or `stepsHtml(rows, { display: true })`) |
| the formula: groups joined by `=`, wraps only at `=` on a phone | `formulaHtml(['Odds of smoking', '33 / 2', { v: '16.5', key: 'o1' }])` |
| stacked fraction for multiply or divide | `{ n: '33 x 27', d: '55 x 2' }` inside `formulaHtml` parts, or `overHtml(n, d)` (write the times sign as `\u00d7`) |
| the value lands large (count-up) | `{ v, key }` part + `countValue(root, key, to, { from: 0, fmt, dur })` |
| one big reading with a stacked fraction and a live formula | `readoutHtml({ label, value, unit, frac: { n, d }, formula })`, `setReadout` (counts up) |
| show worked arithmetic | `revealHtml({ key, html, open })` (caret chip; `bindPanel` `toggle(key, open)` keeps it open across a re-render) |
| numeric entry with a check | `entryHtml({ fields, action, cta, state, feedback })` |
| compact rows (a side note, not the slide's calculation) | `stepsHtml([{ label, formulaHtml, gloss, state }])` |
| no scene on the slide | markdown: a numbered list, one step per item, the formula in `$...$` with `\frac{}{}`; the value in bold (engine markdown + math) |

## 3. Emphasis

- The slide's key sentence is never buried in a paragraph. Pick one device:
  - pull quote: a `>` line, the sentence alone;
  - takeaway: in prose a bold sentence alone in its paragraph; in a scene `takeawayHtml(lead, rest)` (bold lead between two rules);
  - in a scene: `pullQuoteHtml(html, { label, cite })` (serif, signature rule at the left); `emHtml(text)` marks the one phrase inside it (bold on a highlighter band); a correction is `editHtml(del, ins)` (original struck, replacement in the signature colour), then the whole corrected sentence as the pull quote;
  - table: the key numbers as a markdown table (or `ruleTableHtml` when cells are picked or filled);
  - worked steps: section 2.
- One device per beat, one pull quote per slide. Bold marks a term at its definition and the one takeaway; never scattered bold.
- A Text only slide (no scene, `docs/pedagogy.md` "Earn every scene") names its device in the outline: `**neither** (Text only: pull quote; <reason>)`.

## 4. Affordance

The prose says what to do; the object shows that it can be done.

- Anything the learner acts on looks actionable: a button-like control (rim or fill, focus ring, hover), never plain text that happens to be clickable. A tappable word in a sentence is a chip, not a bare word.
- A visible state: picked vs not picked is obvious (tint, rule, `aria-pressed`); a disabled control looks disabled.
- A prompt says the move before the first action ("Tap a column head to read its rate"), in the slide prose or a kicker in the scene, and the scene waits.
- After the move, the result is next to the control that made it.
- Stubs: the `Dials:` line names the control and its look ("column heads are buttons with a pressed state"), not only the gesture.

Kit:
- `promptHtml(text, { done })` - the line that says the move, above the control ("Select the Cases column"); `done` mutes it with a tick.
- `chipsHtml([{ label, action, value, pressed }])` - the shared actionable chip (`.spn-act`): rim, paper fill, a small select ring, hover tint, focus ring; picked = signature tint + rim, ring filled, `aria-pressed`.
- `ruleTableHtml({ pick: 'col' | 'row', sel })` - heads are buttons; under plain they are the same chips; the picked line tints with a signature edge.
- `sentenceHtml({ words: [{ w, fix }], picked, showFix })` - a sentence of word chips; the picked word with a `fix` is struck and the fix follows it.
- `buttonsHtml`, `sliderHtml` (live value large), `entryHtml`, `flowChoiceHtml` (SimFlowDom).

## 5. Checks

- `outline-lint`: a scene slide without `Shows:` / `Without it:` (ERROR under plain or college); a scene line with no action and no changing quantity (WARN).
- `lesson-check`: a plain or college stub with only tap-to-open and `Run shows: none` (WARN, decoration).
- `prose-lint`: game words in learner-visible text under plain or college (`docs/mini-games.md` "Exercise, not game").
