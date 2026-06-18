# Reference: experiment library

Curated test recipes from **Bland & Osterwalder · Testing Business Ideas · Wiley · 2019**. Each experiment ships at `experiments/<slug>.{en,zh}.md` with structured metadata at `experiment.json` (see `Experiment` interface in `@pingarden/shared`). Skill-only surface for V1 — no HTTP routes, no LibraryPage tab, no `pingarden experiment` CLI subcommand. The library is consumed by AI agents through the markdown files.

## Cross-link to canvases

The forward edge is `experiment.appliesToCanvases[]` — each experiment names which canvases it most often validates. Canvases do NOT carry a reverse `validatesWith[]` field; the agent computes it on demand by walking the library when a user lands on a canvas.

## Match heuristic

When the user names a riskiest assumption, use this 3-step heuristic (full version in `workflows/experiments.md`):

1. Classify Desirability / Feasibility / Viability.
2. Decide Discovery (cheap, weak evidence, "is the direction plausible?") vs Validation (costlier, stronger evidence, "should we bet?").
3. Within the chosen set, narrow to 2-3 candidates by cost band, team capabilities, and canvas affinity. Return tradeoffs — never a single "right" answer.

## Filter signals

Each `experiment.json` carries:

- `theme`: `discovery` | `validation`
- `risks[]`: subset of `desirability` / `feasibility` / `viability`
- `evidenceStrength`: `weak` | `medium` | `strong`
- `cost`: `cheap` | `medium` | `expensive`
- `setupTime` / `runTime`: `hours` | `days` | `weeks`
- `capabilities[]`: kebab-case skill tags (e.g. `interview-design`, `landing-page-copy`, `payment-processing`)
- `appliesToCanvases[]`: canvas-id list (matches `packages/canvases/<id>/manifest.json`)

## What experiments are NOT

- ❌ Experiments are not patterns. Patterns describe HOW a business makes money; experiments describe HOW you test a hypothesis. Different content type, different surface.
- ❌ Experiments are not cases. Cases are concrete companies; experiments are reusable recipes that any case might run.
- ❌ The library is not exhaustive. V1 ships ~12 of the 44 in TBI; the agent should recommend "closest 2-3 from the library + flag the gap" if no perfect fit exists, rather than invent.
