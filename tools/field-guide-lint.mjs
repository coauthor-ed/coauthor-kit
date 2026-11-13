#!/usr/bin/env node
// field-guide-lint - checks a course field-guide.json (the data behind the kit's games).
//
//   node tools/field-guide-lint.mjs <bundle-dir> [--json]
//
//   ERROR  schema    duplicate ids, unknown trait/group ids, bad tone (1-8) or art key
//   ERROR  rule      an organism does not classify into its own group under the group rules
//                    (rules are ordered, first match wins - the same as FieldGuide.classify)
//   ERROR  scene-ref a game scene names an organism, group or trait that does not exist
//   WARN   group     a group has no organism, or its tone differs from the glossary face for that id
//   WARN   lure      an organism's group is only decided by lure traits (a lure never decides a group)
//   INFO   coverage  organisms per group
//
// Exit code 1 if any ERROR. Docs: docs/games.md.
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const dir = path.resolve(args.find((a) => !a.startsWith('--')) || '.');
const out = { errors: [], warns: [], info: [] };
const err = (k, m) => out.errors.push([k, m]);
const warn = (k, m) => out.warns.push([k, m]);
const file = path.join(dir, 'field-guide.json');
if (!fs.existsSync(file)) { console.error('no field-guide.json in ' + dir); process.exit(2); }
const fg = JSON.parse(fs.readFileSync(file, 'utf8'));

let artKeys = null;
const here = path.dirname(new URL(import.meta.url).pathname);
for (const p of ['../simulations-kit/src/simulations/base/kit/KeyCharacters.js']) {
  const f = path.resolve(here, p);
  if (fs.existsSync(f)) {
    const src = fs.readFileSync(f, 'utf8');
    artKeys = new Set([...src.slice(src.indexOf('const ART = {'), src.indexOf('export const ART_KEYS')).matchAll(/^  ([a-z0-9]+): `/gm)].map((m) => m[1]));
  }
}

const dup = (list, what) => { const seen = new Set(); for (const x of list) { if (seen.has(x.id)) err('schema', `duplicate ${what} id ${x.id}`); seen.add(x.id); } return seen; };
const T = dup(fg.traits || [], 'trait');
const G = dup(fg.groups || [], 'group');
const O = dup(fg.organisms || [], 'organism');
const kind = new Map((fg.traits || []).map((t) => [t.id, t.kind]));

for (const g of fg.groups || []) {
  for (const t of [...g.all, ...g.none]) if (!T.has(t)) err('schema', `group ${g.id}: unknown trait ${t}`);
  if (!(g.tone >= 1 && g.tone <= 8)) err('schema', `group ${g.id}: tone must be 1..8`);
  if (![...g.all].some((t) => kind.get(t) === 'evidence' && t !== 'swallows' && t !== 'cells') && g.none.length === 0) warn('lure', `group ${g.id}: no evidence trait decides it`);
  if ([...g.all, ...g.none].some((t) => kind.get(t) === 'lure')) warn('lure', `group ${g.id}: a lure trait is part of its rule`);
  if (!(fg.organisms || []).some((o) => o.group === g.id)) warn('group', `group ${g.id}: no organism`);
}
const classify = (ts) => { const s = new Set(ts); for (const g of fg.groups) if (g.all.every((t) => s.has(t)) && !g.none.some((t) => s.has(t))) return g.id; return null; };
for (const o of fg.organisms || []) {
  if (!G.has(o.group)) err('schema', `${o.id}: unknown group ${o.group}`);
  for (const t of o.traits) if (!T.has(t)) err('schema', `${o.id}: unknown trait ${t}`);
  if (artKeys && !artKeys.has(o.art)) err('schema', `${o.id}: unknown art ${o.art}`);
  if (!(o.tone >= 1 && o.tone <= 8)) err('schema', `${o.id}: tone must be 1..8`);
  const got = classify(o.traits);
  if (got !== o.group) err('rule', `${o.id} is in ${o.group} but the rules say ${got}`);
}

// glossary faces should agree with the group tone (one face and colour per group)
const gl = path.join(dir, 'glossary.json');
if (fs.existsSync(gl)) {
  const terms = new Map(JSON.parse(fs.readFileSync(gl, 'utf8')).terms.map((t) => [t.id, t]));
  for (const g of fg.groups || []) { const t = terms.get(g.id); if (t?.face && t.face.tone !== g.tone) warn('group', `group ${g.id}: tone ${g.tone} but glossary face tone is ${t.face.tone}`); }
}

// scenes that name organisms, groups or traits
const walk = (d) => (fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)])) : []);
for (const f of walk(path.join(dir, 'simulations')).filter((x) => x.endsWith('.js'))) {
  const src = fs.readFileSync(f, 'utf8');
  if (!/extends\s+(Monster|GuessWho|Conveyor|Museum|CardPacks|Expedition|SortRush|KeyDash|WhackAMyth)Scene\b/.test(src)) continue;
  const rel = path.relative(dir, f);
  const cfg = src.slice(src.indexOf('const CONFIG'), src.indexOf('export class'));
  let data; try { data = JSON.parse(cfg.replace(/^const CONFIG =\s*/, '').replace(/;\s*$/, '')); } catch { continue; }
  const check = (id, set, what) => { if (!set.has(id)) err('scene-ref', `${rel}: unknown ${what} "${id}"`); };
  const visit = (v, key) => {
    if (Array.isArray(v)) v.forEach((x) => (typeof x === 'string' ? (key === 'pool' || key === 'ids' ? check(x, O, 'organism') : key === 'parts' || key === 'need' || key === 'not' ? check(x, T, 'trait') : key === 'groups' ? check(x, G, 'group') : null) : visit(x, key)));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { if (['who', 'org', 'odd'].includes(k) && typeof x === 'string') check(x, O, 'organism'); else if (k === 'group' && typeof x === 'string') check(x, G, 'group'); else visit(x, k); }
  };
  visit(data, '');
  for (const b of data.bins || []) if (typeof b === 'string') check(b, G, 'group');
  for (const s of data.stops || []) for (const o of s.step.options || []) check(o, G, 'group');
}

for (const g of fg.groups || []) out.info.push(['coverage', `${g.id}: ${(fg.organisms || []).filter((o) => o.group === g.id).length}`]);
if (args.includes('--json')) console.log(JSON.stringify(out, null, 1));
else {
  for (const [k, m] of out.errors) console.log(`ERROR ${k.padEnd(9)} ${m}`);
  for (const [k, m] of out.warns) console.log(`WARN  ${k.padEnd(9)} ${m}`);
  console.log(`\n${(fg.organisms || []).length} organism(s), ${(fg.groups || []).length} group(s), ${(fg.traits || []).length} trait(s): ${out.errors.length} error(s), ${out.warns.length} warning(s)`);
}
process.exit(out.errors.length ? 1 : 0);
