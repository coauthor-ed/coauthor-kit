// Approvable units of a bundle: lesson file, each blocks[] entry (block or question file), explanation slides,
// module files, bank and bank-question files. Shared by approve / unapprove / status / publish.
import fs from 'node:fs';
import path from 'node:path';

const readJ = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } };

export function listJson(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listJson(p));
    else if (e.name.endsWith('.json')) out.push(p);
  }
  return out;
}

export function lessonCodeOf(file) { const m = /^les-(.+)\.json$/.exec(path.basename(file)); if (!m) return null; const s = m[1].toUpperCase(); return s[0] === 'C' ? s : `L${s}`; }

export function lessonFiles(B) { return listJson(path.join(B, 'lessons')).filter((f) => lessonCodeOf(f)); }

// The question's own explanationSlide (a file ref) rides along with the question.
function extraRefs(B, file) {
  const j = readJ(file); const out = [];
  const ref = j?.explanationSlide?.blockRef || (typeof j?.explanationSlide === 'string' ? j.explanationSlide : null);
  if (ref) out.push(path.join(B, ref));
  return out.filter((f) => fs.existsSync(f));
}

// Items of a lesson in slide order: { index, id, file, files: [item file + riders] }.
export function lessonItems(B, lessonFile) {
  const j = readJ(lessonFile);
  return (j?.blocks || []).map((b, index) => {
    const file = b.blockRef ? path.join(B, b.blockRef) : null;
    return file && fs.existsSync(file) ? { index, id: path.basename(file, '.json'), file, files: [file, ...extraRefs(B, file)] } : null;
  }).filter(Boolean);
}

export function moduleFiles(B) { return listJson(path.join(B, 'modules')); }
export function bankFiles(B) { return [...listJson(path.join(B, 'banks')), ...listJson(path.join(B, 'questions', 'bank'))]; }

export function statusOf(file) { return readJ(file)?.authoring?.status ?? null; }

// Resolve a scope to a de-duplicated file list. scope = { file | slide | lesson | module | bank | all }.
export function resolveScope(B, scope) {
  const files = new Set();
  const lessons = lessonFiles(B);
  const lessonFor = (code) => lessons.find((f) => lessonCodeOf(f) === code.toUpperCase());
  const addLesson = (lf) => { files.add(lf); for (const it of lessonItems(B, lf)) it.files.forEach((f) => files.add(f)); };
  if (scope.file) files.add(path.resolve(scope.file));
  if (scope.slide) {
    const m = /^([LC][\dA-Z-]+?)S(\d+)$/i.exec(scope.slide);
    if (!m) throw new Error(`--slide wants L01S03 or C01S03 (lesson code + S + slide number), got "${scope.slide}"`);
    const lf = lessonFor(m[1]); if (!lf) throw new Error(`no lesson ${m[1]}`);
    const it = lessonItems(B, lf)[Number(m[2]) - 1];
    if (!it) throw new Error(`${m[1]} has no entry ${m[2]}`);
    it.files.forEach((f) => files.add(f));
  }
  if (scope.lesson) { const lf = lessonFor(scope.lesson); if (!lf) throw new Error(`no lesson ${scope.lesson}`); addLesson(lf); }
  if (scope.module) {
    const mf = moduleFiles(B).find((f) => readJ(f)?.id === scope.module || path.basename(f, '.json') === scope.module);
    if (!mf) throw new Error(`no module ${scope.module}`);
    files.add(mf);
  }
  if (scope.bank) {
    const bf = bankFiles(B).filter((f) => readJ(f)?.id === scope.bank || path.basename(f, '.json') === scope.bank);
    if (!bf.length) throw new Error(`no bank ${scope.bank}`);
    bf.forEach((f) => files.add(f));
  }
  if (scope.all) { lessons.forEach(addLesson); moduleFiles(B).forEach((f) => files.add(f)); bankFiles(B).forEach((f) => files.add(f)); }
  return [...files].filter((f) => readJ(f));
}
