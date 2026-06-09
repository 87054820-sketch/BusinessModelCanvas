# PinGarden Canvas Bundle Inventory Report

## 1. Manifest Structure Overview

All seven canvases follow a consistent `manifest.json` schema:

**Top-level keys:**
- `id` — unique identifier (e.g. `business-model-canvas`)
- `name` — localized display name (`Record<'en'|'zh', string>`)
- `viewBox` — SVG canvas dimensions `[minX, minY, width, height]`
- `background` — localized SVG background filenames (`{ en, zh }`)
- `zones` — array of editable regions (see below)
- `display` — optional rendering hints (`canvas` and `preview` subconfigs)
- `related` — array of cross-canvas pairings (e.g. BMC links to Environment, Value Proposition Canvas)
- `defaultColorLegend` — optional per-sticky-color semantics (used by JTBD only so far)
- `plugin` — optional engine override (`'axis-grid'` for Portfolio Map; `'chart-canvas'` for future charts)
- `objectTypes` — declarative content types allowed (future; defaults to `['sticky']`)

**Zone structure** identifies each block:
```json
{
  "id": "key-partners",
  "shape": { "type": "rect", "x": 0, "y": 0, "w": 238, "h": 572 },
  "label": { "x": 12, "y": 24, "align": "left" }
}
```
Zones carry **geometry only** — no guidance text. Titles, prompts, and examples live in i18n files.

**Key observation:** No `aiGuidance` or `methodology` field in manifest; guidance is pure markdown in `knowledge/blocks/`.

## 2. i18n/{en,zh}.json Structure

**Sample EN file (Business Model Canvas):**

```json
{
  "canvasTitle": "Business Model Canvas",
  "blocks": {
    "key-partners": {
      "title": "Key Partners",
      "prompt": "Who are your key partners and key suppliers?",
      "examples": [
        "Cloud infrastructure provider (AWS / Aliyun)",
        "Channel reseller in Southeast Asia",
        "Open-source community / upstream maintainer"
      ]
    },
    "key-activities": {
      "title": "Key Activities",
      "prompt": "What must you do to deliver the value proposition?",
      "examples": [
        "Continuous product engineering",
        "Customer onboarding workshops",
        "Daily content moderation"
      ]
    }
    // ... 7 more blocks
  }
}
```

**Per-block fields:**
- `title` — zone display name (rendered by React overlay, not in SVG)
- `prompt` — short one-liner hint (1–2 sentences, action-oriented question)
- `examples` — array of 3 sticky-text examples (one-click seeding in inspector)

**Full guidance** lives in `knowledge/blocks/<zone-id>.{en,zh}.md`:
```markdown
# Key Partners (重要合作)

[Intro paragraph — what this block IS, the lens it provides...]

## Sub-categories / Types

### Strategic Alliances between Non-Competitors
> *Abstract...*
**Core Questions.** Question 1? Question 2?...

## Examples

- **Sub-category label** ——「Sticky text example」

## How it flows into BMC

[Flow paragraph + bold takeaway sentence]
```

## 3. Canvas Comparison Matrix

| Canvas | Zones | Has i18n Guidance? | Has Examples? | Has defaultColorLegend? | Related Canvases |
|--------|-------|-------------------|---------------|------------------------|-----------------|
| **business-model-canvas** | 9 | ✓ (markdown files) | ✓ (3 per block) | ✗ | BME, VPC, Portfolio, Design, Experiment |
| **business-model-environment** | 4 | ✓ (markdown files) | ✓ (3 per block) | ✗ | BMC |
| **value-proposition-canvas** | 6 | ✓ (markdown files) | ✓ (3 per block) | ✗ | BMC, Empathy, JTBD, Ad-Lib, Journey, Design, Experiment |
| **portfolio-map** | 2 | ✓ (markdown files) | ✓ (3 per block) | ✗ | BMC |
| **empathy-map** | 7 | ✓ (markdown files) | ✓ (3 per block) | ✗ | VPC, JTBD, Journey |
| **ad-lib-value-proposition** | 8 | ✓ (markdown files) | ✓ (3 per block) | ✗ | VPC, JTBD |
| **jobs-to-be-done** | 4 | ✓ (markdown files) | ✓ (3 per block) | ✓ (Functional/Emotional/Social) | VPC, Empathy, Ad-Lib, Journey |

**Key finding:** All seven canvases are **feature-complete** with examples. Guidance lives in markdown bundles, not in manifest. JTBD is the only canvas with a semantic color legend (defaultColorLegend).

## 4. TypeScript Types (packages/shared/src/index.ts)

**Relevant types for canvas skill authoring:**

```typescript
export interface CanvasDef {
  id: string;
  name: Record<Lang, string>;
  viewBox: [number, number, number, number];
  background: Partial<Record<Lang, string>> & { en: string };
  zones: ZoneDef[];
  plugin?: PluginId;
  related?: string[];
  display?: CanvasDisplayConfig;
  defaultColorLegend?: CanvasDefaultColorLegendEntry[];
}

export interface ZoneDef {
  id: string;
  shape: ZoneShape;  // rect | polygon | circle-segment
  label?: { x: number; y: number; align?: 'left'|'center'|'right'; fontSize?: number };
}

export interface BlockI18n {
  title: string;
  prompt?: string;
  guidance?: string;  // Full paragraph (future; not yet used)
  examples?: string[];
}

export interface StickyNote {
  id: string;
  zoneId: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  text: string;
  color: string;  // hex from STICKY_PALETTE
  authorName: string;
  createdAt: string;
  zoneHistory?: ZoneHistoryEntry[];
}

export interface CanvasMeta {
  id: string;
  projectId: string;
  defId: string;  // 'business-model-canvas' | ...
  title: string;
  language: Lang;
  createdAt: string;
  createdBy: string;
}
```

**TypeScript lives in:** `packages/shared/src/index.ts` (150+ lines; blocks types at lines 311–324, sticky at 329–358).

## 5. Existing Methodology Docs

| File | Summary |
|------|---------|
| `docs/CANVAS_DISPLAY_CONTRACT.md` | Visual contract: canvas identity, background SVG rules, zone labels, color legends. Defines how title/subtitle/labels should NOT be duplicated across SVG, i18n, and UI. |
| `packages/canvases/AUTHORING.md` | Block guidance authoring guide. Canonical markdown structure for per-block knowledge files: intro → sub-categories → core questions → examples → flow-to-BMC. Defines H1/H2/H3 semantics and "card" rendering behavior. |

Both docs **directly inform the skill design**: guidance already follows a schema, and cross-canvas linking is declarative in `related[]`.

---

## Skill Design Implications

1. **No duplication needed:** All 7 canvases have complete i18n prompts + examples. The skill can import these directly from `i18n/{en}.json` (single source of truth).

2. **Deep methodology exists:** `knowledge/blocks/*.md` files contain rich Strategyzer-sourced guidance (sub-categories, core questions, flow-to-BMC). The skill can parse these for teachable content.

3. **Cross-canvas guidance is wired:** `manifest.related[]` already lists peer canvases. The skill can use this to teach sequential workflows (e.g. "fill Empathy Map before Value Proposition Canvas").

4. **Color semantics are structured:** Only JTBD uses `defaultColorLegend` (Functional/Emotional/Social jobs). The skill can learn this pattern and suggest when other canvases should adopt similar semantic layers.

**Recommendation:** Build the skill as a **markdown-to-guidance compiler** that reads manifest + i18n + knowledge bundles, not as a parallel authoring layer. This keeps the skill in sync automatically as canvas content evolves.

