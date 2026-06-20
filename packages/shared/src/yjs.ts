import { randomUUID } from 'node:crypto';
import * as Y from 'yjs';
import type {
  CanvasDef,
  ColorLegendEntry,
  ObjectsBulkInput,
  ObjectType,
  Pin,
  PinClass,
  PinIcon,
  XAxisItem,
  ZoneShape,
} from './index.js';
import {
  DEFAULT_CHART_COLOR,
  DEFAULT_STICKY_HEIGHT,
  DEFAULT_STICKY_WIDTH,
  STICKY_MIN_HEIGHT,
  STICKY_MIN_WIDTH,
  STICKY_PALETTE,
  effectiveObjectTypes,
} from './index.js';

/**
 * Yjs encoding seam. Two distinct halves:
 *
 *   1. Per-root Y.Map / Y.Array builders + readers for stickies, pin
 *      classes, pins, x-axis items, chart-config overrides, and color
 *      legend. These match the shapes the web client writes (see
 *      `apps/web/src/collab/*`) so doc state round-trips.
 *
 *   2. A high-level `encodeObjectsBulk` function: take an
 *      `ObjectsBulkInput` payload + an optional starting state, return
 *      a fresh Yjs binary. Used by the server's
 *      `POST /canvases/:id/objects/bulk` route AND the CLI's
 *      `pingarden case author` command — single source of truth for
 *      "JSON in → live.ydoc bytes out".
 *
 * Lives in `packages/shared` (not the server) specifically so the CLI
 * authoring tool can produce `live.ydoc` files for the case-library
 * bundle without spinning up a server. Single source of truth — if the
 * web encoder shape ever changes, this is the place that mirrors it
 * (the existing comment in apps/server/src/collab/encoders.ts about
 * "parallel implementation" applies here now too).
 */

// ─── x-axis items ─────────────────────────────────────────────────────
export const X_AXIS_ITEMS_KEY = 'xAxisItems';

export function getXAxisItemsRoot(doc: Y.Doc): Y.Array<Y.Map<unknown>> {
  return doc.getArray<Y.Map<unknown>>(X_AXIS_ITEMS_KEY);
}

export function makeXAxisItemYMap(item: XAxisItem): Y.Map<unknown> {
  const m = new Y.Map<unknown>();
  m.set('id', item.id);
  m.set('labelEn', item.label.en);
  m.set('labelZh', item.label.zh);
  return m;
}

export function readXAxisItem(yMap: Y.Map<unknown>): XAxisItem | null {
  const id = yMap.get('id') as string | undefined;
  if (!id) return null;
  const labelEn = (yMap.get('labelEn') as string | undefined) ?? '';
  const labelZh = (yMap.get('labelZh') as string | undefined) ?? '';
  return { id, label: { en: labelEn, zh: labelZh } };
}

// ─── pin classes ──────────────────────────────────────────────────────
export const PIN_CLASSES_KEY = 'pinClasses';

const ALLOWED_ICONS: PinIcon[] = ['circle', 'triangle', 'square', 'star', 'flag'];

function normalizeIcon(raw: unknown): PinIcon {
  return typeof raw === 'string' && (ALLOWED_ICONS as string[]).includes(raw)
    ? (raw as PinIcon)
    : 'circle';
}

export function getPinClassesRoot(doc: Y.Doc): Y.Map<Y.Map<unknown>> {
  return doc.getMap<Y.Map<unknown>>(PIN_CLASSES_KEY);
}

export function makePinClassYMap(c: PinClass): Y.Map<unknown> {
  const m = new Y.Map<unknown>();
  m.set('id', c.id);
  m.set('label', c.label);
  m.set('color', c.color);
  m.set('icon', c.icon);
  m.set('authorName', c.authorName);
  m.set('createdAt', c.createdAt);
  return m;
}

export function readPinClass(yMap: Y.Map<unknown>): PinClass | null {
  const id = yMap.get('id') as string | undefined;
  if (!id) return null;
  const label = (yMap.get('label') as string | undefined) ?? '';
  const color = (yMap.get('color') as string | undefined) ?? DEFAULT_CHART_COLOR;
  const icon = normalizeIcon(yMap.get('icon'));
  const authorName = (yMap.get('authorName') as string | undefined) ?? '';
  const createdAt = (yMap.get('createdAt') as string | undefined) ?? '';
  return { id, label, color, icon, authorName, createdAt };
}

// ─── pins ─────────────────────────────────────────────────────────────
export const PINS_KEY = 'pins';

export function getPinsRoot(doc: Y.Doc): Y.Map<Y.Map<unknown>> {
  return doc.getMap<Y.Map<unknown>>(PINS_KEY);
}

export function makePinYMap(pin: Pin): Y.Map<unknown> {
  const m = new Y.Map<unknown>();
  m.set('id', pin.id);
  m.set('classId', pin.classId);
  m.set('x', pin.x);
  m.set('y', pin.y);
  if (pin.label) m.set('label', pin.label);
  if (pin.body) m.set('body', pin.body);
  m.set('authorName', pin.authorName);
  m.set('createdAt', pin.createdAt);
  return m;
}

export function readPin(yMap: Y.Map<unknown>): Pin | null {
  const id = yMap.get('id') as string | undefined;
  const classId = yMap.get('classId') as string | undefined;
  const x = yMap.get('x') as number | undefined;
  const y = yMap.get('y') as number | undefined;
  if (!id || !classId || x === undefined || y === undefined) return null;
  const label = (yMap.get('label') as string | undefined) ?? undefined;
  const body = (yMap.get('body') as string | undefined) ?? undefined;
  const authorName = (yMap.get('authorName') as string | undefined) ?? '';
  const createdAt = (yMap.get('createdAt') as string | undefined) ?? '';
  return {
    id,
    classId,
    x,
    y,
    ...(label ? { label } : {}),
    ...(body ? { body } : {}),
    authorName,
    createdAt,
  };
}

// ─── chart config overrides ───────────────────────────────────────────
export const CHART_CONFIG_KEY = 'chartConfig';

export type ChartConfigLabelKey =
  | 'yAxisLabel'
  | 'yAxisLowLabel'
  | 'yAxisHighLabel';

export interface ChartConfigOverrides {
  yAxisLabel?: { en?: string; zh?: string };
  yAxisLowLabel?: { en?: string; zh?: string };
  yAxisHighLabel?: { en?: string; zh?: string };
}

export function getChartConfigRoot(doc: Y.Doc): Y.Map<unknown> {
  return doc.getMap<unknown>(CHART_CONFIG_KEY);
}

export function readChartConfig(doc: Y.Doc): ChartConfigOverrides {
  const root = getChartConfigRoot(doc);
  const out: ChartConfigOverrides = {};
  const keys: ChartConfigLabelKey[] = [
    'yAxisLabel',
    'yAxisLowLabel',
    'yAxisHighLabel',
  ];
  for (const k of keys) {
    const en = root.get(`${k}.en`);
    const zh = root.get(`${k}.zh`);
    if (typeof en === 'string' || typeof zh === 'string') {
      out[k] = {
        ...(typeof en === 'string' ? { en } : {}),
        ...(typeof zh === 'string' ? { zh } : {}),
      };
    }
  }
  return out;
}

// ─── color legend ─────────────────────────────────────────────────────
export const COLOR_LEGEND_KEY = 'colorLegend';

const STICKY_PALETTE_SET = new Set<string>(STICKY_PALETTE);

export function getColorLegendRoot(doc: Y.Doc): Y.Map<unknown> {
  return doc.getMap<unknown>(COLOR_LEGEND_KEY);
}

export function readColorLegend(
  doc: Y.Doc,
): Record<string, ColorLegendEntry> {
  const root = getColorLegendRoot(doc);
  const out: Record<string, ColorLegendEntry> = {};
  for (const hex of STICKY_PALETTE) {
    const label = root.get(`${hex}.label`);
    if (typeof label !== 'string' || label.trim().length === 0) continue;
    const description = root.get(`${hex}.description`);
    out[hex] = {
      label,
      ...(typeof description === 'string' && description.length > 0
        ? { description }
        : {}),
    };
  }
  return out;
}

export function isStickyPaletteHex(hex: string): boolean {
  return STICKY_PALETTE_SET.has(hex);
}

// ─── high-level bulk encoder ──────────────────────────────────────────

const STICKIES_KEY = 'stickies';
const STICKY_DEFAULT_COLOR = '#FCF1A8'; // mirrors apps/web/src/collab/stickies.ts

export interface EncodeBulkOptions {
  /** Optional starting Yjs state to merge on top of (incremental import). */
  prevState?: Uint8Array;
  /** Display name used for sticky/pin authors when not specified per-item. */
  defaultAuthor: string;
  /** ISO timestamp written onto every newly-created entity. Defaults to
   *  `new Date().toISOString()`. Pinning a value lets builders produce
   *  byte-stable output for the same input — the case-library author
   *  command relies on this for deterministic `live.ydoc` files. */
  now?: string;
}

export interface EncodeBulkResult {
  /** The encoded full Yjs state, ready to write to disk or send over
   *  HTTP. */
  state: Uint8Array;
  /** Counts of items written per root, for status reporting. */
  replaced: {
    stickies: number;
    pinClasses: number;
    pins: number;
    xAxisItems: number;
    colorLegend: number;
  };
}

/**
 * Domain error thrown by `encodeObjectsBulk` when the input is invalid
 * against the canvas def. Catching code can surface it as 400 (server)
 * or BAD_INPUT (CLI). Carries enough context to render an actionable
 * error: which zoneIds were unknown, which class ids dangled, which
 * hex codes were off-palette.
 */
export class EncodeBulkInputError extends Error {
  override readonly name = 'EncodeBulkInputError';
  constructor(
    public readonly code:
      | 'OBJECT_TYPE_NOT_ALLOWED'
      | 'UNKNOWN_ZONE_IDS'
      | 'UNKNOWN_PIN_CLASS_IDS'
      | 'OFF_PALETTE_COLOR_LEGEND',
    message: string,
    public readonly details: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

/**
 * Encode an `ObjectsBulkInput` payload into a fresh Yjs document state,
 * optionally merging onto an existing state. Per-key replace semantics:
 * only roots present in the payload are touched; everything else on the
 * doc carries through unchanged.
 *
 * Pure function — does no I/O. Throws `EncodeBulkInputError` on any
 * input that violates the canvas def's contract.
 */
export function encodeObjectsBulk(
  input: ObjectsBulkInput,
  def: CanvasDef,
  opts: EncodeBulkOptions,
): EncodeBulkResult {
  const now = opts.now ?? new Date().toISOString();
  const defaultAuthor = opts.defaultAuthor;

  // Validate object-type allow-list before touching any Yjs state.
  const allowed = new Set<ObjectType>(effectiveObjectTypes(def));
  const provided2types: Record<
    Exclude<keyof ObjectsBulkInput, 'colorLegend'>,
    ObjectType
  > = {
    stickies: 'sticky',
    pinClasses: 'pinClass',
    pins: 'pin',
    xAxisItems: 'xAxisItem',
  };
  for (const key of Object.keys(input) as Array<keyof ObjectsBulkInput>) {
    if (input[key] === undefined) continue;
    if (key === 'colorLegend') continue;
    if (!allowed.has(provided2types[key])) {
      throw new EncodeBulkInputError(
        'OBJECT_TYPE_NOT_ALLOWED',
        `Object type '${provided2types[key]}' not allowed on canvas '${def.id}'`,
        { type: provided2types[key], allowed: [...allowed] },
      );
    }
  }

  const zoneById = new Map(def.zones.map((z) => [z.id, z]));
  const doc = new Y.Doc();
  try {
    if (opts.prevState && opts.prevState.byteLength > 0) {
      Y.applyUpdate(doc, opts.prevState);
    }

    // ── stickies (replace whole map) ──
    if (input.stickies) {
      const root = doc.getMap<Y.Map<unknown>>(STICKIES_KEY);
      const unknown = [
        ...new Set(
          input.stickies.map((s) => s.zoneId).filter((z) => !zoneById.has(z)),
        ),
      ];
      if (unknown.length > 0) {
        throw new EncodeBulkInputError(
          'UNKNOWN_ZONE_IDS',
          'Unknown zoneId(s) for this canvas',
          {
            unknownZoneIds: unknown,
            knownZoneIds: def.zones.map((z) => z.id),
          },
        );
      }
      doc.transact(() => {
        root.forEach((_v, k) => root.delete(k));
        // Pre-pass: count stickies per zone so each zone's auto-layout
        // knows the *total* it needs to fit. resolvePosition uses this
        // to optionally shrink stickyH so 4 stickies fit in a
        // 3-row-by-default zone (BMC short zones), and to decide
        // whether to wrap into 2 / 3 columns. Without this each
        // sticky is laid out in isolation and the 4th sticky in a
        // 3-row zone overflows downward.
        const totalByZone = new Map<string, number>();
        for (const sIn of input.stickies!) {
          totalByZone.set(sIn.zoneId, (totalByZone.get(sIn.zoneId) ?? 0) + 1);
        }
        const idxByZone = new Map<string, number>();
        input.stickies!.forEach((sIn) => {
          const id = randomUUID();
          const zone = zoneById.get(sIn.zoneId)!;
          const localIdx = idxByZone.get(sIn.zoneId) ?? 0;
          idxByZone.set(sIn.zoneId, localIdx + 1);
          const total = totalByZone.get(sIn.zoneId) ?? 1;
          const placed = resolvePosition(
            zone.shape,
            sIn.x,
            sIn.y,
            localIdx,
            total,
            sIn.width,
            sIn.height,
          );
          const author = (sIn.authorName ?? defaultAuthor).slice(0, 64);

          const sticky = new Y.Map<unknown>();
          sticky.set('id', id);
          sticky.set('zoneId', sIn.zoneId);
          sticky.set('x', placed.x);
          sticky.set('y', placed.y);
          // Persist explicit dimensions either when the spec carried
          // them OR when auto-layout shrunk the sticky to fit. The
          // renderer falls back to DEFAULT_STICKY_{WIDTH,HEIGHT} when
          // these are absent, so omitting them when at default keeps
          // the stored Yjs shape minimal and byte-stable.
          const width = placed.width ?? sIn.width;
          const height = placed.height ?? sIn.height;
          if (width !== undefined) sticky.set('width', width);
          if (height !== undefined) sticky.set('height', height);
          sticky.set('text', sIn.text);
          sticky.set('color', sIn.color ?? STICKY_DEFAULT_COLOR);
          sticky.set('authorName', author);
          sticky.set('createdAt', now);
          const history = new Y.Array<Y.Map<unknown>>();
          const entry = new Y.Map<unknown>();
          entry.set('zoneId', sIn.zoneId);
          entry.set('at', now);
          entry.set('by', author);
          history.push([entry]);
          sticky.set('zoneHistory', history);
          root.set(id, sticky);
        });
      });
    }

    // ── pinClasses (replace whole map) ──
    const importedClassIds = new Set<string>();
    if (input.pinClasses) {
      const root = getPinClassesRoot(doc);
      doc.transact(() => {
        root.forEach((_v, k) => root.delete(k));
        input.pinClasses!.forEach((cIn) => {
          const id = cIn.id ?? randomUUID();
          const author = (cIn.authorName ?? defaultAuthor).slice(0, 64);
          importedClassIds.add(id);
          root.set(
            id,
            makePinClassYMap({
              id,
              label: cIn.label,
              color: cIn.color ?? DEFAULT_CHART_COLOR,
              icon: cIn.icon ?? 'circle',
              authorName: author,
              createdAt: now,
            }),
          );
        });
      });
    } else {
      // Use the existing classes already in the doc as the membership
      // set — needed when callers upload pins referencing classes they
      // (or a previous import) already created.
      const root = getPinClassesRoot(doc);
      root.forEach((_v, id) => importedClassIds.add(id));
    }

    // ── pins (replace whole map) ──
    if (input.pins) {
      const unknownClasses = [
        ...new Set(
          input.pins
            .map((p) => p.classId)
            .filter((cid) => !importedClassIds.has(cid)),
        ),
      ];
      if (unknownClasses.length > 0) {
        throw new EncodeBulkInputError(
          'UNKNOWN_PIN_CLASS_IDS',
          'Unknown pin classId(s)',
          {
            unknownClassIds: unknownClasses,
            knownClassIds: [...importedClassIds],
          },
        );
      }
      const root = getPinsRoot(doc);
      doc.transact(() => {
        root.forEach((_v, k) => root.delete(k));
        input.pins!.forEach((pIn) => {
          const id = pIn.id ?? randomUUID();
          const author = (pIn.authorName ?? defaultAuthor).slice(0, 64);
          root.set(
            id,
            makePinYMap({
              id,
              classId: pIn.classId,
              x: pIn.x,
              y: pIn.y,
              ...(pIn.label ? { label: pIn.label } : {}),
              ...(pIn.body ? { body: pIn.body } : {}),
              authorName: author,
              createdAt: now,
            }),
          );
        });
      });
    }

    // ── xAxisItems (replace array) ──
    if (input.xAxisItems) {
      const root = getXAxisItemsRoot(doc);
      doc.transact(() => {
        if (root.length > 0) root.delete(0, root.length);
        input.xAxisItems!.forEach((it) => {
          root.push([makeXAxisItemYMap({ id: it.id, label: it.label })]);
        });
      });
    }

    // ── colorLegend (replace whole map) ──
    if (input.colorLegend) {
      const offPalette = Object.keys(input.colorLegend).filter(
        (hex) => !isStickyPaletteHex(hex),
      );
      if (offPalette.length > 0) {
        throw new EncodeBulkInputError(
          'OFF_PALETTE_COLOR_LEGEND',
          'colorLegend keys must be members of STICKY_PALETTE',
          { offPalette },
        );
      }
      const root = getColorLegendRoot(doc);
      doc.transact(() => {
        root.forEach((_v, k) => root.delete(k));
        for (const [hex, entry] of Object.entries(input.colorLegend!)) {
          const label = entry.label.trim();
          if (label.length === 0) continue;
          root.set(`${hex}.label`, label);
          if (entry.description && entry.description.trim().length > 0) {
            root.set(`${hex}.description`, entry.description.trim());
          }
        }
      });
    }

    const state = Y.encodeStateAsUpdate(doc);
    return {
      state,
      replaced: {
        stickies: input.stickies?.length ?? 0,
        pinClasses: input.pinClasses?.length ?? 0,
        pins: input.pins?.length ?? 0,
        xAxisItems: input.xAxisItems?.length ?? 0,
        colorLegend: input.colorLegend
          ? Object.keys(input.colorLegend).length
          : 0,
      },
    };
  } finally {
    doc.destroy();
  }
}

// ─── geometry helpers (mirrored from web hitTest) ─────────────────────

function zoneBounds(shape: ZoneShape): { x: number; y: number; w: number; h: number } {
  if (shape.type === 'rect') return { x: shape.x, y: shape.y, w: shape.w, h: shape.h };
  if (shape.type === 'polygon') {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [x, y] of shape.points) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }
  return {
    x: shape.cx - shape.r,
    y: shape.cy - shape.r,
    w: shape.r * 2,
    h: shape.r * 2,
  };
}

/**
 * Auto-layout for stickies inside a zone. Returns the centre `x/y` for
 * sticky `idxInZone` (0-based) of `totalInZone` total stickies in that
 * zone, plus an optional `width` / `height` override when the layout
 * had to shrink stickies to make them all fit.
 *
 * Strategy: prefer 1 column (matches the Strategyzer book reference —
 * stickies stack top-down inside each block). Auto-shrink `stickyH`
 * when N stickies wouldn't fit at default height. Fall back to 2 / 3
 * columns only when single-column shrinking would push stickies below
 * `STICKY_MIN_HEIGHT` (i.e. unreadably small) AND the zone is wide
 * enough to host multiple columns.
 *
 * Edge cases the auto-layout cannot rescue:
 * - Polygon / circle-segment zones: positioning uses the
 *   axis-aligned bounding box, so stickies near the bbox corners may
 *   visually clip the polygon edge. Acceptable for now; a future
 *   pass can introduce a `layoutBox` field on each zone in the
 *   canvas-def manifest.
 * - Extreme zone aspect ratios + many stickies (e.g.
 *   design-criteria-canvas's 1080×150 strip with 6 stickies):
 *   `stickyH` floors at `STICKY_MIN_HEIGHT` and the bottom edge of
 *   the last sticky may peek slightly past `zone.bottom`. The author
 *   should bump zone height in the def or split content across
 *   zones.
 */
function resolvePosition(
  shape: ZoneShape,
  x: number | undefined,
  y: number | undefined,
  idxInZone: number,
  totalInZone: number,
  explicitWidth?: number,
  explicitHeight?: number,
): { x: number; y: number; width?: number; height?: number } {
  const b = zoneBounds(shape);
  const topPad = 70; // clears zone label + prompt baked into the SVG
  const sidePad = 12;
  const botPad = 12;
  const gap = 8;
  const innerH = Math.max(STICKY_MIN_HEIGHT, b.h - topPad - botPad);
  const innerW = Math.max(STICKY_MIN_WIDTH, b.w - 2 * sidePad);
  const requestedW = explicitWidth ?? DEFAULT_STICKY_WIDTH;
  const requestedH = explicitHeight ?? DEFAULT_STICKY_HEIGHT;

  if (x !== undefined && y !== undefined) {
    const stickyW = Math.min(Math.max(requestedW, STICKY_MIN_WIDTH), innerW);
    const stickyH = Math.min(Math.max(requestedH, STICKY_MIN_HEIGHT), b.h);
    const clamped = clampStickyCenterToBounds(x, y, b, stickyW, stickyH);
    return {
      ...clamped,
      ...(stickyW !== requestedW ? { width: stickyW } : {}),
      ...(stickyH !== requestedH ? { height: stickyH } : {}),
    };
  }

  // Try cols = 1 first. Escalate to 2 / 3 only when single-column
  // shrinking would make stickies unreadably short AND the zone is
  // wide enough to actually fit additional columns (sticky width
  // staying ≥ MIN_WIDTH).
  const total = Math.max(1, totalInZone);
  let cols = 1;
  let rowsPerCol = total;
  let stickyW = Math.min(requestedW, innerW);
  let stickyH = Math.min(
    requestedH,
    (innerH - (rowsPerCol - 1) * gap) / rowsPerCol,
  );

  if (stickyH < STICKY_MIN_HEIGHT && innerW >= 2 * STICKY_MIN_WIDTH + gap) {
    cols = 2;
    rowsPerCol = Math.ceil(total / cols);
    stickyW = Math.min(requestedW, (innerW - gap) / cols);
    stickyH = Math.min(
      requestedH,
      (innerH - (rowsPerCol - 1) * gap) / rowsPerCol,
    );
  }
  if (stickyH < STICKY_MIN_HEIGHT && innerW >= 3 * STICKY_MIN_WIDTH + 2 * gap) {
    cols = 3;
    rowsPerCol = Math.ceil(total / cols);
    stickyW = Math.min(requestedW, (innerW - 2 * gap) / cols);
    stickyH = Math.min(
      requestedH,
      (innerH - (rowsPerCol - 1) * gap) / rowsPerCol,
    );
  }
  // Floor at min readable size — extreme cases (very many stickies in
  // a tiny zone) accept a small overflow rather than producing
  // unreadable 5px-tall stickies.
  stickyH = Math.max(stickyH, STICKY_MIN_HEIGHT);
  stickyW = Math.max(stickyW, STICKY_MIN_WIDTH);

  const col = Math.min(cols - 1, Math.floor(idxInZone / rowsPerCol));
  const row = idxInZone - col * rowsPerCol;
  const cx = b.x + sidePad + stickyW / 2 + col * (stickyW + gap);
  const cy = b.y + topPad + stickyH / 2 + row * (stickyH + gap);
  const clamped = clampStickyCenterToBounds(x ?? cx, y ?? cy, b, stickyW, stickyH);
  // Only persist width / height when the layout had to shrink. The
  // renderer's defaults handle the common case so the stored Yjs
  // shape stays minimal.
  const out: { x: number; y: number; width?: number; height?: number } = clamped;
  if (stickyW !== requestedW || stickyW < DEFAULT_STICKY_WIDTH) out.width = stickyW;
  if (stickyH !== requestedH || stickyH < DEFAULT_STICKY_HEIGHT) out.height = stickyH;
  return out;
}

function clampStickyCenterToBounds(
  x: number,
  y: number,
  b: { x: number; y: number; w: number; h: number },
  stickyW: number,
  stickyH: number,
): { x: number; y: number } {
  return {
    x: clampCenter(x, b.x, b.x + b.w, stickyW),
    y: clampCenter(y, b.y, b.y + b.h, stickyH),
  };
}

function clampCenter(value: number, minEdge: number, maxEdge: number, size: number): number {
  const min = minEdge + size / 2;
  const max = maxEdge - size / 2;
  if (min > max) return (minEdge + maxEdge) / 2;
  return Math.min(Math.max(value, min), max);
}
