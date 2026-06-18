# Experiment Setup

Define how the experiment will run: method, prototype material, sample, timeframe, owners, and variables.

## Pick the method from the Experiment Library

Don't free-style. The skill ships ~12 curated TBI experiments at `experiments/<slug>.{en,zh}.md`. Match on three signals:

- **Theme** — Discovery (cheap, weak evidence; default first) or Validation (costlier, stronger evidence; jump here when Discovery has pointed in the direction).
- **Risk** — Desirability / Feasibility / Viability (set in the Riskiest Assumption block).
- **Cost band** — `cheap` / `medium` / `expensive` against the team's budget.

Common picks by phase:

- **Discovery / Desirability / cheap** → `customer-interview`, `online-survey`, `discussion-forums`, `search-trend-analysis`, `boomerang`, `storyboard`
- **Discovery / Desirability + Feasibility / cheap** → `clickable-prototype`
- **Validation / Desirability / medium** → `smoke-test`
- **Validation / Desirability + Feasibility / medium** → `wizard-of-oz`
- **Validation / Desirability + Viability / medium-strong** → `concierge` (cheapest), `pre-sale` (B2C / prosumer)
- **Validation / Viability (B2B) / strong** → `letter-of-intent`

## Check

- Who is the experiment subject, and who is affected?
- Is the sample representative enough? (See sample-size guidance in each experiment's skill page.)
- Who owns recruiting, running, recording, and reviewing the experiment?
- What's the cheapest method that produces a clear answer? (If learning costs as much as building, build instead.)
