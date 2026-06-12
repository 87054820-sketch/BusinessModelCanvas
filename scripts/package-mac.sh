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
  apps/desktop/dist/case-library \
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

# Gate the case library before doing anything else expensive — a broken
# case.json or undecodable live.ydoc would surface much later as a
# runtime error in the packaged app, after a 5-minute desktop build.
# Catch it here so the failure is fast and the diagnostic is precise.
log "Validating case library (packages/case-library/)"
node apps/cli/dist/index.js case validate

# The repo commits a copy of the generated skill tree at
# <repo>/.claude/skills/pingarden/ so it's browsable on GitHub and
# auto-activates when Claude Code is run inside this repo. Regenerating
# it here makes the committed skill match the canvas bundles shipped in
# the DMG — no chance of skill drift after a release.
log "Refreshing project-local Claude skill (.claude/skills/pingarden/)"
node apps/cli/dist/index.js skill install --local

# Build a portable zip of the skill so it can be handed to users who
# want it in a non-Claude-Code agent (Cursor, Copilot, Cline, …) or
# air-gapped machines. Filename embeds the content-hash version so two
# zips with the same name are guaranteed byte-identical inputs.
log "Bundling skill zip distribution (apps/cli/build/skill/)"
SKILL_VERSION="$(tr -d '[:space:]' < .claude/skills/pingarden/.pingarden-skill-version)"
[ -n "$SKILL_VERSION" ] || fail "Could not read skill version sentinel — was 'skill install --local' aborted?"
SKILL_OUT_DIR="apps/cli/build/skill"
SKILL_ZIP="$SKILL_OUT_DIR/pingarden-skill-${SKILL_VERSION}.zip"
SKILL_STAGE="apps/cli/build/skill-staging"

rm -rf "$SKILL_STAGE"
mkdir -p "$SKILL_STAGE/pingarden" "$SKILL_OUT_DIR"
ditto .claude/skills/pingarden/ "$SKILL_STAGE/pingarden/"

# Wipe stale zips — keeping multiple versions side-by-side just confuses
# downstream consumers. The file is content-addressed by hash anyway.
find "$SKILL_OUT_DIR" -maxdepth 1 -type f -name 'pingarden-skill-*.zip' -delete

# Generate the install README inside the zip. Kept here (not in the
# skill tree) so it never pollutes Claude Code's loaded context.
cat > "$SKILL_STAGE/INSTALL.md" <<'INSTALL_EOF'
# PinGarden skill — install

This zip contains the official PinGarden domain skill: how to fill each
canvas (BMC, VPC, JTBD, Empathy Map, Customer Journey, Strategy Canvas,
…) and how to drive the local PinGarden app via the `pingarden` CLI.

The `pingarden/` folder is **plain markdown** — no code, no runtime.
Version: see `pingarden/.pingarden-skill-version` (content-addressed
SHA-256 over the source canvas bundles; identical inputs always produce
identical zip contents).

## Claude Code (native)

```bash
unzip -o pingarden-skill-*.zip -d ~/.claude/skills/
# → ~/.claude/skills/pingarden/SKILL.md
```

Auto-loads on the next Claude Code session. Trigger phrases: "draft a
BMC", "fill the value proposition", "snapshot before editing", or any
`pingarden …` invocation.

## Cursor

```bash
unzip -o pingarden-skill-*.zip -d <repo>/.cursor/skills/
echo 'See .cursor/skills/pingarden/SKILL.md before any pingarden task.' \
  >> <repo>/.cursorrules
```

## GitHub Copilot Chat

```bash
unzip -o pingarden-skill-*.zip -d <repo>/.github/skills/
cat <repo>/.github/skills/pingarden/SKILL.md \
  >> <repo>/.github/copilot-instructions.md
```

## Cline / Roo Code / Continue.dev / Aider

Unzip anywhere on disk, then point the agent's rules file
(`.clinerules` / `.continuerules` / `.aider.conf.yml`'s `read:`) at
the absolute path of `pingarden/SKILL.md`.

## Generic LLM (no rules system)

Concatenate the markdown into the system prompt:

```bash
unzip -o pingarden-skill-*.zip -d /tmp
cat /tmp/pingarden/SKILL.md /tmp/pingarden/canvases/*.md /tmp/pingarden/workflows/*.md \
  > /tmp/pingarden-context.md
```

## What you also need

The skill teaches the agent how to call the `pingarden` CLI; the CLI
itself ships with the PinGarden Mac app, or via
`npm install -g @pingarden/cli`. Without the CLI installed and the
PinGarden server running, the agent has methodology but no write path.

Run `pingarden doctor` to confirm both halves are in place.
INSTALL_EOF

# -X strips extra attrs for stability across machines; --quiet keeps
# packaging logs readable. Run from staging so paths are clean
# (`pingarden/...` and `INSTALL.md` at the zip root, no leading dirs).
( cd "$SKILL_STAGE" && zip -r -X --quiet "$ROOT/$SKILL_ZIP" pingarden INSTALL.md )
rm -rf "$SKILL_STAGE"

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
require_dir "apps/desktop/dist/case-library/cases/wechat-private-domain"
# CLI tree gets pulled in via electron-builder extraResources; verify it
# was actually built before electron-builder picks it up.
require_file "apps/cli/dist/index.js"
require_dir "apps/cli/assets/canvases"
require_file "apps/cli/assets/canvases/business-model-canvas/manifest.json"
# Project-local skill copy must be in sync with the canvas bundles we
# just built — committing a stale skill defeats the purpose of keeping a
# repo-side copy.
require_file ".claude/skills/pingarden/SKILL.md"
require_dir ".claude/skills/pingarden/canvases"
# The skill zip is the portable artifact for non-Claude-Code agents.
require_file "$SKILL_ZIP"

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
SKILL_ZIP_SIZE_HUMAN="$(du -sh "$SKILL_ZIP" | awk '{print $1}')"

cat <<EOF

✓ PinGarden macOS package is ready  (version $VERSION)

  DMG:        $ROOT/$DMG_PATH   ($DMG_SIZE_HUMAN)
  App:        $ROOT/$APP_PATH   ($APP_SIZE_HUMAN)
  Skill zip:  $ROOT/$SKILL_ZIP   ($SKILL_ZIP_SIZE_HUMAN, version $SKILL_VERSION)
  Logs:       ~/Library/Application Support/PinGarden/logs/server.log

The skill zip is a portable artifact for non-Claude-Code agents
(Cursor, Copilot, Cline, …). Hand-deliver it; the recipient unzips
into ~/.claude/skills/ (or another agent's rules dir — see INSTALL.md
inside the zip).

This build is unsigned (no Apple Developer ID). On any machine other
than the one that built it, the recipient must clear the quarantine
attribute after dragging the .app into /Applications:

    xattr -cr /Applications/PinGarden.app

Use this script (or 'pnpm package:mac' / 'pnpm build:desktop' / 'pnpm dist'
at the repo root) as the canonical packaging path. Never use
'pnpm --filter @pingarden/desktop run dist:dir' for distribution — it
skips DMG creation by design.
EOF
