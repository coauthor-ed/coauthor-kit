#!/usr/bin/env node
// glossary-lint - checks a course glossary.json against the lesson prose.
//
//   node tools/glossary-lint.mjs <bundle-dir> [--json] [--max-new N]
//
// Reads <bundle>/glossary.json, the lessons in manifest order and every block's
// prose, then reports (see docs/glossary.md):
//
//   ERROR  schema     duplicate id, missing term/means, bad face art/tone
//   ERROR  scene-ref  a NameDecoderScene lists an id that is not in the glossary,
//                     has no face, or (decode mode) has no roots
//   WARN   roots      a root part is not found in the term, so the name cannot be
//                     coloured piece by piece
//   WARN   unused     a glossary term never appears in any prose
//   WARN   unpaired   the first use of a name has no plain name or root meaning
//                     within 90 characters (pair the first use: "flatworms (Platyhelminthes)")
//   WARN   pacing     a beat introduces more than --max-new (default 3) new
//                     names, or more than 5 new terms of any kind
//   INFO   candidate  bolded or Latin-looking words that are not in the glossary
//
// Exit code 1 if any ERROR.
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const val = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const dir = path.resolve(args.find((a) => !a.startsWith('--') && a !== val('--max-new')) || '.');
const MAX_NEW = Number(val('--max-new', 3));
const NAME_GROUPS = new Set(['kingdom', 'domain', 'phylum', 'class', 'plant group', 'order', 'family', 'genus', 'subphylum']);

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const out = { errors: [], warns: [], info: [] };
const err = (k, m) => out.errors.push([k, m]);
const warn = (k, m) => out.warns.push([k, m]);
const info = (k, m) => out.info.push([k, m]);
const en = (v) => (v && typeof v === 'object' ? v.en : v) || '';

if (!fs.existsSync(path.join(dir, 'glossary.json'))) { console.error('no glossary.json in ' + dir); process.exit(2); }
const glossary = readJson(path.join(dir, 'glossary.json'));
const terms = glossary.terms || [];

// ---- art keys (the kit's character library)
let artKeys = null;
for (const p of ['../simulations-kit/src/simulations/base/kit/KeyCharacters.js', 'simulations-kit/src/simulations/base/kit/KeyCharacters.js']) {
  const f = path.resolve(path.dirname(new URL(import.meta.url).pathname), p);
  if (fs.existsSync(f)) {
    const src = fs.readFileSync(f, 'utf8');
    const body = src.slice(src.indexOf('const ART = {'), src.indexOf('export const ART_KEYS'));
    artKeys = new Set([...body.matchAll(/^  ([a-z0-9]+): `/gm)].map((m) => m[1]));
    break;
  }
}

// ---- schema
const ids = new Set();
for (const t of terms) {
  if (!t.id || !t.term) { err('schema', `entry without id/term: ${JSON.stringify(t).slice(0, 60)}`); continue; }
  if (ids.has(t.id)) err('schema', `duplicate id ${t.id}`);
  ids.add(t.id);
  if (!en(t.means)) err('schema', `${t.id}: no means`);
  if (t.face) {
    if (artKeys && !artKeys.has(t.face.art)) err('schema', `${t.id}: unknown face art "${t.face.art}"`);
    if (!(t.face.tone >= 1 && t.face.tone <= 8)) err('schema', `${t.id}: face tone must be 1..8`);
  }
  const low = t.term.toLowerCase();
  let cur = 0;
  for (const r of t.roots || []) {
    const at = low.indexOf(String(r.part).toLowerCase(), cur);
    if (at < 0) warn('roots', `${t.id}: root "${r.part}" not found (in order) in "${t.term}"`);
    else cur = at + String(r.part).length;
  }
}

// ---- the same matcher the engine uses (src/core/GlossaryService.js)
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const forms = [];
for (const t of terms) for (const f of new Set([t.term, ...(t.match || [])])) forms.push({ f, id: t.id, cs: !!t.cs });
forms.sort((a, b) => b.f.length - a.f.length);
const formMap = new Map(forms.map((x) => [x.cs ? x.f : x.f.toLowerCase(), x]));
const re = new RegExp(`(?<![\\p{L}\\p{N}-])(?:${forms.map((x) => esc(x.f)).join('|')})(?![\\p{L}\\p{N}])`, 'giu');
const idFor = (w) => { const h = formMap.get(w) || formMap.get(w.toLowerCase()); return !h || (h.cs && h.f !== w) ? null : h.id; };
const byId = new Map(terms.map((t) => [t.id, t]));

// ---- prose in course order
const manifest = fs.existsSync(path.join(dir, 'manifest.json')) ? readJson(path.join(dir, 'manifest.json')) : {};
const lessonFiles = manifest.lessons || fs.readdirSync(path.join(dir, 'lessons')).sort().map((f) => `lessons/${f}`);
const beats = []; // { lesson, slide, beat, text }
lessonFiles.forEach((lf, li) => {
  const les = readJson(path.join(dir, lf));
  (les.blocks || []).forEach((b, si) => {
    if (!b.blockRef) return;
    const blk = readJson(path.join(dir, b.blockRef));
    let text = blk.markdown ? en(blk.markdown) : '';
    const ref = blk.markdownRef || blk.promptRef;
    if (!text && ref && fs.existsSync(path.join(dir, ref))) text = fs.readFileSync(path.join(dir, ref), 'utf8');
    if (!text) return;
    // A decode scene teaches the names itself, so its intro prose is not the "first use".
    const simSrc = blk.simulation?.src;
    const simText = simSrc && fs.existsSync(path.join(dir, simSrc)) ? fs.readFileSync(path.join(dir, simSrc), 'utf8') : '';
    const decode = /extends\s+NameDecoderScene\b/.test(simText) && /mode:\s*'decode'/.test(simText);
    text.split(/<!--\s*STEP\s*-->/).forEach((chunk, bi) => { if (chunk.trim()) beats.push({ lesson: li + 1, slide: si + 1, beat: bi + 1, text: chunk, decode }); });
  });
});

// `first` is the first EXACT use of a term in teaching prose; a plainer alias from
// `match` ("amphibians" for Amphibia) seen earlier counts as its plain-name pairing.
const first = new Map(); // id -> { pos, ctx }
const alias = new Set(); // ids whose plain alias has already been seen
const used = new Set();
const perBeat = [];
for (const b of beats) {
  const fresh = [];
  const plain = b.text.replace(/^#{1,6} .*$/gm, ''); // headings are not marked in the app
  const here = new Set();
  for (let m = re.exec(plain); m; m = re.exec(plain)) {
    const id = idFor(m[0]);
    if (!id) continue;
    used.add(id);
    if (b.decode) continue;
    if (m[0].toLowerCase() !== byId.get(id).term.toLowerCase()) { if (!first.has(id)) here.add(id); continue; }
    if (first.has(id)) continue;
    const ctx = plain.slice(Math.max(0, m.index - 90), m.index + m[0].length + 90);
    first.set(id, { pos: b, ctx, at: m[0], viaAlias: alias.has(id) || here.has(id) });
    fresh.push(id);
  }
  here.forEach((id) => alias.add(id));
  perBeat.push([b, fresh]);
}

for (const t of terms) if (!used.has(t.id)) warn('unused', `${t.id}: never appears in prose`);

const STOP = new Set(['the', 'and', 'that', 'with', 'from', 'like', 'who', 'are', 'for', 'one', 'not', 'has', 'have', 'all', 'its']);
const sig = (s) => en(s).toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 4 && !STOP.has(w));
for (const [id, f] of first) {
  const t = byId.get(id);
  if (!NAME_GROUPS.has(t.group) || !(t.plain || t.roots?.length) || f.viaAlias) continue;
  const ctx = f.ctx.toLowerCase();
  const cues = [...sig(t.plain), ...(t.roots || []).flatMap((r) => sig(r.means))];
  const stems = cues.map((w) => w.replace(/(es|s)$/, ''));
  if (!stems.some((w) => ctx.includes(w))) warn('unpaired', `${id}: first use (L${f.pos.lesson} s${f.pos.slide}) has no plain name or root meaning nearby: "...${f.ctx.replace(/\s+/g, ' ').trim()}..."`);
}
for (const [b, fresh] of perBeat) {
  const names = fresh.filter((id) => NAME_GROUPS.has(byId.get(id).group));
  const where = `L${b.lesson} s${b.slide} beat ${b.beat}`;
  if (names.length > MAX_NEW) warn('pacing', `${where}: ${names.length} new names (${names.join(', ')})`);
  else if (fresh.length > 5) warn('pacing', `${where}: ${fresh.length} new terms (${fresh.join(', ')})`);
}

// ---- scenes that read the glossary
const simDir = path.join(dir, 'simulations');
const walk = (d) => (fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)])) : []);
for (const f of walk(simDir).filter((x) => x.endsWith('.js'))) {
  const src = fs.readFileSync(f, 'utf8');
  if (!/extends\s+NameDecoderScene\b/.test(src)) continue;
  const mode = (src.match(/mode:\s*'(\w+)'/) || [])[1];
  for (const key of ['terms', 'pool']) {
    const arr = (src.match(new RegExp(`${key}:\\s*\\[([^\\]]*)\\]`)) || [])[1] || '';
    for (const id of [...arr.matchAll(/'([^']+)'/g)].map((m) => m[1])) {
      const t = byId.get(id);
      const rel = path.relative(dir, f);
      if (!t) err('scene-ref', `${rel}: ${key} id "${id}" is not in glossary.json`);
      else if (!t.face && (key === 'pool' || mode === 'recall' || key === 'terms')) err('scene-ref', `${rel}: "${id}" has no face`);
      else if (key === 'terms' && mode === 'decode' && !(t.roots || []).length) err('scene-ref', `${rel}: "${id}" has no roots (decode needs them)`);
    }
  }
}

// ---- candidates: bold words and Latin-looking words that have no entry
const seen = new Set();
const LATIN = /^[A-Za-z]{6,}(ia|ae|ata|oda|ida|phyta|phyte|cyte|osis|ology|ium|ales|aceae|opsida|idae|thes|dermata|zoa)$/;
for (const b of beats) {
  for (const m of b.text.matchAll(/\*\*([A-Za-z][A-Za-z -]{2,30})\*\*/g)) {
    const w = m[1].trim();
    if (!idFor(w) && !seen.has(w.toLowerCase()) && !/^(Predict|Check|Challenge|Run all|Group by)/i.test(w) && w.split(' ').length <= 3) { seen.add(w.toLowerCase()); info('candidate', `bold "${w}" (L${b.lesson} s${b.slide})`); }
  }
  for (const w of b.text.match(/\b[A-Za-z]{6,}\b/g) || []) if (LATIN.test(w) && !idFor(w) && !seen.has(w.toLowerCase())) { seen.add(w.toLowerCase()); info('candidate', `"${w}" (L${b.lesson} s${b.slide})`); }
}

if (flag('--json')) console.log(JSON.stringify(out, null, 1));
else {
  for (const [k, m] of out.errors) console.log(`ERROR ${k.padEnd(10)} ${m}`);
  for (const [k, m] of out.warns) console.log(`WARN  ${k.padEnd(10)} ${m}`);
  for (const [k, m] of out.info) console.log(`INFO  ${k.padEnd(10)} ${m}`);
  console.log(`\n${terms.length} term(s), ${used.size} used in prose: ${out.errors.length} error(s), ${out.warns.length} warning(s), ${out.info.length} candidate(s)`);
}
process.exit(out.errors.length ? 1 : 0);
