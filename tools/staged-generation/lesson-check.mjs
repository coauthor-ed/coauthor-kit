#!/usr/bin/env node
// lesson-check - every Stage 2 gate for one lesson, in one command.
//
//   node tools/staged-generation/lesson-check.mjs <bundle id | dir> <L0N> [--verbose]
//
//   validate    validators/validate.mjs over the lesson file and every block/
//               question/explanation JSON of that lesson (only failures printed)
//   outline     slide count vs OUTLINE.md's Lesson list
//   figures     WARN the geometry `diagram` field on a course that is not maths/physics: a flow,
//               panels or a timeline is the `figure` field (docs/figures.md)
//   scenes      every simulation.src resolves to a scene .js or a .stub.md
//   stubs       each stub in simulations/L0N/ (and the stub of any scene another lesson owns
//               that this lesson mounts) follows briefs/reference/stub-format.md:
//               header lines, Beats = the attaching slide's REAL beat count
//               (splitSteps), one "Per beat" bullet per beat (a "### <block id>"
//               list per slide when several slides attach it, plus "Beat maps:"
//               when their counts differ, or "Same beats on all slides: yes"), Attached by ids
//               that really attach it, byte-exact "Verbatim slide markdown" copies
//               (--fix-verbatim re-copies them), last line "Shared helper: ..."
//   necessity   look plain or audience college: WARN a stub whose Dials name no learner action beyond tap-to-open
//               and whose Run shows / Dials name no changing quantity (decoration: docs/pedagogy.md "Earn every scene")
// Exit 1 on any FAIL.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { geometrySubject, DIAGRAM_HINT } from './lib/figureField.mjs';
import { stubDecoration, plainOrCollege } from './lib/plainRules.mjs';
import { bundleProfile } from './lib/bundleProfile.mjs';
import { KIT_ROOT, LESSON_ID_RE, lessonSlug, workDirOfLesson, bundleFromArg, defaultBundle, contentFiles, attachersOf, markdownOf, rel } from '../sim-test/lib/bundle.mjs';

const args = process.argv.slice(2);
const pos = args.filter((a) => !a.startsWith('--'));
const B = pos[0] ? bundleFromArg(pos[0]) : defaultBundle();
const L = (pos[1] || '').toUpperCase();
if (!B || !LESSON_ID_RE.test(L)) { console.error('usage: node tools/staged-generation/lesson-check.mjs <bundle> <L0N | C0N | L<part>-<module>-<lesson>>'); process.exit(2); }
const verbose = args.includes('--verbose');
const VISUAL = (() => { const p = bundleProfile(path.dirname(path.dirname(B)), path.basename(B)); return plainOrCollege(p.look, p.audience); })();
let fails = 0, warns = 0;
const FAIL = (s) => { fails++; console.log('  FAIL ' + s); };
const WARN = (s) => { warns++; console.log('  WARN ' + s); };

const lessonFile = path.join(B, 'lessons', `les-${lessonSlug(L)}.json`);
const lower = L.toLowerCase();
const inLesson = (p) => p.split(path.sep).includes(L) || path.basename(p).includes(`-${lower}-`);
const jsons = contentFiles(B).filter((f) => inLesson(f.path));

// -- validate ----------------------------------------------------------------------------
console.log(`# ${path.basename(B)} ${L}`);
const files = [...(fs.existsSync(lessonFile) ? [lessonFile] : []), ...jsons.map((f) => f.path)];
if (!fs.existsSync(lessonFile)) FAIL(`no lesson file ${rel(B, lessonFile)}`);
if (files.length) {
  const r = spawnSync(process.execPath, [path.join(KIT_ROOT, 'validators', 'validate.mjs'), ...files], { cwd: KIT_ROOT, encoding: 'utf8', maxBuffer: 64 << 20 });
  const out = (r.stdout || '') + (r.stderr || '');
  const ls = out.split('\n');
  let bad = 0;
  ls.forEach((l, i) => {
    if (/^FAIL /.test(l)) {
      bad++;
      const why = [];
      for (let j = i + 1; j < ls.length && /^\s+-/.test(ls[j]); j++) why.push(ls[j].trim());
      FAIL(`validate ${path.relative(KIT_ROOT, l.slice(5).trim())}: ${why.join(' ')}`);
    } else if (verbose && /^(ok|warn)/i.test(l)) console.log('  ' + l);
  });
  if (!bad) console.log(`  ok   validate: ${files.length} file(s)`);
}

// -- figures: geometry diagram only on a geometry course -----------------------------------
if (!geometrySubject(B)) {
  for (const { path: p, json } of jsons) if (json.diagram) WARN(`${path.basename(p)}: ${DIAGRAM_HINT}`);
}

// -- approval: a parent approved over a draft child (a slide was added after approval) ------
{
  const st = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')).authoring?.status; } catch { return null; } };
  if (st(lessonFile) === 'human-approved') {
    const drafts = jsons.filter((f) => st(f.path) === 'ai-draft').length;
    if (drafts) WARN(`lesson file is human-approved but ${drafts} of its items are ai-draft: set the lesson file back to ai-draft (a slide was added after approval)`);
  }
}

// -- outline slide count ------------------------------------------------------------------
const outline = path.join(workDirOfLesson(B, L), 'OUTLINE.md');
if (fs.existsSync(outline) && fs.existsSync(lessonFile)) {
  const m = fs.readFileSync(outline, 'utf8').match(new RegExp(`^- ${L}\\s+[-\\u2014]\\s+.+?\\((\\d+) slides?\\)`, 'm'));
  let lesson = null;
  try { lesson = JSON.parse(fs.readFileSync(lessonFile, 'utf8')); } catch { /* validator reports it */ }
  const refs = lesson ? (lesson.slides || lesson.blocks || lesson.items || []).map((b) => b.blockRef || '') : [];
  const games = jsons.filter((f) => f.json.type === 'mini-game@1').length;
  const n = refs.filter((r) => !/(^|\/)questions\//.test(r)).length;
  // A game slide is two blocks (a briefing content-block, then the mini-game@1: the game block carries no prose).
  if (m && lesson && n && Number(m[1]) + games !== n) WARN(`${rel(B, outline)} plans ${m[1]} slides for ${L}; the lesson has ${n} non-question blocks (${games} game briefing(s) expected on top of the plan) - fine only if the log says why`);
}

// -- arcade slides the outline plans for this lesson ----------------------------------------
if (fs.existsSync(outline) && fs.existsSync(lessonFile)) {
  const ot = fs.readFileSync(outline, 'utf8');
  const i = ot.search(new RegExp(`^## ${L}\\b`, 'm'));
  const rest = i < 0 ? '' : ot.slice(i + 3);
  const sec = rest.slice(0, (rest.search(/^## /m) + 1 || rest.length + 1) - 1);
  let refs = '';
  try { refs = fs.readFileSync(lessonFile, 'utf8'); } catch { /* validator reports it */ }
  for (const m of sec.matchAll(/^- \*\*(a\d+)\*\*/gm)) {
    const id = `blk-${L.toLowerCase()}-${m[1]}`;
    if (!fs.existsSync(path.join(B, 'blocks', L, `${id}.json`))) FAIL(`outline plans arcade slide ${m[1]} but ${id}.json does not exist (Stage 2: briefs/stage2-lesson.md step 0)`);
    else if (!refs.includes(`${id}.json`)) FAIL(`${id} exists but lessons/les-${lessonSlug(L)}.json does not reference it`);
  }
}

// -- scenes and stubs -----------------------------------------------------------------------
const simDir = path.join(B, 'simulations', L);
const srcs = new Map();
for (const { path: p, json } of jsons) {
  const src = json.simulation?.src || (/^(poe-observe-sim|mini-game)@/.test(json.type || '') ? json.src : null);
  if (src && !/^https?:/.test(src)) srcs.set(src.replace(/^\.\//, ''), p);
}
for (const { path: p, json } of jsons) {
  const sp = json.simulation?.src && path.join(B, json.simulation.src);
  if (json.type === 'content-block@1' && sp && fs.existsSync(sp) && /extends\s+withChallenge\(/.test(fs.readFileSync(sp, 'utf8'))) {
    FAIL(`${path.basename(p)}: a content-block@1 holding a challenge scene - make it a mini-game@1 block with top-level "src" (SKILL.md)`);
  }
}
for (const [src, p] of srcs) {
  const abs = path.join(B, src);
  if (!fs.existsSync(abs) && !fs.existsSync(abs.replace(/\.js$/, '.stub.md'))) FAIL(`${path.basename(p)}: simulation.src ${src} has neither a scene file nor a stub`);
}

const REQUIRED_ARCADE = ['Save path', 'Attached by', 'Beats', 'Base class', 'Skin', 'Deck', 'Taught by', 'Rounds', 'Reuse'];
const ARCADE_SKINS = { Sort: ['sky', 'belt'], Route: ['road', 'rail'], Match: ['bubbles', 'range'], Order: ['stack', 'train'], Judge: ['cards', 'doors'] };
const REQUIRED = ['Save path', 'Attached by', 'Beats', 'Base class', 'Hero', 'Dials', 'Run shows', 'Note card', 'Must get right', 'Not yet taught', 'Reuse'];
const stubs = fs.existsSync(simDir) ? fs.readdirSync(simDir).filter((f) => f.endsWith('.stub.md')).sort().map((f) => path.join(simDir, f)) : [];
// A scene another lesson owns, mounted here: its stub must now declare this mount too
// (per-slide beat lists, Beat maps / Same beats, or a variant file) - the gate runs on it.
const foreign = [];
for (const src of srcs.keys()) {
  const stub = path.join(B, src.replace(/\.js$/, '.stub.md'));
  if (fs.existsSync(stub) && !stubs.includes(stub) && path.dirname(stub) !== simDir) foreign.push(stub);
}
const legacy = [];
const verbatimFix = args.includes('--fix-verbatim');
for (const p of [...stubs, ...foreign]) {
  const f = path.basename(p);
  const isForeign = foreign.includes(p);
  let text = fs.readFileSync(p, 'utf8');
  const scene = p.replace(/\.stub\.md$/, '.js');
  const tag = (isForeign ? `${path.basename(path.dirname(p))}/` : '') + f.replace('.stub.md', '');
  // A field's value is on the same line, or (stub-format.md) on the bullet / indented lines right below it.
  const line = (k) => {
    const m = text.match(new RegExp(`^${k}:[ \\t]*(.*)$`, 'm'));
    if (!m) return undefined;
    if (m[1].trim()) return m[1];
    const rest = text.slice(m.index + m[0].length).split('\n').slice(1);
    const got = [];
    for (const l of rest) { if (/^\s*([-*]|\d+[.)])\s+\S/.test(l) || /^[ \t]+\S/.test(l)) got.push(l.trim()); else break; }
    return got.length ? got.join(' ') : m[1];
  };
  // A stub from before the kit's stub format (no Beats: header) whose scene is already built is spent: its
  // scene is judged by check-scene (real beat counts, design note), not by this format gate.
  if (fs.existsSync(scene) && line('Beats') == null) { legacy.push(tag); continue; }
  const arcadeM = (line('Base class') || '').match(/^Arcade(\w+)Scene/);
  const arcade = !!arcadeM;
  const missing = (arcade ? REQUIRED_ARCADE : REQUIRED).filter((k) => line(k) == null || !line(k).trim());
  if (missing.length) FAIL(`${tag}: stub is missing ${missing.join(', ')} (briefs/reference/stub-format.md)`);
  const save = line('Save path');
  if (save && save.trim() !== rel(B, scene)) FAIL(`${tag}: Save path "${save}" should be ${rel(B, scene)}`);
  const att = attachersOf(B, scene);
  if (isForeign && !att.some((a) => inLesson(a.path))) continue;
  if (!att.length) FAIL(`${tag}: no block or question has simulation.src = ${rel(B, scene)}`);
  const ids = [...(line('Attached by') || '').matchAll(/((?:blk|q|exp)-[\w-]+)/g)].map((m) => m[1]);
  for (const id of ids) if (!att.some((a) => a.id === id)) FAIL(`${tag}: Attached by names ${id}, which does not attach this scene`);
  for (const a of att) if (!ids.includes(a.id)) WARN(`${tag}: ${a.id} attaches this scene but is not in Attached by`);
  const beatSlidesAll = att.filter((a) => a.beats != null);
  const real = [...new Set(att.map((a) => a.beats).filter((n) => n != null))];
  const said = [...(line('Beats') || '').matchAll(/\d+/g)].map(Number);
  if (real.length && !real.every((n) => said.includes(n))) FAIL(`${tag}: Beats says ${line('Beats')}; the attaching slide(s) have ${real.join(' / ')} (run tools/sim-test/scene-info.mjs)`);
  const game = att.length > 0 && att.every((a) => a.role === 'game');
  if (arcade) {
    const skins = ARCADE_SKINS[arcadeM[1]];
    if (!skins) FAIL(`${tag}: unknown archetype Arcade${arcadeM[1]}Scene (Sort, Route, Match, Order, Judge)`);
    else if (!skins.includes((line('Skin') || '').trim())) FAIL(`${tag}: Arcade${arcadeM[1]}Scene skins are ${skins.join(' / ')}, not "${line('Skin')}"`);
    if (!/^## Play\s*$/m.test(text)) FAIL(`${tag}: an arcade stub needs a "## Play" section (items, mix-ups and myths, the key for each)`);
    if (beatSlidesAll.length > 1) WARN(`${tag}: an arcade scene is normally on one slide; ${beatSlidesAll.length} attach it`);
  } else if (game) {
    if (!/^## Play\s*$/m.test(text)) FAIL(`${tag}: a mini-game stub needs a "## Play" section (objective, moves, checkObjective, why it is tie level L2)`);
    if (!/withChallenge|DomSimulation|SimScene/.test(line('Base class') || '')) WARN(`${tag}: Base class for a game is usually DomSimulation via withChallenge`);
  } else {
    const perBeat = (text.split(/^## Per beat\s*$/m)[1] || '').split(/^## /m)[0];
    const bullets = (perBeat.match(/^- beat \d+/gm) || []).length;
    const beatSlides = att.filter((a) => a.beats != null);
    if (!/^## Per beat\s*$/m.test(text)) FAIL(`${tag}: no "## Per beat" section`);
    else if (beatSlides.length > 1) {
      // One scene file on several slides: the scene cannot tell which slide mounted
      // it, only the beat count. Make the stub say how each slide is served.
      const per = (id) => { const sec = (perBeat.split(new RegExp(`^### ${id}\\s*$`, 'm'))[1] || '').split(/^### /m)[0]; return sec ? (sec.match(/^- beat \d+/gm) || []).length : null; };
      for (const a of beatSlides) {
        const n = per(a.id);
        if (n == null) FAIL(`${tag}: attached to ${beatSlides.length} slides - give each its own "### ${a.id}" list under "## Per beat" (${a.beats} bullet(s))`);
        else if (n !== a.beats) FAIL(`${tag}: "### ${a.id}" has ${n} beat bullet(s); that slide has ${a.beats}`);
      }
      if (real.length > 1) {
        const bm = line('Beat maps') || '';
        const pairs = [...bm.matchAll(/(\d+)\s*->\s*((?:blk|q|exp)-[\w-]+)/g)].map((m) => ({ n: Number(m[1]), id: m[2] }));
        if (!bm) FAIL(`${tag}: slides with different beat counts (${beatSlides.map((a) => `${a.id}: ${a.beats}`).join(', ')}) - add "Beat maps: ${beatSlides.map((a) => `${a.beats} -> ${a.id}`).join(', ')}" (the scene declares static BEAT_MAPS keyed by these counts) or split it into one scene per slide`);
        else for (const a of beatSlides) if (!pairs.some((x) => x.n === a.beats && x.id === a.id)) FAIL(`${tag}: Beat maps must list "${a.beats} -> ${a.id}"`);
        const counts = beatSlides.map((a) => a.beats);
        const dup = counts.filter((n, i) => counts.indexOf(n) !== i);
        if (dup.length) FAIL(`${tag}: two slides share ${[...new Set(dup)].join(', ')} beats but others differ - a count cannot tell them apart; split into one scene per slide`);
      } else if (!/^Same beats on all slides:\s*yes/mi.test(text)) {
        FAIL(`${tag}: attached to ${beatSlides.length} slides with ${real[0]} beats each - the scene cannot tell them apart. If they progress identically add "Same beats on all slides: yes"; otherwise split into one scene per slide (a thin variant sharing a helper)`);
      }
    } else if (real.length && !real.includes(bullets)) FAIL(`${tag}: ${bullets} "- beat N:" bullet(s) under Per beat; the slide has ${real.join(' / ')} beat(s)`);
  }
  if (VISUAL && !arcade && stubDecoration(line('Dials'), line('Run shows'))) WARN(`${tag}: decoration? Dials name no learner action beyond tap-to-open and nothing changes (Run shows: none) - give the learner a move that changes a quantity, or make the slide Text only (plain CARD 13, docs/pedagogy.md "Earn every scene")`);
  if (!/^## Verbatim slide markdown\s*$/m.test(text)) FAIL(`${tag}: no "## Verbatim slide markdown" section`);
  const last = text.trim().split('\n').pop();
  if (!isForeign) {
    // Each "### <block id>" fenced copy must be byte-exact with that block's prose file.
    const vsec = text.split(/^## Verbatim slide markdown\s*$/m)[1] || '';
    let changed = false;
    for (const a of att.filter((x) => x.beats != null && inLesson(x.path))) {   // this lesson's own mounts
      const j = jsons.find((q) => q.path === a.path)?.json;
      const md = j ? markdownOf(B, j) : '';
      const re = new RegExp(`(^### ${a.id}\\s*\\n\`\`\`markdown\\n)([\\s\\S]*?)(\\n\`\`\`)`, 'm');
      const m = vsec.match(re);
      if (!m) {
        if (verbatimFix) { text = text.replace(/(## Verbatim slide markdown\s*\n)/, `$1### ${a.id}\n\`\`\`markdown\n${md.replace(/\s+$/, '')}\n\`\`\`\n`); changed = true; }
        else FAIL(`${tag}: no verbatim copy of ${a.id} under "## Verbatim slide markdown" (--fix-verbatim writes it)`);
      } else if (m[2].replace(/\s+$/, '') !== md.replace(/\s+$/, '')) {
        if (verbatimFix) { text = text.replace(m[0], () => m[1] + md.replace(/\s+$/, '') + m[3]); changed = true; }
        else FAIL(`${tag}: the verbatim copy of ${a.id} differs from its prose file (edited since? --fix-verbatim re-copies it)`);
      }
    }
    if (changed) { fs.writeFileSync(p, text); console.log(`  fixed verbatim copies in ${tag}`); }
  }
  if (!/^Shared helper: (none|\S+\.js)$/.test(last)) FAIL(`${tag}: the last line must be "Shared helper: <file>.js" or "Shared helper: none"`);
}
if (legacy.length) WARN(`${legacy.length} pre-kit stub(s) of already built scenes, format not enforced (judge the scenes with check-scene): ${legacy.slice(0, 4).join(', ')}${legacy.length > 4 ? ', ...' : ''}`);
console.log(`  ${stubs.length} stub(s), ${srcs.size} simulation src(s) checked`);
console.log(`\n${fails ? 'FAIL' : 'PASS'} - ${fails} fail(s), ${warns} warning(s)`);
process.exit(fails ? 1 : 0);
