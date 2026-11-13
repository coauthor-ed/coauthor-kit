// Generic lifecycle walk for any simulation scene - construct, setup(),
// step() through a few beats, teardown - under the fake-DOM harness.
// Invoked via run.mjs; see README.md. Not meant to be run directly (it
// wouldn't get its output logged to build/scratch/logs/).
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { installFakeHost, createLogicCtx, createDrawCtx, getLastCtx, makeContainer, runComeToRestCheck } from './harness.mjs';
import { toRgb, contrastRatio } from './color.mjs';
import { scanColorTokenUsage, scanOffPaletteTokens } from './colorTokenScan.mjs';
import { flatnessAdvisories } from './flatness.mjs';
import { controlsIssues } from '../../simulations-kit/src/simulations/base/SimControls.js';

function parseArgs(argv) {
  const [scenePath, ...rest] = argv;
  const opts = { export: null, beats: 3 };
  for (const a of rest) {
    const m = a.match(/^--(\w+)=(.*)$/);
    if (m) opts[m[1]] = m[2];
  }
  return { scenePath, opts };
}

function boxesOverlap(a, b) {
  return a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
}

/** The smallest panel containing the text's own anchor point (the x,y
 *  actually passed to fillText) - not the bbox center, which drifts outside
 *  the container precisely when text overflows it, i.e. exactly the case
 *  being checked for. */
function findEnclosingPanel(textBox, panels) {
  const { x, y } = textBox;
  let best = null;
  let bestArea = Infinity;
  for (const p of panels) {
    if (x < p.x0 || x > p.x1 || y < p.y0 || y > p.y1) continue;
    const area = (p.x1 - p.x0) * (p.y1 - p.y0);
    if (area < bestArea) { best = p; bestArea = area; }
  }
  return best;
}

const mode = process.argv[2]; // 'sanity' | 'draw'
const { scenePath, opts } = parseArgs(process.argv.slice(3));
if (!scenePath) {
  console.error('Usage: check.mjs <sanity|draw> <scene.js> [--export=Name] [--beats=N] [--container=WxH]');
  process.exit(2);
}

installFakeHost(mode === 'draw' ? createDrawCtx : createLogicCtx);

const sceneAbsPath = path.resolve(process.cwd(), scenePath);
const mod = await import(pathToFileURL(sceneAbsPath).href);
const SceneClass = opts.export
  ? mod[opts.export]
  : (mod.default ?? Object.values(mod).find((v) => typeof v === 'function'));
if (typeof SceneClass !== 'function') {
  console.error(`No scene class export found in ${scenePath} (pass --export=Name if it isn't the only export)`);
  process.exit(2);
}

let failures = 0;
const step = (name, fn) => {
  try { fn(); console.log(`ok: ${name}`); }
  catch (err) { failures++; console.error(`FAIL: ${name} -`, err.stack || err.message); }
};

// Advisory only - doesn't affect the exit code. See colorTokenScan.mjs.
{
  const sceneSource = fs.readFileSync(sceneAbsPath, 'utf8');
  const { literalCount, tokenCount } = scanColorTokenUsage(sceneSource);
  if (literalCount > 0) {   // any literal colour breaks one of the two themes; the compliant scenes have none
    console.log(`advisory: ${literalCount} hardcoded fillStyle/strokeStyle color(s) vs ${tokenCount} this.colors.* reference(s) - prefer this.colors (docs/simulation-authoring.md).`);
  }
  for (const line of flatnessAdvisories(sceneSource)) {
    console.log(`advisory: ${line}`);
  }
  const { offPalette, aliased } = scanOffPaletteTokens(sceneSource);
  if (aliased.length) {
    console.log(`note: ${aliased.join(', ')} - resolved by SimTheme's role alias, so these DO follow the theme. Naming the role directly is clearer, but nothing is broken.`);
  }
  if (offPalette.length) {
    console.log(`advisory: tokenMap names ${offPalette.join(', ')} - not in the closed palette and not alias-resolvable, so it always renders its JS fallback hex (a hardcoded color in disguise), identical in both themes. Map onto an existing token or --sim-series-N (docs/simulation-authoring.md).`);
  }
}

// static CONTROLS the host cannot draw (no valid `type:`, a select without option values,
// duplicate ids) leave an empty control bar in the real app; every tool here calls
// onControlChange directly, so nothing else notices. Once per scene: the sanity walk only.
if (mode === 'sanity') for (const m of controlsIssues(SceneClass)) { failures++; console.error(`FAIL: ${m}`); }

// --container=WxH lets a scene's DomSimulation _resolveIsPortrait() fallback
// and any PORTRAIT_WIDTH/HEIGHT design be exercised headlessly. Defaults to
// today's undefined/0 clientWidth/clientHeight (backward-compatible).
let containerSize;
if (opts.container) {
  const m = /^(\d+)x(\d+)$/.exec(opts.container);
  if (!m) {
    console.error(`--container must be WxH (e.g. --container=375x812), got: ${opts.container}`);
    process.exit(2);
  }
  containerSize = { width: Number(m[1]), height: Number(m[2]) };
}
const container = makeContainer(containerSize);
// SimFigure reports every solved figure here (never installed in production).
globalThis.__simFigureLog = [];
let scene;
// Same mount contract simulations-kit/preview-harness.html uses: these are
// set by the host before setup() runs, not something every scene must
// remember to set itself - a scene correctly relying on that would
// otherwise show a false "not drawing" here.
step('construct', () => {
  scene = new SceneClass(container);
  scene.requestUiUpdate = () => {};
  scene.allowResume = true;
});
if (scene) {
  await (async () => {
    try { await scene.setup(); console.log('ok: setup()'); }
    catch (err) { failures++; console.error('FAIL: setup() -', err.stack || err.message); }
  })();

  step('setup() mounted something in the container', () => {
    if (!container.children.length) throw new Error('nothing appended to container');
  });

  // Only meaningful for a portrait-carrying DomSimulation scene tested
  // against a tall/narrow --container - confirms the base class's portrait
  // contract (docs/sprints/wip/dom-simulation-auto-layout.md #4) actually
  // took effect, not just that setup() ran without throwing.
  if (containerSize && containerSize.height > containerSize.width && SceneClass.PORTRAIT_WIDTH) {
    step('portrait design applied (sim-dom-root--portrait, _designW === PORTRAIT_WIDTH)', () => {
      if (scene._designW !== SceneClass.PORTRAIT_WIDTH) {
        throw new Error(`_designW is ${scene._designW}, expected PORTRAIT_WIDTH ${SceneClass.PORTRAIT_WIDTH}`);
      }
      if (!scene.root?.classList?.contains('sim-dom-root--portrait')) {
        throw new Error('root is missing sim-dom-root--portrait');
      }
    });
  }

  // DomSimulation never touches getLastCtx() (no canvas) but appends real
  // DOM; Canvas/WebGL scenes set getLastCtx() instead (a Proxy, not a real
  // element). `!scene.unsupported` excludes a WebGLSimulation's no-GPU
  // fallback div, which would otherwise false-positive as a DOM scene.
  const domScene = !scene.unsupported && !getLastCtx() && container.children.length > 0;

  // Cheap structural signature - tag/class/attrs/text, not a real diff -
  // good enough to answer "did anything actually change" without a real DOM
  // equality check. Bounded depth guards against a pathological cycle.
  const treeSignature = (el, depth = 0) => {
    if (!el || depth > 12) return '';
    const attrs = el.attrs ? Object.entries(el.attrs).sort().map(([k, v]) => `${k}=${v}`).join(' ') : '';
    const kids = (el.children || []).map((c) => treeSignature(c, depth + 1)).join('');
    return `<${el.tagName || ''}.${el.className || ''}[${attrs}]${el._text || ''}>${kids}`;
  };

  const beats = Number(opts.beats) || 3;
  const canStep = typeof scene.step === 'function';
  const signatureBefore = domScene ? treeSignature(container) : null;
  for (let b = 0; b < beats; b++) {
    const ctx = getLastCtx();
    if (ctx) ctx._frame = b; // tags fillText/fillRect calls below for the per-beat legibility checks
    if (typeof scene.onBeatChange === 'function') {
      step(`onBeatChange(${b}, ${beats})`, () => scene.onBeatChange(b, beats));
    }
    if (canStep) step(`step() x5 after beat ${b}`, () => { for (let f = 0; f < 5; f++) scene.step(16.7); });
  }
  if (!canStep) console.log('skip: no step() - likely an InteractiveSceneBase scene with no rAF loop');
  // Needs two beats to mean anything: a one-beat scene (a mini-game mounts once,
  // with no beats) has nothing to change between.
  if (domScene && typeof scene.onBeatChange === 'function' && beats >= 2) {
    step('DOM scene: onBeatChange mutated the tree', () => {
      if (treeSignature(container) === signatureBefore) {
        throw new Error(`root looks identical after ${beats} onBeatChange call(s) - scene may not be responding to beats (a scene that mounts markup with innerHTML or render({ html }) looks unchanged here: the fake DOM has no HTML parser, so build with createElement/append or drive it with drive-dom)`);
      }
    });
  }

  // Every fillStyle/strokeStyle assignment must be a real color - catches the
  // wrong-variable typo (e.g. `ctx.fillStyle = label` instead of
  // `labelColor`) that canvas otherwise swallows silently. Checked in both
  // modes since it's near-free and unrelated to draw-call recording.
  // Deduped - the same wrong assignment fires on every one of the pumped
  // frames across every beat, and that repetition isn't useful signal here.
  const colorWarnings = [...new Map((getLastCtx()?._colorWarnings ?? []).map((w) => [`${w.prop}|${w.value}`, w])).values()];
  for (const w of colorWarnings) {
    failures++;
    console.error(`FAIL: ${w.prop} was set to ${JSON.stringify(w.value)} - not a valid color (wrong variable assigned?)`);
  }

  // No real WebGL context in this headless env (no headless-gl), so a
  // WebGLSimulation scene always takes its documented fallback path here
  // instead of drawing - expected, not a bug. Skip the draw-call checks
  // below; they only apply to Canvas2D `ctx` calls.
  if (scene.unsupported) {
    console.log('skip: scene.unsupported === true - no GPU in this headless environment (expected). Verify visuals in simulations-kit/preview-harness.html in a real browser.');
  } else if (domScene) {
    // No layout engine here (jsdom-free by design - see harness.mjs), so the
    // canvas draw-call/legibility checks below (which exist because canvas
    // has no layout engine of its own) can't be ported and don't apply: a
    // real browser lays the text out, which is the point. See
    // docs/simulation-authoring.md and simulations-kit/preview-harness.html.
    console.log('skip: DOM scene - canvas draw-call/legibility checks don\'t apply. Visual verification is simulations-kit/preview-harness.html in a real browser.');
  } else if (mode === 'draw') {
    const calls = getLastCtx()?._calls ?? [];
    if (calls.length === 0) {
      failures++;
      console.error('FAIL: no canvas draw calls recorded across any step - scene may not be drawing');
    } else {
      const hist = {};
      for (const c of calls) hist[c.method] = (hist[c.method] || 0) + 1;
      console.log('draw call histogram:', JSON.stringify(hist));
    }

    // Heuristic legibility checks - approximate bounding boxes (no real font
    // metrics in Node), grouped per beat since a stable scene redraws the
    // same layout every pumped frame within one beat. See README.md.
    const textBoxes = getLastCtx()?._textBoxes ?? [];
    const panelBoxes = getLastCtx()?._panelBoxes ?? [];
    const frames = [...new Set([...textBoxes.map((b) => b.frame), ...panelBoxes.map((b) => b.frame)])];
    let overlapCount = 0, overflowCount = 0, contrastCount = 0;
    // A stable (non-animating) label redraws identically on every one of the
    // 5 pumped frames per beat - dedupe by exact position before comparing
    // pairwise, or every static label would "overlap" its own earlier frame.
    // A label whose position genuinely changes frame-to-frame (e.g. mid-flip)
    // keeps every distinct position, since overlap during motion is real too.
    const dedupe = (boxes) => {
      const seen = new Set();
      return boxes.filter((b) => {
        const key = `${b.text ?? ''}|${b.x0.toFixed(1)}|${b.y0.toFixed(1)}|${b.x1.toFixed(1)}|${b.y1.toFixed(1)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };

    for (const f of frames) {
      const texts = dedupe(textBoxes.filter((b) => b.frame === f));
      const panels = dedupe(panelBoxes.filter((b) => b.frame === f));
      for (let i = 0; i < texts.length; i++) {
        for (let j = i + 1; j < texts.length; j++) {
          // Same text at two nearby positions is far more often one animating
          // label sampled mid-motion (still settling into place) than two
          // distinct labels sharing a string - the reported bug is always
          // between *different* labels crowding each other.
          if (texts[i].text === texts[j].text) continue;
          if (boxesOverlap(texts[i], texts[j])) {
            overlapCount++;
            console.log(`guess: beat ${f}: text "${texts[i].text}" overlaps "${texts[j].text}"`);
          }
        }
        const panel = findEnclosingPanel(texts[i], panels);
        if (!panel) continue;
        if (texts[i].x0 < panel.x0 || texts[i].x1 > panel.x1 || texts[i].y0 < panel.y0 || texts[i].y1 > panel.y1) {
          overflowCount++;
          console.log(`guess: beat ${f}: text "${texts[i].text}" overflows its container`);
        }
        const ratio = contrastRatio(toRgb(texts[i].fillStyle), toRgb(panel.fillStyle));
        if (ratio != null && ratio < 4.5) {
          contrastCount++;
          console.log(`guess: beat ${f}: text "${texts[i].text}" is low-contrast against its container (${ratio.toFixed(2)}:1, want >= 4.5:1)`);
        }
      }
    }
    // These are guesses from approximate boxes (no real fonts): printed as `guess:`, never a FAIL. shoot's browser report is the check.
    if (textBoxes.length) {
      console.log(`legibility: ${overlapCount} overlap, ${overflowCount} overflow, ${contrastCount} low-contrast (of ${textBoxes.length} text draws checked; heuristic, see README)`);
    }
  }

  // Come-to-rest check (dom-simulations-md-prose-and-explanation-slides.md
  // #5) - runs in both modes (ctx._callCount, tracked regardless of
  // `record`). Drives the scene through its real rAF loop (start() + the
  // fake clock's pumpFrame()), not the direct step() calls above, which
  // bypass the animation budget entirely. Skips a DOM scene, an unsupported
  // WebGL scene, or a hybrid DomSimulation+<canvas> with no `_tick` - none
  // have per-frame work for "does it wake" to mean anything.
  if (!scene.unsupported && !domScene && typeof scene.start === 'function' && typeof scene._tick === 'function') {
    step('start()', () => scene.start());
    const result = runComeToRestCheck(scene, { beatsCount: beats });
    step('wake: draw calls grow right after a state change', () => {
      if (!result.wakeOk) {
        throw new Error(`draw-call count did not grow (${result.before} -> ${result.afterWake}) after onBeatChange/animateFor - the loop may be parked when it should be animating`);
      }
    });

    if (!result.idleApplicable) {
      console.log('skip: idle check - static CONTINUOUS === true (perpetual motion, expected to keep drawing)');
    } else {
      step('idle: draw calls stop growing once nothing is animating', () => {
        if (!result.idleOk) {
          throw new Error(`draw-call count kept growing after settling (${result.mid} -> ${result.end} over 20 further idle pumped frames, well past the ${result.budgetMs}ms budget) - the loop never parks (missing static CONTINUOUS, or a mutation site not covered by animateFor())`);
        }
      });
    }
  }

  const teardown = typeof scene.stop === 'function' ? scene.stop.bind(scene) : scene.destroy?.bind(scene);
  if (teardown) {
    step('teardown', teardown);
    if (domScene) {
      step('DOM scene: teardown emptied the container', () => {
        if (container.children.length) throw new Error(`container still has ${container.children.length} child(ren) after teardown`);
      });
    }
    step('teardown is idempotent', teardown);
  }
}

// People (SimFigure): deterministic checks on what the solver logged, deduped per message.
{
  const said = new Set();
  const say = (l) => { if (!said.has(l)) { said.add(l); console.log(l); } };
  const figs = globalThis.__simFigureLog || [];
  for (const f of figs) {
    const b = f.bounds;
    if (f.height < 60) say(`figure-warn: height ${Math.round(f.height)} px (<60): use drawPersonGlyph or enlarge (90+ px for a readable face)`);
    for (const w of f.warnings) if (w.code === 'hand-far' && w.over > 6) say(`figure-warn: ${w.limb} hand-far by ${w.over} px (grip outside reach; keep grips within ~0.25 x height of the feet)`);
    for (const w of f.warnings) if (w.code === 'leg-far') say(`figure-warn: ${w.limb} foot target out of reach by ${w.over} px`);
    for (const w of f.warnings) if (w.code === 'unknown-pose') say(`figure-warn: unknown pose "${w.limb}" (drew stand)`);
    const r = f.headR * 2;
    const W = SceneClass.WIDTH || 680, H = SceneClass.HEIGHT || 520;
    const over = Math.max(-b.x0, b.x1 - W, -b.y0, b.y1 - H);
    if (over > r) say(`figure-fail: figure leaves the frame by ${Math.round(over)} px`);
  }
}

console.log(failures === 0 ? 'PASS - all checks green' : `FAIL - ${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
