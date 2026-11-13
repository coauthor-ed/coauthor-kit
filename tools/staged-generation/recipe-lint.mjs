#!/usr/bin/env node
// recipe-lint - every challenge game (every mini-game@1 block with a scene: GameFrame, ArcadeScene or withChallenge; drive-module plays all of them)
// needs a drive-module recipe, or nobody plays it in the module drive (OC-07: 4 challenge games had none).
//
//   node tools/staged-generation/recipe-lint.mjs <bundle-dir|id>
//
// A recipe is <Scene>.mjs (or, for an arcade scene, <ArcadeBase>.mjs) in the first of:
//   <bundle>/drive-recipes/             course-local (read by `drive-module.mjs --recipes <bundle>/drive-recipes`)
//   <engine>/tools/drive-module/recipes/<bundleId>/ and .../_base/   (what drive-module reads with no flag)
// WARN only: today drive-module.mjs reads recipes from the ENGINE repo (or --recipes <dir>); a course cannot ship one
// by default, so a missing recipe is an advisory until drive-module also reads <bundle>/drive-recipes.
// Engine checkout: $COAUTHOR_ENGINE_DIR, ./coauthor, ../coauthor, ../../coauthor. Exit 0 always.
import fs from 'node:fs';
import path from 'node:path';
import { bundleFromArg, KIT_ROOT } from '../sim-test/lib/bundle.mjs';

const arg = process.argv[2];
const B = arg ? bundleFromArg(arg) : null;
if (!B || !fs.existsSync(path.join(B, 'blocks'))) { console.error('usage: node tools/staged-generation/recipe-lint.mjs <bundle-dir|id>'); process.exit(2); }
const bid = path.basename(B);
const engine = [process.env.COAUTHOR_ENGINE_DIR, path.join(KIT_ROOT, 'coauthor'), path.join(KIT_ROOT, '..', 'coauthor'), path.join(KIT_ROOT, '..', '..', 'coauthor')]
  .filter(Boolean).map((d) => path.resolve(d)).find((d) => fs.existsSync(path.join(d, 'tools', 'drive-module', 'recipes')));
const dirs = [path.join(B, 'drive-recipes'), engine && path.join(engine, 'tools', 'drive-module', 'recipes', bid), engine && path.join(engine, 'tools', 'drive-module', 'recipes', '_base')].filter(Boolean);
const walk = (d) => (fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.json') ? [path.join(d, e.name)] : [])) : []);
const warns = [];
for (const f of walk(path.join(B, 'blocks'))) {
  let j; try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { continue; }
  if (!/^mini-game@/.test(j.type || '') || !j.src) continue;
  const sf = path.join(B, j.src);
  let src = ''; try { src = fs.readFileSync(sf, 'utf8'); } catch { continue; }
  const scene = path.basename(j.src, '.js');
  const ext = (src.match(/class\s+\w+\s+extends\s+(\w+)/) || [])[1] || '';
  const names = [scene, ext].filter(Boolean);
  const found = dirs.some((d) => names.some((n) => fs.existsSync(path.join(d, `${n}.mjs`))));
  if (!found) warns.push(`WARN ${path.relative(B, f)}: challenge game ${scene} has no drive recipe (looked for ${names.join(' / ')}.mjs in ${dirs.map((d) => path.relative(KIT_ROOT, d) || d).join(', ')}); nobody plays it in drive-module`);
}
if (!engine) warns.push('WARN engine checkout not found: only <bundle>/drive-recipes was searched; set COAUTHOR_ENGINE_DIR');
for (const w of warns) console.log(w);
console.log(`recipe-lint ${bid}: ${warns.length ? 'WARN' : 'PASS'} - ${warns.length} warn (a course cannot ship a recipe by default today: drive-module reads the engine's recipes dir or --recipes)`);
