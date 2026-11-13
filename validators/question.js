// subject/grade/chapterId are deliberately NOT validated here: this kit
// never authors them (see AGENTS.md) - they're set later, once per module or
// lesson, via the authoring-app's chained dropdowns before publish. The live
// engine repo's copy of this file (tools/validation/question.js) does still
// check them at that later stage; this kit-local copy only covers what an
// agent working from this repo actually produces.
const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard', 'olympiad'];

/** Checks data against a schema: top-level required, plus each
 *  array-of-objects field's own required (e.g. chips[].correctCategoryId).
 *  Mirrored from the engine repo's copy of this file. */
function validateAgainstSchema(data, schema, path, errors) {
  if (!schema || typeof schema !== 'object') return;
  for (const req of schema.required || []) {
    if (data == null || data[req] === undefined) {
      errors.push(`Missing required field from schema: ${path ? `${path}.${req}` : req}`);
    }
  }
  if (schema.properties && data && typeof data === 'object') {
    for (const [key, subSchema] of Object.entries(schema.properties)) {
      if (data[key] !== undefined) {
        validateAgainstSchema(data[key], subSchema, path ? `${path}.${key}` : key, errors);
      }
    }
  }
  if (schema.type === 'array' && schema.items && Array.isArray(data)) {
    data.forEach((item, i) => validateAgainstSchema(item, schema.items, `${path}[${i}]`, errors));
  }
}

export async function validateQuestion(questionData, registry) {
  const errors = [];
  if (!questionData.id) errors.push('Missing question id');
  if (!questionData.type) errors.push('Missing question type');
  if (questionData.difficulty !== undefined && !DIFFICULTY_LEVELS.includes(questionData.difficulty)) {
    errors.push(`Invalid difficulty: "${questionData.difficulty}" (must be one of ${DIFFICULTY_LEVELS.join(', ')})`);
  }
  if (questionData.estimatedTimeSec !== undefined &&
      (typeof questionData.estimatedTimeSec !== 'number' || questionData.estimatedTimeSec <= 0)) {
    errors.push('Invalid estimatedTimeSec: must be a positive number of seconds');
  }
  // hard/olympiad needs a real worked solution, not just "explanation" - docs/question-bank-generation.md.
  if ((questionData.difficulty === 'hard' || questionData.difficulty === 'olympiad') && !questionData.explanationSlide) {
    errors.push(`"${questionData.difficulty}" questions require an explanationSlide (a short "explanation" alone is not enough)`);
  }

  const entry = registry[questionData.type];
  if (!entry) {
    errors.push(`Unknown question type: ${questionData.type}`);
    return { valid: false, errors };
  }

  try {
    // In browser, this would use absolute path, in node it might need file://
    // Registry entries are either a bare path string or { path, summaryKeys }.
    const modulePath = typeof entry === 'string' ? entry : entry.path;
    const mod = await import(modulePath);
    // Plugins export their custom-element class under their own name (e.g.
    // `MCQSingle`, `FillBlankQuestion`), not a fixed `QuestionComponent`
    // symbol - find whichever export carries the static `schema`.
    const ComponentClass = mod.QuestionComponent
      || Object.values(mod).find(v => typeof v === 'function' && v.schema);
    if (ComponentClass && ComponentClass.schema) {
      // Structural validation - recurses into array-of-objects fields too.
      validateAgainstSchema(questionData, ComponentClass.schema, '', errors);
    } else {
      console.warn(`Plugin ${questionData.type} missing static schema`);
    }
  } catch (e) {
    errors.push(`Failed to load plugin for type ${questionData.type}: ${e.message}`);
  }

  return { valid: errors.length === 0, errors };
}
