# Open Business Models — AI skill page

## TL;DR

A pattern where **value flows across the firm boundary by design** —
either external ideas come *in* (outside-in) or idle internal IP goes
*out* (inside-out). Per *(BMG 2010)*, Open has **two structurally
distinct sub-types** — picking the right one is the whole game.

## Two sub-types

### Outside-in (external ideas in)
The firm opens its R&D / product process to systematically acquire
external ideas, technology, and IP. Builds gateways: scouts,
crowdsourcing platforms, licensing-in agreements. **Sister pattern**:
`multi-sided-platforms` (the connector platforms that aggregate
external solvers ARE multi-sided). Examples: P&G Connect & Develop,
GE Ecomagination, LEGO Ideas, InnoCentive (as the connector
platform).

### Inside-out (idle IP out)
The firm monetises idle internal IP through licensing, spin-out,
joint venture, or pool — capturing value from assets it would not
commercialise itself. Examples: GSK patent pools (neglected diseases),
IBM patent licensing (~$1B/yr), Tesla open patents (2014, ecosystem-
capture variant), Xerox PARC spin-outs (the cautionary tale of
under-priced licensing).

## When this pattern applies (signals)

- BMC has a Key Activity that's specifically about open-innovation
  management (scouting, licensing, integration, IP valuation)
- ≥ 25-30% of the innovation pipeline crosses the firm boundary in
  one or both directions
- Key Partners includes innovation-platform partners (outside-in) or
  licensee partners / pool members (inside-out)
- Cost Structure trades variable external costs against reduced
  internal R&D fixed cost

## How to spot it from a BMC

- **Key Partners**: the signature block in both sub-types. Outside-in
  → innovation platforms, university tech-transfer, scouting agencies.
  Inside-out → licensees, pool members, spin-out investors.
- **Key Resources** (outside-in): an externally-sourced IP / partner
  network shows up alongside internal resources.
- **Revenue Streams** (inside-out): a license-fee / royalty /
  spin-out-equity stream shows up alongside the core revenue.
- **Key Activities**: "open-innovation management" appears as a real
  activity, not a side note.

## Decision tree — which sub-type?

Ask: **Where does the value flow across the firm boundary?**
- *External ideas, technology, or IP coming IN to be used internally*
  → outside-in.
- *Idle internal IP going OUT to be used externally* → inside-out.
- *Both directions, in significant volume* → bilateral; treat as
  outside-in + inside-out tagged together. Most mature
  open-innovation firms (P&G, GSK, IBM) actually run both.

## Anti-patterns

- ❌ Calling any partnership or licensing deal Open. The pattern
  starts when open-innovation is a Key *Activity* with a measurable
  share of the pipeline (~25-30% inbound or outbound), not an
  ad-hoc partner relationship.
- ❌ Outside-in without an integration capability. External ideas
  reach the firm and die at the integration step (NIH syndrome).
  The integration capability has to be itself a Key Activity, with
  budget authority — not a "we'll try to evaluate it" promise.
- ❌ Inside-out with no honest "what's idle" assessment. License-out
  decisions get vetoed because the asset *might* be commercialised
  internally someday — even when it's been on the strategic roadmap
  for 5+ years with no movement. Without that honesty, the inside-
  out flow stays at zero.
- ❌ Underpricing first inside-out deals. Without licensing
  benchmarks, first deals tend to be one-shot fees with no royalty
  or equity. Xerox PARC's Adobe / 3Com / Apple GUI deals are the
  canonical cautionary tale — Xerox captured almost no value.

## Cross-references

- **`multi-sided-platforms`** — the connector platforms that *run*
  outside-in for many seekers (InnoCentive, Topcoder, Kaggle) ARE
  multi-sided. The case `innocentive` carries both tags
  deliberately.
- **`unbundling-business-models`** — open-innovation pressure often
  drives an integrated firm to unbundle its R&D from its
  commercialisation. Big Pharma's move toward biotech-licensing-in
  is the worked example.
- For non-Open contrast: `gillette` is closed-innovation classic
  (everything internal, IP defended through patents). The pattern
  works without open-innovation when the bait-and-hook lock-in is
  strong enough.

## How to act on it

When the user asks about an Open Business Models company:

1. `pingarden pattern get open-business-models` — read the example
   list and the sub-type breakdown.
2. **Identify the sub-type first**, before any BMC drafting. Walk
   the decision tree above. Many firms do both — say so explicitly
   if so, and tag the BMC accordingly.
3. Walk the BMC of one of the sub-type's exemplar cases
   (`pingarden case get procter-gamble-cd` for outside-in;
   `pingarden case get glaxosmithkline-patent-pool` for inside-out;
   `pingarden case get innocentive` for the connector-platform
   variant of outside-in).
4. Note that connector platforms (`innocentive`) are usually also
   tagged `multi-sided-platforms` — the two patterns overlap
   structurally for that variant.
