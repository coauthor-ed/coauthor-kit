#!/usr/bin/env node
/**
 * release-scenes - the OWNER's tool for scenes a killed run left owned (Status: building | sanity | verifying).
 * Nothing releases them automatically: orchestrate.mjs only reports them. Run this when you are sure no agent is alive.
 *
 *   node tools/staged-generation/release-scenes.mjs --bundle <id> [--part NN] (--all | --lesson L02 | --stub <path|name>) [--dry-run] [--yes]
 *
 *   --all            every scene of the bundle (or of --part)
 *   --lesson L02     the scenes in simulations/L02/
 *   --stub <s>       one scene: simulations/L02/XScene.stub.md (or .design.md / .js), L02/XScene, or XScene if unique
 *   --dry-run        print what would change, write nothing
 *   --yes            also release a note modified in the last ${RECENT_MIN} minutes (otherwise skipped: an agent may still be writing it)
 *
 * For each owned scene the design note's Status line is set to what its "## Progress" lines imply (the same resumeStatus()
 * rule next.mjs uses for --force-scene): last line "build end: check-quick PASS" or "sanity end" -> verify-pending;
 * "build end: check-quick FAIL" or "sanity started" -> sanity-pending; "verify started" -> verify-pending; no usable Progress
 * -> back to the pass's own start status (a build becomes build-pending: offered again as a Resume, never rewritten).
 * Only that one Status line changes (no code, no log, no Progress line). Each release adds one "release" event to
 * build/scratch/<bundle>/orchestrate-ledger.ndjson. Then re-run orchestrate.mjs.
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, appendFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { resumeStatus, OWNED, resolveBundleId, isCheckout } from './next.mjs';
import { partsOf } from '../sim-test/lib/bundle.mjs';

const RECENT_MIN = 5;
const argv = process.argv.slice(2);
const val = (n) => { const i = argv.indexOf(n); return i < 0 ? null : argv[i + 1]; };
const has = (n) => argv.includes(n);
const USAGE = 'node tools/staged-generation/release-scenes.mjs --bundle <id> [--part NN] (--all | --lesson L02 | --stub <path|name>) [--dry-run] [--yes] [--repo <dir>]';
const KNOWN = new Set(['--bundle', '--part', '--all', '--lesson', '--stub', '--dry-run', '--yes', '--repo', '--help', '-h']);
for (const a of argv) if (a.startsWith('-') && !KNOWN.has(a)) { console.error(`unknown flag ${a}\nusage: ${USAGE}`); process.exit(2); }
if (has('--help') || has('-h')) { console.log(`usage: ${USAGE}\n\n${readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(2, 22).map((l) => l.replace(/^ ?\* ?/, '')).join('\n').replace(/\$\{RECENT_MIN\}/g, RECENT_MIN)}`); process.exit(0); }

const repoDir = path.resolve(val('--repo') || process.cwd());
if (!isCheckout(repoDir)) { console.error(`${repoDir} doesn't look like a content-repo-template checkout (missing AGENTS.md or courses/).`); process.exit(2); }
const bundleId = resolveBundleId(repoDir, val('--bundle'));
if (!bundleId) { console.error(`--bundle <id> is required (or the only bundle)\nusage: ${USAGE}`); process.exit(2); }
const scopes = ['--all', '--lesson', '--stub'].filter((f) => has(f));
if (scopes.length !== 1) { console.error(`give exactly one of --all, --lesson L02, --stub <scene>\nusage: ${USAGE}`); process.exit(2); }
const bundleDir = path.join(repoDir, 'courses', bundleId);
const simsDir = path.join(bundleDir, 'simulations');
if (!existsSync(simsDir)) { console.error(`no ${path.relative(repoDir, simsDir)}`); process.exit(2); }

let lessons = readdirSync(simsDir).filter((d) => statSync(path.join(simsDir, d)).isDirectory() && d !== 'shared').sort();
const part = val('--part');
if (part) {
  const nn = String(part).replace(/^P/i, '').padStart(2, '0');
  if (!partsOf(bundleDir).includes(nn)) { console.error(`--part ${nn}: this bundle has parts ${partsOf(bundleDir).join(', ') || '(none)'}`); process.exit(2); }
  lessons = lessons.filter((d) => d.startsWith(`L${nn}-`));
}
let scenes = [];
for (const l of lessons) {
  for (const f of readdirSync(path.join(simsDir, l)).filter((x) => x.endsWith('.design.md')).sort()) scenes.push({ lesson: l, name: f.replace(/\.design\.md$/, ''), design: path.join(simsDir, l, f) });
}
if (has('--lesson')) {
  const want = String(val('--lesson')).replace(/^.*simulations\//, '').replace(/\/$/, '');
  if (!lessons.includes(want)) { console.error(`--lesson ${want}: no such folder. Have: ${lessons.join(', ')}`); process.exit(2); }
  scenes = scenes.filter((s) => s.lesson === want);
} else if (has('--stub')) {
  const raw = String(val('--stub'));
  const base = raw.replace(/\.(stub|design)\.md$|\.js$/, '').split('/');
  const name = base[base.length - 1];
  const les = base.length > 1 ? base[base.length - 2] : null;
  scenes = scenes.filter((s) => s.name === name && (!les || s.lesson === les || les === 'simulations'));
  if (scenes.length > 1) { console.error(`${raw} is in several lessons (${scenes.map((s) => s.lesson).join(', ')}): write L0N/${name}`); process.exit(2); }
  if (!scenes.length) { console.error(`--stub ${raw}: no design note for that scene under ${path.relative(repoDir, simsDir)}`); process.exit(2); }
}

const now = Date.now();
const ledger = path.join(repoDir, 'build', 'scratch', bundleId, 'orchestrate-ledger.ndjson');
const rows = [];
let changed = 0, skipped = 0;
for (const sc of scenes) {
  const text = readFileSync(sc.design, 'utf8');
  const status = ((/^Status:[ \t]*([\w-]+)/mi.exec(text) || [])[1] || 'building').toLowerCase();
  if (!OWNED.includes(status)) continue;
  const next = (() => { const r = resumeStatus(text, status); return r === 'fresh' ? 'build-pending' : r; })();
  const ageMin = (now - statSync(sc.design).mtimeMs) / 60000;
  const label = `${sc.lesson}/${sc.name}`;
  if (ageMin < RECENT_MIN && !has('--yes')) {
    skipped += 1;
    rows.push(`SKIP    ${label}: ${status}, note modified ${ageMin < 1 ? 'under a minute' : `${Math.round(ageMin)} min`} ago (an agent may still be writing it); --yes to release it anyway`);
    continue;
  }
  rows.push(`${has('--dry-run') ? 'WOULD  ' : 'RELEASE'} ${label}: ${status} -> ${next}`);
  changed += 1;
  if (has('--dry-run')) continue;
  const out = /^Status:.*$/m.test(text) ? text.replace(/^Status:.*$/m, `Status: ${next}`) : `Status: ${next}\n${text}`;
  writeFileSync(sc.design, out);
  mkdirSync(path.dirname(ledger), { recursive: true });
  appendFileSync(ledger, `${JSON.stringify({ t: new Date().toISOString(), unit: label, kind: 'release', attempt: 1, text: `${status} -> ${next} (release-scenes)` })}\n`);
}
console.log(rows.length ? rows.join('\n') : `no scene in scope is owned (Status building, sanity or verifying): ${scenes.length} scene(s) checked`);
console.log(`${has('--dry-run') ? 'dry run: nothing written. ' : ''}${changed} ${has('--dry-run') ? 'would be released' : 'released'}, ${skipped} skipped, ${scenes.length} checked.${changed && !has('--dry-run') ? ' Now re-run orchestrate.mjs (a build-pending scene comes back as a Resume build).' : ''}`);
