#!/usr/bin/env node
// check-all - every machine check for a lesson or a bundle in one table (only FAIL/WARN detail is printed).
//
//   node tools/check-all.mjs [--bundle <id>] [--lesson L02] [--no-scenes] [--json]
// Runs: validate + lesson-check (per lesson), question-mix, glossary-lint (if glossary.json), renderer-lint (if bundle.json renderers), ident-lint and check-scene --no-browser
// (per scene of the lesson). Writes build/check-all/<bundle>.json for the dashboard. Exit 1 on any FAIL.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseArgs } from './sim-test/lib/args.mjs';
import { bundleFromArg, defaultBundle, KIT_ROOT, scenesInFolder } from './sim-test/lib/bundle.mjs';
import { lessonFiles, lessonCodeOf, lessonItems } from './operator/lib/units.mjs';

const A = parseArgs(process.argv.slice(2), { tool: 'check-all', file: import.meta.url, usage: 'node tools/check-all.mjs [--bundle <id>] [--lesson L02] [--no-scenes] [--json]', val: ['bundle', 'lesson'], bool: ['no-scenes', 'json'] });
function focus() { try { const id = fs.readFileSync(path.join(process.cwd(), '.focus'), 'utf8').trim(); return id ? bundleFromArg(id) : null; } catch { return null; } }
const B = A.val('bundle') ? bundleFromArg(A.val('bundle')) : (focus() || defaultBundle());
if (!B) { console.error('pass --bundle <id>'); process.exit(2); }
const T = (...p) => path.join(KIT_ROOT, 'tools', ...p);
const run = (script, args) => { if (!A.has('json')) process.stderr.write(`  running ${path.basename(script)} ${args.map((x) => path.basename(String(x))).join(' ')}\n`); const r = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', cwd: KIT_ROOT, maxBuffer: 64 << 20, timeout: 300000 }); return { code: r.status ?? 1, text: (r.stdout || '') + (r.stderr || '') }; };
const detail = (t) => t.split('\n').filter((l) => /FAIL|WARN/.test(l)).slice(0, 4).map((l) => l.trim().slice(0, 160));
const results = [];
const rec = (scope, check, r) => { const fails = (r.text.match(/^\s*FAIL\b/gm) || []).length || (r.code ? 1 : 0); const warns = (r.text.match(/^\s*WARN\b/gm) || []).length; results.push({ scope, check, fail: r.code ? Math.max(fails, 1) : fails, warn: warns, detail: detail(r.text) }); };

const want = A.val('lesson') ? A.val('lesson').toUpperCase() : null;
const lessons = lessonFiles(B).map(lessonCodeOf).filter((c) => !want || c === want).sort();
for (const L of lessons) {
  rec(L, 'lesson-check', run(T('staged-generation', 'lesson-check.mjs'), [B, L]));
  if (!A.has('no-scenes')) {
    for (const sc of (fs.existsSync(path.join(B, 'simulations', L)) ? scenesInFolder(path.join(B, 'simulations', L)) : [])) {
      const f = typeof sc === 'string' ? sc : sc.file || sc.path;
      if (!f || !/\.js$/.test(f)) continue;
      rec(`${L}/${path.basename(f, '.js')}`, 'check-scene', run(T('sim-test', 'check-scene.mjs'), [`${L}/${path.basename(f, '.js')}`, '--bundle', B, '--no-browser']));
    }
  }
}
// narration scripts (only lessons that have one; skipped silently otherwise)
for (const L of lessons) { const lf = lessonFiles(B).find((f) => lessonCodeOf(f) === L); let lid = null; try { const j = JSON.parse(fs.readFileSync(lf, 'utf8')); lid = j.lessonId ?? j.id; } catch { /* validator's job */ } if (lid && fs.existsSync(path.join(B, 'narration', `${lid}.script.json`))) { const r = run(T('narration-lint.mjs'), ['--bundle', B, L]); results.push({ scope: L, check: 'narration-lint', fail: r.code ? Math.max((r.text.match(/^ERROR\b/gm) || []).length, 1) : 0, warn: (r.text.match(/^WARN\b/gm) || []).length, detail: r.text.split('\n').filter((l) => /^(ERROR|WARN)/.test(l)).slice(0, 4).map((l) => l.slice(0, 160)) }); } }
rec('bundle', 'prose-lint', run(T('prose-lint.mjs'), ['--bundle', B, ...(want ? ['--lesson', want] : [])]));
// images without alt text (cheap accessibility gate)
{
  const noAlt = [];
  for (const L of lessons) { const lf = lessonFiles(B).find((f) => lessonCodeOf(f) === L); for (const it of lessonItems(B, lf)) { try { const j = JSON.parse(fs.readFileSync(it.file, 'utf8')); if (j.image?.src && !String(j.image.alt || '').trim()) noAlt.push(`${L} ${it.id}`); } catch { /* validator's job */ } } }
  results.push({ scope: want || 'bundle', check: 'image-alt', fail: 0, warn: noAlt.length, detail: noAlt.slice(0, 4).map((x) => `WARN ${x}: image without alt text`) });
}
// static plot drawn by hand (SVG, ticks, no controls, no beats, no motion): the graph field does this with no scene
{
  const still = /onControlChange|onBeatChange|pointer|drag|addEventListener|onclick|_tick\s*\(|animateFor|\bafter\(|setInterval|setTimeout|requestAnimationFrame|withBeats|withChallenge|busy\(|static CONTROLS\s*=\s*\[\s*\{/i;
  const hits = [];
  for (const L of lessons) for (const sc of (fs.existsSync(path.join(B, 'simulations', L)) ? scenesInFolder(path.join(B, 'simulations', L)) : [])) {
    const f = typeof sc === 'string' ? sc : sc.file || sc.path;
    let src = ''; try { src = fs.readFileSync(path.isAbsolute(f) ? f : path.join(B, 'simulations', L, f), 'utf8'); } catch { continue; }
    if (/<svg/.test(src) && /polyline|<path/.test(src) && /tick|\bplot\b/i.test(src) && !still.test(src)) hits.push(`${L}/${path.basename(f, '.js')}`);
  }
  results.push({ scope: want || 'bundle', check: 'static-plot', fail: 0, warn: hits.length, detail: hits.slice(0, 4).map((x) => `WARN ${x}: static hand-drawn plot; use the graph field instead (docs/graphing-and-plotting.md)`) });
}
if (!want) {
  rec('bundle', 'question-mix', run(T('staged-generation', 'question-mix.mjs'), [B]));
  try { if (Object.keys(JSON.parse(fs.readFileSync(path.join(B, 'bundle.json'), 'utf8')).renderers || {}).length) rec('bundle', 'renderer-lint', run(T('staged-generation', 'renderer-lint.mjs'), [B])); } catch { /* no bundle.json */ }
  rec('bundle', 'recipe-lint', run(T('staged-generation', 'recipe-lint.mjs'), [B]));
  if (fs.existsSync(path.join(B, 'glossary.json'))) rec('bundle', 'glossary-lint', run(T('glossary-lint.mjs'), [B]));
}
fs.mkdirSync(path.join(KIT_ROOT, 'build', 'check-all'), { recursive: true });
fs.writeFileSync(path.join(KIT_ROOT, 'build', 'check-all', `${path.basename(B)}.json`), JSON.stringify({ at: new Date().toISOString(), results }, null, 1));
if (A.has('json')) console.log(JSON.stringify(results, null, 1));
else {
  console.log(`scope`.padEnd(28) + 'check'.padEnd(14) + 'FAIL WARN');
  for (const r of results) console.log(r.scope.padEnd(28) + r.check.padEnd(14) + `${String(r.fail).padStart(4)} ${String(r.warn).padStart(4)}`);
  for (const r of results.filter((x) => x.fail || x.warn)) { console.log(`\n${r.scope} ${r.check}:`); r.detail.forEach((d) => console.log('  ' + d)); }
}
const f = results.reduce((a, r) => a + r.fail, 0);
console.log(`\n${f ? 'FAIL' : 'PASS'} - ${f} fail, ${results.reduce((a, r) => a + r.warn, 0)} warn`);
process.exit(f ? 1 : 0);
