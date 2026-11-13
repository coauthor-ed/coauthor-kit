#!/usr/bin/env node
// test-expect - checks for the expect logic the two drivers share (lib/expect.mjs), over BOTH drivers, plus the fake DOM
// methods a scene may call (append, prepend, replaceChildren, insertAdjacentHTML, remove). Self-contained: it writes two
// tiny synthetic scenes to a temp folder, runs drive.mjs (canvas) and drive-dom.mjs (DOM, real browser) on them and checks
// the printed words and exit codes. drive-dom needs Playwright: that part is SKIPPED, not failed, without it.
//
//   node tools/sim-test/test-expect.mjs        prints PASS/FAIL per check; exit 1 on any FAIL
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { precheckSteps } from './lib/domsteps.mjs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { normText, closestSegment, judgeText, judgeProbe, judgeSel, badStep } from './lib/expect.mjs';
import { makeContainer } from './harness.mjs';
import { playwright } from './lib/serve.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
let fails = 0, n = 0;
const t = (name, ok, extra = '') => { n++; if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n      ${extra}`}`); };

// 1. the shared judges
t('normText folds minus variants and spaces', normText('a\u2212b\u00a0 c') === 'a-b c');
t('judgeText plain hit', judgeText('Total: 5 N', { expect: 'Total:  5 N' }).ok);
t('judgeText regex miss prints visible now + closest', (() => { const r = judgeText('Total: 5 N. Friction: 2 N', { expect: '/Total: 6/' }); return !r.ok && r.detail[0].includes('visible now:') && r.detail[1]?.includes('closest: Total:'); })());
t('judgeText not inverts', judgeText('abc', { expect: 'x', not: true }).ok && !judgeText('abc', { expect: 'a', not: true }).ok);
t('judgeProbe equality and message', judgeProbe(3, { probe: 'd.count("line")', expect: 3 }).ok && judgeProbe(2, { probe: 'P', expect: 3 }).msg === 'probe P = 2, expected 3');
t('judgeSel', judgeSel('85.7 N', '#f', { expect: ['#f', '/85\\.7 N/'] }).ok && !judgeSel('1 N', '#f', { expect: ['#f', '85'] }).ok);
t('badStep refuses a selector form on a canvas driver', /expect got/.test(badStep({ expect: ['#a', 'b'] }, {}) || '') && badStep({ expect: ['#a', 'b'] }, { selectors: true }) === null);
t('badStep refuses a flat drag list, accepts pairs', /drag takes \[\[x0,y0\],\[x1,y1\],\.\.\.\]/.test(badStep({ drag: [10, 20, 30, 40] }, {}) || '') && badStep({ drag: [[10, 20], [30, 40]] }, {}) === null);
t('badStep refuses an unknown key', /unknown key "bogus"/.test(badStep({ bogus: 1 }, { keys: new Set(['beat']) }) || ''));

// 1b. the kit doc's colour row names only tokens sim-theme.css declares
{
  const doc = fs.readFileSync(path.resolve(HERE, '..', '..', 'docs', 'dom-scene-kit.md'), 'utf8');
  const css = fs.readFileSync(path.resolve(HERE, '..', '..', 'simulations-kit', 'src', 'simulations', 'base', 'sim-theme.css'), 'utf8');
  const row = (doc.match(/^\| colour \|(.*)\|$/m) || [])[1] || '';
  const names = [...row.matchAll(/--sim-[a-z0-9-]+/g)].map((m) => m[0]).flatMap((x) => (x === '--sim-series-1' ? Array.from({ length: 8 }, (_, i) => `--sim-series-${i + 1}`) : [x]));
  const missing = names.filter((x) => !new RegExp(`${x}\\s*:`).test(css));
  t('dom-scene-kit colour row: every token is declared in sim-theme.css', names.length >= 20 && !missing.length, `missing: ${missing.join(' ')}`);
}

// 2. the fake DOM
{
  const host = makeContainer();
  host.append('hello ', 'x');
  t('fake DOM append takes strings and nodes', host.children.length === 2 && host.children[0].textContent === 'hello ');
  host.prepend('first');
  t('fake DOM prepend puts it first', host.children[0].textContent === 'first' && host.children.length === 3);
  const kid = host.children[1];
  host.replaceChildren('only');
  t('fake DOM replaceChildren clears and fills', host.children.length === 1 && host.children[0].textContent === 'only' && kid.parentNode === null);
  host.insertAdjacentHTML('beforeend', '<b>x</b>');
  t('fake DOM insertAdjacentHTML adds a child', host.children.length === 2);
  host.children[1].remove();
  t('fake DOM remove detaches', host.children.length === 1);
  t('fake DOM parentElement is the parent, null when detached', host.children[0].parentElement === host && kid.parentElement === null);
}

// 3. both drivers on synthetic scenes
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'test-expect-'));
const run = (argv) => { const r = spawnSync(process.execPath, argv, { cwd: path.resolve(HERE, '..', '..'), encoding: 'utf8', timeout: 120000 }); return { code: r.status, out: (r.stdout || '') + (r.stderr || '') }; };
try {
  const canvasSrc = fs.readFileSync(path.resolve(HERE, '..', '..', 'examples', 'simulations', 'SceneSkeleton.js'), 'utf8');
  fs.writeFileSync(path.join(tmp, 'CanvasProbe.js'), canvasSrc.replace(/SceneSkeleton/g, 'CanvasProbe'));
  const drive = (steps) => run(['tools/sim-test/run.mjs', 'exec', 'tools/sim-test/drive.mjs', path.join(tmp, 'CanvasProbe.js'), `--steps=${JSON.stringify(steps)}`, '--no-text', '--more']);
  let r = drive([{ beat: 0 }, { expect: '3.0 m' }, { probe: 'sc._h', expect: 3 }, { probe: 'd.count("arc") > 0', expect: true }, { probe: 'd.count("text")', expect: 1, not: true }]);
  t('drive.mjs: passing expects exit 0', r.code === 0 && /PASS - 5 step/.test(r.out), r.out.slice(-400));
  r = drive([{ beat: 0 }, { expect: '9.9 m' }, { probe: 'sc._h', expect: 4 }, { expect: ['#a', 'b'] }]);
  t('drive.mjs: a failing text expect prints FAIL, visible now, closest, exits 1', r.code === 1 && /FAIL: step 2: scene text does not contain "9\.9 m"/.test(r.out) && /visible now: .*3\.0 m/.test(r.out) && /closest: 3\.0 m/.test(r.out), r.out.slice(-600));
  t('drive.mjs: a failing probe prints FAIL: step N: probe X = got, expected v', /FAIL: step 3: probe sc\._h = 3, expected 4/.test(r.out), r.out.slice(-600));
  t('drive.mjs: FIRST FAIL (step N) line on top', /^FIRST FAIL \(step 2\)/.test(r.out.trimStart()), r.out.slice(0, 300));
  t('drive.mjs: a malformed expect is refused with its step number', /FAIL: step 4: expect got \["#a","b"\]/.test(r.out), r.out.slice(-600));
  r = drive([{ beat: 0 }, { probe: 'const a = 1; a', expect: 1 }, { drag: [1, 2, 3, 4] }]);
  t('drive.mjs: a statement probe (const + final expression) is accepted; a flat drag is refused', !/FAIL: step 2/.test(r.out) && /probe const a = 1; a = 1/.test(r.out) && /FAIL: step 3: drag got/.test(r.out), r.out.slice(-600));
  for (const f of ['CanvasProbe.drive-runs', 'CanvasProbe-drive.log']) fs.rmSync(path.resolve(HERE, '..', '..', 'build', 'scratch', f), { force: true });

  const domSrc = `import { DomSimulation } from 'simulations/base/DomSimulation.js';
export class DomProbe extends DomSimulation {
  static WIDTH = 400; static HEIGHT = 300; static BEAT_STEP_MAP = [[{ idx: 0, dwellMs: null }]]; static ARIA_LABEL = 'Probe'; static CONTROLS = [];
  async setup() { await super.setup(); this.render({ html: '<div id="out">Total: 5 N</div><svg width="40" height="20"><line x1="0" y1="0" x2="9" y2="9" stroke="currentColor"></line><line x1="0" y1="5" x2="9" y2="9" stroke="currentColor"></line><line x1="0" y1="9" x2="9" y2="9" stroke="currentColor" style="display:none"></line></svg>' }); }
}
`;
  fs.writeFileSync(path.join(tmp, 'DomProbe.js'), domSrc);
  // sim-lint follows a relative-import `extends` chain to a DOM base; check-scene's collision gate ignores a bundle helper's own fields
  fs.writeFileSync(path.join(tmp, 'HelperBase.js'), domSrc.replace(/DomProbe/g, 'HelperBase').replace('async setup()', '_fresh = 0; async setup()'));
  fs.writeFileSync(path.join(tmp, 'ChildProbe.js'), `import { HelperBase } from './HelperBase.js';\nexport class ChildProbe extends HelperBase {\n  static ARIA_LABEL = 'Child';\n  async setup() { this._fresh = 1; await super.setup(); }\n}\n`);
  r = run(['tools/sim-test/sim-lint.mjs', path.join(tmp, 'ChildProbe.js')]);
  t('sim-lint recognises a scene that extends a relative-import DOM helper', !/none of the/.test(r.out) && /1 scene\(s\)/.test(r.out), r.out.slice(-300));
  r = run(['tools/sim-test/check-scene.mjs', path.join(tmp, 'ChildProbe.js'), '--no-browser', '--no-probes']);
  t('check-scene does not flag a field the bundle helper itself assigns', !/collides with a base-class field/.test(r.out), r.out.slice(-500));
  if (!playwright()) console.log('SKIP  drive-dom.mjs checks: Playwright is not installed');
  else {
    const dd = (steps) => run(['tools/sim-test/drive-dom.mjs', path.join(tmp, 'DomProbe.js'), `--steps=${JSON.stringify(steps)}`, '--no-text', '--more']);
    r = dd([{ beat: 0 }, { expect: 'Total: 5 N' }, { probe: "d.count('line')", expect: 2 }, { probe: 'd.texts().length', expect: 1 }, { expect: ['#out', '/5 N/'] }]);
    t('drive-dom.mjs: passing expects exit 0 (d.count ignores the hidden line)', r.code === 0 && /PASS - 5 step/.test(r.out), r.out.slice(-500));
    r = dd([{ beat: 0 }, { expect: 'Total: 6 N' }, { probe: "d.count('line')", expect: 3 }]);
    t('drive-dom.mjs: a failing text expect prints FAIL, visible now, closest, exits 1', r.code === 1 && /FAIL: scene text does not contain "Total: 6 N"/.test(r.out) && /visible now: Total: 5 N/.test(r.out) && /closest: Total:/.test(r.out), r.out.slice(-600));
    t('drive-dom.mjs: a failing probe prints the same words as drive.mjs', /FAIL: probe d\.count\('line'\) = 2, expected 3/.test(r.out), r.out.slice(-600));
    r = dd([{ beat: 0 }, { probe: 'sc.nope', expect: 1 }, { expect: 'zzz' }]);
    t('drive-dom.mjs: first failure on top; undefined scene field gets a hint', /^FIRST FAIL \(step 2\)/.test(r.out.trimStart()) && /scene has no field nope/.test(r.out), r.out.slice(0, 600));
    for (const f of ['DomProbe.drive-runs', 'DomProbe-drive.log']) fs.rmSync(path.resolve(HERE, '..', '..', 'build', 'scratch', f), { force: true });
  }
  const pc = precheckSteps([{ probe: 'sc.x', expect: '/a/' }, { probe: 'sc.y', expect: '""' }, { expect: '/ok/' }, { probe: 'sc.z', expect: '' }]);
  t('precheckSteps: regex probe expect and quoted empty are hinted, bare regex and empty are not', pc.length === 2 && /== ; regex only|compared with ==/.test(pc[0]) && /use ""/.test(pc[1]), JSON.stringify(pc));
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
console.log(fails ? `FAIL - ${fails} of ${n} check(s)` : `PASS - ${n} check(s)`);
process.exit(fails ? 1 : 0);
