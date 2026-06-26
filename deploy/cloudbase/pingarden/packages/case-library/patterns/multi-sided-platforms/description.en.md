# Multi-Sided Platforms

> *Multi-sided platforms bring together two or more distinct but
> interdependent groups of customers. Such platforms are of value to
> one group of customers only if the other groups of customers are
> also present.*
> — Osterwalder & Pigneur, *Business Model Generation*, p. 77  *(BMG 2010)*

## Why this pattern matters

The pattern is older than the language used to describe it. Newspapers
in the 19th century already ran a two-sided business — they served
readers (cheap) and advertisers (expensive), and neither group would
have shown up alone. Credit cards in the 1950s formalised it: Visa
needs cardholders to attract merchants, and merchants to attract
cardholders. But it took until the 21st century for the economics to
be cleanly named.

Jean-Charles Rochet and Jean Tirole's 2003 paper *(Rochet & Tirole 2003)*
gave the canonical formalisation: a platform serves two sides, the
sides exhibit **cross-side network effects** (more buyers = more value
to sellers, and vice versa), and the platform's pricing is
*asymmetric* — typically one side is heavily subsidised while the
other side pays. Three years later, Eisenmann, Parker, and Van Alstyne
*(Eisenmann, Parker & Van Alstyne 2006)* translated it into manager
language: pick the **subsidy side** (the side that's more
price-sensitive, or that the other side wants more) and the **money
side** carefully — get it wrong and your platform never ignites.

*Business Model Generation (BMG 2010)* canonicalises MSP as Pattern
No. 3, illustrating it with two paradigm cases: **Google** (a 3-sided
platform: searchers + advertisers + content sites) and **Nintendo
Wii** (gamers + game developers). The defining characteristic of the
pattern is that the BMC has *multiple Customer Segments that are not
substitutes for each other* — they are interdependent demand groups
the platform must keep balanced.

## What an MSP BMC looks like

The dominant elements on a Business Model Canvas:

- **Customer Segments** — two or more distinct, *interdependent* groups.
  Buyers and sellers, gamers and developers, searchers and advertisers,
  cardholders and merchants. They are not the same customer wearing
  different hats; they are different demand groups that need each
  other.
- **Value Propositions** — typically *one per side*. The value to
  searchers is "find what you want fast"; the value to advertisers is
  "buy attention from people about to convert"; the value to content
  sites is "monetize traffic without selling ads yourself". Three
  different value props, one platform.
- **Revenue Streams** — *asymmetric across sides*. The subsidised
  side often pays nothing or very little; the money side bears the
  revenue load. Visa cardholders pay no fee per swipe; merchants pay
  ~2-3% interchange. Google searchers pay nothing; advertisers pay
  per click in an auction. Asymmetric pricing is not a bug, it's the
  mechanism — without it the platform doesn't ignite.
- **Key Resources** — **the platform itself**: the search index, the
  payment network, the marketplace listings, the app store catalog.
  Plus the user base on each side, which is the other side's reason
  to show up.
- **Key Activities** — onboarding both sides, matching them
  (search/recommendation/auction), enforcing trust (fraud, ratings,
  moderation), maintaining the platform infrastructure.
- **Cost Structure** — heavy upfront investment to bring the
  subsidised side to scale, then operational leverage as the money
  side pays for it. The pre-ignition phase is famously expensive
  because nothing converts until both sides are present.

## Concrete examples

- **Google** — the case we go deep on. 3-sided platform: searchers
  (free), advertisers (auction-priced via Google Ads), content sites
  (revenue share via AdSense). The pivot from 2-sided (AdWords 2000)
  to 3-sided (AdSense 2003) is what made Google's economics work at
  scale.
- **Visa / Mastercard** — the urtype. Cardholders subsidised (often
  rewarded with cashback / miles), merchants pay interchange. Without
  this asymmetry no one would carry a card, and no one would accept
  one.
- **Nintendo Wii** — *(BMG 2010)*'s second paradigm case. Gamers buy
  the console at a low margin (sometimes a loss); game developers pay
  licensing fees. The Wii's success came from explicitly subsidising
  the gamer side (cheaper console) to attract the casual gaming
  audience that PlayStation and Xbox were ignoring.
- **Apple App Store** — users subsidised (the device + the store
  itself are free); developers pay 15-30% commission. Apple's choice
  to keep the user side cheap is what made the developer side profitable.
- **eBay / Amazon Marketplace / AliExpress** — buyers subsidised
  (free to browse, free to buy); sellers pay listing/transaction fees.
  Our `aliexpress` library case shows this from Alibaba's
  cross-border angle.
- **Udemy** — students + instructors. The platform takes a
  ~37%–63% cut of course revenue depending on attribution, with the
  instructor doing the production work. See `udemy` in the library.
- **LinkedIn** — 3-sided: members (free), recruiters
  (subscription-priced), advertisers (auction-priced).

Multi-sidedness can co-exist with other patterns — `lulu-com` and
`lego-long-tail` are both Long Tail AND MSP (each has authors / fan
designers as one side and readers / buyers as the other).

## What goes wrong

- **Chicken-and-egg ignition failure.** No advertisers because no
  searchers; no searchers because no relevant ads. Most platforms die
  in the first 6-18 months because neither side wants to show up
  first. Eisenmann et al. *(Eisenmann, Parker & Van Alstyne 2006)*
  call this the platform launch problem; common solutions are *bait
  the subsidy side* (free product, subsidised event, seeded content)
  or *pre-commit the money side* (anchor advertiser, exclusive
  retailer).
- **Pricing the wrong side.** Charging the subsidy side breaks the
  flywheel — fewer of them show up, the other side leaves too. The
  Wii's predecessor, the GameCube, charged gamers full price for the
  console; the cycle never compounded.
- **Envelopment by an adjacent platform.** A bigger platform with one
  shared customer side absorbs your platform "for free" and your
  business evaporates — eg. AOL Mail enveloped by Gmail; standalone
  music players enveloped by smartphones. *(Eisenmann, Parker & Van
  Alstyne 2006)* devotes a section to envelopment defense.
- **Confusing a marketplace for an MSP.** A vertically-integrated
  retailer that buys inventory and sells to customers is *one-sided*
  even if the customers are diverse. Carvana, Patagonia, and most
  of `cainiao` (Alibaba's logistics arm) are NOT MSPs — they have
  a single customer side. Tagging them as MSP would weaken the
  taxonomy.

## Read the examples

Seven cases in the library exemplify this pattern, four at the
*platform-defining* end and three at the *platform-as-one-of-many-tags*
end. Read them in this order if you're new to MSPs — the older,
non-tech examples make the digital ones legible:

- **`visa`** — primary, *non-tech original*. The urtype MSP, before the
  language existed. Two BMCs (cardholders + merchants); shows asymmetric
  pricing in a familiar form. Read this *first* if you've only seen
  digital MSPs before.
- **`nintendo-wii`** — primary, BMG's second paradigm case. Two BMCs
  (gamers + game developers); shows the subsidy-side selection trade-off
  the GameCube and PS3 got wrong.
- **`google-multi-sided`** — primary, the marquee digital MSP. Three BMCs
  from each side's perspective (searchers, advertisers, content sites) —
  the cleanest way to teach asymmetric pricing in a 3-sided platform.
- **`udemy`** — primary. Two-sided edtech marketplace; students +
  instructors with revenue share.
- **`aliexpress`** — primary. Two-sided cross-border commerce; buyers
  + sellers, transaction-fee revenue.
- **`lulu-com`** — secondary. Long Tail + MSP; authors + readers
  with print-on-demand.
- **`lego-long-tail`** — secondary. The LEGO Ideas variant is MSP
  (designers + voters + buyers); the canonical LEGO toy business is
  one-sided.
