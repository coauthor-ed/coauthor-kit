#!/usr/bin/env node
// context-budget - how many bytes does an agent load before it starts working, per stage? Kit CI gate. OPERATOR/CI ONLY.
//
//   node tools/operator/context-budget.mjs                 compare with context-budget.baseline.json, exit 1 on growth over --max-growth (default 5%)
//   node tools/operator/context-budget.mjs --write-baseline  record the current numbers (do this deliberately, in the PR that justifies the growth)
//   node tools/operator/context-budget.mjs --list           print the numbers only
// Measured per stage: CLAUDE.md + AGENTS.md (auto-loaded by harnesses) + the stage's bundled file briefs/bundles/<name>.md (START-HERE + brief +
// the docs it names), or START-HERE.md + the brief for a stage with no bundle. Token estimate = bytes / 4.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from '../sim-test/lib/args.mjs';

const A = parseArgs(process.argv.slice(2), { tool: 'context-budget', file: import.meta.url, usage: 'node tools/operator/context-budget.mjs [--write-baseline | --list] [--max-growth 5]', val: ['max-growth'], bool: ['write-baseline', 'list'] });
const KIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const size = (f) => { try { return fs.statSync(path.join(KIT, f)).size; } catch { return 0; } };
const auto = size('CLAUDE.md') + size('AGENTS.md');
const rows = {};
const bundles = fs.existsSync(path.join(KIT, 'briefs', 'bundles')) ? fs.readdirSync(path.join(KIT, 'briefs', 'bundles')).filter((f) => f.endsWith('.md')) : [];
for (const b of bundles) rows[`bundle:${b.replace(/\.md$/, '')}`] = auto + size(`briefs/bundles/${b}`);
for (const f of fs.readdirSync(path.join(KIT, 'briefs')).filter((x) => /^(stage|bank).*\.md$/.test(x))) rows[`brief:${f.replace(/\.md$/, '')}`] = auto + size('START-HERE.md') + size(`briefs/${f}`);
rows['revise'] = auto + size('REVISE.md');
const baseP = path.join(KIT, 'tools', 'operator', 'context-budget.baseline.json');
if (A.has('write-baseline')) { fs.writeFileSync(baseP, JSON.stringify(rows, null, 1) + '\n'); console.log(`baseline written: ${Object.keys(rows).length} entries`); process.exit(0); }
if (A.has('list')) { for (const [k, v] of Object.entries(rows)) console.log(`${k.padEnd(40)} ${String(v).padStart(7)} B  ~${Math.round(v / 4)} tokens`); process.exit(0); }
let base = {}; try { base = JSON.parse(fs.readFileSync(baseP, 'utf8')); } catch { console.error('no baseline: run with --write-baseline'); process.exit(2); }
const lim = 1 + (Number(A.val('max-growth')) || 5) / 100; let bad = 0;
for (const [k, v] of Object.entries(rows)) {
  if (!(k in base)) { console.log(`new   ${k}: ${v} B (not in the baseline: --write-baseline)`); continue; }
  if (v > base[k] * lim) { bad++; console.log(`GREW  ${k}: ${base[k]} -> ${v} B (+${(((v / base[k]) - 1) * 100).toFixed(1)}%)`); }
}
console.log(bad ? `FAIL - ${bad} stage(s) grew more than ${((lim - 1) * 100).toFixed(0)}%` : `PASS - ${Object.keys(rows).length} stage(s) within ${((lim - 1) * 100).toFixed(0)}% of the baseline`);
process.exit(bad ? 1 : 0);
