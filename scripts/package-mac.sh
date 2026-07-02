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

print_package_diagnostics() {
  printf '\nPackage diagnostics:\n' >&2
  printf '  build dir: ' >&2
  if [ -d apps/desktop/build ]; then
    find apps/desktop/build -maxdepth 2 -print | sed 's#^#    #' >&2
  else
    printf 'missing\n' >&2
  fi
  printf '  desktop dist: ' >&2
  if [ -d apps/desktop/dist ]; then
    du -sh apps/desktop/dist >&2 || true
  else
    printf 'missing\n' >&2
  fi
}

require_file() {
  local path=$1
  [ -f "$path" ] || fail "Missing required file: $path"
}

require_dir() {
  local path=$1
  [ -d "$path" ] || fail "Missing required directory: $path"
}

resolve_kimi_bin() {
  if [ -n "${KIMI_BIN:-}" ] && [ -f "$KIMI_BIN" ]; then
    printf '%s\n' "$KIMI_BIN"
    return 0
  fi

  if [ -f "$HOME/.kimi-code/bin/kimi" ]; then
    printf '%s\n' "$HOME/.kimi-code/bin/kimi"
    return 0
  fi

  local found
  found="$(command -v kimi 2>/dev/null || true)"
  if [ -n "$found" ] && [ -f "$found" ]; then
    printf '%s\n' "$found"
    return 0
  fi

  return 1
}

stage_kimi_cli() {
  local src
  src="$(resolve_kimi_bin)" || fail "Kimi CLI binary is required for release packaging. Install Kimi Code first or set KIMI_BIN=/path/to/kimi."

  local stage_dir="apps/desktop/.package/kimi-cli"
  rm -rf "$stage_dir"
  mkdir -p "$stage_dir/bin"
  cp "$src" "$stage_dir/bin/kimi"
  chmod 755 "$stage_dir/bin/kimi"

  "$stage_dir/bin/kimi" --version >/dev/null 2>&1 || fail "Staged Kimi CLI failed to run: $stage_dir/bin/kimi"
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
  apps/desktop/dist/case-library \
  apps/desktop/build \
  apps/desktop/.package \
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

# Gate the case library before doing anything else expensive — a broken
# case.json or undecodable live.ydoc would surface much later as a
# runtime error in the packaged app, after a 5-minute desktop build.
# Catch it here so the failure is fast and the diagnostic is precise.
log "Validating case library (packages/case-library/)"
node apps/cli/dist/index.js case validate

# The repo commits one canonical generated skill tree at
# <repo>/.agents/skills/pingarden/. Claude Code discovers it via the
# .claude/skills/pingarden symlink created by skill install --local.
# Regenerating it here makes the committed skill match the canvas bundles
# shipped in the DMG — no chance of skill drift after a release.
log "Refreshing project-local agent skill (.agents/skills/pingarden/ + .claude symlink)"
node apps/cli/dist/index.js skill install --local

# Build a portable zip of the skill so it can be handed to users who want
# AI strategy guidance even before they install the PinGarden Mac app.
log "Bundling skill zip distribution (apps/cli/build/skill/)"
node scripts/build-skill-pack.mjs
SKILL_OUT_DIR="apps/cli/build/skill"
SKILL_ZIP="$(find "$SKILL_OUT_DIR" -maxdepth 1 -type f -name 'pingarden-skill-*.zip' | sort | tail -n 1)"
[ -n "$SKILL_ZIP" ] || fail "Skill zip was not generated under $SKILL_OUT_DIR"
SKILL_VERSION="$(basename "$SKILL_ZIP" | sed -E 's/^pingarden-skill-(.+)\.zip$/\1/')"

log "Staging bundled Kimi CLI (binary only, no local config/logs)"
stage_kimi_cli

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
require_dir "apps/desktop/dist/case-library"
require_file "apps/desktop/dist/case-library/manifest.json"
require_dir "apps/desktop/dist/case-library/cases/swiss-private-banking"
require_dir "apps/desktop/dist/case-library/resources"
require_file "apps/desktop/dist/case-library/resources/the-invincible-company/resource.json"
# CLI tree gets pulled in via electron-builder extraResources; verify it
# was actually built before electron-builder picks it up.
require_file "apps/cli/dist/index.js"
require_dir "apps/cli/assets/canvases"
require_file "apps/cli/assets/canvases/business-model-canvas/manifest.json"
# Project-local skill copy must be in sync with the canvas bundles we
# just built — committing a stale skill defeats the purpose of keeping a
# repo-side copy.
require_file ".agents/skills/pingarden/SKILL.md"
require_dir ".agents/skills/pingarden/canvases"
if [ ! -L ".claude/skills/pingarden" ]; then
  fail ".claude/skills/pingarden must be a symlink to .agents/skills/pingarden."
fi
# The skill zip is the portable artifact for non-Claude-Code agents.
require_file "$SKILL_ZIP"
require_file "apps/desktop/.package/kimi-cli/bin/kimi"

if ! grep -q 'to: skill-pack' apps/desktop/electron-builder.yml; then
  fail "electron-builder.yml must bundle apps/cli/build/skill as extraResources → skill-pack."
fi

if ! grep -q 'to: kimi-cli' apps/desktop/electron-builder.yml; then
  fail "electron-builder.yml must bundle apps/desktop/.package/kimi-cli as extraResources → kimi-cli."
fi

if find apps/desktop/dist -path '*/data/*' -print -quit | grep -q .; then
  fail "Desktop bundle contains runtime data files; installer must not include user/dev data directories."
fi

log "Packaging macOS DMG (electron-builder, dmg target)"
if ! pnpm --filter @pingarden/desktop run dist; then
  print_package_diagnostics
  fail "electron-builder failed while generating the macOS DMG. See the diagnostics above."
fi

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
require_file "$APP_PATH/Contents/Resources/kimi-cli/bin/kimi"

DMG_PATH="$(find apps/desktop/build -maxdepth 1 -type f -name '*.dmg' | sort | tail -n 1)"
[ -n "$DMG_PATH" ] || fail "DMG was not generated under apps/desktop/build"

# Read version straight off the bundled Info.plist so the summary
# matches what macOS will actually show in About / Get Info.
VERSION="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$APP_PATH/Contents/Info.plist" 2>/dev/null || echo 'unknown')"
APP_SIZE_HUMAN="$(du -sh "$APP_PATH" | awk '{print $1}')"
DMG_SIZE_HUMAN="$(du -sh "$DMG_PATH" | awk '{print $1}')"
SKILL_ZIP_SIZE_HUMAN="$(du -sh "$SKILL_ZIP" | awk '{print $1}')"

cat <<EOF

✓ PinGarden macOS package is ready  (version $VERSION)

  DMG:        $ROOT/$DMG_PATH   ($DMG_SIZE_HUMAN)
  App:        $ROOT/$APP_PATH   ($APP_SIZE_HUMAN)
  Skill zip:  $ROOT/$SKILL_ZIP   ($SKILL_ZIP_SIZE_HUMAN, version $SKILL_VERSION)
  Logs:       ~/Library/Application Support/PinGarden/logs/server.log

The skill zip is a portable artifact for Claude, Code Cursor, Codex,
CodeBuddy, WorkBuddy, and other agents. Hand-deliver it; the recipient
unpacks it into the matching skills / rules dir — see INSTALL.md inside
the zip.

This build is unsigned (no Apple Developer ID). On any machine other
than the one that built it, the recipient must clear the quarantine
attribute after dragging the .app into /Applications:

    xattr -cr /Applications/PinGarden.app

Use this script (or 'pnpm package:mac' / 'pnpm build:desktop' / 'pnpm dist'
at the repo root) as the canonical packaging path. Never use
'pnpm --filter @pingarden/desktop run dist:dir' for distribution — it
skips DMG creation by design.
EOF
