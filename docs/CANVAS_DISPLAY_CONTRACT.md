# Canvas Display Contract

This document is the source of truth for how PinGarden canvas templates present titles, subtitles, module labels, and semantic colour legends.

## Core rule

Show each piece of information exactly once. Do not repeat the same canvas title, subtitle, or module title across the background SVG, template preview, and right-side knowledge panel.

## Display layers

### 1. Template identity

The template identity has one source of truth:

- Canvas name: `packages/canvases/<id>/manifest.json` → `name.{en,zh}`.
- Short tagline: `apps/web/src/i18n/{en,zh}.json` → `templates.<canvas-id>.tagline`.
- Template cards, add-canvas menus, related-canvas chips, and preview modal headers must use the manifest name.
- Workspace toolbar shows the canvas instance title.

Do not add `templates.<canvas-id>.name` in app i18n, and do not duplicate the template identity inside `bg.en.svg` / `bg.zh.svg` unless the words are part of a sentence template the user directly fills in.

### 2. Background SVG

`bg.en.svg` and `bg.zh.svg` should contain stable visual scaffolding only:

- geometry, regions, connectors, axes, helper lines;
- lightweight row/axis/stage helper labels that are part of the diagram;
- no duplicate canvas title or marketing subtitle;
- no static colour legend for editable sticky meanings.

If text is semantic and may need to stay in sync with interactions, put it in `i18n` or `manifest.display` instead of hardcoding it in SVG.

### 3. Zone/module labels

Zone titles and short prompts belong in per-canvas `i18n/{en,zh}.json`:

- `blocks.<zone-id>.title`
- `blocks.<zone-id>.prompt`

Render them through the React overlay (`ZoneLabel`) so live canvas and template preview use the same language and typography.

### 4. Template preview modal left side

The left side of `TemplatePreviewModal` is a structural preview, not a second title panel.

For structured previews:

```json
"display": {
  "preview": {
    "mode": "structured",
    "showTitle": false,
    "showSubtitle": false,
    "showBlockLabels": true,
    "showBlockPrompts": false
  }
}
```

Use `groupLabels` only for higher-level section names that are not zones, such as `Value Map` and `Customer Profile`.

### 5. Right-side knowledge panel

The right panel explains method and usage. It should not simply repeat the left preview. Prefer:

- when to use / when not to use;
- recommended filling order;
- quality checklist;
- common mistakes;
- references.

Short intro is fine, but avoid duplicating the exact title/subtitle already shown in the preview modal header.

### 6. Sticky colour legends

Colour meanings are interaction data, not background artwork.

If a template has default sticky colour semantics, declare them in `manifest.json`:

```json
"defaultColorLegend": [
  {
    "hex": "#FCF1A8",
    "label": { "en": "Functional Jobs", "zh": "功能性任务" },
    "description": { "en": "...", "zh": "..." }
  }
]
```

Do not draw those colour legends into the SVG. The app seeds them into the editable per-canvas sticky colour legend when the canvas document is empty.

## New canvas checklist

Before adding or changing a canvas bundle:

- [ ] `bg.en.svg` / `bg.zh.svg` contain scaffold, not duplicate canvas identity.
- [ ] Zone/module titles are in `i18n/{en,zh}.json`.
- [ ] Template preview behavior is declared in `manifest.display.preview`.
- [ ] Live canvas label behavior is declared in `manifest.display.canvas` only when it differs from defaults.
- [ ] Higher-level non-zone section labels use `display.*.groupLabels`.
- [ ] Default sticky colour meanings use `defaultColorLegend`, not SVG dots.
- [ ] Right-side knowledge focuses on method, not repeated title text.
- [ ] Run `pnpm typecheck` and `pnpm --filter @pingarden/web build`.
