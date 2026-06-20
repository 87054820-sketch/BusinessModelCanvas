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

Business Model Portfolio Management should be treated as a portfolio-level strategic management framework. It uses `portfolio-map` to manage Explore and Exploit portfolios, then expands important pins into BMCs or Experiment Canvases. Do not file it under business-model patterns, and do not tag a case merely because the company is innovative.
