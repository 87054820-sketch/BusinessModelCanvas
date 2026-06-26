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

**Example**: `airbnb` — Airbnb's BMC and related canvases with a
bilingual story tying the analysis together.

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

`pingarden case validate` fails if a case has canvases in only one
language. Every shipped case must include both `en` and `zh` canvases
so the bilingual browsing experience stays complete.

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
Use any shipped bilingual case as a working example of the on-disk
format.

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
    { "slug": "airbnb", "featured": true },
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
pingarden case relayout airbnb
```

## Adding a new business-model pattern

A **pattern** (Long Tail, Unbundling, Multi-Sided Platforms, Free, Open
Business Model …) is a separate first-class entity in the library, not
a kind of case. Patterns have no BMC, no canvases, no Yjs binary, no
fork affordance — they are curated explanation + a list of example
cases. They live at `packages/case-library/patterns/<slug>/` and are
listed in `manifest.json.patterns`.

### File layout

```
packages/case-library/patterns/<slug>/
├── pattern.json         BusinessModelPattern (slug, name, summary,
│                        sources, references?, examples)
├── description.en.md    long-form user-facing narrative (web modal
├── description.zh.md       renders this with prose typography)
├── skill.en.md          AI-facing concise guide (skill page renders
└── skill.zh.md             this; falls back to first 3 paras of
                            description if missing)
```

Skipping any of the five files breaks the build's `pingarden case
validate` gate. The pattern's `examples[]` slugs must resolve to
manifested cases; cases' `appliesPatterns[]` slugs must resolve to
manifested patterns. Both directions are validated.

### `pattern.json` template

```jsonc
{
  "slug": "<kebab-case>",
  "name":    { "en": "<Display Name>", "zh": "<中文名称>" },
  "summary": {
    "en": "(~60 words: what the pattern is, what makes it distinct.)",
    "zh": "(~60 字。)"
  },
  // Legacy flat list. Kept for backward compat — when `references`
  // is also present, both UI and skill prefer `references` and ignore
  // `sources`. New patterns can leave `sources` as a duplicate of
  // references' label fields, or pare it down — both choices work.
  "sources": [
    { "label": "Author · Title · Venue · Year", "url": "https://..." }
  ],
  // Annotated bibliography. PREFERRED for new patterns. See
  // PatternReference in packages/shared/src/index.ts.
  "references": [
    {
      "type": "paper",  // 'book' | 'article' | 'paper' | 'web'
      "cite": "Hagel & Singer 1999",  // author-year handle. Used
                                      // verbatim in description.md prose
                                      // and the rendered bibliography.
      "label": "John Hagel III & Marc Singer · 'Unbundling the Corporation' · Harvard Business Review",
      "year": 1999,
      "pages": "Mar–Apr 1999 issue",
      "url": "https://hbr.org/...",
      "note": {
        "en": "(~30 words: WHAT THIS source contributes that others don't.)",
        "zh": "(~30 字。)"
      }
    }
    // ...usually 2–4 entries: originating paper / book → adapter /
    // translator → BMG canonicalisation. Order does not matter — the
    // skill renderer groups by `type` then by year.
  ],
  // Curated reverse links to concrete cases that exemplify the pattern.
  // `role: "primary"` flags the most paradigmatic exemplars; "secondary"
  // is reserved for cases tagged with the pattern but where it's one
  // of several patterns the case applies.
  "examples": [
    { "slug": "<case-slug>", "role": "primary"   },
    { "slug": "<case-slug>", "role": "secondary" }
  ]
}
```

### `description.{en,zh}.md` 5-section template

All patterns shipped to date follow this skeleton. Stick to it — it's
what makes the modal's prose readable across patterns and what makes
the skill's `firstParagraphs` fallback land on coherent content.

```markdown
# <Pattern Name>

> *<pull-quote from canonical source — typically BMG p. NN>*
> — Author, *Title*, p. NN  *(CiteHandle)*

## Why this pattern matters

(~250 words.) Origin: who proposed it, when, what problem they were
solving. Use cite handles in prose ("Hagel and Singer (Hagel & Singer
1999) argued…"). Connect the originating paper / book to BMG's
adaptation (BMG 2010). Make sure the reader understands *why this is
its own thing* and not a special case of an adjacent pattern.

## What a <pattern> BMC looks like

(~200 words.) Block-by-block: which BMC blocks the pattern most
affects, what they typically contain, what the relationships
between them tend to be. Pick **5–6 of the 9 blocks** — not all 9
— and don't fill in trivia. The reader should walk away knowing
which blocks are the *signal* of this pattern.

## Concrete examples

4–8 examples, including at least 2 that are shipped library cases.
Each entry: `**Name**` + 1–2 sentences saying what makes it an
exemplar of the pattern. Mix *(cite handles)* into the prose where
useful (e.g. "Anderson 2004's headline example"). It's fine to list
examples that aren't in the library yet — name-checking them helps
the AI agent recognise them later.

## What goes wrong

3–5 failure modes, framed as **bold lead-in then explanation**.
Borrow anti-patterns from the originating sources where they exist
(BMG 2010, Eisenmann 2006, etc.); cite them with handles. The reader
should leave knowing how to *not* misapply the pattern.

## Read the examples

Direct slug pointers to library cases, ordered by which one to read
first. For each: 1–2 sentences on what specifically that case
demonstrates. Group by `role: primary` first, then `role: secondary`.
```

### `skill.{en,zh}.md` template

The skill page is **AI-facing, condensed**. Expected length ~200
words. The skill generator falls back to `firstParagraphs(description,
3)` when this file is missing for a language, so writing it is
strictly an improvement.

```markdown
# <Pattern Name> — AI skill page

## TL;DR

(One short paragraph: pattern in a sentence + cite handle for the
canonical source.)

## When this pattern applies (signals)

- (Bulleted list of 3–4 signals — the cues that suggest the pattern
  fits a given business idea.)

## How to spot it from a BMC

- **Block name**: what to expect there.
- (One bullet per signature block, 3–5 bullets.)

## Anti-patterns

- ❌ (Common misapplication.)
- ❌ (Another.)

## Cross-references

- (Other patterns this often co-exists with or contrasts to.)
- (Library cases that exemplify the cross-references.)

## How to act on it

When the user asks about a [pattern] company:

1. (CLI commands.)
2. (Reasoning steps.)
3. (Pattern-fit check before drafting.)
```

### Pattern audit checklist — REQUIRED on every new pattern

When adding pattern X, walk **every existing case** in `cases/` and
decide: does this case ALSO apply pattern X? If yes, append the slug
to the case's `appliesPatterns[]`. Skipping this audit silently
weakens the cross-link graph — the new pattern becomes an orphan
relative to cases that should exemplify it.

Concrete steps:

1. List all cases: `ls packages/case-library/cases/`
2. For each case, read `case.json` and decide whether the new pattern
   applies. Use the new pattern's "signals" (from skill.md) as the
   decision criteria. **Bias toward fewer tags** — only tag a case
   when the pattern is clearly a primary or secondary description of
   the business, not a faint adjacency.
3. For matching cases, edit `appliesPatterns[]` (extend if non-empty,
   add if absent). The case's `tags[]` is unchanged — it lives in a
   different namespace.
4. Verify: `pingarden case validate` enforces both directions resolve.
   Read the new pattern's `examples[]` and grep all `case.json` for
   the new pattern slug — the two should agree.

A worked example of this audit lives in the 2026-06-15 round 3 plan
(`generic-strolling-tarjan.md`): when we added `multi-sided-platforms`,
the audit tagged 4 existing cases (udemy, aliexpress, lulu-com,
lego-long-tail) and explicitly rejected several adjacent cases
(swiss-private-banking, mobile-telco-unbundling, patagonia, carvana,
cainiao) — the rejections matter as much as the tags.

### When the pattern has structural sub-types

Some patterns are textbook-grouped under one chapter but have
meaningfully different BMC shapes per flavor — the canonical example
is **Free** (BMG Pattern No. 4) which has three sub-types:
ad-supported (Google search side), freemium (Spotify, Dropbox), and
bait-and-hook (Gillette razors+blades, HP printers+ink). Treating
them as one opaque tag throws information away; treating them as
three separate patterns over-fragments. The compromise: ONE pattern
with explicit sub-typing.

`pattern.json` adds an optional `subtypes[]` array. Each entry:

```json
{
  "id": "freemium",
  "name":    { "en": "Freemium", "zh": "Freemium 增值订阅" },
  "summary": { "en": "Free tier + paid premium tier; ~5–10% of users convert. Cross-subsidy is across users on the same platform.", "zh": "..." },
  "examples": [
    { "slug": "spotify", "role": "primary" },
    { "slug": "udemy",   "role": "secondary" }
  ]
}
```

- `id` — kebab-case stable within the pattern (e.g. `ad-supported`,
  `freemium`, `bait-and-hook`)
- `name`, `summary` — bilingual; both languages required
- `examples` — curated cases for THIS sub-type; subset of the
  parent `pattern.examples[]` (which remains the union, useful as
  a default flat list)

Cases tag the sub-type via the parallel field `appliesPatternSubtypes`
on `case.json`:

```jsonc
{
  "appliesPatterns": ["multi-sided-platforms", "free"],
  "appliesPatternSubtypes": { "free": "ad-supported" }
}
```

The map key must appear in `appliesPatterns[]` (validator enforces)
and the value must match a `subtypes[].id` on the referenced pattern
(validator enforces). Cases that don't refine simply omit the field —
fully optional and fully backward-compatible with patterns that don't
sub-type.

The pattern's `description.{en,zh}.md` should have an explicit
`## Three sub-types` (or however many) section with `### <Sub-type>`
headers matching the `subtypes[].name` — the typography plugin renders
these as visible sub-headings in the modal. Audit existing cases per
sub-type, not just per pattern, to maintain cross-link granularity.

The 2026-06-15 round 4 rollout is the worked example: Free pattern
shipped with 3 sub-types, 4 example cases (`google-multi-sided` =
ad-supported, `spotify` = freemium, `udemy` = freemium secondary,
`gillette` = bait-and-hook).

### Manifest entry

```json
{
  "version": 2,
  "cases":   [ ... ],
  "patterns": [
    { "slug": "<new-pattern-slug>", "featured": true }
  ]
}
```

The order in the array is the order the patterns appear in the
LibraryPage Patterns tab (curate carefully).

### Skill regen

After authoring the pattern AND tagging cases AND updating the
manifest, regenerate the skill so the pattern surfaces inside the AI's
mental model:

```bash
pnpm --filter @pingarden/cli run build      # picks up new content
node apps/cli/dist/index.js skill install --local
git diff .claude/skills/pingarden/          # expect:
                                            # - patterns/<slug>.{en,zh}.md
                                            # - SKILL.md version + index
                                            # - workflows/patterns.md
                                            # - reference/patterns.md
```

If `git diff` doesn't show the new `patterns/<slug>.<lang>.md` files,
the manifest entry is wrong or the `pattern.json` failed to parse —
check `pingarden pattern list --json` first.

