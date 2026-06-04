import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import type { XAxisItem, Lang } from '@canvas-collab/shared';

/**
 * Stable Y.Doc root key. Server bulk-import / AI-context use the same
 * literal — keep them in sync.
 */
export const X_AXIS_ITEMS_KEY = 'xAxisItems';

/**
 * Returns the ordered Y.Array of factors (Strategy Canvas) / stages
 * (Customer Journey). Each entry is itself a Y.Map so individual fields
 * (e.g. label.{en,zh}) can merge cleanly under future multi-user edits.
 */
export function getXAxisItemsRoot(doc: Y.Doc): Y.Array<Y.Map<unknown>> {
  return doc.getArray<Y.Map<unknown>>(X_AXIS_ITEMS_KEY);
}

function readItem(yMap: Y.Map<unknown>): XAxisItem | null {
  const id = yMap.get('id') as string | undefined;
  const labelEn = (yMap.get('labelEn') as string | undefined) ?? '';
  const labelZh = (yMap.get('labelZh') as string | undefined) ?? '';
  if (!id) return null;
  return { id, label: { en: labelEn, zh: labelZh } };
}

/** Subscribes to the X-axis items array and returns a fresh array per change. */
export function useXAxisItems(doc: Y.Doc | null): XAxisItem[] {
  const [items, setItems] = useState<XAxisItem[]>([]);
  useEffect(() => {
    if (!doc) return;
    const root = getXAxisItemsRoot(doc);

    function snapshot() {
      const arr: XAxisItem[] = [];
      root.forEach((y) => {
        const it = readItem(y);
        if (it) arr.push(it);
      });
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

/** Build a fresh Y.Map representing one x-axis item. */
export function makeXAxisItemYMap(item: XAxisItem): Y.Map<unknown> {
  const m = new Y.Map<unknown>();
  m.set('id', item.id);
  m.set('labelEn', item.label.en);
  m.set('labelZh', item.label.zh);
  return m;
}

interface AddXAxisItemInput {
  /** When omitted a uuid is generated. */
  id?: string;
  label: { en: string; zh: string };
}

export function addXAxisItem(doc: Y.Doc, input: AddXAxisItemInput): string {
  const id = input.id ?? uuid();
  const root = getXAxisItemsRoot(doc);
  doc.transact(() => {
    root.push([makeXAxisItemYMap({ id, label: input.label })]);
  });
  return id;
}

/** Patch one item's label (or both labels). */
export function updateXAxisItem(
  doc: Y.Doc,
  id: string,
  patch: { labelEn?: string; labelZh?: string },
) {
  const root = getXAxisItemsRoot(doc);
  doc.transact(() => {
    root.forEach((entry) => {
      if (entry.get('id') !== id) return;
      if (patch.labelEn !== undefined) entry.set('labelEn', patch.labelEn);
      if (patch.labelZh !== undefined) entry.set('labelZh', patch.labelZh);
    });
  });
}

/** Remove one item by id. Caller is responsible for cleaning up references
 *  in chartLines.points / pins.anchorTo (see `removeXAxisItemAndCleanup`). */
export function removeXAxisItem(doc: Y.Doc, id: string) {
  const root = getXAxisItemsRoot(doc);
  doc.transact(() => {
    let idx = -1;
    root.forEach((entry, i) => {
      if (entry.get('id') === id) idx = i;
    });
    if (idx >= 0) root.delete(idx, 1);
  });
}

/** Move an item from one ordinal position to another (drag-reorder). */
export function moveXAxisItem(doc: Y.Doc, fromIdx: number, toIdx: number) {
  if (fromIdx === toIdx) return;
  const root = getXAxisItemsRoot(doc);
  if (fromIdx < 0 || fromIdx >= root.length) return;
  if (toIdx < 0 || toIdx > root.length) return;
  doc.transact(() => {
    const entry = root.get(fromIdx);
    if (!(entry instanceof Y.Map)) return;
    const cloned = makeXAxisItemYMap(readItem(entry) ?? { id: '', label: { en: '', zh: '' } });
    root.delete(fromIdx, 1);
    // After delete the target index shifts left if we removed before it.
    const insertAt = toIdx > fromIdx ? toIdx - 1 : toIdx;
    root.insert(insertAt, [cloned]);
  });
}

/**
 * Resolve an item's label for the active language. Falls back to the
 * other language if the active one is empty (so freshly-added factors
 * authored in only one language still render).
 */
export function resolveLabel(item: XAxisItem, lang: Lang): string {
  const primary = item.label[lang];
  if (primary && primary.trim().length > 0) return primary;
  const fallback = lang === 'en' ? item.label.zh : item.label.en;
  return fallback ?? '';
}
