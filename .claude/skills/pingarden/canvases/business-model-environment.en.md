---
canvas: business-model-environment
language: en
source: packages/canvases/business-model-environment/
---

# Business Model Environment

## When to use

Use the Business Model Environment to surface the **external forces** that pressure or enable a business model. It's BMC's complement: BMC describes what _you_ control, the Environment Map describes what's **happening around you** that the BMC can't see.

Build it whenever you've finished or are reviewing a BMC and need to ask "what could make this assumption wrong?"

## When NOT to use

- For things you control — those go in **BMC**, not here.
- For deep customer-side work — use **VPC** + **Empathy Map**.
- As a forecasting tool. The Environment Map captures **observable** forces; speculation belongs in scenario planning, not here.

## Fill order — bottom-up, evidence-driven

The four zones layer from concrete to abstract. Fill in this order so each layer informs the next:

1. **`industry-forces`** — your industry's structural reality: incumbent competitors, new entrants, substitutes, suppliers, stakeholders. These pressure the BMC most directly.
2. **`market-forces`** — your customer side: market segments and their evolution, switching costs, revenue attractiveness, needs / demands not currently met. Often surfaces gaps the BMC's value-prop wishes weren't there.
3. **`key-trends`** — directional shifts: technological, regulatory, social-cultural, socio-economic. Specific, observable trends — not "AI is changing things."
4. **`macroeconomic-forces`** — global market conditions, capital markets, commodity prices, infrastructure. These are slow but pervasive; usually fewer entries than the inner rings.

Each layer should reference evidence: a report, a data point, an observed event. "Vibes" entries should be marked for follow-up research.

## Cross-block consistency — verify after fill

- Every entry should be **observable today** or **already in motion** — not "could happen in 5 years." The map captures forces, not forecasts.
- Each entry should imply a BMC block it pressures. If you can't say "this puts pressure on Customer Segments" / "Cost Structure" / etc., it's commentary, not a force.
- **`industry-forces`** and **`market-forces`** are often confused — industry = supply side (who else makes things like you), market = demand side (who buys, why, what alternatives).
- The BMC at the centre of the canvas is the SAME BMC the environment is pressuring. If you change the BMC, revisit the environment map.

## Anti-patterns — refuse to ship

- ❌ **Listing things you control.** "Our pricing strategy" — that's BMC. Environment is what comes from outside.
- ❌ **Speculative trends.** "AI will replace X by 2030" is forecasting. Stick to what's observable now or already starting.
- ❌ **Vague macros without implication.** "Inflation is high" — say what it pressures. Higher cost of capital? Customer price sensitivity?
- ❌ **Treating it as comprehensive PESTLE.** This is meant to surface what matters _for this BMC_, not exhaustively map the world.
- ❌ **Forces without time horizon.** "Regulation might tighten" — when is it likely to bite? Pre-launch? Year 3?
- ❌ **Industry/market confusion.** Suppliers belong in industry. Customer demand shifts belong in market. Get this wrong and the canvas reads as a jumble.

## Tone

Write each force as a short observed-fact sticky, not commentary. "EU AI Act compliance deadline Aug 2026" beats "regulation is coming." Cite the source where possible.

## Blocks

The `zoneId` is the stable API identifier — your `pingarden canvas write` payload must use it verbatim, never translate it.

### `key-trends` — Key Trends

**Prompt** — Which trends are reshaping the field?

**Example** — Generative AI commoditising basic content production

**Quality bar** — The forces of change you can't control but must anticipate.

### `industry-forces` — Industry Forces

**Prompt** — Who are you competing with — directly and indirectly?

**Example** — Two incumbents bundling our feature into their suite

**Quality bar** — The competitive landscape.

### `market-forces` — Market Forces

**Prompt** — Who do you serve, and what do they need?

**Example** — Mid-market segment growing 25% / yr while enterprise stalls

**Quality bar** — The customer-facing forces.

### `macroeconomic-forces` — Macroeconomic Forces

**Prompt** — What's the global economic backdrop?

**Example** — Capital scarce — bridge round must extend runway 18 months

**Quality bar** — The forces beyond your industry.

## Colour legend

_Not customised — use the six-colour sticky default palette. Colours carry no semantics unless the canvas defines them._

## Pairs with

This canvas typically pairs with the following — once done, suggest the user move to one of these next:

- `business-model-canvas` — The environment map exists to pressure-test a specific BMC. Always pair them — and revisit BME whenever the BMC changes.

---
Source: `packages/canvases/business-model-environment/` — regenerate with `pingarden skill build`.
