# Strategy Framework Quality Standard

PinGarden strategy-framework content must be useful as a working method, not just a citation card. Every new framework, data resource, case link, and canvas added for the consulting-framework expansion must satisfy this gate before it is added to `manifest.json`.

## 1. Strategy framework gate

Each `packages/case-library/strategy-frameworks/<slug>/` entry must include:

- `framework.json`
- `description.en.md`
- `description.zh.md`
- `skill.en.md`
- `skill.zh.md`

The bilingual descriptions must have equivalent depth and include:

1. **Method identity** — what the framework is, who or which institution it is associated with, and what strategic question it answers.
2. **When to use / when not to use** — concrete decision contexts, not generic advice.
3. **Category and role** — whether the method is a primary decision framework or a supporting lens such as `customer-value-lens`.
4. **Relationship to existing PinGarden methods** — how the framework differs from or complements `portfolio-map`, `business-model-environment`, `innovation-metrics`, `scenario-planning`, `value-proposition-canvas`, or other existing methods.
5. **Canvas mapping** — for every `relatedCanvasDefIds[]` entry, explain how the framework turns into canvas objects, zones, pins, stickies, axes, or interpretation rules.
6. **Usage workflow** — at least 5–7 practical steps covering inputs, canvas filling, interpretation, decision output, and next action.
7. **Result interpretation** — how to read common positions, shapes, quadrants, clusters, gaps, or signals.
8. **Example cases** — a `What to notice in examples` section explaining why each example is a real teaching case.
9. **Common misuses** — at least 4–6 method-specific anti-patterns.
10. **Authority sources** — official or primary sources where available. Use McKinsey, BCG, Bain, HBR/HBS, World Bank, OECD, WIPO, or comparable sources as primary citations.
11. **Operational skill guidance** — `skill.*.md` must include selection criteria, fill order, canvas mapping, questions to ask, and red flags.

## 2. Canvas gate

Each new `packages/canvases/<id>/` entry must include:

- `manifest.json`
- `bg.en.svg`
- `bg.zh.svg`
- `i18n/en.json`
- `i18n/zh.json`
- `knowledge/intro.en.md`
- `knowledge/intro.zh.md`
- `knowledge/body.en.md`
- `knowledge/body.zh.md`

Canvas quality requirements:

1. **Follow `docs/CANVAS_DISPLAY_CONTRACT.md`** — no duplicated canvas title/subtitle in SVG; zone titles and prompts live in i18n; colour meanings live in `defaultColorLegend`.
2. **Usable working surface** — the canvas must contain editable zones and prompts, not only a decorative background.
3. **Method-specific structure** — the layout must reflect the method’s analytical logic.
4. **Relationship clarity** — `related` and `relatedNotes` must explain how this canvas connects to upstream and downstream canvases.
5. **Knowledge panel depth** — explain when to use, fill order, interpretation, quality checklist, common mistakes, and references.
6. **Template discoverability** — add app tagline in `apps/web/src/i18n/{en,zh}.json` and a recognizable branch in `CanvasThumb.tsx`.
7. **Bilingual parity** — English and Chinese i18n and knowledge files must be equivalent in structure and usefulness.

## 3. Resource gate

Each `packages/case-library/resources/<slug>/` data resource must include:

- `resource.json`
- `description.en.md`
- `description.zh.md`

The reading notes must explain:

1. What data or public material the source provides.
2. Which strategic questions it supports.
3. How to turn the source into canvas stickies, assumptions, evidence notes, or portfolio judgments.
4. Which frameworks and canvases it supports.
5. Limitations: coverage, update frequency, lag, comparability, macro vs firm-level scope, and misuse risks.
6. Evidence discipline: data supports hypotheses; it does not prove a strategic choice by itself.

Raw datasets must not be downloaded into the app bundle. Link official portals or reports only.

## 4. Supporting lens policy

Some strategy frameworks are not primary decision canvases. They should remain in `strategyFrameworks`, but be marked with `analysisRole: "supporting-lens"` and a category such as `customer-value-lens`.

For supporting lenses:

1. Do not create a standalone canvas unless the method has its own working structure that cannot be represented through existing canvases.
2. Explain which existing canvases it annotates or interprets.
3. Require every tag or classification to map back to a real canvas object: VPC gains/gain creators/pain relievers, JTBD emotional-social jobs, Empathy Map evidence, or Customer Journey touchpoints.
4. Avoid checklist behaviour. The output should be a smaller set of high-confidence insights, not full coverage of every possible label.

## 5. Case link gate

When adding `appliesStrategyFrameworks[]` to a case:

1. The framework must explain a concrete part of the case’s strategic logic.
2. Do not tag a case only because the company is famous, innovative, or large.
3. Prefer fewer high-confidence examples over many weak links.
4. If the case lacks enough story/canvas evidence, either add a concise method-specific note or do not tag it.
5. Keep framework `examples[]` and case `appliesStrategyFrameworks[]` consistent.

## 6. Portfolio-management family relationship

`portfolio-map` remains the umbrella canvas for broad portfolio management.

- `portfolio-map` answers: what is in the portfolio, and how do risk/return positions differ between Explore and Exploit?
- `three-horizons-map` answers: how do H1 core businesses, H2 emerging growth engines, and H3 future options sequence over time?
- `bcg-growth-share-matrix` answers: which businesses or products are Stars, Cash Cows, Question Marks, or Dogs based on market growth and relative market share?

The specialized canvases complement `portfolio-map`; they do not replace it.

## 7. Acceptance checklist

Before completion:

- All JSON files parse.
- All new canvas directories have complete bundle files.
- All new framework and resource directories have complete bilingual content.
- Manifest order is intentional.
- Example cases and reverse tags match.
- `pnpm typecheck` passes.
- `pnpm --filter @pingarden/web build` passes.
- Local service is restarted so `BundleStorage` rescans content.
