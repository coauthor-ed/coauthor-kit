/**
 * epi-curve@1 - an epidemic curve: cases by day (or hour) of symptom onset,
 * as a histogram where each box is one case. Optional: an exposure marker
 * (a dashed line at the bin of the shared exposure), an incubation bracket
 * from the exposure to a later bin (the bulk of onsets), up to four stacked
 * series, and up to three numbered notes pointing at bins.
 *
 * Contract figure-host@0 (course-local renderer). Content only: no sizes,
 * colours or coordinates in `data`; the drawing reflows to env.width. Every
 * bin / exposure / incubation / note takes a 1-based `step` (default 1):
 * not-yet bins are dashed outlines of their full height, not-yet marks are
 * hidden but keep their space, so the figure never changes shape per beat.
 */
import { css, tok } from './style.js';

export const api = 'figure-host@0';

const NS = 'http://www.w3.org/2000/svg';
const MAX_BINS = 60;
const MAX_SERIES = 4;
const MAX_NOTES = 3;

const txt = (v) => (typeof v === 'string' ? v : (v && typeof v.en === 'string' ? v.en : ''));
const stepOf = (o) => (Number.isInteger(o?.step) && o.step > 0 ? o.step : 1);
const isCount = (n) => Number.isInteger(n) && n >= 0;
const seriesOf = (data) => (Array.isArray(data?.series) && data.series.length ? data.series : null);
const countsOf = (data, b) => (seriesOf(data) ? (Array.isArray(b.counts) ? b.counts : []) : [b.count]).map((n) => (isCount(n) ? n : 0));
const totalOf = (data, b) => countsOf(data, b).reduce((a, n) => a + n, 0);
const toneOf = (s, i) => (Number.isInteger(s?.tone) && s.tone >= 1 && s.tone <= 5 ? s.tone : i + 1);

/** Pure semantic checks beyond schema.json. */
export function validate(data) {
  const errs = [];
  if (!data || typeof data !== 'object') return ['data must be an object'];
  const bins = data.bins;
  const series = seriesOf(data);
  const stepOk = (o, where) => {
    if (o && o.step !== undefined && !(Number.isInteger(o.step) && o.step >= 1 && o.step <= 9)) errs.push(`${where}: step must be an integer 1..9`);
  };
  if (data.unit !== undefined && data.unit !== 'day' && data.unit !== 'hour') errs.push('unit must be "day" or "hour"');
  if (data.series !== undefined) {
    if (!Array.isArray(data.series) || data.series.length < 2 || data.series.length > MAX_SERIES) errs.push(`series: 2..${MAX_SERIES} entries (leave it out for one series)`);
    else {
      const ids = new Set();
      data.series.forEach((s, i) => {
        if (!txt(s?.label).trim()) errs.push(`series[${i}]: label is required`);
        if (s?.id !== undefined) { if (ids.has(s.id)) errs.push(`series[${i}]: duplicate id "${s.id}"`); ids.add(s.id); }
        if (s?.tone !== undefined && !(Number.isInteger(s.tone) && s.tone >= 1 && s.tone <= 5)) errs.push(`series[${i}]: tone must be 1..5`);
        stepOk(s, `series[${i}]`);
      });
    }
  }
  if (!Array.isArray(bins) || bins.length < 3 || bins.length > MAX_BINS) {
    errs.push(`bins: 3..${MAX_BINS} entries required`);
    return errs;
  }
  const labels = new Map();
  bins.forEach((b, i) => {
    const where = `bins[${i}]`;
    const l = txt(b?.label).trim();
    if (!l) errs.push(`${where}: label is required`);
    else if (labels.has(l)) errs.push(`${where}: duplicate label "${l}"`);
    else labels.set(l, i);
    if (series) {
      if (b?.count !== undefined) errs.push(`${where}: with series, use counts (one per series), not count`);
      if (!Array.isArray(b?.counts) || b.counts.length !== series.length) errs.push(`${where}: counts must list ${series.length} numbers, one per series`);
      else b.counts.forEach((n, k) => { if (!isCount(n)) errs.push(`${where}: counts[${k}] must be a non-negative integer`); });
    } else {
      if (b?.counts !== undefined) errs.push(`${where}: counts needs series; use count`);
      if (!isCount(b?.count)) errs.push(`${where}: count must be a non-negative integer`);
    }
    stepOk(b, where);
  });
  if (bins.every((b) => totalOf(data, b) === 0)) errs.push('bins: every count is 0');
  const ref = (at, where) => {
    const l = txt(at).trim();
    if (!l) { errs.push(`${where}: at is required (a bin label)`); return -1; }
    if (!labels.has(l)) { errs.push(`${where}: "${l}" is not a bin label (it must sit inside the axis)`); return -1; }
    return labels.get(l);
  };
  let ex = -1;
  if (data.exposure !== undefined) {
    ex = ref(data.exposure?.at, 'exposure');
    if (!txt(data.exposure?.label).trim()) errs.push('exposure: label is required');
    stepOk(data.exposure, 'exposure');
  }
  if (data.incubation !== undefined) {
    if (data.exposure === undefined) errs.push('incubation needs exposure (it runs from the exposure)');
    const to = ref(data.incubation?.to, 'incubation.to');
    if (ex >= 0 && to >= 0 && to <= ex) errs.push('incubation.to must be a bin after the exposure');
    if (!txt(data.incubation?.label).trim()) errs.push('incubation: label is required');
    stepOk(data.incubation, 'incubation');
    if (data.exposure && stepOf(data.incubation) < stepOf(data.exposure)) errs.push('incubation: step must not come before the exposure step');
  }
  if (data.notes !== undefined) {
    if (!Array.isArray(data.notes) || data.notes.length > MAX_NOTES) errs.push(`notes: at most ${MAX_NOTES}`);
    else data.notes.forEach((n, i) => {
      ref(n?.at, `notes[${i}]`);
      if (!txt(n?.text).trim()) errs.push(`notes[${i}]: text is required`);
      stepOk(n, `notes[${i}]`);
    });
  }
  return errs;
}

/** Plain text for screen readers: what is on screen at this beat. */
export function describe(data, beat) {
  const bins = Array.isArray(data?.bins) ? data.bins : [];
  if (!bins.length) return '';
  const unit = data.unit === 'hour' ? 'hour' : 'day';
  const on = (o) => stepOf(o) <= beat;
  const series = seriesOf(data);
  const sOn = (k) => !series || on(series[k]);
  // What is drawn now: bins up to this beat, and only the series already in.
  const shownOf = (b) => (on(b) ? countsOf(data, b).reduce((a, c, k) => a + (sOn(k) ? c : 0), 0) : 0);
  const shown = bins.filter((b) => shownOf(b) > 0);
  const total = shown.reduce((a, b) => a + shownOf(b), 0);
  const parts = [`An epidemic curve: cases by ${unit} of symptom onset, from ${txt(bins[0].label)} to ${txt(bins[bins.length - 1].label)}`];
  if (shown.length) {
    let peak = shown[0];
    for (const b of shown) if (shownOf(b) > shownOf(peak)) peak = b;
    const pk = shownOf(peak);
    parts.push(`${total} case${total === 1 ? '' : 's'} shown, onsets from ${txt(shown[0].label)} to ${txt(shown[shown.length - 1].label)}`);
    parts.push(`The peak is ${txt(peak.label)}, with ${pk} case${pk === 1 ? '' : 's'}`);
    if (series) {
      const per = series.map((s, k) => (sOn(k) ? `${txt(s.label)} ${bins.reduce((a, b) => a + (on(b) ? countsOf(data, b)[k] || 0 : 0), 0)}` : '')).filter(Boolean);
      parts.push(`By group: ${per.join(', ')}`);
    }
  }
  const later = bins.some((b) => !on(b) && totalOf(data, b) > 0) || (series && series.some((s) => !on(s)));
  if (later) parts.push('More cases are still to come');
  if (data.exposure && on(data.exposure)) parts.push(`Exposure: ${txt(data.exposure.label)}, at ${txt(data.exposure.at)}`);
  if (data.incubation && on(data.incubation)) parts.push(`Incubation, from the exposure to ${txt(data.incubation.to)}: ${txt(data.incubation.label)}`);
  (data.notes || []).forEach((n, i) => { if (on(n)) parts.push(`Note ${i + 1} at ${txt(n.at)}${n.label ? `, ${txt(n.label)}` : ''}: ${txt(n.text)}`); });
  return parts.join('. ') + '.';
}

export function aspect(data) {
  const n = Array.isArray(data?.bins) ? data.bins.length : 12;
  return n > 24 ? 2.1 : 1.7;
}

// -- drawing -----------------------------------------------------------------

function sv(tag, attrs, text) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (text != null) e.textContent = String(text);
  return e;
}
function h(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null && text !== '') e.textContent = String(text);
  return e;
}

/** A tick step of 1, 2 or 5 times a power of ten, about `want` ticks over [0, max]. */
function niceStep(max, want) {
  const raw = Math.max(1, max / Math.max(1, want));
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const m of [1, 2, 5, 10]) if (m * p >= raw) return Math.max(1, m * p);
  return 10 * p;
}

function measure(svg, str, cls) {
  const t = sv('text', { class: cls || '', x: 0, y: -999 }, str);
  svg.appendChild(t);
  let w = 0;
  try { w = t.getComputedTextLength(); } catch { w = 0; }
  t.remove();
  return w || String(str).length * 7.4;
}

export function mount(root, data, env0) {
  const style = document.createElement('style');
  const wrap = h('div', 'root');
  const fig = h('div', 'fig');
  wrap.appendChild(fig);
  root.append(style, wrap);

  let env = { ...env0 };
  let beat = Number.isInteger(env.beat) && env.beat > 0 ? env.beat : 1;
  let drawnKey = '';
  let dead = false;

  const draw = (animate) => {
    if (dead) return;
    const look = env.look === 'plain' ? 'plain' : 'quill';
    const casefile = look === 'plain' && env.setting === 'casefile';
    wrap.dataset.look = look;
    if (casefile) wrap.dataset.setting = 'casefile'; else delete wrap.dataset.setting;
    fig.dataset.tab = env.tab || '';
    const sheet = css(look, casefile);
    if (style.textContent !== sheet) style.textContent = sheet;
    const W = Math.max(240, env.width || fig.clientWidth || 600);
    const narrow = W < 460;
    wrap.classList.toggle('narrow', narrow);
    wrap.classList.toggle('still', !!env.reducedMotion || !animate);
    // Inner width: the panel paddings (and the casefile desk) come off the slot width.
    const inner = Math.floor(W - (narrow ? 24 : 36) - (look === 'quill' ? 4 : 2) - (casefile ? 28 + (narrow ? 22 : 30) : 0));
    fig.replaceChildren();
    // Casefile: everything sits on a paper sheet inside the folder.
    const sheetEl = h('div', 'sheet');
    fig.appendChild(sheetEl);

    const bins = data.bins || [];
    const series = seriesOf(data);
    const n = bins.length;
    const fresh = (o) => animate && stepOf(o) === beat;
    const on = (o) => stepOf(o) <= beat;
    const sOn = (k) => !series || on(series[k]);

    const svg = sv('svg', { class: 'plot', 'aria-hidden': 'true' });
    sheetEl.appendChild(svg);

    // -- horizontal geometry
    const maxTotal = Math.max(1, ...bins.map((b) => totalOf(data, b)));
    // Casefile spends height on the tab and the sheet: the plot gives some of it back.
    const plotH = Math.round(Math.min(230, Math.max(150, inner * 0.27)) - (casefile && !narrow ? 24 : 0));
    const yStep = niceStep(maxTotal, Math.max(3, Math.min(5, Math.round(plotH / 44))));
    const yMax = Math.ceil(maxTotal / yStep) * yStep;
    const yLabW = Math.ceil(measure(svg, String(yMax), 'ytl')) + 8;
    const x0 = yLabW + 4;
    const plotW = Math.max(60, inner - x0 - 2);
    const xR = x0 + plotW;
    const band = plotW / n;
    const gap = band >= 16 ? 2 : 1;
    const barW = Math.max(2, band - gap);
    const bx = (i) => x0 + i * band + gap / 2;
    const cx = (i) => x0 + (i + 0.5) * band;
    const idx = new Map(bins.map((b, i) => [txt(b.label).trim(), i]));

    const hasExp = !!data.exposure && idx.has(txt(data.exposure.at).trim());
    const hasInc = hasExp && !!data.incubation && idx.has(txt(data.incubation.to).trim());
    const ex = hasExp ? cx(idx.get(txt(data.exposure.at).trim())) : 0;
    const yTitle = (txt(data.yTitle) || 'Cases').toUpperCase();
    const yTitleW = measure(svg, yTitle, 'ytitle');
    const expLab = hasExp ? txt(data.exposure.label).toUpperCase() : '';
    const expW = hasExp ? measure(svg, expLab, 'exp-label') : 0;
    // Exposure label: right of the line, else left of it; it shares row A with the y title unless they touch.
    const expRight = !hasExp || ex + 10 + expW <= xR;
    const expX = expRight ? ex + 10 : Math.max(0, ex - 10 - expW);
    const titleOwnRow = hasExp && expX < yTitleW + 12;

    // -- vertical geometry: [y title] [exposure label] [bracket] plot, axis
    let y = 0;
    const titleY = 14;
    if (titleOwnRow) y += 22;
    const rowA = y + 14;
    y += 24;
    const incY = hasInc ? y + 14 : 0;
    if (hasInc) y += 26;
    const cellH0 = plotH / yMax;

    // -- notes: a callout box beside its bar where it fits, else numbered marks + a list under the chart
    const notes = (Array.isArray(data.notes) ? data.notes : []).filter((nt) => idx.has(txt(nt.at).trim())).slice(0, MAX_NOTES);
    const topOf = (i) => (yMax - totalOf(data, bins[i])) * cellH0; // px from the plot top
    const boxes = [];
    let inline = notes.length > 0;
    for (const nt of notes) {
      const i = idx.get(txt(nt.at).trim());
      const kw = txt(nt.label) ? measure(svg, txt(nt.label).toUpperCase(), 'nb-k') : 0;
      const tw = measure(svg, txt(nt.text), 'nb-t');
      const w = Math.ceil(Math.max(kw, tw)) + 22;
      const hh = txt(nt.label) ? 42 : 26;
      const t = topOf(i);
      const c = cx(i);
      const hw = barW / 2;
      const fits = (bx0, by0) => {
        if (bx0 < x0 + 2 || bx0 + w > xR) return false;
        // A box may rise up to 40 px over the plot top: the headroom grows to hold it.
        if (by0 < -40 || by0 + hh > plotH - 4) return false;
        for (let j = 0; j < n; j++) {
          const l = x0 + j * band, r = l + band;
          if (r <= bx0 - 2 || l >= bx0 + w + 2) continue;
          if (topOf(j) < by0 + hh + 6) return false;
        }
        if (hasExp && ex > bx0 - 6 && ex < bx0 + w + 6) return false;
        for (const o of boxes) if (bx0 < o.x + o.w + 8 && bx0 + w + 8 > o.x && by0 < o.y + o.h + 6 && by0 + hh + 6 > o.y) return false;
        return true;
      };
      const mid = t - 6 - hh / 2;
      const cands = [
        { x: c + hw + 12, y: mid, side: 'r' },
        { x: c - hw - 12 - w, y: mid, side: 'l' },
        { x: Math.min(xR - w, Math.max(x0 + 2, c - w / 2)), y: t - hh - 16, side: 't' },
      ];
      const pick = cands.find((p) => fits(p.x, p.y));
      if (!pick) { inline = false; break; }
      boxes.push({ ...pick, w, h: hh, i, nt });
    }
    // Marks need room over the tallest marked bar.
    let headroom = inline && boxes.length ? Math.max(6, 6 - Math.min(...boxes.map((o) => o.y))) : 6;
    if (notes.length && !inline) {
      const need = 30 - Math.min(...notes.map((nt) => topOf(idx.get(txt(nt.at).trim()))));
      headroom = Math.max(6, need);
    }
    const plotTop = y + headroom;
    const base = plotTop + plotH;
    const sy = (v) => base - (v / yMax) * plotH;

    // -- y title, grid, y ticks
    svg.appendChild(sv('text', { class: 'ytitle', x: 0, y: titleY }, yTitle));
    for (let v = 0; v <= yMax + 1e-9; v += yStep) {
      const yy = Math.round(sy(v)) + 0.5;
      if (v > 0) svg.appendChild(sv('line', { class: 'grid', x1: x0, x2: xR, y1: yy, y2: yy }));
      svg.appendChild(sv('text', { class: 'ytl', x: x0 - 8, y: yy + 4.5 }, v));
    }

    // -- exposure: a dot and label in row A, a dashed line down to the baseline
    if (hasExp) {
      const g = sv('g', { class: `${on(data.exposure) ? '' : 'hide'}${fresh(data.exposure) ? ' in-fade' : ''}` });
      g.appendChild(sv('line', { class: 'exp-line', x1: ex, x2: ex, y1: rowA + 2, y2: base }));
      g.appendChild(sv('circle', { class: 'exp-dot', cx: ex, cy: rowA - 4.5, r: 4.5 }));
      g.appendChild(sv('text', { class: 'exp-label', x: expX, y: rowA }, expLab));
      svg.appendChild(g);
      if (hasInc) {
        const tx = cx(idx.get(txt(data.incubation.to).trim()));
        const gi = sv('g', { class: `${on(data.incubation) ? '' : 'hide'}${fresh(data.incubation) ? ' in-fade' : ''}` });
        if (fresh(data.incubation) && fresh(data.exposure)) gi.style.animationDelay = '0.2s';
        gi.appendChild(sv('path', { class: 'inc-path', d: `M${ex} ${incY} H${tx} M${tx} ${incY - 5} V${incY + 5}` }));
        gi.appendChild(sv('path', { class: 'inc-head', d: `M${tx - 7} ${incY - 4.5} L${tx - 1} ${incY} L${tx - 7} ${incY + 4.5}` }));
        const il = txt(data.incubation.label);
        const iw = measure(svg, il, 'inc-label');
        const mid = Math.min(xR - iw / 2 - 6, Math.max(iw / 2 + 6, (ex + tx) / 2));
        // The label rides on the bracket; when the bracket is shorter than the label, it sits beside it.
        const room = tx - ex - 24 >= iw;
        const lx = room ? mid : (tx + 12 + iw <= xR ? tx + 12 + iw / 2 : mid);
        if (room) gi.appendChild(sv('rect', { class: 'inc-halo', x: lx - iw / 2 - 6, y: incY - 10, width: iw + 12, height: 20 }));
        gi.appendChild(sv('text', { class: 'inc-label', x: lx, y: incY + 4.5, 'text-anchor': 'middle' }, il));
        svg.appendChild(gi);
      }
    }

    // -- bars: one box per case when a box is tall enough to read as one
    const cellH = plotH / yMax;
    const perCase = cellH >= 5 && barW >= 6;
    const ghost = (i, lo, hi) => svg.appendChild(sv('rect', { class: 'ghostbar', x: bx(i) + 0.7, y: sy(hi) + 0.7, width: Math.max(1, barW - 1.4), height: Math.max(1, sy(lo) - sy(hi) - 1.4), rx: 1 }));
    let order = 0;
    bins.forEach((b, i) => {
      const tot = totalOf(data, b);
      if (tot === 0) return;
      if (!on(b)) { ghost(i, 0, tot); return; }
      const counts = countsOf(data, b);
      // A new bin grows whole; a series arriving later grows only its own part, on top of what is there.
      const g = sv('g', { class: `bin${fresh(b) ? ' in' : ''}` });
      if (fresh(b)) g.style.animationDelay = `${(order++) * 0.045}s`;
      let acc = 0;
      counts.forEach((c, k) => {
        if (!c) return;
        if (!sOn(k)) { ghost(i, acc, acc + c); acc += c; return; }
        let tgt = g;
        if (!fresh(b) && series && fresh(series[k])) {
          tgt = sv('g', { class: 'bin in' });
          tgt.style.animationDelay = `${(order++) * 0.045}s`;
          g.appendChild(tgt);
        }
        const tone = tok(`s${series ? toneOf(series[k], k) : 1}`, casefile);
        if (perCase) {
          for (let j = 0; j < c; j++) {
            const r = sv('rect', { class: 'seg cell', x: bx(i), y: sy(acc + j + 1), width: barW, height: cellH });
            r.style.fill = tone;
            tgt.appendChild(r);
          }
        } else {
          const r = sv('rect', { class: 'seg', x: bx(i), y: sy(acc + c), width: barW, height: sy(acc) - sy(acc + c) });
          r.style.fill = tone;
          tgt.appendChild(r);
        }
        acc += c;
      });
      svg.appendChild(g);
    });

    // -- baseline, x ticks thinned (never shrunk) to fit
    svg.appendChild(sv('line', { class: 'base', x1: x0, x2: xR, y1: base + 0.5, y2: base + 0.5 }));
    const lw = Math.max(...bins.map((b) => measure(svg, txt(b.label), 'xtl'))) + 12;
    const skip = Math.max(1, Math.ceil(lw / band));
    // Keep the exposure bin labelled when thinning: anchor the rhythm on it.
    const anchor = hasExp ? idx.get(txt(data.exposure.at).trim()) % skip : 0;
    bins.forEach((b, i) => {
      if ((i - anchor) % skip !== 0) return;
      const xx = cx(i);
      svg.appendChild(sv('line', { class: 'tick', x1: xx, x2: xx, y1: base + 1, y2: base + 5 }));
      const lab = txt(b.label);
      const half = measure(svg, lab, 'xtl') / 2;
      const tx = Math.min(xR + 2 - half, Math.max(half - 2, xx));
      svg.appendChild(sv('text', { class: 'xtl', x: tx, y: base + 21 }, lab));
    });
    const bottom = base + 27;

    // -- notes
    if (inline) {
      for (const bxo of boxes) {
        const { nt, i } = bxo;
        const bx0 = bxo.x, by0 = plotTop + bxo.y;
        const g = sv('g', { class: `nbox${on(nt) ? '' : ' hide'}${fresh(nt) ? ' in-fade' : ''}` });
        const top = sy(totalOf(data, bins[i]));
        const c = cx(i);
        // Leader: a dot over the bar's centre, then straight to the box.
        const dy = top - 6;
        let d;
        if (bxo.side === 't') d = `M${c} ${dy} V${by0 + bxo.h}`;
        else d = `M${c} ${dy} H${bxo.side === 'r' ? bx0 : bx0 + bxo.w}`;
        g.appendChild(sv('path', { class: 'leader', d }));
        g.appendChild(sv('circle', { class: 'leader-dot', cx: c, cy: dy, r: 3 }));
        g.appendChild(sv('rect', { class: 'nb', x: bx0, y: by0, width: bxo.w, height: bxo.h }));
        g.appendChild(sv('rect', { class: 'nb-edge', x: bx0, y: by0, width: 3, height: bxo.h }));
        let ty = by0 + 17;
        if (txt(nt.label)) { g.appendChild(sv('text', { class: 'nb-k', x: bx0 + 12, y: ty }, txt(nt.label).toUpperCase())); ty += 17; }
        g.appendChild(sv('text', { class: 'nb-t', x: bx0 + 12, y: ty }, txt(nt.text)));
        svg.appendChild(g);
      }
    } else {
      notes.forEach((nt, k) => {
        const i = idx.get(txt(nt.at).trim());
        const top = sy(totalOf(data, bins[i]));
        const g = sv('g', { class: `mark${on(nt) ? '' : ' hide'}${fresh(nt) ? ' in-fade' : ''}` });
        g.appendChild(sv('circle', { cx: cx(i), cy: top - 15, r: 11 }));
        g.appendChild(sv('text', { x: cx(i), y: top - 10.5 }, k + 1));
        svg.appendChild(g);
      });
    }

    svg.setAttribute('viewBox', `0 0 ${inner} ${Math.ceil(bottom)}`);
    svg.setAttribute('width', inner);
    svg.setAttribute('height', Math.ceil(bottom));

    // -- foot: x title left, legend right
    const foot = h('div', 'foot');
    foot.appendChild(h('div', 'xtitle', txt(data.xTitle)));
    const legend = h('div', 'legend');
    if (series) {
      series.forEach((s, k) => {
        const sp = h('span', on(s) ? (fresh(s) ? 'in-fade' : '') : 'ghost');
        const sw = h('i');
        sw.style.background = tok(`s${toneOf(s, k)}`, casefile);
        sp.append(sw, document.createTextNode(txt(s.label)));
        legend.appendChild(sp);
      });
    }
    if (perCase) {
      const sp = h('span', 'unit-key');
      const sw = h('i', 'unit');
      sw.style.background = tok(series ? 'grey' : 's1', casefile);
      sp.append(sw, document.createTextNode('1 box = 1 case'));
      legend.appendChild(sp);
    }
    foot.appendChild(legend);
    sheetEl.appendChild(foot);

    // -- fallback notes list, numbered to match the marks
    if (notes.length && !inline) {
      const list = h('div', 'notes');
      list.style.gridTemplateColumns = `repeat(${narrow ? 1 : Math.min(notes.length, inner >= 620 ? 3 : 2)}, minmax(0, 1fr))`;
      notes.forEach((nt, k) => {
        const d = h('div', `note${on(nt) ? '' : ' ghost'}${fresh(nt) ? ' in-fade' : ''}`);
        if (!on(nt)) d.setAttribute('aria-hidden', 'true');
        d.appendChild(h('span', 'n', String(k + 1)));
        const body = h('div');
        if (txt(nt.label)) body.appendChild(h('b', null, txt(nt.label)));
        body.appendChild(document.createTextNode(txt(nt.text)));
        d.appendChild(body);
        list.appendChild(d);
      });
      sheetEl.appendChild(list);
    }
  };
  const key = () => JSON.stringify([env.width, env.look, env.setting, env.tab, env.reducedMotion]);
  draw(!env.reducedMotion);
  drawnKey = key();

  return {
    setStep(b, animate) {
      if (!Number.isInteger(b) || b < 1) return;
      beat = b;
      draw(!!animate && !env.reducedMotion);
    },
    setOptions(e) {
      env = { ...env, ...(e || {}) };
      if (Number.isInteger(env.beat) && env.beat > 0) beat = env.beat;
      // Colours are live tokens: a light/dark change needs no redraw.
      const k = key();
      if (k === drawnKey) return;
      drawnKey = k;
      draw(false);
    },
    destroy() { dead = true; root.replaceChildren(); },
  };
}
