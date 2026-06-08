# PinGarden — project memory for Claude

This is a self-hostable real-time collaborative canvas tool (Strategyzer-style: Business Model Canvas, Value Proposition Canvas, Portfolio Map). pnpm workspace with `apps/server` (Fastify + Yjs) and `apps/web` (React + Vite + Tailwind + Yjs).

## Quick commands

| User says (any of)               | What you do                                                         |
| -------------------------------- | ------------------------------------------------------------------- |
| 启动 / 启动一下 / start / boot / launch / run | Run `./start.sh` from the project root                |
| 停止 / 停 / stop / kill          | Run `./stop.sh`                                                     |
| 重启 / restart                   | Run `./start.sh` (it's idempotent — kills old instances first)      |
| 看日志 / logs / tail             | `tail -f .dev/server.log .dev/web.log`                              |
| 状态 / 是否运行 / status         | `lsof -ti tcp:4000 tcp:5173` to check, then report                  |
| 打包 / 打 dmg / package / build dmg / 重打 dmg | Run `pnpm package:mac` from the project root (see "Packaging" below) |

`start.sh` is idempotent: it kills anything on `:4000` / `:5173` first, runs `pnpm install` only if `node_modules/` is missing, daemonizes both servers via `nohup`, and waits for both to answer before printing the URLs. Logs and PID files live in `.dev/` (gitignored).

**Stopping the dev servers is NOT allowed except in essential scenarios.** Run `./stop.sh` ONLY when:
1. The user issues an explicit stop trigger from the table above (停止 / 停 / stop / kill / 关 / shutdown), OR
2. There is a hard technical reason that requires the servers to be down — e.g. a destructive migration that would corrupt running state, or a port conflict you cannot resolve any other way.

If you started the servers for your own verification (smoke tests, API probes, log inspection, etc.), **leave them running** when you finish. `start.sh`'s idempotent restart means there is no cleanup obligation; the user almost always wants the running servers to keep working for them. "Tidying up after myself" is NOT an essential scenario — it is exactly the failure mode this rule exists to prevent.

URLs once started:
- Web SPA: http://localhost:5173
- API:     http://localhost:4000
- Health:  http://localhost:4000/health

## Packaging (macOS DMG)

The desktop app is shipped as an unsigned macOS DMG. **There is exactly one canonical packaging entry point** — anything else risks producing an .app without a DMG (or a stale DMG, which is what bit us when a release "looked" un-updated).

```bash
pnpm package:mac          # at the repo root — preferred
# all of these are aliases that run scripts/package-mac.sh:
pnpm build:desktop
pnpm dist
bash scripts/package-mac.sh
```

Every successful run produces **both** artifacts in `apps/desktop/build/`:
1. `mac-arm64/PinGarden.app`         (loose .app bundle for direct copy)
2. `PinGarden-<version>-arm64.dmg`   (DMG installer)

If either is missing the script exits non-zero. The script also runs `pnpm typecheck` upfront and fails fast on type errors — packaging is the gating moment for "is the workspace green".

**Before packaging a release**: bump `apps/desktop/package.json:version` (this is what flows into `CFBundleShortVersionString`, the DMG filename, and macOS About / Get Info). Without a bump, recipients see the same version string and assume the build is identical to the previous one even when source has changed.

**Distribution caveat**: there's no Apple Developer ID signing yet, so on any machine other than the builder's, the recipient must clear the quarantine bit after dragging the .app into /Applications:
```bash
xattr -cr /Applications/PinGarden.app
```
The script's success summary prints this reminder.

**Do NOT** use `pnpm --filter @pingarden/desktop run dist:dir` for distribution — that target is intentionally DMG-less (it produces only the loose .app for desktop-shell debugging and is much faster). It is a release foot-gun: the DMG file in `apps/desktop/build/` will not be regenerated, so a follow-up `cp` or upload silently ships the previous DMG.

## Architectural seams (don't break these)

These are the load-bearing abstractions that let the project scale without rewrites. Always route new code through them.

1. **`CanvasStorage` interface** (`apps/server/src/storage/CanvasStorage.ts`) — every read/write of canvas data flows through here. `apps/server/src/http/*` and `apps/server/src/snapshots/*` must NEVER call `fs.*` directly. Today: `FileSystemStorage`. Future: `PostgresStorage` is a drop-in replacement.

2. **Identity helper** (`apps/server/src/http/identity.ts`) — `getIdentity(req)` is the single seam. Today reads `X-Display-Name` header. To add SSO/OIDC later, change ONLY this file.

3. **Canvas asset bundles** (`packages/canvases/<id>/`) — adding a new canvas type = drop in a folder with `manifest.json` + `bg.{en,zh}.svg` + `i18n/{en,zh}.json`. No code changes for the common case. Plugins (`axis-grid`) live in `apps/web/src/plugins/<id>/`.

4. **Yjs from the start** — sticky data is a `Y.Doc` even though the MVP is single-user. To add real-time sync, attach `WebsocketProvider` and a server `y-websocket` endpoint; nothing else changes.

5. **i18n** — no hardcoded user-facing strings. App shell strings → `apps/web/src/i18n/{en,zh}.json`. Per-canvas strings → `packages/canvases/<id>/i18n/{en,zh}.json`. EN ⇄ 中文 must work for everything.

6. **AI context (read-only)** — `GET /canvases/:id/ai-context?lang=en|zh` (`apps/server/src/http/aiContext.ts`) is the single endpoint a future AI Copilot reads. It hydrates Yjs sticky binary state into block-grouped JSON with translated titles + guidance and a per-sticky `zoneHistory` audit trail. Never let LLM code parse Yjs binary directly — always go through this route.

7. **AI/seed writes** — `POST /canvases/:id/stickies/bulk` (`apps/server/src/http/stickyImport.ts`) is how Claude / seed scripts / a future AI Copilot produce stickies in batch. **Replace-mode** JSON: the entire stickies map is rebuilt from the payload. Mirrors the web client's `addSticky` Yjs encoding (`apps/web/src/collab/stickies.ts` is the source of truth) so `useStickies` decodes the result correctly. Live runtime sync (multi-cursor, per-keystroke edits) still flows through `PUT /canvases/:id/state` — the two are intentionally separate seams: CRDT for live editing, batch JSON for seed/import.

8. **Canvas display contract** (`docs/CANVAS_DISPLAY_CONTRACT.md`) — read this before adding or changing any canvas bundle. Do not duplicate canvas title/subtitle across SVG, modal preview, and right knowledge panel. Zone labels come from `i18n`; preview/live display choices come from `manifest.display`; sticky colour meanings come from `defaultColorLegend`, not SVG artwork.

## Where things live

```
pingarden/
├── apps/
│   ├── web/                              React SPA, Vite dev on :5173
│   └── server/                           Fastify API + (future) y-websocket on :4000
├── packages/
│   ├── shared/                           TypeScript domain types (browser + node safe)
│   └── canvases/
│       ├── business-model-canvas/        real Strategyzer SVG, 9 rect zones
│       ├── business-model-environment/   4 external forces (key trends, market, industry, macro) around BMC ref
│       ├── value-proposition-canvas/     placeholder, 3 polygon + 3 circle-segment zones
│       ├── portfolio-map/                placeholder, 2 rect zones, axis-grid plugin
│       ├── empathy-map/                  XPLANE layout, 7 zones (persona + 4 triangles + pain/gain)
│       ├── ad-lib-value-proposition/     8 sentence-template zones, portrait
│       └── jobs-to-be-done/              5 sequential blocks, portrait (situation→motivation→outcome→emotional→social)
├── start.sh, stop.sh                     local boot scripts
├── .dev/                                 logs + PID files (gitignored)
├── apps/server/data/                     persisted canvas state (gitignored)
└── pnpm-workspace.yaml
```

## Status (2026-06-02)

- ✓ M1 — skeleton, types, BMC bundle (real Strategyzer SVG)
- ✓ M2 — sticky CRUD via Yjs + file persistence (single-user MVP)
- ✓ M4 — named milestones + history + restore (replace / fork)
- ✓ M5 — VPC bundle (placeholder, polygon + circle-segment hit-test)
- ✓ M6 — Portfolio Map bundle (placeholder, axis-grid plugin)
- ✓ Workspace refactor — Project entity + 3-column editor + rich block guidance + delete affordances at every level
- ✓ Empathy Map + Ad-Lib VP bundles, soft-pastel sticky palette
- ✓ AI-context read endpoint + per-sticky `zoneHistory` audit trail
- ✓ Home page redesign — canvas templates gallery + richer project cards + bulk-sticky import endpoint
- ✓ Jobs To Be Done canvas — 5-block JTBD framework (situation → motivation → outcome → emotional → social)
- ✓ Business Model Environment canvas + cross-canvas relationship chips (`related[]` in each manifest, "Pairs with" strip in inspector)
- ✓ Unified Canvas Config inspector — strategy / pin / sticky sections visually grouped; pin & sticky chip rails share the same Add flow
- ✓ Sticky resize handle + auto-add sticky legend + Pin/Sticky inspector visual parity (one-circle class picker, "shown on canvas" hints)
- ☐ Real-time multi-cursor + presence (single tab only today)
- ☐ Autosave snapshots, Docker Compose, polish

## Pre-commit gates

Whenever you finish a chunk of work:
- `pnpm typecheck` (all 3 workspaces must be green)
- `pnpm --filter @pingarden/web build` (Vite must build)

The plan file for the current/most-recent work iteration is at `~/.claude-internal/plans/robust-foraging-mango.md`.
