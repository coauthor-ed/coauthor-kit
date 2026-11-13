# Stage R - Critique one lesson (you edit nothing)

If profile.json (or the prompt) names a non-default audience, look or a subject pack, read those cards first; they override this brief.

Invocation: `Read START-HERE.md and follow it. Stage: R. Bundle: X. Scope: L02. Check: facts | pedagogy | answers. [Web: on]`
Target: one lesson. Output: review notes only, through `node tools/note.mjs` (the operator accepts or rejects each). Write-scope: none: no content file, no log, no scene. A second, different model reads the lesson than the one that wrote it.

Read first: `node tools/where.mjs <Scope> --bundle X` lists the files; read the lesson's prose `.md` files and question JSON in order (not scene code).

## Check: facts
For each claim a learner would take as true (a number, a unit, a definition, a name, a date, a causal statement): `node tools/find-source.mjs "<claim terms>" --bundle X`. Source agrees: no note. Source disagrees or the claim goes beyond the source: note with the page. Not found: note `unverified`, kind `fact`. A computed number (a rate, a ratio, a total, a converted unit): recompute it from the stated inputs and check its unit and denominator. Web search only with `Web: on` in the invocation, and then every search is logged: `node tools/log.mjs add --bundle X --stage R --lesson L02 --model "<name>" "query: ...; url: ..."`.

## Check: pedagogy
Sequencing (a slide that needs a later lesson's idea), age level (CBSE class from `bundle.json`; a non-school audience: its card's reader), voice (`docs/voice-and-tone.md`, read by section; flag idiom, figurative or literary wording the reader must decode (school: a second-language class 9-12 reader), teasing, and staccato runs, kind `language`), one concept per slide, questions that test the slide just taught, scene necessity (a scene that shows nothing text could not, `docs/pedagogy.md` "Earn every scene"; plain or college: decoration, a key sentence buried in a paragraph, a number stated not worked, a control that does not look actionable, game wording; `docs/numericals.md`), and explanations cut so short a first-time learner cannot follow. One note per problem, kind `pedagogy` or `language`.

## Check: answers
`node tools/blind-solve.mjs show --bundle X --lesson L02`, solve every question yourself from the stem alone, write your answers into `build/scratch/X/blind-answers.json` BEFORE `node tools/blind-solve.mjs grade --bundle X --lesson L02 --answers @build/scratch/X/blind-answers.json`. It files a note per mismatch. For each mismatch say in your report which side you think is wrong and why. Question types it skips: list them; read their keys by eye and note any error.

## Notes
`node tools/note.mjs --bundle X --scope L02S03 --kind fact|pedagogy|language|bug|other [--beat N] "<what is wrong and the evidence>"`. Scope `L02S03` = 3rd entry of the lesson's blocks. A note states the problem and the evidence, not a rewrite. No praise notes. Do not duplicate: one note per distinct problem.

## Report
Check run, notes filed (count by kind), what you could not check. Do not run git. Do not run anything in `tools/operator/`.
