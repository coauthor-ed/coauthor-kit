# Stage 3 index - pick your guide

Read the one guide for your stub's `Base class:` (and `Component:`), plus an add-on only if the scene draws that thing. Each guide holds the docs to read, the kit API (from kit-api, copied in), the example to copy and the right check commands for that kind of scene. Nothing else about the kit is needed: no searching.

| The stub says | Read |
|---|---|
| `Base class: SimScene` or `CanvasSimulation` (canvas drawing: apparatus, labelled figures, graphs on canvas) | `briefs/stage3/canvas.md` |
| `Base class: SvgScene` (data shapes on an SVG stage) | `briefs/stage3/svg.md`, then the one `Component:` guide below. No `Component:` line? Pick by what the hero is: figure, angles, circle, constructions -> Geom; a line of numbers -> NumberLine; bars or a graph -> Chart; dice, coins, trials -> Chance; rings, sets, sort into regions -> Venn; a grid of counts with totals -> Table |
| `Component: Geom` (constructions, angles, drag a point, area model) | `briefs/stage3/geom.md` |
| `Component: NumberLine` | `briefs/stage3/numberline.md` |
| `Component: Chart` | `briefs/stage3/chart.md` |
| `Component: Chance` (dice, coins, cards, spinners, trees, long-run trials) | `briefs/stage3/chance.md` |
| `Component: Venn` (the hero is a Venn or set diagram: rings, regions, sort items into regions, shade a set expression) | `briefs/stage3/venn.md` |
| `Component: Table` (a grid of counts with totals: mark cells, read a row's share, fill a hidden cell) | `briefs/stage3/table.md` |
| `Base class: DomSimulation` (labelled panels, tables, sorting, cards) | `briefs/stage3/dom.md` |
| `Component: Timeline`, `FlowBoard`, `AllocBoard`, `SlotBoard` (history, civics, cause chains, allocation, compare) | `briefs/stage3/boards.md` |
| a game: role `game` / `mini-game@1`, `MonsterScene`, `KeyBuilderScene`, `NameDecoderScene` | `briefs/stage3/game.md` |
| `Base class: Arcade*Scene` | `briefs/stage3/arcade.md` (a much smaller job) |
| `Base class: GeoScene` or `WebGLSimulation` (3D), or a map (`GeoMap`, `SimGeo`) | `briefs/stage3/geo.md` |

Add-ons (read in addition, only when the scene needs it):

| The scene draws | Read |
|---|---|
| people, a crowd, a class, a seated person, a cyclist, an animal | `briefs/stage3/people.md` |
| a cart, block, ramp, pulley, spring balance, chair, desk, bicycle, a pan balance | `briefs/stage3/props.md` |

Need motion (a count, a fly-in, a spotlight, a draw-on, a morph)? Each guide has a `Motion recipes` table: take the row before hand-rolling a tween.

Not sure whether the kit already has a part for something you are about to draw? `briefs/reference/kit-parts.md` is the one table: pattern -> part -> showcase. A scene that hand-draws a part from that table gets a note from `check-scene`.

If no guide fits (a new base class, an odd stub): take the closest one and put one line under `## Requests`.
