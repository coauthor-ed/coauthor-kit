#!/usr/bin/env node
// notes - the review notes queue of a bundle (courses/<b>/review-notes.json, hand-editable). OPERATOR ONLY.
//
//   node tools/operator/notes.mjs list [--bundle <id>] [--state open|accepted|rejected|done] [--kind <k>]
//   node tools/operator/notes.mjs add --scope L02S03 [--beat 2] [--kind fact|pedagogy|language|bug|other|alternative] "<text>"
//                                                     (alternative: --scope L02/SceneName, accepted; offered by next.mjs --interactive as a Stage 3 build; never in a fix prompt)
//   node tools/operator/notes.mjs accept|reject|done|reopen <id...>      (reopen = back to accepted)
//   node tools/operator/notes.mjs --done n1,n2 | --reopen n1,n2
//   node tools/operator/notes.mjs --edit <id> [--text ".."] [--kind ..] [--scope ..] [--stage 1a|1b|2|3|4|none]
//   node tools/operator/notes.mjs --delete <id>
//   node tools/operator/notes.mjs --direct <scope> "<text>" [--stage 1a|1b|2|3|4]   a direction (steers generation): scope bundle | L02 |
//                                                     L02S03 | L02/RampScene; starts accepted; next.mjs adds "Notes: <ids>" to matching invocations
//   node tools/operator/notes.mjs --show-directions [--scope L02/RampScene] [--stage 3]   the accepted, undone directions for a scope
//   node tools/operator/notes.mjs --dispatch [--web] [--combined] [--lesson L02]   one Revise: invocation per lesson for the accepted notes
//                                                     (--combined: ONE prompt for all lessons, as the review panel's Copy fix prompt)
// Notes taken in the review bar start accepted; model critique notes (source: model) start open for you to accept or reject.
// Directions and alternative notes never go in a fix prompt. Agents print theirs with tools/directions.mjs and mark them done with --notes on their close command.
import { parseArgs } from '../sim-test/lib/args.mjs';
import { bundleFromArg, defaultBundle } from '../sim-test/lib/bundle.mjs';
import path from 'node:path';
import { loadNotes, addNote, editNote, deleteNote, setState, dispatch, fixPrompt, directionsFor, directionLine } from './lib/notes.mjs';

const USAGE = 'node tools/operator/notes.mjs list|add|accept|reject|done|reopen | --edit <id> | --delete <id> | --done <ids> | --reopen <ids> | --direct <scope> "<text>" | --show-directions | --dispatch [--bundle <id>]';
const A = parseArgs(process.argv.slice(2), { tool: 'notes', file: import.meta.url, usage: USAGE, val: ['bundle', 'state', 'scope', 'beat', 'kind', 'lesson', 'edit', 'delete', 'done', 'reopen', 'direct', 'text', 'stage'], bool: ['dispatch', 'web', 'combined', 'show-directions'] });
const B = A.val('bundle') ? bundleFromArg(A.val('bundle')) : defaultBundle();
if (!B) { console.error('pass --bundle <id>'); process.exit(2); }
const cmd = A.pos[0];
const ids = (s) => String(s || '').split(/[,\s]+/).filter(Boolean);
const run = (fn) => { try { fn(); } catch (e) { console.error(`notes: ${e.message}`); process.exit(2); } };
const row = (n) => `${n.id.padEnd(5)} ${n.state.padEnd(9)} ${n.scope.padEnd(9)} ${n.kind.padEnd(9)} ${n.source.padEnd(6)} ${n.stage ? `[stage ${n.stage}] ` : ''}${n.text.slice(0, 90)}`;
if (A.val('edit')) run(() => {
  const ch = {}; for (const k of ['text', 'kind', 'scope']) if (A.val(k) != null) ch[k] = A.val(k);
  if (A.val('stage') != null) ch.stage = A.val('stage') === 'none' ? null : A.val('stage');
  if (!Object.keys(ch).length) throw new Error('--edit needs --text, --kind, --scope or --stage');
  console.log(`edited: ${row(editNote(B, A.val('edit'), ch))}`);
});
else if (A.val('delete')) run(() => { deleteNote(B, A.val('delete')); console.log(`deleted ${A.val('delete')}`); });
else if (A.val('done') || A.val('reopen')) run(() => {
  const st = A.val('done') ? 'done' : 'accepted'; const list = ids(A.val('done') || A.val('reopen'));
  console.log(`${setState(B, list, st)} of ${list.length} note(s) set ${st}`);
});
else if (A.val('direct')) run(() => {
  const n = addNote(B, { scope: A.val('direct'), kind: 'direction', stage: A.val('stage'), text: A.pos.join(' ') || A.val('text') });
  console.log(`added direction ${n.id} [${n.scope}${n.stage ? `, stage ${n.stage}` : ''}] (accepted)`);
});
else if (A.has('show-directions')) {
  const ds = directionsFor(B, A.val('scope') || 'bundle', { stage: A.val('stage'), any: !A.val('scope') });
  console.log(ds.length ? ds.map(directionLine).join('\n') : 'no accepted directions for this scope');
} else if (A.has('dispatch') && A.has('combined')) {
  const f = fixPrompt(B, path.basename(B), { web: A.has('web'), lesson: A.val('lesson') });
  console.log(f.count ? f.text : 'no accepted notes');
} else if (A.has('dispatch')) {
  const d = dispatch(B, path.basename(B), { web: A.has('web'), lesson: A.val('lesson') });
  if (!d.length) console.log('no accepted notes');
  d.forEach((x) => console.log(`\n# ${x.lesson} (${x.ids.length} note(s))\n${x.text}`));
} else if (cmd === 'list' || !cmd) {
  const st = A.val('state'), k = A.val('kind'); const ns = loadNotes(B).filter((n) => (!st || n.state === st) && (!k || n.kind === k));
  console.log(ns.length ? ns.map(row).join('\n') : 'no notes');
} else if (cmd === 'add') run(() => {
  const n = addNote(B, { scope: A.val('scope'), beat: A.val('beat') ? Number(A.val('beat')) : null, kind: A.val('kind'), stage: A.val('stage'), text: A.pos.slice(1).join(' ') });
  console.log(`added ${n.id}`);
});
else if (['accept', 'reject', 'done', 'reopen'].includes(cmd)) {
  console.log(`${setState(B, A.pos.slice(1), { accept: 'accepted', reject: 'rejected', done: 'done', reopen: 'accepted' }[cmd])} note(s) updated`);
} else { console.error(`usage: ${USAGE}`); process.exit(2); }
