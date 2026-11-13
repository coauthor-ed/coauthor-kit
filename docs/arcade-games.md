# Arcade games: fast practice of what a lesson taught

An arcade game is an optional slide where the learner drills what was just taught - recalling terms, sorting things into groups, running a key, putting steps in order, busting myths - against a gentle clock. It is a break from reading that builds memory and clears misconceptions. It is not the lesson's `mini-game@1` (docs/mini-games.md): that one embodies the concept (tie level L2, no timers). An arcade game practises; it may use a clock; it is never graded.

You write data, not a game. The engine is shared (`simulations/base/kit/Arcade*.js`, on the look kit): menu, scoring, hearts, pace, why cards, the boss round, the end card, every visual. A course scene is a few lines: pick an archetype, a skin and a deck.

Quill is in every game (under a look with a mascot): on the menu, on the field, beside the why card and on the end card. The games are an arcade cabinet: under the Quill look every game plays in Quill's own polar world (the Catch game's night sky, a dusk in the light theme, with the aurora, a moon, bergs, the sea and an ice shelf the set stands on), whatever the course's setting (lab, graph paper); the chrome follows the landing page (kicker, gradient title, coral PLAY), and in a lesson the block frames the canvas in the landing page's cabinet. A 3-2-1-GO countdown opens a run while Quill walks in; he jumps and spins on every 5th in a row, throws up his wings after a wrong try, is knocked flat on a slip (a heart breaking over him), wears a crown in the boss round and leans into the wind when the pace steps up; signs pop over the field (COMBO, SPEED UP, BONUS, BOSS ROUND), the score rolls up, and the end card gives a verdict with stars and a NEW BEST ribbon. None of it is yours to draw or configure; Quill's Catch keeps its own ice or orchard world. The Route games are seen from behind the runner, down the track to the horizon: a gate appears small and grows as it comes, and the question hangs on a board across the top from the moment it appears. In the polar world the Sort sky bins are igloos with a friend at each door, the Judge doors are igloos too, and the Match range targets are snowmen on ice pedestals; a scene with its own world keeps its old set.

```js
import { ArcadeSortScene } from 'simulations/base/kit/ArcadeSortScene.js';
import { ENERGY_FORMS } from './WorkEnergyDeck.js';

export class EnergyFormsSortScene extends ArcadeSortScene {
  static ARIA_LABEL = 'Energy catcher: situations fall one at a time; tap the form of energy each one mostly has.';
  static CONFIG = { ...ENERGY_FORMS, title: 'Energy catcher', skin: 'sky', rounds: 12 };
}
```

Worked examples on work and energy: `examples/simulations/arcade/` (one scene per archetype and skin, one shared deck file). Screenshots: `examples/media/arcade/GOOD-*.png`.

## Why it works (what the engine does for you)

- The tap IS the learning operation (sort, route, match, order, judge) - nothing to learn outside it.
- One target at a time; the next one waits in the corner.
- A wrong try pauses on a why card - "not X; it is Y, because Z" - and the SAME item stays in play until the learner gets it right. It comes back 3-5 items later (at most twice).
- The clock punishes letting something slip, never a wrong try: a wrong try costs the streak, a slip costs a heart.
- Pace starts slow, rises with a streak, eases after a slip; reduced motion caps it.
- Groups take turns (interleaved), bins swap places, doors swap sides: position is never the cue.
- The boss round (last 4 items, worth double, crowned) is the learner's own mix-ups plus items marked `myth: true`. A streak of 8 starts a short double-score bonus.
- The end card lists the learner's own mix-ups with the right answers.

## Does it fit? Check before you add one

An arcade game drills recall of things already taught. Add one only if ALL hold:

1. **Recall load.** Terms, symbols, groups of real things, sequences or myths that must be memorised. Not a skill being applied for the first time (reading a Venn region, solving a step): use the lesson's mini-game or a practice slide.
2. **Taught earlier.** Everything in the deck is taught at least one slide before, and for a new skill in an earlier lesson or after the mini-game. Never a replay of the slides just above it.
3. **Same picture.** Every word the game shows ("left ring", "region", "gate") is a word and a picture the learner already saw in the lesson. If the game needs a diagram the lesson drew, it must show that diagram; if it cannot, pick another archetype or no game.
4. **Mechanic = idea.** The tap must be the same act the concept asks for.
   - Sort: the groups are things you can put items in (bins, labelled sets).
   - Route: the concept IS a chain of yes/no questions (a key, a flowchart, a decision). Not for placing something in a region of a picture.
   - Match: pairs of recalled facts. Order: a real sequence. Judge: claims to call true or false.
   - Catch: one group held in mind, a stream of items to keep or let pass (examples vs non-examples, equivalent forms).
5. **Items do not state the answer.** A subtitle that lists the item's properties turns the game into reading. Show the item and let the learner decide, or use a bigger deck (20+ items, mixed) so memorising answers is not the game.
6. **Not a quiz.** If the deck is 12 items on one rule, it is memorised in one pass: add a mini-game or leave it out.
7. **Text fits the card.** Judge statements are at most 32 characters on one line; Sort and Catch item names at most 14 (16 is the hard limit); evidence goes in `why`. A claim that needs a condition or a number to be true does not fit Judge or Sort: pair a short topic with its rule in `ArcadeMatchScene` if it is recall, otherwise use a true/false question that shows the whole claim and leave the arcade out.

If any fails, leave the arcade out and say so in the outline. No arcade is better than a mismatched one.

## Pick the archetype by what the learner must do

| The learner must | Archetype | Skins | Deck shape |
|---|---|---|---|
| put each thing in one of 2-6 groups | `ArcadeSortScene` | `sky` (falls into bins), `belt` (conveyor into crates) | `groups`, `items` |
| answer a chain of yes/no questions to reach a group (a key, a flowchart) | `ArcadeRouteScene` | `road` (runner, door gates), `rail` (train, signals) | `groups`, `key`, `items` |
| recall what goes with what (term and meaning, symbol and unit, name and picture) | `ArcadeMatchScene` | `bubbles` (drift past), `range` (targets pop up) | `pairs` |
| put steps, events or sizes in order | `ArcadeOrderScene` | `stack` (a tower), `train` (carriages) | `sequences` |
| call statements true or false (myths) | `ArcadeJudgeScene` | `cards` (swipe), `doors` (open one) | `statements` |
| spot members of one target group as items fall (the target changes) | `ArcadeCatchScene` | `ice` (Quill catches fish), `orchard` (Quill catches mangoes in a basket) | `groups`, `items` (same as Sort), `targets?` |

## Deck shapes

Every item's `why` is the one line the why card shows after a mix-up: evidence, not a restated answer ("it is high up: its position stores energy", not "it is potential energy"). `myth: true` marks what students commonly get wrong.

```js
// Sort
{ groups: [{ id: 'kinetic', label: 'Kinetic', tone: 1, why: 'energy of motion' }],
  items: [{ name: 'A rolling ball', is: 'kinetic', why: 'it is moving', myth?: true, art?: 'media/L02/ball.jpg' }] }
// Route: every group is a leaf of the key; each item's path is found from its group
{ groups: [...], items: [...],
  key: { ask: 'Does the object move?', no: 'zero', yes: { ask: 'Same way as the force?', yes: 'positive', no: 'negative' } } }
// Match: distractors come from other pairs, same `group` first
{ pairs: [{ prompt: 'Power', answer: 'work / time', group: 'formula', why: 'how fast work is done' }] }
// Order: 3-6 pieces (the train fits 5)
{ sequences: [{ title: 'Energy units: smallest to largest', items: ['1 joule', '1 kilojoule', '1 megajoule'], why: '...' }] }
// Catch: the Sort deck as is. Each target needs 3+ members and 3+ non-members; an item in every target is refused.
// An item with is: [] is a trap that looks like a member (0.3 for 1/3).
{ groups: [...], items: [...], targets?: ['half', 'quarter'], perTarget?: 6, share?: 0.5 }
// Judge: keep a quarter to three quarters true, so "always false" never wins
{ statements: [{ text: 'Friction destroys energy.', truth: false, myth: true, why: 'it turns kinetic energy into heat' }] }
```

On a phone (canvas under 2/3 scale) the HUD, menu, why card and end card redraw with text at 13 px on screen, and `ArcadeMatchScene` draws bigger bubbles and targets. Other archetypes keep their in-play sizes; a subclass can read `phoneUi()` and `uiPx(n)`.

Common CONFIG: `title` (required), `skin`, `rounds`, `lives` (3), `relaxed: true` (no hearts), `how` (replace the one-line how-to), `boss: false`, and per archetype the starting speed (`fall`, `gate`, `drift`, `fuse`, `think`, in seconds; Catch: `fall`).

Keyboard (every archetype): Tab focuses the game, Enter or Space starts and replays, Escape pauses. Catch steers with Left/Right or A/D; Judge calls with Right/T and Left/F. `art` on an item: a bundle image path (`media/...`, shown in a circle), a course drawing as `{ svg: '<svg ...>' }` (fitted whole in the circle; `var(--sim-*)` colours follow the theme), a short glyph, `false` (no picture), or nothing (a friendly face). Microbes, plants and other things that must not get a face take `{ svg }` or `false`. Never art or colour that gives the answer away (a "KE" badge on a kinetic item). A bad CONFIG throws a plain message at setup, which `check-scene` shows.

## Placing one in a lesson

- Its own slide: `content-block@1` with one short line of prose (the game explains itself) and the scene below it:
  ```json
  { "id": "blk-l03-a01", "type": "content-block@1", "markdownRef": "blocks/L03/blk-l03-a01.md",
    "simulation": { "src": "simulations/L03/EnergyFormsSortScene.js", "position": "below" },
    "authoring": { "status": "ai-draft" } }
  ```
- Only after everything in its deck has been taught (a deck can grow lesson by lesson: a later game reuses the deck with more items).
- Optional, and as many as the chapter's recall load deserves; spread them out rather than bunching them at the end.
- Variety: rotate archetypes across a chapter, and when one archetype comes back, use its other skin. Never two arcade slides in a row with the same archetype and skin.
- Put decks in one file per chapter (`simulations/<first lesson>/<Chapter>Deck.js`, or `simulations/shared/`) and import it; each game is a thin scene file next to its slide. A later game adds a new export to the deck (never edits an existing item). Staged generation: the deck is the stubs' `Shared helper:`, written by the first arcade scene, and `check-scene` plus `tools/sim-test/arcade-bot.mjs <scene>` verify a game.

## Checks

`node tools/sim-test/check-scene.mjs <scene>` (the deck is validated at setup; lint, sanity, come-to-rest, the real-browser text report). Look at it: `node tools/sim-test/shoot.mjs <scene> --steps='[{"tap":[150,424],"wait":3500,"name":"play"}]'` taps PLAY and shows the game running after the 3-2-1-GO countdown (Catch: PLAY is at `[196,336]`, lower when a long title pushes it down: see the sheet); add taps on bins, doors or targets to see the why card.
