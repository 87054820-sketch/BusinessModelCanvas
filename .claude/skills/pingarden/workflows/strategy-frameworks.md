# Strategy frameworks — analysis methods, separate from patterns

A **strategy framework** (for example Blue Ocean Strategy) is an analysis method, not a case and not a business-model pattern. Frameworks live at `packages/case-library/strategy-frameworks/<slug>/`, are listed in `manifest.json.strategyFrameworks`, and are served by `/library/strategy-frameworks(/:slug)`.

## When to use

Use this workflow when the user asks for a strategic analysis method, wants examples of Blue Ocean Strategy / Business Model Environment Scan, or asks which cases demonstrate a framework.

1. `pingarden strategy-framework list --json` to see available methods.
2. `pingarden strategy-framework get <slug> --json` to read the framework description and hydrated example cases.
3. For a concrete company, read the case with `pingarden case read <case-slug> --json` and inspect `appliesStrategyFrameworks[]`.
4. For Blue Ocean Strategy specifically, pair the framework page with `canvases/blue-ocean-strategy-canvas.<lang>.md` before writing any value curve.
5. For Business Model Environment Scan specifically, pair the framework page with `canvases/business-model-environment.<lang>.md` and a concrete BMC; every environment signal must point back to one or more BMC blocks.

## Cross-link rules

- Framework → case: `StrategyFramework.examples[]` lists curated case slugs.
- Case → framework: `CaseLibraryEntry.appliesStrategyFrameworks[]` lists methods demonstrated by the case.
- Do not tag a case just because it is innovative. Tag it only when the framework is a clear teaching lens.
