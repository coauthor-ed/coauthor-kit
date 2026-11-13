#!/usr/bin/env node
// Checks that a content-block's markdown produces the same number of beats
// (via the real engine's own splitSteps()) as its attached scene's
// BEAT_STEP_MAP declares. See README.md - this is the static counterpart
// to what docs/simulation-authoring.md §2.2 warns clamps silently instead
// of crashing, and §6 says the browser preview harness doesn't prove.
import fs from 'node:fs';
import path from 'node:path';
import { countSteps } from './vendor/splitSteps.js';
import { getDeclaredBeatCount } from './parseBeatStepMap.mjs';

const blockPath = process.argv[2];
if (!blockPath) {
  console.error('Usage: node tools/beat-check/check.mjs <block.json>');
  process.exit(2);
}

const abs = path.resolve(process.cwd(), blockPath);
const block = JSON.parse(fs.readFileSync(abs, 'utf8'));

// Bundle root = nearest ancestor directory literally named "blocks" (see
// docs/content-authoring-guide.md's courses/<bundle>/blocks/L0N/ layout),
// so simulation.src / markdownRef (both bundle-relative) resolve the same
// way the real engine's CourseSourceManager.resolveRef() would.
let dir = path.dirname(abs);
let bundleRoot = null;
while (true) {
  if (path.basename(dir) === 'blocks') { bundleRoot = path.dirname(dir); break; }
  const parent = path.dirname(dir);
  if (parent === dir) break;
  dir = parent;
}
if (!bundleRoot) {
  console.error(`Could not find a "blocks" ancestor directory above ${blockPath} to resolve markdownRef/simulation.src against`);
  process.exit(2);
}

// Prose is either inline (`markdown.en`) or a sibling `.md` file
// (`markdownRef` - SKILL.md's default, see docs/sprints/wip/
// dom-simulations-md-prose-and-explanation-slides.md §6). Inline wins if a
// block somehow carries both, matching the real engine's hydrateProseRefs.js.
let md = block.markdown?.en;
if (!md && block.markdownRef) {
  const mdPath = path.join(bundleRoot, block.markdownRef);
  if (!fs.existsSync(mdPath)) {
    console.error(`markdownRef "${block.markdownRef}" does not resolve to a file on disk (looked for ${path.relative(process.cwd(), mdPath)})`);
    process.exit(2);
  }
  md = fs.readFileSync(mdPath, 'utf8');
}
if (!md) { console.log('skip: no markdown.en or markdownRef on this block'); process.exit(0); }

const sim = block.simulation;
if (!sim?.src) { console.log('skip: no simulation attached to this block'); process.exit(0); }
if (/^https?:\/\//.test(sim.src)) { console.log("skip: simulation.src is a full URL - can't check statically"); process.exit(0); }

const scenePath = path.join(bundleRoot, sim.src);
if (!fs.existsSync(scenePath)) {
  console.error(`Scene file not found: ${path.relative(process.cwd(), scenePath)}`);
  process.exit(2);
}

const declared = getDeclaredBeatCount(fs.readFileSync(scenePath, 'utf8'));
if (declared == null) {
  console.log(`skip: no BEAT_STEP_MAP in ${sim.src} (not a beat-mapped scene, or a different convention)`);
  process.exit(0);
}

const expected = countSteps(md);
console.log(`markdown beats (splitSteps): ${expected}`);
console.log(`BEAT_STEP_MAP entries:       ${declared}`);

if (declared !== expected) {
  console.error(`MISMATCH - markdown produces ${expected} beat(s), scene's BEAT_STEP_MAP has ${declared}. The scene clamps rather than crashing, but extra/missing beats show a stale or repeated visual against the text.`);
  process.exit(1);
}
console.log('OK - beat counts match');
