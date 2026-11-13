#!/usr/bin/env node
// drive - operate a scene headless (no browser): set dials, press buttons, tap,
// drag, run the clock, read state and drawn text. Replaces the per-scene
// "drive" scripts agents kept rewriting.
//
// As a library (from a test script run with the loader):
//   node tools/sim-test/run.mjs exec build/my-drive.mjs
//   import { drive, check, summary } from '../tools/sim-test/drive.mjs';
//   const d = await drive('L04/SlingshotBandScene', { bundle: 'work-energy', beat: 0 });
//   d.set('pull', 12);              // like the host: sliders/selects/numbers arrive as STRINGS
//   d.press('release');             // a button: onControlChange(id, true); a toggle/checkbox gets true/false
//   const secs = d.until(() => !d.busy(), 20);   // runs the clock; throws if it never ends
//   check(d.sc._meter === 0, 'meter empty after release');
//   d.stops('pull')                 // [min, default, max] of a slider, or a select's values
//   d.texts()                       // text drawn in a fresh frame (canvas scenes)
//   process.exitCode = summary();
// d.count(kind) = how many `kind` draw calls one fresh frame makes ('arc', 'fillText' or 'text', 'rect', 'stroke' ...): prove a
// thing is STILL drawn (count 5 chairs after a change) instead of reading a model field.
// Other members: beat(n), tap(x, y), drag([[x,y],...]), step(sec), busy(), hidden(id),
// disabled(id), value(id), state() (the scene's testState(): key values), snap() (rounded model state), sc (the scene), beats.
// A control the host would not offer (hidden, or a disabled button) is ignored, as
// the host ignores it, and noted in d.ignored.
// The clock is fake and covers setTimeout/setInterval too: d.step(6) runs six seconds of
// timers instantly (no `await sleep(...)`); d.timers() = timers still waiting. A scene's own
// Date.now() is not faked.
//
// As a CLI, a step list like shoot's, printed as text (or --recipe smoke: a generated sweep of every control and beat;
// --recipe skeleton prints that list as JSON to edit):
//   node tools/sim-test/run.mjs exec tools/sim-test/drive.mjs L04/SlingshotBandScene --bundle work-energy \
//     --steps='[{"beat":0},{"ctrl":["pull","12"]},{"ctrl":["release",true],"until":"idle"},{"probe":"sc._meter"}]'
//   step keys: beat N | ctrl [id, v] | tap [x, y] | drag [[x,y],...] | wait ms | until "idle" (max 30 s) | probe "js" (d, sc in scope)
//     | expect "text or /regex/" (FAIL unless that text is drawn now) | probe "js" + expect <json> (FAIL unless equal; add "not":true to invert)
//   A failing expect prints FAIL: step N: ..., "visible now:" (the drawn text) and "closest:"; the run ends with PASS or FAIL and exits 1 on FAIL.
//   Output as drive-dom: a FIRST FAIL (step N) line on top; over about 2000 chars it is cut to the key lines, full text in
//   build/scratch/<Scene>-drive.log. Probe budget: 3 runs with an expect/probe per scene (build/scratch/<Scene>.drive-runs);
//   the 4th prints STOP and exits 1. A beat-only smoke run and --recipe are not counted. "name" (a shoot key) is ignored.
//   A probe is an expression, e.g. (s => s.a + s.b)(d.snap()); statements ending in the value also work (const a = d.snap(); a.x).
//   Probes may read private fields (sc._s.spread) and d.count("arc") / d.texts(); never test a drawn thing through a model field.
//   Each step prints busy and the drawn text; --no-text hides the text. --beats N overrides the beat count.
// DomSimulation scenes: the fake DOM has no HTML parser, so drive their state and handlers, not their markup.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { installFakeHost, installFakeTimers, pendingTimers, createDrawCtx, makeContainer, pumpFrame, getLastCtx } from './harness.mjs';
import { toControlValue } from '../../simulations-kit/src/simulations/base/SimControls.js';
import { scratchFor, KIT_ROOT, resolveBundle, resolveTarget, describeMiss, attachersOf } from './lib/bundle.mjs';
import { runCounter } from './lib/domsteps.mjs';
import { checkFlags, parseSteps } from './lib/args.mjs';
import { snap, seeded } from './lib/probe.mjs';
import { judgeText, judgeProbe, badStep } from './lib/expect.mjs';

export { check, summary } from './harness.mjs';

const asBody = (j) => { const t = j.trim().replace(/;+$/, ''); if (/\breturn\b/.test(t)) return t; const i = t.lastIndexOf(';'); return i < 0 ? `return (${t})` : `${t.slice(0, i + 1)} return (${t.slice(i + 1)});`; };   // statements (const/let, a final expression) are accepted too
const FRAME_MS = 1000 / 60;

export async function drive(target, o = {}) {
  const bundleDir = o.bundle ? resolveBundle(o.bundle) : null;
  if (o.bundle && !bundleDir) throw new Error(`drive: no such bundle "${o.bundle}"`);
  const t = target.endsWith('.js') && fs.existsSync(target) ? { kind: 'scene', file: path.resolve(target), bundle: bundleDir } : resolveTarget(target, bundleDir);
  if (!t || t.kind !== 'scene') throw new Error(`drive: ${describeMiss(target, bundleDir)}`);
  installFakeHost(createDrawCtx);
  installFakeTimers();
  Math.random = seeded();
  const mod = await import(pathToFileURL(t.file).href);
  const S = Object.values(mod).find((v) => typeof v === 'function' && typeof v.prototype?.setup === 'function');
  if (!S) throw new Error(`drive: no scene class exported by ${t.file}`);
  const att = t.bundle ? attachersOf(t.bundle, t.file).filter((a) => a.beats != null) : [];
  const beats = o.beats ?? att[0]?.beats ?? S.BEAT_STEP_MAP?.length ?? 1;
  const sc = new S(makeContainer());
  sc.requestUiUpdate = () => {};
  sc.allowResume = true;
  await sc.setup();
  sc.start?.();

  const ctl = (id) => (S.CONTROLS || []).find((c) => c.id === id);
  const d = {
    sc, S, beats, ignored: [], file: t.file,
    busy: () => !!sc.busy?.(),
    hidden: (id) => !!sc.isControlHidden?.(id),
    disabled: (id) => !!sc.isControlDisabled?.(id),
    value: (id) => sc.getControlValue?.(id),
    timers: () => pendingTimers(),
    snap: () => snap(sc),
    state: () => sc.testState?.() ?? {},
    step(sec = 0.1) {
      let ran = 0;
      for (let ms = 0; ms < sec * 1000; ms += FRAME_MS) if (pumpFrame(FRAME_MS)) ran++;
      return ran;
    },
    until(pred, maxSec = 30) {
      let t0 = 0;
      while (!pred()) {
        if (t0 >= maxSec) throw new Error(`drive: condition still false after ${maxSec}s`);
        d.step(0.05); t0 += 0.05;
      }
      return Math.round(t0 * 100) / 100;
    },
    idle: () => d.until(() => !d.busy(), 30),
    beat(n) { sc.onBeatChange?.(n, beats); sc.requestUiUpdate(); return d.step(0.1); },
    set(id, v) {
      const c = ctl(id);
      if (!c) throw new Error(`drive: no control "${id}" (have: ${(S.CONTROLS || []).map((x) => x.id).join(', ')})`);
      if (d.hidden(id) || (c.type === 'button' && d.disabled(id))) { d.ignored.push(id); return false; }
      sc.onControlChange(id, toControlValue(c, v));
      sc.requestUiUpdate();
      d.step(0.02);
      return true;
    },
    press: (id) => d.set(id, true),
    tap(x, y) {
      if (typeof sc.pointerDown !== 'function') throw new Error('drive: this scene has no pointerDown (a DOM scene: call its handlers via d.sc)');
      sc.animateFor?.(); sc.pointerDown({ x, y }); sc.pointerUp?.({ x, y }); sc.requestUiUpdate();
      return d.step(0.02);
    },
    drag(pts) {
      // Step syntax is `drag [[x, y], ...]` (pairs) but pointer hooks take {x, y}
      // (SimScene.js:13). Normalise here; objects are accepted too.
      const at = (p) => (Array.isArray(p) ? { x: p[0], y: p[1] } : p);
      sc.animateFor?.(); sc.pointerDown(at(pts[0]));
      for (const p of pts.slice(1)) { sc.pointerMove?.(at(p)); d.step(0.016); }
      sc.pointerUp?.(at(pts[pts.length - 1])); sc.requestUiUpdate();
      return d.step(0.02);
    },
    stops(id) {
      const c = ctl(id);
      if (!c) return [];
      if (c.options) return c.options.map((x) => (typeof x === 'string' ? x : x.value));
      return [c.min ?? 0, c.value ?? c.min ?? 0, c.max ?? 100];
    },
    count(kind) {
      const ctx = getLastCtx();
      if (!ctx?._calls) return 0;
      ctx._calls.length = 0;
      sc.animateFor?.();
      pumpFrame(FRAME_MS);
      const names = kind === 'text' ? ['fillText', 'strokeText'] : kind === 'rect' ? ['fillRect', 'rect', 'roundRect'] : [kind];
      return ctx._calls.filter((c) => names.includes(c.method)).length;
    },
    texts() {
      const ctx = getLastCtx();
      if (!ctx?._textBoxes) return [];
      ctx._textBoxes.length = 0;
      sc.animateFor?.();
      d.step(0.05);
      const boxes = ctx._textBoxes;
      const last = boxes.length ? Math.max(...boxes.map((b) => b.frame)) : 0;
      return [...new Set(boxes.filter((b) => b.frame === last).map((b) => b.text))];
    },
    destroy() { try { sc.destroy?.(); } catch (_) { /* ignore */ } },
  };
  if (o.beat != null) d.beat(o.beat);
  return d;
}

// -- CLI ---------------------------------------------------------------------
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const argv = process.argv.slice(2);
  checkFlags(argv, { tool: 'drive', file: import.meta.url, usage: 'node tools/sim-test/run.mjs exec tools/sim-test/drive.mjs <L0N/Scene | Scene | path> [--bundle b] --steps=\'[{"beat":0},...]\' [--beats N] [--no-text]', val: ['bundle', 'beats', 'steps', 'recipe'], bool: ['no-text', 'more'] });
  const opt = (n) => { const a = argv.find((x) => x.startsWith(`--${n}=`)); if (a) return a.slice(n.length + 3); const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
  const target = argv.find((a) => !a.startsWith('--') && a !== opt('bundle') && a !== opt('beats') && a !== opt('steps') && a !== opt('recipe'));
  if (!target || (!opt('steps') && !opt('recipe'))) { console.error('usage: node tools/sim-test/run.mjs exec tools/sim-test/drive.mjs <scene> [--bundle b] --steps=\'[{"beat":0},...]\' [--beats N] [--no-text]'); process.exit(2); }
  if (opt('steps') && opt('recipe')) { console.error('--recipe builds its own steps and ignores --steps: use one of them. To edit a recipe: --recipe skeleton prints it as JSON, then pass the edited list with --steps.'); process.exit(2); }
  let d;
  try { d = await drive(target, { bundle: opt('bundle'), beats: opt('beats') ? Number(opt('beats')) : undefined }); }
  catch (e) { console.error(String(e.message || e)); process.exit(2); }
  // --recipe smoke: built from the scene's own CONTROLS and beats. Every beat: each slider/select at its min, default and max,
  //   each button pressed, one tap in the middle, and the clock run until idle. Nothing to write, nothing to import.
  // --recipe skeleton: prints the same list as --steps JSON for you to edit (add probes: "sc.solved", "sc.round" ...).
  const recipe = (kind) => {
    if (!['smoke', 'skeleton'].includes(kind)) { console.error(`--recipe is smoke or skeleton, got ${kind}`); process.exit(2); }
    const out = [];
    for (let b = 0; b < d.beats; b++) {
      out.push({ beat: b });
      for (const c of d.S.CONTROLS || []) {
        if (c.type === 'button') out.push({ ctrl: [c.id, true], until: 'idle' });
        else for (const v of d.stops(c.id).filter((x, i, a) => a.indexOf(x) === i)) out.push({ ctrl: [c.id, String(v)] });
      }
      if (typeof d.sc.pointerDown === 'function') out.push({ tap: [340, 260] });
      out.push({ wait: 500 });
    }
    return out;
  };
  const steps = opt('recipe') ? recipe(opt('recipe')) : parseSteps(opt('steps'), 'drive');
  if (opt('recipe') === 'skeleton') { console.log(JSON.stringify(steps)); d.destroy(); process.exit(0); }
  // Probe budget, as drive-dom: only a --steps run with an expect or probe counts (a beat-only smoke run and --recipe do not).
  const scratch = scratchFor(d.file);
  const sceneBase = path.basename(d.file, '.js');
  try { if (/extends\s+(?:with\w+\(\s*)*(DomSimulation|SvgScene)\b/.test(fs.readFileSync(d.file, 'utf8'))) console.error('note: a DOM/SVG scene. drive.mjs reaches state and handlers, not the panel; for its controls and text use drive-dom.mjs (--inputs lists them).'); } catch { /* no source */ }
  if (opt('steps')) {
    const rc = runCounter(path.join(scratch, `${sceneBase}.drive-runs`), { cap: 3, more: argv.includes('--more'), counted: steps.some((s) => s && (s.expect !== undefined || s.probe !== undefined)) });
    if (rc.stop) { console.error(`STOP: probe cap 3 reached (run ${rc.n}); record open: in the design note and move on`); d.destroy(); process.exit(1); }
  }
  // Buffer the output: the first failure goes on top, a long dump is cut. Every line also goes to
  // build/scratch/<Scene>-drive.log as it is made (kept after a HANG), and an empty write keeps the watchdog fed.
  const logPath = path.join(scratch, `${sceneBase}-drive.log`);
  try { fs.mkdirSync(scratch, { recursive: true }); fs.writeFileSync(logPath, ''); } catch { /* no dump */ }
  const LOG = [];
  const rawLog = console.log;
  console.log = (...a) => { const l = a.join(' '); LOG.push(l); try { fs.appendFileSync(logPath, l + '\n'); } catch { /* no dump */ } process.stdout.write(''); };
  const say = (label) => console.log(`${label.padEnd(28)} busy=${d.busy()}${argv.includes('--no-text') ? '' : `  text: ${d.texts().join(' | ').slice(0, 160)}`}`);
  say('start');
  const KEYS = new Set(['beat', 'ctrl', 'tap', 'drag', 'wait', 'until', 'probe', 'expect', 'not', 'name']);
  let fails = 0, ran = 0, curIdx = 0, firstFail = null;
  const FAIL = (m) => { fails++; const line = curIdx ? `step ${curIdx}: ${m}` : m; if (!firstFail) firstFail = { idx: curIdx, m }; console.log(`FAIL: ${line}`); };
  for (const [i, s] of steps.entries()) {
    ran++; curIdx = i + 1;
    const bad = badStep(s, { keys: KEYS });
    if (bad) { FAIL(bad); continue; }
    let label;
    try {
      if (s.beat != null) { d.beat(s.beat); label = `beat ${s.beat}`; }
      if (s.ctrl) { const ok = d.set(s.ctrl[0], s.ctrl[1]); label = `ctrl ${s.ctrl[0]}=${s.ctrl[1]}${ok ? '' : ' (ignored: hidden/disabled)'}`; }
      if (s.tap) { d.tap(s.tap[0], s.tap[1]); label = `tap ${s.tap}`; }
      if (s.drag) { d.drag(s.drag); label = 'drag'; }
      if (s.wait) { d.step(s.wait / 1000); label = `wait ${s.wait}ms`; }
      if (s.until === 'idle') { label = `${label || 'step'} -> idle after ${d.idle()}s`; }
    } catch (e) { FAIL(`${JSON.stringify(s)}: ${String(e.message || e).split('\n')[0]}`); continue; }
    if (s.probe) {
      let v;
      try { try { v = new Function('d', 'sc', `return (${s.probe});`)(d, d.sc); } catch (e1) { if (!(e1 instanceof SyntaxError)) throw e1; v = new Function('d', 'sc', asBody(s.probe))(d, d.sc); } } catch (e) { FAIL(`probe ${s.probe}: ${String(e.message)}${e instanceof SyntaxError ? ' (probe is not valid JS; an expression or statements ending in the value both work)' : ''}`); continue; }
      console.log(`probe ${s.probe} = ${JSON.stringify(v)}`);
      if ('expect' in s) { const j = judgeProbe(v, s); if (j.ok) console.log(`ok: ${j.msg}`); else FAIL(j.msg); }
    } else if (typeof s.expect === 'string') {
      const j = judgeText(d.texts().join(' '), s);
      if (j.ok) console.log(`ok: ${j.msg}`); else { FAIL(j.msg); for (const l of j.detail) console.log(l); }
    }
    if (!label && !s.probe && s.expect === undefined) console.log(`ignored step ${JSON.stringify(s)}: a canvas-scene step has one of beat, ctrl [id, v], tap [x, y], drag [[x, y], ...], wait ms, until "idle", probe "js", expect "text" (a DOM scene: tools/sim-test/drive-dom.mjs)`);
    if (label) say(label);
  }
  curIdx = 0;
  d.destroy();
  console.log(fails ? `FAIL - ${fails} problem(s) in ${ran} step(s)` : `PASS - ${ran} step(s), no problems`);
  console.log = rawLog;
  const full = LOG.join('\n');
  const top = firstFail ? `FIRST FAIL (${firstFail.idx ? `step ${firstFail.idx}` : 'after the steps'}): ${firstFail.m.slice(0, 300)}\n` : '';
  if (top.length + full.length <= 2000) console.log(top + full);
  else {
    const key = LOG.filter((l) => /^(FAIL|WARN|hint|\s+visible now|\s+closest|PASS)/.test(l)).map((l) => l.slice(0, 260));
    let out = top + `${LOG[0] || ''}\n`;
    for (const l of key) { if (out.length + l.length > 1800 && !/^(FAIL -|PASS -)/.test(l)) continue; out += l + '\n'; }
    console.log(out + `(output cut; ${full.length} chars in full: ${path.relative(process.cwd(), logPath)})`);
  }
  process.exit(fails ? 1 : 0);
}
