---
canvas: design-criteria-canvas
language: en
source: packages/canvases/design-criteria-canvas/
---

# Design Criteria Canvas

## When to use

Use the Design Criteria Canvas (a Strategyzer / IDEO-style tool) to **translate validated insights into hard constraints** before designing the next iteration of an offering. The goal: make tradeoffs explicit so the team is debating priorities, not preferences.

The 4 zones use **MoSCoW** semantics: **Must-have / Should-have / Could-have / Won't-have**. The won't-have is as important as the must-have — it's a commitment, not just an omission.

## When NOT to use

- Before validation. Design Criteria comes AFTER VPC + customer research. If criteria are based on team opinion, you're prioritising a wishlist.
- For high-level vision — that's BMC. Design Criteria is for the next product iteration.
- Without owners. Each criterion needs someone accountable for whether it's met. Without that, MoSCoW becomes vibes.

## Fill order — must-haves first, won't-haves second

1. **`must-have`** — non-negotiable for the offering to be considered viable at all. If a must-have isn't met, the product fails. Each must trace to a validated insight (VPC pain, observed customer behaviour, regulatory requirement).
2. **`wont-have`** — explicit OUT-of-scope decisions. Document the temptations the team will face and rule out NOW. ("No Android in v1." "No enterprise SSO in v1.") This is the most-skipped quadrant and the most valuable: it stops scope creep mid-build.
3. **`should-have`** — important but not vital for v1; would be present given reasonable resources. Should-haves migrate to must-have or get cut as constraints tighten.
4. **`could-have`** — nice-to-have. Anything aspirational; first to drop when scope tightens.

Filling in this order forces the team to commit to the spine (must) and the negative space (won't) before debating the optional middle.

## Cross-block consistency

- **Every must-have must trace to evidence** — a VPC pain, a measured customer behaviour, a regulatory clause. "Engineering thinks it's important" is not evidence.
- **Won't-haves must address real temptations.** Don't list things nobody would have suggested. List the things you've already heard pitched and are choosing to defer.
- **Could-haves should not silently grow into must-haves** during execution — that's how MVPs become 18-month builds. Re-anchor frequently.
- The four zones together should describe ONE design phase / release. If criteria are mixing v1 + v3, split.

## Anti-patterns — refuse to ship

- ❌ **All-must-have.** Every team's first draft has too many must-haves. Cap them. "Must-have" should be small: typically 3–7 items.
- ❌ **Empty won't-have.** A blank `won't-have` quadrant means the team hasn't done the hard prioritisation. Force at least 3 entries.
- ❌ **Criteria without owners.** Each must-have should name who is accountable for delivering or verifying it.
- ❌ **Wishlist disguised as criteria.** "Should support enterprise customers" — what does that DECOMPOSE into? Auth, audit log, tenant isolation, etc. Decompose to actionable.
- ❌ **No re-anchoring.** Criteria set at kickoff and never revisited become folklore. Revisit weekly during execution.
- ❌ **Building before VPC is done.** If you're filling Design Criteria from team intuition, you've skipped a step. Pause and validate.

## Tone

Each criterion is a constraint statement, not a feature ("Order placement under 60 seconds for first-time users" beats "Fast checkout"). The won't-haves are the most direct: "No native mobile app this quarter."

## Blocks

The `zoneId` is the stable API identifier — your `pingarden canvas write` payload must use it verbatim, never translate it.

### `must-have` — Must Haves

**Prompt** — Which criteria are non-negotiable for the idea to work?

**Example** — Must validate real purchase intent within 3 months

**Quality bar** — These are non-negotiable design criteria. If an idea cannot satisfy these standards, it should not move forward.

### `should-have` — Should Haves

**Prompt** — Which criteria are important, but not deal breakers?

**Example** — Should reuse existing sales channels

**Quality bar** — These criteria are important but not absolute deal breakers.

### `could-have` — Could Haves

**Prompt** — Which useful extras can wait until resources allow?

**Example** — Could support multiple interface languages

**Quality bar** — These are useful extras that can wait.

### `wont-have` — Won't Haves

**Prompt** — Which directions are explicitly out of scope?

**Example** — Won't rely on heavy manual review workflows

**Quality bar** — These are explicit exclusions and non-negotiable boundaries.

## Colour legend

_Not customised — use the six-colour sticky default palette. Colours carry no semantics unless the canvas defines them._

## Pairs with

This canvas typically pairs with the following — once done, suggest the user move to one of these next:

- `business-model-canvas` — Must-haves should be defensible against the BMC's Value Propositions and Customer Segments.
- `value-proposition-canvas` — Each must-have should trace to a VPC Pain or Gain. Without that link it's a wishlist item.
- `experiment-canvas` — When a should-have or won't-have feels uncertain, design an experiment to make the call.

---
Source: `packages/canvases/design-criteria-canvas/` — regenerate with `pingarden skill build`.
