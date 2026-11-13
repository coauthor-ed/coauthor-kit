#!/usr/bin/env node
// clean - delete old disposable output under build/ (shots, peek, scratch, rasterized pages). OPERATOR ONLY.
//
//   node tools/operator/clean.mjs [--older-than 14d] [--yes]      dry run unless --yes
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from '../sim-test/lib/args.mjs';

const A = parseArgs(process.argv.slice(2), { tool: 'clean', file: import.meta.url, usage: 'node tools/operator/clean.mjs [--older-than 14d] [--yes]', val: ['older-than'], bool: ['yes'] });
const m = /^(\d+)([dh])$/.exec(A.val('older-than') || '14d');
if (!m) { console.error('--older-than takes 14d or 12h'); process.exit(2); }
const cut = Date.now() - Number(m[1]) * (m[2] === 'd' ? 86400e3 : 3600e3);
const root = path.join(process.cwd(), 'build');
let n = 0, bytes = 0;
function walk(d) {
  for (const e of fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }) : []) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { walk(p); if (A.has('yes') && !fs.readdirSync(p).length) fs.rmdirSync(p); }
    else { const st = fs.statSync(p); if (st.mtimeMs < cut) { n++; bytes += st.size; if (A.has('yes')) fs.rmSync(p); } }
  }
}
walk(root);
console.log(`${A.has('yes') ? 'deleted' : 'would delete'} ${n} file(s), ${(bytes / 1048576).toFixed(1)} MB under build/${A.has('yes') ? '' : ' (dry run: add --yes)'}`);
