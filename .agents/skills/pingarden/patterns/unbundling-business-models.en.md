# Unbundling Business Models

> Most companies bundle three fundamentally different businesses inside one entity: customer relationships, product innovation, and infrastructure. Each has its own economics and culture. Unbundling means separating them into independent firms or operating units to remove the conflicts that inevitably arise.

## Slug

`unbundling-business-models` — referenced by `CaseLibraryEntry.appliesPatterns[]` on cases that exemplify this pattern.

# Unbundling Business Models — AI skill

## TL;DR

A bundled corporation is three businesses (customer relationships, product
innovation, infrastructure) glued together. Each has its own economics and
culture; together they produce unavoidable internal trade-offs. Unbundling
splits them into independent units optimized to their own logic.

## When this pattern applies (signals)

- The company has very different business activities under one roof —
  e.g. a bank that runs customer service AND payments infrastructure AND
  product innovation; a telco that owns the network AND the customer
  brand AND the device portfolio.
- Strategic decisions feel like forced compromises between groups
  internally — the customer-facing side wants flexibility, the
  infrastructure side wants standardization, the product side wants
  speed.
- A competitor has unbundled and is winning on one dimension while the
  incumbent is stuck across all three.

## How to spot it from a BMC

In the **bundled** state, one BMC tries to serve all three logics:
- Customer Segments mix high-touch retail and wholesale.
- Key Resources includes both relationship infrastructure (CRM, branches)
  AND production capacity (factories, networks).
- Cost Structure is a mix of variable / fixed scaling that doesn't pencil
  out neatly for any single dimension.

In the **unbundled** state, you draw three BMCs:
- *Customer relationship*: wide product portfolio (sourced from product-
  innovation firms), revenue tied to relationship duration / share of
  wallet.
- *Product innovation*: R&D-heavy cost base, partners with relationship
  firms for distribution, high margin / short shelf life.
- *Infrastructure*: commodity pricing, scale-driven cost advantage, sells
  to BOTH of the above as wholesale clients.

## Anti-patterns

- **Cosmetic unbundling.** Three divisions, same incentives, same shared
  services. Org-chart change without economic change. Conflicts persist.
- **Forced unbundling.** Some businesses genuinely benefit from
  integration (regulated industries, secrecy-dependent products). Don't
  unbundle a vertical-integration advantage just because the pattern
  exists.
- **Stuck-in-the-middle.** Started unbundling but didn't finish. New
  entity exists but old company still does the work. All the cost, none
  of the benefit.

## Cross-references

- **Multi-Sided Platforms** sometimes emerge from infrastructure unbundling
  (the spun-off infra serves multiple downstream brands).
- The case library has two industry examples: `swiss-private-banking` and
  `mobile-telco-unbundling`. Both show the bundled archetype + variants.

## How to act on it

When the user describes a company that feels "all over the place":

1. Probe whether they have all three logics inside (customer relationships
   + product innovation + infrastructure).
2. If yes — `pingarden pattern get unbundling-business-models`, walk them
   through the three-BMC mental model.
3. Suggest drawing the bundled BMC first to surface the conflicts, *then*
   draw the three unbundled BMCs as alternatives.
4. Examples to point at: `pingarden case get swiss-private-banking` and
   `pingarden case get mobile-telco-unbundling`.

## Examples shipped in this skill

- `swiss-private-banking` (primary)
- `mobile-telco-unbundling` (primary)

To explore an example case's BMC, follow with `pingarden case get <slug>` → `pingarden case canvases <slug>` → `pingarden canvas describe <canvas-id> --json`.

## References

### Books

- **Treacy & Wiersema 1995** · *Michael Treacy & Fred Wiersema · The Discipline of Market Leaders · Addison-Wesley* · 1995
  Pre-Hagel framing of three value disciplines (customer intimacy, product leadership, operational excellence) that map almost 1:1 onto the three unbundled business types.

- **BMG 2010** · *Osterwalder & Pigneur · Business Model Generation · Wiley* · 2010 · pp. 56–65
  Adapts unbundling into the BMC pattern catalog (Pattern No. 1). Uses Swiss private banking and mobile telecom as the two paradigm cases — both shipped in this library.

### Papers

- **Hagel & Singer 1999** · *[John Hagel III & Marc Singer · 'Unbundling the Corporation' · Harvard Business Review](https://hbr.org/1999/03/unbundling-the-corporation)* · 1999 · Mar–Apr 1999 issue
  Originating paper. Names the three business types (customer relationship, product innovation, infrastructure) and argues bundling forces unavoidable strategic compromises.
