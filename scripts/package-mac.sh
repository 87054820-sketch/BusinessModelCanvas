#!/usr/bin/env bash
# Canonical macOS DMG packaging entry for PinGarden.
#
# Contract: every successful run produces BOTH artifacts —
#   1. apps/desktop/build/mac-arm64/PinGarden.app   (loose .app bundle)
#   2. apps/desktop/build/PinGarden-<version>-arm64.dmg
# If either is missing the script exits non-zero and prints which one.
#
# Do NOT use `pnpm --filter @pingarden/desktop run dist:dir` for
# distribution — that target intentionally skips DMG creation and is
# only for desktop-shell debugging where you want the loose .app fast.
# Always go through this script (or one of its aliases:
# `pnpm package:mac`, `pnpm build:desktop`, `pnpm dist` at repo root).

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
# macOS sometimes flags `.DS_Store` files as hidden via `chflags`,
# which makes `rm -rf` refuse with "Directory not empty". Strip the
# flag preemptively on anything we're about to delete. Errors here are
# benign (e.g. directory already gone, no flagged files).
chflags -R nohidden apps/desktop/build apps/desktop/dist 2>/dev/null || true
rm -rf \
  apps/desktop/dist/server \
  apps/desktop/dist/web \
  apps/desktop/dist/canvases \
  apps/desktop/dist/samples \
  apps/desktop/build \
  apps/cli/dist \
  apps/cli/assets
rm -f \
  apps/desktop/dist/electron.main.js \
  apps/desktop/dist/electron.preload.js
mkdir -p apps/desktop/dist

log "Running workspace typecheck"
pnpm typecheck

log "Building CLI (tsup → dist + assets/canvases)"
pnpm --filter @pingarden/cli run build

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
# CLI tree gets pulled in via electron-builder extraResources; verify it
# was actually built before electron-builder picks it up.
require_file "apps/cli/dist/index.js"
require_dir "apps/cli/assets/canvases"
require_file "apps/cli/assets/canvases/business-model-canvas/manifest.json"

if find apps/desktop/dist -path '*/data/*' -print -quit | grep -q .; then
  fail "Desktop bundle contains runtime data files; installer must not include user/dev data directories."
fi

log "Packaging macOS DMG (electron-builder, dmg target)"
pnpm --filter @pingarden/desktop run dist

# Locate the produced .app and .dmg. electron-builder writes to either
# `mac/` (Intel build) or `mac-arm64/` (Apple Silicon) depending on the
# host arch. The DMG always lives directly under build/.
APP_PATH=""
if   [ -d "apps/desktop/build/mac-arm64/PinGarden.app" ]; then
  APP_PATH="apps/desktop/build/mac-arm64/PinGarden.app"
elif [ -d "apps/desktop/build/mac/PinGarden.app" ]; then
  APP_PATH="apps/desktop/build/mac/PinGarden.app"
fi
[ -n "$APP_PATH" ] || fail "Missing .app bundle: expected apps/desktop/build/{mac,mac-arm64}/PinGarden.app"

DMG_PATH="$(find apps/desktop/build -maxdepth 1 -type f -name '*.dmg' | sort | tail -n 1)"
[ -n "$DMG_PATH" ] || fail "DMG was not generated under apps/desktop/build"

# Read version straight off the bundled Info.plist so the summary
# matches what macOS will actually show in About / Get Info.
VERSION="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$APP_PATH/Contents/Info.plist" 2>/dev/null || echo 'unknown')"
APP_SIZE_HUMAN="$(du -sh "$APP_PATH" | awk '{print $1}')"
DMG_SIZE_HUMAN="$(du -sh "$DMG_PATH" | awk '{print $1}')"

cat <<EOF

✓ PinGarden macOS package is ready  (version $VERSION)

  DMG:  $ROOT/$DMG_PATH   ($DMG_SIZE_HUMAN)
  App:  $ROOT/$APP_PATH   ($APP_SIZE_HUMAN)
  Logs: ~/Library/Application Support/PinGarden/logs/server.log

This build is unsigned (no Apple Developer ID). On any machine other
than the one that built it, the recipient must clear the quarantine
attribute after dragging the .app into /Applications:

    xattr -cr /Applications/PinGarden.app

Use this script (or 'pnpm package:mac' / 'pnpm build:desktop' / 'pnpm dist'
at the repo root) as the canonical packaging path. Never use
'pnpm --filter @pingarden/desktop run dist:dir' for distribution — it
skips DMG creation by design.
EOF
