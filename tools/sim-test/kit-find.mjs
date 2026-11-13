#!/usr/bin/env node
// kit-find - concept in, kit module out. Do this BEFORE writing any helper or hand-drawn part.
//
//   node tools/sim-test/kit-find.mjs "draggable fulcrum beam tilt" [--top N] [--json]
//   node tools/sim-test/kit-find.mjs --stub <File.stub.md> [--write]     the `Kit candidates:` line for a stub (Stage 2); --write inserts it
//   node tools/sim-test/kit-find.mjs --report [--scan-root <dir> ...]    promotion report: what authors asked for and the kit did not have
//
// Searches the concept catalog (lib/kit-catalog.mjs: what each module is for, plus a synonym map) and the
// export names and doc lines of every kit module. Prints up to 5 hits: module, one line of purpose, the
// matching exports with signatures. "none fits" is a valid answer: say so with the query in your design note.
import fs from 'node:fs';
import path from 'node:path';
import { moduleExports } from './lib/ast.mjs';
import { KIT_SIMS, KIT_ROOT } from './lib/bundle.mjs';
import { parseArgs } from './lib/args.mjs';
import { MODULES, SYNONYMS } from './lib/kit-catalog.mjs';

const USAGE = 'node tools/sim-test/kit-find.mjs "<concept words>" [--top N] [--json] | --stub <File.stub.md> [--write] | --report [--scan-root <dir> ...]';
const STOP = new Set('a an the of to and or for with in on at is it that this i want need make build draw show'.split(' '));
const stem = (w) => w.replace(/(ing|ers|er|es|s|ed)$/, (m, g, o, s) => (s.length - m.length >= 3 ? '' : m));
const words = (t) => String(t).toLowerCase().split(/[^a-z0-9.-]+/).filter((w) => w && !STOP.has(w));

export function search(query, top = 5) {
  const q = words(query);
  if (!q.length) return [];
  const want = new Map();                                   // term -> weight (typed words 3, synonym expansion 1.5)
  for (const w of q) { want.set(stem(w), 3); for (const s of SYNONYMS[w] || SYNONYMS[stem(w)] || []) if (!want.has(stem(s))) want.set(stem(s), 1.5); }
  const hits = [];
  for (const [file, m] of Object.entries(MODULES)) {
    const needs = new Set(words(m.needs).map(stem));
    const does = new Set(words(m.does).map(stem));
    const name = file.replace(/\.js$/, '').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().split(' ').map(stem);
    let score = 0; const why = [];
    for (const [t, wt] of want) {
      if (needs.has(t)) { score += wt * 2; why.push(t); }
      else if (does.has(t)) { score += wt; why.push(t); }
      if (name.includes(t)) score += wt;
    }
    if (score > 0) hits.push({ file, score, why: [...new Set(why)], ...m });
  }
  hits.sort((a, b) => b.score - a.score || a.file.localeCompare(b.file));
  const out = hits.slice(0, top);
  for (const h of out) {                                    // matching exports, from the code (never a stale copy)
    const f = [path.join(KIT_SIMS, 'base', 'kit', h.file), path.join(KIT_SIMS, 'base', h.file)].find((p) => fs.existsSync(p));
    h.needs = MODULES[h.file]?.needs; h.import = f ? 'simulations/' + path.relative(KIT_SIMS, f).split(path.sep).join('/') : null;
    h.exports = [];
    if (f) {
      const { exports } = moduleExports(f);
      const t = [...want.keys()];
      const hit = (exports || []).filter((e) => t.some((x) => `${e.name} ${e.doc || ''}`.toLowerCase().includes(x)));
      h.exports = (hit.length ? hit : (exports || [])).slice(0, 4).map((e) => e.sig);
    }
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const A = parseArgs(process.argv.slice(2), { tool: 'kit-find', file: import.meta.url, usage: USAGE, val: ['top', 'stub', 'scan-root'], bool: ['json', 'write', 'report'] });
  const logQuery = (q, hits) => {                                  // one line per query: the promotion report reads these
    try {
      const d = path.join(KIT_ROOT, 'build', 'scratch'); fs.mkdirSync(d, { recursive: true });
      fs.appendFileSync(path.join(d, 'kit-find-log.jsonl'), JSON.stringify({ ts: new Date().toISOString(), q, top: hits[0]?.file || null, score: hits[0]?.score || 0 }) + '\n');
    } catch { /* logging is best effort */ }
  };
  if (A.has('report')) { report(A); process.exit(0); }
  if (A.val('stub')) {
    const f = path.resolve(A.val('stub')); const stub = fs.readFileSync(f, 'utf8');
    const get = (k) => (stub.match(new RegExp(`^${k}:[ \\t]*(.*)$`, 'mi')) || [])[1] || '';
    const q = ['Hero', 'Dials', 'Run shows', 'Must get right', 'Reuse', 'Component'].map(get).join(' ').replace(/[`'"()]/g, ' ');
    const res = search(q, 3); logQuery(q.slice(0, 200), res);
    const lineOut = res.length ? `Kit candidates: ${res.map((h) => `${h.file.replace(/\.js$/, '')} (${h.does.split(':')[0]})`).join('; ')}` : 'Kit candidates: none found (queried: ' + q.trim().slice(0, 80) + ')';
    if (A.has('write')) {
      let out = stub.replace(/^Kit candidates:.*\n?/m, '');
      out = /^Shared helper:/m.test(out) ? out.replace(/^Shared helper:/m, `${lineOut}\nShared helper:`) : out.replace(/\s*$/, `\n${lineOut}\n`);
      fs.writeFileSync(f, out); console.log(`wrote to ${f}:`);
    }
    console.log(lineOut); process.exit(0);
  }
  const query = A.pos.join(' ');
  if (!query) { console.error(USAGE); process.exit(2); }
  const res = search(query, Number(A.val('top')) || 5); logQuery(query, res);
  if (A.has('json')) { console.log(JSON.stringify(res, null, 1)); process.exit(0); }
  if (!res.length) { console.log(`none fits (queried: ${query}). Say so in your design note with this query; try other words first (a synonym is a one-line fix in lib/kit-catalog.mjs).`); process.exit(0); }
  for (const h of res) {
    console.log(`${h.import || h.file}  [${h.kind}]  score ${h.score}`);
    console.log(`  ${h.does}`);
    for (const e of h.exports) console.log(`    ${e}`);
  }
  console.log(`\nSee: node tools/sim-test/kit-api.mjs <module> for every export.`);
}

// Promotion report (stage3-cost-analysis 6.4/6.5): the signals that the kit is missing something or hides it.
function report(A) {
  const lines = [];
  try { for (const l of fs.readFileSync(path.join(KIT_ROOT, 'build', 'scratch', 'kit-find-log.jsonl'), 'utf8').split('\n').filter(Boolean)) lines.push(JSON.parse(l)); } catch { /* no log yet */ }
  const weak = lines.filter((x) => x.score < 12);
  console.log(`# kit-find queries logged: ${lines.length}; weak or empty answers: ${weak.length}`);
  const freq = new Map(); for (const x of weak) { const k = x.q.toLowerCase().slice(0, 100); freq.set(k, (freq.get(k) || 0) + 1); }
  for (const [q, n] of [...freq].sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`  ${n}x  ${q}`);
  const roots = [A.val('scan-root')].filter(Boolean).concat(A.pos);
  const none = new Map(), differ = new Map(), uses = new Map();
  for (const r of roots) (function walk(d, depth) {
    if (depth > 7 || !fs.existsSync(d)) return;
    for (const f of fs.readdirSync(d)) {
      if (f === 'node_modules' || f === '.git' || f === 'build') continue; const p = path.join(d, f); const st = fs.statSync(p);
      if (st.isDirectory()) walk(p, depth + 1);
      else if (f.endsWith('.design.md')) {
        const m = /^Kit use:\s*(.+)$/m.exec(fs.readFileSync(p, 'utf8')); if (!m) continue;
        if (/^none fits/i.test(m[1])) { const q = (/queried:\s*([^)]*)/.exec(m[1]) || [, '?'])[1].trim().toLowerCase(); none.set(q, [...(none.get(q) || []), p]); }
        else for (const e of m[1].split(/;\s*/)) { const em = /^(\w[\w.]*)\s+(use|extend|differ)\b\s*[-:,]?\s*(.*)$/i.exec(e.trim()); if (!em) continue; const k = em[1]; const u = uses.get(k) || { use: 0, extend: 0, differ: 0, why: [] }; u[em[2].toLowerCase()]++; if (em[2].toLowerCase() !== 'use') u.why.push(em[3].slice(0, 80)); uses.set(k, u); }
      }
    }
  })(path.resolve(r), 0);
  console.log(`\n# design notes: "none fits" queries (a mechanic the kit lacks, or hides): ${[...none.values()].flat().length}`);
  for (const [q, ps] of [...none].sort((a, b) => b[1].length - a[1].length).slice(0, 15)) console.log(`  ${ps.length}x  ${q}   e.g. ${ps[0]}`);
  console.log('\n# parts people extend or differ from (3+ = promotion candidate: fold the change into the part)');
  for (const [k, u] of [...uses].filter(([, u]) => u.extend + u.differ >= 3).sort((a, b) => (b[1].extend + b[1].differ) - (a[1].extend + a[1].differ))) console.log(`  ${k}: use ${u.use}, extend ${u.extend}, differ ${u.differ}; e.g. "${u.why[0]}"`);
  console.log('\nEach weak query is a synonym line in lib/kit-catalog.mjs plus a case in lib/kit-find-cases.mjs; a mechanic that 3+ scenes re-implement becomes a kit module with a catalog entry.');
}
