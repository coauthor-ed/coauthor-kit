#!/usr/bin/env node
// ident-lint - the name mistakes `node --check` lets through and a scene only
// shows (or hides) at run time. Static, instant, no browser.
//
//   node tools/sim-test/ident-lint.mjs <file.js | dir> [...] [--quiet]
//
// ERROR  parse            not a valid ES module (also: a backtick inside a template string)
// ERROR  undefined        a name used but never declared, imported or global
//                          (the message suggests the kit/sibling module that exports it)
// ERROR  const-assign     assigning to a const or an import
// ERROR  bad-import       importing a name the target module does not export, or a
//                          module file that does not exist
// ERROR  dup-member       a class declares the same method/field twice (the last wins silently)
// ERROR  member-clash     a field (or this.x = ...) with the same name as a method
// ERROR  no-method        this.x(...) where neither the class nor its ancestors define x
//                          (WARN when an ancestor file could not be read)
// WARN   unused-import    an import never used
// WARN   unbounded-loop   for(;;) / while(true): add a counted bound (a hang in check tools is silent)
// Exit 1 on any ERROR.
import fs from 'node:fs';
import path from 'node:path';
import { parseModule, walk, moduleExports, classMembers, inheritedNames, resolveSpec } from './lib/ast.mjs';
import { KIT_SIMS, expandTargets, bundleFromArg, baseChain } from './lib/bundle.mjs';
import { parseArgs } from './lib/args.mjs';

const GLOBALS = new Set([
  ...Object.getOwnPropertyNames(globalThis),
  'window', 'document', 'navigator', 'location', 'history', 'screen', 'localStorage', 'sessionStorage',
  'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback', 'cancelIdleCallback',
  'getComputedStyle', 'matchMedia', 'devicePixelRatio', 'innerWidth', 'innerHeight', 'getSelection', 'alert',
  'ResizeObserver', 'IntersectionObserver', 'MutationObserver', 'CustomEvent', 'PointerEvent', 'MouseEvent',
  'KeyboardEvent', 'TouchEvent', 'FocusEvent', 'InputEvent', 'WheelEvent', 'HTMLElement', 'HTMLCanvasElement',
  'HTMLInputElement', 'HTMLButtonElement', 'HTMLSelectElement', 'Element', 'Node', 'NodeList', 'SVGElement',
  'customElements', 'Image', 'ImageData', 'Path2D', 'DOMMatrix', 'DOMPoint', 'DOMRect', 'OffscreenCanvas',
  'CanvasRenderingContext2D', 'WebGLRenderingContext', 'WebGL2RenderingContext', 'DOMParser', 'CSS',
  'FileReader', 'Audio', 'AudioContext', 'speechSynthesis', 'SpeechSynthesisUtterance', 'FontFace',
  'arguments', 'undefined', 'NaN', 'Infinity', 'globalThis',
]);

// Set on the scene by the host (content-block / preview harness), not by a base class.
const HOST_PROVIDED = new Set(['requestUiUpdate']);

/** Abstract subclass hooks a base class declares but does not define. Two sources, both visible to a reader:
 *  1. the doc comment directly above the class: names after a "Subclass hooks" heading line, or an
 *     "@abstract a, b" tag (an entry like pointerDown/Move/Up(p) expands to pointerDown, pointerMove,
 *     pointerUp: the later parts reuse the lowercase stem of the first);
 *  2. a call guarded in the class body: typeof this.x === 'function' (or !== 'undefined'), 'x' in this. */
function abstractHooks(lines, classNode) {
  const names = new Set();
  let i = classNode.loc.start.line - 2;                 // line above the class (0-based index)
  while (i >= 0 && /^\s*(export\s*)?$/.test(lines[i])) i--;
  const end = i;
  if (end < 0 || !/\*\/\s*$/.test(lines[end])) return names;
  while (i >= 0 && !/\/\*/.test(lines[i])) i--;
  let inHooks = false;
  for (const raw of lines.slice(Math.max(i, 0), end + 1)) {
    const line = raw.replace(/^\s*(\/\*+|\*\/|\*)\s?/, '');
    const tag = line.match(/@abstract\s+(.*)$/);
    if (tag) for (const w of tag[1].split(/[\s,]+/)) if (/^[A-Za-z_$][\w$]*$/.test(w)) names.add(w);
    if (/subclass hooks/i.test(line)) { inHooks = true; continue; }
    if (!inHooks) continue;
    if (!line.trim()) { inHooks = false; continue; }
    const m = line.match(/^\s*([A-Za-z_$][\w$]*(?:\/[A-Za-z_$][\w$]*)*)\s*(?:\(|\s{2,}|$)/);
    if (!m) continue;
    const parts = m[1].split('/');
    const stem = parts[0].match(/^[a-z]+/)?.[0] ?? '';
    names.add(parts[0]);
    for (const w of parts.slice(1)) names.add(stem + w);
  }
  return names;
}
function guardedHooks(classNode) {
  const names = new Set();
  walk(classNode.body, (x) => {
    if (x.type === 'UnaryExpression' && x.operator === 'typeof' && x.argument.type === 'MemberExpression' && x.argument.object.type === 'ThisExpression' && !x.argument.computed) names.add(x.argument.property.name);
    if (x.type === 'BinaryExpression' && x.operator === 'in' && x.left.type === 'Literal' && x.right.type === 'ThisExpression') names.add(String(x.left.value));
    if (x.type === 'CallExpression' && x.optional && x.callee.type === 'MemberExpression' && x.callee.object.type === 'ThisExpression' && !x.callee.computed) names.add(x.callee.property.name);
    return true;
  });
  return names;
}
// Supplied by the withChallenge(...) mixin (or the host it mounts in), wherever in the chain it sits.
const CHALLENGE_PROVIDED = new Set(['requestCheck', 'resetChallenge', 'evaluate']);

const USAGE = 'node tools/sim-test/ident-lint.mjs <file.js | L0N/Scene | Scene | dir> [...] [--bundle <id|dir>] [--quiet]';
const A = parseArgs(process.argv.slice(2), { tool: 'ident-lint', file: import.meta.url, usage: USAGE, val: ['bundle'], bool: ['quiet'] });
const quiet = A.has('quiet');
const targets = expandTargets(A.pos, bundleFromArg(A.val('bundle')));
if (!targets.length) { console.error(`usage: ${USAGE}`); process.exit(2); }

function collect(t, out) {
  if (!fs.existsSync(t)) { console.error(`no such file: ${t}`); process.exit(2); }
  const st = fs.statSync(t);
  if (st.isFile()) { if (/\.m?js$/.test(t)) out.push(path.resolve(t)); return out; }
  for (const f of fs.readdirSync(t).sort()) {
    if (f === 'node_modules' || f === 'vendor') continue;
    collect(path.join(t, f), out);
  }
  return out;
}

// Export index for suggestions: kit modules plus the file's own folder and shared/.
const exportIdx = new Map();
function indexExports(file) {
  if (exportIdx.has(file)) return exportIdx.get(file);
  const r = moduleExports(file);
  const names = new Set(r.exports.map((e) => e.name));
  const v = { names, star: r.star, error: r.error };
  exportIdx.set(file, v);
  return v;
}
function suggest(name, file) {
  const dirs = [path.join(KIT_SIMS, 'base', 'kit'), path.join(KIT_SIMS, 'base'), path.dirname(file), path.join(path.dirname(file), '..', 'shared')];
  for (const d of dirs) {
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d)) {
      if (!f.endsWith('.js') || path.join(d, f) === file) continue;
      if (indexExports(path.join(d, f)).names.has(name)) {
        const p = path.join(d, f);
        return p.startsWith(KIT_SIMS) ? `simulations/${path.relative(KIT_SIMS, p).split(path.sep).join('/')}` : `./${path.relative(path.dirname(file), p).split(path.sep).join('/')}`;
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------- scopes
class Scope {
  constructor(parent, isFunction) { this.parent = parent; this.isFunction = isFunction; this.vars = new Map(); }
  declare(name, kind, node) { if (!this.vars.has(name)) this.vars.set(name, { kind, node, used: false }); }
  lookup(name) { for (let s = this; s; s = s.parent) if (s.vars.has(name)) return s.vars.get(name); return null; }
  fn() { let s = this; while (!s.isFunction) s = s.parent; return s; }
}

function patternNames(p, out = []) {
  if (!p) return out;
  if (p.type === 'Identifier') out.push(p);
  else if (p.type === 'ObjectPattern') for (const q of p.properties) patternNames(q.type === 'RestElement' ? q.argument : q.value, out);
  else if (p.type === 'ArrayPattern') for (const q of p.elements) patternNames(q, out);
  else if (p.type === 'RestElement') patternNames(p.argument, out);
  else if (p.type === 'AssignmentPattern') patternNames(p.left, out);
  return out;
}

// Hoist declarations of a statement list into scope (var/function into the function scope).
function hoist(stmts, scope) {
  for (const s of stmts) declareStmt(s, scope);
  // var declarations anywhere below (not inside nested functions)
  for (const s of stmts) walk(s, (n) => {
    if (/Function/.test(n.type) || n.type === 'ClassBody') return false;
    if (n.type === 'VariableDeclaration' && n.kind === 'var') for (const d of n.declarations) for (const id of patternNames(d.id)) scope.fn().declare(id.name, 'var', id);
    return true;
  });
}
function declareStmt(s, scope) {
  const d = s.type === 'ExportNamedDeclaration' || s.type === 'ExportDefaultDeclaration' ? s.declaration : s;
  if (!d) return;
  if (d.type === 'VariableDeclaration' && d.kind !== 'var') for (const x of d.declarations) for (const id of patternNames(x.id)) scope.declare(id.name, d.kind, id);
  if (d.type === 'FunctionDeclaration' && d.id) scope.declare(d.id.name, 'function', d.id);
  if (d.type === 'ClassDeclaration' && d.id) scope.declare(d.id.name, 'class', d.id);
  if (s.type === 'ImportDeclaration') for (const sp of s.specifiers) scope.declare(sp.local.name, 'import', sp.local);
}

function lintFile(file) {
  const src = fs.readFileSync(file, 'utf8');
  const out = [];
  const E = (kind, line, msg) => out.push({ level: 'ERROR', kind, line, msg });
  const Wn = (kind, line, msg) => out.push({ level: 'WARN', kind, line, msg });
  let ast;
  try { ast = parseModule(src); } catch (e) { E('parse', e.loc?.line ?? 0, e.message); return out; }

  const root = new Scope(null, true);
  hoist(ast.body, root);

  // imports: target exists and exports the name
  for (const n of ast.body) {
    if (n.type !== 'ImportDeclaration') continue;
    const target = resolveSpec(n.source.value, file);
    if (!target) continue;
    if (!fs.existsSync(target)) { E('bad-import', n.loc.start.line, `module not found: '${n.source.value}'`); continue; }
    const ex = indexExports(target);
    if (ex.error || ex.star) continue;
    for (const sp of n.specifiers) {
      if (sp.type !== 'ImportSpecifier') continue;
      const nm = sp.imported.name ?? sp.imported.value;
      if (!ex.names.has(nm)) E('bad-import', n.loc.start.line, `'${nm}' is not exported by '${n.source.value}'${suggest(nm, file) ? ` (it is in '${suggest(nm, file)}')` : ''}`);
    }
  }

  const reported = new Set();
  function ref(id, scope, parent) {
    const v = scope.lookup(id.name);
    if (v) { v.used = true; return v; }
    if (GLOBALS.has(id.name)) return null;
    if (parent?.type === 'UnaryExpression' && parent.operator === 'typeof') return null;
    const key = id.name + ':' + id.loc.start.line;
    if (reported.has(key)) return null;
    reported.add(key);
    const s = suggest(id.name, file);
    E('undefined', id.loc.start.line, `'${id.name}' is not defined${s ? ` - import it from '${s}'` : ''}`);
    return null;
  }

  function assignTarget(p, scope) {
    for (const id of patternNames(p)) {
      const v = ref(id, scope, null);
      if (v && (v.kind === 'const' || v.kind === 'import')) E('const-assign', id.loc.start.line, `assignment to ${v.kind === 'import' ? 'imported binding' : 'const'} '${id.name}'`);
    }
    // member targets: visit their object expressions
    walk(p, (n) => { if (n.type === 'MemberExpression') { visit(n, scope, null); return false; } return true; });
  }

  function fnScope(node, scope) {
    const s = new Scope(scope, true);
    if (node.type === 'FunctionExpression' && node.id) s.declare(node.id.name, 'fname', node.id);
    for (const p of node.params) for (const id of patternNames(p)) s.declare(id.name, 'param', id);
    for (const p of node.params) walk(p, (n) => {
      if (n.type === 'AssignmentPattern') { visit(n.right, s, n); return false; }
      if (n.type === 'Property' && n.computed) { visit(n.key, s, n); }
      return true;
    });
    if (node.body.type === 'BlockStatement') { hoist(node.body.body, s); for (const st of node.body.body) visit(st, s, node.body); }
    else visit(node.body, s, node);
  }

  function visit(n, scope, parent) {
    if (!n) return;
    if ((n.type === 'ForStatement' && !n.test) || ((n.type === 'WhileStatement' || n.type === 'DoWhileStatement') && n.test?.type === 'Literal' && n.test.value)) {
      Wn('unbounded-loop', n.loc?.start.line, 'for(;;) / while(true): a loop whose exit never fires hangs every check tool silently. Use a counted bound, e.g. for (let k = 0; k < 1000; k++) and stop on the condition.');
    }
    switch (n.type) {
      case 'Identifier': ref(n, scope, parent); return;
      case 'ImportDeclaration': return;
      case 'ExportNamedDeclaration':
        if (n.declaration) visit(n.declaration, scope, n);
        else if (!n.source) for (const sp of n.specifiers) ref(sp.local, scope, n);
        return;
      case 'ExportDefaultDeclaration': visit(n.declaration, scope, n); return;
      case 'ExportAllDeclaration': return;
      case 'VariableDeclaration':
        for (const d of n.declarations) {
          if (n.kind === 'var') { /* hoisted */ }
          if (n.kind !== 'var') for (const id of patternNames(d.id)) if (!scope.vars.has(id.name)) scope.declare(id.name, n.kind, id);
          walk(d.id, (x) => { if (x.type === 'AssignmentPattern') { visit(x.right, scope, x); return false; } if (x.type === 'Property' && x.computed) visit(x.key, scope, x); return true; });
          visit(d.init, scope, d);
        }
        return;
      case 'FunctionDeclaration': case 'FunctionExpression': case 'ArrowFunctionExpression': fnScope(n, scope); return;
      case 'ClassDeclaration': case 'ClassExpression': {
        const s = new Scope(scope, false);
        if (n.id) s.declare(n.id.name, 'class', n.id);
        if (n.superClass) visit(n.superClass, scope, n);
        for (const m of n.body.body) {
          if (m.computed) visit(m.key, s, m);
          if (m.type === 'MethodDefinition') fnScope(m.value, s);
          else if (m.type === 'PropertyDefinition' && m.value) visit(m.value, new Scope(s, true), m);
          else if (m.type === 'StaticBlock') { const b = new Scope(s, true); hoist(m.body, b); for (const st of m.body) visit(st, b, m); }
        }
        return;
      }
      case 'BlockStatement': case 'StaticBlock': { const s = new Scope(scope, false); hoist(n.body, s); for (const st of n.body) visit(st, s, n); return; }
      case 'ForStatement': case 'ForInStatement': case 'ForOfStatement': {
        const s = new Scope(scope, false);
        const init = n.init || n.left;
        if (init?.type === 'VariableDeclaration') visit(init, s, n); else if (init) (n.type === 'ForStatement' ? visit(init, s, n) : assignTarget(init, s));
        visit(n.test, s, n); visit(n.update, s, n); visit(n.right, s, n); visit(n.body, s, n);
        return;
      }
      case 'CatchClause': { const s = new Scope(scope, false); for (const id of patternNames(n.param)) s.declare(id.name, 'let', id); visit(n.body, s, n); return; }
      case 'SwitchStatement': { visit(n.discriminant, scope, n); const s = new Scope(scope, false); for (const c of n.cases) hoist(c.consequent, s); for (const c of n.cases) { visit(c.test, s, c); for (const st of c.consequent) visit(st, s, c); } return; }
      case 'AssignmentExpression': assignTarget(n.left, scope); visit(n.right, scope, n); return;
      case 'UpdateExpression': if (n.argument.type === 'Identifier') assignTarget(n.argument, scope); else visit(n.argument, scope, n); return;
      case 'MemberExpression': visit(n.object, scope, n); if (n.computed) visit(n.property, scope, n); return;
      case 'Property': if (n.computed) visit(n.key, scope, n); visit(n.value, scope, n); return;
      case 'LabeledStatement': visit(n.body, scope, n); return;
      case 'BreakStatement': case 'ContinueStatement': return;
      case 'MetaProperty': return;
      case 'PrivateIdentifier': return;
      default:
        for (const k of Object.keys(n)) {
          if (k === 'loc' || k === 'type' || k === 'start' || k === 'end') continue;
          const v = n[k];
          if (Array.isArray(v)) { for (const c of v) if (c && typeof c.type === 'string') visit(c, scope, n); }
          else if (v && typeof v.type === 'string') visit(v, scope, n);
        }
    }
  }
  for (const st of ast.body) visit(st, root, ast);

  for (const [name, v] of root.vars) if (v.kind === 'import' && !v.used) Wn('unused-import', v.node.loc.start.line, `'${name}' is imported but never used`);

  // classes: duplicate members, field/method clash, this.x() with no x
  walk(ast, (n) => {
    if (n.type !== 'ClassDeclaration' && n.type !== 'ClassExpression') return true;
    const { methods, fields, assigned } = classMembers(n);
    for (const [name, recs] of methods) {
      for (const stat of [false, true]) {
        const rs = recs.filter((r) => r.static === stat);
        const kinds = rs.map((r) => r.kind);
        const plain = kinds.filter((k) => k === 'method' || k === 'constructor').length;
        if (plain > 1 || kinds.filter((k) => k === 'get').length > 1 || kinds.filter((k) => k === 'set').length > 1 || (plain && rs.length > plain)) {
          E('dup-member', rs[rs.length - 1].line, `${stat ? 'static ' : ''}${name}() is declared ${rs.length} times (lines ${rs.map((r) => r.line).join(', ')}) - the last one wins silently`);
        }
      }
    }
    for (const [name, recs] of fields) {
      const inst = recs.filter((r) => !r.static);
      const stat = recs.filter((r) => r.static);
      for (const rs of [inst, stat]) if (rs.length > 1) E('dup-member', rs[1].line, `field ${name} is declared ${rs.length} times`);
      const m = methods.get(name)?.filter((r) => r.kind === 'method');
      if (m?.some((r) => inst.length ? !r.static : r.static)) E('member-clash', recs[0].line, `field ${name} has the same name as a method - one overwrites the other`);
    }
    for (const name of assigned) {
      const m = methods.get(name)?.filter((r) => !r.static && (r.kind === 'method'));
      if (m?.length) E('member-clash', m[0].line, `this.${name} = ... overwrites the method ${name}() - rename the field`);
    }
    const inh = inheritedNames(file, n, ast);
    const own = new Set([...methods.keys(), ...fields.keys(), ...assigned]);
    const seenCall = new Set();
    const hooks = new Set([...abstractHooks(src.split('\n'), n), ...guardedHooks(n)]);
    const challenge = baseChain(file).includes('ChallengeScene') || /withChallenge\s*\(/.test(src);
    walk(n.body, (x) => {
      if (x.type === 'CallExpression' && x.callee.type === 'MemberExpression' && x.callee.object.type === 'ThisExpression' && !x.callee.computed && !x.callee.optional && !x.optional) {
        const nm = x.callee.property.name;
        if (!nm || own.has(nm) || inh.names.has(nm) || HOST_PROVIDED.has(nm) || hooks.has(nm) || (challenge && CHALLENGE_PROVIDED.has(nm)) || seenCall.has(nm)) return true;
        seenCall.add(nm);
        (inh.complete ? E : Wn)('no-method', x.loc.start.line, `this.${nm}() - no method ${nm} in this class${inh.complete ? ' or its base classes' : ' (base classes not fully readable)'}`);
      }
      return !(x.type === 'ClassDeclaration' || x.type === 'ClassExpression');
    });
    return true;
  });
  return out.sort((a, b) => a.line - b.line);
}

let errors = 0, warns = 0;
const files = targets.flatMap((t) => collect(t, []));
for (const f of files) {
  const res = lintFile(f);
  const e = res.filter((r) => r.level === 'ERROR').length;
  errors += e; warns += res.length - e;
  if (!res.length) { if (!quiet) console.log(`ok   ${path.relative(process.cwd(), f)}`); continue; }
  console.log(`${e ? 'FAIL' : 'warn'} ${path.relative(process.cwd(), f)}`);
  for (const r of res) console.log(`  ${r.level} ${r.kind} line ${r.line}: ${r.msg}`);
}
console.log(`${errors ? 'FAIL' : 'PASS'} - ${files.length} file(s), ${errors} error(s), ${warns} warning(s)`);
process.exit(errors ? 1 : 0);
