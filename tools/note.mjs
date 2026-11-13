#!/usr/bin/env node
// note - a critique finding for the operator's review queue (Stage R). Writes a note with source "model", state "open".
//
//   node tools/note.mjs --bundle <id> --scope L02S03 --kind fact|pedagogy|language|bug|other [--beat 2] "<what is wrong, with the evidence>"
//   (kind alternative = "show me another way" for a built scene: scope L02/SceneName only; operator-side, never a fix)
// You never edit content in Stage R. The operator accepts or rejects each note; accepted ones become Revise runs.
import { parseArgs } from './sim-test/lib/args.mjs';
import { bundleFromArg, defaultBundle } from './sim-test/lib/bundle.mjs';
import { addNote } from './operator/lib/notes.mjs';

const A = parseArgs(process.argv.slice(2), { tool: 'note', file: import.meta.url, usage: 'node tools/note.mjs --bundle <id> --scope L02S03 --kind fact|pedagogy|language|bug|other|alternative [--beat N] "<text>" (alternative: --scope L02/SceneName)', val: ['bundle', 'scope', 'kind', 'beat'], bool: [] });
const B = A.val('bundle') ? bundleFromArg(A.val('bundle')) : defaultBundle();
if (!B) { console.error('pass --bundle <id>'); process.exit(2); }
try { const n = addNote(B, { scope: A.val('scope'), kind: A.val('kind'), beat: A.val('beat') ? Number(A.val('beat')) : null, text: A.pos.join(' '), source: 'model' }); console.log(`note ${n.id} saved (open)`); }
catch (e) { console.error(e.message); process.exit(2); }
