#!/usr/bin/env node
// test-doctor-narration - checks the narration section of doctor.mjs on a temp kit-like dir. No network.
//   node tools/operator/test-doctor-narration.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const doctor = path.join(path.dirname(fileURLToPath(import.meta.url)), 'doctor.mjs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'doctor-narr-'));
const put = (f, t = '') => { fs.mkdirSync(path.dirname(path.join(tmp, f)), { recursive: true }); fs.writeFileSync(path.join(tmp, f), t); };
let fails = 0;
const t = (name, cond) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}`); if (!cond) fails++; };

put('courses/b1/bundle.json', '{}');
put('courses/b1/OUTLINE.md', '# B1\nNarration: narrated\n');
put('courses/b1/narration/les-01.script.json', '{"format":"coauthor-narration-script@1","segments":[]}');
put('courses/b2/bundle.json', '{}');
const mkEngine = (d) => { for (const f of ['tools/narration/build-narration.py', 'tools/narration/check-narration.mjs', 'tools/narration/beats.mjs', 'tools/narration/lexicon.default.json', 'src/core/markdown/splitSteps.js']) put(`${d}/${f}`, '\n'); return path.join(tmp, d); };
const engA = mkEngine('engA'), engB = mkEngine('engB');
put('stub-py.sh', '#!/bin/sh\n# stub python: runs, but every import fails\ncase "$*" in *import*sys*) case "$*" in *version_info*) echo 3.12.0; exit 0;; esac; exit 0;; esac\nexit 1\n');
fs.chmodSync(path.join(tmp, 'stub-py.sh'), 0o755);

const go = (args, env = {}) => {
  const e = { ...process.env, ...env }; delete e.COAUTHOR_ENGINE; Object.assign(e, env);
  return spawnSync(process.execPath, [doctor, ...args], { cwd: tmp, encoding: 'utf8', env: e }).stdout || '';
};
const stub = path.join(tmp, 'stub-py.sh');
let o = go(['--narration', '--engine', engA], { NARR_PYTHON: stub });
t('detects narrated bundle b1 only', /narrated bundles: b1\n/.test(o));
t('missing kit lint fails (broken sync) when narrated', /FAIL\s+tools\/narration-lint\.mjs missing/.test(o));
t('--engine locates the fake engine', o.includes(`engine ${engA} (via --engine)`) && /engine narration tools present/.test(o));
t('missing edge_tts is a WARN with the install command', /WARN\s+python module edge_tts missing; .*-m pip install --user edge-tts imageio-ffmpeg/.test(o));
t('install heading is printed, nothing installed', /to install: node tools\/operator\/doctor\.mjs --narration --install/.test(o));
o = go(['--narration'], { COAUTHOR_ENGINE: engB, NARR_PYTHON: stub });
t('env COAUTHOR_ENGINE is next in order', o.includes(`engine ${engB} (via COAUTHOR_ENGINE)`));
o = go(['--narration', '--engine', engA], { COAUTHOR_ENGINE: engB, NARR_PYTHON: stub });
t('--engine beats the env', o.includes(`engine ${engA} (via --engine)`));
fs.rmSync(path.join(tmp, 'engA/tools/narration/beats.mjs'));
o = go(['--narration', '--engine', engA], { NARR_PYTHON: stub });
t('an incomplete engine dir is not accepted', /lacks .*beats\.mjs/.test(o));
fs.rmSync(path.join(tmp, 'courses/b1'), { recursive: true });
o = go([], { NARR_PYTHON: stub });
t('no narrated course and no flag skips the rest', /no narrated course \(use --narration to check anyway\)/.test(o) && !/engine /.test(o));
fs.rmSync(tmp, { recursive: true, force: true });
console.log(fails ? `FAIL - ${fails}` : 'PASS');
process.exit(fails ? 1 : 0);
