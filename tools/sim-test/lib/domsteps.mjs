import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
// Real-browser steps on a scene's own panel elements (DomSimulation inputs, buttons), shared by
// shoot.mjs and drive-dom.mjs so both operate a scene the same way. A learner cannot use a
// disabled or missing control, so neither can a step: it is reported and skipped.
//   domSet(page, sel, value)  -> { note?, fail?, before?, after? }
//   domClick(page, sel)       -> { note?, fail? }
// sel is any Playwright selector (#id, [aria-label="x"], button:has-text("Run"); text=Run matches every element containing Run).

export async function domSet(page, sel, value) {
  const loc = page.locator(sel).first();
  if (!(await loc.count())) return { fail: `set ${sel}: no such element` };
  const r = await loc.evaluate((el, v) => {
    if (el.disabled) return { disabled: true };
    const tag = el.tagName;
    const before = el.type === 'checkbox' || el.type === 'radio' ? el.checked : el.value;
    const fire = (n) => el.dispatchEvent(new Event(n, { bubbles: true }));
    if (tag === 'INPUT' && (el.type === 'checkbox' || el.type === 'radio')) { if (el.checked !== !!v) el.click(); }
    else if (tag === 'SELECT') {
      const o = [...el.options].find((x) => x.value === String(v)) || [...el.options].find((x) => x.textContent.trim() === String(v));
      if (!o) return { bad: `no option "${v}" (have ${[...el.options].map((x) => x.value).join(', ')})` };
      el.value = o.value; fire('input'); fire('change');
    } else if (tag === 'INPUT' || tag === 'TEXTAREA') {
      const proto = tag === 'INPUT' ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, String(v)); fire('input'); fire('change');
    } else return { bad: `<${tag.toLowerCase()}> is not an input` };
    return { before, after: el.type === 'checkbox' || el.type === 'radio' ? el.checked : el.value };
  }, value);
  if (r.disabled) return { fail: `set ${sel}: control is DISABLED - a learner could not do this` };
  if (r.bad) return { fail: `set ${sel}: ${r.bad}` };
  return r;
}

// text=X matching 2+ elements: the first is used silently. One WARN line naming the first 5 matches, or null.
export async function multiMatch(page, sel) {
  const m = /^text=(.+)$/.exec(sel);
  if (!m) return null;
  const loc = page.locator(sel);
  const n = await loc.count();
  if (n < 2) return null;
  const tags = await loc.evaluateAll((els) => els.slice(0, 5).map((e) => `<${e.tagName.toLowerCase()}${e.id ? `#${e.id}` : ''}>${e.textContent.trim().replace(/\s+/g, ' ').slice(0, 24)}`));
  return `WARN ${sel} matches ${n} elements (first used): ${tags.join(' | ')}; use button:has-text("${m[1].replace(/^["']|["']$/g, '')}") or an id`;
}

// Before the browser starts: hints for step shapes that always fail. Pure; returns an array of strings.
export function precheckSteps(steps) {
  const out = [];
  (Array.isArray(steps) ? steps : []).forEach((s, i) => {
    if (!s || typeof s.expect !== 'string') return;
    const e = s.expect;
    if (s.probe !== undefined && e.length > 2 && e.startsWith('/') && e.endsWith('/')) out.push(`step ${i + 1}: probe expect is compared with ==; regex only in the selector form {"expect":["sel","/re/"]}`);
    if (/^(\\?")+$/.test(e)) out.push(`step ${i + 1}: expect ${JSON.stringify(e)} is a quoted empty string, not an empty one; use ""`);
  });
  return out;
}

// Hash of a scene file plus every file it imports by a relative path (to 60 files). A tool that would give the same
// answer for the same hash can say "unchanged" instead of running again.
export function sourceHash(file) {
  const seen = new Set();
  const parts = [];
  const walk = (f) => {
    if (seen.size >= 60 || seen.has(f)) return;
    seen.add(f);
    let t;
    try { t = fs.readFileSync(f, 'utf8'); } catch { return; }
    parts.push(f + '\n' + t);
    for (const m of t.matchAll(/(?:from|import)\s*\(?\s*['"](\.{1,2}\/[^'"]+)['"]/g)) walk(path.resolve(path.dirname(f), m[1]));
  };
  walk(path.resolve(file));
  return crypto.createHash('sha1').update(parts.sort().join('\n')).digest('hex');
}

// Per-scene run counter (like shoot's .rounds). Counts a run only when `counted`; from run cap+1 it says STOP.
// Returns { n, stop } and writes the file. more = the --more flag.
export function runCounter(file, { cap = 3, more = false, counted = true } = {}) {
  let n = 0;
  try { n = Number(fs.readFileSync(file, 'utf8')) || 0; } catch { /* first run */ }
  if (!counted) return { n, stop: false };
  n += 1;
  try { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, String(n)); } catch { /* read-only: no budget */ }
  return { n, stop: n > cap && !more };
}

export async function domClick(page, sel) {
  const loc = page.locator(sel).first();
  if (!(await loc.count())) return { fail: `click ${sel}: no such element` };
  if (await loc.evaluate((el) => !!el.disabled || el.getAttribute('aria-disabled') === 'true')) return { fail: `click ${sel}: control is DISABLED - a learner could not do this` };
  const warn = await multiMatch(page, sel).catch(() => null);
  try { await loc.click({ timeout: 2000 }); } catch (e) { return { fail: `click ${sel}: ${String(e.message).split('\n')[0]}` }; }
  return warn ? { warn } : {};
}
