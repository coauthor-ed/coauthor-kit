// The three playground children, drawn the same way in every lesson that shows
// them (L01 hook, L05 slides, L09 closing), so they are recognisably the same
// kids: index 0 goes with the blue slide, 1 the red one, 2 the purple one.
import { drawFigure } from 'simulations/base/kit/SimFigure.js';

const LOOKS = [
  { skin: 1, hairStyle: 'long', top: 's2' },
  { skin: 0, hairStyle: 'short', top: 's6' },
  { skin: 2, hairStyle: 'bun', top: 's5' },
];

// (x, y) is the point under the child's feet; h is feet-to-top-of-head in px.
// Above 60 px the face reads; the drawings in the three lessons use 44 to 56,
// where the kit still draws dot eyes.
export function drawPlaygroundKid(ctx, c, i, x, y, h, o = {}) {
  const look = LOOKS[((i % 3) + 3) % 3];
  return drawFigure(ctx, c,
    { x, y, height: h, build: 'kid', facing: 0, pose: o.pose || 'stand' },
    { skin: look.skin, hairStyle: look.hairStyle, top: c[look.top], mood: o.mood || 'smile', t: o.t || 0 });
}
