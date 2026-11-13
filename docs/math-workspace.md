# math-workspace@1 - line-by-line maths answers

Student writes maths; each line is checked against the line above by the engine's math core. Use for algebra/calculus/trig working where the steps matter. Not for numeric-only answers (`numeric-value@1`) or worded proofs (`semantic-descriptive@1`). Shapes: `examples/example-question-math-workspace-*.json`; full bundle: `courses/math-workspace-showcase/` (each `blocks/L01/*.md` ends with an AUTHOR NOTE, and each `questions/L01/*.json` has a `_comment` per item and per part saying what it shows and which fields matter; read them before copying an item).

## Item fields
- `stem` {en}, markdown + `$...$`. `marks`. `topic`: algebra|quadratics|trig|progressions|binomial|calculus|matrices|vectors|inequalities|coordinate|stats (sets keypad and default visual).
- `mode`: `coach` (move choices shown, Quill coaches), `practice` (default; free typing, moves on request), `assess` (no feedback, no Quill; use in tests).
- `vars` (e.g. `["x"]`, `["theta"]`), optional `assume` (`{"x": ">0"}`) for domain limits.
- `parts[]`: `{ id, shape, label {en}, weight?, visual? }` + shape fields below.
- `cards[]`: `{ id, label {en}, latex }` formula cards; a part lists the ids it may use.
- `explanation` {en}, shown after reveal.

## Which shape
| Need | shape | fields |
|---|---|---|
| One expression (factorise, simplify, integrate) | `expression` | `answer`, `check`, `form[]`, `placeholder`, `hints[]` |
| Working from a start line to a goal | `step-chain` | `start`, `goal`, `milestones[]`, `modelSolution[]`, `moves[][]`, `hints[]`, `cards[]`, `maxSteps` |
| Identity proof | `two-sided` | `lhs`, `rhs`, `modelSolutionRhs[]` + step-chain fields minus start/goal |
| Roots only | `solution-set` | `answer[]`, `allowEmpty`, `hints[]` |
| Inequality answer | `interval` | `answer` in interval notation, `hints[]` |
| Several named values (AP a, d, T_n, S_n) | `slots` | `slots[]: { id, label, answer, check, var? }`, `hints[]` |

## Rules
- All maths is LaTeX in JSON: double every backslash (`"\\frac{1}{2}"`). "or" between solutions is `\\lor`.
- `check`: `equivalent` (default), `upToConstant` (indefinite integrals), `upToScalar` (line/plane/circle equations), `onIntegers` (a formula in `n`, e.g. T_n; set `var`).
- `form` rules (answer must also be in this form): factored, expanded, lowestTerms, rationalisedDenominator, simplestSurd, a+bi, polar, solved-for. Say the required form in the stem or intro.
- `goal`: `{ "latex": "x=2 \\lor x=3" }` or `{ "form": "solved-for", "var": "x", "solutions": ["2","3"] }`.
- `moves[k]` = choices after line k (k=0 after start): `{ label {en}, result, correct, why {en} }`. One correct per step; a wrong choice gets a `why` that names the mistake. Wrong but true moves (valid, unhelpful) are good distractors.
- `hints[]`: every part gets them; Quill gives them in order (strategy, then the template as a pattern). `{ step, strategy {en}, template? }`. `strategy` is plain words; inline maths in `$...$` is fine. `template` uses `\\placeholder{}` blanks. Never write a hint that states the answer.
  - step-chain/two-sided: `step` k = after valid line k. two-sided: no `side` = left side; add `side: "rhs"` hints (and `modelSolutionRhs`) so the right side has clues too.
  - expression/solution-set/interval: no `step`; 2-3 entries, gentlest first. slots: add `slot` to aim a hint at one slot.
- solution-set accepts worked roots: `(3+5)/4 = 2` is checked at every `=`; the last value is the root.
- Solved = checked: when every part reaches its goal the lesson grades the item by itself.
- `milestones[]`: lines worth credit on the way (factorised form, expanded square).
- Strict inequality -> open ends `( )`; check every answer by hand before writing it.
- `visual`: `{ kind, params }`, numbers only (pascal stays hidden until the part is correct: it would show the answer). parabola `{a,b,c}`, unit-circle `{angleDeg}`, sequence `{kind: ap|gp, termLatex, count}`, gauss `{a,d,n}`, pascal `{n,r}`, number-line `{min,max}`. One per part; split a question into parts to show two.
- Showcase-style items: add `_comment` after `type` and after each part's `shape` (see SKILL.md). Plain string, one or two sentences.
- Lesson use: precede each item with a short `content-block@1` that says what kind of working is expected.
