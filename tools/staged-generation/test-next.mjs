#!/usr/bin/env node
// test-next - checks for next.mjs's Stage 3 planning and orchestrate.mjs's ordering, on a synthetic bundle in a temp dir.
//   node tools/staged-generation/test-next.mjs        PASS/FAIL per check; exit 1 on any FAIL
//
//   - a path-qualified helper that EXISTS gives writesHelper:false (not "not written yet")
//   - scene-info reports that helper as existing, with its resolved path
//   - same-helper variants form ONE unit, owner first, even with a cap of 1; a helper writer carries its riders across lessons
//   - interactive steering (S1): --interactive / --target / sticky bundle.json key add two lines to Stage 1b and 2 prompts only; orchestrate and auto-run refuse; per-course audience notes
//   - interactive steering v2: Stage 3 build / B1 lines, no batching, --target L01/Scene, alternative notes, async mode, steer files waiting
//   - orchestrate prints "do not pipe" near the top, PROMPT END last, and writes the prompt file without markers
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { stage3Plan, stage3Units, setSplitLook, setOnePass, setSceneBatch, setPassBatch, setBundledDocs, setForceRebuild, setParked } from './next.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
let fails = 0, n = 0;
const t = (name, ok, extra = '') => { n++; if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n      ${extra}`}`); };

const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'test-next-'));
try {
  fs.writeFileSync(path.join(repo, 'AGENTS.md'), 'x\n');
  const bundle = path.join(repo, 'courses', 'algb');
  const sims = path.join(bundle, 'simulations');
  const stub = (lesson, name, helper) => {
    fs.mkdirSync(path.join(sims, lesson), { recursive: true });
    fs.writeFileSync(path.join(sims, lesson, `${name}.stub.md`), `# ${name}\nBase class: DomSimulation\nSave path: simulations/${lesson}/${name}.js\nShared helper: ${helper}\n`);
  };
  fs.mkdirSync(bundle, { recursive: true });
  fs.writeFileSync(path.join(bundle, 'FIGURES.md'), 'none\n');
  fs.writeFileSync(path.join(bundle, 'OUTLINE.md'), '## Lesson list\n- L01 ' + String.fromCharCode(8212) + ' One (2 slides)\n- L02 ' + String.fromCharCode(8212) + ' Two (2 slides)\n- L03 ' + String.fromCharCode(8212) + ' Three (2 slides)\n- L04 ' + String.fromCharCode(8212) + ' Four (2 slides)\n- L05 ' + String.fromCharCode(8212) + ' Five (2 slides)\n');
  fs.mkdirSync(path.join(bundle, 'lessons'), { recursive: true });
  for (const k of ['01', '02', '03', '04', '05']) fs.writeFileSync(path.join(bundle, 'lessons', `les-${k}.json`), '{}\n');
  const lessons = ['L01', 'L02', 'L03', 'L04', 'L05'].map((id) => ({ id }));

  // 1. an existing path-qualified helper (a plain helper module in another lesson folder)
  fs.mkdirSync(path.join(sims, 'L03'), { recursive: true });
  fs.writeFileSync(path.join(sims, 'L03', 'TileBenchScene.js'), 'export class TileBenchScene {}\n');
  stub('L04', 'TileLayScene', 'simulations/L03/TileBenchScene.js');
  let plan = stage3Plan(bundle, lessons);
  const lay = plan.build.find((u) => /TileLayScene/.test(u.scene));
  t('existing path-qualified helper: writesHelper false and the scene is buildable', !!lay && lay.writesHelper === false && !plan.waiting.length, JSON.stringify({ build: plan.build.map((u) => [u.scene, u.writesHelper]), waiting: plan.waiting.length }));
  const info = spawnSync(process.execPath, [path.join(ROOT, 'tools/sim-test/scene-info.mjs'), 'L04/TileLayScene', '--bundle', bundle, '--no-text'], { encoding: 'utf8' });
  t('scene-info: that helper exists and its resolved path is printed', /helper simulations\/L03\/TileBenchScene\.js: exists \(simulations\/L03\/TileBenchScene\.js\)/.test(info.stdout), info.stdout + info.stderr);

  // 2. a path-qualified helper that does not exist: one scene writes it, at the bundle path, the rest wait
  stub('L04', 'SplitScene', 'simulations/L05/NewBenchScene.js');
  stub('L05', 'SplitScene-b', 'simulations/L05/NewBenchScene.js');
  plan = stage3Plan(bundle, lessons);
  const w = plan.build.find((u) => /SplitScene\.stub/.test(u.stub));
  t('missing path-qualified helper: first scene writes it, sibling waits after it', !!w && w.writesHelper === true && plan.waiting.some((u) => /SplitScene-b/.test(u.scene) && u.after === w.scene), JSON.stringify(plan.waiting.map((u) => [u.scene, u.after])));

  // 3. same-helper variants: owner scene + three variants, one unit even with a cap of 1
  for (const v of ['', '-answer', '-close', '-return']) stub('L01', `ConsecutiveSquaresScene${v}`, v ? 'ConsecutiveSquaresScene.js' : 'none');
  stub('L02', 'Lonely', 'none');
  setBundledDocs(false, repo); setForceRebuild(undefined); setParked({});
  for (const cap of [1, 2, 3]) {
    setSceneBatch(cap);
    const units = stage3Units(repo, bundle).filter((x) => x.kind === 'build');
    const grp = units.find((x) => x.units.some((u) => /ConsecutiveSquaresScene\.stub/.test(u.stub)));
    const names = grp ? grp.units.map((u) => path.basename(u.scene, '.js')) : [];
    t(`cap ${cap}: ConsecutiveSquares owner + 3 variants are ONE unit, owner first`, names.length === 4 && names[0] === 'ConsecutiveSquaresScene' && names.slice(1).every((x) => x.startsWith('ConsecutiveSquaresScene-')), names.join(', '));
    t(`cap ${cap}: its prompt says the owner is built first and later scenes import it`, !!grp && /built first in this run: later scenes import it/.test(grp.entry.text) && /Target scenes, in this order: ConsecutiveSquaresScene,/.test(grp.entry.text), grp?.entry.text);
  }
  setSceneBatch(1);
  const all = stage3Units(repo, bundle).filter((x) => x.kind === 'build');
  const sp = all.find((x) => x.units.some((u) => /SplitScene\.stub/.test(u.stub)));
  t('helper writer carries its rider from another lesson in the same unit', !!sp && sp.units.length === 2 && sp.units[0].writesHelper, sp && sp.units.map((u) => u.scene).join(', '));
  t('the unit line prints the resolved helper path', !!sp && /simulations\/L05\/NewBenchScene\.js at simulations\/L05\/NewBenchScene\.js/.test(sp.entry.text), sp?.entry.text);
  t('units carry a cost estimate (scenes in the unit first)', all.every((x) => Array.isArray(x.units) && x.units.length >= 1) && stage3Units(repo, bundle).find((x) => x.units.length === 4), '');

  // split-look is the default: a one-run unit carries 'Look: later'; --no-split-look (setSplitLook(false)) removes it
  setOnePass(true);
  const oneText = () => (stage3Units(repo, bundle).find((x) => x.kind === 'build')?.entry.text) || '';
  t('split-look default: one-run unit prompt has Look: later', /Look: later/.test(oneText()), oneText().slice(0, 300));
  t('Look: later says no shoot, no peek (no step numbers)', /Look: later \(no shoot, no peek;/.test(oneText()) && !/step 3 peeks/.test(oneText()), oneText().slice(0, 300));
  setSplitLook(false);
  t('--no-split-look: the Look: later line is gone', !/Look: later/.test(oneText()), oneText().slice(0, 300));
  setSplitLook(true); setOnePass(false);
  const hp = spawnSync(process.execPath, [path.join(HERE, 'orchestrate.mjs'), '--help'], { encoding: 'utf8' }).stdout;
  t('orchestrate help documents --no-split-look', /--no-split-look/.test(hp), hp.slice(0, 200));

  // 3b. "(not X: a different scene)" only when X exists; the look prompt carries the no-vision stop
  stub('L02', 'GhostScene-b', 'none');
  stub('L02', 'RealScene-b', 'none');
  fs.writeFileSync(path.join(sims, 'L02', 'RealScene.js'), 'export class RealScene {}\n');
  setSceneBatch(1);
  const unitText = (re) => (stage3Units(repo, bundle).find((x) => x.units.some((u) => re.test(u.stub)))?.entry.text) || '';
  t('"(not X)" is left out when no scene X exists', /Target scene: GhostScene-b\./.test(unitText(/GhostScene-b/)), unitText(/GhostScene-b/).slice(-160));
  t('"(not X)" is kept when scene X exists', /Target scene: RealScene-b \(not RealScene: a different scene\)/.test(unitText(/RealScene-b/)), unitText(/RealScene-b/).slice(-160));
  fs.mkdirSync(path.join(sims, 'L02'), { recursive: true });
  fs.writeFileSync(path.join(sims, 'L02', 'LookedScene.js'), 'export class LookedScene {}\n');
  fs.writeFileSync(path.join(sims, 'L02', 'LookedScene.stub.md'), '# LookedScene\nBase class: SimScene\nSave path: simulations/L02/LookedScene.js\nShared helper: none\n');
  fs.writeFileSync(path.join(sims, 'L02', 'LookedScene.design.md'), '# d\nStatus: look-pending\n## Progress\n- end: look-pending\n');
  const lk = stage3Units(repo, bundle).find((x) => x.kind === 'look');
  t('look prompt: view images yourself, else LOOK: no vision', !!lk && /LOOK: no vision/.test(lk.entry.text) && /view the images yourself/.test(lk.entry.text), lk ? lk.entry.text : 'no look unit');
  // look batching: two look-pending scenes of one lesson ride together with --look-per-agent 2, apart by default
  fs.writeFileSync(path.join(sims, 'L02', 'LookedTwoScene.js'), 'export class LookedTwoScene {}\n');
  fs.writeFileSync(path.join(sims, 'L02', 'LookedTwoScene.stub.md'), '# LookedTwoScene\nBase class: SimScene\nSave path: simulations/L02/LookedTwoScene.js\nShared helper: none\n');
  fs.writeFileSync(path.join(sims, 'L02', 'LookedTwoScene.design.md'), '# d\nStatus: look-pending\n## Progress\n- end: look-pending\n');
  const looks = () => stage3Units(repo, bundle).filter((x) => x.kind === 'look');
  t('look batching: default is one scene per look run', looks().length === 2 && looks().every((x) => x.units.length === 1), String(looks().length));
  setPassBatch('look', 2);
  const lb = looks();
  t('look batching: --look-per-agent 2 puts both scenes in one run with Targets and the batch rule', lb.length === 1 && lb[0].units.length === 2 && /Targets: /.test(lb[0].entry.text) && /Several scenes in one run/.test(lb[0].entry.text) && /Target scenes, in this order/.test(lb[0].entry.text), lb[0]?.entry.text);
  t('look batching: the unit has one check per scene', lb[0].units.length === 2, '');
  setPassBatch('look', 1);
  // look cap (lib/lookCap.mjs): a pass that changed nothing, or 3 passes, ends the look passes
  const lookNote = (lines) => fs.writeFileSync(path.join(sims, 'L02', 'LookedTwoScene.design.md'), `# d\nStatus: look-pending\n## Progress\n- look end: look-pending\n## Look log\n${lines.map((l) => `- ${l}\n`).join('')}`);
  const offered = () => looks().some((x) => x.units.some((u) => /LookedTwoScene/.test(u.scene)));
  lookNote(['pass 1 (3): seen - label clipped; changed - HEIGHT 400 -> 440; left - none']);
  t('look cap: a pass that fixed a named defect is followed by another pass', offered(), '');
  lookNote(['pass 1 (3): seen - label clipped; changed - HEIGHT 400 -> 440; left - none', 'pass 2 (2): seen - clean; changed - none; left - none']);
  t('look cap: a pass that changed nothing is not followed by another pass', !offered(), '');
  lookNote(['pass 1 (3): seen - a; changed - x; left - b', 'pass 2 (2): seen - b; changed - y; left - c', 'pass 3 (2): seen - c; changed - z; left - d']);
  t('look cap: no 4th pass after 3', !offered(), '');
  lookNote(['round 1 (3): seen - a; changed - none; left - b']);
  t('look cap: a verify "round" line is not a pass', offered(), '');
  for (const f of ['LookedTwoScene.js', 'LookedTwoScene.stub.md', 'LookedTwoScene.design.md']) fs.rmSync(path.join(sims, 'L02', f), { force: true });
  for (const f of ['GhostScene-b.stub.md', 'RealScene-b.stub.md', 'RealScene.js', 'LookedScene.js', 'LookedScene.stub.md', 'LookedScene.design.md']) fs.rmSync(path.join(sims, 'L02', f), { force: true });

  // 3c. next.mjs --bank prints its prompt (printEntries once crashed on a missing args)
  const bk = spawnSync(process.execPath, [path.join(HERE, 'next.mjs'), '--bank', '--bundle', 'algb', '--repo', repo], { encoding: 'utf8' });
  t('next.mjs --bank prints a bank stage prompt without crashing', bk.status === 0 && /Stage B\d/.test(bk.stdout), (bk.stdout + bk.stderr).slice(0, 300));

  // 4. orchestrate: header line near the top, PROMPT END last, prompt file without markers; longest unit first
  const orch = spawnSync(process.execPath, [path.join(HERE, 'orchestrate.mjs'), '--harness', 'claude-code', '--bundle', 'algb', '--repo', repo, '--only', 'build', '--scenes-per-agent', '1', '--no-bundled-docs'], { encoding: 'utf8' });
  const lines = orch.stdout.trimEnd().split('\n');
  t('orchestrate: first line is the ORCH-STATUS line, then the do-not-pipe line', /^ORCH-STATUS: CONTINUE/.test(lines[0]) && /do not pipe it through head or tail/.test(lines[1]), lines.slice(0, 3).join('\n'));
  t('orchestrate: PROMPT END is the last line printed', lines[lines.length - 1] === '===== PROMPT END =====', lines.slice(-3).join('\n'));
  const pf = path.join(repo, 'build', 'scratch', 'algb', 'orchestrate-prompt-build.md');
  const body = fs.existsSync(pf) ? fs.readFileSync(pf, 'utf8') : '';
  t('orchestrate: prompt file exists, no ORCH-STATUS line or markers, and its path is printed', body.startsWith('Drive the') && !/PROMPT (START|END)|ORCH-STATUS/.test(body) && orch.stdout.includes(pf), body.slice(0, 120));
  const firstUnit = (orch.stdout.split('\nUNITS\n')[1] || '').split('\n')[0];
  t('orchestrate: the 4-scene unit is listed first', /Targets: .*ConsecutiveSquaresScene/.test(firstUnit), firstUnit.slice(0, 200));
  t('orchestrate: report wording carries requests: N and the log is appended at the END', /requests: N/.test(orch.stdout) && !/under an existing heading/.test(orch.stdout), '');
  // 5. interactive steering plumbing (S1): flag, sticky key, refusals, per-course audience notes. Own fixture repo.
  const r2 = fs.mkdtempSync(path.join(os.tmpdir(), 'test-next-i-'));
  try {
    fs.writeFileSync(path.join(r2, 'AGENTS.md'), 'x\n');
    const mk = (id, files, bj) => {
      const d = path.join(r2, 'courses', id); fs.mkdirSync(d, { recursive: true });
      for (const [f, c] of Object.entries(files)) fs.writeFileSync(path.join(d, f), c);
      if (bj) fs.writeFileSync(path.join(d, 'bundle.json'), JSON.stringify(bj));
      return d;
    };
    const dash = String.fromCharCode(8212);
    const outline = `Look: quill\nStrategy: case spine\n## Lesson list\n- L01 ${dash} One (2 slides)\n- L02 ${dash} Two (2 slides)\n`;
    mk('one', { 'FIGURES.md': 'none\n' }, { bundleId: 'one' });
    mk('two', { 'FIGURES.md': 'none\n', 'OUTLINE.md': outline }, { bundleId: 'two' });
    const nx = (...a) => spawnSync(process.execPath, [path.join(HERE, 'next.mjs'), '--repo', r2, ...a], { encoding: 'utf8' });
    const IL = 'Interactive: on\nInteractive rules: briefs/reference/interactive.md (read it first; it overrides START-HERE rule 7 until the operator confirms).';
    const noteBlock = (o) => (o.stdout.split('\n\n')[1] || '').trimEnd();
    let o = nx('--bundle', 'one');
    t('interactive: default 1b prompt has no Interactive line', o.status === 0 && /Stage: 1b/.test(o.stdout) && !/Interactive/.test(o.stdout), o.stdout);
    o = nx('--bundle', 'one', '--interactive');
    t('interactive: --interactive on 1b appends the two lines last', /Stage: 1b/.test(o.stdout) && noteBlock(o).endsWith(IL) && o.stderr === '', o.stdout + o.stderr);
    o = nx('--bundle', 'two');
    t('interactive: default Stage 2 prompt has no Interactive line', /Stage: 2\. Bundle: two\. Target: L01/.test(o.stdout) && !/Interactive/.test(o.stdout), o.stdout);
    o = nx('--bundle', 'two', '--interactive');
    t('interactive: --interactive on Stage 2 appends the two lines', noteBlock(o).endsWith(IL), o.stdout);
    o = nx('--bundle', 'two', '--interactive', '--target', 'L02');
    t('interactive: --target L02 picks that lesson', /Target: L02\./.test(o.stdout) && !/Target: L01/.test(o.stdout) && noteBlock(o).endsWith(IL), o.stdout);
    o = nx('--bundle', 'two', '--units');
    t('interactive: --units has no interactive key by default', !/"interactive"/.test(o.stdout), o.stdout.slice(0, 200));
    o = nx('--bundle', 'two', '--units', '--interactive', '--target', 'L02');
    const uj = JSON.parse(o.stdout);
    t('interactive: --units --interactive marks the unit', uj.units.length === 1 && uj.units[0].interactive === true && !/Interactive/.test(uj.units[0].prompt), o.stdout.slice(0, 300));
    o = nx('--bundle', 'two', '--list', '--interactive');
    t('interactive: --list --interactive on Stage 2 (all lessons)', (o.stdout.match(/^Interactive: on$/gm) || []).length === (o.stdout.match(/Stage: 2\./g) || []).length && /Stage: 2\./.test(o.stdout), o.stdout);
    fs.writeFileSync(path.join(r2, 'courses', 'two', 'bundle.json'), JSON.stringify({ bundleId: 'two', interactive: ['2'] }));
    o = nx('--bundle', 'two');
    t('interactive: sticky bundle.json key adds the lines for Stage 2 without the flag', noteBlock(o).endsWith(IL), o.stdout);
    fs.writeFileSync(path.join(r2, 'courses', 'two', 'bundle.json'), JSON.stringify({ bundleId: 'two', interactive: ['1b'] }));
    o = nx('--bundle', 'two');
    t('interactive: sticky key for 1b only leaves Stage 2 unchanged', !/Interactive/.test(o.stdout), o.stdout);
    o = nx('--bundle', 'two', '--units');
    t('interactive: sticky key for 1b only leaves Stage 2 units unmarked', !/"interactive"/.test(o.stdout), o.stdout.slice(0, 200));
    fs.writeFileSync(path.join(r2, 'courses', 'two', 'bundle.json'), JSON.stringify({ bundleId: 'two', interactive: ['2'] }));
    o = spawnSync(process.execPath, [path.join(HERE, 'orchestrate.mjs'), '--harness', 'claude-code', '--bundle', 'two', '--repo', r2], { encoding: 'utf8' });
    t('interactive: orchestrate ignores the sticky key (no Interactive lines, one note, no unit key)', !/Interactive: on|"interactive"/.test(o.stdout) && /interactive" ignored/.test(o.stderr), (o.stdout + o.stderr).slice(0, 300));
    o = spawnSync(process.execPath, [path.join(HERE, 'orchestrate.mjs'), '--harness', 'claude-code', '--bundle', 'two', '--repo', r2, '--interactive'], { encoding: 'utf8' });
    t('interactive: orchestrate --interactive exits 2 with the message', o.status === 2 && /interactive runs need a person to answer; use next\.mjs --interactive in a live session/.test(o.stderr), o.stdout + o.stderr);
    o = spawnSync(process.execPath, [path.join(HERE, 'auto-run.mjs'), '--bundle', 'two', '--repo', r2, '--interactive'], { encoding: 'utf8' });
    t('interactive: auto-run --interactive exits 2 with the message', o.status === 2 && /interactive runs need a person to answer/.test(o.stderr), o.stdout + o.stderr);
    mk('zero', {}, { bundleId: 'zero' });
    o = nx('--bundle', 'zero', '--interactive');
    const o0 = nx('--bundle', 'zero');
    t('interactive: --interactive on another stage (1a) prints as usual plus one stderr line', o.status === 0 && /Stage: 1a/.test(o.stdout) && o.stdout === o0.stdout && /^--interactive: no checkpoint for stage 1a; printed as usual\n$/.test(o.stderr), o.stderr + o.stdout.slice(0, 200));

    // per-course audience: bundle.json "audience" vs the repo's profile.json
    const aud = (id) => nx('--bundle', id).stdout;
    mk('plainb', { 'FIGURES.md': 'none\n' }, { bundleId: 'plainb' });
    t('audience: a default bundle prints no Audience line', !/Audience for this course/.test(aud('plainb')), aud('plainb'));
    fs.writeFileSync(path.join(r2, 'courses', 'plainb', 'bundle.json'), JSON.stringify({ bundleId: 'plainb', audience: 'college' }));
    t('audience: bundle college in a school repo names the college card', /^Audience for this course: college - use packs\/audience\/college\/CARD\.md, not the audience card in the bundle\.$/m.test(aud('plainb')), aud('plainb'));
    fs.writeFileSync(path.join(r2, 'courses', 'plainb', 'bundle.json'), JSON.stringify({ bundleId: 'plainb', audience: 'school' }));
    t('audience: bundle school in a school repo prints nothing', !/Audience for this course/.test(aud('plainb')), aud('plainb'));
    fs.writeFileSync(path.join(r2, 'profile.json'), JSON.stringify({ look: 'plain', audience: 'college' }));
    t('audience: bundle school in a college repo says to ignore the audience card', /^Audience for this course: school - ignore the audience card in the bundle; the kit docs hold as written/m.test(aud('plainb')), aud('plainb'));
    fs.writeFileSync(path.join(r2, 'courses', 'plainb', 'bundle.json'), JSON.stringify({ bundleId: 'plainb' }));
    t('audience: a default bundle in a college repo prints nothing new', !/Audience for this course/.test(aud('plainb')), aud('plainb'));

    // 6. interactive steering v2: Stage 3 / B1, --target L01/Scene, alternative notes, async mode, waiting steer files. Own fixture repo.
    const r3 = fs.mkdtempSync(path.join(os.tmpdir(), 'test-next-v2-'));
    try {
      fs.writeFileSync(path.join(r3, 'AGENTS.md'), 'x\n');
      const B3 = path.join(r3, 'courses', 'b3');
      fs.mkdirSync(path.join(B3, 'lessons'), { recursive: true });
      fs.writeFileSync(path.join(B3, 'FIGURES.md'), 'none\n');
      fs.writeFileSync(path.join(B3, 'BANK-PLAN.md'), 'x\n');
      fs.writeFileSync(path.join(B3, 'OUTLINE.md'), `## Lesson list\n- L01 ${dash} One (2 slides)\n- L02 ${dash} Two (2 slides)\n`);
      for (const k of ['01', '02']) fs.writeFileSync(path.join(B3, 'lessons', `les-${k}.json`), '{}\n');
      const scene = (l, name, helper, status) => {
        const d = path.join(B3, 'simulations', l); fs.mkdirSync(d, { recursive: true });
        fs.writeFileSync(path.join(d, `${name}.stub.md`), `# ${name}\nBase class: DomSimulation\nSave path: simulations/${l}/${name}.js\nShared helper: ${helper}\n`);
        if (status) { fs.writeFileSync(path.join(d, `${name}.js`), `export class ${name} {}\n`); fs.writeFileSync(path.join(d, `${name}.design.md`), `# d\nStatus: ${status}\n## Progress\n- end: ${status}\n`); }
      };
      scene('L01', 'Alpha', 'none', 'done');
      scene('L01', 'Beta', 'none');
      scene('L02', 'Own', 'none');
      scene('L02', 'Own-b', 'Own.js');
      scene('L02', 'Sane', 'none', 'sanity-pending');
      fs.writeFileSync(path.join(B3, 'bundle.json'), JSON.stringify({ bundleId: 'b3' }));
      const n3 = (...a) => spawnSync(process.execPath, [path.join(HERE, 'next.mjs'), '--repo', r3, '--bundle', 'b3', '--no-bundled-docs', ...a], { encoding: 'utf8' });
      const IA = 'Interactive: async\nInteractive rules: briefs/reference/interactive.md (read it first; it overrides START-HERE rule 7 until the operator confirms).';
      const prompts = (o) => o.stdout.split('\n').filter((l) => /^Read START-HERE/.test(l));
      const pOf = (o, re) => prompts(o).find((l) => re.test(l)) || '';
      const withLines = (o, re, lines) => { const i = o.stdout.indexOf(pOf(o, re)); return i >= 0 && o.stdout.slice(i).split('\n\n')[0].endsWith(lines); };

      let o = n3('--list');
      t('v2 stage 3: default build prompts carry no Interactive line; the owner and its rider are one Targets: unit', !/Interactive/.test(o.stdout) && /Targets: simulations\/L02\/Own\.stub\.md, simulations\/L02\/Own-b\.stub\.md/.test(o.stdout), o.stdout);
      o = n3('--list', '--interactive');
      t('v2 stage 3: --interactive build and one-run prompts get the lines, one scene per prompt (Target:, never Targets:)', prompts(o).filter((l) => /Pass: build/.test(l)).length >= 2 && withLines(o, /Target: simulations\/L01\/Beta\.stub\.md/, IA.replace('async', 'on')) && withLines(o, /Target: simulations\/L02\/Own\.stub\.md/, IA.replace('async', 'on')) && !/Targets:/.test(o.stdout) && !/Own-b\.stub/.test(o.stdout), o.stdout);
      t('v2 stage 3: sanity pass gets no lines and no warning', !/Interactive/.test(pOf(o, /Pass: sanity/)) && !/Pass: sanity[^\n]*\nInteractive/.test(o.stdout) && o.stderr === '' && /Pass: sanity/.test(o.stdout), o.stdout + o.stderr);
      fs.writeFileSync(path.join(B3, 'simulations', 'L02', 'Sane.design.md'), '# d\nStatus: verify-pending\n## Progress\n- sanity end\n');
      o = n3('--list', '--interactive');
      t('v2 stage 3: verify pass gets no lines and no warning', /Pass: verify/.test(o.stdout) && !/Pass: verify[^\n]*\nInteractive/.test(o.stdout) && o.stderr === '', o.stdout + o.stderr);
      fs.writeFileSync(path.join(B3, 'simulations', 'L02', 'Sane.design.md'), '# d\nStatus: look-pending\n## Progress\n- end: look-pending\n');
      o = n3('--list', '--interactive');
      t('v2 stage 3: a 3-look unit prints as usual (no lines); one stderr line for the stage', /Stage: 3-look/.test(o.stdout) && !/Stage: 3-look[^\n]*\nInteractive/.test(o.stdout) && /^--interactive: no checkpoint for stage 3-look; printed as usual\n$/.test(o.stderr), o.stdout + o.stderr);
      fs.writeFileSync(path.join(B3, 'simulations', 'L02', 'Sane.design.md'), '# d\nStatus: done\n');
      o = n3('--list', '--interactive', '--one-pass');
      t('v2 stage 3: a one-pass unit (no Pass:) gets the lines', withLines(o, /Target: simulations\/L01\/Beta\.stub\.md\. Look: later/, IA.replace('async', 'on')), o.stdout);

      o = n3('--list', '--target', 'L01/Beta');
      t('v2 --target L01/Scene: only that scene', prompts(o).length === 1 && /L01\/Beta\.stub\.md/.test(o.stdout) && !/Own/.test(o.stdout), o.stdout);
      o = n3('--list', '--target', 'L01');
      t('v2 --target L01 (no scene) is unchanged: that lesson only', /L01\/Beta/.test(o.stdout) && !/L02\//.test(o.stdout), o.stdout);
      o = n3('--units', '--target', 'L02/Own');
      const ju = JSON.parse(o.stdout);
      t('v2 --target L02/Own: --units keeps only that scene', ju.units.length === 1 && /Own/.test(ju.units[0].id), o.stdout.slice(0, 300));

      // alternative notes
      const notesFile = path.join(B3, 'review-notes.json');
      fs.writeFileSync(notesFile, JSON.stringify({ notes: [
        { id: 'n12', scope: 'L01/Alpha', beat: null, theme: null, viewport: null, text: 'another way', kind: 'alternative', source: 'human', state: 'accepted', at: 'x' },
        { id: 'n13', scope: 'L02/Sane', beat: null, theme: null, viewport: null, text: 'done note', kind: 'alternative', source: 'human', state: 'done', at: 'x' },
      ] }));
      o = n3('--list');
      t('v2 alternative: not interactive - Alpha is not offered, one stderr line names the command', !/Alpha/.test(o.stdout) && o.stderr === 'note n12 asks for another way for L01/Alpha: run next.mjs --interactive --target L01/Alpha\n', o.stdout + o.stderr);
      o = n3('--list', '--interactive');
      t('v2 alternative: --interactive re-offers the done scene as a build with Alternative: n12, no Resume', /Target: simulations\/L01\/Alpha\.stub\.md\. Pass: build\. Alternative: n12\./.test(o.stdout) && !/Resume/.test(pOf(o, /Alpha/)) && !/n13/.test(o.stdout) && o.stderr === '', o.stdout + o.stderr);
      o = n3('--list', '--interactive-async');
      t('v2 alternative: --interactive-async offers it too', /Alternative: n12\./.test(o.stdout), o.stdout);
      o = n3('--units', '--interactive');
      t('v2 alternative: --units carries the alternative ids', JSON.parse(o.stdout).units.some((u) => /Alpha/.test(u.id) && u.alternative?.[0] === 'n12'), o.stdout.slice(0, 200));
      fs.writeFileSync(path.join(B3, 'simulations', 'L01', 'Alpha.design.md'), '# d\nStatus: building\n');
      o = n3('--list', '--interactive');
      t('v2 alternative: a scene in flight (Status building) is not offered', !/Alpha/.test(o.stdout.replace(/Alpha-?\w*\n/, '')) || !/Pass: build\. Alternative/.test(o.stdout), o.stdout);
      fs.writeFileSync(path.join(B3, 'simulations', 'L01', 'Alpha.design.md'), '# d\nStatus: done\n');
      fs.rmSync(notesFile);

      // async lines
      o = n3('--list', '--interactive-async');
      t('v2 async: build prompts end with Interactive: async and the rules pointer', withLines(o, /Target: simulations\/L01\/Beta\.stub\.md/, IA) && !/Interactive: on/.test(o.stdout), o.stdout);
      o = n3('--units', '--interactive-async');
      t('v2 async: --units interactive value is "async"', JSON.parse(o.stdout).units.some((u) => u.interactive === 'async'), o.stdout.slice(0, 300));
      o = n3('--interactive', '--interactive-async');
      t('v2 async: both flags together is an error', o.status !== 0 && /pick one/.test(o.stderr), o.stdout + o.stderr);
      fs.writeFileSync(path.join(B3, 'bundle.json'), JSON.stringify({ bundleId: 'b3', interactive: ['3'], interactiveMode: 'async' }));
      o = n3('--list');
      t('v2 async: bundle.json interactiveMode async makes the sticky stages async', withLines(o, /Target: simulations\/L01\/Beta\.stub\.md/, IA), o.stdout);
      fs.writeFileSync(path.join(B3, 'bundle.json'), JSON.stringify({ bundleId: 'b3', interactive: ['3'] }));
      o = n3('--list');
      t('v2 async: sticky without interactiveMode stays live', withLines(o, /Target: simulations\/L01\/Beta\.stub\.md/, IA.replace('async', 'on')), o.stdout);
      fs.writeFileSync(path.join(B3, 'bundle.json'), JSON.stringify({ bundleId: 'b3' }));

      // waiting steer files
      const steer = path.join(B3, 'steer'); fs.mkdirSync(steer, { recursive: true });
      const sf = path.join(steer, '3-L01-Beta.md');
      fs.writeFileSync(sf, '# Steer\\n## Proposal\\nA or B?\\nStatus: waiting for the operator\\n'.replace(/\\n/g, '\n'));
      const WL = 'waiting for your choice: courses/b3/steer/3-L01-Beta.md (write your answer under a new "## Answer N" heading, then run next.mjs again)';
      o = n3('--list');
      t('v2 waiting: default mode names the waiting file and skips the unit, offers the next', o.stdout.includes(WL) && !/Target: simulations\/L01\/Beta/.test(o.stdout) && /Targets: simulations\/L02\/Own\.stub\.md/.test(o.stdout), o.stdout);
      o = n3('--list', '--interactive-async');
      t('v2 waiting: async mode skips it too', o.stdout.includes(WL) && !/Target: simulations\/L01\/Beta/.test(o.stdout) && /Interactive: async/.test(o.stdout), o.stdout);
      o = n3('--list', '--interactive');
      t('v2 waiting: live mode prints the unit anyway (no waiting line)', !o.stdout.includes('waiting for your choice') && /Target: simulations\/L01\/Beta\.stub\.md/.test(o.stdout), o.stdout);
      o = n3('--units', '--interactive-async');
      const wu = JSON.parse(o.stdout).units.find((u) => /Beta/.test(u.id));
      t('v2 waiting: --units reports "waiting" with the path and interactive async', wu && wu.waiting === 'courses/b3/steer/3-L01-Beta.md' && wu.interactive === 'async', JSON.stringify(wu));
      fs.appendFileSync(sf, '## Answer 1\nB\n');
      o = n3('--list', '--interactive-async');
      t('v2 waiting: an answer after the last proposal ends the wait', !o.stdout.includes('waiting for your choice') && /Target: simulations\/L01\/Beta\.stub\.md/.test(o.stdout), o.stdout);
      fs.appendFileSync(sf, '## Proposal 2\nmore?\n');
      o = n3('--list');
      t('v2 waiting: a later proposal waits again (only the LAST proposal counts)', o.stdout.includes(WL), o.stdout);
      fs.rmSync(sf);
      // Stage 2 and 1b names
      fs.rmSync(path.join(B3, 'lessons', 'les-02.json'));
      fs.writeFileSync(path.join(steer, '2-L02.md'), '## Proposal\\nx\\n'.replace(/\\n/g, '\n'));
      o = n3('--interactive-async');
      t('v2 waiting: Stage 2 lesson file 2-L02.md names the unit; nothing else printed when it is the only one', /^waiting for your choice: courses\/b3\/steer\/2-L02\.md /.test(o.stdout) && !/Stage: 2/.test(o.stdout), o.stdout);
      fs.rmSync(path.join(steer, '2-L02.md'));
      fs.writeFileSync(path.join(B3, 'lessons', 'les-02.json'), '{}\n');
      // orchestrate: async allowed (lines on one line, waiting unit left out), live refused
      fs.writeFileSync(path.join(steer, '3-L01-Beta.md'), '## Proposal\\nx\\n'.replace(/\\n/g, '\n'));
      o = spawnSync(process.execPath, [path.join(HERE, 'orchestrate.mjs'), '--harness', 'claude-code', '--bundle', 'b3', '--repo', r3, '--only', 'build', '--no-bundled-docs', '--interactive-async'], { encoding: 'utf8' });
      t('v2 orchestrate: --interactive-async is allowed; units carry Interactive: async; the waiting unit is left out and named on stderr', o.status === 0 && /Interactive: async Interactive rules/.test(o.stdout) && !/L01\/Beta\.stub/.test(o.stdout) && /waiting for your choice: courses\/b3\/steer\/3-L01-Beta\.md/.test(o.stderr), (o.stdout + o.stderr).slice(0, 400));
      o = spawnSync(process.execPath, [path.join(HERE, 'orchestrate.mjs'), '--harness', 'claude-code', '--bundle', 'b3', '--repo', r3, '--interactive'], { encoding: 'utf8' });
      t('v2 orchestrate: live --interactive is still refused', o.status === 2, o.stdout + o.stderr);
      fs.writeFileSync(path.join(B3, 'bundle.json'), JSON.stringify({ bundleId: 'b3', interactive: ['3'], interactiveMode: 'async' }));
      fs.rmSync(path.join(steer, '3-L01-Beta.md'));
      o = spawnSync(process.execPath, [path.join(HERE, 'orchestrate.mjs'), '--harness', 'claude-code', '--bundle', 'b3', '--repo', r3, '--only', 'build', '--no-bundled-docs'], { encoding: 'utf8' });
      t('v2 orchestrate: a sticky async key is honored (no "ignored" note)', /Interactive: async/.test(o.stdout) && !/ignored here/.test(o.stderr), (o.stdout + o.stderr).slice(0, 300));
      fs.writeFileSync(path.join(B3, 'bundle.json'), JSON.stringify({ bundleId: 'b3', interactive: ['3'] }));
      o = spawnSync(process.execPath, [path.join(HERE, 'orchestrate.mjs'), '--harness', 'claude-code', '--bundle', 'b3', '--repo', r3, '--only', 'build', '--no-bundled-docs'], { encoding: 'utf8' });
      t('v2 orchestrate: a sticky live key is still ignored with the note', !/Interactive: on/.test(o.stdout) && /ignored here/.test(o.stderr), (o.stdout + o.stderr).slice(0, 300));
      fs.writeFileSync(path.join(B3, 'bundle.json'), JSON.stringify({ bundleId: 'b3' }));

      // B1 (bank track)
      fs.rmSync(path.join(B3, 'BANK-PLAN.md'));
      o = n3('--bank', '--interactive');
      t('v2 B1: --interactive bank plan prompt gets the lines', /Stage: B1/.test(o.stdout) && withLines(o, /Stage: B1/, IA.replace('async', 'on')), o.stdout + o.stderr);
      o = n3('--bank', '--interactive-async');
      t('v2 B1: async lines', withLines(o, /Stage: B1/, IA), o.stdout);
      fs.writeFileSync(path.join(steer, 'B1-bank.md'), '## Proposal\\nx\\n'.replace(/\\n/g, '\n'));
      o = n3('--bank', '--interactive-async');
      t('v2 B1: a waiting steer/B1-bank.md is named, not printed', /^waiting for your choice: courses\/b3\/steer\/B1-bank\.md /.test(o.stdout) && !/Stage: B1/.test(o.stdout), o.stdout);
      o = n3('--bank', '--units', '--interactive-async');
      const bu = JSON.parse(o.stdout).units[0];
      t('v2 B1: --units carries waiting and async', bu.waiting === 'courses/b3/steer/B1-bank.md' && bu.interactive === 'async', JSON.stringify(bu).slice(0, 200));
      o = n3('--bank', '--interactive');
      t('v2 B1: live prints the waiting B1 unit', /Stage: B1/.test(o.stdout) && !/waiting for your choice/.test(o.stdout), o.stdout);
      // no steer folder, no flags: nothing changes
      fs.rmSync(steer, { recursive: true });
      o = n3('--bank');
      t('v2: no steer folder and no flags - B1 prompt is plain', /Stage: B1/.test(o.stdout) && !/Interactive|waiting/.test(o.stdout), o.stdout);
    } finally {
      fs.rmSync(r3, { recursive: true, force: true });
    }
  } finally {
    fs.rmSync(r2, { recursive: true, force: true });
  }
} finally {
  fs.rmSync(repo, { recursive: true, force: true });
}
console.log(fails ? `FAIL - ${fails} of ${n} check(s)` : `PASS - ${n} check(s)`);
process.exit(fails ? 1 : 0);
