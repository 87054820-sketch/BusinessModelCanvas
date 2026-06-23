---
canvas: value-proposition-canvas
language: en
source: packages/canvases/value-proposition-canvas/
---

# Value Proposition Canvas

## When to use

Use the Value Proposition Canvas (VPC) when you need to deeply understand **one customer segment** and design how a value proposition fits their reality. VPC zooms in where the BMC's "Customer Segments" + "Value Propositions" pair only sketches.

**One VPC = one segment.** If you have three segments, you have three VPCs.

## When NOT to use

- Cross-segment business design — that's BMC's job.
- A general "ideation" map — VPC is empirical, anchored in observed customer reality.
- Communicating an already-validated value proposition to the market — that's marketing copy, not a canvas.

## Fill order — Customer Profile FIRST, then Value Map

The most common failure mode is filling the Value Map first; you'll then backfit Pains and Gains to the offer you already had in mind. The whole point of VPC is to **resist** that. Always:

### Right side — Customer Profile (the diamond):

1. **Customer Jobs** — what is the customer trying to get done? Distinguish:
   - _Functional_ jobs (perform a task: "file my taxes")
   - _Social_ jobs (look a certain way: "appear on top of my work")
   - _Emotional_ jobs (feel a certain way: "feel safe about year-end audit")
   - For each: note context, which jobs are critical, which are nice-to-have.
2. **Pains** — anything that bothers the customer _before, during, or after_ trying to get the job done. Include:
   - Undesired outcomes / problems / characteristics
   - Obstacles preventing them from starting
   - Risks they fear (and how often / how severely)
3. **Gains** — outcomes they _want_. Stratify:
   - _Required_ gains (must-have for the job to work at all)
   - _Expected_ (basic but not strictly required)
   - _Desired_ (would love to have)
   - _Unexpected_ (delight — they wouldn't even ask for it)

### Left side — Value Map (the square):

4. **Products & Services** — the literal offerings (not values, not promises). What is in the box / under the SaaS subscription?
5. **Pain Relievers** — for each Pain, how does your offering reduce or remove it? Be explicit per pain.
6. **Gain Creators** — for each Gain, how does your offering produce or amplify it? Be explicit per gain.

### Bain value lens (supporting, not primary canvas):

When gains are too vague, use `bain-elements-of-value` to add light tags to `gains` / `gain-creators`, for example `[functional-saves time]`, `[emotional-reduces anxiety]`, or `[social-badge value]`. The tag explains the VPC sticky; it never replaces real customer jobs, pains, or gains.

## Cross-block invariants — VPC's whole logic depends on these

- **Each Pain Reliever should map to ≥1 specific Pain.** If a reliever doesn't address an actual pain you wrote, it's a feature looking for a problem.
- **Each Gain Creator should map to ≥1 specific Gain.** Same logic.
- **Critical Pains** (high-frequency / high-severity) deserve _stronger_ relievers than nice-to-have pains.
- **Required Gains** must be reliably created — without them the value proposition fails to be considered at all.
- **Products & Services** are the things that _do_ the relieving and creating — not abstract "values."

A VPC achieves _fit_ when the left side genuinely addresses the most important items on the right side. **Fit is the goal**, not balance.

## Anti-patterns — refuse to ship

- ❌ **Filling Value Map first.** You'll write Pains and Gains that conveniently match what you already built. Customer Profile must come first, written as if your offering doesn't exist.
- ❌ **One canvas for multiple segments.** "SMB owners and enterprise CFOs" — split it. Their Jobs / Pains / Gains differ.
- ❌ **Pains as "negative gains" / Gains as "negative pains."** They're orthogonal axes. "Saves time" is a gain; "wastes time" is a pain. The same statement, flipped, doesn't count as filling both.
- ❌ **Generic Jobs.** "Save time" is too abstract. "File quarterly VAT return for a UK Ltd while travelling" is a job. Specificity reveals real pains.
- ❌ **Pain count vs Pain Reliever count wildly mismatched.** If you have 8 Pains but 1 Pain Reliever, you don't have a value proposition — you have a feature.
- ❌ **Pain Relievers / Gain Creators as adjectives.** "Faster" / "Easier" — faster than what, easier how? Replace with mechanism.
- ❌ **Confusing Customer Jobs with Pains.** Jobs are what they're _trying to do_; Pains are what _gets in the way_. "Late filing penalty" is a pain, not a job.

## Tone

Customer Profile entries should sound like the customer would say them, not like a marketing deck. Value Map entries should describe mechanism, not vibes.

## Blocks

The `zoneId` is the stable API identifier — your `pingarden canvas write` payload must use it verbatim, never translate it.

### `gain-creators` — Gain Creators

**Prompt** — How does your offer create a specific gain customers value? Add Bain value tags when useful.

**Example** — Saves 4 hours/week of manual reconciliation

**Quality bar** — Gain Creators describe how your products and services create customer gains.

### `pain-relievers` — Pain Relievers

**Prompt** — How does your offer relieve a specific customer pain?

**Example** — Eliminates manual data re-entry between systems

**Quality bar** — Pain Relievers describe how your products and services alleviate specific customer pains.

### `products-and-services` — Products & Services

**Prompt** — What can customers actually buy, use, or experience?

**Example** — iOS and Android mobile app

**Quality bar** — This is a list of what you offer. Think of it as everything the customer can see in your shop window.

### `gains` — Gains

**Prompt** — What outcomes does the customer expect, desire, or love? Use Bain tags to separate functional, emotional, and social value.

**Example** — Closes books faster than competitors

**Quality bar** — Gains describe the outcomes and benefits your customers want to achieve.

### `pains` — Pains

**Prompt** — Where does the customer hurt while getting the job done?

**Example** — Manual cross-checking eats 6h every Friday

**Quality bar** — Pains describe anything that annoys your customers before, during, and after trying to get a job done.

### `customer-jobs` — Customer Jobs

**Prompt** — What job is the customer trying to get done?

**Example** — Close monthly books accurately

**Quality bar** — Customer jobs describe what customers are trying to get done in their work and in their lives.

## Colour legend

_Not customised — use the six-colour sticky default palette. Colours carry no semantics unless the canvas defines them._

## Pairs with

This canvas typically pairs with the following — once done, suggest the user move to one of these next:

- `business-model-canvas` — Lift the validated Value Proposition + Customer Segment back into the BMC so the rest of the model adapts.
- `empathy-map` — Deep-dive on what the customer thinks / says / feels before listing Jobs and Pains. Anchors the right side.
- `jobs-to-be-done` — Sharpen Customer Jobs into a situation → motivation → outcome story before using Bain tags to classify value layers.
- `ad-lib-value-proposition` — Compress the entire VPC into one sentence the team can say out loud — exposes weak spots.
- `customer-journey` — Walk Pains and Gains across the customer's timeline so you see when each one bites.
- `design-criteria-canvas` — Translate the validated Pains and Gains into design criteria for the offering.
- `experiment-canvas` — Pick the riskiest Pain Reliever or Gain Creator and design a cheap test for it.

---
Source: `packages/canvases/value-proposition-canvas/` — regenerate with `pingarden skill build`.
