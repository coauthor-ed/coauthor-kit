// The expect logic shared by drive.mjs (canvas scenes, headless) and drive-dom.mjs (DOM/SVG scenes, real browser),
// so both drivers judge a step the same way and fail with the same words.
//   normText(x)                      whitespace (nbsp, narrow nbsp, thin space too) collapsed; U+2212 / U+2013 / U+2012 become "-"
//   closestSegment(text, want)       the segment of text most like want (token overlap), '' when nothing is close
//   judgeText(text, step)            {"expect":"text or /re/"} against the text a learner can read now
//   judgeSel(got, sel, step)         {"expect":["sel","text or /re/"]} against what sel holds (DOM scenes)
//   judgeProbe(value, step)          {"probe":"js","expect":json} equality (step.not inverts)
//   badStep(step, opts)              null when well formed, else a one-line refusal (opts.selectors: [sel, pattern] allowed)
//   PAGE_HELPERS                     source of the d.count(sel) / d.texts() helpers a DOM probe gets (runs in the page)
// Every judge returns { ok, msg, detail? }: msg is one line, detail the "visible now:" / "closest:" lines to print after a FAIL.

// Plain-text matching: collapse whitespace and fold the minus variants to ASCII hyphen. Nothing else (case, digits) is relaxed.
export const normText = (x) => String(x).replace(/[\u2212\u2013\u2012]/g, '-').replace(/[\s\u00a0\u202f\u2009]+/g, ' ').trim();
const plainHas = (hay, needle) => normText(hay).includes(normText(needle));
const tokens = (x) => normText(x).toLowerCase().split(/[^a-z0-9.+-]+/).filter(Boolean);

// The visible segment most like the wanted text, by token overlap (Dice); '' when nothing shares a token.
export function closestSegment(text, want) {
  const w = new Set(tokens(want));
  if (!w.size) return '';
  const segs = normText(text).split(/(?<=[.!?:;])\s+|\s{2,}/).filter(Boolean);
  let best = '', bestScore = 0;
  for (const seg of segs) {
    const t = new Set(tokens(seg));
    let common = 0;
    for (const k of w) if (t.has(k)) common++;
    const score = common ? (2 * common) / (w.size + t.size) : 0;
    if (score > bestScore) { bestScore = score; best = seg; }
  }
  return bestScore >= 0.2 ? best.slice(0, 200) : '';
}

// "/re/flags" inside a string is a regex, anything else a plain substring.
export function asRegex(pat) {
  return typeof pat === 'string' && pat.length > 2 && pat.startsWith('/') && pat.lastIndexOf('/') > 0
    ? new RegExp(pat.slice(1, pat.lastIndexOf('/')), pat.slice(pat.lastIndexOf('/') + 1)) : null;
}

export function judgeText(text, s) {
  const pat = s.expect;
  const re = asRegex(pat);
  const hit = re ? re.test(text) : plainHas(text, pat);
  if (s.not ? !hit : hit) return { ok: true, msg: `scene text ${s.not ? 'lacks' : 'has'} ${re || JSON.stringify(pat)}` };
  const near = s.not ? '' : closestSegment(text, re ? re.source : pat);
  return {
    ok: false,
    msg: `scene text ${s.not ? 'should not contain' : 'does not contain'} ${re || JSON.stringify(pat)}`,
    detail: [`  visible now: ${normText(text).slice(0, 800)}`, ...(near ? [`  closest: ${near}`] : [])],
  };
}

export function judgeSel(got, sel, s) {
  const pat = s.expect[1];
  const re = asRegex(pat);
  const hit = re ? re.test(got) : plainHas(got, pat);
  return (s.not ? !hit : hit)
    ? { ok: true, msg: `${sel} ${s.not ? 'lacks' : 'has'} ${re || JSON.stringify(pat)}` }
    : { ok: false, msg: `${sel} ${s.not ? 'should not match' : 'does not match'} ${re || JSON.stringify(pat)}; found at ${sel}: ${JSON.stringify(got.slice(0, 160))}` };
}

export function judgeProbe(value, s) {
  const same = JSON.stringify(value) === JSON.stringify(s.expect);
  return (s.not ? !same : same)
    ? { ok: true, msg: `probe ${s.probe}` }
    : { ok: false, msg: `probe ${s.probe} = ${JSON.stringify(value)}, expected ${s.not ? 'anything but ' : ''}${JSON.stringify(s.expect)}` };
}

const FORMS = (sel) => `valid forms: {"expect":"text or /regex/"}${sel ? ' or {"expect":["selector","text or /regex/"]}' : ''} or {"probe":"js","expect":<json>}`;
// null when the step is well formed, else a one-line refusal (the caller adds the step index).
export function badStep(s, { keys, selectors = false } = {}) {
  if (!s || typeof s !== 'object' || Array.isArray(s)) return `got ${JSON.stringify(s)}, a step must be an object like {"beat":0}`;
  const unknown = keys ? Object.keys(s).filter((k) => !keys.has(k)) : [];
  if (unknown.length) return `unknown key "${unknown[0]}" in ${JSON.stringify(s)}; keys: ${[...keys].join(', ')}`;
  if (s.probe === undefined && s.expect !== undefined) {
    const e = s.expect;
    const okSel = selectors && Array.isArray(e) && e.length === 2 && typeof e[0] === 'string' && (typeof e[1] === 'string' || typeof e[1] === 'number');
    if (!(typeof e === 'string' || okSel)) return `expect got ${JSON.stringify(e)}; ${FORMS(selectors)}`;
  }
  const pair = (p) => Array.isArray(p) && p.length === 2 && p.every((v) => typeof v === 'number');
  if (s.drag !== undefined && !(Array.isArray(s.drag) && s.drag.length >= 2 && s.drag.every(pair))) return `drag got ${JSON.stringify(s.drag)}; drag takes [[x0,y0],[x1,y1],...] (pairs, never a flat list)`;
  if (s.probe !== undefined && typeof s.probe !== 'string') return `probe got ${JSON.stringify(s.probe)}, a string of JS like "sc.busy()"`;
  return null;
}

// Runs in the page (a DOM or SVG scene), as window.__d: the probe's `d`. Self-contained: it is passed to page.evaluate.
//   d.count(sel)  visible elements under the scene root matching a CSS selector ("line", ".chair", "[data-on]")
//   d.texts()     the text segments a learner can read now
export function pageHelpers() {
  const root = () => window.__scene?.root || document.querySelector('#sim-host') || document.body;
  const shown = (n) => {
    for (let e = n; e && e !== document.body; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden' || e.hidden || parseFloat(cs.opacity) < 0.05) return false;
    }
    return true;
  };
  window.__d = {
    count: (sel) => [...root().querySelectorAll(sel)].filter(shown).length,
    texts: () => {
      const out = [];
      const walk = (n) => {
        if (n.nodeType === 3) { const t = n.textContent.replace(/\s+/g, ' ').trim(); if (t) out.push(t); return; }
        if (n.nodeType !== 1 || /^(STYLE|SCRIPT|NOSCRIPT)$/.test(n.tagName)) return;
        const cs = getComputedStyle(n);
        if (cs.display === 'none' || cs.visibility === 'hidden' || n.hidden || parseFloat(cs.opacity) < 0.05) return;
        for (const c of n.childNodes) walk(c);
      };
      walk(root());
      return out;
    },
  };
}
