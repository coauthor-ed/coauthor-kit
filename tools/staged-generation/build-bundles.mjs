#!/usr/bin/env node
// build-bundles - join START-HERE.md, a stage's brief and the kit docs that brief names into ONE file per stage
// (Stage 3: per pass and per guide family), so an agent reads one file in one turn instead of 15-20 reads.
//
//   node tools/staged-generation/build-bundles.mjs            write briefs/bundles/*.md
//   node tools/staged-generation/build-bundles.mjs --check    exit 1 if any bundle is missing or stale (CI, pre-commit)
//   node tools/staged-generation/build-bundles.mjs --list     names, sizes in tokens (chars/4), no writing
//   [--repo <dir>]                                            the content-repo-template checkout (default: cwd)
// Optional repo-root profile.json {look, audience} picks the look card and an audience card (lib/profile.mjs); absent = quill + school.
// The mini-game doc follows the look (left out under plain); the CBSE descriptive-marks section follows the audience.
//
// The files are generated and committed (the template is copied into content repos): never edit them by hand,
// edit the sources and rebuild. Every bundle STARTS with START-HERE.md and the next sections come in a fixed,
// most-shared-first order, so bundles share a byte-identical prefix and a provider's prompt cache can hit across
// agents. Volatile things (the stub, scene-info, the slide prose, the course files) are never bundled.
// next.mjs --bundled-docs points each unit at its bundle (family from tools/staged-generation/lib/families.mjs).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readProfile } from './lib/profile.mjs';

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const val = (n) => { const i = argv.indexOf(n); return i < 0 ? null : argv[i + 1]; };
const REPO = path.resolve(val('--repo') || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..'));
const OUT = path.join(REPO, 'briefs', 'bundles');
let PROFILE;
try { PROFILE = readProfile(REPO); } catch (e) { console.error(e.message); process.exit(2); }
const AUD = PROFILE.audienceCard ? [PROFILE.audienceCard] : [];
// Quill is the default look the bundles already assume; only another look adds its card to the stages that lack it.
const LK = PROFILE.look !== 'quill' ? [PROFILE.lookCard] : [];
// Games follow the look: the mini-game doc is left out under plain (read from disk if a lesson plans a game). The CBSE mark-band
// section of the descriptive doc follows the audience: dropped for a non-school bundle, its rubric mechanics stay.
const SCHOOL = PROFILE.audience === 'school';
const MINI_GAMES = PROFILE.look !== 'plain' ? ['docs/mini-games.md'] : [];
const DESCRIPTIVE = SCHOOL ? ['docs/descriptive-questions-and-cbse-marks.md']
  : [{ doc: 'docs/descriptive-questions-and-cbse-marks.md', sections: ['Quality bar', '`level3`', '`mode`', 'Hard numerical', 'Math-heavy', 'Verify the rubric'] }];

// ---- the manifest -------------------------------------------------------------------------------------------
// A source is a file path (whole file) or { doc, sections: [..] } (what `node tools/doc-section.mjs doc ".."` prints).
const S = (doc, ...sections) => ({ doc, sections });
const SA = 'docs/simulation-authoring.md';
const DSK = 'docs/dom-scene-kit.md';
const HEAD = ['START-HERE.md'];
const S3 = 'briefs/stage3';
const R = 'briefs/reference';
// The look every Stage 3 pass draws or judges against: look-free rules + the profile's look card (packs/look/README.md;
// profile.json, default quill). An audience card (none for school) rides right after it.
const LOOK = ['docs/look-base.md', PROFILE.lookCard, ...AUD];

// Per guide family: the guide(s), the doc sections the guide tells the agent to read, whether the people/props add-ons ride
// along, and the slices of the guide a VERIFY pass needs (its Rules and Commands; it skips the kit API listing).
// svg carries geom.md whole plus the Rules of the data parts (chart.md, table.md; ~0.4K tokens, not their APIs or the time axis, to stay under
// ~24K; simulation-authoring 3.5 is left out: INDEX.md and kit-parts.md route the same shapes): a stub with Component: NumberLine / Chart / Chance / Venn / Table opens that guide from disk (svg.md says so).
// svg verify gets the Rules of every SvgScene component guide: it judges whichever the stub names.
const GC = 'Commands for this kind';
const SVG_DATA = [S(`${S3}/chart.md`, 'Rules'), S(`${S3}/table.md`, 'Rules')];
const SVG_RULES = [S(`${S3}/geom.md`, 'Rules'), S(`${S3}/numberline.md`, 'Rules'), S(`${S3}/chart.md`, 'Rules', 'Time axis'), S(`${S3}/table.md`, 'Rules'), S(`${S3}/chance.md`, 'Rules'), S(`${S3}/venn.md`, 'Rules')];
const FAMILY = {
  canvas: { guides: [`${S3}/canvas.md`], docs: [S(SA, '3.4 Coming', '4.5 House', '4.6 The look kit')], addons: false, verify: [S(`${S3}/canvas.md`, 'Rules', GC)] },
  svg: { guides: [`${S3}/svg.md`, `${S3}/geom.md`, ...SVG_DATA], docs: [S(DSK, '5. Checks', '6. Do not')], addons: false, verify: [S(`${S3}/svg.md`, 'Rules', GC), ...SVG_RULES] },
  dom: { guides: [`${S3}/dom.md`], docs: [DSK, S(SA, '3.3 DOM'), S('docs/numericals.md', '2. A worked', '4. Affordance')], addons: false, verify: [S(`${S3}/dom.md`, 'Rules', GC)] },
  boards: { guides: [`${S3}/boards.md`], docs: [S(SA, '3.3 DOM', '3.5 Kit components')], addons: true, verify: [S(`${S3}/boards.md`, 'Rules', GC)] },
  game: { guides: [`${S3}/game.md`], docs: [S('docs/mini-games.md', 'Rounds')], addons: true, verify: [S(`${S3}/game.md`, 'Rules', GC)] },
  geo: { guides: [`${S3}/geo.md`], docs: [S(SA, '3.2 3D', '3.1 Maps')], addons: true, verify: [S(`${S3}/geo.md`, 'Rules')] },
};
const ADDONS = [`${S3}/people.md`, `${S3}/props.md`];

const BUNDLES = {
  stage1a: [...HEAD, 'briefs/stage1a-source-scan.md', ...AUD, S('docs/generation-playbook.md', '1. Read the source', 'Keep a running generation log'), 'examples/FIGURES.md'],
  stage1b: [...HEAD, 'briefs/stage1b-outline.md', 'docs/pedagogy.md', ...AUD, ...LK, S('docs/generation-playbook.md', '2. Draft'), `${R}/engine-capabilities.md`, ...MINI_GAMES, `${R}/kit-parts.md`, S('docs/numericals.md', '3. Emphasis')],
  stage2: [...HEAD, 'briefs/stage2-lesson.md', 'AGENTS.md', '.agents/skills/content-authoring/SKILL.md', 'docs/voice-and-tone.md', ...AUD, ...LK, 'docs/pedagogy.md',
    S('docs/generation-playbook.md', '3. Write the block', '4. Write the question', '5. Write the lesson'), S(SA, 'Static images per beat', 'smell', '4. Attaching'),
    'docs/figures.md', 'docs/numericals.md', `${R}/stub-format.md`, 'briefs/showcase/EXAMPLE-stub.md'],
  stage4: [...HEAD, 'briefs/stage4-module.md', ...AUD, ...LK, S('docs/generation-playbook.md', '6. Write the module', '7. Validate'), 'examples/example-module.json'],
  bank1: [...HEAD, 'briefs/bank1-plan.md', ...AUD, 'AGENTS.md', 'docs/question-bank-generation.md'],
  bank2: [...HEAD, 'briefs/bank2-questions.md', 'AGENTS.md', 'docs/question-bank-generation.md', 'docs/voice-and-tone.md', ...AUD, 'docs/pedagogy.md',
    '.agents/skills/content-authoring/SKILL.md', ...DESCRIPTIVE, 'docs/copyright-and-sourcing.md'],
  bank3: [...HEAD, 'briefs/bank3-assemble.md', ...AUD, S('docs/question-bank-generation.md', 'Assemble'), 'examples/example-bank.json', 'examples/example-bank-multi-chapter.json'],
  // Stage 3: START-HERE, scene-rules, gotchas are the shared prefix of every pass (most shared first).
  // look: scene-rules only when an edit needs it (read from disk); verify: the rubric only when it looks (not Look: later).
  'stage3-look': [...HEAD, ...LOOK, `${R}/look-rubric.md`, 'briefs/stage3-look.md'],
  'stage3-sanity': [...HEAD, `${R}/scene-rules.md`, `${R}/gotchas.md`, ...AUD, 'briefs/stage3-sanity.md'],
  'stage3-arcade': [...HEAD, `${R}/scene-rules.md`, `${R}/gotchas.md`, ...LOOK, 'briefs/stage3-simulation.md', `${S3}/arcade.md`, 'docs/arcade-games.md', `${R}/look-rubric.md`],
};
for (const [fam, f] of Object.entries(FAMILY)) {
  BUNDLES[`stage3-build-${fam}`] = [...HEAD, `${R}/scene-rules.md`, `${R}/gotchas.md`, ...LOOK, 'briefs/stage3-build.md', `${S3}/INDEX.md`, `${R}/kit-parts.md`,
    'briefs/showcase/EXAMPLE-stub.md', 'briefs/showcase/EXAMPLE-design-note.md', ...f.guides, ...(f.addons ? ADDONS : []), ...f.docs, S(`${R}/probe-cookbook.md`, 'Minimal probe template')];
  // One-run (--one-pass): build, verify and look in one session, so the build bundle plus the verify extras and the rubric.
  BUNDLES[`stage3-simulation-${fam}`] = [...HEAD, `${R}/scene-rules.md`, `${R}/gotchas.md`, ...LOOK, 'briefs/stage3-simulation.md', `${S3}/INDEX.md`, `${R}/kit-parts.md`,
    'briefs/showcase/EXAMPLE-stub.md', 'briefs/showcase/EXAMPLE-design-note.md', ...f.guides, ...(f.addons ? ADDONS : []), ...f.docs, `${R}/probe-cookbook.md`, `${R}/look-rubric.md`];
  // Verify: no gotchas.md (a build-time list), the guide's Rules + Commands only. START-HERE stays whole: its H1 spans the file,
  // a slice would break the byte-identical prefix every bundle shares (and saves ~0.6K tokens).
  BUNDLES[`stage3-verify-${fam}`] = [...HEAD, `${R}/scene-rules.md`, ...LOOK, 'briefs/stage3-verify.md', `${R}/probe-cookbook.md`, ...f.verify];
}

// ---- building -----------------------------------------------------------------------------------------------
const norm = (t) => t.replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(/[ \t]+$/, '')).join('\n').replace(/\n+$/, '\n');

function sourceText(src) {
  if (typeof src === 'string') {
    const f = path.join(REPO, src);
    if (!fs.existsSync(f)) throw new Error(`missing source: ${src}`);
    return { label: `FILE: ${src}`, text: norm(fs.readFileSync(f, 'utf8')) };
  }
  const out = execFileSync(process.execPath, [path.join(REPO, 'tools', 'doc-section.mjs'), src.doc, ...src.sections], { cwd: REPO, encoding: 'utf8' });
  return { label: `SECTION: ${src.doc} :: ${src.sections.map((s) => `"${s}"`).join(' ')}`, text: norm(out) };
}

function build(name, sources) {
  const parts = sources.map((s) => sourceText(s));
  const body = parts.map((p) => `=== ${p.label} ===\n${p.text}`).join('\n');
  const hash = crypto.createHash('sha256').update(body).digest('hex').slice(0, 16);
  const info = `\n=== BUNDLE INFO ===\nbundle ${name}, sha256 ${hash}. GENERATED by tools/staged-generation/build-bundles.mjs from:\n${parts.map((p) => `- ${p.label.replace(/^(FILE|SECTION): /, '')} (${p.text.length} chars)`).join('\n')}\nDo not edit: change the sources and rebuild. Everything above is the full text of those sources; do not open them again.\n`;
  return body + info;
}

let stale = 0;
const STAMP = path.join(OUT, '.profile');
const stampText = JSON.stringify({ look: PROFILE.look, audience: PROFILE.audience }) + '\n';
const rows = [];
for (const [name, sources] of Object.entries(BUNDLES)) {
  const text = build(name, sources);
  const file = path.join(OUT, `${name}.md`);
  rows.push({ name, tokens: Math.round(text.length / 4) });
  if (flag('--list')) continue;
  const cur = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  if (flag('--check')) { if (cur !== text) { stale += 1; console.error(`STALE: briefs/bundles/${name}.md`); } continue; }
  fs.mkdirSync(OUT, { recursive: true });
  if (cur !== text) fs.writeFileSync(file, text);
}
if (!flag('--check') && !flag('--list')) { fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(STAMP, stampText); }
if (flag('--check')) {
  const had = fs.existsSync(STAMP) ? fs.readFileSync(STAMP, 'utf8') : null;
  if (had !== stampText) { stale += 1; console.error(`STALE: briefs/bundles/.profile is ${had ? had.trim() : 'missing'}, current profile is ${stampText.trim()}`); }
  // A bundle file with no manifest entry is also stale (a removed family or stage).
  const known = new Set(Object.keys(BUNDLES).map((n) => `${n}.md`));
  if (fs.existsSync(OUT)) for (const f of fs.readdirSync(OUT)) if (f.endsWith('.md') && !known.has(f)) { stale += 1; console.error(`STALE: briefs/bundles/${f} has no manifest entry`); }
  if (stale) { console.error(`${stale} bundle(s) out of date. Fix: node tools/staged-generation/build-bundles.mjs   (then commit the result)`); process.exit(1); }
  console.log(`bundles up to date (${rows.length})`);
} else {
  const big = rows.filter((r) => r.tokens > 24000);
  console.log(rows.map((r) => `${r.name.padEnd(26)} ~${(r.tokens / 1000).toFixed(1)}K tokens`).join('\n'));
  if (big.length) console.error(`note: over ~24K tokens (a read tool may truncate; the invocation tells the agent to read in chunks): ${big.map((r) => r.name).join(', ')}`);
  if (!flag('--list')) console.log(`wrote ${rows.length} bundles to briefs/bundles/`);
}
