# Playbook: Chapter Source -> Published Lesson Content

Procedure for turning a raw textbook chapter into this repo's format. Follow in order; each step's output is the next step's input.

Running this as several separate fresh-context agent runs instead of one continuous session: see `docs/staged-generation.md`, which maps these steps onto 3 passes with hard stop points.

## The `build/` directory

Intermediate, uncommitted output goes under repo-root `build/`, never `courses/`: `build/rasterized-pdf/` (step 1), `build/scratch/` for one-off helper scripts (`tools/` is for reusable checked-in tooling instead), `build/scratch/logs/` for tool run logs - check before re-running anything.

## Keep a running generation log

Start `courses/<bundle>/GENERATION-LOG.md` before step 1, update it through every step - not written after the fact. Not published content (no `blockRef`, no `ai-draft` status). Its only reader is a human reviewer or a follow-up agent trying to work out what you actually did.

Keep it terse - scannable decision points, not prose:
- **Source handling**: PDF pages actually visually inspected (rasterized + viewed, step 1) vs. text-conversion alone. Any figure you couldn't confidently interpret.
- **Simulation vs. image exceptions**: slides that skipped a simulation, and why.
- **Anything flagged rather than guessed**: an unclear figure, an ambiguous sequencing call, an uncovered content type.

See `examples/GENERATION-LOG.md` for the shape - one-line entries, not a report.

## 1. Read the source, don't transcribe it

Read the chapter end to end. Identify the core concept, the textbook's own worked examples/numbers (for question design, not lesson prose - see `docs/copyright-and-sourcing.md`), and misconceptions a POE prediction step could surface.

**Source kinds.** The source may be a textbook chapter or the author's own material; the steps are the same.
- PDF (textbook, exported slides, typeset notes): as below.
- PPTX, ODP, DOCX: convert to PDF first (`soffice --headless --convert-to pdf --outdir build/source <file>` if LibreOffice is installed; else ask the operator for a PDF export), then as below. Speaker notes are source text: export them too (a notes-page PDF) or log that they were not read. One slide = one page; `(p.N)` is the slide number.
- Markdown or plain-text notes: read them directly, no rasterizing; open each image file they embed or link and describe it in `FIGURES.md` like a figure.
- Several files (slides plus notes plus a reading): list each in the log; FIGURES.md labels name the file (`week-2-slides, slide 12`).
- `bundle.json` `"sourceOwned": true` marks the author's own material: see `docs/copyright-and-sourcing.md` for what that allows.

**If the source is a PDF, don't trust plain-text extraction to have captured its figures.** Conversion keeps a caption ("Fig 6.1: ...") but drops the figure itself. Minor loss for prose-heavy chapters; a real comprehension gap for geometry, where a diagram often carries information the prose never restates - "find the shaded area" can be unrecoverable from text alone.

**OCR does not fix this** - OCR recovers characters from broken text layers; a figure was never text to begin with.

The fix: rasterize and look directly, no OCR - `tools/rasterize-pdf.sh chapter.pdf` (optional args: dpi, first-page, last-page). Output goes to `build/rasterized-pdf/chapter/page-N.png`; check there first, it may already exist from an earlier pass. If your model can view images, View() the pages with figures you need. Log which pages you inspected vs. relied on text alone for (see above), and - REQUIRED every time, not just when something seems load-bearing - write what you saw to `courses/<bundle>/FIGURES.md` (format and rationale: `AGENTS.md` rule 8, worked example: `examples/FIGURES.md`), even if that just means the file says "no load-bearing figures." This is the only pass with eyes on the image; a later pass (or, in staged generation, a later stage's fresh session) works from that note instead of reopening the page. If no text-extraction tool is available at all (no `pdftotext`, no PDF-reading library) and you're reading every page purely by viewing the rasterization, `FIGURES.md`'s job broadens to cover load-bearing facts/numbers from those pages too, not just diagrams - everything a later pass would otherwise need vision to recover.

If you genuinely can't view images, fall back to caption + surrounding prose. If a load-bearing figure's layout still isn't clear from either, say so explicitly rather than inventing plausible geometry (see `docs/copyright-and-sourcing.md` - any diagram you do produce must be original, never a reproduction).

**Running this step and step 2 as separate agent runs, possibly on different models:** see `docs/staged-generation.md`'s Stage 1a/Stage 1b split. A model that's genuinely strong at reading a page image is not necessarily the model you'd trust with module-level pedagogy design, and vice versa - the two steps below don't have to run on the same model just because they're numbered consecutively here.

## 2. Draft a lesson outline

For each distinct topic/concept, sketch a beat-by-beat outline (a working markdown file, not published content): hook/question, prediction, explanation, worked example. One lesson per topic is the usual granularity; split further if a topic is too big for one file.

**Scope from the source chapter's own section headings/table of contents**, not an external taxonomy - cover everything the chapter actually contains. Where a slide depends on a figure you logged in `FIGURES.md`, point at it by label so a later pass can find it without re-reading the source.

Decide simulation vs. static image **now**, per slide, not ad hoc while writing block files (step 3). Default to a simulation; fall back to an image only when a specific picture genuinely conveys the concept better. A slide with neither is the exception to justify. Every scene passes the necessity test (`docs/pedagogy.md` "Earn every scene"): a `Shows:` and a `Without it:` line on its slide; both weak means Text only with one emphasis device (`docs/numericals.md`). Under `plain` or a college audience Text only is normal and the default for a slide whose idea is a sentence or a number.

Check the whole outline end to end for forward-references - a slide that only makes sense once a *later* lesson's idea has been introduced (`AGENTS.md` hard rule 7) - while it's still a few bullet points, not after 40 files exist.

## 3. Write the block files

One file per beat, under `blocks/L0N/blk-lNN-sMM.json` (zero-padded 2-digit slide number - `s01`, not `s1`; see SKILL.md's numbering rule). `content-block@1` for prose, `poe-predict@1`/`poe-explain@1` for a predict/explain pair. Write the beat's prose into the sibling `blk-lNN-sMM.md` file and point the JSON at it with `markdownRef`/`promptRef` - this is the default (SKILL.md's "Prose in a sibling .md file" section), not an occasional shortcut; the JSON itself should carry no more than a trivial one-liner inline, if that. See SKILL.md for field shapes, `examples/blocks/` for worked examples, `docs/voice-and-tone.md` for prose voice. Every block gets `"authoring": { "status": "ai-draft" }`.

If a predict step defers its verdict to a later block, read SKILL.md's `deferVerdict` handoff section first.

Optional, plain look only: `"fold": { "after": N }` on a `content-block@1` steps the first N beats and puts the rest behind one closed "Read more" (its first heading is the label). Fold only secondary beats (asides, source notes, encouragement), never one the next question or slide needs.

## 4. Write the question files

One file per question, under `questions/L0N/q-lNN-sMM.json` (same zero-padding rule as blocks). Numbers, units, rates, tolerance and data tables: `docs/question-bank-generation.md` sections 3.4 and 8.1 (they hold for lesson questions too). Favor types you have a worked example for (`mcq-single@2`, `numeric-value@1`) unless the content calls for another. Do this *before* the lesson file - see step 5.

## 5. Write the lesson file

`lessons/les-NN.json`, referencing every block **and every question** via `blockRef`, in student-facing order - a question is wired in exactly like a block, pointing into `questions/` instead of `blocks/`. See `examples/example-lesson.json`'s 4th `blocks[]` entry.

Do this last, after blocks and questions exist - writing the lesson first and questions "for later" is how a question ends up authored, valid, and never referenced (a silent failure with no per-file error). The lesson-level validator run (step 7) checks for this, but the step order prevents it outright.

## 6. Write the module file

`modules/<bundle>.json` - ties the chapter's lessons together, per `examples/example-module.json`'s shape. In particular `type: "module"`, never `"module@1"` (`AGENTS.md` hard rule 1) - a typo'd type validates clean at the lesson/block/question level while making the bundle invisible wherever the app assembles content from modules.

Optional course map (plain look's module page): per `lessons[]` entry `question` {en} (the question the lesson answers), `misconception` {en} (the usual mistake and its fix, one or two sentences; shown after "Common mistake:"), `keyNumbers` [{ `value`: "13.2", `label`: {en} }] (1-3 through-line figures); module-level `keyNumbersLabel` {en} heads the figures column (say "illustrative" when they are).

## 7. Validate everything

```
for f in courses/<bundle>/lessons/*.json courses/<bundle>/questions/*/*.json courses/<bundle>/modules/*.json; do
  node validators/validate.mjs "$f"
done
```
Fix every error. Don't drop the `modules/*.json` glob - it's the only check on `moduleId`/`lessons`, and a typo'd `type` makes that file misclassify as "unknown" instead of failing with the specific error.

The validator only checks structure - it can't catch a forward-referenced idea or a run of slides with no simulation/image. Re-read the finished sequence once for both before calling the batch done.

## 8. Export the bundle

```
node tools/export-course.mjs <bundle> <dest-dir>
```
Copies the bundle to `<dest-dir>`, generating `manifest.json` there. Safe to re-run on a later pass (e.g. after revisiting a chapter for a missed diagram) - it merges into whatever's already at `<dest-dir>` rather than overwriting it, protecting things like a human's `human-approved` review or an authoring-app-added `subject`/`grade`. See the script's own header comment for the exact merge rules. It never commits - that, and human review, happen after.
