# Case Story Quality Standard

Case-library stories are the explanatory layer of a case. A story must help a newcomer understand the strategic move before and after looking at the canvases; it must not be a two-line caption plus embedded canvases.

## Required structure

Every published case story should include, in this order:

1. **Context and tension** — what market, customer problem, organizational constraint, or competitive trap existed before the move.
2. **Strategic move** — what the company changed, with clear trade-offs.
3. **Canvas reading guide** — introduce each embedded canvas before or after it appears, explaining what a reader should notice.
4. **Mechanism** — why the model works economically, operationally, and organizationally.
5. **Risks and limits** — what could break, what assumptions are fragile, or what the case does not prove.
6. **Transfer lesson** — how a reader should apply the case pattern or framework elsewhere.

## Minimum quality bar

- Target length: **900–1,600 words in English** or **1,200–2,400 Chinese characters** for a normal case story.
- A story must contain at least **four `##` sections** beyond the title.
- Do not place two canvases back-to-back without an explanatory bridge.
- Do not restate every sticky. Explain the relationships between blocks.
- Mention the relevant framework or pattern explicitly when the case is tagged with one.
- Include enough company context for a beginner who has never heard of the case.
- Use concrete facts where available; do not invent exact financial numbers without a source.

## Multiple stories per case

A company can have more than one story. Preserve the original business-model story when it is useful, then add a second framework-specific or pattern-specific story when the case supports another reading.

Recommended story types:

- **Business model story** — explains the BMC and operating/economic logic.
- **Strategy framework story** — explains how a strategic analysis method applies.
- **Pattern story** — explains the reusable business-model mechanism.
- **Culture story** — explains organizational outcomes, behaviors, enablers, and blockers.

## Strategy framework story profiles

### Blue Ocean Strategy

For `appliesStrategyFrameworks: ["blue-ocean-strategy"]`, the story must additionally explain:

1. **Red ocean baseline** — the industry rules and competition factors before the move.
2. **Noncustomers / new demand** — which overlooked buyers or noncustomers were activated.
3. **ERRC logic** — what was eliminated, reduced, raised, and created.
4. **Value curve reading** — why the curve shape is different, not merely higher.
5. **BMC consequences** — how the value curve changes customer segments, value propositions, key activities/resources, cost structure, and revenue streams.

Strategic rationale belongs in the story. The Strategy Canvas itself should stay visually clean: use factors, curve classes, and score points; do **not** put long explanatory stickies on the chart.

### Business Model Environment Scan

For `business-model-environment-scan`, the story must explain:

1. **External forces** — key trends, market forces, industry forces, and macro-economic forces.
2. **Threats and opportunities** — which forces pressure the model and which create openings.
3. **BMC pressure points** — which BMC blocks are affected and how.
4. **Strategic response** — what the company changed or should monitor.
5. **Uncertainty** — which signals remain weak, ambiguous, or time-sensitive.

### Business Model Portfolio Management

For `business-model-portfolio-management`, the story must explain:

1. **Portfolio Map embedded in the story** — a tagged portfolio case must include at least one `portfolio-map` canvas and the story must embed it with `::canvas[portfolio-map]{canvasId="..."}`.
2. **Portfolio unit of analysis** — business models, business units, products, ventures, or value propositions. Do not mix levels.
3. **Explore / Exploit split** — which items are current engines and which are future options.
4. **Map placement** — why each item has its risk/return position.
5. **Portfolio actions** — ideate, persevere, pivot, retire, spinout, transfer, invest; acquire, merge, partner, improve, divest, dismantle.
6. **Movement over time** — how the portfolio changes as evidence, risk, and scale change. For dynamic cases, prefer multiple dated Portfolio Maps or a movement table.
7. **Evidence and risks** — what supports the placement and what could invalidate it.

### Bain Elements of Value

For `bain-elements-of-value`, the story must treat the framework as a **customer value lens**, not as a standalone strategy canvas. It should explain:

1. **Primary customer segment and situation** — which customer context makes the value element matter.
2. **VPC mapping** — which `gains`, `gain-creators`, or `pain-relievers` carry the value.
3. **JTBD evidence** — which functional, emotional, or social job explains why the value is important.
4. **Journey touchpoint** — where the value is actually perceived, amplified, or broken.
5. **Focus** — the few value elements that define the proposition; never claim all 30.
6. **Evidence boundary** — which value claims are supported by customer behaviour versus only brand/marketing interpretation.

### Future Innovation Metrics

For a future `innovation-metrics` framework, the story should explain risk reduction, evidence strength, learning velocity, cost, expected return, and the difference between exploration metrics and execution KPIs.

## Pattern story profile

For `appliesPatterns[]`, a story or story section must explain:

1. **Pattern mechanism** — the reusable business-model move, not just the case event.
2. **BMC block impact** — which 5–6 BMC blocks reveal the pattern.
3. **Why this case fits** — why the tag is primary or secondary.
4. **Failure mode** — what goes wrong when the pattern is copied superficially.
5. **Transfer lesson** — how another company should adapt, not clone, the pattern.

For Invent / Shift Patterns from *The Invincible Company*, stories must state whether the case is inventing a new model or shifting an established one.

## Culture Map story profile

For `innovation-culture-map`, the story must explain:

1. **Outcomes** — what the current culture produces and what the desired culture should produce.
2. **Behaviors** — what people repeatedly do, not what leadership says they value.
3. **Enablers** — incentives, rituals, resources, metrics, leadership actions, and structures that support desired behavior.
4. **Blockers** — policies, KPIs, approval gates, fear, and resource conflicts that prevent innovation.
5. **Connection to portfolio or experiments** — how culture enables Explore/Exploit, cheap learning, transfer, or scaling.

## Anti-patterns

- A single paragraph followed by two embedded canvases.
- A story that assumes the reader already knows the company.
- A Strategy Canvas covered with sticky-note explanations.
- A BMC story that lists blocks without explaining causal links.
- A case tagged with a framework or pattern but never explaining how it applies.
- A portfolio story that says “innovative company” without showing Explore/Exploit or movement over time.
- A Culture Map that lists values but not behaviors, enablers, and blockers.
