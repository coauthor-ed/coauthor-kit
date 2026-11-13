#!/usr/bin/env node
// shoot - look at a scene in a real browser (Chromium via Playwright), with a
// text report so you know WHERE to look before opening any image.
//
//   node tools/sim-test/shoot.mjs <scene> [--bundle <id|dir>] [--beats N] [options]
//
// <scene>: a scene .js (or "L02/MyScene" with --bundle). Beats default to the
// attaching slide's real count (scene-info), else BEAT_STEP_MAP.length.
// Default run: one shot per beat, both themes, after the scene settles, then a
// contact sheet per scene. Every run first deletes that scene's old shots.
//   --steps='[...]' | --steps=@file.json   run these steps instead. A step may have:
//       beat: N           onBeatChange(N, beats); then waits until settled (below)
//       ctrl: [id, v]     onControlChange(id, v) (v = true for a button)
//       set: [sel, v]     a scene's own panel input (DomSimulation): range/number/select/checkbox, real events
//       click: sel        a real click on a panel element (sel: #id, [aria-label="x"], button:has-text("Run"))
//       tap: [x, y]       pointerdown + pointerup at design-space x, y (canvas scenes; a DOM scene: use click/set)
//       drag: [[x,y],...] pointerdown, moves, pointerup
//       wait: ms          wait this long after the step instead of settling
//       name: "label"     take a shot <Scene>-<theme>-<label>.png (only named steps shoot; if NO step
//                         has a name, every step is shot and named b<N> or s<i>). One ctrl per step.
//       probe: "js expr"  print a value (window.__scene is the scene)
//   --theme=dark|light|both (default both)   --portrait   --out <dir>   --dpr 2 (crisp HiDPI shots, 2x the pixels)
//   --setting <name> paint that kit setting behind the scene (harness ?setting=, e.g. lab) without editing
//                   the course manifest; 'none' forces it off. Part of the reuse key, so it re-renders.
//   --accent <name> the course signature colour (harness ?accent=, e.g. teal; default the bundle manifest's accent)
//   --look <id>     draw with that LookProfile (harness ?look=, default the bundle's look: bundle.json, else profile.json; else quill); same idea.
//   --reduced       emulate prefers-reduced-motion: reduce (every beat must show its end state, nothing should move)
//   --no-anim-wait  do not wait for running finite CSS animations/transitions before capture
//   --settle <ms>   max wait after a beat/ctrl step with no `wait` (default 4000);
//                   waits until the canvas stops changing for 400 ms, and prints
//                   what it waited and whether it settled
//   Same code, same options: a run whose scene file AND the local files it imports (not the kit) hash the same
//   as the last run's, with the same beats/steps/themes/--portrait, prints that run's report and shot paths and
//   renders nothing (the shots are still on disk). --force re-renders; --reset-rounds also forgets the last run.
//   Look-round budget: the first shot-taking run on changed scene code starts round 1, the next
//   change round 2; a third is refused (exit 3). --max-rounds N (default 2; 4 for a rich-profile scene), --reset-rounds.
//   --peek          a DRAFT look while you build: dark theme only, into build/peek/, own budget of 3 renders (unchanged code reprints, free), NOT a look round and
//                   the official shots are left alone. Use it after each beat is drawn instead of working out pixels in your head.
//   --report-only   no PNGs, no sheet: every beat, both themes, report only
//   --force         shoot even though the scene code (and its local imports) and the options are the same as the last
//                   run (default: that run's report is printed again and nothing is rendered - see below)
//   --no-sheet      skip the contact sheet   --sheet-scale <0..1> (default 0.5)
//
// Prints, per shot: the file, loop parked/running (read AT the shot, before the scene's 1.5 s idle park, so "loop
// running" on a static scene is expected; check-scene's freeze probe is the parking test), and (canvas) a text report
// using the browser's real font metrics:
//   overlap     two different texts intersect
//   off-canvas  text runs past the canvas edge
//   small       text under 13 design px
//   contrast    text vs the pixels around it under 3:1 (either theme)
//   empty       most of the centre (hero zone) is plain backdrop: hero too small
// WebGL scenes: pixels come from a screenshot (blank / one-colour frame FAIL,
// empty centre), text from the HTML label overlay (overlap, off-canvas, small).
// It also prints "ignored" for a ctrl on a hidden/disabled control and "busy"
// for a ctrl/tap sent while busy() was true - the scene may drop those.
// Shots go to build/shots/<bundle>/<folder>/ (ephemeral, like build/scratch).
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { format } from 'node:util';
import path from 'node:path';
import { sceneProfile } from './lib/profile.mjs';
import { bundleProfile } from '../staged-generation/lib/bundleProfile.mjs';
import { KIT_ROOT, bundleFromArg, resolveTarget, describeMiss, attachersOf, rel, timeBoxLine } from './lib/bundle.mjs';
import { serve, rootFor, playwright } from './lib/serve.mjs';
import { domSet, domClick } from './lib/domsteps.mjs';
import { analyseDom } from './lib/domreport.mjs';
import { checkFlags, parseSteps } from './lib/args.mjs';
import { getDeclaredBeatCount } from '../beat-check/parseBeatStepMap.mjs';
import { recorder } from './lib/textrec.mjs';

const args = process.argv.slice(2);
checkFlags(args, { tool: 'shoot', file: import.meta.url, usage: 'node tools/sim-test/shoot.mjs <L0N/Scene | Scene | path> [--bundle <id|dir>] [--beats N] [--steps=JSON|@file] [--report-only] [--theme=dark|light|both] [--portrait] [--reduced] [--out dir] [--settle ms] [--no-sheet] [--sheet-scale k] [--max-rounds N] [--reset-rounds] [--force] [--no-anim-wait] [--dpr 2] [--setting lab] [--accent teal] [--look quill]',
  val: ['bundle', 'beats', 'out', 'settle', 'sheet-scale', 'theme', 'steps', 'max-rounds', 'dpr', 'setting', 'accent', 'look'], bool: ['report-only', 'no-sheet', 'portrait', 'reduced', 'reset-rounds', 'peek', 'force', 'no-anim-wait'] });
const val = (k) => {
  const eq = args.find((a) => a.startsWith(`--${k}=`));
  if (eq) return eq.slice(k.length + 3);
  const i = args.indexOf(`--${k}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : null;
};
const has = (k) => args.includes(`--${k}`);
const valued = new Set(['--bundle', '--beats', '--out', '--settle', '--sheet-scale', '--theme', '--steps', '--max-rounds', '--dpr', '--setting', '--accent', '--look']);
const target = args.find((a, i) => !a.startsWith('--') && !valued.has(args[i - 1]));
if (!target) { console.error('usage: node tools/sim-test/shoot.mjs <scene> [--bundle <id|dir>] [--beats N] [--steps=JSON|@file] [--report-only] [--theme=dark|light|both] [--portrait]'); process.exit(2); }

const bundleDir = bundleFromArg(val('bundle'));
const t = resolveTarget(target, bundleDir);
if (!t || t.kind !== 'scene' || !fs.existsSync(t.file)) { console.error(t && t.kind === 'folder' ? `${target} is a lesson folder: name one scene (L0N/Scene)` : t ? `${target} resolves to ${t.file}, which does not exist yet (only the stub)` : describeMiss(target, bundleDir)); process.exit(2); }
const file = t.file;
const scene = path.basename(file, '.js');
const src = fs.readFileSync(file, 'utf8');
{ const tb = timeBoxLine(file.replace(/\.js$/, '.design.md')); if (tb) console.log(tb); }
let beats = Number(val('beats')) || 0;
if (!beats && t.bundle) {
  const counts = attachersOf(t.bundle, file).map((a) => a.beats).filter((n) => n);
  if (counts.length) beats = Math.max(...counts);
}
if (!beats) beats = getDeclaredBeatCount(src) || (src.match(/BEAT_STEP_MAP\s*=\s*\[([\s\S]*?)\]\s*;/)?.[1].match(/\[\s*\{/g) || []).length || 1;

const pw = playwright();
if (!pw) { console.error('shoot needs Playwright (npm i -g playwright && npx playwright install chromium)'); process.exit(2); }

const reportOnly = has('report-only');
const peek = has('peek');
const themes = (val('theme') || (peek ? 'dark' : 'both')) === 'both' ? ['dark', 'light'] : [val('theme') || 'dark'];
const portrait = has('portrait');
const reduced = has('reduced');
const noAnimWait = args.includes('--no-anim-wait');   // skip waiting for running finite CSS animations
const settleMax = Number(val('settle')) || (peek ? 1200 : 4000);   // a draft does not wait out ambient motion
const bundleName = t.bundle ? path.basename(t.bundle) : 'scene';
const out = path.resolve(val('out') || path.join(KIT_ROOT, 'build', peek ? 'peek' : 'shots', bundleName, path.basename(path.dirname(file))));
// Budget and last-run state live in the scene's default shots folder, never under --out: a custom --out must not
// give the scene a fresh round budget.
const stateDir = path.join(KIT_ROOT, 'build', 'shots', bundleName, path.basename(path.dirname(file)));
// The scene file plus the local files it imports (the course's own helpers), not the kit: a change to either redraws the scene.
function codeHash(f0) {
  const seen = new Set(); const parts = [];
  const walk = (f) => {
    if (seen.has(f) || seen.size > 40) return;
    seen.add(f);
    let t; try { t = fs.readFileSync(f, 'utf8'); } catch { return; }
    parts.push(f + '\n' + t);
    for (const m of t.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)['"](\.{1,2}\/[^'"]+)['"]/g)) {
      const g = path.resolve(path.dirname(f), m[1]);
      if (/[\\/](?:simulations-kit|base[\\/]kit|simulations[\\/]base)[\\/]/.test(g)) continue;
      if (g.endsWith('.js')) walk(g);
    }
  };
  walk(f0);
  return createHash('sha1').update(parts.join('\n--\n')).digest('hex').slice(0, 12);
}
const codeH = codeHash(file);
let steps;
if (val('steps')) {
  steps = parseSteps(val('steps'), 'shoot');
} else steps = Array.from({ length: beats }, (_, b) => ({ beat: b, name: `b${b}` }));
if (!reportOnly && !steps.some((s) => s.name)) {
  const seen = new Map();
  steps.forEach((s, i) => { const base = s.beat != null ? `b${s.beat}` : `s${i}`; const n = seen.get(base) || 0; seen.set(base, n + 1); s.name = n ? `${base}-${n + 1}` : base; });
  console.log('(no step had a "name", so every step is shot: ' + steps.map((s) => s.name).join(', ') + ')');
}

// Look-round budget: a shot-taking run on scene code that changed since the last such run
// is a new round; more shoots of the same code are the same round. Round MAX+1 is refused.
// --peek: a DRAFT look while you build (dark theme, into build/peek/, own budget of 20): not a look round, does not touch
// or delete the official shots. Geometry is settled by looking at a rough drawing, not by arithmetic in your head.
if (!reportOnly && !peek) {
  // A rich-profile scene (docs/visual-profiles.md) gets 4 look rounds: polish needs iteration.
  const MAX = Number(val('max-rounds')) || (sceneProfile(t.file, bundleDir).profile === 'rich' ? 4 : 2);
  fs.mkdirSync(stateDir, { recursive: true });
  const rf = path.join(stateDir, `${scene}.rounds`);
  if (has('reset-rounds')) { fs.rmSync(rf, { force: true }); fs.rmSync(path.join(stateDir, `${scene}.last-shoot.json`), { force: true }); }
  let st = { n: 0, hash: '' };
  try { st = JSON.parse(fs.readFileSync(rf, 'utf8')); } catch { /* first round */ }
  const h = codeH;
  // A budget file from before the hash covered local imports: adopt the new hash, do not count a round.
  if (st.n > 0 && st.v !== 2) { st = { n: st.n, hash: h, v: 2 }; fs.writeFileSync(rf, JSON.stringify(st)); }
  const sameCode = st.hash === h && st.n > 0;
  if (st.hash !== h) {
    if (st.n >= MAX) {
      console.error(`STOP: look round budget used (${st.n} of ${MAX}) and the scene changed since. Do not shoot again.\nSet Status: look-pending in ${scene}.design.md, write what still looks wrong under open: and ## Requests, log, report (--report-only still works).\nA separate 3-look run continues (it starts with --reset-rounds), or a human deletes ${path.relative(process.cwd(), rf)}.`);
      process.exit(3);
    }
    st = { n: st.n + 1, hash: h, v: 2 };
    fs.writeFileSync(rf, JSON.stringify(st));
  }
  console.log(`look round ${st.n} of ${MAX}${sameCode ? ' (scene code unchanged since the last shot run: same round, nothing more spent)' : ''}${st.n >= MAX ? ' - the last. Afterwards change drawing code only for what check-scene or the text report states, re-run check-scene, stop (open: for anything you would need to SEE)' : ''}`);
}
// Same code, same options as the last run: print that run's report and render nothing.
const stepsRaw = val('steps');
let stepsKey = stepsRaw || null;
if (stepsRaw && stepsRaw.startsWith('@')) { try { stepsKey = stepsRaw + fs.readFileSync(stepsRaw.slice(1), 'utf8'); } catch { /* the steps parser reports it */ } }
// default look: the bundle's (bundle.json, else profile.json); quill adds nothing, so the URL and the shot cache key stay as before
const bundleLook = (() => { const B = bundleDir || t.bundle; if (!B || typeof B !== 'string') return null; const l = bundleProfile(path.dirname(path.dirname(B)), path.basename(B)).look; return l === 'quill' ? null : l; })();
const lookId = val('look') || bundleLook;
const reqKey = JSON.stringify({ h: codeH, beats, steps: stepsKey, themes, portrait, reduced, dpr: val('dpr') || null, setting: val('setting') || null, ...(val('accent') ? { accent: val('accent') } : {}), look: lookId || null, settle: val('settle') || null });
const lastFile = path.join(stateDir, peek ? `${scene}.last-peek.json` : `${scene}.last-shoot.json`);
if (!has('force')) {
  let last = null;
  try { last = JSON.parse(fs.readFileSync(lastFile, 'utf8')); } catch { /* no earlier run */ }
  if (last && last.key === reqKey && (reportOnly || (last.png && last.files.length && last.files.every((f) => fs.existsSync(f))))) {
    console.log(`REUSED: scene code (and the local files it imports) and these options are unchanged since the shoot at ${last.at}. Nothing was re-rendered; that run's report follows${last.png ? `, and its shots and sheet are still in ${rel(process.cwd(), path.dirname(last.files[0]))}` : ''}. Edit the scene, or pass --force, to shoot again.`);
    console.log(last.report);
    process.exit(last.code || 0);
  }
}
if (peek) {
  // Draft looks: own budget (PEEKS per scene, kept beside the round state so --out cannot reset it). An unchanged
  // scene reprints the last peek above and costs nothing; only a peek that renders counts.
  fs.mkdirSync(stateDir, { recursive: true });
  const pf = path.join(stateDir, `${scene}.peeks`);
  let used = 0;
  try { used = Number(fs.readFileSync(pf, 'utf8')) || 0; } catch { /* first peek */ }
  const PEEKS = 3;
  if (used >= PEEKS) { console.error(`STOP: ${used} peeks used for ${scene}. Finish the scene, run check-scene, then take your look round (shoot without --peek), or leave it look-pending.`); process.exit(3); }
  fs.writeFileSync(pf, String(used + 1));
  console.log(`peek ${used + 1} of ${PEEKS} (a draft look: dark theme, not a look round; your 2 look rounds are untouched)`);
}
if (!reportOnly) {
  fs.mkdirSync(out, { recursive: true });
  // This scene's shots and its contact sheet (an old sheet left behind looks like the current drawing).
  const mine = fs.readdirSync(out).filter((f) => f.endsWith('.png') && (f === `${scene}-sheet.png` || (f.startsWith(`${scene}-dark`) || f.startsWith(`${scene}-light`))));
  for (const f of mine) fs.unlinkSync(path.join(out, f));
  if (mine.length) console.log(`(deleted ${mine.length} old shot(s) of ${scene})`);
}

// Keep what this run prints, so an identical later run can show it again instead of re-rendering.
const teeBuf = [];
for (const m of ['log', 'error']) { const o = console[m].bind(console); console[m] = (...a) => { teeBuf.push(format(...a)); o(...a); }; }

// Serve the root above courses/ (scene-relative imports), the kit at /__kit/, shots at /__shots/.
const rootDir = rootFor(file);
// A course's glossary.json / field-guide.json (nearest ancestor of the scene) feed glossary-driven
// scenes (NameDecoderScene subclasses, the field-guide games); the harness needs the URL param.
function nearestParam(name, param) {
  let d = path.dirname(file);
  for (let i = 0; i < 6; i++, d = path.dirname(d)) {
    const g = path.join(d, name);
    if (fs.existsSync(g)) return `&${param}=${encodeURIComponent('/' + rel(rootDir, g))}`;
  }
  return '';
}
const extraParams = nearestParam('glossary.json', 'glossary') + nearestParam('field-guide.json', 'fieldguide')
  + (val('setting') ? `&setting=${encodeURIComponent(val('setting'))}` : '')
  + (val('accent') ? `&accent=${encodeURIComponent(val('accent'))}` : '')
  + (lookId ? `&look=${encodeURIComponent(lookId)}` : '');
const { server, origin } = await serve(rootDir, { '/__shots/': out });

// recorder (lib/textrec.mjs) runs in the page before any script: every fillText with its real
// font, transform and fill, grouped by frame (a full-canvas clear starts one).

// Runs in the page after a step: measure the last frame's texts and the canvas.
async function analyse(shotUrl) {
  const sc = window.__scene;
  let cv = document.querySelector('#sim-host canvas');
  if (!cv) return { dom: true };
  const W = sc.constructor.WIDTH || cv.width, H = sc.constructor.HEIGHT || cv.height;
  const gl = !cv.getContext('2d');
  const labels = [];
  if (gl) {
    // WebGL: read pixels from the screenshot (canvas box only), text from the HTML overlay.
    const r = cv.getBoundingClientRect(), host = document.querySelector('#sim-host').getBoundingClientRect();
    const im = new Image(); im.src = shotUrl; await im.decode();
    const c2 = document.createElement('canvas'); c2.width = Math.round(r.width); c2.height = Math.round(r.height);
    c2.getContext('2d').drawImage(im, r.left - host.left, r.top - host.top, r.width, r.height, 0, 0, r.width, r.height);
    const s = r.width / W;
    for (const el of document.querySelectorAll('#sim-host *')) {
      if (el.children.length || !el.textContent.trim() || el.closest('canvas')) continue;
      const cs = getComputedStyle(el), b = el.getBoundingClientRect();
      if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.35 || !b.width) continue;
      let o = 1; for (let e = el; e && e !== document.body; e = e.parentElement) o *= +getComputedStyle(e).opacity;
      if (o < 0.35) continue;
      labels.push({ text: el.textContent.trim(), x0: (b.left - r.left) / s, x1: (b.right - r.left) / s, y0: (b.top - r.top) / s, y1: (b.bottom - r.top) / s, fontPx: parseFloat(cs.fontSize) / s, fill: null });
    }
    cv = c2;
  }
  const k = cv.width / W;
  const ctx = cv.getContext('2d');
  const img = ctx.getImageData(0, 0, cv.width, cv.height).data;
  const px = (x, y) => { x = Math.max(0, Math.min(cv.width - 1, Math.round(x))); y = Math.max(0, Math.min(cv.height - 1, Math.round(y))); const i = (y * cv.width + x) * 4; return [img[i], img[i + 1], img[i + 2]]; };
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const probe = document.createElement('canvas').getContext('2d');
  const parseCol = (s) => { probe.fillStyle = '#000'; probe.fillStyle = s; const v = probe.fillStyle; if (v.startsWith('#')) return [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16)); const m = v.match(/[\d.]+/g); return m ? m.slice(0, 3).map(Number) : null; };
  const last = Math.max(...window.__texts.map((t) => t.frame), -1);
  const seen = new Set();
  const boxes = [];
  for (const t of gl ? [] : window.__texts.filter((q) => q.frame === last)) {   // WebGL: fillText only paints offscreen textures
    if (!t.text.trim() || (t.alpha ?? 1) < 0.35) continue;
    probe.font = t.font; probe.textAlign = t.align; probe.textBaseline = t.base;
    const mt = probe.measureText(t.text);
    const x0 = t.x - mt.actualBoundingBoxLeft, x1 = t.x + mt.actualBoundingBoxRight;
    const y0 = t.y - mt.actualBoundingBoxAscent, y1 = t.y + mt.actualBoundingBoxDescent;
    const [a, b, c, d, e, f] = t.m;
    const pts = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map(([x, y]) => [(a * x + c * y + e) / k, (b * x + d * y + f) / k]);
    const bx = { text: t.text, x0: Math.min(...pts.map((p) => p[0])), x1: Math.max(...pts.map((p) => p[0])), y0: Math.min(...pts.map((p) => p[1])), y1: Math.max(...pts.map((p) => p[1])) };
    const fontPx = parseFloat((t.font.match(/([\d.]+)px/) || [])[1] || '0') * Math.hypot(a, b) / k;
    const key = `${t.text}|${Math.round(bx.x0)}|${Math.round(bx.y0)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    bx.fontPx = fontPx; bx.fill = t.fill ? parseCol(t.fill) : null;
    boxes.push(bx);
  }
  boxes.push(...labels);
  const issues = [];
  if (gl) {
    const cols = new Set();
    for (let y = 0; y < cv.height; y += 7) for (let x = 0; x < cv.width; x += 7) cols.add(px(x, y).map((v) => v >> 4).join(','));
    if (cols.size < 4) issues.push(`blank: WebGL frame is ${cols.size} flat colour(s) - nothing rendered (context lost? resize? build() threw?)`);
  }
  const q = (s) => JSON.stringify(s.length > 28 ? s.slice(0, 26) + '..' : s);
  for (let i = 0; i < boxes.length; i++) {
    const A = boxes[i];
    if (A.x0 < -2 || A.y0 < -2 || A.x1 > W + 2 || A.y1 > H + 2) issues.push(`off-canvas ${q(A.text)} at (${Math.round(A.x0)},${Math.round(A.y0)})-(${Math.round(A.x1)},${Math.round(A.y1)})`);
    if (A.fontPx && A.fontPx < 13) issues.push(`small ${q(A.text)} ${A.fontPx.toFixed(1)}px`);
    for (let j = i + 1; j < boxes.length; j++) {
      const B = boxes[j];
      if (A.text === B.text) continue;
      const ix = Math.min(A.x1, B.x1) - Math.max(A.x0, B.x0), iy = Math.min(A.y1, B.y1) - Math.max(A.y0, B.y0);
      if (ix > 2 && iy > 2) issues.push(`overlap ${q(A.text)} x ${q(B.text)} at (${Math.round(Math.max(A.x0, B.x0))},${Math.round(Math.max(A.y0, B.y0))})`);
    }
    if (A.fill) {
      // background: the most common colour on a ring 3 px outside the box
      // The band the glyphs sit on: the ring above, or the ring beside and below (a chip's
      // thin gloss strip runs just above its text); the better of the two decides.
      const top = [], rest = [];
      for (let x = A.x0 - 3; x <= A.x1 + 3; x += 3) { top.push(px(x * k, (A.y0 - 3) * k)); rest.push(px(x * k, (A.y1 + 3) * k)); }
      for (let y = A.y0; y <= A.y1; y += 3) { rest.push(px((A.x0 - 3) * k, y * k), px((A.x1 + 3) * k, y * k)); }
      const dominant = (ring) => {
        const buckets = new Map();
        for (const p of ring) { const key2 = p.map((v) => v >> 4).join(','); const e2 = buckets.get(key2) || { n: 0, p }; e2.n++; buckets.set(key2, e2); }
        return [...buckets.values()].sort((m, n) => n.n - m.n)[0]?.p;
      };
      const bgs = [dominant(top), dominant(rest)].filter(Boolean);
      if (bgs.length) { const r = Math.max(...bgs.map((bg) => ratio(A.fill, bg))); if (r < 3) issues.push(`contrast ${q(A.text)} ${r.toFixed(1)}:1`); }
    }
  }
  // Empty centre: 40 px cells in the hero zone made almost only of backdrop colours
  // (the colours covering 90% of a 16 px strip round the frame). A flat-filled
  // object is not backdrop, however plain it is.
  const qkey = (p) => p.map((v) => v >> 4).join(',');
  const border = new Map(); let bn = 0;
  for (let x = 0; x < W; x += 3) for (const y of [4, 12, H - 12, H - 4]) { const key = qkey(px(x * k, y * k)); border.set(key, (border.get(key) || 0) + 1); bn++; }
  for (let y = 0; y < H; y += 3) for (const x of [4, 12, W - 12, W - 4]) { const key = qkey(px(x * k, y * k)); border.set(key, (border.get(key) || 0) + 1); bn++; }
  const back = new Set(); let acc = 0;
  for (const [key, n] of [...border.entries()].sort((m, o) => o[1] - m[1])) { if (acc / bn >= 0.96 || back.size >= 8) break; back.add(key); acc += n; }
  const zx0 = W * 0.25, zx1 = W * 0.75, zy0 = H * 0.15, zy1 = H * 0.85, cs = 40;
  let plain = 0, cells = 0;
  for (let cy = zy0; cy + cs <= zy1; cy += cs) for (let cx = zx0; cx + cs <= zx1; cx += cs) {
    cells++;
    let n = 0, inBack = 0;
    for (let y = cy; y < cy + cs; y += 2) for (let x = cx; x < cx + cs; x += 2) { n++; if (back.has(qkey(px(x * k, y * k)))) inBack++; }
    if (inBack / n >= 0.93) plain++;
  }
  if (cells && plain / cells > 0.45) {
    // Where the drawn things sit: the mean of the non-backdrop 40 px cells over the whole frame.
    let sx = 0, sy = 0, sn = 0;
    for (let cy = 0; cy + cs <= H; cy += cs) for (let cx = 0; cx + cs <= W; cx += cs) {
      let n = 0, inBack = 0;
      for (let y = cy; y < cy + cs; y += 4) for (let x = cx; x < cx + cs; x += 4) { n++; if (back.has(qkey(px(x * k, y * k)))) inBack++; }
      if (inBack / n < 0.93) { sx += cx + cs / 2; sy += cy + cs / 2; sn++; }
    }
    const ink = sn ? `; ink centre at x ${Math.round(sx / sn)}, y ${Math.round(sy / sn)} (hero zone x ${Math.round(zx0)}-${Math.round(zx1)}, y ${Math.round(zy0)}-${Math.round(zy1)}): move the hero into ZONES.hero` : '';
    issues.push(`empty centre: ${Math.round(100 * plain / cells)}% of the hero zone is plain backdrop${ink} (advisory: a full-width hero trips it; never add decoration to silence it)`);
  }
  return { texts: boxes.length, issues };
}

const browser = await pw.chromium.launch();
const errors = [];
const shots = [];
let reportIssues = 0;
const guardNote = async (page, id) => page.evaluate((cid) => {
  const s = window.__scene;
  const why = [];
  if (s.isControlHidden?.(cid)) why.push('hidden on this beat');
  if (s.isControlDisabled?.(cid)) why.push('disabled');
  if (!(s.constructor.CONTROLS || []).some((c) => c.id === cid)) why.push('no such control id');
  return { why, busy: !!s.busy?.() };
}, id);
// A cheap fingerprint of what is on screen: the canvas pixels (sampled) or the scene's markup.
const pageSig = (page) => page.evaluate(() => {
  const cv = document.querySelector('#sim-host canvas');
  if (cv) {
    const c2 = cv.getContext('2d');
    if (!c2) return 'webgl';
    const d = c2.getImageData(0, 0, cv.width, cv.height).data;
    let x = 0; for (let i = 0; i < d.length; i += 53) x = (x * 31 + d[i]) | 0;
    return String(x);
  }
  return document.querySelector('#sim-host')?.innerHTML || '';
});
async function settle(page, maxMs) {
  const t0 = Date.now();
  let lastHash = null, stableSince = Date.now();
  while (Date.now() - t0 < maxMs) {
    await page.waitForTimeout(100);
    // finite CSS animations/transitions (also in shadow roots) still running: not settled, e.g. staggered bar grows
    if (!noAnimWait && await page.evaluate(() => document.getAnimations().some((a) => a.playState === 'running' && Number.isFinite(a.effect?.getComputedTiming().endTime)))) { stableSince = Date.now(); continue; }
    let h = await page.evaluate(() => {
      const cv = document.querySelector('#sim-host canvas');
      if (!cv) {
        // DOM/SVG: hash the whole markup, not its length (a stepwise repaint of same-length paths changed nothing
        // in the length and read as settled; Q-86). The dom: prefix marks a DOM hash for the longer quiet window.
        const s = document.querySelector('#sim-host')?.innerHTML ?? '';
        let x = 0; for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) | 0;
        return `dom:${x}:${s.length}`;
      }
      const c2 = cv.getContext('2d');
      if (!c2) return null;   // WebGL: hash a screenshot below
      const d = c2.getImageData(0, 0, cv.width, cv.height).data;
      let x = 0; for (let i = 0; i < d.length; i += 97) x = (x * 31 + d[i]) | 0; return x;
    });
    if (h === null) h = createHash('sha1').update(await page.locator('#sim-host').screenshot()).digest('hex');
    if (h !== lastHash) { lastHash = h; stableSince = Date.now(); }
    // A DOM scene that builds in steps often pauses about 400 ms between them: wait out a longer quiet spell.
    else if (Date.now() - stableSince >= (String(h).startsWith('dom:') ? 700 : 400)) return { waited: Date.now() - t0, settled: true };
  }
  return { waited: Date.now() - t0, settled: false };
}

for (const theme of themes) {
  const page = await browser.newPage({ viewport: { width: 900, height: 1100 }, deviceScaleFactor: Number(val('dpr')) || 1 });
  if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
  page.on('console', (m) => { if (m.type() === 'error' && !(/404/.test(m.text()) && /\/manifest\.json$/.test(m.location().url || ''))) errors.push(`${theme}: ${m.text()}`); });   // optional manifest.json probe: a 404 is fine
  page.on('pageerror', (e) => errors.push(`${theme}: ${e.message}`));
  await page.addInitScript((th) => {
    const set = () => document.documentElement && (document.documentElement.dataset.theme = th);
    set(); document.addEventListener('readystatechange', set);
  }, theme);
  await page.addInitScript(recorder);
  const simUrl = '/' + rel(rootDir, file);
  await page.goto(`${origin}/__kit/preview-harness.html?sim=${encodeURIComponent(simUrl)}&beats=${beats}&hostw=${portrait ? 380 : 680}${portrait ? '&portrait=1' : ''}${extraParams}`);
  try { await page.waitForFunction(() => window.__ready === true, null, { timeout: 15000 }); }
  catch { errors.push(`${theme}: harness never became ready (see page errors)`); await page.close(); continue; }
  const walk = reportOnly && !val('steps') ? Array.from({ length: beats }, (_, b) => ({ beat: b, name: `b${b}` })) : steps;
  for (const s of walk) {
    const notes = [];
    const unknownKeys = Object.keys(s).filter((k) => !['beat', 'ctrl', 'set', 'click', 'tap', 'drag', 'wait', 'name', 'probe'].includes(k));
    if (unknownKeys.length) notes.push(`ignored: unknown step key(s) ${unknownKeys.join(', ')} (a shoot step has beat, ctrl, set, click, tap, drag, wait, name, probe)`);
    if (s.beat != null) await page.evaluate(([b, n]) => { window.__scene.onBeatChange?.(b, n); window.__scene.requestUiUpdate?.(); }, [s.beat, beats]);
    if (s.ctrl) {
      const g = await guardNote(page, s.ctrl[0]);
      if (g.why.length) notes.push(`ignored? ctrl ${s.ctrl[0]}: ${g.why.join(', ')}`);
      if (g.busy) notes.push(`busy: ctrl ${s.ctrl[0]} sent while busy() was true`);
      await page.evaluate(([id, v]) => { window.__scene.onControlChange(id, v); window.__scene.requestUiUpdate?.(); }, s.ctrl);
    }
    // A tap/drag/click/set that changes nothing usually hit nothing (canvas coordinates on a DOM scene, a wrong selector).
    const acts = !!(s.tap || s.drag || s.click || s.set);
    const before = acts ? await pageSig(page) : null;
    if (s.set) { const r = await domSet(page, s.set[0], s.set[1]); if (r.fail) notes.push(`ignored? ${r.fail}`); }
    if (s.click) { const r = await domClick(page, s.click); if (r.fail) notes.push(`ignored? ${r.fail}`); }
    const ptr = s.tap ? [s.tap, s.tap] : s.drag;
    if (ptr) {
      if (await page.evaluate(() => !!window.__scene.busy?.())) notes.push('busy: pointer sent while busy() was true');
      await page.evaluate((pts) => {
        const sc = window.__scene;
        const el = document.querySelector('#sim-host canvas') || document.querySelector('#sim-host');
        const r = el.getBoundingClientRect();
        const W = sc.constructor.WIDTH || r.width, H = sc.constructor.HEIGHT || r.height;
        const at = (type, [x, y]) => el.dispatchEvent(new PointerEvent(type, { clientX: r.left + x * r.width / W, clientY: r.top + y * r.height / H, bubbles: true, pointerId: 1, isPrimary: true }));
        at('pointerdown', pts[0]);
        for (const q of pts.slice(1, -1)) at('pointermove', q);
        at('pointermove', pts[pts.length - 1]);
        at('pointerup', pts[pts.length - 1]);
      }, ptr);
    }
    let waitNote;
    if (s.wait != null) { await page.waitForTimeout(s.wait); waitNote = `waited ${s.wait}ms`; }
    else if (s.beat != null || s.ctrl || s.set || s.click || ptr) {
      const r = await settle(page, settleMax);
      // Ambient decoration (drifting depth shapes, motes) never lets the canvas go still: that is fine when busy() is false.
      const stillBusy = r.settled ? false : await page.evaluate(() => !!window.__scene.busy?.());
      waitNote = r.settled ? `settled after ${r.waited}ms` : stillBusy ? `still moving after ${r.waited}ms and busy() is true: a run longer than --settle? add a "wait"` : `ambient motion only after ${r.waited}ms (busy() false): fine`;
    }
    if (before !== null && before !== 'webgl' && before === await pageSig(page)) notes.push('no visible change after this step: did the tap/click hit anything? (a DOM scene has no canvas coordinates: use {"click": "<selector>"} or {"set": [sel, v]}; drive-dom --inputs lists the selectors)');
    for (const n of notes) console.log(`${theme} ${s.name || ''}: ${n}`);
    if (s.probe) console.log(`${theme} ${s.name || ''} ${s.probe} =`, await page.evaluate((e) => { try { return JSON.stringify(eval(e)); } catch (err) { return 'ERR ' + err.message; } }, s.probe));
    if (s.name) {
      const loop = await page.evaluate(() => { const sc = window.__scene; if (!sc._canvas && typeof sc._tick !== 'function') return 'no frame loop'; return sc._rafId == null ? 'loop parked' : 'loop running (at shot time: fine)'; });
      const isGl = await page.evaluate(() => { const cv = document.querySelector('#sim-host canvas'); return !!cv && !cv.getContext('2d'); });
      const shotUrl = isGl ? 'data:image/png;base64,' + (await page.locator('#sim-host').screenshot()).toString('base64') : null;
      let a = await page.evaluate(analyse, shotUrl);
      if (a.dom) a = await page.evaluate(analyseDom);
      const label = `${scene}-${theme}${portrait ? '-portrait' : ''}${reduced ? '-reduced' : ''}-${s.name}`;
      let line;
      if (reportOnly) line = `${theme} ${s.name}`;
      else {
        const f = path.join(out, `${label}.png`);
        await page.locator('#sim-host').screenshot({ path: f });
        shots.push({ theme, name: s.name, file: f });
        line = rel(process.cwd(), f);
      }
      console.log(`${line}  (${waitNote || 'no wait'}; ${loop})${a.issues.length ? '' : `  text ok (${a.texts})`}`);
      for (const i of a.issues || []) { reportIssues++; console.log(`    ${i}`); }
    }
  }
  await page.close();
}

// Contact sheet: one row per shot name, one column per theme.
if (!reportOnly && !has('no-sheet') && shots.length > 1) {
  const scale = Number(val('sheet-scale')) || 0.5;
  const names = [...new Set(shots.map((s) => s.name))];
  const cols = themes.filter((th) => shots.some((s) => s.theme === th));
  const cell = (s) => (s ? `<img src="/__shots/${path.basename(s.file)}" style="zoom:${scale}">` : '');
  const html = `<!doctype html><body style="margin:0;background:#888;font:13px sans-serif"><table cellspacing="4">${names.map((n) => `<tr><td style="color:#fff;writing-mode:vertical-rl">${n}</td>${cols.map((th) => `<td>${cell(shots.find((s) => s.name === n && s.theme === th))}</td>`).join('')}</tr>`).join('')}</table></body>`;
  fs.writeFileSync(path.join(out, `.${scene}-sheet.html`), html);
  const page = await browser.newPage({ viewport: { width: 400, height: 300 } });
  await page.goto(`${origin}/__shots/.${scene}-sheet.html`);
  await page.waitForLoadState('networkidle');
  const sheet = path.join(out, `${scene}-sheet.png`);
  await page.locator('table').screenshot({ path: sheet });
  fs.unlinkSync(path.join(out, `.${scene}-sheet.html`));
  console.log(`sheet: ${rel(process.cwd(), sheet)}  (${names.length} row(s) x ${cols.join('/')}; view this first, open single shots only where it or the report points)`);
}
await browser.close();
server.close();
console.log(`page errors: ${errors.length ? '\n' + errors.join('\n') : 'none'}`);
if (!reportOnly && !shots.length) { console.log('NO SHOTS TAKEN: no step had a "name" (or the step list was empty). The report above covers nothing.'); process.exitCode = 2; }
console.log(`report: ${reportIssues} issue(s)`);
if (!process.exitCode) {
  try {
    fs.mkdirSync(stateDir, { recursive: true });
    fs.writeFileSync(lastFile, JSON.stringify({ key: reqKey, at: new Date().toISOString(), png: !reportOnly, files: shots.map((x) => x.file), code: errors.length ? 1 : 0, report: teeBuf.join('\n') }));
  } catch { /* the cache is an optimisation */ }
}
process.exit(errors.length ? 1 : 0);
