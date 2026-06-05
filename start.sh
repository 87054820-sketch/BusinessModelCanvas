#!/usr/bin/env bash
# start.sh — boot the pingarden MVP locally.
#
# Idempotent: safe to re-run. Kills anything on :4000 / :5173 first so
# you never get the "port already in use" trap, then daemonizes the API
# and the web dev server in the background and waits for both to answer.
#
# Logs and PID files land in ./.dev/ (gitignored).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

LOG_DIR=".dev"
mkdir -p "$LOG_DIR"
SERVER_LOG="$LOG_DIR/server.log"
WEB_LOG="$LOG_DIR/web.log"
SERVER_PID_FILE="$LOG_DIR/server.pid"
WEB_PID_FILE="$LOG_DIR/web.pid"

API_PORT=4000
WEB_PORT=5173

# ── 1. ensure pnpm ──────────────────────────────────────────────────────
if ! command -v pnpm >/dev/null 2>&1; then
  echo "→ pnpm not found, installing globally via npm…"
  npm install -g pnpm
fi

# ── 2. install deps if missing ──────────────────────────────────────────
if [ ! -d node_modules ] || [ ! -d apps/web/node_modules ] || [ ! -d apps/server/node_modules ]; then
  echo "→ Installing workspace dependencies…"
  pnpm install
fi

# ── 3. stop anything already running on these ports ─────────────────────
kill_port() {
  local port=$1
  local pids
  pids=$(lsof -ti tcp:"$port" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "→ Killing existing process on :$port (pids: $pids)"
    # shellcheck disable=SC2086
    kill $pids 2>/dev/null || true
    sleep 1
    # If anything stubborn remains, escalate to SIGKILL.
    pids=$(lsof -ti tcp:"$port" 2>/dev/null || true)
    if [ -n "$pids" ]; then
      # shellcheck disable=SC2086
      kill -9 $pids 2>/dev/null || true
    fi
  fi
}
kill_port "$API_PORT"
kill_port "$WEB_PORT"

# Kill anything our previous start.sh might have launched (defence in depth).
for f in "$SERVER_PID_FILE" "$WEB_PID_FILE"; do
  if [ -f "$f" ]; then
    kill "$(cat "$f")" 2>/dev/null || true
    rm -f "$f"
  fi
done

# ── 4. start the API server ─────────────────────────────────────────────
echo "→ Starting API server on :$API_PORT (logs: $SERVER_LOG)"
nohup pnpm --filter @pingarden/server run dev > "$SERVER_LOG" 2>&1 &
SERVER_PID=$!
echo "$SERVER_PID" > "$SERVER_PID_FILE"
disown "$SERVER_PID" 2>/dev/null || true

# ── 5. start the web dev server ─────────────────────────────────────────
echo "→ Starting web dev server on :$WEB_PORT (logs: $WEB_LOG)"
nohup pnpm --filter @pingarden/web run dev > "$WEB_LOG" 2>&1 &
WEB_PID=$!
echo "$WEB_PID" > "$WEB_PID_FILE"
disown "$WEB_PID" 2>/dev/null || true

# ── 6. wait for both to answer ──────────────────────────────────────────
wait_for() {
  local url=$1
  local label=$2
  local pid=$3
  for _ in $(seq 1 40); do
    # If the child died, surface its log and bail.
    if ! kill -0 "$pid" 2>/dev/null; then
      echo "✗ $label process exited early. Last log lines:"
      tail -n 30 "$([ "$label" = API ] && echo "$SERVER_LOG" || echo "$WEB_LOG")"
      exit 1
    fi
    if curl -sS -o /dev/null --max-time 1 "$url" 2>/dev/null; then
      echo "✓ $label up — $url"
      return 0
    fi
    sleep 0.5
  done
  echo "✗ $label did not come up in 20s. Last log lines:"
  tail -n 30 "$([ "$label" = API ] && echo "$SERVER_LOG" || echo "$WEB_LOG")"
  exit 1
}

wait_for "http://localhost:$API_PORT/health" "API" "$SERVER_PID"
wait_for "http://localhost:$WEB_PORT"        "Web" "$WEB_PID"

# ── 7. summary ──────────────────────────────────────────────────────────
cat <<EOF

────────────────────────────────────────────────────────
  PinGarden is running

  Web:    http://localhost:$WEB_PORT
  API:    http://localhost:$API_PORT
  Health: http://localhost:$API_PORT/health

  Logs:   $SERVER_LOG
          $WEB_LOG
  PIDs:   $SERVER_PID_FILE  ($SERVER_PID)
          $WEB_PID_FILE     ($WEB_PID)

  Stop:   ./stop.sh        (or: pnpm stop)
  Tail:   tail -f $SERVER_LOG $WEB_LOG
────────────────────────────────────────────────────────
EOF
