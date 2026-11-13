// Shared helpers for the scene tools (scene-info, check-scene, shoot, ...):
// where the kit and a bundle live, which slides attach a scene, each slide's
// REAL beat count (the engine's own splitSteps), stub and design-note fields,
// and a scene's base-class chain. Paths in and out are plain filesystem paths.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { splitSteps } from '../../beat-check/vendor/splitSteps.js';

export const KIT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const KIT_SIMS = path.join(KIT_ROOT, 'simulations-kit', 'src', 'simulations');

// --bundle accepts an id (courses/<id> under the kit or cwd) or a directory.
export function resolveBundle(arg) {
  if (!arg) return null;
  const tries = [path.resolve(arg), path.join(process.cwd(), 'courses', arg), path.join(KIT_ROOT, 'courses', arg)];
  for (const d of tries) {
    if (fs.existsSync(d) && fs.statSync(d).isDirectory()
      && ['blocks', 'lessons', 'simulations', 'OUTLINE.md', 'parts', 'bundle.json', 'source'].some((f) => fs.existsSync(path.join(d, f)))) return d;
  }
  return null;
}

// --bundle <id|dir> for a tool: an unknown bundle ends the run with the list of real ones (it used to be ignored
// silently, and the tool then said "cannot resolve <scene>").
export function bundleFromArg(arg) {
  if (!arg) return null;
  const b = resolveBundle(arg);
  if (b) return b;
  const roots = [path.join(process.cwd(), 'courses'), path.join(KIT_ROOT, 'courses')];
  const ids = [...new Set(roots.filter((r) => fs.existsSync(r)).flatMap((r) => fs.readdirSync(r).filter((d) => resolveBundle(path.join(r, d)))))];
  console.error(`no such bundle "${arg}"${ids.length ? ` (bundles here: ${ids.join(', ')})` : ' (no courses/ folder with a bundle was found)'}`);
  process.exit(2);
}

// The bundle a file lives in: parent of its nearest "simulations" ancestor.
export function bundleOf(file) {
  let d = path.dirname(path.resolve(file));
  for (;;) {
    if (path.basename(d) === 'simulations') return path.dirname(d);
    const up = path.dirname(d);
    if (up === d) return null;
    d = up;
  }
}

// Per-bundle scratch folder for a scene file (build/scratch/<bundle>/): scene names recur across bundles, so flat names collided.
export function scratchFor(file) {
  const b = bundleOf(file);
  const d = path.join(KIT_ROOT, 'build', 'scratch', b ? path.basename(b) : '_');
  fs.mkdirSync(d, { recursive: true });
  return d;
}

// The bundle to use when --bundle is not given: the one under courses/ (cwd, then the kit root), or the
// bundle the cwd is inside. Null when there are several (the caller says "pass --bundle").
export function defaultBundle() {
  const inside = bundleOf(path.join(process.cwd(), 'x'));
  if (inside) return inside;
  for (const root of [path.join(process.cwd(), 'courses'), path.join(KIT_ROOT, 'courses')]) {
    if (!fs.existsSync(root)) continue;
    const ids = fs.readdirSync(root).filter((d) => resolveBundle(path.join(root, d)));
    if (ids.length === 1) return path.join(root, ids[0]);
    if (ids.length > 1) return null;
  }
  return null;
}

// ---- parts (sub-modules) ---------------------------------------------------------------------------
// A big course (several books/volumes) is one bundle split into PARTS. A part is a folder
// parts/<NN>/ holding that part's own OUTLINE.md and FIGURES.md; its lessons are coded
// L<NN>-<module>-<lesson> (e.g. L03-07-01) and its modules are modules/mod-<NN>-*.json. Everything else
// (blocks, questions, lessons, simulations incl. simulations/shared/) stays bundle-wide, so scenes and kits are
// shared across parts. A bundle with no parts/ folder is a plain one-chapter bundle: nothing changes for it.
// Lesson codes: L02 (plain), L03-07-01 (part-module-lesson) or C01 (plain, a closing Part C: sorts after every L).
export const LESSON_ID_SRC = '(?:L\\d\\d(?:-\\d\\d-\\d\\d)?|C\\d\\d)';
export const LESSON_ID_RE = new RegExp(`^${LESSON_ID_SRC}$`);
// The les-<slug>.json name: L02 -> 02, L03-07-01 -> 03-07-01, C01 -> c01.
export const lessonSlug = (id) => (id[0] === 'C' ? id.toLowerCase() : id.slice(1));

export function partsOf(bundleDir) {
  const d = path.join(bundleDir, 'parts');
  if (!fs.existsSync(d)) return [];
  return fs.readdirSync(d).filter((x) => /^\d\d$/.test(x) && fs.statSync(path.join(d, x)).isDirectory()).sort();
}
// "03" for L03-07-01; null for a plain L02.
export const partOfLesson = (id) => (/^L\d\d-\d\d-\d\d$/.test(id) ? id.slice(1, 3) : null);
// Where OUTLINE.md / FIGURES.md for this part live (the bundle dir itself for a plain bundle).
export const workDir = (bundleDir, part) => (part ? path.join(bundleDir, 'parts', part) : bundleDir);
// The working dir that owns a lesson: its part's folder if the bundle has parts, else the bundle.
export function workDirOfLesson(bundleDir, id) {
  const p = partOfLesson(id);
  return p && fs.existsSync(path.join(bundleDir, 'parts', p)) ? path.join(bundleDir, 'parts', p) : bundleDir;
}
// Numeric sort key: L02 -> [2]; L03-07-01 -> [3,7,1]; C01 -> [100,1] (compare with compareLessonIds).
export const lessonKey = (id) => (id[0] === 'C' ? [100, Number(id.slice(1))] : id.slice(1).split('-').map(Number));
export function compareLessonIds(a, b) {
  const x = lessonKey(a), y = lessonKey(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) - (y[i] ?? 0);
  return 0;
}
// --part NN from an argv list (null when absent); a bad value ends the run.
export function partFromArgs(args, bundleDir) {
  const i = args.indexOf('--part');
  if (i < 0) return null;
  const v = (args[i + 1] || '').replace(/^P/i, '').padStart(2, '0');
  const known = bundleDir ? partsOf(bundleDir) : [];
  if (!/^\d\d$/.test(v) || (bundleDir && !known.includes(v))) {
    console.error(`--part ${args[i + 1] || ''}: ${known.length ? `parts here: ${known.join(', ')}` : 'this bundle has no parts/ folder'}`);
    process.exit(2);
  }
  return v;
}
// Lint-style tools: on a multi-part bundle with no --part, run this same script once per part and combine the exit codes.
export function runPerPart(bundleDir, args, scriptUrl, spawnSync) {
  const parts = partsOf(bundleDir);
  if (!parts.length || args.includes('--part')) return false;
  let bad = 0;
  for (const p of parts) {
    console.log(`\n=== part ${p} ===`);
    const r = spawnSync(process.execPath, [fileURLToPath(scriptUrl), ...args, '--part', p], { stdio: 'inherit' });
    if (r.status) bad = 1;
  }
  process.exit(bad);
}

// Every scene name in a bundle: "L02/Scene" for each simulations/<lesson>/<Scene>.stub.md|.js|.design.md.
export function allSceneRefs(bundleDir) {
  const out = [];
  const sims = path.join(bundleDir, 'simulations');
  if (!fs.existsSync(sims)) return out;
  for (const lesson of fs.readdirSync(sims).sort()) {
    const d = path.join(sims, lesson);
    if (!fs.statSync(d).isDirectory()) continue;
    const names = new Set(fs.readdirSync(d).filter((f) => /\.(js|stub\.md|design\.md)$/.test(f)).map(sceneName));
    for (const n of [...names].sort()) out.push(`${lesson}/${n}`);
  }
  return out;
}

const editDistance = (a, b) => {
  const m = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return m[a.length][b.length];
};

// Target forms: a .js / .stub.md / .design.md path, a lesson folder path, or (with a bundle, or the only bundle)
// "L02", "L02/Scene", "Scene", "simulations/L02/Scene.js". A bare Scene name must be unique in the bundle.
export function resolveTarget(target, bundleDir) {
  bundleDir = bundleDir || defaultBundle();
  const cands = [path.resolve(target)];
  if (bundleDir) {
    const t = target.replace(/^\/+/, '');
    cands.push(path.join(bundleDir, t), path.join(bundleDir, 'simulations', t));
  }
  for (const c of cands) {
    for (const p of [c, c + '.js', c + '.stub.md']) {
      if (fs.existsSync(p)) {
        const st = fs.statSync(p);
        if (st.isDirectory()) return { kind: 'folder', dir: p, bundle: bundleDir || bundleOf(path.join(p, 'x')) };
        const js = p.replace(/\.(stub|design)\.md$/, '.js');
        return { kind: 'scene', file: js, dir: path.dirname(js), bundle: bundleDir || bundleOf(js) };
      }
    }
  }
  if (bundleDir && !/[\\/]/.test(target)) {
    const bare = target.replace(/\.(js|stub\.md|design\.md)$/, '');
    const hits = allSceneRefs(bundleDir).filter((r) => r.split('/')[1] === bare);
    if (hits.length === 1) return resolveTarget(hits[0], bundleDir);
  }
  return null;
}

// The message for a target that did not resolve: what was tried, what is accepted, the closest scene names.
export function describeMiss(target, bundleDir) {
  bundleDir = bundleDir || defaultBundle();
  if (!bundleDir) return `cannot resolve "${target}": pass --bundle <id> (several bundles, or none, under courses/), or give a file path`;
  const refs = allSceneRefs(bundleDir);
  const bare = target.replace(/\.(js|stub\.md|design\.md)$/, '').split('/').pop();
  const dup = refs.filter((r) => r.split('/')[1] === bare);
  if (dup.length > 1) return `"${target}" is in several lessons: ${dup.join(', ')} - write L0N/${bare}`;
  const near = refs.map((r) => ({ r, d: Math.min(editDistance(bare.toLowerCase(), r.split('/')[1].toLowerCase()), r.toLowerCase().includes(bare.toLowerCase()) ? 0 : 99) }))
    .filter((x) => x.d <= Math.max(3, Math.floor(bare.length / 4))).sort((a, b) => a.d - b.d).slice(0, 4).map((x) => x.r);
  return `no scene "${target}" in ${path.relative(process.cwd(), bundleDir) || bundleDir}${near.length ? `. Did you mean: ${near.join(', ')}?` : ''} Accepted: L0N/Scene, Scene (if unique), a path to the .js or .stub.md, or a lesson folder (L0N).`;
}

// For tools that take file paths (ident-lint, sim-lint, sim-layout, kit-api): map each argument that is not an
// existing path through the resolver, so `L08/Scene` and `Scene` work everywhere; a miss ends the run with the
// helpful message. A .stub.md or .design.md maps to its scene .js (linting a markdown file "passed" silently before).
export function expandTargets(args, bundleDir) {
  const out = [];
  for (const a of args) {
    if (fs.existsSync(a) && fs.statSync(a).isDirectory()) { out.push(a); continue; }
    if (fs.existsSync(a) && !/\.(stub|design)\.md$/.test(a)) { out.push(a); continue; }
    const t = resolveTarget(a, bundleDir);
    if (!t) { console.error(describeMiss(a, bundleDir)); process.exit(2); }
    out.push(t.kind === 'folder' ? t.dir : t.file);
  }
  return out;
}

// The Stage 3 time box: the design note's `Started: <date -u +%FT%TZ>` line against now. Tools print this so the
// limit is seen at the moments an agent calls them; nobody re-runs `date` on their own.
export function timeBoxLine(designFile, boxMin = 40) {
  try {
    const text = fs.readFileSync(designFile, 'utf8');
    const m = text.match(/^Started:\s*(\S+)/m);
    const t = m && Date.parse(m[1]);
    if (!t) return '';
    // A look pass (look-pending) or a closed scene has its own budget (passes, rounds), not this clock.
    if (/^Status:[ \t]*(look-pending|review-pending|done)\b/mi.test(text)) return '';
    // A note with no Progress lines (a stale or hand-made note), or a Started far past the box (a dead run's stamp that a
    // Resume run inherited), is not this run's clock: no "stop refining".
    const prog = (text.split(/^## Progress[^\n]*\n/m)[1] || '').split(/^## /m)[0];
    if (!/^- /m.test(prog)) return '';
    const min = Math.round((Date.now() - t) / 60000);
    if (min < 0 || min > 24 * 60) return '';
    if (min >= boxMin * 3) return `time: Started is ${min} min old, a dead run's stamp, not this run's clock. Resuming a build: re-stamp it (Started: <date -u +%FT%TZ>); sanity/verify: scene-pass start re-stamps it; look: ignore it.`;
    return min >= boxMin
      ? `TIME ${min} min since Started (box ${boxMin}): stop refining. Build the simplest reading, set Status: look-pending (or done if it reads), write what is left under open:, report.`
      : `time: ${min} min since Started (box ${boxMin}).`;
  } catch { return ''; }
}

export function sceneName(file) { return path.basename(file).replace(/\.(js|stub\.md|design\.md)$/, ''); }
export function rel(from, p) { return path.relative(from, p).split(path.sep).join('/'); }

// Every scene a folder is responsible for: stubs plus scene files that have a
// stub or a design note (a helper module has neither).
export function scenesInFolder(dir) {
  const files = fs.readdirSync(dir);
  const names = new Set();
  for (const f of files) {
    if (f.endsWith('.stub.md') || f.endsWith('.design.md')) names.add(sceneName(f));
  }
  return [...names].sort().map((n) => path.join(dir, n + '.js'));
}

function walkJson(dir, out) {
  if (!fs.existsSync(dir)) return out;
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walkJson(p, out);
    else if (f.endsWith('.json')) out.push(p);
  }
  return out;
}

const jsonCache = new Map();
export function contentFiles(bundleDir) {
  if (jsonCache.has(bundleDir)) return jsonCache.get(bundleDir);
  const out = [];
  for (const sub of ['blocks', 'questions', 'explanations']) {
    for (const p of walkJson(path.join(bundleDir, sub), [])) {
      try { out.push({ path: p, json: JSON.parse(fs.readFileSync(p, 'utf8')) }); } catch { /* validator's job */ }
    }
  }
  jsonCache.set(bundleDir, out);
  return out;
}

export function markdownOf(bundleDir, json) {
  if (json.markdown?.en) return json.markdown.en;
  if (json.markdownRef) {
    const p = path.join(bundleDir, json.markdownRef);
    if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
  }
  return '';
}

// Slides/questions whose simulation (or poe-observe-sim / mini-game top-level src) is this scene.
// A mini-game mounts once with no beats (beats: null).
export function attachersOf(bundleDir, sceneFile) {
  const want = rel(bundleDir, sceneFile);
  const out = [];
  for (const { path: p, json } of contentFiles(bundleDir)) {
    const src = json.simulation?.src || (/^(poe-observe-sim|mini-game)@/.test(json.type || '') ? json.src : null);
    if (!src) continue;
    const norm = src.replace(/^\.\//, '');
    if (norm !== want && !norm.endsWith('/' + want)) continue;
    const md = markdownOf(bundleDir, json);
    const { steps, authored } = md ? splitSteps(md) : { steps: [], authored: false };
    out.push({
      id: json.id || path.basename(p, '.json'), path: p, type: json.type,
      role: json.simulation?.role || (/^mini-game@/.test(json.type || '') ? 'game' : null),
      fullWidth: !!json.simulation?.fullWidth,
      beats: md && !/^mini-game@/.test(json.type || '') ? steps.length : null, authored, steps,
    });
  }
  return out;
}

// Stub fields. Format: briefs/reference/stub-format.md; older stubs parse too.
export function parseStub(text) {
  const line = (k) => (text.match(new RegExp(`^(?:- )?${k}:[ \\t]*(.*)$`, 'mi')) || [])[1]?.trim() || '';
  const attached = line('Attached by');
  return {
    savePath: line('Save path'),
    attachedIds: [...attached.matchAll(/((?:blk|q|exp)-[\w-]+)/g)].map((m) => m[1]),
    baseClass: line('Base class') || line('Likely base class'),
    helper: line('Shared helper'),
    hasHelperLine: /^Shared helper:/mi.test(text),
    sections: [...text.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim()),
  };
}

export const DESIGN_STATUSES = ['building', 'look-pending', 'review-pending', 'done'];
export function designStatus(designFile) {
  if (!fs.existsSync(designFile)) return null;
  const m = fs.readFileSync(designFile, 'utf8').match(/^Status:[ \t]*([\w-]+)/mi);
  return m ? m[1].toLowerCase() : 'building';
}

export function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
}

// Base-class chain by name, following relative and simulations/... imports.
const MIXINS = { withChallenge: 'ChallengeScene', withBeats: 'BeatScene', withClock: 'ClockScene' };

function importTarget(src, name, file) {
  const imp = [...src.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g)]
    .find((x) => x[1].split(',').map((t) => t.trim().split(/\s+as\s+/).pop()).includes(name));
  if (!imp) return null;
  const spec = imp[2];
  if (spec.startsWith('simulations/')) return path.join(KIT_SIMS, spec.slice('simulations/'.length));
  if (spec.startsWith('.')) return path.resolve(path.dirname(file), spec);
  return null;
}

// Where a stub's `Shared helper:` file lives. A bare name is looked up in the scene's folder, simulations/shared/, then any
// lesson folder (the first that has it). A path-qualified name (simulations/L03/X.js, ../shared/X.js) is resolved against the
// bundle dir, then the stub's folder. Not written yet: the scene's folder for a bare name, the bundle-dir path otherwise.
export function resolveHelper(stubPath, helper) {
  const stubDir = path.dirname(stubPath);
  const simsDir = path.dirname(stubDir);
  if (/[\\/]/.test(helper)) {
    const fromBundle = path.resolve(path.dirname(simsDir), helper);
    if (fs.existsSync(fromBundle)) return fromBundle;
    const fromStub = path.resolve(stubDir, helper);
    return fs.existsSync(fromStub) ? fromStub : fromBundle;
  }
  const local = path.join(stubDir, helper);
  if (fs.existsSync(local)) return local;
  const shared = path.join(simsDir, 'shared', helper);
  if (fs.existsSync(shared)) return shared;
  if (fs.existsSync(simsDir)) {
    for (const d of fs.readdirSync(simsDir).sort()) {
      const p = path.join(simsDir, d, helper);
      if (fs.existsSync(p)) return p;
    }
  }
  return local;
}

export function baseChain(file, seen = new Set(), named = null) {
  if (!file || seen.has(file) || !fs.existsSync(file)) return named ? [named] : [];
  seen.add(file);
  if (named) {
    // Following a mixin argument: the chain starts at that named class in its file.
    const src0 = stripComments(fs.readFileSync(file, 'utf8'));
    const cm = src0.match(new RegExp(`class\\s+${named}\\s+extends\\s+(\\w+)`));
    return cm ? [named, ...baseChain(importTarget(src0, cm[1], file), seen)] : [named];
  }
  const src = stripComments(fs.readFileSync(file, 'utf8'));
  // A mixin: `extends withChallenge(DomSimulation)` - record the mixin's class,
  // then follow its argument.
  // withClock(withChallenge(DomSimulation)): every wrapper is recorded, then the innermost class is followed.
  const mix = src.match(/class\s+\w+\s+extends\s+((?:\w+\(\s*)+)(\w+)\s*\)/);
  if (mix) return [...[...mix[1].matchAll(/(\w+)\(/g)].map((w) => MIXINS[w[1]] || w[1]), ...baseChain(importTarget(src, mix[2], file) || null, seen, mix[2])];
  const m = src.match(/class\s+(\w+)\s+extends\s+(\w+)/);
  if (!m) return [];
  const parent = m[2];
  const imp = [...src.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g)]
    .find((x) => x[1].split(',').map((s) => s.trim().split(/\s+as\s+/).pop()).includes(parent));
  let next = null;
  if (imp) {
    const spec = imp[2];
    if (spec.startsWith('simulations/')) next = path.join(KIT_SIMS, spec.slice('simulations/'.length));
    else if (spec.startsWith('.')) next = path.resolve(path.dirname(file), spec);
  } else if (new RegExp(`class\\s+${parent}\\b`).test(src)) next = null;
  return [parent, ...baseChain(next, seen)];
}

export const DOM_BASES = /^(DomSimulation|SlotBoardScene|KeyBuilderScene|NameDecoderScene|MonsterScene|GuessWhoScene|ConveyorScene|MuseumScene|CardPacksScene|ExpeditionScene|SortRushScene|KeyDashScene|WhackAMythScene|GameScene|GameBoard|SortBoard|SvgScene|TimelineScene|FlowScene|AllocBoardScene)$/;
export function sceneKindOf(file) {
  const chain = baseChain(file);
  if (chain.some((c) => DOM_BASES.test(c))) return { kind: 'dom', chain };
  if (chain.includes('WebGLSimulation')) return { kind: 'webgl', chain };
  if (chain.includes('SimScene')) return { kind: 'simscene', chain };
  if (chain.includes('CanvasSimulation')) return { kind: 'canvas', chain };
  if (chain.length) return { kind: 'canvas', chain };
  return { kind: 'unknown', chain };
}

export function lessonOf(dir) { return path.basename(dir); }
