/**
 * FarmStripsShowcaseScene - reference for kit/SimFarm.js (SVG, DOM). Fields of crop strips, one spec, two renderers.
 *   Beat 0: a plot of 4 strips, dry soil to rich soil, all wheat; tap a strip to switch it between wheat and barley
 *           (the strip lights, its tag changes). Plants grow in by CSS on the first paint, then rest; after a tap
 *           only the tapped strip grows in again (animate: i), the others stay at rest. Tags sit in a bare lane at
 *           the strip end, clear of the crops (tagPlace: 'end'), in their crop's tone (tagTone: 'crop').
 *   Beat 1: a sugarcane field and a millet field, each with a well cut away under it; the water stands lower
 *           under sugarcane (a picture, no numbers). Side by side in landscape, stacked in portrait.
 *   Beat 2: three strips with the middle one idle (bare tilled ridges); the others dim. Names and tags sit outside
 *           the field (tagPlace: 'outside'), placed with farmBox.
 * The figure is drawn in 560 design units and scaled to the stage width, so tags stay at 26 design px (16 px at 390).
 */
import { SvgScene, chip } from 'simulations/base/kit/SimSvg.js';
import { farmSpec, farmSvg, farmHit, farmBox, wellSvg, wellSize } from 'simulations/base/kit/SimFarm.js';

const MAP = [0, 1, 2].map((idx) => [{ idx, dwellMs: null }]);
const DW = 560;
const SOILS = ['dry', 'sandy', 'loam', 'rich'];
const WHEAT_KG = [10, 20, 30, 40];
const TITLES = ['Tap a strip: wheat or barley', 'Sugarcane or millet', 'One strip lies idle'];

export class FarmStripsShowcaseScene extends SvgScene {
  static WIDTH = 560;
  static PORTRAIT_WIDTH = 380;
  static BEAT_STEP_MAP = MAP;
  static CONTROLS = [];
  static ARIA_LABEL = 'Fields of crop strips: a plot of four strips of wheat or barley, a sugarcane field and a millet field with a well cut away under each, and a row of strips with one lying idle.';

  async setup() {
    this.crops = ['wheat', 'wheat', 'wheat', 'wheat'];
    this.lit = null;
    this.fresh = true;
    await super.setup();
  }

  enter() { this.crops = ['wheat', 'wheat', 'wheat', 'wheat']; this.lit = null; this.fresh = true; this.regrow = null; }

  k(st) { return st.W / DW; }

  stageHeight(st) {
    const k = this.k(st);
    if (this.stepIndex === 1) return Math.round((st.portrait ? 2 * 330 + 20 : 340) * k);
    if (this.stepIndex === 2) return Math.round(260 * k);
    return Math.round(352 * k);
  }

  plot() {
    return farmSpec({ orient: 'rows', w: 520, gap: 10, tagPlace: 'end', strips: this.crops.map((crop, i) => ({
      crop, soil: SOILS[i], tag: crop === 'wheat' ? `${WHEAT_KG[i]} kg` : '25 kg', tagTone: 'crop' })) });
  }

  pointerDown(p) {
    if (this.stepIndex !== 0) return false;
    const k = this.k(this.sv), i = farmHit(this.plot(), p.x / k, p.y / k, { x: 20, y: 16 });
    if (i < 0) return false;
    this.crops[i] = this.crops[i] === 'wheat' ? 'barley' : 'wheat';
    this.lit = i;
    this.regrow = i;
    this.repaint();
    return false;
  }

  /** A field with a well beside it, the ground cut away under the well. W: the width it may use. */
  fieldWithWell(crop, label, level, x, y, W) {
    const fw = W * 0.58, fh = Math.max(140, W * 0.5), ww = W * 0.27;
    const f = farmSpec({ orient: 'cols', w: fw, h: fh, strips: [{ crop, soil: 'sandy', label }] });
    const gx = x + fw + (W - fw) / 2 + 6, gy = y + fh + 8;
    return farmSvg(f, { x: x + 8, y: y + 8, animate: this.fresh }) + wellSvg({ x: gx, y: gy, w: ww, depth: ww * 1.2, level, soil: 'sandy' });
  }

  paint(st) {
    const k = this.k(st);
    let pic = '';
    if (this.stepIndex === 0) {
      pic = farmSvg(this.plot(), { x: 20, y: 16, lit: this.lit, animate: this.fresh ? true : this.regrow ?? false });
      this.regrow = null;
    } else if (this.stepIndex === 1) {
      const above = wellSize({ w: 140 }).above;
      if (st.portrait) {
        pic = this.fieldWithWell('sugarcane', 'Sugarcane', 0.22, 10, above * 0.4, 540)
          + this.fieldWithWell('millet', 'Millet', 0.72, 10, 350 + above * 0.4, 540);
      } else {
        pic = this.fieldWithWell('sugarcane', 'Sugarcane', 0.22, 6, 30, 270) + this.fieldWithWell('millet', 'Millet', 0.72, 284, 30, 270);
      }
    } else {
      const f = farmSpec({ orient: 'rows', w: 330, tagPlace: 'outside', strips: [{ crop: 'pulse', soil: 'loam', label: 'Pulse' },
        { crop: 'idle', soil: 'dry', label: 'Idle', tag: '0 kg' }, { crop: 'rice', soil: 'wet', label: 'Rice' }] });
      const box = farmBox(f);
      pic = farmSvg(f, { x: (DW - box.w) / 2 - box.x, y: 16, dim: (i) => i !== 1, lit: 1, animate: this.fresh });
    }
    this.fresh = false;
    return { svg: `<g transform="scale(${k.toFixed(4)})">${pic}</g>`, head: chip(TITLES[this.stepIndex], 0, 0, { tone: 'plain', static: true }) };
  }
}
