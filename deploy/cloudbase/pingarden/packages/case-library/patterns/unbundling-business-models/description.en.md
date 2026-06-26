# Unbundling Business Models

> *The concept of the "unbundled" corporation holds that there are three
> fundamentally different types of businesses: customer relationship
> businesses, product innovation businesses, and infrastructure businesses.
> Each type has different economic, competitive, and cultural imperatives.
> The three types may co-exist within a single corporation, but ideally
> they are "unbundled" into separate entities in order to avoid conflicts
> or undesirable trade-offs.*
> — Osterwalder & Pigneur, *Business Model Generation*, p. 57  *(BMG 2010)*

## Why this pattern matters

In 1999 John Hagel and Marc Singer published an HBR article *(Hagel & Singer 1999)*
that put a name on a tension every large company silently lives with. The
traditional corporation, they argued, is actually three businesses pretending
to be one:

- **Customer Relationship businesses** — find customers, build relationships
  with them, sell. Optimized for *customer intimacy*: high touch, broad
  service portfolio, long-term loyalty. Pricing power comes from the
  relationship.
- **Product Innovation businesses** — develop new products and services.
  Optimized for *product leadership*: speed, talent density, willingness to
  cannibalize old products. Pricing power comes from the next product.
- **Infrastructure businesses** — build and run platforms for high-volume,
  repetitive work. Optimized for *operational excellence*: scale, cost,
  reliability. Pricing power comes from being cheap.

The three-discipline framing predates Hagel: Treacy and Wiersema's
*The Discipline of Market Leaders (Treacy & Wiersema 1995)* had already
argued no firm can be best at customer intimacy *and* product leadership
*and* operational excellence — pick one, organize around it. Hagel & Singer
went one step further: the three aren't just disciplines you can be good at;
they're *different businesses*, and bundling them inside one entity produces
*unavoidable conflicts*:

- The customer-relationship business wants the broadest portfolio, even
  third-party products, because that's what customers value.
- The product-innovation business wants the customer-relationship business
  to push *its* products even when something better exists elsewhere.
- The infrastructure business wants high volume and standardisation;
  customer relationships want bespoke service, product innovation wants
  experimental short runs. These are different scaling curves.

When everything is bundled, every strategic decision is a forced compromise
across the three. **Unbundling** is the deliberate move to separate them — into
distinct subsidiaries, joint ventures, or completely independent firms — so
each can be optimized to its own logic. *Business Model Generation
(BMG 2010)* canonicalises this into Pattern No. 1 of its catalog and
illustrates it with two paradigm cases — Swiss private banking and mobile
telecom — both of which ship in this case library.

## What unbundled BMCs look like

You usually don't see one Business Model Canvas — you see three, each cleaner
than the bundled original:

- The **Customer Relationship** BMC has wide channels, deep CRM, broad
  product portfolio (sourced from many product-innovation firms), and
  revenue tied to relationship duration.
- The **Product Innovation** BMC has flat structure, R&D-heavy cost base,
  high-margin / short-shelf-life revenue, and partners with relationship
  firms to reach customers.
- The **Infrastructure** BMC has commodity pricing, massive fixed assets,
  and serves *both* of the other two types as a wholesale customer.

In the bundled version, all three sets of choices are jammed into one
canvas with internal contradictions; the canvas appears coherent but the
strategy isn't.

## Concrete examples in the case library

### Swiss Private Banking

Mid-sized Swiss private banks historically did everything themselves:
relationship management, investment products, transaction processing.
**Maerki Baumann** chose to unbundle — they spun off transaction processing
into a separate entity (Incore Bank), letting the bank focus on the
customer-relationship piece. **Pictet** kept the bundle, doubling down on
integration as a differentiator. The case shows three BMCs side by side and
discusses where each strategy is winning. (`swiss-private-banking`)

### Mobile Telecom

Mobile operators historically bundled three businesses: customer
acquisition / retention, product innovation (new tariffs, devices, value-
added services), and network infrastructure. The 2010s saw incumbents in
several markets unbundle the network layer into shared infrastructure
companies (towers, then full RAN), letting the consumer brand focus on
relationship and the device business focus on innovation. The case
contrasts the bundled telco-of-2005 with three unbundled BMCs.
(`mobile-telco-unbundling`)

## What goes wrong

Three failure modes worth naming explicitly *(BMG 2010)*:

- **Cosmetic unbundling.** Splitting a bundled corp into three divisions
  with the same shared services, same incentive structure, and same CEO is
  not unbundling. The three businesses stay in conflict; only the org chart
  changes.
- **Premature / excessive unbundling.** Some industries genuinely benefit
  from integration (when product secrecy depends on owning the
  infrastructure, or when tight feedback between innovation and customer
  is the moat). Forcing unbundling into a vertically advantaged business
  destroys the advantage.
- **Mid-unbundling stuck-ness.** Many incumbents start unbundling, hit
  internal political resistance, and end up half-way: the new entity exists
  but the old company still does most of the work. The conflicts return —
  often *worse*, because now there's also a coordination tax.

## Read the examples

See `swiss-private-banking` for an industry case with three BMC variants
(archetype + Maerki Baumann unbundled + Pictet integrated), and
`mobile-telco-unbundling` for the bundled-vs-unbundled contrast in
telecom. Both cases shipped with their `appliesPatterns` field pointing
back here.
