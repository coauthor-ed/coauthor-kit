/**
 * FlowLayoutsScene - the other FlowBoard layouts, one per beat: 0 a cycle
 * (the water cycle), 1 a tree (three organs of government), 2 a pyramid
 * (a society's layers, as textbooks draw ancient Egypt).
 */
import { DomSimulation } from 'simulations/base/DomSimulation.js';
import { SIM_LOOK_DOM_CSS } from 'simulations/base/kit/SimLookDom.js';
import { FLOW_CSS, mountFlow } from 'simulations/base/kit/FlowBoard.js';
import { mountEl } from 'simulations/base/kit/SimSvg.js';

const CONFIGS = [
  { title: 'A cycle', layout: 'cycle', nodes: [
    { id: 'sea', label: 'Sea', icon: 'canal', tone: 1 }, { id: 'vapour', label: 'Vapour rises', icon: 'sun', tone: 2 },
    { id: 'cloud', label: 'Clouds form', icon: 'rain', tone: 5 }, { id: 'rain', label: 'Rain falls', icon: 'rain', tone: 7 }, { id: 'river', label: 'Rivers flow', icon: 'river', tone: 3 }] },
  { title: 'A tree', layout: 'tree', nodes: [
    { id: 'c', label: 'Constitution', icon: 'book', tone: 5 },
    { id: 'l', label: 'Legislature', sub: 'makes laws', icon: 'building', tone: 1, parent: 'c' },
    { id: 'e', label: 'Executive', sub: 'carries them out', icon: 'crowd', tone: 2, parent: 'c' },
    { id: 'j', label: 'Judiciary', sub: 'settles disputes', icon: 'scales', tone: 3, parent: 'c' }] },
  { title: 'A pyramid', layout: 'pyramid', levels: ['ruler', 'officials and priests', 'farmers and workers'], levelTones: [2, 5, 3], nodes: [
    { id: 'k', label: 'King', icon: 'crown', tone: 2, level: 0 },
    { id: 'o', label: 'Scribes', icon: 'scroll', tone: 5, level: 1 }, { id: 'p', label: 'Priests', icon: 'building', tone: 5, level: 1 },
    { id: 'f', label: 'Farmers', icon: 'field', tone: 3, level: 2 }, { id: 'w', label: 'Builders', icon: 'hammer', tone: 3, level: 2 }, { id: 'm', label: 'Traders', icon: 'boat', tone: 3, level: 2 }] },
];

export class FlowLayoutsScene extends DomSimulation {
  static WIDTH = 680;
  static HEIGHT = 520;
  static PORTRAIT_WIDTH = 380;
  static PORTRAIT_HEIGHT = 900;
  static LAYOUT = 'frame';
  static ARIA_LABEL = 'Three ways to lay out a flow: a cycle, a tree and a pyramid.';
  static BEAT_STEP_MAP = [[{ idx: 0, dwellMs: null }], [{ idx: 1, dwellMs: null }], [{ idx: 2, dwellMs: null }]];

  async setup() {
    await super.setup();
    this.render({ css: SIM_LOOK_DOM_CSS + FLOW_CSS, rootClass: 'sl-backdrop' });
    this.host = mountEl(this.root, 'sim-scroll fb-host');
    this.onStep(0);
  }
  onStep(step) {
    this.fb?.destroy();
    this.fb = mountFlow(this.host, CONFIGS[step], { onLayout: () => this.relayout() });
  }
  destroy() { this.fb?.destroy(); super.destroy(); }
}
