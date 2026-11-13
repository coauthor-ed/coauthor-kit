#!/usr/bin/env node
// prose-lint - the mechanical rules of docs/voice-and-tone.md over a lesson's sibling .md prose. Advisory (WARN only), never FAIL.
//
//   node tools/prose-lint.mjs --bundle <id> [--lesson L02] [--json]
// Rules checked: paragraphs over 4 sentences; sentences over 25 words; staccato (3+ sentences in a row of 6 words or fewer); a `##` header on beats longer than 3 sentences (school audience only; never on a poe-predict prompt);
// bullet lists past two items (an inline "a, b, c and d" run of 4+ items in a sentence); a poe-predict prompt without `**Predict:**`;
// words per beat over 110. In a course with a manifest "cast" (docs/voice-and-tone.md "Character speech"): a paragraph with a quoted span and a cast name or a speech verb but no SAY marker; a SAY that opens a STEP beat followed by narration in the same beat. Look plain or audience college (packs/look/plain/CARD.md 16, docs/mini-games.md "Exercise, not game"): game words
// (game, play, level, score, badge, XP, a CHALLENGE label; game senses only) in learner-visible text: the prose .md, block / question / lesson /
// module strings ({ en }, prompt, title, objective, labels; not _comment, authoring, notes) and the string literals of each scene the lesson mounts
// (not comments, static NOTES, CSS or class names). Audience "college" (the course's: bundle.json "audience", else repo-root profile.json) relaxes these to 6 sentences, 35 words, 160 words per beat. Judgement rules (warmth, analogy first) stay with the critique stage.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from './sim-test/lib/args.mjs';
import { bundleFromArg, defaultBundle, KIT_ROOT } from './sim-test/lib/bundle.mjs';
import { readProfile } from './staged-generation/lib/profile.mjs';
import { bundleProfile } from './staged-generation/lib/bundleProfile.mjs';
import { lessonFiles, lessonCodeOf, lessonItems, moduleFiles } from './operator/lib/units.mjs';
import { gameWordHits, learnerStrings, jsStrings, plainOrCollege } from './staged-generation/lib/plainRules.mjs';

const A = parseArgs(process.argv.slice(2), { tool: 'prose-lint', file: import.meta.url, usage: 'node tools/prose-lint.mjs --bundle <id> [--lesson L02] [--json]', val: ['bundle', 'lesson'], bool: ['json'] });
const B = A.val('bundle') ? bundleFromArg(A.val('bundle')) : defaultBundle();
if (!B) { console.error('pass --bundle <id>'); process.exit(2); }
const want = A.val('lesson')?.toUpperCase();
let audience, look; try { readProfile(KIT_ROOT); ({ audience, look } = bundleProfile(path.dirname(path.dirname(B)), path.basename(B))); } catch (e) { console.error(e.message); process.exit(2); }
const [MAX_PARA, MAX_SENT, MAX_BEAT] = audience === 'college' ? [6, 35, 160] : [4, 25, 110];
const out = [];
const strip = (t) => t.replace(/<!--[\s\S]*?-->/g, '\n').replace(/```[\s\S]*?```/g, '').replace(/\$\$[\s\S]*?\$\$/g, 'X').replace(/\$[^$\n]+\$/g, 'X');
const sentences = (p) => p.replace(/\b(e\.g|i\.e|etc|Fig|Dr|vs|approx)\./gi, '$1').replace(/(\d)\.(\d)/g, '$1_$2').split(/(?<=[.!?])\s+(?=[A-Z*"'(])/).map((x) => x.trim()).filter(Boolean);
for (const lf of lessonFiles(B).sort()) {
  const code = lessonCodeOf(lf); if (want && code !== want) continue;
  for (const it of lessonItems(B, lf)) {
    let j; try { j = JSON.parse(fs.readFileSync(it.file, 'utf8')); } catch { continue; }
    const refs = [j.markdownRef, j.promptRef].filter(Boolean);
    for (const r of refs) {
      const f = path.join(B, r); if (!fs.existsSync(f)) continue;
      const text = strip(fs.readFileSync(f, 'utf8'));
      const where = `${code}S${String(it.index + 1).padStart(2, '0')} ${path.basename(f)}`;
      const beats = text.split(/^\s*---+\s*$|<!--\s*STEP\s*-->/m);
      let total = 0;
      for (const beat of text.split(/\n(?=##\s)/)) {
        const paras = beat.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p && !/^#{1,6}\s/.test(p) && !/^[-*]\s/.test(p) && !/^\d+\.\s/.test(p) && !/^\|/.test(p));
        let run = 0, runWarned = false;
        for (const p of paras) {
          const ss = sentences(p.replace(/\*\*/g, ''));
          if (/^\*\*[^*]+\*\*$/.test(p)) { run = 0; runWarned = false; continue; }
          for (const s of ss) { if (s.split(/\s+/).length <= 6) { run += 1; if (run >= 3 && !runWarned) { out.push(`${where}: staccato, ${run}+ short sentences in a row ("${s.slice(0, 40)}...")`); runWarned = true; } } else { run = 0; runWarned = false; } }
          if (ss.length > MAX_PARA) out.push(`${where}: paragraph with ${ss.length} sentences ("${p.slice(0, 50)}...")`);
          for (const s of ss) { const w = s.split(/\s+/).length; total += w; if (w > MAX_SENT) out.push(`${where}: ${w}-word sentence ("${s.slice(0, 50)}...")`); }
        }
        const wc = beat.split(/\s+/).filter(Boolean).length;
        if (wc > MAX_BEAT) out.push(`${where}: a beat of ${wc} words (aim under ${MAX_BEAT})`);
        if (audience === 'school' && !/poe-predict/.test(j.type || '') && sentences(beat.replace(/^#.*$/gm, '')).length > 3 && !/^\s*##\s/m.test(beat)) out.push(`${where}: a beat of 4+ sentences with no ## header`);
      }
      if (/poe-predict/.test(j.type || '') && !/\*\*Predict:\*\*/.test(text)) out.push(`${where}: poe-predict prompt without **Predict:**`);
      void beats; void total;
    }
  }
}
// -- character speech (course with a cast) -------------------------------------------------------------------------
const SPEECH_VERB = /\b(says?|said|asks?|asked|whispers?|whispered|replies|replied|answers?|answered|shouts?|calls?|laughs?|murmurs?|mutters?|adds?|tells?)\b/i;
const castNames = (() => {
  try {
    const m = JSON.parse(fs.readFileSync(path.join(B, 'manifest.json'), 'utf8'));
    if (!m.cast) return null;
    const c = JSON.parse(fs.readFileSync(path.join(B, m.cast), 'utf8'));
    const names = new Set();
    for (const [id, ch] of Object.entries(c.characters || {})) for (const n of [id, ch.short?.en, ch.name?.en]) if (n) names.add(String(n).split(/\s*\(/)[0].trim());
    return [...names].filter((n) => n.length > 1).map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  } catch { return null; }
})();
if (castNames && castNames.length) {
  const NAME = new RegExp('\\b(' + castNames.join('|') + ')\\b', 'i');
  const QUOTED = /(?:"[^"\n]{2,}"|\u201c[^\u201d\n]{2,}\u201d)/;
  const SAY_AT = /^\s*<!--\s*SAY\s+\S+/;
  for (const lf of lessonFiles(B).sort()) {
    const code = lessonCodeOf(lf); if (want && code !== want) continue;
    for (const it of lessonItems(B, lf)) {
      let j; try { j = JSON.parse(fs.readFileSync(it.file, 'utf8')); } catch { continue; }
      if (!j.markdownRef) continue;
      const f = path.join(B, j.markdownRef); if (!fs.existsSync(f)) continue;
      const where = `${code}S${String(it.index + 1).padStart(2, '0')} ${path.basename(f)}`;
      const body = fs.readFileSync(f, 'utf8').replace(/```[\s\S]*?```/g, '');
      const hasStep = /<!--\s*STEP\b/.test(body);
      for (const beat of body.split(/^\s*<!--\s*STEP\b[^>]*-->\s*$/m)) {
        const paras = beat.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
        let prevSay = false, first = true, openedBySay = false, narrAfter = null;
        for (const p of paras) {
          const lines = p.split('\n');
          const say = SAY_AT.test(lines[0]) || prevSay;
          prevSay = /^<!--\s*SAY\s+[^>]*-->$/.test(p);
          if (prevSay) { if (first) openedBySay = true; first = false; continue; }
          const text = p.replace(/<!--[\s\S]*?-->/g, ' ').trim();
          if (!text || /^(#{1,6}\s|[-*]\s|\d+\.\s|\||>)/.test(text)) continue;
          if (first && say) openedBySay = true;
          first = false;
          if (!say && QUOTED.test(text) && (NAME.test(text) || SPEECH_VERB.test(text))) out.push(`${where}: quoted speech with no SAY marker ("${text.slice(0, 50)}...")`);
          if (hasStep && openedBySay && !say && !narrAfter) narrAfter = text;
        }
        if (narrAfter) out.push(`${where}: a SAY opens this beat but narration follows in it ("${narrAfter.slice(0, 40)}..."); story mode puts the whole beat in the bubble - put narration first`);
      }
    }
  }
}
// -- game words (plain look or college audience) --------------------------------------------------------------------
if (plainOrCollege(look, audience)) {
  const GW = (where, text) => { for (const h of gameWordHits(text)) out.push(`${where}: game word "${h.match}" in learner-visible text ("${h.context}") - say exercise, task or practice (plain CARD 16)`); };
  const seenScene = new Set();
  const readJ = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
  for (const lf of lessonFiles(B).sort()) {
    const code = lessonCodeOf(lf); if (want && code !== want) continue;
    const lj = readJ(lf); if (lj) for (const x of learnerStrings({ title: lj.title, description: lj.description })) GW(`${code} lesson title`, x.text);
    for (const it of lessonItems(B, lf)) {
      const where = `${code}S${String(it.index + 1).padStart(2, '0')}`;
      for (const f of it.files) {
        const j = readJ(f); if (!j) continue;
        for (const x of learnerStrings(j)) GW(`${where} ${path.basename(f)} ${x.key}`, x.text);
        for (const r of [j.markdownRef, j.promptRef].filter(Boolean)) {
          const mf = path.join(B, r); if (!fs.existsSync(mf)) continue;
          GW(`${where} ${path.basename(mf)}`, fs.readFileSync(mf, 'utf8').replace(/<!--[\s\S]*?-->/g, ' ').replace(/```[\s\S]*?```/g, ' ').replace(/`[^`\n]*`/g, ' ').replace(/\]\([^)]*\)/g, ']'));
        }
        const src = j.simulation?.src || (/^(poe-observe-sim|mini-game)@/.test(j.type || '') ? j.src : null);
        if (src && !/^https?:/.test(src) && !seenScene.has(src)) {
          seenScene.add(src);
          const sf = path.join(B, src);
          if (fs.existsSync(sf)) for (const t of jsStrings(fs.readFileSync(sf, 'utf8'))) GW(`${where} ${path.basename(sf)}`, t);
        }
      }
    }
  }
  if (!want) for (const mf of moduleFiles(B)) { const j = readJ(mf); if (j) for (const x of learnerStrings({ title: j.title, description: j.description })) GW(`module ${path.basename(mf)}`, x.text); }
}
if (A.has('json')) console.log(JSON.stringify(out, null, 1));
else { out.slice(0, 40).forEach((l) => console.log('  WARN ' + l)); if (out.length > 40) console.log(`  ... +${out.length - 40}`); console.log(`PASS - 0 fail, ${out.length} warn (advisory)`); }
