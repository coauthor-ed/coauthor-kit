/**
 * AtomShowcaseScene - reference for SimAtom: one material for every atom, nucleus, ion and bond.
 *
 * Beats (4):
 *   0  a sodium atom as the hero: packed nucleus, shells 2, 8, 1
 *   1  sodium and chlorine side by side, outer shells in focus, the empty seat shown
 *   2  the two ions as heroes, then a patch of the salt lattice
 *   3  molecules: H2, H2O, O2 and a schematic sugar
 *
 * The phase is the scene's job: it turns the electrons on arrival and rests. Under reduced motion
 * the phase holds still and every beat shows its end state.
 */
import { SimScene } from 'simulations/base/kit/SimScene.js';
import { outBack, pill, leader, clamp01 } from 'simulations/base/kit/SimLook.js';
import { reducedMotion } from 'simulations/base/kit/SimAnim.js';
import { drawAtom, drawDepthField, drawIon, drawMolecule, MOLECULES } from 'simulations/base/kit/SimAtom.js';

const CHIP = 15;
const TURN_S = 2.4;

export class AtomShowcaseScene extends SimScene {
  static BEAT_STEP_MAP = [0, 1, 2, 3].map((idx) => [{ idx, dwellMs: null }]);
  static ARIA_LABEL = 'Four views of the atom kit. A sodium atom with a packed nucleus and shells of 2, 8 and 1 electrons. Sodium and chlorine atoms side by side with their outer shells highlighted, chlorine with one empty place. A sodium ion and a chloride ion, then a patch of the salt lattice. Molecules of hydrogen, water and oxygen beside a schematic sugar.';

  busy() { return !reducedMotion() && this.age < TURN_S + 0.2; }

  /** Eases to rest: the electrons turn on arrival, then stop. */
  _phase() {
    if (reducedMotion()) return 0;
    const u = clamp01(this.age / TURN_S);
    return (1 - (1 - u) * (1 - u)) * 1.1 - 1.1;
  }

  _pop(delay = 0) {
    if (reducedMotion()) return 1;
    return outBack((this.age - delay) / 0.45);
  }

  _at(ctx, x, y, s, fn) {
    if (s <= 0.01) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    fn();
    ctx.restore();
  }

  draw(ctx, c, t) {
    if (this.stage === 0) this._sodium(ctx, c, t);
    else if (this.stage === 1) this._pair(ctx, c, t);
    else if (this.stage === 2) this._ions(ctx, c, t);
    else this._molecules(ctx, c, t);
  }

  _sodium(ctx, c, t) {
    drawDepthField(ctx, c, { x: 340, y: 262, t });
    let at = null;
    this._at(ctx, 340, 262, this._pop(), () => {
      at = drawAtom(ctx, c, 0, 0, { p: 11, n: 12, shells: [2, 8, 1], radius: 172, phase: this._phase() });
    });
    pill(ctx, c, 'sodium atom', 24, 40, { align: 'left', bg: c.raised, ink: c.label, size: 17, display: true });
    pill(ctx, c, '11 protons, 12 neutrons', 24, 482, { align: 'left', bg: c.raised, ink: c.label, size: CHIP });
    pill(ctx, c, 'shells 2, 8, 1', 656, 482, { align: 'right', bg: c.raised, ink: c.label, size: CHIP });
    if (at) {
      const e = at.shells[2].pts[0];
      leader(ctx, 340 + e.x + 8, 262 + e.y - 8, 560, 62, c.labelMuted, 0.9, 0);
      pill(ctx, c, 'one outer electron', 656, 40, { align: 'right', bg: c.electron, size: CHIP });
    }
  }

  _pair(ctx, c, t) {
    drawDepthField(ctx, c, { x: 340, y: 256, t });
    const ph = this._phase();
    this._at(ctx, 184, 256, this._pop(), () => {
      drawAtom(ctx, c, 0, 0, { sym: 'Na', p: 11, n: 12, shells: [2, 8, 1], radius: 138, phase: ph, focusShell: 'outer', dimInner: true });
    });
    this._at(ctx, 496, 256, this._pop(0.1), () => {
      drawAtom(ctx, c, 0, 0, { sym: 'Cl', p: 17, n: 18, shells: [2, 8, 7], seats: [2, 8, 8], radius: 138, phase: ph, focusShell: 'outer', dimInner: true });
    });
    pill(ctx, c, 'Na: one to give', 184, 448, { bg: c.raised, ink: c.label, size: 16, display: true });
    pill(ctx, c, 'Cl: one place empty', 496, 448, { bg: c.raised, ink: c.label, size: 16, display: true });
  }

  _ions(ctx, c, t) {
    drawDepthField(ctx, c, { x: 300, y: 256, t });
    const m = String.fromCharCode(0x2212);
    this._at(ctx, 112, 138, this._pop(), () => drawIon(ctx, c, 0, 0, { sym: 'Na', charge: 1, r: 62, focus: 0.6 }));
    this._at(ctx, 112, 342, this._pop(0.1), () => drawIon(ctx, c, 0, 0, { sym: 'Cl', charge: -1, r: 86, focus: 0.6 }));
    pill(ctx, c, 'Na+', 112, 228, { bg: c.cation, size: 16, display: true });
    pill(ctx, c, 'Cl' + m, 112, 452, { bg: c.anion, size: 16, display: true });
    // A patch of the lattice: small cations in the gaps of larger anions, flat for reading.
    const S = 54, N = 5, x0 = 432 - ((N - 1) * S) / 2, y0 = 248 - ((N - 1) * S) / 2;
    const cells = [];
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) cells.push({ i, j, na: (i + j) % 2 === 1 });
    cells.sort((a, b) => a.na - b.na);
    cells.forEach((q) => {
      const d = 0.5 + 0.03 * (q.i + q.j * 2);
      this._at(ctx, x0 + q.i * S, y0 + q.j * S, this._pop(d), () => {
        drawIon(ctx, c, 0, 0, q.na ? { sym: 'Na', charge: 1, r: 20 } : { sym: 'Cl', charge: -1, r: 31 });
      });
    });
    pill(ctx, c, 'every ion held by its neighbours', 432, 488, { bg: c.raised, ink: c.label, size: CHIP });
  }

  _molecules(ctx, c, t) {
    drawDepthField(ctx, c, { x: 430, y: 250, t });
    const row = [
      ['H2', 'H2', 92, { ...MOLECULES.H2, r: 70 }],
      ['H2O', 'H2O', 232, { ...MOLECULES.H2O, r: 78 }],
      ['O2', 'O2', 374, { ...MOLECULES.O2, r: 74 }],
    ];
    row.forEach(([, label, y, m], i) => {
      this._at(ctx, 112, y, this._pop(i * 0.08), () => drawMolecule(ctx, c, 0, 0, m));
      pill(ctx, c, label, 112, y + (i === 1 ? 74 : 60), { bg: c.raised, ink: c.label, size: CHIP, display: true });
    });
    this._at(ctx, 424, 244, this._pop(0.3), () => drawMolecule(ctx, c, 0, 0, { ...MOLECULES.sugar, r: 204, rot: 0.3 }));
    pill(ctx, c, 'a sugar, schematic', 424, 486, { bg: c.raised, ink: c.label, size: CHIP, display: true });
  }
}
