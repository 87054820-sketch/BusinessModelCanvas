# Clickable Prototype

A linked-screen prototype in Figma / Sketch / Marvel / paper. Looks real, isn't. Built to test specific user journeys — onboarding, key task, recovery flow — before committing engineering. Bridges the gap between Storyboard (narrative) and Smoke Test (real demand).

## When to use

- A specific journey or interaction is the riskiest feasibility / desirability question — "can users complete onboarding without help?", "is this menu structure discoverable?".
- The team has UX capacity but doesn't yet want to commit engineering.
- You need to pressure-test a tricky design decision (information architecture, error recovery) before sinking sprints into the wrong shape.
- Stakeholder buy-in needs something more concrete than a storyboard.

Don't use:

- The risk is "do customers want this at all" — clickable doesn't reveal that. Run Customer Interview / Smoke Test.
- The interaction is genuinely novel and can't be faked in linked screens (real-time, sensor-driven). Use Wizard of Oz or Concierge.

## How to run

1. **Pick ONE journey.** Onboarding OR key task OR recovery — not all. ~10-20 screens max.
2. **Use real-looking content.** Lorem-ipsum kills the test; real names, real data, real edge cases.
3. **Recruit 5-8 target users.** Steve Krug's "5-user rule" — past 5 you find diminishing returns on usability issues per session.
4. **Give them a task, not a tour.** "Cancel your subscription" → silent observation.
5. **Watch for hesitation, re-clicks, abandonment.** A 10-second pause is louder than any verbal feedback.
6. **Iterate fast.** Fix between every session if you can; the test is for the design, not the design's fan club.

## What good looks like

- 4-of-6 complete the task without help, OR a clear failure pattern emerges (e.g., everyone misses the same affordance).
- Verbal feedback aligns with observed behavior — not "I loved it" while clicking the wrong button six times.
- You came out with a *changed* design after 5 sessions, not a confirmed one.
- The post-fix version increases task completion measurably (run a second mini-round).

## Anti-patterns

- ❌ Test the whole product. Test ONE journey.
- ❌ Lorem-ipsum content. Hides comprehension issues.
- ❌ Lead the user. "Just try clicking the menu" reveals nothing.
- ❌ Treat completion as validation — they completed your designed task, you didn't validate they'd do it unprompted in the wild.
