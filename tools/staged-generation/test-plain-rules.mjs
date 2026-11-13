#!/usr/bin/env node
// test-plain-rules - fixture checks for the plain / college rules (packs/look/plain/CARD.md 13-16), on synthetic bundles in a temp dir.
//   node tools/staged-generation/test-plain-rules.mjs        PASS/FAIL per check; exit 1 on any FAIL
//
//   - prose-lint: game words fire in a plain bundle (prose .md, block title, scene string, CHALLENGE label), not in a quill bundle,
//     not on "plays a role", "significance level", "z-score", class names, comments or static NOTES; a clean plain bundle has none
//   - outline-lint: a plain scene slide without Shows / Without it is an ERROR (WARN under quill); a decoration line WARNs;
//     a Text only slide naming its device passes
//   - lesson-check: a plain stub with tap-to-open only and Run shows none WARNs "decoration"; a stub with a slider does not
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
let fails = 0, n = 0;
const t = (name, ok, extra = '') => { n++; if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n      ${String(extra).slice(0, 600)}`}`); };
const run = (tool, args) => { const r = spawnSync(process.execPath, [path.join(ROOT, tool), ...args], { encoding: 'utf8', cwd: ROOT }); return (r.stdout || '') + (r.stderr || ''); };

const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'test-plain-rules-'));
const W = (rel, text) => { const f = path.join(repo, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, typeof text === 'string' ? text : JSON.stringify(text, null, 1)); };

const DIRTY_MD = 'How the game on the next slide works.\n\nConfounding plays a role here, and the significance level is 0.05; a z-score is fine.\n\n<!-- STEP -->\n\nMove the slider and check your score.\n';
const CLEAN_MD = 'How the exercise on the next slide works.\n\nConfounding plays a role here, and the significance level is 0.05; a z-score is fine.\n\n<!-- STEP -->\n\nMove the slider and check the ratio.\n';
const DIRTY_JS = "// a game scene (comment: ignored)\nexport class FxScene {\n  static NOTES = ['the game note is not learner text'];\n  static ARIA_LABEL = 'A matching game over twelve files';\n  render() { return `<div class=\"game-board spn\"><span class=\"badge\">CHALLENGE</span><p>Find the range.</p></div>`; }\n}\n";
const CLEAN_JS = "// a game scene (comment: ignored)\nexport class FxScene {\n  static NOTES = ['the game note is not learner text'];\n  static ARIA_LABEL = 'A matching exercise over twelve files';\n  render() { return `<div class=\"game-board spn\"><span class=\"tag\">EXERCISE</span><p>Find the range.</p></div>`; }\n}\n";

function bundle(id, { look, md, js, title }) {
  const B = `courses/${id}`;
  W(`${B}/bundle.json`, { bundleId: id, title: id, subject: 'epidemiology', ...(look ? { look } : {}) });
  W(`${B}/lessons/les-01.json`, { id: 'les-01', type: 'lesson', title: { en: 'Odds, not risk' }, blocks: [{ blockRef: 'blocks/L01/blk-l01-s01.json' }] });
  W(`${B}/blocks/L01/blk-l01-s01.json`, { id: 'blk-l01-s01', type: 'content-block@1', title: { en: title }, markdownRef: 'blocks/L01/blk-l01-s01.md', simulation: { src: 'simulations/L01/FxScene.js', position: 'below' }, _comment: 'a game note for agents', authoring: { status: 'ai-draft' } });
  W(`${B}/blocks/L01/blk-l01-s01.md`, md);
  W(`${B}/simulations/L01/FxScene.js`, js);
  return path.join(repo, B);
}

try {
  W('AGENTS.md', 'x\n');
  const dirty = bundle('fx-plain', { look: 'plain', md: DIRTY_MD, js: DIRTY_JS, title: 'Level 2: the odds game' });
  const clean = bundle('fx-clean', { look: 'plain', md: CLEAN_MD, js: CLEAN_JS, title: 'When the odds ratio matches the risk ratio' });
  const quill = bundle('fx-quill', { look: null, md: DIRTY_MD, js: DIRTY_JS, title: 'Level 2: the odds game' });

  // prose-lint
  const pd = run('tools/prose-lint.mjs', ['--bundle', dirty, '--json']);
  const hits = (JSON.parse(pd.slice(pd.indexOf('['))) || []).filter((l) => /game word/.test(l));
  const has = (re) => hits.some((l) => re.test(l));
  t('prose-lint fires on "game" in the prose .md', has(/blk-l01-s01\.md: game word "game"/), hits.join('\n'));
  t('prose-lint fires on "your score" in the prose .md', has(/game word "your score"/), hits.join('\n'));
  t('prose-lint fires on the block title (Level 2, game)', has(/json en: game word "Level 2"/) && has(/json en: game word "game"/), hits.join('\n'));
  t('prose-lint fires on scene strings (ARIA label, CHALLENGE badge)', has(/FxScene\.js: game word "game"/) && has(/FxScene\.js: game word "CHALLENGE"/), hits.join('\n'));
  t('prose-lint skips "plays a role", "significance level", "z-score"', !has(/"plays"|"level"|"z-score"|"score"/), hits.join('\n'));
  t('prose-lint skips comments, static NOTES, class names and _comment', !hits.some((l) => /note is not|comment|game-board|for agents/.test(l)), hits.join('\n'));
  t('prose-lint fires exactly 6 times on the dirty fixture', hits.length === 6, `${hits.length}\n${hits.join('\n')}`);
  const pc = run('tools/prose-lint.mjs', ['--bundle', clean, '--json']);
  t('prose-lint passes the clean plain fixture (0 game words)', !/game word/.test(pc), pc);
  const pq = run('tools/prose-lint.mjs', ['--bundle', quill, '--json']);
  t('prose-lint ignores game words in a quill course', !/game word/.test(pq), pq);

  // outline-lint
  const outline = (shows) => `# OUTLINE - fx\nProfile: lite - data\nLook: plain\n\n## L01 - Odds, not risk\nArc: a, b, c.\n`
    + `- **s01** - explain - \`content-block@1\` - **sim** \`FxScene\` (SvgScene) - ${shows}the learner slides controls per case from 1 to 4 and the row share moves\n`
    + '- **s02** - explain - `content-block@1` - **sim** `BoardScene` (SvgScene) - Shows: the odds ratio card on the case board; Without it: the number has no home on the board - the card with 13.2 is pinned to the board\n'
    + '- **s03** - explain - `content-block@1` - **neither** (Text only: worked steps; the calculation is the content) - OR = (14 x 51) / (9 x 6)\n'
    + '\n## Lesson list\n- L01 - Odds, not risk (3 slides)\n';
  W('courses/fx-plain/OUTLINE.md', outline(''));
  const o1 = run('tools/staged-generation/outline-lint.mjs', [dirty]);
  t('outline-lint: plain scene slide without Shows is an ERROR', /ERROR line \d+: L01 s01: scene slide without "Shows:/.test(o1) && /^FAIL/m.test(o1), o1);
  t('outline-lint: decoration line WARNs (s02)', /L01 s02: the scene names no learner action/.test(o1), o1);
  t('outline-lint: Text only with worked steps passes (s03)', !/L01 s03/.test(o1), o1);
  W('courses/fx-plain/OUTLINE.md', outline('Shows: the row share moves while the column rates stay put; Without it: the learner never sees why a case-control "risk" is meaningless - '));
  const o2 = run('tools/staged-generation/outline-lint.mjs', [dirty]);
  t('outline-lint: a plain slide with Shows and Without it passes', !/L01 s01/.test(o2), o2);
  W('courses/fx-quill/OUTLINE.md', outline('').replace('Look: plain', 'Look: quill'));
  const o3 = run('tools/staged-generation/outline-lint.mjs', [quill]);
  t('outline-lint: quill scene slide without Shows is a WARN, not an ERROR', /WARN  line \d+: L01 s01: scene slide without/.test(o3) && !/ERROR/.test(o3), o3);

  // lesson-check (stub decoration)
  const stub = (dials, run) => `# FxScene - simulation stub\nSave path: simulations/L01/FxScene.js\nAttached by: blk-l01-s01 (explain)\nBeats: 2\nBase class: SvgScene (cards)\nHero: a board\nDials: ${dials}\nRun shows: ${run}\nNote card: none\nMust get right:\n- (slide) 13.2. Check: text\nNot yet taught: none\nReuse: none\nSelf-check: counts ok, arithmetic ok, no contradictions\n\n## Per beat\n- beat 0: board\n- beat 1: open\n\n## Verbatim slide markdown\n### blk-l01-s01\n\`\`\`markdown\n${DIRTY_MD.trim()}\n\`\`\`\n\nShared helper: none\n`;
  fs.rmSync(path.join(dirty, 'simulations/L01/FxScene.js'));
  W('courses/fx-plain/simulations/L01/FxScene.stub.md', stub('none in the host strip. In the scene: tap the newest card to open it; tapping again closes it.', 'none (a card opens, 250 ms).'));
  const l1 = run('tools/staged-generation/lesson-check.mjs', [dirty, 'L01']);
  t('lesson-check: tap-to-open stub with Run shows none WARNs decoration', /WARN FxScene: decoration\?/.test(l1), l1);
  W('courses/fx-plain/simulations/L01/FxScene.stub.md', stub('controls per case, 1 to 4, step 1, default 1 (a slider in the scene).', 'none; the row share moves on each turn.'));
  const l2 = run('tools/staged-generation/lesson-check.mjs', [dirty, 'L01']);
  t('lesson-check: a slider stub does not WARN decoration', !/decoration\?/.test(l2), l2);
} finally {
  fs.rmSync(repo, { recursive: true, force: true });
}
console.log(`\n${fails ? 'FAIL' : 'PASS'} - ${n - fails}/${n} checks`);
process.exit(fails ? 1 : 0);
