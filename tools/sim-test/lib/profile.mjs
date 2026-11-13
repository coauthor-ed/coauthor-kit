// Visual profile of a scene: 'lite' (default house rules) or 'rich' (docs/visual-profiles.md).
// Resolution, first hit wins:
//   1. the scene file:   static VISUAL_PROFILE = 'rich' | 'lite'
//   2. its stub:         Profile: rich | lite        (a line in <Scene>.stub.md; 'course' = fall through)
//   3. the bundle:       "visualProfile": "rich" in bundle.json, else manifest.json
//   4. 'lite'
// sceneProfile(file, bundleDir) -> { profile, from }   from: 'scene' | 'stub' | 'bundle' | 'default'
import fs from 'node:fs';
import path from 'node:path';

const PROFILES = new Set(['lite', 'rich']);
const read = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return null; } };

export function bundleProfile(bundleDir) {
  if (!bundleDir) return null;
  for (const f of ['bundle.json', 'manifest.json']) {
    const s = read(path.join(bundleDir, f));
    if (!s) continue;
    try { const v = JSON.parse(s).visualProfile; if (PROFILES.has(v)) return v; } catch { /* not json */ }
  }
  return null;
}

export function sceneProfile(file, bundleDir) {
  const code = file && read(file);
  const own = code && (code.match(/static\s+VISUAL_PROFILE\s*=\s*['"](lite|rich)['"]/) || [])[1];
  if (own) return { profile: own, from: 'scene' };
  const stub = file && read(file.replace(/\.js$/, '.stub.md'));
  const st = stub && (stub.match(/^Profile:\s*(lite|rich)\b/m) || [])[1];
  if (st) return { profile: st, from: 'stub' };
  const b = bundleProfile(bundleDir);
  if (b) return { profile: b, from: 'bundle' };
  return { profile: 'lite', from: 'default' };
}
