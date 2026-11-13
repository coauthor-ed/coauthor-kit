# WorkDefinitionScene - simulation stub
Save path: simulations/L01/WorkDefinitionScene.js
Attached by: blk-l01-s07 (explain)
Beats: 3
Base class: DomSimulation (two dials either side of a live product on one card - boxes and numbers, no drawing, nothing to animate)
Hero: One card. A force dial on the left, a displacement dial on the right, and between them a live `W = F x s` with the joule figure in a larger box underneath.
Dials: force 0-100 N; displacement 0-20 m, ranged so the displacement is always along the force, and the caption says so on the card.
Run shows: none. Every dial move recomputes the product live. The equals sign sits between the two dials so the multiplication is shown rather than implied.
Note card: the two dials can never be pointed in different directions. This card only ever shows work along the force, and it says that on its face - the angled case belongs to a different scene.
Must get right: the result carries the unit joule, symbol J, and the card defines it in words as one newton moving something one metre along itself; a 1 N and 1 m setting reads exactly 1 J; on the last beat the two prompts - which force, and on which object - appear as tags under the product.
Not yet taught: the source chapter own two-cube schematic is deliberately not reproduced here - this card is an original construction. No energy, no power, no sign, no negative readings, and no second object to compare against.
Reuse: none.

## Per beat
- beat 0: the two dials and the product. The learner can drive either dial at once and watch the third number follow.
- beat 1: the joule box becomes the focus. Nothing is disabled; a 1 N and 1 m setting has to be reachable so the unit is demonstrable rather than asserted.
- beat 2: the two question tags appear under the product. Everything above them stays exactly as it was.

## Verbatim slide markdown
### blk-l01-s07
```markdown
# The Whole Definition on One Card

<!-- STEP -->
## Two numbers, multiplied

The work done **on an object by a force** is the force multiplied by the distance the object moves **in the direction of the force**. This holds when the force stays steady.

- $F$ - how hard you push
- $s$ - how far the object moves along the push
- $W = F \times s$ - the work, measured in joules

<!-- STEP -->
## What is one joule?

If a force of one newton moves an object one metre in its own direction, the work done is one **joule**, written $J$.

A joule is quite small. Lifting an apple one metre takes about 1 J. Lifting a 5 kg sack one metre takes about 50 J.

<!-- STEP -->
## Always say who does the work, and on what

Two questions must always be answered:

- **Which force** is doing the work?
- **Which object** is the work done on?

Say you push a wheelchair across the floor. Your push does work on the wheelchair. The friction of the floor also acts on the same wheelchair, and its work is a *different number*, because friction points the opposite way.

Same wheelchair, two forces, two different works. So always say which one you mean.
```

Shared helper: none
