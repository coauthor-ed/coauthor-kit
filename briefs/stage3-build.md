# Stage 3, pass 1 - Build: design note, code, ONE quick check

You are pass 1 of up to 3 fresh agents on this scene: build (you), sanity (only if your quick check fails), verify (tests, check, look, log). You do not test behaviour, run probes, shoot, view scene images or write the log: later passes do. You stop after ONE quick check and hand over through the design note.

Target: one stub, `simulations/L0N/<Scene>.stub.md`. The invocation may add `Helper: <File>.js (not written yet: you write it ...)` or `(exists: import it, do not edit it)`, `Resume:` (your target's files exist: START-HERE rule 8; may name a stale note, see Resume), `Skip: brief item E` (leave out step E of the reading list) and `Targets:` (several stubs of one lesson, owner scenes first: read the docs and guide ONCE, then run the Procedure per scene in order: the owner scene (and its helper) fully handed over first; a decision that holds for the lesson goes in the first note and later notes cite it "as <Scene>"; a scene importing an earlier one reads it via `kit-api.mjs --bundle`; the owner scene writes the shared helper FIRST and small, then runs `ident-lint` on it and a smoke import before scenes 2 and up (smoke import = `node tools/sim-test/drive-dom.mjs <Scene.js> --steps='[{"beat":0}]'`, or `check-scene ... --no-browser --no-probes`): one early check, so a root cause is hit once; draft code in files, not thinking; compute numbers once with a `node -e`; write the first skeleton within 2 turns of the last read).

Output: `simulations/L0N/<Scene>.design.md` (written BEFORE any code), `simulations/L0N/<Scene>.js`, the helper if you are its writer. Write-scope: those, `build/`, scratch and `<Scene>-tests.json` in the repo-root `build/scratch/` (never under `courses/`). Never: block/lesson/question JSON or prose, the stub, another scene, a helper marked "exists", GENERATION-LOG.md. Something looks wrong? One line under `## Requests`.

## Read, in this order (nothing else unless a step sends you)

A. The stub (its `## Verbatim slide markdown` holds the slide prose: do not open the slide files), then `node tools/sim-test/scene-info.mjs L0N/<Scene> --bundle <Bundle>`: the attaching slides, their REAL beat counts, every beat's first words. A stub with `Beat maps:` means one `static BEAT_MAPS` entry per count (check-scene fails a missing one); `Same beats on all slides: yes`: one map serves every slide.
B. `briefs/reference/scene-rules.md` in full, then `briefs/reference/gotchas.md`.
C. `briefs/stage3/INDEX.md`, then the ONE guide it names for your stub's `Base class:` / `Component:` (plus people.md or props.md only if the scene draws people or apparatus). The guide holds the docs to read, the kit API, the example to copy. An arcade stub is a smaller job: `briefs/stage3/arcade.md`, then skip the note template below and build as it says. A stub `Recipes:` line names the motion recipe for a beat: build that beat with it (your guide's `Motion recipes` table has the call and the example) and name it in `Kit use:`.
D. `briefs/reference/kit-parts.md` (what you are about to draw -> the kit part that already does it), then `node tools/sim-test/kit-api.mjs --bundle <Bundle>` (this bundle's helpers: reuse before drawing anything new). Open a helper's source only for the one function you call. One kit function: `kit-api.mjs --sig <name>` (signature, returned keys, import line).
E. A good stub and note, and three images (skip the images if you cannot view them or `Skip: brief item E`): `briefs/showcase/EXAMPLE-stub.md`, `briefs/showcase/EXAMPLE-design-note.md`; `examples/media/quill-look/GOOD-Kudavolai-dark-b0.png`, `examples/media/quill-look/GOOD-BellJar-dark-b1.png`, `briefs/showcase/ANTI-programmer-art-vs-good.png`. View the three images in ONE turn. Plain look (your look card or the prompt says so): two plain images from `packs/look/plain/SHOWCASE.md` (`examples/media/plain-look/`, the anchor nearest your shape) replace the two Quill images.

## Tools (from the repo root; usage with no arguments; never read tool source)

| Tool | What it answers |
|---|---|
| `node tools/sim-test/kit-api.mjs <simulations/base/kit/Module.js> \| --bundle <b> \| --sig <name>` | one line per export of a module, this bundle's helpers, or one export with its return keys |
| `node tools/sim-test/ident-lint.mjs <file>` | undefined names, bad imports, clashing members (seconds) |
| `node tools/sim-test/check-scene.mjs <L0N/Scene> --bundle <b> --no-browser --no-probes` | the quick check: every static gate (seconds) |
| `node tools/staged-generation/scene-pass.mjs --bundle <b> --target L0N/<Scene> progress "<text>"` / `end build --check PASS\|FAIL ["<first failing line>"]` | the hand-over lines in the note |

## Procedure

0. **Limits and Resume.** A stub or slide contradiction: START-HERE rule 9. Put `Started: <date -u +%FT%TZ output>` in the note's header, after `Status:` and `Model:` (the template below; tools find it on any line). At 30 minutes without a drafted scene, build the simplest reading and hand over. No code, full strings or deck text in your thinking: decide in at most 10 lines, then Write the file. Decisions go to the note's `## Decisions`, one line each; never re-derive. A sibling scene built in this run is no precedent: do not read its file. **Resume** with a stale note (no `## Progress`, or no Layout, Beats, Numbers or Tests to run): run `ident-lint` and the quick check on the code that exists (no .js yet: write it from the note), add Progress lines for what exists, APPEND the missing sections (old headings: `Model numbers` = Numbers, a beats table without a heading = Beats), then write the tests file and run `end build`; on a resume ONLY (a fresh build never runs `start build`) first run `scene-pass.mjs --bundle <b> --target L0N/<Scene> start build`: it re-stamps `Started:`, sets Status building so the run counts as in flight, and gives the check runs a fresh budget; do not stamp `Started:` by hand on a resume. Do not rewrite the note or code, do not audit kit source.
1. **Design note first, and make it a handover.** Pass 2 and 3 are fresh agents who start from this note, the stub and your code. Write `<Scene>.design.md` before any code, in the shape of `briefs/showcase/EXAMPLE-design-note.md` (about 6 KB; terse):
   ```
   # <Scene> - design note
   Status: building
   Model: <what you are>
   Started: <date -u +%FT%TZ>
   Writes helper: <File>.js            <- only if the invocation says you write it
   Base class: <class> (<why, from the content's shape>)
   Kit use: <Part> use|extend|differ - <reason>[; ...]  OR  none fits (looked at: <guide>, kit-parts.md)
   ## Progress             <- lines are added by scene-pass.mjs, never by hand
   ## Decisions            <- one line each, with the reason; written the moment you decide; never reopened
   ## Layout               <- zones and what sits in them; no pixel coordinates
   ## Beats                <- | beat | shows (the exact visible state) | learner can -> effect | runs / events | enter() resets |
   ## Numbers              <- the numbers the scene shows, each tagged [slide] [stub] or [derived]; work tables out with a 5-line node -e, never by hand
   ## Deviations from the stub   <- every place you built something other than the stub says, and every contradiction with the reading you took
   ## Celebrate / rest / plausible / not shown
   ## Tests to run         <- a HEADING plus a table (not bullets; `end build` refuses a note without it): one row per stub `Must get right` item: | item | step | expect |  (words, not JSON; the steps go in the tests file, step 4). A scene with a `BEAT_STEP_MAP` also gets a `stage per beat` row: | stage per beat | beat 0..N | each beat that must differ reads a different stage (idx not all equal) |. `open:` lines for what needs eyes; `Resume-ignore:` with a reason if a resume difference is deliberate
   ## Look log             <- empty
   ## Checks explained     <- empty
   ## Requests
   ```
   Then `scene-pass.mjs ... progress "design written"`.
2. **Skeleton.** Copy the example your guide names under "Start from" (a complete scene with every hook). Class, statics (`BEAT_STEP_MAP` with one entry per REAL beat, `ARIA_LABEL`, `CONTROLS`), `enter`, a `draw`/`paint` that paints the backdrop and a stage label. Run `ident-lint` on it. If the stub has `Copy-from: <id>`: run `node tools/find-scene.mjs --use <id> --to L0N` first and adapt that copy instead of starting from an example; adapt it to this stub, do not keep its story or art.
3. **Beats.** Each beat's settled frame (no learner input) must show what that beat's text says; two beats with different texts never settle to the same frame. Build the beats one at a time, in place (edit, do not rewrite the file). `ident-lint` after a group of edits, not after every line. No `shoot`, not even `--peek`: the verify pass looks. Coordinates: a few anchors (ZONES, `heroBox`) and offsets; you do not settle geometry by arithmetic. Then `scene-pass.mjs ... progress "code drafted"`.
4. **One quick check, then hand over. Do not iterate.** Run `ident-lint` once and `check-scene ... --no-browser --no-probes` once. Then exactly one of:
   - both clean: `scene-pass.mjs ... end build --check PASS`
   - anything FAIL: do NOT fix it, the sanity pass does. Write its whole to-do first: `scene-pass.mjs ... progress "diagnosis: <EVERY edit sanity must make, incl. the BEAT_STEP_MAP or stage-hook half of a repair>"`, then `end build --check FAIL "<the first failing line>"`. Sanity is a fresh agent that applies exactly that list.
   A WARN is not a FAIL. TESTS FILE, before `end build`: write `build/scratch/<Bundle>/<Scene>-tests.json` (verify RUNS it): the note's `## Tests to run` rows as drive steps, at most 5 steps per row; ONE flat JSON array (never nested arrays or `{"rows":...}`; a beat-less game, stub `Beats: none`, has no `{"beat":N}` rows: write its steps as one flat list and ignore the rows WARN), a row starts at each `{"beat":N}` (DOM scene, two rows: `[{"beat":0},{"probe":"sc.stage","expect":0},{"beat":2},{"click":"button:has-text(\"Run\")"},{"probe":"sc.checkObjective().ok","expect":true}]`; a canvas scene has no `click`/`set` (drive.mjs rejects them): its second row is `{"beat":2},{"ctrl":["run",true]},{"until":"idle"},{"probe":"sc.checkObjective().ok","expect":true}` or a `{"tap":[x,y]}` step; a boolean expect is `"expect":true`); shape and probe forms: `briefs/reference/probe-cookbook.md` ("Minimal probe template"); an action Must-get-right (drag, tap) needs a click or drag step, not only a `sc.testState()` read; no probe over 120 chars, no layout/width/overlap probe (sim-layout and check-scene do those), scene fields read only `sc.stage` (SimScene) or `sc.stepIndex` (DomSimulation, SvgScene: use it wherever an example says `sc.stage`) / `sc.checkObjective` / `sc.testState()` (override `testState()` to return the plain object of key values the Tests rows need: stage, picked, locked; canvas probes read it as `d.state()`); a probe never stores a counter on `sc`. `expect` is `==`; a regex only as `{"expect":["sel","/re/"]}`; sup text reads as `x2` in textContent; click an SVG hit region by its `[data-region]` element, a button by `button:has-text("..")`. Example (canvas: `ctrl` for `set`/`click`): `[{"beat":0},{"probe":"sc.stage","expect":0},{"beat":2},{"set":["#len",1.2]},{"click":"button:has-text(\"Run\")"},{"until":"idle"},{"expect":["#f","/85\\.7 N/"]}]`. STRICT: never run it (drive-dom or otherwise); verify does. Then `progress "tests file written (not run)"`. With several targets: after the owner scene, write the other scenes' notes and code, then run `ident-lint` and `check-scene` for ALL of them side by side in ONE turn and record each result with its own `scene-pass.mjs` call (a shared root cause is then found once).
4a. **`Review: manual`** (in the invocation): put `Review: manual` on the note's line after `Started:`. Step 4 as written: the tests file is written, never run. A PASS `end build` then sets `Status: review-pending` (no verify, shoot or look: the operator runs the tests); close with the `log-stage3.mjs ... --status review-pending` line it prints. A FAIL goes to sanity as usual.
5. **Report** (one line per scene, nothing else): `BUILD <Scene>: check-quick PASS|FAIL; requests: N; tests file: written (not run); note simulations/L0N/<Scene>.design.md` (N = lines under the note's `## Requests`, 0 if none).

## Rules that matter most

- Colours from tokens (`c.<key>` on canvas, `var(--sim-*)` in SVG/DOM); never a hex, never a new `--sim-*` token.
- Draw what is true; flag what is not.

## Host facts (so you never read source)

The host calls `setup()`, then `onBeatChange(i, count)`, then `start()`. SimScene enters stage 0 inside `setup()` and switches to beat i's stage (from `BEAT_STEP_MAP`) with no time in between; your per-beat change is `enter(stage)`. Each beat change or control grants 8 s of animation budget; SimScene covers pointer events. The loop parks 1.5 s after `busy()` goes false, and not before the 8 s budget runs out.

## Done means

- [ ] Design note written first, in the template, with Decisions, Beats, Numbers, Deviations and Tests to run filled.
- [ ] Scene drafted; ONE quick check run, recorded with `scene-pass.mjs ... end build`; `build/scratch/<Bundle>/<Scene>-tests.json` written, NOT run.
- [ ] No shoot, no probe run, no log. Nothing outside the write-scope changed.
