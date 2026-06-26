import { create } from 'zustand';
import { useActiveStickyColor } from './activeStickyColor';

/**
 * Active "paint" class — when non-null, clicking the canvas drops a
 * pin of that class instead of running zone-selection. When null,
 * the canvas is in select / navigate mode (the legacy default).
 *
 * Mutual exclusion: picking a pin class clears any active sticky-color
 * paint mode (and vice-versa in `activeStickyColor.ts`). Two paint
 * modes at once would be ambiguous for the canvas click handler.
 *
 * Reset to null on canvas switch (handled in ProjectWorkspacePage's
 * effect on `activeCanvas?.id`).
 */
interface ActiveClassStore {
  activeClassId: string | null;
  pickClass: (id: string) => void;
  toggleClass: (id: string) => void;
  clearActive: () => void;
}

export const useActiveClass = create<ActiveClassStore>((set, get) => ({
  activeClassId: null,
  pickClass: (id) => {
    useActiveStickyColor.getState().clearActive();
    set({ activeClassId: id });
  },
  toggleClass: (id) => {
    const next = get().activeClassId === id ? null : id;
    if (next !== null) useActiveStickyColor.getState().clearActive();
    set({ activeClassId: next });
  },
  clearActive: () => set({ activeClassId: null }),
}));
