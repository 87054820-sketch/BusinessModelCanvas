# Library evolution — add content without breaking the system

Use this workflow whenever you add a **new canvas template, case, business-model pattern, experiment, strategy framework, or resource**. The goal is to keep PinGarden's **Strategy Library** coherent: every new item must have a clear layer, cross-links, examples, UI surfacing, and skill guidance.

## Content architecture

PinGarden's Strategy Library has six layers. Pick the layer first; do not start by creating files.

1. **Case** — the application layer under `packages/case-library/cases/<slug>/`. Use when the content is a real company, industry, or comparison with canvases and stories.
2. **Canvas template** — the working-tool layer under `packages/canvases/<defId>/`. Use when users need a new structured place to think, analyse, or author stickies.
3. **Pattern** — the business-structure layer under `packages/case-library/patterns/<slug>/`. Use for reusable models like Multi-Sided Platforms, Free, Long Tail, or Open Innovation.
4. **Experiment** — the validation layer under `packages/case-library/experiments/<slug>/`. Use when the content tells users how to test a risky assumption.
5. **Strategy framework** — the analysis-lens layer under `packages/case-library/strategy-frameworks/<slug>/`. Use for lenses such as Blue Ocean, Scenario Planning, Platform Strategy, portfolio management, or environment scanning.
6. **Resource** — the source-material layer under `packages/case-library/resources/<slug>/`. Use for books, reports, articles, papers, or public material.

Keep the top-level UI name **Strategy Library / 策略库**. Keep **Resources / 资料** as a tab label only; do not rename the whole library to “resources” because resources are just the source-material layer.

## New canvas checklist

A canvas is not complete until all of these exist:

- `manifest.json` with stable `id`, bilingual `name`, zones, related canvases, display settings, and colour legend when useful.
- `bg.en.svg` and `bg.zh.svg` following the existing visual style: `#FAFAF7` background, `#1F2937` thin lines, no heavy decoration, no duplicate title/subtitle when the renderer supplies labels.
- `i18n/{en,zh}.json` with titles, prompts, and examples for every zone.
- `knowledge/intro.{en,zh}.md` and `knowledge/body.{en,zh}.md`.
- `CanvasThumb` branch so the Add Canvas picker has a recognizable thumbnail.
- At least one real case where the canvas is actually used, with a story embedding `::canvas[defId]{canvasId="..."}`.

## New framework / pattern checklist

A method page is not enough. For every new pattern or framework:

- Add metadata + bilingual description + skill pages.
- Add it to `manifest.json`.
- Link it to curated examples in `examples[]`.
- Add the reverse tag to each example case.
- Ensure each tagged case has story text that clearly teaches the method.
- If the method needs a new canvas to be understood, create that canvas and embed it in at least one example case.

## New resource checklist

Resources should help users choose what to read, not just cite sources.

- Use `resources/<slug>/resource.json` with type, authors, year, recommendation, related canvases/cases/patterns/experiments/frameworks, and sources.
- Add `description.en.md` and `description.zh.md` as reading notes.
- Add it to `manifest.json.resources[]`.
- Prefer the tab label **Resources / 资料** because the source may be a book, article, report, paper, or web page.

## Integration rules

- Never add a framework tag to a case without a story explaining it.
- Never add a canvas template without a thumbnail, Strategy Library surfacing, and at least one example case using it.
- Never create a resource that only lists a citation; it must say why it is recommended and what it helps answer.
- Prefer upgrading existing cases before creating new ones if the new method naturally explains them.
- When the library UI changes, keep the homepage CTA language, tab labels, tab intro copy, and workflow terminology aligned.
- If a packaged or desktop build is involved, verify the bundled `case-library/resources/<slug>/resource.json` files so the Resources tab cannot silently ship empty.

## Validation

After editing:

```bash
pingarden case validate --case-library-dir packages/case-library/cases
pnpm typecheck
pnpm --filter @pingarden/web build
```

If the generated skill is part of the release artifact, regenerate it after content changes so agents see the new canvases, workflows, frameworks, and references.
