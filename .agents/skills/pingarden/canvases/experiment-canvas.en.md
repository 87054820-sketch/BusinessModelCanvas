---
canvas: experiment-canvas
language: en
source: packages/canvases/experiment-canvas/
---

# Experiment Canvas

## When to use

Use the Experiment Canvas to design **one cheap, falsifiable test** of one risky assumption — before you build. It's a Bland & Osterwalder *Testing Business Ideas* / Strategyzer staple, downstream of the Lean Startup tradition: classify the risk → form a hypothesis → pick an experiment from the library → measure → learn → decide.

One canvas = one experiment. If you have multiple risky assumptions, run multiple experiments (in parallel where possible). The canvas's job is to make sure each experiment is **specific enough to fail**.

## When NOT to use

- Before identifying risky assumptions. Use **Design Criteria Canvas** + **VPC** to surface assumptions; **Experiment Canvas** is the next step.
- For long product builds. If your "experiment" takes 6 weeks, it's a project. Real experiments fit in days.
- For confirmatory testing of well-validated hypotheses. Experiments must be capable of failure to be useful.

## Fill order — risk first, then test design, then commit

1. **`riskiest-assumption`** — what's the single thing you're betting on that, if wrong, sinks the whole offering? Be ruthless about picking the riskiest, not the easiest. **Classify it as Desirability / Feasibility / Viability** (TBI's three risks) — the classification feeds experiment selection in step 3. Common riskiest assumptions: a customer segment will pay X (D + V), a pain is severe enough to switch (D), a channel reaches the segment cheaply (D / Feasibility), procurement will sign within Q3 (V).
2. **`falsifiable-hypothesis`** — TBI's 4-line template: "We believe X. To verify, we will Y. And measure Z. We're right if [pre-set threshold] within [timeframe]." Without a number and deadline, the hypothesis isn't falsifiable.
3. **`experiment-setup`** — pick a method from the **Experiment Library** (`experiments/<slug>.{en,zh}.md` — 12 curated TBI experiments). Match on theme (Discovery → Validation), risk (D/F/V from step 1), and cost band. See "Match an experiment from the library" below.
4. **`metrics-criteria`** — what number do you measure, and what threshold counts as PASS / FAIL? Pre-commit. ("≥ 8/30 pre-orders" PASS, "< 8/30" FAIL.) Without pre-committed thresholds, results are interpreted with bias.
5. **`results-conclusion`** — fill in AFTER the experiment. Actual number observed; **validated / invalidated / inconclusive** (TBI's tri-state). No reinterpretation. Negative results are equally informative.
6. **`next-steps`** — based on the result: persevere (next experiment in this direction), pivot (different assumption), or kill (the offering doesn't survive). Be specific about which.

## Match an experiment from the library

Don't free-style methods. The skill ships 12 curated TBI experiments (`experiments/`). Match on three signals:

- **Theme.** Default to **Discovery** (cheap, weak evidence, course-correct fast). Jump to **Validation** only when (a) Discovery has pointed in the direction and (b) you need stronger evidence to commit engineering or capital.
- **Risk.** From step 1's D/F/V classification.
- **Cost band.** `cheap` / `medium` / `expensive` against the team's budget.

Common picks:

- D + cheap + Discovery → `customer-interview`, `online-survey`, `discussion-forums`, `search-trend-analysis`, `boomerang`, `storyboard`
- D + F + cheap + Discovery → `clickable-prototype`
- D + medium + Validation → `smoke-test`
- D + F + medium + Validation → `wizard-of-oz`
- D + V + medium + Validation → `concierge` (cheapest), `pre-sale` (B2C / prosumer)
- V (B2B) + medium + Validation → `letter-of-intent`

When recommending, return **2-3 candidates with tradeoffs** — never a single "right" answer. See `workflows/experiments.md` for the full match heuristic.

## Cross-block consistency

- **Riskiest-assumption** must be the actual riskiest, not the easiest to test. Teams default to easy. Force the question: what would sink this if wrong?
- **Hypothesis** must include a NUMBER and a DEADLINE. Without those it's an opinion.
- **Setup** must be CHEAP relative to the value of the answer. If learning costs as much as building, build.
- **Metrics threshold must be set BEFORE running.** Pre-commit. Otherwise the team will rationalise whatever result comes back.
- **Results must be reported as observed**, not as the team wishes. The point of pre-commit is to neutralise post-hoc rationalisation.
- **Strength of evidence — TBI's rules of thumb.** Action > opinion (a click beats a survey rating). N ≥ 5 minimum. Quantitative + qualitative > one alone. Live tests > recalled. Threshold pre-set > post-hoc.

## Anti-patterns — refuse to ship

- ❌ **Vague hypothesis.** "Customers will like it" is not falsifiable. Add: "≥ X out of Y will [specific action] within [Z days]."
- ❌ **Test designed to confirm.** If the experiment can't fail, it's marketing, not a test.
- ❌ **Threshold set after results come in.** "20% engagement is actually pretty good" — invalidates the experiment. Pre-commit or you've learnt nothing.
- ❌ **Riskiest assumption = the second-riskiest.** Teams skip past the scariest assumption to test something safer. The riskiest is the one that'd sink you, not the one easiest to test.
- ❌ **Skipping the D/F/V classification.** Without it, experiment selection is guesswork — you'll pick a Customer Interview to test pricing or a Smoke Test to test feasibility. Misfit ratio is high.
- ❌ **Calling Discovery results "validated".** Customer Interviews / Surveys / Forums Discover; they don't Validate. Be precise.
- ❌ **Experiment too expensive.** Spending 4 weeks engineering an MVP to test "would anyone want this" — the test should be days, not weeks.
- ❌ **No "pivot/kill" branch in next-steps.** If the only outcome is "keep going", you weren't actually testing.
- ❌ **Filling results to fit the desired narrative.** Negative result = real learning. Document it as-is.

## Tone

Each block is a single tight statement. Hypothesis is a sentence. Setup is 2-3 sentences (plus the picked experiment slug). Results are a number + a single line. Conclusions are a verb (persevere / pivot / kill) + a sentence.

## Blocks

The `zoneId` is the stable API identifier — your `pingarden canvas write` payload must use it verbatim, never translate it.

### `riskiest-assumption` — Riskiest Assumption

**Prompt** — If this is wrong, where does the whole idea fail?

**Example** — Users will pay monthly for automated reports

**Quality bar** — Write the assumption that creates the most risk right now.

### `falsifiable-hypothesis` — Falsifiable Hypothesis

**Prompt** — What action will drive what result within what timeframe?

**Example** — We believe a demo page will generate 30 bookings in 2 weeks

**Quality bar** — Rewrite the risky assumption as a statement that data can validate or disprove.

### `experiment-setup` — Experiment Setup

**Prompt** — What method, sample, material, and timeframe will test it?

**Example** — Run a landing-page test with 50 target customers

**Quality bar** — Define how the experiment will run: method, prototype material, sample, timeframe, owners, and variables.

### `metrics-criteria` — Metrics & Criteria

**Prompt** — What data proves the hypothesis true or false?

**Example** — Booking conversion ≥ 8% validates the test

**Quality bar** — Define how the result will be judged before running the experiment.

### `results-conclusion` — Results & Conclusion

**Prompt** — What happened, and is it validated, invalidated, or unclear?

**Example** — 32 bookings, 9.4% conversion — validated

**Quality bar** — After the experiment, record what actually happened: quantitative data, qualitative feedback, anomalies, and sample limits.

### `next-steps` — Next Steps

**Prompt** — Persevere, pivot, or redo the experiment — and who owns it?

**Example** — Persevere: expand sample to 200 target customers

**Quality bar** — Use the conclusion to decide whether to persevere, pivot, or redo the experiment.

## Colour legend

_Not customised — use the six-colour sticky default palette. Colours carry no semantics unless the canvas defines them._

## Pairs with

This canvas typically pairs with the following — once done, suggest the user move to one of these next:

- `design-criteria-canvas` — If the experiment passes, lock the result into a Must-have on the Design Criteria Canvas.
- `value-proposition-canvas` — Most riskiest assumptions live in VPC — Pains being acute enough, Gain Creators actually creating gains.
- `business-model-canvas` — When the riskiest assumption is structural (channel, revenue stream), feed results back into the BMC block.

---
Source: `packages/canvases/experiment-canvas/` — regenerate with `pingarden skill build`.
