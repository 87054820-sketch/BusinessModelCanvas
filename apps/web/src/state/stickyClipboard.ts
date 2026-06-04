import { create } from 'zustand';

/**
 * One sticky in flight on the in-app clipboard. Captures everything we
 * need to recreate it via `addSticky`:
 *
 *   - `text` / `color` are the user-facing payload that survives a copy.
 *   - `sourceZoneId` lets paste land in a sensible place when the user
 *     navigates to a different canvas before pasting (we look for a zone
 *     with the same id; if absent, the paste handler falls back to the
 *     active canvas's first zone).
 *   - `sourceX` / `sourceY` are SVG-space coords used to offset the
 *     pasted clone "near" the original when pasting in the same zone.
 *
 * The buffer is intentionally NOT routed through the system clipboard:
 * keeping it in-process avoids permission prompts and keeps the round-trip
 * lossless (color, source-zone hint). External paste can be added later
 * by extending this store, not replacing it.
 */
export interface StickyClipboardEntry {
  text: string;
  color: string;
  sourceZoneId: string;
  sourceX: number;
  sourceY: number;
}

interface StickyClipboardStore {
  /** `null` when nothing has been copied this session yet. */
  entry: StickyClipboardEntry | null;
  set: (entry: StickyClipboardEntry) => void;
  clear: () => void;
}

/**
 * Module-level Zustand store. Survives canvas / project navigation
 * within a session, dies on page reload — same lifetime convention as
 * `useSelection`.
 */
export const useStickyClipboard = create<StickyClipboardStore>((set) => ({
  entry: null,
  set: (entry) => set({ entry }),
  clear: () => set({ entry: null }),
}));
