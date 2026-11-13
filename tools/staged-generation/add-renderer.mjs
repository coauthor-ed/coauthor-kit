#!/usr/bin/env node
// add-renderer - copy a ready-made renderer from the kit library into a course and bind it.
//
//   node tools/staged-generation/add-renderer.mjs <bundle id | dir> <name@major> [--force]
//   node tools/staged-generation/add-renderer.mjs --list
// Copies renderers/<name>/v<major>/ to <bundle>/renderers/<name>/v<major>/ and sets bundle.json "renderers".
// Refuses a differing existing copy unless --force; identical copy = no-op. Doc: renderers/README.md.
import fs from 'node:fs';
import path from 'node:path';
import { bundleFromArg, KIT_ROOT } from '../sim-test/lib/bundle.mjs';
import { parseArgs } from '../sim-test/lib/args.mjs';

const USAGE = 'node tools/staged-generation/add-renderer.mjs <bundle id | dir> <name@major> [--force]  |  --list';
const A = parseArgs(process.argv.slice(2), { tool: 'add-renderer', file: import.meta.url, usage: USAGE, val: [], bool: ['list', 'force'] });
const LIB = path.join(KIT_ROOT, 'renderers');

const libEntries = () => {
  if (!fs.existsSync(LIB)) return [];
  const out = [];
  for (const n of fs.readdirSync(LIB, { withFileTypes: true })) {
    if (!n.isDirectory()) continue;
    for (const v of fs.readdirSync(path.join(LIB, n.name), { withFileTypes: true })) {
      const m = v.isDirectory() && /^v(\d+)$/.exec(v.name);
      if (m) out.push({ id: `${n.name}@${m[1]}`, dir: path.join(LIB, n.name, v.name), name: n.name, major: m[1] });
    }
  }
  return out;
};
const listFiles = (d, base = d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? listFiles(path.join(d, e.name), base) : [path.relative(base, path.join(d, e.name))]);

if (A.has('list')) {
  const es = libEntries();
  if (!es.length) { console.log('no renderers in the library'); process.exit(0); }
  for (const e of es) {
    const card = path.join(e.dir, 'card.md');
    let line = '';
    if (fs.existsSync(card)) line = (fs.readFileSync(card, 'utf8').split('\n').find((l, i) => i > 0 && l.trim() && !l.startsWith('#')) || '').trim();
    console.log(`${e.id}  ${line}`);
  }
  process.exit(0);
}

const [bundleArg, id] = A.pos;
if (!bundleArg || !id) { console.error(`usage: ${USAGE}`); process.exit(2); }
const entry = libEntries().find((e) => e.id === id);
if (!entry) { console.error(`add-renderer: "${id}" is not in the library (have: ${libEntries().map((e) => e.id).join(', ') || 'none'})`); process.exit(2); }
const B = bundleFromArg(bundleArg);
if (!B) { console.error(`usage: ${USAGE}`); process.exit(2); }

const target = path.join(B, 'renderers', entry.name, `v${entry.major}`);
const files = listFiles(entry.dir);
const differs = fs.existsSync(target) && (listFiles(target).sort().join('|') !== files.slice().sort().join('|')
  || files.some((f) => !fs.readFileSync(path.join(entry.dir, f)).equals(fs.readFileSync(path.join(target, f)))));
if (differs && !A.has('force')) { console.error(`add-renderer: ${path.relative(process.cwd(), target) || target} exists and differs from the library; use --force to overwrite`); process.exit(1); }
if (!fs.existsSync(target) || differs) {
  fs.rmSync(target, { recursive: true, force: true });
  for (const f of files) { fs.mkdirSync(path.dirname(path.join(target, f)), { recursive: true }); fs.copyFileSync(path.join(entry.dir, f), path.join(target, f)); }
  console.log(`copied ${id} -> ${target}`);
} else console.log(`${id}: course copy already identical`);

const bjPath = path.join(B, 'bundle.json');
const bj = fs.existsSync(bjPath) ? JSON.parse(fs.readFileSync(bjPath, 'utf8')) : {};
if (!bj.renderers || typeof bj.renderers !== 'object') bj.renderers = {};
const url = `renderers/${entry.name}/v${entry.major}/index.js`;
if (!bj.renderers[id] || bj.renderers[id].url !== url) {
  bj.renderers[id] = { ...(bj.renderers[id] || {}), url };
  fs.writeFileSync(bjPath, JSON.stringify(bj, null, 2) + '\n');
  console.log(`bound ${id} in bundle.json`);
} else console.log(`${id}: binding already present`);

console.log(`Next: node tools/staged-generation/renderer-lint.mjs ${path.basename(B)}; then regenerate the manifest (node tools/export-course.mjs, see its --help). Use it as figure.renderer: "${id}"; data format in ${path.join('renderers', entry.name, `v${entry.major}`, 'card.md')}.`);
