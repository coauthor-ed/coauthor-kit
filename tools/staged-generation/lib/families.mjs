// The Stage 3 guide family of a stub: which briefs/stage3/*.md guide(s) its scene needs. One source of truth for
// next.mjs (which bundle a unit gets) and build-bundles.mjs (what each bundle holds). Mirrors briefs/stage3/INDEX.md.
export const FAMILIES = ['canvas', 'svg', 'dom', 'boards', 'game', 'geo', 'arcade'];

export function familyForStubText(text) {
  // Only the first word of each field: the rest of a Base class line is a reason and may name other classes.
  const first = (re) => (((re.exec(text) || [])[1] || '').trim().split(/[\s(,;:]/)[0]);
  const base = first(/^Base class:[ \t]*([^\n]*)/mi);
  const comp = first(/^Component:[ \t]*([^\n]*)/mi);
  const head = `${base} ${comp}`;
  if (/\bArcade\w*Scene\b/.test(head)) return 'arcade';
  if (/\b(Timeline|FlowBoard|AllocBoard|SlotBoard)\b/.test(comp)) return 'boards';
  // `Base class: SimScene + GeoMap` is a map scene: GeoMap in the rest of the line counts (a reason may not name it).
  const baseLine = (/^Base class:[ \t]*([^\n]*)/mi.exec(text) || [])[1] || '';
  if (/\b(GeoScene|WebGLSimulation)\b/.test(base) || /\b(GeoMap|SimGeo)\b/.test(comp) || /^[^()]*\bGeoMap\b/.test(baseLine)) return 'geo';
  if (/\bSvgScene\b/.test(base)) return 'svg';
  if (/\bDomSimulation\b/.test(base)) return 'dom';
  if (/\b(MonsterScene|KeyBuilderScene|NameDecoderScene|withChallenge)\b/.test(head) || /mini-game@1/.test(head)) return 'game';
  if (/\b(SimScene|CanvasSimulation)\b/.test(base)) return 'canvas';
  return null;
}
