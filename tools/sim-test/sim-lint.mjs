#!/usr/bin/env node
// sim-lint - fast static checks for DomSimulation scenes (no browser).
//
//   node tools/sim-test/sim-lint.mjs <scene.js | dir> [...] [--strict] [--quiet]
//
//   ERROR  syntax        node --check fails (a stray backtick in a template
//                        literal is the usual cause)
//   ERROR  hex-color     #hex / rgb() / hsl() literal in a scene (use --sim-*)
//   WARN   style-order   injectStyle() runs before root.innerHTML = ...; safe on
//                        the current engine, drops the CSS on an older one. Use
//                        this.render({ html, css }).
//   WARN   grid-fr       grid track like 1fr without minmax(0, 1fr): a wide child
//                        stretches the track and the scene overflows
//   WARN   small-font    CSS font-size under 14px (use --sim-text-sm and up)
//   NOTE   abs-position  left/top in px (flex/grid keeps text robust; a decorative dot or badge is fine; never counted)
//   WARN   token         --sim-* token that no palette declares (falls to an alias)
//   WARN   aria-label    no static ARIA_LABEL on the scene
//   WARN   beat-clamp    hand-written beat clamp (use static BEAT_STEP_MAP + onStep)
//   WARN   host-controls non-empty static CONTROLS: a DOM/SVG scene builds its controls
//                        into the scene (dom-scene-kit.md "Controls live in the scene")
//   WARN   dup-style     two style= attributes in one tag of a template string: the browser keeps
//                        only the first, so a fill or stroke is dropped silently (merge them, or wrap in <g>)
//   WARN   plain-look    under the plain look (--look, else the bundle's): a mascot, cast or arcade
//                        import (packs/look/plain/CARD.md items 8, 9, 12); NOTE for SimFigure/SimAnimal:
//                        allowed as the subject of a mechanism (drawn faceless), never as decoration
//
// Silence one kind in a scene with a comment: // sim-lint-ignore abs-position: badge pinned on a diagram
//
// Exit 1 on any ERROR (or any WARN with --strict). The real-browser
// counterpart is sim-layout.mjs; run both.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadClosedPalette } from './colorTokenScan.mjs';
import { expandTargets, bundleFromArg, sceneKindOf, bundleOf } from './lib/bundle.mjs';
import { bundleProfile } from '../staged-generation/lib/bundleProfile.mjs';
import { parseArgs } from './lib/args.mjs';

// The kit's own kit/ (and anything under simulations-kit/ named shared/) holds helpers, not scenes; a bundle's simulations/shared/ holds real scenes, wherever the bundle sits.
const isHelperDir = (f) => /[\\/]kit[\\/]/.test(f) || (/[\\/]shared[\\/]/.test(f) && /[\\/]simulations-kit[\\/]/.test(f));

const HERE = path.dirname(fileURLToPath(import.meta.url));
const USAGE = 'node tools/sim-test/sim-lint.mjs <scene.js | L0N/Scene | Scene | dir> [...] [--bundle <id|dir>] [--look <id>] [--strict] [--quiet]';
const A = parseArgs(process.argv.slice(2), { tool: 'sim-lint', file: import.meta.url, usage: USAGE, val: ['bundle', 'look'], bool: ['strict', 'quiet'] });
const strict = A.has('strict');
const quiet = A.has('quiet');
const targets = expandTargets(A.pos, bundleFromArg(A.val('bundle')));
if (!targets.length) {
  console.error(`usage: ${USAGE}`);
  process.exit(2);
}

function collect(t, out) {
  if (fs.statSync(t).isFile()) { if (t.endsWith('.js')) out.push(path.resolve(t)); return; }
  for (const f of fs.readdirSync(t).sort()) collect(path.join(t, f), out);
}
const files = [];
for (const t of targets) collect(t, files);

const palette = new Set(loadClosedPalette());
try {
  const ui = fs.readFileSync(path.join(HERE, '../../simulations-kit/src/simulations/base/SimUi.js'), 'utf8');
  for (const m of ui.matchAll(/(--sim-[a-z0-9-]+)\s*:/g)) palette.add(m[1]);
} catch { /* kit without SimUi: token check is then advisory only */ }

const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
const lineOf = (src, idx) => src.slice(0, idx).split('\n').length;

let errors = 0, warns = 0, checked = 0;
for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8');
  if (sceneKindOf(file).kind !== 'dom' || isHelperDir(file)) continue;   // follows relative-import `extends` chains
  checked++;
  const src = stripComments(raw);
  const out = [];
  // '// sim-lint-ignore <kind>: reason' anywhere in the file silences that kind
  const ignored = new Set([...raw.matchAll(/sim-lint-ignore\s+([a-z-]+)/g)].map((m) => m[1]));
  const add = (lvl, kind, msg, idx) => !ignored.has(kind) && out.push([lvl, kind, msg + (idx != null ? ` (line ${lineOf(src, idx)})` : '')]);

  const syn = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (syn.status !== 0) add('ERROR', 'syntax', (syn.stderr.split('\n').find((l) => /Error/.test(l)) || 'node --check failed').trim());

  // hex / rgb colours, ignoring url(#id), href="#id", &#entity; and svg id refs
  const colorSrc = src.replace(/url\(\s*['"]?#[^)]*\)/g, '').replace(/href\s*=\s*["']#[^"']*["']/g, '').replace(/&#[0-9a-zA-Z]+;/g, '');
  const hexes = [...colorSrc.matchAll(/(^|[^\w&#-])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b/g)];
  const fns = [...colorSrc.matchAll(/\b(?:rgba?|hsla?)\(\s*\d/g)];
  if (hexes.length + fns.length) add('ERROR', 'hex-color', `${hexes.length + fns.length} literal colour(s); use var(--sim-*) or --sim-series-1..8`, hexes[0]?.index ?? fns[0]?.index);

  // injectStyle() before root.innerHTML = ... inside the SAME method
  let ij = -1;
  for (const chunk of src.split(/^(?=  (?:async\s+)?[A-Za-z_$][\w$]*\s*\([^)]*\)\s*\{)/m)) {
    const a = chunk.search(/\.injectStyle\(/), b = chunk.search(/this\.root\.innerHTML\s*=/);
    if (a >= 0 && b >= 0 && a < b) { ij = src.indexOf(chunk) + a; break; }
  }
  if (ij >= 0) add('WARN', 'style-order', 'injectStyle() before root.innerHTML; use this.render({ html, css })', ij);

  // Two style= in one tag. ${...} is blanked (same length) so a ">" or quote inside it cannot end the tag early.
  const tagSrc = src.replace(/\$\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, (m) => 'x'.repeat(m.length));
  const dup = tagSrc.match(/<[a-zA-Z][^<>`\n]*?\sstyle\s*=\s*(?:"[^"\n]*"|'[^'\n]*')[^<>`\n]*?\sstyle\s*=/);
  if (dup) add('WARN', 'dup-style', 'two style= attributes in one tag: only the first applies (a helper that returns style= on a tag with its own style= does this too)', dup.index);

  const grids = [...src.matchAll(/grid-template-columns\s*:\s*([^;}`]+)/g)];
  const badGrid = grids.filter((g) => /\d(?:\.\d+)?fr\b/.test(g[1].replace(/minmax\([^)]*\)/g, '')));
  if (badGrid.length) add('WARN', 'grid-fr', `${badGrid.length} grid-template-columns without minmax(0, 1fr): "${badGrid[0][1].trim().slice(0, 50)}"`, badGrid[0].index);

  // SVG text sizes are drawing units, not screen px: a rule that sets fill is skipped
  const ruleBody = (idx) => src.slice(src.lastIndexOf('{', idx), src.indexOf('}', idx));
  const small = [...src.matchAll(/font(?:-size)?\s*:\s*(?:[a-z0-9 ]*\s)?(\d+(?:\.\d+)?)px/g)].filter((m) => Number(m[1]) < 14 && !/\bfill\s*:/.test(ruleBody(m.index)));
  if (small.length) add('WARN', 'small-font', `${small.length} declaration(s) under 14px (smallest ${Math.min(...small.map((m) => Number(m[1])))}px)`, small[0].index);

  const abs = [...src.matchAll(/(?:^|[;{\s])(?:left|top)\s*:\s*-?\d+px/gm)];
  if (abs.length && !/<canvas|createElement\(['"]canvas/.test(src)) add('NOTE', 'abs-position', `${abs.length} left/top px position(s): flex or grid keeps text robust; a decorative dot or badge inside a positioned card is fine (sim-layout reports what really overflows)`, abs[0].index);

  const used = new Set([...src.matchAll(/var\(\s*(--sim-[a-z0-9-]+)/g)].map((m) => m[1]));
  // --sim-ink-on-1..8 / -accent / -good / -bad / -warning / -gold: set at run time by applyToneInks (SimLookDom).
  const unknown = [...used].filter((t) => !palette.has(t) && !/^--sim-series-\d$/.test(t) && !/^--sim-ink-on-(?:[1-8]|accent|good|bad|warning|gold)$/.test(t) && !t.endsWith('-'));
  const localDecl = new Set([...src.matchAll(/(--sim-[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
  const trulyUnknown = unknown.filter((t) => !localDecl.has(t));
  if (trulyUnknown.length) add('WARN', 'token', `undeclared token(s): ${trulyUnknown.slice(0, 4).join(', ')}`);

  if (/BEAT_STEP_MAP\.length\s*-\s*1/.test(src) && !/static\s+BEAT_STEP_MAP/.test(src) && !/extends\s+(SlotBoardScene|KeyBuilderScene)/.test(src)) add('WARN', 'beat-clamp', 'hand-written beat clamp; declare static BEAT_STEP_MAP and use onStep()');

  // The host strip is for canvas/WebGL; DOM and SVG elements can sit beside what they change.
  const ctl = /static\s+(?:get\s+)?CONTROLS\b(?!\s*=\s*\[\s*\])/.exec(src);
  if (ctl) add('WARN', 'host-controls', 'non-empty CONTROLS: build the buttons/dials/tabs into the scene (SimFlowDom; dom-scene-kit.md "Controls live in the scene") and keep CONTROLS = []', ctl.index);

  // (canvas-size retired Q-86: the lesson hosts now leave a DOM/SVG scene's canvas with its own
  // inline width/height alone, as the kit harness does, so there is nothing to warn about.)

  // Look rules: the scene's look is --look, else its bundle's (bundle.json, profile.json), else quill.
  const B = bundleOf(file);
  const look = A.val('look') || (B ? bundleProfile(path.dirname(path.dirname(B)), path.basename(B)).look : 'quill');
  if (look === 'plain') {
    const ch = /from\s+['"][^'"]*kit\/(SimQuill|KeyCharacters|Arcade\w*|MonsterScene|GameFrame)\.js['"]/.exec(src);
    if (ch) add('WARN', 'plain-look', `imports ${ch[1]}: plain has no mascot, cast or games (packs/look/plain/CARD.md 8, 9, 12)`, ch.index);
    const fig = /from\s+['"][^'"]*kit\/(SimFigure|SimAnimal)\.js['"]/.exec(src);
    if (fig) add('NOTE', 'plain-figure', `imports ${fig[1]}: fine when the person or animal is the subject of the mechanism (the kit draws it faceless); a population as data is dotsSvg or a count (packs/look/plain/CARD.md 8)`, fig.index);
  }

  if (!/static\s+ARIA_LABEL\s*=/.test(src) && !/\bariaLabel\s*:/.test(src)) add('WARN', 'aria-label', 'no static ARIA_LABEL');

  // HTML5 drag and drop has no keyboard path and is unreliable on touch: phone learners cannot act.
  const dnd = src.search(/draggable\s*=\s*["']?true|['"]drag(?:start|over|enter)['"]|\.ondrag(?:start|over)\b/);
  if (dnd >= 0) add('WARN', 'html5-dnd', 'HTML5 drag events: no keyboard path, unreliable on touch; use simPick() (kit/SimPick.js): drag, tap-tap and keys', dnd);

  // A multi-column board with no portrait design or measured layout is unreadable on a phone.
  if (/extends\s+(?:with(?:Challenge|Beats|Clock)\(\s*)*DomSimulation\b/.test(src) && !/static\s+PORTRAIT_WIDTH\s*=\s*\d/.test(src) && !/static\s+(?:LAYOUT|FIT)\s*=/.test(src)) {
    const multi = grids.find((g) => { const t = g[1].trim(); const r = /repeat\(\s*(\d+)/.exec(t); return r ? Number(r[1]) > 1 : t.replace(/minmax\([^)]*\)/g, 'M').split(/\s+/).filter(Boolean).length > 1; });
    if (multi) add('WARN', 'no-portrait', 'multi-column grid with no PORTRAIT_WIDTH/PORTRAIT_HEIGHT or static LAYOUT: it shrinks to ~55% on a phone', multi.index);
    else add('NOTE', 'no-portrait', 'no PORTRAIT_* or static LAYOUT; fine for a single column, check sim-layout portrait');
  }

  const label = path.relative(process.cwd(), file);
  if (!out.length) { if (!quiet) console.log(`ok     ${label}`); continue; }
  for (const [lvl, kind, msg] of out) {
    if (lvl === 'ERROR') errors++; else if (lvl === 'WARN') warns++;
    console.log(`${lvl.padEnd(6)} ${label}  ${kind}: ${msg}`);
  }
}
if (!checked && files.length) { console.error(`sim-lint: none of the ${files.length} file(s) is a DOM scene (extends DomSimulation or a DOM kit base); a canvas scene (SimScene) is checked by check-scene`); process.exit(2); }
console.log(`\n${checked} scene(s): ${errors} error(s), ${warns} warning(s)`);
process.exit(errors || (strict && warns) ? 1 : 0);
