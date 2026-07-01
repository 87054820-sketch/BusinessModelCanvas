# Authoring a new business-model pattern

When the user says "let's add a new pattern" or "create a Multi-Sided Platforms pattern", follow this workflow. Patterns are SEPARATE first-class entities from cases — never the same path.

## Pre-conditions

- The user has named a specific pattern from a real source (BMG, Hagel, Strategyzer-newer-book, an HBR article, etc.). Don't invent patterns from a hunch.
- You can identify ≥ 1 case in the library that exemplifies the pattern. If no library case fits, you'll need to author a fresh exemplar case before or alongside the pattern (parallel to how Long Tail shipped with `lulu-com` + `lego-long-tail`, MSP shipped with `google-multi-sided` + `visa` + `nintendo-wii`).

## Steps

### 1. File layout

Create exactly five files at `packages/case-library/patterns/<slug>/`:

```
pattern.json         BusinessModelPattern (slug, name, summary, sources, references?, examples)
description.en.md    long-form user-facing prose, 5-section template (~600-800 words)
description.zh.md
skill.en.md          AI-facing condensed page, 5-section template (~200 words)
skill.zh.md
```

All five are required. Skipping any breaks `pingarden case validate`.

### 2. `pattern.json` shape

Use `PatternReference` (annotated bibliography), not `CaseSource`. Each reference must carry: `type` (book/article/paper/web), `cite` (author-year handle), `label`, `year`, optional `pages`/`url`, and a bilingual `note` saying *what THIS source contributes*. The `cite` handle is the ONLY citation form you should use in description.md prose — keep it stable across edits.

`examples` is curated reverse links to library cases. Every slug must resolve to a manifested case. Forward links from cases to patterns live on `case.json.appliesPatterns` — see step 4 below.

### 2a. When the pattern has structural sub-types

Some patterns are textbook-grouped under one chapter but have meaningfully different BMC shapes per flavor — the canonical example is **Free** (BMG Pattern No. 4) which has three sub-types: ad-supported (Google search side), freemium (Spotify, Dropbox), and bait-and-hook (Gillette, HP printers). Treating these as one opaque tag throws information away; treating them as three patterns over-fragments. The compromise: ONE pattern with explicit sub-typing.

`pattern.json` adds an optional `subtypes[]` array. Each entry carries:

- `id` — stable kebab-case within the pattern (e.g. `ad-supported`, `freemium`, `bait-and-hook`)
- `name` — bilingual short label
- `summary` — bilingual ~40-word blurb
- `examples` — curated cases for THIS sub-type (subset of the parent `examples[]`)

Cases tag the sub-type via the parallel field `appliesPatternSubtypes`:

```json
"appliesPatterns": ["free"],
"appliesPatternSubtypes": { "free": "freemium" }
```

The map key must appear in `appliesPatterns[]` (validator enforces) and the value must match a `subtypes[].id` on the referenced pattern (validator enforces). Cases that don't refine just omit `appliesPatternSubtypes` — fully optional, fully backward-compatible with patterns that don't sub-type.

The `description.{en,zh}.md` should have an explicit `## Three sub-types` (or N) section with `### <Sub-type name>` headers matching the `subtypes[].name` — the typography plugin renders these as visible sub-headings in the modal. Audit existing cases per sub-type, not just per pattern, to maintain cross-link granularity.

### 3. `description.{en,zh}.md` — 5-section structure

Every shipped pattern follows this skeleton. Don't deviate.

1. `# <Pattern Name>` + `> *<pull-quote>*` from canonical source with cite handle
2. `## Why this pattern matters` — origin (~250 words). Use cite handles in prose.
3. `## What a <pattern> BMC looks like` — block-by-block, **5–6 of the 9 BMC blocks**. Pick the signal blocks; skip the trivia ones.
4. `## Concrete examples` — 4–8 examples; at least 2 are library cases.
5. `## What goes wrong` — 3–5 failure modes, **bold lead-in then explanation**.
6. `## Read the examples` — direct slug pointers grouped by `role: primary` then `secondary`.

### 4. Pattern audit on existing cases — DO NOT SKIP

This is the step every prior pattern rollout almost forgot. After authoring the pattern files, walk EVERY existing case and decide whether it also applies the new pattern:

```bash
ls packages/case-library/cases/
# For each case: read case.json, ask "does this also apply <new pattern>?"
```

For each case that applies, edit `case.json` and append the new pattern's slug to `appliesPatterns[]`. Be biased toward fewer tags — only tag when the new pattern is clearly a primary or secondary description of the case, not a faint adjacency.

The 2026-06-15 MSP rollout is the worked example: 4 existing cases were tagged (`udemy`, `aliexpress`, `lulu-com`, `lego-long-tail`) and several adjacent cases were explicitly rejected (`swiss-private-banking`, `mobile-telco-unbundling`, `patagonia`, `carvana`, `cainiao`). The rejections matter as much as the tags.

### 5. Manifest entry

```bash
# Edit packages/case-library/manifest.json
# Add the new pattern slug to "patterns" array.
# (If the rollout includes a new exemplar case, add that to "cases" too.)
```

### 6. Validate + skill regen

```bash
node apps/cli/dist/index.js case validate     # cross-checks both directions
node apps/cli/dist/index.js pattern list      # verify pattern parses
node apps/cli/dist/index.js pattern get <slug>  # verify hydrated examples
pnpm typecheck
pnpm --filter @pingarden/web build
pnpm --filter @pingarden/cli run build
node apps/cli/dist/index.js skill install --local
git diff .claude/skills/pingarden/   # expect: patterns/<slug>.{en,zh}.md +
                                     # SKILL.md version + workflows/patterns.md +
                                     # reference/patterns.md
```

### 7. Smoke test

Restart `./start.sh` and open `/library` in the browser:
- Patterns tab shows N+1 patterns (the new one with its example count)
- Click the new pattern's card → modal opens with grouped References footer
- Click an example case in the modal → close + jump to Cases tab + open case modal
- Cases tab: cross-tagged cases show the new pattern's chip in their Applies-patterns strip
- Switch UI lang → all bilingual content translates correctly

## Anti-patterns

- ❌ Authoring `description.md` without `references` annotated. Without `PatternReference`, the modal renders a flat list and the skill can't tell originating papers from adapter books.
- ❌ Skipping the audit. The new pattern lives in isolation; existing cases that should exemplify it are never tagged. Cross-link graph silently weakens.
- ❌ Tagging too eagerly. If the pattern is only a *faint* description of a case, leave it untagged. Over-tagging dilutes the pattern's identity.
- ❌ Inventing a pattern that isn't in a real source. Patterns must come from BMG, Hagel & Singer, Eisenmann/Parker/Van Alstyne, Anderson, Rochet & Tirole, etc. Don't synthesise patterns from your own analysis — push back to the user and ask for the canonical source.
- ❌ Forgetting to rebuild the CLI before `skill install --local`. The CLI imports compiled `@pingarden/shared/dist` at runtime; new schema fields don't reach the skill output until the CLI is rebuilt.
