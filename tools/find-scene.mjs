#!/usr/bin/env node
// find-scene - reuse finder over an index you cannot browse: search verified scenes of other bundles and copy one in.
//
//   node tools/find-scene.mjs "diffusion particles" [--max 5]
//   node tools/find-scene.mjs --use <id> --to L03 [--bundle <id>]
// Meant for generic mechanisms (not story- or cast-bound scenes). Output: at most 5 hits, one block each.
// --use copies the scene into the bundle's simulations/<lesson>/ with a header `// adapted from <ref>`; refuses to overwrite;
// copies a shared helper only if absent (a differing helper of the same name is reported, never replaced). The normal Stage 3
// checks still run on the copy.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from './sim-test/lib/args.mjs';
import { bundleFromArg, defaultBundle, LESSON_ID_RE } from './sim-test/lib/bundle.mjs';
import { loadIndex, cacheDir } from './operator/lib/scenes.mjs';

const A = parseArgs(process.argv.slice(2), { tool: 'find-scene', file: import.meta.url, usage: 'node tools/find-scene.mjs "<what it shows>" [--max 5] | --use <id> --to L03 [--bundle <id>]', val: ['max', 'use', 'to', 'bundle'], bool: [] });
const root = process.cwd();
const idx = loadIndex(root);
function focus() { try { const id = fs.readFileSync(path.join(root, '.focus'), 'utf8').trim(); return id ? bundleFromArg(id) : null; } catch { return null; } }
const B = A.val('bundle') ? bundleFromArg(A.val('bundle')) : (focus() || defaultBundle());

if (A.val('use')) {
  const e = idx.entries.find((x) => x.id === A.val('use') || x.id.startsWith(A.val('use')));
  const L = (A.val('to') || '').toUpperCase();
  if (!e || !B || !LESSON_ID_RE.test(L)) { console.error(e ? 'needs --to L03 and a bundle' : `no scene ${A.val('use')} in the index`); process.exit(2); }
  const dir = path.join(B, 'simulations', L); fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, `${e.scene}.js`);
  if (fs.existsSync(dest)) { console.error(`refusing to overwrite ${path.relative(root, dest)}`); process.exit(2); }
  const store = path.join(cacheDir(root), 'store');
  fs.writeFileSync(dest, `// adapted from ${e.id}\n` + fs.readFileSync(path.join(store, `${e.id.split('@')[1]}.js`), 'utf8'));
  console.log(`copied ${path.relative(root, dest)}`);
  for (const h of e.helpers) {
    const hd = path.resolve(dir, h.rel); const snap = fs.readFileSync(path.join(store, `${h.hash}.js`));
    if (!fs.existsSync(hd)) { fs.mkdirSync(path.dirname(hd), { recursive: true }); fs.writeFileSync(hd, snap); console.log(`copied helper ${path.relative(root, hd)}`); }
    else if (!fs.readFileSync(hd).equals(snap)) console.log(`NOTE helper ${h.name} exists here and differs from the original: kept yours; check the scene works with it`);
  }
  spawnSync(process.execPath, [fileURLToPath(new URL('./log.mjs', import.meta.url)), 'rev', '--bundle', B, '--scope', `${L}/${e.scene}`, '--who', 'find-scene', '--what', `reused ${e.id}`], { stdio: 'ignore' });
  console.log('Next: write the stub/design note for this scene as usual; run ident-lint and check-scene on the copy.');
  process.exit(0);
}
const q = A.pos.join(' ').toLowerCase().split(/\W+/).filter((t) => t.length > 1);
if (!q.length) { console.error('give search words, or --use <id> --to L03'); process.exit(2); }
const max = Math.min(5, Number(A.val('max')) || 5);
if (q.some((t) => /^(graph|plot|axis|axes|curve|area|diagram|figure|chart)s?$/.test(t))) console.log('NOTE nothing operated and nothing moves (a plot, shaded area, labelled figure): no scene; use the graph or diagram field on the slide or question (docs/graphing-and-plotting.md, docs/geometry-diagrams.md).\n');
const mine = B ? path.basename(B) : null;
const hits = idx.entries.filter((e) => e.bundle !== mine).map((e) => {
  const fields = [[e.title, 3], [e.tags.join(' '), 2], [e.mechanism, 1.5], [e.controls, 1], [e.scene, 2]];
  let s = 0; for (const t of q) for (const [text, w] of fields) if (String(text).toLowerCase().includes(t)) s += w;
  if (s && e.approved) s += 1;
  return { e, s };
}).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, max);
if (!hits.length) { console.log(`no reusable scene matches "${q.join(' ')}" (${idx.entries.length} indexed). Build a new one.`); process.exit(0); }
for (const { e } of hits) {
  console.log(`${e.id}${e.approved ? '  [approved lesson]' : ''}\n  ${e.title} - ${e.base}${e.subject ? `, ${e.subject}${e.grade ? ' ' + e.grade : ''}` : ''}, ${Math.round(e.size / 1024)} KB${e.helpers.length ? `, helpers: ${e.helpers.map((h) => h.name).join(', ')}` : ''}\n  ${e.mechanism.slice(0, 160)}${e.controls ? `\n  controls: ${e.controls}` : ''}`);
}
console.log('\nReuse: node tools/find-scene.mjs --use <id> --to L0N');
