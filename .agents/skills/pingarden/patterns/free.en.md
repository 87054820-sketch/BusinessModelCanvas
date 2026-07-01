# Free

> At least one substantial customer segment continuously benefits from a free-of-charge offer; another part of the business or another customer segment covers the cost. The book identifies three structurally distinct flavors: ad-supported, freemium, and bait-and-hook (lock-in).

## Slug

`free` — referenced by `CaseLibraryEntry.appliesPatterns[]` on cases that exemplify this pattern.

# Free — AI skill page

## TL;DR

A pattern where **at least one customer segment continuously gets the
product for free**, and another segment or part of the business
covers the cost. Per *(BMG 2010)*, Free has **three structurally
distinct sub-types** — picking the right one is the whole game.

## Three sub-types

### Ad-supported
Free for one side; another side (advertisers) pays for access.
Mechanically a multi-sided platform with one side at zero. **Sister
pattern**: `multi-sided-platforms`. Examples: Google Search, free
metro newspapers, free TV, YouTube viewers.

### Freemium
Free tier + paid premium tier; ~5-10% of users convert to paid (the
canonical 1:9 ratio from *(Anderson 2009)*). Cross-subsidy is across
users *on the same platform*. Examples: Spotify, Skype (historic),
Dropbox, Slack.

### Bait and hook (lock-in)
Cheap or free upfront product locks the customer into expensive
recurring consumables. Cross-subsidy is *intertemporal* — cheap now,
expensive later. Examples: Gillette razors+blades (the urtype 1901),
HP printers+ink, Nespresso machines+capsules, mobile-phone subsidies.

## When this pattern applies (signals)

- BMC has at least two interdependent customer segments
- One revenue stream is zero (or near zero)
- The free side's marginal cost is near zero (digital goods, ad surface,
  or recoverable through hook margins)

## How to spot it from a BMC

- **Customer Segments**: 2+ groups OR 2+ pricing tiers of the same group.
- **Revenue Streams**: ONE stream is $0; the other(s) carry the model.
- **Value Propositions**: per side — "free product" + "advertisers buy
  attention" / "premium features" / "the consumable that locks them in".
- **Cost Structure**: marginal cost on the free side has to be near zero.

## Decision tree — which sub-type?

Ask: **Where does the revenue come from?**
- *From a different customer altogether* → ad-supported.
- *From the same customer, but a paying minority* → freemium.
- *From the same customer, but at a later time on a different SKU* → bait-and-hook.

## Anti-patterns

- ❌ Calling any "free trial" or "first month free" Free. Free here is
  *structural and permanent*, not a marketing tactic.
- ❌ Freemium with bait-and-hook economics. If a free user costs you
  real money per use (not amortised compute), freemium math doesn't
  work; you're in bait-and-hook territory and the upfront product
  needs to be designed to lock the customer in.
- ❌ Tagging a vertically-integrated retailer as Free because some of
  its products are loss-leaders. That's promotional pricing, not the
  pattern.

## Cross-references

- **`multi-sided-platforms`** — ad-supported Free is mechanically MSP.
  Cases like `google-multi-sided` apply both patterns; the case is
  tagged with both.
- **`long-tail`** — often co-exists with freemium (Spotify, Lulu).
- For non-Free contrast: `nintendo-wii` is MSP, not Free, because the
  hardware sells at a small profit; deliberately distinct from
  bait-and-hook descendants.

## How to act on it

When the user asks about a Free company:

1. `pingarden pattern get free` — read the example list and the
   sub-type breakdown.
2. **Identify the sub-type first**, before any BMC drafting. Walk the
   decision tree above. The wrong sub-type produces an incoherent
   BMC that fails differently than expected.
3. Walk the BMC of one of the sub-type's exemplar cases
   (`pingarden case get gillette` for bait-and-hook;
   `pingarden case get spotify` for freemium; `pingarden case get
   google-multi-sided` for ad-supported).
4. Note that ad-supported cases are usually also tagged
   `multi-sided-platforms` — the two patterns overlap structurally
   for this sub-type.

## Sub-types

This pattern has 3 structurally distinct sub-types — picking the right one is the whole game (walk the decision tree in `description.en.md`).

### Advertising-supported

Free for one customer side because another side (advertisers) pays for their attention. Mechanically a multi-sided platform with one side priced at zero — the BMC overlaps strongly with MSP.

**Examples**: `google-multi-sided` (primary)

### Freemium

Most users use a free tier; a small percentage (typically 5-10%) upgrades to a paid premium tier whose revenue covers the entire base. Cross-subsidy is across users on the same platform.

**Examples**: `spotify` (primary), `udemy` (secondary)

### Bait and hook (lock-in)

An initial product is sold cheaply (or given away — the bait) to lock the customer into expensive recurring consumables (the hook). Cross-subsidy is intertemporal — cheap now, expensive later.

**Examples**: `gillette` (primary), `nespresso` (secondary)


## Examples shipped in this skill

- `google-multi-sided` (primary)
- `spotify` (primary)
- `gillette` (primary)
- `nespresso` (primary)
- `udemy` (secondary)

To explore an example case's BMC, follow with `pingarden case get <slug>` → `pingarden case canvases <slug>` → `pingarden canvas describe <canvas-id> --json`.

## References

### Books

- **Anderson 2009** · *Chris Anderson · Free: The Future of a Radical Price · Hyperion* · 2009
  Book-length expansion. Coined the three flavors used in the BMC pattern catalog: cross-subsidies (ad-supported), freemium, and gift economies. Names the freemium 1:9 / 1:99 ratios that became canonical SaaS thinking.

- **BMG 2010** · *Osterwalder & Pigneur · Business Model Generation · Wiley* · 2010 · pp. 88–107
  Adapts Free into the BMC pattern catalog (Pattern No. 4). Splits the pattern into three structurally distinct sub-types — each gets its own paradigm case (Metro newspaper / Skype / Gillette razors).

### Articles

- **Anderson 2008 Wired** · *[Chris Anderson · 'Why $0.00 Is the Future of Business' · Wired](https://www.wired.com/2008/02/ff-free/)* · 2008 · Feb 2008 issue
  Wired feature that named the pattern. Argues falling marginal cost of digital goods makes 'free' a serious business strategy, not a marketing gimmick.
