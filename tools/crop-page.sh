#!/usr/bin/env bash
# Crop and enlarge one region of a PDF page, for checking a detail before you
# write it into FIGURES.md (and always before raising a "textbook error" flag).
#
#   tools/crop-page.sh <chapter.pdf> <page> <x%> <y%> <w%> <h%> [dpi]
#
# x/y/w/h are percentages of the page (0-100), measured from the top-left, so
# you can read them off the page image you already viewed. dpi defaults to 300.
# Output: <pdf folder>/crops/crop-p<page>-<x>-<y>-<w>-<h>.png when the PDF is in a bundle's source/ folder,
# else build/rasterized-pdf/<pdf-stem>/crop-p....png
set -euo pipefail

if [ $# -lt 6 ]; then
  echo "Usage: $0 <chapter.pdf> <page> <x%> <y%> <w%> <h%> [dpi]" >&2
  exit 1
fi
pdf="$1"; page="$2"; x="$3"; y="$4"; w="$5"; h="$6"; dpi="${7:-300}"
command -v pdftoppm >/dev/null 2>&1 || { echo "pdftoppm not found - install poppler-utils" >&2; exit 1; }
command -v pdfinfo >/dev/null 2>&1 || { echo "pdfinfo not found - install poppler-utils" >&2; exit 1; }
[ -f "$pdf" ] || { echo "No such file: $pdf" >&2; exit 1; }

# Page size in points -> pixels at this dpi.
size=$(pdfinfo -f "$page" -l "$page" "$pdf" | awk '/^Page.*size:/ {print $4, $6; exit}')
pw=$(echo "$size" | awk -v d="$dpi" '{printf "%d", $1 * d / 72}')
ph=$(echo "$size" | awk -v d="$dpi" '{printf "%d", $2 * d / 72}')
px=$(awk -v p="$pw" -v v="$x" 'BEGIN{printf "%d", p * v / 100}')
py=$(awk -v p="$ph" -v v="$y" 'BEGIN{printf "%d", p * v / 100}')
cw=$(awk -v p="$pw" -v v="$w" 'BEGIN{printf "%d", p * v / 100}')
chh=$(awk -v p="$ph" -v v="$h" 'BEGIN{printf "%d", p * v / 100}')

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
pdfdir="$(cd "$(dirname "$pdf")" && pwd)"
if [ "$(basename "$pdfdir")" = "source" ]; then
  outdir="$pdfdir/crops"   # kept with the bundle: courses/<bundle>/source/crops/ (never published)
else
  outdir="$(dirname "$script_dir")/build/rasterized-pdf/$(basename "$pdf" .pdf)"
fi
mkdir -p "$outdir"
out="$outdir/crop-p${page}-${x}-${y}-${w}-${h}"
pdftoppm -png -singlefile -r "$dpi" -f "$page" -l "$page" -x "$px" -y "$py" -W "$cw" -H "$chh" "$pdf" "$out"
echo "$out.png (${cw}x${chh} px at ${dpi} dpi)"
