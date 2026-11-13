#!/usr/bin/env node
/**
 * STALE (2026-10-08): predates the 3-pass Stage 3 flow (it demands Status look-pending|done after every Stage 3 unit, which a
 * build or sanity pass never reaches). The owner chose live sessions only; use orchestrate.mjs. Kept for reference.
 *
 * Fully automated staged-generation loop, for Claude Code only.
 *
 * next.mjs detects the next stage and prints its prompt for a human to paste
 * into an agent session - it deliberately never spawns one itself, since
 * headless-mode reliability differs a lot across harnesses (see its header
 * comment and README.md). This script is the opt-in exception: it drives the
 * exact same state machine and prompts, but through Claude Code's `-p` mode
 * specifically (runners/claude-code.mjs), which is the one harness already
 * documented as retrying 429/529s with backoff and which exposes the
 * --permission-mode/--max-budget-usd/--output-format flags a real supervisor
 * loop needs. It's built to be re-run safely at any point: like next.mjs, the
 * filesystem (plus validators/validate.mjs) is the only source of truth for
 * "is this unit done" - nothing here is a hidden lock/progress file.
 *
 * Usage:
 *   node auto-run.mjs --bundle <id> [--repo <dir>]
 *   node auto-run.mjs --bundle <id> --dry-run
 *   node auto-run.mjs --bundle <id> --run-export ../dist
 *   node auto-run.mjs --bundle <id> --parallel 3   (Stage 3 only - see README)
 */

import {
  existsSync, readdirSync, statSync, mkdirSync, appendFileSync, readFileSync,
} from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  detectState, promptForState, resolveBundleId, setActivePart,
  isCheckout, listBundles, runExport, stage3Units as stage3Plan, setBundledDocs, setInteractive, stickyInteractive, stickyMode, withInteractive, waitingSteer, waitingLine, INTERACTIVE_MSG,
} from './next.mjs';
import { lessonSlug } from '../sim-test/lib/bundle.mjs';
import { runClaude } from './runners/claude-code.mjs';

class AutoRunError extends Error {}

// ---------------------------------------------------------------------------
// arg parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {
    order: 'breadth', maxRetries: 2, stageTimeout: 1200, stallTimeout: 600, maxBudgetUsd: 5, parallel: 1, dryRun: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--repo') args.repo = argv[++i];
    else if (a === '--bundle') args.bundle = argv[++i];
    else if (a === '--order') args.order = argv[++i];
    else if (a === '--part') args.part = argv[++i];
    else if (a === '--no-bundled-docs') args.noBundles = true;
    else if (a === '--max-retries') args.maxRetries = Number(argv[++i]);
    else if (a === '--stage-timeout') args.stageTimeout = Number(argv[++i]);
    else if (a === '--stall-timeout') args.stallTimeout = Number(argv[++i]);
    else if (a === '--max-budget-usd') args.maxBudgetUsd = Number(argv[++i]);
    else if (a === '--fallback-model') args.fallbackModel = argv[++i];
    else if (a === '--parallel') args.parallel = Number(argv[++i]);
    else if (a === '--interactive') { console.error(INTERACTIVE_MSG); process.exit(2); }
    else if (a === '--interactive-async') args.interactiveAsync = true;
    else if (a === '--stub') args.stub = argv[++i];
    else if (a === '--run-export') args.runExport = argv[++i];
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--help' || a === '-h') args.help = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  if (args.order !== 'breadth' && args.order !== 'depth') {
    throw new Error(`--order must be "breadth" or "depth", got "${args.order}"`);
  }
  return args;
}

const HELP = `staged-generation auto-run (Claude Code only)

  --bundle <id>          courses/<id> to drive (default: auto if only one exists)
  --repo <dir>            content-repo-template checkout (default: cwd)
  --order <breadth|depth> same meaning as next.mjs (default: breadth)
  --no-bundled-docs      read START-HERE.md and the docs one by one (default: one prebuilt briefs/bundles/<name>.md per unit)
  --part <NN>            multi-part bundle: only that part (default: parts in order)
  --max-retries <n>       per-unit retries before giving up and stopping (default: 2)
  --stage-timeout <s>     hard wall-clock cap per agent call (default: 1200)
  --stall-timeout <s>     kill an agent call with no output for this long (default: 600)
  --max-budget-usd <n>    forwarded to \`claude --max-budget-usd\` per call (default: 5)
  --fallback-model <id>   forwarded to \`claude --fallback-model\`
  --parallel <n>          concurrent agent calls - only matters for Stage 3, where each
                          run is one scene and file-disjoint (default: 1)
  --stub <path>           Stage 3 only: run just this one scene (its .stub.md or .js)
  --interactive-async     Stage 1b / 2 / 3 build / B1 units carry "Interactive: async"; a unit whose courses/<b>/steer/ file still waits for an answer
                          stops the run with its path (--interactive, the live mode, is refused)
  --run-export <dir>      validate + export once Stage 4 finishes (no agent involved)
  --dry-run               print the next unit(s) it would run and exit, no agent call

Stops (non-zero exit) rather than guessing whenever a unit fails --max-retries times,
or whenever the only Stage 3 work left is marked "Status: building" on disk - same
caution next.mjs's own state detection already applies to a human.

Every unit is the same one-line invocation next.mjs prints (START-HERE.md routes the
agent to its brief). After each unit the stage's own check must pass: figures-lint
(1a), outline-lint (1b), lesson-check (2), check-scene --no-browser (3), validate (4).

Before touching any bundle, runs a free \`claude auth status\` check plus one tiny
throwaway probe call - being logged in doesn't guarantee headless mode actually
works (model access, org policy on --permission-mode bypassPermissions, etc.), and
this catches that before spending real stage prompts on it. \`claude auth login\`
itself is interactive (browser/device sign-in) - this script can't do that for you.

Full transcripts land under build/scratch/logs/<bundle>/, one file per attempt, plus
an append-only build/scratch/logs/<bundle>/auto-run.jsonl outcome ledger. That ledger
is for visibility only - same as next.mjs, the filesystem (and validators/validate.mjs)
stay the only source of truth for whether a unit is actually done.
`;

// ---------------------------------------------------------------------------
// small helpers
// ---------------------------------------------------------------------------

function listJsonFiles(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = path.join(d, name);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else if (name.endsWith('.json')) out.push(p);
    }
  };
  walk(dir);
  return out;
}

function validateFiles(repoDir, files) {
  if (files.length === 0) return { ok: true, output: '' };
  try {
    const output = execFileSync('node', ['validators/validate.mjs', ...files], { cwd: repoDir, encoding: 'utf8' });
    return { ok: true, output };
  } catch (err) {
    return { ok: false, output: `${err.stdout || ''}${err.stderr || ''}` };
  }
}

// Run a kit check script (figures-lint, outline-lint, lesson-check); ok = exit 0.
function runTool(repoDir, argv) {
  try {
    const output = execFileSync('node', argv, { cwd: repoDir, encoding: 'utf8', maxBuffer: 64 << 20 });
    return { ok: true, output };
  } catch (err) {
    return { ok: false, output: `${err.stdout || ''}${err.stderr || ''}` };
  }
}

function designStatus(designPath) {
  if (!existsSync(designPath)) return null;
  const m = readFileSync(designPath, 'utf8').match(/^Status:[ \t]*([\w-]+)/mi);
  return m ? m[1].toLowerCase() : 'building';
}

function slugify(label) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'unit';
}

function logDir(repoDir, bundleId) {
  return path.join(repoDir, 'build', 'scratch', 'logs', bundleId);
}

function appendLedger(repoDir, bundleId, entry) {
  const dir = logDir(repoDir, bundleId);
  mkdirSync(dir, { recursive: true });
  appendFileSync(path.join(dir, 'auto-run.jsonl'), `${JSON.stringify({ ts: new Date().toISOString(), ...entry })}\n`);
}

function withRepairNote(promptText, note) {
  if (!note) return promptText;
  return `${promptText}\n\n---\nThe previous attempt at this exact stage did not finish cleanly. Fix this specifically before doing anything else:\n\n${note}\n`;
}

// Stage 3's work units: one per scene (build) or per built scene awaiting its
// look review (3-look), exactly as next.mjs --list offers them. Scenes waiting on
// a shared helper appear once its writer is done, on a later loop iteration.
function stage3Units(repoDir, bundleId, state) {
  return stage3Plan(repoDir, state.bundleDir, state.part).map((x) => ({
    key: `stage3:${x.kind}:${x.unit.scene}`, kind: x.kind, label: x.entry.label, promptText: x.entry.text, unit: x.unit,
  }));
}

// ---------------------------------------------------------------------------
// running one unit through Claude Code
// ---------------------------------------------------------------------------

async function execUnit({
  repoDir, bundleId, label, promptText, opts, attempt,
}) {
  const logPath = path.join(logDir(repoDir, bundleId), `${slugify(label)}.attempt${attempt}.ndjson`);
  console.log(`\n[${bundleId}] running: ${label} (attempt ${attempt})`);
  const res = await runClaude({
    prompt: promptText,
    cwd: repoDir,
    logPath,
    timeoutMs: opts.stageTimeout * 1000,
    stallMs: opts.stallTimeout * 1000,
    maxBudgetUsd: opts.maxBudgetUsd,
    fallbackModel: opts.fallbackModel,
  });
  appendLedger(repoDir, bundleId, {
    label,
    attempt,
    ok: res.ok,
    exitCode: res.exitCode,
    costUsd: res.costUsd,
    durationMs: res.durationMs,
    timedOut: res.timedOut,
    stalled: res.stalled,
    errorReason: res.errorReason,
    logPath,
  });
  if (!res.ok) {
    console.error(`  failed: ${res.errorReason || 'unknown error'} (log: ${logPath})`);
  } else {
    console.log(`  ok - $${(res.costUsd ?? 0).toFixed(3)}, ${((res.durationMs ?? 0) / 1000).toFixed(0)}s`);
  }
  return res;
}

// ---------------------------------------------------------------------------
// the loop
// ---------------------------------------------------------------------------

async function runBundle(repoDir, bundleId, opts) {
  const attempts = new Map();
  const notes = new Map();

  const guardRetry = (key) => {
    const n = (attempts.get(key) || 0) + 1;
    attempts.set(key, n);
    if (n > opts.maxRetries + 1) {
      throw new AutoRunError(
        `${bundleId}: giving up on "${key}" after ${n - 1} retr${n - 1 === 1 ? 'y' : 'ies'} - see logs under ${logDir(repoDir, bundleId)}.\nLast failure:\n${notes.get(key) || '(no detail)'}`,
      );
    }
    return n;
  };
  const clearRetry = (key) => { attempts.delete(key); notes.delete(key); };

  for (;;) {
    const state = detectState(repoDir, bundleId, opts.order);

    if (state.stage === 'done') {
      console.log(`${bundleId}: done.`);
      return;
    }

    if (state.stage === 'in-progress') {
      throw new AutoRunError(
        `${bundleId}: Stage 3 has scenes on disk marked "Status: building" (or waiting on a helper such a scene is writing) and nothing else to run. If no agent is working on them, a run crashed: delete that design note (or set its Status) and re-run.`,
      );
    }

    if (state.stage === 'slides-fix') {
      throw new AutoRunError(`${bundleId}: Stage 4 blocked - the latest 3-slides result of ${state.failing.join(', ')} is a FAIL. Fix the scenes and re-run 3-slides (briefs/stage3-slides.md).`);
    }

    if (state.stage === 'error') {
      // Currently the only 'error' state is a missing FIGURES.md after
      // OUTLINE.md already exists - this can't happen through normal 1a -> 1b
      // progression, only if FIGURES.md was deleted/moved by hand afterward.
      // Send a scoped repair note rather than the full Stage 1a template, so
      // a working OUTLINE.md isn't put at risk.
      const key = `stage1a-repair${state.part ? ':' + state.part : ''}`;
      if (opts.dryRun) {
        console.log(`[${bundleId}] would repair: ${state.reason}`);
        return;
      }
      const attempt = guardRetry(key);
      const promptText = withRepairNote(
        `Bundle: courses/${bundleId}\n\nOUTLINE.md already exists for this bundle. The only gap: ${state.reason}\n\nRead AGENTS.md rule 8 and the Stage 1a section of docs/staged-generation.md for the exact FIGURES.md format, then write courses/${bundleId}/FIGURES.md (re-reading the source PDF/images if needed to describe load-bearing figures - an explicit "no load-bearing figures" is fine if genuinely true). Hard stop: do not modify OUTLINE.md or write any other file.`,
        notes.get(key),
      );
      const res = await execUnit({
        repoDir, bundleId, label: `Stage 1a repair (${bundleId})`, promptText, opts, attempt,
      });
      if (!res.ok) { notes.set(key, res.errorReason || 'agent run failed'); continue; }
      const newState = detectState(repoDir, bundleId, opts.order);
      if (newState.stage === 'error') { notes.set(key, newState.reason); continue; }
      clearRetry(key);
      continue;
    }

    if (state.stage === '1a' || state.stage === '1b') {
      const entry = promptForState(repoDir, bundleId, state);
      entry.text = withInteractive(repoDir, bundleId, entry.text);
      const wait = waitingSteer(repoDir, bundleId, entry.text);
      if (wait) { console.log(`[${bundleId}] ${waitingLine(wait)}`); return; }
      if (opts.dryRun) {
        console.log(`[${bundleId}] would run: ${entry.label}`);
        return;
      }
      const key = `stage${state.stage}${state.part ? ':' + state.part : ''}`; // 'stage1a' | 'stage1b'
      const attempt = guardRetry(key);
      const res = await execUnit({
        repoDir, bundleId, label: entry.label, promptText: withRepairNote(entry.text, notes.get(key)), opts, attempt,
      });
      if (!res.ok) { notes.set(key, res.errorReason || 'agent run failed'); continue; }
      const newState = detectState(repoDir, bundleId, opts.order);
      if (newState.stage === state.stage) {
        notes.set(key, state.stage === '1a' ? 'FIGURES.md still missing after the run.' : 'OUTLINE.md still missing after the run.');
        continue;
      }
      if (newState.stage === 'error') { notes.set(key, newState.reason); continue; }
      const lint = state.stage === '1a'
        ? runTool(repoDir, ['tools/staged-generation/figures-lint.mjs', state.bundleDir, '--stage', '1a'])
        : runTool(repoDir, ['tools/staged-generation/outline-lint.mjs', state.bundleDir]);
      if (!lint.ok) { notes.set(key, `The stage's own check failed - fix every ERROR:\n${lint.output}`); continue; }
      clearRetry(key);
      continue;
    }

    if (state.stage === 2) {
      const entry = promptForState(repoDir, bundleId, state);
      entry.text = withInteractive(repoDir, bundleId, entry.text);
      const wait = waitingSteer(repoDir, bundleId, entry.text);
      if (wait) { console.log(`[${bundleId}] ${waitingLine(wait)}`); return; }
      if (opts.dryRun) {
        console.log(`[${bundleId}] would run: ${entry.label}`);
        return;
      }
      const key = `stage2:${state.lesson.id}`;
      const attempt = guardRetry(key);
      const res = await execUnit({
        repoDir, bundleId, label: entry.label, promptText: withRepairNote(entry.text, notes.get(key)), opts, attempt,
      });
      if (!res.ok) { notes.set(key, res.errorReason || 'agent run failed'); continue; }
      const lessonFile = path.join(state.bundleDir, 'lessons', `les-${lessonSlug(state.lesson.id)}.json`);
      if (!existsSync(lessonFile)) {
        notes.set(key, `Expected ${path.relative(repoDir, lessonFile)} to exist after this run but it does not.`);
        continue;
      }
      const check = runTool(repoDir, ['tools/staged-generation/lesson-check.mjs', state.bundleDir, state.lesson.id]);
      if (!check.ok) {
        notes.set(key, `tools/staged-generation/lesson-check.mjs reported failures:\n${check.output}`);
        continue;
      }
      clearRetry(key);
      continue;
    }

    if (state.stage === 3) {
      let units = stage3Units(repoDir, bundleId, state).map((u) => ({ ...u, promptText: withInteractive(repoDir, bundleId, u.promptText) }));
      const waits = units.map((u) => [u, waitingSteer(repoDir, bundleId, u.promptText)]).filter(([, w]) => w);
      for (const [, w] of waits) console.log(`[${bundleId}] ${waitingLine(w)}`);
      units = units.filter((u) => !waits.some(([x]) => x === u));
      if (!units.length && waits.length) return;
      if (opts.stub) {
        const wanted = path.resolve(opts.stub).replace(/\.(stub\.md|design\.md)$/, '.js');
        units = units.filter((u) => u.unit.scene === wanted || u.unit.stub === path.resolve(opts.stub));
        if (units.length === 0) {
          throw new AutoRunError(`--stub ${opts.stub} doesn't match any currently-offered Stage 3 scene for ${bundleId} (path resolved against cwd) - it may be done, building, or waiting on its shared helper.`);
        }
      }
      if (opts.dryRun) {
        for (const u of units) console.log(`[${bundleId}] would run: ${u.label}`);
        return;
      }
      const batch = units.slice(0, Math.max(1, opts.parallel));
      const batchAttempts = batch.map((u) => guardRetry(u.key));
      const results = await Promise.all(batch.map((u, i) => execUnit({
        repoDir, bundleId, label: u.label, promptText: withRepairNote(u.promptText, notes.get(u.key)), opts, attempt: batchAttempts[i],
      })));
      for (let i = 0; i < batch.length; i += 1) {
        const u = batch[i];
        const res = results[i];
        if (!res.ok) { notes.set(u.key, res.errorReason || 'agent run failed'); continue; }
        const st = designStatus(u.unit.design);
        const want = u.kind === 'look' ? ['done'] : ['look-pending', 'done'];
        if (!existsSync(u.unit.scene) || !want.includes(st)) {
          notes.set(u.key, `After the run: scene file ${existsSync(u.unit.scene) ? 'exists' : 'missing'}, design note Status: ${st || 'none'} (expected ${want.join(' or ')}). Finish the brief's procedure, including the report.`);
          continue;
        }
        const check = runTool(repoDir, ['tools/sim-test/check-scene.mjs', u.unit.scene, '--no-browser']);
        if (!check.ok) { notes.set(u.key, `check-scene.mjs still fails:\n${check.output.split('\n').filter((l) => /FAIL/.test(l)).join('\n')}`); continue; }
        clearRetry(u.key);
      }
      continue;
    }

    if (state.stage === 4) {
      const entry = promptForState(repoDir, bundleId, state);
      entry.text = withInteractive(repoDir, bundleId, entry.text);
      const wait = waitingSteer(repoDir, bundleId, entry.text);
      if (wait) { console.log(`[${bundleId}] ${waitingLine(wait)}`); return; }
      if (opts.dryRun) {
        console.log(`[${bundleId}] would run: ${entry.label}`);
        return;
      }
      const key = `stage4${state.part ? ':' + state.part : ''}`;
      const attempt = guardRetry(key);
      const res = await execUnit({
        repoDir, bundleId, label: entry.label, promptText: withRepairNote(entry.text, notes.get(key)), opts, attempt,
      });
      if (!res.ok) { notes.set(key, res.errorReason || 'agent run failed'); continue; }
      const moduleFiles = listJsonFiles(path.join(state.bundleDir, 'modules')).filter((f) => !state.part || path.basename(f).startsWith(`mod-${state.part}-`));
      if (moduleFiles.length === 0) {
        notes.set(key, 'Expected modules/<bundle>.json to exist after this run but modules/ has no .json file.');
        continue;
      }
      const allFiles = [
        ...listJsonFiles(path.join(state.bundleDir, 'lessons')),
        ...listJsonFiles(path.join(state.bundleDir, 'questions')),
        ...moduleFiles,
      ];
      const validation = validateFiles(repoDir, allFiles);
      if (!validation.ok) {
        notes.set(key, `validators/validate.mjs reported errors:\n${validation.output}`);
        continue;
      }
      clearRetry(key);
      continue;
    }

    throw new AutoRunError(`${bundleId}: detectState returned an unrecognized stage: ${JSON.stringify(state.stage)}`);
  }
}

// ---------------------------------------------------------------------------
// preflight - being logged in doesn't guarantee headless mode actually works:
// `claude auth login` is an interactive step (browser/device flow) auto-run.mjs
// can't do on the user's behalf, and even a logged-in account can lack access
// to the configured model or be blocked by an org policy on
// --permission-mode bypassPermissions. Catch both before spending real stage
// prompts on it.
// ---------------------------------------------------------------------------

function preflightAuth() {
  let status;
  try {
    const out = execFileSync('claude', ['auth', 'status', '--json'], { encoding: 'utf8' });
    status = JSON.parse(out);
  } catch (err) {
    throw new AutoRunError(`Could not check Claude Code auth status (${err.message}). Is the \`claude\` CLI installed and on PATH?`);
  }
  if (!status.loggedIn) {
    throw new AutoRunError('Claude Code is not authenticated. Run `claude auth login` interactively first (browser/device sign-in) - auto-run.mjs can\'t do that for you.');
  }
  console.log(`Claude Code auth OK - logged in as ${status.email || status.authMethod} (${status.subscriptionType || status.apiProvider || 'unknown plan'}).`);
}

async function preflightProbe(repoDir) {
  console.log('Probing headless access with a tiny throwaway call...');
  const res = await runClaude({
    prompt: 'Reply with exactly the word: READY',
    cwd: repoDir,
    logPath: path.join(logDir(repoDir, '_preflight'), `probe-${Date.now()}.ndjson`),
    timeoutMs: 60000,
    stallMs: 30000,
    maxBudgetUsd: 0.1,
  });
  if (!res.ok) {
    throw new AutoRunError(
      `Headless probe call failed: ${res.errorReason || 'unknown error'}.\nThis usually means something beyond just being logged in - no access to the configured model, an org policy blocking --permission-mode bypassPermissions, or the account lacking the privileges/subscription this needs. Fix this before running real stage prompts.`,
    );
  }
  console.log('Headless probe call OK - Claude Code can run unattended in this environment.');
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  setActivePart(args.part);
  if (args.help) {
    console.log(HELP);
    return;
  }

  const repoDir = path.resolve(args.repo || process.cwd());
  setBundledDocs(!args.noBundles, repoDir);
  if (!isCheckout(repoDir)) {
    console.error(`${repoDir} doesn't look like a content-repo-template checkout (missing AGENTS.md or courses/).`);
    process.exitCode = 1;
    return;
  }

  const bundleId = resolveBundleId(repoDir, args.bundle);
  if (!bundleId) {
    const bundles = listBundles(repoDir);
    if (bundles.length === 0) {
      console.error('No bundles under courses/ yet - scaffold one with tools/operator/start.mjs, then pass --bundle <id>.');
    } else {
      console.error('Multiple bundles found - pass --bundle <id>:');
      for (const b of bundles) console.error(`  ${b}`);
    }
    process.exitCode = 1;
    return;
  }

  setInteractive(args.interactiveAsync ? 'async' : false, { noLive: true });
  if (stickyInteractive(repoDir, bundleId).length && stickyMode(repoDir, bundleId) === 'live') console.error(`note: bundle.json "interactive" ignored here (auto-run cannot take answers); ${INTERACTIVE_MSG}`);

  const opts = {
    order: args.order,
    maxRetries: args.maxRetries,
    stageTimeout: args.stageTimeout,
    stallTimeout: args.stallTimeout,
    maxBudgetUsd: args.maxBudgetUsd,
    fallbackModel: args.fallbackModel,
    parallel: args.parallel,
    stub: args.stub,
    dryRun: args.dryRun,
  };

  try {
    preflightAuth();
    if (!args.dryRun) await preflightProbe(repoDir);
    await runBundle(repoDir, bundleId, opts);
  } catch (err) {
    if (err instanceof AutoRunError) {
      console.error(`\n${err.message}`);
      process.exitCode = 1;
      return;
    }
    throw err;
  }

  if (args.runExport && !args.dryRun) {
    console.log(`\nExporting ${bundleId} -> ${args.runExport}`);
    runExport(repoDir, bundleId, args.runExport);
  }
}

main();
