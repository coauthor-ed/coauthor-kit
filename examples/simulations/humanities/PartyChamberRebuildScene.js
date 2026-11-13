/**
 * PartyChamberRebuildScene - a real-lesson visual rebuilt on the people kit.
 * Source: other-repo/courses/grade9/sst/elections/simulations/L05/MultiPartySystemSim.js
 * (its hand-drawn chibi MPs in the "Lok Sabha chamber" panel; the original is
 * untouched). Only the chamber picture is rebuilt here, not the text cards.
 *
 * What the kit does that the hand-drawn version did by hand:
 *   - drawFigureRow with pose 'sit' and one bench per tier (the row's behind
 *     callback): a wrapped row IS a stepped tier, back row higher and offset;
 *   - groupLook: skin, hair and face vary per seat, only the party colour is set;
 *   - highlightFigures: the governing side's seats ringed with a count chip;
 *   - crowdLayout: the no-parties beat scatters people without hiding a face.
 *
 * Beats (2): 0 parties - government and opposition benches, a member speaks at
 * the table; 1 no parties - every member on their own, each with a different plan.
 */
import { SimScene } from 'simulations/base/kit/SimScene.js';
import { drawBackdrop, drawFloor, pill, rr, mix, darken, speechBubble } from 'simulations/base/kit/SimLook.js';
import { drawFigure, drawFigureRow, groupLook, highlightFigures, crowdLayout, figureFor } from 'simulations/base/kit/SimFigure.js';
import { drawSeatBench, drawDesk, drawChair } from 'simulations/base/kit/SimProps.js';

const MAP = [[{ idx: 0, dwellMs: null }], [{ idx: 1, dwellMs: null }]];
const FLOOR = 452, H = 128, RISE = 0.3 * H;
const PLANS = ['my plan', 'no, mine', 'not that', 'why?', 'wait', 'mine first'];

export class PartyChamberRebuildScene extends SimScene {
  static BEAT_STEP_MAP = MAP;
  static ARIA_LABEL = 'A parliament chamber of cartoon people: government and opposition benches facing each other with a member speaking, then the same members with no parties, each arguing for their own plan.';

  draw(ctx, c, t) {
    drawBackdrop(ctx, c, 'dots');
    drawFloor(ctx, c, FLOOR - 4, { seams: false, col: mix(c.bgDeep, c.s3, 0.14) });
    this.drawSpeaker(ctx, c, t);
    if (this.stage === 0) this.drawParties(ctx, c, t);
    else this.drawNoParties(ctx, c, t);
  }

  // The presiding member at a raised desk, back centre; ordinary clothes.
  drawSpeaker(ctx, c, t) {
    const x = 340, dais = 250, h = 110;
    rr(ctx, 270, dais, 140, FLOOR - dais, 10); ctx.fillStyle = darken(c.gold, 0.5); ctx.fill();
    rr(ctx, 270, dais, 140, 12, 6); ctx.fillStyle = darken(c.gold, 0.32); ctx.fill();
    const chair = drawChair(ctx, c, { x, y: dais, forHeight: h, view: 'front', tone: 6 });
    let desk = null;
    drawFigure(ctx, c, { x, y: dais, height: h, facing: 0, pose: 'sit', seat: chair.seat, hands: [{ x: x + 12, y: dais - 0.338 * h - 1 }, { x: x - 12, y: dais - 0.338 * h - 1 }] },
      groupLook(c, 7, { sleeves: 'long', t }), { between: () => { desk = drawDesk(ctx, c, { x0: x - 44, x1: x + 44, y: dais, forHeight: h, tone: 8 }); } });
    void desk;
    pill(ctx, c, 'presiding officer', x, dais - 128, { size: 14, bg: c.raised ?? c.bgSurface });
  }

  tiers(ctx, c, x0, x1) {
    return (cx, r) => {
      const y = FLOOR - r * RISE;
      if (r > 0) { rr(ctx, x0 - 8, y - 2, x1 - x0 + 16, RISE + 6, 6); ctx.fillStyle = mix(c.bgDeep, c.bgSurface, 0.8); ctx.fill(); }
      drawSeatBench(cx, c, { x0, x1, y, forHeight: H });
    };
  }

  drawParties(ctx, c, t) {
    const gov = [c.s1, c.s8], opp = [c.s3, c.s5];
    const left = drawFigureRow(ctx, c, {
      n: 6, x: 18, w: 232, y: FLOOR, height: H, gap: 64, facing: 1, pose: 'sit', seat: FLOOR - 0.196 * H, t,
      looks: Array.from({ length: 6 }, (_, i) => groupLook(c, i, { top: gov[i % 2], t })), behind: this.tiers(ctx, c, 18, 250),
    });
    drawFigureRow(ctx, c, {
      n: 4, x: 470, w: 192, y: FLOOR, height: H, gap: 64, facing: -1, pose: 'sit', seat: FLOOR - 0.196 * H, t,
      looks: Array.from({ length: 4 }, (_, i) => groupLook(c, i + 6, { top: opp[i % 2], t })), behind: this.tiers(ctx, c, 470, 662),
    });
    // A member speaks at the table, facing the other side.
    drawDesk(ctx, c, { x0: 300, x1: 380, y: FLOOR, forHeight: 150, tone: 3, panel: false });
    const sk = drawFigure(ctx, c, figureFor(this, { role: 'adult', pose: 'point', x: 282, y: FLOOR, scale: 76, facing: 1, i: 2, look: { top: gov[0], t } }));
    speechBubble(ctx, c, 'pass the bill', 430, 300, sk.anchors.head.x + 20, sk.anchors.head.y - 6, { size: 15 });
    highlightFigures(ctx, c, left, [0, 1, 2, 3, 4, 5], { tone: c.s1, numbers: false, chip: { x: 150, y: 40 }, text: 'government: 6 of 10' });
    pill(ctx, c, 'opposition: 4', 566, 40, { size: 16, bg: c.s3 });
  }

  drawNoParties(ctx, c, t) {
    // Everyone on their own: scattered, facing different ways, no shared colour.
    const crowd = crowdLayout({ rect: { x: 20, y: 236, w: 640, h: FLOOR - 236 }, n: 10, seed: 4, height: H, depth: 0.2 });
    for (const p of crowd) {
      const facing = p.x < 340 ? (p.i % 3 ? 1 : -1) : (p.i % 3 ? -1 : 1);
      drawFigure(ctx, c, { x: p.x, y: p.y, height: p.height, facing, pose: p.i % 2 ? 'point' : 'relax' },
        groupLook(c, p.i, { mood: p.i % 3 === 0 ? 'oops' : 'think', t }));
    }
    // Three of them speak: the leftmost, the middle and the rightmost, so the bubbles never meet.
    const byX = [...crowd].sort((a, b) => a.x - b.x);
    [byX[0], byX[(byX.length / 2) | 0], byX[byX.length - 1]].forEach((p, k) =>
      speechBubble(ctx, c, PLANS[k], Math.max(70, Math.min(610, p.x)), p.face.y0 - 34, p.x, p.face.y0 - 2, { size: 14 }));
    pill(ctx, c, '10 members, 10 different plans', 340, 40, { size: 16, bg: c.warning });
  }
}
