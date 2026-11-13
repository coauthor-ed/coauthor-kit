// readProfile - the optional repo-root profile.json {"look": "<id>", "audience": "<id>"} (both optional).
// Defaults: look "quill", audience "school" (school = the existing docs, no audience pack).
import fs from 'node:fs';
import path from 'node:path';

const KEYS = ['look', 'audience'];

export function readProfile(repoDir) {
  let look = 'quill', audience = 'school';
  const f = path.join(repoDir, 'profile.json');
  if (fs.existsSync(f)) {
    let j;
    try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { throw new Error(`profile.json: cannot parse ${f}: ${e.message}`); }
    if (!j || typeof j !== 'object' || Array.isArray(j)) throw new Error(`profile.json: ${f} must be an object like {"look": "quill", "audience": "school"}`);
    const bad = Object.keys(j).filter((k) => !KEYS.includes(k));
    if (bad.length) throw new Error(`profile.json: unknown key(s) ${bad.join(', ')} (allowed: ${KEYS.join(', ')})`);
    for (const k of KEYS) if (k in j && (typeof j[k] !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(j[k]))) throw new Error(`profile.json: "${k}" must be a pack id such as "quill"`);
    if (j.look) look = j.look;
    if (j.audience) audience = j.audience;
  }
  const lookCard = `packs/look/${look}/CARD.md`;
  if (!fs.existsSync(path.join(repoDir, lookCard))) throw new Error(`profile.json: look "${look}" needs ${path.join(repoDir, lookCard)}`);
  let audienceCard = null;
  if (audience !== 'school') {
    audienceCard = `packs/audience/${audience}/CARD.md`;
    if (!fs.existsSync(path.join(repoDir, audienceCard))) throw new Error(`profile.json: audience "${audience}" needs ${path.join(repoDir, audienceCard)}`);
  }
  return { look, audience, lookCard, audienceCard };
}
