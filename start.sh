#!/usr/bin/env bash
# start.sh — boot the pingarden MVP locally.
#
# Idempotent: safe to re-run. Stops any previous PinGarden dev processes,
# clears :4000 / :5173, then daemonizes the API and web dev server and waits
# for both to answer. It runs local workspace binaries directly so pnpm's
# non-interactive dependency checks cannot interrupt normal restarts.
# API runs through Node's tsx loader by default because the tsx CLI opens an
# IPC pipe that is blocked in some sandboxes. Use PINGARDEN_SERVER_WATCH=1
# from a normal terminal when API hot reload is needed.
#
# Logs and PID files land in ./.dev/ (gitignored).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

LOG_DIR=".dev"
mkdir -p "$LOG_DIR"
DEV_TMP_DIR="$ROOT/$LOG_DIR/tmp"
mkdir -p "$DEV_TMP_DIR"
TMUX_TMP_DIR="$DEV_TMP_DIR/tmux"
mkdir -p "$TMUX_TMP_DIR"
chmod 700 "$TMUX_TMP_DIR" 2>/dev/null || true
SERVER_LOG="$LOG_DIR/server.log"
WEB_LOG="$LOG_DIR/web.log"
SERVER_PID_FILE="$LOG_DIR/server.pid"
WEB_PID_FILE="$LOG_DIR/web.pid"
SERVER_PORT_FILE="$LOG_DIR/server.port"
API_RUNNER="$LOG_DIR/run-api.sh"
WEB_RUNNER="$LOG_DIR/run-web.sh"
TMUX_SESSION="${PINGARDEN_TMUX_SESSION:-pingarden-dev}"
export TMUX_TMPDIR="$TMUX_TMP_DIR"

API_PORT=4000
WEB_PORT=5173
NODE_BIN="${NODE_BIN:-node}"
SERVER_BIN="apps/server/node_modules/.bin/tsx"
WEB_BIN="apps/web/node_modules/.bin/vite"
USE_TMUX="${PINGARDEN_USE_TMUX:-}"
if [ -z "$USE_TMUX" ] && [ "${CODEX_SHELL:-}" = "1" ] && command -v tmux >/dev/null 2>&1; then
  USE_TMUX=1
fi

# ── 1. ensure dependencies ──────────────────────────────────────────────
ensure_deps() {
  local missing=()
  [ -d node_modules ] || missing+=("node_modules")
  [ -x "$SERVER_BIN" ] || missing+=("$SERVER_BIN")
  [ -x "$WEB_BIN" ] || missing+=("$WEB_BIN")
  command -v "$NODE_BIN" >/dev/null 2>&1 || missing+=("$NODE_BIN")
  if [ "$USE_TMUX" = "1" ]; then
    command -v tmux >/dev/null 2>&1 || missing+=("tmux")
  fi

  if [ "${#missing[@]}" -eq 0 ]; then
    return 0
  fi

  echo "→ Workspace dependencies are missing:"
  for item in "${missing[@]}"; do
    echo "  - $item"
  done

  if [ "${PINGARDEN_AUTO_INSTALL:-}" = "1" ] || [ -t 0 ]; then
    if ! command -v pnpm >/dev/null 2>&1; then
      echo "✗ pnpm is required to install dependencies. Install pnpm, then re-run ./start.sh."
      exit 1
    fi
    echo "→ Installing workspace dependencies…"
    CI="${CI:-true}" pnpm install
    return 0
  fi

  echo "✗ Dependencies are missing and this shell is non-interactive."
  echo "  Run: pnpm install"
  echo "  Or explicitly allow install with: PINGARDEN_AUTO_INSTALL=1 ./start.sh"
  exit 1
}

ensure_deps

# ── 2. write launch runners ─────────────────────────────────────────────
write_runner_scripts() {
  cat > "$API_RUNNER" <<EOF
#!/usr/bin/env bash
set -euo pipefail
cd "$ROOT/apps/server"
export PORT="$API_PORT"
export PINGARDEN_PORT_FILE="$ROOT/$SERVER_PORT_FILE"
export TMPDIR="$DEV_TMP_DIR"
if [ "\${PINGARDEN_SERVER_WATCH:-}" = "1" ]; then
  exec "$ROOT/$SERVER_BIN" watch src/server.ts
fi
exec "$NODE_BIN" --import tsx src/server.ts
EOF

  cat > "$WEB_RUNNER" <<EOF
#!/usr/bin/env bash
set -euo pipefail
cd "$ROOT/apps/web"
export TMPDIR="$DEV_TMP_DIR"
exec "$ROOT/$WEB_BIN" --host 127.0.0.1 --port "$WEB_PORT" --strictPort
EOF

  chmod +x "$API_RUNNER" "$WEB_RUNNER"
}

write_runner_scripts

# ── 3. stop anything already running ────────────────────────────────────
stop_tmux_session() {
  if [ "$USE_TMUX" != "1" ] || ! command -v tmux >/dev/null 2>&1; then
    return 0
  fi
  if tmux has-session -t "$TMUX_SESSION" 2>/dev/null; then
    echo "→ Stopping previous tmux session: $TMUX_SESSION"
    tmux kill-session -t "$TMUX_SESSION" 2>/dev/null || true
  fi
}

stop_pid_file() {
  local file=$1
  local label=$2
  if [ ! -f "$file" ]; then
    return 0
  fi

  local pid
  pid=$(cat "$file")
  rm -f "$file"
  if [ -z "$pid" ]; then
    return 0
  fi

  if kill -0 "$pid" 2>/dev/null; then
    echo "→ Stopping previous $label process (pid: $pid)"
    kill "$pid" 2>/dev/null || true
    sleep 0.5
    if kill -0 "$pid" 2>/dev/null; then
      kill -9 "$pid" 2>/dev/null || true
    fi
  fi
}

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
    sleep 0.2
    pids=$(lsof -ti tcp:"$port" 2>/dev/null || true)
    if [ -n "$pids" ]; then
      echo "✗ Could not clear port $port. Remaining pids: $pids"
      exit 1
    fi
  fi
}

stop_tmux_session
stop_pid_file "$SERVER_PID_FILE" "API"
stop_pid_file "$WEB_PID_FILE" "Web"
kill_port "$API_PORT"
kill_port "$WEB_PORT"
rm -f "$SERVER_PORT_FILE"

# ── 4. start the API server ─────────────────────────────────────────────
echo "→ Starting API server on :$API_PORT (logs: $SERVER_LOG)"
# Stale port file from a previous crash → clear before relaunch so the
# new process always writes its own.
rm -f "$SERVER_PORT_FILE"
if [ "$USE_TMUX" = "1" ]; then
  echo "→ Starting via tmux session: $TMUX_SESSION"
  printf -v API_CMD "%q > %q 2>&1" "$ROOT/$API_RUNNER" "$ROOT/$SERVER_LOG"
  printf -v WEB_CMD "%q > %q 2>&1" "$ROOT/$WEB_RUNNER" "$ROOT/$WEB_LOG"
  tmux new-session -d -s "$TMUX_SESSION" -n api "$API_CMD"
  SERVER_PID=$(tmux display-message -p -t "$TMUX_SESSION:api.0" '#{pane_pid}')
  tmux new-window -d -t "$TMUX_SESSION" -n web "$WEB_CMD"
  WEB_PID=$(tmux display-message -p -t "$TMUX_SESSION:web.0" '#{pane_pid}')
else
  nohup "$ROOT/$API_RUNNER" > "$SERVER_LOG" 2>&1 &
  SERVER_PID=$!

  # ── 5. start the web dev server ───────────────────────────────────────
  echo "→ Starting web dev server on :$WEB_PORT (logs: $WEB_LOG)"
  nohup "$ROOT/$WEB_RUNNER" > "$WEB_LOG" 2>&1 &
  WEB_PID=$!
  disown "$SERVER_PID" "$WEB_PID" 2>/dev/null || true
fi

echo "$SERVER_PID" > "$SERVER_PID_FILE"
echo "$WEB_PID" > "$WEB_PID_FILE"

# ── 5. wait for both to answer ──────────────────────────────────────────
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

# ── 6. summary ──────────────────────────────────────────────────────────
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
