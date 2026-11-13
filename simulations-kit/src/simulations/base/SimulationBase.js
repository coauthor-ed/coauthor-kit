import { InteractiveSceneBase } from './InteractiveSceneBase.js';
import { EventBus } from '../../core/EventBus.js';

/**
 * SimulationBase - abstract lifecycle for Canvas/WebGL/Matter.js simulations.
 *
 * Canonical location. src/core/components/SimulationBase.js re-exports from
 * here (backward compat).
 *
 * Subclasses override setup(), step(dtMs), destroy(). The rAF loop lives
 * here; subclasses never call requestAnimationFrame directly (HLD Appendix
 * C.5, B.2).
 *
 * Theme reactivity: implement `_reloadColors()` (repopulate `this.colors`)
 * and `refreshTheme()` (repaint only) for live light/dark repaint - see
 * CanvasSimulation/PhysicsSimulation. Both optional no-ops otherwise.
 *
 * -- Come-to-rest (docs/sprints/wip/dom-simulations-md-prose-and-
 * explanation-slides.md #5) --
 * The rAF loop only runs while a self-clearing animation budget
 * (`animateFor()`) is unexpired; it parks once the budget runs out, no
 * "clear the flag" needed. `onBeatChange`/`onControlChange` extend it
 * automatically (`_wrapAnimateHooks()`), so a scene with no timer/animation
 * longer than `DEFAULT_TRANSITION_MS` needs zero explicit calls.
 *
 * `static CONTINUOUS` is `false` for every base class except `PhysicsSimulation`
 * and `ParticleSimulation` (Matter must keep stepping; Brownian motion never
 * settles), which declare `true`. POLICY (battery and CPU on low-end devices):
 * a scene comes to rest by default and declares `static CONTINUOUS = true`
 * only when its motion genuinely never ends (an orbit, an endless pulse, a
 * looping final beat), with a one-line reason. A `false` scene must:
 *   - implement `onBeatChange`/`onControlChange` - defining them is what wires
 *     the automatic `animateFor()`; a scene with neither draws one frame and
 *     then parks for good;
 *   - call `this.animateFor(ms)` itself from anything else that changes what
 *     is drawn: pointer/drag handlers, its own timers and dwell chains, and any
 *     run, easing or scripted sequence longer than `DEFAULT_TRANSITION_MS`
 *     (pass the real duration);
 *   - end every run/motion (time limit, settled threshold, exited flag);
 *   - never reuse this class's internal names for its own fields or methods
 *     (`_running`, `_rafId`, `_lastTs`, `_hasStarted`, `_animateUntil`,
 *     `_dwellTimerId`, `_visibilityHandler`, `_intersectionObserver`,
 *     `_themeHandler`) - doing so breaks parking/starting with no error.
 * Older scenes that relied on an always-running loop must declare
 * `static CONTINUOUS = true` or be fixed to follow the rules above; classify
 * them with tools/sim-test/audit-continuous.mjs.
 *
 * `CanvasSimulation.refreshTheme()`/`WebGLSimulation.refreshTheme()` call
 * `_tick()` directly, not through the loop, so a resting scene still
 * repaints on a theme toggle.
 */
export class SimulationBase extends InteractiveSceneBase {
  /** Milliseconds an unparameterized `animateFor()` keeps the loop running -
   *  long enough for a beat/control-triggered transition to finish before
   *  parking. Set generous (shipped scenes run up to ~4.5s settle
   *  transitions): too short silently freezes a scene mid-animation, too
   *  long just costs idle battery - the asymmetry favors high. A scene with
   *  a longer known entrance should call `this.animateFor(ms)` itself. */
  static DEFAULT_TRANSITION_MS = 8000;

  /** Opt-in for genuinely perpetual motion - see the class doc comment.
   *  Default false: a scene comes to rest once nothing is animating it. */
  static CONTINUOUS = false;

  /**
   * @param {HTMLCanvasElement} canvasEl
   * @param {object} config  Opaque sim-specific config
   */
  constructor(container, config) {
    super(container, config);
    this._rafId = null;
    this._lastTs = null;
    this._running = false;
    this._hasStarted = false;
    this._visibilityHandler = this._onVisibilityChange.bind(this);
    this._intersectionObserver = null;
    this._themeHandler = null;
    this._animateUntil = 0;   // performance.now() timestamp; loop parks once past this
    this._dwellTimerId = null;
    this._wrapAnimateHooks();
  }

  /**
   * Extends the running budget until `performance.now() > now + ms`, then
   * parks; restarts the loop if already parked. Idempotent - budget only
   * grows (`Math.max`), never shrinks.
   * @param {number} [ms] defaults to `static DEFAULT_TRANSITION_MS`
   */
  animateFor(ms = this.constructor.DEFAULT_TRANSITION_MS) {
    const now = performance.now();
    this._animateUntil = Math.max(this._animateUntil, now + ms);
    if (this._running && this._rafId == null) {
      this._rafId = requestAnimationFrame(this._loop.bind(this));
    }
  }

  /**
   * Wraps `onBeatChange`/`onControlChange`/`onCue`, if defined, so just
   * defining them gets `animateFor()` for free - call sites (content-block.js,
   * simulationHost.js) are unchanged. Safe in the constructor: subclasses
   * reach `super()` before their own body can use either method. Instance-
   * property wrap, not prototype editing, so only this instance is affected.
   */
  _wrapAnimateHooks() {
    for (const name of ['onBeatChange', 'onControlChange', 'onCue']) {
      const orig = this[name];
      if (typeof orig !== 'function') continue;
      this[name] = (...args) => {
        const result = orig.apply(this, args);
        this.animateFor();
        return result;
      };
    }
  }

  /**
   * Starts (or restarts) a single dwell timer: after `ms`, extends the
   * animation budget and calls `onFire()` - use this for a `BEAT_STEP_MAP`
   * auto-advance chain instead of a per-frame countdown in `_tick`/`step`.
   * Clears any pending timer first, so restarting a chain never overlaps.
   * Also lets a `DomSimulation` (no `_tick` loop) use dwell chains.
   */
  startDwellTimer(ms, onFire) {
    this.clearDwellTimer();
    this._dwellTimerId = setTimeout(() => {
      this._dwellTimerId = null;
      this.animateFor();
      onFire();
    }, ms);
  }

  /** Cancels a pending dwell timer, if any. Called automatically from
   *  pause()/stop() - a scene only needs to call this itself to abandon a
   *  chain early (e.g. the student navigated away from it by hand). */
  clearDwellTimer() {
    if (this._dwellTimerId != null) {
      clearTimeout(this._dwellTimerId);
      this._dwellTimerId = null;
    }
  }

  /** Override: create world/context/initial state once. Subclasses must call super.setup(). */
  setup() {
    // Subscribe once - theme changes must be caught even before start() (e.g.
    // a paused initial frame shown pre-play), so this happens in setup(), not start().
    if (!this._themeHandler) {
      this._themeHandler = () => {
        this._reloadColors?.();
        this.refreshTheme?.();
      };
      EventBus.on('theme:changed', this._themeHandler);
    }
  }

  /** Override: advance simulation by dtMs milliseconds. */
  step(dtMs) {} // eslint-disable-line no-unused-vars

  /** Override: release GPU/canvas/engine resources. Must be idempotent. */
  destroy() {}

  /** Start the rAF-driven loop. Call from plugin's connectedCallback. */
  start() {
    if (this._running) return;
    this._running = true;
    this._hasStarted = true;
    this._lastTs = performance.now();
    this._rafId = requestAnimationFrame(this._loop.bind(this));

    // Pause when tab is backgrounded (battery saving on low-end, HLD #18)
    document.addEventListener('visibilitychange', this._visibilityHandler);

    // Pause when scrolled out of view (IntersectionObserver, HLD #18)
    if (this.container) {
      this._intersectionObserver = new IntersectionObserver(entries => {
        const visible = entries[0].isIntersecting;
        if (visible) this.resume(); else this.pause();
      }, { threshold: 0.1 });
      this._intersectionObserver.observe(this.container);
    }
  }

  /** Stop the loop and release all resources. Call from plugin's disconnectedCallback. */
  stop() {
    if (this._themeHandler) {
      EventBus.off('theme:changed', this._themeHandler);
      this._themeHandler = null;
    }
    this.clearDwellTimer();
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._rafId = null;
    this._running = false;
    document.removeEventListener('visibilitychange', this._visibilityHandler);
    if (this._intersectionObserver) {
      this._intersectionObserver.disconnect();
      this._intersectionObserver = null;
    }
    this.destroy();
  }

  _loop(ts) {
    if (!this._running) return;
    const dt = ts - (this._lastTs ?? ts);
    this._lastTs = ts;
    this.step(Math.min(dt, 100)); // cap at 100ms to avoid spiral-of-death on tab-resume
    // Keep scheduling only while something is still animating - see the
    // class doc comment. The very first frame after start() always runs
    // (drawing the initial pose); after that, an unextended budget parks.
    if (this.constructor.CONTINUOUS || ts < this._animateUntil) {
      this._rafId = requestAnimationFrame(this._loop.bind(this));
    } else {
      this._rafId = null;
    }
  }

  pause() {
    this.clearDwellTimer();
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._rafId = null;
  }

  resume() {
    if (!this._running || this._rafId) return;
    this._lastTs = performance.now();
    this._rafId = requestAnimationFrame(this._loop.bind(this));
  }

  _onVisibilityChange() {
    if (document.hidden) this.pause(); else this.resume();
  }
}
