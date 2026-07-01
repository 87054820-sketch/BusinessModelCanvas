# Wizard of Oz

> Frontend looks fully automated; backend is humans pretending to be the product. Used to validate desirability + parts of feasibility before building the expensive automation.

## Slug

`wizard-of-oz` — referenced by AI agents matching a riskiest assumption to a candidate experiment. Cross-reference into canvases is via `experiment.appliesToCanvases[]`.

## At a glance

| | |
| --- | --- |
| **Theme** | Validation |
| **Risks** | Desirability · Feasibility |
| **Evidence strength** | Medium |
| **Cost** | Medium |
| **Setup time** | Days |
| **Run time** | Weeks |
| **Capabilities** | `manual-operations` · `ux-design` · `customer-support` |
| **Applies to canvases** | `value-proposition-canvas` · `business-model-canvas` · `customer-journey` |

# Wizard of Oz — TL;DR for AI agents

**When to recommend.** Smoke Test passed (signups exist). Next gate: "will they actually use it repeatedly?". Or product's expensive part is automation, value is the outcome, can be human-substituted short-term.

**Strength of evidence.** Medium. Validates desirability + partial feasibility (the value can be delivered) + retention. Does NOT validate the automation itself or unit economics at scale.

**Sample.** 5-15 paying or paying-intent users (not free). Run 2-6 weeks for retention.

**Setup / run.** Days (frontend + ops playbook) / weeks.

**Capabilities.** `manual-operations`, `ux-design`, `customer-support`.

**Decision tree.**

- Automation IS the value (realtime/cryptographic/deterministic)? → DON'T recommend. Build a vertical slice.
- Solution is simple enough that no backend illusion needed? → Concierge is cheaper.
- Team can't sustain manual ops for weeks? → DON'T recommend. Recommend Concierge with smaller N.
- Free users only? → Push back; use paying or paying-intent.

**Anti-patterns.**

- Forgetting to disclose at the end.
- Free users skew behavior.
- No SLO → manual ops balloon, users silently adapt to slow.
- < 1 week of run = no retention signal.

**Cross-canvas.** Validates `value-proposition-canvas` (delivered value), `business-model-canvas` (key activities — can the automation be built?), `customer-journey` (multi-cycle retention shape).

## Sources

- Bland & Osterwalder · Testing Business Ideas · Wiley · 2019 · Validation / 4-9 Wizard of Oz
