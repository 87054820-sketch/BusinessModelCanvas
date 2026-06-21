---
canvas: platform-ecosystem-map
language: en
source: packages/canvases/platform-ecosystem-map/
---

# Platform Ecosystem Map

## When to use

Platform Ecosystem Map analyzes participant sides, core interaction, network effects, governance, monetization, and risk in multi-sided platforms. It fits platform cases such as Uber, Airbnb, Visa, Google, and NVIDIA CUDA.

## Blocks

The `zoneId` is the stable API identifier — your `pingarden canvas write` payload must use it verbatim, never translate it.

### `demand-side` — Demand side

**Prompt** — Which demand-side participants does the platform serve? Why do they come?

**Example** — Riders need faster access to cars

### `core-interaction` — Core interaction

**Prompt** — What is the minimum viable value exchange? Who produces the value unit and who consumes it?

**Example** — Hosts list homes; travelers search, book, and review

### `supply-side` — Supply side / complementors

**Prompt** — Who are the supply-side or complementor participants? Why do they participate?

**Example** — Drivers use idle time to accept rides

### `network-effects` — Network effects

**Prompt** — Are effects same-side or cross-side? How does growth make the next participant more valuable?

**Example** — More drivers reduce wait time and attract riders

### `governance-trust` — Governance & trust

**Prompt** — Which rules, reviews, reputation, or incentives ensure quality and trust?

**Example** — Two-sided reviews

### `monetization` — Monetization

**Prompt** — How does the platform charge? Does monetization harm the core interaction or participant incentives?

**Example** — Transaction commission

### `cold-start-risks` — Cold start / risks

**Prompt** — Which side must be activated first? What regulatory, fraud, quality, subsidy, or backlash risks exist?

**Example** — Subsidize supply first to create coverage

## Colour legend

- `0` — **Participant**: Demand side, supply side, complementor, or ecosystem actor.
- `1` — **Interaction**: Core value exchange, matching, or transaction flow.
- `2` — **Governance**: Rules, trust mechanisms, quality controls, or incentives.
- `3` — **Risk**: Cold start, fraud, regulatory, or monetization risk.

## Pairs with

This canvas typically pairs with the following — once done, suggest the user move to one of these next:

- `business-model-canvas`
- `value-proposition-canvas`
- `customer-journey`
- `portfolio-map`

---
Source: `packages/canvases/platform-ecosystem-map/` — regenerate with `pingarden skill build`.
