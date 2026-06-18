# Clickable Prototype

> Figma / Sketch / paper prototype with linked screens — looks real, isn't. Used for unmoderated and moderated usability testing of a specific user journey before any code.

## Slug

`clickable-prototype` — referenced by AI agents matching a riskiest assumption to a candidate experiment. Cross-reference into canvases is via `experiment.appliesToCanvases[]`.

## At a glance

| | |
| --- | --- |
| **Theme** | Discovery |
| **Risks** | Desirability · Feasibility |
| **Evidence strength** | Medium |
| **Cost** | Cheap |
| **Setup time** | Days |
| **Run time** | Days |
| **Capabilities** | `ux-design` · `prototyping-tools` · `usability-testing` |
| **Applies to canvases** | `value-proposition-canvas` · `customer-journey` · `design-criteria-canvas` |

# Clickable Prototype — TL;DR for AI agents

**When to recommend.** Specific journey is the riskiest desirability/feasibility question. Or team has UX capacity, no engineering yet. Or stakeholder needs more than storyboard but pre-build.

**Strength of evidence.** Medium. Validates a *journey works*; does NOT validate willingness to pay or even unprompted use.

**Sample.** N=5-8 (Krug's 5-user rule). One target journey, ~10-20 screens.

**Setup / run.** Days / days.

**Capabilities.** `ux-design`, `prototyping-tools`, `usability-testing`.

**Decision tree.**

- Risk is "do they want this at all"? → Don't recommend. Use Customer Interview / Smoke Test.
- Interaction is novel + can't be faked in linked screens? → Wizard of Oz / Concierge.
- Stakeholder wants signoff on full product? → Push back to ONE journey.

**Anti-patterns.**

- Lorem-ipsum hides comprehension issues.
- Leading the user kills the test.
- Completion ≠ unprompted use.

**Cross-canvas.** Outputs sharpen `value-proposition-canvas` (which interactions remove pains), `customer-journey` (step-level friction), `design-criteria-canvas` (must-have vs nice-to-have on the journey).

## Sources

- Bland & Osterwalder · Testing Business Ideas · Wiley · 2019 · Discovery / Clickable Prototype
- Steve Krug · Rocket Surgery Made Easy · New Riders · 2010
