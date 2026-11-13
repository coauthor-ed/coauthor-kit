#!/usr/bin/env node
// reuse - exclusions and review for the scene reuse index. OPERATOR ONLY.
//
//   node tools/operator/reuse.mjs exclude <bundle/Scene | bundle/L02 | bundle/<module-id>> [--why "..."]
//   node tools/operator/reuse.mjs include <ref>        remove an exclusion
//   node tools/operator/reuse.mjs list                 current exclusions
//   node tools/operator/reuse.mjs review               indexed scenes per bundle (spot junk)
//   node tools/operator/reuse.mjs --why <bundle/Scene> why a scene is not indexed (or is)
// Exclusions live in reuse-exclude.txt (workspace root, tracked); they apply on every index rebuild and only affect future searches.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from '../sim-test/lib/args.mjs';
import { loadIndex, readExclusions } from './lib/scenes.mjs';

const A = parseArgs(process.argv.slice(2), { tool: 'reuse', file: import.meta.url, usage: 'node tools/operator/reuse.mjs exclude|include <ref> | list | review | --why <ref>', val: ['why'], bool: [] });
const root = process.cwd(); const f = path.join(root, 'reuse-exclude.txt');
const cmd = A.pos[0], ref = A.pos[1];
if (A.val('why') && !cmd) {
  const idx = loadIndex(root, { rebuild: true }); const r = A.val('why');
  const e = idx.entries.find((x) => x.id.startsWith(r + '@')); const s = idx.skipped.find((x) => x.ref === r);
  console.log(e ? `${r}: indexed as ${e.id}` : s ? `${r}: not indexed (${s.why})` : `${r}: not found`);
} else if (cmd === 'exclude' && ref) {
  const why = A.pos.slice(2).join(' ');
  fs.appendFileSync(f, `${why ? `# ${why}\n` : ''}${ref}\n`); console.log(`excluded ${ref}`); loadIndex(root, { rebuild: true });
} else if (cmd === 'include' && ref) {
  const lines = fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n') : [];
  fs.writeFileSync(f, lines.filter((l) => l.trim() !== ref).join('\n')); console.log(`included ${ref}`); loadIndex(root, { rebuild: true });
} else if (cmd === 'list') { const x = readExclusions(root); console.log(x.length ? x.join('\n') : '(none)'); }
else if (cmd === 'review') {
  const idx = loadIndex(root, { rebuild: true }); const by = {};
  for (const e of idx.entries) (by[e.bundle] = by[e.bundle] || []).push(e.scene);
  for (const [b, l] of Object.entries(by)) console.log(`${b}: ${l.length}  ${l.slice(0, 6).join(', ')}${l.length > 6 ? ', ...' : ''}`);
  console.log(`${idx.entries.length} indexed, ${idx.skipped.length} skipped`);
} else { console.error('usage: node tools/operator/reuse.mjs exclude|include <ref> | list | review | --why <ref>'); process.exit(2); }
