import { create } from 'zustand';

/**
 * Active "paint" class — when non-null, clicking the canvas drops a
 * pin of that class instead of running zone-selection. When null,
 * the canvas is in select / navigate mode (the legacy default).
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
  pickClass: (id) => set({ activeClassId: id }),
  toggleClass: (id) =>
    set({ activeClassId: get().activeClassId === id ? null : id }),
  clearActive: () => set({ activeClassId: null }),
}));
