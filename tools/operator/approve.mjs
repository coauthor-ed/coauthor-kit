#!/usr/bin/env node
// approve / unapprove - set authoring.status on content files. OPERATOR ONLY: agents never run this.
//
//   node tools/operator/approve.mjs --bundle <id> (--slide L01S03 | --lesson L01 | --module <id> | --bank <id> | --file <path> | --all) [--yes] [--by "<name>"]
//   node tools/operator/unapprove.mjs   same scopes; sets status back to ai-draft
// Dry run by default; --yes applies. Writes status, reviewedAt (and reviewedBy), and a REV line in GENERATION-LOG.md.
// Warns (never blocks) on validator failures and on scenes whose design note is still building / look-pending.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseArgs } from '../sim-test/lib/args.mjs';
import { bundleFromArg, defaultBundle, KIT_ROOT } from '../sim-test/lib/bundle.mjs';
import { resolveScope } from './lib/units.mjs';
import { planStatus, applyStatus, kitReviewer } from './lib/approval.mjs';

const un = /unapprove\.mjs$/.test(process.argv[1] || '') || process.argv.includes('--unapprove');
const USAGE = `node tools/operator/${un ? 'unapprove' : 'approve'}.mjs --bundle <id> (--slide L01S03 | --lesson L01 | --module <id> | --bank <id> | --file <path> | --all) [--yes] [--by <name>]`;
const A = parseArgs(process.argv.slice(2).filter((a) => a !== '--unapprove'), { tool: un ? 'unapprove' : 'approve', file: import.meta.url, usage: USAGE, val: ['bundle', 'slide', 'lesson', 'module', 'bank', 'file', 'by'], bool: ['all', 'yes'] });
const B = A.val('bundle') ? bundleFromArg(A.val('bundle')) : defaultBundle();
if (!B) { console.error('pass --bundle <id>'); process.exit(2); }
const scope = { slide: A.val('slide'), lesson: A.val('lesson'), module: A.val('module'), bank: A.val('bank'), file: A.val('file'), all: A.has('all') };
if (!Object.values(scope).some(Boolean)) { console.error(USAGE); process.exit(2); }
let files;
try { files = resolveScope(B, scope); } catch (e) { console.error(e.message); process.exit(2); }

const target = un ? 'ai-draft' : 'human-approved';
const by = A.val('by') || kitReviewer(process.cwd());
const { todo: todoFiles, same: sameFiles } = planStatus(B, scope, target);
const todo = todoFiles.map((f) => [f, JSON.parse(fs.readFileSync(f, 'utf8'))]);
const same = sameFiles.length;
console.log(`${un ? 'unapprove' : 'approve'} ${path.basename(B)}: ${todo.length} to change, ${same} already ${target}${A.has('yes') ? '' : ' (dry run: add --yes)'}`);
for (const [f] of todo.slice(0, 40)) console.log('  ' + path.relative(B, f));
if (todo.length > 40) console.log(`  ... and ${todo.length - 40} more`);

if (!un && todo.length) {
  const v = spawnSync(process.execPath, [path.join(KIT_ROOT, 'validators', 'validate.mjs'), ...todo.map(([f]) => f)], { encoding: 'utf8', cwd: KIT_ROOT });
  if (v.status !== 0) console.log(`  WARN validator reports problems (run: node validators/validate.mjs on these files)`);
  const building = [];
  for (const [, j] of todo) {
    const src = j.simulation?.src || j.src;
    if (!src) continue;
    const d = path.join(B, String(src).replace(/\.js$/, '.design.md'));
    try { const st = /^Status:\s*(\S+)/m.exec(fs.readFileSync(d, 'utf8'))?.[1]; if (st && st !== 'done') building.push(`${src} (${st})`); } catch { /* no note */ }
  }
  if (building.length) console.log(`  WARN scenes not done: ${[...new Set(building)].join(', ')}`);
}
if (!A.has('yes') || !todo.length) process.exit(0);

const scopeText = Object.entries(scope).filter(([, v]) => v).map(([k, v]) => (v === true ? k : `${k}=${v}`)).join(' ');
applyStatus(B, todoFiles, target, by, scopeText);
console.log(`done: ${todo.length} file(s) set to ${target}`);
