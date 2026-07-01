# Resource reading — use source books as chapter-aware strategy material

Use this workflow whenever the user asks about a **book, report, article, paper, or source material** in the Resources tab, asks "what should I read", asks to explain a resource chapter, or asks to improve/add resource chapters.

## Reading workflow

1. Start from the resource metadata: title, recommendation, related canvases/frameworks/cases, and chapter index.
2. Prefer the chapter index first. Use chapter titles and summaries to identify the minimum relevant chapter instead of loading an entire book note.
3. Fetch full chapter content only when needed for a concrete question, teaching explanation, or source-grounded answer.
4. Connect the chapter back to PinGarden tools: canvases, patterns, strategy frameworks, experiments, and cases. Resources are the **source-material layer**, not the project layer.
5. When answering, distinguish:
   - **What the source says** (chapter-level concept / argument / case)
   - **What it means for the user's project** (canvas, strategic choice, assumption, or experiment)
   - **What to do next** (open a related canvas, read another chapter, fork a case, or run an experiment)

## Chapter-aware Resources UI

The Resources tab can expose book-like entries with chapter counts. The detail modal supports:

- a resource overview and recommendation
- a Chapters tab with left chapter navigation
- long-form bilingual chapter markdown
- chapter-level related cases/canvases/patterns
- references and source citations

Do not assume every resource has chapters. Articles, reports, papers, and web links may only have a reading note and references.

## Authoring / quality workflow for resource chapters

When creating, expanding, rewriting, or auditing files under `packages/case-library/resources/<resource>/chapters/`, follow the hard quality gate below. Do **not** write a thin summary copied from `chapters/index.json`.

### Three-role pipeline

1. **Checklist role** — read source extracts only and write `checklists/<chapter>.json`.
2. **Writing role** — write `chapters/<chapter>.en.md` and `chapters/<chapter>.zh.md` from the checklist.
3. **Audit role** — compare checklist vs EN/ZH prose and write `audit-report.md` with item-level PASS/FAIL.

Keep these roles conceptually separate. A chapter is complete only when the audit is all PASS.

### Checklist contents

Each checklist must include named concepts/frameworks, key arguments with evidence, cases/examples, logic chains, terminology, nuance, and valid cross-references. Cross-reference slugs must exist in the library manifest or canvas bundles.

### Validation commands

Run these from the repo root after authoring resource chapters:

```bash
python3 .claude/skills/book-chapter-quality/scripts/check-orphans.py <resource-slug>
python3 .claude/skills/book-chapter-quality/scripts/check-thickness.py <resource-slug>
python3 .claude/skills/book-chapter-quality/scripts/check-bilingual.py <resource-slug>
python3 .claude/skills/book-chapter-quality/scripts/audit-coverage.py <resource-slug> <chapter-slug>
```

Also run a cross-reference check when adding or changing related slugs. Do not mark work complete if any script reports missing files, stubs, bilingual gaps, invalid slugs, or audit failures.

## Current quality baseline

The bundled resource library includes 12 source-verified business books with chapter-level content, checklists, and audit reports: BMC, VPC, The Invincible Company, The Innovator's Dilemma, Testing Business Ideas, Scenario Planning in Organizations, Blue Ocean Strategy, Blue Ocean Shift, Competitive Strategy, Competitive Advantage, The Art of the Long View, and Platform Revolution.
