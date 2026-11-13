# Stage 3, pass 2 - Sanity: make the quick check pass

You are pass 2 of up to 3 fresh agents on this scene. Pass 1 (build) wrote the design note and the code and its quick check FAILED. Your one job: make `ident-lint` and the quick `check-scene` pass without changing what the scene is. Pass 3 (verify) does tests, the full check, the look and the log: not you.

Target: one scene, `simulations/L0N/<Scene>.stub.md` (the invocation says which). Write-scope: `<Scene>.js` (and the helper only if the note says `Writes helper:` and the invocation says you write it), `<Scene>.design.md` (only `## Progress` through the tool, `## Deviations` and `## Requests`), `build/scratch/`. Never the stub, other scenes, GENERATION-LOG.md, or anything else.

**Targets.** The invocation may name several scenes (`Targets:` and `Batch:`). Run this whole brief for ONE scene at a time, in the order given, and close it (its own close call with its own `--target`) before opening the next. Do not read a sibling's code or note, and do not carry findings from one scene to the next. A scene that fails or hits a cap is logged as that and the run continues with the next. Report one block per scene.

## Read (nothing else unless a step sends you)

1. `<Scene>.design.md` in full: `## Progress` may hold a `diagnosis:` line (build's whole to-do) and `## Decisions` and `## Beats` are the design. You never change a decision; if one is the cause of a FAIL, take the smallest change that passes and add a line under `## Deviations`.
2. `<Scene>.js` in full (it is yours to fix; one read).
3. `briefs/reference/scene-rules.md` and `briefs/reference/gotchas.md` ONLY if a FAIL is not self-explanatory or the note has no diagnosis (the rules the gates enforce, bad -> good).
No guide, no images, no examples: for an API question run `node tools/sim-test/kit-api.mjs <simulations/base/kit/Module.js>` (one line per export). Never read a tool's source.

## Procedure

1. `node tools/staged-generation/scene-pass.mjs --bundle <Bundle> --target L0N/<Scene> start sanity`.
2. Run, side by side in one turn: `node tools/sim-test/ident-lint.mjs <file>` and `node tools/sim-test/check-scene.mjs L0N/<Scene> --bundle <Bundle> --no-browser --no-probes`. Output over 40 lines: `| head -60`.
3. Apply EVERY item of the note's diagnosis (all of it: a repair often has two halves, such as dropping `onBeatChange` AND giving `BEAT_STEP_MAP` a stage per beat) and fix EVERY FAIL from that output, in ONE turn: independent edits side by side, never one edit per turn. A FAIL that names a rule: look it up in scene-rules.md, apply the "good" form. A `HANG: ... Stuck in: <function>` names the loop: fix that function.
4. Re-run step 2. n = the number of check-scene runs after your edits; at most 3 rounds in all. A WARN is not a FAIL: leave it for pass 3.
5. Close: `scene-pass.mjs ... end sanity --check PASS` (both clean) or `--check FAIL "<the first failing line>"` (still failing after n = 3: say what and why in `## Requests`; pass 3 gets it anyway). Do not start tests, a full check, or a shoot. A note with `Review: manual`: `end sanity` sets `Status: review-pending`; then run the `log-stage3.mjs ... --status review-pending` line it prints.
6. Report (one line): `SANITY <Scene>: check-quick PASS|FAIL after <n> runs; <what you changed in 10 words>`.

## Done means

- [ ] The quick check re-run after your last edit; its result recorded with `scene-pass.mjs ... end sanity`.
- [ ] Every item of the diagnosis applied (not just the first).
- [ ] No decision changed (or one `## Deviations` line per exception). Nothing outside the write-scope changed.
