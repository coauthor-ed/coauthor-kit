import { DomSimulation } from 'simulations/base/DomSimulation.js';

/**
 * ShiftSubtractScene - companion to blk-l07-s07; DOM port of ShiftSubtractScene.canvas.js.reference, the
 * flagship example for docs/simulation-authoring.md SS3.3 (pick-by-content-shape).
 * Beat 0: x = 0.7777... , then 10x slides in, rule, 9x = 7. Beat 1: magnifier column-aligns the tails, 7/9 builds.
 * Beat 2: same for 100x = 27.2727... -> 99x = 27 -> 27/99 -> 3/11. Why DOM: fixed place-value grid columns,
 * shiftRow() moves digits by real CSS-transform distances, one aria-label per row. Memory-less mount, no _tick.
 * Panels (.ss-panels) stay in one column: a wide side-by-side canvas left single-panel beats at half scale.
 */

const W = 520;
const H = 510;

const STEPS = [
  { type: 'e1_build' },   // 0  example 1: minuend, subtrahend, rule, result
  { type: 'magnify' },    // 1  magnifier panel + solved fraction
  { type: 'e2_build' },   // 2  example 2: full chain + cancel stamp
];
const STEP_E1_BUILD = 0;
const STEP_MAGNIFY = 1;
const STEP_E2_BUILD = 2;
const STEP_TERMINAL = 2;

/** Maps blk-l07-s07's three markdown beats (3 entries). Clamps. */
const BEAT_STEP_MAP = [
  [{ idx: STEP_E1_BUILD, dwellMs: null }],
  [{ idx: STEP_MAGNIFY, dwellMs: null }],
  [{ idx: STEP_E2_BUILD, dwellMs: null }],
];

// Fixed pixel columns; colCenter() uses widths to compute shift distances (needs px, not % or fr).
function defineCols(widths, names) {
  return { widths, template: widths.map((w) => `${w}px`).join(' '), ...names };
}
// sign gets its own column so it never disturbs digit alignment.
const E1_COLS = defineCols(
  [16, 70, 26, 16, 26, 26, 26, 26, 26],
  { sign: 1, label: 2, units: 3, dot: 4, tail: [5, 6, 7, 8], ellipsis: 9 },
);
const E2_COLS = defineCols(
  [16, 78, 26, 26, 16, 26, 26, 26, 26, 26],
  { sign: 1, label: 2, tens: 3, units: 4, dot: 5, tail: [6, 7, 8, 9], ellipsis: 10 },
);
// Magnifier rows reuse E1_COLS tracks (no label column).
const MAG_COLS = defineCols(
  [16, 26, 16, 26, 26, 26, 26, 26],
  { sign: 1, units: 2, dot: 3, tail: [4, 5, 6, 7], ellipsis: 8 },
);

/** Pixel x of the center of 1-indexed column `idx` within `c`'s template. */
function colCenter(c, idx) {
  let x = 0;
  for (let i = 0; i < idx - 1; i++) x += c.widths[i];
  return x + c.widths[idx - 1] / 2;
}

// Vertical dx (design px) from a result row's center to the denominator slot below it, from fixed
// CSS heights (.eq-row 40, panel gap 12 + frac margin 4, frac-col 22+8+22): update with the CSS.
const FLY_DY = -(40 / 2 + 12 + 4 + 22 + 8 + 22 / 2);

/** Horizontal dx from the result row's coefficient to the denominator
 *  column(s) below it, using the same colCenter() math as shiftRow(). */
function fracDx(cols, denColIdxs) {
  const denCenter = denColIdxs.length === 1
    ? colCenter(cols, denColIdxs[0])
    : (colCenter(cols, denColIdxs[0]) + colCenter(cols, denColIdxs[denColIdxs.length - 1])) / 2;
  return colCenter(cols, cols.label) - denCenter;
}

/** Wraps the leading digit(s) of a coefficient label in their own span so
 *  .coef-num can pulse in sync with buildFracConstruct()'s denominator. */
function coefLabel(coefText, rest) {
  return `<span class="coef-num">${coefText}</span>${rest}`;
}

/**
 * "x = n/d" that a result row rearranges into: denominator starts at the
 * coefficient's position (--fly-dx/--fly-dy from `cols`) and flies to its
 * resting slot as the bar draws in. Caller places this below the matching
 * result row; CSS (frac-num-pop/frac-bar-grow/frac-den-arrive) drives the
 * actual reveal timing per panel.
 */
function buildFracConstruct(cols, { denColIdxs, numText, denText, ariaLabel }) {
  const dx = fracDx(cols, denColIdxs);
  return `
    <div class="frac-wrap" role="group" aria-label="${ariaLabel}">
      <span class="frac-eq-label" aria-hidden="true">x =</span>
      <div class="frac-col" aria-hidden="true">
        <span class="frac-num">${numText}</span>
        <span class="frac-bar-draw"></span>
        <span class="frac-den-fly" style="--fly-dx:${dx}px; --fly-dy:${FLY_DY}px">${denText}</span>
      </div>
    </div>
  `;
}

// aria-hidden - a screen reader hears rowLabel()'s aria-label instead.
function cell(col, cls, text) {
  return col == null || text == null ? '' : `<span class="${cls}" aria-hidden="true" style="grid-column:${col}">${text}</span>`;
}

// One continuous overbar spanning the repeating block as a single grid item.
function tailGroup(cols, digits) {
  const start = cols[0];
  const end = cols[cols.length - 1] + 1;
  const spans = digits.map((d) => `<span class="digit">${d}</span>`).join('');
  return `<span class="tail-group" aria-hidden="true" style="grid-column:${start} / ${end}">${spans}</span>`;
}

/** Spoken form of a row, e.g. "x = 0.7777... repeating" / "9x = 7", built
 *  from the row's own digits. `sign` reads as "minus". */
function rowLabel({ label, intPart, tail, sign }) {
  const shown = intPart || '0';
  const text = tail ? `${shown}.${tail.join('')}... repeating` : shown;
  const full = label ? `${label} ${text}` : text;
  return sign ? `minus ${full}` : full;
}

/**
 * One equation row on a shared place-value grid. `sign` marks the
 * subtrahend and gets its own column. `tens`/`units` are integer digits
 * (either may be omitted). `tail` is the repeating block (draws the
 * decimal point + ellipsis too). `baseClass: 'mag-row'` skips the
 * reveal-on-display:none machinery for the magnifier's always-visible rows.
 */
function eqRow(cols, { label, ariaLabelText, sign, tens, units, tail, tone = 'label', modifier = '', baseClass = 'eq-row' } = {}) {
  const parts = [
    cell(cols.sign, 'eq-sign', sign),
    cell(cols.label, 'eq-label', label),
    cell(cols.tens, 'digit-int', tens),
    cell(cols.units, 'digit-int', units),
  ];
  if (tail) {
    parts.push(cell(cols.dot, 'digit-op', '.'));
    parts.push(tailGroup(cols.tail, tail));
    parts.push(cell(cols.ellipsis, 'digit', '…'));
  }
  const intPart = [tens, units].filter((d) => d != null).join('');
  // ariaLabelText overrides label for speech only - needed when label is
  // coefLabel()'s markup, which a screen reader must not get verbatim.
  const aria = rowLabel({ label: ariaLabelText ?? label, intPart, tail, sign });
  return `
    <div class="${baseClass} ${baseClass}--${tone} ${modifier}" role="group" aria-label="${aria}" style="grid-template-columns:${cols.template}">
      ${parts.join('')}
    </div>
  `;
}

/** Paper-and-pencil subtraction rule; an empty grid sized to cols.template
 *  so it lines up with the rows above with no separate width bookkeeping. */
function subtractRule(cols, cls = 'ss-rule reveal-rule') {
  return `<div class="${cls}" aria-hidden="true" style="grid-template-columns:${cols.template}"></div>`;
}

function tagPill(text, modifier = '') {
  return `<span class="tag-pill ${modifier}">${text}</span>`;
}

/**
 * The row that animates mid-flight. Every visible tail slot gets its own
 * translateX(dx->0) so the digit string reads as one rigid strip sliding
 * left: introCols[k] digits cross into the integer part (digit-shift-cross,
 * flashes accent), the rest ripple left (digit-shift-in), and a fresh
 * tailPattern cycle fades in at the vacated trailing slot(s)
 * (digit-tail-enter). fadeOutText/fadeOutCol is the row's old leading "0",
 * sharing its grid cell with the incoming digit via digit-stack.
 * multBadge (e.g. "x10") sits as a real flex sibling above the digit grid
 * inside the same .eq-row.reveal-shift box, so it can't escape the card's
 * border the way a transform-lifted overlay could; it pulses in sync with
 * the digit motion (mult-badge-pulse).
 */
function shiftRow(cols, { label, tailPattern, introCols, fadeOutText, fadeOutCol, multBadge }) {
  const n = introCols.length;
  const extended = Array.from({ length: 4 + n }, (_, i) => tailPattern[i % tailPattern.length]);
  const parts = [cell(cols.label, 'eq-label', label)];

  for (let k = 0; k < n; k++) {
    const to = introCols[k];
    const dx = colCenter(cols, cols.tail[k]) - colCenter(cols, to);
    const mover = `<span class="digit-int digit-shift-cross" style="--dx:${dx}px">${extended[k]}</span>`;
    if (to === fadeOutCol) {
      parts.push(`
        <span class="digit-stack" aria-hidden="true" style="grid-column:${to}">
          <span class="digit-int digit-fade-out">${fadeOutText}</span>
          ${mover}
        </span>
      `);
    } else {
      parts.push(`<span class="digit-int digit-shift-cross" aria-hidden="true" style="grid-column:${to}; --dx:${dx}px">${extended[k]}</span>`);
    }
  }

  parts.push(cell(cols.dot, 'digit-op', '.'));

  const tailStart = cols.tail[0];
  const tailEnd = cols.tail[cols.tail.length - 1] + 1;
  const tailSpans = cols.tail.map((destCol, i) => {
    const srcIdx = i + n;
    const text = extended[srcIdx];
    if (srcIdx < 4) {
      const dx = colCenter(cols, cols.tail[srcIdx]) - colCenter(cols, destCol);
      return `<span class="digit digit-shift-in" style="--dx:${dx}px">${text}</span>`;
    }
    return `<span class="digit digit-tail-enter">${text}</span>`;
  }).join('');
  parts.push(`<span class="tail-group" aria-hidden="true" style="grid-column:${tailStart} / ${tailEnd}">${tailSpans}</span>`);

  parts.push(cell(cols.ellipsis, 'digit', '…'));

  // Spoken as the settled state, from the same `extended` array that renders it.
  const aria = rowLabel({ label, intPart: extended.slice(0, n).join(''), tail: extended.slice(n, n + 4) });

  const badgeHtml = multBadge ? `<span class="mult-badge" aria-hidden="true">${multBadge}</span>` : '';

  return `
    <div class="eq-row reveal-shift" role="group" aria-label="${aria}">
      ${badgeHtml}
      <div class="shift-grid" style="grid-template-columns:${cols.template}">
        ${parts.join('')}
      </div>
    </div>
  `;
}

function overbarStrip(block) {
  const cells = block.split('').map((d) => `<span class="strip-cell">${d}</span>`).join('');
  return `<span class="digit-strip" aria-hidden="true"><span class="repeating">${cells}</span></span>`;
}

function panelHeader(labelText, block) {
  return `
    <div class="ss-panel-header" role="group" aria-label="${labelText}, repeating block ${block}">
      <span class="ss-panel-label" aria-hidden="true">${labelText}</span>
      ${overbarStrip(block)}
    </div>
  `;
}

function buildPanel1() {
  return `
    <div class="ss-panel ss-panel1">
      ${panelHeader('1 digit block', '777')}
      <div class="eq-stack">
        ${shiftRow(E1_COLS, {
          label: '10x =',
          tailPattern: ['7'],
          introCols: [E1_COLS.units],
          fadeOutText: '0',
          fadeOutCol: E1_COLS.units,
          multBadge: '×10',
        })}
        ${eqRow(E1_COLS, { modifier: 'reveal-a0', label: 'x =', sign: '−', units: '0', tail: ['7', '7', '7', '7'] })}
        ${subtractRule(E1_COLS)}
        ${eqRow(E1_COLS, { modifier: 'reveal-result', tone: 'success', label: coefLabel('9', 'x ='), ariaLabelText: '9x =', units: '7' })}
      </div>
      <div class="ss-fraction-pill">
        ${buildFracConstruct(E1_COLS, {
          denColIdxs: [E1_COLS.units],
          numText: '7',
          denText: '9',
          ariaLabel: 'x equals seven over nine',
        })}
      </div>
    </div>
  `;
}

function buildMagnifier() {
  return `
    <div class="ss-magnify">
      <div class="mag-stack">
        ${eqRow(MAG_COLS, { baseClass: 'mag-row', units: '7', tail: ['7', '7', '7', '7'] })}
        ${eqRow(MAG_COLS, { baseClass: 'mag-row', sign: '−', units: '0', tail: ['7', '7', '7', '7'] })}
        ${subtractRule(MAG_COLS, 'mag-rule')}
      </div>
      <div class="ss-mag-result">7</div>
    </div>
  `;
}

function buildPanel2() {
  return `
    <div class="ss-panel ss-panel2">
      ${panelHeader('2 digit block', '27')}
      <div class="eq-stack">
        ${shiftRow(E2_COLS, {
          label: '100x =',
          tailPattern: ['2', '7'],
          introCols: [E2_COLS.tens, E2_COLS.units],
          fadeOutText: '0',
          fadeOutCol: E2_COLS.units,
          multBadge: '×100',
        })}
        ${eqRow(E2_COLS, { modifier: 'reveal-a0', label: 'x =', sign: '−', units: '0', tail: ['2', '7', '2', '7'] })}
        ${subtractRule(E2_COLS)}
        ${eqRow(E2_COLS, { modifier: 'reveal-result', tone: 'success', label: coefLabel('99', 'x ='), ariaLabelText: '99x =', tens: '2', units: '7' })}
      </div>
      <div class="ss-frac-e2">
        ${buildFracConstruct(E2_COLS, {
          denColIdxs: [E2_COLS.tens, E2_COLS.units],
          numText: '27',
          denText: '99',
          ariaLabel: 'x equals twenty-seven over ninety-nine',
        })}
      </div>
      <div class="ss-cancel">
        ${tagPill('÷9', 'tag-pill--success reveal-cancel')}
        ${tagPill('= 3/11', 'tag-pill--success reveal-final')}
      </div>
    </div>
  `;
}

const CSS = `
  .sim-dom-root {
    /* FRAMELESS: content-block.js drops the card chrome, so this paints
       directly on the page - every panel/pill/card below has its own
       --sim-bg-surface fill, none rely on this being opaque. */
    background: transparent;
    color: var(--sim-label);
    font-family: Inter, system-ui, sans-serif;
    padding: 24px 30px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 18px;
  }
  .ss-procedure { text-align: center; }

  .tag-pill {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 6px 14px; border-radius: 999px;
    background: var(--sim-bg-surface);
    border: 1.5px solid var(--sim-accent);
    color: var(--sim-accent);
    font-weight: 700; font-size: 0.85rem;
  }
  .tag-pill--success { border-color: var(--sim-success); color: var(--sim-success); }

  .ss-panels { display: flex; flex-direction: column; align-items: center; gap: 22px; width: 100%; }
  .ss-panel {
    background: var(--sim-bg-surface);
    border: 1.5px solid color-mix(in oklab, var(--sim-label) 22%, var(--sim-bg-deep));
    border-radius: 12px;
    padding: 16px 20px 20px;
    width: 440px;
    display: none;
    flex-direction: column;
    gap: 12px;
  }
  .ss-panel1 { display: flex; }
  .ss-root[data-step="2"] .ss-panel2 { display: flex; }
  /* Panel1 already taught its lesson (beats 0-1); step off for panel2. */
  .ss-root[data-step="2"] .ss-panel1 { display: none; }

  .ss-panel-header { display: flex; align-items: center; justify-content: space-between; }
  .ss-panel-label { font-weight: 700; font-size: 0.8rem; color: var(--sim-label); }

  .digit-strip { display: inline-flex; }
  .digit-strip .repeating { display: inline-flex; border-top: 2px solid var(--sim-accent); padding-top: 2px; }
  .strip-cell {
    display: inline-flex; align-items: center; justify-content: center;
    width: 20px; height: 22px; margin-left: 4px;
    background: var(--sim-bg-surface); border: 1.2px solid var(--sim-accent);
    border-radius: 5px; color: var(--sim-accent); font-weight: 700; font-size: 0.85rem;
  }
  .strip-cell:first-child { margin-left: 0; }

  .eq-stack { display: flex; flex-direction: column; align-items: center; gap: 6px; }
  /* Hidden by default; a reveal-* class flips display so the entrance animation restarts. */
  .eq-row {
    display: none;
    align-items: center;
    height: 40px;
    background: var(--sim-bg-surface);
    border: 1.2px solid color-mix(in oklab, var(--sim-label) 22%, var(--sim-bg-deep));
    border-radius: 10px;
    padding: 0 16px;
    box-sizing: border-box;
    font-size: 1.15rem; font-weight: 700;
  }
  .eq-row--success { border-color: var(--sim-success); color: var(--sim-success); }
  .eq-label { white-space: nowrap; text-align: right; padding-right: 6px; }
  .eq-sign { text-align: center; font-weight: 800; }
  .digit-int, .digit { text-align: center; }
  .digit-op { color: var(--sim-accent); font-weight: 800; text-align: center; }
  .tail-group { display: flex; border-top: 2px solid currentColor; padding-top: 1px; }
  .tail-group .digit { flex: 1 1 0; }
  .coef-num { display: inline-block; }

  /* shiftRow(): flex column (badge above, digit grid below); overrides .eq-row's fixed height. */
  .eq-row.reveal-shift { height: auto; flex-direction: column; padding: 5px 16px; gap: 3px; }
  .shift-grid { display: grid; align-items: center; }
  /* multBadge: plain flex child (no transform/absolute), pulses via mult-badge-pulse. */
  .mult-badge {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 2px 9px; border-radius: 999px;
    background: var(--sim-bg-surface);
    border: 1.2px solid var(--sim-accent);
    color: var(--sim-accent);
    font-weight: 700; font-size: 0.7rem;
  }

  /* Magnifier rows: same place-value idea, but always visible. */
  .mag-row {
    display: grid;
    align-items: center;
    font-size: 1.05rem; font-weight: 700;
    color: var(--sim-label);
  }

  /* Empty grid sized to cols.template so it lines up under the row above. */
  .ss-rule {
    display: none;
    height: 0;
    padding: 0 16px;
    box-sizing: border-box;
    border-top: 2.5px solid var(--sim-label);
    transform: scaleX(0);
    transform-origin: left center;
  }
  /* Magnifier's rule is always visible (panel fades in as one unit). */
  .mag-rule {
    display: grid;
    height: 0;
    padding: 0 16px;
    box-sizing: border-box;
    border-top: 2.5px solid var(--sim-label);
  }

  .ss-fraction-pill { display: none; justify-content: center; margin-top: 4px; }
  .ss-frac-e2 { display: none; justify-content: center; margin-top: 4px; }
  .ss-root[data-step="2"] .ss-frac-e2 { display: flex; }
  .ss-cancel { display: none; flex-direction: column; align-items: center; gap: 8px; margin-top: 4px; }
  .ss-root[data-step="2"] .ss-cancel { display: flex; }

  /* "x = n/d": numerator/bar/denominator stacked in their own column so the denominator has somewhere to land. */
  .frac-wrap { display: inline-flex; align-items: center; gap: 8px; }
  .frac-eq-label { font-weight: 700; font-size: 1.05rem; color: var(--sim-success); }
  .frac-col { display: flex; flex-direction: column; align-items: center; }
  .frac-num, .frac-den-fly {
    display: flex; align-items: center; justify-content: center;
    height: 22px; min-width: 34px;
    font-weight: 800; font-size: 1.05rem; color: var(--sim-success);
  }
  .frac-bar-draw {
    display: block; width: 40px; height: 2px; margin: 3px 0;
    background: var(--sim-success);
    transform: scaleX(0); transform-origin: center;
  }
  /* Pre-reveal state matches keyframe 0% so there's no flash on display flip. */
  .frac-num, .frac-bar-draw, .frac-den-fly { opacity: 0; }
  .frac-den-fly { transform: translate(var(--fly-dx, 0px), var(--fly-dy, 0px)) scale(1.3); will-change: transform; }

  .ss-magnify {
    display: none;
    width: 440px; background: var(--sim-bg-surface);
    border: 1.2px solid color-mix(in oklab, var(--sim-label) 22%, var(--sim-bg-deep));
    border-radius: 12px; padding: 16px 20px; box-sizing: border-box;
    flex-direction: column; gap: 10px;
  }
  .ss-root[data-step="1"] .ss-magnify { display: flex; }
  /* Beat 1 pairs the magnifier with panel1's fraction-pill (still animating
     - see .frac-den-fly below), not its eq-stack: that already played at
     beat 0 and won't replay (animations key off ss-revealed, set once).
     Header stays for the "1 digit block" label. */
  .ss-root[data-step="1"] .ss-panel1 .eq-stack { display: none; }
  .mag-stack { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .ss-mag-result {
    text-align: center; margin-top: 6px;
    color: var(--sim-success); font-weight: 800; font-size: 1.6rem;
    animation: ss-result-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s both;
  }

  /* Reveal choreography: display:none->block/flex restarts the CSS animation (content-block.js .rv-step). */
  @keyframes ss-fade-up { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes ss-fade { from { opacity: 0; } to { opacity: 1; } }
  /* Rule draws left-to-right instead of fading in. */
  @keyframes ss-rule-draw { from { transform: scaleX(0); } to { transform: scaleX(1); } }
  /* Overshoot-and-settle plus a brief glow for the answer row. */
  @keyframes ss-result-pop {
    0%   { opacity: 0; transform: translateY(6px) scale(0.9); box-shadow: 0 0 0 0 color-mix(in oklab, var(--sim-success) 0%, transparent); }
    55%  { opacity: 1; transform: translateY(0) scale(1.06); box-shadow: 0 0 0 8px color-mix(in oklab, var(--sim-success) 35%, transparent); }
    100% { opacity: 1; transform: translateY(0) scale(1); box-shadow: 0 0 0 0 color-mix(in oklab, var(--sim-success) 0%, transparent); }
  }
  /* multBadge pulses in as digits move, out once they land. */
  @keyframes mult-badge-pulse {
    0%   { opacity: 0; transform: scale(0.7); }
    30%  { opacity: 1; transform: scale(1.1); }
    75%  { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(1); }
  }
  /* Numerator pops in, bar draws, then denominator arrives. */
  @keyframes frac-num-pop {
    from { opacity: 0; transform: scale(0.6); }
    60%  { opacity: 1; transform: scale(1.15); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes frac-bar-grow { from { opacity: 1; transform: scaleX(0); } to { opacity: 1; transform: scaleX(1); } }
  /* "9"/"99" flies from --fly-dx/--fly-dy (coefficient position) to its resting slot. */
  @keyframes frac-den-arrive {
    0%   { opacity: 0; transform: translate(var(--fly-dx, 0px), var(--fly-dy, 0px)) scale(1.3); }
    55%  { opacity: 1; }
    85%  { opacity: 1; transform: translate(0, 0) scale(1.15); }
    100% { opacity: 1; transform: translate(0, 0) scale(1); }
  }
  /* Coefficient pulses once, timed to when its denominator lands below. */
  @keyframes coef-pulse {
    0%   { transform: scale(1); color: inherit; }
    35%  { transform: scale(1.25); color: var(--sim-accent); }
    70%  { transform: scale(1.25); color: var(--sim-accent); }
    100% { transform: scale(1); color: inherit; }
  }
  /* Subtrahend row's "-" pops in on its own schedule, independent of reveal-a0. */
  @keyframes sign-pop-in {
    from { opacity: 0; transform: scale(0.4); }
    100% { opacity: 1; transform: scale(1); }
  }

  /* Row reveals at t=0; only its "-" glyph is held back (sign-pop-in below). */
  .ss-root.ss-revealed .reveal-a0 { display: grid; animation: ss-fade-up 0.4s ease-out both; }
  /* "-" waits until the minuend's shift finishes (~1.5s) so it never reads as a leading negative. */
  .reveal-a0 .eq-sign { opacity: 0; }
  .ss-root.ss-revealed .reveal-a0 .eq-sign { animation: sign-pop-in 0.35s ease-out 1.55s both; }
  .ss-root.ss-revealed .reveal-shift { display: flex; animation: ss-fade-up 0.3s ease-out 0.5s both; }
  .ss-root.ss-revealed .reveal-rule { display: grid; animation: ss-rule-draw 0.35s ease-out 1.7s both; }
  .ss-root.ss-revealed .reveal-result { display: grid; animation: ss-result-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 2.2s both; }
  .ss-root.ss-revealed .mult-badge { animation: mult-badge-pulse 1s ease-out 0.65s both; }
  .ss-root.ss-revealed[data-step="1"] .ss-panel1 .ss-fraction-pill,
  .ss-root.ss-revealed[data-step="2"] .ss-panel1 .ss-fraction-pill {
    display: flex; animation: ss-fade-up 0.4s ease-out both;
  }
  .ss-root.ss-revealed .ss-magnify { animation: ss-fade 0.4s ease-out both; }
  /* Panel1's fraction fires on data-step change, so its delays start near 0. */
  .ss-root.ss-revealed[data-step="1"] .ss-panel1 .frac-num,
  .ss-root.ss-revealed[data-step="2"] .ss-panel1 .frac-num {
    animation: frac-num-pop 0.3s ease-out 0.05s both;
  }
  .ss-root.ss-revealed[data-step="1"] .ss-panel1 .frac-bar-draw,
  .ss-root.ss-revealed[data-step="2"] .ss-panel1 .frac-bar-draw {
    animation: frac-bar-grow 0.3s ease-out 0.35s both;
  }
  .ss-root.ss-revealed[data-step="1"] .ss-panel1 .frac-den-fly,
  .ss-root.ss-revealed[data-step="2"] .ss-panel1 .frac-den-fly {
    animation: frac-den-arrive 0.6s cubic-bezier(0.22, 0.61, 0.36, 1) 0.55s both;
  }
  .ss-root.ss-revealed[data-step="1"] .ss-panel1 .coef-num,
  .ss-root.ss-revealed[data-step="2"] .ss-panel1 .coef-num {
    animation: coef-pulse 0.5s ease-out 0.55s both;
  }

  .ss-root.ss-revealed .ss-panel2 .reveal-rule { animation-delay: 1.8s; }
  .ss-root.ss-revealed .ss-panel2 .reveal-result { animation-delay: 2.3s; }
  /* Panel2's fraction continues where reveal-result (2.3s + 0.5s) leaves off. */
  .ss-root.ss-revealed .ss-panel2 .frac-num { animation: frac-num-pop 0.3s ease-out 2.9s both; }
  .ss-root.ss-revealed .ss-panel2 .frac-bar-draw { animation: frac-bar-grow 0.3s ease-out 3.2s both; }
  .ss-root.ss-revealed .ss-panel2 .frac-den-fly { animation: frac-den-arrive 0.6s cubic-bezier(0.22, 0.61, 0.36, 1) 3.4s both; }
  .ss-root.ss-revealed .ss-panel2 .coef-num { animation: coef-pulse 0.5s ease-out 3.4s both; }
  .ss-root.ss-revealed .ss-panel2 .reveal-cancel { display: inline-flex; animation: ss-fade 0.4s ease-out 4.1s both; }
  .ss-root.ss-revealed .ss-panel2 .reveal-final { display: inline-flex; animation: ss-fade 0.4s ease-out 4.6s both; }

  /* Every visible tail slot moves (not just crossing ones); --dx is a real colCenter() distance. */
  .digit-shift-in, .digit-shift-cross {
    animation-duration: 0.6s;
    animation-timing-function: cubic-bezier(0.22, 0.61, 0.36, 1);
    animation-delay: 0.9s;
    animation-fill-mode: both;
    will-change: transform;
  }
  .digit-shift-in { animation-name: ss-digit-shift; }
  @keyframes ss-digit-shift {
    from { transform: translateX(var(--dx)); }
    to   { transform: translateX(0); }
  }
  /* Crossing digits flash accent mid-flight, land with a small bounce. */
  .digit-shift-cross { animation-name: ss-digit-shift-cross; }
  @keyframes ss-digit-shift-cross {
    0%   { transform: translateX(var(--dx)) scale(1); color: var(--sim-accent); }
    65%  { color: var(--sim-accent); }
    85%  { transform: translateX(0) scale(1.18); }
    100% { transform: translateX(0) scale(1); color: inherit; }
  }
  .digit-tail-enter { animation: ss-digit-fade-in 0.5s ease-out 1s both; }
  @keyframes ss-digit-fade-in { from { opacity: 0; } to { opacity: 1; } }
  /* Old leading "0" shares the crossing digit's grid cell and fades out under it. */
  .digit-stack { display: grid; grid-template-areas: "d"; }
  .digit-stack > .digit-int { grid-area: d; }
  .digit-fade-out { animation: ss-digit-fade-out 0.3s ease-in 0.9s both; }
  @keyframes ss-digit-fade-out { from { opacity: 1; } to { opacity: 0; } }

  /* Deliberately NOT collapsed under prefers-reduced-motion (unlike most
     per-component opt-outs, which keep a cross-fade and drop only travel):
     the digits sliding IS the "shift" being taught, so suppressing motion
     would remove the explanation, not just soften it. Do not "fix" this to
     match the sitewide default. */
`;

export class ShiftSubtractScene extends DomSimulation {
  // No PORTRAIT_WIDTH/HEIGHT: one design fits every orientation. HEIGHT fits the tallest beat
  // (step 2 alone, 462px measured, plus ~48px headroom).
  static WIDTH = W;
  static HEIGHT = H;
  // Every panel/pill/card paints its own fill; drop the card chrome too
  // (content-block.js `frame: "none"`, dom-simulation-auto-layout.md #10.2).
  static FRAMELESS = true;
  static ARIA_LABEL = 'Two worked examples turning a repeating decimal into a fraction by the shift-and-subtract method.';

  static CONTROLS = [
    { type: 'button', id: 'prev', label: '← Back' },
    { type: 'button', id: 'next', label: 'Next →' },
    { type: 'button', id: 'replay', label: '↻ Replay' },
  ];

  constructor(container, config) {
    super(container, config);
    this.allowResume = true;

    this.stepIndex = STEP_E1_BUILD;
    this._lessonLinked = false;
    this._beatChain = null;
    this._beatChainPos = 0;

    this._liveRegion = null;
  }

  async setup() {
    await super.setup();
    this._buildDom();
    this.injectStyle(CSS);
    this._buildLiveRegion();
    this.root.dataset.step = String(STEP_E1_BUILD);
    this.root.classList.add('ss-revealed');
  }

  destroy() {
    if (this._liveRegion) {
      this._liveRegion.remove();
      this._liveRegion = null;
    }
    super.destroy();
  }

  _buildDom() {
    this.root.classList.add('ss-root');
    this.root.setAttribute('role', 'group');
    this.root.setAttribute('aria-label', this.constructor.ARIA_LABEL);
    this.root.innerHTML = `
      <div class="ss-procedure">${tagPill('×10ⁿ (n = block length)')}</div>
      <div class="ss-panels">
        ${buildPanel1()}
        ${buildMagnifier()}
        ${buildPanel2()}
      </div>
    `;
  }

  // -- Beat sync + navigation (identical contract to the canvas original) --

  onBeatChange(beatIndex) {
    this._lessonLinked = true;
    const clamped = Math.max(0, Math.min(beatIndex, BEAT_STEP_MAP.length - 1));
    const chain = BEAT_STEP_MAP[clamped];
    this._beatChain = chain;
    this._beatChainPos = 0;
    this._jumpToStep(chain[0].idx);
  }

  _isBeatLocked() {
    return this._lessonLinked && this.stepIndex < STEP_TERMINAL;
  }

  isControlHidden(id) {
    const locked = this._isBeatLocked();
    if (id === 'prev') return locked || this.stepIndex === 0;
    if (id === 'next') return locked || this.stepIndex === STEP_TERMINAL;
    if (id === 'replay') return locked || this.stepIndex !== STEP_TERMINAL;
    return false;
  }

  onControlChange(id) {
    if (id === 'prev') {
      this._goStep(this.stepIndex - 1);
    } else if (id === 'next') {
      this._goStep(this.stepIndex + 1);
    } else if (id === 'replay') {
      this._lessonLinked = false;
      this._beatChain = null;
      // Reset display:none so entrance animations restart (data-step change alone won't).
      this.root.classList.remove('ss-revealed');
      void this.root.offsetWidth; // force reflow
      this.stepIndex = STEP_E1_BUILD;
      this.root.dataset.step = String(STEP_E1_BUILD);
      this.root.classList.add('ss-revealed');
      this._announce('Replaying.');
    }
    this.requestUiUpdate?.();
  }

  _goStep(i) {
    this._jumpToStep(Math.max(0, Math.min(STEPS.length - 1, i)));
  }

  _jumpToStep(i) {
    this.stepIndex = i;
    this.root.dataset.step = String(i);
    this._announce(STEPS[i].caption ?? '');
    this.requestUiUpdate?.();
  }

  // -- A11y --

  _buildLiveRegion() {
    this._liveRegion = document.createElement('div');
    this._liveRegion.setAttribute('role', 'status');
    this._liveRegion.setAttribute('aria-live', 'polite');
    this._liveRegion.style.cssText =
      'position:absolute;width:1px;height:1px;padding:0;margin:-1px;' +
      'overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;';
    this.container.appendChild(this._liveRegion);
  }

  _announce(text) {
    if (this._liveRegion && text) this._liveRegion.textContent = text;
  }
}

STEPS[STEP_E1_BUILD].caption = 'One repeating digit needs times ten. Subtract, and nine x equals seven.';
STEPS[STEP_MAGNIFY].caption = 'The two tails are identical past the decimal point - they cancel, leaving seven.';
STEPS[STEP_E2_BUILD].caption = 'Two repeating digits need times one hundred. The same moves: shift, subtract, cancel.';
