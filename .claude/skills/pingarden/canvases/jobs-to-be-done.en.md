---
canvas: jobs-to-be-done
language: en
source: packages/canvases/jobs-to-be-done/
---

# JTBD Story

## When to use

Use Jobs-to-Be-Done (JTBD) when "user needs" or "personas" are too fuzzy to drive product decisions. JTBD asks: **what is the customer "hiring" your product to do?** It reframes the unit of analysis from _who_ to _what progress_, and forces the team to express that progress as a story: situation → motivation → outcome (functional + emotional + social layers).

This 5-block sequential canvas captures one job per canvas. Multiple jobs = multiple canvases.

## When NOT to use

- Multi-segment business design — that's **BMC**.
- Aggregate persona description (JTBD is about progress in a specific moment, not who the person is overall) — use **Empathy Map** if you need persona-anchored synthesis.
- Building the offering itself — JTBD informs **VPC** / **Design Criteria Canvas**.

## Fill order — story, in order, no skipping

1. **`situation`** — when does the job arise? Specific context: time of day, what just happened, what they were trying to accomplish before this point. NOT who they are demographically — when and what.
2. **`motivation`** — _why_ does the job become important right now? What pressure made it surface? (deadline / mistake / new opportunity / status anxiety / etc.)
3. **`ideal-outcome`** — what does the FUNCTIONAL endpoint look like? Concrete and measurable: "submit the report on time, all numbers reconciled, before 6 PM Friday." Not "be productive."
4. **`emotional-social`** — what about how it makes them FEEL (relief / pride / shame avoided) and how it makes them LOOK to others (competent / careful / on top of things)? Functional jobs always sit in an emotional / social envelope; ignoring it is why "rational" features fail.

Each block must build on the previous. If `motivation` doesn't follow naturally from `situation`, you've described two different jobs.

## Cross-block consistency

- **`motivation`** must arise from `situation` — the trigger, not a generic preference.
- **`ideal-outcome`** must be a measurable end state, not "save time" or "be efficient."
- **`emotional-social`** must explain why this functional outcome _matters_ socially / emotionally — what would the customer fear if it failed?
- The whole canvas should read as ONE story. If you can't say it as a sentence ("When _<situation>_, I want to _<motivation>_, so I can _<outcome>_, so I feel _<emotional/social>_"), the canvas isn't done.

## Anti-patterns — refuse to ship

- ❌ **Job written as a feature.** "Use AI to summarize meeting notes" is a feature. The job is "look prepared in the next 1:1 without re-watching the recording."
- ❌ **Functional only, ignoring emotional/social.** Most B2B JTBD failures come from missing the social layer — "look careful in front of the auditor" — which actually drives the choice.
- ❌ **`situation` written as persona.** "Mid-level marketers, 28-35" is persona. Situation is a moment: "after the campaign briefing was rejected for the second time."
- ❌ **Multiple jobs in one canvas.** If your `motivation` could swing two different ways, split.
- ❌ **Outcome that's the product.** "Have AI tool installed" is owning the product, not the outcome. The outcome is what the AI tool _produces_ in their world.
- ❌ **Ignoring failure modes.** A real job has a "what could go wrong" shadow. If failure feels harmless, the job isn't important enough to design for.

## Tone

The canvas should read as a story, not a checklist. Each block in 1-3 sentences max — it's a sketch, not a brief.

## Blocks

The `zoneId` is the stable API identifier — your `pingarden canvas write` payload must use it verbatim, never translate it.

### `situation` — When

**Prompt** — What's the customer's circumstance? What just happened to trigger this need?

**Example** — Friday 4pm, my CFO just asked for next quarter's variance report by Monday

**Quality bar** — The leftmost slot of every Job Story.

### `motivation` — I want to

**Prompt** — What does the customer want to do? Lead with a verb. (Functional, emotional, or social.)

**Example** — Cut my reporting prep from 6 hours to under 1 (functional)

**Quality bar** — The middle slot. The **action** the customer wants to take in that circumstance. Lead with a verb.

### `ideal-outcome` — So I can

**Prompt** — What progress is the customer trying to make? Write outcomes as action verbs.

**Example** — Decide which two of five vendors to call back

**Quality bar** — The right-hand slot. The **progress** the customer is trying to make.

### `emotional-social` — Emotional + Social jobs

**Prompt** — For each functional Job Story above, name at least one emotional and one social companion job.

**Example** — Emotional — Feel calm during close week instead of dreading it

**Quality bar** — The bottom row. For every functional Job Story above, name **at least one emotional and one social companion job**.

## Colour legend

- `0` — **Functional Jobs**: Practical tasks, goals, or problems the customer wants to get done.
- `1` — **Emotional Jobs**: How the customer wants to feel before, during, or after the job.
- `2` — **Social Jobs**: How the customer wants to be perceived by others.

## Pairs with

This canvas typically pairs with the following — once done, suggest the user move to one of these next:

- `value-proposition-canvas` — Use this validated job as the central Customer Job in VPC; design Pain Relievers + Gain Creators around it.
- `empathy-map` — Anchor this job to a specific persona × moment to keep it concrete.
- `ad-lib-value-proposition` — Compress the validated job + outcome into the one-sentence value-prop slot for stakeholder alignment.
- `customer-journey` — Plot when in the journey this job becomes acute — that's where the offering should hit hardest.

---
Source: `packages/canvases/jobs-to-be-done/` — regenerate with `pingarden skill build`.
