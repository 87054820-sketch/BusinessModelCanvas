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
  /** Cloud/user-data scope. Omitted legacy projects are treated as personal. */
  projectType?: ProjectType;
  /** Stable owner identity for personal projects. Permission checks use this, not display names. */
  ownerUserId?: string;
  /** Team scope for collaborative projects. */
  teamId?: string;
  /** Case slug this project was copied from, when created via library fork. */
  originCaseSlug?: string;
  createdAt: string;      // ISO
  createdBy: string;      // display name
  createdByUserId?: string;
  updatedAt: string;
  updatedBy: string;
  updatedByUserId?: string;
  /** Request-scoped permissions for the current viewer. Never persisted by storage backends. */
  capabilities?: ProjectCapabilities;
  // ── Case-library origin metadata (only set when source==='library') ────
  /** `'user'` (default when omitted) or `'library'`. Library projects are
   *  read-only: the storage backend rejects mutations. Set by BundleStorage
   *  when hydrating a project from the bundled case-library tree. */
  source?: ProjectSource;
  /** Stable kebab-case slug — single source of truth for case identity.
   *  Mirrors `case.json.slug`. Library-only. */
  companySlug?: string;
  /** Human-readable name (full company name, industry name, pattern name).
   *  Library-only. */
  companyName?: string;
  /** Free-form classification tags (industry, region, era, theme).
   *  Library-only. */
  tags?: string[];
  /** Discriminator that lets clients render different cards / behaviours
   *  per kind. Mirrors `case.json.kind`. Library-only. */
  caseKind?: CaseKind;
}

export type ProjectSource = 'user' | 'library';

export type ProjectType = 'personal' | 'team';

export type ProjectRole = 'owner' | 'editor' | 'viewer';

export interface ProjectCapabilities {
  canView: boolean;
  canEdit: boolean;
  canManageMembers: boolean;
  canDelete: boolean;
  role?: ProjectRole;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  createdBy: string;
  createdByUserId: string;
  updatedAt: string;
  updatedBy: string;
  updatedByUserId: string;
}

export type TeamRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface TeamMember {
  teamId: string;
  userId: string;
  displayName: string;
  role: TeamRole;
  createdAt: string;
}

export interface ProjectMember {
  projectId: string;
  userId: string;
  displayName: string;
  role: ProjectRole;
  createdAt: string;
}

export interface ProjectInvite {
  id: string;
  projectId: string;
  role: ProjectRole;
  token: string;
  createdAt: string;
  createdBy: string;
  createdByUserId: string;
  expiresAt: string;
  acceptedAt?: string;
  acceptedByUserId?: string;
  revokedAt?: string;
}

export interface AuthUser {
  authenticated: boolean;
  userId?: string;
  displayName?: string;
  avatarUrl?: string;
  provider?: 'wechat' | 'local';
  openId?: string;
  isLocalOnly?: boolean;
  canSyncToCloud?: boolean;
  canUseTeams?: boolean;
}

/**
 * Case-library entry kind. Lets the UI and AI distinguish between three
 * fundamentally different teaching artifacts that live in the case
 * library:
 *
 * - `'company'`    — single company analysis (e.g. WeChat private domain).
 *                    The default for back-compat: a project without a
 *                    `caseKind` field is treated as a company case.
 * - `'industry'`   — industry archetype (typical model BMC) plus N company
 *                    variants of the same defId, distinguished by
 *                    `CanvasMeta.variant`. Example: Swiss Private Banking
 *                    (archetype + Maerki Baumann + Pictet).
 * - `'comparison'` — side-by-side comparison of multiple peers (Tesla vs
 *                    BYD). Like `'industry'` but without an archetype.
 *
 * NOTE: Business-model **patterns** (Unbundling, Long Tail, Multi-Sided
 * Platforms, Free, Open) are NOT a case kind — they are a separate
 * first-class entity (`BusinessModelPattern`) with their own storage
 * directory (`packages/case-library/patterns/<slug>/`) and HTTP routes
 * (`/library/patterns`). A pattern is not a project: it has no BMC, no
 * canvases, no Yjs binary. Concrete cases backlink to the patterns they
 * exemplify via `CaseLibraryEntry.appliesPatterns: string[]`.
 */
export type CaseKind = 'company' | 'industry' | 'comparison';

/**
 * Bibliographic citation attached to a case. Surfaced in the case library
 * preview modal and via `pingarden case read`.
 */
export interface CaseSource {
  label: string;
  url?: string;
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
export const DEFAULT_STICKY_WIDTH = 184;
export const DEFAULT_STICKY_HEIGHT = 62;
export const STICKY_MIN_WIDTH = 88;
export const STICKY_MIN_HEIGHT = 36;
export const STICKY_MAX_WIDTH = 360;
export const STICKY_MAX_HEIGHT = 280;

// ──────────────────────────────────────────────────────────────────────────
// Historical/content dating — separates when something happened from when it
// was recorded in PinGarden. `createdAt` / `updatedAt` stay system audit fields.
// ──────────────────────────────────────────────────────────────────────────
export type ContentDatePrecision = 'year' | 'month' | 'day';

// ──────────────────────────────────────────────────────────────────────────
// Canvas instance metadata (one row per canvas the team has created)
// ──────────────────────────────────────────────────────────────────────────
export interface CanvasMeta {
  id: string;             // uuid
  projectId: string;      // FK → Project
  defId: string;          // 'business-model-canvas' | 'value-proposition-canvas' | …
  title: string;
  language: Lang;
  /** Business/content date, e.g. '2023-12'. Distinct from system createdAt. */
  contentDate?: string;
  contentDatePrecision?: ContentDatePrecision;
  contentDateLabel?: string;
  createdAt: string;      // ISO
  createdBy: string;      // display name
  createdByUserId?: string;
  updatedAt: string;      // ISO
  updatedBy: string;
  updatedByUserId?: string;
  /**
   * Library-only. When a single case (project) holds multiple canvases of
   * the SAME defId — e.g. an industry archetype BMC plus one BMC per
   * company variant — `variant` distinguishes them. Drives UI tabs in the
   * read-only case viewer and lets `pingarden case read` group canvases
   * by variant in its output. Absent on user-authored canvases.
   */
  variant?: CanvasVariant;
}

/**
 * Variant tag on a library-case canvas. Used when one case (slug) needs
 * multiple canvases of the same defId — e.g. Swiss Private Banking carries
 * an industry-archetype BMC and one BMC per concrete bank.
 */
export interface CanvasVariant {
  /** Stable id within the case, e.g. 'archetype' | 'maerki-baumann'. */
  id: string;
  label: LocalizedLabel;
  description?: LocalizedLabel;
  /** Optional role hint. `'archetype'` marks the typical industry default;
   *  `'variant'` marks a deviation. Comparison-kind cases typically leave
   *  this unset (all peers are equals). */
  role?: 'archetype' | 'variant';
}

// ──────────────────────────────────────────────────────────────────────────
// Story — project-level narrative documents mixing Markdown and canvas embeds
// ──────────────────────────────────────────────────────────────────────────
export type StoryStatus = 'draft' | 'published';

export interface StoryMeta {
  id: string;
  projectId: string;
  title: string;
  status: StoryStatus;
  /** Business/content date, e.g. '2023-12'. Distinct from system createdAt. */
  contentDate?: string;
  contentDatePrecision?: ContentDatePrecision;
  contentDateLabel?: string;
  /**
   * Authoring language. Required on case-library stories so the
   * workspace can render the right one per UI language; optional on
   * user-created stories (which are free-form and don't get filtered).
   * `case author` enforces this for new library cases.
   */
  language?: Lang;
  createdAt: string;
  createdBy: string;
  createdByUserId?: string;
  updatedAt: string;
  updatedBy: string;
  updatedByUserId?: string;
}

export interface Story extends StoryMeta {
  content: string;
}

export interface StoryCanvasDirective {
  /** Absolute legacy reference. Kept for existing user-authored stories. */
  canvasId?: string;
  /** Relative reference: canvas definition id in the current project/case. */
  defId?: string;
  /** Relative disambiguator when a project has multiple canvases of the same defId. */
  variantId?: string;
  title?: string;
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
   * Optional bilingual one-liner explaining WHY each `related` canvas
   * pairs with this one. Surfaced by the AI skill (`canvases/<id>.<lang>.md`
   * "Pairs with" section) so the agent can suggest a meaningful next
   * step instead of just dropping a bare canvas-def id on the user.
   *
   * Keys are canvas-def ids; values are bilingual labels. Entries
   * absent from `related` are ignored. Entries in `related` but
   * missing here render as a bare bullet — graceful fallback.
   */
  relatedNotes?: Record<string, LocalizedLabel>;
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
    /**
     * Whether pins in the same class should be connected by a polyline.
     * Defaults to true for chart-canvas value curves and false elsewhere.
     */
    showPinConnections?: boolean;
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
//                                     in viewBox space. Rendering may
//                                     connect same-class pins by sorted-x
//                                     polyline when the canvas opts into
//                                     pin connections (chart-canvas by
//                                     default). Other canvases, such as
//                                     Portfolio Map, read pins as scatter
//                                     points.
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
 * universal PinLayer renders it using its class's color + icon. Canvases
 * that opt into pin connections derive same-class polylines at render time;
 * scatter canvases keep pins unconnected. No separate "line" entity exists.
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
  createdByUserId?: string;
  /** Number of stickies at the time of the snapshot, for the timeline diff. */
  stickyCount: number;
}

export interface Snapshot extends SnapshotMeta {
  /** Yjs encoded state, base64 over the wire. */
  state: string;
}

// ──────────────────────────────────────────────────────────────────────────
// Identity (derived from the signed WeChat session; never user-entered)
// ──────────────────────────────────────────────────────────────────────────
export interface Identity {
  displayName: string;
  clientId: string;
  color: string; // hex
  /** Stable account id from the auth layer. */
  userId?: string;
  avatarUrl?: string;
  provider?: AuthUser['provider'];
}

// ──────────────────────────────────────────────────────────────────────────
// REST DTOs
// ──────────────────────────────────────────────────────────────────────────
export interface CreateProjectInput {
  name: string;
  description?: string;
  teamId?: string;
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
  contentDate?: string;
  contentDatePrecision?: ContentDatePrecision;
  contentDateLabel?: string;
}

export interface UpdateCanvasInput {
  title?: string;
  language?: Lang;
  contentDate?: string;
  contentDatePrecision?: ContentDatePrecision;
  contentDateLabel?: string;
}

export interface CreateStoryInput {
  projectId: string;
  title: string;
  content?: string;
  status?: StoryStatus;
  contentDate?: string;
  contentDatePrecision?: ContentDatePrecision;
  contentDateLabel?: string;
}

export interface UpdateStoryInput {
  title?: string;
  content?: string;
  status?: StoryStatus;
  contentDate?: string;
  contentDatePrecision?: ContentDatePrecision;
  contentDateLabel?: string;
}

export * from './copilot.js';
export * from './qualityRules.js';

export function parseStoryCanvasDirectives(content: string): StoryCanvasDirective[] {
  const directives: StoryCanvasDirective[] = [];
  const block = /^::canvas(?:\[([^\]\n]+)\])?\{([^}\n]*)\}\s*$/gm;
  let match: RegExpExecArray | null;
  while ((match = block.exec(content)) !== null) {
    const defId = match[1]?.trim();
    const attrs = parseDirectiveAttrs(match[2] ?? '');
    const canvasId = attrs.canvasId?.trim();
    const variantId = attrs.variantId?.trim() ?? attrs.variant?.trim();
    if (!canvasId && !defId) continue;
    directives.push({
      ...(canvasId ? { canvasId } : {}),
      ...(defId ? { defId } : {}),
      ...(variantId ? { variantId } : {}),
      ...(attrs.title ? { title: attrs.title } : {}),
    });
  }
  return directives;
}

function parseDirectiveAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attr = /(\w+)="([^"]*)"|(\w+)='([^']*)'|(\w+)=([^\s]+)/g;
  let match: RegExpExecArray | null;
  while ((match = attr.exec(raw)) !== null) {
    const key = match[1] ?? match[3] ?? match[5];
    const value = match[2] ?? match[4] ?? match[6] ?? '';
    if (key) attrs[key] = value;
  }
  return attrs;
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
// Case library — read-only catalog of curated business-analysis examples
// shipped with each app version. Sourced from `packages/case-library/cases/
// <slug>/case.json` plus the project / canvases / stories beneath it. The
// HTTP surface is `GET /library/cases`, `GET /library/cases/:slug`,
// `POST /library/cases/:slug/fork`. See plan: generic-strolling-tarjan.md.
// ──────────────────────────────────────────────────────────────────────────

/**
 * Case-library catalog entry — what `GET /library/cases` returns per case.
 * Same shape on disk in `case.json` (the server hydrates it via
 * BundleStorage).
 */
export interface CaseLibraryEntry {
  /** Stable kebab-case identity. Build script enforces uniqueness. */
  slug: string;
  /** case.json schema version; lets us evolve the on-disk shape later. */
  version: number;
  kind: CaseKind;
  /** Bilingual headline label. For `kind==='company'` this is the company
   *  name; for `industry` the industry name; for `comparison` the
   *  comparison topic. */
  companyName: LocalizedLabel;
  /** Bilingual one-paragraph blurb shown on the case card and preview. */
  summary: LocalizedLabel;
  /** Free-form classification tags (industry, region, era, theme). */
  tags: string[];
  /** Bibliographic citations / source attributions. */
  sources: CaseSource[];
  /** Resolved project id (the FederatedStorage project that holds the
   *  canvases + stories). Stable across app launches because the bundle
   *  is the source of truth. */
  projectId: string;
  /** Number of canvases in the case (for card display). */
  canvasCount: number;
  /** Number of stories in the case. */
  storyCount: number;
  /**
   * Per-language counts derived by `BundleStorage` from each canvas's
   * `language` field. Lets the case card / preview / workspace show
   * the user-facing count for the current UI language (with the total
   * as fallback for back-compat or single-language cases). Optional so
   * older case bundles without per-canvas language don't break.
   */
  canvasesByLanguage?: Partial<Record<Lang, number>>;
  /** Same as `canvasesByLanguage` but for stories. */
  storiesByLanguage?: Partial<Record<Lang, number>>;
  /** Optional def id of the canvas to use as the card thumbnail. When
   *  absent the UI picks the first canvas. */
  thumbnailDefId?: string;
  /** Pattern slugs this case exemplifies. Patterns live as separate
   *  entities under `packages/case-library/patterns/<slug>/`; this is the
   *  forward link case → pattern. The reverse link
   *  (pattern → curated example cases) lives on
   *  `BusinessModelPattern.examples`. Many-to-many: a case can apply
   *  multiple patterns. Validation enforces every slug here resolves to
   *  an entry in `manifest.json.patterns[]`. */
  appliesPatterns?: string[];
  /** Strategy-framework slugs this case demonstrates. Frameworks live as
   *  separate first-class methods under
   *  `packages/case-library/strategy-frameworks/<slug>/`; unlike patterns,
   *  they describe analysis methods (Blue Ocean Strategy, Five Forces,
   *  PESTEL, …), not business-model structures. */
  appliesStrategyFrameworks?: string[];
  /**
   * Optional sub-type refinement, keyed by pattern slug. Each value
   * must match a `subtypes[].id` on the referenced pattern. Cases
   * that don't refine simply omit this field. Used for patterns like
   * `free` that ship with structural sub-types (ad-supported / freemium
   * / bait-and-hook) — the case tag carries enough information to
   * render `[Free · Freemium]` instead of just `[Free]` and to
   * surface in the right sub-section of the pattern modal.
   *
   * Validation enforces:
   *   - every key here is also in `appliesPatterns[]` (you can't refine
   *     a pattern you haven't claimed to apply)
   *   - every value resolves to a `subtypes[].id` on the referenced
   *     pattern's `pattern.json`
   *
   * Example:
   *   appliesPatterns:        ['multi-sided-platforms', 'free']
   *   appliesPatternSubtypes: { free: 'ad-supported' }
   */
  appliesPatternSubtypes?: Record<string, string>;
}

/**
 * Reference from a pattern to a concrete example case (industry or
 * company). `role` lets the UI highlight a "primary" exemplar.
 */
export interface CaseExampleRef {
  slug: string;
  role?: 'primary' | 'secondary';
}

/**
 * Business-model **pattern** — an abstract reusable model (Unbundling,
 * Long Tail, Multi-Sided Platforms, Free, Open). Lives alongside
 * `CaseLibraryEntry` as a peer entity, not as a special kind of case:
 * a pattern is a *collection* of concrete cases plus narrative text,
 * not a project. It has no BMC, no canvases, no Yjs binary, no fork.
 *
 * On disk: `packages/case-library/patterns/<slug>/`:
 *   ├── pattern.json        ← this shape
 *   ├── description.en.md   ← long-form user-facing narrative
 *   ├── description.zh.md
 *   ├── skill.en.md         ← optional, AI-facing concise guide
 *   └── skill.zh.md
 *
 * Listed in `manifest.json.patterns[]` (parallel to `manifest.cases[]`).
 * Served via `GET /library/patterns` (list) and
 * `GET /library/patterns/:slug` (detail with hydrated example cases +
 * markdown description).
 */
export interface BusinessModelPattern {
  /** Stable kebab-case identity (e.g. `'long-tail'`,
   *  `'unbundling-business-models'`). Referenced verbatim by
   *  `CaseLibraryEntry.appliesPatterns[]`. */
  slug: string;
  /** Bilingual pattern name (e.g. "The Long Tail" / "长尾模式"). */
  name: LocalizedLabel;
  /** Bilingual one-paragraph blurb shown on the pattern card. */
  summary: LocalizedLabel;
  /** Flat bibliographic sources for the pattern definition (book chapter,
   *  HBR article, blog post). Same shape as `CaseSource`. Kept for
   *  backward compatibility — when `references` is also present, UI and
   *  skill prefer `references` and ignore this field. New patterns
   *  should populate `references` instead. */
  sources: CaseSource[];
  /**
   * Annotated bibliography. When present, supersedes `sources` in both
   * the web modal footer and the generated skill page. Each entry adds
   * a `type` (book/article/paper/web), a short citable handle, optional
   * page range, and a bilingual ~30-word note explaining what *that*
   * source contributes — turning a flat list into something an AI agent
   * (or a human reader) can actually reason about.
   */
  references?: PatternReference[];
  /** Curated list of concrete cases that illustrate this pattern. The
   *  reverse direction (case → pattern) lives on
   *  `CaseLibraryEntry.appliesPatterns`. Validation enforces every
   *  example slug resolves to an entry in `manifest.json.cases[]`.
   *  When `subtypes` is present, this top-level list typically holds
   *  the union of all subtype examples — useful as a flat fallback
   *  for renderers that don't surface subtype grouping. */
  examples: CaseExampleRef[];
  /**
   * Optional sub-typing within the pattern. Used when one pattern has
   * multiple structurally distinct flavors that the originating source
   * itself separates (Free → ad-supported / freemium / bait-and-hook
   * per BMG 2010). Each sub-type carries its own bilingual name,
   * summary, and curated `examples[]`. Drives:
   *   - sub-section grouping in the modal's Related Cases tab
   *   - per-sub-type chip suffix on case cards
   *     (`[Free · Ad-supported]` instead of `[Free]`)
   *   - a `## Sub-types` section in the generated skill markdown
   *
   * Most patterns ship without sub-typing — only declare `subtypes`
   * when the originating source really does carve the pattern into
   * distinct shapes. Don't manufacture sub-types from your own
   * analysis; push back to the user if no canonical source segments
   * the pattern that way.
   */
  subtypes?: PatternSubtype[];
}

/**
 * One sub-type within a pattern. Sibling of `BusinessModelPattern.examples`
 * but scoped to a specific structural flavor. Cases reference a
 * sub-type via `CaseLibraryEntry.appliesPatternSubtypes[<patternSlug>]`,
 * matched by `id`.
 */
export interface PatternSubtype {
  /** Stable kebab-case id within the parent pattern, e.g.
   *  `'ad-supported'`, `'freemium'`, `'bait-and-hook'`. Must be unique
   *  across the parent pattern's `subtypes[]`. */
  id: string;
  /** Bilingual sub-type display name. */
  name: LocalizedLabel;
  /** Bilingual short blurb (~40 words) — what makes this sub-type
   *  structurally distinct from its siblings. */
  summary: LocalizedLabel;
  /** Curated example cases for this specific sub-type. Slugs must
   *  resolve to manifested cases. The case must also tag the parent
   *  pattern in its `appliesPatterns[]` AND specify this `id` in
   *  its `appliesPatternSubtypes[<patternSlug>]`. */
  examples: CaseExampleRef[];
}

/**
 * Source category for a pattern reference. Drives icon + grouping in the
 * modal footer and the generated skill page.
 *
 * - `'book'`    — published book (BMG, The Long Tail, etc.)
 * - `'article'` — magazine / newspaper / web feature article
 * - `'paper'`   — peer-reviewed paper or journal article (HBR, etc.)
 * - `'web'`     — web page, documentation, blog post (no print equivalent)
 */
export type PatternReferenceType = 'book' | 'article' | 'paper' | 'web';

/**
 * One annotated reference attached to a `BusinessModelPattern`. Lives
 * inside `BusinessModelPattern.references[]`. The annotation
 * (`note`) is what distinguishes this from the flat `sources` list:
 * each entry says *what this source contributes that others don't* so
 * downstream readers (AI agents reading the skill, humans skimming the
 * modal) can pick the right citation without re-reading the body.
 */
export interface PatternReference {
  /** Visual category. */
  type: PatternReferenceType;
  /**
   * Short citable handle in author-year style — e.g. `"Anderson 2006"`,
   * `"Hagel & Singer 1999"`, `"BMG 2010"`. The single source of truth
   * for any inline mention in `description.{en,zh}.md` prose so cites
   * stay traceable when someone edits the bibliography.
   */
  cite: string;
  /** Author(s) · title · venue, e.g.
   *  `"Chris Anderson · The Long Tail · Hyperion"`. */
  label: string;
  /** Publication year, separated so sort order is stable. */
  year?: number;
  /** Page range or chapter, e.g. `"pp. 66–71"`, `"Ch. 3"`,
   *  `"Mar–Apr 1999 issue"`. */
  pages?: string;
  /** Optional permalink / DOI. */
  url?: string;
  /** Bilingual ~30-word note: what THIS source contributes that others
   *  don't. The field that turns a flat bibliography into an annotated
   *  one. Both languages are required when present. */
  note?: LocalizedLabel;
}

/**
 * Detail response for `GET /library/patterns/:slug`. Bundles the
 * pattern metadata, the long-form bilingual description (read from the
 * disk markdown files), and hydrated example case metadata so the UI
 * can render the examples strip without an N+1 round trip.
 */
export interface BusinessModelPatternDetail {
  pattern: BusinessModelPattern;
  /** Bilingual long-form markdown body. UI renders the language matching
   *  the current locale; falls back to the other language if missing. */
  description: { en: string; zh: string };
  /** Hydrated case metadata for `pattern.examples[].slug`. Empty array
   *  if all example slugs are unresolved (validation should have caught
   *  this at build time). */
  exampleCases: CaseLibraryEntry[];
}

// ─── Strategy framework library ─────────────────────────────────────────────
// Strategic analysis methods such as Blue Ocean Strategy. Frameworks are
// read-only curated content like patterns, but semantically separate:
// they describe analysis methods and tools, not business-model structures.

export type StrategyFrameworkReferenceType = PatternReferenceType;

export type StrategyFrameworkCategory =
  | 'portfolio-growth'
  | 'environment-competition'
  | 'organization-ecosystem'
  | 'innovation-evidence'
  | 'customer-value-lens'
  | 'foresight-scenarios';

export interface StrategyFrameworkReference {
  type: StrategyFrameworkReferenceType;
  cite: string;
  label: string;
  year?: number;
  pages?: string;
  url?: string;
  note?: LocalizedLabel;
}

export interface StrategyFrameworkExampleRef {
  slug: string;
  role?: 'primary' | 'secondary';
}

export interface StrategyFramework {
  /** Stable kebab-case identity, e.g. 'blue-ocean-strategy'. */
  slug: string;
  /** Bilingual framework display name. */
  name: LocalizedLabel;
  /** Bilingual one-paragraph blurb shown on the framework card. */
  summary: LocalizedLabel;
  /** High-level family used to distinguish portfolio, environment, organization, foresight, and customer-value lenses. */
  category?: StrategyFrameworkCategory;
  /** Flat sources for backward-compatible citation rendering. */
  sources: CaseSource[];
  /** Annotated bibliography preferred by the UI and generated skill. */
  references?: StrategyFrameworkReference[];
  /** Curated concrete cases that demonstrate this framework. */
  examples: StrategyFrameworkExampleRef[];
  /** Canvas definitions that usually implement this framework. */
  relatedCanvasDefIds?: string[];
}

export interface StrategyFrameworkDetail {
  framework: StrategyFramework;
  /** Bilingual long-form markdown body. */
  description: { en: string; zh: string };
  /** Hydrated case metadata for `framework.examples[].slug`. */
  exampleCases: CaseLibraryEntry[];
}

// ─── Experiment library ─────────────────────────────────────────────────────
// Curated test recipes from Bland & Osterwalder, Testing Business Ideas
// (Wiley, 2019). Each Experiment is a typed metadata record for one of the
// selected experiments in TBI; the long-form prose lives in the parallel
// `description.{en,zh}.md` and `skill.{en,zh}.md` files. Experiments are
// served through BundleStorage / HTTP routes / LibraryPage and also picked
// up by the skill generator (`apps/cli/src/skill/*`) via a directory walk
// over `packages/case-library/experiments/`.
//
// Cross-link to canvases is forward-only: an experiment names which
// canvases it helps validate via `appliesToCanvases[]`. Canvases do not
// know about specific experiments; the agent picks an experiment from the
// library when the user lands on a riskiest-assumption sticky.

/** Where in the search-and-test journey this experiment fits. Discovery
 *  experiments are cheaper, weaker, and meant to course-correct fast;
 *  Validation experiments cost more and produce stronger evidence. */
export type ExperimentTheme = 'discovery' | 'validation';

/** TBI's three risk axes: Desirability (do customers want it?),
 *  Feasibility (can we build / deliver it?), Viability (can we earn
 *  money from it?). One experiment may target one or several. */
export type ExperimentRisk = 'desirability' | 'feasibility' | 'viability';

/** Strength of evidence the experiment produces. TBI's rule of thumb:
 *  call-to-action > opinion; ≥5 customers > 1; quantitative + qualitative
 *  > one alone; live tests > recalled. */
export type ExperimentEvidenceStrength = 'weak' | 'medium' | 'strong';

/** Coarse cost / setup / run-time tier — used by the skill workflow to
 *  match an experiment to the user's available budget and timeline. */
export type ExperimentCost = 'cheap' | 'medium' | 'expensive';
export type ExperimentDuration = 'hours' | 'days' | 'weeks';

/**
 * One curated experiment from the library. Lives at
 * `packages/case-library/experiments/<slug>/experiment.json`. The
 * sibling `description.{en,zh}.md` files carry the prose; the sibling
 * `skill.{en,zh}.md` files carry the AI-agent TL;DR.
 */
export interface Experiment {
  /** Stable kebab-case identity, e.g. `'customer-interview'`,
   *  `'smoke-test'`, `'wizard-of-oz'`. */
  slug: string;
  /** Bilingual experiment name. */
  name: LocalizedLabel;
  /** Bilingual one-paragraph blurb (~30 words) shown on the experiment
   *  card and at the top of the generated skill page. */
  summary: LocalizedLabel;
  /** Discovery vs Validation theme. */
  theme: ExperimentTheme;
  /** Subset of D/F/V the experiment helps test. Most discovery tests
   *  target Desirability only; validation tests usually combine. */
  risks: ExperimentRisk[];
  /** Evidence strength after a well-run instance. */
  evidenceStrength: ExperimentEvidenceStrength;
  /** Coarse cost band. */
  cost: ExperimentCost;
  /** Time to design and prepare the experiment. */
  setupTime: ExperimentDuration;
  /** Time to actually run + collect data once set up. */
  runTime: ExperimentDuration;
  /** Skills the team needs to run this well — drives "Capabilities"
   *  bullets in the skill page. Free-form kebab-case strings, e.g.
   *  `'interview-design'`, `'landing-page-copy'`, `'data-analysis'`. */
  capabilities: string[];
  /** Canvas ids this experiment most often validates. Drives the
   *  "Cross-canvas" section of the skill page and the agent's match
   *  logic when a user is editing a specific canvas. */
  appliesToCanvases: string[];
  /** Bibliography for the experiment definition. Same shape as
   *  `CaseSource` and `BusinessModelPattern.sources`. */
  sources: CaseSource[];
  /** Real-world examples of the experiment being run. Authored from
   *  Bland & Osterwalder TBI's case studies (e.g. Buffer Mock Sale,
   *  p.292) plus well-documented common-knowledge stories. Each entry
   *  carries either a single `story` paragraph (Compact density) or
   *  the full TBI 5-field structure (Featured density). When `caseSlug`
   *  resolves to a case-library entry the modal also renders an
   *  "Open full case" affordance. Empty array is fine — V1 ships with
   *  ~12-18 examples authored across the 12 experiments. */
  examples: ExperimentExample[];
  /** Pre-filled scaffold canvas the user lands on when they click "Use
   *  this experiment" from the library. Each entry maps to one zone of
   *  the experiment-canvas (riskiest-assumption / falsifiable-hypothesis
   *  / experiment-setup / metrics-criteria / results-conclusion /
   *  next-steps). Shipped experiments should carry all six zones; when
   *  absent, the seed flow falls back to a single setup-zone sticky. */
  template?: ExperimentTemplate;
}

/**
 * Scaffold content shipped with each experiment so the experiment-canvas
 * lands populated rather than empty when a user picks "Use this
 * experiment" from the library. Each sticky is placed into one of the
 * canvas's 6 zones; the user's job is to replace the bracketed
 * placeholders (e.g. `[Customer segment X]`) with their specifics.
 *
 * Authoring lives in `packages/case-library/experiments/<slug>/experiment.json`.
 * The seed payload builder (`apps/web/src/lib/seedExperimentStickies.ts`)
 * resolves a template into a `bulkStickies` payload; both the new-project
 * flow and the add-to-existing-project flow consume the same builder so
 * the two paths produce identical canvas content.
 */
export interface ExperimentTemplate {
  stickies: Array<{
    /** Must match a zone id from `experiment-canvas/manifest.json:zones[].id`. */
    zoneId: string;
    /** Sticky text — HTML fragment (`<p>`, `<strong>`, `<em>`, …) per
     *  the round-trip contract documented in `apps/server/src/http/stickyImport.ts`. */
    text: LocalizedLabel;
    /** Optional sticky-color override. e.g. `results-conclusion` may use
     *  a paler shade to signal "fill in after running". */
    color?: string;
  }>;
}

/**
 * One real-world example of an experiment being run. Lives embedded in
 * `experiment.json:examples[]` — no separate directory tree (mirrors
 * how `BusinessModelPattern.examples` lists case slugs but inlines the
 * `role` metadata; here the entire vignette is inlined and the case
 * pointer is optional).
 *
 * Two render densities share this shape:
 *   - **Compact** — only `company` + `story` populated. Single
 *     paragraph. Used for the lesser examples / vignettes.
 *   - **Featured** — `hypothesis` + `experiment` + `evidence` +
 *     `insights` + `actions` populated. Full TBI case-study layout.
 *     `story` becomes optional context paragraph above the 5-field
 *     stack. Used for the most documented stories (Buffer Mock Sale,
 *     Dropbox MVP video, Zappos bootstrap).
 *
 * The modal switches between densities by checking `hypothesis` —
 * presence flips to Featured. This keeps a single typed shape for both
 * authoring paths.
 */
export interface ExperimentExample {
  /** Company / product name, bilingual. */
  company: LocalizedLabel;
  /** Year or year-range — "2007", "2010-2012". Optional when fuzzy. */
  year?: string;
  /** Optional memorable headline (TBI style: "They will come, when you
   *  build it"). Rendered italic below the company line. */
  headline?: LocalizedLabel;
  /** Short narrative paragraph. Required for Compact density; optional
   *  context for Featured. */
  story?: LocalizedLabel;
  /** When set, the modal switches to Featured density and renders
   *  `hypothesis` / `experiment` / `evidence` / `insights` / `actions`
   *  as 5 stacked sub-blocks. */
  hypothesis?: LocalizedLabel;
  experiment?: LocalizedLabel;
  evidence?: LocalizedLabel;
  insights?: LocalizedLabel;
  actions?: LocalizedLabel;
  /** Bibliographic citation — book + page, blog post, interview. */
  source?: string;
  /** When set, must resolve to `packages/case-library/cases/<slug>/`.
   *  The modal renders an "Open full case →" link that opens
   *  `CasePreviewModal`. The build-time `pingarden case validate`
   *  validator enforces the slug exists. */
  caseSlug?: string;
}

/**
 * Hydrated experiment payload — what `GET /library/experiments/:slug`
 * returns. Mirrors `BusinessModelPatternDetail` minus `exampleCases[]`:
 * experiments are abstract methods, not associated with concrete cases.
 */
export interface BusinessModelExperimentDetail {
  experiment: Experiment;
  /** Bilingual long-form markdown body. UI renders the language matching
   *  the current locale; falls back to the other language if missing. */
  description: { en: string; zh: string };
}

// ─── Resource library ───────────────────────────────────────────────────────
// Curated books, articles, reports, and public sources that explain where the
// case-library methods come from and how to read them.

export type LibraryResourceType = 'book' | 'article' | 'paper' | 'report' | 'web';

export interface LibraryResource {
  /** Stable kebab-case identity. */
  slug: string;
  /** Source format for filtering and display. */
  type: LibraryResourceType;
  /** Bilingual title shown on the resource card. */
  title: LocalizedLabel;
  /** Bilingual one-paragraph summary of what the source is about. */
  summary: LocalizedLabel;
  /** Bilingual recommendation: why PinGarden users should read this. */
  recommendation: LocalizedLabel;
  /** Authors, editors, or publishing institution. */
  authors: string[];
  /** Publisher / journal / institution. */
  publisher?: string;
  /** Publication year when known. */
  year?: number;
  /** Lightweight topical tags. */
  tags?: string[];
  /** Related canvas templates. */
  relatedCanvasDefIds?: string[];
  /** Related case-library case slugs. */
  relatedCaseSlugs?: string[];
  /** Related pattern slugs. */
  relatedPatternSlugs?: string[];
  /** Related experiment slugs. */
  relatedExperimentSlugs?: string[];
  /** Related strategy-framework slugs. */
  relatedStrategyFrameworkSlugs?: string[];
  /** Bibliographic / web citation rows. */
  sources: CaseSource[];
  /** Number of chapter-level reading notes when this resource ships chapters. */
  chapterCount?: number;
}

export interface LibraryResourceDetail {
  resource: LibraryResource;
  /** Bilingual long-form reading note. */
  description: { en: string; zh: string };
  /** Hydrated cases for `relatedCaseSlugs[]`. */
  relatedCases: CaseLibraryEntry[];
  /** Chapter index for this resource — present when the resource bundles a
   *  `chapters/index.json` on disk. Null / absent when the resource has no
   *  chapter-level content. */
  chapters?: ResourceChapterMeta[];
}

/**
 * One chapter in a book resource. Lives on disk inside
 * `packages/case-library/resources/<slug>/chapters/index.json`. The chapter
 * slug is the filename stem of its bilingual markdown file (e.g. chapter
 * slug `ch01-intro` ↔ `ch01-intro.en.md` + `ch01-intro.zh.md`).
 */
export interface ResourceChapterMeta {
  /** Stable kebab-case slug within the resource, e.g. `ch01-intro`. */
  slug: string;
  /** Display order (1-based). */
  order: number;
  /** Bilingual chapter title. */
  title: LocalizedLabel;
  /** Bilingual one-paragraph summary of what this chapter covers. */
  summary: LocalizedLabel;
  /** Related case-library case slugs that illustrate this chapter's content. */
  relatedCaseSlugs?: string[];
  /** Related canvas-def ids that this chapter's methods map onto. */
  relatedCanvasDefIds?: string[];
  /** Related pattern slugs that this chapter discusses. */
  relatedPatternSlugs?: string[];
}

/**
 * Hydrated chapter detail — what `GET /library/resources/:resource/chapters/:chapter`
 * returns. Mirrors `LibraryResourceDetail` but scoped to a single chapter.
 */
export interface ResourceChapterDetail {
  chapter: ResourceChapterMeta;
  /** Bilingual markdown content for this chapter. */
  content: { en: string; zh: string };
  /** Hydrated cases for `chapter.relatedCaseSlugs[]`. */
  relatedCases: CaseLibraryEntry[];
}

/**
 * Response from `POST /library/cases/:slug/fork`. The new project lives in
 * user storage and is fully editable; the original library case is
 * untouched.
 */
export interface CaseForkResult {
  project: Project;
  /** New canvas ids in the user copy (parallel to the source library
   *  canvases by index). Useful when the caller wants to deep-link
   *  straight into a specific forked canvas. */
  canvasIds: string[];
  /** New story ids in the user copy. */
  storyIds: string[];
}

/**
 * Detail response for `GET /library/cases/:slug` — case metadata plus
 * the runtime project / canvas / story metadata that lives behind it.
 * Keeps the case browsing UI in one round trip.
 */
export interface CaseLibraryDetail {
  case: CaseLibraryEntry;
  project: Project;
  canvases: CanvasMeta[];
  stories: StoryMeta[];
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
