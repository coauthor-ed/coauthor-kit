#!/usr/bin/env node
// doctor - is this workspace healthy? OPERATOR ONLY.
//
//   node tools/operator/doctor.mjs [--selftest] [--net] [--narration] [--engine <dir>] [--install]
// Checks: Node version, kit version vs master, web-deny config, focus, external tools (pdftotext, pdftoppm, bash, Playwright),
// profile.json look/audience + named look/audience/subject packs exist (per-bundle look and audience overrides too), look agreement (profile, bundle, OUTLINE, modules), stale briefs/bundles,
// container warning, .gitattributes union line, bundle validation, PDFs/source/ inside configured publish targets.
// --selftest validates the example course and runs one example scene check (catches a broken sync). --net probes multicast
// (and, in the narration section, the edge-tts voice list).
// # narration: runs when a bundle is narrated (OUTLINE "Narration: narrated", narration/*.script.json, or narrationRef) or with
// --narration. Kit lint + SimNarration part, the engine's narration tools (--engine, env COAUTHOR_ENGINE, kit-source master, cwd
// walk), python >= 3.9 (env NARR_PYTHON, ~/narr-venv, python3), edge_tts, ffmpeg (env FFMPEG, system, imageio_ffmpeg). Missing
// prerequisites are WARN. Without --install the commands are only printed; --install runs pip --user (never sudo or apt).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseArgs } from '../sim-test/lib/args.mjs';
import { playwright } from '../sim-test/lib/serve.mjs';
import { webState } from './lib/harness.mjs';
import { resolveSource } from './lib/kitsync.mjs';
import { bundlesIn } from './lib/manifest.mjs';
import { bundleProfile } from '../staged-generation/lib/bundleProfile.mjs';

const A = parseArgs(process.argv.slice(2), { tool: 'doctor', file: import.meta.url, usage: 'node tools/operator/doctor.mjs [--selftest] [--net] [--narration] [--engine <dir>] [--install]', val: ['engine'], bool: ['selftest', 'net', 'narration', 'install'] });
const root = process.cwd();
let bad = 0, warn = 0;
const ok = (s) => console.log(`  ok    ${s}`);
const WARN = (s) => { warn++; console.log(`  WARN  ${s}`); };
const FAIL = (s) => { bad++; console.log(`  FAIL  ${s}`); };
const rd = (f) => { try { return fs.readFileSync(path.join(root, f), 'utf8').trim(); } catch { return ''; } };
const has = (cmd, args = ['--version']) => { const r = spawnSync(cmd, args, { encoding: 'utf8' }); return !r.error; };

console.log(`# doctor ${root}`);
const major = Number(process.versions.node.split('.')[0]);
major >= 20 ? ok(`Node ${process.versions.node}`) : FAIL(`Node ${process.versions.node}: need >= 20`);

const src = rd('kit-source');
if (!fs.existsSync(path.join(root, 'kit-files.txt'))) WARN('no kit-files.txt: not a kit workspace (run tools/operator/start.mjs)');
else if (!src) WARN('no kit-source file: kit-sync needs --from');
else {
  try {
    const m = resolveSource(src);
    const mv = fs.existsSync(path.join(m, 'kit-version')) ? fs.readFileSync(path.join(m, 'kit-version'), 'utf8').trim() : '?';
    const v = rd('kit-version');
    v === mv ? ok(`kit-version ${v} matches the master`) : WARN(`kit-version ${v || '-'} but the master is ${mv}: node tools/operator/kit-sync.mjs`);
  } catch (e) { WARN(`kit-source ${src}: ${e.message}`); }
}

const w = webState(root);
w.claude === 'denied' && w.opencode === 'denied' ? ok('web tools denied in the harness configs') : WARN(`web tools: claude-code ${w.claude}, opencode ${w.opencode} (node tools/operator/web-mode.mjs off)`);
const focus = rd('.focus'); console.log(`  info  focus: ${focus || 'none'}${fs.existsSync(path.join(root, '.ignore')) ? ' (.ignore present)' : ''}`);
/union/.test(rd('.gitattributes')) ? ok('.gitattributes has the GENERATION-LOG union line') : WARN('.gitattributes lacks "GENERATION-LOG.md merge=union"');

for (const [c, a, why] of [['pdftotext', ['-v'], 'source text'], ['pdftoppm', ['-v'], 'page images'], ['bash', ['--version'], 'rasterize-pdf.sh / crop-page.sh']]) has(c, a) ? ok(c) : WARN(`${c} not found (${why})`);
playwright() ? ok('Playwright') : WARN('Playwright not found (shoot, check-scene, publish --verify)');
if (fs.existsSync('/.dockerenv')) WARN('running inside a container: multicast discovery will not reach the LAN; run the preview server on the host');

const packOk = (kind, id) => fs.existsSync(path.join(root, 'packs', kind, id, 'CARD.md'));
const prof = bundleProfile(root, null);
console.log(`  info  look ${prof.repoLook}, audience ${prof.audience}${fs.existsSync(path.join(root, 'profile.json')) ? '' : ' (no profile.json: defaults)'}`);
packOk('look', prof.repoLook) ? ok(`packs/look/${prof.repoLook}/CARD.md`) : FAIL(`profile look "${prof.repoLook}": packs/look/${prof.repoLook}/CARD.md missing`);
if (prof.audience !== 'school') packOk('audience', prof.audience) ? ok(`packs/audience/${prof.audience}/CARD.md`) : FAIL(`profile audience "${prof.audience}": packs/audience/${prof.audience}/CARD.md missing`);
if (fs.existsSync(path.join(root, 'profile.json')) && fs.existsSync(path.join(root, 'tools', 'staged-generation', 'build-bundles.mjs'))) {
  const r = spawnSync(process.execPath, [path.join(root, 'tools', 'staged-generation', 'build-bundles.mjs'), '--check', '--repo', root], { encoding: 'utf8' });
  r.status === 0 ? ok('briefs/bundles/ match the sources and profile') : WARN('briefs/bundles/ are stale for the current profile or sources: node tools/staged-generation/build-bundles.mjs');
}
for (const B of bundlesIn(root)) {
  const name = path.basename(B);
  const bp = bundleProfile(root, name);
  if (bp.lookDiffersFromRepo) packOk('look', bp.look) ? ok(`${name}: look override ${bp.look}`) : FAIL(`${name}: bundle look "${bp.look}": packs/look/${bp.look}/CARD.md missing`);
  if (bp.audienceDiffersFromRepo) bp.audience === 'school' || packOk('audience', bp.audience) ? ok(`${name}: audience override ${bp.audience}`) : FAIL(`${name}: bundle audience "${bp.audience}": packs/audience/${bp.audience}/CARD.md missing`);
  let named = null; try { named = JSON.parse(rd(`courses/${name}/bundle.json`) || '{}').subjectPack; } catch { /* bad json reported elsewhere */ }
  if (named) packOk('subject', named) ? ok(`${name}: subject pack ${named}`) : FAIL(`${name}: subjectPack "${named}": packs/subject/${named}/CARD.md missing`);
  else if (bp.subjectPack) ok(`${name}: subject pack ${bp.subjectPack} (from subject)`);
  const seen = new Map([['bundle', bp.look]]);
  const om = /^Look:\s*([a-z0-9-]+)/mi.exec(rd(`courses/${name}/OUTLINE.md`)); if (om) seen.set('OUTLINE.md', om[1].toLowerCase());
  if (fs.existsSync(path.join(B, 'modules'))) for (const f of fs.readdirSync(path.join(B, 'modules')).filter((x) => x.endsWith('.json'))) { try { const m = JSON.parse(fs.readFileSync(path.join(B, 'modules', f), 'utf8')); if (typeof m.look === 'string') seen.set(`modules/${f}`, m.look); } catch { /* validator reports */ } }
  const bad = [...seen].filter(([, v]) => v !== bp.look);
  bad.length ? WARN(`${name}: look disagrees: bundle/profile ${bp.look}; ${bad.map(([k, v]) => `${k} ${v}`).join(', ')}`) : seen.size > 1 && ok(`${name}: look ${bp.look} agrees across ${[...seen.keys()].join(', ')}`);

  const r = spawnSync(process.execPath, [path.join(root, 'validators', 'validate.mjs'), ...['lessons', 'modules', 'banks'].flatMap((d) => (fs.existsSync(path.join(B, d)) ? fs.readdirSync(path.join(B, d)).filter((f) => f.endsWith('.json')).map((f) => path.join(B, d, f)) : []))], { encoding: 'utf8', cwd: root });
  const fails = (r.stdout || '').split('\n').filter((l) => /^FAIL /.test(l)).length;
  fs.existsSync(path.join(B, 'bundle.json')) ? ok(`${name}: bundle.json`) : WARN(`${name}: no bundle.json`);
  fails ? WARN(`${name}: ${fails} file(s) fail validation`) : ok(`${name}: lessons/modules/banks validate`);
}
try {
  const pj = JSON.parse(rd('publish.json') || '{}');
  const target = pj.target && path.resolve(root, pj.target);
  if (target && fs.existsSync(target)) {
    const stray = []; (function w2(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (e.name === '.git') continue; const p = path.join(d, e.name); if (e.isDirectory()) { if (e.name === 'source') stray.push(p); else w2(p); } else if (/\.pdf$/i.test(e.name)) stray.push(p); } })(target);
    stray.length ? FAIL(`publish target holds PDFs/source/: ${stray.slice(0, 3).join(', ')}`) : ok('publish target has no PDFs/source/');
  }
} catch { /* no publish.json */ }

if (A.has('selftest')) {
  const ex = path.join(root, 'examples', 'work-energy');
  const files = ['lessons', 'modules'].flatMap((d) => (fs.existsSync(path.join(ex, d)) ? fs.readdirSync(path.join(ex, d)).map((f) => path.join(ex, d, f)) : []));
  const r = spawnSync(process.execPath, [path.join(root, 'validators', 'validate.mjs'), ...files], { encoding: 'utf8', cwd: root });
  r.status === 0 ? ok(`selftest: example course validates (${files.length} files)`) : FAIL('selftest: example course fails validation (broken sync?)');
  const scenes = fs.existsSync(path.join(root, 'examples', 'simulations')) ? fs.readdirSync(path.join(root, 'examples', 'simulations')).filter((f) => /Scene\.js$/.test(f)) : [];
  if (scenes[0]) {
    const c = spawnSync(process.execPath, [path.join(root, 'tools', 'sim-test', 'check-scene.mjs'), path.join('examples', 'simulations', scenes[0]), '--no-browser'], { encoding: 'utf8', cwd: root });
    c.status === 0 ? ok(`selftest: check-scene --no-browser ${scenes[0]}`) : WARN(`selftest: check-scene on ${scenes[0]} exited ${c.status}`);
  }
}
// ---- narration prerequisites ----
console.log('# narration');
const narrated = bundlesIn(root).filter((B) => {
  if (/^Narration:\s*narrated/mi.test(rd(`courses/${path.basename(B)}/OUTLINE.md`))) return true;
  const nd = path.join(B, 'narration');
  if (fs.existsSync(nd) && fs.readdirSync(nd).some((f) => /\.script\.json$/.test(f))) return true;
  const ld = path.join(B, 'lessons');
  return fs.existsSync(ld) && fs.readdirSync(ld).some((f) => f.endsWith('.json') && /"narrationRef"/.test(fs.readFileSync(path.join(ld, f), 'utf8')));
});
console.log(`  info  narrated bundles: ${narrated.length ? narrated.map((B) => path.basename(B)).join(', ') : 'none'}`);
if (!narrated.length && !A.has('narration')) console.log('  info  narration: no narrated course (use --narration to check anyway)');
else {
  const miss = (what, cmd) => WARN(`${what}${cmd ? `; ${cmd}` : ''}`);
  const hits = [];
  const kitNeed = narrated.length ? FAIL : WARN;
  for (const f of ['tools/narration-lint.mjs', 'simulations-kit/src/simulations/base/kit/SimNarration.js']) fs.existsSync(path.join(root, f)) ? ok(f) : kitNeed(`${f} missing${narrated.length ? ' (broken kit sync: node tools/operator/kit-sync.mjs)' : ''}`);
  if (fs.existsSync(path.join(root, 'tools', 'narration-lint.mjs'))) for (const B of narrated) {
    const r = spawnSync(process.execPath, [path.join(root, 'tools', 'narration-lint.mjs'), '--bundle', B, '--all'], { encoding: 'utf8', cwd: root });
    const last = (r.stdout || r.stderr || '').trim().split('\n').pop() || '(no output)';
    r.status === 0 ? ok(`${path.basename(B)}: ${last}`) : WARN(`${path.basename(B)}: ${last}`);
  }

  // engine repo: --engine, COAUTHOR_ENGINE, kit-source master (walk up), cwd walk (sibling coauthor/)
  const isEng = (d) => !!d && fs.existsSync(path.join(d, 'tools', 'narration', 'build-narration.py'));
  const walk = (from, test) => { for (let d = path.resolve(from); ; d = path.dirname(d)) { const r = test(d); if (r) return r; if (path.dirname(d) === d) return null; } };
  let engine = null, via = '';
  const tryE = (d, v) => { if (!engine && d) { const a = path.resolve(d); if (isEng(a)) { engine = a; via = v; } } };
  tryE(A.val('engine'), '--engine'); tryE(process.env.COAUTHOR_ENGINE, 'COAUTHOR_ENGINE');
  if (!engine && src) { try { const m = resolveSource(src); tryE(walk(m, (d) => isEng(d) && d), 'kit-source'); } catch { /* reported above */ } }
  if (!engine) tryE(walk(root, (d) => (isEng(path.join(d, 'coauthor')) ? path.join(d, 'coauthor') : isEng(d) ? d : null)), 'cwd walk');
  if (!engine) miss('engine repo with tools/narration not found', 'point at it: --engine <dir> or COAUTHOR_ENGINE=<dir>');
  else {
    ok(`engine ${engine} (via ${via})`);
    const gone = ['tools/narration/build-narration.py', 'tools/narration/check-narration.mjs', 'tools/narration/beats.mjs', 'tools/narration/lexicon.default.json', 'src/core/markdown/splitSteps.js'].filter((f) => !fs.existsSync(path.join(engine, f)));
    gone.length ? miss(`engine lacks ${gone.join(', ')}`, 'update the engine checkout') : ok('engine narration tools present (build, check, beats, lexicon, splitSteps)');
  }

  // python, edge_tts, ffmpeg
  const run = (cmd, args, o = {}) => spawnSync(cmd, args, { encoding: 'utf8', timeout: 30000, ...o });
  const venv = path.join(os.homedir(), 'narr-venv', 'bin', 'python');
  const cands = process.env.NARR_PYTHON ? [process.env.NARR_PYTHON] : [venv, 'python3'];
  const runs = cands.filter((c) => { const r = run(c, ['-c', 'import sys']); return !r.error && r.status === 0; });
  const pyHas = (c, mod) => run(c, ['-c', `import ${mod}`]).status === 0;
  let py = runs.find((c) => pyHas(c, 'edge_tts')) || runs[0];
  // A venv python refuses pip --user; any other python installs per user (never sudo).
  const inVenv = (c) => run(c, ['-c', 'import sys;print(int(sys.prefix != sys.base_prefix))']).stdout?.trim() === '1';
  const userFlag = (c) => (inVenv(c) ? [] : ['--user']);
  const hasPip = (c) => run(c, ['-m', 'pip', '--version']).status === 0;
  const installCmd = (c) => [c, '-m', 'pip', 'install', ...userFlag(c), 'edge-tts', 'imageio-ffmpeg'].join(' ');
  const check = () => {
    if (!py) { miss('python not found (NARR_PYTHON, ~/narr-venv, python3)', 'install python3 >= 3.9'); return; }
    const v = run(py, ['-c', 'import sys;print("%d.%d.%d"%sys.version_info[:3])']).stdout.trim();
    const [a, b] = v.split('.').map(Number);
    a > 3 || (a === 3 && b >= 9) ? ok(`python ${v} (${py})`) : WARN(`python ${v} (${py}): need >= 3.9`);
    if (pyHas(py, 'edge_tts')) {
      const ev = run(py, ['-c', 'import importlib.metadata as m;print(m.version("edge-tts"))']).stdout.trim();
      ok(`edge_tts ${ev || '(version unknown)'}`);
    } else miss('python module edge_tts missing', installCmd(py));
    const sys = !run('ffmpeg', ['-version']).error ? 'system ffmpeg' : null;
    if (process.env.FFMPEG && fs.existsSync(process.env.FFMPEG)) ok(`ffmpeg ${process.env.FFMPEG} (env FFMPEG)`);
    else if (sys) ok('ffmpeg (system)');
    else { const r = run(py, ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())']); r.status === 0 ? ok(`ffmpeg ${r.stdout.trim()} (imageio_ffmpeg)`) : miss('no ffmpeg (FFMPEG, system, imageio_ffmpeg)', installCmd(py)); }
  };
  const before = warn;
  check();
  if (!playwright()) console.log('  info  Playwright missing; install hint (not run): npx playwright install chromium firefox');
  if (A.has('install')) {
    // Install with the chosen python if it has pip, else the first other runnable one that does (a broken ~/narr-venv has no pip).
    if (py && !hasPip(py)) { const alt = runs.find((c) => c !== py && hasPip(c)); if (alt) { console.log(`  info  ${py} has no pip; installing with ${alt}`); py = alt; } }
    if (!py) WARN('--install: no python to install with');
    else if (!hasPip(py)) {
      WARN('--install: pip is missing for this python. Recipe (README tools/narration "Setup"): python3 -m venv ~/narr-venv && ~/narr-venv/bin/pip install edge-tts imageio-ffmpeg');
      WARN('  no python3-venv? download get-pip.py yourself, then: python3 get-pip.py --user --break-system-packages && python3 -m pip install --user --break-system-packages edge-tts imageio-ffmpeg');
    } else {
      const tail = (r) => ((r.stdout || '') + (r.stderr || '')).trim().split('\n').slice(-6).map((l) => `        ${l}`).join('\n');
      const pip = (extra) => run(py, ['-m', 'pip', 'install', ...userFlag(py), ...extra, 'edge-tts', 'imageio-ffmpeg'], { timeout: 300000 });
      console.log(`  info  installing: ${installCmd(py)}`);
      let r = pip([]);
      if (r.status !== 0 && /externally-managed-environment/.test((r.stdout || '') + (r.stderr || ''))) { console.log('  info  externally managed python: retrying with --break-system-packages'); r = pip(['--break-system-packages']); }
      console.log(tail(r));
      if (r.status !== 0) WARN('--install: pip failed (see above)');
      else { console.log('  info  re-checking'); warn = before; const inst = py; py = runs.find((c) => pyHas(c, 'edge_tts')) || py; if (py !== inst) console.log(`  info  using ${py}; installed into ${inst}`); check(); }
    }
  } else if (warn > before || !pyHas(py || 'python3', 'edge_tts')) console.log('  info  to install: node tools/operator/doctor.mjs --narration --install');

  if (A.has('net')) {
    const voices = ['en-US-AndrewMultilingualNeural', 'en-IN-NeerjaExpressiveNeural'];
    let r = run('edge-tts', ['--list-voices'], { timeout: 20000 });
    if (r.error && py) r = run(py, ['-m', 'edge_tts', '--list-voices'], { timeout: 20000 });
    if (r.error || r.status !== 0) WARN(`--net: edge-tts --list-voices failed (${r.error ? r.error.code || r.error.message : `exit ${r.status}`})`);
    else { const lost = voices.filter((v) => !(r.stdout || '').includes(v)); lost.length ? WARN(`--net: voices not listed: ${lost.join(', ')}`) : ok(`--net: voices listed: ${voices.join(', ')}`); }
  }
}

if (A.has('net')) {
  const { probeMulticast } = await import('./lib/discovery.mjs').catch(() => ({}));
  if (!probeMulticast) WARN('--net: discovery module missing');
  else { const r = await probeMulticast(); r.ok ? ok(`multicast loopback ok (${r.detail})`) : WARN(`multicast: ${r.detail}; use broadcast or "add kit by address"`); }
}
console.log(`${bad ? 'FAIL' : 'PASS'} - ${bad} fail, ${warn} warn`);
process.exit(bad ? 1 : 0);
