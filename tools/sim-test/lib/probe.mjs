// Model-state probes shared by freeze.mjs and resume-probe.mjs. Run under the
// sim-test loader (node tools/sim-test/run.mjs exec ...). A snapshot is the
// scene's own fields, rounded, minus clocks, DOM/canvas handles and base-class
// internals, so two runs that reach the same model compare equal.
import { pathToFileURL } from 'node:url';
import { installFakeHost, createLogicCtx, makeContainer, pumpFrame } from '../harness.mjs';

const IGN = /^(_k|_clock|_age|_fade|_t|_lastTs|_animateUntil|_rafId|_running|_hasStarted|_dwellTimerId|colors|container|root|_canvas|_ctx|_burst|_stage|_onDown|_onMove|_onUp|_onPointerUp|_onPointerDown|_onPointerMove|_visibilityHandler|_intersectionObserver|_themeHandler|requestUiUpdate|allowResume|config|beatCount|_scaleWrap|_designW|_designH|_isPortrait|stepIndex|\w*Age|_age\w*|_\w*T|_h|_ph|_alt|_hold|_time)$/;
const IGN_DEEP = /^(age|t|life|clock|ph|phase|phase_t|wob|bob)$/;

export function snap(o, depth = 0, seen = new Set()) {
  if (o == null || typeof o === 'boolean' || typeof o === 'string') return o;
  if (typeof o === 'number') return Math.round(o * 100) / 100;
  if (typeof o === 'function') return undefined;
  if (typeof o !== 'object' || seen.has(o) || depth > 4) return '~';
  if (depth > 0 && (o.nodeType || o.getContext || o.tagName || o.canvas)) return '~';
  seen.add(o);
  if (Array.isArray(o)) return o.slice(0, 60).map((v) => snap(v, depth + 1, seen));
  if (o instanceof Set) return [...o].map((v) => snap(v, depth + 1, seen)).sort();
  if (o instanceof Map) return [...o.entries()].map((v) => snap(v, depth + 1, seen));
  const r = {};
  for (const k of Object.keys(o)) {
    if (depth === 0 && IGN.test(k)) continue;
    if (depth > 0 && IGN_DEEP.test(k)) continue;
    const v = snap(o[k], depth + 1, seen);
    if (v !== undefined) r[k] = v;
  }
  return r;
}

export function diff(a, b, ignore, p = '', out = []) {
  if (out.length > 6 || (p && ignore && ignore.test(p))) return out;
  if (typeof a !== 'object' || typeof b !== 'object' || a == null || b == null) {
    if (JSON.stringify(a) !== JSON.stringify(b)) out.push(`${p}: ${JSON.stringify(a)?.slice(0, 40)} -> ${JSON.stringify(b)?.slice(0, 40)}`);
    return out;
  }
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) diff(a[k], b[k], ignore, p ? `${p}.${k}` : k, out);
  return out;
}

export function seeded(seed = 12345) {
  let s = seed;
  return () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export async function loadScene(file) {
  installFakeHost(createLogicCtx);
  const mod = await import(pathToFileURL(file).href);
  const S = Object.values(mod).find((v) => typeof v === 'function' && typeof v.prototype?.setup === 'function');
  if (!S) throw new Error(`no scene class exported by ${file}`);
  return S;
}

export const ownContinuous = (S) => (Object.prototype.hasOwnProperty.call(S, 'CONTINUOUS') ? S.CONTINUOUS : undefined);

// A fresh mount, as the host does it: setup, onBeatChange(first), start.
export async function mount(S, { force, own }) {
  installFakeHost(createLogicCtx);
  Math.random = seeded();
  if (force) S.CONTINUOUS = true; else if (own === undefined) delete S.CONTINUOUS; else S.CONTINUOUS = own;
  const sc = new S(makeContainer());
  sc.requestUiUpdate = () => {};
  sc.allowResume = true;
  await sc.setup();
  return sc;
}

export function pump(ms) {
  let ran = 0;
  for (let t = 0; t < ms; t += 16.7) if (pumpFrame(16.7)) ran++;
  return ran;
}

// Controls on offer after walking to beat b: one action per visible control.
export async function actionsAt(S, b, beats) {
  installFakeHost(createLogicCtx);
  const tmp = new S(makeContainer());
  tmp.requestUiUpdate = () => {};
  await tmp.setup();
  for (let i = 0; i <= b; i++) tmp.onBeatChange?.(i, beats);
  const acts = [];
  for (const c of S.CONTROLS ?? []) {
    if (tmp.isControlHidden?.(c.id) || tmp.isControlDisabled?.(c.id)) continue;
    if (c.type === 'button') acts.push([`${c.id}`, (sc) => sc.onControlChange(c.id, true)]);
    else if (c.type === 'select' || c.type === 'segmented') {
      const cur = tmp.getControlValue?.(c.id);
      const o = (c.options ?? []).find((x) => x.value !== cur);
      if (o) acts.push([`${c.id}=${o.value}`, (sc) => sc.onControlChange(c.id, o.value)]);
    } else if (c.type === 'toggle' || c.type === 'checkbox') acts.push([`${c.id}~`, (sc) => sc.onControlChange(c.id, !tmp.getControlValue?.(c.id))]);
    else if (c.type === 'slider' || c.type === 'range' || c.type === 'number') acts.push([`${c.id}=max`, (sc) => sc.onControlChange(c.id, c.max)]);
  }
  tmp.destroy?.();
  return acts;
}
