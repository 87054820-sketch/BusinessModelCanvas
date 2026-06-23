# Ansoff Matrix

> A growth-direction framework that classifies a move along two axes — existing vs. new products × existing vs. new markets — yielding four routes (market penetration, market development, product development, diversification) ordered by risk.

## Slug

`ansoff-matrix` — referenced by `CaseLibraryEntry.appliesStrategyFrameworks[]` on cases that demonstrate this analysis method.

# Ansoff Matrix

## Select this framework when

- A single business faces multiple plausible growth routes and the team must pick one direction.
- The team is sliding from penetration into diversification one feature at a time and must name the shift.
- The user is comparing risk profiles of growth bets; Ansoff orders the four routes by execution risk.

## Use these canvases

1. `business-model-canvas` — map the chosen quadrant to which BMC blocks must change.
2. `portfolio-map` — diversification = new Explore pin; product/market dev = branch on existing pin.
3. `design-criteria-canvas` — encode constraints (e.g., must share channels) so the team stays in the chosen quadrant.

## Questions to ask

- What is the current product × market position?
- Of the candidate moves, which quadrant does each fall into?
- What stays the same? What must change?
- What is the riskiest assumption per candidate?
- Does the team have capacity to do more than one quadrant simultaneously?

## Hand-off to other frameworks

- **Ansoff vs. BCG**: BCG is portfolio-level — it classifies *existing* businesses. Ansoff is business-level — it picks the *direction* of growth for one business. Single business → skip BCG, use Ansoff. Multi-business → BCG first to allocate resources across SBUs, then Ansoff per business to pick direction. Per-BCG-quadrant guide: Cash Cow → Ansoff penetration; Star → market or product dev; Question Mark → Ansoff is the decision tool (penetrate, differentiate, or kill); Dog → harvest in place or attempt diversification.
- For time-layering, position the quadrant choice within **Three Horizons**.
- For diversification specifically, validate with **Innovation Metrics** before scaling.

## Red flags

Do not call a small feature addition "diversification". Do not stack two quadrants on the same business in the same period without explicit capacity planning. Do not pick diversification because the others feel boring — name what is shared.

## Related canvases

- `ansoff-matrix`
- `business-model-canvas`
- `portfolio-map`
- `design-criteria-canvas`

## Example cases shipped in this skill

- `spotify` (primary)
- `stitch-fix` (primary)
- `nintendo-wii` (primary)
- `nestle-portfolio` (secondary)

To explore an example case, follow with `pingarden case read <slug> --json`. To inspect the method itself, use `pingarden strategy-framework get ansoff-matrix --json`.

## References

### Books

- **Ansoff 1965** · *H. Igor Ansoff · Corporate Strategy · McGraw-Hill* · 1965
  Book-length elaboration of the growth matrix and its place in corporate-level strategy.

### Articles

- **Ansoff 1957** · *[H. Igor Ansoff · Strategies for Diversification · Harvard Business Review](https://hbr.org/1957/09/strategies-for-diversification)* · 1957
  Original HBR article introducing the product-market growth matrix and the four growth vectors.
