#!/usr/bin/env node
// Single entry point for headless simulation tests. Runs the target under
// the Node loader (loader.mjs) so scene files' `simulations/...` imports
// resolve, and logs all output to build/scratch/logs/ (see README.md).
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const logDir = path.join(repoRoot, 'build', 'scratch', 'logs');

const [mode, target, ...rest] = process.argv.slice(2);
const usage = 'Usage: node tools/sim-test/run.mjs <sanity|draw|exec> <scene-or-test-file.js> [--export=Name] [--beats=N] [--container=WxH]';
if (!mode || !target || !['sanity', 'draw', 'exec'].includes(mode)) {
  console.error(usage);
  process.exit(2);
}

fs.mkdirSync(logDir, { recursive: true });
// Every run leaves a log; a bundle's worth of check-scene runs is thousands of files (5,600 in one course).
// Keep the newest 600 so a listing of the folder stays readable.
try {
  const old = fs.readdirSync(logDir).filter((f) => f.endsWith('.log')).sort();
  for (const f of old.slice(0, Math.max(0, old.length - 600))) fs.unlinkSync(path.join(logDir, f));
} catch { /* pruning is best effort */ }
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const label = `${mode}-${path.basename(target, path.extname(target))}`;
const logPath = path.join(logDir, `${stamp}__${label}.log`);

const loaderPath = path.join(scriptDir, 'loader.mjs');
// 'exec' runs an author-written test file directly; 'sanity'/'draw' run the
// generic lifecycle walk (check.mjs) against a scene file.
const innerScript = mode === 'exec' ? path.resolve(process.cwd(), target) : path.join(scriptDir, 'check.mjs');
const innerArgs = mode === 'exec' ? rest : [mode, target, ...rest];

// SIM_HANG_MS (default 20000): see watchdog.mjs. exec tests may run longer silently, so give them more.
const env = { ...process.env, SIM_HANG_MS: process.env.SIM_HANG_MS ?? (mode === 'exec' ? '60000' : '20000') };
const child = spawn(process.execPath, ['--no-warnings', '--experimental-loader', loaderPath, '--import', path.join(scriptDir, 'watchdog.mjs'), innerScript, ...innerArgs], {
  stdio: ['inherit', 'pipe', 'pipe'], env,
});

const logStream = fs.createWriteStream(logPath);
child.stdout.on('data', (d) => { process.stdout.write(d); logStream.write(d); });
let hung = false;
child.stderr.on('data', (d) => { if (String(d).startsWith('HANG:')) hung = true; process.stderr.write(d); logStream.write(d); });

child.on('close', (code) => {
  logStream.end(() => {
    console.log(`\nlog: ${path.relative(repoRoot, logPath)}`);
    process.exit(hung ? 4 : (code ?? 1));
  });
});
