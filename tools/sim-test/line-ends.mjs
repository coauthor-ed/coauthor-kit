// Adapted from anatomy@e6600ff scripts/line-ends.mjs (MIT, (c) 2026 Ryan)
// The rule and its tolerances (tolerance, root slack, short-mark length) are anatomy's; anatomy walks SVG
// DOM, this replays the recorded canvas calls of the settled frame at each beat, so the code is original.
// line-ends - docs/simulation-authoring.md 4.7: lines never stop in mid-air; end on a face, a dot or a fade.
//
//   node tools/sim-test/run.mjs exec tools/sim-test/line-ends.mjs <scene | L0N/Scene> [beats] [--bundle <b>] [--verbose]
//
// Canvas scenes only. For each beat: onBeatChange, run the fake clock until the loop parks (6 s if
// CONTINUOUS), keep the last frame drawn. Every stroked OPEN path in it must end on something:
//   - another stroke (open or outline) within 3 px, or a text label within 8 px
//   - a fill painted after it (the line goes under the face) or within 3 px of a fill's edge
//   - a small filled shape (a dot, under ~3000 px2) painted before it
//   - the picture frame (the biggest fill): an end outside it or on its edge is cut off, not loose
//   - a clip() region: an end outside the clip or on its edge was cut by it
//   - texture: a line whose BOTH ends sit inside one earlier, non-backdrop fill (hatching, folds, cristae)
//   - 4+ loose ends of one colour and width in a beat are reported as ONE pattern line
//   - skipped as fades: a gradient stroke, a dashed line, a stroke under 45% opacity (grid lines, guides)
// A long line needs BOTH ends anchored; a short open path (under 24 px: a tick, an arrowhead) needs ONE
// anchored point anywhere on it. WARN only, exit 0. Opt-in: not part of check-scene.
// Beat text is the settled state only: a line that is mid-draw is judged when it has finished.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { installFakeHost, createDrawCtx, makeContainer, pumpFrame } from './harness.mjs';
import { resolveTarget, describeMiss, bundleFromArg } from './lib/bundle.mjs';
import { parseArgs } from './lib/args.mjs';

const TOL = 3, TEXT_TOL = 8, SHORT = 24, DOT_AREA = 3000, MIN_ALPHA = 0.45;
const STATE = ['fillStyle', 'strokeStyle', 'lineWidth', 'globalAlpha', 'font'];

// ctx wrapper: logs method calls and the draw-state property sets in order (harness ctx only keeps calls).
function loggingCtxFactory(log) {
  return () => {
    const inner = createDrawCtx();
    return new Proxy(inner, {
      get(t, prop) {
        if (prop === '_events') return log;
        const v = t[prop];
        if (typeof v !== 'function' || typeof prop !== 'string') return v;
        return (...args) => { log.push({ m: prop, a: args }); return v.apply(t, args); };
      },
      set(t, prop, v) { if (STATE.includes(prop)) log.push({ s: prop, v }); t[prop] = v; return true; },
    });
  };
}

const alphaOf = (c) => {
  if (typeof c !== 'string') return 1;
  const m = /^(?:rgba|hsla)\([^)]*[,/]\s*([\d.]+)(%?)\s*\)$/i.exec(c);
  if (m) return m[2] ? parseFloat(m[1]) / 100 : parseFloat(m[1]);
  const h = /^#[0-9a-f]{6}([0-9a-f]{2})$/i.exec(c);
  return h ? parseInt(h[1], 16) / 255 : 1;
};

// Replay one frame's events into strokes, fills, rect/text anchors, in painting order.
function replay(events) {
  const out = { strokes: [], fills: [], texts: [] };
  let m = [1, 0, 0, 1, 0, 0];
  const st = { fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, globalAlpha: 1, font: '10px sans-serif', dash: false, clip: null };
  const stack = [];
  let subs = [], cur = null, order = 0;
  const ap = (x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  const sc = () => Math.hypot(m[0], m[1]) || 1;
  const mul = (n) => { m = [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]]; };
  const open = (x, y) => { cur = { pts: [ap(x, y)], closed: false }; subs.push(cur); };
  const lineTo = (x, y) => { if (!cur) open(x, y); else cur.pts.push(ap(x, y)); };
  const num = (a, n) => a.slice(0, n).every((v) => typeof v === 'number' && Number.isFinite(v));
  function arc(x, y, rx, ry, rot, a0, a1, ccw) {
    let d = a1 - a0;
    if (!ccw && d < 0) d = ((d % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    if (ccw && d > 0) d = -(((-d) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const full = Math.abs(a1 - a0) >= 2 * Math.PI - 1e-6;
    if (full) d = ccw ? -2 * Math.PI : 2 * Math.PI;
    const n = Math.max(6, Math.ceil(Math.abs(d) / (Math.PI / 12)));
    for (let i = 0; i <= n; i++) {
      const a = a0 + (d * i) / n, ex = rx * Math.cos(a), ey = ry * Math.sin(a);
      const px = x + ex * Math.cos(rot) - ey * Math.sin(rot), py = y + ex * Math.sin(rot) + ey * Math.cos(rot);
      if (i === 0 && !cur) open(px, py); else lineTo(px, py);
    }
    if (full) cur.closed = true;
  }
  const poly = (pts) => subs.push((cur = { pts: pts.map(([x, y]) => ap(x, y)), closed: true }));
  for (const e of events) {
    if (e.s) { st[e.s] = e.v; continue; }
    const a = e.a;
    switch (e.m) {
      case 'setLineDash': st.dash = Array.isArray(a[0]) && a[0].length > 0; break;
      case 'clip': if (typeof a[0] !== 'object') st.clip = (st.clip || []).concat(subs.filter((q) => q.pts.length > 2).map((q) => q.pts)); break;
      case 'save': stack.push({ m: m.slice(), st: { ...st } }); break;
      case 'restore': { const t = stack.pop(); if (t) { m = t.m; Object.assign(st, t.st); } break; }
      case 'translate': mul([1, 0, 0, 1, +a[0] || 0, +a[1] || 0]); break;
      case 'scale': mul([+a[0] || 0, 0, 0, +(a[1] ?? a[0]) || 0, 0, 0]); break;
      case 'rotate': mul([Math.cos(+a[0] || 0), Math.sin(+a[0] || 0), -Math.sin(+a[0] || 0), Math.cos(+a[0] || 0), 0, 0]); break;
      case 'transform': mul(a.map((v) => +v || 0)); break;
      case 'resetTransform': m = [1, 0, 0, 1, 0, 0]; break;
      case 'setTransform': m = a[0] && typeof a[0] === 'object' ? [a[0].a ?? 1, a[0].b ?? 0, a[0].c ?? 0, a[0].d ?? 1, a[0].e ?? 0, a[0].f ?? 0] : a.length >= 6 ? a.slice(0, 6).map((v) => +v || 0) : [1, 0, 0, 1, 0, 0]; break;
      case 'beginPath': subs = []; cur = null; break;
      case 'moveTo': if (num(a, 2)) open(a[0], a[1]); break;
      case 'lineTo': if (num(a, 2)) lineTo(a[0], a[1]); break;
      case 'closePath': if (cur) { cur.closed = true; const p0 = cur.pts[0]; cur = { pts: [p0], closed: false }; subs.push(cur); } break;
      case 'arc': if (num(a, 5)) arc(a[0], a[1], a[2], a[2], 0, a[3], a[4], !!a[5]); break;
      case 'ellipse': if (num(a, 7)) arc(a[0], a[1], a[2], a[3], a[4], a[5], a[6], !!a[7]); break;
      case 'quadraticCurveTo': if (cur && num(a, 4)) { const [x0, y0] = cur.pts[cur.pts.length - 1]; const inv = ((q) => { const d = m[0] * m[3] - m[1] * m[2]; return [(m[3] * (q[0] - m[4]) - m[2] * (q[1] - m[5])) / d, (-m[1] * (q[0] - m[4]) + m[0] * (q[1] - m[5])) / d]; })([x0, y0]); for (let i = 1; i <= 8; i++) { const t = i / 8, u = 1 - t; lineTo(u * u * inv[0] + 2 * u * t * a[0] + t * t * a[2], u * u * inv[1] + 2 * u * t * a[1] + t * t * a[3]); } } break;
      case 'bezierCurveTo': if (cur && num(a, 6)) { const [x0, y0] = cur.pts[cur.pts.length - 1]; const d = m[0] * m[3] - m[1] * m[2]; const px = (m[3] * (x0 - m[4]) - m[2] * (y0 - m[5])) / d, py = (-m[1] * (x0 - m[4]) + m[0] * (y0 - m[5])) / d; for (let i = 1; i <= 10; i++) { const t = i / 10, u = 1 - t; lineTo(u ** 3 * px + 3 * u * u * t * a[0] + 3 * u * t * t * a[2] + t ** 3 * a[4], u ** 3 * py + 3 * u * u * t * a[1] + 3 * u * t * t * a[3] + t ** 3 * a[5]); } } break;
      case 'arcTo': if (num(a, 4)) lineTo(a[0], a[1]); break;
      case 'rect': if (num(a, 4)) poly([[a[0], a[1]], [a[0] + a[2], a[1]], [a[0] + a[2], a[1] + a[3]], [a[0], a[1] + a[3]]]); break;
      case 'roundRect': if (num(a, 4)) poly([[a[0], a[1]], [a[0] + a[2], a[1]], [a[0] + a[2], a[1] + a[3]], [a[0], a[1] + a[3]]]); break;
      case 'fillRect': if (num(a, 4) && a[2] && a[3]) { const s = subs, c = cur; subs = []; poly([[a[0], a[1]], [a[0] + a[2], a[1]], [a[0] + a[2], a[1] + a[3]], [a[0], a[1] + a[3]]]); out.fills.push({ polys: subs.map((q) => q.pts), order: order++, alpha: alphaOf(st.fillStyle) * st.globalAlpha }); subs = s; cur = c; } break;
      case 'strokeRect': if (num(a, 4)) { const s = subs, c = cur; subs = []; poly([[a[0], a[1]], [a[0] + a[2], a[1]], [a[0] + a[2], a[1] + a[3]], [a[0], a[1] + a[3]]]); out.strokes.push({ pts: subs[0].pts.concat([subs[0].pts[0]]), closed: true, order: order++, alpha: alphaOf(st.strokeStyle) * st.globalAlpha, lw: st.lineWidth * sc(), s: sc(), col: String(st.strokeStyle), grad: typeof st.strokeStyle !== 'string', dash: st.dash, clip: st.clip }); subs = s; cur = c; } break;
      case 'fill': if (typeof a[0] !== 'object') out.fills.push({ polys: subs.filter((q) => q.pts.length > 2).map((q) => q.pts), order: order++, alpha: alphaOf(st.fillStyle) * st.globalAlpha }); break;
      case 'stroke': if (typeof a[0] !== 'object') for (const q of subs) if (q.pts.length > 1) out.strokes.push({ pts: q.pts, closed: q.closed, order: order++, alpha: alphaOf(st.strokeStyle) * st.globalAlpha, lw: st.lineWidth * sc(), s: sc(), col: String(st.strokeStyle), grad: typeof st.strokeStyle !== 'string', dash: st.dash, clip: st.clip }); break;
      case 'fillText': case 'strokeText': if (typeof a[1] === 'number' && typeof a[2] === 'number') {
        const px = +(/(\d+(?:\.\d+)?)px/.exec(st.font) || [0, 10])[1] * sc(), w = String(a[0]).length * px * 0.55, [x, y] = ap(a[1], a[2]);
        out.texts.push({ x0: x - w / 2 - 0, y0: y - px, x1: x + w / 2 + w, y1: y + px * 0.3 });   // generous in x: align is not tracked
        out.texts[out.texts.length - 1].x0 = x - w; } break;
      default: break;
    }
  }
  const big = out.fills.flatMap((f) => f.polys).map((q) => q.map((v) => v)).sort((x, y) => areaBox(y) - areaBox(x))[0];
  if (big) { const xs = big.map((v) => v[0]), ys = big.map((v) => v[1]); out.frame = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; }
  return out;
}

const dSeg = (p, a, b) => {
  const vx = b[0] - a[0], vy = b[1] - a[1], l2 = vx * vx + vy * vy;
  const t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / l2)) : 0;
  return Math.hypot(p[0] - (a[0] + t * vx), p[1] - (a[1] + t * vy));
};
const inside = (p, poly) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    if ((poly[i][1] > p[1]) !== (poly[j][1] > p[1]) && p[0] < ((poly[j][0] - poly[i][0]) * (p[1] - poly[i][1])) / (poly[j][1] - poly[i][1]) + poly[i][0]) c = !c;
  }
  return c;
};
const areaBox = (poly) => { const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]); return (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys)); };
const lenOf = (pts) => pts.reduce((s, p, i) => s + (i ? Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0);

function anchored(p, self, fr) {
  const tol = TOL * self.s;
  const f = fr.frame;
  if (f && (p[0] < f[0] + tol || p[0] > f[2] - tol || p[1] < f[1] + tol || p[1] > f[3] - tol)) return true;
  if (self.clip && self.clip.length && !self.clip.some((q) => inside(p, q) && !q.some((v, i) => dSeg(p, q[(i + q.length - 1) % q.length], v) <= tol))) return true;
  for (const o of fr.strokes) {
    if (o === self || o.alpha < MIN_ALPHA * 0.5) continue;
    const t = tol + o.lw / 2;
    for (let i = 1; i < o.pts.length; i++) if (dSeg(p, o.pts[i - 1], o.pts[i]) <= t) return true;
  }
  for (const f of fr.fills) {
    if (f.alpha < MIN_ALPHA) continue;
    for (const poly of f.polys) {
      const small = areaBox(poly) <= DOT_AREA * self.s * self.s;
      const edge = poly.some((q, i) => dSeg(p, poly[(i + poly.length - 1) % poly.length], q) <= tol);
      if (edge) return true;
      if (inside(p, poly) && (f.order > self.order || small)) return true;
    }
  }
  const tt = TEXT_TOL * self.s;
  return fr.texts.some((b) => p[0] >= b.x0 - tt && p[0] <= b.x1 + tt && p[1] >= b.y0 - tt && p[1] <= b.y1 + tt);
}

/** Loose ends in one frame's replay: [{x, y, len}] in canvas px. */
export function looseEnds(fr) {
  const loose = [];
  for (const s of fr.strokes) {
    if (s.closed || s.grad || s.dash || s.alpha < MIN_ALPHA) continue;
    const len = lenOf(s.pts);
    if (len < 1.5) continue;
    const ends = [s.pts[0], s.pts[s.pts.length - 1]];
    const big = fr.frame ? (fr.frame[2] - fr.frame[0]) * (fr.frame[3] - fr.frame[1]) * 0.5 : Infinity;
    if (fr.fills.some((f) => f.alpha >= MIN_ALPHA && f.order < s.order && f.polys.some((q) => areaBox(q) < big && inside(ends[0], q) && inside(ends[1], q)))) continue;
    if (len <= SHORT * s.s) {
      if (!s.pts.some((p) => anchored(p, s, fr))) loose.push({ x: ends[0][0], y: ends[0][1], len, key: s.col + '|' + s.lw });
    } else for (const e of ends) if (!anchored(e, s, fr)) loose.push({ x: e[0], y: e[1], len, key: s.col + '|' + s.lw });
  }
  return loose;
}

/** Run the scene file under the sim-test loader; returns { warn: [], fail: [], beats }. */
export async function lineEnds(sceneFile, opts = {}) {
  const warn = [], fail = [], log = [];
  installFakeHost(loggingCtxFactory(log));
  const mod = await import(pathToFileURL(path.resolve(sceneFile)).href);
  const S = Object.values(mod).find((v) => typeof v === 'function' && typeof v.prototype?.setup === 'function');
  if (!S) { fail.push(`no scene class exported by ${sceneFile}`); return { warn, fail, beats: 0 }; }
  const beats = opts.beats || S.BEAT_STEP_MAP?.length || 1;
  const sc = new S(makeContainer());
  sc.requestUiUpdate = () => {};
  sc.allowResume = true;
  await sc.setup();
  if (!log.length && !sc._ctx) { warn.push('no canvas drawn (DOM scene?): skipped'); return { warn, fail, beats }; }
  sc.start();
  for (let b = 0; b < beats; b++) {
    sc.onBeatChange?.(b, beats);
    let frame = null;
    const horizon = S.CONTINUOUS === true ? 6000 : 12000;
    for (let t = 0; t < horizon; t += 16.7) {
      log.length = 0;
      const ran = pumpFrame(16.7);
      if (ran && log.length) frame = log.slice();
      else if (!ran && frame) break;
    }
    if (!frame) { warn.push(`beat ${b}: nothing drawn`); continue; }
    const ends = looseEnds(replay(frame));
    // Four or more loose ends of one colour and width are a pattern (spokes, hatching, ticks): one line for the group.
    const groups = new Map();
    for (const e of ends) groups.set(e.key, (groups.get(e.key) || []).concat(e));
    const single = [];
    for (const g of groups.values()) {
      if (g.length >= 4) warn.push(`beat ${b}: ${g.length} loose ends of one colour and width (repeated marks, probably texture) from (${Math.round(g[0].x)}, ${Math.round(g[0].y)})`);
      else single.push(...g);
    }
    const seen = new Set();
    for (const e of single) {
      const k = `${Math.round(e.x / 4)},${Math.round(e.y / 4)}`;
      if (seen.has(k)) continue;
      seen.add(k);
      warn.push(`beat ${b}: loose line end at (${Math.round(e.x)}, ${Math.round(e.y)}) on a ${Math.round(e.len)} px line`);
    }
  }
  sc.stop?.();
  return { warn, fail, beats };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const USAGE = 'node tools/sim-test/run.mjs exec tools/sim-test/line-ends.mjs <scene.js | L0N/Scene | Scene> [beats] [--bundle <id|dir>]';
  const A = parseArgs(process.argv.slice(2), { tool: 'line-ends', file: import.meta.url, usage: USAGE, val: ['bundle'] });
  const target = A.pos.find((x) => !/^\d+$/.test(x));
  if (!target) { console.error(`usage: ${USAGE}`); process.exit(2); }
  const bundle = bundleFromArg(A.val('bundle'));
  const t = fs.existsSync(target) && fs.statSync(target).isFile() ? { kind: 'scene', file: path.resolve(target) } : resolveTarget(target, bundle);
  if (!t || t.kind !== 'scene') { console.error(describeMiss(target, bundle)); process.exit(2); }
  const beats = Number(A.pos.find((x) => /^\d+$/.test(x))) || 0;
  const r = await lineEnds(t.file, { beats });
  for (const w of r.warn) console.log(`WARN  ${path.basename(t.file)}: ${w}`);
  for (const f of r.fail) console.log(`FAIL  ${path.basename(t.file)}: ${f}`);
  console.log(`line-ends ${path.basename(t.file)}: ${r.beats} beat(s), ${r.warn.length} warn`);
  process.exit(r.fail.length ? 1 : 0);
}
