#!/usr/bin/env node
// Adapted from cth9191/animate@7e5eb56 plugins/animate/skills/animate/tools/review.mjs (MIT, (c) 2026 cth9191)
// Adapted from cth9191/animate@7e5eb56 plugins/animate/skills/animate/tools/tile.mjs (MIT, (c) 2026 cth9191)
// Adapted from cth9191/animate@7e5eb56 plugins/animate/skills/animate/tools/textcheck.mjs (MIT, (c) 2026 cth9191)
// Adapted from wheresryan22/anatomy@e6600ff scripts/turn-check.mjs (MIT, (c) 2026 Ryan)
// Adapted from wheresryan22/anatomy@e6600ff scripts/drive.mjs (MIT, (c) 2026 Ryan)
// Adapted from alchaincyf/huashu-art-motion@64cb272 scripts/qa.py (MIT, (c) 2026 alchaincyf)
//
// motion-probe - watch a canvas scene MOVE in a real browser (Chromium, page.clock: exact
// scene time, runs fast). shoot judges the settled frame; this judges the motion between.
//
//   node tools/sim-test/motion-probe.mjs <scene> [--bundle <id|dir>] [--beats N] [--theme dark|light|both] [--sheet] [--cap s] [--verbose] [--look id]
//   --look <id>  draw with that LookProfile (harness ?look=, default the bundle's look; quill adds nothing).
//
// Beats: the attaching slides' count (as shoot), else BEAT_STEP_MAP. Canvas scenes only (WebGL, DOM:
// skipped). Each beat is sampled every 2 frames (32 ms: 1/30 s, a phone screen recording's rate;
// a 1-frame glitch can fall between samples, anything a learner can follow cannot) from the beat
// change until the loop parks, then watched in 250 ms steps up to --cap (default 8 s) for a late
// wake. Samples are the canvas cut to 96 px wide grey (as animate review.mjs). Math.random is
// seeded, and reseeded on every onBeatChange, so runs are comparable.
//   dead beat   WARN: a still stretch over 4 s that more motion ends, or with busy() true all
//               through; or a beat whose first visible change comes over 4 s after the change.
//               "Still": change vs the last change's frame under max(0.25, 0.25 x median 0.5 s
//               change) (animate's max(0.8, .25 median), floor re-tuned for small 680x520 props).
//   pop         WARN: one 1/30 s step changes over 4% of the frame and over 6x both neighbours
//               (huashu qa jump: peak/median > 6 and peak > 3%; anatomy turn-check's second
//               difference, taken per frame, not per pixel: per pixel, any fast move trips it).
//               The step INTO a beat change is exempt: Next is the learner's own cut, and
//               SimScene's iris then opens smoothly over 0.45 s, which is checked as usual.
//   repaint     FAIL: _tick(ctx, 0) twice at the same t (the host's own theme repaint) gives
//               different pixels: Math.random or a time read inside draw (use rng(seed)).
//   resume      WARN: a beat's frame at its first park differs walked forward / walked in
//               reverse / mounted straight on it (animate tile.mjs reverse-order re-render):
//               a resume leak in pixels; resume-probe names the field.
//   text        WARN: overlap (real quads clipped, over 25% of the smaller: textcheck.mjs; shoot
//               boxes are axis-aligned, which over-reports tilted labels) or off-canvas, for
//               0.2 s or more mid-motion, and gone by the end (shoot reports the settled frame).
//               Skipped: steps where over 25% of the frame changes (a bridge, an iris, a camera
//               move; textcheck skips morph bridges), and off-canvas for text drawn zoomed past
//               1.15x (a camera push: the frame is a window into the world) or wholly outside
//               the frame (nobody sees it); off-canvas = cut by the frame edge.
//               Mid-motion overlap can be intended (a label sliding past): look at the sheet.
//   --sheet     slow-clock contact sheet per theme (anatomy drive.mjs "sheet" at 0.05x): a row
//               per beat, 10 frames from the beat change to its last change, labelled with t. Every
//               timer runs on the fake clock, so an idle tour cannot fire mid-sheet (the
//               verify.md trap). Into build/shots/<bundle>/<folder>/<Scene>-motion-<theme>.png.
// Exit 1 only on FAIL (and page errors). Last line: "motion-probe: N warn, M fail".
import fs from 'node:fs';
import path from 'node:path';
import { KIT_ROOT, bundleFromArg, resolveTarget, describeMiss, attachersOf, rel, sceneKindOf } from './lib/bundle.mjs';
import { serve, rootFor, playwright } from './lib/serve.mjs';
import { parseArgs } from './lib/args.mjs';
import { recorder } from './lib/textrec.mjs';
import { bundleProfile } from '../staged-generation/lib/bundleProfile.mjs';

const USAGE = 'node tools/sim-test/motion-probe.mjs <L0N/Scene | Scene | path> [--bundle <id|dir>] [--beats N] [--theme dark|light|both] [--sheet] [--cap s] [--verbose] [--look id]';
const A = parseArgs(process.argv.slice(2), { tool: 'motion-probe', file: import.meta.url, usage: USAGE, val: ['bundle', 'beats', 'theme', 'cap', 'look'], bool: ['sheet', 'verbose'] });
const target = A.pos[0];
if (!target) { console.error(`usage: ${USAGE}`); process.exit(2); }
const bundleDir = bundleFromArg(A.val('bundle'));
const T = resolveTarget(target, bundleDir);
if (!T || T.kind !== 'scene' || !fs.existsSync(T.file)) { console.error(T && T.kind === 'folder' ? `${target} is a lesson folder: name one scene (L0N/Scene)` : T ? `${target} resolves to ${T.file}, which does not exist yet` : describeMiss(target, bundleDir)); process.exit(2); }
const bundleLook = (() => { const B = bundleDir || T.bundle; if (!B || typeof B !== 'string') return null; const l = bundleProfile(path.dirname(path.dirname(B)), path.basename(B)).look; return l === 'quill' ? null : l; })();
const lookId = A.val('look') || bundleLook;
const lookQ = lookId ? `&look=${encodeURIComponent(lookId)}` : '';
const file = T.file, scene = path.basename(file, '.js');
const src = fs.readFileSync(file, 'utf8');
const { kind } = sceneKindOf(file);
if (kind === 'dom' || kind === 'webgl') { console.log(`## ${scene}: skip - ${kind} scene (motion-probe reads a 2D canvas)\nmotion-probe: 0 warn, 0 fail`); process.exit(0); }
let beats = Number(A.val('beats')) || 0;
if (!beats && T.bundle) { const c = attachersOf(T.bundle, file).map((a) => a.beats).filter((n) => n); if (c.length) beats = Math.max(...c); }
if (!beats) beats = (src.match(/BEAT_STEP_MAP\s*=\s*\[([\s\S]*?)\]\s*;/)?.[1].match(/\[\s*\{/g) || []).length || 1;
const th = A.val('theme') || 'dark';
if (!['dark', 'light', 'both'].includes(th)) { console.error('motion-probe: --theme is dark, light or both'); process.exit(2); }
const themes = th === 'both' ? ['dark', 'light'] : [th];
const SHEET = A.has('sheet'), VERBOSE = A.has('verbose');
const CAP = (Number(A.val('cap')) || 8) * 1000;
const STEP = 32, COARSE = 250, LAG = 15;           // 2 frames; parked watch; 15 x 32 ms = 0.48 s (animate's 0.5 s lag)
const DEAD_S = 4, STILL_FLOOR = 0.25, POP_ABS = 0.04, POP_K = 6, POP_FLOOR = 0.002;
const CAM_FRAC = 0.25, RESUME_FRAC = 0.004, RESUME_MEAN = 0.4, REPAINT_FRAC = 0.0005, TEXT_MIN_S = 0.2;
const pw = playwright();
if (!pw) { console.error('motion-probe needs Playwright (npm i -g playwright && npx playwright install chromium)'); process.exit(2); }

const rootDir = rootFor(file);
const simUrl = '/' + rel(rootDir, file);
const extra = ['glossary.json', 'field-guide.json'].map((n, i) => {
  let d = path.dirname(file);
  for (let k = 0; k < 6; k++, d = path.dirname(d)) { const g = path.join(d, n); if (fs.existsSync(g)) return `&${i ? 'fieldguide' : 'glossary'}=${encodeURIComponent('/' + rel(rootDir, g))}`; }
  return '';
}).join('');
const { server, origin } = await serve(rootDir);
const browser = await pw.chromium.launch();
const errors = [];
let warns = 0, fails = 0;
const WARN = (s) => { warns++; console.log('  WARN ' + s); };
const FAIL = (s) => { fails++; console.log('  FAIL ' + s); };
const info = (s) => { if (VERBOSE) console.log('  info ' + s); };
const q = (s) => JSON.stringify(s.length > 28 ? s.slice(0, 26) + '..' : s);
const f2 = (ms) => (ms / 1000).toFixed(2);

// Page side, before any script: a seeded Math.random, reseeded on every onBeatChange (the
// scene is caught as the harness stores it on window.__scene), and the sampler.
function pageInit() {
  let s = 0x5eed;
  Math.random = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  let held;
  Object.defineProperty(window, '__scene', { configurable: true, get: () => held, set: (v) => {
    held = v;
    const ob = v && v.onBeatChange;
    if (typeof ob === 'function') v.onBeatChange = function (...a) { s = 0x5eed; return ob.apply(this, a); };
    // SimScene's flash() / shake() snap by design (celebrate, oops): the step they start in is no pop.
    for (const m of ['flash', 'shake']) { const f = v && v[m]; if (typeof f === 'function') v[m] = function (...a) { mp.snap = true; return f.apply(this, a); }; }
  } });
  const mp = window.__mp = {};
  mp.setup = (o) => {
    const sc = window.__scene, cv = document.querySelector('#sim-host canvas');
    if (!cv || !cv.getContext('2d')) return false;
    Object.assign(mp, { sc, cv, W: sc.constructor.WIDTH || cv.width, H: sc.constructor.HEIGHT || cv.height, w: 96, h: Math.round(96 * cv.height / cv.width), sheet: o.sheet, tw: 170 });
    mp.th = Math.round(mp.tw * cv.height / cv.width);
    const off = document.createElement('canvas'); off.width = mp.w; off.height = mp.h;
    mp.oc = off.getContext('2d', { willReadFrequently: true }); mp.oc.imageSmoothingQuality = 'high';
    mp.rows = [];
    return true;
  };
  mp.grab = () => {
    const { oc, w, h } = mp; oc.clearRect(0, 0, w, h); oc.drawImage(mp.cv, 0, 0, w, h);
    const d = oc.getImageData(0, 0, w, h).data, g = new Uint8Array(w * h);
    for (let i = 0; i < g.length; i++) g[i] = Math.round(0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]);
    return g;
  };
  mp.diff = (a, b) => { let s2 = 0, c = 0; for (let i = 0; i < a.length; i++) { const d = Math.abs(a[i] - b[i]); s2 += d; if (d > 12) c++; } return [s2 / a.length, c / a.length]; };
  // A beat starts: keep the frame before the change (the cut is measured against it).
  mp.begin = (beat, n, mount) => {
    mp.F = mount ? [] : [{ g: mp.grab(), t: 0, fine: true, pre: true }];
    mp.thumbs = [];
    if (!mount) { mp.sc.onBeatChange?.(beat, n); mp.sc.requestUiUpdate?.(); }
  };
  mp.sample = (t, fine, text) => {
    const g = mp.grab(), F = mp.F, prev = F[F.length - 1];
    F.push({ g, t, fine });
    const r = { t, awake: mp.sc._rafId != null, busy: !!mp.sc.busy?.(), snap: !!mp.snap };
    mp.snap = false;
    if (prev) [r.m1, r.a1] = mp.diff(g, prev.g);
    if (mp.sheet) { const c = document.createElement('canvas'); c.width = mp.tw; c.height = mp.th; c.getContext('2d').drawImage(mp.cv, 0, 0, mp.tw, mp.th); mp.thumbs.push({ c, t }); }
    if (text) r.text = mp.texts();
    return r;
  };
  // Same t drawn twice through the host's repaint path (_tick(ctx, 0), as on a theme change).
  mp.repaint = () => {
    const ctx = mp.sc._ctx, cv = mp.cv;
    if (!ctx || typeof mp.sc._tick !== 'function') return null;
    mp.sc._tick(ctx, 0); const a = ctx.getImageData(0, 0, cv.width, cv.height).data;
    mp.sc._tick(ctx, 0); const b = ctx.getImageData(0, 0, cv.width, cv.height).data;
    let n = 0; for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) > 2 || Math.abs(a[i + 1] - b[i + 1]) > 2 || Math.abs(a[i + 2] - b[i + 2]) > 2) n++;
    return n / (a.length / 4);
  };
  // The last frame's texts as real quads (shoot's metrics), checked for off-canvas and overlap.
  mp.texts = () => {
    const T = window.__texts || [], k = mp.cv.width / mp.W, W = mp.W, H = mp.H;
    const last = Math.max(...T.map((x) => x.frame), -1);
    const probe = mp.probe || (mp.probe = document.createElement('canvas').getContext('2d'));
    const seen = new Set(), boxes = [];
    for (const t of T) {
      if (t.frame !== last || !t.text.trim() || (t.alpha ?? 1) < 0.35) continue;
      probe.font = t.font; probe.textAlign = t.align; probe.textBaseline = t.base;
      const m = probe.measureText(t.text);
      const x0 = t.x - m.actualBoundingBoxLeft, x1 = t.x + m.actualBoundingBoxRight, y0 = t.y - m.actualBoundingBoxAscent, y1 = t.y + m.actualBoundingBoxDescent;
      const [a, b, c, d, e, f] = t.m;
      const qd = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([x, y]) => [(a * x + c * y + e) / k, (b * x + d * y + f) / k]);
      const xs = qd.map((p) => p[0]), ys = qd.map((p) => p[1]);
      const bx = { s: t.text, z: Math.hypot(a, b) / k, q: qd, x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
      const key = `${t.text}|${Math.round(bx.x0)}|${Math.round(bx.y0)}`;
      if (seen.has(key) || bx.x1 - bx.x0 < 2 || bx.y1 - bx.y0 < 2) continue;
      seen.add(key); boxes.push(bx);
    }
    const area = (P) => { let s2 = 0; for (let i = 0; i < P.length; i++) { const [xa, ya] = P[i], [xb, yb] = P[(i + 1) % P.length]; s2 += xa * yb - xb * ya; } return Math.abs(s2) / 2; };
    const clip = (P, Q) => {   // Sutherland-Hodgman: convex P clipped by convex Q (textcheck.mjs)
      const sgn = Math.sign((Q[1][0] - Q[0][0]) * (Q[2][1] - Q[0][1]) - (Q[1][1] - Q[0][1]) * (Q[2][0] - Q[0][0])) || 1;
      let out = P;
      for (let i = 0; i < Q.length && out.length; i++) {
        const S = Q[i], E = Q[(i + 1) % Q.length], inside = (p) => sgn * ((E[0] - S[0]) * (p[1] - S[1]) - (E[1] - S[1]) * (p[0] - S[0])) >= 0;
        const inp = out; out = [];
        for (let j = 0; j < inp.length; j++) {
          const cur = inp[j], prev = inp[(j + inp.length - 1) % inp.length];
          const hit = () => { const dx = cur[0] - prev[0], dy = cur[1] - prev[1], ex = E[0] - S[0], ey = E[1] - S[1], den = dx * ey - dy * ex; const u = den ? ((S[0] - prev[0]) * ey - (S[1] - prev[1]) * ex) / den : 0; return [prev[0] + u * dx, prev[1] + u * dy]; };
          if (inside(cur)) { if (!inside(prev)) out.push(hit()); out.push(cur); } else if (inside(prev)) out.push(hit());
        }
      }
      return out;
    };
    const iss = [];
    const lab = (s2) => JSON.stringify(s2.length > 28 ? s2.slice(0, 26) + '..' : s2);
    for (const b of boxes) if (b.s.trim().length > 1 && b.z < 1.15 && b.x1 > 0 && b.y1 > 0 && b.x0 < W && b.y0 < H && (b.x0 < -2 || b.y0 < -2 || b.x1 > W + 2 || b.y1 > H + 2)) iss.push([`off-canvas ${lab(b.s)}`, `(${Math.round(b.x0)},${Math.round(b.y0)})-(${Math.round(b.x1)},${Math.round(b.y1)}) x${b.z.toFixed(2)}`]);
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      if (a.s === b.s || a.s.includes(b.s) || b.s.includes(a.s)) continue;
      if (Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) <= 2 || Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) <= 2) continue;
      if (area(clip(a.q, b.q)) > 0.25 * Math.min(area(a.q), area(b.q))) iss.push([`overlap ${lab(a.s)} x ${lab(b.s)}`, `(${Math.round(Math.max(a.x0, b.x0))},${Math.round(Math.max(a.y0, b.y0))})`]);
    }
    return iss;
  };
  // The beat's numbers, from the kept frames: change events against the last change's frame
  // (dead beat), and the first visible change.
  mp.analyse = (floor) => {
    const F = mp.F, d = mp.diff;
    const lag = [];
    for (let i = 1; i < F.length; i++) if (F[i].fine && F[i - 1].fine && i >= 15) lag.push(d(F[i].g, F[i - 15].g)[0]);
    const mov = lag.filter((v) => v > 0.02).sort((a, b) => a - b);
    const med = mov.length ? mov[Math.floor(mov.length / 2)] : 0;
    const thr = Math.max(floor, 0.25 * med);
    const ev = [];
    let anchor = F[0];
    for (let i = 1; i < F.length; i++) if (d(F[i].g, anchor.g)[0] >= thr) { ev.push(F[i].t); anchor = F[i]; }
    let first = null;
    if (F[0] && F[0].pre) { for (let i = 1; i < F.length; i++) if (d(F[i].g, F[0].g)[0] > 0.02) { first = F[i].t; break; } }
    let lastAny = F.length ? F[0].t : 0;
    for (let i = 1; i < F.length; i++) if (d(F[i].g, F[i - 1].g)[0] > 0.02) lastAny = F[i].t;
    return { med, thr, ev, first, lastAny, n: F.length };
  };
  mp.endFrame = () => mp.F[mp.F.length - 1].g;
  // Sheet row: 10 thumbs evenly from the change to tEnd.
  mp.row = (label, tEnd) => {
    const th2 = mp.thumbs.filter((x) => x.t <= tEnd + 1);
    if (!th2.length) return;
    const pick = [];
    const n = Math.min(10, th2.length);
    for (let i = 0; i < n; i++) pick.push(th2[Math.round(i * (th2.length - 1) / Math.max(1, n - 1))]);
    mp.rows.push({ label, pick });
  };
  mp.sheetPng = (title) => {
    const pad = 4, lw = 30, tw = mp.tw, th = mp.th, top = 18;
    const c = document.createElement('canvas');
    c.width = lw + 10 * (tw + pad) + pad; c.height = top + mp.rows.length * (th + 14 + pad) + pad;
    const x = c.getContext('2d');
    x.fillStyle = '#555'; x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = '#fff'; x.font = 'bold 12px monospace'; x.textBaseline = 'top'; x.fillText(title, pad, 3);
    mp.rows.forEach((r, ri) => {
      const y = top + ri * (th + 14 + pad);
      x.fillStyle = '#fff'; x.font = 'bold 13px monospace'; x.fillText(r.label, 3, y + th / 2 - 6);
      r.pick.forEach((p, i) => {
        const xx = lw + pad + i * (tw + pad);
        x.drawImage(p.c, xx, y);
        x.fillStyle = '#fff'; x.font = '11px monospace'; x.fillText(`t=${(p.t / 1000).toFixed(2)}`, xx + 2, y + th + 1);
      });
    });
    return c.toDataURL('image/png').split(',')[1];
  };
}

async function load(theme, beat, sheet) {
  const page = await browser.newPage({ viewport: { width: 900, height: 1100 } });
  page.on('console', (m) => { if (m.type() === 'error' && !(/404/.test(m.text()) && /\/manifest\.json$/.test(m.location().url || ''))) errors.push(`${theme}: ${m.text()}`); });   // optional manifest.json probe: a 404 is fine
  page.on('pageerror', (e) => errors.push(`${theme}: ${e.message}`));
  await page.clock.install({ time: 1e9 });
  await page.clock.pauseAt(1e9 + 1000);
  await page.addInitScript(recorder);
  await page.addInitScript(pageInit);
  await page.goto(`${origin}/__kit/preview-harness.html?sim=${encodeURIComponent(simUrl)}&beats=${beats}&beat=${beat}&theme=${theme}&hostw=680${extra}${lookQ}`);
  let ok = false;
  for (let i = 0; i < 600 && !ok; i++) { ok = await page.evaluate(() => window.__ready === true); if (!ok) await page.clock.runFor(16); }
  if (!ok) { errors.push(`${theme}: harness never became ready`); await page.close(); return null; }
  if (!(await page.evaluate((o) => window.__mp.setup(o), { sheet }))) { await page.close(); return 'nocanvas'; }
  return page;
}

// One beat: fine samples until it settles (the loop parks, or busy() is false and nothing has
// changed for 1 s: onBeatChange alone keeps the loop awake 8 s), then (watch) coarse steps up to
// CAP for a late wake; any change goes back to fine steps.
async function runBeat(page, beat, mount, { watch, text, repaintAt }) {
  await page.evaluate(([b, n, m]) => window.__mp.begin(b, n, m), [beat, beats, mount]);
  const S = [];
  let t = 0, setT = null, setFrame = null, lastCh = 0, fine = true;
  const rep = [];
  while (t < CAP) {
    const dt = fine ? STEP : COARSE;
    await page.clock.runFor(dt); t += dt;
    const r = await page.evaluate(([tt, fn, tx]) => window.__mp.sample(tt, fn, tx), [t, fine, text && fine]);
    S.push(r);
    if (r.m1 == null || r.m1 > 0.02) lastCh = t;
    if (repaintAt != null && fine && t >= repaintAt && !rep.length) rep.push([t, await page.evaluate(() => window.__mp.repaint())]);
    const settled = !r.awake || (!r.busy && t - lastCh >= 1000);
    if (settled && setT === null) {
      setT = t; setFrame = await page.evaluate(() => Array.from(window.__mp.endFrame()));
      if (!watch) break;
    }
    fine = !settled || lastCh === t;
  }
  if (repaintAt != null) rep.push([t, await page.evaluate(() => window.__mp.repaint())]);
  return { S, setT, setFrame, rep };
}

function cmp(a, b) {
  let s = 0, c = 0;
  for (let i = 0; i < a.length; i++) { const d = Math.abs(a[i] - b[i]); s += d; if (d > 12) c++; }
  return { mean: s / a.length, frac: c / a.length };
}

console.log(`## ${scene}: ${beats} beat(s), ${themes.join('+')}, ${kind}${SHEET ? ', sheet' : ''}`);
const t0 = Date.now();
const fwdEnd = [], textW = new Map();
let noCanvas = false;
for (const [ti, theme] of themes.entries()) {
  const full = ti === 0;
  const page = await load(theme, 0, SHEET);
  if (page === 'nocanvas') { noCanvas = true; break; }
  if (!page) continue;
  for (let b = 0; b < beats; b++) {
    const r = await runBeat(page, b, b === 0, { watch: full, text: full, repaintAt: full ? 500 : null });
    const an = await page.evaluate((fl) => window.__mp.analyse(fl), STILL_FLOOR);
    const activeEnd = r.setT ?? CAP;
    if (SHEET) await page.evaluate(([l, e]) => window.__mp.row(l, e), [`b${b}`, Math.min(activeEnd, Math.max(an.lastAny, STEP))]);
    if (!full) continue;
    fwdEnd[b] = r.setFrame;
    info(`b${b}: ${r.setT !== null ? `settles at ${f2(r.setT)} s` : `still moving at the ${f2(CAP)} s cap`}; changes at ${an.ev.slice(0, 8).map((x) => f2(x)).join(', ')}${an.ev.length > 8 ? ' ..' : ''}; still under ${an.thr.toFixed(2)} (median ${an.med.toFixed(2)})`);
    // dead beat: first visible change late
    if (an.first !== null && an.first > DEAD_S * 1000) WARN(`dead beat: beat ${b}, first visible change ${f2(an.first)} s after the beat change`);
    // dead beat: a still stretch over DEAD_S ended by more motion, or with busy() true all through
    const evs = [0, ...an.ev];
    for (let i = 1; i < evs.length; i++) if (evs[i] - evs[i - 1] > DEAD_S * 1000) WARN(`dead beat: beat ${b}, ${f2(evs[i] - evs[i - 1])} s unchanged from t=${f2(evs[i - 1])} s, then it moves again`);
    const lastEv = evs[evs.length - 1];
    const tail = r.S.filter((x) => x.t > lastEv);
    if (tail.length && tail[tail.length - 1].t - lastEv > DEAD_S * 1000 && tail.every((x) => x.busy)) WARN(`dead beat: beat ${b}, ${f2(tail[tail.length - 1].t - lastEv)} s unchanged from t=${f2(lastEv)} s while busy() is true`);
    // pop: one step far above both neighbours (fine samples only; the step into the change is exempt)
    const S = r.S;
    for (let i = 1; i < S.length - 1; i++) {
      const p = S[i - 1], c = S[i], n = S[i + 1];
      if (c.a1 == null || p.a1 == null || n.a1 == null) continue;
      if (c.t - p.t !== STEP || n.t - c.t !== STEP) continue;
      if (c.snap) continue;
      if (c.a1 > POP_ABS && c.a1 > POP_K * Math.max(p.a1, n.a1, POP_FLOOR)) WARN(`pop: beat ${b} t=${f2(c.t)} s, ${(100 * c.a1).toFixed(1)}% of the frame changes in one 1/30 s step (before ${(100 * p.a1).toFixed(1)}%, after ${(100 * n.a1).toFixed(1)}%): ease it in, or a one-frame glitch`);
    }
    // repaint determinism
    for (const [tt, frac] of r.rep.filter((x) => x[1] != null && x[1] > REPAINT_FRAC).slice(0, 1)) FAIL(`repaint: beat ${b} t=${f2(tt)} s, two repaints at the same t differ in ${(100 * frac).toFixed(2)}% of pixels - Math.random or a clock read inside draw (use rng(seed) in enter/setup)`);
    // mid-motion text: issues lasting TEXT_MIN_S and gone at the end
    const endIss = new Set(([...S].reverse().find((x) => x.text)?.text || []).map((x) => x[0]));
    const agg = new Map();
    for (const x of S) if (!(x.a1 > CAM_FRAC)) for (const [k, at] of x.text || []) { const e = agg.get(k) || { t0: x.t, t1: x.t, n: 0, at }; e.t1 = x.t; e.n++; agg.set(k, e); }
    for (const [k, e] of agg) if (!endIss.has(k) && e.n * STEP >= TEXT_MIN_S * 1000) textW.set(k, [...(textW.get(k) || []), { b, ...e }]);
  }
  // one line per text issue, with every beat it shows on
  for (const [k, es] of textW) WARN(`mid-motion text: ${k} at ${es[0].at}, beat ${es.map((e) => e.b).join(',')} t=${f2(es[0].t0)}-${f2(es[0].t1)} s${es.length > 1 ? ' (first)' : ''} - can be intended (a label sliding past): look at --sheet`);
  textW.clear();
  if (SHEET) {
    const png = await page.evaluate((tt) => window.__mp.sheetPng(tt), `${scene} ${theme}: a row per beat, 10 frames from the beat change to its last change`);
    const out = path.join(KIT_ROOT, 'build', 'shots', T.bundle ? path.basename(T.bundle) : 'scene', path.basename(path.dirname(file)));
    fs.mkdirSync(out, { recursive: true });
    const f = path.join(out, `${scene}-motion-${theme}.png`);
    fs.writeFileSync(f, Buffer.from(png, 'base64'));
    console.log(`  sheet: ${rel(process.cwd(), f)}`);
  }
  await page.close();
}

info(`forward pass ${((Date.now() - t0) / 1000).toFixed(1)} s`);
// resume in pixels: frame at settle, walked forward vs reverse vs mounted directly.
const own = (src.match(/static\s+CONTINUOUS\s*=\s*(true|false)/) || [])[1];
if (!noCanvas && beats > 1 && own !== 'true') {
  const theme = themes[0];
  const revEnd = [], dirEnd = [];
  const rp = await load(theme, beats - 1, false);
  if (rp && rp !== 'nocanvas') {
    for (let b = beats - 1; b >= 0; b--) { const r = await runBeat(rp, b, b === beats - 1, { watch: false }); revEnd[b] = r.setFrame; }
    await rp.close();
  }
  dirEnd[0] = fwdEnd[0]; dirEnd[beats - 1] = revEnd[beats - 1];
  for (let b = 1; b < beats - 1; b++) {
    const p = await load(theme, b, false);
    if (!p || p === 'nocanvas') continue;
    dirEnd[b] = (await runBeat(p, b, true, { watch: false })).setFrame;
    await p.close();
  }
  for (let b = 0; b < beats; b++) {
    const ways = [['walked forward', fwdEnd[b]], ['walked in reverse', revEnd[b]], ['mounted on it', dirEnd[b]]];
    if (ways.some((w) => !w[1])) { info(`b${b}: resume compare skipped (a run never settled within ${f2(CAP)} s)`); continue; }
    const seen = new Set();
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
      if ((b === 0 && i === 0 && j === 2) || (b === beats - 1 && i === 1 && j === 2)) continue;   // the same run
      const c = cmp(ways[i][1], ways[j][1]);
      if ((c.frac > RESUME_FRAC || c.mean > RESUME_MEAN) && !seen.has(i) && !seen.has(j)) {
        seen.add(i); seen.add(j);
        WARN(`resume (pixels): beat ${b} settled frame differs ${ways[i][0]} vs ${ways[j][0]} (${(100 * c.frac).toFixed(1)}% of pixels, mean ${c.mean.toFixed(2)}) - a leak in what is drawn; resume-probe names the field`);
      }
    }
  }
} else if (own === 'true') info('resume compare skipped: CONTINUOUS = true never parks');
await browser.close();
server.close();
if (noCanvas) console.log('  skip - no 2D canvas in #sim-host (DOM or WebGL scene)');
for (const e of [...new Set(errors)].slice(0, 6)) FAIL(`page error: ${e.slice(0, 240)}`);
console.log(`motion-probe: ${warns} warn, ${fails} fail (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
process.exit(fails ? 1 : 0);
