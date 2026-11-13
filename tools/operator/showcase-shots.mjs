#!/usr/bin/env node
// showcase-shots - screenshot chosen slides/beats of a bundle from the real app for its Discover card. OPERATOR ONLY.
//
//   node tools/operator/showcase-shots.mjs --bundle <id> [--kit http://127.0.0.1:9050] [--engine <url>] [--variants desktop-light,phone-dark]
// Reads courses/<b>/showcase.json "shots": [{ "scope": "L02S03", "beat": 1, "caption": "..." }] (written by the Stage 5 agent),
// takes each shot in the first variant (a phone and a desktop view of the same shot only if you list both), compresses to ~150 KB
// JPEG (at most 6 images), writes courses/<b>/showcase/shot-N.jpg and fills "screenshots" in showcase.json. Needs preview.mjs running.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from '../sim-test/lib/args.mjs';
import { bundleFromArg, defaultBundle } from '../sim-test/lib/bundle.mjs';
import { lessonFiles, lessonCodeOf } from './lib/units.mjs';
import { readJ } from './lib/manifest.mjs';
import { launch, openAt, shotTo, withParams } from './lib/shots.mjs';

const A = parseArgs(process.argv.slice(2), { tool: 'showcase-shots', file: import.meta.url, usage: 'node tools/operator/showcase-shots.mjs --bundle <id> [--kit <url>] [--engine <url>] [--variants desktop-light,phone-dark]', val: ['bundle', 'kit', 'engine', 'variants'], bool: [] });
const B = A.val('bundle') ? bundleFromArg(A.val('bundle')) : defaultBundle();
if (!B) { console.error('pass --bundle <id>'); process.exit(2); }
const sp = path.join(B, 'showcase.json'); const sc = readJ(sp);
if (!sc?.shots?.length) { console.error('showcase.json has no "shots" (the Stage 5 brief writes them)'); process.exit(2); }
const kit = (A.val('kit') || 'http://127.0.0.1:9050').replace(/\/$/, '');
let cfg; try { cfg = await (await fetch(`${kit}/_kit/config`)).json(); } catch { console.error(`kit server not reachable at ${kit}: start tools/operator/preview.mjs`); process.exit(2); }
const engine = (A.val('engine') || cfg.engine || '').replace(/\/$/, ''); if (!engine) { console.error('engine not known: pass --engine'); process.exit(2); }
const dir = path.basename(B); const mf = await (await fetch(`${kit}/courses/${dir}/manifest.json`)).json();
const variants = (A.val('variants') || 'desktop-light').split(',').map((v) => v.split('-'));
const outDir = path.join(B, 'showcase'); fs.mkdirSync(outDir, { recursive: true });
const browser = await launch(); const shots = [];
try {
  let n = 0;
  for (const s of sc.shots) for (const [vp, theme] of variants) {
    if (n >= 6) break;
    const m = /^(L[\dA-Z-]+?)S(\d+)$/i.exec(s.scope || ''); const lf = m && lessonFiles(B).find((f) => lessonCodeOf(f) === m[1].toUpperCase());
    if (!lf) { console.error(`skip ${s.scope}: no such slide`); continue; }
    const link = withParams(`${engine}/?remoteManifestUrl=${encodeURIComponent(`${kit}/courses/${dir}/manifest.json`)}&preview=true#/lesson/courses/${mf.bundleId}/${path.relative(B, lf)}`, { block: Number(m[2]) - 1, beat: s.beat || 0 });
    const { page, ctx } = await openAt(browser, link, { theme, viewport: vp, wait: 2200 });
    let q = 70, size = 0; const file = path.join(outDir, `shot-${++n}.jpg`);
    for (; q >= 30; q -= 10) { size = await shotTo(page, file, { quality: q }); if (size <= 150 * 1024) break; }
    await ctx.close(); shots.push({ src: `showcase/shot-${n}.jpg`, caption: s.caption || '' }); console.log(`${s.scope} beat ${s.beat || 0} ${vp}-${theme}: ${(size / 1024).toFixed(0)} KB`);
  }
} finally { await browser.close(); }
fs.writeFileSync(sp, JSON.stringify({ ...sc, screenshots: shots }, null, 2) + '\n');
console.log(`${shots.length} screenshot(s) -> showcase/, showcase.json updated`);
