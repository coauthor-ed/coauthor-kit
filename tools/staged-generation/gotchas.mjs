#!/usr/bin/env node
// gotchas - harvest recurring lessons from earlier runs' design notes, for a HUMAN to curate into
// briefs/reference/gotchas.md (Stage 3 reads that file, not this raw list).
//
//   node tools/staged-generation/gotchas.mjs --scan-root <dir> [--scan-root <dir>] [--top 40] [--min 2]
//
// Reads every *.design.md under the roots, takes the bullets under "## Checks explained" and "## Requests",
// normalises them (numbers, quotes and names removed) and prints the ones that recur, most frequent first,
// with one example path each. Nothing is written.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from '../sim-test/lib/args.mjs';

const A = parseArgs(process.argv.slice(2), { tool: 'gotchas', file: import.meta.url, usage: 'node tools/staged-generation/gotchas.mjs --scan-root <dir> [--top N] [--min N]', val: ['scan-root', 'top', 'min'], bool: [] });
const roots = [A.val('scan-root')].filter(Boolean).concat(A.pos);
if (!roots.length) { console.error('usage: gotchas.mjs --scan-root <dir> [--top N] [--min N]'); process.exit(2); }
const files = [];
for (const r of roots) (function walk(d, depth) { if (depth > 7 || !fs.existsSync(d)) return; for (const f of fs.readdirSync(d)) { if (f === 'node_modules' || f === '.git' || f === 'build') continue; const p = path.join(d, f); const st = fs.statSync(p); if (st.isDirectory()) walk(p, depth + 1); else if (f.endsWith('.design.md')) files.push(p); } })(path.resolve(r), 0);
const groups = new Map();
for (const p of files) {
  const s = fs.readFileSync(p, 'utf8');
  for (const h of ['Checks explained', 'Requests']) {
    const sec = (s.split(new RegExp(`^## ${h}.*$`, 'mi'))[1] || '').split(/^## /m)[0];
    for (const b of sec.split(/\n(?=- )/)) {
      const t = b.replace(/\s+/g, ' ').trim(); if (t.length < 25 || !t.startsWith('-')) continue;
      const key = t.toLowerCase().replace(/[`*"'()\[\]]/g, '').replace(/\d+(\.\d+)?/g, '#').replace(/[^a-z# ]+/g, ' ').split(' ').filter((w) => w.length > 3).slice(0, 8).join(' ');
      const g = groups.get(key) || { n: 0, ex: t.slice(0, 220), p, h }; g.n++; groups.set(key, g);
    }
  }
}
const min = Number(A.val('min')) || 2;
const out = [...groups.values()].filter((g) => g.n >= min).sort((a, b) => b.n - a.n).slice(0, Number(A.val('top')) || 40);
console.log(`${files.length} design notes, ${groups.size} distinct bullets, ${out.length} recurring (>= ${min}):`);
for (const g of out) console.log(`\n[${g.n}x ${g.h}] ${g.ex}\n   e.g. ${g.p}`);
