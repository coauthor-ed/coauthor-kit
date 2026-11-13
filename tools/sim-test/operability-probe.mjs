// operability-probe - does what the scene offers actually change what is drawn?
//
//   node tools/sim-test/run.mjs exec tools/sim-test/operability-probe.mjs <scene.js> [beats]
//
// Canvas scenes only (a DOM scene is skipped). Draws are compared as the list of
// shape calls (method + rounded numbers; text excluded, so a changed caption
// alone does not count as a changed picture).
//   DUP-BEAT   beat i+1 draws exactly what beat i drew after settling: a beat
//              the learner steps into and sees nothing new (WARN).
//   NO-EFFECT  a visible select / segmented / toggle / slider control, changed
//              on a beat, leaves the picture identical (WARN). Buttons are not
//              checked (a button may rightly do nothing in the start state).
//   UNDRAWABLE a select / segmented option that is not the declared value and
//              whose value is falsy or missing a label (cannot be shown) (WARN).
//   PREDICT-LEAK  with --predict (a poe-predict block mounts this scene): the setup mount,
//              onBeatChange(MAX_SAFE_INTEGER, MAX_SAFE_INTEGER) as simulationHost sends it, draws
//              the last lesson beat's picture and not the first's: the prompt shows the answer (WARN).
// Output: one `## name: ...` head, then `  b<N> KIND detail` rows.
import path from 'node:path';
import { installFakeHost, createDrawCtx, makeContainer, pumpFrame } from './harness.mjs';
import { loadScene, seeded, ownContinuous } from './lib/probe.mjs';

const argv = process.argv.slice(2);
const file = path.resolve(argv.find((a) => !a.startsWith('--') && !/^\d+$/.test(a)) || '');
const S = await loadScene(file);
const own = ownContinuous(S);
const beats = Number(argv.find((a) => /^\d+$/.test(a))) || S.BEAT_STEP_MAP?.length || 1;
const name = path.basename(file, '.js');

let cur = null;   // the scene being driven: its recorded draw calls are dropped frame by frame (a crowd of figures is tens of thousands of calls
// per frame; keeping 9 s of them ran the probe out of memory), except in the final window that is compared (keep = true)
const pump = (ms, keep = false) => { for (let t = 0; t < ms; t += 16.7) { pumpFrame(16.7); if (!keep && cur?._ctx?._calls) cur._ctx._calls.length = 0; } };
const round = (v) => (typeof v === 'number' ? Math.round(v * 10) / 10 : typeof v === 'string' || typeof v === 'boolean' ? v : '~');

async function mountAt(beat, action) {
  installFakeHost(createDrawCtx);
  Math.random = seeded(4242);
  S.CONTINUOUS = true;   // keep the loop awake so pump() always paints
  const sc = new S(makeContainer());
  cur = sc;
  sc.requestUiUpdate = () => {};
  sc.allowResume = true;
  await sc.setup();
  if (!sc._ctx) return null;
  sc.start();
  if (beat < 0) { sc.onBeatChange?.(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER); pump(9000); }
  else for (let i = 0; i <= beat; i++) { sc.onBeatChange?.(i, beats); pump(i === beat ? 9000 : 300); }
  if (action) { action(sc); pump(9000); }
  const calls = sc._ctx._calls;
  calls.length = 0;
  pump(50, true);
  const shape = calls.filter((c) => c.method !== 'fillText' && c.method !== 'strokeText' && c.method !== 'measureText')
    .map((c) => c.method + ':' + c.args.map((a) => (Array.isArray(a) ? a.length : round(a))).join(','));
  const ctls = [];
  for (const c of S.CONTROLS ?? []) if (!sc.isControlHidden?.(c.id) && !sc.isControlDisabled?.(c.id)) ctls.push(c);
  sc.stop?.();
  return { shape: shape.join('|'), ctls, sc };
}

const rows = [];
const first = await mountAt(0);
if (!first) { console.log(`## ${name}: skip - no canvas (DOM scene)`); process.exit(0); }

let prev = first;
for (let b = 0; b < beats; b++) {
  const cur = b === 0 ? first : await mountAt(b);
  if (b > 0 && cur.shape === prev.shape) rows.push(`b${b} DUP-BEAT draws exactly what beat ${b - 1} drew`);
  for (const c of cur.ctls) {
    let act = null, label = '';
    if (c.type === 'select' || c.type === 'segmented') {
      const was = cur.sc.getControlValue?.(c.id);
      // A plain-string option ("Low") is its own value and label.
      const opts = (c.options ?? []).map((x) => (typeof x === 'string' || typeof x === 'number' ? { value: x, label: String(x) } : x));
      for (const o of opts) {
        if (o.value === was) continue;
        if (o.value === undefined || o.value === '' || o.value === null || !o.label) rows.push(`b${b} UNDRAWABLE ${c.id} option ${JSON.stringify(o.value)} has no value or label`);
      }
      const o = opts.find((x) => x.value !== was);
      if (o) { act = (sc) => sc.onControlChange(c.id, o.value); label = `${c.id}=${o.value}`; }
    } else if (c.type === 'toggle' || c.type === 'checkbox') {
      act = (sc) => sc.onControlChange(c.id, !sc.getControlValue?.(c.id)); label = `${c.id}~`;
    } else if (c.type === 'slider' || c.type === 'range') {
      act = (sc) => sc.onControlChange(c.id, c.max); label = `${c.id}=max`;
    }
    if (!act) continue;
    const after = await mountAt(b, act);
    if (after && after.shape === cur.shape) rows.push(`b${b} NO-EFFECT ${label} leaves the picture unchanged`);
  }
  prev = cur;
}
if (argv.includes('--predict') && beats > 1) {
  const setup = await mountAt(-1);
  // Share of draw calls two pictures have in common: idle motion moves a few, so exact equality would miss a leak.
  const near = (x, y) => {
    const a = x.split('|'), left = new Map();
    for (const k of a) left.set(k, (left.get(k) ?? 0) + 1);
    const b = y.split('|');
    let same = 0;
    for (const k of b) if (left.get(k) > 0) { left.set(k, left.get(k) - 1); same += 1; }
    return same / Math.max(a.length, b.length, 1);
  };
  const toLast = setup ? near(setup.shape, prev.shape) : 0, toFirst = setup ? near(setup.shape, first.shape) : 0;
  if (toLast >= 0.9 && toLast > toFirst + 0.01) rows.push(`b${beats - 1} PREDICT-LEAK the predict setup mount draws the last beat's picture, not the first, so the prompt shows the answer: map Number.MAX_SAFE_INTEGER in BEAT_MAPS to a blank stage`);
}
console.log(`## ${name}: ${rows.length} operability warning(s)`);
for (const r of rows) console.log('  ' + r);
