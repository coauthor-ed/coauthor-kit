#!/usr/bin/env node
// kit-check - the kit's own checks in one local command (replaces the old CI workflow; no CI runs on any host).
//   node tools/kit-check.mjs
// Runs: doc bundles up to date, context budget, example course validates, example scene syntax. Exit 1 on the first failure.
// The context budget is advisory (WARN): it reports growth against a baseline and is re-baselined on purpose by the kit maintainer.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const steps = [
  ['doc bundles are up to date', ['tools/staged-generation/build-bundles.mjs', '--check']],
  ['context budget', ['tools/operator/context-budget.mjs'], false, true],
  ['example course validates', ['validators/validate.mjs', 'examples/work-energy/lessons/*.json', 'examples/work-energy/modules/*.json'], true],
  ['example scene syntax and names', ['tools/sim-test/ident-lint.mjs', 'examples/simulations', '--quiet']],
];
for (const [name, args, shell, advisory] of steps) {
  console.log(`== ${name}`);
  const r = shell
    ? spawnSync(`${JSON.stringify(process.execPath)} ${args.join(' ')}`, { cwd: ROOT, stdio: 'inherit', shell: true })
    : spawnSync(process.execPath, args, { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0 && advisory) { console.warn(`WARN (advisory): ${name}`); continue; }
  if (r.status !== 0) { console.error(`FAIL: ${name}`); process.exit(1); }
}
console.log('OK');
