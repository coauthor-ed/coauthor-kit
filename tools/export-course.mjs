#!/usr/bin/env node
/**
 * Export a course bundle from courses/<bundle>/ into a destination directory,
 * merging into whatever's already there instead of clobbering it.
 *
 * This exists because content generation runs in passes: a first pass drafts
 * a course, it gets exported and committed somewhere real; a later pass (often
 * a different agent/model doing closer visual inspection of source PDFs -
 * catching a diagram the first pass's text conversion missed, say) regenerates
 * some of the same files and re-exports. Between those two exports, the
 * destination may have picked up its own state this tool must not step on -
 * most commonly a human flipping `authoring.status` from `ai-draft` to
 * `human-approved`, or the authoring-app adding `subject`/`grade`/`chapterId`
 * to a module/lesson file (see AGENTS.md rule 3 in the parent docs - this kit
 * never authors those fields itself).
 *
 * Merge rules, per file:
 *   - Destination file doesn't exist yet: write it.
 *   - Destination file is byte-identical to what we'd write: no-op.
 *   - JSON files: top-level keys the destination has but the new content
 *     doesn't (e.g. `subject`, `chapterId`) are preserved as-is. The
 *     `authoring` block specifically: if the rest of the file (everything
 *     except `authoring`) is unchanged, the destination's `authoring` is kept
 *     untouched (this is the common case - a human only touched review
 *     status). If the rest of the file DID change and the destination was
 *     `human-approved`, the new content is written but status is reset to
 *     `ai-draft` with a `revised-after-approval` flag - an approval covers
 *     the content that was approved, not whatever replaces it later.
 *   - Text files (.js/.mjs/.md/.txt, and JSON that fails to parse): a real
 *     three-way merge runs via `git merge-file` - base is the file's blob at
 *     the destination's own git HEAD when it's a git repo and the file is
 *     tracked there, otherwise an empty ancestor (still merges cleanly
 *     whenever only one side actually changed). A conflict is written with
 *     normal `<<<<<<<` markers, left for a human to resolve, and reported -
 *     never silently resolved in either direction.
 *   - Binary files (images, PDFs, ...): no `authoring` field to signal "a
 *     human touched this on purpose" the way JSON has, so a differing binary
 *     is never silently overwritten, committed or not - the new version is
 *     written alongside as `<name>.incoming<ext>` for manual reconciling.
 *   - `--force` skips both of the above and just takes the new content.
 *
 * `manifest.json`/`_headers` are pure generated output (see
 * tools/content-migration/generate-bundle-manifest.js in the engine repo,
 * which this mirrors) and are always regenerated fresh from whatever's on
 * disk after the merge above.
 *
 * This script never runs `git commit`, and only runs `git add` with --git-add
 * - per this repo's own rule, committing is for the human/calling agent to
 * decide, not this tool.
 *
 * Usage:
 *   node tools/export-course.mjs <bundle> <dest-dir> [--dry-run] [--skip-validate] [--force] [--git-add]
 *
 * <bundle> is a path under courses/, e.g. work-energy
 * <dest-dir> is the exact target bundle directory (created if missing)
 * --force resolves a would-be git-merge conflict by taking the new content
 *   instead of leaving conflict markers (discards the destination's dirty
 *   edit for that file). Does not affect the JSON authoring-safety behavior.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..');

function parseArgs(argv) {
  const flags = new Set();
  const positional = [];
  for (const a of argv) {
    if (a.startsWith('--')) flags.add(a.slice(2));
    else positional.push(a);
  }
  return { positional, flags };
}

const { positional, flags } = parseArgs(process.argv.slice(2));
const [bundleArg, destArg] = positional;
const DRY_RUN = flags.has('dry-run');
const SKIP_VALIDATE = flags.has('skip-validate');
const FORCE = flags.has('force');
const GIT_ADD = flags.has('git-add');

if (!bundleArg || !destArg) {
  console.error('Usage: node tools/export-course.mjs <bundle> <dest-dir> [--dry-run] [--skip-validate] [--force] [--git-add]');
  process.exit(1);
}

const SOURCE_DIR = path.resolve(REPO_ROOT, 'courses', bundleArg);
const DEST_DIR = path.resolve(process.cwd(), destArg);

function isBundleRoot(dir) {
  // banks-only bundle is a valid shape too - docs/question-bank-generation.md.
  return fs.existsSync(path.join(dir, 'modules')) || fs.existsSync(path.join(dir, 'lessons')) || fs.existsSync(path.join(dir, 'banks'));
}

if (!fs.existsSync(SOURCE_DIR) || !isBundleRoot(SOURCE_DIR)) {
  console.error(`No such bundle (needs a modules/ or lessons/ subfolder): ${path.relative(REPO_ROOT, SOURCE_DIR)}`);
  process.exit(1);
}

// ---- filesystem walk ----

const SKIP_BASENAMES = new Set(['manifest.json', '_headers']); // regenerated, never merged
function isSkippable(basename) {
  return basename.startsWith('.') || basename.endsWith('.swp') || basename.endsWith('~') || SKIP_BASENAMES.has(basename);
}

function walkFiles(rootDir) {
  const out = [];
  (function recurse(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (isSkippable(entry.name)) continue;
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) recurse(abs);
      else if (entry.isFile()) out.push(path.relative(rootDir, abs).split(path.sep).join('/'));
    }
  })(rootDir);
  return out.sort();
}

// ---- pre-export validation ----

function validateSource(relPaths) {
  const jsonFiles = relPaths.filter((p) => p.endsWith('.json')).map((p) => path.join(SOURCE_DIR, p));
  if (!jsonFiles.length) return true;
  const result = spawnSync('node', [path.join(REPO_ROOT, 'validators', 'validate.mjs'), ...jsonFiles], { encoding: 'utf8' });
  process.stdout.write(result.stdout || '');
  if (result.stderr) process.stderr.write(result.stderr);
  return result.status === 0;
}

// ---- git helpers ----

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { encoding: 'utf8', ...opts });
}

function findGitRoot(startDir) {
  let dir = startDir;
  while (!fs.existsSync(dir)) {
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
  const r = run('git', ['-C', dir, 'rev-parse', '--show-toplevel']);
  if (r.status !== 0) return null;
  return r.stdout.trim();
}

const GIT_ROOT = findGitRoot(DEST_DIR);

function gitHeadBlob(absPath) {
  if (!GIT_ROOT) return null;
  const rel = path.relative(GIT_ROOT, absPath).split(path.sep).join('/');
  const r = run('git', ['-C', GIT_ROOT, 'show', `HEAD:${rel}`]);
  return r.status === 0 ? r.stdout : null; // null = not in HEAD (new/untracked), not an error
}

const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'export-course-'));
let tmpCounter = 0;
function tmpFile(content) {
  const p = path.join(TMP_DIR, `f${tmpCounter++}`);
  fs.writeFileSync(p, content);
  return p;
}

/** Three-way text merge. Returns { content, conflict }. base may be null (no history - merges against an empty ancestor, which still resolves cleanly whenever only one side actually changed). */
function mergeText(baseText, oursText, theirsText) {
  const baseFile = tmpFile(baseText ?? '');
  const oursFile = tmpFile(oursText);
  const theirsFile = tmpFile(theirsText);
  const r = run('git', ['merge-file', '-p', '-L', 'destination', '-L', 'base', '-L', 'export', oursFile, baseFile, theirsFile]);
  if (r.status < 0) throw new Error(`git merge-file failed to run: ${r.error}`);
  return { content: r.stdout, conflict: r.status > 0 };
}

// ---- JSON merge ----

const BINARY_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.pdf', '.mp3', '.wav', '.woff', '.woff2']);
const TEXT_EXTS = new Set(['.js', '.mjs', '.md', '.txt', '.css']);

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/**
 * Merges a destination JSON object with the new source object. Source wins on
 * any key both define, except: (a) a top-level key the destination has but
 * source doesn't is kept - this is how a later authoring-app edit
 * (subject/grade/chapterId/board, or anything else this kit doesn't know
 * about) survives a re-export; (b) `authoring` is special-cased per the file
 * header above.
 */
function mergeJsonObject(destObj, sourceObj) {
  const result = { ...sourceObj };
  for (const key of Object.keys(destObj)) {
    if (!(key in sourceObj)) result[key] = destObj[key];
  }

  const contentChanged = stableStringify({ ...destObj, authoring: undefined }) !== stableStringify({ ...sourceObj, authoring: undefined });

  let statusReset = false;
  if (destObj.authoring) {
    if (!contentChanged) {
      result.authoring = destObj.authoring;
    } else if (destObj.authoring.status === 'human-approved') {
      const flags = new Set([...(destObj.authoring.flags || []), ...(sourceObj.authoring?.flags || []), 'revised-after-approval']);
      result.authoring = { ...(sourceObj.authoring || {}), status: 'ai-draft', flags: [...flags], reviewedAt: null };
      statusReset = true;
    } else {
      result.authoring = sourceObj.authoring || destObj.authoring;
    }
  }

  return { result, contentChanged, statusReset };
}

// ---- per-file export ----

const report = { added: [], unchanged: [], updated: [], reviewPreserved: [], statusReset: [], merged: [], conflicts: [], binaryConflicts: [] };

function ensureDir(absFilePath) {
  fs.mkdirSync(path.dirname(absFilePath), { recursive: true });
}

function writeIfNotDryRun(absPath, content) {
  if (DRY_RUN) return;
  ensureDir(absPath);
  fs.writeFileSync(absPath, content);
}

function exportFile(relPath) {
  const srcAbs = path.join(SOURCE_DIR, relPath);
  const destAbs = path.join(DEST_DIR, relPath);
  const destExists = fs.existsSync(destAbs);
  const ext = path.extname(relPath);
  const basename = path.basename(relPath);

  if (!destExists) {
    writeIfNotDryRun(destAbs, fs.readFileSync(srcAbs));
    report.added.push(relPath);
    return;
  }

  // GENERATION-LOG.md and FIGURES.md accumulate across passes rather than being
  // merged/overwritten - both are append-only working notes, not structured content.
  if (basename === 'GENERATION-LOG.md' || basename === 'FIGURES.md') {
    const destText = fs.readFileSync(destAbs, 'utf8');
    const srcText = fs.readFileSync(srcAbs, 'utf8');
    if (destText.includes(srcText.trim())) {
      report.unchanged.push(relPath);
      return;
    }
    const sep = destText.endsWith('\n') ? '\n' : '\n\n';
    const stamped = `${destText}${sep}---\n<!-- appended by export-course.mjs on ${new Date().toISOString()} -->\n\n${srcText}`;
    writeIfNotDryRun(destAbs, stamped);
    report.updated.push(relPath);
    return;
  }

  let proposed; // Buffer or string - what we'd write if the destination didn't exist / weren't dirty
  let statusReset = false;

  if (ext === '.json') {
    let destObj, srcObj, parseOk = true;
    try {
      destObj = JSON.parse(fs.readFileSync(destAbs, 'utf8'));
      srcObj = JSON.parse(fs.readFileSync(srcAbs, 'utf8'));
    } catch {
      parseOk = false;
    }
    if (parseOk) {
      const merged = mergeJsonObject(destObj, srcObj);
      proposed = JSON.stringify(merged.result, null, 2) + '\n';
      statusReset = merged.statusReset;
      if (proposed === fs.readFileSync(destAbs, 'utf8')) {
        report.unchanged.push(relPath);
        return;
      }
      if (!merged.contentChanged) {
        writeIfNotDryRun(destAbs, proposed);
        report.reviewPreserved.push(relPath);
        return;
      }
    } else {
      proposed = fs.readFileSync(srcAbs); // unparsable destination - fall through to the generic text-merge path below
    }
  } else {
    proposed = fs.readFileSync(srcAbs);
  }

  const destCurrent = fs.readFileSync(destAbs);
  if (Buffer.compare(Buffer.from(destCurrent), Buffer.from(proposed)) === 0) {
    report.unchanged.push(relPath);
    return;
  }

  const isText = ext === '.json' || TEXT_EXTS.has(ext);
  if (isText && !BINARY_EXTS.has(ext)) {
    const baseText = gitHeadBlob(destAbs); // null when untracked/no git - merges against an empty ancestor
    const { content, conflict } = mergeText(baseText, destCurrent.toString('utf8'), proposed.toString('utf8'));
    if (conflict && !FORCE) {
      writeIfNotDryRun(destAbs, content);
      report.conflicts.push(relPath);
      return;
    }
    const finalContent = conflict ? proposed : content; // --force on a conflict: take the export's content outright
    writeIfNotDryRun(destAbs, finalContent);
    (statusReset ? report.statusReset : conflict ? report.updated : report.merged).push(relPath);
    return;
  }

  // Binary: can't line-merge, and unlike JSON there's no `authoring` field to
  // signal "a human touched this on purpose" - a diagram someone replaced and
  // committed looks identical, on disk, to one nobody's looked at yet. So a
  // differing binary is never silently overwritten, committed or not; only
  // --force does that.
  if (FORCE) {
    writeIfNotDryRun(destAbs, proposed);
    report.updated.push(relPath);
    return;
  }
  const incomingPath = destAbs.replace(new RegExp(`${ext.replace('.', '\\.')}$`), `.incoming${ext}`);
  writeIfNotDryRun(incomingPath, proposed);
  report.binaryConflicts.push({ relPath, incoming: path.relative(DEST_DIR, incomingPath) });
}

// ---- manifest regeneration (mirrors tools/content-migration/generate-bundle-manifest.js in the engine repo) ----

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
}

function firstModuleMeta(bundleDir) {
  for (const file of listJsonFiles(path.join(bundleDir, 'modules'))) {
    try {
      const mod = JSON.parse(fs.readFileSync(path.join(bundleDir, 'modules', file), 'utf8'));
      return { title: mod.title || { en: file.replace(/\.json$/, '') }, subject: mod.subject ?? null, grade: mod.grade ?? null };
    } catch { /* try the next module file */ }
  }
  return { title: { en: path.basename(bundleDir) }, subject: null, grade: null };
}

// bundle.json's look, scene setting and signature colour, carried into the
// manifest only when named (LookManager.followBundle(), SimulationLoader's
// --sim-setting). Mirrors the kit's tools/operator/lib/manifest.mjs: quill is
// the site default, so a "quill" look adds nothing.
function bundleLookFields(bundleDir) {
  let bj = {};
  try { bj = JSON.parse(fs.readFileSync(path.join(bundleDir, 'bundle.json'), 'utf8')) || {}; } catch { /* none */ }
  const str = (v) => (typeof v === 'string' && v ? v : null);
  const look = str(bj.look) === 'quill' ? null : str(bj.look);
  return {
    ...(look ? { look } : {}),
    ...(str(bj.simSetting) ? { simSetting: bj.simSetting } : {}),
    ...(str(bj.accent) ? { accent: bj.accent } : {}),
    ...(str(bj.cast) ? { cast: bj.cast } : {}),
    ...(bj.renderers && typeof bj.renderers === 'object' && !Array.isArray(bj.renderers) && Object.keys(bj.renderers).length ? { renderers: bj.renderers } : {}),
  };
}

function regenerateManifest() {
  const meta = firstModuleMeta(DEST_DIR);
  const gitRel = GIT_ROOT ? path.relative(GIT_ROOT, DEST_DIR).split(path.sep).join('/') : null;
  const coursesMarker = gitRel ? gitRel.match(/(?:^|\/)content\/courses\/(.+)$/) : null;
  const manifest = {
    bundleId: coursesMarker ? coursesMarker[1] : path.basename(DEST_DIR),
    title: meta.title,
    subject: meta.subject,
    grade: meta.grade,
    ...bundleLookFields(SOURCE_DIR),
    modules: listJsonFiles(path.join(DEST_DIR, 'modules')).map((f) => `modules/${f}`),
    lessons: listJsonFiles(path.join(DEST_DIR, 'lessons')).map((f) => `lessons/${f}`),
    tests: listJsonFiles(path.join(DEST_DIR, 'tests')).map((f) => `tests/${f}`),
    banks: listJsonFiles(path.join(DEST_DIR, 'banks')).map((f) => `banks/${f}`),
    ...(fs.existsSync(path.join(DEST_DIR, 'glossary.json')) ? { glossary: 'glossary.json' } : {}),
    ...(fs.existsSync(path.join(DEST_DIR, 'field-guide.json')) ? { fieldGuide: 'field-guide.json' } : {}),
    generatedAt: new Date().toISOString(),
  };
  writeIfNotDryRun(path.join(DEST_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  writeIfNotDryRun(path.join(DEST_DIR, '_headers'), '/*\n  Access-Control-Allow-Origin: *\n');
}

// ---- main ----

const relPaths = walkFiles(SOURCE_DIR);

if (!SKIP_VALIDATE && !validateSource(relPaths)) {
  console.error('\nSource content has validation errors - fix them (or re-run with --skip-validate) before exporting.');
  process.exit(1);
}

for (const relPath of relPaths) exportFile(relPath);

if (fs.existsSync(DEST_DIR)) {
  const sourceSet = new Set(relPaths);
  const incomingSet = new Set(report.binaryConflicts.map((c) => c.incoming));
  report.orphans = walkFiles(DEST_DIR).filter((p) => !sourceSet.has(p) && !incomingSet.has(p));
} else {
  report.orphans = [];
}

if (!DRY_RUN) regenerateManifest();

if (GIT_ADD && GIT_ROOT && !DRY_RUN) {
  const staged = [...report.added, ...report.updated, ...report.reviewPreserved, ...report.statusReset, ...report.merged, 'manifest.json', '_headers']
    .map((p) => path.join(DEST_DIR, p));
  run('git', ['-C', GIT_ROOT, 'add', ...staged]);
}

fs.rmSync(TMP_DIR, { recursive: true, force: true });

// ---- report ----

function list(label, items) {
  if (!items.length) return;
  console.log(`\n${label} (${items.length}):`);
  for (const i of items) console.log(`  ${typeof i === 'string' ? i : `${i.relPath} -> wrote ${i.incoming} (destination left untouched)`}`);
}

console.log(`${DRY_RUN ? '[dry run] ' : ''}Exported ${bundleArg} -> ${path.relative(process.cwd(), DEST_DIR) || '.'}`);
list('Added', report.added);
list('Updated', report.updated);
list('Merged (git 3-way, clean)', report.merged);
list('Review metadata preserved (content unchanged)', report.reviewPreserved);
list('Reset to ai-draft (approved content changed upstream)', report.statusReset);
list('Unchanged', report.unchanged);
list('CONFLICTS - resolve manually (git conflict markers written)', report.conflicts);
list('Binary conflicts - new version written alongside, destination untouched', report.binaryConflicts);
list('Orphaned in destination (not in this export, left as-is)', report.orphans);

if (report.conflicts.length || report.binaryConflicts.length) {
  console.log('\nSome files need manual resolution before this export is done - see above.');
  process.exit(1);
}
