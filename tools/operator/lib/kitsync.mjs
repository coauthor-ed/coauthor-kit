// Kit sync engine: reads kit-files.txt (rsync filter syntax subset: "+ /path", "+ /dir/***", "- *", # comments).
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

export function parseFilter(text) {
  return text.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).map((l) => {
    const m = /^([+-])\s+(.+)$/.exec(l); if (!m) throw new Error(`bad filter line: ${l}`);
    return { inc: m[1] === '+', pat: m[2] };
  });
}
export function included(rules, rel) {
  for (const r of rules) {
    let p = r.pat, hit;
    if (p === '*') hit = true;
    else if (p.endsWith('/***')) { const d = p.slice(0, -4).replace(/^\//, ''); hit = rel === d || rel.startsWith(d + '/'); }
    else hit = rel === p.replace(/^\//, '');
    if (hit) return r.inc;
  }
  return false;
}
export function walk(root, dir = '') {
  const out = [];
  for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = dir ? `${dir}/${e.name}` : e.name;
    if (e.name === '.git' || e.name === 'node_modules' || rel === 'build') continue;
    if (e.isDirectory()) out.push(...walk(root, rel)); else if (e.isFile()) out.push(rel);
  }
  return out;
}
export function resolveSource(from) {
  let dir = from;
  if (/^(https?:|git@|ssh:)|\.git(#|$)/.test(from)) {
    const [url, ref] = from.split('#');
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-'));
    execFileSync('git', ['clone', '--depth', '1', ...(ref ? ['--branch', ref] : []), url, dir], { stdio: 'inherit' });
  }
  dir = path.resolve(dir);
  const inner = path.join(dir, 'content-repo-template');
  if (!fs.existsSync(path.join(dir, 'kit-files.txt')) && fs.existsSync(path.join(inner, 'kit-files.txt'))) dir = inner;
  if (!fs.existsSync(path.join(dir, 'kit-files.txt'))) throw new Error(`${dir} has no kit-files.txt: not a kit`);
  return dir;
}
const same = (a, b) => fs.existsSync(b) && fs.statSync(a).size === fs.statSync(b).size && fs.readFileSync(a).equals(fs.readFileSync(b));
const MAN = '.kit-manifest.json';

// Compare/copy master -> dest. Returns { copied, changed[], added[], removed[] }. skip(rel) -> true leaves a kit-owned path out
// entirely (kit-sync skips the generated briefs/bundles/: the repo rebuilds them for its own profile).
export function syncKit({ master, dest, apply = false, reverse = false, skip = null }) {
  const rules = parseFilter(fs.readFileSync(path.join(master, 'kit-files.txt'), 'utf8'));
  const masterFiles = walk(master).filter((f) => included(rules, f) && !(skip && skip(f)));
  const res = { copied: 0, changed: [], added: [], removed: [], masterFiles };
  if (reverse) {
    for (const f of masterFiles) { const d = path.join(dest, f); if (fs.existsSync(d) && !same(d, path.join(master, f))) res.changed.push(f); }
    for (const f of res.changed) { if (apply) { fs.copyFileSync(path.join(dest, f), path.join(master, f)); res.copied++; } }
    return res;
  }
  for (const f of masterFiles) {
    const s = path.join(master, f), d = path.join(dest, f);
    if (!fs.existsSync(d)) res.added.push(f); else if (!same(s, d)) res.changed.push(f);
  }
  let prev = [];
  try { prev = JSON.parse(fs.readFileSync(path.join(dest, MAN), 'utf8')); } catch { /* first sync */ }
  const set = new Set(masterFiles);
  res.removed = prev.filter((f) => !set.has(f) && !(skip && skip(f)) && fs.existsSync(path.join(dest, f)));
  if (apply) {
    for (const f of [...res.added, ...res.changed]) { fs.mkdirSync(path.dirname(path.join(dest, f)), { recursive: true }); fs.copyFileSync(path.join(master, f), path.join(dest, f)); res.copied++; }
    for (const f of res.removed) fs.rmSync(path.join(dest, f), { force: true });
    fs.writeFileSync(path.join(dest, MAN), JSON.stringify(masterFiles, null, 1) + '\n');
  }
  return res;
}

// Status of the dest vs master (kit-owned files that differ): a plain byte compare.
export function kitStatus(master, dest) { return syncKit({ master, dest, reverse: true }).changed; }

export function changesSince(master, version) {
  try {
    const t = fs.readFileSync(path.join(master, 'CHANGES.md'), 'utf8');
    return t.split(/^## /m).slice(1).filter((s) => !version || s.split('\n')[0].trim() > version).map((s) => '## ' + s.trim()).join('\n\n');
  } catch { return ''; }
}
