# Writing-Skill Questions and semantic-descriptive@2

`semantic-descriptive@2` is the **primary type for CBSE writing-skill tasks**
(notice, formal/informal letter, dialogue, descriptive paragraph) - plan for
it from the bank-plan stage, not as a fallback from `@1`. Read this before
writing any `semantic-descriptive@2` question; `docs/descriptive-questions-
and-cbse-marks.md` still governs `@1` and stays the right doc for pure
content-recall descriptive answers (social studies, or a CBSE 2/3/5-mark
"explain"/"state" question in any subject).

## Why this isn't just `@1`

A CBSE writing task's marking scheme splits into Format, Content, and
Expression. `@1`'s embedding-similarity `rubric[]` is built for Content
only:

- **Format** ("has a NOTICE heading", "has a date") is a structural fact,
  not a proposition an embedder can match - needs a cheap regex presence
  check instead.
- **Word limit** is a hard constraint every task carries and `@1` doesn't
  track it at all.
- **Expression/grammar/language quality** can't be auto-graded here (no
  backend LLM - zero-backend PWA); every option below leaves it ungraded,
  see "Expression is never auto-scored" below.

`semantic-descriptive@2` is a strict superset of `@1`: `wordLimit` and
`formatChecks[]` are optional, `rubric` may be empty - a question setting
neither new field behaves exactly like `@1`.

## Sizing `wordLimit`

Copy the task's own stated limit into `{ min, max }`. A 50-word notice:
`{ "min": 40, "max": 60 }` - a real band, not a single number.

Scoring (informational, the plugin handles it): full credit inside
`[min, max]`, falling off linearly outside it to zero at 40% of `max` past
the nearest edge (min 5 words) - e.g. for 40-60 that's 24 words: a 75-word
answer still earns partial credit, a 95-word answer doesn't. Don't
hand-author a different curve per question.

## Sizing `formatChecks`

One entry per structural element the genre's real CBSE marking scheme
actually checks. `pattern` is a JS regex (string, matched case-insensitively
by default via `flags: "i"` - set `flags: ""` for a case-sensitive check
like a literal heading word). Keep each check to one element; don't fold
"has a heading AND a date" into one pattern - that's two rubric points, not
one, so the format checklist shown to the student after grading actually
tells them which part they missed.

Genre reference (adapt the specific accepted words/format to the question,
don't copy these verbatim into every notice regardless of who's issuing it):

| Genre | Typical `formatChecks[]` |
|---|---|
| Notice | heading (`\bNOTICE\b`, `flags: ""`), a date (`\b(19\|20)\d{2}\b`), issuer name + designation (`\b(secretary\|convenor\|monitor\|captain)\b`) |
| Formal letter | sender/receiver address block presence (a line with a comma, e.g. `,\s*\n`), a salutation (`\b(dear|respected)\b`), a subject line (`\bsubject\b`), a formal closing (`\b(yours faithfully\|yours sincerely)\b`) |
| Informal letter | a salutation (`\b(dear|hi|hello)\b`), a closing (`\b(love\|yours\|regards)\b`) |
| Dialogue | at least two distinct speaker labels followed by a colon (`^[A-Z][a-z]+\s*:`, `flags: "m"`) - a real two-way exchange, not one monologue |
| Descriptive paragraph | usually none - a paragraph has no fixed structural skeleton to check; lean on `rubric[]`/`wordLimit` alone |

A pattern that fails to compile (typo) never crashes grading - it just
never matches, scoring that one check zero. Preview the question in the
real app once to confirm each check actually fires against a correct
sample answer before trusting it in a bank.

## `rubric` - the content dimension

Unchanged from `@1`'s mechanism, but CBSE writing prompts almost always
hand you the content checklist directly, so don't invent one:

- A notice/letter prompt spells out what must be included (activities,
  dates, names) - one rubric point per required item, same as any `@1`
  question.
- A descriptive-paragraph prompt often ships a "useful words to use" bank
  (e.g. "lush greenery; rare species; endangered animals; conservation") -
  each is a natural rubric point (`accepted` can include the word itself
  plus close paraphrases).
- A task with genuinely open, student-invented content (which monuments
  they visited, what their dialogue partner says) usually only supports one
  or two rubric points at the *category* level ("names at least one
  specific place/monument"), not per-fact. It is fine, and expected, for
  such a question to lean more on `formatChecks`/`wordLimit` than `rubric`.
- `rubric: []` is valid - a question that's pure format + word limit (rare,
  but e.g. a bare "write a notice in the correct format" drill) skips
  loading the embedding model entirely; see the plugin's own doc comment.

## `weights`

Defaults to `{ format: 1, content: 2, wordLimit: 1 }` if omitted - roughly
mirrors a typical CBSE split where content carries about half the marks.
Override per question only when the task's own marking weight is unusual
(e.g. a pure-format drill: `{ "format": 1, "content": 0, "wordLimit": 1 }` -
setting a weight to 0 rather than omitting the dimension entirely, if you
still want it computed and shown but not counted).

## Expression is never auto-scored

No dimension here grades grammar, vocabulary range, or sentence quality -
that's architectural, not a gap to fix later. `explanation` on a
`semantic-descriptive@2` writing question must therefore hold a **full
exemplar answer** (a real notice/letter/dialogue/paragraph a student could
have written to get full marks), not a one-line fact summary the way a
content-recall `@1` question's `explanation` usually is. After grading, the
student compares their own writing against this exemplar for expression and
style - framed as self-check, never as a missed rubric point. See
`examples/example-question-semantic-descriptive-v2-writing.json`.
