// resume-probe - is every beat the same however the learner got there?
//
//   node tools/sim-test/run.mjs exec tools/sim-test/resume-probe.mjs <scene.js> [beats]
//
// The host may mount a scene straight onto beat j (a resumed lesson), and a
// learner may flip beats while a run is still going. For each beat j >= 1, the
// model after settling is compared across three ways of arriving:
//   direct  mount at j (what a resumed lesson does)
//   fast    walk 0..j with 0.3 s per beat (runs started by enter() cut short)
//   slow    walk 0..j with 12 s per beat (every run finishes where it started)
// A difference is a LEAK: beat j depends on how long earlier beats were
// watched - typically a run launched on beat i finishes on beat j and is
// credited to the current stage. Fix: credit runs to a token taken at launch
// ({ stage: this.stage, ... }) and use this.after() (dropped on a stage change),
// or reset what enter() owns. A deliberate difference is listed on the scene's
// design note as `Resume-ignore: <regex of field paths>` (check-scene passes it
// on as RESUME_IGNORE).
//   act     walk to j-1, press each control on offer there, 0.3 s later go to j
//           -> "differs" lines are information: fine when the scene deliberately
//              keeps the learner's results across beats.
// Compared after 30 s with the loop forced awake, and Math.random reseeded just
// before the final beat change. Skips CONTINUOUS = true and DOM scenes.
import path from 'node:path';
import { snap, diff, seeded, loadScene, ownContinuous, mount, pump, actionsAt } from './lib/probe.mjs';

const argv = process.argv.slice(2);
const file = path.resolve(argv.find((a) => !a.startsWith('--') && !/^\d+$/.test(a)) || '');
const S = await loadScene(file);
const own = ownContinuous(S);
const beats = Number(argv.find((a) => /^\d+$/.test(a))) || S.BEAT_STEP_MAP?.length || 1;
const IGNORE = process.env.RESUME_IGNORE ? new RegExp(process.env.RESUME_IGNORE) : null;
const name = path.basename(file, '.js');

if (own === true || (own === undefined && S.CONTINUOUS === true)) { console.log(`## ${name}: skip - CONTINUOUS = true never settles`); process.exit(0); }
if (beats < 2) { console.log(`## ${name}: skip - one beat`); process.exit(0); }

async function settleAt(j, before) {
  const sc = await mount(S, { force: true, own });
  if (!sc._ctx) return null;
  sc.start();
  if (before) await before(sc);
  Math.random = seeded(777);
  sc.onBeatChange?.(j, beats);
  pump(30000);
  const s = snap(sc);
  sc.stop?.();
  return s;
}

const rows = [];
let leaks = 0, warns = 0;
for (let j = 1; j < beats; j++) {
  const direct = await settleAt(j, null);
  if (!direct) { console.log(`## ${name}: skip - no canvas (DOM scene)`); process.exit(0); }
  const walk = (dwell) => (sc) => { for (let i = 0; i < j; i++) { sc.onBeatChange?.(i, beats); pump(dwell); } };
  const fast = await settleAt(j, walk(300));
  const slow = await settleAt(j, walk(12000));
  const d = diff(direct, slow, IGNORE);
  const f = d.length ? [] : diff(direct, fast, IGNORE);
  if (d.length) { leaks++; rows.push(`b${j} LEAK (direct vs slow walk): ${d.join('; ')}`); }
  else if (f.length) { leaks++; rows.push(`b${j} LEAK (direct vs fast walk): ${f.join('; ')}`); }
  for (const [label, act] of await actionsAt(S, j - 1, beats)) {
    const acted = await settleAt(j, (sc) => {
      for (let i = 0; i < j; i++) { sc.onBeatChange?.(i, beats); pump(i === j - 1 ? 1500 : 300); }
      act(sc); pump(300);
    });
    const e = diff(direct, acted, IGNORE);
    if (e.length) { warns++; rows.push(`b${j} after '${label}' on b${j - 1}: differs ${e.join('; ')}`); }
  }
}
console.log(`## ${name}: ${leaks} leak(s), ${warns} carried-state difference(s)`);
for (const r of rows) console.log('  ' + r);
