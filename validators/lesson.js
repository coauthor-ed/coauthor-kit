// subject/grade/chapterId are deliberately NOT validated here: this kit
// never authors them (see AGENTS.md) - they're set later, once per module or
// lesson, via the authoring-app's chained dropdowns before publish. The live
// engine repo's copy of this file (tools/validation/lesson.js) does still
// check them at that later stage; this kit-local copy only covers what an
// agent working from this repo actually produces.
export function validateLesson(lessonData) {
  const errors = [];
  const warnings = [];
  if (!lessonData.id) errors.push('Missing lesson id');
  if (!lessonData.title || typeof lessonData.title !== 'object') errors.push('Missing localized title');

  // Validate flow or linear structure
  if (lessonData.flowStart) {
    if (!lessonData.flow || !lessonData.flow[lessonData.flowStart]) {
      errors.push(`flowStart node '${lessonData.flowStart}' not found in flow object`);
    }
    // Basic graph validation
    for (const [nodeId, node] of Object.entries(lessonData.flow || {})) {
      if (!node.block) errors.push(`Node '${nodeId}' missing block reference`);
    }
  } else {
    if (!Array.isArray(lessonData.blocks)) {
      errors.push('Lesson must have either a flow or a blocks array');
    }
  }

  // Optional narration sidecar ref (coauthor-narration@1). Bundle-relative.
  // Mirrors tools/validation/lesson.js in the engine repo.
  if (lessonData.narrationRef !== undefined) {
    const r = lessonData.narrationRef;
    if (typeof r !== 'string' || !r.trim()) {
      errors.push('narrationRef must be a non-empty string');
    } else if (!/\.json$/i.test(r)) {
      errors.push(`narrationRef '${r}' must point at a .json sidecar`);
    } else if (/^[a-z]+:\/\//i.test(r)) {
      warnings.push(`narrationRef '${r}' is absolute; prefer a bundle-relative path`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
