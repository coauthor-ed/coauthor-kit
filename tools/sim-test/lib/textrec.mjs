// Page-side text instrumentation shared by shoot and motion-probe. recorder() is passed to
// page.addInitScript, so it must stay self-contained (no closure over module scope).
//
// recorder: record every fillText with its real font, transform and fill, grouped by frame (a
// full-canvas clear starts one). window.__texts holds the last two frames, window.__frame counts.
export function recorder() {
  const P = CanvasRenderingContext2D.prototype;
  window.__texts = []; window.__frame = 0;
  const ft = P.fillText, cr = P.clearRect, fr = P.fillRect;
  const full = (ctx, w, h) => { const m = ctx.getTransform(); return w * m.a >= ctx.canvas.width * 0.9 && h * m.d >= ctx.canvas.height * 0.9; };
  P.clearRect = function (x, y, w, h) { if (full(this, w, h)) { window.__frame++; window.__texts = window.__texts.filter((t) => t.frame >= window.__frame - 1); } return cr.call(this, x, y, w, h); };
  P.fillRect = function (x, y, w, h) { if (full(this, w, h) && x <= 0 && y <= 0) { window.__frame++; window.__texts = window.__texts.filter((t) => t.frame >= window.__frame - 1); } return fr.call(this, x, y, w, h); };
  P.fillText = function (text, x, y, maxW) {
    try {
      const m = this.getTransform();
      window.__texts.push({ frame: window.__frame, text: String(text), x, y, font: this.font, align: this.textAlign, base: this.textBaseline,
        fill: typeof this.fillStyle === 'string' ? this.fillStyle : null, alpha: this.globalAlpha, m: [m.a, m.b, m.c, m.d, m.e, m.f] });
    } catch { /* never break the scene */ }
    return ft.call(this, text, x, y, maxW);
  };
}
