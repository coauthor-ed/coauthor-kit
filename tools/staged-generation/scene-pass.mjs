#!/usr/bin/env node
// scene-pass - the hand-over between the 3 passes of a Stage 3 scene, kept in the design note:
// the "Status:" line and the "## Progress" lines. next.mjs reads them to dispatch the next pass.
//
//   node tools/staged-generation/scene-pass.mjs --bundle <id|dir> --target L0N/<Scene> <command> [text] [--check PASS|FAIL]
//
//   progress "<text>"          append "- <text>" under ## Progress (read done, design written, code drafted ...)
//   start build               a RESUMED build only: Status build-pending -> building (so --status counts it in flight); adds "- build resumed".
//   start sanity | verify      Status sanity-pending -> sanity, or verify-pending -> verifying; adds "- sanity started".
//                              Refused when Status is done (a closed scene) unless --force.
//                              Every start re-stamps an existing Started: line (this pass's clock), deletes the scene's
//                              run counters in build/scratch (.check-runs, .drive-runs, .layout-runs: a fresh budget per pass),
//                              and start verify prints whether build/scratch/<Scene>-tests.json exists (and its step count).
//   end build  --check PASS|FAIL ["<first failing line>"] [--notes n4,n7]
//                              WARN when the tests file has more than 5 steps per row besides its opener (rows = {"beat":N} steps).
//                              adds "- build end: check-quick PASS|FAIL: <text>"; Status -> verify-pending (PASS)
//                              or sanity-pending (FAIL). Refused when the note has no "## Tests to run" heading (unless --force).
//                              On a FAIL, write the whole diagnosis first: progress "diagnosis: <every edit sanity must make>"
//   end sanity --check PASS|FAIL ["<text>"]
//                              adds "- sanity end: check-quick PASS|FAIL: <text>"; Status -> verify-pending either way
//                              (pass 3 runs the full check and decides)
//   look "<text>"              append "- <text>" under ## Look log (a unique, verified append: no Edit anchor needed)
//   expect build|sanity|verify   no change; prints PASS (exit 0) when that pass handed over (Status moved on), else FAIL (exit 1)
//   A note with a "Review: manual" line: end build PASS and end sanity set Status review-pending (no verify or look pass; the
//   operator runs the tests file in the preview), then close with log-stage3.mjs --status review-pending.
//   --notes n4,n7 (any command): mark those operator directions done in review-notes.json (they were honored).
//   (the verify pass ends with log-stage3.mjs, which sets done or look-pending and adds "- end: <status>"; a 3-look pass adds "- look end: <status>")
//
// The line wording is read back by next.mjs (resumeStatus), so use the commands, never hand-edit Status or Progress.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from '../sim-test/lib/args.mjs';
import { scratchFor, KIT_ROOT, bundleFromArg, resolveTarget, describeMiss } from '../sim-test/lib/bundle.mjs';
import { setState } from '../operator/lib/notes.mjs';

const USAGE = 'node tools/staged-generation/scene-pass.mjs --bundle B --target L0N/Scene progress "<text>" | look "<text>" | start build|sanity|verify [--force] | end build|sanity --check PASS|FAIL ["<text>"] [--force] | expect build|sanity|verify  [--notes n4,n7]';
const A = parseArgs(process.argv.slice(2), { tool: 'scene-pass', file: import.meta.url, usage: USAGE, val: ['bundle', 'target', 'check', 'notes'], bool: ['force'] });
const bundleDir = bundleFromArg(A.val('bundle'));
const t = resolveTarget(A.val('target') || '', bundleDir);
if (!t || t.kind !== 'scene') { console.error(describeMiss(A.val('target') || '', bundleDir)); process.exit(2); }
const js = t.file.replace(/\.(stub|design)\.md$/, '.js');
const designP = js.replace(/\.js$/, '.design.md');
if (!fs.existsSync(designP)) { console.error(`no design note at ${designP}: write it first (pass 1 step 1)`); process.exit(2); }
let note = fs.readFileSync(designP, 'utf8');

const [cmd, arg1, ...rest] = A.pos;
const fail = (m) => { console.error(`${m}\n${USAGE}`); process.exit(2); };
const getStatus = () => ((/^Status:[ \t]*([\w-]+)/mi.exec(note) || [])[1] || '').toLowerCase();
const setStatus = (s) => { note = /^Status:.*$/m.test(note) ? note.replace(/^Status:.*$/m, `Status: ${s}`) : `Status: ${s}\n${note}`; };

// Append one line to the "## Progress" block, creating the block before "## Decisions" (or at the end) if absent.
function addProgress(line) {
  const re = /^## Progress[^\n]*\n/m;
  if (!re.test(note)) {
    const block = '## Progress           <- one line per step, added by scene-pass.mjs\n';
    const i = note.search(/^## (Decisions|Beats|Look log)/m);
    note = i < 0 ? note.replace(/\s*$/, '\n\n') + block : note.slice(0, i) + block + '\n' + note.slice(i);
  }
  const m = re.exec(note);
  const at = m.index + m[0].length;
  const after = note.slice(at);
  const next = after.search(/^## /m);
  const bodyEnd = next < 0 ? note.length : at + next;
  let body = note.slice(at, bodyEnd).replace(/\s*$/, '');
  body += (body ? '\n' : '') + `- ${line}`;
  note = note.slice(0, at) + body + '\n' + (next < 0 ? '' : '\n') + note.slice(bodyEnd);
}

// Append one line under "## Look log" (created before "## Checks explained" / "## Requests" when absent).
function addLook(line) {
  const re = /^## Look log[^\n]*\n/m;
  if (!re.test(note)) {
    const block = '## Look log\n';
    const i = note.search(/^## (Checks explained|Requests)/m);
    note = i < 0 ? note.replace(/\s*$/, '\n\n') + block : note.slice(0, i) + block + '\n' + note.slice(i);
  }
  const m = re.exec(note);
  const at = m.index + m[0].length;
  const next = note.slice(at).search(/^## /m);
  const bodyEnd = next < 0 ? note.length : at + next;
  let body = note.slice(at, bodyEnd).replace(/\s*$/, '');
  body += (body ? '\n' : '') + `- ${line}`;
  note = note.slice(0, at) + body + '\n' + (next < 0 ? '' : '\n') + note.slice(bodyEnd);
}

let tail = '';
const sceneBase = path.basename(designP, '.design.md');
const scratch = scratchFor(designP);
const testsP = path.join(scratch, `${sceneBase}-tests.json`);
// The tests file: { steps, rows } (rows = steps that open with a beat), or null when absent or not a JSON array.
const testsInfo = () => {
  try { const a = JSON.parse(fs.readFileSync(testsP, 'utf8')); return Array.isArray(a) ? { steps: a.length, rows: a.filter((x) => x && x.beat != null).length } : null; } catch { return null; }
};
const text = rest.join(' ').trim();
const check = (A.val('check') || '').toUpperCase();

if (cmd === 'progress') {
  const txt = [arg1, ...rest].filter(Boolean).join(' ').trim();
  if (!txt) fail('progress needs a text');
  addProgress(txt);
} else if (cmd === 'look') {
  const txt = [arg1, ...rest].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  if (!txt) fail('look needs a text');
  addLook(txt);
} else if (cmd === 'start') {
  const want = { build: ['build-pending', 'building'], sanity: ['sanity-pending', 'sanity'], verify: ['verify-pending', 'verifying'] }[arg1];
  if (!want) fail('start takes build, sanity or verify');
  if (getStatus() === 'done' && !A.has('force')) {
    console.error(`REFUSED: the note says Status: done, so this scene is closed (wrong target? "${path.basename(designP, '.design.md')}" may be a different scene from the one you meant). Nothing changed. Stop the whole run and report this line: do not try other targets or stamp the note by hand. To reopen it on purpose add --force.`);
    process.exit(2);
  }
  if (getStatus() !== want[0]) console.error(`note: Status was "${getStatus()}", expected "${want[0]}"; continuing`);
  setStatus(want[1]);
  addProgress(arg1 === 'build' ? 'build resumed' : `${arg1} started`);
  // date -u +%FT%TZ: this pass's clock, so tools never call a dead run's stamp "this run's" time.
  note = note.replace(/^Started:.*$/m, `Started: ${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}`);
  for (const ext of ['check-runs', 'drive-runs', 'layout-runs']) fs.rmSync(path.join(scratch, `${sceneBase}.${ext}`), { force: true });
  if (arg1 === 'verify') {
    const ti = testsInfo();
    tail = `tests file: ${path.relative(KIT_ROOT, testsP)} (repo root, never under courses/) ${fs.existsSync(testsP) ? (ti ? `(exists, ${ti.steps} steps)` : '(exists, not a JSON array: fix it)') : '(absent: write a minimal one, see the cookbook)'}`;
  }
} else if (cmd === 'end') {
  if (!['build', 'sanity'].includes(arg1)) fail('end takes build or sanity (the verify pass ends with log-stage3.mjs)');
  if (!['PASS', 'FAIL'].includes(check)) fail('--check PASS|FAIL is required');
  if (arg1 === 'build' && !/^## Tests to run/m.test(note) && !A.has('force')) {
    console.error('REFUSED: the note has no "## Tests to run" heading. Add it (a heading and a table: | item | step | expect |, one row per stub Must get right item) and run this again. Nothing changed.');
    process.exit(2);
  }
  const ti = arg1 === 'build' ? testsInfo() : null;
  // A game (mini-game@1) has no beats: its stub says `Beats: none`, so a row-less tests file is right for it.
  const beatless = (() => { try { return /^Beats:[ \t]*none\b/mi.test(fs.readFileSync(js.replace(/\.js$/, '.stub.md'), 'utf8')); } catch { return false; } })();
  if (ti && !beatless && ti.steps - ti.rows > 5 * Math.max(1, ti.rows)) tail = ti.rows === 0 ? `WARN tests file: ${ti.steps} steps but no {"beat":N} step, so no rows. It must be ONE flat array (not nested, not {"rows":..}); a row starts at each {"beat":N}. See briefs/reference/probe-cookbook.md. ` : `WARN tests file: ${ti.steps} steps for ${ti.rows} row(s) (more than 5 per row besides its beat opener): cut it to the defaults, each dial's extremes and the slide's case. `;
  const detail = text ? `${check}: ${text.replace(/\s+/g, ' ').slice(0, 200)}` : check;
  addProgress(`${arg1} end: check-quick ${check === 'FAIL' ? detail : 'PASS'}`);
  const manual = /^Review:[ \t]*manual\b/mi.test(note);
  const next = arg1 === 'build' && check === 'FAIL' ? 'sanity-pending' : manual ? 'review-pending' : 'verify-pending';
  setStatus(next);
  if (next === 'review-pending') tail += `Review: manual: no verify or look pass. Close now: node tools/staged-generation/log-stage3.mjs --bundle ${path.basename(t.bundle || bundleDir)} --target ${A.val('target')} --model "<name>" --what "<one line>" --status review-pending. `;
  if (arg1 === 'build' && check === 'FAIL' && !/^- diagnosis/m.test((note.split(/^## Progress[^\n]*\n/m)[1] || '').split(/^## /m)[0])) {
    tail += 'NOTE: no "diagnosis:" line in ## Progress. Sanity is a fresh agent and cannot ask you. Before you stop run: scene-pass.mjs ... progress "diagnosis: <EVERY edit sanity must make, including any BEAT_STEP_MAP or stage-hook half>".';
  }
} else if (cmd === 'expect') {
  const ok = { build: ['sanity-pending', 'verify-pending', 'review-pending'], sanity: ['verify-pending', 'review-pending'], verify: ['done', 'look-pending'] }[arg1];
  if (!ok) fail('expect takes build, sanity or verify');
  const st = getStatus();
  console.log(ok.includes(st) ? `PASS ${arg1} pass handed over (Status: ${st})` : `FAIL ${arg1} pass did not hand over (Status: ${st}, wanted ${ok.join(' or ')})`);
  process.exit(ok.includes(st) ? 0 : 1);
} else fail(cmd ? `unknown command "${cmd}"` : 'no command given');

fs.writeFileSync(designP, note);
if (A.val('notes')) { const ids = A.val('notes').split(/[,\s]+/).filter(Boolean); if (ids.length && fs.existsSync(path.join(t.bundle || bundleDir, 'review-notes.json'))) console.log(`notes done: ${setState(t.bundle || bundleDir, ids, 'done')}`); }
const last = (note.split(/^## Progress[^\n]*\n/m)[1] || '').split(/^## /m)[0].trim().split('\n').pop();
if (cmd === 'look') {
  const lastLook = (note.split(/^## Look log[^\n]*\n/m)[1] || '').split(/^## /m)[0].trim().split('\n').pop();
  console.log(`Status: ${getStatus()}  |  Look log: ${lastLook.slice(0, 120)}  (${path.basename(designP)})`);
} else console.log(`Status: ${getStatus()}  |  Progress: ${last}  (${path.basename(designP)})`);
if (tail) console.log(tail);
