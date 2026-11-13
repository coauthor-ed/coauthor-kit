# Beat-count check

Static check: does a content-block's markdown (inline `markdown.en`, or the sibling `.md` file a `markdownRef` points at - SKILL.md's default, see "Prose in a sibling .md file") produce the same number of beats as its attached scene's `BEAT_STEP_MAP` declares (docs/simulation-authoring.md §2.2)? A mismatch doesn't crash (the scene clamps) - it silently shows a stale or repeated visual against the text, which is easy to miss by eye.

```bash
node tools/beat-check/run.mjs courses/<bundle>/blocks/L0N/blk-....json
```

Prints both counts and exits non-zero on mismatch. Logs to `build/scratch/logs/` like `tools/sim-test/`.

How it works: counts markdown beats with a vendored, unmodified copy of the real engine's own `splitSteps()` (`vendor/`, kept in sync by hand from the engine repo - not reimplemented, so it can't drift from what actually renders), and counts `BEAT_STEP_MAP` entries via a static scan of the scene file's source (no import/execution needed).

Skips (exit 0) rather than failing when there's nothing to check: no `markdown.en`/`markdownRef`, no `simulation` attached, `simulation.src` is a full URL, or the scene has no `BEAT_STEP_MAP` at all. A `markdownRef` that doesn't resolve to a file on disk is a hard error (exit 2), same severity as a missing scene file - that's the one case that isn't "nothing to check."
