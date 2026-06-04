# `apps/web/src/collab/` — Yjs encoding source of truth

The modules in this folder define how every editable object on a canvas
is encoded inside the canvas's Yjs document. The web client (this app)
and the server (`apps/server/src/http/objectsImport.ts` plus
`apps/server/src/http/aiContext.ts`) both serialize objects through these
encoders. **If you change a field name or shape here, change it on the
server side too in the same commit.** The shared TypeScript types live
in `packages/shared/src/index.ts` and are the schema-level contract;
these modules are the operational contract (which Y.Map keys, what types
of values, what side-effects).

## Y.Doc layout

A canvas Yjs document is a flat collection of typed roots:

| Root | Y type | Encoder module | What it stores |
|------|--------|----------------|----------------|
| `stickies`    | `Y.Map<id, Y.Map>`   | [`stickies.ts`](./stickies.ts)     | Sticky notes — universal across every canvas type |
| `chartLines`  | `Y.Map<id, Y.Map>`   | [`chartLines.ts`](./chartLines.ts) | Value-curve / line-chart entries (e.g. one per company on the Strategy Canvas) |
| `pins`        | `Y.Map<id, Y.Map>`   | [`pins.ts`](./pins.ts)             | Positioned annotation markers (icon + label, optional anchor to a chart point) |
| `xAxisItems`  | `Y.Array<Y.Map>`     | [`xAxisItems.ts`](./xAxisItems.ts) | Ordered factors / stages — the X axis of a chart-canvas, user-editable per project |

All roots are created lazily via `doc.getMap(name)` / `doc.getArray(name)`,
so opening an existing canvas that pre-dates a root just gets an empty
collection — no migration needed.

## Conventions every encoder follows

1. **Export a stable key constant** (e.g. `export const CHART_LINES_KEY = 'chartLines'`).
   Server code imports the same constant via `packages/shared` types.
2. **Export a `getXRoot(doc)`** helper that returns the typed root.
3. **Export `addX`, `updateX`, `removeX`** mutation helpers that wrap
   their writes in `doc.transact(() => …)` so concurrent updates merge
   atomically.
4. **Export a `useX(doc)` hook** that subscribes via `observeDeep` and
   returns a snapshot array. Every render reads from the live Y.Doc; the
   hook never holds local state that can drift.
5. **Tolerate missing fields** when reading. Older docs from before a
   field existed should still decode cleanly with sensible defaults.
6. **Never throw on a malformed item** — return `null` and let the
   caller filter. A single bad item shouldn't break the whole canvas.

## Why types live in `packages/shared` instead of here

The server's bulk-import endpoint and AI-context endpoint share these
shapes. Putting the canonical interfaces in `packages/shared` keeps the
contract enforced by `tsc` on both sides; the encoders here are just
the operational implementation (which Y.* type, which keys, which
defaults).
