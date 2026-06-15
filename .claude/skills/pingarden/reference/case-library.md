# Case library — quick reference

The case library is a **read-only** federated corpus that ships with the app. Each `Project` has a `source` field: `'user'` (default, writable) or `'library'` (read-only). Library writes return HTTP 403 with `code: "CASE_LIBRARY_READ_ONLY"`.

## Case kinds

The `kind` field in `case.json` is one of:

- **`company`** — a single real company analysed across multiple canvases (BMC + VPC + …). The default and most common kind. Example: `wechat-private-domain`.
- **`industry`** — an industry archetype + N concrete-company variants on the same canvas type. Use the `variant` field on each `CanvasMeta` (`{ id, label, role: 'archetype' | 'variant' }`) to label each one. Example use case: Strategyzer's "Unbundling" — one archetype BMC + Maerki Baumann (unbundled) + Pictet (integrated).
- **`comparison`** — multiple subjects placed side-by-side (Tesla vs BYD on the same BMC type).

The `kind` chip colour in the web LibraryPage is keyed off this field — `company` = emerald, `industry` = amber, `comparison` = sky.

> Business-model **patterns** (Unbundling, Long Tail, Multi-Sided Platforms, …) are NOT a case kind. They are a separate first-class entity at `packages/case-library/patterns/<slug>/` with their own HTTP routes (`/library/patterns`, `/library/patterns/:slug`). See `reference/patterns.md`.

## Slug rules

- Kebab-case (lowercase letters, digits, dashes). Validated by `pingarden case author` and `case validate`.
- Globally unique within the library — `pingarden case validate` fails packaging if two cases share a slug.
- Same-named companies disambiguated by suffix: `apple-inc` / `apple-records`.
- Same-company multi-source analyses: ONE slug, sticky `createdBy` field carries source labels ("HBR 2023" / "Tencent 财报"). One canvas per analytic frame, never one canvas per source.

## Read-only enforcement layers

Three independent layers refuse library writes — they're redundant on purpose:

1. **`BundleStorage`** throws `BundleReadOnlyError` from every write method.
2. **`FederatedStorage`** checks bundle ownership before delegating to user storage.
3. **`server.ts` `setErrorHandler`** maps `BundleReadOnlyError` → HTTP 403 `{ code: "CASE_LIBRARY_READ_ONLY", … }`.

This means even if a future route forgets to consider the library, the storage layer still blocks the write. Don't try to "fix" library data via a sneakier write path — there isn't one.

## Authoring (offline)

`pingarden case author --from <spec.json> --out packages/case-library/cases/<slug>/` produces the full directory layout. The Yjs encoder used is the same `encodeObjectsBulk` from `@pingarden/shared/yjs` that the server uses for `POST /objects/bulk`, so authored cases round-trip through the runtime byte-identically.

`pingarden case validate` runs as a packaging gate (`scripts/package-mac.sh`); a broken case fails the DMG build before electron-builder kicks in.
