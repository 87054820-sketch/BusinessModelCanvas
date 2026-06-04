# Canvas Collab

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
canvas-collab/
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

## License

MIT (code). Strategyzer canvas visuals are © Strategyzer AG and not redistributed in this repository — drop your own copies into the canvas bundles.
