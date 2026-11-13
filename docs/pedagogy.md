# Pedagogy

`docs/voice-and-tone.md` governs the sentence; this governs how a lesson is *built*. Both apply to every lesson.

## Open with inquiry, not summary

Never "In this lesson we will learn about X." Open with a question, a puzzle, or something that looks obvious and turns out wrong - the same instinct `poe-predict@1` exists for, applies to a plain hook slide too.

## Use real dead ends

Show a plausible-but-wrong approach failing on a specific case (a concrete number, shape, scenario, counterexample) - not just "this doesn't work."

## Only define what's actually new

Give the "this is called X" treatment once, only to genuinely new vocabulary - not as a reminder on every later slide.

## Make hard words easy to start on

Latin and Greek names are the main reason a chapter feels hard. Treat them as a design problem, not a memory test - `docs/glossary.md`.

- Most names are short descriptions in an old language. Show the pieces first ("platy = flat, helminth = worm"), let the learner guess the body, then reveal the name.
- Plain name first, scientific name second, then fade the plain name.
- At most 3 new names in a beat; a beat that needs more is two beats.
- Every hard word is one tap from a card (glossary.json).
- Come back to names in later lessons with a recall round, not a re-read.
- Say out loud once that the names are hard and nobody is born knowing them.

## Vary your phrasing

Don't reuse the same sentence template slide after slide ("Now let's check..." / "Now let's verify..." back to back reads like mail-merge).

## Ground every idea in something specific

A number, example, or real situation - never an abstract claim standing alone (same instinct as voice-and-tone's concrete-before-abstract rule, applied at the lesson level).

## A throughline, only if it earns its place

Use one running thread/object across a chapter only if it genuinely fits. A forced throughline is worse than none - it's fine to decide a chapter doesn't have one.

## Speculate first, in any lesson that explains a mechanism

Default opening for a mechanism lesson: pose the problem, make the reader commit to an answer, then teach. A `poe-predict@1` with `deferVerdict: true` is the mechanism - the wager is recorded and the verdict is withheld until the lesson has earned it.

A prediction is only worth asking if a reader could plausibly pick the wrong option. "Which of these is the cell membrane" is a quiz. "Wrap the molecules in a boundary - what is the catch?" is a prediction, and the whole lesson is the answer.

Put it before the first content block. One per lesson; more and the commitment stops meaning anything.

## A chapter is one arc, not N independent lessons

Each lesson should close on the problem the next one opens with. If lesson 3 could be read before lesson 2 without loss, the chapter is a list rather than an arc.

The reliable shape: a solution creates the next problem. A boundary holds the molecules together and cuts them off from supplies; selectivity fixes that and leaves the cell soft; a wall fixes that and lets pressure build. Every step is motivated by the previous step's cost, so nothing has to be memorised in isolation.

This is what makes the last lesson able to ask "what did all of these have in common" and get a real answer.

## Questions test understanding, not vocabulary recall

Every wrong `mcq-single@2` option should reflect a specific real misconception, not just be false - "C is what you get if you use the slant side instead of the perpendicular height," not "C is wrong."

## Cover the whole chapter; decide the shape yourself

No fixed lesson count or slides-per-topic ratio - pace from what the material needs (see `docs/generation-playbook.md` step 2).

## Reflection boxes ("Let's Explore" etc.)

Ungraded - a `content-block@1`, never a `semantic-descriptive@1` (no rubric for an open opinion). Don't just restate the textbook's question: add 2-3 short considerations spanning different viewpoints so the student has something to reason with, not a blank prompt. That's real value over the textbook, not filler.

## Explain beliefs, don't just report them

Naming a belief without saying why people would have believed it is trivia, not history. Ground it in the believers' actual situation - an environmental pressure, an unexplained uncertainty, an observation later generalised, a political problem it solves (who gives orders, why a decision is trusted). Treat it as a reasonable response, not an ignorant guess.

## Give history's relevance away

State the ancient-to-modern continuity explicitly somewhere in the chapter (one synthesis slide near the close usually suffices) - don't leave the student to infer why any of it matters. Name the specific mechanism carried forward (a record-keeping system, a standard, a form of legitimate authority), not a vague "shaped the modern world."

## Earn every scene

A scene goes on a slide only if it makes something visible that prose, a table or a worked calculation cannot: a relationship that moves, a distribution that builds, a structure compared side by side, a mechanism over time. Test each planned scene with two lines on its outline slide (Stage 1b):

- `Shows:` what becomes visible that text cannot ("the row 'risk' moves as controls per case change while the column rates stay put").
- `Without it:` what the learner would lose ("they would take 33/88 as a risk").

Both weak: the slide is Text only, with one emphasis device: pull quote, takeaway, table or worked steps (`docs/numericals.md`). Decoration fails the test: a card with a "?", a board that pins a number the prose already states, a picture with nothing to do and nothing that changes. Signal: no learner action AND no changing quantity. Under `quill` (school) AGENTS.md rule 11 still wants a scene on most slides: the test decides what the scene shows, not whether to drop it. Under `plain` or a college audience a Text only slide is a normal outcome.

## Dry, text-heavy subjects: which visuals first

Epidemiology, statistics, law and economics read as dry, and students dislike them; visuals matter more there, not less. Spend the effort where the idea is hard, not on every slide. Reach for these first, in this order:

1. Editorial panels (`docs/numericals.md`, SimPanel): a live reading with its formula, a rule table with selectable columns, bar comparison, a step-by-step calculation panel, an annotated sentence, a histogram that builds.
2. A population as dots that sorts, splits or fills (`dotsSvg`), a flow or timeline (the `figure` field, FlowBoard).
3. Bespoke illustration only when the picture is the mechanism.

Never: decorative boards, props or desk dressing that hold no idea.

## Clarity beats brevity

First-time learners need the full explanation: what, why this way, what it means. Explanatory depth is a strength; do not trade it for concision. Split a long explanation over beats instead of cutting it; the sentence limits in `docs/voice-and-tone.md` still hold.
