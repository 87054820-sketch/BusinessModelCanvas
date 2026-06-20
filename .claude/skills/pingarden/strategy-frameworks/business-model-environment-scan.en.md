# Business Model Environment Scan

> A strategic analysis framework for pressure-testing a business model against external forces: key trends, market forces, industry forces, and macro-economic forces.

## Slug

`business-model-environment-scan` — referenced by `CaseLibraryEntry.appliesStrategyFrameworks[]` on cases that demonstrate this analysis method.

# Business Model Environment Scan — AI guide

Use this framework when the user needs to understand external pressure on a business model: trends, market shifts, industry structure, regulation, macro conditions, infrastructure, or stakeholder pressure.

## Fill order

1. Start from a concrete `business-model-canvas`; do not scan the environment in the abstract.
2. Identify 3–6 external signals and place them on `business-model-environment` across Key Trends, Market Forces, Industry Forces, and Macro-Economic Forces.
3. For each signal, name the affected BMC block(s).
4. Mark the signal as threat, opportunity, constraint, or uncertainty.
5. Translate the pressure back into BMC implications: adapt value proposition, segments, channels, partners, revenue, costs, or activities.

## Quality bar

- Every environment sticky must be an observed signal or explicit assumption.
- Every signal must connect to at least one BMC block.
- Industry analysis must not crowd out the other three forces.
- The output should recommend a strategic response, not just summarize the outside world.

## Anti-patterns

- Do not classify this as a business-model pattern.
- Do not write generic trend headlines without BMC impact.
- Do not use one environment map for fundamentally different segments.
- Do not treat the map as static; revisit it when the BMC changes or the environment shifts.

## Related canvases

- `business-model-environment`
- `business-model-canvas`

## Example cases shipped in this skill

- `patagonia` (primary)
- `carvana` (primary)
- `uber` (primary)
- `airbnb` (primary)
- `alibaba-group` (secondary)
- `cemex` (secondary)
- `transsion-africa` (secondary)

To explore an example case, follow with `pingarden case read <slug> --json`. To inspect the method itself, use `pingarden strategy-framework get business-model-environment-scan --json`.

## References

### Books

- **BMG 2010** · *Alexander Osterwalder & Yves Pigneur · Business Model Generation · Wiley* · 2010 · Business Model Environment section, pp. 200-211
  Canonical source for the four-force Business Model Environment map and its link back to BMC pressure points.

- **Porter 1980** · *Michael E. Porter · Competitive Strategy · Free Press* · 1980
  Useful lens for the Industry Forces quadrant: rivalry, entrants, substitutes, suppliers, and buyers, extended here with stakeholders.

### Web

- **Strategyzer Library** · *Strategyzer Library · How to scan through your environment's disruptive threats and opportunities*
  Practical guidance for treating environment signals as threats, opportunities, and constraints rather than generic trend notes.
