// Adapted from huashu-art-motion@64cb272 scripts/engine/lib/palettes.js (MIT, (c) 2026 alchaincyf)
// The luminance/contrast idea is huashu's (lines 27-30); our WCAG maths is color.mjs, the rest is original.
// contrast-lint - does every c.* colour a scene can use clear its contrast floor against the
// backgrounds it is drawn on, in BOTH themes? Static, no browser.
//
//   node tools/sim-test/contrast-lint.mjs [--palette]                 whole closed palette
//   node tools/sim-test/contrast-lint.mjs <scene> [--bundle <b>]      only the keys the scene uses
//   --look <id>   check that look's values (simulations-kit/src/core/looks/look-tokens.css, as the app paints them)
//
// Backgrounds: bgDeep (canvas), bgSurface and raised (cards). Floors: text roles (label,
// labelMuted, s1ink..s8ink) 4.5:1; graphic roles (everything else except track) 3:1 (WCAG 1.4.11).
// track is a recessed rail on purpose and is not checked. A scene mode also reads the scene's own
// COLOR_MAP extension entries and flags any key it uses that no map defines.
// WARN only; exit 1 on a usage error or an undefined key. check-scene may call contrastLint().
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { toRgb, contrastRatio } from './color.mjs';
import { KIT_SIMS, resolveTarget, describeMiss, bundleFromArg, stripComments } from './lib/bundle.mjs';
import { parseArgs } from './lib/args.mjs';

const THEME_CSS = path.join(KIT_SIMS, 'base', 'sim-theme.css');
const LOOK_CSS = path.join(KIT_SIMS, '..', 'core', 'looks', 'look-tokens.css');
const SIM_LOOK = path.join(KIT_SIMS, 'base', 'kit', 'SimLook.js');
const BACKGROUNDS = ['bgDeep', 'bgSurface', 'raised'];
const TEXT_FLOOR = 4.5;
const GRAPHIC_FLOOR = 3;
// The setting tokens (set*) are the world behind a scene, backgrounds themselves: not checked either.
const SKIP = new Set([...BACKGROUNDS, 'track', 'fontBody', 'fontDisplay']);
const isSetting = (k) => /^set[A-Z]/.test(k);
// c is sometimes a point, a pixel or a canvas in older scenes: these names are never colour keys.
const NOT_COLOURS = /^(cx|cy|x|y|r|g|b|a|w|h|width|height|length|getContext|getContex)$/;
const isText = (k) => k === 'label' || k === 'labelMuted' || /^s\dink$/.test(k);

/** { dark: {--sim-x: '#hex'}, light: {...} } read straight out of sim-theme.css (var() chains resolved). With a look
 *  other than quill, its html[data-look] block then its [data-theme] twin go on top, as in the app. */
export function loadThemes(css = fs.readFileSync(THEME_CSS, 'utf8'), look = null) {
  const out = { dark: {}, light: {} };
  const decls = (body, t) => { for (const d of body.matchAll(/(--sim-[a-z0-9-]+)\s*:\s*([^;]+);/gi)) out[t][d[1]] = d[2].trim(); };
  for (const m of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const sel = m[1].trim();
    if (/data-look=/.test(sel)) continue;
    const theme = /data-theme="light"/.test(sel) ? 'light' : (/data-theme="dark"|:root/.test(sel) ? 'dark' : null);
    if (!theme) continue;
    decls(m[2], theme);
  }
  if (look && look !== 'quill') {
    const lc = fs.existsSync(LOOK_CSS) ? fs.readFileSync(LOOK_CSS, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '') : '';
    const blocks = [...lc.matchAll(/([^{}]+)\{([^}]*)\}/g)].map((m) => ({ sel: m[1].trim(), body: m[2] })).filter((b) => b.sel.includes(`data-look="${look}"`));
    if (!blocks.length) throw new Error(`contrast-lint: no look "${look}" in ${path.relative(process.cwd(), LOOK_CSS)} (run the kit sync, or check the id)`);
    for (const t of ['dark', 'light']) {
      for (const b of blocks) if (!/data-theme=/.test(b.sel)) decls(b.body, t);
      for (const b of blocks) if (b.sel.includes(`data-theme="${t}"`)) decls(b.body, t);
    }
  }
  const resolve = (t, name, depth = 0) => {
    const v = out[t][name];
    const ref = v && /^var\((--sim-[a-z0-9-]+)\)$/i.exec(v);
    return ref && depth < 5 ? resolve(t, ref[1], depth + 1) : v;
  };
  for (const t of ['dark', 'light']) for (const k of Object.keys(out[t])) out[t][k] = resolve(t, k);
  return out;
}

/** { key: '--sim-token' } from the kit's COLOR_TOKEN_MAP, or from any map-shaped entries in `src`. */
export function loadKeyMap(src = fs.readFileSync(SIM_LOOK, 'utf8')) {
  const map = {};
  for (const m of src.matchAll(/\b([A-Za-z_$][\w$]*)\s*:\s*\[\s*['"`](--sim-[a-z0-9-]+)['"`]/g)) map[m[1]] = m[2];
  return map;
}

/** Failing pairs for the given keys (all palette keys when omitted). */
export function checkPairs(keys, keyMap = loadKeyMap(), themes = loadThemes()) {
  const warn = [];
  const list = (keys || Object.keys(keyMap)).filter((k) => keyMap[k] && !(SKIP.has(k) || isSetting(k)));
  for (const theme of ['dark', 'light']) {
    for (const k of list) {
      const fg = toRgb(themes[theme][keyMap[k]]);
      if (!fg) continue;
      const floor = isText(k) ? TEXT_FLOOR : GRAPHIC_FLOOR;
      for (const bg of BACKGROUNDS) {
        const bgTok = themes[theme][keyMap[bg] || ''];
        const r = contrastRatio(fg, toRgb(bgTok));
        if (r != null && r < floor) warn.push(`${theme} ${k} on ${bg} ${r.toFixed(2)}:1 < ${floor} (${isText(k) ? 'text' : 'graphic'})`);
      }
    }
  }
  return warn;
}

/** The c.* keys a scene source references. `strict` = false when no c-alias of colors was seen (c.x then only counts if defined). */
export function keysUsed(src) {
  const code = stripComments(src);
  const keys = new Set();
  for (const m of code.matchAll(/\b(?:this\.colors|colors)\.([A-Za-z_$][\w$]*)/g)) keys.add(m[1]);
  for (const m of code.matchAll(/\{([^{}]*)\}\s*=\s*(?:this\.)?(?:colors|c)\b/g)) {
    for (const p of m[1].split(',')) { const n = p.split(':')[0].trim().replace(/=.*$/, '').trim(); if (/^[A-Za-z_$][\w$]*$/.test(n)) keys.add(n); }
  }
  const alias = /\b(?:const|let|var)\s+c\s*=\s*(?:this\.)?colors\b/.test(code) || (/kit\/SimScene\.js/.test(code) && /\(\s*(?:ctx|g)\s*,\s*c\s*[,)]/.test(code));
  const loose = new Set();
  for (const m of code.matchAll(/(?<![\w$.])c\.([A-Za-z_$][\w$]*)(?!\s*\()/g)) { if (!NOT_COLOURS.test(m[1])) (alias ? keys : loose).add(m[1]); }
  return { keys, loose };
}

// Colour maps declared in the scene and in the local files it imports (a course's shared draw kit), not the kit.
function localMaps(file, seen = new Set()) {
  if (seen.has(file) || seen.size > 40 || !fs.existsSync(file)) return {};
  seen.add(file);
  const src = stripComments(fs.readFileSync(file, 'utf8'));
  let map = {};
  for (const m of src.matchAll(/\bfrom\s*['"](\.{1,2}\/[^'"]+)['"]/g)) map = { ...map, ...localMaps(path.resolve(path.dirname(file), m[1]), seen) };
  return { ...map, ...loadKeyMap(src) };
}

export function contrastLint(sceneFile, opts = {}) {
  const warn = [], fail = [];
  const src = fs.readFileSync(sceneFile, 'utf8');
  const keyMap = { ...loadKeyMap(), ...localMaps(sceneFile) };
  const { keys, loose } = keysUsed(src);
  for (const k of loose) if (keyMap[k]) keys.add(k);
  const themes = loadThemes(undefined, opts.look);
  // keys the scene derives itself (c.chipBg = mix(...), this.colors.x = ..., { ...c, x: ... }) are defined, not tokens
  const code = stripComments(src);
  const derived = new Set([...code.matchAll(/(?<![\w$])(?:c|colors|this\.colors)\.([A-Za-z_$][\w$]*)\s*(?:=(?!=)|\?\?=|\|\|=)/g)].map((m) => m[1]));
  for (const m of code.matchAll(/\{\s*\.\.\.(?:c|colors|this\.colors)\s*,([^}]*)\}/g)) for (const k of m[1].matchAll(/([A-Za-z_$][\w$]*)\s*[:,]/g)) derived.add(k[1]);
  for (const k of [...keys].sort()) {
    if (derived.has(k) && !keyMap[k]) continue;
    if (!keyMap[k]) { fail.push(`undefined colour key c.${k}: not in COLOR_TOKEN_MAP or the scene's own map`); continue; }
    if (!(keyMap[k] in themes.dark)) warn.push(`c.${k}: token ${keyMap[k]} is not in sim-theme.css (alias or fallback hex; contrast not checked)`);
  }
  const usable = [...keys].filter((k) => keyMap[k] && keyMap[k] in themes.dark);
  warn.push(...checkPairs(usable, keyMap, themes));
  return { warn, fail, keys: [...keys].sort() };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const USAGE = 'node tools/sim-test/contrast-lint.mjs [--palette | <scene.js | L0N/Scene | Scene> [--bundle <id|dir>]] [--look <id>]';
  const A = parseArgs(process.argv.slice(2), { tool: 'contrast-lint', file: import.meta.url, usage: USAGE, val: ['bundle', 'look'], bool: ['palette'] });
  const look = A.val('look') || null;
  if (A.has('palette') || !A.pos.length) {
    let themes;
    try { themes = loadThemes(undefined, look); } catch (e) { console.error(e.message); process.exit(2); }
    const warn = checkPairs(undefined, loadKeyMap(), themes);
    for (const w of warn) console.log('WARN  ' + w);
    console.log(`contrast-lint palette${look ? ` (look ${look})` : ''}: ${warn.length} failing pair(s) (floors: text ${TEXT_FLOOR}, graphic ${GRAPHIC_FLOOR}; WARN only)`);
    process.exit(0);
  }
  const bundle = bundleFromArg(A.val('bundle'));
  let bad = 0;
  for (const target of A.pos) {
    const t = fs.existsSync(target) && fs.statSync(target).isFile() ? { kind: 'scene', file: path.resolve(target) } : resolveTarget(target, bundle);
    if (!t || t.kind !== 'scene') { console.error(describeMiss(target, bundle)); process.exit(2); }
    let r;
    try { r = contrastLint(t.file, { look }); } catch (e) { console.error(e.message); process.exit(2); }
    for (const w of r.warn) console.log(`WARN  ${path.basename(t.file)}: ${w}`);
    for (const f of r.fail) console.log(`FAIL  ${path.basename(t.file)}: ${f}`);
    console.log(`contrast-lint ${path.basename(t.file)}: ${r.keys.length} key(s), ${r.warn.length} warn, ${r.fail.length} fail`);
    bad += r.fail.length;
  }
  process.exit(bad ? 1 : 0);
}
