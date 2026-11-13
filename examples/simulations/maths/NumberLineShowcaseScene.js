/**
 * NumberLineShowcaseScene - reference for kit/SimNumberLine.js (SVG, DOM).
 * Beats: 0 hops on the integers (a hopper rides each arc), 1 drag a pin to
 * 5/4 on a quarters line, 2 a zoom lens from tenths to hundredths, 3 the 0-1
 * chance line. Lays out for the stage width: portrait is its own layout.
 */
import { SvgScene, chip } from 'simulations/base/kit/SimSvg.js';
import { numberLine, probTrack, numberLineSvg, markerSvg, hopSvg, hopPath, spanSvg, lensSvg, fracLabel, join, NUMBER_LINE_CSS } from 'simulations/base/kit/SimNumberLine.js';
import { fmtNum, fracHtml, rootHtml } from 'simulations/base/kit/SimText.js';

const MAP = [0, 1, 2, 3].map((i) => [{ idx: i, dwellMs: null }]);
const HOP_S = 0.7;
const EVENTS = [{ v: 0, text: 'roll a 7 on one die', tone: 'bad' }, { v: 1 / 6, text: 'roll a 6', tone: 8 }, { v: 0.5, text: 'a coin lands heads', tone: 'warning' }, { v: 1, text: 'Monday after Sunday', tone: 'good' }];
const HOPPER = '<svg viewBox="-30 -30 60 60" width="56" height="56" aria-hidden="true"><circle cy="4" r="26" style="fill:color-mix(in oklab, var(--sim-series-2) 60%, black)"/><circle r="26" style="fill:var(--sim-series-2)"/>'
  + '<circle cx="-9" cy="-3" r="6" style="fill:color-mix(in oklab, var(--sim-series-2) 6%, white)"/><circle cx="9" cy="-3" r="6" style="fill:color-mix(in oklab, var(--sim-series-2) 6%, white)"/>'
  + '<circle cx="-8" cy="-2" r="3.2" style="fill:var(--sim-bg-deep)"/><circle cx="10" cy="-2" r="3.2" style="fill:var(--sim-bg-deep)"/>'
  + '<path d="M-7 8q7 7 14 0" style="fill:none;stroke:var(--sim-bg-deep);stroke-width:3;stroke-linecap:round"/><circle cx="-9" cy="-13" r="4" style="fill:color-mix(in oklab, var(--sim-series-2) 30%, white);opacity:0.6"/></svg>';

const CSS = NUMBER_LINE_CSS + `
.nl-hopper { position: absolute; left: 0; top: 0; width: 56px; height: 56px; margin: -52px 0 0 -28px; offset-rotate: 0deg; }
.nl-hopper--go { animation: nl-hop ${HOP_S}s ease-in-out both; }
@keyframes nl-hop { from { offset-distance: 0%; } to { offset-distance: 100%; } }
.nl-hopper--land { animation: nl-land 0.45s ease; transform-origin: 50% 100%; }
@keyframes nl-land { 30% { transform: scale(1.25, 0.75); } 60% { transform: scale(0.92, 1.08); } }
`;

export class NumberLineShowcaseScene extends SvgScene {
  static BEAT_STEP_MAP = MAP;
  static ARIA_LABEL = 'Number lines: a hopper jumps along the integers, a pin is dragged to five quarters, a lens zooms from tenths to hundredths, and events sit on the chance line from impossible to certain.';
  static CONTROLS = [
    { type: 'button', id: 'plus', label: 'Hop +3' },
    { type: 'button', id: 'minus', label: 'Hop \u22122' },
    { type: 'button', id: 'again', label: 'Start again' },
  ];

  css() { return CSS; }
  enter() { this.at = 0; this.hops = []; this.hop = null; this.q = 0.5; this.found = false; this.landed = false; }
  isControlHidden(id) { return this.stepIndex !== 0 || (id === 'again' && !this.hops?.length); }
  isControlDisabled() { return !!this.hop; }

  onControlChange(id) {
    if (this.isControlHidden(id) || this.hop) return;
    if (id === 'again') { this.enter(); this.repaint(); this.requestUiUpdate?.(); return; }
    const d = id === 'plus' ? 3 : -2, to = this.at + d;
    if (to < -5 || to > 5) return;
    this.hop = { from: this.at, to, d };
    this.landed = false;
    this.repaint();
    this.after(HOP_S, () => { this.at = to; this.hops.push(this.hop); if (this.hops.length > 3) this.hops.shift(); this.hop = null; this.landed = true; this.repaint(); this.requestUiUpdate?.(); });
    this.requestUiUpdate?.();
  }

  stageHeight(st) { return st.portrait ? ([420, 380, 440, 400][this.stepIndex ?? 0]) : 400; }

  // Lines for the current stage size (portrait: narrower, labels thin out).
  lines(st) {
    const R = { x: 0, y: 0, w: st.W, h: st.H };
    return {
      int: numberLine({ rect: R, min: -5, max: 5, step: 1, at: 0.6 }),
      q: numberLine({ rect: R, min: 0, max: 2, step: 1, minor: 4, labels: 'frac', at: 0.5 }),
      t: numberLine({ rect: { ...R, h: st.H * 0.4 }, min: 1, max: 2, step: 0.1, labels: 'dec', at: 0.6 }),
      h: numberLine({ rect: { x: st.W * 0.06, y: st.H * 0.52, w: st.W * 0.88, h: st.H * 0.4 }, min: 1.4, max: 1.5, step: 0.01, labels: 'dec', dp: 2, at: 0.5 }),
      p: probTrack({ rect: { ...R, h: st.H * 0.9 }, at: 0.55 }),
    };
  }

  pointerDown(p) {
    if (this.stepIndex !== 1) return false;
    const nl = this.lines(this.sv).q;
    if (Math.abs(p.y - nl.y) > 70) return false;
    this.q = nl.snap(p.x);
    return true;
  }
  pointerMove(p) {
    const q = this.lines(this.sv).q.snap(p.x);
    if (q === this.q) return false;
    this.q = q;
    return true;
  }
  pointerUp() {
    if (!this.found && Math.abs(this.q - 1.25) < 1e-6) { this.found = true; this.celebrate(); this.requestUiUpdate?.(); }
  }

  paint(st) {
    const L = this.lines(st);
    return [this.hopsView, this.quarters, this.zoom, this.chance][this.stepIndex].call(this, st, L);
  }

  hopsView(st, L) {
    const nl = L.int, h = this.hop;
    const eq = this.hops.length || h ? ['0', ...[...this.hops, ...(h ? [h] : [])].map((q) => `${q.d > 0 ? '+' : '\u2212'} ${Math.abs(q.d)}`), `= ${h ? '?' : fmtNum(this.at)}`].join(' ') : 'start at 0';
    const parts = [numberLineSvg(nl), ...this.hops.map((q) => hopSvg(nl, q.from, q.to, { tone: q.d > 0 ? 3 : 4, text: `${q.d > 0 ? '+' : '\u2212'}${Math.abs(q.d)}` }))];
    if (h) parts.push(hopSvg(nl, h.from, h.to, { tone: h.d > 0 ? 3 : 4, draw: true }));
    const out = join(...parts);
    const path = h ? hopPath(nl, h.from, h.to) : null;
    const rest = `left:${nl.x(this.at)}px;top:${nl.y - 8}px`;
    out.over += h ? `<div class="nl-hopper nl-hopper--go" style="offset-path:path('${path}')">${HOPPER}</div>`
      : `<div class="nl-hopper${this.landed ? ' nl-hopper--land' : ''}" style="${rest}">${HOPPER}</div>`;
    return { ...out, floor: nl.y + 70, head: chip(eq, 0, 0, { tone: 2, size: 'big', static: true }) };
  }

  quarters(st, L) {
    const nl = L.q;
    const lab = fracLabel(this.q, 4);
    const text = `${Array.isArray(lab) ? fracHtml(lab[1], lab[2]) : lab} = ${fmtNum(this.q, { dp: 2 })}`;
    const parts = [numberLineSvg(nl), spanSvg(nl, 1, 2, { text: 'four quarters make 1', tone: 5, drop: 78 })];
    if (!this.found) parts.push({ svg: `<g class="sv-breathe"><line x1="${nl.x(1.25)}" y1="${nl.y}" x2="${nl.x(1.25)}" y2="${nl.y - 32}" style="stroke:var(--sim-accent);stroke-width:3;stroke-dasharray:4 5"/><circle cx="${nl.x(1.25)}" cy="${nl.y - 46}" r="15" style="fill:none;stroke:var(--sim-accent);stroke-width:3;stroke-dasharray:4 5"/></g>` });
    parts.push(markerSvg(nl, this.q, { tone: this.found ? 'good' : 'accent', grab: true, text, math: true }));
    const task = this.found ? `found ${fracHtml(5, 4)}!` : `drag the pin to ${fracHtml(5, 4)}`;
    return { ...join(...parts), head: chip(task, 0, 0, { tone: this.found ? 'good' : 'accent', size: 'big', static: true, math: true }) };
  }

  zoom(st, L) {
    const out = join(numberLineSvg(L.t), lensSvg(L.t, 1.4, 1.5, L.h, { tone: 5 }), numberLineSvg(L.h, { tone: 5, labelSize: 16 }),
      markerSvg(L.t, 1.414, { tone: 2, lift: 36 }), markerSvg(L.h, 1.414, { tone: 2, pop: 0.2, text: `${rootHtml('2')} \u2248 1.414`, math: true }));
    out.over += chip('tenths', 44, 24, { tone: 1, size: 'sm' }) + chip('hundredths', st.W - 64, L.h.y + 60, { tone: 5, size: 'sm' });
    return out;
  }

  chance(st, L) {
    const nl = L.p;
    const lifts = st.portrait ? [150, 104, 150, 104] : [130, 84, 130, 84];
    return join(numberLineSvg(nl, { arrows: false }), ...EVENTS.map((e, i) => markerSvg(nl, e.v, { tone: e.tone, lift: lifts[i], text: e.text, pop: 0.2 + i * 0.35 })));
  }
}
