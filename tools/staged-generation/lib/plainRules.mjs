// plainRules - shared by outline-lint, lesson-check and prose-lint for a plain-look or college-audience course
// (packs/look/plain/CARD.md 13-16, docs/pedagogy.md "Earn every scene", docs/mini-games.md "Exercise, not game").
//
//   gameWordHits(text)        game words in learner-visible text: [{ word, at, context }]
//   jsStrings(src)            the text of a scene's string literals that a learner may see (comments, static NOTES,
//                             CSS, imports and single-token strings such as class names and ids left out; HTML tags stripped)
//   learnerStrings(json)      learner-visible strings of a block / question / lesson / module JSON ({ en } values,
//                             bare prompt, title, objective); _comment, authoring and notes left out
//   outlineDecoration(line)   true when a **sim** outline line names no learner action and no changing quantity
//   stubDecoration(dials, run) true when a stub's Dials and Run shows name no action beyond tap-to-open and nothing changes
//   plainOrCollege(look, audience)

export const plainOrCollege = (look, audience) => look === 'plain' || audience === 'college';

// Always a game word in learner text. "play", "level", "score" and "challenge" only in their game sense,
// so "plays a role", "significance level", "z-score", "propensity score" and "a challenge to the claim" pass.
const RULES = [
  { word: 'game', re: /(?<![\w./-])(mini-?games?|games?|gameplay|gamified)(?![\w/-])/gi },
  { word: 'badge', re: /(?<![\w./-])badges?(?![\w/-])/gi },
  { word: 'xp', re: /(?<![\w./-])XP(?![\w/-])/g },
  { word: 'leaderboard', re: /(?<![\w./-])leaderboards?(?![\w/-])/gi },
  { word: 'play', re: /(?<![\w./-])(?:re)?play(?:s|ed|ing|er|ers)?(?![\w/-])(?!\s+(?:a|an|the|no|any|its|their|his|her|some)?\s*(?:big\s+|key\s+|central\s+|major\s+|minor\s+|small\s+|large\s+)?(?:role|part)\b)(?!\s+out\b)(?!\s+down\b)/gi,
    skip: /\b(?:at|into|in)\s+play$|\bfair\s+play$|\binter$/i },
  { word: 'level', re: /(?<![\w./-])(?:next\s+level|level\s+up|levels?\s+(?:\d+|one|two|three|complete[d]?|cleared|unlocked)|(?:new|final|bonus|first|last)\s+level)(?![\w/-])/gi },
  { word: 'score', re: /(?<![\w./-])(?:(?:your|my|high|top|final|total|best)\s+scores?|scor(?:e|ed|es|ing)\s+(?:\d+|points?)|score\s*:|scoring\s+points?|points?\s+scored)(?![\w/-])/gi },
  { word: 'challenge', re: /(?<![\w./-])CHALLENGE(?![\w/-])|^\s*(?:the\s+)?challenge\s*[:!]?\s*$|(?<![\w./-])(?:challenge|bonus)\s+(?:round|mode|badge)s?(?![\w/-])/gm },
];

export function gameWordHits(text) {
  const out = [];
  const t = String(text || '');
  for (const r of RULES) {
    for (const m of t.matchAll(r.re)) {
      if (r.skip && r.skip.test(t.slice(Math.max(0, m.index - 12), m.index + m[0].length))) continue;
      const a = Math.max(0, m.index - 30), b = Math.min(t.length, m.index + m[0].length + 30);
      out.push({ word: r.word, match: m[0].trim(), at: m.index, context: t.slice(a, b).replace(/\s+/g, ' ').trim() });
    }
  }
  return out;
}

// Learner-visible JSON strings.
const SKIP_KEYS = new Set(['_comment', 'authoring', 'notes', 'NOTES', 'id', 'src', 'type', 'markdownRef', 'promptRef', 'blockRef', 'questionRef', 'renderer', 'tags', 'moduleId', 'lessonId', 'chapterId', 'topicId', 'layout', 'position', 'data']);
export function learnerStrings(json, key = '') {
  const out = [];
  const walk = (v, k) => {
    if (SKIP_KEYS.has(k)) return;
    if (typeof v === 'string') { if (k === 'en' || k === 'prompt' || k === 'title' || k === 'objective' || k === 'alt' || k === 'caption' || k === 'label') out.push({ key: k, text: v }); return; }
    if (Array.isArray(v)) { v.forEach((x) => walk(x, k)); return; }
    if (v && typeof v === 'object') for (const [kk, vv] of Object.entries(v)) walk(vv, kk === 'en' ? 'en' : kk);
  };
  walk(json, key);
  return out;
}

// String literals of a scene file that may reach the learner.
export function jsStrings(src) {
  let s = String(src || '');
  // static NOTES = [ ... ]; is the agents' note list (not learner-visible for this rule)
  s = s.replace(/static\s+NOTES\s*=\s*\[[\s\S]*?\];/g, '');
  const lits = [];
  let i = 0;
  const n = s.length;
  while (i < n) {
    const c = s[i], d = s[i + 1];
    if (c === '/' && d === '/') { while (i < n && s[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { const e = s.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const q = c; let j = i + 1; let buf = ''; let depth = 0;
      while (j < n) {
        const ch = s[j];
        if (ch === '\\') { buf += s[j + 1] || ''; j += 2; continue; }
        if (q === '`' && ch === '$' && s[j + 1] === '{') { depth = 1; j += 2; buf += ' '; while (j < n && depth) { if (s[j] === '{') depth++; else if (s[j] === '}') depth--; j++; } continue; }
        if (ch === q) break;
        if (q !== '`' && ch === '\n') break;
        buf += ch; j++;
      }
      lits.push(buf);
      i = j + 1;
      continue;
    }
    i++;
  }
  const out = [];
  for (const raw of lits) {
    if (/^\s*[@.#]?[\w-]+\s*\{|;\s*\}|:\s*var\(--/.test(raw)) continue;                  // CSS
    if (/^(?:\.{1,2}\/|simulations\/|[\w-]+\/[\w./-]+\.m?js$)/.test(raw.trim())) continue; // import paths
    const text = raw.replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
    if (!/\s/.test(text)) {                                                               // one token: a class, an id, a key
      if (/^[A-Z][A-Z ]+$/.test(text) && text.length > 3) out.push(text);                 // except an all-caps label (CHALLENGE)
      continue;
    }
    out.push(text);
  }
  return out;
}

// Scene necessity heuristics (WARN only).
const ACTION = /\b(slid(?:e|es|er|ers|ing)|drag(?:s|ged|ging)?|scrub(?:s|ber|bing)?|dial|toggle|switch|lever|enter(?:s|ed)?|type[sd]?|slots?|fill(?:s|ed)?|sort(?:s|ed)?|split(?:s)?|shuffle[sd]?|run(?:s)?|check|place[sd]?|choose|chooses|pick(?:s|ed)?|select(?:s|ed)?|move(?:s|d)?|turn(?:s|ed)?|tries|try|sets?|adjust(?:s|ed)?|(?:re)?build(?:s)?|drops?|compute[sd]?|works? out|cross-?product)\b/i;
const QUANTITY = /\b(counts?\s+(?:up|to|down)|grows?|shrinks?|moves?|drifts?|re-?lays?|re-?sorts?|updates?|changes?|builds?\s+up|fills?\s+(?:up|in|day)|land(?:s|ing)?|rises?|falls?|spreads?|splits?|separates?|morphs?|histogram|running|over time|live)\b/i;
const REVEAL_TAP = /\btap(?:s|ped|ping)?\b(?:\W+\w+){0,6}?\W+(?:to\s+)?(?:open|opens|flip|flips|enlarge|enlarges|close|closes|reveal|reveals|expand|expands|show|shows)\b/gi;

export function outlineDecoration(line) {
  const t = String(line || '').replace(/Shows:[^;]*;?|Without it:[^-]*/g, ' ');
  return !ACTION.test(t.replace(REVEAL_TAP, ' ')) && !QUANTITY.test(t) && !/\btap(?:s|ped|ping)?\b/i.test(t.replace(REVEAL_TAP, ' '));
}

export function stubDecoration(dials, run) {
  const d = String(dials || '').replace(/none in the host strip\.?/gi, ' ').replace(/\bin the scene:/gi, ' ');
  const r = String(run || '');
  const runNone = /^\s*none\b/i.test(r) || !r.trim();
  const REVEAL = /\b(open(?:s|ed)?|flip(?:s|ped)?|enlarg(?:e|es|ed)|clos(?:e|es|ed)|reveal(?:s|ed)?|expand(?:s|ed)?)\b/i;
  const TAP = /\b(tap(?:s|ped|ping)?|click(?:s|ed)?|press(?:es|ed)?)\b/i;
  // A clause acts when it names a real move, or a tap that does more than open, flip or enlarge something.
  const acts = d.split(/[.;]\s+|\n/).some((c) => {
    if (QUANTITY.test(c)) return true;
    if (REVEAL.test(c)) return ACTION.test(c.replace(REVEAL, ' ').replace(/\b(the|a)?\s*learner\s+taps\b/gi, ' ')) && !TAP.test(c.match(ACTION)?.[0] || '') ? true : false;
    return ACTION.test(c) || TAP.test(c);
  });
  const changes = !runNone || QUANTITY.test(r.replace(/^\s*none\b/i, ''));
  return !acts && !changes;
}
