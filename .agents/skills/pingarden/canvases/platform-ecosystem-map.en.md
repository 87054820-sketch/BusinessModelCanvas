---
canvas: platform-ecosystem-map
language: en
source: packages/canvases/platform-ecosystem-map/
---

# Platform Ecosystem Map

## When to use

The Platform Ecosystem Map explains a business whose value is created by interactions among participant sides, not by a single company pushing a product through a pipeline. Use it for marketplaces, payment networks, app stores, developer ecosystems, creator platforms, mobility platforms, and AI ecosystems where the important question is "who needs whom, and why does the system get stronger or weaker as it grows?"

A platform is not simply a product with many users. It has at least two participant sides and a repeatable **core interaction**. One side creates or supplies a **value unit**; another side consumes, buys, uses, or responds to it. Network effects appear when adding participants on one side makes participation more valuable for the same side or another side. Multi-homing means participants can use several platforms at once, which weakens lock-in.

## Blocks

The `zoneId` is the stable API identifier — your `pingarden canvas write` payload must use it verbatim, never translate it.

### `demand-side` — Demand side

**Prompt** — Which demand-side participants does the platform serve? Why do they come?

**Example** — Riders need faster access to cars

**Quality bar** — The demand side is the participant group that wants to consume, buy, search, book, hire, use, or respond to the value unit.

### `core-interaction` — Core interaction

**Prompt** — What is the minimum viable value exchange? Who produces the value unit and who consumes it?

**Example** — Hosts list homes; travelers search, book, and review

**Quality bar** — The core interaction is the smallest repeatable exchange that makes the platform valuable.

### `supply-side` — Supply side / complementors

**Prompt** — Who are the supply-side or complementor participants? Why do they participate?

**Example** — Drivers use idle time to accept rides

**Quality bar** — The supply side creates the value unit or makes it more useful.

### `network-effects` — Network effects

**Prompt** — Are effects same-side or cross-side? How does growth make the next participant more valuable?

**Example** — More drivers reduce wait time and attract riders

**Quality bar** — Network effects explain how participation changes value.

### `governance-trust` — Governance & trust

**Prompt** — Which rules, reviews, reputation, or incentives ensure quality and trust?

**Example** — Two-sided reviews

**Quality bar** — Governance is how the platform sets rules, resolves disputes, curates quality, and protects the core interaction.

### `monetization` — Monetization

**Prompt** — How does the platform charge? Does monetization harm the core interaction or participant incentives?

**Example** — Transaction commission

**Quality bar** — Platform monetization is the design of who pays, when, how much, and for what.

### `cold-start-risks` — Cold start / risks

**Prompt** — Which side must be activated first? What regulatory, fraud, quality, subsidy, or backlash risks exist?

**Example** — Subsidize supply first to create coverage

**Quality bar** — Cold start is the chicken-and-egg problem: demand waits for supply, supply waits for demand.

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
