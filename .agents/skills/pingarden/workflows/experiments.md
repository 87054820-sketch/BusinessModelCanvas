# Workflow: pick an experiment from the library

When the user has a riskiest assumption to test (or asks "how do I validate X", "what experiment should I run", "我该怎么验证…"), don't free-style. The library at `experiments/<slug>.{en,zh}.md` ships ~12 curated TBI recipes; pick from those before inventing.

## The 3-step match

### 1. Classify the assumption — Desirability / Feasibility / Viability

TBI's three risk axes:

- **Desirability** — "Do customers want it?" The market is too small, customers don't care, the value proposition doesn't land.
- **Feasibility** — "Can we build / deliver it?" Tech, IP, key resources, partners, capabilities.
- **Viability** — "Can we earn money from it?" Pricing, revenue stream, willingness to pay, unit economics.

Most early-stage assumptions are Desirability-flavored ("users will pay $X / month for Y"). When the user names a structural / cost / supply assumption, it's Feasibility or Viability.

### 2. Decide Discovery vs Validation

- **Discovery** — first insights, course-correct rapidly. Cheap, weak evidence. Answers "is the direction even plausible?" Customer Interview, Online Survey, Discussion Forums, Search Trend Analysis, Boomerang, Storyboard, Clickable Prototype.
- **Validation** — confirm the direction with strong evidence. Costlier, slower, but the result is closer to "we should bet on this." Smoke Test, Wizard of Oz, Concierge, Letter of Intent, Pre-Sale.

Default to Discovery when the user has zero data; jump to Validation only when (a) Discovery has already pointed in the direction and (b) the user explicitly wants stronger evidence (board ask, funding gate, build commitment).

### 3. Match on cost + capabilities + canvas

Within the chosen Discovery / Validation set, narrow to 2-3 candidates by:

- **Cost band** — `cheap` / `medium` / `expensive`. Match user's stated budget; default to cheap.
- **Capabilities** — does the user's team actually have the skills? E.g. `landing-page-copy` for Smoke Test, `interview-design` for Customer Interview.
- **Canvas affinity** — `experiment.appliesToCanvases[]` lists which canvases each test most often validates. If the user is editing a VPC pain sticky, prefer experiments tagged `value-proposition-canvas`.

## Output shape

Return 2-3 candidate experiments with **trade-offs**, not a single "right" answer:

> Your assumption ("enterprises will pay $30k/yr for analytics dashboards") is **Desirability + Viability**. Three candidates:
>
> 1. `customer-interview` — cheap, hours to set up. Confirms whether the pain is real and chronic, but does NOT confirm willingness to pay.
> 2. `smoke-test` — medium cost, days to set up. Landing page with "Get pricing" CTA gates demand quantitatively, but doesn't verify enterprise procurement will sign.
> 3. `letter-of-intent` — medium cost, weeks to set up. Strong viability evidence (signed commitment), but slow and you need a target list of ~10 enterprises to approach.
>
> If you're at Discovery: do (1) first. If you've already done interviews and want stronger evidence: (2) → (3).

## Don't

- Don't recommend an experiment that the user can't actually run (no engineering team → no Wizard of Oz, no e-commerce site → no A/B Test).
- Don't claim weak-evidence tests (Customer Interview) "validated" anything; they Discover, not Validate.
- Don't invent experiments that aren't in the library. If genuinely none fit, recommend the closest two and flag the gap to the user.
- Don't fill the Experiment Canvas in the app yet — first agree on the experiment, then `pingarden canvas write` to populate the canvas's 6 zones.
