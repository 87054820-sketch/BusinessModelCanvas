# Business Model Portfolio Management

> A strategic framework for managing the portfolio of existing businesses you exploit and future businesses you explore, using the Portfolio Map to visualize, analyze, and act on risk, return, and renewal.

## Slug

`business-model-portfolio-management` — referenced by `CaseLibraryEntry.appliesStrategyFrameworks[]` on cases that demonstrate this analysis method.

# Business Model Portfolio Management — AI guide

Use this framework when the user asks about portfolio, ambidexterity, reinvention, balancing core business with new growth, or how an incumbent should manage several business models at once.

## Workflow

1. Define the unit of analysis: business models, business units, product lines, ventures, or value propositions. Do not mix levels.
2. Split items into `Explore` and `Exploit`.
3. For Explore items, estimate `Expected Return` and `Innovation Risk` based on evidence.
4. For Exploit items, estimate `Return` and `Death & Disruption Risk`.
5. Choose actions:
   - Explore: Ideate, Persevere, Pivot, Retire, Spinout, Transfer, Invest.
   - Exploit: Acquire, Merge, Partner, Invest, Improve, Divest, Dismantle.
6. For any important pin, expand it into a BMC. For any risky Explore pin, design experiments.

## Use with PinGarden

- Read the framework: `pingarden strategy-framework get business-model-portfolio-management --json`.
- Use `portfolio-map` as the primary canvas.
- Use `business-model-canvas` to expand a pin.
- Use `experiment-canvas` to reduce uncertainty on Explore items.
- Read examples with `pingarden case read <slug> --json`.

## Anti-patterns

- Do not tag a company only because it is innovative.
- Do not mix features, products, and whole businesses on the same map.
- Do not treat the map as static. Portfolio management is about movement over time.
- Do not apply execution KPIs to Explore projects; they need evidence, learning, and risk-reduction metrics.

## Related canvases

- `portfolio-map`
- `business-model-canvas`
- `experiment-canvas`

## Example cases shipped in this skill

- `ping-an-group` (primary)
- `nestle-portfolio` (primary)
- `bosch-accelerator` (primary)
- `alibaba-group` (primary)
- `procter-gamble-cd` (secondary)

To explore an example case, follow with `pingarden case read <slug> --json`. To inspect the method itself, use `pingarden strategy-framework get business-model-portfolio-management --json`.

## References

### Books

- **Osterwalder et al. 2020** · *Alexander Osterwalder, Yves Pigneur, Fred Etiemble & Alan Smith · The Invincible Company · Wiley* · 2020 · Portfolio Map, Explore/Exploit, Portfolio Actions, Innovation Metrics, Culture sections
  Canonical source for the Explore/Exploit portfolio distinction, Portfolio Map, and portfolio actions used in this framework.
