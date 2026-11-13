// Manifest generation for a bundle: used by preview (on the fly) and publish (written into the public tree).
// Order for subject/grade/title: bundle.json > module/bank field > blank. Never overwrites a filled value.
import fs from 'node:fs';
import path from 'node:path';
import { bundleProfile } from '../../staged-generation/lib/bundleProfile.mjs';
import { lessonFiles, moduleFiles, bankFiles, lessonItems, statusOf, listJson } from './units.mjs';

export const readJ = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } };
const names = (B, dir) => (fs.existsSync(path.join(B, dir)) ? fs.readdirSync(path.join(B, dir)).filter((f) => f.endsWith('.json')).sort().map((f) => `${dir}/${f}`) : []);

export function bundleMeta(B) { return readJ(path.join(B, 'bundle.json')) || {}; }

export function bundleStatus(B) {
  const lessons = lessonFiles(B);
  if (!lessons.length) return 'draft';
  const done = lessons.filter((lf) => statusOf(lf) === 'human-approved' && lessonItems(B, lf).every((it) => it.files.every((f) => statusOf(f) === 'human-approved'))).length;
  return done === 0 ? 'draft' : done === lessons.length ? 'ready' : 'partial';
}

// the course look (bundle.json, else profile.json); quill is the site default, so it adds nothing
const lookOf = (B) => { const l = bundleProfile(path.dirname(path.dirname(B)), path.basename(B)).look; return l === 'quill' ? null : l; };

export function buildManifest(B, { stamp = false } = {}) {
  const bj = bundleMeta(B);
  const mod = moduleFiles(B).map(readJ).find(Boolean) || {};
  const bank = bankFiles(B).map(readJ).find((j) => j?.subject) || {};
  const prof = bundleProfile(path.dirname(path.dirname(B)), path.basename(B));
  const mods = moduleFiles(B).map(readJ).filter(Boolean);
  const subjectsOf = Array.isArray(bj.subjects) && bj.subjects.length ? bj.subjects : (bj.subject ?? mod.subject ?? bank.subject) ? [String(bj.subject ?? mod.subject ?? bank.subject)] : null;
  const gradeRaw = bj.grade ?? mod.grade ?? bank.grade ?? null;
  const gradeV1 = typeof gradeRaw === 'string' && /^\d+$/.test(gradeRaw.trim()) ? Number(gradeRaw) : gradeRaw === '' ? null : gradeRaw;
  const features = { ...(mods.some((x) => x.lessonMode === 'story') ? { story: true } : {}), ...(bankFiles(B).length ? { practice: true } : {}), ...(bj.features && typeof bj.features === 'object' ? bj.features : {}) };
  const m = {
    schemaVersion: 1,
    bundleId: bj.bundleId || path.basename(B),
    title: bj.title ? (typeof bj.title === 'string' ? { en: bj.title } : bj.title) : mod.title || { en: path.basename(B) },
    subject: bj.subject ?? mod.subject ?? bank.subject ?? null,
    grade: gradeV1,
    audience: prof.audience,
    ...(subjectsOf ? { subjects: subjectsOf } : {}),
    languages: Array.isArray(bj.languages) && bj.languages.length ? bj.languages : ['en'],
    ...(Object.keys(features).length ? { features } : {}),
    ...(bj.board ? { board: bj.board } : {}),
    ...(bj.repository ? { repository: typeof bj.repository === 'string' ? { url: bj.repository } : bj.repository } : {}),
    // D10: license defaults to CC-BY-4.0 and version to 1.0.0 (override in bundle.json)
    license: bj.license || 'CC-BY-4.0',
    ...(Array.isArray(bj.authors) && bj.authors.length ? { authors: bj.authors } : {}),
    version: bj.version || '1.0.0',
    // "1.0" = the first engine with manifest v1; raise it in bundle.json requires.engine if the course needs a newer one
    requires: { engine: bj.requires?.engine ? String(bj.requires.engine) : '1.0' },
    ...(bj.description ? { description: typeof bj.description === 'string' ? { en: bj.description } : bj.description } : {}),
    ...(bj.icon ? { icon: bj.icon } : {}),
    ...(bj.tags ? { tags: bj.tags } : {}),
    ...(bj.cover ? { cover: bj.cover } : {}),
    ...(lookOf(B) ? { look: lookOf(B) } : {}),
    // the setting behind the scenes (--sim-setting) and the signature colour (data-accent): only when bundle.json names them
    ...(typeof bj.simSetting === 'string' && bj.simSetting ? { simSetting: bj.simSetting } : {}),
    ...(typeof bj.accent === 'string' && bj.accent ? { accent: bj.accent } : {}),
    // the story cast (cast.json path, docs/content-authoring-guide.md "Story cast")
    ...(typeof bj.cast === 'string' && bj.cast ? { cast: bj.cast } : {}),
    modules: names(B, 'modules'),
    lessons: names(B, 'lessons'),
    tests: names(B, 'tests'),
    banks: names(B, 'banks'),
    ...(fs.existsSync(path.join(B, 'glossary.json')) ? { glossary: 'glossary.json' } : {}),
    ...(fs.existsSync(path.join(B, 'field-guide.json')) ? { fieldGuide: 'field-guide.json' } : {}),
    status: bundleStatus(B),
  };
  const sc = readJ(path.join(B, 'showcase.json'));
  if (sc) { const { shots, ...pub } = sc; m.showcase = pub; if (!m.description && pub.description) m.description = pub.description; if (!m.tags && pub.tags) m.tags = pub.tags; }
  if (stamp) m.generatedAt = new Date().toISOString();
  return m;
}

export function bundlesIn(root) {
  const d = path.join(root, 'courses');
  if (!fs.existsSync(d)) return [];
  return fs.readdirSync(d).map((x) => path.join(d, x)).filter((p) => fs.statSync(p).isDirectory() && ['lessons', 'blocks', 'source', 'bundle.json', 'banks'].some((f) => fs.existsSync(path.join(p, f))));
}
void listJson;

// v1 fields the kit cannot derive: printed as TODO lines, never invented. Fill them in bundle.json (repository) or
// leave it out. license (CC-BY-4.0) and version (1.0.0) default.
export function manifestTodos(m, id = m.bundleId) {
  const t = [];
  if (!m.repository?.url) t.push('repository (bundle.json "repository": {"url": "https://...", "issues": "https://..."})');
  if (!m.license) t.push('license (bundle.json "license": SPDX id such as "CC-BY-4.0")');
  if (!m.version) t.push('version (bundle.json "version": "1.0.0")');
  if (!m.features?.narration) t.push('features.narration (bundle.json "features": {"narration": true} only if the course has it)');
  return t.map((x) => `TODO ${id}: manifest ${x}`);
}
