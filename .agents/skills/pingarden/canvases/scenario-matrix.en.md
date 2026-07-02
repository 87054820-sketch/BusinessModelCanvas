---
canvas: scenario-matrix
language: en
source: packages/canvases/scenario-matrix/
---

# Scenario Matrix

# Scenario Matrix

## When to use

Use when the user has external signals and needs to turn uncertainty into several plausible futures that pressure-test strategy.

## Fill order

1. Define the focal strategic issue.
2. Bring in signals from `business-model-environment`.
3. Choose two independent critical uncertainties.
4. Name both end states for each uncertainty.
5. Write four scenarios with different strategic logic.
6. Test BMC, portfolio bets, and design criteria inside each scenario.
7. Record robust moves and early signals.

## Red flags

- Good/base/bad versions instead of distinct futures.
- No BMC or portfolio implication.
- No early signals.
- No owner for follow-up monitoring.

## Blocks

The `zoneId` is the stable API identifier — your `pingarden canvas write` payload must use it verbatim, never translate it.

### `uncertainty-a` — Critical uncertainty A

**Prompt** — Choose an uncertainty that would significantly change strategic choices, and name both end states.

**Example** — Regulation opens ↔ regulation tightens

**Quality bar** — This module names the first axis of the matrix.

### `uncertainty-b` — Critical uncertainty B

**Prompt** — Choose a second independent uncertainty. Avoid describing the same force as A.

**Example** — Technology matures fast ↔ technology matures slowly

**Quality bar** — The second axis should be independent from the first.

### `scenario-1` — Scenario 1

**Prompt** — If one end of A and one end of B both happen, what market emerges? Which BMC blocks are pressured?

**Example** — Name the scenario, key signals, opportunities, threats, and business-model implications

**Quality bar** — Each scenario should be a plausible world, not a label.

### `scenario-2` — Scenario 2

**Prompt** — Write the second scenario. Focus on how customers, channels, partners, or revenue logic change.

**Example** — Which value propositions strengthen? Which cost structures break?

**Quality bar** — Scenario 2 should not be a mirror image of Scenario 1.

### `scenario-3` — Scenario 3

**Prompt** — Write the third scenario. Do not make it merely the pessimistic version.

**Example** — Who benefits in this future? Who loses? Which options do we hold?

**Quality bar** — Scenario 3 is often where teams discover hidden assumptions. Resist making it simply "bad.

### `scenario-4` — Scenario 4

**Prompt** — Write the fourth scenario and identify the strategic logic that differs most from the others.

**Example** — Which assumptions should be tested earliest? Which signals should be monitored?

**Quality bar** — Scenario 4 completes the matrix and should force comparison across all futures.

### `robust-moves` — Robust moves / early signals

**Prompt** — Which moves are useful across multiple scenarios? Which external signals reveal that a scenario is forming?

**Example** — Keep asset-light channel options

**Quality bar** — Robust moves are actions that make sense across several futures.

## Colour legend

- `0` — **Signal**: External trend, weak signal, or trigger event.
- `1` — **Scenario implication**: What changes for the business model in this future.
- `2` — **Robust move**: Action useful across more than one scenario.

## Pairs with

This canvas typically pairs with the following — once done, suggest the user move to one of these next:

- `business-model-environment`
- `business-model-canvas`
- `portfolio-map`
- `design-criteria-canvas`

---
Source: `packages/canvases/scenario-matrix/` — regenerate with `pingarden skill build`.
