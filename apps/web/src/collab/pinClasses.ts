import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import type { PinClass, PinIcon } from '@pingarden/shared';
import { CHART_PALETTE, DEFAULT_CHART_COLOR } from '@pingarden/shared';

/**
 * Stable Y.Doc root key. Server bulk-import / AI-context use the same
 * literal — keep them in sync.
 */
export const PIN_CLASSES_KEY = 'pinClasses';

const ICON_CYCLE: PinIcon[] = ['circle', 'triangle', 'square', 'star', 'flag'];

export function getPinClassesRoot(doc: Y.Doc): Y.Map<Y.Map<unknown>> {
  return doc.getMap<Y.Map<unknown>>(PIN_CLASSES_KEY);
}

function readClass(yMap: Y.Map<unknown>): PinClass | null {
  const id = yMap.get('id') as string | undefined;
  if (!id) return null;
  const label = (yMap.get('label') as string | undefined) ?? '';
  const color = (yMap.get('color') as string | undefined) ?? DEFAULT_CHART_COLOR;
  const iconRaw = yMap.get('icon') as string | undefined;
  const icon: PinIcon =
    iconRaw === 'triangle' ||
    iconRaw === 'square' ||
    iconRaw === 'star' ||
    iconRaw === 'flag' ||
    iconRaw === 'circle'
      ? iconRaw
      : 'circle';
  const authorName = (yMap.get('authorName') as string | undefined) ?? '';
  const createdAt = (yMap.get('createdAt') as string | undefined) ?? '';
  return { id, label, color, icon, authorName, createdAt };
}

export function usePinClasses(doc: Y.Doc | null): PinClass[] {
  const [items, setItems] = useState<PinClass[]>([]);
  useEffect(() => {
    if (!doc) return;
    const root = getPinClassesRoot(doc);

    function snapshot() {
      const arr: PinClass[] = [];
      root.forEach((y) => {
        const c = readClass(y);
        if (c) arr.push(c);
      });
      arr.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      setItems(arr);
    }

    snapshot();
    root.observeDeep(snapshot);
    return () => root.unobserveDeep(snapshot);
  }, [doc]);

  return items;
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
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

interface AddPinClassInput {
  id?: string;
  label: string;
  color?: string;
  icon?: PinIcon;
  authorName: string;
}

/**
 * Returns the next color/icon pair the legend should default to —
 * picks the first palette color not already in use, and rotates
 * icons so consecutive classes are visually distinct even if all
 * colors get used (the user can override either).
 */
export function pickNextClassStyle(
  existing: PinClass[],
): { color: string; icon: PinIcon } {
  const usedColors = new Set(existing.map((c) => c.color));
  const color =
    CHART_PALETTE.find((c) => !usedColors.has(c)) ?? DEFAULT_CHART_COLOR;
  const icon = ICON_CYCLE[existing.length % ICON_CYCLE.length] ?? 'circle';
  return { color, icon };
}

export function addPinClass(doc: Y.Doc, input: AddPinClassInput): string {
  const id = input.id ?? uuid();
  const root = getPinClassesRoot(doc);
  // Compute defaults from the current snapshot so palette / icon rotate.
  const existing: PinClass[] = [];
  root.forEach((y) => {
    const c = readClass(y);
    if (c) existing.push(c);
  });
  const { color: nextColor, icon: nextIcon } = pickNextClassStyle(existing);
  const cls: PinClass = {
    id,
    label: input.label,
    color: input.color ?? nextColor,
    icon: input.icon ?? nextIcon,
    authorName: input.authorName,
    createdAt: new Date().toISOString(),
  };
  doc.transact(() => {
    root.set(id, makePinClassYMap(cls));
  });
  return id;
}

export function updatePinClass(
  doc: Y.Doc,
  id: string,
  patch: { label?: string; color?: string; icon?: PinIcon },
) {
  const root = getPinClassesRoot(doc);
  const cls = root.get(id);
  if (!cls) return;
  doc.transact(() => {
    if (patch.label !== undefined) cls.set('label', patch.label);
    if (patch.color !== undefined) cls.set('color', patch.color);
    if (patch.icon !== undefined) cls.set('icon', patch.icon);
  });
}

/**
 * Remove a class. The caller is responsible for cascading: pin removal
 * is in `pins.ts`'s `clearPinsForClass`, called in the same transact
 * block by the inspector before this remove.
 */
export function removePinClass(doc: Y.Doc, id: string) {
  const root = getPinClassesRoot(doc);
  doc.transact(() => {
    root.delete(id);
  });
}
