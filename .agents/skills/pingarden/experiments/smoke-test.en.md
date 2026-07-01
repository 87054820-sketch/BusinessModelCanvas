# Smoke Test

> A real-looking landing page that promotes a product or feature you have NOT built. Measure visit-to-signup conversion to see if demand is real before sinking engineering. The defining first Validation experiment.

## Slug

`smoke-test` — referenced by AI agents matching a riskiest assumption to a candidate experiment. Cross-reference into canvases is via `experiment.appliesToCanvases[]`.

## At a glance

| | |
| --- | --- |
| **Theme** | Validation |
| **Risks** | Desirability |
| **Evidence strength** | Medium |
| **Cost** | Medium |
| **Setup time** | Days |
| **Run time** | Days |
| **Capabilities** | `landing-page-copy` · `ad-targeting` · `analytics-funnel` |
| **Applies to canvases** | `value-proposition-canvas` · `business-model-canvas` · `ad-lib-value-proposition` |

# Smoke Test — TL;DR for AI agents

**When to recommend.** Discovery is done. User needs quantitative demand evidence before committing engineering. The decision gate is "do we build it?".

**Strength of evidence.** Medium. Validates *promise* + targeted-traffic conversion. Does NOT yet validate they'll pay real dollars or stick. For payment use Pre-Sale; for stickiness use Wizard of Oz / Concierge.

**Sample.** 500-2000 targeted visits to a single landing page with one CTA. Conversion threshold set BEFORE the run.

**Setup / run.** Days (page + ad creative + tracking) / days (ad spend window).

**Capabilities.** `landing-page-copy`, `ad-targeting`, `analytics-funnel`.

**Decision tree.**

- No Discovery done? → DON'T recommend. Customer Interview / Survey first.
- B2B with long sales cycle? → DON'T recommend. Letter of Intent.
- Solution needs explanation > 30 seconds? → Concierge or Wizard of Oz instead.
- User wants to validate willingness to actually pay $? → Smoke Test is the start; follow with Pre-Sale.

**Anti-patterns.**

- Fake checkout flow that takes a card silently — destroys trust.
- Untargeted traffic = noise.
- Adjusting threshold after the fact.
- Email list ≠ validated demand without follow-up.

**Cross-canvas.** Validates `value-proposition-canvas` (does the value prop convert?), `ad-lib-value-proposition` (which one-line claim works), `business-model-canvas` (channels block — does paid acquisition work to this ICP?).

## Sources

- Bland & Osterwalder · Testing Business Ideas · Wiley · 2019 · Validation / 4-1 Smoke Test
- Eric Ries · The Lean Startup · Crown Business · 2011
