// Static source scan: does this scene mostly source its colors from
// this.colors.* (the resolved theme, see SimTheme.js readSimColors()) rather
// than hardcoding hex/rgb literals directly at the draw call? Advisory only
// - a literal fallback inside a scene's own COLOR_TOKEN_MAP is legitimate
// (canvas can't resolve CSS var() either way), so this only flags literals
// assigned straight to fillStyle/strokeStyle, not fallback tables.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const LITERAL_RE = /\b(?:fillStyle|strokeStyle)\s*=\s*(['"`])(#[0-9a-fA-F]{3,8}|rgba?\([^'"`]*\)|hsla?\([^'"`]*\))\1/g;
const TOKEN_RE = /\bthis\.colors\.[A-Za-z_$][\w$]*/g;

export function scanColorTokenUsage(source) {
  const literals = [...source.matchAll(LITERAL_RE)].map((m) => m[2]);
  const tokens = source.match(TOKEN_RE) || [];
  return { literalCount: literals.length, tokenCount: tokens.length, literals };
}

// ── Off-palette token check (docs/sprints/wip/dom-simulations-md-prose-and-
// explanation-slides.md §4) ─────────────────────────────────────────────────
// sim-theme.css's palette is closed: a readSimColors() tokenMap entry naming
// a `--sim-*` custom property NOT declared there is guaranteed-fallback - it
// resolves to nothing at runtime and permanently renders its JS fallback hex,
// identical in both themes, i.e. a hardcoded color in disguise. The closed
// list is read straight out of the vendored sim-theme.css itself (not a
// hand-maintained duplicate) so the two literally cannot drift apart.
const SIM_THEME_PATH = fileURLToPath(new URL('../../simulations-kit/src/simulations/base/sim-theme.css', import.meta.url));
const TOKEN_DECL_RE = /(--sim-[a-zA-Z0-9-]+)\s*:/g;
const TOKEN_ENTRY_RE = /\[\s*(['"`])(--sim-[a-zA-Z0-9-]+)\1/g;

let _closedPaletteCache = null;

/** The set of `--sim-*` custom properties sim-theme.css actually declares. */
export function loadClosedPalette() {
  if (_closedPaletteCache) return _closedPaletteCache;
  const css = fs.readFileSync(SIM_THEME_PATH, 'utf8');
  _closedPaletteCache = new Set([...css.matchAll(TOKEN_DECL_RE)].map((m) => m[1]));
  return _closedPaletteCache;
}

// SimTheme.js resolves an undeclared token by its last hyphen segment through
// ROLE_ALIASES, so most scene-named tokens now land on a real palette role
// instead of a frozen hex. The alias table is parsed out of the vendored
// SimTheme.js for the same reason the palette is parsed out of sim-theme.css:
// a hand-copied duplicate here would drift the moment the resolver changes.
const SIM_THEME_JS = fileURLToPath(new URL('../../simulations-kit/src/simulations/base/SimTheme.js', import.meta.url));
const ALIAS_RE = /\b([a-z0-9]+)\s*:\s*'(--sim-[a-z0-9-]+)'/gi;
const SERIES_RE = /const SERIES_SUFFIX\s*=\s*\{([^}]*)\}/i;

let _aliasCache = null;
function loadAliases() {
  if (_aliasCache) return _aliasCache;
  let src = '';
  try { src = fs.readFileSync(SIM_THEME_JS, 'utf8'); } catch { /* not vendored */ }
  const roles = new Map([...src.matchAll(ALIAS_RE)].map((m) => [m[1], m[2]]));
  const series = new Set();
  const sm = src.match(SERIES_RE);
  if (sm) for (const m of sm[1].matchAll(/([a-z0-9]+)\s*:/gi)) series.add(m[1].toLowerCase());
  _aliasCache = { roles, series };
  return _aliasCache;
}

/** What a token will actually resolve to: 'declared', 'alias:<role>', or null. */
export function resolutionOf(token) {
  if (loadClosedPalette().has(token)) return 'declared';
  const { roles, series } = loadAliases();
  const tail = String(token).split('-').pop().toLowerCase();
  const word = tail.replace(/[0-9]+$/, '');
  const role = roles.get(tail) || roles.get(word);
  if (role) return `alias:${role}`;
  if (tail.length === 1 && series.has(tail)) return 'alias:--sim-series-N';
  return null;
}

/** Scans a scene's source for `['--sim-...', fallback]`-shaped tokenMap
 *  entries (the `COLOR_TOKEN_MAP`/`TOKEN_MAP` convention every migrated
 *  scene uses). Splits them into ones the resolver rescues via a role alias
 *  (worth tidying, but they DO follow the theme) and ones that genuinely
 *  render a frozen hex in both themes. */
export function scanOffPaletteTokens(source) {
  const named = [...new Set([...source.matchAll(TOKEN_ENTRY_RE)].map((m) => m[2]))];
  const aliased = [];
  const offPalette = [];
  for (const t of named) {
    const r = resolutionOf(t);
    if (r === 'declared') continue;
    if (r) aliased.push(`${t} -> ${r.slice(6)}`);
    else offPalette.push(t);
  }
  return { offPalette, aliased };
}
