# PinGarden

Self-hostable, real-time collaborative tool for **Strategyzer-style strategy canvases** — Business Model Canvas, Value Proposition Canvas, Portfolio Map, with more on the way.

> **Status:** M1 (skeleton + types + BMC bundle with placeholder SVG) shipped. M2 (sticky editing + file storage), M3 (real-time sync + presence), M4 (versioning), M5 (VPC + polygon hit-test), M6 (Portfolio Map + axis-grid plugin), M7 (polish + Docker) are queued.

## What it does

- Open a canvas, place sticky notes anywhere within named drop-zones over the **authentic Strategyzer SVG visuals**, and edit together in real time (Miro/Figma-style multi-cursor presence + live sync).
- Auto-save every change, plus user-named **milestones** (*"v1 – kickoff"*, *"v2 – after customer interviews"*) you can browse and restore at any time.
- **No login required** for v1 — users self-declare a display name on first visit (persisted in localStorage). Identity is a single seam, ready for SSO/OIDC later.
- Persists to **local files** behind a `CanvasStorage` interface; swap for Postgres later without touching domain code.
- **English and 简体中文** out of the box; canvas-specific strings live in their own bundle.
- Add new canvas types by dropping in an SVG + a `manifest.json` describing drop-zones — no code changes for the common case.

## Project layout

```
pingarden/
├── apps/
│   ├── web/                              # React + Vite SPA
│   └── server/                           # Fastify + Yjs WS server
├── packages/
│   ├── shared/                           # TypeScript types used by both apps
│   └── canvases/
│       ├── business-model-canvas/
│       │   ├── manifest.json
│       │   ├── bg.en.svg                 # placeholder — drop in real Strategyzer SVG
│       │   ├── bg.zh.svg
│       │   └── i18n/{en,zh}.json
│       └── (vpc, portfolio-map — coming in M5/M6)
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## Quick start (development)

```bash
pnpm install
pnpm dev
```

This runs both:
- `apps/server` on http://localhost:4000
- `apps/web` on http://localhost:5173 (proxies to the server)

## Replacing placeholder canvas SVGs

Each canvas bundle ships with a placeholder SVG so the app runs end-to-end. Replace with the official asset:

1. Drop your SVG into `packages/canvases/<id>/bg.en.svg` (and `bg.zh.svg` for the Chinese version).
2. Make sure the `viewBox` matches `manifest.json`'s `viewBox`. If it doesn't, either:
   - re-export the SVG with the matching viewBox, or
   - update `manifest.json`'s `viewBox` *and* the zone coordinates to match.
3. Restart the server. The app will pick up the new asset automatically.

## Seams designed for future swaps

| Concern  | v1 implementation | Future swap |
|---|---|---|
| Storage  | `FileSystemStorage` (local files)              | `PostgresStorage` — implement `CanvasStorage`. |
| Identity | `X-Display-Name` header, trusted server-side   | OIDC/JWT — change only `apps/server/src/http/identity.ts`. |
| Canvas types | Schema + bundle in `packages/canvases/<id>/` | Same schema; users contribute new bundles. |
| Plugins  | (M6) `axis-grid` for Portfolio Map             | Drop-in plugin folder with `BlockOverride`/`StickyOverride`/`Toolbar`. |

## CloudBase deployment

Current preview deployment:

- Environment: `pingarden-d5gyvjbtdc321cc10`
- CloudRun service: `pingarden`
- Type: container service
- Public URL: https://pingarden-274959-7-1259605451.sh.run.tcloudbase.com/
- Health check: https://pingarden-274959-7-1259605451.sh.run.tcloudbase.com/health
- Resources: `CPU=0.5`, `Mem=1GB`, `MinNum=1`, `MaxNum=2`, `Port=3000`
- Runtime env: `NODE_ENV=production`, `HOST=0.0.0.0`, `PORT=3000`, `SKILL_PACK_DIR=/app/apps/cli/build/skill`, `PINGARDEN_AI_PROVIDER=kimi-http`, `PINGARDEN_KIMI_HTTP_TIMEOUT_MS=120000`
- Copilot provider: Kimi HTTP BYOK (`/copilot/health` returns `provider.provider=kimi-http`)
- AI Strategy Skill Pack: `/copilot/skill-pack/info` and `/copilot/skill-pack` expose the standalone downloadable skill zip for strategy-learning/advisor mode; installing the Mac app + CLI unlocks connected canvas read/write workflows.
- Release smoke test: `pnpm smoke:cloud -- --url https://pingarden-274959-7-1259605451.sh.run.tcloudbase.com`
- Copilot latency benchmark: `PINGARDEN_SMOKE_KIMI_API_KEY=sk-xxx pnpm benchmark:copilot -- --url https://pingarden-274959-7-1259605451.sh.run.tcloudbase.com --runs 5`

This is a single-service preview deployment: the Fastify server serves both API routes and the built Vite SPA.

Cloud Copilot uses Bring Your Own Key mode:

- The browser stores the Kimi API Key in `sessionStorage` by default.
- If the user checks "Remember on this browser", the key is stored in that browser's `localStorage`.
- CloudRun receives the key only in each `test-key` / `chat` request body and never writes it to CloudBase, environment variables, server files, logs, or user data.
- Desktop/local mode can still use the existing `kimi-cli` provider when `PINGARDEN_AI_PROVIDER` is unset.

Important limitations before production use:

- User project data currently uses `FileSystemStorage` with `DATA_DIR=/tmp/pingarden-data` on CloudRun. This is suitable for preview only; persistent multi-user cloud use should replace it with CloudBase PostgreSQL/MySQL/NoSQL storage behind the existing `CanvasStorage` seam.
- Direct refresh of SPA sub-routes should be verified after every deployment. The server contains an SPA fallback path for production, but CloudRun version rollout can lag behind a successful deploy response.

## License

MIT (code). Strategyzer canvas visuals are © Strategyzer AG and not redistributed in this repository — drop your own copies into the canvas bundles.
