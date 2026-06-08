#!/usr/bin/env bash
# Canonical macOS DMG packaging entry for PinGarden.
# Keep this script deterministic: clean stale bundles, rebuild, verify, then package.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

log() {
  printf '\n→ %s\n' "$1"
}

fail() {
  printf '\n✗ %s\n' "$1" >&2
  exit 1
}

require_file() {
  local path=$1
  [ -f "$path" ] || fail "Missing required file: $path"
}

require_dir() {
  local path=$1
  [ -d "$path" ] || fail "Missing required directory: $path"
}

command -v pnpm >/dev/null 2>&1 || fail "pnpm is required. Install pnpm first."

if [ ! -d node_modules ]; then
  log "Installing locked workspace dependencies"
  pnpm install --frozen-lockfile
else
  log "Using existing workspace dependencies"
fi

log "Cleaning stale desktop bundle and package outputs"
rm -rf \
  apps/desktop/dist/server \
  apps/desktop/dist/web \
  apps/desktop/dist/canvases \
  apps/desktop/build
rm -f \
  apps/desktop/dist/electron.main.js \
  apps/desktop/dist/electron.preload.js
mkdir -p apps/desktop/dist

log "Running workspace typecheck"
pnpm typecheck

log "Building fresh desktop bundle"
pnpm --filter @pingarden/desktop run build:desktop

log "Verifying bundled desktop assets"
require_file "apps/desktop/dist/electron.main.js"
require_file "apps/desktop/dist/electron.preload.js"
require_file "apps/desktop/dist/server/server.js"
require_file "apps/desktop/dist/server/package.json"
require_file "apps/desktop/dist/web/index.html"
require_dir "apps/desktop/dist/web/assets"
require_dir "apps/desktop/dist/canvases"
require_dir "apps/desktop/dist/samples"
require_dir "apps/desktop/dist/samples/wechat-private-domain"

if find apps/desktop/dist -path '*/data/*' -print -quit | grep -q .; then
  fail "Desktop bundle contains runtime data files; installer must not include user/dev data directories."
fi

log "Packaging macOS DMG"
pnpm --filter @pingarden/desktop run dist

DMG_PATH="$(find apps/desktop/build -maxdepth 1 -type f -name '*.dmg' | sort | tail -n 1)"
[ -n "$DMG_PATH" ] || fail "DMG was not generated under apps/desktop/build"
if [ ! -d "apps/desktop/build/mac/PinGarden.app" ] && [ ! -d "apps/desktop/build/mac-arm64/PinGarden.app" ]; then
  fail "Missing required directory: apps/desktop/build/mac/PinGarden.app (or mac-arm64)"
fi

cat <<EOF

✓ PinGarden macOS package is ready

  DMG:  $ROOT/$DMG_PATH
  App:  $ROOT/apps/desktop/build/mac-arm64/PinGarden.app (or build/mac/PinGarden.app)
  Logs: ~/Library/Application Support/PinGarden/logs/server.log

Use this script, or root \`pnpm dist\`, as the canonical packaging path.
EOF
