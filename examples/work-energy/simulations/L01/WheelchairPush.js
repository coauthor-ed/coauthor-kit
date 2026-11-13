import { drawShadow, alpha, darken, rr } from 'simulations/base/kit/SimLook.js';
import { drawFigure } from 'simulations/base/kit/SimFigure.js';

// The boy pushing the wheelchair, shared by PushStopWorkScene and
// WorkDefinitionScene so both slides show the same chair. Coordinates are
// absolute design px with the floor at FLOOR_Y; a caller with another floor
// line translates first. m > 0 is the push pose with effort on the face.
export const CHAIR_FLOOR_Y = 336;
const FLOOR_Y = CHAIR_FLOOR_Y;

export function drawWheelchairPush(ctx, c, x, m, t) {
  // glass, not a mix of the panel tokens: raised-into-label was murky navy on
  // the dark backdrop and washed grey on the light one, so the chair the whole
  // left bay is about nearly vanished in the dark theme.
  const frame = c.glass;
  const frameDeep = darken(frame, 0.34);
  const tunic = c.s5;

  drawShadow(ctx, c, x + 34, FLOOR_Y + 2, 48, 9);

  ctx.save();
  // frame: seat, back, footplate, one cushion down the near side
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = frameDeep;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x + 16, 254);
  ctx.lineTo(x + 76, 316);
  ctx.moveTo(x + 68, 254);
  ctx.lineTo(x + 76, 316);
  ctx.moveTo(x + 16, 206);
  ctx.lineTo(x + 16, 254);
  ctx.moveTo(x + 68, 258);
  ctx.lineTo(x + 80, 272);
  ctx.stroke();
  rr(ctx, x + 14, 248, 56, 10, 4);
  ctx.fillStyle = frame;
  ctx.fill();
  ctx.fillStyle = frameDeep;
  ctx.fillRect(x + 14, 254, 56, 4);
  // the grips he holds
  ctx.strokeStyle = frameDeep;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x + 16, 210);
  ctx.lineTo(x + 1, 202);
  ctx.stroke();
  // the big wheel, then the caster
  ctx.strokeStyle = frameDeep;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(x + 34, 302, 30, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = alpha(frame, 0.85);
  ctx.lineWidth = 3;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(x + 34 - Math.cos(a) * 27, 302 - Math.sin(a) * 27);
    ctx.lineTo(x + 34 + Math.cos(a) * 27, 302 + Math.sin(a) * 27);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(x + 34, 302, 5, 0, Math.PI * 2);
  ctx.fillStyle = frameDeep;
  ctx.fill();
  ctx.strokeStyle = frameDeep;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(x + 78, 320, 9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // the boy: a kit figure in the push pose, both hands on the grips; the
  // walk cycle is not used, the push pose is the whole story
  const grips = [{ x: x + 1, y: 202 }, { x: x + 14, y: 208 }];
  drawFigure(ctx, c,
    { x: x - 44, y: FLOOR_Y, height: 150, build: 'teen', facing: 1, pose: { name: 'push', phase: m }, hands: grips },
    { skin: 1, hairStyle: 'short', top: tunic, mood: m > 0 ? 'effort' : 'smile', t: t });
}
