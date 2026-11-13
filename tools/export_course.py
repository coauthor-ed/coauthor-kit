#!/usr/bin/env python3
"""Export a course bundle from courses/<bundle>/ into a destination directory,
merging into whatever's already there instead of clobbering it.

Python port of export-course.mjs in this same folder - identical behavior,
kept in sync by hand. Use this one when Node isn't guaranteed to be on the
target machine; only `git` and Python 3 (stdlib only) are required. The one
place this still reaches for Node is the pre-export validation step
(`validators/validate.mjs`) - if `node` isn't on PATH, that step is skipped
with a warning rather than failing the export.

This exists because content generation runs in passes: a first pass drafts
a course, it gets exported and committed somewhere real; a later pass (often
a different agent/model doing closer visual inspection of source PDFs -
catching a diagram the first pass's text conversion missed, say) regenerates
some of the same files and re-exports. Between those two exports, the
destination may have picked up its own state this tool must not step on -
most commonly a human flipping `authoring.status` from `ai-draft` to
`human-approved`, or the authoring-app adding `subject`/`grade`/`chapterId`
to a module/lesson file (see AGENTS.md rule 3 in the parent docs - this kit
never authors those fields itself).

Merge rules, per file:
  - Destination file doesn't exist yet: write it.
  - Destination file is byte-identical to what we'd write: no-op.
  - JSON files: top-level keys the destination has but the new content
    doesn't (e.g. `subject`, `chapterId`) are preserved as-is. The
    `authoring` block specifically: if the rest of the file (everything
    except `authoring`) is unchanged, the destination's `authoring` is kept
    untouched (this is the common case - a human only touched review
    status). If the rest of the file DID change and the destination was
    `human-approved`, the new content is written but status is reset to
    `ai-draft` with a `revised-after-approval` flag - an approval covers
    the content that was approved, not whatever replaces it later.
  - Text files (.js/.mjs/.md/.txt, and JSON that fails to parse): a real
    three-way merge runs via `git merge-file` - base is the file's blob at
    the destination's own git HEAD when it's a git repo and the file is
    tracked there, otherwise an empty ancestor (still merges cleanly
    whenever only one side actually changed). A conflict is written with
    normal `<<<<<<<` markers, left for a human to resolve, and reported -
    never silently resolved in either direction.
  - Binary files (images, PDFs, ...): no `authoring` field to signal "a
    human touched this on purpose" the way JSON has, so a differing binary
    is never silently overwritten, committed or not - the new version is
    written alongside as `<name>.incoming<ext>` for manual reconciling.
  - --force skips both of the above and just takes the new content.

`manifest.json`/`_headers` are pure generated output (see
tools/content-migration/generate-bundle-manifest.js in the engine repo,
which this mirrors) and are always regenerated fresh from whatever's on
disk after the merge above.

This script never runs `git commit`, and only runs `git add` with --git-add
- per this repo's own rule, committing is for the human/calling agent to
decide, not this tool.

Usage:
  python3 tools/export_course.py <bundle> <dest-dir> [--dry-run] [--skip-validate] [--force] [--git-add]

<bundle> is a path under courses/, e.g. work-energy
<dest-dir> is the exact target bundle directory (created if missing)
--force resolves a would-be git-merge conflict by taking the new content
  instead of leaving conflict markers (discards the destination's dirty
  edit for that file). Does not affect the JSON authoring-safety behavior.
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parent

SKIP_BASENAMES = {'manifest.json', '_headers'}  # regenerated, never merged
BINARY_EXTS = {'.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.pdf', '.mp3', '.wav', '.woff', '.woff2'}
TEXT_EXTS = {'.js', '.mjs', '.md', '.txt', '.css'}


def iso_now():
    now = datetime.now(timezone.utc)
    return now.strftime('%Y-%m-%dT%H:%M:%S.') + f'{now.microsecond // 1000:03d}Z'


def is_bundle_root(d: Path) -> bool:
    return (d / 'modules').exists() or (d / 'lessons').exists()


def is_skippable(name: str) -> bool:
    return name.startswith('.') or name.endswith('.swp') or name.endswith('~') or name in SKIP_BASENAMES


def walk_files(root: Path):
    out = []

    def recurse(d: Path):
        for entry in sorted(d.iterdir()):
            if is_skippable(entry.name):
                continue
            if entry.is_dir():
                recurse(entry)
            elif entry.is_file():
                out.append(str(entry.relative_to(root)).replace(os.sep, '/'))

    recurse(root)
    return sorted(out)


def validate_source(source_dir: Path, repo_root: Path, rel_paths):
    json_files = [str(source_dir / p) for p in rel_paths if p.endswith('.json')]
    if not json_files:
        return True
    try:
        result = subprocess.run(
            ['node', str(repo_root / 'validators' / 'validate.mjs'), *json_files],
            capture_output=True, text=True,
        )
    except FileNotFoundError:
        print(
            "node not found on PATH - skipping the validators/validate.mjs pre-export check "
            "(this step only runs with Node available; pass --skip-validate to silence this warning).",
            file=sys.stderr,
        )
        return True
    sys.stdout.write(result.stdout or '')
    if result.stderr:
        sys.stderr.write(result.stderr)
    return result.returncode == 0


def run(cmd, **kwargs):
    return subprocess.run(cmd, capture_output=True, text=True, **kwargs)


def find_git_root(start_dir: Path):
    d = start_dir
    while not d.exists():
        parent = d.parent
        if parent == d:
            return None
        d = parent
    r = run(['git', '-C', str(d), 'rev-parse', '--show-toplevel'])
    return Path(r.stdout.strip()) if r.returncode == 0 else None


def git_head_blob_text(git_root, abs_path: Path):
    if not git_root:
        return None
    rel = str(abs_path.relative_to(git_root)).replace(os.sep, '/')
    r = run(['git', '-C', str(git_root), 'show', f'HEAD:{rel}'])
    return r.stdout if r.returncode == 0 else None  # None = not in HEAD (new/untracked), not an error


class TempFiles:
    """Scratch files for git merge-file - it operates on real paths, not stdin."""

    def __init__(self):
        self.dir = Path(tempfile.mkdtemp(prefix='export-course-'))
        self._n = 0

    def write(self, content: str) -> str:
        p = self.dir / f'f{self._n}'
        self._n += 1
        p.write_text(content, encoding='utf-8')
        return str(p)

    def cleanup(self):
        shutil.rmtree(self.dir, ignore_errors=True)


def merge_text(tmp: TempFiles, base_text, ours_text, theirs_text):
    """Three-way text merge. Returns (content, conflict). base_text may be
    None (no history - merges against an empty ancestor, which still
    resolves cleanly whenever only one side actually changed)."""
    base_file = tmp.write(base_text if base_text is not None else '')
    ours_file = tmp.write(ours_text)
    theirs_file = tmp.write(theirs_text)
    r = run(['git', 'merge-file', '-p', '-L', 'destination', '-L', 'base', '-L', 'export', ours_file, base_file, theirs_file])
    if r.returncode < 0:
        raise RuntimeError(f'git merge-file failed to run: {r.stderr}')
    return r.stdout, r.returncode > 0


def _dedup_ordered(*lists):
    seen = set()
    out = []
    for lst in lists:
        for item in lst:
            if item not in seen:
                seen.add(item)
                out.append(item)
    return out


def _without_authoring(obj):
    return {k: v for k, v in obj.items() if k != 'authoring'}


def merge_json_object(dest_obj, source_obj):
    """Merges a destination JSON object with the new source object. Source
    wins on any key both define, except: (a) a top-level key the destination
    has but source doesn't is kept - this is how a later authoring-app edit
    (subject/grade/chapterId/board, or anything else this kit doesn't know
    about) survives a re-export; (b) `authoring` is special-cased per the
    module docstring above."""
    result = dict(source_obj)
    for key, value in dest_obj.items():
        if key not in source_obj:
            result[key] = value

    content_changed = (
        json.dumps(_without_authoring(dest_obj), sort_keys=True, ensure_ascii=False)
        != json.dumps(_without_authoring(source_obj), sort_keys=True, ensure_ascii=False)
    )

    status_reset = False
    dest_authoring = dest_obj.get('authoring')
    if dest_authoring:
        if not content_changed:
            result['authoring'] = dest_authoring
        elif dest_authoring.get('status') == 'human-approved':
            source_authoring = source_obj.get('authoring') or {}
            flags = _dedup_ordered(dest_authoring.get('flags') or [], source_authoring.get('flags') or [], ['revised-after-approval'])
            result['authoring'] = {**source_authoring, 'status': 'ai-draft', 'flags': flags, 'reviewedAt': None}
            status_reset = True
        else:
            result['authoring'] = source_obj.get('authoring') or dest_authoring

    return result, content_changed, status_reset


def list_json_files(d: Path):
    if not d.exists():
        return []
    return sorted(f.name for f in d.iterdir() if f.suffix == '.json')


def first_module_meta(bundle_dir: Path):
    for filename in list_json_files(bundle_dir / 'modules'):
        try:
            mod = json.loads((bundle_dir / 'modules' / filename).read_text('utf-8'))
        except (json.JSONDecodeError, OSError):
            continue
        return {
            'title': mod.get('title') or {'en': filename[:-len('.json')]},
            'subject': mod.get('subject'),
            'grade': mod.get('grade'),
        }
    return {'title': {'en': bundle_dir.name}, 'subject': None, 'grade': None}


def bundle_look_fields(bundle_dir):
    """bundle.json's look, scene setting and signature colour, carried into
    the manifest only when named (mirrors tools/operator/lib/manifest.mjs;
    quill is the site default, so a "quill" look adds nothing)."""
    try:
        bj = json.loads((Path(bundle_dir) / 'bundle.json').read_text('utf-8')) or {}
    except Exception:
        bj = {}
    out = {}
    for key in ('look', 'simSetting', 'accent', 'cast'):
        v = bj.get(key) if isinstance(bj, dict) else None
        if isinstance(v, str) and v and not (key == 'look' and v == 'quill'):
            out[key] = v
    r = bj.get('renderers') if isinstance(bj, dict) else None
    if isinstance(r, dict) and r:
        out['renderers'] = r
    return out


def main():
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument('bundle', nargs='?')
    parser.add_argument('dest_dir', nargs='?')
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--skip-validate', action='store_true')
    parser.add_argument('--force', action='store_true')
    parser.add_argument('--git-add', action='store_true')
    args = parser.parse_args()

    if not args.bundle or not args.dest_dir:
        print('Usage: python3 tools/export_course.py <bundle> <dest-dir> [--dry-run] [--skip-validate] [--force] [--git-add]', file=sys.stderr)
        sys.exit(1)

    dry_run = args.dry_run
    force = args.force

    source_dir = (REPO_ROOT / 'courses' / args.bundle).resolve()
    dest_dir = (Path.cwd() / args.dest_dir).resolve()

    if not source_dir.exists() or not is_bundle_root(source_dir):
        print(f'No such bundle (needs a modules/ or lessons/ subfolder): {source_dir.relative_to(REPO_ROOT) if source_dir.is_relative_to(REPO_ROOT) else source_dir}', file=sys.stderr)
        sys.exit(1)

    git_root = find_git_root(dest_dir)
    tmp = TempFiles()

    report = {k: [] for k in ('added', 'unchanged', 'updated', 'reviewPreserved', 'statusReset', 'merged', 'conflicts', 'binaryConflicts')}

    def write_if_not_dry_run(path: Path, content: bytes):
        if dry_run:
            return
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)

    def export_file(rel_path: str):
        src_abs = source_dir / rel_path
        dest_abs = dest_dir / rel_path
        dest_exists = dest_abs.exists()
        ext = PurePosixPath(rel_path).suffix
        basename = PurePosixPath(rel_path).name

        if not dest_exists:
            write_if_not_dry_run(dest_abs, src_abs.read_bytes())
            report['added'].append(rel_path)
            return

        # GENERATION-LOG.md accumulates across passes rather than being merged/overwritten.
        if basename == 'GENERATION-LOG.md':
            dest_text = dest_abs.read_text('utf-8')
            src_text = src_abs.read_text('utf-8')
            if src_text.strip() in dest_text:
                report['unchanged'].append(rel_path)
                return
            sep = '\n' if dest_text.endswith('\n') else '\n\n'
            stamped = f'{dest_text}{sep}---\n<!-- appended by export_course.py on {iso_now()} -->\n\n{src_text}'
            write_if_not_dry_run(dest_abs, stamped.encode('utf-8'))
            report['updated'].append(rel_path)
            return

        proposed = None  # bytes - what we'd write if the destination didn't exist / weren't dirty
        status_reset = False

        if ext == '.json':
            parse_ok = True
            try:
                dest_obj = json.loads(dest_abs.read_text('utf-8'))
                src_obj = json.loads(src_abs.read_text('utf-8'))
            except json.JSONDecodeError:
                parse_ok = False
            if parse_ok:
                result, content_changed, status_reset = merge_json_object(dest_obj, src_obj)
                proposed_text = json.dumps(result, indent=2, ensure_ascii=False) + '\n'
                proposed = proposed_text.encode('utf-8')
                if proposed_text == dest_abs.read_text('utf-8'):
                    report['unchanged'].append(rel_path)
                    return
                if not content_changed:
                    write_if_not_dry_run(dest_abs, proposed)
                    report['reviewPreserved'].append(rel_path)
                    return
            else:
                proposed = src_abs.read_bytes()  # unparsable destination - fall through to the generic text-merge path below
        else:
            proposed = src_abs.read_bytes()

        dest_current = dest_abs.read_bytes()
        if dest_current == proposed:
            report['unchanged'].append(rel_path)
            return

        is_text = ext == '.json' or ext in TEXT_EXTS
        if is_text and ext not in BINARY_EXTS:
            base_text = git_head_blob_text(git_root, dest_abs)  # None when untracked/no git - merges against an empty ancestor
            content, conflict = merge_text(tmp, base_text, dest_current.decode('utf-8'), proposed.decode('utf-8'))
            if conflict and not force:
                write_if_not_dry_run(dest_abs, content.encode('utf-8'))
                report['conflicts'].append(rel_path)
                return
            final_content = proposed if conflict else content.encode('utf-8')  # --force on a conflict: take the export's content outright
            write_if_not_dry_run(dest_abs, final_content)
            (report['statusReset'] if status_reset else report['updated'] if conflict else report['merged']).append(rel_path)
            return

        # Binary: can't line-merge, and unlike JSON there's no `authoring` field to
        # signal "a human touched this on purpose" - a diagram someone replaced and
        # committed looks identical, on disk, to one nobody's looked at yet. So a
        # differing binary is never silently overwritten, committed or not; only
        # --force does that.
        if force:
            write_if_not_dry_run(dest_abs, proposed)
            report['updated'].append(rel_path)
            return
        incoming_path = dest_abs.with_name(dest_abs.stem + '.incoming' + dest_abs.suffix)
        write_if_not_dry_run(incoming_path, proposed)
        report['binaryConflicts'].append({'relPath': rel_path, 'incoming': str(incoming_path.relative_to(dest_dir))})

    def regenerate_manifest():
        meta = first_module_meta(dest_dir)
        git_rel = str(dest_dir.relative_to(git_root)).replace(os.sep, '/') if git_root else None
        courses_marker = re.search(r'(?:^|/)content/courses/(.+)$', git_rel) if git_rel else None
        manifest = {
            'bundleId': courses_marker.group(1) if courses_marker else dest_dir.name,
            'title': meta['title'],
            'subject': meta['subject'],
            'grade': meta['grade'],
            **bundle_look_fields(source_dir),
            'modules': [f'modules/{f}' for f in list_json_files(dest_dir / 'modules')],
            'lessons': [f'lessons/{f}' for f in list_json_files(dest_dir / 'lessons')],
            'tests': [f'tests/{f}' for f in list_json_files(dest_dir / 'tests')],
            'generatedAt': iso_now(),
        }
        if (dest_dir / 'glossary.json').exists():
            manifest['glossary'] = 'glossary.json'
        if (dest_dir / 'field-guide.json').exists():
            manifest['fieldGuide'] = 'field-guide.json'
        write_if_not_dry_run(dest_dir / 'manifest.json', (json.dumps(manifest, indent=2, ensure_ascii=False) + '\n').encode('utf-8'))
        write_if_not_dry_run(dest_dir / '_headers', b'/*\n  Access-Control-Allow-Origin: *\n')

    rel_paths = walk_files(source_dir)

    if not args.skip_validate and not validate_source(source_dir, REPO_ROOT, rel_paths):
        print('\nSource content has validation errors - fix them (or re-run with --skip-validate) before exporting.', file=sys.stderr)
        tmp.cleanup()
        sys.exit(1)

    for rel_path in rel_paths:
        export_file(rel_path)

    if dest_dir.exists():
        source_set = set(rel_paths)
        incoming_set = {c['incoming'] for c in report['binaryConflicts']}
        report['orphans'] = [p for p in walk_files(dest_dir) if p not in source_set and p not in incoming_set]
    else:
        report['orphans'] = []

    if not dry_run:
        regenerate_manifest()

    if args.git_add and git_root and not dry_run:
        staged = [str(dest_dir / p) for p in (report['added'] + report['updated'] + report['reviewPreserved'] + report['statusReset'] + report['merged'])]
        staged += [str(dest_dir / 'manifest.json'), str(dest_dir / '_headers')]
        run(['git', '-C', str(git_root), 'add', *staged])

    tmp.cleanup()

    def print_list(label, items):
        if not items:
            return
        print(f'\n{label} ({len(items)}):')
        for i in items:
            if isinstance(i, dict):
                print(f"  {i['relPath']} -> wrote {i['incoming']} (destination left untouched)")
            else:
                print(f'  {i}')

    rel_display = os.path.relpath(dest_dir, Path.cwd()) or '.'
    print(f"{'[dry run] ' if dry_run else ''}Exported {args.bundle} -> {rel_display}")
    print_list('Added', report['added'])
    print_list('Updated', report['updated'])
    print_list('Merged (git 3-way, clean)', report['merged'])
    print_list('Review metadata preserved (content unchanged)', report['reviewPreserved'])
    print_list('Reset to ai-draft (approved content changed upstream)', report['statusReset'])
    print_list('Unchanged', report['unchanged'])
    print_list('CONFLICTS - resolve manually (git conflict markers written)', report['conflicts'])
    print_list('Binary conflicts - new version written alongside, destination untouched', report['binaryConflicts'])
    print_list('Orphaned in destination (not in this export, left as-is)', report['orphans'])

    if report['conflicts'] or report['binaryConflicts']:
        print('\nSome files need manual resolution before this export is done - see above.')
        sys.exit(1)


if __name__ == '__main__':
    main()
