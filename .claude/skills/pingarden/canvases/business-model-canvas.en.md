---
canvas: business-model-canvas
language: en
source: packages/canvases/business-model-canvas/
---

# Business Model Canvas

## When to use

Use the Business Model Canvas when a team needs to align on **how a whole business creates, delivers, and captures value**, on a single page, in under an hour. It's a snapshot tool — useful when comparing strategic options, mapping a current state for shared understanding, or surfacing risky assumptions before committing resources.

## When NOT to use

- One narrow operational issue with a clear boundary (BMC will inflate it).
- Deep customer-facing analysis of one segment — use **Value Proposition Canvas** instead, then bring it back to BMC.
- External forces (regulation, market, macro trends) — pair BMC with **Business Model Environment** rather than cramming forces into Key Partners.
- A full business plan or financial forecast (BMC has only a Cost / Revenue silhouette, not P&L).

## Fill order — strict, do not skip ahead

The right-hand side answers _who_; the left answers _how_; the bottom answers _what it nets_. Always:

1. **Customer Segments** — who we structurally serve (groups with materially different needs, channels, or willingness-to-pay).
2. **Value Propositions** — what bundle of products & services solves each segment's job. Outcomes, not features.
3. **Channels** — how each segment is reached (awareness → evaluation → purchase → delivery → after-sales).
4. **Customer Relationships** — what kind of relationship each segment expects (self-serve, dedicated, community, automated).
5. **Revenue Streams** — how value is captured per segment (recurring vs transactional, what they're willing to pay).
6. **Key Resources** — what assets are needed to deliver the value propositions and run the channels.
7. **Key Activities** — the few critical processes that produce, deliver, or sell the value.
8. **Key Partnerships** — what's better outsourced, allied, or co-opetition'd than built.
9. **Cost Structure** — driven by Resources + Activities + Partnerships. Cost-driven vs value-driven posture.

If you find yourself wanting to start with Key Activities or Key Resources, **stop**. They depend on every block to their right.

## Cross-block invariants — verify after fill

- Every **Revenue Stream** traces to at least one **Customer Segment** (otherwise: phantom revenue).
- Every **Channel** serves at least one **Customer Segment** (otherwise: orphan channel).
- **Customer Relationships** count ≥ **Customer Segments** count (different segments usually want different relationship types).
- Every **Value Proposition** points at at least one **Customer Segment** (otherwise: nobody to sell it to).
- **Key Activities** + **Key Resources** are about delivering the **Value Propositions** + running the **Channels** — not a wishlist.
- **Cost Structure** stickies should reflect the things in Key Resources / Activities / Partnerships, not new line items.

## Anti-patterns — refuse to ship a BMC that does these

- ❌ **Customer Segments = marketing persona.** "25–35 urban professionals" is a persona. BMC wants _structural_ segments — groups for whom the model materially differs. Two segments must require different value propositions, channels, OR revenue streams to deserve separation.
- ❌ **Value Propositions written as features.** "AI-powered editor" is a feature. "Cut bookkeeping from 5 hours to 30 minutes per week" is a value proposition. Use outcome language with measurable deltas where possible.
- ❌ **Exhaustive Key Activities / Key Resources.** Resist listing everything. Three to five _critical_ items per block beats fifteen mediocre ones.
- ❌ **Revenue Streams as price points.** "$29 / month" is a price, not a stream. The stream is the _model_ ("recurring subscription tied to seat count"). Pricing belongs in a separate experiment.
- ❌ **Mixing future and current state on one canvas.** If half is "what we do" and half is "what we want," nothing decides. Take a snapshot, then a separate "to-be" canvas — fork via `pingarden snapshot restore --mode fork`.
- ❌ **Sticky as paragraph.** One concept per sticky, ~5–15 words. If a sticky needs more, it's two stickies.

## Tone

Write stickies as if filling a whiteboard with a senior team. Concrete > abstract; specific > generic; verb-first for activities, noun-phrase for resources / segments / propositions.

## Blocks

The `zoneId` is the stable API identifier — your `pingarden canvas write` payload must use it verbatim, never translate it.

### `key-partners` — Key Partners

**Prompt** — Who are your key partners and key suppliers?

**Example** — Cloud infrastructure provider (AWS / Aliyun)

**Quality bar** — The Key Partnerships Building Block describes the network of suppliers and partners that make the business model work.

### `key-activities` — Key Activities

**Prompt** — What must you do to deliver the value proposition?

**Example** — Continuous product engineering

**Quality bar** — The Key Activities Building Block describes the most important things a company must do to make its business model work.

### `key-resources` — Key Resources

**Prompt** — What resources are required to deliver the value proposition?

**Example** — Proprietary recommendation algorithm

**Quality bar** — The Key Resources Building Block describes the most important assets required to make a business model work.

### `value-propositions` — Value Propositions

**Prompt** — What value do you deliver, and what customer need do you satisfy?

**Example** — Cut bookkeeping time from 5h to 30min per week

**Quality bar** — The Value Propositions Building Block describes the bundle of products and services that create value for a specific Customer Segment.

### `customer-relationships` — Customer Relationships

**Prompt** — What relationship does each customer segment expect?

**Example** — Self-serve onboarding + in-app chat

**Quality bar** — The Customer Relationships Building Block describes the types of relationships a company establishes with specific Customer Segments.

### `channels` — Channels

**Prompt** — How do your customer segments want to be reached?

**Example** — Direct sales team

**Quality bar** — The Channels Building Block describes how a company communicates with and reaches its Customer Segments to deliver a Value Proposition.

### `customer-segments` — Customer Segments

**Prompt** — Who are your customers, and who are the most important ones?

**Example** — Mid-market SaaS teams (50–500 seats)

**Quality bar** — The Customer Segments Building Block defines the different groups of people or organizations an enterprise aims to reach and serve.

### `cost-structure` — Cost Structure

**Prompt** — What are the most important costs in this model?

**Example** — Cloud compute & storage (~38% of OpEx)

**Quality bar** — The Cost Structure Building Block describes all costs incurred to operate a business model.

### `revenue-streams` — Revenue Streams

**Prompt** — For what value are customers really willing to pay?

**Example** — Monthly per-seat SaaS subscription

**Quality bar** — The Revenue Streams Building Block represents the cash a company generates from each Customer Segment.

## Colour legend

_Not customised — use the six-colour sticky default palette. Colours carry no semantics unless the canvas defines them._

## Pairs with

This canvas typically pairs with the following — once done, suggest the user move to one of these next:

- `business-model-environment` — External forces (trends, market, industry, macro) that pressure the model. Use it to surface risks BMC can't see.
- `value-proposition-canvas` — Zoom into one Customer Segment + its Value Proposition. Build one VPC per segment that matters.
- `portfolio-map` — Plot multiple BMCs against each other (existing vs new, mature vs experimental) to compare strategy posture.
- `design-criteria-canvas` — Make the constraints and aspirations explicit before designing the next model iteration.
- `experiment-canvas` — Pick the riskiest assumptions on the BMC and design a cheap test for each.

---
Source: `packages/canvases/business-model-canvas/` — regenerate with `pingarden skill build`.
