# Porter's Value Chain Analysis

> An internal-activity framework from Porter that decomposes a firm into nine activities — five primary (inbound logistics, operations, outbound logistics, marketing & sales, service) and four support (firm infrastructure, HRM, technology development, procurement) — so teams locate where margin and differentiation are actually created.

## Slug

`porters-value-chain` — referenced by `CaseLibraryEntry.appliesStrategyFrameworks[]` on cases that demonstrate this analysis method.

# Porter's Value Chain Analysis

## Select this framework when

- The team has a strategic intent (compete on cost / on quality / on service) but can't yet point to the activities that must change.
- Capability looks fine on paper but margin keeps eroding — the leak is usually in a *linkage* between two activities.
- The user is preparing to define BMC Key Activities / Resources / Partners and needs the higher-resolution view first.

## Use these canvases

1. `business-model-canvas` — translate each activity into KA / KR / KP stickies; differentiating activities also feed Value Proposition.
2. `design-criteria-canvas` — encode activity-level rules ("must hold ≥30% gross margin", "service responds within 4 hours").

## Questions to ask

- What is the unit of analysis (one business, not the whole group)?
- Inside each of the nine activities, what concrete sub-activities exist?
- Per activity: cost level, differentiation contribution, capability strength?
- Where are the linkages that reinforce or fight each other?
- Which 2–3 activities are the load-bearing differentiators?

## Hand-off to other frameworks

- For organisation-wide coherence, follow with **McKinsey 7-S** — does the soft side support the activity hierarchy?
- For multi-sided / platform businesses, complement with **Platform Strategy** — network effects often dominate activity-level advantage.
- For external-pressure context, sequence after **Five Forces** or **BMEScan** — Value Chain is the internal half of the same diagnosis.

## Red flags

Do not draw the nine boxes as a generic process map. Do not treat each activity in isolation — linkages are where real differentiators live. Do not skip support activities; they are usually the most defensible. Do not stop at the diagram — translate to BMC KA/KR/KP changes.

## Related canvases

- `porters-value-chain`
- `business-model-canvas`
- `design-criteria-canvas`

## Example cases shipped in this skill

- `patagonia` (primary)
- `cainiao` (primary)
- `gillette` (secondary)
- `nestle-portfolio` (secondary)

To explore an example case, follow with `pingarden case read <slug> --json`. To inspect the method itself, use `pingarden strategy-framework get porters-value-chain --json`.

## References

### Books

- **Porter 1985** · *Michael E. Porter · Competitive Advantage · Free Press* · 1985
  Canonical source for the nine-activity value chain, the primary/support split, linkages, and the cost vs. differentiation diagnosis logic.
