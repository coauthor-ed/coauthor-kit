// Statically counts the entries in a scene's `BEAT_STEP_MAP` array literal
// (docs/simulation-authoring.md §2.2) from its source text, without
// importing/running the scene. A lightweight bracket-depth scan, not a real
// JS parser - good enough for this shape (`const BEAT_STEP_MAP = [ [...], [...], ... ];`)
// and deliberately conservative: returns null rather than guess when the
// declaration isn't found.

function countTopLevelArrayEntries(source, openBracketIdx) {
  let i = openBracketIdx + 1;
  let depth = 1;
  let sawEntryContent = false;
  let entries = 0;
  const n = source.length;

  while (i < n && depth > 0) {
    const ch = source[i];
    if (ch === '/' && source[i + 1] === '/') {
      const nl = source.indexOf('\n', i);
      i = nl === -1 ? n : nl + 1;
      continue;
    }
    if (ch === '/' && source[i + 1] === '*') {
      const end = source.indexOf('*/', i + 2);
      i = end === -1 ? n : end + 2;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      i++;
      while (i < n && source[i] !== quote) i += source[i] === '\\' ? 2 : 1;
      i++;
      sawEntryContent = true;
      continue;
    }
    if (ch === '[' || ch === '{' || ch === '(') {
      depth++;
      sawEntryContent = true;
      i++;
      continue;
    }
    if (ch === ']' || ch === '}' || ch === ')') {
      depth--;
      i++;
      if (depth === 0) break;
      continue;
    }
    if (ch === ',' && depth === 1) {
      entries++;
      sawEntryContent = false;
      i++;
      continue;
    }
    if (!/\s/.test(ch)) sawEntryContent = true;
    i++;
  }
  if (sawEntryContent) entries++;
  return entries;
}

/** @returns {number|null} entry count, or null if no `BEAT_STEP_MAP = [` declaration was found. */
export function getDeclaredBeatCount(sceneSource) {
  const m = /\bBEAT_STEP_MAP\s*=\s*(\[)/.exec(sceneSource);
  if (!m) return null;
  return countTopLevelArrayEntries(sceneSource, m.index + m[0].length - 1);
}
