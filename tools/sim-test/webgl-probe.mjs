#!/usr/bin/env node
// webgl-probe - the freeze/resume/repaint checks for a WebGL (three.js) scene, in a
// real browser (headless Chromium gives software WebGL2; each mount takes seconds).
//
//   node tools/sim-test/webgl-probe.mjs <scene.js> [beats] [--quick] [--look id]
//   --look <id>  draw with that LookProfile (harness ?look=, default the bundle's look; quill adds nothing).
//
//   park     every beat: the loop parks within 12 s (unless CONTINUOUS = true)
//   resume   beat j mounted directly == walked to fast (0.3 s/beat) == walked slowly
//            (settled each beat). Compares the model: stage, this.v, own number/string
//            fields, camera position, labels on, HUD text. --quick: last beat only
//   resize   host 680 -> 360 px while parked: frame must not go blank
//   theme    flip data-theme + refreshTheme while parked: frame must repaint, not blank
//   context  lose + restore the WebGL context: frame must come back (rebuild)
// Prints "FAIL <check>: ..." / "ok <check>" lines, then "## <Scene>: N fail(s)".
// check-scene.mjs runs this for kind webgl. RESUME_IGNORE=<regex> skips model paths.
import fs from 'node:fs';
import path from 'node:path';
import { serve, rootFor, playwright } from './lib/serve.mjs';
import { rel, bundleOf } from './lib/bundle.mjs';
import { bundleProfile } from '../staged-generation/lib/bundleProfile.mjs';

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) { console.log('usage: node tools/sim-test/webgl-probe.mjs <scene.js> [beats] [--quick] [--look id]'); process.exit(0); }
const bad = argv.filter((a) => a.startsWith('--') && !/^--(quick|look(=.*)?)$/.test(a));
if (bad.length) { console.error(`webgl-probe: unknown flag ${bad[0]}\nusage: node tools/sim-test/webgl-probe.mjs <scene.js> [beats] [--quick] [--look id]`); process.exit(2); }
const li = argv.indexOf('--look');
const lookArg = li >= 0 ? argv[li + 1] : (argv.find((a) => a.startsWith('--look=')) || '').slice(7) || null;
const pos = argv.filter((a, i) => !a.startsWith('--') && !(li >= 0 && i === li + 1));
const file = path.resolve(pos.find((a) => !/^\d+$/.test(a)) || '');
if (!fs.existsSync(file)) { console.error('usage: node tools/sim-test/webgl-probe.mjs <scene.js> [beats] [--quick] [--look id]'); process.exit(2); }
const src = fs.readFileSync(file, 'utf8');
const beats = Number(pos.find((a) => /^\d+$/.test(a))) || (src.match(/BEAT_STEP_MAP\s*=\s*\[([\s\S]*?)\]\s*;/)?.[1].match(/\[\s*\{/g) || []).length || 1;
const quick = argv.includes('--quick');
const cont = /static\s+CONTINUOUS\s*=\s*true/.test(src);
const IGNORE = process.env.RESUME_IGNORE ? new RegExp(process.env.RESUME_IGNORE) : null;
const name = path.basename(file, '.js');

const pw = playwright();
if (!pw) { console.log(`## ${name}: skip - needs Playwright`); process.exit(0); }
const rootDir = rootFor(file);
const { server, origin } = await serve(rootDir);
const browser = await pw.chromium.launch();
const bundleLook = (() => { const B = bundleOf(file); if (!B || typeof B !== 'string') return null; const l = bundleProfile(path.dirname(path.dirname(B)), path.basename(B)).look; return l === 'quill' ? null : l; })();
const lookId = lookArg || bundleLook;
const url = `${origin}/__kit/preview-harness.html?sim=${encodeURIComponent('/' + rel(rootDir, file))}&beats=${beats}&hostw=680${lookId ? `&look=${encodeURIComponent(lookId)}` : ''}`;
let fails = 0;
const FAIL = (s) => { fails++; console.log(`FAIL ${s}`); };
const OK = (s) => console.log(`ok ${s}`);

async function mount(theme = 'dark') {
  const page = await browser.newPage({ viewport: { width: 900, height: 1000 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/GPU stall|ReadPixels/.test(m.text()) && !(/404/.test(m.text()) && /\/manifest\.json$/.test(m.location().url || ''))) errs.push(m.text()); });
  await page.addInitScript((th) => { const set = () => document.documentElement && (document.documentElement.dataset.theme = th); set(); document.addEventListener('readystatechange', set); }, theme);
  await page.goto(url);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });
  return { page, errs };
}
const beat = (page, b) => page.evaluate(([i, n]) => { window.__scene.onBeatChange?.(i, n); window.__scene.requestUiUpdate?.(); }, [b, beats]);
const parked = (page) => page.evaluate(() => window.__scene._rafId == null);
async function waitPark(page, ms = 12000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await parked(page)) return Date.now() - t0; await page.waitForTimeout(150); }
  return null;
}
function snapModel() {
  const s = window.__scene, k = s._k || {};
  const r = (x) => Math.round(x * 20) / 20;
  const skip = /^(_|allowResume|beatCount|unsupported|config$)/;
  const own = {};
  for (const [key, val] of Object.entries(s)) {
    if (skip.test(key)) continue;
    if (typeof val === 'number') own[key] = r(val); else if (typeof val === 'string' || typeof val === 'boolean') own[key] = val;
  }
  const v = {};
  for (const [key, val] of Object.entries(s.v || {})) if (typeof val === 'number') v[key] = r(val);
  return {
    stage: s.stage, v, own,
    cam: s.camera ? s.camera.position.toArray().map(r) : null,
    labels: k.labels ? [...k.labels.values()].filter((l) => l.on).map((l) => l.id).sort() : null,
    hud: k.huds ? Object.fromEntries(Object.entries(k.huds).map(([a, e]) => [a, e.classList.contains('off') ? null : e.textContent])) : null,
  };
}
function diff(a, b, p = '', out = []) {
  if (out.length > 6 || (p && IGNORE && IGNORE.test(p))) return out;
  if (typeof a !== 'object' || typeof b !== 'object' || a == null || b == null) {
    if (JSON.stringify(a) !== JSON.stringify(b)) out.push(`${p}: ${JSON.stringify(a)?.slice(0, 40)} -> ${JSON.stringify(b)?.slice(0, 40)}`);
    return out;
  }
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) diff(a[key], b[key], p ? `${p}.${key}` : key, out);
  return out;
}
// Colours of the WebGL canvas alone: backdrop, overlay chips and HUD hidden for the capture.
async function colours(page) {
  await page.evaluate(() => {
    const st = document.createElement('style');
    st.id = '__probe_hide';
    st.textContent = '#sim-host, #sim-host * { background: none !important; box-shadow: none !important } #sim-host *:not(canvas) { color: transparent !important; border-color: transparent !important }';
    document.head.appendChild(st);
  });
  const png = await page.locator('#sim-host canvas').screenshot();
  await page.evaluate(() => document.getElementById('__probe_hide')?.remove());
  return page.evaluate(async (b64) => {
    const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode();
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const x = c.getContext('2d'); x.drawImage(im, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    const set = new Set(); let h = 0;
    for (let i = 0; i < d.length; i += 4 * 53) { set.add(`${d[i] >> 4},${d[i + 1] >> 4},${d[i + 2] >> 4}`); h = (h * 31 + d[i] + d[i + 1] * 7) | 0; }
    return { n: set.size, h };
  }, png.toString('base64'));
}

// 0. supported at all?
{
  const { page, errs } = await mount();
  const un = await page.evaluate(() => !!window.__scene.unsupported);
  if (un) { console.log(`## ${name}: skip - no WebGL in this browser (scene shows its fallback)`); await browser.close(); server.close(); process.exit(0); }
  for (const e of errs) FAIL(`page error: ${e.slice(0, 200)}`);

  // 1. park per beat (one page walks all beats)
  if (cont) OK('park: CONTINUOUS = true, skipped');
  else for (let b = 0; b < beats; b++) {
    await beat(page, b);
    await page.waitForTimeout(200);
    const t = await waitPark(page);
    if (t == null) FAIL(`park b${b}: loop still running after 12 s - something keeps busy()/tweens/timers alive`);
    else OK(`park b${b}: ${(t / 1000).toFixed(1)} s`);
  }

  // 3. resize while parked
  await waitPark(page, 4000);
  const before = await colours(page);
  await page.evaluate(() => { document.querySelector('#sim-host').style.width = '360px'; });
  await page.waitForTimeout(700);
  await waitPark(page, 4000);
  const after = await colours(page);
  if (after.n < 4) FAIL(`resize: frame went blank after the host shrank while parked (${before.n} -> ${after.n} colours)`);
  else OK('resize');
  await page.evaluate(() => { document.querySelector('#sim-host').style.width = ''; });
  await page.waitForTimeout(500);

  // 4. theme flip while parked
  await waitPark(page, 4000);
  const t0 = await colours(page);
  await page.evaluate(() => {
    const d = document.documentElement;
    d.dataset.theme = d.dataset.theme === 'light' ? 'dark' : 'light';
    window.__scene._reloadColors?.();
    window.__scene.refreshTheme?.();
  });
  await page.waitForTimeout(600);
  const t1 = await colours(page);
  if (t1.n < 4) FAIL('theme: frame blank after a theme flip');
  else if (t1.h === t0.h) FAIL('theme: frame did not change after a theme flip - colours not re-tinted (use this.mat/this.tint)');
  else OK('theme');

  // 5. context loss + restore
  const lost = await page.evaluate(async () => {
    const gl = window.__scene.renderer?.getContext();
    const ext = gl?.getExtension('WEBGL_lose_context');
    if (!ext) return false;
    ext.loseContext();
    await new Promise((r) => setTimeout(r, 400));
    ext.restoreContext();
    await new Promise((r) => setTimeout(r, 1200));
    window.__scene.animateFor?.(300);
    return true;
  });
  if (!lost) OK('context: skipped (no WEBGL_lose_context)');
  else {
    await page.waitForTimeout(800);
    const cx = await colours(page);
    if (cx.n < 4) FAIL('context: frame blank after the GPU context was restored - rebuild in _onContextRestored (GeoScene does: keep build() re-runnable)');
    else OK('context');
  }
  await page.close();
}

// 2. resume
const direct = async (j) => { const { page } = await mount(); await beat(page, j); await page.waitForTimeout(300); await waitPark(page, 15000); const s = await page.evaluate(snapModel); await page.close(); return s; };
const walk = async (j, dwell) => {
  const { page } = await mount();
  for (let i = 0; i <= j; i++) { await beat(page, i); if (i < j) { if (dwell) await page.waitForTimeout(dwell); else await waitPark(page, 15000); } }
  await page.waitForTimeout(300);
  await waitPark(page, 15000);
  const s = await page.evaluate(snapModel);
  await page.close();
  return s;
};
if (beats < 2) OK('resume: one beat');
else for (let j = quick ? beats - 1 : 1; j < beats; j++) {
  const a = await direct(j);
  const fast = await walk(j, 300);
  const d1 = diff(a, fast);
  const slow = quick ? a : await walk(j, 0);
  const d2 = diff(a, slow);
  if (d1.length) FAIL(`resume b${j} (direct vs fast walk): ${d1.join('; ')}`);
  else if (d2.length) FAIL(`resume b${j} (direct vs slow walk): ${d2.join('; ')}`);
  else OK(`resume b${j}`);
}

await browser.close();
server.close();
console.log(`## ${name}: ${fails} fail(s)`);
process.exit(fails ? 1 : 0);
