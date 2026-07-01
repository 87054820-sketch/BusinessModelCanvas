# Scenario Planning

> A framework for turning environment signals and critical uncertainties into multiple plausible futures, then testing which business-model moves remain robust across them.

## Slug

`scenario-planning` — referenced by `CaseLibraryEntry.appliesStrategyFrameworks[]` on cases that demonstrate this analysis method.

# Scenario Planning

## When to use

Use when the user faces high environmental uncertainty and wants to move from scanning signals to choosing strategy across multiple futures.

## Workflow

1. Define the focal issue and time horizon.
2. Use `business-model-environment` to collect external signals.
3. Separate trends, driving forces, and critical uncertainties.
4. Choose uncertainties that would most change strategic choices.
5. Use `scenario-matrix` to build plausible, internally consistent scenarios.
6. Wind-tunnel BMCs, portfolio bets, and design criteria through each scenario.
7. Identify robust moves, contingent moves, preserved options, and early warning signals.
8. If organizational adoption matters, switch to `performance-based-scenario-planning` to manage preparation, implementation, and assessment.

## Canvas mapping

- BME feeds signals.
- Scenario Matrix builds the futures.
- BMC and Portfolio Map test strategic options.
- Design Criteria Canvas captures robust rules.

## Anti-patterns

Do not make good/base/bad forecasts. Do not write science-fiction scenarios that never change strategic action. Do not skip early signals or assessment if the work must guide real decisions.

## Related canvases

- `scenario-matrix`
- `business-model-environment`
- `business-model-canvas`
- `portfolio-map`
- `design-criteria-canvas`

## Example cases shipped in this skill

- `patagonia` (primary)

To explore an example case, follow with `pingarden case read <slug> --json`. To inspect the method itself, use `pingarden strategy-framework get scenario-planning --json`.

## References

### Books

- **Schwartz 1991** · *Peter Schwartz · The Art of the Long View · Currency Doubleday* · 1991
  Classic source for scenario thinking, driving forces, critical uncertainties, and strategy robustness across futures.

- **Chermack 2011** · *Thomas J. Chermack · Scenario Planning in Organizations · Berrett-Koehler Publishers* · 2011 · Performance-Based Scenario System; Project Preparation; Scenario Exploration; Scenario Development; Scenario Implementation; Project Assessment
  Adds the organizational project, implementation, assessment, and human-perception layer to scenario planning.

### Articles

- **Schoemaker 1995** · *Paul J. H. Schoemaker · Scenario Planning: A Tool for Strategic Thinking · Sloan Management Review* · 1995
  Classic management article positioning scenario planning as a disciplined tool for strategic thinking under uncertainty.
