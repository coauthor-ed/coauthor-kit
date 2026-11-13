// Scene reuse index: automatic quality filter over every bundle + examples, snapshots under .cache/scenes/.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { KIT_ROOT, attachersOf } from '../../sim-test/lib/bundle.mjs';

export const cacheDir = (root) => path.join(root, '.cache', 'scenes');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex').slice(0, 8);

export function readExclusions(root) {
  try { return fs.readFileSync(path.join(root, 'reuse-exclude.txt'), 'utf8').split('\n').map((l) => l.replace(/#.*/, '').trim()).filter(Boolean); } catch { return []; }
}
const excluded = (ex, bundle, lesson, scene, moduleIds) => ex.some((r) => r === `${bundle}/${scene}` || r === `${bundle}/${lesson}` || (moduleIds && moduleIds.includes(r.replace(`${bundle}/`, '')) && r.startsWith(bundle + '/')));

function bundleDirs(root) {
  const out = [];
  const c = path.join(root, 'courses');
  if (fs.existsSync(c)) for (const d of fs.readdirSync(c)) if (fs.existsSync(path.join(c, d, 'simulations'))) out.push({ name: d, dir: path.join(c, d) });
  const ex = path.join(root, 'examples');
  if (fs.existsSync(ex)) {
    if (fs.existsSync(path.join(ex, 'simulations'))) out.push({ name: 'examples', dir: ex, flat: true });
    for (const d of fs.readdirSync(ex)) if (fs.existsSync(path.join(ex, d, 'simulations'))) out.push({ name: `examples/${d}`, dir: path.join(ex, d) });
  }
  return out;
}

function evaluate(root, b, file, lesson, ex, opts) {
  const scene = path.basename(file, '.js');
  const src = fs.readFileSync(file);
  const design = file.replace(/\.js$/, '.design.md');
  const dtxt = fs.existsSync(design) ? fs.readFileSync(design, 'utf8') : null;
  const why = [];
  const status = dtxt ? (/^Status:\s*(\S+)/m.exec(dtxt) || [])[1] : null;
  if (dtxt && status !== 'done') why.push(`status ${status}`);
  if (!dtxt && !b.name.startsWith('examples')) why.push('no design note');
  if (!/CONTINUOUS\s*=/.test(src.toString())) why.push('CONTINUOUS not declared');
  if (src.length < 400 || /\.stub\./.test(file)) why.push('stub');
  if (excluded(ex, b.name, lesson, scene)) why.push('excluded by reuse-exclude.txt');
  if (!why.length && opts.lint) {
    const r = spawnSync(process.execPath, [path.join(KIT_ROOT, 'tools', 'sim-test', 'ident-lint.mjs'), file, '--quiet'], { encoding: 'utf8' });
    if (r.status) why.push('ident-lint fails');
  }
  return { scene, src, dtxt, why, status };
}

export function buildIndex(root, opts = {}) {
  const ex = readExclusions(root);
  const entries = [], skipped = [];
  const store = path.join(cacheDir(root), 'store'); fs.mkdirSync(store, { recursive: true });
  for (const b of bundleDirs(root)) {
    const sims = path.join(b.dir, 'simulations');
    const lessons = b.flat ? [''] : fs.readdirSync(sims).filter((d) => fs.statSync(path.join(sims, d)).isDirectory() && d !== 'shared');
    let meta = {}; try { meta = JSON.parse(fs.readFileSync(path.join(b.dir, 'bundle.json'), 'utf8')); } catch { /* none */ }
    for (const lesson of lessons) {
      const dir = path.join(sims, lesson);
      for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js'))) {
        const file = path.join(dir, f);
        const e = evaluate(root, b, file, lesson, ex, opts);
        const ref = `${b.name}/${e.scene}`;
        if (e.why.length) { skipped.push({ ref, why: e.why.join('; ') }); continue; }
        const hash = sha(e.src);
        fs.writeFileSync(path.join(store, `${hash}.js`), e.src);
        const helpers = [...e.src.toString().matchAll(/from\s+['"](\.[^'"]*)['"]/g)].map((m) => m[1]).filter((p) => /shared/.test(p)).map((p) => {
          const hf = path.resolve(dir, p); if (!fs.existsSync(hf)) return null;
          const hb = fs.readFileSync(hf); const hh = sha(hb); fs.writeFileSync(path.join(store, `${hh}.js`), hb);
          return { rel: p, name: path.basename(hf), hash: hh };
        }).filter(Boolean);
        const base = ((e.dtxt && /^Base class:\s*(.+)$/m.exec(e.dtxt)) || [])[1] || (/extends\s+(\w+)/.exec(e.src.toString()) || [])[1] || '';
        const title = (e.dtxt && /^#\s*(.+?)\s*-\s*design note/m.exec(e.dtxt)?.[1]) || e.scene.replace(/Scene$/, '').replace(/([a-z])([A-Z])/g, '$1 $2');
        let approved = false;
        try { approved = attachersOf(b.dir, file).some((a) => { try { return JSON.parse(fs.readFileSync(a.path, 'utf8')).authoring?.status === 'human-approved'; } catch { return false; } }); } catch { /* none */ }
        const controls = (() => { const stub = file.replace(/\.js$/, '.stub.md'); try { return (/^(?:- )?Dials?:[ \t]*(.*)$/mi.exec(fs.readFileSync(stub, 'utf8')) || [])[1] || ''; } catch { return ''; } })();
        entries.push({
          id: `${ref}@${hash}`, bundle: b.name, lesson, scene: e.scene, title,
          mechanism: base.replace(/`/g, '').slice(0, 200), tags: [...new Set([...title.toLowerCase().split(/\W+/), ...(meta.tags || []), ...(meta.subject ? [meta.subject] : [])].filter(Boolean))],
          subject: meta.subject || null, grade: meta.grade || null, base: (base.split(/[\s:(]/)[0] || ''), controls: controls.slice(0, 160),
          helpers, size: e.src.length, approved, flags: [],
        });
      }
    }
  }
  fs.writeFileSync(path.join(cacheDir(root), 'index.json'), JSON.stringify({ at: Date.now(), entries, skipped }, null, 1));
  return { entries, skipped };
}

export function loadIndex(root, { rebuild = false } = {}) {
  const p = path.join(cacheDir(root), 'index.json');
  let stale = rebuild || !fs.existsSync(p);
  if (!stale) {
    const at = JSON.parse(fs.readFileSync(p, 'utf8')).at;
    const newer = (d) => { for (const e of fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }) : []) { const f = path.join(d, e.name); if (e.isDirectory() ? newer(f) : ((/\.(js|design\.md)$/.test(e.name) && fs.statSync(f).mtimeMs > at))) return true; } return false; };
    stale = newer(path.join(root, 'courses')) || newer(path.join(root, 'examples')) || (fs.existsSync(path.join(root, 'reuse-exclude.txt')) && fs.statSync(path.join(root, 'reuse-exclude.txt')).mtimeMs > at);
  }
  if (stale) buildIndex(root);
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}
