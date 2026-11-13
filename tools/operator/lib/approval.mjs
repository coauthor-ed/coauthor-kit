// Approval core shared by the CLI (approve/unapprove) and the preview server. Writes status, reviewedAt/By, and a REV line.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolveScope } from './units.mjs';

const KIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

export function planStatus(B, scope, target) {
  const files = resolveScope(B, scope);
  const todo = [], same = [];
  for (const f of files) { const j = JSON.parse(fs.readFileSync(f, 'utf8')); (j.authoring?.status === target ? same : todo).push(f); }
  return { todo, same };
}

export function applyStatus(B, files, target, by, scopeText) {
  const un = target === 'ai-draft';
  const now = new Date().toISOString();
  for (const f of files) {
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    j.authoring = { ...(j.authoring || {}), status: target };
    if (un) { j.authoring.reviewedAt = null; delete j.authoring.reviewedBy; } else { j.authoring.reviewedAt = now; if (by) j.authoring.reviewedBy = by; }
    fs.writeFileSync(f, JSON.stringify(j, null, 2) + '\n');
  }
  if (files.length) spawnSync(process.execPath, [path.join(KIT, 'tools', 'log.mjs'), 'rev', '--bundle', B, '--scope', scopeText, '--who', by || 'operator', '--what', `${un ? 'unapproved' : 'approved'} ${files.length} file(s)`], { stdio: 'ignore' });
}

export function kitReviewer(root) { try { return JSON.parse(fs.readFileSync(path.join(root, 'kit.json'), 'utf8')).reviewer || null; } catch { return null; } }
