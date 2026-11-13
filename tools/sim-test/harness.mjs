// Fake-DOM host + canvas/ctx mocks for headless simulation tests. Mocks
// exactly what simulations-kit/src/simulations/base/*.js expects from its
// host (document.createElement('canvas'), rAF, IntersectionObserver,
// getComputedStyle) - no real browser involved.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isValidColor } from './color.mjs';

const VENDOR_DIR = fileURLToPath(new URL('../../simulations-kit/vendor/', import.meta.url));

let lastCtx = null;
let shownCtx = null;   // ctx of the first canvas put in the DOM: the scene's own, not an offscreen cache

/** '600 11px Inter, system-ui' -> 11. Falls back to the canvas default (10). */
function parseFontPx(font) {
  const m = /(\d+(?:\.\d+)?)px/.exec(String(font ?? ''));
  return m ? Number(m[1]) : 10;
}

function alignSpan(align, x, width) {
  if (align === 'center') return [x - width / 2, x + width / 2];
  if (align === 'right' || align === 'end') return [x - width, x];
  return [x, x + width]; // left/start/default
}

function baselineSpan(baseline, y, height) {
  if (baseline === 'top' || baseline === 'hanging') return [y, y + height];
  if (baseline === 'middle') return [y - height / 2, y + height / 2];
  if (baseline === 'bottom' || baseline === 'ideographic') return [y - height, y];
  return [y - height * 0.8, y + height * 0.2]; // alphabetic/default
}

function makeCtx(record) {
  const gradient = { addColorStop() {} };
  const base = {
    canvas: { width: 0, height: 0 },
    globalAlpha: 1,
    measureText: (t) => ({ width: String(t).length * parseFontPx(base.font) * 0.55 }),
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
    createPattern: () => ({}),
  };
  const calls = [];
  const colorWarnings = [];
  const textBoxes = [];
  const panelBoxes = [];
  let pendingRect = null; // args of the last rect()/roundRect(), awaiting its fill()
  // Current transform [a, b, c, d, e, f] and its save() stack, so boxes drawn
  // under translate/scale/rotate land where they really appear on the canvas.
  let m = [1, 0, 0, 1, 0, 0];
  // Draw state save()/restore() carry, like a real canvas.
  const STATE_KEYS = ['globalAlpha', 'fillStyle', 'strokeStyle', 'font', 'textAlign', 'textBaseline', 'lineWidth'];
  const stack = [];
  const apply = (x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  const mul = (n) => {
    m = [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3],
      m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
  };
  function trackTransform(prop, args) {
    if (prop === 'save') stack.push({ m: m.slice(), st: STATE_KEYS.map((k) => base[k]) });
    else if (prop === 'restore') {
      const top = stack.pop();
      if (top) { m = top.m; STATE_KEYS.forEach((k, i) => { base[k] = top.st[i]; }); }
    }
    else if (prop === 'translate') mul([1, 0, 0, 1, +args[0] || 0, +args[1] || 0]);
    else if (prop === 'scale') mul([+args[0] || 0, 0, 0, +(args[1] ?? args[0]) || 0, 0, 0]);
    else if (prop === 'rotate') { const a = +args[0] || 0; mul([Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0]); }
    else if (prop === 'transform') mul(args.map((v) => +v || 0));
    else if (prop === 'resetTransform') m = [1, 0, 0, 1, 0, 0];
    else if (prop === 'setTransform') {
      const o = args[0];
      m = o && typeof o === 'object' ? [o.a ?? 1, o.b ?? 0, o.c ?? 0, o.d ?? 1, o.e ?? 0, o.f ?? 0]
        : args.length >= 6 ? args.slice(0, 6).map((v) => +v || 0) : [1, 0, 0, 1, 0, 0];
    }
  }
  // Effective opacity of the current fill: a faint wash (a 5% tint band) is
  // decoration, not a container text is read against.
  function fillOpacity() {
    const f = String(base.fillStyle ?? '');
    let a = 1;
    const m1 = /^(?:rgba|hsla)\([^)]*[,/]\s*([\d.]+)(%?)\s*\)$/i.exec(f);
    if (m1) a = m1[2] ? parseFloat(m1[1]) / 100 : parseFloat(m1[1]);
    const m2 = /^#[0-9a-f]{6}([0-9a-f]{2})$/i.exec(f) || /^#[0-9a-f]{3}([0-9a-f])$/i.exec(f);
    if (m2) a = parseInt(m2[1].length === 1 ? m2[1] + m2[1] : m2[1], 16) / 255;
    const g = Number(base.globalAlpha);
    return a * (Number.isFinite(g) ? g : 1);
  }
  // Axis-aligned canvas-space box of a local rect under the current transform.
  function mapRect(x, y, w, h) {
    const pts = [apply(x, y), apply(x + w, y), apply(x, y + h), apply(x + w, y + h)];
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
  }
  let callCount = 0; // tracked in BOTH modes (unlike `calls`, gated by `record`)
  // - cheap enough to always run, and it's what the come-to-rest wake/idle
  // check (check.mjs) needs even under `sanity` mode's logic ctx.

  function recordTextBox(args) {
    const [text, lx, ly] = args;
    if (typeof lx !== 'number' || typeof ly !== 'number') return;
    // Text drawn under a collapsed transform (a pop-in at scale ~0) is invisible.
    if (Math.hypot(m[0], m[1]) < 0.05 || Math.hypot(m[2], m[3]) < 0.05) return;
    const [x, y] = apply(lx, ly);
    const fontPx = parseFontPx(base.font);
    const width = String(text).length * fontPx * 0.55 * Math.hypot(m[0], m[1]);
    const height = fontPx * 1.2 * Math.hypot(m[2], m[3]);
    const [x0, x1] = alignSpan(base.textAlign, x, width);
    const [y0, y1] = baselineSpan(base.textBaseline, y, height);
    // x,y (the anchor actually passed to fillText) is what "which container
    // is this in" should test - the bbox center drifts outside the container
    // precisely when text overflows it, which is the case being checked for.
    textBoxes.push({ text: String(text), x, y, x0, y0, x1, y1, fillStyle: base.fillStyle, frame: base._frame ?? 0 });
  }

  function recordPanelBox(args) {
    if (!args.slice(0, 4).every((v) => typeof v === 'number')) return;
    const [x, y, w, h] = mapRect(args[0], args[1], args[2], args[3]);
    if (w < 1 || h < 1 || fillOpacity() < 0.3) return;   // collapsed, or a faint wash
    panelBoxes.push({ x0: x, y0: y, x1: x + w, y1: y + h, fillStyle: base.fillStyle, frame: base._frame ?? 0 });
  }

  return new Proxy(base, {
    get(t, prop) {
      if (prop === '_calls') return calls;
      if (prop === '_callCount') return callCount;
      if (prop === '_colorWarnings') return colorWarnings;
      if (prop === '_textBoxes') return textBoxes;
      if (prop === '_panelBoxes') return panelBoxes;
      if (prop in t) return t[prop];
      if (typeof prop !== 'string') return undefined;
      return (...args) => {
        callCount++;
        if (record) {
          calls.push({ method: prop, args });
          trackTransform(prop, args);
          if (prop === 'fillText' || prop === 'strokeText') recordTextBox(args);
          else if (prop === 'rect' || prop === 'roundRect') pendingRect = args.every((v, i) => i > 3 || typeof v === 'number') ? mapRect(args[0], args[1], args[2], args[3]) : null;
          else if (prop === 'fillRect') recordPanelBox(args);
          else if (prop === 'fill' && pendingRect && pendingRect[2] >= 1 && pendingRect[3] >= 1 && fillOpacity() >= 0.3) { panelBoxes.push({ x0: pendingRect[0], y0: pendingRect[1], x1: pendingRect[0] + pendingRect[2], y1: pendingRect[1] + pendingRect[3], fillStyle: base.fillStyle, frame: base._frame ?? 0 }); pendingRect = null; }
          else if (prop === 'beginPath') pendingRect = null;
        }
      };
    },
    set(t, prop, v) {
      if ((prop === 'fillStyle' || prop === 'strokeStyle') && !isValidColor(v)) {
        colorWarnings.push({ prop, value: v });
      }
      t[prop] = v;
      return true;
    },
  });
}

/** Cheap ctx for logic/state-machine tests - draw calls are no-ops, uncounted.
 *  Still validates every fillStyle/strokeStyle assignment (see color.mjs) -
 *  that check is nearly free and catches a real, repeated mistake (assigning
 *  the wrong variable, e.g. `ctx.fillStyle = label` instead of `labelColor`)
 *  regardless of whether draw calls are otherwise being tracked. */
export function createLogicCtx() { return makeCtx(false); }

/** Recording ctx for drawing-logic tests - every call lands in ctx._calls:
 *  {method, args}[]; fillText/fillRect/rect+fill calls additionally populate
 *  ctx._textBoxes/_panelBoxes (approximate bounding boxes, tagged by
 *  ctx._frame) for the overlap/overflow/contrast checks in check.mjs. */
export function createDrawCtx() { return makeCtx(true); }

/** The ctx of the most recently created canvas - for assertions after scene.setup(). */
export function getLastCtx() { return shownCtx ?? lastCtx; }

function makeCanvas(ctxFactory) {
  const ctx = ctxFactory();
  lastCtx = ctx;
  return {
    width: 0, height: 0, style: { cssText: '' }, attrs: {},
    setAttribute(k, v) { this.attrs[k] = v; },
    getAttribute(k) { return this.attrs[k]; },
    focus() {}, addEventListener() {}, removeEventListener() {},
    getContext: () => ctx, remove() {},
  };
}

/** A minimal `classList` good enough for `.add()`/`.remove()`/`.toggle()`/
 *  `.contains()` - scenes use it to key CSS transitions off state, not for
 *  anything a real browser's cascade would need to resolve here. */
class FakeClassList {
  constructor(el) { this._el = el; this._set = new Set(); }
  add(...names) { for (const n of names) this._set.add(n); this._sync(); }
  remove(...names) { for (const n of names) this._set.delete(n); this._sync(); }
  toggle(name, force) {
    const has = this._set.has(name);
    const next = force === undefined ? !has : force;
    if (next) this._set.add(name); else this._set.delete(name);
    this._sync();
    return next;
  }
  contains(name) { return this._set.has(name); }
  _sync() { this._el.className = [...this._set].join(' '); }
}

/**
 * FakeElement - mocks what a DomSimulation scene needs from a DOM node:
 * children/parentNode, appendChild/removeChild/insertBefore, setAttribute/
 * getAttribute, classList, a recording (not cascading) style object,
 * textContent, addEventListener, tree-walking querySelector. No layout, no
 * computed styles - same philosophy as makeCanvas()/makeCtx() above.
 */
class FakeElement {
  constructor(tag) {
    this.tagName = String(tag || 'div').toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.attrs = {};
    this.style = {};
    // Non-enumerable so the recording style object still lists only real props.
    Object.defineProperty(this.style, 'setProperty', { value(k, v) { this[k] = String(v); }, enumerable: false });
    Object.defineProperty(this.style, 'getPropertyValue', { value(k) { return this[k] ?? ''; }, enumerable: false });
    Object.defineProperty(this.style, 'removeProperty', { value(k) { delete this[k]; }, enumerable: false });
    this.classList = new FakeClassList(this);
    this._className = '';
    this._text = '';
    this._listeners = new Map();
    // `data-step` <-> `dataset.step` - a DomSimulation scene's own
    // documented recommended pattern for driving CSS off beat state (see
    // docs/simulation-authoring.md #3.3), so this needs real support here,
    // not a workaround in every scene that uses it. camelCase <-> kebab-case
    // only (the common case) - no multi-word/Unicode dataset key handling.
    const attrs = this.attrs;
    this.dataset = new Proxy({}, {
      get(_t, prop) { return attrs[`data-${String(prop).replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}`]; },
      set(_t, prop, v) { attrs[`data-${String(prop).replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}`] = String(v); return true; },
    });
  }
  get textContent() { return this._text; }
  set textContent(v) { this._text = String(v); this.children = []; }
  // No HTML parser: a non-empty string becomes one opaque child (as in
  // insertAdjacentHTML) so "tree changed" holds; '' clears. Build with
  // createElement if the scene queries into what it rendered.
  get id() { return this.attrs.id ?? ''; }
  set id(v) { this.attrs.id = String(v); }
  get innerHTML() { return this._html ?? ''; }
  set innerHTML(v) {
    this.children = [];
    this._html = String(v ?? '');
    if (this._html) { const el = new FakeElement('div'); el._html = this._html; this.appendChild(el); }
  }
  // Real DOM keeps `className` and `classList` as two views of the same
  // underlying token set - a direct `el.className = '...'` assignment (as
  // DomSimulation.setup() does for its base + '--portrait' modifier class)
  // must be visible to a later `classList.add()` call, not silently
  // clobbered by it.
  get className() { return this._className; }
  set className(v) {
    this._className = String(v ?? '');
    this.classList._set = new Set(this._className.split(/\s+/).filter(Boolean));
  }
  appendChild(child) {
    if (!shownCtx && typeof child.getContext === 'function') shownCtx = child.getContext('2d');
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this;
    this.children.push(child);
    return child;
  }
  removeChild(child) {
    const i = this.children.indexOf(child);
    if (i >= 0) { this.children.splice(i, 1); child.parentNode = null; }
    return child;
  }
  insertBefore(child, ref) {
    if (child.parentNode) child.parentNode.removeChild(child);
    const i = ref ? this.children.indexOf(ref) : -1;
    if (i < 0) this.children.push(child); else this.children.splice(i, 0, child);
    child.parentNode = this;
    return child;
  }
  remove() { this.parentNode?.removeChild(this); }
  // ParentNode mixins: a string argument becomes a text child (tag #TEXT), as in a browser.
  static _nodes(args) { return args.map((a) => { if (a && typeof a === 'object') return a; const t = new FakeElement('#text'); t._text = String(a); return t; }); }
  append(...nodes) { for (const n of FakeElement._nodes(nodes)) this.appendChild(n); }
  prepend(...nodes) { const ref = this.children[0] || null; for (const n of FakeElement._nodes(nodes)) this.insertBefore(n, ref); }
  replaceChildren(...nodes) {
    for (const c of this.children) c.parentNode = null;
    this.children = []; this._html = '';
    this.append(...nodes);
  }
  // No HTML parser here: the markup becomes one opaque child (SimMascotDom
  // mounts Quill this way), so the tree visibly changes and teardown can empty it.
  insertAdjacentHTML(pos, html) {
    const el = new FakeElement('div');
    el._html = String(html);
    if (pos === 'afterbegin') this.insertBefore(el, this.children[0] || null);
    else if (pos === 'beforeend') this.appendChild(el);
    else if (this.parentNode) this.parentNode.insertBefore(el, pos === 'beforebegin' ? this : this.nextSibling);
  }
  get parentElement() { const p = this.parentNode; return p && p.nodeType !== 9 ? p : null; }
  get nextSibling() { const p = this.parentNode; return p ? p.children[p.children.indexOf(this) + 1] || null : null; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; }
  removeAttribute(k) { delete this.attrs[k]; }
  hasAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k); }
  addEventListener(type, fn) {
    if (!this._listeners.has(type)) this._listeners.set(type, new Set());
    this._listeners.get(type).add(fn);
  }
  removeEventListener(type, fn) { this._listeners.get(type)?.delete(fn); }
  dispatchEvent(evt) {
    for (const fn of this._listeners.get(evt?.type) ?? []) fn(evt);
    return true;
  }
  focus() {}
  /** Depth-first walk supporting the handful of selector shapes real scenes
   *  actually use: a bare tag name, `.class`, `[attr]`/`[attr="value"]`, and
   *  a comma-separated list of those (content-block.js's own focus selector
   *  is exactly this shape - see its `_focusSimIfAtLastBeat()`). Not a real
   *  CSS selector engine. */
  querySelector(selector) {
    const clauses = selector.split(',').map((s) => s.trim());
    const matches = (el, clause) => {
      if (clause.startsWith('.')) return el.classList?.contains(clause.slice(1));
      if (clause.startsWith('#')) return el.getAttribute?.('id') === clause.slice(1);
      const attrMatch = /^\[([\w-]+)(?:="([^"]*)")?\]$/.exec(clause);
      if (attrMatch) {
        const [, attr, val] = attrMatch;
        return val === undefined ? el.hasAttribute?.(attr) : el.getAttribute?.(attr) === val;
      }
      return el.tagName === clause.toUpperCase();
    };
    const walk = (el) => {
      for (const child of el.children ?? []) {
        if (clauses.some((c) => matches(child, c))) return child;
        const found = walk(child);
        if (found) return found;
      }
      return null;
    };
    return walk(this);
  }
  querySelectorAll(selector) {
    const out = [];
    let node = this.querySelector(selector);
    // Cheap approximation good enough for test assertions ("something
    // matching X exists / N of them") - a full tree collect, not scoped
    // iteration, since no real scene depends on ordering here.
    const clauses = selector.split(',').map((s) => s.trim());
    const matches = (el, clause) => {
      if (clause.startsWith('.')) return el.classList?.contains(clause.slice(1));
      if (clause.startsWith('#')) return el.getAttribute?.('id') === clause.slice(1);
      return el.tagName === clause.toUpperCase();
    };
    const walk = (el) => {
      for (const child of el.children ?? []) {
        if (clauses.some((c) => matches(child, c))) out.push(child);
        walk(child);
      }
    };
    walk(this);
    return out;
  }
}

/** A fake mount target scenes are constructed with. A FakeElement itself, so
 *  DomSimulation's `container.appendChild()`/ResizeObserver.observe() work
 *  as in a real browser. Optional `{width, height}` sets clientWidth/
 *  clientHeight, to exercise `_resolveIsPortrait()`'s container-shape
 *  fallback headlessly; both default undefined (unchanged behavior). */
export function makeContainer({ width, height } = {}) {
  const el = new FakeElement('div');
  if (width  != null) el.clientWidth  = width;
  if (height != null) el.clientHeight = height;
  return el;
}

// The headless host has no palette CSS, so SimTheme logs ~30 "[SimTheme] no palette role" lines per run,
// burying real output in every log. Drop exactly those; everything else prints.
if (!console.debug.__quietTheme) {
  const _debug = console.debug.bind(console);
  console.debug = (...a) => { if (typeof a[0] === 'string' && a[0].startsWith('[SimTheme]')) return; _debug(...a); };
  console.debug.__quietTheme = true;
}

// -- Fake clock + rAF scheduler --
// Without a controlled clock, performance.now() falls back to Node's real
// wall clock, making SimulationBase's come-to-rest budget expiry
// nondeterministic headlessly. `pumpFrame(dt)` advances the fake clock and
// invokes any pending frame, mirroring one real animation frame `dt` ms
// later; a scene's own `_loop` re-registers via this same
// requestAnimationFrame, so repeated calls chain naturally.
let _fakeNow = 0;
let _pendingRaf = null; // { id, cb } | null - at most one in flight, like a real single-callback loop
let _rafIdSeq = 1;

function installFakeClock() {
  _dropTimers();
  _fakeNow = 0;
  _pendingRaf = null;
  globalThis.performance = { now: () => _fakeNow };
}

// -- Fake timers (opt-in: drive.mjs installs them) --
// setTimeout/setInterval callbacks run on the fake clock, so a scene that delays work
// with setTimeout (DOM scenes, mostly) can be stepped through in milliseconds instead of
// real seconds. Hybrid on purpose: each timer also keeps a REAL fallback timer, so a
// script that still does `await sleep(5600)` behaves exactly as before (never hangs),
// it just finishes early when the fake clock reached the timer first.
const _real = { setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout, setInterval: globalThis.setInterval, clearInterval: globalThis.clearInterval };
let _timers = null; // Map<id, { at, every, cb, args, real }> | null when not installed
let _timerSeq = 1;

function _dropTimers() {
  if (_timers) for (const t of _timers.values()) (t.every ? _real.clearInterval : _real.clearTimeout)(t.real);
  if (_timers) Object.assign(globalThis, _real);
  _timers = null;
}

/** Route setTimeout/setInterval through the fake clock (idempotent; reset by installFakeHost). */
export function installFakeTimers() {
  if (_timers) return;
  _timers = new Map();
  const add = (every) => (cb, ms = 0, ...args) => {
    const id = _timerSeq++;
    const d = Math.max(0, Number(ms) || 0);
    const t = { at: _fakeNow + d, every: every ? Math.max(1, d) : 0, cb, args, real: null };
    const fire = () => {
      if (!_timers || !_timers.has(id)) return;
      if (!t.every) { _timers.delete(id); _real.clearTimeout(t.real); }
      else t.at = Math.max(t.at, _fakeNow) + t.every;
      cb(...args);
    };
    t.fire = fire;
    t.real = every ? _real.setInterval(fire, Math.max(1, d)) : _real.setTimeout(fire, d);
    _timers.set(id, t);
    return id;
  };
  const clear = (id) => {
    const t = _timers?.get(id);
    if (t) { (t.every ? _real.clearInterval : _real.clearTimeout)(t.real); _timers.delete(id); }
    else _real.clearTimeout(id);
  };
  globalThis.setTimeout = add(false);
  globalThis.setInterval = add(true);
  globalThis.clearTimeout = clear;
  globalThis.clearInterval = clear;
}

function _runDueTimers() {
  if (!_timers) return;
  for (let guard = 0; guard < 10000; guard++) {
    let next = null;
    for (const [id, t] of _timers) if (t.at <= _fakeNow && (!next || t.at < next[1].at)) next = [id, t];
    if (!next) return;
    next[1].fire();
  }
}

/** How many fake timers are still waiting (drive.mjs reports it). */
export function pendingTimers() { return _timers ? _timers.size : 0; }

/** Advances the fake clock by `dtMs` and, if a frame is pending, invokes its
 *  callback with the new timestamp. Returns whether a frame actually ran -
 *  `false` means the loop is parked (nothing scheduled). */
export function pumpFrame(dtMs = 16.7) {
  _fakeNow += dtMs;
  _runDueTimers();
  const pending = _pendingRaf;
  _pendingRaf = null;
  if (pending) { pending.cb(_fakeNow); return true; }
  return false;
}

export function getFakeNow() { return _fakeNow; }

/** Installs document/window/rAF/IntersectionObserver/ResizeObserver/
 *  getComputedStyle globals, and resets the fake clock and `getLastCtx()`.
 *  Safe to call once per process (the common case) or again before each
 *  scene in a batch (audit-continuous.mjs) - either way every scene starts
 *  from the same clean state. */
export function installFakeHost(ctxFactory = createLogicCtx) {
  lastCtx = null;
  shownCtx = null;
  installFakeClock();
  // `documentElement` - a scene's `_isDark()` commonly reads
  // `document.documentElement.getAttribute('data-theme')` (the same pattern
  // src/core/ThemeManager.js itself uses) to follow the real theme instead
  // of guessing from colors; without this, that call throws (no attribute
  // set = no forced theme, matching an untouched real `<html>`).
  const documentElement = new FakeElement('html');
  globalThis.document = {
    documentElement,
    createElement: (tag) => (tag === 'canvas' ? makeCanvas(ctxFactory) : new FakeElement(tag)),
    createElementNS: (_ns, tag) => new FakeElement(tag),
    addEventListener() {}, removeEventListener() {}, hidden: false,
  };
  globalThis.window = globalThis;
  // Node's global is not an EventTarget; DomSimulation (FILL_HEIGHT) listens on window.
  if (typeof globalThis.addEventListener !== 'function') { globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {}; }
  globalThis.requestAnimationFrame = (cb) => {
    const id = _rafIdSeq++;
    _pendingRaf = { id, cb };
    return id;
  };
  globalThis.cancelAnimationFrame = (id) => {
    if (_pendingRaf && _pendingRaf.id === id) _pendingRaf = null;
  };
  globalThis.IntersectionObserver = class { observe() {} disconnect() {} };
  // Path2D (batched paths, e.g. GeoMap point layers): a no-op path object; the fake ctx accepts it.
  if (typeof globalThis.Path2D !== 'function') globalThis.Path2D = class { moveTo() {} lineTo() {} arc() {} arcTo() {} ellipse() {} rect() {} closePath() {} bezierCurveTo() {} quadraticCurveTo() {} addPath() {} };
  globalThis.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} };
  globalThis.getComputedStyle = () => ({ getPropertyValue: () => '' });
  // SimGeo.js's loadWorld() fetch()es its world-atlas data by root-absolute
  // `/vendor/...` path - real browsers (app root or preview-harness.html
  // serving simulations-kit/ as its own root) both resolve that; plain Node
  // has no HTTP root to resolve against, so read the same file straight off
  // disk instead (loader.mjs does the equivalent for `import('/vendor/...')`).
  globalThis.fetch = async (url) => {
    const p = String(url);
    if (!p.startsWith('/vendor/')) throw new Error(`[sim-test fetch stub] only /vendor/... paths are supported, got: ${p}`);
    const filePath = path.join(VENDOR_DIR, p.slice('/vendor/'.length));
    const body = await fs.promises.readFile(filePath, 'utf8');
    return { ok: true, status: 200, json: async () => JSON.parse(body), text: async () => body };
  };
}

/**
 * Drives an already-started() scene through the come-to-rest contract over
 * the fake clock: a state change must grow draw calls within a few pumped
 * frames (**wake**), and - unless `CONTINUOUS` - stop growing once settled
 * (**idle**). Shared by check.mjs (step()/FAIL lines) and
 * audit-continuous.mjs (bulk classification). Caller owns start()/teardown.
 */
export function runComeToRestCheck(scene, { beatsCount, triggerBeat = beatsCount - 1 } = {}) {
  const before = getLastCtx()?._callCount ?? 0;
  if (typeof scene.onBeatChange === 'function') scene.onBeatChange(triggerBeat, beatsCount);
  else scene.animateFor?.();
  for (let f = 0; f < 5; f++) pumpFrame(16.7);
  const afterWake = getLastCtx()?._callCount ?? 0;
  const wakeOk = afterWake > before;

  if (scene.constructor.CONTINUOUS) {
    return { wakeOk, before, afterWake, idleApplicable: false };
  }

  // The animation budget started counting down from the onBeatChange/
  // animateFor call above, at fake-time 0 - pump comfortably past it
  // (generous margin, since a scene may legitimately re-extend the budget
  // once or twice more while its own transition is still settling) before
  // taking the "should be parked by now" snapshot.
  const budgetMs = Number.isFinite(scene.constructor.DEFAULT_TRANSITION_MS) ? scene.constructor.DEFAULT_TRANSITION_MS : 900;
  const settleFrames = Math.ceil((budgetMs * 2 + 500) / 16.7);
  for (let f = 0; f < settleFrames; f++) pumpFrame(16.7);
  // A scene whose busy() run outlasts that (a short DEFAULT_TRANSITION_MS plus a
  // 3 s scripted run) keeps extending its own budget: allow up to 15 s to go quiet.
  let mid = getLastCtx()?._callCount ?? 0, end = mid;
  for (let waited = settleFrames * 16.7; ; waited += 20 * 16.7) {
    mid = getLastCtx()?._callCount ?? 0;
    for (let f = 0; f < 20; f++) pumpFrame(16.7);
    end = getLastCtx()?._callCount ?? 0;
    if (end <= mid || waited > 15000) break;
  }
  return { wakeOk, before, afterWake, idleApplicable: true, idleOk: end <= mid, mid, end, budgetMs };
}

// -- Tiny assertion helpers for hand-written test files (README #3) ---------
let failures = 0;
export function check(cond, msg) {
  if (!cond) { failures++; console.error('FAIL:', msg); }
  else console.log('ok:', msg);
}
export function summary() {
  console.log(failures === 0 ? 'PASS - all checks green' : `FAIL - ${failures} check(s) failed`);
  return failures === 0 ? 0 : 1;
}
