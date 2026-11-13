// SceneSkeleton.js - the smallest complete canvas scene: copy, rename, replace the model. Read this, not SimScene.js.
// A ball at a chosen height (slider, or drag it) is dropped (button, or tap it); it lands,
// the scene celebrates once, the loop parks. Beats: 0 at rest, 1 the drop, 2 the drop with the height held.
// Rules: briefs/reference/scene-rules.md. Easy to miss: colours only from `c` (never a hex), host control values
// are STRINGS, onControlChange starts with the _guard, a run is credited to a token captured at launch.
import { SimScene } from 'simulations/base/kit/SimScene.js';
import { ZONES, alpha, mix, pill, drawBackdrop, drawCard, drawFloor, drawShadow } from 'simulations/base/kit/SimLook.js';

const FLOOR_Y = 424;
const BALL_R = 44;
const H_MIN = 1, H_MAX = 5, PX_PER_M = 64;          // one scale for the whole scene
const G = 10;                                        // m/s^2, the course convention
const cx = ZONES.hero.x + ZONES.hero.w / 2;

// One entry per beat; dwellMs null = wait for the learner.
const MAP = [[{ idx: 0, dwellMs: null }], [{ idx: 1, dwellMs: null }], [{ idx: 2, dwellMs: null }]];
const S_REST = 0, S_DROP = 1, S_HELD = 2;

export class SceneSkeleton extends SimScene {
  static BEAT_STEP_MAP = MAP;
  static NOTE_STAGE = 0;                             // the note shows from stage 0 as one muted bottom line
  static ARIA_LABEL = 'A ball hangs at a height set by a slider. Pressing Drop lets it fall to the floor.';
  static CONTROLS = [                                // type: button | slider | range | select | number | toggle | checkbox | segmented
    { type: 'slider', id: 'height', label: 'Height', min: H_MIN, max: H_MAX, step: 0.5, value: 3, suffix: ' m' },
    { type: 'button', id: 'drop', label: 'Drop' },
  ];

  constructor(container, config) {
    super(container, config);
    this._h = 3;                                     // metres
    this._y = 0;                                     // metres above the floor
    this._run = null;                                // { t, stage } while falling
    this._drag = false;
  }

  noteRows() { return [{ text: 'no air resistance: the fall time is the same for any mass' }]; }

  // Called on every stage change: reset what this stage shows (the base resets age and fade).
  enter(stage) {
    this._run = null;
    this._y = this._h;
    if (stage === S_DROP) this.after(0.3, () => this._launch());   // dropped for them on beat 1
  }

  _launch() {
    if (this._run) return;
    this._run = { t: 0, stage: this.stage };
  }

  update(d) {                                        // d = seconds, already clamped
    const r = this._run;
    if (!r) return;
    r.t += d;
    this._y = Math.max(0, this._h - 0.5 * G * r.t * r.t);
    if (this._y === 0) {
      const landedIn = r.stage;
      this._run = null;
      if (landedIn === this.stage) this.celebrate(cx, FLOOR_Y - 20, 18);   // once, when it lands
    }
  }

  busy() { return !!this._run || this._drag; }

  draw(ctx, c) {
    drawBackdrop(ctx, c, 'dots');
    drawCard(ctx, c, ZONES.hero.x, 92, ZONES.hero.w, FLOOR_Y - 92);        // a hero needs mass: a card behind it, not a bare ball
    drawFloor(ctx, c, FLOOR_Y);
    const y = FLOOR_Y - BALL_R - this._y * PX_PER_M;
    ctx.strokeStyle = alpha(c.stroke, 0.7); ctx.lineWidth = 2;                // a metre scale: one tick per metre
    for (let m = 0; m <= H_MAX; m++) {
      const ty = FLOOR_Y - m * PX_PER_M;
      ctx.beginPath(); ctx.moveTo(ZONES.hero.x + 24, ty); ctx.lineTo(ZONES.hero.x + 24 + (m % 5 === 0 ? 40 : 24), ty); ctx.stroke();
    }
    drawShadow(ctx, c, cx, FLOOR_Y + 6, 26 + this._y * 3);
    ctx.fillStyle = mix(c.accent, c.label, 0.15);
    ctx.beginPath(); ctx.arc(cx, y, BALL_R, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = alpha(c.label, 0.5); ctx.lineWidth = 2; ctx.stroke();
    pill(ctx, c, `${this._y.toFixed(1)} m`, cx + 70, y);       // a label beside the evidence, never on it
  }

  // Host controls. `v` is a STRING for slider/select/number/segmented, true for a button.
  onControlChange(id, v) {
    if (!this._guard(id)) return;
    if (id === 'height') { this._h = Number(v); if (!this._run) this._y = this._h; }
    else if (id === 'drop') this._launch();
    this.requestUiUpdate?.();
  }

  // Pointer hooks get design-space points {x, y}; a pointer event grants no animation time, so call animateFor.
  pointerDown(p) {
    if (Math.hypot(p.x - cx, p.y - (FLOOR_Y - BALL_R - this._y * PX_PER_M)) > BALL_R + 10) return;
    if (this._run) return;
    this._drag = true;
    this.animateFor(400);
  }
  pointerMove(p) {
    if (!this._drag) return false;
    this._h = Math.min(H_MAX, Math.max(H_MIN, Math.round((FLOOR_Y - BALL_R - p.y) / PX_PER_M * 2) / 2));
    this._y = this._h;
    this.animateFor(400);
    return true;                                     // true = the control bar needs a refresh (the slider follows)
  }
  pointerUp() { this._drag = false; }

  // What the host shows in the slider: the scene's own value (else the declared one).
  getControlValue(id) { return id === 'height' ? this._h : super.getControlValue(id); }
}
