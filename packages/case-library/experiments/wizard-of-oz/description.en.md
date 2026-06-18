# Wizard of Oz

A working frontend with a fake automated backend — the user thinks they're using "the product"; really, your team is doing the work manually behind the curtain. Validates desirability and parts of feasibility before you build the (expensive) automation.

## When to use

- The expensive part of the product is the automation; the value to the customer is the *outcome*, not how it's achieved.
- You want to validate users will accept the output quality and use it repeatedly — over weeks, not minutes.
- The product premise involves AI / ML / matching / classification — you can substitute humans short-term.
- A Smoke Test passed (people signed up) and the next gate is "will they actually use it?"

Don't use:

- The automation IS the value (real-time at scale, cryptographic, deterministic). Manual won't substitute.
- You can't sustain the manual labor for a few weeks.
- Solution is so simple a Concierge (no backend illusion at all) is enough — Wizard of Oz adds infra cost for no extra signal.

## How to run

1. **Build a believable frontend.** It can be ugly; it has to convey "automated" — typing indicators, "processing…" states, instant-feeling responses.
2. **Recruit 5-15 paying or paying-intent customers.** Paid is much stronger signal than free; even $20/mo cheapens "yeah I'd use it" into something measurable.
3. **Operate the backend manually.** Set SLOs: "respond in 90 seconds", "deliver overnight", whatever the product would do automated.
4. **Track three things:** quality (do users accept the output?), retention (do they come back?), economics (is the manual cost survivable per user even if the price is realistic?).
5. **Disclose at the end.** Don't ride the illusion forever. Tell users it was operated manually; their reaction tells you whether they care.
6. **Run for 2-6 weeks.** Less and you don't see retention; more and you bleed.

## What good looks like

- 5-15 paying / paying-intent customers complete multiple cycles (not just first use).
- ≥ 60% retention to the second cycle, ≥ 40% to the fourth.
- Output quality is acceptable to the user even when delivered manually — meaning the automation isn't required for the value.
- You can describe the actual unit economics if automated.

## Anti-patterns

- ❌ Forget to disclose. Trust damage exceeds learning.
- ❌ Free users only. They'll use anything; their behavior doesn't predict paying use.
- ❌ Skip the SLO. Manual operations balloon timeline; users adapt to the slow speed and don't tell you they hated it.
- ❌ Run for 4 days. Retention isn't visible inside a week.
