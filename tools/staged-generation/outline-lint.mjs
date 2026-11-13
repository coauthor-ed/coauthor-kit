#!/usr/bin/env node
// outline-lint - OUTLINE.md format and counts (Stage 1b), and the FIGURES.md
// "Used by:" backfill.
//
//   node tools/staged-generation/outline-lint.mjs <bundle id | dir> [--part NN] [--backfill]
//
// A bundle with parts/<NN>/ folders (a multi-book course) keeps one OUTLINE.md and FIGURES.md per part
// (parts/<NN>/OUTLINE.md); lessons are then coded L<NN>-<module>-<lesson>. Without --part every part is
// linted in turn.
//
// Expects (briefs/stage1b-outline.md):
//   ## L0N - <lesson title>        (L<NN>-<mm>-<ll> in a part)
//   - **s0M** - <role> - `<block type>` - **sim** `<Scene>` (<Base>) | **image** | **neither** (<reason>) - ...
//     a figure reference anywhere on the line: *see FIGURES.md: <label>[, <label>]*
//   An arcade practice slide (optional): role `practice`, `content-block@1`, the scene's
//     base written `(ArcadeSort/sky)` [Sort sky|belt, Route road|rail, Match bubbles|range,
//     Order stack|train, Judge cards|doors], and `deck: <what>, taught by L02[ s05][, L03]`.
//     Arcade slides are numbered a01, a02, ... per lesson and placed anywhere in it; they
//     never shift the s numbers (blocks are blk-l0N-a01), and count in `(N slides)`.
//   ## Lesson list
//   - L0N - <lesson title> (<N> slides)
// Prints a per-lesson count table (slides, predicts, mini-games, sim/image/neither,
// opening role) - quote these numbers, never count by hand. ERROR: unparseable
// slide lines, gaps in s-numbers, a Lesson list that disagrees with the sections,
// a FIGURES.md label that does not exist. WARN: a lesson with no predict (school audience only), not
// exactly one mini-game (look plain: at most one, and no arcade slides; the course's look from bundle.json or profile.json), a deferVerdict predict not followed by an explain.
// Audience college or look plain (packs/audience/college/CARD.md 12, packs/look/plain/CARD.md 2): WARN a **neither** slide
// whose line names nothing to look at (pull quote, numbers table, figure, graph, diagram), and a lesson with fewer than 2 scenes.
// Any course (docs/pedagogy.md "Earn every scene"): ERROR (plain or college; WARN otherwise, so pre-rule school outlines still pass) a **sim** slide (not arcade) without "Shows: <what becomes visible that text
// cannot>" and "Without it: <what the learner would lose>". Plain or college: WARN a Shows/Without it under 4 words, and a **sim** line
// that names no learner action and no changing quantity (decoration: make it Text only); **neither** (Text only: <device>) names one of
// pull quote / takeaway / table / worked steps.
// Any course: WARN a slide line that plans the geometry `diagram` field when the course is not maths/physics
// (subjectPack/subject): flows, panels and timelines are the `figure` field (docs/figures.md).
// --backfill rewrites every FIGURES.md "Used by:" line from these references
// (unreferenced entries become TBD) and prints how many it filled.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { KIT_ROOT, bundleFromArg, defaultBundle, LESSON_ID_SRC, partFromArgs, runPerPart, workDir, partOfLesson, compareLessonIds } from '../sim-test/lib/bundle.mjs';
import { parseFigures } from './figures-lint.mjs';
import { readProfile } from './lib/profile.mjs';
import { bundleProfile } from './lib/bundleProfile.mjs';
import { geometrySubject, DIAGRAM_HINT } from './lib/figureField.mjs';
import { outlineDecoration } from './lib/plainRules.mjs';

const args = process.argv.slice(2);
const B = (args.find((a) => !a.startsWith('--')) ? bundleFromArg(args.find((a) => !a.startsWith('--'))) : defaultBundle());
if (!B) { console.error('usage: node tools/staged-generation/outline-lint.mjs <bundle> [--part NN] [--backfill]'); process.exit(2); }
runPerPart(B, args, import.meta.url, spawnSync);
const part = partFromArgs(args, B);
const W_DIR = workDir(B, part);
const outlineP = path.join(W_DIR, 'OUTLINE.md');
if (!fs.existsSync(outlineP)) { console.log(`FAIL - no ${path.relative(B, outlineP) || 'OUTLINE.md'}`); process.exit(1); }
const lines = fs.readFileSync(outlineP, 'utf8').split('\n');

// The course's own audience and look (bundle.json overrides, else profile.json): audience gates the predict rule, look gates the games.
let AUDIENCE, LOOK; try { readProfile(KIT_ROOT); ({ audience: AUDIENCE, look: LOOK } = bundleProfile(path.dirname(path.dirname(B)), path.basename(B))); } catch (e) { console.error(e.message); process.exit(2); }
const PLAIN = LOOK === 'plain';
const GEOMETRY = geometrySubject(B);
const VISUAL = PLAIN || AUDIENCE === 'college';   // every slide has something to look at; >= 2 operated scenes per lesson
let errors = 0, warns = 0;
const E = (l, m) => { errors++; console.log(`  ERROR line ${l}: ${m}`); };
const W = (l, m) => { warns++; console.log(`  WARN  line ${l}: ${m}`); };

const lessons = [];
const list = [];
let cur = null, inList = false;
lines.forEach((ln, i) => {
  const n = i + 1;
  if (/^## Lesson list\s*$/.test(ln)) { inList = true; cur = null; return; }
  if (/^## /.test(ln)) inList = false;
  const lh = ln.match(new RegExp(`^## (${LESSON_ID_SRC})\\s+[-\\u2014]\\s+(.+)$`));
  if (lh) {
    if (part && partOfLesson(lh[1]) !== part) E(n, `${lh[1]}: a lesson in parts/${part}/OUTLINE.md must be coded L${part}-<module>-<lesson>`);
    else if (!part && lh[1].length !== 3 && fs.existsSync(path.join(B, 'parts'))) E(n, `${lh[1]}: part-coded lesson in a bundle OUTLINE.md - move it to parts/<NN>/OUTLINE.md`); cur = { id: lh[1], title: lh[2].trim(), line: n, slides: [] }; lessons.push(cur); return; }
  if (inList) {
    const m = ln.match(new RegExp(`^- (${LESSON_ID_SRC})\\s+[-\\u2014]\\s+(.+?)\\s+\\((\\d+) slides?\\)\\s*$`));
    if (m) list.push({ id: m[1], title: m[2], n: Number(m[3]), line: n });
    else if (ln.trim().startsWith('-')) E(n, `Lesson list line must be exactly "- L0N - <title> (<N> slides)": ${ln.slice(0, 70)}`);
    return;
  }
  if (!cur) return;
  const s = ln.match(/^- \*\*([sa])(\d+)\*\*\s+-\s+(.*)$/);
  if (!s) { if (/^- \*\*[sa]\d/.test(ln)) E(n, `unparseable slide line: ${ln.slice(0, 70)}`); return; }
  const rest = s[3];
  const role = rest.split(' - ')[0].trim();
  const type = (rest.match(/`([a-z][\w-]*@\d+)`/) || [])[1] || '';
  const call = /\*\*sim\*\*/.test(rest) ? 'sim' : /\*\*image\*\*/.test(rest) ? 'image' : /\*\*neither\*\*/.test(rest) ? 'neither' : '';
  const scene = call === 'sim' ? (rest.match(/\*\*sim\*\*\s+`([^`]+)`/) || [])[1] : null;
  const figs = [];
  for (const m of rest.matchAll(/FIGURES\.md:\s*([^*;\n]+?)(?=\*|;|\s+-\s|$)/g)) {
    for (const p of m[1].split(/,\s*|\s+and\s+/)) if (p.trim()) figs.push(p.trim().replace(/[.)\s]+$/, (x) => (x.includes(')') ? ')' : '')));
  }
  if (!role) E(n, 'slide line has no role');
  if (!call) E(n, `${s[1]}${s[2]}: no **sim** / **image** / **neither** call`);
  // Arcade practice slide: (ArcadeSort/sky), deck: <what>, taught by L02[ s05][, L03]
  const am = rest.match(/\(Arcade(\w+)\/(\w+)\)/);
  const tm = rest.match(new RegExp(`taught by ((?:${LESSON_ID_SRC}(?: s\\d\\d)?(?:,\\s*)?)+)`, 'i'));
  const taught = tm ? [...tm[1].matchAll(new RegExp(`(${LESSON_ID_SRC})(?: s(\\d\\d))?`, 'g'))].map((x) => ({ lesson: x[1], slide: x[2] ? Number(x[2]) : null })) : [];
  cur.slides.push({ num: Number(s[2]), kind: s[1], id: `${s[1]}${s[2].padStart(2, '0')}`, role, type, call, scene, figs, defer: /deferVerdict/.test(rest), line: n,
    arcade: am ? { arch: am[1], skin: am[2] } : null, deck: /deck:/.test(rest), taught });
});

// figures
const figP = path.join(W_DIR, 'FIGURES.md');
const figs = fs.existsSync(figP) ? parseFigures(fs.readFileSync(figP, 'utf8')) : [];
function matchFigure(ref) {
  const pm = ref.match(/^(.*?)\s*\((?:p\.|[Ss]ection|[Ss]lide)\s*(\d[\w.]*)[^)]*\)/);
  const label = (pm ? pm[1] : ref).trim();
  const page = pm?.[2];
  const pageOk = (f) => !page || f.page === page;
  let hits = figs.filter((f) => f.label === label && pageOk(f));
  if (!hits.length) {
    // "Fig. 7.4 (constant-force case)": the longest label the reference starts with
    const cands = figs.filter((f) => (ref === f.label || ref.startsWith(f.label + ' ') || ref.startsWith(f.label + '(')) && pageOk(f));
    const best = Math.max(0, ...cands.map((f) => f.label.length));
    hits = cands.filter((f) => f.label.length === best);
  }
  return hits;
}

const used = new Map(); // figure entry -> Set of "L0N s0M"
console.log('lesson  slides  predict  game  arcade  sim/image/neither  opens');
for (const L of lessons) {
  // s01, s02, ... in order; arcade slides (a01, a02, ...) sit anywhere and do not shift the s numbers
  let sn = 0, an = 0, lastS = 0;
  for (const x of L.slides) {
    if (x.kind === 'a') { an += 1; x.after = lastS; if (x.num !== an) E(x.line, `${L.id}: expected a${String(an).padStart(2, '0')}, found a${String(x.num).padStart(2, '0')}`); continue; }
    sn += 1; lastS = x.num;
    if (x.num !== sn) E(x.line, `${L.id}: expected s${String(sn).padStart(2, '0')}, found s${String(x.num).padStart(2, '0')}`);
  }
  const c = (k) => L.slides.filter((s) => s.call === k).length;
  const predicts = L.slides.filter((s) => /predict/.test(s.role) || /^poe-predict/.test(s.type));
  const games = L.slides.filter((s) => /^mini-game/.test(s.type));
  const arc = L.slides.filter((x) => x.arcade).length;
  console.log(`${L.id}     ${String(L.slides.length).padStart(3)}   ${String(predicts.length).padStart(5)}  ${String(games.length).padStart(4)}  ${String(arc).padStart(6)}   ${c('sim')}/${c('image')}/${c('neither')}${' '.repeat(Math.max(1, 17 - `${c('sim')}/${c('image')}/${c('neither')}`.length))}${L.slides[0]?.role || '-'}`);
  if (!predicts.length && AUDIENCE === 'school') W(L.line, `${L.id}: no predict slide`);
  if (PLAIN ? games.length > 1 : games.length !== 1) W(L.line, `${L.id}: ${games.length} mini-games (AGENTS.md rule 10: one per lesson, or say why in the log)`);
  if (PLAIN && arc) W(L.line, `${L.id}: arcade practice slides are off under look plain`);
  if (VISUAL) {
    const scenes = L.slides.filter((x) => x.call === 'sim' && !x.arcade).length;
    if (scenes < 2) W(L.line, `${L.id}: ${scenes} scene(s); a college/plain lesson has at least 2 the learner operates (a slider, a split, a fill, a sort), its central idea one of them (audience college CARD 12)`);
    for (const x of L.slides) {
      if (x.call === 'neither' && !/pull quote|quote|takeaway|worked steps|\btable\b|\bfigure\b|\bgraph\b|\bdiagram\b|numbers/i.test(lines[x.line - 1])) W(x.line, `${L.id} ${x.id}: **neither** with nothing to look at; give the key sentence as a pull quote, the key numbers as a table, or the structure as a figure field (docs/figures.md), and say which on the line: **neither** (Text only: pull quote | takeaway | table | worked steps; <reason>) (plain CARD 2, audience college CARD 12)`);
    }
  }
  // Scene necessity (docs/pedagogy.md "Earn every scene"): every scene slide says what it shows and what is lost without it.
  for (const x of L.slides) {
    if (x.call !== 'sim' || x.arcade) continue;
    const t = lines[x.line - 1];
    const shows = (t.match(/Shows:\s*([^;]*?)(?:;|\s+-\s|\s+Without it:|$)/) || [])[1];
    const lose = (t.match(/Without it:\s*(.*?)(?:\s+-\s|;|$)/) || [])[1];
    if (VISUAL && outlineDecoration(t)) W(x.line, `${L.id} ${x.id}: the scene names no learner action and no changing quantity - decoration; make it Text only with a pull quote, takeaway, table or worked steps (plain CARD 13)`);
    if (!shows || !lose) { (VISUAL ? E : W)(x.line, `${L.id} ${x.id}: scene slide without ${!shows ? '"Shows: <what becomes visible that prose, a table or a worked calculation cannot>"' : ''}${!shows && !lose ? ' and ' : ''}${!lose ? '"Without it: <what the learner would lose>"' : ''} (docs/pedagogy.md "Earn every scene"; weak: make it **neither** (Text only: <device>))`); continue; }
    if (VISUAL) {
      const words = (s) => s.trim().split(/\s+/).filter(Boolean).length;
      if (words(shows) < 4 || words(lose) < 4) W(x.line, `${L.id} ${x.id}: Shows / Without it too thin to judge; say what moves, builds or is compared, or make the slide Text only (plain CARD 13)`);
    }
  }
  if (!GEOMETRY) for (const x of L.slides) {
    if (/`diagram`|\bdiagram field\b/i.test(lines[x.line - 1])) W(x.line, `${L.id} ${x.id}: ${DIAGRAM_HINT}`);
  }
  for (const [i, s] of L.slides.entries()) {
    if (s.defer && /poe-predict/.test(s.type) && !/explain/.test(L.slides[i + 1]?.role || '')) W(s.line, `${L.id} ${s.id}: deferVerdict predict, but the next slide is not an explain (the verdict must be the very next block)`);
    const counted = new Set(s.figs.flatMap((r) => matchFigure(r)).map((f) => f.label));
    const text = lines[s.line - 1];
    for (const f of figs) {
      if (counted.has(f.label) || f.label.length < 4 || /\bunused\b/.test(text)) continue;   // a line that says the figure stays unused may name it
      const esc = f.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(`(^|[^\\w.])${esc}(?![\\w]|\\.\\d)`).test(text)) W(s.line, `${L.id} ${s.id}: mentions "${f.label}" but not as "FIGURES.md: ${f.label}" - write the reference so the Used by backfill counts it`);
    }
    for (const ref of s.figs) {
      const hits = matchFigure(ref);
      if (!hits.length) E(s.line, `${L.id} ${s.id}: FIGURES.md has no entry "${ref}"`);
      else if (hits.length > 1) W(s.line, `${L.id} ${s.id}: "${ref}" matches ${hits.length} FIGURES.md entries - add the page, e.g. "${hits[0].label} (p.${hits[0].page})"`);
      else { if (!used.has(hits[0])) used.set(hits[0], new Set()); used.get(hits[0]).add(`${L.id} ${s.id}`); }
    }
  }
}
const total = lessons.reduce((a, L) => a + L.slides.length, 0);
const all = lessons.flatMap((L) => L.slides);
console.log(`total   ${String(total).padStart(3)}   ${String(all.filter((s) => /predict/.test(s.role) || /^poe-predict/.test(s.type)).length).padStart(5)}  ${String(all.filter((s) => /^mini-game/.test(s.type)).length).padStart(4)}   ${['sim', 'image', 'neither'].map((k) => all.filter((s) => s.call === k).length).join('/')}`);
const ARCADE = { Sort: ['sky', 'belt'], Route: ['road', 'rail'], Match: ['bubbles', 'range'], Order: ['stack', 'train'], Judge: ['cards', 'doors'], Catch: ['ice', 'orchard'] };
const arcade = lessons.flatMap((L) => L.slides.map((x) => ({ ...x, L }))).filter((x) => x.arcade);
arcade.forEach((x, i) => {
  const { arch, skin } = x.arcade;
  if (!ARCADE[arch]) W(x.line, `${x.L.id} ${x.id}: unknown arcade archetype "Arcade${arch}" (Sort, Route, Match, Order, Judge, Catch)`);
  else if (!ARCADE[arch].includes(skin)) W(x.line, `${x.L.id} ${x.id}: Arcade${arch} has skins ${ARCADE[arch].join(' / ')}, not "${skin}"`);
  if (!x.deck) W(x.line, `${x.L.id} ${x.id}: arcade slide has no "deck: <what it drills>"`);
  if (!x.taught.length) W(x.line, `${x.L.id} ${x.id}: arcade slide has no "taught by L0N" - a deck may only hold what was already taught`);
  for (const t of x.taught) {
    const cmp = compareLessonIds(t.lesson, x.L.id);
    if (cmp > 0 || (cmp === 0 && (t.slide == null || t.slide > (x.after ?? 0)))) W(x.line, `${x.L.id} ${x.id}: deck taught by ${t.lesson}${t.slide ? ` s${String(t.slide).padStart(2, '0')}` : ''} is not before this slide`);
  }
  const prev = arcade[i - 1];
  if (prev && prev.arcade.arch === arch && prev.arcade.skin === skin) W(x.line, `${x.L.id} ${x.id}: same archetype and skin as the previous arcade slide (${prev.L.id} ${prev.id}) - rotate, or use the other skin`);
});
if (arcade.length >= 4) {
  const by = {}; for (const x of arcade) by[x.arcade.arch] = (by[x.arcade.arch] || 0) + 1;
  const [top, n] = Object.entries(by).sort((a, b) => b[1] - a[1])[0];
  if (n / arcade.length > 0.5) W(arcade[0].line, `Arcade${top} is ${n} of ${arcade.length} arcade slides - vary the games (students tire of one kind)`);
}
if (arcade.length) console.log(`arcade slides: ${arcade.length} (${Object.entries(arcade.reduce((a, x) => ({ ...a, [`${x.arcade.arch}/${x.arcade.skin}`]: (a[`${x.arcade.arch}/${x.arcade.skin}`] || 0) + 1 }), {})).map(([k, v]) => `${k} x${v}`).join(', ')})`);
const scenes = all.filter((s) => s.scene).map((s) => s.scene);
console.log(`distinct scenes: ${new Set(scenes).size} (${scenes.length - new Set(scenes).size} reuse(s)); figures referenced: ${used.size} of ${figs.length}`);

if (!list.length) E(lines.length, 'no "## Lesson list" section (next.mjs parses it)');
for (const x of list) {
  const L = lessons.find((y) => y.id === x.id);
  if (!L) E(x.line, `Lesson list names ${x.id}, which has no "## ${x.id} - ..." section`);
  else if (L.slides.length !== x.n) E(x.line, `Lesson list says ${x.id} has ${x.n} slides; the section has ${L.slides.length}`);
}
for (const L of lessons) if (list.length && !list.some((x) => x.id === L.id)) E(L.line, `${L.id} is missing from the Lesson list`);

if (args.includes('--backfill')) {
  if (!figs.length) console.log('backfill: no FIGURES.md entries');
  else {
    const text = fs.readFileSync(figP, 'utf8').split('\n');
    const sortIds = (s) => [...s].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).join(', ');
    let filled = 0, tbd = 0, kept = 0;
    for (const f of figs) {
      if (!f.usedBy) continue;
      // Union with what is already there: a hand-set entry (a slide that uses the figure
      // without naming it in the outline) is never dropped; drops are only reported.
      const have = f.usedBy.text.replace(/^- Used by:\s*/, '').trim();
      const old = have === 'TBD' ? [] : have.split(/,\s*/);
      const now = used.has(f) ? [...used.get(f)] : [];
      const merged = new Set([...old, ...now]);
      const missingFromOutline = old.filter((x) => !now.includes(x));
      if (missingFromOutline.length) { kept += missingFromOutline.length; console.log(`  kept ${f.label}: ${missingFromOutline.join(', ')} (in Used by, but the outline does not reference it there)`); }
      const v = merged.size ? sortIds(merged) : 'TBD';
      text[f.usedBy.line - 1] = `- Used by: ${v}`;
      if (v === 'TBD') tbd++; else filled++;
    }
    fs.writeFileSync(figP, text.join('\n'));
    console.log(`backfill: ${filled} Used by line(s) filled, ${tbd} left TBD (unused figures)${kept ? `, ${kept} hand-set slide(s) kept` : ''}`);
  }
}
console.log(`${errors ? 'FAIL' : 'PASS'} - ${lessons.length} lesson(s), ${total} slide(s); ${errors} error(s), ${warns} warning(s)`);
process.exit(errors ? 1 : 0);
