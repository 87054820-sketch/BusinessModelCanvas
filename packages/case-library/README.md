# PinGarden case library

This directory holds the **read-only case library** that ships with every
PinGarden release. Each entry is a curated business analysis (one
company, one industry, one pattern, or one comparison) that users can
browse but not edit. They can fork an entry into their own editable
project at any time.

> **The case library is content, not user data.** Files here are
> bundled into the Mac DMG, mounted in-place by the Fastify server's
> `BundleStorage`, and served via `GET /library/cases`. They never get
> copied into a user's `userData/data/` directory. See
> `apps/server/src/storage/BundleStorage.ts` for the runtime contract.

## Layout

```
packages/case-library/
├── README.md              ← this file
├── manifest.json          ← top-level catalog (ordering, version, listed slugs)
└── cases/
    └── <slug>/            ← one directory per case, slug = stable identity
        ├── case.json      ← case-library-only metadata (CaseLibraryEntry shape)
        ├── projects/
        │   └── <uuid>.json
        ├── canvases/
        │   └── <uuid>/
        │       ├── meta.json     ← CanvasMeta (with optional `variant` field)
        │       └── live.ydoc     ← Yjs binary state (built by `pingarden case author`)
        └── stories/
            └── <uuid>/
                ├── meta.json     ← StoryMeta
                └── content.md    ← markdown body, may embed canvases via
                                  ←   ::canvas[<defId>]{canvasId="<uuid>"}
```

## Case kinds — pick exactly one

The `kind` field on `case.json` is the single most important
classification. It changes how the UI renders the case and how the AI
reasons about it. Four kinds:

### `"company"` — single-company analysis (default)

One company, one or more canvases of different defIds. Sticky
`createdBy` may carry citation labels when stickies come from multiple
sources (e.g. "HBR 2023" / "annual report 2024") — that's how multi-
source agreement / disagreement surfaces inside a single canvas.

**Example**: `wechat-private-domain` — WeChat's BMC + VPC + JTBD with
stickies attributed to Tencent's annual report and an HBR case.

### `"industry"` — industry archetype + variants

One canvas of the dominant industry model (`role: "archetype"`) plus N
canvases of the same defId, each representing a real company's deviation
from the archetype (`role: "variant"`). All variants share the case.

**Example**: `swiss-private-banking` — three BMCs:
1. Industry archetype (the "typical" Swiss private bank)
2. Maerki Baumann (unbundled — spun off transactions)
3. Pictet (integrated — kept all three businesses in-house)

Use `CanvasMeta.variant.{id, label, description, role}` to distinguish
them. Set `appliesPatterns: [...]` on `case.json` to backlink to the
abstract patterns this industry exemplifies.

### `"pattern"` — abstract reusable model

A pattern (Unbundling, Long Tail, Multi-Sided Platforms, Free, Open
Business Model). Pattern cases are short on canvases and long on
narrative — typically a single illustrative canvas plus a story tying
together multiple example cases via `examples: [...]`.

**Example**: `unbundling-business-models` (TBD) — points at
`swiss-private-banking` and `telecom-fixed-mobile` as concrete
illustrations.

### `"comparison"` — peers side by side

Multiple subjects analysed in parallel without a shared archetype.
Useful for "Tesla vs BYD" or "DTC fashion brand A vs B vs C". Each
canvas carries `variant` (no `archetype` role).

## Bilingual content is required

**Every case must ship with both English and Chinese content.** This is
a hard rule, not a nice-to-have — PinGarden serves a bilingual user
base and a single-language case is half-broken for the other half of
users.

**Case-level metadata is already enforced bilingual** by the
`LocalizedLabel` type in `packages/shared/src/index.ts`:
`companyName`, `summary`, every `variant.label` / `variant.description`,
and `colorLegend.<hex>.label` / `description` all require both `en`
and `zh`.

**Sticky text and story content are NOT yet enforced bilingual** at
the type level — `Sticky.text` is a single `string` and `Story.content`
is a single markdown file. The current convention is to ship **parallel
canvases per language**: for an industry case with N variants, the
case has 2N canvases (N in `language: "en"` + N in `language: "zh"`).
Stories follow the same — one EN story body and one ZH story body,
each with `::canvas[]{canvasId="..."}` directives pointing at its own
language's canvas IDs. See `packages/case-library/cases/swiss-private-banking/`
for the canonical layout — 6 canvases (archetype × 2 langs +
maerki × 2 langs + pictet × 2 langs) and 2 stories.

`pingarden case validate` will **warn** (not fail, yet) if a case has
canvases in only one language — the warning becomes an error once
existing single-language cases (`wechat-private-domain` is currently
zh-only) are translated and the warning has zero false positives.

A future schema upgrade will fold `Sticky.text` into a
`LocalizedString = { en: string; zh: string }` and the parallel-canvas
workaround goes away — sticky-by-sticky bilingual tracking, single
canvas per variant. Out of scope for the current release.

## Authoring a new case — minimum recipe

> **Don't hand-craft `live.ydoc` files.** They are Yjs binary state.
> Use `pingarden case author --from <input.json> --out
> packages/case-library/cases/<slug>/` to produce a complete case
> directory from a human-friendly JSON description (which, in turn, is
> what you'd hand to Claude when asking for a new case).

The author command is implemented in P6 of the case library plan.
Until then, the existing `wechat-private-domain` migration (P5) can
serve as a working example of the on-disk format.

### Slug rules

- kebab-case, ASCII letters / digits / hyphens only
- globally unique within `cases/` (build-time check fails the package
  build on collision)
- include disambiguating suffix when company names collide:
  `apple-inc` vs `apple-records`, `tesla-2024-china-pivot` vs `tesla`
- never rename a slug that has shipped — users may have forked it
  under that identity; renaming = data drift on their side

### case.json template

```json
{
  "slug": "<slug>",
  "version": 1,
  "kind": "company",
  "companyName": { "en": "<full name>", "zh": "<中文名>" },
  "summary": {
    "en": "One paragraph (~60 words) describing the case.",
    "zh": "一段话(~60 字)描述案例。"
  },
  "tags": ["industry", "region", "era"],
  "sources": [
    { "label": "Source 1", "url": "https://..." }
  ],
  "thumbnailDefId": "business-model-canvas",
  "projectId": "<uuid of projects/*.json>"
}
```

For `industry` add `appliesPatterns: ["unbundling"]`.
For `pattern` add `patternName` and `examples`.

## Adding the case to `manifest.json`

Every case directory under `cases/` MUST be listed in
`manifest.json`'s `cases` array — that's how the build script enforces
"directories without metadata" can't accidentally ship. The order in
the array is the order in which cases appear in the LibraryPage grid
(curate carefully).

```json
{
  "version": 1,
  "cases": [
    { "slug": "wechat-private-domain", "featured": true },
    { "slug": "swiss-private-banking", "featured": false }
  ]
}
```

## What you must NEVER do

- Don't put real customer data here. Cases are public; everything in
  this directory ships in every DMG.
- Don't edit a `live.ydoc` file by hand. Regenerate from `case.json` +
  sticky descriptions via `pingarden case author`.
- Don't symlink across slugs. Cases are independent; cross-references
  go through the typed fields (`appliesPatterns`, `examples`).
- Don't translate `zoneId`s. They are stable English identifiers
  consumed by the canvas def — translating them breaks rendering.
- Don't bypass `manifest.json`. A case directory that isn't listed is
  treated as orphaned by the build script.

## Sticky layout convention — let the auto-stacker place them

When authoring stickies in your spec JSON, **omit `x` and `y`**. The
encoder (`packages/shared/src/yjs.ts → resolvePosition`) auto-stacks
stickies vertically inside their zone, top-down, wrapping to a
second column when the first one fills up. That gives you a clean,
Strategyzer-book-style layout without anyone hand-tuning coordinates.

Specifically:

- First sticky's top edge sits 70 px below the zone's inner top —
  enough headroom to clear the zone label + prompt baked into the
  background SVG.
- Stickies are spaced `DEFAULT_STICKY_HEIGHT + 8 px` (= 70 px) on
  centre vertically, leaving an 8 px visual gap between adjacent
  stickies.
- When `idx ≥ floor(usableHeight / spacing)`, the layout wraps to
  a new column to the right (`DEFAULT_STICKY_WIDTH + 8 px`
  apart). BMC's wide bottom zones (`cost-structure`,
  `revenue-streams`) routinely hit this; tall narrow ones rarely
  do.
- Stickies' `x / y` are **centres** in canvas coordinates, not
  top-left corners. (See `apps/web/src/canvas/Sticky.tsx` —
  `translate(x - W/2, y - H/2)`.)

Override only when you genuinely need it. Pass explicit `x` and `y`
in the spec when:

- Two stickies must be side-by-side at a specific point inside the
  zone (e.g. annotating a concrete chart-canvas pin).
- You're authoring a chart canvas where sticky position carries
  semantics (rare — usually pins do this, not stickies).

If you change the auto-layout algorithm, re-run
`pingarden case relayout <slug>` on every shipped case to refresh
their `live.ydoc` binaries so they match the new placement. The
command reads each existing canvas, drops sticky x/y, and re-encodes
through the same `encodeObjectsBulk` the author command uses — so
existing cases stay byte-stable with the current algorithm without
needing the original spec.

> ⚠️ **Rebuild `@pingarden/shared` first.** The encoder lives in
> `packages/shared/src/yjs.ts` but the CLI imports the compiled
> `packages/shared/dist/yjs.js` at runtime. If you skip the rebuild,
> `case relayout` runs the OLD algorithm and your edits silently
> no-op. Always:
> ```bash
> pnpm --filter @pingarden/shared run build
> pnpm --filter @pingarden/cli run build
> ```
> before invoking `case relayout`. (See CLAUDE.md → "Pre-commit gates"
> for the full dance, including server restart.)

```bash
# Preview without writing
pingarden case relayout swiss-private-banking --dry-run

# Apply in-place
pingarden case relayout swiss-private-banking
pingarden case relayout wechat-private-domain
```

