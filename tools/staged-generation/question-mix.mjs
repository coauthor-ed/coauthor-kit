#!/usr/bin/env node
// question-mix - what the questions add up to, and where the correct answers sit.
//
//   node tools/staged-generation/question-mix.mjs <bundle id | dir> [--bank]
//
// Prints question types per lesson and, for mcq-single@2, how often the correct
// option is 1st/2nd/3rd/4th. A lesson mount does NOT shuffle options (only a test
// session passes a PRNG), so authored order is what the learner sees: an answer
// that is nearly always 1st or 2nd is guessable. WARN when one position holds more
// than 60% of a lesson's mcq (4 or more of them), or more than 40% of the bundle's
// (10 or more). Exit 0 always (advisory); lesson-check repeats the per-lesson WARN.
import fs from 'node:fs';
import path from 'node:path';
import { bundleFromArg, defaultBundle } from '../sim-test/lib/bundle.mjs';

const args = process.argv.slice(2);
const B = (args.find((a) => !a.startsWith('--')) ? bundleFromArg(args.find((a) => !a.startsWith('--'))) : defaultBundle());
if (!B) { console.error('usage: node tools/staged-generation/question-mix.mjs <bundle> [--bank]'); process.exit(2); }
const root = path.join(B, 'questions');
const dirs = fs.existsSync(root) ? fs.readdirSync(root).filter((d) => fs.statSync(path.join(root, d)).isDirectory() && (args.includes('--bank') ? d === 'bank' : d !== 'bank')).sort() : [];
const all = { types: {}, pos: [0, 0, 0, 0, 0, 0], mcq: 0 };
let warns = 0;
for (const d of dirs) {
  const types = {}, pos = [0, 0, 0, 0, 0, 0]; let mcq = 0;
  for (const f of fs.readdirSync(path.join(root, d)).filter((x) => x.endsWith('.json'))) {
    let q; try { q = JSON.parse(fs.readFileSync(path.join(root, d, f), 'utf8')); } catch { continue; }
    types[q.type] = (types[q.type] || 0) + 1; all.types[q.type] = (all.types[q.type] || 0) + 1;
    if (q.type === 'mcq-single@2' && Array.isArray(q.options)) {
      const i = q.options.findIndex((o) => o.id === q.correctOptionId);
      if (i >= 0) { pos[Math.min(i, 5)]++; all.pos[Math.min(i, 5)]++; mcq++; all.mcq++; }
    }
  }
  const t = Object.entries(types).map(([k, v]) => `${k.replace(/@\d+$/, '')} ${v}`).join(', ');
  console.log(`${d}: ${t}${mcq ? `; correct option 1st-4th: ${pos.slice(0, 4).join('/')}` : ''}`);
  if (mcq >= 4 && Math.max(...pos) / mcq > 0.6) { warns++; console.log(`  WARN ${d}: ${Math.max(...pos)} of ${mcq} mcq have the correct option at position ${pos.indexOf(Math.max(...pos)) + 1} - spread them over 1st-4th`); }
}
console.log(`total: ${Object.entries(all.types).map(([k, v]) => `${k.replace(/@\d+$/, '')} ${v}`).join(', ')}${all.mcq ? `; correct option 1st-4th: ${all.pos.slice(0, 4).join('/')}` : ''}`);
if (all.mcq >= 10 && Math.max(...all.pos) / all.mcq > 0.4) { warns++; console.log(`  WARN bundle: ${Math.max(...all.pos)} of ${all.mcq} mcq have the correct option at position ${all.pos.indexOf(Math.max(...all.pos)) + 1} (${Math.round(100 * Math.max(...all.pos) / all.mcq)}%) - aim for about ${Math.round(100 / 4)}% each`); }
console.log(`${warns ? 'WARN' : 'ok'} - ${warns} warning(s)`);
