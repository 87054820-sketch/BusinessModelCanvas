# Block Guidance Authoring Guide

This doc tells you **how to write the per-block guidance markdown** that
populates the right-side block inspector when a user clicks a zone on a
canvas. Every canvas bundle in this folder follows the same conventions
so the inspector layout stays consistent and a future AI Copilot can
parse the same structure for all canvas types.

If you are adding a new canvas type, copy this template into the new
bundle's `knowledge/blocks/` and fill it in.

> **Scope of this version (V1).** Pure markdown, no schema. Sections are
> all optional. Just keep the headings canonical so cross-canvas tooling
> can recognize them. See **Progressive upgrade path** at the end for
> what V2 (remark directives) and V3 (first-class JSON) look like.

---

## Where these files live

```
packages/canvases/<canvas-id>/
└── knowledge/
    ├── intro.{en,zh}.md          # canvas-level intro (long-form)
    ├── body.{en,zh}.md           # canvas-level body (long-form, optional)
    ├── assets/                   # block reference images go here
    │   └── industry-forces-detail.zh.png
    └── blocks/
        ├── <zone-id>.en.md       # per-block guidance (this file's topic)
        └── <zone-id>.zh.md
```

`<zone-id>` matches the `id` of a zone in the bundle's `manifest.json`.
The server loader (`apps/server/src/canvasDefs/loader.ts`) reads these
files on every `GET /canvas-defs/:id` request — **no boot cache, no
restart needed**, edits show up on the next request.

The web client receives them as `CanvasKnowledge.blocks: Record<zoneId, string>`
(`apps/web/src/api/client.ts`) and hands the raw markdown to
`BlockInspector` → `<Markdown variant="block-guidance" />`
(`apps/web/src/components/Markdown.tsx`).

---

## Canonical structure

In the order the inspector reads top-to-bottom:

```markdown
# 块标题(Block Title in English)

![Strategyzer reference](assets/<slug>-detail.<lang>.png)

{Intro paragraph — what this block IS, the lens it provides, who
should care, and the one-sentence elevator description. 1–3 short
paragraphs max.}

## 五个子类别 / Sub-categories                        ← optional

### 子类别 1 / English Name 1

> *One-line italic abstract that says what this sub-category covers.*

**核心问题。** Question 1? Question 2? Question 3? *(Optional concrete
examples in italics at the end: e.g. high-speed trains vs airplanes.)*

### 子类别 2 / English Name 2

> *...*

**核心问题。** ...

## 落到便签上的示例 / Examples                        ← optional

- **Sub-category 1 label** ——「Example sticky text in plain language」
- **Sub-category 2 label** ——「...」

## 如何流向 BMC / How it flows into BMC                ← optional

{One paragraph naming which BMC blocks this guidance most directly
hits. End with one bold takeaway sentence — the kind of "if you
remember one thing" line that survives summarization.}
```

### Heading semantics (read this carefully)

| Heading | Role | Renders as |
|---|---|---|
| `# Title` | Block name (Chinese + English in parens). One per file. | Big bold title. |
| `## Section` | Major section: intro, sub-categories, examples, flow-to-BMC. | Section heading. |
| `### Sub-category` | One sub-category inside a `## Sub-categories` section. | **Card** (rounded border + light shadow + inner padding). The card auto-encloses the H3 plus all following siblings until the next H1/H2/H3. |
| `> *italic text*` | When it directly follows an `### Sub-category` heading: the sub-category's one-line abstract. Renders as a tight gray subtitle inside the card. | Deck/subtitle. |
| `**核心问题。**` / `**Main Qs.**` | Bold lead-in for the questions paragraph inside a sub-category card. | Bold inline. |

> **The card behavior is the only "magic" rule.** Everything else is
> plain markdown. If a block doesn't need sub-categories (e.g. JTBD's
> `situation`, Empathy Map's `persona`), just skip the H3 layer
> entirely — no cards will render. This is exactly what BMC, JTBD,
> Empathy Map, VPC, Ad-Lib, and Portfolio Map do today.

### Tone / voice conventions

- **Bilingual headings.** For BME's pattern, write `### 中文 / English`
  in H3 sub-category titles so both audiences scan the same heading.
  Keep both sides short.
- **Plain language sticky examples.** In the `落到便签上的示例` /
  `Examples` section, wrap each example in 「Chinese corner-quotes」
  (or "English smart-quotes") to signal it's a verbatim sticky a user
  might write — not a definition.
- **Strong takeaway in flow-to-BMC.** End the file with a one-sentence
  bold takeaway. Short. Memorable. The thing a tired reader keeps.
- **No hardcoded English in the .zh file** (and vice versa). i18n is
  load-bearing for this project — see CLAUDE.md.

### Images

- Put reference imagery in `knowledge/assets/<slug>-detail.<lang>.png`.
- Reference with relative paths: `![alt](assets/foo.png)` — the
  `<Markdown>` component resolves these against the bundle's asset
  route automatically.
- Click-to-zoom is wired up via the global lightbox; just use a normal
  markdown image.

---

## Worked example — BME's `industry-forces.zh.md`

Skim `packages/canvases/business-model-environment/knowledge/blocks/industry-forces.zh.md`
for the canonical reference. It hits every section with five
sub-categories and is the file the V1 card behavior was designed
against.

---

## Progressive upgrade path

The V1 markdown layout is intentionally a **convention, not a schema.**
We can deepen the structure later without breaking any existing files:

### V1 — today (you are here)

Plain markdown. H3 = sub-category card. No metadata. Authors only
need to know markdown.

**Pros**: zero authoring friction; every file is human-readable on
GitHub; loader is dumb (just file→string).

**Cons**: sub-categories are not addressable from code — you can't
ask "give me the abstract of `competitors-incumbents`" without
parsing markdown.

### V2 — opt-in remark-directive (additive, no migration)

Introduce `remark-directive` and let authors opt into a richer
structure on a per-section basis:

```markdown
## 五个子类别

:::subcategory{id="competitors-incumbents" title="(现有)竞争对手 / Competitors (Incumbents)" abstract="识别在位竞争对手,并描述它们的相对实力。"}

**核心问题。** 谁是我们的竞争对手?...

:::

:::subcategory{id="new-entrants" title="新进入者 / New Entrants" abstract="..."}

**核心问题。** ...

:::
```

Renderer changes:
- Add `remark-directive` to the rehype/remark pipeline.
- Map `subcategory` directive → the same card component the V1
  H3-grouping plugin emits, just with the title/abstract pulled from
  attributes instead of inferred from H3 + blockquote.
- V1 files (no directives) keep working unchanged.

**Why bother**: the `id` and `abstract` become machine-readable. The
AI context endpoint (`apps/server/src/http/aiContext.ts`) can hand the
LLM "this sticky belongs to sub-category `competitors-incumbents`"
instead of a fuzzy substring match.

### V3 — first-class `subcategories[]` on `BlockI18n` (later)

Promote sub-categories to a typed shared schema:

```ts
// packages/shared/src/index.ts
export interface Subcategory {
  id: string;
  title: { en: string; zh: string };
  abstract: { en: string; zh: string };
  mainQuestions: { en: string; zh: string };
}

export interface BlockI18n {
  title: string;
  prompt?: string;
  examples?: string[];
  subcategories?: Subcategory[];  // ← new
}
```

Loader extracts `subcategories[]` from V2 directive nodes (or from a
sibling `<zone-id>.subcategories.json` for authors who prefer JSON).
Existing V1 files just don't expose `subcategories` — backward
compatible.

What this unlocks:
- **AI context** can return structured `subcategories[]` per block
  instead of opaque markdown — more compact, more useful for prompting.
- **BlockInspector** can render an explicit "+ Add sticky to Competitors"
  button per sub-category, instead of users having to manually tag.
- **Sticky `zoneHistory`** can store a `subcategoryId` so cross-canvas
  reasoning ("which sub-category is this sticky really about?")
  becomes possible.
- **Cross-canvas relationship chips** (already shown in the inspector
  via `manifest.json`'s `related[]`) can be sub-category-aware.

When we go to V3 we **don't** delete the markdown files — they still
hold the long-form prose (intro, examples, flow-to-BMC). We just lift
the sub-category metadata out into typed data. Single source of
truth, two views.

---

## Checklist for a new block guidance file

- [ ] H1 title in `# 中文 (English)` form.
- [ ] Optional reference image right after the title.
- [ ] 1–3 paragraphs of intro.
- [ ] Sub-categories: each is `### 中文 / English` + `> *italic abstract*`
      + `**核心问题。/Main Qs.**` paragraph. Skip this whole section if
      the block has no sub-structure.
- [ ] Sticky examples in 「Chinese corner-quotes」, one bullet per
      sub-category (or per theme).
- [ ] Flow-to-BMC paragraph ending in one bold takeaway.
- [ ] EN file (`<zone-id>.en.md`) and 中文 file (`<zone-id>.zh.md`)
      both exist and stay in lockstep.
- [ ] No hardcoded prose in components — all user-facing text lives
      in this .md or in the bundle's `i18n/{en,zh}.json`.
