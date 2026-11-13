// bundleProfile - per-bundle view of the repo profile + courses/<id>/bundle.json:
// { look, audience, subjectPack, lookDiffersFromRepo, audienceDiffersFromRepo, sourceOwned, repoLook, repoAudience }. Tolerant: never throws (doctor reports problems).
//   look        = bundle.json "look" || profile.json look || "quill"
//   audience    = bundle.json "audience" || profile.json audience || "school"
//   subjectPack = bundle.json "subjectPack" || slug of "subject" when packs/subject/<slug>/CARD.md exists || null
import fs from 'node:fs';
import path from 'node:path';

const readJson = (f) => { try { const j = JSON.parse(fs.readFileSync(f, 'utf8')); return j && typeof j === 'object' && !Array.isArray(j) ? j : {}; } catch { return {}; } };

export function slugOf(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }

export function bundleProfile(repoDir, bundleId) {
  const prof = readJson(path.join(repoDir, 'profile.json'));
  const b = bundleId ? readJson(path.join(repoDir, 'courses', bundleId, 'bundle.json')) : {};
  const repoLook = typeof prof.look === 'string' && prof.look ? prof.look : 'quill';
  const repoAudience = typeof prof.audience === 'string' && prof.audience ? prof.audience : 'school';
  const audience = typeof b.audience === 'string' && b.audience ? b.audience : repoAudience;
  const look = typeof b.look === 'string' && b.look ? b.look : repoLook;
  let subjectPack = typeof b.subjectPack === 'string' && b.subjectPack ? b.subjectPack : null;
  if (!subjectPack) {
    const slug = slugOf(b.subject);
    if (slug && fs.existsSync(path.join(repoDir, 'packs', 'subject', slug, 'CARD.md'))) subjectPack = slug;
  }
  return { look, audience, subjectPack, lookDiffersFromRepo: look !== repoLook, audienceDiffersFromRepo: audience !== repoAudience, sourceOwned: b.sourceOwned === true, repoLook, repoAudience };
}

// Short lines appended to a printed prompt; '' for a default bundle (keeps today's output byte-identical).
export function bundleNotes(repoDir, bundleId) {
  const p = bundleProfile(repoDir, bundleId);
  const out = [];
  if (p.subjectPack) out.push(`Subject pack: packs/subject/${p.subjectPack}/CARD.md (read it).`);
  if (p.lookDiffersFromRepo) out.push(`Look for this course: ${p.look} - use packs/look/${p.look}/CARD.md, not the look card in the bundle.`);
  if (p.audienceDiffersFromRepo) {
    if (p.audience !== 'school') out.push(`Audience for this course: ${p.audience} - use packs/audience/${p.audience}/CARD.md, not the audience card in the bundle.`);
    else out.push('Audience for this course: school - ignore the audience card in the bundle; the kit docs hold as written (open docs/mini-games.md and docs/descriptive-questions-and-cbse-marks.md from disk if your brief names them).');
  }
  if (p.sourceOwned) out.push("Source is the author's own material (bundle.json sourceOwned).");
  return out.join('\n');
}
