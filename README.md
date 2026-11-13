# CoAuthor agent kit

A set of briefs, checks and preview tools that let an AI coding agent (Claude Code, OpenCode, or similar) write a complete CoAuthor course from a textbook chapter: outline, lessons, questions, interactive scenes, a question bank. You review and approve; the agent writes JSON.

No build step. Node 20 or newer. No account, no server, no cloud.

## Start

1. Get Node 20+ (and `pdftotext` / `pdftoppm` from poppler if your source is a PDF).
2. Check the kit: `node tools/kit-check.mjs`
3. Make a course workspace: `node tools/operator/start.mjs --from . --into ../my-course`
   It asks a few questions and prints the first prompt line.
4. In the workspace, read `START-HERE.md`, then paste each prompt `node tools/staged-generation/next.mjs --bundle <id>` prints into your agent.
5. Preview: `node tools/operator/preview.mjs` (needs the engine, see below).

No local setup? `docs/codespaces.md` runs the same flow in a browser (GitHub Codespaces; uses `.devcontainer/`).

Operator cheat sheet: `for-the-human-operator.txt`. Agent rules: `AGENTS.md`.

## How it fits together

- Engine: https://github.com/coauthor-ed/coauthor - the learner app. It only draws lessons. The preview tool needs a checkout of it: pass `--engine-dir <folder>` or set `COAUTHOR_ENGINE_DIR` (it also tries `./coauthor` and `../coauthor`).
- This kit: writes the content and checks it.
- Course repos: where finished courses live, as plain JSON, served over HTTP. Examples: https://github.com/coauthor-ed/cbse-grade9-science and the other `coauthor-ed` course repos.
- `simulations-kit/` is a pinned copy of the engine's scene helpers, for offline scene checks. `kit-sync` refreshes it.

## What is inside

| Folder | Holds |
|---|---|
| `briefs/` | one brief per stage; agents read only their own |
| `docs/` | authoring rules (voice, pedagogy, scenes, questions, narration) |
| `tools/` | stage tools, linters, scene checks, preview and operator tools |
| `validators/` | JSON structure checks |
| `packs/` | look packs (quill, plain, college) and subject packs |
| `examples/` | one worked course and shape references |
| `renderers/` | ready-made figure renderers |
| `simulations-kit/` | scene helper library and vendored libraries |
| `.agents/`, `.devcontainer/` | agent skill; Codespaces setup |

## Licence

- Code and docs: MIT (`LICENSE`).
- `examples/` content (worked course, questions, images): CC BY 4.0, the same as the published course repos.
- Third-party media in `examples/media/` (e.g. Wikimedia Commons photos) keep their own licence; see the credit file next to each image (`photo-credits.txt`, `README.md`).
- Vendored libraries, fonts and map data keep their own terms: see `CREDITS.md`. The India boundary data (`simulations-kit/vendor/geo/india-soi.json`) is Survey of India data: educational and website use only, no commercial use, and not under MIT.
