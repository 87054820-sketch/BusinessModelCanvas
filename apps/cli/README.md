# `pingarden` CLI

The PinGarden command-line tool. Lets AI agents (and humans) read and write canvas state through the same HTTP API the web client uses — without parsing Yjs binary, without touching `apps/server/data/` directly.

## Install

There are two supported paths.

**1. Bundled with the Mac app (recommended).** Install the PinGarden DMG. On first launch the app drops a wrapper script at `~/Library/Application Support/PinGarden/bin/pingarden` and writes setup instructions to `cli-readme.txt` in the same dir. The app uses Electron-as-Node to run the CLI, so you do **not** need a separate Node.js install.

To make `pingarden` available globally, follow option A or B from `cli-readme.txt`. Quick copy-paste:

```bash
# option A — symlink into /usr/local/bin (may need sudo on modern macOS)
ln -s "$HOME/Library/Application Support/PinGarden/bin/pingarden" /usr/local/bin/pingarden

# option B — add the bin directory to PATH (zsh)
echo 'export PATH="$HOME/Library/Application Support/PinGarden/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc
```

**2. Standalone npm package.** When the Mac app isn't an option (CI, Linux, headless server, version-pin a different CLI release than the app):

```bash
npm install -g @pingarden/cli
```

The npm package ships its own copy of the canvas bundles, so the skill generator works without a workspace. It does require Node 20+.

**3. Dev mode (this repo).** While iterating on the CLI itself:

```bash
pnpm --filter @pingarden/cli run build
node apps/cli/dist/index.js doctor
```

## Connection

The CLI auto-discovers a running PinGarden server in this order:

1. `--server <url>` flag
2. `PINGARDEN_SERVER` env var
3. macOS prod port file: `~/Library/Application Support/PinGarden/data/server.port`
4. Dev port file: walks up from cwd to find `.dev/server.port` (the file `start.sh` writes)

If none resolves, the CLI errors with a hint to start the Mac app or `./start.sh`. Run `pingarden doctor` any time to see exactly which path was used.

## Identity

Every request sends the `X-Display-Name` header, recorded by the server as `createdBy` / `updatedBy`. Resolved as:

1. `--as <name>` flag
2. `PINGARDEN_USER` env var
3. `<os user> (cli)` — default fallback (the `(cli)` suffix is intentional, it distinguishes CLI/agent edits from web client edits in audit logs)

## Output

Every command supports `--json`, returning a stable envelope shape:

```json
{ "ok": true, "data": <result> }
{ "ok": false, "error": { "code": "...", "message": "...", "hint": "...", "details": <details?> } }
```

Without `--json`, output is human-readable (table for lists, summary lines for singletons).

Exit codes:

- `0` — success
- `1` — bad input / not found
- `2` — server error (non-2xx HTTP)
- `3` — connection / setup issue (server unreachable, port file missing)

## Command index

```
pingarden doctor
pingarden project   list | get | create | update | delete
pingarden canvas    list | get | create | update | delete
                    describe <id>           # canvas + def + i18n + colorLegend, one JSON
                    describe-template <defId>  # inspect a template before creating
                    read <id>               # /ai-context (block-grouped JSON)
                    write <id>              # bulk replace; auto-snapshot first
pingarden template  list | get
pingarden snapshot  list <canvasId> | create | restore --mode replace|fork | delete
pingarden story     list | get | create | update | delete
pingarden skill     build [--out <dir>] [--lang en|zh|both]
                    install [--local] [--dry-run]
```

Run `pingarden <command> --help` for full flag details.

## The write contract

`pingarden canvas write <id>` is the AI-write seam. Three things to remember:

1. **Replace mode.** Send the complete intended state; the server replaces the entire stickies map (and any other root present in your payload). Sending a delta will delete everything not included.
2. **Auto-snapshot first.** The CLI takes a `pre-ai-edit-<ISO>` milestone before the bulk POST. If the write fails, the snapshot id is in the error message and one `pingarden snapshot restore <id> <sid> --mode replace` away.
3. **Local zone validation.** Before writing, the CLI fetches `/ai-context` and verifies every `zoneId` in your payload exists on the canvas. Unknown zone → no snapshot, no write, exit 1.

Use `--dry-run` to preview the diff without writing or snapshotting.

```bash
# preview
echo '{"stickies":[{"zoneId":"customer-segments","text":"Specialty coffee drinkers"}]}' \
  | pingarden canvas write <canvasId> --dry-run

# write for real (auto-snapshot fires)
echo '{...}' | pingarden canvas write <canvasId>

# from a file
pingarden canvas write <canvasId> --file payload.json
```

## Skill — methodology for AI agents

The skill is a markdown tree at `~/.claude/skills/pingarden/` (or `./.claude/skills/pingarden/` with `--local`). It teaches Claude how to fill each canvas correctly: per-block prompts, examples, quality bars, fill order, anti-patterns, cross-canvas chaining.

```bash
pingarden skill install            # writes / refreshes the skill tree (global ~/.claude/skills/pingarden/)
pingarden skill install --local    # writes to ./.claude/skills/pingarden/ (project-local; Claude Code picks it up there too)
pingarden skill install --dry-run  # report whether install would change anything
pingarden skill build --out <dir>  # generate without installing (useful for CI / inspection)
```

The generator is fully deterministic — `pingarden skill build --out a && pingarden skill build --out b && diff -r a b` is empty. Re-installing on the same canvas content is a no-op (hash sentinel at `.pingarden-skill-hash`).

When you author or edit a canvas's curated `skill.{en,zh}.md` (under `packages/canvases/<id>/`), the next `skill install` will refresh.

**Project-local copy in this repo** — this repo commits a copy of the generated skill at `<repo>/.claude/skills/pingarden/` so it's browsable on GitHub and auto-activates when Claude Code is run inside this repo. Regenerate it after editing any canvas bundle:

```bash
pingarden skill install --local
```

## Workflow examples

**Greenfield BMC from a chat.** The user has been describing a coffee subscription business; you want to write the analysis into PinGarden.

```bash
# 1. Inspect the template — get the zoneIds, prompts, examples
pingarden canvas describe-template business-model-canvas --lang en --json > /tmp/bmc-spec.json

# 2. Compose the project + canvas
PROJECT=$(pingarden project create --name "Coffee Co" --json | jq -r .data.id)
CANVAS=$(pingarden canvas create --project "$PROJECT" --def business-model-canvas --title "Coffee Co BMC" --lang en --json | jq -r .data.id)

# 3. Compose payload locally (stickies referencing zoneIds from /tmp/bmc-spec.json), then write
cat payload.json | pingarden canvas write "$CANVAS" --dry-run --json   # preview
cat payload.json | pingarden canvas write "$CANVAS" --json             # auto-snapshot + bulk POST
```

**Iterate an existing canvas.**

```bash
pingarden canvas read <canvasId> --json > /tmp/current.json   # get current state
# … AI edits the payload locally …
cat refined.json | pingarden canvas write <canvasId> --dry-run   # diff vs current
cat refined.json | pingarden canvas write <canvasId>             # apply
```

**Restore after a regrettable write.**

```bash
pingarden snapshot list <canvasId>
pingarden snapshot restore <canvasId> <sid> --mode replace
# or fork to a side branch:
pingarden snapshot restore <canvasId> <sid> --mode fork
```

## Troubleshooting

- **`PinGarden server not found.`** → Open the Mac app or run `./start.sh`. Verify with `pingarden doctor`.
- **`/health desktopInstanceId` mismatch.** → A stale port file from a crashed server. Restart (`./start.sh` or relaunch the Mac app) to refresh it.
- **`Payload references unknown zoneId(s) for this canvas.`** → Run `pingarden canvas describe <id>` (or `describe-template <defId>` for new) to see valid zoneIds. `zoneId`s are stable English identifiers — never translate them.
- **Write succeeded but you don't see changes.** → You may have been talking to a different server than the one your web client is connected to. Check `pingarden doctor` and the web client's API base URL.

## Development

```bash
pnpm --filter @pingarden/cli run typecheck   # tsc --noEmit
pnpm --filter @pingarden/cli run build       # tsup → dist + assets/canvases
pnpm --filter @pingarden/cli run test        # vitest (when added)
```

Each command is split into a `Command` class (clipanion glue) and a pure handler function. Both live in the same file under `src/commands/`. The handler is the integration point a future MCP server wraps with no CLI dependency.

## Future

- MCP server: `apps/mcp/` would import each command's handler directly. The skill's `workflows/*.md` become MCP prompt templates.
- Multi-server: `--server` already accepts an arbitrary URL, so pointing at a remote PinGarden (once auth is real) is just a config change.
- Real auth: every endpoint is identity-aware via `X-Display-Name`. When the server gains OIDC, only the identity helper in `apps/server/src/http/identity.ts` changes — the CLI sends an extra header.

### Deferred (intentionally not in v1)

- **Auto-symlink to `/usr/local/bin`.** Modern macOS requires admin for that path; a sudo prompt during first launch is user-hostile. Today the Mac app writes a wrapper to `<userData>/bin/pingarden` and a `cli-readme.txt` with three copy-paste install options. Revisit when there's a clearer "happy path" (e.g., the user is on Homebrew and has `/usr/local/bin` writable).
- **Onboarding UI panel.** No React component yet for "Add `pingarden` to PATH" — the readme is plain text. Cheap to add later if telemetry shows users miss the file.
- **`--lang` enforcement on `canvas write`.** The flag exists for fetching ai-context during diff, but the server's `objects/bulk` is language-agnostic. Validating that sticky text language matches the canvas language is a future heuristic.
- **CI gate for skill drift.** The plan calls for `pingarden skill build && git diff --exit-code <repo>/.claude/skills/pingarden/` to catch un-committed canvas-bundle changes. Wire when GitHub Actions is added.
