# Mini-games

A mini-game is an existing scene plus a goal. Do not build a games engine.

Two kinds of game, do not mix them up. The `mini-game@1` here embodies the concept (tie rule below, one per lesson, no timers, retries free). An **arcade game** (`docs/arcade-games.md`) drills what a lesson already taught - terms, groups, keys, sequences, myths - against a gentle clock; it is optional, any number per chapter, sits on a plain `content-block@1` slide, and is never graded. The tie rule and "no timers" apply to `mini-game@1` only.

## The tie rule

Classify a design before building it. The concept must be IN the mechanic, not
printed on it.

| Tie | Definition | Verdict |
| --- | --- | --- |
| L0 Decoration | concept is a label on a game object | reject |
| L1 Recognition | must identify or classify instances | warm-up only |
| L2 Embodiment | the win condition IS the concept's rule | target |
| L3 Strategy | must exploit the concept's structure to optimise | best |

L0 example to avoid: catch the fish labelled 1/2, dodge the 1/4. A student wins
by matching glyphs without knowing what a half is.
L2 example: stack 1/8 + 1/4 + 1/2 notes to total exactly one bar. You cannot win
without adding fractions.
L3 example: flex a fixed-side quadrilateral to its largest area. The maximum is
the cyclic case - the student discovers Brahmagupta by playing.

**If a design cannot clear L2, ship it as a question, not a game.**

## Placement

One game per lesson, in the Challenge slot, after the mechanism is taught and
before the closing cliffhanger. Never the first block. Never inside a test.

**No timers.** A countdown converts understanding into reflex, which is the L0
failure again. Retries are unlimited and unpenalised.

## Exercise, not game (plain look, college audience)

Under look `plain` or audience `college` a `mini-game@1` is an exercise. Same block type, same tie rule (the check IS the concept's rule), different framing:

- One instruction with a stated goal: "Find the disease frequencies at which the odds ratio stays within 10 per cent of the risk ratio."
- A live model the learner adjusts (a slider, a table, entries), its readings visible while they move.
- An explicit check (the host's Check button, or `SELF_CHECKING` with a visible tick) and feedback that gives the worked explanation, not only right or wrong.
- No game chrome: no game, play, level, score, badge, XP or challenge wording in learner-visible text, titles, `objective`, ARIA labels or the briefing slide (say exercise, task, practice); no rounds counter, timer, stars, boxed arcade card or "what the game shows" table.
- Fits the slide frame at 1280x800 and 390x844 with no page scroll.
- The briefing slide before it says what to do and what to look for, as prose (a takeaway line), not a rules table about "the game".

`prose-lint` flags the words (WARN; fix or explain in one line). The engine frames it: under a look with gamification off (plain) the block shows a quiet small-caps "Exercise" label over one rule (no badge, no boxed card), verdict "Correct.", and sizes the scene to the slide frame (viewport less about 380 px of chrome; 330 px on a phone). Quill keeps "Challenge".

Build the exercise on SimPanel (`docs/dom-scene-kit.md`): `promptHtml` instruction line, `sliderHtml` with the live table and readings, an explicit Check (`buttonsHtml` primary) with the worked explanation in the feedback; `static SELF_CHECKING = true` and call `this.requestCheck()` on a correct check so the host shows no second button (under an exercise look the host verdict line is then for screen readers only; the scene's own feedback is what shows). Keep the portrait frame short (about 360 x 640 design px) so it fits 390 x 844 with no scroll.

## Authoring

Content block:

```json
{
  "type": "mini-game@1",
  "src": "simulations/L06/FloppyQuadScene.js",
  "objective": { "en": "Flex the shape to its largest possible area." },
  "xp": 15
}
```

`src` resolves bundle-relative, same as `image.src`.

## Scene side

Extend `withChallenge()` and implement one method:

```js
import { withChallenge } from 'simulations/base/ChallengeMode.js';

export class FloppyQuadScene extends withChallenge(CanvasSimulation) {
  static OBJECTIVE = { prompt: { en: 'Flex it to the largest area.' } };
  static SCORING   = { tolerance: 0.02 };

  // Return { value, target } for numeric closeness, { ok: bool } for pass/fail,
  // or null for "nothing to judge yet".
  checkObjective() { return { value: this.area, target: this.maxArea() }; }
}
```

`evaluate()` is provided: it scores, counts attempts and returns
`{ solved, score, best, attempts, feedback }`. Never award XP from a scene or a
plugin - the engine's GamificationService does it, once per game.

## Phone layout: GameFrame

A plain-DOM game uses `simulations/base/kit/GameFrame.js`. At 390 wide `mini-game@1` gives a scene 320 px, so the phone design is 320 wide at scale 1: a 48 px button is 48 CSS px. Landscape is a 1100 x 405 frame; portrait grows with the content and the page scrolls.

```js
import { GameBoard, mountGame, finishGame } from 'simulations/base/kit/GameFrame.js';

export class SpotGame extends GameBoard {
  static OBJECTIVE = { prompt: { en: 'Make the colour spots.' } };
  async setup() {
    await super.setup();
    mountGame(this, { css: CSS, html: '<div class="gm my"><div class="gm-head"><p class="kicker">Challenge</p><h2>...</h2><p class="sub">...</p></div>...</div>' });
  }
  checkObjective() { /* null, { ok: false, hint }, or { ok: true } */ }
}
```

- `mountGame` adds Quill and Check, and refits the frame when the content grows. Set no height by hand.
- `check`: a label; `{ label, in: '.sel' }` to put the button in your own element; `false` for no button. With `false`, call `finishGame(this)` after the last round. Never hide `.gm-check` with CSS.
- `SortBoard` is tap a card, tap a bin, from data: `static KEY, HEAD, CARDS, BINS, LINE, CSS`.
- Classes: `.gm`, `.gm-head`, `.kicker`, `.sub`, `.tap`, `.btn`, `.num`. `onTap(el, fn)` adds Enter and Space. `formula('H2O')` adds the subscripts.
- Colours are tokens; radius, rim and lip come from the look. Under `plain` there is no Quill.
- Gates: `tools/game-targets.mjs` at 390 (targets 44 px, text 13 px) and a real-app check at 1280 and 390. sim-layout mounts a GameBoard at 1100 and 320.

## Rounds, solved, and when the game ends

`withChallenge` has no rounds. The scene owns them. Facts (ChallengeMode.js, plugins/blocks/mini-game):

- The host's "Check my answer" calls `evaluate()`; `evaluate()` calls your `checkObjective()`. `null` = "not ready" (no attempt counted).
- `solved` latches: the FIRST `{ ok: true }` (or a value within `tolerance`) sets `this.solved = true` and the host pays XP once
  (`minigame:solved`). A later `ok: false` does not undo it. So return `ok: true` only when the WHOLE game is won, never per round.
  check-scene WARNs "round latch" when checkObjective reads the round index with no all-rounds-cleared guard: return null until every round is won.
- Per-round verdicts ("round 2 of 5: right") are the scene's own UI. The host sees only the final result.
- A scene that already shows per-answer feedback can call `this.requestCheck?.()` the moment the last round is cleared; the host then runs the
  same pipeline as the button (no extra click).
- Round state lives in the scene: `this._round`, `this._won = []`. Do not use reserved names (`_running`, `_hasStarted`, `_rafId` ...).
- `resetChallenge()` clears `solved` only; also reset your own round state there.

Canonical 40-line canvas game (rounds, final-only verdict):

```js
import { SimScene } from 'simulations/base/kit/SimScene.js';
import { withChallenge } from 'simulations/base/ChallengeMode.js';
import { W, mulberry32 } from 'simulations/base/kit/SimLook.js';

const ROUNDS = 3;
export class ExampleGameScene extends withChallenge(SimScene) {
  static BEAT_STEP_MAP = [[{ idx: 0 }]];
  static ARIA_LABEL = 'Three-round game: pick the right value each round';
  static CONTROLS = [{ id: 'next', type: 'button', label: 'Next round' }];
  static OBJECTIVE = { prompt: { en: 'Clear all three rounds.' } };
  async setup() { await super.setup(); this._reset(); }
  _reset() { this._round = 0; this._won = []; this._answer = this._deal(0); this._picked = null; this._msg = ''; }
  _deal(i) { return Math.round(mulberry32(1000 + i)() * 8) + 1; }       // seeded: same game every mount
  enter() { this._reset(); }
  onControlChange(id) { if (id === 'next' && this._won[this._round] != null) this._nextRound(); }
  pointerDown(p) {                                                        // pick a value
    if (this._won[this._round] != null) return;
    this._picked = Math.max(1, Math.min(9, Math.round((p.x / W) * 9)));
    this._won[this._round] = this._picked === this._answer;
    this._msg = this._won[this._round] ? 'Right' : 'Not this time';
    if (this._round === ROUNDS - 1) this.requestCheck?.();                // last round done: host runs evaluate()
  }
  _nextRound() { this._round++; this._answer = this._deal(this._round); this._picked = null; this._msg = ''; }
  checkObjective() {
    if (this._won.length < ROUNDS) return null;                           // not ready: rounds left
    return { ok: this._won.every(Boolean), hint: 'Some rounds were missed. Try again.' };
  }
  resetChallenge() { super.resetChallenge(); this._reset(); }
  drawFrameInner(ctx, C) { /* draw round counter, the picker, this._msg (text >= 14px, tokens from this.colors) */ }
}
```

Operate it headless with no harness of your own:
`node tools/sim-test/run.mjs exec tools/sim-test/drive.mjs <scene> --bundle <b> --recipe smoke`, then
`--steps='[{"tap":[300,200]},{"probe":"sc.evaluate()"}]'` to read the verdict (`d.sc` is the scene; `drive` calls `start()` and fakes timers).

## Where the mascot goes

| Tier | Quill lives in | Use when | Cost |
| --- | --- | --- | --- |
| T1 (default) | the `mini-game@1` chrome | he reacts to outcomes only | any scene, unchanged |
| T2 | the scene, via `SimMascotDom` | he must stand in the geometry | scene must be a `DomSimulation` |

Prefer T1. It works with a canvas scene as-is; T2 exists for when position
carries meaning.
