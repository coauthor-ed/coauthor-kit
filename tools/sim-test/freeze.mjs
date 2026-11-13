// freeze - does a scene freeze mid-motion when its frame loop parks?
//
//   node tools/sim-test/run.mjs exec tools/sim-test/freeze.mjs <scene.js> [beats] [--verbose]
//
// For each beat, and each control on offer at that beat (one button press, one
// other select option, a slider at max): run the scene as declared until its
// loop parks, snapshot its model; run a twin with CONTINUOUS forced true for
// 40 s; diff. A diff means the model was still moving when the loop parked:
// cover that run with busy() (SimScene) or animateFor(ms). check-scene.mjs runs
// this for you. FREEZE_IGNORE=<regex> skips decorative field paths
// (default: dots, flies, flicker).
import path from 'node:path';
import { snap, diff, loadScene, ownContinuous, mount, pump, actionsAt } from './lib/probe.mjs';

const argv = process.argv.slice(2);
const file = path.resolve(argv.find((a) => !a.startsWith('--') && !/^\d+$/.test(a)) || '');
const S = await loadScene(file);
const own = ownContinuous(S);
const beats = Number(argv.find((a) => /^\d+$/.test(a))) || S.BEAT_STEP_MAP?.length || 1;
const DECOR = new RegExp(process.env.FREEZE_IGNORE || '(^|\\.)(dots|flies|flicker)(\\.|$)');

async function run(force, b, action, horizonMs) {
  const sc = await mount(S, { force, own });
  if (!sc._ctx) return null;
  sc.start();
  for (let i = 0; i <= b; i++) { sc.onBeatChange?.(i, beats); pump(500); }
  if (action) action(sc);
  let parkedAt = null;
  for (let t = 0; t < horizonMs; t += 16.7) {
    const ran = pump(16.7);
    if (!ran && parkedAt == null) parkedAt = t;
  }
  const s = snap(sc);
  sc.stop?.();
  return { s, parkedAt };
}

const rows = [];
if (own === true || (own === undefined && S.CONTINUOUS === true)) {
  console.log(`## ${path.basename(file, '.js')} (CONTINUOUS=true): skip - the loop never parks by design`);
  process.exit(0);
}
for (let b = 0; b < beats; b++) {
  const probe = await run(true, b, null, 0);
  if (!probe) { console.log(`## ${path.basename(file, '.js')}: skip - no canvas (DOM scene)`); process.exit(0); }
  const actions = [['-', null], ...(await actionsAt(S, b, beats))];
  for (const [name, act] of actions) {
    const A = await run(false, b, act, 40000);
    if (A.parkedAt == null) { rows.push(`b${b} ${name}: never parks (something keeps busy() true or re-arms animateFor)`); continue; }
    const B = await run(true, b, act, 40000);
    const d = diff(A.s, B.s, DECOR);
    rows.push(`b${b} ${name}: parked ${(A.parkedAt / 1000).toFixed(1)}s ${d.length ? 'FROZE ' + d.join('; ') : 'ok'}`);
  }
}
console.log(`## ${path.basename(file, '.js')} (CONTINUOUS=${own === undefined ? 'false, inherited' : own})`);
for (const r of rows) console.log('  ' + r);
