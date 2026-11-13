#!/usr/bin/env node
// blind-solve - check answer keys by solving every question without seeing the key (Stage R, `Check: answers`).
//
//   node tools/blind-solve.mjs show  --bundle <id> --lesson L02          stems and options only, the key is stripped
//   node tools/blind-solve.mjs grade --bundle <id> --lesson L02 --answers '{"q-l02-s05":"b","q-x":12.5}'   (or --answers @file.json)
// Solve from the stems yourself first (write your answers down BEFORE running grade). Types handled: mcq-single (answer = option id),
// numeric-value (answer = number). Other types are listed as skipped. grade files an open `fact` note per mismatch (source: model).
import fs from 'node:fs';
import { parseArgs } from './sim-test/lib/args.mjs';
import { bundleFromArg, defaultBundle } from './sim-test/lib/bundle.mjs';
import { lessonFiles, lessonCodeOf, lessonItems } from './operator/lib/units.mjs';
import { addNote } from './operator/lib/notes.mjs';

const A = parseArgs(process.argv.slice(2), { tool: 'blind-solve', file: import.meta.url, usage: 'node tools/blind-solve.mjs show|grade --bundle <id> --lesson L02 [--answers <json|@file>]', val: ['bundle', 'lesson', 'answers'], bool: [] });
const B = A.val('bundle') ? bundleFromArg(A.val('bundle')) : defaultBundle();
const L = (A.val('lesson') || '').toUpperCase(); const cmd = A.pos[0];
if (!B || !L || !['show', 'grade'].includes(cmd)) { console.error('usage: node tools/blind-solve.mjs show|grade --bundle <id> --lesson L02 [--answers ...]'); process.exit(2); }
const lf = lessonFiles(B).find((f) => lessonCodeOf(f) === L);
if (!lf) { console.error(`no lesson ${L}`); process.exit(2); }
const qs = [], skipped = [];
for (const it of lessonItems(B, lf)) {
  let j; try { j = JSON.parse(fs.readFileSync(it.file, 'utf8')); } catch { continue; }
  if (!/^(mcq|numeric|fill|assertion|match|semantic|comprehension)/.test(j.type || '') && !j.stem) continue;
  const t = String(j.type || '');
  if (/^mcq-single/.test(t)) qs.push({ n: it.index + 1, id: j.id || it.id, t, stem: j.stem?.en, options: (j.options || []).map((o) => [o.id, o.text?.en]), key: j.correctOptionId || (j.options || []).find((o) => o.isCorrect)?.id });
  else if (/^numeric-value/.test(t)) qs.push({ n: it.index + 1, id: j.id || it.id, t, stem: j.stem?.en, unit: j.unit, key: j.expectedValue, tol: j.tolerance || 0 });
  else if (j.stem) skipped.push(`${j.id || it.id} (${t})`);
}
if (cmd === 'show') {
  for (const q of qs) { console.log(`\n${q.id}  [${q.t}]\n${q.stem}`); if (q.options) q.options.forEach(([id, tx]) => console.log(`  ${id}) ${tx}`)); if (q.unit) console.log(`  answer in ${q.unit}`); }
  console.log(`\n${qs.length} question(s) to solve${skipped.length ? `; skipped: ${skipped.join(', ')}` : ''}`);
} else {
  let ans; const raw = A.val('answers') || '';
  try { ans = JSON.parse(raw.startsWith('@') ? fs.readFileSync(raw.slice(1), 'utf8') : raw); } catch { console.error('--answers must be JSON or @file.json'); process.exit(2); }
  let bad = 0, missing = 0;
  for (const q of qs) {
    if (!(q.id in ans)) { missing++; console.log(`MISSING ${q.id}`); continue; }
    const a = ans[q.id]; const ok = q.options ? String(a) === String(q.key) : Math.abs(Number(a) - Number(q.key)) <= q.tol + 1e-9;
    if (!ok) {
      bad++; console.log(`MISMATCH ${q.id}: you answered ${a}; the key says ${q.key}`);
      addNote(B, { scope: `${L}S${String(q.n).padStart(2, '0')}`, kind: 'fact', source: 'model', text: `Blind solve disagrees with the answer key of ${q.id}: solver answered ${a}, key says ${q.key}. Check the stem, the options and the key.` });
    }
  }
  console.log(`${bad || missing ? 'FAIL' : 'PASS'} - ${qs.length - bad - missing}/${qs.length} agree, ${bad} mismatch note(s) filed, ${missing} unanswered`);
  process.exit(bad || missing ? 1 : 0);
}
