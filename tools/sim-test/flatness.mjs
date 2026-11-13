/**
 * Static checks for the flat-vector house style (docs/simulation-authoring.md).
 *
 * Advisory only, like colorTokenScan.mjs: the corpus is already close (only 50
 * of 699 course scenes use a gradient at all), so these are here to stop drift
 * rather than to fail anyone's build today. Graduate to a hard failure once the
 * bundle sweep is done.
 *
 * Static source scanning, not runtime instrumentation, because a scene draws
 * different things on different beats and a single headless frame would miss
 * most of it.
 */

const GRADIENT_RE = /create(?:Linear|Radial|Conic)Gradient\s*\(/g;
const SHADOW_RE   = /\bshadowBlur\s*=/g;
const DRAW_RE     = /\bctx\.(?:fill|stroke|fillRect|strokeRect|fillText|strokeText|arc|beginPath|drawImage)\s*\(/g;
const LINEWIDTH_RE = /\blineWidth\s*=\s*([0-9.]+)/g;
const RADIUS_RE   = /\b(?:roundRect|drawPanel)\s*\([^)]*?(?:radius:\s*|,\s*)([0-9]{1,3})\s*[,)]/g;
const FONT_RE     = /\bfont\s*=\s*['"`][^'"`]*\b(Inter|Arial|Helvetica|sans-serif)\b/g;

/** The sanctioned stroke scale from the sprint doc: hairline / normal / heavy. */
const STROKE_SCALE = [2, 2.5, 3, 4];

export function scanFlatness(source) {
  const gradients = (source.match(GRADIENT_RE) || []).length;
  const shadows   = (source.match(SHADOW_RE) || []).length;
  const draws     = (source.match(DRAW_RE) || []).length;

  const widths = [...source.matchAll(LINEWIDTH_RE)].map((m) => Number(m[1]));
  const distinctWidths = [...new Set(widths)];
  const offScale = distinctWidths.filter((w) => !STROKE_SCALE.includes(w));

  const radii = [...source.matchAll(RADIUS_RE)].map((m) => Number(m[1]));
  const offRadius = [...new Set(radii)].filter((r) => !(r >= 6 && r <= 11) && r < 900);

  const hardcodedFont = (source.match(FONT_RE) || []).length;

  return { gradients, shadows, draws, distinctWidths, offScale, offRadius, hardcodedFont };
}

/** Human-readable advisories; empty array means nothing to say. */
export function flatnessAdvisories(source) {
  const r = scanFlatness(source);
  const out = [];
  if (r.gradients && r.draws && r.gradients / r.draws > 0.08) {
    out.push(`${r.gradients} gradient(s) across ~${r.draws} draw call(s) - flat fills plus one SimDraw.shade() two-tone are the house style; a gradient should be earned.`);
  }
  if (r.shadows) {
    out.push(`${r.shadows} shadowBlur assignment(s) - the flat style uses no canvas shadows.`);
  }
  if (r.distinctWidths.length > 4) {
    out.push(`${r.distinctWidths.length} distinct lineWidth values (${r.distinctWidths.join(', ')}) - the scale is 2 / 2.5-3 / 4.`);
  } else if (r.offScale.length) {
    out.push(`lineWidth ${r.offScale.join(', ')} outside the 2 / 2.5-3 / 4 scale.`);
  }
  if (r.offRadius.length) {
    out.push(`corner radius ${r.offRadius.join(', ')} outside the 6-8 / 9-11 scale.`);
  }
  if (r.hardcodedFont) {
    out.push(`${r.hardcodedFont} hardcoded font stack(s) - use var(--sim-font) via this.colors or SimDraw's font helper.`);
  }
  return out;
}
