# Resource chapter quality — quick reference

Resources are the **source-material layer** of the Strategy Library. They are recommended books, reports, articles, papers, and web sources that explain where the cases, canvases, patterns, experiments, and frameworks come from.

## Current source-verified resource baseline

The skill pack ships chapter-aware reading support for these 12 resources:

- `business-model-generation`
- `value-proposition-design`
- `the-invincible-company`
- `christensen-innovators-dilemma`
- `testing-business-ideas`
- `scenario-planning-in-organizations`
- `blue-ocean-strategy`
- `blue-ocean-shift`
- `porter-competitive-strategy`
- `porter-competitive-advantage`
- `the-art-of-the-long-view`
- `platform-revolution`

Each book resource should have:

- `chapters/index.json` — chapter truth source
- `chapters/<slug>.en.md` and `chapters/<slug>.zh.md` — bilingual chapter prose
- `checklists/<slug>.json` — coverage checklist
- `audit-report.md` — item-level EN/ZH coverage report

## Definition of done

A resource chapter is done only when:

1. Its checklist covers concepts, arguments, cases, logic chains, terminology, nuance, and cross-references.
2. EN and ZH chapter markdown cover the same checklist.
3. `audit-report.md` marks every item PASS for both EN and ZH.
4. Orphan, thickness, bilingual, audit, and cross-reference checks are clean.

## Anti-patterns

- Copying `chapters/index.json` summaries into chapter prose.
- Padding word count without adding concepts, evidence, cases, or logic chains.
- Using related slugs that do not resolve in `manifest.json` or `packages/canvases/`.
- Letting EN and ZH cover different ideas.
- Treating `audit-report.md` as decorative rather than a hard gate.

## UI implications

Resources with chapters appear as book-like entries with chapter counts. The detail modal can show a Chapters tab with chapter navigation and long-form markdown. When advising users, use chapter summaries to route them to the right chapter before loading full chapter prose.
