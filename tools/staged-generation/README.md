# Staged-generation prompt assistant

`docs/staged-generation.md` splits chapter generation into fresh-context agent
passes (Stage 1a source-scan -> Stage 1b outline -> Stage 2 per-lesson -> Stage 3
per-scene -> Stage 4 module/validate). This tool reads the bundle's state on disk,
works out which stage is next, and prints ONE LINE to paste into a fresh agent
session:

    Read START-HERE.md and follow it. Stage: 2. Bundle: work-energy. Target: L03.

`START-HERE.md` (repo root) holds the rules for every stage and routes the agent to
its brief, `briefs/<stage>.md`: what to read (by section - `tools/doc-section.mjs`),
the write-scope, the procedure, the check that must pass, and the report. Edit the
briefs, not this tool, to change what agents do. Keeping the pasted text to one line
also keeps each session's context for the work itself.

Stage 1a and Stage 1b are two separate runs on purpose (not just for context
size like the rest of the split): a model that reads source figures/diagrams well
often isn't the model you'd trust for outline/pedagogy design, and vice versa. Run
`next.mjs` once to get the Stage 1a prompt, paste it into whichever
agent/model you're using for source scanning; once `FIGURES.md` exists, run
`next.mjs` again (same bundle) to get the Stage 1b prompt, and paste that into a
different agent/model if you want. Nothing about `next.mjs` assumes both come from
the same session.

**It never spawns an agent itself.** Headless-mode reliability differs a lot across
harnesses - Claude Code's `-p` mode retries 429/529s with backoff, Antigravity's `-p`
mode has a bounded print-timeout, opencode's `run` mode has open issues where it
hangs forever on a 429 with no backoff - so which harness runs the prompt, and how,
stays your call, same as today.

```bash
node tools/staged-generation/next.mjs                       # one bundle, cwd
node tools/staged-generation/next.mjs --bundle democracy    # disambiguate
node tools/staged-generation/next.mjs --watch                # poll, reprint on change
                                                              # (no --bundle needed even with
                                                              # multiple bundles - follows
                                                              # whichever was modified most
                                                              # recently)
node tools/staged-generation/next.mjs --all --scan-root ..   # status across sibling checkouts
node tools/staged-generation/next.mjs --list                 # every unblocked prompt, not just one
node tools/staged-generation/next.mjs --run-export ../dist   # validate + export, no agent
node tools/staged-generation/next.mjs --order depth           # see "Stage 2 vs Stage 3 order" below
```

Every printed invocation is also written to `build/scratch/<bundle>/next-prompt.md`.

The agent writes its own model name on the log's `Model:` line (there is no `--model` flag).

## Stage 3 guides (no generated pack)

A Stage 3 run reads its brief, then `briefs/stage3/INDEX.md`, then ONE pre-built guide chosen by the stub's `Base class:` / `Component:` (canvas, svg, geom, numberline, chart, chance, dom, boards, game, arcade, geo; add-ons people and props). Each guide holds the docs to read, the kit API, the example to copy and the right drive/check commands for that kind of scene. Nothing is assembled per scene and nothing guesses: the invocation line is the only per-scene input.

The API blocks in a guide are plain text copied from `node tools/sim-test/kit-api.mjs <module>` and each module's header comment. When a kit module changes its exports, re-copy that block by hand in the guides that list it. A new base class or component = one new guide plus one row in `INDEX.md` and in `briefs/reference/stub-format.md` ("Choosing the base class").

## How "next" is decided

1. `courses/<bundle>/modules/*.json` exists -> done (covers pre-staged-generation
   bundles too, which never had an `OUTLINE.md`).
2. No `OUTLINE.md` and no `FIGURES.md` -> Stage 1a.
3. No `OUTLINE.md` but `FIGURES.md` exists -> Stage 1b.
4. `OUTLINE.md`'s `## Lesson list` has a lesson with no `lessons/les-NN.json` yet ->
   Stage 2 for the first such lesson.
5. Every lesson has its `les-NN.json`, and a scene is not done -> Stage 3, one run
   per scene. A scene's state is its design note's `Status:` line
   (`simulations/L0N/<Scene>.design.md`, written by the run before any code):
   no note and no `.js` = to build; `building` = a run owns it (not offered;
   delete the note to release a crashed run); `look-pending` = built and checked
   but not looked at -> a `3-look` run for a model that can view images; `done`.
   Stubs sharing a `Shared helper:` line: only the first is offered while the
   helper does not exist (that run writes it and says `Writes helper:` on its
   note); the rest follow once it is no longer building, told not to edit it.
6. Every scene done, no module file -> Stage 4.

## Stage 2 vs Stage 3 order

Default (`--order breadth`): every lesson finishes Stage 2 before Stage 3 starts for
any of them. Every Stage 2 run reads the same brief and docs before it diverges into
lesson-specific content - running those calls back-to-back is the best case for a
prompt-cache hit on that shared prefix.

`--order depth`: finish a lesson's Stage 2 *and* Stage 3 before moving to the next
lesson. Costs that cache locality, but a systemic Stage 2 mistake (bad stub format, a
misread convention) surfaces after 1 lesson instead of after all of them, and each
lesson's Stage 3 agent gets a finished sibling scene as concrete precedent instead of
just another lesson's stub markdown. Worth it for the first run of something new;
`breadth` is fine once a course template is established.

## Automated mode - `--units` + `orchestrate.mjs`

`next.mjs` never spawns an agent itself (see above) - `--units` and `orchestrate.mjs`
don't either. Instead, `--units` prints every currently-actionable unit of the
current stage as machine-readable JSON (`repo`/`bundle`/`track`/`stage`/
`recommendedConcurrency`/`blocked`/`units[]`, each unit carrying its own `prompt`
and expected `outputPaths`), for a *live agent session you are already driving* to
dispatch through that harness's own native subagent tool - Claude Code's `Agent`
tool, OpenCode's task tool, Antigravity's `invoke_subagent`. This replaces an
earlier attempt (`auto-run.mjs`, since removed) that shelled out to `claude -p` in
headless mode itself - that didn't work reliably and only ever supported one
harness. See `docs/sprints/wip/staged-generation-orchestration-design.md` for the
full rationale.

`orchestrate.mjs` saves you from hand-writing the same dispatch/verify/loop prompt
every round: it calls `--units` for you and prints one ready-to-paste block, phrased
for whichever harness you're actually sitting inside:

```bash
node tools/staged-generation/orchestrate.mjs --harness antigravity --bundle cells --bank
node tools/staged-generation/orchestrate.mjs --harness claude-code --bundle democracy
node tools/staged-generation/orchestrate.mjs --harness opencode --bundle cells --bank --limit 2
```

Paste the printed block into your live session (also written to
`build/scratch/<bundle>/orchestrate-prompt-<phase>.md`, `<phase>` = `all` or the `--only` preset). Its FIRST line is always `ORCH-STATUS: CONTINUE | PHASE-COMPLETE | COMPLETE | STOPPED`. It is short: the rules, then one line per unit
(the same one-line START-HERE.md invocation `next.mjs` prints). It tells the session to
spawn one non-blocking subagent per unit as a rolling pool of `--concurrency <n>` (default 10):
whenever one finishes, the next is launched at once, so a slow or stuck unit only holds
its own slot (no waiting for a whole batch). If the harness rejects that many, the session
lowers the pool; `recommendedConcurrency: "sequential"` stages run one at a time. Harness
notes: Claude Code needs background spawns (`run_in_background`; default cap 20 alive,
`CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`); Antigravity `invoke_subagent` is non-blocking;
OpenCode's task tool has no non-blocking mode: a message with several calls returns only when all finish, so its prompt runs batches (the slowest unit holds the batch). After each
report the session appends the subagent's `LOG TEXT:` to `GENERATION-LOG.md` itself
(subagents are told not to touch it, so parallel units never race), checks that the
report ends with its check's PASS line (per-unit check commands are in
`build/scratch/<bundle>/orchestrate-checks-<phase>.txt`, not in the prompt), retries a failed unit once
with the failure appended, then stops rather than guess. 3-look units need a subagent that can view images.
Re-run `orchestrate.mjs` for the next round rather than assuming what's left.
`--limit <n>` caps how many units one round dispatches.

### Phases, full-auto, status, parking, releasing (live session only; the tools never pick a model)

- `--only <preset|tags>`: `plan` (1a,1b), `lessons` (2), `build` (3), `finish` (3-sanity,3-verify,3-look), `module` (4), `all` (default). Run one session per phase on the harness and model you choose (`--only build` in one, `--only finish` in another). Phases do not overlap, but build and finish are per scene: `finish` never waits for other scenes' builds. It offers each scene that is ready for a pass (verify first; a look is offered after verify ends, so re-run), else it prints `PHASE-COMPLETE` and names what the rest waits for. `build` with only finish work left prints `PHASE-COMPLETE`. Batching: `--sanity-per-agent`, `--verify-per-agent`, `--look-per-agent`. `--only` is carried into the re-run command.
- `--auto`: one session runs a whole module. The whole prompt is two lines:

```
Run: node tools/staged-generation/orchestrate.mjs --harness claude-code --bundle work-energy --concurrency 5 --auto
Follow what it prints, exactly, and repeat until the first line is ORCH-STATUS: COMPLETE or ORCH-STATUS: STOPPED.
```

  The block then carries the error-class table (transient, 429, 400 filter, stall, check failure), the no-git + transient-error note for every unit, the status-after-each-round rule and the stateless re-entry hint (a restarted session just runs the same two lines). A stalled or killed unit is parked, never released automatically.
- `--event <kind> <unit> "<text>"` appends to `build/scratch/<bundle>/orchestrate-ledger.ndjson` (kinds: ok retry limit filter stall check park release). `--park <lesson>/<scene> "<reason>"` stops offering a scene (`orchestrate-parked.json`); `--unpark` clears it. Parked scenes are listed at COMPLETE and by `--status`; Stage 4 waits for them.
- `--status [--only ...]` (read-only): per tag and pass the done / in flight / pending / parked counts, error counts, wall time since the first event, the last 10 events.
- `release-scenes.mjs --bundle B [--part NN] (--all | --lesson L02 | --stub <scene>) [--dry-run] [--yes]` is the OWNER's tool for scenes a killed run left at `Status: building|sanity|verifying`: it sets the Status the note's Progress implies (same rule as `--force-scene`; a build with no usable Progress becomes `build-pending`, offered again as a Resume) and skips notes modified in the last 5 minutes unless `--yes`. `STOPPED` prints the exact command.
- `scene-pass.mjs` additions: `look "<text>"` (verified append to `## Look log`), `start sanity|verify` refuses a `done` note, `end build` refuses a note with no `## Tests to run` heading (both `--force`), and a FAIL without a `diagnosis:` Progress line prints a reminder. Every `start` re-stamps `Started:` and deletes the scene's `.check-runs`, `.drive-runs`, `.layout-runs` in `build/scratch/` (a fresh budget per pass); `start verify` prints `tests file: ... (exists, N steps | absent)`; `end build` WARNs over 5 steps per tests-file row.
- `auto-run.mjs` is stale (it predates the 3 passes); use `orchestrate.mjs`.

## Setting up a bundle

`init.mjs`, `new-bundle.mjs` and `link-courses-repo.mjs` are gone. The operator uses `tools/operator/start.mjs`
(see `for-the-human-operator.txt`); agents never run it.

`--lessons L01-L04` and `--shard i/n` (next.mjs, orchestrate.mjs) hand two environments disjoint units of one bundle.

`--scenes-per-agent <n|lesson>` (Stage 3 build, default 3; `--one-scene-per-agent` = the old one scene per agent): one subagent builds up to n scenes
of the same lesson in one session, so the doc and kit reading is paid once per agent instead of
once per scene (`--concurrency` then counts agents). A scene that imports another scene of its
lesson as its helper (e.g. `FactorRectanglesScene-square` -> `FactorRectanglesScene.js`) always
rides in the same run, owner first, even past n; with one scene per agent such a scene waits a round.
The invocation then says `Targets: a, b, c.` (the brief's "Several targets" paragraph).
A shared helper is now one group per bundle, not per lesson folder, so two lessons can no
longer both be told to write the same `Shared helper:` file.

A 3-look unit is one pass (one shoot, one view, one edit batch) by a fresh agent on one scene; passes are never batched. A scene still `look-pending` after a pass is dispatched again on the next orchestrate run, up to 3 passes, so the images live in a short context. `--split-look` is the default (`--no-split-look` turns it off): a one-run build and a verify run do no `shoot` at all (peeks included); `shoot --peek` allows 3 renders per scene and reprints the last peek when the scene code is unchanged.

Stage 3 now runs as up to 3 short passes by default, each a fresh subagent on one scene (`--one-pass` = the old single run, `briefs/stage3-simulation.md`; an arcade scene is always one run). Pass 1 `build` (`briefs/stage3-build.md`): design note in the template, code, ONE quick check, stop. Pass 2 `sanity` (`briefs/stage3-sanity.md`): only if that quick check failed; makes it pass. Pass 3 `verify` (`briefs/stage3-verify.md`): probes from the note's `## Tests to run` (`briefs/reference/probe-cookbook.md`), full check, look, close with `log-stage3.mjs`. The hand-over lives in the design note: `Status:` (`building`, `sanity-pending`, `sanity`, `verify-pending`, `verifying`, `look-pending`, `done`) and the `## Progress` lines, both written only by `scene-pass.mjs` (`progress`, `start`, `end`, `expect`) and read back by `next.mjs`. A crashed run is released with `--force-scene` and resumes from its Progress lines (START-HERE rule 8). `--no-calibration-images` leaves out the three showcase images of the build pass (an A/B switch). A good example pair for the note and the stub: `briefs/showcase/EXAMPLE-stub.md`, `EXAMPLE-design-note.md`.

Bundles are ON BY DEFAULT for every stage (next.mjs, orchestrate.mjs, auto-run.mjs); `--no-bundled-docs` turns them off (the invocation then names START-HERE.md and the agent reads the docs one by one), and the commands warn on stderr when `briefs/bundles/` is stale. The invocation points at ONE prebuilt file, `briefs/bundles/<name>.md` (START-HERE + the stage's brief + the kit docs it names; Stage 3 per pass and per guide family, families from `lib/families.mjs`), instead of START-HERE.md and a dozen reads. `node tools/staged-generation/build-bundles.mjs` writes them, `--check` fails on a stale one (also run by `node tools/kit-check.mjs`, the kit's local check; no CI; `tools/git-hooks/pre-commit` is a fail-only hook, enable with `git config core.hooksPath tools/git-hooks`). The bundles are generated and committed: edit the sources, rebuild, commit. Every bundle starts with START-HERE.md and shares the next sections in a fixed order, so the prefix is byte-identical for the prompt cache. Units with no bundle (an old stub without `Base class:`) keep the START-HERE.md line.
