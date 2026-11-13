#!/usr/bin/env node
// log-stage3 - the close of a Stage 3 run in one command (stage3-cost-analysis P6): writes the scene's
// bullet under `## Stage 3 - L0N` in GENERATION-LOG.md and sets the design note's `Status:`.
//
//   node tools/staged-generation/log-stage3.mjs --bundle <id|dir> --target L0N/<Scene> --model "<name>" --what "<one line: what it shows>"
//        [--controls "<added beyond the stub>"] [--numbers "<model numbers>"] [--flags "<conflicts, facts to check>"]
//        [--status done|look-pending|review-pending] [--look] [--notes n4,n7] [--no-log] [--dry-run]
//
// Budgets: aim for the WHOLE bullet under 600 characters; 600-1000 is written with a note, above 1000 is refused (never truncated). Aim for --what 150, --controls 50,
// --numbers 110, --flags 130 (about 440 in all with the fixed text); a trailing "." on --what is dropped. The design note holds the detail, not the log.
// Facts come from files, not from you: beat count (scene-info's real count), base class (design note), date.
// Status defaults to `done` when the note's "## Look log" has at least one line, else `look-pending`. A bullet for the
// same scene is replaced, never duplicated. `Look: later` runs pass --status look-pending and write nothing under
// `## Look log`. Parallel runs (the log is not yours to edit) pass --no-log: it sets the Status and prints the exact
// section (heading, Model line, bullet) to give in the report; GENERATION-LOG.md is not touched.
// --look with look-pending is turned into done by the look cap (lib/lookCap.mjs): the last pass changed nothing, or 3 passes ran.
// review-pending: a `Review: manual` run (no tests run, no shoot, no verify/look pass): the operator runs the tests in the preview and marks it reviewed.
// --notes: the operator directions (invocation "Notes:") this run honored: marked done in review-notes.json.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseArgs } from '../sim-test/lib/args.mjs';
import { bundleFromArg, resolveTarget, describeMiss, sceneName } from '../sim-test/lib/bundle.mjs';
import { setState } from '../operator/lib/notes.mjs';
import { lookCap } from './lib/lookCap.mjs';

const USAGE = 'node tools/staged-generation/log-stage3.mjs --bundle <id|dir> --target L0N/<Scene> --model "<name>" --what "<one line>" [--controls ..] [--numbers ..] [--flags ..] [--status done|look-pending|review-pending] [--look] [--notes n4,n7] [--no-log] [--dry-run]';
const A = parseArgs(process.argv.slice(2), { tool: 'log-stage3', file: import.meta.url, usage: USAGE, val: ['bundle', 'target', 'model', 'what', 'controls', 'numbers', 'flags', 'status', 'notes'], bool: ['dry-run', 'no-log', 'look'] });
const bundleDir = bundleFromArg(A.val('bundle'));
const t = resolveTarget(A.val('target') || A.pos[0] || '', bundleDir);
if (!t || t.kind !== 'scene') { console.error(describeMiss(A.val('target') || '', bundleDir)); process.exit(2); }
const model = A.val('model'), what = (A.val('what') || '').trim().replace(/[.\s]+$/, '');
if (!model || !what) { console.error(`--model and --what are required\n${USAGE}`); process.exit(2); }
const B = t.bundle || bundleDir;
const js = t.file.replace(/\.(stub|design)\.md$/, '.js');
const designP = js.replace(/\.js$/, '.design.md');
if (!fs.existsSync(designP)) { console.error(`no design note at ${designP}`); process.exit(2); }
const lesson = path.basename(path.dirname(js));
const name = sceneName(js);
let design = fs.readFileSync(designP, 'utf8');

const info = spawnSync(process.execPath, [new URL('../sim-test/scene-info.mjs', import.meta.url).pathname, `${lesson}/${name}`, '--bundle', B, '--no-text'], { encoding: 'utf8' }).stdout || '';
const beats0 = (/(\d+) beat/i.exec(info) || /beats?:?\s*(\d+)/i.exec(info) || [])[1] || (/none|mini-game/i.test(info) ? '0' : '?');
const stubP = js.replace(/\.js$/, '.stub.md');
const stubBeats = fs.existsSync(stubP) ? (/^Beats:\s*(\d+)/mi.exec(fs.readFileSync(stubP, 'utf8')) || [])[1] : null;
const base = ((/^Base class:\s*(.+)$/m.exec(design) || [])[1] || '?').replace(/`/g, '').replace(/\s+[-(:].*$/, '').trim();
const looked = ((design.split(/^## Look log.*$/m)[1] || '').split(/^## /m)[0] || '').split('\n').filter((l) => l.trim()).length > 0;
// A Look log line that leaves something needing eyes ("left - <item>") is not done.
const leftOpen = /\bleft\s*-\s*(?!none\b|nothing\b|-|\s*$)\S/i.test((design.split(/^## Look log.*$/m)[1] || '').split(/^## /m)[0] || '');
let status = A.val('status') || (looked && !leftOpen ? 'done' : 'look-pending');
// Look cap (lib/lookCap.mjs): a 3-look pass that changed nothing, or a 3rd pass, closes done; no further pass is scheduled.
const cap = A.has('look') && status === 'look-pending' ? lookCap(design) : null;
if (cap) { status = 'done'; console.log(`CAP: ${cap}: Status done, not look-pending. Put anything left under open: and ## Requests (not another pass).`); }
if (!['done', 'look-pending', 'review-pending'].includes(status)) { console.error('--status is done, look-pending or review-pending'); process.exit(2); }
// Warn only, never refuse: closing `done` with a Look log line that still says "left - <item>" is allowed (the operator may run another look pass).
if (status === 'done' && leftOpen) console.log('WARN: Status done, but the Look log still has a "left - <item>" line (something no pass has seen yet). That is allowed; say it in --flags so the operator can choose another look pass.');
const markNotes = () => { const ids = String(A.val('notes') || '').split(/[,\s]+/).filter(Boolean); if (ids.length && fs.existsSync(path.join(B, 'review-notes.json'))) console.log(`notes done: ${setState(B, ids, 'done')}`); };
const beats = beats0 === '0' && stubBeats && stubBeats !== '0' ? `${stubBeats}` : beats0;
const date = new Date().toISOString().slice(0, 10);
let bullet = `- ${name} (${beats} beats, ${base}, ${date}): ${what}. Model: ${model}.`;
const extra = [['Controls added beyond the stub', A.val('controls')], ['Model numbers', A.val('numbers')], ['Flags', A.val('flags') || 'none']].filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`);
if (extra.length) bullet += `\n  ${extra.join('. ')}.`;
if (bullet.length > 1000) {
  const parts = [['--what', what], ['--controls', A.val('controls')], ['--numbers', A.val('numbers')], ['--flags', A.val('flags')]].filter(([, v]) => v).map(([k, v]) => `${k} ${v.length}`).join(', ');
  console.error(`bullet is ${bullet.length} characters, hard limit 1000: cut ${bullet.length - 1000} or more (600 is the aim; 600-1000 is written with a note) (field lengths: ${parts}). The design note holds the detail. Aim for --what 150, --controls 50, --numbers 110, --flags 130 characters.`);
  process.exit(2);
}
if (bullet.length > 600) console.error(`note: bullet is ${bullet.length} characters (aim under 600; written anyway, trim --numbers/--flags next time).`);

const logP = path.join(B, 'GENERATION-LOG.md');
let log = fs.existsSync(logP) ? fs.readFileSync(logP, 'utf8') : '# Generation log\n';
const head = `## Stage 3 - ${lesson}`;
const bulletRe = new RegExp(`^- ${name} \\([^\\n]*(?:\\n  [^\\n]*)*`, 'm');
if (log.includes(head)) {
  const i = log.indexOf(head); const nx = log.slice(i + head.length).search(/^## /m); const end = nx < 0 ? log.length : i + head.length + nx;
  let sec = log.slice(i, end);
  sec = bulletRe.test(sec) ? sec.replace(bulletRe, bullet) : sec.replace(/\s*$/, '\n') + bullet + '\n\n';
  log = log.slice(0, i) + sec + log.slice(end);
} else log = log.replace(/\s*$/, '\n\n') + `${head}\nModel: ${model}\n${bullet}\n`;
design = /^Status:.*$/m.test(design) ? design.replace(/^Status:.*$/m, `Status: ${status}`) : design;
// The verify pass (or a one-pass run) ends here: leave a last Progress line so a resumed run knows the scene is closed.
// A 3-look pass passes --look and leaves "- look end: <status>" instead of "- end: <status>".
design = design.replace(/^(## Progress[^\n]*\n(?:- [^\n]*\n)*)/m, (m) => m + `- ${A.has('look') ? 'look end' : 'end'}: ${status}\n`);
if (A.has('dry-run')) { console.log(`would set Status: ${status} in ${designP}\nwould write under "${head}":\n${bullet}`); process.exit(0); }
if (A.has('no-log')) {
  fs.writeFileSync(designP, design); markNotes();
  console.log(`Status: ${status} (${designP}); GENERATION-LOG.md not touched.\nLOG TEXT:\n\n${head}\nModel: ${model}\n${bullet}`);
  process.exit(0);
}
fs.writeFileSync(logP, log); fs.writeFileSync(designP, design); markNotes();
console.log(`Status: ${status} (${designP})\nlogged under "${head}" in ${logP}:\n${bullet}`);
