#!/usr/bin/env node
// narration-lint - a pre-audio lint of a lesson's teacher script. Needs no sidecar and no audio.
//
//   node tools/narration-lint.mjs --bundle <id|dir> <L0N | lessons/les-NN.json> [--all] [--full]
//
// --all = every lesson that has narration/<lessonId>.script.json. Output: ERROR <key> <msg>, WARN <key> <msg>,
// note: ...; last line `narration-lint: PASS (N beats, W warn)` or `narration-lint: FAIL (E errors, W warn)`.
// Exit 1 on any ERROR. Output is capped at 100 lines unless --full.
// ERROR: NO-SCRIPT, NO-SAY (spoken beat with no segment), UNKNOWN (block/step not in the lesson), DEICTIC (points at the
//   screen or asks the learner to act, with no cue, await or noScreenRef), CUE-UNKNOWN (cue id the scene/figure does not
//   have), AWAIT (interact without hint; free with closed; closed on a scene that never sends interactDone).
// WARN: HINT-LONG, WAIT-FOCUS, SYMBOLS, DIGITS, LONG, HEADING, PROMPT-ASK, READS-OPTIONS, BARE-OPENER, STALE-OPTOUT.
// note: TERMS (glossary terms first spoken without a definition).
// Rules: docs/narration.md. Beat splitting is the engine's own splitSteps (tools/beat-check/vendor).
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from './sim-test/lib/args.mjs';
import { bundleFromArg } from './sim-test/lib/bundle.mjs';
import { lessonFiles, lessonCodeOf } from './operator/lib/units.mjs';
import { splitSteps } from './beat-check/vendor/splitSteps.js';

const USAGE = 'node tools/narration-lint.mjs --bundle <id|dir> <L0N | lessons/les-NN.json> [--all] [--full]';
const A = parseArgs(process.argv.slice(2), { tool: 'narration-lint', file: import.meta.url, usage: USAGE, val: ['bundle'], bool: ['all', 'full'] });
const B = A.val('bundle') ? bundleFromArg(A.val('bundle')) : null;
if (!B || (!A.pos.length && !A.has('all'))) { console.error(`usage: ${USAGE}`); process.exit(2); }

const readJ = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const en = (v) => (v && typeof v === 'object' ? v.en ?? '' : v ?? '');
const lines = []; let errors = 0, warns = 0, nBeats = 0;
const out = (sev, key, msg) => { if (sev === 'ERROR') errors++; else if (sev === 'WARN') warns++; lines.push(`${sev} ${key} ${msg}`); };

// the engine's deictic list (tools/narration/check-narration.mjs in the engine repo)
const DEICTIC = [
  /\b(?:look|looking) at\b/i, /\b(?:tap|tapping|click|drag|dragging|flip|flipping|toggle|press)\b/i,
  /\b(?:pick|choose|select|try)\b/i, /\b(?:watch|notice)\b/i, /\bon (?:the )?screen\b/i, /\bhere (?:is|are)\b/i,
  /\b(?:look|looking) (?:through|into|closely)\b/i,
  /\b(?:the|this|these) (?:(?:first|second|third|last|left|right|top|bottom|empty) )?(?:bars?|table|columns?|rows?|list|board|picture|drawing|image|photo|figure|lens|chart|graph|diagram|map|slider|handle|switch|dots?|arrows?|strip|register|chips?|cards?|scene|simulation)\b/i,
];
const RESERVED = new Set(['focus.none', 'focus.rest', 'focus.all', 'show.options', 'show.card', 'focus.options', 'focus.card']);
const STOP = new Set('the and for with from that this these those into than then when what which while about your their there where would could should have been were also only more most some such over under after before between because'.split(' '));

// ---- spoken text -------------------------------------------------------------------------------------------------
const CUE_RE = /\[\[([A-Za-z0-9_.+-]+)\]\]/g;
function parseSay(say) {
  const cues = []; let text = '';
  String(say ?? '').split(CUE_RE).forEach((part, i) => {
    if (i % 2) { cues.push({ id: part, words: text.trim() ? text.trim().split(/\s+/).length : 0 }); return; }
    text += part;
  });
  return { text: text.replace(/\s+/g, ' ').trim(), cues };
}
const sentences = (t) => t.split(/(?<=[.?!])\s+/).filter(Boolean);
const wordsOf = (t) => t.toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(Boolean);
const plainMd = (md) => String(md ?? '').replace(/\[\[say:[\s\S]*?\]\]/gi, ' x ').replace(/<!--[\s\S]*?-->/g, ' ').split('\n').filter((l) => !/^\s{0,3}#{1,6}\s/.test(l)).join(' ').replace(/[\s*_>|`-]+/g, ' ').trim();

// ---- lesson -> blocks and spoken beats ----------------------------------------------------------------------------
function loadBlocks(lesson) {
  const res = [];
  for (const ref of lesson.blocks ?? []) {
    let b = ref;
    if (ref.blockRef) { const p = path.join(B, ref.blockRef); if (!fs.existsSync(p)) continue; b = readJ(p); }
    if (!b.id) continue;
    res.push(b);
  }
  return res;
}
function prose(b, field, refField) {
  let md = en(b[field]);
  if (!md && b[refField]) { try { md = fs.readFileSync(path.join(B, b[refField]), 'utf8'); } catch { md = ''; } }
  return md;
}
// -> { beats: [{step, kind}], title }
function spokenBeats(b) {
  const t = b.type ?? '', beats = []; let title = en(b.title) || '';
  const staged = (md) => {
    const { header, steps } = splitSteps(md);
    if (!title && header) title = String(header).replace(/^\s*#+\s*/, '').trim();
    steps.forEach((st, i) => { if (plainMd(st.md)) beats.push({ step: st.id || `b${i + 1}`, kind: 'prose' }); });
  };
  const single = (md, kind = 'prose') => { if (plainMd(md)) beats.push({ step: 'b1', kind }); };
  if (/^content-block@/.test(t)) staged(prose(b, 'markdown', 'markdownRef'));
  else if (/^poe-explain@/.test(t)) staged(prose(b, 'prompt', 'promptRef'));
  else if (/^poe-predict@/.test(t)) { if (plainMd(prose(b, 'prompt', 'promptRef'))) beats.push({ step: 'prompt', kind: 'predict' }); }
  else if (/^reflection@/.test(t)) single(prose(b, 'prompt', 'promptRef'));
  else if (/^text-block@/.test(t)) single(en(b.markdown));
  else if (/^poe-observe-sim@/.test(t)) single(en(b.instructions));
  else if (/^mini-game@/.test(t)) single(en(b.objective));
  else if (/^diagram-explore@/.test(t)) beats.push({ step: 'b1', kind: 'prose' });
  else if (b.stem) { if (plainMd(en(b.stem))) beats.push({ step: 'prompt', kind: 'question' }); }
  return { beats, title };
}
function optionTexts(b) {
  const r = [];
  for (const o of Array.isArray(b.options) ? b.options : []) { const s = typeof o === 'string' ? o : en(o?.text) || en(o); if (typeof s === 'string' && s) r.push(s); }
  return r;
}
function collectIds(o, set = new Set()) {
  if (Array.isArray(o)) o.forEach((x) => collectIds(x, set));
  else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { if (k === 'id' && typeof v === 'string') set.add(v); else if (k === 'gate' || k === 'after' || k === 'aside') set.add(k), collectIds(v, set); else collectIds(v, set); }
  return set;
}

// ---- scene source facts --------------------------------------------------------------------------------------------
const sceneCache = new Map();
function sceneFacts(b) {
  const src = b.simulation?.src || (/^poe-observe-sim@/.test(b.type || '') ? b.src : null);
  if (!src || typeof src !== 'string') return null;
  if (sceneCache.has(src)) return sceneCache.get(src);
  const f = path.join(B, src.replace(/^\/+/, ''));
  let facts = { found: false, src };
  if (!src.startsWith('/') && fs.existsSync(f) && fs.statSync(f).isFile()) {
    const s = fs.readFileSync(f, 'utf8');
    const cm = /static\s+CUES\s*=\s*\[([\s\S]*?)\]/.exec(s);
    const cues = cm ? new Set([...cm[1].matchAll(/['"`]([^'"`]+)['"`]/g)].map((x) => x[1])) : null;
    const tokens = new Set(); let dynamic = /narrationFocus\s*\(/.test(s);
    for (const m of s.matchAll(/data-narr(?![\w-])\s*\\?=\s*\\?["'`]?([^"'`>]*)/g)) {
      if (/\$\{|\+/.test(m[1]) || !m[1].trim()) dynamic = true;
      m[1].split(/\s+/).filter((x) => x && !/\$\{|\+|\\/.test(x)).forEach((x) => tokens.add(x));
    }
    for (const m of s.matchAll(/['"`]data-narr['"`]\s*,\s*([^)]*)\)/g)) {
      if (/^\s*['"][^'"$+]*['"]\s*$/.test(m[1])) m[1].replace(/['"]/g, '').split(/\s+/).filter(Boolean).forEach((x) => tokens.add(x)); else dynamic = true;
    }
    // scenes often tag parts through a local helper (data-narr built there) and name the ids as string literals:
    // take every quoted word of the scene and of its relative imports as a candidate id; a helper that writes data-narr = indirect
    let done = /interactDone\s*(?:\?\.)?\s*\(|scene-interact-done/.test(s), indirect = false;
    const lits = (code) => { for (const m of code.matchAll(/['"`]([A-Za-z0-9_-]+)['"`]/g)) tokens.add(m[1]); };
    lits(s);
    for (const m of s.matchAll(/from\s+['"](\.{1,2}\/[^'"]+)['"]/g)) {
      const hf = path.resolve(path.dirname(f), m[1]);
      let hs = ''; try { hs = fs.readFileSync(hf, 'utf8'); } catch { continue; }
      if (/data-narr(?![\w-])/.test(hs)) { indirect = true; lits(hs); }
      if (/interactDone\s*(?:\?\.)?\s*\(|scene-interact-done/.test(hs)) done = true;
    }
    facts = { found: true, src, cues, tokens, dynamic: dynamic || indirect, done };
  }
  sceneCache.set(src, facts);
  return facts;
}

// ---- glossary ------------------------------------------------------------------------------------------------------
let glossary = [];
try { glossary = (readJ(path.join(B, 'glossary.json')).terms || []).map((t) => ({ id: t.id, names: [t.term, ...(t.match || [])].filter(Boolean) })); } catch { /* none */ }
const DEFINES = /\b(is|are|means|called|we call|stands for)\b/i;

// ---- one lesson ------------------------------------------------------------------------------------------------------
function lessonFile(arg) {
  if (/\.json$/.test(arg)) return path.resolve(B, arg);
  return lessonFiles(B).find((f) => lessonCodeOf(f) === arg.toUpperCase()) || null;
}
const firstUse = new Set(); // glossary ids already spoken (across lessons in a run)
const termNotes = [];
function lintLesson(file, explicit) {
  const lesson = readJ(file), lid = lesson.lessonId ?? lesson.id ?? path.basename(file, '.json');
  const sp = path.join(B, 'narration', `${lid}.script.json`);
  if (!fs.existsSync(sp)) { if (explicit) out('ERROR', lid, 'NO-SCRIPT narration/' + lid + '.script.json does not exist'); return; }
  const script = readJ(sp), segs = script.segments ?? [];
  const blocks = loadBlocks(lesson), byId = new Map(blocks.map((b) => [b.id, b]));
  const segBy = new Map(segs.map((g) => [`${g.block}#${g.step}`, g]));
  const softIds = new Map(); // block -> focus/show ids the lint cannot verify (scene tags parts dynamically)
  const spoken = new Map(); // key -> {b, beat, title, first}
  for (const b of blocks) { const { beats, title } = spokenBeats(b); beats.forEach((bt, i) => spoken.set(`${b.id}#${bt.step}`, { b, ...bt, title, first: i === 0 })); }
  for (const g of segs) {
    const key = `${g.block}#${g.step}`;
    if (!byId.has(g.block)) { out('ERROR', key, 'UNKNOWN block is not in the lesson'); continue; }
    if (!spoken.has(key)) out('ERROR', key, `UNKNOWN step is not a spoken beat of ${g.block}`);
  }
  for (const [key, s] of spoken) {
    nBeats++;
    const g = segBy.get(key);
    if (!g || g.say == null) { out('ERROR', key, 'NO-SAY spoken beat with no "say": the slide text would be read out. Write the teacher line, or "say": "" for a silent beat'); continue; }
    const { text, cues } = parseSay(g.say);
    if (!text) continue;
    const b = s.b, isAsk = s.kind === 'question' || s.kind === 'predict';
    const facts = sceneFacts(b);
    const figIds = collectIds([b.figure, b.graph, b.diagram]);
    const cover = b.narrationCover?.[s.step];
    const coverIds = new Set(); if (cover) { (cover.frames || []).forEach((f) => f.cue && coverIds.add(f.cue)); if (cover.until) coverIds.add(cover.until); }
    const hasMedium = !!(b.simulation || b.figure || b.graph || b.diagram || b.image?.src || b.photoDiagram);

    // DEICTIC
    if (!isAsk && !cues.length && !g.await) {
      const hits = DEICTIC.map((re) => text.match(re)?.[0]).filter(Boolean);
      if (hits.length && !g.noScreenRef) out('ERROR', key, `DEICTIC "${hits.join('", "')}" with no cue and no await: add a [[cue]] where the thing is named, "await": "interact" with a "hint", or "noScreenRef": "<reason>"`);
    }
    // CUE-UNKNOWN
    for (const c of cues) {
      if (RESERVED.has(c.id)) continue;
      const m = /^(focus|show)\.(.+)$/.exec(c.id);
      if (m) {
        const unknown = m[2].split('+').filter((id) => !(facts?.tokens?.has(id) || figIds.has(id) || coverIds.has(c.id) || id === 'options' || id === 'card'));
        if (!unknown.length || RESERVED.has(c.id)) continue;
        if (coverIds.has(c.id)) continue;
        const soft = (facts && (!facts.found || facts.dynamic)) || (b.simulation && !facts);
        if (soft) { const k = b.id; if (!softIds.has(k)) softIds.set(k, { src: facts?.src, ids: new Set() }); unknown.forEach((u) => softIds.get(k).ids.add(u)); }
        else out('ERROR', key, `CUE-UNKNOWN [[${c.id}]]: ${unknown.join(', ')} is not a data-narr id of ${facts?.src || 'any scene'}, nor a figure/graph item`);
      } else if (!(facts?.cues?.has(c.id) || figIds.has(c.id) || coverIds.has(c.id))) {
        const soft = facts && !facts.found;
        out(soft ? 'WARN' : 'ERROR', key, `CUE-UNKNOWN${soft ? ' cannot verify' : ''} [[${c.id}]]: not in ${facts?.src ? facts.src + ' static CUES' : 'static CUES (no scene on this block)'}, nor a figure item, gate/after, or narrationCover cue`);
      }
    }
    // AWAIT
    if (g.await === 'interact' && !String(g.hint || '').trim()) out('ERROR', key, 'AWAIT "await": "interact" needs a "hint" (the task in under 10 words)');
    if (g.free && g.closed) out('ERROR', key, 'AWAIT "free" and "closed" are both set: pick one');
    if (g.closed === true && !/^mini-game@/.test(b.type || '') && !(facts?.found && facts.done)) out('ERROR', key, `AWAIT "closed": true needs a scene that calls interactDone( or dispatches scene-interact-done${facts?.found ? '' : ' (no scene source found)'}`);
    if (g.hint && g.hint.trim().split(/\s+/).length > 10) out('WARN', key, 'HINT-LONG hint over 10 words');
    if (g.await === 'interact') {
      const fc = cues.map((c) => c.id).filter((id) => /^(focus|show)\./.test(id));
      if (fc.length && cues.map((c) => c.id).lastIndexOf('focus.all') < cues.map((c) => c.id).lastIndexOf(fc[fc.length - 1])) out('WARN', key, 'WAIT-FOCUS the wait follows focus/show cues with no [[focus.all]] after the last: the learner must see what the task uses');
    }
    // wording
    const sym = [];
    if (/\b\d+[A-Za-z]+\b/.test(text)) sym.push('digit+letter');
    if (/\b[A-Za-z]\s?\+\s?[A-Za-z]\b/.test(text)) sym.push('a+c');
    if (/%/.test(text)) sym.push('%'); if (/=/.test(text)) sym.push('='); if (/[<>]/.test(text)) sym.push('< >');
    if (/\d\/\d/.test(text)) sym.push('n/n'); if (/\bn\.s\./i.test(text)) sym.push('n.s.'); if (/&/.test(text)) sym.push('&');
    if (sym.length) out('WARN', key, `SYMBOLS ${sym.join(' ')}: say it in words`);
    const digs = text.match(/\d[\d,.]*\d|\d/g);
    if (digs) out('WARN', key, `DIGITS ${[...new Set(digs)].slice(0, 8).join(' ')}: prefer words`);
    const nw = text.split(/\s+/).length;
    if (nw > 180) out('WARN', key, `LONG ${nw} words (about ${Math.round(nw / 3)} s): split the beat`);
    if (s.title) {
      const tw = [...new Set(wordsOf(s.title).filter((w) => w.length > 3 && !STOP.has(w)))];
      const fw = new Set(wordsOf(sentences(text)[0] || ''));
      if (tw.length >= 2 && tw.filter((w) => fw.has(w)).length / tw.length >= 0.7) out('WARN', key, `HEADING first sentence repeats the title "${s.title.slice(0, 50)}": headings are never spoken`);
    }
    if (isAsk) {
      const last = sentences(text).pop() || '';
      if (!/\?["')]*$/.test(last)) out('WARN', key, 'PROMPT-ASK the last sentence is not a question: end the prompt on the ask itself');
      const pw = wordsOf(text);
      for (const o of optionTexts(b)) {
        const ow = wordsOf(o); let hit = false;
        for (let i = 0; i + 6 <= ow.length && !hit; i++) { const gram = ow.slice(i, i + 6).join(' '); for (let j = 0; j + 6 <= pw.length; j++) if (pw.slice(j, j + 6).join(' ') === gram) { hit = true; break; } }
        if (hit) { out('WARN', key, `READS-OPTIONS the prompt repeats option text "${o.slice(0, 40)}": options are never read`); break; }
      }
    }
    if (s.first && !isAsk && !cover) {
      const open = cues.length ? cues[0].words : nw;
      if (open >= 12 && (!cues.length ? !hasMedium : (/^show\./.test(cues[0].id) || !hasMedium))) out('WARN', key, `BARE-OPENER opens on words alone for ~${open} words: put the scene on screen dimmed (focus. not show.), or add a narrationCover`);
    }
    if (g.noScreenRef && /text slide|no scene|no picture/i.test(g.noScreenRef) && (b.simulation || b.figure)) out('WARN', key, 'STALE-OPTOUT noScreenRef says there is no scene or picture, but the block has one: cue it instead');
    // glossary: first spoken use
    for (const t of glossary) {
      if (firstUse.has(t.id)) continue;
      for (const sent of sentences(text)) {
        if (t.names.some((n) => new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(sent))) {
          firstUse.add(t.id);
          if (!DEFINES.test(sent)) termNotes.push(`${t.id}@${key}`);
          break;
        }
      }
    }
  }
  for (const [bid, v] of softIds) out('WARN', bid, `CUE-UNKNOWN cannot verify ${v.ids.size} focus/show id(s) (${[...v.ids].slice(0, 6).join(', ')}${v.ids.size > 6 ? ', ...' : ''}): ${v.src ? v.src + ' tags parts dynamically' : 'no scene source'}`);
}

const targets = [];
if (A.has('all')) {
  for (const f of lessonFiles(B)) { try { const l = readJ(f); const lid = l.lessonId ?? l.id; if (fs.existsSync(path.join(B, 'narration', `${lid}.script.json`))) targets.push([f, false]); } catch { /* validator's job */ } }
  if (!targets.length) lines.push('note: no lesson in this bundle has a narration script');
}
for (const a of A.pos) { const f = lessonFile(a); if (!f || !fs.existsSync(f)) { console.error(`narration-lint: no lesson "${a}" in ${B}`); process.exit(2); } targets.push([f, true]); }
for (const [f, ex] of targets) lintLesson(f, ex);
if (termNotes.length) lines.push(`note: TERMS first spoken without a definition (${termNotes.length}): ${termNotes.slice(0, 8).join(', ')}${termNotes.length > 8 ? ', ...' : ''} - define it when first spoken: the glossary is text-mode only`);

const rank = (l) => (l.startsWith('ERROR') ? 0 : l.startsWith('WARN') ? 1 : 2);
const sorted = lines.map((l, i) => [l, i]).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).map((x) => x[0]);
const cap = A.has('full') ? sorted.length : 100;
sorted.slice(0, cap).forEach((l) => console.log(l));
if (sorted.length > cap) console.log(`note: ${sorted.length - cap} more lines hidden (--full shows all)`);
console.log(errors ? `narration-lint: FAIL (${errors} errors, ${warns} warn)` : `narration-lint: PASS (${nBeats} beats, ${warns} warn)`);
process.exit(errors ? 1 : 0);
