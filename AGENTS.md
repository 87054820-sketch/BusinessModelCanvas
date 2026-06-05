# PinGarden — Agent Instructions

## Quick Reference

| Trigger | Action |
|---------|--------|
| 启动 / start / boot / run | `./start.sh` |
| 停止 / stop / kill | `./stop.sh` |
| 看日志 / logs | `tail -f .dev/server.log .dev/web.log` |
| 打包 Mac 应用 / .dmg / electron | Follow `docs/PACKAGING.md` |

`start.sh` is idempotent — safe to re-run. It kills anything on :4000 / :5173 first.

**URLs once started:**
- Web SPA: http://localhost:5173
- API: http://localhost:4000
- Health: http://localhost:4000/health

---

## Architecture Seams (don't break these)

1. **`CanvasStorage` interface** (`apps/server/src/storage/CanvasStorage.ts`) — every read/write of canvas data flows through here. Never call `fs.*` directly from HTTP handlers.

2. **Identity helper** (`apps/server/src/http/identity.ts`) — `getIdentity(req)` is the single seam. Today reads `X-Display-Name` header.

3. **Canvas asset bundles** (`packages/canvases/<id>/`) — adding a new canvas type = drop in a folder with `manifest.json` + `bg.{en,zh}.svg` + `i18n/{en,zh}.json`. No code changes for the common case.

4. **Yjs from the start** — sticky data is a `Y.Doc` even though the MVP is single-user. To add real-time sync, attach `WebsocketProvider` + server `y-websocket` endpoint; nothing else changes.

5. **i18n** — no hardcoded user-facing strings. App shell → `apps/web/src/i18n/{en,zh}.json`. Per-canvas → `packages/canvases/<id>/i18n/{en,zh}.json`. EN ⇄ 中文 must work for everything.

6. **AI context (read-only)** — `GET /canvases/:id/ai-context?lang=en|zh` is the single endpoint a future AI Copilot reads. Never let LLM code parse Yjs binary directly.

7. **AI/seed writes** — `POST /canvases/:id/stickies/bulk` is how Claude / seed scripts produce stickies in batch. Replace-mode JSON. Live runtime sync still flows through `PUT /canvases/:id/state`.

---

## Where Things Live

```
├── apps/
│   ├── web/         React SPA, Vite dev on :5173
│   ├── server/      Fastify API on :4000
│   └── desktop/     Electron wrapper → .dmg installer
├── packages/
│   ├── shared/      TypeScript domain types (browser + node safe)
│   └── canvases/    Canvas definition bundles (SVG + i18n)
├── docs/
│   └── PACKAGING.md Desktop app build SOP
├── start.sh, stop.sh
└── pnpm-workspace.yaml
```

---

## Contact

- Author: Sibo Li
- Email: sibo.li@foxmail.com
- Shown in app footer: `apps/web/src/pages/ProjectListPage.tsx`

---

## Pre-commit Gates

- `pnpm typecheck` — all workspaces green
- `pnpm --filter @pingarden/web build` — Vite must build
