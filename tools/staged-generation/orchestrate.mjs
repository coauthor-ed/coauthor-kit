#!/usr/bin/env node
/**
 * Prints the harness-specific orchestration prompt for driving next.mjs's
 * --units output through a live agent session's own native subagent-spawn
 * tool (docs/sprints/wip/staged-generation-orchestration-design.md).
 *
 * This does NOT spawn anything itself - same spirit as next.mjs never
 * spawning a content-generation agent. It just fills in the one recurring
 * template (check state -> dispatch -> verify each report -> loop) with the
 * current bundle's real units[] and the chosen harness's real subagent-spawn
 * tool call, so you paste one block into your live Claude Code/OpenCode/
 * Antigravity session instead of hand-writing it each time.
 *
 * You run this from your own shell (or have your live agent session run it
 * for you) - the PRINTED OUTPUT is what gets pasted into that session, not
 * this script's own stdout consumed by anything automated.
 *
 * Usage:
 *   node orchestrate.mjs --harness antigravity --bundle cells --bank
 *   node orchestrate.mjs --harness claude-code --bundle democracy
 *   node orchestrate.mjs --harness opencode --bundle cells --bank --limit 2
 *   node orchestrate.mjs --harness claude-code --bundle work-energy --concurrency 5 --auto      (a whole module, one live session)
 *   node orchestrate.mjs --harness opencode --bundle work-energy --only build                   (one phase; --only finish in another session)
 *   node orchestrate.mjs --bundle work-energy --status                                          (read-only report)
 *
 * The FIRST line of every dispatch output is ORCH-STATUS: CONTINUE | PHASE-COMPLETE | COMPLETE | STOPPED
 * (docs/sprints/wip/orchestrate-multi-model-and-full-auto-2026-10-08.md, 4.1). The tooling has no model concept.
 */

import { mkdirSync, writeFileSync, readFileSync, appendFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import {
  resolveBundleId, isCheckout, listBundles, unitsForState, unitsForBankState, setSplitLook, setOnePass, setNoCalibration, setWeb, setInteractive, stickyInteractive, stickyMode, waitingLine, withInteractive, INTERACTIVE_MSG, setReview, setUnitFilter, setBundledDocs, warnStaleBundles, setSceneBatch, setPassBatch, setForceRebuild, setActivePart,
  setParked, sceneStates, lessonsForBundle,
} from './next.mjs';
import { partsOf, lessonSlug } from '../sim-test/lib/bundle.mjs';
import { bundleNotes } from './lib/bundleProfile.mjs';

// ---------------------------------------------------------------------------
// arg parsing
// ---------------------------------------------------------------------------

const DEFAULT_SCENES_PER_AGENT = 3;

function parseArgs(argv) {
  const args = {
    bank: false, order: 'breadth', bankBatchSize: 15, concurrency: 10, scenesPerAgent: DEFAULT_SCENES_PER_AGENT,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--repo') args.repo = argv[++i];
    else if (a === '--bundle') args.bundle = argv[++i];
    else if (a === '--harness') args.harness = argv[++i];
    else if (a === '--bank') args.bank = true;
    else if (a === '--bank-batch-size') args.bankBatchSize = Number(argv[++i]);
    else if (a === '--order') args.order = argv[++i];
    else if (a === '--part') args.part = argv[++i];
    else if (a === '--limit') args.limit = Number(argv[++i]);
    else if (a === '--concurrency') args.concurrency = Number(argv[++i]);
    else if (a === '--split-look') args.splitLook = true;
    else if (a === '--no-split-look') args.splitLook = false;
    else if (a === '--one-pass') args.onePass = true;
    else if (a === '--no-calibration-images') args.noCalibrationImages = true;
    else if (a === '--web') args.web = true;
    else if (a === '--interactive') { console.error(INTERACTIVE_MSG); process.exit(2); }
    else if (a === '--interactive-async') args.interactiveAsync = true;
    else if (a === '--review') args.review = argv[++i];
    else if (a === '--revise') args.revise = true;
    else if (a === '--lessons') args.lessons = argv[++i];
    else if (a === '--shard') args.shard = argv[++i];
    else if (a === '--bundled-docs') args.bundledDocs = true;
    else if (a === '--no-bundled-docs') args.bundledDocs = false;
    else if (a === '--one-scene-per-agent') args.scenesPerAgent = 1;
    else if (a === '--sanity-per-agent' || a === '--verify-per-agent' || a === '--look-per-agent') { const v = argv[++i]; const n = v === 'lesson' ? Infinity : Number(v); if (!(n >= 1)) throw new Error(`${a} takes a number >= 1 or "lesson"`); (args.passBatch ||= {})[a.slice(2, a.indexOf('-', 2))] = n; }
    else if (a === '--scenes-per-agent') { const v = argv[++i]; args.scenesPerAgent = v === 'lesson' ? Infinity : Number(v); if (!(args.scenesPerAgent >= 1)) throw new Error('--scenes-per-agent takes a number >= 1, or "lesson"'); }
    else if (a === '--force-rebuild') args.forceRebuild = args.forceRebuild || [];
    else if (a === '--force-scene') (args.forceRebuild = args.forceRebuild || []).push(argv[++i]);
    else if (a === '--only') args.only = argv[++i];
    else if (a === '--auto') args.auto = true;
    else if (a === '--status') args.status = true;
    else if (a === '--event') { args.event = { kind: argv[++i], unit: argv[++i], text: argv[++i] }; }
    else if (a === '--park') { args.park = { scene: argv[++i], reason: argv[++i] }; }
    else if (a === '--unpark') args.unpark = argv[++i];
    else if (a === '--help' || a === '-h') args.help = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  return args;
}

const HARNESSES = ['antigravity', 'claude-code', 'opencode'];

const HELP = `orchestrate.mjs - harness-specific dispatch prompt for next.mjs --units

  --harness <antigravity|claude-code|opencode>   required (not for --status, --event, --park, --unpark)
  --bundle <id>          courses/<id> (default: auto if only one exists)
  --repo <dir>           content-repo-template checkout (default: cwd)
  --bank                 Bank track (B1/B2/B3) instead of the lesson track
  --bank-batch-size <n>  Stage B2 only, forwarded to unitsForBankState (default: 15)
  --order <breadth|depth> lesson track only, forwarded to unitsForState (default: breadth)
  --part <NN>            multi-part bundle: only that part (default: first part not done)
  --limit <n>            dispatch at most this many units this round, instead of
                          all currently-available ones (use for a cautious first
                          test of a harness/stage combo before trusting it wider)
  --concurrency <n>      size of the rolling pool: subagents alive at once (default 10).
                          A finished unit is replaced at once; the pool never waits for
                          a whole group
  --force-rebuild        Stage 3: also dispatch scenes stuck at "Status: building" (crashed or
                          provider-errored runs). Only after YOU have checked no agent is still
                          running. Not carried into the printed re-run command (one-shot release).
  --force-scene <s>      same, only for scenes whose "<lesson>/<scene>" contains <s> (repeatable)
  --scenes-per-agent <n|lesson>  Stage 3 build: one subagent builds up to n scenes of the SAME lesson, one after
                          another in its own session (default ${DEFAULT_SCENES_PER_AGENT}). Every scene that imports or subclasses the
                          same helper (or another scene as its helper) is ONE unit, helper owner first, even past n or with
                          n = 1, and even across lessons: a group is never split. n only limits how many unrelated groups
                          of one lesson share a unit. Units start longest first (most scenes, then arcade/game/helper writer).
                          "lesson" = all of a lesson's scenes in one run. Cuts the repeated doc/kit reading;
                          --concurrency then counts agents, not scenes. Carried into the re-run command.
  --sanity-per-agent <n|lesson>, --verify-per-agent <n|lesson>, --look-per-agent <n|lesson>
                          Stage 3 sanity / verify / look: one subagent runs up to n scenes of the SAME lesson (verify: and the
                          same docs family) through that one pass, one scene at a time, each closed before the next. Default 1
                          each (one fresh agent per scene, which keeps the verifier independent of the builder). Look: pairs
                          first (n = 2); the data shows no gain past 2. Carried into the re-run command.
  --one-scene-per-agent  the old behaviour: one fresh subagent per scene (same as --scenes-per-agent 1)
  --split-look           Stage 3, DEFAULT ON (no-op flag): build/verify runs skip the look and end at look-pending; a
                          separate 3-look run (needs a model that can view images) does it.
  --no-split-look        Stage 3: each unit does its own look. Carried into the re-run command.
  --one-pass             Stage 3: one run per scene (stage3-simulation.md) instead of the default 3 passes (build;
                          sanity only if the build's quick check failed; verify), each pass a fresh subagent.
                          Carried into the re-run command. One run = build + verify; with split-look (the default) it ends at
                          look-pending, so --only finish then offers only the 3-look units.
  --lessons <L01-L04|L01,L03>  only units of these lessons. Carried into the re-run.
  --shard <i/n>            a deterministic 1/n slice of the units (disjoint work for two environments). Carried into the re-run.
  --revise                 print a pool block with one Revise: invocation per lesson for the accepted review notes (tools/operator/notes.mjs)
  --interactive            refused (exit 2): interactive runs need a person to answer; use next.mjs --interactive in a live session.
  --interactive-async      allowed: Stage 1b / 2 / 3 build / B1 units carry "Interactive: async" (the agent writes its proposal to courses/<b>/steer/ and stops).
                          A unit whose steer file still waits for an answer is left out (named on stderr). bundle.json "interactiveMode": "async" does the same
                          for its "interactive" stages. Carried into the re-run.
  --web                    add "Web: on" to every invocation (web search allowed; default never). Carried into the re-run.
  --review manual          Stage 3: "Review: manual" on build/sanity runs (no tests run, no shoot, no verify/look; Status review-pending). Carried into the re-run.
  --no-calibration-images  Stage 3 build: leave out the three showcase images (brief item E). Carried into the re-run.
  --no-bundled-docs      turn the default off (each unit reads START-HERE.md and the docs one by one). Carried into the re-run.
  --bundled-docs         (default ON, every stage) each unit reads ONE prebuilt file, briefs/bundles/<name>.md (build it with
                          node tools/staged-generation/build-bundles.mjs) instead of START-HERE.md and the docs
                          its brief names. Units with no bundle keep the START-HERE.md line. Carried into the re-run.

  --only <tags|presets>  keep only those units of the round. Presets: plan (1a,1b), lessons (2), build (3), finish
                          (3-sanity,3-verify,3-look), module (4), all (default); or bare tags (3,3-sanity; bank: b1,b2,b3).
                          Phases do NOT overlap: a later phase called while an earlier one still has units prints
                          ORCH-STATUS: STOPPED (e.g. "build not finished"), except that finish never waits for other
                          scenes' builds: it offers every scene that is ready for a sanity/verify/look pass. Carried into the re-run command.
  --auto                 full-auto mode for one live session: adds the error-class table, the no-git + transient-error
                          NOTE to every unit, the status-after-each-round rule, and the stateless re-entry hint. A stalled or
                          killed unit is PARKED, never released automatically. Carried into the re-run command.
  --status               read-only report (add --only to narrow): per stage tag and pass the done / in flight / pending /
                          parked counts, the last 10 ledger events, error counts, wall time since the first event.
  --event <kind> <unit> "<text>"   append one line to build/scratch/<bundle>/orchestrate-ledger.ndjson. kind: ok retry limit filter stall
                          check park release. unit: a unit id or <lesson>/<scene>.
  --park <lesson>/<scene> "<reason>"   stop offering that scene (written to build/scratch/<bundle>/orchestrate-parked.json); it is listed
                          by --status and at the end. Stage 4 is not offered while scenes are parked.
  --unpark <lesson>/<scene>            offer it again.

The FIRST line of a dispatch output is always one of
  ORCH-STATUS: CONTINUE        <n> units follow
  ORCH-STATUS: PHASE-COMPLETE  <phase> has nothing left (<m> scenes wait for other phases)
  ORCH-STATUS: COMPLETE        <bundle>: done - nothing to dispatch (<p> parked)
  ORCH-STATUS: STOPPED         <reason> + the exact next action (release-scenes.mjs command, error, a phase to run first)
Stuck scenes (Status: building with no live run) are released by the OWNER with
  node tools/staged-generation/release-scenes.mjs --bundle <id> (--all | --lesson L02 | --stub <scene>) [--dry-run] [--yes]

Prints ONE paste-into-your-live-session block (between PROMPT START/END): dispatch (spawn one subagent per
unit via that harness's own native tool; each unit's prompt is next.mjs's one-line
"Read START-HERE.md and follow it. Stage: .." invocation), verify (each unit's own
check - figures-lint, outline-lint, lesson-check, check-scene - or validate.mjs
over its declared outputPaths), and loop (re-run this script).
Also written to build/scratch/<bundle>/orchestrate-prompt-<phase>.md (<phase> = all, or the --only preset/tags) and its checks to
orchestrate-checks-<phase>.txt, so two sessions on two phases never overwrite each other.

Never spawns anything itself - same reasoning as next.mjs never spawning a
content-generation agent (see README.md / docs/staged-generation.md). The tooling has no model
concept: you start each session on the harness and model you choose. Reuses
next.mjs's unitsForState/unitsForBankState as-is; this file only knows how to
phrase the dispatch/verify/loop instructions per harness.
`;

// ---------------------------------------------------------------------------
// per-harness tool phrasing
// ---------------------------------------------------------------------------

// Every harness spawns non-blocking; a foreground/blocking spawn holds the turn until ALL
// calls in it return, which is the batch wait we are avoiding. Facts checked 2026-09-29:
//  - Claude Code: background subagents (run_in_background) return at once and their
//    completion arrives as a notification in a later turn; default cap 20 alive
//    (CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS), spawning past it fails and must not be retried at once.
//  - Antigravity: invoke_subagent is non-blocking, results arrive as messages; no documented cap.
//  - OpenCode: parallel task calls in one message work, but the message returns only when all
//    have finished (observed 2026-09-29: the slowest unit held the whole pool and nothing was
//    refilled). No documented background option, so OpenCode gets batch instructions.
const SPAWN = {
  'claude-code': {
    tool: 'the Agent tool',
    how: 'subagent_type "general-purpose", description = the target\'s file name, prompt = the unit line (plus the note below), run_in_background: true if your Agent tool has that option (a foreground call blocks the turn until it returns, which recreates the batch wait). Not fork mode: every unit needs a fresh context.',
    wait: 'Each completion arrives as a notification that starts your next turn; after launching, end your turn instead of polling or sleeping. If a spawn fails with "Concurrent subagent limit reached", do not retry it at once: launch it when a running unit completes.',
  },
  opencode: {
    tool: 'the task tool (@general)',
    rolling: false,
    how: 'prompt = the unit line (plus the note below). A message with several task calls returns only when EVERY call in it has finished (the task tool has no non-blocking mode we could confirm; a rolling refill did not happen in the 2026-09-29 run), so you cannot refill mid-batch.',
    wait: '',
  },
  antigravity: {
    tool: 'invoke_subagent',
    how: 'initial message = the unit line (plus the note below); it returns at once, and send no follow-ups (each unit is a one-shot run).',
    wait: 'Each subagent sends you its result as a message when it finishes; react to those instead of polling.',
  },
};

const NOTE = (bundleId, auto = false) => `${auto ? `${TRANSIENT_NOTE} ` : ''}Other agents work in parallel: touch only files of your own target(s). Do not edit courses/${bundleId}/GENERATION-LOG.md. Pass --no-log to log-stage3.mjs, never hand-edit it. Report exactly what your brief's report step says. A build pass reports one line per scene, BUILD <Scene>: check-quick PASS|FAIL; requests: N; tests file: written (not run); note <path> (N = lines under the note's ## Requests), and nothing else; a sanity pass reports its one line. A pass or run that closes a scene (verify, a one-run scene, a look pass that sets Status) reports the check's PASS line (one per scene if you have several targets), then "LOG TEXT:" and the exact section (heading and Model: line included) your brief would have added, each bullet under 600 characters. No other prose: the detail lives in your design note(s).`;

// ---------------------------------------------------------------------------
// phases (--only), ledger, parking
// ---------------------------------------------------------------------------

const PRESETS = { plan: ['1a', '1b'], lessons: ['2'], build: ['3'], finish: ['3-sanity', '3-verify', '3-look'], module: ['4'] };
const LESSON_TAGS = ['1a', '1b', '2', '3', '3-sanity', '3-verify', '3-look', '4'];
const BANK_TAGS = ['b1', 'b2', 'b3'];
// Phases do not overlap: a later phase starts only when every earlier one reported PHASE-COMPLETE.
const PHASE_OF = { '1a': 'plan', '1b': 'plan', 2: 'lessons', 3: 'build', '3-sanity': 'finish', '3-verify': 'finish', '3-look': 'finish', 4: 'module', b1: 'b1', b2: 'b2', b3: 'b3' };
const PHASE_RANK = { plan: 0, lessons: 1, build: 2, finish: 3, module: 4, b1: 0, b2: 1, b3: 2 };
const tagOf = (u) => String(u.stage);
const phaseOf = (tag) => PHASE_OF[tag];

// null = everything. Presets and bare tags mix: "build", "3,3-sanity", "plan,lessons".
function parseOnly(spec, bank) {
  if (!spec || spec === 'all') return { tags: null, label: 'all' };
  const known = bank ? BANK_TAGS : LESSON_TAGS;
  const tags = new Set();
  for (const part of String(spec).split(',').map((x) => x.trim()).filter(Boolean)) {
    if (PRESETS[part] && !bank) PRESETS[part].forEach((t) => tags.add(t));
    else if (known.includes(part)) tags.add(part);
    else throw new Error(`--only: "${part}" is not ${bank ? 'a bank tag' : 'a preset or tag'}. ${bank ? `Tags: ${BANK_TAGS.join(' ')}` : `Presets: ${Object.keys(PRESETS).join(' ')} (and all). Tags: ${LESSON_TAGS.join(' ')}`}`);
  }
  const single = Object.entries(PRESETS).find(([, v]) => v.length === tags.size && v.every((t) => tags.has(t)));
  return { tags, label: single && !bank ? single[0] : [...tags].join('+') };
}

// Per-bundle (build/scratch/<bundle>/): parallel runs on different bundles must not share a ledger, park list or prompt file.
let SCRATCH_BUNDLE = '_';
const scratchDir = (repoDir) => path.join(repoDir, 'build', 'scratch', SCRATCH_BUNDLE);
const ledgerFile = (repoDir) => path.join(scratchDir(repoDir), 'orchestrate-ledger.ndjson');
const parkedFile = (repoDir) => path.join(scratchDir(repoDir), 'orchestrate-parked.json');
const KINDS = ['ok', 'retry', 'limit', 'filter', 'stall', 'check', 'park', 'release'];
const ERROR_KINDS = ['retry', 'limit', 'filter', 'stall', 'check'];

function readLedger(repoDir) {
  if (!existsSync(ledgerFile(repoDir))) return [];
  return readFileSync(ledgerFile(repoDir), 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}
function appendEvent(repoDir, ev) {
  mkdirSync(scratchDir(repoDir), { recursive: true });
  const prior = readLedger(repoDir).filter((e) => e.unit === ev.unit && e.kind === ev.kind).length;
  const rec = { t: new Date().toISOString(), unit: ev.unit, kind: ev.kind, ...(ev.harness ? { harness: ev.harness } : {}), attempt: prior + 1, text: String(ev.text || '').replace(/\s+/g, ' ').slice(0, 300) };
  appendFileSync(ledgerFile(repoDir), `${JSON.stringify(rec)}\n`);
  return rec;
}
function readParked(repoDir) {
  try { return JSON.parse(readFileSync(parkedFile(repoDir), 'utf8')); } catch { return {}; }
}
function writeParked(repoDir, map) {
  mkdirSync(scratchDir(repoDir), { recursive: true });
  writeFileSync(parkedFile(repoDir), `${JSON.stringify(map, null, 2)}\n`);
}

// ---------------------------------------------------------------------------
// auto mode text (docs/sprints/wip/orchestrate-multi-model-and-full-auto-2026-10-08.md 4.3)
// ---------------------------------------------------------------------------

const TRANSIENT_NOTE = 'No git of any kind (not even git status). A transient provider error (5xx, network, empty or malformed response): retry that same call up to 15 times, waiting 10 s and doubling to 5 min, before you give up.';

function autoBlock(b, cmd, statusCmd, phased = false) {
  return `
AUTO MODE. This run is stateless: all state is on disk. If you lose track, are compacted or restarted, just re-run:
  ${cmd}
and follow what it prints. Repeat until the FIRST line of its output is ${phased ? 'ORCH-STATUS: PHASE-COMPLETE, ORCH-STATUS: COMPLETE or ORCH-STATUS: STOPPED' : 'ORCH-STATUS: COMPLETE or ORCH-STATUS: STOPPED'}.

Error classes (for a subagent that fails; log each with: node tools/staged-generation/orchestrate.mjs --bundle ${b} --event <kind> "<unit id or lesson/scene>" "<one line>")
| what you see | what to do | event kind |
|---|---|---|
| transient: 5xx, network, empty or malformed 200, "not a Message" | retry the SAME call up to 15 times, waits of 10 s doubling to 5 min; keep the unit's slot; not a failure | retry |
| usage or rate limit (429) | stop launching, let running units finish, wait until the reset time in the error (else 15 min), resume | limit |
| content filter or invalid request (400, e.g. error 1301) | never retry; park the scene and carry on | filter, then park |
| stall or kill (no output for 3x the median, interrupted, context limit) | do NOT release the scene yourself; park it and carry on | stall, then park |
| a unit's check fails after a normal report | re-run it once with the failure text appended | check |
| the same check fails a second time | park it | check, then park |
Park: node tools/staged-generation/orchestrate.mjs --bundle ${b} --park <lesson>/<scene> "<reason>"   (parked scenes are not offered again; an owner clears one with --unpark).
A parked unit never stops the run. COMPLETE is reached when only parked scenes are left; STOPPED only for an ERROR: state, a missing harness tool, a scene left at Status: building with no live run (the output prints the exact release-scenes.mjs command: the OWNER runs it, never you), or three transient failures in a row on different units after 15 retries each (provider down).
After every round, and after every 10 reports, run \`${statusCmd}\` and print its output to me; that is the progress report.
Keep this session small: do not quote subagent reports back, one line each is enough; at a round boundary you may compact.
At the end: the units passed, retried and parked (with the release or unpark command for each parked scene), and the flags from the reports.
`;
}

// ---------------------------------------------------------------------------
// output
// ---------------------------------------------------------------------------

// A unit may name its stage's own check (figures-lint, outline-lint, lesson-check,
// check-scene); otherwise its JSON outputs are validated. Kept in a file so the
// pasted prompt stays short.
function checksFileText(units) {
  return units.flatMap((u) => {
    if (u.checks && u.checks.length) return u.checks.map((c) => `${c.key}\t${c.cmd}`);
    const key = (u.prompt.match(/Targets?: (\S+?)[.,]?(?:\s|$)/) || [])[1] || u.id;
    if (u.check) return [`${key}\t${u.check}`];
    const outs = (u.outputPaths || []).join(' ');
    return [`${key}\tfor f in ${outs}; do node validators/validate.mjs "$f" 2>/dev/null || echo "CHECK: $f"; done`];
  }).join('\n') + '\n';
}

const STATUS_PAD = 16;
const statusLine = (kind, rest) => `ORCH-STATUS: ${kind.padEnd(STATUS_PAD)}${rest}`;
const sceneCount = (units) => units.reduce((n, u) => n + ((u.sourcePaths || []).length || 1), 0);
const blockedPhase = (b) => (b.status === 'sanity' || b.status === 'verifying' ? 'finish' : 'build');
const releaseCmdFor = (bundle, part, b) => `node tools/staged-generation/release-scenes.mjs --bundle ${bundle}${part ? ` --part ${part}` : ''} --stub ${b.lesson}/${b.name}`;

// Decide what this call prints: CONTINUE with units, or one of the terminal states. Returns { line, prose, units?, checkUnits? }.
function classify(result, only, label) {
  const b = result.bundle || '';
  const parked = (result.blocked || []).filter((x) => x.status === 'parked');
  const stuck = (result.blocked || []).filter((x) => x.status !== 'parked');
  const parkedTail = parked.length ? `\n${parked.length} parked scene(s):\n${parked.map((x) => `  ${x.lesson}/${x.name}: ${x.reason}`).join('\n')}\nUnpark one with --unpark <lesson>/<scene> once it is fixed; Stage 4 is not offered until parked scenes are resolved.` : '';
  if (result.stage === 'done') return { line: statusLine('COMPLETE', `${b}: done - nothing to dispatch (0 parked)`), prose: `${b}: done - nothing to dispatch.` };
  if (result.stage === 'error') {
    return { line: statusLine('STOPPED', `ERROR: ${result.reason}`), prose: `ERROR: ${result.reason}\n(Not something to automate around - fix by hand, or rerun the relevant Stage 1a/B1 prompt yourself, then try again.)` };
  }
  if (result.stage === 'slides-fix') return { line: statusLine('STOPPED', `Stage 4 blocked: 3-slides FAIL in ${result.failing.join(', ')}`), prose: `${result.reason}` };
  const all = result.units || [];
  const visible = only ? all.filter((u) => only.has(tagOf(u))) : all;
  const hidden = only ? all.filter((u) => !only.has(tagOf(u))) : [];
  const reqRank = only ? Math.min(...[...only].map((t) => PHASE_RANK[phaseOf(t)])) : -1;
  // Phases do not overlap: anything of an EARLIER phase still pending, building or blocked stops this one.
  // Exception: build and finish are per scene (a scene's pass is offered only when that scene is ready), so a
  // finish-only run never waits for other scenes' builds.
  if (only) {
    const earlier = [];
    const gates = (ph) => PHASE_RANK[ph] < reqRank && !(ph === 'build' && reqRank === PHASE_RANK.finish);
    for (const u of hidden) { const ph = phaseOf(tagOf(u)); if (gates(ph)) earlier.push({ ph, n: (u.sourcePaths || []).length || 1 }); }
    for (const x of stuck) { const ph = x.status === 'waiting' ? 'build' : blockedPhase(x); if (gates(ph)) earlier.push({ ph, n: 1 }); }
    if (earlier.length) {
      const first = [...new Set(earlier.map((e) => e.ph))].sort((x, y) => PHASE_RANK[x] - PHASE_RANK[y])[0];
      const k = earlier.filter((e) => e.ph === first).reduce((n, e) => n + e.n, 0);
      const msg = first === 'build'
        ? `build not finished (${k} scenes pending/building): run the build phase first`
        : `${first} not finished (${k} unit(s) pending/in flight): run the ${first} phase first`;
      return { line: statusLine('STOPPED', msg), prose: `Not started: ${msg}.\nPhases do not overlap. Run: node tools/staged-generation/orchestrate.mjs --harness <h> --bundle ${b} --only ${first}` };
    }
  }
  if (visible.length) return { line: statusLine('CONTINUE', `${visible.length} units follow`), units: visible, allUnits: all, hiddenN: hidden.length };
  const relevant = only ? stuck.filter((x) => only.has(blockedPhase(x) === 'finish' ? '3-verify' : '3') || (x.status === 'waiting' && only.has('3'))) : stuck;
  if (relevant.length) {
    const lines = relevant.map((x) => `  ${JSON.stringify({ scene: x.scene, reason: x.reason })}`).join('\n');
    const owned = relevant.filter((x) => x.status !== 'waiting');
    const cmds = owned.map((x) => `  ${releaseCmdFor(b, result.part, x)}`).join('\n');
    const msg = owned.length
      ? `${owned.length} scene(s) are left at Status: ${[...new Set(owned.map((x) => x.status))].join('/')} with no live run; the owner releases them (then re-run)`
      : `${relevant.length} scene(s) wait for a shared helper that is not being built; resolve by hand and re-run`;
    return {
      line: statusLine('STOPPED', msg),
      prose: `Nothing to dispatch right now - blocked:\n${lines}\nWait for in-flight work to finish (or resolve it by hand) and re-run this script.${owned.length ? `\nThe owner releases stuck scenes (add --dry-run first):\n${cmds}` : ''}${parkedTail}`,
    };
  }
  if (hidden.length) {
    const m = sceneCount(hidden) + stuck.filter((x) => !relevant.includes(x)).length;
    // Name what the rest is waiting for, e.g. "(1 waits for build: run --only build)".
    const waits = [...new Set(hidden.map((u) => phaseOf(tagOf(u))).filter(Boolean))];
    const hint = waits.length ? ` - waiting: ${waits.map((w) => `${w} (run --only ${w})`).join(', ')}` : '';
    return { line: statusLine('PHASE-COMPLETE', `${label} has nothing left (${m} scenes wait for other phases${hint})`), prose: `${label}: nothing left for this phase; ${m} scene(s)/unit(s) wait for other phases${hint}.${parkedTail}` };
  }
  if (only && (stuck.length || result.stage !== 'done')) {
    const m = stuck.length;
    return { line: statusLine('PHASE-COMPLETE', `${label} has nothing left (${m} scenes wait for other phases)`), prose: `${label}: nothing left for this phase.${parkedTail}` };
  }
  if (parked.length) {
    return { line: statusLine('COMPLETE', `${b}: nothing left to dispatch but parked scenes (${parked.length} parked)`), prose: `${b}: nothing to dispatch.${parkedTail}` };
  }
  return { line: statusLine('STOPPED', 'state not settled (no units, no blocked scenes, stage not done): re-run once; if it repeats, report it'), prose: 'Nothing to dispatch right now, and stage is not "done" - re-run this script; state may be mid-transition.' };
}

function renderBlock(harness, result, limit, rerunFlags = '', concurrency = 10, o = {}) {
  const { only = null, label = 'all', auto = false } = o;
  const c = classify(result, only, label);
  if (!c.units) return { text: `${c.line}\n${c.prose}\n`, status: c.line };

  const allUnits = c.units;
  // Longest first (scenes in the unit, then arcade/game/helper-writer) so slow units start first; plan order breaks ties.
  const byCost = (us) => us.map((u, i) => [u, i]).sort(([a, i], [b, j]) => ((b.cost?.[0] || 0) - (a.cost?.[0] || 0)) || ((b.cost?.[1] || 0) - (a.cost?.[1] || 0)) || (i - j)).map(([u]) => u);
  const units = byCost(limit ? allUnits.slice(0, limit) : allUnits);
  const sequential = result.recommendedConcurrency === 'sequential' && units.length > 1;
  const sp = SPAWN[harness];
  const b = result.bundle;
  const oneRunB = units.some((u) => u.stage === 3 && !/ Pass: build\./.test(u.prompt));
  const buildOnly = !!(only && !only.has('3-sanity') && !only.has('3-verify') && !only.has('3-look'));
  const hasLook = units.some((u) => u.stage === '3-look');
  const hasPass = units.some((u) => u.stage === '3-sanity' || u.stage === '3-verify' || (u.stage === 3 && / Pass: build\./.test(u.prompt)));
  const baseCmd = `node tools/staged-generation/orchestrate.mjs --harness ${harness} --bundle ${b}${result.track === 'bank' ? ' --bank' : ''}${rerunFlags}`;
  const statusCmd = `node tools/staged-generation/orchestrate.mjs --bundle ${b} --status${only ? ` --only ${label.replace(/\+/g, ',')}` : ''}${result.part ? ` --part ${result.part}` : ''}`;

  const plan = sequential
    ? `Run them ONE AT A TIME with ${sp.tool}: spawn a unit, wait for its report, finish its steps under "After each report", then the next. (This stage is sequential on purpose: consecutive runs share a doc-reading prefix in the prompt cache.)`
    : sp.rolling === false
    ? `Run them in batches of ${concurrency} with ${sp.tool}: put all of a batch's calls in ONE message. That message returns only when the whole batch has finished (this harness cannot refill mid-batch), so do the "After each report" steps for every unit of the batch, then launch the next batch. Do not claim to refill a queue; you cannot. Do not end your turn between batches: after each batch print one progress line (units passed so far), then launch the next; stop only after the last batch.`
    : `Run them as a rolling pool with ${sp.tool}: keep ${Math.min(concurrency, units.length)} subagent(s) alive at once (the pool is ${concurrency}, but this round has ${units.length} unit(s)). Launch the first ${Math.min(concurrency, units.length)} now. Never wait for a whole group: each time a unit finishes, do its "After each report" steps and immediately launch the next unlaunched unit, so the pool stays full; when several finish together, refill every free slot in the same turn. ${sp.wait} If your harness rejects that many alive at once, lower the pool size to what it accepts and carry on.`;
  const stuckRule = sequential || sp.rolling === false ? '' : auto
    ? `\nA unit that runs far longer than its siblings (over 3x the median finished time) must not stall the pool: it only holds its own slot. If it is killed or you stop it, do NOT release it: its note stays at Status: building, so park it (see AUTO MODE) and carry on.`
    : `\nA unit that runs far longer than its siblings (over 3x the median finished time) must not stall the pool: it only holds its own slot. If you can stop it, do so, re-run it once with a note that the first run stalled (a stopped Stage 3 run leaves its design note at Status: building; the owner releases it with release-scenes.mjs, or --force-scene, and the re-run resumes from the note's Progress lines), and if that stalls too, stop and tell me.`;
  const failRule = auto ? 'a second failure: park the scene (AUTO MODE) and carry on' : 'a second failure: stop and tell me';
  const checksName = `orchestrate-checks-${label}.txt`;

  const body = `Drive the ${units.length} units below${units.length < allUnits.length ? ` (of ${allUnits.length} available)` : ''}${c.hiddenN ? ` (${c.hiddenN} more unit(s) belong to other phases and are not shown)` : ''} to completion for bundle ${b}. Each unit line is the complete prompt for one fresh subagent.

DISPATCH
${plan}${stuckRule}
Per unit: ${sp.how}
Note appended to every unit prompt: "${NOTE(b, auto)}"${buildOnly ? '\nThis round runs ONLY the build pass. ' + (oneRunB ? 'Each unit is the whole scene (build + verify); a one-run scene ends at look-pending with the default split-look, and only the look is left for --only finish.' : 'Sanity and verify are the finish phase: do not run them now, and do not start them even if a build reports a FAIL.') + ' Use a fresh subagent for every unit.' : hasPass ? '\nStage 3 runs as passes on one scene: build, then sanity (only when the build\'s quick check failed), then verify; each is a fresh subagent and the re-run below prints the next pass of each scene. Use a fresh subagent for every unit, never one that already ran a pass of that scene.' : ''}${hasLook ? '\n3-look units read screenshots: give them to a subagent that can view images; if none can, skip them and say so. A unit that reports "LOOK: no vision" changed nothing: re-run it on a subagent that can view images, or skip it. A 3-look unit is ONE PASS on one scene; a scene still look-pending after it comes back as the next pass in the re-run below (3 passes at most): that is intended.' : ''}

After each report
1. ${buildOnly ? (oneRunB ? 'A one-run unit (its line has no "Pass:", e.g. an arcade scene) closes its scene and reports LOG TEXT: append its `## ` section at the END of courses/'+b+'/GENERATION-LOG.md, verbatim; do not merge headings. A build-pass unit reports no LOG TEXT: append nothing for it.' : 'Build-pass units report no LOG TEXT: there is nothing to append to the log in this round.') : `Append its LOG TEXT (its \`## \` section) at the END of courses/${b}/GENERATION-LOG.md, verbatim; do not merge headings; skip it when it says "LOG TEXT: none" (a look pass that did not close its scene).`}
2. ${!buildOnly && !units.some((u) => u.stage === 3 || u.stage === '3-sanity') ? `Every unit's report must contain its check's PASS line (a unit with several scenes: one per scene). Run the unit's check yourself (build/scratch/${b}/${checksName}: grep the unit's Target, one line per scene); it re-runs check-scene on the scene (verify also checks that the design note reached Status: done). If it fails` : buildOnly ? `A build unit reports one line per scene ("BUILD <Scene>: check-quick PASS|FAIL; requests: N; tests file: written (not run); note ..."). PASS and FAIL are both a finished build: a FAIL is repaired by the sanity pass of the finish phase, which you do NOT run in this round; do not re-run the unit for it. Keep every scene's requests count: N above 0 means the stub or slide has a problem the owner must see (the lines are under ## Requests in its design note); list them in your final summary. No per-unit check is needed: when all units have reported, the status command below shows any scene that did not hand over (still pending or in flight).${oneRunB ? ' A one-run unit (no "Pass:" in its line, e.g. an arcade scene) is different: its report must contain check-scene\'s PASS line (it closes the scene, no later pass), and its check is check-scene itself (build/scratch/'+b+'/'+checksName+'); a FAIL there is a failed unit.' : ''} If a report is missing a scene or a scene did not hand over` : `A build or sanity unit reports one line ("BUILD <Scene>: check-quick PASS|FAIL; requests: N; ..."): a FAIL in that line is fine, the next pass fixes it; N above 0 is listed in your final summary. Any other unit's report must contain its check's PASS line (a unit with several scenes: one per scene). Run that unit's check yourself (build/scratch/${b}/${checksName}: grep the unit's Target, one line per scene). If a build or sanity scene did not hand over (the status command below shows it pending or in flight) or a check fails`}, re-run that unit once with the exact failure appended to its prompt (a re-run resumes from the design note and its Progress lines); ${failRule}.

When every unit has passed${auto ? ' (or been parked)' : ''}, ${auto || buildOnly ? `run \`${statusCmd}\` and print it, then ` : ''}run \`${baseCmd}\` and follow the block it prints the same way (do not assume what is left).
At the end, give me one summary: units passed, units retried, flags from the reports.
${auto ? autoBlock(b, baseCmd, statusCmd, !!only) : ''}
UNITS
${units.map((u) => u.prompt).join('\n')}
`;
  // PROMPT END is always the last line printed: operator notes (o.header) go above PROMPT START.
  const text = `${c.line}\n${o.header ? `${o.header}\n` : ''}===== PROMPT START =====\n${body}===== PROMPT END =====\n`;
  return { text, body, checks: checksFileText(units), status: c.line };
}


function writeScratchFile(repoDir, label, text, checks) {
  const dir = scratchDir(repoDir);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, `orchestrate-prompt-${label}.md`), text);
  if (checks) writeFileSync(path.join(dir, `orchestrate-checks-${label}.txt`), checks);
}

// ---------------------------------------------------------------------------
// --status: read-only progress report
// ---------------------------------------------------------------------------

function sceneCounts(repoDir, bundleId, bundleDir, part) {
  const parts = partsOf(bundleDir);
  const lessons = parts.length ? (part ? [part] : parts).flatMap((p) => lessonsForBundle(bundleDir, p)) : lessonsForBundle(bundleDir, null);
  const scenes = sceneStates(bundleDir, lessons);
  const rows = { build: { done: 0, fly: 0, pending: 0, parked: 0 }, sanity: { done: 0, fly: 0, pending: 0, parked: 0 }, verify: { done: 0, fly: 0, pending: 0, parked: 0 }, look: { done: 0, fly: 0, pending: 0, parked: 0 } };
  const flying = [];
  for (const sc of scenes) {
    const text = existsSync(sc.design) ? readFileSync(sc.design, 'utf8') : '';
    const sanityDone = /^-\s.*\bsanity end\b/m.test(text);
    const pass = { fresh: 'build', building: 'build', 'build-pending': 'build', 'sanity-pending': 'sanity', sanity: 'sanity', 'verify-pending': 'verify', verifying: 'verify', 'look-pending': 'look', 'review-pending': null, done: null }[sc.status];
    // raw status of the note (sceneStates rewrites released ones)
    if (sc.parkedReason) { rows[pass || 'look'].parked += 1; continue; }
    const st = sc.status;
    const built = !['fresh', 'building'].includes(st);
    if (built) rows.build.done += 1; else if (st === 'building') rows.build.fly += 1; else rows.build.pending += 1;
    if (st === 'sanity') rows.sanity.fly += 1; else if (st === 'sanity-pending') rows.sanity.pending += 1; else if (sanityDone) rows.sanity.done += 1;
    if (st === 'verifying') rows.verify.fly += 1; else if (st === 'verify-pending') rows.verify.pending += 1; else if (['look-pending', 'done'].includes(st)) rows.verify.done += 1;
    if (st === 'look-pending') rows.look.pending += 1; else if (st === 'done') rows.look.done += 1;
    if (['building', 'sanity', 'verifying'].includes(st)) flying.push(`${sc.lesson}/${path.basename(sc.scene, '.js')} (${st})`);
  }
  return { rows, flying, total: scenes.length, lessons };
}

function statusReport(repoDir, bundleId, args, onlySet) {
  const bundleDir = path.join(repoDir, 'courses', bundleId);
  const want = (t) => !onlySet || onlySet.has(t);
  const out = [`STATUS ${bundleId}${args.part ? ` part ${args.part}` : ''}${onlySet ? ` (only ${[...onlySet].join(' ')})` : ''}`];
  const result = args.bank ? unitsForBankState(repoDir, bundleId, args.bankBatchSize) : unitsForState(repoDir, bundleId, args.order);
  out.push(`current stage: ${result.stage}`);
  if (!args.bank) {
    const c = sceneCounts(repoDir, bundleId, bundleDir, args.part);
    const lessonFiles = c.lessons.filter((l) => existsSync(path.join(bundleDir, 'lessons', `les-${lessonSlug(l.id)}.json`))).length;
    if (want('2')) out.push(`stage 2 (lessons):   done ${lessonFiles}/${c.lessons.length}`);
    const row = (tag, name, r) => (want(tag) ? out.push(`${tag.padEnd(9)} ${name.padEnd(7)} done ${String(r.done).padStart(3)}  in flight ${String(r.fly).padStart(2)}  pending ${String(r.pending).padStart(3)}  parked ${String(r.parked).padStart(2)}`) : null);
    out.push(`stage 3 (${c.total} scenes):`);
    row('3', 'build', c.rows.build); row('3-sanity', 'sanity', c.rows.sanity); row('3-verify', 'verify', c.rows.verify); row('3-look', 'look', c.rows.look);
    if (c.flying.length) out.push(`in flight: ${c.flying.slice(0, 10).join(', ')}${c.flying.length > 10 ? ', ...' : ''}`);
    const parked = readParked(repoDir);
    const keys = Object.keys(parked);
    if (keys.length) out.push(`parked (${keys.length}): ${keys.map((k) => `${k} [${parked[k].reason}]`).join('; ')}`);
    if (result.stage === 4 && want('4')) out.push('stage 4: module export is next');
  } else {
    out.push(`bank stage ${result.stage}: ${(result.units || []).length} unit(s) pending`);
  }
  const ev = readLedger(repoDir);
  const counts = Object.fromEntries(ERROR_KINDS.map((k) => [k, ev.filter((e) => e.kind === k).length]));
  out.push(`errors: ${ERROR_KINDS.map((k) => `${k} ${counts[k]}`).join('  ')}`);
  if (ev.length) {
    const mins = Math.round((Date.now() - Date.parse(ev[0].t)) / 60000);
    out.push(`wall time since the first ledger event: ${Math.floor(mins / 60)}h${String(mins % 60).padStart(2, '0')}m (first event ${ev[0].t})`);
    out.push('last events:');
    for (const e of ev.slice(-10)) out.push(`  ${e.t.slice(11, 19)}Z ${e.kind.padEnd(7)} ${e.unit}${e.attempt > 1 ? ` #${e.attempt}` : ''}: ${e.text}`);
  } else out.push('ledger: no events yet (build/scratch/<bundle>/orchestrate-ledger.ndjson)');
  out.push('(tokens and quota are not visible to these tools)');
  return out.join('\n');
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

function sceneKeyExists(repoDir, bundleId, key) {
  const bundleDir = path.join(repoDir, 'courses', bundleId);
  const parts = partsOf(bundleDir);
  const lessons = parts.length ? parts.flatMap((p) => lessonsForBundle(bundleDir, p)) : lessonsForBundle(bundleDir, null);
  return sceneStates(bundleDir, lessons).some((sc) => `${sc.lesson}/${path.basename(sc.scene, '.js')}` === key);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(HELP);
    return;
  }
  const repoDir = path.resolve(args.repo || process.cwd());
  const needRepo = () => {
    if (isCheckout(repoDir)) return true;
    console.error(`${repoDir} doesn't look like a content-repo-template checkout (missing AGENTS.md or courses/).`);
    process.exitCode = 1;
    return false;
  };
  const needBundle = () => {
    const id = resolveBundleId(repoDir, args.bundle);
    if (id) { SCRATCH_BUNDLE = id; return id; }
    const bundles = listBundles(repoDir);
    if (bundles.length === 0) console.error('No bundles under courses/ yet - scaffold one with tools/operator/start.mjs, then pass --bundle <id>.');
    else { console.error('Multiple bundles found - pass --bundle <id>:'); for (const b of bundles) console.error(`  ${b}`); }
    process.exitCode = 1;
    return null;
  };

  // --revise: one Revise: invocation per lesson for the bundle's accepted review notes (tools/operator/notes.mjs), as a pool block
  if (args.revise) {
    if (!needRepo()) return;
    const bundleId = needBundle(); if (!bundleId) return;
    import('../operator/lib/notes.mjs').then(({ dispatch }) => {
      const d = dispatch(path.join(repoDir, 'courses', bundleId), bundleId, { web: args.web });
      if (!d.length) { console.log('REVISE: no accepted review notes for this bundle.'); return; }
      const sp = SPAWN[args.harness || 'claude-code'] || SPAWN['claude-code'];
      const conc = Math.min(args.concurrency || 4, d.length);
      console.log(`REVISE: ${d.length} unit(s), one per lesson\n===== PROMPT START =====\nDrive the ${d.length} revise units below to completion. ${sp.rolling === false ? `Run them in batches of ${conc}` : `Keep ${conc} subagent(s) alive at once as a rolling pool`} with ${sp.tool}. Per unit: ${sp.how} Different lessons touch different files; if two units name the same shared helper, run those two one after the other. A unit that fails twice: stop and tell me. After each report check that it names the files changed and the PASS lines of its checks. Do not run git. At the end give one summary: units done, flags.\n\nUNITS\n${d.map((x) => x.text).join('\n')}\n===== PROMPT END =====`);
    });
    return;
  }

  // ledger and parking: small commands the live session runs instead of remembering
  if (args.event) {
    const { kind, unit, text } = args.event;
    if (!needRepo()) return;
    if (!KINDS.includes(kind) || !unit) { console.error(`--event <kind> <unit> "<text>": kind is one of ${KINDS.join(' ')}, unit is a unit id or lesson/scene`); process.exitCode = 2; return; }
    const rec = appendEvent(repoDir, { kind, unit, text, harness: args.harness });
    console.log(`event ${rec.kind} ${rec.unit} #${rec.attempt} recorded`);
    return;
  }
  if (args.park !== undefined || args.unpark !== undefined) {
    if (!needRepo()) return;
    const bundleId = needBundle();
    if (!bundleId) return;
    const map = readParked(repoDir);
    if (args.park) {
      const { scene, reason } = args.park;
      if (!scene || !/^[\w.-]+\/[\w.-]+$/.test(scene) || !reason) { console.error('--park <lesson>/<scene> "<reason>"  (e.g. --park L02/RampScene "content filter 1301")'); process.exitCode = 2; return; }
      if (!sceneKeyExists(repoDir, bundleId, scene)) { console.error(`--park: no scene ${scene} in ${bundleId} (look at courses/${bundleId}/simulations/<lesson>/<Scene>.stub.md)`); process.exitCode = 2; return; }
      map[scene] = { reason: String(reason).replace(/\s+/g, ' ').slice(0, 200), t: new Date().toISOString() };
      writeParked(repoDir, map);
      appendEvent(repoDir, { kind: 'park', unit: scene, text: reason, harness: args.harness });
      console.log(`parked ${scene}: it is not offered again (listed by --status and at COMPLETE). Clear with --unpark ${scene}`);
    } else {
      const key = args.unpark;
      if (!key || !map[key]) { console.error(`--unpark: ${key || '(nothing)'} is not parked. Parked: ${Object.keys(map).join(', ') || 'none'}`); process.exitCode = 2; return; }
      delete map[key];
      writeParked(repoDir, map);
      appendEvent(repoDir, { kind: 'release', unit: key, text: 'unparked', harness: args.harness });
      console.log(`unparked ${key}: it is offered again if its note allows`);
    }
    return;
  }

  let onlyInfo;
  try { onlyInfo = parseOnly(args.only, args.bank); } catch (e) { console.error(String(e.message)); process.exitCode = 2; return; }

  if (args.status) {
    if (!needRepo()) return;
    const bundleId = needBundle();
    if (!bundleId) return;
    setParked(readParked(repoDir) && Object.fromEntries(Object.entries(readParked(repoDir)).map(([k, v]) => [k, v.reason])));
    setActivePart(args.part);
    console.log(statusReport(repoDir, bundleId, args, onlyInfo.tags));
    return;
  }

  if (!args.harness || !HARNESSES.includes(args.harness)) {
    console.error(`--harness must be one of: ${HARNESSES.join(', ')}`);
    process.exitCode = 1;
    return;
  }
  if (!needRepo()) return;
  const bundleId = needBundle();
  if (!bundleId) return;

  setSplitLook(args.splitLook !== false);
  setOnePass(args.onePass);
  setNoCalibration(args.noCalibrationImages);
  setWeb(args.web);
  setInteractive(args.interactiveAsync ? 'async' : false, { noLive: true });
  if (stickyInteractive(repoDir, bundleId).length && stickyMode(repoDir, bundleId) === 'live') console.error(`note: bundle.json "interactive" ignored here (orchestrate cannot take answers); ${INTERACTIVE_MSG}`);
  setReview(args.review);
  setUnitFilter(args.lessons, args.shard);
  setBundledDocs(args.bundledDocs !== false, repoDir);
  warnStaleBundles(repoDir);
  setSceneBatch(args.scenesPerAgent);
  for (const k of ['sanity', 'verify', 'look']) setPassBatch(k, args.passBatch?.[k] ?? 1);
  setForceRebuild(args.forceRebuild);
  setActivePart(args.part);
  setParked(Object.fromEntries(Object.entries(readParked(repoDir)).map(([k, v]) => [k, v.reason])));
  const result = args.bank
    ? unitsForBankState(repoDir, bundleId, args.bankBatchSize)
    : unitsForState(repoDir, bundleId, args.order);
  result.bundle = result.bundle || bundleId;
  // a unit still waiting for the operator's answer in its steer file is not dispatched
  if (result.units) {
    for (const u of result.units.filter((x) => x.waiting)) console.error(waitingLine(u.waiting));
    result.units = result.units.filter((x) => !x.waiting);
  }
  // one line per unit stays one line: subject pack / look override / owned source (nothing for a default bundle)
  const notes = bundleNotes(repoDir, bundleId).replace(/\n/g, ' ');
  if (notes) for (const u of result.units || []) if (typeof u.prompt === 'string') u.prompt = `${u.prompt} ${notes}`;
  // async only (a live mode is off here): the two Interactive lines, kept on one line like the notes
  for (const u of result.units || []) if (typeof u.prompt === 'string') u.prompt = withInteractive(repoDir, bundleId, u.prompt).replace(/\n/g, ' ');
  result.track = result.track || (args.bank ? 'bank' : 'lesson');

  const rerun = `${args.concurrency !== 10 ? ` --concurrency ${args.concurrency}` : ''}${args.order !== 'breadth' ? ` --order ${args.order}` : ''}${args.part ? ` --part ${args.part}` : ''}${args.only ? ` --only ${args.only}` : ''}${args.auto ? ' --auto' : ''}${args.splitLook === false ? ' --no-split-look' : ''}${args.onePass ? ' --one-pass' : ''}${args.noCalibrationImages ? ' --no-calibration-images' : ''}${args.web ? ' --web' : ''}${args.interactiveAsync ? ' --interactive-async' : ''}${args.review === 'manual' ? ' --review manual' : ''}${args.lessons ? ` --lessons ${args.lessons}` : ''}${args.shard ? ` --shard ${args.shard}` : ''}${args.bundledDocs === false ? ' --no-bundled-docs' : ''}${args.scenesPerAgent !== DEFAULT_SCENES_PER_AGENT ? ` --scenes-per-agent ${args.scenesPerAgent === Infinity ? 'lesson' : args.scenesPerAgent}` : ''}${['sanity', 'verify', 'look'].map((k) => (args.passBatch?.[k] > 1 ? ` --${k}-per-agent ${args.passBatch[k] === Infinity ? 'lesson' : args.passBatch[k]}` : '')).join('')}${args.limit ? ` --limit ${args.limit}` : ''}`;
  const promptFile = path.join(scratchDir(repoDir), `orchestrate-prompt-${onlyInfo.label}.md`);
  // A scene whose design note says `Status: building` is owned by a run; after a crash or a pause nothing
  // owns it, and it is silently left out of every later dispatch. Say so, once, to the operator (above the prompt).
  const stuck = (result.blocked || []).filter((x) => x.status !== 'parked');
  const stuckNote = (result.units || []).length && stuck.length
    ? `(For you, not part of the prompt) ${stuck.length} unit(s) are NOT offered:\n${stuck.map((b) => `  ${b.scene || b.id || JSON.stringify(b)}: ${b.reason || ''}`).join('\n')}\nA crashed or paused Stage 3 run leaves its design note at Status: building; if no run is live, release it: node tools/staged-generation/release-scenes.mjs --bundle ${bundleId} --all --dry-run   (then without --dry-run).`
    : '';
  const header = `(Print this whole output; do not pipe it through head or tail. The prompt alone, without these notes or the markers, is also in ${promptFile}.)${stuckNote ? `\n${stuckNote}` : ''}`;
  const { text: block, body, checks } = renderBlock(args.harness, result, args.limit, rerun, args.concurrency, { only: onlyInfo.tags, label: onlyInfo.label, auto: !!args.auto, header });
  console.log(body === undefined ? block : block.trimEnd());
  // the file holds the prompt only: no ORCH-STATUS line, no markers, no operator notes
  writeScratchFile(repoDir, onlyInfo.label, body === undefined ? block : body, checks);
}

main();
