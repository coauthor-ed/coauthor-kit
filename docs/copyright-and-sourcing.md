# Copyright & Originality - Content Authoring

Applies to every file you write.

## Text

Chapter source (`.txt`/`.pdf`) is reference material only - what concept to teach, what examples/numbers to use, never text to reproduce. Every `markdown`/`prompt`/`stem`/`explanation` field is your own synthesis, in your own structure. Sentence-by-sentence paraphrasing is not synthesis - restructure around the pedagogical shape (POE, worked example) rather than the textbook's paragraph order.

**Author's own material** (`bundle.json` `"sourceOwned": true`, set by the operator when the source is the course author's own slides or notes): close paraphrase is allowed, and the author's terms, definitions, examples and wording may be kept. Still restructure for the slide shape (POE, beats). Anything inside it the author did not create (a published figure, a dataset, a quoted paper) is third-party: cite it (author, year, title, table or figure, licence) in `FIGURES.md` or the log, and redraw figures as below. Without the flag, treat every source as third-party.

## `comprehension-set@1` passages - still original synthesis, one narrow exception

Not English-only - CBSE SST/Science case-based questions (a Locke/
Montesquieu source note, a geography extract) use the same shared-stimulus
shape. Write your own original passage/source note, same as any other
field in this doc - never lift a real article, textbook paragraph, or other
publication into `passage`, even paraphrased.

**Exception: English literature extracts** may quote the actual prescribed
poem/story verbatim in `passage`/`extract` (a stanza's imagery, a line's
device has no paraphrase that asks the same question) - the one place in
this kit a verbatim quote is expected. Doesn't extend to an SST/Science
source dressed up "extract-like"; that still needs original synthesis.

- Quote only the minimum needed (a 3-4 line stanza / one-paragraph excerpt),
  never a whole poem/story.
- Never self-mark `"human-approved"` (rule 5) - flag length uncertainty via
  an `authoring.flags` entry for human review.
- Everything else (the `items[]` sub-questions, `explanation`) is still your
  own synthesis.

## Diagrams and images

Never extract/redistribute a textbook's own illustrations. Generate a new, original SVG/description, or source an openly-licensed equivalent (e.g. CC-BY Wikimedia Commons) and record its source/license.

This also applies to `FIGURES.md` (`AGENTS.md` rule 8): its entries are your own description of a figure's layout/content, in your own words, for later stages to work from - never a cropped image, a copied caption, or another reproduction of the source page.

Real places and events (geography, disasters): a real, licence-recorded photo (source URL, author, licence in `media/*.source.md` or the log); never a generated "photo" of a real event. Generated illustrations only for concepts.

Maps: India's border only from the Survey of India layer (`simulations-kit/vendor/geo/SOURCES.md`); an image of a map of India must match Survey of India maps too - do not use a third-party map image unless its source says so.

## Verification pipeline this content will still pass through

Every file starts `"authoring.status": "ai-draft"` (`AGENTS.md` rule 5) and goes through the real engine repo's pipeline before reaching a student: schema/reference validation, mechanical sanity checks (formula ranges, answer-key consistency), and an independent model check. Careful content here reduces what that pipeline flags - it doesn't replace it.
