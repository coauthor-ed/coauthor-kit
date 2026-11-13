# Stage 3 guide: game (mini-game@1) and field-guide games

For a stub whose role is `game` (block `mini-game@1`), and for `MonsterScene`, `KeyBuilderScene`, `NameDecoderScene`.

## Read
- `docs/mini-games.md` in full. For a field-guide game also `docs/games.md`.

## Start from
- A challenge game is `extends withChallenge(DomSimulation)` (import from `simulations/base/ChallengeMode.js`): declare `static OBJECTIVE` and `SCORING`, implement `checkObjective()`. The host mounts it once with no beats, so there is no `BEAT_STEP_MAP` to match.
- Built for phones: a plain-DOM game `extends GameBoard` or `SortBoard` from `simulations/base/kit/GameFrame.js` (`docs/mini-games.md`, "Phone layout"), not `withChallenge(DomSimulation)` by hand: a fixed board scaled by CSS is too small at 390.
- On a board: `examples/simulations/humanities/MajorityShowcaseScene.js` (AllocBoard as a game); sorting: `examples/simulations/science/ChargeSorterShowcaseScene.js`.
- Field-guide games: configure, do not rebuild: `MonsterScene` (break a misconception by picking evidence), `KeyBuilderScene` (grow a key), `NameDecoderScene` (decode a hard word). Each is `static CONFIG`; its header comment is the manual: `sed -n '1,/^ \*\//p' simulations-kit/src/simulations/base/kit/<Module>.js`.

## Rules
- Plain look or college audience: an exercise, not a game (`docs/mini-games.md` "Exercise, not game"): no game, play, level, score, badge or challenge in any string (OBJECTIVE, labels, ARIA_LABEL, feedback); a live model, a check, worked feedback; fits 1280x800 and 390x844 with no page scroll. `prose-lint` flags the words.
- `withChallenge` has no rounds: the scene owns the deal and the advance; `checkObjective()` returns null until the last round, then `{ ok }` or `{ value, target }`. `solved` latches on the first success (`docs/mini-games.md`, "Rounds": `node tools/doc-section.mjs docs/mini-games.md "Rounds"`).
- The win condition IS the concept's rule (tie to the lesson's level), not a count of clicks.
- Quill already reacts in the plugin; use `SimMascotDom` only when he must stand inside the scene.

## Commands for this kind of scene
- Operate: `node tools/sim-test/drive-dom.mjs L0N/<Scene> --bundle <Bundle> --inputs`, then `--steps=@file.json`.

## API (from kit-api, copied in)
```text
# simulations/base/ChallengeMode.js
  SCORING_DEFAULTS = { mode: 'accuracy', tolerance: 0.02, maxAttempts: Infinity }
  withChallenge(Base)
  isChallengeScene(Cls)  - True when a scene class opted into challenge mode.

# simulations/base/kit/GameScene.js
  esc(s)  - Shared base of the kit's mini-games (MonsterScene lives here). A game is a thin subclass: static CONFIG = { ...
  GAME_CSS
  class GameScene extends DomSimulation
    .static WIDTH = 620
    .static HEIGHT = 520
    .static PORTRAIT_WIDTH = 380
    .static PORTRAIT_HEIGHT = 900
    .static CONTROLS = []
    .static MIN_SCALE = 1.05
    .static FILL_HEIGHT = true
    .static CONFIG = null
    .static CSS = ''
    .static NEEDS_FIELD_GUIDE = false
    .setup()
    .init()
    .view()
    .act()
    .paint()
    .head(title, right = '')
    .av(o, size)
    .btn(label, act, data = {}, cls = 'ek-btn', extra = '')
    .hearts(n, max)
    .bar(v, max, tone)
    .tag(text, yes)
    .award(id, medal)
    .pack(n = 1)
    .destroy()

# simulations/base/kit/MonsterScene.js
  monsterSvg(tone, mood = 'idle', size = 96)
  MONSTER_CSS
  class MonsterScene extends GameScene
    .static CSS = MONSTER_CSS
    .static NEEDS_FIELD_GUIDE = false
    .init()
    .act(name, d)
    .view()

# simulations/base/kit/KeyBuilderScene.js
  UNKNOWN = 'unknown'  - "Sort the crowd" - the shared engine behind every branching-key challenge in this course.
  NOT_APPLICABLE = 'na'
  yesNo(ask, na)
  KEY_CSS  - Exported so the static worked snapshots (e.g. YeastExceptionScene) can draw the very same pods, cards and badges without duplicating the ...
  fitFrame(scene)  - ---- fixed frame + scrolling region: shared with SlotBoardScene ---------------- Landscape is a fixed frame (WIDTH x HEIGHT, or taller wh...
  settleScroll(scene, region, keptScroll, mode, targets)  - After a rebuild: keep the learner's scroll place, then (mode 'reveal', i.e.
  class KeyBuilderScene extends DomSimulation
    .static WIDTH = 620
    .static HEIGHT = 520
    .static PORTRAIT_WIDTH = 380
    .static PORTRAIT_HEIGHT = 1340
    .static CONTROLS = []
    .static MIN_SCALE = 1.05
    .static FILL_HEIGHT = true
    .static CONFIG = null
    .setup()
    .onBeatChange(beatIndex)
    .evaluate(tree = this.tree)
    .destroy()

# simulations/base/kit/NameDecoderScene.js
  NAME_CSS
  class NameDecoderScene extends DomSimulation
    .static WIDTH = 560
    .static HEIGHT = 470
    .static PORTRAIT_WIDTH = 380
    .static PORTRAIT_HEIGHT = 760
    .static CONTROLS = []
    .static MIN_SCALE = 1.05
    .static CONFIG = null
    .setup()
    .destroy()

# simulations/base/SimMascotDom.js
  SimMascotDom = { BASELINE_Y, VIEWBOX, mount, styles }
```

## Design note, `Kit use:` line
`Kit use: withChallenge use - <why>; <Board or game class> use - ...`.
