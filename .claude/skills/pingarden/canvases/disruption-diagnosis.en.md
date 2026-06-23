---
canvas: disruption-diagnosis
language: en
source: packages/canvases/disruption-diagnosis/
---

# Disruption Diagnosis

# Disruption Diagnosis

## TL;DR

A diagnostic canvas, not a "we're disruptive" badge. Pass Christensen's strict 3-part test, or label the candidate honestly as sustaining / new-market entry / direct competition — all of which are valid moves but not disruption.

## Fill order

1. **Foothold customer** first. If the candidate has no overshot or non-consumption foothold, this is not disruption. Stop the canvas.
2. **Worse on dimension** + **Acceptable on dimension** as a pair. The disruption case is a trade — name what is given up and what is gained.
3. **Incumbent's rational reason to ignore**. If the incumbent could and would respond, you're competing, not disrupting.
4. **Upmarket migration path**. Concrete milestones, not "we'll improve over time".
5. **Riskiest assumptions** last — which assumption falsifies the whole case?

## Cross-block invariants

- Strict test (Christensen 2015): all 3 must hold. (1) foothold in low-end or non-consumption, (2) initially inferior on mainstream dimensions, (3) sustained upmarket improvement while preserving foothold advantage.
- "Acceptable on dimension" must explain *why the foothold customer accepts the inferiority*. "It's cheaper" alone is rarely enough — what does that price unlock that they couldn't have otherwise?
- Migration path needs at least 2 concrete next-step segments — not just "expand later".

## Anti-patterns

- Labelling everything novel as "disruptive". The Uber case is the canonical misuse.
- Confusing new technology with disruptive innovation. New technology applied to mainstream customers along existing dimensions is sustaining.
- Skipping foothold test — without an overshot or non-consumption customer, what you have is direct competition.
- Filling out "upmarket migration" as wishful thinking; ground it in customer-segment evidence.
- Putting the disruptive bet under the incumbent's standard margin metrics; Christensen's organisational prescription is insulation.

## Tone

Strict, evidence-grounded. The discriminator vs. Blue Ocean / new-market entry is the *strictness* of the foothold + inferiority + upmarket trio. Numbers, not adjectives. If a sticky says "users love the simplicity", rewrite as "users complete onboarding in <90s vs incumbent's 4min, measured on n=120".

## Blocks

The `zoneId` is the stable API identifier — your `pingarden canvas write` payload must use it verbatim, never translate it.

### `foothold-customer` — Foothold customer

**Prompt** — Who is the foothold? Overshot mainstream customer (low-end disruption) or non-consumer the incumbent never served (new-market disruption)? Be specific about segment, geography, occasion.

**Example** — African feature-phone users — non-consumers from Apple's perspective

**Quality bar** — The foothold customer is the load-bearing assumption of disruptive innovation theory.

### `worse-on-dimension` — Worse on dimension

**Prompt** — On which dimensions valued by mainstream customers is the disruptor *initially inferior*? Name the dimension and quantify the gap — Christensen requires this.

**Example** — Sound quality lower than CDs initially

**Quality bar** — This is the *load-bearing* test of the disruption label.

### `acceptable-on-dimension` — Acceptable on dimension

**Prompt** — What is the disruptor better on, that the foothold customer values enough to accept the inferiority above? Price, simplicity, accessibility, convenience, or context fit?

**Example** — 50% lower price + multi-day battery (Transsion)

**Quality bar** — The disruption trade: what does the foothold customer get instead, that compensates for the inferiority above?

### `incumbent-rational-ignore` — Incumbent's rational reason to ignore

**Prompt** — Why will incumbents rationally *not* respond? Typical: thin margin, small market today, cannibalisation risk against current high-margin products. Their customer interview correctly tells them to ignore you.

**Example** — Apple cannot serve <$50 phones without destroying its brand-margin model

**Quality bar** — This is the analytical pivot of Christensen's theory: incumbents are not stupid; they are *rational*.

### `upmarket-migration-path` — Upmarket migration path

**Prompt** — Concrete trajectory: how will you improve along the mainstream dimensions while preserving foothold advantage? Product milestones, customer-segment migration, scale economics.

**Example** — Feature phone → Android smartphone for emerging-market mainstream

**Quality bar** — The disruption story is incomplete without the trajectory.

### `riskiest-assumptions` — Riskiest assumptions

**Prompt** — Which assumption will break the case if false? Pick from: foothold customer willingness, improvement trajectory feasibility, incumbent inattention duration, organisational insulation from parent's margin metrics.

**Example** — ≥X% of foothold customers will actually pay the price we promised

**Quality bar** — The single assumption that, if false, would falsify the disruption hypothesis and kill the bet.

## Colour legend

- `0` — **Incumbent baseline**: How the incumbent currently serves mainstream customers along conventional dimensions.
- `1` — **Disruptor foothold**: Where the new entrant starts: overshot mainstream customer or non-consumer the incumbent rationally ignores.
- `2` — **Migration evidence**: Evidence of improvement trajectory along mainstream dimensions: product milestones, customer-segment migration, scale curve.
- `3` — **Riskiest assumption**: Foothold willingness, improvement trajectory, or incumbent inattention duration — which assumption is most likely to break first.
- `4` — **Strict-test note**: Note against Christensen's 3-part test (low-end or non-consumption foothold / initially inferior on mainstream / upmarket improvement) — does this candidate truly qualify?

## Pairs with

This canvas typically pairs with the following — once done, suggest the user move to one of these next:

- `business-model-canvas` — Disruption is rarely just a product story. Sketch the incumbent's BMC alongside the disruptor's BMC and name where they diverge — channels, cost structure, key activities, partners.
- `portfolio-map` — Disruptive bets sit deep in the Explore quadrant with high risk and uncertain return. The foothold → mainstream → upmarket trajectory becomes a path of pin migrations on the Portfolio Map.
- `value-proposition-canvas` — For new-market disruption, the customer side is non-consumers — pains and jobs never previously served. For low-end, it is overshot mainstream customers — pains specifically caused by the incumbent's over-engineering.
- `three-horizons-map` — A disruption candidate is typically an H3 bet. Run Disruption Diagnosis first to pass the Christensen strict test, then place on Three Horizons for time-portfolio sequencing, then use Innovation Metrics to measure.

---
Source: `packages/canvases/disruption-diagnosis/` — regenerate with `pingarden skill build`.
