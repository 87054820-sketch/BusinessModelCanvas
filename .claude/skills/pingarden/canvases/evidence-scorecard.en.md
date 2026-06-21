---
canvas: evidence-scorecard
language: en
source: packages/canvases/evidence-scorecard/
---

# Evidence Scorecard

## When to use

Evidence Scorecard reviews the evidence state of one Explore project or critical assumption. It puts test results, evidence strength, learning velocity, risk reduction, and portfolio decision on one canvas so the team does not only report activity volume.

## Blocks

The `zoneId` is the stable API identifier — your `pingarden canvas write` payload must use it verbatim, never translate it.

### `critical-assumption` — Critical assumption

**Prompt** — Which critical, fragile assumption is this scorecard evaluating?

**Example** — Target customers will pay a monthly fee for automated reports

### `current-evidence` — Current evidence

**Prompt** — What real evidence exists now? Write test results, behavior data, or customer quotes — not opinions.

**Example** — 6 of 8 interviewees described an active workaround

### `evidence-strength` — Evidence strength

**Prompt** — Is the evidence weak, medium, or strong? Why is it enough or not enough for the next step?

**Example** — Weak: interview intent only

### `learning-velocity` — Learning velocity

**Prompt** — How often does the team get decision-changing evidence? What was learned recently?

**Example** — One test every two weeks

### `risk-reduction` — Risk reduction

**Prompt** — How much have desirability, feasibility, and viability risks decreased? What remains untested?

**Example** — Desirability down; viability still weak

### `portfolio-decision` — Portfolio decision

**Prompt** — Based on evidence, should the team persevere, pivot, test more, transfer, fund, or retire?

**Example** — Persevere: run a concierge test

### `next-experiment` — Next experiment

**Prompt** — What is the cheapest next experiment that can change the decision? What are pass/fail criteria?

**Example** — Pre-sell to 5 target customers in 2 weeks; proceed only if ≥2 pay

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
