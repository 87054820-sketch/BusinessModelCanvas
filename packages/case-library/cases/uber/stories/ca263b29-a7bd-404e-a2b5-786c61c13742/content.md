# Uber 2009-2019: blitzscaled multi-sided platform with surge pricing

Garrett Camp registered the domain UberCab.com in 2009 after a frustrating night trying to find a taxi in Paris with Travis Kalanick. The original product was a black-car service for San-Francisco tech executives — a small, expensive niche. The decision that turned Uber into a $75B company was the **2012 launch of UberX**: opening the platform to peer-to-peer drivers in their own cars (not just licensed black-car operators), at prices below traditional taxi fares. The peer-to-peer move flipped Uber from a luxury service into a textbook two-sided platform.

## Two BMCs because the asymmetry IS the model

*Business Model Generation (BMG 2010)* uses the multi-sided-platforms pattern (No. 3, pp. 76-81) — Uber post-2012 is its archetypal modern instance. The reason this case (like Visa, Google, Nintendo, P&G's Connect & Develop, and InnoCentive in this library) is taught with two BMCs is the same: **the asymmetric pricing between sides IS the model**. Mashing rider-side and driver-side into one BMC hides surge pricing, the negative cash conversion mechanic, and the platform-vs-supplier tension that define how Uber actually works.

::canvas[business-model-canvas]{variant="uber-riders"}

The rider BMC reads as a clean tap-and-go consumer experience. Notice the `Revenue Streams` block: per-ride fare, surge pricing, tier upsell, and the most distinctive sticky — **Negative cash conversion (collect now, pay later)**. Riders pay Uber instantly via card-on-file; Uber pays drivers on a delay (typically weekly). At Uber's scale that delay is a multi-hundred-million-dollar float that grows with volume. This is the financial mechanic that lets Uber blitzscale globally without needing matching working-capital lines — growth IS the funding source.

The pink stickies in `Cost Structure` and `Key Activities` mark the model's friction: regulatory defense per-city (the model's existence depends on local-government tolerance) and surge-pricing PR backlash (riders treat 3x surge as price-gouging when it kicks in during snowstorms or terror events).

::canvas[business-model-canvas]{variant="uber-drivers"}

The driver BMC reads inverted: drivers RECEIVE rather than pay. The blue sticky in `Revenue Streams` — *(Driver side: drivers RECEIVE 70-85% of fare)* — is the cross-side flow that makes the asymmetry visible. Uber's own revenue is the 15-30% commission. The pink stickies cluster around **worker-classification disputes** — the structural legal risk that has shaped Uber's regulatory life since 2014.

## The blitzscaling decade

*(Hoffman & Yeh 2018)* uses Uber as the worked blitzscaling example: prioritise speed of growth over efficiency or unit economics, on the bet that network effects and brand will compound into a moat. By 2018 Uber was operating in 70+ countries with hundreds of millions of riders. Three things were doing the work:

- **Negative cash conversion as growth funding.** As volume grew, the float grew. Combined with ~$25B raised across multiple rounds, Uber outspent every regional competitor (Lyft in the US, Didi in China, Ola in India, GoJek/Grab in SEA) — until it didn't. The 2016 China retreat (selling Chinese ops to Didi for ~$7B equity stake) showed the limits.
- **Driver-side network density.** Pickup time is the rider value-prop, and pickup time is a function of driver density per square mile. Uber's strategy was always to subsidise driver-side onboarding hard (sign-on bonuses, hourly guarantees during the first weeks) so the rider experience hit <5-min pickup ASAP in each new city.
- **Surge pricing as supply-clearing mechanism.** Surge does two things at once: it dampens demand at peak (riders self-select out at 3x) and it pulls more drivers onto the road (Uber pushes notifications saying "surge active in zone X — log on for higher earnings"). Both lever the supply-demand match in real time.

## Sub-businesses as cross-side leverage

The insight that turned Uber from a single-vertical platform into a multi-vertical operating system: **the same dispatch + payments + driver-network infrastructure can power any time-sensitive two-sided market**. Three big launches:

- **Uber Eats (2014)** — restaurant + driver + diner three-sided. Reuses driver network; reuses payments; reuses dispatch. By 2024 Eats accounts for ~30% of Uber group revenue.
- **Uber Freight (2017)** — shipper + driver two-sided for trucking. Different asset class (semi-trucks not cars) but same matching mechanic. Spun off into a separate public company 2022.
- **Uber Health (2018)** — healthcare provider + driver + patient. Non-emergency medical transport with HIPAA-compliant tooling layered on top.

Each of these is a different `Customer Segments` axis on the parent platform. The main Uber rides BMC stays the same; what's reused is everything below the value-prop layer.

## What goes wrong (and what Uber did)

The BMG MSP pattern's three classical failure modes — **chicken-and-egg cold start**, **multi-homing erosion**, and **regulator pushback** — all hit Uber:

- **Cold start in each new city.** Subsidise driver-side first (so rider experience is good), then subsidise rider-side (free first ride). Repeat across 70+ countries. The cold-start cost per city in the early 2010s was ~$2-5M before the city flipped to profitable on a contribution-margin basis. Uber paid this cost ~600 times.
- **Multi-homing erosion.** Drivers run Uber AND Lyft AND DoorDash on three phones; riders compare Uber and Lyft fares before booking. The MSP "winner-takes-most" lock-in didn't materialise — both sides multi-home easily, which is why margin compression has been persistent.
- **Regulator pushback.** Surge pricing during the 2014 Sydney hostage crisis (auto-surge during evacuation) caused the first major PR crisis. Worker-classification suits (California AB5 2019, UK Supreme Court 2021, EU Platform Workers Directive 2024) are the ongoing structural cost — and the industry's political question of the 2020s.

## Why this case sits next to Airbnb, Visa, Google, and Nintendo

Uber is one of five 'classic' MSP cases the library carries. Read them together:

- **`uber`** — pure two-sided, time-sensitive (rides), strong yield-management (surge) component
- **`airbnb`** — pure two-sided, peer-to-peer, weaker yield-management but much higher LTV per booking
- **`visa`** — three-sided (cardholders + merchants + issuing banks + network), 70-year-old archetype
- **`google-multi-sided`** — three-sided ad-supported (searchers + advertisers + content sites)
- **`nintendo-wii`** — two-sided console (gamers + developers), royalty-on-content economics

Different sub-flavors of the same pattern. Reading Uber alongside Airbnb makes the rider-side-vs-driver-side asymmetry click via comparison; reading it alongside Visa shows what an MSP looks like when both sides have multi-decade lock-in (the opposite of Uber's multi-homing problem).