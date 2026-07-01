---
canvas: three-horizons-map
language: en
source: packages/canvases/three-horizons-map/
---

# Three Horizons Map

## When to use

Use Three Horizons Map when the user needs to sort a portfolio by growth maturity and time logic: current core, emerging growth, and future options.

## When not to use

- For a single business model: use `business-model-canvas`.
- For risk/return positioning without time sequencing: use `portfolio-map`.
- For market-share classification: use `bcg-growth-share-matrix`.

## Fill order

1. Define the unit of analysis.
2. Fill H1 with current core businesses.
3. Fill H2 with emerging businesses that have evidence.
4. Fill H3 with early options and learning bets.
5. Add migration actions for H3→H2 and H2→H1.
6. Add evidence and risks for every migration claim.
7. Route risky assumptions to `experiment-canvas` and `evidence-scorecard`.

## Red flags

- H2 contains ideas with no evidence.
- H3 is just a list of fashionable technologies.
- H1 receives all funding and H2 never moves.
- The map has no migration criteria or next review date.

## Blocks

The `zoneId` is the stable API identifier — your `pingarden canvas write` payload must use it verbatim, never translate it.

### `horizon-1-core` — Horizon 1 — Core business

**Prompt** — List the current businesses that fund the company today. Capture how each should be defended, improved, or extended.

**Example** — Insurance and banking core generating cash

**Quality bar** — H1 contains businesses that create today’s revenue, margin, data, distribution, or operating leverage.

### `horizon-2-emerging` — Horizon 2 — Emerging growth

**Prompt** — List businesses that already show evidence and may become material growth engines if scaled well.

**Example** — Digital health platform with early traction

**Quality bar** — H2 contains businesses that have evidence and early traction but are not yet reliable core engines.

### `horizon-3-options` — Horizon 3 — Future options

**Prompt** — List early options, technologies, market spaces, or business-model ideas that need learning before scale.

**Example** — Autonomous service concept

**Quality bar** — H3 contains early options where uncertainty is high and learning matters more than immediate scale.

### `migration-actions` — Migration actions

**Prompt** — What must happen for an item to move from H3 to H2, or from H2 to H1? Name funding, governance, transfer, and scaling actions.

**Example** — Move health platform from venture board to operating unit

**Quality bar** — This block turns the map into management decisions.

### `evidence-risks` — Evidence and risks

**Prompt** — Record the evidence, assumptions, and risks that determine whether each horizon item deserves more funding or a different action.

**Example** — H2 still lacks repeatable acquisition channel

**Quality bar** — This block holds the assumptions that make horizon placement honest. Use it to avoid presenting ambition as fact.

## Colour legend

- `0` — **H1 core**: Current businesses to defend, extend, and improve.
- `1` — **H2 emerging**: Emerging businesses that may become material growth engines.
- `2` — **H3 option**: Early options, technologies, or markets that need learning before scaling.
- `3` — **Risk / assumption**: The assumption that blocks a bet from moving to the next horizon.
- `4` — **Migration action**: Funding, transfer, governance, or organizational action that changes horizon position.

## Pairs with

This canvas typically pairs with the following — once done, suggest the user move to one of these next:

- `portfolio-map` — Use Portfolio Map for the whole portfolio's risk/return position; use Three Horizons when timing, maturity, and migration between core, emerging, and future bets are the main question.
- `business-model-canvas` — Each important horizon item should resolve to a specific business model logic before it receives serious funding.
- `experiment-canvas` — H2 and H3 bets need experiments that reduce the assumptions blocking movement toward the core.
- `evidence-scorecard` — Use Evidence Scorecard to decide whether a bet has enough evidence to move, fund, pause, pivot, or retire.

---
Source: `packages/canvases/three-horizons-map/` — regenerate with `pingarden skill build`.
