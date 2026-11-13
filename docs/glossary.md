# Glossary: tap-to-gloss and name practice

Hard words (Latin and Greek names, technical terms) put students off a chapter. The kit has four tools for them: a glossary that makes words tappable, a decode scene, a recall scene, and a lint.

## glossary.json

One file at the bundle root. The app finds it by name; the manifest generators also list it as `glossary`. No file means no marking.

```json
{ "terms": [ {
  "id": "platyhelminthes",
  "term": "Platyhelminthes",
  "match": ["platyhelminth"],
  "plain": { "en": "flatworms" },
  "roots": [ { "part": "platy", "means": { "en": "flat" } }, { "part": "helminth", "means": { "en": "worm" } } ],
  "means": { "en": "Flat-bodied worms with organs. Many have a gut with one opening." },
  "face": { "art": "flatworm", "tone": 8 },
  "lesson": 6, "group": "phylum"
} ] }
```

- `id`, `term`, `means` required. Everything else is optional.
- `match`: extra surface forms (plural, adjective). `cs: true` matches the exact case only (use for "Aves" so "leaves" is never hit).
- `plain`: the everyday name. `roots`: word pieces in the order they occur in `term`, each `part` a substring of it.
- `means`: one or two short sentences, grade level. State the evidence, not a dictionary line.
- `face`: `art` is a kit character (`ART_KEYS` in `KeyCharacters.js`), `tone` is `--sim-series-N` (1-8). One face and one colour per group, the same in every scene and card. Colours run out at 8: repeat only where unavoidable.
- `group`: `kingdom domain phylum class order family genus subphylum` count as names for pacing. Anything else (`concept`, `organism`, `rank`) does not.
- Do not gloss everyday words. Skip ambiguous ones ("class", "order", "family"); gloss the named groups instead.

## What the learner sees

In lesson beats (content-block, poe-explain, poe-predict), the first occurrence of each term in a beat gets a dotted underline. Tap it for a card: face, plain name, word pieces, meaning. Headings, links and code are never marked; a hyphen before a word blocks a match ("non-chordate" is its own term). Questions and tests are never marked.

## Practice scenes: NameDecoderScene

`simulations/base/kit/NameDecoderScene.js`. A scene subclass only sets `CONFIG` and `ARIA_LABEL`; all data comes from glossary.json through `config.glossaryTerm(id)`, so the scene never repeats a root or a face.

```js
import { NameDecoderScene } from 'simulations/base/kit/NameDecoderScene.js';
const CONFIG = { ariaLabel: '...', mode: 'decode', noun: 'animal', terms: ['annelida', 'arthropoda'], pool: ['nematoda'] };
export class BodyPlanNamesDecodeScene extends NameDecoderScene { static CONFIG = CONFIG; static ARIA_LABEL = CONFIG.ariaLabel; }
```

- `mode: 'decode'`: shows the word pieces and their meanings, learner picks the body they expect, the name assembles. Every term needs `roots` and a `face`.
- `mode: 'recall'`: face to name and name to face; **Show the pieces** is the cue; a miss returns once. `plainCue: false` hides the everyday name under a face until asked: use it late in the course (fade).
- `terms` in the order met; `pool` adds decoys. `noun` fills the prompts.
- Author it as a `content-block@1` with `simulation.position: "right"` and one or two beats of prose.

## Where it goes

- Decode BEFORE the first use of a name. If the names arrive one per slide, decode right after the last of them, before the challenge.
- Never insert a slide between a `poe-predict` with `deferVerdict` and its verdict slide.
- Recall in later lessons, spaced from the teaching: kingdoms and plant groups in the lesson after the animal phyla start, phyla and classes near the end. Fade `plainCue` as the course goes on.
- No decode for a name whose pieces do not point at a body (Fungi, Eukarya).

## Prose rules

- Pair the first use of a name with its plain name: "flatworms (Platyhelminthes)". Later uses may drop the plain name.
- At most 3 new names in one beat.
- Say once, in the first heavy lesson, that the names are short descriptions and nobody is born knowing them.
- Do not bold-define a term the glossary already covers twice.

## Lint

`node tools/glossary-lint.mjs courses/<bundle>` checks the schema, every scene's ids, unused terms, unpaired first uses and pacing, and lists bolded or Latin-looking words that have no entry. Run it after every prose or glossary edit.
