# Platform Strategy

> A framework for analyzing multi-sided ecosystems through participant sides, core interactions, network effects, governance, trust, monetization, and regulatory risk.

## Slug

`platform-strategy` — referenced by `CaseLibraryEntry.appliesStrategyFrameworks[]` on cases that demonstrate this analysis method.

# Platform Strategy

## When to use

Use when a case involves multiple participant sides, matching, network effects, platform governance, or ecosystem monetization.

## Workflow

1. List every side the platform connects.
2. Define the minimum viable core interaction.
3. Identify how value units are produced, matched, and consumed.
4. Determine whether network effects are same-side or cross-side.
5. Explain cold start and which side must be activated first.
6. Check governance, trust, openness, monetization, and regulatory risk.

## Anti-patterns

Do not merely claim "network effects." Explain where they come from, how they are governed, how monetization works, and when they can backfire.

## Related canvases

- `platform-ecosystem-map`
- `business-model-canvas`
- `value-proposition-canvas`
- `customer-journey`
- `portfolio-map`

## Example cases shipped in this skill

- `uber` (primary)
- `airbnb` (primary)
- `google-multi-sided` (primary)
- `visa` (secondary)
- `nvidia-cuda` (secondary)
- `alibaba-group` (secondary)

To explore an example case, follow with `pingarden case read <slug> --json`. To inspect the method itself, use `pingarden strategy-framework get platform-strategy --json`.

## References

### Books

- **Parker et al. 2016** · *Platform Revolution · W. W. Norton & Company* · 2016
  Core source for network effects, platform governance, openness, launch, and monetization trade-offs.

- **BMG 2010** · *Business Model Generation · Wiley* · 2010 · Multi-sided platforms pattern
  Business-model pattern source for understanding platform sides through BMC logic.
