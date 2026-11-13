#!/usr/bin/env bash
# Rasterize a PDF to PNG pages for visual inspection (docs/generation-playbook.md step 1).
# Output: build/rasterized-pdf/<pdf-stem>/page-N.png (repo-root-relative). Skips if already done.
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <chapter.pdf> [dpi] [first-page] [last-page]" >&2
  echo "  dpi defaults to 150 (plenty for a textbook scan)" >&2
  exit 1
fi

pdf="$1"
dpi="${2:-150}"
first="${3:-}"
last="${4:-}"

if [ ! -f "$pdf" ]; then
  echo "No such file: $pdf" >&2
  exit 1
fi
if ! command -v pdftoppm >/dev/null 2>&1; then
  echo "pdftoppm not found - install poppler-utils" >&2
  exit 1
fi

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(dirname "$script_dir")"
stem="$(basename "$pdf" .pdf)"
outdir="$repo_root/build/rasterized-pdf/$stem"

if [ -z "$first" ] && [ -z "$last" ] && compgen -G "$outdir/page-*.png" >/dev/null; then
  echo "Already rasterized: $outdir (pass a page range, or delete it, to redo)" >&2
  ls "$outdir"
  exit 0
fi

mkdir -p "$outdir"

args=(-png -r "$dpi")
[ -n "$first" ] && args+=(-f "$first")
[ -n "$last" ] && args+=(-l "$last")

pdftoppm "${args[@]}" "$pdf" "$outdir/page"

echo "Rasterized to $outdir"
ls "$outdir"
