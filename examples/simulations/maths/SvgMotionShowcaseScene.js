/**
 * SvgMotionShowcaseScene - reference for the live-layer motion recipes on the SvgScene clock:
 * kit/SimDrawOnSvg.js, kit/SimFlySvg.js and kit/SimFocusSvg.js. The numbers 1 to 12, even numbers and
 * multiples of 3:
 *   Beat 0: the box and two rings draw themselves on (drawOnPath, drawOnCircle with a pen); labels write on
 *   Beat 1: the 12 number chips fly from a row into their regions, staggered (flyMany via flyChip);
 *           "Back to row" / "Sort" retarget them, even mid-flight (the speed carries on)
 *   Beat 2: spotlight on the Even ring (spotlight + focusStyle); the even chips pulse in turn (indicate)
 *   Beat 3: spotlight on the overlap (a lens path), circumscribe (sweepSvg), then Flash on the answer
 * Tap skips a running build to its end; Replay runs it again. Portrait is its own layout.
 */
import { SvgScene, chip, liveChip, fill, tone } from 'simulations/base/kit/SimSvg.js';
import { flyChip, flying } from 'simulations/base/kit/SimFlySvg.js';
import { drawP, drawOnPath, drawOnCircle, circleD, pathLen, writeOnSvg } from 'simulations/base/kit/SimDrawOnSvg.js';
import { focusStyle, focusK, indicate, spotlight, sweepSvg, flashSvg, FLASH_S, SWEEP_S, INDICATE_S } from 'simulations/base/kit/SimFocusSvg.js';

const MAP = [0, 1, 2, 3].map((i) => [{ idx: i, dwellMs: null }]);
const NUMS = Array.from({ length: 12 }, (_, i) => i + 1);
const regionOf = (n) => (n % 2 === 0 ? (n % 3 === 0 ? 'both' : 'a') : (n % 3 === 0 ? 'b' : 'none'));
const TITLES = ['Draw the rings', 'Sort 1 to 12', 'Spotlight: even numbers', 'In both rings'];
const ENDS = [3.4, 0.3, 3.2, 3.0];
const B3 = { spot: 0.2, sweep: 0.5, flash: 1.5, say: 1.9 };
const LABEL = 'var(--sim-label)';
const ringFill = (col) => `color-mix(in oklab, ${col} 20%, transparent)`;
const f1 = (v) => v.toFixed(1);

function roundRectD(x, y, w, h, r) {
  return `M${f1(x + r)} ${f1(y)}H${f1(x + w - r)}A${r} ${r} 0 0 1 ${f1(x + w)} ${f1(y + r)}V${f1(y + h - r)}`
    + `A${r} ${r} 0 0 1 ${f1(x + w - r)} ${f1(y + h)}H${f1(x + r)}A${r} ${r} 0 0 1 ${f1(x)} ${f1(y + h - r)}`
    + `V${f1(y + r)}A${r} ${r} 0 0 1 ${f1(x + r)} ${f1(y)}Z`;
}

export class SvgMotionShowcaseScene extends SvgScene {
  static BEAT_STEP_MAP = MAP;
  static ARIA_LABEL = 'Numbers 1 to 12 in a box with two rings, even numbers and multiples of 3. The rings draw themselves, the numbers fly into their places, then the even ring and the overlap of 6 and 12 are spotlit.';
  static CONTROLS = [
    { type: 'button', id: 'sort', label: 'Sort' },
    { type: 'button', id: 'row', label: 'Back to row' },
    { type: 'button', id: 'replay', label: 'Replay' },
  ];

  stageHeight(st) { return st.portrait ? 500 : 440; }

  isControlHidden(id) { return (id === 'sort' || id === 'row') && this.stepIndex !== 1; }

  enter(step) {
    this.sorted = step >= 1;
    this.cheered = false;
    this.play(ENDS[step]);
  }

  onControlChange(id) {
    if (id === 'replay') { this.clockReset(); this.enter(this.stepIndex); }
    if (id === 'sort' || id === 'row') { this.sorted = id === 'sort'; this.liveFrame(); }
    this.requestUiUpdate?.();
  }

  pointerDown() {
    this.skip();
    return false;
  }

  /** Geometry for the current stage size. */
  geo(st) {
    const P = st.portrait, W = st.W, H = st.H;
    const box = P ? { x: 10, y: 12, w: W - 20, h: H - 126 } : { x: 18, y: 12, w: W - 36, h: H - 104 };
    const r = P ? 86 : 112, gap = P ? 52 : 72, cy = box.y + box.h * (P ? 0.56 : 0.55);
    const A = { x: W / 2 - gap, y: cy }, B = { x: W / 2 + gap, y: cy };
    const hh = Math.sqrt(r * r - gap * gap);
    const lens = `M${f1(W / 2)} ${f1(cy - hh)}A${r} ${r} 0 0 1 ${f1(W / 2)} ${f1(cy + hh)}A${r} ${r} 0 0 1 ${f1(W / 2)} ${f1(cy - hh)}Z`;
    const dx = P ? 40 : 48, dy = P ? 26 : 30;
    const aX = A.x - r + (P ? 30 : 36), bX = B.x + r - (P ? 30 : 40);
    const slots = {
      a: [[aX, cy - dy], [aX + dx, cy - dy], [aX, cy + dy], [aX + dx, cy + dy]],
      both: [[W / 2, cy - dy], [W / 2, cy + dy]],
      b: [[bX, cy - dy], [bX, cy + dy]],
      none: P
        ? [[box.x + 32, box.y + 66], [box.x + box.w - 32, box.y + 66], [box.x + 32, box.y + box.h - 26], [box.x + box.w - 32, box.y + box.h - 26]]
        : [[box.x + 38, box.y + 70], [box.x + box.w - 38, box.y + 70], [box.x + 38, box.y + box.h - 32], [box.x + box.w - 38, box.y + box.h - 32]],
    };
    const used = { a: 0, both: 0, b: 0, none: 0 };
    const home = {}, tray = {};
    for (const n of NUMS) {
      const s = slots[regionOf(n)][used[regionOf(n)]++];
      home[n] = { x: s[0], y: s[1] };
      const i = n - 1;
      tray[n] = P
        ? { x: 34 + (i % 6) * ((W - 68) / 5), y: H - 84 + Math.floor(i / 6) * 42 }
        : { x: 36 + i * ((W - 72) / 11), y: H - 46 };
    }
    return { P, W, H, box, r, A, B, lens, home, tray, capY: P ? H - 62 : H - 46 };
  }

  paint(st) {
    const w = st.W - 4, h = st.H - 14;
    const card = `<rect x="2" y="9" width="${w}" height="${h}" rx="24" ${fill('color-mix(in oklab, var(--sim-stroke) 70%, var(--sim-bg-deep))')}/>`
      + `<rect x="2" y="2" width="${w}" height="${h}" rx="24" ${fill('var(--sim-bg-surface)', 'stroke:var(--sim-stroke);stroke-width:2')}/>`;
    const title = TITLES[this.stepIndex];
    return { svg: card, head: chip(title, 0, 0, { tone: 'plain', size: st.portrait && title.length > 18 ? null : 'big', static: true }) };
  }

  animate(st, t) {
    const live = this.live, g = this.geo(st), step = this.stepIndex;
    // Beat 0 draws everything on; later beats show the drawn rest state (p = 1).
    const at = (delay, d) => (step === 0 ? drawP(t, { delay, dur: d }) : 1);
    const boxD = roundRectD(g.box.x, g.box.y, g.box.w, g.box.h, 18);
    drawOnPath(live, 'box', boxD, at(0, 0.9), { stroke: 'var(--sim-label-muted)', lw: 3 });

    // Ring tones: base, or a focus state (beat 2: the Even ring is the one focus colour).
    const parts = [{ id: 'a', base: tone(1) }, { id: 'b', base: tone(2) }];
    const tn = focusStyle(parts, step === 2 ? 'a' : null);
    // Stroke with the tone itself (a darkened edge sinks into the dark theme); a stepped-down ring keeps its muted edge.
    const line = (col) => (col.role === 'down' ? col.edge : col.fill);
    const ring = (key, c, delay, col) => drawOnCircle(live, key, c.x, c.y, g.r, at(delay, 1.0),
      { stroke: line(col), lw: 4, fill: ringFill(col.fill), pen: step === 0 ? line(col) : null });
    ring('ringA', g.A, 0.5, tn.a);
    ring('ringB', g.B, 0.9, tn.b);
    const ink = (col, n) => (col.role === 'down' ? col.ink : col.role === 'focus' ? 'var(--sim-accent)' : `var(--sim-series-${n}-ink)`);

    // Labels write on in beat 0 and rest written after that.
    const wt = (d) => (step === 0 ? t - d : 9);
    const ly = g.A.y - g.r - (g.P ? 14 : 12);
    writeOnSvg(live, 'labA', 'Even', g.A.x - g.r * (g.P ? 0.4 : 0.55), ly, wt(1.5), { size: g.P ? 20 : 24, col: ink(tn.a, 1), align: 'center' });
    writeOnSvg(live, 'labB', 'Multiples of 3', g.B.x + g.r * (g.P ? 0.1 : 0.55), ly, wt(1.9), { size: g.P ? 20 : 24, col: ink(tn.b, 2), align: 'center' });
    writeOnSvg(live, 'labU', 'U = 1 to 12', g.box.x + 16, g.box.y + 30, wt(0.7), { size: 18, weight: 700, col: 'var(--sim-label-muted)' });

    // The spotlight: the Even ring in beat 2, the overlap in beat 3.
    let spot = null;
    if (step === 2) spot = spotlight(live, 'spot', circleD(g.A.x, g.A.y, g.r), focusK(t - 0.2, 0.4), { edge: false });
    if (step === 3) spot = spotlight(live, 'spot', g.lens, focusK(t - B3.spot, 0.4));

    if (step >= 1) this.chips(live, g, t, spot);
    if (step === 3) {
      sweepSvg(live, 'sweep', g.lens, pathLen(live, g.lens), (t - B3.sweep) / SWEEP_S, { lw: 4 });
      flashSvg(live, 'flash', g.W / 2, g.A.y, (t - B3.flash) / FLASH_S, { r: 30 });
    }

    // Captions.
    const cap = [['Two rings in a box', 2.6], null, ['6 numbers are even', 2.2], ['6 and 12 are in both', B3.say]][step];
    if (cap) writeOnSvg(live, 'cap', cap[0], g.W / 2, g.capY + 10, t - cap[1], { size: g.P ? 24 : 28, col: LABEL, align: 'center', dur: 0.7 });
    if (step === 3 && t >= ENDS[3] && !this.cheered) { this.cheered = true; this.celebrate(); }
  }

  chips(live, g, t, spot) {
    const step = this.stepIndex;
    const evens = NUMS.filter((n) => n % 2 === 0);
    NUMS.forEach((n, i) => {
      const to = step === 1 && !this.sorted ? g.tray[n] : g.home[n];
      // Beat 1 starts every chip in the row; later beats mount them at rest in place.
      const from = step === 1 ? g.tray[n] : null;
      let scale = 1;
      // The even chips pulse in turn (manim Indicate), 0.22 s apart from 0.6 s.
      if (step === 2 && n % 2 === 0) scale = indicate((t - 0.6 - evens.indexOf(n) * 0.22) / INDICATE_S, 0.35).s;
      if (step === 3 && regionOf(n) === 'both') scale = indicate((t - B3.flash) / INDICATE_S, 0.35).s;
      const inside = spot ? spot.inside(g.home[n].x, g.home[n].y) : true;
      const alpha = spot && !inside ? 0.35 : 1;
      flyChip(live, `n${n}`, String(n), from, to, { delay: 0.25 + i * 0.12, arc: g.P ? 30 : 46, tone: 'plain', alpha, scale });
    });
    if (step === 1 && !flying(live) && this.sorted) liveChip(live, 'done', 'Every number has one place', g.W / 2, g.capY + 2, { tone: 'good', cls: 'sv-pop' });
  }
}
