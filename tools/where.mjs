#!/usr/bin/env node
// where - every file behind a slide, a lesson or a scene, in one bounded listing (for Revise runs).
//
//   node tools/where.mjs <L02S03 | L02 | L02/SceneName> [--bundle <id>] [--users <scene.js>] [--show]
//   --show   also print the slide JSON (slide scope only)
//   --users  list every scene that imports the given shared helper file (blast radius of editing it)
// L02S03 = the 3rd entry of lessons/les-02.json blocks[] (block or question). Output is capped at ~40 lines.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from './sim-test/lib/args.mjs';
import { bundleFromArg, defaultBundle, rel, KIT_ROOT } from './sim-test/lib/bundle.mjs';
import { lessonFiles, lessonCodeOf, lessonItems } from './operator/lib/units.mjs';

const A = parseArgs(process.argv.slice(2), { tool: 'where', file: import.meta.url, usage: 'node tools/where.mjs <L02S03 | L02 | L02/Scene> [--bundle <id>] [--users <helper.js>] [--show]', val: ['bundle', 'users'], bool: ['show'] });
function focus() { try { const id = fs.readFileSync(path.join(process.cwd(), '.focus'), 'utf8').trim(); return id ? bundleFromArg(id) : null; } catch { return null; } }
const B = A.val('bundle') ? bundleFromArg(A.val('bundle')) : (focus() || defaultBundle());
if (!B) { console.error('pass --bundle <id>'); process.exit(2); }
const R = (p) => rel(process.cwd(), p);
const out = [];
const add = (label, p) => { if (p && fs.existsSync(p)) out.push(`${label.padEnd(10)} ${R(p)}`); };
const rj = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return {}; } };

function sceneFiles(srcRef, from) {
  if (!srcRef) return;
  const abs = path.join(from, srcRef.replace(/^\.\//, ''));
  add('scene', abs); add('design', abs.replace(/\.js$/, '.design.md')); add('stub', abs.replace(/\.js$/, '.stub.md'));
}
function itemFiles(B, it) {
  const j = rj(it.file);
  add(j.type?.startsWith?.('mcq') || /^q-|\/questions\//.test(it.file) ? 'question' : 'block', it.file);
  for (const k of ['markdownRef', 'promptRef', 'explanationRef']) if (j[k]) add('prose', path.join(B, j[k]));
  sceneFiles(j.simulation?.src || (/^(poe-observe-sim|mini-game)@/.test(j.type || '') ? j.src : null), B);
  for (const f of it.files.slice(1)) add('explain', f);
  if (A.has('show')) out.push(JSON.stringify(j, null, 1).split('\n').slice(0, 60).join('\n'));
}

const scope = A.pos[0] || '';
let m;
if ((m = /^(L[\dA-Z-]+?)S(\d+)$/i.exec(scope))) {
  const lf = lessonFiles(B).find((f) => lessonCodeOf(f) === m[1].toUpperCase());
  const it = lf && lessonItems(B, lf)[Number(m[2]) - 1];
  if (!it) { console.error(`no entry ${scope} in this bundle`); process.exit(2); }
  add('lesson', lf); itemFiles(B, it);
} else if (/^L[\dA-Z-]+$/i.test(scope)) {
  const lf = lessonFiles(B).find((f) => lessonCodeOf(f) === scope.toUpperCase());
  if (!lf) { console.error(`no lesson ${scope}`); process.exit(2); }
  add('lesson', lf);
  lessonItems(B, lf).forEach((it, i) => {
    const j = rj(it.file); const src = j.simulation?.src || (/^(poe-observe-sim|mini-game)@/.test(j.type || '') ? j.src : null);
    out.push(`  S${String(i + 1).padStart(2, '0')} ${R(it.file)}${src ? `  -> ${src}` : ''}`);
  });
  add('outline', path.join(B, 'OUTLINE.md'));
} else if (/\//.test(scope)) {
  const base = path.join(B, 'simulations', scope);
  add('scene', base + '.js'); add('design', base + '.design.md'); add('stub', base + '.stub.md');
  const js = base + '.js';
  const imp = fs.existsSync(js) ? [...fs.readFileSync(js, 'utf8').matchAll(/from\s+['"](\.[^'"]*shared[^'"]*)['"]/g)].map((x) => path.resolve(path.dirname(js), x[1])) : [];
  imp.forEach((f) => add('helper', f));
} else if (!A.val('users')) { console.error('usage: node tools/where.mjs <L02S03 | L02 | L02/Scene> [--bundle <id>] [--users <helper.js>]'); process.exit(2); }

if (A.val('users')) {
  const helper = path.resolve(A.val('users')); const hb = path.basename(helper);
  const hits = [];
  (function walk(d) { for (const e of fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }) : []) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith('.js') && p !== helper && new RegExp(`from\\s+['"][^'"]*${hb.replace('.', '\\.')}['"]`).test(fs.readFileSync(p, 'utf8'))) hits.push(p); } })(path.join(B, 'simulations'));
  out.push(`${hits.length} scene(s) import ${hb}:`); hits.slice(0, 25).forEach((h) => out.push('  ' + R(h)));
  if (hits.length > 25) out.push(`  ... +${hits.length - 25}`);
}
void KIT_ROOT;
console.log(out.slice(0, 80).join('\n'));
