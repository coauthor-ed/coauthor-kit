// The DOM counterpart of shoot's canvas text report: what a learner can READ in a DomSimulation, measured in the
// browser in design px. Text at opacity ~0, display:none, visibility:hidden, or clipped away by an overflow ancestor is
// not read, so it is not checked (nor is visually-hidden screen-reader text: 1px clipped box, clip rect(0,0,0,0), clip-path inset(50%)). Runs in the page (page.evaluate(analyseDom)); it must stay self-contained.
//   overlap    two different texts whose boxes intersect
//   small      text under 14 design px (the DOM floor)
//   contrast   text against its own background under 3:1 (skipped over a gradient or picture)
//   off-frame  text outside the scene frame
export function analyseDom() {
  const sc = window.__scene;
  const root = sc.root || document.querySelector('#sim-host');
  const rr = root.getBoundingClientRect();
  const scale = (rr.width / root.offsetWidth) || 1;
  const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  // A colour as the browser really paints it: fill one pixel and read it back. (color-mix() and oklab() computed values are
  // returned by the canvas as the same functional string, so parsing the string gives nonsense.)
  probe.canvas.width = 1; probe.canvas.height = 1;
  const px = (str) => { probe.clearRect(0, 0, 1, 1); probe.fillStyle = '#000'; probe.fillStyle = str; probe.fillRect(0, 0, 1, 1); const d = probe.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const parseCol = (str) => px(str).slice(0, 3);
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const bgOf = (el) => {
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.backgroundImage !== 'none') return null;
      const c = px(cs.backgroundColor);
      if (c && c[3] > 0.6) return c.slice(0, 3);
    }
    return null;
  };
  const boxes = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const text = n.textContent.replace(/\s+/g, ' ').trim();
    const el = n.parentElement;
    if (!text || !el || /^(STYLE|SCRIPT)$/.test(el.tagName)) continue;
    const rg = document.createRange(); rg.selectNodeContents(n);
    const r = rg.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    let vis = { left: r.left, top: r.top, right: r.right, bottom: r.bottom }, op = 1, gone = false;
    for (let a = el; a && a !== root.parentElement; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (cs.display === 'none' || cs.visibility === 'hidden') { gone = true; break; }
      // Visually-hidden screen-reader text (the sr-only pattern): a 1px clipped box, or clip / clip-path that shows nothing.
      const tiny = parseFloat(cs.width) <= 1.5 && parseFloat(cs.height) <= 1.5 && cs.overflow !== 'visible';
      if (tiny || /^rect\((0(px)?[ ,]*){4}\)$/.test(cs.clip) || /^inset\((50|100)%\)$/.test(cs.clipPath)) { gone = true; break; }
      op *= parseFloat(cs.opacity);
      if (a !== root && (cs.overflowX !== 'visible' || cs.overflowY !== 'visible')) {
        const ar = a.getBoundingClientRect();
        vis = { left: Math.max(vis.left, ar.left), top: Math.max(vis.top, ar.top), right: Math.min(vis.right, ar.right), bottom: Math.min(vis.bottom, ar.bottom) };
        if (vis.right <= vis.left || vis.bottom <= vis.top) { gone = true; break; }
      }
    }
    if (gone || op < 0.35) continue;
    const cs = getComputedStyle(el);
    const fg = parseCol(cs.color), bg = bgOf(el);
    boxes.push({ text, x0: (r.left - rr.left) / scale, x1: (r.right - rr.left) / scale, y0: (r.top - rr.top) / scale, y1: (r.bottom - rr.top) / scale,
      fontPx: parseFloat(cs.fontSize), ratio: fg && bg ? ratio(fg, bg) : null, el });
  }
  const W = root.offsetWidth, H = root.offsetHeight;
  const q = (t) => JSON.stringify(t.length > 28 ? t.slice(0, 26) + '..' : t);
  const issues = [];
  for (let i = 0; i < boxes.length; i++) {
    const A = boxes[i];
    if (A.x0 < -2 || A.x1 > W + 2 || A.y0 < -2 || A.y1 > H + 2) issues.push(`off-frame ${q(A.text)} at (${Math.round(A.x0)},${Math.round(A.y0)})-(${Math.round(A.x1)},${Math.round(A.y1)})`);
    if (A.fontPx && A.fontPx < 13.5) issues.push(`small ${q(A.text)} ${A.fontPx.toFixed(1)}px (DOM floor 14)`);
    if (A.ratio != null && A.ratio < 3) issues.push(`contrast ${q(A.text)} ${A.ratio.toFixed(1)}:1`);
    for (let j = i + 1; j < boxes.length; j++) {
      const B = boxes[j];
      if (A.text === B.text || A.el === B.el) continue;
      const ix = Math.min(A.x1, B.x1) - Math.max(A.x0, B.x0), iy = Math.min(A.y1, B.y1) - Math.max(A.y0, B.y0);
      if (ix > 2 && iy > 2) issues.push(`overlap ${q(A.text)} x ${q(B.text)} at (${Math.round(Math.max(A.x0, B.x0))},${Math.round(Math.max(A.y0, B.y0))})`);
    }
  }
  return { texts: boxes.length, issues: [...new Set(issues)].slice(0, 12), dom: true };
}
