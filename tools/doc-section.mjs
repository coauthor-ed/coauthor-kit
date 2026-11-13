#!/usr/bin/env node
// doc-section - print only the sections of a Markdown doc you need.
//
//   node tools/doc-section.mjs <file.md> "<heading text>" ["<heading text>" ...]
//   node tools/doc-section.mjs <file.md> --list
//
// A section runs from its heading to the next heading of the same or a higher
// level. A query matches a heading that contains it (case-insensitive), so
// "3.4" finds "### 3.4 Coming to rest ...". --list prints every heading with its
// size in KB, so you can decide what to open.
import fs from 'node:fs';

const [file, ...queries] = process.argv.slice(2);
if (!file || !queries.length) { console.error('usage: node tools/doc-section.mjs <file.md> "<heading>" [...] | --list'); process.exit(2); }
if (!fs.existsSync(file)) {
  const dir = fs.existsSync('docs') ? 'docs' : '.';
  const near = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.md')) : [];
  console.error(`no such file: ${file}${near.length ? ` (markdown here in ${dir}/: ${near.join(', ')})` : ''}`);
  process.exit(2);
}
const lines = fs.readFileSync(file, 'utf8').split('\n');
let fence = false;
const heads = [];
lines.forEach((l, i) => {
  if (/^```/.test(l)) fence = !fence;
  const m = !fence && l.match(/^(#{1,6})\s+(.*)$/);
  if (m) heads.push({ i, level: m[1].length, text: m[2] });
});
const endOf = (k) => { for (let j = k + 1; j < heads.length; j++) if (heads[j].level <= heads[k].level) return heads[j].i; return lines.length; };

if (queries[0] === '--list') {
  heads.forEach((h, k) => {
    const kb = lines.slice(h.i, endOf(k)).join('\n').length / 1024;
    console.log(`${'  '.repeat(h.level - 1)}${h.text}  (${kb.toFixed(1)} KB)`);
  });
  process.exit(0);
}
let missing = 0;
for (const q of queries) {
  const k = heads.findIndex((h) => h.text.toLowerCase().includes(q.toLowerCase()));
  if (k < 0) { console.error(`no heading contains "${q}" (try --list)`); missing++; continue; }
  console.log(lines.slice(heads[k].i, endOf(k)).join('\n').trimEnd() + '\n');
}
process.exit(missing ? 1 : 0);
