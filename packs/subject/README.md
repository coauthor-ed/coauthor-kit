# Subject packs

Optional domain guidance for one course bundle: `packs/subject/<id>/`. No pack = the kit as it is; it works for any subject without one.

## Selection

- Per bundle, not per repo: `courses/<bundle>/bundle.json` `"subjectPack": "<id>"`. Absent: the slug of `bundle.json` `"subject"` (lower case, non-alphanumerics to `-`) if `packs/subject/<slug>/CARD.md` exists. Else none.
- The stage prompt then carries `Subject pack: packs/subject/<id>/CARD.md (read it).` Read it before your brief's own reading list; it adds to the brief, it never overrides a profile card (look, audience) or a hard rule.
- Stage 1a may draft a missing pack (non-school audience only) with `Status: DRAFT`; the operator reviews it and deletes that line before Stage 1b.

## What a pack may hold

- Notation, units and the exact wording students must use for core terms and formulas.
- Data conventions: how quantities are stated (denominator, period, rounding, intervals).
- Misconceptions worth a predict slide or a distractor.
- Worked example shapes and question shapes, each mapped onto existing kit types and recipes (`docs/question-bank-generation.md` sections 3.4, 8.1).
- Which capabilities to reach for, by pointing at `briefs/stage3/*.md` or `examples/simulations/` (never re-explaining them).
- Field-specific sourcing and ethics (e.g. personal data in records).
- Glossary terms.

## What a pack may not hold

- Code, scenes or helpers. A need the kit cannot meet becomes a generic capability named by what it draws, built in the engine, not here.
- Look rules (colour, shape, motion): `packs/look/`.
- Audience rules (reader, register, prose limits, quotas): `packs/audience/`.
- Restated kit rules, schemas or doc sections. Point at them.
- Another subject's guidance: one subject per pack.

## Files

- `CARD.md` (required): short, numbered, terse, ASCII. Template below.
- `EXAMPLES.md` (optional): which generic showcase scenes and recipes suit this subject, plus course-tested anchors once they exist.

## CARD template

```
# <Subject>: the subject card

Briefs quote this card when the prompt names it. Adds to the kit; a profile card or hard rule wins over it.

1. Notation and units. <symbols, units, how a quantity is written>
2. Core terms. <term: the wording to use; terms that are often confused>
3. Data conventions. <denominators, periods, rounding, intervals>
4. Misconceptions. <wrong idea: the slide or distractor that exposes it>
5. Figures. <figure kinds and the capability for each (briefs/stage3/<guide>.md)>
6. Questions. <shape: kit type or recipe>
7. Sources and ethics. <field-specific citing, personal data>
8. Glossary. <terms for glossary.json>
```
