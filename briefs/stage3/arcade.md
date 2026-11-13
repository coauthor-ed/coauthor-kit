# Stage 3 guide: arcade stub (Base class Arcade*Scene)

A different, much smaller job: config, not a scene.

## Read
- `docs/arcade-games.md` (the archetype, skin and deck shapes) and the stub's `## Play`.

## Fit test (before the deck)
Arcade text sits on small fixed cards. Check every item against these limits before you write; an item that does not fit means the archetype is wrong for it. Do not cut its meaning to squeeze it in.
- Judge: each statement at most 32 characters, one line, true or false on its own. A 2-line statement fails check-scene's overlap gate today. The evidence goes in `why` (the why card has room).
- Sort / Catch: each item name at most 14 characters (over about 14 it shrinks below 14 px; 16 is the hard limit). The evidence goes in `why`.
- Match, Order, Route: each label must stay readable on its card at the size the example shows; if you are tempted to shorten it until it loses a condition, change the archetype.
- A claim that needs a condition or a number to be true ("beats inflation if the rate is above it") does not fit Judge or Sort. Use `ArcadeMatchScene` (a short topic paired with its rule or condition) if it is recall, or leave the arcade out and use a true/false question that shows the whole claim. Say which in the design note.

## Steps
1. Design note: three lines only: `Status: building`, `Base class: Arcade<Kind>Scene`, archetype + skin + deck + rounds, `Writes helper: <Deck>.js` if you write the deck file.
2. Write or extend the deck file (data only, one file per chapter, shared by its games) and the thin scene: `extends Arcade<Kind>Scene`, `static ARIA_LABEL` naming the topic, `static CONFIG = { ...DECK, title, skin, rounds }`. If the invocation says the deck helper exists, keep it: add your deck as a NEW export (never edit or reorder an existing item or export). Every item gets a `why` that is evidence, not a restated answer; mark common mix-ups `myth: true`; nothing in art or colour may give an answer away; no item the lessons have not taught.
3. `node tools/sim-test/check-scene.mjs L0N/<Scene> --bundle <Bundle>` (a bad deck throws a plain message at setup), then `node tools/sim-test/run.mjs exec tools/sim-test/arcade-bot.mjs <scene.js>` (plays one mistake then right, checks the run ends, the boss round, the mix-up recap; `--passive` for the run-out-of-hearts case).
4. Look: `node tools/sim-test/shoot.mjs L0N/<Scene> --bundle <Bundle> --steps='[{"tap":[150,424],"wait":3500,"name":"play"}]'` (taps PLAY, waits out the countdown; Catch: `[196,336]`); add a wrong tap to see the why card; one round of fixes at most. The why card, boss round and celebration are shared ArcadeScene chrome, the same in every arcade scene: do not chase them or spend a pass on them. Shoot the menu and play, judge text fit and contrast, then close. Set `Status: done` (or `look-pending`), log one bullet, report. Skip the rest of the Stage 3 brief.

## Examples
`examples/simulations/arcade/` : deck `WorkEnergyDeck.js`; Sort `EnergyFormsSortScene.js`, `WorkSignBeltScene.js`; Order `EnergyStackScene.js`, `EnergyTrainScene.js`; Match `FormulaBubblesScene.js`, `FormulaRangeScene.js`; Route `LeverRailScene.js`, `WorkSignRouteScene.js`; Judge `MythCardsScene.js`, `MythDoorsScene.js`; Catch `EnergyFormsCatchScene.js` (ice), `WorkSignCatchScene.js` (orchard), both on the Sort decks.

## API (from kit-api, copied in)
```text
# simulations/base/kit/ArcadeScene.js
  class ArcadeScene extends SimScene
    .static BEAT_STEP_MAP = [[{ idx: 0, dwellMs: null }]]
    .static KIND = 'Arcade'
    .static HOW = ''
    .static DEFAULTS = {}
    .static CONFIG = null
    .setup()
    .checkConfig()
    .beginRun()
    .tickPlay()
    .drawPlay()
    .tapPlay()
    .onHit()
    .afterWhy()
    .releasePlay()
    .movePlay()
    .startRun()
    .endRun()
    .balanced(items, groupOf, n)
    .requeue(item)
    .right(x, y, item)
    .wrongTry(info)
    .slip(info)
    .itemDone()
    .bossItems()
    .isBoss(item)
    .update(d)
    .busy()
    .pointerDown(p)
    .pointerMove(p)
    .pointerUp(p)
    .hit(id, r, data)
    .draw(ctx, c, t)
    .tone(key)
    .fitText(ctx, c, text, maxW, maxSize, minSize, weight = 800, display = false, maxLines = 2)
    .drawToken(ctx, c, item, cx, cy, w, h, o = {})
  itemName(item)
  shuffle(a)
  cardBox(ctx, c, x, y, w, h, rim)  - A raised card with a coloured rim, for the why and end cards.
  crown(ctx, c, x, y, r)
  heart(ctx, x, y, r, col)
  HUD_H

# simulations/base/kit/ArcadeSortScene.js
  class ArcadeSortScene extends ArcadeScene
    .static KIND = 'Catch and sort'
    .static HOW = SKINS.sky.how
    .static ARIA_LABEL
    .static DEFAULTS
    .checkConfig(cfg)
    .get skin()
    .menuSample()
    .menuTint(c)
    .beginRun(run)
    .tickPlay(d, real)
    .afterWhy(w)
    .onHit(id, data)
    .whyHint(ctx, c, w)
    .drawPlay(ctx, c, t)
  SORT_SKINS

# simulations/base/kit/ArcadeOrderScene.js
  class ArcadeOrderScene extends ArcadeScene
    .static KIND = 'In order'
    .static HOW = HOW.stack
    .static ARIA_LABEL
    .static DEFAULTS = { fuse: 5, skin: 'stack' }
    .checkConfig(cfg)
    .menuSample()
    .menuTint(c)
    .bossPool()
    .beginRun(run)
    .tickPlay(d, real)
    .afterWhy(w)
    .onHit(id, pid)
    .drawPlay(ctx, c, t)
  ORDER_SKINS

# simulations/base/kit/ArcadeMatchScene.js
  class ArcadeMatchScene extends ArcadeScene
    .static KIND = 'Match it'
    .static HOW = HOW.bubbles
    .static ARIA_LABEL
    .static DEFAULTS
    .checkConfig(cfg)
    .menuSample()
    .bossPool()
    .beginRun(run)
    .tickPlay(d, real)
    .afterWhy(w)
    .onHit(id, sid)
    .drawPlay(ctx, c, t)
  MATCH_SKINS

# simulations/base/kit/ArcadeRouteScene.js
  class ArcadeRouteScene extends ArcadeScene
    .static KIND = 'Run the key'
    .static HOW = HOW.road
    .static ARIA_LABEL
    .static DEFAULTS
    .checkConfig(cfg)
    .menuSample()
    .menuTint(c)
    .beginRun(run)
    .tapPlay(p)
    .tickPlay(d, real)
    .afterWhy(w)
    .drawPlay(ctx, c, t)
  ROUTE_SKINS

# simulations/base/kit/ArcadeJudgeScene.js
  class ArcadeJudgeScene extends ArcadeScene
    .static KIND = 'True or false'
    .static HOW = HOW.cards
    .static ARIA_LABEL
    .static DEFAULTS
    .static DRAGGABLE = true
    .checkConfig(cfg)
    .menuSample()
    .menuTint(c)
    .bossPool()
    .beginRun(run)
    .tickPlay(d, real)
    .afterWhy(w)
    .onHit(id, data, p)
    .movePlay(p)
    .releasePlay()
    .drawPlay(ctx, c, t)
  JUDGE_SKINS

# simulations/base/kit/ArcadeCatchScene.js
  class ArcadeCatchScene extends ArcadeScene
    .static KIND = 'Spot it'
    .static HOW = SKINS.ice.how
    .static ARIA_LABEL
    .static DEFAULTS
    .static DRAGGABLE = true
    .static ATTRACT_S = 6.4
    .static COLOR_MAP
    .checkConfig(cfg)
    .get skin()
    .get targets()
    .bossPool()
    .beginRun(run)
    .tickPlay(d, real)
    .afterWhy(w)
    .movePlay(p)
    .tapPlay(p)
    .keyPlay(key, down)
    .drawWorld(ctx, c, t)
    .whyHint(ctx, c)
    .drawPlay(ctx, c, t)
    .endDecor(ctx, c, t)
    .drawMenu(ctx, c, t, u)
  CATCH_SKINS
```
