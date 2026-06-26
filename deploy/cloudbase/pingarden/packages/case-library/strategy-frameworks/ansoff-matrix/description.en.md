# Ansoff Matrix

The Ansoff Matrix (Ansoff, 1957) classifies a growth move along two axes — **existing vs. new products** × **existing vs. new markets** — yielding four routes:

1. **Market penetration** — existing product, existing market: sell more to the customers you already serve.
2. **Market development** — existing product, new market: take the same product to new geographies, segments, or use occasions.
3. **Product development** — new product, existing market: build new offerings for the customers you already understand.
4. **Diversification** — new product, new market: the highest-risk quadrant, often only viable when the existing core is mature, the new bet is structurally adjacent, or both customer and offer share at least one substrate.

The four quadrants are ordered by execution risk, with diversification carrying the most failure modes.

## When to use

Use the Ansoff Matrix when a single business has multiple plausible growth directions and the team must name which one it is choosing. It is also useful as a discipline against "diversification by accident" — teams often slide from penetration into diversification one feature at a time without naming the shift.

Do not use Ansoff to manage a multi-business portfolio (that's BCG / Three Horizons / Business Model Portfolio Management). Ansoff lives at the business-unit level, asking *how does this one business grow next*.

## How it differs from neighbouring frameworks

- **BCG Growth-Share Matrix** classifies *existing* businesses by share and growth to decide invest/harvest/divest. Ansoff asks the prior question: when we choose to grow, *in which direction*? See the dedicated section below.
- **McKinsey Three Horizons** is the time-portfolio layer (today's core / scaling / future bets). Ansoff is a single-business move within any horizon — H1 work is usually penetration; H2 is often product or market development; H3 is often diversification or new-market disruption.
- **Business Model Portfolio Management** unifies Explore/Exploit. Ansoff names what the next growth bet looks like; Portfolio Management decides where to put it on the Portfolio Map.

## Ansoff vs. BCG Matrix — usage difference

Both are 2×2 matrices about growth, but they answer **opposite** questions and live at different levels. Confusing them is the most common matrix-mistake in strategy decks.

| Dimension | Ansoff Matrix | BCG Growth-Share Matrix |
| --- | --- | --- |
| Axes | Existing/new **product** × existing/new **market** | **Market growth rate** × **relative market share** |
| Unit of analysis | One business / one BMC | A multi-business portfolio (each SBU = one bubble) |
| Question answered | "Where should this business grow *next*?" | "What should we do with the businesses we already have?" |
| Time orientation | **Forward** — about future moves | **Snapshot** — about current portfolio position |
| Output | A directional choice (4 quadrants of risk) | A resource-allocation decision (invest / harvest / divest) |
| Risk axis | Quadrants explicitly ordered by execution risk (penetration → market dev → product dev → diversification) | Quadrants not risk-ordered; each has its own risk profile |
| What it doesn't do | Doesn't tell you which existing businesses to fund | Doesn't tell you which direction to expand any single business |

**Per-quadrant cross-map** — given a BCG classification of an existing business, what is the typical Ansoff next move?

- BCG **Cash Cow** (low growth, high share) → Ansoff **market penetration** (defend share, raise utilisation) or controlled harvesting. Rarely diversification *from* the Cow itself.
- BCG **Star** (high growth, high share) → Ansoff **market development** (geo / segment expansion) or **product development** (extensions) to sustain growth while share is still defendable.
- BCG **Question Mark** (high growth, low share) → Ansoff is the decision tool: **penetrate harder** to win share, **product develop** to differentiate, or accept it cannot win and kill it.
- BCG **Dog** (low growth, low share) → Ansoff rarely picks penetration here. Either harvest in place or attempt **diversification** away — but only if there's a credible adjacency.

**Recommended workflow when you have a multi-business portfolio**:

1. Run BCG first at the portfolio level — classify every SBU into one of the four cells.
2. Decide per cell: which Cows to defend, which Stars to invest in, which Question Marks to back, which Dogs to harvest or divest.
3. For each business kept (especially Stars and the backed Question Marks), run Ansoff to decide the *direction* of growth: penetration, market dev, product dev, or diversification.
4. Carry Ansoff outputs into the BMC + Portfolio Map for execution.

**Recommended workflow when you have a single business**: skip BCG (you have only one bubble — the matrix doesn't help) and go straight to Ansoff to pick the growth direction.

**Common confusion**: teams sometimes treat Ansoff's "diversification" quadrant as if it were a portfolio decision and reach for BCG. It's not — Ansoff diversification is still a *direction* for one business to expand into; once you have multiple businesses, BCG becomes the right portfolio lens, and Ansoff applies again per business.

## How it maps to PinGarden canvases

- `business-model-canvas` — for an existing business, the chosen Ansoff quadrant predicts which BMC blocks must change (penetration: channels/customer-relationships; market dev: segments/channels; product dev: value-proposition/key-resources; diversification: nearly everything).
- `portfolio-map` — diversification moves should appear as new Explore pins; product or market development should appear as branches or movements on existing pins.
- `design-criteria-canvas` — encode the constraint that the next bet must respect (e.g., "must share existing channels", "must reuse current production base") so the team does not slip a quadrant.

## Workflow

1. Define the unit (one business / one BMC).
2. Mark its current product × current market position.
3. Brainstorm 2–4 candidate growth moves; place each in one quadrant.
4. For each candidate, list (a) what stays the same, (b) what must change, (c) the riskiest assumption.
5. Compare candidates on expected return × risk × strategic fit.
6. Pick one quadrant per growth horizon; do not stack two quadrants on the same business in the same period without explicit capacity planning.

## What to notice in examples

- `spotify` — Started as **market penetration** (Sweden music streaming), expanded through **market development** (geographic rollout), then **product development** (podcasts, audiobooks), now testing **diversification** (live events, AI features). The four quadrants are revisited sequentially, not picked once.
- `stitch-fix` — Strong example of **product development** layered on penetration: women's apparel → men's → kids' → home goods, each new line reusing the algorithmic styling core.
- `nintendo-wii` — Textbook **diversification**: new product (motion-controlled console) for a new market (casual non-gamers / families), simultaneously moving on both axes. Required new partners, new channels, and a new pricing logic.
- `nestle-portfolio` — Operates several Ansoff moves in parallel across its portfolio: penetration in coffee, market development in emerging markets, product development in health-science, diversification through acquisitions. Useful contrast: at portfolio level, Ansoff is a per-business view that must be aggregated.

## Common misuses

- Calling a small feature addition "diversification" — most are product development.
- Treating Ansoff as a one-shot quadrant pick rather than a recurring decision.
- Picking diversification because the others feel "boring", without naming what is shared between old and new.
- Confusing market development (same product, new buyer) with product development (new product, same buyer) — the riskiest assumption differs.
- Skipping the "what must change in the BMC" mapping, so the team plans growth without provisioning the resources / partners / channels.

## Sources

- H. Igor Ansoff, *Strategies for Diversification*, Harvard Business Review, 1957.
- H. Igor Ansoff, *Corporate Strategy*, McGraw-Hill, 1965.
