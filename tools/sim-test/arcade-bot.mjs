// arcade-bot - plays an Arcade*Scene headlessly and checks the run behaves.
//
//   node tools/sim-test/run.mjs exec tools/sim-test/arcade-bot.mjs <scene.js> [...] [--passive]
//
// Default bot: makes ONE deliberate mistake, then plays every item right (Catch: one
// wrong catch AND one dropped member, then right; both must be in the mix-ups). Checks:
// the run ends, is won, the mistake is in the mix-ups, the boss round ran, progress
// reached 100%, "play again" resets. --passive: never acts; checks the run ends on
// its own with the hearts gone (nothing hangs or loops for ever). check-scene runs
// neither; use this after a deck or archetype change. Reads each archetype's
// per-run state (scene.play), so it follows the engine in simulations/base/kit.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { installFakeHost, createLogicCtx, makeContainer, check, summary } from './harness.mjs';

const argv = process.argv.slice(2);
const passive = argv.includes('--passive');
const files = argv.filter((a) => !a.startsWith('--'));
if (!files.length) { console.error('usage: run.mjs exec tools/sim-test/arcade-bot.mjs <scene.js> [...] [--passive]'); process.exit(2); }
installFakeHost(createLogicCtx);

// Catch's two deliberate slips; cleared when their why card shows.
const spot = { wrong: 1, drop: 1 };

function act(sc, wrong) {
  const pl = sc.play;
  const K = sc.constructor.KIND;
  if (K === 'Spot it') {
    // Quill is moved straight to where the bot wants him; the scene's own tick decides the catch.
    const cur = pl.cur;
    if (!cur || pl.banner || pl.gulp) return false;
    const member = sc._isIn(cur.it, pl.target);
    const under = member ? !(spot.drop > 0 && sc.run.done >= 2) : spot.wrong > 0;
    const x = under ? cur.x : (cur.x > 340 ? 60 : 620);
    pl.q.x = pl.q.tx = x;
    return false;
  }
  if (K === 'Catch and sort') {
    if (!pl.cur || pl.fly) return false;
    const i = pl.bins.findIndex((b) => [].concat(pl.cur.item.is).includes(b.g.id) !== wrong);
    sc.onHit('bin', i); return true;
  }
  if (K === 'Run the key') {
    if (!pl.cur || !pl.gate || pl.gate.hit || pl.gate.botSet) return false;
    pl.gate.botSet = true;
    const fork = pl.cur.forks[pl.cur.fi];
    const right = fork.yes ? pl.gate.yesSide : 1 - pl.gate.yesSide;
    pl.lane = wrong ? 1 - right : right; return false;   // resolves when the gate arrives
  }
  if (K === 'Match it') {
    const s = pl.shots.find((q) => !q.leaving && q.right !== wrong);
    if (!s || !pl.cur) return false;
    sc.onHit('shot', s.id); return true;
  }
  if (K === 'In order') {
    if (!pl.seq) return false;
    const want = pl.placed.length;
    const p = pl.pieces.find((q) => (q.order === want) !== wrong && q.age > 0.3);
    if (!p) return false;
    sc.onHit('piece', p.id); return true;
  }
  if (K === 'True or false') {
    if (!pl.cur || pl.out) return false;
    sc._call(wrong ? !pl.cur.s.truth : pl.cur.s.truth, 340, 250); return true;
  }
  return false;
}

for (const file of files) {
  const mod = await import(pathToFileURL(path.resolve(file)).href);
  const S = Object.values(mod).find((v) => typeof v === 'function' && typeof v.prototype?.startRun === 'function');
  const n = path.basename(file, '.js');
  if (!S) { check(false, `${n}: no Arcade scene class exported`); continue; }
  const sc = new S(makeContainer());
  sc.requestUiUpdate = () => {};
  await sc.setup();
  const ctx = sc._ctx;
  sc.startRun();
  let wrongLeft = 1, frames = 0, sawBoss = false;
  const isSpot = sc.constructor.KIND === 'Spot it';
  spot.wrong = 1; spot.drop = 1;
  const tick = (s) => { for (let t = 0; t < s; t += 0.02) sc._tick(ctx, 0.02); };
  while (sc.phase !== 'end' && frames < 20000) {
    frames++;
    if (sc.phase === 'why') {
      if (isSpot) { if (sc.run.why.lostLife) spot.drop = 0; else spot.wrong = 0; }
      tick(0.9); sc.pointerDown({ x: 5, y: 500 }); continue;
    }
    if (isSpot && passive && sc.play) sc.play.q.x = sc.play.q.tx = 60;
    if (sc.phase === 'play' && !passive) {
      const did = act(sc, wrongLeft > 0);
      if (did && wrongLeft > 0) wrongLeft--;
      if (!did && sc.constructor.KIND === 'Run the key' && wrongLeft > 0 && sc.play.lane >= 0) wrongLeft--;
    }
    sawBoss = sawBoss || sc.run.bossOn;
    tick(0.3);
  }
  const r = sc.run;
  check(sc.phase === 'end', `${n}: run ends (${frames} steps)`);
  if (passive) {
    check(!r.won && r.lives <= 0, `${n}: passive play runs out of hearts (${r.lives})`);
  } else {
    check(r.won, sc.cfg.relaxed || r.lives === Infinity ? `${n}: won, no hearts (relaxed)` : `${n}: won with ${r.lives} heart(s)`);
    check(r.mixups.length >= (isSpot ? 2 : 1), isSpot ? `${n}: the wrong catch and the dropped member are in the mix-ups (${r.mixups.length})` : `${n}: the deliberate mistake is in the mix-ups (${r.mixups.length})`);
    check(sawBoss || sc.cfg.boss === false, sc.cfg.boss === false ? `${n}: boss round: off (as configured)` : `${n}: a boss round ran`);
    const requeued = r.repeats ? [...r.repeats.values()].reduce((a, b) => a + b, 0) : 0;
    check(r.done >= r.total, requeued ? `${n}: progress ${r.done}/${r.total} (${requeued} requeued)` : `${n}: progress complete ${r.done}/${r.total}`);
  }
  sc.draw(ctx, sc.colors, 1);
  if (!passive) { sc.startRun(); check(sc.phase === 'play' && sc.run.score === 0, `${n}: play again resets`); }
  sc.destroy?.();
}
process.exit(summary());
