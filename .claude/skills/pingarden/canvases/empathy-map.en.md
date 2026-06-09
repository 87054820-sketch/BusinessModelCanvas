---
canvas: empathy-map
language: en
source: packages/canvases/empathy-map/
---

# Empathy Map

## When to use

Use the Empathy Map (Dave Gray's 2017 update, **XPLANE**) when you need a one-page picture of **what one specific person actually experiences** — what they see, say, do, hear, think, feel — to anchor the team on _who_ you're really designing for. Build it. Update it. Use it as a shared reference whenever new evidence arrives.

The 2017 update enforces an **outside-first** filling order: you cannot infer thoughts/feelings until you've gathered observable evidence in the outer ring.

## When NOT to use

- Aggregate / market-segment analysis — use **BMC Customer Segments** or **Portfolio Map**.
- Designing the offering itself — that's **Value Proposition Canvas**'s job (Empathy Map feeds VPC's customer side).
- Persona generation as a marketing artifact (the goal is operational truth, not a poster).

## Fill order — strict, outside-first

1. **`persona`** — anchor: ONE specific person × ONE specific moment ("Lina, 38, senior PM at a Series-B fintech, week before the Q3 release").
2. **`see`** — what enters their environment: physical surroundings, what's on their screens, what competitors are doing, what their colleagues are doing.
3. **`say-and-do`** — public behaviour: what they actually say in meetings / Slack / posts; what they spend time on; observed actions (not summaries).
4. **`hear`** — what reaches them through others: direct feedback, advice from their network, podcasts, newsletters, ambient noise.
5. **`think-and-feel`** — INFERRED from the outer ring above: thoughts, emotions, anxieties, ambitions. Each entry should be defensible by pointing at outer-ring evidence.
6. **`pain`** — fears, frustrations, blockers — drawn from the inner-circle synthesis.
7. **`gain`** — desires, hopes, definitions of success — in their own words, not yours.

Skipping straight to think-and-feel is the canonical failure mode — that's where teams project their own assumptions onto the user.

## Cross-block consistency — verify after fill

- Every **`think-and-feel`** entry should be defensible by pointing at ≥1 entry in the outer ring (`see` / `say-and-do` / `hear`). If no outer evidence supports it, it's a guess — flag it.
- **`say-and-do`** should be direct quotes / observable actions, not summaries. ("'We can ship by Friday'" not "confidence about deadline").
- **`pain`** ≠ inverse `gain`. Fears and frustrations live in the present; gains are forward-looking.
- The whole map must reflect the SAME moment (anchored in `persona`). If you find yourself writing about "yesterday" and "next quarter" in different cells, split into two maps.

## Anti-patterns — refuse to ship

- ❌ **Generic persona.** "Tech-savvy millennial" is useless. Use a name + role + recent context anchor. The goal is one specific person at one specific moment.
- ❌ **Inferring before observing.** Filling `think-and-feel` first — you'll project your hypotheses onto the user instead of testing them.
- ❌ **`say-and-do` as paraphrase.** Direct quotes are evidence; "they want X" is not.
- ❌ **Aggregating multiple users.** "Designers and engineers" — split into separate maps. They see different things, hear different things.
- ❌ **Using it as a marketing persona.** Empathy Map is for operational empathy, not a deck. No demographic clichés ("loves matcha"), no brand stereotypes.
- ❌ **Treating it as static.** Update the map as evidence arrives. A 6-month-old empathy map is folklore.

## Tone

`say-and-do` and `hear` should sound like raw transcript snippets. `think-and-feel` / `pain` / `gain` should be in the persona's voice, not yours.

## Blocks

The `zoneId` is the stable API identifier — your `pingarden canvas write` payload must use it verbatim, never translate it.

### `persona` — Persona

**Prompt** — Who are we empathising with?

**Example** — Sarah, B2B SaaS Senior PM, late 30s, parent of two

**Quality bar** — The person you are trying to deeply understand, and the situation they're in.

### `think-and-feel` — Think & Feel

**Prompt** — What occupies their mind?

**Example** — Worries we'll miss the launch window for Q3

**Quality bar** — What's going on inside their head — thoughts, emotions, worries, aspirations.

### `see` — See

**Prompt** — What's in their environment?

**Example** — Slack channels lighting up with bug reports every morning

**Quality bar** — What's in their environment — the stimuli reaching them every day.

### `say-and-do` — Say & Do

**Prompt** — How do they show up in public?

**Example** — Tells the team "we'll figure it out" in standups

**Quality bar** — Public behaviour.

### `hear` — Hear

**Prompt** — What do they hear from others?

**Example** — CEO saying "we need to move faster on AI"

**Quality bar** — What reaches them through others — direct feedback from peers and authority figures, advice from their network, ambient signals from podcasts, newsletters, and the social feeds they consume.

### `pain` — Pain

**Prompt** — Fears, frustrations, obstacles.

**Example** — Spends 4 hours a week reconciling spreadsheets manually

**Quality bar** — Fears, frustrations, anxieties, obstacles.

### `gain` — Gain

**Prompt** — Wants, needs, definitions of success.

**Example** — Ships one zero-to-one feature with measurable adoption

**Quality bar** — Wants, needs, hopes, dreams, definitions of success.

## Colour legend

_Not customised — use the six-colour sticky default palette. Colours carry no semantics unless the canvas defines them._

## Pairs with

This canvas typically pairs with the following — once done, suggest the user move to one of these next:

- `value-proposition-canvas` — Lift the Pains and Gains from this persona into VPC's customer side.
- `jobs-to-be-done` — Sharpen the persona's central problem into a JTBD situation → motivation → outcome story.
- `customer-journey` — Walk this persona's day across stages to find where the friction actually lives.

---
Source: `packages/canvases/empathy-map/` — regenerate with `pingarden skill build`.
