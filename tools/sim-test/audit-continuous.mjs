// Batch audit: for every scene file under a root directory, check whether it
// is safe under `static CONTINUOUS = false` - now the default for every base
// class except Particle/Physics - so which old scenes still need a fix (see
// docs/sprints/wip/dom-simulations-md-prose-and-explanation-slides.md §5 and
// SimulationBase.js's/CanvasSimulation.js's own class doc comments for the
// come-to-rest mechanism this is auditing).
//
// Read-only: only dynamic-imports scene files and drives them through their
// lifecycle in-memory under the fake DOM/clock (harness.mjs) - never writes
// to the audited tree. Run under the Node loader so bare `simulations/...`
// imports resolve (see loader.mjs):
//
//   node --experimental-loader /abs/path/to/tools/sim-test/loader.mjs \
//     tools/sim-test/audit-continuous.mjs <root-dir> [--out=path-without-ext] [--beats=N]
//
// Writes <out>.json (one row per file) and <out>.md (human-readable summary)
// if --out is given; always prints the summary to stdout too.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { installFakeHost, createLogicCtx, getLastCtx, makeContainer, runComeToRestCheck } from './harness.mjs';

function parseArgs(argv) {
  const [root, ...rest] = argv;
  const opts = { out: null, beats: 3 };
  for (const a of rest) {
    const m = a.match(/^--(\w+)=(.*)$/);
    if (m) opts[m[1]] = m[2];
  }
  return { root, opts };
}

const { root, opts } = parseArgs(process.argv.slice(2));
if (!root) {
  console.error('Usage: audit-continuous.mjs <root-dir> [--out=path-without-ext] [--beats=N]');
  process.exit(2);
}
const rootAbs = path.resolve(process.cwd(), root);
const beats = Number(opts.beats) || 3;

/** Recursively collects .js files that live under a `simulations` directory
 *  segment anywhere in their path (mirrors `find`'s -path 'simulations' glob
 *  match), including shared/utility files that don't export a scene (those
 *  fall out as `skip` below, not excluded here). */
function findSceneFiles(dir, out = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return out; }
  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) findSceneFiles(full, out);
    else if (entry.isFile() && entry.name.endsWith('.js') && full.includes(`${path.sep}simulations${path.sep}`)) out.push(full);
  }
  return out;
}

const files = findSceneFiles(rootAbs).sort();
console.log(`found ${files.length} candidate .js file(s) under simulations/ dirs in ${rootAbs}\n`);

const rows = [];

for (const file of files) {
  const rel = path.relative(rootAbs, file);
  const row = { file: rel, category: null, pattern: 'none', detail: null };
  rows.push(row);

  let source;
  try {
    source = fs.readFileSync(file, 'utf8');
  } catch (err) {
    row.category = 'crash';
    row.detail = `read failed: ${err.message}`;
    continue;
  }
  // Static pattern tag - see plan context: `_tickBeatChain` decrementing a
  // dwell counter inside `_tick` only advances while `_tick` keeps firing,
  // which is exactly what CONTINUOUS=false stops guaranteeing.
  if (/\b_tickBeatChain\b/.test(source)) row.pattern = 'hand-rolled-dwell-chain';
  else if (/\bset(?:Interval|Timeout)\s*\(/.test(source)) row.pattern = 'own-timer';

  try {
    installFakeHost(createLogicCtx);
    const mod = await import(pathToFileURL(file).href);
    // A plain function export (a stateless drawing helper, e.g.
    // OrganTriad.js's `drawOrganTriad`) is not a scene - every real scene
    // class inherits `setup()` from SimulationBase somewhere in its chain,
    // which a helper function's `.prototype` never has. Checking for that
    // instead of "is a function" avoids `new`-ing a helper as if it were a
    // scene constructor (throws deep inside, mid-render, not at this check).
    const isSceneClass = (v) => typeof v === 'function' && typeof v.prototype?.setup === 'function';
    const sceneExports = Object.values(mod).filter(isSceneClass);
    const SceneClass = isSceneClass(mod.default) ? mod.default : (sceneExports.length === 1 ? sceneExports[0] : null);
    if (typeof SceneClass !== 'function') {
      row.category = 'skip';
      row.detail = sceneExports.length > 1
        ? `${sceneExports.length} scene-class exports, ambiguous - not auditable generically`
        : 'no exported class with a setup() method - likely a shared helper module, not a scene';
      continue;
    }

    const container = makeContainer();
    const scene = new SceneClass(container);
    scene.requestUiUpdate = () => {};
    scene.allowResume = true;
    // Own-property override - shadows the inherited CONTINUOUS=true without
    // touching the source file or any shared base class it extends.
    SceneClass.CONTINUOUS = false;

    await scene.setup();

    const domScene = !scene.unsupported && !getLastCtx() && container.children.length > 0;
    if (scene.unsupported) {
      row.category = 'skip';
      row.detail = 'WebGL unsupported in this headless env (no come-to-rest signal available)';
      continue;
    }
    if (domScene) {
      row.category = 'skip';
      row.detail = 'DOM scene - no canvas draw calls to audit';
      continue;
    }
    if (typeof scene.start !== 'function' || typeof scene._tick !== 'function') {
      row.category = 'skip';
      row.detail = 'no start()/_tick() - not a canvas rAF-loop scene';
      continue;
    }

    for (let b = 0; b < beats; b++) {
      if (typeof scene.onBeatChange === 'function') scene.onBeatChange(b, beats);
      if (typeof scene.step === 'function') for (let f = 0; f < 5; f++) scene.step(16.7);
    }

    scene.start();
    const result = runComeToRestCheck(scene, { beatsCount: beats });
    if (!result.wakeOk) {
      row.category = 'wake_fail';
      row.detail = `draw calls did not grow after final onBeatChange (${result.before} -> ${result.afterWake}) - pre-existing bug, independent of CONTINUOUS`;
    } else if (result.idleOk) {
      row.category = 'idle_pass';
    } else {
      row.category = 'idle_fail';
      row.detail = `draw calls kept growing after settling (${result.mid} -> ${result.end} over 20 further idle frames, budget ${result.budgetMs}ms)`;
    }

    try { (scene.stop ?? scene.destroy)?.call(scene); } catch { /* teardown bugs aren't this audit's concern */ }
  } catch (err) {
    row.category = 'crash';
    row.detail = `${err.message}`;
  }
}

// ── Report ───────────────────────────────────────────────────────────────
const byCategory = {};
for (const r of rows) (byCategory[r.category] ??= []).push(r);

const order = ['idle_pass', 'idle_fail', 'wake_fail', 'crash', 'skip'];
const lines = [];
lines.push(`# Course-content CONTINUOUS audit`);
lines.push('');
lines.push(`Root: \`${rootAbs}\` - ${files.length} file(s) scanned, ${beats} beats walked per scene.`);
lines.push('');
lines.push(`| category | count |`);
lines.push(`|---|---|`);
for (const cat of order) lines.push(`| ${cat} | ${(byCategory[cat] ?? []).length} |`);
lines.push('');

const idleFail = byCategory.idle_fail ?? [];
if (idleFail.length) {
  const byPattern = {};
  for (const r of idleFail) (byPattern[r.pattern] ??= []).push(r);
  lines.push(`## idle_fail by pattern`);
  lines.push('');
  lines.push(`| pattern | count |`);
  lines.push(`|---|---|`);
  for (const [pattern, list] of Object.entries(byPattern).sort((a, b) => b[1].length - a[1].length)) {
    lines.push(`| ${pattern} | ${list.length} |`);
  }
  lines.push('');
}

for (const cat of ['wake_fail', 'crash']) {
  const list = byCategory[cat] ?? [];
  if (!list.length) continue;
  lines.push(`## ${cat} (pre-existing bugs, independent of this exercise)`);
  lines.push('');
  for (const r of list) lines.push(`- \`${r.file}\` - ${r.detail}`);
  lines.push('');
}

if (idleFail.length) {
  lines.push(`## idle_fail - full list`);
  lines.push('');
  for (const r of idleFail) lines.push(`- \`${r.file}\` [${r.pattern}] - ${r.detail}`);
  lines.push('');
}

const skipList = byCategory.skip ?? [];
if (skipList.length) {
  lines.push(`## skip - full list`);
  lines.push('');
  for (const r of skipList) lines.push(`- \`${r.file}\` - ${r.detail}`);
  lines.push('');
}

const summary = lines.join('\n');
console.log('\n' + summary);

if (opts.out) {
  const jsonPath = path.resolve(process.cwd(), `${opts.out}.json`);
  const mdPath = path.resolve(process.cwd(), `${opts.out}.md`);
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify({ root: rootAbs, beats, scannedAt: new Date().toISOString(), rows }, null, 2));
  fs.writeFileSync(mdPath, summary + '\n');
  console.log(`\nwrote: ${jsonPath}`);
  console.log(`wrote: ${mdPath}`);
}
