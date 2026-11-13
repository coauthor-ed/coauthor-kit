# Stage B1 - Question bank plan: write BANK-PLAN.md

Target: one bank for the bundle. Source: the invocation's `Source:` (one or more chapters). Output: `courses/<Bundle>/BANK-PLAN.md` (plus FIGURES.md and GENERATION-LOG.md if no earlier pass wrote them). The bank track is independent of the lesson track: never read or write lessons/, blocks/ or simulations/.

## Read

1. `AGENTS.md` (skip if your harness already loaded it), then `docs/question-bank-generation.md` in full.
2. English / language-arts: that doc's section 9 IN FULL before planning; it replaces the type pool and changes what topicId means.
3. `courses/<Bundle>/FIGURES.md` if it exists: reuse it, do not re-inspect the source. If it does not exist, do the doc's Source step yourself (rasterize, view figure pages one at a time, write FIGURES.md in the format of `briefs/stage1a-source-scan.md`).

## Write-scope

`BANK-PLAN.md`, `FIGURES.md` and `GENERATION-LOG.md` (only when you did the source inspection), `build/`. No question JSON, no explanations, no bank index, no questions/bank/, explanations/bank/ or banks/ directories yet.

## Procedure (the doc's Plan step only)

1. List every source chapter feeding the bank; the floor/spread rules apply per topic across all of them.
2. One coverage matrix (topic x type counts x difficulty counts) before any question line: floor >= 6 per topic, spread >= 3 types per topic, no type over ~40% of the bank, `olympiad` only where a topic warrants it. `comprehension-set@1` is not in the matrix (step 3).
3. Any `comprehension-set@1`: a separate `## Comprehension sets` list sized by distinct passages/extracts/sources that give real depth (section 8), each with its sub-items' type and weight committed now (e.g. `mcq-single@2 x3 (1 mark each), semantic-descriptive@1 x2 (2 marks each)`). English: section 9's minimums. Each entry still gets its own Question list line.
4. `## Question list`, one line per planned question, exactly `- <id> - <type> - <topicId> - <difficulty>` (e.g. `- q-bank-014 - mcq-single@2 - photosynthesis-inputs - medium`). One topic's questions contiguous (Stage B2 batches by topic run). Matches the matrix row for row; no extra tables restating its totals.
5. Log under `## Stage B1 - Bank plan` with a `Model:` line.

Report (START-HERE.md section 3) plus: per-topic counts (flag any topic just at the floor), the type distribution (flag any type over ~40%), olympiad questions and why, the Comprehension sets list (flag "one per topic" sizing or a single repeated sub-item type), and anything too terse for a B2 agent working from one line. English banks: all five `writing-*` genres present, and the Reading/Writing/Grammar/Literature counts against section 9.
