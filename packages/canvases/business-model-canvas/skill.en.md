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
