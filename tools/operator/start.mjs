#!/usr/bin/env node
// start - set up a working repo from the kit master, or add a bundle to an existing one. OPERATOR ONLY.
//
//   node tools/operator/start.mjs [--from <kit folder|git-url#ref>] [--into <dir>] [--bundle <id>] [--source <chapter file>]
//        [--subject <s>] [--grade <n> | --no-grade] [--look <id>] [--audience <id>] [--subject-pack <id>] [--source-owned] [--web | --no-web]
// Empty/new --into: copies the kit-owned files (kit-files.txt), writes kit-source, kit-version, .gitignore, .gitattributes,
// courses/, and the web-deny harness config.
// Look/audience (profile.json, written once; a differing look or audience is kept as a bundle.json override), subject pack and sourceOwned are asked too;
// the bundles (briefs/bundles/) are rebuilt at the end. Then (asking for what is not passed) creates courses/<id>/{source,_work}/,
// bundle.json, copies the chapter file into source/, and prints the first next.mjs line. Re-run in an existing workspace to add a bundle.
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { parseArgs } from '../sim-test/lib/args.mjs';
import { syncKit, resolveSource } from './lib/kitsync.mjs';
import { spawnSync } from 'node:child_process';
import { setWeb, writeJson } from './lib/harness.mjs';
import { bundleProfile } from '../staged-generation/lib/bundleProfile.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const A = parseArgs(process.argv.slice(2), { tool: 'start', file: import.meta.url, usage: 'node tools/operator/start.mjs [--from <kit>] [--into <dir>] [--bundle <id>] [--source <file>] [--subject s] [--grade n|--no-grade] [--look id] [--audience id] [--subject-pack id] [--source-owned] [--web|--no-web]', val: ['from', 'into', 'bundle', 'source', 'subject', 'grade', 'look', 'audience', 'subject-pack'], bool: ['no-grade', 'web', 'no-web', 'source-owned'] });
const into = path.resolve(A.val('into') || process.cwd());
fs.mkdirSync(into, { recursive: true });

if (!fs.existsSync(path.join(into, 'kit-files.txt'))) {
  const from = A.val('from') || path.resolve(HERE, '..', '..');
  const master = resolveSource(from);
  const r = syncKit({ master, dest: into, apply: true });
  console.log(`copied ${r.copied} kit file(s) from ${from}`);
  fs.writeFileSync(path.join(into, 'kit-source'), from + '\n');
  fs.writeFileSync(path.join(into, 'kit-version'), (fs.existsSync(path.join(master, 'kit-version')) ? fs.readFileSync(path.join(master, 'kit-version'), 'utf8').trim() : 'unknown') + '\n');
  fs.mkdirSync(path.join(into, 'courses'), { recursive: true });
  const put = (f, s) => { const p = path.join(into, f); if (!fs.existsSync(p)) fs.writeFileSync(p, s); };
  put('.gitignore', 'build/\nkit-source\n.focus-rules.json\n.ignore\n.focus\n.cache/\ncompose*.yml\n*.swp\nnode_modules/\n');
  put('.gitattributes', 'GENERATION-LOG.md merge=union\n');
  put('kit.json', JSON.stringify({ reviewer: '' }, null, 2) + '\n');
  writeJson(path.join(into, 'kit.json'), JSON.parse(fs.readFileSync(path.join(into, 'kit.json'), 'utf8')));
  setWeb(into, false);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const it = rl[Symbol.asyncIterator]();
const ask = async (q) => { process.stdout.write(q); const { value, done } = await it.next(); return done ? '' : value.trim(); };
try {
  let id = A.val('bundle') || (await ask('Bundle id (courses/<id>/), blank to stop here: '));
  if (!id) { console.log('workspace ready; run start again to add a bundle.'); process.exit(0); }
  const B = path.join(into, 'courses', id);
  if (fs.existsSync(path.join(B, 'bundle.json'))) { console.error(`${B} already has a bundle.json - refusing`); process.exit(1); }
  const src = A.val('source') || (await ask('Chapter file (pdf/txt/md/pptx/docx/html) to copy into source/ (blank = add later): '));
  const subject = A.val('subject') || (await ask('Subject (e.g. physics): '));
  const grade = A.has('no-grade') ? '' : A.has('grade') ? A.val('grade') : (await ask('Grade or level (blank = none; e.g. 9, UG, PG): '));
  const cur = bundleProfile(into, null);
  const askId = async (flag, label, def, dir) => {
    const v = A.val(flag) || (await ask(`${label} [${def}]: `)) || def;
    if (!/^[a-z0-9][a-z0-9-]*$/.test(v)) { console.error(`${flag}: "${v}" is not a pack id`); process.exit(1); }
    if (!(flag === 'audience' && v === 'school') && !fs.existsSync(path.join(into, 'packs', dir, v, 'CARD.md'))) { console.error(`${flag}: packs/${dir}/${v}/CARD.md not found`); process.exit(1); }
    return v;
  };
  const look = await askId('look', 'Look (quill|plain)', cur.repoLook, 'look');
  const audience = await askId('audience', 'Audience (school|college)', cur.repoAudience, 'audience');
  const pack = A.val('subject-pack') || (await ask('Subject pack id (blank = none): '));
  const owned = A.has('source-owned') || /^y/i.test(await ask("Is the source the author's own material? [y/N]: "));
  const web = A.has('web') ? true : A.has('no-web') ? false : /^y/i.test(await ask('Allow web search for agents? [y/N]: '));
  const notes = [];
  const pf = path.join(into, 'profile.json');
  let bundleLook = null, bundleAudience = null;
  if (!fs.existsSync(pf)) writeJson(pf, { look, audience });
  else {
    if (look !== cur.repoLook) bundleLook = look;
    if (audience !== cur.repoAudience) bundleAudience = audience;
  }
  if (pack && !fs.existsSync(path.join(into, 'packs', 'subject', pack, 'CARD.md'))) notes.push(`WARN subject pack "${pack}": packs/subject/${pack}/CARD.md does not exist yet`);
  fs.mkdirSync(path.join(B, 'source'), { recursive: true }); fs.mkdirSync(path.join(B, '_work'), { recursive: true });
  if (src) { if (!fs.existsSync(src)) { console.error(`chapter file not found: ${src}`); process.exit(1); } fs.copyFileSync(src, path.join(B, 'source', path.basename(src))); }
  const manifest = { bundleId: id, title: id, subject };
  if (grade) manifest.grade = Number(grade) || grade;
  Object.assign(manifest, { description: '', icon: '', tags: [], publicPath: id });
  if (bundleLook) manifest.look = bundleLook;
  if (bundleAudience) manifest.audience = bundleAudience;
  if (pack) manifest.subjectPack = pack;
  if (owned) manifest.sourceOwned = true;
  writeJson(path.join(B, 'bundle.json'), manifest);
  setWeb(into, web);
  fs.writeFileSync(path.join(into, '.focus'), id + '\n');
  const bt = path.join(into, 'tools', 'staged-generation', 'build-bundles.mjs');
  if (fs.existsSync(bt)) { const r = spawnSync(process.execPath, [bt, '--repo', into], { encoding: 'utf8' }); if (r.status !== 0) notes.push(`WARN build-bundles failed: ${(r.stderr || '').trim().split('\n')[0]}`); }
  for (const n of notes) console.log(n);
  console.log(`look ${bundleLook || look}${bundleLook ? ' (bundle override)' : ''}, audience ${audience}${bundleAudience ? ' (bundle override)' : ''}, subject pack ${pack || 'none'}${owned ? ', source owned' : ''}`);
  console.log(`\ncreated ${path.relative(process.cwd(), B) || B}\nweb search for agents: ${web ? 'ON (also pass --web to next/orchestrate)' : 'off'}\nNext, from ${into}:\n  node tools/staged-generation/next.mjs --bundle ${id}${web ? ' --web' : ''}`);
} finally { rl.close(); }
