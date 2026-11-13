#!/usr/bin/env node
// drive-dom - operate a DomSimulation scene in a REAL browser, from a step list, and
// print what a learner would read. The DOM-scene counterpart of drive.mjs: the headless
// fake DOM has no HTML parser, so a scene's own panel inputs (its dials, buttons, tables)
// cannot be driven there; this loads the scene in simulations-kit/preview-harness.html
// (Chromium via Playwright) and uses real events. No screenshots: this is a text tool,
// so it never counts as a look round (use shoot for pictures).
//
//   node tools/sim-test/drive-dom.mjs <scene> --bundle <b> --steps='[{"beat":0},{"set":["#len",1.2]},{"click":"button:has-text(\"Run\")"},{"until":"idle"},{"expect":["#f","/85\.7 N/"]}]'
//   node tools/sim-test/drive-dom.mjs <scene> --bundle <b> --steps=@steps.json
//   node tools/sim-test/drive-dom.mjs <scene> --bundle <b> --inputs        (just list what a learner can operate)
//
// Steps (a selector is any Playwright selector: #id, .class, [aria-label="x"], button:has-text("Run")
// (text=Run matches every element containing Run); prefix "#controls " for the host control bar):
//   beat N                      the host's onBeatChange(N, beats)
//   set [sel, value]            a range/number/text input, a select (value or visible text) or a
//                               checkbox, with real input + change events; a disabled or missing
//                               control is reported and skipped, as a learner could not use it
//   click sel                   a real click (waits until the element is visible and enabled)
//   ctrl [id, value]            the scene's CONTROLS bar entry, like the host would send it
//   wait ms                     let that much time pass
//   until "idle"                run time until scene.busy() is false (max 30 s of scene time)
//   read sel                    print the text (or value) of up to 5 matches
//   expect "text"               FAIL unless a learner can read that text (or /regex/) somewhere in the scene now
//                               (text at opacity 0 or display:none does not count)
//   expect [sel, pattern]       FAIL unless the text/value matches (/regex/ or a substring); add
//                               {"not":true} to a step to invert
//   probe "js"                  evaluate in the page (sc = the scene, root = its root element, d = helpers),
//                               print the result; with "expect": <json> it also checks equality (add "not":true to invert).
//                               d.count("line") = visible elements matching a CSS selector (prove a thing is still drawn),
//                               d.texts() = the visible text segments. Never test a drawn thing through a model field.
//   inputs true                 list the operable controls again (--inputs alone lists the start beat only)
//   name "label"                ignored (a shoot key: one steps file serves both tools)
// Each step prints the scene's visible text (first 200 chars; --no-text hides it, --full shows all).
//
// Options: --look <id> (draw with that LookProfile; default the bundle's)  --bundle <id|dir>  --beats N  --theme dark|light (default dark)  --portrait
//          --real-time (use the real clock; default is a controlled clock, so wait/until run
//          instantly and setTimeout-driven scenes are deterministic)  --inputs  --no-text  --full
// Output: the first failure and its step index are printed FIRST; output over about 2000 chars is cut to the key
// lines and the full dump goes to build/scratch/<Scene>-drive.log (its path is printed). Before the browser starts the
// steps are pre-checked for shapes that always fail (a regex as a probe expect, a quoted empty string).
// Probe budget: at most 3 runs with an expect/probe per scene (build/scratch/<Scene>.drive-runs); the 4th prints
// STOP and exits 1 (record `open:` in the design note and move on).
// Exit 1 if any expect fails, a step could not run, or the page threw. Ends with PASS/FAIL.
//
// The expect logic is shared with drive.mjs (tools/sim-test/lib/expect.mjs). A failing expect prints "visible now:" (the scene's readable text) and "closest:" (the most similar line);
// expect [sel, pattern] prints what sel actually holds. Plain-text matching ignores runs of whitespace
// (nbsp, narrow nbsp, thin space too) and treats U+2212 / U+2013 / U+2012 as ASCII "-"; case still matters.
// A malformed step is refused with one line naming its index; the other steps still run.
//
// Write one steps file for ALL the checks of a scene and fix every mismatch it prints in one batch of edits, then re-run once.
//
// Worked example (steps.json, 10 steps, run with --steps=@steps.json):
//   [{"beat":0},
//    {"set":["#len",1.2]},
//    {"click":"button:has-text(\"Run\")"},
//    {"until":"idle"},
//    {"read":"#f"},
//    {"expect":"Force on the block"},
//    {"expect":["#f","/85\\.7 N/"]},
//    {"probe":"sc.busy()","expect":false},
//    {"expect":"Run","not":true},
//    {"inputs":true}]
//   step  what it does
//   1     beat 0: the host's onBeatChange(0, beats)
//   2     set the #len input to 1.2 with real input + change events
//   3     click the button whose text is Run
//   4     let time pass until the scene is idle (busy() false, no timers pending)
//   5     print the text of #f
//   6     FAIL unless the learner can read "Force on the block" anywhere in the scene
//   7     FAIL unless the text inside #f matches the regex 85.7 N
//   8     evaluate sc.busy() in the page and FAIL unless it is false
//   9     FAIL if "Run" is still readable anywhere (not inverts the expect)
//   10    list the operable controls again
//
// Common mistakes:
//   1. The steps must be a JSON array [ ... ], not an object { ... }.
//   2. expect "text" looks at everything the learner can read; expect [sel, pattern] only inside sel.
//   3. Text at opacity 0 or display:none is not readable: wait or use until idle before expecting an end-state reading.
//   4. A regex goes between slashes inside the string: "/85\\.7 N/" (double backslash in JSON).
//   5. A set on a control that does not exist is skipped and reported: check --inputs for the real selectors first.
import fs from 'node:fs';
import path from 'node:path';
import { serve, rootFor, playwright } from './lib/serve.mjs';
import { scratchFor, bundleFromArg, resolveTarget, describeMiss, attachersOf, rel, KIT_ROOT } from './lib/bundle.mjs';
import { checkFlags, parseSteps } from './lib/args.mjs';
import { bundleProfile } from '../staged-generation/lib/bundleProfile.mjs';
import { getDeclaredBeatCount } from '../beat-check/parseBeatStepMap.mjs';
import { domSet, domClick, multiMatch, precheckSteps, runCounter } from './lib/domsteps.mjs';
import { judgeText, judgeSel, judgeProbe, badStep as badExpect, pageHelpers } from './lib/expect.mjs';

const args = process.argv.slice(2);
const val = (k) => {
  const eq = args.find((a) => a.startsWith(`--${k}=`));
  if (eq) return eq.slice(k.length + 3);
  const i = args.indexOf(`--${k}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : null;
};
const has = (k) => args.includes(`--${k}`);
checkFlags(args, { tool: 'drive-dom', file: import.meta.url, usage: 'node tools/sim-test/drive-dom.mjs <L0N/Scene | Scene | path> [--bundle <id|dir>] --steps=JSON|@file | --inputs [--beats N] [--theme dark|light] [--portrait] [--real-time] [--no-text] [--full] [--look id]',
  val: ['bundle', 'beats', 'theme', 'steps', 'look'], bool: ['inputs', 'portrait', 'real-time', 'no-text', 'full', 'more'] });
const valued = new Set(['--bundle', '--beats', '--theme', '--steps', '--look']);
const target = args.find((a, i) => !a.startsWith('--') && !valued.has(args[i - 1]));
if (!target || (!val('steps') && !has('inputs'))) {
  console.error('usage: node tools/sim-test/drive-dom.mjs <scene> [--bundle <id|dir>] --steps=\'[{"beat":0},{"set":["#len",1.2]},{"click":"button:has-text(\\"Run\\")"},{"until":"idle"}]\' [--inputs] [--beats N] [--theme dark|light] [--portrait] [--real-time] [--no-text] [--full] [--look id]');
  process.exit(2);
}

const bundleDir = bundleFromArg(val('bundle'));
const t = target.endsWith('.js') && fs.existsSync(target) ? { kind: 'scene', file: path.resolve(target), bundle: bundleDir } : resolveTarget(target, bundleDir);
if (!t || t.kind !== 'scene' || !fs.existsSync(t.file)) { console.error(t && t.kind === 'folder' ? `${target} is a lesson folder: name one scene (L0N/Scene)` : t ? `${target} resolves to ${t.file}, which does not exist yet (only the stub)` : describeMiss(target, bundleDir)); process.exit(2); }
const bundleLook = (() => { const B = bundleDir || t.bundle; if (!B || typeof B !== 'string') return null; const l = bundleProfile(path.dirname(path.dirname(B)), path.basename(B)).look; return l === 'quill' ? null : l; })();
const lookId = val('look') || bundleLook;
const lookQ = lookId ? `&look=${encodeURIComponent(lookId)}` : '';
const file = t.file;
const src = fs.readFileSync(file, 'utf8');
let beats = Number(val('beats')) || 0;
if (!beats && t.bundle) {
  const counts = attachersOf(t.bundle, file).map((a) => a.beats).filter((n) => n);
  if (counts.length) beats = counts[0];
}
if (!beats) beats = getDeclaredBeatCount(src) || (src.match(/BEAT_STEP_MAP\s*=\s*\[([\s\S]*?)\n\];/)?.[1].match(/^\s*\[\s*\{/gm) || []).length || 1;

const steps = val('steps') ? parseSteps(val('steps'), 'drive-dom') : [{ inputs: true }];
for (const h of precheckSteps(steps)) console.error(`hint: ${h}`);
// Probe budget (only runs that check something count; a smoke run of {"beat":0} does not).
const scratch = scratchFor(file);
const sceneBase = path.basename(file, '.js');
if (val('steps')) {
  const rc = runCounter(path.join(scratch, `${sceneBase}.drive-runs`), { cap: 3, more: has('more'), counted: steps.some((s) => s && (s.expect !== undefined || s.probe !== undefined)) });
  if (rc.stop) { console.error(`STOP: probe cap 3 reached (run ${rc.n}); record open: in the design note and move on`); process.exit(1); }
}
// Buffer the output: the first failure goes on top, and a long dump is cut (full text in build/scratch/<Scene>-drive.log).
const LOG = [];
const rawLog = console.log;
console.log = (...a) => { LOG.push(a.join(' ')); };
let curIdx = 0, firstFail = null;
const pw = playwright();
if (!pw) { console.error('drive-dom needs Playwright (npm i -g playwright && npx playwright install chromium)'); process.exit(2); }

const rootDir = rootFor(file);
const { server, origin } = await serve(rootDir);
const browser = await pw.chromium.launch();
const errors = [];
let fails = 0, ran = 0;
const FAIL = (m) => { fails++; if (!firstFail) firstFail = { idx: curIdx, m }; console.log(`FAIL: ${m}`); };
const OK = (m) => console.log(`ok: ${m}`);

const theme = val('theme') || 'dark';
const page = await browser.newPage({ viewport: { width: 900, height: 1100 } });
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/404|favicon/.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });
await page.addInitScript((th) => {
  const set = () => document.documentElement && (document.documentElement.dataset.theme = th);
  set(); document.addEventListener('readystatechange', set);
}, theme);
const fast = !has('real-time');
if (fast) await page.clock.install();
// Count pending setTimeouts (installed after the clock, so it wraps the fake one): a DOM scene
// often runs from a chain of timeouts while busy() stays false, so "idle" must see them too.
await page.addInitScript(() => {
  const st = window.setTimeout.bind(window), ct = window.clearTimeout.bind(window);
  window.__pend = new Set();
  window.setTimeout = (f, ms, ...a) => { let id; id = st((...x) => { window.__pend.delete(id); return typeof f === 'function' ? f(...x) : undefined; }, ms, ...a); if (!(ms > 60000)) window.__pend.add(id); return id; };
  window.clearTimeout = (id) => { window.__pend.delete(id); return ct(id); };
});
const portrait = has('portrait');
const simUrl = '/' + rel(rootDir, file);
await page.goto(`${origin}/__kit/preview-harness.html?sim=${encodeURIComponent(simUrl)}&beats=${beats}&hostw=${portrait ? 380 : 680}${portrait ? '&portrait=1' : ''}${lookQ}`);

// Time: with the controlled clock, runFor() fires every timer and animation frame due in that span.
const pass = async (ms) => { if (fast) await page.clock.runFor(ms); else await page.waitForTimeout(ms); };
let ready = false;
for (let i = 0; i < 150 && !ready; i++) {
  ready = await page.evaluate(() => window.__ready === true).catch(() => false);
  if (!ready) { if (errors.length && i > 5) break; await (fast ? page.clock.runFor(100) : page.waitForTimeout(100)); await new Promise((r) => setTimeout(r, 20)); }
}
if (!ready) { rawLog(`FAIL - harness never became ready\n${errors.slice(0, 5).join('\n')}`); await browser.close(); server.close(); process.exit(1); }

const sceneName = path.basename(file, '.js');
console.log(`${sceneName}: ${beats} beat(s), ${theme}${portrait ? ', portrait' : ''}, ${fast ? 'controlled clock' : 'real clock'}`);

// What a learner can actually read: text under display:none, visibility:hidden, `hidden` or opacity ~0 is left out
// (innerText keeps opacity:0 text, which made a collapsed board look as if its old labels were still on screen).
await page.evaluate(() => {
  window.__vis = (root) => {
    const parts = [];
    const walk = (n) => {
      if (n.nodeType === 3) { const t = n.textContent.trim(); if (t) parts.push(t); return; }
      if (n.nodeType !== 1 || /^(STYLE|SCRIPT|NOSCRIPT)$/.test(n.tagName)) return;
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || n.hidden || parseFloat(cs.opacity) < 0.05) return;
      for (const c of n.childNodes) walk(c);
    };
    walk(root);
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  };
});
await page.evaluate(pageHelpers);
const snapshot = () => page.evaluate(() => {
  const sc = window.__scene;
  const root = sc?.root || document.querySelector('#sim-host');
  return { busy: !!sc?.busy?.(), text: window.__vis(root) };
});
const say = async (label) => {
  const s = await snapshot();
  const shown = has('no-text') ? '' : `  text: ${has('full') ? s.text : s.text.slice(0, 200)}`;
  console.log(`${label.padEnd(30)} busy=${s.busy}${shown}`);
};

const listInputs = () => page.evaluate(() => {
  const root = document.querySelector('#sim-host') || document.body;
  const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const name = (e) => e.id ? `#${e.id}` : (e.getAttribute('aria-label') ? `[aria-label="${e.getAttribute('aria-label')}"]` : (e.getAttribute('data-id') ? `[data-id="${e.getAttribute('data-id')}"]` : ''));
  const out = [];
  for (const e of [...root.querySelectorAll('input, select, textarea, button, [role=button], [role=slider], [data-act], [data-action]'), ...document.querySelectorAll('#controls button, #controls input, #controls select')]) {
    if (!vis(e)) continue;
    const tag = e.tagName.toLowerCase();
    const inBar = !!e.closest('#controls');
    const label = (e.getAttribute('aria-label') || e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30);
    let d = tag;
    if (tag === 'input') d = e.type === 'range' || e.type === 'number' ? `${e.type} ${e.min}..${e.max} step ${e.step || 1} =${e.value}` : `${e.type}${e.type === 'checkbox' || e.type === 'radio' ? (e.checked ? ' on' : ' off') : ` =${e.value}`}`;
    else if (tag === 'select') d = `select [${[...e.options].map((o) => o.value === o.textContent ? o.value : `${o.value}:${o.textContent}`).join(' | ')}] =${e.value}`;
    else if (label) d = `${tag} "${label}"`;
    out.push(`${inBar ? '#controls ' : ''}${name(e) || `${tag}${label ? ` >> text=${label}` : ''}`}  (${d}${e.disabled ? ', DISABLED' : ''})`);
  }
  // A CONTROLS bar entry is driven by its id, not by a selector: {"ctrl":["<id>","<value>"]} works for any type.
  const sc = window.__scene;
  for (const c of (sc && sc.constructor.CONTROLS) || []) {
    const lab = c.label && typeof c.label === 'object' ? c.label.en : c.label;
    out.push(`{"ctrl":["${c.id}","<value>"]}  (${c.type} control${lab ? ` "${String(lab).slice(0, 30)}"` : ''}${sc.isControlHidden?.(c.id) ? ', hidden on this beat' : ''})`);
  }
  return out;
});

const KEYS = new Set(['beat', 'set', 'click', 'ctrl', 'wait', 'until', 'read', 'expect', 'not', 'probe', 'inputs', 'name']);
// null when the step is well formed, else a one-line refusal (step index is added by the caller).
function badStep(s) {
  const bad = badExpect(s, { keys: KEYS, selectors: true });
  if (bad) return bad;
  for (const k of ['set', 'ctrl']) if (s[k] !== undefined && !(Array.isArray(s[k]) && s[k].length === 2 && typeof s[k][0] === 'string')) return `${k} got ${JSON.stringify(s[k])}; valid form: {"${k}":["${k === 'set' ? 'selector' : 'id'}", value]}`;
  return null;
}

async function step(s, idx) {
  const bad = badStep(s);
  if (bad) { ran++; curIdx = idx; return FAIL(`step ${idx}: ${bad}`); }
  ran++; curIdx = idx;
  if (s.beat != null) {
    await page.evaluate(([b, n]) => { window.__scene.onBeatChange?.(b, n); window.__scene.requestUiUpdate?.(); }, [s.beat, beats]);
    await pass(100);
    return say(`beat ${s.beat}`);
  }
  if (s.set) {
    const r = await domSet(page, s.set[0], s.set[1]);
    if (r.fail) { FAIL(`${r.fail}${/no such element/.test(r.fail) ? ' (run with --inputs to list them)' : ''}`); return /DISABLED/.test(r.fail) ? say(`set ${s.set[0]} (skipped)`) : undefined; }
    await pass(50);
    return say(`set ${s.set[0]}=${s.set[1]} (was ${r.before})`);
  }
  if (s.click) {
    const r = await domClick(page, s.click);
    if (r.fail) { FAIL(`${r.fail}${/no such element/.test(r.fail) ? ' (run with --inputs to list them)' : ''}`); return /DISABLED/.test(r.fail) ? say(`click ${s.click} (skipped)`) : undefined; }
    if (r.warn) console.log(r.warn);
    await pass(50);
    return say(`click ${s.click}`);
  }
  if (s.ctrl) {
    const [id, v] = s.ctrl;
    const r = await page.evaluate(([cid, val]) => {
      const sc = window.__scene;
      const c = (sc.constructor.CONTROLS || []).find((x) => x.id === cid);
      if (!c) return { bad: `no CONTROLS entry "${cid}"` };
      if (sc.isControlHidden?.(cid)) return { bad: `"${cid}" is hidden on this beat` };
      if (sc.isControlDisabled?.(cid)) return { bad: `"${cid}" is disabled` };
      const bool = c.type === 'toggle' || c.type === 'checkbox';
      sc.onControlChange(cid, c.type === 'button' ? true : bool ? !!val : String(val));
      sc.requestUiUpdate?.();
      return {};
    }, [id, v]);
    await pass(50);
    if (r.bad) return FAIL(`ctrl ${id}: ${r.bad}`);
    return say(`ctrl ${id}=${v}`);
  }
  if (s.wait != null) { await pass(Number(s.wait)); return say(`wait ${s.wait}ms`); }
  if (s.until === 'idle') {
    // Idle = busy() false for a quiet 400 ms in a row: a scene often starts its run from a short
    // setTimeout, so busy() is briefly false right after a click.
    let ms = 0, quiet = 0;
    for (; ms < 30000 && quiet < 8; ms += 50) {
      await pass(50);
      quiet = (await page.evaluate(() => !!window.__scene.busy?.() || window.__pend.size > 0)) ? 0 : quiet + 1;
    }
    if (quiet < 8) FAIL(`until idle: still busy() or waiting on ${await page.evaluate(() => window.__pend.size)} timer(s) after 30 s (a scene that re-arms a timeout forever never goes idle: use wait instead)`);
    return say(`-> idle after ${((ms - 400) / 1000).toFixed(2)}s`);
  }
  if (s.read) {
    const vals = await page.locator(s.read).evaluateAll((els) => els.slice(0, 5).map((e) => (e.matches('input,select,textarea') ? e.value : e.innerText).replace(/\s+/g, ' ').trim()));
    return console.log(`read ${s.read}: ${vals.length ? vals.map((x) => JSON.stringify(x.slice(0, 200))).join(' | ') : '(no match)'}`);
  }
  if (typeof s.expect === 'string' && s.probe === undefined) {
    // {"expect": "text"} or "/regex/": what the learner can read anywhere in the scene right now.
    const { text } = await snapshot();
    const r = judgeText(text, s);
    if (r.ok) return OK(r.msg);
    FAIL(r.msg);
    for (const l of r.detail) console.log(l);
    return;
  }
  if (s.expect && Array.isArray(s.expect) && s.probe === undefined) {
    const [sel] = s.expect;
    const mm = await multiMatch(page, sel).catch(() => null);
    if (mm) console.log(mm);
    const loc = page.locator(sel).first();
    if (!(await loc.count())) return FAIL(`expect ${sel}: no element matches ${sel}`);
    const got = (await loc.evaluate((e) => (e.matches('input,select,textarea') ? e.value : e.innerText))).replace(/\s+/g, ' ').trim();
    const r = judgeSel(got, sel, s);
    return r.ok ? OK(r.msg) : FAIL(r.msg);
  }
  if (s.probe !== undefined) {
    const r = await page.evaluate(([js]) => { try { const body = (j) => { const t = j.trim().replace(/;+$/, ''); if (/\breturn\b/.test(t)) return t; const i = t.lastIndexOf(';'); return i < 0 ? `return (${t})` : `${t.slice(0, i + 1)} return (${t.slice(i + 1)});`; }; let f; try { f = new Function('sc', 'root', 'd', `return (${js});`); } catch (e1) { f = new Function('sc', 'root', 'd', body(js)); } return { v: f(window.__scene, window.__scene.root, window.__d) }; } catch (e) { return { err: String(e.message) }; } }, [s.probe]);
    if (r.err) return FAIL(`probe ${s.probe}: ${r.err}`);
    console.log(`probe ${s.probe} = ${JSON.stringify(r.v)}`);
    if ('expect' in s) {
      const j = judgeProbe(r.v, s);
      if (j.ok) return OK(j.msg);
      FAIL(j.msg);
      const f = r.v === undefined && /\bsc\.([A-Za-z_$][\w$]*)/.exec(s.probe);
      if (f && !(await page.evaluate((k) => k in window.__scene, f[1]))) console.log(f[1] === 'stage' && await page.evaluate(() => 'stepIndex' in window.__scene) ? 'hint: a DomSimulation has no sc.stage; read sc.stepIndex (the current step)' : `hint: scene has no field ${f[1]}; single-beat scene? drop the stage row`);
      return;
    }
    return;
  }
  if (s.inputs) { const l = await listInputs(); console.log(`inputs (${l.length}):\n  ${l.join('\n  ') || '(none visible)'}`); return; }
  if (Object.keys(s).every((k) => k === 'name')) return;
  FAIL(`step ${idx}: unknown step ${JSON.stringify(s)}. One key per step: {"beat":1} {"set":["#id",1.2]} {"click":"button:has-text(\\"Run\\")"} {"ctrl":["id","v"]} {"wait":500} {"until":"idle"} {"read":"#sel"} {"expect":"text"} {"expect":["#sel","/re/"]} {"probe":"js","expect":true} {"inputs":true}`);
}

if (has('inputs') && !val('steps')) { const l = await listInputs(); console.log(`inputs (${l.length}, start beat only; for a later beat add {"beat":N},{"inputs":true} to --steps):\n  ${l.join('\n  ') || '(none visible)'}`); }
else {
  await say('start');
  const l0 = await listInputs();
  console.log(`inputs (${l0.length}) at start; add {"inputs":true} to list them again`);
  for (const [i, s] of steps.entries()) { try { await step(s, i + 1); } catch (e) { FAIL(`step ${i + 1} ${JSON.stringify(s)}: ${String(e.message).split('\n')[0]}`); } }
}
curIdx = 0;
for (const e of [...new Set(errors)].slice(0, 6)) FAIL(`page error: ${e}`);
console.log(fails ? `FAIL - ${fails} problem(s) in ${ran} step(s)` : `PASS - ${ran} step(s), no problems`);
console.log = rawLog;
{
  const full = LOG.join('\n');
  const top = firstFail ? `FIRST FAIL (${firstFail.idx ? `step ${firstFail.idx}` : 'after the steps'}): ${firstFail.m.slice(0, 300)}\n` : '';
  if (top.length + full.length <= 2000) console.log(top + full);
  else {
    let logPath = '';
    try { fs.mkdirSync(scratch, { recursive: true }); logPath = path.join(scratch, `${sceneBase}-drive.log`); fs.writeFileSync(logPath, full + '\n'); } catch { /* no dump */ }
    const key = LOG.filter((l) => /^(FAIL|WARN|hint|\s+visible now|\s+closest|PASS)/.test(l)).map((l) => l.slice(0, 260));
    let out = top + `${LOG[0] || ''}\n`;
    for (const l of key) { if (out.length + l.length > 1800 && !/^(FAIL -|PASS -)/.test(l)) continue; out += l + '\n'; }
    console.log(out + `(output cut; ${full.length} chars in full: ${logPath ? path.relative(process.cwd(), logPath) : 'not saved'})`);
  }
}
await browser.close();
server.close();
process.exit(fails ? 1 : 0);
