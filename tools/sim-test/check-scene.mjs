#!/usr/bin/env node
// check-scene - every gate a scene must pass, in one command, terse output.
//
//   node tools/sim-test/check-scene.mjs <target> [--bundle <id|dir>] [--no-browser] [--no-probes] [--verbose] [--look id]
//   --look <id>  passed to the browser tools (shoot, motion-probe, sim-layout, webgl-probe); default each uses the bundle's look.
//
// <target>: a scene (.js/.stub.md/.design.md, or "L02/MyScene" with --bundle) or a
// lesson folder (every scene with a stub or design note there, plus lint of its
// helper modules). Beat counts come from the attaching slides (scene-info).
//
//   all .js      ident-lint (parse, undefined names, const reassignment, bad imports,
//                duplicate/clashing members, this.x() with no x)
//   each scene   base-class field/method collisions, CONTINUOUS rules, crypto.*,
//                ARIA_LABEL, one export; sim-test sanity + draw at every real beat
//                count; beat-check per attaching slide (BEAT_MAPS accepted);
//   canvas       operability-probe (WARN: a beat that draws what the last beat drew; a visible
//                control that leaves the picture unchanged; an undrawable option);
//                freeze probe (model still moving when the loop parked?) and
//                resume probe (beat j differs with how long earlier beats were
//                watched = a leak); real-browser text report via shoot --report-only
//                (overlap / off-canvas FAIL; small / contrast / empty centre WARN);
//                motion-probe (real browser, fake clock: dead beat, pop, mid-motion text and
//                resume-in-pixels WARN; a repaint that differs at the same t FAIL)
//   webgl        webgl-probe (parks per beat, resume, resize/theme/context repaint) and
//                the browser report (screenshot pixels + HTML label text)
//   DOM          sim-lint + sim-layout
//   maps         FAIL on world-atlas 'countries' (de facto borders: illegal for India);
//                WARN on India drawn without the Survey of India credit, and on > 20
//                lon/lat pairs typed into a scene (use SimGeo.loadLayer)
// The last line per scene lists what ran and SKIPPED: what did not (a PASS with
// skips is not a verified scene).
// FAIL must be fixed. WARN must be read: fix it or say why in one line in the design note.
// `note` lines are advisory (size, style scales, headless guesses): never counted, need no answer.
// A deliberate resume difference: add `Resume-ignore: <regex>` to the design note.
// The headless draw check's legibility guesses are dropped when the browser
// report runs (real fonts win); with --no-browser they show as WARN.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseArgs } from './lib/args.mjs';
import { getDeclaredBeatCount } from '../beat-check/parseBeatStepMap.mjs';
import { runCounter } from './lib/domsteps.mjs';
import { scratchFor, KIT_ROOT, KIT_SIMS, resolveHelper, bundleFromArg, resolveTarget, describeMiss, timeBoxLine, scenesInFolder, attachersOf, sceneKindOf, parseStub, designStatus, stripComments, rel } from './lib/bundle.mjs';
import { parseFile, firstClass, classMembers, inheritedNames, moduleExports } from './lib/ast.mjs';
import { unusedRecipes } from './lib/kit-use.mjs';
import { contrastLint } from './contrast-lint.mjs';
import { sceneProfile } from './lib/profile.mjs';

const USAGE = 'node tools/sim-test/check-scene.mjs <L0N/Scene | Scene | path | lesson folder L0N> [--bundle <id|dir>] [--no-browser] [--no-probes] [--verbose] [--look id]'; // also --no-count (tool-made call, not counted), --more (operator: run past the budget)
const A = parseArgs(process.argv.slice(2), { tool: 'check-scene', file: import.meta.url, usage: USAGE, val: ['bundle', 'look'], bool: ['no-browser', 'no-probes', 'verbose', 'more', 'no-count'] });
const val = (k) => A.val(k.replace(/^--/, ''));
const has = (k) => A.has(k.replace(/^--/, ''));
const target = A.pos[0];
if (!target) { console.error(`usage: ${USAGE}`); process.exit(2); }
const bundleDir = bundleFromArg(val('--bundle'));
const t = resolveTarget(target, bundleDir);
if (!t) { console.error(describeMiss(target, bundleDir)); process.exit(2); }
const B = t.bundle;
const verbose = has('--verbose');
const TOOLS = path.join(KIT_ROOT, 'tools');
const lookArg = val('--look') ? ['--look', val('--look')] : [];

const run = (argv, env = {}) => {
  const r = spawnSync(process.execPath, argv, { cwd: KIT_ROOT, encoding: 'utf8', maxBuffer: 64 << 20, timeout: 900000, env: { ...process.env, ...env } });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
};
const noise = (l) => !l.trim() || /^ok:|SimTheme|ExperimentalWarning|--import|trace-warnings|^log: /.test(l);

let fails = 0, warns = 0;
const FAIL = (s) => { fails++; console.log('  FAIL ' + s); };
const _said = new Set();   // the sanity and draw runs (and each mount) see the same findings: say each once
const WARN = (s) => { const k = 'W' + s; if (_said.has(k)) return; _said.add(k); warns++; console.log('  WARN ' + s); };
// Advisory: printed, never counted, never needs an answer (size, style scales, headless guesses).
const NOTE = (s) => { const k = 'N' + s; if (_said.has(k)) return; _said.add(k); console.log('  note ' + s); };
const OK = (s) => { if (verbose) console.log('  ok   ' + s); };
const done = [];

const scenes = t.kind === 'folder' ? scenesInFolder(t.dir) : [t.file];
const jsFiles = t.kind === 'folder'
  ? fs.readdirSync(t.dir).filter((f) => f.endsWith('.js')).map((f) => path.join(t.dir, f))
  : [t.file, ...helperOf(t.file)];

function helperOf(file) {
  const stub = file.replace(/\.js$/, '.stub.md');
  if (!fs.existsSync(stub)) return [];
  const h = parseStub(fs.readFileSync(stub, 'utf8')).helper;
  const p = h && !/^none$/i.test(h) ? resolveHelper(stub, h) : null;
  return p && fs.existsSync(p) ? [p] : [];
}

console.log(`# ${rel(KIT_ROOT, t.kind === 'folder' ? t.dir : t.file)}: ${scenes.length} scene(s), ${jsFiles.length} js file(s)`);
// Budget of FULL runs per scene and pass (scene-pass start resets it): the 4th is refused. check-quick (--no-browser) and
// tool-made calls (--no-count) are not counted. --more is the operator's override, not for an agent.
if (t.kind === 'scene' && !has('--no-browser') && !has('--no-count')) {
  const rc = runCounter(path.join(scratchFor(t.file), `${path.basename(t.file, '.js')}.check-runs`), { cap: 3, more: has('--more') });
  if (rc.stop) {
    console.log(`STOP: ${rc.n - 1} full check runs already used on this scene in this pass. Do not run it again: write what still fails under open: in the design note (one line per finding) and close the pass.`);
    process.exit(1);
  }
  if (rc.n >= 2) console.log(`  note: full check run ${rc.n} of 3 on this scene in this pass; fix everything found in one batch before the next run`);
}

// -- every .js: ident-lint + ASCII ---------------------------------------------------
{
  const existing = jsFiles.filter((f) => fs.existsSync(f));
  if (existing.length) {
    const r = run([path.join(TOOLS, 'sim-test', 'ident-lint.mjs'), ...existing, '--quiet']);
    const errs = r.out.split('\n').filter((l) => /^\s+ERROR/.test(l));
    const unused = r.out.split('\n').filter((l) => /unused-import/.test(l));
    const otherW = r.out.split('\n').filter((l) => /^\s+WARN/.test(l) && !/unused-import/.test(l));
    let cur = '';
    for (const l of r.out.split('\n')) {
      if (/^(FAIL|warn) /.test(l)) cur = path.basename(l.slice(5));
      else if (/^\s+ERROR/.test(l)) FAIL(`${cur}: ${l.trim().replace(/^ERROR /, '')}`);
      else if (/^\s+WARN/.test(l) && !/unused-import/.test(l)) WARN(`${cur}: ${l.trim().replace(/^WARN /, '')}`);
    }
    if (unused.length) WARN(`${unused.length} unused import(s): ${unused.map((l) => l.match(/'([^']+)'/)?.[1]).join(', ')}`);
    if (!errs.length) done.push('ident-lint');
    void otherW;
  }
}

// -- scenes ----------------------------------------------------------------------------
const ENGINE_FIELDS = ['_running', '_rafId', '_lastTs', '_hasStarted', '_animateUntil', '_dwellTimerId', '_visibilityHandler', '_intersectionObserver', '_themeHandler', '_canvas', '_ctx', '_wb'];
const ENGINE_METHODS = ['_loop', '_wrapAnimateHooks', '_onVisibilityChange', 'animateFor', 'startDwellTimer', 'clearDwellTimer', 'start', 'stop', 'step', 'pause', 'resume'];
const SIMSCENE_OWNED = ['_k', '_guard', '_tick', '_drawInitialFrame', '_reloadColors', 'colors', 'beatCount', 'stage', 'age', 'clock', 'after', 'celebrate', 'oops', 'shake', 'flash', 'floatText', 'onBeatChange'];
const HOST_SET = new Set(['requestUiUpdate', 'allowResume', 'mode']);

for (const file of scenes) {
  _said.clear();
  const name = path.basename(file, '.js');
  console.log(`\n## ${name}`);
  if (!fs.existsSync(file)) { FAIL('scene file not written yet'); continue; }
  const counts0 = done.length;
  const src = fs.readFileSync(file, 'utf8');
  const code = stripComments(src);
  const { kind, chain } = sceneKindOf(file);
  const isDom = kind === 'dom';
  const designP = file.replace(/\.js$/, '.design.md');
  const design = fs.existsSync(designP) ? fs.readFileSync(designP, 'utf8') : '';
  const isArcade = chain.includes('ArcadeScene');
  // A handover that never wrote draw() renders a blank scene (SimScene's own draw is empty); a sanity pass must not inherit that.
  if (kind === 'simscene' && chain[1] === 'SimScene' && !/^\s*(?:static\s+)?(?:draw|paint)\s*\(/m.test(code)) FAIL('no draw() in a SimScene subclass: the scene paints nothing. Write draw(ctx, c) before handing over.');
  const noteKB = Buffer.byteLength(design) / 1024;
  { const tb = timeBoxLine(designP); if (tb) console.log(`  ${tb}`); }
  if (!isArcade && noteKB > 12) NOTE(`design note is ${noteKB.toFixed(1)} KB (over 12). Advisory: leave it; do not trim it, re-run this check to see its size, or explain it.`);
  const _started = Date.parse((design.match(/^Started:[ \t]*(\S+)/m) || [])[1] || '');
  const _oldNote = _started && (Date.now() - _started) / 60000 >= 40;   // a fresh one-run (arcade) note has no Progress yet: not stale
  if (design && (/^Status:[ \t]*build-pending\b/mi.test(design) || (/^Status:[ \t]*building\b/mi.test(design) && _oldNote)) && !/^- /m.test((design.split(/^## Progress[^\n]*\n/m)[1] || '').split(/^## /m)[0])) WARN('design note has no ## Progress lines (a stale note from a dead run?): run scene-pass.mjs ... progress "<what exists>" for each step already done, APPEND any missing sections (Layout, Beats, Numbers, Tests to run); do not rewrite the note');
  if (!isArcade && fs.existsSync(file.replace(/\.js$/, '.stub.md')) && !design) WARN(`no design note - write ${name}.design.md before code (briefs/stage3-simulation.md)`);

  // stub Recipes: line (optional, per beat, advisory): a recipe the stub names but the scene never uses
  { const stubR = file.replace(/\.js$/, '.stub.md');
    if (fs.existsSync(stubR)) {
      const missing = unusedRecipes(fs.readFileSync(stubR, 'utf8').split(/^## Verbatim slide markdown/m)[0], code, path.join(KIT_SIMS, 'base', 'kit'));
      if (missing.length) WARN(`stub Recipes: names ${missing.join(', ')} but the scene never uses ${missing.length > 1 ? 'them' : 'it'} (advisory: use it, or say in the design note why the beat needs no recipe)`);
    } }

  // kit parts: a hand-written copy of something the kit already has (advisory notes, never counted)
  if (!isArcade) {
    const PARTS = [
      [/\b(?:function\s+_?wrapText|_wrapText\s*\()/, 'wraps text by hand: SimLook wrapText / fitText / captionBar (briefs/reference/kit-parts.md)'],
      [/\b(?:const|function)\s+(?:clamp01|clamp|lerp|mix|inkOn|rr|roundRectPath|mulberry32)\b/, 'declares a helper the kit exports (clamp, lerp, mix, inkOn, rr, mulberry32): import it from SimLook'],
      [/\b(?:function\s+|_)(?:draw)?(?:force|vector)Arrow\w*\s*\(/i, 'draws arrows by hand: SimLook vectorArrow'],
      [/\b(?:drawNumberLine|_?drawNumLine|drawAxisTicks)\b/, 'draws a number line by hand: SimNumberLineSpec + SimNumberLineCanvas'],
      [/\b(?:drawBarChart|drawChartAxes|_?drawAxes)\b/, 'draws chart axes or bars by hand: SimChartSpec + SimChartCanvas'],
      [/(?:\bconst\s+HIT\s*=|\bhitRadius\b|\b_?drag(?:ging)?Handle\b)/, 'hand-rolls a drag grab radius: SimDrag dragHandle'],
      [/\b(?:drawCart|drawRamp|drawPulley|drawMassBlock|drawSpringBalance)\b/, 'draws physics apparatus by hand: SimProps (propRig + drawCart / drawRamp / drawPulley / drawSpringBalance)'],
      [/\b(?:function\s+|_)(?:draw|paint)?(?:Person|People|Figure|StickFigure|Stickman|Human|Mp|Voter|Student|Teacher|Worker|Farmer|Crowd|Chibi\w*)\s*\(/i, 'draws people by hand: SimFigure figureFor / drawFigure / drawFigureRow / drawCrowd (seated: pose sit + SimProps drawChair / drawDesk)', /SimFigure\.js/],
      [/\b(?:function\s+|_)(?:draw|paint)?(?:Cow|Goat|Sheep|Dog|Cat|Deer|Tiger|Elephant|Animal|Quadruped|Cattle|Herd)\s*\(/i, 'draws a four-legged animal by hand: SimAnimal drawAnimal (fish, frog, bird, snail, insect: SimIcons)', /SimAnimal\.js/],
    ];
    // A third entry: skip the note when the scene already imports the kit part (a wrapper around it is fine).
    for (const [re, msg, unless] of PARTS) if (re.test(code) && !(unless && unless.test(src))) NOTE(`kit part: ${msg}`);
  }

  // collisions with base-class internals
  const { ast } = parseFile(file);
  const cls = ast ? firstClass(ast) : null;
  if (cls) {
    const m = classMembers(cls);
    const inh = inheritedNames(file, cls, ast);
    const direct = chain.find((c) => !/^(ChallengeScene|BeatScene)$/.test(c)) ?? chain[0];   // a mixin is not the base that owns the loop
    for (const f of m.assigned) {
      if (HOST_SET.has(f)) continue;
      if (ENGINE_FIELDS.includes(f) || (kind === 'simscene' && SIMSCENE_OWNED.includes(f)) || (f.startsWith('_') && inh.kitNames.has(f) && !m.methods.has(f))) {
        FAIL(`this.${f} = ... collides with a base-class field (${direct} chain) - rename it`);
      }
    }
    for (const [meth] of m.methods) {
      if (ENGINE_METHODS.includes(meth)) FAIL(`defines ${meth}(), a base-class internal - rename it`);
      else if (meth === '_tick' && !['CanvasSimulation', 'WebGLSimulation', 'DomSimulation'].includes(direct)) FAIL(`defines _tick() but extends ${direct}, which owns the frame loop - use its hooks (update/draw)`);
      else if (kind === 'simscene' && SIMSCENE_OWNED.includes(meth)) FAIL(`defines ${meth}(), owned by SimScene - use enter/update/draw/busy/pointer* instead${meth === 'onBeatChange' ? '; per-beat change = its own stage per beat in BEAT_STEP_MAP + a stage hook (enter(stage), or the helper hook such as _spreadTarget)' : ''}`);
    }
  }
  const exp = moduleExports(file).exports;
  if (exp.length > 1) WARN(`exports ${exp.length} things (${exp.map((e) => e.name).join(', ')}) - a scene file exports only its class; constants go in a helper`);
  if (/\bcrypto\./.test(code)) FAIL('uses crypto.* - undefined over plain HTTP; use Math.random() or mulberry32');
  // maps: India's border only from the Survey of India layer (vendor/geo/SOURCES.md)
  if (/loadWorld\(\s*['"]countries['"]|countries-110m/.test(code)) FAIL(`draws world-atlas 'countries' borders (de facto, not Survey of India: illegal for any map showing India) - use loadWorld('land') and SimGeo.loadLayer('india')`);
  if (/loadLayer\(\s*['"]india['"]|india:\s*true|loadGlobeData\(/.test(code) && !/Survey of India|drawIndia\(/.test(src)) WARN("shows India's border but no 'Boundary of India: Survey of India' credit on screen (drawIndia adds it; a GeoScene uses this.hud('br', ...))");
  const pairs = (code.match(/\[\s*-?\d{1,3}(?:\.\d+)?\s*,\s*-?\d{1,2}(?:\.\d+)?\s*\]/g) || []).length;
  if (pairs > 20 && /SimGeo|GeoMap|GeoTerrain/.test(code)) WARN(`${pairs} [lon, lat] pairs typed into the scene - hand-typed geography drifts from real data; use SimGeo.loadLayer (plates, quakes, volcanoes, rivers, india, elevation)`);
  // Round latch: host Check calls evaluate() -> checkObjective(); a multi-round game that judges only the current round pays XP after round 1.
  if (/withChallenge\s*\(/.test(code) && /\bcheckObjective\s*\(/.test(code)) {
    const bodyOf = (m) => { const i = code.search(new RegExp(`(?:^|\\n)\\s*(?:get\\s+)?${m}\\s*\\([^)]*\\)\\s*\\{`)); if (i < 0) return ''; const o = code.indexOf('{', code.indexOf(')', i)); let d = 0, j = o; for (; j < code.length; j++) { if (code[j] === '{') d++; else if (code[j] === '}' && --d === 0) break; } return code.slice(o, j + 1); };
    const co = bodyOf('checkObjective');
    const hops = [...co.matchAll(/this\.(_?[A-Za-z]\w*)\s*\(/g)].map((m) => m[1]).filter((n) => n !== 'checkObjective').slice(0, 6).map(bodyOf).join('\n');
    const judged = co + '\n' + hops;
    const rounds = /\b(?:ROUNDS|LEVELS|STATIONS|CASES|PUZZLES|ROUND_COUNT|LEVEL_COUNT)\b/.test(code) && /\bthis\._(?:round|levelIdx|levelIndex|level|roundIdx|caseIdx|stationIdx|key)\s*(?:\+=|=(?!=)|\+\+)/.test(code.replace(/constructor[\s\S]*?\n  \}/, ''));
    // guarded: .every in checkObjective itself, or a cleared-set / count comparison / whole-game target / final-flag ok in it or its helpers
    const guarded = /\.every\s*\(/.test(co) || /allCleared|allWon|allDone|_cleared|_roundsWon|_wins\s*>=|this\._(?:won|finished|complete\w*|allDone)\b(?!\s*\[)|(?:(?<!=)[<>]=?|[!=]==?)\s*(?:ROUNDS|LEVELS|ROUND_COUNT|LEVEL_COUNT)(?:\.length)?\b|\.size\s*(?:[<>]=?|[!=]==?)|\btarget:\s*[A-Z][A-Z0-9_]{2,}\b|\bok:\s*this\._(?:over|finished|solved|won)\b(?![\s\[.(]*[\[.(])|\bif\s*\(\s*this\._(?:solved|finished|won|over)\s*\)\s*return\s*\{\s*ok:\s*true/.test(judged);
    if (rounds && !guarded) WARN('round latch: checkObjective() judges only the current round (reads the round/level index with no all-rounds-cleared guard), so host Check pays XP after round 1; return null (or { ok: false }) until every round is won; see docs/mini-games.md');
  }
  if (!/static\s+ARIA_LABEL/.test(code)) WARN(isArcade ? 'no own static ARIA_LABEL - the archetype default is generic; name the topic' : 'no static ARIA_LABEL');

  // CONTINUOUS (canvas family). Rich profile (docs/visual-profiles.md): ambient motion needs no reason comment.
  const prof = sceneProfile(file, bundleDir);
  const own = (code.match(/static\s+CONTINUOUS\s*=\s*(true|false)/) || [])[1];
  if (!isDom) {
    if (own === 'true') {
      const line = src.split('\n').find((l) => /static\s+CONTINUOUS\s*=\s*true/.test(l)) || '';
      if (prof.profile !== 'rich' && !/\/\/\s*\S/.test(line)) WARN('CONTINUOUS = true without a one-line reason comment on that line');
    } else if (kind === 'simscene') {
      if (/setTimeout\(|setInterval\(/.test(code)) WARN('setTimeout/setInterval in a SimScene - use this.after(seconds, fn) (dropped on a stage change, keeps the loop awake)');
    } else if (kind === 'canvas') {
      if (!chain.includes('StoryScene') && /addEventListener\(\s*['"]pointer/.test(code) && !/animateFor\(/.test(code)) FAIL('pointer handlers must call this.animateFor() (pointer events grant no animation budget)');
      if (!/onBeatChange\s*\(/.test(code) && !chain.some((c) => /Scene$/.test(c))) WARN('no onBeatChange - with CONTINUOUS = false the loop parks after the first frame');
    }
  }

  // attaching slides and their real beat counts
  const att = B ? attachersOf(B, file) : [];
  // Top-level entries of the literal: counts the canonical chain form and the flat one-object-per-beat form alike.
  const declared = getDeclaredBeatCount(src) ?? (src.match(/BEAT_STEP_MAP\s*=\s*\[([\s\S]*?)\]\s*;/)?.[1].match(/\[\s*\{/g) || []).length;
  // A stage hook that can never fire: every BEAT_STEP_MAP step has the same stage idx (the map may be a const defined above the class).
  { let mapSrc = (code.match(/BEAT_STEP_MAP\s*=\s*\[([\s\S]*?)\]\s*;/) || [])[1] || '';
    const ref = /BEAT_STEP_MAP\s*=\s*([A-Za-z_]\w*)\s*;/.exec(code);
    if (ref) mapSrc = (new RegExp(`(?:const|let|var)\\s+${ref[1]}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s*;`).exec(code) || [])[1] || '';
    const idxs = [...mapSrc.matchAll(/idx\s*:\s*(\d+)/g)].map((m) => m[1]);
    const hook = /\benter\s*\(\s*\w+/.test(code) || /\b_\w+\s*\(\s*stage\b/.test(code);
    if (hook && idxs.length > 1 && new Set(idxs).size === 1) WARN(`stage hooks never fire: every BEAT_STEP_MAP step has idx ${idxs[0]}, so the scene stays in one stage for all ${idxs.length} steps - give each beat that must look different its own idx and read it in enter(stage) / the helper's stage hook`); }
  const beatsList = [...new Set(att.map((a) => a.beats).filter((n) => n))];
  if (!beatsList.length) beatsList.push(Math.max(1, declared));
  if (B && !att.length) WARN('no slide or question attaches this scene (simulation.src) - check the path');
  if (beatsList.length > 1) {
    // Several slides, different beat counts: only a map keyed by count lets one
    // file serve them (the scene cannot tell which slide mounted it).
    const mapsSrc = (code.match(/static\s+BEAT_MAPS\s*=\s*\{([\s\S]*?)\};/) || [])[1] || '';
    const keys = new Set([...mapsSrc.matchAll(/(?:^|[,{\s])(\d+)\s*:/g)].map((m) => Number(m[1])));
    const missing = beatsList.filter((n) => !keys.has(n));
    if (missing.length) FAIL(`attached to slides with ${beatsList.join(' / ')} beats (${att.filter((a) => a.beats != null).map((a) => `${a.id}: ${a.beats}`).join(', ')}) but static BEAT_MAPS has no entry for ${missing.join(', ')} - add { ${beatsList.map((n) => `${n}: MAP_${n}`).join(', ')} } (the stub's "Beat maps:" line says which slide is which), or split into one scene per slide`);
  }

  // sim-test sanity + draw
  const seenHard = new Set();
  const browser = !has('--no-browser') && !isDom;
  for (const n of beatsList) {
    for (const mode of ['sanity', 'draw']) {
      const r = run([path.join(TOOLS, 'sim-test', 'run.mjs'), mode, file, `--beats=${n}`]);
      const lines = r.out.split('\n').filter((l) => !noise(l));
      const fl = lines.filter((l) => /^FAIL: /.test(l));
      const legib = lines.filter((l) => /^guess: /.test(l));
      const hard = fl;
      const verdict = lines.find((l) => /^(PASS|FAIL) - /.test(l));
      if (!verdict) FAIL(`sim-test ${mode} (beats=${n}) crashed:\n    ${lines.slice(-10).join('\n    ')}`);
      else if (hard.filter((l) => !seenHard.has(l)).length) {
        const fresh = hard.filter((l) => !seenHard.has(l));
        for (const l of fresh) seenHard.add(l);   // the same finding for a second mount is one problem, not two
        FAIL(`sim-test ${mode} (beats=${n}):\n    ${fresh.slice(0, 8).join('\n    ')}`);
      }
      else if (hard.length) { /* same findings already reported for another mount */ }
      else OK(`sim-test ${mode} beats=${n}`);
      if (legib.length && !browser) NOTE(`sim-test draw legibility (headless guess, beats=${n}): ${legib.length}; the full run with the browser report settles it:\n    ${legib.slice(0, 5).join('\n    ')}`);
      for (const l of lines.filter((x) => /^figure-(warn|fail): /.test(x))) (/^figure-fail/.test(l) ? FAIL : WARN)(l.replace(/^figure-(warn|fail): /, 'figure: '));
      for (const a of lines.filter((l) => /^advisory: /.test(l)).slice(0, 3)) {
        // A hard-coded colour or an undeclared palette token breaks a theme: a real WARN. The rest is style scale advice.
        if (/hardcoded fillStyle|tokenMap names/.test(a)) WARN(`sim-test: ${a.slice(10, 260)}`);
        else if (prof.profile !== 'rich') NOTE(`sim-test style: ${a.slice(10, 220)}`);   // rich relaxes the flat-style scales
      }
    }
  }
  if (!fails || counts0 === done.length) done.push(`sanity+draw x${beatsList.length}`);

  // beat-check per attaching slide
  for (const a of att.filter((x) => x.beats != null && /blocks/.test(x.path))) {
    const r = run([path.join(TOOLS, 'beat-check', 'check.mjs'), a.path]);
    const res = (r.out.match(/(OK - beat counts match|MISMATCH[^\n]*|skip[^\n]*)/) || [])[1] || r.out.trim().split('\n').pop();
    if (/^OK|^skip/.test(res)) OK(`beat-check ${a.id}: ${res}`);
    else if (/MISMATCH/.test(res) && new RegExp(`BEAT_MAPS[\\s\\S]{0,600}\\b${a.beats}\\s*:`).test(code)) OK(`beat-check ${a.id}: ${a.beats} beats via BEAT_MAPS`);
    else FAIL(`beat-check ${a.id} (slide has ${a.beats} beats): ${res}`);
  }
  if (att.length) done.push(`beat-check x${att.filter((x) => x.beats != null).length}`);

  // probes (canvas, comes to rest)
  const cont = own === 'true';
  if (!isDom && kind !== 'webgl' && !has('--no-probes')) {
    if (!cont) for (const n of beatsList) {
      const r = run([path.join(TOOLS, 'sim-test', 'run.mjs'), 'exec', path.join(TOOLS, 'sim-test', 'freeze.mjs'), file, String(n)]);
      const rows = r.out.split('\n').filter((l) => /^ {2}b\d/.test(l));
      if (!rows.length && !/skip/.test(r.out)) { FAIL(`freeze probe crashed:\n    ${r.out.split('\n').filter((l) => !noise(l)).slice(-8).join('\n    ')}`); continue; }
      for (const l of rows.filter((x) => !/ ok$/.test(x))) (/never parks/.test(l) ? WARN : FAIL)(`freeze: ${l.trim().slice(0, 260)}${/FROZE/.test(l) ? ' - cover that run with busy() / animateFor(ms)' : ''}`);
      done.push(`freeze ${rows.length} run(s)`);
    }
    const ign = (design.match(/^Resume-ignore:[ \t]*(.+)$/mi) || [])[1]?.trim();
    if (ign && /\s/.test(ign)) WARN('Resume-ignore: the value has a space, so it is probably a regex followed by a reason: the whole line is read as the regex and matches nothing. Put the regex alone on the line and the reason under ## Checks explained');
    for (const n of beatsList) {
      const r = run([path.join(TOOLS, 'sim-test', 'run.mjs'), 'exec', path.join(TOOLS, 'sim-test', 'resume-probe.mjs'), file, String(n)], ign ? { RESUME_IGNORE: ign } : {});
      const head = r.out.split('\n').find((l) => /^## /.test(l));
      if (!head) { FAIL(`resume probe crashed:\n    ${r.out.split('\n').filter((l) => !noise(l)).slice(-8).join('\n    ')}`); continue; }
      const leaks = new Map(); // diff text -> beats
      for (const l of r.out.split('\n').filter((x) => /LEAK/.test(x))) {
        const m = l.trim().match(/^b(\d+) LEAK \(([^)]*)\): (.*)$/);
        if (!m) continue;
        const key = `${m[2]}: ${m[3].slice(0, 220)}`;
        leaks.set(key, [...(leaks.get(key) || []), m[1]]);
      }
      for (const [k, bs] of leaks) FAIL(`resume LEAK on beat(s) ${bs.join(',')} (${k}) - credit runs to a launch token / use after(), or list the field as Resume-ignore in the design note`);
      const carried = r.out.split('\n').filter((x) => /differs/.test(x));
      if (verbose) for (const l of carried) console.log('  info ' + l.trim().slice(0, 200));
      done.push(/skip/.test(head) ? 'resume skipped' : `resume ${n - 1} beat(s)${carried.length ? ` (${carried.length} learner-carried difference(s), --verbose)` : ''}`);
    }
  }

  // operability: does what the scene offers change what is drawn? (WARN: read it, fix or say why)
  if (!isDom && kind !== 'webgl' && !has('--no-probes')) {
    const n = beatsList[beatsList.length - 1] ?? 1;
    const predicted = att.some((a) => /^poe-predict@/.test(a.type || ''));
    const r = run([path.join(TOOLS, 'sim-test', 'run.mjs'), 'exec', path.join(TOOLS, 'sim-test', 'operability-probe.mjs'), file, String(n), ...(predicted ? ['--predict'] : [])]);
    const head = r.out.split('\n').find((l) => /^## /.test(l));
    if (!head) FAIL(`operability probe crashed:\n    ${r.out.split('\n').filter((l) => !noise(l)).slice(-8).join('\n    ')}`);
    else {
      // DUP-BEAT on a beat the stub itself calls identical / the same panel is expected: a note, not a WARN.
      const stubP = file.replace(/\.js$/, '.stub.md');
      const perBeat = fs.existsSync(stubP) ? ((fs.readFileSync(stubP, 'utf8').split(/^## Per beat[^\n]*\n/m)[1] || '').split(/^## /m)[0]) : '';
      const sameByStub = (b) => new RegExp(`^- beat ${b}:.*\\b(identical|same (panel|picture|view|drawing|scene)|unchanged)\\b`, 'mi').test(perBeat);
      for (const l of r.out.split('\n').filter((x) => /^ {2}b\d+ (DUP-BEAT|NO-EFFECT|UNDRAWABLE|PREDICT-LEAK)/.test(x))) {
        const m = /^ {2}b(\d+) DUP-BEAT/.exec(l);
        if (m && sameByStub(m[1])) NOTE(`operability: ${l.trim().slice(0, 160)} (the stub's Per beat says this beat looks the same: fine)`);
        else WARN(`operability: ${l.trim().slice(0, 200)}`);
      }
      done.push(/skip/.test(head) ? 'operability skipped' : 'operability');
    }
  }

  // WebGL: real-browser probes (Node has no GPU: sanity+draw above checked almost nothing)
  const skipped = [];
  if (kind === 'webgl') {
    skipped.push('Node draw checks (no GPU)');
    if (has('--no-browser') || has('--no-probes')) skipped.push('webgl-probe', 'browser report');
    else for (const n of beatsList) {
      const ign = (design.match(/^Resume-ignore:[ \t]*(.+)$/mi) || [])[1]?.trim();
      const r = run([path.join(TOOLS, 'sim-test', 'webgl-probe.mjs'), file, String(n), ...lookArg], ign ? { RESUME_IGNORE: ign } : {});
      const head = r.out.split('\n').find((l) => /^## /.test(l));
      if (!head) { FAIL(`webgl-probe crashed:\n    ${r.out.split('\n').filter((l) => !noise(l)).slice(-8).join('\n    ')}`); continue; }
      if (/skip/.test(head)) { skipped.push(`webgl-probe (${head.replace(/^## [^:]+: /, '')})`); continue; }
      for (const l of r.out.split('\n').filter((x) => /^FAIL /.test(x))) FAIL(`webgl: ${l.slice(5, 300)}`);
      done.push(`webgl-probe beats=${n}`);
    }
  }

  // real-browser text report (canvas, WebGL and DOM: a DOM scene gets overlap, small, contrast and off-frame text)
  if (browser || (isDom && !has('--no-browser'))) {
    const r = run([path.join(TOOLS, 'sim-test', 'shoot.mjs'), file, '--beats', String(Math.max(...beatsList)), '--report-only', '--settle', '2500', ...lookArg]);
    const issues = r.out.split('\n').filter((l) => /^ {4}\S/.test(l));
    const errs = r.out.split('\n').filter((l) => /^(dark|light): /.test(l));
    if (/needs Playwright/.test(r.out)) WARN('browser report skipped: Playwright not installed');
    else {
      const shotOf = []; let cur = '';
      for (const l of r.out.split('\n')) { if (/^(dark|light) \S/.test(l)) cur = l.split('  ')[0]; else if (/^ {4}\S/.test(l)) shotOf.push([cur, l.trim()]); }
      const empty = shotOf.filter(([, l]) => /^empty centre/.test(l));
      if (empty.length) {
        const pct = empty.map(([, l]) => Number(l.match(/(\d+)%/)[1]));
        WARN(`browser: empty centre on ${empty.length} shot(s) (${empty.map(([sh]) => sh.replace(' ', ' ')).join(', ')}; ${Math.min(...pct)}-${Math.max(...pct)}% of the hero zone is plain backdrop) - advisory only: judge by looking; never add decoration to silence it`);
      }
      const byIssue = new Map();
      for (const [sh, l] of shotOf.filter(([, x]) => !/^empty centre/.test(x))) byIssue.set(l, [...(byIssue.get(l) || []), sh]);
      for (const [l, shs] of byIssue) ((!isDom && /^(overlap|off-canvas)/.test(l)) ? FAIL : WARN)(`browser: ${l} (${[...new Set(shs)].join(', ')})`);
      for (const l of errs) FAIL(`page error: ${l}`);
      done.push('browser text report');
    }
  }

  // motion-probe: the motion between settled frames (canvas only; a real browser, so not with --no-browser)
  if (!isDom && kind !== 'webgl') {
    if (has('--no-probes') || has('--no-browser')) skipped.push('motion-probe');
    else {
      const r = run([path.join(TOOLS, 'sim-test', 'motion-probe.mjs'), file, '--beats', String(Math.max(...beatsList)), ...lookArg]);
      if (/needs Playwright/.test(r.out)) WARN('motion-probe skipped: Playwright not installed');
      else if (!/^motion-probe: \d+ warn/m.test(r.out)) FAIL(`motion-probe crashed:\n    ${r.out.split('\n').filter((l) => !noise(l)).slice(-8).join('\n    ')}`);
      else {
        // page errors are the browser text report's to count
        for (const l of r.out.split('\n')) { const m = /^ {2}(WARN|FAIL) (.*)$/.exec(l); if (m && !/^page error:/.test(m[2])) (m[1] === 'FAIL' ? FAIL : WARN)(`motion: ${m[2].slice(0, 260)}`); }
        done.push('motion-probe');
      }
    }
  }

  // contrast-lint: the palette pairs this scene's c.* keys meet (both themes). The palette is closed, so a
  // weak pair is a note for the kit owner, not the scene. A c.* key no map defines draws nothing: WARN (static,
  // so a loop variable named c can trip it).
  if (!isDom) {
    const cl = contrastLint(file);
    for (const l of cl.fail) WARN(`contrast-lint: ${l} (ignore if c is not the colour table there)`);
    if (cl.warn.length) NOTE(`contrast (palette, not this scene): ${cl.warn.length} pair(s) under WCAG: ${cl.warn.slice(0, 3).map((l) => l.replace(/^.*?: /, '')).join('; ')}${cl.warn.length > 3 ? '; ...' : ''}`);
    done.push('contrast-lint');
  }

  // DOM kit checks
  if (isDom) {
    const lint = run([path.join(TOOLS, 'sim-test', 'sim-lint.mjs'), file]);
    const lintBad = lint.out.split('\n').filter((l) => /ERROR|WARN/i.test(l) && !/scene\(s\):/.test(l));
    if (lint.code !== 0) FAIL(`sim-lint:\n    ${(lintBad.length ? lintBad : lint.out.split('\n').filter((l) => l.trim())).slice(0, 12).join('\n    ')}`);
    else { OK('sim-lint'); for (const l of lintBad) WARN('sim-lint: ' + l.trim()); for (const l of lint.out.split('\n').filter((x) => /^NOTE /.test(x))) NOTE('sim-lint: ' + l.replace(/^NOTE\s+/, '').trim()); }
    if (!has('--no-browser')) for (const n of beatsList) {
      const lay = run([path.join(TOOLS, 'sim-test', 'sim-layout.mjs'), file, '--beats', String(n), '--quiet', '--no-count', ...lookArg]);
      const layBad = lay.out.split('\n').filter((l) => /ERROR|WARN/.test(l) && !/scene\(s\):/.test(l));
      // Stage 3 gate: phone-dock is a FAIL here (OC-07 review), a WARN for every other sim-layout caller. Fix: simulation.fullWidth or a wide portrait layout.
      const dock = layBad.filter((l) => /\bphone-dock\b/.test(l));
      if (dock.length) { FAIL(`sim-layout phone-dock (Stage 3 gate):\n    ${dock.slice(0, 3).join('\n    ')}`); layBad.splice(0, layBad.length, ...layBad.filter((l) => !dock.includes(l))); }
      if (lay.code !== 0) FAIL(`sim-layout beats=${n}:\n    ${(layBad.length ? layBad : lay.out.split('\n').slice(-10)).slice(0, 14).join('\n    ')}`);
      else if (!dock.length) { OK(`sim-layout beats=${n}`); for (const l of layBad) WARN('sim-layout: ' + l.trim()); }
      else for (const l of layBad) WARN('sim-layout: ' + l.trim());
    }
    done.push('sim-lint' + (has('--no-browser') ? '' : ' + sim-layout'));
  }
  if (!browser && !isDom && kind !== 'webgl') skipped.push('browser report');
  if (isDom) skipped.push('freeze and resume probes (n/a: a DOM scene has no frame loop; drive-dom operates it)');
  console.log(`  ran: ${[...new Set(done.splice(0))].join(', ')}; beats ${beatsList.join('/')}; ${kind}${cont ? ', CONTINUOUS=true' : ''}; profile ${prof.profile} (${prof.from}); design note: ${designStatus(designP) || 'none'}`);
  if (skipped.length) console.log(`  SKIPPED: ${skipped.join(', ')}`);
}

console.log(`\n${fails ? 'FAIL' : 'PASS'} - ${fails} fail(s), ${warns} warning(s)`);
process.exit(fails ? 1 : 0);
