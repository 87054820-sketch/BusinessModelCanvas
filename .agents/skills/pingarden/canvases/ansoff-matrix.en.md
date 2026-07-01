---
canvas: ansoff-matrix
language: en
source: packages/canvases/ansoff-matrix/
---

# Ansoff Matrix

# Ansoff Matrix

## TL;DR

A directional choice canvas for a single business. Pick one quadrant per growth horizon — the four quadrants are ordered by execution risk (penetration < market dev ≈ product dev < diversification).

## Fill order

1. Plot the current position (existing × existing) first — anchor the analysis.
2. Brainstorm 2–4 **candidate growth moves**; place each in one quadrant.
3. For each candidate, name: what stays the same (blue), what must change (green), the riskiest assumption (pink).
4. **Growth rationale** zone last — compare candidates and commit to one quadrant per horizon.

## Cross-block invariants

- Single business per canvas. If you have a multi-business portfolio, run BCG first, then Ansoff per business.
- Don't stack two quadrants on the same business in the same period without explicit capacity (purple stickies).
- Diversification requires an explicit adjacency story — what is shared between old and new? If nothing, kill it.
- Market dev (same product, new buyer) and product dev (new product, same buyer) look similar but have different riskiest assumptions — don't merge them.

## Anti-patterns

- Calling a small feature addition "diversification" — most are product development.
- Treating Ansoff as a one-shot quadrant pick rather than a recurring decision (case studies like Spotify or Amazon walk through all 4 over time).
- Picking diversification because the other quadrants feel boring, without naming what's shared.
- Skipping the "what must change in the BMC" mapping — growth then under-resourced.
- Confusing Ansoff with BCG: Ansoff is forward, BCG is snapshot; Ansoff is per-business, BCG is portfolio.

## Tone

Specific names — products and markets, not categories. "Launch new product line for current customer base" is not enough; write "Launch men's apparel sold via existing female-customer styling subscription, targeting 2026 cohort". Numbers and named cohorts.

## Blocks

The `zoneId` is the stable API identifier — your `pingarden canvas write` payload must use it verbatim, never translate it.

### `market-development` — Market Development

**Prompt** — Existing product × new market. Take the same offering to a new geography, segment, or use occasion. Risk: medium — the product is proven, the customer is not.

**Example** — Geographic expansion to a new country

**Quality bar** — Existing product × new market: take the same product to a new geography, new segment, or new use occasion.

### `diversification` — Diversification

**Prompt** — New product × new market. Both axes move. Risk: highest — usually only viable if the core is mature and there is real adjacency, or if both customer and offer share at least one substrate.

**Example** — Amazon launching AWS (new product + new buyer)

**Quality bar** — New product × new market: both axes move. The highest-risk quadrant.

### `market-penetration` — Market Penetration

**Prompt** — Existing product × existing market. Sell more to customers you already serve. Risk: lowest. Levers: usage, repeat purchase, share-of-wallet, win-back, pricing optimisation.

**Example** — Loyalty program to lift repeat purchase

**Quality bar** — Existing product × existing market: sell more to the customers you already serve. The lowest-risk quadrant.

### `product-development` — Product Development

**Prompt** — New product × existing market. Build new offerings for customers you already understand. Risk: medium — the buyer relationship is proven, the offer is not.

**Example** — New product line sold through current channels

**Quality bar** — New product × existing market: build new offerings for customers you already understand.

### `growth-rationale` — Growth rationale

**Prompt** — For the chosen quadrant, name (a) what stays the same, (b) what must change in the BMC, (c) the riskiest assumption per candidate, and (d) the capacity to actually do this in parallel with everything else.

**Example** — Keep current production base; change channels to D2C; risky if D2C unit economics fail at scale

**Quality bar** — The decision close-out zone.

## Colour legend

- `0` — **Candidate growth move**: A specific growth bet under consideration — name the product, the market, and the unit size.
- `1` — **What stays the same**: BMC blocks, customer relationships, capabilities, or channels that carry over unchanged from today's business.
- `2` — **What must change**: New channels, new resources, new partners, or new cost structure the move requires.
- `3` — **Riskiest assumption**: The specific assumption that, if false, would kill the move. Falsifiable, with a metric.
- `4` — **Capacity constraint**: Organisational capacity / management bandwidth limit that may force a sequence rather than parallel pursuit.

## Pairs with

This canvas typically pairs with the following — once done, suggest the user move to one of these next:

- `business-model-canvas` — The chosen Ansoff quadrant predicts which BMC blocks must change: penetration → channels/customer-relationships; market dev → segments/channels; product dev → value-proposition/key-resources; diversification → nearly everything.
- `portfolio-map` — Diversification moves should appear as new Explore pins on the Portfolio Map; product or market development should appear as branches or movements on existing pins.
- `design-criteria-canvas` — Encode the constraint the next bet must respect (must share existing channels, must reuse current production base) so the team does not slip from one quadrant into another by accident.
- `bcg-growth-share-matrix` — BCG classifies existing businesses; Ansoff picks the growth direction for one business. Multi-business: BCG first (allocate across SBUs) → Ansoff per business (pick direction). Single business: skip BCG, use Ansoff.
- `three-horizons-map` — H1 work is usually penetration; H2 is often product or market development; H3 is often diversification or new-market disruption. Position the Ansoff quadrant within the time-portfolio.

---
Source: `packages/canvases/ansoff-matrix/` — regenerate with `pingarden skill build`.
