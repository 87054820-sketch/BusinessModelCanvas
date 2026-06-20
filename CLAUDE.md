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
| CLI / pingarden 命令             | `node apps/cli/dist/index.js <subcommand>` (after `pnpm --filter @pingarden/cli run build`) — see `apps/cli/README.md` |

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

**Skill regeneration is part of packaging.** `scripts/package-mac.sh` runs `pingarden skill install --local` after the CLI build, so the project-local skill at `<repo>/.claude/skills/pingarden/` is always regenerated against the canvas bundles being shipped. The script verifies `.claude/skills/pingarden/SKILL.md` exists before continuing — if you remove that step, the committed skill silently drifts from the DMG's canvas content. Don't.

**Skill zip distribution.** The same packaging run also produces `apps/cli/build/skill/pingarden-skill-<version>.zip` — a portable artifact for users on non-Claude-Code agents (Cursor, Copilot Chat, Cline, …) or air-gapped machines. The zip contains `pingarden/` (the full skill tree) plus a top-level `INSTALL.md` with copy-paste install commands for every common agent. Filename embeds the content-hash version (e.g. `0.1.0-ff95de6f`) so identical canvas bundles always produce identical zip names. This file is the only `apps/cli/build/` output and is gitignored.

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

9. **`pingarden` CLI + Claude skill** (`apps/cli/`) — the AI-write seam at the shell level. The CLI is a pure HTTP client; it discovers the running server via `<dataDir>/server.port` (or `.dev/server.port` in dev) and calls the same endpoints the web client uses. Every `canvas write` takes an auto pre-edit milestone snapshot, validates `zoneId`s locally against `/ai-context`, then POSTs to `/objects/bulk`. **Never let CLI code touch `apps/server/data/` directly** or parse Yjs binary — it must go through the API. The companion **skill** is fully generated from `packages/canvases/<id>/{manifest.json,i18n,knowledge,skill.{en,zh}.md}` plus `packages/case-library/patterns/<slug>/{pattern.json,description.{en,zh}.md,skill.{en,zh}.md}` — no parallel methodology files. Adding curated TL;DR to a canvas = drop `skill.{en,zh}.md` next to its manifest. Adding a "Pairs with" reason = add a `relatedNotes` entry to the manifest. The repo commits a copy of the generated skill at `<repo>/.claude/skills/pingarden/` (browsable on GitHub, auto-activates when Claude Code runs in this repo); also installable globally to `~/.claude/skills/pingarden/`. See `apps/cli/README.md` for full UX, `apps/cli/src/skill/templates.ts` for the markdown contract.

   **Skill audit on new content types.** Whenever you add a new content type to the library or canvas system (a new canvas type, a new business-model pattern, a new case kind, a new workflow concept), audit the skill before shipping: does the new type need its own `skill.{en,zh}.md`? Does the skill generator (`apps/cli/src/skill/{discover,bundle,generate,templates}.ts`) need a new discover/bundle/template path to scan the new directory? Does `SKILL.md`'s index need a new section? The skill is the AI's mental model of PinGarden — leaving a content type out of the skill means agents can't reason about it. The pre-commit gate for any feature touching `packages/case-library/`, `packages/canvases/`, or any new top-level content directory is: rebuild the CLI, run `pingarden skill install --local`, diff `<repo>/.claude/skills/pingarden/`, verify the new content surfaces.

10. **Case library — read-only federated storage** (`packages/case-library/` + `apps/server/src/storage/{Bundle,Federated}Storage.ts`) — curated company / industry / comparison analyses ship baked into the app like canvas bundles, alongside abstract **business-model patterns** (Long Tail, Unbundling, …) at `packages/case-library/patterns/<slug>/`. Patterns are NOT cases — they have no project, no canvas, no fork; they are pure curated content (pattern.json + bilingual description + bilingual skill). Storage is a federation: `FederatedStorage` reads from `BundleStorage` (read-only, scans `<bundleDir>/cases/<slug>/` AND `<bundleDir>/patterns/<slug>/`) first, falls back to `FileSystemStorage` (writable user data). Any write hitting a library id throws `BundleReadOnlyError` → 403 (mapped by `app.setErrorHandler` in `server.ts`). HTTP routes: `GET /library/cases`, `GET /library/cases/:slug`, `POST /library/cases/:slug/fork` (deep copy with story canvasId rewrite), `GET /library/patterns`, `GET /library/patterns/:slug` (hydrated example cases). Cross-link: `CaseLibraryEntry.appliesPatterns: string[]` (forward) ↔ `BusinessModelPattern.examples: CaseExampleRef[]` (reverse, curated by pattern author); both many-to-many. The Yjs encoder for case `live.ydoc` files lives in `packages/shared/src/yjs.ts` — `encodeObjectsBulk` is a pure function consumed by both the server (`POST /objects/bulk`) and the CLI (`pingarden case author`), so authored cases round-trip through the runtime byte-identically. Adding a new case = `pingarden case author --from <spec.json> --out packages/case-library/cases/<slug>/` then add the slug to `packages/case-library/manifest.json`. Adding a new pattern = hand-write the five files under `packages/case-library/patterns/<slug>/` (pattern.json + bilingual description + bilingual skill) following the template in `packages/case-library/README.md` → "Adding a new business-model pattern" — **then run the pattern audit** (see below). Validation gate runs in `scripts/package-mac.sh` via `pingarden case validate` — cross-checks both directions (case `appliesPatterns` slug exists, pattern `examples` slug exists). **Bilingual content is required**: every case AND pattern ships with both EN and ZH. Case metadata uses LocalizedLabel and is type-enforced; sticky text and story content currently use parallel canvases per language (2N canvases for N variants — see `packages/case-library/cases/swiss-private-banking/`) until a future schema upgrade folds sticky.text into LocalizedString. Single-language cases fail `case validate`.

   **Pattern audit on new patterns.** When you add a new business-model pattern under `packages/case-library/patterns/<slug>/`, walk every existing case in `packages/case-library/cases/` and decide whether the case ALSO applies the new pattern. If yes, append the slug to `case.json.appliesPatterns[]`. Skipping this audit silently weakens the cross-link graph — patterns become orphans relative to the cases that should exemplify them, and cases miss surfacing the pattern in their chip strip. Pre-merge gate: read the new pattern's `examples[]` AND grep all `case.json` for the new pattern slug AND run `pingarden case validate` (which enforces both forward and reverse links resolve). Be biased toward fewer tags — only tag a case when the new pattern is clearly a primary or secondary description of the business, not a faint adjacency. The 2026-06-15 MSP rollout is the worked example: tagged 4 existing cases (`udemy`, `aliexpress`, `lulu-com`, `lego-long-tail`) and explicitly rejected several adjacent cases (`swiss-private-banking`, `mobile-telco-unbundling`, `patagonia`, `carvana`, `cainiao`) — the rejections matter as much as the tags. Authoring template lives in `packages/case-library/README.md` → "Adding a new business-model pattern"; AI workflow at `<repo>/.claude/skills/pingarden/workflows/authoring-patterns.md`.

   **Vite proxy audit when adding a new `/library/*` API route.** Every new sub-path under `/library/` (e.g. `/library/experiments` in 2026-06-18, future `/library/<whatever>`) MUST also be added to `apps/web/vite.config.ts`'s `server.proxy` map, alongside the existing `/library/cases` and `/library/patterns` entries. The proxy list is **explicit per sub-path** — bare `/library` is intentionally NOT proxied because `/library` itself is a SPA route (`LibraryPage`); a wildcard `/library` would forward HTML page loads to Fastify which 404s. Forget the proxy entry and the symptom is silent: server-side `curl http://localhost:4000/library/<new>` works fine, the Vite dev server starts cleanly, the browser tab renders the new UI shell, but every fetch from the page resolves to 5173's SPA `index.html` and the client gets `SyntaxError: Unexpected token '<', "<!doctype "... is not valid JSON`. The 2026-06-18 Round 10 ship hit this exact trap. Pre-merge checklist whenever you add a `/library/*` route in `apps/server/src/http/library.ts`: (1) grep `vite.config.ts` for the new prefix, (2) restart the Vite dev server (proxy config changes do NOT hot-reload), (3) hit the route from the browser via DevTools Network tab to confirm it 200s as JSON, not as HTML.

## Web UX norms (long-term)

- **首页布局禁动 / Home page layout is frozen.** `ProjectListPage` (CenterState welcome + template strip + footer) has a stable visual contract that long-time users recognize. **Never** add a new section to the home page, restructure CenterState, or reorder/redesign the template strip for a new feature. New browse / detail experiences live on a second-level route (e.g. `/library`, `/projects`); cross-cutting features (analytics, sharing, comments, …) must follow the same pattern. **What is allowed**: swapping or adding CTAs in the existing CenterState button row. The 2026-06 polish swapped "Open existing project" → "Browse case library", then split the secondary CTA into two separate buttons (`/library` for cases, `/projects` for user work). All three buttons sit at the same visual weight (one primary, two secondaries) — that's the contract: button row remains a single horizontal flex group, all buttons size-matched, only one primary at a time. **What stays forbidden**: pushing additional sections (banners, strips, cards) above or between the welcome / button-row / template-strip / footer blocks; making the button row visually heterogeneous (different heights, different shapes); demoting the [Create blank project] primary or promoting a secondary.

## Where things live

```
pingarden/
├── apps/
│   ├── web/                              React SPA, Vite dev on :5173
│   ├── server/                           Fastify API + (future) y-websocket on :4000
│   ├── desktop/                          Electron shell (DMG packaging entry)
│   └── cli/                              `pingarden` CLI for AI agents — see apps/cli/README.md
├── packages/
│   ├── shared/                           TypeScript domain types (browser + node safe; `./yjs` sub-export = pure encoder)
│   ├── case-library/                     read-only curated case studies shipped with the app (one slug = one company / industry / pattern / comparison)
│   └── canvases/
│       ├── business-model-canvas/        real Strategyzer SVG, 9 rect zones
│       ├── business-model-environment/   4 external forces (key trends, market, industry, macro) around BMC ref
│       ├── value-proposition-canvas/     placeholder, 3 polygon + 3 circle-segment zones
│       ├── portfolio-map/                placeholder, 2 rect zones, axis-grid plugin
│       ├── empathy-map/                  XPLANE layout, 7 zones (persona + 4 triangles + pain/gain)
│       ├── ad-lib-value-proposition/     8 sentence-template zones, portrait
│       └── jobs-to-be-done/              5 sequential blocks, portrait (situation→motivation→outcome→emotional→social)
├── start.sh, stop.sh                     local boot scripts
├── .dev/                                 logs + PID files + server.port (gitignored)
├── apps/server/data/                     persisted canvas state (gitignored)
└── pnpm-workspace.yaml
```

## Status (2026-06-10)

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
- ✓ `pingarden` CLI (`apps/cli/`) + official Claude skill — AI-write seam at the shell level. Auto-snapshot before bulk write, local zoneId validation, server discovery via port file, dual distribution (Mac app DMG + npm). Skill auto-generated from canvas bundles; **all 11 canvases** have curated `skill.{en,zh}.md` (TL;DR / fill order / cross-block invariants / anti-patterns / tone) and `relatedNotes` for bilingual "Pairs with" reasons. Project-local skill committed at `<repo>/.claude/skills/pingarden/`.
- ✓ **Case library** (`packages/case-library/`, federation at `apps/server/src/storage/{Bundle,Federated}Storage.ts`) — read-only curated company / industry / pattern / comparison analyses ship baked into the app. Federation routes reads through bundle → user, writes always to user; library write attempts return 403. New `/library` second-level page (home page layout untouched per Web UX norm). CLI commands: `pingarden case {list,get,describe,read,canvases,stickies,fork,author,validate}`. Cases ship as bilingual read-only bundles with canvases and long-form stories.
- ☐ Real-time multi-cursor + presence (single tab only today)
- ☐ Autosave snapshots, Docker Compose, polish

## Pre-commit gates

Whenever you finish a chunk of work:
- `pnpm typecheck` (all 3 workspaces must be green)
- `pnpm --filter @pingarden/web build` (Vite must build)
- **Skill audit (when applicable):** if this change introduced or modified a user/AI-visible content type — a new canvas, business-model pattern, case kind, or workflow concept — rebuild the CLI and run `pingarden skill install --local`; the resulting `.claude/skills/pingarden/` diff must include the new content. See architectural seam #9 for the full audit checklist.

**Watch out for `@pingarden/shared` dist drift.** `packages/shared/package.json` resolves the `exports` field to `./dist/*.js` at runtime (types come from `src/`). The CLI's `case author` / `case relayout` / the server's runtime import the compiled dist, NOT the source — so a `pnpm typecheck` green only proves the types align. If you change `packages/shared/src/yjs.ts` (the Yjs encoder shared by CLI + server) and forget to rebuild, the CLI keeps using the old algorithm and your "fix" silently no-ops. After any edit to `packages/shared/src/`, run:

```bash
pnpm --filter @pingarden/shared run build
pnpm --filter @pingarden/cli run build   # picks up new shared
./start.sh                               # restart server with new shared
```

Without this dance, every downstream verification will hit stale binaries even though typecheck claimed green.

The plan file for the current/most-recent work iteration is at `~/.claude-internal/plans/generic-strolling-tarjan.md`.
