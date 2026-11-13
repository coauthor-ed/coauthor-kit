#!/usr/bin/env node
// Runs check.mjs against a block and logs output to build/scratch/logs/,
// same convention as tools/sim-test/run.mjs.
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const logDir = path.join(repoRoot, 'build', 'scratch', 'logs');

const target = process.argv[2];
if (!target) {
  console.error('Usage: node tools/beat-check/run.mjs <block.json>');
  process.exit(2);
}

fs.mkdirSync(logDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const label = `beat-check-${path.basename(target, path.extname(target))}`;
const logPath = path.join(logDir, `${stamp}__${label}.log`);

const child = spawn(process.execPath, [path.join(scriptDir, 'check.mjs'), target], {
  stdio: ['inherit', 'pipe', 'pipe'],
});

const logStream = fs.createWriteStream(logPath);
child.stdout.on('data', (d) => { process.stdout.write(d); logStream.write(d); });
child.stderr.on('data', (d) => { process.stderr.write(d); logStream.write(d); });

child.on('close', (code) => {
  logStream.end(() => {
    console.log(`\nlog: ${path.relative(repoRoot, logPath)}`);
    process.exit(code ?? 1);
  });
});
