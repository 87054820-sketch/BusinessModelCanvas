---
canvas: innovation-culture-map
language: en
source: packages/canvases/innovation-culture-map/
---

# Innovation Culture Map

## When to use

Use the Innovation Culture Map when the issue is not “how should the business model be drawn?” but “why can't the organization keep exploring, experimenting, transferring, or scaling?” Typical symptoms: Explore projects die in budget reviews, teams optimize only short-term KPIs, failure cannot be discussed openly, or core businesses refuse to absorb new ventures.

## Fill order

1. **Start with current behaviors**: observe evidence like an anthropologist. Do not write “we do not innovate”; write “after the growth workshop, nobody scheduled customer tests for six weeks.”
2. **Capture current outcomes**: what positive or negative consequences did those behaviors create? Ideas without validation, failed transfer, reliable execution but weak future options.
3. **Find current enablers / blockers**: processes, metrics, budgets, meetings, leadership behaviors, fears, and knowledge gaps that make behaviors happen or stop.
4. **Design desired outcomes**: what should the target culture reliably harvest? More de-risked ventures reach transfer, weak ideas are retired cheaply.
5. **Design desired behaviors**: what should people repeatedly do? State assumptions, run small tests, and earn resources with evidence.
6. **Design mechanism changes**: build enablers and remove or redesign blockers. Include leadership actions and governance mechanisms, not just slogans.

## Quality bar

- A good map is concrete about behaviors and mechanisms.
- Outcomes, behaviors, enablers, and blockers should have causal links.
- When paired with a Portfolio Map, explain how culture affects Explore / Exploit transfer and retirement.
- When paired with an Experiment Canvas, explain whether culture supports cheap learning and evidence-based decisions.

## Anti-patterns

- Writing only “embrace innovation, collaborate openly, celebrate failure.”
- Blaming employee mindset without naming processes and incentives.
- Designing the desired culture without admitting current real behaviors.
- No leadership action, resource mechanism, or metric change.

## Blocks

The `zoneId` is the stable API identifier — your `pingarden canvas write` payload must use it verbatim, never translate it.

### `current-outcomes` — Current outcomes

**Prompt** — What positive or negative consequences does the current culture actually produce? Write observable results, not aspirations.

**Example** — Twelve growth workshops last year, but only one idea reached a real customer test

**Quality bar** — Outcomes are the concrete consequences of behavior. They can be positive or negative.

### `desired-outcomes` — Desired outcomes

**Prompt** — What should the target innovation culture reliably harvest? The result must be observable or reviewable.

**Example** — Every quarter, 3–5 critical assumptions are validated or invalidated with real customer evidence

**Quality bar** — Desired outcomes are the fruits you want the culture to harvest.

### `current-behaviors` — Current behaviors

**Prompt** — What do people repeatedly do or say today? Capture evidence like an anthropologist; avoid abstract judgment.

**Example** — Teams say 'we need the full plan first' and then spend six weeks without customer contact

**Quality bar** — This is often the easiest place to start.

### `desired-behaviors` — Desired behaviors

**Prompt** — Which concrete behaviors must become normal and rewarded to produce the desired outcomes?

**Example** — Every Explore project names its three most critical and riskiest assumptions first

**Quality bar** — Desired behaviors are the repeated concrete actions needed to produce desired outcomes. They are not value words.

### `current-enablers-blockers` — Current enablers / blockers

**Prompt** — Which formal or informal mechanisms make current behaviors happen? Which mechanisms prevent useful behaviors?

**Example** — Enabler: an executive protects small experiment budgets; blocker: all projects use mature-business KPIs

**Quality bar** — Look for the mechanisms that cause current behaviors.

### `desired-enablers-blockers` — Enablers to build / blockers to remove

**Prompt** — What enablers must be built, and which blockers must be removed or redesigned to cultivate the target culture?

**Example** — Build: separate Explore metrics, evidence review cadence, and a small experiment fund

**Quality bar** — This block turns culture design into leadership actions and organizational mechanisms.

## Colour legend

- `0` — **Observed evidence**: Concrete facts, examples, quotes, repeated signals, or incidents.
- `1` — **Behavior**: What people actually do or say, not values or slogans.
- `2` — **Enabler**: Formal or informal mechanisms that make good behaviors easier.
- `3` — **Blocker**: Formal or informal mechanisms that prevent useful behaviors.
- `4` — **Leadership intervention**: Explicit leadership choices needed to cultivate the target culture.

## Pairs with

This canvas typically pairs with the following — once done, suggest the user move to one of these next:

- `portfolio-map` — Culture explains whether the organization can support Explore and Exploit portfolios at the same time.
- `experiment-canvas` — Innovation culture should make cheap learning, evidence, and experiment cadence normal.
- `business-model-canvas` — Culture determines whether a new business model can be executed, protected, and scaled.

---
Source: `packages/canvases/innovation-culture-map/` — regenerate with `pingarden skill build`.
