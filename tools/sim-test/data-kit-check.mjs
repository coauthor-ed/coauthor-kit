// Contract checks for the humanities/maths kit (pure logic; no browser).
// Run: node tools/sim-test/run.mjs exec tools/sim-test/data-kit-check.mjs
import { installFakeHost, createDrawCtx, check, summary } from './harness.mjs';

installFakeHost(createDrawCtx);
const T = await import('simulations/base/kit/SimText.js');
const { numberLine } = await import('simulations/base/kit/SimNumberLine.js');
const { chartFrame, hemicycleSeats } = await import('simulations/base/kit/SimChart.js');
const { geomFigure, geomHandles, angleAt } = await import('simulations/base/kit/SimGeom.js');
const { spinnerSector, treeLayout } = await import('simulations/base/kit/SimChance.js');
const { mountTimeline } = await import('simulations/base/kit/SimTimeline.js');
const { mountFlow } = await import('simulations/base/kit/FlowBoard.js');
const { AllocBoardScene } = await import('simulations/base/kit/AllocBoardScene.js');
const { balanceTilt } = await import('simulations/base/kit/SimBalance.js');

// 1. Numbers, dates, money.
const cases = [
  [T.fmtNum(9680000000, { indian: true }), '9,68,00,00,000'], [T.fmtNum(1234.567, { dp: 2 }), '1,234.57'],
  [T.fmtIndianWords(9680000000), '968 crore'], [T.fmtIndianWords(450000), '4.5 lakh'], [T.fmtINR(12500000), '₹1,25,00,000'],
  [T.fmtYear(-2600), '2600 BCE'], [T.fmtYear(-12000), '12,000 BCE'], [T.fmtYear(320), '320 CE'], [T.fmtYear(1950), '1950'],
  [T.fmtSpan(-2600, 100), '2,699 years'], [T.fmtSpan(-3000000, 0), '3 million years'], [T.tx({ en: 'Hi' }), 'Hi'],
];
const bad = cases.filter(([g, w]) => g !== w);
check(!bad.length, `SimText formats (${cases.length - bad.length}/${cases.length})${bad.length ? ' ' + JSON.stringify(bad) : ''}`);

// 2. Validation fails with a plain message.
const throws = (fn, re) => { try { fn(); return false; } catch (e) { return re.test(e.message); } };
const host = () => document.createElement('div');
check(throws(() => numberLine({ min: 3, max: 1 }), /min must be below max/), 'numberLine rejects min > max');
check(throws(() => chartFrame({ x: { min: 0, max: 1 }, y: { min: 1, max: 1 } }), /y needs min < max/), 'chartFrame rejects a flat y range');
check(throws(() => mountTimeline(host(), { from: 0, to: 10, events: [{ id: 'a', at: 20 }] }), /outside/), 'timeline rejects an event off the axis');
check(throws(() => mountFlow(host(), { layout: 'chain', nodes: [{ id: 'a' }], edges: [{ from: 'a', to: 'b' }] }), /missing node/), 'flow rejects an edge to a missing node');
check(throws(() => AllocBoardScene.validate({ items: [{ id: 'a', value: 5 }], bins: [{ id: 'b', rule: { atLeast: 9 } }] }), /needs 9/), 'alloc rejects an unreachable rule');

// 3. Number line: snapping, and labels thin out on a narrow (portrait) line.
const wide = numberLine({ rect: { x: 0, y: 0, w: 648, h: 300 }, min: 1, max: 2, step: 0.1, labels: 'dec' });
const narrow = numberLine({ rect: { x: 0, y: 0, w: 348, h: 300 }, min: 1, max: 2, step: 0.1, labels: 'dec' });
const lab = (nl) => nl.ticks.filter((t) => t.label != null).length;
check(lab(wide) === 11 && lab(narrow) < 11 && lab(narrow) >= 5, `labels thin on a narrow line (${lab(wide)} wide, ${lab(narrow)} narrow)`);
const q = numberLine({ rect: { x: 0, y: 0, w: 648, h: 300 }, min: 0, max: 2, step: 1, minor: 4 });
check(q.snap(q.x(1.26)) === 1.25 && q.snap(-50) === 0, 'numberLine snaps to quarters and clamps');

// 4. Seats, spinner, tree, balance.
check(hemicycleSeats(543, { x: 0, y: 0, w: 500, h: 260 }).length === 543, 'hemicycle has exactly 543 seats');
const S = [{ w: 3 }, { w: 2 }, { w: 1 }];
check(spinnerSector(S, 0) === 1 && spinnerSector(S, 100) === 0 && spinnerSector(S, -30) === 2, `spinnerSector reads the pointer (${spinnerSector(S, 0)}, ${spinnerSector(S, 100)}, ${spinnerSector(S, -30)})`);
const t = treeLayout([[{ text: 'H', p: 0.5 }, { text: 'T', p: 0.5 }], [{ text: 'H', p: 0.5 }, { text: 'T', p: 0.5 }]]);
check(t.leaves.length === 4 && Math.abs(t.leaves.reduce((s, n) => s + n.p, 0) - 1) < 1e-9, 'tree leaves: 4, probabilities sum to 1');
check(balanceTilt(7, 7) === 0 && balanceTilt(6, 7) > 0 && balanceTilt(7, 6) < 0, 'balance tips toward the heavier pan');

// 5. Geometry: the inscribed angle is the same wherever D sits; a handle stays on its circle.
const f = geomFigure({ points: [{ id: 'O', x: 0, y: 0 }, { id: 'A', onCircle: 'c', angleDeg: 150 }, { id: 'B', onCircle: 'c', angleDeg: 30 }, { id: 'D', onCircle: 'c', angleDeg: 250 }], circles: [{ id: 'c', center: 'O', radius: 100 }], place: { x: 300, y: 200, s: 1 } });
const h = geomHandles(f, ['D'], { constrain: { D: 'c' } });
const angs = [200, 230, 270, 300, 340].map((a) => { h.move('D', { x: 300 + Math.cos((a * Math.PI) / 180) * 150, y: 200 + Math.sin((a * Math.PI) / 180) * 150 }); return angleAt(f, 'D', 'A', 'B'); });
const onC = Math.abs(Math.hypot(f.pt('D').x - 300, f.pt('D').y - 200) - 100) < 1e-6;
check(Math.max(...angs) - Math.min(...angs) < 1e-6 && Math.abs(angs[0] - 60) < 1e-6 && onC, `inscribed angle constant at ${angs[0].toFixed(2)} deg, D stays on the circle`);

process.exit(summary());
