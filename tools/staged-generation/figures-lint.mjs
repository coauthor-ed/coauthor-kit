#!/usr/bin/env node
// figures-lint - FIGURES.md format check (Stage 1a writes it, Stage 1b backfills it).
//
//   node tools/staged-generation/figures-lint.mjs <bundle id | dir> [--part NN] [--stage 1a]
// A multi-part bundle keeps parts/<NN>/FIGURES.md per part; without --part every part is checked.
//
// Each entry: `## <label> (p.<page>) - <short description>` then
// The locator is (p.N), or (Section N) / (slide N) for a source without pages.
//   - Used by: TBD | L0N s0M[, L0P s0Q, ...]
//   - Inspected: rasterized + viewed directly | caption/text only
//   - Description: ...
// ERROR a missing Used by / Inspected / Description line, a malformed Used by.
// WARN  a heading without (p.N) / (Section N) / (slide N) or " - ", an odd Inspected value, a flag not in the
//       exact form `- Flag (unverified - needs human check): ...`, duplicate labels.
// --stage 1a: every Used by must still be TBD (slides do not exist yet).
// Prints entry / TBD / flag / [derived] counts - quote these, do not count by hand.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { bundleFromArg, defaultBundle, LESSON_ID_SRC, partFromArgs, runPerPart, workDir } from '../sim-test/lib/bundle.mjs';

export function parseFigures(text) {
  const entries = [];
  let cur = null;
  text.split('\n').forEach((line, i) => {
    const h = line.match(/^## (.+)$/);
    if (h) { cur = { heading: h[1].trim(), line: i + 1, body: [] }; entries.push(cur); return; }
    if (cur) cur.body.push({ text: line, line: i + 1 });
  });
  for (const e of entries) {
    const m = e.heading.match(/^(.+?)\s*\((?:p\.|[Ss]ection|[Ss]lide)\s*(\d[\w.]*)[^)]*\)\s*(?:-\s*(.*))?$/);
    e.label = (m ? m[1] : e.heading.split(' - ')[0]).trim();
    e.page = m ? m[2] : null;
    e.desc = m ? m[3] : null;
    const field = (k) => e.body.find((l) => new RegExp(`^- ${k}:`).test(l.text));
    e.usedBy = field('Used by');
    e.inspected = field('Inspected');
    e.description = field('Description');
    e.flags = e.body.filter((l) => /\bflag\b/i.test(l.text) && /^\s*-/.test(l.text));
    e.derived = e.body.filter((l) => l.text.includes('[derived]')).length;
  }
  return entries;
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const args = process.argv.slice(2);
  const b = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--stage' && args[i - 1] !== '--part');
  const stage = args.includes('--stage') ? args[args.indexOf('--stage') + 1] : null;
  const B = b ? bundleFromArg(b) : defaultBundle();
  if (!B) { console.error('usage: node tools/staged-generation/figures-lint.mjs <bundle> [--part NN] [--stage 1a]'); process.exit(2); }
  runPerPart(B, args, import.meta.url, spawnSync);
  const file = path.join(workDir(B, partFromArgs(args, B)), 'FIGURES.md');
  if (!fs.existsSync(file)) { console.log(`FAIL - no FIGURES.md in ${path.relative(process.cwd(), path.dirname(file)) || '.'} (required every run, even "no load-bearing figures")`); process.exit(1); }
  const entries = parseFigures(fs.readFileSync(file, 'utf8'));
  let errors = 0, warns = 0;
  const E = (l, m) => { errors++; console.log(`  ERROR line ${l}: ${m}`); };
  const W = (l, m) => { warns++; console.log(`  WARN  line ${l}: ${m}`); };
  const labels = new Map();
  let tbd = 0, flags = 0, derived = 0;
  for (const e of entries) {
    if (!e.page || e.desc == null) W(e.line, `heading should be "## <label> (p.<page> | Section N | slide N) - <short description>": ${e.heading.slice(0, 80)}`);
    const key = `${e.label}|${e.page}`;
    if (labels.has(key)) W(e.line, `duplicate entry for ${e.label} (p.${e.page}), first at line ${labels.get(key)}`);
    labels.set(key, e.line);
    if (!e.usedBy) E(e.line, `${e.label}: no "- Used by:" line`);
    else {
      const v = e.usedBy.text.replace(/^- Used by:\s*/, '').trim();
      if (v === 'TBD') tbd++;
      else if (!new RegExp(`^${LESSON_ID_SRC} [sa]\\d\\d(, ${LESSON_ID_SRC} [sa]\\d\\d)*$`).test(v)) E(e.usedBy.line, `${e.label}: Used by must be TBD or "L0N s0M, ..." (a01 for an arcade slide) - got "${v.slice(0, 60)}"`);
      else if (stage === '1a') E(e.usedBy.line, `${e.label}: Stage 1a leaves Used by as TBD (Stage 1b backfills it)`);
    }
    if (!e.inspected) E(e.line, `${e.label}: no "- Inspected:" line`);
    else if (!/^- Inspected:\s*(rasterized \+ viewed directly|caption\/text only)/.test(e.inspected.text)) W(e.inspected.line, `${e.label}: Inspected should be "rasterized + viewed directly" or "caption/text only"`);
    if (!e.description) E(e.line, `${e.label}: no "- Description:" line`);
    for (const f of e.flags) {
      flags++;
      if (!/^- Flag \(unverified - needs human check\): /.test(f.text)) W(f.line, `${e.label}: write a flag as "- Flag (unverified - needs human check): ..."`);
    }
    derived += e.derived;
  }
  console.log(`${errors ? 'FAIL' : 'PASS'} - ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}, ${tbd} Used by TBD, ${flags} flag(s), ${derived} [derived] line(s); ${errors} error(s), ${warns} warning(s)`);
  process.exit(errors ? 1 : 0);
}
