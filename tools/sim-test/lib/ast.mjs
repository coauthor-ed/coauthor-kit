// Small AST helpers over the vendored acorn parser: parse a module, list a
// module's exports (with signatures), a class's members, and resolve an import
// specifier to a file the way the engine's import map / the sim-test loader do.
import fs from 'node:fs';
import path from 'node:path';
import { parse } from '../vendor/acorn/acorn.mjs';
import { KIT_SIMS } from './bundle.mjs';

export function parseModule(src) {
  return parse(src, { ecmaVersion: 'latest', sourceType: 'module', locations: true, allowHashBang: true });
}

const astCache = new Map();
export function parseFile(file) {
  if (astCache.has(file)) return astCache.get(file);
  let r;
  try { const src = fs.readFileSync(file, 'utf8'); r = { src, ast: parseModule(src) }; } catch (e) { r = { error: e }; }
  astCache.set(file, r);
  return r;
}

export function resolveSpec(spec, fromFile) {
  if (spec.startsWith('simulations/')) return path.join(KIT_SIMS, spec.slice('simulations/'.length));
  if (spec.startsWith('.')) return path.resolve(path.dirname(fromFile), spec);
  return null;
}

// Visit every node (generic; children are object-valued fields with a .type).
export function walk(node, fn, parent = null) {
  if (!node || typeof node.type !== 'string') return;
  if (fn(node, parent) === false) return;
  for (const k of Object.keys(node)) {
    if (k === 'loc' || k === 'start' || k === 'end') continue;
    const v = node[k];
    if (Array.isArray(v)) { for (const c of v) if (c && typeof c.type === 'string') walk(c, fn, node); }
    else if (v && typeof v.type === 'string') walk(v, fn, node);
  }
}

function paramText(src, params) {
  return params.map((p) => src.slice(p.start, p.end).replace(/\s+/g, ' ')).join(', ');
}

// Leading line/block comment directly above a node: its first sentence.
function leadComment(src, start) {
  const before = src.slice(0, start).replace(/[ \t]*$/, '');
  const lines = before.split('\n');
  const out = [];
  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i].trim();
    if (l === '' && out.length === 0 && i === lines.length - 1) continue;
    if (/^\/\//.test(l)) { out.unshift(l.replace(/^\/\/\s?/, '')); continue; }
    if (/\*\/$/.test(l)) {
      let j = i; const blk = [];
      while (j >= 0) { blk.unshift(lines[j]); if (/\/\*/.test(lines[j])) break; j--; }
      out.unshift(...blk.map((x) => x.replace(/^\s*\/?\*+\/?\s?/, '').replace(/\*\/\s*$/, '').trim()).filter(Boolean));
    }
    break;
  }
  // An '@opts a, b, c' line lists the option keys; it is always printed in full.
  const opts = out.filter((l) => /^@opts\b/.test(l)).map((l) => l.replace(/^@opts\s*/, '')).join(', ');
  const text = out.filter((l) => !/^@opts\b/.test(l)).join(' ').replace(/\s+/g, ' ').trim();
  const tail = opts ? ` [opts: ${opts}]` : '';
  if (text.length <= 140) return text + tail;
  const cut = text.slice(0, 140);
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('; '));
  return (end > 60 ? cut.slice(0, end + 1) : cut.slice(0, 137) + '...') + tail;
}

// [{ name, kind: function|class|const|let|default|reexport, sig, doc }]
export function moduleExports(file) {
  const { src, ast, error } = parseFile(file);
  if (error) return { error, exports: [] };
  const out = [];
  let star = false;
  const add = (name, kind, sig, node) => out.push({ name, kind, sig, doc: leadComment(src, node.start) });
  for (const n of ast.body) {
    if (n.type === 'ExportNamedDeclaration') {
      const d = n.declaration;
      if (d?.type === 'FunctionDeclaration') add(d.id.name, 'function', `${d.id.name}(${paramText(src, d.params)})`, n);
      else if (d?.type === 'ClassDeclaration') add(d.id.name, 'class', `class ${d.id.name}${d.superClass ? ' extends ' + src.slice(d.superClass.start, d.superClass.end) : ''}`, n);
      else if (d?.type === 'VariableDeclaration') {
        for (const v of d.declarations) {
          if (v.id.type !== 'Identifier') continue;
          const init = v.init;
          let sig = v.id.name;
          if (init && /FunctionExpression|ArrowFunctionExpression/.test(init.type)) sig = `${v.id.name}(${paramText(src, init.params)})`;
          else if (init?.type === 'ObjectExpression') {
            // Small objects (ZONES) print in full, values included; bigger ones (COLOR_TOKEN_MAP) print ALL keys:
            // agents grep the source for the missing ones otherwise.
            const whole = src.slice(init.start, init.end).replace(/\s+/g, ' ');
            sig = whole.length <= 420 ? `${v.id.name} = ${whole}`
              : `${v.id.name} = { ${init.properties.slice(0, 40).map((p) => (p.key ? src.slice(p.key.start, p.key.end) : '...')).join(', ')}${init.properties.length > 40 ? ', ...' : ''} }`;
          }
          else if (init && init.end - init.start < 40) sig = `${v.id.name} = ${src.slice(init.start, init.end)}`;
          add(v.id.name, d.kind, sig, n);
        }
      }
      for (const s of n.specifiers || []) add(s.exported.name ?? s.exported.value, n.source ? 'reexport' : 'alias', s.exported.name ?? s.exported.value, n);
    } else if (n.type === 'ExportDefaultDeclaration') add('default', 'default', 'default', n);
    else if (n.type === 'ExportAllDeclaration') star = true;
  }
  return { exports: out, star };
}

// Members a class defines, plus every `this.x =` it assigns.
export function classMembers(classNode) {
  const methods = new Map(); // name -> [{ kind, static, line }]
  const fields = new Map();
  const assigned = new Set();
  for (const m of classNode.body.body) {
    if (!m.key || m.computed) continue;
    const name = m.key.name ?? m.key.value;
    if (m.key.type === 'PrivateIdentifier') continue;
    const rec = { kind: m.kind || 'field', static: !!m.static, line: m.loc.start.line };
    const map = m.type === 'MethodDefinition' ? methods : fields;
    if (!map.has(name)) map.set(name, []);
    map.get(name).push(rec);
  }
  walk(classNode.body, (n) => {
    if (n.type === 'AssignmentExpression' && n.left.type === 'MemberExpression' && n.left.object.type === 'ThisExpression' && !n.left.computed) {
      assigned.add(n.left.property.name);
    }
  });
  return { methods, fields, assigned };
}

export function firstClass(ast) {
  let found = null;
  walk(ast, (n) => { if (!found && (n.type === 'ClassDeclaration' || n.type === 'ClassExpression')) { found = n; return false; } return true; });
  return found;
}

// The class expression a mixin function returns, following re-exports (export { x } from / export * from / import then export).
function findMixin(file, name, depth) {
  if (!file || depth > 4 || !fs.existsSync(file)) return null;
  const r = parseFile(file);
  if (r.error) return null;
  let cls = null;
  walk(r.ast, (n) => {
    if (!cls && n.type === 'FunctionDeclaration' && n.id?.name === name) {
      walk(n.body, (q) => { if (!cls && q.type === 'ClassExpression') { cls = q; return false; } return true; });
      return false;
    }
    return !cls;
  });
  if (cls) return { file, cls };
  for (const n of r.ast.body) {
    if (n.type === 'ExportNamedDeclaration') {
      for (const sp of n.specifiers || []) {
        if ((sp.exported.name ?? sp.exported.value) !== name) continue;
        const local = sp.local.name ?? sp.local.value;
        if (n.source) { const f = findMixin(resolveSpec(n.source.value, file), local, depth + 1); if (f) return f; }
        else {
          const imp = r.ast.body.find((i) => i.type === 'ImportDeclaration' && i.specifiers.some((x) => x.local.name === local));
          if (imp) { const f = findMixin(resolveSpec(imp.source.value, file), imp.specifiers.find((x) => x.local.name === local).imported?.name ?? local, depth + 1); if (f) return f; }
        }
      }
    } else if (n.type === 'ExportAllDeclaration' && n.source) {
      const f = findMixin(resolveSpec(n.source.value, file), name, depth + 1);
      if (f) return f;
    }
  }
  return null;
}

// Names available on `this` from a class's ancestors, by parsing their files.
// Returns { names: Set, complete: bool }.
export function inheritedNames(file, classNode, ast) {
  const names = new Set();
  const kitNames = new Set();   // the subset declared by kit base classes (not a bundle helper)
  const inKit = (f) => !!f && f.startsWith(KIT_SIMS);
  let complete = true;
  const seen = new Set();
  let curFile = file, curAst = ast, cls = classNode;
  while (cls && cls.superClass) {
    let sup = cls.superClass;
    // A mixin call, e.g. `extends withChallenge(DomSimulation)`: take the members
    // of the class the mixin function returns, then follow its argument.
    if (sup.type === 'CallExpression' && sup.callee.type === 'Identifier' && sup.arguments[0]?.type === 'Identifier') {
      const imp = curAst.body.find((n) => n.type === 'ImportDeclaration' && n.specifiers.some((x) => x.local.name === sup.callee.name));
      const found = imp ? findMixin(resolveSpec(imp.source.value, curFile), imp.specifiers.find((x) => x.local.name === sup.callee.name).imported?.name ?? sup.callee.name, 0) : null;
      const mf = found?.file, mc = found?.cls || null;
      if (!mc) { complete = false; break; }
      const mm = classMembers(mc);
      for (const k of [...mm.methods.keys(), ...mm.fields.keys(), ...mm.assigned]) { names.add(k); if (inKit(mf)) kitNames.add(k); }
      sup = sup.arguments[0];
    }
    if (sup.type !== 'Identifier') { complete = false; break; }
    const parent = sup.name;
    const imp = curAst.body.find((n) => n.type === 'ImportDeclaration' && n.specifiers.some((s) => s.local.name === parent));
    let nextFile = null;
    if (imp) nextFile = resolveSpec(imp.source.value, curFile);
    else nextFile = curFile;
    if (!nextFile || !fs.existsSync(nextFile) || seen.has(nextFile + parent)) { complete = false; break; }
    seen.add(nextFile + parent);
    const r = parseFile(nextFile);
    if (r.error) { complete = false; break; }
    let pc = null;
    const importedName = imp ? imp.specifiers.find((s) => s.local.name === parent)?.imported?.name ?? parent : parent;
    walk(r.ast, (n) => { if (!pc && (n.type === 'ClassDeclaration') && n.id?.name === importedName) { pc = n; return false; } return true; });
    if (!pc) { complete = false; break; }
    const m = classMembers(pc);
    for (const k of [...m.methods.keys(), ...m.fields.keys(), ...m.assigned]) { names.add(k); if (inKit(nextFile)) kitNames.add(k); }
    curFile = nextFile; curAst = r.ast; cls = pc;
  }
  return { names, kitNames, complete };
}
