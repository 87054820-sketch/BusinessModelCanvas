# How Google became 3-sided: AdWords (2000), AdSense (2003), and asymmetric pricing

When Larry Page and Sergey Brin launched Google in September 1998, the business model was an open question. The product — a search engine with dramatically better ranking via PageRank — was clearly valuable. The economics were not. The company tried several monetization paths in 1999-2000, including licensing search to portals (Yahoo) and selling search appliances to enterprises, before landing on the model that would define the next two decades.

## 2000 — AdWords: a 2-sided platform takes shape

In October 2000 Google launched **AdWords**, a self-service auction-based ad platform. The ads were small, text-only, clearly labeled, and shown alongside organic results based on a relevance + bid auction. Crucially, *searchers paid nothing* — they kept getting free, fast, broad search. *Advertisers paid* whenever a searcher clicked, at a price the auction set in real time.

This is the canonical 2-sided MSP shape. The searcher BMC and the advertiser BMC are different even though they describe the same platform:

::canvas[business-model-canvas]{variant="google-searchers"}

For searchers, Google's value proposition is *speed + relevance + breadth + free*. The Revenue Streams block is a single sticky: "$0 — searchers pay nothing." The platform is funded *by someone else paying for the searcher's attention*.

::canvas[business-model-canvas]{variant="google-advertisers"}

For advertisers, Google's value proposition is *reach searchers at the moment of intent*. The Revenue Streams block lists CPC auctions, CPM display, quality-score-modulated pricing, and a 2023 number that captures the scale: **$237 billion in advertising revenue**. That's the money side bearing the load. Notice the cross-side dependency (blue stickies): the searcher attention pool isn't an Asset Google produces — it's a side of the platform that has to keep showing up, and the searcher BMC's free experience is what keeps them showing up.

This asymmetry — searchers free, advertisers paying auction-clearing prices — is *(Eisenmann, Parker & Van Alstyne 2006)*'s 'subsidy side / money side' framing in its purest form. Charge the searchers and the searchers leave; charge the advertisers and they get an unmatched targeting product. The pricing direction is not arbitrary; the economics only work in this orientation.

## 2003 — AdSense adds a third side

The move that turned Google from a *very profitable 2-sided platform* into the textbook MSP came in 2003. **AdSense** let any website join the platform, paste a JavaScript snippet on its pages, and have Google serve ads from the *same auction* that powered AdWords — with the publisher keeping ~68% of the revenue.

::canvas[business-model-canvas]{variant="google-content-sites"}

For content sites, Google's value proposition is *monetize traffic without running an ad sales team*. Any indie blogger, recipe site, or mid-tail tech publisher could join, get auction-priced fill from the same advertiser pool that funded Google Search, and have payouts auto-deposited monthly. The cross-side dependency (blue stickies) here is *the advertiser side* — without advertisers willing to bid for relevance against AdSense inventory, publishers wouldn't have meaningful fill rates.

Notice: the same auction infrastructure now serves *two* publisher sides simultaneously. Google.com is one publisher (selling its own search-result inventory); AdSense sites are millions of other publishers (selling their inventory through the same auction). The advertiser pool sees both. The searcher / browser-app user sees ads on both. From the advertiser's perspective the platform is one bidding surface; from the platform's perspective it's been folded into a 3-sided shape that captures both Google's owned inventory and the entire long-tail of the open web.

## Why asymmetric pricing is the mechanism

Reading the three BMCs side by side makes the MSP pattern's mechanism legible:

- **Searchers** pay $0. They don't even know they're 'on a platform' — they're just using a fast search engine.
- **Advertisers** pay an auction-clearing price tied to conversion value. They are the money side that funds the platform.
- **Content sites** *receive* money rather than paying — the third side is paid by Google to be on the platform.

A naive 'one BMC' rendering of Google would mash all this together and the asymmetry would disappear into a confusing Revenue Streams block. The 3-BMC render keeps each side's economics legible. This is also the right pattern for teaching MSPs in general: *if your one BMC fits all 'sides', you don't have a multi-sided platform — you have segmented marketing*.

## Anti-patterns to watch

Google Search has been the textbook MSP for 25 years; the failure modes only became visible at scale:

- **Subsidy-side erosion.** As ad inventory expands above-the-fold and AI Overviews summarize results, searchers may decide the free experience isn't worth the friction — and a competing platform (DuckDuckGo, ChatGPT) can absorb the subsidy side. *(Eisenmann, Parker & Van Alstyne 2006)* called this *envelopment* — the dominant adjacent platform was prediction, not search, but the mechanism is the same.
- **Money-side antitrust.** When the money-side is concentrated and the auction becomes opaque, regulators step in. Google's 2024-2025 antitrust losses (US v. Google, EU adtech case) are the platform's money-side flexing back against the platform owner. We tag this on the BMC as a pink 'tension' sticky in Cost Structure.
- **Third-side disintermediation.** Content sites that built businesses on AdSense traffic discover that AI Overviews return answers without sending the user to the source — the third side's role gets squeezed. The 3-sided structure from 2003 may not survive 2025-2030 in its current form. The MSP pattern doesn't fail — it migrates.