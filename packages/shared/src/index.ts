/**
 * Shared domain types used by both the server and the web client.
 * Keep this file dependency-free — it must work in the browser and Node.
 */

export type Lang = 'en' | 'zh';

// ──────────────────────────────────────────────────────────────────────────
// Projects — the top-level entity. A project owns 0…N canvases of any types.
// ──────────────────────────────────────────────────────────────────────────
export interface Project {
  id: string;             // uuid
  name: string;
  description?: string;
  createdAt: string;      // ISO
  createdBy: string;      // display name
  updatedAt: string;
  updatedBy: string;
}

export interface ColorLegendEntry {
  /** Short name shown next to the swatch, e.g. "Customer pain". Required. */
  label: string;
  /** Optional one-line elaboration shown beneath the label. */
  description?: string;
}

// ──────────────────────────────────────────────────────────────────────────
// Sticky-note colour palette (pastels). Kept in `shared` so both server and
// web validate against the same source of truth — the server uses it to
// reject `colorLegend` patches with unknown keys.
// ──────────────────────────────────────────────────────────────────────────
export const STICKY_PALETTE = [
  '#FCF1A8', // cream    (default)
  '#FBD0D9', // blush
  '#CFE3F5', // sky
  '#CFEBD3', // mint
  '#E2D5F0', // lavender
  '#FBDDC0', // peach
] as const;

export type StickyColor = (typeof STICKY_PALETTE)[number];

export const DEFAULT_STICKY_COLOR: StickyColor = '#FCF1A8';

/**
 * Sticky note size constants. `width` and `height` on a `StickyNote`
 * are optional; when missing the renderer falls back to these defaults
 * (preserving the look of stickies persisted before the field existed).
 *
 * Bounds are enforced both client-side (resize handle clamps the
 * pointer-driven values) and server-side (Zod schema in
 * `stickyImport.ts`). Picked to keep stickies legible while still
 * allowing horizontal "long strip" + vertical "tall column" layouts.
 */
export const DEFAULT_STICKY_WIDTH = 140;
export const DEFAULT_STICKY_HEIGHT = 100;
export const STICKY_MIN_WIDTH = 60;
export const STICKY_MIN_HEIGHT = 40;
export const STICKY_MAX_WIDTH = 360;
export const STICKY_MAX_HEIGHT = 280;

// ──────────────────────────────────────────────────────────────────────────
// Canvas instance metadata (one row per canvas the team has created)
// ──────────────────────────────────────────────────────────────────────────
export interface CanvasMeta {
  id: string;             // uuid
  projectId: string;      // FK → Project
  defId: string;          // 'business-model-canvas' | 'value-proposition-canvas' | …
  title: string;
  language: Lang;
  createdAt: string;      // ISO
  createdBy: string;      // display name
  updatedAt: string;      // ISO
  updatedBy: string;
}

// ──────────────────────────────────────────────────────────────────────────
// Canvas definitions (loaded from packages/canvases/<id>/manifest.json)
// ──────────────────────────────────────────────────────────────────────────
export interface CanvasDef {
  id: string;
  name: Record<Lang, string>;
  /** [minX, minY, width, height] in SVG user units */
  viewBox: [number, number, number, number];
  background: Partial<Record<Lang, string>> & { en: string };
  zones: ZoneDef[];
  plugin?: PluginId;
  /**
   * Other canvas-def ids this canvas conceptually pairs with — surfaced
   * in the workspace inspector as "Pairs with" chips so a user can hop
   * between paired canvases inside a project (or one-click create a
   * missing peer). Curated by hand at the bundle level; bidirectional
   * by convention (BMC ↔ Environment Map etc.). Empty/absent → strip
   * is hidden for that canvas.
   */
  related?: string[];
  /**
   * Declarative list of editable object types this canvas allows. Lets
   * the workspace toolbar / inspector / bulk-import know what the canvas
   * supports without inferring it from the plugin.
   *
   * - `'sticky'`     — Y.Map<'stickies'> (every canvas has this in practice
   *                    even when omitted; the default below is `['sticky']`)
   * - `'chartLine'`  — Y.Map<'chartLines'> (used by chart-canvas plugin —
   *                    Strategy Canvas value curves, future Journey emotion
   *                    curves, etc.)
   * - `'pin'`        — Y.Map<'pins'> (positioned marker with icon + label,
   *                    optional anchor to a chartLine point)
   * - `'xAxisItem'`  — Y.Array<'xAxisItems'> (ordered factor / stage list,
   *                    user-editable per project; consumed by chart-canvas
   *                    as the X axis)
   *
   * Bundles that omit this field default to `['sticky']` for backwards
   * compat with the seven canvases shipped before this field existed.
   */
  objectTypes?: ObjectType[];
  /**
   * Template-specific display hints. These keep visual presentation choices
   * in the canvas bundle instead of hard-coding canvas ids in React.
   */
  display?: CanvasDisplayConfig;
  /** Default per-canvas sticky colour meanings seeded into an empty canvas doc. */
  defaultColorLegend?: CanvasDefaultColorLegendEntry[];
  /**
   * Chart-canvas configuration. Required when `plugin === 'chart-canvas'`,
   * otherwise unused. The Y axis is fixed at canvas-template level (a 0–5
   * scale for Strategy Canvas, a –2..+2 sentiment scale for Customer
   * Journey, etc.). The X axis factors come from the per-project
   * `xAxisItems` Y.Array — this `factorsDefault` only seeds the project
   * on first open so it isn't blank.
   */
  chart?: ChartConfig;
}

export interface CanvasDisplayConfig {
  canvas?: {
    /** Show zone/block titles on the live canvas. Defaults to true. */
    showBlockLabels?: boolean;
    /** Show each block's short prompt under its title on the live canvas. */
    showBlockPrompts?: boolean;
    /** Higher-level section labels rendered over the canvas. */
    groupLabels?: CanvasGroupLabel[];
  };
  preview?: {
    /** `structured` renders title/subtitle/block prompts over the SVG background. */
    mode?: 'image' | 'structured' | 'chart-sample';
    showTitle?: boolean;
    showSubtitle?: boolean;
    showBlockLabels?: boolean;
    showBlockPrompts?: boolean;
    subtitle?: LocalizedLabel;
    /** Higher-level section labels rendered over the template preview. */
    groupLabels?: CanvasGroupLabel[];
  };
}

export interface CanvasGroupLabel {
  id: string;
  label: LocalizedLabel;
  description?: LocalizedLabel;
  x: number;
  y: number;
  align?: 'left' | 'center' | 'right';
  fontSize?: number;
}

export interface CanvasDefaultColorLegendEntry {
  hex: StickyColor;
  label: LocalizedLabel;
  description?: LocalizedLabel;
}

/**
 * Plugin id discriminator. The web app's plugin registry
 * (`apps/web/src/plugins/index.ts`) maps each id to a React layer
 * component; the server validator enforces this same enum on every
 * manifest.
 *
 * - `'axis-grid'`    — Portfolio Map (risk × return scatter grid).
 * - `'chart-canvas'` — value-curve chart with named X factors and a
 *                     numeric Y scale; one polyline per chartLine
 *                     (e.g. one company per line on Blue Ocean's
 *                     Strategy Canvas).
 */
export type PluginId = 'axis-grid' | 'chart-canvas';

/**
 * Object types that may exist alongside stickies on a canvas. Used both
 * by the manifest schema (`CanvasDef.objectTypes`) and by the bulk-import
 * endpoint to validate request keys.
 */
export type ObjectType = 'sticky' | 'pin' | 'pinClass' | 'xAxisItem';

/** A short label authored in both supported languages. */
export type LocalizedLabel = Record<Lang, string>;

/**
 * Manifest-level chart configuration used by the `chart-canvas` plugin.
 * The Y axis (`yAxis`) is fixed per canvas template; the X axis factors
 * are seeded from `factorsDefault` on first open and then become
 * user-editable per project (stored in the doc's `xAxisItems` Y.Array).
 */
export interface ChartConfig {
  yAxis: {
    /** Numeric minimum (typically 0). */
    min: number;
    /** Numeric maximum (typically 5 for Strategy Canvas, ±2 for journey). */
    max: number;
    /** Axis label, localised. Shown along the Y gridline labels. */
    label: LocalizedLabel;
    /**
     * Optional descriptive label for the LOW end of the scale, e.g.
     * "Low" / "低". When omitted the chart shows only the numeric value.
     */
    lowLabel?: LocalizedLabel;
    /**
     * Optional descriptive label for the HIGH end of the scale, e.g.
     * "High" / "高". When omitted the chart shows only the numeric value.
     */
    highLabel?: LocalizedLabel;
  };
  /**
   * Starter factor list seeded into the project's `xAxisItems` Y.Array
   * the first time the canvas is opened. Each entry must carry a stable
   * `id` (used as the points-map key) and a localised label.
   */
  factorsDefault: Array<{ id: string; label: LocalizedLabel }>;
}

export type ZoneShape =
  | { type: 'rect'; x: number; y: number; w: number; h: number }
  | { type: 'polygon'; points: Array<[number, number]> }
  | {
      type: 'circle-segment';
      cx: number;
      cy: number;
      r: number;
      fromDeg: number;
      toDeg: number;
    };

export interface ZoneDef {
  id: string;
  shape: ZoneShape;
  /** Optional preferred position for the translated label, in SVG coords.
   *  `fontSize` overrides the default 18-px label font for this single
   *  block — useful for canvases whose blocks are much larger than the
   *  default (e.g. JTBD's tall rows) and need bigger titles to feel
   *  proportionate. Other canvases leave it unset and inherit 18. */
  label?: { x: number; y: number; align?: 'left' | 'center' | 'right'; fontSize?: number };
  /** Used by the axis-grid plugin (Portfolio Map). */
  axes?: {
    x: AxisDef;
    y: AxisDef;
  };
}

/**
 * One axis on an axis-grid zone. `kind` lets the renderer pick a colour
 * + icon so risk and return read at a glance — without relying on the
 * label text to recognise which is which.
 */
export interface AxisDef {
  min: number;
  max: number;
  label: Record<Lang, string>;
  kind?: 'risk' | 'return';
}

export interface BlockI18n {
  title: string;
  /** Short hint (one line) — kept for backwards compat with simple canvases. */
  prompt?: string;
  /** Full paragraph: what this block is, how to fill it. Surfaced in the inspector. */
  guidance?: string;
  /** Three example sticky texts, one-click "+ Add as sticky" in the inspector. */
  examples?: string[];
}

export interface CanvasI18n {
  canvasTitle: string;
  blocks: Record<string, BlockI18n>;
}

// ──────────────────────────────────────────────────────────────────────────
// Sticky notes — the only editable content on a canvas
// ──────────────────────────────────────────────────────────────────────────
export interface StickyNote {
  id: string;
  zoneId: string;
  /** SVG-coord-space center of the sticky inside the zone. */
  x: number;
  y: number;
  /**
   * Optional explicit dimensions in SVG-coord units. When absent, the
   * renderer falls back to `DEFAULT_STICKY_WIDTH`/`DEFAULT_STICKY_HEIGHT`.
   * Persisted only when the user has explicitly resized the sticky, so
   * stickies authored before the resize feature continue to round-trip
   * unchanged.
   */
  width?: number;
  height?: number;
  text: string;
  color: string;       // hex, e.g. '#FCF1A8'
  authorName: string;
  createdAt: string;
  /**
   * Append-only audit trail of every zone the sticky has occupied, oldest
   * first. Index 0 corresponds to creation time + initial zone. Optional
   * for backwards compatibility with stickies persisted before this field
   * existed — readers should fall back to a synthesised single-entry list
   * derived from `{zoneId, createdAt, authorName}` when the field is
   * absent. Used by the AI-context endpoint as the canonical record of
   * cross-block sticky migrations.
   */
  zoneHistory?: ZoneHistoryEntry[];
}

export interface ZoneHistoryEntry {
  zoneId: string;
  /** ISO timestamp at which the sticky entered this zone. */
  at: string;
  /** Display name of the user who placed it (initial author or mover). */
  by: string;
}

// ──────────────────────────────────────────────────────────────────────────
// Pin objects — a universal annotation / data-point model that lives next
// to stickies on every canvas. Two roots:
//
//   `pinClasses` (Y.Map<id, Y.Map>) — the legend; each class carries a
//                                     color + icon. A class's identity is
//                                     "this is a Yellow Tail point" or
//                                     "this is a Risk callout".
//   `pins`       (Y.Map<id, Y.Map>) — the data points / annotations.
//                                     Each pin belongs to exactly one
//                                     class and lives at a free (x, y)
//                                     in viewBox space. Classes auto-
//                                     connect their pins by sorted-x
//                                     polyline, which on a chart-canvas
//                                     plugin canvas reads as a value
//                                     curve, on other canvases as
//                                     "this group of related markers".
//
// `xAxisItems` (Y.Array<Y.Map>) is still here, used by the chart-canvas
// plugin to draw factor / stage labels along the X axis. Pin x is in
// viewBox space, not in factor-id space — but the chart plugin offers
// X-snap as a UX nicety on drop / drag-end so points on a value curve
// land cleanly on factor columns.
//
// The `apps/web/src/collab/<type>.ts` modules are the single source of
// truth for Y encoding; server-side bulk-import, AI context, and any
// future writer must mirror the same field names.
// ──────────────────────────────────────────────────────────────────────────

/**
 * One factor (Strategy Canvas) or stage (Journey Map) on the X axis.
 * Stored in `Y.Array<'xAxisItems'>` so users can add / rename / reorder /
 * delete factors per project. Manifest's `chart.factorsDefault` seeds
 * the array on first open; after that the array is the source of truth.
 */
export interface XAxisItem {
  id: string;
  label: LocalizedLabel;
}

/**
 * Tight enum of pin icon presets. Kept small so adding/removing an icon
 * is a one-line code decision and the UI's icon picker stays scannable.
 */
export type PinIcon = 'circle' | 'triangle' | 'square' | 'star' | 'flag';

/**
 * One legend entry / class. Color + icon together form the visual signature
 * the user reads to tell pins apart. The class label is what shows in the
 * palette tooltip + curve-end label.
 */
export interface PinClass {
  id: string;
  label: string;
  color: string;            // hex from CHART_PALETTE (or custom)
  icon: PinIcon;
  authorName: string;
  createdAt: string;
}

/**
 * One annotation / data point. Free-positioned in viewBox space; the
 * universal PinLayer renders it using its class's color + icon. Pins of
 * the same class auto-connect via a sorted-x polyline at render time —
 * no separate "line" entity exists.
 *
 * Not zone-bound (unlike StickyNote). A pin can sit anywhere, including
 * outside a zone, and its visual meaning is "this point belongs to
 * the {classId} group" — interpretation is plugin / canvas context.
 */
export interface Pin {
  id: string;
  classId: string;          // FK → PinClass.id (required)
  x: number;                // viewBox coords
  y: number;
  /** Optional short label rendered next to the icon. */
  label?: string;
  /** Optional one-line elaboration. */
  body?: string;
  authorName: string;
  createdAt: string;
}

/**
 * Shared color palette used as defaults for PinClass. Server validators
 * accept any hex color; this is just the "next-color" picker source.
 */
export const CHART_PALETTE = [
  '#1F77B4', // blue
  '#D62728', // red
  '#2CA02C', // green
  '#FF7F0E', // orange
  '#9467BD', // purple
  '#8C564B', // brown
] as const;

export type ChartColor = (typeof CHART_PALETTE)[number];

export const DEFAULT_CHART_COLOR: ChartColor = '#1F77B4';

/**
 * Resolve the effective object types for a canvas. Manifest's
 * `objectTypes` wins when set (Strategy Canvas declares the full
 * `['sticky', 'pin', 'pinClass', 'xAxisItem']`). When omitted (every
 * other canvas in the repo today), every canvas implicitly supports
 * sticky + pin + pinClass — so any canvas can become an annotation
 * surface without manifest changes. `xAxisItem` stays opt-in (only
 * canvases with a chart-canvas plugin need it).
 */
export function effectiveObjectTypes(def: CanvasDef): ObjectType[] {
  if (def.objectTypes && def.objectTypes.length > 0) return [...def.objectTypes];
  return ['sticky', 'pin', 'pinClass'];
}

// ──────────────────────────────────────────────────────────────────────────
// Versioning
// ──────────────────────────────────────────────────────────────────────────
export type SnapshotKind = 'autosave' | 'milestone';

export interface SnapshotMeta {
  id: string;
  canvasId: string;
  kind: SnapshotKind;
  name?: string;
  description?: string;
  createdAt: string;
  createdBy: string;
  /** Number of stickies at the time of the snapshot, for the timeline diff. */
  stickyCount: number;
}

export interface Snapshot extends SnapshotMeta {
  /** Yjs encoded state, base64 over the wire. */
  state: string;
}

// ──────────────────────────────────────────────────────────────────────────
// Identity (lightweight; localStorage only for v1)
// ──────────────────────────────────────────────────────────────────────────
export interface Identity {
  displayName: string;
  clientId: string;
  color: string; // hex
}

// ──────────────────────────────────────────────────────────────────────────
// REST DTOs
// ──────────────────────────────────────────────────────────────────────────
export interface CreateProjectInput {
  name: string;
  description?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
}

export interface CreateCanvasInput {
  projectId: string;
  defId: string;
  title: string;
  language: Lang;
}

export interface UpdateCanvasInput {
  title?: string;
  language?: Lang;
}

export interface CreateMilestoneInput {
  name: string;
  description?: string;
}

export type RestoreMode = 'replace' | 'fork';

export interface RestoreInput {
  mode: RestoreMode;
}

// ──────────────────────────────────────────────────────────────────────────
// AI context — read-only structured snapshot for a future AI Copilot.
// Built by `GET /canvases/:id/ai-context?lang=zh|en`. Block titles and
// guidance are pre-resolved against the requested language, and stickies
// are grouped by their current zone (so the AI sees the canvas the way a
// human reads it). Empty zones are present with `stickies: []` so the AI
// can reason about what's *missing* alongside what's filled.
// ──────────────────────────────────────────────────────────────────────────
export interface AiContext {
  canvas: {
    id: string;
    defId: string;          // 'business-model-canvas' | …
    defName: string;        // canvas-def display name in `lang`
    title: string;          // canvas instance title
    language: Lang;         // canvas creation language
    project: { id: string; name: string; description?: string };
  };
  blocks: AiContextBlock[];
  /**
   * Factors on the X axis (Strategy Canvas / Journey stages). Present
   * only when the canvas's `xAxisItems` Y.Array is non-empty. Each entry
   * is pre-resolved against the requested `lang`.
   */
  factors?: Array<{ id: string; label: string }>;
  /**
   * Y-axis labels, pre-resolved against `lang`. Present only on
   * chart-canvas plugin canvases. Reflects user overrides from the doc's
   * `chartConfig` Y.Map first; falls back to the manifest's
   * `chart.yAxis.{label, lowLabel, highLabel}` when no override is set —
   * so the LLM sees the same Y-axis text the human is looking at.
   */
  yAxis?: {
    label: string;
    lowLabel?: string;
    highLabel?: string;
  };
  /**
   * Pin classes (legend) on this canvas. Each entry is pre-resolved
   * against the requested `lang` for class label, and color/icon are
   * passed through unchanged.
   */
  pinClasses?: Array<{
    id: string;
    label: string;
    color: string;
    icon: PinIcon;
  }>;
  /**
   * Pins / annotation markers on the canvas. Each entry carries the
   * derived `classLabel` so the LLM can describe a pin without
   * re-joining classes by id.
   */
  pins?: Array<{
    id: string;
    classId: string;
    classLabel: string;
    x: number;
    y: number;
    label?: string;
    body?: string;
  }>;
  /**
   * Server-derived per-class polyline:对 pins 按 classId 分组 + 按 x 排序。
   * Lets an LLM read "Yellow Tail's curve looks like X" without doing
   * the grouping itself.
   */
  valueCurves?: Array<{
    classId: string;
    classLabel: string;
    color: string;
    points: Array<{ x: number; y: number }>;
  }>;
  /**
   * Per-canvas sticky-color legend, hex → meaning. Only entries with a
   * non-empty `label` are emitted. Empty when the user hasn't assigned
   * meanings yet.
   */
  colorLegend?: Record<string, ColorLegendEntry>;
  /** ISO timestamp of when the snapshot was assembled. */
  generatedAt: string;
}

export interface AiContextBlock {
  id: string;               // zone id, e.g. 'key-partners'
  title: string;
  prompt?: string;
  guidance?: string;
  stickies: AiContextSticky[];
}

export interface AiContextSticky {
  id: string;
  text: string;
  color: string;
  authorName: string;
  createdAt: string;
  x: number;
  y: number;
  /** Present only when the sticky has been explicitly resized. */
  width?: number;
  height?: number;
  /** Always non-empty — synthesised from creation metadata if missing. */
  zoneHistory: ZoneHistoryEntry[];
}

// ──────────────────────────────────────────────────────────────────────────
// Bulk-import DTO — used by `POST /canvases/:id/objects/bulk` (and the
// older sticky-only `POST /canvases/:id/stickies/bulk` which delegates).
// Per-key replace mode: only keys present in the request are replaced;
// other keys on the doc are untouched. Allowed keys per canvas are
// validated against the canvas def's `objectTypes`.
// ──────────────────────────────────────────────────────────────────────────
export interface ObjectsBulkInput {
  stickies?: Array<{
    zoneId: string;
    text: string;
    color?: string;
    x?: number;
    y?: number;
    /** Optional explicit dimensions in SVG-coord units. Bounded server-side. */
    width?: number;
    height?: number;
    authorName?: string;
  }>;
  pinClasses?: Array<{
    id?: string;
    label: string;
    color?: string;
    icon?: PinIcon;
    authorName?: string;
  }>;
  pins?: Array<{
    id?: string;
    classId: string;
    x: number;
    y: number;
    label?: string;
    body?: string;
    authorName?: string;
  }>;
  xAxisItems?: Array<{
    id: string;
    label: LocalizedLabel;
  }>;
  /**
   * Replace-style colour legend. Keys must be hex strings drawn from
   * `STICKY_PALETTE`. Off-palette keys are rejected by the server.
   */
  colorLegend?: Record<string, ColorLegendEntry>;
}
