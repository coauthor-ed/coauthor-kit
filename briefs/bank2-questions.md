# Stage B2 - Write one batch of bank questions

Target: the question ids in the invocation's `Target:` (one batch from BANK-PLAN.md's `## Question list`; never a topic split across batches). Output: `courses/<Bundle>/questions/bank/<id>.json` for each, plus `explanations/bank/*.json` for every `hard`/`olympiad` one.

## Read

1. `AGENTS.md`, `docs/question-bank-generation.md`, `docs/voice-and-tone.md`, `docs/pedagogy.md`, `.agents/skills/content-authoring/SKILL.md` and `docs/copyright-and-sourcing.md`, in full. School audience: also `docs/descriptive-questions-and-cbse-marks.md` in full. Other audiences: only its rubric-mechanics sections (the bundle carries them; the audience card item on descriptive questions replaces its CBSE mark bands).
2. Not `docs/simulation-authoring.md` (SKILL.md's "Question explanations backed by real slides" covers explanation slides), unless one worked solution truly needs a new scene.
3. BANK-PLAN.md's header and scope; for a `comprehension-set@1` in your batch, its `## Comprehension sets` entry (the committed sub-item types and weights are binding).
4. Only the FIGURES.md entries your topics use: `node tools/doc-section.mjs courses/<Bundle>/FIGURES.md "<label>"`.

## Write-scope

The files for the listed ids, their explanation slides, GENERATION-LOG.md (olympiad searches), `build/`. No other planned question, no bank index, nothing on the lesson track.

## Procedure

1. Each question sourced from the chapter (FIGURES.md, the source text), never from a lesson's slides. `difficulty` as planned, a `topicId` at the bundle's granularity, `estimatedTimeSec` from the doc's table.
2. Every `hard`/`olympiad` question gets a step-by-step `explanationSlide` under `explanations/bank/` (`explanation` alone fails validation). Every `olympiad` question: calibrate from the source and kit docs; web search only if the invocation has `Web: on` (never to copy), logged in GENERATION-LOG.md.
3. Write all the listed ids in this run; a fresh context is not a reason to stop early.
4. Validate: `node validators/validate.mjs courses/<Bundle>/questions/bank/*.json courses/<Bundle>/explanations/bank/*.json`. Fix every error.

Report (START-HERE.md section 3) plus: which listed ids were written (name any left and why), and for each olympiad question what was searched and how yours differs.
