#!/usr/bin/env bash
# Runs once when the codespace is created: fetch the engine checkout the preview needs.
set -u
cd "$(dirname "$0")/.."
ROOT="$(pwd)"
# poppler (pdftotext, pdftoppm) reads PDF source chapters
command -v pdftotext >/dev/null 2>&1 || { sudo apt-get update -qq && sudo apt-get install -y -qq poppler-utils; } || echo "poppler install failed; PDF sources will not work"
ENGINE_DIR="$(dirname "$ROOT")/coauthor"
URL="${COAUTHOR_ENGINE_REPO:-$(grep -v '^#' .devcontainer/engine-repo.txt 2>/dev/null | grep -v '^[[:space:]]*$' | head -n1)}"
if [ -f "$ENGINE_DIR/index.html" ]; then echo "engine already at $ENGINE_DIR"; exit 0; fi
case "$URL" in *ORG-PLACEHOLDER*) URL="";; esac
if [ -z "$URL" ]; then
  echo "NO ENGINE URL: put the real engine git URL in .devcontainer/engine-repo.txt, then run: bash .devcontainer/post-create.sh"
  exit 0
fi
REF=""; case "$URL" in *#*) REF="${URL#*#}"; URL="${URL%%#*}";; esac
if [ -n "$REF" ]; then git clone --depth 1 --branch "$REF" "$URL" "$ENGINE_DIR"; else git clone --depth 1 "$URL" "$ENGINE_DIR"; fi \
  || echo "ENGINE CLONE FAILED: check the URL in .devcontainer/engine-repo.txt"
