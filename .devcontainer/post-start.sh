#!/usr/bin/env bash
# Runs at every start: the operator dashboard on port 9050. It also serves the engine under /engine/ (one origin).
set -u
cd "$(dirname "$0")/.."
ROOT="$(pwd)"
ENGINE_DIR="${COAUTHOR_ENGINE_DIR:-$(dirname "$ROOT")/coauthor}"
LOG=/tmp/coauthor-logs; mkdir -p "$LOG"
up() { curl -s -o /dev/null --max-time 2 "http://127.0.0.1:$1/"; }

if ! up 9050; then
  EXTRA=""
  if [ -f "$ENGINE_DIR/index.html" ]; then EXTRA="--serve-engine $ENGINE_DIR"
  else echo "engine not found at $ENGINE_DIR (see .devcontainer/engine-repo.txt); the dashboard will start but lesson preview will not work"; fi
  nohup node tools/operator/preview.mjs --port 9050 --no-discovery $EXTRA >"$LOG/dashboard.log" 2>&1 &
fi

for _ in 1 2 3 4 5 6 7 8 9 10; do up 9050 && break; sleep 1; done
up 9050 && echo "dashboard ready on port 9050" || echo "dashboard did not start; see $LOG/dashboard.log"
