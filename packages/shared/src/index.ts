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
  /**
   * Project-scoped semantic mapping for the sticky-note palette. Keys MUST
   * be hex strings drawn from `STICKY_PALETTE`. The web client surfaces
   * these as a passive "Legend" panel under the canvases list in the left
   * sidebar — same colours, project-defined meaning. Absent / empty map →
   * the legend panel is hidden entirely.
   */
  colorLegend?: Record<string, ColorLegendEntry>;
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
}

export type PluginId = 'axis-grid';

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
  /**
   * Replace-style update: when present, the project's `colorLegend` map is
   * overwritten in full with this value. Pass `{}` to clear the legend.
   * Keys are validated against `STICKY_PALETTE` server-side.
   */
  colorLegend?: Record<string, ColorLegendEntry>;
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
  /** Always non-empty — synthesised from creation metadata if missing. */
  zoneHistory: ZoneHistoryEntry[];
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
  /** Always non-empty — synthesised from creation metadata if missing. */
  zoneHistory: ZoneHistoryEntry[];
}
