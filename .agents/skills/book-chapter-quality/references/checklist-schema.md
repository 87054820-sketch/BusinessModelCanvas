# Coverage Checklist JSON Schema

Each chapter has one checklist at
`packages/case-library/resources/<book>/checklists/<chapter>.json`. The `<chapter>`
slug MUST match a `slug` in `chapters/index.json`. This is the machine-readable
quality gate the writing role composes against and the audit role verifies.

## Shape

```jsonc
{
  "chapter": "ch01-canvas",              // must equal a slug in chapters/index.json
  "sourceFiles": {                        // which extract txt(s) this was built from
    "en": "04-Canvas.txt",
    "zh": "06-画布.txt"                   // omit / null if the book is EN-only source
  },
  "concepts": [
    {
      "name": "Customer Segments (CS)",
      "definition": "Precise definition AS USED IN THE BOOK — not a generic gloss."
    }
  ],
  "arguments": [
    {
      "claim": "The nine blocks form an interconnected system, not isolated boxes",
      "evidence": "The reasoning + evidence the chapter uses to support the claim."
    }
  ],
  "cases": [
    {
      "name": "Apple iPod/iTunes",
      "context": "What the situation was.",
      "illustrates": "What concept/argument this case is evidence for.",
      "lesson": "The practitioner takeaway."
    }
  ],
  "logicChains": [
    {
      "description": "step 1 → step 2 → step 3 (the causal reasoning).",
      "sourceHint": "Where in the source this chain comes from (optional)."
    }
  ],
  "terminology": [
    { "term": "Economies of scope", "definition": "Precise definition as used." }
  ],
  "nuance": [
    "Plain-string qualifications: things the author says are NOT the case, or limits."
  ],
  "crossReferences": {
    "relatedCanvasDefIds": ["business-model-canvas"],   // must exist in manifest.json
    "relatedCaseSlugs": [],
    "relatedPatternSlugs": [],
    "relatedStrategyFrameworkSlugs": [],
    "relatedChapters": ["ch02-patterns"]                // sibling chapter slugs
  }
}
```

## Field rules

| Field | Type | Required | Notes |
|---|---|---|---|
| `chapter` | string | yes | Must equal a `slug` in `chapters/index.json`. |
| `sourceFiles` | object | yes | `en` required; `zh` optional for EN-only sources. |
| `concepts[]` | object[] | yes | `{name, definition}`. Definition must be source-faithful. |
| `arguments[]` | object[] | yes | `{claim, evidence}`. |
| `cases[]` | object[] | yes* | `{name, context, illustrates, lesson}`. May be `[]` only if the source chapter genuinely has no cases. |
| `logicChains[]` | object[] | no | `{description, sourceHint?}`. |
| `terminology[]` | object[] | no | `{term, definition}`. |
| `nuance[]` | string[] | no | Plain strings. |
| `crossReferences` | object | yes | Five arrays; every slug must resolve in `manifest.json`. |

## Guidance

- **Every item is an audit row.** The audit role turns each `concepts/arguments/
  cases/logicChains/terminology/nuance` entry into one ✅/❌ row for EN and ZH. Keep
  entries atomic so coverage is checkable.
- **Source-faithful definitions.** Definitions/claims must reflect the book's exact
  meaning, not a generic textbook gloss.
- **No hallucinated cross-refs.** Slugs in `crossReferences` must exist in
  `packages/case-library/manifest.json`. Run an audit grep before finalizing.
- **`relatedChapters`** uses sibling chapter slugs from the same `index.json`.
