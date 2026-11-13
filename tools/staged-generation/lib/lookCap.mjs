// lookCap - the cap on 3-look passes (briefs/stage3-look.md "Close"), shared by log-stage3.mjs and next.mjs.
// A Look log pass line reads: "- pass N (<images>): seen - <defects>; changed - <edits>; left - <...>".
// Verify writes "round N" lines; they are not passes and never count here.
//
// lookCap(noteText) returns a reason string when no further look pass may be scheduled, else null:
//   - the last pass changed nothing ("changed - none", "nothing", "no edit", or only "open:" items): the next pass
//     would see the same frames, so the scene closes done (leftovers belong under open: and ## Requests);
//   - 3 or more passes already ran (pass 3 always closes; a 2nd pass is only followed by a 3rd when it fixed a named defect).

const lookLog = (note) => ((String(note).split(/^## Look log[^\n]*\n/m)[1] || '').split(/^## /m)[0] || '');

export function lookPasses(note) {
  return lookLog(note).split('\n').filter((l) => /^-\s*pass\s+\d+\b/i.test(l.trim()));
}

// The "changed - ..." text of one pass line ('' when the line has none).
export function changedOf(line) {
  const m = /\bchanged\s*-\s*(.*?)(?:;\s*left\s*-|$)/i.exec(line);
  return m ? m[1].trim() : '';
}

const NOTHING = /^(none|nothing|no\s+(edits?|changes?|defects?|fix(es)?)|-|open\b)/i;

export function lookCap(note) {
  const passes = lookPasses(note);
  if (!passes.length) return null;
  if (passes.length >= 3) return `${passes.length} look passes ran (cap 3)`;
  const ch = changedOf(passes[passes.length - 1]);
  if (ch && NOTHING.test(ch)) return `pass ${passes.length} changed nothing (no defect fixed, so another pass would see the same frames)`;
  return null;
}
