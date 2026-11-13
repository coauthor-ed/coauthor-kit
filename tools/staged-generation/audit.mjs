#!/usr/bin/env node
/**
 * audit - find broken lessons and simulations in a bundle (or every bundle) and say
 * which ones need regenerating. Read-only: it changes nothing but its report files.
 *
 *   node audit.mjs [--repo <dir>] [--bundle <id> | --all-bundles] [--part <NN>] [--deep] [--jobs <n=4>]
 *                  [--no-lessons] [--json] [--help]
 *   node next.mjs --audit [same flags]          same thing, via next.mjs
 *
 * Fast pass (always):
 *   scene     stub with no .js; .js that fails `node --check`, is empty or has no export;
 *             design note stuck at `Status: building` (a run owns it, or crashed);
 *             `look-pending`; .js with no design note; design note with no .js
 *   refs      a lesson's simulation.src that resolves to nothing
 *   lessons   lesson-check.mjs per lesson (validators, outline, stubs) unless --no-lessons
 * --deep adds tools/sim-test/check-scene.mjs per lesson folder (every scene gate, with the real
 * browser; ~10 s per scene) and flags each scene whose section has a FAIL.
 *
 * Output: a table per bundle, a REGENERATE list (scene-level problems that a fresh Stage 3 run
 * fixes) with a ready `next.mjs --force-scene` / `orchestrate.mjs --force-scene` line, and a
 * NEEDS HUMAN list (lesson-level problems). Written to build/scratch/audit-report.{md,json}.
 * Exit 1 if anything is flagged.
 *
 * Regenerating: a scene that is merely unfinished/broken but NOT at Status: building is already
 * re-offered if you delete its .js + design note. A scene at Status: building needs
 * --force-rebuild/--force-scene (check first that no agent is live).
 */
import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { isCheckout, listBundles, resolveBundleId } from './next.mjs';
import { LESSON_ID_RE, compareLessonIds } from '../sim-test/lib/bundle.mjs';

function parseArgs(argv) {
  const a = { jobs: 4, lessons: true };
  for (let i = 0; i < argv.length; i += 1) {
    const x = argv[i];
    if (x === '--repo') a.repo = argv[++i];
    else if (x === '--bundle') a.bundle = argv[++i];
    else if (x === '--all-bundles') a.all = true;
    else if (x === '--deep') a.deep = true;
    else if (x === '--part') a.part = String(argv[++i]).replace(/^P/i, '').padStart(2, '0');
    else if (x === '--jobs') a.jobs = Number(argv[++i]) || 4;
    else if (x === '--no-lessons') a.lessons = false;
    else if (x === '--json') a.json = true;
    else if (x === '--help' || x === '-h') a.help = true;
    else throw new Error(`Unknown argument: ${x}`);
  }
  return a;
}

const HELP = readFileSync(new URL(import.meta.url), 'utf8').match(/\/\*\*([\s\S]*?)\*\//)[1].replace(/^ \* ?/gm, '');

function run(cmd, args, cwd) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { cwd });
    let out = '';
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { out += d; });
    p.on('close', (code) => resolve({ code, out }));
  });
}

async function pool(tasks, n) {
  const res = [];
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < tasks.length) { const k = i++; res[k] = await tasks[k](); }
  }));
  return res;
}

function walk(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p)); else out.push(p);
  }
  return out;
}

// -- fast structural scan of one bundle ---------------------------------------------
function scanScenes(repoDir, bundleId) {
  const bundleDir = path.join(repoDir, 'courses', bundleId);
  const simsDir = path.join(bundleDir, 'simulations');
  const found = []; // { lesson, scene, kind: 'regen'|'look'|'info', problem }
  const add = (f, kind, problem) => found.push({ bundle: bundleId, lesson: f.lesson, scene: f.scene, kind, problem });
  const stubs = walk(simsDir).filter((f) => f.endsWith('.stub.md'));
  const stubbed = new Set();
  for (const stub of stubs.sort()) {
    const base = stub.replace(/\.stub\.md$/, '');
    const f = { lesson: path.basename(path.dirname(stub)), scene: path.basename(base) };
    stubbed.add(base);
    const js = `${base}.js`;
    const design = `${base}.design.md`;
    const hasJs = existsSync(js);
    let status = null;
    if (existsSync(design)) {
      const m = readFileSync(design, 'utf8').match(/^Status:[ \t]*([\w-]+)/mi);
      status = m ? m[1].toLowerCase() : 'building';
    }
    if (!hasJs) {
      add(f, 'regen', status === 'building' ? 'no .js, design note Status: building (crashed/errored run?) - needs --force-scene' : 'no .js (never built)');
      continue;
    }
    const src = readFileSync(js, 'utf8');
    if (src.trim().length < 200) add(f, 'regen', `.js is nearly empty (${src.trim().length} bytes)`);
    else if (!/^\s*export\s/m.test(src)) add(f, 'regen', '.js has no export (truncated?)');
    const chk = spawnSync(process.execPath, ['--check', js], { encoding: 'utf8' });
    if (chk.status !== 0) add(f, 'regen', `syntax error: ${(chk.stderr.split('\n').find((l) => /Error/.test(l)) || '').slice(0, 120)}`);
    if (status === 'building') add(f, 'regen', 'design note Status: building with a .js present (run died before finishing?) - needs --force-scene');
    else if (status === 'look-pending') add(f, 'look', 'Status: look-pending (needs the 3-look run, not regeneration)');
    else if (status === 'review-pending') add(f, 'info', 'Status: review-pending (built, waiting for the operator review: tests in the preview, then Mark reviewed)');
    else if (status === null) add(f, 'info', 'scene .js has no design note (hand-finished or pre-design-note)');
  }
  // design note with no stub
  for (const d of walk(simsDir).filter((f) => f.endsWith('.design.md'))) {
    const base = d.replace(/\.design\.md$/, '');
    if (!stubbed.has(base)) add({ lesson: path.basename(path.dirname(d)), scene: path.basename(base) }, 'info', 'design note with no stub');
  }
  // lesson -> simulation.src references that resolve to nothing
  for (const f of walk(path.join(bundleDir, 'lessons')).concat(walk(path.join(bundleDir, 'blocks'))).filter((x) => x.endsWith('.json'))) {
    const txt = readFileSync(f, 'utf8');
    for (const m of txt.matchAll(/"src"\s*:\s*"([^"]*\.js)"/g)) {
      const r = m[1];
      const cands = [path.join(bundleDir, r), path.join(repoDir, r.replace(/^\//, ''))];
      if (!cands.some(existsSync)) {
        found.push({ bundle: bundleId, lesson: path.basename(f), scene: r, kind: 'regen', problem: `referenced by ${path.relative(repoDir, f)} but the file does not exist` });
      }
    }
  }
  return found;
}

// -- per-lesson deep checks -----------------------------------------------------------
function lessonIds(repoDir, bundleId) {
  const dir = path.join(repoDir, 'courses', bundleId, 'lessons');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).map((f) => f.match(/^les-(\d\d(?:-\d\d-\d\d)?|c\d\d)\.json$/)).filter(Boolean).map((m) => (m[1][0] === 'c' ? m[1].toUpperCase() : `L${m[1]}`)).sort(compareLessonIds);
}

function parseSceneSections(out) {
  const res = [];
  let cur = null;
  for (const line of out.split('\n')) {
    const h = line.match(/^## (\S+)/);
    if (h) { cur = { scene: h[1], fails: [] }; res.push(cur); continue; }
    if (cur && /^\s+FAIL /.test(line)) cur.fails.push(line.trim().slice(0, 160));
  }
  return res.filter((s) => s.fails.length);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { console.log(HELP); return; }
  const repoDir = path.resolve(args.repo || process.cwd());
  if (!isCheckout(repoDir)) { console.error(`${repoDir} is not a content-repo-template checkout.`); process.exitCode = 1; return; }
  const bundles = args.all || !args.bundle ? (args.bundle ? [args.bundle] : listBundles(repoDir)) : [resolveBundleId(repoDir, args.bundle)];
  if (!args.all && !args.bundle && bundles.length > 1) console.error(`(auditing all ${bundles.length} bundles; pass --bundle <id> for one)`);

  const regen = []; const look = []; const info = []; const human = [];
  for (const b of bundles) {
    for (const f of scanScenes(repoDir, b)) (f.kind === 'regen' ? regen : f.kind === 'look' ? look : info).push(f);
    const tasks = [];
    if (args.lessons) {
      for (const L of lessonIds(repoDir, b).filter((x) => !args.part || x.startsWith(`L${args.part}-`))) {
        tasks.push(async () => {
          const r = await run(process.execPath, [path.join(repoDir, 'tools/staged-generation/lesson-check.mjs'), b, L], repoDir);
          for (const l of r.out.split('\n').filter((x) => /^\s+FAIL /.test(x))) human.push({ bundle: b, lesson: L, problem: l.trim().slice(0, 200) });
        });
      }
    }
    if (args.deep) {
      for (const d of readdirSync(path.join(repoDir, 'courses', b, 'simulations'), { withFileTypes: true }).filter((e) => e.isDirectory() && LESSON_ID_RE.test(e.name) && (!args.part || e.name.startsWith(`L${args.part}-`)))) {
        tasks.push(async () => {
          const r = await run(process.execPath, [path.join(repoDir, 'tools/sim-test/check-scene.mjs'), d.name, '--bundle', b, '--no-count'], repoDir);
          for (const s of parseSceneSections(r.out)) regen.push({ bundle: b, lesson: d.name, scene: s.scene, kind: 'regen', problem: `check-scene FAIL: ${s.fails.join(' | ')}`.slice(0, 300) });
          if (r.code !== 0 && !/^## /m.test(r.out)) human.push({ bundle: b, lesson: d.name, problem: `check-scene did not run: ${r.out.trim().split('\n').pop().slice(0, 160)}` });
        });
      }
    }
    await pool(tasks, args.jobs);
  }

  const report = { bundles, deep: !!args.deep, regenerate: regen, lookPending: look, info, needsHuman: human };
  const lines = [`# Audit ${new Date().toISOString().slice(0, 10)}${args.deep ? ' (deep)' : ' (fast; add --deep for check-scene)'}`, ''];
  const sec = (title, arr, fmt) => { lines.push(`## ${title} (${arr.length})`); if (!arr.length) lines.push('none'); for (const x of arr) lines.push(fmt(x)); lines.push(''); };
  sec('REGENERATE (scene-level)', regen, (x) => `- ${x.bundle}/${x.lesson}/${x.scene}: ${x.problem}`);
  sec('NEEDS HUMAN (lesson-level)', human, (x) => `- ${x.bundle}/${x.lesson}: ${x.problem}`);
  sec('LOOK-PENDING', look, (x) => `- ${x.bundle}/${x.lesson}/${x.scene}`);
  sec('INFO', info, (x) => `- ${x.bundle}/${x.lesson}/${x.scene}: ${x.problem}`);
  const byBundle = new Map();
  for (const x of regen) { if (!byBundle.has(x.bundle)) byBundle.set(x.bundle, new Set()); byBundle.get(x.bundle).add(`${x.lesson}/${x.scene}`); }
  if (byBundle.size) {
    lines.push('## To regenerate (only after checking no agent is live; --force-scene only matters for Status: building scenes)');
    for (const [b, set] of byBundle) {
      lines.push(`node tools/staged-generation/orchestrate.mjs --harness claude-code --bundle ${b} ${[...set].map((s) => `--force-scene ${s}`).join(' ')}`);
    }
    lines.push('Scenes with a finished-looking .js and a Done design note are NOT re-offered by next.mjs; to redo one, delete its .js and .design.md first.');
  }
  const text = lines.join('\n');
  const dir = path.join(repoDir, 'build', 'scratch', bundles.length === 1 ? bundles[0] : '_');
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'audit-report.md'), text + '\n');
  writeFileSync(path.join(dir, 'audit-report.json'), JSON.stringify(report, null, 2));
  console.log(args.json ? JSON.stringify(report, null, 2) : text);
  console.log(`\n(written to ${path.join(dir, 'audit-report.md')} and .json)`);
  if (regen.length || human.length) process.exitCode = 1;
}

main();
