#!/usr/bin/env node
// directions - print the operator's directions named on your invocation ("Notes: n4,n7"), or those for a scope. Read-only.
//
//   node tools/directions.mjs --bundle <id> n4,n7
//   node tools/directions.mjs --bundle <id> --scope L02/RampScene [--stage 3]
// A direction beats the stub, outline and design note; put a conflict under ## Requests (Stage 3) or in the log.
// Mark them done when honored: --notes n4,n7 on your close (log.mjs add|rev, log-stage3.mjs, scene-pass.mjs end).
import { parseArgs } from './sim-test/lib/args.mjs';
import { bundleFromArg, defaultBundle } from './sim-test/lib/bundle.mjs';
import { loadNotes, directionsFor, directionLine } from './operator/lib/notes.mjs';

const A = parseArgs(process.argv.slice(2), { tool: 'directions', file: import.meta.url, usage: 'node tools/directions.mjs --bundle <id> <n4,n7> | --scope <bundle|L02|L02S03|L02/Scene> [--stage N]', val: ['bundle', 'scope', 'stage'], bool: [] });
const B = A.val('bundle') ? bundleFromArg(A.val('bundle')) : defaultBundle();
if (!B) { console.error('pass --bundle <id>'); process.exit(2); }
const want = A.pos.join(',').split(/[,\s]+/).filter(Boolean);
let ds;
if (want.length) {
  const all = loadNotes(B);
  ds = want.map((id) => all.find((n) => n.id === id) || { id, scope: '?', text: '(no such note)' });
} else if (A.val('scope')) ds = directionsFor(B, A.val('scope'), { stage: A.val('stage') });
else { console.error('pass the ids (n4,n7) or --scope'); process.exit(2); }
console.log(ds.length ? ds.map((d) => `${directionLine(d)}${d.state && d.state !== 'accepted' ? ` (${d.state})` : ''}`).join('\n') : 'no directions');
