// Static server for real-browser tools (shoot, webgl-probe): the root above courses/
// (scene-relative imports), the kit at /__kit/, /vendor/ falling back to the kit's
// vendor/ (SimGeo fetch()es /vendor/geo/... which the import map does not cover),
// plus extra prefix -> dir mounts. Also finds Playwright.
import { createRequire } from 'node:module';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { KIT_ROOT } from './bundle.mjs';

const MIME = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };

export function rootFor(file) {
  let d = path.dirname(file);
  for (;;) {
    if (fs.existsSync(path.join(d, 'courses'))) return d;
    const up = path.dirname(d);
    if (up === d) return path.dirname(file);
    d = up;
  }
}

export async function serve(rootDir, extra = {}) {
  const kitDir = path.join(KIT_ROOT, 'simulations-kit');
  const mounts = { '/__kit/': kitDir, ...extra };
  const server = http.createServer((req, res) => {
    const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let base = rootDir, r = u.slice(1);
    const m = Object.keys(mounts).find((p) => u.startsWith(p));
    if (m) { base = mounts[m]; r = u.slice(m.length); }
    else if (u.startsWith('/vendor/') && !fs.existsSync(path.join(rootDir, r))) base = kitDir;
    const f = path.join(base, r);
    if (!f.startsWith(base) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { server, origin: `http://127.0.0.1:${server.address().port}` };
}

// Where a Playwright install can hide: $PLAYWRIGHT_DIR, the project, the global npm root (`npm root -g`:
// nvm, volta, /usr/local, a prefix), the usual global dirs. No NODE_PATH needed.
export function playwright() {
  const from = (dir) => () => createRequire(path.join(dir, 'x.js'))('playwright');
  const direct = (dir) => () => createRequire(import.meta.url)(path.join(dir, 'playwright'));
  const dirs = [process.env.PLAYWRIGHT_DIR, process.cwd(), KIT_ROOT, '/usr/lib/node_modules', '/usr/local/lib/node_modules', path.join(process.env.HOME || '/', '.local/lib/node_modules')].filter(Boolean);
  const load = [() => createRequire(import.meta.url)('playwright'), ...dirs.map(from), ...dirs.map(direct)];
  for (const f of load) { try { return f(); } catch { /* next */ } }
  try {
    const root = execFileSync('npm', ['root', '-g'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 15000 }).trim();
    if (root) return createRequire(import.meta.url)(path.join(root, 'playwright'));
  } catch { /* none */ }
  return null;
}
