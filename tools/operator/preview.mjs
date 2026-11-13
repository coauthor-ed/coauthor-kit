#!/usr/bin/env node
// preview - the kit server: serves the workspace's courses to the engine, a dashboard, a review API and live reload. OPERATOR ONLY.
//
//   node tools/operator/preview.mjs [--port 9050] [--lan] [--serve-engine <dir>] [--engine <url>] [--engine-dir <dir>] [--no-discovery] [--advertise-host <ip>]
// Serves courses/<bundle>/** (never source/, _work/, PDFs) with CORS and Cache-Control: no-store; manifest.json and
// /bundle-manifest.json are generated on the fly. Finds the engine by discovery or --engine, else starts its tools/serve-local.py
// (needs the engine checkout: --engine-dir or $COAUTHOR_ENGINE_DIR; ./coauthor and ../coauthor are tried). Run it on the HOST,
// not in a container (multicast does not cross a Docker bridge). Binds 127.0.0.1 unless --lan (needed for phones and other PCs).
// Writes (approve, unapprove, notes) need the pairing code printed here, typed once per kit in the review bar or dashboard.
// --serve-engine <engine checkout>: serves it read-only under /engine/ on this same port (one origin, for browser workspaces such as Codespaces);
//   the kit and engine URLs then follow the request's Host / X-Forwarded-Host / X-Forwarded-Proto, and GET /_kit/code shows the pairing code.
// API: GET /_kit/config /_kit/bundles /_kit/status?bundle= /_kit/item /_kit/notes /_kit/context /_kit/fixprompt /_kit/events (SSE)
//      /_kit/fixprompt?bundle=&lesson=&states=accepted&do=&combined=1 -> REVISE prompts from notes (combined: ONE prompt; else one per lesson;
//      ids = the notes it holds, for Mark these N done). Directions (kind direction) are never in it.
//      /_kit/plan?bundle= -> units to steer (outline lessons, built or not, and their scene stubs) + directions
//      /_kit/next?bundle=&review=manual -> next.mjs --units prompts (with Notes: / Review: manual)   /_kit/tests?bundle=&src= -> tests file + command
//      POST /_kit/approve /_kit/unapprove /_kit/notes /_kit/notes/state {ids,state} /_kit/notes/edit {id,text,kind,scope,stage}
//      /_kit/notes/delete {id} /_kit/runtests {src} (runs the scene's Must-get-right tests file) /_kit/scene/reviewed {src} (review-pending -> done)
//      (JSON; header X-Kit-Code)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import net from 'node:net';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { AsyncLocalStorage } from 'node:async_hooks';
import { fileURLToPath } from 'node:url';
import { parseArgs } from '../sim-test/lib/args.mjs';
import { KIT_ROOT, LESSON_ID_SRC, compareLessonIds } from '../sim-test/lib/bundle.mjs';
import { buildManifest, bundlesIn, bundleMeta, readJ } from './lib/manifest.mjs';
import { lessonFiles, lessonCodeOf, lessonItems, statusOf, resolveScope } from './lib/units.mjs';
import { planStatus, applyStatus, kitReviewer } from './lib/approval.mjs';
import { loadNotes, addNote, editNote, deleteNote, setState, dispatch, fixPrompt, STATES } from './lib/notes.mjs';
import { lessonsForBundle, sceneStates } from '../staged-generation/next.mjs';
import { familyForStubText } from '../staged-generation/lib/families.mjs';
import { partsOf } from '../sim-test/lib/bundle.mjs';
import { startDiscovery, lanAddress } from './lib/discovery.mjs';

const A = parseArgs(process.argv.slice(2), { tool: 'preview', file: import.meta.url, usage: 'node tools/operator/preview.mjs [--port 9050] [--lan] [--engine <url>] [--engine-dir <dir>] [--serve-engine <dir>] [--no-discovery] [--advertise-host <ip>]', val: ['port', 'engine', 'engine-dir', 'serve-engine', 'advertise-host'], bool: ['lan', 'no-discovery'] });
const root = process.cwd();
const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(HERE, 'web');
const code = String(crypto.randomInt(0, 1e6)).padStart(6, '0');
const MIME = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.md': 'text/markdown; charset=utf-8', '.woff2': 'font/woff2', '.wasm': 'application/wasm', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8', '.ico': 'image/x-icon', '.map': 'application/json', '.woff': 'font/woff', '.ttf': 'font/ttf', '.csv': 'text/csv; charset=utf-8', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.mp4': 'video/mp4' };
const DENY = /(^|\/)(source|_work|\.git|old-artifacts)(\/|$)|\.pdf$/i;

const freePort = (start) => new Promise((resolve) => { const t = (p) => { const s = net.createServer(); s.once('error', () => t(p + 1)); s.once('listening', () => s.close(() => resolve(p))); s.listen(p, '127.0.0.1'); }; t(start); });
const isUp = (url) => fetch(url, { signal: AbortSignal.timeout(1200) }).then((r) => r.ok || r.status < 500).catch(() => false);

let kitUrl = '', engineUrl = A.val('engine') || null, engineProc = null;
const advertise = A.val('advertise-host') || (A.has('lan') ? lanAddress() : '127.0.0.1');
const SERVE_ENGINE = A.val('serve-engine') ? path.resolve(A.val('serve-engine')) : null;
if (SERVE_ENGINE && !fs.existsSync(path.join(SERVE_ENGINE, 'index.html'))) { console.error(`--serve-engine: no index.html in ${SERVE_ENGINE}`); process.exit(1); }
// Per-request base (only with --serve-engine): the URL the browser used to reach us, e.g. https://<codespace>-9050.app.github.dev
const ctx = new AsyncLocalStorage();
const KIT = () => ctx.getStore()?.kit || kitUrl;
const ENG = () => ctx.getStore()?.engine || engineUrl;
function baseOf(req) {
  const first = (v) => String(v || '').split(',')[0].trim();
  const host = first(req.headers['x-forwarded-host']) || req.headers.host; const proto = first(req.headers['x-forwarded-proto']) || 'http';
  if (!host || !/^[\w.:\[\]-]+$/.test(host) || !/^https?$/.test(proto)) return null;
  const kit = `${proto}://${host}`; return { kit, engine: `${kit}/engine` };
}
const allowedOrigins = () => new Set([kitUrl, KIT(), engineUrl && new URL(engineUrl).origin, ...(disc ? disc.peers().filter((p) => p.role === 'engine').map((p) => new URL(p.url).origin) : [])].filter(Boolean));

const bundleDir = (name) => { const d = path.join(root, 'courses', path.basename(String(name || ''))); return fs.existsSync(d) ? d : null; };
function manifestOf(B) { const m = buildManifest(B); return m; }
function deepLink(B, lessonRel, index) {
  if (!ENG()) return null;
  const m = manifestOf(B); const id = m.bundleId;
  const q = new URLSearchParams({ remoteManifestUrl: `${KIT()}/courses/${path.basename(B)}/manifest.json`, preview: 'true', reviewApi: KIT() });
  return `${ENG().replace(/\/$/, '')}/?${q}#/lesson/courses/${id}/${lessonRel}${index != null ? `?block=${index}` : ''}`;
}
function checksOf(B) { return readJ(path.join(KIT_ROOT, 'build', 'check-all', `${path.basename(B)}.json`))?.results || []; }
function sceneStatus(B, j) {
  const src = j?.simulation?.src || (/^(poe-observe-sim|mini-game)@/.test(j?.type || '') ? j.src : null);
  if (!src) return null;
  let status = null; try { status = /^Status:\s*(\S+)/m.exec(fs.readFileSync(path.join(B, src.replace(/\.js$/, '.design.md')), 'utf8'))?.[1] || null; } catch { /* no note */ }
  return { src, status, tests: !!testsOf(B, src) };
}
// A scene's Must-get-right tests file (written by the build pass, never run by it): build/scratch/<bundle>/<Scene>-tests.json.
// The operator's runs pass --more (the 3-run probe cap is an agent budget, not yours).
function sceneRef(B, src) {
  const m = /^simulations\/([^/]+)\/([\w.-]+)\.js$/.exec(String(src || '')); if (!m) return null;
  const js = path.join(B, src); return fs.existsSync(js) ? { lesson: m[1], name: m[2], js, design: js.replace(/\.js$/, '.design.md'), stub: js.replace(/\.js$/, '.stub.md') } : null;
}
function testsOf(B, src) {
  const r = sceneRef(B, src); if (!r) return null;
  const file = path.join(KIT_ROOT, 'build', 'scratch', path.basename(B), `${r.name}-tests.json`);
  if (!fs.existsSync(file)) return null;
  const head = [r.stub, r.design].map((f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } }).join('\n');
  const fam = familyForStubText(head) || 'dom';
  const relF = path.relative(KIT_ROOT, file).split(path.sep).join('/');
  const canvas = fam === 'canvas' || fam === 'geo';
  const bid = path.basename(B);
  return { ...r, file, family: fam, canvas, cmd: canvas ? `node tools/sim-test/run.mjs exec tools/sim-test/drive.mjs ${r.lesson}/${r.name} --bundle ${bid} --steps=@${relF} --more` : `node tools/sim-test/drive-dom.mjs ${r.lesson}/${r.name} --bundle ${bid} --steps=@${relF} --more` };
}
const running = new Set();
function runTests(B, src) {
  const t = testsOf(B, src); if (!t) throw new Error('no tests file for this scene (the build pass writes build/scratch/<bundle>/<Scene>-tests.json)');
  const key = `${path.basename(B)}/${t.name}`; if (running.has(key)) throw new Error('tests already running for this scene');
  const S = path.join(KIT_ROOT, 'tools', 'sim-test');
  const args = t.canvas ? [path.join(S, 'run.mjs'), 'exec', path.join(S, 'drive.mjs'), `${t.lesson}/${t.name}`, '--bundle', B, `--steps=@${t.file}`, '--more'] : [path.join(S, 'drive-dom.mjs'), `${t.lesson}/${t.name}`, '--bundle', B, `--steps=@${t.file}`, '--more'];
  running.add(key);
  return new Promise((resolve) => {
    const p = spawn(process.execPath, args, { cwd: KIT_ROOT, stdio: ['ignore', 'pipe', 'pipe'] }); let out = '';
    const add = (c) => { out += c; if (out.length > 200000) out = out.slice(-100000); };
    p.stdout.on('data', add); p.stderr.on('data', add);
    const timer = setTimeout(() => { p.kill('SIGKILL'); add('\nTIMEOUT after 240 s'); }, 240000);
    p.on('close', (codeN) => {
      clearTimeout(timer); running.delete(key);
      const lines = out.split('\n'); const fails = lines.map((l) => l.trim()).filter((l) => /^(FAIL:|HANG|TIMEOUT)/.test(l));
      resolve({ ok: codeN === 0, exit: codeN, summary: lines.filter((l) => /^(PASS|FAIL) - /.test(l)).pop() || (codeN === 0 ? 'PASS' : `exit ${codeN}`), fails, output: lines.slice(-80).join('\n'), cmd: t.cmd });
    });
  });
}
// Mark reviewed: a review-pending scene (Review: manual) becomes done, with a Progress line.
function markReviewed(B, src, by) {
  const r = sceneRef(B, src); if (!r || !fs.existsSync(r.design)) throw new Error('no design note for this scene');
  let note = fs.readFileSync(r.design, 'utf8'); const st = (/^Status:[ \t]*([\w-]+)/mi.exec(note) || [])[1];
  if (st !== 'review-pending') throw new Error(`Status is ${st || 'missing'}, not review-pending`);
  note = note.replace(/^Status:.*$/m, 'Status: done');
  const line = `- reviewed: done (${by || 'operator'}, ${new Date().toISOString().slice(0, 10)})`;
  note = /^## Progress[^\n]*\n/m.test(note) ? note.replace(/^(## Progress[^\n]*\n(?:- [^\n]*\n)*)/m, (m) => m + line + '\n') : note.replace(/\s*$/, `\n\n## Progress\n${line}\n`);
  const tmp = r.design + '.tmp'; fs.writeFileSync(tmp, note); fs.renameSync(tmp, r.design);
  return { status: 'done' };
}
// Units to steer: every outline lesson (built or not) and its scene stubs, so a direction can be left before the run.
function planOf(B) {
  const parts = partsOf(B);
  const outline = parts.length ? parts.flatMap((p) => lessonsForBundle(B, p)) : lessonsForBundle(B, null);
  const built = new Map(lessonFiles(B).map((f) => [lessonCodeOf(f), f]));
  const ids = [...new Set([...outline.map((l) => l.id), ...built.keys()])].sort(compareLessonIds);
  const scenes = sceneStates(B, ids.map((id) => ({ id })));
  const notes = loadNotes(B).filter((n) => n.kind === 'direction');
  return { bundle: path.basename(B), lessons: ids.map((id) => ({ code: id, title: outline.find((l) => l.id === id)?.title || readJ(built.get(id))?.title?.en || id, built: built.has(id),
    scenes: scenes.filter((s) => s.lesson === id).map((s) => ({ name: path.basename(s.scene, '.js'), status: s.status, src: path.relative(B, s.scene).split(path.sep).join('/') })) })),
  directions: notes };
}
function nextUnits(B, review) {
  return new Promise((resolve) => {
    const args = [path.join(KIT_ROOT, 'tools', 'staged-generation', 'next.mjs'), '--units', '--bundle', path.basename(B), '--repo', root, ...(review === 'manual' ? ['--review', 'manual'] : [])];
    const p = spawn(process.execPath, args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] }); let out = '';
    p.stdout.on('data', (c) => { out += c; }); p.stderr.on('data', () => {});
    p.on('close', () => { try { const j = JSON.parse(out); resolve({ stage: j.stage, units: (j.units || []).map((u) => ({ id: u.id, label: u.label, prompt: u.prompt })) }); } catch { resolve({ stage: 'error', units: [] }); } });
  });
}
function statusPayload(B) {
  const all = loadNotes(B); const notes = all.filter((n) => (n.state === 'open' || n.state === 'accepted') && n.kind !== 'direction' && n.kind !== 'alternative');
  const dirs = all.filter((n) => n.kind === 'direction' && n.state === 'accepted');
  const checks = checksOf(B);
  const lessons = lessonFiles(B).sort().map((lf) => {
    const code = lessonCodeOf(lf); const rel = path.relative(B, lf);
    const items = lessonItems(B, lf).map((it) => {
      const j = readJ(it.file) || {}; const sc = sceneStatus(B, j);
      return { index: it.index, n: it.index + 1, id: it.id, status: statusOf(it.file), scene: sc, scope: `${code}S${String(it.index + 1).padStart(2, '0')}`, notes: notes.filter((n) => n.scope.toUpperCase() === `${code}S${String(it.index + 1).padStart(2, '0')}` || n.scope.toUpperCase() === `${code}S${it.index + 1}`).length, link: deepLink(B, rel, it.index) };
    });
    const cs = checks.filter((c) => c.scope === code || c.scope.startsWith(code + '/'));
    return { code, file: rel, title: readJ(lf)?.title?.en || code, status: statusOf(lf), items, approved: items.filter((i) => i.status === 'human-approved').length, checks: { lines: cs.filter((c) => c.fail || c.warn).flatMap((c) => (c.detail || []).map((d) => `${c.scope} ${c.check}: ${d}`)), fail: cs.reduce((a, c) => a + c.fail, 0), warn: cs.reduce((a, c) => a + c.warn, 0), ran: cs.length > 0 }, lookPending: items.some((i) => i.scene?.status === 'look-pending'), reviewPending: items.filter((i) => i.scene?.status === 'review-pending').length, steer: dirs.filter((n) => n.scope.toUpperCase().split('/')[0].replace(/S\d+$/, '') === code.toUpperCase()).length, building: items.some((i) => i.scene?.status === 'building'), notesOpen: notes.filter((n) => n.scope.toUpperCase().startsWith(code)).length, link: deepLink(B, rel, null) };
  });
  return { bundle: path.basename(B), steerBundle: dirs.filter((n) => n.scope === 'bundle').length, meta: bundleMeta(B), manifest: { status: manifestOf(B).status }, bundleChecks: checks.filter((c) => c.scope === 'bundle' && (c.fail || c.warn)).map((c) => ({ check: c.check, fail: c.fail, warn: c.warn, lines: c.detail || [] })), lessons };
}
function itemInfo(B, lessonRel, index) {
  const lf = path.join(B, lessonRel); const lesson = readJ(lf); const items = lessonItems(B, lf);
  const it = items[index]; if (!it) return null;
  const next = (() => {
    for (const l of lessonFiles(B).sort()) { const its = lessonItems(B, l); for (const x of its) { if (l < lf || (l === lf && x.index <= index)) continue; if (statusOf(x.file) !== 'human-approved') return { lesson: path.relative(B, l), index: x.index, link: deepLink(B, path.relative(B, l), x.index) }; } }
    return null;
  })();
  return { code: lessonCodeOf(lf), title: lesson?.title?.en, index, n: index + 1, total: items.length, id: it.id, status: statusOf(it.file), lessonStatus: statusOf(lf), next, scope: `${lessonCodeOf(lf)}S${String(index + 1).padStart(2, '0')}`, scene: sceneStatus(B, readJ(it.file)) };
}
function contextFor(B, scope, doText) {
  return `Read REVISE.md and follow it. Bundle: ${path.basename(B)}. Scope: ${scope}. Do: ${doText || '<what to change>'}.`;
}

// ---- SSE ----
const clients = new Set();
const pending = new Map();
// Own writes (notes, approve, mark reviewed) must not reload the viewer; they open a short mute window. A change is pushed only if it can alter what the
// page shows (not temp/swap files, .md notes, review-notes), only for the bundle it happened in (agents work in other bundles), and bursts coalesce for 800 ms.
let mutedUntil = 0; const mute = () => { mutedUntil = Date.now() + 1500; };
function broadcast(bundle, p, lesson = null) { const key = `${bundle}/${lesson}`; clearTimeout(pending.get(key)); pending.set(key, setTimeout(() => { pending.delete(key); if (Date.now() < mutedUntil) return; for (const c of clients) c.write(`data: ${JSON.stringify({ bundle, lesson, path: p, at: Date.now() })}\n\n`); }, 800)); }
const SKIP = /(^|\/)(source|_work|\.git|node_modules)(\/|$)|review-notes\.json|GENERATION-LOG|\.tmp(\.[\w-]+)*$|\.(swp|swx|bak|md|log)$|~$|(^|\/)(\.#|\.DS_Store|4913$)/;
// Only files the page can actually load count (an allowlist, so no editor/agent temp-file naming scheme can trigger a reload).
const CONTENT = /\.(json|js|mjs|css|html|svg|png|jpe?g|webp|gif|mp3|ogg|mp4|woff2)$/i;
// Each bundle is watched at its real path (a symlinked bundle is not followed by a watch of courses/) and its events are tagged with the bundle's name; check-all results live in build/ as <bundle>.json.
// An event only counts if the file's CONTENT differs from the last one seen (touch, chmod, rsync/sync-tool rewrites and duplicate inotify events change nothing the page shows). Every pushed reload is logged.
// A scene (simulations/L05/...) or lesson file (lessons/les-05.json) belongs to one lesson; the viewer of another lesson ignores it. Everything else (blocks, questions, bundle files) is bundle-wide (null).
const SIM_LESSON_RE = new RegExp(`^simulations/(${LESSON_ID_SRC})/`, 'i');
const lessonOfPath = (rel) => { const m = SIM_LESSON_RE.exec(rel); if (m) return m[1].toUpperCase(); const l = /^lessons\/([^/]+\.json)$/.exec(rel); return l ? lessonCodeOf(l[1]) : null; };
const watched = new Set(); const seen = new Map();
const sig = (file) => { try { const st = fs.statSync(file); if (!st.isFile()) return null; return st.size > 4e6 ? `${st.size}:${st.mtimeMs}` : crypto.createHash('sha1').update(fs.readFileSync(file)).digest('hex'); } catch { return 'gone'; } };
function prime(dir, rel = '') { let es; try { es = fs.readdirSync(path.join(dir, rel), { withFileTypes: true }); } catch { return; } for (const e of es) { const r = rel ? `${rel}/${e.name}` : e.name; if (SKIP.test(r)) continue; if (e.isDirectory()) prime(dir, r); else if (e.isFile()) seen.set(path.join(dir, r), sig(path.join(dir, r))); } }
function watchDir(d, bundle) { let r; try { r = fs.realpathSync(d); } catch { return; } if (watched.has(r)) return; watched.add(r); prime(r); try { fs.watch(r, { recursive: true }, (_e, f) => { if (!f) return; const rel = f.replace(/\\/g, '/'); if (SKIP.test(rel) || !CONTENT.test(rel)) return; const full = path.join(r, f); const now = sig(full); if (now === null || seen.get(full) === now || (now === 'gone' && !seen.has(full))) return; seen.set(full, now); const b = bundle(rel); const lesson = lessonOfPath(rel); console.log(`[reload] ${b}${lesson ? '/' + lesson : ''}: ${rel}`); broadcast(b, rel, lesson); }); } catch { /* no recursive watch: no live reload */ } }
for (const b of bundlesIn(root)) watchDir(b, () => path.basename(b));
try { fs.mkdirSync(path.join(KIT_ROOT, 'build', 'check-all'), { recursive: true }); } catch { /* ignore */ }
watchDir(path.join(KIT_ROOT, 'build', 'check-all'), (f) => f.replace(/\.json$/, ''));

// ---- http ----
const json = (res, status, obj, extra = {}) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra }); res.end(JSON.stringify(obj)); };
const readBody = (req) => new Promise((resolve, reject) => { let b = ''; req.on('data', (c) => { b += c; if (b.length > 1e6) { reject(new Error('too big')); req.destroy(); } }); req.on('end', () => { try { resolve(b ? JSON.parse(b) : {}); } catch (e) { reject(e); } }); });

async function handle(req, res) {
  const u = new URL(req.url, 'http://x'); const p = decodeURIComponent(u.pathname);
  const origin = req.headers.origin;
  const cors = { 'Access-Control-Allow-Origin': origin && allowedOrigins().has(origin) ? origin : '*', 'Access-Control-Allow-Headers': 'Content-Type, X-Kit-Code', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Cache-Control': 'no-store', Vary: 'Origin' };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }

  if (p.startsWith('/_kit/')) {
    const q = u.searchParams; const isWrite = req.method === 'POST';
    if (isWrite) {
      if (origin && !allowedOrigins().has(origin)) return json(res, 403, { error: `origin ${origin} is not the kit or a known engine` }, cors);
      if (req.headers['x-kit-code'] !== code) return json(res, 401, { error: 'pairing code needed (printed by preview.mjs)' }, cors);
    }
    try {
      if (p === '/_kit/config') return json(res, 200, { role: 'kit', url: KIT(), engine: ENG(), engines: disc ? disc.peers().filter((x) => x.role === 'engine').map((x) => x.url) : [], reviewer: kitReviewer(root), bundles: bundlesIn(root).map((b) => path.basename(b)) }, cors);
      if (p === '/_kit/code') return json(res, 200, { code: SERVE_ENGINE ? code : null }, cors);
      if (p === '/_kit/bundles') return json(res, 200, bundlesIn(root).map((b) => ({ name: path.basename(b), title: manifestOf(b).title, status: manifestOf(b).status })), cors);
      if (p === '/_kit/status') { const B = bundleDir(q.get('bundle')); return B ? json(res, 200, statusPayload(B), cors) : json(res, 404, { error: 'no such bundle' }, cors); }
      if (p === '/_kit/item') { const B = bundleDir(q.get('bundle')); const i = B && itemInfo(B, q.get('lesson'), Number(q.get('index'))); return i ? json(res, 200, i, cors) : json(res, 404, { error: 'no such item' }, cors); }
      if (p === '/_kit/notes' && !isWrite) { const B = bundleDir(q.get('bundle')); return B ? json(res, 200, loadNotes(B), cors) : json(res, 404, { error: 'no such bundle' }, cors); }
      if (p === '/_kit/context') { const B = bundleDir(q.get('bundle')); return B ? json(res, 200, { text: contextFor(B, q.get('scope'), q.get('do')) }, cors) : json(res, 404, { error: 'no such bundle' }, cors); }
      if (p === '/_kit/fixprompt') {
        const B = bundleDir(q.get('bundle')); if (!B) return json(res, 404, { error: 'no such bundle' }, cors);
        const states = (q.get('states') || 'accepted').split(',').filter((x) => STATES.includes(x));
        const o = { states: states.length ? states : ['accepted'], lesson: q.get('lesson') || null, extra: q.get('do') || '', web: q.get('web') === '1' };
        const unaccepted = fixPrompt(B, path.basename(B), { ...o, states: ['open'] }).count;
        if (q.get('combined') === '1') return json(res, 200, { ...fixPrompt(B, path.basename(B), o), unaccepted }, cors);
        const prompts = dispatch(B, path.basename(B), o);
        return json(res, 200, { prompts, count: prompts.reduce((a, x) => a + x.ids.length, 0), unaccepted }, cors);
      }
      if (p === '/_kit/plan') { const B = bundleDir(q.get('bundle')); return B ? json(res, 200, planOf(B), cors) : json(res, 404, { error: 'no such bundle' }, cors); }
      if (p === '/_kit/next') { const B = bundleDir(q.get('bundle')); return B ? json(res, 200, await nextUnits(B, q.get('review')), cors) : json(res, 404, { error: 'no such bundle' }, cors); }
      if (p === '/_kit/tests' && !isWrite) { const B = bundleDir(q.get('bundle')); const t = B && testsOf(B, q.get('src')); return json(res, 200, t ? { exists: true, cmd: t.cmd, family: t.family } : { exists: false }, cors); }
      if (p === '/_kit/events') { res.writeHead(200, { ...cors, 'Content-Type': 'text/event-stream', Connection: 'keep-alive' }); res.write('retry: 2000\n\n'); clients.add(res); req.on('close', () => clients.delete(res)); return; }
      if (isWrite) {
        const body = await readBody(req); const B = bundleDir(body.bundle); mute();
        if (!B) return json(res, 404, { error: 'no such bundle' }, cors);
        if (p === '/_kit/notes') return json(res, 200, addNote(B, body), cors);
        if (p === '/_kit/notes/state') return json(res, 200, { updated: setState(B, body.ids || [], body.state) }, cors);
        if (p === '/_kit/notes/edit') { const ch = {}; for (const k of ['text', 'kind', 'scope', 'stage']) if (body[k] !== undefined) ch[k] = body[k]; return json(res, 200, editNote(B, String(body.id), ch), cors); }
        if (p === '/_kit/notes/delete') return json(res, 200, { deleted: deleteNote(B, String(body.id)) }, cors);
        if (p === '/_kit/runtests') return json(res, 200, await runTests(B, body.src), cors);
        if (p === '/_kit/scene/reviewed') return json(res, 200, markReviewed(B, body.src, body.by || kitReviewer(root)), cors);
        if (p === '/_kit/approve' || p === '/_kit/unapprove') {
          const target = p.endsWith('/approve') ? 'human-approved' : 'ai-draft';
          const scope = {};
          for (const k of ['slide', 'lesson', 'module', 'bank', 'all']) if (body[k]) scope[k] = body[k];
          if (body.lessonFile && body.index != null) scope.slide = `${lessonCodeOf(path.join(B, body.lessonFile))}S${Number(body.index) + 1}`;
          const { todo } = planStatus(B, scope, target);
          applyStatus(B, todo, target, body.by || kitReviewer(root) || 'review-bar', Object.entries(scope).map(([k, v]) => `${k}=${v}`).join(' '));
          return json(res, 200, { changed: todo.length, item: body.lessonFile ? itemInfo(B, body.lessonFile, Number(body.index)) : null }, cors);
        }
      }
      return json(res, 404, { error: 'unknown endpoint' }, cors);
    } catch (e) { return json(res, 400, { error: e.message }, cors); }
  }

  // generated manifests
  let m;
  if (p === '/bundle-manifest.json') return json(res, 200, { type: 'bundle-manifest', title: 'Kit preview', bundles: bundlesIn(root).map((b) => ({ ...manifestOf(b), manifest: `courses/${path.basename(b)}/manifest.json` })) }, cors);
  if ((m = /^\/courses\/([^/]+)\/manifest\.json$/.exec(p))) { const B = bundleDir(m[1]); return B ? json(res, 200, manifestOf(B), cors) : json(res, 404, { error: 'no such bundle' }, cors); }

  // engine checkout, read-only, same origin (--serve-engine)
  if (SERVE_ENGINE && (p === '/engine' || p.startsWith('/engine/'))) {
    if (p === '/engine') { res.writeHead(302, { Location: '/engine/' }); return res.end(); }
    let rel = p.slice(8) || 'index.html'; if (rel.endsWith('/')) rel += 'index.html';
    const f = path.resolve(SERVE_ENGINE, rel);
    if (f !== SERVE_ENGINE && !f.startsWith(SERVE_ENGINE + path.sep)) { res.writeHead(403, cors); return res.end('forbidden'); }
    if (/(^|\/)\.git(\/|$)/.test(rel) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404, cors); return res.end('not found'); }
    res.writeHead(200, { ...cors, 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    return fs.createReadStream(f).pipe(res);
  }

  // static
  let file = null;
  if (p === '/' || p === '/dashboard.html') file = path.join(WEB, 'dashboard.html');
  else if (['/review-bar.js', '/frame.html'].includes(p)) file = path.join(WEB, p.slice(1));
  else if (p.startsWith('/courses/') || p.startsWith('/examples/')) { if (!DENY.test(p)) file = path.join(root, p); }
  else if (p.startsWith('/__kit/')) file = path.join(KIT_ROOT, 'simulations-kit', p.slice(7));
  else if (p.startsWith('/vendor/')) file = path.join(KIT_ROOT, 'simulations-kit', p.slice(1));
  const base = file && (p.startsWith('/__kit/') || p.startsWith('/vendor/') ? path.join(KIT_ROOT, 'simulations-kit') : p.startsWith('/courses/') || p.startsWith('/examples/') ? root : WEB);
  if (!file || !file.startsWith(base) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404, cors); return res.end('not found'); }
  res.writeHead(200, { ...cors, 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}

// ---- start ----
const port = await freePort(Number(A.val('port')) || 9050);
const server = http.createServer((req, res) => { ctx.run(SERVE_ENGINE ? baseOf(req) : null, () => handle(req, res)).catch((e) => { try { json(res, 500, { error: e.message }); } catch { /* closed */ } }); });
await new Promise((r) => server.listen(port, A.has('lan') ? '0.0.0.0' : '127.0.0.1', r));
kitUrl = `http://${advertise}:${port}`;
const disc = A.has('no-discovery') ? null : startDiscovery({ role: 'kit', name: path.basename(root), url: () => kitUrl, info: { bundles: bundlesIn(root).map((b) => path.basename(b)).slice(0, 8) } });
if (disc) await disc.ready;

async function findEngine() {
  if (engineUrl) return engineUrl;
  if (disc) { for (let i = 0; i < 6 && !engineUrl; i++) { const e = disc.peers().find((x) => x.role === 'engine'); if (e) { engineUrl = e.url; break; } await new Promise((r) => setTimeout(r, 300)); } }
  if (engineUrl) return engineUrl;
  if (await isUp('http://127.0.0.1:9040/')) return (engineUrl = `http://${advertise}:9040`);
  const cands = [A.val('engine-dir'), process.env.COAUTHOR_ENGINE_DIR, path.join(root, 'coauthor'), path.join(root, '..', 'coauthor'), path.join(root, '..', '..', 'coauthor'), path.join(root, '..')].filter(Boolean).map((d) => path.resolve(d));
  const dir = cands.find((d) => fs.existsSync(path.join(d, 'tools', 'serve-local.py')));
  if (!dir) return null;
  engineProc = spawn('python3', [path.join(dir, 'tools', 'serve-local.py'), '--host', A.has('lan') ? '0.0.0.0' : '127.0.0.1', '--port', '9040', '--allow-http-sources'], { cwd: dir, stdio: 'ignore' });
  for (let i = 0; i < 20; i++) { if (await isUp('http://127.0.0.1:9040/')) return (engineUrl = `http://${advertise}:9040`); await new Promise((r) => setTimeout(r, 250)); }
  return null;
}
if (SERVE_ENGINE) engineUrl = `${kitUrl}/engine`; else await findEngine();

const bs = bundlesIn(root);
console.log(`kit server   ${kitUrl}${A.has('lan') ? '' : '   (this computer only; add --lan for phones and other PCs)'}\nengine       ${engineUrl || 'NOT FOUND: pass --engine <url> or --engine-dir <coauthor checkout>, or start tools/serve-local.py with --allow-http-sources'}\npairing code ${code}   (type it once in the review bar or dashboard to approve and take notes)\ndashboard    ${kitUrl}/dashboard.html`);
for (const b of bs) { const name = path.basename(b); const lf = lessonFiles(b).sort()[0]; const l = lf && deepLink(b, path.relative(b, lf), 0); if (l) console.log(`  ${name}: ${l}`); }
if (A.has('lan')) { try { const qr = createRequire(import.meta.url)('./vendor/qrcode-terminal/lib/main.js'); qr.generate(`${kitUrl}/dashboard.html`, { small: true }, (s) => console.log(s)); } catch { /* no qr */ } }
const quit = () => { disc?.stop(); engineProc?.kill(); setTimeout(() => process.exit(0), 150); };
process.on('SIGINT', quit); process.on('SIGTERM', quit);
void resolveScope;
