import { create } from 'zustand';

/**
 * In-app clipboard for one Pin in flight. Mirrors `useStickyClipboard`.
 *
 * `sourceX / sourceY` let paste land "near" the original; combined with
 * a small per-paste offset this gives the user the natural "⌘+V to lay
 * down a streak of pins of the same class" workflow.
 */
export interface PinClipboardEntry {
  classId: string;
  label?: string;
  body?: string;
  sourceX: number;
  sourceY: number;
}

interface PinClipboardStore {
  entry: PinClipboardEntry | null;
  set: (entry: PinClipboardEntry) => void;
  clear: () => void;
}

export const usePinClipboard = create<PinClipboardStore>((set) => ({
  entry: null,
  set: (entry) => set({ entry }),
  clear: () => set({ entry: null }),
}));
