#!/usr/bin/env node
/**
 * Standalone content validator for this content repo.
 *
 * `lesson.js`/`question.js`/`bank.js` in this folder are vendored copies of
 * the source engine repo's `tools/validation/*.js`, with one deliberate
 * divergence: the live copies also validate `subject`/`grade`/`chapterId`
 * against the canonical curriculum. This kit never authors those fields (see
 * AGENTS.md) - a human sets them once, at the module or lesson level, via
 * the authoring-app's chained dropdowns, after this kit's content is
 * imported. So the vendored copies here have that cross-reference check
 * stripped; re-validate against the full engine repo before publishing, once
 * those fields have actually been set.
 *
 * What this wrapper does NOT replicate: `validateQuestion()` in the real
 * engine also dynamically imports the actual plugin module to check the
 * content against its `static schema` - that requires the engine repo's
 * `src/plugins/questions/*` to be present, which this content-only repo
 * doesn't have. That specific check is skipped here (reported as a warning,
 * not an error); `validateQuestionLocal()` below instead hand-checks each
 * type's required fields against a table copied from those same schemas
 * (see `REQUIRED_TEXT_FIELD`), which is what actually catches the concrete
 * failure mode that motivated it: a question authored with its text under
 * the wrong field name (e.g. `prompt` where the type's schema requires
 * `stem`) previously passed every check here silently.
 *
 * Block files (content-block@1, poe-predict@1, etc.) aren't covered by the
 * source repo's own tools/validation/ at all - there's no formal block
 * validator there either, only structural checks built into this wrapper
 * (validateBlockLocal below), added because a content-only kit has no other
 * way to catch an obviously malformed block before it reaches review.
 *
 * question-bank@1 index files (validateBankLocal below) are checked the same
 * local way, not the vendored bank.js (old chunks/typeIndex pooled-mock-exam
 * format - docs/HighLevelDesign.md in the engine repo; a question-bank@1 file
 * is a simpler, unchunked ref-list, own check instead of overloading that one).
 *
 * Two checks exist only here, not upstream:
 *   - `checkPoeHandoff()` catches a real, silent runtime bug: `poe-predict@1`
 *     with `deferVerdict: true` only reveals its verdict if the *very next*
 *     block in the lesson is one that actually implements the recall -
 *     `content-block@1` with `poeRole` set, `poe-observe-sim@1`, or
 *     `poe-explain@1`. Pairing it with anything else instead compiles and
 *     "validates" everywhere else, but the student's prediction is never
 *     confirmed or corrected. This only runs when validating a *lesson* file
 *     (it needs to resolve `blockRef`s to see the next block), not a bare
 *     block file in isolation.
 *   - `checkOrphanedQuestions()` catches the other half of the same class of
 *     bug: a question file sitting in `questions/L0N/` is only ever shown to
 *     a student if the lesson's `blocks` array has a `blockRef` pointing at
 *     it. A question that's individually well-formed and sits in the right
 *     folder but was never added to the sequence validates clean everywhere
 *     else and is silently never seen. Also lesson-level only, for the same
 *     `blockRef`-resolution reason as above.
 *
 * Usage:
 *   node validators/validate.mjs <path/to/file.json> [...more files]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateLesson } from './lesson.js';
import { checkFigure } from './figure.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..');

const VALID_BLOCK_TYPES = ['text-block@1', 'content-block@1', 'poe-predict@1', 'poe-observe-sim@1', 'poe-explain@1', 'diagram-explore@1', 'reflection@1', 'mini-game@1'];
const VALID_QUESTION_TYPES = [
  'mcq-single@2', 'numeric-value@1', 'fuzzy-descriptive@1', 'drag-match@1',
  // 'molecule-drag-match@1' is a legacy alias for 'drag-match@1'
  // stays accepted only so an already-authored file still validates; never author it.
  'molecule-drag-match@1',
  'equation-input@1', 'diagram-hotspot@1', 'diagram-label@1', 'sequence-order@1',
  // 'structured-descriptive@1' is deprecated - stays accepted only so an
  // already-authored file still validates; never author it (see the
  // DEPRECATED_QUESTION_TYPES check below). Use 'semantic-descriptive@1'.
  'match-categorize@1', 'fill-blank@1', 'fill-blank@2', 'statement-judgment@1', 'structured-descriptive@1', 'semantic-descriptive@1',
  'semantic-descriptive@2', 'plot-function@1', 'assertion-reason@1', 'comprehension-set@1', 'error-correction@1',
  'math-workspace@1',
];

// Deprecated types: still accepted above (VALID_QUESTION_TYPES) so a
// not-yet-converted file doesn't read as "unknown type", but validate.mjs
// hard-fails any file that still uses one - never author these. Map value
// is the replacement to use instead.
const DEPRECATED_QUESTION_TYPES = {
  'structured-descriptive@1': 'semantic-descriptive@1',
};
const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard', 'olympiad'];

// image.credit / image.license (optional): shown in the caption (CC BY needs visible attribution). NC and ND licences are refused:
// the course is published under CC BY 4.0, which they cannot be combined with.
const BAD_LICENSE = /(^|[\s-])(NC|ND)([\s-]|$)|non-?commercial|no-?deriv/i;
function checkImageMeta(data, errors) {
  const imgs = [data.image, ...Object.values(data.simulation?.images || {}), ...Object.values(data.images || {})].filter((i) => i && typeof i === 'object');
  for (const im of imgs) {
    for (const k of ['credit', 'license']) if (im[k] != null && typeof im[k] !== 'string') errors.push(`image.${k} must be a string`);
    if (typeof im.license === 'string' && BAD_LICENSE.test(im.license)) errors.push(`image.license "${im.license}" is NonCommercial or NoDerivatives: not compatible with CC BY publishing - use another image`);
  }
}

function checkAuthoringStatus(data, errors) {
  const status = data.authoring?.status;
  if (!status) { errors.push('Missing authoring.status - every new file must be "ai-draft" until a human reviews it.'); return; }
  // "human-approved" is valid: the operator sets it with tools/operator/approve.mjs. Agents never write it (AGENTS.md rule 5).
}

// Per-type required-field spot checks, taken directly from each plugin's own
// `static schema` in the source engine repo (src/plugins/questions/*/v*/).
// This exists because the generic id/type checks above miss a real class of
// bug: an author writing the question text under the wrong field name (e.g.
// `prompt` for a type whose schema actually requires `stem`) still produces
// a structurally-plausible file that passes every other check here, and then
// renders as a blank question body in the real app. Not every question type
// has a discoverable required field this way (some plugins declare no
// `static schema` at all) - this list only covers the types that do.
// Kept alongside QUESTION_SCHEMAS below: checks the field is a localized
// object ({en: "..."}), not just present.
const REQUIRED_TEXT_FIELD = {
  'mcq-single@2': 'stem',
  'numeric-value@1': 'stem',
  'plot-function@1': 'stem',
  'match-categorize@1': 'stem',
  'sequence-order@1': 'stem',
  'diagram-hotspot@1': 'prompt',
  'semantic-descriptive@1': 'prompt',
  'semantic-descriptive@2': 'prompt',
  'structured-descriptive@1': 'prompt',
  'error-correction@1': 'stem',
  'comprehension-set@1': 'passage',
  'math-workspace@1': 'stem',
};

/**
 * Mirrors each plugin's static schema (source engine repo,
 * src/plugins/questions/) for validateAgainstSchema() to walk: top-level
 * required, plus each array-of-objects field's own required. No plugin
 * access here, so hand-update this if a schema changes. Types with no
 * upstream schema (diagram-label@1, equation-input@1, drag-match@1,
 * fuzzy-descriptive@1) are omitted, same as upstream. (molecule-drag-match@1,
 * drag-match@1's legacy alias, has no schema either, for the same reason.)
 */
const QUESTION_SCHEMAS = {
  'mcq-single@2': {
    required: ['stem', 'options', 'correctOptionId'],
    properties: { options: { type: 'array', items: { required: ['id', 'text'] } } },
  },
  'assertion-reason@1': {
    required: ['assertion', 'reason', 'correctOptionId'],
  },
  'numeric-value@1': {
    required: ['stem', 'expectedValue'],
  },
  'plot-function@1': {
    required: ['stem', 'targetFunction', 'xDomain', 'yDomain'],
  },
  'diagram-hotspot@1': {
    required: ['prompt', 'diagramRef', 'correctRegionId'],
  },
  'fill-blank@1': {
    required: ['template', 'blanks'],
    properties: { blanks: { type: 'array', items: { required: ['id', 'expected'] } } },
  },
  'fill-blank@2': {
    required: ['template', 'blanks'],
    properties: { blanks: { type: 'array', items: { required: ['id', 'expected'] } } },
  },
  'match-categorize@1': {
    required: ['stem', 'categories', 'chips'],
    properties: {
      categories: { type: 'array', items: { required: ['id', 'label'] } },
      chips: { type: 'array', items: { required: ['id', 'text', 'correctCategoryId'] } },
    },
  },
  'sequence-order@1': {
    required: ['stem', 'items', 'correctOrder'],
    properties: { items: { type: 'array', items: { required: ['id', 'text'] } } },
  },
  'statement-judgment@1': {
    required: ['statements'],
    properties: { statements: { type: 'array', items: { required: ['id', 'text', 'isTrue'] } } },
  },
  // Deprecated (DEPRECATED_QUESTION_TYPES above) - kept only so an
  // already-authored file still gets its required-field shape checked.
  'structured-descriptive@1': {
    required: ['prompt', 'rubricPoints'],
    properties: { rubricPoints: { type: 'array', items: { required: ['id', 'weight', 'keywordPatterns'] } } },
  },
  'semantic-descriptive@1': {
    required: ['prompt', 'rubric'],
    properties: {
      rubric: { type: 'array', items: { required: ['id', 'label', 'level1', 'clue', 'level2Template', 'accepted'] } },
    },
  },
  // @2 adds optional wordLimit/formatChecks/weights on top of @1's rubric -
  // `rubric` stays required (may be an empty array; that's a value check,
  // not a shape check, so it's not enforced here) so this mirrors @1 as-is.
  'semantic-descriptive@2': {
    required: ['prompt', 'rubric'],
    properties: {
      rubric: { type: 'array', items: { required: ['id', 'label', 'level1', 'clue', 'level2Template', 'accepted'] } },
      formatChecks: { type: 'array', items: { required: ['id', 'pattern', 'label'] } },
    },
  },
  'comprehension-set@1': {
    required: ['passage', 'items'],
    properties: {
      items: { type: 'array', items: { required: ['id', 'question'] } },
    },
  },
  'error-correction@1': {
    required: ['stem', 'lines'],
    properties: {
      lines: { type: 'array', items: { required: ['id', 'text', 'incorrectWord', 'correction'] } },
    },
  },
  'math-workspace@1': {
    required: ['stem', 'parts'],
    properties: {
      parts: { type: 'array', items: { required: ['id', 'shape'] } },
    },
  },
};

/** Checks data against a schema: top-level required, plus each
 *  array-of-objects field's own required. */
function validateAgainstSchema(data, schema, path, errors) {
  if (!schema) return;
  for (const req of schema.required || []) {
    if (data == null || data[req] === undefined) {
      errors.push(`Missing required field from schema: ${path ? `${path}.${req}` : req}`);
    }
  }
  if (!schema.properties || !data || typeof data !== 'object') return;
  for (const [key, subSchema] of Object.entries(schema.properties)) {
    if (data[key] === undefined) continue;
    if (subSchema.type === 'array') {
      if (Array.isArray(data[key])) {
        data[key].forEach((item, i) => validateAgainstSchema(item, subSchema.items, `${path ? `${path}.` : ''}${key}[${i}]`, errors));
      }
    } else {
      validateAgainstSchema(data[key], subSchema, path ? `${path}.${key}` : key, errors);
    }
  }
}

/**
 * `explanationSlide.blocks[].blockRef` (docs/sprints/wip/dom-simulations-md-
 * prose-and-explanation-slides.md §7) - ordinary block refs, same bundle-
 * relative resolution as blockRef elsewhere. A dangling one is a hard FAIL:
 * this is the one gate AGENTS.md rule 6 tells agents to trust.
 */
function checkExplanationSlide(data, errors, filePath) {
  const blocks = data.explanationSlide?.blocks;
  if (blocks === undefined) return;
  if (!Array.isArray(blocks) || !blocks.length) {
    errors.push('explanationSlide.blocks must be a non-empty array of { blockRef }');
    return;
  }
  for (const entry of blocks) {
    if (!entry?.blockRef) { errors.push('explanationSlide.blocks[] entry is missing blockRef'); continue; }
    const abs = resolveBundleRelativeRef(entry.blockRef, filePath);
    if (abs && !fs.existsSync(abs)) {
      errors.push(`explanationSlide blockRef "${entry.blockRef}" does not resolve to a file on disk (looked for ${path.relative(REPO_ROOT, abs)})`);
    }
  }
}

function validateQuestionLocal(data, filePath) {
  const errors = [];
  if (!data.id) errors.push('Missing question id');
  if (!data.type) errors.push('Missing question type');
  if (data.type && !VALID_QUESTION_TYPES.includes(data.type)) errors.push(`Unknown question type: ${data.type} - not in this kit's valid-types list`);
  if (data.type && DEPRECATED_QUESTION_TYPES[data.type]) {
    errors.push(`${data.type} is deprecated - convert to ${DEPRECATED_QUESTION_TYPES[data.type]} instead (see docs/descriptive-questions-and-cbse-marks.md). Its keyword-pattern scorer produces unreliable grading.`);
  }
  checkExplanationSlide(data, errors, filePath);

  if (data.difficulty !== undefined && !DIFFICULTY_LEVELS.includes(data.difficulty)) {
    errors.push(`Invalid difficulty: "${data.difficulty}" (must be one of ${DIFFICULTY_LEVELS.join(', ')})`);
  }
  if (data.estimatedTimeSec !== undefined && (typeof data.estimatedTimeSec !== 'number' || data.estimatedTimeSec <= 0)) {
    errors.push('Invalid estimatedTimeSec: must be a positive number of seconds');
  }
  // hard/olympiad needs a real worked solution, not just "explanation" - docs/question-bank-generation.md.
  if ((data.difficulty === 'hard' || data.difficulty === 'olympiad') && !data.explanationSlide) {
    errors.push(`"${data.difficulty}" questions require an explanationSlide (a short "explanation" alone is not enough)`);
  }

  const requiredTextField = REQUIRED_TEXT_FIELD[data.type];
  if (requiredTextField && data[requiredTextField] !== undefined &&
      (typeof data[requiredTextField] !== 'object' || data[requiredTextField] === null)) {
    errors.push(`${data.type} needs a "${requiredTextField}" field (localized object, e.g. { "en": "..." }) - this is the question text itself`);
  }

  validateAgainstSchema(data, QUESTION_SCHEMAS[data.type], '', errors);

  // Cross-field checks: field present but its value doesn't match a sibling
  // (e.g. a typo'd id).
  if (data.type === 'sequence-order@1' && Array.isArray(data.items) && Array.isArray(data.correctOrder)) {
    const itemIds = data.items.map((i) => i.id).filter(Boolean);
    const sameMembers = itemIds.length === data.correctOrder.length &&
      itemIds.every((id) => data.correctOrder.includes(id)) &&
      new Set(data.correctOrder).size === data.correctOrder.length;
    if (!sameMembers) errors.push('sequence-order@1 correctOrder must list exactly the same ids as items[], each exactly once');
  }
  if (data.type === 'match-categorize@1' && Array.isArray(data.categories) && Array.isArray(data.chips)) {
    const catIds = new Set(data.categories.map((c) => c.id).filter(Boolean));
    data.chips.forEach((chip, i) => {
      if (chip.correctCategoryId && !catIds.has(chip.correctCategoryId)) {
        errors.push(`match-categorize@1 chips[${i}] (${chip.id ?? '?'}) correctCategoryId "${chip.correctCategoryId}" does not match any category id`);
      }
    });
  }

  if (data.type === 'fill-blank@2' && Array.isArray(data.blanks)) {
    data.blanks.forEach((blank) => {
      if (Array.isArray(blank.options) && blank.options.length && Array.isArray(blank.expected)) {
        const optionValues = blank.options.map((o) => o.value);
        const unselectable = blank.expected.filter((exp) => !optionValues.includes(exp));
        if (unselectable.length) {
          errors.push(`fill-blank@2 blank "${blank.id}" has expected value(s) [${unselectable.join(', ')}] that aren't among its own options[] - the correct answer would be unselectable`);
        }
      }
    });
  }
  if (data.type === 'comprehension-set@1' && Array.isArray(data.items)) {
    data.items.forEach((item, i) => {
      const child = item.question;
      if (!child || typeof child !== 'object') { errors.push(`comprehension-set@1 items[${i}] is missing its "question" object`); return; }
      if (!child.id) errors.push(`comprehension-set@1 items[${i}].question is missing "id"`);
      if (!child.type) errors.push(`comprehension-set@1 items[${i}].question is missing "type"`);
      else if (!VALID_QUESTION_TYPES.includes(child.type)) errors.push(`comprehension-set@1 items[${i}].question has unknown type: ${child.type}`);
      else {
        if (DEPRECATED_QUESTION_TYPES[child.type]) {
          errors.push(`comprehension-set@1 items[${i}].question uses deprecated type ${child.type} - convert to ${DEPRECATED_QUESTION_TYPES[child.type]} instead (see docs/descriptive-questions-and-cbse-marks.md).`);
        }
        validateAgainstSchema(child, QUESTION_SCHEMAS[child.type], `items[${i}].question`, errors);
      }
    });
  }
  if (data.type === 'mcq-single@2') {
    if (!Array.isArray(data.options) || !data.options.length) errors.push('mcq-single@2 needs a non-empty options array');
    if (!data.correctOptionId) errors.push('mcq-single@2 needs correctOptionId');
    else if (data.options && !data.options.find((o) => o.id === data.correctOptionId)) errors.push(`correctOptionId "${data.correctOptionId}" does not match any option id`);
  }
  if (data.type === 'assertion-reason@1') {
    if (typeof data.assertion !== 'object' || data.assertion === null) errors.push('assertion-reason@1 needs an "assertion" field (localized object, e.g. { "en": "..." })');
    if (typeof data.reason !== 'object' || data.reason === null) errors.push('assertion-reason@1 needs a "reason" field (localized object, e.g. { "en": "..." })');
    if (data.stem !== undefined || data.options !== undefined) errors.push('assertion-reason@1 never authors "stem"/"options" - the four CBSE-standard options are fixed in the plugin, not per-question');
    const validIds = data.optionSet === 'standard5' ? ['a', 'b', 'c', 'd', 'e'] : ['a', 'b', 'c', 'd'];
    if (!data.correctOptionId) errors.push('assertion-reason@1 needs correctOptionId');
    else if (!validIds.includes(data.correctOptionId)) errors.push(`assertion-reason@1 correctOptionId must be one of ${validIds.join(', ')} (given optionSet: ${data.optionSet || 'standard4 (default)'})`);
  }
  if (data.type === 'numeric-value@1') {
    if (data.expectedValue === undefined) errors.push('numeric-value@1 needs expectedValue');
    if (data.tolerance === undefined) errors.push('numeric-value@1 needs tolerance');
  }
  if (data.type === 'plot-function@1') {
    if (!data.targetFunction) errors.push('plot-function@1 needs targetFunction (a math expression in x, e.g. "2*x + 1")');
    if (!Array.isArray(data.xDomain) || data.xDomain.length !== 2) errors.push('plot-function@1 needs xDomain: [min, max]');
    if (!Array.isArray(data.yDomain) || data.yDomain.length !== 2) errors.push('plot-function@1 needs yDomain: [min, max]');
    // Structural only - this validator cannot evaluate targetFunction itself
    // (no mathjs here, and it's the same authored-formula-DoS surface
    // numeric-value@1's own formula field has - see docs/graphing-and-plotting.md),
    // so a malformed expression only surfaces once previewed in the real app.
  }
  if (data.graph !== undefined) {
    if (typeof data.graph !== 'object' || data.graph === null) errors.push('graph must be an object ({ functions?, points?, xDomain, yDomain, ... })');
    else {
      if (!Array.isArray(data.graph.xDomain) || data.graph.xDomain.length !== 2) errors.push('graph.xDomain must be [min, max]');
      if (!Array.isArray(data.graph.yDomain) || data.graph.yDomain.length !== 2) errors.push('graph.yDomain must be [min, max]');
      if (!Array.isArray(data.graph.functions) && !Array.isArray(data.graph.points)) errors.push('graph needs at least one of functions[] or points[]');
      checkGraphFunctions(data.graph, errors);
    }
  }

  checkAuthoringStatus(data, errors);
  checkImageMeta(data, errors);
  return errors;
}

/**
 * Finds `.../courses/<bundleId>` for any file living under it, regardless of
 * how deep it's nested (`blocks/L01/foo.json`, `explanations/L02/bar.json`,
 * `lessons/baz.json`, ...) - the same `courses/<bundleId>/` marker
 * CourseSourceManager.deriveBundleId() looks for in a URL, applied to a
 * filesystem path instead. Returns null for a file that isn't under a
 * `courses/` bundle at all (e.g. one of this kit's own top-level examples/).
 */
function findBundleRoot(filePath) {
  const abs = path.resolve(filePath).split(path.sep).join('/');
  const m = abs.match(/^(.*\/courses\/[^/]+)\//);
  return m ? m[1] : null;
}

/**
 * Resolves a bundle-relative ref (markdownRef/promptRef/explanationSlide's
 * blockRef - anything using the same "anchored at the bundle root, not the
 * referencing file" convention as blockRef/image.src/simulation.src, see
 * CourseSourceManager.resolveRef()'s doc comment in the engine repo) to a
 * filesystem path this validator can `fs.existsSync()`. Mirrors
 * resolveBlockRefPath() above but works from *any* file's location (that
 * function is lesson-specific: two dirname()s up), not just a lesson's.
 * Returns null for anything unresolvable here (a remote http(s):// ref, or a
 * file not under a `courses/` bundle) - the caller treats that as "can't
 * check locally", not a failure.
 */
function resolveBundleRelativeRef(ref, fromFilePath) {
  if (!ref) return null;
  if (/^([a-z][a-z0-9+.-]*:)?\/\//i.test(ref)) return null;
  if (ref.startsWith('/content/')) return path.join(REPO_ROOT, ref.replace(/^\/content\//, ''));
  if (ref.startsWith('/')) return null;
  const bundleRoot = findBundleRoot(fromFilePath);
  return bundleRoot ? path.join(bundleRoot, ref) : null;
}

/**
 * Shared by every `markdown`/`prompt` (`{en}`, except poe-predict@1's own
 * bare-string shape) field that now has a `*Ref` alternative (docs/sprints/
 * wip/dom-simulations-md-prose-and-explanation-slides.md §6): inline and ref
 * are mutually exclusive (inline wins at runtime, so authoring both is a
 * trap, not a feature), at least one must be present, and a ref must
 * actually resolve to a file on disk - a dangling ref is the one thing
 * `AGENTS.md` rule 6 tells agents to trust this validator to catch.
 */
function checkProseField(data, field, refField, errors, filePath) {
  const inline = data[field];
  const ref = data[refField];
  const isBareString = data.type === 'poe-predict@1'; // the one shape-trap field, see hydrateProseRefs.js
  const hasInline = isBareString ? (typeof inline === 'string' && inline.length > 0) : !!inline?.en;

  if (hasInline && ref) {
    errors.push(`${data.type} has both "${field}" and "${refField}" - inline wins at runtime, but authoring must pick one (drop whichever isn't intended).`);
    return;
  }
  if (!hasInline && !ref) {
    const shapeHint = isBareString ? '(a bare string)' : '(a localized object, e.g. { "en": "..." })';
    errors.push(`${data.type} needs "${field}" ${shapeHint} or "${refField}" pointing at a sibling .md file`);
    return;
  }
  if (ref) {
    const abs = resolveBundleRelativeRef(ref, filePath);
    if (abs && !fs.existsSync(abs)) {
      errors.push(`${refField} "${ref}" does not resolve to a file on disk (looked for ${path.relative(REPO_ROOT, abs)})`);
    }
  }
}

/**
 * Structural check for `photoDiagram` (PhotoDiagram.js in the engine repo -
 * docs/photo-diagrams.md here). Shape-only, same spirit as the rest of this
 * file's local checks: no engine access to actually render it, so this
 * catches what a dangling/malformed config would otherwise fail on silently
 * at runtime - a missing node id an edge references, a photo src that
 * doesn't resolve, a node with no accessible text.
 */
function checkPhotoDiagram(data, errors, filePath) {
  const pd = data.photoDiagram;
  if (!pd) return;
  if (data.image?.src) errors.push('photoDiagram and image are mutually exclusive on one block - pick one');
  if (data.simulation?.src) errors.push('photoDiagram and simulation are mutually exclusive on one block - pick one');
  if (!pd.a11yCaption || typeof pd.a11yCaption !== 'string' || !pd.a11yCaption.trim()) {
    errors.push('photoDiagram needs a non-empty a11yCaption - it is the only place the diagram\'s relationships (not just each individual photo) reach a screen reader');
  }
  if (!Array.isArray(pd.nodes) || !pd.nodes.length) {
    errors.push('photoDiagram needs a non-empty nodes array');
    return;
  }
  const seenIds = new Set();
  for (const [i, node] of pd.nodes.entries()) {
    const where = `photoDiagram.nodes[${i}]`;
    if (!node.id) errors.push(`${where} is missing id`);
    else if (seenIds.has(node.id)) errors.push(`${where}: duplicate node id "${node.id}"`);
    else seenIds.add(node.id);
    if (typeof node.x !== 'number' || typeof node.y !== 'number') errors.push(`${where} ("${node.id || '?'}") needs numeric x/y`);
    if (node.kind !== 'photo' && node.kind !== 'label') {
      errors.push(`${where} ("${node.id || '?'}") has kind "${node.kind}" - must be "photo" or "label"`);
    } else if (node.kind === 'photo') {
      if (!node.src) errors.push(`${where} ("${node.id}") is a photo node with no src`);
      else {
        const abs = resolveBundleRelativeRef(node.src, filePath);
        if (abs && !fs.existsSync(abs)) errors.push(`${where} ("${node.id}") src "${node.src}" does not resolve to a file on disk (looked for ${path.relative(REPO_ROOT, abs)})`);
      }
      if (!node.alt || !String(node.alt).trim()) errors.push(`${where} ("${node.id}") is a photo node with no alt text`);
    } else if (node.kind === 'label' && (!node.label || !String(node.label).trim())) {
      errors.push(`${where} ("${node.id}") is a label node with no label text`);
    }
    if (node.tone != null && (!Number.isInteger(node.tone) || node.tone < 1 || node.tone > 6)) {
      errors.push(`${where} ("${node.id || '?'}") tone must be an integer 1-6 (--content-series-1..6) - got ${node.tone}`);
    }
    if (node.revealAt != null && (!Number.isInteger(node.revealAt) || node.revealAt < 0)) {
      errors.push(`${where} ("${node.id || '?'}") revealAt must be a non-negative integer (0-indexed beat) - got ${node.revealAt}`);
    }
  }
  for (const [i, edge] of (pd.edges || []).entries()) {
    const where = `photoDiagram.edges[${i}]`;
    if (!edge.from || !seenIds.has(edge.from)) errors.push(`${where}: "from" ("${edge.from}") is not a declared node id`);
    if (!edge.to || !seenIds.has(edge.to)) errors.push(`${where}: "to" ("${edge.to}") is not a declared node id`);
    if (edge.revealAt != null && (!Number.isInteger(edge.revealAt) || edge.revealAt < 0)) {
      errors.push(`${where} revealAt must be a non-negative integer (0-indexed beat) - got ${edge.revealAt}`);
    }
  }
}

/** graph.functions[] items: an expression or 2+ [x, y] vertices; fill true or [x0, x1]. */
function checkGraphFunctions(graph, errors) {
  for (const [i, f] of (Array.isArray(graph?.functions) ? graph.functions : []).entries()) {
    const pts = f?.points;
    if (pts !== undefined && !(Array.isArray(pts) && pts.length >= 2 && pts.every((p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite)))) errors.push(`graph.functions[${i}].points must be 2+ [x, y] number pairs`);
    if (pts === undefined && !(typeof f?.expression === 'string' && f.expression.trim())) errors.push(`graph.functions[${i}] needs an expression (in x) or points ([[x, y], ...])`);
    const fl = f?.fill;
    if (fl !== undefined && fl !== true && fl !== false && !(Array.isArray(fl) && fl.length === 2 && fl.every(Number.isFinite) && fl[0] < fl[1])) errors.push(`graph.functions[${i}].fill must be true or [x0, x1] with x0 < x1`);
  }
}

/** content-block@1 `graph` / `diagram` companions (stepFigureHost.js): one media per block. */
function checkStepFigure(data, errors) {
  const kinds = ['graph', 'diagram', 'photoDiagram'].filter((k) => data[k]);
  if (!data.graph && !data.diagram) return;
  if (kinds.length > 1) errors.push(`${kinds.join(' and ')} are mutually exclusive on one block - pick one`);
  if (data.image?.src || data.simulation?.src) errors.push(`${data.graph ? 'graph' : 'diagram'} and image/simulation are mutually exclusive on one block - pick one`);
  const fig = data.graph || data.diagram, name = data.graph ? 'graph' : 'diagram';
  if (!fig.a11yCaption || !String(fig.a11yCaption).trim()) errors.push(`${name} needs a non-empty a11yCaption (what a screen reader hears instead of the figure)`);
  const lists = data.graph ? ['functions', 'points'] : ['points', 'segments', 'polygons', 'angles', 'rightAngles', 'parallelMarks', 'circles'];
  for (const l of lists) for (const [i, it] of (fig[l] || []).entries()) {
    if (it?.revealAt !== undefined && !(Number.isInteger(it.revealAt) && it.revealAt >= 0)) errors.push(`${name}.${l}[${i}].revealAt must be a whole beat number (0, 1, 2...)`);
  }
  if (data.graph) {
    if (!(fig.functions?.length || fig.points?.length)) errors.push('graph needs functions or points');
    checkGraphFunctions(fig, errors);
    if (fig.xDomain && !(Array.isArray(fig.xDomain) && fig.xDomain[0] < fig.xDomain[1])) errors.push('graph.xDomain must be [min, max] with min < max');
  } else {
    if (!fig.points?.length) errors.push('diagram needs a non-empty points array');
    const ids = new Set((fig.points || []).map((p) => p.id));
    for (const s of fig.segments || []) if (!ids.has(s.from) || !ids.has(s.to)) errors.push(`diagram segment ${s.from}-${s.to} names a missing point`);
  }
}

/** content-block@1 `fold: { after: N }` (plain look only): the beats after the
 *  first N sit behind one closed "Read more"; N a positive integer. */
function checkFold(data, errors) {
  if (data.fold === undefined) return;
  const n = data.fold?.after;
  if (!(data.fold && typeof data.fold === 'object' && Number.isInteger(n) && n >= 1)) {
    errors.push('fold must be { "after": N } with N a positive integer (the number of beats shown before "Read more")');
  }
}

function validateBlockLocal(data, filePath) {
  const errors = [];
  if (!data.id) errors.push('Missing block id');
  if (!data.type) errors.push('Missing block type');
  if (data.type && !VALID_BLOCK_TYPES.includes(data.type)) errors.push(`Unknown block type: ${data.type} - not in this kit's valid-types list`);
  if (data.type === 'content-block@1') checkProseField(data, 'markdown', 'markdownRef', errors, filePath);
  if (data.type === 'poe-explain@1' || data.type === 'poe-observe-sim@1' || data.type === 'reflection@1') {
    checkProseField(data, 'prompt', 'promptRef', errors, filePath);
  }
  if (data.type === 'poe-predict@1') {
    checkProseField(data, 'prompt', 'promptRef', errors, filePath);
    if (!Array.isArray(data.options) || !data.options.length) errors.push('poe-predict@1 needs a non-empty options array');
    if (!data.correctOptionId) errors.push('poe-predict@1 needs correctOptionId');
    // Option text is a bare string here, not {en}: ChoiceListBase prints opt.text raw,
    // so {en: ...} renders as "[object Object]" and nothing else flags it.
    if (Array.isArray(data.options)) {
      data.options.forEach((o, i) => {
        if (typeof o?.text !== 'string') errors.push(`poe-predict@1 options[${i}].text must be a plain string, not an object like {"en": "..."} (an object renders as "[object Object]")`);
      });
    }
  }
  if (data.type === 'content-block@1') checkPhotoDiagram(data, errors, filePath);
  if (data.type === 'content-block@1') checkStepFigure(data, errors);
  if (data.type === 'content-block@1') checkFold(data, errors);
  if (data.type === 'content-block@1' && data.figure !== undefined) checkFigure(data.figure, errors, data);   // figure.js: copy of the engine's tools/validation/figure.js
  if (data.type === 'mini-game@1') {
    // The plugin reads only src, objective and xp (docs/mini-games.md): it mounts
    // the challenge scene once, with no beats, so prose on the block never shows.
    if (typeof data.src !== 'string' || !/\.m?js$/.test(data.src)) errors.push('mini-game@1 needs a top-level "src" pointing at its challenge scene (.js), bundle-relative');
    if (data.simulation) errors.push('mini-game@1 takes its scene in top-level "src", not a "simulation" object');
    for (const k of ['markdown', 'markdownRef', 'prompt', 'promptRef', 'image']) {
      if (data[k] !== undefined) errors.push(`mini-game@1 ignores "${k}" - it would never show; put the setup text on the slide before the game`);
    }
    if (data.objective !== undefined && typeof data.objective?.en !== 'string') errors.push('mini-game@1 "objective" must be { "en": "..." } (optional - the scene\'s static OBJECTIVE is the default)');
    if (data.xp !== undefined && !(Number.isInteger(data.xp) && data.xp > 0)) errors.push('mini-game@1 "xp" must be a positive integer');
  }
  checkAuthoringStatus(data, errors);
  checkImageMeta(data, errors);
  return errors;
}

/**
 * question-bank@1 index: never embeds question bodies, only refs +
 * denormalized filter metadata (topicId/difficulty/weight/estimatedTimeSec) -
 * see docs/question-bank-generation.md. Dangling-ref and duplicate-ref
 * checks, same spirit as checkExplanationSlide above. Shape-only checks -
 * no curriculum.json here to cross-reference topicId against (see file
 * header); the live engine repo's copy does.
 */
function validateBankLocal(data, filePath) {
  const errors = [];
  if (!data.id) errors.push('Missing bank id');
  if (!data.subject) errors.push('Missing subject');
  if (!Array.isArray(data.questions) || !data.questions.length) {
    errors.push('question-bank@1 needs a non-empty questions array');
    checkAuthoringStatus(data, errors);
    return errors;
  }

  const seenRefs = new Set();
  for (const q of data.questions) {
    if (!q.ref) { errors.push('questions[] entry is missing ref'); continue; }
    if (seenRefs.has(q.ref)) errors.push(`Duplicate ref in bank: ${q.ref}`);
    seenRefs.add(q.ref);

    const abs = resolveBundleRelativeRef(q.ref, filePath);
    if (abs && !fs.existsSync(abs)) {
      errors.push(`Bank question ref "${q.ref}" does not resolve to a file on disk (looked for ${path.relative(REPO_ROOT, abs)})`);
    }
    if (q.difficulty !== undefined && !DIFFICULTY_LEVELS.includes(q.difficulty)) {
      errors.push(`questions[] entry "${q.ref}" has invalid difficulty: "${q.difficulty}" (must be one of ${DIFFICULTY_LEVELS.join(', ')})`);
    }
    if (q.estimatedTimeSec !== undefined && (typeof q.estimatedTimeSec !== 'number' || q.estimatedTimeSec <= 0)) {
      errors.push(`questions[] entry "${q.ref}" has invalid estimatedTimeSec: must be a positive number of seconds`);
    }
    if (q.topicId !== undefined && (typeof q.topicId !== 'string' || !q.topicId.trim())) {
      errors.push(`questions[] entry "${q.ref}" has invalid topicId: must be a non-empty string`);
    }
    if (q.weight !== undefined && (typeof q.weight !== 'number' || q.weight <= 0)) {
      errors.push(`questions[] entry "${q.ref}" has invalid weight: must be a positive number`);
    }
    // comprehension-set@1's bank-entry weight is the SUM of its own file's
    // items[].weight (question-bank-generation.md section 8), not the
    // mark-value-table default every other type uses.
    if (q.type === 'comprehension-set@1' && q.weight !== undefined && abs && fs.existsSync(abs)) {
      try {
        const childData = JSON.parse(fs.readFileSync(abs, 'utf8'));
        if (Array.isArray(childData.items)) {
          const itemWeightSum = childData.items.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
          if (itemWeightSum > 0 && q.weight !== itemWeightSum) {
            errors.push(`questions[] entry "${q.ref}" (comprehension-set@1) has weight ${q.weight}, but its own items[].weight sum to ${itemWeightSum} - the bank entry's weight should be that sum, not a mark-value-table default`);
          }
        }
      } catch {
        // Malformed JSON is already reported when that file is validated on
        // its own - not this check's job to report it a second time here.
      }
    }
  }

  checkAuthoringStatus(data, errors);
  return errors;
}

/** Optional course-map fields on lessons[] (plain look's module page):
 *  question / misconception { en }, keyNumbers [{ value, label: { en } }] (1-3);
 *  and the module's keyNumbersLabel { en }. */
function checkCourseMap(data, errors) {
  const isText = (v) => v && typeof v === 'object' && typeof v.en === 'string' && v.en.trim();
  if (data.keyNumbersLabel !== undefined && !isText(data.keyNumbersLabel)) errors.push('keyNumbersLabel must be { "en": "..." }');
  for (const [i, l] of (Array.isArray(data.lessons) ? data.lessons : []).entries()) {
    for (const k of ['question', 'misconception']) {
      if (l?.[k] !== undefined && !isText(l[k])) errors.push(`lessons[${i}].${k} must be { "en": "..." }`);
    }
    if (l?.keyNumbers === undefined) continue;
    if (!Array.isArray(l.keyNumbers) || l.keyNumbers.length < 1 || l.keyNumbers.length > 3) { errors.push(`lessons[${i}].keyNumbers must be an array of 1-3 { value, label } entries`); continue; }
    l.keyNumbers.forEach((kn, j) => {
      if (!(typeof kn?.value === 'string' && kn.value.trim()) && !Number.isFinite(kn?.value)) errors.push(`lessons[${i}].keyNumbers[${j}].value must be a short string (e.g. "13.2", "14 / 20")`);
      if (kn?.label !== undefined && !isText(kn.label)) errors.push(`lessons[${i}].keyNumbers[${j}].label must be { "en": "..." }`);
    });
  }
}

function validateModuleLocal(data) {
  // No dedicated module validator exists in the source engine repo's
  // tools/validation/ either - this is this kit's own minimal structural
  // check, not a vendored copy, same honesty as the block checks above.
  // subject/chapterId are deliberately not checked here - see the file
  // header: this kit never authors them, a human sets them later via the
  // authoring-app.
  const errors = [];
  if (!data.id) errors.push('Missing module id');
  if (!data.moduleId) errors.push('Missing moduleId');
  if (!Array.isArray(data.lessons) || !data.lessons.length) errors.push('Module needs a non-empty lessons array');
  else for (const l of data.lessons) if (!l.lessonRef) errors.push('A lessons[] entry is missing lessonRef');
  checkCourseMap(data, errors);

  return errors;
}

/**
 * The engine's Predict-Observe-Explain "deferred verdict" handoff is a real
 * footgun: `poe-predict@1` with `deferVerdict: true` suppresses its own
 * inline "correct/incorrect" reveal and expects the block *immediately*
 * after it in the lesson's `blocks` array to show the verdict instead. Three
 * block shapes actually implement that recall (all via the engine's
 * `POEController.recall()`, called synchronously from the block's own
 * `init(data, ctx)` rather than relying on an EventBus listener, which can
 * never catch it - LessonEngine fully unmounts the predict block, and its
 * event along with it, before the next block mounts): `content-block@1`
 * with `data.poeRole: "observe"|"explain"`, `poe-observe-sim@1`, and
 * `poe-explain@1`. Anything else immediately after a `deferVerdict: true`
 * predict block is not a lint nitpick - it silently means the student's
 * prediction is never confirmed or corrected. Neither the source engine
 * repo's own `tools/validation/lesson.js` (vendored as `lesson.js` in this
 * folder) nor an ad-hoc structural check would catch this without resolving
 * `blockRef` paths and reading the next file, so it lives here instead.
 */
/**
 * Resolves a blockRef to a filesystem path, from a lesson file's own
 * location - mirrors the deployed engine's CourseSourceManager.resolveRef():
 * a bundle-relative ref ("blocks/L01/foo.json", the current authoring
 * convention) is joined onto the lesson's own bundle root (two directories
 * up from the lesson file: <bundleDir>/lessons/<lesson>.json); a legacy
 * root-absolute ref ("/content/courses/.../foo.json", still supported by the
 * deployed engine for old content) is resolved against this repo's own root,
 * which is what becomes `/content/` once merged into the main site. Returns
 * null for anything this script can't read locally (e.g. an http(s):// URL).
 */
function resolveBlockRefPath(ref, lessonFilePath) {
  if (!ref) return null;
  if (/^([a-z][a-z0-9+.-]*:)?\/\//i.test(ref)) return null;
  if (ref.startsWith('/content/')) return path.join(REPO_ROOT, ref.replace(/^\/content\//, ''));
  if (ref.startsWith('/')) return null; // some other root-absolute shape - not this repo's to resolve
  const bundleDir = path.dirname(path.dirname(path.resolve(lessonFilePath)));
  return path.join(bundleDir, ref);
}

function checkPoeHandoff(lessonData, errors, lessonFilePath) {
  const blocks = Array.isArray(lessonData.blocks) ? lessonData.blocks : [];
  const resolved = blocks.map((entry) => {
    if (!entry.blockRef) return null;
    const abs = resolveBlockRefPath(entry.blockRef, lessonFilePath);
    if (!abs) return null;
    try {
      return JSON.parse(fs.readFileSync(abs, 'utf8'));
    } catch {
      return null; // unreadable/missing blockRef - already reported elsewhere
    }
  });

  for (let i = 0; i < resolved.length; i++) {
    const block = resolved[i];
    if (!block || block.type !== 'poe-predict@1' || block.deferVerdict !== true) continue;

    const next = resolved[i + 1];
    const nextRole = next?.type === 'content-block@1' ? next?.poeRole : null;
    const nextImplementsRecall =
      next?.type === 'poe-observe-sim@1' ||
      next?.type === 'poe-explain@1' ||
      (next?.type === 'content-block@1' && (nextRole === 'observe' || nextRole === 'explain'));
    if (!next) {
      errors.push(`${block.id}: deferVerdict:true but no block follows it in this lesson - the verdict will never be shown`);
    } else if (!nextImplementsRecall) {
      errors.push(
        `${block.id}: deferVerdict:true requires the very next block ("${next.id}", type ${next.type}) to be ` +
        `one of: content-block@1 with poeRole:"observe"|"explain", poe-observe-sim@1, or poe-explain@1 - any other ` +
        `type doesn't implement the recall, so the verdict will silently never appear. Either fix the next block's ` +
        `type/poeRole, restructure so a recall-capable block directly follows the predict block, or drop ` +
        `deferVerdict so poe-predict@1 reveals inline instead.`
      );
    }
  }
}

/**
 * A question file living under `questions/L0N/` is only ever shown to a
 * student if the lesson's own `blocks` array carries a `blockRef` pointing
 * at it - nothing wires it in automatically just because it exists in the
 * matching folder. A question that's fully valid on its own but never
 * referenced is silently dead: it authors clean, validates clean per-file,
 * and no student ever sees it. This derives the course bundle and lesson
 * folder (`L0N`) from the lesson's own first `blockRef` (rather than
 * guessing from the lesson id), lists what's actually on disk under that
 * lesson's `questions/L0N/`, and flags anything not referenced.
 */
function checkOrphanedQuestions(lessonData, errors, lessonFilePath) {
  const blocks = Array.isArray(lessonData.blocks) ? lessonData.blocks : [];
  const refs = blocks.map((b) => b.blockRef).filter(Boolean);
  if (!refs.length) return;

  const m = refs[0].match(/\/?blocks\/((?:L\d+(?:-\d+-\d+)?|C\d+))\//);
  if (!m) return; // blockRef doesn't follow the standard L0N-folder shape - nothing to check against

  const [, lessonFolder] = m;
  const bundleDir = path.dirname(path.dirname(path.resolve(lessonFilePath)));
  const questionsDir = path.join(bundleDir, 'questions', lessonFolder);
  let files;
  try {
    files = fs.readdirSync(questionsDir).filter((f) => f.endsWith('.json'));
  } catch {
    return; // no questions/ folder for this lesson - nothing to check
  }

  const referenced = new Set(refs.map((r) => path.basename(r)));
  for (const f of files) {
    if (!referenced.has(f)) {
      errors.push(
        `questions/${lessonFolder}/${f} exists but isn't referenced in this lesson's blocks array - it will ` +
        `never be shown to a student. Add a { "blockRef": "questions/${lessonFolder}/${f}" } ` +
        `entry where it belongs in the sequence, or delete the file if it's genuinely unused.`
      );
    }
  }
}

function classify(data) {
  if (data.type === 'lesson') return 'lesson';
  if (data.type === 'module') return 'module';
  if (data.type === 'question-bank@1') return 'bank';
  if (VALID_QUESTION_TYPES.includes(data.type)) return 'question';
  if (VALID_BLOCK_TYPES.includes(data.type)) return 'block';
  return 'unknown';
}

const files = process.argv.slice(2);
if (!files.length) {
  console.error('Usage: node validators/validate.mjs <file.json> [...more]');
  process.exit(1);
}

let anyFailed = false;
for (const file of files) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const base = path.basename(file);
  // Kit files with no "type": a light shape check, not "Unrecognized type" (export-course.mjs passes every .json it ships).
  const kind = base === 'bundle.json' ? 'bundle-meta' : base === 'glossary.json' ? 'glossary' : classify(data);
  let result;
  if (kind === 'bundle-meta') {
    const errors = typeof data.bundleId === 'string' && data.bundleId ? [] : ['bundle.json needs a "bundleId" string'];
    result = { valid: !errors.length, errors };
  } else if (kind === 'glossary') {
    const errors = Array.isArray(data.terms) ? data.terms.map((t, i) => (!t || !t.id || !t.term || !t.means ? `glossary term #${i} needs id, term and means` : null)).filter(Boolean) : ['glossary.json needs a "terms" array'];
    result = { valid: !errors.length, errors };
  } else if (kind === 'lesson') {
    result = validateLesson(data);
    checkPoeHandoff(data, result.errors, file);
    checkOrphanedQuestions(data, result.errors, file);
    result.valid = result.errors.length === 0;
  } else if (kind === 'question') {
    result = { valid: true, errors: validateQuestionLocal(data, file) };
    result.valid = result.errors.length === 0;
  } else if (kind === 'block') {
    result = { valid: true, errors: validateBlockLocal(data, file) };
    result.valid = result.errors.length === 0;
  } else if (kind === 'module') {
    const errors = validateModuleLocal(data);
    result = { valid: errors.length === 0, errors };
  } else if (kind === 'bank') {
    const errors = validateBankLocal(data, file);
    result = { valid: errors.length === 0, errors };
  } else {
    result = { valid: false, errors: [`Unrecognized "type": ${data.type} - not a lesson, and not in either valid-types list`] };
  }

  if (result.errors.length) {
    anyFailed = true;
    console.log(`FAIL ${file}`);
    for (const e of result.errors) console.log(`     - ${e}`);
  } else {
    console.log(`ok   ${file}`);
  }
  for (const w of result.warnings || []) console.log(`     warn: ${w}`);
}

if (anyFailed) process.exit(1);
