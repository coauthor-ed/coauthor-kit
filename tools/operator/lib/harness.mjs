// Harness config generation: web-tool deny rules (web-mode) and, later, per-bundle read denies (focus).
// ONE place for the key names. Verify against each harness's current docs at upgrade time.
import fs from 'node:fs';
import path from 'node:path';

export const WEB_DENY = { claude: ['WebSearch', 'WebFetch'], opencode: ['webfetch', 'websearch'] };

export function readJson(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return {}; } }
export function writeJson(p, j) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n'); }

const claudeP = (root) => path.join(root, '.claude', 'settings.json');
const openP = (root) => path.join(root, 'opencode.json');

export function setWeb(root, allowed) {
  const c = readJson(claudeP(root));
  c.permissions = c.permissions || {};
  const deny = new Set(c.permissions.deny || []);
  for (const t of WEB_DENY.claude) allowed ? deny.delete(t) : deny.add(t);
  c.permissions.deny = [...deny];
  writeJson(claudeP(root), c);
  const o = readJson(openP(root));
  o.permission = o.permission || {};
  for (const t of WEB_DENY.opencode) o.permission[t] = allowed ? 'allow' : 'deny';
  writeJson(openP(root), o);
}

export function webState(root) {
  const deny = readJson(claudeP(root)).permissions?.deny || [];
  const claude = fs.existsSync(claudeP(root)) ? (WEB_DENY.claude.every((t) => deny.includes(t)) ? 'denied' : 'ALLOWED') : 'no config';
  const o = readJson(openP(root)).permission || {};
  const opencode = fs.existsSync(openP(root)) ? (WEB_DENY.opencode.every((t) => o[t] === 'deny') ? 'denied' : 'ALLOWED') : 'no config';
  return { claude, opencode };
}

// ---- focus: deny reading other bundles (generated rules are tracked so --clear removes exactly them) ----
const markP = (root) => path.join(root, '.focus-rules.json');
export function setFocusDeny(root, otherBundles) {
  clearFocusDeny(root);
  const rules = { claude: otherBundles.map((b) => `Read(./courses/${b}/**)`), opencode: otherBundles.map((b) => `courses/${b}/**`) };
  const c = readJson(claudeP(root));
  c.permissions = c.permissions || {};
  c.permissions.deny = [...new Set([...(c.permissions.deny || []), ...rules.claude])];
  writeJson(claudeP(root), c);
  const o = readJson(openP(root));
  o.permission = o.permission || {};
  o.permission.read = { ...(typeof o.permission.read === 'object' ? o.permission.read : {}), ...Object.fromEntries(rules.opencode.map((r) => [r, 'deny'])) };
  writeJson(openP(root), o);
  writeJson(markP(root), rules);
}
export function clearFocusDeny(root) {
  const prev = readJson(markP(root));
  if (!prev.claude) return;
  const c = readJson(claudeP(root));
  if (c.permissions?.deny) c.permissions.deny = c.permissions.deny.filter((r) => !prev.claude.includes(r));
  writeJson(claudeP(root), c);
  const o = readJson(openP(root));
  if (o.permission?.read && typeof o.permission.read === 'object') for (const r of prev.opencode) delete o.permission.read[r];
  writeJson(openP(root), o);
  fs.rmSync(markP(root), { force: true });
}
