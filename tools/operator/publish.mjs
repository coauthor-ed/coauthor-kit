#!/usr/bin/env node
// publish - mirror a tier-1 (runtime) snapshot of the working repo into a separate public checkout. OPERATOR ONLY.
//
//   node tools/operator/publish.mjs --to <public checkout> [--bundle <id>] [--yes] [--diff] [--verify]
//        [--with-authoring] [--with-log] [--allow-rename] [--adopt-public-edits] [--engine <url>]
// Dry run unless --yes. A human commits and pushes the public repo; agents never run git.
// Tier 1 (always): lessons blocks questions explanations modules tests banks media, simulations/**/*.js, glossary.json, field-guide.json,
//   showcase/, generated manifest.json. Tier 2 (--with-authoring): OUTLINE.md, *.design.md, *.stub.md. Log (--with-log): GENERATION-LOG.md.
// Never: source/, _work/, steer/, COURSE-BRIEF.md, FIGURES.md, review-notes.json, bundle.json, old-artifacts/, any .pdf (refused, not skipped).
// Also writes: bundle-manifest.json, .nojekyll, COURSES.md, LICENSE (CC BY 4.0), LICENSE-CODE (MIT), NOTICE.md, CREDITS.md.
// publish.json (workspace root): { "bundles": { "<id>": { "path": "mathematics/circles", "title": "..." } }, "publicUrl": "https://...", "lastPublish": "<date>" }
//   Only listed bundles publish (none listed: every bundle, path = id; a bundle with no grade: <subject>/<id>).
//   A module with no "look" gets the bundle's look in the published copy (and "gamification": false for plain); working files stay as they are. An already-published path is never moved without --allow-rename.
// --diff   what the public checkout differs by (byte compare). --verify  serve the OUTPUT tree and click through each approved lesson in
//   the real app as a student (no preview flag): no console errors, no 404s; also validate.mjs + ident-lint over the output.
// --adopt-public-edits  copy files changed on the public side back into the working repo (dry run unless --yes).
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawnSync } from 'node:child_process';
import { parseArgs } from '../sim-test/lib/args.mjs';
import { KIT_ROOT } from '../sim-test/lib/bundle.mjs';
import { buildManifest, manifestTodos, bundlesIn, bundleMeta, readJ } from './lib/manifest.mjs';
import { bundleProfile } from '../staged-generation/lib/bundleProfile.mjs';
import { lessonFiles, lessonCodeOf, lessonItems, statusOf, listJson } from './lib/units.mjs';

const A = parseArgs(process.argv.slice(2), { tool: 'publish', file: import.meta.url, usage: 'node tools/operator/publish.mjs --to <public checkout> [--bundle <id>] [--yes] [--diff] [--verify] [--with-authoring] [--with-log] [--allow-rename] [--adopt-public-edits]', val: ['to', 'bundle', 'engine'], bool: ['yes', 'diff', 'verify', 'with-authoring', 'with-log', 'allow-rename', 'adopt-public-edits'] });
const root = process.cwd();
const pj = readJ(path.join(root, 'publish.json')) || {};
const to = path.resolve(A.val('to') || (pj.target ? path.resolve(root, pj.target) : ''));
if (!A.val('to') && !pj.target) { console.error('pass --to <public checkout> (or set "target" in publish.json)'); process.exit(2); }
const apply = A.has('yes');

const TIER1_DIRS = ['lessons', 'blocks', 'questions', 'explanations', 'modules', 'tests', 'banks', 'media', 'showcase'];
const TIER1_FILES = ['glossary.json', 'field-guide.json'];
const NEVER = /(^|\/)(source|_work|old-artifacts|steer|parts\/[^/]+\/source)(\/|$)|(^|\/)(FIGURES\.md|review-notes\.json|bundle\.json|BANK-PLAN\.md|COURSE-BRIEF\.md)$/;
const walk = (d, rel = '') => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name), rel ? `${rel}/${e.name}` : e.name) : [rel ? `${rel}/${e.name}` : e.name])) : [];

function files(B) {
  const out = new Set(); const refused = [];
  for (const d of TIER1_DIRS) for (const f of walk(path.join(B, d))) out.add(`${d}/${f}`);
  for (const f of TIER1_FILES) if (fs.existsSync(path.join(B, f))) out.add(f);
  if (fs.existsSync(path.join(B, 'showcase.json'))) out.add('showcase.json');
  for (const f of walk(path.join(B, 'simulations'))) { if (/\.js$/.test(f)) out.add(`simulations/${f}`); else if (A.has('with-authoring') && /\.(design|stub)\.md$/.test(f)) out.add(`simulations/${f}`); }
  if (A.has('with-authoring') && fs.existsSync(path.join(B, 'OUTLINE.md'))) out.add('OUTLINE.md');
  if (A.has('with-authoring')) for (const f of walk(path.join(B, 'parts'))) if (/OUTLINE\.md$/.test(f)) out.add(`parts/${f}`);
  if (A.has('with-log') && fs.existsSync(path.join(B, 'GENERATION-LOG.md'))) out.add('GENERATION-LOG.md');
  for (const f of [...out]) { if (/\.pdf$/i.test(f) || NEVER.test(f)) { refused.push(f); out.delete(f); } }
  for (const f of walk(B)) if (/\.pdf$/i.test(f) && !/^source\//.test(f) && !/(^|\/)_work\//.test(f)) refused.push(f);
  return { list: [...out].sort(), refused };
}

// ---- license gate ----
function mediaIssues(B) {
  const bad = [], nolic = [];
  for (const f of ['blocks', 'questions', 'explanations'].flatMap((d) => listJson(path.join(B, d)))) {
    const j = readJ(f); if (!j) continue;
    const ims = [j.image, ...Object.values(j.simulation?.images || {}), ...Object.values(j.images || {})].filter((i) => i && typeof i === 'object' && i.src);
    for (const im of ims) {
      if (im.license && /(^|[\s-])(NC|ND)([\s-]|$)|non-?commercial|no-?deriv/i.test(im.license)) bad.push(`${path.relative(B, f)}: ${im.src} (${im.license})`);
      else if (!im.license && !/^\s*(original|own)/i.test(im.credit || '')) nolic.push(`${path.relative(B, f)}: ${im.src}`);
    }
  }
  return { bad, nolic };
}

const defPath = (B, id) => { const m = bundleMeta(B); const g = m.grade != null && m.grade !== ''; const sl = String(m.subject || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); return g || !sl ? id : `${sl}/${id}`; };
const cfg = (B) => { const id = path.basename(B); const c = pj.bundles?.[id]; return { id, path: c?.path || defPath(B, id), title: c?.title || null, listed: !pj.bundles || !!c }; };
let bundles = bundlesIn(root).filter((b) => cfg(b).listed);
if (A.val('bundle')) bundles = bundles.filter((b) => path.basename(b) === A.val('bundle'));
if (!bundles.length) { console.error('no bundle to publish'); process.exit(2); }

if (A.has('adopt-public-edits')) {
  let n = 0;
  for (const B of bundles) {
    const c = cfg(B); const pub = path.join(to, c.path);
    for (const f of walk(pub)) { if (f === 'manifest.json') continue; const s = path.join(pub, f), d = path.join(B, f); if (fs.existsSync(d) && !fs.readFileSync(s).equals(fs.readFileSync(d))) { n++; console.log(`${apply ? 'adopt' : 'would adopt'} ${c.id}/${f}`); if (apply) fs.copyFileSync(s, d); } }
  }
  console.log(`${n} file(s)${apply ? ' copied back' : ' differ (dry run: add --yes)'}`); process.exit(0);
}

let fail = 0;
const plan = []; const warns = [];
for (const B of bundles) {
  const c = cfg(B); const meta = bundleMeta(B);
  if (!meta.subject) { console.error(`${c.id}: bundle.json needs subject; grade is optional (node tools/operator/meta.mjs apply --bundle ${c.id} fills modules and banks after that)`); fail++; continue; }
  const prev = pj.published?.[c.id];
  if (prev && prev !== c.path && !A.has('allow-rename')) { console.error(`${c.id}: already published at "${prev}", now "${c.path}": enrolments key on the manifest URL. Pass --allow-rename to move it.`); fail++; continue; }
  const { list, refused } = files(B);
  if (refused.length) { console.error(`${c.id}: refusing, these must not be published: ${refused.slice(0, 5).join(', ')}`); fail++; continue; }
  const mi = mediaIssues(B);
  if (mi.bad.length) { console.error(`${c.id}: NC/ND media: ${mi.bad.slice(0, 5).join('; ')}`); fail++; continue; }
  if (mi.nolic.length) warns.push(`${c.id}: ${mi.nolic.length} image(s) with no recorded license/credit (add image.credit + image.license): ${mi.nolic.slice(0, 3).join(', ')}${mi.nolic.length > 3 ? ' ...' : ''}`);
  for (const f of list) { const sz = fs.statSync(path.join(B, f)).size; if (sz > 25 << 20) warns.push(`${c.id}/${f}: ${(sz / 1048576).toFixed(0)} MB`); }
  // license: the LICENSE file written below is CC BY 4.0 (D10), so the manifest says the same unless bundle.json names another
  const manifest = { ...buildManifest(B), bundleId: c.path, ...(c.title ? { title: { en: c.title } } : {}) };
  if (!manifest.license) manifest.license = 'CC-BY-4.0';
  manifestTodos(manifest, c.id).forEach((w) => warns.push(w));
  plan.push({ B, c, list, manifest, meta });
}
if (fail) process.exit(1);
warns.forEach((w) => console.log(`WARN ${w}`));

// ---- tree assembly: relative path -> Buffer|{from} ----
const COURSES_URL = pj.publicUrl ? `${String(pj.publicUrl).replace(/\/$/, '')}/bundle-manifest.json` : '<your GitHub Pages URL>/bundle-manifest.json';
const CC = `Creative Commons Attribution 4.0 International (CC BY 4.0)\n\nThe course content in this repository (lessons, questions, explanations, media, glossary, banks) is licensed under CC BY 4.0.\nYou may share and adapt it, with attribution.\n\nDeed:       https://creativecommons.org/licenses/by/4.0/\nFull text:  https://creativecommons.org/licenses/by/4.0/legalcode\n`;
const MIT = fs.readFileSync(path.join(KIT_ROOT, 'tools', 'operator', 'licenses', 'MIT.txt'), 'utf8');
const tree = new Map(); const managed = [];
for (const { B, c, list, manifest } of plan) {
  managed.push(c.path);
  const bp = bundleProfile(root, c.id);
  for (const f of list) {
    let v = { from: path.join(B, f) };
    if (/^modules\/[^/]+\.json$/.test(f)) {
      const j = readJ(v.from);
      if (j && typeof j === 'object' && !j.look && (bp.look !== 'quill' || fs.existsSync(path.join(root, 'profile.json')))) { j.look = bp.look; if (bp.look === 'plain' && j.gamification === undefined) j.gamification = false; v = Buffer.from(JSON.stringify(j, null, 2) + '\n'); }
    }
    tree.set(`${c.path}/${f}`, v);
  }
  tree.set(`${c.path}/manifest.json`, Buffer.from(JSON.stringify(manifest, null, 2) + '\n'));
}
const title = (b) => (b.c.title || b.manifest.title?.en || b.c.id);
tree.set('bundle-manifest.json', Buffer.from(JSON.stringify({ type: 'bundle-manifest', title: pj.title || 'Courses', bundles: plan.map((b) => ({ manifest: `${b.c.path}/manifest.json`, title: title(b), status: b.manifest.status })) }, null, 2) + '\n'));
tree.set('.nojekyll', Buffer.from(''));
tree.set('COURSES.md', Buffer.from(`# Courses\n\nAdd this URL in the student app (Parent Dashboard > Course Sources):\n\n    ${COURSES_URL}\n\n${plan.map((b) => `- ${title(b)} (${b.manifest.status}): ${b.c.path}/`).join('\n')}\n\nContinue editing in your own copy: get the CoAuthor content kit, run \`node tools/operator/start.mjs\`, then \`node tools/operator/adopt.mjs <this repo>\` to pull these bundles into a working repo.\n`));
tree.set('LICENSE', Buffer.from(CC)); tree.set('LICENSE-CODE', Buffer.from(MIT));
tree.set('NOTICE.md', Buffer.from(`# Notice\n\n- Course text, questions, media and glossaries: CC BY 4.0 (see LICENSE).\n- Simulation scenes (\`simulations/**/*.js\`): MIT (see LICENSE-CODE).\n- The CoAuthor engine and its libraries are not part of this repository; they keep their own licenses.\n- Map borders (India) are loaded at runtime by the engine from the Survey of India layer under its own terms.\n- Third-party media keeps its own license, recorded per image in the lesson files (credit and license fields; see CREDITS.md).\n- Textbook text is not reproduced.\n`));
const credits = [];
for (const { B, c } of plan) for (const f of ['blocks', 'questions', 'explanations'].flatMap((d) => listJson(path.join(B, d)))) { const j = readJ(f); const im = j?.image; if (im?.src && (im.credit || im.license)) credits.push(`- ${c.path}/${im.src}: ${im.credit || '(no credit)'}${im.license ? ` - ${im.license}` : ''}`); }
tree.set('CREDITS.md', Buffer.from(`# Credits\n\n${credits.length ? [...new Set(credits)].join('\n') : 'No third-party media credits recorded.'}\n`));

const bytes = (v) => (Buffer.isBuffer(v) ? v : fs.readFileSync(v.from));
const changes = { added: [], changed: [], removed: [] };
for (const [rel, v] of tree) { const d = path.join(to, rel); if (!fs.existsSync(d)) changes.added.push(rel); else if (!bytes(v).equals(fs.readFileSync(d))) changes.changed.push(rel); }
for (const m of managed) for (const f of walk(path.join(to, m))) { const rel = `${m}/${f}`; if (!tree.has(rel)) changes.removed.push(rel); }
const show = (t, l) => { if (l.length) { console.log(`${t} (${l.length}):`); l.slice(0, A.has('diff') ? 200 : 12).forEach((f) => console.log('  ' + f)); if (!A.has('diff') && l.length > 12) console.log(`  ... +${l.length - 12} (--diff lists all)`); } };
console.log(`publish ${plan.map((b) => b.c.id).join(', ')} -> ${to}`);
show('new', changes.added); show('changed', changes.changed); show('removed', changes.removed);
if (!changes.added.length && !changes.changed.length && !changes.removed.length) console.log('public checkout is already up to date');

// suggested commit message from REV lines since the last publish
const since = pj.lastPublish || '0000-00-00';
const revs = plan.flatMap((b) => { try { return fs.readFileSync(path.join(b.B, 'GENERATION-LOG.md'), 'utf8').split('\n').filter((l) => /^REV \d{4}/.test(l) && l.slice(4, 14) > since).map((l) => `${b.c.id}: ${l.slice(15).split('|').slice(0, 3).join('|').trim()}`); } catch { return []; } });
console.log(`\nsuggested commit message:\n  Publish ${plan.map((b) => b.c.id).join(', ')} (${plan.map((b) => `${b.c.id}: ${b.manifest.status}`).join(', ')})${revs.length ? `\n${revs.slice(-12).map((r) => '  - ' + r).join('\n')}` : ''}`);

if (!apply) { if (!A.has('verify')) console.log('\n(dry run: add --yes to write; --verify to click through the result)'); }
else {
  for (const [rel, v] of tree) { const d = path.join(to, rel); fs.mkdirSync(path.dirname(d), { recursive: true }); fs.writeFileSync(d, bytes(v)); }
  for (const rel of changes.removed) fs.rmSync(path.join(to, rel), { force: true });
  const published = { ...(pj.published || {}) }; for (const b of plan) published[b.c.id] = b.c.path;
  fs.writeFileSync(path.join(root, 'publish.json'), JSON.stringify({ ...pj, published, lastPublish: new Date().toISOString().slice(0, 10) }, null, 2) + '\n');
  spawnSync(process.execPath, [path.join(KIT_ROOT, 'tools', 'log.mjs'), 'rev', '--bundle', plan[0].B, '--scope', 'publish', '--who', 'operator', '--what', `published ${plan.map((b) => b.c.id).join(', ')} to ${path.basename(to)}`], { stdio: 'ignore' });
  console.log(`\nwritten. Commit and push ${to} yourself.`);
}

// ---- verify: validate the output tree, then click through approved lessons as a student ----
if (A.has('verify')) {
  if (!fs.existsSync(to)) { console.error('nothing to verify: the public checkout does not exist yet (publish with --yes first)'); process.exit(1); }
  let bad = 0;
  for (const b of plan) {
    const out = path.join(to, b.c.path);
    const v = spawnSync(process.execPath, [path.join(KIT_ROOT, 'validators', 'validate.mjs'), ...['lessons', 'modules', 'banks'].flatMap((d) => listJson(path.join(out, d)))], { encoding: 'utf8', cwd: KIT_ROOT });
    const nf = (v.stdout || '').split('\n').filter((l) => /^FAIL /.test(l)).length; if (nf) { bad++; console.log(`FAIL ${b.c.id}: ${nf} file(s) fail validate.mjs in the output tree`); }
    const il = spawnSync(process.execPath, [path.join(KIT_ROOT, 'tools', 'sim-test', 'ident-lint.mjs'), path.join(out, 'simulations'), '--quiet'], { encoding: 'utf8' });
    if (il.status && fs.existsSync(path.join(out, 'simulations'))) { bad++; console.log(`FAIL ${b.c.id}: ident-lint fails on the output scenes (a scene imports a file that is not in the tier-1 set?)`); }
  }
  const { playwright } = await import('../sim-test/lib/serve.mjs'); const pw = playwright();
  if (!pw) { console.log('WARN Playwright not found: skipped the student click-through'); process.exit(bad ? 1 : 0); }
  const engine = (A.val('engine') || 'http://127.0.0.1:9040').replace(/\/$/, '');
  const srv = http.createServer((req, res) => { const f = path.join(to, decodeURIComponent(new URL(req.url, 'http://x').pathname)); if (!f.startsWith(to) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404, { 'Access-Control-Allow-Origin': '*' }); return res.end(); } res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store', 'Content-Type': f.endsWith('.json') ? 'application/json' : f.endsWith('.js') ? 'text/javascript' : f.endsWith('.md') ? 'text/markdown' : 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const pub = `http://127.0.0.1:${srv.address().port}`;
  const browser = await pw.chromium.launch();
  try {
    for (const b of plan) {
      const ok = lessonFiles(b.B).filter((lf) => statusOf(lf) === 'human-approved');
      if (!ok.length) { console.log(`${b.c.id}: no approved lesson to click through`); continue; }
      for (const lf of ok) {
        const items = lessonItems(b.B, lf); let errs = 0;
        for (const it of items) {
          const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } }); const page = await ctx.newPage(); const problems = [];
          page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`)); page.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) problems.push(`console: ${m.text().slice(0, 120)}`); });
          page.on('response', (r) => { if (r.status() >= 400 && r.url().startsWith(pub) && !/\/(glossary|field-guide)\.json$/.test(r.url())) problems.push(`${r.status()} ${r.url().slice(pub.length)}`); });
          await page.goto(`${engine}/?remoteManifestUrl=${encodeURIComponent(`${pub}/${b.c.path}/manifest.json`)}#/lesson/courses/${b.c.path}/${path.relative(b.B, lf)}?block=${it.index}`).catch((e) => problems.push(`goto: ${e.message}`));
          await page.waitForTimeout(2200);
          if (await page.getByText('still in draft').count()) problems.push('shows the draft placeholder');
          if (problems.length) { errs++; console.log(`FAIL ${b.c.id} ${lessonCodeOf(lf)} slide ${it.index + 1}: ${problems.slice(0, 3).join(' | ')}`); }
          await ctx.close();
        }
        if (errs) bad++; else console.log(`ok   ${b.c.id} ${lessonCodeOf(lf)}: ${items.length} slide(s) load as a student`);
      }
    }
  } finally { await browser.close(); srv.close(); }
  console.log(bad ? 'VERIFY FAIL' : 'VERIFY PASS'); process.exit(bad ? 1 : 0);
}
