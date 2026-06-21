# Strategy Framework Expansion Plan

This document records the consulting-framework expansion for PinGarden’s Strategy Library.

## Scope

First batch strategy frameworks:

1. `mckinsey-three-horizons`
2. `bcg-growth-share-matrix`
3. `mckinsey-7s`
4. `bain-elements-of-value`
5. `porters-five-forces`

First batch dedicated canvases:

1. `three-horizons-map`
2. `bcg-growth-share-matrix`

First batch data resources:

1. `world-bank-data-catalog`
2. `oecd-data-explorer`
3. `world-bank-enterprise-surveys`
4. `wipo-global-innovation-index`

## Relationship model

PinGarden should treat portfolio work as a family of related lenses:

| Tool | Role | Primary question |
|---|---|---|
| `portfolio-map` | Umbrella portfolio canvas | How do Explore and Exploit items differ by risk and return? |
| `three-horizons-map` | Time and maturity lens | How do today’s core, emerging growth, and future options connect over time? |
| `bcg-growth-share-matrix` | Market growth and share lens | Which businesses are Stars, Cash Cows, Question Marks, or Dogs? |

Use `portfolio-map` as the starting point when the problem is broad. Use `three-horizons-map` when the problem is growth sequencing. Use `bcg-growth-share-matrix` when market growth and relative share are the main portfolio-allocation criteria.

## Canvas design decisions

### `three-horizons-map`

Purpose: make McKinsey’s Three Horizons operational in PinGarden.

Core zones:

- `horizon-1-core` — current core businesses to defend and extend.
- `horizon-2-emerging` — emerging growth engines to scale.
- `horizon-3-options` — future options to explore.
- `migration-actions` — transitions, funding shifts, transfers, and governance actions.
- `evidence-risks` — assumptions, evidence gaps, and risks that determine whether a bet can move between horizons.

Related canvases:

- `portfolio-map`
- `business-model-canvas`
- `experiment-canvas`
- `evidence-scorecard`

### `bcg-growth-share-matrix`

Purpose: make BCG’s Growth-Share Matrix operational in PinGarden.

Core zones:

- `stars` — high market growth and high relative share.
- `cash-cows` — low market growth and high relative share.
- `question-marks` — high market growth and low relative share.
- `dogs` — low market growth and low relative share.
- `portfolio-actions` — invest, harvest, select, divest, reposition, or reframe decisions.

Related canvases:

- `portfolio-map`
- `business-model-canvas`
- `business-model-environment`

## Content quality policy

All files must satisfy `docs/STRATEGY_FRAMEWORK_QUALITY_STANDARD.md`.

In particular:

- Framework pages explain the method, source, use cases, canvas mapping, workflow, interpretation, examples, misuses, and references.
- Canvas bundles follow `docs/CANVAS_DISPLAY_CONTRACT.md`.
- Resources explain data role, canvas usage, limitations, and evidence discipline.
- Case links must be high-confidence and defensible.

## Source policy

Primary sources should be official or authoritative:

- McKinsey for Three Horizons and 7S.
- BCG for Growth-Share Matrix.
- Bain for Elements of Value.
- HBR/HBS for Porter’s Five Forces.
- World Bank, OECD, and WIPO for data resources.

Secondary explanatory material may be used for understanding but should not be the primary citation.
