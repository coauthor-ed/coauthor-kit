#!/usr/bin/env node
// contact-sheet - beat-by-beat real-app screenshots of one lesson on one HTML page (light/dark, phone/desktop). OPERATOR ONLY.
//
//   node tools/operator/contact-sheet.mjs --bundle <id> --lesson L02 [--kit http://127.0.0.1:9050] [--engine <url>]
//        [--themes light,dark] [--viewports phone,desktop] [--max-beats 8]
// Needs the kit server running (tools/operator/preview.mjs). Output: build/contact-sheet/<bundle>/<lesson>/index.html (+ jpgs).
// Skim a lesson in a minute before opening the live preview; also the input for an image-capable model's 3-look.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from '../sim-test/lib/args.mjs';
import { bundleFromArg, defaultBundle, KIT_ROOT, markdownOf } from '../sim-test/lib/bundle.mjs';
import { splitSteps } from '../beat-check/vendor/splitSteps.js';
import { lessonFiles, lessonCodeOf, lessonItems } from './lib/units.mjs';
import { launch, openAt, shotTo, withParams } from './lib/shots.mjs';

const A = parseArgs(process.argv.slice(2), { tool: 'contact-sheet', file: import.meta.url, usage: 'node tools/operator/contact-sheet.mjs --bundle <id> --lesson L02 [--kit <url>] [--engine <url>] [--themes light,dark] [--viewports phone,desktop] [--max-beats 8]', val: ['bundle', 'lesson', 'kit', 'engine', 'themes', 'viewports', 'max-beats'], bool: [] });
const B = A.val('bundle') ? bundleFromArg(A.val('bundle')) : defaultBundle();
const L = (A.val('lesson') || '').toUpperCase();
if (!B || !L) { console.error('need --bundle and --lesson'); process.exit(2); }
const lf = lessonFiles(B).find((f) => lessonCodeOf(f) === L);
if (!lf) { console.error(`no lesson ${L}`); process.exit(2); }
const kit = (A.val('kit') || 'http://127.0.0.1:9050').replace(/\/$/, '');
let cfg; try { cfg = await (await fetch(`${kit}/_kit/config`)).json(); } catch { console.error(`kit server not reachable at ${kit}: start tools/operator/preview.mjs`); process.exit(2); }
const engine = (A.val('engine') || cfg.engine || '').replace(/\/$/, '');
if (!engine) { console.error('engine not known: pass --engine <url>'); process.exit(2); }
const dir = path.basename(B), rel = path.relative(B, lf);
const mf = await (await fetch(`${kit}/courses/${dir}/manifest.json`)).json();
const base = `${engine}/?remoteManifestUrl=${encodeURIComponent(`${kit}/courses/${dir}/manifest.json`)}&preview=true#/lesson/courses/${mf.bundleId}/${rel}`;
const themes = (A.val('themes') || 'light,dark').split(','), vps = (A.val('viewports') || 'phone,desktop').split(',');
const maxBeats = Number(A.val('max-beats')) || 8;
const out = path.join(KIT_ROOT, 'build', 'contact-sheet', dir, L);
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
const items = lessonItems(B, lf);
const browser = await launch();
const cells = [];
try {
  for (const it of items) {
    let j = {}; try { j = JSON.parse(fs.readFileSync(it.file, 'utf8')); } catch { /* skip */ }
    const md = markdownOf(B, j);
    const beats = Math.min(maxBeats, md ? Math.max(1, splitSteps(md).steps.length) : 1);
    for (let beat = 0; beat < beats; beat++) {
      for (const theme of themes) for (const vp of vps) {
        const { page, ctx } = await openAt(browser, withParams(base, { block: it.index, beat }), { theme, viewport: vp });
        const name = `s${String(it.index + 1).padStart(2, '0')}-b${beat}-${theme}-${vp}.jpg`;
        await shotTo(page, path.join(out, name)); await ctx.close();
        cells.push({ name, slide: it.index + 1, id: it.id, beat, theme, vp });
      }
    }
    process.stdout.write(`slide ${it.index + 1}/${items.length}\r`);
  }
} finally { await browser.close(); }
const bySlide = new Map(); for (const c of cells) { if (!bySlide.has(c.slide)) bySlide.set(c.slide, []); bySlide.get(c.slide).push(c); }
fs.writeFileSync(path.join(out, 'index.html'), `<!doctype html><meta charset="utf-8"><title>${dir} ${L}</title><style>body{font:14px system-ui;margin:12px;background:#f4f5f7;color:#1c2430}h2{margin:18px 0 6px}.g{display:flex;flex-wrap:wrap;gap:8px}figure{margin:0}img{display:block;max-height:340px;border:1px solid #bbb;border-radius:6px}figcaption{font-size:12px;color:#667}</style><h1>${dir} ${L}</h1>${[...bySlide].map(([s, cs]) => `<h2>Slide ${s} - ${cs[0].id}</h2><div class="g">${cs.map((c) => `<figure><img loading="lazy" src="${c.name}" alt=""><figcaption>beat ${c.beat} ${c.theme} ${c.vp}</figcaption></figure>`).join('')}</div>`).join('')}`);
console.log(`\n${cells.length} screenshots: ${path.join(out, 'index.html')}`);
