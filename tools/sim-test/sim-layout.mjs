#!/usr/bin/env node
// sim-layout - real-browser layout check for DomSimulation scenes.
//
//   node tools/sim-test/sim-layout.mjs <scene.js | dir> [...] [options]
//
// Mounts each scene in simulations-kit/preview-harness.html (Chromium via
// Playwright), walks every beat in landscape and portrait, and reports what a
// human would otherwise find by eye:
//
//   ERROR  unstyled          no scene CSS mounted (style lost / never injected)
//   WARN   tight             natural content height > declared HEIGHT by more than 8 px, only padding lost
//   ERROR  box-overflow      a box's content is wider than the box (text runs out of its card)
//   ERROR  clipped           an element (or its 3px card shadow) leaves the frame; the
//                            message says by how far, so the fix is a HEIGHT number
//                            (content inside an overflow-y:auto region may run past the
//                            frame vertically - only sideways is checked there)
//   WARN   h-overflow        content pushes into the right padding (a clipped element is
//                            reported separately as an ERROR clipped)
//   WARN   slack             declared HEIGHT leaves > 48px empty band
//   WARN   small-text        smallest text < 14 design px (or < 11 px on screen)
//
// A GameBoard / SortBoard (kit/GameFrame.js) is mounted once at mini-game@1's real widths (1100 and 320), not the 620 and 380 test hosts.
//
// Exit code 1 if any ERROR (or any WARN with --strict). Options:
//   --kit <dir>      simulations-kit dir (default: nearest ancestor, else ../../simulations-kit)
//   --root <dir>     directory served as / for the scenes (default: repo root above the scene)
//   --beats N        beats to walk when the scene declares none (default 4)
//   --interact N     after each beat, poke N random buttons/selects/dials (a range or number input goes to its min, max or middle) and keep the tallest
//                    state (default 30 for KeyBuilder/SlotBoard scenes, else 10) - an
//                    interactive scene must be sized for its worst state, not its first
//   --orient both|landscape|portrait   (default both)
//   --json <file>    write the full per-beat measurements
//   --strict         warnings fail too
//   --look <id>      draw with that LookProfile (harness ?look=, default the bundle's look; quill adds nothing)
//   --quiet          only print problems
//   --more           run past the probe cap: the 4th run of one scene prints STOP and exits 1 (record open: in the design note and move on)
//
// Needs Playwright (npm i -D playwright, or a globally installed copy). The
// scene need not extend DomSimulation, but the checks assume a .sim-dom-root.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { getDeclaredBeatCount } from '../beat-check/parseBeatStepMap.mjs';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { scratchFor, expandTargets, bundleFromArg, bundleOf, attachersOf, KIT_ROOT, sceneKindOf } from './lib/bundle.mjs';
import { parseArgs } from './lib/args.mjs';
import { playwright } from './lib/serve.mjs';
import { runCounter, sourceHash } from './lib/domsteps.mjs';
import { bundleProfile } from '../staged-generation/lib/bundleProfile.mjs';

// The kit's own kit/ (and anything under simulations-kit/ named shared/) holds helpers, not scenes; a bundle's simulations/shared/ holds real scenes, wherever the bundle sits.
const isHelperDir = (f) => /[\\/]kit[\\/]/.test(f) || (/[\\/]shared[\\/]/.test(f) && /[\\/]simulations-kit[\\/]/.test(f));

const HERE = path.dirname(fileURLToPath(import.meta.url));
const USAGE = 'node tools/sim-test/sim-layout.mjs <scene.js | L0N/Scene | Scene | dir> [...] [--json out.json] [--strict] [--quiet] [--beats N] [--interact N] [--orient both|landscape|portrait] [--kit dir] [--root dir] [--bundle id] [--more] [--fresh] [--look id]';
const A = parseArgs(process.argv.slice(2), { tool: 'sim-layout', file: import.meta.url, usage: USAGE, val: ['json', 'beats', 'interact', 'orient', 'kit', 'root', 'bundle', 'look'], bool: ['strict', 'quiet', 'more', 'no-count', 'fresh'] });
const opt = { orient: 'both', beats: 4 };
for (const k of ['json', 'beats', 'interact', 'orient', 'kit', 'root']) if (A.val(k) != null) opt[k] = A.val(k);
for (const k of ['strict', 'quiet']) if (A.has(k)) opt[k] = true;
const lookQFor = (f) => {
  const B = bundleOf(f);
  let id = A.val('look');
  if (!id && B) { const l = bundleProfile(path.dirname(path.dirname(B)), path.basename(B)).look; id = l === 'quill' ? null : l; }
  return id ? `&look=${encodeURIComponent(id)}` : '';
};
const targets = expandTargets(A.pos, bundleFromArg(A.val('bundle')));
if (!targets.length) {
  console.error('usage: node tools/sim-test/sim-layout.mjs <scene.js | dir> [...] [--json out.json] [--strict]');
  process.exit(2);
}

function collect(t, out) {
  const st = fs.statSync(t);
  if (st.isFile()) { if (t.endsWith('.js')) out.push(path.resolve(t)); return; }
  for (const f of fs.readdirSync(t).sort()) collect(path.join(t, f), out);
}
const files = [];
for (const t of targets) collect(t, files);
const scenes = files.filter((f) => !isHelperDir(f)
  && (/extends\s+(?:with(?:Challenge|Beats|Clock)\(\s*)*(DomSimulation|SlotBoardScene|KeyBuilderScene|NameDecoderScene|MonsterScene|GuessWhoScene|ConveyorScene|MuseumScene|CardPacksScene|ExpeditionScene|SortRushScene|KeyDashScene|WhackAMythScene|GameBoard|SortBoard|SvgScene|TimelineScene|FlowScene|AllocBoardScene)\b/.test(fs.readFileSync(f, 'utf8')) || sceneKindOf(f).kind === 'dom'));  // the last test: a thin variant of a course scene
if (!scenes.length) { console.error(`no DOM scene among ${files.length} file(s): sim-layout checks scenes that extend DomSimulation (or a DOM kit base); a canvas scene (SimScene) is checked by check-scene and shoot`); process.exit(2); }

// A scene (and the files it imports) unchanged since its last run gives the same answer: say so, reprint that
// answer, and do not launch a browser or spend a run. --fresh forces a run (kit or tool edits the hash cannot see).
const cacheOf = (f) => path.join(scratchFor(f), `${path.basename(f, '.js')}.layout-last.json`);
const optKey = JSON.stringify([opt.orient, opt.beats, opt.interact, A.val('bundle'), opt.kit, opt.root, A.val('look')]);
const keyOf = new Map(scenes.map((f) => [f, sourceHash(f) + optKey]));
const cachedHit = new Map();
const prevOf = new Map();
for (const f of scenes) {
  let c = null;
  try { c = JSON.parse(fs.readFileSync(cacheOf(f), 'utf8')); } catch { /* none yet */ }
  if (c) prevOf.set(f, c);
  if (c && c.key === keyOf.get(f) && !A.has('fresh')) cachedHit.set(f, c);
}
const toRun = scenes.filter((f) => !cachedHit.has(f));

// Run budget per scene (check-scene's own calls pass --no-count): the 4th run is refused unless --more.
if (!A.has('no-count')) {
  const stops = toRun.filter((f) => runCounter(path.join(scratchFor(f), `${path.basename(f, '.js')}.layout-runs`), { cap: 3, more: A.has('more') }).stop);
  if (stops.length) { console.error(`STOP: probe cap 3 reached for ${stops.map((f) => path.basename(f)).join(', ')}; record open: in the design note and move on`); process.exit(1); }
}

// A course's glossary.json (nearest ancestor of the scene) feeds glossary-driven scenes.
function glossaryFor(file) {
  let d = path.dirname(file);
  for (let i = 0; i < 6; i++, d = path.dirname(d)) {
    const g = path.join(d, 'glossary.json');
    if (fs.existsSync(g)) return '&glossary=' + encodeURIComponent('/' + path.relative(rootDir, g).split(path.sep).join('/'));
  }
  return '';
}

function fieldGuideFor(file) {
  let d = path.dirname(file);
  for (let i = 0; i < 6; i++, d = path.dirname(d)) {
    const g = path.join(d, 'field-guide.json');
    if (fs.existsSync(g)) return '&fieldguide=' + encodeURIComponent('/' + path.relative(rootDir, g).split(path.sep).join('/'));
  }
  return '';
}

function loadPlaywright() {
  const pw = playwright();
  if (pw) return pw;
  console.error('sim-layout needs Playwright (npm i -D playwright && npx playwright install chromium).');
  process.exit(2);
}
const { chromium } = loadPlaywright();

function findUp(start, name) {
  let d = fs.statSync(start).isDirectory() ? start : path.dirname(start);
  for (;;) {
    if (fs.existsSync(path.join(d, name))) return path.join(d, name);
    const up = path.dirname(d);
    if (up === d) return null;
    d = up;
  }
}
const kitDir = path.resolve(opt.kit || findUp(scenes[0], 'simulations-kit') || path.join(HERE, '../../simulations-kit'));
let rootDir = opt.root ? path.resolve(opt.root) : null;
if (!rootDir) {
  const courses = findUp(scenes[0], 'courses');
  rootDir = courses ? path.dirname(courses) : path.dirname(scenes[0]);
}

const MIME = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const base = u.startsWith('/__kit/') ? kitDir : rootDir;
  const rel = u.startsWith('/__kit/') ? u.slice(7) : u.slice(1);
  const f = path.join(base, rel);
  if (!f.startsWith(base) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('404'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;

function beatCount(src) {
  const m = src.match(/BEAT_STEP_MAP\s*=\s*\[([\s\S]*?)\n\];/);
  const n = getDeclaredBeatCount(src) ?? (m ? (m[1].match(/^\s*\[\s*\{/gm) || []).length : 0);
  const b = src.match(/static\s+BEATS\s*=\s*(\d+)/);
  return n || (b ? Number(b[1]) : Number(opt.beats));
}

// Runs in the page, once per beat.
function measure() {
  const scene = window.__scene, root = scene.root, C = scene.constructor;
  const scale = root.getBoundingClientRect().width / root.offsetWidth || 1;
  const rr = root.getBoundingClientRect();
  const styles = [...document.querySelectorAll('#sim-host style')];
  const own = styles.filter((s) => !s.textContent.includes('--sim-space-1:'));
  const ownChars = own.reduce((n, s) => n + s.textContent.length, 0);
  const prev = root.style.height;
  root.style.height = 'auto';
  // A scene whose root scrolls (a fixed phone frame) has no natural height beyond its frame.
  const rootScrolls = ['auto', 'scroll'].includes(getComputedStyle(root).overflowY);
  const natural = rootScrolls ? root.offsetHeight : Math.max(root.offsetHeight, root.scrollHeight);
  const naturalW = root.scrollWidth;
  root.style.height = prev;
  const declared = parseFloat(prev) || root.offsetHeight;
  // A rotated or scaled element's bounding boxes are not comparable to its text's; skip those.
  const rotated = (el) => {
    for (let a = el; a && a !== root; a = a.parentElement) {
      const t = getComputedStyle(a).transform;
      if (t && t !== 'none') { const m = t.match(/matrix\(([^)]+)\)/); if (m) { const v = m[1].split(',').map(Number); if (Math.abs(v[1]) > 0.01 || Math.abs(v[2]) > 0.01 || Math.abs(v[0] - 1) > 0.01 || Math.abs(v[3] - 1) > 0.01) return true; } }
    }
    return false;
  };
  // Where an SVG clip leaves a visible area (screen px), or null: a nested <svg> clips to its x/y/width/height viewport
  // (overflow hidden by default; its bounding box still includes the overflowing content), and a clip-path url(#id)
  // clips to the clipPath's shapes (userSpaceOnUse). Other clip-path values (inset, ...) clip to the element's own box.
  const svgClipBox = (a, cs) => {
    try {
      const box = (m, x0, y0, x1, y1) => {
        const pts = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([x, y]) => new DOMPoint(x, y).matrixTransform(m));
        return { left: Math.min(...pts.map((p) => p.x)), top: Math.min(...pts.map((p) => p.y)), right: Math.max(...pts.map((p) => p.x)), bottom: Math.max(...pts.map((p) => p.y)) };
      };
      const out = [];
      if (a instanceof SVGSVGElement && a.ownerSVGElement && cs.overflowX !== 'visible') {
        const m = a.parentNode.getScreenCTM(), x = a.x.baseVal.value, y = a.y.baseVal.value;
        if (m) out.push(box(m, x, y, x + a.width.baseVal.value, y + a.height.baseVal.value));
      }
      const cp = cs.clipPath;
      if (cp && cp !== 'none') {
        const id = /url\(["']?#([^"')]+)["']?\)/.exec(cp);
        const el = id && document.getElementById(id[1]);
        if (el && a.getScreenCTM && el.getAttribute('clipPathUnits') !== 'objectBoundingBox') {
          let u = null;
          for (const c of el.children) {
            if (!c.getBBox) continue;
            const b = c.getBBox(), t = c.transform && c.transform.baseVal.numberOfItems ? c.transform.baseVal.consolidate().matrix : new DOMMatrix();
            const bb = box(t, b.x, b.y, b.x + b.width, b.y + b.height);
            u = u ? { left: Math.min(u.left, bb.left), top: Math.min(u.top, bb.top), right: Math.max(u.right, bb.right), bottom: Math.max(u.bottom, bb.bottom) } : bb;
          }
          if (u) out.push(box(a.getScreenCTM(), u.left, u.top, u.right, u.bottom));
        } else if (!id) { const ar = a.getBoundingClientRect(); out.push({ left: ar.left, top: ar.top, right: ar.right, bottom: ar.bottom }); }
      }
      return out;
    } catch (_) { return []; }
  };
  let clip = null, minFont = 99, minCls = '', boxOver = null;
  for (const e of root.querySelectorAll('*')) {
    if (e.closest('style, script, defs, title')) continue;
    const cs = getComputedStyle(e);
    if (cs.display === 'none' || cs.visibility === 'hidden' || !e.getClientRects().length) continue;
    // An SVG group paints nothing itself: its box is the union of its children (hidden ones too), and they are measured on their own.
    if (e.tagName === 'g') continue;
    const r = e.getBoundingClientRect();
    if (!r.width && !r.height) continue;
    // What a learner can see of this element: not at opacity ~0, and only the part an overflow:hidden/auto
    // ancestor (below the frame itself) lets through. A collapsed max-height:0 shelf, a faded-out group or a
    // slid-away chip is not "leaving the frame": it is not there.
    let vis = { left: r.left, top: r.top, right: r.right, bottom: r.bottom }, op = 1, gone = false;
    for (let a = e; a && a !== root; a = a.parentElement) {
      const as = getComputedStyle(a);
      op *= parseFloat(as.opacity);
      for (const ar of svgClipBox(a, as)) {
        vis = { left: Math.max(vis.left, ar.left), top: Math.max(vis.top, ar.top), right: Math.min(vis.right, ar.right), bottom: Math.min(vis.bottom, ar.bottom) };
        if (vis.right <= vis.left || vis.bottom <= vis.top) gone = true;
      }
      if (gone) break;
      if (a !== e && (as.overflowX !== 'visible' || as.overflowY !== 'visible')) {
        const ar = a.getBoundingClientRect();
        vis = { left: Math.max(vis.left, ar.left), top: Math.max(vis.top, ar.top), right: Math.min(vis.right, ar.right), bottom: Math.min(vis.bottom, ar.bottom) };
        if (vis.right <= vis.left || vis.bottom <= vis.top) { gone = true; break; }
      }
    }
    if (gone || op < 0.05) continue;
    if (!(e instanceof SVGElement) && cs.overflowX === 'visible' && cs.display !== 'inline' && e.childNodes.length && !rotated(e)) {
      // an in-flow child or text run that pokes out of this box's border edge
      let over = 0;
      for (const n of e.childNodes) {
        let cr = null;
        if (n.nodeType === 1) {
          const cc = getComputedStyle(n);
          if (n.tagName === 'STYLE' || cc.position === 'absolute' || cc.position === 'fixed' || cc.display === 'none' || n instanceof SVGElement || rotated(n)) continue;
          cr = n.getBoundingClientRect();
        } else if (n.nodeType === 3 && n.textContent.trim()) {
          const rg = document.createRange(); rg.selectNodeContents(n); cr = rg.getBoundingClientRect();
        }
        if (cr && cr.width) over = Math.max(over, (cr.right - r.right) / scale, (r.left - cr.left) / scale);
      }
      if (over > 5 && (!boxOver || over > boxOver.over)) boxOver = { over: Math.round(over), cls: String(e.getAttribute('class') || e.tagName).slice(0, 40) };
    }
    const shadow = /0px 3px 0px/.test(cs.boxShadow) ? 3 * scale : 0;
    // Inside a scroll region (overflow-y auto/scroll) the content may run past the
    // frame vertically: that is what the scrollbar is for. Only sideways counts.
    const scrolls = (() => { for (let a = e.parentElement; a; a = a === root ? null : a.parentElement) { const oy = getComputedStyle(a).overflowY; if (oy === 'auto' || oy === 'scroll') return true; } return false; })();
    const out = scrolls
      ? Math.max((rr.left - vis.left) / scale, (vis.right - rr.right) / scale)
      : Math.max((vis.bottom + shadow - rr.bottom) / scale, (rr.left - vis.left) / scale, (vis.right - rr.right) / scale, (rr.top - vis.top) / scale);
    if (out > 2.5 && (!clip || out > clip.out)) clip = { out: Math.round(out * 10) / 10, cls: String(e.getAttribute('class') || e.tagName).slice(0, 40), txt: (e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30) };
    const hasText = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (hasText && !(e instanceof SVGElement && e.tagName !== 'text' && e.tagName !== 'tspan')) {
      const fs = parseFloat(cs.fontSize);
      if (fs && fs < minFont) { minFont = fs; minCls = String(e.getAttribute('class') || e.tagName).slice(0, 40); }
    }
  }
  return {
    scale: Math.round(scale * 1000) / 1000, declared, natural, designW: root.offsetWidth, overflowW: naturalW - root.clientWidth,
    ownChars, clip, boxOver, minFont: minFont === 99 ? null : minFont, minCls,
    designH: [C.HEIGHT, C.PORTRAIT_HEIGHT],
  };
}

const browser = await chromium.launch();
const all = {};
let errors = 0, warns = 0;
const lines = [];
const orients = opt.orient === 'landscape' ? [false] : opt.orient === 'portrait' ? [true] : [false, true];

const labelOf = (f) => path.relative(rootDir, f).split(path.sep).join('/').replace(/^courses\/[^/]+\/simulations\//, '');
for (const [f, c] of cachedHit) {
  lines.push(...c.lines);
  if (!c.lines.length && !opt.quiet) lines.push(c.okLine);
  if (!opt.quiet) lines.push(`unchanged   ${labelOf(f)}  the scene and the files it imports are the same as the last run, so this is that run's result and no run was spent; edit the scene before running again (--fresh only after editing a kit file)`);
  errors += c.errors; warns += c.warns;
  Object.assign(all, c.all);
}
for (const file of toRun) {
  const l0 = lines.length, e0 = errors, w0 = warns, a0 = new Set(Object.keys(all)), sizes = [];
  const rel = path.relative(rootDir, file).split(path.sep).join('/');
  const src = fs.readFileSync(file, 'utf8');
  // A GameBoard is a mini-game@1 board: one mount, no beats, and the host's real widths (a 620 test host would scale its 1100 design to 0.56; a phone gives it 320).
  const game = sceneKindOf(file).chain.some((c) => c === 'GameBoard' || c === 'SortBoard');
  const beats = game ? 1 : beatCount(src);
  const hostw = (portrait) => (game ? (portrait ? 320 : Number(/static\s+WIDTH\s*=\s*(\d+)/.exec(src)?.[1] ?? 1100)) : portrait ? 380 : 620);
  const interact = opt.interact != null ? Number(opt.interact) : (/extends\s+(SlotBoardScene|KeyBuilderScene|NameDecoderScene|MonsterScene|GuessWhoScene|ConveyorScene|MuseumScene|CardPacksScene|ExpeditionScene|SortRushScene|KeyDashScene|WhackAMythScene|TimelineScene|FlowScene|AllocBoardScene)\b/.test(src) ? 30 : 10);
  const label = rel.replace(/^courses\/[^/]+\/simulations\//, '');
  for (const portrait of orients) {
    const tag = portrait ? 'P' : 'L';
    const page = await browser.newPage({ viewport: portrait ? { width: 420, height: 900 } : { width: 1280, height: 720 } });
    const pageErrs = [];
    page.on('pageerror', (e) => pageErrs.push(e.message));
    const found = [];
    const per = [];
    try {
      const url = `${origin}/__kit/preview-harness.html?sim=${encodeURIComponent('/' + rel)}&beats=${beats}&hostw=${hostw(portrait)}&portrait=${portrait ? 1 : 0}${glossaryFor(file)}${fieldGuideFor(file)}${lookQFor(file)}`;
      await page.goto(url);
      await page.waitForFunction(() => window.__ready === true, null, { timeout: 8000 });
      for (let k = 0; k < beats; k++) {
        await page.evaluate(([n, t]) => window.__scene.onBeatChange?.(n, t), [k, beats]);
        await page.waitForTimeout(320);
        const m = await page.evaluate(measure);
        per.push(m);
        if (interact > 0) {
          const worst = await page.evaluate(async ([n, seed]) => {
            let a = seed >>> 0;
            const rnd = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
            const root = window.__scene.root; let max = 0, unfit = 0;
            for (let i = 0; i < n; i++) {
              const els = [...root.querySelectorAll('button, [role=button], select, input[type=range], input[type=number]')].filter((e) => !e.disabled && e.getClientRects().length);
              if (els.length) {
                const e = els[Math.floor(rnd() * els.length)];
                if (e.tagName === 'SELECT') { e.selectedIndex = Math.floor(rnd() * e.options.length); e.dispatchEvent(new Event('change', { bubbles: true })); }
                else if (e.tagName === 'INPUT') {
                  // a dial: its minimum, maximum or middle (the extremes are where text gets longer and rows wrap)
                  const lo = Number(e.min || 0), hi = Number(e.max || 100), pick = [lo, hi, (lo + hi) / 2][Math.floor(rnd() * 3)];
                  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(e, String(pick));
                  e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true }));
                } else e.click();
              }
              await new Promise((r) => setTimeout(r, 20));
              const o = root.style.height; root.style.height = 'auto'; const rootScrolls = ['auto', 'scroll'].includes(getComputedStyle(root).overflowY); const nat = rootScrolls ? root.offsetHeight : Math.max(root.offsetHeight, root.scrollHeight); root.style.height = o;
              max = Math.max(max, nat); unfit = Math.max(unfit, nat - (parseFloat(o) || nat));
            }
            return { max, unfit };
          }, [interact, 1234 + k]);
          m.worst = worst.max;
          // a scene that resizes itself (fitToContent) is fine; one that does not is clipped in that state
          if (worst.unfit > 8) found.push(['ERROR', 'clipped', `beat ${k}: an interaction state needs ${Math.round(worst.max)}px but the frame stays ${Math.round(worst.max - worst.unfit)}px`]);
          const staticH = portrait ? m.designH[1] : m.designH[0];
          if (staticH && !game && worst.max > staticH + 1) found.push(['WARN', 'static-height', `beat ${k}: an interaction state reaches ${Math.round(worst.max)}px, static ${portrait ? 'PORTRAIT_HEIGHT' : 'HEIGHT'} is ${staticH} (the host budgets the panel from the static value)`]);
        }
        if (k === 0 && m.ownChars === 0) found.push(['ERROR', 'unstyled', 'no scene CSS is mounted (SIM_UI_CSS inside your render css? drop it: DomSimulation injects it)']);
        if (m.natural > m.declared + 8 && !m.clip) found.push(['WARN', 'tight', `beat ${k}: content ${Math.round(m.natural)}px > declared ${Math.round(m.declared)}px (eats the bottom padding)`]);
        if (m.boxOver) found.push(['ERROR', 'box-overflow', `beat ${k}: content of .${m.boxOver.cls} is ${m.boxOver.over}px wider than its box`]);
        if (m.clip) found.push(['ERROR', 'clipped', `beat ${k}: .${m.clip.cls}${m.clip.txt ? ` "${m.clip.txt}"` : ''} leaves the frame by ${m.clip.out}px (content ${Math.round(m.natural)}px, frame ${Math.round(m.declared)}px)${m.natural > m.declared + 8 ? `; set static ${portrait ? 'PORTRAIT_HEIGHT' : 'HEIGHT'} to about ${Math.round(m.natural + 12)}` : ''}`]);
        if (m.overflowW > 4) found.push(['WARN', 'h-overflow', `beat ${k}: content reaches ${Math.round(m.overflowW)}px into the right padding (an element wider than its column)`]);
        if (m.minFont && (m.minFont < 14 || m.minFont * m.scale < 11)) found.push(['WARN', 'small-text', `beat ${k}: ${m.minFont}px (${Math.round(m.minFont * m.scale * 10) / 10}px on screen) in .${m.minCls}`]);
      }
    } catch (e) {
      found.push(['ERROR', 'load', String(e.message).split('\n')[0].slice(0, 100) + (pageErrs[0] ? ' | ' + pageErrs[0].slice(0, 100) : '')]);
    }
    await page.close();
    if (per.length) sizes.push(`${tag} ${Math.round(Math.max(...per.map((m) => m.natural)))}/${Math.round(per[0].declared)}px`);
    if (per.length && !per.some((m) => m.worst)) {
      const tallest = Math.max(...per.map((m) => m.natural));
      const declared = per[0].declared;
      if (declared - tallest > 48) found.push(['WARN', 'slack', `declared ${Math.round(declared)}px, tallest beat ${Math.round(tallest)}px`]);
    }
    // (phone-dock retired Q-86: since Q-57/Q-84 a phone lesson gives a docked or stacked scene the full
    // column width, about 330-358 px at 390, so the old 350 x 225 fit model was wrong, and its advice to set
    // simulation.fullWidth switched desktop slides to page flow.)
    // one line per distinct (kind, message-without-beat) to keep output short
    const seen = new Set();
    for (const [lvl, kind, msg] of found) {
      const key = lvl + kind + msg.replace(/^beat \d+: /, '');
      if (seen.has(key)) continue;
      seen.add(key);
      if (lvl === 'ERROR') errors++; else warns++;
      lines.push(`${lvl.padEnd(5)} ${tag} ${label}  ${kind}: ${msg}`);
    }
    all[`${label}|${tag}`] = { beats, per, problems: found.map(([l, k, m]) => `${l} ${k} ${m}`) };
  }
  const okLine = `ok           ${label}  (tallest beat / frame: ${sizes.join(', ')})`;
  if (!opt.quiet && !lines.some((l) => l.includes(` ${label} `))) lines.push(okLine);
  const mine = lines.slice(l0).filter((l) => !l.startsWith('ok '));
  const mineAll = Object.fromEntries(Object.entries(all).filter(([k]) => !a0.has(k)));
  const sig = JSON.stringify(Object.values(mineAll).flatMap((v) => v.problems).sort());
  const prev = prevOf.get(file);
  if (prev && prev.sig === sig && sig !== '[]') lines.push(`same        ${label}  the findings are the same as the last run: the edit did not change them; read the numbers above, change the cause, do not re-run to check`);
  // A load failure may be a one-off (timeout, port): never cache it, so the same scene can be run again.
  if (mine.some((l) => /\sload: /.test(l))) { try { fs.rmSync(cacheOf(file), { force: true }); } catch { /* ignore */ } continue; }
  try { fs.writeFileSync(cacheOf(file), JSON.stringify({ key: keyOf.get(file), lines: mine, okLine, errors: errors - e0, warns: warns - w0, all: mineAll, sig })); } catch { /* read-only: no cache */ }
}
await browser.close();
server.close();
console.log(lines.join('\n'));
console.log(`\n${scenes.length} scene(s): ${errors} error(s), ${warns} warning(s)`);
if (opt.json) { try { fs.mkdirSync(path.dirname(path.resolve(opt.json)), { recursive: true }); fs.writeFileSync(opt.json, JSON.stringify(all, null, 1)); } catch (e) { console.error(`--json: could not write ${opt.json}: ${e.message}`); } }
process.exit(errors || (opt.strict && warns) ? 1 : 0);
