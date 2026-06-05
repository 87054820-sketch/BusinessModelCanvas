#!/usr/bin/env bash
# stop.sh — stop the local pingarden dev servers started by ./start.sh.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

LOG_DIR=".dev"
SERVER_PID_FILE="$LOG_DIR/server.pid"
WEB_PID_FILE="$LOG_DIR/web.pid"

stop_pid() {
  local file=$1
  local label=$2
  if [ -f "$file" ]; then
    local pid
    pid=$(cat "$file")
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      # Give it a sec, then SIGKILL if still alive.
      sleep 0.5
      kill -9 "$pid" 2>/dev/null || true
      echo "✓ Stopped $label (pid $pid)"
    fi
    rm -f "$file"
  fi
}

stop_pid "$SERVER_PID_FILE" "API"
stop_pid "$WEB_PID_FILE"    "Web"

# Belt-and-braces: clear the ports in case something else got bound.
for port in 4000 5173; do
  pids=$(lsof -ti tcp:"$port" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    # shellcheck disable=SC2086
    kill $pids 2>/dev/null || true
    sleep 0.5
    pids=$(lsof -ti tcp:"$port" 2>/dev/null || true)
    [ -n "$pids" ] && kill -9 $pids 2>/dev/null || true
    echo "✓ Cleared port $port"
  fi
done

echo "✓ All stopped"
