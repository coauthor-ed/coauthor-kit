# Interactive runs: ask the operator, then work

Read this only when your invocation says `Interactive: on` (live: the operator is in this session and will answer) or `Interactive: async` (the operator answers later, in the steer file). Often the operator is the course's author: a teacher or lecturer, not a programmer. Without either line, never ask: use your defaults and log them.

## Rules

1. This overrides START-HERE rule 7 ("do not stop before the report") until the operator confirms (step 5). Every other rule holds, except rule 10 as rule 9 says. Your write-scope gains `courses/<Bundle>/steer/`; in Stage 1b also `courses/<Bundle>/COURSE-BRIEF.md`; in Stage B1 nothing more (decisions go in BANK-PLAN.md).
2. Order:
   1. Do your brief's reading. Write none of its outputs yet.
   2. Write the proposal into the steer file (below).
   3. Send ONE message: your stage's checkpoint (below).
   4. Wait. Copy the reply verbatim into the steer file as `## Answer N`.
      - It leaves a choice open: ask once more, briefly (`## Proposal N`, then wait again).
      - It asks for more or other options ("none of these", "show me more"): send them as `## Proposal N`: 2-4 new options in the same shape, shorter, building on what they said. At most 2 such rounds; then say which option you would build and why.
   5. Restate the decision in 3-6 lines and wait for an OK. "ok", "yes" or "you choose" = your stated defaults.
   6. Record the decision (your stage's "After"), then do your stage as the brief says, and report.
3. Resume. The steer file has a `## Decision`: do not ask again; say in one line that you use it, go to step 6. It ends in a proposal with no answer: live, send that proposal again (shorter); async, stop as in "Async" below. It ends in an answer: go on from step 4 with it. Read only what you need.
4. Write for the operator:
   - plain everyday words, short sentences;
   - no kit names in the text they read (SimChart, poe-predict, mini-game@1, stub, beat, scene): say "a chart you can drag", "a guess-first question";
   - kit names go on a separate `Kit:` line under an option, for the record;
   - number the parts and letter the options, so a reply can be "B" or "B, but 5 lessons";
   - every question shows your default in brackets.
5. Length. A first proposal is at most 900 words (a follow-up 400): run `wc -w` on the proposal file before you send it. Over: cut each plan's lesson lines to one short clause first, then the risks; never cut the questions.
6. Real options only. Each option must be buildable with the kit today. Tag each interactive piece `[have]`, `[have, look not reviewed]` or `[needs new work: <what>]`. Never offer what the course's look card rules out. You may add once: "with look quill this could also ...".
7. Directions on the invocation (`Notes:`) are decided: list them under "Already decided by you:" and never ask about them.
8. Time spent waiting for the operator counts toward no time limit in your brief.
9. Web. The operator may allow web checks in this session ("check it on the web", "search for it"). That is `Web: on` for the facts they name, only if your harness has a web tool; START-HERE rule 10 is otherwise unchanged. Prefer primary sources (the paper, an official body) over secondary ones, and say which you have. Log one line per fact: the claim, the source (title, year, URL), confirmed or not, and "web check, authorised by the operator, Stage <S>". A fact that stays unconfirmed is quoted as "the textbook reports ...".
10. A multiple-choice question tool, if your harness has one, may carry the questions. The steer file still gets the full message.

## Steer file

Path: `courses/<Bundle>/steer/<stage>-<target>.md`: `1b-bundle.md`, `1b-part-02.md`, `2-L02.md`, `2-L02S04.md` (an `Only:` top-up), `3-L02-RampScene.md`, `B1-bank.md`.

```
# Steer - Stage <S> - <target>
Model: <name>
Asked: <date -u +%FT%TZ>
## Proposal
<the message, as sent>
## Answer 1
<the reply, verbatim>
## Proposal 2           <- only after a follow-up or a "show me more"
## Answer 2
## Decision
<the restated decision, as confirmed>
Confirmed: <date -u +%FT%TZ>    <- async: "Answered: <the answer's heading>" instead
```

Only these headings. Append only; never edit an earlier section. A re-run appends the next `## Answer N` and a new `## Decision`. The latest `## Decision` holds.

## Async (`Interactive: async`)

No one is in the session. The steer file is the conversation.
- No steer file, or it ends in a proposal you have not seen answered: write the proposal (step 2.2), add `Status: waiting for the operator` as its last line, report "waiting for your choice: steer/<file>", and stop. Write none of the stage's outputs; log nothing.
- It ends in `## Answer N` (the operator writes it by hand): there is no step 5. The answer still leaves a choice open: follow-up `## Proposal N`, the Status line, stop. Otherwise write `## Decision` with every default you take spelled out and `Answered: Answer N`, then step 6. Log "operator answers async".

## Stage 1b checkpoint

Message, in this order:

1. What the source covers: the main ideas in source order, at most 10 lines, with page, section or slide refs. Flag anything unclear, badly scanned or out of order. Counts come from commands.
2. Where learners are likely to get lost or lose interest: 3-5 lines, your idea for each.
3. Three course plans, each a different shape from `docs/course-shapes.md` (read it; three shapes, not three versions of one). At least one plays it straight and one is more playful, within what the look allows. For each plan:
   - the shape, the order of ideas and why that order;
   - the lessons: count, then one line each with its job and its opening hook (a true, specific reason to learn it, paid off by the end);
   - the main misconception each lesson tackles;
   - what the learner does in each lesson, tagged (rule 6), with a `Kit:` line;
   - what you would cut or merge;
   - cost (about how many simulations) and the main risk.
4. Your pick, and one reason.
5. Up to 5 questions whose answers would change the plan, each with a default. Pick from this list the ones that matter here; skip what COURSE-BRIEF.md or the invocation already answers:
   - Who are the learners, and what do they already know? (school: class; college: course and year)
   - How will they use it: beside your classes, before them, for revision, or on its own?
   - Must it follow your syllabus or exam order, or may it reorder for understanding?
   - How long should one lesson take? [15-20 minutes]
   - Real data and cases, or made-up numbers that are easier to work with? Any dataset or case you want used?
   - Depth or coverage: which parts matter most, which can stay light?
   - How playful: serious and direct, some puzzles and guess-first questions, "what if" questions where they change one thing and see what follows, or games where they fit (say what the look allows)?
   - How much practice: a check question now and then, or many, woven into the story?
   - Your own material: keep your terms and phrasing, or rewrite freely? (only when `bundle.json` says the source is the author's own)

After (step 6):
- `COURSE-BRIEF.md` (create it if absent, else append): `## Decisions (operator, Stage 1b, <date>)`, one line each: shape, learners, use, order rule, lesson length, data rule, depth, playfulness, practice, wording, then the operator's own aims in their words. Stage 2 reads this file.
- OUTLINE.md: `Strategy: <shape> - <one line>` right after the `Look:` line.
- The operator wants a different look or audience for this course: change nothing for it; stop before writing OUTLINE.md and tell them: "set it with start.mjs or bundle.json, then run Stage 1b again" (your answers are kept in the steer file).
- Log one line: the shape chosen, "answers in steer/1b-bundle.md".

## Stage 2 checkpoint

Before you write any file of the lesson, send:

1. The lesson plan: one line per slide from OUTLINE.md and COURSE-BRIEF.md: number, what it does, what the learner sees (interactive, picture, or text only), and where the practice questions go.
2. For up to 3 key slides (the `Only:` slides, else the ones where the picture carries the idea): 2-3 ways to show it, your pick first. For each: what the learner sees, what they do, what it makes clear, the tag (rule 6), a `Kit:` line, and the cost (new simulation, reuse of one, or a still figure). Options may be combined: say so if two fit together.
3. Up to 3 questions with defaults. Ask about practice (how many, where) and "what if" moments unless COURSE-BRIEF.md already answers them; then an example or dataset to use, slides to cut or merge, anything the outline leaves open.

After (step 6):
- A chosen visual goes into that slide's stub, as a header line: `Operator choice: <the option in one line> (operator, Stage 2; a direction: build this, put a conflict under ## Requests)`. A slide with no stub (a still figure or an image): follow the choice in its block.
- A choice that changes the outline (a cut, a merge, added questions): follow it and log it as "operator, Stage 2".
- Log one line: "answers in steer/2-<L0N>.md".

## Stage 3 checkpoint (one scene; build pass or a one-run build)

Do the brief's reading and write the design note's header, `## Decisions` so far, `## Layout` and the beats table. No code yet. Then send:

1. What the learner will see and do, beat by beat, in plain words: at most 8 lines.
2. A wireframe of the main state: ASCII, at most 16 lines by 60 columns, zones labelled.
3. At most 2 other ways to show the main idea, each in 2-3 lines with its tag (rule 6) and what it changes; your pick first. Keep within the stub's `Operator choice:` line if it has one: then the options vary only the layout and what is operated, not the idea.
4. Up to 3 questions with defaults: which number is shown, what the learner operates, labels and wording on screen.

After (step 6): add `operator: <the decision, one line each>` lines under the note's `## Decisions`, change the Layout and beats to match, log nothing extra (the close writes the log), then build as the brief says.

`Alternative: n12` on the invocation: the operator saw the built scene and asked for another way to show it (note n12 in `courses/<Bundle>/review-notes.json`). Before the checkpoint copy the old `<Scene>.design.md` and `<Scene>.js` to `build/scratch/<Bundle>/old/`. Offer 2 new concepts that answer the note, plus "keep the current one and fix only what the note says" as the last option. The note itself is not a spec: ask what they disliked if it does not say. Then write a fresh design note (the old one stays in scratch) and build. The close (`scene-pass.mjs ... end build`, or `log-stage3.mjs` in a one-run build) gets `--notes n12`.

## Stage B1 checkpoint

Before writing BANK-PLAN.md, send:

1. The topics found, one line each with its source pages, and the planned count per topic.
2. The proposed mix: question types in plain words with counts ("about 30 one-answer questions, 12 short written answers, 6 problems with numbers"), and the difficulty spread.
3. Up to 4 questions with defaults: the exam pattern (marks per question type, long answers), the weight of numerical problems, topics to stress or leave light, real data or made-up numbers.

After (step 6): BANK-PLAN.md opens with `## Decisions (operator, Stage B1, <date>)`, one line each, before the matrix. Log one line: "answers in steer/B1-bank.md".
