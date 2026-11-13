#!/usr/bin/env node
// focus - narrow the agent's view to one bundle. OPERATOR ONLY. Run before launching the harness.
//
//   node tools/operator/focus.mjs <bundle>       layer 1 (+2)
//   node tools/operator/focus.mjs --clear        remove everything focus wrote
//   node tools/operator/focus.mjs --no-deny <bundle>   layer 1 only (skip the harness deny rules)
// Layer 1: untracked .ignore (ripgrep-based Grep/Glob honour it) listing the other bundles, build/ and PDFs; .focus names the
//          bundle (next/orchestrate/where/status/log default to it). Removes discovery, not access.
// Layer 2: harness deny rules for reading courses/<other>/** (generated into .claude/settings.json and opencode.json).
// Layer 3: tools/operator/sandbox.sh <bundle> bind-mounts only the kit and that bundle (container or bwrap).
// examples/ stays visible on purpose. Cross-bundle reuse goes through tools/find-scene.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from '../sim-test/lib/args.mjs';
import { setFocusDeny, clearFocusDeny } from './lib/harness.mjs';

const A = parseArgs(process.argv.slice(2), { tool: 'focus', file: import.meta.url, usage: 'node tools/operator/focus.mjs <bundle> [--no-deny] | --clear', val: [], bool: ['clear', 'no-deny'] });
const root = process.cwd();
const ign = path.join(root, '.ignore'), foc = path.join(root, '.focus');
if (A.has('clear')) { fs.rmSync(ign, { force: true }); fs.rmSync(foc, { force: true }); clearFocusDeny(root); console.log('focus cleared'); process.exit(0); }
const b = A.pos[0];
const all = fs.existsSync(path.join(root, 'courses')) ? fs.readdirSync(path.join(root, 'courses')).filter((d) => fs.statSync(path.join(root, 'courses', d)).isDirectory()) : [];
if (!b || !all.includes(b)) { console.error(`pass a bundle: ${all.join(', ') || '(none under courses/)'}`); process.exit(2); }
const others = all.filter((d) => d !== b);
fs.writeFileSync(ign, ['# written by tools/operator/focus.mjs; remove with --clear', ...others.map((d) => `courses/${d}/`), 'build/', '.cache/', '*.pdf', ''].join('\n'));
fs.writeFileSync(foc, b + '\n');
if (!A.has('no-deny')) setFocusDeny(root, others);
console.log(`focus: ${b}\n  layer 1: .ignore hides ${others.length} other bundle(s), build/, .cache/, PDFs\n  layer 2: ${A.has('no-deny') ? 'skipped' : `read denied for ${others.length} other bundle(s) in the harness configs (file tools only; a shell cat is not stopped)`}\n  layer 3: tools/operator/sandbox.sh ${b}  (optional, strongest)`);
