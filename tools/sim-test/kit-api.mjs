#!/usr/bin/env node
// kit-api - one line per export, so you learn an API without reading its source.
//
//   node tools/sim-test/kit-api.mjs [module.js | dir ...] [--bundle <id|dir>] [--grep <text>] [--geo] [--maths] [--humanities] [--physics] [--people] [--recipes]
//   node tools/sim-test/kit-api.mjs --tokens                              every --sim-* colour/size token sim-theme.css declares
//   node tools/sim-test/kit-api.mjs --sig <name> [--bundle <id|dir>]     one export anywhere in the kit (or the bundle's helpers):
//                                  its module path, signature, doc line, the keys it returns and the import line
//
// No arguments: the canvas look kit (kit/SimScene.js, kit/SimLook.js,
// kit/SimLookDom.js, kit/SimFigure.js); --geo adds the geography kit (Geo*.js). --bundle adds that bundle's helper modules (any
// simulations/**/*.js that is not a scene, i.e. has no .stub.md/.design.md).
// A class export also lists its public methods and hooks. Open a module's source
// only for the one function you are about to use.
import fs from 'node:fs';
import path from 'node:path';
import { moduleExports, parseFile, firstClass } from './lib/ast.mjs';
import { KIT_SIMS, bundleFromArg, resolveTarget, describeMiss, rel } from './lib/bundle.mjs';
import { parseArgs } from './lib/args.mjs';
import { walk } from './lib/ast.mjs';

const USAGE = 'node tools/sim-test/kit-api.mjs [simulations/base/kit/SimLook.js | path | L0N/Scene | dir ...] [--bundle <id|dir>] [--grep <text>] [--geo] [--maths] [--humanities] [--physics] [--people] [--recipes] | --sig <name>';
const A = parseArgs(process.argv.slice(2), { tool: 'kit-api', file: import.meta.url, usage: USAGE, val: ['bundle', 'grep', 'sig'], bool: ['tokens', 'geo', 'maths', 'humanities', 'physics', 'people', 'recipes'] });
const args = process.argv.slice(2);
const val = (k) => A.val(k.replace(/^--/, ''));
const grep = val('--grep');
const files = [];
const positional = A.pos;
function add(p) {
  // The tool prints import paths ("simulations/base/DomSimulation.js"); accept them back as input.
  if (!fs.existsSync(p) && /^simulations\//.test(p) && fs.existsSync(path.join(KIT_SIMS, p.slice('simulations/'.length)))) p = path.join(KIT_SIMS, p.slice('simulations/'.length));
  if (!fs.existsSync(p) || /\.(stub|design)\.md$/.test(p)) {
    // a scene named the way the other tools take it (L0N/Scene, Scene, .stub.md)
    const t = resolveTarget(p, bundleFromArg(A.val('bundle')));
    if (t && t.kind === 'scene') p = t.file;
    else { console.error(`no such module or scene: ${p}. Kit modules look like simulations/base/DomSimulation.js or simulations/base/kit/SimLook.js. ${describeMiss(p, bundleFromArg(A.val('bundle')))}`); process.exit(2); }
  }
  if (fs.statSync(p).isDirectory()) { for (const f of fs.readdirSync(p).sort()) if (f.endsWith('.js')) files.push(path.join(p, f)); }
  else files.push(path.resolve(p));
}
for (const p of positional) add(p);
if (val('--bundle')) {
  const B = bundleFromArg(val('--bundle'));
  (function walk(d) {
    if (!fs.existsSync(d)) return;
    for (const f of fs.readdirSync(d).sort()) {
      const p = path.join(d, f);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (f.endsWith('.js') && !['.stub.md', '.design.md'].some((x) => fs.existsSync(p.replace(/\.js$/, x)))) files.push(p);
    }
  })(path.join(B, 'simulations'));
}
if (!positional.length && !val('--bundle') && !A.has('maths') && !A.has('humanities') && !A.has('physics') && !A.has('people') && !A.has('recipes')) for (const f of ['SimScene.js', 'SimLook.js', 'SimLookDom.js', 'SimFigure.js']) files.push(path.join(KIT_SIMS, 'base', 'kit', f));
// --geo: the geography kit (GeoScene 3D, GeoTerrain, GeoMap 2D, GeoLook).
if (A.has('geo')) for (const f of ['GeoScene.js', 'GeoTerrain.js', 'GeoMap.js', 'GeoLook.js']) files.push(path.join(KIT_SIMS, 'base', 'kit', f));
// --maths / --humanities / --physics / --people: the shape components (only the files that exist).
// --people: persons by role, rows, crowds, seats, a bicycle, four-legged animals, animal icons.
const GROUPS = {
  maths: ['SimText.js', 'SimSvg.js', 'SimGeomSpec.js', 'SimGeomCanvas.js', 'SimPredict.js', 'SimChanceTrials.js', 'SimNumberLineSpec.js', 'SimNumberLineCanvas.js', 'SimChartSpec.js', 'SimChartCanvas.js', 'SimNumberLine.js', 'SimChart.js', 'SimGeom.js', 'SimChance.js', 'SimBalance.js', 'SimMorphSpec.js', 'SimMorphSvg.js', 'SimClock.js', 'SimFlySvg.js', 'SimFocusSvg.js', 'SimDrawOnSvg.js', 'SimVennSpec.js', 'SimVenn.js', 'TapLight.js', 'SimIsoSpec.js', 'SimIsoSvg.js', 'SimCameraSvg.js', 'SimStageSpec.js', 'SimStageSvg.js', 'SimPlotSvg.js', 'SimRigSvg.js'],
  recipes: ['SimAnim.js', 'SimFocus.js', 'SimDrawOn.js', 'SimCamera.js', 'SimMorph.js', 'SimPlot.js', 'SimIso.js', 'SimTour.js', 'SimStage.js', 'SimRig.js', 'SimVennCanvas.js', 'SimIsoSvg.js', 'SimCameraSvg.js', 'SimStageSvg.js', 'SimPlotSvg.js', 'SimRigSvg.js'],
  physics: ['SimProps.js', 'SimDrag.js', 'TapLight.js', 'SimNumberLineCanvas.js', 'SimChartCanvas.js'],
  people: ['SimFigure.js', 'SimProps.js', 'SimAnimal.js', 'SimIcons.js'],
  humanities: ['SimText.js', 'SimSvg.js', 'SimTimelineCanvas.js', 'SimPick.js', 'TapLight.js', 'SimTimeline.js', 'FlowBoard.js', 'AllocBoardScene.js', 'SimChart.js', 'SimBalance.js', 'SimIcons.js', 'SimFigure.js'],
};
for (const g of Object.keys(GROUPS)) if (A.has(g)) {
  for (const f of GROUPS[g]) { const p = path.join(KIT_SIMS, 'base', 'kit', f); if (fs.existsSync(p) && !files.includes(p)) files.push(p); }
}

function importPath(f) {
  if (f.startsWith(KIT_SIMS)) return 'simulations/' + path.relative(KIT_SIMS, f).split(path.sep).join('/');
  return rel(process.cwd(), f);
}

function importPathOf(f) {
  if (f.startsWith(KIT_SIMS)) return 'simulations/' + path.relative(KIT_SIMS, f).split(path.sep).join('/');
  return rel(process.cwd(), f);
}

// --tokens: the custom properties sim-theme.css declares (the closed palette). The generic set a DOM scene uses is the colour row of docs/dom-scene-kit.md.
if (A.has('tokens')) {
  const css = fs.readFileSync(path.join(KIT_SIMS, 'base', 'sim-theme.css'), 'utf8');
  const names = [...new Set([...css.matchAll(/(--sim-[a-z0-9-]+)\s*:/g)].map((m) => m[1]))].sort();
  console.log(`# simulations/base/sim-theme.css declares ${names.length} tokens (anything else is aliased by its last hyphen segment, silently)\n${names.join(' ')}`);
  process.exit(0);
}
// --sig <name>: find one export anywhere under the kit (or the bundle's helper modules) and print what a caller needs.
if (A.val('sig')) {
  const want = A.val('sig');
  const pool = [];
  const scan = (d) => { if (!fs.existsSync(d)) return; for (const f of fs.readdirSync(d).sort()) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) scan(p); else if (f.endsWith('.js')) pool.push(p); } };
  scan(path.join(KIT_SIMS, 'base'));
  if (A.val('bundle')) scan(path.join(bundleFromArg(A.val('bundle')), 'simulations'));
  for (const f of positional) if (fs.existsSync(f) && !pool.includes(path.resolve(f))) pool.push(path.resolve(f));
  const hits = [];
  for (const exact of [true, false]) {
    for (const f of pool) for (const e of moduleExports(f).exports) {
      if (exact ? e.name === want : e.name.toLowerCase() === want.toLowerCase()) hits.push({ f, e });
    }
    if (hits.length) break;
  }
  if (!hits.length) {
    const near = [];
    for (const f of pool) for (const e of moduleExports(f).exports) if (e.name.toLowerCase().includes(want.toLowerCase())) near.push(`${e.name} (${importPathOf(f)})`);
    const where = `searched ${path.relative(process.cwd(), path.join(KIT_SIMS, 'base')) || 'the kit'}${A.val('bundle') ? ` and ${path.relative(process.cwd(), path.join(bundleFromArg(A.val('bundle')), 'simulations')) || 'the bundle'} (incl. shared/)` : ' only; this bundle\'s helpers (shared/ ...) are NOT searched: add --bundle <b>'}`;
    console.error(`no export named "${want}" (${where}).${near.length ? ` Names containing it: ${near.slice(0, 8).join(', ')}` : ' Not an export? A base-class method (animateFor, after, repaint) is not listed here: see briefs/reference/scene-rules.md. Else try: node tools/sim-test/kit-find.mjs "<what you want to draw>"'}`);
    process.exit(2);
  }
  for (const { f, e } of hits) {
    console.log(`# ${importPathOf(f)}\n  ${e.sig}${e.doc ? '  - ' + e.doc : ''}`);
    const { ast } = parseFile(f);
    let fn = null;
    for (const n of ast.body) {
      const d = n.declaration || n;
      if (d.type === 'FunctionDeclaration' && d.id?.name === e.name) fn = d;
      if (d.type === 'VariableDeclaration') for (const v of d.declarations) if (v.id.name === e.name && /FunctionExpression|ArrowFunctionExpression/.test(v.init?.type || '')) fn = v.init;
    }
    if (fn) {
      const shapes = new Set();
      let other = false;
      const visit = (n) => {
        walk(n, (q) => {
          if (q !== n && /Function/.test(q.type) && q.type !== 'ObjectExpression') return false;
          if (q.type === 'ReturnStatement' && q.argument) {
            if (q.argument.type === 'ObjectExpression') shapes.add(`{ ${q.argument.properties.map((p) => (p.key ? (p.key.name ?? p.key.value) : '...')).join(', ')} }`);
            else other = true;
          }
          return true;
        });
      };
      if (fn.body.type === 'BlockStatement') visit(fn.body);
      else if (fn.body.type === 'ObjectExpression') shapes.add(`{ ${fn.body.properties.map((p) => (p.key ? (p.key.name ?? p.key.value) : '...')).join(', ')} }`);
      else other = true;
      if (shapes.size) console.log(`  returns ${[...shapes].join(' | ')}${other ? ' (or another value on some paths)' : ''}`);
      else console.log(`  returns ${other ? 'a computed value (no object literal: read the function body once)' : 'nothing'}`);
    }
    console.log(`  import { ${e.name} } from '${importPathOf(f)}';   list its module: node tools/sim-test/kit-api.mjs ${importPathOf(f)}`);
  }
  process.exit(0);
}

for (const f of files) {
  const { exports, error } = moduleExports(f);
  if (error) { console.log(`\n# ${importPath(f)}: does not parse (${error.message})`); continue; }
  const lines = [];
  for (const e of exports) {
    const line = `${e.sig}${e.doc ? '  - ' + e.doc : ''}`;
    if (!grep || line.toLowerCase().includes(grep.toLowerCase())) lines.push('  ' + line);
    if (e.kind === 'class') {
      const { src, ast } = parseFile(f);
      let cls = null;
      for (const n of ast.body) {
        const d = n.declaration || n;
        if (d.type === 'ClassDeclaration' && d.id?.name === e.name) cls = d;
      }
      cls = cls || firstClass(ast);
      for (const m of cls?.body.body || []) {
        if (!m.key || m.computed || m.key.type === 'PrivateIdentifier') continue;
        const name = m.key.name ?? m.key.value;
        if (name.startsWith('_') || name === 'constructor') continue;
        const sig = m.type === 'MethodDefinition'
          ? `${m.static ? 'static ' : ''}${m.kind === 'get' ? 'get ' : ''}${name}(${m.value.params.map((p) => src.slice(p.start, p.end)).join(', ')})`
          : `${m.static ? 'static ' : ''}${name}${m.value && m.value.end - m.value.start < 30 ? ' = ' + src.slice(m.value.start, m.value.end) : ''}`;
        const l = `    .${sig}`;
        if (!grep || l.toLowerCase().includes(grep.toLowerCase())) lines.push(l);
      }
    }
  }
  // A module whose API is CSS (SimUi's SIM_UI_CSS): list the class names and custom properties it defines, so a DOM
  // scene author does not grep or read the stylesheet string.
  try {
    const text = fs.readFileSync(f, 'utf8');
    if (/SIM_UI_CSS\s*=/.test(text)) {
      const classes = [...new Set([...text.matchAll(/\.(sim-[a-z0-9-]+)/g)].map((m) => m[1]))];
      const tokens = [...new Set([...text.matchAll(/(--sim-[a-z0-9-]+)\s*:/g)].map((m) => m[1]))];
      const add = (l) => { if (!grep || l.toLowerCase().includes(grep.toLowerCase())) lines.push(l); };
      add(`  CSS classes in SIM_UI_CSS (${classes.length}): ${classes.map((c) => '.' + c).join(' ')}`);
      add(`  CSS custom properties it declares (${tokens.length}): ${tokens.join(' ')}`);
    }
  } catch { /* not readable: skip */ }
  if (lines.length) { console.log(`\n# ${importPath(f)}`); console.log(lines.join('\n')); }
}
