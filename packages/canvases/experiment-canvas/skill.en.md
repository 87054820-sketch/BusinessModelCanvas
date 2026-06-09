## When to use

Use the Experiment Canvas to design **one cheap, falsifiable test** of one risky assumption — before you build. It's a Lean Startup / Strategyzer staple: hypothesis → test → measurable result → learning.

One canvas = one experiment. If you have multiple risky assumptions, run multiple experiments (in parallel where possible). The canvas's job is to make sure each experiment is **specific enough to fail**.

## When NOT to use

- Before identifying risky assumptions. Use **Design Criteria Canvas** + **VPC** to surface assumptions; **Experiment Canvas** is the next step.
- For long product builds. If your "experiment" takes 6 weeks, it's a project. Real experiments fit in days.
- For confirmatory testing of well-validated hypotheses. Experiments must be capable of failure to be useful.

## Fill order — risk first, then test design, then commit

1. **`riskiest-assumption`** — what's the single thing you're betting on that, if wrong, sinks the whole offering? Be ruthless about picking the riskiest, not the easiest. Common riskiest assumptions: a customer segment will pay X, a pain is severe enough to switch, a channel reaches the segment cheaply.
2. **`falsifiable-hypothesis`** — restate the assumption as a sentence with a number and a deadline that is **capable of being wrong**. "If we [action], then [N]% of [segment] will [behaviour] within [timeframe]." Without a number and deadline, the hypothesis isn't falsifiable.
3. **`experiment-setup`** — what is the cheapest test that produces a clear answer? Consider: smoke test, concierge MVP, fake-door, customer interviews with a price commitment, A/B. Specify exactly what you'll do, with whom, for how long.
4. **`metrics-criteria`** — what number do you measure, and what threshold counts as PASS / FAIL? Pre-commit. ("≥ 8/30 pre-orders" PASS, "< 8/30" FAIL.) Without pre-committed thresholds, results are interpreted with bias.
5. **`results-conclusion`** — fill in AFTER the experiment. Actual number observed; pass / fail per the threshold. No reinterpretation. Negative results are equally informative.
6. **`next-steps`** — based on the result, what is the next decision? Persevere (next experiment in this direction), pivot (different assumption), or kill (the offering doesn't survive). Be specific about which.

## Cross-block consistency

- **Riskiest-assumption** must be the actual riskiest, not the easiest to test. Teams default to easy. Force the question: what would sink this if wrong?
- **Hypothesis** must include a NUMBER and a DEADLINE. Without those it's an opinion.
- **Setup** must be CHEAP relative to the value of the answer. If learning costs as much as building, build.
- **Metrics threshold must be set BEFORE running.** Pre-commit. Otherwise the team will rationalise whatever result comes back.
- **Results must be reported as observed**, not as the team wishes. The point of pre-commit is to neutralise post-hoc rationalisation.

## Anti-patterns — refuse to ship

- ❌ **Vague hypothesis.** "Customers will like it" is not falsifiable. Add: "≥ X out of Y will [specific action] within [Z days]."
- ❌ **Test designed to confirm.** If the experiment can't fail, it's marketing, not a test.
- ❌ **Threshold set after results come in.** "20% engagement is actually pretty good" — invalidates the experiment. Pre-commit or you've learnt nothing.
- ❌ **Riskiest assumption = the second-riskiest.** Teams skip past the scariest assumption to test something safer. The riskiest is the one that'd sink you, not the one easiest to test.
- ❌ **Experiment too expensive.** Spending 4 weeks engineering an MVP to test "would anyone want this" — the test should be days, not weeks.
- ❌ **No "pivot/kill" branch in next-steps.** If the only outcome is "keep going", you weren't actually testing.
- ❌ **Filling results to fit the desired narrative.** Negative result = real learning. Document it as-is.

## Tone

Each block is a single tight statement. Hypothesis is a sentence. Setup is 2-3 sentences. Results are a number + a single line. Conclusions are a verb (persevere / pivot / kill) + a sentence.
