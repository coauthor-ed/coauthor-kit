#!/usr/bin/env node
// kit-sync - copy the kit-owned files (kit-files.txt) from the kit master into this working repo. OPERATOR ONLY.
//
//   node tools/operator/kit-sync.mjs [--from <folder|git-url#ref>] [--apply]     dry run by default
//   node tools/operator/kit-sync.mjs --status                                    kit-owned files here that differ from the master
//   node tools/operator/kit-sync.mjs --reverse [--apply]                         copy local kit fixes back into the master
// Default --from is the recorded kit-source file. Deletes only files that were kit-owned at the previous sync. Never touches
// workspace-owned files (courses/, bundle.json, kit.json, ...). Prints CHANGES.md entries newer than kit-version.
// briefs/bundles/ is generated per profile.json: never copied either way; --apply rebuilds it here (build-bundles.mjs), --status
// checks it (exit 1 when stale, with the rebuild command).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseArgs } from '../sim-test/lib/args.mjs';
import { syncKit, resolveSource, changesSince } from './lib/kitsync.mjs';

const A = parseArgs(process.argv.slice(2), { tool: 'kit-sync', file: import.meta.url, usage: 'node tools/operator/kit-sync.mjs [--from <kit>] [--apply] | --status | --reverse [--apply]', val: ['from'], bool: ['apply', 'status', 'reverse'] });
const dest = process.cwd();
const rd = (f) => { try { return fs.readFileSync(path.join(dest, f), 'utf8').trim(); } catch { return ''; } };
const from = A.val('from') || rd('kit-source');
if (!from) { console.error('no --from and no kit-source file'); process.exit(2); }
const master = resolveSource(from);
if (path.resolve(master) === path.resolve(dest)) { console.error('source and destination are the same folder'); process.exit(2); }
const skip = (f) => f.startsWith('briefs/bundles/');
const BB = path.join('tools', 'staged-generation', 'build-bundles.mjs');
const REBUILD = `node ${BB}`;
// Bundles in this repo vs its own sources and profile.json: { ok, out }. A repo with no build-bundles yet: ok.
const bundles = (check) => {
  if (!fs.existsSync(path.join(dest, BB))) return { ok: true, out: '' };
  const r = spawnSync(process.execPath, [path.join(dest, BB), ...(check ? ['--check'] : []), '--repo', dest], { encoding: 'utf8' });
  return { ok: r.status === 0, out: `${r.stdout || ''}${r.stderr || ''}`.trim() };
};
const show = (t, l) => { if (l.length) { console.log(`${t} (${l.length}):`); l.slice(0, 30).forEach((f) => console.log('  ' + f)); if (l.length > 30) console.log(`  ... +${l.length - 30}`); } };
if (A.has('status')) {
  const r = syncKit({ master, dest, reverse: true, skip });
  console.log(r.changed.length ? '' : 'kit-owned files match the master');
  show('differ from master', r.changed);
  const b = bundles(true);
  if (!b.ok) { console.log(`briefs/bundles/ stale for this repo's sources or profile. Fix: ${REBUILD}`); process.exit(1); }
  process.exit(0);
}
if (A.has('reverse')) {
  const r = syncKit({ master, dest, reverse: true, apply: A.has('apply'), skip });
  show(A.has('apply') ? 'copied into master' : 'would copy into master (dry run: add --apply)', r.changed); process.exit(0);
}
const r = syncKit({ master, dest, apply: A.has('apply'), skip });
show('new', r.added); show('changed', r.changed); show('removed (kit-owned before, gone from master)', r.removed);
if (!r.added.length && !r.changed.length && !r.removed.length) console.log('already in sync');
else if (!A.has('apply')) console.log('(dry run: add --apply; it also rebuilds briefs/bundles/ for this repo\'s profile)');
else {
  const v = fs.existsSync(path.join(master, 'kit-version')) ? fs.readFileSync(path.join(master, 'kit-version'), 'utf8').trim() : '';
  const old = rd('kit-version');
  if (v) fs.writeFileSync(path.join(dest, 'kit-version'), v + '\n');
  const ch = changesSince(master, old);
  console.log(`synced ${r.copied} file(s); kit-version ${old || '-'} -> ${v || '-'}`);
  if (ch) console.log(`\nCHANGES since ${old || 'start'}:\n${ch}`);
}
// Rebuild the generated bundles for this repo's profile after any --apply (also when nothing changed: profile.json may have).
if (A.has('apply')) {
  const w = bundles(false);
  const c = w.ok ? bundles(true) : w;
  if (!c.ok) { console.error(`briefs/bundles/ rebuild failed or still stale:\n${c.out}\nFix: ${REBUILD}`); process.exit(1); }
  console.log(fs.existsSync(path.join(dest, BB)) ? 'briefs/bundles/ rebuilt for this repo\'s profile' : '');
}
