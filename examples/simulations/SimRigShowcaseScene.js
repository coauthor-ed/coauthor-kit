/** SimRigShowcaseScene.js
 * SimRigShowcaseScene - 4-beat showcase for SimRig (two-bone IK, tapered limbs,
 * mechanism maths), in school science contexts:
 *   Beat 0: your arm - a curl; the biceps shortens and bulges (ik2, limb, muscle)
 *   Beat 1: a lever lifts a heavy stone with a small push (lever)
 *   Beat 2: a crank turns and drives a piston up and down (crankSlider, crankAngleAt)
 *   Beat 3: a robot arm reaches for flasks; too far and it stretches out (ik2 reach clamp, bend flip)
 * Each beat plays a short scripted move and then parks. A tap during the move
 * skips to its end; after that, drag to drive the rig (the target is smoothed
 * with SimRig.stepPoint, a SimAnim spring per axis). In beat 3 a tap on the
 * elbow flips it to the other side.
 */
import { SimScene } from 'simulations/base/kit/SimScene.js';
import {
  drawBackdrop,
  drawFloor,
  drawShadow,
  drawReadout,
  drawFace,
  leader,
  font,
  vectorArrow,
  pill,
  rr,
  ellipse,
  alpha,
  mix,
  darken,
  lighten,
  clamp,
  ZONES,
  W,
} from 'simulations/base/kit/SimLook.js';
import { keys, ease, reducedMotion, springStep } from 'simulations/base/kit/SimAnim.js';
import {
  ik2,
  limb,
  muscle,
  pointSpring,
  stepPoint,
  crankSlider,
  crankAngleAt,
  lever,
} from 'simulations/base/kit/SimRig.js';

const TAU = Math.PI * 2;
const FLOOR = 422;
const RIGHT = ZONES.right;

// Beat 0: the arm (side view, facing right). Lengths in design px.
const ARM = { sx: 236, sy: 214, l1: 108, l2: 100, dx: 40 };
// Beat 1: the lever (effort arm on the left, load arm on the right).
const LEV = { fx: 286, fy: 310, eff: 210, load: 90, max: 0.32 };
// Beat 2: crank under a vertical cylinder.
const CRANK = { cx: 250, cy: 352, r: 50, rod: 142, axis: -Math.PI / 2 };
// Beat 3: the robot arm.
const BOT = { sx: 160, sy: 318, l1: 150, l2: 124 };
const SHELF_Y = 262;
const FLASKS = [
  { x: 392, y: SHELF_Y - 24, key: 's1' },
  { x: 446, y: FLOOR - 24, key: 's3' },
  { x: 444, y: SHELF_Y - 24, key: 's4' },
];

// Scripts: [t, x, y] keys per beat; they end where the rig parks.
const SCRIPTS = [
  // arm: polar (angle, dist) about the shoulder; a curl up then half way down
  { end: 1.8, at: (t) => armPolar(keys(t, [[0.15, 1.25], [1.8, -0.5]], ease.smooth),
    keys(t, [[0.15, 196], [1.8, 106]], ease.smooth)) },
  // lever: x = tilt angle (load end down -> up)
  { end: 1.9, at: (t) => ({ x: keys(t, [[0.3, LEV.max], [1.9, -LEV.max]], ease.k75), y: 0 }) },
  // crank: x = crank angle, two turns
  { end: 3.6, at: (t) => ({ x: crankAngleAt(t - 0.2, 2, 3.4, 0), y: 0 }) },
  // robot: visit flask A, then B, then rest by C
  { end: 3.6, at: (t) => ({
    x: keys(t, [[0.2, 290], [1.0, FLASKS[0].x], [1.3, FLASKS[0].x], [2.2, FLASKS[1].x], [2.5, FLASKS[1].x], [3.6, 330]], ease.smooth),
    y: keys(t, [[0.2, 200], [1.0, FLASKS[0].y - 44], [1.3, FLASKS[0].y - 44], [2.2, FLASKS[1].y - 44], [2.5, FLASKS[1].y - 44], [3.6, 170]], ease.smooth),
  }) },
];

const TITLES = [
  'Your arm: two bones, one hinge',
  'A lever: small push, big lift',
  'A crank turns, a piston slides',
  'A robot arm reaches',
];
const HINTS = [
  'Drag the hand',
  'Drag the long end up or down',
  'Drag round the wheel to turn it',
  'Drag the gripper. Tap the elbow to flip it',
];

function armPolar(a, d) {
  return { x: ARM.sx + Math.cos(a) * d, y: ARM.sy + Math.sin(a) * d };
}

export class SimRigShowcaseScene extends SimScene {
  static BEAT_STEP_MAP = [
    [{ idx: 0, dwellMs: null }],
    [{ idx: 1, dwellMs: null }],
    [{ idx: 2, dwellMs: null }],
    [{ idx: 3, dwellMs: null }],
  ];

  static ARIA_LABEL = 'Four moving joints: an arm bending at the elbow, a lever lifting a stone, a crank driving a piston, and a robot arm reaching for flasks. Drag to move each one.';

  static CONTROLS = [{ type: 'button', id: 'replay', label: 'Replay' }];

  constructor(container, config) {
    super(container, config);
    this.t0 = 0;
    this.pt = pointSpring(0, 0);
    this.goal = { x: 0, y: 0 };
    this.moving = false;
    this.dragging = false;
    this.flip = { x: 1, v: 0 };
    this.bendGoal = 1;
    this.cheered = false;
  }

  enter(stage) {
    resetBeat(this, stage);
  }

  onControlChange(id) {
    if (!this._guard(id)) return;
    if (id === 'replay') resetBeat(this, this.stage, this.age);
    this.requestUiUpdate?.();
  }

  pointerDown(p) {
    const s = this.stage;
    const t = this.age - this.t0;
    const script = SCRIPTS[s];
    if (!reducedMotion() && t < script.end) {
      // Skip the build to its end state; this tap does not start a drag.
      this.t0 = this.age - script.end - 0.01;
      const e = script.at(script.end);
      snapTo(this, e.x, e.y);
      return;
    }
    if (s === 3) {
      const k = botIk(this);
      if (Math.hypot(p.x - k.joint.x, p.y - k.joint.y) < 30) {
        this.bendGoal = -this.bendGoal;
        return;
      }
    }
    this.dragging = true;
    setGoal(this, p);
  }

  pointerMove(p) {
    if (!this.dragging) return false;
    setGoal(this, p);
    return false;
  }

  pointerUp() {
    this.dragging = false;
  }

  update(d) {
    const s = this.stage;
    const t = this.age - this.t0;
    const script = SCRIPTS[s];
    if (!reducedMotion() && t < script.end) {
      const e = script.at(t);
      snapTo(this, e.x, e.y);
      this.moving = true;
    } else {
      this.moving = stepPoint(this.pt, this.goal.x, this.goal.y, d, s === 2 ? 'smooth' : 'snappy');
      if (s === 1 && !this.cheered) {
        this.cheered = true;
        const L = leverNow(this);
        this.celebrate(L.load.x, L.load.y - 40, 22);
      }
    }
    const flipping = springStep(this.flip, this.bendGoal, d, 'snappy');
    this.moving = this.moving || flipping;
  }

  busy() {
    return this.moving || this.dragging;
  }

  draw(ctx, c) {
    drawBackdrop(ctx, c, 'dots');
    drawFloor(ctx, c, FLOOR);
    const s = this.stage;
    pill(ctx, c, TITLES[s], W / 2, ZONES.top.y + 28, { bg: c.bgSurface, size: 17, display: true });
    if (s === 0) drawArm(this, ctx, c);
    else if (s === 1) drawLever(this, ctx, c);
    else if (s === 2) drawCrank(this, ctx, c);
    else drawBot(this, ctx, c);
    pill(ctx, c, HINTS[s], W / 2, ZONES.bottom.y + 28, { bg: c.accent, size: 15 });
  }
}

// -- State ----------------------------------------------------------------------

function resetBeat(scene, stage, t0 = 0) {
  // Every beat starts from the same state, whichever beat came before.
  scene.t0 = t0;
  scene.dragging = false;
  scene.cheered = false;
  scene.flip = { x: 1, v: 0 };
  scene.bendGoal = 1;
  const e = SCRIPTS[stage].at(reducedMotion() ? SCRIPTS[stage].end : 0);
  snapTo(scene, e.x, e.y);
  scene.moving = !reducedMotion();
}

function snapTo(scene, x, y) {
  scene.pt = pointSpring(x, y);
  scene.goal = { x, y };
}

function setGoal(scene, p) {
  const s = scene.stage;
  if (s === 0 || s === 3) {
    scene.goal = { x: clamp(p.x, 24, RIGHT.x - 16), y: clamp(p.y, 84, FLOOR - 6) };
  } else if (s === 1) {
    const sn = clamp((LEV.fy - p.y) / LEV.eff, -Math.sin(LEV.max), Math.sin(LEV.max));
    scene.goal = { x: Math.asin(sn), y: 0 };
  } else {
    const a = Math.atan2(p.y - CRANK.cy, p.x - CRANK.cx) - CRANK.axis;
    // unwrap next to the current goal so the wheel never spins the long way
    const cur = scene.goal.x;
    const k = Math.round((cur - a) / TAU);
    scene.goal = { x: a + k * TAU, y: 0 };
  }
}

function leverNow(scene) {
  return lever({ x: LEV.fx, y: LEV.fy }, scene.pt.x, LEV.eff, LEV.load);
}

function botIk(scene) {
  const tgt = { x: scene.pt.x, y: scene.pt.y };
  const kp = ik2([BOT.sx, BOT.sy], tgt, BOT.l1, BOT.l2, 1);
  const km = ik2([BOT.sx, BOT.sy], tgt, BOT.l1, BOT.l2, -1);
  const u = clamp((scene.flip.x + 1) / 2, 0, 1);
  const joint = { x: km.joint.x + (kp.joint.x - km.joint.x) * u, y: km.joint.y + (kp.joint.y - km.joint.y) * u };
  return { joint, end: kp.end, reached: kp.reached, dist: kp.dist, tgt };
}

// -- Beat 0: the arm ------------------------------------------------------------

function drawArm(scene, ctx, c) {
  const skin = lighten(mix(c.s8, c.s2, 0.45), 0.3);
  const skinDk = darken(skin, 0.22);
  const shirt = c.s5;
  const k = ik2([ARM.sx, ARM.sy], scene.pt, ARM.l1, ARM.l2, 1);
  const S = { x: ARM.sx, y: ARM.sy };

  // body: legs, torso, head (drawn at x 130-214, shifted by ARM.dx)
  ctx.save();
  ctx.translate(ARM.dx, 0);
  drawShadow(ctx, c, 170, FLOOR + 2, 70, 12);
  limb(ctx, { x: 156, y: 350 }, { x: 150, y: FLOOR - 10 }, 30, 24, darken(c.s1, 0.25));
  limb(ctx, { x: 186, y: 350 }, { x: 192, y: FLOOR - 10 }, 30, 24, darken(c.s1, 0.15));
  ctx.fillStyle = darken(c.stroke, 0.3);
  rr(ctx, 130, FLOOR - 16, 34, 14, 7); ctx.fill();
  rr(ctx, 178, FLOOR - 16, 34, 14, 7); ctx.fill();
  ctx.fillStyle = darken(shirt, 0.3);
  rr(ctx, 130, 196, 84, 168, 34); ctx.fill();
  ctx.fillStyle = shirt;
  rr(ctx, 130, 190, 84, 168, 34); ctx.fill();
  ctx.fillStyle = skin;
  rr(ctx, 160, 168, 26, 30, 8); ctx.fill();
  ellipse(ctx, 174, 130, 46, 46); ctx.fill();
  ctx.fillStyle = darken(c.s2, 0.5);
  ctx.beginPath();
  ctx.arc(174, 124, 47, Math.PI * 0.98, Math.PI * 2.02);
  ctx.closePath();
  ctx.fill();
  drawFace(ctx, 184, 140, 40, { col: skin, c, mood: k.joint ? faceMood(k) : 'smile', look: { x: 0.6, y: 0.1 } });
  ctx.restore();

  // arm: upper arm, biceps (shoulder -> just past the elbow on the forearm), forearm, hand
  const elbowDeg = elbowAngle(k);
  const ins = { x: k.joint.x + Math.cos(k.a2) * 22, y: k.joint.y + Math.sin(k.a2) * 22 };
  const org = { x: S.x + Math.cos(k.a1) * 14, y: S.y + Math.sin(k.a1) * 14 };
  const shortK = clamp((180 - elbowDeg) / 120, 0, 1);
  const bulge = 1.5 + 11 * shortK;
  limb(ctx, S, k.joint, 38, 28, skin);
  limb(ctx, k.joint, k.end, 27, 21, skin);
  // a cut-away window: the muscle seen through the skin
  const off = 6;
  const nx = -Math.sin(k.a1) * off, ny = Math.cos(k.a1) * off;
  muscle(ctx, { x: org.x - nx, y: org.y - ny }, { x: ins.x, y: ins.y }, 14, 8, bulge, c.s6, { stroke: darken(c.s6, 0.3), lineWidth: 2.5 });
  ctx.strokeStyle = alpha(lighten(c.s6, 0.45), 0.85);
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  const mx = (org.x + ins.x) / 2 - nx * 0.6, my = (org.y + ins.y) / 2 - ny * 0.6;
  ctx.moveTo(mx - Math.cos(k.a1) * 16, my - Math.sin(k.a1) * 16);
  ctx.lineTo(mx + Math.cos(k.a1) * 10, my + Math.sin(k.a1) * 10);
  ctx.stroke();
  // elbow knob and hand
  ctx.fillStyle = skinDk;
  ellipse(ctx, k.joint.x, k.joint.y, 6, 6); ctx.fill();
  drawDumbbell(ctx, c, k.end, k.a2);
  ctx.fillStyle = skin;
  ellipse(ctx, k.end.x, k.end.y, 15, 15); ctx.fill();
  ctx.strokeStyle = skinDk; ctx.lineWidth = 2;
  ellipse(ctx, k.end.x, k.end.y, 15, 15); ctx.stroke();

  // the label sits off the outer side of the upper arm (away from the forearm)
  let ox = -Math.sin(k.a1), oy = Math.cos(k.a1);
  if (ox * (k.end.x - k.joint.x) + oy * (k.end.y - k.joint.y) > 0) { ox = -ox; oy = -oy; }
  const lx = clamp(mx + ox * 74, 60, RIGHT.x - 60), ly = clamp(my + oy * 74, 100, FLOOR - 24);
  leader(ctx, mx, my, lx, ly, c.s6, 0.9);
  pill(ctx, c, 'Biceps', lx, ly, { bg: c.s6, size: 14 });
  if (!k.reached && scene.dragging) drawTargetMiss(ctx, c, scene.goal);

  drawReadout(ctx, c, RIGHT.x, RIGHT.y, RIGHT.w, [
    { label: 'Elbow', value: Math.round(elbowDeg) + ' deg', col: c.s1ink },
    { label: 'Biceps', value: shortK > 0.5 ? 'short' : 'long', col: c.s6ink, meter: 1 - shortK * 0.7 },
  ], { title: 'Arm', accent: c.s5 });
  smallNote(ctx, c, ['Muscles only pull.', 'Biceps shortens:', 'the elbow bends.'], RIGHT.y + 170);
}

function faceMood(k) {
  return elbowAngle(k) < 70 ? 'happy' : 'smile';
}

function elbowAngle(k) {
  let d = Math.abs(k.a2 - k.a1) % TAU;
  if (d > Math.PI) d = TAU - d;
  return 180 - (d * 180) / Math.PI;
}

function drawDumbbell(ctx, c, p, ang) {
  const n = ang + Math.PI / 2;
  const cx = Math.cos(n), sy = Math.sin(n);
  const bar = darken(c.stroke, 0.1);
  limb(ctx, { x: p.x - cx * 34, y: p.y - sy * 34 }, { x: p.x + cx * 34, y: p.y + sy * 34 }, 8, 8, bar);
  for (const sgn of [-1, 1]) {
    const q = { x: p.x + cx * 30 * sgn, y: p.y + sy * 30 * sgn };
    limb(ctx, { x: q.x - cx * 7, y: q.y - sy * 7 }, { x: q.x + cx * 7, y: q.y + sy * 7 }, 30, 30, darken(c.s7, 0.2));
    limb(ctx, { x: q.x - cx * 7, y: q.y - sy * 7 }, { x: q.x + cx * 7, y: q.y + sy * 7 }, 22, 22, c.s7);
  }
}

// -- Beat 1: the lever ----------------------------------------------------------

function drawLever(scene, ctx, c) {
  const L = leverNow(scene);
  const ang = scene.pt.x;
  // fulcrum
  drawShadow(ctx, c, LEV.fx, FLOOR + 2, 66, 10);
  ctx.fillStyle = darken(c.s2, 0.3);
  ctx.beginPath();
  ctx.moveTo(LEV.fx, LEV.fy + 4); ctx.lineTo(LEV.fx + 58, FLOOR + 2); ctx.lineTo(LEV.fx - 58, FLOOR + 2); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = c.s2;
  ctx.beginPath();
  ctx.moveTo(LEV.fx, LEV.fy); ctx.lineTo(LEV.fx + 52, FLOOR - 2); ctx.lineTo(LEV.fx - 52, FLOOR - 2); ctx.closePath();
  ctx.fill();

  // stone on the load end (sits on the plank, tilted with it)
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const stone = { x: L.load.x - 14 * ca + 30 * sa, y: L.load.y - 14 * sa - 30 * ca };
  if (stone.y > FLOOR - 40) stone.y = FLOOR - 40;
  ctx.save();
  ctx.translate(stone.x, stone.y);
  ctx.rotate(ang);
  ctx.fillStyle = darken(c.waste, 0.25);
  rr(ctx, -40, -26, 80, 58, 20); ctx.fill();
  ctx.fillStyle = c.waste;
  rr(ctx, -40, -30, 80, 56, 20); ctx.fill();
  ctx.fillStyle = lighten(c.waste, 0.25);
  ellipse(ctx, -14, -16, 12, 6); ctx.fill();
  ctx.restore();
  const lifted = clamp((LEV.max - ang) / (2 * LEV.max), 0, 1);
  drawFace(ctx, stone.x, stone.y + 2, 28, { col: c.waste, c, mood: lifted > 0.8 ? 'happy' : 'think' });

  // the plank
  const plankCol = c.s8;
  ctx.save();
  ctx.translate(LEV.fx, LEV.fy);
  ctx.rotate(ang);
  ctx.fillStyle = darken(plankCol, 0.3);
  rr(ctx, -LEV.eff - 10, -4, LEV.eff + LEV.load + 20, 20, 8); ctx.fill();
  ctx.fillStyle = plankCol;
  rr(ctx, -LEV.eff - 10, -8, LEV.eff + LEV.load + 20, 18, 8); ctx.fill();
  ctx.fillStyle = lighten(plankCol, 0.3);
  rr(ctx, -LEV.eff, -6, LEV.eff + LEV.load, 4, 2); ctx.fill();
  ctx.restore();
  ctx.fillStyle = darken(c.s2, 0.4);
  ellipse(ctx, LEV.fx, LEV.fy, 7, 7); ctx.fill();

  // effort: a push-down arrow on the long end, size fixed (the push is small)
  vectorArrow(ctx, c, L.effort.x, L.effort.y - 92, { angle: Math.PI / 2, length: 78, col: c.s1, width: 6, head: 16 });
  pill(ctx, c, 'Push', L.effort.x, L.effort.y - 108, { bg: c.s1, size: 14 });
  ctx.fillStyle = c.s1;
  ellipse(ctx, L.effort.x, L.effort.y - 6, 12, 12); ctx.fill();
  ctx.fillStyle = lighten(c.s1, 0.4);
  ellipse(ctx, L.effort.x - 3, L.effort.y - 9, 4, 4); ctx.fill();

  // arm-length brackets under the plank
  const by = FLOOR + 22;
  bracket(ctx, c, LEV.fx - LEV.eff * Math.cos(ang), LEV.fx, by, c.s1, c.s1ink, 'long arm');
  bracket(ctx, c, LEV.fx, LEV.fx + LEV.load * Math.cos(ang), by, c.s6, c.s6ink, 'short');

  drawReadout(ctx, c, RIGHT.x, RIGHT.y, RIGHT.w, [
    { label: 'Long arm', value: (LEV.eff / 40).toFixed(1) + ' m', col: c.s1ink },
    { label: 'Short arm', value: (LEV.load / 40).toFixed(1) + ' m', col: c.s6ink },
    { label: 'Lift', value: 'x' + L.advantage.toFixed(1), col: c.s3ink },
  ], { title: 'Lever', accent: c.s8 });
  smallNote(ctx, c, ['Push far from the', 'pivot: a small push', 'lifts a big load.'], RIGHT.y + 190);
}

function bracket(ctx, c, x0, x1, y, col, ink, text) {
  ctx.strokeStyle = col;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y - 7); ctx.lineTo(x0, y); ctx.lineTo(x1, y); ctx.lineTo(x1, y - 7);
  ctx.stroke();
  ctx.fillStyle = ink;
  ctx.font = font(c, 800, 14);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(text, (x0 + x1) / 2, y + 4);
}

// -- Beat 2: crank and piston ---------------------------------------------------

function drawCrank(scene, ctx, c) {
  const a = scene.pt.x;
  const k = crankSlider({ x: CRANK.cx, y: CRANK.cy }, CRANK.r, CRANK.rod, a, CRANK.axis);
  const up = (k.s - k.sMin) / (k.sMax - k.sMin);
  const pistonH = 42, pistonW = 86;
  const cylTop = CRANK.cy - k.sMax - pistonH / 2 - 34;
  const cylBot = CRANK.cy - k.sMin + pistonH / 2 + 6;
  const cx = CRANK.cx;

  // cylinder: walls and the gas above the piston
  ctx.fillStyle = darken(c.bgSurface, 0.15);
  rr(ctx, cx - pistonW / 2 - 16, cylTop - 14, pistonW + 32, cylBot - cylTop + 14, 14); ctx.fill();
  ctx.fillStyle = mix(c.bgDeep, c.glass, 0.18);
  rr(ctx, cx - pistonW / 2 - 2, cylTop, pistonW + 4, cylBot - cylTop, 6); ctx.fill();
  const pistonTop = k.slider.y - pistonH / 2;
  ctx.fillStyle = alpha(c.flame, 0.15 + 0.55 * up * up);
  rr(ctx, cx - pistonW / 2, cylTop + 2, pistonW, pistonTop - cylTop - 2, 5); ctx.fill();
  ctx.fillStyle = c.stroke;
  rr(ctx, cx - pistonW / 2 - 16, cylTop - 22, pistonW + 32, 14, 6); ctx.fill();

  // flywheel behind the crank
  drawShadow(ctx, c, cx, FLOOR + 2, 84, 12);
  ctx.fillStyle = darken(c.s5, 0.3);
  ellipse(ctx, cx, CRANK.cy + 4, 74, 74); ctx.fill();
  ctx.fillStyle = c.s5;
  ellipse(ctx, cx, CRANK.cy, 74, 74); ctx.fill();
  ctx.fillStyle = darken(c.s5, 0.15);
  ellipse(ctx, cx, CRANK.cy, 58, 58); ctx.fill();
  for (let i = 0; i < 4; i++) {
    const sa = a + CRANK.axis + (i * TAU) / 4 + Math.PI / 4;
    limb(ctx, { x: cx, y: CRANK.cy }, { x: cx + Math.cos(sa) * 58, y: CRANK.cy + Math.sin(sa) * 58 }, 12, 8, c.s5);
  }

  // crank arm, connecting rod, piston
  limb(ctx, { x: cx, y: CRANK.cy }, k.pin, 30, 22, c.s2, { stroke: darken(c.s2, 0.35), lineWidth: 2.5 });
  limb(ctx, k.pin, k.slider, 20, 14, c.s1, { stroke: darken(c.s1, 0.35), lineWidth: 2.5 });
  ctx.fillStyle = darken(c.stroke, 0.2);
  ellipse(ctx, cx, CRANK.cy, 9, 9); ctx.fill();
  ctx.fillStyle = lighten(c.s2, 0.5);
  ellipse(ctx, k.pin.x, k.pin.y, 6, 6); ctx.fill();
  ctx.fillStyle = darken(c.s3, 0.3);
  rr(ctx, cx - pistonW / 2, pistonTop + 4, pistonW, pistonH, 9); ctx.fill();
  ctx.fillStyle = c.s3;
  rr(ctx, cx - pistonW / 2, pistonTop, pistonW, pistonH, 9); ctx.fill();
  ctx.fillStyle = darken(c.s3, 0.2);
  rr(ctx, cx - pistonW / 2 + 6, pistonTop + 9, pistonW - 12, 5, 2.5); ctx.fill();
  rr(ctx, cx - pistonW / 2 + 6, pistonTop + 18, pistonW - 12, 5, 2.5); ctx.fill();
  ctx.fillStyle = lighten(c.s1, 0.5);
  ellipse(ctx, k.slider.x, k.slider.y, 6, 6); ctx.fill();

  // turn arrow round the wheel
  ctx.strokeStyle = alpha(c.s2, 0.8);
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, CRANK.cy, 92, 0.15 * Math.PI, 0.55 * Math.PI);
  ctx.stroke();
  const ha = 0.55 * Math.PI;
  const hx = cx + Math.cos(ha) * 92, hy = CRANK.cy + Math.sin(ha) * 92;
  ctx.fillStyle = alpha(c.s2, 0.8);
  ctx.beginPath();
  ctx.moveTo(hx - 12, hy - 2); ctx.lineTo(hx + 4, hy - 12); ctx.lineTo(hx + 4, hy + 8); ctx.closePath();
  ctx.fill();

  pill(ctx, c, 'Piston', cx + pistonW / 2 + 54, k.slider.y, { bg: c.s3, size: 14 });
  pill(ctx, c, 'Rod', (k.pin.x + k.slider.x) / 2 - 64, (k.pin.y + k.slider.y) / 2, { bg: c.s1, size: 14 });
  pill(ctx, c, 'Crank', cx + 120, CRANK.cy + 20, { bg: c.s2, size: 14 });

  const deg = Math.round(((a % TAU) + TAU) % TAU * 180 / Math.PI) % 360;
  drawReadout(ctx, c, RIGHT.x, RIGHT.y, RIGHT.w, [
    { label: 'Crank', value: deg + ' deg', col: c.s2ink },
    { label: 'Piston', value: up > 0.66 ? 'up' : up < 0.34 ? 'down' : 'middle', col: c.s3ink, meter: up },
  ], { title: 'Engine', accent: c.s3 });
  smallNote(ctx, c, ['Round and round', 'becomes up and', 'down, as in an', 'engine or a pump.'], RIGHT.y + 170);
}

// -- Beat 3: robot arm ----------------------------------------------------------

function drawBot(scene, ctx, c) {
  const k = botIk(scene);
  const S = { x: BOT.sx, y: BOT.sy };
  // reach ring
  ctx.save();
  ctx.setLineDash([6, 8]);
  ctx.strokeStyle = alpha(c.accent, 0.4);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(S.x, S.y, BOT.l1 + BOT.l2, -Math.PI * 0.62, Math.PI * 0.22);
  ctx.stroke();
  ctx.restore();

  // flasks on the floor / shelf
  drawShelfAt(ctx, c, 352, 482, SHELF_Y);
  for (let i = 0; i < FLASKS.length; i++) drawFlask(ctx, c, FLASKS[i]);

  // pedestal
  drawShadow(ctx, c, S.x, FLOOR + 2, 62, 10);
  ctx.fillStyle = darken(c.stroke, 0.25);
  rr(ctx, S.x - 46, FLOOR - 26, 92, 30, 10); ctx.fill();
  ctx.fillStyle = c.stroke;
  rr(ctx, S.x - 46, FLOOR - 30, 92, 26, 10); ctx.fill();
  limb(ctx, { x: S.x, y: FLOOR - 26 }, S, 44, 34, darken(c.s7, 0.2));

  // arm segments
  const body = c.s7;
  limb(ctx, S, k.joint, 34, 26, darken(body, 0.3));
  limb(ctx, S, k.joint, 28, 20, body);
  limb(ctx, k.joint, k.end, 24, 18, darken(c.s2, 0.3));
  limb(ctx, k.joint, k.end, 19, 13, c.s2);
  // gripper
  const ga = Math.atan2(k.end.y - k.joint.y, k.end.x - k.joint.x);
  const gn = ga + Math.PI / 2;
  for (const sgn of [-1, 1]) {
    const base = { x: k.end.x + Math.cos(gn) * 9 * sgn, y: k.end.y + Math.sin(gn) * 9 * sgn };
    const tip = { x: base.x + Math.cos(ga) * 20 + Math.cos(gn) * 4 * sgn, y: base.y + Math.sin(ga) * 20 + Math.sin(gn) * 4 * sgn };
    limb(ctx, base, tip, 8, 6, darken(c.stroke, 0.15));
  }
  // joints (the elbow is a button: tap to flip)
  for (const [p, r] of [[S, 14], [k.joint, 13], [k.end, 10]]) {
    ctx.fillStyle = darken(c.stroke, 0.3);
    ellipse(ctx, p.x, p.y + 2, r, r); ctx.fill();
    ctx.fillStyle = lighten(c.stroke, 0.35);
    ellipse(ctx, p.x, p.y, r, r); ctx.fill();
    ctx.fillStyle = c.label;
    ellipse(ctx, p.x, p.y, r * 0.35, r * 0.35); ctx.fill();
  }
  if (!k.reached) {
    drawTargetMiss(ctx, c, k.tgt);
    pill(ctx, c, 'Too far!', clamp(k.tgt.x, 60, RIGHT.x - 60), clamp(k.tgt.y - 34, 96, FLOOR - 20), { bg: c.bad, size: 14 });
  }

  drawReadout(ctx, c, RIGHT.x, RIGHT.y, RIGHT.w, [
    { label: 'Reach', value: Math.round(100 * Math.min(1, k.dist / (BOT.l1 + BOT.l2))) + '%', col: k.reached ? c.s3ink : c.s6ink, meter: Math.min(1, k.dist / (BOT.l1 + BOT.l2)) },
    { label: 'Elbow', value: scene.bendGoal > 0 ? 'down' : 'up', col: c.s7ink },
  ], { title: 'Robot', accent: c.s7 });
  smallNote(ctx, c, ['Two bones, one', 'hinge: the joint', 'angles follow the', 'gripper.'], RIGHT.y + 170);
}

function drawShelfAt(ctx, c, x0, x1, y) {
  ctx.fillStyle = darken(c.s8, 0.35);
  rr(ctx, x0, y + 4, x1 - x0, 12, 5); ctx.fill();
  ctx.fillStyle = c.s8;
  rr(ctx, x0, y, x1 - x0, 12, 5); ctx.fill();
  ctx.fillStyle = darken(c.s8, 0.3);
  rr(ctx, x0 + 14, y + 12, 10, FLOOR - y - 12, 4); ctx.fill();
  rr(ctx, x1 - 24, y + 12, 10, FLOOR - y - 12, 4); ctx.fill();
}

function drawFlask(ctx, c, f) {
  const col = c[f.key];
  const x = f.x, y = f.y;
  ctx.fillStyle = mix(c.glass, c.bgSurface, 0.35);
  rr(ctx, x - 8, y - 30, 16, 18, 4); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 8, y - 14); ctx.lineTo(x - 22, y + 16); ctx.quadraticCurveTo(x - 24, y + 24, x - 14, y + 24);
  ctx.lineTo(x + 14, y + 24); ctx.quadraticCurveTo(x + 24, y + 24, x + 22, y + 16); ctx.lineTo(x + 8, y - 14); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x - 15, y + 2); ctx.lineTo(x - 21, y + 16); ctx.quadraticCurveTo(x - 22, y + 21, x - 14, y + 21);
  ctx.lineTo(x + 14, y + 21); ctx.quadraticCurveTo(x + 22, y + 21, x + 21, y + 16); ctx.lineTo(x + 15, y + 2); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = lighten(col, 0.45);
  ellipse(ctx, x - 9, y + 10, 3, 3); ctx.fill();
  ellipse(ctx, x + 5, y + 14, 2, 2); ctx.fill();
}

// -- Shared bits ----------------------------------------------------------------

function drawTargetMiss(ctx, c, p) {
  ctx.strokeStyle = c.bad;
  ctx.lineWidth = 3;
  ellipse(ctx, p.x, p.y, 13, 13); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(p.x - 6, p.y - 6); ctx.lineTo(p.x + 6, p.y + 6);
  ctx.moveTo(p.x + 6, p.y - 6); ctx.lineTo(p.x - 6, p.y + 6);
  ctx.stroke();
}

function smallNote(ctx, c, lines, y) {
  ctx.fillStyle = c.labelMuted;
  ctx.font = font(c, 700, 15);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], RIGHT.x + 8, y + i * 21);
}
