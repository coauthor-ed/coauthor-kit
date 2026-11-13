#!/usr/bin/env node
// log - the only writer of courses/<bundle>/GENERATION-LOG.md. Atomic single-write appends, so parallel runs cannot interleave.
//
//   node tools/log.mjs add --stage 2 --lesson L02 --model "<name>" [--notes n4,n7] "<text>"   append a section: heading, Model line, text
//   node tools/log.mjs rev --scope L02S03 --who "<model|name>" --what "<text>" [--sources url,url] [--notes n1,n2]
//                                                                             append one line: REV <date> <scope> | <who> | <what> | <urls>
//   node tools/log.mjs --tail 20                                              last N lines
//   --bundle <id|dir>  REQUIRED for add/rev (a bare call is accepted only inside a bundle dir or with one bundle in total; .focus is
//                      never used for writes: parallel runs on other bundles would land in the wrong log). --tail may use .focus.
// Never read or edit GENERATION-LOG.md by hand. Stage 3 scenes are logged by tools/staged-generation/log-stage3.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from './sim-test/lib/args.mjs';
import { bundleFromArg, defaultBundle, KIT_ROOT } from './sim-test/lib/bundle.mjs';
import { setState } from './operator/lib/notes.mjs';

const USAGE = 'node tools/log.mjs add|rev --bundle <id> [--stage S] [--lesson L] [--model M] [--scope X] [--who W] [--what T] [--sources u,u] [--notes n,n] ["<text>"] | --tail N';
const A = parseArgs(process.argv.slice(2), { tool: 'log', file: import.meta.url, usage: USAGE, val: ['bundle', 'stage', 'lesson', 'model', 'scope', 'who', 'what', 'sources', 'notes', 'tail'], bool: [] });

function focusBundle() {
  try { const id = fs.readFileSync(path.join(process.cwd(), '.focus'), 'utf8').trim(); if (id) return bundleFromArg(id); } catch { /* no focus */ }
  return null;
}
const writing = ['add', 'rev'].includes(A.pos[0]);
const B = A.val('bundle') ? bundleFromArg(A.val('bundle')) : ((writing ? null : focusBundle()) || defaultBundle());
if (!B) { console.error(`pass --bundle <id> (several bundles; a write never falls back to .focus)\n${USAGE}`); process.exit(2); }
const logP = path.join(B, 'GENERATION-LOG.md');
const HEADER = '# Generation log\n\nDo not read or edit this file; use tools/log.mjs.\n';

function ensure() {
  if (!fs.existsSync(logP)) fs.writeFileSync(logP, HEADER);
}
function append(text) {
  ensure();
  const fd = fs.openSync(logP, 'a');
  try { fs.writeSync(fd, text); } finally { fs.closeSync(fd); }
}
function kitVersion() {
  for (const d of [process.cwd(), KIT_ROOT]) { try { const v = fs.readFileSync(path.join(d, 'kit-version'), 'utf8').trim(); if (v) return v; } catch { /* none */ } }
  return null;
}

if (A.val('tail')) {
  if (!fs.existsSync(logP)) { console.log('(no log yet)'); process.exit(0); }
  const n = Number(A.val('tail'));
  console.log(fs.readFileSync(logP, 'utf8').split('\n').slice(-n).join('\n'));
  process.exit(0);
}
const cmd = A.pos[0];
const one = (s) => String(s || '').replace(/\s*\n\s*/g, ' ').trim();
if (cmd === 'add') {
  const text = A.pos.slice(1).join(' ').trim();
  const model = A.val('model');
  if (!A.val('stage') || !model || !text) { console.error(`add needs --stage, --model and the text\n${USAGE}`); process.exit(2); }
  const les = A.val('lesson');
  if (les && /^L\d/.test(les) && fs.existsSync(path.join(B, 'OUTLINE.md')) && !fs.readFileSync(path.join(B, 'OUTLINE.md'), 'utf8').includes(les)) {
    console.error(`lesson ${les} is not in ${path.basename(B)}/OUTLINE.md: wrong --bundle? Nothing was logged.`); process.exit(2);
  }
  const head = `## Stage ${A.val('stage')}${A.val('lesson') ? ` - ${A.val('lesson')}` : ''}`;
  const kv = kitVersion();
  append(`\n${head}\nModel: ${model}${kv ? `\nKit: ${kv}` : ''}\n${text}\n`);
  console.log(`logged under "${head}" in ${logP}`);
  if (A.val('notes')) markNotesDone(A.val('notes'));
} else if (cmd === 'rev') {
  const { scope, who, what } = { scope: A.val('scope'), who: A.val('who'), what: A.val('what') };
  if (!scope || !who || !what) { console.error(`rev needs --scope, --who and --what\n${USAGE}`); process.exit(2); }
  const date = new Date().toISOString().slice(0, 10);
  const notes = A.val('notes');
  append(`REV ${date} ${scope} | ${one(who)} | ${one(what)} | ${A.val('sources') || ''}${notes ? ` | notes:${notes}` : ''}\n`);
  console.log(`REV line written to ${logP}`);
  if (notes) markNotesDone(notes);
} else { console.error(USAGE); process.exit(2); }

// Notes queue: mark the named review notes / directions done (review-notes.json, atomic write).
function markNotesDone(ids) {
  if (!fs.existsSync(path.join(B, 'review-notes.json'))) return;
  try { console.log(`notes done: ${setState(B, ids.split(/[,\s]+/).filter(Boolean), 'done')}`); } catch { /* leave notes untouched */ }
}
