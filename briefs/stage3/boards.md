# Stage 3 guide: boards (Timeline, FlowBoard, AllocBoard, SlotBoard)

The stub names a `Component:`. The scene is mostly its config: write the config and the beat map; never hand-place what the board lays out; never set HEIGHT on it.

| Component | Class (module) | Example to copy |
|---|---|---|
| Timeline (dates, eras, "place the event") | `TimelineScene` (`SimTimeline.js`) | `examples/simulations/humanities/ChronologyShowcaseScene.js` |
| FlowBoard (chain, cycle, tree, pyramid, order, "what comes next") | `FlowScene` (`FlowBoard.js`) | `examples/simulations/humanities/ConsequenceShowcaseScene.js`, `examples/simulations/humanities/FlowLayoutsScene.js` |
| AllocBoard (coalition to a majority, budget split, fill to capacity) | `AllocBoardScene` (`AllocBoardScene.js`) | `examples/simulations/humanities/MajorityShowcaseScene.js`, `examples/simulations/humanities/BudgetShowcaseScene.js` |
| SlotBoard (compare matrix, claim vs evidence) | `SlotBoardScene` (`SlotBoardScene.js`) | `examples/simulations/humanities/ClaimEvidenceScene.js`, `examples/simulations/humanities/CompareCivilisationsScene.js` |

A timeline strip drawn on canvas instead (era bands, dated ticks, event tags): `examples/simulations/humanities/HarappanTimelineShowcaseScene.js` with `SimTimelineCanvas.js`. Seats from votes: `examples/simulations/humanities/VotesToSeatsShowcaseScene.js`.

## Read
- `node tools/doc-section.mjs docs/simulation-authoring.md "3.3 DOM" "3.5 Kit components"`
- `docs/dom-scene-kit.md` only if you add DOM of your own around the board: `node tools/doc-section.mjs docs/dom-scene-kit.md "3. Component classes" "6. Do not"`
- The header comment of your board is its manual (config shape, modes, what it validates). Read the one you use: `sed -n '1,/^ \*\//p' simulations-kit/src/simulations/base/kit/<Module>.js`.

## Rules
- Each board validates its config at setup and throws a plain message: fix the config, not the board.
- A game on a board (`AllocBoardScene` with `withChallenge`): also read `game.md`.
- Dates and money: `SimText.js` (`fmtYear`, `fmtINR`, Indian grouping).
- The quick check runs on a fake DOM with no HTML parser: build with `createElement` and `append`; `innerHTML` becomes one opaque child. Drive real markup with `drive-dom`.
- Pick the board by the interaction, not the topic. SlotBoard is tap-a-slot then Check, not pairing: drag-to-pair is `simPick` in a plain `DomSimulation`. AllocBoard is value cards dragged into rule bins; rows with -/+ steppers are a plain `DomSimulation`.
- FlowBoard: each card is `[data-node="<id>"]`; the board has no tap or lit hook (use the `onChange` option). A chain of more than 4 wraps to 2 rows (6 nodes = 2 of 3); `cycle` is the loop shape. `order` mode lays its sockets in ONE row: no cycle, and a ring of drop slots is your own DOM plus `simPick`. `order` mode accepts any card in any socket (the board never refuses a drop); a scene that must react to a wrong placement reads the order in `onChange`.
- A `<button class="sim-field">` has no colour rule of its own (1.1:1 on the light theme): set `color` from a token.

## Commands for this kind of scene
- Operate: `node tools/sim-test/drive-dom.mjs L0N/<Scene> --bundle <Bundle> --inputs`, then `--steps=@file.json`. check-scene reports freeze/resume as SKIPPED: expected.

## API (from kit-api, copied in)
```text
# simulations/base/kit/SimTimeline.js
  TIMELINE_CSS
  mountTimeline(host, cfg, o = {})  - Build a timeline inside host; returns the controller (see the header). @opts onChange, announce, onLayout
  class TimelineScene extends DomSimulation  - A scene that is only a timeline: static CONFIG (cfg above), BEAT_STEP_MAP, ARIA_LABEL.
    .static WIDTH = 680
    .static HEIGHT = 520
    .static PORTRAIT_WIDTH = 380
    .static PORTRAIT_HEIGHT = 1000
    .static LAYOUT = 'frame'
    .static CONFIG = null
    .static CONTROLS
    .setup()
    .onBeatChange(beat)
    .refreshTheme()
    .isControlHidden()
    .isControlDisabled(id)
    .onControlChange(id)
    .destroy()

# simulations/base/kit/SimTimelineCanvas.js
  timelineAxis(o = {})
  timelineCanvas(ctx, c, tl, o = {})

# simulations/base/kit/FlowBoard.js
  FLOW_CSS
  mountFlow(host, cfg, o = {})  - Mount a flow board into host; returns the controller. @opts onChange, announce, onLayout, seed
  class FlowScene extends DomSimulation  - A scene that is only a flow board: static CONFIG, BEAT_STEP_MAP, ARIA_LABEL.
    .static WIDTH = 680
    .static HEIGHT = 520
    .static PORTRAIT_WIDTH = 380
    .static PORTRAIT_HEIGHT = 900
    .static LAYOUT = 'frame'
    .static CONFIG = null
    .static CONTROLS
    .setup()
    .onBeatChange(beat)
    .refreshTheme()
    .isControlHidden()
    .isControlDisabled(id)
    .onControlChange(id)
    .destroy()

# simulations/base/kit/AllocBoardScene.js
  ALLOC_CSS
  class AllocBoardScene extends DomSimulation
    .static WIDTH = 680
    .static HEIGHT = 520
    .static PORTRAIT_WIDTH = 380
    .static PORTRAIT_HEIGHT = 900
    .static LAYOUT = 'frame'
    .static CONFIG = null
    .static CONTROLS
    .setup()
    .static validate(cfg)
    .fmt(v)
    .sumOf(bin)
    .place(id, bin)
    .itemHtml(it)
    .ruleText(r)
    .draw()
    .refreshTheme()
    .onBeatChange(beat)
    .checkObjective()
    .isControlDisabled(id)
    .onControlChange(id)
    .destroy()

# simulations/base/kit/SlotBoardScene.js
  SLOT_CSS
  escapeHtml
  class SlotBoardScene extends DomSimulation
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
    .evaluate()
    .destroy()

# simulations/base/kit/SimPick.js
  simPick(root, o = {})  - SimPick - pick-and-place for DOM boards: pointer drag, tap-then-tap, and keyboard (Tab to an item, Enter/Space picks, arrows move between... [opts: items, targets, onDrop, canDrop, onPick, onCancel, announce, itemId, targetId, track, countText]
```

## Design note, `Kit use:` line
`Kit use: <Board class> use - <what the config holds>; SimPick use - ...`.
