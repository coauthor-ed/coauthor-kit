#!/usr/bin/env node
/**
 * Staged-generation prompt assistant.
 *
 * Scans a content-repo-template checkout's course bundle(s), works out which
 * staged-generation stage (docs/staged-generation.md) is next, and prints/writes
 * that stage's one-line invocation for a human to paste into an agent session
 * (Claude Code, Antigravity, opencode, or any other). The invocation points the
 * agent at START-HERE.md, which routes it to briefs/<stage>.md - the brief, not
 * this script, holds what to read, do and not touch. This script never spawns an
 * agent itself - headless-mode reliability differs a lot across harnesses (some
 * don't retry-after-backoff on 429 in headless mode), so driving the agent stays
 * the human's job, same as today, just without hand-filling/tracking the prompts.
 *
 * Usage:
 *   node next.mjs [--repo <dir>] [--bundle <id>]        one-shot, default mode
 *   node next.mjs --watch [--interval <seconds=5>]      poll and reprint on change
 *   node next.mjs --all [--scan-root <dir>]              status across sibling checkouts
 *   node next.mjs --list                                 print every currently-unblocked prompt
 *   node next.mjs --units [--bank]                        machine-readable JSON of every
 *                                                          currently-actionable unit, for a
 *                                                          live agent session to dispatch its
 *                                                          own subagents per unit
 *   node next.mjs --interactive [--target L02]           Stage 1b / 2 / 3 build / B1 prompts add the two Interactive lines
 *                                                          (a live session where the operator answers; see
 *                                                          briefs/reference/interactive.md). --target is --lessons
 *                                                          for one lesson (L02/Scene: one Stage 3 scene). Others print as usual.
 *   node next.mjs --interactive-async                    the same stages, "Interactive: async": the operator answers later in
 *                                                          courses/<b>/steer/<file>; a unit still waiting is skipped
 *   node next.mjs --run-export <destDir>                 validate + export (no agent needed)
 *   node next.mjs --bank ...                              same flags, Bank track (BANK-PLAN.md
 *                                                          / questions/bank/ / banks/) instead
 *                                                          of the lesson track
 */

import {
  existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import { LESSON_ID_SRC, LESSON_ID_RE, lessonSlug, partsOf, workDir, resolveHelper } from '../sim-test/lib/bundle.mjs';
import { familyForStubText } from './lib/families.mjs';
import { lookCap } from './lib/lookCap.mjs';
import { directionsFor, loadNotes } from '../operator/lib/notes.mjs';
import { bundleNotes } from './lib/bundleProfile.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// arg parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {
    watch: false, all: false, list: false, order: 'breadth', bank: false, bankBatchSize: 15, units: false, concise: false
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--repo') args.repo = argv[++i];
    else if (a === '--bundle') args.bundle = argv[++i];
    else if (a === '--part') args.part = argv[++i];
    else if (a === '--watch') args.watch = true;
    else if (a === '--interval') args.interval = Number(argv[++i]);
    else if (a === '--all') args.all = true;
    else if (a === '--scan-root') args.scanRoot = argv[++i];
    else if (a === '--list') args.list = true;
    else if (a === '--units') args.units = true;
    else if (a === '--run-export') args.runExport = argv[++i];
    else if (a === '--order') { args.order = argv[++i]; args.orderGiven = true; }
    else if (a === '--bank') args.bank = true;
    else if (a === '--bank-batch-size') args.bankBatchSize = Number(argv[++i]);
    else if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--concise') args.concise = true;
    else if (a === '--audit') args.audit = true;
    else if (a === '--deep' || a === '--no-lessons' || a === '--json' || a === '--all-bundles') args.auditFlag = true;
    else if (a === '--jobs') args.auditJobs = argv[++i];
    else if (a === '--split-look') args.splitLook = true;
    else if (a === '--no-split-look') args.splitLook = false;
    else if (a === '--one-pass') args.onePass = true;
    else if (a === '--no-calibration-images') args.noCalibrationImages = true;
    else if (a === '--web') args.web = true;
    else if (a === '--review') { args.review = argv[++i]; if (!['manual', 'auto'].includes(args.review)) throw new Error('--review takes manual or auto'); }
    else if (a === '--lessons') args.lessons = argv[++i];
    else if (a === '--target') args.target = argv[++i];
    else if (a === '--interactive') args.interactive = true;
    else if (a === '--interactive-async') args.interactiveAsync = true;
    else if (a === '--shard') args.shard = argv[++i];
    else if (a === '--bundled-docs') args.bundledDocs = true;
    else if (a === '--no-bundled-docs') args.bundledDocs = false;
    else if (a === '--force-rebuild') args.forceRebuild = args.forceRebuild || [];
    else if (a === '--force-scene') (args.forceRebuild = args.forceRebuild || []).push(argv[++i]);
    else throw new Error(`Unknown argument: ${a}`);
  }
  if (args.interactive && args.interactiveAsync) throw new Error('--interactive and --interactive-async together: pick one');
  // --target L0N is --lessons L0N; --target L0N/Scene is --lessons L0N plus a Stage 3 scene filter.
  if (args.target && !args.lessons) {
    const [l, ...sc] = args.target.split('/');
    args.lessons = l;
    if (sc.length) args.scene = sc.join('/');
    // One lesson is named: follow that lesson's own stage, not the bundle's slowest lesson.
    if (!args.orderGiven) args.order = 'depth';
  }
  if (args.order !== 'breadth' && args.order !== 'depth') {
    throw new Error(`--order must be "breadth" or "depth", got "${args.order}"`);
  }
  return args;
}

const HELP = `staged-generation prompt assistant

  --repo <dir>        content-repo-template checkout to scan (default: cwd)
  --bundle <id>        courses/<id> to focus on (default: auto if only one exists;
                          with --watch, auto-follows whichever bundle has the
                          most recently modified file, i.e. whichever an agent
                          is presumably actively working on)
  --part <NN>          multi-part bundle (courses/<id>/parts/<NN>/): work only that part
                          (default: the first part that is not done; a bundle without
                          parts/ ignores this)
  --watch               keep polling and reprint when the next step changes
  --interval <seconds>  poll interval for --watch (default: 5)
  --all                 scan every sibling checkout under --scan-root instead of one
  --scan-root <dir>     root to scan for --all (default: cwd)
  --list                print every currently-unblocked prompt, not just the next one
  --units                print every currently-actionable unit of the current stage as
                          JSON (repo/bundle/track/stage/recommendedConcurrency/blocked/
                          units[]), for a live agent session to dispatch its own
                          subagents per unit instead of a human pasting one prompt at a
                          time. Additive - no-flag/--list/--bank output is unchanged.
                          Combine with --bank for the Bank track's units.
  --run-export <dir>    validate + export the bundle directly (no agent involved)
  --bank                 track the Bank track (BANK-PLAN.md / questions/bank/ /
                          banks/) instead of the lesson track (OUTLINE.md / lessons/
                          / simulations/). Independent of the lesson track and never
                          reads/writes its files - a bundle can be run standalone
                          (chapter source, or source + an existing FIGURES.md, no
                          lessons needed) or interleaved with lesson-track prompts in
                          the same session, in any order. Omitting --bank leaves
                          today's lesson-track-only behavior completely unchanged.
  --bank-batch-size <n>  Stage B2 only: cap on how many still-missing planned
                          questions one pass writes (default: 15). Never splits
                          a single topicId's own run of questions across two
                          passes - a topic with more planned questions than the
                          cap still goes in one pass, whole.
  Output: one line per run - "Read START-HERE.md and follow it. Stage: .. Bundle: ..
  Target: .." - paste it into a fresh session. START-HERE.md routes the agent to
  briefs/<stage>.md. Stage 3 runs as passes, each a fresh subagent on one scene (build, then sanity only if
  the build's quick check failed, then verify); a scene whose design note says
  "Status: look-pending" gets a separate 3-look run (a vision-capable model).
  --audit [--deep]      run audit.mjs: find broken lessons/scenes and list what to regenerate
                          (--deep adds check-scene per lesson folder; also --jobs, --no-lessons,
                          --all-bundles, --json; see audit.mjs --help)
  --split-look          Stage 3, DEFAULT ON (no-op flag): one-run builds and verify skip the look (Look: later) and end at
                        Status: look-pending; the look is a separate fresh-context 3-look run (about 3x cheaper).
  --no-split-look       Stage 3: each unit does its own look instead.
  --one-pass            Stage 3: the old single run per scene (stage3-simulation.md) instead of the default passes
                        (build, then sanity only if the quick check failed, then verify; each a fresh subagent).
  --lessons <L01-L04|L01,L03>  only units of these lessons (lesson-less units stay). With --shard, filtered first.
  --interactive         Stage 1b, Stage 2 (also an Only: top-up), Stage 3 build / one-run units and Bank B1 prompts get two extra lines,
                        "Interactive: on" and a pointer to briefs/reference/interactive.md: a live session where a person answers the
                        agent's questions. bundle.json "interactive": ["1b", "2", "3", "B1"] makes it the default for those stages. Stage 3
                        is never batched then (one scene per prompt, Target:). Sanity, verify, 3-look and the other stages print as usual
                        (one stderr line for 1a, 4, B2, B3). With --units the unit gets "interactive": true. orchestrate.mjs and
                        auto-run.mjs refuse it.
  --interactive-async   The same stages with "Interactive: async": no one is in the session; the agent writes its proposal to
                        courses/<b>/steer/<stage>-<target>.md and stops. A unit whose steer file ends in a "## Proposal" with no "## Answer"
                        after it is NOT printed: "waiting for your choice: <path>" (write your answer under a new "## Answer N" heading, run
                        this again) and the next unit is offered. bundle.json "interactiveMode": "async" makes the sticky stages async
                        (absent = live). With --units a waiting unit has "waiting": "<path>". orchestrate.mjs and auto-run.mjs accept it.
                        A live --interactive prints a waiting unit anyway (you answer in the session). No steer folder: nothing changes.
  --target <L0N>        one lesson only: the same as --lessons L0N --order depth (e.g. --target L02 prints that lesson's next unit).
  --target <L0N/Scene>  Stage 3 only that one scene (lesson filter L0N plus the scene), e.g. --target L01/RampScene.
  Alternative notes     a review note of kind "another way" (tools/operator/notes.mjs, scope L0N/Scene, accepted) on a scene that is done,
                        look-pending or review-pending makes it a Stage 3 build again, with "Alternative: n12", only with --interactive or
                        --interactive-async; otherwise one stderr line names the command to run. The run marks it done (--notes n12).
  --shard <i/n>         a deterministic 1/n slice of the remaining units (two environments get disjoint work: 1/2 and 2/2)
  --web                 add "Web: on" to every invocation: the agent may then use web search (default: never; also needs tools/operator/web-mode.mjs on).
  --review manual       Stage 3: add "Review: manual" to build, sanity and one-run invocations: no tests run, no shoot, no verify
                        or look pass; the scene closes at Status: review-pending and YOU run its tests in the preview (dashboard:
                        Run tests, then Mark reviewed). Default (auto): the usual verify and look passes.
  --no-calibration-images  Stage 3 build: tell the agent to skip brief item E (the three showcase images).
  --no-bundled-docs     turn the default off: the invocation names START-HERE.md and the agent reads the docs one by one.
  --bundled-docs        (default ON, every stage) the invocation points to one prebuilt file, briefs/bundles/<name>.md (START-HERE, the
                        brief and the kit docs it names, joined by tools/staged-generation/build-bundles.mjs) instead of
                        START-HERE.md; the agent reads that one file. A unit with no bundle (an old stub with no Base
                        class line, --one-pass) keeps the START-HERE.md line.
  --force-rebuild       Stage 3: also offer scenes stuck at "Status: building" (a crashed or
                          provider-errored run). Only use after YOU have checked no agent
                          is still running - it overrides the safety that stops two runs
                          from writing the same scene. The new run rewrites the design note.
  --force-scene <s>     like --force-rebuild but only for scenes whose "<lesson>/<scene>"
                          contains <s> (repeatable), e.g. --force-scene L02/Pendulum
  --order <breadth|depth>
      breadth (default): every lesson finishes Stage 2 before Stage 3 starts for
        any of them - keeps consecutive same-shaped prompts close together in
        time, the best case for a prompt-cache hit on their shared doc-reading
        prefix.
      depth: finish a lesson's Stage 2 AND Stage 3 before moving to the next
        lesson - costs that cache locality, but surfaces a systemic Stage 2
        mistake after 1 lesson instead of all of them, and gives Stage 3 a
        finished sibling scene as precedent.
`;

// ---------------------------------------------------------------------------
// filesystem helpers
// ---------------------------------------------------------------------------

function isCheckout(dir) {
  return existsSync(path.join(dir, 'AGENTS.md')) && existsSync(path.join(dir, 'courses'));
}

function listBundles(repoDir) {
  const coursesDir = path.join(repoDir, 'courses');
  if (!existsSync(coursesDir)) return [];
  return readdirSync(coursesDir).filter((name) => {
    const p = path.join(coursesDir, name);
    return statSync(p).isDirectory();
  });
}

function listSiblingCheckouts(scanRoot) {
  return readdirSync(scanRoot)
    .map((name) => path.join(scanRoot, name))
    .filter((p) => {
      try { return statSync(p).isDirectory() && isCheckout(p); } catch { return false; }
    });
}

function walkFiles(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walkFiles(p));
    else out.push(p);
  }
  return out;
}

function pdfOrTxtFilesIn(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root)
    .map((name) => path.join(root, name))
    .filter((p) => statSync(p).isFile() && /\.(pdf|txt|md|pptx|odp|docx|html?)$/i.test(p))
    // a <stem>.txt beside <stem>.pdf is its extracted text (tools/log of Stage 1a), not a second source;
    // likewise a <stem>.pdf/.txt beside an authored <stem>.pptx/.odp/.docx/.html/.md (its conversion)
    .filter((p, _i, all) => !(/\.txt$/i.test(p) && all.includes(p.replace(/\.txt$/i, '.pdf'))))
    .filter((p, _i, all) => !(/\.(pdf|txt)$/i.test(p) && all.some((q) => q !== p && /\.(md|pptx|odp|docx|html?)$/i.test(q) && q.replace(/\.[^.]+$/, '') === p.replace(/\.[^.]+$/, ''))));
}

// A checkout can be shared across many chapters at once (several source PDFs
// sitting at the repo root while each is worked in turn) - a bundle that has
// its own courses/<bundleId>/source/ (populated by tools/operator/start.mjs) resolves
// unambiguously from that alone, with no dependence on what else is at the
// root. Only when no bundle-scoped source exists does this fall back to the
// original repo-root/source/ "exactly one file" rule, unchanged, for the
// older one-checkout-per-bundle convention.
function findSourceCandidate(repoDir, bundleId, part = null) {
  if (bundleId && part) {
    const partCandidates = pdfOrTxtFilesIn(path.join(repoDir, 'courses', bundleId, 'parts', part, 'source'));
    if (partCandidates.length === 1) return partCandidates[0];
  }
  if (bundleId) {
    const bundleCandidates = pdfOrTxtFilesIn(path.join(repoDir, 'courses', bundleId, 'source'));
    if (bundleCandidates.length === 1) return bundleCandidates[0];
  }
  const candidates = [...pdfOrTxtFilesIn(repoDir), ...pdfOrTxtFilesIn(path.join(repoDir, 'source'))];
  return candidates.length === 1 ? candidates[0] : null;
}

// ---------------------------------------------------------------------------
// OUTLINE.md / stub parsing
// ---------------------------------------------------------------------------

function parseLessonList(outlineText) {
  const sectionStart = outlineText.indexOf('## Lesson list');
  const section = sectionStart >= 0 ? outlineText.slice(sectionStart) : outlineText;
  const strict = [...section.matchAll(new RegExp(`^- (${LESSON_ID_SRC}) — (.+?) \\(\\d+ slides?\\)\\s*$`, 'gm'))];
  const matches = strict.length > 0
    ? strict
    : [...section.matchAll(new RegExp(`^-\\s*(${LESSON_ID_SRC})\\s*[—–-]\\s*(.+?)(?:\\s*\\(\\d+\\s*slides?\\))?\\s*$`, 'gm'))];
  return matches.map((m) => ({ id: m[1], title: m[2].trim() }));
}

function lessonsForBundle(bundleDir, part = null) {
  const outlinePath = path.join(workDir(bundleDir, part), 'OUTLINE.md');
  if (!existsSync(outlinePath)) return [];
  return parseLessonList(readFileSync(outlinePath, 'utf8'));
}

// Mirrors parseLessonList()'s strict-then-fallback shape, for BANK-PLAN.md's
// own `## Question list` section (docs/question-bank-generation.md): one
// line per planned question, `- <id> - <type> - <topicId> - <difficulty>`.
function parseQuestionList(planText) {
  const sectionStart = planText.indexOf('## Question list');
  const section = sectionStart >= 0 ? planText.slice(sectionStart) : planText;
  const strict = [...section.matchAll(/^- (\S+) - (\S+) - (\S+) - (easy|medium|hard|olympiad)\s*$/gm)];
  const matches = strict.length > 0
    ? strict
    : [...section.matchAll(/^-\s*(\S+)\s*[—–-]\s*(\S+)\s*[—–-]\s*(\S+)\s*[—–-]\s*(easy|medium|hard|olympiad)\s*$/gm)];
  return matches.map((m) => ({
    id: m[1], type: m[2], topicId: m[3], difficulty: m[4],
  }));
}

// Stage B2's work-splitting unit: accumulate consecutive same-topicId runs
// (Question list order) up to batchSize, never splitting one topic's run
// across two batches (a run bigger than batchSize alone still goes in one
// batch, whole) - keeps duplicate/overlapping drafts of one topic's
// questions from two separate fresh-context passes.
function batchMissingQuestions(missing, batchSize) {
  const runs = [];
  for (const q of missing) {
    const last = runs[runs.length - 1];
    if (last && last.topicId === q.topicId) last.questions.push(q);
    else runs.push({ topicId: q.topicId, questions: [q] });
  }
  const batch = [];
  for (const run of runs) {
    if (batch.length > 0 && batch.length + run.questions.length > batchSize) break;
    batch.push(...run.questions);
  }
  return batch;
}

function plannedQuestionsForBundle(bundleDir) {
  const planPath = path.join(bundleDir, 'BANK-PLAN.md');
  if (!existsSync(planPath)) return [];
  return parseQuestionList(readFileSync(planPath, 'utf8'));
}

// Stage 3 works one scene per agent run (briefs/stage3-simulation.md). A scene's
// progress lives in its design note, <Scene>.design.md, which the run writes
// BEFORE any code: `Status: building` (a run owns it), `look-pending` (built and
// checked, screenshots not yet reviewed - the 3-look pass), `done`. A stub with
// no design note is fresh; a scene .js with no design note is done (written
// before design notes existed).
//
// Shared helpers: stubs whose last line names the same `Shared helper: X.js`
// form a group. While X.js does not exist, only the group's first fresh stub is
// offered, and that run writes X.js; the rest wait. Once X.js exists every fresh
// member is offered (in parallel if you like) with an instruction not to edit
// X.js - so exactly one run ever writes a helper. The writing run puts a
// `Writes helper: X.js` line on its design note; siblings wait while it builds.
const helperPath = resolveHelper;   // sim-test/lib/bundle.mjs: bare name or bundle-relative path

// Operator override (--force-rebuild / --force-scene): scenes whose design note says
// `Status: building` are normally owned by a run and never re-offered. After a human has
// checked that no agent is live, this releases them: they are treated as fresh (the new
// run rewrites the design note). null = off; [] = every building scene; [substr, ...] =
// only scenes whose "<lesson>/<scene>" contains one of the substrings.
let FORCE_REBUILD = null;
function setForceRebuild(spec) { FORCE_REBUILD = spec === undefined || spec === false ? null : spec; }
function isForced(lessonId, scenePath) {
  if (!FORCE_REBUILD) return false;
  if (FORCE_REBUILD.length === 0) return true;
  const key = `${lessonId}/${path.basename(scenePath, '.js')}`;
  return FORCE_REBUILD.some((f) => key.includes(f));
}

// Design-note Status values. building (pass 1 or a single run), sanity and verifying are OWNED by a live run and
// never re-offered; sanity-pending and verify-pending are the handovers between passes (scene-pass.mjs sets them).
// build-pending is set only by release-scenes.mjs: a released build whose code/note exist, offered again as a Resume.
// review-pending: a Review: manual build closed without tests or look; the operator reviews it (never re-offered, like done).
const STATUSES = ['building', 'build-pending', 'sanity-pending', 'sanity', 'verify-pending', 'verifying', 'look-pending', 'review-pending', 'done'];
const OWNED = ['building', 'sanity', 'verifying'];
// Where a released (forced) owned scene continues, from its "## Progress" lines. 'fresh' = build again, with a
// note to resume from the existing design note and code. A `diagnosis:` line (build's full fix list for sanity) is
// not a step: it never decides where the scene continues. Shared with release-scenes.mjs.
function resumeStatus(noteText, status) {
  const prog = (noteText.split(/^## Progress[^\n]*$/m)[1] || '').split(/^## /m)[0];
  const lines = prog.split('\n').filter((l) => /^-\s/.test(l) && !/^-\s+diagnosis\b/i.test(l));
  const last = lines[lines.length - 1] || '';
  if (/\bverify started\b/.test(last) || /\bsanity end\b/.test(last) || /\bbuild end: check-quick PASS\b/.test(last)) return 'verify-pending';
  if (/\bsanity started\b/.test(last) || /\bbuild end: check-quick FAIL\b/.test(last)) return 'sanity-pending';
  // A killed sanity or verify pass with no usable Progress goes back to its own start status.
  if (status === 'sanity') return 'sanity-pending';
  if (status === 'verifying') return 'verify-pending';
  return 'fresh';
}

// What a Resume run must repair: no "## Progress" lines, or note sections a complete build writes but this one lacks.
function staleParts(noteText) {
  const prog = (noteText.split(/^## Progress[^\n]*$/m)[1] || '').split(/^## /m)[0];
  const hasProgress = prog.split('\n').some((l) => /^-\s/.test(l));
  const missing = ['Layout', 'Beats', 'Numbers', 'Tests to run'].filter((h) => !new RegExp(`^## ${h}`, 'mi').test(noteText));
  return !hasProgress || missing.length ? { hasProgress, missing } : null;
}

// Scenes the operator parked (orchestrate.mjs --park): never offered, listed as blocked. Key "<lesson>/<Scene>" -> reason.
let PARKED = {};
function setParked(map) { PARKED = map || {}; }
// Per-bundle, like orchestrate.mjs: build/scratch/<bundle>/orchestrate-parked.json. No bundle resolved: nothing parked.
const parkedFile = (repoDir, bundleId) => path.join(repoDir, 'build', 'scratch', bundleId, 'orchestrate-parked.json');
function loadParked(repoDir, bundleId) {
  if (!bundleId) return {};
  try { return JSON.parse(readFileSync(parkedFile(repoDir, bundleId), 'utf8')); } catch { return {}; }
}

// Alternative notes (kind "another way", accepted, not done): a built scene is offered again as a build, only when interactive is on
// for Stage 3 (the run needs a person or a steer file); otherwise one stderr line per note says how.
const ALT_STATUSES = ['done', 'look-pending', 'review-pending'];
const altHinted = new Set();
const capHinted = new Set();
function alternativeNotes(bundleDir) {
  const by = new Map();
  let notes = [];
  try { notes = loadNotes(bundleDir).filter((n) => n.kind === 'alternative' && n.state === 'accepted'); } catch { /* none */ }
  for (const n of notes) { if (!by.has(n.scope)) by.set(n.scope, []); by.get(n.scope).push(n.id); }
  return by;
}

function sceneStates(bundleDir, lessons) {
  const out = [];
  const alts = alternativeNotes(bundleDir);
  const altMode = alts.size ? interactiveMode(path.dirname(path.dirname(bundleDir)), path.basename(bundleDir), '3') : null;
  for (const lesson of lessons) {
    const dir = path.join(bundleDir, 'simulations', lesson.id);
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.stub.md')).sort()) {
      const stub = path.join(dir, f);
      const scene = stub.replace(/\.stub\.md$/, '.js');
      const design = stub.replace(/\.stub\.md$/, '.design.md');
      let status;
      let writesHelper = false;
      let resume = false;
      let stale = null;
      if (existsSync(design)) {
        const dt = readFileSync(design, 'utf8');
        // `Writes helper: none` (or empty) is not a claim to write one.
        const wh = dt.match(/^Writes helper:[ \t]*(.*)$/mi);
        writesHelper = !!wh && !/^(none|n\/a|-)?[ \t.]*$/i.test(wh[1].trim());
        const m = dt.match(/^Status:[ \t]*([\w-]+)/mi);
        status = m ? m[1].toLowerCase() : 'building';
        if (!STATUSES.includes(status)) status = 'building';
        // An operator release of an owned scene (a crashed or rate-limited run) RESUMES it from the note's
        // Progress lines instead of rewriting it: the pass that died is redone, finished passes are not.
        if (OWNED.includes(status) && isForced(lesson.id, scene)) {
          status = resumeStatus(dt, status);
          if (status === 'fresh') { writesHelper = false; resume = true; }
        } else if (status === 'build-pending') { status = 'fresh'; writesHelper = false; resume = true; }
        if (resume) stale = staleParts(dt);
        // Look cap (lib/lookCap.mjs): a look-pending scene whose last pass changed nothing, or that had 3 passes, is not
        // offered another look pass; it counts as done (log-stage3.mjs closes such passes done from now on).
        if (status === 'look-pending') {
          const cap = lookCap(dt);
          if (cap) { status = 'done'; if (!capHinted.has(design)) { capHinted.add(design); console.error(`look cap: ${lesson.id}/${path.basename(scene, '.js')} is look-pending but ${cap}: counted done, no further look pass`); } }
        }
      } else status = existsSync(scene) ? 'done' : 'fresh';
      let alternative = null;
      const altIds = alts.get(`${lesson.id}/${path.basename(scene, '.js')}`);
      if (altIds && ALT_STATUSES.includes(status)) {
        if (altMode) { status = 'fresh'; writesHelper = false; resume = false; stale = null; alternative = altIds; }
        else for (const id of altIds) {
          if (altHinted.has(id)) continue;
          altHinted.add(id);
          console.error(`note ${id} asks for another way for ${lesson.id}/${path.basename(scene, '.js')}: run next.mjs --interactive --target ${lesson.id}/${path.basename(scene, '.js')}`);
        }
      }
      const stubText = readFileSync(stub, 'utf8');
      const family = familyForStubText(stubText);
      const hm = stubText.match(/^Shared helper:\s*(.+)$/mi);
      const helper = hm && hm[1].trim().toLowerCase() !== 'none' ? hm[1].trim() : null;
      out.push({ lesson: lesson.id, stub, scene, design, status, helper, writesHelper, noHelperLine: !hm, resume, stale, alternative, family, parkedReason: PARKED[`${lesson.id}/${path.basename(scene, '.js')}`] || null });
    }
  }
  return out;
}

// { build: [{ stub, scene, lesson, helper, writesHelper }], look: [...], building: [...], waiting: [...] }
// A helper is found across lesson folders (helperPath), so a group spans them: one run writes it, in any lesson.
const helperKey = (s) => `${path.dirname(path.dirname(s.stub))}|${s.helper}`;

const hasStage3Work = (plan) => plan.build.length || plan.sanity.length || plan.verify.length || plan.look.length;

function stage3Plan(bundleDir, lessons) {
  const all = sceneStates(bundleDir, lessons);
  const plan = { build: [], sanity: [], verify: [], look: [], building: [], waiting: [], done: [], parked: [], review: [] };
  const groups = new Map();
  for (const s of all) {
    if (s.status === 'done') { plan.done.push(s); continue; }
    if (s.status === 'review-pending') { plan.review.push(s); continue; }
    if (s.parkedReason) { plan.parked.push(s); continue; }
    if (s.status === 'look-pending') { plan.look.push(s); continue; }
    if (s.status === 'sanity-pending') { plan.sanity.push(s); continue; }
    if (s.status === 'verify-pending') { plan.verify.push(s); continue; }
    if (OWNED.includes(s.status)) { plan.building.push(s); continue; }
    if (!s.helper) { plan.build.push({ ...s, writesHelper: false }); continue; }
    const key = helperKey(s);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  }
  for (const [key, fresh] of groups) {
    // A helper that is itself another scene of this folder (a variant importing its owner scene, e.g.
    // FactorRectanglesScene-square.js imports FactorRectanglesScene.js): that scene's own run writes it,
    // so the importers wait for it, they never write it.
    const helperAt = helperPath(fresh[0].stub, fresh[0].helper);
    const ownerScene = all.find((x) => path.resolve(x.scene) === path.resolve(helperAt));
    if (ownerScene && ownerScene.parkedReason) { plan.parked.push(...fresh.map((s) => ({ ...s, parkedReason: `its helper scene ${ownerScene.helper || path.basename(ownerScene.scene)} is parked` }))); continue; }
    if (ownerScene && (ownerScene.status === 'fresh' || ownerScene.status === 'building' || ownerScene.status === 'sanity-pending' || ownerScene.status === 'sanity')) {
      plan.waiting.push(...fresh.map((s) => ({ ...s, after: ownerScene.status === 'fresh' ? ownerScene.scene : null })));
      continue;
    }
    const exists = existsSync(helperAt);
    const members = all.filter((x) => x.helper && helperKey(x) === key);
    // The run writing the helper says so on its design note (`Writes helper:`);
    // siblings wait until it is no longer building, so nobody imports a half-written helper.
    const writing = members.some((x) => ['building', 'sanity-pending', 'sanity'].includes(x.status) && (x.writesHelper || !exists));
    if (writing) plan.waiting.push(...fresh);
    else if (exists) plan.build.push(...fresh.map((s) => ({ ...s, writesHelper: false })));
    else {
      // The writer: the stub that says the helper is built with it, else the base scene (not a
      // `-variant`), else the first. Alphabetical order alone puts `X-plant` before `X`.
      const base = (x) => path.basename(x.stub, '.stub.md');
      const says = (x) => { try { return /built with this scene/i.test(readFileSync(x.stub, 'utf8')); } catch { return false; } };
      const w = fresh.find(says) || fresh.find((x) => !fresh.some((y) => y !== x && base(x).startsWith(base(y) + '-')) && fresh.some((y) => y !== x && base(y).startsWith(base(x) + '-'))) || fresh[0];
      plan.build.push({ ...w, writesHelper: true });
      plan.waiting.push(...fresh.filter((x) => x !== w).map((x) => ({ ...x, after: w.scene })));
    }
  }
  return plan;
}

// ---------------------------------------------------------------------------
// state detection
// ---------------------------------------------------------------------------

// Multi-part bundle (courses/<id>/parts/<NN>/, one per book/volume of a big course): each part has its own
// OUTLINE.md / FIGURES.md and its modules are modules/mod-<NN>-*.json. detectState walks the parts in order and
// returns the first one that is not done (or only --part's); state.part says which. A bundle without parts/ is
// one chapter, exactly as before.
let ACTIVE_PART = null;
function setActivePart(p) { ACTIVE_PART = p ? String(p).replace(/^P/i, '').padStart(2, '0') : null; }

function detectState(repoDir, bundleId, order = 'breadth') {
  const bundleDir = path.join(repoDir, 'courses', bundleId);
  const parts = partsOf(bundleDir);
  if (!parts.length) return detectPartState(repoDir, bundleId, order, null);
  if (ACTIVE_PART && !parts.includes(ACTIVE_PART)) {
    return { stage: 'error', bundleDir, reason: `--part ${ACTIVE_PART}: parts here are ${parts.join(', ')}` };
  }
  for (const part of ACTIVE_PART ? [ACTIVE_PART] : parts) {
    const st = detectPartState(repoDir, bundleId, order, part);
    if (st.stage !== 'done') return st;
  }
  return { stage: 'done', bundleDir };
}

// Lessons whose LATEST 3-slides log entry is a FAIL. Two log shapes exist: a "## Stage 3-slides - L0N" section whose text
// starts "PASS|FAIL" (briefs/stage3-slides.md), and a bare line "3-slides: L0N PASS|FAIL ...". A later PASS clears it.
function slidesFailing(bundleDir, lessons) {
  const logP = path.join(bundleDir, 'GENERATION-LOG.md');
  if (!existsSync(logP)) return [];
  const log = readFileSync(logP, 'utf8');
  const latest = new Map();
  for (const sec of log.split(/^(?=## )/m)) {
    const h = sec.match(/^## Stage 3-slides - (L\d+[A-Za-z0-9]*)/);
    const v = h && sec.slice(h[0].length).match(/\b(PASS|FAIL)\b/);
    if (v) latest.set(h[1], v[1]);
    for (const m of sec.matchAll(/^3-slides: (L\d+[A-Za-z0-9]*) (PASS|FAIL)\b/gm)) latest.set(m[1], m[2]);
  }
  return lessons.map((l) => l.id).filter((id) => latest.get(id) === 'FAIL');
}

function detectPartState(repoDir, bundleId, order, part) {
  const bundleDir = path.join(repoDir, 'courses', bundleId);
  const wdir = workDir(bundleDir, part);
  const outlinePath = path.join(wdir, 'OUTLINE.md');
  const modulesDir = path.join(bundleDir, 'modules');
  const isPartModule = (f) => f.endsWith('.json') && (!part || f.startsWith(`mod-${part}-`));

  // A module file already existing means the chapter (or the part) is done, regardless of
  // whether OUTLINE.md exists - covers pre-staged-generation bundles too.
  // With an OUTLINE.md the stages still run (an arcade slide added to a finished chapter needs its top-up
  // and its scene); the module file then makes Stage 4 a no-op ("done") instead of an offer.
  const modulesDone = existsSync(modulesDir) && readdirSync(modulesDir).some(isPartModule);
  if (modulesDone && !existsSync(outlinePath)) {
    return { stage: 'done', bundleDir, part };
  }
  // Stage 4 is offered only while no lesson's latest 3-slides result is a FAIL (OC-07 review): route back to the fix step.
  const stage4 = (ls = []) => {
    if (modulesDone) return { stage: 'done', bundleDir, part };
    const failing = slidesFailing(bundleDir, ls);
    return failing.length ? { stage: 'slides-fix', bundleDir, part, failing } : { stage: 4, bundleDir, part };
  };

  // Stage 1 is split into two independent passes, deliberately runnable on two
  // different models (see docs/staged-generation.md): Stage 1a scans the
  // source/figures and writes FIGURES.md; Stage 1b reads FIGURES.md (never the
  // raw image) and writes OUTLINE.md. FIGURES.md's existence is what
  // distinguishes them - no OUTLINE.md yet.
  if (!existsSync(outlinePath)) {
    const sourceCandidate = findSourceCandidate(repoDir, bundleId, part);
    if (!existsSync(path.join(wdir, 'FIGURES.md'))) {
      return { stage: '1a', bundleDir, sourceCandidate, part };
    }
    return { stage: '1b', bundleDir, sourceCandidate, part };
  }

  // FIGURES.md is a required Stage 1a deliverable (AGENTS.md rule 8) that Stage
  // 1b depends on, but normal progress through 1a -> 1b can't reach this state -
  // it means FIGURES.md was deleted/moved by hand after Stage 1b already ran.
  // Flag it loudly rather than letting Stage 2 start without it (and silently
  // reopen the source images).
  if (!existsSync(path.join(wdir, 'FIGURES.md'))) {
    return { stage: 'error', bundleDir, part, reason: 'OUTLINE.md exists but FIGURES.md is missing - Stage 1a must write it (even if just "no load-bearing figures") before Stage 2 starts. Re-run Stage 1a\'s prompt, or add FIGURES.md by hand if you know it was genuinely skipped for a chapter with no figures worth noting.' };
  }

  const lessons = parseLessonList(readFileSync(outlinePath, 'utf8'));
  if (lessons.length === 0) {
    return { stage: 'error', bundleDir, part, reason: 'OUTLINE.md exists but no "## Lesson list" entries could be parsed - check the format against briefs/stage1b-outline.md (tools/staged-generation/outline-lint.mjs shows what is wrong).' };
  }

  const lessonsDir = path.join(bundleDir, 'lessons');
  const hasLesson = (l) => existsSync(path.join(lessonsDir, `les-${lessonSlug(l.id)}.json`));
  // Arcade practice slides (a01, ...) added to the outline after a lesson was written:
  // the lesson needs a Stage 2 top-up for just those slides (their block file is missing).
  const outlineText = readFileSync(outlinePath, 'utf8');
  const arcadeIds = (l) => {
    const i = outlineText.search(new RegExp(`^## ${l.id}\\b`, 'm'));
    if (i < 0) return [];
    const rest = outlineText.slice(i + 3);
    const j = rest.search(/^## /m);
    return [...(j < 0 ? rest : rest.slice(0, j)).matchAll(/^- \*\*(a\d+)\*\*/gm)].map((m) => m[1]);
  };
  const topupOf = (l) => (hasLesson(l)
    ? arcadeIds(l).filter((id) => !existsSync(path.join(bundleDir, 'blocks', l.id, `blk-${l.id.toLowerCase()}-${id}.json`)))
    : []);
  const needsStage2 = (l) => { const t = topupOf(l); l.topup = t; return !hasLesson(l) || t.length > 0; };

  if (order === 'depth') {
    // Finish a lesson's Stage 2 AND Stage 3 before touching the next lesson -
    // trades away the Stage 2 shared-prefix cache locality of breadth order
    // for catching a systemic Stage 2 mistake after 1 lesson instead of all of
    // them, and giving Stage 3 a finished sibling scene as precedent.
    for (const lesson of lessons) {
      if (needsStage2(lesson)) {
        return { stage: 2, bundleDir, part, lesson, allMissing: lessons.filter((l) => needsStage2(l)) };
      }
      const plan = stage3Plan(bundleDir, [lesson]);
      if (hasStage3Work(plan)) return { stage: 3, bundleDir, part, plan };
      if (plan.building.length || plan.waiting.length || plan.parked.length) return { stage: 'in-progress', bundleDir, part, plan };
    }
    return stage4(lessons);
  }

  // breadth (default): every lesson finishes Stage 2 before Stage 3 starts for
  // any of them - keeps consecutive Stage 2 calls close together in time,
  // which is the best case for a prompt-cache hit on their shared doc-reading
  // prefix (AGENTS.md/generation-playbook.md/voice-and-tone.md/pedagogy.md/
  // SKILL.md/simulation-authoring.md) instead of paying full price per lesson.
  const missing = lessons.filter((l) => needsStage2(l));
  if (missing.length > 0) {
    return { stage: 2, bundleDir, part, lesson: missing[0], allMissing: missing };
  }

  const plan = stage3Plan(bundleDir, lessons);
  if (hasStage3Work(plan)) return { stage: 3, bundleDir, part, plan };
  if (plan.building.length || plan.waiting.length || plan.parked.length) return { stage: 'in-progress', bundleDir, part, plan };

  return stage4(lessons);
}

// ---------------------------------------------------------------------------
// Bank track - independent of detectState() above, never touches OUTLINE.md/
// lessons/*.json/simulations/L0N/. docs/question-bank-generation.md,
// docs/staged-generation.md's "Bank track" section.
// ---------------------------------------------------------------------------

function detectBankState(repoDir, bundleId, batchSize = 15) {
  const bundleDir = path.join(repoDir, 'courses', bundleId);
  const banksDir = path.join(bundleDir, 'banks');
  const planPath = path.join(bundleDir, 'BANK-PLAN.md');

  // v1 scope: one bank per bundle, mirroring "one module per bundle" on the
  // lesson track - multiple banks per bundle is an explicit non-goal.
  if (existsSync(banksDir) && readdirSync(banksDir).some((f) => f.endsWith('.json'))) {
    return { stage: 'done', bundleDir };
  }

  if (!existsSync(planPath)) {
    // hasFigures: reuse a prior lesson pass's FIGURES.md, or inspect fresh.
    return {
      stage: 'b1',
      bundleDir,
      sourceCandidate: findSourceCandidate(repoDir, bundleId),
      hasFigures: existsSync(path.join(bundleDir, 'FIGURES.md')),
    };
  }

  // Same "don't silently skip figures" gate detectState() enforces for the
  // lesson track - a bank sourced from a diagram/data table still needs it.
  if (!existsSync(path.join(bundleDir, 'FIGURES.md'))) {
    return {
      stage: 'error',
      bundleDir,
      reason: 'BANK-PLAN.md exists but FIGURES.md is missing - Stage B1 must write it (even if just "no load-bearing figures") before Stage B2 starts.',
    };
  }

  const questions = parseQuestionList(readFileSync(planPath, 'utf8'));
  if (questions.length === 0) {
    return {
      stage: 'error',
      bundleDir,
      reason: 'BANK-PLAN.md exists but no "## Question list" entries could be parsed - check the format against briefs/bank1-plan.md.',
    };
  }

  const questionsDir = path.join(bundleDir, 'questions', 'bank');
  const hasQuestion = (q) => existsSync(path.join(questionsDir, `${q.id}.json`));
  const missing = questions.filter((q) => !hasQuestion(q));
  if (missing.length > 0) {
    // allMissing is for status reporting across the whole plan; nextBatch
    // (see batchMissingQuestions) drives the actual B2 prompt.
    return {
      stage: 'b2', bundleDir, allMissing: missing, nextBatch: batchMissingQuestions(missing, batchSize),
    };
  }

  return { stage: 'b3', bundleDir };
}

function bank2PromptForBatch(bundleId, batch, remainingCount) {
  return {
    label: `Stage B2 - Bank Questions (${bundleId}): ${batch.length} question(s) (${remainingCount} remaining total)`,
    text: invocation('B2', bundleId, { Target: batch.map((q) => q.id).join(', ') }, docsNameFor('B2')),
  };
}

// --units' B2 enumeration: repeatedly consume batchMissingQuestions() until no
// missing questions remain, so every disjoint same-topicId batch is surfaced as
// its own unit instead of just the next one - no new grouping logic, just
// repetition of what batchMissingQuestions already does per docs/sprints/wip/
// staged-generation-orchestration-design.md §4.1.
function allBankBatches(missing, batchSize) {
  const batches = [];
  let remaining = missing;
  while (remaining.length > 0) {
    const batch = batchMissingQuestions(remaining, batchSize);
    batches.push(batch);
    const batchIds = new Set(batch.map((q) => q.id));
    remaining = remaining.filter((q) => !batchIds.has(q.id));
  }
  return batches;
}

function promptForBankState(bundleId, state) {
  if (state.stage === 'b1') {
    return {
      label: `Stage B1 - Bank Plan (${bundleId})`,
      text: invocation('B1', bundleId, { Source: state.sourceCandidate ? path.relative(state.bundleDir ? path.dirname(path.dirname(state.bundleDir)) : '.', state.sourceCandidate).split(path.sep).join('/') : SOURCE_PLACEHOLDER(bundleId) }, docsNameFor('B1')),
    };
  }
  if (state.stage === 'b2') {
    // One pass = one batch (docs/staged-generation.md's Stage B2).
    return bank2PromptForBatch(bundleId, state.nextBatch, state.allMissing.length);
  }
  if (state.stage === 'b3') {
    return { label: `Stage B3 - Bank Assemble (${bundleId})`, text: invocation('B3', bundleId, {}, docsNameFor('B3')) };
  }
  return null;
}

function bankStatusLine(bundleId, state) {
  if (state.stage === 'done') return `${bundleId}: bank done`;
  if (state.stage === 'error') return `${bundleId}: bank ERROR - ${state.reason}`;
  if (state.stage === 'b1') return `${bundleId}: Bank Stage B1 (plan) needed`;
  if (state.stage === 'b2') return `${bundleId}: Bank Stage B2 needed - ${state.allMissing.length} question(s) remaining, next pass writes ${state.nextBatch.length}`;
  if (state.stage === 'b3') return `${bundleId}: Bank Stage B3 needed - assemble & validate`;
  return `${bundleId}: unknown bank state`;
}

function oneShotBank(args) {
  if (args.all) {
    const scanRoot = path.resolve(args.scanRoot || process.cwd());
    const checkouts = listSiblingCheckouts(scanRoot);
    if (checkouts.length === 0) {
      console.log(`No content-repo-template checkouts found under ${scanRoot}`);
      return;
    }
    for (const repoDir of checkouts) {
      const bundles = listBundles(repoDir);
      if (bundles.length === 0) {
        console.log(`${path.basename(repoDir)}: no bundles under courses/`);
        continue;
      }
      for (const bundleId of bundles) {
        console.log(`${path.basename(repoDir)}/${bankStatusLine(bundleId, detectBankState(repoDir, bundleId, args.bankBatchSize))}`);
      }
    }
    return;
  }

  const repoDir = path.resolve(args.repo || process.cwd());
  if (!isCheckout(repoDir)) {
    console.error(`${repoDir} doesn't look like a content-repo-template checkout (missing AGENTS.md or courses/).`);
    process.exitCode = 1;
    return;
  }

  const bundleId = resolveBundleId(repoDir, args.bundle);
  if (!bundleId) {
    const bundles = listBundles(repoDir);
    if (bundles.length === 0) {
      console.log('No bundles under courses/ yet. Pass --bundle <id> to start one with Bank Stage B1 (or create the bundle via the lesson track first).');
    } else {
      console.log('Multiple bundles found - pass --bundle <id> to pick one:');
      for (const b of bundles) console.log(`  ${bankStatusLine(b, detectBankState(repoDir, b, args.bankBatchSize))}`);
    }
    return;
  }

  const state = detectBankState(repoDir, bundleId, args.bankBatchSize);
  if (state.stage === 'done') {
    console.log(`${bundleId}: bank complete - no prompt to run.`);
    return;
  }
  if (state.stage === 'error') {
    console.error(`${bundleId}: ${state.reason}`);
    process.exitCode = 1;
    return;
  }

  const entry = promptForBankState(bundleId, state);
  const sp = splitWaiting(repoDir, bundleId, entry ? [entry] : [], true);
  for (const l of sp.lines) console.log(l);
  printEntries(withNotes(sp.out, repoDir, bundleId), repoDir, args);
}

function watchLoopBank(args) {
  const intervalMs = (args.interval || 5) * 1000;
  let lastSignature = null;
  let lastBundleId = null;
  console.log(`Watching bank track (poll every ${args.interval || 5}s)... Ctrl-C to stop.`);
  const tick = () => {
    const repoDir = path.resolve(args.repo || process.cwd());
    if (!isCheckout(repoDir)) return;
    const bundleId = resolveBundleId(repoDir, args.bundle, { autoLatest: true });
    if (!bundleId) {
      console.log(`\n[${new Date().toLocaleTimeString()}] No bundles under courses/ yet.`);
      return;
    }
    if (bundleId !== lastBundleId) {
      if (lastBundleId !== null) console.log(`\n[${new Date().toLocaleTimeString()}] switched to most-recently-active bundle: ${bundleId}`);
      lastBundleId = bundleId;
      lastSignature = null;
    }
    const state = detectBankState(repoDir, bundleId, args.bankBatchSize);
    const signature = JSON.stringify(state, (k, v) => (k === 'bundleDir' ? undefined : v));
    if (signature !== lastSignature) {
      lastSignature = signature;
      if (state.stage === 'done') {
        console.log(`\n[${new Date().toLocaleTimeString()}] ${bundleId}: bank complete.`);
      } else if (state.stage === 'error') {
        console.error(`\n[${new Date().toLocaleTimeString()}] ${bundleId}: ${state.reason}`);
      } else {
        const entry = promptForBankState(bundleId, state);
        console.log(`\n[${new Date().toLocaleTimeString()}] next bank step changed:`);
        printEntries(entry ? [entry] : [], repoDir, args);
      }
    }
  };
  tick();
  setInterval(tick, intervalMs);
}

// The bundle containing the single most-recently-modified file anywhere under
// courses/<bundle> - i.e. whichever bundle an agent most recently touched.
function mostRecentlyActiveBundle(repoDir, bundles) {
  let latest = null;
  let latestMtime = -Infinity;
  for (const b of bundles) {
    for (const f of walkFiles(path.join(repoDir, 'courses', b))) {
      const { mtimeMs } = statSync(f);
      if (mtimeMs > latestMtime) {
        latestMtime = mtimeMs;
        latest = b;
      }
    }
  }
  return latest;
}

function resolveBundleId(repoDir, requested, { autoLatest = false } = {}) {
  const bundles = listBundles(repoDir);
  if (requested) {
    // A new bundle is legitimate (Stage 1a starts one), a typo is not: say so, on stderr, once.
    if (bundles.length && !bundles.includes(requested)) console.error(`note: courses/${requested} does not exist (bundles here: ${bundles.join(', ')}). If "${requested}" is a typo, fix --bundle; a new bundle starts at Stage 1a.`);
    return requested;
  }
  if (bundles.length === 1) return bundles[0];
  if (bundles.length > 1 && autoLatest) return mostRecentlyActiveBundle(repoDir, bundles);
  return null; // ambiguous or none yet - caller decides what to do
}

// ---------------------------------------------------------------------------
// invocations: one line pointing at START-HERE.md, which routes to the brief
// ---------------------------------------------------------------------------

let SPLIT_LOOK = true;   // default ON; --no-split-look turns it off
let ONE_PASS = false;
let NO_CALIB = false;
let UNIT_FILTER = { lessons: null, shard: null, scene: null };   // --lessons L01-L04 / --shard i/n: disjoint unit sets for parallel environments
let WEB = false;   // --web: invocations carry `Web: on` (the only way an agent may search the web)
let REVIEW = null;   // --review manual: Stage 3 build/sanity/one-run invocations carry `Review: manual`
let BUNDLED = true;   // default ON; --no-bundled-docs turns it off
let BUNDLE_REPO = null;

const SOURCE_PLACEHOLDER = (bundleId) => `<FILL IN - could not find exactly one source file (.pdf/.txt/.md/.pptx/.docx/.html) at courses/${bundleId}/source/, the repo root, or source/ - run tools/operator/start.mjs to disambiguate>`;

function setSplitLook(on) { SPLIT_LOOK = !!on; }
function setOnePass(on) { ONE_PASS = !!on; }
function setNoCalibration(on) { NO_CALIB = !!on; }
function setWeb(on) { WEB = !!on; }
function setReview(mode) { REVIEW = mode === 'manual' ? 'manual' : null; }
function setUnitFilter(lessons, shard, scene = null) {
  UNIT_FILTER = { lessons: lessons ? parseLessonRange(lessons) : null, shard: shard ? parseShard(shard) : null, scene: scene || null };
}
const LCODE = LESSON_ID_RE;
// "L01-L04", "L01,L03", "L02" -> Set of codes. A range expands only plain L<NN> codes.
function parseLessonRange(s) {
  const out = new Set();
  for (const part of String(s).split(',').map((x) => x.trim().toUpperCase()).filter(Boolean)) {
    const r = /^L(\d\d)-L(\d\d)$/.exec(part);
    if (r) for (let i = Number(r[1]); i <= Number(r[2]); i++) out.add(`L${String(i).padStart(2, '0')}`);
    else if (LCODE.test(part)) out.add(part);
    else throw new Error(`--lessons: "${part}" is not L01, C01, L01-L04 or L03-07-01`);
  }
  return out;
}
function parseShard(s) {
  const m = /^(\d+)\/(\d+)$/.exec(s);
  if (!m || Number(m[1]) < 1 || Number(m[1]) > Number(m[2])) throw new Error('--shard takes i/n with 1 <= i <= n, e.g. 2/3');
  return { i: Number(m[1]), n: Number(m[2]) };
}
const lessonOfUnit = (u) => (new RegExp(`(?:^|:)(${LESSON_ID_SRC})(?::|$)`).exec(u.id || '') || [])[1] || null;
// Applied to every units list: the lesson filter first, then a deterministic split of what is left (sorted by id).
function filterUnits(units) {
  let out = units;
  if (UNIT_FILTER.lessons) out = out.filter((u) => { const l = lessonOfUnit(u); return !l || UNIT_FILTER.lessons.has(l); });
  // --target L01/Scene: Stage 3 units (stage3, stage3-sanity, ...) keep only those that carry that scene; other units stay.
  if (UNIT_FILTER.scene) out = out.filter((u) => { const m = /^stage3[^:]*:[^:]+:(.+)$/.exec(u.id || ''); return !m || m[1].split('+').includes(UNIT_FILTER.scene); });
  if (UNIT_FILTER.shard) {
    const { i, n } = UNIT_FILTER.shard;
    const sorted = [...out].sort((a, b) => String(a.id).localeCompare(String(b.id)));
    const keep = new Set(sorted.filter((_, k) => k % n === i - 1).map((u) => u.id));
    out = out.filter((u) => keep.has(u.id));
  }
  return out;
}
function setBundledDocs(on, repoDir) { BUNDLED = !!on; BUNDLE_REPO = repoDir ? path.resolve(repoDir) : null; }
// Bundles are on by default, so a stale one would be served silently: one stderr line if build-bundles --check fails.
function warnStaleBundles(repoDir) {
  if (!BUNDLED) return;
  const tool = path.join(repoDir, 'tools', 'staged-generation', 'build-bundles.mjs');
  if (!existsSync(tool)) return;
  const r = spawnSync(process.execPath, [tool, '--check', '--repo', repoDir], { encoding: 'utf8' });
  if (r.status === 1) console.error('WARNING: briefs/bundles/ is out of date with its sources. Run: node tools/staged-generation/build-bundles.mjs   (or pass --no-bundled-docs)');
}

// courses/<bundle>/ or courses/<bundle>/parts/<NN>/ : where a part's OUTLINE.md / FIGURES.md live
function wrelBase(bundleId, part) { return `courses/${bundleId}/${part ? `parts/${part}/` : ''}`; }

function srcRel(repoDir, state, bundleId) {
  return state.sourceCandidate ? path.relative(path.resolve(repoDir), state.sourceCandidate).split(path.sep).join('/') : SOURCE_PLACEHOLDER(bundleId);
}

// By default (not with --no-bundled-docs) and a built bundle file for this unit, the first sentence points to that ONE file (it holds
// START-HERE.md, the brief and the kit docs the brief names); otherwise the START-HERE.md line, as always.
function bundleLine(docsName) {
  if (!BUNDLED || !docsName || !BUNDLE_REPO) return null;
  const f = path.join(BUNDLE_REPO, 'briefs', 'bundles', `${docsName}.md`);
  if (!existsSync(f)) return null;
  const text = readFileSync(f, 'utf8');
  const lines = text.split('\n').length;
  // Under the smallest read tool limit we see (opencode truncates near 53 KB; ~50 KB here) ONE call with no limit/offset reads it all; a limit
  // argument only costs a second call. Larger bundles keep the chunk wording.
  const how = Buffer.byteLength(text) <= 50000 && lines <= 1200 ? 'read it whole with ONE Read call, no limit or offset' : 'read it whole; if your read tool stops early (near 53 KB, about 300 lines), continue from the last line it returned, never from line 1';
  return `Read briefs/bundles/${docsName}.md (${lines} lines; ${how}) and follow it: it holds START-HERE.md, your brief and the kit docs your brief names, so do not open those files again.`;
}

// Operator directions (review-notes.json, kind direction, accepted and not done) whose scope covers this target: ids for "Notes:".
// Stage 2: the lesson; Stage 3: each scene (slide directions reach the scenes their slide attaches); 1b: every scope; else bundle-wide only.
function directionIds(stage, bundleId, fields, bundleDir) {
  const B = bundleDir || (BUNDLE_REPO ? path.join(BUNDLE_REPO, 'courses', bundleId) : null);
  if (!B || !existsSync(path.join(B, 'review-notes.json'))) return [];
  let scopes = ['bundle'];
  if (stage === '2' && fields.Target) scopes = [String(fields.Target)];
  if (stage === '3' || stage === '3-look') {
    scopes = String(fields.Targets || fields.Target || '').split(',').map((x) => x.trim().replace(/^simulations\//, ''))
      .map((x) => /^(L[\dA-Z-]+)\/(.+?)\.(stub\.md|js)$/i.exec(x)).filter(Boolean).map((m) => `${m[1]}/${m[2]}`);
    if (!scopes.length) scopes = ['bundle'];
  }
  try { return directionsFor(B, scopes, { stage, any: stage === '1b' }).map((d) => d.id); } catch { return []; }
}

function invocation(stage, bundleId, fields = {}, docsName = null, bundleDir = null) {
  const parts = [`${bundleLine(docsName) || 'Read START-HERE.md and follow it.'} Stage: ${stage}. Bundle: ${bundleId}.`];
  const manual = stage === '3' && REVIEW === 'manual' && fields.Pass !== 'verify';
  if (manual) fields = { ...fields, Look: null, Review: 'manual' };
  for (const [k, v] of Object.entries(fields)) if (v) parts.push(`${k}: ${v}.`);
  const notes = directionIds(stage, bundleId, fields, bundleDir);
  if (notes.length) parts.push(`Notes: ${notes.join(',')}.`);
  if (WEB) parts.push('Web: on.');
  // Stage 3: the target scene name once more, last, so a long prompt cannot be misread as a shorter sibling name
  // ("TermClockScene-return" is a scene of its own, not TermClockScene).
  const files = String(fields.Targets || fields.Target || '').split(',').map((x) => x.trim()).filter((x) => /\.(stub\.md|js)$/.test(x));
  if ((stage === '3' || stage === '3-look') && files.length) {
    const names = files.map((f) => path.basename(f).replace(/\.(stub\.md|js)$/, ''));
    // "(not X: a different scene)" only when a scene X really exists beside the target (else it names a ghost).
    const exists = (f, b) => !bundleDir || ['.stub.md', '.js', '.design.md'].some((x) => existsSync(path.join(bundleDir, path.dirname(f), b + x)));
    const notes = files.filter((f, i) => names[i].includes('-')).map((f) => [f, path.basename(f).replace(/\.(stub\.md|js)$/, '').split('-')[0]]).filter(([f, b]) => !names.includes(b) && exists(f, b)).map(([, b]) => b);
    parts.push(`Target scene${names.length > 1 ? 's, in this order' : ''}: ${names.join(', ')}${notes.length ? ` (not ${[...new Set(notes)].join(', ')}: a different scene)` : ''}.`);
  }
  return parts.join(' ');
}

function slidesFixEntry(bundleId, state) {
  const les = state.failing.join(', ');
  return { label: `Stage 3-slides FIX (${bundleId}${state.part ? ` part ${state.part}` : ''}) - Stage 4 blocked`, text: `Stage 4 is blocked: the latest 3-slides result of ${les} is a FAIL. Fix the failing scenes (briefs/stage3-look.md, scene Requests from the 3-slides report), then re-run 3-slides for each (node tools/operator/slide-shots.mjs --bundle ${bundleId} --lesson les-0N; briefs/stage3-slides.md) until it logs PASS. Then run next.mjs again.` };
}

function promptForState(repoDir, bundleId, state) {
  if (state.stage === '1a') {
    return { label: `Stage 1a - Source scan (${bundleId}${state.part ? ` part ${state.part}` : ''})`, text: invocation('1a', bundleId, { Part: state.part, Source: srcRel(repoDir, state, bundleId) }, docsNameFor('1a')) };
  }
  if (state.stage === '1b') {
    return { label: `Stage 1b - Outline (${bundleId}${state.part ? ` part ${state.part}` : ''})`, text: invocation('1b', bundleId, { Part: state.part, Source: srcRel(repoDir, state, bundleId) }, docsNameFor('1b')) };
  }
  if (state.stage === 2) return stage2PromptForLesson(bundleId, state.lesson);
  if (state.stage === 3) {
    const repoPath = path.resolve(repoDir);
    const first = state.plan.build[0];
    if (first) return stage3PromptForScene(repoPath, bundleId, first);
    if (state.plan.sanity[0]) return stage3PassPrompt(repoPath, bundleId, state.plan.sanity[0], 'sanity');
    if (state.plan.verify[0]) return stage3PassPrompt(repoPath, bundleId, state.plan.verify[0], 'verify');
    return stage3LookPrompt(repoPath, bundleId, state.plan.look[0]);
  }
  if (state.stage === 'slides-fix') return slidesFixEntry(bundleId, state);
  if (state.stage === 4) return { label: `Stage 4 - Module & validate (${bundleId}${state.part ? ` part ${state.part}` : ''})`, text: invocation('4', bundleId, { Part: state.part }, docsNameFor('4')) };
  return null;
}

// Bundle file (briefs/bundles/<name>.md) for a unit; null when it has none (the START-HERE.md line is used).
function docsNameFor(stage, { pass = null, family = null } = {}) {
  if (stage === '1a') return 'stage1a';
  if (stage === '1b') return 'stage1b';
  if (stage === '2') return 'stage2';
  if (stage === '4') return 'stage4';
  if (stage === 'B1') return 'bank1';
  if (stage === 'B2') return 'bank2';
  if (stage === 'B3') return 'bank3';
  if (stage === '3-look') return 'stage3-look';
  if (stage === '3') {
    if (family === 'arcade') return 'stage3-arcade';
    if (pass === 'one' && family) return `stage3-simulation-${family}`;
    if (pass === 'sanity') return 'stage3-sanity';
    if ((pass === 'build' || pass === 'verify') && family) return `stage3-${pass}-${family}`;
  }
  return null;
}

function stage2PromptForLesson(bundleId, lesson) {
  const top = lesson.topup?.length ? lesson.topup.join(', ') : null;
  return {
    label: `Stage 2 - Lesson ${lesson.id}${top ? ` (arcade top-up: ${top})` : ''} (${bundleId})`,
    text: invocation('2', bundleId, { Target: lesson.id, Only: top ? `arcade slide(s) ${top} (the lesson already exists: add just those block(s), stub(s) and lesson entries, change nothing else)` : null }, docsNameFor('2')),
  };
}

// --scenes-per-agent: one subagent builds several scenes of the same lesson in one session (the doc reads and
// the kit reading are paid once; scenes of a lesson share a story and a vocabulary). 1 = one scene per run.
let SCENE_BATCH = 1;
function setSceneBatch(n) { SCENE_BATCH = n === Infinity ? Infinity : Math.max(1, Math.floor(Number(n)) || 1); }

// --sanity-per-agent / --verify-per-agent / --look-per-agent: one subagent runs several scenes of the same lesson through
// the SAME pass, one scene at a time, each closed before the next (docs and kit are read once). 1 = one scene per run.
const PASS_BATCH = { sanity: 1, verify: 1, look: 1 };
function setPassBatch(kind, n) { PASS_BATCH[kind] = n === Infinity ? Infinity : Math.max(1, Math.floor(Number(n)) || 1); }
// Consecutive units of one lesson (and, for verify, one docs family: the bundle is per family) share a run, up to size.
function batchPasses(list, size, byFamily) {
  const out = [];
  let cur = null;
  for (const u of list) {
    if (!cur || cur.lesson !== u.lesson || (byFamily && cur.family !== u.family) || cur.units.length >= size) { cur = { lesson: u.lesson, family: u.family, units: [] }; out.push(cur); }
    cur.units.push(u);
  }
  return out.map((x) => x.units);
}
const BATCH_PASS_TEXT = 'Several scenes in one run: do the WHOLE pass for one scene (its start line, edits, checks and close lines) and close it before you open the next; never read or reuse a sibling scene (open the files of the next scene only after the close line of the previous one has printed), never mix their notes or logs; one close call per scene (its own --target); a scene that hits a cap or fails is logged as such and does not stop the others; a Look pass views the images of one scene at a time. Report one block per scene, in the order given';

// A scene waiting on a helper (or an owner scene) that THIS dispatch builds can ride in the same run, after it.
// Clusters (a build unit plus its riders: every scene that imports or subclasses the same helper, owner first) are
// never split and ALWAYS ride together, even when the cluster is larger than --scenes-per-agent or the cap is 1
// (the cap only limits how many unrelated clusters of one lesson share a run). A cluster may span lesson folders;
// unrelated clusters batch only inside one lesson folder.
function batchBuilds(plan, size, solo = false) {
  const builds = plan.build;
  // An arcade scene is a small one-run job (no passes) and a batch shares one bundle of docs: both batch only with their own kind.
  const riders = new Map();
  const absorbed = new Set();
  for (const w of solo ? [] : plan.waiting) {
    if (w.after && builds.some((b) => b.scene === w.after)) {
      if (!riders.has(w.after)) riders.set(w.after, []);
      riders.get(w.after).push(w);
      absorbed.add(w.scene);
    }
  }
  const batches = [];
  let cur = null;
  for (const b of builds) {
    const cluster = [b, ...(riders.get(b.scene) || [])];
    if (!cur || solo || cur.lesson !== b.lesson || cur.family !== b.family || b.family === 'arcade' || cur.units.length + cluster.length > size) {
      cur = { lesson: b.lesson, family: b.family, units: [] };
      batches.push(cur);
    }
    cur.units.push(...cluster);
  }
  return { batches: batches.map((x) => x.units), absorbed };
}

function stage3PromptForBatch(repoPath, bundleId, units) {
  if (units.length === 1) return stage3PromptForScene(repoPath, bundleId, units[0]);
  const bundleDir = path.join(repoPath, 'courses', bundleId);
  const rel = (u) => path.relative(bundleDir, u.stub).split(path.sep).join('/');
  const helpers = [];
  const hAt = (u) => helperPath(u.stub, u.helper);
  const hRel = (u) => path.relative(bundleDir, hAt(u)).split(path.sep).join('/');
  for (const u of units) {
    if (!u.helper || helpers.some((h) => h.key === u.helper)) continue;
    const owner = units.find((x) => path.resolve(x.scene) === path.resolve(hAt(u)));
    const writer = units.find((x) => x.writesHelper && x.helper === u.helper);
    helpers.push({ key: u.helper, name: `${u.helper} at ${hRel(u)}`, how: owner ? `is the scene ${path.basename(owner.stub, '.stub.md')}, built first in this run: later scenes import it, never rewrite it`
      : writer ? `not written yet: you write it in ${path.basename(writer.stub, '.stub.md')}, FIRST and small; before scenes 2 and up run ident-lint on it and a smoke import (setup() in the fake DOM); later scenes import it, do not edit it`
      : 'exists: import it, do not edit it' });
  }
  const names = units.map((u) => path.basename(u.stub, '.stub.md'));
  return {
    label: `Stage 3 - Simulations (${bundleId}): ${names.join(' + ')}`,
    text: invocation('3', bundleId, {
      Targets: units.map(rel).join(', '),
      Helper: helpers.length ? helpers.map((h) => `${h.name} (${h.how})`).join('; ') : null,
      Pass: oneRun(units[0]) ? null : 'build',
      Resume: units.some((u) => u.resume) ? resumeText(units) : null,
      Skip: NO_CALIB ? SKIP_CALIB : null,
      Look: oneRun(units[0]) && SPLIT_LOOK ? LOOK_LATER : null,
    }, oneRun(units[0]) ? (units[0].family === 'arcade' ? docsNameFor('3', { family: 'arcade' }) : docsNameFor('3', { pass: 'one', family: units[0].family })) : docsNameFor('3', { pass: 'build', family: units[0].family }), bundleDir),
  };
}

// A unit runs as one piece (stage3-simulation.md) with --one-pass, and always for an arcade scene (a small config job).
const oneRun = (u) => ONE_PASS || u.family === 'arcade';

// Look: later. A verify or one-run unit leaves the viewing to a separate 3-look run.
const LOOK_LATER = 'later (no shoot, no peek; close with Status: look-pending; a separate 3-look run does the look)';
const RESUME_TEXT = 'the design note already exists: read it and its Progress lines, do not rewrite it, redo only what is not marked done; first run scene-pass.mjs start build (usage: scene-pass.mjs --bundle B --target L0N/Scene progress|look|start|end|expect ...)';
// A stale note (no Progress, or sections a complete build writes are missing) gets the exact fix-up, once, in the prompt.
function resumeText(units) {
  const st = units.filter((u) => u.resume && u.stale);
  if (!st.length) return RESUME_TEXT;
  const what = st.map((u) => `${path.basename(u.scene, '.js')}: ${[!u.stale.hasProgress && 'no ## Progress', u.stale.missing.length && `lacks ${u.stale.missing.map((m) => `## ${m}`).join(', ')}`].filter(Boolean).join(', ')}`).join('; ');
  const code = st.every((u) => existsSync(u.scene))
    ? 'run ident-lint and check-scene --no-browser --no-probes on the code that exists'
    : `${st.some((u) => existsSync(u.scene)) ? 'for a scene with no .js yet: write the code from the note. Others: ' : 'there is no scene .js yet: write it from the note (the note is the design). '}run ident-lint and check-scene --no-browser --no-probes on code that exists`;
  return `${RESUME_TEXT}. Stale note (${what}): ${code}, add Progress lines (scene-pass progress) for what exists, APPEND the missing sections to the note (old headings map: "Model numbers" is ## Numbers, a beats table without a heading is ## Beats), then write the tests file and run scene-pass end build; do not re-stamp Started (scene-pass start build does it), do not rewrite the note or the code, do not explore kit source`;
}
const SKIP_CALIB = 'brief item E (the three showcase images)';

// A sanity or verify pass is one fresh subagent on one scene (batched only with --sanity-per-agent / --verify-per-agent): the build pass left its handover in
// the design note (Status and Progress lines, set by scene-pass.mjs).
function stage3PassPrompt(repoPath, bundleId, unitOrUnits, pass) {
  const bundleDir = path.join(repoPath, 'courses', bundleId);
  const units = [].concat(unitOrUnits), unit = units[0];
  const rel = (u) => path.relative(bundleDir, u.stub).split(path.sep).join('/');
  return {
    label: `Stage 3 ${pass} pass (${bundleId}): ${units.map((u) => path.basename(u.scene, '.js')).join(' + ')}`,
    text: invocation('3', bundleId, {
      [units.length > 1 ? 'Targets' : 'Target']: units.map(rel).join(', '),
      Pass: pass,
      Look: pass === 'verify' && SPLIT_LOOK ? LOOK_LATER : null,
      Batch: units.length > 1 ? BATCH_PASS_TEXT : null,
    }, docsNameFor('3', { pass, family: unit.family }), bundleDir),
  };
}

function stage3PromptForScene(repoPath, bundleId, unit) {
  const bundleDir = path.join(repoPath, 'courses', bundleId);
  const target = path.relative(bundleDir, unit.stub).split(path.sep).join('/');
  const helper = unit.helper
    ? `${unit.helper} at ${path.relative(bundleDir, helperPath(unit.stub, unit.helper)).split(path.sep).join('/')} (${unit.writesHelper ? 'not written yet: you write it, other scenes will import it' : 'exists: import it, do not edit it'})`
    : null;
  return {
    label: `Stage 3 - Simulation (${bundleId}): ${path.basename(unit.stub, '.stub.md')}${unit.writesHelper ? ` + ${unit.helper}` : ''}`,
    text: invocation('3', bundleId, { Target: target, Helper: helper, Pass: oneRun(unit) ? null : 'build', Alternative: unit.alternative ? unit.alternative.join(',') : null, Resume: unit.resume ? resumeText([unit]) : null, Skip: NO_CALIB ? SKIP_CALIB : null, Look: oneRun(unit) && SPLIT_LOOK ? LOOK_LATER : null }, oneRun(unit) ? (unit.family === 'arcade' ? docsNameFor('3', { family: 'arcade' }) : docsNameFor('3', { pass: 'one', family: unit.family })) : docsNameFor('3', { pass: 'build', family: unit.family }), bundleDir),
  };
}

// A look unit is one PASS on one scene (fresh agent: one shoot, one view, one edit batch); a scene still
// look-pending afterwards comes back as the next pass on the re-run. Batched only with --look-per-agent (images of earlier scenes ride later turns).
function stage3LookPrompt(repoPath, bundleId, unitOrUnits) {
  const bundleDir = path.join(repoPath, 'courses', bundleId);
  const units = [].concat(unitOrUnits), unit = units[0];
  return {
    label: `Stage 3-look - Look pass (${bundleId}): ${units.map((u) => path.basename(u.scene, '.js')).join(' + ')}`,
    text: invocation('3-look', bundleId, { [units.length > 1 ? 'Targets' : 'Target']: units.map((u) => path.relative(bundleDir, u.scene).split(path.sep).join('/')).join(', '), Batch: units.length > 1 ? BATCH_PASS_TEXT : null, Vision: 'needed: view the images yourself; if you cannot view images, stop and report LOOK: no vision (change nothing)' }, docsNameFor('3-look'), bundleDir),
  };
}

// Every currently-actionable Stage 3 run across the bundle (both orders), as
// prompt entries: one per scene to build, one per scene awaiting its look review.
function stage3Units(repoDir, bundleDir, part = null) {
  const plan = stage3Plan(bundleDir, lessonsForBundle(bundleDir, part));
  const repoPath = path.resolve(repoDir);
  const bundleId = path.basename(bundleDir);
  const { batches, absorbed } = batchBuilds(plan, SCENE_BATCH, !!interactiveMode(repoPath, bundleId, '3'));   // interactive: one scene per prompt
  const out = [
    ...batches.map((us) => ({ kind: 'build', unit: us[0], units: us, absorbed, entry: stage3PromptForBatch(repoPath, bundleId, us) })),
    ...batchPasses(plan.sanity, PASS_BATCH.sanity, false).map((us) => ({ kind: 'sanity', unit: us[0], units: us, entry: stage3PassPrompt(repoPath, bundleId, us, 'sanity') })),
    ...batchPasses(plan.verify, PASS_BATCH.verify, true).map((us) => ({ kind: 'verify', unit: us[0], units: us, entry: stage3PassPrompt(repoPath, bundleId, us, 'verify') })),
    ...batchPasses(plan.look, PASS_BATCH.look, false).map((us) => ({ kind: 'look', unit: us[0], units: us, entry: stage3LookPrompt(repoPath, bundleId, us) })),
  ];
  return out;
}

function allPromptsForState(repoDir, bundleId, state) {
  if (state.stage !== 3) {
    const p = promptForState(repoDir, bundleId, state);
    return p ? [p] : [];
  }
  return stage3Units(repoDir, state.bundleDir, state.part).map((x) => x.entry);
}

// ---------------------------------------------------------------------------
// --units mode: docs/sprints/wip/staged-generation-orchestration-design.md §4.1.
// Machine-readable enumeration of every currently-actionable unit of the
// current stage, for a live agent session to dispatch (its own subagents) per
// unit instead of a human pasting one prompt at a time. Additive - does not
// change any existing no-flag/--list/--bank output.
// ---------------------------------------------------------------------------

function checkCmd(kind, u, rel) {
  const full = `node tools/sim-test/check-scene.mjs ${rel(u.scene)} --no-count`;
  const passed = (k) => `node tools/staged-generation/scene-pass.mjs --bundle ${rel(u.stub).split(path.sep)[1]} --target ${u.lesson}/${path.basename(u.scene, '.js')} expect ${k}`;
  if (kind === 'build' && !oneRun(u)) return passed('build');
  if (kind === 'sanity') return passed('sanity');
  if (kind === 'verify') return `${full} && ${passed('verify')}`;
  return full;
}

function unitForStage3(repoDir, x) {
  const repoPath = path.resolve(repoDir);
  const rel = (p) => path.relative(repoPath, p);
  const us = x.units;
  const names = us.map((u) => path.basename(u.scene, '.js'));
  return {
    id: `stage3${x.kind === 'build' ? '' : '-' + x.kind}:${us[0].lesson}:${names.join('+')}`,
    stage: x.kind === 'build' ? 3 : '3-' + x.kind,
    label: x.entry.label,
    prompt: x.entry.text,
    sourcePaths: us.map((u) => rel(u.stub)),
    outputPaths: us.flatMap((u) => [rel(u.scene), rel(u.design),
      ...(x.kind === 'build' && u.writesHelper && u.helper ? [rel(helperPath(u.stub, u.helper))] : [])]),
    // A build or sanity pass is checked by its handover (the design note moved on: its own quick check may legitimately
    // say FAIL, the next pass handles that); a verify pass, a one-run scene and a look by the full check-scene.
    check: us.map((u) => checkCmd(x.kind, u, rel)).join(' && '),
    checks: us.map((u) => ({ key: path.relative(path.join(repoPath, 'courses'), u.stub).split(path.sep).slice(1).join('/'), cmd: checkCmd(x.kind, u, rel) })),
    ...(us.some((u) => u.alternative) ? { alternative: us.flatMap((u) => u.alternative || []) } : {}),
    parallelSafe: true,
    // cheap cost estimate the orchestrator sorts on (longest first): scenes in the unit, then arcade/game/helper-writer
    cost: [us.length, us.some((u) => u.family === 'arcade' || u.family === 'game' || u.writesHelper) ? 1 : 0],
  };
}

function unitsForState(repoDir, bundleId, order) {
  const r = unitsForStateRaw(repoDir, bundleId, order);
  if (!(r && r.units)) return r;
  return { ...r, units: filterUnits(r.units).map((u) => decorateUnit(repoDir, bundleId, u)) };
}
function unitsForStateRaw(repoDir, bundleId, order) {
  const state = detectState(repoDir, bundleId, order);
  const repoPath = path.resolve(repoDir);
  const repoRel = (p) => path.relative(path.resolve(repoDir), p);
  const absorbedScenes = state.plan && state.stage === 3 ? batchBuilds(state.plan, SCENE_BATCH, !!interactiveMode(repoPath, bundleId, '3')).absorbed : new Set();
  const nameOf = (u) => path.basename(u.scene, '.js');
  const blocked = state.plan ? [
    ...state.plan.building.map((u) => ({ scene: repoRel(u.scene), lesson: u.lesson, name: nameOf(u), status: u.status, reason: 'a run owns it (design note Status: building)' })),
    ...state.plan.waiting.filter((u) => !absorbedScenes.has(u.scene)).map((u) => ({ scene: repoRel(u.scene), lesson: u.lesson, name: nameOf(u), status: 'waiting', reason: `waiting for its shared helper ${u.helper}` })),
    ...state.plan.parked.map((u) => ({ scene: repoRel(u.scene), lesson: u.lesson, name: nameOf(u), status: 'parked', reason: `parked: ${u.parkedReason}` })),
  ] : [];

  if (state.stage === 'done') return { stage: 'done', units: [] };
  if (state.stage === 'error') return { stage: 'error', reason: state.reason, units: [] };
  if (state.stage === 'slides-fix') return { stage: 'slides-fix', failing: state.failing, reason: slidesFixEntry(bundleId, state).text, units: [] };

  // detectState's 'in-progress' means: no fresh Stage 3 groups remain, only
  // lessons an agent is already mid-flight on - same underlying stage (3),
  // just nothing left to hand out right now.
  if (state.stage === 'in-progress') {
    return {
      repo: repoPath, bundle: bundleId, track: 'lesson', order, stage: 3,
      recommendedConcurrency: 'parallel', blocked, units: [],
    };
  }

  let units = [];
  let recommendedConcurrency = 'sequential';

  if (state.stage === '1a') {
    const entry = promptForState(repoDir, bundleId, state);
    units = [{
      id: 'stage1a:source-scan',
      stage: '1a',
      label: entry.label,
      prompt: entry.text,
      sourcePaths: state.sourceCandidate ? [path.relative(repoPath, state.sourceCandidate)] : [],
      outputPaths: [`${wrelBase(bundleId, state.part)}FIGURES.md`, `courses/${bundleId}/GENERATION-LOG.md`],
      check: `node tools/staged-generation/figures-lint.mjs ${bundleId}${state.part ? ` --part ${state.part}` : ''} --stage 1a`,
      parallelSafe: true,
    }];
  } else if (state.stage === '1b') {
    const entry = promptForState(repoDir, bundleId, state);
    units = [{
      id: 'stage1b:outline',
      stage: '1b',
      label: entry.label,
      prompt: entry.text,
      sourcePaths: [
        ...(state.sourceCandidate ? [path.relative(repoPath, state.sourceCandidate)] : []),
        `${wrelBase(bundleId, state.part)}FIGURES.md`,
      ],
      outputPaths: [`${wrelBase(bundleId, state.part)}OUTLINE.md`],
      check: `node tools/staged-generation/outline-lint.mjs ${bundleId}${state.part ? ` --part ${state.part}` : ''}`,
      parallelSafe: true,
    }];
  } else if (state.stage === 2) {
    // Every currently-missing lesson, not just state.lesson (the first one) -
    // each already writes only into its own lesson-scoped dir, so they're
    // file-disjoint by construction (§4.1's one real generalization needed
    // here). recommendedConcurrency stays "sequential" regardless: breadth
    // order's entire point is prompt-cache locality from consecutive calls
    // sharing a prefix, a different question from parallelSafe (file-safety).
    units = state.allMissing.map((lesson) => {
      const entry = stage2PromptForLesson(bundleId, lesson);
      return {
        id: `stage2:${lesson.id}`,
        stage: 2,
        label: entry.label,
        prompt: entry.text,
        sourcePaths: [`${wrelBase(bundleId, state.part)}OUTLINE.md`],
        outputPaths: lesson.topup?.length
          ? lesson.topup.map((a) => `courses/${bundleId}/blocks/${lesson.id}/blk-${lesson.id.toLowerCase()}-${a}.json`)
          : [`courses/${bundleId}/lessons/les-${lessonSlug(lesson.id)}.json`],
        check: `node tools/staged-generation/lesson-check.mjs ${bundleId} ${lesson.id}`,
        parallelSafe: true,
      };
    });
  } else if (state.stage === 3) {
    units = stage3Units(repoDir, state.bundleDir, state.part).map((x) => unitForStage3(repoDir, x));
    recommendedConcurrency = 'parallel';
  } else if (state.stage === 4) {
    const entry = promptForState(repoDir, bundleId, state);
    units = [{
      id: 'stage4:module-export',
      stage: 4,
      label: entry.label,
      prompt: entry.text,
      sourcePaths: [`courses/${bundleId}/lessons`, `courses/${bundleId}/simulations`],
      outputPaths: [`courses/${bundleId}/modules`],
      parallelSafe: true,
    }];
  }

  return {
    repo: repoPath, bundle: bundleId, ...(state.part ? { part: state.part } : {}), track: 'lesson', order, stage: state.stage,
    recommendedConcurrency, blocked, units,
  };
}

function unitsForBankState(repoDir, bundleId, batchSize) {
  const r = unitsForBankStateRaw(repoDir, bundleId, batchSize);
  return r && r.units ? { ...r, units: filterUnits(r.units).map((u) => (u.stage === 'b1' ? decorateUnit(repoDir, bundleId, u) : u)) } : r;
}
function unitsForBankStateRaw(repoDir, bundleId, batchSize) {
  const state = detectBankState(repoDir, bundleId, batchSize);
  const repoPath = path.resolve(repoDir);

  if (state.stage === 'done') return { stage: 'done', units: [] };
  if (state.stage === 'error') return { stage: 'error', reason: state.reason, units: [] };

  let units = [];
  let recommendedConcurrency = 'sequential';

  if (state.stage === 'b1') {
    const entry = promptForBankState(bundleId, state);
    units = [{
      id: 'b1:plan',
      stage: 'b1',
      label: entry.label,
      prompt: entry.text,
      sourcePaths: state.sourceCandidate ? [path.relative(repoPath, state.sourceCandidate)] : [],
      outputPaths: [`courses/${bundleId}/BANK-PLAN.md`, `courses/${bundleId}/FIGURES.md`],
      parallelSafe: true,
    }];
  } else if (state.stage === 'b2') {
    const batches = allBankBatches(state.allMissing, batchSize);
    let remainingCount = state.allMissing.length;
    units = batches.map((batch, i) => {
      const entry = bank2PromptForBatch(bundleId, batch, remainingCount);
      remainingCount -= batch.length;
      return {
        id: `b2:batch${i + 1}`,
        stage: 'b2',
        label: entry.label,
        prompt: entry.text,
        sourcePaths: [`courses/${bundleId}/BANK-PLAN.md`],
        outputPaths: batch.map((q) => `courses/${bundleId}/questions/bank/${q.id}.json`),
        parallelSafe: true,
      };
    });
    if (units.length > 1) recommendedConcurrency = 'parallel';
  } else if (state.stage === 'b3') {
    const entry = promptForBankState(bundleId, state);
    units = [{
      id: 'b3:assemble',
      stage: 'b3',
      label: entry.label,
      prompt: entry.text,
      sourcePaths: [`courses/${bundleId}/questions/bank`],
      outputPaths: [`courses/${bundleId}/banks`],
      parallelSafe: true,
    }];
  }

  return {
    repo: repoPath, bundle: bundleId, track: 'bank', stage: state.stage,
    recommendedConcurrency, blocked: [], units,
  };
}

// ---------------------------------------------------------------------------
// output
// ---------------------------------------------------------------------------

function inProgressMessage(bundleId, state) {
  const p = state.plan;
  const lines = [
    ...p.building.map((u) => `  ${u.lesson}/${path.basename(u.scene, '.js')}: a run owns it (design note Status: building)`),
    ...p.waiting.map((u) => `  ${u.lesson}/${path.basename(u.scene, '.js')}: waiting for ${u.helper} (written by ${u.after ? path.basename(u.after, '.js') : 'the scene building it now'})`),
    ...(p.parked || []).map((u) => `  ${u.lesson}/${path.basename(u.scene, '.js')}: parked (${u.parkedReason})`),
  ];
  return `${bundleId}: Stage 3 - ${lines.length} scene(s) not offered:\n${lines.join('\n')}\nA crashed run leaves Status: building behind - release it with: node tools/staged-generation/release-scenes.mjs --bundle ${bundleId} --all --dry-run   (then without --dry-run).`;
}

function writeScratchFile(repoDir, entries, bundle = null) {
  const scratchDir = path.join(repoDir, 'build', 'scratch', bundle || '_');
  mkdirSync(scratchDir, { recursive: true });
  const body = entries.map((e) => `# ${e.label}\n\n${e.text}`).join('\n\n---\n\n');
  writeFileSync(path.join(scratchDir, 'next-prompt.md'), body);
}

// Interactive steering (briefs/reference/interactive.md). Checkpoint stages: 1b, 2, 3 (a build-pass or one-run unit; never sanity,
// verify or 3-look) and B1. live = a person answers in the session; async = the answer comes later, in courses/<b>/steer/<file>.
let INTERACTIVE = null, NO_LIVE = false;   // INTERACTIVE: null | 'live' | 'async' (the flag)
// on: true / 'live' | 'async' | false. 'never' (or noLive): orchestrate / auto-run - a live flag or a sticky live key is ignored; async stays.
function setInteractive(on, { noLive = false } = {}) {
  NO_LIVE = noLive || on === 'never';
  INTERACTIVE = on === 'async' ? 'async' : on === true || on === 'live' ? 'live' : null;
}
const INTERACTIVE_STAGES = ['1b', '2', '3', 'B1'];
const INTERACTIVE_MSG = 'interactive runs need a person to answer; use next.mjs --interactive in a live session';
const INTERACTIVE_RULES = 'Interactive rules: briefs/reference/interactive.md (read it first; it overrides START-HERE rule 7 until the operator confirms).';
const INTERACTIVE_LINES = `Interactive: on\n${INTERACTIVE_RULES}`;
const INTERACTIVE_LINES_ASYNC = `Interactive: async\n${INTERACTIVE_RULES}`;
function bundleJson(repoDir, bundleId) {
  try { return JSON.parse(readFileSync(path.join(path.resolve(repoDir), 'courses', bundleId, 'bundle.json'), 'utf8')) || {}; } catch { return {}; }
}
// bundle.json "interactive": ["1b", "2", "3", "B1"] - the sticky default for those stages (no flag needed); [] when absent or malformed.
function stickyInteractive(repoDir, bundleId) {
  if (!bundleId) return [];
  const j = bundleJson(repoDir, bundleId);
  return Array.isArray(j.interactive) ? j.interactive.map(String) : [];
}
// bundle.json "interactiveMode": "async" makes the sticky stages async; absent (or anything else) = live.
function stickyMode(repoDir, bundleId) {
  return bundleJson(repoDir, bundleId).interactiveMode === 'async' ? 'async' : 'live';
}
// 'live' | 'async' | null for a checkpoint stage key: the flag or the sticky key; a live mode is dropped when NO_LIVE.
function interactiveMode(repoDir, bundleId, stage) {
  if (!INTERACTIVE_STAGES.includes(String(stage))) return null;
  const mode = INTERACTIVE || (stickyInteractive(repoDir, bundleId).includes(String(stage)) ? stickyMode(repoDir, bundleId) : null);
  return mode === 'live' && NO_LIVE ? null : mode;
}
// The stage of an invocation line and its checkpoint key (null: not a checkpoint). Stage 3 sanity and verify passes are silent non-checkpoints.
function checkpointStage(text) {
  const stage = (/ Stage: (\S+?)\. Bundle: /.exec(text || '') || [])[1] || null;
  if (!stage) return { stage: null, key: null, silent: false };
  if (stage === '3' && / Pass: (sanity|verify)\./.test(text)) return { stage, key: null, silent: true };
  return { stage, key: INTERACTIVE_STAGES.includes(stage) ? stage : null, silent: false };
}
const warnedStage = new Set();
function warnNoCheckpoint(stage) {
  if (!INTERACTIVE || warnedStage.has(String(stage))) return;
  warnedStage.add(String(stage));
  console.error(`--interactive${INTERACTIVE === 'async' ? '-async' : ''}: no checkpoint for stage ${stage}; printed as usual`);
}
// 'live' | 'async' | null for one invocation line (also warns once per non-checkpoint stage when the flag is on).
function interactiveFor(repoDir, bundleId, text) {
  const { stage, key, silent } = checkpointStage(text);
  if (!stage) return null;
  if (key) return interactiveMode(repoDir, bundleId, key);
  if (!silent) warnNoCheckpoint(stage);
  return null;
}
const interactiveLines = (mode) => (mode === 'async' ? INTERACTIVE_LINES_ASYNC : INTERACTIVE_LINES);
// Appends the Interactive lines to an invocation line when its stage is interactive (auto-run uses this; withNotes does it inline).
function withInteractive(repoDir, bundleId, text) {
  const mode = interactiveFor(repoDir, bundleId, text);
  return mode ? `${text}\n${interactiveLines(mode)}` : text;
}

// Steer files (courses/<b>/steer/): the names a unit's invocation line maps to. Stage 3 -> 3-L01-Scene; Stage 2 -> 2-L01, or 2-L01S<nn>
// per slide of an Only: top-up (nn = the digits of the aNN id); 1b -> 1b-bundle or 1b-part-NN; B1 -> B1-bank.
function steerFiles(text) {
  const { key } = checkpointStage(text);
  const f = (re) => (re.exec(text) || [])[1];
  if (key === '1b') { const part = f(/ Part: (\S+?)\./); return [part ? `1b-part-${part}.md` : '1b-bundle.md']; }
  if (key === '2') {
    const l = f(/ Target: (\S+?)\./);
    if (!l) return [];
    const only = f(/ Only: arcade slide\(s\) ([a-z]\d+(?:, [a-z]\d+)*) /);
    return only ? only.split(', ').map((a) => `2-${l}S${a.replace(/\D/g, '').padStart(2, '0')}.md`) : [`2-${l}.md`];
  }
  if (key === '3') { const m = / Target: simulations\/([^/\s]+)\/([^/\s]+?)\.stub\.md\./.exec(text); return m ? [`3-${m[1]}-${m[2]}.md`] : []; }
  if (key === 'B1') return ['B1-bank.md'];
  return [];
}
// Waiting: a heading starting "## Proposal" and no heading starting "## Answer" after the LAST such Proposal.
function steerIsWaiting(file) {
  let t;
  try { t = readFileSync(file, 'utf8'); } catch { return false; }
  const heads = [...t.matchAll(/^## (Proposal|Answer)/gm)].map((m) => m[1]);
  const last = heads.lastIndexOf('Proposal');
  return last >= 0 && !heads.slice(last + 1).includes('Answer');
}
// Repo-relative path of the steer file this invocation line waits on, or null (no file, answered, or not a checkpoint unit).
function waitingSteer(repoDir, bundleId, text) {
  for (const name of steerFiles(text)) {
    const rel = `courses/${bundleId}/steer/${name}`;
    if (steerIsWaiting(path.join(path.resolve(repoDir), rel))) return rel;
  }
  return null;
}
const waitingLine = (rel) => `waiting for your choice: ${rel} (write your answer under a new "## Answer N" heading, then run next.mjs again)`;
// Splits prompt entries into those to print and the waiting lines. A live --interactive prints a waiting unit anyway (the operator answers in
// the session). all=false stops at the first printable entry (the one-prompt mode); waiting entries before it are still named.
function splitWaiting(repoDir, bundleId, entries, all) {
  const out = [], lines = [];
  for (const e of entries) {
    const w = waitingSteer(repoDir, bundleId, e.text);
    if (w && interactiveFor(repoDir, bundleId, e.text) !== 'live') { lines.push(waitingLine(w)); continue; }
    out.push(e);
    if (!all) break;
  }
  return { out, lines };
}
const hasSteer = (repoDir, bundleId) => !!bundleId && existsSync(path.join(path.resolve(repoDir), 'courses', bundleId, 'steer'));
// --units: mark a unit with its interactive mode (true = live, "async") and the steer file it waits on.
function decorateUnit(repoDir, bundleId, u) {
  const mode = typeof u.prompt === 'string' ? interactiveFor(repoDir, bundleId, u.prompt) : null;
  const waiting = typeof u.prompt === 'string' ? waitingSteer(repoDir, bundleId, u.prompt) : null;
  return { ...u, ...(mode ? { interactive: mode === 'async' ? 'async' : true } : {}), ...(waiting ? { waiting } : {}) };
}

// Per-bundle lines (subject pack, look/audience override, owned source) and, when on, the two Interactive lines; nothing for a default bundle.
function withNotes(entries, repoDir, bundleId) {
  const n = bundleId ? bundleNotes(path.resolve(repoDir), bundleId) : '';
  return entries.map((e) => {
    let extra = n;
    const mode = interactiveFor(repoDir, bundleId, e.text);
    if (mode) extra = extra ? `${extra}\n${interactiveLines(mode)}` : interactiveLines(mode);
    return extra ? { ...e, text: `${e.text}\n${extra}` } : e;
  });
}

function printEntries(entries, repoDir, args = {}) {
  for (const e of entries) {
    if (!args.concise)
      console.log(`\n=== ${e.label} ===\n`);
    console.log(e.text);
  }
  if (entries.length > 0) {
    const tag = args.bundle || null;
    writeScratchFile(repoDir, entries, tag);
    if (!args.concise)
      console.log(`\n(also written to ${path.join(path.resolve(repoDir), 'build', 'scratch', tag || '_', 'next-prompt.md')})`);
  }
}

function statusLine(bundleId, state0) {
  const state = state0;
  if (state.part) bundleId = `${bundleId} part ${state.part}`;
  if (state.stage === 'done') return `${bundleId}: done`;
  if (state.stage === 'error') return `${bundleId}: ERROR - ${state.reason}`;
  if (state.stage === '1a') return `${bundleId}: Stage 1a (source scan) needed`;
  if (state.stage === '1b') return `${bundleId}: Stage 1b (outline) needed`;
  if (state.stage === 2) return `${bundleId}: Stage 2 needed - lesson ${state.lesson.id} (${state.allMissing.length} lesson(s) remaining)`;
  if (state.stage === 'in-progress') {
    return `${bundleId}: Stage 3 in progress - ${state.plan.building.length} scene(s) being built, ${state.plan.waiting.length} waiting for a shared helper, ${state.plan.parked.length} parked`;
  }
  if (state.stage === 3) {
    const p = state.plan;
    const extra = p.building.length || p.waiting.length ? `; ${p.building.length + p.waiting.length} not offered (building / waiting for a helper)` : '';
    return `${bundleId}: Stage 3 needed - ${p.build.length} scene(s) to build, ${p.sanity.length} sanity pass(es), ${p.verify.length} verify pass(es), ${p.look.length} look review(s)${extra}${p.review.length ? `; ${p.review.length} built, waiting for your review` : ''}`;
  }
  if (state.stage === 'slides-fix') return `${bundleId}: Stage 4 blocked - 3-slides FAIL in ${state.failing.join(', ')}; fix, then re-run 3-slides`;
  if (state.stage === 4) return `${bundleId}: Stage 4 needed - module file & validate`;
  return `${bundleId}: unknown state`;
}

// ---------------------------------------------------------------------------
// run-export (no agent involved)
// ---------------------------------------------------------------------------

function runExport(repoDir, bundleId, destDir) {
  const bundleDir = path.join(repoDir, 'courses', bundleId);
  const files = [
    ...walkFiles(path.join(bundleDir, 'lessons')),
    ...walkFiles(path.join(bundleDir, 'questions')), // includes questions/bank/
    ...walkFiles(path.join(bundleDir, 'modules')),
    ...walkFiles(path.join(bundleDir, 'explanations')), // includes explanations/bank/
    ...walkFiles(path.join(bundleDir, 'banks')),
  ].filter((f) => f.endsWith('.json'));

  let failed = false;
  for (const f of files) {
    try {
      execFileSync('node', ['validators/validate.mjs', f], { cwd: repoDir, stdio: 'inherit' });
    } catch {
      failed = true;
    }
  }
  if (failed) {
    console.error('\nValidation failed for one or more files - fix before exporting.');
    process.exitCode = 1;
    return;
  }
  execFileSync('node', ['tools/export-course.mjs', bundleId, destDir], { cwd: repoDir, stdio: 'inherit' });
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

function oneShot(args) {
  if (args.all) {
    const scanRoot = path.resolve(args.scanRoot || process.cwd());
    const checkouts = listSiblingCheckouts(scanRoot);
    if (checkouts.length === 0) {
      console.log(`No content-repo-template checkouts found under ${scanRoot}`);
      return;
    }
    for (const repoDir of checkouts) {
      const bundles = listBundles(repoDir);
      if (bundles.length === 0) {
        console.log(`${path.basename(repoDir)}: no bundles under courses/`);
        continue;
      }
      for (const bundleId of bundles) {
        const state = detectState(repoDir, bundleId, args.order);
        console.log(`${path.basename(repoDir)}/${statusLine(bundleId, state)}`);
      }
    }
    return;
  }

  const repoDir = path.resolve(args.repo || process.cwd());
  if (!isCheckout(repoDir)) {
    console.error(`${repoDir} doesn't look like a content-repo-template checkout (missing AGENTS.md or courses/).`);
    process.exitCode = 1;
    return;
  }

  const bundleId = resolveBundleId(repoDir, args.bundle);
  if (!bundleId) {
    const bundles = listBundles(repoDir);
    if (bundles.length === 0) {
      console.log('No bundles under courses/ yet. Pass --bundle <id> to start one with Stage 1a (source scan).');
    } else {
      console.log('Multiple bundles found - pass --bundle <id> to pick one:');
      for (const b of bundles) console.log(`  ${statusLine(b, detectState(repoDir, b, args.order))}`);
    }
    return;
  }

  const state = detectState(repoDir, bundleId, args.order);
  if (state.stage === 'done') {
    if (args.concise)
      console.log(`complete, nothing remaining`);
    else
      console.log(`${bundleId}: chapter complete - no prompt to run.`);
    return;
  }
  if (state.stage === 'error') {
    console.error(`${bundleId}: ${state.reason}`);
    process.exitCode = 1;
    return;
  }
  if (state.plan && (state.plan.building.length || state.plan.waiting.length || state.plan.parked.length)) {
    console.log(inProgressMessage(bundleId, state));
  }
  if (state.stage === 'in-progress') return;

  let entries = args.list ? allPromptsForState(repoDir, bundleId, state) : [promptForState(repoDir, bundleId, state)].filter(Boolean);
  if (hasSteer(repoDir, bundleId)) {
    // A steer folder: units still waiting for the operator's answer are named, not printed; the next unit is offered instead.
    const all = (unitsForState(repoDir, bundleId, args.order).units || []).map((u) => ({ label: u.label, text: u.prompt }));
    const sp = splitWaiting(repoDir, bundleId, all.length ? all : entries, !!args.list && state.stage === 3);   // --list prints every Stage 3 unit, one prompt otherwise
    for (const l of sp.lines) console.log(l);
    entries = sp.out;
  }
  printEntries(withNotes(entries, repoDir, bundleId), repoDir, args);
}

function watchLoop(args) {
  const intervalMs = (args.interval || 5) * 1000;
  let lastSignature = null;
  let lastBundleId = null;
  console.log(`Watching (poll every ${args.interval || 5}s)... Ctrl-C to stop.`);
  const tick = () => {
    const repoDir = path.resolve(args.repo || process.cwd());
    if (!isCheckout(repoDir)) return;
    // --watch doesn't need --bundle even with multiple bundles present: pick
    // whichever one was most recently touched on disk, i.e. whichever an agent
    // is presumably actively working on right now. Re-resolved every tick so
    // --watch keeps following if you move on to babysitting a different bundle.
    const bundleId = resolveBundleId(repoDir, args.bundle, { autoLatest: true });
    if (!bundleId) {
      console.log(`\n[${new Date().toLocaleTimeString()}] No bundles under courses/ yet.`);
      return;
    }
    if (bundleId !== lastBundleId) {
      if (lastBundleId !== null) console.log(`\n[${new Date().toLocaleTimeString()}] switched to most-recently-active bundle: ${bundleId}`);
      lastBundleId = bundleId;
      lastSignature = null; // force a fresh report for the newly-tracked bundle
    }
    const state = detectState(repoDir, bundleId, args.order);
    const signature = JSON.stringify(state, (k, v) => (k === 'bundleDir' ? undefined : v));
    if (signature !== lastSignature) {
      lastSignature = signature;
      if (state.stage === 'done') {
        console.log(`\n[${new Date().toLocaleTimeString()}] ${bundleId}: chapter complete.`);
      } else if (state.stage === 'error') {
        console.error(`\n[${new Date().toLocaleTimeString()}] ${bundleId}: ${state.reason}`);
      } else if (state.stage === 'in-progress') {
        console.log(`\n[${new Date().toLocaleTimeString()}] ${inProgressMessage(bundleId, state)}`);
      } else {
        if (state.plan && (state.plan.building.length || state.plan.waiting.length || state.plan.parked.length)) {
          console.log(`\n[${new Date().toLocaleTimeString()}] ${inProgressMessage(bundleId, state)}`);
        }
        const entries = args.list ? allPromptsForState(repoDir, bundleId, state) : [promptForState(repoDir, bundleId, state)].filter(Boolean);
        console.log(`\n[${new Date().toLocaleTimeString()}] next step changed:`);
        printEntries(entries, repoDir, args);
      }
    }
  };
  tick();
  setInterval(tick, intervalMs);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(HELP);
    return;
  }
  SPLIT_LOOK = args.splitLook !== false;
  ONE_PASS = !!args.onePass;
  NO_CALIB = !!args.noCalibrationImages;
  WEB = !!args.web;
  setInteractive(args.interactive ? 'live' : args.interactiveAsync ? 'async' : false);
  setReview(args.review);
  setUnitFilter(args.lessons, args.shard, args.scene);
  BUNDLED = args.bundledDocs !== false;
  BUNDLE_REPO = path.resolve(args.repo || process.cwd());
  warnStaleBundles(BUNDLE_REPO);
  setActivePart(args.part);
  setForceRebuild(args.forceRebuild);
  setParked(loadParked(path.resolve(args.repo || process.cwd()), resolveBundleId(path.resolve(args.repo || process.cwd()), args.bundle)));
  if (args.audit) {
    // Delegate to audit.mjs with every other flag it understands (--bundle/--repo/--deep/...).
    const fwd = process.argv.slice(2).filter((a) => a !== '--audit');
    const r = spawnSync(process.execPath, [new URL('./audit.mjs', import.meta.url).pathname, ...fwd.filter((a) => !['--watch', '--list', '--units', '--bank', '--concise'].includes(a))], { stdio: 'inherit' });
    process.exitCode = r.status ?? 1;
    return;
  }
  if (args.runExport) {
    const repoDir = path.resolve(args.repo || process.cwd());
    const bundleId = resolveBundleId(repoDir, args.bundle);
    if (!bundleId) {
      console.error('--run-export needs an unambiguous bundle - pass --bundle <id>.');
      process.exitCode = 1;
      return;
    }
    runExport(repoDir, bundleId, args.runExport);
    return;
  }
  if (args.units) {
    const repoDir = path.resolve(args.repo || process.cwd());
    if (!isCheckout(repoDir)) {
      console.log(JSON.stringify({ stage: 'error', reason: `${repoDir} doesn't look like a content-repo-template checkout (missing AGENTS.md or courses/).`, units: [] }, null, 2));
      process.exitCode = 1;
      return;
    }
    const bundleId = resolveBundleId(repoDir, args.bundle);
    if (!bundleId) {
      console.log(JSON.stringify({ stage: 'error', reason: 'ambiguous or missing bundle - pass --bundle <id>.', units: [] }, null, 2));
      process.exitCode = 1;
      return;
    }
    const result = args.bank
      ? unitsForBankState(repoDir, bundleId, args.bankBatchSize)
      : unitsForState(repoDir, bundleId, args.order);
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (args.watch) {
    if (args.bank) { watchLoopBank(args); return; }
    watchLoop(args);
    return;
  }
  if (args.lessons || args.shard) {
    const repoDir = args.repo || process.cwd();
    const bundleId = resolveBundleId(repoDir, args.bundle);
    if (!bundleId) { console.error('pass --bundle <id>'); process.exitCode = 1; return; }
    const r = args.bank ? unitsForBankState(repoDir, bundleId, args.bankBatchSize) : unitsForState(repoDir, bundleId, args.order);
    if (!r.units.length) { console.log(`${bundleId}: no unit left for this --lessons/--shard slice (stage ${r.stage}).`); return; }
    const sp = splitWaiting(repoDir, bundleId, r.units.map((u) => ({ label: u.label, text: u.prompt })), true);
    for (const l of sp.lines) console.log(l);
    printEntries(withNotes(sp.out, repoDir, bundleId), repoDir, args);
    return;
  }
  if (args.bank) { oneShotBank(args); return; }
  oneShot(args);
}

// Guarded so tools/staged-generation/auto-run.mjs (and anything else) can import
// the state-machine/prompt-rendering functions below without triggering the CLI.
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  detectState,
  promptForState,
  allPromptsForState,
  resolveBundleId,
  mostRecentlyActiveBundle,
  findSourceCandidate,
  sceneStates,
  stage3Plan,
  stage3Units,
  invocation,
  setSplitLook,
  setOnePass,
  setNoCalibration,
  setWeb,
  setInteractive,
  stickyInteractive,
  stickyMode,
  withInteractive,
  waitingSteer,
  waitingLine,
  INTERACTIVE_LINES,
  INTERACTIVE_LINES_ASYNC,
  INTERACTIVE_MSG,
  setReview,
  setUnitFilter,
  setBundledDocs,
  warnStaleBundles,
  setSceneBatch,
  setPassBatch,
  setActivePart,
  setForceRebuild,
  setParked,
  loadParked,
  resumeStatus,
  staleParts,
  STATUSES,
  OWNED,
  writeScratchFile,
  runExport,
  parseLessonList,
  lessonsForBundle,
  listBundles,
  isCheckout,
  statusLine,
  inProgressMessage,
  stage3PromptForScene,
  stage3LookPrompt,
  stage3PassPrompt,
  stage2PromptForLesson,
  unitsForState,
  // Bank track (independent of the lesson-track exports above)
  detectBankState,
  promptForBankState,
  bankStatusLine,
  parseQuestionList,
  batchMissingQuestions,
  plannedQuestionsForBundle,
  oneShotBank,
  watchLoopBank,
  bank2PromptForBatch,
  allBankBatches,
  unitsForBankState,
};
