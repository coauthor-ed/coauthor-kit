#!/usr/bin/env node
// test-narration-lint - fixture checks for tools/narration-lint.mjs on a tiny synthetic bundle in a temp dir.
//   node tools/staged-generation/test-narration-lint.mjs        PASS/FAIL per check; exit 1 on any FAIL
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let fails = 0;
const t = (name, ok, extra = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n      ${String(extra).slice(0, 600)}`}`); };
const lint = (b, args = []) => { const r = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'narration-lint.mjs'), '--bundle', b, ...args], { encoding: 'utf8', cwd: ROOT }); return { code: r.status, text: (r.stdout || '') + (r.stderr || '') }; };

function bundle(segments, { scene = true } = {}) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'nlint-'));
  for (const sub of ['blocks', 'lessons', 'narration', 'simulations/L01']) fs.mkdirSync(path.join(d, sub), { recursive: true });
  const w = (f, v) => fs.writeFileSync(path.join(d, f), typeof v === 'string' ? v : JSON.stringify(v));
  w('blocks/b1.md', '# Dose and response\n\nFirst point.\n\n<!-- STEP -->\n\nSecond point.\n');
  w('blocks/b1.json', { id: 'b1', type: 'content-block@1', markdownRef: 'blocks/b1.md', simulation: scene ? { src: 'simulations/L01/S.js' } : undefined });
  w('simulations/L01/S.js', "export class S { static CUES = ['go']; mark() { return '<g data-narr=\"bars\"></g>'; } }\n");
  w('lessons/les-01.json', { id: 'les-01', lessonId: 'les-01', type: 'lesson', blocks: [{ blockRef: 'blocks/b1.json' }] });
  w('narration/les-01.script.json', { format: 'coauthor-narration-script@1', segments });
  return d;
}
const seg = (step, say, extra = {}) => ({ block: 'b1', step, say, ...extra });

{ const d = bundle([seg('b1', 'The risk rises with the dose, and that is the first point. [[go]] Then it levels off.'), seg('b2', '[[focus.bars]] Here the second point is made.', { })]);
  const r = lint(d, ['L01']); t('clean bundle passes', r.code === 0 && /PASS \(2 beats/.test(r.text), r.text); }
{ const d = bundle([seg('b1', 'The risk rises with the dose.')]);
  const r = lint(d, ['L01']); t('NO-SAY: beat with no segment', r.code === 1 && /ERROR b1#b2 NO-SAY/.test(r.text), r.text); }
{ const d = bundle([seg('b1', 'The risk rises.'), seg('b2', '')]);
  t('empty say is a silent beat', lint(d, ['L01']).code === 0); }
{ const d = bundle([seg('b1', 'Look at the bars and see the rise.'), seg('b2', 'Done.')]);
  const r = lint(d, ['L01']); t('DEICTIC without cue', r.code === 1 && /ERROR b1#b1 DEICTIC/.test(r.text), r.text); }
{ const d = bundle([seg('b1', 'Look at the bars and see the rise.', { noScreenRef: 'figurative' }), seg('b2', 'Done.')]);
  t('DEICTIC opt-out passes', lint(d, ['L01']).code === 0); }
{ const d = bundle([seg('b1', 'The rise is steady. [[nope]] Then it ends.'), seg('b2', '[[focus.ghost]] Done here.')]);
  const r = lint(d, ['L01']); t('CUE-UNKNOWN plain and focus ids', r.code === 1 && /b1#b1 CUE-UNKNOWN \[\[nope\]\]/.test(r.text) && /b1#b2 CUE-UNKNOWN \[\[focus\.ghost\]\]/.test(r.text), r.text); }
{ const d = bundle([seg('b1', 'Now it is your turn. Flip it.', { await: 'interact' }), seg('b2', 'Done.', { await: 'interact', hint: 'Do it.', free: true, closed: true })]);
  const r = lint(d, ['L01']); t('AWAIT: no hint, free with closed', r.code === 1 && /b1#b1 AWAIT/.test(r.text) && /b1#b2 AWAIT "free"/.test(r.text), r.text); }
{ const d = bundle([seg('b1', 'The rise is steady.'), seg('b2', 'Then it ends.', { await: 'interact', hint: 'Move it.', closed: true })]);
  const r = lint(d, ['L01']); t('AWAIT: closed on a scene that never sends interactDone', r.code === 1 && /b1#b2 AWAIT "closed"/.test(r.text), r.text); }
{ const d = bundle([seg('b1', 'The rise is 5% and 12 cases.'), seg('b2', 'Then it ends.')]);
  const r = lint(d, ['L01']); t('SYMBOLS and DIGITS warn, still pass', r.code === 0 && /WARN b1#b1 SYMBOLS/.test(r.text) && /WARN b1#b1 DIGITS/.test(r.text), r.text); }
{ const d = bundle([seg('b1', 'A bit.'), seg('b2', 'More.')]); fs.unlinkSync(path.join(d, 'narration/les-01.script.json'));
  t('NO-SCRIPT when the lesson is named', /ERROR les-01 NO-SCRIPT/.test(lint(d, ['L01']).text));
  t('--all skips a lesson with no script', lint(d, ['--all']).code === 0); }
t('mistyped flag refused', lint('/nonexistent', ['--stpes']).code === 2);
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
