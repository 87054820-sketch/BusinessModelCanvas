# Visa: the urtype multi-sided platform, before the language existed

The word 'platform' didn't get applied to Visa until decades after Visa was running. Bank of America launched **BankAmericard** in 1958 in Fresno, California — drop-shipping 60,000 unsolicited credit cards on residents and signing up local merchants door-by-door. By the time Rochet & Tirole gave the formal economics of two-sided markets in 2003 and BMG canonicalised the pattern in 2010, Visa had been running it cleanly for 45 years.

## Same platform, two BMCs

The canonical MSP move is to render the platform from each side's perspective rather than mash them into one canvas:

::canvas[business-model-canvas]{variant="visa-cardholders"}

For cardholders, Visa's value proposition is *acceptance everywhere, free at point of sale, often rewarded*. The Revenue Streams block leads with `$0 per transaction to cardholder`. This is the canonical subsidy side — Visa survives on cardholders showing up, not on charging them.

::canvas[business-model-canvas]{variant="visa-merchants"}

For merchants, the same platform looks completely different. Value proposition: *accept ~4.5 billion cards globally*. Revenue Streams: 1.5-3% interchange per transaction; ~$36B in 2024 net revenue. This is the money side. Notice the friction stickies (pink): network rules and chargeback regime push back on merchants, and `No real ability to refuse Visa` is a reluctant stick — once consumers carry the card, merchants effectively can't decline. This is *(Eisenmann, Parker & Van Alstyne 2006)*'s 'lock-in via the subsidy side' — Visa controls merchants by controlling cardholders.

## Why the asymmetry is the mechanism

If you tried to charge cardholders per swipe, they'd switch to cash or to a competitor that didn't. If you charged merchants nothing, the network couldn't fund authorization, fraud, settlement, brand, or rewards. The 1.5-3% interchange isn't a markup; it's the cost of running a network that has to keep both sides showing up. **Asymmetric pricing isn't a strategy choice — it's the mechanism the pattern requires to function.**

## What goes wrong

Visa's vulnerabilities are textbook MSP vulnerabilities, just at a 60-year scale:

- **Money-side regulatory pushback.** Interchange caps (Durbin Amendment 2010 in the US, EU 2015 caps) are merchants using government to fight back against pricing they can't refuse. Modeled here as a pink sticky in `Cost Structure: Antitrust + regulatory defense`.
- **Subsidy-side envelopment.** Mobile wallets (Apple Pay, Google Pay) sit *on top of* Visa rails today, but the wallet brand owns the cardholder relationship — and a wallet that decides to ride a different rail (account-to-account, stablecoins) takes the cardholder side with it. *(Eisenmann, Parker & Van Alstyne 2006)*'s envelopment risk in real time.
- **Mid-side disintermediation.** Buy-now-pay-later, A2A bank rails (Pix in Brazil, UPI in India), and stablecoins are alternative rails competing for the merchant's preference at checkout. They don't have Visa's universal acceptance yet; in jurisdictions where the regulator pushes a domestic rail (Pix), they get it for free.

## Why this case is in the library

Visa is the prior the digital MSP cases (Google, Udemy, AliExpress) build on. Walking the cardholder + merchant BMCs side by side first — *before* opening the Google case's three BMCs — is the cleanest way to teach the pattern, because Visa shows the asymmetric pricing mechanism in a familiar, tangible form. Once you've seen it as 'cardholders subsidised, merchants pay interchange', recognising it again as 'searchers subsidised, advertisers pay auction-clearing prices' becomes obvious.