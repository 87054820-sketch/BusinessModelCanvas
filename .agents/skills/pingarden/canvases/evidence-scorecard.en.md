---
canvas: evidence-scorecard
language: en
source: packages/canvases/evidence-scorecard/
---

# Evidence Scorecard

## When to use

The Evidence Scorecard helps a team decide what its tests have actually proven. It is for the moment after customer interviews, landing pages, concierge tests, pilots, pre-sales, or sales calls, when the team has activity but still needs a funding, pivot, persevere, or stop decision.

The beginner concept is simple: an opinion is not yet evidence. Evidence becomes useful when it connects a clear assumption, a test design, observable behavior, and a decision. A customer saying "I like it" is weaker than a customer changing workflow, spending time, sharing data, signing a letter of intent, or paying.

## Blocks

The `zoneId` is the stable API identifier — your `pingarden canvas write` payload must use it verbatim, never translate it.

### `critical-assumption` — Critical assumption

**Prompt** — Which critical, fragile assumption is this scorecard evaluating?

**Example** — Target customers will pay a monthly fee for automated reports

**Quality bar** — This module names the fragile belief being evaluated.

### `current-evidence` — Current evidence

**Prompt** — What real evidence exists now? Write test results, behavior data, or customer quotes — not opinions.

**Example** — 6 of 8 interviewees described an active workaround

**Quality bar** — This module records what has actually happened.

### `evidence-strength` — Evidence strength

**Prompt** — Is the evidence weak, medium, or strong? Why is it enough or not enough for the next step?

**Example** — Weak: interview intent only

**Quality bar** — Evidence strength asks how much weight the team should place on the evidence.

### `learning-velocity` — Learning velocity

**Prompt** — How often does the team get decision-changing evidence? What was learned recently?

**Example** — One test every two weeks

**Quality bar** — Learning velocity is the pace at which tests produce decision-changing insight.

### `risk-reduction` — Risk reduction

**Prompt** — How much have desirability, feasibility, and viability risks decreased? What remains untested?

**Example** — Desirability down; viability still weak

**Quality bar** — Risk reduction explains which uncertainty has become smaller. Desirability asks whether customers want it.

### `portfolio-decision` — Portfolio decision

**Prompt** — Based on evidence, should the team persevere, pivot, test more, transfer, fund, or retire?

**Example** — Persevere: run a concierge test

**Quality bar** — This module turns evidence into resource allocation.

### `next-experiment` — Next experiment

**Prompt** — What is the cheapest next experiment that can change the decision? What are pass/fail criteria?

**Example** — Pre-sell to 5 target customers in 2 weeks; proceed only if ≥2 pay

**Quality bar** — The next experiment is the cheapest test that can change the decision.

## Colour legend

- `0` — **Evidence**: Observed facts, test results, quotes, or usage data.
- `1` — **Learning**: What changed in the team's understanding.
- `2` — **Decision**: Persevere, pivot, transfer, fund, or retire.
- `3` — **Risk**: Remaining uncertainty or weak evidence.

## Pairs with

This canvas typically pairs with the following — once done, suggest the user move to one of these next:

- `experiment-canvas`
- `portfolio-map`
- `innovation-culture-map`

---
Source: `packages/canvases/evidence-scorecard/` — regenerate with `pingarden skill build`.
