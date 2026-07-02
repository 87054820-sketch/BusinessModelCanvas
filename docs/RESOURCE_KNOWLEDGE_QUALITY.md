# Resource Knowledge Quality

This document defines the quality bar for PinGarden resource-library books. It is the resource-side companion to `docs/CANVAS_KNOWLEDGE_QUALITY.md`.

## Principle

PinGarden uses **Single Source, Multiple Surfaces**.

- Long explanations live in `description.{en,zh}.md` and `chapters/*.md`.
- `resource.learning` and `chapter.learning` are lightweight navigation metadata: short guide text, concepts, practice prompts, and references.
- Cards, modals, tabs, and future agent prompts should compose from the same source files instead of copying long prose into every surface.

## Scoring

Run:

```bash
pnpm audit:resource-quality -- --books --fail-under=90
```

The audit scores chaptered book resources on 100 points:

| Dimension | Weight | Checks |
| --- | ---: | --- |
| `surfaceReadiness` | 20 | Resource-level `learning` answers why to open it, who it fits, what to read first, what the reader can produce, and where to go next. |
| `descriptionDepth` | 15 | `description.en.md` and `description.zh.md` read like a guide, not a bibliography: core concepts, use/not-use, practice connection, canvases, cases, and next steps. |
| `chapterCoverage` | 25 | `chapters/index.json`, bilingual chapter Markdown, matching checklists, adequate thickness, and `audit-report.md` Overall PASS. |
| `chapterLearning` | 15 | Every chapter has bilingual headline, why-open, key concepts, outcomes or practice prompts, and useful references or related assets. |
| `practiceConnection` | 15 | The resource and chapters connect to canvases, cases, patterns, experiments, frameworks, and user exercises. |
| `sourceGovernance` | 10 | Bibliographic metadata, sources, extracts, checklists, and audit report are traceable. |

## A-Level Gates

A book cannot receive an A grade if any of these are missing:

- `resource.learning`
- `chapters/index.json` for a chaptered book
- bilingual chapter files for every indexed chapter
- matching `checklists/<chapter>.json`
- `audit-report.md` with an Overall PASS line
- chapter-level `learning` for every indexed chapter

## Templates

### `resource.learning`

Use this for the first tab in the resource modal and for cards/popovers:

```json
{
  "level": "beginner | intermediate | advanced",
  "headline": { "en": "...", "zh": "..." },
  "whyOpen": { "en": "...", "zh": "..." },
  "audience": { "en": "...", "zh": "..." },
  "keyConcepts": [{ "en": "...", "zh": "..." }],
  "commonMisreads": [{ "en": "...", "zh": "..." }],
  "firstSteps": [{ "en": "...", "zh": "..." }],
  "outcomes": [{ "en": "...", "zh": "..." }],
  "practicePrompts": [{ "en": "...", "zh": "..." }],
  "sourceRefs": [{ "type": "resourceChapter", "slug": "book-slug", "chapterSlug": "ch01" }],
  "relatedRefs": [{ "type": "canvas", "slug": "canvas-id" }],
  "nextRefs": [{ "type": "resource", "slug": "next-resource" }]
}
```

Minimum bar: headline, whyOpen, audience, at least four key concepts, two first steps, one outcome, one practice prompt, and source/related/next references.

### Description

`description.{en,zh}.md` should be a reading guide with these sections when possible:

- Why this source matters
- What concepts to learn before reading
- When to use it
- When not to use it
- How it connects to PinGarden canvases and cases
- Which chapters to read first
- What the reader should produce after reading

### `chapter.learning`

Chapter learning metadata is a compact chapter-level preface:

```json
{
  "level": "beginner | intermediate | advanced",
  "headline": { "en": "...", "zh": "..." },
  "whyOpen": { "en": "...", "zh": "..." },
  "keyConcepts": [{ "en": "...", "zh": "..." }],
  "outcomes": [{ "en": "...", "zh": "..." }],
  "practicePrompts": [{ "en": "...", "zh": "..." }],
  "relatedRefs": [{ "type": "canvas", "slug": "canvas-id" }]
}
```

Minimum bar: headline, whyOpen, three key concepts, one outcome or practice prompt, and at least one related asset or learning reference.

### Chapter Body

Chapter Markdown remains the source of learning depth. If a chapter fails coverage, thickness, or bilingual parity, use the `book-chapter-quality` skill and its checklist-writing-audit pipeline. Do not patch chapter body text only to satisfy a card or modal surface.

## Agent Workflow

1. Read this document before changing resource books.
2. Prefer adding lightweight `learning` metadata over duplicating prose.
3. If chapter body coverage fails, use the `book-chapter-quality` skill and keep the audit-all-PASS gate.
4. Run `pnpm audit:resource-quality -- --books --fail-under=90`.
5. Run `pnpm audit:learning` to validate references and bilingual learning labels.
