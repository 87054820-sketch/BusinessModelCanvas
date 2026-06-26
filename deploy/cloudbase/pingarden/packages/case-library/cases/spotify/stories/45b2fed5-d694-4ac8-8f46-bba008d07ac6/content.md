# Spotify and the canonical 1:9 freemium ratio

In the mid-2000s the music industry was bleeding. CD sales had peaked in 1999; the iTunes Music Store launched in 2003 with $0.99 per track but never recovered the per-listener revenue of the CD era; Napster, Limewire, and BitTorrent had taught a generation that music online was effectively free whether the labels liked it or not.

Spotify launched in Sweden in October 2008 with a different proposition: don't try to charge for ownership of tracks; charge for *access* to a catalog. And — the key move — *give the access away free* to most users, monetise the heavy users via subscription, and pay the labels a per-listen royalty out of the revenue pool.

## The traditional industry baseline

::canvas[business-model-canvas]{variant="traditional-music-industry"}

The BMC of the traditional music business — CDs, then iTunes — looks like a single-sided ownership-transfer model. Customer Segments: people willing to pay $15-20 per album or $0.99 per track. Revenue Streams: per-purchase. Customer Relationships: "transactional, no ongoing relationship". The pink stickies mark exactly where the model broke: a Customer Segment for "pirate downloads" that the industry could only treat as litigation cost, not as a customer in the BMC sense.

The industry's response in 2003-2008 was iTunes — same model in a digital wrapper, just at smaller per-track unit prices. Spotify's bet was that the *unit of payment* (the track or album) was the wrong abstraction; *time* was right.

## Two BMCs, one platform — the freemium move

The Spotify model is sometimes described as one BMC. It really shouldn't be — the asymmetry between the free tier and the paid tier is the whole story, and forcing them into one canvas hides the mechanism. Two BMCs, side by side, make it legible.

::canvas[business-model-canvas]{variant="spotify-free"}

For the free user, Spotify is a *full music catalog with periodic audio ads*. Mobile is shuffle-only, no downloads. The Revenue Streams block leads with `$0 from the free user` — the entire revenue from this side comes from advertisers (cross-side dependency, blue stickies). Friction stickies (pink) are deliberate: "Shuffle-only on mobile", "Audio ads every 15-30 minutes", "Constant Premium upgrade prompts" — *Spotify is making the free experience just inferior enough to push conversion*. This is the Eisenmann-style subsidy-side calibration: too generous and conversion dies; too restricted and the free tier fails as an acquisition engine.

::canvas[business-model-canvas]{variant="spotify-premium"}

For Premium subscribers, Spotify is the *same catalog, no ads, on-demand mobile, offline, higher bitrate*. €10.99/mo individual, with Family, Duo, and Student tiers. The Revenue Streams block has a single sticky that captures the freemium economics: `88% of total Spotify revenue`. Premium is the money side; it's funding everything.

The cross-side dependency on the Premium BMC is *the free tier as conversion funnel* (blue sticky). Spotify can't acquire 250M paying subs without the 250M free MAU above them. The free side and the paid side don't compete for users — the free side *creates* the paid side.

## Why this is canonical Freemium

Anderson 2009 named the canonical 1:9 / 1:99 freemium ratio — roughly 5-10% of users convert to paid. Spotify's actual mix as of 2024 is *almost exactly* 1:1 (250M Premium : 250M ad-supported MAU) — far better than the canonical 1:9 — and that's after years of converting heavy users. In the early years (2008-2012) the ratio was much closer to Anderson's prediction.

The reason Spotify could push past 1:9 to 1:1 is that the free tier was designed with deliberate friction, the Premium tier was designed with concrete value (offline + on-demand + no ads), and the platform's switching cost is high (your playlists, your Discover Weekly, your library follow you). All three are levers; freemium models that don't pull them all stick at lower conversion rates.

## What goes wrong

Spotify's failures and risks are textbook freemium failures:

- **Royalty payout pressure** — ~70% of revenue goes back to labels and rightsholders. The remaining ~30% has to cover all of streaming infrastructure, recommendation ML, marketing, the App Store / Play 30% cut, and the (sometimes negative) free-tier per-user economics. Spotify's path to profitability has been narrow for 15+ years.
- **App-store envelopment risk** — Apple and Google take 30% of in-app subscriptions purchased through their stores. Spotify has lobbied and litigated against this for years. If a regulator reduces the cut (EU's DMA forced concessions in 2024), Spotify's net margin improves materially; if Apple Music keeps undercutting Spotify on Apple devices, the inverse happens.
- **AI / generative-music risk** — if AI-generated music becomes indistinguishable from human music for casual listening, the catalog's value (and the labels' negotiating leverage) drops. Spotify has been quietly seeding AI-generated playlists that don't pay royalties.

## Why this case sits next to Gillette in the library

Gillette is the *bait-and-hook* sub-type of Free; Spotify is the *freemium* sub-type. Read together they make the three sub-types of Free legible: bait-and-hook subsidises across *time* (cheap razor → expensive blades), freemium subsidises across *users* (free majority → paying minority), ad-supported subsidises across *sides* (free user → paying advertiser). Same pattern label, three structurally different mechanisms — and the right one for any given idea depends on where the user thinks the revenue is going to come from.