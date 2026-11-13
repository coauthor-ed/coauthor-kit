#!/usr/bin/env bash
# sandbox - run a command (default: a shell) with only the kit and ONE bundle visible. OPERATOR ONLY.
#   tools/operator/sandbox.sh <bundle> [command...]
# Uses bubblewrap if installed, else Docker (image from $KIT_SANDBOX_IMAGE, default node:20). Nothing is copied or cloned:
# the kit files are bind-mounted read-write, courses/ holds just the bundle. Needs bash (Windows: use WSL).
set -euo pipefail
b="${1:?usage: sandbox.sh <bundle> [command...]}"; shift || true
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
[ -d "$root/courses/$b" ] || { echo "no bundle $b under courses/" >&2; exit 1; }
cmd=("$@"); [ ${#cmd[@]} -gt 0 ] || cmd=(bash)
if command -v bwrap >/dev/null 2>&1; then
  args=(--bind / / --tmpfs "$root/courses" --bind "$root/courses/$b" "$root/courses/$b" --tmpfs "$root/build" --bind "$root/build" "$root/build" --chdir "$root")
  [ -d "$root/build" ] || mkdir -p "$root/build"
  exec bwrap "${args[@]}" "${cmd[@]}"
elif command -v docker >/dev/null 2>&1; then
  mounts=()
  for f in "$root"/* "$root"/.[!.]*; do
    n="$(basename "$f")"; [ "$n" = courses ] || [ "$n" = .git ] || [ "$n" = build ] && continue
    mounts+=(-v "$f:/work/$n")
  done
  mkdir -p "$root/build"
  exec docker run --rm -it -w /work "${mounts[@]}" -v "$root/courses/$b:/work/courses/$b" -v "$root/build:/work/build" "${KIT_SANDBOX_IMAGE:-node:20}" "${cmd[@]}"
else
  echo "neither bwrap nor docker found: use tools/operator/focus.mjs layers 1-2 instead" >&2; exit 1
fi
