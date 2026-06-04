import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import type { Pin } from '@canvas-collab/shared';

export const PINS_KEY = 'pins';

export function getPinsRoot(doc: Y.Doc): Y.Map<Y.Map<unknown>> {
  return doc.getMap<Y.Map<unknown>>(PINS_KEY);
}

function readPin(yMap: Y.Map<unknown>): Pin | null {
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

/**
 * Subscribes to the pins map and returns a fresh array per change. The
 * universal PinLayer renders these grouped by classId for auto-connection.
 */
export function usePins(doc: Y.Doc | null): Pin[] {
  const [items, setItems] = useState<Pin[]>([]);
  useEffect(() => {
    if (!doc) return;
    const root = getPinsRoot(doc);

    function snapshot() {
      const arr: Pin[] = [];
      root.forEach((y) => {
        const p = readPin(y);
        if (p) arr.push(p);
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

interface AddPinInput {
  id?: string;
  classId: string;
  x: number;
  y: number;
  label?: string;
  body?: string;
  authorName: string;
}

export function addPin(doc: Y.Doc, input: AddPinInput): string {
  const id = input.id ?? uuid();
  const root = getPinsRoot(doc);
  const pin: Pin = {
    id,
    classId: input.classId,
    x: input.x,
    y: input.y,
    ...(input.label ? { label: input.label } : {}),
    ...(input.body ? { body: input.body } : {}),
    authorName: input.authorName,
    createdAt: new Date().toISOString(),
  };
  doc.transact(() => {
    root.set(id, makePinYMap(pin));
  });
  return id;
}

interface UpdatePinPatch {
  classId?: string;
  x?: number;
  y?: number;
  label?: string | null;
  body?: string | null;
}

export function updatePin(doc: Y.Doc, id: string, patch: UpdatePinPatch) {
  const root = getPinsRoot(doc);
  const pin = root.get(id);
  if (!pin) return;
  doc.transact(() => {
    if (patch.classId !== undefined) pin.set('classId', patch.classId);
    if (patch.x !== undefined) pin.set('x', patch.x);
    if (patch.y !== undefined) pin.set('y', patch.y);
    if (patch.label !== undefined) {
      if (patch.label === null || patch.label === '') pin.delete('label');
      else pin.set('label', patch.label);
    }
    if (patch.body !== undefined) {
      if (patch.body === null || patch.body === '') pin.delete('body');
      else pin.set('body', patch.body);
    }
  });
}

export function removePin(doc: Y.Doc, id: string) {
  const root = getPinsRoot(doc);
  doc.transact(() => {
    root.delete(id);
  });
}

/**
 * Cascade helper: when a class is deleted, drop all of its pins in one
 * transaction. Returns the number of pins cleared.
 */
export function clearPinsForClass(doc: Y.Doc, classId: string): number {
  const root = getPinsRoot(doc);
  let cleared = 0;
  doc.transact(() => {
    const toDelete: string[] = [];
    root.forEach((pin, key) => {
      if (pin.get('classId') === classId) toDelete.push(key);
    });
    toDelete.forEach((k) => {
      root.delete(k);
      cleared++;
    });
  });
  return cleared;
}
