# Games: misconception buster, and a classify-by-evidence pattern

`MonsterScene` (in `simulations/base/kit/`) is a real, shared kit scene: a monster
states a tempting wrong idea, the learner picks the evidence that breaks it. It
needs no data file of its own; `who?` on a round can optionally name an id from
`config.fieldGuide()` if a course has one, purely for an optional face.

CONFIG: `{ ariaLabel, title?, monster: { name, tone? (1-8) }, hearts? (3),
rounds: [{ who?, claim, counter, why, traps: [{ text, why }] }] }`. `counter` is
the one evidence statement that breaks the claim; `why` is the takeaway; `traps`
are 2 tempting wrong counters, each with the reason it fails. A monster claim
must be a real misconception with a lure in it; keep wrong options tempting but
never true-and-decisive.

Real-time practice games (catch and sort, run a key, match, order, true or false) are now shared kit scenes that need only a data deck: `docs/arcade-games.md`. Use those for new courses; the diversity-course scenes below are the earlier, course-local versions and the source of the field-guide pattern.

## A richer pattern: field-guide.json and nine more games

A course that is centrally about classifying things by evidence (this is a
bigger, single-purpose model, not a generic kit feature) can build a `Guess
Who`, `Conveyor belt`, `Sort rush`-style set of games over one shared data
file. This is not shipped in the engine kit - it is a *pattern*, worked out in
full in one real course:

`courses/diversity/simulations/kit/` - `FieldGuide.js` (the data model and
`classify()`/`decisive()`/`tabs()` algorithms), `FieldGuideScene.js` (a small
bridge extending the shared `GameScene`), and `GuessWhoScene.js`,
`ConveyorScene.js`, `SortRushScene.js`, `KeyDashScene.js`, `WhackAMythScene.js`,
`ExpeditionScene.js`, `MuseumScene.js`, `CardPacksScene.js` (the games
themselves, each a thin subclass of `FieldGuideScene`).

Most of these are turn-based (one specimen, pick an answer, see the result).
`SortRushScene` is the odd one out and worth calling out on its own: it is a
real-time catcher, not a quiz. Specimens fall continuously and several can be
airborne at once; the oldest one still falling is the current target (shown
with a glowing outline, never frozen - it keeps falling and swaying the whole
time) and a tap on any bin resolves against it: correct sends it into that bin,
wrong just costs the streak (the specimen keeps falling, still the target, try
another bin) - one tap per decision, not a separate "catch" tap before the
"which bin" tap (an earlier version had both; two actions for one choice read
as fiddly, not arcade-fast). Only a specimen that reaches the ground uncaught
costs a life. The fall queue is round-robin across bins, not a flat shuffle,
so every bin gets a turn before any bin repeats - a course whose groups are
unevenly sized (this one: Monera has 2 organisms, Animalia has 17+) would
otherwise see long runs from whichever bin is biggest by sheer chance, which
reads as "the groups never change" even though the pool really was random.
The whole thing runs on plain CSS animation instead of a frame loop - see the
file's own header comment for the negative-`animation-delay` trick that lets
several independent falls survive a full board re-render (this base repaints
by replacing the whole board's `innerHTML` on every interaction, so a
naively-recreated animated element would restart from the top on every
unrelated event). Same bin config shape as `ConveyorScene`, so a course can
reuse one bin list for both.

`KeyDashScene` is the same real-time family, applied to the *key* itself
instead of a bin choice: one organism at a time races down its own
dichotomous key (its group's `all`/`none` traits, in order, as a run of yes/no
forks - the same facts `KeyBuilderScene`'s static board tests, just timed). A
gate showing "No"/"Yes" falls toward the runner; steer into the correct lane
before it arrives. A wrong lane costs a life but re-asks the same fork rather
than restarting the organism, so the run stays about timing, not memorising a
retry sequence. No `bins` config needed - just a `pool`.

`WhackAMythScene` isolates the one distinction the whole family keeps coming
back to (a `kind: "lure"` trait never decides a group, no matter how true it
is) and makes it a pure reflex test. Moles carrying a real organism's true
traits (shown as both the organism's name and the trait fact, e.g. "Hydra /
Lives in water" - naming the organism was added after a report that an
unlabelled fact alone read as anonymous trivia) pop out of several holes at
once; whack the ones showing `evidence`, leave the `lure` ones alone. A
trait's kind is fixed regardless of which organism is showing it, so this game
needs no `bins` and no per-organism logic at all beyond `pool` - it is really
testing "which of these ~38 traits are lures", which is exactly the fact every
other game in this family also leans on. Same pop-and-resume CSS trick as the
other two.

All three real-time games are authored as `content-block@1` slides with
minimal or no accompanying markdown (one short line, not progressive-
disclosure beats) and `simulation: { position: "below", fullWidth: true }` -
see the content-authoring-guide's own note on `fullWidth` for what that flag
does and why these games declare a widescreen `static WIDTH/HEIGHT` (960x540,
not the kit default 620x520) to go with it.

To reuse it in a different course: copy that `simulations/kit/` folder into
your own bundle, then author your own `field-guide.json` (schema documented in
`FieldGuide.js`'s header) and your own scene files (each a thin subclass
setting only `static CONFIG`, same shape as the diversity course's
`simulations/L12/*.js`). `tools/field-guide-lint.mjs courses/<bundle>` checks
any course's `field-guide.json` against its own scene files this way,
regardless of where the scene classes are defined - run it after every edit.

- A trait an organism does not list is false. `kind: "evidence"` can decide a
  group; `kind: "lure"` (lives in water, can fly) never does - that is the
  teaching point most of these games exist to make. `marker: true` flags a
  trait as too foundational to show as a stray "fact" (e.g. "made of cells" for
  every organism) - optional, nothing is hidden if you declare none.
- `groups` are ORDERED rules, first match wins. `tabs` (optional) groups the
  guide's own traits for Guess Who's question picker; skip it and every trait
  lands in one tab.
- `art` is a kit character (`ART_KEYS` in `simulations/base/kit/KeyCharacters.js`,
  a fixed roster of organism-style illustrations - a course whose content isn't
  organism-shaped would need its own art source, since this key list does not
  invent a new one for you).
- Saved progress (museum medals, cards, packs) goes through `Collection`
  (`simulations/base/kit/Collection.js` - this one IS shared kit infrastructure,
  since it is opaque-id-based and used by `core/CollectionService.js`
  regardless of what a course collects). Bronze = met, silver = right first
  time (or in a Rush), gold = a standout result. A game never stores anything
  itself; the host passes `config.collection`.
- Timers are allowed here (Conveyor "Rush"); keep them out of anything that
  grades. One game per idea; put a game where it checks something just taught,
  or in its own bonus lesson.
