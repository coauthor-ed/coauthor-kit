#!/usr/bin/env node
// slide-shots - every slide and beat of ONE lesson in the real app (standalone export), shot and measured as a WHOLE
// slide: scene + prose + header + footer. The tool behind briefs/stage3-slides.md.
//
//   node tools/operator/slide-shots.mjs --bundle <B> --lesson les-03 [--vp 1280x800,390x844] [--themes light,dark]
//        [--out dir] [--export-dir dir] [--engine-dir dir] [--no-heavy] [--wait 3000] [--blocks 0,4,7] [--max-beats 8]
//
// Export: with --export-dir it uses <dir>/*-<lesson>.html as it is. Without it, it runs the engine's
// tools/export-standalone.mjs (engine: --engine-dir, $COAUTHOR_ENGINE_DIR, ./coauthor, ../coauthor, ../../coauthor, ..)
// into <out>/export (--with-heavy unless --no-heavy).
// Output: <out>/<lesson>-b<block>.<beat>-<vp>-<theme>.png, <out>/index.html (contact sheet), <out>/report.txt.
// Default out: build/slide-shots/<bundle>/<lesson>/.
// Per shot it prints: stage scale (DOM/SVG scenes: rendered / design width), page overflow (px of scroll below the
// first screen; the inner scroller too), controls clipped (off the viewport, cut by the scene box, or below the fold),
// Check button position, smallest rendered text, headings shown twice. Then FAIL/WARN lines against the thresholds
// in briefs/stage3-slides.md (constants below). Exit 0 always when it ran (the FAIL lines are the verdict), 2 on a setup error.
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseArgs } from '../sim-test/lib/args.mjs';
import { bundleFromArg, KIT_ROOT, markdownOf } from '../sim-test/lib/bundle.mjs';
import { playwright } from '../sim-test/lib/serve.mjs';
import { splitSteps } from '../beat-check/vendor/splitSteps.js';
import { lessonFiles, lessonItems } from './lib/units.mjs';

// Thresholds (keep in step with briefs/stage3-slides.md "Checklist").
const MIN_SCALE_DESKTOP = 0.95;   // a DOM/SVG scene on a desktop viewport renders at >= this share of its design width
const MIN_TEXT_PX = 12;           // smallest rendered text
const PHONE_MAX_W = 600;          // a viewport this wide or narrower is a phone
const PHONE_SCENE_TOP = 0.75;     // phone: the scene must start in the top 75% of the first screen

const USAGE = 'node tools/operator/slide-shots.mjs --bundle <B> --lesson les-03 [--vp 1280x800,390x844] [--themes light,dark] [--out dir] [--export-dir dir] [--engine-dir dir] [--no-heavy] [--wait 3000] [--blocks 0,4] [--max-beats 8]';
const A = parseArgs(process.argv.slice(2), { tool: 'slide-shots', file: import.meta.url, usage: USAGE, val: ['bundle', 'lesson', 'vp', 'themes', 'out', 'export-dir', 'engine-dir', 'wait', 'blocks', 'max-beats'], bool: ['no-heavy'] });
const die = (m) => { console.error(`${m}\n${USAGE}`); process.exit(2); };
const B = A.val('bundle') ? bundleFromArg(A.val('bundle')) : null;
if (!B || !fs.existsSync(path.join(B, 'lessons'))) die('need --bundle <id|dir> (a folder with lessons/)');
const bundleId = path.basename(B);
const lesArg = String(A.val('lesson') || '').replace(/^lessons\//, '').replace(/\.json$/, '');
if (!lesArg) die('need --lesson les-0N');
const lesName = /^les-/i.test(lesArg) ? lesArg.toLowerCase() : `les-${lesArg.replace(/^L/i, '').toLowerCase()}`;
const lf = lessonFiles(B).find((f) => path.basename(f, '.json') === lesName);
if (!lf) die(`no lessons/${lesName}.json in ${B}`);
const vps = (A.val('vp') || '1280x800,390x844').split(',').map((s) => { const [w, h] = s.split('x').map(Number); if (!w || !h) die(`bad --vp ${s}`); return { w, h, id: `${w}x${h}` }; });
const themes = (A.val('themes') || 'light,dark').split(',').map((s) => s.trim()).filter(Boolean);
for (const t of themes) if (!['light', 'dark'].includes(t)) die(`bad theme ${t}`);
const wait = Number(A.val('wait')) || 3000;
const maxBeats = Number(A.val('max-beats')) || 8;
const onlyBlocks = A.val('blocks') ? new Set(A.val('blocks').split(',').map(Number)) : null;
const out = path.resolve(A.val('out') || path.join(KIT_ROOT, 'build', 'slide-shots', bundleId, lesName));
fs.mkdirSync(out, { recursive: true });

// 1. The standalone export.
let exportDir = A.val('export-dir') ? path.resolve(A.val('export-dir')) : null;
if (!exportDir) {
  const root = KIT_ROOT;
  const cands = [A.val('engine-dir'), process.env.COAUTHOR_ENGINE_DIR, path.join(root, 'coauthor'), path.join(root, '..', 'coauthor'), path.join(root, '..', '..', 'coauthor'), path.join(root, '..')].filter(Boolean).map((d) => path.resolve(d));
  const engine = cands.find((d) => fs.existsSync(path.join(d, 'tools', 'export-standalone.mjs')));
  if (!engine) die(`no engine checkout found (tried ${cands.join(', ')}): pass --engine-dir, set COAUTHOR_ENGINE_DIR, or pass --export-dir of a ready export`);
  exportDir = path.join(out, 'export');
  const args = [path.join(engine, 'tools', 'export-standalone.mjs'), '--course', B, '--lesson', lesName, '--out', exportDir];
  if (!A.has('no-heavy')) args.push('--with-heavy');
  console.log(`export: ${engine}/tools/export-standalone.mjs --lesson ${lesName}${A.has('no-heavy') ? '' : ' --with-heavy'} -> ${path.relative(process.cwd(), exportDir) || '.'}`);
  const r = spawnSync(process.execPath, args, { cwd: engine, encoding: 'utf8' });
  if (r.status !== 0) die(`export failed (exit ${r.status}):\n${(r.stderr || r.stdout || '').split('\n').slice(-12).join('\n')}`);
}
const html = fs.existsSync(exportDir) && fs.readdirSync(exportDir).find((f) => f.endsWith(`-${lesName}.html`) || f === `${lesName}.html`);
if (!html) die(`no *-${lesName}.html in ${exportDir}`);
const htmlP = path.join(exportDir, html);
const courseId = html.endsWith(`-${lesName}.html`) ? html.slice(0, -`-${lesName}.html`.length) : bundleId;
const base = `file://${htmlP}?preview=true&remoteManifestUrl=${encodeURIComponent(`https://coauthor.standalone/_course/${courseId}/manifest.json`)}#/lesson/courses/${courseId}/lessons/${lesName}.json`;

// 2. The shots: block x beat, from the slide markdown's beat count.
const shots = [];
for (const it of lessonItems(B, lf)) {
  if (onlyBlocks && !onlyBlocks.has(it.index)) continue;
  let j = {}; try { j = JSON.parse(fs.readFileSync(it.file, 'utf8')); } catch { /* none */ }
  const md = markdownOf(B, j);
  const beats = Math.min(maxBeats, md ? Math.max(1, splitSteps(md).steps.length) : 1);
  const fullWidth = !!(j.simulation?.fullWidth || j.fullWidth);
  const stepMd = md ? splitSteps(md).steps.map((x) => String(x.md || '').trim()) : [];
  // `Beat hold: b2.0-b2.1, b4.1` in the scene's design note: the prose deliberately talks over a still picture (frame check passes as HOLD).
  const holds = new Set();
  const srcRel = j.simulation?.src || j.src;
  if (srcRel) {
    let note = ''; try { note = fs.readFileSync(path.join(B, srcRel.replace(/\.js$/, '.design.md')), 'utf8'); } catch { /* no note */ }
    for (const m of note.matchAll(/^Beat hold:[ \t]*(.+)$/gim)) for (const t of m[1].split(',')) {
      const r = t.trim().match(/^b(\d+)\.(\d+)(?:\s*-\s*(?:b\d+\.)?(\d+))?$/i);
      if (r && Number(r[1]) === it.index) for (let k = Number(r[2]); k <= Number(r[3] ?? r[2]); k++) holds.add(k);
    }
  }
  for (let beat = 0; beat < beats; beat++) shots.push({ block: it.index, beat, id: it.id, fullWidth, hold: holds.has(beat), text: stepMd[beat] || '' });
}

// Runs in the page: measures the whole slide through every shadow root.
function measure() {
  const W = innerWidth, H = innerHeight;
  const all = [];
  const walk = (r) => { for (const e of r.querySelectorAll('*')) { all.push(e); if (e.shadowRoot) walk(e.shadowRoot); } };
  walk(document);
  const vis = (e) => { const r = e.getBoundingClientRect(); if (r.width <= 1 || r.height <= 1) return null; try { if (e.checkVisibility && !e.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return null; } catch { /* old */ } return r; };
  const txt = (e) => (e.textContent || e.getAttribute?.('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 28);
  const scenes = [];
  for (const e of all) {
    if (!e.classList?.contains('sim-dom-scale-wrap')) continue;
    const r = vis(e); if (!r) continue;
    const root = [...e.children].find((c) => c.classList.contains('sim-dom-root'));
    const s = parseFloat(((root?.style.transform || '').match(/scale\(([^)]+)\)/) || [])[1]);
    scenes.push({ kind: 'dom', scale: Number.isFinite(s) ? +s.toFixed(3) : null, dw: root ? parseFloat(root.style.width) : null, rect: { l: r.left, t: r.top, r: r.right, b: r.bottom }, el: e });
  }
  for (const e of all) {
    if (e.tagName !== 'CANVAS' || scenes.some((s) => s.el.contains(e))) continue;
    const r = vis(e); if (!r || r.width < 160 || r.height < 120) continue;
    scenes.push({ kind: 'canvas', scale: null, dw: null, rect: { l: r.left, t: r.top, r: r.right, b: r.bottom }, el: e });
  }
  const ctl = 'button, input, select, textarea, a[href], [role="button"], [role="slider"], [role="tab"], [role="radio"], [role="checkbox"]';
  const clipped = [];
  let check = null;
  for (const e of all) {
    if (!e.matches?.(ctl)) continue;
    const r = vis(e); if (!r) continue;
    // Parked off-screen (an update toast slid out of view): no scroll reaches it, so it is not a slide control.
    if (r.top >= Math.max(document.scrollingElement.scrollHeight, H) || r.bottom <= 0 || r.right <= 0 || r.left >= W) continue;
    if (r.top >= H && (() => { for (let a = e; a; a = a.parentElement || a.getRootNode?.().host) if (getComputedStyle(a).position === 'fixed') return true; return false; })()) continue;
    const label = txt(e) || e.tagName.toLowerCase();
    if (/^(check|submit)\b/i.test(label) && !check) check = { label, top: Math.round(r.top), bottom: Math.round(r.bottom) };
    const sc = scenes.find((s) => s.el.contains(e));
    const why = [];
    if (r.left < -1 || r.right > W + 1) why.push('off viewport side');
    if (sc && (r.left < sc.rect.l - 1 || r.right > sc.rect.r + 1 || r.top < sc.rect.t - 1 || r.bottom > sc.rect.b + 1)) why.push('cut by scene box');
    if (r.bottom > H + 1) why.push(r.top >= H ? 'below fold' : 'cut by fold');
    if (why.length) clipped.push({ label, why: why.join('+'), inScene: !!sc });
  }
  // Rendered text size: font-size times the element's on-screen scale.
  let minText = null; let small = 0;
  for (const e of all) {
    if (['STYLE', 'SCRIPT', 'TITLE', 'NOSCRIPT'].includes(e.tagName)) continue;
    // Own text with zero-width chars and spaces removed: KaTeX struts/spacers hold only those.
    const own = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.replace(/[\s\u200B\u200C\u200D\u2060\uFEFF]/g, ''));
    if (!own) continue;
    if (e.closest?.('.katex-mathml')) continue;   // KaTeX hidden MathML copy (1px clip)
    const r = vis(e); if (!r) continue;
    if (!(e instanceof SVGElement) && (r.width <= 1 || r.height <= 1) && getComputedStyle(e).overflow !== 'visible') continue;   // visually clipped to <=1px
    const fs = parseFloat(getComputedStyle(e).fontSize); if (!fs) continue;
    let k = 1;
    if (e instanceof SVGElement) { try { const bb = e.getBBox(); if (bb.height > 0) k = r.height / bb.height; } catch { /* none */ } } else if (e.offsetWidth > 0) k = r.width / e.offsetWidth;
    const px = +(fs * k).toFixed(1);
    if (Math.round(px) < 12) small++;
    const where = scenes.some((s) => s.el.contains(e)) ? 'scene' : 'page';
    if (!minText || px < minText.px) minText = { px, text: txt(e), where };
  }
  // Headings shown twice (the lesson or slide title repeated by the header and the slide).
  const heads = new Map();
  for (const e of all) {
    if (!/^H[1-3]$/.test(e.tagName) && e.getAttribute?.('role') !== 'heading' && !e.classList?.contains('aa-title') && !/title/i.test(e.className?.baseVal ?? e.className ?? '')) continue;
    const r = vis(e); if (!r || r.bottom < 0 || r.top > H) continue;
    const t = (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase(); if (t.length < 4 || t.length > 120) continue;
    if ([...heads.keys()].some((x) => x !== e && (x.contains(e) || e.contains(x)))) continue;
    heads.set(e, t);
  }
  const counts = {}; for (const t of heads.values()) counts[t] = (counts[t] || 0) + 1;
  const dups = Object.entries(counts).filter(([, n]) => n > 1).map(([t]) => t.slice(0, 40));
  // Scroll: the page, and the biggest inner scroller.
  const se = document.scrollingElement;
  let inner = 0;
  for (const e of all) { if (!(e instanceof HTMLElement)) continue; const oy = getComputedStyle(e).overflowY; if ((oy === 'auto' || oy === 'scroll') && e.clientHeight > 100) inner = Math.max(inner, e.scrollHeight - e.clientHeight); }
  return {
    scenes: scenes.map((s) => ({ kind: s.kind, scale: s.scale, dw: s.dw, left: Math.round(s.rect.l), top: Math.round(s.rect.t), bottom: Math.round(s.rect.b), width: Math.round(s.rect.r - s.rect.l) })),
    docOverflow: Math.max(0, se.scrollHeight - H), innerOverflow: inner, clipped, check, minText, small, dups, W, H,
  };
}

function verdicts(m, vp, shot = {}) {
  const phone = vp.w <= PHONE_MAX_W;
  const fails = [], warns = [];
  for (const s of m.scenes) {
    // Size budget: below 0.95 on desktop is a FAIL unless the block sets simulation.fullWidth (OC-07 review).
    if (s.kind === 'dom' && s.scale != null && !phone && s.scale < MIN_SCALE_DESKTOP && !shot.fullWidth) fails.push(`stage scale ${s.scale} < ${MIN_SCALE_DESKTOP} (design ${s.dw}px shown ${s.width}px)`);
    if (!phone && s.bottom > m.H + 1) fails.push(`scene cut by the fold (bottom ${s.bottom} > ${m.H}): page scroll needed`);
    if (phone && s.top > m.H * PHONE_SCENE_TOP) fails.push(`scene starts at ${s.top}px (> ${Math.round(m.H * PHONE_SCENE_TOP)}): page scroll needed to reach it`);
  }
  if (!phone && m.docOverflow > 0) warns.push(`page scrolls ${m.docOverflow}px on desktop`);
  if (m.check && m.check.bottom > m.H + 1) (phone ? warns : fails).push(`"${m.check.label}" below the fold (bottom ${m.check.bottom} > ${m.H})`);
  const side = m.clipped.filter((c) => /off viewport|cut by scene/.test(c.why));
  if (side.length) fails.push(`clipped controls: ${side.slice(0, 4).map((c) => `"${c.label}" ${c.why}`).join(', ')}${side.length > 4 ? ` +${side.length - 4}` : ''}`);
  const sceneFold = m.clipped.filter((c) => c.inScene && /fold/.test(c.why) && !/off viewport|cut by scene/.test(c.why));
  if (sceneFold.length) (phone ? warns : fails).push(`scene controls below the fold: ${sceneFold.slice(0, 4).map((c) => `"${c.label}"`).join(', ')}`);
  if (m.minText && Math.round(m.minText.px) < MIN_TEXT_PX) fails.push(`${m.minText.where} text ${m.minText.px}px < ${MIN_TEXT_PX} ("${m.minText.text}"; ${m.small} element(s))`);
  if (m.dups.length) (phone ? fails : warns).push(`title shown twice: "${m.dups.join('", "')}"`);
  return { fails, warns };
}

// 3. Shoot: one browser context per viewport x theme, run side by side.
const pw = playwright();
if (!pw) die('Playwright not found (tools/operator/doctor.mjs)');
const browser = await pw.chromium.launch();
const rows = [];
const link = (s) => { const [pre, hash] = base.split('#'); return `${pre}#${hash}?block=${s.block}&beat=${s.beat}`; };
try {
  await Promise.all(vps.flatMap((vp) => themes.map(async (theme) => {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, colorScheme: theme, deviceScaleFactor: 1 });
    await ctx.addInitScript((t) => { try { localStorage.setItem('coauthor-theme', t); } catch { /* none */ } }, theme);
    const page = await ctx.newPage();
    for (const s of shots) {
      const name = `${lesName}-b${s.block}.${s.beat}-${vp.id}-${theme}.png`;
      let m = null, err = null, hash = null;
      try {
        await page.goto('about:blank'); await page.goto(link(s)); await page.waitForTimeout(wait);
        const cur = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
        if (cur !== theme) { await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme); await page.waitForTimeout(400); }
        m = await page.evaluate(measure);
        await page.screenshot({ path: path.join(out, name) });
        // Settled-frame hash of the main scene region (no learner input), for the repeated-beat check below.
        const sc = m.scenes.slice().sort((a, b) => (b.width * (b.bottom - b.top)) - (a.width * (a.bottom - a.top)))[0];
        if (sc) {
          const x = Math.max(0, sc.left), y = Math.max(0, sc.top), w = Math.min(sc.width, vp.w - x), h = Math.min(sc.bottom - sc.top, vp.h - y);
          if (w > 8 && h > 8) {
            // Text is hidden for the hash: a caption or a status line that changes with the beat is not a different picture.
            await page.evaluate(() => { const css = '*{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important}svg text{fill:transparent!important}'; const w = (r) => { const st = document.createElement('style'); st.setAttribute('data-q80', ''); st.textContent = css; r.appendChild(st); for (const e of r.querySelectorAll('*')) if (e.shadowRoot) w(e.shadowRoot); }; w(document.documentElement); });
            hash = crypto.createHash('sha1').update(await page.screenshot({ clip: { x, y, width: w, height: h } })).digest('hex').slice(0, 12);
            await page.evaluate(() => { const rm = (r) => { for (const st of r.querySelectorAll('style[data-q80]')) st.remove(); for (const e of r.querySelectorAll('*')) if (e.shadowRoot) rm(e.shadowRoot); }; rm(document); });
          }
        }
      } catch (e) { err = String(e.message || e).split('\n')[0]; }
      rows.push({ ...s, vp, theme, name, m, err, hash, ...(m ? verdicts(m, vp, s) : { fails: [`not measured: ${err}`], warns: [] }) });
    }
    await ctx.close();
  })));
} finally { await browser.close(); }

// 4. Report, in slide order.
const vpOrder = vps.map((v) => v.id);
rows.sort((a, b) => a.block - b.block || a.beat - b.beat || vpOrder.indexOf(a.vp.id) - vpOrder.indexOf(b.vp.id) || themes.indexOf(a.theme) - themes.indexOf(b.theme));
const lines = [`slide-shots ${bundleId} ${lesName}: ${shots.length} slide/beat(s) x ${vps.length} viewport(s) x ${themes.length} theme(s); thresholds: scale >= ${MIN_SCALE_DESKTOP} (desktop), text >= ${MIN_TEXT_PX}px`];
lines.push('slide    viewport  theme  scene(scale design->shown)        overflow doc/inner  check        min text   clipped');
for (const r of rows) {
  const m = r.m;
  const tag = `b${r.block}.${r.beat}`.padEnd(8);
  if (!m) { lines.push(`${tag} ${r.vp.id.padEnd(9)} ${r.theme.padEnd(6)} ERROR ${r.err}`); continue; }
  const sc = m.scenes.length ? m.scenes.map((s) => (s.kind === 'dom' ? `${s.scale ?? '?'} ${s.dw}->${s.width}` : `canvas ${s.width}px`)).join('; ') : 'no scene';
  const ck = m.check ? `${m.check.label.slice(0, 6)}@${m.check.bottom}` : '-';
  lines.push(`${tag} ${r.vp.id.padEnd(9)} ${r.theme.padEnd(6)} ${sc.padEnd(33)} ${`${m.docOverflow}/${m.innerOverflow}px`.padEnd(19)} ${ck.padEnd(12)} ${m.minText ? `${m.minText.px}px`.padEnd(10) : '-'.padEnd(10)} ${m.clipped.length ? m.clipped.slice(0, 2).map((c) => `"${c.label.slice(0, 14)}" ${c.why}`).join(', ') + (m.clipped.length > 2 ? ` +${m.clipped.length - 2}` : '') : '-'}  frame:${r.hash || '-'}`);
}
// Repeated settled beat frame: two beats of one scene settle to an identical frame while their beat texts differ.
// The frame must show what its beat says, so identical frames with different texts fail BOTH beats (at that viewport and theme).
for (const r of rows) {
  if (!r.hash) continue;
  const twin = rows.find((o) => o !== r && o.block === r.block && o.vp.id === r.vp.id && o.theme === r.theme && o.hash === r.hash && o.text !== r.text);
  if (twin && r.hold && twin.hold) { (r.holds ||= []).push(`HOLD b${r.block}.${r.beat}/b${twin.block}.${twin.beat}: identical frame allowed by Beat hold`); continue; }
  if (twin) r.fails.push(`repeated beat frame: b${r.block}.${r.beat} and b${twin.block}.${twin.beat} settle to the same scene frame but their texts differ (show what each beat says, with no learner input)`);
}
const failRows = rows.filter((r) => r.fails.length);
lines.push('');
// One line per distinct defect: the same message on several shots is listed once with the shots it hits.
const group = (key) => {
  const g = new Map();
  for (const r of rows) for (const msg of r[key]) { if (!g.has(msg)) g.set(msg, []); g.get(msg).push(r); }
  return [...g].map(([msg, rs]) => {
    const slides = [...new Set(rs.map((r) => `b${r.block}.${r.beat}`))];
    const where = [...new Set(rs.map((r) => `${r.vp.id} ${r.theme}`))];
    return `${key === 'fails' ? 'FAIL' : 'WARN'} ${slides.length > 6 ? `${slides.slice(0, 6).join(',')} +${slides.length - 6}` : slides.join(',')} [${where.join(', ')}]: ${msg}`;
  });
};
lines.push(...group('fails'), ...group('warns'));
for (const h of [...new Set(rows.flatMap((r) => r.holds || []))]) lines.push(`NOTE ${h}`);
const slidesFailing = [...new Set(failRows.map((r) => r.block))];
lines.push('', `${failRows.length ? 'FAIL' : 'PASS'}: ${failRows.length}/${rows.length} shot(s) fail; slides failing: ${slidesFailing.length ? slidesFailing.map((b) => `b${b}`).join(' ') : 'none'}`);
lines.push(`shots + contact sheet: ${path.join(out, 'index.html')}`);
fs.writeFileSync(path.join(out, 'report.txt'), lines.join('\n') + '\n');

// Contact sheet: one row per slide/beat, every viewport x theme side by side. System colours only.
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const byKey = new Map(); for (const r of rows) { const k = `${r.block}.${r.beat}`; if (!byKey.has(k)) byKey.set(k, []); byKey.get(k).push(r); }
fs.writeFileSync(path.join(out, 'index.html'), `<!doctype html><meta charset="utf-8"><title>${esc(bundleId)} ${lesName} slides</title><style>:root{color-scheme:light dark}body{font:14px system-ui;margin:12px;background:Canvas;color:CanvasText}h2{margin:18px 0 6px;font-size:16px}.g{display:flex;flex-wrap:wrap;gap:8px;align-items:flex-start}figure{margin:0}img{display:block;max-height:360px;border:1px solid GrayText;border-radius:6px}figcaption{font-size:12px;max-width:420px}.f{font-weight:700}</style><h1>${esc(bundleId)} ${lesName}</h1>${[...byKey].map(([k, rs]) => `<h2>b${k} - ${esc(rs[0].id)}</h2><div class="g">${rs.map((r) => `<figure><img loading="lazy" src="${r.name}" alt=""><figcaption>${r.vp.id} ${r.theme}${r.fails.length ? `<br><span class="f">FAIL</span> ${esc(r.fails.join('; '))}` : ' PASS'}</figcaption></figure>`).join('')}</div>`).join('')}`);
console.log(lines.join('\n'));
