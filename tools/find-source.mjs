#!/usr/bin/env node
// find-source - offline fact check: search the indexed source text of a bundle. No web, no loading whole text files.
//
//   node tools/find-source.mjs "<term or claim>" [--bundle <id>] [--max 5]
// Index: courses/<b>/source/*.txt split into pages (form feed, as pdftotext writes it), cached under build/index/<b>/.
// Output (at most 5 hits, ~40 lines): file, page, a ~300 character snippet around the best match. Numbers and units weigh more.
// Nothing found: say so in the log; only a `Web: on` run may search the web.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from './sim-test/lib/args.mjs';
import { bundleFromArg, defaultBundle, KIT_ROOT } from './sim-test/lib/bundle.mjs';

const A = parseArgs(process.argv.slice(2), { tool: 'find-source', file: import.meta.url, usage: 'node tools/find-source.mjs "<term>" [--bundle <id>] [--max 5]', val: ['bundle', 'max'], bool: [] });
function focus() { try { const id = fs.readFileSync(path.join(process.cwd(), '.focus'), 'utf8').trim(); return id ? bundleFromArg(id) : null; } catch { return null; } }
const B = A.val('bundle') ? bundleFromArg(A.val('bundle')) : (focus() || defaultBundle());
const q = A.pos.join(' ').trim();
if (!B || !q) { console.error('usage: node tools/find-source.mjs "<term>" [--bundle <id>]'); process.exit(2); }
const max = Math.min(5, Number(A.val('max')) || 5);

const tok = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9.%°/]+/g, ' ').split(/\s+/).map((t) => t.replace(/^\.+|\.+$/g, '')).filter((t) => t.length > 1 || /\d/.test(t));
const STOP = new Set('the of and is in to a an are was were for on as by it its this that with at from or be can which has have'.split(' '));
const srcDirs = [path.join(B, 'source'), ...(fs.existsSync(path.join(B, 'parts')) ? fs.readdirSync(path.join(B, 'parts')).map((p) => path.join(B, 'parts', p, 'source')) : [])].filter(fs.existsSync);
const files = srcDirs.flatMap((d) => fs.readdirSync(d).filter((f) => f.endsWith('.txt')).map((f) => path.join(d, f)));
if (!files.length) { console.log('no source text found: run `pdftotext -layout <pdf> courses/<bundle>/source/<stem>.txt` (scanned PDFs have no text; flag the claim in the log).'); process.exit(0); }

const cacheP = path.join(KIT_ROOT, 'build', 'index', path.basename(B), 'source.json');
let idx = null;
try { const c = JSON.parse(fs.readFileSync(cacheP, 'utf8')); if (files.every((f) => fs.statSync(f).mtimeMs <= c.at) && c.files.length === files.length) idx = c; } catch { /* rebuild */ }
if (!idx) {
  const pages = [];
  for (const f of files) fs.readFileSync(f, 'utf8').split('\f').forEach((t, i) => { if (t.trim()) pages.push({ file: path.relative(B, f), page: i + 1, text: t.replace(/[ \t]+/g, ' ') }); });
  const df = {}; for (const p of pages) for (const t of new Set(tok(p.text))) df[t] = (df[t] || 0) + 1;
  idx = { at: Date.now(), files, df, pages };
  fs.mkdirSync(path.dirname(cacheP), { recursive: true }); fs.writeFileSync(cacheP, JSON.stringify(idx));
}
const N = idx.pages.length;
const qt = [...new Set(tok(q))].filter((t) => !STOP.has(t));
const scored = idx.pages.map((p) => {
  const toks = tok(p.text); const tf = {}; for (const t of toks) tf[t] = (tf[t] || 0) + 1;
  let s = 0; for (const t of qt) if (tf[t]) s += (1 + Math.log(tf[t])) * Math.log(1 + N / (idx.df[t] || 1)) * (/\d/.test(t) ? 2 : 1);
  return { p, s };
}).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, max);
if (!scored.length) { console.log(`no match for "${q}" in ${files.length} source file(s). Flag the claim in the log; do not search the web.`); process.exit(0); }
for (const { p } of scored) {
  const low = p.text.toLowerCase(); let at = -1;
  for (const t of qt.sort((a, b) => (/\d/.test(b) ? 1 : 0) - (/\d/.test(a) ? 1 : 0) || b.length - a.length)) { at = low.indexOf(t); if (at >= 0) break; }
  const from = Math.max(0, at - 120);
  console.log(`${p.file} p.${p.page}: ...${p.text.slice(from, from + 300).replace(/\s+/g, ' ').trim()}...`);
}
