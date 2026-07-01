# Business-model patterns — quick reference

A **pattern** (e.g. `long-tail`, `unbundling-business-models`) is an abstract reusable model — *not* a project. Patterns ship at `packages/case-library/patterns/<slug>/` alongside the writable cases. They have no BMC, no canvases, no Yjs binary, no fork affordance.

## Storage layout

```
packages/case-library/patterns/<slug>/
├── pattern.json         { slug, name, summary, sources, references?, examples }
├── description.en.md    long-form user-facing narrative (web UI shows this)
├── description.zh.md
├── skill.en.md          AI-facing concise guide (this skill renders this)
└── skill.zh.md
```

`pattern.json` is BusinessModelPattern from `@pingarden/shared`. `examples[]` is curated reverse-links to concrete cases — every example slug must resolve to a manifested case. `pingarden case validate` enforces this at build time.

## Manifest entry

Patterns are listed in `packages/case-library/manifest.json` under a `patterns` array (sibling of `cases`). The on-disk manifest version bumped to 2 when patterns were introduced.

## CLI commands

```bash
pingarden pattern list --json
pingarden pattern get long-tail --json
```

`pattern get` returns `BusinessModelPatternDetail`: the pattern metadata + bilingual long-form `description` + a hydrated `exampleCases: CaseLibraryEntry[]` (so a single round trip gets you everything you need to recommend examples).

## Cross-link rules

- **Case → pattern (forward):** `CaseLibraryEntry.appliesPatterns: string[]`. Many-to-many; a case can apply multiple patterns. Slug-level reference; the case carries no extra metadata about *how* it applies.
- **Pattern → case (reverse):** `BusinessModelPattern.examples: CaseExampleRef[]` (`{slug, role?}`). Curated by the pattern author. Validation enforces every `examples[].slug` resolves to a manifested case AND every `appliesPatterns[]` slug resolves to a manifested pattern — the 0.2.x → 0.3.0 `unbundling` → `unbundling-business-models` rename was prompted by exactly this kind of dangling reference, and the validator now refuses to ship a build with one.
- **Sub-type refinement (optional):** `CaseLibraryEntry.appliesPatternSubtypes?: Record<patternSlug, subtypeId>`. Used when the parent pattern declares `subtypes[]` (currently `free` is the only such pattern, with three sub-types: `ad-supported`, `freemium`, `bait-and-hook`). Every key must appear in `appliesPatterns[]` and every value must match a `subtypes[].id` on the referenced pattern. Validator enforces both. Cases that don't refine simply omit the field.

## Authoring a new pattern

There is no `pattern author` CLI. The contents are pure markdown + JSON; hand-write the four files, then add the slug to `manifest.json.patterns[]` and run `pingarden case validate`.

## References (annotated bibliography)

`BusinessModelPattern` carries an optional `references: PatternReference[]` field — the canonical citation surface, supersedes the legacy flat `sources[]` when present. Each entry:

```ts
{
  type: 'book' | 'article' | 'paper' | 'web';   // group + icon
  cite: string;                                   // e.g. "Anderson 2006"
  label: string;                                  // "Author · Title · Venue"
  year?: number;                                  // 2006
  pages?: string;                                 // "pp. 66–71" / "Ch. 3"
  url?: string;                                   // permalink / DOI
  note?: { en: string; zh: string };              // ~30 words on what this contributes
}
```

The `cite` handle is the **single source of truth** for inline mentions inside `description.{en,zh}.md`. When the description prose mentions a citation, use the same handle (e.g. *"Hagel and Singer (Hagel & Singer 1999) argued…"*) so a careful reader can connect the prose to the bibliography. Don't invent new abbreviations per paragraph.

The `note` field turns a flat list into something an agent can actually reason about: it should explain *what this source contributes that the others don't* — "originating paper", "book-length expansion", "BMC pattern catalog adaptation", etc. Both languages are required when present.

Skill generator emits a grouped `## References` block (Books → Papers → Articles → Web) with the cite handle bolded as the entry headline. Patterns that haven't been migrated still emit the legacy flat list under the same `## References` heading — the migration is opt-in per pattern.

## What patterns are NOT

- ❌ Patterns are not a kind of case. `CaseKind` is now `'company' | 'industry' | 'comparison'` only — `kind: 'pattern'` was removed in 0.3.0.
- ❌ Patterns have no fork. Users do not fork a pattern; they read its description and walk the example cases.
- ❌ Patterns do not appear on `/projects` (the user's own work). They live exclusively under the case library — `/library` web page, "Patterns" tab.
