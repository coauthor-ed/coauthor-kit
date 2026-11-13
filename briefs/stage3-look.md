# Stage 3-look - One look PASS on one built scene

`Look: later` (START-HERE or the invocation) is for build and verify passes only. A look pass always shoots.

Target: `simulations/L0N/<Scene>.js` (the invocation's paths are relative to `courses/<Bundle>/`; the repo-root form is `courses/<Bundle>/simulations/L0N/<Scene>.js`; never ls or glob a shared directory), whose design note says `Status: look-pending` (built and checked, never viewed). You are ONE PASS of at most 3, each a fresh agent: at most ONE shoot, ONE view and ONE edit batch. Do not loop. The next pass verifies your edit with its own shoot.

**Cap.** A pass that fixes no named defect is the LAST pass: no defects, `changed - none`, or only `open:` items (under 3 px, zoom-only) closes `done`, never `look-pending`. Pass 2 is followed by pass 3 only when pass 2 fixed a named defect; pass 3 always closes `done`. log-stage3 `--look` enforces this (prints `CAP:` and sets `done`) and next.mjs never offers such a scene again. Whole-slide fit (scale in the real slide, page scroll, phone clipping) is not yours: `briefs/stage3-slides.md` judges it per lesson.

**Targets.** The invocation may name several scenes (`Targets:` and `Batch:`). Run this whole brief for ONE scene at a time, in the order given, and close it (its own close call with its own `--target`) before opening the next. Do not read a sibling's code or note, and do not carry findings from one scene to the next. A scene that fails or hits a cap is logged as that and the run continues with the next. Report one block per scene.

**Vision.** View the images yourself, in this session. If you cannot view images, stop now and report `LOOK: no vision` (change nothing). A subagent only if your harness gives you one that can see and you cannot: route it to a vision-capable model and give it the stub top block (Note card, Must get right, Per beat), `look-rubric.md`, at most 5 image paths (no crops) and this reply template: `MUST: <beat/theme: defect>`, `FIX: <edit>`, `NICE: <optional>`. No tool picks the model.

## Your pass number

Count the `pass N` lines in the note's `## Look log`; you are count + 1. Pass 1 starts your own round budget. Verify and build call their shoots "round N"; only a look run writes "pass N" (a "round N" line is not a pass, so do not count it).

## Read

1. `<Scene>.design.md` (what the scene shows per beat; the last `left -` line is what the previous pass found). Then the stub top block: `sed -n '1,/^## Verbatim/p' <stub>` (`Must get right:`, `Note card:` and `Not yet taught:` are fields there, then `## Per beat`). Note card and Not yet taught list what the scene leaves out: check them before adding any drawing. Then `node tools/sim-test/scene-info.mjs L0N/<Scene> --bundle <Bundle>` (slide text per beat).
2. `briefs/reference/look-rubric.md`: the text only. Open no image yet.
3. The scene `.js` and the guides (`briefs/reference/scene-rules.md`, the base-class guide from `briefs/stage3/INDEX.md`) only when step 5 needs them.

## Write-scope

`<Scene>.js`, `<Scene>.design.md`, the repo-root `build/` (scratch in `build/scratch/`, never under `courses/`). Not GENERATION-LOG.md (your report carries the text), the helper, the stub, the prose or other scenes (requests go in the note's `## Requests`).

## Procedure

1. **Shoot once.** `node tools/sim-test/shoot.mjs L0N/<Scene> --bundle <Bundle> --max-rounds 3` (pass 1 adds `--reset-rounds`). First `ls build/scratch/<Bundle>/ | grep <Scene>` (this scene only; never ls or glob a shared directory), then add `--steps=@build/scratch/<Bundle>/<Scene>-look-steps.json` if verify wrote it (use it as it is: never overwrite it, write your own under another name), else write your own for every state the note names (run, mid-run, dial extremes, celebration), all in this ONE run (a render deletes the scene's earlier shots). A step with no `wait` settles first, so a mid-run shot is a `wait` on the SAME step that starts the motion. A stub state that is missing from a shot is a defect: log it with its beat. Read no kit source in a look pass. Step keys (never run `--help`): canvas `{"beat":N}`, `{"ctrl":["id","v"]}`, `{"tap":[x,y]}`, `{"drag":[[x0,y0],[x1,y1]]}`, `{"wait":ms}`; a CONTROLS dial on any scene (canvas, DOM, SVG) `{"ctrl":["<id>","v"]}`; DOM `{"set":["<selector>",v]}`, `{"click":"<selector>"}` (`drive-dom.mjs ... --inputs` lists selectors); `"name":"<label>"` on a step shoots it (no `name`, no shot); confetti lasts about 1 s: `"wait": 150`. Landscape by default; `--portrait` shoots portrait INSTEAD of landscape: use it only when the last `left -` says portrait only, and then say landscape was not seen. No `--peek`.
2. **Read the text report** (overlap, small, contrast, off-frame, empty centre, loop). It names the beats and themes that need a closer look. `loop running` is read at the shot, before the 1.5 s idle park: fine on a static scene.
3. **View once.** ONE response with all the image reads in parallel: the contact sheet, the single shots the report flagged (at most 3), and in pass 1 one calibration image from the rubric table closest to this scene. At most 5 images in this pass, none after this step; "images viewed" in your log line is the number of images you opened (a contact sheet is one). No pixel scripts, crops or PNG decoding.
4. **Judge** with the rubric questions as a list: one line per beat x theme, at most ~10 lines of thought per fix. Write every defect down before touching code. A gap under 3 px, or a defect seen only by zooming: `open:`, not a fix. Something a closer look would settle but you did not open: `left -`. A `## Decisions` line that contradicts a stub `Must get right` line is a defect: fix the scene, record it under `## Deviations`. A line under `## Checks explained` is a claim, not a verdict: the shot wins, and a clipped or hidden reading is a defect even if an earlier pass explained it.
5. **Edit once.** All the fixes in one batch (small edits, no rewrite), then one `node tools/sim-test/ident-lint.mjs <file>`, then `node tools/sim-test/check-scene.mjs L0N/<Scene> --bundle <Bundle>` (PASS needed). A lint or check failure: fix just that. No defects: make no edit. After the edit you may run `shoot.mjs ... --report-only` once (text only, no images, no round used) and fix what it reports. No second shoot, no more images, no peek.
6. **Close**, ONE Bash call joining both commands with `&&` on one line, `<scene-pass look command> && <log-stage3 command>` (never hand-edit Status). The output prints the Status and the LOG TEXT: do not re-read the note afterwards.
   - `node tools/staged-generation/scene-pass.mjs --bundle <Bundle> --target L0N/<Scene> look "pass N (<images viewed>): seen - <defects>; changed - <edits>; left - <still wrong, or none>"`
   - `node tools/staged-generation/log-stage3.mjs --bundle <Bundle> --target L0N/<Scene> --model "<name>" --what "look: <what changed over the passes>; open: <...>" --status done|look-pending --look --no-log` (prints LOG TEXT).
   - `done`: no defects, `changed - none`, nothing left, only `open:` items (under 3 px, zoom-only), or you are pass 3; leftovers under `open:` (and `## Requests` if not yours to fix). An edit you made this pass is unseen until the next shoot: after any drawing or layout edit close `look-pending` (the operator may run another pass or accept it). `--report-only` measures text overlap only, never clipping or colour. log-stage3 prints a WARN if you close `done` with a `left -` item; it does not refuse, so say it in `--flags`.
   - `look-pending`: only after an edit that fixed a named defect (the next pass checks it), and only in pass 1 or 2. Never for a clean pass.

Report (START-HERE.md section 3), terse: `PASS N`, defects seen and fixed, what is left, the check-scene PASS line, then `LOG TEXT:` and the section log-stage3 printed (`done`), or `LOG TEXT: none` and last line `NEXT: pass N+1 in a fresh session` (`look-pending`).
