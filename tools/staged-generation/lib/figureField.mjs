// figureField - shared by outline-lint and lesson-check: the geometry `diagram` field is for
// maths / physics geometry only; anything else (flows, panels, timelines) is the `figure` field
// (docs/figures.md). A course counts as geometry when its subjectPack or subject names maths,
// physics or geometry.
import fs from 'node:fs';
import path from 'node:path';

export function geometrySubject(bundleDir) {
  let b = {};
  try { b = JSON.parse(fs.readFileSync(path.join(bundleDir, 'bundle.json'), 'utf8')) || {}; } catch { /* none */ }
  return /math|physic|geometr/i.test(`${b.subjectPack || ''} ${b.subject || ''}`);
}

export const DIAGRAM_HINT = 'the `diagram` field is geometry only (points and segments placed by hand); for a flow, panels, a timeline, small multiples or a comparison use the `figure` field (docs/figures.md)';
