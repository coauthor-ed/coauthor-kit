// Contract checks for the look kit (simulations/base/kit/SimScene.js + SimLook.js).
// Run: node tools/sim-test/run.mjs exec tools/sim-test/look-kit-check.mjs
//   1. after() fires on the scene clock, once, in its own stage.
//   2. after() from a previous stage never runs after enter() of a new one.
//   3. chipRow never overlaps, for any label length, with or without wrapAt.
//   4. The showcase scene's pour (a busy() run) finishes under the real,
//      parking rAF loop: no freeze mid-run, then the loop parks.
//   5. SimFigure: hinge side and no flip, reach clamp + warning, autoReach,
//      layer order (hands after `between`), determinism, stand height.
//   6. pill ink reads on its fill in both polarities.
//   7-14. text helpers, SimDraw, shape kits, props, pick, predict, geometry, trials, icons.
//   15. figureFor: role + pose -> sized spec; throws on an unknown role / pose.
//   16. drawFigureRow / drawCrowd / highlightFigures: 3, 12, 40 people at three widths,
//       faces never more than 30 percent covered, deterministic, 14 px floor.
//   17. Seated and cycling poses + chair / desk / bicycle anchors: contacts within 1 px.
//   18. SimAnimal: knees bend the right way, ground contact, no foot slip, determinism.
//   19. Animal icons.
//   20-24. Wave 0 fixes: full-canvas helpers paint the scene's own frame; wrapText x is the block's left edge;
//       areaGridCanvas label ink reads on its fill; drawCrowd caches its layout.
//   25. Engine type floor.
//   27. Watchdog kills a hung scene and prints the stack (exit 4).
//   28. Stage 3 pack builds per base class; log-stage3 replaces its bullet.
import { installFakeHost, createDrawCtx, makeContainer, pumpFrame, check, summary } from './harness.mjs';

installFakeHost(createDrawCtx);
const { SimScene } = await import('simulations/base/kit/SimScene.js');
const { chipRow } = await import('simulations/base/kit/SimLook.js');
const { LookKitShowcaseScene } = await import('../../examples/simulations/LookKitShowcaseScene.js');

const MAP3 = [[{ idx: 0 }], [{ idx: 1 }], [{ idx: 2 }]];
const tick = (scene, s) => { for (let t = 0; t < s; t += 0.02) scene._tick(scene._ctx, 0.02); };

// 1 + 2: after() and the stage epoch.
class AfterScene extends SimScene {
  static BEAT_STEP_MAP = MAP3;
  constructor(el) { super(el); this.fired = []; }
  enter(stage) { if (stage === 1) this.after(0.3, () => this.fired.push(`enter-${stage}`)); }
}
{
  const s = new AfterScene(makeContainer());
  await s.setup();
  s.onBeatChange(1, 3);
  tick(s, 0.5);
  check(s.fired.length === 1 && s.fired[0] === 'enter-1', `after() fires once in its own stage (got ${JSON.stringify(s.fired)})`);

  s.fired = [];
  s.onBeatChange(0, 3);
  s.onBeatChange(1, 3);       // schedules after(0.3) again
  tick(s, 0.1);
  s.onBeatChange(2, 3);       // leave before it is due
  tick(s, 1);
  check(s.fired.length === 0, `after() from a previous stage is dropped on enter() (got ${JSON.stringify(s.fired)})`);

  let ran = false;
  const cancel = s.after(0.1, () => { ran = true; });
  cancel();
  tick(s, 0.3);
  check(!ran, 'after() returns a working cancel function');

  const order = [];
  s.after(0.05, () => { order.push('a'); s.onBeatChange(0, 3); });
  s.after(0.05, () => order.push('b'));
  tick(s, 0.2);
  check(order.join('') === 'a', `a callback that changes stage drops same-frame siblings (got ${order.join('')})`);
  s.destroy();
}

// 3: chipRow never overlaps.
{
  const s = new AfterScene(makeContainer());
  await s.setup();
  const ctx = s._ctx;
  const words = ['a', 'mid', 'a much longer label here', 'x'.repeat(40), 'two words', 'W'];
  let bad = 0;
  for (const wrapAt of [undefined, 200, 400, 648]) {
    for (const align of ['left', 'center', 'right']) {
      for (let n = 1; n <= words.length; n++) {
        const items = words.slice(0, n).map((text) => ({ text, age: 0.1, at: 0 }));   // mid-pop (overshoot)
        const boxes = chipRow(ctx, s.colors, items, 340, 40, { wrapAt, align, gap: 8 });
        for (let i = 0; i < boxes.length; i++) {
          for (let j = i + 1; j < boxes.length; j++) {
            const a = boxes[i], b = boxes[j];
            if (a.x0 < b.x0 + b.w && b.x0 < a.x0 + a.w && a.y0 < b.y0 + b.h && b.y0 < a.y0 + a.h) bad++;
          }
        }
      }
    }
  }
  check(bad === 0, `chipRow boxes never intersect (${bad} overlapping pairs)`);
  s.destroy();
}

// 4: a pour under the real parking loop.
{
  const s = new LookKitShowcaseScene(makeContainer());
  await s.setup();
  s.start();
  s.onBeatChange(1, 3);
  for (let i = 0; i < 60; i++) pumpFrame();          // let the stage fade and the beat budget play out
  s.onControlChange('amount', 'lot');
  s.onControlChange('pour');
  let frames = 0;
  while (s.pour && frames < 2000) { pumpFrame(); frames++; }
  check(!s.pour && Math.abs(s.level - 0.85) < 1e-6, `pour finishes under the rAF loop (level ${s.level.toFixed(2)} after ${frames} frames)`);
  for (let i = 0; i < 120; i++) pumpFrame();          // past the wobble, the after() and SETTLE_MS
  check(s.verdict?.v === 'over', `after() delivered the captured run's verdict (got ${s.verdict?.v})`);
  // onControlChange grants an 8 s budget of its own; the loop must park after it.
  let more = 0;
  while (pumpFrame() && more < 2000) more++;
  check(more < 2000 && !pumpFrame(), `the loop parks once the run and its tail are over (${more} more frames)`);
  s.destroy();
}

// 5: SimFigure.
{
  const { ik2, solveFigure, drawFigure } = await import('simulations/base/kit/SimFigure.js');
  const { contrast, inkOn } = await import('simulations/base/kit/SimLook.js');
  // Hinge side: the joint is always on the side's half-plane, and a small target step never jumps it.
  let wrong = 0, jump = 0, prev = null;
  for (const side of [1, -1]) {
    prev = null;
    for (let a = -180; a <= 180; a += 0.5) {
      for (const k of [0.4, 0.8, 0.95]) {
        const tx = Math.sin((a * Math.PI) / 180) * 70 * k, ty = Math.cos((a * Math.PI) / 180) * 70 * k;
        const r = ik2(0, 0, tx, ty, 38, 36, side);
        const cross = tx * r.jy - ty * r.jx;          // > 0: joint on the (-uy, ux) side
        if (Math.sign(cross) !== side && Math.abs(cross) > 1e-6) wrong++;
        if (k === 0.8) { if (prev && Math.hypot(r.jx - prev.x, r.jy - prev.y) > 3) jump++; prev = { x: r.jx, y: r.jy }; }
      }
    }
  }
  check(wrong === 0 && jump === 0, `ik2 joint on its hinge side, never flips (${wrong} wrong, ${jump} jumps)`);
  // Reachable grip: exact. Unreachable (autoReach off): clamped with a hand-far warning.
  const base = { x: 200, y: 440, height: 170, facing: 1, pose: 'stand' };
  const ok = solveFigure({ ...base, hands: [{ x: 240, y: 330 }, null] });
  const h0 = ok.anchors.hand[0];
  check(Math.hypot(h0.x - 240, h0.y - 330) < 0.5 && !ok.warnings.length, `reachable grip lands exactly (${h0.x.toFixed(1)}, ${h0.y.toFixed(1)})`);
  const far = solveFigure({ ...base, hands: [{ x: 360, y: 300 }, null], autoReach: false });
  const w = far.warnings.find((x) => x.code === 'hand-far');
  check(!!w && w.over > 50, `unreachable grip is clamped and reported (${JSON.stringify(far.warnings)})`);
  // autoReach: a low grip is reached by crouching, not a stretched arm.
  const low = solveFigure({ ...base, hands: [{ x: 250, y: 410 }, null] });
  const h1 = low.anchors.hand[0];
  check(low.crouch > 0.2 && Math.hypot(h1.x - 250, h1.y - 410) < 0.5 && !low.warnings.length, `autoReach crouches to a low grip (crouch ${low.crouch.toFixed(2)})`);
  // Determinism and stand height.
  const a1 = JSON.stringify(solveFigure({ ...base, pose: { name: 'walk', phase: 0.3 } }).joints);
  const a2 = JSON.stringify(solveFigure({ ...base, pose: { name: 'walk', phase: 0.3 } }).joints);
  check(a1 === a2, 'same spec, same joints');
  for (const build of ['adult', 'teen', 'kid']) for (const facing of [1, 0]) {
    const top = solveFigure({ ...base, build, facing }).anchors.top.y;
    check(Math.abs(440 - top - 170) < 5, `${build} ${facing ? 'side' : 'front'} stands ${(440 - top).toFixed(1)} px for height 170`);
  }
  check(solveFigure({ ...base, height: 40 }).warnings.some((x) => x.code === 'tiny'), 'a 40 px figure warns tiny');
  // Layer order: the near hand is painted after the held object.
  const s = new AfterScene(makeContainer());
  await s.setup();
  const ctx = s._ctx;
  const n0 = ctx._calls?.length ?? 0;
  let at = -1;
  drawFigure(ctx, s.colors, { ...base, hands: [{ x: 240, y: 330 }, null] }, {}, { between: () => { at = ctx._calls.length; ctx.fillRect(0, 0, 1, 1); } });
  const after = ctx._calls.slice(at + 1).filter((q) => q.method === 'fill').length;
  check(at > n0 && after >= 3, `near arm and hand are painted after between() (${after} fills after it)`);
  // Chip ink contrast in both polarities.
  const dark = { bgDeep: '#0d0a22', label: '#fdfaff' }, light = { bgDeep: '#f3f0ff', label: '#241a4d' };
  const fills = ['#38bdf8', '#fbbf24', '#34d399', '#d97706', '#059669', '#0284c7', '#7c3aed'];
  const worst = Math.min(...fills.flatMap((f) => [dark, light].map((c) => contrast(f, inkOn(c, f)))));
  check(worst >= 3.5, `pill ink contrast >= 3.5 on series fills (worst ${worst.toFixed(2)})`);
  s.destroy();
}

// 7. Shared text / label helpers (floor, wrap, placement, leader clamp).
{
  const L = await import('simulations/base/kit/SimLook.js');
  const c = { ...{ bgDeep: '#0d0a22', bgSurface: '#181134', label: '#fdfaff', stroke: '#5b4f86', accent: '#57ccff' }, fontBody: 'sans-serif', fontDisplay: 'sans-serif' };
  const ctx = createDrawCtx();
  const w10 = L.chipSize(ctx, c, 'hello', 10), w14 = L.chipSize(ctx, c, 'hello', 14);
  check(w10.h === w14.h && w10.h === L.MIN_PX + 15, `chipSize raises 10px to the ${L.MIN_PX}px floor`);
  ctx.font = '700 15px sans-serif';
  const words = 'alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu';
  const lines = L.wrapLines(ctx, words, 120);
  check(lines.length > 1 && lines.join(' ') === words, `wrapLines breaks on words only (${lines.length} lines, nothing lost)`);
  const capped = L.wrapLines(ctx, words, 120, { maxLines: 2 });
  check(capped.length === 2 && capped[1].endsWith('...'), 'wrapLines maxLines ends in an ellipsis');
  const r = L.wrapText(ctx, words, 10, 10, 120);
  check(r.lines.length === lines.length && r.h > 0 && r.w <= 120 + 1, 'wrapText returns { lines, w, h }');
  const box = L.captionBar(ctx, c, words, 340, 20, { maxW: 300 });
  check(box.w <= 300 + 1 && box.h > 0, 'captionBar sizes to the wrapped text');
  const fit = L.fitText(ctx, c, words, 0, 0, 160, 40, { max: 20 });
  check(fit.size >= L.MIN_PX && fit.size <= 20, `fitText stays in 14..20 (got ${fit.size})`);
  const items = [1, 2, 3].map(() => ({ w: 60, h: 28, anchors: [[300, 100], [300, 100]] }));
  const placed = L.placeLabels(items, { frame: { x: 0, y: 0, w: 680, h: 520 } });
  const ov = (a, b) => a.x0 < b.x0 + b.w && b.x0 < a.x0 + a.w && a.y0 < b.y0 + b.h && b.y0 < a.y0 + a.h;
  check(!ov(placed[0], placed[1]) && placed[0].placed && placed[1].placed && !placed[2].placed, 'placeLabels: no overlap while room remains, then flags the fallback');
  const edge = L.placeLabels([{ w: 60, h: 28, anchors: [[-50, -50]] }])[0];
  check(edge.x0 >= 0 && edge.y0 >= 0, 'placeLabels clamps a fallback into the frame');
  const moves = [];
  const rec = createDrawCtx();
  const mt = rec.moveTo.bind(rec);
  rec.moveTo = (x, y) => { moves.push([x, y]); return mt(x, y); };
  L.leader(rec, -40, 900, 300, 200, '#ffffff', 1, 0);
  check(moves.length > 0 && moves[0][0] >= 0 && moves[0][1] <= L.H, 'leader clamps its start into the frame');
}

// 8. SimDraw: no hardcoded defaults, 14px floor, returns boxes.
{
  const { SimDraw } = await import('simulations/base/SimDrawUtils.js');
  const ctx = createDrawCtx();
  const b = SimDraw.drawLabel(ctx, 'x', 100, 100, { size: 9 });
  check(b && b.h >= 14 + 5 + 8, 'SimDraw.drawLabel returns a box at the 14px floor');
  check(typeof SimDraw.drawPanel(ctx, 0, 0, 10, 10).w === 'number', 'SimDraw.drawPanel returns its box');
  check(typeof SimDraw.clamp === 'function' && SimDraw.MIN_PX === 14, 'SimDraw re-exports the shared helpers');
}

// 9. Shape kits: one spec, two renderers (SVG + canvas).
{
  const S = await import('simulations/base/kit/SimNumberLine.js');
  const NS = await import('simulations/base/kit/SimNumberLineSpec.js');
  const NC = await import('simulations/base/kit/SimNumberLineCanvas.js');
  const CH = await import('simulations/base/kit/SimChart.js');
  const CS = await import('simulations/base/kit/SimChartSpec.js');
  const CC = await import('simulations/base/kit/SimChartCanvas.js');
  const L = await import('simulations/base/kit/SimLook.js');
  const c = { bgDeep: '#0d0a22', bgSurface: '#181134', label: '#fdfaff', labelMuted: '#b6abd8', stroke: '#5b4f86', accent: '#57ccff', good: '#54e6a5', bad: '#ff8f7a', warning: '#ffcf5c', s1: '#38bdf8', s2: '#fbbf24', fontBody: 'sans-serif', fontDisplay: 'sans-serif' };
  check(S.numberLine === NS.numberLine && CH.chartFrame === CS.chartFrame, 'SVG modules re-export the shared specs');
  const nl = NS.numberLine({ rect: { x: 0, y: 0, w: 648, h: 300 }, min: 0, max: 2, step: 1, minor: 4, labels: 'frac' });
  check(Math.abs(nl.v(nl.x(1.25)) - 1.25) < 1e-9 && nl.snap(nl.x(1.3)) === 1.25, 'number line scale round-trips and snaps');
  const sizes = [];
  const ctx = createDrawCtx();
  const setter = Object.getOwnPropertyDescriptor(ctx, 'font');
  let f = '';
  Object.defineProperty(ctx, 'font', { get: () => f, set: (v) => { f = v; const m = /(\d+(?:\.\d+)?)px/.exec(v); if (m) sizes.push(+m[1]); } });
  NC.numberLineCanvas(ctx, c, nl, { labelSize: 10 });
  const hit = NC.markerCanvas(ctx, c, nl, 1.25, { text: '1 1/4', grab: true });
  NC.hopCanvas(ctx, c, nl, 0, 1, { text: '+1' });
  NC.spanCanvas(ctx, c, nl, 0.5, 1.5, { text: 'span' });
  check(sizes.length > 0 && Math.min(...sizes) >= L.MIN_PX, `number-line canvas type never below ${L.MIN_PX}px (min ${Math.min(...sizes)})`);
  check(NC.hitMarker(hit, hit.x, hit.y) && !NC.hitMarker(hit, hit.x + 200, hit.y), 'markerCanvas hit test');
  const fr = CS.chartFrame({ rect: { x: 0, y: 0, w: 648, h: 360 }, x: { cats: ['a', 'b', 'c'] }, y: { min: 0, max: 10 } });
  sizes.length = 0;
  CC.axesCanvas(ctx, c, fr, { right: { min: 0, max: 100, label: 'pct' } });
  CC.barsCanvas(ctx, c, fr, [{ x: 0, v: 3 }, { x: 1, vs: [2, 4], tones: [1, 2] }], { grow: 0.5 });
  CC.barsCanvas(ctx, c, fr, [{ x: 2, v: 7, tone: 'good' }]);
  const fl = CS.chartFrame({ rect: { x: 0, y: 0, w: 648, h: 360 }, x: { min: 0, max: 12 }, y: { min: 0, max: 10 } });
  CC.traceCanvas(ctx, c, fl, [{ x: 0, y: 1 }, { x: 6, y: 5 }, { x: 12, y: 9 }], { draw: 0.7, target: 6, targetText: 'goal' });
  check(sizes.length > 0 && Math.min(...sizes) >= L.MIN_PX, `chart canvas type never below ${L.MIN_PX}px (min ${Math.min(...sizes)})`);
  const crowded = CS.chartFrame({ rect: { x: 0, y: 0, w: 200, h: 200 }, x: { min: 0, max: 1000000 }, y: { min: 0, max: 10 } });
  let drawn = 0;
  const cx2 = createDrawCtx();
  const ft = cx2.fillText.bind(cx2);
  cx2.fillText = (...a) => { drawn++; return ft(...a); };
  CC.axesCanvas(cx2, c, crowded, {});
  check(drawn > 0, 'axesCanvas on a tiny frame still draws (labels thin out, no throw)');
  const norm = CS.chartFrame({ rect: { x: 0, y: 0, w: 648, h: 360 }, x: { min: 0, max: 10 }, y: { min: 0, max: 100 } });
  let n2 = 0;
  const cx3 = createDrawCtx(), ft3 = cx3.fillText.bind(cx3);
  cx3.fillText = (...a) => { n2++; return ft3(...a); };
  CC.axesCanvas(cx3, c, norm, {});
  check(n2 >= norm.yticks.length + 3, `axesCanvas prints every y tick when there is room (${n2} labels, ${norm.yticks.length} y ticks)`);
}

// 10. Phase 3 parts: vectorArrow, dragHandle, props, strata extras.
{
  const L = await import('simulations/base/kit/SimLook.js');
  const { dragHandle } = await import('simulations/base/kit/SimDrag.js');
  const P = await import('simulations/base/kit/SimProps.js');
  const G = await import('simulations/base/kit/GeoMap.js');
  const c = { bgDeep: '#0d0a22', bgSurface: '#181134', raised: '#22184a', label: '#fdfaff', labelMuted: '#b6abd8', stroke: '#5b4f86', accent: '#57ccff', good: '#54e6a5', warning: '#ffcf5c', s1: '#38bdf8', s2: '#fbbf24', s3: '#34d399', s5: '#a78bfa', fontBody: 'sans-serif', fontDisplay: 'sans-serif' };
  const ctx = createDrawCtx();
  const a2 = L.vectorArrow(ctx, c, 100, 100, { magnitude: 2, scale: 20, col: c.s1 });
  const a3 = L.vectorArrow(ctx, c, 300, 300, { magnitude: 2, scale: 20, col: c.s2, label: '2 N' });
  check(Math.abs(a2.len - a3.len) < 1e-9 && a2.len === 40, 'vectorArrow: equal magnitudes draw equal lengths');
  const edge = L.vectorArrow(ctx, c, 600, 100, { magnitude: 5, scale: 20, label: '5 N' });
  check(edge.box && edge.box.x0 + edge.box.w <= L.W, 'vectorArrow keeps its pill inside the frame');
  const log = [];
  const h = dragHandle({ at: () => ({ x: 100, y: 100 }), radius: 20, snap: (p) => ({ x: Math.round(p.x / 10) * 10, y: p.y }), onMove: (p) => log.push(['m', p.x]), onCommit: (p) => log.push(['c', p.x]) });
  check(!h.down({ x: 200, y: 100 }) && h.down({ x: 110, y: 100 }), 'dragHandle grabs inside its radius only');
  h.move({ x: 133, y: 100 });
  h.up();
  check(log[0][1] === 120 && log[1][0] === 'c' && !h.dragging, 'dragHandle keeps the grab offset, snaps, commits on release');
  const rig = P.propRig({ x0: 0, groundY: 400, scale: 50 });
  const cart = P.drawCart(ctx, c, rig, 2, {});
  const blk = P.drawBlock(ctx, c, rig, 5, {});
  check(Math.abs(blk.y0 + blk.h - rig.groundY) < 1e-9 && cart.y0 + cart.h < rig.groundY, 'props: block rests on the ground line, cart sits above it');
  const ramp = P.drawRamp(ctx, c, rig, { from: 6, to: 9, rise: 90 });
  const top = ramp.surface(1);
  check(Math.abs(top.y - (rig.groundY - 90)) < 1e-9 && ramp.angle > 0, 'drawRamp: surface(1) is the top of the slope');
  const sb = P.drawSpringBalance(ctx, c, 50, 20, { reading: 5, max: 10 });
  check(sb.hook.y > sb.y0, 'drawSpringBalance returns its hook');
  const m = G.drawStrataBlock(ctx, c, { x: 10, y: 10, w: 200, h: 200 }, { layers: [{ key: 's1', thick: 0.5 }, { key: 's2', thick: 0.5 }], endLines: true, grain: 50, voids: [{ layer: 1, x: 0.5, y: 0.5, rx: 10 }], fault: { x: 0.5, slip: 0.1 } });
  const left = m(0.2, 0.5), right = m(0.8, 0.5);
  check(right[1] - left[1] > 0.05 * 200, 'strata fault: the far side drops by the slip');
}

// 11. SimPick sort mode keeps live per-target counts.
{
  const { simPick } = await import('simulations/base/kit/SimPick.js');
  const mk = (data) => ({ dataset: data, textContent: '', classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, hasAttribute: () => true, setAttribute() {}, getAttribute: () => null, removeAttribute() {}, matches: () => false });
  const counters = [mk({ count: 'a' }), mk({ count: 'b' })];
  const root = { addEventListener() {}, removeEventListener() {}, appendChild() {}, querySelectorAll: (sel) => (sel === '[data-count]' ? counters : []) };
  const pick = simPick(root, { track: true, countText: (n) => `${n} in it` });
  check(counters[0].textContent === '0 in it', 'sort mode paints zero counts at start');
  check(pick.count('a') === 0 && typeof pick.counts === 'function' && pick.placed instanceof Map, 'sort mode exposes placed / count / counts');
  pick.destroy();
}

// 12. predictGate: commit first, then reveal.
{
  const { predictGate } = await import('simulations/base/kit/SimPredict.js');
  const q = [], log = { cel: 0, oops: 0, rev: [] };
  const fake = { after: (sec, fn) => q.push(fn), animateFor() {}, celebrate: () => log.cel++, oops: () => log.oops++ };
  const opts = [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }];
  const g = predictGate(fake, { options: opts, answer: 'b', onReveal: (r) => log.rev.push(r) });
  check(g.state === 'asking' && !g.revealed, 'predictGate starts asking, answer not shown');
  check(g.choose('a') && g.state === 'committed' && g.busy, 'predictGate: a guess commits and goes busy');
  check(!g.choose('b') && g.choice === 'a', 'predictGate: a committed guess cannot be changed');
  q.shift()();
  check(g.revealed && g.correct === false && log.oops === 1 && log.rev[0].correct === false, 'predictGate: wrong guess reveals, oops fires');
  g.reset(); check(g.state === 'asking' && g.choice === null, 'predictGate.reset re-arms');
  g.choose('b'); q.shift()();
  check(g.correct === true && log.cel === 1, 'predictGate: right guess celebrates');
  let threw = false; try { predictGate(fake, { options: opts, answer: 'zzz' }); } catch { threw = true; }
  check(threw, 'predictGate rejects an answer that is not an option');
  const g2 = predictGate(fake, { options: opts }); g2.choose('a'); q.shift()();
  check(g2.revealed && g2.correct === null, 'predictGate without an answer reveals with correct = null');
}

// 13. Geometry spec + canvas renderer, area model, wrapped maths.
{
  const GS = await import('simulations/base/kit/SimGeomSpec.js');
  const GC = await import('simulations/base/kit/SimGeomCanvas.js');
  const SG = await import('simulations/base/kit/SimGeom.js');
  const T = await import('simulations/base/kit/SimText.js');
  const L = await import('simulations/base/kit/SimLook.js');
  const c = { bgDeep: '#0d0a22', bgSurface: '#181134', label: '#fdfaff', labelMuted: '#b6abd8', stroke: '#5b4f86', accent: '#57ccff', good: '#54e6a5', bad: '#ff8f7a', warning: '#ffcf5c', s1: '#38bdf8', s2: '#fbbf24', s3: '#34d399', fontBody: 'sans-serif', fontDisplay: 'sans-serif' };
  check(SG.geomFigure === GS.geomFigure && SG.areaModel === GS.areaModel, 'SimGeom re-exports the shared spec');
  const fig = GS.geomFigure({ points: [{ id: 'O', x: 100, y: 100 }, { id: 'A', x: 200, y: 100 }, { id: 'B', x: 100, y: 0 }] });
  check(Math.abs(GS.angleAt(fig, 'O', 'A', 'B') - 90) < 1e-9, 'angleAt: a right angle reads 90');
  const sizes = [], ctx = createDrawCtx();
  let f = '';
  Object.defineProperty(ctx, 'font', { get: () => f, set: (v) => { f = v; const m = /(\d+(?:\.\d+)?)px/.exec(v); if (m) sizes.push(+m[1]); } });
  const texts = [];
  const ft = ctx.fillText.bind(ctx); ctx.fillText = (...a) => { texts.push(String(a[0])); return ft(...a); };
  GC.geomCanvas(ctx, c, fig, { segments: [{ from: 'O', to: 'A', label: '10' }], angles: [{ at: 'O', from: 'A', to: 'B', label: 'auto' }], rightAngles: [{ at: 'O', from: 'A', to: 'B' }] });
  check(texts.includes('90 deg'), "geomCanvas: label 'auto' prints the live angle");
  check(Math.min(...sizes) >= L.MIN_PX, 'geomCanvas type never below the floor (min ' + Math.min(...sizes) + ')');
  const m = GS.areaModel({ cols: [6, 5], rows: [6, 3], unit: 'tiles' });
  check(m.total === 99 && m.cells[3].area === 15 && m.count === 99, 'areaModel: cells and total from one source');
  check(GS.areaModel({ cols: [3], rows: [5], unit: 'unit tiles' }).caption() === '15 unit tiles (3 x 5)', 'areaModel caption is derived, not typed');
  let bad = false; try { GS.areaModel({ cols: [0], rows: [1] }); } catch { bad = true; }
  check(bad, 'areaModel rejects a zero length');
  GC.areaGridCanvas(createDrawCtx(), c, { x: 0, y: 0, w: 300, h: 200 }, m, { labels: [['a', 'b'], ['c', 'd']] });
  const mc = createDrawCtx();
  const parts = [['sup', 'x', '2'], ' + 8x + 15 = (x + 3)(x + 5) and the corner holds fifteen unit tiles'];
  const lines = T.wrapMath(mc, c, parts, 160, { size: 16 });
  check(lines.length > 1 && lines[0][0][0] === 'sup', 'wrapMath: breaks at spaces, the superscript stays whole at the start');
  const r = T.drawMathWrapped(mc, c, parts, 0, 0, 160, { size: 16 });
  check(r.lines.length === lines.length && r.h > 0, 'drawMathWrapped returns { lines, w, h }');
  const bx = T.drawMathCaption(mc, c, parts, 340, 10, { maxW: 300 });
  check(bx.w <= 300 + 1 && bx.h > 0, 'drawMathCaption sizes to the wrapped maths');
}

// 14. Seeded trials, canvas timeline, new icons.
{
  const TR = await import('simulations/base/kit/SimChanceTrials.js');
  const TL = await import('simulations/base/kit/SimTimelineCanvas.js');
  const IC = await import('simulations/base/kit/SimIcons.js');
  const L = await import('simulations/base/kit/SimLook.js');
  const c = { bgDeep: '#0d0a22', bgSurface: '#181134', label: '#fdfaff', labelMuted: '#b6abd8', stroke: '#5b4f86', accent: '#57ccff', good: '#54e6a5', bad: '#ff8f7a', warning: '#ffcf5c', s1: '#38bdf8', s2: '#fbbf24', s3: '#34d399', s5: '#a78bfa', s6: '#f87171', s8: '#fb923c', fontBody: 'sans-serif', fontDisplay: 'sans-serif' };
  const draw = (rnd) => (rnd() < 0.6 ? 'red' : 'blue');
  const a = TR.trialRun({ seed: 5, n: 400, draw }), b = TR.trialRun({ seed: 5, n: 400, draw }), d2 = TR.trialRun({ seed: 6, n: 400, draw });
  check(JSON.stringify(a.outcomes) === JSON.stringify(b.outcomes) && JSON.stringify(a.outcomes) !== JSON.stringify(d2.outcomes), 'trialRun: same seed same run, other seed other run');
  check(a.count('red') + a.count('blue') === 400 && Math.abs(a.freq('red') - 0.6) < 0.08, `trialRun: frequency settles near the chance (${a.freq('red').toFixed(2)})`);
  const ser = a.series('red', 10);
  check(ser.length === 10 && ser[9].x === 10 && Math.abs(ser[9].y - a.freq('red', 10)) < 1e-9, 'trialRun.series matches freq at each k');
  let bad = false; try { TR.trialRun({ n: 0, draw }); } catch { bad = true; }
  check(bad, 'trialRun rejects n = 0');
  TR.trialStripCanvas(createDrawCtx(), c, a, { upTo: 12, tones: { red: 6, blue: 1 } });
  const tl = TL.timelineAxis({ rect: { x: 0, y: 0, w: 680, h: 400 }, from: -7000, to: -1000 });
  check(Math.abs(tl.year(tl.x(-3300)) + 3300) < 1e-6 && tl.ticks.length >= 4 && tl.ticks.length <= 12, 'timelineAxis: year <-> px round-trips, nice ticks');
  const sizes = [], ctx = createDrawCtx();
  let f = '';
  Object.defineProperty(ctx, 'font', { get: () => f, set: (v) => { f = v; const m = /(\d+(?:\.\d+)?)px/.exec(v); if (m) sizes.push(+m[1]); } });
  const r = TL.timelineCanvas(ctx, c, tl, {
    eras: [{ from: -7000, to: -4500, label: 'Neolithic', tone: 5 }, { from: -2600, to: -1900, label: 'Mature Harappan', tone: 3 }],
    events: [{ at: -3000, label: 'Walls and beads', tone: 2 }, { at: -2900, label: 'Early script marks', tone: 8 }, { at: -2800, label: 'Fortified perimeters', tone: 6 }],
    spans: [{ from: -7000, to: -2600 }], now: -2000,
  });
  const ov = (p, q) => p.x0 < q.x0 + q.w && q.x0 < p.x0 + p.w && p.y0 < q.y0 + q.h && q.y0 < p.y0 + p.h;
  const boxes = r.events.map((e) => e.box);
  check(boxes.length === 4 && boxes.every((p, i) => boxes.every((q, j) => i === j || !ov(p, q))), 'timelineCanvas: event tags (and a too-narrow era name) never overlap');
  check(Math.min(...sizes) >= L.MIN_PX, `timelineCanvas type never below the floor (min ${Math.min(...sizes)})`);
  const NEW = ['globe', 'lamp', 'eye', 'cloud', 'mountain', 'plane', 'leaf', 'seed', 'flower', 'cup', 'glass', 'ticket', 'printer', 'flame', 'speaker', 'tyre', 'crate', 'test-tube', 'mushroom'];
  check(NEW.every((n) => IC.ICON_NAMES.includes(n)) && new Set(IC.ICON_NAMES).size === IC.ICON_NAMES.length, 'SimIcons: the 19 new glyphs exist, names unique');
  check(NEW.every((n) => IC.iconSvg(n, 1).includes('<path')), 'SimIcons: every new glyph renders SVG');
  const none = IC.ICON_NAMES.filter((n) => /flag|emblem|chakra|ashoka|cross|crescent|logo/.test(n) && n !== 'flag');
  check(none.length === 0, 'SimIcons: no emblem, chakra, cross or logo names added');
}

// 15. figureFor: a role and a pose, never a stick person.
const PC = { bgDeep: '#0d0a22', bgSurface: '#181134', raised: '#22184a', label: '#fdfaff', labelMuted: '#b6abd8', stroke: '#5b4f86', accent: '#57ccff', good: '#54e6a5', bad: '#ff8f7a', warning: '#ffcf5c', gold: '#ffcf5c', s1: '#38bdf8', s2: '#fbbf24', s3: '#34d399', s4: '#f472b6', s5: '#a78bfa', s6: '#f87171', s7: '#22d3ee', s8: '#fb923c', fontBody: 'sans-serif', fontDisplay: 'sans-serif' };
const fontSizes = (ctx) => { const sizes = []; let f = ''; Object.defineProperty(ctx, 'font', { get: () => f, set: (v) => { f = v; const m = /(\d+(?:\.\d+)?)px/.exec(v); if (m) sizes.push(+m[1]); } }); return sizes; };
const inter = (a, b) => Math.max(0, Math.min(a.x0 + a.w, b.x0 + b.w) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y0 + a.h, b.y0 + b.h) - Math.max(a.y0, b.y0));
{
  const F = await import('simulations/base/kit/SimFigure.js');
  const throws = (fn) => { try { fn(); return false; } catch { return true; } };
  check(throws(() => F.figureFor(PC, { role: 'wizard' })) && throws(() => F.figureFor(PC, { role: 'student', pose: 'dance' })) && throws(() => F.figureFor(PC, {})),
    'figureFor throws on an unknown role, an unknown pose, or no role / build');
  check(F.ROLE_NAMES.length === 12 && ['farmer', 'nurse', 'police', 'voter', 'shopkeeper'].every((r) => F.ROLE_NAMES.includes(r)), `figureFor: 12 roles (${F.ROLE_NAMES.join(' ')})`);
  const t = F.figureFor({ colors: PC }, { role: 'teacher', pose: 'point', x: 100, y: 400, scale: 90, i: 2 });
  check(Math.abs(t.height - 1.68 * 90) < 1e-9 && t.build === 'adult' && t.look.skin === F.skinFor(2), `figureFor sizes from px per metre (${t.height.toFixed(1)} px) and varies the look by i`);
  check(F.figureFor(PC, { role: 'child' }).height < F.figureFor(PC, { role: 'adult' }).height && F.figureFor(PC, { role: 'student' }).build === 'teen', 'figureFor: child shorter than adult, a student is a teen');
  const bad = F.ROLE_NAMES.filter((role) => F.POSE_NAMES.some((pose) => { const sk = F.solveFigure(F.figureFor(PC, { role, pose, x: 200, y: 400 })); return sk.warnings.some((w) => w.code !== 'hand-far'); }));
  check(bad.length === 0, `every role x pose solves without warnings (${bad.join(', ')})`);
  const skins = new Set(F.ROLE_NAMES.map((role, i) => F.figureFor(PC, { role, i }).look.skin));
  check(skins.size === 4, `a group of roles mixes all 4 skin tones (${skins.size})`);
  const ctx = createDrawCtx();
  const n0 = ctx._calls?.length ?? 0;
  F.drawFigure(ctx, PC, t);
  check((ctx._calls?.length ?? 1) > n0 + 40, 'drawFigure takes a figureFor spec (its look rides along)');
}

// 16. Rows, crowds, counted people.
{
  const F = await import('simulations/base/kit/SimFigure.js');
  const worst = (faces) => { let m = 0; for (let i = 0; i < faces.length; i++) for (let j = i + 1; j < faces.length; j++) m = Math.max(m, inter(faces[i], faces[j]) / Math.min(faces[i].w * faces[i].h, faces[j].w * faces[j].h)); return m; };
  let rowBad = [], glyphs = 0;
  for (const n of [3, 12, 40]) for (const w of [200, 420, 648]) {
    const r = F.drawFigureRow(createDrawCtx(), PC, { n, x: 16, w, y: 500, top: 16, height: 120 });
    const faces = r.figures.map((p) => p.face);
    const inside = faces.every((f) => f.x0 >= 16 - 2 && f.x0 + f.w <= 16 + w + 2 && f.y0 >= 16 - 2);
    const ov = worst(faces);
    glyphs += r.figures.filter((p) => p.glyph).length;
    if (r.figures.length !== n || r.capped || !inside || ov > 0.3 || r.figures.some((p) => p.glyph !== p.height < 44)) rowBad.push(`${n}@${w}: ${r.figures.length} drawn, overlap ${ov.toFixed(2)}, inside ${inside}`);
  }
  check(rowBad.length === 0, `drawFigureRow: 3 / 12 / 40 people at 200 / 420 / 648 px, all drawn, in the frame, faces <= 30% overlap (${rowBad.join('; ')})`);
  const tight = F.drawFigureRow(createDrawCtx(), PC, { n: 40, x: 16, w: 200, y: 500, top: 440, height: 120 });
  check(tight.figures.length === 40 && tight.figures.every((p) => p.glyph) && worst(tight.figures.map((p) => p.face)) <= 0.3, `drawFigureRow shrinks 40 people into a 200 x 60 band as glyphs below 44 px (h ${tight.height.toFixed(1)})`);
  void glyphs;
  const r1 = F.drawFigureRow(createDrawCtx(), PC, { n: 12, x: 16, w: 420, y: 500, height: 120 }), r2 = F.drawFigureRow(createDrawCtx(), PC, { n: 12, x: 16, w: 420, y: 500, height: 120 });
  check(JSON.stringify(r1.boxes) === JSON.stringify(r2.boxes), 'drawFigureRow is deterministic');
  const lab = F.drawFigureRow(createDrawCtx(), PC, { n: 4, x: 16, w: 640, y: 400, height: 150, labels: ['first', 'second', 'third', 'a long label'] });
  check(!lab.labelsDropped && lab.figures.length === 4, 'drawFigureRow labels a single row');
  let crowdBad = [];
  for (const n of [3, 12, 40]) for (const w of [240, 420, 648]) {
    const rect = { x: 16, y: 40, w, h: 420 };
    const a = F.crowdLayout({ rect, n, seed: 7, height: 110 }), b = F.crowdLayout({ rect, n, seed: 7, height: 110 }), d = F.crowdLayout({ rect, n, seed: 8, height: 110 });
    let cover = 0;
    for (const p of a) for (const q of a) {
      if (p === q) continue;
      cover = Math.max(cover, inter(p.face, q.face) / (p.face.w * p.face.h));
      if (p.y < q.y) cover = Math.max(cover, inter(p.face, q.body) / (p.face.w * p.face.h));
    }
    const inRect = a.every((p) => p.face.x0 >= rect.x - 1 && p.face.x0 + p.face.w <= rect.x + rect.w + 1 && p.face.y0 >= rect.y - 1 && p.y <= rect.y + rect.h + 1);
    const sorted = a.every((p, i) => !i || a[i - 1].y <= p.y);
    if (a.length !== n || JSON.stringify(a) !== JSON.stringify(b) || (n > 3 && JSON.stringify(a) === JSON.stringify(d)) || cover > 0.3 || !inRect || !sorted) crowdBad.push(`${n}@${w}: ${a.length} placed, cover ${cover.toFixed(2)}, inRect ${inRect}`);
  }
  check(crowdBad.length === 0, `crowdLayout: same seed same boxes, back first, no face > 30% covered, inside the rect (${crowdBad.join('; ')})`);
  const pick = F.pickSpread(12, 5);
  check(pick.length === 5 && new Set(pick).size === 5 && pick.every((i) => i >= 0 && i < 12), `pickSpread(12, 5) -> ${pick}`);
  const hctx = createDrawCtx(), sizes = fontSizes(hctx);
  const crowd = F.drawCrowd(hctx, PC, { rect: { x: 16, y: 40, w: 640, h: 420 }, n: 20, seed: 2, height: 110 });
  const h = F.highlightFigures(hctx, PC, crowd, 6, { size: 10 });
  check(h.picked.length === 6 && h.chip && Math.min(...sizes) >= 14, `highlightFigures: 6 rings, a count chip, type >= 14 px (min ${Math.min(...sizes)})`);
}

// 17. Seated and cycling poses on their props.
{
  const F = await import('simulations/base/kit/SimFigure.js');
  const P = await import('simulations/base/kit/SimProps.js');
  const ctx = createDrawCtx();
  const G = 400;
  let bad = [];
  for (const H of [120, 170]) for (const facing of [1, -1, 0]) {
    const chair = P.drawChair(ctx, PC, { x: 200, y: G, forHeight: H, facing });
    const sk = F.solveFigure({ x: 200, y: G, height: H, facing, pose: 'sit', seat: chair.seat });
    const feet = sk.anchors.foot.every((p) => Math.abs(p.y - G) <= 1), seat = Math.abs(sk.anchors.seat.y - chair.seat.y) <= 1;
    const legs = sk.joints.legs[0];
    const level = facing === 0 || (Math.abs(legs.knee.y - sk.joints.hip.y) < 0.05 * H && Math.abs(legs.knee.x - legs.ankle.x) < 0.03 * H);
    if (!feet || !seat || !level || sk.warnings.length) bad.push(`${H}/${facing}: feet ${feet} seat ${seat} level ${level} ${JSON.stringify(sk.warnings)}`);
  }
  check(bad.length === 0, `sit on a chair: feet on the floor and seat on the chair within 1 px, thigh level, shin down, both facings and head-on (${bad.join('; ')})`);
  const d0 = F.solveFigure({ x: 200, y: G, height: 170, facing: 1, pose: 'sit' });
  check(JSON.stringify(d0.joints) === JSON.stringify(F.solveFigure({ x: 200, y: G, height: 170, facing: 1, pose: 'sit' }).joints) && d0.anchors.foot.every((p) => Math.abs(p.y - G) <= 1), 'sit without a seat: deterministic, default seat height, feet on the floor');
  const high = F.solveFigure({ x: 200, y: G, height: 170, facing: 1, pose: 'sit', seat: { x: 200, y: G - 110 } });
  check(high.warnings.some((w) => w.code === 'leg-far') && high.anchors.foot[0].y < G - 5, 'a too-high seat: feet dangle and leg-far is reported (data, no throw)');
  const desk = P.drawDesk(ctx, PC, { x0: 100, x1: 400, y: G, forHeight: 150, build: 'teen' });
  const at = F.solveFigure({ x: 250, y: G, height: 150, build: 'teen', facing: 0, pose: 'sit', seat: P.drawSeatBench(ctx, PC, { x0: 100, x1: 400, y: G, forHeight: 150, build: 'teen' }).seat(250), hands: desk.hands(250, 0) });
  check(!at.warnings.length && at.anchors.hand.every((p, i) => Math.hypot(p.x - desk.hands(250, 0)[i].x, p.y - desk.hands(250, 0)[i].y) < 0.5), 'a student on a bench puts both hands on the desk top');
  bad = [];
  for (const view of ['side', 'front']) for (const facing of [1, -1]) for (const dist of [0, 37, 120, 333]) {
    const bike = P.bicycleRig({ x: 300, y: G, forHeight: 160, facing: view === 'front' ? 0 : facing, view, dist });
    const sk = F.solveFigure({ ...bike.rider, pose: 'cycle' });
    const feetOk = sk.anchors.foot.every((p, i) => Math.hypot(p.x - bike.rider.feet[i].x, p.y - bike.rider.feet[i].y) <= 1);
    const handsOk = sk.anchors.hand.every((p, i) => Math.hypot(p.x - bike.grips[i].x, p.y - bike.grips[i].y) <= 1);
    const seatOk = Math.abs(sk.anchors.seat.y - bike.saddle.y) <= 1;
    if (sk.warnings.length || !feetOk || !handsOk || !seatOk) bad.push(`${view}/${facing}/${dist}: ${JSON.stringify(sk.warnings)} feet ${feetOk} hands ${handsOk} seat ${seatOk}`);
  }
  check(bad.length === 0, `cycle: feet on the pedals, hands on the bars, seat on the saddle, no warnings at any crank angle (${bad.join('; ')})`);
  const b1 = P.bicycleRig({ x: 300, y: G, forHeight: 160, dist: 250 });
  check(Math.abs(b1.roll * b1.r - 250) < 1e-9 && b1.wheels.every((w) => Math.abs(w.y + w.r - G) < 1e-9), 'bicycle wheels touch the ground and roll dist / r (no skid)');
  P.drawBicycle(ctx, PC, b1); P.drawBicycle(ctx, PC, { x: 300, y: G, view: 'front' }, { part: 'front' });
}

// 18. SimAnimal.
{
  const A = await import('simulations/base/kit/SimAnimal.js');
  const G = 420;
  let wrong = 0, ground = [], slip = 0;
  for (const kind of A.ANIMAL_KINDS) for (const facing of [1, -1]) for (const L of [90, 200]) for (const pose of ['stand', 'walk', 'graze']) for (const phase of [0, 0.13, 0.4, 0.77]) {
    const sk = A.solveAnimal({ x: 300, y: G, length: L, facing, kind, pose, phase });
    for (const lg of sk.local.legs) {
      const dx = lg.end.x - lg.root.x, dy = lg.end.y - lg.root.y, kx = lg.knee.x - lg.root.x, ky = lg.knee.y - lg.root.y;
      const cross = dx * ky - dy * kx;
      const forward = lg.fore || sk.K.hind === 'fwd';
      if (Math.abs(cross) > 1e-6 && (forward ? cross > 0 : cross < 0)) wrong++;
      if (lg.planted && Math.abs(lg.contact.y - G) > 1) ground.push(`${kind} ${pose}`);
    }
    if (pose !== 'walk' && sk.local.legs.some((lg) => Math.abs(lg.contact.y - G) > 1)) ground.push(`${kind} ${pose} all`);
  }
  check(wrong === 0, `animal legs: fore knees forward, hind hocks back (elephant hind knee forward), every kind, pose, facing, phase (${wrong} wrong)`);
  check(ground.length === 0, `animal planted feet touch the ground within 1 px (${[...new Set(ground)].join(', ')})`);
  const lie = A.ANIMAL_KINDS.map((kind) => A.solveAnimal({ x: 300, y: G, length: 160, kind, pose: 'lie' })).filter((sk) => Math.abs(sk.anchors.belly.y - G) > 1 || sk.local.legs.some((l) => l.knee.y > G + 1 || l.end.y > G + 1));
  check(lie.length === 0, `lying: belly on the ground within 1 px, no leg through the floor (${lie.map((s) => s.kind).join(', ')})`);
  for (const kind of A.ANIMAL_KINDS) {
    const spec = { x: 0, y: G, length: 160, facing: 1, kind, pose: 'walk' };
    const at = (d) => { const s = A.solveAnimal({ ...spec, x: 100 + d, phase: A.animalPhase(d, spec) }); return s.local.legs.map((l) => ({ x: l.contact.x, planted: l.planted })); };
    for (let d = 0; d < 300; d += 7) {
      const a = at(d), b = at(d + 1);
      a.forEach((p, i) => { if (p.planted && b[i].planted && Math.abs(b[i].x - p.x) > 0.05) slip++; });
    }
  }
  check(slip === 0, `walking by animalPhase: a planted foot never slides (${slip} slips)`);
  const len = A.ANIMAL_KINDS.map((kind) => { const s = A.solveAnimal({ x: 300, y: G, length: 150, kind }); return Math.abs(Math.abs(s.anchors.nose.x - s.anchors.tail.x) - 150); });
  check(Math.max(...len) < 1, `length is nose to tail base (worst error ${Math.max(...len).toFixed(2)} px)`);
  const j1 = JSON.stringify(A.solveAnimal({ x: 300, y: G, length: 160, kind: 'tiger', pose: 'walk', phase: 0.3 }));
  check(j1 === JSON.stringify(A.solveAnimal({ x: 300, y: G, length: 160, kind: 'tiger', pose: 'walk', phase: 0.3 })), 'solveAnimal is deterministic');
  const fl = A.solveAnimal({ x: 300, y: G, length: 160, kind: 'dog', facing: -1 }), fr = A.solveAnimal({ x: 300, y: G, length: 160, kind: 'dog', facing: 1 });
  check(Math.abs((fl.anchors.nose.x - 300) + (fr.anchors.nose.x - 300)) < 1e-9 && fl.anchors.nose.x < 300, 'facing -1 mirrors the animal about x');
  const unk = A.solveAnimal({ x: 0, y: 0, length: 100, kind: 'dragon', pose: 'fly' });
  check(unk.warnings.some((w) => w.code === 'unknown-kind') && unk.warnings.some((w) => w.code === 'unknown-pose'), 'unknown kind / pose warn (data), never throw');
  let threw = null;
  try { const ctx = createDrawCtx(); for (const kind of A.ANIMAL_KINDS) for (const pose of A.ANIMAL_POSES) A.drawAnimal(ctx, PC, { x: 300, y: G, length: 120, kind, pose, phase: 0.2 }, { mood: 'happy' }); } catch (e) { threw = e.message; }
  check(threw === null, `drawAnimal paints every kind and pose (${threw ?? 'ok'})`);
}

// 19. Animal icons.
{
  const IC = await import('simulations/base/kit/SimIcons.js');
  const NEW = ['fish', 'frog', 'bird', 'snail', 'insect'];
  check(NEW.every((n) => IC.ICON_NAMES.includes(n) && IC.iconSvg(n, 3).includes('<path')) && new Set(IC.ICON_NAMES).size === IC.ICON_NAMES.length, 'SimIcons: fish, frog, bird, snail, insect render, names unique');
}

// 20-24. Wave 0 fixes (2026-10-05, from the migration worked examples).
{
  const L = await import('simulations/base/kit/SimLook.js');
  const fillRects = (ctx) => ctx._calls.filter((c2) => c2.method === 'fillRect').map((c2) => c2.args.slice(0, 4));
  // 20. drawBackdrop paints the real frame: default 680 x 520, then the canvas size over the scale, then an explicit frame.
  let ctx = createDrawCtx(); L.drawBackdrop(ctx, PC, 'plain');
  check(JSON.stringify(fillRects(ctx)[0]) === '[0,0,680,520]', 'drawBackdrop: with no frame information it paints the 680 x 520 design space');
  ctx = createDrawCtx(); ctx.canvas = { width: 1600, height: 1000 }; ctx.getTransform = () => ({ a: 2, d: 2 }); L.drawBackdrop(ctx, PC, 'plain');
  check(JSON.stringify(fillRects(ctx)[0]) === '[0,0,800,500]', 'drawBackdrop: HiDPI canvas 1600 x 1000 at scale 2 paints 800 x 500');
  ctx = createDrawCtx(); L.setFrame(900, 600); L.drawBackdrop(ctx, PC, 'plain'); L.drawFloor(ctx, PC, 500); L.setFrame(null);
  const fr = fillRects(ctx);
  check(JSON.stringify(fr[0]) === '[0,0,900,600]' && fr[1][2] === 900 && fr[1][3] === 100, 'setFrame(900, 600): drawBackdrop and drawFloor fill 900 wide, floor to 600');
  // 21. a SimScene with its own WIDTH x HEIGHT sets the frame for its draw and clears it afterwards.
  class WideScene extends SimScene { static WIDTH = 800; static HEIGHT = 500; static BEAT_STEP_MAP = MAP3; draw(c2x, c) { L.drawBackdrop(c2x, c, 'plain'); } }
  const ws = new WideScene(makeContainer()); await ws.setup(); ws.onBeatChange(0, 3); tick(ws, 0.1);
  check(fillRects(ws._ctx).some((r) => r[2] === 800 && r[3] === 500), 'SimScene: static WIDTH x HEIGHT 800 x 500 -> drawBackdrop paints 800 x 500');
  ctx = createDrawCtx(); L.drawBackdrop(ctx, PC, 'plain');
  check(JSON.stringify(fillRects(ctx)[0]) === '[0,0,680,520]', 'SimScene: the frame is reset after the draw (a later call sees the default)');
  ws.destroy();
  // 22. wrapText: x is the LEFT edge of the block for every align.
  ctx = createDrawCtx(); ctx.font = '600 15px sans-serif'; ctx.fillStyle = '#fff';
  L.wrapText(ctx, 'hello world', 100, 10, 200, { align: 'center' });
  const ft = ctx._calls.filter((c2) => c2.method === 'fillText');
  check(ft.length >= 1 && ft.every((c2) => c2.args[1] === 200), 'wrapText: align center draws at x + maxW / 2 (x is the block left edge)');
  ctx = createDrawCtx(); ctx.font = '600 15px sans-serif'; L.wrapText(ctx, 'hello', 100, 10, 200, { align: 'right' });
  check(ctx._calls.filter((c2) => c2.method === 'fillText').every((c2) => c2.args[1] === 300), 'wrapText: align right draws at x + maxW');
  // 23. areaGridCanvas: cell labels read on their fill in both polarities.
  const G = await import('simulations/base/kit/SimGeomCanvas.js');
  for (const [name, c2x] of [['dark', PC], ['light', { ...PC, bgDeep: '#f4f1ff', bgSurface: '#ffffff', label: '#1b1233', s1: '#2d6cdf', s2: '#c28a00' }]]) {
    ctx = createDrawCtx(); const inks = [];
    const ft2 = ctx.fillText.bind(ctx); ctx.fillText = (...a) => { inks.push(ctx.fillStyle); return ft2(...a); };
    G.areaGridCanvas(ctx, c2x, { x: 0, y: 0, w: 200, h: 200 }, { cols: [1, 1], rows: [1, 1] }, { labels: [['x', 'y'], ['z', 'w']], tones: [[1, 2], [2, 1]] });
    const toneOf = (t) => (t === 1 ? c2x.s1 : c2x.s2);
    const want = [L.inkOn(c2x, toneOf(1)), L.inkOn(c2x, toneOf(2)), L.inkOn(c2x, toneOf(2)), L.inkOn(c2x, toneOf(1))];
    check(inks.length === 4 && inks.every((k, i) => k === want[i]), `areaGridCanvas (${name}): label ink is inkOn(fill), not a fixed colour`);
  }
  // 24. drawCrowd: the layout is computed once per set of options.
  const F = await import('simulations/base/kit/SimFigure.js');
  const o = { rect: { x: 0, y: 0, w: 300, h: 160 }, n: 30, seed: 5, height: 40 };
  ctx = createDrawCtx(); const a1 = F.drawCrowd(ctx, PC, o), a2 = F.drawCrowd(ctx, PC, { ...o });
  check(a1 === a2 && a1.length === 30, 'drawCrowd: same options -> the same cached layout (not recomputed every frame)');
  check(F.drawCrowd(ctx, PC, { ...o, seed: 6 }) !== a1, 'drawCrowd: a different seed is a different layout');
  check(typeof F.drawCrowdItems === 'function', 'drawCrowdItems is exported (draw a precomputed crowdLayout)');
}

// 25. Engine type floor (CanvasSimulation TYPE_FLOOR): px sizes under 14 become 14, everything else is left alone.
{
  const CS = await import('simulations/base/CanvasSimulation.js');
  check(CS.floorFontString('600 11px Inter, system-ui') === '600 14px Inter, system-ui', 'floorFontString: 11px -> 14px');
  check(CS.floorFontString('700 18px Inter') === '700 18px Inter' && CS.floorFontString('bold 14px x') === 'bold 14px x', 'floorFontString: 14px and larger are unchanged');
  check(CS.floorFontString('0.8em serif') === '0.8em serif' && CS.floorFontString('monospace') === 'monospace', 'floorFontString: em / rem / no size are left alone');
  check(CS.floorFontString('13.5px/1.2 serif') === '14px/1.2 serif', 'floorFontString: 13.5px/1.2 -> 14px/1.2');
  let store = '10px sans-serif';
  const fake = {}; const desc = { get() { return store; }, set(v) { store = v; } };
  check(CS.installFontFloor(fake, desc) === true, 'installFontFloor: installs on a context with a font accessor');
  fake.font = '600 9px Inter'; check(fake.font === '600 14px Inter', 'installFontFloor: assigning 9px reads back 14px');
  fake.font = '700 20px Inter'; check(fake.font === '700 20px Inter', 'installFontFloor: assigning 20px is unchanged');
  check(CS.installFontFloor({}, null) === false && CS.installFontFloor(null, desc) === false, 'installFontFloor: no accessor or no context -> no change (headless ctx)');
}

// 27. Watchdog: a scene that never returns is killed with the stack, exit 4 (run.mjs + watchdog.mjs).
{
  const { spawnSync } = await import('node:child_process'); const fs = await import('node:fs'); const os = await import('node:os'); const path = await import('node:path');
  const f = path.join(os.tmpdir(), `hang-${process.pid}.js`);
  fs.writeFileSync(f, "import { SimScene } from 'simulations/base/kit/SimScene.js';\nfunction stackLayout(n) { let i = 0; for (;;) { i = (i + 2) % n; if (i === 1) break; } return i; }\nexport class HangScene extends SimScene { setup() { stackLayout(4); } }\n");
  const r = spawnSync(process.execPath, [new URL('./run.mjs', import.meta.url).pathname, 'draw', f], { encoding: 'utf8', env: { ...process.env, SIM_HANG_MS: '2000' }, timeout: 60000 });
  fs.unlinkSync(f);
  const out = (r.stdout || '') + (r.stderr || '');
  check(r.status === 4 && /HANG: no output for/.test(out) && /at stackLayout/.test(out), `watchdog: a hung scene exits 4 and names the function (exit ${r.status})`);
}

// 28. Stage 3 log tool (tools/staged-generation): log-stage3 replaces (never duplicates) a bullet; --no-log sets Status only.
{
  const { spawnSync } = await import('node:child_process'); const fs = await import('node:fs'); const os = await import('node:os'); const path = await import('node:path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'logfix-'));
  const B = path.join(dir, 'fixbundle'); fs.mkdirSync(path.join(B, 'simulations', 'L01'), { recursive: true }); fs.mkdirSync(path.join(B, 'blocks'));
  fs.writeFileSync(path.join(B, 'simulations', 'L01', 'CanvasFix.stub.md'), '# CanvasFix - simulation stub\nSave path: simulations/L01/CanvasFix.js\nAttached by: blk-l01-s01 (explain)\nBeats: 2\nBase class: SimScene (canvas)\n');
  const L = (a) => spawnSync(process.execPath, [new URL('../staged-generation/log-stage3.mjs', import.meta.url).pathname, '--bundle', B, '--target', 'L01/CanvasFix', '--what', 'shows x', ...a], { encoding: 'utf8' });
  fs.writeFileSync(path.join(B, 'simulations', 'L01', 'CanvasFix.js'), 'export class CanvasFix {}\n');
  fs.writeFileSync(path.join(B, 'simulations', 'L01', 'CanvasFix.design.md'), '# d\nStatus: building\nStarted: 2026-10-05T00:00:00Z\nBase class: SimScene (r)\n## Look log\n- r1\n');
  L(['--model', 'a']); const r2 = L(['--model', 'b']);
  const log = fs.readFileSync(path.join(B, 'GENERATION-LOG.md'), 'utf8');
  check(r2.status === 0 && (log.match(/^- CanvasFix \(/gm) || []).length === 1 && /Model: b\./.test(log) && /Status: done/.test(fs.readFileSync(path.join(B, 'simulations', 'L01', 'CanvasFix.design.md'), 'utf8')), 'log-stage3: one bullet per scene (replaced, not duplicated), Status flips to done when a look is logged');
  fs.rmSync(dir, { recursive: true, force: true });
}

process.exit(summary());
