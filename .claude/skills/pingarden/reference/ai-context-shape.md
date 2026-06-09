# `canvas read` / `/ai-context` shape

`pingarden canvas read <canvasId> --json` returns the full `AiContext`:

```ts
interface AiContext {
  canvas: { id, defId, defName, title, language, project: {...} };
  blocks: Array<{
    id: string;            // zoneId
    title: string;         // localised
    prompt?: string;       // localised
    stickies: Array<{
      id: string;
      text: string;
      color?: string;
      x: number; y: number;
      authorName?: string;
      createdAt: string;
      zoneHistory: Array<{ zoneId: string; at: string; by: string }>;
    }>;
  }>;
  // Chart-canvas only:
  factors?: Array<{ id, label }>;
  yAxis?: { label, lowLabel?, highLabel? };
  pinClasses?: Array<{ id, label, color, icon }>;
  pins?: Array<{ id, classId, classLabel, x, y, label?, body? }>;
  valueCurves?: Array<{ classId, classLabel, color, points }>;
  // Per-canvas:
  colorLegend?: Record<hex, { label, description? }>;
  generatedAt: string;
}
```

`blocks` includes EVERY zone defined on the canvas — empty zones come back as `{ id, title, prompt, stickies: [] }`. That's how you see what's missing.

`zoneHistory` is the per-sticky audit trail of every zone it has occupied. Useful when refining: a sticky that has bounced between zones is probably a sign of a fuzzy concept.

The `generatedAt` ISO timestamp is the only non-deterministic field — don't rely on it for diffs across reads.
