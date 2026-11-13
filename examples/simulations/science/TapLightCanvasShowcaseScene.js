/**
 * TapLightCanvasShowcaseScene - kit/TapLight.js in a canvas scene: a canvas has no elements to hold a chip row, so the
 * chips are a host control (tapLightControl: segmented with a None option, tall, a second tap releases).
 *   Beat 0: chips nucleus, inner shells, outer electron light the parts of a sodium atom; the rest dims
 *   Beat 1: the scene presets outer electron and locks the control: the beat is about that part
 */
import { SimScene } from 'simulations/base/kit/SimScene.js';
import { pill } from 'simulations/base/kit/SimLook.js';
import { atomLayout, drawDepthField, drawElectron, drawNucleus, drawShell } from 'simulations/base/kit/SimAtom.js';
import { tapLight, tapLightControl } from 'simulations/base/kit/TapLight.js';

const CHIPS = [
  { id: 'nucleus', label: 'nucleus', targets: ['nucleus'] },
  { id: 'inner', label: 'inner shells', targets: ['shell-0', 'shell-1'] },
  { id: 'outer', label: 'outer electron', targets: ['shell-2'] },
];
const NAMES = { nucleus: '11 protons, 12 neutrons', inner: '2 and 8: full', outer: 'one outer electron' };
const ATOM = { p: 11, n: 12, shells: [2, 8, 1], radius: 176, phase: -1.1 };
const X = 340, Y = 250, DIM = 0.82;

export class TapLightCanvasShowcaseScene extends SimScene {
  static BEAT_STEP_MAP = [0, 1].map((idx) => [{ idx, dwellMs: null }]);
  static ARIA_LABEL = 'A sodium atom with a nucleus, two full inner shells and one outer electron. Chips below the figure light one part and dim the rest.';
  static CONTROLS = [tapLightControl({ id: 'lit', label: 'Show', chips: CHIPS })];
  static CONTROLS_IN_SIGHT = true;

  tl = tapLight({ chips: CHIPS });

  enter(stage) {
    this.tl.set(stage === 1 ? { lit: 'outer', disabled: true } : { lit: null, disabled: false });
    this.requestUiUpdate?.();
  }

  getControlValue(id) { return id === 'lit' ? this.tl.controlValue() : undefined; }
  isControlDisabled(id) { return id === 'lit' && this.tl.disabled(); }
  onControlChange(id, v) { if (id === 'lit') this.tl.fromControl(v); }

  draw(ctx, c, t) {
    drawDepthField(ctx, c, { x: X, y: Y, t: 0 });
    const lay = atomLayout(ATOM);
    const { tl } = this;
    const dim = (id) => (tl.off(id) ? DIM : 0);
    lay.shells.forEach((s, i) => drawShell(ctx, c, X, Y, s.r, { active: tl.has(`shell-${i}`), dim: dim(`shell-${i}`) }));
    drawNucleus(ctx, c, X, Y, { p: ATOM.p, n: ATOM.n, r: lay.nr, dim: dim('nucleus') });
    lay.shells.forEach((s, i) => { for (const q of s.pts) drawElectron(ctx, c, X + q.x, Y + q.y, lay.er, { dim: dim(`shell-${i}`), focus: tl.has(`shell-${i}`) ? 0.8 : 0 }); });
    const on = tl.chip();
    if (on) pill(ctx, c, NAMES[on.id], 340, 484, { bg: c.raised, ink: c.label, size: 22, display: true });
  }
}
