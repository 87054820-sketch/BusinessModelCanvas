import * as Y from 'yjs';
import type { Pin, PinClass, PinIcon, XAxisItem } from '@canvas-collab/shared';
import { DEFAULT_CHART_COLOR } from '@canvas-collab/shared';

/**
 * Server-side mirror of the Y.Map encoders that live in
 * `apps/web/src/collab/{stickies,pinClasses,pins,xAxisItems}.ts`.
 *
 * These functions intentionally duplicate field names / shapes from
 * the web modules — keeping them as a parallel implementation (rather
 * than a shared package) means the server stays free of React /
 * browser-only imports, while the contract is enforced by the shared
 * TypeScript types in `packages/shared/src/index.ts`. If you change a
 * field on the web encoder, change it here in the same commit.
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
//
// Per-canvas user overrides for the manifest-supplied chart axis labels
// (Y-axis main label, Low / High descriptions). Mirrors
// `apps/web/src/collab/chartConfig.ts` — same keys, same flat
// `<labelKey>.<lang>` Y.Map layout — so the AI context endpoint can
// surface what the user actually sees, not the manifest defaults.
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

/**
 * Read the chartConfig overrides as a plain object. Always returns an
 * object — empty when nothing has been overridden — so callers can do
 * `overrides.yAxisLabel?.zh ?? manifest.label.zh` without null checks.
 */
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
