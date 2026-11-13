#!/usr/bin/env node
// adopt - copy a public repo's bundles into this working repo's courses/ (to keep editing a published or forked course). OPERATOR ONLY.
//
//   node tools/operator/adopt.mjs <public repo folder> [--bundle <public path>] [--as <id>] [--yes] [--force]
// Reads bundle-manifest.json (or finds manifest.json files). Each bundle lands in courses/<last path segment> (or --as <id>) with a
// generated bundle.json (subject, grade, title, publicPath) and empty source/ and _work/. Dry run unless --yes; never overwrites a
// bundle folder unless --force. The working repo stays the only source of truth afterwards.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from '../sim-test/lib/args.mjs';
import { readJ } from './lib/manifest.mjs';

const A = parseArgs(process.argv.slice(2), { tool: 'adopt', file: import.meta.url, usage: 'node tools/operator/adopt.mjs <public repo> [--bundle <path>] [--as <id>] [--yes] [--force]', val: ['bundle', 'as'], bool: ['yes', 'force'] });
const src = path.resolve(A.pos[0] || '');
if (!A.pos[0] || !fs.existsSync(src)) { console.error('give the public repo folder'); process.exit(2); }
const found = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (e.name === '.git' || e.name === 'node_modules') continue; const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name === 'manifest.json' && readJ(p)?.bundleId) found.push(path.dirname(p)); } })(src);
const pick = found.filter((d) => !A.val('bundle') || path.relative(src, d) === A.val('bundle'));
if (!pick.length) { console.error('no bundle (manifest.json with a bundleId) found'); process.exit(2); }
const copy = (from, to) => { fs.mkdirSync(to, { recursive: true }); for (const e of fs.readdirSync(from, { withFileTypes: true })) { const f = path.join(from, e.name), t = path.join(to, e.name); if (e.isDirectory()) copy(f, t); else if (e.name !== 'manifest.json') fs.copyFileSync(f, t); } };
for (const d of pick) {
  const m = readJ(path.join(d, 'manifest.json')); const rel = path.relative(src, d);
  const id = (pick.length === 1 && A.val('as')) || path.basename(d); const dest = path.join(process.cwd(), 'courses', id);
  if (fs.existsSync(dest) && !A.has('force')) { console.log(`skip ${rel}: courses/${id} exists (--force to overwrite)`); continue; }
  console.log(`${A.has('yes') ? 'adopt' : 'would adopt'} ${rel} -> courses/${id}`);
  if (!A.has('yes')) continue;
  copy(d, dest); fs.mkdirSync(path.join(dest, 'source'), { recursive: true }); fs.mkdirSync(path.join(dest, '_work'), { recursive: true });
  fs.writeFileSync(path.join(dest, 'bundle.json'), JSON.stringify({ bundleId: id, title: m.title?.en || id, subject: m.subject, grade: m.grade, description: m.description || '', icon: m.icon || '', tags: m.tags || [], publicPath: rel }, null, 2) + '\n');
}
if (!A.has('yes')) console.log('(dry run: add --yes)');
