# Free

> *In the Free pattern at least one substantial customer segment is
> able to continuously benefit from a free-of-charge offer. Different
> patterns make the free offer possible. Non-paying customers are
> financed by another part of the business model or by another
> customer segment.*
> — Osterwalder & Pigneur, *Business Model Generation*, p. 89  *(BMG 2010)*

## Why this pattern matters

Chris Anderson's 2008 *Wired* feature *(Anderson 2008 Wired)* and the
2009 book that followed *(Anderson 2009)* made a case that had become
true while no one was looking: digital goods have a marginal cost that
trends to zero, and so the price will too. "Free" stopped being a
marketing tactic ("first month free") and became a stable structural
choice ("the free tier is our acquisition engine forever"). What had
been a pricing trick in newspapers and razors for a century became a
template for an entire generation of internet businesses.

*Business Model Generation (BMG 2010)* canonicalises Free as Pattern
No. 4 in its catalog and makes a sharper claim than the book: there
isn't *one* Free pattern, there are **three structurally distinct
flavors**, each with its own BMC shape. Treating them as one opaque
strategy throws information away — what works for ad-supported (cross-
side subsidy) doesn't work for bait-and-hook (intertemporal subsidy)
and vice versa.

## Three sub-types of Free

The pattern has three sub-types. Each has a different *who pays for
the free side* answer.

### 1. Advertising-supported (Free as a multi-sided platform side)

The free side is *one side* of a multi-sided platform. Another side
— typically advertisers — pays the platform for access to the free
side's attention. Mechanically this is the same as the **Multi-Sided
Platforms** pattern with one side's price set to zero. The BMC has
the asymmetric pricing structure of an MSP (Customer Segments split
into "free side" and "paying side"; Revenue Streams concentrated on
the paying side).

**Paradigm**: free TV (1950s-2000s), free metro newspapers (Metro,
Heute), Google Search-side, YouTube viewer-side, Facebook user-side.

The trade-off: ad-supported platforms are vulnerable to **subsidy-
side erosion** (ad-blockers, AI summarisers reducing engagement) and
**envelopment** by adjacent platforms (Eisenmann et al. 2006 catalogues
this). When the subsidy side leaves, the money side leaves with it.

### 2. Freemium

The free tier is *the same product* as the paid tier; some features
or limits are paywalled. Anderson 2009 named the now-canonical
**1:9 / 1:99** ratios — roughly 5–10% of users convert to paid in
the typical case. The cross-subsidy is **across users on the same
platform**: the paying minority funds the free majority.

**Paradigm**: Skype (the BMG 2010 case, since absorbed by Microsoft),
Spotify, Dropbox, Slack, Notion, LinkedIn, every modern SaaS with a
free tier. The mechanics are different from ad-supported: there's
only *one* customer segment in the BMC, just two pricing tiers; the
Value Proposition is "you can use it for free; you can do *more* if
you pay".

The trade-off: **freemium dilution** — free-tier users consume support
and hosting capacity at scale; if conversion stays below ~3-5%, the
unit economics break. And the paid tier has to be visibly more
valuable than the free tier without making the free tier so weak it
fails as an acquisition engine.

### 3. Bait and hook (lock-in)

An initial product (the **bait**) is sold cheaply — sometimes at a
loss, sometimes given away — to lock the customer into expensive
recurring consumables or accessories (the **hook**) that only work
with the bait. The cross-subsidy is **intertemporal**: cheap now,
expensive later. The BMC has two distinct revenue streams (low/zero
upfront, high recurring) that *correlate at the customer level*.

**Paradigm**: King C. Gillette's 1901 razor handle + replacement blades
(the urtype). Modern descendants: HP printers + ink cartridges,
Nespresso machines + capsules, Kodak cameras + film, mobile phones
subsidised by 24-month contracts, console gaming (cheap console + per-
game royalties — though BMG categorises this as MSP, not Free).

The trade-off: **cheap-substitute risk**. Once the lock-in is visible,
third parties try to break it — generic blades, third-party Nespresso
capsules, refilled HP cartridges. The whole model depends on technical
or legal lock (Gillette's patents, Nespresso's pod geometry, mobile
SIM-locks) that competitors and regulators erode over time.

## What a Free BMC looks like

The signature blocks differ across sub-types — there is no single
"Free BMC". What *is* universal:

- **Customer Segments** — at least two, and they are *interdependent*.
  In ad-supported: free side + advertisers. In freemium: free tier +
  paid tier. In bait-and-hook: bait buyer = hook buyer, but they pay
  at different times.
- **Revenue Streams** — *one stream is zero* (or near-zero). The other
  stream(s) carry the entire model. Asymmetry is the mechanism.
- **Value Propositions** — typically one per segment. The free segment
  gets a real product (or an attention-monetisation surface); the
  paying segment gets either *more* of the same (freemium) or *the
  thing the free side enables* (advertisers buying attention).
- **Cost Structure** — the free side's marginal cost has to be near
  zero. Print-on-demand books fail freemium economics if every free
  download triggers a printed shipment. SaaS works because the free
  tier costs ~$0.10/user-month in compute. Bait-and-hook works only
  if the bait's marginal cost is recoverable through hook margins.

## Concrete examples

**Ad-supported** (mechanically MSPs — see also `multi-sided-platforms`):

- **Google Search** — searchers free, advertisers pay. See
  `google-multi-sided` in this library; the searchers BMC is the
  ad-supported sub-type made concrete.
- **Free metro newspapers** (Metro, Heute, the original 1995 Stockholm
  edition) — readers free, advertisers pay; physical newspaper
  distributed to commuters in subway stations.
- **Free TV** (NBC/CBS/ABC era) — viewers free, advertisers pay.
  Streaming is killing the distribution but not the pattern (Roku,
  Pluto TV, Tubi).
- **YouTube, Facebook, X** — users free, advertisers pay.

**Freemium**:

- **Spotify** — the case we go deep on. ~250M free MAU + ~250M paying
  Premium subs at €10.99/mo. Free tier includes ads but is otherwise
  the full catalog; Premium removes ads + adds offline + higher
  bitrate. Anderson 2009's 1:9 freemium ratio shows up almost
  exactly in their MAU mix.
- **Skype** *(BMG 2010)* — the book's paradigm freemium case. Free
  Skype-to-Skype calls; paid SkypeOut to landlines. Acquired by
  Microsoft 2011, sunset 2025.
- **Dropbox / Slack / Notion / Figma / LinkedIn** — every modern
  productivity SaaS with a free tier. The 1:9 conversion ratio is
  the planning baseline.
- **Udemy** — partly freemium (free courses funnel to paid courses
  and to Udemy Business). See `udemy` in the library — it's
  primarily MSP, secondarily freemium.

**Bait and hook**:

- **Gillette razors and blades** — the urtype. See `gillette` in this
  library; the BMC contrast (cheap razor + expensive blades) is the
  template every successor copies.
- **HP printers and ink** — printer at a loss, ink cartridges at
  notorious markups. The most commonly cited modern descendant.
- **Nespresso machines and capsules** — machine subsidised, capsules
  high-margin and pod-geometry locked.
- **Mobile phone subsidies** (the 24-month contract model) — handset
  subsidised at the moment of purchase, recovered through monthly
  service fees that wouldn't be sustainable without the subsidy
  upfront.
- **Game consoles** — sometimes Free's bait-and-hook (sold at a loss),
  sometimes MSP (Wii sold at a small profit). See `nintendo-wii` for
  the MSP variant.

## What goes wrong

Different failure modes per sub-type — the symptoms tell you which
sub-type your model actually is:

- **Subsidy-side erosion (ad-supported).** Ad-blockers, regulatory
  pushback on tracking, AI summarisers eating engagement. Once the
  free side's attention is harder to monetise, the entire model
  breaks. Newspapers, free TV, and now Google Search are all in
  different stages of this.
- **Freemium dilution.** Conversion stays below 3-5%, the free tier
  becomes a permanent cost centre. Common when the paid tier isn't
  visibly more valuable, or when the free tier is so generous it
  consumes the paid tier's reason to exist.
- **Cheap-substitute attack (bait-and-hook).** Generic blades, third-
  party Nespresso capsules, refilled HP cartridges, jailbroken
  consoles. Once the lock-in becomes obvious, competitors and
  regulators chip at it. The pattern only works as long as the lock
  holds.
- **Mistaking sub-types.** Charging the free side a "small fee" turns
  ad-supported into a 2-sided paid-paid model — the asymmetry that
  makes Free work disappears. Building bait-and-hook with no real
  hook (free coffee at a coffee shop, then the customer leaves) just
  means you gave away the bait.

## Read the examples

Five cases ship in the library across the three sub-types. Read them
in this order to see the mechanism:

- **`gillette`** — primary, *bait-and-hook*. The 1901 urtype. Two
  BMCs: razors-bait + blades-hook. Read first to see Free in its
  cleanest non-digital form.
- **`spotify`** — primary, *freemium*. Three BMCs: traditional music
  industry archetype + spotify-free + spotify-premium. Anderson 2009's
  1:9 ratio in the wild.
- **`google-multi-sided`** — primary, *ad-supported*. Already in the
  library as the MSP marquee case; the searchers BMC is the
  ad-supported Free sub-type made concrete.
- **`udemy`** — secondary, *freemium-leaning*. Mainly an MSP; some
  free courses funnel to paid.
- **`nintendo-wii`** — *not* tagged as Free in this library, but
  worth reading for contrast: the Wii is Multi-Sided, not Free,
  because hardware sells at a small profit (not at a loss). The
  GameCube-era loss-leader hardware *was* bait-and-hook Free; the
  Wii deliberately moved out of it.
