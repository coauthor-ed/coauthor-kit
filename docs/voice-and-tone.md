# Voice and Tone

Two real courses from this kit read very differently despite identical schema - one terse and textbook-dry, one warm and easy to follow. That's a prose choice, not a schema one. Applies to every `markdown`/`prompt` field.

**Not asking for less precision** - every rule below is about packaging (sentence length, structure, concreteness), never about cutting a defined term or a precise claim to make a beat shorter.

## Reader

Indian students, classes 9-12 (ages 14-17). English is often their second or third language: they know school words, not literary ones. They read slowly and exactly, and many read on a phone. Write so a tired reader at the end of the school day follows each sentence on the first pass.

- **Plain words.** Pick the common word ("pushed back", not "driven back"; "answer", not "verdict"; "who does the work", not "which agency"). Keep the syllabus term exactly where tests use it (displacement, work done, joule).
- **No idiom, no figure of speech that needs decoding.** "Two free tickets", "catches people out", "refuse to budge", "run it through the gates", "parked", "square across" make a second-language reader translate before they learn. Use the literal version: "two easy ways", "is easy to get wrong", "stays at zero", "check", "waits", "straight across".
- **A comparison is allowed when it is a concrete everyday thing with a stated link** (a LEGO box, a queue at the canteen). Say what it stands for. Never a joke or aside the reader must get to follow the point.
- **Do not tease.** "Leave that one for the next slide" and "Nobody can tell you what happens next" hold back for effect. Say plainly what comes: "We will see this on the next slide."
- **Define before use.** A new word gets one plain-language meaning the first time it appears; a word the reader already knows is not defined again.
- **Home ground.** Take examples from what an Indian student has seen: cricket, an auto-rickshaw, a train, a kirana shop, a school corridor, the monsoon, rupees. Avoid things that need foreign background (snow days, baseball, dollars). Indian names for characters. British spelling (metre, colour, forward).
- **Warm, never babyish.** Address a capable teenager. No sarcasm, no in-jokes, no exclamation-mark cheer.

## Terse (avoid)

> Every lane consists of two identical straight sections and two curved bends. While the straight stretches are equal in length for all athletes, the curved sections widen outward. Because outer bends form wider curves around the central field, an outer runner forced to start level with an inner runner would run far more than 400 m before reaching the finish line.

Three ideas fused into one paragraph via subordinate clauses - no beat to breathe between them.

## Warm (aim for)

> Imagine shaking a box full of LEGO bricks. The pieces may collide thousands of times, but they won't assemble themselves into a castle.
>
> **Having the right ingredients isn't enough. They must also be organized in the right way.**

A concrete analogy carries the reader in; each sentence lands one idea; the payoff is its own bolded, standalone line.

## Staccato (also avoid)

> The wall did not move. Work is zero. Force times zero is zero. Your arms are tired. That is different.

Five fragments of thought, no links. The reader must work out how they connect, and the rhythm reads like a list of slogans. The fix is not a longer paragraph, it is **connected sentences**:

> The wall did not move, so the work done on it is zero: any force multiplied by a displacement of zero gives zero. Your arms still get tired, because your muscles use up energy, but none of that energy goes into the wall.

Two sentences, each carrying a reason ("so", "because"). Short is fine; a string of shorts is not.

## Plain wording, before and after

Real rewrites from the work-energy course (first draft, then the fixed version).

| Draft | Fixed |
|---|---|
| Run each one through the gates | Check each case with three questions |
| Two free tickets / The third ticket is not free | Two easy ways / The third way is the tricky one |
| Nobody standing up there can tell you what happens next | You have probably guessed already. |
| Hands driven back along the push | Hands pushed back while pushing the ball |
| Pull square across the lift | Pull straight across the lift |
| The verdict | The answer |
| Say whose work, and on what | Always say who does the work, and on what |
| Leave that one for the next slide. | We will see this on the next slide. |
| Tiredness - measured in how badly you want to stop. | (cut: a joke the reader must decode) |

## Rules

1. **One main idea per paragraph, two to four sentences, mixed in length (aim 8-20 words).** Give each claim its reason in the same sentence ("so", "because", "but", "which means"). Never run three or more very short sentences (under 7 words) in a row, and no fragments. A sentence that needs two links and a side clause is too long: split it, then join the pieces back to their neighbours with a linking word. One very short sentence is fine as the bold takeaway or as a single deliberate beat.
2. **A short `##` sub-header per beat** with its own idea (`## A Team That Falls Apart`) - skip it on a one-line beat. If the block uses `<!-- STEP -->` sentinels (simulation-linked blocks, see `docs/simulation-authoring.md`), the heading goes **after** the sentinel that opens its beat, never before - a heading before the sentinel becomes an empty beat of its own.
3. **Bold the one takeaway sentence**, standing alone, not mid-paragraph. Bold for the takeaway only - bolding everything bolds nothing.
4. **Bullet lists past two items**, even in narrative prose.
5. **Concrete analogy before the general principle** (a LEGO box, not just the formal statement) - the analogy earns the precise statement, doesn't replace it.
6. **A recurring device (character, running example) is optional** - use it only if the subject genuinely supports a throughline; forced is worse than none.
7. **`poe-predict@1` prompts**: one or two plain scene-setting sentences, then an explicit `**Predict:**` label:
   ```
   ## Plasmolysis in Plant Cells

   Scientists place a peel of **Rhoeo leaf epidermis** into a **20% sugar solution**. They know the cells will lose water by osmosis.

   **Predict:** What will happen to the overall shape of the plant cell?
   ```
   not dense setup immediately followed by a bare question.

   Works the same for a decision, not just an observation:
   ```
   ## A Farmer's Trade-off

   A farmer has one plot of land, and can grow **barley**, **wheat**, or some mix of both. Growing more barley leaves less land, water, and labour for wheat.

   **Predict:** If the farmer decides to grow more barley next season, what has to happen to the wheat harvest?
   ```

8. **Markdown tables render fine** (GFM, via `marked`) - use one for real tabular data, not as a substitute for rule 4's bullet lists.

## Register

The rules above shape the sentence. These shape the stance the prose takes towards the reader.

1. **Name the wrong idea first, out loud.** Most students arrive holding one. Prose that only states the correct account leaves them to notice the clash themselves, and most will not. "You would think a wider boundary holds more together. It does not." beats an unopposed correct statement.
2. **A wrong answer is welcome in the prose, not just in the feedback.** Say that a guess was reasonable and say exactly where it breaks. A beat that admits "people believed this for two hundred years" costs one sentence and buys the reader permission to have been wrong.
3. **End a beat on a hook, not a definition, and state the hook plainly.** A beat that closes on the term it just introduced is finished; one that closes on the problem the term creates pulls the reader into the next beat. Definitions belong mid-beat.
4. **Second person, present tense, for anything the reader does.** "You measured a coin, a plate, a Ferris wheel" - not "one measures" and not "students will measure".
5. **No throat-clearing.** "In this lesson we will learn", "It is important to note that", "As we have seen" - cut all of it. `docs/pedagogy.md` bans the first one outright; the rest are the same habit.
6. **Never explain by intention.** Not "the cell needed a way to keep its molecules together". Nothing in evolution wants anything. Say what survived and why: "boundaries turned up, and the lineages that had them left more descendants." People may have intentions; molecules, cells and species may not. `tools/bundle-invariants.mjs` checks for this.

## Character speech (courses with a cast)

If the manifest has `"cast"` (story/cast.json), mark every line a cast member says aloud with `<!-- SAY id [mood] -->` on its own line directly above the paragraph. Never leave it as quoted prose.

1. Mood = a pose name in that character's `poses` in cast.json. None, or an unknown one, shows `default`. Use one only when it fits (puzzled: think; pleased: proud).
2. Inside the bubble: only the spoken words. No quote marks, no tag (`says Kabir`, `she whispers`). Rejoin split sentences. Manner or action goes in a narration paragraph BEFORE the bubble.
3. Story mode: a SAY that opens a beat takes the whole beat into that bubble. Write the narration first (a short lead-in), or keep the beat to the speech alone. Never add a paragraph that would add a beat to a block with STEP ids.
4. Stays narration: written words and labels (notebook lines, card or rule names, scare quotes), reported speech, speech by someone not in the cast, the learner's own lines (no sprite), device callouts (`> **The Lens says:**`).
5. Plain-text fields (question stems, option text and feedback, objectives) cannot carry a speaker. Keep them as narration.
6. `node tools/prose-lint.mjs --bundle X` warns on quoted speech with no SAY and on a SAY that opens a beat followed by narration. Some warnings are notebook lines or labels: judge each.

`examples/blocks/*.json` follow this doc - match their prose register too, not just their JSON shape. Question stems are out of scope here.

## Audio narration

A narrated lesson gets a separate teacher script, not this prose read aloud. Rules and pilot mistakes: `docs/narration.md`.
