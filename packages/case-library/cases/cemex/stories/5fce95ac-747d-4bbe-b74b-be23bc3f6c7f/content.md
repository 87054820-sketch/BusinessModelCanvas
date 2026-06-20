# Cemex 1985-2014: cement as a service, not a commodity

In 1985 Lorenzo Zambrano took over as CEO of Cemex, then a regional Mexican cement company. By 2014 — when he died unexpectedly — Cemex was the world's #3 cement producer and the #1 ready-mix concrete producer, present in 50+ countries. The case is famous in business-model literature for one specific reason: **Zambrano refused to compete on the cement product** (a near-perfect commodity, identical chemistry across producers) and instead competed on **delivering the cement on time**. Adrian Slywotzky's *The Profit Zone* (1997) used Cemex as the worked example of how a commodity producer can move up the value stack via the *delivery service*.

## One BMC because the story is the service overlay

::canvas[business-model-canvas]{canvasId="1c635f3d-0044-4324-a7e8-e6e91ddc23ea"}

Unlike the multi-sided cases in this library (Uber, Airbnb, Visa, Google, etc.), Cemex is shown with ONE BMC. It's not a multi-sided platform; it's a single-side commodity manufacturer that *built a service moat around the commodity*. The interesting visual:

- **Value Propositions** has the commodity baseline as one yellow sticky (*Cement + ready-mix concrete*) but the *service-overlay* propositions are blue: **GUARANTEED 20-minute delivery window**, **On-time = no construction-crew idle time**, **Construrama single-brand supply chain**, **Multi-product procurement**. These blue stickies are what's actually being sold; the cement is just the carrier.
- **Key Resources** anchors on three blue stickies: *Dispatch + telematics IT*, *Construrama retailer network*, and *Brand reputation for on-time delivery*. Without these the BMC collapses to 'another regional cement producer'.
- **Channels** features GPS-tracked truck dispatch alongside conventional sales channels — the delivery experience itself is a channel.
- **Customer Relationships** has *Service-level commitments (20-min window, fines)* — Cemex pays the customer if it misses its delivery window. That's a commodity producer treating itself like a service business.

## The Jobs-To-Be-Done reframing

The key analytical move was reframing what the customer was hiring concrete for. The naive view: 'I'm a contractor, I need concrete'. The Cemex reframing: 'I'm a contractor with a 20-person crew on-site at $X per hour. The crew needs concrete to keep working. If concrete arrives late, I pay 20 people to stand around. If it arrives early, the truck blocks the site. **What I'm actually hiring is on-site concrete arriving exactly when my crew is ready to pour it**'.

This is the textbook Jobs-To-Be-Done reframing — Christensen et al. would later codify the concept formally in *Competing Against Luck* (2016), but Cemex was already doing it operationally in the early 1990s. Once the customer's job is reframed, the entire BMC's value-extraction layer shifts. Concrete by the tonne is a commodity. *On-time delivery of concrete by the tonne* is a service that supports a 20-30% premium price.

The pieces that made the 20-minute window real were operational, not strategic:

- **GPS-tracked truck fleet** (early 1990s) — Cemex was one of the first industrial fleets to deploy GPS.
- **Dispatch optimisation algorithms** modelled on FedEx + airline-yield-management techniques — Zambrano famously sent his ops team to study FedEx's Memphis hub before redesigning Cemex's Mexican dispatch.
- **Driver training + incentive structure** — drivers earned bonuses for on-time arrivals + customer feedback. Standard now, novel in commodity logistics in 1995.
- **Telematics + radio dispatch** integrated with site-readiness signals — drivers wouldn't be dispatched until the customer's site was confirmed ready.

No single piece was technically novel; the integration was.

## Construrama (2001) — extending the service overlay to small business

The second move was Construrama, launched 2001 as a retailer-network programme that brought thousands of small Mexican building-supply stores under a single brand + supply-chain umbrella. The structural problem Construrama solved: small builders and DIY customers couldn't access the on-time-delivery service overlay; they bought from local hardware stores that didn't have GPS dispatch or single-truck multi-product procurement. Construrama gave Cemex a way to push the service value-prop into the long-tail customer segments via affiliated retail.

By 2010 there were ~2,300+ Construrama stores in Mexico + Central America. The blue stickies in the BMC capture this: *Construrama retailer network* in Channels, Key Resources, Key Activities, AND Key Partners. The programme is *cross-block* — it's not just a channel, it's an entire operating layer.

## What goes wrong (and what 2008 changed)

In 2007 Cemex completed the $14.2B acquisition of Rinker Group (Australian + US construction-materials business), pushing Cemex's debt load to ~$25B at the peak. The 2008 financial crisis collapsed US + EU construction demand simultaneously, exposing Cemex's leverage. Through 2009-2014 Cemex was in restructuring mode: divestitures, refinancings, debt-paydown priorities. The pink stickies in `Cost Structure` — *M&A debt service*, *Energy + carbon costs* — are this period's structural drag.

The service-overlay strategy survived. Even at peak debt distress, Cemex kept the GPS dispatch + 20-minute window + Construrama programme — those were the moat, not the commodity production. In 2024 Cemex remains profitable and is now a leader in the cement-industry decarbonisation push.

## Why this case sits in the library WITHOUT a pattern tag

Unlike the 22 other cases in the library, Cemex does not carry an `appliesPatterns` tag. The reason: this case's primary teaching value — **JTBD reframing + operational excellence as service moat** — doesn't map cleanly onto any of the 5 BMG patterns currently shipped (Long Tail, Unbundling, Multi-Sided Platforms, Free, Open). Cemex isn't multi-sided; isn't long-tail; isn't unbundling; isn't free; isn't open.

Three paths the library could take in future rounds:

1. **Add Jobs-To-Be-Done as a pattern entity**, with Cemex as the primary case. JTBD is a recognised business-strategy lens (Christensen et al.) but isn't in the BMG catalog.
2. **Add Operational Excellence as a pattern**, with Cemex + FedEx + Toyota Production System as primary cases.
3. **Leave it untagged**. This is the current decision. The case still teaches well as a standalone — it sits next to `patagonia`, `carvana`, and `cainiao` in the library's 'interesting cases without a clean BMG pattern fit' tier. The audit decision is recorded so future readers see the rationale.

The pattern-fit question matters because pattern tags drive cross-reference behaviour in the library UI. A case without a pattern tag still appears in the Cases tab and can be opened normally; it just doesn't show up in any pattern's Related Cases tab. That's the right behaviour for Cemex today.