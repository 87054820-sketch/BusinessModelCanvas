# Canvas Knowledge Quality Framework

This framework keeps official canvas knowledge useful for beginners without turning every surface into a duplicated article. The governing rule is **Single Source, Multiple Surfaces**:

- Long explanations live in `packages/canvases/<canvas-id>/knowledge/`.
- Cards, popovers, modal tabs, editor hints, and agents reuse that source plus short metadata.
- `manifest.learning` is a guide and index, not another body document.
- Source ledgers record grounding; they do not replace readable teaching.

## Surface-First Standard

Every library entry point must stand on its own. A canvas cannot receive an A just because some other tab contains enough content.

| Surface | Required Job |
|---|---|
| Learning guide (`manifest.learning`) | Answer why to open it, who it is for, key concepts, first steps, expected outcomes, practice prompts, source refs, related refs, and next refs. |
| Usage intro (`knowledge/intro.*.md`) | Explain the problem scenario, when to use, when not to use, read-before concepts, first step, output, and next step. |
| Canvas manual (`knowledge/body.*.md`) | Explain inputs, outputs, filling sequence, interpretation, quality checks, common mistakes, and handoff to modules or adjacent canvases. |
| Module chapters (`knowledge/blocks/<zone>.*.md`) | Explain module purpose, good vs weak answers, common misreads, sticky examples, transfer questions, and source grounding. |

This is the BCG lesson: a canvas with many module files can still feel weak if the default guide or the usage intro is thin.

## Quality Score

Run:

```bash
pnpm audit:canvas-quality
pnpm audit:canvas-quality -- --first-slice
pnpm audit:canvas-quality -- --json
pnpm audit:canvas-quality -- --fail-under=90
```

The score is out of 100:

| Dimension | Points | What It Rewards |
|---|---:|---|
| Surface readiness | 15 | Independent readiness of learning guide, intro, and body handoff. |
| Canvas manual | 14 | Bilingual intro/body, readable structure, use/not-use, inputs/outputs, fill order. |
| Module coverage | 16 | Bilingual block docs plus i18n prompt/examples fallback for every zone. |
| Module depth | 16 | Teaching structure in each module: purpose, quality bar, mistakes, examples, transfer, source. |
| Beginner scaffolding | 12 | Concept explanations, common misreads, concrete examples, recommended path. |
| Practice transfer | 10 | Sticky-ready examples, migration questions, outputs, next canvas or experiment. |
| Reuse navigation | 10 | Short learning metadata, `LearningReference` links, related canvases, color legend. |
| Source governance | 4 | `knowledge/source-ledger.json` with qualified sources and coverage. |
| Bilingual parity | 3 | EN/ZH source files and module prompts move together. |

Score bands:

| Score | Grade | Meaning |
|---:|---|---|
| 90+ | A | Official learning quality. Every entry surface is usable. |
| 72-89 | B | Useful, but one or more surfaces are not yet strong enough for lighthouse content. |
| 58-71 | C | Needs a focused upgrade before promotion. |
| <58 | D | Urgent. New users are likely to miss how to use the canvas. |

## A-Level Hard Gates

These caps intentionally prevent "overall content" from hiding a weak first impression:

- Missing `manifest.learning` caps the score below A.
- Missing `knowledge/source-ledger.json` caps the score below A.
- `learningGuideReadiness < 80` caps the score below A.
- `introReadiness < 80` caps the score below A.
- `bodyHandoffReadiness < 70` caps the score below A.
- Missing bilingual module docs for any zone caps the score below A.

The audit report shows `surface` as `guide / intro / body` so reviewers can distinguish "default guide is thin" from "usage tab is thin" or "manual has no handoff."

## Source Standard

Official canvas knowledge should be grounded primarily in formal books, official method pages, professional institution pages, academic material, or industry reports. Do not use ordinary blogs, anonymous summaries, or thin SEO articles as primary sources.

Each canvas should have:

- At least two qualified sources in `knowledge/source-ledger.json`.
- Source coverage for `intro`, `body`, and every block.
- Core concepts traceable to a book chapter, official method page, HBR/McKinsey/BCG/Shell/Strategyzer-style source, academic source, or industry report.

## Content Templates

Use these templates as structure, not as filler. If a section has nothing meaningful to say, the canvas probably needs more research before writing.

### `manifest.learning`

Keep it short enough for cards, popovers, and modal guide tabs:

```json
{
  "learning": {
    "level": "beginner | intermediate | advanced",
    "headline": { "en": "What decision this helps with", "zh": "它帮助用户做什么判断" },
    "whyOpen": { "en": "Why click this canvas now", "zh": "为什么现在要点开它" },
    "audience": { "en": "Who should use it", "zh": "适合谁使用" },
    "keyConcepts": [
      { "en": "Concept", "zh": "概念" }
    ],
    "firstSteps": [
      { "en": "The first concrete action", "zh": "第一个具体动作" }
    ],
    "outcomes": [
      { "en": "What the user should produce", "zh": "用户读完或填完应得到什么" }
    ],
    "commonMisreads": [
      { "en": "A likely misunderstanding", "zh": "常见误读" }
    ],
    "practicePrompts": [
      { "en": "A transfer question", "zh": "迁移问题" }
    ],
    "sourceRefs": [],
    "relatedRefs": [],
    "nextRefs": []
  }
}
```

### `knowledge/intro.*.md`

The intro is the modal usage tab. It must work even if the learning guide is hidden.

```markdown
# Canvas Name

One paragraph: the practical decision/problem this canvas helps with.

## When To Use

Use it when...

## When Not To Use

Do not use it when...

## Concepts To Know First

Define the few ideas a beginner must know before reading the canvas.

## First Step

Tell the user exactly what to collect or write first.

## Output

Name the artifact, decision, or conversation the user should have after using it.

## Next Step

Name the adjacent canvas, case, experiment, or module chapter to open next.
```

### `knowledge/body.*.md`

The body is the canvas manual:

```markdown
# Reading The Canvas

Explain how to read the whole canvas.

## Inputs And Outputs

Inputs: source material, data, cases, research, evidence.
Outputs: the decision, map, assumptions, or action list.

## Filling Sequence

1. Start with...
2. Then...
3. Finish by...

## Quality Checklist

- A strong answer...
- A weak answer...
- Check this before acting...

## Common Mistakes

Name mistakes that produce false confidence.

## Handoff

Explain which module chapter, related canvas, experiment, or case to open next.
```

### `knowledge/blocks/<zone>.*.md`

Each module chapter should be a small lesson:

```markdown
# Module Name

## Purpose

What decision this module changes.

## Good Answers vs Weak Answers

Good answers...
Weak answers...

## Common Misreads

What beginners often confuse.

## Sticky Examples

- Example sticky...

## Transfer Questions

- What would this mean for your project?

## Source Grounding

Name the book, official method page, or professional source that supports this module.
```

## Upgrade Workflow

1. Run `pnpm audit:canvas-quality -- --json` and inspect `surface.details`.
2. Fix `manifest.learning` only with short guide metadata.
3. Fix `intro` until it can stand alone as a usage page.
4. Fix `body` until it explains inputs, outputs, quality checks, and handoff.
5. Fix module chapters only where depth or source coverage is weak.
6. Run source and learning audits before typecheck/build.

## Definition Of Done

For official canvas content:

- All 20 canvases score at least `90 / A`.
- Every canvas has `knowledge/source-ledger.json`.
- `learning`, `intro`, `body`, and module docs all pass their own surface requirements.
- No long-form prose is duplicated into metadata.
- EN/ZH content moves together.
- Gates pass:
  - `pnpm audit:canvas-quality -- --fail-under=90`
  - `pnpm audit:canvas-sources -- --all`
  - `pnpm audit:learning`
  - `pnpm typecheck`
  - `pnpm --filter @pingarden/web build`
