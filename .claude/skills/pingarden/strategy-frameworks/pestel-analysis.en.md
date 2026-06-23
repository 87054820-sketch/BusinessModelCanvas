# PESTEL Analysis

> A macro-environment scanning framework that maps six categories of external forces — political, economic, social, technological, environmental, and legal — so teams see which long-running shifts shape the industry before drafting business-model moves.

## Slug

`pestel-analysis` — referenced by `CaseLibraryEntry.appliesStrategyFrameworks[]` on cases that demonstrate this analysis method.

# PESTEL Analysis

## Select this framework when

- The user starts a new market entry, a periodic environment review, or any scenario planning prep.
- The team is arguing about "the future" without naming forces — PESTEL anchors them on observable signals.
- The user needs upstream context before Five Forces / Env Scan / BMC pressure-testing.

## Use these canvases

1. `business-model-environment` — put each PESTEL signal under trends / market / industry / macro.
2. `scenario-matrix` — pick the two highest-impact-and-uncertainty PESTEL forces as axes.
3. `business-model-canvas` — translate each signal into pressure on a specific BMC block.

## Questions to ask

- What is the unit of analysis (industry + geography + time horizon)?
- For each of the six categories, what 3–5 *observable* signals exist? (Facts, not adjectives.)
- Which signals score high on both impact and uncertainty?
- What is the one-line `so-what` for each high-impact signal, mapped to a BMC block?

## Hand-off to other frameworks

- **PESTEL → BMEScan** is the load-bearing pipeline. PESTEL produces 20–40 macro signals; BMEScan absorbs the 8–12 highest impact/uncertainty into the four BMG zones (Trends absorbs PESTEL S/T/E-Environmental; Macro absorbs PESTEL E-Economic/P/L). What PESTEL doesn't cover and BMEScan does: direct competitors and stakeholders inside the industry — so always finish at BMEScan when you have a BMC.
- Use Env Scan to compress the most BMC-relevant signals into the four BMG forces.
- Use Scenario Planning when 2+ PESTEL forces are high-uncertainty and high-impact.
- Use Five Forces only after PESTEL has clarified macro context — they are different altitudes.

## Red flags

Do not let PESTEL become a deck slide. Do not overweight Technology because it is glamorous. Do not confuse uncertainties (plan against) with risks (discount). Do not skip the `so-what` step — a PESTEL cell without a BMC implication is noise.

## Related canvases

- `business-model-environment`
- `scenario-matrix`
- `business-model-canvas`

## Example cases shipped in this skill

- `patagonia` (primary)
- `nickel-bank` (primary)
- `transsion-africa` (secondary)
- `ping-an-group` (secondary)

To explore an example case, follow with `pingarden case read <slug> --json`. To inspect the method itself, use `pingarden strategy-framework get pestel-analysis --json`.

## References

### Books

- **Aguilar 1967** · *Francis J. Aguilar · Scanning the Business Environment · Macmillan* · 1967
  Original source for ETPS — economic, technological, political, social — the seed of PEST/PESTEL macro environment scanning.

### Web

- **CIPD PESTLE** · *[CIPD · PESTLE analysis factsheet](https://www.cipd.org/en/knowledge/factsheets/pestle-analysis-factsheet/)*
  Concise contemporary explanation of the six-letter extension (PESTEL/PESTLE) and how to apply it as a scanning routine.
