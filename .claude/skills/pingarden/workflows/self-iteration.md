# Self-iteration — keep the installed skill current

Use this workflow whenever the user asks to install, update, package, release, or verify the PinGarden skill, or when the app has just been upgraded.

## Activation self-check

1. Run `pingarden doctor` first. If the CLI is missing, ask the user to launch the PinGarden desktop app once or use **Help → Install CLI to PATH**.
2. Run a non-destructive update probe:

```bash
pingarden skill install --dry-run --json
```

3. Parse `data.wouldChange`:
   - `false` → the installed skill is current; continue normal work.
   - `true` → the app/CLI/library content can improve the installed skill. If the user asked for install/update/release, run `pingarden skill install`. If the host agent requires approval for writing outside the workspace, request it before installing.
4. After an update, run `pingarden doctor` again and tell the user to reload/restart the AI agent session if their tool caches skills.

## Source-repo release loop

When working inside the PinGarden repo and changing canvases, cases, patterns, experiments, strategy frameworks, skill templates, or install prompts:

```bash
pnpm typecheck
pnpm --filter @pingarden/cli build
node apps/cli/dist/index.js skill install --local
pnpm package:mac
```

`pnpm package:mac` is the canonical release path: it regenerates the project-local skill, creates the portable `pingarden-skill-<version>.zip`, and bundles that zip into the macOS DMG via `extraResources → skill-pack`.

## Drift rules

- Do not manually edit an installed global skill as the source of truth. Change generator inputs, rebuild the CLI, then reinstall.
- Do not keep multiple stale `pingarden-skill-*.zip` files around; packaging intentionally leaves one current zip.
- Do not parse `.ydoc` files or write runtime data while iterating the skill.
- Treat `.pingarden-skill-version` as the installed skill identity: it includes the CLI semver plus the content hash.
