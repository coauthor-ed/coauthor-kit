#!/usr/bin/env node
// index-scenes - (re)build the scene reuse index under .cache/scenes/. OPERATOR ONLY (find-scene also rebuilds it lazily).
//
//   node tools/operator/index-scenes.mjs [--lint]
// Every scene of every bundle and examples/ that passes the quality filter: design note Status done (examples may have no note),
// CONTINUOUS declared, not a stub, not excluded in reuse-exclude.txt; --lint also requires ident-lint clean (slower).
import { parseArgs } from '../sim-test/lib/args.mjs';
import { buildIndex } from './lib/scenes.mjs';

const A = parseArgs(process.argv.slice(2), { tool: 'index-scenes', file: import.meta.url, usage: 'node tools/operator/index-scenes.mjs [--lint]', val: [], bool: ['lint'] });
const r = buildIndex(process.cwd(), { lint: A.has('lint') });
console.log(`indexed ${r.entries.length} scene(s), skipped ${r.skipped.length}`);
const why = {}; for (const s of r.skipped) why[s.why] = (why[s.why] || 0) + 1;
for (const [k, v] of Object.entries(why).sort((a, b) => b[1] - a[1]).slice(0, 8)) console.log(`  skipped ${v}: ${k}`);
