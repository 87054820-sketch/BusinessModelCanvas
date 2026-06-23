# Reference: strategy frameworks

Strategy frameworks are reusable analysis methods, not cases and not business-model patterns. They live at `packages/case-library/strategy-frameworks/<slug>/` with `framework.json`, bilingual descriptions, and AI-facing skill pages.

## CLI

```bash
pingarden strategy-framework list --json
pingarden strategy-framework get blue-ocean-strategy --json
pingarden strategy-framework get business-model-portfolio-management --json
```

## Cross-link rules

- Framework → case: `StrategyFramework.examples[]` points to manifested case slugs.
- Case → framework: `CaseLibraryEntry.appliesStrategyFrameworks[]` points back to manifested framework slugs.
- `pingarden case validate` enforces both directions.

## Blue Ocean Strategy note

Blue Ocean Strategy should be treated as a strategic analysis framework: Strategy Canvas, ERRC, noncustomers, and market-boundary reconstruction. Do not file it under business-model patterns.

## Business Model Portfolio Management note

Business Model Portfolio Management should be treated as a portfolio-level strategic management framework. It uses `portfolio-map` to manage Explore and Exploit portfolios, then expands important pins into BMCs or Experiment Canvases. A tagged case must include and embed a Portfolio Map in its story; dynamic cases should show dated movement. Do not file it under business-model patterns, and do not tag a case merely because the company is innovative.

## Bain Elements of Value note

Bain Elements of Value should be treated as a Customer Value Lens: a supporting strategy-analysis tool that deepens `value-proposition-canvas`, `jobs-to-be-done`, `empathy-map`, and `customer-journey`. Do not create a standalone Bain canvas or use it as a 30-element checklist; map selected value elements back to VPC gains, gain creators, pain relievers, and journey touchpoints.
