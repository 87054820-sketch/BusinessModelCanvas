#!/usr/bin/env bash
# stop.sh — stop the local pingarden dev servers started by ./start.sh.
# Safe to re-run. It clears PID files first, then frees the dev ports.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

LOG_DIR=".dev"
DEV_TMP_DIR="$ROOT/$LOG_DIR/tmp"
TMUX_TMP_DIR="$DEV_TMP_DIR/tmux"
mkdir -p "$TMUX_TMP_DIR"
chmod 700 "$TMUX_TMP_DIR" 2>/dev/null || true
SERVER_PID_FILE="$LOG_DIR/server.pid"
WEB_PID_FILE="$LOG_DIR/web.pid"
SERVER_PORT_FILE="$LOG_DIR/server.port"
TMUX_SESSION="${PINGARDEN_TMUX_SESSION:-pingarden-dev}"
export TMUX_TMPDIR="$TMUX_TMP_DIR"

stop_tmux_session() {
  if ! command -v tmux >/dev/null 2>&1; then
    return 0
  fi
  if tmux has-session -t "$TMUX_SESSION" 2>/dev/null; then
    tmux kill-session -t "$TMUX_SESSION" 2>/dev/null || true
    echo "✓ Stopped tmux session $TMUX_SESSION"
  fi
}

kill_pid() {
  local pid=$1
  local label=$2
  if [ -z "$pid" ]; then
    return 0
  fi
  if ! kill -0 "$pid" 2>/dev/null; then
    return 0
  fi

  kill "$pid" 2>/dev/null || true
  sleep 0.5
  if kill -0 "$pid" 2>/dev/null; then
    kill -9 "$pid" 2>/dev/null || true
  fi
  echo "✓ Stopped $label (pid $pid)"
}

stop_pid() {
  local file=$1
  local label=$2
  if [ -f "$file" ]; then
    local pid
    pid=$(cat "$file")
    rm -f "$file"
    kill_pid "$pid" "$label"
  fi
}

clear_port() {
  local port=$1
  local pids
  pids=$(lsof -ti tcp:"$port" 2>/dev/null || true)
  if [ -z "$pids" ]; then
    return 0
  fi

  echo "→ Clearing port $port (pids: $pids)"
  # shellcheck disable=SC2086
  kill $pids 2>/dev/null || true
  sleep 0.5
  pids=$(lsof -ti tcp:"$port" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    # shellcheck disable=SC2086
    kill -9 $pids 2>/dev/null || true
  fi
  sleep 0.2
  pids=$(lsof -ti tcp:"$port" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "✗ Could not clear port $port. Remaining pids: $pids"
    return 1
  fi
  echo "✓ Cleared port $port"
}

stop_tmux_session
stop_pid "$SERVER_PID_FILE" "API"
stop_pid "$WEB_PID_FILE"    "Web"

# Server should have unlinked its own port file on SIGTERM; clear it
# defensively in case it crashed without cleanup.
rm -f "$SERVER_PORT_FILE"

# Belt-and-braces: clear the ports in case something else got bound.
for port in 4000 5173; do
  clear_port "$port"
done

echo "✓ All stopped"
