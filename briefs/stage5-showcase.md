# Stage 5 - Showcase text for Discover (run after approval, outside generation)

If profile.json (or the prompt) names a non-default audience, look or a subject pack, read those cards first; they override this brief.

Invocation: `Read START-HERE.md and follow it. Stage: 5. Bundle: X.`
Target: the bundle's Discover card. Output: `courses/<Bundle>/showcase.json` and `courses/<Bundle>/showcase/intro.md`. Write-scope: those two files, plus `subjects`/`grade` in bundle.json. Read: `OUTLINE.md` (lesson list, big ideas) and `bundle.json`. Nothing else; do not read lessons or scenes.

`showcase.json` (all strings plain, learner-facing text is `{ "en": "..." }`):
```
{ "tagline": { "en": "<= 8 words, a question or promise a 12-year-old would click" },
  "description": { "en": "<= 2 sentences, what the child will be able to do" },
  "tags": ["physics", "grade 9", "..."],
  "cover": "showcase/shot-1.jpg",
  "intro": "showcase/intro.md",
  "shots": [ { "scope": "L02S03", "beat": 1, "caption": "<= 8 words" } ] }
```
- A non-school audience: the card's reader replaces the 12-year-old, child and parent in this brief; tag the level the card names (`undergraduate`), not a grade.
- `shots`: 3 to 6 targets, spread over the course, each a slide where a simulation does something worth seeing. `scope` L02S03 = 3rd entry of that lesson's blocks (`node tools/where.mjs L02 --bundle X` lists the slides). Do not set `screenshots`: the operator's tool fills it.
- `intro.md`: 80-150 words of Markdown for a parent: what the course covers, what a child does in it, how long it takes, the prerequisites. No raw HTML, no images, no links except plain https URLs. Voice: `docs/voice-and-tone.md` by section.
- Claims come from OUTLINE.md only. Do not promise exam results, ranks or marks.

Manifest v1: `manifest.json` is generated, never hand-written. `node tools/operator/manifest.mjs --bundle X --write` fills schemaVersion, audience (bundle.json, else profile.json), subject(s), grade (number, or a label such as "UG"; null if none), languages, features (story, practice), requires.engine, showcase, license (default CC-BY-4.0), version (default 1.0.0), plus repository, authors, board when bundle.json has them. Fields with no source are left out and printed as TODO lines (repository, features.narration): copy them into your report, never invent a URL or licence. You may add `subjects` (array) and `grade` to bundle.json when OUTLINE.md states them; touch no other key. Set `repository` ({url, issues}) in bundle.json only when the owner gave the URL. `publish` writes a CC BY 4.0 LICENSE file.

Check: `node -e "JSON.parse(require('fs').readFileSync('courses/X/showcase.json','utf8'))"` passes. Report: files written, the chosen shots and why, the TODO lines. Do not run anything in `tools/operator/`.
