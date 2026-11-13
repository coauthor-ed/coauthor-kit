#!/usr/bin/env node
// meta apply - fill subject and grade (blank-only) from bundle.json into module and bank files. OPERATOR ONLY.
//
//   node tools/operator/meta.mjs apply --bundle <id> [--yes]
// Never touches a filled value; no chapterId; lessons and question files untouched. Dry run unless --yes.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from '../sim-test/lib/args.mjs';
import { bundleFromArg, defaultBundle } from '../sim-test/lib/bundle.mjs';
import { moduleFiles, bankFiles } from './lib/units.mjs';
import { bundleMeta, readJ } from './lib/manifest.mjs';

const A = parseArgs(process.argv.slice(2), { tool: 'meta', file: import.meta.url, usage: 'node tools/operator/meta.mjs apply --bundle <id> [--yes]', val: ['bundle'], bool: ['yes'] });
if (A.pos[0] !== 'apply') { console.error('usage: node tools/operator/meta.mjs apply --bundle <id> [--yes]'); process.exit(2); }
const B = A.val('bundle') ? bundleFromArg(A.val('bundle')) : defaultBundle();
if (!B) { console.error('pass --bundle <id>'); process.exit(2); }
const bj = bundleMeta(B);
if (!bj.subject) { console.error(`bundle.json needs subject first (grade is optional) (${path.join(B, 'bundle.json')})`); process.exit(2); }
let n = 0;
for (const f of [...moduleFiles(B), ...bankFiles(B)]) {
  const j = readJ(f); if (!j || j.type === 'question') continue;
  if (!/^(module|bank|exam|course)/.test(String(j.type || ''))) continue;
  const add = {}; if (!j.subject) add.subject = bj.subject; if ((j.grade == null || j.grade === '') && bj.grade != null && bj.grade !== '') add.grade = bj.grade;
  if (!Object.keys(add).length) continue;
  n++; console.log(`${A.has('yes') ? 'set' : 'would set'} ${Object.keys(add).join('+')} in ${path.relative(B, f)}`);
  if (A.has('yes')) fs.writeFileSync(f, JSON.stringify({ ...j, ...add }, null, 2) + '\n');
}
console.log(`${n} file(s)${A.has('yes') ? ' updated' : ' to update (dry run: add --yes)'}`);
