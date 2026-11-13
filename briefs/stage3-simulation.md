# Stage 3 - One scene: design note, code, checks, look

Target: one stub, `simulations/L0N/<Scene>.stub.md`. The invocation may add `Helper: <File>.js (not written yet: you write it ...)` - then you write that helper too, for this and later scenes - or `(exists: import it, do not edit it)`. It may add `Look: later` (no `shoot` at all, `--peek` included: skip step 5 and the peeks in step 3; close with `Status: look-pending`; a separate 3-look run does all the viewing).

`Review: manual` in the invocation: step 4 writes the tests file `build/scratch/<Bundle>/<Scene>-tests.json` (the cookbook's shape) and never runs it; no step 5, no peeks; ident-lint and check-scene still run and pass; close with `log-stage3.mjs ... --status review-pending` (the operator runs the tests in the preview).

`Resume:` in the invocation: your note or scene exist from a run that died (START-HERE rule 8). `Skip: brief item E`: leave out step E. This one-run brief is used for `--one-pass` runs and arcade stubs; otherwise Stage 3 runs as the 3 passes of `stage3-build.md`, `stage3-sanity.md`, `stage3-verify.md`.

Several targets: the invocation may give `Targets:` (a comma-separated list of stubs of one lesson, owner scenes first) instead of `Target:`. Read the docs and the kit guide ONCE, then run the Procedure for each scene in the order given, one scene finished (design note `done` or `look-pending`, its own check-scene PASS) before the next starts. One design note per scene, written before that scene's code; a decision that holds for the lesson (palette, chip style, a shared function) goes in the first note and later notes cite it ("as <Scene>"). A scene that imports an earlier scene of the list reads that scene's file through `kit-api.mjs --bundle`, not its design note. Close each scene with its own `log-stage3.mjs` call. The 40-minute limit in step 0 and the 2 look rounds are per scene. Report: one PASS line per scene, then each scene's LOG TEXT. If a scene is stuck, set it `look-pending` with the reason under `## Requests`, say so, and carry on with the next.

Output: `simulations/L0N/<Scene>.design.md` (written BEFORE any code), `simulations/L0N/<Scene>.js`, the helper if you are its writer; the log bullet is written by `log-stage3.mjs` at the close (step 6), never by hand.

## Read, in this order (nothing else unless a step sends you)

A. The stub, then `node tools/sim-test/scene-info.mjs L0N/<Scene> --bundle <Bundle>`: the attaching slides, their REAL beat counts and every beat's first words. The slide prose is in the stub's `## Verbatim slide markdown`: do not open the slide files. A stub with `Beat maps:` means one `static BEAT_MAPS` entry per count, built from that slide's own `### <block id>` beat list (check-scene fails a missing count); `Same beats on all slides: yes` means one map serves every slide.
B. `briefs/reference/scene-rules.md` in full (rules learned from real incidents, with bad -> good code), then `briefs/reference/gotchas.md`.
C. `briefs/stage3/INDEX.md`, then the ONE guide it names for your stub's `Base class:` / `Component:` (plus an add-on only if the scene draws people or apparatus). The guide holds the docs to read, the kit API, the example to copy, and the right drive and check commands for that kind of scene. An arcade stub is a different, much smaller job: `briefs/stage3/arcade.md`, then skip the rest of this brief. A stub `Recipes:` line names the motion recipe for a beat: build that beat with it (your guide's `Motion recipes` table has the call and the example) and name it in `Kit use:`.
D. `briefs/reference/kit-parts.md` (one table: what you are about to draw -> the kit part that already does it; check-scene notes a hand-written copy). The helpers this bundle already has: `node tools/sim-test/kit-api.mjs --bundle <Bundle>` (reuse before drawing anything new). Open a helper's source only for the one function you will call.
E. Look at three images before you design: `examples/media/quill-look/GOOD-Kudavolai-dark-b0.png`, `examples/media/quill-look/GOOD-BellJar-dark-b1.png`, `briefs/showcase/ANTI-programmer-art-vs-good.png`. Plain look (your look card or the prompt says so): two plain images from `packs/look/plain/SHOWCASE.md` (`examples/media/plain-look/`, the anchor nearest your shape) replace the two Quill images. (Skip them if you cannot view images; this is not the Look step: `Look: later` does not skip them; it skips every `shoot` run: step 5 and the step 3 peeks.)

## Write-scope

`<Scene>.design.md`, `<Scene>.js`, the helper named in the invocation only when you are its writer, `build/`; GENERATION-LOG.md only through `log-stage3.mjs`, and never read it. Never: block/lesson/question JSON or prose, the stub, another scene, a helper marked "exists". Something there looks wrong? Put it in the design note under `## Requests` and in the report. Scratch files go in `build/scratch/`.

## Tools for this stage (run from the repo root; each prints its usage with no arguments)

| Tool | What it answers |
|---|---|
| `node tools/sim-test/scene-info.mjs <L0N/Scene> --bundle <b>` | what to build: attaching slides, REAL beat counts, beat texts |
| `node tools/sim-test/kit-api.mjs <simulations/base/kit/Module.js> \| --bundle <b>` | one line per export of one module (the guide already lists its modules), or this bundle's helpers |
| `node tools/sim-test/ident-lint.mjs <file>` | undefined names, bad imports, clashing members (seconds) |
| `node tools/sim-test/check-scene.mjs <L0N/Scene> --bundle <b>` | every scene gate in one run (1-3 min; `--no-browser --no-probes` for a quick pass) |
| `node tools/sim-test/shoot.mjs <L0N/Scene> --bundle <b>` | screenshots, contact sheet, real-font text report; `--peek` = dark draft; `--steps` (`shoot --help` lists them): `beat`, `ctrl`, `tap`, `drag`, and for a DOM scene `click`/`set` with a selector |
| `node tools/sim-test/run.mjs exec tools/sim-test/drive.mjs <L0N/Scene> --bundle <b> --recipe smoke` | operate a CANVAS scene headless (dials, taps, clock, state); your own steps are `--steps=@file`, never given together with `--recipe` |
| `node tools/sim-test/drive-dom.mjs <L0N/Scene> --bundle <b> --inputs` then `--steps=@file.json` | the same for a DOM or SVG scene, in a real browser, text only; steps in a JSON file, see the guide |
| `node tools/sim-test/sim-layout.mjs <scene.js>` | a DOM or SVG scene's sizes: the HEIGHT to set, the tallest state |
| `node tools/staged-generation/log-stage3.mjs --bundle <b> --target L0N/<Scene> --model .. --what ..` | the close: log bullet + design-note Status in one command |

## Procedure

0. **Two limits.** (a) The stub or the slides contradict each other ("not taught: arms" yet "arm values on the bar"; two mounts with different beat counts): take the reading closest to the slide's point, give it one line under `## Requests`, and move on: a paragraph of thought, not an hour. (b) Put `Started: <output of date -u +%FT%TZ>` in the note's header, after `Status:` and `Model:`: check-scene and shoot print the minutes since. At 40 without a passing full check, stop refining: build the simplest reading, set `Status: look-pending`, report.
0a. **Hygiene.** Batch independent tool calls in one turn (reads, greps, checks). There is no `execute` tool: use the shell tool. Do not write your own drive harness: the guide names the driver for your scene. A check that prints `HANG: ... Stuck in: <function>` names the loop: fix that function, do not read harness source. Read at most 2 other scenes. Never read a tool's source to learn how it behaves; `<tool> --help` prints its usage.
0b. **Think on paper, not in your head.** Do not count on your earlier reasoning being there at the next step; the note is your memory. (a) Write the note's first lines (Status, Base class, the readings you chose) within your first 10 minutes, then each design decision the moment you make it (`## Decisions`, one line each); never reopen one: read the note instead of re-deriving it (real runs re-worked the same design in 9 to 12 of their first 40 steps, one asking the same button-or-panel question nine times). (b) Any table of numbers (dial stops, balance points, counts, a triangle's angles): a 5-line `node -e`, never by hand. (c) Coordinates: a few anchors (ZONES, `heroBox`) and offsets in code; you settle geometry by LOOKING (`shoot --peek`, below), not by arithmetic in prose. A hedge ("Hmm", "Wait", "Actually") three times on one question means: take the simpler option, note it, move on.
1. **Design note first.** Write `<Scene>.design.md` before any code, from this template (terse; tables and fragments are fine):
   ```
   # <Scene> - design note
   Status: building
   Model: <the invocation's Model:, else what you are>
   Started: <date -u +%FT%TZ>
   Writes helper: <File>.js            <- only if the invocation says you write it
   Base class: SimScene | DomSimulation | SvgScene | ... (<why, from the content's shape>)
   Kit use: <Part> use|extend|differ - <reason>[; ...]  OR  none fits (looked at: <the guide and kit-parts.md>)   <- the parts your guide lists
   Layout: backdrop <kind>; hero <object> in ZONES.hero (~<w> px wide); left card <...>; right card <...>; chips <where>   (zones and what sits in them: no pixel coordinates, the code has those and they go stale after a look round)
   | beat | stage | shows | learner can | runs / events | enter() resets |
   Model numbers: <the numbers the scene shows, the slide's used exactly; at most ~8 lines, no derivations>
   Celebrate: <the moment the concept is found, not when Run is pressed>
   Comes to rest: busy() is true while <...> | CONTINUOUS = true because <motion that never ends>
   Must-get-right tests: <each `Must get right` item -> the step that fails if it is violated, or `open:` if it needs eyes>
   Plausible: <for each process shown: could the real thing do this? one line each>
   Not shown: <ideas the lesson has not taught yet; slide claims you leave out and why>
   ## Decisions           <- one line each, written when made, never reopened
   ## Look log            <- one line per look round; nothing else (a `Look: later` run leaves it empty)
   ## Checks explained     <- one line per WARN you left and why; empty is normal; never restate a passing check
   ## Requests
   ```
   Aim for about 6 KB: a reviewer reads the note and you re-read it as context, so essays cost both. Decisions and reasons, not a transcript. check-scene prints a `note:` line if it is over 12 KB; that is advisory, so leave it: never spend a turn trimming the note, re-running check-scene to see its size, or explaining it (`wc -c` if you want to know).
   If the scene needs a person: `briefs/stage3/people.md`. Design the object first, then add them.
2. **Skeleton.** Copy the example your guide names under "Start from" (a complete scene: every hook, a dial, a button, a drag, the note, one celebration) instead of reading a base class. Class, statics (`BEAT_STEP_MAP` with one entry per REAL beat, `ARIA_LABEL`, `CONTROLS`), `enter`, and a `draw`/`paint` that paints the backdrop and a stage label. Then `node tools/sim-test/ident-lint.mjs <file>` and `node tools/sim-test/check-scene.mjs L0N/<Scene> --bundle <Bundle> --no-browser --no-probes` until PASS.
3. **Beats one at a time.** Each beat's settled frame (no learner input) must show what that beat's text says; two beats with different texts never settle to the same frame (only if the prose deliberately talks over a still picture, add `Beat hold: b2.0-b2.1` to the design note; the 3-slides gate then passes those beats). Build beat k, run `ident-lint` (seconds) after every edit, and the quick check-scene every couple of beats. With `Look: later`: no `shoot`, not even `--peek`; trust `ident-lint`, check-scene and the step 4 tests. Otherwise, after a beat is drawn, SEE it (if you can view images): `node tools/sim-test/shoot.mjs L0N/<Scene> --bundle <Bundle> --peek` (dark theme, your draft, not a look round, at most 3 per scene; unchanged code reprints the last report; the official 2 rounds are untouched). Peek once the whole scene is drawn, or at a hard beat, not after every edit: make all the edits you know of first. A rough drawing you look at beats a layout you compute. Edit in place; do not rewrite the whole file. The helper (if yours) grows the same way: functions, not a base class.
4. **Tests for `Must get right`.** Before the full check, turn EVERY item under the stub's `Must get right` into one step in ONE `drive-dom` (or `drive.mjs`) step file (good and bad examples: `briefs/reference/probe-cookbook.md`; a failing `expect` prints what is visible, fix every mismatch in one turn): an `expect` or a `probe` that FAILS if the drawing breaks that item. Run it and fix the scene until it passes. Test the behaviour, not a label: a reading that must be measured is tested by changing the figure (drag a point, move a dial) and expecting the reading to change; "all three lines are drawn" is tested by a probe that checks each line has length in every case the stub lists. An item you cannot test without seeing it goes under `open:` for the look run. List each one in the design note's `Must-get-right tests:` line.
   **Full check:** iterate with `--no-browser`; run `node tools/sim-test/check-scene.mjs L0N/<Scene> --bundle <Bundle>` (1-3 min: probes and a real-browser text report) once when the scene is complete, and again only after a change to logic or layout. A WARN about what a learner sees or what breaks (overlap, contrast, empty centre, freeze, resume leak, a clipped box) is fixed, or explained in one line under `## Checks explained`; `note:` lines and style advisories need nothing. Then drive the controls once with the driver your guide names (a tap, a control mid-run, each mode or case the stub lists, and the end state; it sets dials the way the host does: sliders and selects arrive as strings). That finds what static gates cannot (a wrong root, a dropped tap). Test the defaults, the extremes of each dial and the one case the slide names; no sweeps over dial grids. A deliberate resume difference: `Resume-ignore: <regex>` on the design note, with the reason.
5. **Look** (only if you can view images and the invocation does not say `Look: later`; otherwise go to step 6 with `Status: look-pending`, and skip this step entirely: no `shoot` of any kind, nothing in `## Look log`).
   `node tools/sim-test/shoot.mjs L0N/<Scene> --bundle <Bundle>` shoots every beat in both themes and prints a text report and a contact sheet path. Then follow `briefs/reference/look-rubric.md`: report first, sheet second, single shots only where needed. Add `--steps` for the run, mid-run, each dial position and the celebration (a DOM scene has no canvas coordinates: use `{"click": "<selector>", "name": "..."}` / `{"set": [sel, v], ...}`; `drive-dom.mjs --inputs` lists the selectors; shoot says when a step changed nothing). Fix, re-shoot, log each round with `node tools/staged-generation/scene-pass.mjs --bundle <Bundle> --target L0N/<Scene> look "round N (<images viewed>): seen - ...; changed - ...; left - ..."` (appends under `## Look log`; images viewed = images you opened, a contact sheet is one read). `--steps` REPLACE the default beats (add `{"beat":N}` steps for states you still want) and `shoot` rejects `until` (use `wait`). `shoot` counts rounds (a shot-taking run on changed code) and refuses a third. **At most 2 rounds** after step 4 first passes: round 2 only if round 1's sheet or report still shows a defect from the rubric that you could not fix in round 1, or your fixes changed a layout. A clean round-1 sheet ends the look. This cap has no exceptions: a scene that still reads badly after round 2 (a hero that does not read, say) keeps `Status: look-pending`, with what is wrong under `open:` and `## Requests`, and a separate Stage 3-look run (fresh context, cheaper) or a human continues. Never start round 3 yourself. After round 2, change drawing code only for a defect the text report or check-scene states (a number, an overlap); anything you would need to SEE goes under `open:` for the 3-look run: an unseen layout edit is a guess, and do not build your own shooter.
6. **Close.** Re-run check-scene if you changed code after step 4. Then one command does the log bullet and the Status: `node tools/staged-generation/log-stage3.mjs --bundle <Bundle> --target L0N/<Scene> --model "<name>" --what "<one line>" [--controls ..] [--numbers ..] [--flags ..]`. Status becomes `done` when `## Look log` has a line, else `look-pending`. Add `--status look-pending` for `Look: later`, and whenever a `left -` or `open:` item needs eyes (`done` means nothing unseen is left). `--what` is what the scene shows only (no process, no flags). `--look` is for a 3-look pass only. In a parallel run (the invocation says not to edit the log) add `--no-log`: it sets the Status and prints the exact section to give in your report; the log file is not touched. Never hand-edit the Status line or the log. Run it as ONE Bash call joined with `&&` to any other close command, with short fields (`--what` <=150 chars, `--controls` <=50, `--numbers` <=110, `--flags` <=130; a longer one is refused). `Resume-ignore:` in the note: the regex alone on its line, the reason under `## Checks explained`. Put real flags (what you could not verify, a contradiction in the stub) in `--flags`, not only in the report. The bullet format:
   ```
   - <Scene> (<N> beats, <base class>, <date>): <what it shows in one line>. Model: <name>.     (aim under 600 characters; up to 1000 is accepted: the design note has the detail)
     Controls added beyond the stub: <...>. Model numbers: <...>. Flags: <slide/science conflicts, facts to check>.
   ```
7. Report (the invocation may narrow its shape: follow that exactly).

## Rules that matter most (scene-rules.md has the rest; [check] = check-scene enforces it)

- Come to rest: `busy()` true while anything that matters moves; every run ends. [check: freeze probe]
- Runs credit the stage that launched them (a token), delayed work uses `this.after()`. [check: resume probe]
- Labels only; the prose explains. Chips beside the evidence, never on it.
- Colours from tokens (`c.<key>` on canvas, `var(--sim-*)` in SVG/DOM); never a hex, never a new `--sim-*` token. [check: WARN]
- One hero at least a third of the width; no empty middle band. [check: browser "empty centre" is advisory; never fix it by adding decoration]
- Draw what is true; flag what is not; do not fix the slide.
- Scene-type rules (canvas, SVG, DOM, geo) are in your guide.
- Motion checklist (full rules: `docs/simulation-authoring.md` 4.7; use `kit/SimAnim.js` for eases, springs, cues):
  - One focus colour; write the concept -> `--sim-series-N` map in the note before drawing; at most 4 meaning colours, 2 focus points.
  - Act the idea out; earlier beats stay complete, only the current beat moves, subjects settle and stop.
  - Structure, then data, then one annotation per beat; Predict shows a dashed ghost and never the outcome.
  - After a tap: at most ~0.8 s, tap skips to the end; exits ~0.18 s, entries 0.30-0.35 s.
  - Reduced motion shows each beat's end state; no per-frame text to aria; no `Math.random` in `draw`.
  - Banned: all-fade-in, particle bursts, glow on chrome, one camera move every beat, a crude character, texture.

## Harness facts (so you never read tool source)

- The host: `setup()`, then `onBeatChange(i, count)`, then `start()`. SimScene enters stage 0 inside `setup()` and switches to beat i's stage with no time in between. Each beat change or control grants 8 s of animation budget; pointer events are covered by SimScene.
- `shoot`: a beat/ctrl/tap step with no `wait` waits until the canvas stops changing (max `--settle`, default 4000 ms) and prints `settled after Xms`, `ambient motion only` (idle decoration: fine) or `still moving ... busy() is true` (a run longer than the wait: add a `wait`). Each run deletes this scene's old shots first, so a shot you open is always from the last run. `ignored?` means a ctrl hit a hidden, disabled or unknown control; `busy:` means input arrived while `busy()` was true. Confetti lasts about 1 s: use `"wait": 300` to catch it.
- The loop parks 1.5 s after `busy()` goes false, and not before the 8 s budget runs out.
- check-scene runs the real-browser text report with real fonts; the headless draw check's legibility guesses are then dropped. `--no-browser` is for quick loops only.

## Done means

- [ ] Design note written first; `Status: done` or `look-pending`.
- [ ] check-scene PASSES (full, not `--no-browser`); each real WARN fixed or explained in one line.
- [ ] Looked (or honestly `look-pending`), at most 2 rounds, Look log written (empty for `Look: later`).
- [ ] Log bullets appended (or printed with `--no-log`). Nothing outside the write-scope changed.

Report (START-HERE.md section 3) plus: base class and beats, controls added, model numbers, flags, the check-scene PASS line, the contact sheet path, and what the look review left open.
