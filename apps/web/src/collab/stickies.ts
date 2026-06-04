import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import type { StickyNote, ZoneHistoryEntry } from '@canvas-collab/shared';
import { DEFAULT_STICKY_COLOR, STICKY_PALETTE } from '../canvas/stickyColors';

const STICKIES_KEY = 'stickies';

/**
 * Returns the Y.Map<string, Y.Map> that stores all stickies on a doc.
 * Each value is a Y.Map of sticky fields, so individual fields can merge
 * cleanly under future multi-user collaboration.
 */
export function getStickiesRoot(doc: Y.Doc): Y.Map<Y.Map<unknown>> {
  return doc.getMap<Y.Map<unknown>>(STICKIES_KEY);
}

/**
 * Reads the per-sticky `zoneHistory` Y.Array if present. Each entry is a
 * Y.Map so individual fields can merge cleanly across concurrent editors.
 * Returns `undefined` when the field is missing — the caller is expected
 * to synthesise a single-entry fallback from `{zoneId, createdAt, authorName}`
 * so older stickies always present a non-empty audit trail to readers.
 */
function readZoneHistory(yMap: Y.Map<unknown>): ZoneHistoryEntry[] | undefined {
  const arr = yMap.get('zoneHistory');
  if (!(arr instanceof Y.Array)) return undefined;
  const out: ZoneHistoryEntry[] = [];
  arr.forEach((entry) => {
    if (!(entry instanceof Y.Map)) return;
    const zoneId = entry.get('zoneId') as string | undefined;
    const at = entry.get('at') as string | undefined;
    const by = (entry.get('by') as string | undefined) ?? '';
    if (zoneId && at) out.push({ zoneId, at, by });
  });
  return out;
}

function readSticky(yMap: Y.Map<unknown>): StickyNote | null {
  const id = yMap.get('id') as string | undefined;
  const zoneId = yMap.get('zoneId') as string | undefined;
  const x = yMap.get('x') as number | undefined;
  const y = yMap.get('y') as number | undefined;
  const text = (yMap.get('text') as string | undefined) ?? '';
  const color = (yMap.get('color') as string | undefined) ?? '#FFE066';
  const authorName = (yMap.get('authorName') as string | undefined) ?? '';
  const createdAt = (yMap.get('createdAt') as string | undefined) ?? '';
  if (!id || !zoneId || x === undefined || y === undefined) return null;
  const zoneHistory = readZoneHistory(yMap);
  return {
    id,
    zoneId,
    x,
    y,
    text,
    color,
    authorName,
    createdAt,
    ...(zoneHistory ? { zoneHistory } : {}),
  };
}

/** Subscribes to the stickies map and returns a fresh array on every change. */
export function useStickies(doc: Y.Doc | null): StickyNote[] {
  const [items, setItems] = useState<StickyNote[]>([]);

  useEffect(() => {
    if (!doc) return;
    const root = getStickiesRoot(doc);

    function snapshot() {
      const arr: StickyNote[] = [];
      root.forEach((y) => {
        const s = readSticky(y);
        if (s) arr.push(s);
      });
      // stable order by createdAt for tidy rendering
      arr.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      setItems(arr);
    }

    snapshot();
    root.observeDeep(snapshot);
    return () => root.unobserveDeep(snapshot);
  }, [doc]);

  return items;
}

interface AddStickyInput {
  zoneId: string;
  x: number;
  y: number;
  authorName: string;
  text?: string;
  color?: string;
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Build a Y.Map representing one zoneHistory entry. */
function makeHistoryEntry(zoneId: string, at: string, by: string): Y.Map<unknown> {
  const m = new Y.Map<unknown>();
  m.set('zoneId', zoneId);
  m.set('at', at);
  m.set('by', by);
  return m;
}

export function addSticky(doc: Y.Doc, input: AddStickyInput): string {
  const id = uuid();
  const root = getStickiesRoot(doc);
  const sticky = new Y.Map<unknown>();
  const now = new Date().toISOString();
  doc.transact(() => {
    sticky.set('id', id);
    sticky.set('zoneId', input.zoneId);
    sticky.set('x', input.x);
    sticky.set('y', input.y);
    sticky.set('text', input.text ?? '');
    sticky.set('color', input.color ?? DEFAULT_STICKY_COLOR);
    sticky.set('authorName', input.authorName);
    sticky.set('createdAt', now);
    // Initial audit entry — index 0 of the sticky's lifetime.
    const history = new Y.Array<Y.Map<unknown>>();
    history.push([makeHistoryEntry(input.zoneId, now, input.authorName)]);
    sticky.set('zoneHistory', history);
    root.set(id, sticky);
  });
  return id;
}

interface UpdateStickyOptions {
  /** Display name credited as the actor when this update changes the zone. */
  by?: string;
}

export function updateSticky(
  doc: Y.Doc,
  id: string,
  patch: Partial<Pick<StickyNote, 'zoneId' | 'x' | 'y' | 'text' | 'color'>>,
  opts: UpdateStickyOptions = {},
) {
  const root = getStickiesRoot(doc);
  const sticky = root.get(id);
  if (!sticky) return;
  doc.transact(() => {
    const prevZone = sticky.get('zoneId') as string | undefined;
    for (const [k, v] of Object.entries(patch)) {
      if (v !== undefined) sticky.set(k, v);
    }
    // Append to zoneHistory only when the patch actually changed the zone.
    if (
      patch.zoneId !== undefined &&
      typeof patch.zoneId === 'string' &&
      patch.zoneId !== prevZone
    ) {
      const existing = sticky.get('zoneHistory');
      let history: Y.Array<Y.Map<unknown>>;
      if (existing instanceof Y.Array) {
        history = existing as Y.Array<Y.Map<unknown>>;
      } else {
        // Backfill: synthesize the initial entry from creation metadata so
        // older stickies persisted before this field existed gain a valid
        // audit trail the moment they're moved.
        history = new Y.Array<Y.Map<unknown>>();
        const createdAt = (sticky.get('createdAt') as string | undefined) ?? new Date().toISOString();
        const author = (sticky.get('authorName') as string | undefined) ?? '';
        if (prevZone) {
          history.push([makeHistoryEntry(prevZone, createdAt, author)]);
        }
        sticky.set('zoneHistory', history);
      }
      const by = opts.by ?? (sticky.get('authorName') as string | undefined) ?? '';
      history.push([
        makeHistoryEntry(patch.zoneId, new Date().toISOString(), by),
      ]);
    }
  });
}

export function deleteSticky(doc: Y.Doc, id: string) {
  const root = getStickiesRoot(doc);
  doc.transact(() => {
    root.delete(id);
  });
}

export { STICKY_PALETTE };
