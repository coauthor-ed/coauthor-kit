# REVISE - fix review notes on built content

You were given one line like:

    Read REVISE.md and follow it. Bundle: <Bundle>. Scope: L02,L03. Do: fix these review notes, one by one: ... Notes: n4,n7.

The bundle is `courses/<Bundle>/`. Fix exactly the notes listed, report, and stop. Do not redesign, restyle or "improve" anything a note does not name.

## Rules

1. Rules 1-3 and 5-10 of `START-HERE.md` section 2 apply (no git, write-scope, bounded reading, log only through `log.mjs`, numbers from commands, no web unless `Web: on`, nothing under `tools/operator/`). Read them by section: `node tools/doc-section.mjs START-HERE.md "Rules for every stage"`.
2. Never write `"human-approved"` into any `authoring.status`. Edited content that was `human-approved` keeps its status; say in the report which approved items you changed so the operator can re-approve.
3. A note is a human's observation, not a spec: it says what looked wrong, not how to fix it. Read the evidence it gives (scope, beat, theme, viewport), find the cause, make the smallest change that fixes it.
4. A note you disagree with, cannot reproduce, or cannot fix: change nothing for it and do not mark it done. Say why in the report.
5. `Notes:` lists every id in this run. A direction among them steers generation, not revision: ignore it.

## Steps

1. **Find the files.** Scope forms: `L02` (lesson), `L02S03` (3rd entry of `lessons/les-02.json` blocks), `L02/SceneName` (scene).
   `node tools/where.mjs <scope> --bundle <Bundle> [--show]` lists every file behind it (slide, block or question, scene, design note, stub). Before editing a helper under `simulations/shared/`, run `node tools/where.mjs --users <helper.js> --bundle <Bundle>` and recheck every scene it lists.
2. **Read narrowly.** Only the files `where` listed for the notes' scopes. Source facts: `node tools/find-source.mjs "<term>" --bundle <Bundle>`. A fact you cannot confirm from the source is flagged in the report, not changed on a guess.
3. **Fix.** Small edits, all known edits in one turn. Match the surrounding voice (`docs/voice-and-tone.md`, by section, only for a language or pedagogy note).
   - **Text, blocks, questions:** edit the JSON in place. Keep ids, `type@version`, `{ "en": ... }` strings and file layout. After any change recheck that answer key, explanation and hints still agree.
   - **A picture is asked for** (a note says "show a graph", "plot", "draw", "diagram") on a question that has none or only a text description: do not build a scene. Use the `graph` field, `plot-function@1` or a diagram block: `node tools/doc-section.mjs docs/graphing-and-plotting.md "companion field"`. Something the learner should manipulate stays a scene.
   - **Scenes (`L02/Scene`, or a slide that mounts one):** read the scene's `.design.md` first, then edit the scene `.js`. Keep to its Layout, Beats and Numbers; if a note changes one, append the change to the design note. Never change a beat count without changing the attaching slide: `node tools/sim-test/scene-info.mjs <L0N/Scene> --bundle <Bundle>` prints the real count.
   - **Scene look, layout, colour:** tokens only (no `#hex`/`rgb()` in scene code), no `alert()`/`confirm()`, no crypto APIs (`crypto.subtle`, `randomUUID`: the portal is plain HTTP). Do not reuse base-class field names (`_running`, `_hasStarted`, `_rafId`).
   - **Another bundle's scene fits better:** `node tools/find-scene.mjs "<what it shows>"`, then `--use <id> --to <L0N>`. Generic mechanisms only.
   - **Stubs** are build inputs; after Stage 3 the design note and scene are the record. Edit a stub only if a note is about the stub itself.
4. **Check what you touched.** FAIL is fixed; a WARN about what a learner sees is fixed or explained in one line.
   - any JSON: `node validators/validate.mjs <file...>`
   - a lesson's slides or stubs: `node tools/staged-generation/lesson-check.mjs <Bundle> <L0N>`
   - a scene: `node tools/sim-test/ident-lint.mjs <scene.js>`, then `node tools/sim-test/check-scene.mjs <L0N/Scene> --bundle <Bundle>` (1-3 min; `--no-browser --no-probes` only inside a fix loop, never as the final check).
   - a scene's behaviour: if `build/scratch/<Bundle>/<Scene>-tests.json` exists, run it: canvas `node tools/sim-test/run.mjs exec tools/sim-test/drive.mjs <L0N/Scene> --bundle <Bundle> --steps=@<file>`, DOM `node tools/sim-test/drive-dom.mjs <L0N/Scene> --bundle <Bundle> --steps=@<file>`.
   - a visual fix: `node tools/sim-test/shoot.mjs <L0N/Scene> --bundle <Bundle>`; read the text report first, the contact sheet second, both themes, the beat the note names.
   - `check-all` is the operator's, not yours.
5. **Log once per note scope**, with that scope's ids (the only way to write the log):
   `node tools/log.mjs rev --bundle <Bundle> --scope <L02S03> --who "<model>" --what "<what changed and why, one line>" --notes n4,n7`
   `--notes` marks those notes `done`: list only ids you fixed and checked. Add `--sources url,url` if you used `Web: on`.
6. **Report** (last message): model, bundle, scope; per note: id, fixed / not fixed / needs a human, and the file changed; the final PASS/FAIL line of each check you ran; approved items you edited; what you could not verify. Then stop.
