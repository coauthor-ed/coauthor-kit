#!/usr/bin/env node
// scene-info - what to build, from the files themselves.
//
//   node tools/sim-test/scene-info.mjs <target> [--bundle <id|dir>] [--no-text]
//
// <target>: a lesson folder (courses/<b>/simulations/L02, or "L02" with --bundle),
// a scene (.js / .stub.md / .design.md, or "L02/MyScene" with --bundle).
// For every scene: stub and design-note status, base class (once the .js exists),
// every slide/question that attaches it, each slide's REAL beat count (the
// engine's own splitSteps - trust it over any count written in a stub) and the
// first words of every beat. Flags a stub/JSON disagreement and a scene attached
// to slides with different beat counts (use BEAT_MAPS).
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from './lib/args.mjs';
import { sceneProfile } from './lib/profile.mjs';
import { bundleFromArg, resolveHelper, resolveTarget, describeMiss, scenesInFolder, attachersOf, parseStub, designStatus,
  sceneKindOf, sceneName, rel } from './lib/bundle.mjs';

const USAGE = 'node tools/sim-test/scene-info.mjs <L0N/Scene | Scene | L0N | path> [--bundle <id|dir>] [--no-text]';
const A = parseArgs(process.argv.slice(2), { tool: 'scene-info', file: import.meta.url, usage: USAGE, val: ['bundle'], bool: ['no-text'] });
const target = A.pos[0];
if (!target) { console.error(`usage: ${USAGE}`); process.exit(2); }
const bundleDir = bundleFromArg(A.val('bundle'));
const t = resolveTarget(target, bundleDir);
if (!t || !t.bundle) { console.error(describeMiss(target, bundleDir)); process.exit(2); }
const B = t.bundle;
const scenes = t.kind === 'folder' ? scenesInFolder(t.dir) : [t.file];
const showText = !A.has('no-text');

console.log(`# ${rel(B, t.dir)}: ${scenes.length} scene(s)   bundle: ${rel(process.cwd(), B) || '.'}`);
for (const file of scenes) {
  const name = sceneName(file);
  const stubP = file.replace(/\.js$/, '.stub.md');
  const designP = file.replace(/\.js$/, '.design.md');
  const stub = fs.existsSync(stubP) ? parseStub(fs.readFileSync(stubP, 'utf8')) : null;
  const status = designStatus(designP);
  const exists = fs.existsSync(file);
  const kind = exists ? sceneKindOf(file) : null;
  console.log(`\n## ${name}`);
  console.log(`file: ${exists ? `exists (${kind.kind}${kind.chain.length ? ': ' + kind.chain.join(' < ') : ''})` : 'not written'}   design note: ${status || 'none'}   stub: ${stub ? 'yes' : 'no'}`);
  { const p = sceneProfile(file, B); console.log(`visual profile: ${p.profile} (${p.from})${p.profile === 'rich' ? ' - read docs/visual-profiles.md' : ''}`); }
  if (stub) {
    const want = rel(B, file);
    if (stub.savePath && stub.savePath !== want) console.log(`!! stub Save path "${stub.savePath}" but the file is ${want}`);
    console.log(`stub: base class ${stub.baseClass || '(not given)'}; shared helper: ${stub.hasHelperLine ? stub.helper : '(no line)'}`);
    if (stub.helper && !/^none$/i.test(stub.helper)) {
      const hp = resolveHelper(stubP, stub.helper);   // same lookup as next.mjs: folder, shared/, other lessons, or a bundle path
      console.log(`helper ${stub.helper}: ${fs.existsSync(hp) ? 'exists' : 'not written yet'} (${rel(B, hp)})`);
    }
  }
  const att = attachersOf(B, file);
  if (!att.length) console.log('!! no slide or question attaches this scene (simulation.src)');
  const counts = new Set();
  for (const a of att) {
    const extra = [a.type && a.type !== 'content-block@1' ? a.type : '', a.role ? `role=${a.role}` : ''].filter(Boolean).join(' ');
    if (a.beats == null) { console.log(`- ${a.id} ${rel(B, a.path)}: no markdown (mounts without beats)${extra ? ' ' + extra : ''}`); continue; }
    counts.add(a.beats);
    console.log(`- ${a.id} ${rel(B, a.path)}: ${a.beats} beat(s)${a.authored ? ' [STEP ids]' : ''}${extra ? ' ' + extra : ''}`);
    if (showText) a.steps.forEach((s, i) => {
      const line = s.md.replace(/<!--[\s\S]*?-->/g, '').replace(/\s+/g, ' ').replace(/[*>#_]/g, '').trim();
      console.log(`    beat ${i}${s.id ? ` (${s.id})` : ''}: ${line.slice(0, 100)}${line.length > 100 ? '...' : ''}`);
    });
  }
  if (stub) {
    const actual = new Set(att.map((a) => a.id));
    const missing = stub.attachedIds.filter((id) => !actual.has(id));
    if (missing.length) console.log(`!! stub names ${missing.join(', ')} but that JSON does not attach this scene`);
  }
  if (counts.size > 1) console.log(`!! attached to slides with different beat counts (${[...counts].join(', ')}): declare static BEAT_MAPS keyed by count`);
}
