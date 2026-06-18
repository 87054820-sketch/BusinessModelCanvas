# Online Survey

> Quantitative survey of 100+ target customers to confirm whether interview-stage themes scale across the segment, and to compare relative pain / gain magnitudes.

## Slug

`online-survey` — referenced by AI agents matching a riskiest assumption to a candidate experiment. Cross-reference into canvases is via `experiment.appliesToCanvases[]`.

## At a glance

| | |
| --- | --- |
| **Theme** | Discovery |
| **Risks** | Desirability |
| **Evidence strength** | Weak |
| **Cost** | Cheap |
| **Setup time** | Days |
| **Run time** | Days |
| **Capabilities** | `survey-design` · `non-leading-questions` · `data-analysis` |
| **Applies to canvases** | `value-proposition-canvas` · `empathy-map` · `jobs-to-be-done` |

# Online Survey — TL;DR for AI agents

**When to recommend.** Interviews already done (5-12), need to know **which pain dominates across the segment**. Or user wants to compare 2-3 candidate themes at scale before committing.

**Strength of evidence.** Weak. Surveys quantify themes that interviews discovered; they DON'T validate willingness to pay (over-states by 2-3×).

**Sample size.** N≥100 from the actual segment (not a random panel). Below 100, the percentages are noise.

**Setup / run.** Days (pilot N=10 first, then full send), days (typical send window).

**Capabilities.** `survey-design`, `non-leading-questions`, `data-analysis`.

**Decision tree.**

- No interviews done? → Recommend Customer Interview FIRST. Surveys without qualitative grounding measure the wrong things.
- Interviews done, 2-3 themes to rank? → Online Survey is the right move.
- User wants to validate willingness to pay? → DON'T recommend Online Survey. Recommend Pre-Sale / Letter of Intent / Smoke Test.
- Can't reach N=100 of the real segment? → Suggest Discussion Forums / Search Trend Analysis instead.

**Anti-patterns to flag.**

- "Would you pay $X/mo?" — over-states by 2-3×. Strip pricing questions.
- N=12 with percentages — that's an interview round, not a survey.
- 30+ questions — kills completion + back-half quality.

**Cross-canvas.** Outputs sharpen `value-proposition-canvas` (which pain to prioritise as primary value driver), `empathy-map` (relative weight of Says/Thinks/Feels themes), `jobs-to-be-done` (which job is most underserved).

## Sources

- Bland & Osterwalder · Testing Business Ideas · Wiley · 2019 · Discovery / Online Survey
- Don A. Dillman · Internet, Phone, Mail, and Mixed-Mode Surveys · Wiley · 2014
