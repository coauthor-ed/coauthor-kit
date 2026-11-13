// Review notes: courses/<b>/review-notes.json = { notes: [{ id, scope, beat, theme, viewport, text, kind, source, state, at, stage?, edited? }], seq? }.
// seq = the highest id ever issued, so a deleted note's id is never reused (a log line or prompt may still name it).
// Written by the kit server, tools/operator/notes.mjs, log.mjs / log-stage3.mjs / scene-pass.mjs (--notes: mark done). Hand-editable JSON.
// kind 'direction' = operator steering for a generation run (scope bundle | L02 | L02S03 | L02/RampScene, optional stage 1a|1b|2|3|4):
// never in a review fix prompt; next.mjs puts the ids of accepted, undone directions on the invocation as "Notes: n4,n7".
// kind 'alternative' = "show me another way" for a built scene (scope L02/RampScene only): never in a fix prompt either; next.mjs --interactive
// offers that scene as a Stage 3 build again with "Alternative: n12", and the pass's --notes marks it done.
import fs from 'node:fs';
import path from 'node:path';
import { lessonFiles, lessonCodeOf, lessonItems } from './units.mjs';

export const KINDS = ['fact', 'pedagogy', 'language', 'bug', 'other', 'direction', 'alternative'];
export const STATES = ['open', 'accepted', 'rejected', 'done'];
export const STAGES = ['1a', '1b', '2', '3', '4'];
const file = (B) => path.join(B, 'review-notes.json');
const readJ = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } };

export function loadNotes(B) {
  try { const j = JSON.parse(fs.readFileSync(file(B), 'utf8')); return Array.isArray(j) ? j : j.notes || []; } catch { return []; }
}
const idNum = (x) => Number(String(x.id).replace(/^n/, '')) || 0;
const lastSeq = (B) => { const j = readJ(file(B)); return Number(j && !Array.isArray(j) && j.seq) || 0; };
function save(B, notes, seq = lastSeq(B)) {
  const tmp = file(B) + '.tmp';
  const top = notes.reduce((m, x) => Math.max(m, idNum(x)), seq);
  fs.writeFileSync(tmp, JSON.stringify(top > notes.reduce((m, x) => Math.max(m, idNum(x)), 0) ? { notes, seq: top } : { notes }, null, 2) + '\n'); fs.renameSync(tmp, file(B));
}
// Scope spelling: 'bundle', 'L02', 'C01', 'L02S03', 'L02/RampScene' (lesson codes upper case, the scene name as written).
const SCOPE_RE = /^(bundle|[LC][\dA-Z-]+?(S\d+)?|[LC][\dA-Z-]+\/[\w.-]+)$/;
export function normScope(s) {
  const t = String(s || '').trim();
  if (/^bundle$/i.test(t)) return 'bundle';
  const i = t.indexOf('/');
  return i < 0 ? t.toUpperCase() : `${t.slice(0, i).toUpperCase()}/${t.slice(i + 1).replace(/\.(js|stub\.md|design\.md)$/, '')}`;
}
function checkScope(scope, kind) {
  if (!scope) throw new Error('a note needs a scope');
  if (kind === 'direction' && !SCOPE_RE.test(scope)) throw new Error(`direction scope is bundle, L02, L02S03 or L02/SceneName, got "${scope}"`);
  if (kind === 'alternative' && !/^[LC][\dA-Z-]+\/[\w.-]+$/.test(scope)) throw new Error(`alternative scope is L02/SceneName, got "${scope}"`);
}
function checkStage(stage) {
  if (stage == null || stage === '') return null;
  const s = String(stage).toLowerCase();
  if (!STAGES.includes(s)) throw new Error(`stage is one of ${STAGES.join(', ')}`);
  return s;
}
export function addNote(B, n) {
  const notes = loadNotes(B);
  const seq = notes.reduce((m, x) => Math.max(m, idNum(x)), lastSeq(B)) + 1;
  const kind = KINDS.includes(n.kind) ? n.kind : 'other';
  const dir = kind === 'direction';
  const note = {
    id: `n${seq}`, scope: normScope(n.scope), beat: n.beat ?? null, theme: n.theme || null, viewport: n.viewport || null,
    text: String(n.text || '').trim().slice(0, 2000), kind,
    source: n.source === 'model' && !dir ? 'model' : 'human', state: n.source === 'model' && !dir ? 'open' : 'accepted', at: new Date().toISOString(),
  };
  if (dir) note.stage = checkStage(n.stage);
  if (!note.text) throw new Error('a note needs text');
  checkScope(note.scope, kind);
  notes.push(note); save(B, notes); return note;
}
// Edit text, kind, scope (and stage for a direction). Unknown id throws.
export function editNote(B, id, ch = {}) {
  const notes = loadNotes(B); const n = notes.find((x) => x.id === id);
  if (!n) throw new Error(`no note ${id}`);
  if (ch.text != null) { const t = String(ch.text).trim().slice(0, 2000); if (!t) throw new Error('text cannot be empty'); n.text = t; }
  if (ch.kind != null) { if (!KINDS.includes(ch.kind)) throw new Error(`kind is one of ${KINDS.join(', ')}`); n.kind = ch.kind; }
  if (ch.scope != null) n.scope = normScope(ch.scope);
  checkScope(n.scope, n.kind);
  if (n.kind === 'direction') { if (ch.stage !== undefined) n.stage = checkStage(ch.stage); else if (!('stage' in n)) n.stage = null; } else delete n.stage;
  n.edited = new Date().toISOString();
  save(B, notes); return n;
}
export function deleteNote(B, id) {
  const notes = loadNotes(B); const i = notes.findIndex((x) => x.id === id);
  if (i < 0) throw new Error(`no note ${id}`);
  const seq = Math.max(lastSeq(B), ...notes.map(idNum)); notes.splice(i, 1); save(B, notes, seq); return true;
}
export function setState(B, ids, state) {
  if (!STATES.includes(state)) throw new Error(`state is one of ${STATES.join(', ')}`);
  const notes = loadNotes(B); const set = new Set(ids.map(String)); let n = 0;
  for (const x of notes) if (set.has(x.id)) { x.state = state; n++; }
  if (n) save(B, notes); return n;
}
// Lesson code of a note scope: longest matching lesson code of the bundle (L1 vs L10 safe), else the code before S<n> or '/'.
function lessonOf(scope, codes) {
  const s = String(scope || '').toUpperCase().split('/')[0];
  const hit = codes.filter((c) => s === c || (s.startsWith(c) && /^S\d+$/.test(s.slice(c.length)))).sort((a, b) => b.length - a.length)[0];
  return hit || (/^([LC][\dA-Z-]+?)S\d+$/.exec(s) || /^([LC][\dA-Z-]+)$/.exec(s) || [])[1] || null;
}
const noteLine = (n) => `${n.id} [${n.scope}${n.beat != null ? ` beat ${n.beat}` : ''}, ${n.kind}${n.theme ? `, ${n.theme}` : ''}${n.viewport ? `, ${n.viewport}` : ''}] ${n.text.replace(/\s+/g, ' ')}`;
const codesOf = (B) => lessonFiles(B).map(lessonCodeOf).filter(Boolean).map((c) => c.toUpperCase());
// Review notes only (directions and alternatives have their own path).
function byLesson(B, states, lesson) {
  const codes = codesOf(B);
  const by = new Map();
  for (const n of loadNotes(B).filter((x) => states.includes(x.state) && x.kind !== 'direction' && x.kind !== 'alternative')) {
    const l = lessonOf(n.scope, codes);
    if (!l || (lesson && l !== String(lesson).toUpperCase())) continue;
    if (!by.has(l)) by.set(l, []);
    by.get(l).push(n);
  }
  return [...by.entries()].sort((a, b) => a[0].localeCompare(b[0], 'en', { numeric: true }));
}
// One Revise: invocation per lesson (not per note) for accepted notes (human notes start accepted; model notes need accepting).
export function dispatch(B, bundleId, { web = false, states = ['accepted'], lesson = null, extra = '' } = {}) {
  const also = extra ? ` Also: ${extra.replace(/\s+/g, ' ').trim()}.` : '';
  return byLesson(B, states, lesson).map(([l, ns]) => ({ lesson: l, ids: ns.map((n) => n.id),
    text: `Read REVISE.md and follow it. Bundle: ${bundleId}. Scope: ${l}. Do: fix these review notes, one by one: ${ns.map(noteLine).join(' | ')}.${also} Notes: ${ns.map((n) => n.id).join(',')}.${web ? ' Web: on.' : ''}` }));
}
// ONE prompt for all (or one) lessons: notes grouped by lesson, one per line; the agent logs each scope with its own ids.
export function fixPrompt(B, bundleId, { web = false, states = ['accepted'], lesson = null, extra = '' } = {}) {
  const groups = byLesson(B, states, lesson);
  const ids = groups.flatMap(([, ns]) => ns.map((n) => n.id));
  if (!ids.length) return { lessons: [], ids, count: 0, text: '' };
  const body = groups.map(([l, ns]) => `${l}:\n${ns.map((n) => `- ${noteLine(n)}`).join('\n')}`).join('\n');
  const also = extra ? `\nAlso: ${extra.replace(/\s+/g, ' ').trim()}.` : '';
  const text = `Read REVISE.md and follow it. Bundle: ${bundleId}. Scope: ${groups.map(([l]) => l).join(',')}. Do: fix these review notes, one by one (log.mjs rev once per note scope, --notes with that scope's ids):\n${body}${also}\nNotes: ${ids.join(',')}.${web ? ' Web: on.' : ''}`;
  return { lessons: groups.map(([l]) => l), ids, count: ids.length, text };
}

// ---- directions ----
// Scene names a slide attaches (simulation.src or a poe-observe-sim / mini-game src), from the built lesson; [] when not built.
function scenesOfSlide(B, lesson, n) {
  const lf = lessonFiles(B).find((f) => (lessonCodeOf(f) || '').toUpperCase() === lesson);
  const it = lf && lessonItems(B, lf)[n - 1]; const j = it && readJ(it.file);
  const src = j?.simulation?.src || (/^(poe-observe-sim|mini-game)@/.test(j?.type || '') ? j.src : null);
  return src ? [path.basename(src).replace(/\.js$/, '')] : [];
}
// Parse a scope into { all, lesson, slide, scene }.
function parseScope(scope) {
  const s = normScope(scope);
  if (s === 'bundle') return { all: true };
  if (s.includes('/')) { const [l, sc] = s.split('/'); return { lesson: l, scene: sc }; }
  const m = /^([LC][\dA-Z-]+?)S(\d+)$/.exec(s);
  return m ? { lesson: m[1], slide: Number(m[2]) } : { lesson: s };
}
// Does direction d apply to target t ({ all } | { lesson, slide?, scene? })? Bundle-wide directions apply to every target.
function applies(B, d, t) {
  const ds = parseScope(d.scope);
  if (ds.all) return true;
  if (t.all) return !!t.any;
  if (ds.lesson !== t.lesson) return false;
  if (!t.slide && !t.scene) return true; // a lesson target takes every direction of that lesson
  if (!ds.slide && !ds.scene) return true; // a lesson direction applies to all its slides and scenes
  if (t.scene) return ds.scene ? ds.scene === t.scene : scenesOfSlide(B, ds.lesson, ds.slide).includes(t.scene);
  return ds.slide ? ds.slide === t.slide : scenesOfSlide(B, t.lesson, t.slide).includes(ds.scene);
}
const stageOk = (d, stage) => !d.stage || !stage || d.stage === String(stage).replace(/-.*$/, '').toLowerCase();
// Accepted, undone directions for one or more targets (scopes) and a stage. any: a bundle target takes every scope (Stage 1b).
export function directionsFor(B, scopes, { stage = null, any = false } = {}) {
  const ts = (Array.isArray(scopes) ? scopes : [scopes]).filter(Boolean).map((s) => ({ ...parseScope(s), any }));
  return loadNotes(B).filter((d) => d.kind === 'direction' && d.state === 'accepted' && stageOk(d, stage) && ts.some((t) => applies(B, d, t)))
    .sort((a, b) => (Number(a.id.slice(1)) || 0) - (Number(b.id.slice(1)) || 0));
}
export const directionLine = (d) => `${d.id} [${d.scope}${d.stage ? `, stage ${d.stage}` : ''}] ${d.text.replace(/\s+/g, ' ')}`;
