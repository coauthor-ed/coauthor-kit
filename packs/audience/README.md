# Audience packs

One folder per audience: `packs/audience/<id>/CARD.md`. A card overrides the reader-specific parts of the kit docs: the Reader section and prose limits of `docs/voice-and-tone.md`, the quotas in `docs/pedagogy.md` (game quotas belong to the look card), and the board-specific question docs (`docs/descriptive-questions-and-cbse-marks.md`, grade wording in `docs/question-bank-generation.md`). Everything a card does not name still holds.

Default audience: `school`, CBSE classes 9-12. It is the existing docs, unchanged, and has no pack file.

Packs: `college` (university students and working professionals).

## Selection

Repo-root `profile.json`:

```json
{ "look": "plain", "audience": "college" }
```

- Both keys optional. Defaults: look `quill`, audience `school`. No other key is allowed.
- Per course: `courses/<id>/bundle.json` `"look"` and `"audience"` override the repo values for that course (`start.mjs` writes them when they differ). `next.mjs` then names the course's cards in the printed prompt, and the lints use the course's values.
- `tools/staged-generation/build-bundles.mjs` puts the chosen look's CARD in place of Quill's, and the audience CARD into the outline (1b), lesson (2), module (4), bank questions (B2) and every Stage 3 bundle (next to the look card). Rebuild bundles after changing `profile.json`.
- `tools/prose-lint.mjs` and `tools/staged-generation/outline-lint.mjs` read the same file for their limits (reader: `tools/staged-generation/lib/profile.mjs`).
- A named pack must exist (`packs/look/<id>/CARD.md`, `packs/audience/<id>/CARD.md`), or the tools stop with an error.

The module JSON also carries the look (`"look"`, Stage 4); keep it the same as the course's.

## Writing a card

Short, numbered, each item stated as "where this card and X disagree, this card wins". Name the doc and section it overrides. Never restate a rule that does not change.
