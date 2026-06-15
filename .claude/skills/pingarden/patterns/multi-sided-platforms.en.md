# Multi-Sided Platforms

> A platform that brings together two or more distinct but interdependent groups of customers. Value is created only when all sides are present, and pricing is typically asymmetric — one side is subsidised so the other side will show up. Search engines, payment networks, marketplaces, app stores, gaming consoles all run this pattern.

## Slug

`multi-sided-platforms` — referenced by `CaseLibraryEntry.appliesPatterns[]` on cases that exemplify this pattern.

# Multi-Sided Platforms — AI skill page

## TL;DR

A platform serving **two or more distinct, interdependent customer
groups**. Value emerges only when all sides are present
(cross-side network effects). Pricing is asymmetric — typically one
side is subsidised so the other will show up. Origin: Rochet & Tirole
2003 → Eisenmann/Parker/Van Alstyne 2006 (HBR) → BMG 2010 Pattern No. 3.

## When this pattern applies (signals)

- The BMC has **two or more Customer Segments that are not substitutes
  for each other** — they are interdependent demand groups.
- More of one side increases value to the other side
  (cross-side network effects).
- Revenue is asymmetric across sides — one side subsidised, another
  paying.
- The platform connects rather than producing — it has a search /
  recommendation / matching layer plus trust + payments
  infrastructure.

## How to spot it from a BMC

- **Customer Segments**: 2+ groups, listed separately. If your BMC's
  Customer Segments are all substitutes (different demographics
  buying the same thing), it's NOT MSP — it's a single-sided business
  with segmented marketing.
- **Value Propositions**: roughly one per side, and the value depends
  on the other side being there ("buy attention from converting
  searchers" → only valuable if there are searchers).
- **Revenue Streams**: asymmetric pricing — the subsidy side pays
  little or nothing, the money side bears revenue.
- **Key Resources**: the platform itself (index / catalog / matching
  algorithm / payment rails) plus the user base on each side.

## Anti-patterns

- ❌ Tagging a vertically-integrated retailer as MSP. Carvana,
  Patagonia, most of Cainiao are single-sided even when their
  customers are diverse.
- ❌ Misreading market segmentation as multi-sidedness. Different
  age groups buying the same product = segmented marketing, not MSP.
- ❌ Charging the subsidy side. Breaks the flywheel before it
  ignites.
- ❌ Ignoring envelopment risk. A bigger adjacent platform with a
  shared customer side can absorb the subsidy side and your money
  side leaves with them.

## Cross-references

- **Long Tail** often co-exists with MSP (eBay, YouTube, Lulu.com,
  LEGO Ideas — both creator and consumer sides + long catalogs).
- **Free** business models are essentially MSPs where the subsidy
  side pays nothing — Google's searcher side is a Free side.
- For a contrast in the case library, compare MSP's "two sides each
  pay differently" with **Unbundling**'s "one corporation contains
  three businesses" — both attack a vertically-integrated incumbent
  but along different axes.

## How to act on it

When the user asks about a Multi-Sided company:

1. `pingarden pattern get multi-sided-platforms` — read the example
   list and the concise description here.
2. Walk the BMC of one of its examples
   (`pingarden case get google-multi-sided`,
   `pingarden case canvases google-multi-sided`,
   `pingarden canvas describe <id> --json`).
3. If the user wants an MSP BMC of *their* idea, explicitly confirm
   they have **two or more interdependent customer groups**. If they
   only have one, don't force the pattern.
4. Then identify subsidy side vs money side, the chicken-and-egg
   ignition strategy, and the envelopment risk before drafting
   blocks.

## Examples shipped in this skill

- `google-multi-sided` (primary)
- `visa` (primary)
- `nintendo-wii` (primary)
- `uber` (primary)
- `airbnb` (primary)
- `udemy` (primary)
- `aliexpress` (primary)
- `alibaba-group` (secondary)
- `cainiao` (secondary)
- `lulu-com` (secondary)
- `lego-long-tail` (secondary)

To explore an example case's BMC, follow with `pingarden case get <slug>` → `pingarden case canvases <slug>` → `pingarden canvas describe <canvas-id> --json`.

## References

### Books

- **BMG 2010** · *Osterwalder & Pigneur · Business Model Generation · Wiley* · 2010 · pp. 76–81
  Adapts MSP into the BMC pattern catalog (Pattern No. 3). Featured paradigm cases: Google (3-sided: searchers + advertisers + content sites) and Wii (gamers + game developers).

### Papers

- **Rochet & Tirole 2003** · *[Jean-Charles Rochet & Jean Tirole · 'Platform Competition in Two-Sided Markets' · Journal of the European Economic Association](https://doi.org/10.1162/154247603322493212)* · 2003 · vol. 1, no. 4, pp. 990–1029
  Originating economics paper. Formalises pricing in two-sided markets and the role of cross-side network effects. Tirole later won the 2014 Nobel for related work.

- **Eisenmann, Parker & Van Alstyne 2006** · *[Thomas Eisenmann, Geoffrey Parker & Marshall Van Alstyne · 'Strategies for Two-Sided Markets' · Harvard Business Review](https://hbr.org/2006/10/strategies-for-two-sided-markets)* · 2006 · Oct 2006 issue
  Manager-friendly translation of the academic theory. Introduces the 'subsidy side / money side' framing, the chicken-and-egg ignition problem, and platform envelopment risk.
