# Patterns — abstract reusable models, separate from cases

A **business-model pattern** (Long Tail, Unbundling, Multi-Sided Platforms, …) is *not* a case — it has no BMC, no project, no fork. It's a curated explanation plus a list of concrete cases that exemplify it. Patterns live at `packages/case-library/patterns/<slug>/`, are listed in `manifest.json.patterns`, and are served by `/library/patterns(/:slug)`.

This workflow handles three user requests:

## "Is this Long Tail / Unbundling / [pattern X]?" — pattern lookup from a company

User points at a company and asks what pattern it follows.

1. `pingarden case list --json` (or `--tag <foo>` to narrow). Find the slug if the company is in the library.
2. `pingarden case get <slug> --json` — read `appliesPatterns` on the case.
3. For each pattern slug found: `pingarden pattern get <pattern-slug> --json` — its `description.{en,zh}` markdown explains the pattern, and `exampleCases` lists peer companies in the same family.
4. If the company isn't in the library, walk `pingarden pattern list --json`, read each pattern's `patterns/<slug>.{en,zh}.md` skill page (TL;DR + signals + how-to-spot-from-a-BMC), and reason about which fits.

## "Give me other companies in the same pattern" — discovery from a pattern

1. `pingarden pattern list --json` to remind yourself of which patterns exist.
2. `pingarden pattern get <slug> --json` — `exampleCases` is a hydrated array of `CaseLibraryEntry`. Each carries enough metadata (name, summary, tags) to recommend without a second round trip.
3. To go deeper into one example: `pingarden case get <example-slug>` → `pingarden case canvases <example-slug>` → `pingarden canvas describe <id> --json` for any specific BMC.

## "Help me draft a BMC by applying [pattern X]" — pattern application

The pattern's `patterns/<slug>.{en,zh}.md` skill page lists signals, how-to-spot-from-a-BMC, and anti-patterns. Walk the user's idea against each:

1. `pingarden pattern get <slug>` and read the skill page.
2. Make sure the user's idea matches the *signals* (e.g. Long Tail wants thousands of niche items, near-zero marginal inventory cost, strong search/recommend). If signals don't match, push back rather than forcing the pattern.
3. Walk through the skill page's "How to spot it from a BMC" — those are the cells you should populate first when drafting their canvas.
4. Show them at least one shipped example (`pingarden case get <example-slug>`) so they can see the pattern in real form.

## Cross-references between cases and patterns

Forward link (case → pattern): `CaseLibraryEntry.appliesPatterns: string[]` — what pattern slugs the case exemplifies. Many-to-many: a case can apply more than one.

Reverse link (pattern → case): `BusinessModelPattern.examples: CaseExampleRef[]` — curated by the pattern author. The runtime hydrates these in `/library/patterns/:slug`'s `exampleCases` field.

## Citing a pattern's origin — use the cite handle

Each pattern's `pattern.json` carries an annotated `references` array (see `reference/patterns.md`). Every entry has a short author-year `cite` handle (e.g. `Anderson 2006`, `Hagel & Singer 1999`, `BMG 2010`). When you cite the pattern's origin in a chat reply, **use the cite handle** — it's the same handle used inside the pattern's `description.{en,zh}.md` prose AND its skill page's `## References` block, so the user can connect what you say to the bibliography in the web modal without guessing.

Example: instead of *"the unbundling pattern was originally proposed in a 1999 HBR article"*, write *"the unbundling pattern was originally proposed in (Hagel & Singer 1999), and adapted into the BMC catalog as Pattern No. 1 in (BMG 2010)"*. The handles are stable across rebuilds.

## Anti-patterns

- ❌ Treating a pattern as a case. Patterns have no canvases — `case get long-tail` will 404. Use `pattern get long-tail` instead.
- ❌ Forcing a pattern onto a BMC where the signals don't match. Patterns are descriptions of *coherent* business models; misapplied, they make the user's BMC less coherent, not more.
- ❌ Ignoring `appliesPatterns` when reading a case. The pattern is half the story — read both.
- ❌ Inventing your own citation abbreviations. If the pattern's `references` says `BMG 2010`, don't write `Osterwalder 2010` or `Strategyzer book` — keep the handle stable so the user can scan the bibliography.
