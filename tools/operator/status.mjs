#!/usr/bin/env node
// status - approval progress per lesson. OPERATOR ONLY.
//
//   node tools/operator/status.mjs [--bundle <id> | --all-bundles] [--since 12h] [--plan]
// --plan prints the remaining agent runs: the current stage and how many units it offers now (from next.mjs --units).
// Table per lesson: approved/total items, draft items, scenes still building (design note Status; review-pending listed apart). --since lists
// log lines (Stage / REV) dated within the window, for the morning after an unattended run.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { parseArgs } from '../sim-test/lib/args.mjs';
import { bundleFromArg, defaultBundle, KIT_ROOT } from '../sim-test/lib/bundle.mjs';
import { lessonFiles, lessonCodeOf, lessonItems, moduleFiles, bankFiles, statusOf } from './lib/units.mjs';

const A = parseArgs(process.argv.slice(2), { tool: 'status', file: import.meta.url, usage: 'node tools/operator/status.mjs [--bundle <id> | --all-bundles] [--since 12h] [--plan]', val: ['bundle', 'since'], bool: ['all-bundles', 'plan'] });
function bundles() {
  if (A.has('all-bundles')) {
    const root = path.join(process.cwd(), 'courses');
    return fs.existsSync(root) ? fs.readdirSync(root).map((d) => path.join(root, d)).filter((d) => fs.statSync(d).isDirectory()) : [];
  }
  const b = A.val('bundle') ? bundleFromArg(A.val('bundle')) : defaultBundle();
  if (!b) { console.error('pass --bundle <id> or --all-bundles'); process.exit(2); }
  return [b];
}
const tally = (files) => { const t = { total: 0, approved: 0 }; for (const f of files) { t.total++; if (statusOf(f) === 'human-approved') t.approved++; } return t; };
function building(B) {
  const out = [];
  const walk = (d) => { for (const e of fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }) : []) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith('.design.md')) { const st = /^Status:\s*(\S+)/m.exec(fs.readFileSync(p, 'utf8'))?.[1]; if (st && st !== 'done') out.push(`${path.basename(p, '.design.md')}:${st}`); } } };
  walk(path.join(B, 'simulations'));
  return out;
}
const hours = (s) => { const m = /^(\d+)([hd])$/.exec(s || ''); return m ? Number(m[1]) * (m[2] === 'd' ? 24 : 1) : null; };

for (const B of bundles()) {
  console.log(`# ${path.basename(B)}`);
  const lf = lessonFiles(B).sort();
  const rows = lf.map((f) => { const it = lessonItems(B, f); const t = tally(it.flatMap((x) => x.files)); const self = statusOf(f) === 'human-approved'; return [lessonCodeOf(f), `${t.approved}/${t.total}`, self ? 'yes' : 'no', t.total - t.approved]; });
  if (rows.length) { console.log('lesson   items   lesson-file approved   draft items'); for (const r of rows) console.log(`${r[0].padEnd(8)} ${r[1].padEnd(7)} ${r[2].padEnd(22)} ${r[3]}`); }
  const m = tally(moduleFiles(B)), b = tally(bankFiles(B));
  console.log(`modules approved ${m.approved}/${m.total}; bank files approved ${b.approved}/${b.total}`);
  const all = building(B); const rv = all.filter((x) => x.endsWith(':review-pending')).map((x) => x.replace(/:review-pending$/, '')); const bl = all.filter((x) => !x.endsWith(':review-pending'));
  if (rv.length) console.log(`built, waiting for your review (dashboard: Run tests, Mark reviewed): ${rv.slice(0, 15).join(', ')}${rv.length > 15 ? ` ... +${rv.length - 15}` : ''}`);
  if (bl.length) console.log(`scenes not done: ${bl.slice(0, 15).join(', ')}${bl.length > 15 ? ` ... +${bl.length - 15}` : ''}`);
  if (A.has('plan')) {
    const r = spawnSync(process.execPath, [path.join(KIT_ROOT, 'tools', 'staged-generation', 'next.mjs'), '--units', '--bundle', path.basename(B), '--repo', process.cwd()], { encoding: 'utf8', maxBuffer: 64 << 20 });
    try {
      const j = JSON.parse(r.stdout); const by = {};
      for (const u of j.units || []) by[String(u.stage)] = (by[String(u.stage)] || 0) + 1;
      console.log(`plan: stage ${j.stage}, ${j.units?.length || 0} unit(s) available now (${Object.entries(by).map(([k, v]) => `${k}: ${v}`).join(', ') || 'none'}); each unit is one agent run; later stages appear as this one finishes`);
    } catch { console.log('plan: could not read next.mjs --units'); }
  }
  const h = hours(A.val('since'));
  if (h != null) {
    const logP = path.join(B, 'GENERATION-LOG.md');
    if (fs.existsSync(logP)) {
      const cut = new Date(Date.now() - h * 3600e3).toISOString().slice(0, 10);
      const lines = fs.readFileSync(logP, 'utf8').split('\n').filter((l) => { const d = /^REV (\d{4}-\d\d-\d\d)|\((?:[^)]*), (\d{4}-\d\d-\d\d)\)/.exec(l); return d && (d[1] || d[2]) >= cut; });
      console.log(`log lines since ${cut}: ${lines.length}`); lines.slice(-20).forEach((l) => console.log('  ' + l.slice(0, 160)));
    }
  }
}
void KIT_ROOT;
