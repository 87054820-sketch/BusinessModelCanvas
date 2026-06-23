---
canvas: porters-value-chain
language: en
source: packages/canvases/porters-value-chain/
---

# Porter's Value Chain

# Porter's Value Chain

## TL;DR

The 9 activities decompose the firm. The job is to locate where competitive advantage forms — cost, differentiation, or both — and to name the *linkages* that reinforce or fight each other.

## Fill order

1. **Inbound → Service** (left to right) first. Get the operational backbone on the canvas before talking about advantage.
2. **Support activities** (Firm Infrastructure → Procurement). These often look "boring" but are usually the most defensible.
3. Then go back and **mark each activity by colour**: yellow for cost-advantage, blue for differentiation, green for linkages, pink for leaks.
4. **Margin** zone last — synthesise where the firm actually makes money.

## Cross-block invariants

- Linkages are where most real advantage lives. A purple linkage sticky between Operations and Procurement is worth more than two boxes of features.
- Support activities are not optional. A firm where HRM is weak cannot deliver a Service-led strategy no matter what the marketing sticky says.
- Cost AND differentiation in the same activity is possible (e.g., Patagonia's responsible sourcing is both a cost discipline AND a brand differentiator) but rare — flag those with both colours.

## Anti-patterns

- Generic process map with no advantage assessment.
- Treating each activity in isolation; skipping the linkage colour.
- Skipping support activities because they feel boring.
- For platform / service businesses: pretending Inbound and Outbound Logistics still matter — they shrink to near-zero; Tech Development + Procurement of capacity dominate.
- Leaving the analysis on the canvas without translating into BMC KA / KR / KP.

## Tone

Activity-level specifics. "Operations" alone is not enough — write what *kind* of operation (high-mix flexible manufacturing? automated 24/7 cloud service?). Numbers and verbs beat adjectives.

## Blocks

The `zoneId` is the stable API identifier — your `pingarden canvas write` payload must use it verbatim, never translate it.

### `firm-infrastructure` — Firm Infrastructure

**Prompt** — General management, finance, legal, governance. How does it support or constrain primary activities?

**Example** — Global treasury and capital allocation

**Quality bar** — General management, finance, planning, legal, corporate governance, and any centralised function the whole company relies on.

### `human-resource-management` — Human Resource Management

**Prompt** — Recruiting, training, compensation, culture, retention. Where does the talent pipeline make or break strategy?

**Example** — Specialist hiring + apprenticeship pipeline

**Quality bar** — Recruiting, training, compensation, culture, retention, and leadership development.

### `technology-development` — Technology Development

**Prompt** — R&D, process tech, product design, platforms. Where does tech compound advantage vs just being table stakes?

**Example** — Proprietary ML platform for personalisation

**Quality bar** — R&D, process technology, product design, software platforms, automation, and data infrastructure.

### `procurement` — Procurement

**Prompt** — Inputs, services, capacity purchasing. What is bought, from whom, reinforcing cost or differentiation?

**Example** — Long-term contracts on certified materials

**Quality bar** — The purchasing of inputs, services, and capacity — including raw materials, component vendors, contracted labour, cloud capacity, and rights/licences.

### `inbound-logistics` — Inbound Logistics

**Prompt** — Receiving, warehousing, handling. How do inputs enter reliably and cheaply?

**Example** — Just-in-time component delivery

**Quality bar** — The receiving, warehousing, scheduling, and handling of inputs — raw materials, components, capacity, data.

### `operations` — Operations

**Prompt** — Transforming inputs to outputs. Where is the cost or quality difference made?

**Example** — High-mix flexible manufacturing

**Quality bar** — The transformation of inputs into outputs: production, assembly, testing, packaging, or — for services — the delivery process itself.

### `outbound-logistics` — Outbound Logistics

**Prompt** — Storage, fulfilment, delivery. Right place, right time, right cost?

**Example** — Cross-dock distribution network

**Quality bar** — The storage, fulfilment, and delivery of finished product to the customer.

### `marketing-sales` — Marketing & Sales

**Prompt** — Demand gen, brand, channels, pricing. How is demand converted to revenue?

**Example** — Brand-led D2C with paid + organic mix

**Quality bar** — Demand generation, brand building, channels, pricing, and the sales force.

### `service` — Service

**Prompt** — Install, repair, support, training. How does it strengthen relationship and feed back upstream?

**Example** — Free in-store repair as brand promise

**Quality bar** — Installation, repair, support, training, and post-sale customer care.

### `margin` — Margin

**Prompt** — Customer value minus total chain cost. From cost discipline, differentiation premium, or both?

**Example** — Premium pricing supported by service + brand

**Quality bar** — The difference between the value the customer pays and the total cost of every activity in the chain.

## Colour legend

- `0` — **Cost-advantage activity**: Activity where scale, automation, or process design creates a defendable cost gap vs. competitors.
- `1` — **Differentiation-advantage activity**: Activity where quality, design, or experience creates a price premium customers will pay for.
- `2` — **Linkage / handoff**: Reinforcing or conflicting handoff between two activities (e.g., procurement quality → operations consistency).
- `3` — **Leak / weakness**: Activity where cost is rising, differentiation is eroding, or capability is below the bar required by the strategic intent.
- `4` — **Capability investment**: Capability or asset the firm should invest in to deepen advantage at this activity.

## Pairs with

This canvas typically pairs with the following — once done, suggest the user move to one of these next:

- `business-model-canvas` — Every value-chain activity translates into a Key Activity, Key Resource, or Key Partner on the BMC. Don't let Value Chain stay on a slide — map each activity into a BMC block.
- `design-criteria-canvas` — Encode activity-level rules (gross margin ≥30%, service response ≤4h, supplier defect rate ≤0.1%) as design criteria the next business-model iteration must respect.
- `platform-ecosystem-map` — For platform / multi-sided businesses, physical inbound and outbound logistics shrink to near-zero; Technology Development and capacity Procurement dominate. Use the ecosystem map alongside.

---
Source: `packages/canvases/porters-value-chain/` — regenerate with `pingarden skill build`.
