---
canvas: customer-journey
language: en
source: packages/canvases/customer-journey/
---

# Customer Journey

## When to use

Use the Customer Journey canvas to walk through one persona's path **across time**, surfacing where they hit pain, where they get value, and where the experience falls apart between teams. This is a 4-block snapshot anchored to one persona experiencing one journey — not a complete service blueprint.

It complements VPC and Empathy Map: VPC is the static "what they need," Empathy Map is "who they are right now," Customer Journey is "what they go through, in order."

## When NOT to use

- For aggregate market analysis — wrong altitude.
- As a service blueprint (which adds backstage / tech systems) — Customer Journey here is customer-facing only.
- Without a persona — every entry is anchored to one specific person; without that, satisfaction levels and key moments are projections.

## Fill order — persona first, then chronological

1. **`persona`** — same convention as Empathy Map. ONE specific person × ONE specific journey. "Lina booking her first PinGarden subscription." Don't share a Customer Journey across personas.
2. **`needs`** — what does the persona expect or need at each stage of the journey? Functional + emotional. Stage by stage from the persona's perspective.
3. **`key-moment`** — the moments that matter most: where the customer decides, where they hit friction, where they feel rewarded, where they tell others. Mark each with what stage it occurs in. The "make-or-break" moments deserve disproportionate design attention.
4. **`satisfaction`** — emotional curve over time. Use sticky text + ordering to express low / high satisfaction at each key moment. The shape of the curve is the diagnosis.

A complete journey reads in one direction (start → end of journey) and you can identify cause-effect: when did satisfaction dip? what happened just before?

## Cross-block consistency

- Every entry should be **stage-anchored**. If you can't say "this happens at stage X," the entry is too vague.
- **Needs at stage X** must be addressed (or visibly NOT addressed) by **key moments at stage X**. Mismatch = friction.
- **Satisfaction dips** must trace to either an unmet need OR a poorly-executed key moment. Unexplained dips = research gap; mark for follow-up.
- The journey's start and end must be explicit: where does the first need arise? when does the journey "complete" (first time, repeat, churn)?

## Anti-patterns — refuse to ship

- ❌ **Multiple personas in one journey.** Split into separate journeys. They have different needs at different stages.
- ❌ **Journey from your-team's POV.** Stages like "lead enters CRM" — that's an internal funnel. Customer journey is what THEY experience: discovering a problem, hearing about you, deciding, etc.
- ❌ **All-positive satisfaction.** Almost no real journey is uniformly positive. If yours is, you're not asking customers — you're projecting.
- ❌ **Vague needs.** "They want it to be easy" — at WHICH stage? In what way? Be specific.
- ❌ **Ignoring post-purchase.** Customer journeys often end at purchase in low-quality maps. Onboarding, daily use, support, advocacy are where retention lives.
- ❌ **Treating it as static.** Customer journeys are moving — re-examine after every release / experiment.

## Bain value lens handoff

Customer Journey is the timeline check for the Bain value lens. Values tagged in VPC as `[functional]`, `[emotional]`, or `[social]` must be perceived by the customer at some stage; if a value element has no touchpoint, it may be marketing copy. Satisfaction dips usually indicate value breakage and should feed back into VPC `pains` or `pain-relievers`.

## Tone

Each sticky should sit at a specific stage and read in the persona's voice or as an observable event. "On day 3, can't find the export button" beats "Hard to use."

## Blocks

The `zoneId` is the stable API identifier — your `pingarden canvas write` payload must use it verbatim, never translate it.

### `persona` — Persona

**Prompt** — Whose journey is this? Name the protagonist, their situation and goal.

**Example** — Maria, 38 — Operations Director at a mid-market logistics firm; needs to cut weekly reporting from 6 hours to 1

**Quality bar** — The protagonist of this journey.

### `needs` — Customer Needs

**Prompt** — What does the customer need to get done at this stage of the journey?

**Example** — Discovery: trustworthy comparison of options without vendor sales pressure

**Quality bar** — The **functional job** the customer is trying to get done **at this particular stage** of the journey. Stage-specific.

### `key-moment` — Key Moment

**Prompt** — If you took a snapshot of this moment, what would be in frame? Where, what, who, on which channel?

**Example** — Friday 4pm, laptop on kitchen counter, comparing 3 vendor sites in tabs while kids watch TV

**Quality bar** — A **snapshot of this stage**.

### `satisfaction` — Customer Satisfaction

**Prompt** — How does the customer feel at this moment — happy, neutral, or frustrated? This also tests whether Bain emotional/social value is real.

**Example** — Frustrated — pricing page is opaque, has to email sales just to get a number

**Quality bar** — The customer's emotional state at this stage of the journey.

## Colour legend

_Not customised — use the six-colour sticky default palette. Colours carry no semantics unless the canvas defines them._

## Pairs with

This canvas typically pairs with the following — once done, suggest the user move to one of these next:

- `empathy-map` — If the persona feels generic, build the Empathy Map first to anchor the journey to a specific person.
- `value-proposition-canvas` — Friction at any journey stage is a Pain; moments of delight are Gains. Feed both back into VPC and use Bain tags only where the value is actually perceived.
- `jobs-to-be-done` — The journey's biggest dip usually points at an unmet job — turn that into a JTBD canvas.

---
Source: `packages/canvases/customer-journey/` — regenerate with `pingarden skill build`.
