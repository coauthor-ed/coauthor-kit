# Stage 1a - Source scan: write FIGURES.md

Target: the source file in the invocation's `Source:` (a textbook chapter PDF, or an author's slides, notes, PPTX or DOCX: Procedure step 1). Output: `courses/<Bundle>/FIGURES.md` and the first section of `courses/<Bundle>/GENERATION-LOG.md`.

Why this is its own stage: it wants a model that reads images well. Stage 1b (the outline) may run on a model that cannot see images at all, and it never opens the source's pictures. Everything a later stage needs from a figure must be in FIGURES.md, in words, when you stop.

## Read

1. `AGENTS.md` rule 8 (FIGURES.md / GENERATION-LOG.md), if your harness has not already loaded AGENTS.md.
2. `node tools/doc-section.mjs docs/generation-playbook.md "1. Read the source"` and `"Keep a running generation log"`.
3. `examples/FIGURES.md` (shape; its Used by lines show the Stage 1b backfill - yours say `TBD`).

## Write-scope

`courses/<Bundle>/FIGURES.md`, `courses/<Bundle>/GENERATION-LOG.md`, anything under `build/`, and a draft subject pack (Subject pack, below). Nothing else: no OUTLINE.md, no lessons/, blocks/, questions/, modules/, simulations/.

## Procedure

1. Text first: if `pdftotext` works, convert the chapter (`pdftotext -layout <pdf> courses/<Bundle>/source/<stem>.txt`) and read it end to end. Then rasterize: `tools/rasterize-pdf.sh <pdf>`. Other source kinds: playbook step 1, "Source kinds". A slide deck's label for a figure is `Slide N` when the slide prints none.
2. View every page that has a figure, diagram, graph, table or photo. One page at a time: view it, write its FIGURES.md entries at once, then move on. Do not collect many pages in context and describe them later, and do not re-open a page you have described except to crop a detail.
3. An entry per load-bearing figure (a later slide's content could depend on it), in exactly this form:
   ```
   ## <source's own label, e.g. Fig. 3.1> (p.<page>) - <short description>
   - Used by: TBD
   - Inspected: rasterized + viewed directly | caption/text only
   - Description: layout, geometry, labelled parts, axes/ticks, curve shape, the ORDER
     of labelled points along a curve or axis (say which comes first and next), data
     shown. Enough that a reader who never sees the image can design from it.
   - Numbers/values (if a worked example or data figure): the source's own numbers,
     for question design only.
   ```
   A source without page numbers: `(Section N)` or `(slide N)` in place of `(p.<page>)`.
   Two entries with the same label (two "Portrait" boxes): the page number tells them apart; keep it.
   Geography: a photo of a real place or event also gets `- Real photo: <place, event>; source/licence candidate: <e.g. Wikimedia Commons search term> | none found` (Stage 1b then chooses image vs scene). Maps: note whether India's border is shown (scenes redraw it only from the Survey of India layer).
4. No text-extraction tool at all (you read pages only as images): FIGURES.md also carries the load-bearing facts, numbers and definitions from those pages - Stage 1b has no other way to get them.
5. Log under `## Stage 1a - Source scan` in GENERATION-LOG.md: `Model:` line, pages viewed vs text-only, figures you found unclear (they still get an entry saying what is unclear). Terse.
6. Check: `node tools/staged-generation/figures-lint.mjs <Bundle> --stage 1a` until PASS. Quote its counts in the report.

## Scope rules (Stage 1b cannot check your reading against the image - a mistake here spreads silently)

`bundle.json` `"sourceOwned": true` (the author's own material): the author's definitions, terms and short captions may be quoted where their wording should be kept; mark each `[author's wording]`. Material the author took from others (a published figure, a dataset) is not owned: its entry adds `- Credit: <author, year, title, table or figure, licence>`.

- Describe what the figure SHOWS. Short on-figure labels ("Fulcrum", "F1") may be quoted; captions, definitions and body prose may not - your own words.
- Do not restate the chapter's derivations or worked solutions (Stage 1b reads the text). Record a worked example's numbers only when a figure carries them.
- Do not solve exercises, fill blank table cells, or add formulas the source does not print. Anything you computed or inferred is tagged `[derived]`.
- A "textbook error" flag drives design downstream. Raise one only after enlarging the region (`tools/crop-page.sh <pdf> <page> <x%> <y%> <w%> <h%>`), and write it as `- Flag (unverified - needs human check): what you see (positions/values quoted) vs what the text says`. If your reading of the layout could be the cause, say so.

## Subject pack (non-school audience only; school: skip)

The prompt names no `Subject pack:` (from `bundle.json` `subjectPack`, else a `packs/subject/<slug of subject>/` folder), or names one whose CARD.md is missing: write `packs/subject/<id>/CARD.md` (id: the named pack, else the slug of `subject`) from the source, in the template of `packs/subject/README.md`, with `Status: DRAFT` on its second line. Then stop after the Done items below and ask the operator, in the report, to review the card before Stage 1b. A pack that exists, or a subject with no field conventions worth a card (say why in the log): nothing to draft.

## Done means

- [ ] FIGURES.md exists (even if it says "no load-bearing figures in this chapter") and figures-lint PASSES with `--stage 1a`.
- [ ] Every figure page was viewed; every entry says `Used by: TBD`.
- [ ] GENERATION-LOG.md has the `## Stage 1a - Source scan` section with its `Model:` line.

Report (START-HERE.md section 3) plus: number of entries and flags (from figures-lint), pages viewed vs text-only, figures you found unclear.
