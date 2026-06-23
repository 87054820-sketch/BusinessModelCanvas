# Strategy framework combinations — which methods chain, complement, or replace each other

PinGarden ships 16 strategy frameworks. They are not interchangeable. Some are sequenced (run A → then B), some are complementary (run side-by-side), some are alternatives (pick one). This workflow tells you which is which.

## When to use

Use this workflow when the user asks any of:

- "Should I use Framework A or Framework B?"
- "Where does Framework X fit in the process?"
- "What do I run after this analysis?"
- "Are these two frameworks saying the same thing?"

Read this BEFORE recommending a single framework — the answer is usually a *chain* of 2-4 frameworks, not one.

## The 6 categories (sorted by typical usage stage)

The library categorises every framework by what it analyses. Match the user's question to a category first, then pick the right framework inside the category.

| Category | Analyses | Frameworks |
| --- | --- | --- |
| environment-competition | What pressures the business from outside | pestel-analysis, business-model-environment-scan, porters-five-forces, blue-ocean-strategy |
| organization-ecosystem | What the firm itself / its ecosystem looks like inside | porters-value-chain, mckinsey-7s, platform-strategy |
| portfolio-growth | How a firm chooses what to invest in and how to grow | bcg-growth-share-matrix, ansoff-matrix, mckinsey-three-horizons, business-model-portfolio-management |
| innovation-evidence | How to manage / judge / measure innovation | disruptive-innovation, innovation-metrics |
| foresight-scenarios | How to plan under deep uncertainty | scenario-planning, performance-based-scenario-planning |
| customer-value-lens | How customers perceive value | bain-elements-of-value |

## Canonical chains by user question

### "Should we enter this market / industry?"

`pestel-analysis` → `business-model-environment-scan` → `porters-five-forces` → `business-model-canvas`

- PESTEL surfaces macro signals (Political/Economic/Social/Tech/Environmental/Legal).
- BMEScan compresses the BMC-relevant signals into BMG's 4 forces and pressure-tests against the BMC.
- Five Forces explains industry-level profit pressure (rivalry, buyers, suppliers, entrants, substitutes).
- BMC closes the loop: each pressure point must change a BMC block, or the analysis is unactionable.

### "Where is our actual moat?"

`porters-value-chain` → `business-model-canvas (KA/KR/KP)` → `mckinsey-7s` → `design-criteria-canvas`

- Value Chain locates the activity (or linkage) where cost or differentiation forms.
- BMC's Key Activities / Key Resources / Key Partners blocks are the higher-level map of those activities.
- 7-S checks whether the soft side (shared values, style, staff, skills) supports the activity hierarchy — without it, a service strategy or a quality strategy fails.
- Design Criteria encodes activity-level rules (e.g., gross margin ≥ 30%) the next iteration must respect.

### "What should we do with our current portfolio of businesses?"

`bcg-growth-share-matrix` → `business-model-portfolio-management` → `mckinsey-three-horizons` → `portfolio-map`

- BCG: classify every existing SBU (Star / Cash Cow / Question Mark / Dog).
- Business Model Portfolio Management: combine Explore (search) + Exploit (running businesses) on one map.
- Three Horizons: sequence in time (H1 core / H2 emerging / H3 future).
- Portfolio Map: PinGarden's canvas for risk × return × movement.

### "How should this one business grow next?"

`ansoff-matrix` → `business-model-canvas` → `design-criteria-canvas`

- Ansoff: pick a quadrant (penetration / market dev / product dev / diversification).
- BMC: identify which blocks must change for that quadrant.
- Design Criteria: encode constraints (must reuse channels / production base) so the team doesn't slip into a riskier quadrant by accident.

### "Is this new business a disruptive bet?"

`disruption-diagnosis` → `mckinsey-three-horizons` → `innovation-metrics` → `experiment-canvas`

- Disruption Diagnosis: pass Christensen's strict 3-part test (foothold + initial inferiority + upmarket trajectory), or honestly relabel it as sustaining / new-market entry / direct competition.
- Three Horizons: place the disruptive candidate as an H3 bet, organisationally insulated.
- Innovation Metrics: switch from mature-business KPIs to evidence-strength / learning-velocity / risk-reduction.
- Experiment Canvas: drive specific tests against the riskiest assumptions.

### "What if the future doesn't look like today?"

`pestel-analysis` → `scenario-planning` → `performance-based-scenario-planning` → `design-criteria-canvas`

- PESTEL: identify forces with high impact AND high uncertainty.
- Scenario Planning: build 2-4 plausible futures from the most uncertain forces.
- Performance-Based Scenario Planning: turn scenario work into an organisational project system that actually changes decisions.
- Design Criteria: encode the moves that are robust across multiple scenarios.

### "Why does our value proposition feel vague?"

`value-proposition-canvas` → `jobs-to-be-done` → `bain-elements-of-value` → `customer-journey`

- VPC: customer side (jobs / pains / gains) and value map (pain relievers / gain creators).
- JTBD: anchor functional / emotional / social jobs in concrete situations.
- Bain Elements: name which of the 30 value elements actually carry the value — instead of vague words like "convenient" or "premium".
- Customer Journey: locate where each element appears, strengthens, or breaks.

## Pairwise rules — when frameworks LOOK similar

These pairs cause the most confusion. Internalize the distinctions before recommending.

### PESTEL vs Business Model Environment Scan

Both scan external environment, but at different altitudes.

- PESTEL: 6 broad macro categories (Political/Economic/Social/Technological/Environmental/Legal). Output is raw signals.
- BMEScan: 4 BMG forces (Trends / Market / Industry / Macro). Output is BMC pressure points.
- BMEScan has a dedicated Industry Forces zone (competitors, new entrants, substitutes, suppliers, stakeholders) that PESTEL lacks.
- Flow: PESTEL upstream → BMEScan downstream → BMC pressure points. Use both; they are not interchangeable.

### Ansoff Matrix vs BCG Matrix

Both are 2×2 growth matrices, but they answer OPPOSITE questions.

- BCG: classifies *existing* businesses by share × growth → invest/harvest/divest decision. Portfolio-level, snapshot of present.
- Ansoff: picks the *direction* of growth for one business → product × market quadrant. Business-level, forward-looking.
- Per-BCG-quadrant mapping: Cash Cow → Ansoff penetration; Star → market or product dev; Question Mark → Ansoff is the decision tool; Dog → harvest or attempt diversification.
- Workflow: multi-business = BCG first, Ansoff per business. Single business = skip BCG, use Ansoff.

### Blue Ocean Strategy vs Disruptive Innovation

Both create new market space, but through DIFFERENT mechanics.

- Blue Ocean: value innovation — simultaneously RAISE buyer value and LOWER cost via the ERRC grid (Eliminate / Reduce / Raise / Create).
- Disruption: typically LOWERS initial mainstream performance to find a foothold in overshot or non-consumption customers, then climbs upmarket.
- They sometimes converge (e.g., new-market disruption can also reshape the value curve), but the strict tests differ. Blue Ocean does not require initial inferiority; Disruption requires it.

### Three Horizons vs Business Model Portfolio Management

Both manage a portfolio across time, but with different axes.

- Three Horizons: TIME-portfolio (today's core / 1-3y emerging / 3-10y future bets).
- Business Model Portfolio Management: RISK/RETURN portfolio (Explore searching for new models vs Exploit running existing ones), with Portfolio Map as the canvas.
- Use both: Three Horizons gives the time-sequencing question; Portfolio Management gives the search-vs-run question.

### McKinsey 7-S vs Porter's Value Chain

Both look inside the firm, but at different layers.

- 7-S: soft + hard alignment (Strategy / Structure / Systems / Shared Values / Style / Staff / Skills). Asks "is the organization coherent?"
- Value Chain: activity-level (9 activities + linkages). Asks "where in the activities does competitive advantage actually form?"
- Use both: Value Chain finds the load-bearing activity; 7-S checks whether the organisation can actually run that activity. A strategy that depends on activity X but has 7-S misalignment will fail.

## Anti-patterns — chains that LOOK reasonable but waste effort

- **PESTEL → BMEScan when you have no BMC yet**. BMEScan only adds value when there's something to pressure-test. If you're at "should we even enter?", stop at PESTEL.
- **Doing PESTEL AND BMEScan as two separate exhaustive sweeps**. The point of the chain is compression: BMEScan is the funnel for PESTEL signals. Don't double-count.
- **Running BCG on a single-business company**. There's only one bubble — the matrix doesn't help. Go straight to Ansoff.
- **Calling everything innovative "disruptive"** (the Uber misuse). If the new product is better than incumbents on mainstream dimensions, it's sustaining innovation. Honest labeling matters.
- **Putting a disruptive bet under the parent company's mature-business metrics**. Christensen's organisational prescription is insulation — without it, the disruption will be killed by margin pressure.
- **Treating Bain Elements as a 30-item checklist**. Strong propositions win by selecting a few elements that matter deeply to a segment, not by claiming all 30.
- **Doing 7-S without a strategy**. 7-S checks coherence WITH a strategy — without one, the seven boxes are just descriptive.

## Quick reference: user question → starting framework

| User question | Start with | Then |
| --- | --- | --- |
| "Should we enter this market?" | pestel-analysis | bmenvironment-scan, five-forces, BMC |
| "Why are our margins shrinking?" | porters-five-forces | porters-value-chain, BMC |
| "Where's our actual moat?" | porters-value-chain | mckinsey-7s, BMC |
| "Is our org ready for this strategy?" | mckinsey-7s | design-criteria-canvas |
| "Which businesses should we fund vs cut?" | bcg-growth-share-matrix | business-model-portfolio-management, ansoff-matrix per business |
| "How should this business grow next?" | ansoff-matrix | BMC, design-criteria-canvas |
| "What does our innovation portfolio look like over time?" | mckinsey-three-horizons | business-model-portfolio-management, innovation-metrics |
| "Is this candidate disruptive?" | disruption-diagnosis | three-horizons, innovation-metrics |
| "How do we measure exploration bets?" | innovation-metrics | experiment-canvas, evidence-scorecard |
| "What if the future is different?" | pestel-analysis | scenario-planning, performance-based-scenario-planning |
| "How do we run scenarios as a real process?" | performance-based-scenario-planning | design-criteria-canvas |
| "How does our network compound?" | platform-strategy | platform-ecosystem-map, BMC |
| "Why is our value prop vague?" | bain-elements-of-value | VPC, JTBD, customer-journey |
| "How do we open a new market with low cost + high value?" | blue-ocean-strategy | blue-ocean-canvas (strategy canvas / ERRC), BMC |

## What this workflow does NOT cover

- It does not tell you how to FILL a framework — that's in each framework's `strategy-frameworks/<slug>.<lang>.md` page.
- It does not tell you which CASES exemplify a framework — that's in each framework's `examples[]` and the case's `appliesStrategyFrameworks[]`.
- It does not enforce a single canonical chain. Strategy work is reflexive — finishing BMEScan might surface new PESTEL signals, finishing Disruption Diagnosis might invalidate the chosen H3 bet. Re-run upstream when downstream evidence demands it.
