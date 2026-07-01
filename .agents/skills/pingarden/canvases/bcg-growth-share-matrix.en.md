---
canvas: bcg-growth-share-matrix
language: en
source: packages/canvases/bcg-growth-share-matrix/
---

# BCG Growth-Share Matrix

## When to use

Use BCG Growth-Share Matrix when the user has several businesses, products, brands, or geographies and wants to classify them by market growth and relative market share.

## When not to use

- If market share is unknown and cannot be approximated.
- If the portfolio is mostly early innovation bets: use `portfolio-map` or `three-horizons-map`.
- If industry forces, not portfolio allocation, are the main topic: use `business-model-environment` or `porters-five-forces`.

## Fill order

1. Define comparable units.
2. Estimate market growth for each unit.
3. Estimate relative share versus the relevant leader.
4. Place units into Question Marks, Stars, Dogs, or Cash Cows.
5. Add evidence stickies for growth/share assumptions.
6. Decide actions: invest, harvest, select, divest, or reposition.
7. Expand important units into BMC before committing resources.

## Red flags

- Quadrant position is based on opinion rather than data.
- All Question Marks are funded equally.
- Cash Cows are harvested without protecting the economics.
- Dogs are retained without a clear strategic reason.

## Blocks

The `zoneId` is the stable API identifier — your `pingarden canvas write` payload must use it verbatim, never translate it.

### `question-marks` — Question Marks

**Prompt** — High market growth, low relative share. Which units deserve selective investment, and which should be abandoned before they consume too much cash?

**Example** — Fast-growing category where we are a small challenger

**Quality bar** — Question Marks sit in growing markets where the company lacks relative share.

### `stars` — Stars

**Prompt** — High market growth, high relative share. Which units require investment to defend leadership and become future cash generators?

**Example** — Category leader in a fast-growing market

**Quality bar** — Stars have high relative share in high-growth markets.

### `dogs` — Dogs

**Prompt** — Low market growth, low relative share. Which units should be divested, closed, repositioned, or kept only for strategic reasons?

**Example** — Legacy product in a flat market with weak share

**Quality bar** — Dogs have low relative share in low-growth markets.

### `cash-cows` — Cash Cows

**Prompt** — Low market growth, high relative share. Which units should be managed for cash, defended efficiently, and used to fund future bets?

**Example** — Mature category leader with high margins

**Quality bar** — Cash Cows have high relative share in slower-growth markets.

### `portfolio-actions` — Portfolio actions

**Prompt** — Translate quadrant positions into actions: invest, harvest, select, divest, reposition, or validate the market/share assumptions.

**Example** — Invest in two Question Marks, harvest one Cash Cow, divest one Dog

**Quality bar** — This block turns quadrant labels into management action. A label without an action does not change the portfolio.

## Colour legend

- `0` — **Business / product**: A comparable business unit, product line, or brand to classify.
- `1` — **Market evidence**: Evidence for market growth, relative share, competitor position, or category maturity.
- `2` — **Invest / build**: Action to fund, scale, strengthen, or protect a position.
- `3` — **Harvest / divest**: Action to harvest cash, reduce investment, divest, or exit.
- `4` — **Reposition question**: Question about whether the unit should move, narrow, merge, or be reframed.

## Pairs with

This canvas typically pairs with the following — once done, suggest the user move to one of these next:

- `portfolio-map` — Use BCG Growth-Share Matrix for the market-growth/share lens; use Portfolio Map when innovation risk, disruption risk, and return movement are more important than market share alone.
- `business-model-canvas` — Any business that receives invest, harvest, divest, or reposition action should be expanded into a BMC before committing resources.
- `business-model-environment` — Use environment signals to justify market-growth assumptions and to challenge whether a quadrant position is still valid.

---
Source: `packages/canvases/bcg-growth-share-matrix/` — regenerate with `pingarden skill build`.
