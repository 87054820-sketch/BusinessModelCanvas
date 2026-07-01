---
canvas: portfolio-map
language: en
source: packages/canvases/portfolio-map/
---

# Portfolio Map

## When to use

Use the Portfolio Map when you have **multiple business models / ventures / product lines** and need to compare them on one page — to decide where to invest, where to harvest, where to wind down. Built around the **Explore vs Exploit** axis (typically: Explore = expected return × Exploit = death risk on the X axis, scaled up the Y).

It's strategic posture management, not single-business design.

## When NOT to use

- Designing a single business model — that's **BMC**.
- Roadmap prioritisation at the feature level — wrong altitude. Portfolio Map is for whole ventures or sufficiently distinct product lines.
- As a 2x2 matrix without honest scoring. Without quantifying both axes, you're just drawing dots.

## Fill order — measure both sides, plot honestly

This is a chart canvas, not a sticky canvas. The two zones (`explore` and `exploit`) are conceptual halves of the plot — pins live on the underlying chart-grid plotted by (X, Y) coordinates.

1. **Define the axes precisely.** Default Strategyzer scoring: X = expected return (or innovation potential), Y = death risk (or proven business). Adapt only if you have a defensible alternative.
2. **List the units.** What's a single pin? One business model? One product line? Be consistent. Mixing "the entire AI division" with "the latest mobile app feature" makes the chart meaningless.
3. **Plot the `exploit` side first** — your existing, proven businesses. You have data on these; use it. Customer count, MRR, market share — score on both axes.
4. **Plot the `explore` side** — emerging / experimental ventures. Less data, more judgement. Be explicit about what you'd need to LEARN to update each plot.
5. **Look at the shape.** A healthy portfolio has movement: items climbing from explore → exploit, items in exploit declining toward end-of-life. A portfolio bunched in one corner is a strategic problem.

## Cross-block consistency

- **Every pin must be a unit at the same level of granularity.** If the canvas has both "Q1 mobile launch" and "the consumer division," collapse to one altitude.
- **Each pin's position must be defensible** — point at the data or named assumption that puts it there.
- **Pin colour / class** should encode something meaningful — life-stage, business unit, lead. Match it across canvases for consistency.
- **The `explore` side requires named experiments** to be honest. "We're exploring X" without an experiment plan is wishful thinking. Pair with **Experiment Canvas**.

## Anti-patterns — refuse to ship

- ❌ **2x2 without axes.** "Innovative vs not" without numbers is vibes. Score honestly, even if rough.
- ❌ **Mixed altitudes.** Don't put product features alongside whole business models. Pick one altitude per canvas.
- ❌ **Plotting without data on the exploit side.** You should have hard numbers (revenue, retention, market share) for proven businesses. If you don't, that itself is a finding.
- ❌ **All explore, no exploit (or vice versa).** A healthy portfolio has both. All-explore = no cash to fund it. All-exploit = no future.
- ❌ **Static plot.** The whole point is movement over time. If the map looks the same as last quarter, what changed in the world that nothing moved?
- ❌ **Plotting aspirations as fact.** "Where we want to be in 3 years" is a different canvas (a future-state fork). Today's map is today's reality.

## Tone

Each pin is a unit + a brief annotation explaining its position. Annotations should reference evidence ("3% MoM churn", "PMF survey 25% disappointed"). Avoid descriptive labels ("the new thing").

## Blocks

The `zoneId` is the stable API identifier — your `pingarden canvas write` payload must use it verbatim, never translate it.

### `explore` — Explore

**Prompt** — Explore: search.

**Example** — Mobile-first SMB tier (low risk, modest return)

**Quality bar** — The Explore portfolio is all about the SEARCH for new ideas, value propositions, and business models to ensure the future of your company.

### `exploit` — Exploit

**Prompt** — Exploit: grow.

**Example** — On-prem flagship product (high return, rising disruption risk)

**Quality bar** — The Exploit portfolio is all about keeping your existing business models on a GROWTH trajectory.

## Colour legend

_Not customised — use the six-colour sticky default palette. Colours carry no semantics unless the canvas defines them._

## Pairs with

This canvas typically pairs with the following — once done, suggest the user move to one of these next:

- `business-model-canvas` — Each pin on the portfolio is a BMC in miniature. When a pin is interesting, expand it into a full BMC.

---
Source: `packages/canvases/portfolio-map/` — regenerate with `pingarden skill build`.
