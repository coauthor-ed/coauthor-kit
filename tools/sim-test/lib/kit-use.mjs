// "Did you look at the kit?" made checkable (stage3-cost-analysis 6.2 + 6.3).
//  - kitUseLine: the design note must carry a `Kit use:` line (checked only for notes written under the
//    current template, i.e. with a `Started:` line, so older notes are not failed retroactively).
//  - resemblances: scene function names that look like a kit part the scene does not import (advisory).
import fs from 'node:fs';
import path from 'node:path';
import { search } from '../kit-find.mjs';
import { moduleExports } from './ast.mjs';

const GENERIC = new Set('draw paint render update get set compute calc init make layout hit is on handle do apply build reset start stop enter leave frame step run tick check eval value values item items point points pos position size scale tint color colour label text show hide toggle add remove find new create fill clear'.split(' '));

const KNOWN = /^(?:Sim\w+|Geo\w+|\w+Scene|FlowBoard|TreeCards|fitToContent|shuffle|Collection|KeyCharacters)$/;

/** Parse the text after "Kit use:". @returns {{ok:boolean, msg?:string, parts:string[], uses:string[]}} (uses = parts marked `use`) */
export function parseKitUseLine(line0) {
  const line = String(line0 || '').trim();
  if (!line) return { ok: false, parts: [], uses: [], msg: 'empty Kit use' };
  if (/^none fits\b/i.test(line)) {
    return /\((?:queried|looked at):\s*\S/.test(line) ? { ok: true, parts: [], uses: [] } : { ok: false, parts: [], uses: [], msg: '"none fits" must say what you looked at: none fits (looked at: <your guide and kit-parts.md>)' };
  }
  const parts = [], uses = [];
  for (const piece of line.split(/;\s*/)) {
    const pm = /^([A-Za-z][\w.]*)\s+(use|extend|differ)\b\s*[-:,]?\s*(.*)$/i.exec(piece.trim());
    if (!pm) return { ok: false, parts, uses, msg: `entry "${piece.trim().slice(0, 60)}" is not "<Part> use|extend|differ - <reason>"` };
    if (pm[2].toLowerCase() !== 'use' && pm[3].trim().length < 8) return { ok: false, parts, uses, msg: `"${pm[1]} ${pm[2]}" needs a reason (8+ chars)` };
    parts.push(pm[1]); if (pm[2].toLowerCase() === 'use') uses.push(pm[1]);
  }
  return { ok: true, parts, uses };
}

/** The design note must carry a `Kit use:` line (checked only for notes written under the current template, i.e. with `Started:`). */
export function kitUseLine(design) {
  if (!/^Started:/m.test(design)) return { ok: true, parts: [], legacy: true };       // old-format note: not gated
  const m = /^Kit use:\s*(.+)$/m.exec(design);
  if (!m) return { ok: false, parts: [], msg: 'design note has no "Kit use:" line. Check your guide (briefs/stage3/INDEX.md) and briefs/reference/kit-parts.md, then write: Kit use: <Part> use|extend|differ - <reason>[; ...]  OR  Kit use: none fits (looked at: <your guide and kit-parts.md>). No ";" inside a reason.' };
  const r = parseKitUseLine(m[1]);
  return r.ok ? r : { ...r, msg: `Kit use: ${r.msg}` };
}

/** Part names in `Kit use:` that the scene (or its helper) never imports: "use" claimed but not done. */
export function unusedClaims(parts, src) {
  return parts.filter((p) => KNOWN.test(p) && !new RegExp(`\\b${p.replace(/\.js$/, '')}\\b`).test(src));
}

/** Function names in the scene that read like a kit part it does not import. [{name, module, does}] */
export function resemblances(code, src) {
  const names = new Set();
  for (const m of code.matchAll(/\bfunction\s+_?([A-Za-z]\w*)\s*\(/g)) names.add(m[1]);
  for (const m of code.matchAll(/^[ \t]{2}(?:static\s+)?(?:async\s+)?_?([a-z]\w*)\s*\([^)]*\)\s*\{/gm)) names.add(m[1]);
  const skip = new Set(['constructor', 'setup', 'enter', 'draw', 'update', 'busy', 'destroy', 'onControlChange', 'onBeatChange', 'pointerDown', 'pointerMove', 'pointerUp', 'drawFrameInner', 'checkObjective', 'init']);
  const out = [];
  for (const n of names) {
    if (skip.has(n)) continue;
    const words = n.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase().split(' ').filter((w) => w.length > 2 && !GENERIC.has(w));
    if (!words.length) continue;
    const hit = search(words.join(' '), 1)[0];
    if (!hit || hit.score < 12) continue;
    const mod = hit.file.replace(/\.js$/, '');
    if (new RegExp(`\\b${mod}\\b`).test(src)) continue;                           // already imports it
    out.push({ name: n, module: hit.file, does: hit.does });
  }
  return out;
}

/** Recipe names a stub's `Recipes:` line claims that the scene source never uses (advisory). `kitDir`: the kit folder to read
 *  export names from. A Sim* module name counts as used when the scene mentions it or any of its exports; any other word
 *  that is a kit export (lagged, countUp, transformTerms, flyTo ...) must appear in the scene. */
export function unusedRecipes(stubText, src, kitDir) {
  const line = (/^[ \t]*(?:- )?Recipes:[ \t]*(.+)$/mi.exec(stubText) || [])[1];
  if (!line || /^none\b/i.test(line.trim())) return [];
  const exportsOf = new Map(), owner = new Map();
  for (const f of fs.readdirSync(kitDir).filter((x) => /^Sim\w+\.js$/.test(x))) {
    const names = moduleExports(path.join(kitDir, f)).exports.map((e) => e.name);
    exportsOf.set(f.replace(/\.js$/, ''), names);
    for (const n of names) if (!owner.has(n)) owner.set(n, f);
  }
  const used = (n) => new RegExp(`\\b${n}\\b`).test(src);
  const out = [];
  for (const w of new Set(line.match(/[A-Za-z][A-Za-z0-9]*/g))) {
    if (exportsOf.has(w)) { if (!used(w) && !exportsOf.get(w).some(used)) out.push(w); }
    else if (w.length > 3 && owner.has(w) && !used(w)) out.push(w);
  }
  return out;
}
