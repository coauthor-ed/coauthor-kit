#!/usr/bin/env node
// renderer-lint - course-local figure renderers (figure-host@0, EXPERIMENTAL): bindings, folder files, static rules, validate().
//
//   node tools/staged-generation/renderer-lint.mjs <bundle id | dir>
//   node tools/staged-generation/renderer-lint.mjs --dir <path to a bundle folder>
// Doc: docs/renderers.md. Reads bundle.json "renderers" and every blocks/**/*.json whose figure.renderer is set.
// ERROR a used renderer with no binding; a binding whose folder or index.js is missing; a missing/invalid
//       schema.json, card.md, example.json; an import outside `lit` and ./ files in the folder; a missing export
//       (api === 'figure-host@0', mount, validate, describe); customElements, network, storage, eval, Function,
//       document.write, window.parent/top, document.querySelector*/getElementById; a hex/rgb/hsl literal; a var(--x)
//       that is not --fig-*; a string returned by validate() on example.json or on a slide's figure.data.
// ERROR a bound name@major that is in the kit library (renderers/) but whose course copy differs from it.
// WARN  an absolute url in a binding (resolved, but not checked).
// WARN  event listeners (addEventListener, lit @click/@pointer/@key...) without `export const inspect = true`;
//       inspect = true without any keyboard path (key listener or tabindex).
//       describe(example.data, 1) that throws, or returns a non-string or a string containing '<'.
// NOTE  validate() not run because index.js did not import in Node (it touched a DOM global at import time).
// `lit` and `lit/...` resolve to a no-op stub for the run (html, svg, css, render, nothing, LitElement, unsafeCSS).
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { register } from 'node:module';
import { bundleFromArg, KIT_ROOT } from '../sim-test/lib/bundle.mjs';
import { parseArgs } from '../sim-test/lib/args.mjs';
import { parseModule, walk } from '../sim-test/lib/ast.mjs';

const A = parseArgs(process.argv.slice(2), { tool: 'renderer-lint', file: import.meta.url, usage: 'node tools/staged-generation/renderer-lint.mjs <bundle id | dir>  |  --dir <path to a bundle folder>', val: ['dir'], bool: [] });
let B = null;
if (A.val('dir')) {
  B = path.resolve(A.val('dir'));
  if (!fs.existsSync(path.join(B, 'bundle.json'))) { console.error(`renderer-lint: no bundle.json in ${B}`); process.exit(2); }
} else if (A.pos[0]) B = bundleFromArg(A.pos[0]);
if (!B) { console.error('usage: node tools/staged-generation/renderer-lint.mjs <bundle id | dir>  |  --dir <path to a bundle folder>'); process.exit(2); }

// Resolve the bare `lit` specifier to a no-op stub so real renderers import in Node (no npm deps).
const LIT_STUB = 'data:text/javascript,' + encodeURIComponent(
  'const t = (s, ...v) => ({ strings: s, values: v });' +
  'export const html = t, svg = t, css = t, nothing = null, render = () => {}, unsafeCSS = (s) => s;' +
  'export class LitElement {}; export default {};');
register('data:text/javascript,' + encodeURIComponent(
  `const STUB = ${JSON.stringify(LIT_STUB)};` +
  'export async function resolve(spec, ctx, next) {' +
  " if (spec === 'lit' || spec.startsWith('lit/')) return { url: STUB, shortCircuit: true };" +
  ' return next(spec, ctx); }'));

let errors = 0, warns = 0, notes = 0;
const rel = (f) => path.relative(B, f) || '.';
const E = (m) => { errors++; console.log(`  ERROR ${m}`); };
const W = (m) => { warns++; console.log(`  WARN  ${m}`); };
const N = (m) => { notes++; console.log(`  NOTE  ${m}`); };
const readJson = (f) => { try { return { json: JSON.parse(fs.readFileSync(f, 'utf8')) }; } catch (e) { return { error: e.message }; } };
const listFiles = (d, ext) => !fs.existsSync(d) ? [] : fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? listFiles(path.join(d, e.name), ext) : (e.name.endsWith(ext) ? [path.join(d, e.name)] : []));

const bj = readJson(path.join(B, 'bundle.json')).json || {};
const bindings = bj.renderers && typeof bj.renderers === 'object' ? bj.renderers : {};

// blocks that use a renderer
const uses = new Map(); // name -> [{ file, data }]
for (const f of listFiles(path.join(B, 'blocks'), '.json')) {
  const j = readJson(f).json;
  const fig = j && j.figure;
  if (fig && typeof fig === 'object' && fig.renderer) {
    if (!uses.has(fig.renderer)) uses.set(fig.renderer, []);
    uses.get(fig.renderer).push({ file: f, data: fig.data });
  }
}

const BANNED = new Set(['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'sendBeacon', 'indexedDB', 'localStorage', 'sessionStorage', 'caches', 'eval', 'Function', 'customElements', 'getElementById']);
const COLOR_RE = /(?<![\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])|\b(?:rgba?|hsla?)\s*\(/;
const VAR_RE = /var\(\s*(--[\w-]+)/g;

function lintSource(file, folder, isIndex, acc = {}) {
  const R = rel(file);
  let src, ast;
  try { src = fs.readFileSync(file, 'utf8'); ast = parseModule(src); } catch (e) { E(`${R}: cannot parse: ${e.message}`); return; }
  const at = (n) => `${R}:${n.loc.start.line}`;
  const checkImport = (n, spec) => {
    if (spec === 'lit') return;
    if (spec.startsWith('./') || spec.startsWith('../')) {
      const t = path.resolve(path.dirname(file), spec);
      if (t === folder || t.startsWith(folder + path.sep)) return;
    }
    E(`${at(n)}: import "${spec}" (only lit and ./ files inside the renderer folder)`);
  };
  const exported = new Map();
  const strCheck = (n, s) => {
    if (COLOR_RE.test(s)) E(`${at(n)}: colour literal in string (use var(--fig-*))`);
    for (const m of s.matchAll(VAR_RE)) if (!m[1].startsWith('--fig-')) E(`${at(n)}: ${m[1]} is not a --fig-* token`);
  };
  walk(ast, (n, parent) => {
    if ((n.type === 'ImportDeclaration' || n.type === 'ExportAllDeclaration' || (n.type === 'ExportNamedDeclaration' && n.source)) && n.source) checkImport(n, String(n.source.value));
    if (n.type === 'ImportExpression') {
      if (n.source.type === 'Literal') checkImport(n, String(n.source.value)); else E(`${at(n)}: dynamic import with a computed specifier`);
    }
    if (n.type === 'ExportNamedDeclaration' && !n.source) {
      const d = n.declaration;
      if (d && d.type === 'VariableDeclaration') for (const v of d.declarations) exported.set(v.id.name, v.init);
      else if (d && d.id) exported.set(d.id.name, d);
      for (const s of n.specifiers || []) exported.set(s.exported.name, null);
    }
    if (n.type === 'Identifier' && BANNED.has(n.name)) {
      const isKey = parent && parent.type === 'Property' && parent.key === n && !parent.computed && !parent.shorthand;
      const isDecl = parent && ((parent.type === 'FunctionDeclaration' && parent.id === n) || (parent.type === 'VariableDeclarator' && parent.id === n));
      if (!isKey && !isDecl) E(`${at(n)}: "${n.name}" is not allowed in a renderer`);
    }
    if (n.type === 'MemberExpression' && !n.computed && n.object.type === 'Identifier') {
      const o = n.object.name, p = n.property.name;
      if (o === 'document' && (p === 'write' || p === 'writeln' || /^querySelector/.test(p))) E(`${at(n)}: document.${p} reaches outside root`);
      if (o === 'window' && (p === 'parent' || p === 'top')) E(`${at(n)}: window.${p} is not allowed`);
    }
    if (n.type === 'Literal' && typeof n.value === 'string') strCheck(n, n.value);
    if (n.type === 'TemplateElement') strCheck(n, n.value.cooked || n.value.raw);
    if (n.type === 'CallExpression' && n.callee.type === 'MemberExpression' && !n.callee.computed && n.callee.property.name === 'addEventListener') {
      acc.listens = acc.listens || at(n);
      const a0 = n.arguments[0];
      if (a0 && a0.type === 'Literal' && /^key/.test(String(a0.value))) acc.keyboard = true;
    }
    if (n.type === 'TemplateElement') {
      const t = n.value.cooked || n.value.raw || '';
      if (/@(click|dblclick|pointer\w*|mouse\w*|touch\w*|key(down|up|press)|focus\w*)\s*=/.test(t)) acc.listens = acc.listens || at(n);
      if (/@key(down|up|press)\s*=|tabindex/i.test(t)) acc.keyboard = true;
    }
    if ((n.type === 'Literal' && /^tabindex$/i.test(String(n.value))) || (n.type === 'Identifier' && n.name === 'tabIndex')) acc.keyboard = true;
  });
  if (isIndex) {
    const api = exported.get('api');
    if (!api || api.type !== 'Literal' || api.value !== 'figure-host@0') E(`${R}: must export const api = 'figure-host@0'`);
    for (const k of ['mount', 'validate', 'describe']) if (!exported.has(k)) E(`${R}: missing export "${k}"`);
    const ins = exported.get('inspect');
    acc.inspect = !!(ins && ins.type === 'Literal' && ins.value === true);
  }
}

// Kit library (renderers/<name>/v<major>/); absent in a repo without it: skipped silently.
const libraryDir = (id) => {
  const m = /^([\w-]+)@(\d+)$/.exec(id);
  const d = m && path.join(KIT_ROOT, 'renderers', m[1], `v${m[2]}`);
  return d && fs.existsSync(d) && fs.statSync(d).isDirectory() ? d : null;
};
const libFiles = (d, base = d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? libFiles(path.join(d, e.name), base) : [path.relative(base, path.join(d, e.name))]);
const jsFilesIn = (d) => listFiles(d, '.js');

async function lintRenderer(name, binding) {
  console.log(`${name}`);
  const url = binding && typeof binding.url === 'string' ? binding.url : '';
  if (!url) { E(`${name}: binding has no url`); return; }
  if (/^([a-z][a-z0-9+.-]*:|\/)/i.test(url)) { W(`${name}: absolute url ${url} (resolved at run time, not checked here)`); return; }
  const index = path.resolve(B, url);
  const folder = path.dirname(index);
  if (!fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) { E(`${name}: folder ${rel(folder)} does not exist`); return; }
  if (!fs.existsSync(index)) E(`${name}: ${rel(index)} missing`);
  for (const f of ['schema.json', 'example.json']) {
    const p = path.join(folder, f);
    if (!fs.existsSync(p)) E(`${name}: ${rel(p)} missing`);
    else { const r = readJson(p); if (r.error) E(`${rel(p)}: invalid JSON: ${r.error}`); }
  }
  if (!fs.existsSync(path.join(folder, 'card.md'))) E(`${name}: ${rel(path.join(folder, 'card.md'))} missing`);
  const ex = readJson(path.join(folder, 'example.json')).json;
  if (ex && (ex.renderer !== name || !ex.data || typeof ex.data !== 'object' || typeof ex.caption !== 'string')) E(`${rel(path.join(folder, 'example.json'))}: must be a figure object { renderer: "${name}", caption, data }`);
  const lib = libraryDir(name);
  if (lib) {
    for (const f of libFiles(lib)) {
      const c = path.join(folder, f);
      if (!fs.existsSync(c) || !fs.readFileSync(c).equals(fs.readFileSync(path.join(lib, f)))) E(`course copy of ${name} differs from library renderers/${path.relative(path.join(KIT_ROOT, 'renderers'), lib).split(path.sep).join('/')}/${f.split(path.sep).join('/')}; use add-renderer.mjs or rename to a new name/major`);
    }
  }
  const acc = {};
  for (const f of jsFilesIn(folder)) lintSource(f, folder, f === index, acc);
  if (acc.listens && !acc.inspect) W(`${acc.listens}: event listener but no \`export const inspect = true\` (renderers are read, not operated; tap-to-look-closer must be declared)`);
  if (acc.inspect && !acc.keyboard) W(`${name}: inspect = true but no keyboard path (key listener or tabindex); look-closer must work from the keyboard`);
  if (!fs.existsSync(index)) return;

  let mod = null;
  try { mod = await import(pathToFileURL(index).href); } catch (e) { N(`${name}: validate() not run, index.js did not import in Node (${String(e.message).split('\n')[0].slice(0, 100)})`); }
  if (!mod || typeof mod.validate !== 'function') return;
  const run = (label, data) => {
    try {
      const r = mod.validate(structuredClone(data));
      for (const s of (Array.isArray(r) ? r : (r ? [r] : []))) E(`${label}: validate(): ${s}`);
    } catch (e) { E(`${label}: validate() threw: ${e.message}`); }
  };
  if (ex && ex.data) run(rel(path.join(folder, 'example.json')), ex.data);
  if (ex && ex.data && typeof mod.describe === 'function') {
    const L = rel(path.join(folder, 'example.json'));
    try {
      const d = mod.describe(structuredClone(ex.data), 1);
      if (typeof d !== 'string') E(`${L}: describe() returned ${typeof d}, must be a string`);
      else if (d.includes('<')) E(`${L}: describe() returned markup ('<'); it must be plain text`);
    } catch (e) { E(`${L}: describe() threw: ${e.message}`); }
  }
  for (const u of uses.get(name) || []) run(rel(u.file), u.data);
}

console.log(`renderer-lint ${path.basename(B)}`);
for (const name of uses.keys()) if (!bindings[name]) E(`${name}: no binding in bundle.json "renderers" (used by ${uses.get(name).map((u) => rel(u.file)).join(', ')})`);
for (const [name, b] of Object.entries(bindings)) await lintRenderer(name, b);
if (!Object.keys(bindings).length && !uses.size) console.log('  no renderers in this bundle');
console.log(`${errors ? 'FAIL' : 'PASS'} - ${Object.keys(bindings).length} bound, ${uses.size} used, ${errors} error, ${warns} warn, ${notes} note`);
process.exit(errors ? 1 : 0);
