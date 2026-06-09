---
canvas: ad-lib-value-proposition
language: en
source: packages/canvases/ad-lib-value-proposition/
---

# Ad-Lib Value Proposition

## When to use

Use the Ad-Lib Value Proposition when you need to **compress an entire VPC into one sentence** the team can say out loud. It's a stress test: if you can't fill the slots cleanly, your VPC has a weak spot — usually a vague Customer Segment, a feature-as-value-prop, or a missing differentiator.

The Ad-Lib is a sentence-template canvas: each zone is a slot. Filled together they form one line:

> "Our **\<products & services>** help **\<customer segment>** who want to **\<job>** by **\<verb>**-ing **\<pain>** and **\<verb>**-ing **\<gain>**, unlike **\<competing value proposition>**."

## When NOT to use

- As a starting point for value-prop work. Always run **VPC** first; Ad-Lib is downstream of VPC.
- For multi-segment positioning. One Ad-Lib = one segment, exactly like VPC.
- For ad copy / marketing headlines. The Ad-Lib is internal — its job is to expose weaknesses, not to ship as customer-facing copy.

## Fill order — slot by slot, then read aloud

1. **`customer-segment`** — the structural segment from your BMC / VPC. NOT a persona, NOT demographics.
2. **`jobs-to-be-done`** — the most important Customer Job from VPC. Functional + emotional + social envelope OK if it stays under one line.
3. **`customer-pain`** — the most severe Pain, from VPC.
4. **`pain-verb`** — how your offering acts on the pain: "reducing" / "removing" / "avoiding" / "eliminating". Use the verb that's truthful, not the strongest.
5. **`customer-gain`** — the most desired Gain, from VPC.
6. **`gain-verb`** — how your offering produces the gain: "enabling" / "increasing" / "delivering" / "amplifying".
7. **`products-services`** — the literal offerings (not values). Same as VPC's Products & Services.
8. **`competing-value-proposition`** — what does the customer use today (not just direct competitors — non-consumption + workarounds count). The "unlike" clause.

Read the whole sentence aloud. Twice. If it sounds awkward, doesn't say anything new, or could be said by a competitor about themselves — your VPC is incomplete.

## Cross-block consistency

- **`customer-segment`** + **`jobs-to-be-done`** + **`customer-pain`** + **`customer-gain`** must all come from the SAME VPC. Mixing segments here invalidates the whole exercise.
- **`pain-verb`** must be honest about strength: "removing" is the strongest claim, "reducing" is hedged, "avoiding" means deflection. Pick truthfully.
- **`competing-value-proposition`** should be specific enough that you could cite it. "Other tools" is too vague. Name the workaround.
- The full sentence should be **one line** when read aloud. If it sprawls into a paragraph, the components are too long.

## Anti-patterns — refuse to ship

- ❌ **Filling Ad-Lib without a VPC first.** You'll write fiction that sounds plausible. Always do VPC, then compress.
- ❌ **Multiple slots fudged with "and / or".** "...help startups OR mid-market companies..." is two segments. Split into two Ad-Libs.
- ❌ **`competing-value-proposition` = "no good alternative".** Customers are doing SOMETHING today. Find it. Spreadsheets, intern labour, ignoring the problem — those are real competitors.
- ❌ **Verbs that lie.** "Eliminating" when you actually "reduce" is a red flag. The Ad-Lib is for internal honesty.
- ❌ **`products-services` written as outcomes.** Outcomes belong in pains/gains. Products are the literal box / app / service.
- ❌ **Treating it as marketing copy.** The Ad-Lib has no rhythm or wit by design. If you want a tagline, do that downstream.

## Tone

Tighten ruthlessly. Every word should add information. If a competitor could swap their product name in and the sentence still works, your differentiation is failing — fix the inputs, not the wording.

## Blocks

The `zoneId` is the stable API identifier — your `pingarden canvas write` payload must use it verbatim, never translate it.

### `products-services` — Products and Services

**Prompt** — What specific product or service goes into the sentence?

**Example** — Real-time collaboration whiteboard

**Quality bar** — Name the concrete product or service the customer can buy, use, or experience.

### `customer-segment` — Customer Segment

**Prompt** — Which specific customer segment does this sentence serve?

**Example** — Series A startup CTOs

**Quality bar** — The one specific customer segment this sentence targets.

### `jobs-to-be-done` — Jobs to Be Done

**Prompt** — What specific job is this customer trying to get done?

**Example** — Ship product specs to engineering without rework

**Quality bar** — The functional, social, or emotional job the customer hires a solution to do.

### `pain-verb` — Verb (e.g. reducing, avoiding)

**Prompt** — Which verb explains how you relieve the pain?

**Example** — reducing

**Quality bar** — Choose a verb that explains how you relieve pain: reducing, eliminating, avoiding, lowering.

### `customer-pain` — A customer pain

**Prompt** — Which specific pain do you reduce or avoid?

**Example** — the cost of unplanned database downtime

**Quality bar** — A concrete, named frustration the customer experiences today.

### `gain-verb` — Verb (e.g. increasing, enabling)

**Prompt** — Which verb explains how you create the gain?

**Example** — increasing

**Quality bar** — Choose a verb that explains how you create gain: increasing, enabling, accelerating, improving.

### `customer-gain` — A customer gain

**Prompt** — Which specific gain do you increase or enable?

**Example** — 5-minute production rollback

**Quality bar** — A concrete benefit the customer ends up with: a better outcome, time or cost saving, reduced risk, stronger status, confidence, or positive emotion.

### `competing-value-proposition` — Competing value proposition

**Prompt** — What do customers use today instead of you?

**Example** — self-managed Postgres on EC2

**Quality bar** — Name what customers use today: a direct competitor, workaround, internal process, or doing nothing.

## Colour legend

_Not customised — use the six-colour sticky default palette. Colours carry no semantics unless the canvas defines them._

## Pairs with

This canvas typically pairs with the following — once done, suggest the user move to one of these next:

- `value-proposition-canvas` — Always run VPC first; the Ad-Lib only compresses what's already in VPC into one sentence.
- `jobs-to-be-done` — Use the dominant Customer Job as the 'who want to' slot for cleaner positioning language.

---
Source: `packages/canvases/ad-lib-value-proposition/` — regenerate with `pingarden skill build`.
